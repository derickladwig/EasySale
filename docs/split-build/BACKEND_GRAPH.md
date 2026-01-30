# Backend Workspace Dependency Graph

## Overview

This document provides a comprehensive analysis of the EasySale backend workspace structure, crate dependencies, and heavy dependency inventory for the split build architecture.

**Analysis Date:** Generated from workspace analysis  
**Workspace Root:** `backend/`  
**Resolver:** Cargo resolver v2

---

## 1. Workspace Members

| Crate | Path | Description |
|-------|------|-------------|
| `pos_core_models` | `crates/pos_core_models` | Core data models (no internal deps) |
| `pos_core_domain` | `crates/pos_core_domain` | Business domain logic |
| `pos_core_storage` | `crates/pos_core_storage` | SQLite storage layer |
| `accounting_snapshots` | `crates/accounting_snapshots` | Accounting snapshot management |
| `export_batches` | `crates/export_batches` | Export batch processing |
| `capabilities` | `crates/capabilities` | Feature capability detection |
| `csv_export_pack` | `crates/csv_export_pack` | CSV export functionality |
| `EasySale-server` | `crates/server` | Main server application |

**Source:** `backend/Cargo.toml` lines 2-11

---

## 2. Dependency Graph

### 2.1 Internal Crate Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPENDENCY HIERARCHY                               │
└─────────────────────────────────────────────────────────────────────────────┘

Level 0 (No internal deps):
┌──────────────────┐     ┌──────────────────┐
│ pos_core_models  │     │   capabilities   │
│   (leaf crate)   │     │   (leaf crate)   │
└────────┬─────────┘     └──────────────────┘
         │
         ▼
Level 1:
┌──────────────────┐     ┌──────────────────┐
│ pos_core_domain  │     │ pos_core_storage │
│                  │     │                  │
│ deps: models     │     │ deps: models     │
└────────┬─────────┘     └────────┬─────────┘
         │                        │
         └────────────┬───────────┘
                      ▼
Level 2:
         ┌────────────────────────┐
         │  accounting_snapshots  │
         │                        │
         │ deps: models, domain,  │
         │       storage          │
         └────────────┬───────────┘
                      │
                      ▼
Level 3:
         ┌────────────────────────┐
         │    export_batches      │
         │                        │
         │ deps: models, storage, │
         │       accounting_snap  │
         └────────────┬───────────┘
                      │
                      ▼
Level 4:
         ┌────────────────────────┐
         │    csv_export_pack     │
         │                        │
         │ deps: accounting_snap, │
         │       export_batches   │
         └────────────┬───────────┘
                      │
                      ▼
Level 5 (Server - aggregates all):
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EasySale-server                                    │
│                                                                              │
│  ALWAYS INCLUDED:                    OPTIONAL (feature-gated):               │
│  ├── pos_core_domain                 └── csv_export_pack [export]            │
│  ├── pos_core_models                                                         │
│  ├── pos_core_storage                                                        │
│  ├── accounting_snapshots                                                    │
│  ├── export_batches                                                          │
│  └── capabilities                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Detailed Crate Dependencies

#### `pos_core_models` (Leaf Crate)
**Source:** `backend/crates/pos_core_models/Cargo.toml`
```toml
# No internal dependencies
# External deps only:
rust_decimal = "1.33"
serde = { workspace = true }
chrono = { workspace = true }
uuid = { workspace = true }
thiserror = "1.0"
```

#### `pos_core_domain`
**Source:** `backend/crates/pos_core_domain/Cargo.toml` lines 8-9
```toml
pos_core_models = { path = "../pos_core_models" }
```

#### `pos_core_storage`
**Source:** `backend/crates/pos_core_storage/Cargo.toml` lines 8-9
```toml
pos_core_models = { path = "../pos_core_models" }
```

#### `accounting_snapshots`
**Source:** `backend/crates/accounting_snapshots/Cargo.toml` lines 8-10
```toml
pos_core_models = { path = "../pos_core_models" }
pos_core_storage = { path = "../pos_core_storage" }
pos_core_domain = { path = "../pos_core_domain" }
```

#### `export_batches`
**Source:** `backend/crates/export_batches/Cargo.toml` lines 8-10
```toml
pos_core_models = { path = "../pos_core_models" }
pos_core_storage = { path = "../pos_core_storage" }
accounting_snapshots = { path = "../accounting_snapshots" }
```

#### `csv_export_pack`
**Source:** `backend/crates/csv_export_pack/Cargo.toml` lines 8-9
```toml
accounting_snapshots = { path = "../accounting_snapshots" }
export_batches = { path = "../export_batches" }
```

#### `capabilities`
**Source:** `backend/crates/capabilities/Cargo.toml` lines 8-21
```toml
# Minimal deps - mostly standalone
serde = { workspace = true }
thiserror = "1.0"
# Optional deps for runtime detection:
reqwest = { workspace = true, optional = true }
tokio = { workspace = true, optional = true }
```

#### `EasySale-server`
**Source:** `backend/crates/server/Cargo.toml` lines 22-34
```toml
# Always included:
pos_core_domain = { path = "../pos_core_domain" }
pos_core_models = { path = "../pos_core_models" }
pos_core_storage = { path = "../pos_core_storage" }
accounting_snapshots = { path = "../accounting_snapshots" }
export_batches = { path = "../export_batches" }
capabilities = { path = "../capabilities" }

# Optional - feature-gated:
csv_export_pack = { path = "../csv_export_pack", optional = true }
```

---

## 3. Heavy Dependencies Inventory

### 3.1 Image Processing Dependencies

| Dependency | Version | Crate | Why Heavy |
|------------|---------|-------|-----------|
| `image` | 0.24 | server | Full image codec support (PNG, JPEG, TIFF, etc.), ~2MB compiled |
| `imageproc` | 0.23 | server | Image processing algorithms (filters, edge detection, Hough transform) |

**Source:** `backend/Cargo.toml` lines 77-78
```toml
# Image processing for OCR enhancement
image = "0.24"
imageproc = "0.23"
```

**Usage Locations (from grep search):**

| File | Line | Usage |
|------|------|-------|
| `server/src/services/document_ingest_service.rs` | 260 | `image::open(file_path)` |
| `server/src/services/image_preprocessing.rs` | 1-2 | `use image::*`, `use imageproc::filter` |
| `server/src/services/orientation_service.rs` | 5-7 | `use image::*`, `use imageproc::edges::canny`, `use imageproc::hough::*` |
| `server/src/services/variant_generator.rs` | 6-7 | `use image::*`, `use imageproc::filter` |
| `server/src/services/zone_detector_service.rs` | 6 | `use image::*` |
| `server/src/services/zone_cropper.rs` | 9 | `use image::*` |
| `server/src/services/cleanup_engine/renderer.rs` | 14-16 | `use image::*` |
| `server/src/services/cleanup_engine/engine.rs` | 179 | `image::open(image_path)` |
| `server/src/services/cleanup_engine/detectors/*.rs` | various | `use image::*` |
| `server/src/services/mask_engine.rs` | 349 | `image::open(image_path)` |

### 3.2 PDF Processing Dependencies

| Dependency | Version | Crate | Why Heavy |
|------------|---------|-------|-----------|
| `lopdf` | 0.32 | server | PDF parsing/manipulation, complex document handling |

**Source:** `backend/Cargo.toml` line 81
```toml
# PDF processing for text layer extraction
lopdf = "0.32"
```

**Usage Locations:**

| File | Line | Usage |
|------|------|-------|
| `server/src/services/document_ingest_service.rs` | 5 | `use lopdf::Document as PdfDocument` |
| `server/tests/document_ingest_tests.rs` | 5 | `use lopdf::*` |
| `server/tests/pdf_text_extraction_simple_test.rs` | 3 | `use lopdf::*` |

### 3.3 Other Notable Dependencies

| Dependency | Version | Crate | Why Notable |
|------------|---------|-------|-------------|
| `sqlx` | 0.7 | server, storage, accounting, export | Database driver with compile-time query checking |
| `actix-web` | 4.4 | server | Full web framework |
| `tokio` | 1 (full) | server, storage, etc. | Async runtime with all features |
| `reqwest` | 0.11 | server | HTTP client for external APIs |
| `zip` | 0.6 | server, csv_export | Archive handling |
| `tokio-cron-scheduler` | 0.10 | server | Background job scheduling |

---

## 4. Feature Flags Currently Defined

### 4.1 Server Crate Features

**Source:** `backend/crates/server/Cargo.toml` lines 18-21
```toml
[features]
default = []
export = ["csv_export_pack"]
sync = []
```

**Analysis:**
- `export`: Gates the `csv_export_pack` crate (optional dependency)
- `sync`: Defined but **NOT USED** - no conditional compilation found
- `default`: Empty - no features enabled by default

### 4.2 Capabilities Crate Features

**Source:** `backend/crates/capabilities/Cargo.toml` lines 23-26
```toml
[features]
default = []
export = []  # Feature flag to enable export functionality
runtime_detection = ["reqwest", "tokio"]
```

**Analysis:**
- `export`: Empty feature flag (marker only)
- `runtime_detection`: Gates HTTP client for healthchecks

### 4.3 Feature Flag Usage in Code

**Source:** `backend/crates/server/src/handlers/capabilities.rs` lines 167-170
```rust
#[cfg(feature = "export")]
{
    assert!(body.features.export);
}
```

**Source:** `backend/crates/server/src/handlers/capabilities.rs` lines 82-89
```rust
let accounting_mode = if cfg!(feature = "sync") {
    "sync"
} else if cfg!(feature = "export") {
    "export_only"
} else {
    "disabled"
};
```

---

## 5. Feature Flag Gaps

### 5.1 Missing Feature Gates

The following heavy dependencies are **NOT feature-gated** but should be:

| Dependency | Current State | Should Be |
|------------|---------------|-----------|
| `image` | Always compiled | Optional, gated by `ocr` or `document-processing` feature |
| `imageproc` | Always compiled | Optional, gated by `ocr` or `document-processing` feature |
| `lopdf` | Always compiled | Optional, gated by `pdf` or `document-processing` feature |

### 5.2 Services Without Feature Gates

The following services use heavy dependencies but have no conditional compilation:

| Service | Heavy Deps Used | Suggested Feature |
|---------|-----------------|-------------------|
| `document_ingest_service` | image, lopdf | `document-processing` |
| `image_preprocessing` | image, imageproc | `ocr` |
| `orientation_service` | image, imageproc | `ocr` |
| `variant_generator` | image, imageproc | `ocr` |
| `zone_detector_service` | image | `ocr` |
| `zone_cropper` | image | `ocr` |
| `cleanup_engine/*` | image | `document-cleanup` |
| `mask_engine` | image | `document-cleanup` |

### 5.3 Unused Feature Flags

| Feature | Crate | Status |
|---------|-------|--------|
| `sync` | server | Defined but no `#[cfg(feature = "sync")]` found in code |
| `export` | capabilities | Empty marker, no actual gating |

---

## 6. Build Profile Analysis

### 6.1 Current Build Profiles

**Source:** `backend/Cargo.toml` lines 95-99
```toml
[profile.release]
opt-level = 3
lto = true
codegen-units = 1
```

### 6.2 No "Lite" vs "Full" Distinction

**Finding:** There is currently **NO** lite vs full build distinction in the workspace.

- All heavy dependencies are always compiled
- Only `csv_export_pack` is optional (via `export` feature)
- Image/PDF processing is always included in the server binary

---

## 7. Summary Statistics

| Metric | Count |
|--------|-------|
| Total workspace crates | 8 |
| Crates with internal deps | 6 |
| Leaf crates (no internal deps) | 2 |
| Heavy dependencies identified | 3 (image, imageproc, lopdf) |
| Feature flags defined | 4 |
| Feature flags actually used | 2 |
| Services using heavy deps | 10+ |
| Services with feature gates | 0 |
