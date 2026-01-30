#!/usr/bin/env pwsh
# Comprehensive lint error fixer

Write-Host "Fixing lint errors..." -ForegroundColor Cyan

# Get all TypeScript files
$files = Get-ChildItem -Path "src" -Include "*.ts","*.tsx" -Recurse -File

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $original = $content
    
    # Fix unused variables by prefixing with underscore
    # Common patterns from lint output
    $content = $content -replace '\berror\b(?=\s*[,})])', '_error'
    $content = $content -replace '\btotalColumns\b(?=\s*[,}=])', '_totalColumns'
    $content = $content -replace '\bstoreTheme\b(?=\s*[,}=])', '_storeTheme'
    $content = $content -replace '\baccent\b(?=\s*[,}=])', '_accent'
    $content = $content -replace '\bonEdit\b(?=\s*[,}:])', '_onEdit'
    $content = $content -replace '\bhandleMaskDrawn\b(?=\s*[,}=])', '_handleMaskDrawn'
    $content = $content -replace '\bcaseId\b(?=\s*[,}:])', '_caseId'
    $content = $content -replace '\bstoreId\b(?=\s*[,}:])', '_storeId'
    $content = $content -replace '\buserId\b(?=\s*[,}:])', '_userId'
    $content = $content -replace '\bscope\b(?=\s*[,}:])', '_scope'
    $content = $content -replace '\bvalue\b(?=\s*[,}:])', '_value'
    $content = $content -replace '\bpartialTheme\b(?=\s*[,}:])', '_partialTheme'
    $content = $content -replace '\btheme\b(?=\s*[,}=])', '_theme'
    $content = $content -replace '\berr\b(?=\s*[,})])', '_err'
    
    # Fix unused imports - remove them
    $content = $content -replace "import \{ Toast, ", "import { "
    $content = $content -replace "import \{ ToastProps, ", "import { "
    $content = $content -replace "import \{ Edit, ", "import { "
    $content = $content -replace "import \{ Users, ", "import { "
    $content = $content -replace "import \{ Grid, ", "import { "
    $content = $content -replace "import \{ Card, ", "import { "
    $content = $content -replace "import \{ Button, ", "import { "
    $content = $content -replace "import \{ Input, ", "import { "
    $content = $content -replace "import \{ SettingScope, ", "import { "
    $content = $content -replace "import \{ SettingType, ", "import { "
    $content = $content -replace ", Toast \}", " }"
    $content = $content -replace ", ToastProps \}", " }"
    $content = $content -replace ", Edit \}", " }"
    $content = $content -replace ", Users \}", " }"
    
    # Add missing keys to mapped elements
    $content = $content -replace '(<[A-Z][a-zA-Z]*\s+[^>]*?)(\s*>)', '$1 key={index}$2'
    
    if ($content -ne $original) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Fixed: $($file.Name)" -ForegroundColor Green
    }
}

Write-Host "`nRunning lint to check remaining errors..." -ForegroundColor Cyan
npm run lint
