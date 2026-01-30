# Frontend Split Recommendations

**Agent**: C — Frontend Split / Packaging  
**Date**: 2026-01-27  
**Status**: Complete

---

## 1. How to Implement Lite UI Mode

### 1.1 Overview

Implement a build-time feature flag system that creates two distinct bundles:
- **Full Build**: All features (admin, reporting, warehouse, vendor bills)
- **Lite Build**: Core POS only (sell, lookup, customers)

### 1.2 Implementation Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Build-Time Decision                       │
├─────────────────────────────────────────────────────────────┤
│  VITE_BUILD_VARIANT=full  →  All routes, all features       │
│  VITE_BUILD_VARIANT=lite  →  Core routes only               │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Routes/Components for Full-Only Build

### 2.1 Routes to Exclude in Lite Mode

| Route | Component | Reason |
|-------|-----------|--------|
| `/admin/*` | AdminLayout + 17 sub-routes | Admin-only functionality |
| `/reporting` | ReportingPage | Manager-only |
| `/sales` | SalesManagementPage | Advanced sales features |
| `/vendor-bills/*` | Bill management (5 routes) | Warehouse/accounting |
| `/documents` | DocumentsPage | OCR/document processing |
| `/review/*` | ReviewPage, ReviewCaseDetailPage | Bill review workflow |
| `/forms` | FormTemplatesPage | Admin forms |
| `/exports` | ExportsPage | Data export |

### 2.2 Routes to KEEP in Lite Mode

| Route | Component | Reason |
|-------|-----------|--------|
| `/` | HomePage | Dashboard |
| `/login` | LoginPageV2 | Authentication |
| `/sell` | SellPage | Core POS |
| `/lookup` | LookupPage | Product search |
| `/customers` | CustomersPage | Customer management |
| `/warehouse` | WarehousePage | Basic inventory |
| `/preferences` | PreferencesPage | User settings |
| `/setup` | FirstRunSetupPage | Initial setup |
| `/fresh-install` | FreshInstallWizard | Installation |

### 2.3 Components to Exclude in Lite Mode

| Component | Location | Reason |
|-----------|----------|--------|
| `AdminLayout` | `src/admin/components/` | Admin navigation |
| `CapabilitiesDashboardPage` | `src/admin/pages/` | System capabilities |
| `IntegrationsPage` | `src/settings/pages/` | External integrations |
| `FeatureFlagsPage` | `src/settings/pages/` | Feature management |
| `SyncDashboardPage` | `src/settings/pages/` | Sync monitoring |
| `DataManagementPage` | `src/settings/pages/` | Data import/export |
| All `*Tab` components | `src/sales/components/` | Sales management tabs |

---

## 3. Specific Environment Variables to Add

### 3.1 New Build-Time Variables

Add to `frontend/.env.example`:

```bash
# ============================================================================
# Build Variant Configuration
# ============================================================================
# Build variant: 'full' (all features) or 'lite' (core POS only)
# Default: full
VITE_BUILD_VARIANT=full

# Feature flags for conditional compilation
# These are evaluated at BUILD TIME, not runtime
VITE_ENABLE_ADMIN=true
VITE_ENABLE_REPORTING=true
VITE_ENABLE_VENDOR_BILLS=true
VITE_ENABLE_DOCUMENTS=true
VITE_ENABLE_EXPORTS=true
VITE_ENABLE_INTEGRATIONS=true
```

### 3.2 Lite Mode Preset

Create `frontend/.env.lite`:

```bash
VITE_BUILD_VARIANT=lite
VITE_ENABLE_ADMIN=false
VITE_ENABLE_REPORTING=false
VITE_ENABLE_VENDOR_BILLS=false
VITE_ENABLE_DOCUMENTS=false
VITE_ENABLE_EXPORTS=false
VITE_ENABLE_INTEGRATIONS=false
```

---

## 4. Vite Config Changes Needed

### 4.1 Update vite.config.ts

**File**: `frontend/vite.config.ts`

Add after line 67 (after existing define block):

```typescript
// Build variant feature flags
const isLiteMode = env.VITE_BUILD_VARIANT === 'lite';
const enableAdmin = env.VITE_ENABLE_ADMIN !== 'false' && !isLiteMode;
const enableReporting = env.VITE_ENABLE_REPORTING !== 'false' && !isLiteMode;
const enableVendorBills = env.VITE_ENABLE_VENDOR_BILLS !== 'false' && !isLiteMode;
const enableDocuments = env.VITE_ENABLE_DOCUMENTS !== 'false' && !isLiteMode;
const enableExports = env.VITE_ENABLE_EXPORTS !== 'false' && !isLiteMode;
const enableIntegrations = env.VITE_ENABLE_INTEGRATIONS !== 'false' && !isLiteMode;

// ... in define block, add:
'import.meta.env.VITE_BUILD_VARIANT': JSON.stringify(env.VITE_BUILD_VARIANT || 'full'),
'import.meta.env.VITE_ENABLE_ADMIN': JSON.stringify(enableAdmin),
'import.meta.env.VITE_ENABLE_REPORTING': JSON.stringify(enableReporting),
'import.meta.env.VITE_ENABLE_VENDOR_BILLS': JSON.stringify(enableVendorBills),
'import.meta.env.VITE_ENABLE_DOCUMENTS': JSON.stringify(enableDocuments),
'import.meta.env.VITE_ENABLE_EXPORTS': JSON.stringify(enableExports),
'import.meta.env.VITE_ENABLE_INTEGRATIONS': JSON.stringify(enableIntegrations),
```

### 4.2 Add Feature-Based Code Splitting

**File**: `frontend/vite.config.ts`

Replace manualChunks (lines 82-85) with:

```typescript
manualChunks: (id) => {
  // Vendor chunks
  if (id.includes('node_modules')) {
    if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
      return 'react-vendor';
    }
    if (id.includes('lucide-react')) {
      return 'ui-vendor';
    }
    if (id.includes('@tanstack/react-query')) {
      return 'query-vendor';
    }
    return 'vendor';
  }
  
  // Feature-based chunks (only in full mode)
  if (id.includes('/admin/')) {
    return 'admin';
  }
  if (id.includes('/reporting/')) {
    return 'reporting';
  }
  if (id.includes('/vendor-bill/') || id.includes('/review/')) {
    return 'vendor-bills';
  }
  if (id.includes('/documents/')) {
    return 'documents';
  }
  if (id.includes('/sales/')) {
    return 'sales-management';
  }
  if (id.includes('/settings/')) {
    return 'settings';
  }
  
  return undefined; // Let Vite decide
},
```

---

## 5. Exact Files to Modify

### 5.1 Create Build Utilities

**New File**: `frontend/src/common/utils/buildVariant.ts`

```typescript
/**
 * Build Variant Utilities
 * 
 * Provides build-time feature detection for conditional compilation.
 * These values are replaced at build time by Vite.
 */

export const BUILD_VARIANT = import.meta.env.VITE_BUILD_VARIANT || 'full';
export const IS_LITE_MODE = BUILD_VARIANT === 'lite';
export const IS_FULL_MODE = BUILD_VARIANT === 'full';

// Feature flags (evaluated at build time)
export const ENABLE_ADMIN = import.meta.env.VITE_ENABLE_ADMIN === 'true';
export const ENABLE_REPORTING = import.meta.env.VITE_ENABLE_REPORTING === 'true';
export const ENABLE_VENDOR_BILLS = import.meta.env.VITE_ENABLE_VENDOR_BILLS === 'true';
export const ENABLE_DOCUMENTS = import.meta.env.VITE_ENABLE_DOCUMENTS === 'true';
export const ENABLE_EXPORTS = import.meta.env.VITE_ENABLE_EXPORTS === 'true';
export const ENABLE_INTEGRATIONS = import.meta.env.VITE_ENABLE_INTEGRATIONS === 'true';

/**
 * Check if a feature is enabled in the current build
 */
export function isFeatureEnabled(feature: string): boolean {
  switch (feature) {
    case 'admin': return ENABLE_ADMIN;
    case 'reporting': return ENABLE_REPORTING;
    case 'vendor-bills': return ENABLE_VENDOR_BILLS;
    case 'documents': return ENABLE_DOCUMENTS;
    case 'exports': return ENABLE_EXPORTS;
    case 'integrations': return ENABLE_INTEGRATIONS;
    default: return true;
  }
}
```

### 5.2 Update App.tsx for Conditional Routes

**File**: `frontend/src/App.tsx`

Add imports at top:

```typescript
import { 
  ENABLE_ADMIN, 
  ENABLE_REPORTING, 
  ENABLE_VENDOR_BILLS, 
  ENABLE_DOCUMENTS 
} from '@common/utils/buildVariant';
import { lazy, Suspense } from 'react';
```

Add lazy imports (replace direct imports):

```typescript
// Lazy load heavy features
const AdminLayout = ENABLE_ADMIN 
  ? lazy(() => import('./admin/components/AdminLayout'))
  : () => null;
const ReportingPage = ENABLE_REPORTING 
  ? lazy(() => import('./reporting/pages/ReportingPage'))
  : () => null;
const DocumentsPage = ENABLE_DOCUMENTS 
  ? lazy(() => import('./documents/pages/DocumentsPage'))
  : () => null;
// ... etc for other heavy features
```

Wrap routes conditionally:

```typescript
{ENABLE_ADMIN && (
  <Route
    path="admin"
    element={
      <RequirePermission permission="access_admin">
        <Suspense fallback={<LoadingSpinner />}>
          <AdminLayout />
        </Suspense>
      </RequirePermission>
    }
  >
    {/* Admin sub-routes */}
  </Route>
)}

{ENABLE_REPORTING && (
  <Route
    path="reporting"
    element={
      <RequirePermission permission="access_admin">
        <Suspense fallback={<LoadingSpinner />}>
          <ReportingPage />
        </Suspense>
      </RequirePermission>
    }
  />
)}
```

### 5.3 Update Navigation Config

**File**: `frontend/src/config/navigation.ts`

Add build variant filtering:

```typescript
import { isFeatureEnabled } from '@common/utils/buildVariant';

// Add to filterNavigationByPermissions function (around line 290):
export function filterNavigationByPermissions(
  items: NavigationItem[],
  hasPermission: (permission: Permission) => boolean,
  capabilities?: { features: { export: boolean; sync: boolean } }
): NavigationItem[] {
  return items.filter((item) => {
    // Check build-time feature flag first
    if (item.id.startsWith('admin') && !isFeatureEnabled('admin')) {
      return false;
    }
    if (item.id === 'reporting' && !isFeatureEnabled('reporting')) {
      return false;
    }
    if (item.id === 'documents' && !isFeatureEnabled('documents')) {
      return false;
    }
    if (item.id === 'review' && !isFeatureEnabled('vendor-bills')) {
      return false;
    }
    
    // ... existing permission and capability checks
  });
}
```

### 5.4 Add Build Scripts

**File**: `frontend/package.json`

Add new scripts:

```json
{
  "scripts": {
    "build": "vite build",
    "build:full": "VITE_BUILD_VARIANT=full vite build",
    "build:lite": "VITE_BUILD_VARIANT=lite vite build",
    "build:analyze": "vite build --mode analyze"
  }
}
```

### 5.5 Update Dockerfile for Variants

**File**: `frontend/Dockerfile`

```dockerfile
# Multi-stage build for production frontend
ARG BUILD_VARIANT=full

# Stage 1: Build
FROM node:20-alpine AS builder
ARG BUILD_VARIANT

WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps && npm cache clean --force
COPY . .

# Build with variant
ENV VITE_BUILD_VARIANT=${BUILD_VARIANT}
RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Usage:
```bash
# Full build (default)
docker build -t EasySale-frontend:full .

# Lite build
docker build --build-arg BUILD_VARIANT=lite -t EasySale-frontend:lite .
```

---

## 6. Implementation Priority

### Phase 1: Foundation (Low Risk)
1. Create `buildVariant.ts` utility
2. Add environment variables to `.env.example`
3. Update `vite.config.ts` with feature flags
4. Add build scripts to `package.json`

### Phase 2: Code Splitting (Medium Risk)
1. Implement feature-based manualChunks
2. Add lazy loading for heavy routes
3. Update App.tsx with Suspense boundaries

### Phase 3: Conditional Compilation (Higher Risk)
1. Update navigation filtering
2. Conditionally exclude routes
3. Update Dockerfile for variants
4. Test both build variants

---

## 7. Expected Bundle Size Impact

### Current State (Estimated)
- Full bundle: ~500KB+ (minified, before gzip)
- All routes eagerly loaded

### After Implementation (Estimated)

| Build | Initial Bundle | Lazy Chunks | Total |
|-------|---------------|-------------|-------|
| Full | ~200KB | ~300KB (on-demand) | ~500KB |
| Lite | ~150KB | ~50KB (on-demand) | ~200KB |

**Lite mode savings**: ~60% reduction in initial bundle size

---

## 8. Testing Checklist

### Build Verification
- [ ] `npm run build:full` produces working bundle
- [ ] `npm run build:lite` produces working bundle
- [ ] Lite build excludes admin routes
- [ ] Lite build excludes reporting routes
- [ ] Lite build excludes vendor-bill routes

### Runtime Verification
- [ ] Full build: All routes accessible
- [ ] Lite build: Core routes work
- [ ] Lite build: Admin routes return 404
- [ ] Navigation hides excluded features
- [ ] No console errors in either mode

### Docker Verification
- [ ] `docker build` defaults to full
- [ ] `docker build --build-arg BUILD_VARIANT=lite` works
- [ ] Both images serve correctly via nginx

---

## 9. File Change Summary

| File | Action | Lines Changed |
|------|--------|---------------|
| `frontend/.env.example` | Add | +15 lines |
| `frontend/.env.lite` | Create | ~10 lines |
| `frontend/vite.config.ts` | Modify | +30 lines |
| `frontend/src/common/utils/buildVariant.ts` | Create | ~40 lines |
| `frontend/src/App.tsx` | Modify | +50 lines |
| `frontend/src/config/navigation.ts` | Modify | +20 lines |
| `frontend/package.json` | Modify | +3 scripts |
| `frontend/Dockerfile` | Modify | +5 lines |

**Total estimated changes**: ~170 lines of code
