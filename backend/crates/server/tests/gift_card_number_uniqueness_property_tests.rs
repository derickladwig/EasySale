// Property-Based Tests for Sales & Customer Management
// Feature: sales-customer-management, Property 17: Gift card number uniqueness
// These tests validate that gift card numbers are unique

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
    1.0..10000.0
}

/// Generate a valid customer ID
fn arb_customer_id() -> impl Strategy<Value = Option<String>> {
    prop_oneof![
        Just(None),
        "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
            .prop_map(|_| Some(Uuid::new_v4().to_string())),
    ]
}

/// Generate a valid expiry date
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

// ============================================================================
// Property Tests
// ============================================================================

// Property 17: Gift card number uniqueness
// For any two gift cards, their card numbers should be different
// **Validates: Requirements 6.1**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_17_gift_card_number_uniqueness(
        card_number1 in arb_card_number(),
        card_number2 in arb_card_number(),
        balance1 in arb_balance(),
        balance2 in arb_balance(),
        customer_id1 in arb_customer_id(),
        customer_id2 in arb_customer_id(),
        expiry_date1 in arb_expiry_date(),
        expiry_date2 in arb_expiry_date(),
        tenant_id1 in arb_tenant_id(),
        tenant_id2 in arb_tenant_id(),
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            
            // Create first gift card
            let card_id1 = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            
            let result1 = sqlx::query(
                "INSERT INTO gift_cards (id, tenant_id, card_number, initial_balance, 
                 current_balance, status, issued_date, expiry_date, customer_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&card_id1)
            .bind(&tenant_id1)
            .bind(&card_number1)
            .bind(balance1)
            .bind(balance1)
            .bind("Active")
            .bind(&now)
            .bind(&expiry_date1)
            .bind(&customer_id1)
            .execute(&pool)
            .await;
            
            // First gift card should be created successfully
            prop_assert!(result1.is_ok(), "First gift card creation should succeed");
            
            // Create second gift card
            let card_id2 = Uuid::new_v4().to_string();
            
            let result2 = sqlx::query(
                "INSERT INTO gift_cards (id, tenant_id, card_number, initial_balance, 
                 current_balance, status, issued_date, expiry_date, customer_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&card_id2)
            .bind(&tenant_id2)
            .bind(&card_number2)
            .bind(balance2)
            .bind(balance2)
            .bind("Active")
            .bind(&now)
            .bind(&expiry_date2)
            .bind(&customer_id2)
            .execute(&pool)
            .await;
            
            // If card numbers are the same, second insert should fail due to UNIQUE constraint
            // If card numbers are different, second insert should succeed
            if card_number1 == card_number2 {
                prop_assert!(result2.is_err(), 
                    "Second gift card with duplicate number should fail due to UNIQUE constraint");
            } else {
                prop_assert!(result2.is_ok(), 
                    "Second gift card with different number should succeed");
                
                // Verify both gift cards exist and have different numbers
                let retrieved1 = sqlx::query_as::<_, GiftCard>(
                    "SELECT id, tenant_id, card_number, initial_balance, current_balance, 
                     status, issued_date, expiry_date, customer_id 
                     FROM gift_cards 
                     WHERE id = ?"
                )
                .bind(&card_id1)
                .fetch_one(&pool)
                .await;
                
                let retrieved2 = sqlx::query_as::<_, GiftCard>(
                    "SELECT id, tenant_id, card_number, initial_balance, current_balance, 
                     status, issued_date, expiry_date, customer_id 
                     FROM gift_cards 
                     WHERE id = ?"
                )
                .bind(&card_id2)
                .fetch_one(&pool)
                .await;
                
                prop_assert!(retrieved1.is_ok(), "First gift card should be retrievable");
                prop_assert!(retrieved2.is_ok(), "Second gift card should be retrievable");
                
                let gc1 = retrieved1.unwrap();
                let gc2 = retrieved2.unwrap();
                
                // Verify card numbers are different
                prop_assert_ne!(gc1.card_number, gc2.card_number, 
                    "Gift card numbers should be different");
            }
            
            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    // Additional property test: Multiple gift cards all have unique numbers
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        #[test]
        fn property_multiple_gift_cards_unique_numbers(
            gift_cards in prop::collection::vec(
                (arb_card_number(), arb_balance(), arb_customer_id(), 
                 arb_expiry_date(), arb_tenant_id()),
                2..5
            )
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = setup_test_db().await;
                let now = Utc::now().to_rfc3339();
                
                let mut card_numbers = Vec::new();
                let mut created_count = 0;
                
                // Try to create multiple gift cards
                for (card_number, balance, customer_id, expiry_date, tenant_id) in gift_cards {
                    let card_id = Uuid::new_v4().to_string();
                    
                    let result = sqlx::query(
                        "INSERT INTO gift_cards (id, tenant_id, card_number, initial_balance, 
                         current_balance, status, issued_date, expiry_date, customer_id)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
                    )
                    .bind(&card_id)
                    .bind(&tenant_id)
                    .bind(&card_number)
                    .bind(balance)
                    .bind(balance)
                    .bind("Active")
                    .bind(&now)
                    .bind(&expiry_date)
                    .bind(&customer_id)
                    .execute(&pool)
                    .await;
                    
                    // If this card number is unique, creation should succeed
                    if !card_numbers.contains(&card_number) {
                        prop_assert!(result.is_ok(), 
                            "Gift card with unique number should be created successfully");
                        card_numbers.push(card_number.clone());
                        created_count += 1;
                    } else {
                        // If duplicate, creation should fail
                        prop_assert!(result.is_err(), 
                            "Gift card with duplicate number should fail");
                    }
                }
                
                // Verify all created gift cards are retrievable
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM gift_cards")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
                
                prop_assert_eq!(count as usize, created_count, 
                    "Number of gift cards in database should match successfully created count");
                
                // Verify all card numbers in database are unique
                let numbers: Vec<String> = sqlx::query_scalar(
                    "SELECT card_number FROM gift_cards"
                )
                .fetch_all(&pool)
                .await
                .unwrap();
                
                let unique_numbers: std::collections::HashSet<_> = numbers.iter().collect();
                prop_assert_eq!(unique_numbers.len(), numbers.len(), 
                    "All gift card numbers in database should be unique");
                
                Ok(())
            }).unwrap();
        }
    }

    // Property test: Gift card number format is preserved
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_gift_card_number_format_preserved(
            card_number in arb_card_number(),
            balance in arb_balance(),
            customer_id in arb_customer_id(),
            expiry_date in arb_expiry_date(),
            tenant_id in arb_tenant_id(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = setup_test_db().await;
                
                let card_id = Uuid::new_v4().to_string();
                let now = Utc::now().to_rfc3339();
                
                // Create gift card
                let result = sqlx::query(
                    "INSERT INTO gift_cards (id, tenant_id, card_number, initial_balance, 
                     current_balance, status, issued_date, expiry_date, customer_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(&card_id)
                .bind(&tenant_id)
                .bind(&card_number)
                .bind(balance)
                .bind(balance)
                .bind("Active")
                .bind(&now)
                .bind(&expiry_date)
                .bind(&customer_id)
                .execute(&pool)
                .await;
                
                prop_assert!(result.is_ok(), "Gift card creation should succeed");
                
                // Retrieve and verify card number is preserved
                let retrieved = sqlx::query_as::<_, GiftCard>(
                    "SELECT id, tenant_id, card_number, initial_balance, current_balance, 
                     status, issued_date, expiry_date, customer_id 
                     FROM gift_cards 
                     WHERE id = ?"
                )
                .bind(&card_id)
                .fetch_one(&pool)
                .await;
                
                prop_assert!(retrieved.is_ok(), "Gift card should be retrievable");
                
                let gc = retrieved.unwrap();
                prop_assert_eq!(&gc.card_number, &card_number, 
                    "Gift card number should be preserved exactly as stored");
                
                Ok(())
            }).unwrap();
        }
    }
}
