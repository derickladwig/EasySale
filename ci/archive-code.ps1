#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Safe code archival helper for EasySale

.DESCRIPTION
    Safely moves code to archive with mapping log entries.
    Follows the NO DELETES policy - only moves with evidence.
    
    Archives to: archive/code/{timestamp}/{SourcePath}
    Updates: audit/CHANGELOG_AUDIT.md

.PARAMETER SourcePath
    Path to file or directory to archive (relative to repo root)

.PARAMETER Reason
    Reason for archival (e.g., "Demo-only code", "CAPS-specific branding")

.PARAMETER Evidence
    Evidence for archival (e.g., "Requirements 2.1, 2.6", "Audit scan result")

.PARAMETER DryRun
    Show what would be archived without actually moving files

.EXAMPLE
    .\ci\archive-code.ps1 -SourcePath "frontend/src/pages/demo" -Reason "Demo-only page" -Evidence "Requirements 2.1"
    
.EXAMPLE
    .\ci\archive-code.ps1 -SourcePath "backend/src/handlers/debug.rs" -Reason "Debug endpoint" -Evidence "Requirements 4.4" -DryRun
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$SourcePath,
    
    [Parameter(Mandatory=$true)]
    [string]$Reason,
    
    [Parameter(Mandatory=$true)]
    [string]$Evidence,
    
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Color output helpers
function Write-Success { param([string]$Message) Write-Host "✓ $Message" -ForegroundColor Green }
function Write-Info { param([string]$Message) Write-Host "ℹ $Message" -ForegroundColor Cyan }
function Write-Failure { param([string]$Message) Write-Host "✗ $Message" -ForegroundColor Red }
function Write-Warning { param([string]$Message) Write-Host "⚠ $Message" -ForegroundColor Yellow }

Write-Info "EasySale Code Archival Helper"
Write-Info "=============================="
Write-Info "Source: $SourcePath"
Write-Info "Reason: $Reason"
Write-Info "Evidence: $Evidence"
if ($DryRun) {
    Write-Warning "DRY RUN MODE - No files will be moved"
}
Write-Info ""

# Validate source path exists
$fullSourcePath = Join-Path (Get-Location) $SourcePath
if (-not (Test-Path $fullSourcePath)) {
    Write-Failure "Source path not found: $SourcePath"
    exit 1
}

# Generate timestamp for archive directory
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

# Determine archive destination
$archiveBase = "archive\code\$timestamp"
$archivePath = Join-Path $archiveBase $SourcePath

Write-Info "Archive destination: $archivePath"

# Check if already archived
if (Test-Path (Join-Path (Get-Location) $archivePath)) {
    Write-Warning "Path already exists in archive: $archivePath"
    $continue = Read-Host "Continue anyway? (y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        Write-Info "Archival cancelled"
        exit 0
    }
}

# Dry run - show what would happen
if ($DryRun) {
    Write-Info ""
    Write-Info "Would perform the following actions:"
    Write-Info "  1. Create directory: $archiveBase"
    Write-Info "  2. Move: $SourcePath -> $archivePath"
    Write-Info "  3. Update: audit/CHANGELOG_AUDIT.md"
    Write-Info ""
    Write-Info "Mapping log entry:"
    Write-Info "| $SourcePath | $archivePath | $Reason | $Evidence |"
    Write-Info ""
    Write-Success "Dry run complete"
    exit 0
}

# Confirm archival
Write-Warning ""
Write-Warning "This will move the following to archive:"
Write-Warning "  $SourcePath"
Write-Warning ""
$confirm = Read-Host "Continue with archival? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Info "Archival cancelled"
    exit 0
}

# Create archive directory
$fullArchivePath = Join-Path (Get-Location) $archivePath
$archiveDir = Split-Path $fullArchivePath -Parent
if (-not (Test-Path $archiveDir)) {
    New-Item -ItemType Directory -Path $archiveDir -Force | Out-Null
    Write-Success "Created archive directory"
}

# Move file/directory to archive
try {
    Move-Item -Path $fullSourcePath -Destination $fullArchivePath -Force
    Write-Success "Moved to archive: $archivePath"
} catch {
    Write-Failure "Failed to move to archive: $_"
    exit 1
}

# Update mapping log
$mappingLogPath = Join-Path (Get-Location) "audit\CHANGELOG_AUDIT.md"
if (-not (Test-Path $mappingLogPath)) {
    Write-Warning "Mapping log not found, creating: $mappingLogPath"
    $mappingDir = Split-Path $mappingLogPath -Parent
    if (-not (Test-Path $mappingDir)) {
        New-Item -ItemType Directory -Path $mappingDir -Force | Out-Null
    }
    
    $header = @"
## Audit changelog

### Archive Mapping Log

| Old Path | New Path | Reason | Evidence |
|----------|----------|--------|----------|

"@
    Set-Content -Path $mappingLogPath -Value $header -Force
}

# Append mapping entry
$mappingEntry = @"

### $(Get-Date -Format "yyyy-MM-dd HH:mm:ss") - Archived: $SourcePath

| Old Path | New Path | Reason | Evidence |
|----------|----------|--------|----------|
| $SourcePath | $archivePath | $Reason | $Evidence |

"@

Add-Content -Path $mappingLogPath -Value $mappingEntry
Write-Success "Updated mapping log: audit/CHANGELOG_AUDIT.md"

# Summary
Write-Info ""
Write-Info "=============================="
Write-Success "Archival Complete!"
Write-Info "=============================="
Write-Info ""
Write-Info "Archived: $SourcePath"
Write-Info "Location: $archivePath"
Write-Info "Mapping: audit/CHANGELOG_AUDIT.md"
Write-Info ""
Write-Info "Policy: NO DELETES - Archive only with mapping logs"

exit 0
