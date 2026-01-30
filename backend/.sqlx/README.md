# SQLx Offline Mode Metadata

This directory contains SQLx offline mode metadata for compile-time query verification without database connectivity.

## What is this?

SQLx is a compile-time verified SQL library for Rust. By default, it connects to a database at compile time to verify that SQL queries are correct. This directory contains pre-generated metadata that allows SQLx to verify queries without database connectivity, which is essential for CI/CD environments.

## When to regenerate

You must regenerate this metadata whenever:

1. **New SQLx queries are added** to the codebase
2. **Existing queries are modified** (changed SQL, different parameters, etc.)
3. **Database schema changes** (migrations are applied)

## How to regenerate

From the `backend/` directory, run:

```powershell
# Windows
.\scripts\sqlx_prepare.ps1

# Linux/macOS
# (Bash version of script not yet implemented - use cargo directly)
DATABASE_URL=sqlite:data/pos.db cargo sqlx prepare --workspace
```

## Verification

After regenerating, verify that offline compilation works:

```powershell
# Windows
.\scripts\sqlx_check.ps1

# Linux/macOS
SQLX_OFFLINE=true cargo check --workspace
```

## CI/CD Integration

The CI workflow automatically uses `SQLX_OFFLINE=true` to build without database connectivity. If CI fails with SQLx errors, regenerate this metadata and commit the changes.

## Current Status

**Last Generated:** Not yet generated (directory is empty)

**Action Required:** Run `backend/scripts/sqlx_prepare.ps1` to generate initial metadata.

## Important Notes

- **Commit this directory:** The metadata files must be committed to version control
- **Keep it updated:** Stale metadata will cause CI failures
- **Not gitignored:** This directory should NOT be in `.gitignore`

## References

- [SQLx Offline Mode Documentation](https://github.com/launchbadge/sqlx/blob/main/sqlx-cli/README.md#enable-building-in-offline-mode-with-query)
- [Backend Scripts README](../scripts/README.md)
- [Production Readiness Spec](../../.kiro/specs/production-readiness-windows-installer/)
