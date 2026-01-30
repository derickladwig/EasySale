# Brand Assets Guide

This guide explains how to convert and manage brand assets (logos, favicons) for EasySale tenants.

## Overview

The brand asset conversion script converts logos from various formats (SVG, PNG, JPG, ICO) into standardized formats optimized for web and mobile use.

## Quick Start

### 1. Install Dependencies

```bash
cd scripts
npm install
```

### 2. Convert Your Logo

```bash
cd scripts
node convert-brand-assets.js --input /path/to/your/logo.svg --tenant your-tenant-id
```

### 3. Update Configuration

Update your tenant configuration file (`configs/private/your-tenant.json`) to reference the generated assets:

```json
{
  "branding": {
    "company": {
      "name": "Your Company Name",
      "logo": "/brand/your-tenant-id/logo.png",
      "favicon": "/brand/your-tenant-id/favicon.ico"
    },
    "logo": {
      "light": "/brand/your-tenant-id/logo-light.png",
      "dark": "/brand/your-tenant-id/logo-dark.png"
    }
  }
}
```

## Supported Input Formats

- **SVG** (`.svg`) - Recommended for best quality
- **PNG** (`.png`) - Good for raster logos
- **JPG/JPEG** (`.jpg`, `.jpeg`) - Acceptable but may lose quality
- **ICO** (`.ico`) - Windows icon format
- **WebP** (`.webp`) - Modern web format

## Generated Assets

The script generates the following files in `frontend/public/brand/<tenant>/`:

| File | Size | Purpose |
|------|------|---------|
| `logo.png` | 200×60 | Main logo for application header |
| `logo-light.png` | 200×60 | Logo variant for light theme |
| `logo-dark.png` | 200×60 | Logo variant for dark theme |
| `favicon.ico` | 32×32 | Browser favicon (legacy) |
| `favicon-16x16.png` | 16×16 | Small favicon |
| `favicon-32x32.png` | 32×32 | Standard favicon |
| `apple-touch-icon.png` | 180×180 | iOS home screen icon |
| `android-chrome-192x192.png` | 192×192 | Android icon (small) |
| `android-chrome-512x512.png` | 512×512 | Android icon (large) |
| `manifest.json` | - | PWA manifest file |

## Usage Examples

### Convert SVG Logo

```bash
node convert-brand-assets.js --input logo.svg --tenant acme
```

### Convert PNG Logo

```bash
node convert-brand-assets.js --input brand.png --tenant store1
```

### Use Custom Output Directory

```bash
node convert-brand-assets.js --input logo.jpg --tenant demo --output /custom/path
```

### Show Help

```bash
node convert-brand-assets.js --help
```

## Logo Design Guidelines

### Recommended Specifications

- **Format**: SVG (vector) for best quality
- **Aspect Ratio**: 10:3 (e.g., 200×60, 400×120)
- **Colors**: Use solid colors or simple gradients
- **Transparency**: Supported (PNG output has alpha channel)
- **Text**: Ensure text is readable at small sizes

### Best Practices

1. **Keep it simple**: Logos should be recognizable at small sizes
2. **Use vector formats**: SVG scales perfectly to any size
3. **Test both themes**: Ensure logo works on light and dark backgrounds
4. **Avoid fine details**: Small details may be lost at favicon sizes
5. **Use high contrast**: Ensure logo stands out against backgrounds

## Light and Dark Theme Variants

The script generates three logo variants:

1. **logo.png** - Default logo (used when theme is not specified)
2. **logo-light.png** - Optimized for light theme backgrounds
3. **logo-dark.png** - Optimized for dark theme backgrounds

### Creating Theme-Specific Logos

If your logo needs different colors for light/dark themes:

1. Create two versions of your logo:
   - `logo-light.svg` - Dark text/elements for light backgrounds
   - `logo-dark.svg` - Light text/elements for dark backgrounds

2. Convert each separately:
   ```bash
   node convert-brand-assets.js --input logo-light.svg --tenant acme
   # Manually rename output to logo-light.png
   
   node convert-brand-assets.js --input logo-dark.svg --tenant acme
   # Manually rename output to logo-dark.png
   ```

3. Or manually edit the generated PNG files in an image editor

## Integration with Build Process

### Option 1: Manual Conversion

Run the script manually before building:

```bash
cd scripts
node convert-brand-assets.js --input ../assets/logo.svg --tenant production
cd ..
npm run build
```

### Option 2: Pre-Build Hook

Add to your `package.json`:

```json
{
  "scripts": {
    "prebuild": "cd scripts && node convert-brand-assets.js --input ../assets/logo.svg --tenant production",
    "build": "vite build"
  }
}
```

### Option 3: CI/CD Pipeline

Add to your CI/CD workflow:

```yaml
- name: Convert brand assets
  run: |
    cd scripts
    npm install
    node convert-brand-assets.js --input $LOGO_PATH --tenant $TENANT_ID
```

## Troubleshooting

### Error: "Input file not found"

**Solution**: Ensure the path to your input file is correct. Use absolute paths or paths relative to the scripts directory.

```bash
# Absolute path
node convert-brand-assets.js --input /home/user/logo.svg --tenant acme

# Relative path from scripts directory
node convert-brand-assets.js --input ../assets/logo.svg --tenant acme
```

### Error: "Unsupported input format"

**Solution**: Convert your file to a supported format (SVG, PNG, JPG, ICO, WebP).

### Warning: "Sharp library not available"

**Solution**: Install sharp for full functionality:

```bash
cd scripts
npm install sharp
```

Without sharp, the script runs in fallback mode:
- Copies original file as-is
- Creates duplicate copies for variants
- Does not generate favicon or PWA icons

### Permission Errors (Windows)

**Solution**: Run your terminal as Administrator if you encounter permission errors when creating directories.

### Logo Appears Distorted

**Solution**: Check your input logo's aspect ratio. The script maintains aspect ratio but fits within 200×60. For best results, use a logo with a 10:3 aspect ratio.

## Requirements Validation

This script validates the following requirements from the navigation-consolidation spec:

- **Requirement 6.2**: Converts SVG/ICO to PNG/JPG formats
- **Requirement 6.3**: Outputs to deterministic location `public/brand/<tenant>/`

## Advanced Usage

### Batch Conversion

Convert logos for multiple tenants:

```bash
#!/bin/bash
for tenant in acme store1 store2; do
  node convert-brand-assets.js --input logos/${tenant}.svg --tenant ${tenant}
done
```

### Custom Sizes

To generate custom sizes, modify the `LOGO_SIZES` constant in `convert-brand-assets.js`:

```javascript
const LOGO_SIZES = {
  main: { width: 300, height: 90 },  // Custom size
  // ... other sizes
};
```

### Programmatic Usage

Import and use the script functions in your own Node.js code:

```javascript
import { validateInput, ensureOutputDir } from './convert-brand-assets.js';

// Validate input file
const ext = await validateInput('logo.svg');

// Create output directory
await ensureOutputDir('output/brand/tenant1');
```

## See Also

- [Configuration Guide](../README.md) - Main configuration documentation
- [Branding Configuration](../configs/README.md) - Tenant branding setup
- [Design Tokens](../frontend/src/styles/README.md) - Theme customization
