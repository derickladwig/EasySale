@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Production Build Script (Windows)
REM ============================================
REM Builds production Docker images and starts services
REM Uses --release profile for optimized Rust builds
REM Network: easysale-network | Volume: easysale-data
REM
REM Usage: build-prod.bat [options]
REM Options:
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --validate    Run validation before build
REM   --lite        Build lite variant (core POS only)
REM   --export      Build export variant (default, + CSV export)
REM   --full        Build full variant (+ OCR, document processing)
REM   --help        Show this help message
REM
REM Build Profile: RELEASE (optimized, smaller binaries)
REM CORS: Configurable via environment variables

REM CRITICAL: Always pause on errors so user can see them
REM This flag is ONLY cleared by explicit --no-pause or CI mode
set "PAUSE_ON_ERROR=1"
set "PAUSE_ON_EXIT=1"

REM Parse arguments
set "NO_PAUSE="
set "DO_VALIDATE="
set "BUILD_VARIANT=export"

:PARSE_ARGS
if "%~1"=="" goto END_PARSE_ARGS
if /i "%~1"=="--no-pause" (
    set "NO_PAUSE=1"
    set "PAUSE_ON_EXIT="
    set "PAUSE_ON_ERROR="
)
if /i "%~1"=="--validate" set "DO_VALIDATE=1"
if /i "%~1"=="--help" goto SHOW_HELP
if /i "%~1"=="--lite" set "BUILD_VARIANT=lite"
if /i "%~1"=="--export" set "BUILD_VARIANT=export"
if /i "%~1"=="--full" set "BUILD_VARIANT=full"
shift
goto PARSE_ARGS
:END_PARSE_ARGS

REM Map variant to features
set "FEATURES="
if /i "%BUILD_VARIANT%"=="export" set "FEATURES=export"
if /i "%BUILD_VARIANT%"=="full" set "FEATURES=full"

if defined CI (
    set "NO_PAUSE=1"
    set "PAUSE_ON_EXIT="
    set "PAUSE_ON_ERROR="
)

echo.
echo ============================================
echo   EasySale - Production Build
echo   Variant: %BUILD_VARIANT%
echo ============================================
echo.

REM Check if Docker is installed
where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed!
    echo.
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    echo.
    goto ERROR_EXIT
)

REM Check if Docker is running
echo [1/11] Checking Docker status...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo.
    echo Please start Docker Desktop and wait for it to be ready.
    echo Then run this script again.
    echo.
    goto ERROR_EXIT
)
echo [OK] Docker is running

REM Check if docker-compose.prod.yml exists
echo [2/11] Checking configuration files...
echo [INFO] Production build uses --release profile (optimized binaries)
if not exist "docker-compose.prod.yml" (
    echo [ERROR] docker-compose.prod.yml not found!
    echo.
    echo Make sure you're running this script from the project root directory.
    echo Current directory: %CD%
    echo.
    goto ERROR_EXIT
)
echo [OK] Configuration files found

REM Check if frontend directory exists
if not exist "frontend" (
    echo [ERROR] frontend directory not found!
    goto ERROR_EXIT
)

REM Check if backend directory exists
if not exist "backend" (
    echo [ERROR] backend directory not found!
    goto ERROR_EXIT
)

REM Sync frontend package-lock.json before Docker build
echo [3/11] Syncing frontend dependencies...
pushd frontend
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo [WARNING] npm install had issues, continuing anyway...
)
popd
echo [OK] Frontend dependencies synced

REM Optional: Run validation first
if defined DO_VALIDATE (
    echo [INFO] Running build validation first...
    call validate-build.bat --no-pause
    if errorlevel 1 (
        echo [ERROR] Validation failed!
        goto ERROR_EXIT
    )
)

REM Clean up any old resources
echo [4/11] Cleaning up legacy resources...
docker-compose -p easysale down -v >nul 2>&1
docker-compose -p easysale -f docker-compose.prod.yml down -v >nul 2>&1
docker rm -f easysale-frontend easysale-backend >nul 2>&1
docker network rm easysale-network >nul 2>&1
echo [OK] Legacy cleanup complete

REM Generate build info for both frontend and backend
for /f "tokens=*" %%a in ('powershell -Command "Get-Date -Format \"yyyy-MM-dd\""') do set "BUILD_DATE=%%a"
for /f "tokens=*" %%a in ('git rev-parse --short HEAD 2^>nul') do set "GIT_HASH=%%a"
if not defined GIT_HASH set "GIT_HASH=release"
set "BUILD_HASH=%BUILD_DATE%-%GIT_HASH%"
echo Build info: v0.1.0 / %BUILD_HASH%

REM Build frontend
echo [5/11] Building frontend image...
echo This may take several minutes...
echo Removing old frontend image if exists...
docker rmi easysale-frontend:latest >nul 2>&1
echo Building with --no-cache to ensure fresh build...
docker build --no-cache --build-arg VITE_APP_VERSION="0.1.0" --build-arg VITE_BUILD_HASH="%GIT_HASH%" --build-arg VITE_BUILD_DATE="%BUILD_DATE%" --build-arg VITE_RUNTIME_PROFILE="prod" --build-arg VITE_BUILD_VARIANT="%BUILD_VARIANT%" -t easysale-frontend:latest ./frontend
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend build failed!
    echo Check the error messages above for details.
    goto ERROR_EXIT
)
echo [OK] Frontend image built successfully

REM Prepare sqlx offline mode
echo [6/11] Preparing sqlx offline mode...
pushd backend
set SQLX_OFFLINE=false
set DATABASE_URL=sqlite:../data/pos.db
echo Running cargo sqlx prepare to update query cache...
echo Preparing queries for all feature combinations...
cargo sqlx prepare --workspace -- --features "full" 2>&1
if errorlevel 1 (
    echo [WARNING] Could not prepare sqlx offline mode with full features
    echo Trying without features...
    cargo sqlx prepare --workspace 2>&1
    if errorlevel 1 (
        echo [WARNING] sqlx prepare failed - Docker build may fail
        echo Make sure the database exists at data/pos.db
    )
)
popd
echo [OK] Offline mode prepared

REM Build backend
echo [7/11] Building backend image (RELEASE profile, variant: %BUILD_VARIANT%)...
echo This may take several minutes (optimized build)...
echo Removing old backend image if exists...
docker rmi easysale-backend:latest >nul 2>&1
echo Building with --no-cache and --release profile...
echo Build hash: %BUILD_HASH%

if "%FEATURES%"=="" goto BUILD_LITE
echo Building with features: %FEATURES%
docker build --no-cache --build-arg FEATURES="%FEATURES%" --build-arg BUILD_HASH="%BUILD_HASH%" -f Dockerfile.backend -t easysale-backend:latest .
goto CHECK_BACKEND_BUILD

:BUILD_LITE
echo Building LITE variant (no optional features)...
docker build --no-cache --build-arg FEATURES="" --build-arg BUILD_HASH="%BUILD_HASH%" -f Dockerfile.backend -t easysale-backend:latest .

:CHECK_BACKEND_BUILD
if errorlevel 1 (
    echo.
    echo [ERROR] Backend build failed!
    echo Check the error messages above for details.
    goto ERROR_EXIT
)
echo [OK] Backend image built successfully (variant: %BUILD_VARIANT%)

REM Show image sizes
echo [8/11] Checking image sizes...
docker images | findstr EasySale
echo.

REM Stop any existing production containers
echo [9/11] Stopping existing containers...
docker-compose -p easysale -f docker-compose.prod.yml down >nul 2>&1

REM Start production environment
echo [10/11] Starting production environment...
docker-compose -p easysale -f docker-compose.prod.yml up -d
set COMPOSE_EXIT=%errorlevel%

REM Check if containers are actually running (more reliable than exit code)
REM docker-compose can return non-zero for warnings even when containers start
timeout /t 3 /nobreak >nul
docker ps --filter "name=easysale-backend" --format "{{.Status}}" | findstr /i "Up" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Backend container failed to start!
    echo docker-compose exit code was: %COMPOSE_EXIT%
    echo.
    echo Checking backend logs:
    docker logs easysale-backend --tail 50 2>nul
    echo.
    echo Try running: docker-compose -p easysale -f docker-compose.prod.yml logs
    goto ERROR_EXIT
)
docker ps --filter "name=easysale-frontend" --format "{{.Status}}" | findstr /i "Up" >nul 2>&1
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend container failed to start!
    echo docker-compose exit code was: %COMPOSE_EXIT%
    echo.
    echo Checking frontend logs:
    docker logs easysale-frontend --tail 50 2>nul
    goto ERROR_EXIT
)
echo [OK] Containers started successfully

REM Copy local database to Docker if it exists (ensures users have correct tenant_id)
echo [11/11] Syncing local database to Docker...
if exist "data\pos.db" (
    echo Copying local database to Docker container...
    docker cp data\pos.db easysale-backend:/data/EasySale.db >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Local database synced to Docker
        docker restart easysale-backend >nul 2>&1
        timeout /t 5 /nobreak >nul
    ) else (
        echo [WARNING] Could not copy database - using Docker volume database
    )
) else (
    echo [INFO] No local database found - using Docker volume database
)

REM Wait for services to be healthy
echo.
echo Waiting for services to become healthy...
set RETRIES=0
:HEALTH_CHECK
timeout /t 3 /nobreak >nul
set /a RETRIES+=1

REM Check backend health using PowerShell (more reliable on Windows)
powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:8923/health' -UseBasicParsing -TimeoutSec 5; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    if %RETRIES% lss 20 (
        echo   Waiting for backend... [%RETRIES%/20]
        goto HEALTH_CHECK
    ) else (
        echo [WARNING] Backend health check timed out
        echo Check logs: docker-compose -f docker-compose.prod.yml logs backend
    )
) else (
    echo [OK] Backend is healthy
)

REM Check frontend using PowerShell
powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:7945' -UseBasicParsing -TimeoutSec 5; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Frontend may not be ready yet
) else (
    echo [OK] Frontend is responding
)

echo.
echo ============================================
echo   Production Environment Started!
echo ============================================
echo.
echo Access the application:
echo   Frontend:  http://localhost:7945
echo   Backend:   http://localhost:8923
echo   Health:    http://localhost:8923/health
echo.
echo Network: easysale-network
echo Volume:  easysale_easysale-data
echo.
echo Useful commands:
echo   View logs:     docker-compose -p easysale -f docker-compose.prod.yml logs -f
echo   Stop services: docker-stop.bat
echo   Clean all:     docker-clean.bat
echo.
echo Build complete! Services are running.
echo.
if not defined NO_PAUSE (
    echo Press any key to close this window...
    pause >nul
)
exit /b 0

REM ============================================
REM ERROR EXIT - ALWAYS pauses so user can see error
REM ============================================
:ERROR_EXIT
echo.
echo ============================================
echo   BUILD FAILED - See errors above
echo ============================================
echo.
echo Error occurred at: %date% %time%
echo Working directory: %CD%
echo.
if defined PAUSE_ON_ERROR (
    echo Press any key to close this window...
    pause >nul
)
exit /b 1

REM ============================================
REM HELPER FUNCTIONS
REM ============================================

:PAUSE_IF_INTERACTIVE
if not defined NO_PAUSE (
    echo Press any key to continue...
    pause >nul
)
goto :EOF

:SHOW_HELP
echo.
echo Usage: build-prod.bat [options]
echo.
echo Options:
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --validate    Run validation before build
echo   --lite        Build lite variant (core POS only, smallest binary)
echo   --export      Build export variant (default, + CSV export for QuickBooks)
echo   --full        Build full variant (+ OCR, document processing, cleanup)
echo   --help        Show this help message
echo.
echo Build Variants:
echo   lite          Core POS functionality only (~20MB binary)
echo   export        + CSV export for accounting integration (~25MB binary)
echo   full          + OCR, document processing, cleanup engine (~35MB binary)
echo.
echo Environment Variables:
echo   NO_PAUSE=1    Skip pause prompts
echo   CI=1          Automatically sets NO_PAUSE=1
echo.
exit /b 0
