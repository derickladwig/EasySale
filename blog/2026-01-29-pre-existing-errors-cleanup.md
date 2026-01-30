# Pre-existing Errors Cleanup

**Date:** 2026-01-29

## Summary

Fixed 43+ ESLint errors and 1 backend test compilation error that were pre-existing in the codebase.

## Backend Fixes

### backup_service.rs (line 2059)
- Fixed test calling `service.calculate_file_checksum()` as a method instead of associated function
- Changed to `BackupService::calculate_file_checksum(&file1)`

## Frontend Fixes

### Unused Variable Errors (Fixed)
- `CustomersPage.tsx`: `newCustomer` → `_newCustomer`
- `hooks.ts` (reporting): Removed unused `error` catch variable
- `NavItem.tsx`: `id` → `_id` (unused in destructuring)
- `PageTabs.tsx`: Removed unused `Lock` import
- `ProductImportPage.tsx`: Removed 3 unused `err` catch variables
- `SellPage.tsx`: Removed unused `Button` import
- `CompanyStoresPage.tsx`: Removed unused `localization` from destructuring
- `IntegrationsPage.tsx`: Removed unused `error` catch variable
- `PerformancePage.tsx`: Removed unused `setError` from useState (2 instances)
- `TemplateManagerPage.tsx`: Removed unused `Play` import, removed unused `err` catch variable
- `Navigation.stories.tsx`: `mockPermissions` → `_mockPermissions`

### Property Test Files (ESM __dirname Fix)
- `design-token-usage.property.test.ts`: Added `import.meta.url` with `fileURLToPath`
- `empty-state-vs-mock-data.property.test.ts`: Added `import.meta.url` with `fileURLToPath`
- `no-demo-data-in-prod.property.test.ts`: Added `import.meta.url` with `fileURLToPath`

## Result

- Backend: Compiles successfully with `cargo check --lib`
- Frontend: 0 ESLint errors (down from 43+)
- Only pre-existing warnings remain (console statements, inline styles)
