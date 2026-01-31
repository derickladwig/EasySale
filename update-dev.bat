@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Development Update Script (Windows)
REM ============================================
REM Updates dependencies and rebuilds development environment
REM Uses debug profile for faster compilation
REM
REM Usage: update-dev.bat [options]
REM Options:
REM   --frontend    Update frontend only (npm install)
REM   --backend     Update backend only (cargo update)
REM   --no-rebuild  Skip Docker image rebuild
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --help        Show this help message

REM CRITICAL: Always pause on errors so user can see them
set "PAUSE_ON_ERROR=1"

REM Parse arguments
set "FRONTEND_ONLY="
set "BACKEND_ONLY="
set "NO_REBUILD="
set "NO_PAUSE="

:PARSE_ARGS
if "%~1"=="" goto END_PARSE_ARGS
if /i "%~1"=="--frontend" set "FRONTEND_ONLY=1"
if /i "%~1"=="--backend" set "BACKEND_ONLY=1"
if /i "%~1"=="--no-rebuild" set "NO_REBUILD=1"
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
echo   EasySale - Development Update
echo ============================================
echo.
echo Mode: Development (debug profile)
echo.

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
echo [1/5] Checking prerequisites...

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

REM Update frontend dependencies
if defined UPDATE_FRONTEND (
    echo.
    echo [2/5] Updating frontend dependencies...
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
    echo [2/5] Skipping frontend update (--backend flag)
)

REM Update backend dependencies
if defined UPDATE_BACKEND (
    echo.
    echo [3/5] Updating backend dependencies...
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
    echo [3/5] Skipping backend update (--frontend flag)
)

REM Check if Docker is available for rebuild
if not defined NO_REBUILD (
    echo.
    echo [4/5] Checking Docker for rebuild...
    docker info >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Docker is not running - skipping rebuild
        set "NO_REBUILD=1"
    ) else (
        echo [OK] Docker is available
    )
) else (
    echo [4/5] Skipping Docker check (--no-rebuild flag)
)

REM Rebuild development images
if not defined NO_REBUILD (
    echo.
    echo [5/5] Rebuilding development images...
    
    if not exist "docker-compose.yml" (
        echo [WARNING] docker-compose.yml not found - skipping rebuild
        goto DONE
    )
    
    REM Stop existing containers
    echo Stopping existing containers...
    docker-compose -p easysale down >nul 2>&1
    
    REM Rebuild images
    echo Rebuilding images (this may take a few minutes)...
    docker-compose -p easysale build
    if errorlevel 1 (
        echo [WARNING] Docker build had issues
        echo You may need to run: docker-compose -p easysale build --no-cache
    ) else (
        echo [OK] Development images rebuilt
    )
    
    echo.
    echo To start the updated environment, run: start-dev.bat
) else (
    echo [5/5] Skipping Docker rebuild (--no-rebuild flag)
)

:DONE
echo.
echo ============================================
echo   Development Update Complete!
echo ============================================
echo.
if defined UPDATE_FRONTEND echo   [OK] Frontend: npm packages updated
if defined UPDATE_BACKEND echo   [OK] Backend: cargo packages updated
if not defined NO_REBUILD echo   [OK] Docker: images rebuilt
echo.
echo Next steps:
echo   Start dev environment:  start-dev.bat
echo   View changes:           git diff package-lock.json Cargo.lock
echo.

if not defined NO_PAUSE (
    echo.
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
echo Usage: update-dev.bat [options]
echo.
echo Options:
echo   --frontend    Update frontend only (npm install)
echo   --backend     Update backend only (cargo update)
echo   --no-rebuild  Skip Docker image rebuild
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --help        Show this help message
echo.
echo This script:
echo   1. Updates frontend npm packages (npm install)
echo   2. Updates backend cargo packages (cargo update)
echo   3. Rebuilds development Docker images
echo.
echo Examples:
echo   update-dev.bat                  Update everything
echo   update-dev.bat --frontend       Update frontend only
echo   update-dev.bat --backend        Update backend only
echo   update-dev.bat --no-rebuild     Update packages without Docker rebuild
echo.
exit /b 0
