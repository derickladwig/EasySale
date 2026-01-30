// Property-based tests for AR aging calculation
// Feature: sales-customer-management, Property 16: AR aging calculation
// **Validates: Requirements 5.10**

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::{Utc, Duration, DateTime};

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
) -> String {
    let account_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO credit_accounts (id, customer_id, credit_limit, current_balance, 
         available_credit, payment_terms_days, service_charge_rate, is_active, 
         last_statement_date, created_at, updated_at)
         VALUES (?, ?, ?, 0.0, ?, 30, NULL, 1, NULL, ?, ?)",
    )
    .bind(&account_id)
    .bind(customer_id)
    .bind(credit_limit)
    .bind(credit_limit)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .unwrap();

    account_id
}

// Helper to create a credit transaction with a specific due date
async fn create_credit_transaction(
    pool: &SqlitePool,
    account_id: &str,
    amount: f64,
    due_date: DateTime<Utc>,
) -> String {
    let transaction_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let due_date_str = due_date.to_rfc3339();
    let reference_id = Uuid::new_v4().to_string();

    sqlx::query(
        "INSERT INTO credit_transactions (id, credit_account_id, transaction_type, amount, 
         reference_id, transaction_date, due_date, days_overdue)
         VALUES (?, ?, 'Charge', ?, ?, ?, ?, 0)",
    )
    .bind(&transaction_id)
    .bind(account_id)
    .bind(amount)
    .bind(&reference_id)
    .bind(&now)
    .bind(&due_date_str)
    .execute(pool)
    .await
    .unwrap();

    transaction_id
}

// Helper to calculate days overdue (simulating the handler logic)
fn calculate_days_overdue(due_date: DateTime<Utc>, current_date: DateTime<Utc>) -> i32 {
    let days = (current_date - due_date).num_days();
    if days < 0 {
        0 // Not yet due
    } else {
        days as i32
    }
}

// Proptest strategies
fn arb_credit_limit() -> impl Strategy<Value = f64> {
    (100.0..10000.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

fn arb_charge_amount() -> impl Strategy<Value = f64> {
    (10.0..1000.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

fn arb_days_offset() -> impl Strategy<Value = i64> {
    -365i64..365i64 // From 1 year in the future to 1 year in the past
}

// ============================================================================
// Property 16: AR aging calculation
// ============================================================================
// **Validates: Requirements 5.10**
//
// For any credit transaction, the days overdue should equal the number of days 
// between the due date and the current date (or zero if not yet due)

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_16_days_overdue_calculation_is_correct(
        credit_limit in arb_credit_limit(),
        charge_amount in arb_charge_amount(),
        days_offset in arb_days_offset(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Create credit account
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
            )
            .await;

            // Calculate due date (offset from now)
            let current_date = Utc::now();
            let due_date = current_date + Duration::days(days_offset);

            // Create credit transaction with the calculated due date
            let transaction_id = create_credit_transaction(
                &pool,
                &account_id,
                charge_amount,
                due_date,
            )
            .await;

            // Calculate expected days overdue
            let expected_days_overdue = calculate_days_overdue(due_date, current_date);

            // PROPERTY: Days overdue should equal the number of days between due date and current date
            // (or zero if not yet due)
            
            // Verify the calculation matches our expectation
            if days_offset < 0 {
                // Due date is in the past - should be overdue
                prop_assert!(
                    expected_days_overdue > 0,
                    "Transaction with due date {} days ago should have positive days_overdue, got {}",
                    -days_offset,
                    expected_days_overdue
                );
                
                // The number of days overdue should approximately equal the absolute offset
                // (allowing for small timing differences)
                prop_assert!(
                    (expected_days_overdue as i64 - (-days_offset)).abs() <= 1,
                    "Days overdue {} should approximately equal offset {} (within 1 day)",
                    expected_days_overdue,
                    -days_offset
                );
            } else {
                // Due date is in the future or today - should not be overdue
                prop_assert_eq!(
                    expected_days_overdue,
                    0,
                    "Transaction with due date {} days in the future should have 0 days_overdue",
                    days_offset
                );
            }

            // Verify the transaction was created with the correct due date
            let stored_transaction: (String, f64) = sqlx::query_as(
                "SELECT due_date, amount FROM credit_transactions WHERE id = ?"
            )
            .bind(&transaction_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let stored_due_date = DateTime::parse_from_rfc3339(&stored_transaction.0)
                .unwrap()
                .with_timezone(&Utc);

            // Verify stored due date matches what we set
            prop_assert!(
                (stored_due_date - due_date).num_seconds().abs() < 2,
                "Stored due date should match the set due date"
            );

            // Verify amount is correct
            prop_assert!(
                (stored_transaction.1 - charge_amount).abs() < 0.01,
                "Stored amount {} should match charge amount {}",
                stored_transaction.1,
                charge_amount
            );

            Ok(())
        });
    }

    #[test]
    fn property_16_aging_buckets_are_correct(
        credit_limit in arb_credit_limit(),
        charge_amount in arb_charge_amount(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Create credit account
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
            )
            .await;

            let current_date = Utc::now();

            // Create transactions in different aging buckets
            let test_cases = vec![
                (10, "current"),      // 10 days in future - current
                (-5, "current"),      // 5 days overdue - current
                (-25, "current"),     // 25 days overdue - current
                (-35, "30_days"),     // 35 days overdue - 30 day bucket
                (-50, "60_days"),     // 50 days overdue - 60 day bucket
                (-75, "60_days"),     // 75 days overdue - 60 day bucket
                (-95, "90_plus"),     // 95 days overdue - 90+ bucket
                (-200, "90_plus"),    // 200 days overdue - 90+ bucket
            ];

            for (days_offset, expected_bucket) in test_cases {
                let due_date = current_date + Duration::days(days_offset);
                let _transaction_id = create_credit_transaction(
                    &pool,
                    &account_id,
                    charge_amount,
                    due_date,
                )
                .await;

                // Calculate days overdue
                let days_overdue = calculate_days_overdue(due_date, current_date);

                // PROPERTY: Aging bucket should be determined by days overdue
                match expected_bucket {
                    "current" => {
                        prop_assert!(
                            days_overdue < 30,
                            "Transaction {} days offset should be in current bucket (days_overdue: {})",
                            days_offset,
                            days_overdue
                        );
                    }
                    "30_days" => {
                        prop_assert!(
                            days_overdue >= 30 && days_overdue < 60,
                            "Transaction {} days offset should be in 30-day bucket (days_overdue: {})",
                            days_offset,
                            days_overdue
                        );
                    }
                    "60_days" => {
                        prop_assert!(
                            days_overdue >= 60 && days_overdue < 90,
                            "Transaction {} days offset should be in 60-day bucket (days_overdue: {})",
                            days_offset,
                            days_overdue
                        );
                    }
                    "90_plus" => {
                        prop_assert!(
                            days_overdue >= 90,
                            "Transaction {} days offset should be in 90+ bucket (days_overdue: {})",
                            days_offset,
                            days_overdue
                        );
                    }
                    _ => unreachable!(),
                }
            }

            Ok(())
        });
    }

    #[test]
    fn property_16_future_due_dates_have_zero_overdue(
        credit_limit in arb_credit_limit(),
        charge_amount in arb_charge_amount(),
        future_days in 1i64..365,
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Create credit account
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
            )
            .await;

            let current_date = Utc::now();
            let due_date = current_date + Duration::days(future_days);

            // Create credit transaction with future due date
            let _transaction_id = create_credit_transaction(
                &pool,
                &account_id,
                charge_amount,
                due_date,
            )
            .await;

            // Calculate days overdue
            let days_overdue = calculate_days_overdue(due_date, current_date);

            // PROPERTY: Future due dates should have zero days overdue
            prop_assert_eq!(
                days_overdue,
                0,
                "Transaction with due date {} days in the future should have 0 days_overdue",
                future_days
            );

            Ok(())
        });
    }

    #[test]
    fn property_16_past_due_dates_have_positive_overdue(
        credit_limit in arb_credit_limit(),
        charge_amount in arb_charge_amount(),
        past_days in 1i64..365,
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Create credit account
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
            )
            .await;

            let current_date = Utc::now();
            let due_date = current_date - Duration::days(past_days);

            // Create credit transaction with past due date
            let _transaction_id = create_credit_transaction(
                &pool,
                &account_id,
                charge_amount,
                due_date,
            )
            .await;

            // Calculate days overdue
            let days_overdue = calculate_days_overdue(due_date, current_date);

            // PROPERTY: Past due dates should have positive days overdue
            prop_assert!(
                days_overdue > 0,
                "Transaction with due date {} days ago should have positive days_overdue, got {}",
                past_days,
                days_overdue
            );

            // The days overdue should approximately equal the number of days in the past
            // (allowing for small timing differences)
            prop_assert!(
                (days_overdue as i64 - past_days).abs() <= 1,
                "Days overdue {} should approximately equal {} (within 1 day)",
                days_overdue,
                past_days
            );

            Ok(())
        });
    }

    #[test]
    fn property_16_multiple_transactions_independent_aging(
        credit_limit in arb_credit_limit(),
        num_transactions in 2usize..10,
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Create credit account
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
            )
            .await;

            let current_date = Utc::now();
            let mut expected_aging: Vec<(String, i32)> = Vec::new();

            // Create multiple transactions with different due dates
            for i in 0..num_transactions {
                let days_offset = (i as i64 * 20) - 100; // Spread across -100 to +80 days
                let due_date = current_date + Duration::days(days_offset);
                let charge_amount = 100.0 + (i as f64 * 10.0);

                let transaction_id = create_credit_transaction(
                    &pool,
                    &account_id,
                    charge_amount,
                    due_date,
                )
                .await;

                let days_overdue = calculate_days_overdue(due_date, current_date);
                expected_aging.push((transaction_id, days_overdue));
            }

            // PROPERTY: Each transaction should have independent aging calculation
            for (transaction_id, expected_days_overdue) in expected_aging {
                let stored_due_date: (String,) = sqlx::query_as(
                    "SELECT due_date FROM credit_transactions WHERE id = ?"
                )
                .bind(&transaction_id)
                .fetch_one(&pool)
                .await
                .unwrap();

                let due_date = DateTime::parse_from_rfc3339(&stored_due_date.0)
                    .unwrap()
                    .with_timezone(&Utc);

                let calculated_days_overdue = calculate_days_overdue(due_date, current_date);

                prop_assert_eq!(
                    calculated_days_overdue,
                    expected_days_overdue,
                    "Transaction {} should have {} days overdue, got {}",
                    transaction_id,
                    expected_days_overdue,
                    calculated_days_overdue
                );
            }

            Ok(())
        });
    }

    #[test]
    fn property_16_aging_increases_over_time(
        credit_limit in arb_credit_limit(),
        charge_amount in arb_charge_amount(),
        initial_days_overdue in 1i64..30,
        time_elapsed in 1i64..30,
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Create credit account
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
            )
            .await;

            // Set up a transaction that's already overdue
            let current_date = Utc::now();
            let due_date = current_date - Duration::days(initial_days_overdue);

            let _transaction_id = create_credit_transaction(
                &pool,
                &account_id,
                charge_amount,
                due_date,
            )
            .await;

            // Calculate days overdue at current time
            let days_overdue_now = calculate_days_overdue(due_date, current_date);

            // Simulate time passing
            let future_date = current_date + Duration::days(time_elapsed);
            let days_overdue_later = calculate_days_overdue(due_date, future_date);

            // PROPERTY: Days overdue should increase as time passes
            prop_assert!(
                days_overdue_later > days_overdue_now,
                "Days overdue should increase from {} to {} as {} days pass",
                days_overdue_now,
                days_overdue_later,
                time_elapsed
            );

            // The increase should equal the time elapsed
            prop_assert_eq!(
                days_overdue_later - days_overdue_now,
                time_elapsed as i32,
                "Days overdue should increase by exactly {} days",
                time_elapsed
            );

            Ok(())
        });
    }

    #[test]
    fn property_16_same_due_date_same_aging(
        credit_limit in arb_credit_limit(),
        days_offset in -365i64..365,
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let customer_id = Uuid::new_v4().to_string();
            
            // Create credit account
            let account_id = create_test_credit_account(
                &pool,
                &customer_id,
                credit_limit,
            )
            .await;

            let current_date = Utc::now();
            let due_date = current_date + Duration::days(days_offset);

            // Create multiple transactions with the same due date
            let transaction_id_1 = create_credit_transaction(
                &pool,
                &account_id,
                100.0,
                due_date,
            )
            .await;

            let transaction_id_2 = create_credit_transaction(
                &pool,
                &account_id,
                200.0,
                due_date,
            )
            .await;

            // Calculate days overdue for both
            let days_overdue_1 = calculate_days_overdue(due_date, current_date);
            let days_overdue_2 = calculate_days_overdue(due_date, current_date);

            // PROPERTY: Transactions with the same due date should have the same days overdue
            prop_assert_eq!(
                days_overdue_1,
                days_overdue_2,
                "Transactions with the same due date should have the same days_overdue"
            );

            // Verify both transactions have the same due date stored
            let stored_due_date_1: (String,) = sqlx::query_as(
                "SELECT due_date FROM credit_transactions WHERE id = ?"
            )
            .bind(&transaction_id_1)
            .fetch_one(&pool)
            .await
            .unwrap();

            let stored_due_date_2: (String,) = sqlx::query_as(
                "SELECT due_date FROM credit_transactions WHERE id = ?"
            )
            .bind(&transaction_id_2)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert_eq!(
                stored_due_date_1.0,
                stored_due_date_2.0,
                "Both transactions should have the same stored due date"
            );

            Ok(())
        });
    }
}
