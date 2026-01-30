# EasySale Split Build Architecture — Master Plan

**Version**: 1.0  
**Date**: 2026-01-29  
**Status**: Ready for Implementation

---

## Executive Summary

This document defines the architecture for implementing a true "lite" vs "full" split build system for EasySale. The goal is to enable a minimal POS-only build that excludes heavy document processing dependencies (~3-5MB binary savings) while maintaining a full-featured enterprise build.

---

## 1. Current State (Truth-Synced)

### 1.1 What EXISTS

| Component | Status | Evidence |
|-----------|--------|----------|
| Feature flags defined | ✅ | `backend/crates/server/Cargo.toml:18-21` — `export`, `sync` features |
| `csv_export_pack` optional | ✅ | `backend/crates/server/Cargo.toml:33` — `optional = true` |
| Docker FEATURES arg | ✅ | `Dockerfile.backend:6` — `ARG FEATURES=""` |
| Conditional Docker build | ✅ | `Dockerfile.backend:42-45, 55-59` — feature-based cargo build |
| Capabilities API | ✅ | `GET /api/capabilities` returns feature status |

### 1.2 What is BROKEN

| Problem | Evidence | Impact |
|---------|----------|--------|
| **Build scripts ignore features** | `build-prod.bat:127` — no `--build-arg FEATURES` | All builds produce same binary |
| **Heavy deps not optional** | `backend/crates/server/Cargo.toml:95-100` — `image`, `imageproc`, `lopdf` always compiled | Lite build still includes OCR deps |
| **Services not feature-gated** | `backend/crates/server/src/services/mod.rs` — no `#[cfg(feature)]` | All services compiled regardless of build |
| **CI doesn't test variants** | `.github/workflows/ci.yml` — single build only | No verification of lite build |
| **Frontend has no lite mode** | `frontend/package.json` — single `npm run build` | All routes always bundled |

### 1.3 Dependency Analysis

**Heavy Dependencies (Always Compiled)**:
```
image (0.24)      — ~2-3 MB compiled, used in 10+ services
imageproc (0.23)  — ~500KB-1MB, used in 4 services  
lopdf (0.32)      — ~300-500KB, used in document ingest
```

**Services Using Heavy Deps** (from `services/mod.rs`):
- `document_ingest_service` — image, lopdf
- `image_preprocessing` — image, imageproc
- `orientation_service` — image, imageproc
- `variant_generator` — image, imageproc
- `zone_detector_service` — image
- `zone_cropper` — image
- `cleanup_engine/*` — image
- `mask_engine` — image
- `bill_ingest_service` — uses document services

---

## 2. Problems Found (With Evidence)

### Problem 1: Build Scripts Don't Use Feature Flags

**Evidence**: `build-prod.bat` line 127:
```batch
docker build --no-cache -f Dockerfile.backend -t EasySale-backend:latest .
```

**Missing**: `--build-arg FEATURES="export"` or variant selection.

### Problem 2: Heavy Dependencies Not Optional

**Evidence**: `backend/crates/server/Cargo.toml` lines 95-100:
```toml
# Image processing for OCR enhancement
image = { workspace = true }
imageproc = { workspace = true }

# PDF processing for text layer extraction
lopdf = { workspace = true }
```

**Missing**: `optional = true` on these dependencies.

### Problem 3: Services Not Feature-Gated

**Evidence**: `backend/crates/server/src/services/mod.rs` lines 12-50:
```rust
pub mod document_ingest_service;  // No #[cfg(feature)]
pub mod image_preprocessing;       // No #[cfg(feature)]
pub mod mask_engine;               // No #[cfg(feature)]
```

### Problem 4: CI Doesn't Test Build Variants

**Evidence**: `.github/workflows/ci.yml` backend job:
```yaml
- name: Build release binary
  run: cargo build --release --verbose
```

**Missing**: Matrix testing for `--no-default-features` and `--features export`.

---

## 3. Target Architecture

### 3.1 Chosen Option: Single Server Crate with Feature-Gated Modules

**Rationale**:
- Minimal disruption to existing codebase
- Cargo features are well-tested and idiomatic
- Allows incremental adoption
- No workspace restructuring needed
- Docker already supports `FEATURES` arg

**Rejected Alternatives**:
- Option 2 (separate crates): Too much restructuring, breaks existing imports
- Option 3 (workspace member groups): Overkill for current needs
- Option 4 (binary targets): Doesn't reduce compiled code

### 3.2 Feature Flag Hierarchy

```
[features]
default = []

# Core POS (always included)
# - products, customers, sales, basic inventory

# Document processing (PDF, images)
document-processing = ["dep:image", "dep:lopdf"]

# OCR and image enhancement  
ocr = ["document-processing", "dep:imageproc"]

# Document cleanup engine
document-cleanup = ["document-processing"]

# Accounting export
export = ["dep:csv_export_pack"]

# Full build with all features
full = ["export", "ocr", "document-cleanup"]
```

### 3.3 Build Variants

| Variant | Features | Use Case | Binary Size |
|---------|----------|----------|-------------|
| **Lite** | `--no-default-features` | Basic POS, no OCR/export | ~25 MB |
| **Export** | `--features export` | POS + CSV export | ~28 MB |
| **Full** | `--features full` | All features | ~32 MB |

---

## 4. Build/Run/CI Commands

### 4.1 Backend Build Commands

```bash
# Lite build (core POS only)
cargo build --release -p EasySale-server --no-default-features

# Export build (POS + CSV export)
cargo build --release -p EasySale-server --no-default-features --features export

# Full build (all features)
cargo build --release -p EasySale-server --no-default-features --features full
```

### 4.2 Docker Build Commands

```bash
# Lite image
docker build --build-arg FEATURES="" -f Dockerfile.backend -t EasySale-backend:lite .

# Export image
docker build --build-arg FEATURES="export" -f Dockerfile.backend -t EasySale-backend:export .

# Full image
docker build --build-arg FEATURES="full" -f Dockerfile.backend -t EasySale-backend:full .
```

### 4.3 Frontend Build Commands

```bash
# Full build (default)
npm run build

# Lite build (after implementation)
VITE_BUILD_VARIANT=lite npm run build
```

### 4.4 CI Matrix

```yaml
strategy:
  matrix:
    variant:
      - { name: lite, features: "" }
      - { name: export, features: "export" }
      - { name: full, features: "full" }
```

---

## 5. Rollout Phases

### Phase 1: Foundation (Week 1) — Non-Breaking

1. Add optional flags to workspace `Cargo.toml`
2. Add feature definitions to server `Cargo.toml`
3. Make heavy deps optional
4. Keep all features enabled by default initially
5. **Verification**: `cargo build --features full` still works

### Phase 2: Feature Gates (Week 2) — Additive

1. Add `#[cfg(feature = "...")]` to service modules
2. Add conditional re-exports in `mod.rs`
3. Add conditional route registration in `main.rs`
4. **Verification**: Both lite and full builds compile

### Phase 3: Build Scripts (Week 3) — Integration

1. Update `build-prod.bat` with variant selection
2. Update `build-prod.sh` with variant selection
3. Add CI matrix for build variants
4. **Verification**: CI passes for all variants

### Phase 4: Frontend (Week 4) — Optional

1. Add `VITE_BUILD_VARIANT` env var
2. Implement conditional route loading
3. Add build scripts for lite/full
4. **Verification**: Both frontend variants build

---

## 6. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing builds | Medium | High | Keep `full` feature that enables everything |
| Missing feature gates | Medium | Medium | Comprehensive CI matrix testing |
| Runtime errors in lite | Low | High | Feature detection in handlers |
| Frontend/backend mismatch | Low | Medium | Capabilities API for feature detection |

### Mitigation Strategies

1. **Gradual rollout**: Phase 1 is non-breaking, can stop at any phase
2. **CI guardrails**: Matrix testing catches missing gates
3. **Runtime detection**: Capabilities API tells frontend what's available
4. **Documentation**: Clear developer guide for adding features

---

## 7. Acceptance Criteria Checklist

### Backend
- [ ] `cargo build --no-default-features` compiles without OCR deps
- [ ] `cargo build --features full` compiles with all deps
- [ ] Binary size difference is measurable (>2MB)
- [ ] Lite build doesn't include `image`, `imageproc`, `lopdf` symbols
- [ ] `/api/capabilities` correctly reports feature status

### Frontend
- [ ] `VITE_BUILD_VARIANT=lite npm run build` excludes admin routes
- [ ] `npm run build` (full) includes all routes
- [ ] Bundle size difference is measurable (>100KB)
- [ ] Navigation hides unavailable features

### CI/CD
- [ ] CI tests both lite and full variants
- [ ] CI fails if lite build includes full-only deps
- [ ] Docker builds work for all variants
- [ ] Binary size check prevents bloat regression

### Documentation
- [ ] README documents build variants
- [ ] Developer guide explains how to add features
- [ ] DESIGN.md explains architecture
- [ ] TASKS.md tracks implementation

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Lite binary size | <28 MB | `ls -lh target/release/EasySale-server` |
| Full binary size | <35 MB | `ls -lh target/release/EasySale-server` |
| Lite Docker image | <150 MB | `docker images` |
| Full Docker image | <200 MB | `docker images` |
| CI build time | <10 min per variant | GitHub Actions timing |
| Frontend lite bundle | <300 KB initial | Vite build output |

---

## Appendix: File Evidence Index

| File | Lines | Purpose |
|------|-------|---------|
| `backend/Cargo.toml` | 77-81 | Workspace heavy deps |
| `backend/crates/server/Cargo.toml` | 18-21, 95-100 | Features, heavy deps |
| `backend/crates/server/src/services/mod.rs` | 1-50 | Service modules |
| `Dockerfile.backend` | 6, 42-59 | FEATURES arg, conditional build |
| `build-prod.bat` | 127 | Docker build command |
| `.github/workflows/ci.yml` | 50-100 | CI build steps |
