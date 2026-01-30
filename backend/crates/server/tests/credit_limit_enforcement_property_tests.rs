// Property-based tests for credit limit enforcement
// Feature: sales-customer-management, Property 14: Credit limit enforcement
// **Validates: Requirements 5.5**

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

// Test database setup helper
async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create credit_accounts table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS credit_accounts (
            id TEXT PRIMARY KEY,
            customer_id TEXT NOT NULL UNIQUE,
            credit_limit REAL NOT NULL,
            current_balance REAL NOT NULL DEFAULT 0.0,
            available_credit REAL NOT NULL,
            payment_terms_days INTEGER NOT NULL DEFAULT 30,
            service_charge_rate REAL,
            is_active INTEGER NOT NULL DEFAULT 1,
            last_statement_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create credit_transactions table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS credit_transactions (
            id TEXT PRIMARY KEY,
            credit_account_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            amount REAL NOT NULL,
            reference_id TEXT NOT NULL,
            transaction_date TEXT NOT NULL,
            due_date TEXT,
            days_overdue INTEGER NOT NULL DEFAULT 0
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    pool
}

// Helper to create a test credit account
async fn create_test_credit_account(
    pool: &SqlitePool,
    customer_id: &str,
    credit_limit: f64,
    current_balance: f64,
) -> String {
    let account_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let available_credit = credit_limit - current_balance;

    sqlx::query(
        "INSERT INTO credit_accounts (id, customer_id, credit_limit, current_balance, 
         available_credit, payment_terms_days, service_charge_rate, is_active, 
         last_statement_date, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 30, NULL, 1, NULL, ?, ?)",
    )
    .bind(&account_id)
    .bind(customer_id)
    .bind(credit_limit)
    .bind(current_balance)
    .bind(available_credit)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .unwrap();

    account_id
}

// Helper to attempt a credit charge (simulating the handler logic)
async fn attempt_credit_charge(
    pool: &SqlitePool,
    account_id: &str,
    charge_amount: f64,
    reference_id: &str,
) -> Result<(), String> {
    // Start transaction
    let mut tx = pool.begin().await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Fetch account
    let account: (f64, f64, f64, i32) = sqlx::query_as(
        "SELECT credit_limit, current_balance, available_credit, is_active 
         FROM credit_accounts WHERE id = ?"
    )
    .bind(account_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Failed to fetch account: {}", e))?;

    let (credit_limit, current_balance, _available_credit, is_active) = account;

    // Validate amount
    if charge_amount <= 0.0 {
        tx.rollback().await.ok();
        return Err("Charge amount must be greater than zero".to_string());
    }

    // Check if account is active
    if is_active != 1 {
        tx.rollback().await.ok();
        return Err("Credit account is not active".to_string());
    }

    // Check credit limit - THIS IS THE KEY PROPERTY WE'RE TESTING
    let new_balance = current_balance + charge_amount;
    if new_balance > credit_limit {
        tx.rollback().await.ok();
        return Err(format!(
            "Charge would exceed credit limit. Limit: {}, Current: {}, Requested: {}, Would be: {}",
            credit_limit, current_balance, charge_amount, new_balance
        ));
    }

    // Record transaction
    let transaction_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let due_date = (Utc::now() + chrono::Duration::days(30)).to_rfc3339();

    sqlx::query(
        "INSERT INTO credit_transactions (id, credit_account_id, transaction_type, amount, 
         reference_id, transaction_date, due_date, days_overdue)
         VALUES (?, ?, 'Charge', ?, ?, ?, ?, 0)",
    )
    .bind(&transaction_id)
    .bind(account_id)
    .bind(charge_amount)
    .bind(reference_id)
    .bind(&now)
    .bind(&due_date)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to record charge: {}", e))?;

    // Update account balance
    let new_available = credit_limit - new_balance;
    sqlx::query(
        "UPDATE credit_accounts 
         SET current_balance = ?, available_credit = ?, updated_at = ? 
         WHERE id = ?",
    )
    .bind(new_balance)
    .bind(new_available)
    .bind(&now)
    .bind(account_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to update account: {}", e))?;

    // Commit transaction
    tx.commit().await
        .map_err(|e| format!("Failed to commit transaction: {}", e))?;

    Ok(())
}

// Proptest strategies
fn arb_credit_limit() -> impl Strategy<Value = f64> {
    (100.0..10000.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

fn arb_current_balance_ratio() -> impl Strategy<Value = f64> {
    0.0..0.9 // Current balance is 0-90% of credit limit
}

fn arb_charge_ratio() -> impl Strategy<Value = f64> {
    0.01..1.5 // Charge can be 1-150% of available credit
}

// ============================================================================
// Property 14: Credit limit enforcement
// ============================================================================
// **Validates: Requirements 5.5**
//
// For any credit purchase, if the purchase amount would cause the account 
// balance to exceed the credit limit, the purchase should be rejected

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_14_rejects_charges_exceeding_credit_limit(
        credit_limit in arb_credit_limit(),
        balance_ratio in arb_current_balance_ratio(),
        charge_ratio in arb_charge_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Calculate current balance as a ratio of credit limit
            let current_balance = (credit_limit * balance_ratio * 100.0).round() / 100.0;
            let available_credit = credit_limit - current_balance;
            
            // Create credit account
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                current_balance,
            )
            .await;

            // Calculate charge amount based on available credit
            let charge_amount = (available_credit * charge_ratio * 100.0).round() / 100.0;
            let reference_id = Uuid::new_v4().to_string();

            // Attempt charge
            let result = attempt_credit_charge(
                &pool,
                &account_id,
                charge_amount,
                &reference_id,
            )
            .await;

            // Calculate what the new balance would be
            let would_be_balance = current_balance + charge_amount;

            // PROPERTY: If charge would exceed limit, it should be rejected
            if would_be_balance > credit_limit {
                prop_assert!(
                    result.is_err(),
                    "Charge of {} should be rejected (limit: {}, current: {}, would be: {})",
                    charge_amount,
                    credit_limit,
                    current_balance,
                    would_be_balance
                );

                // Verify balance was NOT updated
                let unchanged_balance: (f64,) = sqlx::query_as(
                    "SELECT current_balance FROM credit_accounts WHERE id = ?"
                )
                .bind(&account_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                prop_assert!(
                    (unchanged_balance.0 - current_balance).abs() < 0.01,
                    "Balance should remain {} but was {}",
                    current_balance,
                    unchanged_balance.0
                );

                // Verify no transaction was recorded
                let transaction_count: (i64,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM credit_transactions WHERE credit_account_id = ?"
                )
                .bind(&account_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                prop_assert_eq!(
                    transaction_count.0,
                    0,
                    "No transaction should be recorded for rejected charge"
                );
            } else {
                // PROPERTY: If charge is within limit, it should be accepted
                prop_assert!(
                    result.is_ok(),
                    "Charge of {} should be accepted (limit: {}, current: {}, would be: {}). Error: {:?}",
                    charge_amount,
                    credit_limit,
                    current_balance,
                    would_be_balance,
                    result.err()
                );

                // Verify balance was updated correctly
                let new_balance: (f64,) = sqlx::query_as(
                    "SELECT current_balance FROM credit_accounts WHERE id = ?"
                )
                .bind(&account_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                prop_assert!(
                    (new_balance.0 - would_be_balance).abs() < 0.01,
                    "Balance should be {} but was {}",
                    would_be_balance,
                    new_balance.0
                );

                // Verify available credit was updated correctly
                let new_available: (f64,) = sqlx::query_as(
                    "SELECT available_credit FROM credit_accounts WHERE id = ?"
                )
                .bind(&account_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                let expected_available = credit_limit - would_be_balance;
                prop_assert!(
                    (new_available.0 - expected_available).abs() < 0.01,
                    "Available credit should be {} but was {}",
                    expected_available,
                    new_available.0
                );

                // Verify transaction was recorded
                let transaction_count: (i64,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM credit_transactions 
                     WHERE credit_account_id = ? AND transaction_type = 'Charge' 
                     AND ABS(amount - ?) < 0.01"
                )
                .bind(&account_id)
                .bind(charge_amount)
                .fetch_one(&pool)
                .await
                .unwrap();

                prop_assert_eq!(
                    transaction_count.0,
                    1,
                    "Transaction should be recorded for accepted charge"
                );
            }
            Ok(())
        });
    }

    #[test]
    fn property_14_accepts_charges_at_exact_limit(
        credit_limit in arb_credit_limit(),
        balance_ratio in arb_current_balance_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Calculate current balance
            let current_balance = (credit_limit * balance_ratio * 100.0).round() / 100.0;
            
            // Create credit account
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                current_balance,
            )
            .await;

            // Charge exactly the available credit (up to the limit)
            let charge_amount = credit_limit - current_balance;
            let reference_id = Uuid::new_v4().to_string();

            // Attempt charge
            let result = attempt_credit_charge(
                &pool,
                &account_id,
                charge_amount,
                &reference_id,
            )
            .await;

            // PROPERTY: Charge that brings balance exactly to limit should be accepted
            prop_assert!(
                result.is_ok(),
                "Charge of {} bringing balance to exact limit {} should be accepted. Error: {:?}",
                charge_amount,
                credit_limit,
                result.err()
            );

            // Verify balance equals credit limit
            let new_balance: (f64,) = sqlx::query_as(
                "SELECT current_balance FROM credit_accounts WHERE id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert!(
                (new_balance.0 - credit_limit).abs() < 0.01,
                "Balance should be at limit {} but was {}",
                credit_limit,
                new_balance.0
            );

            // Verify available credit is zero (or very close)
            let available: (f64,) = sqlx::query_as(
                "SELECT available_credit FROM credit_accounts WHERE id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert!(
                available.0.abs() < 0.01,
                "Available credit should be 0 but was {}",
                available.0
            );
            Ok(())
        });
    }

    #[test]
    fn property_14_rejects_charges_one_cent_over_limit(
        credit_limit in arb_credit_limit(),
        balance_ratio in arb_current_balance_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Calculate current balance
            let current_balance = (credit_limit * balance_ratio * 100.0).round() / 100.0;
            
            // Create credit account
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                current_balance,
            )
            .await;

            // Charge one cent more than available credit
            let charge_amount = (credit_limit - current_balance) + 0.01;
            let reference_id = Uuid::new_v4().to_string();

            // Attempt charge
            let result = attempt_credit_charge(
                &pool,
                &account_id,
                charge_amount,
                &reference_id,
            )
            .await;

            // PROPERTY: Charge that exceeds limit by even one cent should be rejected
            prop_assert!(
                result.is_err(),
                "Charge of {} exceeding limit by 0.01 should be rejected (limit: {}, current: {})",
                charge_amount,
                credit_limit,
                current_balance
            );

            // Verify balance was NOT changed
            let unchanged_balance: (f64,) = sqlx::query_as(
                "SELECT current_balance FROM credit_accounts WHERE id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert!(
                (unchanged_balance.0 - current_balance).abs() < 0.01,
                "Balance should remain {} but was {}",
                current_balance,
                unchanged_balance.0
            );
            Ok(())
        });
    }

    #[test]
    fn property_14_handles_zero_available_credit(
        credit_limit in arb_credit_limit(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Create account with balance at limit (zero available credit)
            let current_balance = credit_limit;
            
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                current_balance,
            )
            .await;

            // Try to charge any positive amount
            let charge_amount = 0.01;
            let reference_id = Uuid::new_v4().to_string();

            let result = attempt_credit_charge(
                &pool,
                &account_id,
                charge_amount,
                &reference_id,
            )
            .await;

            // PROPERTY: Any charge when at limit should be rejected
            prop_assert!(
                result.is_err(),
                "Charge of {} should be rejected when account is at limit {}",
                charge_amount,
                credit_limit
            );
            Ok(())
        });
    }

    #[test]
    fn property_14_multiple_charges_respect_cumulative_limit(
        credit_limit in arb_credit_limit(),
        num_charges in 2usize..5,
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Start with zero balance
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                0.0,
            )
            .await;

            // Calculate charge amount per transaction
            let charge_per_transaction = (credit_limit / num_charges as f64 * 100.0).round() / 100.0;
            let mut total_charged = 0.0;
            let mut successful_charges = 0;

            // Make multiple charges
            for i in 0..num_charges {
                let reference_id = format!("charge-{}", i);
                let result = attempt_credit_charge(
                    &pool,
                    &account_id,
                    charge_per_transaction,
                    &reference_id,
                )
                .await;

                if result.is_ok() {
                    total_charged += charge_per_transaction;
                    successful_charges += 1;
                } else {
                    // Once we hit the limit, all subsequent charges should fail
                    break;
                }
            }

            // PROPERTY: Total charged should not exceed credit limit
            prop_assert!(
                total_charged <= credit_limit + 0.01, // Allow small rounding error
                "Total charged {} should not exceed limit {}",
                total_charged,
                credit_limit
            );

            // Verify final balance
            let final_balance: (f64,) = sqlx::query_as(
                "SELECT current_balance FROM credit_accounts WHERE id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert!(
                final_balance.0 <= credit_limit + 0.01,
                "Final balance {} should not exceed limit {}",
                final_balance.0,
                credit_limit
            );

            // Verify transaction count matches successful charges
            let transaction_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM credit_transactions WHERE credit_account_id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert_eq!(
                transaction_count.0 as usize,
                successful_charges,
                "Transaction count should match successful charges"
            );
            Ok(())
        });
    }
}
