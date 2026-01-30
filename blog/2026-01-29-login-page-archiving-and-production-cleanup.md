# Login Page Archiving and Production Cleanup

**Date:** 2026-01-29

## Summary

Completed archiving of old LoginPage component, features/ re-exports cleanup, and production readiness improvements following the NO DELETES policy.

## Changes Made

### LoginPage Archiving

1. **Marked LoginPage.tsx as deprecated** - Added quarantine header pointing to LoginPageV2 as replacement
2. **Updated index.ts re-export** - LoginPage now re-exports LoginPageV2 for backward compatibility
3. **Skipped old tests** - Both `LoginPage.test.tsx` and `LoginPage.integration.test.tsx` now use `describe.skip()` (42 tests skipped)
4. **Fixed unused variable** - Removed unused `config` destructuring from useLoginTheme hook

### Features/ Re-exports Cleanup

Updated all imports from `features/` to use direct paths and marked all re-exports as deprecated:

1. **Updated active imports:**
   - `documents/hooks/useDocuments.ts` → imports from `review/hooks/useReviewApi`
   - `components/review/GuidedReviewViewIntegrated.tsx` → imports from `review/hooks/useReviewApi`
   - `components/review/ReviewQueueIntegrated.tsx` → imports from `review/hooks/useReviewApi`

2. **Marked as deprecated:**
   - `features/admin/` → use `src/admin/`
   - `features/auth/` → use `src/auth/`
   - `features/review/` → use `src/review/`
   - `features/setup/` → use `src/setup/`
   - All subdirectory re-exports (components, hooks, pages)

### TypeScript Fixes

1. **BrandingStepData type** - Extended `themePreset` union type to include all 17 color presets plus 'custom'
2. **lazyRoutes.tsx** - Fixed generic type issues in `lazyWithFallback` helper function

### Documentation

- Updated `legacy_quarantine/README.md` with LoginPage and features/ quarantine details

## Files Modified

- `frontend/src/auth/pages/LoginPage.tsx` - Deprecation header, fixed unused variable
- `frontend/src/auth/pages/LoginPage.test.tsx` - Deprecation header, tests skipped
- `frontend/src/auth/pages/LoginPage.integration.test.tsx` - Deprecation header, tests skipped
- `frontend/src/auth/pages/index.ts` - Re-export LoginPageV2 as LoginPage
- `frontend/src/admin/components/wizard/types.ts` - Extended BrandingStepData.themePreset type
- `frontend/src/routes/lazyRoutes.tsx` - Fixed TypeScript generic type
- `frontend/src/documents/hooks/useDocuments.ts` - Updated import path
- `frontend/src/components/review/GuidedReviewViewIntegrated.tsx` - Updated import path
- `frontend/src/components/review/ReviewQueueIntegrated.tsx` - Updated import path
- `frontend/src/features/index.ts` - Marked as deprecated
- `frontend/src/features/admin/index.ts` - Marked as deprecated
- `frontend/src/features/auth/index.ts` - Marked as deprecated
- `frontend/src/features/review/index.ts` - Marked as deprecated
- `frontend/src/features/setup/index.ts` - Marked as deprecated
- `frontend/src/features/admin/*/index.ts` - All marked as deprecated
- `frontend/src/legacy_quarantine/README.md` - Updated documentation

## Verification

- TypeScript compilation: ✅ Passes
- Build: ✅ Passes
- LoginPage tests: ✅ 42 tests properly skipped
- No active imports from features/ re-exports (only legacy_quarantine uses them)
