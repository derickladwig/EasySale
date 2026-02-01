# Authentication & Setup Wizard Analysis

## Issue Summary

User reported login issues after completing the setup wizard. The system appears to be creating duplicate admin accounts or having confusion between the default seeded admin and the wizard-created admin.

## Current Authentication Flow

### 1. Database Migrations

**Migration 001** (`backend/migrations/001_initial_schema.sql`):
- Seeds default admin user: `admin` / `admin123`
- User ID: `user-admin-001`
- Password hash: `$2b$12$2UrDfkRjiqBvTeTP0BZkJOPW3mApbAA10eZuCU40kgJ9lbTEt7eE2`

**Migration 007** (`backend/migrations/007_seed_default_admin.sql`):
- Seeds ANOTHER admin user: `admin` / `admin123`
- User ID: `admin-default`
- Password hash: `$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYzpLhJ6VpW`

**PROBLEM**: Two different admin users with same username but different IDs and password hashes!

### 2. Setup Wizard Flow

**Frontend** (`frontend/src/admin/pages/SetupWizardPage.tsx`):
- Step 1: Admin account creation
- Auto-completes if user is already authenticated
- Calls `/api/users/first-admin` endpoint

**Backend** (`backend/crates/server/src/handlers/user_handlers.rs`):
- `create_first_admin()` endpoint
- Checks if ANY admin exists: `SELECT COUNT(*) FROM users WHERE role = 'admin' AND is_active = 1`
- Returns 409 Conflict if admin already exists
- **PROBLEM**: Will always fail because migrations already seeded admin users!

### 3. Login Flow

**Backend** (`backend/crates/server/src/handlers/auth.rs`):
- Queries: `SELECT ... FROM users WHERE username = ? AND is_active = 1 AND tenant_id = ?`
- **PROBLEM**: If multiple users with same username exist, SQLite returns the first match
- Which admin gets returned depends on insertion order

## Root Causes

1. **Duplicate Admin Seeding**: Two migrations create admin users with same username
2. **Password Hash Mismatch**: The two admin users have different password hashes
3. **Setup Wizard Conflict**: Wizard can't create admin because migrations already did
4. **Tenant ID Confusion**: Migration 001 doesn't set tenant_id, Migration 007 does

## Solutions Required

### Fix 1: Remove Duplicate Admin Seeding

**Action**: Keep only ONE admin seed in migrations
- Remove the duplicate from Migration 001 OR Migration 007
- Ensure consistent password hash
- Ensure tenant_id is set correctly

### Fix 2: Update Setup Wizard Logic

**Option A**: Skip admin creation if default admin exists
- Auto-login with default credentials
- Show password change prompt

**Option B**: Allow wizard to update default admin
- Check for default admin by ID
- Update password instead of creating new user

### Fix 3: Ensure Consistent Password Hash

The password `admin123` should hash to the SAME value every time.
Current hashes are DIFFERENT, suggesting:
- Different bcrypt cost factors
- Different salt generation
- Or they're actually different passwords

**Verification needed**: Test both hashes against `admin123`

### Fix 4: Update Batch Files

The batch files are generally well-structured but need:
- Ensure database migrations run on first start
- Add health check for authentication endpoint
- Document the default credentials clearly

## Recommended Implementation

### Step 1: Clean Up Migrations

Remove duplicate admin from Migration 001, keep only Migration 007:

```sql
-- backend/migrations/001_initial_schema.sql
-- REMOVE the admin user INSERT statements
-- Keep only the table definitions
```

### Step 2: Update Setup Wizard

Modify `AdminStepContent.tsx` to handle existing admin:

```typescript
// Check if default admin exists
const response = await apiClient.get('/api/users/check-default-admin');
if (response.exists) {
  // Show option to use default or create new
  // Or auto-skip this step
}
```

### Step 3: Add Backend Endpoint

```rust
// backend/crates/server/src/handlers/user_handlers.rs
pub async fn check_default_admin(pool: web::Data<SqlitePool>) -> Result<HttpResponse> {
    let exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM users WHERE id = 'admin-default' AND is_active = 1"
    )
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0) > 0;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "exists": exists,
        "username": if exists { Some("admin") } else { None }
    })))
}
```

### Step 4: Update Documentation

- README.md: Clarify default credentials
- Setup wizard: Show default credentials if they exist
- First-run guide: Explain password change requirement

## Testing Checklist

- [ ] Fresh install: Can login with admin/admin123
- [ ] Setup wizard: Doesn't fail on admin step
- [ ] Setup wizard: Can skip admin creation if default exists
- [ ] Login: Works with correct password
- [ ] Login: Fails with incorrect password
- [ ] Password change: Works after first login
- [ ] Batch files: Run without errors
- [ ] Health check: Returns 200 OK

## Files to Modify

1. `backend/migrations/001_initial_schema.sql` - Remove duplicate admin
2. `backend/migrations/007_seed_default_admin.sql` - Verify password hash
3. `frontend/src/admin/components/wizard/AdminStepContent.tsx` - Handle existing admin
4. `backend/crates/server/src/handlers/user_handlers.rs` - Add check endpoint
5. `backend/crates/server/src/main.rs` - Register new endpoint
6. `README.md` - Update credentials documentation
7. `setup.sh` - Ensure migrations run
8. Batch files - Already up to date, no changes needed

## Priority

**P0 - Critical**: Fix duplicate admin seeding (causes login failures)
**P1 - High**: Update setup wizard to handle existing admin
**P2 - Medium**: Add password change prompt on first login
**P3 - Low**: Improve documentation

---

**Status**: Analysis complete, ready for implementation
**Next Step**: Remove duplicate admin from Migration 001
