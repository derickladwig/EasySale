@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM ============================================
REM EasySale - Interactive Build Selector
REM ============================================
REM Interactive menu to select build type and variant
REM Supports: dev, prod, tauri builds with lite/export/full variants

echo.
echo ============================================
echo   EasySale - Interactive Build System
echo ============================================
echo.
echo Select build type:
echo.
echo   [1] Development Build (Docker)
echo   [2] Production Build (Docker)
echo   [3] Tauri Desktop App
echo   [4] Exit
echo.
set /p BUILD_TYPE="Enter your choice (1-4): "

if "%BUILD_TYPE%"=="1" goto DEV_BUILD
if "%BUILD_TYPE%"=="2" goto PROD_BUILD
if "%BUILD_TYPE%"=="3" goto TAURI_BUILD
if "%BUILD_TYPE%"=="4" goto EXIT
echo.
echo [ERROR] Invalid choice. Please enter 1, 2, 3, or 4.
pause
goto :EOF

REM ============================================
REM Development Build
REM ============================================
:DEV_BUILD
echo.
echo ============================================
echo   Development Build (Docker)
echo ============================================
echo.
echo This will:
echo   - Build frontend and backend in development mode
echo   - Enable hot-reload for rapid development
echo   - Use debug profile (faster compile, larger binaries)
echo   - Start services on localhost:7945 (frontend) and localhost:8923 (backend)
echo.
set /p CONFIRM="Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" goto :EOF

echo.
echo Starting development build...
call build-dev.bat
goto :EOF

REM ============================================
REM Production Build
REM ============================================
:PROD_BUILD
echo.
echo ============================================
echo   Production Build (Docker)
echo ============================================
echo.
echo Select build variant:
echo.
echo   [1] Lite    - Core POS only (~20MB binary)
echo   [2] Export  - + CSV export for accounting (~25MB binary) [DEFAULT]
echo   [3] Full    - + OCR, document processing (~35MB binary)
echo.
set /p VARIANT="Enter your choice (1-3, default=2): "

if "%VARIANT%"=="" set VARIANT=2
if "%VARIANT%"=="1" set VARIANT_FLAG=--lite
if "%VARIANT%"=="2" set VARIANT_FLAG=--export
if "%VARIANT%"=="3" set VARIANT_FLAG=--full

if "%VARIANT%"=="1" set VARIANT_NAME=Lite
if "%VARIANT%"=="2" set VARIANT_NAME=Export
if "%VARIANT%"=="3" set VARIANT_NAME=Full

echo.
echo Selected: %VARIANT_NAME% variant
echo.
echo This will:
echo   - Build optimized production images
echo   - Use --release profile (slower compile, smaller binaries)
echo   - Enable variant-specific features
echo   - Start services on localhost:7945 (frontend) and localhost:8923 (backend)
echo.
set /p CONFIRM="Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" goto :EOF

echo.
echo Starting production build with %VARIANT_NAME% variant...
call build-prod.bat %VARIANT_FLAG%
goto :EOF

REM ============================================
REM Tauri Desktop Build
REM ============================================
:TAURI_BUILD
echo.
echo ============================================
echo   Tauri Desktop App Build
echo ============================================
echo.
echo Select build variant:
echo.
echo   [1] Lite    - Core POS only (~15MB installer)
echo   [2] Export  - + CSV export for accounting (~18MB installer) [DEFAULT]
echo   [3] Full    - + OCR, document processing (~25MB installer)
echo.
set /p VARIANT="Enter your choice (1-3, default=2): "

if "%VARIANT%"=="" set VARIANT=2
if "%VARIANT%"=="1" set VARIANT_FLAG=--lite
if "%VARIANT%"=="2" set VARIANT_FLAG=--export
if "%VARIANT%"=="3" set VARIANT_FLAG=--full

if "%VARIANT%"=="1" set VARIANT_NAME=Lite
if "%VARIANT%"=="2" set VARIANT_NAME=Export
if "%VARIANT%"=="3" set VARIANT_NAME=Full

echo.
echo Selected: %VARIANT_NAME% variant
echo.
echo Select build mode:
echo.
echo   [1] Development (debug, faster compile)
echo   [2] Production (release, optimized)
echo.
set /p MODE="Enter your choice (1-2, default=2): "

if "%MODE%"=="" set MODE=2
if "%MODE%"=="1" set MODE_FLAG=--debug
if "%MODE%"=="2" set MODE_FLAG=

if "%MODE%"=="1" set MODE_NAME=Development
if "%MODE%"=="2" set MODE_NAME=Production

echo.
echo Build Configuration:
echo   - Variant: %VARIANT_NAME%
echo   - Mode: %MODE_NAME%
echo   - Output: Windows installer (.msi and .exe)
echo.
echo This will:
echo   - Build Tauri desktop application
echo   - Create native Windows installer
echo   - Package frontend and backend together
echo   - Output to: frontend\src-tauri\target\release\bundle\
echo.
set /p CONFIRM="Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" goto :EOF

echo.
echo Starting Tauri build...
call build-tauri.bat %VARIANT_FLAG% %MODE_FLAG%
goto :EOF

REM ============================================
REM Exit
REM ============================================
:EXIT
echo.
echo Exiting build system.
goto :EOF
