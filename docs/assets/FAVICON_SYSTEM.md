# EasySale Favicon and Logo System

## Overview

EasySale includes a comprehensive favicon and logo management system that allows for dynamic branding based on configuration. The system supports:

- Dynamic favicon updates
- App icons for mobile/PWA
- Logo management
- Configuration-driven branding
- Installer asset management

## File Locations

### Frontend Assets
```
frontend/public/assets/
├── icons/
│   ├── favicon.png      # Main favicon (32x32 or 64x64)
│   └── icon.png         # App icon (512x512 recommended)
└── logos/
    └── logo.png         # Company logo
```

### Configuration Files
- `configs/default.json` - Default configuration
- `configs/examples/*.json` - Example configurations
- `frontend/src/config/defaultConfig.ts` - Frontend default config

### Installer Assets
```
installer/windows/assets/
├── favicon.png
├── icon.png
└── logo.png
```

## Configuration

### JSON Configuration Format
```json
{
  "branding": {
    "company": {
      "name": "Your Company",
      "logo": "/assets/logos/logo.png",
      "favicon": "/assets/icons/favicon.png",
      "icon": "/assets/icons/icon.png"
    }
  }
}
```

### TypeScript Configuration
```typescript
const config = {
  branding: {
    company: {
      name: 'Your Company',
      logo: '/assets/logos/logo.png',
      favicon: '/assets/icons/favicon.png',
      icon: '/assets/icons/icon.png',
    }
  }
};
```

## Implementation

### Frontend Components

#### FaviconManager Component
Automatically manages favicon updates based on configuration:
```typescript
import { FaviconManager } from './components/FaviconManager';

// Place inside ConfigProvider
<ConfigProvider>
  <FaviconManager />
  {/* rest of app */}
</ConfigProvider>
```

#### useFavicon Hook
Hook for manual favicon management:
```typescript
import { useFavicon } from './common/hooks/useFavicon';

function MyComponent() {
  useFavicon(); // Automatically updates favicon when config changes
  return <div>My Component</div>;
}
```

#### Favicon Utilities
Direct favicon manipulation:
```typescript
import { updateFavicon, getFaviconUrl, getAppIconUrl } from './utils/favicon';

// Update favicon manually
updateFavicon({
  favicon: '/path/to/favicon.png',
  icon: '/path/to/icon.png',
  title: 'My App'
});

// Get URLs from config
const faviconUrl = getFaviconUrl(config);
const iconUrl = getAppIconUrl(config);
```

### HTML Head Management

The system automatically updates the HTML head with:
```html
<link rel="icon" type="image/png" href="/assets/icons/favicon.png" />
<link rel="apple-touch-icon" href="/assets/icons/icon.png" />
<title>EasySale</title>
```

## Installation

### Windows Installer

The Windows installer includes asset management:

1. **AssetManager.psm1** - PowerShell module for asset handling
2. **Asset copying** - Copies default assets during installation
3. **Configuration updates** - Updates config files with correct paths

#### Installer Usage
```powershell
# Assets are automatically handled during installation
.\install.ps1 -ServerPackage "server.zip"
```

#### Manual Asset Setup
```powershell
# Import asset manager
Import-Module "modules\AssetManager.psm1"

# Copy assets
Copy-EasySaleAssets -SourcePath "assets" -DestinationPath "C:\Program Files\EasySale"

# Validate configuration
Test-AssetConfiguration -InstallPath "C:\Program Files\EasySale" -ConfigPath "config.json"
```

## Asset Requirements

### Favicon (favicon.png)
- **Format**: PNG
- **Size**: 32x32 or 64x64 pixels
- **Usage**: Browser tab icon, bookmarks

### App Icon (icon.png)
- **Format**: PNG
- **Size**: 512x512 pixels (recommended)
- **Usage**: Mobile home screen, PWA icon, desktop shortcuts

### Logo (logo.png)
- **Format**: PNG, SVG, or JPG
- **Size**: Variable (recommend 200x50 to 400x100)
- **Usage**: Application header, login screen, receipts

## Customization

### Adding Custom Assets

1. **Place assets** in appropriate directories:
   ```
   frontend/public/assets/icons/my-favicon.png
   frontend/public/assets/logos/my-logo.png
   ```

2. **Update configuration**:
   ```json
   {
     "branding": {
       "company": {
         "favicon": "/assets/icons/my-favicon.png",
         "logo": "/assets/logos/my-logo.png"
       }
     }
   }
   ```

3. **Assets are automatically applied** via the FaviconManager component

### Multi-Tenant Support

Each tenant can have different assets:
```json
{
  "tenant_a": {
    "branding": {
      "company": {
        "favicon": "/assets/tenants/tenant_a/favicon.png",
        "logo": "/assets/tenants/tenant_a/logo.png"
      }
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **Favicon not updating**
   - Clear browser cache
   - Check file paths in configuration
   - Verify FaviconManager is included in app

2. **Assets not found (404)**
   - Verify files exist in public/assets directory
   - Check configuration paths match file locations
   - Ensure assets are included in build

3. **Installer asset issues**
   - Verify AssetManager.psm1 module exists
   - Check installer assets directory has files
   - Run Test-AssetConfiguration for validation

### Debugging

Enable debug logging:
```typescript
// In development, log favicon updates
if (process.env.NODE_ENV === 'development') {
  console.log('Updating favicon:', config);
}
```

Check configuration loading:
```typescript
import { useConfig } from './config/ConfigProvider';

function DebugConfig() {
  const { config } = useConfig();
  console.log('Current config:', config?.branding?.company);
  return null;
}
```

## Best Practices

1. **Use PNG format** for favicons and icons for best compatibility
2. **Provide multiple sizes** for different use cases
3. **Test on different devices** and browsers
4. **Include fallbacks** in configuration
5. **Optimize file sizes** for faster loading
6. **Use consistent branding** across all assets
7. **Version control assets** with your code
8. **Test installer** asset handling in deployment scenarios

## API Reference

### Functions

- `updateFavicon(config: FaviconConfig): void` - Update favicon and title
- `getFaviconUrl(config: any): string` - Get favicon URL with fallbacks
- `getAppIconUrl(config: any): string` - Get app icon URL with fallbacks
- `getPageTitle(config: any): string` - Get page title with fallbacks
- `initializeFavicon(config: any): void` - Initialize favicon system

### Types

```typescript
interface FaviconConfig {
  favicon?: string;
  icon?: string;
  appleTouchIcon?: string;
  title?: string;
}
```

### PowerShell Functions

- `Copy-EasySaleAssets` - Copy assets during installation
- `Update-AssetConfiguration` - Update config with asset paths
- `Test-AssetConfiguration` - Validate asset configuration
