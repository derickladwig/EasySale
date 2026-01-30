use crate::models::backup::{BackupJob, BackupSettings};
use sqlx::SqlitePool;
use std::collections::HashSet;

/// Retention service for managing backup lifecycle
pub struct RetentionService {
    pool: SqlitePool,
}

impl RetentionService {
    /// Create a new retention service
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Enforce retention policies for all backup types
    pub async fn enforce_all_retention_policies(
        &self,
        settings: &BackupSettings,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let mut deleted_ids = Vec::new();

        // Enforce database backup retention (7 daily, 4 weekly, 12 monthly)
        if settings.db_backup_enabled {
            let db_deleted = self.enforce_db_retention(settings).await?;
            deleted_ids.extend(db_deleted);
        }

        // Enforce file backup retention (keep last 2)
        if settings.file_backup_enabled {
            let file_deleted = self.enforce_file_retention(settings).await?;
            deleted_ids.extend(file_deleted);
        }

        // Enforce full backup retention (keep 12 monthly)
        if settings.full_backup_enabled {
            let full_deleted = self.enforce_full_retention(settings).await?;
            deleted_ids.extend(full_deleted);
        }

        Ok(deleted_ids)
    }

    /// Enforce database backup retention (7 daily, 4 weekly, 12 monthly)
    async fn enforce_db_retention(
        &self,
        settings: &BackupSettings,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        // Get all completed database backups ordered by date (newest first)
        let backups = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs 
             WHERE backup_type IN ('db_incremental', 'db_full') 
             AND status = 'completed'
             ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        // Categorize backups by age
        let now = chrono::Utc::now();
        let mut daily_backups = Vec::new();
        let mut weekly_backups = Vec::new();
        let mut monthly_backups = Vec::new();

        for backup in &backups {
            let created_at = chrono::DateTime::parse_from_rfc3339(&backup.created_at)?
                .with_timezone(&chrono::Utc);
            let age_days = (now - created_at).num_days();

            if age_days <= 7 {
                daily_backups.push(backup);
            } else if age_days <= 28 {
                weekly_backups.push(backup);
            } else {
                monthly_backups.push(backup);
            }
        }

        // Determine which backups to keep
        let mut keep_ids = HashSet::new();

        // Keep last N daily backups
        for backup in daily_backups.iter().take(settings.db_retention_daily as usize) {
            keep_ids.insert(backup.id.clone());
            // If this backup is part of a chain, keep the entire chain
            if let Some(chain_id) = &backup.backup_chain_id {
                let chain_backups = self.get_chain_backup_ids(chain_id).await?;
                keep_ids.extend(chain_backups);
            }
        }

        // Keep last N weekly backups
        for backup in weekly_backups.iter().take(settings.db_retention_weekly as usize) {
            keep_ids.insert(backup.id.clone());
            if let Some(chain_id) = &backup.backup_chain_id {
                let chain_backups = self.get_chain_backup_ids(chain_id).await?;
                keep_ids.extend(chain_backups);
            }
        }

        // Keep last N monthly backups
        for backup in monthly_backups.iter().take(settings.db_retention_monthly as usize) {
            keep_ids.insert(backup.id.clone());
            if let Some(chain_id) = &backup.backup_chain_id {
                let chain_backups = self.get_chain_backup_ids(chain_id).await?;
                keep_ids.extend(chain_backups);
            }
        }

        // Delete backups not in keep list
        let mut deleted_ids = Vec::new();
        for backup in &backups {
            if !keep_ids.contains(&backup.id) {
                self.delete_backup(&backup.id).await?;
                deleted_ids.push(backup.id.clone());
            }
        }

        Ok(deleted_ids)
    }

    /// Enforce file backup retention (keep last N)
    async fn enforce_file_retention(
        &self,
        settings: &BackupSettings,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let backups = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs 
             WHERE backup_type = 'file' 
             AND status = 'completed'
             ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        let mut deleted_ids = Vec::new();
        
        // Keep only the last N file backups
        for backup in backups.iter().skip(settings.file_retention_count as usize) {
            self.delete_backup(&backup.id).await?;
            deleted_ids.push(backup.id.clone());
        }

        Ok(deleted_ids)
    }

    /// Enforce full backup retention (keep last N)
    async fn enforce_full_retention(
        &self,
        settings: &BackupSettings,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let backups = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs 
             WHERE backup_type = 'full' 
             AND status = 'completed'
             ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        let mut deleted_ids = Vec::new();
        
        // Keep only the last N full backups
        for backup in backups.iter().skip(settings.full_retention_count as usize) {
            self.delete_backup(&backup.id).await?;
            deleted_ids.push(backup.id.clone());
        }

        Ok(deleted_ids)
    }

    /// Get all backup IDs in a chain
    async fn get_chain_backup_ids(
        &self,
        chain_id: &str,
    ) -> Result<Vec<String>, Box<dyn std::error::Error>> {
        let ids = sqlx::query_as::<_, (String,)>(
            "SELECT id FROM backup_jobs 
             WHERE backup_chain_id = ? 
             AND status = 'completed'"
        )
        .bind(chain_id)
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .map(|(id,)| id)
        .collect();

        Ok(ids)
    }

    /// Delete a backup and its associated files
    async fn delete_backup(
        &self,
        backup_id: &str,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Get backup details
        let backup = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs WHERE id = ?"
        )
        .bind(backup_id)
        .fetch_optional(&self.pool)
        .await?;

        if let Some(backup) = backup {
            // Delete archive file if it exists
            if let Some(archive_path) = &backup.archive_path {
                let path = std::path::Path::new(archive_path);
                if path.exists() {
                    std::fs::remove_file(path)?;
                }
            }

            // Delete manifest entries
            sqlx::query("DELETE FROM backup_manifests WHERE backup_job_id = ?")
                .bind(backup_id)
                .execute(&self.pool)
                .await?;

            // Delete destination objects (remote uploads)
            sqlx::query("DELETE FROM backup_dest_objects WHERE backup_job_id = ?")
                .bind(backup_id)
                .execute(&self.pool)
                .await?;

            // Delete backup job record
            sqlx::query("DELETE FROM backup_jobs WHERE id = ?")
                .bind(backup_id)
                .execute(&self.pool)
                .await?;
        }

        Ok(())
    }

    /// Find deletable backups (for preview/dry-run)
    pub async fn find_deletable_backups(
        &self,
        settings: &BackupSettings,
    ) -> Result<Vec<BackupJob>, Box<dyn std::error::Error>> {
        // This is a dry-run version that returns what would be deleted
        // without actually deleting anything
        
        let backups = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs 
             WHERE status = 'completed'
             ORDER BY created_at DESC"
        )
        .fetch_all(&self.pool)
        .await?;

        let now = chrono::Utc::now();
        let mut keep_ids = HashSet::new();

        // Categorize and mark backups to keep (same logic as enforce_db_retention)
        let mut daily_backups = Vec::new();
        let mut weekly_backups = Vec::new();
        let mut monthly_backups = Vec::new();

        for backup in &backups {
            if backup.backup_type == "db_incremental" || backup.backup_type == "db_full" {
                let created_at = chrono::DateTime::parse_from_rfc3339(&backup.created_at)?
                    .with_timezone(&chrono::Utc);
                let age_days = (now - created_at).num_days();

                if age_days <= 7 {
                    daily_backups.push(backup);
                } else if age_days <= 28 {
                    weekly_backups.push(backup);
                } else {
                    monthly_backups.push(backup);
                }
            }
        }

        // Mark daily backups to keep
        for backup in daily_backups.iter().take(settings.db_retention_daily as usize) {
            keep_ids.insert(backup.id.clone());
            if let Some(chain_id) = &backup.backup_chain_id {
                let chain_backups = self.get_chain_backup_ids(chain_id).await?;
                keep_ids.extend(chain_backups);
            }
        }

        // Mark weekly backups to keep
        for backup in weekly_backups.iter().take(settings.db_retention_weekly as usize) {
            keep_ids.insert(backup.id.clone());
            if let Some(chain_id) = &backup.backup_chain_id {
                let chain_backups = self.get_chain_backup_ids(chain_id).await?;
                keep_ids.extend(chain_backups);
            }
        }

        // Mark monthly backups to keep
        for backup in monthly_backups.iter().take(settings.db_retention_monthly as usize) {
            keep_ids.insert(backup.id.clone());
            if let Some(chain_id) = &backup.backup_chain_id {
                let chain_backups = self.get_chain_backup_ids(chain_id).await?;
                keep_ids.extend(chain_backups);
            }
        }

        // Mark file backups to keep
        let file_backups: Vec<_> = backups.iter()
            .filter(|b| b.backup_type == "file")
            .collect();
        for backup in file_backups.iter().take(settings.file_retention_count as usize) {
            keep_ids.insert(backup.id.clone());
        }

        // Mark full backups to keep
        let full_backups: Vec<_> = backups.iter()
            .filter(|b| b.backup_type == "full")
            .collect();
        for backup in full_backups.iter().take(settings.full_retention_count as usize) {
            keep_ids.insert(backup.id.clone());
        }

        // Return backups that would be deleted
        let deletable: Vec<BackupJob> = backups
            .into_iter()
            .filter(|b| !keep_ids.contains(&b.id))
            .collect();

        Ok(deletable)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;
    use uuid::Uuid;

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
                store_id TEXT NOT NULL,\n                tenant_id TEXT NOT NULL DEFAULT 'test-tenant',\n                created_by TEXT
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
                created_at TEXT NOT NULL,\n                tenant_id TEXT NOT NULL DEFAULT 'test-tenant'\n            )"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "CREATE TABLE backup_dest_objects (
                id TEXT PRIMARY KEY,
                backup_job_id TEXT NOT NULL,
                destination_id TEXT NOT NULL,
                remote_id TEXT NOT NULL,
                remote_path TEXT,
                upload_status TEXT NOT NULL DEFAULT 'pending',
                uploaded_at TEXT,
                upload_size_bytes INTEGER,
                error_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,\n                tenant_id TEXT NOT NULL DEFAULT 'test-tenant'\n            )"
        )
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "CREATE TABLE backup_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                tenant_id VARCHAR(255) NOT NULL DEFAULT 'test-tenant',
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
    async fn test_enforce_file_retention() {
        let pool = setup_test_db().await;
        let service = RetentionService::new(pool.clone());

        // Create 5 file backups
        for i in 0..5 {
            let created_at = chrono::Utc::now() - chrono::Duration::days(i);
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, backup_type, status, created_at, updated_at, store_id, tenant_id, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(format!("backup-{}", i))
            .bind("file")
            .bind("completed")
            .bind(created_at.to_rfc3339())
            .bind(created_at.to_rfc3339())
            .bind("store-1")
            .bind(crate::test_constants::TEST_TENANT_ID)
            .bind(created_at.to_rfc3339())
            .execute(&pool)
            .await
            .unwrap();
        }

        let settings = sqlx::query_as::<_, BackupSettings>(
            "SELECT * FROM backup_settings WHERE id = 1"
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        // Enforce retention (keep last 2)
        let deleted = service.enforce_file_retention(&settings).await.unwrap();

        // Should delete 3 backups (keep last 2)
        assert_eq!(deleted.len(), 3, "Should delete 3 old file backups");

        // Verify only 2 backups remain
        let remaining = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs WHERE backup_type = 'file'"
        )
        .fetch_all(&pool)
        .await
        .unwrap();

        assert_eq!(remaining.len(), 2, "Should have 2 file backups remaining");
    }

    #[tokio::test]
    async fn test_chain_integrity_preserved() {
        let pool = setup_test_db().await;
        let service = RetentionService::new(pool.clone());

        // Create 15 old chains (more than the 12 monthly retention limit)
        for chain_num in 0..15 {
            let chain_id = Uuid::new_v4().to_string();
            let days_old = 100 + chain_num; // Each chain is progressively older
            
            // Create a chain with base + 2 incrementals
            for i in 0..=2 {
                let created_at = chrono::Utc::now() - chrono::Duration::days(days_old);
                sqlx::query(
                    "INSERT INTO backup_jobs (
                        id, backup_type, status, backup_chain_id, is_base_backup, incremental_number,
                        created_at, updated_at, store_id, tenant_id, completed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(format!("chain-{}-backup-{}", chain_num, i))
                .bind("db_incremental")
                .bind("completed")
                .bind(&chain_id)
                .bind(i == 0)
                .bind(i)
                .bind(created_at.to_rfc3339())
                .bind(created_at.to_rfc3339())
                .bind("store-1")
                .bind(crate::test_constants::TEST_TENANT_ID)
                .bind(created_at.to_rfc3339())
                .execute(&pool)
                .await
                .unwrap();
            }
        }

        // Create a recent backup (should be kept)
        let recent_created_at = chrono::Utc::now() - chrono::Duration::days(1);
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, backup_type, status, created_at, updated_at, store_id, tenant_id, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind("recent-backup")
        .bind("db_full")
        .bind("completed")
        .bind(recent_created_at.to_rfc3339())
        .bind(recent_created_at.to_rfc3339())
        .bind("store-1")
        .bind(crate::test_constants::TEST_TENANT_ID)
        .bind(recent_created_at.to_rfc3339())
        .execute(&pool)
        .await
        .unwrap();

        let settings = sqlx::query_as::<_, BackupSettings>(
            "SELECT * FROM backup_settings WHERE id = 1"
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        // Count backups before retention
        let before_count = sqlx::query_as::<_, (i64,)>(
            "SELECT COUNT(*) FROM backup_jobs WHERE backup_type = 'db_incremental'"
        )
        .fetch_one(&pool)
        .await
        .unwrap()
        .0;

        assert_eq!(before_count, 45, "Should have 45 incremental backups (15 chains × 3 backups)");

        // Enforce retention
        let deleted = service.enforce_db_retention(&settings).await.unwrap();

        // Should delete 3 oldest chains (3 chains × 3 backups = 9 backups)
        // Keep 12 monthly + 1 recent = 13 chains, but we have 15, so delete 3 oldest chains
        assert!(deleted.len() >= 9, "Should delete at least 9 backups (3 oldest chains)");

        // Verify recent backup is kept
        let remaining = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs WHERE id = 'recent-backup'"
        )
        .fetch_optional(&pool)
        .await
        .unwrap();

        assert!(remaining.is_some(), "Recent backup should be kept");
        
        // Verify that entire chains were deleted (no orphaned incrementals)
        let chains_with_backups = sqlx::query_as::<_, (String, i64)>(
            "SELECT backup_chain_id, COUNT(*) as count 
             FROM backup_jobs 
             WHERE backup_type = 'db_incremental' 
             GROUP BY backup_chain_id"
        )
        .fetch_all(&pool)
        .await
        .unwrap();

        // All remaining chains should have 3 backups (base + 2 incrementals)
        for (chain_id, count) in chains_with_backups {
            assert_eq!(count, 3, "Chain {} should have 3 backups (entire chain preserved)", chain_id);
        }
    }

    #[tokio::test]
    async fn test_find_deletable_backups() {
        let pool = setup_test_db().await;
        let service = RetentionService::new(pool.clone());

        // Create 10 old file backups
        for i in 0..10 {
            let created_at = chrono::Utc::now() - chrono::Duration::days(i);
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, backup_type, status, created_at, updated_at, store_id, tenant_id, completed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(format!("backup-{}", i))
            .bind("file")
            .bind("completed")
            .bind(created_at.to_rfc3339())
            .bind(created_at.to_rfc3339())
            .bind("store-1")
            .bind(crate::test_constants::TEST_TENANT_ID)
            .bind(created_at.to_rfc3339())
            .execute(&pool)
            .await
            .unwrap();
        }

        let settings = sqlx::query_as::<_, BackupSettings>(
            "SELECT * FROM backup_settings WHERE id = 1"
        )
        .fetch_one(&pool)
        .await
        .unwrap();

        // Find deletable backups (dry run)
        let deletable = service.find_deletable_backups(&settings).await.unwrap();

        // Should find 8 deletable backups (keep last 2)
        assert_eq!(deletable.len(), 8, "Should find 8 deletable file backups");

        // Verify no backups were actually deleted
        let all_backups = sqlx::query_as::<_, BackupJob>(
            "SELECT * FROM backup_jobs"
        )
        .fetch_all(&pool)
        .await
        .unwrap();

        assert_eq!(all_backups.len(), 10, "All backups should still exist (dry run)");
    }

    // ========== Property-Based Tests ==========

    /// **Property 5: Retention Policy Enforcement**
    /// 
    /// For any retention policy with count N, after enforcement completes,
    /// the number of backups (excluding in-progress jobs) must be less than or equal to N.
    /// 
    /// **Validates: Requirements 5.1, 5.2**
    #[tokio::test]
    async fn test_property_retention_policy_enforcement() {
        // Run property test with 100 iterations
        for iteration in 0..100 {
            // Generate random retention counts (1-20 for each category)
            let db_retention_daily = (iteration % 19) + 1;
            let db_retention_weekly = ((iteration * 3) % 19) + 1;
            let db_retention_monthly = ((iteration * 7) % 19) + 1;
            let file_retention_count = ((iteration * 11) % 19) + 1;
            let full_retention_count = ((iteration * 13) % 19) + 1;
            
            // Generate random number of backups to create (10-50)
            let num_db_backups = ((iteration * 17) % 40) + 10;
            let num_file_backups = ((iteration * 19) % 40) + 10;
            let num_full_backups = ((iteration * 23) % 40) + 10;

            let pool = setup_test_db().await;
            let service = RetentionService::new(pool.clone());

            // Create custom settings with random retention counts
            sqlx::query(
                "UPDATE backup_settings SET 
                 db_retention_daily = ?,
                 db_retention_weekly = ?,
                 db_retention_monthly = ?,
                 file_retention_count = ?,
                 full_retention_count = ?
                 WHERE id = 1"
            )
            .bind(db_retention_daily)
            .bind(db_retention_weekly)
            .bind(db_retention_monthly)
            .bind(file_retention_count)
            .bind(full_retention_count)
            .execute(&pool)
            .await
            .unwrap();

            let settings = sqlx::query_as::<_, BackupSettings>(
                "SELECT * FROM backup_settings WHERE id = 1"
            )
            .fetch_one(&pool)
            .await
            .unwrap();

            // Create random database backups with varying ages
            for i in 0..num_db_backups {
                let days_old = (i * 5) as i64; // Spread backups across time
                let created_at = chrono::Utc::now() - chrono::Duration::days(days_old);
                
                sqlx::query(
                    "INSERT INTO backup_jobs (
                        id, backup_type, status, created_at, updated_at, store_id, tenant_id, completed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(format!("db-backup-{}-{}", iteration, i))
                .bind(if i % 2 == 0 { "db_full" } else { "db_incremental" })
                .bind("completed")
                .bind(created_at.to_rfc3339())
                .bind(created_at.to_rfc3339())
                .bind("store-1")
                .bind(crate::test_constants::TEST_TENANT_ID)
                .bind(created_at.to_rfc3339())
                .execute(&pool)
                .await
                .unwrap();
            }

            // Create random file backups
            for i in 0..num_file_backups {
                let days_old = (i * 3) as i64;
                let created_at = chrono::Utc::now() - chrono::Duration::days(days_old);
                
                sqlx::query(
                    "INSERT INTO backup_jobs (
                        id, backup_type, status, created_at, updated_at, store_id, tenant_id, completed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(format!("file-backup-{}-{}", iteration, i))
                .bind("file")
                .bind("completed")
                .bind(created_at.to_rfc3339())
                .bind(created_at.to_rfc3339())
                .bind("store-1")
                .bind(crate::test_constants::TEST_TENANT_ID)
                .bind(created_at.to_rfc3339())
                .execute(&pool)
                .await
                .unwrap();
            }

            // Create random full backups
            for i in 0..num_full_backups {
                let days_old = (i * 7) as i64;
                let created_at = chrono::Utc::now() - chrono::Duration::days(days_old);
                
                sqlx::query(
                    "INSERT INTO backup_jobs (
                        id, backup_type, status, created_at, updated_at, store_id, tenant_id, completed_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(format!("full-backup-{}-{}", iteration, i))
                .bind("full")
                .bind("completed")
                .bind(created_at.to_rfc3339())
                .bind(created_at.to_rfc3339())
                .bind("store-1")
                .bind(crate::test_constants::TEST_TENANT_ID)
                .bind(created_at.to_rfc3339())
                .execute(&pool)
                .await
                .unwrap();
            }

            // Enforce retention policies
            let _ = service.enforce_all_retention_policies(&settings).await.unwrap();

            // Verify: Count remaining backups (excluding in-progress)
            let remaining_file_backups = sqlx::query_as::<_, (i64,)>(
                "SELECT COUNT(*) FROM backup_jobs 
                 WHERE backup_type = 'file' 
                 AND status = 'completed'"
            )
            .fetch_one(&pool)
            .await
            .unwrap()
            .0;

            let remaining_full_backups = sqlx::query_as::<_, (i64,)>(
                "SELECT COUNT(*) FROM backup_jobs 
                 WHERE backup_type = 'full' 
                 AND status = 'completed'"
            )
            .fetch_one(&pool)
            .await
            .unwrap()
            .0;

            let remaining_db_backups = sqlx::query_as::<_, (i64,)>(
                "SELECT COUNT(*) FROM backup_jobs 
                 WHERE backup_type IN ('db_full', 'db_incremental') 
                 AND status = 'completed'"
            )
            .fetch_one(&pool)
            .await
            .unwrap()
            .0;

            // Property: File backups must be <= file_retention_count
            assert!(
                remaining_file_backups <= file_retention_count as i64,
                "Iteration {}: File backups ({}) must be <= retention count ({})",
                iteration,
                remaining_file_backups,
                file_retention_count
            );

            // Property: Full backups must be <= full_retention_count
            assert!(
                remaining_full_backups <= full_retention_count as i64,
                "Iteration {}: Full backups ({}) must be <= retention count ({})",
                iteration,
                remaining_full_backups,
                full_retention_count
            );

            // Property: DB backups must be <= sum of all retention counts
            // (daily + weekly + monthly, since backups can fall into any category)
            let max_db_backups = (db_retention_daily + db_retention_weekly + db_retention_monthly) as i64;
            assert!(
                remaining_db_backups <= max_db_backups,
                "Iteration {}: DB backups ({}) must be <= max retention ({})",
                iteration,
                remaining_db_backups,
                max_db_backups
            );
        }
    }
}



