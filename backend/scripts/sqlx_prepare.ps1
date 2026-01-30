# SQLx Offline Mode Preparation Script
# Generates .sqlx/ metadata for offline compilation in CI/CD

param(
    [string]$DatabasePath = "data/pos.db",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "=== SQLx Offline Mode Preparation ===" -ForegroundColor Cyan
Write-Host ""

# Ensure we're in the backend directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptDir

Push-Location $backendDir

try {
    # Check if database exists
    if (-not (Test-Path $DatabasePath)) {
        Write-Host "ERROR: Database not found at: $DatabasePath" -ForegroundColor Red
        Write-Host "Please ensure the database exists before running this script." -ForegroundColor Yellow
        Write-Host "You can create it by running the server once or running migrations." -ForegroundColor Yellow
        exit 1
    }

    Write-Host "Database found at: $DatabasePath" -ForegroundColor Green

    # Resolve absolute path for DATABASE_URL
    $absoluteDbPath = Resolve-Path $DatabasePath
    $databaseUrl = "sqlite:$($absoluteDbPath.Path.Replace('\', '/'))"

    Write-Host "Database URL: $databaseUrl" -ForegroundColor Green
    Write-Host ""

    # Set environment variable for SQLx
    $env:DATABASE_URL = $databaseUrl

    Write-Host "Running cargo sqlx prepare..." -ForegroundColor Cyan
    Write-Host ""

    # Run sqlx prepare for the workspace
    if ($Verbose) {
        cargo sqlx prepare --workspace -- --all-targets --all-features
    } else {
        cargo sqlx prepare --workspace -- --all-targets --all-features 2>&1 | Out-Null
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: SQLx prepare failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }

    Write-Host ""
    Write-Host "SQLx metadata generated successfully!" -ForegroundColor Green
    Write-Host ""

    # Check if .sqlx directory was created
    if (Test-Path ".sqlx") {
        $sqlxFiles = Get-ChildItem -Path ".sqlx" -Recurse -File
        Write-Host "Generated $($sqlxFiles.Count) metadata file(s) in .sqlx/" -ForegroundColor Green
        
        if ($Verbose) {
            Write-Host ""
            Write-Host "Metadata files:" -ForegroundColor Cyan
            foreach ($file in $sqlxFiles) {
                Write-Host "  - $($file.FullName.Replace($backendDir, '.'))" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "WARNING: .sqlx directory not found after prepare" -ForegroundColor Yellow
    }

    Write-Host ""
    Write-Host "=== Preparation Complete ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The .sqlx/ directory now contains metadata for offline compilation." -ForegroundColor White
    Write-Host "You can now build without database connectivity using:" -ForegroundColor White
    Write-Host "  Set SQLX_OFFLINE=true and run cargo build" -ForegroundColor Yellow
    Write-Host ""

}
catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
