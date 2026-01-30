# SQLx Offline Mode Check Script
# Verifies that the backend compiles successfully with SQLX_OFFLINE=true

param(
    [switch]$Release,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

Write-Host "=== SQLx Offline Mode Check ===" -ForegroundColor Cyan
Write-Host ""

# Ensure we're in the backend directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Split-Path -Parent $scriptDir

Push-Location $backendDir

try {
    # Check if .sqlx directory exists
    if (-not (Test-Path ".sqlx")) {
        Write-Host "❌ .sqlx directory not found!" -ForegroundColor Red
        Write-Host ""
        Write-Host "SQLx offline mode requires metadata to be generated first." -ForegroundColor Yellow
        Write-Host "Please run: .\scripts\sqlx_prepare.ps1" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

    Write-Host "✓ .sqlx metadata directory found" -ForegroundColor Green
    
    # Count metadata files
    $sqlxFiles = Get-ChildItem -Path ".sqlx" -Recurse -File
    Write-Host "✓ Found $($sqlxFiles.Count) metadata file(s)" -ForegroundColor Green
    Write-Host ""

    # Set SQLX_OFFLINE environment variable
    $env:SQLX_OFFLINE = "true"

    Write-Host "Running cargo check with SQLX_OFFLINE=true..." -ForegroundColor Cyan
    Write-Host ""

    # Build cargo check command
    $cargoArgs = @("check", "--workspace", "--all-targets", "--all-features")
    
    if ($Release) {
        $cargoArgs += "--release"
        Write-Host "Mode: Release" -ForegroundColor Gray
    } else {
        Write-Host "Mode: Debug" -ForegroundColor Gray
    }
    
    Write-Host ""

    # Run cargo check
    if ($Verbose) {
        & cargo @cargoArgs
    } else {
        & cargo @cargoArgs 2>&1 | ForEach-Object {
            # Filter out some noise but keep important messages
            if ($_ -match "Checking|Compiling|Finished|error|warning") {
                Write-Host $_
            }
        }
    }

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "❌ Cargo check failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        Write-Host ""
        Write-Host "This indicates that the code cannot compile in offline mode." -ForegroundColor Yellow
        Write-Host "Possible causes:" -ForegroundColor Yellow
        Write-Host "  1. .sqlx metadata is out of date (run sqlx_prepare.ps1)" -ForegroundColor Yellow
        Write-Host "  2. New SQLx queries were added without regenerating metadata" -ForegroundColor Yellow
        Write-Host "  3. Database schema changed without updating metadata" -ForegroundColor Yellow
        Write-Host ""
        exit $LASTEXITCODE
    }

    Write-Host ""
    Write-Host "✓ Cargo check passed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Check Complete ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "The backend compiles successfully in offline mode." -ForegroundColor White
    Write-Host "This configuration is suitable for CI/CD environments." -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
    exit 1
} finally {
    Pop-Location
}
