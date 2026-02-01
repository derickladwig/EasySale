@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Tauri Desktop App Builder
REM ============================================
REM Builds native Windows desktop application using Tauri
REM Supports lite/export/full variants and debug/release modes
REM
REM Usage: build-tauri.bat [options]
REM Options:
REM   --lite        Build lite variant (core POS only)
REM   --export      Build export variant (default, + CSV export)
REM   --full        Build full variant (+ OCR, document processing)
REM   --debug       Build in debug mode (faster compile)
REM   --no-pause    Skip pause prompts (for CI/automation)
REM   --help        Show this help message

set "PAUSE_ON_ERROR=1"
set "PAUSE_ON_EXIT=1"
set "BUILD_VARIANT=export"
set "BUILD_MODE=release"
set "NO_PAUSE="

REM Parse arguments
:PARSE_ARGS
if "%~1"=="" goto END_PARSE_ARGS
if /i "%~1"=="--no-pause" (
    set "NO_PAUSE=1"
    set "PAUSE_ON_EXIT="
    set "PAUSE_ON_ERROR="
)
if /i "%~1"=="--help" goto SHOW_HELP
if /i "%~1"=="--lite" set "BUILD_VARIANT=lite"
if /i "%~1"=="--export" set "BUILD_VARIANT=export"
if /i "%~1"=="--full" set "BUILD_VARIANT=full"
if /i "%~1"=="--debug" set "BUILD_MODE=debug"
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
echo   EasySale - Tauri Desktop Build
echo   Variant: %BUILD_VARIANT%
echo   Mode: %BUILD_MODE%
echo ============================================
echo.

REM Check if Node.js is installed
echo [1/10] Checking Node.js...
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js 20+ from:
    echo https://nodejs.org/
    echo.
    goto ERROR_EXIT
)
for /f "tokens=*" %%a in ('node --version') do set NODE_VERSION=%%a
echo [OK] Node.js %NODE_VERSION% found
echo.

REM Check if Rust is installed
echo [2/10] Checking Rust...
where cargo >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Rust is not installed!
    echo.
    echo Please install Rust from:
    echo https://rustup.rs/
    echo.
    echo Or run: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs ^| sh
    echo.
    goto ERROR_EXIT
)
for /f "tokens=*" %%a in ('rustc --version') do set RUST_VERSION=%%a
echo [OK] %RUST_VERSION% found
echo.

REM Check if Tauri is set up
echo [3/10] Checking Tauri setup...
if not exist "frontend\src-tauri" (
    echo [ERROR] Tauri is not set up!
    echo.
    echo Please follow the Tauri setup guide:
    echo   1. Read TAURI_SETUP_GUIDE.md
    echo   2. Run: cd frontend ^&^& npx tauri init
    echo   3. Configure tauri.conf.json
    echo.
    goto ERROR_EXIT
)
echo [OK] Tauri directory found
echo.

REM Check if frontend dependencies are installed
echo [4/10] Checking frontend dependencies...
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    pushd frontend
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo [ERROR] Failed to install frontend dependencies!
        popd
        goto ERROR_EXIT
    )
    popd
)
echo [OK] Frontend dependencies ready
echo.

REM Check if Tauri CLI is installed
echo [5/10] Checking Tauri CLI...
pushd frontend
call npm list @tauri-apps/cli >nul 2>&1
if errorlevel 1 (
    echo [INFO] Installing Tauri CLI...
    call npm install -D @tauri-apps/cli@^2.0.0
    if errorlevel 1 (
        echo [ERROR] Failed to install Tauri CLI!
        popd
        goto ERROR_EXIT
    )
)
popd
echo [OK] Tauri CLI ready
echo.

REM Set build variant environment variable
echo [6/10] Configuring build variant...
set "VITE_BUILD_VARIANT=%BUILD_VARIANT%"
echo [INFO] Build variant: %BUILD_VARIANT%
echo.

REM Generate build info
echo [7/10] Generating build info...
for /f "tokens=*" %%a in ('powershell -Command "Get-Date -Format \"yyyy-MM-dd\""') do set "BUILD_DATE=%%a"
for /f "tokens=*" %%a in ('git rev-parse --short HEAD 2^>nul') do set "GIT_HASH=%%a"
if not defined GIT_HASH set "GIT_HASH=release"
set "BUILD_HASH=%BUILD_DATE%-%GIT_HASH%"
echo [INFO] Build: v0.1.0 / %BUILD_HASH%
echo.

REM Build frontend first
echo [8/10] Building frontend...
echo This may take several minutes...
pushd frontend
set "VITE_APP_VERSION=0.1.0"
set "VITE_BUILD_HASH=%GIT_HASH%"
set "VITE_BUILD_DATE=%BUILD_DATE%"
set "VITE_RUNTIME_PROFILE=prod"
set "VITE_BUILD_VARIANT=%BUILD_VARIANT%"

call npm run build
if errorlevel 1 (
    echo [ERROR] Frontend build failed!
    popd
    goto ERROR_EXIT
)
popd
echo [OK] Frontend built successfully
echo.

REM Build Tauri app
echo [9/10] Building Tauri desktop app...
echo This may take 10-20 minutes for first build...
echo Subsequent builds will be faster (incremental compilation)
echo.
pushd frontend

if "%BUILD_MODE%"=="debug" (
    echo [INFO] Building in DEBUG mode (faster compile, larger binary)
    call npm run tauri build -- --debug
) else (
    echo [INFO] Building in RELEASE mode (optimized, smaller binary)
    call npm run tauri build
)

if errorlevel 1 (
    echo [ERROR] Tauri build failed!
    echo.
    echo Common issues:
    echo   - Missing Visual Studio Build Tools (Windows)
    echo   - Missing webkit2gtk (Linux)
    echo   - Missing Xcode Command Line Tools (macOS)
    echo.
    echo See TAURI_SETUP_GUIDE.md for troubleshooting
    popd
    goto ERROR_EXIT
)
popd
echo [OK] Tauri app built successfully
echo.

REM Show output location
echo [10/10] Build complete!
echo.
echo ============================================
echo   Build Successful!
echo ============================================
echo.
echo Output location:
if "%BUILD_MODE%"=="debug" (
    echo   frontend\src-tauri\target\debug\bundle\
) else (
    echo   frontend\src-tauri\target\release\bundle\
)
echo.
echo Installers created:
if "%BUILD_MODE%"=="debug" (
    if exist "frontend\src-tauri\target\debug\bundle\msi" (
        echo   - MSI: frontend\src-tauri\target\debug\bundle\msi\EasySale_0.1.0_x64_en-US.msi
    )
    if exist "frontend\src-tauri\target\debug\bundle\nsis" (
        echo   - NSIS: frontend\src-tauri\target\debug\bundle\nsis\EasySale_0.1.0_x64-setup.exe
    )
) else (
    if exist "frontend\src-tauri\target\release\bundle\msi" (
        echo   - MSI: frontend\src-tauri\target\release\bundle\msi\EasySale_0.1.0_x64_en-US.msi
    )
    if exist "frontend\src-tauri\target\release\bundle\nsis" (
        echo   - NSIS: frontend\src-tauri\target\release\bundle\nsis\EasySale_0.1.0_x64-setup.exe
    )
)
echo.
echo Build variant: %BUILD_VARIANT%
echo Build mode: %BUILD_MODE%
echo Build hash: %BUILD_HASH%
echo.
echo Next steps:
echo   1. Test the installer on a clean Windows machine
echo   2. Configure backend URL in the app (Settings ^> Backend)
echo   3. Distribute to users
echo.
if not defined NO_PAUSE (
    echo Press any key to close this window...
    pause >nul
)
exit /b 0

REM ============================================
REM ERROR EXIT
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
REM SHOW HELP
REM ============================================
:SHOW_HELP
echo.
echo Usage: build-tauri.bat [options]
echo.
echo Options:
echo   --lite        Build lite variant (core POS only, ~15MB installer)
echo   --export      Build export variant (default, + CSV export, ~18MB installer)
echo   --full        Build full variant (+ OCR, document processing, ~25MB installer)
echo   --debug       Build in debug mode (faster compile, larger binary)
echo   --no-pause    Skip pause prompts (for CI/automation)
echo   --help        Show this help message
echo.
echo Build Variants:
echo   lite          Core POS functionality only
echo   export        + CSV export for accounting integration
echo   full          + OCR, document processing, cleanup engine
echo.
echo Build Modes:
echo   release       Optimized build (default, slower compile, smaller binary)
echo   debug         Debug build (faster compile, larger binary, includes debug symbols)
echo.
echo Examples:
echo   build-tauri.bat                    Build export variant in release mode
echo   build-tauri.bat --lite --debug     Build lite variant in debug mode
echo   build-tauri.bat --full             Build full variant in release mode
echo.
echo Requirements:
echo   - Node.js 20+
echo   - Rust 1.75+
echo   - Visual Studio Build Tools (Windows)
echo   - Tauri setup complete (see TAURI_SETUP_GUIDE.md)
echo.
exit /b 0
