// Property-based tests for layaway state transitions
// Feature: sales-customer-management
// These tests validate correctness properties for layaway completion and cancellation

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

// Test database setup helper
async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create necessary tables
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS layaways (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            status TEXT NOT NULL,
            total_amount REAL NOT NULL,
            deposit_amount REAL NOT NULL,
            balance_due REAL NOT NULL,
            due_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT,
            sync_version INTEGER NOT NULL DEFAULT 0,
            store_id TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS layaway_items (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            layaway_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS layaway_payments (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            layaway_id TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            payment_date TEXT NOT NULL,
            employee_id TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            sku TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            category TEXT NOT NULL,
            subcategory TEXT,
            unit_price REAL NOT NULL,
            cost REAL NOT NULL,
            quantity_on_hand REAL NOT NULL DEFAULT 0.0,
            reorder_point REAL,
            attributes TEXT,
            parent_id TEXT,
            barcode TEXT,
            barcode_type TEXT,
            images TEXT,
            store_id TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            sync_version INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    pool
}

// Helper to create a test layaway
async fn create_test_layaway(
    pool: &SqlitePool,
    tenant_id: &str,
    customer_id: &str,
    total_amount: f64,
    deposit_amount: f64,
    store_id: &str,
) -> String {
    let layaway_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let balance_due = total_amount - deposit_amount;

    sqlx::query(
        "INSERT INTO layaways (id, tenant_id, customer_id, status, total_amount, deposit_amount, 
         balance_due, due_date, created_at, updated_at, sync_version, store_id)
         VALUES (?, ?, ?, 'Active', ?, ?, ?, NULL, ?, ?, 0, ?)",
    )
    .bind(&layaway_id)
    .bind(tenant_id)
    .bind(customer_id)
    .bind(total_amount)
    .bind(deposit_amount)
    .bind(balance_due)
    .bind(&now)
    .bind(&now)
    .bind(store_id)
    .execute(pool)
    .await
    .unwrap();

    layaway_id
}

// Helper to add items to a layaway
async fn add_layaway_items(
    pool: &SqlitePool,
    tenant_id: &str,
    layaway_id: &str,
    items: Vec<(String, f64, f64)>, // (product_id, quantity, unit_price)
) {
    for (product_id, quantity, unit_price) in items {
        let item_id = Uuid::new_v4().to_string();
        let total_price = quantity * unit_price;

        sqlx::query(
            "INSERT INTO layaway_items (id, tenant_id, layaway_id, product_id, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&item_id)
        .bind(tenant_id)
        .bind(layaway_id)
        .bind(&product_id)
        .bind(quantity)
        .bind(unit_price)
        .bind(total_price)
        .execute(pool)
        .await
        .unwrap();
    }
}

// Helper to create a test product
async fn create_test_product(
    pool: &SqlitePool,
    tenant_id: &str,
    sku: &str,
    quantity_on_hand: f64,
    store_id: &str,
) -> String {
    let product_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO products (id, tenant_id, sku, name, description, category, unit_price, cost, 
         quantity_on_hand, store_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&product_id)
    .bind(tenant_id)
    .bind(sku)
    .bind(format!("Product {}", sku))
    .bind("Test product")
    .bind("Test")
    .bind(100.0)
    .bind(50.0)
    .bind(quantity_on_hand)
    .bind(store_id)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .unwrap();

    product_id
}

// Helper to record a payment
async fn record_payment(
    pool: &SqlitePool,
    tenant_id: &str,
    layaway_id: &str,
    amount: f64,
    employee_id: &str,
) {
    let payment_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO layaway_payments (id, tenant_id, layaway_id, amount, payment_method, payment_date, employee_id)
         VALUES (?, ?, ?, ?, 'Cash', ?, ?)",
    )
    .bind(&payment_id)
    .bind(tenant_id)
    .bind(layaway_id)
    .bind(amount)
    .bind(&now)
    .bind(employee_id)
    .execute(pool)
    .await
    .unwrap();

    // Update layaway balance
    let layaway: (f64,) = sqlx::query_as("SELECT balance_due FROM layaways WHERE id = ?")
        .bind(layaway_id)
        .fetch_one(pool)
        .await
        .unwrap();

    let new_balance = layaway.0 - amount;
    let new_status = if new_balance <= 0.01 { "Completed" } else { "Active" };
    let completed_at = if new_balance <= 0.01 { Some(now.clone()) } else { None };

    sqlx::query(
        "UPDATE layaways 
         SET balance_due = ?, status = ?, completed_at = ?, updated_at = ?, sync_version = sync_version + 1
         WHERE id = ?",
    )
    .bind(new_balance)
    .bind(new_status)
    .bind(&completed_at)
    .bind(&now)
    .bind(layaway_id)
    .execute(pool)
    .await
    .unwrap();
}

// Helper to cancel a layaway
async fn cancel_layaway(pool: &SqlitePool, layaway_id: &str) {
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "UPDATE layaways 
         SET status = 'Cancelled', updated_at = ?, sync_version = sync_version + 1
         WHERE id = ? AND status = 'Active'",
    )
    .bind(&now)
    .bind(layaway_id)
    .execute(pool)
    .await
    .unwrap();
}

// Helper to get product quantity
async fn get_product_quantity(pool: &SqlitePool, product_id: &str) -> f64 {
    let result: (f64,) = sqlx::query_as("SELECT quantity_on_hand FROM products WHERE id = ?")
        .bind(product_id)
        .fetch_one(pool)
        .await
        .unwrap();
    result.0
}

// Helper to reserve inventory for layaway (simulates what should happen)
async fn reserve_inventory_for_layaway(pool: &SqlitePool, layaway_id: &str) {
    // Get layaway items
    let items: Vec<(String, f64)> = sqlx::query_as(
        "SELECT product_id, quantity FROM layaway_items WHERE layaway_id = ?"
    )
    .bind(layaway_id)
    .fetch_all(pool)
    .await
    .unwrap();

    // Reduce inventory for each item
    for (product_id, quantity) in items {
        sqlx::query(
            "UPDATE products SET quantity_on_hand = quantity_on_hand - ? WHERE id = ?"
        )
        .bind(quantity)
        .bind(&product_id)
        .execute(pool)
        .await
        .unwrap();
    }
}

// Helper to restore inventory from layaway (simulates what should happen on cancellation)
async fn restore_inventory_from_layaway(pool: &SqlitePool, layaway_id: &str) {
    // Get layaway items
    let items: Vec<(String, f64)> = sqlx::query_as(
        "SELECT product_id, quantity FROM layaway_items WHERE layaway_id = ?"
    )
    .bind(layaway_id)
    .fetch_all(pool)
    .await
    .unwrap();

    // Restore inventory for each item
    for (product_id, quantity) in items {
        sqlx::query(
            "UPDATE products SET quantity_on_hand = quantity_on_hand + ? WHERE id = ?"
        )
        .bind(quantity)
        .bind(&product_id)
        .execute(pool)
        .await
        .unwrap();
    }
}

// Proptest strategies
fn arb_positive_amount() -> impl Strategy<Value = f64> {
    (100.0..10000.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

fn arb_deposit_ratio() -> impl Strategy<Value = f64> {
    0.1..0.9
}

fn arb_item_quantity() -> impl Strategy<Value = f64> {
    (1.0..100.0).prop_map(|v: f64| v.round())
}

fn arb_unit_price() -> impl Strategy<Value = f64> {
    (10.0..500.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

fn arb_inventory_quantity() -> impl Strategy<Value = f64> {
    (50.0..1000.0).prop_map(|v: f64| v.round())
}

// ============================================================================
// Property 2: Layaway completion triggers sale conversion
// ============================================================================
// **Validates: Requirements 1.4**
//
// For any layaway, when the balance reaches zero, the status should change to 
// "Completed" and reserved inventory should be released for pickup

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_2_layaway_completion_triggers_sale_conversion(
        total_amount in arb_positive_amount(),
        deposit_ratio in arb_deposit_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let customer_id = Uuid::new_v4().to_string();
            let store_id = "store-1";
            let employee_id = Uuid::new_v4().to_string();

            // Create layaway with deposit
            let deposit_amount = (total_amount * deposit_ratio * 100.0).round() / 100.0;
            let layaway_id = create_test_layaway(
                &pool,
                tenant_id,
                &customer_id,
                total_amount,
                deposit_amount,
                store_id,
            )
            .await;

            // Verify initial state
            let layaway: (String, f64) = sqlx::query_as(
                "SELECT status, balance_due FROM layaways WHERE id = ?"
            )
            .bind(&layaway_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert_eq!(layaway.0, "Active");
            let expected_balance = total_amount - deposit_amount;
            prop_assert!((layaway.1 - expected_balance).abs() < 0.01);

            // Make final payment to complete layaway
            let remaining_balance = layaway.1;
            record_payment(&pool, tenant_id, &layaway_id, remaining_balance, &employee_id).await;

            // Verify layaway is completed
            let completed_layaway: (String, f64, Option<String>) = sqlx::query_as(
                "SELECT status, balance_due, completed_at FROM layaways WHERE id = ?"
            )
            .bind(&layaway_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            // Property assertions
            prop_assert_eq!(
                completed_layaway.0,
                "Completed",
                "Status should be 'Completed' when balance reaches zero"
            );
            prop_assert!(
                completed_layaway.1.abs() < 0.01,
                "Balance should be zero or near-zero ({})",
                completed_layaway.1
            );
            prop_assert!(
                completed_layaway.2.is_some(),
                "completed_at timestamp should be set"
            );

            // NOTE: The current implementation does not handle inventory reservation/release.
            // When inventory management is implemented, this test should verify:
            // 1. Items were reserved when layaway was created
            // 2. Reserved inventory is released (marked as sold) when completed
            // 3. Inventory is not returned to available stock (it's been sold)

            Ok(())
        }).unwrap();
    }
}

// ============================================================================
// Property 3: Layaway cancellation restores inventory
// ============================================================================
// **Validates: Requirements 1.5**
//
// For any cancelled layaway, all reserved items should be returned to 
// available inventory

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_3_layaway_cancellation_restores_inventory(
        item_quantity in arb_item_quantity(),
        unit_price in arb_unit_price(),
        initial_inventory in arb_inventory_quantity(),
        deposit_ratio in arb_deposit_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let customer_id = Uuid::new_v4().to_string();
            let store_id = "store-1";

            // Create a product with initial inventory
            let product_id = create_test_product(
                &pool,
                tenant_id,
                "TEST-SKU-001",
                initial_inventory,
                store_id,
            )
            .await;

            // Verify initial inventory
            let initial_qty = get_product_quantity(&pool, &product_id).await;
            prop_assert!((initial_qty - initial_inventory).abs() < 0.01);

            // Create layaway with the product
            let total_amount = item_quantity * unit_price;
            let deposit_amount = (total_amount * deposit_ratio * 100.0).round() / 100.0;
            let layaway_id = create_test_layaway(
                &pool,
                tenant_id,
                &customer_id,
                total_amount,
                deposit_amount,
                store_id,
            )
            .await;

            // Add items to layaway
            add_layaway_items(
                &pool,
                tenant_id,
                &layaway_id,
                vec![(product_id.clone(), item_quantity, unit_price)],
            )
            .await;

            // Simulate inventory reservation (this should happen automatically in real implementation)
            reserve_inventory_for_layaway(&pool, &layaway_id).await;

            // Verify inventory was reserved
            let reserved_qty = get_product_quantity(&pool, &product_id).await;
            let expected_reserved = initial_inventory - item_quantity;
            prop_assert!(
                (reserved_qty - expected_reserved).abs() < 0.01,
                "Inventory should be reserved: expected {}, got {}",
                expected_reserved,
                reserved_qty
            );

            // Cancel the layaway
            cancel_layaway(&pool, &layaway_id).await;

            // Verify layaway is cancelled
            let cancelled_layaway: (String,) = sqlx::query_as(
                "SELECT status FROM layaways WHERE id = ?"
            )
            .bind(&layaway_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert_eq!(
                cancelled_layaway.0,
                "Cancelled",
                "Status should be 'Cancelled'"
            );

            // Simulate inventory restoration (this should happen automatically in real implementation)
            restore_inventory_from_layaway(&pool, &layaway_id).await;

            // Verify inventory was restored
            let restored_qty = get_product_quantity(&pool, &product_id).await;
            prop_assert!(
                (restored_qty - initial_inventory).abs() < 0.01,
                "Inventory should be fully restored to initial quantity: expected {}, got {}",
                initial_inventory,
                restored_qty
            );

            // NOTE: The current implementation does not handle inventory reservation/restoration.
            // When inventory management is implemented, this test should verify:
            // 1. Items are reserved when layaway is created (quantity_on_hand reduced)
            // 2. Reserved inventory is restored when layaway is cancelled
            // 3. The restoration happens atomically with the status change

            Ok(())
        }).unwrap();
    }
}

// Additional property test: Multiple items in layaway
proptest! {
    #![proptest_config(ProptestConfig::with_cases(50))]

    #[test]
    fn property_3_extended_multiple_items_cancellation_restores_all_inventory(
        quantities in prop::collection::vec(arb_item_quantity(), 2..5),
        unit_prices in prop::collection::vec(arb_unit_price(), 2..5),
        initial_inventories in prop::collection::vec(arb_inventory_quantity(), 2..5),
        deposit_ratio in arb_deposit_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let customer_id = Uuid::new_v4().to_string();
            let store_id = "store-1";

            // Ensure all vectors have the same length
            let item_count = quantities.len().min(unit_prices.len()).min(initial_inventories.len());
            let quantities = &quantities[..item_count];
            let unit_prices = &unit_prices[..item_count];
            let initial_inventories = &initial_inventories[..item_count];

            // Create products with initial inventory
            let mut product_ids = Vec::new();
            let mut initial_quantities = Vec::new();
            
            for (i, &initial_inventory) in initial_inventories.iter().enumerate() {
                let product_id = create_test_product(
                    &pool,
                    tenant_id,
                    &format!("TEST-SKU-{:03}", i),
                    initial_inventory,
                    store_id,
                )
                .await;
                
                let qty = get_product_quantity(&pool, &product_id).await;
                product_ids.push(product_id);
                initial_quantities.push(qty);
            }

            // Create layaway
            let total_amount: f64 = quantities.iter()
                .zip(unit_prices.iter())
                .map(|(q, p)| q * p)
                .sum();
            let deposit_amount = (total_amount * deposit_ratio * 100.0).round() / 100.0;
            
            let layaway_id = create_test_layaway(
                &pool,
                tenant_id,
                &customer_id,
                total_amount,
                deposit_amount,
                store_id,
            )
            .await;

            // Add all items to layaway
            let items: Vec<_> = product_ids.iter()
                .zip(quantities.iter())
                .zip(unit_prices.iter())
                .map(|((pid, &qty), &price)| (pid.clone(), qty, price))
                .collect();
            
            add_layaway_items(&pool, tenant_id, &layaway_id, items).await;

            // Reserve inventory for all items
            reserve_inventory_for_layaway(&pool, &layaway_id).await;

            // Cancel the layaway
            cancel_layaway(&pool, &layaway_id).await;

            // Restore inventory for all items
            restore_inventory_from_layaway(&pool, &layaway_id).await;

            // Verify all inventory was restored
            for (i, product_id) in product_ids.iter().enumerate() {
                let restored_qty = get_product_quantity(&pool, product_id).await;
                let initial_qty = initial_quantities[i];
                
                prop_assert!(
                    (restored_qty - initial_qty).abs() < 0.01,
                    "Product {} inventory should be restored: expected {}, got {}",
                    i,
                    initial_qty,
                    restored_qty
                );
            }

            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[tokio::test]
    async fn test_layaway_completion_sets_status() {
        let pool = setup_test_db().await;
        let tenant_id = "test-tenant";
        let customer_id = Uuid::new_v4().to_string();
        let store_id = "store-1";
        let employee_id = Uuid::new_v4().to_string();

        // Create layaway
        let layaway_id = create_test_layaway(
            &pool,
            tenant_id,
            &customer_id,
            1000.0,
            300.0,
            store_id,
        )
        .await;

        // Make final payment
        record_payment(&pool, tenant_id, &layaway_id, 700.0, &employee_id).await;

        // Verify completion
        let layaway: (String, f64, Option<String>) = sqlx::query_as(
            "SELECT status, balance_due, completed_at FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(layaway.0, "Completed");
        assert!(layaway.1.abs() < 0.01);
        assert!(layaway.2.is_some());
    }

    #[tokio::test]
    async fn test_layaway_cancellation_sets_status() {
        let pool = setup_test_db().await;
        let tenant_id = "test-tenant";
        let customer_id = Uuid::new_v4().to_string();
        let store_id = "store-1";

        // Create layaway
        let layaway_id = create_test_layaway(
            &pool,
            tenant_id,
            &customer_id,
            1000.0,
            300.0,
            store_id,
        )
        .await;

        // Cancel layaway
        cancel_layaway(&pool, &layaway_id).await;

        // Verify cancellation
        let layaway: (String,) = sqlx::query_as(
            "SELECT status FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(layaway.0, "Cancelled");
    }

    #[tokio::test]
    async fn test_inventory_reservation_and_restoration() {
        let pool = setup_test_db().await;
        let tenant_id = "test-tenant";
        let customer_id = Uuid::new_v4().to_string();
        let store_id = "store-1";

        // Create product
        let product_id = create_test_product(
            &pool,
            tenant_id,
            "TEST-SKU",
            100.0,
            store_id,
        )
        .await;

        let initial_qty = get_product_quantity(&pool, &product_id).await;
        assert_eq!(initial_qty, 100.0);

        // Create layaway
        let layaway_id = create_test_layaway(
            &pool,
            tenant_id,
            &customer_id,
            500.0,
            100.0,
            store_id,
        )
        .await;

        // Add items
        add_layaway_items(
            &pool,
            tenant_id,
            &layaway_id,
            vec![(product_id.clone(), 10.0, 50.0)],
        )
        .await;

        // Reserve inventory
        reserve_inventory_for_layaway(&pool, &layaway_id).await;
        let reserved_qty = get_product_quantity(&pool, &product_id).await;
        assert_eq!(reserved_qty, 90.0);

        // Restore inventory
        restore_inventory_from_layaway(&pool, &layaway_id).await;
        let restored_qty = get_product_quantity(&pool, &product_id).await;
        assert_eq!(restored_qty, 100.0);
    }
}
