# EasySale Server Installation Script for Windows
# Run as Administrator

param(
    [switch]$Unattended,
    [string]$ConfigFile = "",
    [switch]$SkipDependencies,
    [switch]$Help
)

# Script configuration
$ErrorActionPreference = "Stop"
$INSTALL_DIR = "C:\Program Files\EasySale"
$DATA_DIR = "C:\ProgramData\EasySale"
$LOG_DIR = "$DATA_DIR\logs"
$BACKUP_DIR = "C:\easysale-backups"

# Display help
if ($Help) {
    Write-Host @"
EasySale Server Installation Script for Windows

Usage:
    .\install.ps1 [OPTIONS]

Options:
    -Unattended         Run installation without prompts
    -ConfigFile PATH    Use configuration file for unattended install
    -SkipDependencies   Skip dependency installation (use if already installed)
    -Help               Display this help message

Examples:
    # Interactive installation
    .\install.ps1

    # Unattended installation with config file
    .\install.ps1 -Unattended -ConfigFile "C:\config\server.env"

    # Skip dependency check
    .\install.ps1 -SkipDependencies
"@
    exit 0
}

# Check if running as Administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (-not (Test-Administrator)) {
    Write-Error "This script must be run as Administrator. Please restart PowerShell as Administrator and try again."
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EasySale Server Installation for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: System Requirements Check
Write-Host "[1/7] Checking system requirements..." -ForegroundColor Yellow

# Check OS version
$osVersion = [System.Environment]::OSVersion.Version
if ($osVersion.Major -lt 10) {
    Write-Error "Windows 10 or Windows Server 2019 or later is required."
    exit 1
}
Write-Host "  ✓ OS version: Windows $($osVersion.Major).$($osVersion.Minor)" -ForegroundColor Green

# Check disk space (minimum 50GB)
$drive = Get-PSDrive -Name C
$freeSpaceGB = [math]::Round($drive.Free / 1GB, 2)
if ($freeSpaceGB -lt 50) {
    Write-Warning "Low disk space: ${freeSpaceGB}GB available. Minimum 50GB recommended."
    if (-not $Unattended) {
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") { exit 1 }
    }
} else {
    Write-Host "  ✓ Disk space: ${freeSpaceGB}GB available" -ForegroundColor Green
}

# Check RAM (minimum 8GB)
$ram = Get-CimInstance -ClassName Win32_ComputerSystem
$ramGB = [math]::Round($ram.TotalPhysicalMemory / 1GB, 2)
if ($ramGB -lt 8) {
    Write-Warning "Low RAM: ${ramGB}GB available. Minimum 8GB recommended."
}
Write-Host "  ✓ RAM: ${ramGB}GB" -ForegroundColor Green

# Step 2: Dependency Installation
if (-not $SkipDependencies) {
    Write-Host ""
    Write-Host "[2/7] Installing dependencies..." -ForegroundColor Yellow
    Write-Host "  Note: This step requires manual installation of dependencies." -ForegroundColor Cyan
    Write-Host "  Please install the following if not already installed:" -ForegroundColor Cyan
    Write-Host "    - SQLite 3.35+ (https://www.sqlite.org/download.html)" -ForegroundColor Cyan
    Write-Host "    - Rust (https://rustup.rs/)" -ForegroundColor Cyan
    Write-Host "    - Python 3.10+ (https://www.python.org/downloads/)" -ForegroundColor Cyan
    Write-Host "    - Node.js 18+ (https://nodejs.org/)" -ForegroundColor Cyan
    
    if (-not $Unattended) {
        $continue = Read-Host "Have you installed all dependencies? (y/n)"
        if ($continue -ne "y") {
            Write-Host "Please install dependencies and run this script again." -ForegroundColor Yellow
            exit 0
        }
    }
} else {
    Write-Host ""
    Write-Host "[2/7] Skipping dependency installation..." -ForegroundColor Yellow
}

# Step 3: Create directories
Write-Host ""
Write-Host "[3/7] Creating directories..." -ForegroundColor Yellow

$directories = @($INSTALL_DIR, $DATA_DIR, $LOG_DIR, "$DATA_DIR\database", $BACKUP_DIR)
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Exists: $dir" -ForegroundColor Green
    }
}

# Step 4: Database Initialization
Write-Host ""
Write-Host "[4/7] Initializing database..." -ForegroundColor Yellow
Write-Host "  Note: Database initialization will be performed on first application start." -ForegroundColor Cyan
Write-Host "  ✓ Database path configured: $DATA_DIR\database\pos.db" -ForegroundColor Green

# Step 5: Service Configuration
Write-Host ""
Write-Host "[5/7] Configuring services..." -ForegroundColor Yellow

# Generate JWT secret
$jwtSecret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | ForEach-Object {[char]$_})

# Generate Store ID
$storeId = [guid]::NewGuid().ToString()

# Create configuration file
$configContent = @"
# EasySale Server Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Database Configuration
DATABASE_PATH=$DATA_DIR\database\pos.db
DATABASE_BACKUP_PATH=$BACKUP_DIR

# API Configuration
API_PORT=8080
API_HOST=0.0.0.0
JWT_SECRET=$jwtSecret
JWT_EXPIRATION_HOURS=8

# Store Configuration
STORE_ID=$storeId
STORE_NAME=Main Store
STORE_TIMEZONE=America/New_York

# Sync Configuration
SYNC_ENABLED=false
SYNC_INTERVAL_SECONDS=300
SYNC_MASTER_URL=

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_INTERVAL_HOURS=24
BACKUP_RETENTION_DAYS=30

# Logging Configuration
LOG_LEVEL=info
LOG_PATH=$LOG_DIR
"@

$configPath = "$DATA_DIR\server.env"
$configContent | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "  ✓ Configuration file created: $configPath" -ForegroundColor Green
Write-Host "  ✓ Store ID: $storeId" -ForegroundColor Green

# Step 6: Network Configuration
Write-Host ""
Write-Host "[6/7] Configuring network..." -ForegroundColor Yellow
Write-Host "  Note: Firewall rules must be configured manually." -ForegroundColor Cyan
Write-Host "  Required: Allow inbound TCP port 8080 for API access" -ForegroundColor Cyan

# Step 7: Installation Complete
Write-Host ""
Write-Host "[7/7] Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Copy the backend binaries to: $INSTALL_DIR" -ForegroundColor White
Write-Host "2. Configure Windows Service to run the backend API" -ForegroundColor White
Write-Host "3. Configure firewall to allow port 8080" -ForegroundColor White
Write-Host "4. Start the EasySale service" -ForegroundColor White
Write-Host "5. Access the admin dashboard at: http://localhost:8080" -ForegroundColor White
Write-Host "6. Change the default admin password" -ForegroundColor White
Write-Host ""
Write-Host "Configuration file: $configPath" -ForegroundColor Yellow
Write-Host "Store ID: $storeId" -ForegroundColor Yellow
Write-Host ""
Write-Host "For support, visit: https://docs.EasySale.example.com" -ForegroundColor Cyan
Write-Host ""
