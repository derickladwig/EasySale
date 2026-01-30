# Design Document: Unified Backup & Sync Module

## Overview

The Unified Backup & Sync module integrates tiered backup capabilities directly into the CAPS POS system. The design enhances existing infrastructure (backup_service.py, scheduler.py, google_drive.py, backup.py, BackupDashboard.tsx) with proper data models, integrity validation, OAuth-based Google Drive sync, and comprehensive restore capabilities.

The system implements a three-tier backup strategy:
- **Database backups**: Hourly incremental + Daily full (7 daily/4 weekly/12 monthly retention) - CRITICAL
- **File backups**: Weekly uploads/images backup (keep last 2) - LOW priority  
- **Full backups**: Monthly combined DB + files (12 monthly retention) - For disaster recovery

All operations are designed to be safe under active POS usage, with atomic database snapshots using VACUUM INTO and transactional file operations.

## Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│              React Admin UI (Settings → Backups)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Overview   │  │   Settings   │  │   Restore    │     │
│  │     Tab      │  │     Tab      │  │     Tab      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/REST
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Rust Backend (actix-web)                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Backup API Handlers (Admin-only)             │  │
│  │  /api/backups/*  (overview, run, settings, restore) │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                │
│  ┌──────────────┬──────────────┬──────────────┬─────────┐  │
│  │   Backup     │   Restore    │  Scheduler   │ Google  │  │
│  │   Service    │   Service    │   Service    │ Drive   │  │
│  │              │              │ (tokio-cron) │ (OAuth) │  │
│  └──────────────┴──────────────┴──────────────┴─────────┘  │
│                            │                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Backup Models (sqlx)                         │  │
│  │  (backup_job, backup_settings, backup_destination)  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   SQLite     │  │    Local     │  │   Google     │
│   Metadata   │  │  Filesystem  │  │    Drive     │
│              │  │  (backups/)  │  │   (OAuth)    │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Existing Infrastructure Integration

**Backend Structure (Rust):**
- `backend/rust/src/handlers/` - Add backup.rs for backup API handlers
- `backend/rust/src/models/` - Add backup.rs for backup models
- `backend/rust/src/services/` - Add backup_service.rs, restore_service.rs, scheduler_service.rs, google_drive_service.rs
- `backend/rust/migrations/` - Add 003_backup_subsystem.sql migration

**Frontend:**
- `frontend/src/features/admin/pages/BackupsPage.tsx` - New page in Settings
- `frontend/src/domains/backup/` - Backup domain logic and types

### Data Flow

**Backup Creation Flow (Tiered):**
1. Scheduler triggers backup based on type (hourly DB incremental, daily DB full, weekly files, monthly full)
2. BackupService creates backup_job record with type
3. For DB backups: BackupService creates SQLite snapshot using VACUUM INTO, compresses with gzip, generates SHA-256 checksum
4. For file backups: BackupService creates ZIP of uploads/products/, skips paint-swatches
5. For full backups: BackupService creates combined ZIP with DB + files
6. BackupService updates backup_job with completion status
7. GoogleDriveService uploads archive using OAuth (daily for DB, weekly for files, monthly for full)
8. RetentionService prunes old backups according to type-specific policies (7 daily/4 weekly/12 monthly for DB, last 2 for files, 12 monthly for full)

**Restore Flow:**
1. User selects backup and initiates restore
2. RestoreService validates archive checksum
3. RestoreService creates pre-restore snapshot (optional)
4. RestoreService extracts database to temporary location
5. RestoreService atomically replaces active database
6. RestoreService extracts files and overwrites existing files
7. RestoreService applies deleted files list (if strict mode)
8. RestoreService records restore_job completion

## Components and Interfaces

### BackupService

**Responsibilities:**
- Create tiered backups (DB incremental/full, file, full)
- Generate manifests and checksums
- Compress archives with gzip

**Key Methods:**
```rust
pub struct BackupService {
    db_pool: Pool<Sqlite>,
    backup_root: PathBuf,
}

impl BackupService {
    pub async fn create_backup(
        &self,
        mode: BackupMode,  // DbIncremental, DbFull, File, Full
        reason: String,
        user_id: i64
    ) -> Result<BackupJob, BackupError>
    
    pub async fn create_snapshot(
        &self,
        db_path: &Path,
        output_path: &Path
    ) -> Result<(), BackupError>
    
    pub async fn scan_files(
        &self,
        include_paths: &[PathBuf],
        exclude_patterns: &[String]
    ) -> Result<Vec<FileEntry>, BackupError>
    
    pub async fn create_archive(
        &self,
        snapshot_path: &Path,
        files: Vec<FileEntry>,
        manifest: Manifest,
        output_path: &Path
    ) -> Result<String, BackupError>  // Returns checksum
}
```

### RestoreService

**Responsibilities:**
- Validate backup archives
- Apply backups to restore system state
- Handle pre-restore snapshots

**Key Methods:**
```rust
pub struct RestoreService {
    db_pool: Pool<Sqlite>,
    backup_service: Arc<BackupService>,
}

impl RestoreService {
    pub async fn restore_backup(
        &self,
        backup_id: i64,
        strict_delete: bool,
        create_pre_restore_snapshot: bool,
        user_id: i64
    ) -> Result<RestoreJob, RestoreError>
    
    pub async fn validate_archive(
        &self,
        archive_path: &Path,
        expected_checksum: &str
    ) -> Result<bool, RestoreError>
    
    pub async fn extract_database(
        &self,
        archive_path: &Path,
        temp_dir: &Path
    ) -> Result<PathBuf, RestoreError>
    
    pub async fn replace_database_atomic(
        &self,
        new_db_path: &Path,
        active_db_path: &Path
    ) -> Result<(), RestoreError>
    
    pub async fn extract_files(
        &self,
        archive_path: &Path,
        manifest: &Manifest
    ) -> Result<(), RestoreError>
}
```

### SchedulerService

**Responsibilities:**
- Execute scheduled backups (hourly, daily, weekly, monthly)
- Prevent overlapping jobs
- Handle missed schedules

**Key Methods:**
```rust
pub struct SchedulerService {
    db_pool: Pool<Sqlite>,
    backup_service: Arc<BackupService>,
    scheduler: JobScheduler,
}

impl SchedulerService {
    pub async fn start(&mut self) -> Result<(), SchedulerError>
    
    pub async fn stop(&mut self) -> Result<(), SchedulerError>
    
    pub async fn schedule_backups(
        &mut self,
        settings: &BackupSettings
    ) -> Result<(), SchedulerError>
    
    pub async fn execute_backup(
        &self,
        backup_type: BackupMode
    ) -> Result<(), SchedulerError>
    
    pub async fn is_job_running(&self) -> bool
}
```

### GoogleDriveService

**Responsibilities:**
- Upload backups to Google Drive via OAuth
- Manage OAuth tokens
- Enforce remote retention policies

**Key Methods:**
```rust
pub struct GoogleDriveService {
    db_pool: Pool<Sqlite>,
    client: reqwest::Client,
}

impl GoogleDriveService {
    pub async fn connect_oauth(
        &self,
        auth_code: String
    ) -> Result<(), GoogleDriveError>
    
    pub async fn upload_backup(
        &self,
        backup_id: i64,
        archive_path: &Path,
        destination_config: &DestinationConfig
    ) -> Result<String, GoogleDriveError>  // Returns remote object ID
    
    pub async fn list_remote_backups(
        &self,
        destination_id: i64
    ) -> Result<Vec<RemoteBackup>, GoogleDriveError>
    
    pub async fn delete_remote_backup(
        &self,
        destination_id: i64,
        object_id: &str
    ) -> Result<(), GoogleDriveError>
    
    pub async fn enforce_retention(
        &self,
        destination_id: i64,
        retention_count: i32
    ) -> Result<(), GoogleDriveError>
    
    pub async fn health_check(
        &self,
        destination_id: i64
    ) -> Result<HealthStatus, GoogleDriveError>
}
```

### RetentionService

**Responsibilities:**
- Prune old local backups
- Enforce type-specific retention policies
- Maintain backup integrity

**Key Methods:**
```rust
pub struct RetentionService {
    db_pool: Pool<Sqlite>,
}

impl RetentionService {
    pub async fn enforce_retention(
        &self,
        backup_type: BackupMode,
        retention_config: &RetentionConfig
    ) -> Result<Vec<i64>, RetentionError>  // Returns deleted backup IDs
    
    pub async fn find_deletable_backups(
        &self,
        backup_type: BackupMode,
        retention_config: &RetentionConfig
    ) -> Result<Vec<BackupJob>, RetentionError>
    
    pub async fn delete_backup(
        &self,
        backup_id: i64,
        delete_remote: bool
    ) -> Result<(), RetentionError>
}
```

## Data Models

### Database Schema

```sql
-- Backup job execution record
CREATE TABLE backup_job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chain_id TEXT NOT NULL,
    backup_type TEXT NOT NULL,  -- 'base' or 'incremental'
    status TEXT NOT NULL,  -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    size_bytes INTEGER,
    archive_path TEXT,
    checksum TEXT,
    snapshot_method TEXT,  -- 'vacuum_into', 'backup_api', 'wal_checkpoint'
    error_message TEXT,
    user_id INTEGER NOT NULL,
    station_id INTEGER,
    reason TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Backup chain metadata
CREATE TABLE backup_chain (
    id TEXT PRIMARY KEY,  -- UUID
    created_at TIMESTAMP NOT NULL,
    base_backup_id INTEGER NOT NULL,
    last_backup_id INTEGER NOT NULL,
    incremental_count INTEGER DEFAULT 0,
    total_size_bytes INTEGER DEFAULT 0,
    FOREIGN KEY (base_backup_id) REFERENCES backup_job(id),
    FOREIGN KEY (last_backup_id) REFERENCES backup_job(id)
);

-- Backup manifest (file list)
CREATE TABLE backup_manifest (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_id INTEGER NOT NULL,
    manifest_json TEXT NOT NULL,  -- JSON with file list, checksums, deleted files
    included_paths TEXT NOT NULL,  -- JSON array
    excluded_patterns TEXT NOT NULL,  -- JSON array
    file_count INTEGER NOT NULL,
    FOREIGN KEY (backup_id) REFERENCES backup_job(id)
);

-- Backup destination configuration
CREATE TABLE backup_destination (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,  -- 'google_drive', 's3', 'ftp'
    enabled BOOLEAN DEFAULT TRUE,
    config_json TEXT NOT NULL,  -- Encrypted JSON with credentials
    folder_id TEXT,
    retention_count INTEGER DEFAULT 7,
    last_upload_at TIMESTAMP,
    last_error TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Remote backup object mapping
CREATE TABLE backup_destination_object (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_id INTEGER NOT NULL,
    destination_id INTEGER NOT NULL,
    remote_object_id TEXT NOT NULL,
    remote_path TEXT,
    uploaded_at TIMESTAMP NOT NULL,
    size_bytes INTEGER,
    FOREIGN KEY (backup_id) REFERENCES backup_job(id),
    FOREIGN KEY (destination_id) REFERENCES backup_destination(id),
    UNIQUE (backup_id, destination_id)
);

-- Backup settings
CREATE TABLE backup_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Singleton
    enabled BOOLEAN DEFAULT FALSE,
    frequency TEXT DEFAULT 'daily',  -- 'daily', 'weekly', 'monthly'
    time_hhmm TEXT DEFAULT '02:00',
    retention_local_count INTEGER DEFAULT 7,
    retention_local_days INTEGER DEFAULT 30,
    chain_max_incrementals INTEGER DEFAULT 6,
    include_paths TEXT NOT NULL,  -- JSON array
    exclude_patterns TEXT NOT NULL,  -- JSON array
    updated_at TIMESTAMP NOT NULL,
    updated_by INTEGER,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Restore job execution record
CREATE TABLE restore_job (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    backup_id INTEGER NOT NULL,
    status TEXT NOT NULL,  -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    strict_delete BOOLEAN DEFAULT FALSE,
    pre_restore_snapshot_id INTEGER,
    error_message TEXT,
    user_id INTEGER NOT NULL,
    station_id INTEGER,
    FOREIGN KEY (backup_id) REFERENCES backup_job(id),
    FOREIGN KEY (pre_restore_snapshot_id) REFERENCES backup_job(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_backup_job_chain ON backup_job(chain_id);
CREATE INDEX idx_backup_job_status ON backup_job(status);
CREATE INDEX idx_backup_job_created ON backup_job(started_at);
CREATE INDEX idx_backup_destination_object_backup ON backup_destination_object(backup_id);
CREATE INDEX idx_backup_destination_object_destination ON backup_destination_object(destination_id);
```

### Archive Format

**ZIP Structure:**
```
backup_<timestamp>.zip
├── db/
│   └── store_local.db          # SQLite snapshot
├── files/
│   ├── uploads/                # Product images, PDFs, etc.
│   └── config/                 # Configuration files
├── meta/
│   ├── manifest.json           # File list with checksums
│   ├── backup.json             # Backup metadata
│   └── checksum.sha256         # Archive checksum
└── logs/
    └── backup.log              # Backup execution log
```

**manifest.json Format:**
```json
{
  "backup_id": 123,
  "chain_id": "uuid",
  "backup_type": "incremental",
  "timestamp": "2026-01-09T12:00:00Z",
  "files": [
    {
      "path": "uploads/product_123.jpg",
      "size": 45678,
      "checksum": "sha256:abc123...",
      "modified_at": "2026-01-08T10:30:00Z"
    }
  ],
  "deleted_files": [
    "uploads/old_product.jpg"
  ],
  "include_paths": ["/uploads", "/config"],
  "exclude_patterns": ["*.tmp", "*.log"]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Backup Archive Integrity
*For any* completed backup job, the archive checksum stored in the database must match the SHA-256 hash of the actual archive file.
**Validates: Requirements 1.5**

### Property 2: Manifest Completeness
*For any* backup archive, the manifest must list all files included in the archive, and no files in the archive should be missing from the manifest.
**Validates: Requirements 1.4**

### Property 3: Incremental Chain Consistency
*For any* incremental backup in a chain, applying the base backup followed by all incrementals in sequence must produce the same file state as the latest incremental's manifest describes.
**Validates: Requirements 3.5**

### Property 4: Database Snapshot Consistency
*For any* database snapshot created during backup, opening the snapshot file must succeed without corruption errors, and all tables must be accessible.
**Validates: Requirements 1.6**

### Property 5: Retention Policy Enforcement
*For any* retention policy with count N, after enforcement completes, the number of backups (excluding in-progress jobs) must be less than or equal to N.
**Validates: Requirements 5.1, 5.2**

### Property 6: Chain Integrity After Deletion
*For any* backup deletion, if the deleted backup is part of a chain, either the entire chain is deleted or only complete chains are deleted, never leaving orphaned incrementals.
**Validates: Requirements 5.2**

### Property 7: Restore Atomicity
*For any* restore operation, either the database and all files are successfully restored, or the system remains in its pre-restore state (no partial restore).
**Validates: Requirements 6.3, 6.4**

### Property 8: Remote Upload Idempotency
*For any* backup, uploading to a destination multiple times must result in exactly one remote object, not duplicate uploads.
**Validates: Requirements 4.2**

### Property 9: Scheduler Non-Overlap
*For any* scheduled backup execution, if a backup job is already running, the scheduler must skip the execution and not start a concurrent backup.
**Validates: Requirements 2.3**

### Property 10: Checksum Validation Before Restore
*For any* restore operation, the archive checksum must be validated before any files are extracted or the database is replaced.
**Validates: Requirements 6.1**

### Property 11: Pre-Restore Snapshot Creation
*For any* restore operation with pre-restore snapshot enabled, a snapshot must be created and recorded before any restore actions are performed.
**Validates: Requirements 6.2**

### Property 12: OAuth Token Encryption
*For any* Google Drive destination, the stored OAuth tokens must be encrypted or protected with restrictive file permissions.
**Validates: Requirements 9.2**

### Property 13: Permission Enforcement
*For any* backup API endpoint, requests from non-admin users must return 403 Forbidden.
**Validates: Requirements 9.1**

### Property 14: Audit Logging Completeness
*For any* backup or restore operation, an audit log entry must be created recording the user ID, station ID, and timestamp.
**Validates: Requirements 9.4**

### Property 15: Disk Space Validation
*For any* backup creation, if available disk space is less than 2x the estimated backup size, the backup must be prevented and an error logged.
**Validates: Requirements 10.1**

## Error Handling

### Backup Creation Errors

**Insufficient Disk Space:**
- Check available space before starting backup
- Require 2x estimated size for safety margin
- Display clear error: "Insufficient disk space. Need X GB, have Y GB available."

**Database Lock/Busy:**
- Use VACUUM INTO which handles locks gracefully
- If unavailable, retry with exponential backoff (3 attempts)
- Fall back to WAL checkpoint + copy method

**File Access Errors:**
- Skip inaccessible files and log warnings
- Continue backup with accessible files
- Mark backup as "completed with warnings"

**Archive Creation Failure:**
- Clean up partial archive files
- Record detailed error in backup_job
- Preserve database snapshot for debugging

### Restore Errors

**Checksum Mismatch:**
- Reject restore immediately
- Display error: "Archive corrupted. Checksum mismatch."
- Suggest downloading fresh copy or using different backup

**Pre-Restore Snapshot Failure:**
- Abort restore before any changes
- Display error and suggest freeing disk space

**Database Replacement Failure:**
- Keep pre-restore snapshot
- Provide rollback instructions
- Log detailed error for support

**File Extraction Failure:**
- Continue extracting remaining files
- Log all failures
- Mark restore as "completed with errors"

### Upload Errors

**Network Timeout:**
- Use resumable uploads to handle interruptions
- Retry from last successful chunk
- Maximum 3 retry attempts with exponential backoff

**Token Expired:**
- Disable destination
- Alert administrators to reconnect
- Keep local backup intact

**Quota Exceeded:**
- Disable destination
- Alert administrators
- Suggest increasing quota or adjusting retention

## Testing Strategy

### Unit Tests

**Backup Creation:**
- Test snapshot creation with various SQLite states
- Test manifest generation with different file sets
- Test checksum calculation
- Test incremental file detection

**Restore Operations:**
- Test checksum validation (valid and invalid)
- Test atomic database replacement
- Test file extraction with various archive structures
- Test deletion application in strict mode

**Retention Logic:**
- Test backup selection for deletion
- Test chain integrity preservation
- Test edge cases (0 backups, 1 backup, all expired)

**Scheduler:**
- Test schedule calculation (daily, weekly, monthly)
- Test overlap prevention
- Test missed schedule handling

### Property-Based Tests

Each correctness property should be implemented as a property-based test with minimum 100 iterations:

**Property 1 Test:**
- Generate random backup jobs
- Create archives and calculate checksums
- Verify stored checksum matches actual file

**Property 3 Test:**
- Generate random file changes across multiple backups
- Create base + incrementals
- Apply chain and verify final state matches latest manifest

**Property 5 Test:**
- Generate random backup sets with various ages
- Apply retention with random count/days
- Verify count constraint satisfied

**Property 7 Test:**
- Generate random restore scenarios
- Simulate failures at various points
- Verify system state is either fully restored or unchanged

### Integration Tests

**End-to-End Backup Flow:**
- Create full backup
- Verify archive exists and is valid
- Verify database record created
- Verify manifest accurate

**End-to-End Restore Flow:**
- Create backup
- Modify system state
- Restore backup
- Verify system state matches backup

**Google Drive Integration:**
- Connect Drive (mock OAuth)
- Upload backup
- Verify remote object created
- Download and verify integrity

**Scheduler Integration:**
- Configure schedule
- Wait for scheduled time
- Verify backup created
- Verify next schedule calculated

### Performance Tests

**Backup Speed:**
- Measure time to backup 1GB, 10GB, 100GB datasets
- Target: < 5 minutes for typical 10GB dataset

**Restore Speed:**
- Measure time to restore various sizes
- Target: < 10 minutes for typical 10GB dataset

**Incremental Efficiency:**
- Measure incremental backup size vs full backup
- Target: < 10% of full backup size for typical daily changes

**Scheduler Overhead:**
- Measure CPU/memory usage of scheduler service
- Target: < 1% CPU, < 50MB memory when idle

## Deployment Considerations

### Database Migrations

Use Alembic to create migrations for all backup tables. Migration should:
- Create tables with proper indexes
- Insert default backup_settings row
- Be idempotent (safe to run multiple times)

### Configuration

Add to `.env`:
```
BACKUP_ROOT=/var/lib/caps-pos/backups
BACKUP_TEMP_DIR=/tmp/caps-pos-backups
BACKUP_MAX_ARCHIVE_SIZE_GB=100
GOOGLE_DRIVE_CLIENT_ID=...
GOOGLE_DRIVE_CLIENT_SECRET=...
```

### Permissions

Backup files should be owned by the POS application user with 0600 permissions (read/write for owner only).

### Monitoring

Expose metrics:
- Last successful backup timestamp
- Backup failure count (last 24 hours)
- Total backup storage used
- Google Drive sync status
- Scheduler health status

### Documentation

Update user documentation:
- How to configure backup schedules
- How to connect Google Drive
- How to restore from backup
- How to perform fresh install restore
- Troubleshooting common errors
