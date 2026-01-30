# Data Sources Reference

This document identifies the correct data sources that should replace hardcoded values throughout the EasySale codebase.

## 1. Version Information

### Application Version
**Source**: `frontend/package.json` → `version` field

```json
{
  "version": "0.1.0"
}
```

**Current Value**: `0.1.0`

**Usage**: Should be used for:
- Footer version display (`v0.1.0`)
- About dialogs
- System status displays

**Backend Version**: `backend/crates/server/Cargo.toml` → `version` field
- Accessed via `env!("CARGO_PKG_VERSION")` in Rust code
- Exposed through `/api/capabilities` endpoint

---

## 2. Build Information

### Build Hash
**Source**: Backend compile-time environment variable `BUILD_HASH`

```rust
// backend/crates/server/src/handlers/capabilities.rs
let build_hash = option_env!("BUILD_HASH")
    .unwrap_or("dev")
    .to_string();
```

**How to Set**: Pass during build:
```bash
BUILD_HASH=$(git rev-parse --short HEAD) cargo build
```

**Frontend Access**: Via `/api/capabilities` endpoint response:
```json
{
  "version": "0.1.0",
  "build_hash": "abc123",
  "accounting_mode": "export_only",
  "features": {
    "export": true,
    "sync": false
  }
}
```

### Build Date
**Source**: Generated at build time in packaging scripts

```powershell
# sync/ci/package.ps1
build_date = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
```

**Note**: Build date is NOT currently exposed via API. If needed, add to capabilities response.

---

## 3. Branding & Copyright

### Primary Source: Tenant Configuration Files

**Location**: `configs/` directory

| File | Purpose |
|------|---------|
| `configs/schema.json` | JSON Schema defining structure |
| `configs/default.json` | Default EasySale branding |
| `configs/private/*.json` | Tenant-specific configs (gitignored) |
| `configs/examples/*.json` | Example configurations |

### Branding Structure (from `configs/schema.json`)

```json
{
  "branding": {
    "company": {
      "name": "EasySale",           // Required
      "shortName": "ES",            // Optional
      "tagline": "Your Flexible Point of Sale Solution",
      "logo": "/logo.svg",
      "logoLight": "/assets/logos/logo-light.png",
      "logoDark": "/assets/logos/logo-dark.png",
      "favicon": "/assets/icons/favicon.png",
      "icon": "/assets/icons/icon.png"
    }
  }
}
```

### Copyright Text
**Source**: Theme preset JSON files

**Location**: `frontend/src/features/auth/theme/presets/*.json`

```json
{
  "footer": {
    "showVersion": true,
    "showBuild": true,
    "showCopyright": true,
    "copyrightText": "© 2026 EasySale"
  }
}
```

**Dynamic Generation**: Copyright year should ideally be generated:
```typescript
const currentYear = new Date().getFullYear();
const copyright = `© ${currentYear} ${companyName}`;
```

### Frontend Config Sources

| File | Purpose |
|------|---------|
| `frontend/src/config/defaultConfig.ts` | Default tenant config |
| `frontend/src/config/brandConfig.ts` | Brand-specific defaults |
| `frontend/src/config/types.ts` | TypeScript type definitions |

---

## 4. System Status APIs

### Health Check Endpoints

| Endpoint | Purpose | Response |
|----------|---------|----------|
| `GET /health` | Basic health check | `200 OK` |
| `HEAD /health` | Basic health check | `200 OK` |
| `GET /api/health/status` | Full system health | JSON with component status |
| `GET /api/health/connectivity` | External service connectivity | JSON with platform status |
| `GET /api/health/connectivity/{platform}` | Single platform check | JSON with platform status |

### `/api/health/status` Response Structure

```json
{
  "status": "healthy",
  "components": {
    "database": {
      "status": "up"
    },
    "external_services": {
      "status": "up",
      "woocommerce": true,
      "quickbooks": true
    }
  },
  "timestamp": "2026-01-25T12:00:00Z"
}
```

### Capabilities Endpoint

**Endpoint**: `GET /api/capabilities`

**Response**:
```json
{
  "version": "0.1.0",
  "build_hash": "abc123",
  "accounting_mode": "export_only",
  "features": {
    "export": true,
    "sync": false
  }
}
```

### Extended Capabilities

**Endpoint**: `GET /api/config/capabilities`

**Response**:
```json
{
  "version": "0.1.0",
  "build_hash": "abc123",
  "accounting_mode": "export_only",
  "features": {
    "export": true,
    "sync": false
  },
  "modules": {
    "inventory": { "enabled": true },
    "layaway": { "enabled": false }
  },
  "vertical_pack": {
    "enabled": false,
    "pack_name": "automotive"
  }
}
```

---

## 5. Asset Paths

### Favicon
**Default Path**: `/assets/icons/favicon.png`

**Source**: 
- `frontend/public/assets/icons/favicon.png` (actual file)
- `frontend/src/utils/favicon.ts` (utility functions)
- Config: `branding.company.favicon`

```typescript
// frontend/src/utils/favicon.ts
export function getFaviconUrl(config: unknown): string {
  // Returns config value or fallback
  return '/assets/icons/favicon.png';
}
```

### Logo
**Default Paths**:
- Light theme: `/assets/logos/EasySale-logo-light.png`
- Dark theme: `/assets/logos/EasySale-logo-dark.png`
- Generic: `/assets/logos/logo.png`

**Actual Files**:
```
frontend/public/assets/
├── icons/
│   ├── favicon.png      # 32x32 or 64x64
│   └── icon.png         # App icon (192x192)
└── logos/
    └── logo.png         # Main logo
```

**Config Sources**:
- `branding.company.logo` - Generic logo
- `branding.company.logoLight` - Light theme logo
- `branding.company.logoDark` - Dark theme logo

### HTML References

```html
<!-- frontend/index.html -->
<link rel="icon" type="image/png" href="/assets/icons/favicon.png" />
<link rel="apple-touch-icon" href="/assets/icons/icon.png" />
```

---

## 6. Hardcoded Values to Replace

### Login Pages

**File**: `frontend/src/features/auth/pages/LoginPage.tsx`
```tsx
// HARDCODED - Replace with config/API values
version="1.0.0"
buildId="20260116-abc123"
copyright="© 2026 EasySale. All rights reserved."
```

**File**: `frontend/src/features/auth/pages/LoginPageV2.tsx`
```tsx
// HARDCODED - Replace with config/API values
<div>v1.0.0 • 2023-04-15-abc123</div>
<div>© 2024 EasySale. All rights reserved.</div>
```

### Recommended Replacement

```tsx
import { useCapabilities } from '@features/admin/hooks/useCapabilities';
import { useConfig } from '@common/contexts/ConfigContext';

function Footer() {
  const { data: capabilities } = useCapabilities();
  const config = useConfig();
  
  const version = capabilities?.version ?? 'unknown';
  const buildHash = capabilities?.build_hash?.slice(0, 8) ?? 'dev';
  const companyName = config?.branding?.company?.name ?? 'EasySale';
  const currentYear = new Date().getFullYear();
  
  return (
    <footer>
      <div>v{version} • {buildHash}</div>
      <div>© {currentYear} {companyName}. All rights reserved.</div>
    </footer>
  );
}
```

---

## 7. Configuration Loading Flow

### Backend
1. Server starts → loads `TENANT_ID` from env (default: `"default"`)
2. `ConfigLoader` reads `configs/{tenant_id}.json` or `configs/default.json`
3. Config cached in memory (300s TTL)
4. Exposed via `/api/config` endpoint

### Frontend
1. App mounts → `CapabilitiesProvider` fetches `/api/capabilities`
2. `ConfigContext` fetches `/api/config` for tenant config
3. Values cached in React Query / localStorage for offline access
4. Components read from context, not hardcoded values

---

## 8. Summary: Data Source Mapping

| Data | Source | Access Method |
|------|--------|---------------|
| App Version | `package.json` / Cargo.toml | `/api/capabilities` |
| Build Hash | `BUILD_HASH` env var | `/api/capabilities` |
| Company Name | `configs/*.json` | `/api/config` or ConfigContext |
| Copyright Text | Theme presets or generated | Theme config + current year |
| Favicon Path | `branding.company.favicon` | Config or default `/assets/icons/favicon.png` |
| Logo Path | `branding.company.logo*` | Config or default `/assets/logos/logo.png` |
| System Status | Backend health checks | `/api/health/status` |
| Feature Flags | Compile-time features | `/api/capabilities` |
| Modules Enabled | Tenant config | `/api/config/capabilities` |

---

## 9. Files Requiring Updates

Based on this analysis, the following files contain hardcoded values that should be replaced:

1. **`frontend/src/features/auth/pages/LoginPage.tsx`** - version, buildId, copyright
2. **`frontend/src/features/auth/pages/LoginPageV2.tsx`** - version, build date, copyright
3. **`frontend/src/features/auth/theme/presets/*.json`** - copyright year (some say 2024, some 2026)
4. **`frontend/src/features/setup/pages/FreshInstallWizard.tsx`** - "EasySale" text should come from config

---

## 10. Recommended Implementation

### Create a unified hook for footer data:

```typescript
// frontend/src/common/hooks/useAppInfo.ts
export function useAppInfo() {
  const { data: capabilities } = useCapabilities();
  const config = useConfig();
  
  return {
    version: capabilities?.version ?? import.meta.env.VITE_APP_VERSION ?? '0.1.0',
    buildHash: capabilities?.build_hash ?? 'dev',
    companyName: config?.branding?.company?.name ?? 'EasySale',
    copyright: `© ${new Date().getFullYear()} ${config?.branding?.company?.name ?? 'EasySale'}`,
    favicon: config?.branding?.company?.favicon ?? '/assets/icons/favicon.png',
    logo: {
      light: config?.branding?.company?.logoLight ?? '/assets/logos/logo.png',
      dark: config?.branding?.company?.logoDark ?? '/assets/logos/logo.png',
    },
  };
}
```

### Add Vite environment variable for fallback:

```typescript
// vite.config.ts
export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(process.env.npm_package_version),
  },
});
```
