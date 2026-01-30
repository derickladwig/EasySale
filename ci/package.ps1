# EasySale Release Packaging Script
# Creates ZIP artifacts for Windows distribution
# Requirements: 1.1, 1.2, 1.5, 7.1

param(
    [Parameter(Mandatory=$false)]
    [string]$Version = "0.1.0",
    
    [string]$BackendPath = "backend",
    [string]$FrontendPath = "frontend",
    [string]$OutputPath = "dist",
    
    [switch]$ServerOnly,
    [switch]$ClientOnly,
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"
$startTime = Get-Date

# Color output helpers
function Write-Step {
    param([string]$Message)
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Gray
}

# Validate version format
function Test-Version {
    param([string]$Ver)
    
    if ($Ver -notmatch '^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$') {
        Write-Failure "Invalid version format: $Ver"
        Write-Info "Expected format: X.Y.Z or X.Y.Z-suffix (e.g., 1.0.0 or 1.0.0-beta)"
        exit 1
    }
}

# Create output directory
function Initialize-OutputDirectory {
    Write-Step "Initializing output directory..."
    
    if (Test-Path $OutputPath) {
        Write-Info "Cleaning existing output directory: $OutputPath"
        Remove-Item -Path $OutputPath -Recurse -Force
    }
    
    New-Item -ItemType Directory -Path $OutputPath -Force | Out-Null
    Write-Success "Output directory ready: $OutputPath"
}

# Package server (backend)
function Package-Server {
    Write-Step "Packaging server..."
    
    $serverZip = Join-Path $OutputPath "easysale-windows-server-v$Version.zip"
    $tempDir = Join-Path $OutputPath "temp-server"
    
    try {
        # Create temp directory structure
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        New-Item -ItemType Directory -Path "$tempDir/server" -Force | Out-Null
        
        # Copy server binary
        $binaryPath = Join-Path $BackendPath "target/release/easysale-server.exe"
        if (-not (Test-Path $binaryPath)) {
            Write-Failure "Server binary not found: $binaryPath"
            Write-Info "Run ci/build.ps1 first to build the backend"
            exit 1
        }
        
        Write-Info "Copying server binary..."
        Copy-Item -Path $binaryPath -Destination "$tempDir/server/easysale-server.exe"
        
        # Copy migrations
        $migrationsPath = Join-Path $BackendPath "migrations"
        if (Test-Path $migrationsPath) {
            Write-Info "Copying database migrations..."
            Copy-Item -Path $migrationsPath -Destination "$tempDir/server/migrations" -Recurse
        }
        
        # Copy installer scripts
        if (Test-Path "installer/windows") {
            Write-Info "Copying installer scripts..."
            Copy-Item -Path "installer/windows" -Destination "$tempDir/installer" -Recurse
        }
        
        # Copy configuration templates
        if (Test-Path "configs/profiles") {
            Write-Info "Copying configuration templates..."
            New-Item -ItemType Directory -Path "$tempDir/config-templates" -Force | Out-Null
            Copy-Item -Path "configs/profiles/*" -Destination "$tempDir/config-templates/" -Recurse
        }
        
        # Create README
        $readmeContent = @"
EasySale Server v$Version
========================

This package contains the EasySale backend server for Windows.

Contents:
- server/easysale-server.exe    : Main server executable
- server/migrations/             : Database migration scripts
- installer/                     : Installation scripts
- config-templates/              : Configuration file templates

Installation:
1. Extract this archive to a temporary location
2. Run installer/install.ps1 with administrator privileges
3. Follow the installation prompts

For detailed installation instructions, see:
https://github.com/yourusername/EasySale/blob/main/docs/INSTALL.md

Requirements:
- Windows 10 or later (64-bit)
- Administrator privileges for installation
- Port 8080 available (configurable)

Version: $Version
Build Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@
        
        Set-Content -Path "$tempDir/README.txt" -Value $readmeContent
        
        # Create deterministic ZIP
        Write-Info "Creating ZIP archive..."
        
        # Use .NET compression for deterministic output
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::CreateFromDirectory(
            $tempDir,
            $serverZip,
            [System.IO.Compression.CompressionLevel]::Optimal,
            $false
        )
        
        $zipSize = (Get-Item $serverZip).Length / 1MB
        $zipSizeRounded = [math]::Round($zipSize, 2)
        Write-Success "Server package created"
        Write-Info "File: $serverZip - Size: $zipSizeRounded MB"
        
    } finally {
        # Clean up temp directory
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force
        }
    }
}

# Package client (frontend)
function Package-Client {
    Write-Step "Packaging client..."
    
    $clientZip = Join-Path $OutputPath "easysale-windows-client-v$Version.zip"
    $tempDir = Join-Path $OutputPath "temp-client"
    
    try {
        # Create temp directory structure
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        New-Item -ItemType Directory -Path "$tempDir/client" -Force | Out-Null
        
        # Copy frontend dist
        $distPath = Join-Path $FrontendPath "dist"
        if (-not (Test-Path $distPath)) {
            Write-Failure "Frontend dist not found: $distPath"
            Write-Info "Run ci/build.ps1 first to build the frontend"
            exit 1
        }
        
        Write-Info "Copying frontend dist..."
        Copy-Item -Path "$distPath/*" -Destination "$tempDir/client/" -Recurse
        
        # Create README
        $readmeContent = @"
EasySale Client v$Version
=========================

This package contains the EasySale frontend client for Windows.

Contents:
- client/    : Static web application files

Installation:
This package is typically installed automatically by the EasySale installer.
For manual installation, copy the client/ directory to:
C:\Program Files\EasySale\client\

The backend server will serve these files automatically.

Version: $Version
Build Date: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
"@
        
        Set-Content -Path "$tempDir/README.txt" -Value $readmeContent
        
        # Create deterministic ZIP
        Write-Info "Creating ZIP archive..."
        
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::CreateFromDirectory(
            $tempDir,
            $clientZip,
            [System.IO.Compression.CompressionLevel]::Optimal,
            $false
        )
        
        $zipSize = (Get-Item $clientZip).Length / 1MB
        $zipSizeRounded = [math]::Round($zipSize, 2)
        Write-Success "Client package created"
        Write-Info "File: $clientZip - Size: $zipSizeRounded MB"
        
    } finally {
        # Clean up temp directory
        if (Test-Path $tempDir) {
            Remove-Item -Path $tempDir -Recurse -Force
        }
    }
}

# Verify package contents
function Test-PackageContents {
    param([string]$ZipPath)
    
    Write-Step "Verifying package contents: $(Split-Path $ZipPath -Leaf)"
    
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    
    try {
        $entries = $zip.Entries | Select-Object -ExpandProperty FullName
        
        # Check for forbidden paths
        $forbiddenPatterns = @(
            "archive/",
            "test/",
            "tests/",
            ".git/",
            "node_modules/",
            "target/debug/"
        )
        
        $violations = @()
        foreach ($pattern in $forbiddenPatterns) {
            $matches = $entries | Where-Object { $_ -like "*$pattern*" }
            if ($matches) {
                $violations += "Found forbidden path pattern: $pattern"
            }
        }
        
        if ($violations.Count -gt 0) {
            Write-Failure "Package validation failed:"
            foreach ($violation in $violations) {
                Write-Info $violation
            }
            exit 1
        }
        
        Write-Success "Package contents verified ($($entries.Count) files)"
        
    } finally {
        $zip.Dispose()
    }
}

# Generate manifest
function New-Manifest {
    Write-Step "Generating manifest..."
    
    $manifestPath = Join-Path $OutputPath "manifest.json"
    
    $packages = @()
    
    if (-not $ClientOnly) {
        $serverZip = Join-Path $OutputPath "easysale-windows-server-v$Version.zip"
        if (Test-Path $serverZip) {
            $serverHash = (Get-FileHash -Path $serverZip -Algorithm SHA256).Hash
            $serverSize = (Get-Item $serverZip).Length
            
            $packages += @{
                name = "easysale-windows-server"
                version = $Version
                filename = Split-Path $serverZip -Leaf
                size = $serverSize
                sha256 = $serverHash
            }
        }
    }
    
    if (-not $ServerOnly) {
        $clientZip = Join-Path $OutputPath "easysale-windows-client-v$Version.zip"
        if (Test-Path $clientZip) {
            $clientHash = (Get-FileHash -Path $clientZip -Algorithm SHA256).Hash
            $clientSize = (Get-Item $clientZip).Length
            
            $packages += @{
                name = "easysale-windows-client"
                version = $Version
                filename = Split-Path $clientZip -Leaf
                size = $clientSize
                sha256 = $clientHash
            }
        }
    }
    
    $manifest = @{
        version = $Version
        build_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
        packages = $packages
    }
    
    $manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestPath
    
    Write-Success "Manifest created: $manifestPath"
}

# Main execution
function Main {
    Write-Host "`nEasySale Release Packaging Script" -ForegroundColor Magenta
    Write-Host "==================================" -ForegroundColor Magenta
    
    Test-Version -Ver $Version
    Initialize-OutputDirectory
    
    $packageSuccess = $true
    
    if (-not $ClientOnly) {
        try {
            Package-Server
            Test-PackageContents -ZipPath (Join-Path $OutputPath "easysale-windows-server-v$Version.zip")
        } catch {
            Write-Failure "Server packaging failed: $_"
            $packageSuccess = $false
        }
    } else {
        Write-Info 'Skipping server package (-ClientOnly)'
    }
    
    if (-not $ServerOnly) {
        try {
            Package-Client
            Test-PackageContents -ZipPath (Join-Path $OutputPath "easysale-windows-client-v$Version.zip")
        } catch {
            Write-Failure "Client packaging failed: $_"
            $packageSuccess = $false
        }
    } else {
        Write-Info 'Skipping client package (-ServerOnly)'
    }
    
    if ($packageSuccess) {
        New-Manifest
    }
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    $durationSeconds = [math]::Round($duration.TotalSeconds, 1)
    
    Write-Host "`n==================================" -ForegroundColor Magenta
    if ($packageSuccess) {
        Write-Success "Packaging completed successfully in $durationSeconds seconds"
        Write-Info "Output directory: $OutputPath"
        exit 0
    } else {
        Write-Failure "Packaging failed after $durationSeconds seconds"
        exit 1
    }
}

# Run main
Main
