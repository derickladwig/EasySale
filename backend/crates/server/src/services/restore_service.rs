use crate::models::backup::{BackupJob, RestoreJob};
use sqlx::SqlitePool;
use std::path::{Path, PathBuf};
use std::fs;
use std::io::Read;
use sha2::{Sha256, Digest};
use zip::ZipArchive;

/// Restore service for backup restoration
pub struct RestoreService {
    pool: SqlitePool,
    backup_directory: PathBuf,
}

impl RestoreService {
    /// Create a new restore service
    pub fn new(pool: SqlitePool, backup_directory: impl AsRef<Path>) -> Self {
        Self {
            pool,
            backup_directory: backup_directory.as_ref().to_path_buf(),
        }
    }

    /// Validate archive checksum with detailed error reporting
    /// 
    /// Extracts the checksum from the backup_job record and compares it
    /// with the actual checksum of the archive file. Returns detailed error
    /// with remediation steps if validation fails.
    pub async fn validate_archive(&self, backup_id: &str) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        // Get backup job record
        let backup = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs WHERE id = ?"
        )
        .bind(backup_id)
        .fetch_one(&self.pool)
        .await?;

        // Check if backup has archive path and checksum
        let archive_relative_path = backup.archive_path
            .ok_or("Backup has no archive path")?;
        let expected_checksum = backup.checksum
            .ok_or("Backup has no checksum")?;

        // Construct full path using backup_directory (prevents path traversal)
        let archive_path = self.backup_directory.join(&archive_relative_path);

        // Check if archive file exists
        if !archive_path.exists() {
            return Err(format!(
                "Archive file not found: {}\n\n\
                Remediation steps:\n\
                1. Check if the backup file was moved or deleted\n\
                2. Verify the backup directory path is correct\n\
                3. Check file system permissions\n\
                4. If using network storage, verify the connection\n\
                5. Restore from a different backup or contact support",
                archive_path.display()
            ).into());
        }

        // Calculate actual checksum
        let actual_checksum = match self.calculate_file_checksum(&archive_path.to_string_lossy().as_ref()).await {
            Ok(checksum) => checksum,
            Err(e) => {
                return Err(format!(
                    "Failed to calculate archive checksum: {}\n\n\
                    Remediation steps:\n\
                    1. Check if the file is readable\n\
                    2. Verify file system is not corrupted\n\
                    3. Check available disk space\n\
                    4. Try copying the file to a different location\n\
                    5. Restore from a different backup",
                    e
                ).into());
            }
        };

        // Compare checksums
        if actual_checksum != expected_checksum {
            return Err(format!(
                "Archive corrupted: Checksum mismatch\n\
                Expected: {}\n\
                Actual:   {}\n\n\
                This indicates the backup file has been corrupted or tampered with.\n\n\
                Remediation steps:\n\
                1. DO NOT use this backup - it may contain corrupted data\n\
                2. Check if you have other backups from around the same time\n\
                3. If this was a remote backup, try downloading it again\n\
                4. Verify the backup storage device is not failing (run disk diagnostics)\n\
                5. Check system logs for disk errors or hardware issues\n\
                6. If corruption is frequent, consider:\n\
                   - Replacing backup storage hardware\n\
                   - Using error-correcting file systems (ZFS, Btrfs)\n\
                   - Implementing backup verification after creation\n\
                7. Contact support if you need help recovering data",
                expected_checksum, actual_checksum
            ).into());
        }

        Ok(())
    }

    /// Calculate SHA-256 checksum of a file
    async fn calculate_file_checksum(&self, path: &str) -> Result<String, Box<dyn std::error::Error>> {
        let mut file = fs::File::open(path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0; 8192];

        loop {
            let bytes_read = file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        Ok(format!("{:x}", hasher.finalize()))
    }

    /// Create pre-restore snapshot
    /// 
    /// Creates a full backup before performing restore operation.
    /// This allows rollback if restore fails.
    pub async fn create_pre_restore_snapshot(
        &self,
        store_id: &str,
        tenant_id: &str,
        created_by: Option<&str>,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Use BackupService to create a full backup
        let backup_service = crate::services::BackupService::new(self.pool.clone());
        let backup_job = backup_service.create_backup(
            "full",
            store_id,
            tenant_id,
            created_by.map(|s| s.to_string()),
        ).await?;
        
        Ok(backup_job.id)
    }

    /// Restore database from backup
    /// 
    /// Extracts database from archive and atomically replaces the active database.
    pub async fn restore_database(
        &self,
        backup_id: &str,
        db_path: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Get backup job record
        let backup = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs WHERE id = ?"
        )
        .bind(backup_id)
        .fetch_one(&self.pool)
        .await?;

        let archive_relative_path = backup.archive_path
            .ok_or("Backup has no archive path")?;

        // Construct full path using backup_directory (prevents path traversal)
        let archive_path = self.backup_directory.join(&archive_relative_path);

        // Open ZIP archive
        let file = fs::File::open(&archive_path)?;
        let mut archive = ZipArchive::new(file)?;

        // Extract database file to temporary location
        let temp_db_path = format!("{}.restore_temp", db_path);
        
        // Find database file in archive (could be in db/ directory)
        let mut db_file = None;
        for i in 0..archive.len() {
            let file = archive.by_index(i)?;
            let name = file.name();
            if name.ends_with(".db") || name.ends_with(".sqlite") || name.ends_with(".sqlite3") {
                db_file = Some(i);
                break;
            }
        }

        let db_file_index = db_file.ok_or("No database file found in archive")?;
        let mut db_file = archive.by_index(db_file_index)?;
        
        // Extract to temporary location
        let mut temp_file = fs::File::create(&temp_db_path)?;
        std::io::copy(&mut db_file, &mut temp_file)?;
        drop(temp_file);
        drop(db_file);
        drop(archive);

        // Validate extracted database can be opened
        let test_pool = SqlitePool::connect(&format!("sqlite:{}", temp_db_path)).await?;
        test_pool.close().await;

        // Atomically replace active database
        // 1. Close current connection pool (caller must handle this)
        // 2. Rename current database to backup
        let backup_db_path = format!("{}.pre_restore", db_path);
        fs::rename(db_path, &backup_db_path)?;
        
        // 3. Rename temp database to active
        fs::rename(&temp_db_path, db_path)?;

        Ok(())
    }

    /// Restore files from backup
    /// 
    /// Extracts files from archive and overwrites existing files.
    pub async fn restore_files(
        &self,
        backup_id: &str,
        target_dir: &str,
        strict_delete: bool,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Get backup job record
        let backup = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs WHERE id = ?"
        )
        .bind(backup_id)
        .fetch_one(&self.pool)
        .await?;

        let archive_relative_path = backup.archive_path
            .ok_or("Backup has no archive path")?;

        // Construct full path using backup_directory (prevents path traversal)
        let archive_path = self.backup_directory.join(&archive_relative_path);

        // Open ZIP archive
        let file = fs::File::open(&archive_path)?;
        let mut archive = ZipArchive::new(file)?;

        // Extract all files from files/ directory
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)?;
            let name = file.name();
            
            // Skip if not in files/ directory
            if !name.starts_with("files/") {
                continue;
            }

            // Get relative path (remove files/ prefix)
            let relative_path = &name[6..];
            if relative_path.is_empty() {
                continue;
            }

            // Create target path
            let target_path = Path::new(target_dir).join(relative_path);

            // Create parent directories
            if let Some(parent) = target_path.parent() {
                fs::create_dir_all(parent)?;
            }

            // Extract file
            let mut target_file = fs::File::create(&target_path)?;
            std::io::copy(&mut file, &mut target_file)?;
        }

        // Handle deleted files if strict mode enabled
        if strict_delete {
            // Get manifest to find deleted files
            let manifest = sqlx::query_as::<_, crate::models::backup::BackupManifest>(
                "SELECT * FROM backup_manifests WHERE backup_id = ? AND is_deleted = TRUE"
            )
            .bind(backup_id)
            .fetch_all(&self.pool)
            .await?;

            for entry in manifest {
                let target_path = Path::new(target_dir).join(&entry.file_path);
                if target_path.exists() {
                    fs::remove_file(target_path)?;
                }
            }
        }

        Ok(())
    }

    /// Get rollback instructions for a failed restore
    /// 
    /// Provides detailed instructions for rolling back a failed restore
    /// using the pre-restore snapshot.
    pub async fn get_rollback_instructions(
        &self,
        restore_id: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Get restore job
        let restore_job = sqlx::query_as::<_, RestoreJob>(
            "SELECT * FROM restore_jobs WHERE id = ?"
        )
        .bind(restore_id)
        .fetch_one(&self.pool)
        .await?;

        if restore_job.status != "failed" {
            return Ok("Restore did not fail, no rollback needed.".to_string());
        }

        let mut instructions = String::new();
        instructions.push_str("=== RESTORE ROLLBACK INSTRUCTIONS ===\n\n");
        instructions.push_str(&format!("Restore Job ID: {}\n", restore_id));
        instructions.push_str(&format!("Failed at: {}\n", restore_job.completed_at.unwrap_or_default()));
        instructions.push_str(&format!("Error: {}\n\n", restore_job.error_message.unwrap_or_default()));

        if let Some(snapshot_id) = restore_job.pre_restore_snapshot_id {
            instructions.push_str("A pre-restore snapshot was created before the restore attempt.\n");
            instructions.push_str(&format!("Snapshot ID: {}\n\n", snapshot_id));
            instructions.push_str("To rollback to the pre-restore state:\n");
            instructions.push_str("1. Stop the application\n");
            instructions.push_str("2. Use the Restore UI to restore from the pre-restore snapshot\n");
            instructions.push_str(&format!("3. Select backup ID: {}\n", snapshot_id));
            instructions.push_str("4. Restart the application\n\n");
            instructions.push_str("Alternatively, if you have direct database access:\n");
            instructions.push_str("1. Stop the application\n");
            instructions.push_str("2. Locate the .pre_restore database file\n");
            instructions.push_str("3. Rename it back to the active database name\n");
            instructions.push_str("4. Restart the application\n");
        } else {
            instructions.push_str("WARNING: No pre-restore snapshot was created.\n");
            instructions.push_str("Manual recovery may be required.\n\n");
            instructions.push_str("Recovery options:\n");
            instructions.push_str("1. Check if a .pre_restore database file exists\n");
            instructions.push_str("2. Restore from the most recent successful backup\n");
            instructions.push_str("3. Contact support if data recovery is critical\n");
        }

        Ok(instructions)
    }

    /// Restore from incremental chain
    /// 
    /// Identifies all backups in a chain up to the target backup,
    /// then applies base backup first followed by each incremental in sequence.
    pub async fn restore_incremental_chain(
        &self,
        backup_id: &str,
        store_id: &str,
        tenant_id: &str,
        db_path: &str,
        files_dir: &str,
        strict_delete: bool,
        created_by: Option<&str>,
    ) -> Result<RestoreJob, Box<dyn std::error::Error>> {
        // Get target backup
        let target_backup = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs WHERE id = ?"
        )
        .bind(backup_id)
        .fetch_one(&self.pool)
        .await?;

        // Check if this is an incremental backup
        if target_backup.backup_type != "db_incremental" {
            // Not an incremental, use regular restore
            return self.restore_backup(
                backup_id,
                store_id,
                tenant_id,
                db_path,
                files_dir,
                true, // create snapshot
                strict_delete,
                created_by,
            ).await;
        }

        // Get chain ID
        let chain_id = target_backup.backup_chain_id
            .ok_or("Incremental backup has no chain ID")?;

        // Get all backups in chain up to target (ordered by incremental_number)
        let chain_backups = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs 
             WHERE backup_chain_id = ? 
             AND incremental_number <= ? 
             AND status = 'completed'
             ORDER BY incremental_number ASC"
        )
        .bind(&chain_id)
        .bind(target_backup.incremental_number)
        .fetch_all(&self.pool)
        .await?;

        if chain_backups.is_empty() {
            return Err("No backups found in chain".into());
        }

        // Find base backup (incremental_number = 0)
        let base_backup = chain_backups.iter()
            .find(|b| b.is_base_backup)
            .ok_or("No base backup found in chain")?;

        // Create restore_job record
        let restore_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO restore_jobs (id, backup_job_id, restore_type, status, started_at, created_at, updated_at, created_by)
             VALUES (?, ?, 'full', 'running', ?, ?, ?, ?)"
        )
        .bind(&restore_id)
        .bind(backup_id)
        .bind(&now)
        .bind(&now)
        .bind(&now)
        .bind(created_by.unwrap_or("system"))
        .execute(&self.pool)
        .await?;

        // Create pre-restore snapshot
        let snapshot_id = self.create_pre_restore_snapshot(store_id, tenant_id, created_by).await?;
        
        sqlx::query(
            "UPDATE restore_jobs SET pre_restore_snapshot_id = ?, updated_at = ? WHERE id = ?"
        )
        .bind(&snapshot_id)
        .bind(&chrono::Utc::now().to_rfc3339())
        .bind(&restore_id)
        .execute(&self.pool)
        .await?;

        // Apply base backup first
        if let Err(e) = self.restore_database(&base_backup.id, db_path).await {
            let error_msg = format!("Base backup restore failed: {}", e);
            sqlx::query(
                "UPDATE restore_jobs SET status = 'failed', error_message = ?, completed_at = ?, updated_at = ?
                 WHERE id = ?"
            )
            .bind(&error_msg)
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&restore_id)
            .execute(&self.pool)
            .await?;

            return Err(error_msg.into());
        }

        // Apply each incremental in sequence
        for backup in chain_backups.iter().skip(1) {
            // Validate incremental backup
            if let Err(e) = self.validate_archive(&backup.id).await {
                let error_msg = format!("Incremental backup {} validation failed: {}", backup.id, e);
                sqlx::query(
                    "UPDATE restore_jobs SET status = 'failed', error_message = ?, completed_at = ?, updated_at = ?
                     WHERE id = ?"
                )
                .bind(&error_msg)
                .bind(&chrono::Utc::now().to_rfc3339())
                .bind(&chrono::Utc::now().to_rfc3339())
                .bind(&restore_id)
                .execute(&self.pool)
                .await?;

                return Err(error_msg.into());
            }

            // Apply incremental changes (files only, database is already restored from base)
            if let Err(e) = self.restore_files(&backup.id, files_dir, strict_delete).await {
                let error_msg = format!("Incremental backup {} restore failed: {}", backup.id, e);
                sqlx::query(
                    "UPDATE restore_jobs SET status = 'failed', error_message = ?, completed_at = ?, updated_at = ?
                     WHERE id = ?"
                )
                .bind(&error_msg)
                .bind(&chrono::Utc::now().to_rfc3339())
                .bind(&chrono::Utc::now().to_rfc3339())
                .bind(&restore_id)
                .execute(&self.pool)
                .await?;

                return Err(error_msg.into());
            }
        }

        // Update restore_job with completion
        let completed_at = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE restore_jobs SET status = 'completed', completed_at = ?, updated_at = ?
             WHERE id = ?"
        )
        .bind(&completed_at)
        .bind(&completed_at)
        .bind(&restore_id)
        .execute(&self.pool)
        .await?;

        // Fetch and return restore_job
        let restore_job = sqlx::query_as::<_, RestoreJob>(
            "SELECT * FROM restore_jobs WHERE id = ?"
        )
        .bind(&restore_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(restore_job)
    }

    /// Restore backup (main entry point)
    /// 
    /// Performs complete restore operation with validation, pre-restore snapshot,
    /// and error handling.
    pub async fn restore_backup(
        &self,
        backup_id: &str,
        store_id: &str,
        tenant_id: &str,
        db_path: &str,
        files_dir: &str,
        create_snapshot: bool,
        strict_delete: bool,
        created_by: Option<&str>,
    ) -> Result<RestoreJob, Box<dyn std::error::Error>> {
        // Create restore_job record
        let restore_id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();

        sqlx::query(
            "INSERT INTO restore_jobs (id, backup_job_id, restore_type, status, started_at, created_at, updated_at, created_by)
             VALUES (?, ?, 'full', 'running', ?, ?, ?, ?)"
        )
        .bind(&restore_id)
        .bind(backup_id)
        .bind(&now)
        .bind(&now)
        .bind(&now)
        .bind(created_by.unwrap_or("system"))
        .execute(&self.pool)
        .await?;

        // Validate archive checksum
        if let Err(e) = self.validate_archive(backup_id).await {
            let error_msg = e.to_string();
            sqlx::query(
                "UPDATE restore_jobs SET status = 'failed', error_message = ?, completed_at = ?, updated_at = ?
                 WHERE id = ?"
            )
            .bind(&error_msg)
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&restore_id)
            .execute(&self.pool)
            .await?;

            return Err(error_msg.into());
        }

        // Create pre-restore snapshot if enabled
        let _snapshot_id = if create_snapshot {
            let id = self.create_pre_restore_snapshot(store_id, tenant_id, created_by).await?;
            
            sqlx::query(
                "UPDATE restore_jobs SET pre_restore_snapshot_id = ?, updated_at = ? WHERE id = ?"
            )
            .bind(&id)
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&restore_id)
            .execute(&self.pool)
            .await?;

            Some(id)
        } else {
            None
        };

        // Restore database
        if let Err(e) = self.restore_database(backup_id, db_path).await {
            let error_msg = format!("Database restore failed: {}", e);
            sqlx::query(
                "UPDATE restore_jobs SET status = 'failed', error_message = ?, completed_at = ?, updated_at = ?
                 WHERE id = ?"
            )
            .bind(&error_msg)
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&restore_id)
            .execute(&self.pool)
            .await?;

            return Err(error_msg.into());
        }

        // Restore files
        if let Err(e) = self.restore_files(backup_id, files_dir, strict_delete).await {
            let error_msg = format!("File restore failed: {}", e);
            sqlx::query(
                "UPDATE restore_jobs SET status = 'failed', error_message = ?, completed_at = ?, updated_at = ?
                 WHERE id = ?"
            )
            .bind(&error_msg)
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&chrono::Utc::now().to_rfc3339())
            .bind(&restore_id)
            .execute(&self.pool)
            .await?;

            return Err(error_msg.into());
        }

        // Update restore_job with completion
        let completed_at = chrono::Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE restore_jobs SET status = 'completed', completed_at = ?, updated_at = ?
             WHERE id = ?"
        )
        .bind(&completed_at)
        .bind(&completed_at)
        .bind(&restore_id)
        .execute(&self.pool)
        .await?;

        // Fetch and return restore_job
        let restore_job = sqlx::query_as::<_, RestoreJob>(
            "SELECT * FROM restore_jobs WHERE id = ?"
        )
        .bind(&restore_id)
        .fetch_one(&self.pool)
        .await?;

        Ok(restore_job)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::create_test_pool;

    #[tokio::test]
    async fn test_restore_service_creation() {
        let pool = create_test_pool().await;
        let service = RestoreService::new(pool, "data/backups");
        assert_eq!(service.backup_directory, PathBuf::from("data/backups"));
    }

    // Additional tests would require creating actual backup archives
    // which is complex for unit tests. Integration tests are more appropriate.
}
