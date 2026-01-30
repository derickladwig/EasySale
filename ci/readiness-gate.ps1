#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Production readiness gate scanner for EasySale

.DESCRIPTION
    Scans core runtime paths for forbidden patterns (demo credentials, mock data,
    CAPS branding, localhost OAuth URIs, etc.) to ensure production readiness.
    
    Uses policy file (ci/readiness-policy.json) to define:
    - Scan paths (core runtime directories)
    - Exclusions (archive/, tests/, fixtures/, presets/)
    - Forbidden patterns with severity levels
    
    Exit codes:
    - 0: No violations found (production ready)
    - 1: Violations found (production blocked)

.PARAMETER PolicyPath
    Path to readiness policy JSON file (default: ci/readiness-policy.json)

.PARAMETER OutputFormat
    Output format: text, json, or both (default: text)

.PARAMETER Verbose
    Enable verbose output

.EXAMPLE
    .\ci\readiness-gate.ps1
    
.EXAMPLE
    .\ci\readiness-gate.ps1 -OutputFormat json -Verbose
#>

param(
    [string]$PolicyPath = "ci/readiness-policy.json",
    [ValidateSet("text", "json", "both")]
    [string]$OutputFormat = "text",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

# Color output helpers
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Warning { param([string]$Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }
function Write-Failure { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Info { param([string]$Message) if ($Verbose) { Write-Host "ℹ $Message" -ForegroundColor Cyan } }

# Load policy file
if (-not (Test-Path $PolicyPath)) {
    Write-Failure "Policy file not found: $PolicyPath"
    exit 1
}

Write-Info "Loading policy from: $PolicyPath"
$policy = Get-Content $PolicyPath -Raw | ConvertFrom-Json

# Initialize results
$violations = @()
$scannedFiles = 0
$totalMatches = 0

# Helper: Check if path should be excluded
function Test-Excluded {
    param([string]$Path)
    
    foreach ($exclusion in $policy.exclusions) {
        $pattern = $exclusion.Replace("**/", "").Replace("**", "*")
        if ($Path -like "*$pattern*") {
            return $true
        }
    }
    return $false
}

# Helper: Check if pattern has allowed exception for this file
function Test-AllowedException {
    param(
        [string]$PatternId,
        [string]$FilePath
    )
    
    if (-not $policy.allowedExceptions.$PatternId) {
        return $false
    }
    
    foreach ($exception in $policy.allowedExceptions.$PatternId) {
        $pattern = $exception.Replace("**/", "").Replace("**", "*")
        if ($FilePath -like "*$pattern*") {
            return $true
        }
    }
    return $false
}

# Scan each path in policy
Write-Info "Scanning paths defined in policy..."

foreach ($scanPath in $policy.scanPaths) {
    if (-not (Test-Path $scanPath)) {
        Write-Warning "Scan path not found: $scanPath (skipping)"
        continue
    }
    
    Write-Info "Scanning: $scanPath"
    
    # Get all files in scan path
    $files = Get-ChildItem -Path $scanPath -Recurse -File -ErrorAction SilentlyContinue
    
    foreach ($file in $files) {
        $relativePath = $file.FullName.Replace((Get-Location).Path, "").TrimStart("\", "/")
        
        # Check if file should be excluded
        if (Test-Excluded $relativePath) {
            Write-Info "Excluded: $relativePath"
            continue
        }
        
        $scannedFiles++
        
        # Read file content
        try {
            $content = Get-Content $file.FullName -Raw -ErrorAction Stop
        } catch {
            Write-Warning "Could not read file: $relativePath"
            continue
        }
        
        # Check each forbidden pattern
        foreach ($pattern in $policy.forbiddenPatterns) {
            $matches = [regex]::Matches($content, $pattern.pattern, [System.Text.RegularExpressions.RegexOptions]::Multiline)
            
            if ($matches.Count -gt 0) {
                # Check if this is an allowed exception
                if (Test-AllowedException $pattern.id $relativePath) {
                    Write-Info "Allowed exception: $($pattern.id) in $relativePath"
                    continue
                }
                
                # Get line numbers for each match
                $lines = $content -split "`n"
                foreach ($match in $matches) {
                    # Find line number
                    $lineNumber = 1
                    $position = 0
                    foreach ($line in $lines) {
                        if ($position + $line.Length -ge $match.Index) {
                            break
                        }
                        $position += $line.Length + 1  # +1 for newline
                        $lineNumber++
                    }
                    
                    $violation = @{
                        file = $relativePath
                        line = $lineNumber
                        pattern_id = $pattern.id
                        pattern = $pattern.pattern
                        message = $pattern.message
                        severity = $pattern.severity
                        match = $match.Value.Substring(0, [Math]::Min(100, $match.Value.Length))
                    }
                    
                    $violations += $violation
                    $totalMatches++
                }
            }
        }
    }
}

# Generate report
$report = @{
    timestamp = (Get-Date).ToString("o")
    policy_version = $policy.version
    scanned_files = $scannedFiles
    total_violations = $violations.Count
    violations_by_severity = @{
        error = ($violations | Where-Object { $_.severity -eq "error" }).Count
        warning = ($violations | Where-Object { $_.severity -eq "warning" }).Count
    }
    violations = $violations
}

# Output results
if ($OutputFormat -eq "json" -or $OutputFormat -eq "both") {
    $jsonOutput = $report | ConvertTo-Json -Depth 10
    if ($OutputFormat -eq "json") {
        Write-Output $jsonOutput
    } else {
        Write-Output "`n=== JSON Report ==="
        Write-Output $jsonOutput
    }
}

if ($OutputFormat -eq "text" -or $OutputFormat -eq "both") {
    Write-Output "`n=== Production Readiness Gate Report ==="
    Write-Output "Timestamp: $($report.timestamp)"
    Write-Output "Policy Version: $($report.policy_version)"
    Write-Output "Files Scanned: $($report.scanned_files)"
    Write-Output ""
    
    if ($violations.Count -eq 0) {
        Write-Success "No violations found - Production ready!"
        exit 0
    }
    
    Write-Output "Total Violations: $($violations.Count)"
    Write-Output "  Errors: $($report.violations_by_severity.error)"
    Write-Output "  Warnings: $($report.violations_by_severity.warning)"
    Write-Output ""
    
    # Group violations by pattern
    $violationsByPattern = $violations | Group-Object -Property pattern_id
    
    foreach ($group in $violationsByPattern) {
        $firstViolation = $group.Group[0]
        $severity = $firstViolation.severity
        
        if ($severity -eq "error") {
            Write-Failure "$($group.Name): $($firstViolation.message) ($($group.Count) occurrences)"
        } else {
            Write-Warning "$($group.Name): $($firstViolation.message) ($($group.Count) occurrences)"
        }
        
        # Show first 5 occurrences
        $showCount = [Math]::Min(5, $group.Count)
        for ($i = 0; $i -lt $showCount; $i++) {
            $v = $group.Group[$i]
            Write-Output "  $($v.file):$($v.line) - $($v.match)"
        }
        
        if ($group.Count -gt 5) {
            Write-Output "  ... and $($group.Count - 5) more"
        }
        Write-Output ""
    }
    
    # Exit with error if violations found
    if ($report.violations_by_severity.error -gt 0) {
        Write-Failure "Production readiness gate FAILED - $($report.violations_by_severity.error) error(s) found"
        exit 1
    } else {
        Write-Warning "Production readiness gate PASSED with warnings - $($report.violations_by_severity.warning) warning(s) found"
        exit 0
    }
}
