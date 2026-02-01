// Property-Based Tests for Work Order Invoice Creation
// Feature: feature-flags-implementation, Task P0-1: Work Order Invoice Creation
// These tests validate that work order completion creates invoices and updates inventory
//
// According to Requirement 2.1:
// "When work order status changes to 'completed', automatically create invoice,
// reduce inventory for all parts, and set invoiced_at timestamp"
//
// **Validates: Requirements 2.1**

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

use easysale_server::models::{WorkOrder, WorkOrderStatus};
use easysale_server::services::invoice_service::InvoiceService;

// ============================================================================
// Test Database Setup
// ============================================================================

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create work_orders table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS work_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            work_order_number TEXT NOT NULL UNIQUE,
            customer_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            description TEXT NOT NULL,
            estimated_total REAL,
            actual_total REAL,
            total_amount REAL NOT NULL DEFAULT 0.0,
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
    
    // Create work_order_items table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS work_order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            work_order_id INTEGER NOT NULL,
            product_id INTEGER,
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
    
    // Create invoices table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            invoice_number TEXT NOT NULL,
            work_order_id INTEGER,
            customer_id INTEGER NOT NULL,
            invoice_date TEXT NOT NULL,
            due_date TEXT,
            subtotal REAL NOT NULL,
            tax_amount REAL NOT NULL,
            discount_amount REAL NOT NULL DEFAULT 0,
            total_amount REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft',
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
            UNIQUE(tenant_id, invoice_number)
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Create invoice_line_items table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS invoice_line_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            product_id INTEGER,
            description TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            tax_rate REAL NOT NULL DEFAULT 0,
            discount_rate REAL NOT NULL DEFAULT 0,
            line_total REAL NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (invoice_id) REFERENCES invoices(id)
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Create products table for inventory tracking
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            sku TEXT NOT NULL,
            name TEXT NOT NULL,
            quantity_on_hand REAL NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(tenant_id, sku)
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
fn arb_customer_id() -> impl Strategy<Value = i64> {
    (1i64..1000000i64)
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

// Property 1: Work order completion creates invoice with inventory reduction
// For any work order with parts, when its status changes to "Completed", an invoice should be 
// created, inventory should be updated for all consumed parts, and invoiced_at should be set
// **Validates: Requirements 2.1**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(50))]

    #[test]
    fn property_1_work_order_completion_creates_invoice(
        work_order_number in arb_work_order_number(),
        customer_id in arb_customer_id(),
        description in arb_description(),
        store_id in arb_store_id(),
        tenant_id in arb_tenant_id(),
        labor_total in arb_labor_total(),
        parts_total in arb_parts_total(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            let invoice_service = InvoiceService::new(pool.clone());
            
            // Create a product for inventory tracking
            let product_id: i64 = sqlx::query_scalar(
                "INSERT INTO products (tenant_id, sku, name, quantity_on_hand) 
                 VALUES (?, ?, ?, ?) RETURNING id"
            )
            .bind(&tenant_id)
            .bind("TEST-SKU-001")
            .bind("Test Product")
            .bind(100.0) // Initial inventory
            .fetch_one(&pool)
            .await
            .unwrap();
            
            // Create a work order in "Created" status
            let now = Utc::now().to_rfc3339();
            let total_amount = labor_total + parts_total;
            
            let work_order_id: i64 = sqlx::query_scalar(
                "INSERT INTO work_orders (tenant_id, work_order_number, customer_id, 
                 status, description, labor_total, parts_total, total_amount, created_at, updated_at, 
                 is_warranty, sync_version, store_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?) RETURNING id"
            )
            .bind(&tenant_id)
            .bind(&work_order_number)
            .bind(customer_id)
            .bind(WorkOrderStatus::Created.as_str())
            .bind(&description)
            .bind(labor_total)
            .bind(parts_total)
            .bind(total_amount)
            .bind(&now)
            .bind(&now)
            .bind(&store_id)
            .fetch_one(&pool)
            .await
            .unwrap();
            
            // Add work order items (parts)
            let parts_quantity = 2.0;
            sqlx::query(
                "INSERT INTO work_order_items (tenant_id, work_order_id, product_id, description, quantity, unit_price, total_price)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&tenant_id)
            .bind(work_order_id)
            .bind(product_id)
            .bind("Test Part")
            .bind(parts_quantity)
            .bind(parts_total / parts_quantity)
            .bind(parts_total)
            .execute(&pool)
            .await
            .unwrap();
            
            // Complete the work order
            let completed_at = Utc::now().to_rfc3339();
            sqlx::query(
                "UPDATE work_orders 
                 SET status = ?, actual_total = ?, completed_at = ?, updated_at = ?, 
                     sync_version = sync_version + 1
                 WHERE id = ? AND tenant_id = ?"
            )
            .bind(WorkOrderStatus::Completed.as_str())
            .bind(total_amount)
            .bind(&completed_at)
            .bind(&completed_at)
            .bind(work_order_id)
            .bind(&tenant_id)
            .execute(&pool)
            .await
            .unwrap();
            
            // Create invoice from work order
            let invoice_result = invoice_service
                .create_from_work_order(&tenant_id, work_order_id)
                .await;
            
            prop_assert!(invoice_result.is_ok(), "Invoice creation should succeed");
            
            let invoice = invoice_result.unwrap();
            
            // Verify invoice was created
            prop_assert!(invoice.id > 0, "Invoice should have valid ID");
            prop_assert_eq!(invoice.work_order_id, Some(work_order_id), 
                "Invoice should be linked to work order");
            prop_assert_eq!(invoice.customer_id, customer_id, 
                "Invoice should have correct customer ID");
            prop_assert!(invoice.invoice_number.starts_with("INV-"), 
                "Invoice number should have correct format");
            
            // Verify work order invoiced_at is set
            let wo: WorkOrder = sqlx::query_as(
                "SELECT id, tenant_id, work_order_number, customer_id, status, 
                 description, estimated_total, actual_total, total_amount, labor_total, parts_total, 
                 created_at, updated_at, completed_at, invoiced_at, assigned_technician_id, 
                 is_warranty, sync_version, store_id 
                 FROM work_orders 
                 WHERE id = ?"
            )
            .bind(work_order_id)
            .fetch_one(&pool)
            .await
            .unwrap();
            
            prop_assert!(wo.invoiced_at.is_some(), 
                "Work order invoiced_at should be set");
            
            // Verify inventory was reduced
            let remaining_qty: f64 = sqlx::query_scalar(
                "SELECT quantity_on_hand FROM products WHERE id = ?"
            )
            .bind(product_id)
            .fetch_one(&pool)
            .await
            .unwrap();
            
            let expected_remaining = 100.0 - parts_quantity;
            let diff = (remaining_qty - expected_remaining).abs();
            prop_assert!(diff < 0.01, 
                "Inventory should be reduced by consumed quantity (expected {}, got {})", 
                expected_remaining, remaining_qty);
            
            // Verify invoice line items were created
            let line_items = invoice_service.get_line_items(invoice.id).await.unwrap();
            prop_assert!(!line_items.is_empty(), 
                "Invoice should have line items");
            
            Ok(())
        }).unwrap();
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    // Unit test: Verify invoice creation from completed work order
    #[tokio::test]
    async fn test_work_order_completion_with_invoice_creation() {
        let pool = setup_test_db().await;
        let invoice_service = InvoiceService::new(pool.clone());
        
        let tenant_id = "tenant-001";
        let work_order_number = "WO-20240101-ABCD1234";
        let customer_id = 12345i64;
        let description = "Oil change and tire rotation";
        let store_id = "store-001";
        let labor_total = 75.00;
        let parts_total = 125.50;
        let total_amount = labor_total + parts_total;
        let now = Utc::now().to_rfc3339();
        
        // Create a product for inventory tracking
        let product_id: i64 = sqlx::query_scalar(
            "INSERT INTO products (tenant_id, sku, name, quantity_on_hand) 
             VALUES (?, ?, ?, ?) RETURNING id"
        )
        .bind(tenant_id)
        .bind("OIL-FILTER-001")
        .bind("Oil Filter")
        .bind(50.0)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        // Create work order
        let work_order_id: i64 = sqlx::query_scalar(
            "INSERT INTO work_orders (tenant_id, work_order_number, customer_id, 
             status, description, labor_total, parts_total, total_amount, created_at, updated_at, 
             is_warranty, sync_version, store_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?) RETURNING id"
        )
        .bind(tenant_id)
        .bind(work_order_number)
        .bind(customer_id)
        .bind(WorkOrderStatus::Created.as_str())
        .bind(description)
        .bind(labor_total)
        .bind(parts_total)
        .bind(total_amount)
        .bind(&now)
        .bind(&now)
        .bind(store_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        // Add work order items
        sqlx::query(
            "INSERT INTO work_order_items (tenant_id, work_order_id, product_id, description, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(tenant_id)
        .bind(work_order_id)
        .bind(product_id)
        .bind("Oil Filter")
        .bind(3.0)
        .bind(parts_total / 3.0)
        .bind(parts_total)
        .execute(&pool)
        .await
        .unwrap();
        
        // Complete the work order
        let completed_at = Utc::now().to_rfc3339();
        sqlx::query(
            "UPDATE work_orders 
             SET status = ?, actual_total = ?, completed_at = ?, updated_at = ?, 
                 sync_version = sync_version + 1
             WHERE id = ? AND tenant_id = ?"
        )
        .bind(WorkOrderStatus::Completed.as_str())
        .bind(total_amount)
        .bind(&completed_at)
        .bind(&completed_at)
        .bind(work_order_id)
        .bind(tenant_id)
        .execute(&pool)
        .await
        .unwrap();
        
        // Create invoice from work order
        let invoice = invoice_service
            .create_from_work_order(tenant_id, work_order_id)
            .await
            .unwrap();
        
        // Verify invoice created
        assert!(invoice.id > 0);
        assert_eq!(invoice.work_order_id, Some(work_order_id));
        assert_eq!(invoice.customer_id, customer_id);
        assert!(invoice.invoice_number.starts_with("INV-"));
        
        // Verify work order invoiced_at is set
        let wo: WorkOrder = sqlx::query_as(
            "SELECT id, tenant_id, work_order_number, customer_id, status, 
             description, estimated_total, actual_total, total_amount, labor_total, parts_total, 
             created_at, updated_at, completed_at, invoiced_at, assigned_technician_id, 
             is_warranty, sync_version, store_id 
             FROM work_orders 
             WHERE id = ?"
        )
        .bind(work_order_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        assert!(wo.invoiced_at.is_some());
        
        // Verify inventory was reduced
        let remaining_qty: f64 = sqlx::query_scalar(
            "SELECT quantity_on_hand FROM products WHERE id = ?"
        )
        .bind(product_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        assert_eq!(remaining_qty, 47.0); // 50 - 3 = 47
    }
}
