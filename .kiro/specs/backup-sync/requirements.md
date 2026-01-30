# Requirements Document: Unified Backup & Sync Module

## Introduction

The Unified Backup & Sync module provides tiered backup capabilities directly integrated into the CAPS POS system. This module ensures business continuity by enabling frequent database backups (hourly incremental + daily full), weekly file backups, off-site replication to Google Drive via OAuth, and reliable restore functionality.

The system builds upon existing infrastructure (backup_service.py, scheduler.py, google_drive.py, backup.py, BackupDashboard.tsx) and enhances it with proper data models, integrity validation, OAuth-based Google Drive sync, and comprehensive restore capabilities. It must operate safely under active POS usage and provide clear audit trails for compliance.

**Technology Stack:**
- Backend: Rust with actix-web (matching existing architecture)
- Database: SQLite with sqlx (matching existing patterns)
- Scheduling: tokio-cron-scheduler or tokio::time
- Google Drive: OAuth2 with reqwest
- Frontend: React/TypeScript (existing BackupDashboard to be enhanced)

**Tiered Backup Strategy:**
- **Database** (invoices, sales, customers, inventory, AP): Hourly incremental + Daily full, 7 daily/4 weekly/12 monthly retention - CRITICAL
- **Uploads/Images** (~52K files): Weekly, keep last 2 copies - LOW priority
- **Config files**: With DB backup, same retention as DB - MEDIUM priority

## Glossary

- **Backup_Job**: A single execution of the backup process, creating one archive
- **DB_Backup**: Database-only backup (hourly incremental or daily full)
- **File_Backup**: Uploads/images backup (weekly, last 2 copies)
- **Full_Backup**: Combined DB + files backup (monthly, for disaster recovery)
- **Incremental_Backup**: Database backup containing only changes since last backup (hourly)
- **Archive**: A ZIP file containing the database snapshot, files, metadata, and checksums
- **Manifest**: A JSON file listing all files included in a backup, their checksums, and deleted files
- **Destination**: A storage location for backup archives (local filesystem or Google Drive)
- **Retention_Policy**: Rules defining how many backups to keep and when to delete old backups
- **Restore_Job**: A process that applies a backup archive to restore the system state
- **Snapshot**: A consistent point-in-time copy of the SQLite database
- **Admin**: A user with the MANAGE_SETTINGS permission who can configure and execute backups

## Requirements

### Requirement 1: Tiered Database Backup

**User Story:** As a store manager, I want frequent database backups with different retention periods, so that I can recover from data loss with minimal data loss (hourly) or restore to specific points in time (daily/weekly/monthly).

#### Acceptance Criteria

1. WHEN an hourly incremental backup runs, THE System SHALL capture only database changes since the last backup and complete within 2 minutes
2. WHEN a daily full backup runs, THE System SHALL create a complete database snapshot using VACUUM INTO and complete within 5 minutes
3. WHEN creating any database backup, THE System SHALL generate a SHA-256 checksum and compress with gzip
4. WHEN creating any database backup, THE System SHALL record the backup job with type, status, timestamps, size, and checksum
5. WHEN the database is in use, THE System SHALL create a consistent snapshot without corrupting data or requiring POS shutdown
6. WHEN a database backup completes successfully, THE System SHALL store the manifest in the backup_manifest table
7. WHEN a database backup fails, THE System SHALL record the error, preserve partial artifacts for debugging, and alert administrators
8. WHEN retention policies are applied, THE System SHALL keep 7 daily, 4 weekly, and 12 monthly backups

### Requirement 2: File Backup (Weekly)

**User Story:** As a store manager, I want weekly backups of product images and uploads, so that I can recover media files without backing them up too frequently.

#### Acceptance Criteria

1. WHEN a weekly file backup runs, THE System SHALL create a ZIP archive of the uploads/products/ folder
2. WHEN creating a file backup, THE System SHALL skip static assets (paint-swatches) that can be re-downloaded
3. WHEN a file backup completes, THE System SHALL keep only the last 2 copies and delete older file backups
4. WHEN creating a file backup, THE System SHALL generate checksums for integrity validation
5. WHEN a file backup fails, THE System SHALL keep the previous backup and alert administrators

### Requirement 3: Combined Full Backup (Monthly)

**User Story:** As a store manager, I want monthly combined backups with database and essential files, so that I have complete disaster recovery archives.

#### Acceptance Criteria

1. WHEN a monthly full backup runs, THE System SHALL create a single ZIP archive containing the database and essential files
2. WHEN creating a full backup, THE System SHALL include the database snapshot, uploads, and config files
3. WHEN a full backup completes, THE System SHALL upload it to Google Drive for off-site storage
4. WHEN retention policies are applied to full backups, THE System SHALL keep 12 monthly copies

### Requirement 4: Backup Scheduling

**User Story:** As a store manager, I want backups to run automatically on different schedules, so that critical data is backed up frequently and less critical data is backed up less often.

#### Acceptance Criteria

1. WHEN database backups are enabled, THE System SHALL execute hourly incremental backups at :00 and daily full backups at 23:59
2. WHEN file backups are enabled, THE System SHALL execute weekly backups on Sunday at 3:00 AM
3. WHEN a scheduled backup time arrives, THE System SHALL start the backup job within 5 minutes of the scheduled time
4. WHEN a backup job is already running, THE System SHALL skip the scheduled execution and log the reason
5. WHEN a scheduled backup fails, THE System SHALL retry once after 15 minutes and alert administrators if both attempts fail
6. WHEN the schedule configuration changes in backup_settings table, THE System SHALL apply the new schedule without requiring a restart
7. WHEN the system starts up, THE System SHALL resume the scheduler and check for any missed scheduled backups
8. WHEN a backup completes successfully, THE System SHALL automatically upload to Google Drive if configured

### Requirement 5: Google Drive OAuth Synchronization

**User Story:** As a store manager, I want backups automatically uploaded to Google Drive using OAuth, so that I have off-site copies in case of local hardware failure.

#### Acceptance Criteria

1. WHEN an admin connects Google Drive, THE System SHALL complete OAuth authentication (not service account) and store encrypted refresh tokens
2. WHEN a database backup completes successfully, THE System SHALL upload it to the configured Google Drive folder daily
3. WHEN a file backup completes successfully, THE System SHALL upload it to Google Drive weekly
4. WHEN a full backup completes successfully, THE System SHALL upload it to Google Drive monthly
5. WHEN uploading to Google Drive, THE System SHALL use resumable uploads to handle network interruptions
6. WHEN an upload completes, THE System SHALL record the remote object ID in backup_dest_object and verify the upload succeeded
7. WHEN an upload fails, THE System SHALL keep the local backup and retry the upload on the next scheduled backup
8. WHEN the Google Drive token expires, THE System SHALL disable uploads and alert administrators to reconnect
9. WHEN listing remote backups, THE System SHALL query Google Drive and reconcile with local backup records

### Requirement 6: Retention Policies

**User Story:** As a store manager, I want old backups automatically deleted according to type-specific policies, so that storage costs remain manageable and I don't have to manually clean up.

#### Acceptance Criteria

1. WHEN a database backup completes, THE System SHALL evaluate retention policies and keep 7 daily, 4 weekly, and 12 monthly backups
2. WHEN a file backup completes, THE System SHALL keep only the last 2 file backups and delete older ones
3. WHEN a full backup completes, THE System SHALL keep 12 monthly full backups
4. WHEN a Google Drive upload completes, THE System SHALL evaluate remote retention policies and delete the oldest remote backups exceeding the configured count (default 10)
5. WHEN retention policies would delete all backups, THE System SHALL preserve at least one backup and alert administrators
6. WHEN a backup is deleted locally, THE System SHALL update the backup_job record to reflect the deletion
7. WHEN a backup is deleted from Google Drive, THE System SHALL update the backup_dest_object record

### Requirement 7: Backup Restore

**User Story:** As a store manager, I want to restore from a backup, so that I can recover from data corruption, accidental deletion, or hardware failure.

#### Acceptance Criteria

1. WHEN an admin initiates a restore, THE System SHALL validate the archive checksum before proceeding
2. WHEN restoring, THE System SHALL optionally create a pre-restore snapshot for rollback
3. WHEN restoring the database, THE System SHALL replace the SQLite file atomically using VACUUM INTO to prevent corruption
4. WHEN restoring files, THE System SHALL extract and overwrite files according to the manifest
5. WHEN a restore completes, THE System SHALL record the restore job with status, timestamps, and source backup
6. WHEN a restore fails, THE System SHALL preserve the pre-restore snapshot and provide rollback instructions
7. WHEN restoring from a database-only backup, THE System SHALL restore only the database
8. WHEN restoring from a full backup, THE System SHALL restore both database and files

### Requirement 8: Fresh Install Restore

**User Story:** As a store manager, I want to restore a backup on a new installation, so that I can migrate to new hardware or recover from complete system failure.

#### Acceptance Criteria

1. WHEN the database is missing or empty, THE System SHALL display a restore wizard on first launch
2. WHEN an admin uploads a backup archive, THE System SHALL validate the archive format and checksum
3. WHEN applying a fresh install restore, THE System SHALL extract the database and files to their configured locations
4. WHEN the restore completes, THE System SHALL initialize the application with the restored data
5. WHEN the uploaded archive is corrupted, THE System SHALL reject the restore and display a clear error message

### Requirement 9: Backup Administration UI

**User Story:** As a store manager, I want a clear interface to manage backups, so that I can monitor backup health and take action when needed.

#### Acceptance Criteria

1. WHEN an admin views the Backups page, THE System SHALL display an overview showing last DB backup, last file backup, next scheduled backups, storage usage, and Google Drive status
2. WHEN an admin views the backup list, THE System SHALL display all backups with type (DB/File/Full), size, date, status, and available actions
3. WHEN an admin clicks "Run Backup Now", THE System SHALL allow selection of backup type (DB/File/Full) and show progress
4. WHEN an admin configures backup settings, THE System SHALL provide separate schedules for DB (hourly/daily) and files (weekly)
5. WHEN an admin connects Google Drive, THE System SHALL initiate OAuth flow and display connection status
6. WHEN an admin views backup logs, THE System SHALL display structured logs for each backup job
7. WHEN an admin downloads a backup, THE System SHALL stream the archive file for download
8. WHEN an admin deletes a backup, THE System SHALL confirm the action and delete both local and remote copies

### Requirement 10: Permissions and Security

**User Story:** As a system administrator, I want backup operations restricted to authorized users, so that sensitive data remains protected.

#### Acceptance Criteria

1. WHEN a non-admin user attempts to access backup features, THE System SHALL return a 403 Forbidden error
2. WHEN storing Google Drive tokens, THE System SHALL encrypt the tokens or restrict file permissions to prevent unauthorized access
3. WHEN creating backup archives, THE System SHALL set file permissions to restrict access to the POS application user
4. WHEN logging backup operations, THE System SHALL record the user ID, station ID, and timestamp for audit purposes
5. WHEN a backup contains sensitive data, THE System SHALL ensure archives are not accessible via public URLs

### Requirement 11: Failure Handling and Monitoring

**User Story:** As a store manager, I want clear alerts when backups fail, so that I can take corrective action before data loss occurs.

#### Acceptance Criteria

1. WHEN disk space is insufficient, THE System SHALL prevent backup creation and alert administrators
2. WHEN a backup job fails, THE System SHALL record detailed error logs and display the error in the UI
3. WHEN a Google Drive upload fails, THE System SHALL keep the local backup and show partial success status
4. WHEN Google Drive tokens are revoked, THE System SHALL disable the destination and alert administrators to reconnect
5. WHEN a backup archive is corrupted, THE System SHALL detect the corruption during validation and prevent restore
6. WHEN the scheduler encounters an error, THE System SHALL log the error and continue scheduling future backups
7. WHEN a restore job fails, THE System SHALL preserve the pre-restore snapshot and provide recovery instructions
