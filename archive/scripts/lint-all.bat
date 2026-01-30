@echo off
setlocal enabledelayedexpansion

REM ============================================
REM EasySale - Lint All Code (Windows)
REM ============================================
REM Runs linting and format checks on all code

echo.
echo ============================================
echo   EasySale - Lint All Code
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

REM Frontend linting
echo [1/3] Checking frontend (TypeScript)...
if not exist "frontend\package.json" (
    echo [WARNING] frontend\package.json not found, skipping frontend
    set /a WARNINGS+=1
    goto backend_lint
)

cd frontend
where npm >nul 2>&1
if errorlevel 1 (
    echo [WARNING] npm is not installed, skipping frontend linting
    echo.
    echo Install Node.js from: https://nodejs.org/
    set /a WARNINGS+=1
    cd ..
    goto backend_lint
)

if not exist "node_modules" (
    echo [INFO] Installing frontend dependencies first...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies
        set /a ERRORS+=1
        cd ..
        goto backend_lint
    )
)

echo   - Running ESLint...
call npm run lint
if errorlevel 1 (
    echo [ERROR] Frontend linting failed
    set /a ERRORS+=1
    cd ..
    goto backend_lint
)

echo   - Checking formatting...
call npm run format:check
if errorlevel 1 (
    echo [ERROR] Frontend format check failed
    echo.
    echo Run format-all.bat to fix formatting issues
    set /a ERRORS+=1
    cd ..
    goto backend_lint
)

echo [OK] Frontend checks passed
cd ..

:backend_lint
REM Backend linting
echo [2/3] Checking backend (Rust)...
if not exist "backend\Cargo.toml" (
    echo [WARNING] backend\Cargo.toml not found, skipping backend
    set /a WARNINGS+=1
    goto backup_lint
)

cd backend
where cargo >nul 2>&1
if errorlevel 1 (
    echo [WARNING] cargo is not installed, skipping backend linting
    echo.
    echo Install Rust from: https://rustup.rs/
    set /a WARNINGS+=1
    cd ..
    goto backup_lint
)

echo   - Checking formatting...
cargo fmt -- --check
if errorlevel 1 (
    echo [ERROR] Backend format check failed
    echo.
    echo Run format-all.bat to fix formatting issues
    set /a ERRORS+=1
    cd ..
    goto backup_lint
)

echo   - Running Clippy...
cargo clippy -p EasySale-server -- -D warnings
if errorlevel 1 (
    echo [ERROR] Backend clippy check failed
    set /a ERRORS+=1
    cd ..
    goto backup_lint
)

echo [OK] Backend checks passed
cd ..

:backup_lint
REM Backup service linting
echo [3/3] Checking backup service (Python)...
if not exist "backup" (
    echo [INFO] backup directory not found, skipping backup linting
    goto summary
)

cd backup
where python >nul 2>&1
if errorlevel 1 (
    echo [WARNING] python is not installed, skipping backup linting
    echo.
    echo Install Python from: https://www.python.org/
    set /a WARNINGS+=1
    cd ..
    goto summary
)

REM Check if black is installed
python -m black --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] black is not installed, skipping backup format check
    echo.
    echo Install with: pip install black
    set /a WARNINGS+=1
    goto backup_flake8
)

if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

echo   - Checking formatting...
python -m black --check .
if errorlevel 1 (
    echo [ERROR] Backup service format check failed
    echo.
    echo Run format-all.bat to fix formatting issues
    set /a ERRORS+=1
)

:backup_flake8
REM Check if flake8 is installed
python -m flake8 --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] flake8 is not installed, skipping backup linting
    echo.
    echo Install with: pip install flake8
    set /a WARNINGS+=1
    cd ..
    goto summary
)

echo   - Running flake8...
python -m flake8 .
if errorlevel 1 (
    echo [ERROR] Backup service flake8 check failed
    set /a ERRORS+=1
    cd ..
    goto summary
)

echo [OK] Backup service checks passed
cd ..

:summary
echo.
echo ============================================
echo   Linting Summary
echo ============================================
echo.
if %ERRORS% equ 0 if %WARNINGS% equ 0 (
    echo [SUCCESS] All checks passed!
    echo.
    echo Your code is ready to commit.
    echo.
    pause
    exit /b 0
)

if %ERRORS% gtr 0 (
    echo [FAILED] %ERRORS% component(s) failed checks
    echo.
    echo Fix the errors above before committing.
    echo Run format-all.bat to auto-fix formatting issues.
)
if %WARNINGS% gtr 0 (
    echo [WARNING] %WARNINGS% component(s) skipped
)
echo.
echo ============================================
echo.
pause
exit /b %ERRORS%
