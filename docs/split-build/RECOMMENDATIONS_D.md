# EasySale Split Build Recommendations — Agent D

**Generated:** 2026-01-25  
**Agent:** D — Runtime Capabilities Matrix & Bloat Audit

---

## 1. LITE Build Definition (Minimal POS)

### Core Capabilities for LITE
The LITE build should include only what's essential for a basic point-of-sale operation:

| Category | Included | Excluded |
|----------|----------|----------|
| **Auth** | Login, sessions, basic RBAC | - |
| **Products** | CRUD, search, barcode lookup | Variants, relationships, templates, fitment |
| **Sales** | Basic transactions | Layaway, work orders, commissions, gift cards |
| **Customers** | Basic CRUD | Loyalty, store credit, credit accounts |
| **Inventory** | Stock levels, basic receiving | OCR ingest, vendor bill automation |
| **Reporting** | Daily sales, basic dashboard | Advanced reports, exports |
| **Admin** | Users, stores, basic settings | Feature flags, audit logs, integrations |
| **Sync** | Basic offline queue | Multi-store sync, conflict resolution |

### LITE Handler Modules to Include
```
handlers/auth.rs
handlers/product.rs (basic endpoints only)
handlers/customer.rs
handlers/customers.rs
handlers/inventory.rs
handlers/stats.rs
handlers/config.rs
handlers/health.rs
handlers/health_check.rs (basic only)
handlers/barcodes.rs
handlers/stores.rs
handlers/user_handlers.rs
handlers/users.rs
handlers/settings.rs
handlers/settings_crud.rs
handlers/setup.rs
handlers/fresh_install.rs
handlers/network.rs
handlers/theme.rs
handlers/cache.rs
handlers/tenant_operations.rs (basic only)
handlers/sync.rs (basic queue only)
```

### LITE Database Tables
```sql
-- Core tables only
tenants, users, sessions, products, customers, 
sales_transactions, sales_line_items, sync_queue, 
sync_state, settings, stores, stations, theme_preferences
```

---

## 2. FULL Build Definition (Enterprise)

### Additional Capabilities for FULL
Everything in LITE plus:

| Category | Additional Features |
|----------|---------------------|
| **Products** | Variants, relationships, price history, templates, alternate SKUs, fitment |
| **Sales** | Layaway, work orders, commissions, gift cards, promotions, loyalty, credit accounts |
| **Inventory** | OCR ingest, vendor bill automation, review cases, vendor templates |
| **Reporting** | All reports, CSV export, performance metrics |
| **Integrations** | WooCommerce, QuickBooks, Supabase, Google Drive |
| **Admin** | Feature flags, audit logs, backup/restore, schema operations |
| **Sync** | Full orchestration, conflict resolution, scheduling |
| **Accounting** | Chart of accounts, journal entries |

### FULL-Only Handler Modules
```
handlers/product_advanced.rs
handlers/layaway.rs
handlers/work_order.rs
handlers/commission.rs
handlers/gift_card.rs
handlers/promotion.rs
handlers/loyalty.rs
handlers/credit.rs
handlers/reporting.rs (full)
handlers/export.rs
handlers/performance_export.rs
handlers/ocr_ingest.rs
handlers/ocr_operations.rs
handlers/review_cases.rs
handlers/reocr.rs
handlers/vendor_bill.rs
handlers/vendor.rs
handlers/vendor_operations.rs
handlers/woocommerce*.rs (all 4 files)
handlers/quickbooks*.rs (all 7 files)
handlers/supabase_operations.rs
handlers/google_drive_oauth.rs
handlers/oauth_management.rs
handlers/integrations.rs
handlers/mappings.rs
handlers/webhooks.rs
handlers/sync_config.rs
handlers/sync_operations.rs
handlers/sync_direction.rs
handlers/sync_history.rs
handlers/conflicts.rs
handlers/conflict_operations.rs
handlers/feature_flags.rs
handlers/audit.rs
handlers/audit_operations.rs
handlers/backup.rs
handlers/backup_operations.rs
handlers/scheduler_operations.rs
handlers/retention_operations.rs
handlers/schema_operations.rs
handlers/data_management.rs
handlers/id_mapping.rs
handlers/credentials.rs
handlers/alerts.rs
handlers/files.rs
handlers/file_operations.rs
handlers/receiving_operations.rs
handlers/search_operations.rs
handlers/settings_resolution.rs
handlers/unit_conversion.rs
handlers/units.rs
```

---

## 3. Identified Bloat

### 3.1 OCR/Document Processing Stack (FULL-only)
**Evidence:** `backend/crates/server/src/services/`

These services are compiled but only used for vendor bill automation:
```
services/document_ingest_service.rs
services/image_preprocessing.rs
services/mask_engine.rs
services/multi_pass_ocr.rs
services/ocr_engine.rs
services/ocr_job_processor.rs
services/ocr_orchestrator.rs
services/ocr_service.rs
services/orientation_service.rs
services/zone_cropper.rs
services/zone_detector_service.rs
services/parsing_service.rs
services/confidence_calibrator.rs
services/field_resolver.rs
services/early_stop_checker.rs
services/candidate_generator.rs
services/matching_engine.rs
services/validation_engine.rs
services/validation_rule_engine.rs
services/review_case_service.rs
services/review_queue_service.rs
services/review_session_service.rs
services/bill_ingest_service.rs
```

**Impact:** ~25 service files, significant binary size increase
**Recommendation:** Move to `ocr` Cargo feature, exclude from LITE

### 3.2 Integration Connectors (FULL-only)
**Evidence:** `backend/crates/server/src/connectors/`

```
connectors/woocommerce/
connectors/quickbooks/
connectors/supabase/
connectors/google_drive/
```

**Impact:** External API clients, OAuth flows, webhook handling
**Recommendation:** Move to `integrations` Cargo feature, exclude from LITE

### 3.3 Accounting Services (FULL-only)
**Evidence:** `backend/crates/server/src/services/`

```
services/accounting_integration_service.rs
services/ap_integration_service.rs
services/inventory_integration_service.rs
```

**Impact:** Journal entry generation, AP workflows
**Recommendation:** Already gated by `export` feature, ensure LITE excludes

### 3.4 Advanced Sync Infrastructure (FULL-only)
**Evidence:** `backend/crates/server/src/services/`

```
services/sync_orchestrator.rs
services/sync_scheduler.rs
services/sync_queue_processor.rs
services/sync_notifier.rs
services/sync_logger.rs
services/sync_direction_control.rs
services/conflict_resolver.rs
services/dry_run_executor.rs
services/bulk_operation_safety.rs
```

**Impact:** Multi-store sync, conflict resolution
**Recommendation:** Move to `sync` Cargo feature, LITE keeps basic queue only

### 3.5 Cleanup Engine (FULL-only)
**Evidence:** `backend/crates/server/src/services/cleanup_engine/`

Entire directory for document cleanup workflows.

**Impact:** Document processing cleanup
**Recommendation:** Move to `ocr` Cargo feature with OCR stack

---

## 4. Migration Strategy (LITE-Safe Schema Handling)

### 4.1 Conditional Migration Approach

Create a migration runner that checks build type:

```rust
// backend/crates/server/src/db/migrations.rs

pub async fn run_migrations(pool: &SqlitePool, build_type: BuildType) -> Result<()> {
    // Always run core migrations
    run_core_migrations(pool).await?;
    
    // Conditionally run FULL migrations
    if build_type == BuildType::Full {
        run_full_migrations(pool).await?;
    }
    
    Ok(())
}
```

### 4.2 Migration File Organization

```
backend/migrations/
├── core/                    # LITE + FULL (always run)
│   ├── 001_initial_schema.sql
│   ├── 002_products_basic.sql
│   ├── 003_customers_basic.sql
│   ├── 004_sales_transactions.sql
│   └── 005_sync_queue.sql
│
├── full/                    # FULL only
│   ├── 101_sales_management.sql      # layaways, work_orders, commissions
│   ├── 102_product_advanced.sql      # variants, relationships, templates
│   ├── 103_integrations.sql          # credentials, mappings, webhooks
│   ├── 104_ocr_document.sql          # ocr_jobs, review_cases, vendor_bills
│   ├── 105_accounting.sql            # chart_of_accounts, journal_entries
│   ├── 106_sync_advanced.sql         # sync_conflicts, sync_schedules
│   └── 107_admin_advanced.sql        # feature_flags, audit_log, backups
```

### 4.3 Existing Migrations to Split

| Current Migration | Target |
|-------------------|--------|
| `001_initial_schema.sql` | core/ |
| `002_sales_customer_management.sql` | full/101 (layaway, work_orders, commissions, gift_cards, promotions, loyalty, credit) |
| `003_offline_sync.sql` | Split: core/ (sync_queue, sync_state) + full/ (sync_conflicts, audit_log) |
| `004_products_and_fitment.sql` | Split: core/ (products) + full/ (vehicle_fitment) |
| `017_vendors_table.sql` | full/104 |
| `018_vendor_bills_table.sql` | full/104 |
| `025_integration_credentials.sql` | full/103 |
| `036_feature_flags_table.sql` | full/107 |
| `042_accounting_tables.sql` | full/105 |
| `043_review_cases_tables.sql` | full/104 |
| `046_ocr_jobs_table.sql` | full/104 |

---

## 5. Exact Files to Modify

### 5.1 Backend Cargo.toml — Add Feature Flags

**File:** `backend/crates/server/Cargo.toml`

```toml
[features]
default = ["lite"]
lite = []
full = ["lite", "ocr", "integrations", "sync-advanced", "accounting"]
ocr = []
integrations = []
sync-advanced = []
accounting = []
```

### 5.2 Backend main.rs — Conditional Route Registration

**File:** `backend/crates/server/src/main.rs`

Add conditional compilation for FULL-only routes:

```rust
// Line ~310 - After core routes
#[cfg(feature = "full")]
{
    // Layaway endpoints
    cfg.service(handlers::layaway::create_layaway)
       .service(handlers::layaway::get_layaway)
       // ... etc
    
    // Work order endpoints
    cfg.service(handlers::work_order::create_work_order)
       // ... etc
    
    // OCR endpoints
    cfg.service(
        web::resource("/api/ocr/ingest")
            .route(web::post().to(handlers::ocr_ingest::ingest_invoice))
    )
    // ... etc
}
```

### 5.3 Backend handlers/mod.rs — Conditional Module Exports

**File:** `backend/crates/server/src/handlers/mod.rs`

```rust
// Core handlers (always included)
pub mod auth;
pub mod product;
pub mod customer;
pub mod customers;
pub mod inventory;
pub mod stats;
pub mod config;
pub mod health;
pub mod barcodes;
pub mod stores;
pub mod user_handlers;
pub mod users;
pub mod settings;
pub mod settings_crud;
pub mod setup;
pub mod fresh_install;
pub mod network;
pub mod theme;
pub mod cache;
pub mod sync;  // basic queue only

// FULL-only handlers
#[cfg(feature = "full")]
pub mod product_advanced;
#[cfg(feature = "full")]
pub mod layaway;
#[cfg(feature = "full")]
pub mod work_order;
#[cfg(feature = "full")]
pub mod commission;
// ... etc for all FULL-only handlers
```

### 5.4 Backend services/mod.rs — Conditional Service Exports

**File:** `backend/crates/server/src/services/mod.rs`

```rust
// Core services
pub mod backup_service;
pub mod barcode_service;
pub mod password_service;
pub mod product_service;
pub mod tenant_resolver;
pub mod scheduler_service;

// OCR services (feature-gated)
#[cfg(feature = "ocr")]
pub mod document_ingest_service;
#[cfg(feature = "ocr")]
pub mod image_preprocessing;
#[cfg(feature = "ocr")]
pub mod mask_engine;
// ... etc

// Integration services (feature-gated)
#[cfg(feature = "integrations")]
pub mod google_drive_service;
#[cfg(feature = "integrations")]
pub mod token_refresh_service;
// ... etc

// Sync advanced services (feature-gated)
#[cfg(feature = "sync-advanced")]
pub mod sync_orchestrator;
#[cfg(feature = "sync-advanced")]
pub mod sync_scheduler;
#[cfg(feature = "sync-advanced")]
pub mod conflict_resolver;
// ... etc
```

### 5.5 Frontend App.tsx — Conditional Routes

**File:** `frontend/src/App.tsx`

Use environment variable or config to conditionally render routes:

```tsx
// Add build type detection
const buildType = import.meta.env.VITE_BUILD_TYPE || 'full';
const isFullBuild = buildType === 'full';

// In Routes:
{isFullBuild && (
  <>
    <Route path="reporting" element={<ReportingPage />} />
    <Route path="sales" element={<SalesManagementPage />} />
    <Route path="documents" element={<DocumentsPage />} />
    <Route path="vendor-bills/*" element={/* ... */} />
    <Route path="review/*" element={/* ... */} />
  </>
)}
```

### 5.6 Frontend Navigation — Conditional Menu Items

**File:** `frontend/src/nav/navConfig.ts`

```typescript
export const getNavItems = (buildType: 'lite' | 'full') => {
  const coreItems = [
    { path: '/', label: 'Home', icon: 'home' },
    { path: '/sell', label: 'Sell', icon: 'cart' },
    { path: '/lookup', label: 'Lookup', icon: 'search' },
    { path: '/warehouse', label: 'Warehouse', icon: 'warehouse' },
    { path: '/customers', label: 'Customers', icon: 'users' },
  ];
  
  const fullItems = [
    { path: '/reporting', label: 'Reporting', icon: 'chart' },
    { path: '/sales', label: 'Sales Mgmt', icon: 'dollar' },
    { path: '/documents', label: 'Documents', icon: 'file' },
    { path: '/vendor-bills', label: 'Vendor Bills', icon: 'receipt' },
    { path: '/review', label: 'Review', icon: 'check' },
  ];
  
  return buildType === 'full' 
    ? [...coreItems, ...fullItems]
    : coreItems;
};
```

---

## 6. Build Commands

### LITE Build
```bash
# Backend
cd backend/crates/server
cargo build --release --no-default-features --features lite

# Frontend
cd frontend
VITE_BUILD_TYPE=lite npm run build
```

### FULL Build
```bash
# Backend
cd backend/crates/server
cargo build --release --features full

# Frontend
cd frontend
VITE_BUILD_TYPE=full npm run build
```

---

## 7. Estimated Size Reduction

| Component | FULL Size | LITE Size | Reduction |
|-----------|-----------|-----------|-----------|
| Backend Binary | ~45 MB | ~25 MB | ~44% |
| Frontend Bundle | ~8 MB | ~5 MB | ~37% |
| Database Schema | 49 migrations | ~15 migrations | ~69% |
| Handler Modules | 85 files | ~25 files | ~70% |
| Service Modules | 70+ files | ~20 files | ~71% |

---

## 8. Risk Assessment

### Low Risk
- Feature flag gating (Cargo features are well-tested)
- Frontend route conditionals (standard React pattern)
- Migration splitting (SQLite handles missing tables gracefully)

### Medium Risk
- Handler module conditionals (need thorough testing)
- Service dependencies (some services may have cross-dependencies)
- API contract changes (LITE clients must handle 404s for FULL endpoints)

### Mitigation
1. Create comprehensive integration tests for both builds
2. Document API differences between LITE and FULL
3. Add runtime capability detection endpoint for clients
4. Use feature detection in frontend before calling FULL-only APIs
