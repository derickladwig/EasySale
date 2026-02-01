@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Development Stop Script (Windows)
REM ============================================
REM Stops development Docker containers
REM Uses docker-compose.yml (development configuration)
REM
REM Usage: stop-dev.bat [options]
REM Options:
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --volumes     Also remove development volumes
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
echo   EasySale - Development Stop
echo ============================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    goto ERROR_EXIT
)

REM Check for docker-compose.yml
if not exist "docker-compose.yml" (
    echo [ERROR] docker-compose.yml not found!
    echo Make sure you're running from the project root.
    goto ERROR_EXIT
)

REM Stop containers
echo [1/2] Stopping development containers...
if defined REMOVE_VOLUMES (
    echo [INFO] Also removing volumes...
    docker-compose -p easysale down -v
) else (
    docker-compose -p easysale down
)

if errorlevel 1 (
    echo [WARNING] Some containers may not have stopped cleanly.
    echo Attempting force stop...
    docker stop easysale-frontend-dev easysale-backend-dev easysale-storybook-dev >nul 2>&1
    docker rm -f easysale-frontend-dev easysale-backend-dev easysale-storybook-dev >nul 2>&1
)
echo [OK] Containers stopped

REM Show status
echo [2/2] Checking status...
docker ps --filter "name=EasySale" --format "table {{.Names}}\t{{.Status}}" 2>nul
echo.

echo ============================================
echo   Development Environment Stopped
echo ============================================
echo.
if defined REMOVE_VOLUMES (
    echo Volumes have been removed.
    echo Next start will require fresh npm install and cargo build.
) else (
    echo Volumes preserved (node_modules, cargo cache, target).
    echo Next start will be faster.
)
echo.
echo To restart: start-dev.bat
echo To clean all: docker-clean.bat
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
echo Usage: stop-dev.bat [options]
echo.
echo Options:
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --volumes     Also remove development volumes (node_modules, cargo cache)
echo   --help        Show this help message
echo.
echo This script stops all EasySale development containers.
echo.
echo By default, volumes are preserved for faster restarts:
echo   - easysale-frontend-modules (node_modules)
echo   - easysale-cargo-registry (cargo dependencies)
echo   - easysale-cargo-git (cargo git dependencies)
echo   - easysale-target (compiled Rust artifacts)
echo   - easysale-data-dev (development database)
echo.
echo Use --volumes to remove all volumes for a clean slate.
echo.
exit /b 0
