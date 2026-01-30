# EasySale Configuration System

This directory contains all tenant configurations for the EasySale platform.

## Directory Structure

```
configs/
├── schema.json              # JSON Schema for configuration validation
├── default.json             # Generic POS default configuration
├── private/                 # Private tenant configs (gitignored)
│   └── [tenant-id].json     # Your private configurations
├── examples/                # Public example configurations
│   ├── retail-store.json    # General retail store template
│   ├── restaurant.json      # Restaurant/food service template
│   └── service-business.json # Service business template
└── README.md                # This file
```

## Configuration Files

### default.json
The base configuration used when no tenant-specific config is provided. Contains generic POS settings with no business-specific branding.

### private/
Contains private tenant configurations that should NOT be committed to version control. Add your business-specific configurations here.

### examples/
Public example configurations demonstrating different business types. These serve as templates for new tenants.

## Configuration Structure

Each configuration file follows this structure:

```json
{
  "version": "1.0.0",
  "tenant": {
    "id": "unique-tenant-id",
    "name": "Business Name",
    "slug": "business-slug"
  },
  "branding": { ... },
  "theme": { ... },
  "categories": [ ... ],
  "navigation": { ... },
  "widgets": { ... },
  "modules": { ... },
  "localization": { ... },
  "layouts": { ... },
  "wizards": { ... }
}
```

## Usage

### Loading Configuration

The system loads configuration in this order:
1. Check for `TENANT_ID` environment variable
2. Load `configs/private/{tenant-id}.json` if exists
3. Fall back to `configs/default.json`

### Creating a New Tenant

1. Copy an example configuration from `configs/examples/`
2. Save to `configs/private/{your-tenant-id}.json`
3. Customize branding, categories, navigation, etc.
4. Set `TENANT_ID={your-tenant-id}` environment variable

### Validation

All configurations are validated against `configs/schema.json` at startup.
Invalid configurations will prevent the application from starting.

## Security

- Never commit `configs/private/` to version control
- Use environment variables for sensitive settings
- Tenant configurations are isolated - no cross-tenant access
