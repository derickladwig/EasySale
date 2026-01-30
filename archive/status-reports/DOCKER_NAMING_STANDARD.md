# EasySale Docker Naming Standard

## Overview
All Docker resources for EasySale follow a consistent naming convention using the `EasySale-` prefix. This document serves as the authoritative reference for all container, volume, network, and image names.

## Naming Convention

### Project Name
- **Project**: `EasySale` (used with `-p` flag in docker-compose commands)

### Network
- **Development**: `EasySale-network`
- **Production**: `EasySale-network`

### Containers

#### Development (docker-compose.yml)
- **Frontend**: `EasySale-frontend-dev`
- **Backend**: `EasySale-backend-dev`
- **Storybook**: `EasySale-storybook-dev`

#### Production (docker-compose.prod.yml)
- **Frontend**: `EasySale-frontend`
- **Backend**: `EasySale-backend`

### Volumes

#### Development
- `EasySale-frontend-modules` - Node.js dependencies
- `EasySale-data-dev` - SQLite database (development)
- `EasySale-cargo-registry` - Rust cargo registry cache
- `EasySale-cargo-git` - Rust cargo git cache
- `EasySale-target` - Rust build artifacts

#### Production
- `EasySale-data` - SQLite database (production)

### Images
- **Frontend**: `EasySale-frontend:latest`
- **Backend**: `EasySale-backend:latest`

## Port Assignments
- **Frontend**: `7945` (both dev and prod)
- **Backend**: `8923` (both dev and prod)
- **Storybook**: `7946` (dev only)

## Scripts and Commands

### Batch Files (Windows)
All batch files use the standardized naming:
- `build-prod.bat` - Build and start production environment
- `docker-start.bat` - Start development environment
- `docker-stop.bat` - Stop all EasySale services
- `docker-clean.bat` - Remove all EasySale Docker resources
- `docker-restart-prod.bat` - Restart production environment

### Shell Scripts (Linux/Mac)
Equivalent shell scripts with same naming:
- `build-prod.sh`
- `docker-start.sh`
- `docker-stop.sh`
- `docker-clean.sh`
- `docker-restart-prod.sh`

### Docker Compose Commands
All commands use the project name flag:
```bash
# Development
docker-compose -p EasySale up
docker-compose -p EasySale down

# Production
docker-compose -p EasySale -f docker-compose.prod.yml up -d
docker-compose -p EasySale -f docker-compose.prod.yml down
```

## Legacy Cleanup
All scripts automatically clean up legacy resources from previous naming schemes:
- Old containers: `caps-pos-*`, `dynamous-kiro-hackathon-*`
- Old volumes: `caps-pos-*`, `dynamous-kiro-hackathon_*`
- Old networks: `caps-pos-network`, `dynamous-kiro-hackathon_caps-network`

## Verification Commands

### Check Running Containers
```bash
docker ps --filter "name=EasySale"
```

### Check All Containers (including stopped)
```bash
docker ps -a --filter "name=EasySale"
```

### Check Volumes
```bash
docker volume ls --filter "name=EasySale"
```

### Check Networks
```bash
docker network ls --filter "name=EasySale"
```

### Check Images
```bash
docker images | grep EasySale
```

## Configuration Files

### docker-compose.yml (Development)
- Uses `EasySale-network` network
- All volumes prefixed with `EasySale-`
- All containers suffixed with `-dev`
- Project name: `EasySale`

### docker-compose.prod.yml (Production)
- Uses `EasySale-network` network
- Volume: `EasySale-data`
- Containers: `EasySale-frontend`, `EasySale-backend`
- Project name: `EasySale`

## Environment Variables
All environment variables use consistent naming:
- `DATABASE_PATH=/data/EasySale.db`
- `STORE_ID=store-001`
- `STORE_NAME="Main Store"` or `"CAPS Store"`

## Health Checks
- **Backend**: `http://localhost:8923/health`
- **Frontend**: `http://localhost:7945/` (production) or `http://localhost:7945` (development)

## Best Practices

1. **Always use project name**: Include `-p EasySale` in all docker-compose commands
2. **Consistent prefixing**: All resources must start with `EasySale-`
3. **Environment suffixes**: Use `-dev` suffix for development containers
4. **Volume naming**: Explicitly name volumes in docker-compose files
5. **Network sharing**: Use single `EasySale-network` for all services
6. **Legacy cleanup**: All scripts clean up old naming schemes automatically

## Troubleshooting

### Check for naming conflicts
```bash
# List all containers (should only see EasySale-*)
docker ps -a

# List all volumes (should only see EasySale-*)
docker volume ls

# List all networks (should only see EasySale-network)
docker network ls
```

### Clean up everything
```bash
# Windows
docker-clean.bat

# Linux/Mac
./docker-clean.sh
```

### Verify clean state
```bash
docker ps -a --filter "name=EasySale"
docker volume ls --filter "name=EasySale"
docker network ls --filter "name=EasySale"
```

All commands should return empty results after cleanup.

## Summary
The EasySale Docker infrastructure uses a unified `EasySale-` naming convention across all resources. This ensures:
- Easy identification of project resources
- Consistent behavior across development and production
- Simplified cleanup and maintenance
- Clear separation from other projects
- Automated legacy resource cleanup
