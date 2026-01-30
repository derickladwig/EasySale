@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Production Update Script (Windows)
REM ============================================
REM Updates dependencies and rebuilds production environment
REM Uses --release profile for optimized builds
REM
REM Usage: update-prod.bat [options]
REM Options:
REM   --frontend    Update frontend only (npm install)
REM   --backend     Update backend only (cargo update)
REM   --no-backup   Skip database backup before update
REM   --no-restart  Skip container restart after rebuild
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --help        Show this help message

REM CRITICAL: Always pause on errors so user can see them
set "PAUSE_ON_ERROR=1"

REM Parse arguments
set "FRONTEND_ONLY="
set "BACKEND_ONLY="
set "NO_BACKUP="
set "NO_RESTART="
set "NO_PAUSE="

:PARSE_ARGS
if "%~1"=="" goto END_PARSE_ARGS
if /i "%~1"=="--frontend" set "FRONTEND_ONLY=1"
if /i "%~1"=="--backend" set "BACKEND_ONLY=1"
if /i "%~1"=="--no-backup" set "NO_BACKUP=1"
if /i "%~1"=="--no-restart" set "NO_RESTART=1"
if /i "%~1"=="--no-pause" (
    set "NO_PAUSE=1"
    set "PAUSE_ON_ERROR="
)
if /i "%~1"=="--help" goto SHOW_HELP
shift
goto PARSE_ARGS
:END_PARSE_ARGS

if defined CI (
    set "NO_PAUSE=1"
    set "PAUSE_ON_ERROR="
)

echo.
echo ============================================
echo   EasySale - Production Update
echo ============================================
echo.
echo Mode: Production (--release profile)
echo.
echo [WARNING] This will rebuild production images and restart services.
echo           There will be brief downtime during the restart.
echo.

if not defined NO_PAUSE (
    set /p CONFIRM="Continue with production update? (Y/N): "
    if /i not "!CONFIRM!"=="Y" (
        echo Cancelled.
        exit /b 0
    )
)

REM Determine what to update
set "UPDATE_FRONTEND=1"
set "UPDATE_BACKEND=1"
if defined FRONTEND_ONLY (
    set "UPDATE_BACKEND="
    echo [INFO] Updating frontend only
)
if defined BACKEND_ONLY (
    set "UPDATE_FRONTEND="
    echo [INFO] Updating backend only
)

REM Check for required tools
echo [1/8] Checking prerequisites...

if defined UPDATE_FRONTEND (
    where npm >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] npm is not installed!
        echo Please install Node.js from https://nodejs.org/
        goto ERROR_EXIT
    )
    echo [OK] npm found
)

if defined UPDATE_BACKEND (
    where cargo >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] cargo is not installed!
        echo Please install Rust from https://rustup.rs/
        goto ERROR_EXIT
    )
    echo [OK] cargo found
)

REM Check Docker
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    goto ERROR_EXIT
)
echo [OK] Docker is running

REM Backup database before update
if not defined NO_BACKUP (
    echo.
    echo [2/8] Backing up production database...
    
    REM Create backup directory if it doesn't exist
    if not exist "runtime\backups" mkdir runtime\backups
    
    REM Generate timestamp for backup filename
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
    set BACKUP_FILE=runtime\backups\pos_backup_!datetime:~0,8!_!datetime:~8,6!.db
    
    REM Try to copy from Docker volume
    docker cp easysale-backend:/data/easysale.db "!BACKUP_FILE!" >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Database backed up to: !BACKUP_FILE!
    ) else (
        REM Try local database
        if exist "data\pos.db" (
            copy "data\pos.db" "!BACKUP_FILE!" >nul 2>&1
            echo [OK] Local database backed up to: !BACKUP_FILE!
        ) else (
            echo [WARNING] No database found to backup
        )
    )
) else (
    echo [2/8] Skipping database backup (--no-backup flag)
)

REM Update frontend dependencies
if defined UPDATE_FRONTEND (
    echo.
    echo [3/8] Updating frontend dependencies...
    if not exist "frontend" (
        echo [ERROR] frontend directory not found!
        goto ERROR_EXIT
    )
    cd frontend
    echo Running npm install...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed!
        cd ..
        goto ERROR_EXIT
    )
    echo [OK] Frontend dependencies updated
    cd ..
) else (
    echo [3/8] Skipping frontend update (--backend flag)
)

REM Update backend dependencies
if defined UPDATE_BACKEND (
    echo.
    echo [4/8] Updating backend dependencies...
    if not exist "backend" (
        echo [ERROR] backend directory not found!
        goto ERROR_EXIT
    )
    cd backend
    echo Running cargo update...
    cargo update
    if errorlevel 1 (
        echo [WARNING] cargo update had issues, continuing...
    )
    echo [OK] Backend dependencies updated
    cd ..
) else (
    echo [4/8] Skipping backend update (--frontend flag)
)

REM Prepare sqlx offline mode
if defined UPDATE_BACKEND (
    echo.
    echo [5/8] Preparing sqlx offline mode...
    pushd backend
    set DATABASE_URL=sqlite:../data/pos.db
    cargo sqlx prepare --workspace >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Could not prepare sqlx offline mode
    ) else (
        echo [OK] Offline mode prepared
    )
    popd
) else (
    echo [5/8] Skipping sqlx prepare (--frontend flag)
)

REM Stop production containers
echo.
echo [6/8] Stopping production containers...
docker-compose -p EasySale -f docker-compose.prod.yml down >nul 2>&1
echo [OK] Containers stopped

REM Rebuild production images
echo.
echo [7/8] Rebuilding production images (--release profile)...
echo This may take several minutes for optimized builds...

if not exist "docker-compose.prod.yml" (
    echo [ERROR] docker-compose.prod.yml not found!
    goto ERROR_EXIT
)

if defined UPDATE_FRONTEND (
    echo Building frontend image...
    docker build --no-cache -t easysale-frontend:latest ./frontend
    if errorlevel 1 (
        echo [ERROR] Frontend build failed!
        goto ERROR_EXIT
    )
    echo [OK] Frontend image rebuilt
)

if defined UPDATE_BACKEND (
    echo Building backend image (release profile)...
    docker build --no-cache -f Dockerfile.backend -t easysale-backend:latest .
    if errorlevel 1 (
        echo [ERROR] Backend build failed!
        goto ERROR_EXIT
    )
    echo [OK] Backend image rebuilt
)

REM Restart production containers
if not defined NO_RESTART (
    echo.
    echo [8/8] Starting production containers...
    
    REM Check for LAN override file
    set "COMPOSE_FILES=-f docker-compose.prod.yml"
    if exist "runtime\docker-compose.override.yml" (
        set "COMPOSE_FILES=-f docker-compose.prod.yml -f runtime\docker-compose.override.yml"
    )
    
    docker-compose -p EasySale %COMPOSE_FILES% up -d
    if errorlevel 1 (
        echo [ERROR] Failed to start containers!
        echo Check logs: docker-compose -p EasySale -f docker-compose.prod.yml logs
        goto ERROR_EXIT
    )
    
    REM Wait for services to be healthy
    echo Waiting for services to become healthy...
    set RETRIES=0
    :HEALTH_CHECK
    timeout /t 3 /nobreak >nul
    set /a RETRIES+=1
    
    curl -s http://localhost:8923/health >nul 2>&1
    if errorlevel 1 (
        if %RETRIES% lss 20 (
            echo   Waiting for backend... [%RETRIES%/20]
            goto HEALTH_CHECK
        ) else (
            echo [WARNING] Backend health check timed out
        )
    ) else (
        echo [OK] Backend is healthy
    )
    
    curl -s http://localhost:7945 >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Frontend may not be ready yet
    ) else (
        echo [OK] Frontend is responding
    )
) else (
    echo [8/8] Skipping container restart (--no-restart flag)
    echo Run: start-prod.bat to start the updated containers
)

echo.
echo ============================================
echo   Production Update Complete!
echo ============================================
echo.
if not defined NO_BACKUP echo   [OK] Database: backed up
if defined UPDATE_FRONTEND echo   [OK] Frontend: npm packages updated, image rebuilt
if defined UPDATE_BACKEND echo   [OK] Backend: cargo packages updated, image rebuilt
if not defined NO_RESTART echo   [OK] Services: restarted
echo.
echo Access URLs:
echo   Frontend:  http://localhost:7945
echo   Backend:   http://localhost:8923
echo   Health:    http://localhost:8923/health
echo.
echo Useful commands:
echo   View logs:  docker-compose -p EasySale -f docker-compose.prod.yml logs -f
echo   Stop:       stop-prod.bat
echo.

call :PAUSE_IF_INTERACTIVE
exit /b 0

REM ============================================
REM ERROR EXIT - ALWAYS pauses so user can see error
REM ============================================
:ERROR_EXIT
echo.
echo ============================================
echo   UPDATE FAILED - See errors above
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
echo Usage: update-prod.bat [options]
echo.
echo Options:
echo   --frontend    Update frontend only (npm install)
echo   --backend     Update backend only (cargo update)
echo   --no-backup   Skip database backup before update
echo   --no-restart  Skip container restart after rebuild
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --help        Show this help message
echo.
echo This script:
echo   1. Backs up the production database
echo   2. Updates frontend npm packages (npm install)
echo   3. Updates backend cargo packages (cargo update)
echo   4. Prepares sqlx offline mode
echo   5. Rebuilds production Docker images (--release profile)
echo   6. Restarts production containers
echo.
echo Examples:
echo   update-prod.bat                  Full production update
echo   update-prod.bat --frontend       Update frontend only
echo   update-prod.bat --backend        Update backend only
echo   update-prod.bat --no-backup      Skip database backup
echo   update-prod.bat --no-restart     Update without restarting
echo.
echo [WARNING] Production updates cause brief downtime during restart.
echo           Always ensure you have a recent backup before updating.
echo.
exit /b 0
