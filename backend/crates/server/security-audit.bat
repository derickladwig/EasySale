@echo off
REM Security audit script for Rust backend dependencies

echo =========================================
echo CAPS POS - Rust Security Audit
echo =========================================
echo.

REM Check if cargo-audit is installed
cargo audit --version >nul 2>&1
if errorlevel 1 (
    echo cargo-audit not found. Installing...
    cargo install cargo-audit
)

REM Run cargo audit to check for vulnerabilities
echo Running cargo audit...
cargo audit

echo.
echo =========================================
echo Checking for outdated crates...
echo =========================================

REM Check if cargo-outdated is installed
cargo outdated --version >nul 2>&1
if errorlevel 1 (
    echo cargo-outdated not found. Installing...
    cargo install cargo-outdated
)

cargo outdated

echo.
echo =========================================
echo To update dependencies:
echo   cargo update
echo.
echo To fix specific vulnerabilities:
echo   cargo audit fix
echo =========================================
pause
