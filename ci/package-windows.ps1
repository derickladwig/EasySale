#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Package EasySale for Windows distribution

.DESCRIPTION
    Creates deterministic ZIP packages for Windows deployment:
    - easysale-windows-server-vX.Y.Z.zip (backend executable + WinSW wrapper)
    - easysale-windows-client-vX.Y.Z.zip (frontend dist)
    
    Packages include installer scripts and configuration templates.

.PARAMETER Version
    Version number for the package (e.g., "1.0.0")

.PARAMETER OutputDir
    Output directory for packages (default: ./dist)

.PARAMETER IncludeWinSW
    Include WinSW wrapper for Windows Service (default: true)

.EXAMPLE
    .\ci\package-windows.ps1 -Version "1.0.0"
    
.EXAMPLE
    .\ci\package-windows.ps1 -Version "1.0.0" -OutputDir "C:\releases"
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [string]$OutputDir = "dist",
    
    [bool]$IncludeWinSW = $true
)

$ErrorActionPreference = "Stop"

# Color output helpers
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param([string]$Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Failure { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }

Write-Info "EasySale Windows Packaging v$Version"
Write-Info "========================================"

# Validate version format
if ($Version -notmatch '^\d+\.\d+\.\d+$') {
    Write-Failure "Invalid version format: $Version (expected: X.Y.Z)"
    exit 1
}

# Create output directory
$OutputPath = Join-Path (Get-Location) $OutputDir
if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    Write-Success "Created output directory: $OutputPath"
}

# Define package names
$ServerPackage = "easysale-windows-server-v$Version.zip"
$ClientPackage = "easysale-windows-client-v$Version.zip"

# ============================================================================
# Package 1: Backend Server
# ============================================================================

Write-Info ""
Write-Info "Packaging backend server..."

# Check if backend binary exists
$BackendBinary = "backend\target\release\easysale-server.exe"
if (-not (Test-Path $BackendBinary)) {
    Write-Failure "Backend binary not found: $BackendBinary"
    Write-Info "Please build the backend first: cd backend && cargo build --release"
    exit 1
}

# Create temporary staging directory for server package
$ServerStaging = Join-Path $env:TEMP "easysale-server-staging-$Version"
if (Test-Path $ServerStaging) {
    Remove-Item -Path $ServerStaging -Recurse -Force
}
New-Item -ItemType Directory -Path $ServerStaging -Force | Out-Null

# Copy backend binary
$ServerBinDir = Join-Path $ServerStaging "bin"
New-Item -ItemType Directory -Path $ServerBinDir -Force | Out-Null
Copy-Item -Path $BackendBinary -Destination $ServerBinDir -Force
Write-Success "Copied backend binary"

# Copy installer scripts
$InstallerDir = Join-Path $ServerStaging "installer"
New-Item -ItemType Directory -Path $InstallerDir -Force | Out-Null

$InstallerScripts = @(
    "installer\windows\install.ps1",
    "installer\windows\uninstall.ps1",
    "installer\windows\upgrade.ps1",
    "installer\windows\preflight.ps1"
)

foreach ($script in $InstallerScripts) {
    if (Test-Path $script) {
        Copy-Item -Path $script -Destination $InstallerDir -Force
    } else {
        Write-Warning "Installer script not found: $script (will be created in later tasks)"
    }
}

# Copy configuration templates
$TemplatesDir = Join-Path $ServerStaging "templates"
New-Item -ItemType Directory -Path $TemplatesDir -Force | Out-Null

$Templates = @(
    "installer\windows\templates\server.env.template",
    "installer\windows\templates\config.toml.template",
    "installer\windows\templates\easysale-service.xml.template"
)

foreach ($template in $Templates) {
    if (Test-Path $template) {
        Copy-Item -Path $template -Destination $TemplatesDir -Force
    } else {
        Write-Warning "Template not found: $template (will be created in later tasks)"
    }
}

# Download and include WinSW if requested
if ($IncludeWinSW) {
    Write-Info "Including WinSW wrapper..."
    $WinSWUrl = "https://github.com/winsw/winsw/releases/download/v3.0.0-alpha.11/WinSW-x64.exe"
    $WinSWPath = Join-Path $ServerBinDir "WinSW.exe"
    
    try {
        Invoke-WebRequest -Uri $WinSWUrl -OutFile $WinSWPath -UseBasicParsing
        Write-Success "Downloaded WinSW wrapper"
    } catch {
        Write-Warning "Failed to download WinSW: $_"
        Write-Info "Package will not include WinSW wrapper"
    }
}

# Create README for server package
$ServerReadme = @"
EasySale Windows Server v$Version
==================================

This package contains the EasySale backend server for Windows.

Contents:
- bin/easysale-server.exe - Backend server executable
- bin/WinSW.exe - Windows Service wrapper (if included)
- installer/*.ps1 - Installation scripts
- templates/*.template - Configuration templates

Installation:
1. Extract this package to a temporary location
2. Run installer/install.ps1 with administrator privileges
3. Follow the prompts to configure your installation

For detailed installation instructions, see:
https://github.com/derickladwig/EasySale/docs/deployment/windows-installer.md

Version: $Version
Build Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

Set-Content -Path (Join-Path $ServerStaging "README.txt") -Value $ServerReadme -Force

# Create server package
$ServerPackagePath = Join-Path $OutputPath $ServerPackage
if (Test-Path $ServerPackagePath) {
    Remove-Item -Path $ServerPackagePath -Force
}

Compress-Archive -Path "$ServerStaging\*" -DestinationPath $ServerPackagePath -CompressionLevel Optimal -Force
Write-Success "Created server package: $ServerPackage"

# Calculate package hash
$ServerHash = (Get-FileHash -Path $ServerPackagePath -Algorithm SHA256).Hash
Write-Info "SHA256: $ServerHash"

# Clean up staging directory
Remove-Item -Path $ServerStaging -Recurse -Force

# ============================================================================
# Package 2: Frontend Client
# ============================================================================

Write-Info ""
Write-Info "Packaging frontend client..."

# Check if frontend dist exists
$FrontendDist = "frontend\dist"
if (-not (Test-Path $FrontendDist)) {
    Write-Failure "Frontend dist not found: $FrontendDist"
    Write-Info "Please build the frontend first: cd frontend && npm run build"
    exit 1
}

# Create temporary staging directory for client package
$ClientStaging = Join-Path $env:TEMP "easysale-client-staging-$Version"
if (Test-Path $ClientStaging) {
    Remove-Item -Path $ClientStaging -Recurse -Force
}
New-Item -ItemType Directory -Path $ClientStaging -Force | Out-Null

# Copy frontend dist
Copy-Item -Path "$FrontendDist\*" -Destination $ClientStaging -Recurse -Force
Write-Success "Copied frontend dist"

# Create README for client package
$ClientReadme = @"
EasySale Windows Client v$Version
==================================

This package contains the EasySale frontend client for Windows.

Contents:
- index.html - Main application entry point
- assets/ - Application assets (JS, CSS, images)

Deployment:
This is a static web application that can be served by any web server:
- IIS (Internet Information Services)
- nginx
- Apache HTTP Server
- Or included with the backend server

For detailed deployment instructions, see:
https://github.com/derickladwig/EasySale/docs/deployment/windows-installer.md

Version: $Version
Build Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@

Set-Content -Path (Join-Path $ClientStaging "README.txt") -Value $ClientReadme -Force

# Create client package
$ClientPackagePath = Join-Path $OutputPath $ClientPackage
if (Test-Path $ClientPackagePath) {
    Remove-Item -Path $ClientPackagePath -Force
}

Compress-Archive -Path "$ClientStaging\*" -DestinationPath $ClientPackagePath -CompressionLevel Optimal -Force
Write-Success "Created client package: $ClientPackage"

# Calculate package hash
$ClientHash = (Get-FileHash -Path $ClientPackagePath -Algorithm SHA256).Hash
Write-Info "SHA256: $ClientHash"

# Clean up staging directory
Remove-Item -Path $ClientStaging -Recurse -Force

# ============================================================================
# Generate manifest
# ============================================================================

Write-Info ""
Write-Info "Generating package manifest..."

$Manifest = @{
    version = $Version
    build_date = (Get-Date -Format "o")
    packages = @{
        server = @{
            filename = $ServerPackage
            sha256 = $ServerHash
            size_bytes = (Get-Item $ServerPackagePath).Length
        }
        client = @{
            filename = $ClientPackage
            sha256 = $ClientHash
            size_bytes = (Get-Item $ClientPackagePath).Length
        }
    }
}

$ManifestPath = Join-Path $OutputPath "manifest-v$Version.json"
$Manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $ManifestPath -Force
Write-Success "Created manifest: manifest-v$Version.json"

# ============================================================================
# Summary
# ============================================================================

Write-Info ""
Write-Info "========================================"
Write-Success "Packaging complete!"
Write-Info ""
Write-Info "Packages created:"
Write-Info "  Server: $ServerPackage ($([math]::Round((Get-Item $ServerPackagePath).Length / 1MB, 2)) MB)"
Write-Info "  Client: $ClientPackage ($([math]::Round((Get-Item $ClientPackagePath).Length / 1MB, 2)) MB)"
Write-Info ""
Write-Info "Output directory: $OutputPath"
Write-Info "Manifest: manifest-v$Version.json"
Write-Info ""
Write-Info "Next steps:"
Write-Info "  1. Test installation on a clean Windows machine"
Write-Info "  2. Verify all components work correctly"
Write-Info "  3. Upload packages to release distribution"

exit 0
