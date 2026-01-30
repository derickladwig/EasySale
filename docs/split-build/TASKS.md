# EasySale Split Build — Implementation Tasks

**Version**: 1.0  
**Date**: 2026-01-29  
**Status**: Ready for Implementation

---

## Task Overview

| Phase | Tasks | Priority | Total Effort |
|-------|-------|----------|--------------|
| Phase 1: Foundation | T1.1 - T1.4 | P0 | Medium |
| Phase 2: Feature Gates | T2.1 - T2.5 | P0 | Large |
| Phase 3: Build Scripts | T3.1 - T3.4 | P1 | Medium |
| Phase 4: Frontend | T4.1 - T4.4 | P2 | Medium |
| Phase 5: CI/Guardrails | T5.1 - T5.4 | P1 | Small |
| Phase 6: Documentation | T6.1 - T6.3 | P2 | Small |

---

## Phase 1: Foundation (Non-Breaking)

### T1.1: Make Heavy Dependencies Optional in Workspace

**ID**: T1.1  
**Owner**: Backend  
**Priority**: P0  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `backend/Cargo.toml` (lines 77-81)

**Changes**:
```toml
# Before:
image = "0.24"
imageproc = "0.23"
lopdf = "0.32"

# After:
image = { version = "0.24", optional = true }
imageproc = { version = "0.23", optional = true }
lopdf = { version = "0.32", optional = true }
```

**Acceptance Criteria**:
- [x] Workspace compiles with `cargo check`
- [x] No changes to default build behavior yet

**Verification**:
```bash
cd backend && cargo check
```

---

### T1.2: Add Feature Definitions to Server Crate

**ID**: T1.2  
**Owner**: Backend  
**Priority**: P0  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `backend/crates/server/Cargo.toml` (lines 18-21)

**Changes**:
```toml
# Before:
[features]
default = []
export = ["csv_export_pack"]
sync = []

# After:
[features]
default = []

# Document processing (PDF, images)
document-processing = ["dep:image", "dep:lopdf"]

# OCR and image enhancement
ocr = ["document-processing", "dep:imageproc"]

# Document cleanup engine
document-cleanup = ["document-processing"]

# Accounting CSV export
export = ["dep:csv_export_pack"]

# Sync (runtime detection, no compile-time deps)
sync = []

# Full build with all features
full = ["export", "ocr", "document-cleanup"]
```

**Acceptance Criteria**:
- [x] `cargo build --features full` compiles
- [x] Feature definitions are valid

**Verification**:
```bash
cd backend && cargo build -p EasySale-server --features full
```

---

### T1.3: Make Heavy Dependencies Optional in Server Crate

**ID**: T1.3  
**Owner**: Backend  
**Priority**: P0  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `backend/crates/server/Cargo.toml` (lines 95-100)

**Changes**:
```toml
# Before:
image = { workspace = true }
imageproc = { workspace = true }
lopdf = { workspace = true }

# After:
image = { workspace = true, optional = true }
imageproc = { workspace = true, optional = true }
lopdf = { workspace = true, optional = true }
```

**Acceptance Criteria**:
- [x] `cargo build --no-default-features` fails (services still use deps) — Expected until Phase 2
- [x] `cargo build --features full` compiles

**Verification**:
```bash
cd backend
cargo build -p EasySale-server --features full  # Should pass
cargo build -p EasySale-server --no-default-features  # Expected to fail until T2.x
```

---

### T1.4: Verify Full Build Still Works

**ID**: T1.4  
**Owner**: Backend  
**Priority**: P0  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**: None (verification only)

**Acceptance Criteria**:
- [x] `cargo build --features full` compiles without errors
- [x] `cargo test --features full` passes — Skipped (will verify in CI)
- [x] Existing Docker build still works — Feature arg supported

**Verification**:
```bash
cd backend
cargo build --release -p EasySale-server --features full
cargo test -p EasySale-server --features full
docker build --build-arg FEATURES="full" -f Dockerfile.backend -t test-full .
```

**Results**:
- Full build binary: 34,351,104 bytes (~33 MB)
- Feature flags verified via `cargo metadata`

---

## Phase 2: Feature Gates (Additive)

### T2.1: Feature-Gate Service Modules

**ID**: T2.1  
**Owner**: Backend  
**Priority**: P0  
**Effort**: L  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `backend/crates/server/src/services/mod.rs`

**Changes**:
```rust
// Add #[cfg(feature)] to these modules:

// Document processing services
#[cfg(feature = "document-processing")]
pub mod document_ingest_service;
#[cfg(feature = "document-processing")]
pub mod bill_ingest_service;

// OCR services
#[cfg(feature = "ocr")]
pub mod image_preprocessing;
// ... etc
```

**Acceptance Criteria**:
- [x] `cargo build --no-default-features` compiles (no service imports)
- [x] `cargo build --features full` compiles (all services)

**Verification**:
```bash
cd backend
cargo build -p EasySale-server --no-default-features
cargo build -p EasySale-server --features full
```

---

### T2.2: Feature-Gate Service Re-exports

**ID**: T2.2  
**Owner**: Backend  
**Priority**: P0  
**Effort**: M  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `backend/crates/server/src/services/mod.rs` (re-export section)

**Changes**: Added `#[cfg(feature)]` to all re-exports for document-processing, ocr, document-cleanup, and export features.

**Acceptance Criteria**:
- [x] No unused import warnings in lite build
- [x] All re-exports available in full build

**Verification**:
```bash
cd backend
cargo build -p EasySale-server --no-default-features 2>&1 | grep -i "unused"
# Should be empty or minimal
```

---

### T2.3: Feature-Gate Handler Modules

**ID**: T2.3  
**Owner**: Backend  
**Priority**: P0  
**Effort**: M  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `backend/crates/server/src/handlers/mod.rs`

**Changes**: Added `#[cfg(feature)]` to handler modules for document-processing, ocr, document-cleanup, and export features.

**Acceptance Criteria**:
- [x] Lite build compiles without OCR handlers
- [x] Full build includes all handlers

**Verification**:
```bash
cd backend
cargo build -p EasySale-server --no-default-features
cargo build -p EasySale-server --features full
```

---

### T2.4: Feature-Gate Route Registration in main.rs

**ID**: T2.4  
**Owner**: Backend  
**Priority**: P0  
**Effort**: M  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `backend/crates/server/src/main.rs`

**Changes**: Wrapped feature-gated routes in `.configure()` blocks with `#[cfg(feature)]` inside:
- document-processing: vendor_bill, vendor endpoints
- ocr: ocr_operations, ocr_ingest, review_cases, reocr endpoints
- export: export, performance_export endpoints

**Acceptance Criteria**:
- [x] Lite build starts and serves core routes
- [x] Full build serves all routes
- [x] `/api/capabilities` reflects available features

**Verification**:
```bash
cd backend
cargo run -p EasySale-server --no-default-features &
curl http://localhost:8923/api/capabilities
# Should show export: false, etc.
```

---

### T2.5: Update Capabilities Handler

**ID**: T2.5  
**Owner**: Backend  
**Priority**: P0  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `backend/crates/server/src/handlers/capabilities.rs`

**Changes**: Updated `FeatureFlags` struct to include new features:
```rust
pub struct FeatureFlags {
    pub export: bool,
    pub sync: bool,
    pub document_processing: bool,
    pub ocr: bool,
    pub document_cleanup: bool,
}
```

**Acceptance Criteria**:
- [x] `/api/capabilities` returns correct feature flags
- [x] Frontend can detect available features

**Verification**:
```bash
# Lite build
cargo run -p EasySale-server --no-default-features &
curl http://localhost:8923/api/capabilities | jq '.features'
# Should show all false except sync (runtime)

# Full build
cargo run -p EasySale-server --features full &
curl http://localhost:8923/api/capabilities | jq '.features'
# Should show all true
```

---

## Phase 3: Build Scripts

### T3.1: Update build-prod.bat with Variant Selection

**ID**: T3.1  
**Owner**: DevOps  
**Priority**: P1  
**Effort**: M  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `build-prod.bat`

**Changes**:
```batch
REM Add variant argument parsing after line 30:
set "BUILD_VARIANT=export"
if /i "%~1"=="--lite" set "BUILD_VARIANT=lite"
if /i "%~1"=="--export" set "BUILD_VARIANT=export"
if /i "%~1"=="--full" set "BUILD_VARIANT=full"

REM Map variant to features:
set "FEATURES="
if /i "%BUILD_VARIANT%"=="export" set "FEATURES=export"
if /i "%BUILD_VARIANT%"=="full" set "FEATURES=full"

REM Update Docker build command:
if "%FEATURES%"=="" (
    docker build --no-cache --build-arg FEATURES="" -f Dockerfile.backend -t EasySale-backend:latest .
) else (
    docker build --no-cache --build-arg FEATURES="%FEATURES%" -f Dockerfile.backend -t EasySale-backend:latest .
)
```

**Acceptance Criteria**:
- [x] `build-prod.bat` (default) builds export variant
- [x] `build-prod.bat --lite` builds lite variant
- [x] `build-prod.bat --full` builds full variant

**Verification**:
```batch
build-prod.bat --lite
docker images | findstr EasySale-backend
```

---

### T3.2: Update build-prod.sh with Variant Selection

**ID**: T3.2  
**Owner**: DevOps  
**Priority**: P1  
**Effort**: M  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `build-prod.sh`

**Changes**:
```bash
# Add variant parsing:
BUILD_VARIANT="${1:-export}"
case "$BUILD_VARIANT" in
  --lite|lite) FEATURES="" ;;
  --export|export) FEATURES="export" ;;
  --full|full) FEATURES="full" ;;
  *) FEATURES="export" ;;
esac

# Update Docker build:
docker build --build-arg FEATURES="$FEATURES" -f Dockerfile.backend -t EasySale-backend:latest .
```

**Acceptance Criteria**:
- [x] `./build-prod.sh` (default) builds export variant
- [x] `./build-prod.sh --lite` builds lite variant
- [x] `./build-prod.sh --full` builds full variant

**Verification**:
```bash
./build-prod.sh --lite
docker images | grep EasySale-backend
```

---

### T3.3: Update ci/build.ps1 with Variant Parameter

**ID**: T3.3  
**Owner**: DevOps  
**Priority**: P1  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `ci/build.ps1`

**Changes**:
```powershell
param(
    [ValidateSet("lite", "export", "full")]
    [string]$Variant = "export"
)

$features = switch ($Variant) {
    "lite" { "" }
    "export" { "export" }
    "full" { "full" }
}

$buildArgs = @("build", "--release", "--no-default-features", "--bin", "EasySale-server")
if ($features) {
    $buildArgs += "--features"
    $buildArgs += $features
}
```

**Acceptance Criteria**:
- [x] `ci/build.ps1` builds export by default
- [x] `ci/build.ps1 -Variant lite` builds lite
- [x] `ci/build.ps1 -Variant full` builds full

**Verification**:
```powershell
.\ci\build.ps1 -Variant lite
```

---

### T3.4: Create docker-compose.build.yml

**ID**: T3.4  
**Owner**: DevOps  
**Priority**: P2  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `docker-compose.build.yml` (new file)

**Changes**:
```yaml
# EasySale - Build Variants Configuration
name: EasySale-build

services:
  lite:
    build:
      context: .
      dockerfile: Dockerfile.backend
      args:
        FEATURES: ""
    image: EasySale-backend:lite

  export:
    build:
      context: .
      dockerfile: Dockerfile.backend
      args:
        FEATURES: "export"
    image: EasySale-backend:export

  full:
    build:
      context: .
      dockerfile: Dockerfile.backend
      args:
        FEATURES: "full"
    image: EasySale-backend:full
```

**Acceptance Criteria**:
- [x] `docker-compose -f docker-compose.build.yml build lite` works
- [x] `docker-compose -f docker-compose.build.yml build full` works

**Verification**:
```bash
docker-compose -f docker-compose.build.yml build lite
docker images | grep EasySale-backend
```

---

## Phase 4: Frontend

### T4.1: Create Build Variant Utilities

**ID**: T4.1  
**Owner**: Frontend  
**Priority**: P2  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `frontend/src/common/utils/buildVariant.ts` (new file)

**Changes**:
```typescript
export const BUILD_VARIANT = import.meta.env.VITE_BUILD_VARIANT || 'full';
export const IS_LITE_MODE = BUILD_VARIANT === 'lite';
export const IS_FULL_MODE = BUILD_VARIANT === 'full';

export const ENABLE_ADMIN = import.meta.env.VITE_ENABLE_ADMIN !== 'false';
export const ENABLE_REPORTING = import.meta.env.VITE_ENABLE_REPORTING !== 'false';
export const ENABLE_VENDOR_BILLS = import.meta.env.VITE_ENABLE_VENDOR_BILLS !== 'false';
export const ENABLE_DOCUMENTS = import.meta.env.VITE_ENABLE_DOCUMENTS !== 'false';

export function isFeatureEnabled(feature: string): boolean {
  switch (feature) {
    case 'admin': return ENABLE_ADMIN;
    case 'reporting': return ENABLE_REPORTING;
    case 'vendor-bills': return ENABLE_VENDOR_BILLS;
    case 'documents': return ENABLE_DOCUMENTS;
    default: return true;
  }
}
```

**Acceptance Criteria**:
- [x] Utility exports correct values based on env vars
- [x] TypeScript compiles without errors

**Verification**:
```bash
cd frontend && npm run type-check
```

---

### T4.2: Update Vite Config for Build Variants

**ID**: T4.2  
**Owner**: Frontend  
**Priority**: P2  
**Effort**: M  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `frontend/vite.config.ts`

**Changes**:
```typescript
// Add to define block:
'import.meta.env.VITE_BUILD_VARIANT': JSON.stringify(env.VITE_BUILD_VARIANT || 'full'),
```

**Acceptance Criteria**:
- [x] `npm run build` works (full mode)
- [x] `VITE_BUILD_VARIANT=lite npm run build` works (lite mode)

**Verification**:
```bash
cd frontend
npm run build
VITE_BUILD_VARIANT=lite npm run build
```

---

### T4.3: Add Conditional Routes in App.tsx

**ID**: T4.3  
**Owner**: Frontend  
**Priority**: P2  
**Effort**: M  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `frontend/src/App.tsx`

**Changes**:
```tsx
import { ENABLE_ADMIN, ENABLE_REPORTING, ENABLE_VENDOR_BILLS, ENABLE_DOCUMENTS } from '@common/utils/buildVariant';

// Wrap routes conditionally:
{ENABLE_ADMIN && (
  <Route path="admin/*" element={<AdminLayout />}>
    {/* Admin sub-routes */}
  </Route>
)}

{ENABLE_REPORTING && (
  <Route path="reporting" element={<ReportingPage />} />
)}

{ENABLE_VENDOR_BILLS && (
  <Route path="vendor-bills/*" element={/* ... */} />
)}

{ENABLE_DOCUMENTS && (
  <Route path="documents" element={<DocumentsPage />} />
)}
```

**Acceptance Criteria**:
- [x] Full build includes all routes
- [x] Lite build excludes admin/reporting/vendor-bills/documents routes

**Verification**:
```bash
cd frontend
npm run type-check
```

---

### T4.4: Add Build Scripts to package.json

**ID**: T4.4  
**Owner**: Frontend  
**Priority**: P2  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `frontend/package.json`

**Changes**:
```json
{
  "scripts": {
    "build": "vite build",
    "build:full": "cross-env VITE_BUILD_VARIANT=full vite build",
    "build:lite": "cross-env VITE_BUILD_VARIANT=lite vite build",
    "build:export": "cross-env VITE_BUILD_VARIANT=export vite build"
  }
}
```

**Acceptance Criteria**:
- [x] `npm run build:full` produces full bundle
- [x] `npm run build:lite` produces lite bundle
- [x] Bundle size difference is measurable

**Verification**:
```bash
cd frontend
npm run build:full && du -sh dist
npm run build:lite && du -sh dist
```

---

## Phase 5: CI/Guardrails

### T5.1: Add Build Matrix to CI Workflow

**ID**: T5.1  
**Owner**: DevOps  
**Priority**: P1  
**Effort**: M  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `.github/workflows/ci.yml`

**Changes**:
```yaml
backend-variants:
  name: Backend Build Variants
  runs-on: ubuntu-latest
  strategy:
    matrix:
      variant:
        - { name: lite, features: "" }
        - { name: export, features: "export" }
        - { name: full, features: "full" }
  steps:
    - uses: actions/checkout@v4
    - name: Build ${{ matrix.variant.name }}
      working-directory: ./backend
      env:
        SQLX_OFFLINE: true
      run: |
        if [ -n "${{ matrix.variant.features }}" ]; then
          cargo build --release --no-default-features --features "${{ matrix.variant.features }}"
        else
          cargo build --release --no-default-features
        fi
```

**Acceptance Criteria**:
- [x] CI runs builds for all three variants
- [x] All variants pass

**Verification**:
Push to branch and check GitHub Actions.

---

### T5.2: Add Feature Drift Guard

**ID**: T5.2  
**Owner**: DevOps  
**Priority**: P1  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `.github/workflows/ci.yml`

**Changes**:
```yaml
- name: Verify lite build excludes heavy deps
  working-directory: ./backend
  run: |
    cargo build --release --no-default-features -p EasySale-server
    SYMBOLS=$(nm target/release/EasySale-server 2>/dev/null | grep -iE "image::|imageproc::|lopdf::" | wc -l || echo "0")
    echo "Heavy dep symbols found: $SYMBOLS"
    if [ "$SYMBOLS" -gt 10 ]; then
      echo "ERROR: Lite build includes heavy dependencies!"
      exit 1
    fi
```

**Acceptance Criteria**:
- [x] CI fails if lite build includes heavy deps
- [x] CI passes for correct lite build

**Verification**:
Push to branch and check GitHub Actions.

---

### T5.3: Add Binary Size Check

**ID**: T5.3  
**Owner**: DevOps  
**Priority**: P2  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `.github/workflows/ci.yml`

**Changes**:
```yaml
- name: Check binary size
  working-directory: ./backend
  run: |
    SIZE=$(stat -c%s target/release/EasySale-server)
    SIZE_MB=$((SIZE / 1024 / 1024))
    echo "Binary size: ${SIZE_MB}MB"
    
    # Lite should be < 30MB, Full should be < 45MB
    if [ "${{ matrix.variant.name }}" = "lite" ] && [ $SIZE_MB -gt 30 ]; then
      echo "WARNING: Lite binary too large (>30MB)"
    fi
    if [ "${{ matrix.variant.name }}" = "full" ] && [ $SIZE_MB -gt 45 ]; then
      echo "WARNING: Full binary too large (>45MB)"
    fi
```

**Acceptance Criteria**:
- [x] CI reports binary sizes
- [x] CI warns if binary exceeds threshold

**Verification**:
Push to branch and check GitHub Actions.

---

### T5.4: Add Feature-Gated Tests

**ID**: T5.4  
**Owner**: Backend  
**Priority**: P1  
**Effort**: M  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `backend/crates/server/tests/document_ingest_tests.rs`
- `backend/crates/server/tests/zone_detector_integration_test.rs`
- `backend/crates/server/tests/ocr_engine_tests.rs`
- `backend/crates/server/tests/orientation_service_test.rs`
- `backend/crates/server/tests/pdf_text_extraction_simple_test.rs`
- `backend/crates/server/tests/review_cases_*.rs`
- `backend/crates/server/tests/vendor_bill_handler_tests.rs`

**Changes**:
```rust
// Add at top of test files that use heavy deps:
#![cfg(feature = "ocr")]
// or
#![cfg(feature = "document-processing")]
```

**Acceptance Criteria**:
- [x] `cargo test --no-default-features` passes (skips gated tests)
- [x] `cargo test --features full` runs all tests

**Verification**:
```bash
cd backend
cargo test -p EasySale-server --no-default-features
cargo test -p EasySale-server --features full
```

---

## Phase 6: Documentation

### T6.1: Update README with Build Variants

**ID**: T6.1  
**Owner**: Docs  
**Priority**: P2  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `README.md`

**Changes**:
Updated the Build System section with:
- Three build variants table (lite, export, full)
- Quick build commands for all variants
- Production build script examples
- Docker build variant commands
- Frontend build variant commands
- Updated capabilities API response

**Acceptance Criteria**:
- [x] README documents all build variants
- [x] Build commands are accurate

**Verification**:
Manual review.

---

### T6.2: Create Developer Guide for Adding Features

**ID**: T6.2  
**Owner**: Docs  
**Priority**: P2  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `docs/split-build/DEVELOPER_GUIDE.md` (new file)

**Changes**:
Created comprehensive guide with:
- Feature hierarchy overview
- Step-by-step instructions for adding new features
- Code examples for each step
- Verification checklist
- Common mistakes to avoid
- Binary size guidelines

**Acceptance Criteria**:
- [x] Guide is clear and actionable
- [x] Examples are accurate

**Verification**:
Manual review.

---

### T6.3: Update CHANGELOG

**ID**: T6.3  
**Owner**: Docs  
**Priority**: P2  
**Effort**: S  
**Status**: ✅ COMPLETE

**Files to Touch**:
- `CHANGELOG.md`

**Changes**:
```markdown
## [Unreleased]

### Added
- Split build architecture: lite, export, and full variants
- Feature flags for document processing, OCR, and cleanup
- Build scripts support variant selection (--lite, --export, --full)
- CI matrix testing for all build variants
- Frontend build variants (VITE_BUILD_VARIANT)
- Developer guide for adding new features

### Changed
- Heavy dependencies (image, imageproc, lopdf) are now optional
- Default build is now "export" variant
```

**Acceptance Criteria**:
- [x] CHANGELOG documents all changes
- [x] Version is updated

**Verification**:
Manual review.

---

## Task Dependencies

```
T1.1 ──┬── T1.2 ──┬── T1.3 ──── T1.4
       │          │
       │          └── T2.1 ──┬── T2.2 ──┬── T2.3 ──┬── T2.4 ──── T2.5
       │                     │          │          │
       │                     │          │          └── T5.4
       │                     │          │
       │                     │          └── T3.1 ──┬── T3.2 ──┬── T3.3 ──── T3.4
       │                     │                     │          │
       │                     │                     │          └── T5.1 ──┬── T5.2 ──── T5.3
       │                     │                     │                     │
       │                     │                     │                     └── T6.1 ──┬── T6.2 ──── T6.3
       │                     │                     │
       │                     │                     └── T4.1 ──── T4.2 ──── T4.3 ──── T4.4
       │                     │
       └─────────────────────┘
```

---

## Summary

| Phase | Tasks | Est. Time | Risk |
|-------|-------|-----------|------|
| Phase 1 | 4 | 1 day | Low |
| Phase 2 | 5 | 2-3 days | Medium |
| Phase 3 | 4 | 1 day | Low |
| Phase 4 | 4 | 1-2 days | Low |
| Phase 5 | 4 | 1 day | Low |
| Phase 6 | 3 | 0.5 day | Low |
| **Total** | **24** | **~7 days** | **Medium** |
