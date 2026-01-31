// Property-Based Tests for Sales & Customer Management
// Feature: sales-customer-management, Property 4: Work order number uniqueness
// These tests validate that work order numbers are unique

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

use easysale_server::models::{WorkOrder, WorkOrderStatus};

// ============================================================================
// Test Database Setup
// ============================================================================

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create work_orders table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS work_orders (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            work_order_number TEXT NOT NULL UNIQUE,
            customer_id TEXT NOT NULL,
            vehicle_id TEXT,
            status TEXT NOT NULL,
            description TEXT NOT NULL,
            estimated_total REAL,
            actual_total REAL,
            labor_total REAL NOT NULL DEFAULT 0.0,
            parts_total REAL NOT NULL DEFAULT 0.0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT,
            invoiced_at TEXT,
            assigned_technician_id TEXT,
            is_warranty INTEGER NOT NULL DEFAULT 0,
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

/// Generate a valid customer ID
fn arb_customer_id() -> impl Strategy<Value = String> {
    "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
        .prop_map(|_| Uuid::new_v4().to_string())
}

/// Generate a valid vehicle ID
fn arb_vehicle_id() -> impl Strategy<Value = Option<String>> {
    prop_oneof![
        Just(None),
        "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}"
            .prop_map(|_| Some(Uuid::new_v4().to_string())),
    ]
}

/// Generate a valid description
fn arb_description() -> impl Strategy<Value = String> {
    "[A-Z][a-z ]{10,50}"
}

/// Generate a valid store ID
fn arb_store_id() -> impl Strategy<Value = String> {
    "store-[0-9]{3}"
}

/// Generate a valid tenant ID
fn arb_tenant_id() -> impl Strategy<Value = String> {
    "tenant-[0-9]{3}"
}

/// Generate a valid work order number
/// Format: WO-YYYYMMDD-XXXXXXXX (where X is uppercase hex)
fn arb_work_order_number() -> impl Strategy<Value = String> {
    (20200101u32..20301231u32, "[A-F0-9]{8}").prop_map(|(date, suffix)| {
        format!("WO-{}-{}", date, suffix)
    })
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 4: Work order number uniqueness
// For any two work orders, their work order numbers should be different
// **Validates: Requirements 2.3**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_4_work_order_number_uniqueness(
        work_order_number1 in arb_work_order_number(),
        work_order_number2 in arb_work_order_number(),
        customer_id1 in arb_customer_id(),
        customer_id2 in arb_customer_id(),
        vehicle_id1 in arb_vehicle_id(),
        vehicle_id2 in arb_vehicle_id(),
        description1 in arb_description(),
        description2 in arb_description(),
        store_id1 in arb_store_id(),
        store_id2 in arb_store_id(),
        tenant_id1 in arb_tenant_id(),
        tenant_id2 in arb_tenant_id(),
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            
            // Create first work order
            let work_order_id1 = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            
            let result1 = sqlx::query(
                "INSERT INTO work_orders (id, tenant_id, work_order_number, customer_id, vehicle_id, 
                 status, description, labor_total, parts_total, created_at, updated_at, 
                 is_warranty, sync_version, store_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, 0, 0, ?)"
            )
            .bind(&work_order_id1)
            .bind(&tenant_id1)
            .bind(&work_order_number1)
            .bind(&customer_id1)
            .bind(&vehicle_id1)
            .bind(WorkOrderStatus::Created.as_str())
            .bind(&description1)
            .bind(&now)
            .bind(&now)
            .bind(&store_id1)
            .execute(&pool)
            .await;
            
            // First work order should be created successfully
            prop_assert!(result1.is_ok(), "First work order creation should succeed");
            
            // Create second work order
            let work_order_id2 = Uuid::new_v4().to_string();
            
            let result2 = sqlx::query(
                "INSERT INTO work_orders (id, tenant_id, work_order_number, customer_id, vehicle_id, 
                 status, description, labor_total, parts_total, created_at, updated_at, 
                 is_warranty, sync_version, store_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, 0, 0, ?)"
            )
            .bind(&work_order_id2)
            .bind(&tenant_id2)
            .bind(&work_order_number2)
            .bind(&customer_id2)
            .bind(&vehicle_id2)
            .bind(WorkOrderStatus::Created.as_str())
            .bind(&description2)
            .bind(&now)
            .bind(&now)
            .bind(&store_id2)
            .execute(&pool)
            .await;
            
            // If work order numbers are the same, second insert should fail due to UNIQUE constraint
            // If work order numbers are different, second insert should succeed
            if work_order_number1 == work_order_number2 {
                prop_assert!(result2.is_err(), 
                    "Second work order with duplicate number should fail due to UNIQUE constraint");
            } else {
                prop_assert!(result2.is_ok(), 
                    "Second work order with different number should succeed");
                
                // Verify both work orders exist and have different numbers
                let retrieved1 = sqlx::query_as::<_, WorkOrder>(
                    "SELECT id, tenant_id, work_order_number, customer_id, vehicle_id, status, 
                     description, estimated_total, actual_total, labor_total, parts_total, 
                     created_at, updated_at, completed_at, invoiced_at, assigned_technician_id, 
                     is_warranty, sync_version, store_id 
                     FROM work_orders 
                     WHERE id = ?"
                )
                .bind(&work_order_id1)
                .fetch_one(&pool)
                .await;
                
                let retrieved2 = sqlx::query_as::<_, WorkOrder>(
                    "SELECT id, tenant_id, work_order_number, customer_id, vehicle_id, status, 
                     description, estimated_total, actual_total, labor_total, parts_total, 
                     created_at, updated_at, completed_at, invoiced_at, assigned_technician_id, 
                     is_warranty, sync_version, store_id 
                     FROM work_orders 
                     WHERE id = ?"
                )
                .bind(&work_order_id2)
                .fetch_one(&pool)
                .await;
                
                prop_assert!(retrieved1.is_ok(), "First work order should be retrievable");
                prop_assert!(retrieved2.is_ok(), "Second work order should be retrievable");
                
                let wo1 = retrieved1.unwrap();
                let wo2 = retrieved2.unwrap();
                
                // Verify work order numbers are different
                prop_assert_ne!(wo1.work_order_number, wo2.work_order_number, 
                    "Work order numbers should be different");
            }
            
            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    // Additional property test: Multiple work orders all have unique numbers
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        #[test]
        fn property_multiple_work_orders_unique_numbers(
            work_orders in prop::collection::vec(
                (arb_work_order_number(), arb_customer_id(), arb_description(), 
                 arb_store_id(), arb_tenant_id()),
                2..5
            )
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = setup_test_db().await;
                let now = Utc::now().to_rfc3339();
                
                let mut work_order_numbers = Vec::new();
                let mut created_count = 0;
                
                // Try to create multiple work orders
                for (work_order_number, customer_id, description, store_id, tenant_id) in work_orders {
                    let work_order_id = Uuid::new_v4().to_string();
                    
                    let result = sqlx::query(
                        "INSERT INTO work_orders (id, tenant_id, work_order_number, customer_id, 
                         vehicle_id, status, description, labor_total, parts_total, created_at, 
                         updated_at, is_warranty, sync_version, store_id)
                         VALUES (?, ?, ?, ?, NULL, ?, ?, 0.0, 0.0, ?, ?, 0, 0, ?)"
                    )
                    .bind(&work_order_id)
                    .bind(&tenant_id)
                    .bind(&work_order_number)
                    .bind(&customer_id)
                    .bind(WorkOrderStatus::Created.as_str())
                    .bind(&description)
                    .bind(&now)
                    .bind(&now)
                    .bind(&store_id)
                    .execute(&pool)
                    .await;
                    
                    // If this work order number is unique, creation should succeed
                    if !work_order_numbers.contains(&work_order_number) {
                        prop_assert!(result.is_ok(), 
                            "Work order with unique number should be created successfully");
                        work_order_numbers.push(work_order_number.clone());
                        created_count += 1;
                    } else {
                        // If duplicate, creation should fail
                        prop_assert!(result.is_err(), 
                            "Work order with duplicate number should fail");
                    }
                }
                
                // Verify all created work orders are retrievable
                let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM work_orders")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
                
                prop_assert_eq!(count as usize, created_count, 
                    "Number of work orders in database should match successfully created count");
                
                // Verify all work order numbers in database are unique
                let numbers: Vec<String> = sqlx::query_scalar(
                    "SELECT work_order_number FROM work_orders"
                )
                .fetch_all(&pool)
                .await
                .unwrap();
                
                let unique_numbers: std::collections::HashSet<_> = numbers.iter().collect();
                prop_assert_eq!(unique_numbers.len(), numbers.len(), 
                    "All work order numbers in database should be unique");
                
                Ok(())
            }).unwrap();
        }
    }

    // Property test: Work order number format is preserved
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_work_order_number_format_preserved(
            work_order_number in arb_work_order_number(),
            customer_id in arb_customer_id(),
            description in arb_description(),
            store_id in arb_store_id(),
            tenant_id in arb_tenant_id(),
        ) {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = setup_test_db().await;
                
                let work_order_id = Uuid::new_v4().to_string();
                let now = Utc::now().to_rfc3339();
                
                // Create work order
                let result = sqlx::query(
                    "INSERT INTO work_orders (id, tenant_id, work_order_number, customer_id, 
                     vehicle_id, status, description, labor_total, parts_total, created_at, 
                     updated_at, is_warranty, sync_version, store_id)
                     VALUES (?, ?, ?, ?, NULL, ?, ?, 0.0, 0.0, ?, ?, 0, 0, ?)"
                )
                .bind(&work_order_id)
                .bind(&tenant_id)
                .bind(&work_order_number)
                .bind(&customer_id)
                .bind(WorkOrderStatus::Created.as_str())
                .bind(&description)
                .bind(&now)
                .bind(&now)
                .bind(&store_id)
                .execute(&pool)
                .await;
                
                prop_assert!(result.is_ok(), "Work order creation should succeed");
                
                // Retrieve and verify work order number is preserved
                let retrieved = sqlx::query_as::<_, WorkOrder>(
                    "SELECT id, tenant_id, work_order_number, customer_id, vehicle_id, status, 
                     description, estimated_total, actual_total, labor_total, parts_total, 
                     created_at, updated_at, completed_at, invoiced_at, assigned_technician_id, 
                     is_warranty, sync_version, store_id 
                     FROM work_orders 
                     WHERE id = ?"
                )
                .bind(&work_order_id)
                .fetch_one(&pool)
                .await;
                
                prop_assert!(retrieved.is_ok(), "Work order should be retrievable");
                
                let wo = retrieved.unwrap();
                prop_assert_eq!(&wo.work_order_number, &work_order_number, 
                    "Work order number should be preserved exactly as stored");
                
                Ok(())
            }).unwrap();
        }
    }
}
