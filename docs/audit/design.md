# Design Document — EasySale UI Audit & Fix

**Generated**: 2026-01-27
**Reference**: docs/audit/plan.md, docs/audit/tasks.md

---

## Problem Statement

The EasySale frontend has several issues that prevent proper operation:

1. **API Wiring Mismatches**: 10 frontend API calls target wrong or non-existent endpoints
2. **Theme Violations**: 11 hardcoded colors bypass the design token system
3. **Type Errors**: 89 TypeScript errors (mostly in tests, 2 in production code)
4. **Stub Features**: Export functionality returns placeholders

These issues cause:
- Settings pages fail to save
- Categories don't load
- Theme doesn't apply consistently
- TypeScript compilation fails

---

## Solution Architecture

### Principle: Minimal, Safe Changes

We will NOT:
- Refactor the entire API layer
- Rewrite the theme system
- Change the navigation structure
- Add new features

We WILL:
- Fix specific API paths (4 files)
- Add error handling for missing endpoints (4 files)
- Fix 2 TypeScript errors in production code
- Replace 5 hardcoded colors with CSS variables

### API Path Corrections

```
BEFORE                          AFTER
────────────────────────────────────────────────────────────────
/api/sync/settings           → /api/settings/network
/api/sync/test-connection    → /api/integrations/{platform}/test
/api/users/profile           → /api/settings/preferences
/api/categories              → /api/product/categories
```

### Error Handling Pattern

For endpoints that don't exist yet, we add graceful degradation:

```typescript
// Pattern: Try-catch with fallback
const fetchWithFallback = async <T>(
  url: string,
  fallback: T,
  options?: RequestInit
): Promise<T> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      console.warn(`Endpoint ${url} returned ${response.status}`);
      return fallback;
    }
    return await response.json();
  } catch (error) {
    console.warn(`Endpoint ${url} not available:`, error);
    return fallback;
  }
};
```

### Theme Token Pattern

For hardcoded colors, we use CSS variables with fallbacks:

```typescript
// Pattern: CSS variable with fallback
style={{ backgroundColor: 'var(--color-bg-primary, #0f172a)' }}
```

This ensures:
1. Theme colors apply when CSS variables are loaded
2. Fallback colors work if variables aren't loaded yet
3. No visual regression

---

## File Changes Summary

### P0 Changes (8 files)

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| NetworkPage.tsx | API path fix | 2 |
| MyPreferencesPage.tsx | API path fix | 1 |
| CategoryManagement.tsx | API path fix | 1 |
| CompanyInfoEditor.tsx | Error handling | ~10 |
| ReviewQueue.tsx | Error handling | ~10 |
| OfflineModeConfiguration.tsx | Error handling | ~10 |
| StoreThemeConfig.tsx | Type fix | ~5 |
| ThemeEngine.ts | Type fix | ~5 |

### P1 Changes (3 files)

| File | Change Type | Lines Changed |
|------|-------------|---------------|
| BackgroundRenderer.tsx | CSS variable | 3 |
| UserPreferencesExample.tsx | CSS variable | 2 |
| Card.test.tsx | Test assertion | 4 |

---

## Risk Mitigation

### Risk: API Path Changes Break Other Features

**Mitigation**: 
- Each path change is isolated to one file
- Backend endpoints are verified to exist
- Changes are exact string replacements

### Risk: Type Fixes Cause Runtime Errors

**Mitigation**:
- Run app after each type fix
- Type fixes are additive (adding properties, not removing)
- Test affected pages manually

### Risk: Theme Changes Affect Login Flow

**Mitigation**:
- CSS variables have fallback values
- Test login flow specifically
- Changes are in fallback/error paths only

---

## Testing Strategy

### Unit Testing
- Not adding new tests
- Fixing existing test assertions (Card.test.tsx)

### Integration Testing
- Manual navigation to all routes
- Verify no console errors
- Verify no network 404s

### Visual Testing
- Verify theme applies to login page
- Verify theme persists across navigation
- Test light/dark mode toggle

---

## Rollback Plan

All changes are isolated to specific files. To rollback:

1. Identify the problematic change
2. Revert the specific file
3. Re-run verification tests

No database migrations or backend changes required.

---

## Success Metrics

### Quantitative
- 0 TypeScript errors in production code
- 0 404 errors for wired features
- 0 unhandled promise rejections
- 35/35 routes render successfully

### Qualitative
- Settings pages save successfully
- Categories load on admin page
- Theme applies consistently
- User sees friendly errors for missing features

---

## Implementation Order

```
Day 1 (P0):
1. Fix API paths (P0-1, P0-2, P0-3)
2. Add error handling (P0-4, P0-5, P0-6)
3. Fix type errors (P0-7, P0-8)
4. Run verification tests

Day 2 (P1):
1. Replace hardcoded colors (P1-1, P1-2)
2. Update test assertions (P1-3)
3. Run theme consistency check

Day 3 (Verification):
1. Route smoke test
2. API smoke test
3. Theme consistency check
4. Document any remaining issues
```

---

## Dependencies

### Required for Testing
- Backend running on localhost:8923
- Database with test data
- Frontend dev server on localhost:7945

### No External Dependencies
- No new npm packages
- No backend changes required
- No database migrations
