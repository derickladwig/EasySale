# EasySale — Automation Scripts

**Version**: 1.0  
**Last Updated**: 2026-01-29  
**Platform**: Windows (batch files)

---

## Table of Contents

1. [Existing Scripts Inventory](#1-existing-scripts-inventory)
2. [Script Details](#2-script-details)
3. [Proposed New Scripts](#3-proposed-new-scripts)
4. [CI/CD Scripts](#4-cicd-scripts)
5. [Acceptance Tests](#5-acceptance-tests)

---

## 1. Existing Scripts Inventory

### Root Directory Scripts

| Script | Purpose | Status |
|--------|---------|--------|
| `start-dev.bat` | Start development Docker containers | ✅ Complete |
| `stop-dev.bat` | Stop development containers | ✅ Complete |
| `build-dev.bat` | Build development Docker images | ✅ Complete |
| `update-dev.bat` | Update dependencies (dev) | ✅ Complete |
| `start-prod.bat` | Start production containers | ✅ Complete |
| `stop-prod.bat` | Stop production containers | ✅ Complete |
| `build-prod.bat` | Build production images | ✅ Complete |
| `update-prod.bat` | Update dependencies (prod) | ✅ Complete |
| `docker-clean.bat` | Remove all Docker resources | ✅ Complete |
| `docker-stop.bat` | Stop all containers | ✅ Complete |

### Shell Scripts (Linux/macOS)

| Script | Purpose |
|--------|---------|
| `setup.sh` | Initial setup |
| `build-prod.sh` | Linux production build |
| `docker-start.sh` | Start Docker (Linux) |
| `docker-stop.sh` | Stop Docker (Linux) |
| `validate-build.sh` | Validate build |

### CI Scripts (`ci/`)

| Script | Purpose |
|--------|---------|
| `build.ps1` | PowerShell build script |
| `package.ps1` | Package for distribution |
| `package-windows.ps1` | Windows-specific packaging |
| `readiness-gate.ps1` | Production readiness checks |
| `preflight.ps1` | Pre-deployment checks |
| `archive-code.ps1` | Archive old code |
| `placeholder-scanner.ps1` | Scan for placeholders |

---

## 2. Script Details

### start-dev.bat

**Purpose**: Start development Docker containers with hot-reload

**Usage**:
```batch
start-dev.bat [options]

Options:
  --no-browser    Skip auto-opening browser
  --no-pause      Skip pause prompts (for CI)
  --storybook     Also start Storybook service
  --help          Show help message
```

**What it does**:
1. Checks Docker is running
2. Stops any existing containers
3. Builds and starts containers
4. Waits for services to be healthy
5. Opens browser to http://localhost:7945

**Exit codes**:
- `0` = Success
- `1` = Error (Docker not running, build failed, etc.)

---

### stop-dev.bat

**Purpose**: Stop development Docker containers

**Usage**:
```batch
stop-dev.bat [options]

Options:
  --no-pause      Skip pause prompts
  --volumes       Also remove development volumes
  --help          Show help message
```

**What it does**:
1. Stops all development containers
2. Optionally removes volumes (clean slate)

---

### build-dev.bat

**Purpose**: Build development Docker images (debug profile)

**Usage**:
```batch
build-dev.bat [options]

Options:
  --no-pause      Skip pause prompts
  --no-cache      Force rebuild without cache
  --help          Show help message
```

**What it does**:
1. Syncs frontend dependencies
2. Builds frontend image (Dockerfile.dev)
3. Builds backend image (Dockerfile.dev, debug profile)

---

### build-prod.bat

**Purpose**: Build production Docker images (release profile)

**Usage**:
```batch
build-prod.bat [options]

Options:
  --no-pause      Skip pause prompts
  --validate      Run validation before build
  --lite          Build lite variant (core POS only)
  --export        Build export variant (default)
  --full          Build full variant (all features)
  --help          Show help message
```

**What it does**:
1. Syncs frontend dependencies
2. Prepares sqlx offline mode
3. Builds frontend image (production)
4. Builds backend image (release profile)
5. Starts production containers
6. Waits for health checks

**Build variants**:
| Variant | Features | Binary Size |
|---------|----------|-------------|
| lite | Core POS only | ~20 MB |
| export | + CSV export | ~25 MB |
| full | + OCR, documents | ~35 MB |

---

### start-prod.bat

**Purpose**: Start production Docker containers

**Usage**:
```batch
start-prod.bat [options]

Options:
  --no-browser    Skip auto-opening browser
  --no-pause      Skip pause prompts
  --help          Show help message
```

**What it does**:
1. Checks for LAN configuration override
2. Stops existing containers
3. Starts production containers
4. Waits for health checks
5. Opens browser

---

### docker-clean.bat

**Purpose**: Remove all EasySale Docker resources

**Usage**:
```batch
docker-clean.bat [options]

Options:
  --no-pause      Skip pause prompts
  --help          Show help message
```

**⚠️ WARNING**: This is destructive! Removes:
- All EasySale containers
- All EasySale images
- All EasySale volumes (DATA LOSS!)
- EasySale network

---

### update-dev.bat / update-prod.bat

**Purpose**: Update dependencies and rebuild

**Usage**:
```batch
update-dev.bat [options]
update-prod.bat [options]

Options:
  --frontend      Update frontend only
  --backend       Update backend only
  --no-rebuild    Skip Docker rebuild
  --no-backup     Skip database backup (prod only)
  --no-restart    Skip container restart (prod only)
  --no-pause      Skip pause prompts
  --help          Show help message
```

**What it does**:
1. Updates npm packages (`npm install`)
2. Updates cargo packages (`cargo update`)
3. Rebuilds Docker images
4. Restarts containers (prod only)

---

## 3. Proposed New Scripts

### setup.bat (Windows Fresh Install)

**Purpose**: One-command fresh install setup

```batch
@echo off
REM EasySale - Fresh Install Setup (Windows)

echo [1/4] Setting up environment configuration...
if not exist ".env" (
    copy .env.example .env
    echo [OK] Created .env from template
)

echo [2/4] Installing frontend dependencies...
cd frontend
call npm install --legacy-peer-deps
cd ..

echo [3/4] Checking Rust installation...
where cargo >nul 2>&1 || (
    echo [ERROR] Rust not found! Install from rustup.rs
    exit /b 1
)

echo [4/4] Creating data directory...
if not exist "data" mkdir data

echo Setup complete! Run start-dev.bat to begin.
```

---

### smoke-test.bat (Quick Verification)

**Purpose**: Quick smoke test for running services

```batch
@echo off
REM EasySale - Smoke Test

echo [1/4] Checking backend health...
curl -s http://localhost:8923/health | findstr "ok" >nul
if errorlevel 1 (echo [FAIL] Backend) else (echo [OK] Backend)

echo [2/4] Checking frontend...
curl -s -o nul -w "%%{http_code}" http://localhost:7945 | findstr "200" >nul
if errorlevel 1 (echo [FAIL] Frontend) else (echo [OK] Frontend)

echo [3/4] Checking API capabilities...
curl -s http://localhost:8923/api/capabilities >nul
if errorlevel 1 (echo [FAIL] API) else (echo [OK] API)

echo [4/4] Checking database...
curl -s http://localhost:8923/api/products?limit=1 >nul
if errorlevel 1 (echo [FAIL] Database) else (echo [OK] Database)

echo Smoke test complete!
```

---

### health-check.bat (Standalone Health Check)

**Purpose**: Detailed health check with output

```batch
@echo off
REM EasySale - Health Check

echo Checking EasySale services...
echo.

echo Backend (http://localhost:8923/health):
curl -s http://localhost:8923/health
echo.

echo Frontend (http://localhost:7945):
curl -s -o nul -w "HTTP Status: %%{http_code}" http://localhost:7945
echo.

echo Capabilities:
curl -s http://localhost:8923/api/capabilities
echo.
```

---

### reset-dev.bat (Clean Reset)

**Purpose**: One-command clean reset for development

```batch
@echo off
REM EasySale - Development Reset

echo Resetting development environment...
call docker-clean.bat --no-pause
call build-dev.bat --no-pause
call start-dev.bat --no-pause
```

---

## 4. CI/CD Scripts

### Property Tests (`ci/*.property.test.ts`)

The CI folder contains 20+ property-based tests:

| Test File | Purpose |
|-----------|---------|
| `archive-exclusion.property.test.ts` | Verify archive exclusions |
| `database-path-consistency.property.test.ts` | Check DB path consistency |
| `export-implementation.property.test.ts` | Verify export features |
| `installer-location-compliance.property.test.ts` | Check installer paths |
| `localhost-oauth-rejection.property.test.ts` | Reject localhost OAuth in prod |
| `oauth-config-source.property.test.ts` | Verify OAuth config |
| `placeholder-secret-rejection.property.test.ts` | Reject placeholder secrets |
| `preflight-blocking-checks.property.test.ts` | Preflight validations |
| `qbo-sanitization.property.test.ts` | QuickBooks data sanitization |
| `readiness-gate-*.property.test.ts` | Production readiness checks |
| `sql-allowlist.property.test.ts` | SQL injection prevention |
| `stale-path-detection.property.test.ts` | Detect stale file paths |

**Running CI tests**:
```bash
cd ci
npm install
npm test
```

---

### readiness-gate.ps1

**Purpose**: Production readiness gate checks

**What it checks**:
- No placeholder secrets
- No localhost OAuth URIs
- No mock data in production code
- All required files present
- Build artifacts valid

**Usage**:
```powershell
.\ci\readiness-gate.ps1
```

---

### preflight.ps1

**Purpose**: Pre-deployment validation

**What it checks**:
- Environment variables set
- Dependencies installed
- Build succeeds
- Tests pass
- No security vulnerabilities

**Usage**:
```powershell
.\scripts\preflight.ps1
```

---

## 5. Acceptance Tests

### Script Acceptance Criteria

Each script should:

- [ ] Exit with code 0 on success
- [ ] Exit with code 1+ on failure
- [ ] Display clear error messages
- [ ] Support `--help` flag
- [ ] Support `--no-pause` for CI
- [ ] Log actions to console
- [ ] Handle missing dependencies gracefully

### Automation Test Matrix

| Script | Manual Test | CI Test |
|--------|-------------|---------|
| `start-dev.bat` | ✅ | ✅ |
| `stop-dev.bat` | ✅ | ✅ |
| `build-dev.bat` | ✅ | ✅ |
| `start-prod.bat` | ✅ | ✅ |
| `stop-prod.bat` | ✅ | ✅ |
| `build-prod.bat` | ✅ | ✅ |
| `docker-clean.bat` | ✅ | ⚠️ (destructive) |
| `update-dev.bat` | ✅ | ✅ |
| `update-prod.bat` | ✅ | ✅ |

### CI Integration

Add to `.github/workflows/ci.yml`:

```yaml
- name: Run smoke test
  run: |
    start-dev.bat --no-pause --no-browser
    timeout 120
    smoke-test.bat
    stop-dev.bat --no-pause
```

---

## Environment Variables

Scripts respect these environment variables:

| Variable | Purpose | Default |
|----------|---------|---------|
| `NO_PAUSE` | Skip pause prompts | (unset) |
| `CI` | CI mode (sets NO_PAUSE) | (unset) |
| `COMPOSE_PROJECT_NAME` | Docker project name | `EasySale` |

---

## Troubleshooting Scripts

### Common Issues

| Issue | Solution |
|-------|----------|
| Script hangs | Check Docker Desktop is running |
| Permission denied | Run as Administrator |
| Port in use | Run `docker-clean.bat` first |
| Build fails | Check `docker-compose logs` |

### Debug Mode

Add `echo` statements or use:
```batch
@echo on
```

at the start of scripts for verbose output.

---

*For installation guide, see [INSTALL.md](INSTALL.md). For checklists, see [CHECKLISTS.md](CHECKLISTS.md).*
