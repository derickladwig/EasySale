# Split Build Architecture Complete

**Date**: 2026-01-29  
**Author**: Kiro  
**Tags**: architecture, build-system, optimization

## Summary

Implemented a true split build architecture for EasySale, enabling three distinct build variants with different feature sets and binary sizes.

## The Problem

The existing codebase had feature flags defined but they weren't actually being used - all builds produced the same ~35 MB binary regardless of which features were requested. This meant:

- Lite deployments carried unnecessary OCR/document processing code
- Binary sizes were larger than needed for basic POS operations
- No way to ship a minimal footprint version

## The Solution

Implemented a comprehensive split build system across 6 phases:

### Phase 1: Foundation
Made heavy dependencies (`image`, `imageproc`, `lopdf`) optional in Cargo.toml.

### Phase 2: Feature Gates
Added `#[cfg(feature)]` attributes to:
- Service modules (`services/mod.rs`)
- Handler modules (`handlers/mod.rs`)
- Route registration (`main.rs`)
- Capabilities endpoint

### Phase 3: Build Scripts
Updated all build scripts to support variant selection:
- `build-prod.bat --lite|--export|--full`
- `build-prod.sh lite|export|full`
- `ci/build.ps1 -Variant lite|export|full`
- Created `docker-compose.build.yml` for variant builds

### Phase 4: Frontend Split
- Created `buildVariant.ts` utility with feature flags
- Updated `vite.config.ts` for build variant support
- Added conditional routes in `App.tsx`
- Added `npm run build:lite|export|full` scripts

### Phase 5: CI/Guardrails
- Added build matrix to CI for all three variants
- Added feature drift guard (checks lite build excludes heavy deps)
- Added binary size checks with thresholds
- Feature-gated test files

### Phase 6: Documentation
- Updated README with build variant documentation
- Created developer guide for adding new features
- Updated CHANGELOG

## Build Variants

| Variant | Features | Target Size |
|---------|----------|-------------|
| Lite | Core POS only | ~20 MB |
| Export | + CSV export | ~25 MB |
| Full | + OCR, document processing | ~35 MB |

## Key Files Changed

- `backend/crates/server/Cargo.toml` - Feature definitions
- `backend/crates/server/src/services/mod.rs` - Feature-gated modules
- `backend/crates/server/src/handlers/mod.rs` - Feature-gated handlers
- `backend/crates/server/src/main.rs` - Conditional route registration
- `frontend/src/common/utils/buildVariant.ts` - Frontend feature detection
- `frontend/src/App.tsx` - Conditional routes
- `.github/workflows/ci.yml` - Build matrix

## Verification

Both lite and full builds compile successfully:
```bash
# Lite build
cargo build --no-default-features -p EasySale-server

# Full build
cargo build --no-default-features --features full -p EasySale-server
```

## Next Steps

- Monitor binary sizes in CI
- Consider further splitting if new heavy features are added
- Document feature boundaries for new contributors
