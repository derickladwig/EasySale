# Archive Exclusion Verification Script
# Verifies that archive/ directory is excluded from all builds and packages
# Part of Task 2.4: Archive exclusion from builds

param(
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$exitCode = 0

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Archive Exclusion Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check 1: Verify archive/ not in Rust workspace members
Write-Host "[1/6] Checking Rust workspace configuration..." -ForegroundColor Yellow
$cargoToml = Get-Content "backend/Cargo.toml" -Raw
if ($cargoToml -match 'members\s*=\s*\[(.*?)\]' -and $Matches[1] -match 'archive') {
    Write-Host "  X FAIL: archive/ found in Cargo.toml workspace members" -ForegroundColor Red
    $exitCode = 1
}
else {
    Write-Host "  OK PASS: archive/ not in Cargo.toml workspace members" -ForegroundColor Green
}

# Check 2: Verify archive/ in TypeScript exclude lists
Write-Host ""
Write-Host "[2/6] Checking TypeScript configuration..." -ForegroundColor Yellow

$tsconfigJson = Get-Content "frontend/tsconfig.json" -Raw
if ($tsconfigJson -match '"exclude":\s*\[.*?"archive".*?\]') {
    Write-Host "  OK PASS: archive/ in tsconfig.json exclude list" -ForegroundColor Green
}
else {
    Write-Host "  X FAIL: archive/ not in tsconfig.json exclude list" -ForegroundColor Red
    $exitCode = 1
}

$tsconfigBuildJson = Get-Content "frontend/tsconfig.build.json" -Raw
if ($tsconfigBuildJson -match '"archive"') {
    Write-Host "  OK PASS: archive/ in tsconfig.build.json exclude list" -ForegroundColor Green
}
else {
    Write-Host "  X FAIL: archive/ not in tsconfig.build.json exclude list" -ForegroundColor Red
    $exitCode = 1
}

# Check 3: Verify archive/ in .dockerignore
Write-Host ""
Write-Host "[3/6] Checking Docker ignore configuration..." -ForegroundColor Yellow
$dockerignore = Get-Content ".dockerignore" -Raw
if ($dockerignore -match '(?m)^\s*archive\s*$') {
    Write-Host "  OK PASS: archive/ in .dockerignore" -ForegroundColor Green
}
else {
    Write-Host "  X FAIL: archive/ not in .dockerignore" -ForegroundColor Red
    $exitCode = 1
}

# Check 4: Verify Dockerfile doesn't copy archive/
Write-Host ""
Write-Host "[4/6] Checking Dockerfile..." -ForegroundColor Yellow
$dockerfile = Get-Content "Dockerfile.backend" -Raw
if ($dockerfile -match 'COPY.*archive') {
    Write-Host "  X FAIL: Dockerfile.backend copies archive/ directory" -ForegroundColor Red
    $exitCode = 1
}
else {
    Write-Host "  OK PASS: Dockerfile.backend does not copy archive/" -ForegroundColor Green
}

# Check 5: Verify build scripts don't reference archive/
Write-Host ""
Write-Host "[5/6] Checking build scripts..." -ForegroundColor Yellow
$buildScripts = @("build-prod.bat", "build-prod.sh")
$foundArchiveRef = $false

foreach ($script in $buildScripts) {
    if (Test-Path $script) {
        $content = Get-Content $script -Raw
        if ($content -match 'archive') {
            Write-Host "  X FAIL: $script references archive/ directory" -ForegroundColor Red
            $foundArchiveRef = $true
            $exitCode = 1
        }
    }
}

if (-not $foundArchiveRef) {
    Write-Host "  OK PASS: Build scripts do not reference archive/" -ForegroundColor Green
}

# Check 6: Verify installer scripts don't copy archive/
Write-Host ""
Write-Host "[6/6] Checking installer scripts..." -ForegroundColor Yellow
$installerScripts = Get-ChildItem -Path "installer" -Recurse -Include "*.ps1", "*.sh" -ErrorAction SilentlyContinue
$foundArchiveCopy = $false

foreach ($script in $installerScripts) {
    $content = Get-Content $script.FullName -Raw
    if ($content -match 'archive') {
        Write-Host "  X FAIL: $($script.Name) references archive/ directory" -ForegroundColor Red
        if ($Verbose) {
            Write-Host "    File: $($script.FullName)" -ForegroundColor Gray
        }
        $foundArchiveCopy = $true
        $exitCode = 1
    }
}

if (-not $foundArchiveCopy) {
    Write-Host "  OK PASS: Installer scripts do not reference archive/" -ForegroundColor Green
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "OK All checks passed!" -ForegroundColor Green
    Write-Host "archive/ directory is properly excluded from builds" -ForegroundColor Green
}
else {
    Write-Host "X Some checks failed!" -ForegroundColor Red
    Write-Host "Please fix the issues above" -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

exit $exitCode
