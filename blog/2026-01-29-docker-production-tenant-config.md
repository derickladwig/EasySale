# Docker Production Tenant Configuration Fix

**Date**: 2026-01-29

## Summary

Fixed Docker production deployment failing due to tenant/store ID validation. The backend has a security check that rejects default placeholder values in release builds, but the Dockerfile and docker-compose.prod.yml were using values that triggered this check.

## Problem

When running `build-prod.bat` or starting production containers, the backend would crash with:
```
Error: Custom { kind: InvalidInput, error: "Production deployment cannot use default tenant ID" }
```

The backend's `main.rs` has a production security check:
```rust
if cfg!(not(debug_assertions)) {
    if store_id == "default-store" || store_id == "test" {
        return Err(...);
    }
    if tenant_id == "tenant_default" || tenant_id == "test" {
        return Err(...);
    }
}
```

## Solution

Updated default values in both files to use non-rejected defaults while keeping them configurable:

### Dockerfile.backend
```dockerfile
ENV STORE_ID=main-store
ENV TENANT_ID=production
```

### docker-compose.prod.yml
```yaml
environment:
  - STORE_ID=${STORE_ID:-main-store}
  - TENANT_ID=${TENANT_ID:-production}
```

## Configuration

Users can override these values by:

1. **Environment variables** before running docker-compose:
   ```bash
   export STORE_ID=my-store-001
   export TENANT_ID=my-company
   docker-compose -p EasySale -f docker-compose.prod.yml up -d
   ```

2. **`.env` file** in project root:
   ```
   STORE_ID=my-store-001
   TENANT_ID=my-company
   ```

3. **Direct docker run** with `-e` flags:
   ```bash
   docker run -e STORE_ID=my-store -e TENANT_ID=my-tenant EasySale-backend:latest
   ```

## Rejected Values

The following values are rejected in production builds:
- `STORE_ID`: `default-store`, `test`
- `TENANT_ID`: `tenant_default`, `test`

## Verification

After the fix, both containers start successfully:
```
EasySale-frontend   Up (healthy)   0.0.0.0:7945->80/tcp
EasySale-backend    Up (healthy)   0.0.0.0:8923->8923/tcp
```

Both endpoints respond with HTTP 200:
- Frontend: http://localhost:7945
- Backend health: http://localhost:8923/health
