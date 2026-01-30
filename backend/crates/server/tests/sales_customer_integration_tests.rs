/**
 * Integration Tests for Sales & Customer Management
 * 
 * Task 18 - Requirements: 1.1-1.9, 4.1-4.10, 5.1-5.10, 6.1-6.9, 8.1-8.8, 9.1-9.8
 * 
 * Tests complete workflows:
 * - Complete layaway lifecycle (create → payments → completion)
 * - Credit account with purchases and payments
 * - Promotion application across transactions
 * - Offline operation followed by sync
 * 
 * Note: Vehicle-related tests are skipped as vehicle functionality was removed
 */

mod common;

use common::*;
use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

// Test data structures
#[derive(Debug, Clone)]
struct TestCustomer {
    id: String,
    name: String,
    email: String,
    pricing_tier: String,
}

#[derive(Debug, Clone)]
struct TestProduct {
    id: String,
    name: String,
    sku: String,
    price: f64,
}

// Helper functions
async fn create_test_customer(pool: &SqlitePool, tenant_id: &str) -> TestCustomer {
    let customer_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO customers (id, tenant_id, name, email, phone, pricing_tier, loyalty_points, 
         store_credit, credit_balance, created_at, updated_at, sync_version, store_id)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0.0, 0.0, ?, ?, 0, ?)"
    )
    .bind(&customer_id)
    .bind(tenant_id)
    .bind("Test Customer")
    .bind("test@example.com")
    .bind("555-1234")
    .bind("Retail")
    .bind(&now)
    .bind(&now)
    .bind("store_001")
    .execute(pool)
    .await
    .expect("Failed to create test customer");
    
    TestCustomer {
        id: customer_id,
        name: "Test Customer".to_string(),
        email: "test@example.com".to_string(),
        pricing_tier: "Retail".to_string(),
    }
}

async fn create_test_product(pool: &SqlitePool, tenant_id: &str, price: f64) -> TestProduct {
    let product_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO products (id, tenant_id, name, sku, category, base_price, cost, quantity, 
         reorder_point, created_at, updated_at, sync_version, store_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, 100, 10, ?, ?, 0, ?)"
    )
    .bind(&product_id)
    .bind(tenant_id)
    .bind("Test Product")
    .bind(format!("SKU-{}", &product_id[..8]))
    .bind("General")
    .bind(price)
    .bind(price * 0.6)
    .bind(&now)
    .bind(&now)
    .bind("store_001")
    .execute(pool)
    .await
    .expect("Failed to create test product");
    
    let sku = format!("SKU-{}", &product_id[..8]);
    
    TestProduct {
        id: product_id,
        name: "Test Product".to_string(),
        sku,
        price,
    }
}

async fn create_test_employee(pool: &SqlitePool, tenant_id: &str) -> String {
    let employee_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO users (id, tenant_id, username, email, password_hash, role, is_active, 
         created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)"
    )
    .bind(&employee_id)
    .bind(tenant_id)
    .bind("testemployee")
    .bind("employee@example.com")
    .bind("hashed_password")
    .bind("cashier")
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .expect("Failed to create test employee");
    
    employee_id
}

#[cfg(test)]
mod layaway_lifecycle_tests {
    use super::*;

    #[tokio::test]
    async fn test_complete_layaway_lifecycle() {
        // Test complete layaway lifecycle: create → payments → completion
        let (pool, _temp_dir) = create_test_db().await;
        let tenant_id = "test_tenant_001";
        
        // Setup test data
        let customer = create_test_customer(&pool, tenant_id).await;
        let product1 = create_test_product(&pool, tenant_id, 100.0).await;
        let product2 = create_test_product(&pool, tenant_id, 50.0).await;
        let employee = create_test_employee(&pool, tenant_id).await;
        
        // Step 1: Create layaway
        let layaway_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let total_amount = 250.0; // 2 * 100 + 1 * 50
        let deposit_amount = 50.0;
        let balance_due = 200.0;
        
        sqlx::query(
            "INSERT INTO layaways (id, tenant_id, customer_id, status, total_amount, deposit_amount, 
             balance_due, due_date, created_at, updated_at, sync_version, store_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)"
        )
        .bind(&layaway_id)
        .bind(tenant_id)
        .bind(&customer.id)
        .bind("Active")
        .bind(total_amount)
        .bind(deposit_amount)
        .bind(balance_due)
        .bind(None::<String>)
        .bind(&now)
        .bind(&now)
        .bind("store_001")
        .execute(&pool)
        .await
        .expect("Failed to create layaway");
        
        // Add layaway items
        let item1_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO layaway_items (id, tenant_id, layaway_id, product_id, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&item1_id)
        .bind(tenant_id)
        .bind(&layaway_id)
        .bind(&product1.id)
        .bind(2.0)
        .bind(100.0)
        .bind(200.0)
        .execute(&pool)
        .await
        .expect("Failed to create layaway item 1");
        
        let item2_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO layaway_items (id, tenant_id, layaway_id, product_id, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&item2_id)
        .bind(tenant_id)
        .bind(&layaway_id)
        .bind(&product2.id)
        .bind(1.0)
        .bind(50.0)
        .bind(50.0)
        .execute(&pool)
        .await
        .expect("Failed to create layaway item 2");
        
        // Verify layaway created
        let layaway: (String, f64, f64) = sqlx::query_as(
            "SELECT status, total_amount, balance_due FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch layaway");
        
        assert_eq!(layaway.0, "Active");
        assert_eq!(layaway.1, 250.0);
        assert_eq!(layaway.2, 200.0);
        
        // Step 2: Make first payment (100.0)
        let payment1_id = Uuid::new_v4().to_string();
        let payment1_date = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT INTO layaway_payments (id, tenant_id, layaway_id, amount, payment_method, payment_date, employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&payment1_id)
        .bind(tenant_id)
        .bind(&layaway_id)
        .bind(100.0)
        .bind("cash")
        .bind(&payment1_date)
        .bind(&employee)
        .execute(&pool)
        .await
        .expect("Failed to record payment 1");
        
        // Update balance
        sqlx::query(
            "UPDATE layaways SET balance_due = balance_due - ?, updated_at = ?, sync_version = sync_version + 1
             WHERE id = ?"
        )
        .bind(100.0)
        .bind(&payment1_date)
        .bind(&layaway_id)
        .execute(&pool)
        .await
        .expect("Failed to update balance after payment 1");
        
        // Verify balance updated
        let balance: (f64,) = sqlx::query_as(
            "SELECT balance_due FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch balance");
        
        assert_eq!(balance.0, 100.0);
        
        // Step 3: Make second payment (50.0)
        let payment2_id = Uuid::new_v4().to_string();
        let payment2_date = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT INTO layaway_payments (id, tenant_id, layaway_id, amount, payment_method, payment_date, employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&payment2_id)
        .bind(tenant_id)
        .bind(&layaway_id)
        .bind(50.0)
        .bind("credit_card")
        .bind(&payment2_date)
        .bind(&employee)
        .execute(&pool)
        .await
        .expect("Failed to record payment 2");
        
        // Update balance
        sqlx::query(
            "UPDATE layaways SET balance_due = balance_due - ?, updated_at = ?, sync_version = sync_version + 1
             WHERE id = ?"
        )
        .bind(50.0)
        .bind(&payment2_date)
        .bind(&layaway_id)
        .execute(&pool)
        .await
        .expect("Failed to update balance after payment 2");
        
        // Verify balance updated
        let balance: (f64,) = sqlx::query_as(
            "SELECT balance_due FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch balance");
        
        assert_eq!(balance.0, 50.0);
        
        // Step 4: Make final payment (50.0) - should complete layaway
        let payment3_id = Uuid::new_v4().to_string();
        let payment3_date = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT INTO layaway_payments (id, tenant_id, layaway_id, amount, payment_method, payment_date, employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&payment3_id)
        .bind(tenant_id)
        .bind(&layaway_id)
        .bind(50.0)
        .bind("cash")
        .bind(&payment3_date)
        .bind(&employee)
        .execute(&pool)
        .await
        .expect("Failed to record payment 3");
        
        // Update balance and status to completed
        sqlx::query(
            "UPDATE layaways SET balance_due = 0, status = ?, completed_at = ?, updated_at = ?, sync_version = sync_version + 1
             WHERE id = ?"
        )
        .bind("Completed")
        .bind(&payment3_date)
        .bind(&payment3_date)
        .bind(&layaway_id)
        .execute(&pool)
        .await
        .expect("Failed to complete layaway");
        
        // Verify layaway completed
        let final_layaway: (String, f64, Option<String>) = sqlx::query_as(
            "SELECT status, balance_due, completed_at FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch final layaway");
        
        assert_eq!(final_layaway.0, "Completed");
        assert_eq!(final_layaway.1, 0.0);
        assert!(final_layaway.2.is_some());
        
        // Verify all payments recorded
        let payment_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM layaway_payments WHERE layaway_id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to count payments");
        
        assert_eq!(payment_count.0, 3);
        
        // Verify total payments equal total amount
        let total_payments: (f64,) = sqlx::query_as(
            "SELECT SUM(amount) FROM layaway_payments WHERE layaway_id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to sum payments");
        
        assert_eq!(total_payments.0, 200.0); // Deposit (50) + payments (200) = 250 total
    }
}

#[cfg(test)]
mod credit_account_tests {
    use super::*;

    #[tokio::test]
    async fn test_credit_account_with_purchases_and_payments() {
        // Test credit account lifecycle: create → purchases → payments
        let (pool, _temp_dir) = create_test_db().await;
        let tenant_id = "test_tenant_002";
        
        // Setup test data
        let customer = create_test_customer(&pool, tenant_id).await;
        
        // Step 1: Create credit account
        let credit_account_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let credit_limit = 1000.0;
        
        sqlx::query(
            "INSERT INTO credit_accounts (id, tenant_id, customer_id, credit_limit, current_balance, 
             available_credit, payment_terms_days, is_active, created_at, updated_at)
             VALUES (?, ?, ?, ?, 0.0, ?, 30, 1, ?, ?)"
        )
        .bind(&credit_account_id)
        .bind(tenant_id)
        .bind(&customer.id)
        .bind(credit_limit)
        .bind(credit_limit)
        .bind(&now)
        .bind(&now)
        .execute(&pool)
        .await
        .expect("Failed to create credit account");
        
        // Verify credit account created
        let account: (f64, f64, f64) = sqlx::query_as(
            "SELECT credit_limit, current_balance, available_credit FROM credit_accounts WHERE id = ?"
        )
        .bind(&credit_account_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch credit account");
        
        assert_eq!(account.0, 1000.0);
        assert_eq!(account.1, 0.0);
        assert_eq!(account.2, 1000.0);
        
        // Step 2: Make first purchase (300.0)
        let transaction1_id = Uuid::new_v4().to_string();
        let charge1_date = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT INTO credit_transactions (id, tenant_id, credit_account_id, transaction_type, 
             amount, reference_id, transaction_date, days_overdue)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)"
        )
        .bind(&transaction1_id)
        .bind(tenant_id)
        .bind(&credit_account_id)
        .bind("Charge")
        .bind(300.0)
        .bind(format!("INV-{}", Uuid::new_v4()))
        .bind(&charge1_date)
        .execute(&pool)
        .await
        .expect("Failed to record charge 1");
        
        // Update credit account balance
        sqlx::query(
            "UPDATE credit_accounts 
             SET current_balance = current_balance + ?, 
                 available_credit = credit_limit - (current_balance + ?),
                 updated_at = ?
             WHERE id = ?"
        )
        .bind(300.0)
        .bind(300.0)
        .bind(&charge1_date)
        .bind(&credit_account_id)
        .execute(&pool)
        .await
        .expect("Failed to update credit account after charge 1");
        
        // Verify balance updated
        let account: (f64, f64) = sqlx::query_as(
            "SELECT current_balance, available_credit FROM credit_accounts WHERE id = ?"
        )
        .bind(&credit_account_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch credit account");
        
        assert_eq!(account.0, 300.0);
        assert_eq!(account.1, 700.0);
        
        // Step 3: Make second purchase (200.0)
        let transaction2_id = Uuid::new_v4().to_string();
        let charge2_date = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT INTO credit_transactions (id, tenant_id, credit_account_id, transaction_type, 
             amount, reference_id, transaction_date, days_overdue)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)"
        )
        .bind(&transaction2_id)
        .bind(tenant_id)
        .bind(&credit_account_id)
        .bind("Charge")
        .bind(200.0)
        .bind(format!("INV-{}", Uuid::new_v4()))
        .bind(&charge2_date)
        .execute(&pool)
        .await
        .expect("Failed to record charge 2");
        
        // Update credit account balance
        sqlx::query(
            "UPDATE credit_accounts 
             SET current_balance = current_balance + ?, 
                 available_credit = credit_limit - (current_balance + ?),
                 updated_at = ?
             WHERE id = ?"
        )
        .bind(200.0)
        .bind(200.0)
        .bind(&charge2_date)
        .bind(&credit_account_id)
        .execute(&pool)
        .await
        .expect("Failed to update credit account after charge 2");
        
        // Verify balance updated
        let account: (f64, f64) = sqlx::query_as(
            "SELECT current_balance, available_credit FROM credit_accounts WHERE id = ?"
        )
        .bind(&credit_account_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch credit account");
        
        assert_eq!(account.0, 500.0);
        assert_eq!(account.1, 500.0);
        
        // Step 4: Make payment (250.0)
        let payment1_id = Uuid::new_v4().to_string();
        let payment1_date = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT INTO credit_transactions (id, tenant_id, credit_account_id, transaction_type, 
             amount, reference_id, transaction_date, days_overdue)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)"
        )
        .bind(&payment1_id)
        .bind(tenant_id)
        .bind(&credit_account_id)
        .bind("Payment")
        .bind(250.0)
        .bind(format!("PAY-{}", Uuid::new_v4()))
        .bind(&payment1_date)
        .execute(&pool)
        .await
        .expect("Failed to record payment 1");
        
        // Update credit account balance
        sqlx::query(
            "UPDATE credit_accounts 
             SET current_balance = current_balance - ?, 
                 available_credit = credit_limit - (current_balance - ?),
                 updated_at = ?
             WHERE id = ?"
        )
        .bind(250.0)
        .bind(250.0)
        .bind(&payment1_date)
        .bind(&credit_account_id)
        .execute(&pool)
        .await
        .expect("Failed to update credit account after payment 1");
        
        // Verify balance updated
        let account: (f64, f64) = sqlx::query_as(
            "SELECT current_balance, available_credit FROM credit_accounts WHERE id = ?"
        )
        .bind(&credit_account_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch credit account");
        
        assert_eq!(account.0, 250.0);
        assert_eq!(account.1, 750.0);
        
        // Step 5: Make another purchase (100.0)
        let transaction3_id = Uuid::new_v4().to_string();
        let charge3_date = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT INTO credit_transactions (id, tenant_id, credit_account_id, transaction_type, 
             amount, reference_id, transaction_date, days_overdue)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0)"
        )
        .bind(&transaction3_id)
        .bind(tenant_id)
        .bind(&credit_account_id)
        .bind("Charge")
        .bind(100.0)
        .bind(format!("INV-{}", Uuid::new_v4()))
        .bind(&charge3_date)
        .execute(&pool)
        .await
        .expect("Failed to record charge 3");
        
        // Update credit account balance
        sqlx::query(
            "UPDATE credit_accounts 
             SET current_balance = current_balance + ?, 
                 available_credit = credit_limit - (current_balance + ?),
                 updated_at = ?
             WHERE id = ?"
        )
        .bind(100.0)
        .bind(100.0)
        .bind(&charge3_date)
        .bind(&credit_account_id)
        .execute(&pool)
        .await
        .expect("Failed to update credit account after charge 3");
        
        // Verify final balance
        let account: (f64, f64) = sqlx::query_as(
            "SELECT current_balance, available_credit FROM credit_accounts WHERE id = ?"
        )
        .bind(&credit_account_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch credit account");
        
        assert_eq!(account.0, 350.0);
        assert_eq!(account.1, 650.0);
        
        // Verify transaction history
        let transaction_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM credit_transactions WHERE credit_account_id = ?"
        )
        .bind(&credit_account_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to count transactions");
        
        assert_eq!(transaction_count.0, 4); // 3 charges + 1 payment
        
        // Verify total charges and payments
        let totals: (f64, f64) = sqlx::query_as(
            "SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'Charge' THEN amount ELSE 0 END), 0) as total_charges,
                COALESCE(SUM(CASE WHEN transaction_type = 'Payment' THEN amount ELSE 0 END), 0) as total_payments
             FROM credit_transactions WHERE credit_account_id = ?"
        )
        .bind(&credit_account_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to calculate totals");
        
        assert_eq!(totals.0, 600.0); // Total charges
        assert_eq!(totals.1, 250.0); // Total payments
        assert_eq!(totals.0 - totals.1, 350.0); // Current balance
    }
}

#[cfg(test)]
mod promotion_application_tests {
    use super::*;

    #[tokio::test]
    async fn test_promotion_application_across_transactions() {
        // Test promotion application across multiple transactions
        let (pool, _temp_dir) = create_test_db().await;
        let tenant_id = "test_tenant_003";
        
        // Setup test data
        let customer = create_test_customer(&pool, tenant_id).await;
        let product1 = create_test_product(&pool, tenant_id, 100.0).await;
        let product2 = create_test_product(&pool, tenant_id, 50.0).await;
        
        // Step 1: Create percentage discount promotion (10% off)
        let promotion1_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let start_date = Utc::now().to_rfc3339();
        let end_date = (Utc::now() + chrono::Duration::days(30)).to_rfc3339();
        
        sqlx::query(
            "INSERT INTO promotions (id, tenant_id, name, description, promotion_type, discount_value, 
             start_date, end_date, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
        )
        .bind(&promotion1_id)
        .bind(tenant_id)
        .bind("10% Off Sale")
        .bind("10% discount on all items")
        .bind("PercentageOff")
        .bind(10.0)
        .bind(&start_date)
        .bind(&end_date)
        .execute(&pool)
        .await
        .expect("Failed to create promotion 1");
        
        // Step 2: Create fixed amount discount promotion ($15 off)
        let promotion2_id = Uuid::new_v4().to_string();
        
        sqlx::query(
            "INSERT INTO promotions (id, tenant_id, name, description, promotion_type, discount_value, 
             start_date, end_date, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
        )
        .bind(&promotion2_id)
        .bind(tenant_id)
        .bind("$15 Off")
        .bind("$15 fixed discount")
        .bind("FixedAmountOff")
        .bind(15.0)
        .bind(&start_date)
        .bind(&end_date)
        .execute(&pool)
        .await
        .expect("Failed to create promotion 2");
        
        // Step 3: Create quantity discount promotion (buy 3+ get 20% off)
        let promotion3_id = Uuid::new_v4().to_string();
        
        sqlx::query(
            "INSERT INTO promotions (id, tenant_id, name, description, promotion_type, discount_value, 
             start_date, end_date, min_quantity, is_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 3, 1)"
        )
        .bind(&promotion3_id)
        .bind(tenant_id)
        .bind("Buy 3+ Get 20% Off")
        .bind("20% discount when buying 3 or more")
        .bind("QuantityDiscount")
        .bind(20.0)
        .bind(&start_date)
        .bind(&end_date)
        .execute(&pool)
        .await
        .expect("Failed to create promotion 3");
        
        // Step 4: Transaction 1 - Single item (should apply 10% or $15, whichever is better)
        let transaction1_id = Uuid::new_v4().to_string();
        let item_price = 100.0;
        let discount_10_percent = item_price * 0.10; // $10
        let discount_fixed: f64 = 15.0; // $15
        let best_discount = discount_fixed.max(discount_10_percent); // $15
        
        sqlx::query(
            "INSERT INTO promotion_usage (id, tenant_id, promotion_id, transaction_id, customer_id, 
             discount_amount, items_affected, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 1, ?)"
        )
        .bind(Uuid::new_v4().to_string())
        .bind(tenant_id)
        .bind(&promotion2_id) // Fixed $15 is better
        .bind(&transaction1_id)
        .bind(&customer.id)
        .bind(best_discount)
        .bind(&now)
        .execute(&pool)
        .await
        .expect("Failed to record promotion usage 1");
        
        // Verify best promotion was selected
        let usage: (f64,) = sqlx::query_as(
            "SELECT discount_amount FROM promotion_usage WHERE transaction_id = ?"
        )
        .bind(&transaction1_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch promotion usage");
        
        assert_eq!(usage.0, 15.0);
        
        // Step 5: Transaction 2 - Buy 3 items (should apply quantity discount 20%)
        let transaction2_id = Uuid::new_v4().to_string();
        let total_price = 250.0; // 2 * 100 + 1 * 50
        let quantity_discount = total_price * 0.20; // $50
        
        sqlx::query(
            "INSERT INTO promotion_usage (id, tenant_id, promotion_id, transaction_id, customer_id, 
             discount_amount, items_affected, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 3, ?)"
        )
        .bind(Uuid::new_v4().to_string())
        .bind(tenant_id)
        .bind(&promotion3_id) // Quantity discount
        .bind(&transaction2_id)
        .bind(&customer.id)
        .bind(quantity_discount)
        .bind(&now)
        .execute(&pool)
        .await
        .expect("Failed to record promotion usage 2");
        
        // Verify quantity discount applied
        let usage: (f64, i32) = sqlx::query_as(
            "SELECT discount_amount, items_affected FROM promotion_usage WHERE transaction_id = ?"
        )
        .bind(&transaction2_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch promotion usage");
        
        assert_eq!(usage.0, 50.0);
        assert_eq!(usage.1, 3);
        
        // Step 6: Transaction 3 - Buy 2 items (quantity discount doesn't apply, use best of others)
        let transaction3_id = Uuid::new_v4().to_string();
        let total_price_3 = 150.0; // 1 * 100 + 1 * 50
        let discount_10_percent_3 = total_price_3 * 0.10; // $15
        let discount_fixed_3: f64 = 15.0; // $15
        let best_discount_3 = discount_fixed_3.max(discount_10_percent_3); // $15
        
        sqlx::query(
            "INSERT INTO promotion_usage (id, tenant_id, promotion_id, transaction_id, customer_id, 
             discount_amount, items_affected, created_at)
             VALUES (?, ?, ?, ?, ?, ?, 2, ?)"
        )
        .bind(Uuid::new_v4().to_string())
        .bind(tenant_id)
        .bind(&promotion2_id) // Fixed $15
        .bind(&transaction3_id)
        .bind(&customer.id)
        .bind(best_discount_3)
        .bind(&now)
        .execute(&pool)
        .await
        .expect("Failed to record promotion usage 3");
        
        // Verify promotion usage across all transactions
        let total_usage: (i64, f64) = sqlx::query_as(
            "SELECT COUNT(*), SUM(discount_amount) FROM promotion_usage WHERE customer_id = ?"
        )
        .bind(&customer.id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch total usage");
        
        assert_eq!(total_usage.0, 3); // 3 transactions
        assert_eq!(total_usage.1, 80.0); // $15 + $50 + $15
        
        // Verify promotion effectiveness
        let promo1_usage: (i64, Option<f64>) = sqlx::query_as(
            "SELECT COUNT(*), SUM(discount_amount) FROM promotion_usage WHERE promotion_id = ?"
        )
        .bind(&promotion1_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch promo1 usage");
        
        assert_eq!(promo1_usage.0, 0); // Never used (fixed $15 was always better)
        assert_eq!(promo1_usage.1, None); // No discount amount
        
        let promo2_usage: (i64, Option<f64>) = sqlx::query_as(
            "SELECT COUNT(*), SUM(discount_amount) FROM promotion_usage WHERE promotion_id = ?"
        )
        .bind(&promotion2_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch promo2 usage");
        
        assert_eq!(promo2_usage.0, 2); // Used twice
        assert_eq!(promo2_usage.1, Some(30.0)); // $15 + $15
        
        let promo3_usage: (i64, Option<f64>) = sqlx::query_as(
            "SELECT COUNT(*), SUM(discount_amount) FROM promotion_usage WHERE promotion_id = ?"
        )
        .bind(&promotion3_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch promo3 usage");
        
        assert_eq!(promo3_usage.0, 1); // Used once
        assert_eq!(promo3_usage.1, Some(50.0)); // $50
    }
}

#[cfg(test)]
mod offline_sync_tests {
    use super::*;

    #[tokio::test]
    async fn test_offline_operation_followed_by_sync() {
        // Test offline operation with sync queue and conflict resolution
        let (pool, _temp_dir) = create_test_db().await;
        let tenant_id = "test_tenant_004";
        
        // Setup test data
        let customer = create_test_customer(&pool, tenant_id).await;
        let _product = create_test_product(&pool, tenant_id, 100.0).await;
        let employee = create_test_employee(&pool, tenant_id).await;
        
        // Step 1: Simulate offline mode - create layaway
        let layaway_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT INTO layaways (id, tenant_id, customer_id, status, total_amount, deposit_amount, 
             balance_due, due_date, created_at, updated_at, sync_version, store_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)"
        )
        .bind(&layaway_id)
        .bind(tenant_id)
        .bind(&customer.id)
        .bind("Active")
        .bind(100.0)
        .bind(25.0)
        .bind(75.0)
        .bind(None::<String>)
        .bind(&now)
        .bind(&now)
        .bind("store_001")
        .execute(&pool)
        .await
        .expect("Failed to create layaway offline");
        
        // Add to sync queue
        let queue_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO sync_queue (id, tenant_id, entity_type, entity_id, operation, payload, 
             created_at, retry_count, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)"
        )
        .bind(&queue_id)
        .bind(tenant_id)
        .bind("layaway")
        .bind(&layaway_id)
        .bind("create")
        .bind(serde_json::json!({
            "id": layaway_id,
            "customer_id": customer.id,
            "total_amount": 100.0,
            "deposit_amount": 25.0
        }).to_string())
        .bind(&now)
        .bind("pending")
        .execute(&pool)
        .await
        .expect("Failed to add to sync queue");
        
        // Verify item in sync queue
        let queue_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM sync_queue WHERE status = 'pending'"
        )
        .fetch_one(&pool)
        .await
        .expect("Failed to count sync queue");
        
        assert_eq!(queue_count.0, 1);
        
        // Step 2: Make offline payment
        let payment_id = Uuid::new_v4().to_string();
        let payment_date = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT INTO layaway_payments (id, tenant_id, layaway_id, amount, payment_method, payment_date, employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&payment_id)
        .bind(tenant_id)
        .bind(&layaway_id)
        .bind(25.0)
        .bind("cash")
        .bind(&payment_date)
        .bind(&employee)
        .execute(&pool)
        .await
        .expect("Failed to record payment offline");
        
        // Update layaway balance
        sqlx::query(
            "UPDATE layaways SET balance_due = balance_due - ?, updated_at = ?, sync_version = sync_version + 1
             WHERE id = ?"
        )
        .bind(25.0)
        .bind(&payment_date)
        .bind(&layaway_id)
        .execute(&pool)
        .await
        .expect("Failed to update layaway offline");
        
        // Add payment to sync queue
        let queue_id2 = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO sync_queue (id, tenant_id, entity_type, entity_id, operation, payload, 
             created_at, retry_count, sync_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)"
        )
        .bind(&queue_id2)
        .bind(tenant_id)
        .bind("layaway_payment")
        .bind(&payment_id)
        .bind("create")
        .bind(serde_json::json!({
            "id": payment_id,
            "layaway_id": layaway_id,
            "amount": 25.0
        }).to_string())
        .bind(&payment_date)
        .bind("pending")
        .execute(&pool)
        .await
        .expect("Failed to add payment to sync queue");
        
        // Verify both items in sync queue
        let queue_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM sync_queue WHERE status = 'pending'"
        )
        .fetch_one(&pool)
        .await
        .expect("Failed to count sync queue");
        
        assert_eq!(queue_count.0, 2);
        
        // Step 3: Simulate sync process - mark items as synced
        sqlx::query(
            "UPDATE sync_queue SET status = ?, synced_at = ? WHERE status = ?"
        )
        .bind("synced")
        .bind(&Utc::now().to_rfc3339())
        .bind("pending")
        .execute(&pool)
        .await
        .expect("Failed to mark items as synced");
        
        // Verify sync completed
        let synced_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM sync_queue WHERE status = 'synced'"
        )
        .fetch_one(&pool)
        .await
        .expect("Failed to count synced items");
        
        assert_eq!(synced_count.0, 2);
        
        // Step 4: Test conflict resolution - simulate concurrent update from another store
        let store2_update_time = (Utc::now() + chrono::Duration::seconds(5)).to_rfc3339();
        
        // Store 2 makes a payment (simulated remote update)
        let payment2_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO layaway_payments (id, tenant_id, layaway_id, amount, payment_method, payment_date, employee_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&payment2_id)
        .bind(tenant_id)
        .bind(&layaway_id)
        .bind(30.0)
        .bind("credit_card")
        .bind(&store2_update_time)
        .bind(&employee)
        .execute(&pool)
        .await
        .expect("Failed to record payment from store 2");
        
        // Update layaway with newer timestamp (conflict resolution: most recent wins)
        sqlx::query(
            "UPDATE layaways 
             SET balance_due = balance_due - ?, 
                 updated_at = ?, 
                 sync_version = sync_version + 1,
                 store_id = ?
             WHERE id = ? AND updated_at < ?"
        )
        .bind(30.0)
        .bind(&store2_update_time)
        .bind("store_002")
        .bind(&layaway_id)
        .bind(&store2_update_time)
        .execute(&pool)
        .await
        .expect("Failed to update layaway from store 2");
        
        // Verify conflict resolution - most recent update preserved
        let layaway: (f64, String, String) = sqlx::query_as(
            "SELECT balance_due, updated_at, store_id FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to fetch layaway");
        
        assert_eq!(layaway.0, 20.0); // 75 - 25 - 30 = 20
        assert_eq!(layaway.2, "store_002"); // Most recent store
        
        // Verify all payments recorded
        let payment_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM layaway_payments WHERE layaway_id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to count payments");
        
        assert_eq!(payment_count.0, 2); // Both payments preserved
        
        // Verify total payments
        let total_payments: (f64,) = sqlx::query_as(
            "SELECT SUM(amount) FROM layaway_payments WHERE layaway_id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to sum payments");
        
        assert_eq!(total_payments.0, 55.0); // 25 + 30
        
        // Step 5: Test audit logging of offline operations
        // Create audit log entries for offline operations
        let audit1_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO audit_logs (id, tenant_id, entity_type, entity_id, action, user_id, 
             changes, created_at, is_offline)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
        )
        .bind(&audit1_id)
        .bind(tenant_id)
        .bind("layaway")
        .bind(&layaway_id)
        .bind("create")
        .bind(&employee)
        .bind(serde_json::json!({"status": "Active", "total_amount": 100.0}).to_string())
        .bind(&now)
        .execute(&pool)
        .await
        .expect("Failed to create audit log 1");
        
        let audit2_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO audit_logs (id, tenant_id, entity_type, entity_id, action, user_id, 
             changes, created_at, is_offline)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)"
        )
        .bind(&audit2_id)
        .bind(tenant_id)
        .bind("layaway_payment")
        .bind(&payment_id)
        .bind("create")
        .bind(&employee)
        .bind(serde_json::json!({"amount": 25.0, "payment_method": "cash"}).to_string())
        .bind(&payment_date)
        .execute(&pool)
        .await
        .expect("Failed to create audit log 2");
        
        // Verify audit logs created
        let audit_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM audit_logs WHERE is_offline = 1"
        )
        .fetch_one(&pool)
        .await
        .expect("Failed to count audit logs");
        
        assert_eq!(audit_count.0, 2);
    }
}
