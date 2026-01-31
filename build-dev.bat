@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Development Build Script (Windows)
REM ============================================
REM Builds development Docker images (debug profile)
REM Uses docker-compose.yml (development configuration)
REM
REM Usage: build-dev.bat [options]
REM Options:
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --no-cache    Force rebuild without cache
REM   --help        Show this help message

REM CRITICAL: Always pause on errors so user can see them
REM This flag is ONLY cleared by explicit --no-pause or CI mode
set "PAUSE_ON_ERROR=1"
set "PAUSE_ON_EXIT=1"

REM Parse arguments
set "NO_PAUSE="
set "NO_CACHE="

:PARSE_ARGS
if "%~1"=="" goto END_PARSE_ARGS
if /i "%~1"=="--no-pause" (
    set "NO_PAUSE=1"
    set "PAUSE_ON_EXIT="
    set "PAUSE_ON_ERROR="
)
if /i "%~1"=="--no-cache" set "NO_CACHE=1"
if /i "%~1"=="--help" goto SHOW_HELP
shift
goto PARSE_ARGS
:END_PARSE_ARGS

if defined CI (
    set "NO_PAUSE=1"
    set "PAUSE_ON_EXIT="
    set "PAUSE_ON_ERROR="
)

echo.
echo ============================================
echo   EasySale - Development Build
echo ============================================
echo.
echo Mode: Development (debug profile)
echo Build: cargo run (no --release flag)
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
echo [1/6] Checking Docker status...
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

REM Check if docker-compose.yml exists
echo [2/6] Checking configuration files...
if not exist "docker-compose.yml" (
    echo [ERROR] docker-compose.yml not found!
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

REM Check for Dockerfile.dev files
if not exist "frontend\Dockerfile.dev" (
    echo [ERROR] frontend\Dockerfile.dev not found!
    goto ERROR_EXIT
)

if not exist "backend\Dockerfile.dev" (
    echo [ERROR] backend\Dockerfile.dev not found!
    goto ERROR_EXIT
)

REM Sync frontend dependencies (ensures package-lock.json is up to date)
echo [3/6] Syncing frontend dependencies...
pushd frontend
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo [WARNING] npm install had issues, continuing anyway...
)
popd
echo [OK] Frontend dependencies synced

REM Stop any existing containers
echo [4/6] Stopping existing containers...
docker-compose -p easysale down >nul 2>&1
echo [OK] Containers stopped

REM Build images
echo [5/6] Building development images...
echo This uses debug profile (faster compilation, larger binaries)
echo.

set "BUILD_ARGS="
if defined NO_CACHE (
    set "BUILD_ARGS=--no-cache"
    echo [INFO] Building without cache (--no-cache)
)

docker-compose -p easysale build %BUILD_ARGS%
if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    echo Check the error messages above for details.
    goto ERROR_EXIT
)
echo [OK] Development images built successfully

REM Show image info
echo [6/6] Build summary...
echo.
echo Development images built:
docker images --filter "reference=EasySale*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
echo.

echo ============================================
echo   Development Build Complete!
echo ============================================
echo.
echo Development vs Production builds:
echo   Development:
echo     - Uses debug profile (cargo run)
echo     - Faster compilation
echo     - Larger binaries with debug symbols
echo     - Hot-reload enabled
echo.
echo   Production:
echo     - Uses release profile (cargo build --release)
echo     - Slower compilation
echo     - Optimized, smaller binaries
echo     - No hot-reload
echo.
echo Next steps:
echo   Start development: start-dev.bat
echo   Build production:  build-prod.bat
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
echo Usage: build-dev.bat [options]
echo.
echo Options:
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --no-cache    Force rebuild without cache
echo   --help        Show this help message
echo.
echo Environment Variables:
echo   NO_PAUSE=1    Skip pause prompts
echo   CI=1          Automatically sets NO_PAUSE=1
echo.
echo This script builds development Docker images:
echo   - Frontend: Node.js with Vite dev server
echo   - Backend: Rust with debug profile (cargo run)
echo.
echo Development builds are optimized for:
echo   - Fast compilation (no --release)
echo   - Hot-reload support
echo   - Debug symbols for better error messages
echo   - Volume mounts for live code changes
echo.
exit /b 0
