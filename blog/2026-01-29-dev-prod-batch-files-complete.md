# Dev/Prod Batch Files Complete

**Date**: 2026-01-29

## Summary

Completed the full set of development and production management batch files for Windows environments.

## Files Created

### Development Environment
- `start-dev.bat` - Start development containers with hot-reload
- `stop-dev.bat` - Stop development containers
- `build-dev.bat` - Build development images (debug profile)
- `update-dev.bat` - Update npm/cargo dependencies and rebuild dev images

### Production Environment
- `start-prod.bat` - Start production containers
- `stop-prod.bat` - Stop production containers (with optional volume removal)
- `build-prod.bat` - Build production images (--release profile)
- `update-prod.bat` - Update dependencies, backup database, rebuild and restart

### Shared
- `docker-stop.bat` - Stop all Docker containers (dev and prod)

## Key Features

### update-dev.bat
- Updates frontend (npm install) and backend (cargo update)
- Rebuilds development Docker images
- Supports `--frontend` or `--backend` flags for partial updates
- `--no-rebuild` flag to skip Docker rebuild

### update-prod.bat
- Automatic database backup before update
- Updates frontend and backend dependencies
- Prepares sqlx offline mode
- Rebuilds production images with --release profile
- Restarts containers with health check
- Supports `--no-backup`, `--no-restart` flags

## Usage Examples

```batch
REM Development
start-dev.bat              # Start dev environment
update-dev.bat             # Update all dependencies
update-dev.bat --frontend  # Update frontend only
stop-dev.bat               # Stop dev containers

REM Production
start-prod.bat             # Start production
update-prod.bat            # Full production update with backup
update-prod.bat --backend  # Update backend only
stop-prod.bat              # Stop production (preserve data)
stop-prod.bat --volumes    # Stop and remove all data (CAUTION!)
```

## Technical Notes

- All scripts support `--no-pause` for CI/automation
- All scripts support `--help` for usage information
- Production updates include automatic database backup to `runtime/backups/`
- Scripts detect and use LAN override files from `runtime/docker-compose.override.yml`
