# Placeholder Scanner - CI Gate
# Blocks merges if placeholder/mock/TODO patterns exist in UI outside allowlist

param(
    [switch]$FailOnMatch = $true
)

$ErrorActionPreference = "Stop"

# Patterns to detect
$patterns = @(
    "placeholder",
    "TODO:",
    "FIXME:",
    "coming soon",
    "not implemented",
    "mock data",
    "fake data",
    "hardcoded",
    "Pending: 0",
    "Count: 0.*TODO"
)

# Allowlist - files that are allowed to have these patterns
$allowlist = @(
    "*.test.ts",
    "*.test.tsx",
    "*.spec.ts",
    "*.spec.tsx",
    "**/tests/**",
    "**/test/**",
    "**/__tests__/**",
    "**/fixtures/**",
    "**/mocks/**",
    "*.md",
    "*.json",
    "placeholder-scanner.ps1"
)

# Directories to scan
$scanDirs = @(
    "frontend/src"
)

$violations = @()

foreach ($dir in $scanDirs) {
    if (-not (Test-Path $dir)) {
        Write-Host "Directory not found: $dir" -ForegroundColor Yellow
        continue
    }
    
    $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" -File
    
    foreach ($file in $files) {
        $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "").Replace("\", "/")
        
        # Check if file is in allowlist
        $isAllowed = $false
        foreach ($pattern in $allowlist) {
            if ($relativePath -like $pattern) {
                $isAllowed = $true
                break
            }
        }
        
        if ($isAllowed) {
            continue
        }
        
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) {
            continue
        }
        
        foreach ($pattern in $patterns) {
            if ($content -match $pattern) {
                $lineNum = 0
                $lines = $content -split "`n"
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    if ($lines[$i] -match $pattern) {
                        $lineNum = $i + 1
                        $violations += [PSCustomObject]@{
                            File = $relativePath
                            Line = $lineNum
                            Pattern = $pattern
                            Content = $lines[$i].Trim().Substring(0, [Math]::Min(80, $lines[$i].Trim().Length))
                        }
                    }
                }
            }
        }
    }
}

# Output results
Write-Host ""
Write-Host "=== Placeholder Scanner Results ===" -ForegroundColor Cyan
Write-Host ""

if ($violations.Count -eq 0) {
    Write-Host "✓ No placeholder patterns found!" -ForegroundColor Green
    exit 0
}

Write-Host "✗ Found $($violations.Count) placeholder pattern(s):" -ForegroundColor Red
Write-Host ""

$violations | ForEach-Object {
    Write-Host "  $($_.File):$($_.Line)" -ForegroundColor Yellow
    Write-Host "    Pattern: $($_.Pattern)" -ForegroundColor Gray
    Write-Host "    Content: $($_.Content)" -ForegroundColor Gray
    Write-Host ""
}

# Generate report artifact
$reportPath = "ci/placeholder-scanner-report.json"
$violations | ConvertTo-Json -Depth 3 | Out-File -FilePath $reportPath -Encoding UTF8
Write-Host "Report saved to: $reportPath" -ForegroundColor Cyan

if ($FailOnMatch) {
    Write-Host ""
    Write-Host "CI gate failed: Remove placeholder patterns before merging." -ForegroundColor Red
    exit 1
}

exit 0
