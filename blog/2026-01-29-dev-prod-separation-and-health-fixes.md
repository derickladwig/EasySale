# Development/Production Separation and Health Endpoint Fixes

**Date:** 2026-01-29
**Author:** Kiro AI (Session 39)

## Issues Addressed

1. **Dev profile loading in production builds** - Fixed by creating separate batch files
2. **500 errors on `/api/health/status`** - Fixed by making external services optional
3. **500 errors on `/auth/me`** - Fixed by proper endpoint registration order
4. **CORS issues during setup wizard** - Fixed by proper CORS configuration
5. **Missing dev/prod separation in batch files** - Created separate scripts

## Changes Made

### New Batch Files Created

| File | Purpose |
|------|---------|
| `start-dev.bat` | Start development environment with hot-reload |
| `stop-dev.bat` | Stop development containers |
| `build-dev.bat` | Build development images (debug profile) |
| `docker-stop.bat` | Stop all Docker containers (dev and prod) |

### Updated Files

| File | Changes |
|------|---------|
| `build-prod.bat` | Added documentation about release profile |
| `docker-compose.yml` | Added comprehensive development documentation |
| `docker-compose.prod.yml` | Added production documentation and CORS config |
| `backend/crates/server/src/main.rs` | Fixed duplicate endpoint registration |
| `backend/crates/server/src/handlers/health_check.rs` | Fixed health endpoint to not fail on optional services |

## Key Fixes

### 1. Health Endpoint (`/api/health/status`)

**Before:** Returned 503 when external services (WooCommerce, QuickBooks) were not configured.

**After:** 
- Returns 200 OK with status "healthy" when database is up and services connected
- Returns 200 OK with status "degraded" when database is up but services not configured
- Returns 503 ONLY when database (critical component) is down

### 2. Auth Endpoint (`/auth/me`)

**Before:** Registered after `ContextExtractor` middleware, causing 500 errors for unauthenticated requests.

**After:** Registered before `ContextExtractor` middleware, properly returns 401 for unauthenticated requests.

### 3. CORS Configuration

**Before:** Had `supports_credentials()` with `allow_any_origin()` which is invalid.

**After:** Removed `supports_credentials()`, added `expose_any_header()` for LAN access compatibility.

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Rust Profile | Debug (`cargo run`) | Release (`cargo build --release`) |
| Hot-reload | Enabled | Disabled |
| CORS | Permissive (any origin) | Configurable via env var |
| Logging | Verbose | Minimal |
| Build Speed | Faster | Slower (optimized) |
| Binary Size | Larger (debug symbols) | Smaller (optimized) |

## Usage

```bash
# Development
start-dev.bat          # Start with hot-reload
stop-dev.bat           # Stop development containers
build-dev.bat          # Build development images

# Production
build-prod.bat         # Build production images (release profile)
start-prod.bat         # Start production containers
docker-stop.bat --prod # Stop production containers

# Stop all
docker-stop.bat        # Stop both dev and prod
```

## Build Status

- ✅ Backend: `cargo check --lib` SUCCESS
- ✅ Frontend: `npm run build` SUCCESS
