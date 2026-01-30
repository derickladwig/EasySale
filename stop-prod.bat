@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Production Stop Script (Windows)
REM ============================================
REM Stops production Docker containers
REM Uses docker-compose.prod.yml (production configuration)
REM
REM Usage: stop-prod.bat [options]
REM Options:
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --volumes     Also remove production volumes (CAUTION: data loss!)
REM   --help        Show this help message

REM CRITICAL: Always pause on errors so user can see them
set "PAUSE_ON_ERROR=1"

REM Parse arguments
set "NO_PAUSE="
set "REMOVE_VOLUMES="

:PARSE_ARGS
if "%~1"=="" goto END_PARSE_ARGS
if /i "%~1"=="--no-pause" (
    set "NO_PAUSE=1"
    set "PAUSE_ON_ERROR="
)
if /i "%~1"=="--volumes" set "REMOVE_VOLUMES=1"
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
echo   EasySale - Production Stop
echo ============================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    goto ERROR_EXIT
)

REM Check for docker-compose.prod.yml
if not exist "docker-compose.prod.yml" (
    echo [ERROR] docker-compose.prod.yml not found!
    echo Make sure you're running from the project root.
    goto ERROR_EXIT
)

REM Check for LAN override file
set "COMPOSE_FILES=-f docker-compose.prod.yml"
if exist "runtime\docker-compose.override.yml" (
    set "COMPOSE_FILES=-f docker-compose.prod.yml -f runtime\docker-compose.override.yml"
)

REM Stop containers
echo [1/2] Stopping production containers...
if defined REMOVE_VOLUMES (
    echo.
    echo [WARNING] You are about to remove production volumes!
    echo This will DELETE ALL DATA including:
    echo   - Database (easysale_easysale-data)
    echo   - Uploaded files
    echo   - Configuration
    echo.
    if not defined NO_PAUSE (
        set /p CONFIRM="Are you sure? Type YES to confirm: "
        if /i not "!CONFIRM!"=="YES" (
            echo Cancelled.
            call :PAUSE_IF_INTERACTIVE
            exit /b 0
        )
    )
    docker-compose -p EasySale %COMPOSE_FILES% down -v
) else (
    docker-compose -p EasySale %COMPOSE_FILES% down
)

if errorlevel 1 (
    echo [WARNING] Some containers may not have stopped cleanly.
    echo Attempting force stop...
    docker stop easysale-frontend easysale-backend >nul 2>&1
    docker rm -f easysale-frontend easysale-backend >nul 2>&1
)
echo [OK] Production containers stopped

REM Show status
echo [2/2] Checking status...
docker ps --filter "name=EasySale" --format "table {{.Names}}\t{{.Status}}" 2>nul
echo.

echo ============================================
echo   Production Environment Stopped
echo ============================================
echo.
if defined REMOVE_VOLUMES (
    echo [WARNING] Volumes have been removed. All data is lost.
    echo Next start will create a fresh database.
) else (
    echo Data volumes preserved.
    echo Your database and files are safe.
)
echo.
echo To restart: start-prod.bat
echo To rebuild: build-prod.bat
echo.

call :PAUSE_IF_INTERACTIVE
exit /b 0

REM ============================================
REM ERROR EXIT - ALWAYS pauses so user can see error
REM ============================================
:ERROR_EXIT
echo.
echo ============================================
echo   STOP FAILED - See errors above
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
echo Usage: stop-prod.bat [options]
echo.
echo Options:
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --volumes     Also remove production volumes (CAUTION: data loss!)
echo   --help        Show this help message
echo.
echo This script stops all EasySale production containers.
echo.
echo By default, data volumes are preserved:
echo   - easysale_easysale-data (database and files)
echo.
echo Use --volumes ONLY if you want to completely reset the system.
echo This will DELETE ALL DATA and cannot be undone!
echo.
exit /b 0
