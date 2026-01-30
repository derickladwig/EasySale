@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Docker Clean Script (Windows)
REM ============================================
REM Stops and removes all EasySale Docker resources
REM WARNING: This will delete all data!
REM
REM Usage: docker-clean.bat [options]
REM Options:
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --help        Show this help message
REM
REM Exit Codes:
REM   0 = Success
REM   1 = General error
REM   2 = Missing dependency

REM ============================================
REM 1. REPO ROOT NORMALIZATION
REM ============================================
set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "REPO_ROOT=%SCRIPT_DIR%"

pushd "%REPO_ROOT%" || (
    echo [ERROR] Failed to change to repo root: %REPO_ROOT%
    exit /b 1
)

REM ============================================
REM 2. LOGGING SETUP
REM ============================================
set "LOG_DIR=%REPO_ROOT%\audit\windows_bat_validation_2026-01-25\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

set "LOG_FILE=%LOG_DIR%\docker-clean_%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%.log"
set "LOG_FILE=%LOG_FILE: =0%"

echo [%date% %time%] Starting docker-clean.bat > "%LOG_FILE%"
echo Script: %~f0 >> "%LOG_FILE%"
echo Working Directory: %CD% >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"

REM ============================================
REM 3. PARSE COMMAND LINE ARGUMENTS
REM ============================================
set "NO_PAUSE="
set "PAUSE_ON_ERROR=1"

:PARSE_ARGS
if "%~1"=="" goto END_PARSE_ARGS
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

REM ============================================
REM 4. DISPLAY HEADER
REM ============================================
echo.
echo ============================================
echo   EasySale - Docker Clean
echo ============================================
echo.
echo WARNING: This will remove:
echo   - All EasySale containers
echo   - All EasySale images
echo   - All EasySale volumes (DATA WILL BE LOST!)
echo   - EasySale network
echo.

REM ============================================
REM 5. CHECK PREREQUISITES
REM ============================================
where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed! >> "%LOG_FILE%"
    echo [ERROR] Docker is not installed!
    echo.
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    echo.
    goto ERROR_EXIT
)
echo [OK] Docker is installed >> "%LOG_FILE%"

REM ============================================
REM 6. CONFIRM DESTRUCTIVE ACTION
REM ============================================
if not defined NO_PAUSE (
    echo Press Ctrl+C to cancel, or
    pause
)

REM ============================================
REM 7. CLEAN DOCKER RESOURCES
REM ============================================
echo.
echo [1/6] Stopping containers...
echo [1/6] Stopping containers... >> "%LOG_FILE%"
docker-compose -p EasySale down -v >> "%LOG_FILE%" 2>&1
docker-compose -p EasySale -f docker-compose.prod.yml down -v >> "%LOG_FILE%" 2>&1
docker stop easysale-frontend-dev easysale-backend-dev easysale-storybook-dev >> "%LOG_FILE%" 2>&1
docker stop easysale-frontend easysale-backend easysale-storybook >> "%LOG_FILE%" 2>&1
echo [OK] Containers stopped
echo [OK] Containers stopped >> "%LOG_FILE%"

echo [2/6] Removing containers...
echo [2/6] Removing containers... >> "%LOG_FILE%"
docker rm -f easysale-frontend-dev easysale-backend-dev easysale-storybook-dev >> "%LOG_FILE%" 2>&1
docker rm -f easysale-frontend easysale-backend easysale-storybook >> "%LOG_FILE%" 2>&1
echo [OK] Containers removed
echo [OK] Containers removed >> "%LOG_FILE%"

echo [3/6] Removing images...
echo [3/6] Removing images... >> "%LOG_FILE%"
docker rmi easysale-backend:latest >> "%LOG_FILE%" 2>&1
docker rmi easysale-frontend:latest >> "%LOG_FILE%" 2>&1
echo [OK] Images removed
echo [OK] Images removed >> "%LOG_FILE%"

echo [4/6] Removing volumes...
echo [4/6] Removing volumes... >> "%LOG_FILE%"
echo Removing: easysale_easysale-data-dev
docker volume rm easysale_easysale-data-dev >> "%LOG_FILE%" 2>&1
echo Removing: easysale_easysale-data
docker volume rm easysale_easysale-data >> "%LOG_FILE%" 2>&1
echo Removing: easysale_easysale-cargo-registry
docker volume rm easysale_easysale-cargo-registry >> "%LOG_FILE%" 2>&1
echo Removing: easysale_easysale-cargo-git
docker volume rm easysale_easysale-cargo-git >> "%LOG_FILE%" 2>&1
echo Removing: easysale_easysale-target
docker volume rm easysale_easysale-target >> "%LOG_FILE%" 2>&1
echo Removing: easysale_easysale-frontend-modules
docker volume rm easysale_easysale-frontend-modules >> "%LOG_FILE%" 2>&1
echo [OK] Volumes removed
echo [OK] Volumes removed >> "%LOG_FILE%"

echo [5/6] Removing networks...
echo [5/6] Removing networks... >> "%LOG_FILE%"
docker network rm easysale-network >> "%LOG_FILE%" 2>&1
echo [OK] Networks removed
echo [OK] Networks removed >> "%LOG_FILE%"

echo [6/6] Pruning unused resources...
echo [6/6] Pruning unused resources... >> "%LOG_FILE%"
docker system prune -f >> "%LOG_FILE%" 2>&1
echo [OK] Cleanup complete
echo [OK] Cleanup complete >> "%LOG_FILE%"

REM ============================================
REM 8. SUCCESS EXIT
REM ============================================
echo.
echo ============================================
echo   Docker Clean Complete!
echo ============================================
echo.
echo All EasySale Docker resources have been removed.
echo You can now run build-prod-windows.bat for a fresh build.
echo.
echo [%date% %time%] Docker clean completed successfully >> "%LOG_FILE%"
echo Log file: %LOG_FILE%
echo.

call :PAUSE_IF_INTERACTIVE
popd
exit /b 0

REM ============================================
REM ERROR EXIT - ALWAYS pauses so user can see error
REM ============================================
:ERROR_EXIT
echo.
echo ============================================
echo   CLEAN FAILED - See errors above
echo ============================================
echo.
echo Error occurred at: %date% %time%
echo Working directory: %CD%
echo.
if defined PAUSE_ON_ERROR (
    echo Press any key to close this window...
    pause >nul
)
popd
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
echo Usage: docker-clean.bat [options]
echo.
echo Options:
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --help        Show this help message
echo.
echo Environment Variables:
echo   NO_PAUSE=1    Skip pause prompts
echo   CI=1          Automatically sets NO_PAUSE=1
echo.
echo This script removes all EasySale Docker resources:
echo   - Containers (dev and prod)
echo   - Images
echo   - Volumes (DATA WILL BE LOST!)
echo   - Networks
echo.
echo WARNING: This is a destructive operation!
echo.
popd
exit /b 0
