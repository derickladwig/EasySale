/**
 * Common test utilities and fixtures
 * 
 * Shared code for integration tests
 */

use sqlx::SqlitePool;
use tempfile::TempDir;

/// Create a test database with migrations applied
pub async fn create_test_db() -> (SqlitePool, TempDir) {
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let db_path = temp_dir.path().join("test.db");
    
    let connection_string = format!("sqlite://{}?mode=rwc", db_path.display());
    
    let pool = SqlitePool::connect(&connection_string)
        .await
        .expect("Failed to connect to test database");
    
    // Create necessary tables for tests (simplified schema)
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
            credit_balance REAL NOT NULL DEFAULT 0.0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            sync_version INTEGER NOT NULL DEFAULT 0,
            store_id TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create customers table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            sku TEXT NOT NULL,
            category TEXT,
            base_price REAL NOT NULL,
            cost REAL NOT NULL,
            quantity REAL NOT NULL,
            reorder_point REAL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            sync_version INTEGER NOT NULL DEFAULT 0,
            store_id TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create products table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            username TEXT NOT NULL,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create users table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS layaways (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            status TEXT NOT NULL,
            total_amount REAL NOT NULL,
            deposit_amount REAL NOT NULL,
            balance_due REAL NOT NULL,
            due_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT,
            sync_version INTEGER NOT NULL DEFAULT 0,
            store_id TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create layaways table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS layaway_items (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            layaway_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            total_price REAL NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create layaway_items table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS layaway_payments (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            layaway_id TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            payment_date TEXT NOT NULL,
            employee_id TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create layaway_payments table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS credit_accounts (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            credit_limit REAL NOT NULL,
            current_balance REAL NOT NULL DEFAULT 0.0,
            available_credit REAL NOT NULL,
            payment_terms_days INTEGER NOT NULL DEFAULT 30,
            service_charge_rate REAL,
            is_active INTEGER NOT NULL DEFAULT 1,
            last_statement_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create credit_accounts table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS credit_transactions (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            credit_account_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            amount REAL NOT NULL,
            reference_id TEXT NOT NULL,
            transaction_date TEXT NOT NULL,
            due_date TEXT,
            days_overdue INTEGER NOT NULL DEFAULT 0
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create credit_transactions table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS promotions (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            promotion_type TEXT NOT NULL,
            discount_value REAL NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT NOT NULL,
            applies_to_categories TEXT,
            applies_to_products TEXT,
            applies_to_tiers TEXT,
            min_quantity INTEGER,
            is_active INTEGER NOT NULL DEFAULT 1
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create promotions table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS promotion_usage (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            promotion_id TEXT NOT NULL,
            transaction_id TEXT NOT NULL,
            customer_id TEXT,
            discount_amount REAL NOT NULL,
            items_affected INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create promotion_usage table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            synced_at TEXT,
            retry_count INTEGER NOT NULL DEFAULT 0,
            status TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create sync_queue table");
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS audit_logs (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            action TEXT NOT NULL,
            user_id TEXT NOT NULL,
            changes TEXT NOT NULL,
            created_at TEXT NOT NULL,
            is_offline INTEGER NOT NULL DEFAULT 0
        )"
    )
    .execute(&pool)
    .await
    .expect("Failed to create audit_logs table");
    
    (pool, temp_dir)
}

/// Sample WooCommerce order JSON
pub fn sample_woo_order_json() -> serde_json::Value {
    serde_json::json!({
        "id": 12345,
        "number": "12345",
        "status": "completed",
        "currency": "USD",
        "date_created": "2026-01-17T10:00:00",
        "date_modified": "2026-01-17T10:30:00",
        "total": "150.00",
        "total_tax": "12.00",
        "shipping_total": "10.00",
        "customer_id": 100,
        "billing": {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone": "555-1234",
            "address_1": "123 Main St",
            "city": "Springfield",
            "state": "IL",
            "postcode": "62701",
            "country": "US"
        },
        "shipping": {
            "first_name": "John",
            "last_name": "Doe",
            "address_1": "123 Main St",
            "city": "Springfield",
            "state": "IL",
            "postcode": "62701",
            "country": "US"
        },
        "line_items": [
            {
                "id": 1,
                "name": "Test Product",
                "product_id": 200,
                "quantity": 2,
                "subtotal": "100.00",
                "total": "100.00",
                "sku": "TEST-SKU-001",
                "price": 50.00
            }
        ],
        "tax_lines": [
            {
                "id": 1,
                "rate_code": "US-IL-TAX",
                "rate_id": 1,
                "label": "Sales Tax",
                "compound": false,
                "tax_total": "12.00"
            }
        ],
        "shipping_lines": [
            {
                "id": 1,
                "method_title": "Standard Shipping",
                "method_id": "flat_rate",
                "total": "10.00"
            }
        ]
    })
}

/// Sample WooCommerce customer JSON
pub fn sample_woo_customer_json() -> serde_json::Value {
    serde_json::json!({
        "id": 100,
        "email": "john@example.com",
        "first_name": "John",
        "last_name": "Doe",
        "username": "johndoe",
        "billing": {
            "first_name": "John",
            "last_name": "Doe",
            "company": "Acme Corp",
            "address_1": "123 Main St",
            "address_2": "Suite 100",
            "city": "Springfield",
            "state": "IL",
            "postcode": "62701",
            "country": "US",
            "email": "john@example.com",
            "phone": "555-1234"
        },
        "shipping": {
            "first_name": "John",
            "last_name": "Doe",
            "company": "Acme Corp",
            "address_1": "123 Main St",
            "address_2": "Suite 100",
            "city": "Springfield",
            "state": "IL",
            "postcode": "62701",
            "country": "US"
        }
    })
}

/// Sample WooCommerce product JSON
pub fn sample_woo_product_json() -> serde_json::Value {
    serde_json::json!({
        "id": 200,
        "name": "Test Product",
        "slug": "test-product",
        "type": "simple",
        "status": "publish",
        "sku": "TEST-SKU-001",
        "price": "50.00",
        "regular_price": "50.00",
        "sale_price": "",
        "description": "A test product",
        "short_description": "Test product for integration tests",
        "manage_stock": true,
        "stock_quantity": 100,
        "stock_status": "instock",
        "categories": [
            {
                "id": 10,
                "name": "Electronics",
                "slug": "electronics"
            }
        ],
        "images": [
            {
                "id": 300,
                "src": "https://example.com/image.jpg",
                "name": "Product Image"
            }
        ]
    })
}

/// Calculate HMAC-SHA256 signature for webhook validation
pub fn calculate_webhook_signature(secret: &str, payload: &str) -> String {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    
    type HmacSha256 = Hmac<Sha256>;
    
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .expect("HMAC can take key of any size");
    mac.update(payload.as_bytes());
    
    let result = mac.finalize();
    base64::encode(result.into_bytes())
}
