# Theming, Branding, and CSS Audit Report

**Date:** January 30, 2026  
**Status:** P0 Complete, P1 Complete, P2 Complete  
**Priority:** High (Affects white-label capability and UX consistency)

---

## Executive Summary

This audit identified **200+ issues** across the codebase related to:
- Hardcoded colors outside the theme system
- Missing dark mode support
- Hardcoded brand names ("EasySale")
- Inconsistent theming approaches

### P0 Fixes Applied (2026-01-30)

| Issue | File | Status |
|-------|------|--------|
| LoginPage hardcoded colors | `LoginPage.tsx` | ✅ Fixed - Uses `--login-*` CSS vars |
| Hardcoded "EasySale" brand | Multiple wizard files | ✅ Fixed - Uses `brandConfig` |
| BrandingSettingsPage TODO | `BrandingSettingsPage.tsx` | ✅ Fixed - Uses `useConfig()` |
| ErrorBoundary no dark mode | `ErrorBoundary.tsx` | ✅ Fixed - Uses semantic tokens |

### P1 Fixes Applied (2026-01-30)

| Issue | File | Status |
|-------|------|--------|
| SetupWizard.module.css rgba | `SetupWizard.module.css` | ✅ Fixed - Uses CSS variables |
| ThemeToggle missing | `LoginPage.tsx` | ✅ Fixed - Added ThemeToggle component |
| Status color tokens | `tokens.css` | ✅ Fixed - Added full 50-900 scales |

### P2 Fixes Applied (2026-01-30)

| Issue | File | Status |
|-------|------|--------|
| NetworkStepContent colors | `NetworkStepContent.tsx` | ✅ Fixed - Uses semantic tokens |
| BackupsPage colors | `BackupsPage.tsx` | ✅ Fixed - Uses semantic tokens |
| ScopeBadge colors | `ScopeBadge.tsx` | ✅ Fixed - Uses semantic tokens |
| ThemeEngine getCurrentTheme | `ThemeEngine.ts` | ✅ Fixed - Reads CSS variables |
| DataManagerPage colors | `DataManagerPage.tsx` | ✅ Fixed - Uses semantic tokens |
| IntegrationLogsDrawer colors | `IntegrationLogsDrawer.tsx` | ✅ Fixed - Uses semantic tokens |
| ReviewPage colors | `ReviewPage.tsx` | ✅ Fixed - Uses semantic tokens |
| FlagChips colors | `FlagChips.tsx` | ✅ Fixed - Uses semantic tokens |
| NavItem StatusBadge colors | `NavItem.tsx` | ✅ Fixed - Uses semantic tokens |
| NavGroup colors | `NavGroup.tsx` | ✅ Fixed - Uses semantic tokens |
| ComingSoonModal colors | `ComingSoonModal.tsx` | ✅ Fixed - Uses semantic tokens |
| PageTabs colors | `PageTabs.tsx` | ✅ Fixed - Uses semantic tokens |
| nav/NavItem colors | `nav/components/NavItem.tsx` | ✅ Fixed - Uses semantic tokens |
| RouteGuard colors | `RouteGuard.tsx` | ✅ Fixed - Uses semantic tokens |
| StatsCards colors | `StatsCards.tsx` | ✅ Fixed - Uses semantic tokens |
| VariantManager colors | `VariantManager.tsx` | ✅ Fixed - Uses semantic tokens |
| BillUpload colors | `BillUpload.tsx` | ✅ Fixed - Uses semantic tokens |
| TemplateEditor colors | `TemplateEditor.tsx` | ✅ Fixed - Uses semantic tokens |
| VendorMappings colors | `VendorMappings.tsx` | ✅ Fixed - Uses semantic tokens |
| BillHistory colors | `BillHistory.tsx` | ✅ Fixed - Uses semantic tokens |
| DocumentTable colors | `DocumentTable.tsx` | ✅ Fixed - Uses semantic tokens |
| ProductForm colors | `ProductForm.tsx` | ✅ Fixed - Uses semantic tokens |
| ProductGrid colors | `ProductGrid.tsx` | ✅ Fixed - Uses semantic tokens |
| LoyaltyTab colors | `LoyaltyTab.tsx` | ✅ Fixed - Uses semantic tokens |

---

## Issue Categories

### Category 1: Hardcoded Colors (50+ instances)

#### Critical: LoginPage.tsx
**File:** `frontend/src/auth/pages/LoginPage.tsx`

| Line | Issue | Current | Should Be |
|------|-------|---------|-----------|
| 272 | Background gradient | `from-[#0a1929] via-[#0d2137] to-[#0f2942]` | CSS variable |
| 477-500 | Inline rgba styles | `rgba(15, 30, 50, 0.8)`, etc. | CSS variables |
| 520 | Error fallback | `bg-[#0a1929]` | `bg-background` |

#### Critical: SetupWizard.module.css
**File:** `frontend/src/admin/pages/SetupWizard.module.css`

| Line | Issue | Current | Should Be |
|------|-------|---------|-----------|
| 301-302 | Warning badge | `rgba(245, 166, 35, 0.12)` | `var(--color-warning-100)` |
| 306 | White overlay | `rgba(255, 255, 255, 0.05)` | `var(--color-surface-overlay)` |
| 432-433 | Shadow colors | `rgba(0, 0, 0, 0.2)` | `var(--shadow-md)` |
| 907-908 | Warning footer | `rgba(245, 166, 35, 0.08)` | `var(--color-warning-50)` |

#### Medium: BrandingSettingsPage.tsx
**File:** `frontend/src/admin/pages/BrandingSettingsPage.tsx`

| Line | Issue | Current | Should Be |
|------|-------|---------|-----------|
| 315 | Default accent | `#0756d9` | Config value |
| 325 | Custom hex default | `#0756d9` | Config value |
| 340 | Fallback accent | `#0756d9` | Config value |
| 571, 591 | Fallback gray | `#888888` | `var(--color-text-muted)` |

#### Medium: ThemeEngine.ts
**File:** `frontend/src/theme/ThemeEngine.ts`

| Line | Issue | Current | Should Be |
|------|-------|---------|-----------|
| 66-67 | Default theme | `#14b8a6`, `#0d9488` | Read from config |
| 80-81 | Reconstructed theme | Hardcoded teal | Read from CSS vars |
| 359-360 | getCurrentTheme | Hardcoded colors | CSS variable values |

---

### Category 2: Tailwind Color Utilities (100+ instances)

Components using raw Tailwind colors instead of semantic tokens:

#### ErrorBoundary.tsx
**File:** `frontend/src/common/components/ErrorBoundary.tsx`

```tsx
// Lines 76, 79-80, 83-84, 89-90, 103
bg-gray-50, bg-red-100, text-red-600, text-gray-900, text-gray-600
bg-gray-50, border-gray-200, text-gray-700, bg-gray-200, bg-gray-300
```

**Fix:** Replace with `bg-surface`, `bg-error-100`, `text-error`, `text-primary`, `text-secondary`

#### LoginPage.tsx
**File:** `frontend/src/auth/pages/LoginPage.tsx`

```tsx
// Multiple lines
bg-slate-800/50, text-slate-400, text-slate-300, text-slate-200
bg-yellow-400, bg-green-400, bg-red-400
text-red-400, border-red-500/20, bg-red-500/10
border-slate-600, bg-slate-700/50, text-blue-500
bg-blue-500, bg-blue-600
```

**Fix:** Use `--login-*` CSS variables or semantic tokens

#### ScopeBadge.tsx
**File:** `frontend/src/common/components/atoms/ScopeBadge.tsx`

```tsx
// Lines 21, 26, 31
bg-green-500/20, text-green-400, border-green-500/30
bg-purple-500/20, text-purple-400, border-purple-500/30
bg-orange-500/20, text-orange-400, border-orange-500/30
```

**Fix:** Create scope-specific semantic tokens

#### BackupsPage.tsx
**File:** `frontend/src/admin/pages/BackupsPage.tsx`

```tsx
// Multiple lines
text-green-500, text-purple-500, text-green-400, text-red-400
text-red-300, text-yellow-400, bg-red-900/20, border-red-700
text-green-500, text-red-500, text-yellow-500
```

**Fix:** Use `text-success`, `text-error`, `text-warning` semantic tokens

#### NetworkStepContent.tsx
**File:** `frontend/src/admin/components/wizard/NetworkStepContent.tsx`

```tsx
// Lines 200-219, 257, 358-362, 396-397
bg-blue-50 dark:bg-blue-900/20, border-blue-200 dark:border-blue-800
text-blue-600 dark:text-blue-400, text-blue-800 dark:text-blue-200
bg-amber-50 dark:bg-amber-900/20, bg-green-100 dark:bg-green-900/30
text-green-700 dark:text-green-400, bg-red-50 dark:bg-red-900/20
```

**Fix:** Use semantic alert/status tokens

#### Other Components with Issues

| Component | File | Issue Count |
|-----------|------|-------------|
| SettingsSearch.tsx | `frontend/src/admin/components/` | 6 |
| PermissionMatrix.tsx | `frontend/src/admin/components/` | 10 |
| EffectiveSettingsView.tsx | `frontend/src/admin/components/` | 6 |
| SettingsPageShell.tsx | `frontend/src/admin/components/` | 6 |
| ReceiptsPage.tsx | `frontend/src/admin/pages/` | 4 |
| DynamicCategoryForm.tsx | `frontend/src/common/components/` | 9 |
| Toggle.tsx | `frontend/src/common/components/atoms/` | 2 |

---

### Category 3: Missing Dark Mode Support (15+ components)

Components with no `dark:` variants or semantic token usage:

| Component | File | Impact |
|-----------|------|--------|
| ErrorBoundary.tsx | `frontend/src/common/components/` | High - Error pages look broken in dark mode |
| LoginPage.tsx | `frontend/src/auth/pages/` | High - Login unusable in dark mode |
| ScopeBadge.tsx | `frontend/src/common/components/atoms/` | Medium |
| BackupsPage.tsx | `frontend/src/admin/pages/` | Medium |
| SettingsSearch.tsx | `frontend/src/admin/components/` | Low |
| PermissionMatrix.tsx | `frontend/src/admin/components/` | Low |
| EffectiveSettingsView.tsx | `frontend/src/admin/components/` | Low |
| SettingsPageShell.tsx | `frontend/src/admin/components/` | Low |

---

### Category 4: Hardcoded Brand Names (4+ instances)

#### SetupWizardPage.tsx
**File:** `frontend/src/admin/pages/SetupWizardPage.tsx`

| Line | Current | Should Be |
|------|---------|-----------|
| 348 | `'Welcome to EasySale'` | `brandConfig.company.name` |

#### WizardCompletionScreen.tsx
**File:** `frontend/src/admin/components/wizard/WizardCompletionScreen.tsx`

| Line | Current | Should Be |
|------|---------|-----------|
| 50 | `'Welcome to EasySale!'` | `brandConfig.company.name` |

#### StoreStepContent.tsx
**File:** `frontend/src/admin/components/wizard/StoreStepContent.tsx`

| Line | Current | Should Be |
|------|---------|-----------|
| 163 | `placeholder="EasySale Store"` | `placeholder="Your Store Name"` |

#### IntegrationsStepContent.tsx
**File:** `frontend/src/admin/components/wizard/IntegrationsStepContent.tsx`

| Line | Current | Should Be |
|------|---------|-----------|
| 282 | `'...authorize EasySale to access...'` | `brandConfig.appName` |

#### BrandingSettingsPage.tsx
**File:** `frontend/src/admin/pages/BrandingSettingsPage.tsx`

| Line | Current | Should Be |
|------|---------|-----------|
| 446 | `const companyName = 'EasySale'; // TODO` | `useConfig().branding.company.name` |

#### defaultConfig.ts
**File:** `frontend/src/config/defaultConfig.ts`

| Line | Current | Should Be |
|------|---------|-----------|
| 14-15 | `name: 'EasySale'` | `name: 'Your Company'` |
| 21 | `name: 'EasySale'` | `name: 'Your Store'` |
| 30 | `'Welcome to EasySale'` | `'Welcome'` |

#### brandConfig.ts
**File:** `frontend/src/config/brandConfig.ts`

| Line | Current | Should Be |
|------|---------|-----------|
| 23 | `appName: 'EasySale'` | Configurable |
| 27 | `name: 'EasySale'` | Configurable |

---

### Category 5: Missing Theme Toggle on Login

**Issue:** Users cannot switch themes before logging in.

**Current State:**
- `LoginThemeProvider` exists and provides theme system
- No UI to switch themes/presets on login page
- Users stuck with default theme until authenticated

**Recommendation:**
Add a theme toggle button to login page footer or header:

```tsx
// In LoginPage.tsx footer
<button onClick={toggleTheme}>
  {isDark ? <Sun /> : <Moon />}
</button>
```

---

### Category 6: Config Integration Gaps

#### BrandingSettingsPage.tsx Line 446
**Current:**
```tsx
const companyName = 'EasySale'; // TODO: Get from config
```

**Fix:**
```tsx
import { useConfig } from '@config/ConfigProvider';
const { branding, brandConfig } = useConfig();
const companyName = branding?.company?.name || brandConfig?.company?.name || 'Your Company';
```

#### ThemeEngine.ts getCurrentTheme()
**Issue:** Reconstructs theme with hardcoded values instead of reading CSS variables.

**Fix:** Read actual CSS variable values:
```typescript
getCurrentTheme(): ThemeConfig {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  return {
    accent: {
      500: style.getPropertyValue('--color-primary-500').trim(),
      600: style.getPropertyValue('--color-primary-600').trim(),
    },
    // ...
  };
}
```

---

## Priority Fix List

### P0 - Critical (Blocks white-label) — ✅ COMPLETED

| # | Issue | File | Lines | Status |
|---|-------|------|-------|--------|
| 1 | LoginPage hardcoded colors | `LoginPage.tsx` | 50+ | ✅ Fixed |
| 2 | Hardcoded "EasySale" brand | Multiple | 10+ | ✅ Fixed |
| 3 | BrandingSettingsPage TODO | `BrandingSettingsPage.tsx` | 446 | ✅ Fixed |

### P1 - High (Degrades UX)

| # | Issue | File | Lines | Status |
|---|-------|------|-------|--------|
| 4 | ErrorBoundary no dark mode | `ErrorBoundary.tsx` | 76-103 | ✅ Fixed |
| 5 | SetupWizard hardcoded colors | `SetupWizard.module.css` | 6 | ✅ Fixed |
| 6 | Missing theme toggle on login | `LoginPage.tsx` | - | ✅ Fixed |

### P2 - Medium (Inconsistent)

| # | Issue | File | Lines | Effort |
|---|-------|------|-------|--------|
| 7 | NetworkStepContent colors | `NetworkStepContent.tsx` | 15+ | Medium |
| 8 | BackupsPage colors | `BackupsPage.tsx` | 10+ | Medium |
| 9 | ScopeBadge no dark mode | `ScopeBadge.tsx` | 3 | Low |
| 10 | ThemeEngine hardcoded defaults | `ThemeEngine.ts` | 6 | Medium |

### P3 - Low (Cleanup)

| # | Issue | File | Lines | Effort |
|---|-------|------|-------|--------|
| 11 | SettingsSearch colors | `SettingsSearch.tsx` | 6 | Low |
| 12 | PermissionMatrix colors | `PermissionMatrix.tsx` | 10 | Low |
| 13 | EffectiveSettingsView colors | `EffectiveSettingsView.tsx` | 6 | Low |
| 14 | SettingsPageShell colors | `SettingsPageShell.tsx` | 6 | Low |
| 15 | defaultConfig brand names | `defaultConfig.ts` | 4 | Low |

---

## Recommended Semantic Token Additions

Add to `frontend/src/styles/tokens.css`:

```css
:root {
  /* Status colors - additional variants */
  --color-success-50: #f0fdf4;
  --color-success-100: #dcfce7;
  --color-success-400: #4ade80;
  --color-success-600: #16a34a;
  
  --color-warning-50: #fffbeb;
  --color-warning-100: #fef3c7;
  --color-warning-400: #fbbf24;
  --color-warning-600: #d97706;
  
  --color-error-50: #fef2f2;
  --color-error-100: #fee2e2;
  --color-error-400: #f87171;
  --color-error-600: #dc2626;
  
  --color-info-50: #eff6ff;
  --color-info-100: #dbeafe;
  --color-info-400: #60a5fa;
  --color-info-600: #2563eb;
  
  /* Scope badge colors */
  --color-scope-global-bg: var(--color-success-500) / 0.2;
  --color-scope-global-text: var(--color-success-400);
  --color-scope-store-bg: var(--color-purple-500) / 0.2;
  --color-scope-store-text: var(--color-purple-400);
  --color-scope-user-bg: var(--color-warning-500) / 0.2;
  --color-scope-user-text: var(--color-warning-400);
}
```

---

## Files Requiring Changes

| File | Change Type | Priority |
|------|-------------|----------|
| `frontend/src/auth/pages/LoginPage.tsx` | Major refactor | P0 |
| `frontend/src/admin/pages/BrandingSettingsPage.tsx` | Fix TODO | P0 |
| `frontend/src/admin/pages/SetupWizardPage.tsx` | Replace brand name | P0 |
| `frontend/src/admin/components/wizard/*.tsx` | Replace brand names | P0 |
| `frontend/src/common/components/ErrorBoundary.tsx` | Add dark mode | P1 |
| `frontend/src/admin/pages/SetupWizard.module.css` | Use CSS vars | P1 |
| `frontend/src/admin/components/wizard/NetworkStepContent.tsx` | Use tokens | P2 |
| `frontend/src/admin/pages/BackupsPage.tsx` | Use tokens | P2 |
| `frontend/src/common/components/atoms/ScopeBadge.tsx` | Add dark mode | P2 |
| `frontend/src/theme/ThemeEngine.ts` | Fix getCurrentTheme | P2 |
| `frontend/src/config/defaultConfig.ts` | Neutral defaults | P3 |
| `frontend/src/config/brandConfig.ts` | Neutral defaults | P3 |
| `frontend/src/styles/tokens.css` | Add status tokens | P1 |

---

## Summary

| Category | Issue Count | Priority |
|----------|-------------|----------|
| Hardcoded colors | 50+ | P0-P2 |
| Tailwind color utilities | 100+ | P2-P3 |
| Missing dark mode | 15+ | P1-P2 |
| Hardcoded brand names | 10+ | P0 |
| Missing theme toggle | 1 | P1 |
| Config integration gaps | 3 | P0-P2 |

**Total estimated effort:** 3-5 days for full remediation

---

## Implementation Roadmap (Step-by-Step)

### Phase 1: Add Theme Toggle to Login (P1 #6)

**Goal:** Allow users to switch dark/light theme before logging in.

#### Step 1.1: Create ThemeToggle Component
**File to create:** `frontend/src/common/components/atoms/ThemeToggle.tsx`

```tsx
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@config/ThemeProvider';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`p-2 rounded-lg transition-colors hover:bg-surface-elevated ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-text-secondary" />
      ) : (
        <Moon className="w-5 h-5 text-text-secondary" />
      )}
    </button>
  );
}
```

#### Step 1.2: Add to LoginPage Footer
**File to modify:** `frontend/src/auth/pages/LoginPage.tsx`

Find the footer section (around line 459) and add:

```tsx
import { ThemeToggle } from '@common/components/atoms/ThemeToggle';

// In the footer JSX:
<footer className="...">
  <div className="flex items-center justify-between">
    <span className="text-text-tertiary text-sm">
      © 2026 {brandConfig?.company?.name || 'Your Company'}
    </span>
    <ThemeToggle />
  </div>
</footer>
```

#### Step 1.3: Ensure ThemeProvider Wraps Login
**File to check:** `frontend/src/App.tsx`

Make sure `ThemeProvider` wraps the login route:

```tsx
<ThemeProvider>
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    {/* ... */}
  </Routes>
</ThemeProvider>
```

---

### Phase 2: Fix NetworkStepContent Colors (P2 #7)

**Goal:** Replace hardcoded Tailwind colors with semantic tokens.

**File:** `frontend/src/admin/components/wizard/NetworkStepContent.tsx`

#### Step 2.1: Create Alert Variants
Replace hardcoded info/warning/success/error boxes with a reusable pattern:

```tsx
// Define alert styles at top of file
const alertStyles = {
  info: 'bg-info-50 dark:bg-info-900/20 border-info-200 dark:border-info-800 text-info-800 dark:text-info-200',
  warning: 'bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800 text-warning-800 dark:text-warning-200',
  success: 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800 text-success-800 dark:text-success-200',
  error: 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800 text-error-800 dark:text-error-200',
};
```

#### Step 2.2: Replace Each Instance

**Lines 200-210 (Info box):**
```tsx
// Before:
className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"

// After:
className={`border ${alertStyles.info}`}
```

**Lines 215-225 (Warning box):**
```tsx
// Before:
className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"

// After:
className={`border ${alertStyles.warning}`}
```

**Lines 358-367 (Warning box):**
Same pattern as above.

**Lines 396-398 (Error box):**
```tsx
// Before:
className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"

// After:
className={`border ${alertStyles.error}`}
```

---

### Phase 3: Fix BackupsPage Colors (P2 #8)

**Goal:** Replace status colors with semantic tokens.

**File:** `frontend/src/admin/pages/BackupsPage.tsx`

#### Step 3.1: Create Status Color Map

```tsx
const statusColors = {
  success: 'text-success-500 dark:text-success-400',
  error: 'text-error-500 dark:text-error-400',
  warning: 'text-warning-500 dark:text-warning-400',
  info: 'text-info-500 dark:text-info-400',
};
```

#### Step 3.2: Replace Each Instance

Search and replace:
- `text-green-500` → `text-success-500 dark:text-success-400`
- `text-green-400` → `text-success-400`
- `text-red-500` → `text-error-500 dark:text-error-400`
- `text-red-400` → `text-error-400`
- `text-red-300` → `text-error-300`
- `text-yellow-500` → `text-warning-500 dark:text-warning-400`
- `text-yellow-400` → `text-warning-400`
- `text-purple-500` → `text-purple-500 dark:text-purple-400`
- `bg-red-900/20` → `bg-error-900/20`
- `border-red-700` → `border-error-700`

---

### Phase 4: Fix ScopeBadge Dark Mode (P2 #9)

**Goal:** Add dark mode support to scope badges.

**File:** `frontend/src/common/components/atoms/ScopeBadge.tsx`

#### Step 4.1: Update Badge Styles

```tsx
const scopeStyles = {
  global: 'bg-success-500/20 text-success-600 dark:text-success-400 border-success-500/30',
  store: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30',
  user: 'bg-warning-500/20 text-warning-600 dark:text-warning-400 border-warning-500/30',
};
```

---

### Phase 5: Fix ThemeEngine (P2 #10)

**Goal:** Read theme from CSS variables instead of hardcoded values.

**File:** `frontend/src/theme/ThemeEngine.ts`

#### Step 5.1: Update getCurrentTheme Method

```typescript
getCurrentTheme(): ThemeConfig {
  if (typeof window === 'undefined') {
    return ThemeEngine.DEFAULT_THEME;
  }
  
  const root = document.documentElement;
  const style = getComputedStyle(root);
  
  const getVar = (name: string, fallback: string) => 
    style.getPropertyValue(name).trim() || fallback;
  
  return {
    accent: {
      500: getVar('--color-primary-500', '#14b8a6'),
      600: getVar('--color-primary-600', '#0d9488'),
    },
    background: {
      primary: getVar('--color-background', '#0a0a0a'),
      secondary: getVar('--color-surface', '#171717'),
    },
    // ... continue for other properties
  };
}
```

---

### Phase 6: Add Semantic Tokens to tokens.css (P1)

**Goal:** Add missing status color variants.

**File:** `frontend/src/styles/tokens.css`

#### Step 6.1: Add Status Color Variants

Add these to the `:root` section:

```css
/* Status colors - full scale */
--color-success-50: #f0fdf4;
--color-success-100: #dcfce7;
--color-success-200: #bbf7d0;
--color-success-300: #86efac;
--color-success-400: #4ade80;
--color-success-500: #22c55e;
--color-success-600: #16a34a;
--color-success-700: #15803d;
--color-success-800: #166534;
--color-success-900: #14532d;

--color-warning-50: #fffbeb;
--color-warning-100: #fef3c7;
--color-warning-200: #fde68a;
--color-warning-300: #fcd34d;
--color-warning-400: #fbbf24;
--color-warning-500: #f59e0b;
--color-warning-600: #d97706;
--color-warning-700: #b45309;
--color-warning-800: #92400e;
--color-warning-900: #78350f;

--color-error-50: #fef2f2;
--color-error-100: #fee2e2;
--color-error-200: #fecaca;
--color-error-300: #fca5a5;
--color-error-400: #f87171;
--color-error-500: #ef4444;
--color-error-600: #dc2626;
--color-error-700: #b91c1c;
--color-error-800: #991b1b;
--color-error-900: #7f1d1d;

--color-info-50: #eff6ff;
--color-info-100: #dbeafe;
--color-info-200: #bfdbfe;
--color-info-300: #93c5fd;
--color-info-400: #60a5fa;
--color-info-500: #3b82f6;
--color-info-600: #2563eb;
--color-info-700: #1d4ed8;
--color-info-800: #1e40af;
--color-info-900: #1e3a8a;
```

---

### Phase 7: P3 Cleanup (Optional)

#### 7.1: SettingsSearch.tsx, PermissionMatrix.tsx, etc.

Apply the same pattern as Phase 3 - replace Tailwind colors with semantic tokens.

#### 7.2: defaultConfig.ts and brandConfig.ts

Replace hardcoded "EasySale" with neutral placeholders:

```typescript
// defaultConfig.ts
company: {
  name: 'Your Company',  // was 'EasySale'
  slug: 'your-company',  // was 'EasySale'
},
store: {
  name: 'Your Store',    // was 'EasySale'
},
login: {
  message: 'Welcome',    // was 'Welcome to EasySale'
},
```

---

## Quick Reference: Find & Replace Commands

For bulk fixes, use these regex patterns in VS Code:

### Replace Tailwind Status Colors
```
Find: text-green-(\d+)
Replace: text-success-$1 dark:text-success-$1

Find: text-red-(\d+)
Replace: text-error-$1 dark:text-error-$1

Find: text-yellow-(\d+)
Replace: text-warning-$1 dark:text-warning-$1

Find: bg-green-(\d+)
Replace: bg-success-$1 dark:bg-success-$1

Find: bg-red-(\d+)
Replace: bg-error-$1 dark:bg-error-$1

Find: bg-yellow-(\d+)
Replace: bg-warning-$1 dark:bg-warning-$1
```

### Find Hardcoded Brand Names
```
Find: EasySale
(Review each match - some are intentional in comments/docs)
```

---

## Verification Checklist

After each phase, verify:

- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No lint errors (`npm run lint`)
- [ ] Dark mode looks correct (toggle in browser dev tools)
- [ ] Light mode looks correct
- [ ] No hardcoded colors visible in browser inspector
- [ ] Brand name shows correctly from config

---

*Last Updated: 2026-01-30*
