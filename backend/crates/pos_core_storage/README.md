# POS Core Storage

Database access layer for core POS operations, providing SQLite connection management and query builders.

## Features

- **Connection Management**: Initialize and manage SQLite connection pools
- **Transaction Repository**: CRUD operations for transactions with line items and payments
- **Query Builders**: Type-safe SQL query construction
- **Error Handling**: Comprehensive error types for storage operations
- **Zero Integration Dependencies**: No QuickBooks, WooCommerce, or other integration code

## Usage

### Initialize Database Pool

```rust
use pos_core_storage::init_pool;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize pool from DATABASE_PATH environment variable
    let pool = init_pool().await?;
    
    // Use the pool...
    
    Ok(())
}
```

### Transaction Repository

```rust
use pos_core_storage::TransactionRepository;
use pos_core_models::{Transaction, LineItem, Payment};
use rust_decimal_macros::dec;

async fn example(pool: DatabasePool) -> Result<(), StorageError> {
    let repo = TransactionRepository::new(pool);
    
    // Create a new transaction
    let mut transaction = Transaction::new();
    transaction.add_item(LineItem::new(
        "PROD-001".to_string(),
        dec!(2.0),
        dec!(10.00)
    ))?;
    transaction.add_payment(Payment {
        method: "cash".to_string(),
        amount: dec!(20.00),
    })?;
    
    // Save to database
    repo.save(&transaction).await?;
    
    // Find by ID
    let found = repo.find_by_id(transaction.id).await?;
    
    // Find by status
    let drafts = repo.find_by_status(TransactionStatus::Draft).await?;
    
    // Update transaction
    transaction.status = TransactionStatus::Finalized;
    transaction.finalized_at = Some(Utc::now());
    repo.update(&transaction).await?;
    
    Ok(())
}
```

### Query Builders

```rust
use pos_core_storage::query_builder::SelectQueryBuilder;

let query = SelectQueryBuilder::new("transactions")
    .columns(&["id", "total", "status"])
    .where_clause("status = ?")
    .order_by("created_at", false)
    .limit(10)
    .build();

// Produces: SELECT id, total, status FROM transactions 
//           WHERE status = ? ORDER BY created_at DESC LIMIT 10
```

## Architecture

This crate is part of the split build system architecture:

```
pos_core_storage
├── connection.rs       # Database pool management
├── error.rs           # Storage error types
├── query_builder.rs   # SQL query builders
└── repositories/
    └── transaction.rs # Transaction CRUD operations
```

## Dependencies

- `pos_core_models` - Core domain models (Transaction, LineItem, etc.)
- `sqlx` - Async SQL toolkit with SQLite support
- `tokio` - Async runtime
- `chrono` - Date/time handling
- `uuid` - UUID support
- `rust_decimal` - Decimal arithmetic for financial calculations

## Testing

Run tests with:

```bash
cargo test -p pos_core_storage
```

All tests use in-memory SQLite databases and require no external setup.

## Design Principles

1. **No Integration Dependencies**: This crate contains only core POS storage logic
2. **Type Safety**: Use query builders and strong types to prevent SQL errors
3. **Error Handling**: Comprehensive error types with context
4. **Testability**: All operations are testable with in-memory databases
5. **Performance**: Efficient query construction and connection pooling

## Future Enhancements

- [ ] Add support for tax rates and discounts in repository
- [ ] Implement batch operations for bulk inserts
- [ ] Add query result caching
- [ ] Implement database migrations management
- [ ] Add support for custom product attributes
