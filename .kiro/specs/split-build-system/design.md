# Design Document: Split Build System (OSS Lite + Private Full)

## Overview

This design implements a production-ready split build system for EasySale that enables:

1. **Open-source distribution** of core POS functionality without proprietary integrations
2. **Tiered product offerings** through build variants (Lite vs Export vs Full)
3. **Efficient Docker builds** by eliminating huge build artifacts from Docker context (target/, node_modules/, archive/, etc.)
4. **Runtime capability discovery** allowing the frontend to adapt to backend features

### Build Variants (Authoritative)

This system produces three practical variants from the same codebase:

1. **Core/Lite (OSS)**: POS domain logic + accounting snapshots + export batches (no CSV generation, no sync)
2. **Lite + Export (OSS)**: Core/Lite + CSV export pack (QuickBooks-compatible import files + generic exports)
3. **Full (Private)**: Lite + Export + Sync Add-On (OAuth + QBO API + jobs) delivered as a separate private add-on so OSS builds remain clean

**Critical Rule (OSS Safety)**: The OSS repo MUST build and run without requiring any private folder, private crate, or QuickBooks OAuth/API code.

## Architecture

### Repository/Workspace Layout (Practical)

Because the repo root contains a lot (frontend, backend, sync, archives, docs, scripts), the cleanest split is:

- Put the Rust Cargo workspace root inside `backend/` (or `backend/rust/` if that's where Rust lives)
- Docker build contexts should be `./backend` and `./frontend`, not repo root

Example:
```
repo-root/
├── backend/
│   ├── Cargo.toml                 # Workspace root (recommended location)
│   ├── crates/
│   │   ├── pos_core_domain/
│   │   ├── pos_core_models/
│   │   ├── pos_core_storage/
│   │   ├── accounting_snapshots/
│   │   ├── export_batches/
│   │   ├── capabilities/
│   │   ├── csv_export_pack/       # [feature = "export"] (OSS)
│   │   └── server/                # Actix-web binary
│   └── migrations/
├── frontend/
├── sync/                          # PRIVATE add-on (or separate private repo)
└── .dockerignore                  # Root ignore file (still recommended)
```

### Dependency Graph (Hard Rule Enforced)

```
Core (always compiled):
  server → capabilities → pos_core_domain → pos_core_models
  server → accounting_snapshots → pos_core_storage → pos_core_models
  server → export_batches → pos_core_storage → pos_core_models

Optional (feature-gated OSS export):
  [export] server → csv_export_pack → accounting_snapshots

Private (NOT a required Cargo dependency for OSS):
  sync add-on integrates at runtime (plugin/sidecar) and MUST NOT be required to build OSS.
```

**Hard Rule**: Core crates (`pos_core_*`, `accounting_snapshots`, `export_batches`, `capabilities`) MUST NOT depend on optional crates.

### Feature Flag Configuration (OSS-safe)

Workspace root `backend/Cargo.toml`:
```toml
[workspace]
members = [
  "crates/pos_core_domain",
  "crates/pos_core_models",
  "crates/pos_core_storage",
  "crates/accounting_snapshots",
  "crates/export_batches",
  "crates/capabilities",
  "crates/csv_export_pack",
  "crates/server",
]
```

Server `crates/server/Cargo.toml`:

**Important change**: Only `export` is feature-gated in OSS. Sync is NOT a Cargo feature in OSS (it's a private add-on discovered at runtime).

```toml
[package]
name = "EasySale-server"

[features]
default = []
export = ["csv_export_pack"]

[dependencies]
pos_core_domain = { path = "../pos_core_domain" }
accounting_snapshots = { path = "../accounting_snapshots" }
export_batches = { path = "../export_batches" }
capabilities = { path = "../capabilities" }

csv_export_pack = { path = "../csv_export_pack", optional = true }
```

### Build Commands (Authoritative)

```bash
# Core/Lite (OSS) — no export pack
cargo build --release --no-default-features

# Lite + Export (OSS) — includes CSV export pack
cargo build --release --no-default-features --features export

# Full (Private) — same server build as export,
# PLUS install/run sync add-on (separate private package)
cargo build --release --no-default-features --features export
```

**Full is "export build + sync add-on present", not "compile with sync".**

## Components and Interfaces

### 1. POS Core Domain (`pos_core_domain`)

**Responsibility**: Pure business logic for pricing, tax calculation, rounding, and transaction finalization.

**Key Types**:
```rust
pub struct Transaction {
    pub id: Uuid,
    pub items: Vec<LineItem>,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub discount: Decimal,
    pub total: Decimal,
    pub status: TransactionStatus,
}

pub enum TransactionStatus {
    Draft,
    Finalized,
    Voided,
}

pub trait PricingEngine {
    fn calculate_subtotal(&self, items: &[LineItem]) -> Decimal;
    fn calculate_tax(&self, subtotal: Decimal, tax_rate: Decimal) -> Decimal;
    fn apply_discount(&self, amount: Decimal, discount: Discount) -> Decimal;
    fn finalize_transaction(&self, transaction: &mut Transaction) -> Result<(), DomainError>;
}
```

**Dependencies**: Only `pos_core_models` (no integration dependencies).

### 2. Accounting Snapshots (`accounting_snapshots`)

**Responsibility**: Create immutable financial records at transaction finalization.

**Key Types**:
```rust
pub struct AccountingSnapshot {
    pub id: Uuid,
    pub transaction_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub finalized_at: DateTime<Utc>,
    pub subtotal: Decimal,
    pub tax: Decimal,
    pub discount: Decimal,
    pub total: Decimal,
    pub payments: Vec<Payment>,     // Multi-tender support
    pub lines: Vec<SnapshotLine>,
}

pub struct Payment {
    pub method: String,  // "cash", "card", "check", "on_account", etc.
    pub amount: Decimal,
}

pub struct SnapshotLine {
    pub product_id: Uuid,
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub line_total: Decimal,
    pub tax_amount: Decimal,
}
```

**Database Schema** (Updated to match `payments: Vec<Payment>`):
```sql
CREATE TABLE accounting_snapshots (
    id TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    finalized_at TEXT NOT NULL,
    subtotal TEXT NOT NULL,
    tax TEXT NOT NULL,
    discount TEXT NOT NULL,
    total TEXT NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
);

CREATE TABLE snapshot_lines (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity TEXT NOT NULL,
    unit_price TEXT NOT NULL,
    line_total TEXT NOT NULL,
    tax_amount TEXT NOT NULL,
    FOREIGN KEY (snapshot_id) REFERENCES accounting_snapshots(id)
);

CREATE TABLE snapshot_payments (
    id TEXT PRIMARY KEY,
    snapshot_id TEXT NOT NULL,
    method TEXT NOT NULL,
    amount TEXT NOT NULL,
    FOREIGN KEY (snapshot_id) REFERENCES accounting_snapshots(id)
);
```

**Immutability Enforcement** (Required):
- No UPDATE operations allowed on `accounting_snapshots`, `snapshot_lines`, `snapshot_payments`
- Database triggers prevent modifications after insert
- API layer returns 403 Forbidden for any mutation attempts

### 3. Export Batches (`export_batches`)

**Responsibility**: Manage collections of snapshots for export with idempotency guarantees.

**Key Types**:
```rust
pub struct ExportBatch {
    pub id: Uuid,
    pub created_at: DateTime<Utc>,
    pub created_by: Uuid,
    pub start_date: DateTime<Utc>,
    pub end_date: DateTime<Utc>,
    pub status: BatchStatus,
    pub snapshot_count: i32,
    pub config_hash: String,
}

pub enum BatchStatus {
    Pending,
    Completed,
    Failed,
}
```

**Database Schema**:
```sql
CREATE TABLE export_batches (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    created_by TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending', 'completed', 'failed')),
    snapshot_count INTEGER NOT NULL,
    config_hash TEXT NOT NULL,
    error_message TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE batch_snapshots (
    batch_id TEXT NOT NULL,
    snapshot_id TEXT NOT NULL,
    included_at TEXT NOT NULL,
    PRIMARY KEY (batch_id, snapshot_id),
    FOREIGN KEY (batch_id) REFERENCES export_batches(id),
    FOREIGN KEY (snapshot_id) REFERENCES accounting_snapshots(id)
);
```

**Idempotency Rules**:
1. Snapshots in completed batches are excluded from new batch creation
2. Failed batches can be reset and re-exported
3. Completed batches cannot be modified or re-exported without explicit reset operation
4. Each snapshot tracks which batches it has been included in

### 4. Capabilities API (`capabilities`) — Export is compile-time, Sync is runtime

**Responsibility**: Report backend feature availability to frontend.

**Key Types**:
```rust
pub struct Capabilities {
    pub accounting_mode: AccountingMode,
    pub features: FeatureFlags,
    pub version: String,
    pub build_hash: String,
}

pub enum AccountingMode {
    Disabled,
    ExportOnly,
    Sync,
}

pub struct FeatureFlags {
    pub export: bool,
    pub sync: bool,
}
```

**Endpoint**:
```
GET /api/capabilities
```

**Key behavior change (Critical)**:
- `export` is compile-time (`cfg!(feature="export")`)
- `sync` is runtime ("sync add-on is present + reachable + configured")

**Pseudo-code**:
```rust
fn detect_sync_runtime() -> bool {
    // Any one of these approaches is acceptable; pick ONE and standardize it:
    // A) Sidecar healthcheck: http://127.0.0.1:<port>/health
    // B) Plugin file present + signature check + load succeeds
    // C) Config points to sync service + ping succeeds
    sync_healthcheck_ok()
}

pub fn get_capabilities() -> Capabilities {
    let export_enabled = cfg!(feature = "export");
    let sync_enabled = export_enabled && detect_sync_runtime();
    
    let accounting_mode = match (export_enabled, sync_enabled) {
        (false, _) => AccountingMode::Disabled,
        (true, false) => AccountingMode::ExportOnly,
        (true, true) => AccountingMode::Sync,
    };
    
    Capabilities {
        accounting_mode,
        features: FeatureFlags { export: export_enabled, sync: sync_enabled },
        version: env!("CARGO_PKG_VERSION").to_string(),
        build_hash: env!("BUILD_HASH").to_string(),
    }
}
```

**Frontend behavior** remains the same: it queries `/api/capabilities` once at startup and gates UI.

### 5. CSV Export Pack (`csv_export_pack`) [Optional, OSS]

**Responsibility**: Generate QuickBooks-compatible CSV files from accounting snapshots.

**Key Types**:
```rust
pub trait CsvExporter {
    fn export_sales_receipts(&self, snapshots: &[AccountingSnapshot]) -> Result<String, ExportError>;
    fn export_invoices(&self, snapshots: &[AccountingSnapshot]) -> Result<String, ExportError>;
    fn export_credit_memos(&self, snapshots: &[AccountingSnapshot]) -> Result<String, ExportError>;
}
```

**QuickBooks CSV Templates** (Authoritative Headers):

Sales Receipt:
```csv
*InvoiceNo,*Customer,*InvoiceDate,*DueDate,Ship Date,Quantity,*Item(Product/Service),ItemDescription,*Rate,*Amount,Taxable,*TaxAmount,CustomerMsg
SR-001,John Doe,2026-01-20,2026-01-20,,2,PROD-001,Widget,10.00,20.00,Y,1.60,Thank you
```

Invoice:
```csv
*InvoiceNo,*Customer,*InvoiceDate,*DueDate,Terms,Location,Memo,*Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount,ItemTaxCode,ItemTaxAmount
INV-001,John Doe,2026-01-20,2026-02-20,Net 30,Main Store,Purchase,PROD-001,Widget,2,10.00,20.00,TAX,1.60
```

Credit Memo:
```csv
*CreditMemoNo,*Customer,*CreditMemoDate,*Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount,ItemTaxCode,ItemTaxAmount,Memo
CM-001,John Doe,2026-01-20,PROD-001,Widget Return,1,10.00,10.00,TAX,0.80,Return - damaged item
```

**Required Fields** (marked with `*`):
- InvoiceNo/CreditMemoNo: Unique identifier
- Customer: Customer name or ID
- InvoiceDate/CreditMemoDate: Transaction date (YYYY-MM-DD)
- DueDate: Payment due date (invoices only)
- Item(Product/Service): Product SKU or service code
- Rate: Unit price
- Amount: Line total (quantity × rate)
- TaxAmount: Tax amount for line or total

**Export Rules**:
- UTF-8 encoding
- Decimal precision: 2 places (0.00)
- Date format: YYYY-MM-DD (configurable)
- No recomputation of totals (snapshot is authoritative)
- Header order must match template exactly

**Generic Exports** (Lite value-add):
```rust
pub trait GenericExporter {
    fn export_products(&self) -> Result<String, ExportError>;
    fn export_customers(&self) -> Result<String, ExportError>;
    fn export_inventory(&self) -> Result<String, ExportError>;
}
```

### 6. QuickBooks Sync Add-On (Private) — Delivered as an add-on, not required by OSS

**Responsibility**: Real-time OAuth synchronization with QuickBooks Online.

**Key Architectural Requirement**:
The sync system MUST NOT be required to compile or run OSS builds.

Sync is enabled when:
1. Server is built with `--features export`, and
2. Sync add-on is present + configured + healthy.

**Recommended implementation: Sync Sidecar Service** (portable)
- Private sync package runs as a separate process/container
- Server communicates via loopback HTTP/gRPC
- `/api/capabilities` reports `sync=true` only if sidecar is healthy

**Why this is recommended**: it avoids Rust dynamic library complexity across Windows/Linux/Docker.

## Data Models

### Transaction Lifecycle

```
1. Draft Transaction Created
   ↓
2. Items Added/Modified
   ↓
3. Finalization Triggered
   ↓
4. POS Core Calculates Totals
   ↓
5. Accounting Snapshot Created (IMMUTABLE)
   ↓
6a. [Export Mode] Snapshot Available for Batch Export
6b. [Sync Mode] Snapshot sent to Sync Add-On (if present)
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Snapshot Creation Completeness

*For any* finalized transaction, exactly one Accounting_Snapshot SHALL be created and persisted containing all required fields (subtotal, tax, discount, total, payments, timestamp) and all line items, and SHALL be immediately queryable after finalization.

**Validates: Requirements 3.1, 3.2, 3.5**

### Property 2: Snapshot Immutability

*For any* persisted Accounting_Snapshot, any attempt to modify its fields or lines SHALL fail at both the API layer (403) and database layer (trigger/constraint).

**Validates: Requirements 3.3, 12.1**

### Property 3: Export Snapshot Faithfulness

*For any* export output, every exported monetary field SHALL exactly equal the corresponding Accounting_Snapshot values, with only formatting/normalization allowed (no recomputation).

**Validates: Requirements 3.4, 6.3**

### Property 4: Export Format Compliance

*For any* CSV generated by CSV_Export_Pack, the file SHALL match the declared QuickBooks template exactly (headers, order, encoding, required columns, precision, date format).

**Validates: Requirements 6.2, 6.5**

### Property 5: Batch Creation and Status Transitions

*For any* valid date range, the system SHALL create a unique immutable batch in pending status containing exactly eligible snapshots (excluding completed exports), and transition to completed/failed accordingly with error recording.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 6.6, 6.7**

### Property 6: Idempotency Across Completed Batches

*For any* completed batch, included snapshots SHALL be excluded from future batch creation, and re-exporting SHALL be prevented unless explicit reset occurs.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 7: Capabilities Response Validity (Compile-time + Runtime)

*For any* request to GET /api/capabilities:
- mode MUST be one of: disabled | export_only | sync
- disabled if export feature is off
- export_only if export is on and sync add-on is absent/unhealthy
- sync only if export is on AND sync add-on is present+healthy

**Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 11.1, 11.2, 11.3**

### Property 8: Migration Completeness and Safety

*After* migration completes, every historical finalized transaction SHALL have a snapshot OR a logged failure record, and migration SHALL be repeatable and rollback-safe.

**Validates: Requirements 13.1, 13.2, 13.3, 13.4**

### Property 9: Sync Trigger on Finalization (Private)

*If* sync add-on is present+configured, finalizing a transaction SHALL trigger a sync request and produce an audit log entry.

**Validates: Requirements 8.4, 8.6**

### Property 10: OAuth Token Refresh (Private)

*If* access token is expired, the add-on SHALL refresh before API calls.

**Validates: Requirements 8.5**

### Build Integrity Properties (Keep Lite Clean Forever)

### Property B1: Core-Only Compilation Isolation

*For any* core crate, the crate SHALL compile successfully without pulling optional integration dependencies.

**Validates: Requirements 1.6, 2.2, 2.3, 2.5, 12.1, 12.2, 12.3**

### Property B2: Feature Matrix Compilation

*For any* build configuration (no features, export feature), the server crate SHALL compile and pass all applicable tests.

**Note**: "sync" is not a cargo feature in OSS. It's runtime behavior.

**Validates: Requirements 1.3, 1.4, 1.5, 14.4, 14.5**

### Property B3: OSS Never Requires Private Code

*The* OSS build + Docker build MUST succeed with the `sync/` directory completely absent.

**Validates: Requirements 2.3, 8.1, 12.6**

## Error Handling

### Build-Time Errors

**Dependency Violation**:
- **Scenario**: Core crate attempts to depend on optional integration crate
- **Detection**: Cargo compilation fails with dependency error
- **Resolution**: Refactor to use trait-based abstraction or move code to appropriate crate

**Feature Flag Misconfiguration**:
- **Scenario**: Feature flag dependencies are circular or incorrect
- **Detection**: Cargo build fails or produces unexpected binary
- **Resolution**: Review and correct feature flag definitions in Cargo.toml

### Runtime Errors

**Snapshot Creation Failure**:
- **Scenario**: Database error during snapshot persistence
- **Error Code**: SNAPSHOT_CREATE_FAILED
- **Response**: Return 500 Internal Server Error, log error, mark transaction as "finalization_failed"
- **Recovery**: Retry snapshot creation, or manual intervention required

**Export Batch Creation Failure**:
- **Scenario**: Invalid date range or database error
- **Error Code**: BATCH_CREATE_FAILED
- **Response**: Return 400 Bad Request (invalid range) or 500 (database error)
- **Recovery**: User corrects date range or retries after database recovery

**CSV Generation Failure**:
- **Scenario**: Snapshot data is malformed or file system error
- **Error Code**: CSV_EXPORT_FAILED
- **Response**: Mark batch as "failed", log error details
- **Recovery**: User can reset batch and retry, or investigate data issues

**QuickBooks Sync Failure** (Private):
- **Scenario**: OAuth token invalid, API rate limit, or network error
- **Error Code**: QBO_SYNC_FAILED
- **Response**: Log error, queue for retry with exponential backoff
- **Recovery**: Automatic retry (up to 3 attempts), then manual intervention

**Immutability Violation Attempt**:
- **Scenario**: API request attempts to modify existing snapshot
- **Error Code**: SNAPSHOT_IMMUTABLE
- **Response**: Return 403 Forbidden with error message
- **Recovery**: No recovery needed - request is rejected

### Docker Build Errors

**Context Too Large**:
- **Scenario**: Missing or incorrect .dockerignore causes large context
- **Detection**: Docker build slow or fails with context size error
- **Resolution**: Verify .dockerignore exists and excludes target/, node_modules/, etc.

**Multi-Stage Build Failure**:
- **Scenario**: Dependency caching layer fails or produces incorrect artifacts
- **Detection**: Build fails or produces non-functional binary
- **Resolution**: Review Dockerfile stages, verify COPY commands, rebuild without cache

**Image Size Exceeded**:
- **Scenario**: Final image exceeds 500 MB (Lite) or 600 MB (Full) target
- **Detection**: CI check fails on image size
- **Resolution**: Review included dependencies, optimize binary size, use alpine base image

## Testing Strategy

### Unit Tests

**POS Core Domain**:
- Test pricing calculations with various item combinations
- Test tax calculations with different tax rates
- Test discount application (percentage and fixed amount)
- Test transaction finalization logic
- **Coverage Target**: 90%+ for core business logic

**Accounting Snapshots**:
- Test snapshot creation from transaction
- Test snapshot field population
- Test immutability enforcement (attempt to modify should fail)
- Test database persistence
- **Coverage Target**: 85%+

**Export Batches**:
- Test batch creation with various date ranges
- Test snapshot collection logic
- Test idempotency markers
- Test status transitions
- **Coverage Target**: 85%+

**Capabilities API**:
- Test capability provider for each build configuration
- Test JSON serialization
- Test endpoint response format
- **Coverage Target**: 100% (critical for frontend integration)

### Property-Based Tests

**Property Test 1: Snapshot Immutability**
```rust
#[cfg(test)]
mod property_tests {
    use proptest::prelude::*;
    
    proptest! {
        #[test]
        fn snapshot_immutability(
            transaction in arbitrary_transaction(),
            new_total in arbitrary_decimal()
        ) {
            // Feature: split-build-system, Property 2: Snapshot Immutability
            let snapshot = create_snapshot(&transaction);
            persist_snapshot(&snapshot);
            
            let result = attempt_to_modify_snapshot(&snapshot.id, new_total);
            
            prop_assert!(result.is_err());
            prop_assert_eq!(result.unwrap_err(), SnapshotError::Immutable);
        }
    }
}
```

**Property Test 2: Export Snapshot Faithfulness**
```rust
proptest! {
    #[test]
    fn export_uses_snapshot_values(
        snapshots in prop::collection::vec(arbitrary_snapshot(), 1..100)
    ) {
        // Feature: split-build-system, Property 3: Export Snapshot Faithfulness
        let csv = export_to_csv(&snapshots);
        let parsed_rows = parse_csv(&csv);
        
        for (snapshot, row) in snapshots.iter().zip(parsed_rows.iter()) {
            prop_assert_eq!(row.subtotal, snapshot.subtotal);
            prop_assert_eq!(row.tax, snapshot.tax);
            prop_assert_eq!(row.total, snapshot.total);
        }
    }
}
```

**Property Test 3: Batch Idempotency**
```rust
proptest! {
    #[test]
    fn completed_batch_prevents_reexport(
        date_range in arbitrary_date_range(),
        snapshots in prop::collection::vec(arbitrary_snapshot(), 1..100)
    ) {
        // Feature: split-build-system, Property 6: Idempotency Across Completed Batches
        let batch1 = create_batch(date_range.clone());
        mark_completed(&batch1.id);
        
        let batch2 = create_batch(date_range.clone());
        
        // Second batch should not include snapshots from first batch
        prop_assert!(batch2.snapshots.is_disjoint(&batch1.snapshots));
    }
}
```

**Property Test 4: Migration Completeness**
```rust
proptest! {
    #[test]
    fn migration_creates_all_snapshots(
        transactions in prop::collection::vec(arbitrary_finalized_transaction(), 1..1000)
    ) {
        // Feature: split-build-system, Property 8: Migration Completeness and Safety
        seed_database_with_transactions(&transactions);
        
        run_migration();
        
        for transaction in transactions.iter() {
            let snapshot = get_snapshot_for_transaction(&transaction.id);
            prop_assert!(snapshot.is_some());
            
            let snapshot = snapshot.unwrap();
            prop_assert_eq!(snapshot.transaction_id, transaction.id);
            prop_assert_eq!(snapshot.total, transaction.total);
        }
    }
}
```

### Integration Tests

**Build Configuration Tests**:
```bash
# Test 1: Core/Lite build compiles without features
cargo test --no-default-features

# Test 2: Export build includes CSV functionality
cargo test --no-default-features --features export
```

**Capabilities API Tests**:
```rust
#[actix_rt::test]
async fn test_capabilities_disabled_mode() {
    // Build: --no-default-features
    let app = test_app().await;
    let req = test::TestRequest::get()
        .uri("/api/capabilities")
        .to_request();
    
    let resp: Capabilities = test::call_and_read_body_json(&app, req).await;
    
    assert_eq!(resp.accounting_mode, AccountingMode::Disabled);
    assert_eq!(resp.features.export, false);
    assert_eq!(resp.features.sync, false);
}

#[actix_rt::test]
async fn test_capabilities_export_mode() {
    // Build: --features export
    let app = test_app().await;
    let req = test::TestRequest::get()
        .uri("/api/capabilities")
        .to_request();
    
    let resp: Capabilities = test::call_and_read_body_json(&app, req).await;
    
    assert_eq!(resp.accounting_mode, AccountingMode::ExportOnly);
    assert_eq!(resp.features.export, true);
    assert_eq!(resp.features.sync, false);
}
```

**CSV Export Tests**:
```rust
#[cfg(feature = "export")]
#[test]
fn test_sales_receipt_header_matches_template() {
    let csv = export_sales_receipts(&vec![create_test_snapshot()]).unwrap();
    let header = csv.lines().next().unwrap();
    
    assert_eq!(
        header,
        "*InvoiceNo,*Customer,*InvoiceDate,*DueDate,Ship Date,Quantity,*Item(Product/Service),ItemDescription,*Rate,*Amount,Taxable,*TaxAmount,CustomerMsg"
    );
}

#[cfg(feature = "export")]
#[test]
fn test_csv_export_format() {
    let snapshots = vec![
        create_test_snapshot(/* ... */),
        create_test_snapshot(/* ... */),
    ];
    
    let csv = export_sales_receipts(&snapshots).unwrap();
    
    // Verify data rows
    let lines: Vec<&str> = csv.lines().collect();
    assert_eq!(lines.len(), snapshots.len() + 1); // +1 for header
    
    // Verify values match snapshots (no recomputation)
    for (i, snapshot) in snapshots.iter().enumerate() {
        let row = lines[i + 1];
        assert!(row.contains(&snapshot.total.to_string()));
    }
}
```

### Docker Build Tests

```bash
# Test 1: Verify .dockerignore exists and is effective
test -f .dockerignore
docker build --no-cache -t EasySale-test ./backend 2>&1 | grep "Sending build context"
# Should show context size < 100 MB (not 35 GB)

# Test 2: Build Lite image and verify size
docker build --no-cache --build-arg FEATURES="" -t EasySale-lite ./backend
docker images EasySale-lite --format "{{.Size}}"
# Should be < 500 MB

# Test 3: Build Full image and verify size
docker build --no-cache --build-arg FEATURES="export" -t EasySale-full ./backend
docker images EasySale-full --format "{{.Size}}"
# Should be < 600 MB

# Test 4: Verify multi-stage caching works
docker build -t EasySale-test ./backend  # First build
docker build -t EasySale-test ./backend  # Second build should use cache
# Second build should be significantly faster
```

### Test Configuration

**Minimum Iterations for Property Tests**: 100 per property

**Test Tagging**:
- All property tests tagged with: `// Feature: split-build-system, Property N: <property_text>`
- Integration tests tagged with build configuration: `#[cfg(feature = "export")]`
- Unit tests run in all builds
- Integration tests run only when relevant features enabled

**CI Pipeline**:
```yaml
test-core:
  script: cargo test --no-default-features
  
test-export:
  script: cargo test --no-default-features --features export
  
test-docker:
  script:
    - docker build --build-arg FEATURES="" -t lite ./backend
    - docker build --build-arg FEATURES="export" -t full ./backend
    - ./scripts/verify-image-sizes.sh
```

## Docker Build Optimization (Critical for the "17–35GB" problem)

### Root .dockerignore (Repo Root)

```
.git
.github
.vscode
.husky
.kiro
*.code-workspace

**/node_modules
**/dist
**/.next
**/.turbo

**/target
**/*.rlib
**/*.rmeta

*.log
build-*.txt
build-*.log
prod-build.log

archive
backup
audit
memory-bank
data
installer
examples
md files.zip

.env
**/.env
**/*.pem
**/*.key
```

### Compose contexts MUST NOT be repo root

Backend should build from `./backend`, frontend from `./frontend`.

Example:
```yaml
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
      args:
        FEATURES: ""
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
```

**This is the biggest practical fix to stop Docker from ingesting huge folders.**

## Implementation Notes

### Current State

Single backend crate with integrations compiled in. (Workspace split is Phase 1.)


### Migration Strategy

**Phase 0: Truth Sync** (Evidence-based documentation)

Generate:
- `docs/build/build_matrix.md` - Current dependencies and proposed feature flags
- `docs/qbo/current_integration_map.md` - All QuickBooks files, handlers, routes, DB tables
- `docs/export/export_surface.md` - Existing CSV export capabilities
- `docs/docker/bloat_report.md` - Docker context size analysis, .dockerignore requirements
- `docs/traceability/requirements_trace.md` - Map requirements to code locations

**Phase 1: Workspace Creation** (inside `backend/`)

- Create `[workspace]` in `backend/Cargo.toml`
- Move server crate to `backend/crates/server`
- Create core crates + wire dependencies
- Verify workspace compiles: `cargo build --workspace`

**Phase 2: Core Extraction**

- Move POS domain logic from `server/src/` to `pos_core_domain/src/`:
  - Pricing calculations
  - Tax calculations
  - Discount application
  - Transaction finalization
- Move shared types to `pos_core_models/src/`
- Move database access to `pos_core_storage/src/`
- Update `server` to depend on core crates
- **Critical**: Verify core compiles independently:
  ```bash
  cd crates/pos_core_domain && cargo build
  cd crates/pos_core_models && cargo build
  cd crates/pos_core_storage && cargo build
  ```
- Add CI job to enforce core-only compilation (Property B1)

**Phase 3: Snapshot System**

- Create `accounting_snapshots` crate
- Implement `SnapshotBuilder` trait in `pos_core_domain`
- Add database migrations for `accounting_snapshots`, `snapshot_lines`, `snapshot_payments` tables
- Implement snapshot creation on transaction finalization
- Add database trigger to prevent snapshot modifications
- Add API layer immutability enforcement (403 on UPDATE attempts)
- Write property tests for immutability (Property 2)
- Write integration tests for snapshot creation (Property 1)

**Phase 4: Capability API**

- Create `capabilities` crate
- Implement compile-time capability detection using `cfg!` macros
- Implement runtime sync detection (sidecar healthcheck)
- Add `/api/capabilities` endpoint to `server`
- Write integration tests for each build variant (Property 7, Property B2):
  ```bash
  cargo test --no-default-features  # Should return "disabled"
  cargo test --features export      # Should return "export_only"
  ```
- Update frontend to query capabilities on startup
- Implement UI gating based on capabilities

**Phase 5: Export Batches**

- Create `export_batches` crate
- Add database migrations for `export_batches` and `batch_snapshots` tables
- Implement batch creation with date range filtering
- Implement idempotency tracking (exclude snapshots in completed batches)
- Implement status transitions (pending → completed/failed)
- Write integration tests for batch creation (Property 5)
- Write integration tests for idempotency (Property 6)

**Phase 6: CSV Export Pack** (Optional, OSS)

- Create `csv_export_pack` crate with `#[cfg(feature = "export")]`
- Implement QuickBooks CSV exporters:
  - Sales receipt exporter
  - Invoice exporter
  - Credit memo exporter
- Implement generic exporters (products, customers, inventory)
- Add ZIP packaging for multi-file exports
- Write golden file tests for CSV format (Property 4)
- Write property tests for snapshot faithfulness (Property 3)
- **Critical**: Verify this crate has NO QuickBooks OAuth or API client code

**Phase 7: Docker Optimization**

- Create root `.dockerignore` with comprehensive exclusions
- Update `docker-compose.yml` to use `./backend` and `./frontend` contexts
- Implement multi-stage Dockerfile:
  ```dockerfile
  # Stage 1: Dependencies
  FROM rust:1.75 AS deps
  WORKDIR /app
  COPY Cargo.toml Cargo.lock ./
  COPY crates/*/Cargo.toml crates/
  RUN cargo build --release --workspace
  
  # Stage 2: Build
  FROM rust:1.75 AS builder
  WORKDIR /app
  COPY --from=deps /app/target target
  COPY . .
  ARG FEATURES=""
  RUN cargo build --release --no-default-features --features "$FEATURES"
  
  # Stage 3: Runtime
  FROM debian:bookworm-slim
  COPY --from=builder /app/target/release/EasySale-server /usr/local/bin/
  CMD ["EasySale-server"]
  ```
- Add CI checks for image size:
  ```bash
  docker build --build-arg FEATURES="" -t lite ./backend
  docker images lite --format "{{.Size}}" | grep -E "^[0-4][0-9]{2}M"  # < 500MB
  
  docker build --build-arg FEATURES="export" -t full ./backend
  docker images full --format "{{.Size}}" | grep -E "^[0-5][0-9]{2}M"  # < 600MB
  ```

**Phase 8: QuickBooks Sync Add-On** (Optional, Private)

- Implement sync as separate private add-on (sidecar recommended)
- Add server → add-on integration contract (HTTP/gRPC healthcheck + sync API)
- Enable runtime detection + capability reporting
- Add sync logs + retries + token refresh tests
- **Critical**: Verify this is NOT included in Lite build:
  ```bash
  cargo build --no-default-features
  nm target/release/EasySale-server | grep -i "qbo\|quickbooks\|oauth"  # Should be empty
  ```

**Phase 9: Historical Migration**

- Implement migration job in `accounting_snapshots/src/migration.rs`
- Add CLI command: `EasySale-server migrate-snapshots`
- Implement verification: count finalized transactions vs snapshots
- Implement rollback: delete all snapshots created by migration
- Test on production data copy
- Write property tests for migration completeness (Property 8)
- Document migration procedure in `docs/migration/snapshot_migration.md`
- Execute migration in production with rollback plan

### Code Organization Principles

1. **Dependency Direction**: optional → core, never core → optional
2. **Feature Flags**: only use compile-time flags for OSS-safe optional code (export)
3. **Sync Isolation**: sync code is private and runtime-attached
4. **Zero Duplication**: pricing/tax/snapshot logic exists in one place only
5. **Immutability**: snapshots are write-once read-many
6. **Idempotency**: exports are safe, repeatable, and non-duplicating
7. **Capability-Driven UI**: frontend adapts to what backend truly supports

### Performance Considerations

**Snapshot Creation**: < 10ms per transaction (in-memory computation + single DB write)
**Batch Creation**: < 1s for 1000 snapshots (single query with date range filter)
**CSV Generation**: < 5s for 1000 transactions (streaming write to file)
**Capabilities Query**: < 1ms (compile-time constant + optional healthcheck)
**Docker Build**: < 5 minutes for full build with cache, < 15 minutes without cache

### Security Considerations

**OAuth Tokens** (Private): Encrypted at rest using AES-256-GCM
**Snapshot Immutability**: Enforced at database and application layers
**Feature Isolation**: Lite build contains zero OAuth or API client code
**Docker Context**: Excludes sensitive files (.env, credentials, keys)
**API Access**: Capabilities endpoint is public, but other endpoints require authentication
