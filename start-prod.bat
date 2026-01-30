@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Production Start Script (Windows)
REM ============================================
REM Starts production Docker containers with LAN config support
REM Auto-opens browser after readiness check
REM
REM Usage: start-prod.bat [options]
REM Options:
REM   --no-browser  Skip auto-opening browser
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --help        Show this help message

REM CRITICAL: Always pause on errors so user can see them
set "PAUSE_ON_ERROR=1"

REM Parse arguments
set "NO_BROWSER="
set "NO_PAUSE="

:PARSE_ARGS
if "%~1"=="" goto END_PARSE_ARGS
if /i "%~1"=="--no-browser" set "NO_BROWSER=1"
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
echo   EasySale - Production Start
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

REM Check for runtime override file (LAN configuration)
set "COMPOSE_FILES=-f docker-compose.prod.yml"
set "LAN_ENABLED="
set "LAN_IP="

if exist "runtime\docker-compose.override.yml" (
    echo [INFO] Found LAN configuration override
    set "COMPOSE_FILES=-f docker-compose.prod.yml -f runtime\docker-compose.override.yml"
    
    REM Try to detect if LAN is enabled from the config
    if exist "runtime\network-config.json" (
        for /f "tokens=*" %%a in ('powershell -Command "(Get-Content runtime\network-config.json | ConvertFrom-Json).lan_enabled"') do (
            if "%%a"=="True" (
                set "LAN_ENABLED=1"
                REM Get the first non-loopback IP
                for /f "tokens=2 delims=:" %%b in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
                    if not defined LAN_IP (
                        set "LAN_IP=%%b"
                        set "LAN_IP=!LAN_IP: =!"
                    )
                )
            )
        )
    )
)

REM Stop any existing containers
echo [1/4] Stopping existing containers...
docker-compose -p EasySale %COMPOSE_FILES% down >nul 2>&1
echo [OK] Containers stopped

REM Start containers
echo [2/4] Starting production containers...
docker-compose -p EasySale %COMPOSE_FILES% up -d
set COMPOSE_EXIT=%errorlevel%

REM Check if containers are actually running (more reliable than exit code)
REM docker-compose can return non-zero for warnings even when containers start
timeout /t 3 /nobreak >nul
docker ps --filter "name=easysale-backend" --format "{{.Status}}" | findstr /i "Up" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backend container failed to start!
    echo docker-compose exit code was: %COMPOSE_EXIT%
    echo Run: docker-compose -p EasySale %COMPOSE_FILES% logs backend
    goto ERROR_EXIT
)
docker ps --filter "name=easysale-frontend" --format "{{.Status}}" | findstr /i "Up" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend container failed to start!
    echo docker-compose exit code was: %COMPOSE_EXIT%
    echo Run: docker-compose -p EasySale %COMPOSE_FILES% logs frontend
    goto ERROR_EXIT
)
echo [OK] Containers started

REM Wait for backend health
echo [3/4] Waiting for services to be ready...
set "RETRIES=0"
set "MAX_RETRIES=30"
set "READY="

:HEALTH_LOOP
if defined READY goto HEALTH_DONE
if %RETRIES% geq %MAX_RETRIES% goto HEALTH_TIMEOUT

timeout /t 2 /nobreak >nul
set /a RETRIES+=1

REM Check backend health endpoint using PowerShell (more reliable on Windows)
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:8923/health' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if not errorlevel 1 (
    REM Backend is ready, check frontend
    powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:7945' -UseBasicParsing -TimeoutSec 5; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
    if not errorlevel 1 (
        set "READY=1"
        goto HEALTH_LOOP
    )
)

echo   Waiting... [%RETRIES%/%MAX_RETRIES%]
goto HEALTH_LOOP

:HEALTH_TIMEOUT
echo [WARNING] Health check timed out, but services may still be starting.
echo Check logs: docker-compose -p EasySale %COMPOSE_FILES% logs
goto SHOW_URLS

:HEALTH_DONE
echo [OK] Services are ready!

:SHOW_URLS
REM Display access URLs
echo.
echo ============================================
echo   EasySale is Running!
echo ============================================
echo.
echo Access URLs:
echo   Local:    http://localhost:7945
if defined LAN_ENABLED (
    if defined LAN_IP (
        echo   LAN:      http://!LAN_IP!:7945
    ) else (
        echo   LAN:      http://^<your-lan-ip^>:7945
    )
)
echo.
echo Backend API:
echo   Local:    http://localhost:8923
echo   Health:   http://localhost:8923/health
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
echo   View logs:  docker-compose -p EasySale %COMPOSE_FILES% logs -f
echo   Stop:       docker-compose -p EasySale %COMPOSE_FILES% down
echo   Restart:    start-prod.bat
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
echo Usage: start-prod.bat [options]
echo.
echo Options:
echo   --no-browser  Skip auto-opening browser
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --help        Show this help message
echo.
echo This script:
echo   1. Starts EasySale production containers
echo   2. Applies LAN configuration if present (runtime\docker-compose.override.yml)
echo   3. Waits for services to be healthy
echo   4. Opens browser to http://localhost:7945
echo.
echo LAN Configuration:
echo   Configure LAN access in the app: Admin ^> Network ^> LAN Settings
echo   Or run the Setup Wizard and configure in the Network step.
echo.
exit /b 0
