# Backend Scripts

This directory contains utility scripts for backend development and CI/CD operations.

## SQLx Offline Mode Scripts

SQLx is a compile-time verified SQL library for Rust. By default, it requires database connectivity at compile time to verify queries. For CI/CD environments where database connectivity may not be available, SQLx supports "offline mode" using pre-generated metadata.

### sqlx_prepare.ps1

Generates `.sqlx/` metadata for offline compilation.

**Usage:**
```powershell
# From backend directory
.\scripts\sqlx_prepare.ps1

# With custom database path
.\scripts\sqlx_prepare.ps1 -DatabasePath "custom/path/to/db.sqlite"

# With verbose output
.\scripts\sqlx_prepare.ps1 -Verbose
```

**Requirements:**
- Database must exist and be up-to-date with migrations
- Run this script whenever:
  - New SQLx queries are added
  - Existing queries are modified
  - Database schema changes

**Output:**
- Generates metadata files in `backend/.sqlx/`
- These files should be committed to version control

### sqlx_check.ps1

Verifies that the backend compiles successfully with `SQLX_OFFLINE=true`.

**Usage:**
```powershell
# From backend directory
.\scripts\sqlx_check.ps1

# Check release build
.\scripts\sqlx_check.ps1 -Release

# With verbose output
.\scripts\sqlx_check.ps1 -Verbose
```

**Requirements:**
- `.sqlx/` metadata must exist (run `sqlx_prepare.ps1` first)

**Purpose:**
- Validates that offline compilation works before pushing to CI
- Catches missing or stale metadata early in development

## Workflow

### Initial Setup

1. Ensure database exists and migrations are applied:
   ```powershell
   cd backend
   cargo run --bin EasySale-server
   ```

2. Generate SQLx metadata:
   ```powershell
   .\scripts\sqlx_prepare.ps1
   ```

3. Commit the `.sqlx/` directory:
   ```bash
   git add .sqlx/
   git commit -m "chore: update SQLx offline metadata"
   ```

### After Making Changes

Whenever you add or modify SQLx queries:

1. Test your changes locally (with database connectivity)
2. Regenerate metadata:
   ```powershell
   .\scripts\sqlx_prepare.ps1
   ```
3. Verify offline compilation:
   ```powershell
   .\scripts\sqlx_check.ps1
   ```
4. Commit the updated metadata

### CI/CD Integration

The CI workflow (`.github/workflows/ci.yml`) uses `SQLX_OFFLINE=true` to build without database connectivity. It verifies that the `.sqlx/` directory exists and contains metadata before building.

If CI fails with SQLx-related errors:
1. Run `sqlx_prepare.ps1` locally
2. Commit the updated `.sqlx/` directory
3. Push the changes

## Troubleshooting

### "Database not found" error

**Problem:** `sqlx_prepare.ps1` can't find the database.

**Solution:**
- Ensure the database exists at `backend/data/pos.db`
- Run the server once to create it: `cargo run --bin EasySale-server`
- Or specify a custom path: `.\scripts\sqlx_prepare.ps1 -DatabasePath "path/to/db"`

### ".sqlx directory not found" error

**Problem:** `sqlx_check.ps1` can't find metadata.

**Solution:**
- Run `sqlx_prepare.ps1` first to generate metadata
- Ensure `.sqlx/` is not in `.gitignore`
- Verify metadata files exist: `ls .sqlx/`

### "Metadata is out of date" error

**Problem:** Offline compilation fails because metadata doesn't match current queries.

**Solution:**
- Regenerate metadata: `.\scripts\sqlx_prepare.ps1`
- Commit the updated `.sqlx/` directory

### CI fails with SQLx errors

**Problem:** CI build fails with SQLx-related compilation errors.

**Solution:**
1. Pull latest changes
2. Run `.\scripts\sqlx_prepare.ps1` locally
3. Commit and push the updated `.sqlx/` directory

## References

- [SQLx Documentation](https://github.com/launchbadge/sqlx)
- [SQLx Offline Mode](https://github.com/launchbadge/sqlx/blob/main/sqlx-cli/README.md#enable-building-in-offline-mode-with-query)
- [Production Readiness Spec](.kiro/specs/production-readiness-windows-installer/)
