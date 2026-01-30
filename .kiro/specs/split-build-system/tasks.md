# Implementation Plan: Split Build System

## Overview

This implementation plan converts the EasySale monolithic backend into a Cargo workspace with feature-gated builds, enabling open-source distribution of core POS functionality while keeping proprietary QuickBooks sync as a private add-on. The plan follows a phased approach starting with evidence-based documentation, then workspace creation, core extraction, snapshot system, capability API, export functionality, Docker optimization, and finally the private sync add-on.

## Tasks

- [x] 0. Phase 0: Truth Sync - Evidence-Based Documentation
  - [x] 0.1 Generate QuickBooks integration map
    - **Current State**: QuickBooks fully integrated in monolith
    - **Files to scan**:
      - `backend/rust/src/connectors/quickbooks/*.rs` (15 files: client, oauth, customer, invoice, sales_receipt, credit_memo, refund, bill, vendor, payment, item, webhooks, transformers, errors, cloudevents)
      - `backend/rust/src/handlers/quickbooks*.rs` (8 handlers)
      - `backend/rust/src/flows/woo_to_qbo.rs`
      - `backend/rust/migrations/025_integration_credentials.sql`
      - `backend/rust/migrations/030_oauth_states.sql`
      - `backend/rust/migrations/032_sync_logs.sql`
      - `backend/rust/migrations/033_webhook_configs.sql`
      - `backend/rust/migrations/038_integration_sync_state.sql`
    - **Output**: Create `docs/qbo/current_integration_map.md` with:
      - All QBO connector files with their responsibilities
      - All QBO handler endpoints (routes)
      - All QBO-related database tables and columns
      - OAuth flow implementation details
      - Sync job locations
    - _Requirements: 2.1, 2.2, 10.3_
  
  - [x] 0.2 Generate build matrix documentation
    - **Current State**: Single crate `EasySale-api` at `backend/rust/Cargo.toml`
    - **Dependencies to analyze**:
      - Core: actix-web, sqlx, tokio, serde, chrono, uuid
      - Integrations: reqwest (for QBO/WooCommerce API calls)
      - Optional features: zip, sha2, hmac (backup), tokio-cron-scheduler (scheduler), aes-gcm (credentials), image/imageproc (OCR)
    - **Output**: Create `docs/build/build_matrix.md` with:
      - Current dependency tree
      - Proposed workspace structure (7 core crates + 2 optional)
      - Feature flag definitions (export, ocr, backup, scheduler, sync_sidecar)
      - Build commands for each variant
      - Known blockers (e.g., shared DB connection pool)
    - _Requirements: 1.1, 1.2, 10.1, 10.2_
  
  - [x] 0.3 Generate export surface inventory
    - **Current State**: No CSV export implementation found
    - **Files to check**:
      - `backend/rust/src/handlers/data_management.rs` (has export endpoint stub)
      - `backend/rust/src/handlers/performance_export.rs`
      - `frontend/src/features/settings/pages/DataManagementPage.tsx` (export UI)
      - `frontend/src/features/products/components/BulkOperations.tsx` (export format selector)
    - **Output**: Create `docs/export/current_export_surface.md` with:
      - Existing export endpoints (if any)
      - Frontend export UI locations
      - Missing exporters (invoices, sales receipts, credit memos, products, customers)
      - Required QuickBooks CSV templates (from design.md)
    - **Output**: Create `docs/export/qbo_templates_inventory.md` with:
      - Sales Receipt template (exact headers)
      - Invoice template (exact headers)
      - Credit Memo template (exact headers)
      - Required vs optional fields
    - _Requirements: 6.1, 10.4_
  
  - [x] 0.4 Generate Docker bloat report
    - **Current State**: 
      - Total repo size: **35.82 GB**
      - `backend/rust/target/`: **35.49 GB** (99% of bloat!)
      - `frontend/node_modules/`: **0.29 GB**
      - NO root `.dockerignore` file exists
      - Subdirectory `.dockerignore` files exist: `frontend/.dockerignore`, `backend/rust/.dockerignore`
    - **Measurements to take**:
      - Run `du -sh backend/rust/target` (already know: 35.49 GB)
      - Check if `Dockerfile.backend` uses root context (it does: `COPY backend/rust/`)
      - Check `docker-compose.yml` contexts (backend: `./backend/rust`, frontend: `./frontend`)
    - **Output**: Create `docs/docker/bloat_report.md` with:
      - Before measurements (35.82 GB total, 35.49 GB target/)
      - Root cause: no root `.dockerignore`, Docker ingests entire target/
      - Proposed fixes: root `.dockerignore`, change contexts to `./backend` and `./frontend`
      - Expected after: < 100 MB context size
      - Image size targets: < 500 MB (Lite), < 600 MB (Full)
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 0.5 Generate requirements traceability matrix
    - **Map requirements to current code**:
      - R1 (Workspace): Not implemented (single crate)
      - R2 (Core isolation): Not implemented (integrations in monolith)
      - R3 (Snapshots): Not implemented (no snapshot tables)
      - R4 (Capabilities API): Not implemented (no /api/capabilities endpoint)
      - R5-7 (Export): Partially implemented (UI exists, no backend)
      - R8 (Sync): Fully implemented (in monolith, needs extraction)
      - R9 (Docker): Partially implemented (Dockerfile exists, bloat issue)
      - R10-14 (Docs/Testing): Not implemented
    - **Output**: Create `docs/traceability/requirements_trace.md`
    - _Requirements: 10.5, 10.6_

- [x] 1. Phase 1: Workspace Creation
  - [x] 1.1 Create Cargo workspace structure
    - Create `backend/Cargo.toml` as workspace root with `[workspace]` section
    - Move current `backend/rust/` contents to `backend/crates/server/`
    - Create empty crate directories for all planned crates
    - Add workspace members list to root `Cargo.toml`
    - _Requirements: 1.1_
  
  - [x] 1.2 Configure feature flags in server crate
    - Add `[features]` section to `backend/crates/server/Cargo.toml`
    - Define `export` feature that enables `csv_export_pack`
    - Set `default = []` (no features by default)
    - _Requirements: 1.2_
  
  - [x] 1.3 Verify workspace compiles
    - Run `cargo build --workspace` to verify all crates compile
    - Fix any compilation errors from workspace restructuring
    - _Requirements: 1.3_

- [ ] 2. Phase 2: Core Extraction
  - [x] 2.1 Create pos_core_domain crate
    - Extract pricing calculation logic from server
    - Extract tax calculation logic from server
    - Extract discount application logic from server
    - Extract transaction finalization logic from server
    - Ensure no integration dependencies (QuickBooks, WooCommerce, Supabase)
    - _Requirements: 2.1, 2.2, 12.1, 12.2, 12.3_
  
  - [x] 2.2 Create pos_core_models crate
    - Extract shared types and enums from server
    - Define `Transaction`, `LineItem`, `TransactionStatus` types
    - Define `PricingEngine` trait
    - _Requirements: 2.1, 2.4_
  
  - [x] 2.3 Create pos_core_storage crate
    - Extract database access layer from server
    - Implement SQLite connection management
    - Implement query builders for core operations
    - _Requirements: 2.1_
  
  - [x] 2.4 Update server to use core crates
    - Add dependencies on `pos_core_domain`, `pos_core_models`, `pos_core_storage`
    - Replace direct implementations with core crate imports
    - _Requirements: 2.1_
  
  - [x] 2.5 Verify core compiles independently
    - Run `cd crates/pos_core_domain && cargo build`
    - Run `cd crates/pos_core_models && cargo build`
    - Run `cd crates/pos_core_storage && cargo build`
    - Verify no integration dependencies are pulled in
    - _Requirements: 1.6, 2.2, 2.3, 2.5_
  
  - [x] 2.6 Add CI job for core-only compilation
    - Create CI job that runs `cargo build` in each core crate directory
    - Fail build if integration dependencies detected
    - _Requirements: 1.6, 2.5, 12.4_

- [ ] 3. Phase 3: Snapshot System
  - [x] 3.1 Create accounting_snapshots crate
    - Define `AccountingSnapshot`, `SnapshotLine`, `Payment` types
    - Define `SnapshotBuilder` trait
    - Implement snapshot creation logic using `pos_core_domain`
    - _Requirements: 3.1, 3.2_
  
  - [x] 3.2 Add database migrations for snapshots
    - Create migration for `accounting_snapshots` table
    - Create migration for `snapshot_lines` table
    - Create migration for `snapshot_payments` table
    - Add UNIQUE constraint on `transaction_id`
    - _Requirements: 3.1, 3.5_
  
  - [x] 3.3 Implement immutability enforcement
    - Add database trigger to prevent UPDATE on `accounting_snapshots`
    - Add database trigger to prevent UPDATE on `snapshot_lines`
    - Add database trigger to prevent UPDATE on `snapshot_payments`
    - Add API layer check that returns 403 on UPDATE attempts
    - _Requirements: 3.3_
  
  - [x] 3.4 Integrate snapshot creation with transaction finalization
    - Modify transaction finalization to create snapshot
    - Persist snapshot immediately after finalization
    - Ensure snapshot is queryable after finalization
    - _Requirements: 3.1, 3.5_
  
  - [x]* 3.5 Write property test for snapshot immutability
    - **Property 2: Snapshot Immutability**
    - **Validates: Requirements 3.3, 12.1**
    - Generate random transactions and snapshots
    - Attempt to modify persisted snapshots
    - Verify all modification attempts fail
  
  - [x]* 3.6 Write integration test for snapshot creation
    - **Property 1: Snapshot Creation Completeness**
    - **Validates: Requirements 3.1, 3.2, 3.5**
    - Create and finalize transactions
    - Verify snapshots are created with all required fields
    - Verify snapshots are immediately queryable

- [ ] 4. Phase 4: Capability API
  - [x] 4.1 Create capabilities crate
    - Define `Capabilities`, `AccountingMode`, `FeatureFlags` types
    - Define `CapabilityProvider` trait
    - _Requirements: 4.1, 4.2_
  
  - [x] 4.2 Implement compile-time capability detection
    - Use `cfg!(feature = "export")` to detect export feature
    - Implement `get_capabilities()` function
    - _Requirements: 4.3, 4.4, 4.5_
  
  - [x] 4.3 Implement runtime sync detection
    - Implement sidecar healthcheck function
    - Check if sync add-on is present and healthy
    - Return `sync=true` only if export enabled AND sync healthy
    - _Requirements: 4.6, 8.1_
  
  - [x] 4.4 Add /api/capabilities endpoint
    - Create GET endpoint at `/api/capabilities`
    - Return JSON with `accounting_mode`, `features`, `version`, `build_hash`
    - _Requirements: 4.1, 4.2_
  
  - [x]* 4.5 Write integration tests for capabilities
    - **Property 7: Capabilities Response Validity**
    - **Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 11.1, 11.2, 11.3**
    - Test with `--no-default-features` (should return "disabled")
    - Test with `--features export` (should return "export_only")
    - Test with sync add-on present (should return "sync")
  
  - [x] 4.6 Update frontend to query capabilities
    - Add capabilities query on frontend startup
    - Cache capabilities for session duration
    - _Requirements: 4.7, 11.4, 11.5_
  
  - [x] 4.7 Implement UI gating based on capabilities
    - Hide accounting UI when mode is "disabled"
    - Show export UI when mode is "export_only" or "sync"
    - Show sync UI only when mode is "sync"
    - _Requirements: 11.1, 11.2, 11.3_

- [ ] 5. Phase 5: Export Batches
  - [x] 5.1 Create export_batches crate
    - Define `ExportBatch`, `BatchStatus` types
    - Define `BatchManager` trait
    - _Requirements: 5.1_
  
  - [x] 5.2 Add database migrations for batches
    - Create migration for `export_batches` table
    - Create migration for `batch_snapshots` table
    - Add CHECK constraint for status values
    - _Requirements: 5.4_
  
  - [x] 5.3 Implement batch creation logic
    - Implement `create_batch()` with date range filtering
    - Collect snapshots within date range
    - Exclude snapshots already in completed batches
    - Assign unique batch ID and set status to "pending"
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  
  - [x] 5.4 Implement batch status transitions
    - Implement `mark_completed()` function
    - Implement `mark_failed()` function with error logging
    - Implement `reset_batch()` function for failed batches
    - _Requirements: 6.6, 6.7, 7.4, 7.5_
  
  - [x] 5.5 Implement idempotency tracking
    - Track which snapshots are in completed batches
    - Exclude completed snapshots from new batch creation
    - Prevent re-exporting completed batches
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [x]* 5.6 Write integration test for batch creation
    - **Property 5: Batch Creation and Status Transitions**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.6, 6.7**
    - Create batches with various date ranges
    - Verify correct snapshots are included
    - Verify status transitions work correctly
  
  - [x]* 5.7 Write integration test for idempotency
    - **Property 6: Idempotency Across Completed Batches**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Create and complete a batch
    - Create a second batch with same date range
    - Verify second batch excludes snapshots from first batch

- [ ] 6. Phase 6: CSV Export Pack (OSS)
  - [x] 6.1 Create csv_export_pack crate with export feature
    - Create crate with `#[cfg(feature = "export")]`
    - Define `CsvExporter` trait
    - Define `QuickBooksExporter` struct
    - _Requirements: 6.1_
  
  - [x] 6.2 Implement sales receipt CSV exporter
    - Implement `export_sales_receipts()` function
    - Use authoritative QuickBooks template headers
    - Format values from snapshots (no recomputation)
    - _Requirements: 6.2, 6.3, 6.5_
  
  - [x] 6.3 Implement invoice CSV exporter
    - Implement `export_invoices()` function
    - Use authoritative QuickBooks template headers
    - Format values from snapshots (no recomputation)
    - _Requirements: 6.2, 6.3, 6.5_
  
  - [x] 6.4 Implement credit memo CSV exporter
    - Implement `export_credit_memos()` function
    - Use authoritative QuickBooks template headers
    - Format values from snapshots (no recomputation)
    - _Requirements: 6.2, 6.3, 6.5_
  
  - [x] 6.5 Implement generic exporters
    - Implement `export_products()` function
    - Implement `export_customers()` function
    - Implement `export_inventory()` function
    - _Requirements: 6.4_
  
  - [x] 6.6 Add ZIP packaging for exports
    - Implement ZIP file creation for multi-file exports
    - Add manifest file with export metadata
    - Add import order documentation
    - _Requirements: 6.4_
  
  - [x]* 6.7 Write golden file tests for CSV format
    - **Property 4: Export Format Compliance**
    - **Validates: Requirements 6.2, 6.5**
    - Test sales receipt header matches template exactly
    - Test invoice header matches template exactly
    - Test credit memo header matches template exactly
    - Test field order, encoding, precision, date format
  
  - [x]* 6.8 Write property test for snapshot faithfulness
    - **Property 3: Export Snapshot Faithfulness**
    - **Validates: Requirements 3.4, 6.3**
    - Generate random snapshots
    - Export to CSV
    - Parse CSV and verify values match snapshots exactly
  
  - [x] 6.9 Verify no QuickBooks OAuth code in crate
    - Search crate for OAuth-related imports
    - Search crate for QuickBooks API client code
    - Verify crate is OSS-safe
    - _Requirements: 2.3, 6.1_

- [ ] 7. Phase 7: Docker Optimization
  - [x] 7.1 Create root .dockerignore file
    - **Current State**: NO root `.dockerignore` exists (causing 35.49 GB target/ to be sent to Docker)
    - **Create**: `.dockerignore` at repo root with exclusions:
      ```
      # Version control
      .git
      .github
      .vscode
      .husky
      .kiro
      *.code-workspace
      
      # Build artifacts (THE BIG ONE - 35.49 GB!)
      **/target
      **/*.rlib
      **/*.rmeta
      **/node_modules
      **/dist
      **/.next
      **/.turbo
      
      # Large directories
      archive
      backup
      audit
      memory-bank
      data
      installer
      examples
      
      # Logs and temp files
      *.log
      build-*.txt
      build-*.log
      prod-build.log
      md files.zip
      
      # Secrets
      .env
      **/.env
      **/*.pem
      **/*.key
      ```
    - **Verify**: Run `docker build --no-cache -f Dockerfile.backend -t test .` and check context size < 100 MB
    - _Requirements: 9.1, 9.2_
  
  - [x] 7.2 Update docker-compose.yml contexts
    - **Current State**: 
      - Backend context: `./backend/rust` (correct)
      - Frontend context: `./frontend` (correct)
      - Storybook context: `./frontend` (correct)
    - **Action**: Contexts are already correct! No changes needed.
    - **Note**: Root `.dockerignore` will still help when building from root with `Dockerfile.backend`
    - _Requirements: 9.3_
  
  - [x] 7.3 Update Dockerfile.backend for workspace
    - **Current State**: `Dockerfile.backend` copies from `backend/rust/`
    - **After workspace**: Will need to copy from `backend/` (workspace root)
    - **Changes needed**:
      - Change `COPY backend/rust/Cargo.toml backend/rust/Cargo.lock ./` to `COPY backend/Cargo.toml ./`
      - Change `COPY backend/rust/ .` to `COPY backend/ .`
      - Add `FEATURES` build arg for feature selection
    - **Multi-stage optimization**:
      - Stage 1: Cache dependencies (already implemented)
      - Stage 2: Build with features (add `--features ${FEATURES}`)
      - Stage 3: Runtime (already minimal alpine)
    - _Requirements: 9.4, 9.5_
  
  - [x] 7.4 Verify Docker context size reduction
    - **Before**: 35.82 GB (with target/ included)
    - **After**: < 100 MB (target/ excluded)
    - **Test**: `docker build --no-cache -f Dockerfile.backend -t EasySale-test . 2>&1 | grep "Sending build context"`
    - **Expected**: "Sending build context to Docker daemon  XX.XXMb" (not GB!)
    - _Requirements: 9.3_
  
  - [x] 7.5 Add CI checks for image size
    - **Create**: `.github/workflows/docker-size-check.yml`
    - **Tests**:
      - Build Lite: `docker build --build-arg FEATURES="" -t EasySale-lite -f Dockerfile.backend .`
      - Check size: `docker images EasySale-lite --format "{{.Size}}"` < 500 MB
      - Build Full: `docker build --build-arg FEATURES="export" -t EasySale-full -f Dockerfile.backend .`
      - Check size: `docker images EasySale-full --format "{{.Size}}"` < 600 MB
    - _Requirements: 9.6, 9.7_

- [ ] 8. Phase 8: QuickBooks Sync Add-On (Private)
  - [x] 8.1 Design sync add-on architecture
    - **Current State**: QuickBooks sync fully integrated in monolith at:
      - `backend/rust/src/connectors/quickbooks/` (15 files)
      - `backend/rust/src/handlers/quickbooks*.rs` (8 handlers)
      - `backend/rust/src/flows/woo_to_qbo.rs`
      - `backend/rust/src/services/sync_orchestrator.rs`
      - `backend/rust/src/services/token_refresh_service.rs`
    - **Decision**: Use **sidecar service** approach (recommended in design.md)
      - Separate process/container for sync
      - Server communicates via loopback HTTP
      - Healthcheck at `http://127.0.0.1:8924/health`
      - Avoids Rust dynamic library complexity
    - **Protocol**: Define HTTP API contract:
      - `POST /sync/transaction` - Sync a transaction snapshot
      - `GET /health` - Healthcheck
      - `POST /oauth/refresh` - Refresh token
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 8.2 Extract QuickBooks code to sync/ directory
    - **Create**: `sync/` directory at repo root (private, not in OSS)
    - **Move files**:
      - `backend/rust/src/connectors/quickbooks/` → `sync/src/connectors/quickbooks/`
      - `backend/rust/src/handlers/quickbooks*.rs` → `sync/src/handlers/`
      - `backend/rust/src/flows/woo_to_qbo.rs` → `sync/src/flows/`
      - `backend/rust/src/services/sync_orchestrator.rs` → `sync/src/services/`
      - `backend/rust/src/services/token_refresh_service.rs` → `sync/src/services/`
    - **Create**: `sync/Cargo.toml` for sidecar service
    - **Create**: `sync/src/main.rs` with HTTP server (Actix-web)
    - _Requirements: 8.2, 8.3_
  
  - [x] 8.3 Implement OAuth token management in sidecar
    - **Current State**: Token refresh in `backend/rust/src/services/token_refresh_service.rs`
    - **Move to**: `sync/src/services/token_refresh_service.rs`
    - **Database**: Use existing `oauth_states` table (migration 030)
    - **Encryption**: Use existing `integration_credentials` table (migration 025) with AES-GCM
    - **Auto-refresh**: Check token expiry before each API call
    - _Requirements: 8.5_
  
  - [x] 8.4 Implement sync trigger in core server
    - **Location**: `backend/crates/server/src/handlers/` (after workspace creation)
    - **Hook**: Add to transaction finalization handler
    - **Logic**:
      ```rust
      if cfg!(feature = "sync_sidecar") && sync_sidecar_healthy() {
          let snapshot = create_accounting_snapshot(&transaction);
          send_to_sync_sidecar(&snapshot).await?;
      }
      ```
    - **Healthcheck**: Ping `http://127.0.0.1:8924/health` every 30s
    - **Failure handling**: Log error, don't block transaction
    - _Requirements: 8.4_
  
  - [x] 8.5 Implement sync logging in sidecar
    - **Database**: Use existing `sync_logs` table (migration 032)
    - **Log fields**: sync_id, connector_id, entity_type, entity_id, operation, result, error_message, created_at
    - **Operations**: create, update, void
    - **Results**: success, failure, skipped
    - _Requirements: 8.6_
  
  - [x] 8.6 Implement webhook handling in sidecar
    - **Current State**: Webhook config in `webhook_configs` table (migration 033)
    - **Endpoint**: `POST /webhooks/quickbooks` in sidecar
    - **Verification**: Validate Intuit signature
    - **Processing**: Parse CloudEvents format (see `backend/rust/src/connectors/quickbooks/cloudevents.rs`)
    - **Actions**: Update local records, trigger re-sync if needed
    - _Requirements: 8.7_
  
  - [x]* 8.7 Write integration tests for sync sidecar
    - **Property 9: Sync Trigger on Finalization**
    - **Test**: Use wiremock to mock QuickBooks API
    - **Verify**: Sync request sent, log entry created
    - _Requirements: 8.4, 8.6_
  
  - [x]* 8.8 Write integration test for token refresh
    - **Property 10: OAuth Token Refresh**
    - **Test**: Mock expired token, verify refresh before API call
    - _Requirements: 8.5_
  
  - [x] 8.9 Verify sync code not in Lite build
    - **Test**: Build with `--no-default-features`
    - **Check**: `nm target/release/EasySale-server | grep -i "qbo\|quickbooks\|oauth"`
    - **Expected**: Empty output (no QBO symbols in binary)
    - **Verify**: `sync/` directory can be deleted and OSS still builds
    - _Requirements: 2.3, 8.1_

- [ ] 9. Phase 9: Historical Migration
  - [x] 9.1 Implement migration job
    - Create `migration.rs` in `accounting_snapshots` crate
    - Implement logic to find all finalized transactions without snapshots
    - Implement snapshot creation using current POS_Core logic
    - _Requirements: 13.1, 13.2_
  
  - [x] 9.2 Add CLI command for migration
    - Add `migrate-snapshots` subcommand to server binary
    - Add progress reporting during migration
    - Add summary report after migration
    - _Requirements: 13.1_
  
  - [x] 9.3 Implement verification logic
    - Count finalized transactions
    - Count snapshots
    - Identify transactions without snapshots
    - Log any discrepancies
    - _Requirements: 13.3_
  
  - [x] 9.4 Implement rollback mechanism
    - Add migration tracking table
    - Mark snapshots created by migration
    - Implement rollback command to delete migration snapshots
    - _Requirements: 13.5_
  
  - [x] 9.5 Implement failure logging
    - Log transaction ID for any failed migration
    - Log error details for debugging
    - _Requirements: 13.4_
  
  - [x] 9.6 Write property test for migration completeness

    - **Property 8: Migration Completeness and Safety**
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
    - Seed database with finalized transactions
    - Run migration
    - Verify all transactions have snapshots or logged failures
  
  - [x] 9.7 Test migration on production data copy
    - Create copy of production database
    - Run migration on copy
    - Verify results
    - Document any issues
    - _Requirements: 13.1_
  
  - [x] 9.8 Document migration procedure
    - Create `docs/migration/snapshot_migration.md`
    - Document prerequisites
    - Document step-by-step procedure
    - Document rollback procedure
    - Document verification steps
    - _Requirements: 10.2, 10.6_

- [ ] 10. Final Verification and Documentation
  - [x] 10.1 Verify all build variants compile
    - Build with `--no-default-features`
    - Build with `--features export`
    - Verify both builds succeed
    - _Requirements: 1.3, 1.4, 14.4_
  
  - [x] 10.2 Run full test suite for each variant
    - Run `cargo test --no-default-features`
    - Run `cargo test --features export`
    - Verify all tests pass
    - _Requirements: 14.1, 14.2, 14.5_
  
  - [x] 10.3 Verify Docker builds work
    - Build Lite Docker image
    - Build Full Docker image
    - Verify both images work correctly
    - _Requirements: 9.6, 9.7_
  
  - [x] 10.4 Update README with build instructions
    - Document workspace structure
    - Document build commands for each variant
    - Document Docker build commands
    - _Requirements: 10.1, 10.2, 10.6_
  
  - [x] 10.5 Create build matrix documentation
    - Document all feature combinations
    - Document which crates are included in each build
    - Document capabilities response for each build
    - _Requirements: 10.1, 10.3, 10.4_

## Notes

- Tasks marked with `*` are optional test tasks that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Phases should be completed sequentially to avoid dependency issues
- Core extraction (Phase 2) is critical - verify core compiles independently before proceeding
- Docker optimization (Phase 7) should be done before Phase 8 to ensure clean builds
- Historical migration (Phase 9) should be the last phase as it depends on all previous work
