# Docker Build Instructions - EasySale

## Quick Start (Clean Build)

Run these commands in order:

```batch
docker-clean.bat
build-prod.bat
```

## What Was Fixed

### 1. Project Naming
- Added `name: EasySale` to both `docker-compose.yml` and `docker-compose.prod.yml`
- All containers, volumes, and networks now use `EasySale` prefix instead of `dynamous-kiro-hackathon`

### 2. Backend Health Check
- Added `wget` to production Dockerfile (Alpine image)
- Health check now works properly

### 3. Backup Directory
- Updated Dockerfile.dev to create `/data/backups` directory
- Updated entrypoint.sh to create backup directory on startup
- Updated migration to use absolute path `/data/backups`

### 4. Database Configuration
- Fixed default store_id to match migration: `default-store`
- Fixed default tenant_id: `tenant_default`
- Removed foreign key constraints from backup_jobs table to allow system backups

### 5. Batch Files
All batch files now use `-p easysale` flag:
- `docker-clean.bat` - Cleans all EasySale resources
- `docker-start.bat` - Starts development environment
- `docker-stop.bat` - Stops all services
- `docker-fresh-start.bat` - Complete clean rebuild
- `build-prod.bat` - Production build
- `rebuild-backend.bat` - Rebuild backend only
- `test-fresh-build.bat` - Test build process

## Resource Naming Convention

### Containers
- Development: `EasySale-backend-dev`, `EasySale-frontend-dev`
- Production: `EasySale-backend`, `EasySale-frontend`

### Volumes
- `EasySale_EasySale-data-dev` (development database)
- `EasySale_EasySale-data` (production database)
- `EasySale_EasySale-cargo-registry` (Rust dependencies)
- `EasySale_EasySale-cargo-git` (Rust git dependencies)
- `EasySale_EasySale-target` (Rust build cache)
- `EasySale_EasySale-frontend-modules` (Node modules)

### Network
- `EasySale_EasySale-network`

## Build Process

### Development
```batch
docker-start.bat
```

This will:
1. Check Docker is running
2. Clean up existing containers
3. Build images with hot reload
4. Start services on ports 7945 (frontend) and 8923 (backend)

### Production
```batch
build-prod.bat
```

This will:
1. Check Docker is running
2. Clean up old resources
3. Build optimized production images
4. Start services with health checks
5. Wait for services to be healthy

## Troubleshooting

### Backend Unhealthy
```batch
docker logs EasySale-backend -f
```

Common issues:
- Database migration failed - check migration files
- Port 8923 already in use - stop other services
- Missing backup directory - fixed in entrypoint.sh

### Frontend Not Loading
```batch
docker logs EasySale-frontend -f
```

Common issues:
- Backend not ready - wait for backend health check
- Port 7945 already in use - stop other services

### Clean Everything
```batch
docker-clean.bat
```

This removes:
- All containers
- All images
- All volumes (DATA WILL BE LOST!)
- All networks

## Verification

After build, verify:

1. **Containers running:**
   ```batch
   docker ps
   ```
   Should show `EasySale-backend` and `EasySale-frontend`

2. **Backend health:**
   ```batch
   curl http://localhost:8923/health
   ```
   Should return `{"status":"healthy"}`

3. **Frontend accessible:**
   Open browser: http://localhost:7945

4. **Database created:**
   ```batch
   docker exec EasySale-backend ls -la /data/
   ```
   Should show `EasySale.db` and `backups/` directory

5. **Volumes created:**
   ```batch
   docker volume ls | findstr EasySale
   ```
   Should show all EasySale volumes

## Environment Variables

### Development (.env)
```env
VITE_API_URL=http://localhost:8923
NODE_ENV=development
```

### Production (docker-compose.prod.yml)
```env
DATABASE_PATH=/data/EasySale.db
RUST_LOG=info
API_HOST=0.0.0.0
API_PORT=8923
JWT_SECRET=change-me-in-production
STORE_ID=default-store
STORE_NAME=Main Store
```

## Next Steps

1. Run `docker-clean.bat` to remove old resources
2. Run `build-prod.bat` to build fresh
3. Access application at http://localhost:7945
4. Check logs if any issues: `docker-compose -p easysale -f docker-compose.prod.yml logs -f`
