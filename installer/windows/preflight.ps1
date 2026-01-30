#!/usr/bin/env pwsh
<#
.SYNOPSIS
    EasySale Pre-flight Installation Checker

.DESCRIPTION
    Performs comprehensive pre-installation checks to ensure the system
    is ready for EasySale installation. Validates configuration, secrets,
    ports, directories, migrations, health, and policy compliance.
    
    Exit codes:
    - 0: All checks passed (OK)
    - 1: Warnings found (WARN)
    - 2: Blocking issues found (BLOCK)

.PARAMETER Mode
    Installation mode: dev, demo, or prod

.PARAMETER InstallPath
    Installation directory (e.g., C:\Program Files\EasySale)

.PARAMETER DataPath
    Data directory (e.g., C:\ProgramData\EasySale)

.PARAMETER Port
    Server port (default: 7945)

.PARAMETER PolicyPath
    Path to readiness policy file (optional)

.PARAMETER ConfigPath
    Path to configuration file (optional, for validation)

.EXAMPLE
    .\preflight.ps1 -Mode prod -InstallPath "C:\Program Files\EasySale" -DataPath "C:\ProgramData\EasySale"
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev", "demo", "prod")]
    [string]$Mode,
    
    [Parameter(Mandatory=$true)]
    [string]$InstallPath,
    
    [Parameter(Mandatory=$true)]
    [string]$DataPath,
    
    [int]$Port = 7945,
    
    [string]$PolicyPath = "",
    
    [string]$ConfigPath = ""
)

$ErrorActionPreference = "Stop"

# Color output helpers
function Write-CheckPass { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-CheckWarn { param([string]$Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-CheckFail { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-CheckInfo { param([string]$Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }

# Initialize results
$Results = @{
    timestamp = (Get-Date).ToString("o")
    mode = $Mode
    install_path = $InstallPath
    data_path = $DataPath
    port = $Port
    checks = @()
    summary = @{
        total = 0
        passed = 0
        warnings = 0
        failures = 0
    }
}

function Add-CheckResult {
    param(
        [string]$Category,
        [string]$Check,
        [ValidateSet("pass", "warn", "fail")]
        [string]$Status,
        [string]$Message,
        [string]$Details = ""
    )
    
    $Results.checks += @{
        category = $Category
        check = $Check
        status = $Status
        message = $Message
        details = $Details
    }
    
    $Results.summary.total++
    switch ($Status) {
        "pass" { $Results.summary.passed++ }
        "warn" { $Results.summary.warnings++ }
        "fail" { $Results.summary.failures++ }
    }
}

# Helper: Parse .env file
function Parse-EnvFile {
    param([string]$Path)
    
    $env = @{}
    if (Test-Path $Path) {
        Get-Content $Path | ForEach-Object {
            if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
                $key = $matches[1].Trim()
                $value = $matches[2].Trim().Trim('"').Trim("'")
                $env[$key] = $value
            }
        }
    }
    return $env
}

Write-CheckInfo "EasySale Pre-flight Checker"
Write-CheckInfo "============================"
Write-CheckInfo "Mode: $Mode"
Write-CheckInfo "Install Path: $InstallPath"
Write-CheckInfo "Data Path: $DataPath"
Write-CheckInfo "Port: $Port"
Write-CheckInfo ""

# ============================================================================
# Check 1: Configuration File
# ============================================================================

Write-CheckInfo "Checking configuration..."

if ($ConfigPath -and (Test-Path $ConfigPath)) {
    Add-CheckResult -Category "Config" -Check "config_exists" -Status "pass" -Message "Configuration file found"
    Write-CheckPass "Configuration file exists"
    
    # Parse config if it's a .env file
    if ($ConfigPath -like "*.env") {
        $config = Parse-EnvFile $ConfigPath
        
        # Check for required keys
        $requiredKeys = @("DATABASE_PATH", "SERVER_PORT")
        $missingKeys = @()
        foreach ($key in $requiredKeys) {
            if (-not $config.ContainsKey($key)) {
                $missingKeys += $key
            }
        }
        
        if ($missingKeys.Count -gt 0) {
            Add-CheckResult -Category "Config" -Check "required_keys" -Status "fail" -Message "Missing required configuration keys" -Details ($missingKeys -join ", ")
            Write-CheckFail "Missing keys: $($missingKeys -join ', ')"
        } else {
            Add-CheckResult -Category "Config" -Check "required_keys" -Status "pass" -Message "All required keys present"
            Write-CheckPass "All required configuration keys present"
        }
    }
} else {
    if ($Mode -eq "prod") {
        Add-CheckResult -Category "Config" -Check "config_exists" -Status "fail" -Message "Configuration file required for production mode"
        Write-CheckFail "Configuration file required for production"
    } else {
        Add-CheckResult -Category "Config" -Check "config_exists" -Status "warn" -Message "No configuration file provided"
        Write-CheckWarn "No configuration file provided (will use defaults)"
    }
}

# ============================================================================
# Check 2: Secrets Validation
# ============================================================================

Write-CheckInfo ""
Write-CheckInfo "Checking secrets..."

if ($ConfigPath -and (Test-Path $ConfigPath)) {
    $config = Parse-EnvFile $ConfigPath
    
    # Check for placeholder secrets
    $placeholderSecrets = @()
    $secretKeys = @("JWT_SECRET", "ENCRYPTION_KEY", "API_KEY")
    
    foreach ($key in $secretKeys) {
        if ($config.ContainsKey($key)) {
            $value = $config[$key]
            if ($value -match "(changeme|placeholder|secret|password|default|example|test)") {
                $placeholderSecrets += $key
            }
        }
    }
    
    if ($placeholderSecrets.Count -gt 0 -and $Mode -eq "prod") {
        Add-CheckResult -Category "Secrets" -Check "placeholder_secrets" -Status "fail" -Message "Placeholder secrets detected in production" -Details ($placeholderSecrets -join ", ")
        Write-CheckFail "Placeholder secrets: $($placeholderSecrets -join ', ')"
    } elseif ($placeholderSecrets.Count -gt 0) {
        Add-CheckResult -Category "Secrets" -Check "placeholder_secrets" -Status "warn" -Message "Placeholder secrets detected" -Details ($placeholderSecrets -join ", ")
        Write-CheckWarn "Placeholder secrets: $($placeholderSecrets -join ', ')"
    } else {
        Add-CheckResult -Category "Secrets" -Check "placeholder_secrets" -Status "pass" -Message "No placeholder secrets detected"
        Write-CheckPass "Secrets validation passed"
    }
} else {
    Add-CheckResult -Category "Secrets" -Check "placeholder_secrets" -Status "warn" -Message "Cannot validate secrets without configuration file"
    Write-CheckWarn "Cannot validate secrets (no config file)"
}

# ============================================================================
# Check 3: Port Availability
# ============================================================================

Write-CheckInfo ""
Write-CheckInfo "Checking port availability..."

try {
    $portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($portInUse) {
        Add-CheckResult -Category "Network" -Check "port_available" -Status "fail" -Message "Port $Port is already in use" -Details "Process: $($portInUse.OwningProcess)"
        Write-CheckFail "Port $Port is in use"
    } else {
        Add-CheckResult -Category "Network" -Check "port_available" -Status "pass" -Message "Port $Port is available"
        Write-CheckPass "Port $Port is available"
    }
} catch {
    Add-CheckResult -Category "Network" -Check "port_available" -Status "warn" -Message "Cannot check port availability" -Details $_.Exception.Message
    Write-CheckWarn "Cannot check port availability"
}

# ============================================================================
# Check 4: Directory Permissions
# ============================================================================

Write-CheckInfo ""
Write-CheckInfo "Checking directory permissions..."

# Check install path
if (Test-Path $InstallPath) {
    try {
        $testFile = Join-Path $InstallPath "test-write-$(Get-Random).tmp"
        "test" | Out-File -FilePath $testFile -Force
        Remove-Item $testFile -Force
        Add-CheckResult -Category "Permissions" -Check "install_path_writable" -Status "pass" -Message "Install path is writable"
        Write-CheckPass "Install path is writable"
    } catch {
        Add-CheckResult -Category "Permissions" -Check "install_path_writable" -Status "fail" -Message "Install path is not writable" -Details $_.Exception.Message
        Write-CheckFail "Install path is not writable"
    }
} else {
    Add-CheckResult -Category "Permissions" -Check "install_path_writable" -Status "pass" -Message "Install path will be created"
    Write-CheckPass "Install path will be created"
}

# Check data path
if (Test-Path $DataPath) {
    try {
        $testFile = Join-Path $DataPath "test-write-$(Get-Random).tmp"
        "test" | Out-File -FilePath $testFile -Force
        Remove-Item $testFile -Force
        Add-CheckResult -Category "Permissions" -Check "data_path_writable" -Status "pass" -Message "Data path is writable"
        Write-CheckPass "Data path is writable"
    } catch {
        Add-CheckResult -Category "Permissions" -Check "data_path_writable" -Status "fail" -Message "Data path is not writable" -Details $_.Exception.Message
        Write-CheckFail "Data path is not writable"
    }
} else {
    Add-CheckResult -Category "Permissions" -Check "data_path_writable" -Status "pass" -Message "Data path will be created"
    Write-CheckPass "Data path will be created"
}

# ============================================================================
# Check 5: Database Migrations
# ============================================================================

Write-CheckInfo ""
Write-CheckInfo "Checking database..."

$dbPath = Join-Path $DataPath "data\pos.db"
if (Test-Path $dbPath) {
    Add-CheckResult -Category "Database" -Check "database_exists" -Status "pass" -Message "Database file exists"
    Write-CheckPass "Database exists (upgrade scenario)"
    
    # TODO: Check migration version compatibility
    Add-CheckResult -Category "Database" -Check "migrations" -Status "warn" -Message "Migration check not implemented"
    Write-CheckWarn "Migration compatibility check not implemented"
} else {
    Add-CheckResult -Category "Database" -Check "database_exists" -Status "pass" -Message "Fresh installation (no existing database)"
    Write-CheckPass "Fresh installation"
}

# ============================================================================
# Check 6: Policy Compliance (Production Only)
# ============================================================================

if ($Mode -eq "prod") {
    Write-CheckInfo ""
    Write-CheckInfo "Checking policy compliance..."
    
    # Check for demo mode in config
    if ($ConfigPath -and (Test-Path $ConfigPath)) {
        $config = Parse-EnvFile $ConfigPath
        
        if ($config.ContainsKey("DEMO_MODE") -and $config["DEMO_MODE"] -eq "true") {
            Add-CheckResult -Category "Policy" -Check "demo_mode" -Status "fail" -Message "Demo mode enabled in production"
            Write-CheckFail "Demo mode is enabled"
        } else {
            Add-CheckResult -Category "Policy" -Check "demo_mode" -Status "pass" -Message "Demo mode not enabled"
            Write-CheckPass "Demo mode check passed"
        }
        
        # Check for localhost OAuth
        $oauthKeys = $config.Keys | Where-Object { $_ -like "*OAUTH*" -or $_ -like "*REDIRECT*" }
        $localhostOAuth = @()
        foreach ($key in $oauthKeys) {
            if ($config[$key] -match "localhost") {
                $localhostOAuth += $key
            }
        }
        
        if ($localhostOAuth.Count -gt 0) {
            Add-CheckResult -Category "Policy" -Check "localhost_oauth" -Status "fail" -Message "Localhost OAuth URIs in production" -Details ($localhostOAuth -join ", ")
            Write-CheckFail "Localhost OAuth URIs: $($localhostOAuth -join ', ')"
        } else {
            Add-CheckResult -Category "Policy" -Check "localhost_oauth" -Status "pass" -Message "No localhost OAuth URIs"
            Write-CheckPass "OAuth configuration check passed"
        }
    }
}

# ============================================================================
# Check 7: System Requirements
# ============================================================================

Write-CheckInfo ""
Write-CheckInfo "Checking system requirements..."

# Check Windows version
$osVersion = [System.Environment]::OSVersion.Version
if ($osVersion.Major -ge 10) {
    Add-CheckResult -Category "System" -Check "os_version" -Status "pass" -Message "Windows version: $($osVersion.ToString())"
    Write-CheckPass "Windows version: $($osVersion.ToString())"
} else {
    Add-CheckResult -Category "System" -Check "os_version" -Status "warn" -Message "Windows version may not be supported: $($osVersion.ToString())"
    Write-CheckWarn "Windows version: $($osVersion.ToString()) (may not be supported)"
}

# Check available disk space
$drive = Split-Path $InstallPath -Qualifier
if ($drive) {
    $disk = Get-PSDrive $drive.TrimEnd(':')
    $freeSpaceGB = [math]::Round($disk.Free / 1GB, 2)
    
    if ($freeSpaceGB -lt 1) {
        Add-CheckResult -Category "System" -Check "disk_space" -Status "fail" -Message "Insufficient disk space: ${freeSpaceGB}GB free"
        Write-CheckFail "Insufficient disk space: ${freeSpaceGB}GB"
    } elseif ($freeSpaceGB -lt 5) {
        Add-CheckResult -Category "System" -Check "disk_space" -Status "warn" -Message "Low disk space: ${freeSpaceGB}GB free"
        Write-CheckWarn "Low disk space: ${freeSpaceGB}GB"
    } else {
        Add-CheckResult -Category "System" -Check "disk_space" -Status "pass" -Message "Disk space: ${freeSpaceGB}GB free"
        Write-CheckPass "Disk space: ${freeSpaceGB}GB free"
    }
}

# ============================================================================
# Generate Report
# ============================================================================

Write-CheckInfo ""
Write-CheckInfo "============================"
Write-CheckInfo "Pre-flight Check Summary"
Write-CheckInfo "============================"
Write-CheckInfo "Total Checks: $($Results.summary.total)"
Write-CheckPass "Passed: $($Results.summary.passed)"
Write-CheckWarn "Warnings: $($Results.summary.warnings)"
Write-CheckFail "Failures: $($Results.summary.failures)"

# Save JSON report
$reportPath = Join-Path $DataPath "preflight-report-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$reportDir = Split-Path $reportPath -Parent
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
}
$Results | ConvertTo-Json -Depth 10 | Set-Content -Path $reportPath -Force
Write-CheckInfo ""
Write-CheckInfo "Report saved: $reportPath"

# Determine exit code
if ($Results.summary.failures -gt 0) {
    Write-CheckInfo ""
    Write-CheckFail "Pre-flight check FAILED - Installation blocked"
    exit 2
} elseif ($Results.summary.warnings -gt 0) {
    Write-CheckInfo ""
    Write-CheckWarn "Pre-flight check passed with warnings"
    exit 1
} else {
    Write-CheckInfo ""
    Write-CheckPass "Pre-flight check PASSED - Ready for installation"
    exit 0
}
