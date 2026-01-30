# Backend-Frontend Wiring Audit — Implementation Tasks

**Version**: 1.0  
**Date**: 2026-01-26  
**Status**: Draft  
**Purpose**: Ordered implementation plan with checklists for the wiring audit

---

## Epic 0: Evidence Dump

Generate raw inventory data for backend routes, frontend routes, navigation, and API calls.

### Task 0.1: Generate Backend Route Map

**Definition of Done**:
- [x] All routes from `main.rs` extracted with HTTP method, path, handler, middleware
- [x] All `.configure()` functions traced to their route definitions
- [x] Output written to `audit/ROUTES_BACKEND.md` (update existing)
- [x] Each route marked with production readiness status

**Files to Touch**:
- Read: `backend/crates/server/src/main.rs` (lines 200-950)
- Read: `backend/crates/server/src/handlers/*.rs` (for `.configure()` functions)
- Write: `audit/ROUTES_BACKEND.md`

**Evidence Required**:
- Before: Existing `audit/ROUTES_BACKEND.md` (dated 2026-01-25)
- After: Updated file with any missing routes, verified line numbers

**No-Delete Compliance**: N/A (documentation only)

---

### Task 0.2: Generate Frontend Route Map

**Definition of Done**:
- [x] All `<Route>` elements from `App.tsx` extracted
- [x] All sub-routes from `SettingsRouter.tsx` extracted
- [x] Each route documented with path, component, permission
- [x] Output written to `audit/ROUTES_FRONTEND.md` (update existing)

**Files to Touch**:
- Read: `frontend/src/App.tsx`
- Read: `frontend/src/features/settings/SettingsRouter.tsx`
- Write: `audit/ROUTES_FRONTEND.md`

**Evidence Required**:
- Before: Existing `audit/ROUTES_FRONTEND.md` (dated 2026-01-25)
- After: Updated file with any missing routes

**No-Delete Compliance**: N/A (documentation only)

---

### Task 0.3: Generate Navigation & Layout Composition Map

**Definition of Done**:
- [x] Sidebar navigation items documented (from config or hardcoded)
- [x] Topbar items documented
- [x] Bottom nav items documented (if any)
- [x] Icon rail items documented (if any)
- [x] Each nav item linked to its target route
- [x] Where sidebar renders identified
- [x] Where icon rail renders identified
- [x] Where any "Navigation" page renders identified
- [x] How layouts nest documented (AppLayout → SettingsRouter → child routes)
- [x] Output written to `audit/NAV_AUDIT.md`
- [x] Output written to `audit/LAYOUT_MAP.md`
- [x] Output written to `audit/NAV_SOURCES.md` (each nav list and where it's defined)

**Files to Touch**:
- Read: `frontend/src/AppLayout.tsx` (lines 140-180 for sidebar)
- Read: `frontend/src/config/` (navigation config source)
- Read: `frontend/src/common/components/organisms/BottomNav.tsx`
- Read: `frontend/src/App.tsx` (layout nesting)
- Read: `frontend/src/features/settings/SettingsRouter.tsx` (sub-layout)
- Search: Components that render navigation menus
- Write: `audit/NAV_AUDIT.md`
- Write: `audit/LAYOUT_MAP.md`
- Write: `audit/NAV_SOURCES.md`

**Evidence Required**:
- Navigation config source identified
- Each nav item → route mapping documented
- Layout nesting hierarchy documented
- All nav rendering locations identified

**No-Delete Compliance**: N/A (documentation only)

---

### Task 0.4: Generate API Client Map

**Definition of Done**:
- [x] All API calls in `frontend/src/services/*.ts` documented
- [x] All API calls in `frontend/src/features/*/api/*.ts` documented
- [x] All inline `apiClient.*` calls in pages documented
- [x] Each call linked to backend endpoint
- [x] Output written to `audit/API_CLIENT_MAP.md`

**Files to Touch**:
- Read: `frontend/src/common/utils/apiClient.ts`
- Read: `frontend/src/services/*.ts`
- Read: `frontend/src/features/*/api/*.ts`
- Search: `apiClient.get|post|put|delete` across `frontend/src/`
- Write: `audit/API_CLIENT_MAP.md`

**Evidence Required**:
- Grep results for API calls
- Each frontend function → backend endpoint mapping

**No-Delete Compliance**: N/A (documentation only)

---

### Task 0.5: Generate DB Schema Map

**Definition of Done**:
- [x] All migrations listed with table names
- [x] Each table documented with purpose
- [x] Tenant isolation (tenant_id column) noted
- [x] Output written to `audit/DB_SCHEMA.md`

**Files to Touch**:
- Read: `backend/crates/server/src/db/migrations.rs` (migration list)
- Read: `backend/migrations/*.sql` (table definitions)
- Write: `audit/DB_SCHEMA.md`

**Evidence Required**:
- Migration file list from `migrations.rs`
- Table names from each SQL file

**No-Delete Compliance**: N/A (documentation only)

---

## Epic 1: Feature Matrix Build

Build the end-to-end traceability matrix row by row.

### Task 1.1: Products/Inventory Matrix Rows

**Definition of Done**:
- [x] All `/api/products/*` endpoints mapped to frontend
- [x] All `/api/inventory/*` endpoints mapped to frontend
- [x] Status assigned: Wired/Partial/Missing/Backend-only
- [x] Data contract documented (request/response schema)
- [x] State owner identified (React Query key, Zustand slice, etc.)
- [x] UI affordance classified (list/detail/modal/background)
- [x] User persona assigned (cashier/manager/admin)
- [x] Priority assigned (P0/P1/P2/P3) with rationale
- [x] Implementation owner identified (frontend/backend/both)
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/product.rs`
- Read: `backend/crates/server/src/handlers/product_advanced.rs`
- Read: `backend/crates/server/src/handlers/products.rs`
- Read: `backend/crates/server/src/handlers/inventory.rs`
- Read: `frontend/src/features/lookup/pages/LookupPage.tsx`
- Read: `frontend/src/features/warehouse/pages/WarehousePage.tsx`
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Frontend API calls identified
- Navigation path documented
- TypeScript types or schema references
- State management pattern identified

**No-Delete Compliance**: N/A (documentation only)

---

### Task 1.2: Customers Matrix Rows

**Definition of Done**:
- [x] All `/api/customers/*` endpoints mapped to frontend
- [x] Status assigned for each endpoint
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/customer.rs`
- Read: `backend/crates/server/src/handlers/customers.rs`
- Read: `frontend/src/features/customers/pages/CustomersPage.tsx`
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Frontend API calls identified

**No-Delete Compliance**: N/A (documentation only)

---

### Task 1.3: Sales Features Matrix Rows

**Definition of Done**:
- [x] Layaway endpoints (`/api/layaways/*`) mapped
- [x] Work order endpoints (`/api/work-orders/*`) mapped
- [x] Commission endpoints (`/api/commissions/*`) mapped
- [x] Promotion endpoints (`/api/promotions/*`) mapped
- [x] Status assigned for each
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/layaway.rs`
- Read: `backend/crates/server/src/handlers/work_order.rs`
- Read: `backend/crates/server/src/handlers/commission.rs`
- Read: `backend/crates/server/src/handlers/promotion.rs`
- Read: `frontend/src/features/sell/pages/SellPage.tsx`
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Frontend consumption identified (or marked Missing)

**No-Delete Compliance**: N/A (documentation only)

---

### Task 1.4: Finance Features Matrix Rows

**Definition of Done**:
- [x] Credit endpoints (`/api/credit/*`) mapped
- [x] Gift card endpoints (`/api/gift-cards/*`) mapped
- [x] Loyalty endpoints (`/api/loyalty/*`) mapped
- [x] Status assigned for each
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/credit.rs`
- Read: `backend/crates/server/src/handlers/gift_card.rs`
- Read: `backend/crates/server/src/handlers/loyalty.rs`
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Frontend consumption identified (or marked Missing)

**No-Delete Compliance**: N/A (documentation only)

---

### Task 1.5: Reporting Matrix Rows

**Definition of Done**:
- [x] All `/api/reports/*` endpoints mapped
- [x] All `/api/stats/*` endpoints mapped
- [x] Export endpoint marked as Stub (known issue)
- [x] Status assigned for each
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/reporting.rs`
- Read: `backend/crates/server/src/handlers/stats.rs`
- Read: `frontend/src/features/reporting/pages/ReportingPage.tsx`
- Read: `frontend/src/features/home/pages/HomePage.tsx` (dashboard stats)
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Export stub documented with TODO
- Frontend consumption identified

**No-Delete Compliance**: N/A (documentation only)

---

### Task 1.6: Sync/Conflicts Matrix Rows

**Definition of Done**:
- [x] All `/api/sync/*` endpoints mapped
- [x] All `/api/sync-config/*` endpoints mapped
- [x] All `/api/sync-operations/*` endpoints mapped
- [x] All `/api/conflicts/*` endpoints mapped
- [x] Dev-only endpoints marked (dry-run, sandbox)
- [x] Status assigned for each
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/sync.rs`
- Read: `backend/crates/server/src/handlers/sync_config.rs`
- Read: `backend/crates/server/src/handlers/sync_operations.rs`
- Read: `backend/crates/server/src/handlers/conflicts.rs`
- Read: `frontend/src/features/settings/pages/SyncDashboardPage.tsx`
- Read: `frontend/src/services/syncApi.ts`
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Dev-only gating verified
- Frontend consumption identified

**No-Delete Compliance**: N/A (documentation only)

---

### Task 1.7: Integrations Matrix Rows

**Definition of Done**:
- [x] QuickBooks endpoints (`/api/quickbooks/*`) mapped
- [x] WooCommerce endpoints (`/api/woocommerce/*`) mapped
- [x] OAuth endpoints mapped
- [x] Webhook endpoints mapped (mark as Backend-only)
- [x] Status assigned for each
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/quickbooks*.rs`
- Read: `backend/crates/server/src/handlers/woocommerce*.rs`
- Read: `backend/crates/server/src/handlers/integrations.rs`
- Read: `backend/crates/server/src/handlers/webhooks.rs`
- Read: `frontend/src/features/settings/pages/IntegrationsPage.tsx`
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Hardcoded OAuth redirect URI documented as known issue
- Frontend consumption identified

**No-Delete Compliance**: N/A (documentation only)

---

### Task 1.8: Vendor Bills/OCR Matrix Rows

**Definition of Done**:
- [x] Vendor endpoints (`/api/vendors/*`) mapped
- [x] Vendor bill endpoints (`/api/vendor-bills/*`) mapped
- [x] OCR endpoints (`/api/ocr/*`) mapped
- [x] Review case endpoints (`/api/review-cases/*`) mapped
- [x] Status assigned for each
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/vendor.rs`
- Read: `backend/crates/server/src/handlers/vendor_bill.rs`
- Read: `backend/crates/server/src/handlers/ocr_*.rs`
- Read: `backend/crates/server/src/handlers/review_cases.rs`
- Read: `frontend/src/components/vendor-bill/*.tsx`
- Read: `frontend/src/features/review/pages/*.tsx`
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Frontend pages and components identified
- Navigation paths documented

**No-Delete Compliance**: N/A (documentation only)

---

### Task 1.9: Admin/Settings Matrix Rows

**Definition of Done**:
- [x] Settings endpoints (`/api/settings/*`) mapped
- [x] Feature flags endpoints (`/api/feature-flags/*`) mapped
- [x] Config endpoints (`/api/config/*`) mapped
- [x] Stores/stations endpoints (`/api/stores/*`, `/api/stations/*`) mapped
- [x] Audit log endpoints (`/api/audit-logs/*`) mapped
- [x] Status assigned for each
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/settings*.rs`
- Read: `backend/crates/server/src/handlers/feature_flags.rs`
- Read: `backend/crates/server/src/handlers/config.rs`
- Read: `backend/crates/server/src/handlers/stores.rs`
- Read: `backend/crates/server/src/handlers/audit.rs`
- Read: `frontend/src/features/settings/pages/*.tsx`
- Read: `frontend/src/features/admin/pages/*.tsx`
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Frontend pages identified
- Settings sub-routes mapped

**No-Delete Compliance**: N/A (documentation only)

---

### Task 1.10: Files/Backups Matrix Rows

**Definition of Done**:
- [x] Files endpoints (`/api/files/*`) mapped
- [x] Backup endpoints (`/api/backups/*`) mapped
- [x] Export endpoints (`/api/export/*`) mapped
- [x] Fresh install endpoints (`/api/fresh-install/*`) mapped
- [x] Status assigned for each
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/files.rs`
- Read: `backend/crates/server/src/handlers/backup*.rs`
- Read: `backend/crates/server/src/handlers/export.rs`
- Read: `backend/crates/server/src/handlers/fresh_install.rs`
- Read: `frontend/src/features/setup/pages/FreshInstallWizard.tsx`
- Read: `frontend/src/features/exports/pages/ExportsPage.tsx`
- Read: `frontend/src/features/documents/pages/DocumentsPage.tsx`
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Fresh install gating verified
- Frontend pages identified

**No-Delete Compliance**: N/A (documentation only)

---

### Task 1.11: Remaining Features Matrix Rows

**Definition of Done**:
- [x] Theme endpoints (`/api/theme/*`) mapped
- [x] Alerts endpoints (`/api/alerts/*`) mapped
- [x] Barcodes endpoints (`/api/barcodes/*`) mapped
- [x] Units endpoints (`/api/units/*`) mapped
- [x] Health check endpoints mapped (mark as Backend-only)
- [x] Cache endpoints mapped (mark as Backend-only)
- [x] Status assigned for each
- [x] Rows added to `audit/FEATURE_MATRIX.md`

**Files to Touch**:
- Read: `backend/crates/server/src/handlers/theme.rs`
- Read: `backend/crates/server/src/handlers/alerts.rs`
- Read: `backend/crates/server/src/handlers/barcodes.rs`
- Read: `backend/crates/server/src/handlers/units.rs`
- Read: `backend/crates/server/src/handlers/health*.rs`
- Read: `backend/crates/server/src/handlers/cache.rs`
- Write: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Backend handler functions listed
- Backend-only rationale documented where applicable

**No-Delete Compliance**: N/A (documentation only)

---

## Epic 2: Wiring Fixes

For each Missing/Partial status in the feature matrix, implement minimal UI/page/action.

### Task 2.1: Identify Missing Wiring

**Definition of Done**:
- [x] All "Missing" status rows from matrix listed
- [x] All "Partial" status rows from matrix listed
- [x] Priority assigned (P1: core features, P2: nice-to-have, P3: defer)
- [x] Output written to `audit/WIRING_GAPS.md`

**Files to Touch**:
- Read: `audit/FEATURE_MATRIX.md`
- Write: `audit/WIRING_GAPS.md`

**Evidence Required**:
- Matrix rows with Missing/Partial status
- Priority rationale

**No-Delete Compliance**: N/A (documentation only)

---

### Task 2.2: Implement P1 Missing Wiring

**Definition of Done**:
- [x] For each P1 Missing item: minimal page/component created
- [x] API call added to consume backend endpoint
- [x] Navigation entry added (if user-facing)
- [x] Route guard added with correct permission
- [x] Matrix status updated to Wired

**Files to Touch**:
- Create: `frontend/src/features/*/pages/*.tsx` (as needed)
- Update: `frontend/src/App.tsx` (add routes)
- Update: Navigation config (add menu items)
- Update: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Before: Matrix row shows Missing
- After: Matrix row shows Wired with file paths

**No-Delete Compliance**: No existing code deleted; only additions

---

### Task 2.3: Complete P1 Partial Wiring

**Definition of Done**:
- [x] For each P1 Partial item: missing pieces identified
- [x] Missing API calls added
- [x] Missing error handling added
- [x] Missing navigation entries added
- [x] Matrix status updated to Wired

**Files to Touch**:
- Update: Existing page components
- Update: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- Before: Matrix row shows Partial with notes
- After: Matrix row shows Wired

**No-Delete Compliance**: No existing code deleted; only additions/modifications

---

### Task 2.4: Document Backend-Only Features

**Definition of Done**:
- [x] Each Backend-only status has documented rationale
- [x] Rationale added to matrix Evidence Notes column
- [x] Backend-only features listed in `audit/BACKEND_ONLY.md`

**Files to Touch**:
- Update: `audit/FEATURE_MATRIX.md`
- Create: `audit/BACKEND_ONLY.md`

**Evidence Required**:
- Rationale for each Backend-only feature

**No-Delete Compliance**: N/A (documentation only)

---

### Task 2.5: Label Stub Endpoints

**Definition of Done**:
- [x] Each Stub endpoint has UI indication ("Coming Soon" or feature flag)
- [x] Stub endpoints documented in `audit/STUB_ENDPOINTS.md`
- [x] Matrix status remains Stub with notes

**Files to Touch**:
- Update: Frontend pages that call stub endpoints
- Create: `audit/STUB_ENDPOINTS.md`
- Update: `audit/FEATURE_MATRIX.md`

**Evidence Required**:
- UI shows appropriate indication for stub features
- Stub endpoints listed with TODO/ticket reference

**No-Delete Compliance**: No existing code deleted; only UI additions

---

### Task 2.6: Fix Duplicate Navigation Rendering

**Definition of Done**:
- [x] Route/page causing duplicate nav identified
- [x] Nav menu removed from page content OR page moved to layout without nav
- [x] Single source of truth for nav config enforced
- [x] Playwright screenshot assertion added for one representative route
- [x] No screen shows duplicated nav items in two places at once

**Files to Touch**:
- Read: `audit/NAV_SOURCES.md` (identify duplicate sources)
- Read: `audit/LAYOUT_MAP.md` (identify layout nesting issues)
- Update: Pages with embedded navigation
- Update: Layout components
- Create: `frontend/e2e/nav-deduplication.spec.ts` (Playwright test)

**Evidence Required**:
- Before: Screenshot showing duplicate nav
- After: Screenshot showing single nav
- Playwright test passing

**No-Delete Compliance**: No existing code deleted; only refactoring

---

## Epic 3: Validation

Verify all routes and pages work correctly.

### Task 3.1: Create Manual Test Checklist

**Definition of Done**:
- [x] Checklist created for each frontend route
- [x] Each checklist item covers: navigation, data load, error state, permission denial
- [x] Output written to `audit/MANUAL_TEST_CHECKLIST.md`

**Files to Touch**:
- Create: `audit/MANUAL_TEST_CHECKLIST.md`

**Evidence Required**:
- Checklist covers all routes from `audit/ROUTES_FRONTEND.md`

**No-Delete Compliance**: N/A (documentation only)

---

### Task 3.2: Execute Manual Tests

**Definition of Done**:
- [x] Each checklist item executed
- [x] Pass/Fail recorded
- [x] Failures documented with reproduction steps
- [x] Output updated in `audit/MANUAL_TEST_CHECKLIST.md`

**Files to Touch**:
- Update: `audit/MANUAL_TEST_CHECKLIST.md`

**Evidence Required**:
- Test execution date
- Pass/Fail status for each item

**No-Delete Compliance**: N/A (testing only)

---

### Task 3.3: Create Automated Smoke Tests

**Definition of Done**:
- [x] Playwright test file created for route smoke tests
- [x] Each route tested for: loads without error, no console errors
- [x] Tests added to CI pipeline (or documented as manual)

**Files to Touch**:
- Create: `frontend/e2e/routes.smoke.spec.ts`
- Update: `frontend/playwright.config.ts` (if needed)

**Evidence Required**:
- Test file exists
- Tests pass locally

**No-Delete Compliance**: N/A (test code only)

---

### Task 3.4: Verify Permission Matrix

**Definition of Done**:
- [x] All frontend `RequirePermission` strings listed
- [x] All backend `require_permission` strings listed
- [x] Cross-reference shows matches
- [x] Mismatches documented and fixed
- [x] Output written to `audit/PERMISSION_MATRIX.md`

**Files to Touch**:
- Read: `frontend/src/App.tsx` (RequirePermission usages)
- Read: `backend/crates/server/src/main.rs` (require_permission usages)
- Create: `audit/PERMISSION_MATRIX.md`

**Evidence Required**:
- Permission strings from both sides
- Match/mismatch status

**No-Delete Compliance**: N/A (documentation only)

---

### Task 3.5: Verify No Orphan Pages

**Definition of Done**:
- [x] All page components in `features/*/pages/` listed
- [x] Each page has corresponding route in `App.tsx` or sub-router
- [x] Orphan pages documented (if any)
- [x] Orphans either routed or quarantined

**Files to Touch**:
- Read: `frontend/src/features/*/pages/*.tsx`
- Read: `frontend/src/App.tsx`
- Update: `audit/ROUTES_FRONTEND.md` (add orphan section)

**Evidence Required**:
- Page component list
- Route binding for each

**No-Delete Compliance**: Orphan pages quarantined to `archive/code/frontend/`, not deleted

---

### Task 3.6: Create Route Drift Check Script

**Definition of Done**:
- [x] Script created that compares backend routes vs audit doc
- [x] Script compares frontend routes vs audit doc
- [x] Script outputs drift report with warnings/errors
- [x] Script can be run in CI or manually
- [x] Threshold configured (e.g., fail if >5 routes missing)

**Files to Touch**:
- Create: `scripts/check-route-drift.js` or `.ts`
- Update: `package.json` (add script command)
- Create: `audit/ROUTE_DRIFT_REPORT.md` (output)

**Evidence Required**:
- Script runs successfully
- Drift report generated
- CI integration documented (or manual run command)

**No-Delete Compliance**: N/A (new script only)

---

### Task 3.7: Verify Runtime Wiring

**Definition of Done**:
- [x] For each "Wired" matrix row, runtime proof collected
- [x] Runtime proof is one of: network request screenshot/log, curl command + response, Playwright trace
- [x] Proof added to matrix Evidence Notes column
- [x] Routes that 500 or fail auth marked as Partial/Missing

**Files to Touch**:
- Update: `audit/FEATURE_MATRIX.md` (add runtime proof)
- Create: `audit/RUNTIME_PROOF/` (screenshots/logs)

**Evidence Required**:
- Network request logs or screenshots
- curl commands with responses
- Playwright traces showing successful loads

**No-Delete Compliance**: N/A (documentation only)

---

## Epic 4: Documentation

Update project documentation to reference audit outputs.

### Task 4.1: Update START_HERE.md

**Definition of Done**:
- [x] Link to `audit/FEATURE_MATRIX.md` added
- [x] Link to `audit/ROUTES_BACKEND.md` added
- [x] Link to `audit/ROUTES_FRONTEND.md` added
- [x] Brief description of audit purpose added

**Files to Touch**:
- Update: `START_HERE.md`

**Evidence Required**:
- Links work and point to correct files

**No-Delete Compliance**: Existing content preserved; links added

---

### Task 4.2: Update README.md

**Definition of Done**:
- [x] Audit section added to README
- [x] Links to audit outputs added
- [x] Brief description of wiring status added

**Files to Touch**:
- Update: `README.md`

**Evidence Required**:
- Audit section exists
- Links work

**No-Delete Compliance**: Existing content preserved; section added

---

### Task 4.3: Create Audit Index

**Definition of Done**:
- [x] `audit/INDEX.md` created
- [x] All audit files listed with descriptions
- [x] Last updated date included

**Files to Touch**:
- Create: `audit/INDEX.md`

**Evidence Required**:
- Index file exists
- All audit files referenced

**No-Delete Compliance**: N/A (new file)

---

## Summary Checklist

### Epic 0: Evidence Dump
- [x] Task 0.1: Backend route map
- [x] Task 0.2: Frontend route map
- [x] Task 0.3: Navigation & layout composition map
- [x] Task 0.4: API client map
- [x] Task 0.5: DB schema map

### Epic 1: Feature Matrix Build
- [x] Task 1.1: Products/Inventory (with data contracts)
- [x] Task 1.2: Customers
- [x] Task 1.3: Sales features
- [x] Task 1.4: Finance features
- [x] Task 1.5: Reporting
- [x] Task 1.6: Sync/Conflicts
- [x] Task 1.7: Integrations
- [x] Task 1.8: Vendor Bills/OCR
- [x] Task 1.9: Admin/Settings
- [x] Task 1.10: Files/Backups
- [x] Task 1.11: Remaining features

### Epic 2: Wiring Fixes
- [x] Task 2.1: Identify gaps
- [x] Task 2.2: Implement P1 Missing
- [x] Task 2.3: Complete P1 Partial
- [x] Task 2.4: Document Backend-only
- [x] Task 2.5: Label Stubs
- [x] Task 2.6: Fix duplicate navigation rendering

### Epic 3: Validation
- [x] Task 3.1: Create test checklist
- [x] Task 3.2: Execute manual tests
- [x] Task 3.3: Create smoke tests
- [x] Task 3.4: Verify permissions
- [x] Task 3.5: Verify no orphans
- [x] Task 3.6: Create route drift check script
- [x] Task 3.7: Verify runtime wiring

### Epic 4: Documentation
- [x] Task 4.1: Update START_HERE.md
- [x] Task 4.2: Update README.md
- [x] Task 4.3: Create audit index

---

## Appendix: File Outputs

| File | Epic | Task | Purpose |
|------|------|------|---------|
| `audit/ROUTES_BACKEND.md` | 0 | 0.1 | Backend route inventory |
| `audit/ROUTES_FRONTEND.md` | 0 | 0.2 | Frontend route inventory |
| `audit/NAV_AUDIT.md` | 0 | 0.3 | Navigation map |
| `audit/LAYOUT_MAP.md` | 0 | 0.3 | Layout nesting hierarchy |
| `audit/NAV_SOURCES.md` | 0 | 0.3 | Navigation source definitions |
| `audit/API_CLIENT_MAP.md` | 0 | 0.4 | Frontend API calls |
| `audit/DB_SCHEMA.md` | 0 | 0.5 | Database tables |
| `audit/FEATURE_MATRIX.md` | 1 | 1.1-1.11 | End-to-end wiring matrix with data contracts |
| `audit/WIRING_GAPS.md` | 2 | 2.1 | Missing/Partial items |
| `audit/BACKEND_ONLY.md` | 2 | 2.4 | Backend-only rationale |
| `audit/STUB_ENDPOINTS.md` | 2 | 2.5 | Stub endpoint list |
| `frontend/e2e/nav-deduplication.spec.ts` | 2 | 2.6 | Nav deduplication test |
| `audit/MANUAL_TEST_CHECKLIST.md` | 3 | 3.1-3.2 | Test checklist |
| `audit/PERMISSION_MATRIX.md` | 3 | 3.4 | Permission cross-reference |
| `audit/ROUTE_DRIFT_REPORT.md` | 3 | 3.6 | Route drift check output |
| `audit/RUNTIME_PROOF/` | 3 | 3.7 | Runtime evidence (screenshots/logs) |
| `scripts/check-route-drift.js` | 3 | 3.6 | Route drift check script |
| `audit/INDEX.md` | 4 | 4.3 | Audit file index |
