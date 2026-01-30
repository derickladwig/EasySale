# Docker Build Workflow Complete

**Date**: 2026-01-29

## Summary

The Docker production build workflow is now fully operational with proper error handling and Windows compatibility.

## What Was Fixed

1. **Package-lock.json sync** - Added `npm install --legacy-peer-deps` step before Docker build
2. **SQLX offline mode** - Updated `.sqlx` cache with 46 query files for compile-time verification
3. **Dockerfile simplified** - Removed dummy crate strategy, copies all source then builds
4. **Production tenant ID rejection** - Backend rejects `tenant_default`, `default-store`, `test` in release builds; defaults changed to `main-store` and `production`
5. **Health checks** - Changed from `curl` to PowerShell `Invoke-WebRequest` for Windows compatibility
6. **Bat file error handling** - Added explicit pause on success/error with `ERROR_EXIT` label

## Build Variants

- **lite** (~20MB) - Core POS only
- **export** (~25MB) - + CSV export for QuickBooks (default)
- **full** (~35MB) - + OCR, document processing, cleanup engine

## Usage

```batch
# Build production images (default: export variant)
build-prod.bat

# Build specific variant
build-prod.bat --lite
build-prod.bat --full

# Start production environment
start-prod.bat

# Stop production environment
stop-prod.bat
```

## Verification

- Backend health: http://localhost:8923/health (200 OK)
- Frontend: http://localhost:7945 (200 OK)
- Both containers running with `(healthy)` status
