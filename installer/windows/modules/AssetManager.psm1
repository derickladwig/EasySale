# Asset Management for EasySale Installation
# This script handles copying and configuring assets (logos, favicons, icons)

function Copy-EasySaleAssets {
    param(
        [string]$SourcePath,
        [string]$DestinationPath,
        [string]$ConfigPath
    )

    Write-Host "Setting up EasySale assets..." -ForegroundColor Green

    # Create asset directories
    $AssetDirs = @(
        "$DestinationPath\assets\icons",
        "$DestinationPath\assets\logos",
        "$DestinationPath\assets\images"
    )

    foreach ($Dir in $AssetDirs) {
        if (!(Test-Path $Dir)) {
            New-Item -ItemType Directory -Path $Dir -Force | Out-Null
            Write-Host "Created directory: $Dir" -ForegroundColor Yellow
        }
    }

    # Copy default assets if they exist in source
    $DefaultAssets = @{
        "favicon.png" = "assets\icons\favicon.png"
        "icon.png" = "assets\icons\icon.png"
        "logo.png" = "assets\logos\logo.png"
    }

    foreach ($Asset in $DefaultAssets.GetEnumerator()) {
        $SourceFile = Join-Path $SourcePath $Asset.Key
        $DestFile = Join-Path $DestinationPath $Asset.Value

        if (Test-Path $SourceFile) {
            Copy-Item $SourceFile $DestFile -Force
            Write-Host "Copied asset: $($Asset.Key) -> $($Asset.Value)" -ForegroundColor Green
        } else {
            Write-Host "Warning: Default asset not found: $SourceFile" -ForegroundColor Yellow
        }
    }

    # Update configuration with asset paths
    if (Test-Path $ConfigPath) {
        Update-AssetConfiguration -ConfigPath $ConfigPath
    }
}

function Update-AssetConfiguration {
    param([string]$ConfigPath)

    Write-Host "Updating asset configuration..." -ForegroundColor Green

    # Read current config
    $ConfigContent = Get-Content $ConfigPath -Raw

    # Update asset paths in configuration
    $AssetUpdates = @{
        '"favicon": "/assets/icons/easysale-favicon.ico"' = '"favicon": "/assets/icons/favicon.png"'
        '"logo": "/assets/logos/easysale-logo.svg"' = '"logo": "/assets/logos/logo.png"'
        '"icon": "ES"' = '"icon": "/assets/icons/icon.png"'
    }

    foreach ($Update in $AssetUpdates.GetEnumerator()) {
        if ($ConfigContent -match [regex]::Escape($Update.Key)) {
            $ConfigContent = $ConfigContent -replace [regex]::Escape($Update.Key), $Update.Value
            Write-Host "Updated config: $($Update.Key) -> $($Update.Value)" -ForegroundColor Green
        }
    }

    # Write updated config
    Set-Content -Path $ConfigPath -Value $ConfigContent -Encoding UTF8
}

function Test-AssetConfiguration {
    param(
        [string]$InstallPath,
        [string]$ConfigPath
    )

    Write-Host "Validating asset configuration..." -ForegroundColor Green

    $Issues = @()

    # Check if config file exists
    if (!(Test-Path $ConfigPath)) {
        $Issues += "Configuration file not found: $ConfigPath"
        return $Issues
    }

    # Read config and check asset paths
    try {
        $Config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        
        $AssetPaths = @(
            $Config.branding.company.favicon,
            $Config.branding.company.logo,
            $Config.branding.company.icon
        )

        foreach ($AssetPath in $AssetPaths) {
            if ($AssetPath -and $AssetPath -ne "ES") {
                $FullPath = Join-Path $InstallPath $AssetPath.TrimStart('/')
                if (!(Test-Path $FullPath)) {
                    $Issues += "Asset file not found: $FullPath"
                }
            }
        }
    }
    catch {
        $Issues += "Failed to parse configuration file: $($_.Exception.Message)"
    }

    if ($Issues.Count -eq 0) {
        Write-Host "Asset configuration validation passed!" -ForegroundColor Green
    } else {
        Write-Host "Asset configuration issues found:" -ForegroundColor Red
        foreach ($Issue in $Issues) {
            Write-Host "  - $Issue" -ForegroundColor Red
        }
    }

    return $Issues
}

# Export functions for use in main installer
Export-ModuleMember -Function Copy-EasySaleAssets, Update-AssetConfiguration, Test-AssetConfiguration
