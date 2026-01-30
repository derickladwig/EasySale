# EasySale - Build Guide

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Git (for cloning repository)
- Windows: PowerShell or CMD
- Linux/Mac: Bash shell

### Production Build (Recommended)

**Windows**:
```cmd
.\build-prod.bat
```

**Linux/Mac**:
```bash
./build-prod.sh
```

This will:
1. Check Docker is running
2. Clean up legacy resources
3. Build frontend image (~15 seconds)
4. Build backend image (~4 minutes first time, ~75 seconds cached)
5. Start services with health checks
6. Display access URLs

### Development Build

**Windows**:
```cmd
.\docker-start.bat
```

**Linux/Mac**:
```bash
./docker-start.sh
```

Development mode includes:
- Hot reload for frontend
- Volume mounts for live code changes
- Faster iteration cycles

## Access Points

After successful build:
- **Frontend**: http://localhost:7945
- **Backend API**: http://localhost:8923
- **Health Check**: http://localhost:8923/health

## Common Issues

### Issue: "Docker is not running"
**Solution**: Start Docker Desktop and wait for it to be ready (green icon in system tray)

### Issue: "Port already in use"
**Solution**: 
```bash
# Stop existing containers
docker-compose -f docker-compose.prod.yml down

# Or stop specific service
docker stop EasySale-frontend EasySale-backend
```

### Issue: Frontend build fails with TypeScript errors
**Solution**: This should be fixed. If you see `Cannot find namespace 'NodeJS'`, the fix is already applied in `frontend/src/domains/product/components/ProductSearch.tsx`

### Issue: Backend build fails with OpenSSL errors
**Solution**: This should be fixed. The Dockerfile now includes `openssl-dev openssl-libs-static` packages.

### Issue: Binary not found in backend
**Solution**: This should be fixed. The Dockerfile now correctly references `EasySale-api` (not `caps-pos-api`).

## Clean Build (Start Fresh)

If you want to completely rebuild everything:

**Windows**:
```cmd
.\docker-clean.bat
.\build-prod.bat
```

**Linux/Mac**:
```bash
./docker-clean.sh
./build-prod.sh
```

This removes:
- All containers
- All images
- All volumes
- All networks

Then rebuilds from scratch.

## Build Times

### First Build (No Cache)
- Frontend: ~15 seconds
- Backend: ~4 minutes (compiling Rust dependencies)
- Total: ~4-5 minutes

### Subsequent Builds (With Cache)
- Frontend: ~3 seconds
- Backend: ~75 seconds
- Total: ~80 seconds

### Development Mode Startup
- ~10 seconds (uses pre-built images or local code)

## Troubleshooting

### View Logs
```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Check Container Status
```bash
docker ps
```

### Check Images
```bash
docker images | grep EasySale
```

### Check Networks
```bash
docker network ls | grep EasySale
```

### Check Volumes
```bash
docker volume ls | grep EasySale
```

### Restart Services
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Stop Services
```bash
docker-compose -f docker-compose.prod.yml down
```

## Manual Build (Advanced)

If you need to build images manually:

### Frontend
```bash
docker build -t EasySale-frontend:latest -f frontend/Dockerfile frontend
```

### Backend
```bash
docker build -t EasySale-backend:latest -f backend/rust/Dockerfile backend/rust
```

### Start Services
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Environment Variables

Create a `.env` file in the project root (optional):

```env
# Backend Configuration
JWT_SECRET=your-secret-key-here
STORE_ID=store-001
STORE_NAME=My Store

# Database
DATABASE_PATH=/data/EasySale.db

# Logging
RUST_LOG=info
```

## Health Checks

The build script automatically waits for services to be healthy. You can manually check:

```bash
# Backend health
curl http://localhost:8923/health

# Frontend (should return HTML)
curl http://localhost:7945
```

## Performance Tips

1. **Use Docker BuildKit**: Already enabled by default in modern Docker
2. **Layer Caching**: Don't modify `package.json` or `Cargo.toml` unless necessary
3. **Parallel Builds**: Build frontend and backend separately in parallel
4. **Prune Regularly**: Run `docker system prune` to free up space

## Security Notes

1. **Change JWT_SECRET**: The default is `change-me-in-production`
2. **Use HTTPS**: In production, put services behind a reverse proxy with SSL
3. **Firewall**: Only expose necessary ports (7945, 8923)
4. **Updates**: Regularly update base images and dependencies

## Support

If builds still fail after following this guide:
1. Check `DOCKER_BUILD_FIXES.md` for recent fixes
2. Review error messages carefully
3. Ensure Docker Desktop has enough resources (4GB RAM minimum)
4. Try a clean build with `docker-clean.bat` first

## File Structure

```
project-root/
├── frontend/
│   ├── Dockerfile          # Production frontend build
│   ├── Dockerfile.dev      # Development frontend build
│   └── src/                # Frontend source code
├── backend/
│   └── rust/
│       ├── Dockerfile      # Production backend build
│       ├── Cargo.toml      # Rust dependencies
│       └── src/            # Backend source code
├── docker-compose.yml      # Development configuration
├── docker-compose.prod.yml # Production configuration
├── build-prod.bat          # Windows production build
├── build-prod.sh           # Linux/Mac production build
├── docker-start.bat        # Windows development start
├── docker-start.sh         # Linux/Mac development start
├── docker-stop.bat         # Windows stop services
├── docker-stop.sh          # Linux/Mac stop services
├── docker-clean.bat        # Windows clean all
└── docker-clean.sh         # Linux/Mac clean all
```

## Next Steps

After successful build:
1. Access frontend at http://localhost:7945
2. Login with default credentials (see README.md)
3. Explore the application
4. Check backend API at http://localhost:8923
5. Review logs if needed

## Additional Resources

- Main README: `README.md`
- Docker Fixes: `DOCKER_BUILD_FIXES.md`
- System Patterns: `memory-bank/system_patterns.md`
- Tech Stack: `.kiro/steering/tech.md`
