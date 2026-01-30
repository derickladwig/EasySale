# Frontend Split Audit

**Agent**: C — Frontend Split / Packaging  
**Date**: 2026-01-27  
**Status**: Complete

---

## 1. Current Build Configuration

### 1.1 Package.json Build Scripts

**File**: `frontend/package.json`

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "build:check": "tsc --project tsconfig.build.json && vite build",
    "preview": "vite preview"
  }
}
```

**Evidence**: Single build target (`npm run build`). No lite/full variants exist.

### 1.2 Vite Configuration

**File**: `frontend/vite.config.ts`

```typescript
build: {
  outDir: 'dist',
  sourcemap: mode === 'development',
  assetsInlineLimit: 4096, // Inline assets < 4KB as base64
  chunkSizeWarningLimit: 500, // Warn if chunk > 500KB
  rollupOptions: {
    output: {
      manualChunks: {
        'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        'ui-vendor': ['lucide-react'],
      },
    },
  },
  minify: 'terser',
  terserOptions: {
    compress: {
      drop_console: mode === 'production',
      drop_debugger: true,
    },
  },
}
```

**Evidence**: Basic code splitting exists for vendor chunks only. No feature-based splitting.

---

## 2. Environment Variables That Control Features

### 2.1 Vite-Defined Variables

**File**: `frontend/vite.config.ts` (lines 59-67)

| Variable | Purpose | Default |
|----------|---------|---------|
| `VITE_API_URL` | Backend API URL | Dynamic (hostname:8923 in dev, relative in prod) |
| `VITE_APP_VERSION` | App version | `npm_package_version` or `0.1.0` |
| `VITE_BUILD_HASH` | Build hash | `BUILD_HASH` env or `dev` |
| `VITE_BUILD_DATE` | Build date | Current date ISO |
| `VITE_PORT` | Dev server port | `7945` |

### 2.2 Runtime Profile Variables

**File**: `frontend/src/common/utils/demoMode.ts`

| Variable | Purpose | Values |
|----------|---------|--------|
| `VITE_RUNTIME_PROFILE` | Runtime mode | `demo`, `dev`, `prod` |
| `VITE_DEMO_MODE` | Demo mode flag | `true`, `false` |
| `VITE_LOG_LEVEL` | Log level | `error`, `warn`, `info`, `debug` |

**Evidence**: These control runtime behavior, NOT build-time feature inclusion.

### 2.3 Missing Feature-Gating Variables

**NO** environment variables exist for:
- `VITE_LITE_MODE` or `VITE_BUILD_VARIANT`
- `VITE_ENABLE_ADMIN` or `VITE_ENABLE_REPORTING`
- `VITE_ENABLE_STORYBOOK` or `VITE_ENABLE_DOCS`

---

## 3. Route Structure and Gating

### 3.1 Route Hierarchy

**File**: `frontend/src/App.tsx`

```
Public Routes:
├── /fresh-install → FreshInstallWizard
├── /login → LoginPageV2
└── /access-denied → AccessDeniedPage

Protected Routes (RequireAuth):
├── /setup → FirstRunSetupPage
└── / (AppLayout)
    ├── / → HomePage
    ├── /sell → SellPage (access_sell)
    ├── /lookup → LookupPage (access_sell)
    ├── /warehouse → WarehousePage (access_warehouse)
    ├── /documents → DocumentsPage (access_warehouse)
    ├── /vendor-bills/* → Bill management (various permissions)
    ├── /customers → CustomersPage (access_sell)
    ├── /reporting → ReportingPage (access_admin)
    ├── /sales → SalesManagementPage (access_admin)
    ├── /preferences → PreferencesPage
    ├── /admin/* → Admin sub-routes (access_admin)
    ├── /review/* → Review pages (review_vendor_bills)
    └── /forms → FormTemplatesPage (access_admin)
```

### 3.2 Permission-Based Gating

**File**: `frontend/src/App.tsx`

Routes use `<RequirePermission permission="...">` wrapper:
- `access_sell`: Sell, Lookup, Customers
- `access_warehouse`: Warehouse, Documents, Vendor Bills
- `access_admin`: Reporting, Sales, Admin, Forms
- `review_vendor_bills`: Review pages
- `upload_vendor_bills`, `view_vendor_bills`: Specific bill actions

### 3.3 Capability-Based Gating

**File**: `frontend/src/common/components/CapabilityGate.tsx`

```typescript
interface CapabilityGateProps {
  requireAccounting?: boolean;  // accounting_mode !== 'disabled'
  requireExport?: boolean;      // features.export === true
  requireSync?: boolean;        // features.sync === true
}
```

**File**: `frontend/src/config/navigation.ts` (line 261)

```typescript
{
  id: 'admin-exports',
  path: '/admin/exports',
  capability: 'export',  // Only shown if backend has export capability
}
```

**Evidence**: Capability gating is runtime-based (queries `/api/capabilities`), not build-time.

---

## 4. Heavy Dependencies Identified

### 4.1 Production Dependencies

**File**: `frontend/package.json`

| Package | Size Impact | Used For |
|---------|-------------|----------|
| `react` + `react-dom` | ~140KB | Core framework |
| `react-router-dom` | ~30KB | Routing |
| `@tanstack/react-query` | ~40KB | Data fetching |
| `lucide-react` | ~50KB+ | Icons (tree-shakeable) |
| `date-fns` | ~20KB | Date formatting |
| `jsbarcode` | ~15KB | Barcode generation |
| `zod` | ~15KB | Schema validation |
| `clsx` | ~1KB | Class names |

**Total estimated**: ~310KB+ (minified, before gzip)

### 4.2 Dev Dependencies (NOT in production build)

| Package | Purpose |
|---------|---------|
| `@storybook/*` | Component documentation |
| `@playwright/test` | E2E testing |
| `vitest` | Unit testing |
| `tailwindcss` | CSS framework (build-time only) |

### 4.3 Missing Heavy Dependencies

**NOT FOUND** in package.json:
- Chart libraries (recharts, chart.js, d3)
- Rich text editors (quill, slate, tiptap)
- Code editors (monaco, codemirror)
- PDF generators
- Map libraries

**Evidence**: Frontend is relatively lightweight. No heavy visualization or editor dependencies.

---

## 5. Code Splitting Patterns Found

### 5.1 Lazy Loading (Limited)

**File**: `frontend/src/sales/pages/SalesManagementPage.tsx` (lines 34-40)

```typescript
const LayawayTab = React.lazy(() => import('../components/LayawayTab'));
const WorkOrdersTab = React.lazy(() => import('../components/WorkOrdersTab'));
const CommissionsTab = React.lazy(() => import('../components/CommissionsTab'));
const GiftCardsTab = React.lazy(() => import('../components/GiftCardsTab'));
const PromotionsTab = React.lazy(() => import('../components/PromotionsTab'));
const CreditAccountsTab = React.lazy(() => import('../components/CreditAccountsTab'));
const LoyaltyTab = React.lazy(() => import('../components/LoyaltyTab'));
```

**Evidence**: Only ONE page uses lazy loading (SalesManagementPage tabs).

### 5.2 Vendor Chunk Splitting

**File**: `frontend/vite.config.ts` (lines 82-85)

```typescript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'ui-vendor': ['lucide-react'],
}
```

**Evidence**: Basic vendor splitting only. No route-based or feature-based splitting.

### 5.3 Missing Code Splitting

**NOT FOUND**:
- Route-level lazy loading (all routes eagerly loaded in App.tsx)
- Feature-based chunks (admin, reporting, warehouse)
- Dynamic imports for heavy components

---

## 6. Docker Build Process

### 6.1 Production Dockerfile

**File**: `frontend/Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps && npm cache clean --force
COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**Evidence**: Single-stage build. No build variants or conditional compilation.

### 6.2 Development Dockerfile

**File**: `frontend/Dockerfile.dev`

```dockerfile
FROM node:22-alpine
WORKDIR /app
RUN npm ci --legacy-peer-deps
COPY . .
EXPOSE 5173
EXPOSE 7946
CMD ["npm", "run", "dev"]
```

**Evidence**: Standard dev setup. No lite mode support.

### 6.3 Nginx Configuration

**File**: `frontend/nginx.conf`

- Gzip compression enabled
- Security headers configured
- API proxy to backend:8923
- SPA fallback to index.html

---

## 7. Summary of Findings

### 7.1 What EXISTS

| Feature | Status | Evidence |
|---------|--------|----------|
| Basic vendor code splitting | ✅ | vite.config.ts manualChunks |
| Runtime capability gating | ✅ | CapabilitiesProvider, CapabilityGate |
| Permission-based route protection | ✅ | RequirePermission wrapper |
| Demo mode detection | ✅ | demoMode.ts utilities |
| Feature flags (runtime) | ✅ | /api/feature-flags endpoint |

### 7.2 What is MISSING

| Feature | Status | Impact |
|---------|--------|--------|
| Build-time lite mode | ❌ | All code shipped in every build |
| Route-level lazy loading | ❌ | Large initial bundle |
| Feature-based chunks | ❌ | No tree-shaking by feature |
| Conditional compilation | ❌ | Admin/reporting always included |
| Multiple build targets | ❌ | Single `npm run build` |
| Storybook exclusion | ❌ | Stories in src/ (excluded by vite) |

### 7.3 Bundle Size Concerns

1. **All routes eagerly loaded**: ~50+ page components loaded upfront
2. **No admin exclusion**: Admin pages (~15 routes) always in bundle
3. **No reporting exclusion**: Reporting pages always in bundle
4. **Storybook stories**: In src/ but excluded by vite config (OK)

---

## 8. File Evidence Index

| File | Lines | Purpose |
|------|-------|---------|
| `frontend/package.json` | Full | Dependencies, scripts |
| `frontend/vite.config.ts` | 59-90 | Build config, env vars |
| `frontend/src/App.tsx` | Full | Route definitions |
| `frontend/src/common/utils/demoMode.ts` | Full | Runtime profile |
| `frontend/src/services/capabilities.ts` | Full | Capability fetching |
| `frontend/src/common/contexts/CapabilitiesContext.tsx` | Full | Capability context |
| `frontend/src/common/components/CapabilityGate.tsx` | Full | Capability gating |
| `frontend/src/config/navigation.ts` | Full | Navigation config |
| `frontend/src/settings/hooks/useFeatureFlags.ts` | Full | Feature flags |
| `frontend/Dockerfile` | Full | Production build |
| `frontend/Dockerfile.dev` | Full | Development build |
| `frontend/nginx.conf` | Full | Production serving |
