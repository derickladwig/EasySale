# Import Migration Guide
**Purpose:** Update all imports to use the new atomic design structure  
**Estimated Time:** 15-20 minutes

## Quick Reference

### Old Pattern (❌ Remove)
```typescript
import { Button, Modal, Input } from '../../../common';
import { Tabs } from '../../../common';
```

### New Pattern (✅ Use)
```typescript
import { Button, Input } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';
import { Tabs } from '@common/components/organisms';
```

---

## Component Location Map

Use this table to find where each component lives in the new structure:

| Component | Old Location | New Location | Import Path |
|-----------|-------------|--------------|-------------|
| **Button** | `common/components/Button` | `atoms/Button` | `@common/components/atoms` |
| **Input** | `common/components/Input` | `atoms/Input` | `@common/components/atoms` |
| **Badge** | `common/components/Badge` | `atoms/Badge` | `@common/components/atoms` |
| **Icon** | N/A (new) | `atoms/Icon` | `@common/components/atoms` |
| **StatusIndicator** | N/A (new) | `atoms/StatusIndicator` | `@common/components/atoms` |
| **FormField** | N/A (new) | `molecules/FormField` | `@common/components/molecules` |
| **FormGroup** | N/A (new) | `molecules/FormGroup` | `@common/components/molecules` |
| **SearchBar** | N/A (new) | `molecules/SearchBar` | `@common/components/molecules` |
| **Card** | `common/components/Card` | `organisms/Card` | `@common/components/organisms` |
| **DataTable** | N/A (new) | `organisms/DataTable` | `@common/components/organisms` |
| **Modal** | `common/components/Modal` | `organisms/Modal` | `@common/components/organisms` |
| **Toast** | `common/components/Toast` | `organisms/Toast` | `@common/components/organisms` |
| **ToastProvider** | `common/components/Toast` | `organisms/Toast` | `@common/components/organisms` |
| **Alert** | N/A (new) | `organisms/Alert` | `@common/components/organisms` |
| **Tabs** | `common/components/Tabs` | `organisms/Tabs` | `@common/components/organisms` |
| **Breadcrumbs** | N/A (new) | `organisms/Breadcrumbs` | `@common/components/organisms` |
| **Sidebar** | N/A (new) | `organisms/Sidebar` | `@common/components/organisms` |
| **TopBar** | N/A (new) | `organisms/TopBar` | `@common/components/organisms` |
| **BottomNav** | N/A (new) | `organisms/BottomNav` | `@common/components/organisms` |
| **PageHeader** | N/A (new) | `organisms/PageHeader` | `@common/components/organisms` |
| **Panel** | N/A (new) | `organisms/Panel` | `@common/components/organisms` |
| **StatCard** | N/A (new) | `organisms/StatCard` | `@common/components/organisms` |
| **LoadingSpinner** | N/A (new) | `organisms/LoadingSpinner` | `@common/components/organisms` |
| **EmptyState** | N/A (new) | `organisms/EmptyState` | `@common/components/organisms` |
| **ErrorBoundary** | `common/components/ErrorBoundary` | `components/ErrorBoundary` | `@common/components` |
| **RequireAuth** | `common/components/RequireAuth` | `components/RequireAuth` | `@common/components` |
| **RequirePermission** | `common/components/RequirePermission` | `components/RequirePermission` | `@common/components` |
| **Navigation** | `common/components/Navigation` | `components/Navigation` | `@common/components` |

---

## Files to Update

### 1. App.tsx
**File:** `frontend/src/App.tsx`

**Current:**
```typescript
import { ErrorBoundary } from './common/components/ErrorBoundary';
import { ToastProvider } from './common/components/Toast';
import { RequireAuth, RequirePermission } from './common';
```

**Updated:**
```typescript
import { ErrorBoundary, RequireAuth, RequirePermission } from '@common/components';
import { ToastProvider } from '@common/components/organisms';
```

---

### 2. Admin Feature Files

#### UsersRolesPage.tsx
**File:** `frontend/src/features/admin/pages/UsersRolesPage.tsx`

**Current:**
```typescript
import { Tabs } from '../../../common';
```

**Updated:**
```typescript
import { Tabs } from '@common/components/organisms';
```

---

#### UsersTab.tsx
**File:** `frontend/src/features/admin/components/UsersTab.tsx`

**Current:**
```typescript
import { Modal, Button } from '../../../common';
```

**Updated:**
```typescript
import { Button } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';
```

---

#### SettingsTable.tsx
**File:** `frontend/src/features/admin/components/SettingsTable.tsx`

**Current:**
```typescript
import { Button } from '../../../common';
```

**Updated:**
```typescript
import { Button } from '@common/components/atoms';
```

---

#### SettingsPageShell.tsx
**File:** `frontend/src/features/admin/components/SettingsPageShell.tsx`

**Current:**
```typescript
import { Input, Button } from '../../../common';
```

**Updated:**
```typescript
import { Input, Button } from '@common/components/atoms';
```

---

#### InlineWarningBanner.tsx
**File:** `frontend/src/features/admin/components/InlineWarningBanner.tsx`

**Current:**
```typescript
import { Button } from '../../../common';
```

**Updated:**
```typescript
import { Button } from '@common/components/atoms';
```

---

#### FixIssuesWizard.tsx
**File:** `frontend/src/features/admin/components/FixIssuesWizard.tsx`

**Current:**
```typescript
import { Modal, Button } from '../../../common';
```

**Updated:**
```typescript
import { Button } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';
```

---

#### EntityEditorModal.tsx
**File:** `frontend/src/features/admin/components/EntityEditorModal.tsx`

**Current:**
```typescript
import { Modal, Button, Input } from '../../../common';
```

**Updated:**
```typescript
import { Button, Input } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';
```

---

#### BulkActionsBar.tsx
**File:** `frontend/src/features/admin/components/BulkActionsBar.tsx`

**Current:**
```typescript
import { Button } from '../../../common';
```

**Updated:**
```typescript
import { Button } from '@common/components/atoms';
```

---

## Automated Find & Replace

You can use these regex patterns for automated replacement:

### Pattern 1: Replace common imports
**Find:**
```regex
import\s*{\s*([^}]+)\s*}\s*from\s*['"]\.\.\/\.\.\/\.\.\/common['"];?
```

**Replace:** (manual - depends on which components)
```typescript
import { Button, Input } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';
```

### Pattern 2: Replace ErrorBoundary imports
**Find:**
```regex
import\s*{\s*ErrorBoundary\s*}\s*from\s*['"]\.\/common\/components\/ErrorBoundary['"];?
```

**Replace:**
```typescript
import { ErrorBoundary } from '@common/components';
```

### Pattern 3: Replace Toast imports
**Find:**
```regex
import\s*{\s*ToastProvider\s*}\s*from\s*['"]\.\/common\/components\/Toast['"];?
```

**Replace:**
```typescript
import { ToastProvider } from '@common/components/organisms';
```

---

## Verification Steps

After updating imports:

1. **TypeScript Check**
   ```bash
   cd frontend
   npx tsc --noEmit
   ```
   Should show no errors.

2. **Lint Check**
   ```bash
   npm run lint
   ```
   Should pass with no warnings.

3. **Build Check**
   ```bash
   npm run build
   ```
   Should complete successfully.

4. **Test Check**
   ```bash
   npm run test
   ```
   All tests should pass.

5. **Storybook Check**
   ```bash
   npm run storybook
   ```
   Should start without errors.

---

## Common Issues & Solutions

### Issue 1: "Cannot find module '@common/components'"
**Solution:** Make sure Vite is configured with path aliases. Check `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@common': path.resolve(__dirname, './src/common'),
      '@features': path.resolve(__dirname, './src/features'),
      '@domains': path.resolve(__dirname, './src/domains'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
});
```

### Issue 2: "Module has no exported member 'X'"
**Solution:** Check the component location map above. The component might have moved to a different level (atoms/molecules/organisms).

### Issue 3: TypeScript errors after import changes
**Solution:** Restart your TypeScript server:
- VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
- Or restart your IDE

---

## Testing Checklist

After migration, verify:

- [ ] All TypeScript errors resolved
- [ ] All ESLint warnings resolved
- [ ] Application builds successfully
- [ ] All unit tests pass
- [ ] Storybook builds and runs
- [ ] No console errors in browser
- [ ] Components render correctly
- [ ] No duplicate component warnings

---

## Rollback Plan

If issues arise:

1. **Revert to backup branch:**
   ```bash
   git checkout backup-before-cleanup-YYYYMMDD-HHMMSS
   ```

2. **Or revert specific commits:**
   ```bash
   git log --oneline  # Find commit hash
   git revert <commit-hash>
   ```

3. **Or restore specific files:**
   ```bash
   git checkout HEAD~1 -- frontend/src/common/components/index.ts
   ```

---

## Success Criteria

✅ All imports use `@common/components` path alias  
✅ No relative imports like `'../../../common'`  
✅ Components imported from correct atomic level  
✅ TypeScript compiles without errors  
✅ All tests pass  
✅ Application builds successfully  
✅ Storybook works correctly  

---

**Estimated Time:** 15-20 minutes  
**Difficulty:** Medium  
**Risk Level:** Low (if done carefully with testing)
