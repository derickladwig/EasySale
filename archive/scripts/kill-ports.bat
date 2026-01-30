@echo off
REM Kill processes using EasySale ports
REM Frontend: 7945, Backend: 8923

echo Killing processes on ports 7945 and 8923...
echo.

REM Kill frontend (port 7945)
echo Checking port 7945 (Frontend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :7945') do (
    echo Killing process %%a on port 7945
    taskkill /F /PID %%a 2>nul
)

REM Kill backend (port 8923)
echo Checking port 8923 (Backend)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8923') do (
    echo Killing process %%a on port 8923
    taskkill /F /PID %%a 2>nul
)

echo.
echo Done! Ports should now be free.
echo.
pause
