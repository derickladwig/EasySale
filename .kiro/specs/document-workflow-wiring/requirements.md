# Backend-Frontend Wiring Audit — Requirements

**Version**: 2.0  
**Date**: 2026-01-26  
**Status**: Draft  
**Purpose**: Define requirements for a truth-synced audit of backend capabilities vs frontend wiring with layout/nav de-duplication, data contracts, runtime evidence, and regression guardrails

---

## 1. Audit Scope

### 1.1 Backend Inventory Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| BE-1 | All registered routes must be inventoried | Every `.service()`, `.route()`, `.configure()` call in `backend/crates/server/src/main.rs` is documented with HTTP method, path, handler function, and middleware |
| BE-2 | All handler modules must be catalogued | Every `pub mod` in `backend/crates/server/src/handlers/mod.rs` is listed with its public functions |
| BE-3 | All database migrations must be inventoried | Every file in `backend/migrations/` is listed with table names and purpose |
| BE-4 | All services/modules must be documented | Every module in `backend/crates/server/src/services/` is catalogued with its public API |
| BE-5 | Auth/permission requirements must be captured | Every `require_permission()` wrapper and `ContextExtractor` usage is documented per route |
| BE-6 | Background tasks must be identified | Scheduler service, backup jobs, sync orchestrator documented with trigger conditions |
| BE-7 | Integration connectors must be listed | QuickBooks, WooCommerce, Google Drive, Supabase connectors documented with their endpoints |
| BE-8 | File storage/upload endpoints must be catalogued | All `/api/files/*`, `/api/ocr/ingest`, `/api/vendor-bills/upload` documented |
| BE-9 | Export endpoints must be identified | All export-related endpoints documented with their implementation status (real vs stub) |

### 1.2 Frontend Inventory Requirements

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| FE-1 | All React Router routes must be inventoried | Every `<Route>` in `frontend/src/App.tsx` and `SettingsRouter.tsx` documented with path, component, and permission |
| FE-2 | All page components must be catalogued | Every page in `frontend/src/features/*/pages/` listed with its route binding |
| FE-3 | Layout shells must be documented | `AppLayout.tsx`, `SettingsRouter.tsx`, and any other layout wrappers documented |
| FE-4 | Navigation menus must be inventoried | Sidebar items, topbar items, bottom nav items documented with their route targets |
| FE-5 | API client layer must be mapped | `apiClient.ts`, `settingsApi.ts`, `syncApi.ts`, `capabilities.ts` documented with all endpoint calls |
| FE-6 | Forms and actions must be catalogued | All form submissions and mutation calls documented with their backend endpoints |
| FE-7 | Error boundaries must be verified | `ErrorBoundary` usage documented; 404/403/401 handling verified |
| FE-8 | Permission guards must be mapped | All `RequirePermission` usages documented with their permission strings |
| FE-9 | Single Navigation Surface | At any route, only one primary nav UI renders (rail OR sidebar OR bottom nav) |
| FE-10 | Layout Variant Map | Every route declares a layout variant: PublicLayout, AppLayout, SettingsLayout, FullscreenLayout (or equivalents) |

---

## 2. Feature Coverage Matrix Requirements

### 2.1 Matrix Structure

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| MAT-1 | Complete Backend Inventory | Each backend endpoint has a row in the feature matrix, and endpoints may be grouped under a Capability ID. Multiple routes serving the same capability may share a row. |
| MAT-2 | Frontend entrypoint must be identified | For each backend capability: page/component path documented or marked "Missing" |
| MAT-3 | API client function must be identified | For each backend capability: frontend function that calls it documented or marked "Missing" |
| MAT-4 | Navigation path must be documented | For each frontend page: how user reaches it (sidebar, link, deep URL) documented |
| MAT-5 | Required permissions must be cross-referenced | Backend `require_permission()` must match frontend `RequirePermission` |
| MAT-6 | Status must be assigned | Each row marked: `Wired` / `Partial` / `Missing` / `Backend-only` / `Stub` |
| MAT-7 | Evidence notes must be provided | File paths and symbol names for both backend and frontend |
| MAT-8 | Data Contract Documentation | Each matrix row must document the request/response schema with links to TypeScript types, OpenAPI specs, or inline schema documentation |
| MAT-9 | State Ownership Documentation | Each matrix row must identify the state owner (React Query key, Zustand slice, Redux slice, or local state) |
| MAT-10 | UI Affordance Classification | Each matrix row must classify the UI pattern: list, detail, modal, background job, or N/A |
| MAT-11 | User Persona Assignment | Each matrix row must identify target user personas (cashier, manager, admin, system) |
| MAT-12 | Priority Assignment | Each matrix row must have a priority (P0: critical, P1: core, P2: nice-to-have, P3: defer) with rationale |
| MAT-13 | Implementation Ownership | Each matrix row must identify implementation owner (frontend, backend, both, or external) |

### 2.2 Status Definitions

| Status | Definition |
|--------|------------|
| **Wired** | Backend endpoint exists, frontend page/component calls it, navigation reaches it, runtime proof provided |
| **Partial** | Backend exists, frontend exists but incomplete (e.g., missing error handling, no nav entry) |
| **Missing** | Backend exists but no frontend consumption found |
| **Backend-only** | Intentionally no UI (e.g., webhooks, internal APIs) — must have documented rationale |
| **Stub** | Endpoint exists but returns placeholder/mock data (e.g., "coming soon") |

---

## 3. Navigation Correctness Requirements

### 3.1 Reachability

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| NAV-1 | Every page must be reachable via intended navigation | Manual test confirms sidebar/topbar/link reaches each page |
| NAV-2 | No orphan pages | Every page component in `features/*/pages/` has a route in `App.tsx` or sub-router |
| NAV-3 | Deep links must load correctly | Direct URL navigation (e.g., `/vendor-bills/123`) loads correct component with params |
| NAV-4 | Dynamic routes must resolve | All `:id`, `:caseId`, `:templateId` params correctly passed to components |

### 3.2 Auth & Permission Guards

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| NAV-5 | Unauthenticated access redirects to login | Accessing protected route without token redirects to `/login` |
| NAV-6 | Unauthorized access shows access-denied | Accessing route without required permission redirects to `/access-denied` |
| NAV-7 | 401/403 responses handled consistently | API errors with 401/403 status trigger appropriate UI response |
| NAV-8 | Route guards match backend permissions | Frontend `RequirePermission` strings match backend `require_permission()` strings |

### 3.3 Error States

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| NAV-9 | Unknown routes redirect to home | Catch-all `*` route redirects to `/` |
| NAV-10 | Loading states displayed | Pages show loading indicator while fetching data |
| NAV-11 | Error states displayed | API failures show user-friendly error message |
| NAV-12 | Empty states displayed | Lists with no data show appropriate empty state UI |

### 3.4 Layout & Navigation De-duplication

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| NAV-13 | Single Primary Navigation Surface | At any route, only one primary nav UI renders (rail OR sidebar OR bottom nav). No screen shows duplicated nav items in two places at once. |
| NAV-14 | Layout Variant Mapping | Every route declares a layout variant: PublicLayout, AppLayout, SettingsLayout, FullscreenLayout (or equivalents). No route accidentally wraps a "navigation page" inside AppLayout if AppLayout already contains nav. |
| NAV-15 | Navigation Source of Truth | Nav items are defined once (e.g., navConfig.ts or useConfig().navigation) and consumed by all nav UIs. No duplicate hardcoded nav lists in pages/components. |
| NAV-16 | Dashboard Quick Actions vs Navigation | "Quick Actions" are actions, not a second nav. Quick actions do not mirror the sidebar list; they're task buttons. |

---

## 4. Implementation Requirements

### 4.1 Wiring Completeness

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| IMP-1 | Backend-only features must be documented | If no UI intended, rationale documented in matrix |
| IMP-2 | Missing wiring must be implemented or deferred | Each "Missing" status either gets UI or explicit deferral with ticket |
| IMP-3 | Partial wiring must be completed | Each "Partial" status gets remaining work identified and implemented |
| IMP-4 | Stub endpoints must be labeled | UI must indicate "coming soon" or feature-flag gate stub endpoints |

### 4.2 No-Delete Policy

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| IMP-5 | No code deletion | Dead code quarantined to `archive/` with mapping log, not deleted |
| IMP-6 | Quarantine rationale documented | Each quarantined file has entry in `archive/code/README.md` |
| IMP-7 | Route removal requires mapping | Removed routes documented in `audit/QUARANTINE_LOG.md` |
| IMP-8 | Stub endpoint labeling | Stub endpoints documented in `audit/STUB_ENDPOINTS.md` with UI indication |
| IMP-9 | Orphan UI Resolution Policy | Every orphan page is either: routed + linked intentionally, OR feature-flagged intentionally, OR quarantined with a mapping log |
| IMP-10 | Duplicate Capability Consolidation | If two UI paths duplicate the same capability, choose one canonical path and document the other as legacy/quarantined |

---

## 5. Quality Gates

### 5.1 Build & Test

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| QG-1 | Backend builds without errors | `cargo build --release` succeeds |
| QG-2 | Frontend builds without errors | `npm run build` succeeds |
| QG-3 | Backend tests pass | `cargo test` passes or failures documented as TODO |
| QG-4 | Frontend tests pass | `npm run test:ci` passes or failures documented as TODO |
| QG-5 | TypeScript compiles | `npx tsc --noEmit` succeeds |
| QG-6 | Linting passes | `npm run lint` succeeds or warnings documented |

### 5.2 Documentation

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| QG-7 | Audit outputs exist | `audit/ROUTES_BACKEND.md`, `audit/ROUTES_FRONTEND.md`, `audit/FEATURE_MATRIX.md` created |
| QG-8 | Evidence links valid | All file paths in audit docs point to existing files |
| QG-9 | START_HERE updated | `START_HERE.md` links to audit outputs |
| QG-10 | Route Inventory Drift Check | A script compares backend route list vs audit doc and frontend route list vs audit doc. CI fails (or prints warnings) if drift exceeds threshold. |
| QG-11 | E2E Smoke Tests Policy | Either Playwright runs in CI, or there's a documented manual run command with required environment variables |

---

## 6. Evidence Requirements

### 6.1 Source References

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| EV-1 | Every claim has file path | No assertion without `path/to/file.ext` reference |
| EV-2 | Every claim has symbol name | Function, component, or route name specified |
| EV-3 | Uncertain items labeled | Items needing manual verification marked "needs manual confirm" |

### 6.2 Existing Audit Integration

| ID | Requirement | Acceptance Criteria |
|----|-------------|---------------------|
| EV-4 | Existing audits referenced | `audit/ROUTES_BACKEND.md`, `audit/ROUTES_FRONTEND.md`, `audit/DOCS_VS_CODE_MATRIX.md` incorporated |
| EV-5 | Conflicts documented | Contradictions between docs and code recorded, not silently resolved |
| EV-6 | Runtime Proof for "Wired" Status | For a matrix row to be marked "Wired", provide one runtime proof: network request screenshot/log, curl command + response sample, or Playwright trace showing console-free load |

---

## Appendix A: Known Backend Route Categories

Based on `backend/crates/server/src/main.rs` (lines 200-950):

1. **Public (no auth)**: `/health`, `/api/capabilities`, `/api/config`, `/api/fresh-install/*`
2. **Auth**: `/api/auth/login`, `/api/auth/logout`, `/api/auth/current-user`
3. **Dashboard**: `/api/stats/*`
4. **Products**: `/api/products/*`, `/api/inventory/*`
5. **Customers**: `/api/customers/*`
6. **Users**: `/api/users/*`, `/api/admin/users`
7. **Layaway**: `/api/layaways/*`
8. **Work Orders**: `/api/work-orders/*`
9. **Commission**: `/api/commissions/*`
10. **Loyalty/Pricing**: `/api/loyalty/*`
11. **Credit**: `/api/credit/*`
12. **Gift Cards**: `/api/gift-cards/*`
13. **Promotions**: `/api/promotions/*`
14. **Stores/Stations**: `/api/stores/*`, `/api/stations/*`
15. **Audit Logs**: `/api/audit-logs/*`
16. **Reporting**: `/api/reports/*`
17. **Sync**: `/api/sync/*`, `/api/sync-config/*`, `/api/sync-operations/*`
18. **Conflicts**: `/api/conflicts/*`
19. **Alerts**: `/api/alerts/*`
20. **Barcodes**: `/api/barcodes/*`
21. **Files**: `/api/files/*`
22. **Units**: `/api/units/*`
23. **Backups**: `/api/backups/*`
24. **Vendors**: `/api/vendors/*`, `/api/vendor-bills/*`
25. **WooCommerce**: `/api/woocommerce/*`
26. **QuickBooks**: `/api/quickbooks/*`
27. **Integrations**: `/api/integrations/*`
28. **Webhooks**: `/api/webhooks/*`
29. **Settings**: `/api/settings/*`
30. **Feature Flags**: `/api/feature-flags/*`
31. **OCR**: `/api/ocr/*`
32. **Review Cases**: `/api/review-cases/*`
33. **Export**: `/api/export/*`
34. **Theme**: `/api/theme/*`

---

## Appendix B: Known Frontend Routes

Based on `frontend/src/App.tsx` and `frontend/src/features/settings/SettingsRouter.tsx`:

**Public Routes**:
- `/fresh-install` → `FreshInstallWizard`
- `/login` → `LoginPage`
- `/access-denied` → `AccessDeniedPage`

**Protected Routes** (under `AppLayout`):
- `/` → `HomePage`
- `/sell` → `SellPage` (permission: `access_sell`)
- `/lookup` → `LookupPage` (permission: `access_sell`)
- `/warehouse` → `WarehousePage` (permission: `access_warehouse`)
- `/documents` → `DocumentsPage` (permission: `access_warehouse`)
- `/vendor-bills` → `BillHistory` (permission: `access_warehouse`)
- `/vendor-bills/upload` → `BillUpload` (permission: `upload_vendor_bills`)
- `/vendor-bills/:id` → `BillReview` (permission: `view_vendor_bills`)
- `/vendor-bills/templates` → `TemplateManagerPage` (permission: `access_warehouse`)
- `/vendor-bills/templates/:templateId` → `VendorTemplateEditorPage` (permission: `access_warehouse`)
- `/customers` → `CustomersPage` (permission: `access_sell`)
- `/reporting` → `ReportingPage` (permission: `access_admin`)
- `/admin` → `AdminPage` (permission: `access_admin`)
- `/admin/capabilities` → `CapabilitiesDashboardPage` (permission: `access_admin`)
- `/settings/*` → `SettingsRouter` (permission: `access_admin`)
- `/review` → `ReviewPage` (permission: `review_vendor_bills`)
- `/review/:caseId` → `ReviewCaseDetailPage` (permission: `review_vendor_bills`)
- `/forms` → `FormTemplatesPage` (permission: `access_admin`)
- `/exports` → `ExportsPage` (permission: `access_admin`)

**Settings Sub-Routes** (under `/settings`):
- `/settings` → `SettingsPage`
- `/settings/preferences` → `MyPreferencesPage`
- `/settings/integrations` → `IntegrationsPage`
- `/settings/data` → `DataManagementPage`
- `/settings/hardware` → `HardwarePage`
- `/settings/network` → `NetworkPage`
- `/settings/performance` → `PerformancePage`
- `/settings/features` → `FeatureFlagsPage`
- `/settings/localization` → `LocalizationPage`
- `/settings/products` → `ProductConfigPage`
- `/settings/tax` → `TaxRulesPage`
- `/settings/stores` → `CompanyStoresPage`
- `/settings/sync` → `SyncDashboardPage`

---

## Appendix C: Known Handler Modules

Based on `backend/crates/server/src/handlers/mod.rs`:

```
alerts, audit, auth, backup, barcodes, cache, capabilities, commission, config,
conflicts, credit, customer, customers, data_management, export, feature_flags,
fresh_install, files, gift_card, google_drive_oauth, health, health_check,
integrations, inventory, layaway, loyalty, mappings, oauth_management,
ocr_operations, ocr_ingest, performance_export, product, product_advanced,
products, promotion, quickbooks, quickbooks_crud, quickbooks_transform,
quickbooks_invoice, quickbooks_sales, quickbooks_vendor, quickbooks_bill,
quickbooks_refund, reporting, reocr, review_cases, search_operations,
session_management, settings, settings_handlers, settings_crud, setup, stats,
stores, sync, sync_config, sync_operations, sync_history, units, unit_conversion,
user_handlers, users, vendor, vendor_bill, vendor_operations, webhooks,
woocommerce, woocommerce_bulk, woocommerce_variations, woocommerce_write,
work_order, sync_direction, credentials, audit_operations, backup_operations,
scheduler_operations, retention_operations, settings_resolution, id_mapping,
conflict_operations, file_operations, receiving_operations, tenant_operations,
supabase_operations, schema_operations, theme
```

---

## Appendix D: Database Migrations

Based on `backend/migrations/`:

| Migration | Purpose |
|-----------|---------|
| 001_initial_schema.sql | Core tables |
| 002_sales_customer_management.sql | Sales, customers |
| 003_offline_sync.sql | Sync queue, conflicts |
| 004_products_and_fitment.sql | Products, categories |
| 005_enhance_user_model.sql | User fields |
| 006_add_user_store_station.sql | Multi-store |
| 007_seed_default_admin.sql | Default admin user |
| 008_backup_subsystem.sql | Backup tables |
| 009_add_tenant_id.sql | Multi-tenant |
| 010_add_tenant_id_to_backups.sql | Tenant isolation |
| 011_backup_download_tokens.sql | Secure downloads |
| 012_product_search_index.sql | Search optimization |
| 013_product_variants_table.sql | Product variants |
| 014_product_relationships_table.sql | Related products |
| 015_product_price_history_table.sql | Price tracking |
| 016_product_templates_table.sql | Product templates |
| 017_vendors_table.sql | Vendor management |
| 018_vendor_bills_table.sql | Vendor bills |
| 019_vendor_bill_parses_table.sql | OCR parsing |
| 020_vendor_bill_lines_table.sql | Bill line items |
| 021_create_backups_table.sql | Backup metadata |
| 022_vendor_sku_aliases_table.sql | SKU mapping |
| 023_performance_indexes.sql | Query optimization |
| 024_vendor_templates_table.sql | Vendor templates |
| 025_integration_credentials.sql | OAuth tokens |
| 026_field_mappings.sql | Field mapping |
| 027_field_mappings_extended.sql | Extended mappings |
| 028_sync_direction_control.sql | Sync direction |
| 029_sync_schedules.sql | Scheduled sync |
| 030_oauth_states.sql | OAuth state |
| 031_confirmation_tokens.sql | Confirmation flow |
| 032_sync_logs.sql | Sync history |
| 033_webhook_configs.sql | Webhook setup |
| 034_notification_configs.sql | Notifications |
| 035_settings_table.sql | Settings storage |
| 036_feature_flags_table.sql | Feature flags |
| 037_add_display_name_to_users.sql | User display name |
| 038_integration_sync_state.sql | Sync state |
| 039_remove_mock_data.sql | Mock data cleanup |
| 040_theme_preferences.sql | Theme settings |
| 041_settings_registry_keys.sql | Settings registry |
| 042_accounting_tables.sql | Accounting |
| 043_review_cases_tables.sql | Review workflow |
