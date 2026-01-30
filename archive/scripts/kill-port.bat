@echo off
REM Kill process using a specific port
REM Usage: kill-port.bat <port_number>
REM Example: kill-port.bat 7945

if "%1"=="" (
    echo Usage: kill-port.bat ^<port_number^>
    echo Example: kill-port.bat 7945
    pause
    exit /b 1
)

set PORT=%1

echo Killing processes on port %PORT%...
echo.

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT%') do (
    echo Found process %%a using port %PORT%
    taskkill /F /PID %%a 2>nul
    if errorlevel 1 (
        echo Failed to kill process %%a
    ) else (
        echo Successfully killed process %%a
    )
)

echo.
echo Done!
pause
