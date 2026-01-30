# EasySale Scripts

Utility scripts for building and managing EasySale.

## Brand Asset Conversion

The `convert-brand-assets.js` script converts brand assets (logos, icons) from various formats into standardized formats for use in the EasySale application.

### Installation

First, install the required dependencies:

```bash
cd scripts
npm install
```

### Usage

```bash
node convert-brand-assets.js --input <path> --tenant <tenant-id>
```

#### Options

- `--input, -i <path>` - Path to input image file (required)
- `--tenant, -t <id>` - Tenant ID (default: "default")
- `--output, -o <dir>` - Custom output directory (optional)
- `--help, -h` - Show help message

#### Supported Input Formats

- SVG (`.svg`)
- PNG (`.png`)
- JPG/JPEG (`.jpg`, `.jpeg`)
- ICO (`.ico`)
- WebP (`.webp`)

### Output Files

The script generates the following files in `frontend/public/brand/<tenant>/`:

| File | Size | Purpose |
|------|------|---------|
| `logo.png` | 200x60 | Main logo for application header |
| `logo-light.png` | 200x60 | Logo variant for light theme |
| `logo-dark.png` | 200x60 | Logo variant for dark theme |
| `favicon.ico` | 32x32 | Browser favicon |
| `favicon-16x16.png` | 16x16 | Small favicon |
| `favicon-32x32.png` | 32x32 | Standard favicon |
| `apple-touch-icon.png` | 180x180 | iOS home screen icon |
| `android-chrome-192x192.png` | 192x192 | Android icon (small) |
| `android-chrome-512x512.png` | 512x512 | Android icon (large) |
| `manifest.json` | - | PWA manifest file |

### Examples

Convert a logo for the "acme" tenant:

```bash
node convert-brand-assets.js --input ~/Downloads/acme-logo.svg --tenant acme
```

Convert a logo for the default tenant:

```bash
node convert-brand-assets.js --input logo.png --tenant default
```

Use a custom output directory:

```bash
node convert-brand-assets.js --input logo.svg --tenant store1 --output /custom/path
```

### Configuration

After running the script, update your tenant configuration file to reference the generated assets:

```json
{
  "branding": {
    "company": {
      "name": "Your Company",
      "logo": "/brand/your-tenant/logo.png",
      "favicon": "/brand/your-tenant/favicon.ico"
    },
    "logo": {
      "light": "/brand/your-tenant/logo-light.png",
      "dark": "/brand/your-tenant/logo-dark.png"
    }
  }
}
```

### Requirements Validation

This script validates:
- **Requirement 6.2**: Converts SVG/ICO to PNG/JPG formats
- **Requirement 6.3**: Outputs to deterministic location `public/brand/<tenant>/`

### Fallback Mode

If the `sharp` library is not available, the script will run in fallback mode:
- Copies the original file as-is
- Creates duplicate copies for light/dark variants
- Does not generate favicon or PWA icons

For production use, ensure `sharp` is installed:

```bash
cd scripts
npm install sharp
```

### Troubleshooting

#### Error: "Input file not found"

Ensure the path to your input file is correct. Use absolute paths or paths relative to the scripts directory.

#### Error: "Unsupported input format"

The script only supports: `.svg`, `.png`, `.jpg`, `.jpeg`, `.ico`, `.webp`

Convert your file to one of these formats first.

#### Warning: "Sharp library not available"

Install sharp for full functionality:

```bash
cd scripts
npm install sharp
```

#### Permission errors on Windows

Run your terminal as Administrator if you encounter permission errors when creating directories.

## Other Scripts

### preflight.ps1

PowerShell script for pre-flight checks before building or deploying.

## Development

To add new scripts:

1. Create your script in the `scripts/` directory
2. Add it to `package.json` scripts section if it should be runnable via npm
3. Document it in this README
4. Ensure it follows the project's coding standards
