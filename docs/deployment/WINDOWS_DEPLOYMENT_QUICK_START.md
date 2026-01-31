# EasySale - Windows Deployment Quick Start

**Last Updated**: 2026-01-25

## For Fresh Windows Installation

Just run this one command:

```cmd
build-prod-windows.bat
```

That's it! The script will:
1. Check prerequisites (Docker, PowerShell)
2. Run configuration wizard
3. Clean Docker resources
4. Build production images
5. Start services
6. Print access URLs

## First-Time Setup

1. **Install Docker Desktop**:
   - Download: https://www.docker.com/products/docker-desktop
   - Start Docker Desktop and wait for it to be ready

2. **Clone Repository**:
   ```cmd
   git clone <repository-url>
   cd EasySale
   ```

3. **Run Deployment**:
   ```cmd
   build-prod-windows.bat
   ```

4. **Follow Configuration Wizard**:
   - Tenant ID: Your business identifier (e.g., `my-retail-store`)
   - Store ID: This location identifier (e.g., `store-001`)
   - Store Name: Human-readable name (e.g., `Main Store`)
   - JWT Secret: Leave blank to auto-generate
   - Ports: Use defaults (API: 8923, Frontend: 7945)

5. **Wait for Build** (10-15 minutes first time)

6. **Access Application**:
   - Frontend: http://localhost:7945
   - Backend: http://localhost:8923
   - Health: http://localhost:8923/health

## Common Commands

### Rebuild (Keep Configuration)
```cmd
build-prod-windows.bat --skip-wizard
```

### Rebuild (Skip Clean)
```cmd
build-prod-windows.bat --skip-clean
```

### CI/Automation Mode
```cmd
build-prod-windows.bat --no-pause --skip-wizard
```

### View Logs
```cmd
docker-compose -p easysale -f docker-compose.prod.yml logs -f
```

### Stop Services
```cmd
docker-stop.bat
```

### Clean Everything
```cmd
docker-clean.bat
```

## Troubleshooting

### Docker Not Running
1. Open Docker Desktop
2. Wait for green icon in system tray
3. Run script again

### Port Already in Use
Edit `.env` file and change ports:
```
API_PORT=8924
VITE_PORT=7946
```

### Build Fails
Check log file:
```
audit\windows_bat_validation_2026-01-25\logs\build-prod-windows_*.log
```

### Frontend Build Error (ENOENT)
See detailed diagnostics in: `docs/DEPLOYMENT_WINDOWS.md` (Section 6.3.1)

## Full Documentation

For complete documentation, see:
- **Windows Deployment Guide**: `docs/DEPLOYMENT_WINDOWS.md`
- **Configuration Wizard**: `scripts/preflight.ps1 -Help`
- **Build Script Help**: `build-prod-windows.bat --help`

## Support

- Log files: `audit/windows_bat_validation_2026-01-25/logs/`
- Documentation: `docs/` folder
- Issues: GitHub Issues

---

**Quick Start**: Just run `build-prod-windows.bat` and follow the prompts!
