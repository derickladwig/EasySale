# Legacy Quarantine Directory

**Created:** 2026-01-26
**Last Updated:** 2026-01-26
**Purpose:** Store quarantined legacy components that have been replaced

## Policy

This directory follows the **NO DELETES** policy. Legacy code is moved here rather than deleted to:
1. Preserve history and allow rollback if needed
2. Document what was replaced and why
3. Prevent accidental re-introduction of legacy patterns

## Contents

### Components

| File | Original Location | Reason | Replacement | Quarantined |
|------|-------------------|--------|-------------|-------------|
| `components/Navigation.tsx` | `common/components/Navigation.tsx` | Duplicate navigation system | AppLayout sidebar | 2026-01-26 |

### Styles

| File | Original Location | Reason | Replacement | Quarantined |
|------|-------------------|--------|-------------|-------------|
| `styles/Navigation.module.css` | `common/components/Navigation.module.css` | Styles for quarantined component | Tailwind in AppLayout | 2026-01-26 |

### Config

| File | Original Location | Reason | Replacement | Quarantined |
|------|-------------------|--------|-------------|-------------|
| `config/navigation.ts` | `common/config/navigation.ts` | Hardcoded nav items | Tenant config (`config.navigation.main`) | 2026-01-26 |

### Tests

| File | Original Location | Reason | Replacement | Quarantined |
|------|-------------------|--------|-------------|-------------|
| `components/__tests__/Navigation.test.tsx` | `common/components/__tests__/Navigation.test.tsx` | Tests for quarantined component | AppLayout tests | 2026-01-26 |
| `components/__tests__/Navigation.integration.test.tsx` | `common/components/__tests__/Navigation.integration.test.tsx` | Integration tests for quarantined component | AppLayout integration tests | 2026-01-26 |
| `components/Navigation.property.test.tsx` | `common/components/Navigation.property.test.tsx` | Property tests for quarantined component | AppLayout property tests | 2026-01-26 |

### Stories

| File | Original Location | Reason | Replacement | Quarantined |
|------|-------------------|--------|-------------|-------------|
| `components/Navigation.stories.tsx` | `common/components/Navigation.stories.tsx` | Stories for quarantined component | AppLayout stories | 2026-01-26 |

### Routes

| File | Original Location | Reason | Replacement | Quarantined |
|------|-------------------|--------|-------------|-------------|
| `routes/SettingsRouter.tsx` | `features/settings/SettingsRouter.tsx` | Old /settings/* routing structure | Routes in App.tsx under /admin/* | 2026-01-26 |

### Pages

| File | Original Location | Reason | Replacement | Quarantined |
|------|-------------------|--------|-------------|-------------|
| `pages/SettingsPage.tsx` | `features/settings/pages/SettingsPage.tsx` | Old unified settings landing page | AdminPage at /admin with AdminLayout | 2026-01-26 |
| `pages/SettingsPage.test.tsx` | `features/settings/pages/SettingsPage.test.tsx` | Tests for quarantined SettingsPage | AdminPage tests | 2026-01-26 |

### Auth Pages (In-Place Quarantine)

These files are quarantined in-place with deprecation headers and skipped tests:

| File | Location | Reason | Replacement | Quarantined |
|------|----------|--------|-------------|-------------|
| `LoginPage.tsx` | `auth/pages/LoginPage.tsx` | Complex, over-engineered | LoginPageV2.tsx | 2026-01-29 |
| `LoginPage.test.tsx` | `auth/pages/LoginPage.test.tsx` | Tests for deprecated LoginPage | Tests skipped | 2026-01-29 |
| `LoginPage.integration.test.tsx` | `auth/pages/LoginPage.integration.test.tsx` | Integration tests for deprecated LoginPage | Tests skipped | 2026-01-29 |

### Features Re-exports (In-Place Quarantine)

All features/ re-exports have been marked deprecated. Active code now imports directly from top-level directories:

| Directory | Replacement | Quarantined |
|-----------|-------------|-------------|
| `features/admin/` | `src/admin/` | 2026-01-29 |
| `features/auth/` | `src/auth/` | 2026-01-29 |
| `features/review/` | `src/review/` | 2026-01-29 |
| `features/setup/` | `src/setup/` | 2026-01-29 |
| `features/warehouse/` | `src/inventory/` | 2026-01-29 |
| `features/inventory/` | `src/inventory/` | 2026-01-29 |
| `features/lookup/` | `src/lookup/` | 2026-01-29 |
| `features/customers/` | `src/customers/` | 2026-01-29 |
| `features/reporting/` | `src/reporting/` | 2026-01-29 |
| `features/exports/` | `src/exports/` | 2026-01-29 |
| `features/preferences/` | `src/preferences/` | 2026-01-29 |

## CSS Analysis

### No Legacy Blue Gradient Found

The Navigation.module.css was analyzed for legacy blue gradient patterns:
- `linear-gradient.*blue` - No matches
- `#1e3a5f` (dark navy) - No matches
- `navy` - No matches

The CSS already uses design tokens:
- `var(--color-surface-2)` for hover
- `var(--color-surface-3)` for active
- `var(--color-accent)` for active text
- `var(--color-text-primary)` for text

**Conclusion:** The "legacy blue" appearance was from visual confusion of seeing TWO sidebars, not from hardcoded blue colors.

## Rules

1. **DO NOT import from this directory** in active code
2. **DO NOT delete files** from this directory
3. **DO document** the reason for quarantine in this README
4. **DO update** the mapping table when adding new files

## Verification

Run this command to verify no imports from legacy_quarantine:

```bash
# PowerShell
Get-ChildItem -Path frontend/src -Recurse -Include *.tsx,*.ts -Exclude *legacy_quarantine* | Select-String -Pattern "from.*legacy_quarantine" | Select-Object -First 20

# Bash
grep -r "from.*legacy_quarantine" --include="*.tsx" --include="*.ts" \
  --exclude-dir=legacy_quarantine \
  --exclude-dir=node_modules \
  frontend/src/
```

Expected result: 0 matches (only comments/documentation should reference the directory)

## Migration Notes

The original files at their source locations have been updated with:
1. **Deprecation notices** pointing to the quarantine location
2. **Tests are skipped** using `describe.skip()` to prevent CI failures
3. **Stories moved to Legacy/** category in Storybook

The quarantined versions preserve the original implementation for reference and rollback capability.

## Active Code Status

As of 2026-01-29:
- ✅ No active imports from legacy_quarantine directory
- ✅ All page imports of Navigation are commented out (SellPage, HomePage)
- ✅ Tests are skipped with `describe.skip()`
- ✅ Stories moved to `Legacy/Navigation (Quarantined)` category
- ✅ Original files have deprecation notices
- ✅ LoginPage.tsx marked deprecated, re-exported as LoginPageV2 for backward compatibility
- ✅ LoginPage tests skipped (42 tests)
- ✅ All features/ re-exports marked as deprecated (imports updated to direct paths)
- ✅ No active imports from features/admin, features/auth, features/review, features/setup
