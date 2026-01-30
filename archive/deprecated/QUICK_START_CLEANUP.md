# Quick Start - Component Cleanup

**⏱️ Time Required:** 60 minutes  
**🎯 Goal:** Remove duplicate components, establish single source of truth  
**📊 Difficulty:** Medium

---

## 🚀 TL;DR

You have duplicate components. This guide will help you remove them safely.

**What's wrong:**
- 17 components exist in 2 places (old + new)
- Imports are inconsistent
- Storybook examples are cluttering the codebase

**What we'll do:**
- Delete old components
- Update imports to use new components
- Clean up Storybook examples
- Verify everything still works

---

## ⚡ Quick Start (For the Impatient)

If you trust the process and want to move fast:

```bash
# 1. Backup
git checkout -b cleanup/remove-duplicates
git add -A && git commit -m "backup before cleanup"

# 2. Run automated cleanup
chmod +x cleanup-duplicates.sh
./cleanup-duplicates.sh

# 3. Update component index
cp frontend/src/common/components/index.NEW.ts frontend/src/common/components/index.ts

# 4. Update imports (see IMPORT_MIGRATION_GUIDE.md for details)
# ... manual step, takes 20 minutes ...

# 5. Verify
cd frontend
npm run build && npm run test && npm run lint

# 6. Commit
git add -A
git commit -m "refactor: remove duplicate components"
git push origin cleanup/remove-duplicates
```

**⚠️ Warning:** Step 4 requires manual updates. Don't skip it!

---

## 📚 Detailed Guides (For the Careful)

### If you want to understand everything:
1. **Read:** `AUDIT_SUMMARY.md` (5 min)
2. **Read:** `CODEBASE_AUDIT_REPORT.md` (10 min)
3. **Execute:** `CLEANUP_EXECUTION_PLAN.md` (60 min)

### If you just want to fix imports:
1. **Read:** `IMPORT_MIGRATION_GUIDE.md` (5 min)
2. **Execute:** Update 9 files (20 min)

### If you want to see the problem visually:
1. **Read:** `COMPONENT_STRUCTURE_DIAGRAM.md` (5 min)

---

## 🎯 What Gets Deleted

### Old Components (17 files)
```
frontend/src/common/components/
├── Button.tsx ❌
├── Button.stories.tsx ❌
├── Badge.tsx ❌
├── Card.tsx ❌
├── Card.stories.tsx ❌
├── Input.tsx ❌
├── Input.stories.tsx ❌
├── Modal.tsx ❌
├── Modal.stories.tsx ❌
├── Select.tsx ❌
├── Select.stories.tsx ❌
├── Table.tsx ❌
├── Table.stories.tsx ❌
├── Tabs.tsx ❌
├── Tabs.stories.tsx ❌
├── Toast.tsx ❌
└── Toast.stories.tsx ❌
```

### Storybook Examples (8 files)
```
frontend/src/stories/ ❌ (entire directory)
```

### What Stays
```
frontend/src/common/components/
├── atoms/ ✅ (all files)
├── molecules/ ✅ (all files)
├── organisms/ ✅ (all files)
├── templates/ ✅ (all files)
├── ErrorBoundary.tsx ✅
├── Navigation.tsx ✅
├── RequireAuth.tsx ✅
└── RequirePermission.tsx ✅
```

---

## 🔧 What Gets Updated

### Files to Modify (10 files)

1. `frontend/src/common/components/index.ts` - Update exports
2. `frontend/src/App.tsx` - Update imports
3. `frontend/src/features/admin/pages/UsersRolesPage.tsx` - Update imports
4. `frontend/src/features/admin/components/UsersTab.tsx` - Update imports
5. `frontend/src/features/admin/components/SettingsTable.tsx` - Update imports
6. `frontend/src/features/admin/components/SettingsPageShell.tsx` - Update imports
7. `frontend/src/features/admin/components/InlineWarningBanner.tsx` - Update imports
8. `frontend/src/features/admin/components/FixIssuesWizard.tsx` - Update imports
9. `frontend/src/features/admin/components/EntityEditorModal.tsx` - Update imports
10. `frontend/src/features/admin/components/BulkActionsBar.tsx` - Update imports

---

## ✅ Verification Checklist

After each step, verify:

```bash
# TypeScript compiles
cd frontend
npx tsc --noEmit
# ✅ Should show no errors

# Linter passes
npm run lint
# ✅ Should show no warnings

# Tests pass
npm run test:run
# ✅ All tests should pass

# Build succeeds
npm run build
# ✅ Should create dist/ folder

# Storybook works
npm run storybook
# ✅ Should start on port 6006
```

---

## 🆘 If Something Goes Wrong

### Quick Rollback
```bash
# Go back to before cleanup
git checkout main  # or your original branch
git branch -D cleanup/remove-duplicates
```

### Restore Specific Files
```bash
# Restore component index
git checkout HEAD~1 -- frontend/src/common/components/index.ts

# Restore a deleted component
git checkout HEAD~1 -- frontend/src/common/components/Button.tsx
```

### Get Help
1. Check `CLEANUP_EXECUTION_PLAN.md` - Common Issues section
2. Check `IMPORT_MIGRATION_GUIDE.md` - Troubleshooting section
3. Create an issue with error details

---

## 📊 Progress Tracker

Use this to track your progress:

```
Phase 1: Preparation
[ ] Read audit summary
[ ] Understand what will change
[ ] Clean git state
[ ] Create backup branch

Phase 2: Deletion
[ ] Delete old components (17 files)
[ ] Delete Storybook examples (1 directory)
[ ] Verify files are gone

Phase 3: Updates
[ ] Update component index
[ ] Update App.tsx imports
[ ] Update admin feature imports (8 files)
[ ] Verify TypeScript compiles

Phase 4: Verification
[ ] TypeScript check passes
[ ] Lint check passes
[ ] Build succeeds
[ ] Tests pass
[ ] Storybook works

Phase 5: Completion
[ ] Commit changes
[ ] Push to remote
[ ] Create PR
[ ] Notify team
```

---

## 🎓 Learning Outcomes

After completing this cleanup, you'll have:

✅ **Single source of truth** for all components  
✅ **Consistent import patterns** across the codebase  
✅ **Atomic design structure** as the standard  
✅ **Cleaner codebase** with less technical debt  
✅ **Better developer experience** for future work  

---

## 💡 Pro Tips

1. **Do it in one sitting** - Don't leave it half-done
2. **Test after each phase** - Catch issues early
3. **Use the automated script** - Saves time on deletion
4. **Follow the import guide** - Don't guess import paths
5. **Commit frequently** - Easy to rollback if needed

---

## 📞 Need Help?

**Quick questions:**
- Check `IMPORT_MIGRATION_GUIDE.md` for import patterns
- Check `COMPONENT_STRUCTURE_DIAGRAM.md` for visual reference

**Detailed help:**
- Read `CODEBASE_AUDIT_REPORT.md` for technical details
- Read `CLEANUP_EXECUTION_PLAN.md` for step-by-step guide

**Stuck?**
- Create an issue with:
  - What step you're on
  - What error you're seeing
  - What you've tried

---

## 🎯 Success Criteria

You're done when:

✅ No duplicate component files exist  
✅ All imports use `@common/components` path  
✅ TypeScript compiles without errors  
✅ All tests pass  
✅ Build succeeds  
✅ Storybook works  
✅ No console errors  

---

**Ready?** Start with `CLEANUP_EXECUTION_PLAN.md`

**Not sure?** Read `AUDIT_SUMMARY.md` first

**Want visuals?** Check `COMPONENT_STRUCTURE_DIAGRAM.md`

---

**Good luck! You've got this! 🚀**
