//! Comprehensive unit tests for discount calculations
//! 
//! This test suite covers:
//! - Discount types: percentage, fixed, fixed_cart
//! - Discount limits: min_purchase_amount, max_discount_amount
//! - Multiple discounts and precedence rules
//! - Edge cases: zero amounts, negative amounts, boundary conditions
//! - Eligibility validation

use sqlx::SqlitePool;
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use pos_core_models::{Transaction, LineItem, DiscountType};

// Import the services we're testing
use easysale_server::services::discount_service::{DiscountService, DiscountServiceError};
use easysale_server::services::transaction_service::TransactionService;

/// Helper function to create an in-memory test database
async fn create_test_pool() -> SqlitePool {
    let pool = SqlitePool::connect("sqlite::memory:")
        .await
        .expect("Failed to create test pool");

    // Create test tables
    sqlx::query(
        "CREATE TABLE tenants (
            id TEXT PRIMARY KEY
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create tenants table");

    sqlx::query(
        "CREATE TABLE discounts (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            store_id TEXT NOT NULL DEFAULT 'default',
            code TEXT NOT NULL,
            name TEXT NOT NULL,
            discount_type TEXT NOT NULL,
            amount REAL NOT NULL,
            description TEXT,
            min_purchase_amount REAL,
            max_discount_amount REAL,
            start_date TEXT,
            end_date TEXT,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create discounts table");

    sqlx::query(
        "CREATE TABLE transactions (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            store_id TEXT NOT NULL,
            customer_id TEXT,
            subtotal TEXT NOT NULL,
            tax TEXT NOT NULL,
            discount_total TEXT NOT NULL DEFAULT '0',
            total TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            created_at TEXT NOT NULL,
            finalized_at TEXT,
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create transactions table");

    sqlx::query(
        "CREATE TABLE transaction_line_items (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL,
            line_number INTEGER NOT NULL,
            product_id TEXT NOT NULL,
            quantity TEXT NOT NULL,
            unit_price TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (transaction_id) REFERENCES transactions(id)
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create transaction_line_items table");

    sqlx::query(
        "CREATE TABLE tax_rules (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            store_id TEXT NOT NULL DEFAULT 'default',
            name TEXT NOT NULL,
            rate REAL NOT NULL,
            category TEXT,
            is_default INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create tax_rules table");

    // Insert test tenant
    sqlx::query("INSERT INTO tenants (id) VALUES ('test-tenant')")
        .execute(&pool)
        .await
        .expect("Failed to insert test tenant");

    pool
}

// ============================================================================
// DISCOUNT TYPE TESTS
// ============================================================================

#[tokio::test]
async fn test_percentage_discount_calculation() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create 15% discount
    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE15",
            "15% Off",
            DiscountType::Percent,
            dec!(15.0),
            Some("Save 15% on your purchase"),
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(200.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].code, "SAVE15");
    assert_eq!(calculations[0].discount_type, DiscountType::Percent);
    assert_eq!(calculations[0].discount_value, dec!(15.0));
    assert_eq!(calculations[0].discount_amount, dec!(30.0)); // 15% of 200
    assert_eq!(calculations[0].applies_to, "transaction");
}

#[tokio::test]
async fn test_fixed_discount_calculation() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create $10 fixed discount
    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE10",
            "$10 Off",
            DiscountType::Fixed,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(75.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].code, "SAVE10");
    assert_eq!(calculations[0].discount_type, DiscountType::Fixed);
    assert_eq!(calculations[0].discount_value, dec!(10.0));
    assert_eq!(calculations[0].discount_amount, dec!(10.0));
    assert_eq!(calculations[0].applies_to, "line_item");
}

#[tokio::test]
async fn test_fixed_cart_discount_calculation() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create $25 fixed cart discount
    service
        .create_discount(
            "test-tenant",
            "default",
            "CART25",
            "$25 Off Cart",
            DiscountType::FixedCart,
            dec!(25.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(150.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].code, "CART25");
    assert_eq!(calculations[0].discount_type, DiscountType::FixedCart);
    assert_eq!(calculations[0].discount_value, dec!(25.0));
    assert_eq!(calculations[0].discount_amount, dec!(25.0));
    assert_eq!(calculations[0].applies_to, "transaction");
}

// ============================================================================
// DISCOUNT LIMIT TESTS
// ============================================================================

#[tokio::test]
async fn test_min_purchase_amount_not_met() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create discount with $100 minimum purchase
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, min_purchase_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'BIG20', '20% Off $100+', 'percent', 20.0, 100.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(75.00); // Below minimum

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    // Discount should not be applied
    assert_eq!(calculations.len(), 0);
}

#[tokio::test]
async fn test_min_purchase_amount_exactly_met() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create discount with $100 minimum purchase
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, min_purchase_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'BIG20', '20% Off $100+', 'percent', 20.0, 100.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00); // Exactly at minimum

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(20.0)); // 20% of 100
}

#[tokio::test]
async fn test_min_purchase_amount_exceeded() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create discount with $100 minimum purchase
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, min_purchase_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'BIG20', '20% Off $100+', 'percent', 20.0, 100.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(250.00); // Well above minimum

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(50.0)); // 20% of 250
}

#[tokio::test]
async fn test_max_discount_amount_not_reached() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create 50% discount with $30 max
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, max_discount_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'HALF', '50% Off (Max $30)', 'percent', 50.0, 30.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(40.00); // 50% would be $20, under max

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(20.0)); // Not capped
}

#[tokio::test]
async fn test_max_discount_amount_capped() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create 50% discount with $30 max
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, max_discount_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'HALF', '50% Off (Max $30)', 'percent', 50.0, 30.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00); // 50% would be $50, but capped at $30

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(30.0)); // Capped at max
}

#[tokio::test]
async fn test_min_and_max_both_applied() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create 25% discount with $50 min and $20 max
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, min_purchase_amount, max_discount_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'SAVE25', '25% Off', 'percent', 25.0, 50.0, 20.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    // Test below minimum
    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(40.00);
    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");
    assert_eq!(calculations.len(), 0); // Not applied

    // Test at minimum, under max
    transaction.subtotal = dec!(60.00); // 25% = $15, under $20 max
    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");
    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(15.0));

    // Test above minimum, capped by max
    transaction.subtotal = dec!(200.00); // 25% = $50, capped at $20
    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");
    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(20.0)); // Capped
}

// ============================================================================
// MULTIPLE DISCOUNTS TESTS
// ============================================================================

#[tokio::test]
async fn test_multiple_percentage_discounts() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create two percentage discounts
    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE10",
            "10% Off",
            DiscountType::Percent,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount 1");

    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE5",
            "5% Off",
            DiscountType::Percent,
            dec!(5.0),
            None,
        )
        .await
        .expect("Failed to create discount 2");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 2);
    
    // Total discount should be 15% of 100 = $15
    let total_discount: Decimal = calculations.iter().map(|c| c.discount_amount).sum();
    assert_eq!(total_discount, dec!(15.0));
}

#[tokio::test]
async fn test_multiple_fixed_discounts() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create two fixed discounts
    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE10",
            "$10 Off",
            DiscountType::FixedCart,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount 1");

    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE5",
            "$5 Off",
            DiscountType::FixedCart,
            dec!(5.0),
            None,
        )
        .await
        .expect("Failed to create discount 2");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 2);
    
    // Total discount should be $15
    let total_discount: Decimal = calculations.iter().map(|c| c.discount_amount).sum();
    assert_eq!(total_discount, dec!(15.0));
}

#[tokio::test]
async fn test_mixed_discount_types() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create percentage, fixed, and fixed_cart discounts
    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE10PCT",
            "10% Off",
            DiscountType::Percent,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount 1");

    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE5",
            "$5 Off",
            DiscountType::FixedCart,
            dec!(5.0),
            None,
        )
        .await
        .expect("Failed to create discount 2");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 2);
    
    // 10% of 100 = $10, plus $5 fixed = $15 total
    let total_discount: Decimal = calculations.iter().map(|c| c.discount_amount).sum();
    assert_eq!(total_discount, dec!(15.0));
}

#[tokio::test]
async fn test_discount_precedence_by_creation_order() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create discounts in specific order
    service
        .create_discount(
            "test-tenant",
            "default",
            "FIRST",
            "First Discount",
            DiscountType::Percent,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount 1");

    // Small delay to ensure different timestamps
    tokio::time::sleep(tokio::time::Duration::from_millis(10)).await;

    service
        .create_discount(
            "test-tenant",
            "default",
            "SECOND",
            "Second Discount",
            DiscountType::Percent,
            dec!(5.0),
            None,
        )
        .await
        .expect("Failed to create discount 2");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 2);
    // Verify order matches creation order
    assert_eq!(calculations[0].code, "FIRST");
    assert_eq!(calculations[1].code, "SECOND");
}

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

#[tokio::test]
async fn test_discount_on_zero_subtotal() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE10",
            "10% Off",
            DiscountType::Percent,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(0.0);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(0.0));
}

#[tokio::test]
async fn test_discount_on_negative_subtotal_error() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(-50.0);

    let result = service
        .calculate_discounts("test-tenant", &transaction)
        .await;

    assert!(result.is_err());
    match result {
        Err(DiscountServiceError::ValidationError(msg)) => {
            assert!(msg.contains("negative"));
        }
        _ => panic!("Expected ValidationError for negative subtotal"),
    }
}

#[tokio::test]
async fn test_fixed_discount_exceeds_subtotal() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create $50 discount
    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE50",
            "$50 Off",
            DiscountType::FixedCart,
            dec!(50.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(30.00); // Less than discount amount

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    // Discount should be capped at subtotal
    assert_eq!(calculations[0].discount_amount, dec!(30.0));
}

#[tokio::test]
async fn test_percentage_discount_exceeds_subtotal() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create 150% discount (unrealistic but tests boundary)
    service
        .create_discount(
            "test-tenant",
            "default",
            "CRAZY150",
            "150% Off",
            DiscountType::Percent,
            dec!(150.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    // Discount should be capped at subtotal
    assert_eq!(calculations[0].discount_amount, dec!(100.0));
}

#[tokio::test]
async fn test_very_small_amounts() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE10",
            "10% Off",
            DiscountType::Percent,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(0.01); // One cent

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    // 10% of $0.01 = $0.001, should round appropriately
    assert!(calculations[0].discount_amount <= dec!(0.01));
}

#[tokio::test]
async fn test_very_large_amounts() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE5",
            "5% Off",
            DiscountType::Percent,
            dec!(5.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(999999.99); // Very large amount

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    // 5% of 999999.99 = 49999.9995
    assert_eq!(calculations[0].discount_amount, dec!(49999.9995));
}

#[tokio::test]
async fn test_no_active_discounts() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    // Should return empty vector
    assert_eq!(calculations.len(), 0);
}

#[tokio::test]
async fn test_inactive_discount_not_applied() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create discount
    let id = service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE10",
            "10% Off",
            DiscountType::Percent,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    // Deactivate it
    service
        .delete_discount(&id)
        .await
        .expect("Failed to delete discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    // Inactive discount should not be applied
    assert_eq!(calculations.len(), 0);
}

// ============================================================================
// TRANSACTION SERVICE INTEGRATION TESTS
// ============================================================================

#[tokio::test]
async fn test_transaction_service_applies_discounts() {
    let pool = create_test_pool().await;
    let discount_service = DiscountService::new(pool.clone());
    let transaction_service = TransactionService::new(pool.clone());

    // Create discount
    discount_service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE10",
            "10% Off",
            DiscountType::Percent,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    // Create transaction with line items
    let mut transaction = Transaction::new();
    transaction
        .add_item(LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(25.00)))
        .unwrap();
    transaction
        .add_item(LineItem::new("PROD-002".to_string(), dec!(1.0), dec!(50.00)))
        .unwrap();

    let result = transaction_service
        .calculate_totals("test-tenant", transaction)
        .await
        .expect("Failed to calculate totals");

    assert_eq!(result.subtotal, dec!(100.00)); // 50 + 50
    assert_eq!(result.discount_total, dec!(10.00)); // 10% of 100
    assert_eq!(result.total, dec!(90.00)); // 100 - 10
}

#[tokio::test]
async fn test_transaction_service_multiple_discounts() {
    let pool = create_test_pool().await;
    let discount_service = DiscountService::new(pool.clone());
    let transaction_service = TransactionService::new(pool.clone());

    // Create multiple discounts
    discount_service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE10",
            "10% Off",
            DiscountType::Percent,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount 1");

    discount_service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE5",
            "$5 Off",
            DiscountType::FixedCart,
            dec!(5.0),
            None,
        )
        .await
        .expect("Failed to create discount 2");

    let mut transaction = Transaction::new();
    transaction
        .add_item(LineItem::new("PROD-001".to_string(), dec!(1.0), dec!(100.00)))
        .unwrap();

    let result = transaction_service
        .calculate_totals("test-tenant", transaction)
        .await
        .expect("Failed to calculate totals");

    assert_eq!(result.subtotal, dec!(100.00));
    assert_eq!(result.discount_total, dec!(15.00)); // 10% + $5
    assert_eq!(result.total, dec!(85.00)); // 100 - 15
}

#[tokio::test]
async fn test_transaction_service_discount_with_min_purchase() {
    let pool = create_test_pool().await;
    let transaction_service = TransactionService::new(pool.clone());

    // Create discount with minimum purchase
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, min_purchase_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'BIG20', '20% Off $50+', 'percent', 20.0, 50.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    // Test with amount below minimum
    let mut transaction = Transaction::new();
    transaction
        .add_item(LineItem::new("PROD-001".to_string(), dec!(1.0), dec!(30.00)))
        .unwrap();

    let result = transaction_service
        .calculate_totals("test-tenant", transaction)
        .await
        .expect("Failed to calculate totals");

    assert_eq!(result.subtotal, dec!(30.00));
    assert_eq!(result.discount_total, dec!(0.00)); // Not applied
    assert_eq!(result.total, dec!(30.00));

    // Test with amount above minimum
    let mut transaction = Transaction::new();
    transaction
        .add_item(LineItem::new("PROD-001".to_string(), dec!(1.0), dec!(100.00)))
        .unwrap();

    let result = transaction_service
        .calculate_totals("test-tenant", transaction)
        .await
        .expect("Failed to calculate totals");

    assert_eq!(result.subtotal, dec!(100.00));
    assert_eq!(result.discount_total, dec!(20.00)); // 20% applied
    assert_eq!(result.total, dec!(80.00));
}

#[tokio::test]
async fn test_transaction_service_discount_capped_by_max() {
    let pool = create_test_pool().await;
    let transaction_service = TransactionService::new(pool.clone());

    // Create discount with max amount
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, max_discount_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'HALF', '50% Off (Max $25)', 'percent', 50.0, 25.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    let mut transaction = Transaction::new();
    transaction
        .add_item(LineItem::new("PROD-001".to_string(), dec!(1.0), dec!(100.00)))
        .unwrap();

    let result = transaction_service
        .calculate_totals("test-tenant", transaction)
        .await
        .expect("Failed to calculate totals");

    assert_eq!(result.subtotal, dec!(100.00));
    assert_eq!(result.discount_total, dec!(25.00)); // Capped at max
    assert_eq!(result.total, dec!(75.00));
}

// ============================================================================
// ELIGIBILITY VALIDATION TESTS
// ============================================================================

#[tokio::test]
async fn test_validate_discount_valid() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE10",
            "10% Off",
            DiscountType::Percent,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    let valid = service
        .validate_discount("test-tenant", "SAVE10", dec!(50.00))
        .await
        .expect("Failed to validate");

    assert!(valid);
}

#[tokio::test]
async fn test_validate_discount_below_minimum() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create discount with $100 minimum
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, min_purchase_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'BIG20', '20% Off $100+', 'percent', 20.0, 100.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    let valid = service
        .validate_discount("test-tenant", "BIG20", dec!(75.00))
        .await
        .expect("Failed to validate");

    assert!(!valid);
}

#[tokio::test]
async fn test_validate_discount_nonexistent() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    let valid = service
        .validate_discount("test-tenant", "NONEXISTENT", dec!(100.00))
        .await
        .expect("Failed to validate");

    assert!(!valid);
}

// ============================================================================
// DECIMAL PRECISION TESTS
// ============================================================================

#[tokio::test]
async fn test_decimal_precision_percentage() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create 7.5% discount
    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE7.5",
            "7.5% Off",
            DiscountType::Percent,
            dec!(7.5),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(133.33);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    // 7.5% of 133.33 = 9.99975
    assert_eq!(calculations[0].discount_amount, dec!(9.99975));
}

#[tokio::test]
async fn test_decimal_precision_fixed() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create $12.99 discount
    service
        .create_discount(
            "test-tenant",
            "default",
            "SAVE12.99",
            "$12.99 Off",
            DiscountType::FixedCart,
            dec!(12.99),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(12.99));
}

// ============================================================================
// BOUNDARY CONDITION TESTS
// ============================================================================

#[tokio::test]
async fn test_100_percent_discount() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    service
        .create_discount(
            "test-tenant",
            "default",
            "FREE",
            "100% Off",
            DiscountType::Percent,
            dec!(100.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(50.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(50.0)); // Full amount
}

#[tokio::test]
async fn test_zero_percent_discount() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    service
        .create_discount(
            "test-tenant",
            "default",
            "ZERO",
            "0% Off",
            DiscountType::Percent,
            dec!(0.0),
            None,
        )
        .await
        .expect("Failed to create discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(0.0));
}

#[tokio::test]
async fn test_min_purchase_exactly_zero() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create discount with $0 minimum (always applies)
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, min_purchase_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'ALWAYS', '10% Off', 'percent', 10.0, 0.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(0.01);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1); // Should apply even to tiny amounts
}

#[tokio::test]
async fn test_max_discount_exactly_zero() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create discount with $0 max (effectively no discount)
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, max_discount_amount)
         VALUES ('test-id', 'test-tenant', 'default', 'NONE', '50% Off (Max $0)', 'percent', 50.0, 0.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount");

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 1);
    assert_eq!(calculations[0].discount_amount, dec!(0.0)); // Capped at $0
}

// ============================================================================
// STRESS TESTS
// ============================================================================

#[tokio::test]
async fn test_many_discounts() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create 10 small discounts
    for i in 1..=10 {
        service
            .create_discount(
                "test-tenant",
                "default",
                &format!("SAVE{}", i),
                &format!("{}% Off", i),
                DiscountType::Percent,
                Decimal::from(i),
                None,
            )
            .await
            .expect("Failed to create discount");
    }

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    assert_eq!(calculations.len(), 10);
    
    // Total discount should be 1% + 2% + ... + 10% = 55% of 100 = $55
    let total_discount: Decimal = calculations.iter().map(|c| c.discount_amount).sum();
    assert_eq!(total_discount, dec!(55.0));
}

#[tokio::test]
async fn test_discount_calculation_performance() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create 5 discounts
    for i in 1..=5 {
        service
            .create_discount(
                "test-tenant",
                "default",
                &format!("SAVE{}", i * 5),
                &format!("{}% Off", i * 5),
                DiscountType::Percent,
                Decimal::from(i * 5),
                None,
            )
            .await
            .expect("Failed to create discount");
    }

    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(1000.00);

    let start = std::time::Instant::now();
    
    // Run calculation 100 times
    for _ in 0..100 {
        let _ = service
            .calculate_discounts("test-tenant", &transaction)
            .await
            .expect("Failed to calculate discounts");
    }
    
    let duration = start.elapsed();
    
    // Should complete 100 calculations in under 1 second
    assert!(duration.as_secs() < 1, "Discount calculation too slow: {:?}", duration);
}

// ============================================================================
// SUMMARY TEST - Comprehensive Scenario
// ============================================================================

#[tokio::test]
async fn test_comprehensive_discount_scenario() {
    let pool = create_test_pool().await;
    let service = DiscountService::new(pool.clone());

    // Create various discounts with different rules
    
    // 1. Basic percentage discount
    service
        .create_discount(
            "test-tenant",
            "default",
            "BASIC10",
            "10% Off",
            DiscountType::Percent,
            dec!(10.0),
            None,
        )
        .await
        .expect("Failed to create discount 1");

    // 2. Fixed cart discount with minimum
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, min_purchase_amount)
         VALUES ('disc2', 'test-tenant', 'default', 'CART5', '$5 Off $50+', 'fixed_cart', 5.0, 50.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount 2");

    // 3. Percentage discount with max cap
    sqlx::query(
        "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, max_discount_amount)
         VALUES ('disc3', 'test-tenant', 'default', 'BIG25', '25% Off (Max $15)', 'percent', 25.0, 15.0)"
    )
    .execute(&pool)
    .await
    .expect("Failed to insert discount 3");

    // Test with $100 subtotal
    let mut transaction = Transaction::new();
    transaction.subtotal = dec!(100.00);

    let calculations = service
        .calculate_discounts("test-tenant", &transaction)
        .await
        .expect("Failed to calculate discounts");

    // Should have 3 discounts applied
    assert_eq!(calculations.len(), 3);

    // Calculate total discount
    let total_discount: Decimal = calculations.iter().map(|c| c.discount_amount).sum();
    
    // Expected: 10% of 100 = $10, $5 fixed, 25% capped at $15 = $30 total
    assert_eq!(total_discount, dec!(30.0));

    // Verify each discount
    let basic10 = calculations.iter().find(|c| c.code == "BASIC10").unwrap();
    assert_eq!(basic10.discount_amount, dec!(10.0));

    let cart5 = calculations.iter().find(|c| c.code == "CART5").unwrap();
    assert_eq!(cart5.discount_amount, dec!(5.0));

    let big25 = calculations.iter().find(|c| c.code == "BIG25").unwrap();
    assert_eq!(big25.discount_amount, dec!(15.0)); // Capped at max
}
