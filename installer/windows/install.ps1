#!/usr/bin/env pwsh
<#
.SYNOPSIS
    EasySale Windows Installer

.DESCRIPTION
    Installs EasySale on Windows with the following steps:
    1. Check administrator privileges
    2. Run preflight checks
    3. Extract artifacts to Program Files
    4. Create ProgramData structure
    5. Generate configuration from templates
    6. Install and start Windows Service
    7. Validate health

.PARAMETER Mode
    Installation mode: dev, demo, or prod (default: prod)

.PARAMETER InstallPath
    Installation directory (default: C:\Program Files\EasySale)

.PARAMETER DataPath
    Data directory (default: C:\ProgramData\EasySale)

.PARAMETER ServiceName
    Windows Service name (default: EasySale)

.PARAMETER Port
    Server port (default: 7945)

.PARAMETER ServerPackage
    Path to server package ZIP file (required)

.PARAMETER ClientPackage
    Path to client package ZIP file (optional)

.PARAMETER SkipPreflight
    Skip preflight checks (not recommended)

.EXAMPLE
    .\install.ps1 -Mode prod -ServerPackage "easysale-windows-server-v1.0.0.zip"
    
.EXAMPLE
    .\install.ps1 -Mode demo -ServerPackage "server.zip" -ClientPackage "client.zip" -Port 8080
#>

param(
    [ValidateSet("dev", "demo", "prod")]
    [string]$Mode = "prod",
    
    [string]$InstallPath = "C:\Program Files\EasySale",
    
    [string]$DataPath = "C:\ProgramData\EasySale",
    
    [string]$ServiceName = "EasySale",
    
    [int]$Port = 7945,
    
    [Parameter(Mandatory=$true)]
    [string]$ServerPackage,
    
    [string]$ClientPackage = "",
    
    [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"

# Color output helpers
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param([string]$Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Failure { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Warning { param([string]$Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

Write-Info "EasySale Windows Installer"
Write-Info "=========================="
Write-Info "Mode: $Mode"
Write-Info "Install Path: $InstallPath"
Write-Info "Data Path: $DataPath"
Write-Info "Service Name: $ServiceName"
Write-Info "Port: $Port"
Write-Info ""

# ============================================================================
# Step 1: Check Administrator Privileges
# ============================================================================

Write-Info "Checking administrator privileges..."

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Failure "This installer must be run as Administrator"
    Write-Info "Please right-click and select 'Run as Administrator'"
    exit 1
}

Write-Success "Running as Administrator"

# ============================================================================
# Step 2: Validate Packages
# ============================================================================

Write-Info ""
Write-Info "Validating packages..."

if (-not (Test-Path $ServerPackage)) {
    Write-Failure "Server package not found: $ServerPackage"
    exit 1
}
Write-Success "Server package found"

if ($ClientPackage -and -not (Test-Path $ClientPackage)) {
    Write-Failure "Client package not found: $ClientPackage"
    exit 1
}
if ($ClientPackage) {
    Write-Success "Client package found"
}

# ============================================================================
# Step 3: Run Preflight Checks
# ============================================================================

if (-not $SkipPreflight) {
    Write-Info ""
    Write-Info "Running preflight checks..."
    
    $preflightScript = Join-Path $PSScriptRoot "preflight.ps1"
    if (Test-Path $preflightScript) {
        $preflightResult = & $preflightScript -Mode $Mode -InstallPath $InstallPath -DataPath $DataPath -Port $Port
        $preflightExitCode = $LASTEXITCODE
        
        if ($preflightExitCode -eq 2) {
            Write-Failure "Preflight checks failed - Installation blocked"
            Write-Info "Please review the preflight report and fix the issues"
            exit 1
        } elseif ($preflightExitCode -eq 1) {
            Write-Warning "Preflight checks passed with warnings"
            $continue = Read-Host "Continue with installation? (y/N)"
            if ($continue -ne "y" -and $continue -ne "Y") {
                Write-Info "Installation cancelled"
                exit 0
            }
        } else {
            Write-Success "Preflight checks passed"
        }
    } else {
        Write-Warning "Preflight script not found, skipping checks"
    }
} else {
    Write-Warning "Skipping preflight checks (not recommended)"
}

# ============================================================================
# Step 4: Extract Server Package
# ============================================================================

Write-Info ""
Write-Info "Extracting server package..."

# Create install directory
if (-not (Test-Path $InstallPath)) {
    New-Item -ItemType Directory -Path $InstallPath -Force | Out-Null
    Write-Success "Created install directory"
}

# Extract server package
try {
    Expand-Archive -Path $ServerPackage -DestinationPath $InstallPath -Force
    Write-Success "Extracted server package"
} catch {
    Write-Failure "Failed to extract server package: $_"
    exit 1
}

# Verify binary exists
$binaryPath = Join-Path $InstallPath "bin\easysale-server.exe"
if (-not (Test-Path $binaryPath)) {
    Write-Failure "Server binary not found after extraction: $binaryPath"
    exit 1
}
Write-Success "Server binary verified"

# ============================================================================
# Step 4.5: Setup Assets
# ============================================================================

Write-Info ""
Write-Info "Setting up assets..."

# Import and run asset management
$AssetModulePath = Join-Path $PSScriptRoot "modules\AssetManager.psm1"
if (Test-Path $AssetModulePath) {
    Import-Module $AssetModulePath -Force
    Copy-EasySaleAssets -SourcePath (Join-Path $PSScriptRoot "assets") -DestinationPath $InstallPath -ConfigPath ""
} else {
    Write-Warning "Asset manager module not found, skipping asset setup"
}

# ============================================================================
# Step 5: Extract Client Package (Optional)
# ============================================================================

if ($ClientPackage) {
    Write-Info ""
    Write-Info "Extracting client package..."
    
    $clientPath = Join-Path $InstallPath "client"
    if (-not (Test-Path $clientPath)) {
        New-Item -ItemType Directory -Path $clientPath -Force | Out-Null
    }
    
    try {
        Expand-Archive -Path $ClientPackage -DestinationPath $clientPath -Force
        Write-Success "Extracted client package"
    } catch {
        Write-Failure "Failed to extract client package: $_"
        exit 1
    }
}

# ============================================================================
# Step 6: Create ProgramData Structure
# ============================================================================

Write-Info ""
Write-Info "Creating data directories..."

$dataDirs = @(
    (Join-Path $DataPath "config"),
    (Join-Path $DataPath "data"),
    (Join-Path $DataPath "logs"),
    (Join-Path $DataPath "backups")
)

foreach ($dir in $dataDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-Success "Created data directories"

# ============================================================================
# Step 7: Generate Configuration
# ============================================================================

Write-Info ""
Write-Info "Generating configuration..."

$configPath = Join-Path $DataPath "config\server.env"
$templatePath = Join-Path $InstallPath "templates\server.env.template"

if (Test-Path $templatePath) {
    $template = Get-Content $templatePath -Raw
    
    # Replace template variables
    $config = $template `
        -replace '{{DATA_PATH}}', $DataPath `
        -replace '{{PORT}}', $Port `
        -replace '{{MODE}}', $Mode `
        -replace '{{RUNTIME_PROFILE}}', $Mode
    
    Set-Content -Path $configPath -Value $config -Force
    Write-Success "Generated configuration file"
} else {
    Write-Warning "Configuration template not found, creating minimal config"
    
    $minimalConfig = @"
# EasySale Server Configuration
DATABASE_PATH=$DataPath\data\pos.db
SERVER_PORT=$Port
RUNTIME_PROFILE=$Mode
LOG_LEVEL=info
"@
    Set-Content -Path $configPath -Value $minimalConfig -Force
    Write-Success "Created minimal configuration"
}

# ============================================================================
# Step 8: Install Windows Service
# ============================================================================

Write-Info ""
Write-Info "Installing Windows Service..."

$winswPath = Join-Path $InstallPath "bin\WinSW.exe"
$serviceConfigTemplate = Join-Path $InstallPath "templates\easysale-service.xml.template"
$serviceConfig = Join-Path $InstallPath "bin\$ServiceName.xml"

if (Test-Path $winswPath) {
    if (Test-Path $serviceConfigTemplate) {
        # Generate service configuration from template
        $template = Get-Content $serviceConfigTemplate -Raw
        $config = $template `
            -replace '{{INSTALL_PATH}}', $InstallPath `
            -replace '{{DATA_PATH}}', $DataPath `
            -replace '{{SERVICE_NAME}}', $ServiceName `
            -replace '{{PORT}}', $Port `
            -replace '{{RUNTIME_PROFILE}}', $Mode
        
        Set-Content -Path $serviceConfig -Value $config -Force
        Write-Success "Generated service configuration"
    } else {
        Write-Failure "Service configuration template not found"
        exit 1
    }
    
    # Install service using WinSW
    try {
        $installArgs = "install", $serviceConfig
        & $winswPath $installArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Installed Windows Service: $ServiceName"
        } else {
            Write-Failure "Failed to install service (exit code: $LASTEXITCODE)"
            exit 1
        }
    } catch {
        Write-Failure "Failed to install service: $_"
        exit 1
    }
} else {
    Write-Warning "WinSW not found, skipping service installation"
    Write-Info "You can run the server manually: $binaryPath"
}

# ============================================================================
# Step 9: Start Service
# ============================================================================

Write-Info ""
Write-Info "Starting service..."

try {
    Start-Service -Name $ServiceName -ErrorAction Stop
    Write-Success "Started service: $ServiceName"
} catch {
    Write-Failure "Failed to start service: $_"
    Write-Info "You can start it manually: Start-Service -Name $ServiceName"
    exit 1
}

# ============================================================================
# Step 10: Validate Health
# ============================================================================

Write-Info ""
Write-Info "Validating server health..."

$maxRetries = 10
$retryDelay = 3
$healthUrl = "http://localhost:$Port/health"

for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "Server is healthy"
            break
        }
    } catch {
        if ($i -eq $maxRetries) {
            Write-Failure "Server health check failed after $maxRetries attempts"
            Write-Info "Please check the logs: $DataPath\logs"
            exit 1
        }
        Write-Info "Waiting for server to start (attempt $i/$maxRetries)..."
        Start-Sleep -Seconds $retryDelay
    }
}

# ============================================================================
# Installation Complete
# ============================================================================

Write-Info ""
Write-Info "=========================="
Write-Success "Installation Complete!"
Write-Info "=========================="
Write-Info ""
Write-Info "Installation Details:"
Write-Info "  Mode: $Mode"
Write-Info "  Install Path: $InstallPath"
Write-Info "  Data Path: $DataPath"
Write-Info "  Service Name: $ServiceName"
Write-Info "  Server Port: $Port"
Write-Info "  Server URL: http://localhost:$Port"
Write-Info ""
Write-Info "Service Management:"
Write-Info "  Start: Start-Service -Name $ServiceName"
Write-Info "  Stop: Stop-Service -Name $ServiceName"
Write-Info "  Status: Get-Service -Name $ServiceName"
Write-Info ""
Write-Info "Configuration:"
Write-Info "  Config File: $configPath"
Write-Info "  Logs: $DataPath\logs"
Write-Info ""
Write-Info "Next Steps:"
Write-Info "  1. Review configuration: $configPath"
Write-Info "  2. Access the application: http://localhost:$Port"
Write-Info "  3. Check logs if needed: $DataPath\logs"

exit 0
