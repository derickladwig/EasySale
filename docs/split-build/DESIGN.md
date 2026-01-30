# EasySale Split Build Architecture — Design Document

**Version**: 1.0  
**Date**: 2026-01-29  
**Status**: Ready for Implementation

---

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EasySale Split Build Architecture                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         BUILD TIME                                   │    │
│  │                                                                      │    │
│  │   Cargo Features              Vite Env Vars                         │    │
│  │   ┌──────────────┐           ┌──────────────┐                       │    │
│  │   │ --features   │           │ VITE_BUILD_  │                       │    │
│  │   │   full       │           │   VARIANT    │                       │    │
│  │   │   export     │           │   =lite/full │                       │    │
│  │   │   ocr        │           └──────────────┘                       │    │
│  │   │   (none)     │                  │                               │    │
│  │   └──────────────┘                  │                               │    │
│  │          │                          │                               │    │
│  │          ▼                          ▼                               │    │
│  │   ┌──────────────┐           ┌──────────────┐                       │    │
│  │   │   Backend    │           │   Frontend   │                       │    │
│  │   │   Binary     │           │   Bundle     │                       │    │
│  │   │  (lite/full) │           │  (lite/full) │                       │    │
│  │   └──────────────┘           └──────────────┘                       │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         RUNTIME                                      │    │
│  │                                                                      │    │
│  │   ┌──────────────┐           ┌──────────────┐                       │    │
│  │   │   Backend    │◄─────────►│   Frontend   │                       │    │
│  │   │   Server     │  /api/    │   App        │                       │    │
│  │   │              │capabilities│              │                       │    │
│  │   └──────────────┘           └──────────────┘                       │    │
│  │          │                          │                               │    │
│  │          │ Reports available        │ Hides unavailable             │    │
│  │          │ features via API         │ routes/features               │    │
│  │          ▼                          ▼                               │    │
│  │   ┌──────────────────────────────────────────────────────────┐     │    │
│  │   │                    SQLite Database                        │     │    │
│  │   │  (Same schema - unused tables OK in lite)                 │     │    │
│  │   └──────────────────────────────────────────────────────────┘     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Crate Boundaries and Responsibilities

### 2.1 Workspace Structure

```
backend/
├── Cargo.toml                    # Workspace root
└── crates/
    ├── pos_core_models/          # Data models (ALWAYS)
    ├── pos_core_domain/          # Business logic (ALWAYS)
    ├── pos_core_storage/         # SQLite layer (ALWAYS)
    ├── accounting_snapshots/     # Snapshot management (ALWAYS)
    ├── export_batches/           # Batch processing (ALWAYS)
    ├── capabilities/             # Feature detection (ALWAYS)
    ├── csv_export_pack/          # CSV export (OPTIONAL - export feature)
    └── server/                   # Main server (feature-gated modules)
```

### 2.2 Crate Responsibilities

| Crate | Responsibility | Build Inclusion |
|-------|----------------|-----------------|
| `pos_core_models` | Data structures, DTOs | Always |
| `pos_core_domain` | Business rules, validation | Always |
| `pos_core_storage` | SQLite queries, migrations | Always |
| `accounting_snapshots` | Snapshot creation/retrieval | Always |
| `export_batches` | Batch job management | Always |
| `capabilities` | Runtime feature detection | Always |
| `csv_export_pack` | QuickBooks CSV generation | `export` feature |
| `EasySale-server` | HTTP server, handlers | Feature-gated modules |

### 2.3 Server Module Boundaries

```
EasySale-server/
├── src/
│   ├── main.rs                   # Entry point, route registration
│   ├── handlers/
│   │   ├── mod.rs                # Module exports (feature-gated)
│   │   ├── auth.rs               # ALWAYS
│   │   ├── product.rs            # ALWAYS
│   │   ├── customer.rs           # ALWAYS
│   │   ├── inventory.rs          # ALWAYS
│   │   ├── stats.rs              # ALWAYS
│   │   ├── health.rs             # ALWAYS
│   │   ├── ocr_ingest.rs         # ocr feature
│   │   ├── vendor_bill.rs        # document-processing feature
│   │   ├── reporting.rs          # export feature (full reports)
│   │   └── ...
│   └── services/
│       ├── mod.rs                # Module exports (feature-gated)
│       ├── backup_service.rs     # ALWAYS
│       ├── barcode_service.rs    # ALWAYS
│       ├── product_service.rs    # ALWAYS
│       ├── document_ingest_service.rs  # document-processing feature
│       ├── image_preprocessing.rs      # ocr feature
│       ├── mask_engine.rs              # document-cleanup feature
│       └── ...
```

---

## 3. Feature Flag Strategy

### 3.1 Feature Definitions

**File**: `backend/crates/server/Cargo.toml`

```toml
[features]
default = []

# Document processing (PDF, images) - gates heavy deps
document-processing = ["dep:image", "dep:lopdf"]

# OCR and image enhancement - requires document-processing
ocr = ["document-processing", "dep:imageproc"]

# Document cleanup engine - requires document-processing
document-cleanup = ["document-processing"]

# Accounting CSV export - gates csv_export_pack crate
export = ["dep:csv_export_pack"]

# Full build with all features
full = ["export", "ocr", "document-cleanup"]
```

### 3.2 Feature Hierarchy

```
full
├── export
│   └── csv_export_pack (crate)
├── ocr
│   ├── document-processing
│   │   ├── image (dep)
│   │   └── lopdf (dep)
│   └── imageproc (dep)
└── document-cleanup
    └── document-processing
        ├── image (dep)
        └── lopdf (dep)
```

### 3.3 Feature Flag Usage in Code

**Service Module Gating** (`services/mod.rs`):
```rust
// Always included
pub mod backup_service;
pub mod barcode_service;
pub mod product_service;

// Document processing (feature-gated)
#[cfg(feature = "document-processing")]
pub mod document_ingest_service;
#[cfg(feature = "document-processing")]
pub mod bill_ingest_service;

// OCR services (feature-gated)
#[cfg(feature = "ocr")]
pub mod image_preprocessing;
#[cfg(feature = "ocr")]
pub mod orientation_service;
#[cfg(feature = "ocr")]
pub mod variant_generator;
#[cfg(feature = "ocr")]
pub mod zone_detector_service;
#[cfg(feature = "ocr")]
pub mod zone_cropper;
#[cfg(feature = "ocr")]
pub mod ocr_engine;
#[cfg(feature = "ocr")]
pub mod ocr_service;

// Document cleanup (feature-gated)
#[cfg(feature = "document-cleanup")]
pub mod cleanup_engine;
#[cfg(feature = "document-cleanup")]
pub mod mask_engine;
```

**Route Registration** (`main.rs`):
```rust
HttpServer::new(move || {
    App::new()
        // Core routes (always)
        .configure(handlers::auth::configure)
        .configure(handlers::product::configure)
        .configure(handlers::customer::configure)
        .configure(handlers::inventory::configure)
        .configure(handlers::health::configure)
        
        // Document processing routes (feature-gated)
        #[cfg(feature = "document-processing")]
        .configure(handlers::vendor_bill::configure)
        
        // OCR routes (feature-gated)
        #[cfg(feature = "ocr")]
        .configure(handlers::ocr_ingest::configure)
        
        // Export routes (feature-gated)
        #[cfg(feature = "export")]
        .configure(handlers::export::configure)
})
```

---

## 4. Optional Dependencies Management

### 4.1 Workspace Dependencies

**File**: `backend/Cargo.toml`

```toml
[workspace.dependencies]
# Heavy deps - will be optional in server crate
image = "0.24"
imageproc = "0.23"
lopdf = "0.32"
```

### 4.2 Server Crate Dependencies

**File**: `backend/crates/server/Cargo.toml`

```toml
[dependencies]
# Core deps (always included)
actix-web = { workspace = true }
sqlx = { workspace = true }
tokio = { workspace = true }
serde = { workspace = true }
# ... other core deps

# Optional deps (feature-gated)
image = { workspace = true, optional = true }
imageproc = { workspace = true, optional = true }
lopdf = { workspace = true, optional = true }
csv_export_pack = { path = "../csv_export_pack", optional = true }
```

### 4.3 Dependency Verification

```bash
# Verify lite build doesn't include heavy deps
cargo tree -p EasySale-server --no-default-features | grep -E "image|imageproc|lopdf"
# Should return empty

# Verify full build includes heavy deps
cargo tree -p EasySale-server --features full | grep -E "image|imageproc|lopdf"
# Should show dependencies
```

---

## 5. Frontend Feature Gating

### 5.1 Build-Time Configuration

**File**: `frontend/vite.config.ts`

```typescript
const isLiteMode = env.VITE_BUILD_VARIANT === 'lite';

export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD_VARIANT': JSON.stringify(env.VITE_BUILD_VARIANT || 'full'),
    'import.meta.env.VITE_ENABLE_ADMIN': JSON.stringify(!isLiteMode),
    'import.meta.env.VITE_ENABLE_REPORTING': JSON.stringify(!isLiteMode),
    'import.meta.env.VITE_ENABLE_VENDOR_BILLS': JSON.stringify(!isLiteMode),
    'import.meta.env.VITE_ENABLE_DOCUMENTS': JSON.stringify(!isLiteMode),
  },
});
```

### 5.2 Route Gating

**File**: `frontend/src/App.tsx`

```tsx
import { ENABLE_ADMIN, ENABLE_REPORTING, ENABLE_VENDOR_BILLS } from '@common/utils/buildVariant';

// Conditional route rendering
{ENABLE_ADMIN && (
  <Route path="admin/*" element={<AdminLayout />} />
)}

{ENABLE_REPORTING && (
  <Route path="reporting" element={<ReportingPage />} />
)}

{ENABLE_VENDOR_BILLS && (
  <Route path="vendor-bills/*" element={<VendorBillRoutes />} />
)}
```

### 5.3 Navigation Filtering

**File**: `frontend/src/config/navigation.ts`

```typescript
import { isFeatureEnabled } from '@common/utils/buildVariant';

export function filterNavigationByBuildVariant(items: NavigationItem[]): NavigationItem[] {
  return items.filter((item) => {
    if (item.id.startsWith('admin') && !isFeatureEnabled('admin')) return false;
    if (item.id === 'reporting' && !isFeatureEnabled('reporting')) return false;
    if (item.id === 'documents' && !isFeatureEnabled('documents')) return false;
    if (item.id === 'vendor-bills' && !isFeatureEnabled('vendor-bills')) return false;
    return true;
  });
}
```

---

## 6. Database Schema Strategy

### 6.1 Approach: Same Schema, Unused Tables OK

**Rationale**:
- SQLite handles unused tables gracefully
- No migration complexity
- Easier to upgrade lite → full
- No "table missing" runtime errors

### 6.2 Migration Handling

All migrations run regardless of build variant. Lite build simply doesn't use certain tables:

```
Tables used by LITE:
- tenants, users, sessions
- products, customers
- sales_transactions, sales_line_items
- sync_queue, sync_state
- settings, stores, stations
- theme_preferences

Tables unused by LITE (but still created):
- layaways, work_orders, commissions
- vendor_bills, review_cases, ocr_jobs
- integration_credentials, oauth_states
- chart_of_accounts, journal_entries
```

### 6.3 Runtime Feature Detection

The `/api/capabilities` endpoint reports what features are available:

```json
{
  "accounting_mode": "disabled",  // or "export_only" or "sync"
  "features": {
    "export": false,
    "sync": false,
    "ocr": false,
    "document_processing": false
  },
  "version": "0.1.0"
}
```

Frontend uses this to hide unavailable features at runtime.

---

## 7. Developer Guide: Adding New Features

### 7.1 Adding a New Feature Without Bloating Lite

**Step 1**: Define the feature flag

```toml
# backend/crates/server/Cargo.toml
[features]
my-new-feature = ["dep:some-heavy-dep"]
full = ["export", "ocr", "document-cleanup", "my-new-feature"]
```

**Step 2**: Make dependencies optional

```toml
[dependencies]
some-heavy-dep = { version = "1.0", optional = true }
```

**Step 3**: Gate the service module

```rust
// services/mod.rs
#[cfg(feature = "my-new-feature")]
pub mod my_new_service;
```

**Step 4**: Gate the handler module

```rust
// handlers/mod.rs
#[cfg(feature = "my-new-feature")]
pub mod my_new_handler;
```

**Step 5**: Gate route registration

```rust
// main.rs
#[cfg(feature = "my-new-feature")]
.configure(handlers::my_new_handler::configure)
```

**Step 6**: Update capabilities API

```rust
// handlers/capabilities.rs
let my_new_feature = cfg!(feature = "my-new-feature");
```

**Step 7**: Gate frontend routes (if applicable)

```tsx
// App.tsx
{import.meta.env.VITE_ENABLE_MY_NEW_FEATURE && (
  <Route path="my-new-feature" element={<MyNewFeaturePage />} />
)}
```

### 7.2 Checklist for New Features

- [ ] Feature flag defined in `Cargo.toml`
- [ ] Heavy deps marked as optional
- [ ] Service module has `#[cfg(feature)]`
- [ ] Handler module has `#[cfg(feature)]`
- [ ] Route registration has `#[cfg(feature)]`
- [ ] Capabilities API updated
- [ ] Frontend route gated (if applicable)
- [ ] Tests have `#![cfg(feature)]` attribute
- [ ] CI matrix includes new feature
- [ ] Documentation updated

### 7.3 Common Mistakes to Avoid

1. **Forgetting to add to `full` feature**: New features should be added to the `full` feature set
2. **Unconditional imports**: Don't import feature-gated modules unconditionally
3. **Missing test gates**: Tests using feature-gated code need `#![cfg(feature)]`
4. **Frontend/backend mismatch**: Ensure frontend checks capabilities before calling gated endpoints

---

## 8. Build Verification

### 8.1 Verify Lite Build

```bash
# Build lite
cargo build --release -p EasySale-server --no-default-features

# Check binary doesn't include heavy deps
nm target/release/EasySale-server | grep -i "image\|lopdf" | wc -l
# Should be 0 or very few (no image/lopdf symbols)

# Check binary size
ls -lh target/release/EasySale-server
# Should be ~25-28 MB
```

### 8.2 Verify Full Build

```bash
# Build full
cargo build --release -p EasySale-server --no-default-features --features full

# Check binary includes heavy deps
nm target/release/EasySale-server | grep -i "image\|lopdf" | wc -l
# Should be many symbols

# Check binary size
ls -lh target/release/EasySale-server
# Should be ~30-35 MB
```

### 8.3 Verify Docker Builds

```bash
# Build and compare image sizes
docker build --build-arg FEATURES="" -f Dockerfile.backend -t test-lite .
docker build --build-arg FEATURES="full" -f Dockerfile.backend -t test-full .

docker images | grep test-
# test-lite should be smaller than test-full
```

---

## 9. CI/CD Integration

### 9.1 CI Matrix Configuration

```yaml
# .github/workflows/ci.yml
jobs:
  backend-variants:
    strategy:
      matrix:
        variant:
          - { name: lite, features: "" }
          - { name: export, features: "export" }
          - { name: full, features: "full" }
    steps:
      - name: Build ${{ matrix.variant.name }}
        run: |
          if [ -n "${{ matrix.variant.features }}" ]; then
            cargo build --release --no-default-features --features "${{ matrix.variant.features }}"
          else
            cargo build --release --no-default-features
          fi
      
      - name: Test ${{ matrix.variant.name }}
        run: |
          if [ -n "${{ matrix.variant.features }}" ]; then
            cargo test --no-default-features --features "${{ matrix.variant.features }}"
          else
            cargo test --no-default-features
          fi
```

### 9.2 Feature Drift Guard

```yaml
# .github/workflows/ci.yml
- name: Verify lite build excludes heavy deps
  run: |
    cargo build --release --no-default-features
    SYMBOLS=$(nm target/release/EasySale-server | grep -iE "image::|imageproc::|lopdf::" | wc -l)
    if [ "$SYMBOLS" -gt 10 ]; then
      echo "ERROR: Lite build includes heavy dependencies!"
      exit 1
    fi
```

---

## Appendix: Feature Flag Reference

| Feature | Dependencies | Services Enabled | Handlers Enabled |
|---------|--------------|------------------|------------------|
| (none) | Core only | backup, barcode, product, etc. | auth, product, customer, etc. |
| `document-processing` | image, lopdf | document_ingest, bill_ingest | vendor_bill |
| `ocr` | + imageproc | + image_preprocessing, orientation, zone_* | + ocr_ingest |
| `document-cleanup` | (same as doc-proc) | + cleanup_engine, mask_engine | (none) |
| `export` | csv_export_pack | (none) | export, reporting (full) |
| `full` | All above | All above | All above |
