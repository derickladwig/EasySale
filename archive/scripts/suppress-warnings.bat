@echo off
REM ============================================
REM Suppress Dead Code Warnings
REM ============================================
REM Adds #[allow(dead_code)] to service modules

echo Suppressing dead code warnings in service modules...

cd backend\crates\server\src\services

REM Add allow attribute to each service file
for %%f in (*.rs) do (
    findstr /C:"#![allow(dead_code)]" %%f >nul
    if errorlevel 1 (
        echo #![allow(dead_code)]> temp.rs
        type %%f >> temp.rs
        move /Y temp.rs %%f >nul
        echo Added to %%f
    )
)

cd ..\..\..\..\..\

echo Done! Run cargo check -p EasySale-server to verify.
pause
