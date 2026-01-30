// Property-Based Tests for Sales & Customer Management
// Feature: sales-customer-management, Property 18: Gift card redemption balance check
// These tests validate that gift card redemption correctly updates balances

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

use EasySale_server::models::GiftCard;

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

/// Generate a valid balance (positive amount)
fn arb_balance() -> impl Strategy<Value = f64> {
    10.0..10000.0
}

/// Generate a valid redemption amount (positive, typically less than balance)
fn arb_redemption_amount() -> impl Strategy<Value = f64> {
    0.01..1000.0
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

/// Generate a valid reference ID
fn arb_reference_id() -> impl Strategy<Value = Option<String>> {
    prop_oneof![
        Just(None),
        "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
            .prop_map(|_| Some(Uuid::new_v4().to_string())),
    ]
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Create a gift card in the database
async fn create_gift_card(
    pool: &SqlitePool,
    card_number: &str,
    balance: f64,
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
    .bind(balance)
    .bind(balance)
    .bind("Active")
    .bind(&now)
    .bind(expiry_date)
    .bind(customer_id)
    .execute(pool)
    .await?;
    
    Ok(card_id)
}

/// Redeem from a gift card
async fn redeem_gift_card(
    pool: &SqlitePool,
    card_id: &str,
    amount: f64,
    reference_id: &Option<String>,
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
    
    // Check balance
    if amount > card.current_balance {
        tx.rollback().await.map_err(|e| e.to_string())?;
        return Err(format!("Insufficient balance: {} < {}", card.current_balance, amount));
    }
    
    let new_balance = card.current_balance - amount;
    let new_status = if new_balance <= 0.01 {
        "Depleted"
    } else {
        "Active"
    };
    
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
    .bind("Redeemed")
    .bind(amount)
    .bind(reference_id)
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

// Property 18: Gift card redemption balance check
// For any gift card redemption, the redeemed amount should not exceed the current balance,
// and the new balance should equal the previous balance minus the redeemed amount
// **Validates: Requirements 6.2, 6.3**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_18_gift_card_redemption_balance_check(
        card_number in arb_card_number(),
        initial_balance in arb_balance(),
        redemption_amount in arb_redemption_amount(),
        customer_id in arb_customer_id(),
        expiry_date in arb_expiry_date(),
        tenant_id in arb_tenant_id(),
        reference_id in arb_reference_id(),
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            
            // Create gift card with initial balance
            let card_id = create_gift_card(
                &pool,
                &card_number,
                initial_balance,
                &tenant_id,
                &customer_id,
                &expiry_date,
            )
            .await
            .unwrap();
            
            // Attempt to redeem
            let result = redeem_gift_card(&pool, &card_id, redemption_amount, &reference_id).await;
            
            // Property: Redemption should only succeed if amount <= current balance
            if redemption_amount <= initial_balance {
                // Should succeed
                prop_assert!(result.is_ok(), 
                    "Redemption should succeed when amount ({}) <= balance ({})", 
                    redemption_amount, initial_balance);
                
                let new_balance = result.unwrap();
                
                // Property: New balance should equal previous balance minus redeemed amount
                let expected_balance = initial_balance - redemption_amount;
                prop_assert!(
                    (new_balance - expected_balance).abs() < 0.01,
                    "New balance ({}) should equal previous balance ({}) minus redeemed amount ({}), expected {}",
                    new_balance, initial_balance, redemption_amount, expected_balance
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
                
                // Verify transaction was recorded
                let transaction_count: i64 = sqlx::query_scalar(
                    "SELECT COUNT(*) FROM gift_card_transactions 
                     WHERE gift_card_id = ? AND transaction_type = 'Redeemed'"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                prop_assert_eq!(transaction_count, 1, 
                    "Exactly one redemption transaction should be recorded");
                
                // Verify transaction amount
                let transaction_amount: f64 = sqlx::query_scalar(
                    "SELECT amount FROM gift_card_transactions 
                     WHERE gift_card_id = ? AND transaction_type = 'Redeemed'"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                prop_assert!(
                    (transaction_amount - redemption_amount).abs() < 0.01,
                    "Transaction amount ({}) should match redemption amount ({})",
                    transaction_amount, redemption_amount
                );
                
            } else {
                // Should fail - amount exceeds balance
                prop_assert!(result.is_err(), 
                    "Redemption should fail when amount ({}) > balance ({})", 
                    redemption_amount, initial_balance);
                
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
                    "Balance should remain unchanged ({}) when redemption fails",
                    retrieved.current_balance
                );
                
                // Verify no transaction was recorded
                let transaction_count: i64 = sqlx::query_scalar(
                    "SELECT COUNT(*) FROM gift_card_transactions 
                     WHERE gift_card_id = ? AND transaction_type = 'Redeemed'"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                prop_assert_eq!(transaction_count, 0, 
                    "No redemption transaction should be recorded when redemption fails");
            }
            
            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    // Additional property test: Multiple redemptions deplete balance correctly
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        #[test]
        fn property_multiple_redemptions_deplete_balance(
            card_number in arb_card_number(),
            initial_balance in 100.0..1000.0,
            redemption_amounts in prop::collection::vec(1.0..50.0, 2..5),
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
                    &tenant_id,
                    &customer_id,
                    &expiry_date,
                )
                .await
                .unwrap();
                
                let mut expected_balance = initial_balance;
                let mut successful_redemptions = 0;
                
                // Attempt multiple redemptions
                for amount in redemption_amounts {
                    let result = redeem_gift_card(&pool, &card_id, amount, &None).await;
                    
                    if amount <= expected_balance {
                        prop_assert!(result.is_ok(), 
                            "Redemption should succeed when amount ({}) <= balance ({})", 
                            amount, expected_balance);
                        
                        expected_balance -= amount;
                        successful_redemptions += 1;
                        
                        let new_balance = result.unwrap();
                        prop_assert!(
                            (new_balance - expected_balance).abs() < 0.01,
                            "Balance should be {} after redemption, got {}",
                            expected_balance, new_balance
                        );
                    } else {
                        prop_assert!(result.is_err(), 
                            "Redemption should fail when amount ({}) > balance ({})", 
                            amount, expected_balance);
                    }
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
                     WHERE gift_card_id = ? AND transaction_type = 'Redeemed'"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await
                .unwrap();
                
                prop_assert_eq!(transaction_count as usize, successful_redemptions, 
                    "Transaction count should match successful redemptions");
                
                Ok(())
            }).unwrap();
        }
    }

    // Property test: Partial redemption leaves correct balance
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_partial_redemption_balance(
            card_number in arb_card_number(),
            initial_balance in 100.0..1000.0,
            redemption_percentage in 0.1..0.9,
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
                    &tenant_id,
                    &customer_id,
                    &expiry_date,
                )
                .await
                .unwrap();
                
                // Redeem a percentage of the balance
                let redemption_amount = initial_balance * redemption_percentage;
                let result = redeem_gift_card(&pool, &card_id, redemption_amount, &None).await;
                
                prop_assert!(result.is_ok(), "Partial redemption should succeed");
                
                let new_balance = result.unwrap();
                let expected_balance = initial_balance - redemption_amount;
                
                prop_assert!(
                    (new_balance - expected_balance).abs() < 0.01,
                    "New balance ({}) should equal initial balance ({}) minus redemption ({})",
                    new_balance, initial_balance, redemption_amount
                );
                
                // Verify card is still active (not depleted)
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
                    "Card should remain Active after partial redemption");
                
                Ok(())
            }).unwrap();
        }
    }

    // Property test: Full redemption depletes card
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_full_redemption_depletes_card(
            card_number in arb_card_number(),
            initial_balance in 10.0..1000.0,
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
                    &tenant_id,
                    &customer_id,
                    &expiry_date,
                )
                .await
                .unwrap();
                
                // Redeem full balance
                let result = redeem_gift_card(&pool, &card_id, initial_balance, &None).await;
                
                prop_assert!(result.is_ok(), "Full redemption should succeed");
                
                let new_balance = result.unwrap();
                
                prop_assert!(
                    new_balance.abs() < 0.01,
                    "Balance should be zero after full redemption, got {}",
                    new_balance
                );
                
                // Verify card is depleted
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
                
                prop_assert_eq!(&retrieved.status, "Depleted", 
                    "Card should be Depleted after full redemption");
                
                Ok(())
            }).unwrap();
        }
    }
}
