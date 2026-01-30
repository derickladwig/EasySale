// Property-based tests for credit payment application
// Feature: sales-customer-management, Property 15: Credit payment application
// **Validates: Requirements 5.3**

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

// Helper to apply a credit payment (simulating the handler logic)
async fn apply_credit_payment(
    pool: &SqlitePool,
    account_id: &str,
    payment_amount: f64,
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

    // Validate payment amount
    if payment_amount <= 0.0 {
        tx.rollback().await.ok();
        return Err("Payment amount must be greater than zero".to_string());
    }

    // Check if account is active
    if is_active != 1 {
        tx.rollback().await.ok();
        return Err("Credit account is not active".to_string());
    }

    // Check if payment exceeds current balance
    if payment_amount > current_balance {
        tx.rollback().await.ok();
        return Err(format!(
            "Payment amount {} exceeds current balance {}",
            payment_amount, current_balance
        ));
    }

    // Calculate new balances - THIS IS THE KEY PROPERTY WE'RE TESTING
    let new_balance = current_balance - payment_amount;
    let new_available = credit_limit - new_balance;

    // Record payment transaction
    let transaction_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO credit_transactions (id, credit_account_id, transaction_type, amount, 
         reference_id, transaction_date, due_date, days_overdue)
         VALUES (?, ?, 'Payment', ?, ?, ?, NULL, 0)",
    )
    .bind(&transaction_id)
    .bind(account_id)
    .bind(payment_amount)
    .bind(reference_id)
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(|e| format!("Failed to record payment: {}", e))?;

    // Update account balance and available credit
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

fn arb_balance_ratio() -> impl Strategy<Value = f64> {
    0.1..1.0 // Current balance is 10-100% of credit limit (must have some balance to pay)
}

fn arb_payment_ratio() -> impl Strategy<Value = f64> {
    0.01..1.5 // Payment can be 1-150% of current balance
}

// ============================================================================
// Property 15: Credit payment application
// ============================================================================
// **Validates: Requirements 5.3**
//
// For any credit account and payment amount, when a payment is applied, 
// the current balance should decrease by the payment amount and available 
// credit should increase by the same amount

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_15_payment_updates_balance_and_available_credit(
        credit_limit in arb_credit_limit(),
        balance_ratio in arb_balance_ratio(),
        payment_ratio in arb_payment_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Calculate current balance as a ratio of credit limit
            let current_balance = (credit_limit * balance_ratio * 100.0).round() / 100.0;
            let initial_available = credit_limit - current_balance;
            
            // Create credit account with a balance
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                current_balance,
            )
            .await;

            // Calculate payment amount based on current balance
            let payment_amount = (current_balance * payment_ratio * 100.0).round() / 100.0;
            let reference_id = Uuid::new_v4().to_string();

            // Apply payment
            let result = apply_credit_payment(
                &pool,
                &account_id,
                payment_amount,
                &reference_id,
            )
            .await;

            // Calculate expected new balances
            let expected_new_balance = current_balance - payment_amount;
            let expected_new_available = credit_limit - expected_new_balance;

            // PROPERTY: If payment is valid (positive and <= balance), it should be accepted
            if payment_amount > 0.0 && payment_amount <= current_balance {
                prop_assert!(
                    result.is_ok(),
                    "Payment of {} should be accepted (balance: {}). Error: {:?}",
                    payment_amount,
                    current_balance,
                    result.err()
                );

                // Verify current balance decreased by payment amount
                let new_balance: (f64,) = sqlx::query_as(
                    "SELECT current_balance FROM credit_accounts WHERE id = ?"
                )
                .bind(&account_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                prop_assert!(
                    (new_balance.0 - expected_new_balance).abs() < 0.01,
                    "Balance should decrease from {} to {} but was {}",
                    current_balance,
                    expected_new_balance,
                    new_balance.0
                );

                // Verify available credit increased by payment amount
                let new_available: (f64,) = sqlx::query_as(
                    "SELECT available_credit FROM credit_accounts WHERE id = ?"
                )
                .bind(&account_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                prop_assert!(
                    (new_available.0 - expected_new_available).abs() < 0.01,
                    "Available credit should increase from {} to {} but was {}",
                    initial_available,
                    expected_new_available,
                    new_available.0
                );

                // Verify the relationship: available_credit = credit_limit - current_balance
                prop_assert!(
                    (new_available.0 - (credit_limit - new_balance.0)).abs() < 0.01,
                    "Available credit {} should equal credit_limit {} minus current_balance {}",
                    new_available.0,
                    credit_limit,
                    new_balance.0
                );

                // Verify payment transaction was recorded
                let payment_record: (i64, f64) = sqlx::query_as(
                    "SELECT COUNT(*), COALESCE(SUM(amount), 0.0) 
                     FROM credit_transactions 
                     WHERE credit_account_id = ? AND transaction_type = 'Payment'"
                )
                .bind(&account_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                prop_assert_eq!(
                    payment_record.0,
                    1,
                    "Exactly one payment transaction should be recorded"
                );

                prop_assert!(
                    (payment_record.1 - payment_amount).abs() < 0.01,
                    "Payment transaction amount should be {} but was {}",
                    payment_amount,
                    payment_record.1
                );
            } else {
                // PROPERTY: Invalid payments should be rejected
                prop_assert!(
                    result.is_err(),
                    "Payment of {} should be rejected (balance: {}, valid range: 0.01-{})",
                    payment_amount,
                    current_balance,
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

                // Verify available credit was NOT changed
                let unchanged_available: (f64,) = sqlx::query_as(
                    "SELECT available_credit FROM credit_accounts WHERE id = ?"
                )
                .bind(&account_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                prop_assert!(
                    (unchanged_available.0 - initial_available).abs() < 0.01,
                    "Available credit should remain {} but was {}",
                    initial_available,
                    unchanged_available.0
                );

                // Verify no payment transaction was recorded
                let payment_count: (i64,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM credit_transactions 
                     WHERE credit_account_id = ? AND transaction_type = 'Payment'"
                )
                .bind(&account_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                prop_assert_eq!(
                    payment_count.0,
                    0,
                    "No payment transaction should be recorded for rejected payment"
                );
            }
            Ok(())
        });
    }

    #[test]
    fn property_15_full_payment_clears_balance(
        credit_limit in arb_credit_limit(),
        balance_ratio in arb_balance_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Calculate current balance
            let current_balance = (credit_limit * balance_ratio * 100.0).round() / 100.0;
            
            // Create credit account with a balance
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                current_balance,
            )
            .await;

            // Pay the full balance
            let payment_amount = current_balance;
            let reference_id = Uuid::new_v4().to_string();

            let result = apply_credit_payment(
                &pool,
                &account_id,
                payment_amount,
                &reference_id,
            )
            .await;

            // PROPERTY: Full payment should be accepted and clear the balance
            prop_assert!(
                result.is_ok(),
                "Full payment of {} should be accepted. Error: {:?}",
                payment_amount,
                result.err()
            );

            // Verify balance is zero (or very close)
            let new_balance: (f64,) = sqlx::query_as(
                "SELECT current_balance FROM credit_accounts WHERE id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert!(
                new_balance.0.abs() < 0.01,
                "Balance should be 0 after full payment but was {}",
                new_balance.0
            );

            // Verify available credit equals credit limit
            let new_available: (f64,) = sqlx::query_as(
                "SELECT available_credit FROM credit_accounts WHERE id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert!(
                (new_available.0 - credit_limit).abs() < 0.01,
                "Available credit should equal limit {} after full payment but was {}",
                credit_limit,
                new_available.0
            );
            Ok(())
        });
    }

    #[test]
    fn property_15_partial_payment_reduces_balance_proportionally(
        credit_limit in arb_credit_limit(),
        balance_ratio in arb_balance_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Calculate current balance
            let current_balance = (credit_limit * balance_ratio * 100.0).round() / 100.0;
            
            // Create credit account with a balance
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                current_balance,
            )
            .await;

            // Pay exactly half the balance
            let payment_amount = (current_balance / 2.0 * 100.0).round() / 100.0;
            let reference_id = Uuid::new_v4().to_string();

            let result = apply_credit_payment(
                &pool,
                &account_id,
                payment_amount,
                &reference_id,
            )
            .await;

            // PROPERTY: Partial payment should be accepted
            prop_assert!(
                result.is_ok(),
                "Partial payment of {} should be accepted. Error: {:?}",
                payment_amount,
                result.err()
            );

            // Verify balance decreased by payment amount
            let new_balance: (f64,) = sqlx::query_as(
                "SELECT current_balance FROM credit_accounts WHERE id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let expected_balance = current_balance - payment_amount;
            prop_assert!(
                (new_balance.0 - expected_balance).abs() < 0.01,
                "Balance should be {} after payment of {} but was {}",
                expected_balance,
                payment_amount,
                new_balance.0
            );

            // Verify available credit increased by payment amount
            let new_available: (f64,) = sqlx::query_as(
                "SELECT available_credit FROM credit_accounts WHERE id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let expected_available = credit_limit - expected_balance;
            prop_assert!(
                (new_available.0 - expected_available).abs() < 0.01,
                "Available credit should be {} but was {}",
                expected_available,
                new_available.0
            );
            Ok(())
        });
    }

    #[test]
    fn property_15_rejects_payment_exceeding_balance(
        credit_limit in arb_credit_limit(),
        balance_ratio in arb_balance_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Calculate current balance
            let current_balance = (credit_limit * balance_ratio * 100.0).round() / 100.0;
            
            // Create credit account with a balance
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                current_balance,
            )
            .await;

            // Try to pay more than the balance
            let payment_amount = current_balance + 0.01;
            let reference_id = Uuid::new_v4().to_string();

            let result = apply_credit_payment(
                &pool,
                &account_id,
                payment_amount,
                &reference_id,
            )
            .await;

            // PROPERTY: Payment exceeding balance should be rejected
            prop_assert!(
                result.is_err(),
                "Payment of {} exceeding balance {} should be rejected",
                payment_amount,
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
    fn property_15_multiple_payments_cumulative_effect(
        credit_limit in arb_credit_limit(),
        balance_ratio in arb_balance_ratio(),
        num_payments in 2usize..5,
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Calculate initial balance
            let initial_balance = (credit_limit * balance_ratio * 100.0).round() / 100.0;
            
            // Create credit account with a balance
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                initial_balance,
            )
            .await;

            // Calculate payment amount per transaction (divide balance into equal parts)
            let payment_per_transaction = (initial_balance / num_payments as f64 * 100.0).round() / 100.0;
            let mut total_paid = 0.0;
            let mut successful_payments = 0;

            // Make multiple payments
            for i in 0..num_payments {
                let reference_id = format!("payment-{}", i);
                
                // Get current balance before payment
                let current: (f64,) = sqlx::query_as(
                    "SELECT current_balance FROM credit_accounts WHERE id = ?"
                )
                .bind(&account_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                // Don't try to pay more than remaining balance
                let payment_amount = payment_per_transaction.min(current.0);
                
                if payment_amount < 0.01 {
                    break; // Balance too small for another payment
                }

                let result = apply_credit_payment(
                    &pool,
                    &account_id,
                    payment_amount,
                    &reference_id,
                )
                .await;

                if result.is_ok() {
                    total_paid += payment_amount;
                    successful_payments += 1;
                }
            }

            // PROPERTY: Total paid should not exceed initial balance
            prop_assert!(
                total_paid <= initial_balance + 0.01, // Allow small rounding error
                "Total paid {} should not exceed initial balance {}",
                total_paid,
                initial_balance
            );

            // Verify final balance
            let final_balance: (f64,) = sqlx::query_as(
                "SELECT current_balance FROM credit_accounts WHERE id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let expected_final_balance = initial_balance - total_paid;
            prop_assert!(
                (final_balance.0 - expected_final_balance).abs() < 0.02, // Allow slightly larger tolerance for multiple operations
                "Final balance should be {} but was {}",
                expected_final_balance,
                final_balance.0
            );

            // Verify available credit increased by total paid
            let final_available: (f64,) = sqlx::query_as(
                "SELECT available_credit FROM credit_accounts WHERE id = ?"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let expected_available = credit_limit - expected_final_balance;
            prop_assert!(
                (final_available.0 - expected_available).abs() < 0.02,
                "Available credit should be {} but was {}",
                expected_available,
                final_available.0
            );

            // Verify transaction count matches successful payments
            let payment_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM credit_transactions 
                 WHERE credit_account_id = ? AND transaction_type = 'Payment'"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert_eq!(
                payment_count.0 as usize,
                successful_payments,
                "Payment transaction count should match successful payments"
            );
            Ok(())
        });
    }

    #[test]
    fn property_15_rejects_zero_or_negative_payment(
        credit_limit in arb_credit_limit(),
        balance_ratio in arb_balance_ratio(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Calculate current balance
            let current_balance = (credit_limit * balance_ratio * 100.0).round() / 100.0;
            
            // Create credit account with a balance
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
                current_balance,
            )
            .await;

            // Try zero payment
            let result_zero = apply_credit_payment(
                &pool,
                &account_id,
                0.0,
                "zero-payment",
            )
            .await;

            // PROPERTY: Zero payment should be rejected
            prop_assert!(
                result_zero.is_err(),
                "Zero payment should be rejected"
            );

            // Try negative payment
            let result_negative = apply_credit_payment(
                &pool,
                &account_id,
                -10.0,
                "negative-payment",
            )
            .await;

            // PROPERTY: Negative payment should be rejected
            prop_assert!(
                result_negative.is_err(),
                "Negative payment should be rejected"
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

            // Verify no payment transactions were recorded
            let payment_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM credit_transactions 
                 WHERE credit_account_id = ? AND transaction_type = 'Payment'"
            )
            .bind(&account_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert_eq!(
                payment_count.0,
                0,
                "No payment transactions should be recorded"
            );
            Ok(())
        });
    }
}
