#!/usr/bin/env pwsh
<#
.SYNOPSIS
    EasySale Windows Upgrade Script

.DESCRIPTION
    Upgrades an existing EasySale installation:
    1. Backup current installation
    2. Stop service
    3. Replace binaries
    4. Run database migrations
    5. Restart service
    6. Validate health or provide rollback instructions

.PARAMETER ServerPackage
    Path to new server package ZIP file (required)

.PARAMETER ClientPackage
    Path to new client package ZIP file (optional)

.PARAMETER ServiceName
    Windows Service name (default: EasySale)

.PARAMETER InstallPath
    Installation directory (default: C:\Program Files\EasySale)

.PARAMETER DataPath
    Data directory (default: C:\ProgramData\EasySale)

.PARAMETER Port
    Server port (default: 7945)

.PARAMETER SkipBackup
    Skip backup creation (not recommended)

.EXAMPLE
    .\upgrade.ps1 -ServerPackage "easysale-windows-server-v1.1.0.zip"
    
.EXAMPLE
    .\upgrade.ps1 -ServerPackage "server.zip" -ClientPackage "client.zip"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerPackage,
    
    [string]$ClientPackage = "",
    
    [string]$ServiceName = "EasySale",
    
    [string]$InstallPath = "C:\Program Files\EasySale",
    
    [string]$DataPath = "C:\ProgramData\EasySale",
    
    [int]$Port = 7945,
    
    [switch]$SkipBackup
)

$ErrorActionPreference = "Stop"

# Color output helpers
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param([string]$Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Failure { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Warning { param([string]$Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

Write-Info "EasySale Windows Upgrade"
Write-Info "========================"
Write-Info "Service Name: $ServiceName"
Write-Info "Install Path: $InstallPath"
Write-Info "Data Path: $DataPath"
Write-Info ""

# ============================================================================
# Step 1: Check Administrator Privileges
# ============================================================================

Write-Info "Checking administrator privileges..."

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Failure "This upgrade script must be run as Administrator"
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
# Step 3: Verify Existing Installation
# ============================================================================

Write-Info ""
Write-Info "Verifying existing installation..."

if (-not (Test-Path $InstallPath)) {
    Write-Failure "Installation not found: $InstallPath"
    Write-Info "Please use install.ps1 for new installations"
    exit 1
}
Write-Success "Existing installation found"

$binaryPath = Join-Path $InstallPath "bin\easysale-server.exe"
if (-not (Test-Path $binaryPath)) {
    Write-Failure "Server binary not found: $binaryPath"
    exit 1
}
Write-Success "Server binary verified"

# ============================================================================
# Step 4: Create Backup
# ============================================================================

if (-not $SkipBackup) {
    Write-Info ""
    Write-Info "Creating backup..."
    
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $backupPath = Join-Path $DataPath "backups\upgrade-backup-$timestamp"
    
    if (-not (Test-Path (Split-Path $backupPath -Parent))) {
        New-Item -ItemType Directory -Path (Split-Path $backupPath -Parent) -Force | Out-Null
    }
    
    try {
        # Backup binaries
        $binBackup = Join-Path $backupPath "bin"
        Copy-Item -Path (Join-Path $InstallPath "bin") -Destination $binBackup -Recurse -Force
        Write-Success "Backed up binaries"
        
        # Backup database
        $dbPath = Join-Path $DataPath "data\pos.db"
        if (Test-Path $dbPath) {
            $dbBackup = Join-Path $backupPath "data"
            New-Item -ItemType Directory -Path $dbBackup -Force | Out-Null
            Copy-Item -Path $dbPath -Destination $dbBackup -Force
            Write-Success "Backed up database"
        }
        
        # Backup configuration
        $configPath = Join-Path $DataPath "config"
        if (Test-Path $configPath) {
            $configBackup = Join-Path $backupPath "config"
            Copy-Item -Path $configPath -Destination $configBackup -Recurse -Force
            Write-Success "Backed up configuration"
        }
        
        Write-Success "Backup created: $backupPath"
        
        # Save backup path for rollback
        $script:BackupPath = $backupPath
    } catch {
        Write-Failure "Failed to create backup: $_"
        Write-Info "Upgrade cancelled for safety"
        exit 1
    }
} else {
    Write-Warning "Skipping backup (not recommended)"
}

# ============================================================================
# Step 5: Stop Service
# ============================================================================

Write-Info ""
Write-Info "Stopping service..."

try {
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Stop-Service -Name $ServiceName -Force -ErrorAction Stop
            Write-Success "Stopped service: $ServiceName"
            
            # Wait for service to fully stop
            $maxWait = 30
            $waited = 0
            while ((Get-Service -Name $ServiceName).Status -ne "Stopped" -and $waited -lt $maxWait) {
                Start-Sleep -Seconds 1
                $waited++
            }
            
            if ((Get-Service -Name $ServiceName).Status -ne "Stopped") {
                Write-Warning "Service did not stop cleanly"
            }
        } else {
            Write-Info "Service is not running"
        }
    } else {
        Write-Warning "Service not found"
    }
} catch {
    Write-Failure "Failed to stop service: $_"
    Write-Info "Please stop the service manually and try again"
    exit 1
}

# ============================================================================
# Step 6: Replace Binaries
# ============================================================================

Write-Info ""
Write-Info "Replacing binaries..."

try {
    # Extract new server package to temporary location
    $tempExtract = Join-Path $env:TEMP "easysale-upgrade-$timestamp"
    if (Test-Path $tempExtract) {
        Remove-Item -Path $tempExtract -Recurse -Force
    }
    New-Item -ItemType Directory -Path $tempExtract -Force | Out-Null
    
    Expand-Archive -Path $ServerPackage -DestinationPath $tempExtract -Force
    Write-Success "Extracted new server package"
    
    # Replace binaries
    $newBinPath = Join-Path $tempExtract "bin"
    $oldBinPath = Join-Path $InstallPath "bin"
    
    if (Test-Path $newBinPath) {
        # Remove old binaries (except WinSW config)
        $serviceConfig = Join-Path $oldBinPath "$ServiceName.xml"
        $preserveFiles = @()
        if (Test-Path $serviceConfig) {
            $preserveFiles += $serviceConfig
        }
        
        Get-ChildItem -Path $oldBinPath | Where-Object { $_.FullName -notin $preserveFiles } | Remove-Item -Recurse -Force
        
        # Copy new binaries
        Copy-Item -Path "$newBinPath\*" -Destination $oldBinPath -Recurse -Force
        
        # Restore preserved files
        foreach ($file in $preserveFiles) {
            if (Test-Path $file) {
                Copy-Item -Path $file -Destination $oldBinPath -Force
            }
        }
        
        Write-Success "Replaced binaries"
    } else {
        Write-Failure "New binaries not found in package"
        throw "Invalid package structure"
    }
    
    # Clean up temp extraction
    Remove-Item -Path $tempExtract -Recurse -Force
    
} catch {
    Write-Failure "Failed to replace binaries: $_"
    Write-Info "Attempting rollback..."
    
    if ($script:BackupPath) {
        try {
            $binBackup = Join-Path $script:BackupPath "bin"
            Copy-Item -Path "$binBackup\*" -Destination (Join-Path $InstallPath "bin") -Recurse -Force
            Write-Success "Rolled back binaries"
        } catch {
            Write-Failure "Rollback failed: $_"
            Write-Info "Manual rollback required from: $script:BackupPath"
        }
    }
    
    exit 1
}

# ============================================================================
# Step 7: Replace Client (Optional)
# ============================================================================

if ($ClientPackage) {
    Write-Info ""
    Write-Info "Replacing client..."
    
    try {
        $clientPath = Join-Path $InstallPath "client"
        
        # Backup existing client
        if (Test-Path $clientPath) {
            $clientBackup = Join-Path $script:BackupPath "client"
            Copy-Item -Path $clientPath -Destination $clientBackup -Recurse -Force
        }
        
        # Remove old client
        if (Test-Path $clientPath) {
            Remove-Item -Path $clientPath -Recurse -Force
        }
        New-Item -ItemType Directory -Path $clientPath -Force | Out-Null
        
        # Extract new client
        Expand-Archive -Path $ClientPackage -DestinationPath $clientPath -Force
        Write-Success "Replaced client"
    } catch {
        Write-Warning "Failed to replace client: $_"
    }
}

# ============================================================================
# Step 8: Run Database Migrations
# ============================================================================

Write-Info ""
Write-Info "Running database migrations..."

# TODO: Implement database migration logic
# For now, just check if database exists
$dbPath = Join-Path $DataPath "data\pos.db"
if (Test-Path $dbPath) {
    Write-Info "Database found, migrations would run here"
    Write-Warning "Database migration not implemented yet"
} else {
    Write-Info "No database found (fresh installation)"
}

# ============================================================================
# Step 9: Restart Service
# ============================================================================

Write-Info ""
Write-Info "Starting service..."

try {
    Start-Service -Name $ServiceName -ErrorAction Stop
    Write-Success "Started service: $ServiceName"
} catch {
    Write-Failure "Failed to start service: $_"
    Write-Info "Rollback instructions:"
    Write-Info "  1. Restore binaries from: $script:BackupPath\bin"
    Write-Info "  2. Start service: Start-Service -Name $ServiceName"
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

$healthOk = $false
for ($i = 1; $i -le $maxRetries; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            Write-Success "Server is healthy"
            $healthOk = $true
            break
        }
    } catch {
        if ($i -eq $maxRetries) {
            Write-Failure "Server health check failed after $maxRetries attempts"
        } else {
            Write-Info "Waiting for server to start (attempt $i/$maxRetries)..."
            Start-Sleep -Seconds $retryDelay
        }
    }
}

if (-not $healthOk) {
    Write-Failure "Upgrade validation failed"
    Write-Info ""
    Write-Info "Rollback instructions:"
    Write-Info "  1. Stop service: Stop-Service -Name $ServiceName"
    Write-Info "  2. Restore binaries: Copy-Item -Path '$script:BackupPath\bin\*' -Destination '$InstallPath\bin' -Recurse -Force"
    Write-Info "  3. Restore database: Copy-Item -Path '$script:BackupPath\data\pos.db' -Destination '$DataPath\data\pos.db' -Force"
    Write-Info "  4. Start service: Start-Service -Name $ServiceName"
    Write-Info ""
    Write-Info "Logs: $DataPath\logs"
    exit 1
}

# ============================================================================
# Upgrade Complete
# ============================================================================

Write-Info ""
Write-Info "========================"
Write-Success "Upgrade Complete!"
Write-Info "========================"
Write-Info ""
Write-Info "Upgrade Details:"
Write-Info "  Service: $ServiceName"
Write-Info "  Install Path: $InstallPath"
Write-Info "  Data Path: $DataPath"
Write-Info "  Server URL: http://localhost:$Port"
Write-Info ""
Write-Info "Backup Location: $script:BackupPath"
Write-Info ""
Write-Info "Next Steps:"
Write-Info "  1. Verify application functionality"
Write-Info "  2. Check logs if needed: $DataPath\logs"
Write-Info "  3. Keep backup for 30 days: $script:BackupPath"

exit 0
