$source = "C:\Users\CAPS\Documents\GitHub\dynamous-kiro-hackathon"
$dest = "C:\Users\CAPS\Documents\GitHub\EasySale"

Write-Host "Copying to $dest..." -ForegroundColor Cyan

# Clear destination (preserve .git if exists)
if (Test-Path $dest) {
    Get-ChildItem -Path $dest -Exclude '.git' | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
}
if (!(Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
}

# Copy folders
$folders = @("backend", "frontend", "configs", "docs", "spec", "ci", ".github", "installer", "data", "config", "scripts", ".husky")
foreach ($f in $folders) {
    $s = Join-Path $source $f
    if (Test-Path $s) {
        Write-Host "  $f"
        Copy-Item -Path $s -Destination (Join-Path $dest $f) -Recurse -Force
    }
}

# Copy files
$files = @(".gitignore", ".env.example", "docker-compose.yml", "docker-compose.prod.yml", "docker-compose.build.yml", "docker-start.sh", "build-prod.bat", "build-prod.sh", "build-dev.bat", "start-dev.bat", "stop-dev.bat", "stop-prod.bat", "start-prod.bat", "update-dev.bat", "update-prod.bat", "docker-clean.bat", "README.md", "LICENSE", "CONTRIBUTING.md", "CODE_OF_CONDUCT.md", "SECURITY.md", "CHANGELOG.md", "START_HERE.md")
foreach ($f in $files) {
    $s = Join-Path $source $f
    if (Test-Path $s) {
        Copy-Item -Path $s -Destination (Join-Path $dest $f) -Force
    }
}

# Remove node_modules and target if copied
$cleanup = @("frontend\node_modules", "backend\target", "ci\node_modules")
foreach ($c in $cleanup) {
    $p = Join-Path $dest $c
    if (Test-Path $p) {
        Write-Host "  Removing $c..." -ForegroundColor Yellow
        Remove-Item -Path $p -Recurse -Force
    }
}

Write-Host "Done!" -ForegroundColor Green
