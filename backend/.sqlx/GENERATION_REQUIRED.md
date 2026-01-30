# SQLx Metadata Generation Required

## Status: ⚠️ NOT YET GENERATED

The SQLx offline mode metadata has **not yet been generated** because the backend currently has compilation errors that must be fixed first.

## What Needs to Happen

### 1. Fix Backend Compilation Errors

The backend currently fails to compile with multiple errors related to:
- Missing fields in `ReviewCase` struct (`reviewed_by`, `updated_at`, `case_id`, `fields`, `confidence`)
- Missing enum variants in `ReviewState` (`Pending`, `Archived`)
- Type mismatches in various services
- Missing fields in `RankedVariant` and `ScoreBreakdown` structs

**Action Required:** Fix these compilation errors before proceeding.

### 2. Generate SQLx Metadata

Once the backend compiles successfully, run:

```powershell
cd backend
.\scripts\sqlx_prepare.ps1 -Verbose
```

This will:
- Connect to the database at `backend/data/pos.db`
- Analyze all SQLx queries in the workspace
- Generate metadata files in `backend/.sqlx/`

### 3. Verify Offline Compilation

After generating metadata, verify it works:

```powershell
cd backend
.\scripts\sqlx_check.ps1 -Verbose
```

This will compile the backend with `SQLX_OFFLINE=true` to ensure CI will work.

### 4. Commit the Metadata

Once generated and verified, commit the `.sqlx/` directory:

```bash
git add backend/.sqlx/
git commit -m "chore: add SQLx offline mode metadata"
```

## CI Integration

The CI workflow (`.github/workflows/ci.yml`) has been updated to:
1. Set `SQLX_OFFLINE=true` environment variable
2. Verify `.sqlx/` directory exists before building
3. Build without database connectivity

**CI will fail until the metadata is generated and committed.**

## Scripts Created

- ✅ `backend/scripts/sqlx_prepare.ps1` - Generates metadata
- ✅ `backend/scripts/sqlx_check.ps1` - Verifies offline compilation
- ✅ `backend/scripts/README.md` - Documentation

## References

- [Task 2.2 in Production Readiness Spec](../../.kiro/specs/production-readiness-windows-installer/tasks.md)
- [SQLx Offline Mode Documentation](https://github.com/launchbadge/sqlx/blob/main/sqlx-cli/README.md#enable-building-in-offline-mode-with-query)
- [Backend Scripts README](../scripts/README.md)

## Timeline

- **2026-01-25**: Scripts created, CI updated, awaiting backend compilation fixes
- **Next**: Fix compilation errors, generate metadata, commit

---

**Important:** Do not proceed with CI builds until this metadata is generated. The CI will fail with "`.sqlx directory not found`" error.
