# Migration 010 SQL Syntax Fix - January 13, 2026

## Problem
Backend crashes on startup with:
```
SQLite error: (code: 1) incomplete input
statement 8
thread 'main' panicked at src/main.rs:54:10
message: Failed to run database migrations
```

## Root Causes

### 1. SQL Trigger Syntax Error
**File**: `backend/rust/migrations/010_extend_products_table.sql`

The triggers used `SELECT CASE ... WHEN ... THEN RAISE(...) END;` syntax, which is incomplete in SQLite. SQLite requires either:
- A complete CASE expression with all branches
- Or a simpler `SELECT RAISE(...) WHERE condition` syntax

**Before** (Incorrect):
```sql
CREATE TRIGGER IF NOT EXISTS fk_products_parent_id_insert
BEFORE INSERT ON products
WHEN NEW.parent_id IS NOT NULL
BEGIN
    SELECT CASE
        WHEN (SELECT id FROM products WHERE id = NEW.parent_id) IS NULL
        THEN RAISE(ABORT, 'Foreign key constraint failed')
    END;
END;
```

**After** (Correct):
```sql
CREATE TRIGGER IF NOT EXISTS fk_products_parent_id_insert
BEFORE INSERT ON products
WHEN NEW.parent_id IS NOT NULL
BEGIN
    SELECT RAISE(ABORT, 'Foreign key constraint failed: parent_id must reference existing product')
    WHERE (SELECT id FROM products WHERE id = NEW.parent_id) IS NULL;
END;
```

### 2. Panic on Migration Failure
**File**: `backend/rust/src/main.rs` (Line 54)

The code used `.expect()` which panics on error instead of logging and exiting gracefully.

**Before** (Panics):
```rust
db::migrations::run_migrations(&pool)
    .await
    .expect("Failed to run database migrations");
```

**After** (Graceful):
```rust
if let Err(e) = db::migrations::run_migrations(&pool).await {
    tracing::error!("Failed to run database migrations: {}", e);
    tracing::error!("Please check your migration files for syntax errors");
    std::process::exit(1);
}
```

## Changes Made

### 1. Fixed All Three Triggers
- `fk_products_parent_id_insert` - Validates parent_id exists
- `fk_products_parent_id_update` - Validates parent_id on update
- `prevent_variant_as_parent` - Prevents circular relationships

All now use the simpler `SELECT RAISE(...) WHERE condition` syntax.

### 2. Improved Error Handling
- Database pool initialization: Match instead of expect
- Migration execution: Match with detailed error logging
- Exit code 1 instead of panic (cleaner Docker logs)

## Testing

### Verify SQL Syntax
```bash
# Test the migration file directly
sqlite3 test.db < backend/rust/migrations/010_extend_products_table.sql
```

### Verify Backend Starts
```bash
# Development
docker-compose -p EasySale up backend

# Production
docker build -t EasySale-backend:latest -f backend/rust/Dockerfile backend/rust
docker run --rm EasySale-backend:latest
```

### Expected Output
```
[INFO] Running migration: 010_extend_products_table.sql
[INFO] Migration 010 completed successfully!
[INFO] Database connection pool initialized
[INFO] Starting server on 0.0.0.0:8923
```

## Why This Happened

1. **SQLite CASE Syntax**: SQLite's CASE in triggers requires all branches (WHEN/ELSE/END), not just WHEN/THEN
2. **Incomplete Testing**: Migration wasn't tested with actual SQLite before commit
3. **Panic Culture**: Using `.expect()` everywhere makes debugging harder

## Prevention

### 1. Test Migrations Before Commit
```bash
# Always test migrations locally
cd backend/rust
sqlite3 test.db < migrations/010_extend_products_table.sql
```

### 2. Use Graceful Error Handling
```rust
// DON'T
something().await.expect("Failed");

// DO
match something().await {
    Ok(result) => result,
    Err(e) => {
        tracing::error!("Failed: {}", e);
        std::process::exit(1);
    }
}
```

### 3. SQLite Trigger Best Practices
```sql
-- Simple and clear
CREATE TRIGGER name
BEFORE INSERT ON table
WHEN condition
BEGIN
    SELECT RAISE(ABORT, 'message')
    WHERE validation_fails;
END;
```

## Related Issues

### Unused Code Warnings
The backend has many warnings about unused code in sync modules:
- `unused imports`
- `never constructed` structs
- `non_snake_case` field names (intentional for JSON)

These are **not errors** and don't affect functionality. They exist because:
1. Sync modules are partially implemented
2. Some code is for future features
3. JSON fields use camelCase (realmId) while Rust uses snake_case

**Action**: Can be cleaned up later, not urgent.

## Status
✅ **FIXED** - Migration 010 now uses correct SQLite trigger syntax
✅ **FIXED** - Backend exits gracefully on migration errors
✅ **TESTED** - Backend starts successfully with all migrations

## Files Modified
1. `backend/rust/migrations/010_extend_products_table.sql` - Fixed trigger syntax
2. `backend/rust/src/main.rs` - Graceful error handling
