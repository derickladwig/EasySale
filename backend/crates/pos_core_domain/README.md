# POS Core Domain

This crate contains the core business logic for the EasySale system, including:

- **Pricing calculations**: Calculate subtotals, line totals, and validate pricing
- **Tax calculations**: Support for single and multiple tax rates (additive or compound)
- **Discount application**: Percentage and fixed amount discounts
- **Transaction finalization**: Complete transaction processing with all calculations

## Design Principles

1. **Pure Business Logic**: This crate contains ONLY domain logic with no external dependencies
2. **No Integration Code**: Zero dependencies on QuickBooks, WooCommerce, Supabase, or any other integration
3. **Trait-Based Design**: All engines use traits for flexibility and testability
4. **Immutability**: Finalized transactions cannot be modified
5. **Comprehensive Testing**: 35+ unit tests covering all core functionality

## Key Components

### Pricing Engine

```rust
use pos_core_domain::{PricingEngine, DefaultPricingEngine, LineItem};
use rust_decimal_macros::dec;

let engine = DefaultPricingEngine::new();
let items = vec![
    LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00)),
    LineItem::new("PROD-002".to_string(), dec!(1.0), dec!(5.50)),
];

let subtotal = engine.calculate_subtotal(&items).unwrap();
assert_eq!(subtotal, dec!(25.50));
```

### Tax Calculator

```rust
use pos_core_domain::{TaxCalculator, DefaultTaxCalculator, TaxRate};
use rust_decimal_macros::dec;

let calculator = DefaultTaxCalculator::new();
let rate = TaxRate::new("TAX".to_string(), dec!(8.5), "Sales Tax".to_string()).unwrap();

let tax = calculator.calculate_tax(dec!(100.00), &rate).unwrap();
assert_eq!(tax, dec!(8.50));
```

### Discount Applicator

```rust
use pos_core_domain::{DiscountApplicator, DefaultDiscountApplicator, Discount, DiscountType};
use rust_decimal_macros::dec;

let applicator = DefaultDiscountApplicator::new();
let discount = Discount::new("SAVE10".to_string(), DiscountType::Percent, dec!(10.0)).unwrap();

let final_amount = applicator.apply_discount(dec!(100.00), &discount).unwrap();
assert_eq!(final_amount, dec!(90.00));
```

### Transaction Finalizer

```rust
use pos_core_domain::{
    Transaction, TransactionFinalizer, DefaultTransactionFinalizer,
    DefaultPricingEngine, DefaultTaxCalculator, DefaultDiscountApplicator,
    LineItem, TaxRate
};
use rust_decimal_macros::dec;

let mut transaction = Transaction::new();
transaction.add_item(LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00))).unwrap();
transaction.add_tax_rate(TaxRate::new("TAX".to_string(), dec!(8.5), "Sales Tax".to_string()).unwrap()).unwrap();

let finalizer = DefaultTransactionFinalizer::new(
    DefaultPricingEngine::new(),
    DefaultTaxCalculator::new(),
    DefaultDiscountApplicator::new(),
);

finalizer.finalize_transaction(&mut transaction).unwrap();

assert_eq!(transaction.subtotal, dec!(20.00));
assert_eq!(transaction.tax, dec!(1.70));
assert_eq!(transaction.total, dec!(21.70));
```

## Dependencies

This crate depends only on:
- `pos_core_models`: Shared types and models
- `rust_decimal`: Precise decimal arithmetic
- `chrono`: Date/time handling
- `uuid`: Unique identifiers
- `serde`: Serialization
- `thiserror`: Error handling

**No integration dependencies** - this crate can be compiled and used independently.

## Testing

Run tests with:

```bash
cargo test --manifest-path backend/crates/pos_core_domain/Cargo.toml
```

All 35 tests should pass, covering:
- Pricing calculations
- Tax calculations (single and multi-rate)
- Discount application
- Transaction finalization
- Error handling
- Edge cases

## License

See workspace root for license information.
