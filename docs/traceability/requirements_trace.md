# Requirements Traceability Matrix

**Feature**: Split Build System  
**Generated**: 2026-01-20  
**Purpose**: Map all 14 requirements to current implementation status and identify gaps

## Executive Summary

**Current State**: Single monolithic Rust crate with all integrations compiled in  
**Target State**: Cargo workspace with feature flags enabling Lite (OSS) and Full (Private) builds  
**Implementation Status**: 0/14 requirements fully implemented (baseline established)

### Priority Classification

- **P0 (Critical)**: R1, R2, R9 - Foundation for split build system
- **P1 (High)**: R3, R4, R5, R6, R7 - Core export functionality
- **P2 (Medium)**: R8, R10, R11, R12 - Sync and documentation
- **P3 (Low)**: R13, R14 - Migration and testing infrastructure

---

## Requirement 1: Cargo Workspace Architecture

**Status**: ❌ NOT IMPLEMENTED  
**Priority**: P0 (Critical)  
**Implementation**: 0%

### Current State


**File**: `backend/rust/Cargo.toml`

```toml
[package]
name = "EasySale-api"
version = "0.1.0"
edition = "2021"
```

- Single crate named `EasySale-api`
- No workspace structure
- No feature flags for "export" or "sync"
- All dependencies compiled into every build

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 1.1 Cargo workspace structure | ❌ | Single `[package]`, no `[workspace]` |
| 1.2 Feature flags for "export" and "sync" | ❌ | No `[features]` section in Cargo.toml |
| 1.3 Lite build with no features | ❌ | Cannot build without integrations |
| 1.4 Export build with "export" feature | ❌ | No feature flag exists |
| 1.5 Sync build with "sync" feature | ❌ | No feature flag exists |
| 1.6 POS_Core compiles independently | ❌ | No separate core crate |

### Gap Analysis

**Missing Components**:
- Workspace root `Cargo.toml` with `[workspace]` section
- Separate crates: `pos_core_domain`, `pos_core_models`, `pos_core_storage`, `accounting_snapshots`, `export_batches`, `capabilities`, `csv_export_pack`, `server`
- Feature flag definitions in server crate
- Build scripts for different variants

**Implementation Effort**: 3-5 days (Phase 1 in design)

---

## Requirement 2: Core Domain Isolation

**Status**: ❌ NOT IMPLEMENTED  
**Priority**: P0 (Critical)  
**Implementation**: 0%

### Current State

**Integration Code Locations**:


1. **QuickBooks Integration** (Proprietary):
   - `backend/rust/src/connectors/quickbooks/` - OAuth and API client
   - `backend/rust/src/flows/woo_to_qbo.rs` - WooCommerce to QuickBooks sync
   - `backend/rust/src/services/sync_orchestrator.rs` - Sync coordination
   - `backend/rust/src/services/token_refresh_service.rs` - OAuth token management
   - `backend/rust/src/handlers/integrations/quickbooks_handler.rs` - API endpoints

2. **WooCommerce Integration**:
   - `backend/rust/src/connectors/woocommerce/` - WooCommerce client
   - `backend/rust/src/flows/woo_to_qbo.rs` - Sync flows
   - `backend/rust/src/flows/woo_to_supabase.rs` - Sync flows

3. **Supabase Integration**:
   - `backend/rust/src/connectors/supabase/` - Supabase client
   - `backend/rust/src/flows/woo_to_supabase.rs` - Sync flows

**POS Core Logic** (Currently Mixed In):
- Pricing: `backend/rust/src/services/` (mixed with other services)
- Tax calculation: `backend/rust/src/services/` (mixed with other services)
- Transaction finalization: `backend/rust/src/handlers/` (mixed with API handlers)

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 2.1 POS_Core contains pricing/tax/finalization | ❌ | Logic scattered across services/handlers |
| 2.2 POS_Core has no integration dependencies | ❌ | No separate core crate |
| 2.3 Lite build excludes QuickBooks code | ❌ | All code compiled in monolith |
| 2.4 Trait-based interfaces for integrations | ❌ | Direct dependencies on connectors |
| 2.5 Core compiles with zero integration deps | ❌ | Cannot verify - no separate crate |

### Gap Analysis

**Missing Components**:
- Separate `pos_core_domain` crate with business logic
- Trait definitions for optional integrations
- Clear module boundaries between core and integrations

**Blocker**: Requires R1 (workspace structure) to be implemented first

**Implementation Effort**: 5-7 days (Phase 2 in design)

---

## Requirement 3: Accounting Snapshot System

**Status**: ❌ NOT IMPLEMENTED  
**Priority**: P1 (High)  
**Implementation**: 0%

### Current State

**Database Schema**: No snapshot tables exist


Checked migrations in `backend/rust/migrations/`:
- No `accounting_snapshots` table
- No `snapshot_lines` table
- No `snapshot_payments` table

**Transaction Finalization**: Exists but doesn't create snapshots
- Location: `backend/rust/src/handlers/` and `backend/rust/src/services/`
- Current behavior: Updates transaction status to "finalized"
- Missing: Snapshot creation logic

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 3.1 Snapshot created on finalization | ❌ | No snapshot creation code |
| 3.2 Snapshot includes all required fields | ❌ | No snapshot data structure |
| 3.3 Snapshot is immutable after creation | ❌ | No immutability enforcement |
| 3.4 Export uses snapshot values | ❌ | No snapshots to export |
| 3.5 Snapshot persists immediately | ❌ | No database tables |

### Gap Analysis

**Missing Components**:
- Database migrations for snapshot tables
- `AccountingSnapshot` data structure
- Snapshot creation logic in transaction finalization
- Database triggers to prevent modifications
- API layer immutability enforcement (403 on UPDATE)

**Implementation Effort**: 3-4 days (Phase 3 in design)

---

## Requirement 4: Capability Discovery API

**Status**: ❌ NOT IMPLEMENTED  
**Priority**: P1 (High)  
**Implementation**: 0%

### Current State

**API Endpoint**: Does not exist
- Searched for `/api/capabilities` in codebase: No matches
- No capability detection logic
- No frontend capability querying

**Frontend Behavior**: Static feature availability
- All features shown regardless of backend build
- No runtime adaptation to backend capabilities

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 4.1 GET /api/capabilities endpoint exists | ❌ | No endpoint found |
| 4.2 Returns JSON with available features | ❌ | No implementation |
| 4.3 Reports accounting mode correctly | ❌ | No mode detection |
| 4.4 "disabled" when no export feature | ❌ | No feature flags |
| 4.5 "export_only" with export feature | ❌ | No feature flags |
| 4.6 "sync" with sync feature | ❌ | No feature flags |
| 4.7 Frontend queries on startup | ❌ | No frontend integration |

### Gap Analysis

**Missing Components**:
- `capabilities` crate with detection logic
- `/api/capabilities` endpoint in server
- Compile-time feature detection (`cfg!` macros)
- Runtime sync detection (healthcheck)
- Frontend capability query on startup
- UI gating based on capabilities

**Implementation Effort**: 2-3 days (Phase 4 in design)

---

## Requirement 5: Export Batch Management

**Status**: ❌ NOT IMPLEMENTED  
**Priority**: P1 (High)  
**Implementation**: 0%

### Current State

**Database Schema**: No batch tables exist


Checked migrations:
- No `export_batches` table
- No `batch_snapshots` table

**Export Functionality**: UI exists but no backend
- Frontend: `frontend/src/features/settings/pages/DataManagementPage.tsx`
- Export buttons present with "Export CSV" labels
- Backend endpoint: `/api/data-management/export` (stub implementation)
- No batch tracking or idempotency

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 5.1 Create batch from date range | ❌ | No batch creation logic |
| 5.2 Collect snapshots in range | ❌ | No snapshots exist (R3) |
| 5.3 Assign unique batch ID | ❌ | No batch table |
| 5.4 Persist batch metadata | ❌ | No database schema |
| 5.5 Mark batch as "pending" | ❌ | No status tracking |
| 5.6 Query batches by date/status | ❌ | No query implementation |

### Gap Analysis

**Missing Components**:
- Database migrations for batch tables
- `ExportBatch` data structure
- Batch creation API endpoint
- Date range filtering logic
- Status management (pending/completed/failed)

**Blocker**: Requires R3 (snapshots) to be implemented first

**Implementation Effort**: 2-3 days (Phase 5 in design)

---

## Requirement 6: CSV Export Generation

**Status**: ⚠️ PARTIALLY IMPLEMENTED  
**Priority**: P1 (High)  
**Implementation**: 20%

### Current State

**Frontend UI**: Exists
- File: `frontend/src/features/settings/pages/DataManagementPage.tsx`
- Export buttons for: Products, Customers, Sales, Inventory, Vendors, Settings
- UI shows "Export CSV" functionality
- Tests exist: `DataManagementPage.integration.test.tsx`

**Backend Implementation**: Stub only
- Endpoint: `/api/data-management/export` (exists but incomplete)
- No QuickBooks CSV template implementation
- No snapshot-based export (snapshots don't exist yet)
- No batch completion tracking

**CSV Export Code**: Generic exports only
- File: `frontend/src/features/products/components/BulkOperations.tsx`
- Supports CSV/Excel/JSON formats
- Product bulk operations only
- Not QuickBooks-compatible

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 6.1 CSV_Export_Pack available with "export" | ❌ | No feature flag, no crate |
| 6.2 Generate QuickBooks CSV templates | ❌ | No template implementation |
| 6.3 Use snapshot data without recomputation | ❌ | No snapshots (R3) |
| 6.4 Export sales receipts/invoices/refunds | ⚠️ | UI exists, backend stub |
| 6.5 Include all required QuickBooks fields | ❌ | No QuickBooks format |
| 6.6 Mark batch "completed" on success | ❌ | No batch tracking (R5) |
| 6.7 Mark batch "failed" and log errors | ❌ | No error tracking |

### Gap Analysis

**Missing Components**:
- `csv_export_pack` crate with QuickBooks templates
- Sales receipt CSV exporter
- Invoice CSV exporter
- Credit memo CSV exporter
- Snapshot-based data extraction
- Batch status updates
- Error logging and recovery

**Blocker**: Requires R3 (snapshots) and R5 (batches) first

**Implementation Effort**: 4-5 days (Phase 6 in design)

---

## Requirement 7: Idempotent Export Operations

**Status**: ❌ NOT IMPLEMENTED  
**Priority**: P1 (High)  
**Implementation**: 0%

### Current State

**Export Tracking**: None
- No mechanism to prevent duplicate exports
- No tracking of which transactions have been exported
- No batch completion status
- Exports can be run multiple times on same data

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 7.1 Prevent re-export of completed batches | ❌ | No batch status tracking |
| 7.2 Track exported transactions | ❌ | No export history |
| 7.3 Exclude already-exported transactions | ❌ | No exclusion logic |
| 7.4 Allow re-export of failed batches | ❌ | No failure tracking |
| 7.5 API to reset batch status | ❌ | No batch management API |

### Gap Analysis

**Missing Components**:
- Batch completion tracking
- Transaction-to-batch mapping
- Exclusion logic in batch creation
- Failed batch retry mechanism
- Batch reset API endpoint

**Blocker**: Requires R5 (batches) and R6 (export) first

**Implementation Effort**: 2 days (part of Phase 5-6)

---

## Requirement 8: QuickBooks Sync Add-On (Private)

**Status**: ✅ FULLY IMPLEMENTED (but needs extraction)  
**Priority**: P2 (Medium)  
**Implementation**: 100% (in monolith)

### Current State

**QuickBooks Integration**: Fully functional in monolith


**OAuth Implementation**:
- File: `backend/rust/src/connectors/quickbooks/oauth.rs`
- OAuth 2.0 flow complete
- Token storage and refresh
- Callback handling

**API Client**:
- File: `backend/rust/src/connectors/quickbooks/client.rs`
- Sales receipt creation
- Invoice creation
- Customer sync
- Product sync

**Sync Orchestration**:
- File: `backend/rust/src/services/sync_orchestrator.rs`
- Automatic sync on transaction finalization
- WooCommerce to QuickBooks flow
- Error handling and retry logic

**Token Refresh**:
- File: `backend/rust/src/services/token_refresh_service.rs`
- Automatic token refresh before expiry
- Multi-tenant token management

**Database Tables**:
- `integration_credentials` - OAuth credentials
- `oauth_states` - OAuth flow state
- `sync_logs` - Sync operation history
- `webhook_configs` - QuickBooks webhook configuration

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 8.1 Sync_Add_On available with "sync" feature | ⚠️ | Exists but not feature-gated |
| 8.2 OAuth 2.0 authentication | ✅ | `quickbooks/oauth.rs` |
| 8.3 QuickBooks API client | ✅ | `quickbooks/client.rs` |
| 8.4 Auto-sync on transaction finalization | ✅ | `sync_orchestrator.rs` |
| 8.5 OAuth token refresh | ✅ | `token_refresh_service.rs` |
| 8.6 Sync logging | ✅ | `sync_logs` table |
| 8.7 Webhook support | ✅ | `webhook_configs` table |

### Gap Analysis

**Issue**: QuickBooks code is compiled into every build, preventing OSS distribution

**Required Changes**:
- Extract QuickBooks code to separate private crate/add-on
- Implement runtime detection (sidecar healthcheck)
- Remove QuickBooks dependencies from core server
- Verify Lite build has zero QuickBooks code

**Implementation Effort**: 5-7 days (Phase 8 in design)

---

## Requirement 9: Docker Build Optimization

**Status**: ⚠️ PARTIALLY IMPLEMENTED  
**Priority**: P0 (Critical)  
**Implementation**: 40%

### Current State

**Dockerfile**: Exists with multi-stage build
- File: `Dockerfile.backend`
- Multi-stage build implemented
- Alpine base image (good for size)
- Dependency caching layer

**Root .dockerignore**: ❌ MISSING
- Searched for `.dockerignore` in root: Not found
- Only found: `frontend/.dockerignore`, `backend/rust/.dockerignore`
- **Critical Issue**: 35.49 GB `target/` directory sent to Docker context

**Docker Compose**: Uses repo root as context
- File: `docker-compose.yml`
- Context: `.` (repo root) - WRONG
- Should use `./backend` and `./frontend`

**Image Sizes**: Unknown (need to measure)
- No CI checks for image size
- Target: < 500 MB (Lite), < 600 MB (Full)

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 9.1 Root .dockerignore exists | ❌ | File not found |
| 9.2 Exclude target/, node_modules/, etc. | ❌ | No root .dockerignore |
| 9.3 Don't include 35+ GB target/ | ❌ | Context includes everything |
| 9.4 Multi-stage builds | ✅ | `Dockerfile.backend` has stages |
| 9.5 Cache Cargo dependencies | ✅ | Dependency layer exists |
| 9.6 Lite image < 500 MB | ❓ | Not measured |
| 9.7 Full image < 600 MB | ❓ | Not measured |

### Gap Analysis

**Critical Missing**:
- Root `.dockerignore` file
- Docker compose context fix (use `./backend`, not `.`)
- Image size verification in CI

**Implementation Effort**: 1 day (Phase 7 in design)

---

## Requirement 10: Build Matrix Documentation

**Status**: ⚠️ PARTIALLY IMPLEMENTED  
**Priority**: P2 (Medium)  
**Implementation**: 30%

### Current State

**Existing Documentation**:
- File: `docs/build/build_matrix.md` - EXISTS
- Contains: Current dependencies, proposed feature flags
- Missing: Exact build commands, file inclusion lists

**Build Commands**: Not documented
- No clear instructions for building variants
- No feature flag usage examples

**Capabilities Documentation**: Not documented
- No documentation of `/api/capabilities` responses
- No explanation of Lite vs Full builds

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 10.1 Build matrix showing feature combinations | ⚠️ | Partial in `build_matrix.md` |
| 10.2 Exact cargo build commands | ❌ | Not documented |
| 10.3 File inclusion lists per build | ❌ | Not documented |
| 10.4 /api/capabilities responses | ❌ | Endpoint doesn't exist |
| 10.5 Lite vs Full explanation | ⚠️ | Partial in design doc |
| 10.6 Docker build commands | ❌ | Not documented |

### Gap Analysis

**Missing Documentation**:
- Complete build command reference
- File-by-file inclusion matrix
- Capabilities API response examples
- Docker build instructions for each variant

**Implementation Effort**: 1-2 days (ongoing with implementation)

---

## Requirement 11: Frontend Capability Gating

**Status**: ❌ NOT IMPLEMENTED  
**Priority**: P2 (Medium)  
**Implementation**: 0%

### Current State

**Frontend Behavior**: Static UI
- All features shown regardless of backend
- No capability querying
- No dynamic UI adaptation

**Accounting UI**: Always visible
- Export buttons always shown
- Sync UI always shown (if implemented)
- No gating based on backend capabilities

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 11.1 Hide accounting UI when disabled | ❌ | All UI always visible |
| 11.2 Show export UI only when available | ❌ | No capability check |
| 11.3 Show sync UI only when available | ❌ | No capability check |
| 11.4 Query capabilities on startup | ❌ | No query implementation |
| 11.5 Cache capabilities for session | ❌ | No caching |
| 11.6 Refresh on backend upgrade | ❌ | No refresh logic |

### Gap Analysis

**Missing Components**:
- Capability query service in frontend
- UI gating logic based on capabilities
- Capability caching in localStorage
- Startup capability fetch
- Navigation menu adaptation

**Blocker**: Requires R4 (capabilities API) first

**Implementation Effort**: 2-3 days (part of Phase 4)

---

## Requirement 12: Zero Code Duplication

**Status**: ⚠️ PARTIALLY IMPLEMENTED  
**Priority**: P2 (Medium)  
**Implementation**: 50%

### Current State

**Code Organization**: Single crate
- All logic in one place (good for no duplication)
- But mixed with integrations (bad for separation)

**Business Logic**: Not duplicated
- Pricing logic: Single location
- Tax calculation: Single location
- Transaction finalization: Single location

**Issue**: No feature flags yet
- When feature flags are added, risk of duplication
- Need to ensure conditional compilation, not copy-paste

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 12.1 Snapshot creation in one location | ✅ | Will be in `accounting_snapshots` crate |
| 12.2 Tax calculation in one location | ✅ | Currently in services (not duplicated) |
| 12.3 Pricing logic in one location | ✅ | Currently in services (not duplicated) |
| 12.4 Bug fixes apply to all builds | ✅ | Single codebase |
| 12.5 Use conditional compilation | ❌ | No features yet |
| 12.6 No copy-paste for variants | ✅ | No variants yet |

### Gap Analysis

**Risk**: When implementing feature flags, must use `#[cfg(feature = "...")]` not copy-paste

**Mitigation**: Code review and CI checks

**Implementation Effort**: Ongoing vigilance during implementation

---

## Requirement 13: Migration Path for Existing Data

**Status**: ❌ NOT IMPLEMENTED  
**Priority**: P3 (Low)  
**Implementation**: 0%

### Current State

**Migration System**: Does not exist
- No snapshot migration code
- No historical data conversion
- No verification tools

**Existing Transactions**: Unknown count
- Database: `backend/rust/data/pos.db`
- Need to count finalized transactions
- All will need snapshots created

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 13.1 Create snapshots for existing transactions | ❌ | No migration code |
| 13.2 Compute snapshots using current logic | ❌ | No computation logic |
| 13.3 Verify all transactions have snapshots | ❌ | No verification |
| 13.4 Log unmigrated transactions | ❌ | No logging |
| 13.5 Rollback mechanism | ❌ | No rollback |

### Gap Analysis

**Missing Components**:
- Migration CLI command
- Snapshot computation from historical data
- Verification queries
- Rollback procedure
- Migration documentation

**Blocker**: Requires R3 (snapshots) first

**Implementation Effort**: 3-4 days (Phase 9 in design)

---

## Requirement 14: Testing Strategy for Split Builds

**Status**: ⚠️ PARTIALLY IMPLEMENTED  
**Priority**: P3 (Low)  
**Implementation**: 30%

### Current State

**Existing Tests**:
- Unit tests: Exist for current code
- Integration tests: `backend/rust/tests/` directory
- Property tests: Extensive (40+ property test files)
- Frontend tests: Component and integration tests

**Build-Specific Tests**: None
- No tests for feature flag combinations
- No tests verifying Lite build excludes integrations
- No capabilities API tests

**Test Infrastructure**: Good foundation
- Property testing framework: `proptest`
- Integration test setup exists
- CI pipeline exists (`.github/workflows/`)

### Acceptance Criteria Mapping

| Criterion | Status | Evidence |
|-----------|--------|----------|
| 14.1 Unit tests for POS_Core in all builds | ⚠️ | Tests exist, not build-specific |
| 14.2 Integration tests for CSV_Export_Pack | ❌ | No CSV export tests |
| 14.3 Integration tests for Sync_Add_On | ⚠️ | Sync tests exist, not feature-gated |
| 14.4 Verify Lite build has no integration deps | ❌ | No verification test |
| 14.5 Verify /api/capabilities responses | ❌ | Endpoint doesn't exist |
| 14.6 Property tests for snapshot immutability | ❌ | No snapshots yet |

### Gap Analysis

**Missing Tests**:
- Build variant compilation tests
- Feature flag integration tests
- Capabilities API tests for each build
- Snapshot immutability property tests
- CSV format compliance tests
- Lite build isolation verification

**Implementation Effort**: Ongoing with each phase (2-3 days total)

---

## Implementation Roadmap

### Phase 0: Documentation (Current Phase) ✅

**Status**: IN PROGRESS  
**Completion**: 75%

**Completed**:
- ✅ `docs/build/build_matrix.md` - Build configuration analysis
- ✅ `docs/qbo/current_integration_map.md` - QuickBooks integration inventory
- ✅ `docs/traceability/requirements_trace.md` - This document

**Remaining**:
- ⏳ `docs/export/current_export_surface.md` - Export capability inventory
- ⏳ `docs/docker/bloat_report.md` - Docker context size analysis

**Timeline**: Complete by end of Phase 0

### Phase 1: Workspace Creation (P0)

**Requirements**: R1 (Cargo Workspace Architecture)  
**Estimated Effort**: 3-5 days  
**Blockers**: None

**Deliverables**:
- Workspace root `Cargo.toml`
- Separate crates structure
- Feature flag definitions
- Workspace compilation verification

### Phase 2: Core Extraction (P0)

**Requirements**: R2 (Core Domain Isolation)  
**Estimated Effort**: 5-7 days  
**Blockers**: R1

**Deliverables**:
- `pos_core_domain` crate
- `pos_core_models` crate
- `pos_core_storage` crate
- Independent compilation verification
- CI job for core-only builds

### Phase 3: Snapshot System (P1)

**Requirements**: R3 (Accounting Snapshot System)  
**Estimated Effort**: 3-4 days  
**Blockers**: R2

**Deliverables**:
- `accounting_snapshots` crate
- Database migrations
- Snapshot creation on finalization
- Immutability enforcement
- Property tests

### Phase 4: Capability API (P1)

**Requirements**: R4 (Capability Discovery API), R11 (Frontend Gating)  
**Estimated Effort**: 2-3 days  
**Blockers**: R1

**Deliverables**:
- `capabilities` crate
- `/api/capabilities` endpoint
- Frontend capability query
- UI gating logic
- Integration tests

### Phase 5: Export Batches (P1)

**Requirements**: R5 (Export Batch Management), R7 (Idempotency)  
**Estimated Effort**: 2-3 days  
**Blockers**: R3

**Deliverables**:
- `export_batches` crate
- Database migrations
- Batch creation API
- Idempotency tracking
- Integration tests

### Phase 6: CSV Export Pack (P1)

**Requirements**: R6 (CSV Export Generation)  
**Estimated Effort**: 4-5 days  
**Blockers**: R3, R5

**Deliverables**:
- `csv_export_pack` crate
- QuickBooks CSV exporters
- Generic exporters
- Format compliance tests
- Property tests

### Phase 7: Docker Optimization (P0)

**Requirements**: R9 (Docker Build Optimization)  
**Estimated Effort**: 1 day  
**Blockers**: None (can be done in parallel)

**Deliverables**:
- Root `.dockerignore`
- Docker compose context fix
- Image size verification
- CI checks

### Phase 8: QuickBooks Sync Add-On (P2)

**Requirements**: R8 (QuickBooks Sync Add-On)  
**Estimated Effort**: 5-7 days  
**Blockers**: R1, R2, R3

**Deliverables**:
- Sync add-on extraction
- Runtime detection
- Sidecar implementation
- Lite build verification (no QB code)

### Phase 9: Historical Migration (P3)

**Requirements**: R13 (Migration Path)  
**Estimated Effort**: 3-4 days  
**Blockers**: R3

**Deliverables**:
- Migration CLI command
- Verification queries
- Rollback procedure
- Migration documentation

### Phase 10: Documentation & Testing (P2-P3)

**Requirements**: R10 (Build Matrix Documentation), R12 (Zero Duplication), R14 (Testing Strategy)  
**Estimated Effort**: 2-3 days  
**Blockers**: All previous phases

**Deliverables**:
- Complete build documentation
- Build-specific tests
- CI pipeline updates
- Final verification

---

## Summary Statistics

### Implementation Status

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ Fully Implemented | 1 | 7% |
| ⚠️ Partially Implemented | 5 | 36% |
| ❌ Not Implemented | 8 | 57% |

### By Priority

| Priority | Total | Implemented | Partial | Not Implemented |
|----------|-------|-------------|---------|-----------------|
| P0 (Critical) | 3 | 0 | 1 | 2 |
| P1 (High) | 5 | 0 | 2 | 3 |
| P2 (Medium) | 4 | 1 | 2 | 1 |
| P3 (Low) | 2 | 0 | 0 | 2 |

### Estimated Total Effort

- **Phase 0**: 1 day (75% complete)
- **Phase 1-2**: 8-12 days (P0 - Foundation)
- **Phase 3-6**: 11-15 days (P1 - Core Features)
- **Phase 7**: 1 day (P0 - Docker)
- **Phase 8**: 5-7 days (P2 - Sync)
- **Phase 9-10**: 5-7 days (P3 - Migration & Docs)

**Total**: 31-43 days (6-9 weeks)

### Critical Path

1. **Week 1-2**: Phase 0-1 (Documentation + Workspace)
2. **Week 2-3**: Phase 2 (Core Extraction)
3. **Week 3-4**: Phase 3-4 (Snapshots + Capabilities)
4. **Week 4-5**: Phase 5-6 (Batches + Export)
5. **Week 5**: Phase 7 (Docker)
6. **Week 6-7**: Phase 8 (Sync Extraction)
7. **Week 8-9**: Phase 9-10 (Migration + Testing)

---

## Validation Checklist

### Before Starting Implementation

- [x] All requirements documented
- [x] Current state analyzed
- [x] Gaps identified
- [x] Implementation phases defined
- [ ] Export surface documented
- [ ] Docker bloat analyzed

### After Each Phase

- [ ] All acceptance criteria met
- [ ] Tests passing
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] CI checks passing

### Before Production Release

- [ ] All 14 requirements fully implemented
- [ ] All property tests passing
- [ ] Docker images under size limits
- [ ] Lite build verified (no QB code)
- [ ] Migration tested on production data copy
- [ ] Documentation complete
- [ ] Security audit passed

---

**Document Version**: 1.0  
**Last Updated**: 2026-01-20  
**Next Review**: After Phase 0 completion
