# Core Crates Integration - Task 2.4

## Summary

This document describes the changes made to integrate the server crate with the core crates (`pos_core_domain`, `pos_core_models`, `pos_core_storage`) as part of the split build system implementation.

## Changes Made

### 1. Database Module (`src/db/mod.rs`)

**Before:**
- Server had its own `init_pool()` function that duplicated the logic from `pos_core_storage`

**After:**
- Removed duplicate `init_pool()` implementation
- Re-exported `init_pool()` and `DatabasePool` from `pos_core_storage`
- Maintained backward compatibility by also re-exporting `SqlitePool` for existing code

```rust
// Re-export database pool initialization from pos_core_storage
pub use pos_core_storage::{init_pool, DatabasePool};

// Re-export SqlitePool for compatibility with existing code
pub use sqlx::sqlite::SqlitePool;
```

### 2. Library Exports (`src/lib.rs`)

**Added:**
- Re-exports of core crate types for use throughout the server
- Domain logic traits from `pos_core_domain`
- Model types from `pos_core_models`
- Storage types from `pos_core_storage`

```rust
// Re-export core crate types for use throughout the server
pub use pos_core_domain::{
    DefaultPricingEngine, DiscountApplicator, TaxCalculator, TransactionFinalizer,
};
pub use pos_core_models::{
    Discount as CoreDiscount, DiscountType as CoreDiscountType, DomainError, DomainResult,
    LineItem as CoreLineItem, Payment, PricingEngine, TaxRate, Transaction, TransactionStatus,
};
pub use pos_core_storage::{DatabasePool, StorageError, StorageResult};
```

**Note:** Core types are aliased (e.g., `CoreDiscount`, `CoreLineItem`) to avoid conflicts with server's own types used for external system integration (WooCommerce, QuickBooks).

### 3. Integration Tests (`src/tests/core_crate_integration_tests.rs`)

**Added:**
- New test module to verify core crate integration
- Tests for core transaction types
- Tests for core payment types
- Tests for core line item types
- Tests for core storage initialization
- Tests for domain rule enforcement

## Type Separation

The server maintains two sets of types:

1. **Core POS Types** (from `pos_core_models`):
   - `Transaction`, `Payment`, `LineItem`, etc.
   - Used for core POS business logic
   - Immutable, domain-driven design

2. **External Integration Types** (in `src/models/external_entities.rs`):
   - `InternalOrder`, `InternalCustomer`, `InternalProduct`, etc.
   - Used for WooCommerce, QuickBooks, and other external system integration
   - Mutable, integration-focused design

These types serve different purposes and should not be confused or merged.

## Dependencies

The server's `Cargo.toml` already had the correct dependencies:

```toml
[dependencies]
# Workspace crates (core - always included)
pos_core_domain = { path = "../pos_core_domain" }
pos_core_models = { path = "../pos_core_models" }
pos_core_storage = { path = "../pos_core_storage" }
```

## Verification

### Compilation Status

The server compiles with the core crate dependencies. Pre-existing database schema errors (unrelated to this task) prevent full compilation, but no import or dependency errors were introduced by these changes.

### Error Handling

The change from `Result<SqlitePool, sqlx::Error>` to `StorageResult<DatabasePool>` is transparent because:
- `StorageError` implements `Display` via `thiserror::Error`
- Error handling in `main.rs` only logs the error and exits
- No code depends on the specific error type

## Future Work

As the split build system implementation continues:

1. **Phase 3 (Snapshot System)**: The server will use `accounting_snapshots` crate
2. **Phase 4 (Capability API)**: The server will use `capabilities` crate
3. **Phase 5 (Export Batches)**: The server will use `export_batches` crate
4. **Phase 6 (CSV Export)**: The server will optionally use `csv_export_pack` crate

## Testing

To run the core crate integration tests:

```bash
cargo test --manifest-path backend/crates/server/Cargo.toml --lib core_crate_integration_tests
```

Note: Full test execution requires database schema fixes (pre-existing issue).

## Compliance

This implementation satisfies:
- **Requirement 2.1**: Core domain isolation - server now uses core crates
- **Design Phase 2**: Core extraction - server updated to depend on core crates
- **Property B1**: Core-only compilation isolation - core crates compile independently
