#!/usr/bin/env pwsh
<#
.SYNOPSIS
    EasySale Windows Uninstaller

.DESCRIPTION
    Uninstalls EasySale from Windows:
    1. Stop and remove Windows Service
    2. Remove binaries from Program Files
    3. Optionally preserve or remove ProgramData

.PARAMETER ServiceName
    Windows Service name (default: EasySale)

.PARAMETER InstallPath
    Installation directory (default: C:\Program Files\EasySale)

.PARAMETER DataPath
    Data directory (default: C:\ProgramData\EasySale)

.PARAMETER RemoveData
    Remove data directory (database, logs, backups)
    WARNING: This will delete all data permanently!

.PARAMETER Force
    Skip confirmation prompts

.EXAMPLE
    .\uninstall.ps1
    
.EXAMPLE
    .\uninstall.ps1 -RemoveData -Force
#>

param(
    [string]$ServiceName = "EasySale",
    
    [string]$InstallPath = "C:\Program Files\EasySale",
    
    [string]$DataPath = "C:\ProgramData\EasySale",
    
    [switch]$RemoveData,
    
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Color output helpers
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param([string]$Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Failure { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Warning { param([string]$Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

Write-Info "EasySale Windows Uninstaller"
Write-Info "============================="
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
    Write-Failure "This uninstaller must be run as Administrator"
    Write-Info "Please right-click and select 'Run as Administrator'"
    exit 1
}

Write-Success "Running as Administrator"

# ============================================================================
# Step 2: Confirmation
# ============================================================================

if (-not $Force) {
    Write-Warning ""
    Write-Warning "This will uninstall EasySale from your system"
    if ($RemoveData) {
        Write-Warning "WARNING: Data will be permanently deleted!"
    } else {
        Write-Info "Data will be preserved in: $DataPath"
    }
    Write-Warning ""
    
    $confirm = Read-Host "Continue with uninstallation? (y/N)"
    if ($confirm -ne "y" -and $confirm -ne "Y") {
        Write-Info "Uninstallation cancelled"
        exit 0
    }
}

# ============================================================================
# Step 3: Stop Service
# ============================================================================

Write-Info ""
Write-Info "Stopping service..."

try {
    $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($service) {
        if ($service.Status -eq "Running") {
            Stop-Service -Name $ServiceName -Force -ErrorAction Stop
            Write-Success "Stopped service: $ServiceName"
        } else {
            Write-Info "Service is not running"
        }
    } else {
        Write-Info "Service not found (may have been removed already)"
    }
} catch {
    Write-Warning "Failed to stop service: $_"
}

# ============================================================================
# Step 4: Remove Service
# ============================================================================

Write-Info ""
Write-Info "Removing service..."

$winswPath = Join-Path $InstallPath "bin\WinSW.exe"
$serviceConfig = Join-Path $InstallPath "bin\$ServiceName.xml"

if (Test-Path $winswPath) {
    try {
        $uninstallArgs = "uninstall", $serviceConfig
        & $winswPath $uninstallArgs
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Removed Windows Service: $ServiceName"
        } else {
            Write-Warning "Failed to remove service (exit code: $LASTEXITCODE)"
        }
    } catch {
        Write-Warning "Failed to remove service: $_"
    }
} else {
    # Try using sc.exe as fallback
    try {
        $service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($service) {
            sc.exe delete $ServiceName
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Removed service using sc.exe"
            } else {
                Write-Warning "Failed to remove service with sc.exe"
            }
        }
    } catch {
        Write-Warning "Failed to remove service: $_"
    }
}

# ============================================================================
# Step 5: Remove Binaries
# ============================================================================

Write-Info ""
Write-Info "Removing binaries..."

if (Test-Path $InstallPath) {
    try {
        Remove-Item -Path $InstallPath -Recurse -Force -ErrorAction Stop
        Write-Success "Removed installation directory: $InstallPath"
    } catch {
        Write-Failure "Failed to remove installation directory: $_"
        Write-Info "You may need to manually delete: $InstallPath"
    }
} else {
    Write-Info "Installation directory not found (may have been removed already)"
}

# ============================================================================
# Step 6: Remove Data (Optional)
# ============================================================================

if ($RemoveData) {
    Write-Info ""
    Write-Warning "Removing data directory..."
    
    if (-not $Force) {
        Write-Warning "This will permanently delete:"
        Write-Warning "  - Database"
        Write-Warning "  - Logs"
        Write-Warning "  - Backups"
        Write-Warning "  - Configuration"
        Write-Warning ""
        
        $confirmData = Read-Host "Are you absolutely sure? Type 'DELETE' to confirm"
        if ($confirmData -ne "DELETE") {
            Write-Info "Data removal cancelled - data preserved"
            Write-Info "Data location: $DataPath"
        } else {
            if (Test-Path $DataPath) {
                try {
                    Remove-Item -Path $DataPath -Recurse -Force -ErrorAction Stop
                    Write-Success "Removed data directory: $DataPath"
                } catch {
                    Write-Failure "Failed to remove data directory: $_"
                    Write-Info "You may need to manually delete: $DataPath"
                }
            } else {
                Write-Info "Data directory not found"
            }
        }
    } else {
        if (Test-Path $DataPath) {
            try {
                Remove-Item -Path $DataPath -Recurse -Force -ErrorAction Stop
                Write-Success "Removed data directory: $DataPath"
            } catch {
                Write-Failure "Failed to remove data directory: $_"
                Write-Info "You may need to manually delete: $DataPath"
            }
        } else {
            Write-Info "Data directory not found"
        }
    }
} else {
    Write-Info ""
    Write-Info "Data preserved in: $DataPath"
    Write-Info "To remove data manually, delete: $DataPath"
}

# ============================================================================
# Uninstallation Complete
# ============================================================================

Write-Info ""
Write-Info "============================="
Write-Success "Uninstallation Complete!"
Write-Info "============================="
Write-Info ""

if (-not $RemoveData) {
    Write-Info "Your data has been preserved in: $DataPath"
    Write-Info "You can reinstall EasySale later and reuse this data"
    Write-Info ""
    Write-Info "To completely remove all data, run:"
    Write-Info "  Remove-Item -Path '$DataPath' -Recurse -Force"
}

Write-Info ""
Write-Info "Thank you for using EasySale!"

exit 0
