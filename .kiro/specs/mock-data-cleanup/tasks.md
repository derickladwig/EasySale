# Mock Data Cleanup - Tasks

## Phase 1: Infrastructure (Create Hooks & Build Config)

### Task 1.1: Update Vite Config for Build-Time Variables
- [x] Add `VITE_APP_VERSION` from `package.json`
- [x] Add `VITE_BUILD_HASH` from env or 'dev'
- [x] Add `VITE_BUILD_DATE` as ISO date string
- **File:** `frontend/vite.config.ts`

### Task 1.2: Create useAppInfo Hook
- [x] Create `frontend/src/common/hooks/useAppInfo.ts`
- [x] Fetch from `/api/capabilities` with React Query
- [x] Fallback to Vite env vars
- [x] Return: version, buildHash, buildDate, companyName, copyright
- [x] Export from `frontend/src/common/hooks/index.ts`

### Task 1.3: Create useSystemStatus Hook
- [x] Create `frontend/src/common/hooks/useSystemStatus.ts`
- [x] Fetch from `/api/health/status` with polling (30s)
- [x] Return: database, sync, lastSyncTime, storeName, stationId
- [x] Handle loading and error states gracefully
- [x] Export from `frontend/src/common/hooks/index.ts`

---

## Phase 2: Fix LoginPageV2 (Primary Target)

### Task 2.1: Fix LogoBadge Component
- [x] Remove hardcoded blue gradient background
- [x] Use `branding.company.favicon` for badge (not icon)
- [x] If PNG/SVG provided, show without forced background
- [x] Fallback to initials with `bg-primary-500` (theme color)
- **File:** `frontend/src/features/auth/pages/LoginPageV2.tsx` (lines 42-54)

### Task 2.2: Fix Header Logo
- [x] Use `branding.company.logo` or `branding.company.logoDark`
- [x] Remove hardcoded blue fallback
- [x] Use `bg-primary-500` for fallback initials
- **File:** `frontend/src/features/auth/pages/LoginPageV2.tsx` (lines 252-262)

### Task 2.3: Replace Mock System Status
- [x] Import and use `useSystemStatus` hook
- [x] Remove hardcoded `systemStatus` object (lines 203-210)
- [x] Handle loading state in StatusPanel
- [x] Handle error state gracefully
- **File:** `frontend/src/features/auth/pages/LoginPageV2.tsx`

### Task 2.4: Fix Footer with Real Data
- [x] Import and use `useAppInfo` hook
- [x] Replace hardcoded `v1.0.0 • 2023-04-15-abc123`
- [x] Replace hardcoded `© 2024 EasySale`
- [x] Use dynamic copyright year
- **File:** `frontend/src/features/auth/pages/LoginPageV2.tsx` (lines 433-435)

---

## Phase 3: Fix LoginPage (Original)

### Task 3.1: Replace Mock System Status
- [x] Import and use `useSystemStatus` hook
- [x] Remove hardcoded `systemStatus` object (lines 109-116)
- **File:** `frontend/src/features/auth/pages/LoginPage.tsx`

### Task 3.2: Fix FooterSlot Props
- [x] Import and use `useAppInfo` hook
- [x] Replace hardcoded version="1.0.0"
- [x] Replace hardcoded buildId="20260116-abc123"
- [x] Replace hardcoded copyright="© 2026 EasySale..."
- **File:** `frontend/src/features/auth/pages/LoginPage.tsx` (lines 402-405)

---

## Phase 4: Fix Other Mock Data Locations

### Task 4.1: TemplateManagerPage KPI Data
- [ ] Replace placeholder KPI data with API call or remove
- [ ] Add loading state for KPIs
- **File:** `frontend/src/features/templates/pages/TemplateManagerPage.tsx` (lines 30-38)

### Task 4.2: Fix Hardcoded Store IDs
- [ ] CreateProductModal: Get storeId from context
- [ ] CustomersPage: Get store_id from context
- **Files:** 
  - `frontend/src/features/lookup/components/CreateProductModal.tsx`
  - `frontend/src/features/customers/pages/CustomersPage.tsx`

### Task 4.3: Replace setTimeout Simulated APIs
- [ ] MyPreferencesPage: Wire to real API or show "not implemented"
- [ ] CompanyStoresPage: Wire to real API
- [ ] NetworkPage: Wire to real sync API
- [ ] LocalizationPage: Wire to real API
- [ ] ImportWizard: Wire to real import API
- [ ] RestoreWizard: Wire to real restore API
- [ ] FormTemplatesPage: Wire to real API
- **Priority:** Lower - these are admin pages, not login

---

## Phase 5: Theme Preset Cleanup

### Task 5.1: Fix Copyright Years in Presets
- [x] Update `minimalDark.json` copyright to 2026 (already correct)
- [x] Update `EasySaleDark.json` copyright to 2026
- [x] Update `purpleGradient.json` copyright to 2026
- [x] Update `tealGradient.json` copyright to 2026
- **Files:** `frontend/src/features/auth/theme/presets/*.json`

---

## Phase 6: Verification

### Task 6.1: Visual Verification
- [x] Login page shows correct favicon in badge (uses branding.company.favicon)
- [x] Login page shows correct logo in header (uses branding.company.logo/logoDark)
- [x] Footer shows real version from package.json
- [x] Footer shows current year (2026)
- [x] System status shows real data or loading state

### Task 6.2: Code Verification
- [x] No hardcoded "2023", "2024" dates in user-facing code
- [x] No hardcoded "abc123" build IDs
- [x] No "Mock" or "simulated" comments in login pages (only in test files)
- [x] No hardcoded "Main Store", "POS-01" in login pages

---

## Execution Order

**Session 1 (Current):** Tasks 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4
**Session 2:** Tasks 3.1, 3.2, 5.1, 6.1, 6.2
**Session 3:** Tasks 4.1, 4.2, 4.3 (lower priority admin pages)

---

## Notes

- The `docs/DATA_SOURCES_REFERENCE.md` file documents all correct data sources
- Backend already exposes version/build via `/api/capabilities`
- Health status available via `/api/health/status`
- Branding config loaded via ConfigProvider context
