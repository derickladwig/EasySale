@echo off
echo Testing TypeScript fixes...
echo.

cd frontend
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS! All TypeScript errors fixed!
    echo ========================================
) else (
    echo.
    echo ========================================
    echo Still have errors - check output above
    echo ========================================
)

cd ..
pause
