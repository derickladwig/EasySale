# Frontend Bundle Audit Report

**Date**: 2026-01-29  
**Build Tool**: Vite 6.4.1  
**Framework**: React 19.2.3

## Summary

Bundle optimization completed successfully with significant improvements:

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Main entry chunk (raw) | 1,206 KB | 298 KB | **75% reduction** |
| Main entry chunk (gzip) | 292 KB | 78 KB | **73% reduction** |
| Chunk size warnings | 1 | 0 | **Resolved** |
| Total JS (gzip) | ~300 KB | 366 KB | More chunks, better caching |

## Baseline Metrics (Before)

| Metric | Value |
|--------|-------|
| Main entry chunk (index-*.js) | 1,206.49 KB raw / 292.42 KB gzip |
| React vendor chunk | 47.57 KB raw / 16.57 KB gzip |
| UI vendor chunk (lucide-react) | 34.82 KB raw / 11.36 KB gzip |
| CSS | 128.26 KB raw / 22.81 KB gzip |
| Total modules transformed | 2,453 |
| Chunk size warning threshold | 500 KB |

**Status**: ⚠️ Main chunk exceeds 500KB warning limit by 706KB

## Root Cause Analysis

### 1. No Route-Level Code Splitting

**Problem**: App.tsx imports ALL 35+ page components eagerly at the top level.

```typescript
// App.tsx - ALL pages imported synchronously
import { ReportingPage } from './reporting/pages/ReportingPage';
import { AdminPage } from './admin/pages/AdminPage';
import { DocumentsPage } from './documents/pages/DocumentsPage';
import { BillUpload } from './components/vendor-bill/BillUpload';
import { BillReview } from './components/vendor-bill/BillReview';
// ... 30+ more page imports
```

**Impact**: Every page's code, dependencies, and transitive imports are bundled into the initial chunk, even if the user only visits the login page.

### 2. Star Import of Lucide Icons

**Problem**: `useIcon.tsx` uses `import * as LucideIcons from 'lucide-react'`

```typescript
// frontend/src/config/useIcon.tsx
import * as LucideIcons from 'lucide-react';  // Pulls in ALL 500+ icons
```

**Impact**: Even though only ~100 icons are used, the entire library is included because the star import defeats tree-shaking.

### 3. Barrel Export Re-exports

**Problem**: `@common/components` barrel export re-exports everything from atoms, molecules, organisms, and templates.

```typescript
// frontend/src/common/components/index.ts
export * from './atoms';
export * from './molecules';
export * from './organisms';
export * from './templates';
```

**Impact**: Any import from `@common/components` potentially pulls in the entire component library.

### 4. Heavy Pages Imported into Entry

The following pages are imported eagerly but should be lazy-loaded:

| Page | Reason for Lazy Loading |
|------|------------------------|
| AdminPage | Heavy - imports 15+ settings sub-pages |
| ReportingPage | Analytics - not needed on first load |
| DocumentsPage | Document management - specialized feature |
| BillUpload/BillReview/BillHistory | Vendor bill workflow - specialized |
| ReviewPage/ReviewCaseDetailPage | Review workflow - specialized |
| TemplateManagerPage | Admin feature |
| ExportsPage | Export feature |
| SalesManagementPage | Sales management tabs |
| All Settings pages | Admin-only features |

### 5. AdminPage Imports All Settings Pages

**Problem**: AdminPage.tsx imports 12+ settings page components directly:

```typescript
// frontend/src/admin/pages/AdminPage.tsx
import { BackupsPage } from './BackupsPage';
import { MyPreferencesPage } from '../../settings/pages/MyPreferencesPage';
import { CompanyStoresPage } from '../../settings/pages/CompanyStoresPage';
import { NetworkPage } from '../../settings/pages/NetworkPage';
// ... 8+ more settings imports
```

**Impact**: All settings pages are bundled even when user only views the admin overview.

## Top 10 Heaviest Contributors (Estimated)

1. **All page components** (~400KB) - 35+ pages imported eagerly
2. **lucide-react full library** (~150KB) - star import
3. **@tanstack/react-query** (~50KB) - necessary, but could be chunked
4. **date-fns** (~30KB) - used in documents/review
5. **zod** (~20KB) - validation library
6. **Settings pages** (~100KB) - 12+ pages in AdminPage
7. **Vendor bill components** (~80KB) - specialized workflow
8. **Review components** (~60KB) - specialized workflow
9. **Common components barrel** (~50KB) - re-exports everything
10. **Form/template components** (~40KB) - admin features

## Optimization Plan

### Phase 1: Route-Level Lazy Loading (Highest ROI)

Convert heavy pages to `React.lazy()` + `Suspense`:

**Target pages for lazy loading:**
- All admin/settings pages
- ReportingPage
- DocumentsPage
- Vendor bill pages (BillUpload, BillReview, BillHistory)
- Review pages
- Template pages
- ExportsPage
- SalesManagementPage

**Keep eager (critical path):**
- LoginPageV2
- HomePage
- SellPage
- LookupPage
- WarehousePage
- CustomersPage
- AppLayout
- Error/Auth components

### Phase 2: Fix Icon Import Anti-Pattern

Replace star import with named imports:

```typescript
// Before
import * as LucideIcons from 'lucide-react';

// After
import { Home, ShoppingCart, Search, ... } from 'lucide-react';
```

### Phase 3: Manual Chunk Strategy

Implement deliberate chunking in vite.config.ts:

```typescript
manualChunks: {
  'react-vendor': ['react', 'react-dom', 'react-router-dom'],
  'ui-vendor': ['lucide-react', 'clsx'],
  'query-vendor': ['@tanstack/react-query'],
  'dates': ['date-fns'],
  'validation': ['zod'],
}
```

### Phase 4: Bundle Budgets

Add CI check to fail if budgets exceeded:

| Budget | Target |
|--------|--------|
| Initial JS (gzip) | < 150 KB |
| Largest chunk (gzip) | < 100 KB |
| Total JS (gzip) | < 400 KB |

## Expected Results

| Metric | Before | Target | Improvement |
|--------|--------|--------|-------------|
| Initial JS (gzip) | 292 KB | < 150 KB | ~50% reduction |
| First load time | ~3s | < 1.5s | ~50% faster |
| Chunk count | 10 | 15-20 | More granular |
| Warning violations | 1 | 0 | Resolved |

## Implementation Status

- [x] Phase 1: Route lazy loading (35+ pages converted to React.lazy)
- [x] Phase 2: Fix icon imports (replaced star import with named imports)
- [x] Phase 3: Manual chunks (deliberate vendor chunking strategy)
- [x] Phase 4: Bundle budgets (check-bundle-budget.js script added)
- [x] Verification: Build passes, no warnings, budgets met

## Changes Made

### 1. Route-Level Lazy Loading (`src/routes/lazyRoutes.tsx`)

Created a new file with lazy-loaded route components:
- 35+ pages converted to `React.lazy()` with `Suspense` fallback
- Critical path pages kept eager: Login, Home, Sell, Lookup, Warehouse, Customers
- Heavy pages lazy-loaded: Admin, Settings, Reporting, Documents, Vendor Bills, Review

### 2. Icon Import Fix (`src/config/useIcon.tsx`)

Replaced anti-pattern:
```typescript
// Before - pulls in ALL 500+ icons
import * as LucideIcons from 'lucide-react';

// After - only imports ~100 used icons
import { Home, ShoppingCart, Search, ... } from 'lucide-react';
```

### 3. Manual Chunk Strategy (`vite.config.ts`)

Implemented deliberate chunking:
- `react-vendor`: React core (rarely changes)
- `router-vendor`: React Router
- `query-vendor`: TanStack Query
- `ui-vendor`: Lucide icons
- `dates-vendor`: date-fns
- `validation-vendor`: Zod
- `utils-vendor`: clsx, tailwind-merge

### 4. Bundle Budget Script (`scripts/check-bundle-budget.js`)

Added CI-ready budget checker:
- Initial JS (gzip): < 100 KB ✅
- Largest chunk (gzip): < 80 KB ✅
- Total JS (gzip): < 500 KB ✅
- CSS (gzip): < 30 KB ✅

Run with: `npm run build:budget`

## Final Bundle Breakdown

Top 10 chunks by gzip size:
1. `index-*.js`: 78 KB (entry)
2. `react-vendor-*.js`: 58 KB
3. `AdminPage-*.js`: 19 KB
4. `validation-vendor-*.js`: 18 KB
5. `index-*.js`: 14 KB (shared)
6. `router-vendor-*.js`: 13 KB
7. `query-vendor-*.js`: 12 KB
8. `ui-vendor-*.js`: 11 KB
9. `SetupWizardPage-*.js`: 10 KB
10. `FormTemplatesPage-*.js`: 8 KB

## Follow-ups (Optional)

1. **AdminPage optimization**: Still 19 KB gzip - could lazy-load internal settings tabs
2. **Prefetch common routes**: Add `<link rel="prefetch">` for dashboard → sell transition
3. **CSS code splitting**: Consider per-route CSS if CSS grows significantly

---

*Generated by bundle audit process. See `dist/stats.html` for interactive visualization.*
