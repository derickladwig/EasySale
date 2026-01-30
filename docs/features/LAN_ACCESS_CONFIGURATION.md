# LAN Access Configuration

This document describes the LAN access configuration feature that allows users to enable network access from other devices.

## Overview

By default, EasySale is only accessible from localhost (127.0.0.1) for security. Users can enable LAN access through the Setup Wizard or Settings page to allow other devices on the same network to connect.

## User Experience

### Setup Wizard

A new "Network & Access" step is available in the Setup Wizard:

1. **Toggle**: Enable/disable LAN access
2. **Binding Mode** (when LAN enabled):
   - **All Interfaces (0.0.0.0)** - Recommended, accessible from any network interface
   - **Specific Interface** - Advanced, bind to a specific IP address
3. **Interface Detection**: Auto-detects available network interfaces
4. **Access URLs Preview**: Shows local and LAN URLs

### Settings Page

Access LAN settings anytime at: **Admin → Network → LAN Settings** (`/admin/network/lan`)

The settings page provides the same functionality as the wizard step.

## Technical Implementation

### Files Created/Modified

#### Frontend
- `frontend/src/admin/components/wizard/NetworkStepContent.tsx` - Network step component
- `frontend/src/admin/components/wizard/types.ts` - Added NetworkStepData type
- `frontend/src/admin/pages/SetupWizardPage.tsx` - Added Network step to wizard
- `frontend/src/admin/pages/NetworkSettingsPage.tsx` - Standalone settings page
- `frontend/src/settings/pages/NetworkPage.tsx` - Added link to LAN settings
- `frontend/src/App.tsx` - Added route for NetworkSettingsPage

#### Backend
- `backend/crates/server/src/handlers/network.rs` - Network configuration API
- `backend/crates/server/src/handlers/mod.rs` - Added network module
- `backend/crates/server/src/main.rs` - Added network routes

#### Configuration
- `runtime/.gitkeep` - Runtime directory placeholder
- `.gitignore` - Added runtime/* exclusions
- `start-prod.bat` - Production start script with LAN support

### Local-Only Files (gitignored)

The following files are generated locally and NOT tracked in git:

- `runtime/network-config.json` - JSON configuration
- `runtime/docker-compose.override.yml` - Docker port binding override
- `runtime/local.env` - Optional environment variables

### Docker Compose Override

When LAN is enabled, a docker-compose override file is generated:

```yaml
# runtime/docker-compose.override.yml
services:
  frontend:
    ports:
      - "0.0.0.0:7945:7945"  # or specific IP
  
  backend:
    ports:
      - "0.0.0.0:8923:8923"  # or specific IP
```

When LAN is disabled (default):
```yaml
services:
  frontend:
    ports:
      - "127.0.0.1:7945:7945"
  
  backend:
    ports:
      - "127.0.0.1:8923:8923"
```

## API Endpoints

### GET /api/network/interfaces
Returns detected network interfaces.

Response:
```json
[
  { "name": "Loopback", "ip": "127.0.0.1", "isWireless": false },
  { "name": "Ethernet", "ip": "192.168.1.100", "isWireless": false },
  { "name": "Wi-Fi", "ip": "192.168.1.101", "isWireless": true }
]
```

### GET /api/network/config
Returns current network configuration.

Response:
```json
{
  "lanEnabled": false,
  "bindMode": "localhost",
  "selectedIp": null,
  "detectedInterfaces": []
}
```

### POST /api/network/config
Saves network configuration.

Request:
```json
{
  "lanEnabled": true,
  "bindMode": "all-interfaces",
  "selectedIp": null,
  "detectedInterfaces": []
}
```

Response:
```json
{
  "success": true,
  "message": "Network configuration saved. Restart the application for changes to take effect.",
  "restart_required": true
}
```

## Startup Script

The `start-prod.bat` script:

1. Checks for `runtime/docker-compose.override.yml`
2. Includes override file in docker-compose command if present
3. Waits for services to be healthy (polls /health endpoint)
4. Opens browser to http://localhost:7945 (once, after readiness)
5. Displays LAN URL if enabled

Usage:
```batch
start-prod.bat              # Normal start with browser
start-prod.bat --no-browser # Start without opening browser
start-prod.bat --no-pause   # Non-interactive mode
```

## Security Considerations

1. **Default is localhost-only** - Safe by default
2. **No IPs in tracked files** - All LAN config is gitignored
3. **User must explicitly enable** - LAN access requires user action
4. **Warning displayed** - Security note shown when enabling LAN
5. **Trusted networks only** - Users advised to only enable on trusted networks

## Testing

1. **Wizard Step**: Navigate to Setup Wizard, verify Network step appears
2. **Skip Path**: Verify skipping leaves localhost-only (default)
3. **Enable LAN**: Enable LAN, verify override file is created
4. **Restart**: Restart app, verify LAN access works from another device
5. **Settings Page**: Verify settings can be changed from Admin → Network → LAN
6. **Browser Open**: Verify browser opens once after readiness
7. **Idempotent**: Re-run startup, verify no duplicate browser tabs
