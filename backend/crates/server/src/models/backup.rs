use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// Backup mode enum for different backup types
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum BackupMode {
    DbIncremental,
    DbFull,
    File,
    Full,
}

impl BackupMode {
    /// Convert to string representation for database storage
    pub fn as_str(self) -> &'static str {
        match self {
            BackupMode::DbIncremental => "db_incremental",
            BackupMode::DbFull => "db_full",
            BackupMode::File => "file",
            BackupMode::Full => "full",
        }
    }
    
    /// Parse from string representation
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "db_incremental" => Some(BackupMode::DbIncremental),
            "db_full" => Some(BackupMode::DbFull),
            "file" => Some(BackupMode::File),
            "full" => Some(BackupMode::Full),
            _ => None,
        }
    }
}

impl std::fmt::Display for BackupMode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BackupMode::DbIncremental => write!(f, "db_incremental"),
            BackupMode::DbFull => write!(f, "db_full"),
            BackupMode::File => write!(f, "file"),
            BackupMode::Full => write!(f, "full"),
        }
    }
}

/// Backup job record tracking a single backup execution
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BackupJob {
    pub id: String,
    pub tenant_id: String,
    pub backup_type: String,  // 'db_incremental', 'db_full', 'file', 'full'
    pub status: String,  // 'pending', 'running', 'completed', 'failed'
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub size_bytes: Option<i64>,
    pub checksum: Option<String>,
    pub archive_path: Option<String>,
    pub error_message: Option<String>,
    pub snapshot_method: Option<String>,  // 'vacuum_into', 'wal_checkpoint_copy'
    pub files_included: i32,
    pub files_changed: i32,
    pub files_deleted: i32,
    pub backup_chain_id: Option<String>,
    pub is_base_backup: bool,
    pub incremental_number: i32,
    pub created_at: String,
    pub updated_at: String,
    pub store_id: String,
    pub created_by: Option<String>,
}

impl BackupJob {
    /// Validate backup job fields
    pub fn validate(&self) -> Result<(), String> {
        // Validate backup type
        match self.backup_type.as_str() {
            "db_incremental" | "db_full" | "file" | "full" => {},
            _ => return Err(format!("Invalid backup_type: {}", self.backup_type)),
        }
        
        // Validate status
        match self.status.as_str() {
            "pending" | "running" | "completed" | "failed" => {},
            _ => return Err(format!("Invalid status: {}", self.status)),
        }
        
        // Validate store_id is not empty
        if self.store_id.is_empty() {
            return Err("store_id cannot be empty".to_string());
        }
        
        // If completed, must have completed_at
        if self.status == "completed" && self.completed_at.is_none() {
            return Err("completed_at required for completed backups".to_string());
        }
        
        // If completed successfully, must have checksum and archive_path
        if self.status == "completed" {
            if self.checksum.is_none() {
                return Err("checksum required for completed backups".to_string());
            }
            if self.archive_path.is_none() {
                return Err("archive_path required for completed backups".to_string());
            }
        }
        
        Ok(())
    }
}

/// Backup settings configuration (singleton table)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BackupSettings {
    pub id: i32,  // Always 1 (singleton)
    pub tenant_id: String,
    
    // Database backup settings
    pub db_backup_enabled: bool,
    pub db_incremental_schedule: String,  // Cron expression
    pub db_full_schedule: String,  // Cron expression
    pub db_retention_daily: i32,
    pub db_retention_weekly: i32,
    pub db_retention_monthly: i32,
    pub db_max_incrementals: i32,
    
    // File backup settings
    pub file_backup_enabled: bool,
    pub file_schedule: String,  // Cron expression
    pub file_retention_count: i32,
    pub file_include_paths: String,  // Comma-separated
    pub file_exclude_patterns: String,  // Comma-separated
    
    // Full backup settings
    pub full_backup_enabled: bool,
    pub full_schedule: String,  // Cron expression
    pub full_retention_count: i32,
    
    // General settings
    pub backup_directory: String,
    pub compression_enabled: bool,
    pub auto_upload_enabled: bool,
    
    pub updated_at: String,
    pub updated_by: Option<String>,
}

impl BackupSettings {
    /// Validate backup settings
    pub fn validate(&self) -> Result<(), String> {
        // Validate retention counts are positive
        if self.db_retention_daily < 1 {
            return Err("db_retention_daily must be at least 1".to_string());
        }
        if self.db_retention_weekly < 1 {
            return Err("db_retention_weekly must be at least 1".to_string());
        }
        if self.db_retention_monthly < 1 {
            return Err("db_retention_monthly must be at least 1".to_string());
        }
        if self.file_retention_count < 1 {
            return Err("file_retention_count must be at least 1".to_string());
        }
        if self.full_retention_count < 1 {
            return Err("full_retention_count must be at least 1".to_string());
        }
        if self.db_max_incrementals < 1 {
            return Err("db_max_incrementals must be at least 1".to_string());
        }
        
        // Validate backup directory is not empty
        if self.backup_directory.is_empty() {
            return Err("backup_directory cannot be empty".to_string());
        }
        
        // Validate cron expressions are not empty
        if self.db_incremental_schedule.is_empty() {
            return Err("db_incremental_schedule cannot be empty".to_string());
        }
        if self.db_full_schedule.is_empty() {
            return Err("db_full_schedule cannot be empty".to_string());
        }
        if self.file_schedule.is_empty() {
            return Err("file_schedule cannot be empty".to_string());
        }
        if self.full_schedule.is_empty() {
            return Err("full_schedule cannot be empty".to_string());
        }
        
        Ok(())
    }
    
    /// Parse include paths into a vector
    pub fn get_include_paths(&self) -> Vec<String> {
        self.file_include_paths
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    }
    
    /// Parse exclude patterns into a vector
    pub fn get_exclude_patterns(&self) -> Vec<String> {
        self.file_exclude_patterns
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect()
    }
}

/// Backup manifest entry for a single file
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BackupManifest {
    pub id: String,
    pub tenant_id: String,
    pub backup_job_id: String,
    pub file_path: String,
    pub file_size: i64,
    pub checksum: String,  // SHA-256
    pub modified_at: String,
    pub is_deleted: bool,
    pub created_at: String,
}

impl BackupManifest {
    /// Validate manifest entry
    pub fn validate(&self) -> Result<(), String> {
        if self.backup_job_id.is_empty() {
            return Err("backup_job_id cannot be empty".to_string());
        }
        if self.file_path.is_empty() {
            return Err("file_path cannot be empty".to_string());
        }
        if self.file_size < 0 {
            return Err("file_size cannot be negative".to_string());
        }
        if !self.is_deleted && self.checksum.is_empty() {
            return Err("checksum required for non-deleted files".to_string());
        }
        Ok(())
    }
}

/// Backup destination (Google Drive, local, etc.)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BackupDestination {
    pub id: String,
    pub tenant_id: String,
    pub destination_type: String,  // 'google_drive', 'local', 's3'
    pub name: String,
    pub enabled: bool,
    
    // Google Drive OAuth
    pub refresh_token_encrypted: Option<String>,
    pub folder_id: Option<String>,
    pub folder_path: Option<String>,
    
    // Upload settings
    pub auto_upload_db: bool,
    pub auto_upload_file: bool,
    pub auto_upload_full: bool,
    
    // Status
    pub last_upload_at: Option<String>,
    pub last_upload_status: Option<String>,
    pub last_error: Option<String>,
    
    pub created_at: String,
    pub updated_at: String,
    pub created_by: Option<String>,
}

impl BackupDestination {
    /// Validate destination
    pub fn validate(&self) -> Result<(), String> {
        // Validate destination type
        match self.destination_type.as_str() {
            "google_drive" | "local" | "s3" => {},
            _ => return Err(format!("Invalid destination_type: {}", self.destination_type)),
        }
        
        // Validate name is not empty
        if self.name.is_empty() {
            return Err("name cannot be empty".to_string());
        }
        
        // For Google Drive, require OAuth token
        if self.destination_type == "google_drive" && self.enabled {
            if self.refresh_token_encrypted.is_none() {
                return Err("refresh_token_encrypted required for Google Drive".to_string());
            }
        }
        
        Ok(())
    }
}

/// Backup destination object (maps local backup to remote file)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct BackupDestObject {
    pub id: String,
    pub tenant_id: String,
    pub backup_job_id: String,
    pub destination_id: String,
    pub remote_id: String,  // Google Drive file ID
    pub remote_path: Option<String>,
    pub upload_status: String,  // 'pending', 'uploading', 'completed', 'failed'
    pub uploaded_at: Option<String>,
    pub upload_size_bytes: Option<i64>,
    pub error_message: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

impl BackupDestObject {
    /// Validate destination object
    pub fn validate(&self) -> Result<(), String> {
        if self.backup_job_id.is_empty() {
            return Err("backup_job_id cannot be empty".to_string());
        }
        if self.destination_id.is_empty() {
            return Err("destination_id cannot be empty".to_string());
        }
        if self.remote_id.is_empty() {
            return Err("remote_id cannot be empty".to_string());
        }
        
        // Validate upload status
        match self.upload_status.as_str() {
            "pending" | "uploading" | "completed" | "failed" => {},
            _ => return Err(format!("Invalid upload_status: {}", self.upload_status)),
        }
        
        Ok(())
    }
}

/// Restore job record
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct RestoreJob {
    pub id: String,
    pub tenant_id: String,
    pub backup_job_id: String,
    pub restore_type: String,  // 'full', 'database_only', 'files_only'
    pub status: String,  // 'pending', 'running', 'completed', 'failed'
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub files_restored: i32,
    pub error_message: Option<String>,
    pub restore_point: Option<String>,
    pub pre_restore_snapshot_id: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: String,
}

/// Download token for secure time-limited archive downloads
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct DownloadToken {
    pub token: String,
    pub backup_job_id: String,
    pub created_by: String,
    pub expires_at: String,
    pub used: bool,
    pub used_at: Option<String>,
    pub created_at: String,
}

impl RestoreJob {
    /// Validate restore job
    pub fn validate(&self) -> Result<(), String> {
        // Validate restore type
        match self.restore_type.as_str() {
            "full" | "database_only" | "files_only" => {},
            _ => return Err(format!("Invalid restore_type: {}", self.restore_type)),
        }
        
        // Validate status
        match self.status.as_str() {
            "pending" | "running" | "completed" | "failed" => {},
            _ => return Err(format!("Invalid status: {}", self.status)),
        }
        
        // Validate created_by is not empty
        if self.created_by.is_empty() {
            return Err("created_by cannot be empty".to_string());
        }
        
        Ok(())
    }
}

impl DownloadToken {
    /// Generate a new secure download token
    pub fn generate(backup_job_id: String, created_by: String, ttl_seconds: i64) -> Self {
        use rand::Rng;
        
        // Generate a cryptographically secure random token
        let token: String = rand::thread_rng()
            .sample_iter(&rand::distributions::Alphanumeric)
            .take(64)
            .map(char::from)
            .collect();
        
        let now = chrono::Utc::now();
        let expires_at = now + chrono::Duration::seconds(ttl_seconds);
        
        Self {
            token,
            backup_job_id,
            created_by,
            expires_at: expires_at.to_rfc3339(),
            used: false,
            used_at: None,
            created_at: now.to_rfc3339(),
        }
    }
    
    /// Check if token is expired
    pub fn is_expired(&self) -> bool {
        let expires_at = chrono::DateTime::parse_from_rfc3339(&self.expires_at)
            .map(|dt| dt.with_timezone(&chrono::Utc))
            .unwrap_or_else(|_| chrono::Utc::now());
        
        chrono::Utc::now() > expires_at
    }
    
    /// Check if token is valid (not expired and not used)
    pub fn is_valid(&self) -> bool {
        !self.used && !self.is_expired()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_backup_job_validation() {
        let mut job = BackupJob {
            id: "test-id".to_string(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            backup_type: "db_full".to_string(),
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
            backup_chain_id: None,
            is_base_backup: true,
            incremental_number: 0,
            created_at: "2026-01-10T00:00:00Z".to_string(),
            updated_at: "2026-01-10T00:00:00Z".to_string(),
            store_id: "store-1".to_string(),
            created_by: Some("user-1".to_string()),
        };
        
        // Valid pending job
        assert!(job.validate().is_ok());
        
        // Invalid backup type
        job.backup_type = "invalid".to_string();
        assert!(job.validate().is_err());
        job.backup_type = "db_full".to_string();
        
        // Empty store_id
        job.store_id = "".to_string();
        assert!(job.validate().is_err());
        job.store_id = "store-1".to_string();
        
        // Completed without completed_at
        job.status = "completed".to_string();
        assert!(job.validate().is_err());
        
        // Completed without checksum
        job.completed_at = Some("2026-01-10T01:00:00Z".to_string());
        assert!(job.validate().is_err());
        
        // Completed without archive_path
        job.checksum = Some("abc123".to_string());
        assert!(job.validate().is_err());
        
        // Valid completed job
        job.archive_path = Some("/path/to/backup.zip".to_string());
        assert!(job.validate().is_ok());
    }
    
    #[test]
    fn test_backup_settings_validation() {
        let mut settings = BackupSettings {
            id: 1,
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            db_backup_enabled: true,
            db_incremental_schedule: "0 * * * *".to_string(),
            db_full_schedule: "59 23 * * *".to_string(),
            db_retention_daily: 7,
            db_retention_weekly: 4,
            db_retention_monthly: 12,
            db_max_incrementals: 24,
            file_backup_enabled: true,
            file_schedule: "0 3 * * 0".to_string(),
            file_retention_count: 2,
            file_include_paths: "data/uploads/".to_string(),
            file_exclude_patterns: "*.tmp,*.log".to_string(),
            full_backup_enabled: true,
            full_schedule: "0 2 1 * *".to_string(),
            full_retention_count: 12,
            backup_directory: "data/backups/".to_string(),
            compression_enabled: true,
            auto_upload_enabled: false,
            updated_at: "2026-01-10T00:00:00Z".to_string(),
            updated_by: None,
        };
        
        // Valid settings
        assert!(settings.validate().is_ok());
        
        // Invalid retention counts
        settings.db_retention_daily = 0;
        assert!(settings.validate().is_err());
        settings.db_retention_daily = 7;
        
        // Empty backup directory
        settings.backup_directory = "".to_string();
        assert!(settings.validate().is_err());
        settings.backup_directory = "data/backups/".to_string();
        
        // Empty schedule
        settings.db_incremental_schedule = "".to_string();
        assert!(settings.validate().is_err());
    }
    
    #[test]
    fn test_backup_settings_parse_paths() {
        let settings = BackupSettings {
            id: 1,
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            db_backup_enabled: true,
            db_incremental_schedule: "0 * * * *".to_string(),
            db_full_schedule: "59 23 * * *".to_string(),
            db_retention_daily: 7,
            db_retention_weekly: 4,
            db_retention_monthly: 12,
            db_max_incrementals: 24,
            file_backup_enabled: true,
            file_schedule: "0 3 * * 0".to_string(),
            file_retention_count: 2,
            file_include_paths: "data/uploads/, data/config/".to_string(),
            file_exclude_patterns: "*.tmp, *.log, temp-files/".to_string(),
            full_backup_enabled: true,
            full_schedule: "0 2 1 * *".to_string(),
            full_retention_count: 12,
            backup_directory: "data/backups/".to_string(),
            compression_enabled: true,
            auto_upload_enabled: false,
            updated_at: "2026-01-10T00:00:00Z".to_string(),
            updated_by: None,
        };
        
        let include_paths = settings.get_include_paths();
        assert_eq!(include_paths.len(), 2);
        assert_eq!(include_paths[0], "data/uploads/");
        assert_eq!(include_paths[1], "data/config/");
        
        let exclude_patterns = settings.get_exclude_patterns();
        assert_eq!(exclude_patterns.len(), 3);
        assert_eq!(exclude_patterns[0], "*.tmp");
        assert_eq!(exclude_patterns[1], "*.log");
        assert_eq!(exclude_patterns[2], "temp-files/");
    }
}


