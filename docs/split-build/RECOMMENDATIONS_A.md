# Backend Split Build Recommendations

## Executive Summary

This document provides specific recommendations for implementing a "lite" vs "full" split build architecture for the EasySale backend. The goal is to enable a minimal POS-only build that excludes heavy document processing dependencies.

---

## 1. Crates That Should Be "Full-Only"

### 1.1 Recommended Full-Only Crates

| Crate | Reason | Impact |
|-------|--------|--------|
| `csv_export_pack` | Already optional via `export` feature | ✅ Already correct |

**Note:** All other crates contain core POS functionality and should remain in both lite and full builds.

### 1.2 Services That Should Be Full-Only

The following services in `EasySale-server` should be feature-gated:

| Service Module | Heavy Deps | Recommended Feature |
|----------------|------------|---------------------|
| `document_ingest_service` | image, lopdf | `document-processing` |
| `image_preprocessing` | image, imageproc | `ocr` |
| `orientation_service` | image, imageproc | `ocr` |
| `variant_generator` | image, imageproc | `ocr` |
| `zone_detector_service` | image | `ocr` |
| `zone_cropper` | image | `ocr` |
| `cleanup_engine/*` | image | `document-cleanup` |
| `mask_engine` | image | `document-cleanup` |
| `ocr_engine` | (external OCR) | `ocr` |
| `ocr_service` | (external OCR) | `ocr` |
| `ocr_job_processor` | (external OCR) | `ocr` |
| `multi_pass_ocr` | (external OCR) | `ocr` |
| `bill_ingest_service` | (uses document services) | `document-processing` |

---

## 2. Dependencies That Should Be Optional/Feature-Gated

### 2.1 Required Changes to `backend/Cargo.toml`

**Current (lines 77-81):**
```toml
# Image processing for OCR enhancement
image = "0.24"
imageproc = "0.23"

# PDF processing for text layer extraction
lopdf = "0.32"
```

**Recommended Change:**
```toml
# Image processing for OCR enhancement (optional - full build only)
image = { version = "0.24", optional = true }
imageproc = { version = "0.23", optional = true }

# PDF processing for text layer extraction (optional - full build only)
lopdf = { version = "0.32", optional = true }
```

### 2.2 Required Changes to `backend/crates/server/Cargo.toml`

**Current (lines 18-21):**
```toml
[features]
default = []
export = ["csv_export_pack"]
sync = []
```

**Recommended Change:**
```toml
[features]
default = []

# Accounting export functionality
export = ["csv_export_pack"]

# Sync functionality (placeholder)
sync = []

# Document processing (PDF, images)
document-processing = ["image", "lopdf"]

# OCR and image enhancement
ocr = ["document-processing", "imageproc"]

# Document cleanup engine
document-cleanup = ["document-processing"]

# Full build with all features
full = ["export", "ocr", "document-cleanup"]

# Lite build (POS-only, no document processing)
# This is the default - no heavy deps
lite = []
```

**Current dependencies section (lines 70-75):**
```toml
# Image processing for OCR enhancement
image = { workspace = true }
imageproc = { workspace = true }

# PDF processing for text layer extraction
lopdf = { workspace = true }
```

**Recommended Change:**
```toml
# Image processing for OCR enhancement (optional)
image = { workspace = true, optional = true }
imageproc = { workspace = true, optional = true }

# PDF processing for text layer extraction (optional)
lopdf = { workspace = true, optional = true }
```

---

## 3. Specific Code Changes Required

### 3.1 Feature-Gate Services in `mod.rs`

**File:** `backend/crates/server/src/services/mod.rs`

**Current (lines 16-17, 27, 33-35, etc.):**
```rust
pub mod document_ingest_service;
// ...
pub mod image_preprocessing;
// ...
pub mod orientation_service;
pub mod variant_generator;
pub mod zone_detector_service;
pub mod zone_cropper;
pub mod cleanup_engine;
pub mod mask_engine;
```

**Recommended Change:**
```rust
// Document processing services (feature-gated)
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
#[cfg(feature = "ocr")]
pub mod ocr_job_processor;
#[cfg(feature = "ocr")]
pub mod multi_pass_ocr;

// Document cleanup services (feature-gated)
#[cfg(feature = "document-cleanup")]
pub mod cleanup_engine;
#[cfg(feature = "document-cleanup")]
pub mod mask_engine;
```

### 3.2 Feature-Gate Re-exports

**File:** `backend/crates/server/src/services/mod.rs`

**Add conditional re-exports:**
```rust
#[cfg(feature = "document-processing")]
pub use document_ingest_service::{DocumentIngestService, IngestConfig, IngestError, IngestResult};

#[cfg(feature = "ocr")]
pub use orientation_service::{OrientationService, OrientationConfig, OrientationResult, OrientationError};

#[cfg(feature = "ocr")]
pub use variant_generator::{VariantGenerator, VariantConfig, VariantGenerationResult};

#[cfg(feature = "document-cleanup")]
pub use cleanup_engine::{CleanupEngine, CleanupEngineConfig, CleanupEngineError};
```

### 3.3 Feature-Gate Handlers

**File:** `backend/crates/server/src/handlers/mod.rs` (if exists) or in `main.rs`

Any handlers that use document processing services should be conditionally compiled:

```rust
#[cfg(feature = "document-processing")]
pub mod document_handlers;

#[cfg(feature = "ocr")]
pub mod ocr_handlers;
```

### 3.4 Feature-Gate Route Registration in `main.rs`

**File:** `backend/crates/server/src/main.rs`

Add conditional route registration:

```rust
// In HttpServer::new closure:
.configure(|cfg| {
    #[cfg(feature = "document-processing")]
    {
        cfg.service(handlers::document::upload_document);
        cfg.service(handlers::document::get_document_status);
    }
    
    #[cfg(feature = "ocr")]
    {
        cfg.service(handlers::ocr::process_ocr);
        cfg.service(handlers::ocr::get_ocr_result);
    }
})
```

---

## 4. Build Commands

### 4.1 Lite Build (POS-Only)

```bash
# Default build - no heavy deps
cargo build --release -p EasySale-server

# Explicit lite build
cargo build --release -p EasySale-server --no-default-features
```

### 4.2 Full Build (All Features)

```bash
# Full build with all features
cargo build --release -p EasySale-server --features full

# Or specific features
cargo build --release -p EasySale-server --features "export,ocr,document-cleanup"
```

### 4.3 Selective Builds

```bash
# POS + Export only
cargo build --release -p EasySale-server --features export

# POS + Document processing (no OCR)
cargo build --release -p EasySale-server --features document-processing

# POS + OCR (includes document-processing)
cargo build --release -p EasySale-server --features ocr
```

---

## 5. Expected Binary Size Impact

### 5.1 Estimated Savings

| Component | Estimated Size | Notes |
|-----------|----------------|-------|
| `image` crate | ~2-3 MB | Multiple codec support |
| `imageproc` crate | ~500 KB - 1 MB | Algorithm implementations |
| `lopdf` crate | ~300-500 KB | PDF parsing |
| **Total Savings** | **~3-5 MB** | Approximate |

### 5.2 Verification Command

After implementing changes:
```bash
# Compare binary sizes
cargo build --release -p EasySale-server
ls -lh target/release/EasySale-server  # Lite size

cargo build --release -p EasySale-server --features full
ls -lh target/release/EasySale-server  # Full size
```

---

## 6. Testing Considerations

### 6.1 CI Matrix

Add feature matrix to CI:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    strategy:
      matrix:
        features:
          - ""  # lite build
          - "export"
          - "document-processing"
          - "ocr"
          - "full"
    steps:
      - run: cargo test -p EasySale-server --features "${{ matrix.features }}"
```

### 6.2 Feature-Gated Tests

Tests that use heavy dependencies should also be feature-gated:

**File:** `backend/crates/server/tests/document_ingest_tests.rs`
```rust
#![cfg(feature = "document-processing")]
// ... test code
```

**File:** `backend/crates/server/tests/zone_detector_integration_test.rs`
```rust
#![cfg(feature = "ocr")]
// ... test code
```

---

## 7. Migration Path

### 7.1 Phase 1: Add Feature Flags (Non-Breaking)

1. Add optional flags to workspace `Cargo.toml`
2. Add feature definitions to server `Cargo.toml`
3. Keep all features enabled by default initially

### 7.2 Phase 2: Add Conditional Compilation

1. Add `#[cfg(feature = "...")]` to service modules
2. Add conditional re-exports
3. Add conditional route registration
4. Verify full build still works

### 7.3 Phase 3: Change Defaults

1. Remove heavy features from default
2. Update documentation
3. Update CI/CD pipelines
4. Update deployment scripts

### 7.4 Phase 4: Verification

1. Build lite version
2. Verify binary size reduction
3. Run lite test suite
4. Deploy lite version to test environment

---

## 8. Risk Assessment

### 8.1 Low Risk Changes

- Adding optional flags to dependencies
- Adding feature definitions
- Adding `#[cfg]` attributes

### 8.2 Medium Risk Changes

- Changing default features
- Conditional route registration
- Handler feature gating

### 8.3 Mitigation

- Keep `full` feature that enables everything
- Comprehensive CI matrix testing
- Gradual rollout with feature flags

---

## 9. Summary Checklist

- [ ] Update `backend/Cargo.toml` - make image/imageproc/lopdf optional
- [ ] Update `backend/crates/server/Cargo.toml` - add feature definitions
- [ ] Update `backend/crates/server/Cargo.toml` - make deps optional
- [ ] Feature-gate service modules in `mod.rs`
- [ ] Feature-gate service re-exports in `mod.rs`
- [ ] Feature-gate route registration in `main.rs`
- [ ] Feature-gate integration tests
- [ ] Update CI to test feature matrix
- [ ] Update build documentation
- [ ] Verify binary size reduction
