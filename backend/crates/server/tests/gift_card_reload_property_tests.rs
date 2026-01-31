// Property-Based Tests for Sales & Customer Management
// Feature: sales-customer-management, Property 19: Gift card reload increases balance
// These tests validate that gift card reload correctly increases the balance

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

use easysale_server::models::GiftCard;

// ============================================================================
// Test Database Setup
// ============================================================================

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create gift_cards table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS gift_cards (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            card_number TEXT NOT NULL UNIQUE,
            initial_balance REAL NOT NULL,
            current_balance REAL NOT NULL,
            status TEXT NOT NULL,
            issued_date TEXT NOT NULL,
            expiry_date TEXT,
            customer_id TEXT
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Create gift_card_transactions table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS gift_card_transactions (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            gift_card_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            amount REAL NOT NULL,
            reference_id TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    pool
}

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a valid gift card number (16 digits)
fn arb_card_number() -> impl Strategy<Value = String> {
    "[0-9]{16}"
}

/// Generate a valid initial balance (positive amount)
fn arb_initial_balance() -> impl Strategy<Value = f64> {
    10.0..10000.0
}

/// Generate a valid reload amount (positive amount)
fn arb_reload_amount() -> impl Strategy<Value = f64> {
    0.01..5000.0
}

/// Generate a valid customer ID
fn arb_customer_id() -> impl Strategy<Value = Option<String>> {
    prop_oneof![
        Just(None),
        "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
            .prop_map(|_| Some(Uuid::new_v4().to_string())),
    ]
}

/// Generate a valid expiry date (future dates)
fn arb_expiry_date() -> impl Strategy<Value = Option<String>> {
    prop_oneof![
        Just(None),
        (2025u32..2030u32, 1u32..13u32, 1u32..29u32).prop_map(|(year, month, day)| {
            Some(format!("{:04}-{:02}-{:02}T00:00:00Z", year, month, day))
        }),
    ]
}

/// Generate a valid tenant ID
fn arb_tenant_id() -> impl Strategy<Value = String> {
    "tenant-[0-9]{3}"
}

/// Generate a valid gift card status (Active or Depleted, not Cancelled)
fn arb_card_status() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("Active".to_string()),
        Just("Depleted".to_string()),
    ]
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Create a gift card in the database
async fn create_gift_card(
    pool: &SqlitePool,
    card_number: &str,
    initial_balance: f64,
    current_balance: f64,
    status: &str,
    tenant_id: &str,
    customer_id: &Option<String>,
    expiry_date: &Option<String>,
) -> Result<String, sqlx::Error> {
    let card_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO gift_cards (id, tenant_id, card_number, initial_balance, 
         current_balance, status, issued_date, expiry_date, customer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&card_id)
    .bind(tenant_id)
    .bind(card_number)
    .bind(initial_balance)
    .bind(current_balance)
    .bind(status)
    .bind(&now)
    .bind(expiry_date)
    .bind(customer_id)
    .execute(pool)
    .await?;
    
    Ok(card_id)
}

/// Reload a gift card
async fn reload_gift_card(
    pool: &SqlitePool,
    card_id: &str,
    amount: f64,
) -> Result<f64, String> {
    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    
    // Fetch gift card
    let card = sqlx::query_as::<_, GiftCard>(
        "SELECT id, tenant_id, card_number, initial_balance, current_balance, 
         status, issued_date, expiry_date, customer_id 
         FROM gift_cards 
         WHERE id = ?"
    )
    .bind(card_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    
    // Check card status - can't reload cancelled cards
    if card.status == "Cancelled" {
        tx.rollback().await.map_err(|e| e.to_string())?;
        return Err("Cannot reload cancelled gift card".to_string());
    }
    
    // Validate amount
    if amount <= 0.0 {
        tx.rollback().await.map_err(|e| e.to_string())?;
        return Err("Reload amount must be greater than zero".to_string());
    }
    
    let new_balance = card.current_balance + amount;
    let new_status = "Active"; // Reactivate if depleted
    
    // Update gift card balance
    sqlx::query(
        "UPDATE gift_cards 
         SET current_balance = ?, status = ? 
         WHERE id = ?"
    )
    .bind(new_balance)
    .bind(new_status)
    .bind(card_id)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    
    // Record transaction
    let transaction_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO gift_card_transactions (id, tenant_id, gift_card_id, transaction_type, 
         amount, reference_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&transaction_id)
    .bind(&card.tenant_id)
    .bind(card_id)
    .bind("Reloaded")
    .bind(amount)
    .bind(None::<String>)
    .bind(&now)
    .execute(&mut *tx)
    .await
    .map_err(|e| e.to_string())?;
    
    tx.commit().await.map_err(|e| e.to_string())?;
    
    Ok(new_balance)
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 19: Gift card reload increases balance
// For any gift card and reload amount, after reloading, the new balance should equal
// the previous balance plus the reload amount
// **Validates: Requirements 6.8**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_19_gift_card_reload_increases_balance(
        card_number in arb_card_number(),
        initial_balance in arb_initial_balance(),
        current_balance in arb_initial_balance(),
        reload_amount in arb_reload_amount(),
        status in arb_card_status(),
        customer_id in arb_customer_id(),
        expiry_date in arb_expiry_date(),
        tenant_id in arb_tenant_id(),
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            
            // Create gift card with current balance
            let card_id = create_gift_card(
                &pool,
                &card_number,
                initial_balance,
                current_balance,
                &status,
                &tenant_id,
                &customer_id,
                &expiry_date,
            )
            .await
            .unwrap();
            
            // Reload the gift card
            let result = reload_gift_card(&pool, &card_id, reload_amount).await;
            
            // Property: Reload should succeed for non-cancelled cards
            prop_assert!(result.is_ok(), 
                "Reload should succeed for {} card, but got error: {:?}", status, result.as_ref().err());
            
            let new_balance = result.unwrap();
            
            // Property: New balance should equal previous balance plus reload amount
            let expected_balance = current_balance + reload_amount;
            prop_assert!(
                (new_balance - expected_balance).abs() < 0.01,
                "New balance ({}) should equal previous balance ({}) plus reload amount ({}), expected {}",
                new_balance, current_balance, reload_amount, expected_balance
            );
            
            // Verify the balance in the database
            let retrieved = sqlx::query_as::<_, GiftCard>(
                "SELECT id, tenant_id, card_number, initial_balance, current_balance, 
                 status, issued_date, expiry_date, customer_id 
                 FROM gift_cards 
                 WHERE id = ?"
            )
            .bind(&card_id)
            .fetch_one(&pool)
            .await
            .unwrap();
            
            prop_assert!(
                (retrieved.current_balance - expected_balance).abs() < 0.01,
                "Database balance ({}) should match expected balance ({})",
                retrieved.current_balance, expected_balance
            );
            
            // Property: Card should be Active after reload (even if it was Depleted)
            prop_assert_eq!(&retrieved.status, "Active", 
                "Card should be Active after reload");
            
            // Verify transaction was recorded
            let transaction_count: i64 = sqlx::query_scalar(
                "SELECT COUNT(*) FROM gift_card_transactions 
                 WHERE gift_card_id = ? AND transaction_type = 'Reloaded'"
            )
            .bind(&card_id)
            .fetch_one(&pool)
            .await
            .unwrap();
            
            prop_assert_eq!(transaction_count, 1, 
                "Exactly one reload transaction should be recorded");
            
            // Verify transaction amount
            let transaction_amount: f64 = sqlx::query_scalar(
                "SELECT amount FROM gift_card_transactions 
                 WHERE gift_card_id = ? AND transaction_type = 'Reloaded'"
            )
            .bind(&card_id)
            .fetch_one(&pool)
            .await
            .unwrap();
            
            prop_assert!(
                (transaction_amount - reload_amount).abs() < 0.01,
                "Transaction amount ({}) should match reload amount ({})",
                transaction_amount, reload_amount
            );
            
            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    // Additional property test: Multiple reloads accumulate correctly
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        #[test]
        fn property_multiple_reloads_accumulate_balance(
            card_number in arb_card_number(),
            initial_balance in 100.0..1000.0,
            reload_amounts in prop::collection::vec(10.0..500.0, 2..5),
            customer_id in arb_customer_id(),
            expiry_date in arb_expiry_date(),
            tenant_id in arb_tenant_id(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = setup_test_db().await;
                
                // Create gift card
                let card_id = create_gift_card(
                    &pool,
                    &card_number,
                    initial_balance,
                    initial_balance,
                    "Active",
                    &tenant_id,
                    &customer_id,
                    &expiry_date,
                )
                .await
                .unwrap();
                
                let mut expected_balance = initial_balance;
                
                // Perform multiple reloads
                for amount in &reload_amounts {
                    let result = reload_gift_card(&pool, &card_id, *amount).await;
                    
                    prop_assert!(result.is_ok(), 
                        "Reload should succeed for amount {}", amount);
                    
                    expected_balance += amount;
                    
                    let new_balance = result.unwrap();
                    prop_assert!(
                        (new_balance - expected_balance).abs() < 0.01,
                        "Balance should be {} after reload, got {}",
                        expected_balance, new_balance
                    );
                }
                
                // Verify final balance
                let retrieved = sqlx::query_as::<_, GiftCard>(
                    "SELECT id, tenant_id, card_number, initial_balance, current_balance, 
                     status, issued_date, expiry_date, customer_id 
                     FROM gift_cards 
                     WHERE id = ?"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                prop_assert!(
                    (retrieved.current_balance - expected_balance).abs() < 0.01,
                    "Final balance ({}) should match expected balance ({})",
                    retrieved.current_balance, expected_balance
                );
                
                // Verify transaction count
                let transaction_count: i64 = sqlx::query_scalar(
                    "SELECT COUNT(*) FROM gift_card_transactions 
                     WHERE gift_card_id = ? AND transaction_type = 'Reloaded'"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                prop_assert_eq!(transaction_count as usize, reload_amounts.len(), 
                    "Transaction count should match number of reloads");
                
                // Verify total reload amount
                let total_reloaded: f64 = sqlx::query_scalar(
                    "SELECT SUM(amount) FROM gift_card_transactions 
                     WHERE gift_card_id = ? AND transaction_type = 'Reloaded'"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                let expected_total: f64 = reload_amounts.iter().sum();
                prop_assert!(
                    (total_reloaded - expected_total).abs() < 0.01,
                    "Total reloaded amount ({}) should match sum of reload amounts ({})",
                    total_reloaded, expected_total
                );
                
                Ok(())
            }).unwrap();
        }
    }

    // Property test: Reloading a depleted card reactivates it
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_reload_reactivates_depleted_card(
            card_number in arb_card_number(),
            initial_balance in 100.0..1000.0,
            reload_amount in 10.0..500.0,
            customer_id in arb_customer_id(),
            expiry_date in arb_expiry_date(),
            tenant_id in arb_tenant_id(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = setup_test_db().await;
                
                // Create a depleted gift card (zero balance)
                let card_id = create_gift_card(
                    &pool,
                    &card_number,
                    initial_balance,
                    0.0, // Depleted
                    "Depleted",
                    &tenant_id,
                    &customer_id,
                    &expiry_date,
                )
                .await
                .unwrap();
                
                // Reload the depleted card
                let result = reload_gift_card(&pool, &card_id, reload_amount).await;
                
                prop_assert!(result.is_ok(), "Reload should succeed for depleted card");
                
                let new_balance = result.unwrap();
                
                // Property: Balance should equal reload amount (since it was zero)
                prop_assert!(
                    (new_balance - reload_amount).abs() < 0.01,
                    "New balance ({}) should equal reload amount ({})",
                    new_balance, reload_amount
                );
                
                // Verify card is reactivated
                let retrieved = sqlx::query_as::<_, GiftCard>(
                    "SELECT id, tenant_id, card_number, initial_balance, current_balance, 
                     status, issued_date, expiry_date, customer_id 
                     FROM gift_cards 
                     WHERE id = ?"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                prop_assert_eq!(&retrieved.status, "Active", 
                    "Depleted card should be reactivated to Active after reload");
                
                Ok(())
            }).unwrap();
        }
    }

    // Property test: Cannot reload cancelled card
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_cannot_reload_cancelled_card(
            card_number in arb_card_number(),
            initial_balance in 100.0..1000.0,
            current_balance in 10.0..1000.0,
            reload_amount in 10.0..500.0,
            customer_id in arb_customer_id(),
            expiry_date in arb_expiry_date(),
            tenant_id in arb_tenant_id(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = setup_test_db().await;
                
                // Create a cancelled gift card
                let card_id = create_gift_card(
                    &pool,
                    &card_number,
                    initial_balance,
                    current_balance,
                    "Cancelled",
                    &tenant_id,
                    &customer_id,
                    &expiry_date,
                )
                .await
                .unwrap();
                
                // Attempt to reload the cancelled card
                let result = reload_gift_card(&pool, &card_id, reload_amount).await;
                
                // Property: Reload should fail for cancelled cards
                prop_assert!(result.is_err(), 
                    "Reload should fail for cancelled card");
                
                prop_assert!(result.unwrap_err().contains("cancelled"), 
                    "Error message should mention cancelled status");
                
                // Verify balance unchanged
                let retrieved = sqlx::query_as::<_, GiftCard>(
                    "SELECT id, tenant_id, card_number, initial_balance, current_balance, 
                     status, issued_date, expiry_date, customer_id 
                     FROM gift_cards 
                     WHERE id = ?"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                prop_assert!(
                    (retrieved.current_balance - current_balance).abs() < 0.01,
                    "Balance should remain unchanged ({}) when reload fails",
                    retrieved.current_balance
                );
                
                prop_assert_eq!(&retrieved.status, "Cancelled", 
                    "Card should remain Cancelled after failed reload");
                
                // Verify no transaction was recorded
                let transaction_count: i64 = sqlx::query_scalar(
                    "SELECT COUNT(*) FROM gift_card_transactions 
                     WHERE gift_card_id = ? AND transaction_type = 'Reloaded'"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                prop_assert_eq!(transaction_count, 0, 
                    "No reload transaction should be recorded when reload fails");
                
                Ok(())
            }).unwrap();
        }
    }

    // Property test: Zero or negative reload amounts are rejected
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        #[test]
        fn property_invalid_reload_amounts_rejected(
            card_number in arb_card_number(),
            initial_balance in 100.0..1000.0,
            invalid_amount in -1000.0..=0.0,
            customer_id in arb_customer_id(),
            expiry_date in arb_expiry_date(),
            tenant_id in arb_tenant_id(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = setup_test_db().await;
                
                // Create gift card
                let card_id = create_gift_card(
                    &pool,
                    &card_number,
                    initial_balance,
                    initial_balance,
                    "Active",
                    &tenant_id,
                    &customer_id,
                    &expiry_date,
                )
                .await
                .unwrap();
                
                // Attempt to reload with invalid amount
                let result = reload_gift_card(&pool, &card_id, invalid_amount).await;
                
                // Property: Reload should fail for zero or negative amounts
                prop_assert!(result.is_err(), 
                    "Reload should fail for invalid amount {}", invalid_amount);
                
                // Verify balance unchanged
                let retrieved = sqlx::query_as::<_, GiftCard>(
                    "SELECT id, tenant_id, card_number, initial_balance, current_balance, 
                     status, issued_date, expiry_date, customer_id 
                     FROM gift_cards 
                     WHERE id = ?"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                prop_assert!(
                    (retrieved.current_balance - initial_balance).abs() < 0.01,
                    "Balance should remain unchanged when reload fails"
                );
                
                Ok(())
            }).unwrap();
        }
    }
}
