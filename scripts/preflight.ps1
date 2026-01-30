# ============================================
# EasySale - Windows Configuration Wizard
# ============================================
# Interactive wizard for generating .env configuration
# Validates inputs and provides sensible defaults

param(
    [switch]$NonInteractive,
    [switch]$Help
)

# Show help
if ($Help) {
    Write-Host @"

EasySale Configuration Wizard

Usage: preflight.ps1 [options]

Options:
  -NonInteractive    Run without prompts (use defaults)
  -Help              Show this help message

This wizard will:
  1. Check for existing .env file
  2. Load .env.example as template
  3. Prompt for required configuration values
  4. Validate inputs
  5. Generate .env file

For fresh installations, just run:
  powershell -ExecutionPolicy Bypass -File scripts\preflight.ps1

"@
    exit 0
}

# Set error action preference
$ErrorActionPreference = "Stop"

# Get repository root
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  EasySale - Configuration Wizard" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env already exists
if (Test-Path ".env") {
    Write-Host "[INFO] Existing .env file found" -ForegroundColor Yellow
    Write-Host ""
    
    if (-not $NonInteractive) {
        $response = Read-Host "Do you want to overwrite it? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-Host "[INFO] Keeping existing .env file" -ForegroundColor Green
            exit 0
        }
    } else {
        Write-Host "[INFO] Non-interactive mode: keeping existing .env" -ForegroundColor Green
        exit 0
    }
}

# Check if .env.example exists
if (-not (Test-Path ".env.example")) {
    Write-Host "[ERROR] .env.example not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "The .env.example template file is missing."
    Write-Host "Please ensure the repository is complete."
    Write-Host ""
    exit 1
}

Write-Host "[1/5] Loading configuration template..." -ForegroundColor Cyan
$envExample = Get-Content ".env.example" -Raw

# Configuration values to collect
$config = @{}

Write-Host "[OK] Template loaded" -ForegroundColor Green
Write-Host ""

# ============================================
# 2. COLLECT CONFIGURATION VALUES
# ============================================
Write-Host "[2/5] Collecting configuration values..." -ForegroundColor Cyan
Write-Host ""

if (-not $NonInteractive) {
    Write-Host "Please provide the following configuration values." -ForegroundColor Yellow
    Write-Host "Press Enter to use the default value shown in [brackets]." -ForegroundColor Yellow
    Write-Host ""
    
    # Tenant ID
    Write-Host "Tenant ID (unique identifier for your business):" -ForegroundColor White
    Write-Host "  Examples: default, retail-store, restaurant, service-business" -ForegroundColor Gray
    $tenantId = Read-Host "  Tenant ID [default]"
    if ([string]::IsNullOrWhiteSpace($tenantId)) {
        $tenantId = "default"
    }
    $config["TENANT_ID"] = $tenantId
    Write-Host ""
    
    # Store ID
    Write-Host "Store ID (unique identifier for this location):" -ForegroundColor White
    Write-Host "  Examples: store-001, main-store, downtown-location" -ForegroundColor Gray
    $storeId = Read-Host "  Store ID [store-001]"
    if ([string]::IsNullOrWhiteSpace($storeId)) {
        $storeId = "store-001"
    }
    $config["STORE_ID"] = $storeId
    Write-Host ""
    
    # Store Name
    Write-Host "Store Name (human-readable name):" -ForegroundColor White
    $storeName = Read-Host "  Store Name [Main Store]"
    if ([string]::IsNullOrWhiteSpace($storeName)) {
        $storeName = "Main Store"
    }
    $config["STORE_NAME"] = $storeName
    Write-Host ""
    
    # JWT Secret
    Write-Host "JWT Secret (leave blank to generate random):" -ForegroundColor White
    Write-Host "  This is used for authentication tokens" -ForegroundColor Gray
    $jwtSecret = Read-Host "  JWT Secret [auto-generate]"
    if ([string]::IsNullOrWhiteSpace($jwtSecret)) {
        # Generate random base64 string
        $bytes = New-Object byte[] 32
        [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
        $jwtSecret = [Convert]::ToBase64String($bytes)
        Write-Host "  Generated: $jwtSecret" -ForegroundColor Green
    }
    $config["JWT_SECRET"] = $jwtSecret
    Write-Host ""
    
    # API Port
    Write-Host "API Port:" -ForegroundColor White
    $apiPort = Read-Host "  API Port [8923]"
    if ([string]::IsNullOrWhiteSpace($apiPort)) {
        $apiPort = "8923"
    }
    $config["API_PORT"] = $apiPort
    Write-Host ""
    
    # Frontend Port (Vite)
    Write-Host "Frontend Port:" -ForegroundColor White
    $vitePort = Read-Host "  Frontend Port [7945]"
    if ([string]::IsNullOrWhiteSpace($vitePort)) {
        $vitePort = "7945"
    }
    $config["VITE_PORT"] = $vitePort
    Write-Host ""
    
} else {
    # Non-interactive mode: use defaults
    Write-Host "[INFO] Non-interactive mode: using default values" -ForegroundColor Yellow
    $config["TENANT_ID"] = "default"
    $config["STORE_ID"] = "store-001"
    $config["STORE_NAME"] = "Main Store"
    
    # Generate JWT secret
    $bytes = New-Object byte[] 32
    [Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
    $config["JWT_SECRET"] = [Convert]::ToBase64String($bytes)
    
    $config["API_PORT"] = "8923"
    $config["VITE_PORT"] = "7945"
}

Write-Host "[OK] Configuration values collected" -ForegroundColor Green
Write-Host ""

# ============================================
# 3. VALIDATE CONFIGURATION
# ============================================
Write-Host "[3/5] Validating configuration..." -ForegroundColor Cyan

# Validate tenant ID (alphanumeric and hyphens only)
if ($config["TENANT_ID"] -notmatch '^[a-z0-9-]+$') {
    Write-Host "[ERROR] Invalid tenant ID: must contain only lowercase letters, numbers, and hyphens" -ForegroundColor Red
    exit 1
}

# Validate store ID (alphanumeric and hyphens only)
if ($config["STORE_ID"] -notmatch '^[a-z0-9-]+$') {
    Write-Host "[ERROR] Invalid store ID: must contain only lowercase letters, numbers, and hyphens" -ForegroundColor Red
    exit 1
}

# Validate ports (must be numbers)
if ($config["API_PORT"] -notmatch '^\d+$') {
    Write-Host "[ERROR] Invalid API port: must be a number" -ForegroundColor Red
    exit 1
}

if ($config["VITE_PORT"] -notmatch '^\d+$') {
    Write-Host "[ERROR] Invalid frontend port: must be a number" -ForegroundColor Red
    exit 1
}

# Check for port conflicts
if ($config["API_PORT"] -eq $config["VITE_PORT"]) {
    Write-Host "[ERROR] API port and frontend port cannot be the same" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Configuration validated" -ForegroundColor Green
Write-Host ""

# ============================================
# 4. GENERATE .ENV FILE
# ============================================
Write-Host "[4/5] Generating .env file..." -ForegroundColor Cyan

# Replace placeholders in template
$envContent = $envExample

# Replace values
$envContent = $envContent -replace 'TENANT_ID=default', "TENANT_ID=$($config['TENANT_ID'])"
$envContent = $envContent -replace 'STORE_ID=store-001', "STORE_ID=$($config['STORE_ID'])"
$envContent = $envContent -replace 'STORE_NAME="Main Store"', "STORE_NAME=`"$($config['STORE_NAME'])`""
$envContent = $envContent -replace 'JWT_SECRET=CHANGE_ME_GENERATE_RANDOM_SECRET', "JWT_SECRET=$($config['JWT_SECRET'])"
$envContent = $envContent -replace 'API_PORT=8923', "API_PORT=$($config['API_PORT'])"
$envContent = $envContent -replace 'VITE_PORT=7945', "VITE_PORT=$($config['VITE_PORT'])"

# Update API URLs with correct port
$envContent = $envContent -replace 'API_BASE_URL=http://localhost:8923', "API_BASE_URL=http://localhost:$($config['API_PORT'])"
$envContent = $envContent -replace 'VITE_API_URL=http://localhost:8923', "VITE_API_URL=http://localhost:$($config['API_PORT'])"
$envContent = $envContent -replace 'OAUTH_REDIRECT_URI=http://localhost:7945', "OAUTH_REDIRECT_URI=http://localhost:$($config['VITE_PORT'])"

# Write .env file
$envContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host "[OK] .env file generated" -ForegroundColor Green
Write-Host ""

# ============================================
# 5. VERIFY CONFIGURATION FILE
# ============================================
Write-Host "[5/5] Verifying configuration file..." -ForegroundColor Cyan

# Check tenant config file
$configPath = "configs/private/$($config['TENANT_ID']).json"
if (-not (Test-Path $configPath)) {
    Write-Host "[WARNING] Tenant configuration file not found: $configPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You will need to create a tenant configuration file at:" -ForegroundColor Yellow
    Write-Host "  $configPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "You can use configs/examples/ as a reference." -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "[OK] Tenant configuration file found: $configPath" -ForegroundColor Green
}

Write-Host "[OK] Configuration complete" -ForegroundColor Green
Write-Host ""

# ============================================
# 6. DISPLAY SUMMARY
# ============================================
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Configuration Summary" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tenant ID:      $($config['TENANT_ID'])" -ForegroundColor White
Write-Host "Store ID:       $($config['STORE_ID'])" -ForegroundColor White
Write-Host "Store Name:     $($config['STORE_NAME'])" -ForegroundColor White
Write-Host "API Port:       $($config['API_PORT'])" -ForegroundColor White
Write-Host "Frontend Port:  $($config['VITE_PORT'])" -ForegroundColor White
Write-Host "JWT Secret:     [HIDDEN]" -ForegroundColor White
Write-Host ""
Write-Host "Configuration file: .env" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review .env file and adjust as needed" -ForegroundColor White
Write-Host "  2. Create tenant config: $configPath" -ForegroundColor White
Write-Host "  3. Run: build-prod-windows.bat" -ForegroundColor White
Write-Host ""

exit 0
