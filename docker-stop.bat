@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Docker Stop Script (Windows)
REM ============================================
REM Stops all EasySale Docker containers (dev and prod)
REM
REM Usage: docker-stop.bat [options]
REM Options:
REM   --dev         Stop only development containers
REM   --prod        Stop only production containers
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --help        Show this help message

REM CRITICAL: Always pause on errors so user can see them
set "PAUSE_ON_ERROR=1"

REM Parse arguments
set "NO_PAUSE="
set "DEV_ONLY="
set "PROD_ONLY="

:PARSE_ARGS
if "%~1"=="" goto END_PARSE_ARGS
if /i "%~1"=="--no-pause" (
    set "NO_PAUSE=1"
    set "PAUSE_ON_ERROR="
)
if /i "%~1"=="--dev" set "DEV_ONLY=1"
if /i "%~1"=="--prod" set "PROD_ONLY=1"
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
echo   EasySale - Docker Stop
echo ============================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    goto ERROR_EXIT
)

REM Stop development containers
if not defined PROD_ONLY (
    echo [1/2] Stopping development containers...
    docker-compose -p easysale down --remove-orphans >nul 2>&1
    docker stop easysale-frontend-dev easysale-backend-dev easysale-storybook-dev >nul 2>&1
    docker rm -f easysale-frontend-dev easysale-backend-dev easysale-storybook-dev >nul 2>&1
    echo [OK] Development containers stopped
)

REM Stop production containers
if not defined DEV_ONLY (
    echo [2/2] Stopping production containers...
    docker-compose -p easysale -f docker-compose.prod.yml down --remove-orphans >nul 2>&1
    docker stop easysale-frontend easysale-backend >nul 2>&1
    docker rm -f easysale-frontend easysale-backend >nul 2>&1
    echo [OK] Production containers stopped
)

echo.
echo ============================================
echo   All EasySale Services Stopped
echo ============================================
echo.
echo To restart:
echo   Development: start-dev.bat
echo   Production:  start-prod.bat
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
echo Usage: docker-stop.bat [options]
echo.
echo Options:
echo   --dev         Stop only development containers
echo   --prod        Stop only production containers
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --help        Show this help message
echo.
echo By default, stops both development and production containers.
echo.
exit /b 0
