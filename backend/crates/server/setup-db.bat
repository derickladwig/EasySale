@echo off
REM ============================================
REM EasySale - Database Setup Script (Windows)
REM ============================================
REM Creates database and runs all migrations

echo.
echo ============================================
echo   EasySale - Database Setup
echo ============================================
echo.

REM Set database path
set DATABASE_PATH=data\pos.db
set DATABASE_URL=sqlite:%DATABASE_PATH%

echo Database path: %DATABASE_PATH%
echo Database URL: %DATABASE_URL%
echo.

REM Create data directory if it doesn't exist
if not exist "data" (
    echo Creating data directory...
    mkdir data
)

REM Check if database exists
if exist "%DATABASE_PATH%" (
    echo Database already exists at %DATABASE_PATH%
    echo.
    choice /C YN /M "Do you want to recreate it (this will delete all data)"
    if errorlevel 2 goto :SKIP_CREATE
    if errorlevel 1 (
        echo Deleting existing database...
        del "%DATABASE_PATH%"
    )
)

:SKIP_CREATE

REM Create empty database if it doesn't exist
if not exist "%DATABASE_PATH%" (
    echo Creating new database...
    sqlite3 "%DATABASE_PATH%" ".databases"
    if errorlevel 1 (
        echo [ERROR] Failed to create database!
        echo Make sure sqlite3 is installed and in your PATH
        pause
        exit /b 1
    )
    echo [OK] Database created
)

REM Check if migrations directory exists
if not exist "migrations" (
    echo [ERROR] Migrations directory not found!
    echo Expected: migrations\
    pause
    exit /b 1
)

REM Count migration files
set MIGRATION_COUNT=0
for %%f in (migrations\*.sql) do set /a MIGRATION_COUNT+=1
echo Found %MIGRATION_COUNT% migration files
echo.

REM Run migrations
echo Running migrations...
echo.

for %%f in (migrations\*.sql) do (
    echo Running: %%~nxf
    sqlite3 "%DATABASE_PATH%" < "%%f" 2>&1 | findstr /V "duplicate column" | findstr /V "already exists"
)

echo.
echo [OK] Migrations completed!
echo.

REM Verify database
echo Verifying database schema...
sqlite3 "%DATABASE_PATH%" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%%';" > temp_count.txt
set /p TABLE_COUNT=<temp_count.txt
del temp_count.txt

echo Found %TABLE_COUNT% tables in database
echo.

if %TABLE_COUNT% LSS 10 (
    echo [WARNING] Expected more tables. Database may not be fully initialized.
    echo.
    echo Listing tables:
    sqlite3 "%DATABASE_PATH%" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%%' ORDER BY name;"
    echo.
)

REM Show some sample data
echo Sample data from tenants table:
sqlite3 "%DATABASE_PATH%" "SELECT id, name, slug FROM tenants LIMIT 5;" 2>nul
echo.

echo Sample data from users table:
sqlite3 "%DATABASE_PATH%" "SELECT id, username, role FROM users LIMIT 5;" 2>nul
echo.

echo ============================================
echo   Database Setup Complete!
echo ============================================
echo.
echo Database location: %CD%\%DATABASE_PATH%
echo.
echo You can now:
echo   1. Run the backend: cargo run -p easysale-server --bin easysale-server
echo   2. Build for production: cargo build -p easysale-server --release
echo   3. Run tests: cargo test -p easysale-server
echo.
pause
