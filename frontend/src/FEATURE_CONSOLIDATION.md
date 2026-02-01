# Feature Consolidation Plan

This document tracks the planned consolidation of scattered features into the `features/` directory.

## Current State

Some features exist both at root level and in `features/`:
- `reporting/` (root) and `features/reporting/` 
- `review/` (root) and `features/review/`
- `exports/` (root) and `features/exports/`
- `templates/` (root only)

## Consolidation Strategy

### Phase 1: Re-exports (Current)

Features in `features/` re-export from root-level implementations:

```typescript
// features/reporting/pages/ReportingPage.tsx
export { ReportingPage } from '../../../reporting/pages/ReportingPage';
```

This allows gradual migration without breaking imports.

### Phase 2: Full Migration (Future)

When ready to fully migrate:

1. Move implementation from root to `features/`
2. Update all imports to use `@features/` path
3. Remove root-level directories

### Features to Consolidate

| Root Feature | Target | Status |
|--------------|--------|--------|
| `reporting/` | `features/reporting/` | Re-export in place |
| `review/` | `features/review/` | Re-export in place |
| `exports/` | `features/exports/` | Re-export in place |
| `templates/` | `features/templates/` | Not started |
| `documents/` | `features/documents/` | Not started |
| `forms/` | `features/forms/` | Not started |

### Features to Keep at Root (Critical Path)

These features are always loaded and should stay at root:

- `admin/` - Admin panel
- `sell/` - POS checkout
- `customers/` - Customer management
- `inventory/` - Inventory management
- `auth/` - Authentication
- `settings/` - Settings pages

## Migration Checklist

When migrating a feature:

- [ ] Create feature structure in `features/`
- [ ] Move components, hooks, pages
- [ ] Update all imports
- [ ] Update lazy routes
- [ ] Update feature flags
- [ ] Test build variants
- [ ] Remove root-level directory

## Notes

- Do not break existing imports
- Maintain backward compatibility
- Test all build variants after migration
- Update `ARCHITECTURE.md` when complete
