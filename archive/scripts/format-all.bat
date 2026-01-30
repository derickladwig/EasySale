@echo off
setlocal enabledelayedexpansion

REM ============================================
REM EasySale - Auto-Format All Code (Windows)
REM ============================================
REM Formats frontend and backend code

echo.
echo ============================================
echo   EasySale - Auto-Format All Code
echo ============================================
echo.

set ERRORS=0
set WARNINGS=0

REM Check if we're in the project root
if not exist "frontend" (
    echo [ERROR] frontend directory not found!
    echo Make sure you're running this script from the project root.
    echo Current directory: %CD%
    echo.
    pause
    exit /b 1
)

REM Frontend formatting
echo [1/2] Formatting frontend (TypeScript)...
if not exist "frontend\package.json" (
    echo [WARNING] frontend\package.json not found, skipping frontend
    set /a WARNINGS+=1
    goto backend_format
)

cd frontend
where npm >nul 2>&1
if errorlevel 1 (
    echo [WARNING] npm is not installed, skipping frontend formatting
    echo.
    echo Install Node.js from: https://nodejs.org/
    set /a WARNINGS+=1
    cd ..
    goto backend_format
)

if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies first...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies
        set /a ERRORS+=1
        cd ..
        goto backend_format
    )
)

call npm run format
if errorlevel 1 (
    echo [ERROR] Frontend formatting failed
    set /a ERRORS+=1
) else (
    echo [OK] Frontend formatted successfully
)
cd ..

:backend_format
REM Backend formatting
echo [2/2] Formatting backend (Rust)...
if not exist "backend\Cargo.toml" (
    echo [WARNING] backend\Cargo.toml not found, skipping backend
    set /a WARNINGS+=1
    goto summary
)

cd backend
where cargo >nul 2>&1
if errorlevel 1 (
    echo [WARNING] cargo is not installed, skipping backend formatting
    echo.
    echo Install Rust from: https://rustup.rs/
    set /a WARNINGS+=1
    cd ..
    goto summary
)

cargo fmt
if errorlevel 1 (
    echo [ERROR] Backend formatting failed
    set /a ERRORS+=1
) else (
    echo [OK] Backend formatted successfully
)
cd ..

:summary
echo.
echo ============================================
echo   Formatting Summary
echo ============================================
echo.
if %ERRORS% equ 0 if %WARNINGS% equ 0 (
    echo [SUCCESS] All code formatted successfully!
    echo.
    pause
    exit /b 0
)

if %ERRORS% gtr 0 (
    echo [FAILED] %ERRORS% component(s) failed to format
)
if %WARNINGS% gtr 0 (
    echo [WARNING] %WARNINGS% component(s) skipped
)
echo.
echo Check the messages above for details.
echo.
pause
exit /b %ERRORS%
