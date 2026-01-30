# Docker Production Hardening Summary

**Date:** January 10, 2026
**Status:** ✅ Complete

## Issues Fixed

### 1. SQL Migration Parser Bug
The parser was incorrectly splitting SQL statements on semicolons inside parentheses like `DEFAULT (datetime('now'))`.

**Fix:** Rewrote `parse_sql_statements()` in `backend/rust/src/db/migrations.rs` to:
- Track parenthesis depth
- Handle string literals
- Skip SQL comments
- Only record migration as "applied" after ALL statements succeed

### 2. OpenSSL Static Linking Error
Docker builds failed with OpenSSL linking errors.

**Fix:** Switched from `native-tls` to `rustls` in `backend/rust/Cargo.toml`:
```toml
reqwest = { version = "0.11", default-features = false, features = ["rustls-tls", "json"] }
```

### 3. Missing User Columns
Auth handler expected `store_id`, `station_policy`, and `station_id` columns.

**Fix:** Created `migrations/006_add_user_store_station.sql` to add missing columns.

### 4. Unified Docker Naming
Resources were using hackathon naming (`dynamous-kiro-hackathon_*`).

**Fix:** Updated all Docker resources to use `caps-pos-*` prefix:
- Network: `caps-pos-network`
- Volume: `caps-pos-data` (prod), `caps-pos-data-dev` (dev)
- Containers: `caps-pos-frontend`, `caps-pos-backend` (prod)
- Containers: `caps-pos-frontend-dev`, `caps-pos-backend-dev` (dev)

### 5. Robust Bat/Shell Scripts
Scripts were fragile and didn't clean up legacy resources.

**Fix:** Updated all scripts to:
- Clean up legacy hackathon resources automatically
- Check prerequisites (Docker running, files exist, ports available)
- Wait for health checks
- Provide clear error messages
- Pause so users can read output

## Files Modified

| File | Changes |
|------|---------|
| `backend/rust/src/db/migrations.rs` | Fixed SQL parser, improved error handling |
| `backend/rust/Cargo.toml` | Switched to rustls |
| `backend/rust/migrations/006_add_user_store_station.sql` | New migration |
| `docker-compose.yml` | Updated naming, added explicit names |
| `docker-compose.prod.yml` | Already had good naming |
| `build-prod.bat` | Added legacy cleanup, health waiting |
| `docker-start.bat` | Added legacy cleanup, port checks |
| `docker-stop.bat` | Simplified with proper cleanup |
| `docker-clean.bat` | Removes all resources including legacy |
| `build-prod.sh` | Added legacy cleanup, colored output |
| `docker-start.sh` | Added legacy cleanup |
| `docker-stop.sh` | Simplified |
| `docker-clean.sh` | Removes all resources including legacy |

## Verification

```
✅ Network: caps-pos-network
✅ Volume: caps-pos-data
✅ Backend: caps-pos-backend (healthy)
✅ Frontend: caps-pos-frontend (200 OK)
✅ All 6 migrations: Applied successfully
✅ Health endpoint: {"status":"healthy"}
```

## Usage

```bash
# Production build and start
build-prod.bat

# Development start
docker-start.bat

# Stop all services
docker-stop.bat

# Clean everything (including legacy)
docker-clean.bat
```

## Notes

- All scripts automatically clean up legacy `dynamous-kiro-hackathon_*` resources
- Explicit `name:` properties prevent Docker from auto-prefixing with project name
- Health checks ensure services are ready before marking as started
- Migration tracking prevents re-running already-applied migrations
