# Component Cleanup - Execution Plan
**Date:** January 10, 2026  
**Status:** Ready to Execute  
**Estimated Time:** 60 minutes  
**Risk Level:** Medium (requires careful execution)

## 📋 Pre-Execution Checklist

Before starting, ensure:

- [ ] All current work is committed to git
- [ ] You have reviewed `CODEBASE_AUDIT_REPORT.md`
- [ ] You have reviewed `IMPORT_MIGRATION_GUIDE.md`
- [ ] You have a backup plan (see below)
- [ ] You have ~60 minutes of uninterrupted time
- [ ] You understand the changes being made

---

## 🎯 Execution Steps

### Step 1: Create Backup (5 min)

```bash
# Commit current state
git add -A
git commit -m "chore: backup before component cleanup"

# Create backup branch
git checkout -b backup-before-cleanup-$(date +%Y%m%d-%H%M%S)
git checkout main  # or your working branch

# Create another working branch for cleanup
git checkout -b cleanup/remove-duplicate-components
```

**Verification:**
```bash
git branch  # Should show backup branch exists
```

---

### Step 2: Delete Old Components (10 min)

#### Option A: Automated (Recommended)
```bash
# Make script executable
chmod +x cleanup-duplicates.sh

# Run cleanup script
./cleanup-duplicates.sh
```

#### Option B: Manual
Delete these files manually:

```bash
# From frontend/src/common/components/
rm Button.tsx Button.stories.tsx
rm Badge.tsx
rm Card.tsx Card.stories.tsx
rm Input.tsx Input.stories.tsx
rm Modal.tsx Modal.stories.tsx
rm Select.tsx Select.stories.tsx
rm Table.tsx Table.stories.tsx
rm Tabs.tsx Tabs.stories.tsx
rm Toast.tsx Toast.stories.tsx

# Delete Storybook examples
rm -rf frontend/src/stories/
```

**Verification:**
```bash
# These should NOT exist
ls frontend/src/common/components/Button.tsx  # Should error
ls frontend/src/stories/  # Should error

# These SHOULD exist
ls frontend/src/common/components/atoms/Button.tsx  # Should succeed
```

---

### Step 3: Update Component Index (5 min)

```bash
# Replace the old index with the new one
cp frontend/src/common/components/index.NEW.ts frontend/src/common/components/index.ts

# Remove the .NEW file
rm frontend/src/common/components/index.NEW.ts
```

**Verification:**
```bash
# Check the file was updated
head -20 frontend/src/common/components/index.ts
# Should show "Unified Design System" comment
```

---

### Step 4: Update App.tsx (5 min)

**File:** `frontend/src/App.tsx`

**Find:**
```typescript
import { ErrorBoundary } from './common/components/ErrorBoundary';
import { ToastProvider } from './common/components/Toast';
import { RequireAuth, RequirePermission } from './common';
```

**Replace with:**
```typescript
import { ErrorBoundary, RequireAuth, RequirePermission } from '@common/components';
import { ToastProvider } from '@common/components/organisms';
```

**Verification:**
```bash
# Check TypeScript compiles
cd frontend
npx tsc --noEmit
# Should show no errors in App.tsx
```

---

### Step 5: Update Admin Feature Imports (20 min)

Update these 8 files in `frontend/src/features/admin/`:

#### 5.1 UsersRolesPage.tsx
**Find:** `import { Tabs } from '../../../common';`  
**Replace:** `import { Tabs } from '@common/components/organisms';`

#### 5.2 UsersTab.tsx
**Find:** `import { Modal, Button } from '../../../common';`  
**Replace:**
```typescript
import { Button } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';
```

#### 5.3 SettingsTable.tsx
**Find:** `import { Button } from '../../../common';`  
**Replace:** `import { Button } from '@common/components/atoms';`

#### 5.4 SettingsPageShell.tsx
**Find:** `import { Input, Button } from '../../../common';`  
**Replace:** `import { Input, Button } from '@common/components/atoms';`

#### 5.5 InlineWarningBanner.tsx
**Find:** `import { Button } from '../../../common';`  
**Replace:** `import { Button } from '@common/components/atoms';`

#### 5.6 FixIssuesWizard.tsx
**Find:** `import { Modal, Button } from '../../../common';`  
**Replace:**
```typescript
import { Button } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';
```

#### 5.7 EntityEditorModal.tsx
**Find:** `import { Modal, Button, Input } from '../../../common';`  
**Replace:**
```typescript
import { Button, Input } from '@common/components/atoms';
import { Modal } from '@common/components/organisms';
```

#### 5.8 BulkActionsBar.tsx
**Find:** `import { Button } from '../../../common';`  
**Replace:** `import { Button } from '@common/components/atoms';`

**Verification:**
```bash
# Check TypeScript compiles
cd frontend
npx tsc --noEmit
# Should show no import errors
```

---

### Step 6: Run Full Verification (15 min)

#### 6.1 TypeScript Check
```bash
cd frontend
npx tsc --noEmit
```
**Expected:** No errors

#### 6.2 Lint Check
```bash
npm run lint
```
**Expected:** No errors or warnings

#### 6.3 Build Check
```bash
npm run build
```
**Expected:** Build succeeds, creates `dist/` folder

#### 6.4 Test Check
```bash
npm run test:run
```
**Expected:** All tests pass

#### 6.5 Storybook Check
```bash
npm run storybook
```
**Expected:** Storybook starts on port 6006, no errors

---

### Step 7: Commit Changes (5 min)

```bash
# Stage all changes
git add -A

# Commit with descriptive message
git commit -m "refactor: remove duplicate components and migrate to atomic design

- Delete old root-level components (Button, Badge, Card, Input, Modal, etc.)
- Delete Storybook example files
- Update component index to export from atomic design structure
- Migrate all imports to use @common path aliases
- Update App.tsx and admin feature imports

BREAKING CHANGE: Component imports must now use atomic design structure
- Atoms: @common/components/atoms
- Molecules: @common/components/molecules
- Organisms: @common/components/organisms

Closes #[issue-number]"

# Push to remote
git push origin cleanup/remove-duplicate-components
```

---

### Step 8: Create Pull Request (5 min)

Create a PR with this description:

```markdown
## 🧹 Component Cleanup - Remove Duplicates

### Summary
This PR removes duplicate component definitions and migrates all imports to use the unified design system (atomic design structure).

### Changes
- ❌ Deleted old root-level components (Button, Badge, Card, Input, Modal, Select, Table, Tabs, Toast)
- ❌ Deleted Storybook example files (`src/stories/`)
- ✅ Updated component index to export from atomic design structure
- ✅ Migrated all imports to use `@common` path aliases
- ✅ Updated 9 files in admin features
- ✅ Updated App.tsx

### Migration Guide
See `IMPORT_MIGRATION_GUIDE.md` for detailed migration instructions.

### Testing
- [x] TypeScript compiles without errors
- [x] ESLint passes with no warnings
- [x] Application builds successfully
- [x] All unit tests pass
- [x] Storybook builds and runs
- [x] No console errors in browser

### Breaking Changes
⚠️ Component imports must now use atomic design structure:
- Atoms: `@common/components/atoms`
- Molecules: `@common/components/molecules`
- Organisms: `@common/components/organisms`

### Rollback Plan
If issues arise, revert to backup branch: `backup-before-cleanup-YYYYMMDD-HHMMSS`

### Related Issues
Closes #[issue-number]
```

---

## 🚨 Rollback Plan

If something goes wrong:

### Option 1: Revert to Backup Branch
```bash
# Switch to backup branch
git checkout backup-before-cleanup-YYYYMMDD-HHMMSS

# Create new branch from backup
git checkout -b restore-from-backup

# Force push to main (if needed)
git push origin restore-from-backup --force
```

### Option 2: Revert Specific Commits
```bash
# Find the commit hash
git log --oneline

# Revert the cleanup commit
git revert <commit-hash>

# Push revert
git push origin main
```

### Option 3: Restore Specific Files
```bash
# Restore component index
git checkout HEAD~1 -- frontend/src/common/components/index.ts

# Restore deleted components
git checkout HEAD~1 -- frontend/src/common/components/Button.tsx
# ... etc
```

---

## ✅ Success Criteria

After completion, verify:

- [ ] No duplicate component definitions exist
- [ ] All imports use `@common` path aliases
- [ ] TypeScript compiles without errors
- [ ] ESLint passes with no warnings
- [ ] Application builds successfully
- [ ] All unit tests pass (100%)
- [ ] Storybook builds and runs
- [ ] No console errors in browser
- [ ] Bundle size is reasonable (check `dist/` folder)
- [ ] All admin features work correctly
- [ ] Example pages work correctly

---

## 📊 Expected Outcomes

### Files Deleted
- 17 old component files
- 1 directory (stories/)
- ~2,000 lines of duplicate code

### Files Modified
- 1 component index file
- 9 admin feature files
- 1 App.tsx file

### Bundle Size Impact
- **Before:** ~XXX KB (measure before starting)
- **After:** ~XXX KB (should be smaller or same)
- **Savings:** Removal of duplicate code

### Maintenance Impact
- ✅ Single source of truth for components
- ✅ Consistent import patterns
- ✅ Easier to find components
- ✅ Better TypeScript support
- ✅ Clearer component hierarchy

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot find module '@common/components'"
**Cause:** Vite not recognizing path aliases  
**Solution:** Restart Vite dev server
```bash
# Stop server (Ctrl+C)
npm run dev  # Restart
```

### Issue 2: TypeScript errors after import changes
**Cause:** TypeScript server cache  
**Solution:** Restart TypeScript server
- VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"

### Issue 3: Storybook fails to start
**Cause:** Storybook cache  
**Solution:** Clear Storybook cache
```bash
rm -rf node_modules/.cache/storybook
npm run storybook
```

### Issue 4: Tests fail after migration
**Cause:** Test imports not updated  
**Solution:** Check test files for old imports
```bash
grep -r "from '../../../common'" frontend/src/**/*.test.tsx
```

---

## 📝 Post-Cleanup Tasks

After successful cleanup:

1. **Update Documentation**
   - [ ] Update README.md with new import patterns
   - [ ] Update CONTRIBUTING.md with component guidelines
   - [ ] Archive this cleanup plan

2. **Team Communication**
   - [ ] Notify team of breaking changes
   - [ ] Share IMPORT_MIGRATION_GUIDE.md
   - [ ] Schedule code review

3. **Monitoring**
   - [ ] Monitor for any runtime errors
   - [ ] Check bundle size in production
   - [ ] Verify all features work correctly

4. **Cleanup**
   - [ ] Delete backup branch (after 1 week)
   - [ ] Archive audit reports
   - [ ] Update project documentation

---

## 📞 Support

If you encounter issues:

1. **Check the guides:**
   - `CODEBASE_AUDIT_REPORT.md` - Detailed analysis
   - `IMPORT_MIGRATION_GUIDE.md` - Import patterns
   - This file - Execution steps

2. **Rollback if needed:**
   - Use backup branch
   - Revert commits
   - Restore specific files

3. **Ask for help:**
   - Create an issue with error details
   - Include TypeScript/build errors
   - Share what step failed

---

**Prepared by:** Kiro AI Assistant  
**Last Updated:** January 10, 2026  
**Status:** Ready for Execution  
**Priority:** HIGH
