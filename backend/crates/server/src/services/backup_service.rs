use crate::models::backup::{BackupJob, BackupManifest, BackupSettings, BackupDestination, BackupDestObject};
use crate::services::{AlertService, GoogleDriveService};
use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use std::fs;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use std::sync::Arc;
use uuid::Uuid;
use zip::write::FileOptions;
use zip::ZipWriter;

/// Backup service for creating and managing backups
pub struct BackupService {
    pool: SqlitePool,
    alert_service: Option<Arc<AlertService>>,
}

impl BackupService {
    /// Create a new backup service
    pub fn new(pool: SqlitePool) -> Self {
        Self { 
            pool,
            alert_service: None,
        }
    }

    /// Create a new backup service with alert service
    pub fn with_alert_service(pool: SqlitePool, alert_service: Arc<AlertService>) -> Self {
        Self {
            pool,
            alert_service: Some(alert_service),
        }
    }

    /// Create a full backup (database + files)
    pub async fn create_backup(
        &self,
        backup_type: &str,
        store_id: &str,
        tenant_id: &str,
        created_by: Option<String>,
    ) -> Result<BackupJob, Box<dyn std::error::Error>> {
        // Get backup settings
        let settings = self.get_settings().await?;
        
        // Validate disk space before starting backup
        let disk_validation_error = {
            match self.validate_disk_space(backup_type, &settings).await {
                Ok(_) => None,
                Err(e) => Some(e.to_string()),
            }
        };
        
        if let Some(error_str) = disk_validation_error {
            // Send disk space alert
            if let Some(alert_service) = &self.alert_service {
                // Extract GB values from error message
                if let Some(captures) = extract_disk_space_from_error(&error_str) {
                    let _ = alert_service.send_disk_space_warning(captures.0, captures.1).await;
                }
            }
            
            return Err(error_str.into());
        }
        
        // Create backup job record
        let job_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // Determine if this is a base backup or incremental
        let (is_base, chain_id, incremental_num) = if backup_type == "db_incremental" {
            // Check if we need to start a new chain
            let should_start_new_chain = self.should_start_new_chain(&settings).await?;
            
            if should_start_new_chain {
                // Start new chain with base backup
                let chain_id = Uuid::new_v4().to_string();
                (true, Some(chain_id), 0)
            } else {
                // Continue existing chain
                let (chain_id, next_num) = self.get_next_incremental_number().await?;
                (false, Some(chain_id), next_num)
            }
        } else {
            // Full backups and file backups don't use chains
            let is_base = backup_type == "db_full" || backup_type == "full";
            (is_base, None, 0)
        };
        
        let mut job = BackupJob {
            id: job_id.clone(),
            tenant_id: tenant_id.to_string(),
            backup_type: backup_type.to_string(),
            status: "pending".to_string(),
            started_at: None,
            completed_at: None,
            size_bytes: None,
            checksum: None,
            archive_path: None,
            error_message: None,
            snapshot_method: None,
            files_included: 0,
            files_changed: 0,
            files_deleted: 0,
            backup_chain_id: chain_id,
            is_base_backup: is_base,
            incremental_number: incremental_num,
            created_at: now.clone(),
            updated_at: now.clone(),
            store_id: store_id.to_string(),
            created_by,
        };
        
        // Insert pending job
        self.insert_backup_job(&job).await?;
        
        // Update status to running
        job.status = "running".to_string();
        job.started_at = Some(chrono::Utc::now().to_rfc3339());
        self.update_backup_job(&job).await?;
        
        // Execute backup based on type - wrap in error handling to send alerts
        let backup_error = {
            let backup_result = match backup_type {
                "db_full" | "db_incremental" => {
                    self.backup_database(&mut job, &settings).await
                }
                "file" => {
                    self.backup_files(&mut job, &settings).await
                }
                "full" => {
                    self.backup_full(&mut job, &settings).await
                }
                _ => {
                    Err(format!("Invalid backup type: {}", backup_type).into())
                }
            };
            
            match backup_result {
                Ok(_) => None,
                Err(e) => Some(e.to_string()),
            }
        };
        
        if let Some(error_str) = backup_error {
            job.status = "failed".to_string();
            job.error_message = Some(error_str.clone());
            job.completed_at = Some(chrono::Utc::now().to_rfc3339());
            self.update_backup_job(&job).await?;

            // Send failure alert
            if let Some(alert_service) = &self.alert_service {
                let _ = alert_service
                    .send_backup_failure_alert(&job.id, backup_type, &error_str)
                    .await;
            }

            return Err(error_str.into());
        }
        
        // Update status to completed
        job.status = "completed".to_string();
        job.completed_at = Some(chrono::Utc::now().to_rfc3339());
        self.update_backup_job(&job).await?;
        
        // Trigger upload to configured destinations (non-blocking, failures are logged but don't fail the backup)
        if let Err(e) = self.upload_to_destinations(&job).await {
            tracing::warn!("Failed to upload backup {} to destinations: {}", job.id, e);
            // Don't fail the backup if upload fails - the backup is still successful locally
        }
        
        Ok(job)
    }

    /// Create database backup
    async fn backup_database(
        &self,
        job: &mut BackupJob,
        settings: &BackupSettings,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Create backup directory if it doesn't exist
        let backup_dir = Path::new(&settings.backup_directory);
        fs::create_dir_all(backup_dir)?;
        
        // Create snapshot
        let snapshot_path = self.create_database_snapshot(job).await?;
        
        // For incremental backups, detect file changes
        let (files_to_backup, files_changed, files_deleted) = if job.backup_type == "db_incremental" && job.backup_chain_id.is_some() {
            // This is an incremental backup - only backup changed files
            let chain_id = job.backup_chain_id.as_ref().unwrap();
            let current_files = self.scan_files(settings)?;
            let (added, modified, deleted) = self.detect_file_changes(chain_id, &current_files).await?;
            
            // Combine added and modified files
            let mut changed_files = added.clone();
            changed_files.extend(modified.clone());
            
            (changed_files, (added.len() + modified.len()) as i32, deleted.len() as i32)
        } else {
            // This is a full backup - backup all files
            (Vec::new(), 0, 0)
        };
        
        // Create archive
        let archive_path = self.create_archive(
            job,
            &snapshot_path,
            &files_to_backup,
            settings,
        ).await?;
        
        // Calculate checksum
        let checksum = Self::calculate_file_checksum(&archive_path)?;
        
        // Get file size
        let metadata = fs::metadata(&archive_path)?;
        let size_bytes = metadata.len() as i64;
        
        // Update job
        job.archive_path = Some(archive_path.to_string_lossy().to_string());
        job.checksum = Some(checksum);
        job.size_bytes = Some(size_bytes);
        job.files_included = 1; // Just the database
        job.files_changed = files_changed;
        job.files_deleted = files_deleted;
        
        // For incremental backups, save the incremental manifest
        if job.backup_type == "db_incremental" && job.backup_chain_id.is_some() {
            let chain_id = job.backup_chain_id.as_ref().unwrap();
            let current_files = self.scan_files(settings)?;
            let (added, modified, deleted) = self.detect_file_changes(chain_id, &current_files).await?;
            self.create_incremental_manifest(job, &added, &modified, &deleted).await?;
        }
        
        // Clean up snapshot
        fs::remove_file(&snapshot_path)?;
        
        Ok(())
    }

    /// Create file backup
    async fn backup_files(
        &self,
        job: &mut BackupJob,
        settings: &BackupSettings,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Create backup directory if it doesn't exist
        let backup_dir = Path::new(&settings.backup_directory);
        fs::create_dir_all(backup_dir)?;
        
        // Scan files
        let all_files = self.scan_files(settings)?;
        
        // For incremental backups, detect file changes
        let (files_to_backup, files_changed, files_deleted) = if job.backup_chain_id.is_some() {
            // This is an incremental backup - only backup changed files
            let chain_id = job.backup_chain_id.as_ref().unwrap();
            let (added, modified, deleted) = self.detect_file_changes(chain_id, &all_files).await?;
            
            // Combine added and modified files
            let mut changed_files = added.clone();
            changed_files.extend(modified.clone());
            
            (changed_files, (added.len() + modified.len()) as i32, deleted.len() as i32)
        } else {
            // This is a full backup - backup all files
            (all_files.clone(), all_files.len() as i32, 0)
        };
        
        // Create archive
        let archive_path = self.create_archive(
            job,
            &PathBuf::new(), // No database snapshot
            &files_to_backup,
            settings,
        ).await?;
        
        // Calculate checksum
        let checksum = Self::calculate_file_checksum(&archive_path)?;
        
        // Get file size
        let metadata = fs::metadata(&archive_path)?;
        let size_bytes = metadata.len() as i64;
        
        // Update job
        job.archive_path = Some(archive_path.to_string_lossy().to_string());
        job.checksum = Some(checksum);
        job.size_bytes = Some(size_bytes);
        job.files_included = files_to_backup.len() as i32;
        job.files_changed = files_changed;
        job.files_deleted = files_deleted;
        
        // Save manifest
        if job.backup_chain_id.is_some() {
            // For incremental backups, save incremental manifest
            let chain_id = job.backup_chain_id.as_ref().unwrap();
            let (added, modified, deleted) = self.detect_file_changes(chain_id, &all_files).await?;
            self.create_incremental_manifest(job, &added, &modified, &deleted).await?;
        } else {
            // For full backups, save complete manifest
            self.save_manifest(job, &files_to_backup).await?;
        }
        
        Ok(())
    }

    /// Create full backup (database + files)
    async fn backup_full(
        &self,
        job: &mut BackupJob,
        settings: &BackupSettings,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Create backup directory if it doesn't exist
        let backup_dir = Path::new(&settings.backup_directory);
        fs::create_dir_all(backup_dir)?;
        
        // Create snapshot
        let snapshot_path = self.create_database_snapshot(job).await?;
        
        // Scan files
        let files = self.scan_files(settings)?;
        
        // Create archive
        let archive_path = self.create_archive(
            job,
            &snapshot_path,
            &files,
            settings,
        ).await?;
        
        // Calculate checksum
        let checksum = Self::calculate_file_checksum(&archive_path)?;
        
        // Get file size
        let metadata = fs::metadata(&archive_path)?;
        let size_bytes = metadata.len() as i64;
        
        // Update job
        job.archive_path = Some(archive_path.to_string_lossy().to_string());
        job.checksum = Some(checksum);
        job.size_bytes = Some(size_bytes);
        job.files_included = files.len() as i32 + 1; // Files + database
        
        // Save manifest
        self.save_manifest(job, &files).await?;
        
        // Clean up snapshot
        fs::remove_file(&snapshot_path)?;
        
        Ok(())
    }

    /// Create database snapshot using VACUUM INTO
    async fn create_database_snapshot(
        &self,
        job: &mut BackupJob,
    ) -> Result<PathBuf, Box<dyn std::error::Error>> {
        let snapshot_path = PathBuf::from(format!("data/backups/snapshot_{}.db", job.id));
        
        // Try VACUUM INTO first (preferred method)
        let vacuum_result = sqlx::query(&format!(
            "VACUUM INTO '{}'",
            snapshot_path.to_string_lossy()
        ))
        .execute(&self.pool)
        .await;
        
        match vacuum_result {
            Ok(_) => {
                job.snapshot_method = Some("vacuum_into".to_string());
                Ok(snapshot_path)
            }
            Err(e) => {
                // Fallback to WAL checkpoint + copy
                eprintln!("VACUUM INTO failed: {}, falling back to WAL checkpoint", e);
                self.create_snapshot_fallback(job).await
            }
        }
    }

    /// Fallback snapshot method using WAL checkpoint + file copy
    async fn create_snapshot_fallback(
        &self,
        job: &mut BackupJob,
    ) -> Result<PathBuf, Box<dyn std::error::Error>> {
        // Checkpoint WAL
        sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
            .execute(&self.pool)
            .await?;
        
        // Copy database file
        let db_path = PathBuf::from("data/pos.db");
        let snapshot_path = PathBuf::from(format!("data/backups/snapshot_{}.db", job.id));
        
        fs::copy(&db_path, &snapshot_path)?;
        
        job.snapshot_method = Some("wal_checkpoint_copy".to_string());
        Ok(snapshot_path)
    }

    /// Scan files based on include/exclude patterns
    fn scan_files(
        &self,
        settings: &BackupSettings,
    ) -> Result<Vec<PathBuf>, Box<dyn std::error::Error>> {
        let mut files = Vec::new();
        let include_paths = settings.get_include_paths();
        let exclude_patterns = settings.get_exclude_patterns();
        
        for include_path in include_paths {
            let path = Path::new(&include_path);
            if path.exists() {
                self.scan_directory(path, &exclude_patterns, &mut files)?;
            }
        }
        
        Ok(files)
    }

    /// Recursively scan directory
    fn scan_directory(
        &self,
        dir: &Path,
        exclude_patterns: &[String],
        files: &mut Vec<PathBuf>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        if !dir.is_dir() {
            return Ok(());
        }
        
        for entry in fs::read_dir(dir)? {
            let entry = entry?;
            let path = entry.path();
            
            // Check if path matches any exclude pattern
            let path_str = path.to_string_lossy();
            let excluded = exclude_patterns.iter().any(|pattern| {
                path_str.contains(pattern) || path_str.ends_with(pattern)
            });
            
            if excluded {
                continue;
            }
            
            if path.is_file() {
                files.push(path);
            } else if path.is_dir() {
                self.scan_directory(&path, exclude_patterns, files)?;
            }
        }
        
        Ok(())
    }

    /// Create ZIP archive
    async fn create_archive(
        &self,
        job: &BackupJob,
        snapshot_path: &Path,
        files: &[PathBuf],
        settings: &BackupSettings,
    ) -> Result<PathBuf, Box<dyn std::error::Error>> {
        let archive_path = PathBuf::from(format!(
            "{}/backup_{}_{}.zip",
            settings.backup_directory,
            job.backup_type,
            job.id
        ));
        
        let file = fs::File::create(&archive_path)?;
        let mut zip = ZipWriter::new(file);
        
        let options = FileOptions::default()
            .compression_method(if settings.compression_enabled {
                zip::CompressionMethod::Deflated
            } else {
                zip::CompressionMethod::Stored
            });
        
        // Add database snapshot if present
        if snapshot_path.exists() {
            zip.start_file("db/pos.db", options)?;
            let mut db_file = fs::File::open(snapshot_path)?;
            let mut buffer = Vec::new();
            db_file.read_to_end(&mut buffer)?;
            zip.write_all(&buffer)?;
        }
        
        // Add files
        for file_path in files {
            let relative_path = file_path.strip_prefix("data/").unwrap_or(file_path);
            let archive_path_str = format!("files/{}", relative_path.to_string_lossy());
            
            zip.start_file(&archive_path_str, options)?;
            let mut file = fs::File::open(file_path)?;
            let mut buffer = Vec::new();
            file.read_to_end(&mut buffer)?;
            zip.write_all(&buffer)?;
        }
        
        // Add metadata
        let metadata = serde_json::json!({
            "backup_id": job.id,
            "backup_type": job.backup_type,
            "created_at": job.created_at,
            "store_id": job.store_id,
            "snapshot_method": job.snapshot_method,
        });
        
        zip.start_file("meta/backup.json", options)?;
        zip.write_all(serde_json::to_string_pretty(&metadata)?.as_bytes())?;
        
        zip.finish()?;
        
        // Set secure file permissions (0600 - owner read/write only)
        Self::set_archive_permissions(&archive_path)?;
        
        Ok(archive_path)
    }

    /// Set secure file permissions on backup archive
    /// 
    /// Sets permissions to 0600 (owner read/write only) on Unix systems.
    /// On Windows, sets file to be accessible only by the owner.
    #[cfg(unix)]
    fn set_archive_permissions(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        use std::os::unix::fs::PermissionsExt;
        
        let file = fs::File::open(path)?;
        let mut perms = file.metadata()?.permissions();
        perms.set_mode(0o600); // Owner read/write only
        fs::set_permissions(path, perms)?;
        
        tracing::info!("Set archive permissions to 0600: {}", path.display());
        Ok(())
    }

    #[cfg(windows)]
    fn set_archive_permissions(path: &Path) -> Result<(), Box<dyn std::error::Error>> {
        // On Windows, we rely on NTFS permissions which are typically more restrictive by default
        // The file is created with the current user's permissions
        // For additional security, administrators should configure NTFS ACLs appropriately
        tracing::info!("Archive created with default Windows permissions: {}", path.display());
        Ok(())
    }

    /// Calculate SHA-256 checksum of a file
    fn calculate_file_checksum(path: &Path) -> Result<String, Box<dyn std::error::Error>> {
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

    /// Save manifest to database
    async fn save_manifest(
        &self,
        job: &BackupJob,
        files: &[PathBuf],
    ) -> Result<(), Box<dyn std::error::Error>> {
        for file_path in files {
            let metadata = fs::metadata(file_path)?;
            let checksum = Self::calculate_file_checksum(file_path)?;
            let modified_at = metadata.modified()?;
            let modified_at_str = chrono::DateTime::<chrono::Utc>::from(modified_at).to_rfc3339();
            
            let manifest = BackupManifest {
                id: Uuid::new_v4().to_string(),
                tenant_id: job.tenant_id.clone(),
                backup_job_id: job.id.clone(),
                file_path: file_path.to_string_lossy().to_string(),
                file_size: metadata.len() as i64,
                checksum,
                modified_at: modified_at_str,
                is_deleted: false,
                created_at: chrono::Utc::now().to_rfc3339(),
            };
            
            self.insert_manifest(&manifest).await?;
        }
        
        Ok(())
    }

    /// Get available disk space in bytes for a given path
    #[allow(unsafe_code)]
    fn get_available_disk_space(path: &Path) -> Result<u64, Box<dyn std::error::Error>> {
        #[cfg(target_os = "windows")]
        {
            use std::ffi::OsStr;
            use std::os::windows::ffi::OsStrExt;
            use winapi::um::fileapi::GetDiskFreeSpaceExW;
            
            let path_wide: Vec<u16> = OsStr::new(path)
                .encode_wide()
                .chain(std::iter::once(0))
                .collect();
            
            let mut free_bytes_available: u64 = 0;
            let mut total_bytes: u64 = 0;
            let mut total_free_bytes: u64 = 0;
            
            unsafe {
                let result = GetDiskFreeSpaceExW(
                    path_wide.as_ptr(),
                    &mut free_bytes_available as *mut u64 as *mut _,
                    &mut total_bytes as *mut u64 as *mut _,
                    &mut total_free_bytes as *mut u64 as *mut _,
                );
                
                if result == 0 {
                    return Err("Failed to get disk space information".into());
                }
            }
            
            Ok(free_bytes_available)
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            use nix::sys::statvfs::statvfs;
            
            let stat = statvfs(path)?;
            let available_bytes = stat.blocks_available() * stat.block_size();
            Ok(available_bytes)
        }
    }

    /// Estimate backup size based on backup type
    async fn estimate_backup_size(
        &self,
        backup_type: &str,
        settings: &BackupSettings,
    ) -> Result<u64, Box<dyn std::error::Error>> {
        let mut estimated_size: u64 = 0;
        
        // Estimate database size
        if backup_type == "db_full" || backup_type == "db_incremental" || backup_type == "full" {
            // Get database file size
            let db_path = Path::new("data/pos.db");
            if db_path.exists() {
                let metadata = fs::metadata(db_path)?;
                estimated_size += metadata.len();
                
                // Add 20% overhead for compression and metadata
                estimated_size = (estimated_size as f64 * 1.2) as u64;
            }
        }
        
        // Estimate file size
        if backup_type == "file" || backup_type == "full" {
            // Scan files to get total size
            let files = self.scan_files(settings)?;
            for file_path in files {
                if file_path.exists() {
                    let metadata = fs::metadata(&file_path)?;
                    estimated_size += metadata.len();
                }
            }
            
            // Add 10% overhead for compression and metadata
            estimated_size = (estimated_size as f64 * 1.1) as u64;
        }
        
        // For incremental backups, estimate 20% of full size
        if backup_type == "db_incremental" {
            estimated_size = (estimated_size as f64 * 0.2) as u64;
        }
        
        // Minimum estimate of 100MB
        if estimated_size < 100 * 1024 * 1024 {
            estimated_size = 100 * 1024 * 1024;
        }
        
        Ok(estimated_size)
    }

    /// Validate disk space before backup
    async fn validate_disk_space(
        &self,
        backup_type: &str,
        settings: &BackupSettings,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let backup_dir = Path::new(&settings.backup_directory);
        
        // Get available disk space
        let available_space = Self::get_available_disk_space(backup_dir)?;
        
        // Estimate backup size
        let estimated_size = self.estimate_backup_size(backup_type, settings).await?;
        
        // Require 2x estimated size for safety margin
        let required_space = estimated_size * 2;
        
        if available_space < required_space {
            let available_gb = available_space as f64 / (1024.0 * 1024.0 * 1024.0);
            let required_gb = required_space as f64 / (1024.0 * 1024.0 * 1024.0);
            
            return Err(format!(
                "Insufficient disk space. Need {:.2} GB, have {:.2} GB available.",
                required_gb, available_gb
            ).into());
        }
        
        tracing::info!(
            "Disk space validation passed: {:.2} GB available, {:.2} GB required",
            available_space as f64 / (1024.0 * 1024.0 * 1024.0),
            required_space as f64 / (1024.0 * 1024.0 * 1024.0)
        );
        
        Ok(())
    }

    /// Get backup settings
    async fn get_settings(&self) -> Result<BackupSettings, Box<dyn std::error::Error>> {
        let settings = sqlx::query_as::<_, BackupSettings>(
            "SELECT * FROM backup_settings WHERE id = 1"
        )
        .fetch_one(&self.pool)
        .await?;
        
        Ok(settings)
    }

    /// Insert backup job
    async fn insert_backup_job(&self, job: &BackupJob) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, backup_type, status, started_at, completed_at, size_bytes, checksum,
                archive_path, error_message, snapshot_method, files_included, files_changed,
                files_deleted, backup_chain_id, is_base_backup, incremental_number,
                created_at, updated_at, store_id, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&job.id)
        .bind(&job.backup_type)
        .bind(&job.status)
        .bind(&job.started_at)
        .bind(&job.completed_at)
        .bind(job.size_bytes)
        .bind(&job.checksum)
        .bind(&job.archive_path)
        .bind(&job.error_message)
        .bind(&job.snapshot_method)
        .bind(job.files_included)
        .bind(job.files_changed)
        .bind(job.files_deleted)
        .bind(&job.backup_chain_id)
        .bind(job.is_base_backup)
        .bind(job.incremental_number)
        .bind(&job.created_at)
        .bind(&job.updated_at)
        .bind(&job.store_id)
        .bind(&job.created_by)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }

    /// Update backup job
    async fn update_backup_job(&self, job: &BackupJob) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query(
            "UPDATE backup_jobs SET
                status = ?, started_at = ?, completed_at = ?, size_bytes = ?, checksum = ?,
                archive_path = ?, error_message = ?, snapshot_method = ?, files_included = ?,
                files_changed = ?, files_deleted = ?, updated_at = ?
            WHERE id = ?"
        )
        .bind(&job.status)
        .bind(&job.started_at)
        .bind(&job.completed_at)
        .bind(job.size_bytes)
        .bind(&job.checksum)
        .bind(&job.archive_path)
        .bind(&job.error_message)
        .bind(&job.snapshot_method)
        .bind(job.files_included)
        .bind(job.files_changed)
        .bind(job.files_deleted)
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(&job.id)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }

    /// Insert manifest entry
    async fn insert_manifest(&self, manifest: &BackupManifest) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query(
            "INSERT INTO backup_manifests (
                id, backup_job_id, file_path, file_size, checksum, modified_at, is_deleted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&manifest.id)
        .bind(&manifest.backup_job_id)
        .bind(&manifest.file_path)
        .bind(manifest.file_size)
        .bind(&manifest.checksum)
        .bind(&manifest.modified_at)
        .bind(manifest.is_deleted)
        .bind(&manifest.created_at)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    // ========== Chain Management Methods ==========
    
    /// Check if we should start a new backup chain
    /// Returns true if:
    /// - No existing chain exists
    /// - Current chain has reached max incrementals
    async fn should_start_new_chain(
        &self,
        settings: &BackupSettings,
    ) -> Result<bool, Box<dyn std::error::Error>> {
        // Get the most recent incremental backup (by incremental_number, not created_at)
        let result = sqlx::query_as::<_, (Option<String>, i32)>(
            "SELECT backup_chain_id, incremental_number 
             FROM backup_jobs 
             WHERE backup_type = 'db_incremental' 
             AND status = 'completed'
             ORDER BY incremental_number DESC 
             LIMIT 1"
        )
        .fetch_optional(&self.pool)
        .await?;
        
        match result {
            None => {
                // No previous incremental backups, start new chain
                Ok(true)
            }
            Some((chain_id, incremental_num)) => {
                if chain_id.is_none() {
                    // Previous backup has no chain (shouldn't happen), start new chain
                    Ok(true)
                } else if incremental_num >= settings.db_max_incrementals {
                    // Chain has reached max incrementals, start new chain
                    Ok(true)
                } else {
                    // Continue existing chain
                    Ok(false)
                }
            }
        }
    }
    
    /// Get the next incremental number for the current chain
    /// Returns (chain_id, next_incremental_number)
    async fn get_next_incremental_number(
        &self,
    ) -> Result<(String, i32), Box<dyn std::error::Error>> {
        // First get the most recent chain_id
        let chain_result = sqlx::query_as::<_, (String,)>(
            "SELECT backup_chain_id 
             FROM backup_jobs 
             WHERE backup_type = 'db_incremental' 
             AND status = 'completed'
             AND backup_chain_id IS NOT NULL
             ORDER BY created_at DESC 
             LIMIT 1"
        )
        .fetch_one(&self.pool)
        .await?;
        
        let chain_id = chain_result.0;
        
        // Then get the highest incremental number in that chain
        let max_num_result = sqlx::query_as::<_, (i32,)>(
            "SELECT MAX(incremental_number) 
             FROM backup_jobs 
             WHERE backup_chain_id = ? 
             AND status = 'completed'"
        )
        .bind(&chain_id)
        .fetch_one(&self.pool)
        .await?;
        
        let max_num = max_num_result.0;
        Ok((chain_id, max_num + 1))
    }
    
    /// Get all backups in a chain, ordered by incremental number
    pub async fn get_chain_backups(
        &self,
        chain_id: &str,
    ) -> Result<Vec<BackupJob>, Box<dyn std::error::Error>> {
        let backups = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs 
             WHERE backup_chain_id = ? 
             AND status = 'completed'
             ORDER BY incremental_number ASC"
        )
        .bind(chain_id)
        .fetch_all(&self.pool)
        .await?;
        
        Ok(backups)
    }
    
    /// Get the base backup for a chain
    pub async fn get_chain_base_backup(
        &self,
        chain_id: &str,
    ) -> Result<Option<BackupJob>, Box<dyn std::error::Error>> {
        let backup = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs 
             WHERE backup_chain_id = ? 
             AND is_base_backup = 1
             AND status = 'completed'
             LIMIT 1"
        )
        .bind(chain_id)
        .fetch_optional(&self.pool)
        .await?;
        
        Ok(backup)
    }
    
    /// Get chain statistics (total size, incremental count)
    pub async fn get_chain_stats(
        &self,
        chain_id: &str,
    ) -> Result<(i64, i32), Box<dyn std::error::Error>> {
        let result = sqlx::query_as::<_, (i64, i32)>(
            "SELECT 
                COALESCE(SUM(size_bytes), 0) as total_size,
                COUNT(*) as backup_count
             FROM backup_jobs 
             WHERE backup_chain_id = ? 
             AND status = 'completed'"
        )
        .bind(chain_id)
        .fetch_one(&self.pool)
        .await?;
        
        Ok(result)
    }
    
    // ========== Incremental File Detection Methods ==========
    
    /// Get the previous backup's manifest for comparison
    async fn get_previous_manifest(
        &self,
        chain_id: &str,
    ) -> Result<Vec<BackupManifest>, Box<dyn std::error::Error>> {
        // Get the most recent completed backup in the chain
        let previous_backup = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs 
             WHERE backup_chain_id = ? 
             AND status = 'completed'
             ORDER BY incremental_number DESC 
             LIMIT 1"
        )
        .bind(chain_id)
        .fetch_optional(&self.pool)
        .await?;
        
        match previous_backup {
            Some(backup) => {
                // Get all manifest entries for this backup
                let manifests = sqlx::query_as::<_, BackupManifest>(
                    "SELECT * FROM backup_manifests 
                     WHERE backup_job_id = ?"
                )
                .bind(&backup.id)
                .fetch_all(&self.pool)
                .await?;
                
                Ok(manifests)
            }
            None => {
                // No previous backup, return empty manifest
                Ok(Vec::new())
            }
        }
    }
    
    /// Detect file changes since the previous backup
    /// Returns (added_files, modified_files, deleted_files)
    pub async fn detect_file_changes(
        &self,
        chain_id: &str,
        current_files: &[PathBuf],
    ) -> Result<(Vec<PathBuf>, Vec<PathBuf>, Vec<String>), Box<dyn std::error::Error>> {
        // Get previous manifest
        let previous_manifest = self.get_previous_manifest(chain_id).await?;
        
        // Build a map of previous files (path -> (checksum, is_deleted))
        let mut previous_files: std::collections::HashMap<String, (String, bool)> = 
            std::collections::HashMap::new();
        
        for entry in &previous_manifest {
            previous_files.insert(
                entry.file_path.clone(),
                (entry.checksum.clone(), entry.is_deleted)
            );
        }
        
        // Detect added and modified files
        let mut added_files = Vec::new();
        let mut modified_files = Vec::new();
        
        for file_path in current_files {
            let path_str = file_path.to_string_lossy().to_string();
            
            match previous_files.get(&path_str) {
                None => {
                    // File doesn't exist in previous backup - it's new
                    added_files.push(file_path.clone());
                }
                Some((prev_checksum, is_deleted)) => {
                    if *is_deleted {
                        // File was deleted in previous backup but now exists - treat as added
                        added_files.push(file_path.clone());
                    } else {
                        // File exists in both - check if modified
                        let current_checksum = Self::calculate_file_checksum(file_path)?;
                        if current_checksum != *prev_checksum {
                            modified_files.push(file_path.clone());
                        }
                        // If checksums match, file is unchanged (not included in incremental)
                    }
                }
            }
        }
        
        // Detect deleted files
        let mut deleted_files = Vec::new();
        let current_paths: std::collections::HashSet<String> = current_files
            .iter()
            .map(|p| p.to_string_lossy().to_string())
            .collect();
        
        for (prev_path, (_, was_deleted)) in &previous_files {
            if !was_deleted && !current_paths.contains(prev_path) {
                // File existed in previous backup but doesn't exist now
                deleted_files.push(prev_path.clone());
            }
        }
        
        Ok((added_files, modified_files, deleted_files))
    }
    
    /// Create manifest entries for changed files
    async fn create_incremental_manifest(
        &self,
        job: &BackupJob,
        added_files: &[PathBuf],
        modified_files: &[PathBuf],
        deleted_files: &[String],
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Add manifest entries for added files
        for file_path in added_files {
            let metadata = fs::metadata(file_path)?;
            let checksum = Self::calculate_file_checksum(file_path)?;
            let modified_at = metadata.modified()?;
            let modified_at_str = chrono::DateTime::<chrono::Utc>::from(modified_at).to_rfc3339();
            
            let manifest = BackupManifest {
                id: Uuid::new_v4().to_string(),
                tenant_id: job.tenant_id.clone(),
                backup_job_id: job.id.clone(),
                file_path: file_path.to_string_lossy().to_string(),
                file_size: metadata.len() as i64,
                checksum,
                modified_at: modified_at_str,
                is_deleted: false,
                created_at: chrono::Utc::now().to_rfc3339(),
            };
            
            self.insert_manifest(&manifest).await?;
        }
        
        // Add manifest entries for modified files
        for file_path in modified_files {
            let metadata = fs::metadata(file_path)?;
            let checksum = Self::calculate_file_checksum(file_path)?;
            let modified_at = metadata.modified()?;
            let modified_at_str = chrono::DateTime::<chrono::Utc>::from(modified_at).to_rfc3339();
            
            let manifest = BackupManifest {
                id: Uuid::new_v4().to_string(),
                tenant_id: job.tenant_id.clone(),
                backup_job_id: job.id.clone(),
                file_path: file_path.to_string_lossy().to_string(),
                file_size: metadata.len() as i64,
                checksum,
                modified_at: modified_at_str,
                is_deleted: false,
                created_at: chrono::Utc::now().to_rfc3339(),
            };
            
            self.insert_manifest(&manifest).await?;
        }
        
        // Add manifest entries for deleted files
        for file_path in deleted_files {
            let manifest = BackupManifest {
                id: Uuid::new_v4().to_string(),
                tenant_id: job.tenant_id.clone(),
                backup_job_id: job.id.clone(),
                file_path: file_path.clone(),
                file_size: 0,
                checksum: String::new(),
                modified_at: chrono::Utc::now().to_rfc3339(),
                is_deleted: true,
                created_at: chrono::Utc::now().to_rfc3339(),
            };
            
            self.insert_manifest(&manifest).await?;
        }
        
        Ok(())
    }
    
    // ========== Upload to Destinations Methods ==========
    
    /// Upload backup to all enabled destinations with auto-upload enabled for this backup type
    /// 
    /// This method is called after a backup completes successfully. It uploads the backup
    /// to all configured destinations (e.g., Google Drive) that have auto-upload enabled
    /// for the backup type.
    /// 
    /// Failures are logged but do not fail the backup - the backup is still successful locally.
    /// 
    /// Requirements: 4.2, 4.4, 4.5
    async fn upload_to_destinations(
        &self,
        job: &BackupJob,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Get backup settings to check if auto-upload is enabled
        let settings = self.get_settings().await?;
        
        if !settings.auto_upload_enabled {
            tracing::debug!("Auto-upload is disabled, skipping upload for backup {}", job.id);
            return Ok(());
        }
        
        // Get all enabled destinations with auto-upload enabled for this backup type
        let destinations = self.get_auto_upload_destinations(job).await?;
        
        if destinations.is_empty() {
            tracing::debug!("No destinations configured for auto-upload, skipping upload for backup {}", job.id);
            return Ok(());
        }
        
        // Get archive path
        let archive_path = job.archive_path.as_ref()
            .ok_or("Backup job has no archive path")?;
        let archive_path = Path::new(archive_path);
        
        if !archive_path.exists() {
            return Err(format!("Archive file not found: {}", archive_path.display()).into());
        }
        
        // Upload to each destination
        for destination in destinations {
            match self.upload_to_destination(job, &destination, archive_path).await {
                Ok(remote_id) => {
                    tracing::info!(
                        "Successfully uploaded backup {} to destination {} (remote_id: {})",
                        job.id, destination.name, remote_id
                    );
                }
                Err(e) => {
                    tracing::error!(
                        "Failed to upload backup {} to destination {}: {}",
                        job.id, destination.name, e
                    );
                    // Continue with other destinations even if one fails
                }
            }
        }
        
        Ok(())
    }
    
    /// Get destinations that have auto-upload enabled for this backup type
    async fn get_auto_upload_destinations(
        &self,
        job: &BackupJob,
    ) -> Result<Vec<BackupDestination>, Box<dyn std::error::Error>> {
        // Determine which auto_upload field to check based on backup type
        let (auto_upload_field, backup_type_name) = match job.backup_type.as_str() {
            "db_full" | "db_incremental" => ("auto_upload_db", "database"),
            "file" => ("auto_upload_file", "file"),
            "full" => ("auto_upload_full", "full"),
            _ => return Ok(Vec::new()),
        };
        
        // Query destinations with auto-upload enabled for this backup type
        let query = format!(
            "SELECT * FROM backup_destinations 
             WHERE enabled = 1 
             AND {} = 1
             AND tenant_id = ?",
            auto_upload_field
        );
        
        let destinations = sqlx::query_as::<_, BackupDestination>(&query)
            .bind(&job.tenant_id)
            .fetch_all(&self.pool)
            .await?;
        
        tracing::debug!(
            "Found {} destinations with auto-upload enabled for {} backups",
            destinations.len(),
            backup_type_name
        );
        
        Ok(destinations)
    }
    
    /// Upload backup to a specific destination
    /// 
    /// Creates a backup_dest_object record to track the upload.
    /// Returns the remote object ID on success.
    async fn upload_to_destination(
        &self,
        job: &BackupJob,
        destination: &BackupDestination,
        archive_path: &Path,
    ) -> Result<String, Box<dyn std::error::Error>> {
        let dest_object_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // Create pending backup_dest_object record
        let mut dest_object = BackupDestObject {
            id: dest_object_id.clone(),
            tenant_id: job.tenant_id.clone(),
            backup_job_id: job.id.clone(),
            destination_id: destination.id.clone(),
            remote_id: String::new(), // Will be set after upload
            remote_path: None,
            upload_status: "pending".to_string(),
            uploaded_at: None,
            upload_size_bytes: None,
            error_message: None,
            created_at: now.clone(),
            updated_at: now.clone(),
        };
        
        self.insert_backup_dest_object(&dest_object).await?;
        
        // Update status to uploading
        dest_object.upload_status = "uploading".to_string();
        dest_object.updated_at = chrono::Utc::now().to_rfc3339();
        self.update_backup_dest_object(&dest_object).await?;
        
        // Perform upload based on destination type
        let upload_result: Result<String, String> = match destination.destination_type.as_str() {
            "google_drive" => {
                self.upload_to_google_drive(destination, archive_path, &job.id)
                    .await
                    .map_err(|e| e.to_string())
            }
            _ => {
                Err(format!("Unsupported destination type: {}", destination.destination_type))
            }
        };
        
        match upload_result {
            Ok(remote_id) => {
                // Get file size
                let metadata = fs::metadata(archive_path)?;
                let file_size = metadata.len() as i64;
                
                // Update dest_object with success
                dest_object.remote_id = remote_id.clone();
                dest_object.upload_status = "completed".to_string();
                dest_object.uploaded_at = Some(chrono::Utc::now().to_rfc3339());
                dest_object.upload_size_bytes = Some(file_size);
                dest_object.error_message = None;
                dest_object.updated_at = chrono::Utc::now().to_rfc3339();
                self.update_backup_dest_object(&dest_object).await?;
                
                // Update destination last_upload_at
                self.update_destination_last_upload(&destination.id, "completed").await?;
                
                // Enforce retention policy on remote backups
                // Requirements: 4.3, 5.3, 5.6
                if let Err(e) = self.enforce_remote_retention(destination).await {
                    eprintln!("WARNING: Failed to enforce remote retention: {}", e);
                    // Don't fail the upload if retention enforcement fails
                }
                
                Ok(remote_id)
            }
            Err(error_msg) => {
                // Update dest_object with failure
                dest_object.upload_status = "failed".to_string();
                dest_object.error_message = Some(error_msg.clone());
                dest_object.updated_at = chrono::Utc::now().to_rfc3339();
                self.update_backup_dest_object(&dest_object).await?;
                
                // Update destination last_error
                self.update_destination_last_upload(&destination.id, &format!("failed: {}", error_msg)).await?;
                
                Err(error_msg.into())
            }
        }
    }
    
    /// Upload to Google Drive
    async fn upload_to_google_drive(
        &self,
        destination: &BackupDestination,
        archive_path: &Path,
        backup_id: &str,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Create Google Drive service
        let gdrive_service = GoogleDriveService::new(self.pool.clone())
            .map_err(|e| format!("Failed to create Google Drive service: {}", e))?;
        
        // Generate backup file name
        let file_name = archive_path.file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| format!("backup_{}.zip", backup_id));
        
        // Upload to Google Drive
        let remote_id = gdrive_service.upload_backup(destination, archive_path, &file_name)
            .await
            .map_err(|e| format!("Google Drive upload failed: {}", e))?;
        
        Ok(remote_id)
    }
    
    /// Enforce retention policy on remote backups
    /// 
    /// Requirements: 4.3, 5.3, 5.6 (Remote retention enforcement)
    async fn enforce_remote_retention(
        &self,
        destination: &BackupDestination,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Use default retention count of 10 for remote backups
        // TODO: Add retention_count field to backup_destinations table
        let retention_count = 10;
        
        // Create Google Drive service
        let gdrive_service = GoogleDriveService::new(self.pool.clone())
            .map_err(|e| format!("Failed to create Google Drive service: {}", e))?;
        
        // Enforce retention
        let deleted_ids = gdrive_service.enforce_retention(destination, retention_count)
            .await
            .map_err(|e| format!("Failed to enforce retention: {}", e))?;
        
        if !deleted_ids.is_empty() {
            eprintln!(
                "INFO: Enforced retention policy on destination '{}': deleted {} remote backup(s)",
                destination.name,
                deleted_ids.len()
            );
        }
        
        Ok(())
    }
    
    /// Insert backup_dest_object record
    async fn insert_backup_dest_object(
        &self,
        dest_object: &BackupDestObject,
    ) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query(
            "INSERT INTO backup_dest_objects (
                id, backup_job_id, destination_id, remote_id, remote_path,
                upload_status, uploaded_at, upload_size_bytes, error_message,
                created_at, updated_at, tenant_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&dest_object.id)
        .bind(&dest_object.backup_job_id)
        .bind(&dest_object.destination_id)
        .bind(&dest_object.remote_id)
        .bind(&dest_object.remote_path)
        .bind(&dest_object.upload_status)
        .bind(&dest_object.uploaded_at)
        .bind(dest_object.upload_size_bytes)
        .bind(&dest_object.error_message)
        .bind(&dest_object.created_at)
        .bind(&dest_object.updated_at)
        .bind(&dest_object.tenant_id)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    /// Update backup_dest_object record
    async fn update_backup_dest_object(
        &self,
        dest_object: &BackupDestObject,
    ) -> Result<(), Box<dyn std::error::Error>> {
        sqlx::query(
            "UPDATE backup_dest_objects SET
                remote_id = ?, remote_path = ?, upload_status = ?,
                uploaded_at = ?, upload_size_bytes = ?, error_message = ?,
                updated_at = ?
            WHERE id = ?"
        )
        .bind(&dest_object.remote_id)
        .bind(&dest_object.remote_path)
        .bind(&dest_object.upload_status)
        .bind(&dest_object.uploaded_at)
        .bind(dest_object.upload_size_bytes)
        .bind(&dest_object.error_message)
        .bind(&dest_object.updated_at)
        .bind(&dest_object.id)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    /// Update destination last_upload_at and last_upload_status
    async fn update_destination_last_upload(
        &self,
        destination_id: &str,
        status: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let now = chrono::Utc::now().to_rfc3339();
        
        sqlx::query(
            "UPDATE backup_destinations SET
                last_upload_at = ?,
                last_upload_status = ?,
                last_error = CASE WHEN ? LIKE 'failed:%' THEN ? ELSE NULL END,
                updated_at = ?
            WHERE id = ?"
        )
        .bind(&now)
        .bind(status)
        .bind(status)
        .bind(status)
        .bind(&now)
        .bind(destination_id)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
}

/// Helper function to extract disk space values from error message
fn extract_disk_space_from_error(error: &str) -> Option<(f64, f64)> {
    // Parse error message like "Insufficient disk space. Need 10.50 GB, have 5.25 GB available."
    let parts: Vec<&str> = error.split(',').collect();
    if parts.len() < 2 {
        return None;
    }

    let need_part = parts[0];
    let have_part = parts[1];

    // Extract "Need X GB"
    let required_gb = need_part
        .split_whitespace()
        .find_map(|s| s.parse::<f64>().ok())?;

    // Extract "have Y GB"
    let available_gb = have_part
        .split_whitespace()
        .find_map(|s| s.parse::<f64>().ok())?;

    Some((available_gb, required_gb))
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;
    
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();
        
        // Create tables
        sqlx::query(
            "CREATE TABLE backup_jobs (
                id TEXT PRIMARY KEY,
                backup_type TEXT NOT NULL,
                status TEXT NOT NULL,
                started_at TEXT,
                completed_at TEXT,
                size_bytes INTEGER,
                checksum TEXT,
                archive_path TEXT,
                error_message TEXT,
                snapshot_method TEXT,
                files_included INTEGER DEFAULT 0,
                files_changed INTEGER DEFAULT 0,
                files_deleted INTEGER DEFAULT 0,
                backup_chain_id TEXT,
                is_base_backup BOOLEAN DEFAULT 0,
                incremental_number INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                store_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
                created_by TEXT
            )"
        )
        .execute(&pool)
        .await
        .unwrap();
        
        sqlx::query(
            "CREATE TABLE backup_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
                db_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
                db_incremental_schedule TEXT NOT NULL DEFAULT '0 * * * *',
                db_full_schedule TEXT NOT NULL DEFAULT '59 23 * * *',
                db_retention_daily INTEGER NOT NULL DEFAULT 7,
                db_retention_weekly INTEGER NOT NULL DEFAULT 4,
                db_retention_monthly INTEGER NOT NULL DEFAULT 12,
                db_max_incrementals INTEGER NOT NULL DEFAULT 24,
                file_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
                file_schedule TEXT NOT NULL DEFAULT '0 3 * * 0',
                file_retention_count INTEGER NOT NULL DEFAULT 2,
                file_include_paths TEXT NOT NULL DEFAULT 'data/uploads/',
                file_exclude_patterns TEXT NOT NULL DEFAULT '*.tmp,*.log',
                full_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
                full_schedule TEXT NOT NULL DEFAULT '0 2 1 * *',
                full_retention_count INTEGER NOT NULL DEFAULT 12,
                backup_directory TEXT NOT NULL DEFAULT 'data/backups/',
                compression_enabled BOOLEAN NOT NULL DEFAULT 1,
                auto_upload_enabled BOOLEAN NOT NULL DEFAULT 0,
                updated_at TEXT NOT NULL,
                updated_by TEXT
            )"
        )
        .execute(&pool)
        .await
        .unwrap();
        
        // Insert default settings
        sqlx::query("INSERT INTO backup_settings (id, tenant_id, updated_at) VALUES (1, ?, datetime('now'))")
            .bind(crate::test_constants::TEST_TENANT_ID)
            .execute(&pool)
            .await
            .unwrap();
        
        pool
    }
    
    #[tokio::test]
    async fn test_should_start_new_chain_no_previous_backups() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool);
        let settings = service.get_settings().await.unwrap();
        
        let should_start = service.should_start_new_chain(&settings).await.unwrap();
        assert!(should_start, "Should start new chain when no previous backups exist");
    }
    
    #[tokio::test]
    async fn test_should_start_new_chain_max_incrementals_reached() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        // Create a chain with max incrementals
        let chain_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // Insert base backup
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                created_at, updated_at, store_id, tenant_id, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(Uuid::new_v4().to_string())
        .bind("db_incremental")
        .bind("completed")
        .bind(&chain_id)
        .bind(true)
        .bind(0)
        .bind(&now)
        .bind(&now)
        .bind("test-store")
        .bind("caps-automotive")
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // Insert 24 incrementals (max)
        for i in 1..=24 {
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                    created_at, updated_at, store_id, tenant_id, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind("db_incremental")
            .bind("completed")
            .bind(&chain_id)
            .bind(false)
            .bind(i)
            .bind(&now)
            .bind(&now)
            .bind("test-store")
            .bind("caps-automotive")
            .bind(&now)
            .execute(&pool)
            .await
            .unwrap();
        }
        
        let settings = service.get_settings().await.unwrap();
        let should_start = service.should_start_new_chain(&settings).await.unwrap();
        assert!(should_start, "Should start new chain when max incrementals reached");
    }
    
    #[tokio::test]
    async fn test_should_continue_existing_chain() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        // Create a chain with 5 incrementals
        let chain_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // Insert base backup
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                created_at, updated_at, store_id, tenant_id, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(Uuid::new_v4().to_string())
        .bind("db_incremental")
        .bind("completed")
        .bind(&chain_id)
        .bind(true)
        .bind(0)
        .bind(&now)
        .bind(&now)
        .bind("test-store")
        .bind("caps-automotive")
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // Insert 5 incrementals
        for i in 1..=5 {
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                    created_at, updated_at, store_id, tenant_id, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind("db_incremental")
            .bind("completed")
            .bind(&chain_id)
            .bind(false)
            .bind(i)
            .bind(&now)
            .bind(&now)
            .bind("test-store")
            .bind("caps-automotive")
            .bind(&now)
            .execute(&pool)
            .await
            .unwrap();
        }
        
        let settings = service.get_settings().await.unwrap();
        let should_start = service.should_start_new_chain(&settings).await.unwrap();
        assert!(!should_start, "Should continue existing chain when under max incrementals");
    }
    
    #[tokio::test]
    async fn test_get_next_incremental_number() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        let chain_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // Insert base backup (incremental_number = 0)
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                created_at, updated_at, store_id, tenant_id, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(Uuid::new_v4().to_string())
        .bind("db_incremental")
        .bind("completed")
        .bind(&chain_id)
        .bind(true)
        .bind(0)
        .bind(&now)
        .bind(&now)
        .bind("test-store")
        .bind("caps-automotive")
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // Insert 3 incrementals
        for i in 1..=3 {
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                    created_at, updated_at, store_id, tenant_id, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind("db_incremental")
            .bind("completed")
            .bind(&chain_id)
            .bind(false)
            .bind(i)
            .bind(&now)
            .bind(&now)
            .bind("test-store")
            .bind("caps-automotive")
            .bind(&now)
            .execute(&pool)
            .await
            .unwrap();
        }
        
        let (returned_chain_id, next_num) = service.get_next_incremental_number().await.unwrap();
        assert_eq!(returned_chain_id, chain_id);
        assert_eq!(next_num, 4, "Next incremental number should be 4");
    }
    
    #[tokio::test]
    async fn test_get_chain_backups() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        let chain_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // Insert base + 3 incrementals
        for i in 0..=3 {
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                    created_at, updated_at, store_id, tenant_id, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind("db_incremental")
            .bind("completed")
            .bind(&chain_id)
            .bind(i == 0)
            .bind(i)
            .bind(&now)
            .bind(&now)
            .bind("test-store")
            .bind("caps-automotive")
            .bind(&now)
            .execute(&pool)
            .await
            .unwrap();
        }
        
        let backups = service.get_chain_backups(&chain_id).await.unwrap();
        assert_eq!(backups.len(), 4, "Should return 4 backups in chain");
        assert_eq!(backups[0].incremental_number, 0, "First backup should be base (0)");
        assert_eq!(backups[3].incremental_number, 3, "Last backup should be incremental 3");
    }
    
    #[tokio::test]
    async fn test_get_chain_base_backup() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        let chain_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        let base_id = Uuid::new_v4().to_string();
        
        // Insert base backup
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                created_at, updated_at, store_id, tenant_id, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&base_id)
        .bind("db_incremental")
        .bind("completed")
        .bind(&chain_id)
        .bind(true)
        .bind(0)
        .bind(&now)
        .bind(&now)
        .bind("test-store")
        .bind("caps-automotive")
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // Insert incrementals
        for i in 1..=3 {
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                    created_at, updated_at, store_id, tenant_id, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind("db_incremental")
            .bind("completed")
            .bind(&chain_id)
            .bind(false)
            .bind(i)
            .bind(&now)
            .bind(&now)
            .bind("test-store")
            .bind("caps-automotive")
            .bind(&now)
            .execute(&pool)
            .await
            .unwrap();
        }
        
        let base = service.get_chain_base_backup(&chain_id).await.unwrap();
        assert!(base.is_some(), "Should find base backup");
        assert_eq!(base.unwrap().id, base_id, "Should return correct base backup");
    }
    
    #[tokio::test]
    async fn test_get_chain_stats() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        let chain_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // Insert backups with known sizes
        for i in 0..=3 {
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                    size_bytes, created_at, updated_at, store_id, tenant_id, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind("db_incremental")
            .bind("completed")
            .bind(&chain_id)
            .bind(i == 0)
            .bind(i)
            .bind(1000 * (i + 1))  // 1000, 2000, 3000, 4000 bytes
            .bind(&now)
            .bind(&now)
            .bind("test-store")
            .bind("caps-automotive")
            .bind(&now)
            .execute(&pool)
            .await
            .unwrap();
        }
        
        let (total_size, count) = service.get_chain_stats(&chain_id).await.unwrap();
        assert_eq!(count, 4, "Should count 4 backups");
        assert_eq!(total_size, 10000, "Total size should be 10000 bytes (1000+2000+3000+4000)");
    }
    
    #[tokio::test]
    async fn test_get_previous_manifest_no_previous_backup() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool);
        
        // Create manifest table
        sqlx::query(
            "CREATE TABLE backup_manifests (
                id TEXT PRIMARY KEY,
                backup_job_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                checksum TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                is_deleted BOOLEAN DEFAULT 0,
                created_at TEXT NOT NULL,\n                tenant_id TEXT NOT NULL DEFAULT 'test-tenant'\n            )"
        )
        .execute(&service.pool)
        .await
        .unwrap();
        
        let chain_id = Uuid::new_v4().to_string();
        let manifest = service.get_previous_manifest(&chain_id).await.unwrap();
        
        assert_eq!(manifest.len(), 0, "Should return empty manifest when no previous backup");
    }
    
    #[tokio::test]
    async fn test_get_previous_manifest_with_backup() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        // Create manifest table
        sqlx::query(
            "CREATE TABLE backup_manifests (
                id TEXT PRIMARY KEY,
                backup_job_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                checksum TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                is_deleted BOOLEAN DEFAULT 0,
                created_at TEXT NOT NULL,\n                tenant_id TEXT NOT NULL DEFAULT 'test-tenant'\n            )"
        )
        .execute(&pool)
        .await
        .unwrap();
        
        let chain_id = Uuid::new_v4().to_string();
        let backup_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // Insert a backup
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                created_at, updated_at, store_id, tenant_id, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&backup_id)
        .bind("db_incremental")
        .bind("completed")
        .bind(&chain_id)
        .bind(true)
        .bind(0)
        .bind(&now)
        .bind(&now)
        .bind("test-store")
        .bind("caps-automotive")
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // Insert manifest entries
        for i in 0..3 {
            sqlx::query(
                "INSERT INTO backup_manifests (
                    id, backup_job_id, file_path, file_size, checksum, modified_at, is_deleted, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)"
            )
            .bind(Uuid::new_v4().to_string())
            .bind(&backup_id)
            .bind(format!("file{}.txt", i))
            .bind(1000)
            .bind(format!("checksum{}", i))
            .bind(&now)
            .bind(&now)
            .execute(&pool)
            .await
            .unwrap();
        }
        
        let manifest = service.get_previous_manifest(&chain_id).await.unwrap();
        assert_eq!(manifest.len(), 3, "Should return 3 manifest entries");
    }
    
    #[tokio::test]
    async fn test_detect_file_changes_no_previous_backup() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        // Create manifest table
        sqlx::query(
            "CREATE TABLE backup_manifests (
                id TEXT PRIMARY KEY,
                backup_job_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                checksum TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                is_deleted BOOLEAN DEFAULT 0,
                created_at TEXT NOT NULL,\n                tenant_id TEXT NOT NULL DEFAULT 'test-tenant'\n            )"
        )
        .execute(&pool)
        .await
        .unwrap();
        
        let chain_id = Uuid::new_v4().to_string();
        
        // Create temporary test files
        let temp_dir = std::env::temp_dir();
        let test_files = vec![
            temp_dir.join("test1.txt"),
            temp_dir.join("test2.txt"),
        ];
        
        for file in &test_files {
            fs::write(file, "test content").unwrap();
        }
        
        let (added, modified, deleted) = service.detect_file_changes(&chain_id, &test_files).await.unwrap();
        
        // Clean up
        for file in &test_files {
            let _ = fs::remove_file(file);
        }
        
        assert_eq!(added.len(), 2, "All files should be added when no previous backup");
        assert_eq!(modified.len(), 0, "No files should be modified");
        assert_eq!(deleted.len(), 0, "No files should be deleted");
    }
    
    #[tokio::test]
    async fn test_detect_file_changes_with_modifications() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        // Create manifest table
        sqlx::query(
            "CREATE TABLE backup_manifests (
                id TEXT PRIMARY KEY,
                backup_job_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                checksum TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                is_deleted BOOLEAN DEFAULT 0,
                created_at TEXT NOT NULL,\n                tenant_id TEXT NOT NULL DEFAULT 'test-tenant'\n            )"
        )
        .execute(&pool)
        .await
        .unwrap();
        
        let chain_id = Uuid::new_v4().to_string();
        let backup_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // Create temporary test files
        let temp_dir = std::env::temp_dir();
        let file1 = temp_dir.join("test_unchanged.txt");
        let file2 = temp_dir.join("test_modified.txt");
        let file3 = temp_dir.join("test_added.txt");
        
        fs::write(&file1, "unchanged content").unwrap();
        fs::write(&file2, "modified content").unwrap();
        fs::write(&file3, "new content").unwrap();
        
        // Calculate checksums
        let checksum1 = BackupService::calculate_file_checksum(&file1).unwrap();
        let checksum2_old = "old_checksum".to_string();
        
        // Insert a backup
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                created_at, updated_at, store_id, tenant_id, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(&backup_id)
        .bind("db_incremental")
        .bind("completed")
        .bind(&chain_id)
        .bind(true)
        .bind(0)
        .bind(&now)
        .bind(&now)
        .bind("test-store")
        .bind("caps-automotive")
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // Insert manifest entries for file1 (unchanged) and file2 (will be modified)
        sqlx::query(
            "INSERT INTO backup_manifests (
                id, backup_job_id, file_path, file_size, checksum, modified_at, is_deleted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)"
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&backup_id)
        .bind(file1.to_string_lossy().to_string())
        .bind(1000)
        .bind(&checksum1)
        .bind(&now)
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        sqlx::query(
            "INSERT INTO backup_manifests (
                id, backup_job_id, file_path, file_size, checksum, modified_at, is_deleted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)"
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&backup_id)
        .bind(file2.to_string_lossy().to_string())
        .bind(1000)
        .bind(&checksum2_old)
        .bind(&now)
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // Insert manifest entry for deleted file
        sqlx::query(
            "INSERT INTO backup_manifests (
                id, backup_job_id, file_path, file_size, checksum, modified_at, is_deleted, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)"
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&backup_id)
        .bind("deleted_file.txt")
        .bind(1000)
        .bind("deleted_checksum")
        .bind(&now)
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        let current_files = vec![file1.clone(), file2.clone(), file3.clone()];
        let (added, modified, deleted) = service.detect_file_changes(&chain_id, &current_files).await.unwrap();
        
        // Clean up
        let _ = fs::remove_file(&file1);
        let _ = fs::remove_file(&file2);
        let _ = fs::remove_file(&file3);
        
        assert_eq!(added.len(), 1, "Should detect 1 added file");
        assert_eq!(added[0], file3, "Should detect file3 as added");
        
        assert_eq!(modified.len(), 1, "Should detect 1 modified file");
        assert_eq!(modified[0], file2, "Should detect file2 as modified");
        
        assert_eq!(deleted.len(), 1, "Should detect 1 deleted file");
        assert_eq!(deleted[0], "deleted_file.txt", "Should detect deleted_file.txt as deleted");
    }
    
    #[tokio::test]
    async fn test_create_incremental_manifest() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        // Create manifest table
        sqlx::query(
            "CREATE TABLE backup_manifests (
                id TEXT PRIMARY KEY,
                backup_job_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                checksum TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                is_deleted BOOLEAN DEFAULT 0,
                created_at TEXT NOT NULL,\n                tenant_id TEXT NOT NULL DEFAULT 'test-tenant'\n            )"
        )
        .execute(&pool)
        .await
        .unwrap();
        
        let job_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        let job = BackupJob {
            id: job_id.clone(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            backup_type: "db_incremental".to_string(),
            status: "running".to_string(),
            started_at: Some(now.clone()),
            completed_at: None,
            size_bytes: None,
            checksum: None,
            archive_path: None,
            error_message: None,
            snapshot_method: None,
            files_included: 0,
            files_changed: 0,
            files_deleted: 0,
            backup_chain_id: Some(Uuid::new_v4().to_string()),
            is_base_backup: false,
            incremental_number: 1,
            created_at: now.clone(),
            updated_at: now.clone(),
            store_id: "store-1".to_string(),
            created_by: None,
        };
        
        // Create temporary test files
        let temp_dir = std::env::temp_dir();
        let added_file = temp_dir.join("added.txt");
        let modified_file = temp_dir.join("modified.txt");
        
        fs::write(&added_file, "added content").unwrap();
        fs::write(&modified_file, "modified content").unwrap();
        
        let added_files = vec![added_file.clone()];
        let modified_files = vec![modified_file.clone()];
        let deleted_files = vec!["deleted.txt".to_string()];
        
        service.create_incremental_manifest(&job, &added_files, &modified_files, &deleted_files).await.unwrap();
        
        // Verify manifest entries were created
        let manifests = sqlx::query_as::<_, BackupManifest>(
            "SELECT * FROM backup_manifests WHERE backup_job_id = ?"
        )
        .bind(&job_id)
        .fetch_all(&pool)
        .await
        .unwrap();
        
        // Clean up
        let _ = fs::remove_file(&added_file);
        let _ = fs::remove_file(&modified_file);
        
        assert_eq!(manifests.len(), 3, "Should create 3 manifest entries (1 added, 1 modified, 1 deleted)");
        
        // Check added file
        let added_manifest = manifests.iter().find(|m| m.file_path.contains("added.txt")).unwrap();
        assert!(!added_manifest.is_deleted, "Added file should not be marked as deleted");
        assert!(!added_manifest.checksum.is_empty(), "Added file should have checksum");
        
        // Check modified file
        let modified_manifest = manifests.iter().find(|m| m.file_path.contains("modified.txt")).unwrap();
        assert!(!modified_manifest.is_deleted, "Modified file should not be marked as deleted");
        assert!(!modified_manifest.checksum.is_empty(), "Modified file should have checksum");
        
        // Check deleted file
        let deleted_manifest = manifests.iter().find(|m| m.file_path == "deleted.txt").unwrap();
        assert!(deleted_manifest.is_deleted, "Deleted file should be marked as deleted");
        assert_eq!(deleted_manifest.file_size, 0, "Deleted file should have size 0");
    }
    
    #[tokio::test]
    async fn test_chain_rotation_automatic() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());
        
        // Create manifest table
        sqlx::query(
            "CREATE TABLE backup_manifests (
                id TEXT PRIMARY KEY,
                backup_job_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                checksum TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                is_deleted BOOLEAN DEFAULT 0,
                created_at TEXT NOT NULL,\n                tenant_id TEXT NOT NULL DEFAULT 'test-tenant'\n            )"
        )
        .execute(&pool)
        .await
        .unwrap();
        
        let chain_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now().to_rfc3339();
        
        // Insert base backup
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                created_at, updated_at, store_id, tenant_id, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .bind(Uuid::new_v4().to_string())
        .bind("db_incremental")
        .bind("completed")
        .bind(&chain_id)
        .bind(true)
        .bind(0)
        .bind(&now)
        .bind(&now)
        .bind("test-store")
        .bind("caps-automotive")
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // Insert 24 incrementals (max)
        for i in 1..=24 {
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                    created_at, updated_at, store_id, tenant_id, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            .bind(Uuid::new_v4().to_string())
            .bind("db_incremental")
            .bind("completed")
            .bind(&chain_id)
            .bind(false)
            .bind(i)
            .bind(&now)
            .bind(&now)
            .bind("test-store")
            .bind("caps-automotive")
            .bind(&now)
            .execute(&pool)
            .await
            .unwrap();
        }
        
        let settings = service.get_settings().await.unwrap();
        
        // Verify that we should start a new chain
        let should_start = service.should_start_new_chain(&settings).await.unwrap();
        assert!(should_start, "Should start new chain after reaching max incrementals");
        
        // Verify that the chain has 25 backups (1 base + 24 incrementals)
        let (_, count) = service.get_chain_stats(&chain_id).await.unwrap();
        assert_eq!(count, 25, "Chain should have 25 backups before rotation");
    }
}

// Property-based tests module
#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;
    use std::collections::{HashMap, HashSet};
    use sqlx::sqlite::SqlitePoolOptions;
    
    /// Represents a file operation in a backup
    #[derive(Debug, Clone)]
    enum FileOperation {
        Add(String, String),      // (path, content)
        Modify(String, String),   // (path, new_content)
        Delete(String),           // path
    }
    
    /// Generate a random file operation
    fn file_operation_strategy() -> impl Strategy<Value = FileOperation> {
        prop_oneof![
            // Add operation: path and content
            ("[a-z]{3,8}\\.txt", "[a-z0-9]{10,50}")
                .prop_map(|(path, content)| FileOperation::Add(path, content)),
            // Modify operation: path and new content
            ("[a-z]{3,8}\\.txt", "[a-z0-9]{10,50}")
                .prop_map(|(path, content)| FileOperation::Modify(path, content)),
            // Delete operation: path
            "[a-z]{3,8}\\.txt"
                .prop_map(|path| FileOperation::Delete(path)),
        ]
    }
    
    /// Generate a sequence of backup operations (each backup has multiple file operations)
    fn backup_chain_strategy() -> impl Strategy<Value = Vec<Vec<FileOperation>>> {
        // Generate 2-5 backups, each with 1-10 file operations
        prop::collection::vec(
            prop::collection::vec(file_operation_strategy(), 1..10),
            2..5
        )
    }
    
    /// Apply file operations to a file system state
    fn apply_operations(
        state: &mut HashMap<String, String>,
        operations: &[FileOperation]
    ) {
        for op in operations {
            match op {
                FileOperation::Add(path, content) => {
                    state.insert(path.clone(), content.clone());
                }
                FileOperation::Modify(path, content) => {
                    // Only modify if file exists
                    if state.contains_key(path) {
                        state.insert(path.clone(), content.clone());
                    }
                }
                FileOperation::Delete(path) => {
                    state.remove(path);
                }
            }
        }
    }
    
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]
        
        /// **Property 3: Incremental Chain Consistency**
        /// 
        /// For any incremental backup in a chain, applying the base backup followed by all 
        /// incrementals in sequence must produce the same file state as the latest incremental's 
        /// manifest describes.
        /// 
        /// **Validates: Requirements 3.5**
        #[test]
        fn prop_incremental_chain_consistency(backup_operations in backup_chain_strategy()) {
            // Run the async test in a tokio runtime
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                // Setup test database
                let pool = SqlitePoolOptions::new()
                    .connect("sqlite::memory:")
                    .await
                    .unwrap();
                
                // Create tables
                sqlx::query(
                    "CREATE TABLE backup_jobs (
                        id TEXT PRIMARY KEY,
                        backup_type TEXT NOT NULL,
                        status TEXT NOT NULL,
                        started_at TEXT,
                        completed_at TEXT,
                        size_bytes INTEGER,
                        checksum TEXT,
                        archive_path TEXT,
                        error_message TEXT,
                        snapshot_method TEXT,
                        files_included INTEGER DEFAULT 0,
                        files_changed INTEGER DEFAULT 0,
                        files_deleted INTEGER DEFAULT 0,
                        backup_chain_id TEXT,
                        is_base_backup BOOLEAN DEFAULT 0,
                        incremental_number INTEGER DEFAULT 0,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        store_id TEXT NOT NULL,
                        tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
                        created_by TEXT
                    )"
                )
                .execute(&pool)
                .await
                .unwrap();
                
                sqlx::query(
                    "CREATE TABLE backup_manifests (
                        id TEXT PRIMARY KEY,
                        backup_job_id TEXT NOT NULL,
                        file_path TEXT NOT NULL,
                        file_size INTEGER NOT NULL,
                        checksum TEXT NOT NULL,
                        modified_at TEXT NOT NULL,
                        is_deleted BOOLEAN DEFAULT 0,
                        created_at TEXT NOT NULL,
                        tenant_id TEXT NOT NULL DEFAULT 'test-tenant'
                    )"
                )
                .execute(&pool)
                .await
                .unwrap();
                
                let service = BackupService::new(pool.clone());
                let chain_id = Uuid::new_v4().to_string();
                let now = chrono::Utc::now().to_rfc3339();
                
                // Track the expected final state by applying all operations sequentially
                let mut expected_state: HashMap<String, String> = HashMap::new();
                
                // Create backups and manifests for each set of operations
                for (backup_idx, operations) in backup_operations.iter().enumerate() {
                    let backup_id = Uuid::new_v4().to_string();
                    let is_base = backup_idx == 0;
                    
                    // Apply operations to expected state
                    apply_operations(&mut expected_state, operations);
                    
                    // Insert backup job
                    sqlx::query(
                        "INSERT INTO backup_jobs (
                            id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                            created_at, updated_at, store_id, tenant_id, completed_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
                    .bind(&backup_id)
                    .bind("db_incremental")
                    .bind("completed")
                    .bind(&chain_id)
                    .bind(is_base)
                    .bind(backup_idx as i32)
                    .bind(&now)
                    .bind(&now)
                    .bind("test-store")
                    .bind("caps-automotive")
                    .bind(&now)
                    .execute(&pool)
                    .await
                    .unwrap();
                    
                    // Create manifest entries based on current expected state
                    // For the base backup, include all files
                    // For incrementals, include only changed/deleted files
                    if is_base {
                        // Base backup: include all files in expected state
                        for (path, content) in &expected_state {
                            let checksum = format!("{:x}", sha2::Sha256::digest(content.as_bytes()));
                            sqlx::query(
                                "INSERT INTO backup_manifests (
                                    id, backup_job_id, file_path, file_size, checksum, modified_at, is_deleted, created_at
                                ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)"
                            )
                            .bind(Uuid::new_v4().to_string())
                            .bind(&backup_id)
                            .bind(path)
                            .bind(content.len() as i64)
                            .bind(&checksum)
                            .bind(&now)
                            .bind(&now)
                            .execute(&pool)
                            .await
                            .unwrap();
                        }
                    } else {
                        // Incremental backup: include only changes from this backup
                        for op in operations {
                            match op {
                                FileOperation::Add(path, content) | FileOperation::Modify(path, content) => {
                                    // Only add if file exists in expected state (modify might fail if file doesn't exist)
                                    if expected_state.contains_key(path) {
                                        let checksum = format!("{:x}", sha2::Sha256::digest(content.as_bytes()));
                                        sqlx::query(
                                            "INSERT INTO backup_manifests (
                                                id, backup_job_id, file_path, file_size, checksum, modified_at, is_deleted, created_at
                                            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?)"
                                        )
                                        .bind(Uuid::new_v4().to_string())
                                        .bind(&backup_id)
                                        .bind(path)
                                        .bind(content.len() as i64)
                                        .bind(&checksum)
                                        .bind(&now)
                                        .bind(&now)
                                        .execute(&pool)
                                        .await
                                        .unwrap();
                                    }
                                }
                                FileOperation::Delete(path) => {
                                    // Mark file as deleted
                                    sqlx::query(
                                        "INSERT INTO backup_manifests (
                                            id, backup_job_id, file_path, file_size, checksum, modified_at, is_deleted, created_at
                                        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?)"
                                    )
                                    .bind(Uuid::new_v4().to_string())
                                    .bind(&backup_id)
                                    .bind(path)
                                    .bind(0)
                                    .bind("")
                                    .bind(&now)
                                    .bind(&now)
                                    .execute(&pool)
                                    .await
                                    .unwrap();
                                }
                            }
                        }
                    }
                }
                
                // Now reconstruct the state by applying the chain
                let backups = service.get_chain_backups(&chain_id).await.unwrap();
                prop_assert!(!backups.is_empty(), "Chain should have at least one backup");
                
                let mut reconstructed_state: HashMap<String, String> = HashMap::new();
                
                // Apply each backup's manifest in order
                for backup in &backups {
                    let manifests = sqlx::query_as::<_, BackupManifest>(
                        "SELECT * FROM backup_manifests WHERE backup_job_id = ?"
                    )
                    .bind(&backup.id)
                    .fetch_all(&pool)
                    .await
                    .unwrap();
                    
                    for manifest in manifests {
                        if manifest.is_deleted {
                            // Remove deleted files
                            reconstructed_state.remove(&manifest.file_path);
                        } else {
                            // Add or update files (we use checksum as a proxy for content)
                            reconstructed_state.insert(manifest.file_path.clone(), manifest.checksum.clone());
                        }
                    }
                }
                
                // Convert expected state to use checksums for comparison
                let expected_state_checksums: HashMap<String, String> = expected_state
                    .iter()
                    .map(|(path, content)| {
                        let checksum = format!("{:x}", sha2::Sha256::digest(content.as_bytes()));
                        (path.clone(), checksum)
                    })
                    .collect();
                
                // Verify that reconstructed state matches expected state
                prop_assert_eq!(
                    reconstructed_state.len(),
                    expected_state_checksums.len(),
                    "Reconstructed state should have same number of files as expected state"
                );
                
                for (path, expected_checksum) in &expected_state_checksums {
                    prop_assert!(
                        reconstructed_state.contains_key(path),
                        "Reconstructed state should contain file: {}",
                        path
                    );
                    prop_assert_eq!(
                        reconstructed_state.get(path).unwrap(),
                        expected_checksum,
                        "File {} should have matching checksum",
                        path
                    );
                }
                
                // Verify no extra files in reconstructed state
                for path in reconstructed_state.keys() {
                    prop_assert!(
                        expected_state_checksums.contains_key(path),
                        "Reconstructed state should not contain unexpected file: {}",
                        path
                    );
                }
                
                Ok(())
            }).unwrap();
        }
    }
}





