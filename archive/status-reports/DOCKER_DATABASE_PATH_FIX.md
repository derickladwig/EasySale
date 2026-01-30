# Docker Database Path Fix

**Status**: ✅ FIXED  
**Date**: January 13, 2026  
**Issue**: Inconsistent database paths between Dockerfile and docker-compose files

## Problem

The Docker configurations had inconsistent database paths:

- **Dockerfile**: `DATABASE_PATH=/data/pos.db` ❌
- **docker-compose.yml**: `DATABASE_PATH=/data/EasySale.db` ✅
- **docker-compose.prod.yml**: `DATABASE_PATH=/data/EasySale.db` ✅

This could cause issues where:
1. Dockerfile creates `/data/pos.db`
2. Application looks for `/data/EasySale.db`
3. Two separate databases exist, causing confusion

## Solution

Updated `backend/rust/Dockerfile` to use consistent path:

### Changes Made

1. **Environment Variable**:
   ```dockerfile
   # Before
   ENV DATABASE_PATH=/data/pos.db
   
   # After
   ENV DATABASE_PATH=/data/EasySale.db
   ```

2. **Database File Creation**:
   ```dockerfile
   # Before
   RUN touch /data/pos.db && chmod 666 /data/pos.db
   
   # After
   RUN touch /data/EasySale.db && chmod 666 /data/EasySale.db
   ```

## Verification

All configurations now use the same path:

| File | Database Path | Status |
|------|--------------|--------|
| `backend/rust/Dockerfile` | `/data/EasySale.db` | ✅ Fixed |
| `docker-compose.yml` | `/data/EasySale.db` | ✅ Correct |
| `docker-compose.prod.yml` | `/data/EasySale.db` | ✅ Correct |

## Impact

- **Development**: No impact (docker-compose.yml was already correct)
- **Production**: No impact (docker-compose.prod.yml was already correct)
- **Standalone Docker**: Now consistent with compose files

## Testing

To verify the fix works:

```bash
# Build production image
docker build -t EasySale-backend:latest ./backend/rust

# Run standalone container
docker run -d -p 8923:8923 --name test-backend EasySale-backend:latest

# Check database path
docker exec test-backend ls -la /data/
# Should show: EasySale.db

# Check environment
docker exec test-backend env | grep DATABASE_PATH
# Should show: DATABASE_PATH=/data/EasySale.db

# Cleanup
docker stop test-backend
docker rm test-backend
```

## Related Files

- ✅ `backend/rust/Dockerfile` (fixed)
- ✅ `docker-compose.yml` (already correct)
- ✅ `docker-compose.prod.yml` (already correct)
- ℹ️ `installer/server/linux/install.sh` (uses different path for standalone installs - this is intentional)

## Notes

- The installer scripts use `/var/lib/caps-pos/database/pos.db` for standalone Linux installations
- This is intentional and separate from Docker deployments
- Docker deployments should always use `/data/EasySale.db`

---

**All Docker configurations are now consistent.** ✅
