# Build Variants Audit Report

**Date:** January 30, 2026  
**Status:** Audit Only (No fixes applied)

## Executive Summary

| Aspect | Status | Notes |
|--------|--------|-------|
| Feature flags defined | ✅ Good | Well-structured in `server/Cargo.toml` |
| Feature gating (backend) | ✅ Good | `#[cfg(feature = "...")]` used correctly |
| Feature gating (frontend) | ✅ Good | Build-time env vars with route conditionals |
| Documentation | ✅ Good | README accurately describes variants |
| Dockerfile | ⚠️ Issue | Default build has no features (should be `export`) |
| Crate dependencies | ✅ Good | Optional deps properly gated |

---

## Backend Feature Flags

### Defined Features (`crates/server/Cargo.toml`)

```toml
[features]
default = ["document-processing"]

# Core feature groups
lite = []                                    # Core POS only
export = ["dep:csv_export_pack"]            # + CSV export
full = ["export", "ocr", "document-cleanup", "integrations", "payments", "notifications"]

# Individual features
document-processing = ["dep:image", "dep:lopdf", "dep:pdfium-render"]
ocr = ["document-processing", "dep:imageproc"]
document-cleanup = ["document-processing"]
sync = []
integrations = []
payments = ["integrations"]
notifications = ["dep:lettre"]
```

### Feature Dependency Graph

```
full
├── export
│   └── csv_export_pack (crate)
├── ocr
│   └── document-processing
│       ├── image
│       ├── lopdf
│       └── pdfium-render
│   └── imageproc
├── document-cleanup
│   └── document-processing
├── integrations
├── payments
│   └── integrations
└── notifications
    └── lettre
```

---

## Issues Found

### Issue 1: Dockerfile Default Build Has No Features

**Location:** `Dockerfile.backend:28-32`

```dockerfile
RUN if [ -n "$FEATURES" ]; then \
        cargo build --release --no-default-features --features "$FEATURES"; \
    else \
        cargo build --release --no-default-features; \  # <-- No features at all!
    fi
```

**Problem:** If `FEATURES` is not specified, the build produces a "lite" variant with no features at all (not even `document-processing` which is the default).

**Expected:** The default should be `export` per documentation:
> "**Export** (Default) — Recommended for most users"

**Recommendation:** Change to:
```dockerfile
RUN if [ -n "$FEATURES" ]; then \
        cargo build --release --no-default-features --features "$FEATURES"; \
    else \
        cargo build --release --no-default-features --features "export"; \
    fi
```

---

### Issue 2: `default` Feature Enables `document-processing`

**Location:** `crates/server/Cargo.toml:18`

```toml
default = ["document-processing"]
```

**Problem:** This creates inconsistency:
- `cargo build --release` → includes `document-processing` (heavy deps)
- `cargo build --release --no-default-features` → bare minimum
- `cargo build --release --no-default-features --features "lite"` → `lite` is empty flag

**Recommendation:** The `default` should match the documented default (`export`), or `default` should be empty with explicit feature selection always required.

---

### Issue 3: `lite` Feature Is Empty

**Location:** `crates/server/Cargo.toml:42`

```toml
lite = []
```

**Problem:** The `lite` feature doesn't actually do anything - it's just a marker. Building with `--features "lite"` is equivalent to building with no features.

**Status:** Acceptable but confusing. Could add a comment clarifying it's a marker.

---

### Issue 4: Frontend Default Is `full`, Backend Default Is `document-processing`

**Frontend (`vite.config.ts:82`):**
```typescript
'import.meta.env.VITE_BUILD_VARIANT': JSON.stringify(env.VITE_BUILD_VARIANT || 'full'),
```

**Backend (`Cargo.toml:18`):**
```toml
default = ["document-processing"]
```

**Problem:** Frontend defaults to `full`, backend defaults to `document-processing` (which is neither `lite`, `export`, nor `full`).

**Expected:** Both should default to `export` per documentation.

---

## Feature Gating Analysis

### Backend Handler Gating (`handlers/mod.rs`)

| Module | Gate | Status |
|--------|------|--------|
| `data_manager` | `#[cfg(any(feature = "integrations", feature = "full"))]` | ✅ Correct |
| `payments` | `#[cfg(any(feature = "payments", feature = "full"))]` | ✅ Correct |
| `notifications` | `#[cfg(feature = "notifications")]` | ✅ Correct |
| `vendor` | `#[cfg(feature = "document-processing")]` | ✅ Correct |
| `vendor_bill`, `vendor_operations` | `#[cfg(feature = "ocr")]` | ✅ Correct |
| `ocr_ingest`, `ocr_operations`, `reocr`, `review_cases` | `#[cfg(feature = "ocr")]` | ✅ Correct |
| `cleanup` | `#[cfg(feature = "document-cleanup")]` | ✅ Correct |
| `export`, `performance_export` | `#[cfg(feature = "export")]` | ✅ Correct |

### Backend Service Gating (`services/mod.rs`)

| Module | Gate | Status |
|--------|------|--------|
| `sync_notifier` | `#[cfg(feature = "notifications")]` | ✅ Correct |
| `vendor_service` | `#[cfg(feature = "document-processing")]` | ✅ Correct |
| `document_ingest_service` | `#[cfg(feature = "document-processing")]` | ✅ Correct |
| `bill_ingest_service` | `#[cfg(feature = "ocr")]` | ✅ Correct |
| `image_preprocessing`, `orientation_service`, etc. | `#[cfg(feature = "ocr")]` | ✅ Correct |
| `cleanup_engine`, `mask_engine` | `#[cfg(feature = "document-cleanup")]` | ✅ Correct |
| `ap_integration_service`, etc. | `#[cfg(feature = "export")]` | ✅ Correct |

### Frontend Route Gating (`App.tsx`)

| Route | Gate | Status |
|-------|------|--------|
| `/documents` | `ENABLE_DOCUMENTS` (full only) | ✅ Correct |
| `/vendor-bills/*` | `ENABLE_VENDOR_BILLS` (full only) | ✅ Correct |
| `/reporting` | `ENABLE_REPORTING` (export + full) | ✅ Correct |
| `/admin/*` | `ENABLE_ADMIN` (export + full) | ✅ Correct |
| `/admin/exports` | `ENABLE_EXPORTS` (export + full) | ✅ Correct |
| `/review/*` | `ENABLE_REVIEW` (full only) | ✅ Correct |

---

## Crate Dependency Analysis

### Workspace Crates

| Crate | Always Included | Optional | Gate |
|-------|-----------------|----------|------|
| `pos_core_domain` | ✅ | | Core POS logic |
| `pos_core_models` | ✅ | | Core data models |
| `pos_core_storage` | ✅ | | SQLite storage |
| `accounting_snapshots` | ✅ | | Accounting snapshots |
| `export_batches` | ✅ | | Export batch tracking |
| `capabilities` | ✅ | | Feature detection |
| `csv_export_pack` | | ✅ | `feature = "export"` |

### External Heavy Dependencies

| Dependency | Gate | Size Impact |
|------------|------|-------------|
| `image` | `document-processing` | ~2MB |
| `imageproc` | `ocr` | ~1MB |
| `lopdf` | `document-processing` | ~500KB |
| `pdfium-render` | `document-processing` | ~15MB (includes pdfium) |
| `lettre` | `notifications` | ~500KB |

---

## Capabilities API Analysis

**Location:** `handlers/capabilities.rs:113-132`

```rust
let features = FeatureFlags {
    export: cfg!(feature = "export"),
    sync: cfg!(feature = "sync"),
    document_processing: cfg!(feature = "document-processing"),
    ocr: cfg!(feature = "ocr"),
    document_cleanup: cfg!(feature = "document-cleanup"),
    integrations: cfg!(feature = "integrations") || cfg!(feature = "full"),
    payments: cfg!(feature = "payments") || cfg!(feature = "full"),
    stripe: cfg!(feature = "payments") || cfg!(feature = "full"),
    square: cfg!(feature = "payments") || cfg!(feature = "full"),
    clover: cfg!(feature = "payments") || cfg!(feature = "full"),
    data_manager: cfg!(feature = "full"),
    build_variant: if cfg!(feature = "full") {
        "full".to_string()
    } else if cfg!(feature = "export") {
        "export".to_string()
    } else {
        "lite".to_string()
    },
};
```

**Status:** ✅ Correctly reports features to frontend via `/api/config/capabilities`

---

## Build Variant Feature Matrix

Based on code analysis, here's what each variant actually enables:

| Feature | Lite | Export | Full |
|---------|:----:|:------:|:----:|
| Core POS | ✅ | ✅ | ✅ |
| Products/Inventory | ✅ | ✅ | ✅ |
| Customers | ✅ | ✅ | ✅ |
| Multi-Store Sync | ✅ | ✅ | ✅ |
| CSV Export | — | ✅ | ✅ |
| Admin Panel | — | ✅ | ✅ |
| Reporting | — | ✅ | ✅ |
| Document Processing | — | — | ✅ |
| OCR | — | — | ✅ |
| Document Cleanup | — | — | ✅ |
| Integrations | — | — | ✅ |
| Payments | — | — | ✅ |
| Notifications | — | — | ✅ |

---

## Recommendations

### Priority 1: Fix Default Build

1. **Dockerfile:** Change default from no features to `export`
2. **Cargo.toml:** Consider changing `default = ["document-processing"]` to `default = ["export"]` or remove default entirely
3. **vite.config.ts:** Change frontend default from `full` to `export`

### Priority 2: Documentation

1. Add comment to `lite = []` explaining it's a marker feature
2. Document the actual dependencies each feature adds

### Priority 3: Consistency

1. Ensure frontend and backend defaults match
2. Ensure documentation, Dockerfile, and code all agree on what "default" means

---

## Summary

| Category | Issues | Status |
|----------|--------|--------|
| Feature definitions | 0 | ✅ Good |
| Feature gating (backend) | 0 | ✅ Good |
| Feature gating (frontend) | 0 | ✅ Good |
| Optional dependencies | 0 | ✅ Good |
| Capabilities API | 0 | ✅ Good |
| Default build config | 3 | ⚠️ Inconsistent |
| Documentation | 0 | ✅ Good |

**Overall:** The build variant system is well-designed and properly implemented. The main issue is inconsistent defaults between Dockerfile (no features), backend Cargo.toml (`document-processing`), and frontend vite.config.ts (`full`), when documentation says `export` should be the default.
