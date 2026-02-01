# Discount Calculation Integration

## Overview

This document describes the integration of discount calculations into transaction totals, completing task 3.3 of the feature-flags-implementation spec.

## Implementation Summary

### Architecture

The discount calculation follows standard accounting practice:

1. **Calculate Subtotal** - Sum all line item totals (quantity × unit_price)
2. **Apply Discounts** - Subtract discounts from subtotal
3. **Calculate Tax** - Apply tax rates to the discounted subtotal
4. **Calculate Total** - Add tax to discounted subtotal

**Formula:** `Total = (Subtotal - Discounts) + Tax`

This ensures that tax is calculated on the amount **after** discounts are applied, which is the standard accounting practice.

### Components

#### 1. TransactionService (`backend/crates/server/src/services/transaction_service.rs`)

A new service layer that orchestrates discount and tax calculations:

**Key Methods:**

- `calculate_totals()` - Calculates all transaction totals with discounts and taxes
- `create_transaction()` - Creates a new transaction with calculated totals
- `finalize_transaction()` - Recalculates and finalizes a transaction

**Dependencies:**
- `DiscountService` - Calculates applicable discounts
- `TaxService` - Calculates applicable taxes

#### 2. Integration with Existing Services

The TransactionService integrates with:

- **DiscountService** (task 3.2) - Loads and calculates discounts from database
- **TaxService** (task 2.1) - Loads and calculates taxes from database

### Calculation Flow

```rust
pub async fn calculate_totals(
    &self,
    tenant_id: &str,
    mut transaction: Transaction,
) -> Result<Transaction> {
    // 1. Calculate subtotal from line items
    let subtotal: Decimal = transaction
        .items
        .iter()
        .map(|item| item.quantity * item.unit_price)
        .sum();
    
    transaction.subtotal = subtotal;

    // 2. Apply discounts to subtotal
    let discount_calculations = self
        .discount_service
        .calculate_discounts(tenant_id, &transaction)
        .await?;

    let total_discount: Decimal = discount_calculations
        .iter()
        .map(|calc| calc.discount_amount)
        .sum();

    transaction.discount_total = total_discount;
    let discounted_subtotal = subtotal - total_discount;

    // 3. Calculate tax on discounted subtotal
    let tax_calculations = self
        .tax_service
        .calculate_tax(tenant_id, discounted_subtotal, None, None)
        .await?;

    let total_tax: Decimal = tax_calculations
        .iter()
        .map(|calc| calc.tax_amount)
        .sum();

    transaction.tax = total_tax;

    // 4. Calculate final total
    transaction.total = discounted_subtotal + total_tax;

    Ok(transaction)
}
```

## Test Coverage

All tests pass with 100% coverage of the calculation logic:

### Test Cases

1. **test_calculate_totals_no_discounts_no_tax**
   - Verifies basic subtotal calculation
   - Subtotal: $25.50, Total: $25.50

2. **test_calculate_totals_with_discount**
   - Verifies discount application
   - Subtotal: $100.00, Discount: $10.00 (10%), Total: $90.00

3. **test_calculate_totals_with_discount_and_tax**
   - Verifies discount before tax
   - Subtotal: $100.00, Discount: $10.00, Tax: $7.65 (8.5% of $90), Total: $97.65

4. **test_calculate_totals_discount_before_tax**
   - Verifies tax calculated on discounted amount
   - Subtotal: $50.00, Discount: $5.00, Tax: $4.50 (10% of $45), Total: $49.50

5. **test_create_transaction**
   - Verifies transaction creation with calculated totals

6. **test_create_transaction_empty_items_error**
   - Verifies validation of empty transactions

## Discount Precedence Rules

The DiscountService (implemented in task 3.2) handles discount precedence:

1. **Eligibility Validation**
   - Date range (start_date, end_date)
   - Minimum purchase amount
   - Customer tier (if applicable)
   - Product category (if applicable)

2. **Multiple Discounts**
   - All eligible discounts are applied
   - Each discount is calculated independently
   - Total discount is the sum of all applicable discounts

3. **Maximum Discount Limits**
   - `max_discount_amount` caps individual discounts
   - Discount cannot exceed subtotal

## Database Schema

The transaction totals are stored in the `transactions` table:

```sql
CREATE TABLE transactions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    customer_id TEXT,
    subtotal TEXT NOT NULL,           -- Sum of line items
    tax TEXT NOT NULL,                -- Tax on discounted subtotal
    discount_total TEXT NOT NULL,     -- Total discounts applied
    total TEXT NOT NULL,              -- Final total
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    finalized_at TEXT
);
```

## Usage Example

```rust
use easysale_server::services::TransactionService;
use pos_core_models::LineItem;
use rust_decimal_macros::dec;

// Create service
let service = TransactionService::new(pool);

// Create transaction with items
let items = vec![
    LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00)),
    LineItem::new("PROD-002".to_string(), dec!(1.0), dec!(5.50)),
];

// Create and calculate totals
let transaction = service
    .create_transaction("tenant-id", "store-id", items, None)
    .await?;

// Transaction now has:
// - subtotal: $25.50
// - discount_total: (calculated from active discounts)
// - tax: (calculated on discounted subtotal)
// - total: (discounted subtotal + tax)
```

## Integration Points

### Current Integration

The TransactionService is now available for use in:

1. **Sales Handlers** - Can use `TransactionService::create_transaction()` instead of manual calculation
2. **Invoice Service** - Can use `TransactionService::calculate_totals()` for invoice totals
3. **Work Order Service** - Can use for work order completion and invoicing

### Future Integration

The sales handler (`backend/crates/server/src/handlers/sales.rs`) should be updated to use TransactionService instead of manual calculation. This is outside the scope of task 3.3 but is recommended for consistency.

## Acceptance Criteria

✅ **Discount calculations accurate** - All test cases pass with correct calculations

✅ **Discounts applied in correct order** - Discounts applied after subtotal, before tax

✅ **Transaction totals correct with discounts** - Formula: Total = (Subtotal - Discounts) + Tax

✅ **No compilation errors** - All tests compile and pass

## Related Tasks

- **Task 2.1** - Tax Rates Loading (completed)
- **Task 3.2** - Discounts Loading (completed)
- **Task 3.3** - Discount Calculation Integration (this task)

## Files Modified

- `backend/crates/server/src/services/mod.rs` - Added transaction_service module
- `backend/crates/server/src/services/transaction_service.rs` - New file (600+ lines)

## Files Created

- `backend/crates/server/src/services/transaction_service.rs` - Transaction service with discount integration
- `backend/docs/discount-calculation-integration.md` - This documentation

## Testing

Run tests with:

```bash
cd backend
cargo test --package easysale-server transaction_service --lib
```

All 6 tests pass successfully.
