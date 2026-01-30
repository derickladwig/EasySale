# Backup & Sync Integration Plan

**Date:** 2026-01-10
**Purpose:** Document integration points with existing CAPS POS architecture

## Existing Architecture Review

### Backend Structure (Rust)
- **Framework:** actix-web
- **Database:** SQLite with sqlx
- **Migrations:** Numbered SQL files in `backend/rust/migrations/`
- **Models:** Structs in `backend/rust/src/models/` with sqlx derives
- **Handlers:** API endpoints in `backend/rust/src/handlers/`
- **Services:** Business logic in `backend/rust/src/services/`
- **Middleware:** Auth and context in `backend/rust/src/middleware/`

### Existing Migrations
- 001_initial_schema.sql - Users, sessions
- 002_sales_customer_management.sql - Customers, layaways, work orders, etc.
- 003_offline_sync.sql - Sync queue, sync log, sync state
- 004_products_and_fitment.sql - Products and fitment data
- 005_enhance_user_model.sql - User model enhancements
- 006_add_user_store_station.sql - Store and station fields
- 006_seed_default_admin.sql - Default admin user

**Next available migration number:** 007

### Existing Patterns

#### Model Pattern
```rust
// backend/rust/src/models/customer.rs
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Customer {
    pub id: String,
    pub name: String,
    // ... fields
    pub created_at: String,
    pub updated_at: String,
}

impl Customer {
    pub fn validate(&self) -> Result<(), String> {
        // Validation logic
    }
}
```

#### Handler Pattern
```rust
// backend/rust/src/handlers/customer.rs
pub async fn create_customer(
    pool: web::Data<SqlitePool>,
    ctx: web::ReqData<RequestContext>,
    customer: web::Json<CreateCustomerRequest>,
) -> Result<HttpResponse, actix_web::Error> {
    // Handler logic
}
```

#### Service Pattern
```rust
// backend/rust/src/services/audit_logger.rs
pub struct AuditLogger {
    pool: SqlitePool,
}

impl AuditLogger {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
    
    pub async fn log_event(&self, event: AuditEvent) -> Result<(), sqlx::Error> {
        // Service logic
    }
}
```

### Frontend Structure
- **Framework:** React + TypeScript
- **Routing:** React Router
- **State:** React hooks (useState, useEffect)
- **API Client:** Fetch with error handling
- **Components:** Atomic design (atoms, molecules, organisms)

### Existing Settings UI
- Location: `frontend/src/features/admin/pages/AdminPage.tsx`
- Structure: Tabs for different settings sections
- Pattern: Form with save button, toast notifications

## Integration Points

### 1. Database Schema (Migration 007)

**File to create:** `backend/rust/migrations/007_backup_subsystem.sql`

**Tables to add:**
- `backup_jobs` - Track backup executions
- `backup_settings` - Configuration for schedules and retention
- `backup_manifests` - File checksums and metadata
- `backup_destinations` - Google Drive OAuth tokens (encrypted)
- `backup_dest_objects` - Remote file mapping
- `restore_jobs` - Track restore operations

**Integration:** Follows existing migration pattern, will be applied automatically on startup

### 2. Models

**File to create:** `backend/rust/src/models/backup.rs`

**Structs to add:**
- `BackupJob` - Backup execution record
- `BackupSettings` - Configuration
- `BackupManifest` - File metadata
- `BackupDestination` - OAuth credentials
- `BackupDestObject` - Remote file mapping
- `RestoreJob` - Restore execution record

**Integration:** 
- Add `pub mod backup;` to `backend/rust/src/models/mod.rs`
- Follow existing model pattern with sqlx derives
- Add validation methods

### 3. Services

**Files to create:**
- `backend/rust/src/services/backup_service.rs` - Core backup logic
- `backend/rust/src/services/retention_service.rs` - Retention policy enforcement
- `backend/rust/src/services/restore_service.rs` - Restore logic
- `backend/rust/src/services/google_drive_service.rs` - OAuth and upload
- `backend/rust/src/services/backup_scheduler.rs` - Cron scheduling

**Integration:**
- Add modules to `backend/rust/src/services/mod.rs`
- Initialize services in `main.rs` with SqlitePool
- Pass services to handlers via web::Data

### 4. Handlers

**File to create:** `backend/rust/src/handlers/backup.rs`

**Endpoints to add:**
- `POST /api/backups/create` - Manual backup trigger
- `GET /api/backups` - List backups
- `GET /api/backups/:id` - Get backup details
- `DELETE /api/backups/:id` - Delete backup
- `POST /api/backups/:id/restore` - Restore from backup
- `GET /api/backups/settings` - Get backup settings
- `PUT /api/backups/settings` - Update backup settings
- `POST /api/backups/destinations` - Add Google Drive destination
- `GET /api/backups/destinations` - List destinations
- `DELETE /api/backups/destinations/:id` - Remove destination

**Integration:**
- Add `pub mod backup;` to `backend/rust/src/handlers/mod.rs`
- Register routes in `main.rs` with permission middleware
- Follow existing handler pattern with RequestContext

### 5. Frontend Components

**Files to create:**
- `frontend/src/features/admin/components/BackupSettings.tsx` - Settings form
- `frontend/src/features/admin/components/BackupList.tsx` - Backup history
- `frontend/src/features/admin/components/BackupDestinations.tsx` - Google Drive config
- `frontend/src/features/admin/components/RestoreDialog.tsx` - Restore confirmation

**Integration:**
- Add to existing AdminPage.tsx as new tab
- Use existing design system components (Button, Input, FormField, DataTable)
- Follow existing API client pattern
- Use toast notifications for feedback

### 6. Scheduling

**Integration with main.rs:**
```rust
// In main.rs, after database initialization
let backup_scheduler = BackupScheduler::new(pool.clone());
backup_scheduler.start().await?;
```

**Crate to add:** `tokio-cron-scheduler = "0.9"`

### 7. Google Drive OAuth

**Crates to add:**
- `oauth2 = "4.4"`
- `reqwest = { version = "0.11", features = ["json", "multipart"] }`

**OAuth Flow:**
1. Admin clicks "Connect Google Drive" in UI
2. Backend generates OAuth URL, returns to frontend
3. Frontend opens OAuth URL in new window
4. User authorizes, Google redirects to callback URL
5. Backend exchanges code for tokens, stores encrypted refresh token
6. Subsequent uploads use refresh token to get access tokens

### 8. File Locations

**Uploads/Images location:** `data/uploads/products/`
**Backup storage location:** `data/backups/`
**Database location:** `data/pos.db`

**Integration:** Read from environment variables or config

## Files to Create

### Backend (Rust)
1. `backend/rust/migrations/007_backup_subsystem.sql`
2. `backend/rust/src/models/backup.rs`
3. `backend/rust/src/services/backup_service.rs`
4. `backend/rust/src/services/retention_service.rs`
5. `backend/rust/src/services/restore_service.rs`
6. `backend/rust/src/services/google_drive_service.rs`
7. `backend/rust/src/services/backup_scheduler.rs`
8. `backend/rust/src/handlers/backup.rs`

### Frontend (TypeScript/React)
9. `frontend/src/features/admin/components/BackupSettings.tsx`
10. `frontend/src/features/admin/components/BackupList.tsx`
11. `frontend/src/features/admin/components/BackupDestinations.tsx`
12. `frontend/src/features/admin/components/RestoreDialog.tsx`

### Tests
13. `backend/rust/src/models/backup.rs` (unit tests inline)
14. `backend/rust/src/services/backup_service.rs` (unit tests inline)
15. `backend/rust/src/handlers/backup.rs` (integration tests inline)

### Documentation
16. `docs/backup-restore-guide.md` - User guide for backup and restore

## Dependencies to Add

### Cargo.toml
```toml
[dependencies]
tokio-cron-scheduler = "0.9"
oauth2 = "4.4"
zip = "0.6"  # For creating ZIP archives
sha2 = "0.10"  # For checksums
```

### package.json
No new dependencies needed (using existing React, design system)

## Implementation Order

1. **Task 1:** Discovery and Integration Planning ✅ (this document)
2. **Task 2:** Database Schema and Migrations
3. **Task 3:** Backup Engine - Local Full Backups
4. **Task 4:** Checkpoint - Basic Backup Working
5. **Task 5:** Incremental Backup Support
6. **Task 6:** Retention Policies
7. **Task 7:** Checkpoint - Local Backup Complete
8. **Task 8:** Google Drive OAuth Integration
9. **Task 9:** Automatic Upload to Google Drive
10. **Task 10:** Checkpoint - Cloud Backup Working
11. **Task 11:** Restore Functionality
12. **Task 12:** Backup Scheduling
13. **Task 13:** Frontend UI
14. **Task 14:** Checkpoint - UI Complete
15. **Task 15:** Error Handling and Hardening
16. **Task 16:** Documentation
17. **Task 17:** Final Testing
18. **Task 18:** Final Checkpoint - Backup & Sync Complete

## Security Considerations

1. **OAuth Tokens:** Encrypt refresh tokens before storing in database
2. **Permissions:** Require MANAGE_SETTINGS permission for all backup operations
3. **File Access:** Validate all file paths to prevent directory traversal
4. **Archive Integrity:** Verify checksums before restore
5. **Audit Logging:** Log all backup and restore operations

## Performance Considerations

1. **Database Snapshots:** Use VACUUM INTO for consistent snapshots
2. **File Scanning:** Stream files to avoid loading entire archive in memory
3. **Compression:** Use gzip compression for database backups
4. **Scheduling:** Run backups during low-traffic hours (3 AM for weekly, 11:59 PM for daily)
5. **Incremental Backups:** Only backup changed files to reduce backup time

## Testing Strategy

1. **Unit Tests:** Test models, validation, and utility functions
2. **Integration Tests:** Test backup creation, restore, and scheduling
3. **Property Tests:** Test archive integrity, manifest completeness, chain consistency
4. **Manual Testing:** Test OAuth flow, UI interactions, error scenarios

## Rollout Plan

1. **Phase 1:** Local backup functionality (Tasks 2-7)
2. **Phase 2:** Google Drive integration (Tasks 8-10)
3. **Phase 3:** Restore and scheduling (Tasks 11-12)
4. **Phase 4:** UI and documentation (Tasks 13-14)
5. **Phase 5:** Hardening and testing (Tasks 15-18)

## Success Criteria

- ✅ Hourly incremental database backups complete in < 2 minutes
- ✅ Daily full database backups complete in < 5 minutes
- ✅ Weekly file backups complete in < 10 minutes
- ✅ Backups automatically upload to Google Drive
- ✅ Retention policies automatically delete old backups
- ✅ Restore functionality works for all backup types
- ✅ UI provides clear status and controls
- ✅ All tests passing
- ✅ Documentation complete

---

**Status:** ✅ Integration Plan Complete
**Next Task:** Task 2 - Database Schema and Migrations
