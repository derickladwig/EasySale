// Property-Based Tests for Sales & Customer Management
// Feature: sales-customer-management
// These tests validate correctness properties for customer operations

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

use EasySale_server::models::{Customer, PricingTier};

// ============================================================================
// Test Database Setup
// ============================================================================

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create customers table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            pricing_tier TEXT NOT NULL DEFAULT 'Retail',
            loyalty_points INTEGER NOT NULL DEFAULT 0,
            store_credit REAL NOT NULL DEFAULT 0.0,
            credit_limit REAL,
            credit_balance REAL NOT NULL DEFAULT 0.0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            sync_version INTEGER NOT NULL DEFAULT 0,
            store_id TEXT NOT NULL
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

/// Generate a valid customer name
fn arb_customer_name() -> impl Strategy<Value = String> {
    "[A-Z][a-z]{2,15} [A-Z][a-z]{2,15}"
}

/// Generate a valid email
fn arb_email() -> impl Strategy<Value = String> {
    "[a-z]{3,10}@[a-z]{3,10}\\.(com|org|net)"
}

/// Generate a valid phone number
fn arb_phone() -> impl Strategy<Value = String> {
    "[0-9]{3}-[0-9]{3}-[0-9]{4}"
}

/// Generate a valid pricing tier
fn arb_pricing_tier() -> impl Strategy<Value = PricingTier> {
    prop_oneof![
        Just(PricingTier::Retail),
        Just(PricingTier::Wholesale),
        Just(PricingTier::Contractor),
        Just(PricingTier::VIP),
    ]
}

/// Generate a valid store ID
fn arb_store_id() -> impl Strategy<Value = String> {
    "store-[0-9]{3}"
}

/// Generate a valid tenant ID
fn arb_tenant_id() -> impl Strategy<Value = String> {
    "tenant-[0-9]{3}"
}

/// Generate loyalty points
fn arb_loyalty_points() -> impl Strategy<Value = i32> {
    0..10000i32
}

/// Generate store credit
fn arb_store_credit() -> impl Strategy<Value = f64> {
    0.0..1000.0f64
}

/// Generate credit limit
fn arb_credit_limit() -> impl Strategy<Value = Option<f64>> {
    prop_oneof![
        Just(None),
        (100.0..10000.0f64).prop_map(Some),
    ]
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 28: Entity creation completeness
// For any created customer entity, all required fields should be populated 
// and the record should be retrievable by its ID
// **Validates: Requirements 4.1**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_28_entity_creation_completeness(
        name in arb_customer_name(),
        email in prop::option::of(arb_email()),
        phone in prop::option::of(arb_phone()),
        pricing_tier in arb_pricing_tier(),
        store_id in arb_store_id(),
        tenant_id in arb_tenant_id(),
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            
            // Create customer
            let customer_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            let pricing_tier_str = pricing_tier.as_str();
            
            let result = sqlx::query(
                "INSERT INTO customers (id, tenant_id, name, email, phone, pricing_tier, 
                 loyalty_points, store_credit, credit_balance, created_at, updated_at, 
                 sync_version, store_id)
                 VALUES (?, ?, ?, ?, ?, ?, 0, 0.0, 0.0, ?, ?, 0, ?)"
            )
            .bind(&customer_id)
            .bind(&tenant_id)
            .bind(&name)
            .bind(&email)
            .bind(&phone)
            .bind(pricing_tier_str)
            .bind(&now)
            .bind(&now)
            .bind(&store_id)
            .execute(&pool)
            .await;
            
            // Verify creation succeeded
            prop_assert!(result.is_ok(), "Customer creation should succeed");
            
            // Retrieve the customer by ID
            let retrieved = sqlx::query_as::<_, Customer>(
                "SELECT id, tenant_id, name, email, phone, pricing_tier, loyalty_points, 
                 store_credit, credit_limit, credit_balance, created_at, updated_at, 
                 sync_version, store_id 
                 FROM customers 
                 WHERE id = ?"
            )
            .bind(&customer_id)
            .fetch_one(&pool)
            .await;
            
            // Verify retrieval succeeded
            prop_assert!(retrieved.is_ok(), "Customer should be retrievable by ID");
            
            let customer = retrieved.unwrap();
            
            // Verify all required fields are populated
            prop_assert_eq!(&customer.id, &customer_id, "ID should match");
            prop_assert_eq!(&customer.tenant_id, &tenant_id, "Tenant ID should match");
            prop_assert_eq!(&customer.name, &name, "Name should match");
            prop_assert_eq!(&customer.email, &email, "Email should match");
            prop_assert_eq!(&customer.phone, &phone, "Phone should match");
            
            // Store pricing tier string to avoid lifetime issues
            let retrieved_tier = customer.pricing_tier();
            prop_assert_eq!(retrieved_tier.as_str(), pricing_tier_str, "Pricing tier should match");
            
            prop_assert_eq!(customer.loyalty_points, 0, "Initial loyalty points should be 0");
            prop_assert_eq!(customer.store_credit, 0.0, "Initial store credit should be 0.0");
            prop_assert_eq!(customer.credit_balance, 0.0, "Initial credit balance should be 0.0");
            prop_assert_eq!(&customer.store_id, &store_id, "Store ID should match");
            prop_assert_eq!(customer.sync_version, 0, "Initial sync version should be 0");
            prop_assert!(!customer.created_at.is_empty(), "Created timestamp should be populated");
            prop_assert!(!customer.updated_at.is_empty(), "Updated timestamp should be populated");
            
            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    // Additional property test: Customer with all optional fields
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_customer_creation_with_optional_fields(
            name in arb_customer_name(),
            email in arb_email(),
            phone in arb_phone(),
            pricing_tier in arb_pricing_tier(),
            loyalty_points in arb_loyalty_points(),
            store_credit in arb_store_credit(),
            credit_limit in arb_credit_limit(),
            store_id in arb_store_id(),
            tenant_id in arb_tenant_id(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = setup_test_db().await;
                
                let customer_id = Uuid::new_v4().to_string();
                let now = Utc::now().to_rfc3339();
                let pricing_tier_str = pricing_tier.as_str();
                
                // Create customer with all fields
                let result = sqlx::query(
                    "INSERT INTO customers (id, tenant_id, name, email, phone, pricing_tier, 
                     loyalty_points, store_credit, credit_limit, credit_balance, created_at, 
                     updated_at, sync_version, store_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.0, ?, ?, 0, ?)"
                )
                .bind(&customer_id)
                .bind(&tenant_id)
                .bind(&name)
                .bind(Some(&email))
                .bind(Some(&phone))
                .bind(pricing_tier_str)
                .bind(loyalty_points)
                .bind(store_credit)
                .bind(credit_limit)
                .bind(&now)
                .bind(&now)
                .bind(&store_id)
                .execute(&pool)
                .await;
                
                prop_assert!(result.is_ok(), "Customer creation with optional fields should succeed");
                
                // Retrieve and verify
                let retrieved = sqlx::query_as::<_, Customer>(
                    "SELECT id, tenant_id, name, email, phone, pricing_tier, loyalty_points, 
                     store_credit, credit_limit, credit_balance, created_at, updated_at, 
                     sync_version, store_id 
                     FROM customers 
                     WHERE id = ?"
                )
                .bind(&customer_id)
                .fetch_one(&pool)
                .await;
                
                prop_assert!(retrieved.is_ok(), "Customer should be retrievable");
                
                let customer = retrieved.unwrap();
                prop_assert_eq!(customer.email, Some(email), "Email should match");
                prop_assert_eq!(customer.phone, Some(phone), "Phone should match");
                prop_assert_eq!(customer.loyalty_points, loyalty_points, "Loyalty points should match");
                prop_assert_eq!(customer.store_credit, store_credit, "Store credit should match");
                prop_assert_eq!(customer.credit_limit, credit_limit, "Credit limit should match");
                
                Ok(())
            }).unwrap();
        }
    }

    // Property test: Multiple customers can be created with unique IDs
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        #[test]
        fn property_multiple_customers_unique_ids(
            customers in prop::collection::vec(
                (arb_customer_name(), arb_store_id(), arb_tenant_id()),
                2..5
            )
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = setup_test_db().await;
                let now = Utc::now().to_rfc3339();
                
                let mut customer_ids = Vec::new();
                
                // Create multiple customers
                for (name, store_id, tenant_id) in customers {
                    let customer_id = Uuid::new_v4().to_string();
                    customer_ids.push(customer_id.clone());
                    
                    let result = sqlx::query(
                        "INSERT INTO customers (id, tenant_id, name, email, phone, pricing_tier, 
                         loyalty_points, store_credit, credit_balance, created_at, updated_at, 
                         sync_version, store_id)
                         VALUES (?, ?, ?, NULL, NULL, 'Retail', 0, 0.0, 0.0, ?, ?, 0, ?)"
                    )
                    .bind(&customer_id)
                    .bind(&tenant_id)
                    .bind(&name)
                    .bind(&now)
                    .bind(&now)
                    .bind(&store_id)
                    .execute(&pool)
                    .await;
                    
                    prop_assert!(result.is_ok(), "Each customer creation should succeed");
                }
                
                // Verify all customers are retrievable and have unique IDs
                for customer_id in &customer_ids {
                    let retrieved = sqlx::query_as::<_, Customer>(
                        "SELECT id, tenant_id, name, email, phone, pricing_tier, loyalty_points, 
                         store_credit, credit_limit, credit_balance, created_at, updated_at, 
                         sync_version, store_id 
                         FROM customers 
                         WHERE id = ?"
                    )
                    .bind(customer_id)
                    .fetch_one(&pool)
                    .await;
                    
                    prop_assert!(retrieved.is_ok(), "Each customer should be retrievable");
                }
                
                // Verify IDs are unique
                let unique_ids: std::collections::HashSet<_> = customer_ids.iter().collect();
                prop_assert_eq!(unique_ids.len(), customer_ids.len(), "All customer IDs should be unique");
                
                Ok(())
            }).unwrap();
        }
    }
}
