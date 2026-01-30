@echo off
setlocal enabledelayedexpansion

REM ============================================
REM CAPS POS - Pre-Commit Hook (Windows)
REM ============================================
REM Runs before each git commit

echo.
echo ============================================
echo   Pre-Commit Checks
echo ============================================
echo.

set ERRORS=0

REM Check if we're in a git repository
git rev-parse --git-dir >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Not in a git repository!
    exit /b 1
)

REM Frontend checks
echo [1/3] Checking frontend...
if not exist "frontend\package.json" (
    echo [WARNING] frontend\package.json not found, skipping
    goto backend_check
)

cd frontend
where npm >nul 2>&1
if errorlevel 1 (
    echo [WARNING] npm not installed, skipping frontend checks
    cd ..
    goto backend_check
)

if not exist "node_modules" (
    echo [WARNING] node_modules not found, skipping frontend checks
    echo Run: npm install
    cd ..
    goto backend_check
)

echo   - Linting...
call npm run lint >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend linting failed!
    echo.
    echo Run: npm run lint
    echo Fix the errors and try again.
    set /a ERRORS+=1
)

echo   - Format check...
call npm run format:check >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Frontend format check failed!
    echo.
    echo Run: npm run format
    echo Then stage the changes and try again.
    set /a ERRORS+=1
)

if %ERRORS% equ 0 echo [OK] Frontend checks passed
cd ..

:backend_check
REM Backend checks
echo [2/3] Checking backend...
if not exist "backend\Cargo.toml" (
    echo [WARNING] backend\Cargo.toml not found, skipping
    goto backup_check
)

cd backend
where cargo >nul 2>&1
if errorlevel 1 (
    echo [WARNING] cargo not installed, skipping backend checks
    cd ..
    goto backup_check
)

echo   - Format check...
cargo fmt -- --check >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backend format check failed!
    echo.
    echo Run: cargo fmt
    echo Then stage the changes and try again.
    set /a ERRORS+=1
)

echo   - Clippy...
cargo clippy -p easysale-server -- -D warnings >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backend clippy check failed!
    echo.
    echo Run: cargo clippy -p easysale-server
    echo Fix the warnings and try again.
    set /a ERRORS+=1
)

if %ERRORS% equ 0 echo [OK] Backend checks passed
cd ..

:backup_check
REM Backup service checks
echo [3/3] Checking backup service...
if not exist "backup" (
    echo [INFO] backup directory not found, skipping
    goto summary
)

cd backup
where python >nul 2>&1
if errorlevel 1 (
    echo [WARNING] python not installed, skipping backup checks
    cd ..
    goto summary
)

python -m black --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] black not installed, skipping format check
    goto backup_flake8
)

if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
)

echo   - Format check...
python -m black --check . >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backup format check failed!
    echo.
    echo Run: python -m black .
    echo Then stage the changes and try again.
    set /a ERRORS+=1
)

:backup_flake8
python -m flake8 --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] flake8 not installed, skipping linting
    cd ..
    goto summary
)

echo   - Linting...
python -m flake8 . >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Backup linting failed!
    echo.
    echo Run: python -m flake8 .
    echo Fix the errors and try again.
    set /a ERRORS+=1
)

if %ERRORS% equ 0 echo [OK] Backup checks passed
cd ..

:summary
echo.
echo ============================================
if %ERRORS% equ 0 (
    echo   All Checks Passed!
    echo ============================================
    echo.
    echo Proceeding with commit...
    exit /b 0
) else (
    echo   %ERRORS% Check(s) Failed!
    echo ============================================
    echo.
    echo Fix the errors above and try again.
    echo.
    echo To skip checks (not recommended):
    echo   git commit --no-verify
    echo.
    exit /b 1
)
