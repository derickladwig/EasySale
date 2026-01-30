# EasySale - Windows Deployment Guide

**Last Updated**: 2026-01-25  
**Target Platform**: Windows 10/11 with Docker Desktop

## Overview

This guide provides step-by-step instructions for deploying EasySale on Windows using Docker. The deployment process is designed to be simple and reliable, with a one-button entrypoint that handles configuration, building, and deployment.

## Prerequisites

### Required Software

1. **Windows 10/11** (64-bit)
   - Windows 10 version 2004 or higher
   - Windows 11 (any version)

2. **Docker Desktop for Windows**
   - Download: https://www.docker.com/products/docker-desktop
   - Minimum version: 4.0.0
   - Ensure WSL 2 backend is enabled (recommended)

3. **PowerShell**
   - Included with Windows 10/11
   - Minimum version: 5.1

### System Requirements

- **CPU**: 4 cores or more (recommended)
- **RAM**: 8 GB minimum, 16 GB recommended
- **Disk Space**: 20 GB free space minimum
- **Network**: Internet connection for initial setup

## Quick Start (One-Button Deployment)

For fresh installations on Windows, simply run:

```cmd
build-prod-windows.bat
```

This single command will:
1. Check prerequisites (Docker, PowerShell)
2. Run configuration wizard (generates .env from .env.example)
3. Clean Docker resources (optional)
4. Build production Docker images
5. Verify build success
6. Start services
7. Print access URLs

### First-Time Setup

1. **Clone the repository**:
   ```cmd
   git clone <repository-url>
   cd EasySale
   ```

2. **Start Docker Desktop**:
   - Open Docker Desktop
   - Wait for it to be fully running (green icon in system tray)

3. **Run the deployment script**:
   ```cmd
   build-prod-windows.bat
   ```

4. **Follow the configuration wizard**:
   - Tenant ID: Unique identifier for your business (e.g., `my-retail-store`)
   - Store ID: Unique identifier for this location (e.g., `store-001`)
   - Store Name: Human-readable name (e.g., `Main Store`)
   - JWT Secret: Leave blank to auto-generate
   - API Port: Default is `8923`
   - Frontend Port: Default is `7945`

5. **Wait for build to complete**:
   - First build may take 10-15 minutes
   - Subsequent builds are faster due to Docker caching

6. **Access the application**:
   - Frontend: http://localhost:7945
   - Backend API: http://localhost:8923
   - Health Check: http://localhost:8923/health

## Configuration Wizard

The configuration wizard (`scripts/preflight.ps1`) is automatically run by `build-prod-windows.bat`. It can also be run manually:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\preflight.ps1
```

### Configuration Options

The wizard will prompt for the following values:

| Setting | Description | Default | Example |
|---------|-------------|---------|---------|
| Tenant ID | Unique business identifier | `default-tenant` | `my-retail-store` |
| Store ID | Unique location identifier | `store-001` | `downtown-location` |
| Store Name | Human-readable name | `Main Store` | `Downtown Store` |
| JWT Secret | Authentication secret | Auto-generated | (random base64 string) |
| API Port | Backend API port | `8923` | `8923` |
| Frontend Port | Frontend web port | `7945` | `7945` |

### Non-Interactive Mode

For CI/automation, run the wizard in non-interactive mode:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\preflight.ps1 -NonInteractive
```

This will use default values and auto-generate secrets.

## Build Options

The `build-prod-windows.bat` script supports several options:

```cmd
build-prod-windows.bat [options]

Options:
  --no-pause       Skip pause prompts (for CI/automation)
  --skip-wizard    Skip configuration wizard (use existing .env)
  --skip-clean     Skip Docker clean step
  --help           Show help message
```

### Examples

**Fresh installation**:
```cmd
build-prod-windows.bat
```

**Rebuild without cleaning**:
```cmd
build-prod-windows.bat --skip-clean
```

**CI/automation mode**:
```cmd
build-prod-windows.bat --no-pause --skip-wizard
```

**Use existing configuration**:
```cmd
build-prod-windows.bat --skip-wizard
```

## Troubleshooting

### Common Issues

#### 1. Docker Not Running

**Error**: `Docker is not running!`

**Solution**:
1. Open Docker Desktop
2. Wait for it to fully start (green icon in system tray)
3. Run the script again

#### 2. Port Already in Use

**Error**: `Bind for 0.0.0.0:7945 failed: port is already allocated`

**Solution**:
1. Stop any services using ports 7945 or 8923
2. Or change ports in `.env` file:
   ```
   API_PORT=8924
   VITE_PORT=7946
   ```
3. Run the script again

#### 3. Build Failures

##### Frontend Build Failure

**Error**: `Could not load /app/src/common/api/client (imported by ...): ENOENT`

**Root Cause**: This is a Linux/Docker-only failure mode caused by:
- Case-sensitive import issues (Windows is case-insensitive, Linux is case-sensitive)
- Missing files in Docker build context
- Barrel file resolution issues

**Diagnostic Steps**:

1. **Check file existence**:
   ```cmd
   dir frontend\src\common\api\client.ts
   ```
   If file doesn't exist, check for similar names with different casing.

2. **Check exact filename and casing**:
   ```cmd
   dir /b frontend\src\common\api\
   ```
   Ensure the import statement matches the exact filename (including case).

3. **Verify Docker build context**:
   ```cmd
   docker build --no-cache -t EasySale-frontend:latest ./frontend
   ```
   Look for the specific error message in the output.

4. **Check import statements**:
   - Open the file mentioned in the error (e.g., `src/features/settings/hooks/useFeatureFlags.ts`)
   - Verify the import path matches the actual file location and casing
   - Example:
     ```typescript
     // Wrong (if file is client.ts)
     import { client } from '@/common/api/Client';
     
     // Correct
     import { client } from '@/common/api/client';
     ```

**Fix Checklist**:
- [ ] File exists at the expected path
- [ ] Import statement matches exact filename (including case)
- [ ] No typos in import path
- [ ] File is not in `.dockerignore`
- [ ] Barrel file (`index.ts`) exports are correct

##### Backend Build Failure

**Error**: `error: could not compile ...`

**Solution**:
1. Check Rust compilation errors in the log file
2. Common causes:
   - Missing dependencies
   - SQLx offline mode issues
   - Syntax errors

3. Test backend build locally:
   ```cmd
   cd backend
   cargo build --release
   ```

4. If SQLx errors, prepare offline mode:
   ```cmd
   cd backend
   set DATABASE_URL=sqlite:data/pos.db
   cargo sqlx prepare --workspace
   ```

#### 4. Configuration Errors

**Error**: `Configuration validation failed`

**Solution**:
1. Check `.env` file for invalid values
2. Ensure tenant ID and store ID contain only lowercase letters, numbers, and hyphens
3. Ensure ports are valid numbers
4. Ensure JWT secret is not a placeholder value

#### 5. Services Not Starting

**Error**: `Failed to start services!`

**Solution**:
1. Check Docker logs:
   ```cmd
   docker-compose -p EasySale -f docker-compose.prod.yml logs
   ```

2. Check backend logs specifically:
   ```cmd
   docker logs EasySale-backend
   ```

3. Common causes:
   - Database migration failures
   - Invalid configuration
   - Port conflicts

### Getting Help

If you encounter issues not covered here:

1. **Check the log file**:
   - Location: `audit/windows_bat_validation_2026-01-25/logs/build-prod-windows_YYYYMMDD_HHMMSS.log`
   - Contains detailed error messages and stack traces

2. **Run Docker commands manually**:
   ```cmd
   docker build --no-cache -t EasySale-frontend:latest ./frontend
   docker build --no-cache -f Dockerfile.backend -t EasySale-backend:latest .
   ```

3. **Check Docker Desktop**:
   - Open Docker Desktop
   - Go to Containers tab
   - Check container status and logs

4. **Verify prerequisites**:
   - Docker Desktop is running
   - WSL 2 backend is enabled (Settings → General → Use WSL 2 based engine)
   - Sufficient disk space available

## Manual Deployment (Advanced)

If you prefer manual control over the deployment process:

### 1. Generate Configuration

```powershell
powershell -ExecutionPolicy Bypass -File scripts\preflight.ps1
```

### 2. Clean Docker Resources (Optional)

```cmd
docker-clean.bat
```

### 3. Create Docker Network

```cmd
docker network create EasySale_EasySale-network
```

### 4. Build Images

```cmd
docker build --no-cache -t EasySale-frontend:latest ./frontend
docker build --no-cache -f Dockerfile.backend -t EasySale-backend:latest .
```

### 5. Start Services

```cmd
docker-compose -p EasySale -f docker-compose.prod.yml up -d
```

### 6. Verify Services

```cmd
curl http://localhost:8923/health
curl http://localhost:7945
```

## Maintenance

### Viewing Logs

**All services**:
```cmd
docker-compose -p EasySale -f docker-compose.prod.yml logs -f
```

**Backend only**:
```cmd
docker logs EasySale-backend -f
```

**Frontend only**:
```cmd
docker logs EasySale-frontend -f
```

### Stopping Services

```cmd
docker-stop.bat
```

Or manually:
```cmd
docker-compose -p EasySale -f docker-compose.prod.yml down
```

### Restarting Services

```cmd
docker-compose -p EasySale -f docker-compose.prod.yml restart
```

### Updating Configuration

1. Edit `.env` file
2. Restart services:
   ```cmd
   docker-compose -p EasySale -f docker-compose.prod.yml down
   docker-compose -p EasySale -f docker-compose.prod.yml up -d
   ```

### Backing Up Data

The database is stored in a Docker volume. To back it up:

```cmd
docker run --rm -v EasySale_EasySale-data:/data -v %CD%:/backup alpine tar czf /backup/EasySale-backup.tar.gz /data
```

### Restoring Data

```cmd
docker run --rm -v EasySale_EasySale-data:/data -v %CD%:/backup alpine tar xzf /backup/EasySale-backup.tar.gz -C /
```

## Production Deployment

For production deployments, additional considerations:

### Security

1. **Change default secrets**:
   - Generate strong JWT secret
   - Use environment-specific values

2. **Configure HTTPS**:
   - Use a reverse proxy (nginx, Caddy)
   - Obtain SSL certificates (Let's Encrypt)

3. **Restrict network access**:
   - Configure firewall rules
   - Use Docker network isolation

### Performance

1. **Resource limits**:
   - Configure Docker resource limits in `docker-compose.prod.yml`
   - Monitor CPU and memory usage

2. **Database optimization**:
   - Regular VACUUM operations
   - Index optimization
   - Backup strategy

### Monitoring

1. **Health checks**:
   - Backend: http://localhost:8923/health
   - Frontend: http://localhost:7945

2. **Log aggregation**:
   - Configure log rotation
   - Use log aggregation tools (ELK, Splunk)

3. **Alerting**:
   - Set up monitoring alerts
   - Configure notification channels

## Uninstallation

To completely remove EasySale:

1. **Stop and remove containers**:
   ```cmd
   docker-clean.bat
   ```

2. **Remove configuration**:
   ```cmd
   del .env
   ```

3. **Remove repository** (optional):
   ```cmd
   cd ..
   rmdir /s /q EasySale
   ```

## Support

For additional support:

- Documentation: `docs/` folder
- Issues: GitHub Issues
- Community: Discord/Slack (if available)

## Appendix

### File Locations

| File | Purpose |
|------|---------|
| `build-prod-windows.bat` | One-button deployment script |
| `scripts/preflight.ps1` | Configuration wizard |
| `docker-clean.bat` | Docker cleanup script |
| `docker-stop.bat` | Stop services script |
| `.env` | Environment configuration |
| `.env.example` | Configuration template |
| `docker-compose.prod.yml` | Production Docker Compose config |
| `audit/windows_bat_validation_2026-01-25/logs/` | Build and deployment logs |

### Environment Variables

See `.env.example` for a complete list of environment variables and their descriptions.

### Docker Images

| Image | Purpose | Size (approx) |
|-------|---------|---------------|
| `EasySale-frontend:latest` | Frontend web application | 50 MB |
| `EasySale-backend:latest` | Backend API server | 100 MB |

### Docker Volumes

| Volume | Purpose |
|--------|---------|
| `EasySale_EasySale-data` | Application database and data |

### Docker Networks

| Network | Purpose |
|---------|---------|
| `EasySale_EasySale-network` | Internal communication between services |

---

**Note**: This guide is specific to Windows deployment. For Linux deployment, see `docs/deployment/linux.md`.
