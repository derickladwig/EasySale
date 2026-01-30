// Property-Based Tests for Sales & Customer Management
// Feature: sales-customer-management, Property 6: Work order completion creates invoice
// These tests validate that work order completion creates invoices and updates inventory

// NOTE: This property test is currently a placeholder because the invoice creation
// functionality is not yet implemented. The current implementation only updates the
// work order status to "Completed" and sets the completed_at timestamp.
//
// According to Requirement 2.6:
// "WHEN a work order is completed, THE System SHALL convert it to an invoice and 
// update inventory for consumed parts"
//
// To fully implement this property test, the following functionality needs to be added:
// 1. Invoice creation when work order status changes to "Completed"
// 2. Inventory updates for all consumed parts in the work order
// 3. Setting the invoiced_at timestamp on the work order
//
// Once the invoice creation functionality is implemented, this test should verify:
// - For any work order with parts, when status changes to "Completed":
//   * An invoice record is created (or invoiced_at is set)
//   * Inventory quantities are reduced for all consumed parts
//   * The work order's actual_total matches the invoice total
//   * All work order lines are reflected in the invoice

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

use EasySale_server::models::{WorkOrder, WorkOrderStatus};

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
            vehicle_id TEXT NOT NULL,
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
    
    // Create work_order_lines table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS work_order_lines (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            work_order_id TEXT NOT NULL,
            line_type TEXT NOT NULL,
            product_id TEXT,
            description TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL,
            is_warranty INTEGER NOT NULL DEFAULT 0,
            FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE
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
    Just(Uuid::new_v4().to_string())
}

/// Generate a valid vehicle ID
fn arb_vehicle_id() -> impl Strategy<Value = String> {
    Just(Uuid::new_v4().to_string())
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
fn arb_work_order_number() -> impl Strategy<Value = String> {
    (20200101u32..20301231u32, "[A-F0-9]{8}").prop_map(|(date, suffix)| {
        format!("WO-{}-{}", date, suffix)
    })
}

/// Generate a valid labor total
fn arb_labor_total() -> impl Strategy<Value = f64> {
    (0.0..5000.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

/// Generate a valid parts total
fn arb_parts_total() -> impl Strategy<Value = f64> {
    (0.0..10000.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 6: Work order completion creates invoice
// For any work order, when its status changes to "Completed", an invoice should be 
// created and inventory should be updated for all consumed parts
// **Validates: Requirements 2.6**

// PLACEHOLDER TEST: This test currently only verifies that the work order status
// changes to "Completed" and completed_at is set. Once invoice creation is implemented,
// this test should be expanded to verify invoice creation and inventory updates.

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_6_work_order_completion_placeholder(
        work_order_number in arb_work_order_number(),
        customer_id in arb_customer_id(),
        vehicle_id in arb_vehicle_id(),
        description in arb_description(),
        store_id in arb_store_id(),
        tenant_id in arb_tenant_id(),
        labor_total in arb_labor_total(),
        parts_total in arb_parts_total(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            
            // Create a work order in "Created" status
            let work_order_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            
            let result = sqlx::query(
                "INSERT INTO work_orders (id, tenant_id, work_order_number, customer_id, vehicle_id, 
                 status, description, labor_total, parts_total, created_at, updated_at, 
                 is_warranty, sync_version, store_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)"
            )
            .bind(&work_order_id)
            .bind(&tenant_id)
            .bind(&work_order_number)
            .bind(&customer_id)
            .bind(&vehicle_id)
            .bind(WorkOrderStatus::Created.as_str())
            .bind(&description)
            .bind(labor_total)
            .bind(parts_total)
            .bind(&now)
            .bind(&now)
            .bind(&store_id)
            .execute(&pool)
            .await;
            
            prop_assert!(result.is_ok(), "Work order creation should succeed");
            
            // Simulate completing the work order
            let completed_at = Utc::now().to_rfc3339();
            let actual_total = labor_total + parts_total;
            
            let complete_result = sqlx::query(
                "UPDATE work_orders 
                 SET status = ?, actual_total = ?, completed_at = ?, updated_at = ?, 
                     sync_version = sync_version + 1
                 WHERE id = ? AND tenant_id = ?"
            )
            .bind(WorkOrderStatus::Completed.as_str())
            .bind(actual_total)
            .bind(&completed_at)
            .bind(&completed_at)
            .bind(&work_order_id)
            .bind(&tenant_id)
            .execute(&pool)
            .await;
            
            prop_assert!(complete_result.is_ok(), "Work order completion should succeed");
            
            // Retrieve the completed work order
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
            
            prop_assert!(retrieved.is_ok(), "Completed work order should be retrievable");
            
            let wo = retrieved.unwrap();
            
            // Verify the work order status changed to Completed
            prop_assert_eq!(wo.status(), WorkOrderStatus::Completed, 
                "Work order status should be Completed");
            
            // Verify completed_at is set
            prop_assert!(wo.completed_at.is_some(), 
                "Work order completed_at should be set");
            
            // Verify actual_total is calculated correctly
            let expected_total = labor_total + parts_total;
            let diff = (wo.actual_total.unwrap_or(0.0) - expected_total).abs();
            prop_assert!(diff < 0.01, 
                "Work order actual_total should equal labor_total + parts_total");
            
            // TODO: Once invoice creation is implemented, add these assertions:
            // 1. Verify an invoice record exists (or invoiced_at is set)
            // 2. Verify inventory quantities are reduced for all parts
            // 3. Verify invoice total matches work order actual_total
            // 4. Verify all work order lines are reflected in the invoice
            
            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    // Unit test: Verify current implementation behavior
    #[tokio::test]
    async fn test_work_order_completion_current_implementation() {
        let pool = setup_test_db().await;
        
        // Create a work order
        let work_order_id = Uuid::new_v4().to_string();
        let tenant_id = "tenant-001";
        let work_order_number = "WO-20240101-ABCD1234";
        let customer_id = Uuid::new_v4().to_string();
        let vehicle_id = Uuid::new_v4().to_string();
        let description = "Oil change and tire rotation";
        let store_id = "store-001";
        let labor_total = 75.00;
        let parts_total = 125.50;
        let now = Utc::now().to_rfc3339();
        
        sqlx::query(
            "INSERT INTO work_orders (id, tenant_id, work_order_number, customer_id, vehicle_id, 
             status, description, labor_total, parts_total, created_at, updated_at, 
             is_warranty, sync_version, store_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)"
        )
        .bind(&work_order_id)
        .bind(tenant_id)
        .bind(work_order_number)
        .bind(&customer_id)
        .bind(&vehicle_id)
        .bind(WorkOrderStatus::Created.as_str())
        .bind(description)
        .bind(labor_total)
        .bind(parts_total)
        .bind(&now)
        .bind(&now)
        .bind(store_id)
        .execute(&pool)
        .await
        .unwrap();
        
        // Complete the work order
        let completed_at = Utc::now().to_rfc3339();
        let actual_total = labor_total + parts_total;
        
        sqlx::query(
            "UPDATE work_orders 
             SET status = ?, actual_total = ?, completed_at = ?, updated_at = ?, 
                 sync_version = sync_version + 1
             WHERE id = ? AND tenant_id = ?"
        )
        .bind(WorkOrderStatus::Completed.as_str())
        .bind(actual_total)
        .bind(&completed_at)
        .bind(&completed_at)
        .bind(&work_order_id)
        .bind(tenant_id)
        .execute(&pool)
        .await
        .unwrap();
        
        // Verify the work order is completed
        let wo = sqlx::query_as::<_, WorkOrder>(
            "SELECT id, tenant_id, work_order_number, customer_id, vehicle_id, status, 
             description, estimated_total, actual_total, labor_total, parts_total, 
             created_at, updated_at, completed_at, invoiced_at, assigned_technician_id, 
             is_warranty, sync_version, store_id 
             FROM work_orders 
             WHERE id = ?"
        )
        .bind(&work_order_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        assert_eq!(wo.status(), WorkOrderStatus::Completed);
        assert!(wo.completed_at.is_some());
        assert_eq!(wo.actual_total.unwrap(), 200.50);
        
        // NOTE: invoiced_at is currently None because invoice creation is not implemented
        assert!(wo.invoiced_at.is_none(), 
            "invoiced_at should be None until invoice creation is implemented");
    }

    // Unit test: Document expected behavior once invoice creation is implemented
    #[tokio::test]
    #[ignore] // Ignore until invoice creation is implemented
    async fn test_work_order_completion_with_invoice_creation() {
        let _pool = setup_test_db().await;
        
        // TODO: Once invoice creation is implemented, this test should:
        // 1. Create a work order with parts
        // 2. Complete the work order
        // 3. Verify an invoice is created
        // 4. Verify inventory is updated for consumed parts
        // 5. Verify invoiced_at is set on the work order
        
        // This is a placeholder for the future implementation
        panic!("This test should be implemented once invoice creation functionality is added");
    }
}
