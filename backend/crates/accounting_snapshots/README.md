# Accounting Snapshots

This crate manages immutable accounting snapshots created at transaction finalization. Snapshots capture all computed financial data (subtotal, tax, discounts, totals, payments) and are never modified after creation.

## Purpose

The accounting snapshots system ensures that exports and reports always use the exact values that were computed at the time of the transaction, with no recomputation. This is critical for:

- **Financial accuracy**: Exported data matches what was recorded at transaction time
- **Audit compliance**: Historical records are immutable and tamper-proof
- **Export reliability**: CSV exports and reports use snapshot data, not recalculated values
- **Data integrity**: Snapshots are validated for internal consistency at creation time

## Key Types

### `AccountingSnapshot`

The main snapshot structure containing:
- Transaction reference and timestamps
- Financial totals (subtotal, tax, discount, total)
- Multi-tender payment information
- Line items with computed values

### `SnapshotLine`

Individual line item in a snapshot:
- Product identifier and description
- Quantity and unit price
- Computed line total and tax amount

### `Payment`

Payment method and amount (supports multi-tender transactions):
- Payment method (cash, card, check, on_account, etc.)
- Amount paid

## Traits

### `SnapshotBuilder`

Trait for building accounting snapshots from transactions:

```rust
pub trait SnapshotBuilder {
    fn build_snapshot(&self, transaction: &Transaction) -> SnapshotResult<AccountingSnapshot>;
}
```

The default implementation (`DefaultSnapshotBuilder`) uses `pos_core_domain` business logic to create snapshots from finalized transactions.

## Usage

```rust
use accounting_snapshots::{DefaultSnapshotBuilder, SnapshotBuilder};
use pos_core_models::Transaction;

// Create a snapshot builder
let builder = DefaultSnapshotBuilder::new();

// Build snapshot from finalized transaction
let snapshot = builder.build_snapshot(&transaction)?;

// Verify consistency
assert!(snapshot.verify_consistency());

// Check payment status
if snapshot.is_paid_in_full() {
    println!("Transaction fully paid");
}
```

## Immutability

Snapshots are immutable by design:

1. **No modification methods**: The `AccountingSnapshot` type provides no methods to modify its fields
2. **Database enforcement**: Database triggers prevent UPDATE operations on snapshot tables
3. **API layer enforcement**: API endpoints return 403 Forbidden for any modification attempts

## Consistency Verification

Snapshots include built-in consistency checks:

```rust
// Verify that:
// - Line totals sum to subtotal
// - subtotal + tax - discount = total
assert!(snapshot.verify_consistency());
```

## Dependencies

This crate depends on:
- `pos_core_models`: Shared types (Transaction, LineItem, Payment)
- `pos_core_domain`: Business logic for calculations
- `pos_core_storage`: Database access layer

**Important**: This crate has NO integration dependencies (QuickBooks, WooCommerce, Supabase). It is part of the open-source core.

## Testing

Run tests with:

```bash
cargo test -p accounting_snapshots
```

The test suite includes:
- Snapshot creation from finalized transactions
- Consistency verification
- Multi-tender payment support
- Tax distribution across line items
- Error handling for invalid states

## Design Principles

1. **Immutability**: Snapshots are write-once, read-many
2. **Consistency**: All snapshots are validated at creation time
3. **Isolation**: No integration dependencies
4. **Testability**: Comprehensive unit tests with property-based testing support
5. **Traceability**: Each snapshot links to its source transaction

## Related Crates

- `export_batches`: Manages collections of snapshots for export
- `csv_export_pack`: Generates CSV files from snapshots (optional, feature-gated)
- `capabilities`: Reports backend feature availability

## License

MIT
