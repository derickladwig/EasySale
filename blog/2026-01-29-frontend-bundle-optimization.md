# Frontend Bundle Optimization: 75% Size Reduction

**Date**: 2026-01-29

## The Problem

The frontend production build was generating a main entry chunk of 1.2 MB (292 KB gzip), triggering Vite's chunk size warning. For a POS application where fast first-load is critical, this was unacceptable.

## Root Causes Identified

1. **No route-level code splitting**: All 35+ page components were imported eagerly in App.tsx
2. **Star import anti-pattern**: `import * as LucideIcons from 'lucide-react'` pulled in 500+ icons
3. **Minimal vendor chunking**: Only basic react-vendor and ui-vendor chunks defined

## Solution Implemented

### Route-Level Lazy Loading

Created `src/routes/lazyRoutes.tsx` with React.lazy() wrappers for heavy pages:
- Admin, Settings, Reporting, Documents, Vendor Bills, Review pages all lazy-loaded
- Critical path pages (Login, Home, Sell, Lookup, Warehouse, Customers) kept eager
- Custom loading fallback component for consistent UX

### Icon Import Fix

Replaced the star import with explicit named imports for only the ~100 icons actually used. This enables proper tree-shaking.

### Deliberate Chunk Strategy

Implemented a function-based manualChunks configuration:
- `react-vendor`: React core (stable, cache long-term)
- `router-vendor`: React Router
- `query-vendor`: TanStack Query
- `dates-vendor`: date-fns
- `validation-vendor`: Zod
- `ui-vendor`: Lucide icons
- `utils-vendor`: clsx, tailwind-merge

### Bundle Budget Enforcement

Added `scripts/check-bundle-budget.js` to fail CI if budgets exceeded:
- Initial JS (gzip): < 100 KB
- Largest chunk (gzip): < 80 KB
- Total JS (gzip): < 500 KB
- CSS (gzip): < 30 KB

## Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Main entry (raw) | 1,206 KB | 298 KB | 75% reduction |
| Main entry (gzip) | 292 KB | 78 KB | 73% reduction |
| Warnings | 1 | 0 | Resolved |

The initial page load is now significantly faster, and heavy features like Admin, Reporting, and Document management are only loaded when needed.

## Files Changed

- `frontend/src/routes/lazyRoutes.tsx` (new)
- `frontend/src/App.tsx` (updated imports)
- `frontend/src/config/useIcon.tsx` (fixed star import)
- `frontend/vite.config.ts` (enhanced manualChunks)
- `frontend/scripts/check-bundle-budget.js` (new)
- `frontend/docs/perf/bundle-audit.md` (new)
