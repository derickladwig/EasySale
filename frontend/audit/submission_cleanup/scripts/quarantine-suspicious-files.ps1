# quarantine-suspicious-files.ps1
# Purpose: Move suspicious zero-byte files to quarantine directory (NO DELETES policy)
# Run from: frontend/ directory
# 
# This script:
# 1. Creates quarantine directory structure
# 2. MOVES (not deletes) suspicious files to quarantine
# 3. Creates a manifest log of what was moved
# 4. Removes files from git tracking (but preserves in quarantine)
#
# IMPORTANT: Review the manifest before committing changes!

param(
    [switch]$DryRun = $false,
    [switch]$SkipGitOperations = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$QuarantineDir = "audit/submission_cleanup/quarantine"
$ManifestFile = "audit/submission_cleanup/quarantine/QUARANTINE_MANIFEST.md"
$Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# List of suspicious files to quarantine
$SuspiciousFiles = @(
    "(",
    "{",
    "f.required).length}",
    "setTimeout(resolve",
    "setSubmittedData(null)}"
)

# Artifact files that should be untracked (but not moved)
$ArtifactFiles = @(
    "playwright-report/index.html",
    "test-results/.last-run.json"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Suspicious Files Quarantine Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN MODE] No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Verify we're in the frontend directory
if (-not (Test-Path "package.json")) {
    Write-Error "ERROR: This script must be run from the frontend/ directory"
    exit 1
}

# Step 1: Create quarantine directory
Write-Host "Step 1: Creating quarantine directory..." -ForegroundColor Green
if (-not $DryRun) {
    New-Item -ItemType Directory -Path $QuarantineDir -Force | Out-Null
}
Write-Host "  -> $QuarantineDir" -ForegroundColor Gray

# Step 2: Initialize manifest
$ManifestContent = @"
# Quarantine Manifest

**Quarantine Date:** $Timestamp  
**Script:** quarantine-suspicious-files.ps1  
**Policy:** NO DELETES - files moved, not deleted

---

## Quarantined Files

| Original Path | Quarantine Path | Size | Git Untracked |
|---------------|-----------------|------|---------------|
"@

# Step 3: Move suspicious files
Write-Host ""
Write-Host "Step 2: Moving suspicious files to quarantine..." -ForegroundColor Green

$MovedCount = 0
foreach ($file in $SuspiciousFiles) {
    $sourcePath = $file
    # Create safe filename for quarantine (replace special chars)
    $safeFileName = $file -replace '[\\/:*?"<>|]', '_'
    $safeFileName = "suspicious_$safeFileName"
    $destPath = Join-Path $QuarantineDir $safeFileName
    
    if (Test-Path $sourcePath) {
        $fileSize = (Get-Item $sourcePath).Length
        Write-Host "  Moving: '$file' -> '$destPath'" -ForegroundColor Gray
        
        if (-not $DryRun) {
            Move-Item -Path $sourcePath -Destination $destPath -Force
        }
        
        $ManifestContent += "`n| ``$file`` | ``$safeFileName`` | $fileSize bytes | ✅ |"
        $MovedCount++
    } else {
        Write-Host "  SKIP: '$file' not found" -ForegroundColor Yellow
        $ManifestContent += "`n| ``$file`` | N/A | N/A | File not found |"
    }
}

Write-Host "  Moved $MovedCount files" -ForegroundColor Cyan

# Step 4: Handle git operations
if (-not $SkipGitOperations) {
    Write-Host ""
    Write-Host "Step 3: Removing files from git tracking..." -ForegroundColor Green
    
    foreach ($file in $SuspiciousFiles) {
        if (-not $DryRun) {
            # Use git rm --cached to remove from tracking (file already moved)
            # This will show as "deleted" in git status
            try {
                git rm --cached "$file" 2>$null
                Write-Host "  Untracked: '$file'" -ForegroundColor Gray
            } catch {
                Write-Host "  SKIP: '$file' not in git index" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [DRY RUN] Would untrack: '$file'" -ForegroundColor Gray
        }
    }
    
    # Untrack artifact files (don't move them)
    Write-Host ""
    Write-Host "Step 4: Untracking artifact files (not moving)..." -ForegroundColor Green
    
    foreach ($file in $ArtifactFiles) {
        if (Test-Path $file) {
            if (-not $DryRun) {
                try {
                    git rm --cached "$file" 2>$null
                    Write-Host "  Untracked: '$file'" -ForegroundColor Gray
                } catch {
                    Write-Host "  SKIP: '$file' not in git index" -ForegroundColor Yellow
                }
            } else {
                Write-Host "  [DRY RUN] Would untrack: '$file'" -ForegroundColor Gray
            }
        }
    }
}

# Step 5: Add recommended .gitignore entries
$ManifestContent += @"

---

## Artifact Files Untracked (Not Moved)

| File | Status |
|------|--------|
| ``playwright-report/index.html`` | Untracked from git |
| ``test-results/.last-run.json`` | Untracked from git |

---

## Recommended .gitignore Additions

Add these lines to ``frontend/.gitignore``:

```gitignore
# Playwright test artifacts
playwright-report/
test-results/

# Prevent accidental code fragment files
\(
\{
```

---

## Post-Quarantine Steps

1. Review this manifest
2. Update ``.gitignore`` with recommended entries
3. Commit changes: ``git commit -m "chore(frontend): quarantine suspicious files and clean up artifacts"``
4. Verify no suspicious files remain: ``Get-ChildItem -File | Where-Object { `$_.Length -eq 0 }``

---

## Audit Trail

- **Source Audit:** ``01_SUSPICIOUS_FILES_MANIFEST.md``
- **Quarantine Script:** ``scripts/quarantine-suspicious-files.ps1``
- **Policy Reference:** NO DELETES (see ``archive/ARCHIVE_POLICY.md``)
"@

# Step 6: Write manifest
Write-Host ""
Write-Host "Step 5: Writing quarantine manifest..." -ForegroundColor Green

if (-not $DryRun) {
    $ManifestContent | Out-File -FilePath $ManifestFile -Encoding UTF8
    Write-Host "  -> $ManifestFile" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Files moved to quarantine: $MovedCount" -ForegroundColor White
Write-Host "  Manifest created: $ManifestFile" -ForegroundColor White

if ($DryRun) {
    Write-Host ""
    Write-Host "[DRY RUN] No changes were made. Run without -DryRun to execute." -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Green
    Write-Host "  1. Review: $ManifestFile" -ForegroundColor Gray
    Write-Host "  2. Update .gitignore with recommended entries" -ForegroundColor Gray
    Write-Host "  3. git add -A && git commit -m 'chore(frontend): quarantine suspicious files'" -ForegroundColor Gray
}

Write-Host ""
