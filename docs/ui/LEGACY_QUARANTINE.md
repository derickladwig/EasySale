# Legacy Quarantine Documentation

## Overview

Following the NO DELETES policy, legacy code is quarantined rather than removed. This document tracks what was moved, why, and its replacement.

## Quarantine Location

All quarantined code is located in:
```
frontend/src/legacy_quarantine/
├── components/
├── styles/
└── pages/
```

## Quarantined Items

### Navigation Components

| Old Path | New Path | Reason | Replacement |
|----------|----------|--------|-------------|
| `src/components/Navigation.tsx` (legacy) | `src/legacy_quarantine/components/Navigation.tsx` | Duplicate navigation causing multiple sidebars | `src/common/components/Navigation.tsx` |
| `src/components/Sidebar.tsx` (legacy blue) | `src/legacy_quarantine/components/Sidebar.tsx` | Legacy blue gradient styling | `AppLayout` sidebar |

### Styles

| Old Path | New Path | Reason | Replacement |
|----------|----------|--------|-------------|
| Legacy blue gradient CSS | `src/legacy_quarantine/styles/` | Hardcoded colors, not using design tokens | Token-based Navigation.module.css |

### Pages

| Old Path | New Path | Reason | Replacement |
|----------|----------|--------|-------------|
| Old settings pages | `src/legacy_quarantine/pages/` | Scattered settings, not in Admin structure | Admin sub-routes |

## Quarantine Rules

1. **Never delete** - Move to quarantine instead
2. **Document the move** - Add entry to this file
3. **Update imports** - Ensure no active code imports from quarantine
4. **Property test** - `no-legacy-imports.property.test.ts` verifies no imports

## Verification

The property test `Property 4: No Legacy Components in Active Tree` ensures:
- No imports from `legacy_quarantine` directory
- No legacy navigation components in render tree
- All active code uses canonical components

## How to Quarantine

1. Move file to appropriate `legacy_quarantine/` subdirectory
2. Add entry to this document with:
   - Old path
   - New path
   - Reason for quarantine
   - Replacement component/file
3. Update any imports (should be none if properly isolated)
4. Run property tests to verify

## Requirements Validated

- **4.2**: Legacy pages moved to quarantine, not deleted
- **13.2**: Quarantine documented with what, why, and replacement
- **13.4**: Old path → new path mapping documented
