# UI Issues Audit

**Date:** January 30, 2026  
**Status:** Issues Identified - Ready for Implementation

Based on the screenshots provided, the following issues were identified:

---

## Issue 1: Setup Wizard Doesn't Scroll

**Screenshot:** Setup wizard showing "Store & Tax Setup" step, content may be cut off at bottom

**Root Cause:** The CSS has `overflow: hidden` on multiple container elements

**Files to Fix:**

### `frontend/src/admin/pages/SetupWizard.module.css`

| Line | Current | Problem |
|------|---------|---------|
| 154 | `overflow: hidden;` on `.mainContent` | Prevents scrolling |
| 397 | `overflow: hidden;` on `.contentArea` | Prevents scrolling |
| 434 | `overflow: hidden;` on `.card` | Prevents content from expanding |

**Fix:**

```css
/* Line 154 - .mainContent */
.mainContent {
  display: grid;
  grid-template-columns: clamp(200px, 18vw, 260px) 1fr;
  min-height: 0;
  overflow: visible; /* Changed from hidden */
}

/* Line 397 - .contentArea */
.contentArea {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: visible; /* Changed from hidden - let contentScroll handle scrolling */
  flex: 1;
}

/* Line 434 - .card - keep overflow: hidden for visual border-radius clipping */
/* But ensure the card can grow with content */
.card {
  width: 100%;
  min-height: min-content; /* Add this */
  /* ... rest of styles ... */
}
```

**Alternative Fix:** The `.contentScroll` class (lines 401-415) already has `overflow-y: auto`, but it's not being used properly because parent containers have `overflow: hidden`. The content needs to flow into `.contentScroll` for scrolling to work.

---

## Issue 2: "EasySale (Dev)" Shows in Production Build

**Screenshot:** Header shows "EasySale (Dev)" instead of actual store name

**Root Cause:** The `getRuntimeProfile()` function may be returning 'dev' even in production builds

**Files to Check/Fix:**

### `frontend/src/common/utils/demoMode.ts`

```typescript
// Line 32-35 - This determines if we're in production
export function isProductionMode(): boolean {
  const profile = import.meta.env.VITE_RUNTIME_PROFILE;
  return profile === 'prod' || import.meta.env.PROD;
}

// Line 52-58 - This is used to get the runtime profile
export function getRuntimeProfile(): 'dev' | 'demo' | 'prod' {
  const profile = import.meta.env.VITE_RUNTIME_PROFILE;
  
  if (profile === 'demo') return 'demo';
  if (profile === 'prod' || import.meta.env.PROD) return 'prod';
  return 'dev';  // <-- PROBLEM: Falls back to 'dev'
}
```

**Problem:** When running `npm run dev` (even with production-like settings), `import.meta.env.PROD` is `false`, so it returns 'dev'.

### `frontend/src/config/brandConfig.ts`

```typescript
// Lines 59-83 - devBrandConfig is used when profile is 'dev'
export const devBrandConfig: BrandConfig = {
  appName: 'EasySale (Dev)',  // <-- This is what shows
  company: {
    name: 'Demo Store',
    shortName: 'DS',
  },
  // ...
};
```

**Fix Options:**

1. **Option A:** Set `VITE_RUNTIME_PROFILE=prod` in `.env` or build command
2. **Option B:** Modify `getRuntimeProfile()` to check if there's a saved tenant config before defaulting to 'dev'
3. **Option C:** After setup wizard completes, the profile should switch to 'prod'

**Recommended Fix in `ConfigProvider.tsx`:**

```typescript
// After setup wizard completes, update the profile
useEffect(() => {
  // If we have a real tenant config from API or localStorage, use 'prod' profile
  if (config.tenant?.id && config.tenant.id !== 'default-tenant') {
    setProfile('prod');
  }
}, [config.tenant?.id]);
```

---

## Issue 3: Uses admin/admin123 by Default

**Screenshot:** Login page accepts old default credentials

**Root Cause:** Database still has the old admin user created before the setup.rs fix was applied

**This is NOT a code issue** - the code fix was applied:
- `backend/crates/server/src/handlers/setup.rs` now requires password in request body

**Fix:** 
1. Reset the database to trigger fresh setup
2. Or manually update the admin password in the database

**To reset database:**
```bash
# Delete the SQLite database
rm data/pos.db  # or data/easysale.db depending on your config

# Restart the backend - it will run migrations and show setup wizard
```

---

## Issue 4: "FP" Logo in Top Corner

**Screenshot:** Login page shows "FP" instead of actual logo

**Root Cause:** The `LogoBadge` component uses `shortName` as fallback when no favicon/icon is configured

**File:** `frontend/src/auth/pages/LoginPage.tsx`

```typescript
// Lines 54-69 - LogoBadge component
function LogoBadge({ favicon, icon, shortName }: { favicon?: string; icon?: string; shortName: string }) {
  const src = favicon || icon;
  
  if (src) {
    // Show image
  }
  
  // Fallback: show shortName (e.g., "FP", "ES", etc.)
  return (
    <div className="...">
      <span className="text-xl font-bold text-white">{shortName}</span>
    </div>
  );
}
```

**Problem:** 
1. No favicon/icon is configured in the branding
2. `shortName` is coming from somewhere as "FP" (likely old config or localStorage)

**Files to Check:**

### Check localStorage for stale config:
```javascript
// In browser console:
localStorage.getItem('EasySale_config')
localStorage.getItem('EasySale_login_theme_v3')
```

### Check default config:
`frontend/src/config/defaultConfig.ts` should have:
```typescript
branding: {
  company: {
    shortName: 'ES',  // Not 'FP'
    favicon: '/assets/icons/favicon.png',
  }
}
```

**Fix:**
1. Clear localStorage: `localStorage.clear()` in browser console
2. Ensure the correct logo files exist in `frontend/public/assets/`
3. Verify `defaultConfig.ts` has correct branding values

---

## Issue 5: Old Logo on Login Screen

**Screenshot:** Login header shows outdated logo

**Root Cause:** The header logo comes from branding config, but may be using stale cached config

**File:** `frontend/src/auth/pages/LoginPage.tsx`

```typescript
// Lines 270-273
const headerLogo = branding.company.logoDark || branding.company.logo;
const badgeFavicon = branding.company.favicon;
const badgeIcon = branding.company.icon;
```

**Check:**
1. What files exist in `frontend/public/assets/logos/`?
2. What does `branding.company.logo` resolve to?
3. Is there a stale config in localStorage?

**Current logo files in public:**
```
frontend/public/
├── assets/
│   ├── icons/
│   │   ├── favicon.png
│   │   └── icon.png
│   └── logos/
│       └── logo.png
├── brand/test/  (test logos)
├── logo.svg
└── vite.svg
```

**Problem:** The `brandConfig.ts` references paths that don't exist:
- `/assets/logos/easysale-logo-light.png` - DOESN'T EXIST
- `/assets/logos/easysale-logo-dark.png` - DOESN'T EXIST
- `/assets/icons/easysale-favicon.png` - DOESN'T EXIST

Only these exist:
- `/assets/logos/logo.png`
- `/assets/icons/favicon.png`
- `/assets/icons/icon.png`

**Fix `frontend/src/config/brandConfig.ts`:**

```typescript
export const defaultBrandConfig: BrandConfig = {
  // ...
  logo: {
    light: '/assets/logos/logo.png',  // Use actual file
    dark: '/assets/logos/logo.png',   // Use actual file
  },
  favicon: '/assets/icons/favicon.png',  // Use actual file
  // ...
};
```

---

## Quick Fix Checklist

1. [ ] **Clear localStorage** - Run in browser console:
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. [ ] **Fix logo paths in brandConfig.ts** - Update to use actual existing files

3. [ ] **Fix setup wizard scrolling** - Update CSS overflow properties

4. [ ] **Reset database** if needed - Delete pos.db and restart

5. [ ] **Set VITE_RUNTIME_PROFILE=prod** in production builds

---

## Files to Modify

| File | Issue | Priority |
|------|-------|----------|
| `frontend/src/admin/pages/SetupWizard.module.css` | Scrolling | High |
| `frontend/src/config/brandConfig.ts` | Logo paths | High |
| `frontend/src/common/utils/demoMode.ts` | Profile detection | Medium |
| `frontend/src/config/ConfigProvider.tsx` | Profile update after setup | Medium |

---

## Verification Steps

After fixes:
1. Clear browser localStorage
2. Delete database (if testing fresh setup)
3. Run production build: `npm run build:export`
4. Start server and verify:
   - Setup wizard scrolls properly
   - No "(Dev)" in header
   - Logo displays correctly
   - "FP" is replaced with actual logo/icon
