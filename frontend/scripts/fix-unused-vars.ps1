#!/usr/bin/env pwsh
# Script to automatically prefix unused variables with underscore

$files = Get-ChildItem -Path "src" -Include "*.ts","*.tsx" -Recurse

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $modified = $false
    
    # Fix unused destructured variables
    $content = $content -replace '(\{[^}]*?)(\b(?:error|totalColumns|storeTheme|accent|onEdit|handleMaskDrawn|caseId|err|e|key|scope|value|storeId|userId|partialTheme|theme|error)\b)([^}]*?\})', '$1_$2$3'
    
    # Fix unused imports
    $content = $content -replace "import \{ ([^}]*?)\b(Toast|ToastProps|Edit|Users|Grid|Card|Button|Input|SettingsSection|GoogleDriveConnectionStatus|Inline|Credentials|SettingScope|SettingType)\b", 'import { $1_$2'
    
    if ($content -ne (Get-Content $file.FullName -Raw)) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Fixed: $($file.FullName)"
    }
}
