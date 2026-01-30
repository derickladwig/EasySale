# ============================================
# Repo Clean Check Script
# ============================================
# Purpose: Verify no build artifacts or garbage files are tracked in git
# Usage: Run from frontend/ directory
#        .\audit\submission_cleanup\scripts\repo-clean-check.ps1
# Exit Codes:
#   0 = Clean (no issues found)
#   1 = Dirty (issues found - see output)
# ============================================

param(
    [switch]$Verbose,
    [switch]$FailFast
)

$ErrorCount = 0
$WarningCount = 0

function Write-CheckHeader {
    param([string]$Title)
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " $Title" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
}

function Write-Pass {
    param([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Write-Fail {
    param([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
    $script:ErrorCount++
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
    $script:WarningCount++
}

# ============================================
# CHECK 1: Zero-Byte Garbage Files
# ============================================
Write-CheckHeader "Check 1: Zero-Byte Garbage Files in Root"

$ZeroByteFiles = Get-ChildItem -File -ErrorAction SilentlyContinue | Where-Object { $_.Length -eq 0 }

if ($ZeroByteFiles) {
    Write-Fail "Found zero-byte files in frontend root:"
    foreach ($file in $ZeroByteFiles) {
        Write-Host "  - $($file.Name)" -ForegroundColor Red
    }
    
    # Check if they're tracked
    $TrackedZeroBytes = @()
    foreach ($file in $ZeroByteFiles) {
        $tracked = git ls-files --error-unmatch $file.Name 2>$null
        if ($LASTEXITCODE -eq 0) {
            $TrackedZeroBytes += $file.Name
        }
    }
    
    if ($TrackedZeroBytes.Count -gt 0) {
        Write-Fail "These zero-byte files are TRACKED in git:"
        foreach ($f in $TrackedZeroBytes) {
            Write-Host "    git rm --cached `"$f`"" -ForegroundColor Yellow
        }
    }
    
    if ($FailFast) { exit 1 }
} else {
    Write-Pass "No zero-byte files found in frontend root"
}

# ============================================
# CHECK 2: Tracked Artifact Directories
# ============================================
Write-CheckHeader "Check 2: Tracked Artifact Directories"

$ArtifactPatterns = @(
    "^dist/",
    "^coverage/",
    "^playwright-report/",
    "^test-results/",
    "^storybook-static/",
    "^node_modules/",
    "^.vite/"
)

$TrackedArtifacts = @()
$AllTrackedFiles = git ls-files 2>$null

foreach ($pattern in $ArtifactPatterns) {
    $matches = $AllTrackedFiles | Select-String -Pattern $pattern
    if ($matches) {
        $TrackedArtifacts += $matches
    }
}

if ($TrackedArtifacts.Count -gt 0) {
    Write-Fail "Found tracked artifact files/directories:"
    $TrackedArtifacts | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Red
    }
    
    # Group by directory for cleanup commands
    $Dirs = $TrackedArtifacts | ForEach-Object { ($_ -split '/')[0] } | Sort-Object -Unique
    Write-Host "`nCleanup commands:" -ForegroundColor Yellow
    foreach ($dir in $Dirs) {
        Write-Host "  git rm --cached -r $dir/" -ForegroundColor Yellow
    }
    
    if ($FailFast) { exit 1 }
} else {
    Write-Pass "No artifact directories are tracked"
}

# ============================================
# CHECK 3: Generated Output Files
# ============================================
Write-CheckHeader "Check 3: Generated Output Files"

$GeneratedFilePatterns = @(
    "lint-errors\.txt",
    "test-output\.txt",
    "badge-size-verification\.html",
    "\.verification\.html$",
    "\.log\.txt$"
)

$TrackedGenerated = @()

foreach ($pattern in $GeneratedFilePatterns) {
    $matches = $AllTrackedFiles | Select-String -Pattern $pattern
    if ($matches) {
        $TrackedGenerated += $matches
    }
}

if ($TrackedGenerated.Count -gt 0) {
    Write-Fail "Found tracked generated output files:"
    foreach ($file in $TrackedGenerated) {
        Write-Host "  - $file" -ForegroundColor Red
        Write-Host "    git rm --cached $file" -ForegroundColor Yellow
    }
    
    if ($FailFast) { exit 1 }
} else {
    Write-Pass "No generated output files are tracked"
}

# ============================================
# CHECK 4: Suspicious Filename Patterns
# ============================================
Write-CheckHeader "Check 4: Suspicious Filename Patterns"

# These patterns indicate code fragments accidentally committed as filenames
$SuspiciousPatterns = @(
    "^\($",           # Single parenthesis
    "^\{$",           # Single brace
    "^\[$",           # Single bracket
    "^f\.",           # Starts with f. (likely code fragment)
    "^set[A-Z]",      # React setState pattern
    "^setTimeout",    # setTimeout fragment
    "^setInterval",   # setInterval fragment
    "^console\.",     # console.log fragment
    "\)$",            # Ends with closing paren (likely code)
    "\}$",            # Ends with closing brace (likely code)
    "^=>"             # Arrow function fragment
)

$SuspiciousFiles = @()

foreach ($pattern in $SuspiciousPatterns) {
    $matches = $AllTrackedFiles | Select-String -Pattern $pattern
    if ($matches) {
        # Filter out legitimate files
        foreach ($match in $matches) {
            $filename = $match.ToString()
            # Skip if it has a proper extension
            if ($filename -notmatch "\.(ts|tsx|js|jsx|json|md|css|html|svg|png|jpg)$") {
                $SuspiciousFiles += $filename
            }
        }
    }
}

$SuspiciousFiles = $SuspiciousFiles | Sort-Object -Unique

if ($SuspiciousFiles.Count -gt 0) {
    Write-Fail "Found suspicious filenames (possible code fragments):"
    foreach ($file in $SuspiciousFiles) {
        Write-Host "  - `"$file`"" -ForegroundColor Red
    }
    
    if ($FailFast) { exit 1 }
} else {
    Write-Pass "No suspicious filename patterns found"
}

# ============================================
# CHECK 5: .gitignore Coverage
# ============================================
Write-CheckHeader "Check 5: .gitignore Coverage"

$GitignorePath = ".gitignore"
$RequiredPatterns = @(
    "node_modules/",
    "dist/",
    "coverage/",
    "playwright-report/",
    "test-results/",
    "storybook-static/",
    ".vite/"
)

if (Test-Path $GitignorePath) {
    $GitignoreContent = Get-Content $GitignorePath -Raw
    
    $MissingPatterns = @()
    foreach ($pattern in $RequiredPatterns) {
        if ($GitignoreContent -notmatch [regex]::Escape($pattern)) {
            $MissingPatterns += $pattern
        }
    }
    
    if ($MissingPatterns.Count -gt 0) {
        Write-Warn ".gitignore is missing recommended patterns:"
        foreach ($pattern in $MissingPatterns) {
            Write-Host "  - $pattern" -ForegroundColor Yellow
        }
    } else {
        Write-Pass ".gitignore contains all required patterns"
    }
} else {
    Write-Fail ".gitignore file not found!"
}

# ============================================
# SUMMARY
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($ErrorCount -eq 0 -and $WarningCount -eq 0) {
    Write-Host "`n✅ Repository is CLEAN - no issues found!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n❌ Repository has issues:" -ForegroundColor Red
    Write-Host "   Errors:   $ErrorCount" -ForegroundColor Red
    Write-Host "   Warnings: $WarningCount" -ForegroundColor Yellow
    
    if ($ErrorCount -gt 0) {
        Write-Host "`nRun the cleanup commands above to fix errors." -ForegroundColor Yellow
        Write-Host "See: frontend/audit/submission_cleanup/02_GIT_TRACKING_AUDIT.md" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "`nWarnings are advisory - review and address as needed." -ForegroundColor Yellow
        exit 0
    }
}
