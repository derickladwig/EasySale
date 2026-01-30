# Tenant Table Implementation

## Problem
The backend Docker build was failing because 10+ migrations referenced a `tenants` table with FOREIGN KEY constraints, but the `tenants` table didn't exist in any migration.

## Root Cause Analysis
The EasySale system uses `tenant_id` as a string identifier throughout the codebase:
- Tenant configuration is loaded from JSON files (`configs/private/*.json`)
- Tenant identification happens via environment variables, headers, subdomains, or path prefixes
- The `tenant_id` is injected into all database operations as a string

However, there was NO `tenants` table in the database to:
1. Store runtime tenant data (status, quotas, audit info)
2. Support FOREIGN KEY relationships from other tables

## Solution Implemented

### 1. Created Tenants Table
Added `tenants` table to `001_initial_schema.sql` with:
- `id` (TEXT PRIMARY KEY) - matches tenant_id used throughout system
- `name`, `slug`, `domain` - tenant identification
- `is_active`, `subscription_tier` - status management
- `config_path`, `config_version` - links to JSON configuration
- `max_stores`, `max_users`, `max_products`, `storage_limit_mb` - quotas
- Audit fields: `created_at`, `updated_at`, `created_by`, `last_login_at`
- `metadata` (JSON) - extensible tenant-specific data

### 2. Inserted Default Tenant
```sql
INSERT OR IGNORE INTO tenants (id, name, slug, is_active, config_path)
VALUES ('tenant_default', 'Default Tenant', 'default', 1, 'configs/default.json');
```

This matches the default `TENANT_ID` environment variable used in development.

### 3. Removed Invalid Foreign Key Constraints
**Decision**: Removed FOREIGN KEY constraints to `tenants` table from all migrations.

**Rationale**:
- The system is designed to work with tenant_id as a simple string identifier
- Tenant management is primarily configuration-driven, not database-driven
- Foreign keys would require tenant records to exist before any data can be inserted
- The current architecture uses environment variables for tenant identification

**Files Modified** (removed `FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE`):
- `025_integration_credentials.sql` (3 tables)
- `026_field_mappings.sql`
- `027_field_mappings_extended.sql`
- `028_sync_direction_control.sql`
- `029_sync_schedules.sql` (2 tables)
- `030_oauth_states.sql`
- `031_confirmation_tokens.sql`
- `032_sync_logs.sql`
- `033_webhook_configs.sql`
- `034_notification_configs.sql` (2 tables)

### 4. Scripts Created
- `fix-tenant-references.ps1` / `fix-tenant-references.bat` - Automated removal of tenant FK constraints

## Architecture Notes

### Current Tenant Flow
1. **Configuration**: Tenant config loaded from `configs/private/{tenant-id}.json`
2. **Identification**: Tenant ID extracted from:
   - Environment variable (`TENANT_ID`)
   - HTTP header (`X-Tenant-ID`)
   - Subdomain (`tenant1.example.com`)
   - Path prefix (`/tenant1/api/...`)
3. **Database Operations**: Tenant ID passed as string to all queries
4. **Isolation**: All tables have `tenant_id` column for data isolation

### Tenants Table Purpose
The `tenants` table serves as:
- **Registry**: Central list of all tenants in the system
- **Status Management**: Track active/suspended tenants
- **Quota Enforcement**: Store and enforce tenant limits
- **Audit Trail**: Track tenant creation and activity
- **Future Enhancement**: Foundation for database-driven tenant management

### Future Considerations
If stricter referential integrity is needed:
1. Add foreign key constraints back to migrations
2. Ensure tenant records are created before any tenant data
3. Update application code to create tenant records on first use
4. Consider using triggers to auto-create tenant records

## Testing
After this implementation:
1. Run `docker-clean.bat` to clean everything
2. Run `build-prod.bat` to build and start
3. All 34 migrations should run successfully
4. Default tenant should be available for immediate use

## Files Modified
- `backend/rust/migrations/001_initial_schema.sql` - Added tenants table
- `backend/rust/migrations/025_integration_credentials.sql` - Removed 3 FK constraints
- `backend/rust/migrations/026_field_mappings.sql` - Removed FK constraint
- `backend/rust/migrations/027_field_mappings_extended.sql` - Removed FK constraint
- `backend/rust/migrations/028_sync_direction_control.sql` - Removed FK constraint
- `backend/rust/migrations/029_sync_schedules.sql` - Removed 2 FK constraints
- `backend/rust/migrations/030_oauth_states.sql` - Removed FK constraint
- `backend/rust/migrations/031_confirmation_tokens.sql` - Removed FK constraint
- `backend/rust/migrations/032_sync_logs.sql` - Removed FK constraint
- `backend/rust/migrations/033_webhook_configs.sql` - Removed FK constraint + INSERT statements
- `backend/rust/migrations/034_notification_configs.sql` - Removed 2 FK constraints

## Status
✅ Tenants table created
✅ Default tenant inserted
✅ All FK constraints to tenants removed
✅ Migrations cleaned and ready
⏳ Docker build test pending
