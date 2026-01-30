@echo off
echo ========================================
echo Fixing ALL TypeScript Errors
echo ========================================
echo.

REM Run the PowerShell script
powershell -ExecutionPolicy Bypass -File "%~dp0fix-all-typescript-errors.ps1"

pause
