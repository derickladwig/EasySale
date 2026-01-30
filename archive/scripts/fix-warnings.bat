@echo off
echo Applying automatic fixes for Rust warnings...
echo.

cd backend

echo Running cargo fix to apply automatic suggestions...
cargo fix -p EasySale-server --allow-dirty --allow-staged

echo.
echo Done! Now run: cargo check -p EasySale-server
echo.
pause
