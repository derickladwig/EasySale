# Implementation Plan: Unified Backup & Sync Module

## Overview

This implementation plan implements tiered backup capabilities using Rust, matching the existing CAPS POS architecture. The approach enhances the system with proper data models, OAuth-based Google Drive sync, and comprehensive restore functionality.

**Technology Stack:**
- Backend: Rust with actix-web (matching existing architecture)
- Database: SQLite with sqlx (matching existing patterns)
- Scheduling: tokio-cron-scheduler
- Google Drive: OAuth2 with reqwest
- Frontend: React/TypeScript

**Tiered Backup Strategy:**
- **Database**: Hourly incremental + Daily full (7 daily/4 weekly/12 monthly) - CRITICAL
- **Files**: Weekly uploads/images (~52K files, keep last 2) - LOW priority
- **Full**: Monthly combined DB + files (12 monthly) - For disaster recovery

The implementation follows an incremental development strategy: database schema → backup engine → UI → scheduling → OAuth Google Drive → restore → hardening.

## Tasks

- [x] 1. Discovery and Integration Planning
  - ✅ Reviewed existing backend/rust structure and patterns
  - ✅ Reviewed existing sqlx migration system (migrations 001-006)
  - ✅ Reviewed existing actix-web handler patterns
  - ✅ Reviewed existing authentication middleware
  - ✅ Documented uploads/images location (data/uploads/products/)
  - ✅ Documented existing Settings UI structure (AdminPage.tsx with tabs)
  - ✅ Created comprehensive integration-plan.md
  - _Requirements: All (prerequisite for integration)_

- [x] 2. Database Schema and Migrations
  - [x] 2.1 Create sqlx migration 007_backup_subsystem.sql (was 003 in spec, updated to 007)
    - ✅ Added backup_jobs table with all fields and indexes
    - ✅ Added backup_settings table (singleton) with default values
    - ✅ Added backup_manifests table for file checksums
    - ✅ Added backup_destinations table for OAuth tokens (encrypted)
    - ✅ Added backup_dest_objects table for remote file mapping
    - ✅ Added restore_jobs table
    - ✅ Added indexes for performance
    - ✅ Inserted default backup_settings row
    - _Requirements: 1.4, 7.6, 10.4, 11.4_

  - [x] 2.2 Create backup models in backend/rust/src/models/backup.rs
    - ✅ Created BackupJob struct with sqlx derives and validation
    - ✅ Created BackupSettings struct with validation and path parsing
    - ✅ Created BackupManifest struct with validation
    - ✅ Created BackupDestination struct with validation
    - ✅ Created BackupDestObject struct with validation
    - ✅ Created RestoreJob struct with validation
    - ✅ Added comprehensive unit tests (11 tests)
    - ✅ Added to models/mod.rs exports
    - ✅ Code compiles successfully
    - _Requirements: 1.4, 7.6_

  - [x]* 2.3 Write unit tests for models
    - ✅ Test model creation and validation (11 tests passing)
    - ✅ Test serialization/deserialization (via sqlx derives)
    - ✅ Test constraints (validation methods)
    - _Requirements: 1.4_


- [x] 3. Backup Engine - Local Full Backups
  - [x] 3.1 Implement SQLite snapshot creation
    - ✅ Implemented VACUUM INTO method (preferred)
    - ✅ Implemented fallback WAL checkpoint + copy method
    - ✅ Added snapshot method detection and selection
    - ✅ Records snapshot_method in backup_job
    - _Requirements: 1.6_

  - [x] 3.2 Implement file scanning and manifest generation
    - ✅ Scans filesystem based on include_paths and exclude_patterns
    - ✅ Calculates SHA-256 checksums for each file
    - ✅ Generates manifest and saves to backup_manifests table
    - _Requirements: 1.4_

  - [x] 3.3 Implement archive creation
    - ✅ Creates ZIP archive with db/, files/, meta/ structure
    - ✅ Streams files into archive to handle large datasets
    - ✅ Generates backup.json metadata file
    - ✅ Calculates archive checksum (SHA-256)
    - _Requirements: 1.2, 1.5_

  - [x] 3.4 Implement BackupService.create_backup
    - ✅ Creates backup_job record with status 'pending'
    - ✅ Creates snapshot (database backups)
    - ✅ Scans files and generates manifest (file backups)
    - ✅ Creates archive with compression
    - ✅ Updates backup_job with completion status and metadata
    - ✅ Handles errors and records in backup_job
    - ✅ Supports 4 backup types: db_full, db_incremental, file, full
    - ✅ Added to services/mod.rs exports
    - ✅ Added zip and sha2 dependencies to Cargo.toml
    - ✅ Code compiles successfully
    - _Requirements: 1.1, 1.2, 1.7, 1.8_

  - [x] 3.5 Write property test for archive integrity

    - **Property 1: Backup Archive Integrity**
    - Generate random backup jobs
    - Verify stored checksum matches actual archive
    - **Validates: Requirements 1.5**

  - [x] 3.6 Write property test for manifest completeness

    - **Property 2: Manifest Completeness**
    - Generate random file sets
    - Create archives and verify manifest accuracy
    - **Validates: Requirements 1.4**

  - [x] 3.7 Write property test for database snapshot consistency

    - **Property 4: Database Snapshot Consistency**
    - Create snapshots under various conditions
    - Verify snapshots can be opened without corruption
    - **Validates: Requirements 1.6**

- [x] 4. Checkpoint - Basic Backup Working
  - ✅ Created backup handlers (create, list, get, delete, settings)
  - ✅ Full backup can be created via API
  - ✅ Archive contains database and/or files based on backup type
  - ✅ Manifest is accurate and stored in database
  - ✅ All code compiles successfully
  - ✅ Ready for manual testing
  - _Requirements: All_


- [x] 5. Incremental Backup Support
  - [x] 5.1 Implement backup chain management
    - ✅ Create backup_chain on first backup
    - ✅ Link subsequent backups to chain
    - ✅ Track incremental count and total size
    - ✅ 7 tests passing (chain creation, continuation, rotation, stats)
    - _Requirements: 3.1, 3.4_

  - [x] 5.2 Implement incremental file detection
    - ✅ Load previous backup manifest
    - ✅ Compare current file state to previous manifest
    - ✅ Identify added, modified, and deleted files
    - ✅ 4 tests passing (no previous backup, with modifications, manifest retrieval)
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 5.3 Implement incremental archive creation
    - ✅ Include only changed files in archive
    - ✅ Record deleted files in manifest
    - ✅ Include full database snapshot
    - ✅ 1 test passing (incremental manifest creation)
    - _Requirements: 3.2, 3.3_

  - [x] 5.4 Implement chain rotation logic
    - ✅ Check if chain has reached max incrementals
    - ✅ Automatically start new chain with base backup
    - ✅ 1 test passing (automatic chain rotation)
    - _Requirements: 3.4_

  - [x] 5.5 Write property test for incremental chain consistency

    - **Property 3: Incremental Chain Consistency**
    - Generate random file changes across backups
    - Verify applying chain produces correct final state
    - **Validates: Requirements 3.5**

- [x] 6. Retention Policies
  - [x] 6.1 Implement RetentionService
    - ✅ Implement find_deletable_backups with count and age policies
    - ✅ Implement chain integrity checking
    - ✅ Implement delete_backup with local file deletion
    - ✅ 3 tests passing (file retention, chain integrity, find deletable)
    - _Requirements: 5.1, 5.2, 5.4_

  - [x] 6.2 Implement retention enforcement
    - ✅ Trigger retention after each backup completion
    - ✅ Delete entire chains or preserve chain integrity
    - ✅ Update backup_job records for deleted backups
    - ✅ Enforce DB retention (7 daily, 4 weekly, 12 monthly)
    - ✅ Enforce file retention (keep last 2)
    - ✅ Enforce full retention (keep 12 monthly)
    - _Requirements: 5.1, 5.2, 5.5_

  - [x] 6.3 Write property test for retention policy enforcement

    - **Property 5: Retention Policy Enforcement**
    - Generate random backup sets
    - Verify count constraint satisfied after enforcement
    - **Validates: Requirements 5.1, 5.2**

  - [x] 6.4 Write property test for chain integrity after deletion

    - **Property 6: Chain Integrity After Deletion**
    - Generate chains and delete backups
    - Verify no orphaned incrementals remain
    - **Validates: Requirements 5.2**

- [x] 7. Checkpoint - Incremental Backups Working
  - ✅ Verified incremental backups are smaller than full backups (only changed files)
  - ✅ Verified chains are created and rotated correctly (13 tests passing)
  - ✅ Verified retention policies work (3 tests passing)
  - ✅ All 16 tests passing (100%)
  - _Requirements: All_


- [x] 8. Backup Administration UI
  - [x] 8.1 Create Backups page in Settings
    - Add route to Settings navigation
    - Create BackupsPage component with tabs
    - Implement Overview tab with summary cards
    - _Requirements: 8.1_

  - [x] 8.2 Implement Backups List tab
    - Display table of all backups with type, size, date, status
    - Add filters for type, status, date range
    - Add actions: download, restore, delete
    - Show chain relationships visually
    - _Requirements: 8.2_

  - [x] 8.3 Implement "Run Backup Now" functionality
    - Add button to trigger manual backup
    - Show progress modal with real-time status
    - Display success/error messages
    - _Requirements: 8.3_

  - [x] 8.4 Implement Settings tab
    - Create form for schedule configuration
    - Create form for retention policies
    - Create form for include/exclude paths
    - Add validation and save functionality
    - _Requirements: 8.4_

  - [x] 8.5 Implement backup download
    - Create endpoint to stream backup archive
    - Add download button with progress indicator
    - _Requirements: 8.7_

  - [x] 8.6 Implement backup deletion
    - Add confirmation dialog with impact warning
    - Delete local and remote copies
    - Update UI after deletion
    - _Requirements: 8.8_

  - [x] 8.7 Implement backup logs viewer
    - Display structured logs for each backup job
    - Add filtering and search
    - Show errors prominently
    - _Requirements: 8.6_

  - [x] 8.8 Write integration tests for Backups UI

    - Test backup list display
    - Test manual backup trigger
    - Test settings save
    - Test download and delete
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9. API Endpoints
  - [x] 9.1 Create backup read endpoints
    - GET /api/backups/overview
    - GET /api/backups/list
    - GET /api/backups/{backup_id}
    - GET /api/backups/jobs/{job_id}/logs
    - _Requirements: 8.1, 8.2, 8.6_

  - [x] 9.2 Create backup action endpoints
    - POST /api/backups/run
    - POST /api/backups/{backup_id}/download
    - DELETE /api/backups/{backup_id}
    - _Requirements: 8.3, 8.7, 8.8_

  - [x] 9.3 Create settings endpoints
    - GET /api/backups/settings
    - PUT /api/backups/settings
    - _Requirements: 8.4_

  - [x] 9.4 Add permission checks to all endpoints
    - Verify user has MANAGE_SETTINGS permission
    - Return 403 for unauthorized requests
    - _Requirements: 9.1_

  - [x] 9.5 Write property test for permission enforcement

    - **Property 13: Permission Enforcement**
    - Generate random user contexts
    - Verify non-admin requests return 403
    - **Validates: Requirements 9.1**

- [x] 10. Checkpoint - UI and API Complete
  - Verify all UI pages work correctly
  - Verify all API endpoints function
  - Verify permissions enforced
  - Ask the user if questions arise


- [x] 11. Backup Scheduler
  - [x] 11.1 Implement SchedulerService
    - Create background service that starts with FastAPI app
    - Read backup_settings and calculate next run time
    - Implement schedule calculation for daily/weekly/monthly
    - _Requirements: 2.1, 2.2_

  - [x] 11.2 Implement job execution
    - Check if backup job is already running
    - Skip execution if job running and log reason
    - Trigger BackupService.create_backup
    - Schedule next run after completion
    - _Requirements: 2.2, 2.3_

  - [x] 11.3 Implement failure handling
    - Retry failed backups once after 15 minutes
    - Alert administrators after second failure
    - Continue scheduling future backups
    - _Requirements: 2.4, 10.6_

  - [x] 11.4 Implement startup behavior
    - Check for missed scheduled backups on startup
    - Resume scheduler without requiring restart
    - _Requirements: 2.6_

  - [x] 11.5 Write property test for scheduler non-overlap

    - **Property 9: Scheduler Non-Overlap**
    - Simulate concurrent backup attempts
    - Verify only one backup runs at a time
    - **Validates: Requirements 2.3**

  - [x] 11.6 Write unit tests for schedule calculation

    - Test daily schedule calculation
    - Test weekly schedule calculation
    - Test monthly schedule calculation
    - Test missed schedule detection
    - _Requirements: 2.1, 2.2, 2.6_

- [x] 12. Google Drive Integration
  - [x] 12.1 Implement OAuth connection flow
    - Create /api/backups/destinations/gdrive/connect endpoint
    - Generate OAuth authorization URL
    - Handle OAuth callback
    - Store encrypted tokens in backup_destination
    - _Requirements: 4.1_

  - [x] 12.2 Implement DestinationService for Google Drive
    - Implement upload_backup with resumable upload
    - Implement list_remote_backups
    - Implement delete_remote_backup
    - Implement health_check for token validation
    - _Requirements: 4.2, 4.3, 4.4, 4.7_

  - [x] 12.3 Implement upload after backup completion
    - Trigger upload after successful backup
    - Record backup_destination_object on success
    - Handle upload failures gracefully
    - _Requirements: 4.2, 4.4, 4.5_

  - [x] 12.4 Implement remote retention enforcement
    - List remote backups after successful upload
    - Delete oldest backups exceeding retention count
    - Update backup_destination_object records
    - _Requirements: 4.3, 5.3, 5.6_

  - [x] 12.5 Implement Google Drive UI
    - Add Destinations tab to Backups page
    - Add "Connect Google Drive" button
    - Display connection status and last upload
    - Add configuration form for folder and retention
    - _Requirements: 8.5_

  - [x] 12.6 Write property test for upload idempotency

    - **Property 8: Remote Upload Idempotency**
    - Simulate multiple upload attempts
    - Verify only one remote object created
    - **Validates: Requirements 4.2**

  - [x] 12.7 Write property test for token encryption

    - **Property 12: OAuth Token Encryption**
    - Store tokens and verify encryption/permissions
    - **Validates: Requirements 9.2**

- [x] 13. Checkpoint - Scheduling and Google Drive Working
  - Verify scheduled backups run automatically
  - Verify Google Drive uploads work
  - Verify remote retention enforced
  - Ask the user if questions arise


- [x] 14. Restore Functionality
  - [x] 14.1 Implement RestoreService.validate_archive
    - Extract checksum from archive metadata
    - Calculate actual archive checksum
    - Compare and return validation result
    - _Requirements: 6.1_

  - [x] 14.2 Implement pre-restore snapshot creation
    - Create full backup before restore
    - Record pre_restore_snapshot_id in restore_job
    - _Requirements: 6.2_

  - [x] 14.3 Implement database restore
    - Extract database to temporary location
    - Validate extracted database can be opened
    - Atomically replace active database (rename)
    - _Requirements: 6.3_

  - [x] 14.4 Implement file restore
    - Extract files from archive
    - Overwrite existing files according to manifest
    - Apply deleted files list if strict mode enabled
    - _Requirements: 6.4, 6.5_

  - [x] 14.5 Implement RestoreService.restore_backup
    - Create restore_job record
    - Validate archive checksum
    - Create pre-restore snapshot (if enabled)
    - Restore database
    - Restore files
    - Update restore_job with completion status
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [x] 14.6 Implement incremental chain restore
    - Identify all backups in chain up to target
    - Apply base backup first
    - Apply each incremental in sequence
    - _Requirements: 6.8_

  - [x] 14.7 Implement restore error handling
    - Preserve pre-restore snapshot on failure
    - Provide rollback instructions
    - Log detailed errors
    - _Requirements: 6.7_

  - [x] 14.8 Write property test for restore atomicity

    - **Property 7: Restore Atomicity**
    - Simulate restore failures at various points
    - Verify system state is either restored or unchanged
    - **Validates: Requirements 6.3, 6.4**

  - [x] 14.9 Write property test for checksum validation

    - **Property 10: Checksum Validation Before Restore**
    - Attempt restores with valid and invalid checksums
    - Verify validation occurs before any changes
    - **Validates: Requirements 6.1**

  - [x] 14.10 Write property test for pre-restore snapshot

    - **Property 11: Pre-Restore Snapshot Creation**
    - Perform restores with snapshot enabled
    - Verify snapshot created before restore actions
    - **Validates: Requirements 6.2**

- [x] 15. Restore UI
  - [x] 15.1 Implement restore confirmation dialog
    - Show backup details and restore impact
    - Add options for strict delete and pre-restore snapshot
    - Add confirmation checkbox
    - _Requirements: 8.2_

  - [x] 15.2 Implement restore progress display
    - Show real-time progress during restore
    - Display logs and status updates
    - Show success/error messages
    - _Requirements: 8.2_

  - [x] 15.3 Create restore API endpoints
    - POST /api/backups/{backup_id}/restore
    - GET /api/backups/restore-jobs/{job_id}
    - GET /api/backups/restore-jobs/{job_id}/rollback-instructions
    - GET /api/backups/restore-jobs (list all)
    - _Requirements: 6.1, 6.6_

  - [x] 15.4 Write integration tests for restore

    - Test restore from full backup
    - Test restore from incremental chain
    - Test restore with pre-restore snapshot
    - Test restore failure handling
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.8_

- [x] 16. Checkpoint - Restore Working
  - Verify restore from full backup works
  - Verify restore from incremental chain works
  - Verify pre-restore snapshot created
  - Ask the user if questions arise


- [x] 17. Fresh Install Restore
  - [x] 17.1 Implement fresh install detection
    - Check if database is missing or empty on startup
    - Display restore wizard if fresh install detected
    - _Requirements: 7.1_

  - [x] 17.2 Implement upload-and-restore endpoint
    - POST /api/backups/upload-and-restore (multipart upload)
    - Validate uploaded archive
    - Apply restore using RestoreService
    - _Requirements: 7.2, 7.3_

  - [x] 17.3 Create fresh install restore wizard UI
    - Display welcome screen with restore option
    - Add file upload component
    - Show validation and restore progress
    - Handle errors with clear messages
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [x] 17.4 Write integration tests for fresh install restore

    - Test upload and restore flow
    - Test validation of uploaded archives
    - Test error handling for corrupted archives
    - _Requirements: 7.2, 7.3, 7.5_
    - Apply restore using RestoreService
    - _Requirements: 7.2, 7.3_

  - [x] 17.3 Create fresh install restore wizard UI ✅ DONE
    - ✅ File: `frontend/src/setup/pages/FreshInstallWizard.tsx`
    - ✅ Display welcome screen with restore option
    - ✅ Add file upload component
    - ✅ Show validation and restore progress
    - ✅ Handle errors with clear messages
    - ✅ Route: `/fresh-install` in App.tsx
    - _Requirements: 7.1, 7.2, 7.4, 7.5_

  - [x] 17.4 Write integration tests for fresh install restore ✅ DONE
    - ✅ Test in `frontend/src/auth/pages/LoginPage.integration.test.tsx`
    - Test upload and restore flow
    - Test validation of uploaded archives
    - Test error handling for corrupted archives
    - _Requirements: 7.2, 7.3, 7.5_

- [x] 18. Audit Logging
  - [x] 18.1 Implement audit logging for backup operations
    - Log backup creation with user_id and station_id
    - Log backup deletion with user_id and reason
    - Log settings changes with user_id and before/after values
    - _Requirements: 9.4_

  - [x] 18.2 Implement audit logging for restore operations
    - Log restore initiation with user_id and backup_id
    - Log restore completion with status
    - _Requirements: 9.4_

  - [x] 18.3 Implement audit logging for destination operations
    - Log Google Drive connection with user_id
    - Log destination configuration changes
    - _Requirements: 9.4_

  - [x] 18.4 Write property test for audit logging completeness

    - **Property 14: Audit Logging Completeness**
    - Perform random backup/restore operations
    - Verify all operations have audit log entries
    - **Validates: Requirements 9.4**

- [x] 19. Error Handling and Monitoring
  - [x] 19.1 Implement disk space validation
    - Check available disk space before backup
    - Require 2x estimated backup size
    - Prevent backup and alert if insufficient
    - _Requirements: 10.1_

  - [x] 19.2 Implement backup failure alerts
    - Send alerts to administrators on backup failure
    - Include error details and suggested actions
    - _Requirements: 10.2_

  - [x] 19.3 Implement upload failure handling
    - Keep local backup on upload failure
    - Show partial success status in UI
    - Retry upload on next scheduled backup
    - _Requirements: 10.3_

  - [x] 19.4 Implement token expiration handling
    - Detect expired Google Drive tokens
    - Disable destination and alert administrators
    - Provide reconnection instructions
    - _Requirements: 10.4_

  - [x] 19.5 Implement corruption detection
    - Validate checksums during restore
    - Detect and report corrupted archives
    - Suggest remediation steps
    - _Requirements: 10.5_

  - [x] 19.6 Implement scheduler error handling
    - Log scheduler errors
    - Continue scheduling future backups
    - Alert on repeated failures
    - _Requirements: 10.6_

  - [x] 19.7 Implement restore failure recovery
    - Preserve pre-restore snapshot on failure
    - Provide rollback instructions
    - Log detailed error information
    - _Requirements: 10.7_

  - [x] 19.8 Write property test for disk space validation

    - **Property 15: Disk Space Validation**
    - Simulate low disk space scenarios
    - Verify backups prevented when space insufficient
    - **Validates: Requirements 10.1**

- [x] 20. Checkpoint - Error Handling Complete
  - Verify disk space validation works
  - Verify alerts sent on failures
  - Verify graceful degradation
  - Ask the user if questions arise


- [x] 21. Security Hardening
  - [x] 21.1 Implement archive file permissions
    - Set backup archives to 0600 (owner read/write only)
    - Verify permissions after archive creation
    - _Requirements: 9.3_

  - [x] 21.2 Implement Google Drive token encryption
    - Encrypt OAuth tokens before storing in database
    - Use application encryption key
    - Decrypt tokens only when needed for API calls
    - _Requirements: 9.2_

  - [x] 21.3 Implement secure archive downloads
    - Generate time-limited download tokens
    - Validate tokens before streaming archives
    - Prevent public URL access to archives
    - _Requirements: 9.3_

  - [x] 21.4 Add security documentation
    - Document backup security best practices
    - Document token encryption mechanism
    - Document file permission requirements
    - _Requirements: 9.2, 9.3_

  - [x] 21.5 Write security tests

    - Test file permissions on created archives
    - Test token encryption/decryption
    - Test unauthorized access prevention
    - _Requirements: 9.2, 9.3_

- [x] 22. Performance Optimization
  - [x] 22.1 Implement streaming archive creation
    - Stream files into ZIP without loading entire archive in memory
    - Use chunked reading for large files
    - _Requirements: 1.1_

  - [x] 22.2 Implement parallel file scanning
    - Scan multiple directories concurrently
    - Use thread pool for checksum calculation
    - _Requirements: 1.4_

  - [x] 22.3 Implement resumable Google Drive uploads
    - Use Google Drive resumable upload protocol
    - Handle network interruptions gracefully
    - Resume from last successful chunk
    - _Requirements: 4.3_

  - [x] 22.4 Add performance monitoring
    - Track backup creation time
    - Track upload time
    - Track restore time
    - Log performance metrics
    - _Requirements: 1.1_

  - [x] 22.5 Write performance tests

    - Test backup speed with various dataset sizes
    - Test restore speed
    - Test incremental backup efficiency
    - Verify targets met (< 5 min for 10GB backup)
    - _Requirements: 1.1_

- [x] 23. Documentation
  - [x] 23.1 Create user documentation
    - Write backup configuration guide
    - Write Google Drive connection guide
    - Write restore procedure guide
    - Write fresh install restore guide
    - _Requirements: 8.4, 8.5_

  - [x] 23.2 Create troubleshooting guide
    - Document common errors and solutions
    - Document disk space issues
    - Document token expiration handling
    - Document corrupted archive recovery
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 23.3 Create API documentation
    - Document all backup API endpoints
    - Include request/response examples
    - Document error codes and messages
    - _Requirements: All API endpoints_

  - [x] 23.4 Update architecture documentation
    - Add backup system to architecture overview
    - Document data flow diagrams
    - Document component interactions
    - _Requirements: All_

- [x] 24. Integration Testing
  - [x] 24.1 Write end-to-end backup flow test

    - Create full backup
    - Verify archive created and valid
    - Verify database record accurate
    - Verify manifest correct
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.7_


  - [x] 24.2 Write end-to-end restore flow test

    - Create backup
    - Modify system state
    - Restore backup
    - Verify system state matches backup
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [x] 24.3 Write end-to-end incremental chain test

    - Create base backup
    - Make file changes
    - Create incremental backups
    - Restore from chain
    - Verify final state correct
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 6.8_


  - [x] 24.4 Write end-to-end Google Drive sync test

    - Connect Google Drive (mock OAuth)
    - Create backup
    - Verify upload to Drive
    - Verify remote retention enforced
    - _Requirements: 4.1, 4.2, 4.3, 4.4_


  - [x] 24.5 Write end-to-end scheduler test

    - Configure schedule
    - Wait for scheduled time (or mock time)
    - Verify backup created
    - Verify next schedule calculated
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 25. Final Integration and Polish
  - [x] 25.1 Integrate with existing navigation
    - Add Backups to Settings menu
    - Add permission checks to navigation
    - _Requirements: 8.1, 9.1_

  - [x] 25.2 Add monitoring metrics
    - Expose last backup timestamp metric
    - Expose backup failure count metric
    - Expose storage usage metric
    - Expose Google Drive sync status metric
    - _Requirements: 10.2_

  - [x] 25.3 Polish UI
    - Ensure consistent styling with existing Settings pages
    - Add loading states and progress indicators
    - Add helpful tooltips and documentation links
    - Test responsive layout
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 25.4 Review and update configuration
    - Add backup configuration to .env.example
    - Document all environment variables
    - Set sensible defaults
    - _Requirements: All_

  - [x] 25.5 Create deployment checklist
    - Database migration steps
    - Configuration requirements
    - Permission setup
    - Initial backup creation
    - _Requirements: All_

- [x] 26. Final Checkpoint - Backup Module Complete
  - Verify all features work end-to-end
  - Verify all tests pass
  - Verify documentation complete
  - Verify security hardening in place
  - Verify performance targets met
  - Ask the user if questions arise or if ready to deploy

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Integration tests validate end-to-end flows
- All backup operations must be safe under active POS usage
- All operations must integrate with existing auth, settings, and navigation
- Google Drive is the primary off-site destination; other destinations can be added later
- Archive format is ZIP with structured directories for easy inspection
- Database snapshots use VACUUM INTO for consistency under load
