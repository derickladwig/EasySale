@echo off
setlocal enabledelayedexpansion
echo Starting EasySale Backend...
echo.

REM Ensure we're in the project root
if not exist "backend\crates\server" (
    echo [ERROR] Must run from project root directory
    pause
    exit /b 1
)

REM Load environment from root .env file
if exist ".env" (
    for /f "usebackq tokens=1,2 delims==" %%a in (".env") do (
        set "line=%%a"
        REM Skip comments and empty lines
        if not "!line:~0,1!"=="#" if not "%%a"=="" (
            set "%%a=%%b"
        )
    )
)

REM Set defaults if not defined
if not defined TENANT_ID set TENANT_ID=default-tenant
if not defined API_PORT set API_PORT=8923

echo Using TENANT_ID: %TENANT_ID%
echo Using API_PORT: %API_PORT%
echo.

cd backend
cargo run -p EasySale-server
