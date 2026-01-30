@echo off
REM Security audit and update script for frontend dependencies

echo =========================================
echo EasySale - Security Audit
echo =========================================
echo.

REM Run npm audit to check for vulnerabilities
echo Running npm audit...
call npm audit

echo.
echo =========================================
echo Checking for outdated packages...
echo =========================================
call npm outdated

echo.
echo =========================================
echo To fix vulnerabilities, run:
echo   npm audit fix
echo.
echo To update all packages to latest:
echo   npm update
echo =========================================
pause
