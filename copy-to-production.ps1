#############################################################################
# EasySale - Sync to Production Folder Script
# 
# This script syncs production files from your dev folder to the EasySale
# repo folder, EXCLUDING build artifacts (target/, node_modules/).
#
# Usage: 
#   .\copy-to-production.ps1                    # Sync only
#   .\copy-to-production.ps1 -Push              # Sync and push
#   .\copy-to-production.ps1 -Message "msg"     # Sync with custom commit message
#############################################################################

param(
    [switch]$Push,
    [string]$Message = "chore: sync production files"
)

$ErrorActionPreference = "Stop"
$source = "C:\Users\CAPS\Documents\GitHub\dynamous-kiro-hackathon"
$dest = "C:\Users\CAPS\Documents\GitHub\EasySale"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "EasySale - Sync to Production" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Source:      $source"
Write-Host "Destination: $dest"
Write-Host ""

# Function to copy folder excluding certain paths
function Copy-FolderExcluding {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$Exclude
    )
    
    # Create destination if it doesn't exist
    if (!(Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }
    
    # Get all items except excluded
    Get-ChildItem -Path $Source -Force | Where-Object {
        $item = $_
        $excluded = $false
        foreach ($pattern in $Exclude) {
            if ($item.Name -like $pattern) {
                $excluded = $true
                break
            }
        }
        -not $excluded
    } | ForEach-Object {
        $destPath = Join-Path $Destination $_.Name
        if ($_.PSIsContainer) {
            Copy-Item -Path $_.FullName -Destination $destPath -Recurse -Force
        } else {
            Copy-Item -Path $_.FullName -Destination $destPath -Force
        }
    }
}

# Folders to sync with their exclusions
$folderConfigs = @{
    "backend" = @("target", "*.db", "*.db-shm", "*.db-wal")
    "frontend" = @("node_modules", "dist", "build", "coverage", "playwright-report", "test-results", "storybook-static")
    "ci" = @("node_modules", "coverage")
    "configs" = @()
    "docs" = @()
    "spec" = @()
    "specs" = @()
    ".github" = @()
    ".kiro" = @()
    ".husky" = @()
    "installer" = @()
    "data" = @("*.db", "*.db-shm", "*.db-wal")
    "config" = @()
    "scripts" = @()
    "audit" = @()
    "blog" = @()
    "assets" = @()
    "archive" = @()
    "memory-bank" = @()
    "examples" = @()
    "runtime" = @("*.db", "*.db-shm", "*.db-wal", "backups")
    "sync" = @()
}

# Production root files to sync
$files = @(
    ".gitignore",
    ".dockerignore",
    ".env.example",
    "docker-compose.yml",
    "docker-compose.prod.yml",
    "docker-compose.build.yml",
    "docker-start.sh",
    "docker-stop.sh",
    "docker-stop.bat",
    "docker-clean.bat",
    "Dockerfile.backend",
    "build-prod.bat",
    "build-prod.sh",
    "build-dev.bat",
    "start-dev.bat",
    "stop-dev.bat",
    "stop-prod.bat",
    "start-prod.bat",
    "update-dev.bat",
    "update-prod.bat",
    "setup.sh",
    "validate-build.sh",
    "README.md",
    "README_MASTER.md",
    "README_VNEXT.md",
    "START_HERE.md",
    "LICENSE",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "SECURITY.md",
    "CHANGELOG.md",
    "DEVLOG.md",
    "PRD.md",
    "CHECKLISTS.md",
    "UPLOAD_GUIDE.md",
    "codecov.yml",
    "do-copy.ps1",
    "copy-to-production.ps1",
    # Session/audit files
    "AUTH_SETUP_ANALYSIS.md",
    "FEATURE_FLAGS_DEEP_AUDIT_2026-01-31.md",
    "SPEC_AUDIT_SUMMARY_2026-01-31.md",
    "OUTDATED_CLAIMS_AUDIT_2026-01-31.md",
    "DOCUMENTATION_FIXES_2026-01-31.md",
    "PHASE_1_CAPABILITIES_INTEGRATION_2026-01-31.md",
    "CAPABILITIES_INTEGRATION_COMPLETE_2026-01-31.md",
    "AUDIT_SESSION_SUMMARY_2026-01-31.md",
    "SESSION_COMPLETE_2026-01-31.md",
    "FINAL_SESSION_SUMMARY_2026-01-31.md",
    "OPTIONAL_ENHANCEMENTS_COMPLETE_2026-01-31.md",
    "COPY_TO_PRODUCTION_UPDATE.md",
    "FRONTEND_TO_BACKEND_PARITY.md",
    "REPO_REORGANIZATION_COMPLETE.md",
    "audit-fix-plan-complete.md",
    "audit-results-summary.md",
    "final-cleanup-complete-status.md"
)

Write-Host "Syncing folders (excluding build artifacts)..." -ForegroundColor Green
foreach ($folder in $folderConfigs.Keys) {
    $srcPath = Join-Path $source $folder
    $destPath = Join-Path $dest $folder
    $excludes = $folderConfigs[$folder]
    
    if (Test-Path $srcPath) {
        Write-Host "  $folder" -NoNewline
        if ($excludes.Count -gt 0) {
            Write-Host " (excluding: $($excludes -join ', '))" -ForegroundColor DarkGray
        } else {
            Write-Host ""
        }
        
        # Remove destination folder first
        if (Test-Path $destPath) {
            Remove-Item -Path $destPath -Recurse -Force
        }
        
        # Copy with exclusions
        Copy-FolderExcluding -Source $srcPath -Destination $destPath -Exclude $excludes
    }
}

Write-Host ""
Write-Host "Syncing root files..." -ForegroundColor Green
foreach ($file in $files) {
    $srcPath = Join-Path $source $file
    if (Test-Path $srcPath) {
        Write-Host "  $file"
        Copy-Item -Path $srcPath -Destination (Join-Path $dest $file) -Force
    }
}

Write-Host ""
Write-Host "Sync complete!" -ForegroundColor Green

# Show git status
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Git Status" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Set-Location $dest

$status = git status --short
if ($status) {
    Write-Host ""
    Write-Host "Changed files:" -ForegroundColor Yellow
    git status --short
    
    $changedCount = ($status | Measure-Object -Line).Lines
    Write-Host ""
    Write-Host "Total changes: $changedCount files" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "No changes detected." -ForegroundColor Green
    exit 0
}

if ($Push) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Committing and Pushing..." -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    
    git add .
    git commit -m $Message
    git push
    
    Write-Host ""
    Write-Host "Push complete!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Next Steps" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To commit and push these changes:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  cd $dest"
    Write-Host "  git add ."
    Write-Host '  git commit -m "your commit message"'
    Write-Host "  git push"
    Write-Host ""
    Write-Host "Or run this script with -Push flag:" -ForegroundColor Yellow
    Write-Host '  .\copy-to-production.ps1 -Push -Message "feat: add new feature"'
    Write-Host ""
}
