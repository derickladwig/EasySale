# EasySale Client Registration Script for Windows
# Run as Administrator

param(
    [Parameter(Mandatory=$false)]
    [string]$ServerIP = "",
    
    [Parameter(Mandatory=$false)]
    [string]$DeviceName = "",
    
    [Parameter(Mandatory=$false)]
    [string]$DeviceType = "POS_TERMINAL",
    
    [switch]$Help
)

# Script configuration
$ErrorActionPreference = "Stop"
$INSTALL_DIR = "C:\Program Files\easysale-client"
$DATA_DIR = "C:\ProgramData\easysale-client"
$LOG_DIR = "$DATA_DIR\logs"

# Display help
if ($Help) {
    Write-Host @"
EasySale Client Registration Script for Windows

Usage:
    .\register.ps1 -ServerIP <IP> -DeviceName <NAME> [OPTIONS]

Parameters:
    -ServerIP STRING    Server IP address (required)
    -DeviceName STRING  Device name (required)
    -DeviceType STRING  Device type (default: POS_TERMINAL)
                        Options: POS_TERMINAL, WORKSTATION, KIOSK
    -Help               Display this help message

Examples:
    # Register POS terminal
    .\register.ps1 -ServerIP "192.168.1.100" -DeviceName "POS-Terminal-1"

    # Register workstation
    .\register.ps1 -ServerIP "192.168.1.100" -DeviceName "Office-PC-1" -DeviceType "WORKSTATION"
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
    Write-Error "This script must be run as Administrator."
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EasySale Client Registration for Windows" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Prompt for required parameters if not provided
if ([string]::IsNullOrEmpty($ServerIP)) {
    $ServerIP = Read-Host "Enter server IP address"
}

if ([string]::IsNullOrEmpty($DeviceName)) {
    $DeviceName = Read-Host "Enter device name"
}

# Step 1: System Requirements Check
Write-Host "[1/5] Checking system requirements..." -ForegroundColor Yellow

# Check OS version
$osVersion = [System.Environment]::OSVersion.Version
if ($osVersion.Major -lt 10) {
    Write-Error "Windows 10 or later is required."
    exit 1
}
Write-Host "  ✓ OS version: Windows $($osVersion.Major).$($osVersion.Minor)" -ForegroundColor Green

# Step 2: Test Server Connectivity
Write-Host ""
Write-Host "[2/5] Testing server connectivity..." -ForegroundColor Yellow

$serverUrl = "http://${ServerIP}:8080"
try {
    $response = Invoke-WebRequest -Uri "$serverUrl/health" -TimeoutSec 5 -UseBasicParsing
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✓ Server is reachable at $serverUrl" -ForegroundColor Green
    }
} catch {
    Write-Error "Cannot connect to server at $serverUrl. Please check the IP address and ensure the server is running."
    exit 1
}

# Step 3: Create Directories
Write-Host ""
Write-Host "[3/5] Creating directories..." -ForegroundColor Yellow

$directories = @($INSTALL_DIR, $DATA_DIR, $LOG_DIR)
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Created: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ✓ Exists: $dir" -ForegroundColor Green
    }
}

# Step 4: Device Registration
Write-Host ""
Write-Host "[4/5] Registering device..." -ForegroundColor Yellow

# Generate Device ID
$deviceId = [guid]::NewGuid().ToString()

# Create configuration file
$configContent = @"
# EasySale Client Configuration
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

# Server Connection
SERVER_URL=$serverUrl
SERVER_TIMEOUT_SECONDS=30

# Device Configuration
DEVICE_ID=$deviceId
DEVICE_NAME=$DeviceName
DEVICE_TYPE=$DeviceType

# Hardware Configuration
BARCODE_SCANNER_PORT=COM3
RECEIPT_PRINTER_NAME=
LABEL_PRINTER_NAME=
CASH_DRAWER_ENABLED=true

# UI Configuration
TOUCH_MODE=true
SCREEN_TIMEOUT_MINUTES=15
AUTO_LOGOUT_MINUTES=30

# Logging Configuration
LOG_LEVEL=info
LOG_PATH=$LOG_DIR
"@

$configPath = "$DATA_DIR\client.env"
$configContent | Out-File -FilePath $configPath -Encoding UTF8
Write-Host "  ✓ Configuration file created: $configPath" -ForegroundColor Green
Write-Host "  ✓ Device ID: $deviceId" -ForegroundColor Green
Write-Host "  ✓ Device Name: $DeviceName" -ForegroundColor Green

# Step 5: Hardware Configuration
Write-Host ""
Write-Host "[5/5] Hardware configuration..." -ForegroundColor Yellow
Write-Host "  Note: Hardware must be configured manually after installation." -ForegroundColor Cyan
Write-Host "  Supported hardware:" -ForegroundColor Cyan
Write-Host "    - Barcode scanners (USB/Serial)" -ForegroundColor Cyan
Write-Host "    - Receipt printers (ESC/POS)" -ForegroundColor Cyan
Write-Host "    - Label printers (Zebra ZPL)" -ForegroundColor Cyan
Write-Host "    - Cash drawers (via printer)" -ForegroundColor Cyan
Write-Host "    - Payment terminals (optional)" -ForegroundColor Cyan

# Installation Complete
Write-Host ""
Write-Host "Registration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Install the EasySale desktop application" -ForegroundColor White
Write-Host "2. Configure hardware devices (printers, scanners)" -ForegroundColor White
Write-Host "3. Launch the application" -ForegroundColor White
Write-Host "4. Log in with your credentials" -ForegroundColor White
Write-Host ""
Write-Host "Configuration file: $configPath" -ForegroundColor Yellow
Write-Host "Device ID: $deviceId" -ForegroundColor Yellow
Write-Host "Server URL: $serverUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "For support, visit: https://docs.EasySale.example.com" -ForegroundColor Cyan
Write-Host ""
