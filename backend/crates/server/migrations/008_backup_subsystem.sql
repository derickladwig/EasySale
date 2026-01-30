-- Migration: Backup Subsystem
-- Description: Creates tables for tiered backup, retention, and Google Drive sync

-- Backup Jobs: Tracks all backup executions
CREATE TABLE IF NOT EXISTS backup_jobs (
    id TEXT PRIMARY KEY,
    backup_type TEXT NOT NULL,  -- 'db_incremental', 'db_full', 'file', 'full'
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
    started_at TEXT,
    completed_at TEXT,
    size_bytes INTEGER,
    checksum TEXT,  -- SHA-256 checksum of the archive
    archive_path TEXT,  -- Local path to the backup archive
    error_message TEXT,
    snapshot_method TEXT,  -- 'vacuum_into', 'wal_checkpoint_copy'
    files_included INTEGER DEFAULT 0,
    files_changed INTEGER DEFAULT 0,
    files_deleted INTEGER DEFAULT 0,
    backup_chain_id TEXT,  -- Links incremental backups together
    is_base_backup BOOLEAN DEFAULT 0,  -- True for first backup in a chain
    incremental_number INTEGER DEFAULT 0,  -- Position in the chain (0 for base)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    store_id TEXT,  -- Store ID (nullable for system-wide backups)
    created_by TEXT  -- User ID who triggered the backup (nullable for system/scheduler)
);

CREATE INDEX IF NOT EXISTS idx_backup_jobs_type ON backup_jobs(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_created ON backup_jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_chain ON backup_jobs(backup_chain_id);

-- Backup Settings: Configuration for schedules and retention
CREATE TABLE IF NOT EXISTS backup_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Singleton table
    -- Database backup settings
    db_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
    db_incremental_schedule TEXT NOT NULL DEFAULT '0 * * * *',  -- Hourly at :00
    db_full_schedule TEXT NOT NULL DEFAULT '59 23 * * *',  -- Daily at 23:59
    db_retention_daily INTEGER NOT NULL DEFAULT 7,
    db_retention_weekly INTEGER NOT NULL DEFAULT 4,
    db_retention_monthly INTEGER NOT NULL DEFAULT 12,
    db_max_incrementals INTEGER NOT NULL DEFAULT 24,  -- Start new chain after 24 incrementals
    
    -- File backup settings
    file_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
    file_schedule TEXT NOT NULL DEFAULT '0 3 * * 0',  -- Weekly Sunday at 3 AM
    file_retention_count INTEGER NOT NULL DEFAULT 2,  -- Keep last 2 file backups
    file_include_paths TEXT NOT NULL DEFAULT 'data/uploads/products/',  -- Comma-separated
    file_exclude_patterns TEXT NOT NULL DEFAULT '*.tmp,*.log,paint-swatches/',  -- Comma-separated
    
    -- Full backup settings
    full_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
    full_schedule TEXT NOT NULL DEFAULT '0 2 1 * *',  -- Monthly on 1st at 2 AM
    full_retention_count INTEGER NOT NULL DEFAULT 12,
    
    -- General settings
    backup_directory TEXT NOT NULL DEFAULT '/data/backups',
    compression_enabled BOOLEAN NOT NULL DEFAULT 1,
    auto_upload_enabled BOOLEAN NOT NULL DEFAULT 0,
    
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_by TEXT,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default settings with absolute path for Docker
INSERT OR IGNORE INTO backup_settings (id, backup_directory) 
VALUES (1, '/data/backups');

-- Backup Manifests: File checksums and metadata for each backup
CREATE TABLE IF NOT EXISTS backup_manifests (
    id TEXT PRIMARY KEY,
    backup_job_id TEXT NOT NULL,
    file_path TEXT NOT NULL,  -- Relative path from backup root
    file_size INTEGER NOT NULL,
    checksum TEXT NOT NULL,  -- SHA-256 checksum
    modified_at TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT 0,  -- True if file was deleted (for incrementals)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_backup_manifests_job ON backup_manifests(backup_job_id);
CREATE INDEX IF NOT EXISTS idx_backup_manifests_path ON backup_manifests(file_path);

-- Backup Destinations: Google Drive OAuth credentials (encrypted)
CREATE TABLE IF NOT EXISTS backup_destinations (
    id TEXT PRIMARY KEY,
    destination_type TEXT NOT NULL DEFAULT 'google_drive',  -- 'google_drive', 'local', 's3' (future)
    name TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT 1,
    
    -- Google Drive OAuth
    refresh_token_encrypted TEXT,  -- Encrypted OAuth refresh token
    folder_id TEXT,  -- Google Drive folder ID
    folder_path TEXT,  -- Human-readable folder path
    
    -- Upload settings
    auto_upload_db BOOLEAN DEFAULT 1,
    auto_upload_file BOOLEAN DEFAULT 1,
    auto_upload_full BOOLEAN DEFAULT 1,
    
    -- Status
    last_upload_at TEXT,
    last_upload_status TEXT,  -- 'success', 'failed'
    last_error TEXT,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_backup_destinations_type ON backup_destinations(destination_type);
CREATE INDEX IF NOT EXISTS idx_backup_destinations_enabled ON backup_destinations(enabled);

-- Backup Destination Objects: Maps local backups to remote files
CREATE TABLE IF NOT EXISTS backup_dest_objects (
    id TEXT PRIMARY KEY,
    backup_job_id TEXT NOT NULL,
    destination_id TEXT NOT NULL,
    remote_id TEXT NOT NULL,  -- Google Drive file ID
    remote_path TEXT,  -- Full path in remote storage
    upload_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'uploading', 'completed', 'failed'
    uploaded_at TEXT,
    upload_size_bytes INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES backup_destinations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_backup_dest_objects_job ON backup_dest_objects(backup_job_id);
CREATE INDEX IF NOT EXISTS idx_backup_dest_objects_dest ON backup_dest_objects(destination_id);
CREATE INDEX IF NOT EXISTS idx_backup_dest_objects_status ON backup_dest_objects(upload_status);

-- Restore Jobs: Tracks restore operations
CREATE TABLE IF NOT EXISTS restore_jobs (
    id TEXT PRIMARY KEY,
    backup_job_id TEXT NOT NULL,
    restore_type TEXT NOT NULL,  -- 'full', 'database_only', 'files_only'
    status TEXT NOT NULL DEFAULT 'pending',  -- 'pending', 'running', 'completed', 'failed'
    started_at TEXT,
    completed_at TEXT,
    files_restored INTEGER DEFAULT 0,
    error_message TEXT,
    restore_point TEXT,  -- Timestamp of the backup being restored
    pre_restore_snapshot_id TEXT,  -- ID of backup created before restore (for rollback)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_by TEXT NOT NULL,
    FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE RESTRICT,
    FOREIGN KEY (pre_restore_snapshot_id) REFERENCES backup_jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_restore_jobs_backup ON restore_jobs(backup_job_id);
CREATE INDEX IF NOT EXISTS idx_restore_jobs_status ON restore_jobs(status);
CREATE INDEX IF NOT EXISTS idx_restore_jobs_created ON restore_jobs(created_at);

-- Backup Alerts: Notifications for backup failures and warnings
CREATE TABLE IF NOT EXISTS backup_alerts (
    id TEXT PRIMARY KEY,
    alert_type TEXT NOT NULL,  -- 'backup_failure', 'disk_space_warning', 'upload_failure', etc.
    severity TEXT NOT NULL,  -- 'low', 'medium', 'high', 'critical'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    backup_job_id TEXT,  -- Optional reference to failed backup job
    error_details TEXT,
    suggested_actions TEXT,
    acknowledged BOOLEAN NOT NULL DEFAULT 0,
    acknowledged_at TEXT,
    acknowledged_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE SET NULL,
    FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_backup_alerts_type ON backup_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_backup_alerts_severity ON backup_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_backup_alerts_acknowledged ON backup_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_backup_alerts_created ON backup_alerts(created_at);
