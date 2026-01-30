# Docker Build Dependency Sync Fix

**Date**: 2026-01-29

## Problem

Docker builds were failing with "Missing: cross-env@7.0.3 from lock file" because the `package-lock.json` could be out of sync with `package.json` when users clone the repo or when dependencies are updated.

The Dockerfile uses `npm ci --legacy-peer-deps` which requires the lock file to exactly match `package.json`. If they're out of sync, the build fails.

## Solution

Updated all build scripts to run `npm install --legacy-peer-deps` in the frontend directory before building Docker images. This ensures the `package-lock.json` is always synced for everyone, regardless of their local state.

### Files Updated

1. **build-prod.bat** - Added step [3/11] to sync frontend dependencies before Docker build
2. **build-prod.sh** - Added dependency sync step after Docker check
3. **build-dev.bat** - Added step [3/6] to sync frontend dependencies before Docker build

### Why This Works

- `npm install --legacy-peer-deps` updates `package-lock.json` to match `package.json`
- This runs before any Docker operations, ensuring the lock file is current
- The `--legacy-peer-deps` flag handles peer dependency conflicts (needed for Vite/Storybook compatibility)
- Errors are caught but don't block the build (warnings only)

## Impact

- All users get consistent Docker builds regardless of their local npm state
- No more "missing from lock file" errors
- Works for fresh clones, updated repos, and CI environments
