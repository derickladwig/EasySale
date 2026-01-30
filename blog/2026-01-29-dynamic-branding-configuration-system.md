# Dynamic Branding & Logo Configuration System

**Date**: January 29, 2026

## Summary

Implemented a comprehensive branding configuration system that allows users to upload custom logos, favicons, and configure accent colors with real-time preview. The system removes hardcoded favicon.png and icon.png dependencies, making branding fully configurable through the UI.

## Features Implemented

### Backend (Rust/Actix-web)

**Branding Asset Service** (`backend/crates/server/src/services/branding_asset_service.rs`):
- Tenant-isolated storage in `data/branding/{tenant_id}/`
- Supports PNG, JPG, WebP, GIF, BMP, SVG formats
- Generates standardized filenames (logo-light.png, favicon.png, etc.)
- No heavy image processing dependencies (simplified for fast builds)

**Branding Assets Handler** (`backend/crates/server/src/handlers/branding_assets.rs`):
- `POST /api/branding/assets/upload` - Upload with optional crop region
- `GET /api/branding/assets/{tenant_id}/{filename}` - Serve assets with caching
- `GET /api/branding/assets/{tenant_id}` - List tenant assets
- `DELETE /api/branding/assets/{tenant_id}` - Delete all tenant assets

Routes registered as public endpoints (no auth required for setup wizard).

### Frontend (React/TypeScript)

**Branding API Client** (`frontend/src/services/brandingApi.ts`):
- `uploadImage()`, `uploadLogo()`, `uploadFavicon()`, `uploadAppIcon()`
- `saveBrandingConfig()`, `getBrandingConfig()`
- Image validation helpers (type, size)

**FaviconManager Component** (`frontend/src/components/FaviconManager.tsx`):
- Dynamically updates browser favicon from branding config
- Supports Apple touch icon
- Badge notification support for favicon

**BrandingSettingsPage** (`frontend/src/admin/pages/BrandingSettingsPage.tsx`):
- Drag-drop image upload for logos (light/dark themes)
- Favicon/icon upload with preview
- 13 color theme presets + custom hex picker
- Real-time preview panel showing:
  - Header with logo
  - Browser tab with favicon
  - Login badge
  - Primary/secondary buttons
- Live CSS variable updates for instant preview

### Route Registration
- Added `/admin/branding` route in App.tsx
- Lazy-loaded component for optimal bundle size

## Asset Pack Integration

The system works with the existing `data/easysale_asset_pack/` folder structure:
- `favicons/` - Multiple sizes (16x16 to 256x256, plus .ico)
- `icons/` - Light/dark variants at multiple sizes
- `logos/` - Light/dark variants with WebP optimization
- `app-icons/` - PWA icons (192x192, 512x512) and Apple touch icon

## Technical Notes

- Image processing is handled client-side to avoid heavy Rust dependencies
- Backend stores uploaded files as-is with standardized naming
- CORS configured for LAN access during setup wizard
- 10MB JSON payload limit for logo uploads in theme endpoint

## Files Modified/Created

**Backend**:
- `backend/crates/server/src/services/branding_asset_service.rs` (new)
- `backend/crates/server/src/handlers/branding_assets.rs` (new)
- `backend/crates/server/src/services/mod.rs` (modified)
- `backend/crates/server/src/handlers/mod.rs` (modified)
- `backend/crates/server/src/main.rs` (modified - added routes)

**Frontend**:
- `frontend/src/services/brandingApi.ts` (new)
- `frontend/src/components/FaviconManager.tsx` (new)
- `frontend/src/admin/pages/BrandingSettingsPage.tsx` (new)
- `frontend/src/routes/lazyRoutes.tsx` (modified)
- `frontend/src/App.tsx` (modified)
- `frontend/index.html` (modified - dynamic favicon IDs)
