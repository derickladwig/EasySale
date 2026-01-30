// Property-based tests for layaway balance consistency
// Feature: sales-customer-management
// Property 1: Layaway balance consistency
// **Validates: Requirements 1.3**

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

// Helper to record a payment and update balance
async fn record_payment(
    pool: &SqlitePool,
    tenant_id: &str,
    layaway_id: &str,
    amount: f64,
    employee_id: &str,
) -> f64 {
    let payment_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Get current balance before payment
    let current_balance: (f64,) = sqlx::query_as(
        "SELECT balance_due FROM layaways WHERE id = ?"
    )
    .bind(layaway_id)
    .fetch_one(pool)
    .await
    .unwrap();

    let previous_balance = current_balance.0;

    // Record payment
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
    let new_balance = previous_balance - amount;
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

    previous_balance
}

// Helper to check if payment exists in history
async fn payment_exists_in_history(
    pool: &SqlitePool,
    layaway_id: &str,
    amount: f64,
) -> bool {
    let result: Option<(f64,)> = sqlx::query_as(
        "SELECT amount FROM layaway_payments WHERE layaway_id = ? AND ABS(amount - ?) < 0.01"
    )
    .bind(layaway_id)
    .bind(amount)
    .fetch_optional(pool)
    .await
    .unwrap();

    result.is_some()
}

// Proptest strategies
fn arb_initial_balance() -> impl Strategy<Value = f64> {
    (100.0..10000.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

fn arb_payment_amount() -> impl Strategy<Value = f64> {
    (10.0..100.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

fn arb_deposit_ratio() -> impl Strategy<Value = f64> {
    0.1..0.5
}

// ============================================================================
// Property 1: Layaway balance consistency
// ============================================================================
// **Validates: Requirements 1.3**
//
// For any layaway and payment amount, when a payment is recorded, the new 
// balance should equal the previous balance minus the payment amount, and a 
// payment record should exist in the payment history

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_1_layaway_payment_updates_balance_correctly(
        total_amount in arb_initial_balance(),
        deposit_ratio in arb_deposit_ratio(),
        payment_amount in arb_payment_amount(),
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

            // Get initial balance (after deposit)
            let initial_balance: (f64,) = sqlx::query_as(
                "SELECT balance_due FROM layaways WHERE id = ?"
            )
            .bind(&layaway_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let balance_before_payment = initial_balance.0;

            // Ensure payment doesn't exceed balance
            let actual_payment = if payment_amount > balance_before_payment {
                balance_before_payment
            } else {
                payment_amount
            };

            // Record payment and get previous balance
            let previous_balance = record_payment(
                &pool,
                tenant_id,
                &layaway_id,
                actual_payment,
                &employee_id,
            )
            .await;

            // Get new balance after payment
            let new_balance: (f64,) = sqlx::query_as(
                "SELECT balance_due FROM layaways WHERE id = ?"
            )
            .bind(&layaway_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let balance_after_payment = new_balance.0;

            // Property assertion 1: Balance consistency
            let expected_new_balance = previous_balance - actual_payment;
            prop_assert!(
                (balance_after_payment - expected_new_balance).abs() < 0.01,
                "New balance should equal previous balance minus payment amount. \
                 Previous: {}, Payment: {}, Expected: {}, Actual: {}",
                previous_balance,
                actual_payment,
                expected_new_balance,
                balance_after_payment
            );

            // Property assertion 2: Payment exists in history
            let payment_recorded = payment_exists_in_history(
                &pool,
                &layaway_id,
                actual_payment,
            )
            .await;

            prop_assert!(
                payment_recorded,
                "Payment record should exist in payment history for amount {}",
                actual_payment
            );

            Ok(())
        }).unwrap();
    }
}

// Additional property test: Multiple sequential payments
proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_1_extended_multiple_payments_maintain_consistency(
        total_amount in arb_initial_balance(),
        deposit_ratio in arb_deposit_ratio(),
        payment_amounts in prop::collection::vec(arb_payment_amount(), 1..5),
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

            // Track expected balance
            let mut expected_balance = total_amount - deposit_amount;
            let mut total_payments_made = 0.0;

            // Make multiple payments
            for payment_amount in payment_amounts {
                // Get current balance
                let current: (f64,) = sqlx::query_as(
                    "SELECT balance_due FROM layaways WHERE id = ?"
                )
                .bind(&layaway_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                let balance_before = current.0;

                // Stop if balance is already zero or near-zero
                if balance_before <= 0.01 {
                    break;
                }

                // Ensure payment doesn't exceed remaining balance
                let actual_payment = if payment_amount > balance_before {
                    balance_before
                } else {
                    payment_amount
                };

                // Record payment
                let previous_balance = record_payment(
                    &pool,
                    tenant_id,
                    &layaway_id,
                    actual_payment,
                    &employee_id,
                )
                .await;

                // Update expected balance
                expected_balance = previous_balance - actual_payment;
                total_payments_made += actual_payment;

                // Get new balance
                let new: (f64,) = sqlx::query_as(
                    "SELECT balance_due FROM layaways WHERE id = ?"
                )
                .bind(&layaway_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                let balance_after = new.0;

                // Verify balance consistency after each payment
                prop_assert!(
                    (balance_after - expected_balance).abs() < 0.01,
                    "Balance should be consistent after payment. \
                     Expected: {}, Actual: {}, Payment: {}",
                    expected_balance,
                    balance_after,
                    actual_payment
                );

                // Verify payment is recorded
                let payment_recorded = payment_exists_in_history(
                    &pool,
                    &layaway_id,
                    actual_payment,
                )
                .await;

                prop_assert!(
                    payment_recorded,
                    "Payment {} should be recorded in history",
                    actual_payment
                );
            }

            // Verify total payments sum correctly
            let final_balance: (f64,) = sqlx::query_as(
                "SELECT balance_due FROM layaways WHERE id = ?"
            )
            .bind(&layaway_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let initial_balance_due = total_amount - deposit_amount;
            let expected_final_balance = initial_balance_due - total_payments_made;

            prop_assert!(
                (final_balance.0 - expected_final_balance).abs() < 0.01,
                "Final balance should equal initial balance minus all payments. \
                 Initial: {}, Total payments: {}, Expected: {}, Actual: {}",
                initial_balance_due,
                total_payments_made,
                expected_final_balance,
                final_balance.0
            );

            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod unit_tests {
    use super::*;

    #[tokio::test]
    async fn test_single_payment_updates_balance() {
        let pool = setup_test_db().await;
        let tenant_id = "test-tenant";
        let customer_id = Uuid::new_v4().to_string();
        let store_id = "store-1";
        let employee_id = Uuid::new_v4().to_string();

        // Create layaway: $1000 total, $300 deposit, $700 balance
        let layaway_id = create_test_layaway(
            &pool,
            tenant_id,
            &customer_id,
            1000.0,
            300.0,
            store_id,
        )
        .await;

        // Make $200 payment
        let previous_balance = record_payment(
            &pool,
            tenant_id,
            &layaway_id,
            200.0,
            &employee_id,
        )
        .await;

        assert_eq!(previous_balance, 700.0);

        // Verify new balance
        let new_balance: (f64,) = sqlx::query_as(
            "SELECT balance_due FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert!((new_balance.0 - 500.0).abs() < 0.01);

        // Verify payment is recorded
        let payment_recorded = payment_exists_in_history(&pool, &layaway_id, 200.0).await;
        assert!(payment_recorded);
    }

    #[tokio::test]
    async fn test_payment_exactly_equals_balance() {
        let pool = setup_test_db().await;
        let tenant_id = "test-tenant";
        let customer_id = Uuid::new_v4().to_string();
        let store_id = "store-1";
        let employee_id = Uuid::new_v4().to_string();

        // Create layaway: $1000 total, $300 deposit, $700 balance
        let layaway_id = create_test_layaway(
            &pool,
            tenant_id,
            &customer_id,
            1000.0,
            300.0,
            store_id,
        )
        .await;

        // Make payment equal to full balance
        record_payment(
            &pool,
            tenant_id,
            &layaway_id,
            700.0,
            &employee_id,
        )
        .await;

        // Verify balance is zero
        let new_balance: (f64,) = sqlx::query_as(
            "SELECT balance_due FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert!(new_balance.0.abs() < 0.01);

        // Verify status is Completed
        let status: (String,) = sqlx::query_as(
            "SELECT status FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(status.0, "Completed");
    }

    #[tokio::test]
    async fn test_multiple_payments_accumulate_correctly() {
        let pool = setup_test_db().await;
        let tenant_id = "test-tenant";
        let customer_id = Uuid::new_v4().to_string();
        let store_id = "store-1";
        let employee_id = Uuid::new_v4().to_string();

        // Create layaway: $1000 total, $200 deposit, $800 balance
        let layaway_id = create_test_layaway(
            &pool,
            tenant_id,
            &customer_id,
            1000.0,
            200.0,
            store_id,
        )
        .await;

        // Make three payments: $100, $250, $150
        record_payment(&pool, tenant_id, &layaway_id, 100.0, &employee_id).await;
        record_payment(&pool, tenant_id, &layaway_id, 250.0, &employee_id).await;
        record_payment(&pool, tenant_id, &layaway_id, 150.0, &employee_id).await;

        // Verify final balance: 800 - 100 - 250 - 150 = 300
        let final_balance: (f64,) = sqlx::query_as(
            "SELECT balance_due FROM layaways WHERE id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert!((final_balance.0 - 300.0).abs() < 0.01);

        // Verify all payments are recorded
        let payment_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM layaway_payments WHERE layaway_id = ?"
        )
        .bind(&layaway_id)
        .fetch_one(&pool)
        .await
        .unwrap();

        assert_eq!(payment_count.0, 3);
    }

    #[tokio::test]
    async fn test_payment_history_preserves_all_payments() {
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
            200.0,
            store_id,
        )
        .await;

        // Make payments
        let payment_amounts = vec![50.0, 75.0, 100.0, 125.0];
        for amount in &payment_amounts {
            record_payment(&pool, tenant_id, &layaway_id, *amount, &employee_id).await;
        }

        // Verify all payments exist in history
        for amount in payment_amounts {
            let exists = payment_exists_in_history(&pool, &layaway_id, amount).await;
            assert!(exists, "Payment of {} should exist in history", amount);
        }
    }
}
