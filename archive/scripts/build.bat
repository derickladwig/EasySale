@echo off
setlocal enabledelayedexpansion

REM ============================================
REM EasySale - Local Development Build Script
REM ============================================
REM Builds and runs the application locally (no Docker)

echo.
echo ============================================
echo   EasySale - Local Build
echo ============================================
echo.

REM Check if Rust is installed
where cargo >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Rust is not installed!
    echo.
    echo Please install Rust from: https://rustup.rs/
    echo.
    pause
    exit /b 1
)
echo [OK] Rust is installed

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)
echo [OK] Node.js is installed

REM Check if npm is installed
where npm >nul 2>&1
if errorlevel 1 (
    echo [ERROR] npm is not installed!
    echo.
    echo npm should come with Node.js. Please reinstall Node.js.
    echo.
    pause
    exit /b 1
)
echo [OK] npm is installed

echo.
echo ============================================
echo   Building Backend
echo ============================================
echo.

REM Build backend
cd backend
if errorlevel 1 (
    echo [ERROR] backend directory not found!
    pause
    exit /b 1
)

REM Setup database first
echo Setting up database...
cd crates\server
call setup-db.bat
if errorlevel 1 (
    echo.
    echo [ERROR] Database setup failed!
    echo.
    pause
    exit /b 1
)
cd ..\..

echo Building Rust backend...
set DATABASE_URL=sqlite:data/pos.db
cargo build -p EasySale-server --release
if errorlevel 1 (
    echo.
    echo [ERROR] Backend build failed!
    echo Check the error messages above for details.
    echo.
    pause
    exit /b 1
)
echo [OK] Backend built successfully

echo.
echo ============================================
echo   Building Frontend
echo ============================================
echo.

REM Build frontend
cd ..\frontend
if errorlevel 1 (
    echo [ERROR] frontend directory not found!
    pause
    exit /b 1
)

echo Installing frontend dependencies...
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed!
    echo Try deleting node_modules and package-lock.json, then run again.
    echo.
    pause
    exit /b 1
)
echo [OK] Frontend dependencies installed

echo.
echo ============================================
echo   Build Complete!
echo ============================================
echo.
echo To start the application:
echo.
echo 1. Start Backend (in one terminal):
echo    cd backend
echo    cargo run -p EasySale-server
echo.
echo 2. Start Frontend (in another terminal):
echo    cd frontend
echo    npm run dev
echo.
echo Or use the start scripts:
echo    - start-backend.bat
echo    - start-frontend.bat
echo.
echo Default URLs:
echo    Frontend: http://localhost:7945
echo    Backend:  http://localhost:8923
echo.
echo Default Login:
echo    Username: admin
echo    Password: admin123
echo.
pause
