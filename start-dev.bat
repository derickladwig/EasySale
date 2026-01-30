@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Development Start Script (Windows)
REM ============================================
REM Starts development Docker containers with hot-reload
REM Uses docker-compose.yml (development configuration)
REM
REM Usage: start-dev.bat [options]
REM Options:
REM   --no-browser  Skip auto-opening browser
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --storybook   Also start Storybook service
REM   --help        Show this help message

REM CRITICAL: Always pause on errors so user can see them
set "PAUSE_ON_ERROR=1"

REM Parse arguments
set "NO_BROWSER="
set "NO_PAUSE="
set "WITH_STORYBOOK="

:PARSE_ARGS
if "%~1"=="" goto END_PARSE_ARGS
if /i "%~1"=="--no-browser" set "NO_BROWSER=1"
if /i "%~1"=="--no-pause" (
    set "NO_PAUSE=1"
    set "PAUSE_ON_ERROR="
)
if /i "%~1"=="--storybook" set "WITH_STORYBOOK=1"
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
echo   EasySale - Development Start
echo ============================================
echo.
echo Mode: Development (hot-reload enabled)
echo Profile: Debug (cargo run)
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

REM Set compose profiles
set "COMPOSE_PROFILES="
if defined WITH_STORYBOOK (
    set "COMPOSE_PROFILES=--profile storybook"
    echo [INFO] Storybook service will be started
)

REM Stop any existing development containers
echo [1/4] Stopping existing development containers...
docker-compose -p EasySale down >nul 2>&1
echo [OK] Containers stopped

REM Build and start containers
echo [2/4] Building and starting development containers...
echo This may take a few minutes on first run...
docker-compose -p EasySale %COMPOSE_PROFILES% up --build -d
set COMPOSE_EXIT=%errorlevel%

REM Check if containers are actually running (more reliable than exit code)
REM docker-compose can return non-zero for warnings even when containers start
timeout /t 3 /nobreak >nul
docker ps --filter "name=easysale-backend" --format "{{.Status}}" | findstr /i "Up" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backend container failed to start!
    echo docker-compose exit code was: %COMPOSE_EXIT%
    echo Run: docker-compose -p EasySale logs backend
    goto ERROR_EXIT
)
docker ps --filter "name=easysale-frontend" --format "{{.Status}}" | findstr /i "Up" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend container failed to start!
    echo docker-compose exit code was: %COMPOSE_EXIT%
    echo Run: docker-compose -p EasySale logs frontend
    goto ERROR_EXIT
)
echo [OK] Containers started

REM Wait for backend to be ready
echo [3/4] Waiting for services to be ready...
set "RETRIES=0"
set "MAX_RETRIES=60"
set "READY="

:HEALTH_LOOP
if defined READY goto HEALTH_DONE
if %RETRIES% geq %MAX_RETRIES% goto HEALTH_TIMEOUT

timeout /t 3 /nobreak >nul
set /a RETRIES+=1

REM Check backend health endpoint
curl -s -o nul -w "%%{http_code}" http://localhost:8923/health 2>nul | findstr "200" >nul
if not errorlevel 1 (
    REM Backend is ready, check frontend
    curl -s -o nul -w "%%{http_code}" http://localhost:7945 2>nul | findstr "200" >nul
    if not errorlevel 1 (
        set "READY=1"
        goto HEALTH_LOOP
    )
)

echo   Waiting... [%RETRIES%/%MAX_RETRIES%] (Rust compilation may take a while)
goto HEALTH_LOOP

:HEALTH_TIMEOUT
echo [WARNING] Health check timed out, but services may still be starting.
echo Development builds can take several minutes for initial Rust compilation.
echo Check logs: docker-compose -p EasySale logs -f
goto SHOW_URLS

:HEALTH_DONE
echo [OK] Services are ready!

:SHOW_URLS
REM Display access URLs
echo.
echo ============================================
echo   EasySale Development Environment Running!
echo ============================================
echo.
echo Access URLs:
echo   Frontend:   http://localhost:7945  (Vite dev server with HMR)
echo   Backend:    http://localhost:8923  (Rust debug build)
echo   Health:     http://localhost:8923/health
if defined WITH_STORYBOOK (
    echo   Storybook:  http://localhost:7946
)
echo.
echo Development Features:
echo   - Frontend hot-reload (Vite HMR)
echo   - Backend auto-rebuild on code changes
echo   - Debug symbols enabled
echo   - Verbose logging (RUST_LOG=info)
echo   - Permissive CORS (any origin allowed)
echo.

REM Open browser (only once, only if ready)
if not defined NO_BROWSER (
    if defined READY (
        echo [4/4] Opening browser...
        start "" "http://localhost:7945"
        echo [OK] Browser opened
    ) else (
        echo [4/4] Skipping browser (services not fully ready)
    )
) else (
    echo [4/4] Browser open skipped (--no-browser flag)
)

echo.
echo Useful commands:
echo   View logs:      docker-compose -p EasySale logs -f
echo   Backend logs:   docker-compose -p EasySale logs -f backend
echo   Frontend logs:  docker-compose -p EasySale logs -f frontend
echo   Stop:           stop-dev.bat
echo   Rebuild:        docker-compose -p EasySale up --build -d
echo.

call :PAUSE_IF_INTERACTIVE
exit /b 0

REM ============================================
REM ERROR EXIT - ALWAYS pauses so user can see error
REM ============================================
:ERROR_EXIT
echo.
echo ============================================
echo   START FAILED - See errors above
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
echo Usage: start-dev.bat [options]
echo.
echo Options:
echo   --no-browser  Skip auto-opening browser
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --storybook   Also start Storybook service
echo   --help        Show this help message
echo.
echo This script:
echo   1. Builds development Docker images (if needed)
echo   2. Starts EasySale development containers
echo   3. Enables hot-reload for frontend and backend
echo   4. Waits for services to be healthy
echo   5. Opens browser to http://localhost:7945
echo.
echo Development vs Production:
echo   - Development uses debug builds (faster compilation)
echo   - Development has hot-reload enabled
echo   - Development uses permissive CORS
echo   - Development has verbose logging
echo.
exit /b 0
