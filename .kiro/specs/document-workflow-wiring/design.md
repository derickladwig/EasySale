# Backend-Frontend Wiring Audit — Technical Design

**Version**: 2.0  
**Date**: 2026-01-26  
**Status**: Draft  
**Purpose**: Technical approach for executing the wiring audit with layout/nav de-duplication, data contracts, runtime evidence, and regression guardrails

---

## 0. Design Enhancements (v2.0)

### 0.1 Layout & Navigation De-duplication Strategy

**Problem**: Duplicate navigation rendering (e.g., sidebar nav appearing twice on same screen)

**Detection Method**:
1. **Source Mapping**: Identify all locations where navigation is defined
   - Config files (`navConfig.ts`, `useConfig().navigation`)
   - Hardcoded nav lists in components
   - Layout components that render nav
2. **Render Mapping**: Identify all locations where navigation is rendered
   - `AppLayout.tsx` sidebar
   - Icon rail components
   - Bottom nav components
   - Any page-level navigation components
3. **Layout Nesting Analysis**: Document how layouts nest
   - `App.tsx` → `AppLayout` → page
   - `App.tsx` → `AppLayout` → `SettingsRouter` → page
   - Identify cases where page contains nav AND layout contains nav

**Fix Strategy**:
1. Enforce single source of truth for nav config
2. Remove nav from page content if layout already provides it
3. Add layout variant prop to routes (PublicLayout, AppLayout, SettingsLayout, FullscreenLayout)
4. Add Playwright visual regression test for representative routes

**Output**: `audit/LAYOUT_MAP.md`, `audit/NAV_SOURCES.md`

### 0.2 Data Contract Documentation Strategy

**Problem**: Matrix shows "Wired" but doesn't document what data flows between backend and frontend

**Enhancement**: Add columns to feature matrix:
- **Request Schema**: Link to TypeScript interface or inline schema
- **Response Schema**: Link to TypeScript interface or inline schema
- **State Owner**: React Query key, Zustand slice, Redux slice, or local state
- **UI Affordance**: list, detail, modal, background job, N/A
- **User Persona**: cashier, manager, admin, system
- **Priority**: P0 (critical), P1 (core), P2 (nice-to-have), P3 (defer) + rationale
- **Implementation Owner**: frontend, backend, both, external

**Extraction Method**:
1. For backend: Parse Rust handler function signatures for request/response types
2. For frontend: Parse TypeScript API client functions for types
3. For state: Search for React Query `useQuery` keys, Zustand store slices
4. For UI: Classify based on component type (list page, detail page, modal, etc.)

**Output**: Enhanced `audit/FEATURE_MATRIX.md` with additional columns

### 0.3 Runtime Evidence Strategy

**Problem**: Grep shows code exists but doesn't prove it works at runtime

**Enhancement**: Require runtime proof for "Wired" status:
- **Network Request Log**: Browser DevTools Network tab screenshot showing successful request
- **curl Command**: Working curl command + response sample
- **Playwright Trace**: Playwright trace showing page load without console errors

**Collection Method**:
1. Manual testing with DevTools open
2. Automated Playwright tests with trace collection
3. curl commands for API endpoints

**Output**: `audit/RUNTIME_PROOF/` directory with screenshots/logs/traces

### 0.4 Regression Guardrails Strategy

**Problem**: Audit is point-in-time; code can drift

**Enhancement**: Add automated checks:
1. **Route Drift Check**: Script compares audit docs vs actual code
   - Parse `audit/ROUTES_BACKEND.md` for expected routes
   - Parse `backend/crates/server/src/main.rs` for actual routes
   - Report missing/extra routes
   - Fail CI if drift exceeds threshold
2. **Nav Deduplication Test**: Playwright test asserts single nav render
3. **Permission Matrix Test**: Script verifies frontend/backend permission strings match

**Implementation**:
- `scripts/check-route-drift.js` (Node.js script)
- `frontend/e2e/nav-deduplication.spec.ts` (Playwright test)
- `scripts/check-permissions.js` (Node.js script)

**Output**: `audit/ROUTE_DRIFT_REPORT.md`, test results in CI

---

## 1. System Inventory Approach

### 1.1 Backend Route Inventory Method

**Source File**: `backend/crates/server/src/main.rs`

**Route Registration Patterns**:
```rust
// Pattern 1: Direct service registration
.service(handlers::auth::login)

// Pattern 2: Resource with routes
.service(
    web::resource("/api/products")
        .route(web::get().to(handlers::products::get_products))
)

// Pattern 3: Scoped configuration
.service(
    web::scope("/api/fresh-install")
        .wrap(middleware::ProfileGate::new())
        .service(web::resource("/check").route(...))
)

// Pattern 4: Configure function
.configure(handlers::integrations::configure)
```

**Extraction Method**:
1. Parse `main.rs` lines 200-950 for all `.service()`, `.route()`, `.configure()` calls
2. For each `.configure()`, read the referenced handler module's `configure` function
3. Extract: HTTP method, path, handler function, middleware wrappers
4. Cross-reference with `handlers/mod.rs` for module completeness

**Output Format** (`audit/ROUTES_BACKEND.md`):
```markdown
| Route | Method | Handler | Middleware | Status | Notes |
|-------|--------|---------|------------|--------|-------|
| /api/auth/login | POST | handlers::auth::login | ContextExtractor | ✅ | Standard login |
```

### 1.2 Backend Capability Buckets

| Bucket | Handler Modules | Route Prefix |
|--------|-----------------|--------------|
| **Auth** | `auth`, `session_management` | `/api/auth/*` |
| **Products** | `product`, `product_advanced`, `products`, `inventory` | `/api/products/*`, `/api/inventory/*` |
| **Customers** | `customer`, `customers` | `/api/customers/*` |
| **Users** | `user_handlers`, `users` | `/api/users/*`, `/api/admin/users` |
| **Sales** | `layaway`, `work_order`, `commission`, `promotion` | `/api/layaways/*`, `/api/work-orders/*`, etc. |
| **Finance** | `credit`, `gift_card`, `loyalty` | `/api/credit/*`, `/api/gift-cards/*`, `/api/loyalty/*` |
| **Reporting** | `reporting`, `stats`, `performance_export` | `/api/reports/*`, `/api/stats/*` |
| **Sync** | `sync`, `sync_config`, `sync_operations`, `sync_history`, `conflicts` | `/api/sync/*`, `/api/conflicts/*` |
| **Integrations** | `quickbooks*`, `woocommerce*`, `integrations`, `webhooks` | `/api/quickbooks/*`, `/api/woocommerce/*` |
| **Vendor Bills** | `vendor`, `vendor_bill`, `vendor_operations`, `ocr_*`, `reocr` | `/api/vendors/*`, `/api/vendor-bills/*`, `/api/ocr/*` |
| **Admin** | `settings*`, `feature_flags`, `config`, `stores`, `audit*` | `/api/settings/*`, `/api/feature-flags/*` |
| **Files** | `files`, `file_operations`, `backup*`, `export` | `/api/files/*`, `/api/backups/*`, `/api/export/*` |
| **System** | `health*`, `capabilities`, `cache`, `schema_operations` | `/health`, `/api/capabilities`, `/api/cache/*` |
| **Review** | `review_cases` | `/api/review-cases/*` |
| **Theme** | `theme` | `/api/theme/*` |

### 1.3 Database Tables Inventory

**Source**: `backend/migrations/*.sql` and `backend/crates/server/src/db/migrations.rs`

**Extraction Method**:
1. List all migration files from `migrations.rs` (lines 22-64)
2. Parse each SQL file for `CREATE TABLE` statements
3. Document table name, columns, foreign keys, indexes

**Output Format** (`audit/DB_SCHEMA.md`):
```markdown
| Table | Migration | Purpose | Tenant-Isolated |
|-------|-----------|---------|-----------------|
| users | 001 | User accounts | Yes (tenant_id) |
```

---

## 2. Frontend Inventory Approach

### 2.1 Router Map

**Source Files**:
- `frontend/src/App.tsx` (main routes)
- `frontend/src/features/settings/SettingsRouter.tsx` (settings sub-routes)

**Route Structure**:
```
/ (AppLayout wrapper with RequireAuth)
├── / (index) → HomePage
├── /sell → SellPage (RequirePermission: access_sell)
├── /lookup → LookupPage (RequirePermission: access_sell)
├── /warehouse → WarehousePage (RequirePermission: access_warehouse)
├── /documents → DocumentsPage (RequirePermission: access_warehouse)
├── /vendor-bills → BillHistory (RequirePermission: access_warehouse)
├── /vendor-bills/upload → BillUpload (RequirePermission: upload_vendor_bills)
├── /vendor-bills/:id → BillReview (RequirePermission: view_vendor_bills)
├── /vendor-bills/templates → TemplateManagerPage (RequirePermission: access_warehouse)
├── /vendor-bills/templates/:templateId → VendorTemplateEditorPage
├── /customers → CustomersPage (RequirePermission: access_sell)
├── /reporting → ReportingPage (RequirePermission: access_admin)
├── /admin → AdminPage (RequirePermission: access_admin)
├── /admin/capabilities → CapabilitiesDashboardPage (RequirePermission: access_admin)
├── /settings/* → SettingsRouter (RequirePermission: access_admin)
│   ├── /settings → SettingsPage
│   ├── /settings/preferences → MyPreferencesPage
│   ├── /settings/integrations → IntegrationsPage
│   ├── /settings/data → DataManagementPage
│   ├── /settings/hardware → HardwarePage
│   ├── /settings/network → NetworkPage
│   ├── /settings/performance → PerformancePage
│   ├── /settings/features → FeatureFlagsPage
│   ├── /settings/localization → LocalizationPage
│   ├── /settings/products → ProductConfigPage
│   ├── /settings/tax → TaxRulesPage
│   ├── /settings/stores → CompanyStoresPage
│   └── /settings/sync → SyncDashboardPage
├── /review → ReviewPage (RequirePermission: review_vendor_bills)
├── /review/:caseId → ReviewCaseDetailPage
├── /forms → FormTemplatesPage (RequirePermission: access_admin)
├── /exports → ExportsPage (RequirePermission: access_admin)
└── * → Navigate to /
```

### 2.2 Layout Shells

| Shell | File | Purpose |
|-------|------|---------|
| `AppLayout` | `frontend/src/AppLayout.tsx` | Main app chrome (sidebar, topbar, content area) |
| `LoginThemeProvider` | `frontend/src/features/auth/theme/LoginThemeProvider.tsx` | Login page theming |
| `SettingsRouter` | `frontend/src/features/settings/SettingsRouter.tsx` | Settings sub-navigation |

### 2.3 Navigation Components

**Sidebar Navigation** (`AppLayout.tsx` lines 140-180):
- Reads from `useConfig().navigation` array
- Filters by `hasPermission(item.permission)`
- Renders `DynamicIcon` + label + optional badge

**Navigation Data Source**: Configuration-driven via `ConfigProvider`

### 2.4 API Client Layer Map

**Primary Client**: `frontend/src/common/utils/apiClient.ts`
- Singleton `ApiClient` class
- Methods: `get()`, `post()`, `put()`, `delete()`
- Auto-attaches JWT from `localStorage.getItem('auth_token')`
- Base URL: `VITE_API_URL` or `http://localhost:8923` (dev) / relative (prod)

**Service Files**:
| File | Endpoints Called |
|------|------------------|
| `frontend/src/services/settingsApi.ts` | `/api/settings/preferences`, `/api/settings/localization`, `/api/settings/network`, `/api/settings/performance` |
| `frontend/src/services/syncApi.ts` | `/api/sync/*` |
| `frontend/src/services/capabilities.ts` | `/api/capabilities` |

**Feature-Specific API Calls**: Located in `frontend/src/features/*/api/` or inline in pages

---

## 3. Traceability Model

### 3.1 Feature Matrix Format

**File**: `audit/FEATURE_MATRIX.md`

| Column | Description |
|--------|-------------|
| Capability ID | Unique identifier (e.g., `PROD-001`) |
| Backend Endpoint | HTTP method + path (e.g., `GET /api/products`) |
| Backend Files | Handler file + function (e.g., `handlers/product.rs::list_products`) |
| Frontend Route | React Router path (e.g., `/lookup`) |
| Frontend Files | Page component (e.g., `features/lookup/pages/LookupPage.tsx`) |
| Nav Entry | How user reaches it (e.g., "Sidebar: Lookup") |
| Auth/Roles | Permission required (e.g., `access_sell`) |
| Status | `Wired` / `Partial` / `Missing` / `Backend-only` / `Stub` |
| Evidence Notes | File paths, line numbers, search queries |

### 3.2 Status Criteria

| Status | Backend | Frontend Route | Frontend API Call | Navigation |
|--------|---------|----------------|-------------------|------------|
| **Wired** | ✅ Exists | ✅ Exists | ✅ Calls endpoint | ✅ Reachable |
| **Partial** | ✅ Exists | ✅ Exists | ⚠️ Missing/incomplete | ⚠️ Missing/incomplete |
| **Missing** | ✅ Exists | ❌ None | ❌ None | ❌ None |
| **Backend-only** | ✅ Exists | N/A (documented) | N/A | N/A |
| **Stub** | ⚠️ Placeholder | May exist | May exist | May exist |

---

## 4. Wiring Patterns

### 4.1 Standard List/Detail Page Pattern

**Backend**:
```rust
// List endpoint
.service(web::resource("/api/items").route(web::get().to(handlers::items::list_items)))
// Detail endpoint
.service(web::resource("/api/items/{id}").route(web::get().to(handlers::items::get_item)))
```

**Frontend**:
```tsx
// Route
<Route path="items" element={<ItemsPage />} />
<Route path="items/:id" element={<ItemDetailPage />} />

// API call in page
const { data } = useQuery(['items'], () => apiClient.get('/api/items'));
```

### 4.2 Form Submission Pattern

**Backend**:
```rust
.service(web::resource("/api/items").route(web::post().to(handlers::items::create_item)))
```

**Frontend**:
```tsx
const mutation = useMutation((data) => apiClient.post('/api/items', data));
```

### 4.3 File Upload Pattern

**Backend**:
```rust
.service(web::resource("/api/vendor-bills/upload")
    .route(web::post().to(handlers::vendor_bill::upload_bill))
    .wrap(require_permission("upload_vendor_bills")))
```

**Frontend**:
```tsx
// Multipart form data upload
const formData = new FormData();
formData.append('file', file);
await fetch('/api/vendor-bills/upload', { method: 'POST', body: formData });
```

### 4.4 Export Pattern

**Backend**:
```rust
.service(web::resource("/api/reports/export")
    .route(web::post().to(handlers::reporting::export_report)))
```

**Frontend**:
```tsx
// Trigger download
const blob = await apiClient.post('/api/reports/export', params);
// Create download link
```

### 4.5 Permission Guard Pattern

**Backend**:
```rust
.wrap(require_permission("manage_settings"))
```

**Frontend**:
```tsx
<RequirePermission permission="manage_settings">
  <SettingsPage />
</RequirePermission>
```

---

## 5. Risk & Edge Cases

### 5.1 Known Stubs

| Endpoint | File | Issue |
|----------|------|-------|
| `POST /api/reports/export` | `handlers/reporting.rs` | Returns "Export functionality coming soon" |
| `POST /api/data-management/export` | `handlers/data_management.rs` | Returns mock record counts |

**Evidence**: `audit/DOCS_VS_CODE_MATRIX.md` row for Task 21.1

### 5.2 Hardcoded Values

| Location | Issue |
|----------|-------|
| `handlers/integrations.rs` | QuickBooks OAuth redirect URI hardcoded to `http://localhost:7945/...` |
| `main.rs` lines 115-125 | `STORE_ID`/`TENANT_ID` default fallbacks (validated in prod) |

### 5.3 Mismatched Schemas

- **Risk**: Frontend expects different response shape than backend provides
- **Detection**: TypeScript type errors, runtime `undefined` access
- **Mitigation**: Generate types from backend OpenAPI spec (if available)

### 5.4 Unhandled 404s

- **Risk**: Dynamic routes (`:id`) may receive invalid IDs
- **Detection**: Test with non-existent IDs
- **Mitigation**: Backend returns 404, frontend shows error state

### 5.5 CORS/Auth Token Flow

- **Config**: `Cors::permissive()` in `main.rs` (dev), nginx proxy (prod)
- **Token**: JWT in `Authorization: Bearer` header
- **Risk**: Token expiry not handled gracefully
- **Mitigation**: 401 response triggers logout/redirect

### 5.6 Fresh Install Route Gating

- **Issue**: `/api/fresh-install/*` should be blocked after initial setup
- **Current**: Gated by `ProfileGate` middleware
- **Verification**: Test in prod profile after database has data

---

## 6. Outputs

### 6.1 Required Audit Files

| File | Purpose | Generated By |
|------|---------|--------------|
| `audit/ROUTES_BACKEND.md` | Complete backend route inventory | Epic 0, Task 0.1 |
| `audit/ROUTES_FRONTEND.md` | Complete frontend route inventory | Epic 0, Task 0.2 |
| `audit/FEATURE_MATRIX.md` | End-to-end wiring matrix | Epic 1 |
| `audit/NAV_AUDIT.md` | Navigation reachability audit | Epic 0, Task 0.3 |
| `audit/API_CLIENT_MAP.md` | Frontend API call inventory | Epic 0, Task 0.4 |
| `audit/DB_SCHEMA.md` | Database table inventory | Epic 0, Task 0.5 |

### 6.2 Existing Audit Files (Incorporate)

| File | Status |
|------|--------|
| `audit/ROUTES_BACKEND.md` | Exists (2026-01-25), update if needed |
| `audit/ROUTES_FRONTEND.md` | Exists (2026-01-25), update if needed |
| `audit/DOCS_VS_CODE_MATRIX.md` | Exists, incorporate findings |
| `audit/PRODUCTION_READINESS_GAPS.md` | Exists, incorporate findings |

---

## 7. Tooling

### 7.1 Route Extraction Scripts

**Backend Route Extraction** (manual grep):
```bash
grep -n "\.service\|\.route\|\.configure" backend/crates/server/src/main.rs
```

**Frontend Route Extraction** (manual grep):
```bash
grep -n "<Route" frontend/src/App.tsx frontend/src/features/settings/SettingsRouter.tsx
```

### 7.2 API Call Detection

```bash
grep -rn "apiClient\.\|api\.get\|api\.post\|api\.put\|api\.delete\|fetch(" frontend/src/
```

### 7.3 Permission String Extraction

**Backend**:
```bash
grep -rn "require_permission" backend/crates/server/src/
```

**Frontend**:
```bash
grep -rn "RequirePermission\|hasPermission" frontend/src/
```

---

## 8. Validation Approach

### 8.1 Manual Test Checklist

For each frontend route:
1. Navigate via sidebar/menu
2. Navigate via direct URL
3. Verify data loads from backend
4. Verify error states (disconnect backend)
5. Verify permission denial (wrong role)

### 8.2 Automated Smoke Tests

```typescript
// Example Playwright test
test('all routes load without error', async ({ page }) => {
  const routes = ['/sell', '/lookup', '/warehouse', ...];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('.error-boundary')).not.toBeVisible();
  }
});
```

---

## 9. Implementation Sequence

```
Epic 0: Evidence Dump
├── Task 0.1: Backend route map
├── Task 0.2: Frontend route map
├── Task 0.3: Navigation map
├── Task 0.4: API client map
└── Task 0.5: DB schema map

Epic 1: Feature Matrix Build
├── Task 1.1: Products/Inventory matrix rows
├── Task 1.2: Customers matrix rows
├── Task 1.3: Sales (layaway, work orders, etc.) matrix rows
├── Task 1.4: Finance (credit, gift cards, loyalty) matrix rows
├── Task 1.5: Reporting matrix rows
├── Task 1.6: Sync/Conflicts matrix rows
├── Task 1.7: Integrations matrix rows
├── Task 1.8: Vendor Bills/OCR matrix rows
├── Task 1.9: Admin/Settings matrix rows
├── Task 1.10: Files/Backups matrix rows
└── Task 1.11: Review/Theme matrix rows

Epic 2: Wiring Fixes
├── Task 2.x: For each Missing/Partial status...

Epic 3: Validation
├── Task 3.1: Manual test checklist
├── Task 3.2: Automated smoke tests
└── Task 3.3: Permission matrix verification

Epic 4: Documentation
├── Task 4.1: Update START_HERE.md
└── Task 4.2: Update README.md
```
