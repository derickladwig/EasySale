# Master Plan — EasySale UI Audit & Fix

**Generated**: 2026-01-27
**Scope**: Fix all non-working UI and false-positive "wired" features
**Approach**: Evidence-based, minimal changes, prioritized by impact

---

## Executive Summary

### Current State
- **Routes**: 35 total, 30 OK, 3 PARTIAL, 2 STUBBED
- **API Mismatches**: 10 critical (P0)
- **Theme Violations**: 11 hardcoded colors (3 in production code)
- **TypeScript Errors**: 89 (mostly in test files)

### Goals
1. Fix all P0 API wiring issues (navigation + data load)
2. Fix P1 theme/layout consistency issues
3. Ensure every route renders without crashing
4. Ensure every page with data fetches successfully or shows graceful empty state

---

## Priority Matrix

### P0 — Breaks Navigation / Data (CRITICAL)

| ID | Issue | Files | Impact |
|----|-------|-------|--------|
| P0-1 | NetworkPage calls wrong API endpoints | NetworkPage.tsx | Settings save fails |
| P0-2 | MyPreferencesPage calls wrong API endpoints | MyPreferencesPage.tsx | Preferences save fails |
| P0-3 | CategoryManagement calls wrong API endpoint | CategoryManagement.tsx | Categories don't load |
| P0-4 | CompanyInfoEditor calls missing endpoints | CompanyInfoEditor.tsx | Company info doesn't save |
| P0-5 | ReviewQueue calls missing endpoint | ReviewQueue.tsx | Queue stats don't load |
| P0-6 | OfflineModeConfiguration calls missing endpoint | OfflineModeConfiguration.tsx | Clear queue fails |
| P0-7 | StoreThemeConfig type error | StoreThemeConfig.tsx | Settings page may crash |
| P0-8 | ThemeEngine ColorScale type error | ThemeEngine.ts | Theme may not apply |

### P1 — Visual Inconsistencies (MEDIUM)

| ID | Issue | Files | Impact |
|----|-------|-------|--------|
| P1-1 | BackgroundRenderer hardcoded colors | BackgroundRenderer.tsx | Theme not applied to login |
| P1-2 | UserPreferencesExample hardcoded colors | UserPreferencesExample.tsx | Example doesn't follow theme |
| P1-3 | Card.test.tsx hardcoded assertions | Card.test.tsx | Tests may fail |

### P2 — Polish (LOW)

| ID | Issue | Files | Impact |
|----|-------|-------|--------|
| P2-1 | Property test type mismatches | *.property.test.ts | Tests fail |
| P2-2 | Legacy quarantine broken imports | legacy_quarantine/*.tsx | Dead code |
| P2-3 | FormTemplatesPage placeholder | FormTemplatesPage.tsx | Feature incomplete |
| P2-4 | Receipt templates placeholder | AdminPage.tsx | Feature incomplete |
| P2-5 | Export functionality stubs | reporting.rs, data_management.rs | Feature incomplete |

---

## Implementation Phases

### Phase 1: P0 Fixes (Day 1)

**Goal**: All routes render, all API calls succeed or show graceful error

#### 1.1 Fix Frontend API Paths (4 files)

```
NetworkPage.tsx:53      /api/sync/settings → /api/settings/network
NetworkPage.tsx:75      /api/sync/test-connection → /api/integrations/{platform}/test
MyPreferencesPage.tsx:44 /api/users/profile → /api/settings/preferences
CategoryManagement.tsx:27 /api/categories → /api/product/categories
```

#### 1.2 Add Graceful Error Handling (4 files)

For endpoints that don't exist yet, add try/catch with user-visible error:
- CompanyInfoEditor.tsx (company info, logo upload)
- ReviewQueue.tsx (queue stats)
- OfflineModeConfiguration.tsx (clear queue)
- hooks.ts (remote stores)

#### 1.3 Fix TypeScript Errors (2 files)

```
StoreThemeConfig.tsx:48  Fix ThemeColors type assignment
ThemeEngine.ts:65,79     Remove '950' from ColorScale or update type
```

### Phase 2: P1 Fixes (Day 2)

**Goal**: Theme consistency across all pages

#### 2.1 Replace Hardcoded Colors (2 files)

```
BackgroundRenderer.tsx:47,60,112  Replace #0f172a, #000 with CSS variables
UserPreferencesExample.tsx:114,125 Replace #666 with var(--color-text-secondary)
```

#### 2.2 Update Test Assertions (1 file)

```
Card.test.tsx:43,45,52,61  Replace bg-[#1e293b] with semantic class
```

### Phase 3: Verification (Day 3)

**Goal**: Prove all fixes work

#### 3.1 Route Smoke Test
- Programmatically navigate all routes
- Assert no runtime errors
- Assert no console errors

#### 3.2 API Smoke Test
- For each page with data, verify request succeeds or graceful empty state
- Check network tab for 404s, 500s

#### 3.3 Theme Consistency Check
- Verify no hex colors in app code (except token definitions)
- Verify theme survives navigation/reload

---

## Success Criteria

### P0 Complete When:
- [ ] All 35 routes render without crashing
- [ ] No 404 errors in network tab for wired features
- [ ] TypeScript compiles without errors in production code
- [ ] Settings pages save successfully

### P1 Complete When:
- [ ] Login page uses theme colors (no hardcoded fallbacks visible)
- [ ] All pages use CSS variables for colors
- [ ] Theme persists across navigation

### P2 Complete When:
- [ ] All tests pass
- [ ] No dead code in src/ (legacy_quarantine excluded)
- [ ] Export functionality implemented (or clearly marked as "coming soon" in UI)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| API path changes break other features | Low | High | Test each change in isolation |
| Type fixes cause runtime errors | Low | Medium | Run app after each fix |
| Theme changes affect login flow | Medium | Low | Test login flow specifically |
| Missing backend endpoints | High | Medium | Add graceful error handling first |

---

## Dependencies

### External Dependencies
- Backend must be running for API tests
- Database must have test data for some pages

### Internal Dependencies
- P0-7 (StoreThemeConfig) blocks settings page testing
- P0-8 (ThemeEngine) blocks theme testing
- P1-1 (BackgroundRenderer) depends on P0-8

---

## Rollback Plan

If fixes cause regressions:
1. Revert specific file changes
2. Re-run verification tests
3. Document regression for future fix

All changes are isolated to specific files, making rollback straightforward.
