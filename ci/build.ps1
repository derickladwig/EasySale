# EasySale Release Build Script
# Builds both backend and frontend for production release
# Requirements: 1.1, 1.2, 1.5, 7.1

param(
    [string]$BackendPath = "backend",
    [string]$FrontendPath = "frontend",
    [ValidateSet("lite", "export", "full")]
    [string]$Variant = "export",
    [switch]$SkipBackend,
    [switch]$SkipFrontend,
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
    Write-Host "OK $Message" -ForegroundColor Green
}

function Write-Failure {
    param([string]$Message)
    Write-Host "ERROR $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "  $Message" -ForegroundColor Gray
}

# Validate paths
function Test-Paths {
    Write-Step "Validating paths..."
    
    if (-not (Test-Path $BackendPath)) {
        Write-Failure "Backend path not found: $BackendPath"
        exit 1
    }
    
    if (-not (Test-Path $FrontendPath)) {
        Write-Failure "Frontend path not found: $FrontendPath"
        exit 1
    }
    
    # Check for stale backend/rust references
    if (Test-Path "backend/rust") {
        Write-Failure "Stale backend/rust directory detected. Use backend/ instead."
        Write-Info "See audit/PATH_TRUTH.md for correct paths"
        exit 1
    }
    
    Write-Success "Paths validated"
}

# Build backend
function Build-Backend {
    Write-Step "Building backend with Rust and cargo (variant: $Variant)..."
    
    # Map variant to features
    $features = switch ($Variant) {
        "lite" { "" }
        "export" { "export" }
        "full" { "full" }
    }
    
    Push-Location $BackendPath
    try {
        # Verify Cargo.toml exists at workspace root
        if (-not (Test-Path "Cargo.toml")) {
            Write-Failure "Cargo.toml not found in $BackendPath"
            exit 1
        }
        
        Write-Info "Running cargo build --release --bin easysale-server with SQLX_OFFLINE=true"
        Write-Info "Variant: $Variant | Features: $(if ($features) { $features } else { '(none)' })"
        
        # Set SQLx offline mode for CI/CD builds
        $env:SQLX_OFFLINE = "true"
        
        # Build the server binary with feature selection
        $buildArgs = @(
            "build",
            "--release",
            "--no-default-features",
            "--bin", "easysale-server"
        )
        
        # Add features if not lite
        if ($features) {
            $buildArgs += "--features"
            $buildArgs += $features
        }
        
        if ($Verbose) {
            $buildArgs += "--verbose"
        }
        
        & cargo @buildArgs
        
        if ($LASTEXITCODE -ne 0) {
            Write-Failure "Backend build failed with exit code $LASTEXITCODE"
            exit $LASTEXITCODE
        }
        
        # Verify binary was created
        $binaryPath = "target/release/easysale-server.exe"
        if (-not (Test-Path $binaryPath)) {
            # Try without .exe extension for Linux/Mac
            $binaryPath = "target/release/easysale-server"
            if (-not (Test-Path $binaryPath)) {
                Write-Failure "Binary not found after build: easysale-server"
                exit 1
            }
        }
        
        $binarySize = (Get-Item $binaryPath).Length / 1MB
        $binarySizeRounded = [math]::Round($binarySize, 2)
        Write-Success "Backend build complete (variant: $Variant)"
        Write-Info "Binary: $binaryPath - Size: $binarySizeRounded MB"
        
    } finally {
        Pop-Location
    }
}

# Build frontend
function Build-Frontend {
    Write-Step "Building frontend with React and Vite..."
    
    Push-Location $FrontendPath
    try {
        # Verify package.json exists
        if (-not (Test-Path "package.json")) {
            Write-Failure "package.json not found in $FrontendPath"
            exit 1
        }
        
        # Check if node_modules exists
        if (-not (Test-Path "node_modules")) {
            Write-Info "node_modules not found, running npm ci..."
            & npm ci
            if ($LASTEXITCODE -ne 0) {
                Write-Failure "npm ci failed with exit code $LASTEXITCODE"
                exit $LASTEXITCODE
            }
        }
        
        Write-Info "Running npm run build"
        
        # Build the frontend
        & npm run build
        
        if ($LASTEXITCODE -ne 0) {
            Write-Failure "Frontend build failed with exit code $LASTEXITCODE"
            exit $LASTEXITCODE
        }
        
        # Verify dist directory was created
        if (-not (Test-Path "dist")) {
            Write-Failure "dist directory not found after build"
            exit 1
        }
        
        # Count files in dist
        $distFiles = (Get-ChildItem -Path "dist" -Recurse -File).Count
        $distSize = (Get-ChildItem -Path "dist" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
        $distSizeRounded = [math]::Round($distSize, 2)
        
        Write-Success "Frontend build complete"
        Write-Info "Output: dist/ - Files: $distFiles - Size: $distSizeRounded MB"
        
    } finally {
        Pop-Location
    }
}

# Main execution
function Main {
    Write-Host "`nEasySale Release Build Script" -ForegroundColor Magenta
    Write-Host "=============================" -ForegroundColor Magenta
    Write-Host "Variant: $Variant" -ForegroundColor Magenta
    
    Test-Paths
    
    $buildSuccess = $true
    
    if (-not $SkipBackend) {
        try {
            Build-Backend
        } catch {
            $errorMsg = $_.Exception.Message
            Write-Failure "Backend build failed: $errorMsg"
            $buildSuccess = $false
        }
    } else {
        Write-Info 'Skipping backend build'
    }
    
    if (-not $SkipFrontend) {
        try {
            Build-Frontend
        } catch {
            $errorMsg = $_.Exception.Message
            Write-Failure "Frontend build failed: $errorMsg"
            $buildSuccess = $false
        }
    } else {
        Write-Info 'Skipping frontend build'
    }
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    $durationSeconds = [math]::Round($duration.TotalSeconds, 1)
    
    Write-Host "`n=============================" -ForegroundColor Magenta
    if ($buildSuccess) {
        Write-Success "Build completed successfully in $durationSeconds seconds"
        exit 0
    } else {
        Write-Failure "Build failed after $durationSeconds seconds"
        exit 1
    }
}

# Run main
Main
