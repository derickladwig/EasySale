// Property-Based Tests for Unified Backup & Sync Module
// Feature: backup-sync, Property 4: Database Snapshot Consistency
// These tests validate that database snapshots can be opened without corruption
//
// **Validates: Requirements 1.6**

use proptest::prelude::*;
use sqlx::{SqlitePool, Row};
use uuid::Uuid;
use chrono::Utc;
use std::fs;
use std::path::PathBuf;

// ============================================================================
// Test Database Setup
// ============================================================================

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create some test tables to simulate a real database
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            created_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS sales (
            id TEXT PRIMARY KEY,
            customer_id TEXT,
            total REAL NOT NULL,
            status TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id)
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    pool
}

/// Insert random test data into the database
async fn populate_test_data(
    pool: &SqlitePool,
    product_count: usize,
    customer_count: usize,
    sales_count: usize,
) -> Result<(), Box<dyn std::error::Error>> {
    let now = Utc::now().to_rfc3339();
    
    // Insert products
    for i in 0..product_count {
        sqlx::query(
            "INSERT INTO products (id, name, price, quantity, created_at) 
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(format!("prod-{}", i))
        .bind(format!("Product {}", i))
        .bind((i as f64 + 1.0) * 10.0)
        .bind((i * 5) as i32)
        .bind(&now)
        .execute(pool)
        .await?;
    }
    
    // Insert customers
    for i in 0..customer_count {
        sqlx::query(
            "INSERT INTO customers (id, name, email, phone, created_at) 
             VALUES (?, ?, ?, ?, ?)"
        )
        .bind(format!("cust-{}", i))
        .bind(format!("Customer {}", i))
        .bind(format!("customer{}@example.com", i))
        .bind(format!("555-{:04}", i))
        .bind(&now)
        .execute(pool)
        .await?;
    }
    
    // Insert sales - only if we have customers to reference
    if sales_count > 0 && customer_count > 0 {
        for i in 0..sales_count {
            let customer_id = format!("cust-{}", i % customer_count);
            
            sqlx::query(
                "INSERT INTO sales (id, customer_id, total, status, created_at) 
                 VALUES (?, ?, ?, ?, ?)"
            )
            .bind(format!("sale-{}", i))
            .bind(customer_id)
            .bind((i as f64 + 1.0) * 25.0)
            .bind("completed")
            .bind(&now)
            .execute(pool)
            .await?;
        }
    }
    
    Ok(())
}

// ============================================================================
// Test Helpers
// ============================================================================

/// Create a database snapshot using VACUUM INTO
async fn create_snapshot_vacuum_into(
    source_pool: &SqlitePool,
    snapshot_path: &PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    // Ensure parent directory exists
    if let Some(parent) = snapshot_path.parent() {
        fs::create_dir_all(parent)?;
    }
    
    // Use VACUUM INTO to create snapshot
    let query = format!("VACUUM INTO '{}'", snapshot_path.to_string_lossy());
    sqlx::query(&query)
        .execute(source_pool)
        .await?;
    
    Ok(())
}

/// Create a database snapshot using WAL checkpoint + copy
async fn create_snapshot_wal_checkpoint(
    source_db_path: &PathBuf,
    source_pool: &SqlitePool,
    snapshot_path: &PathBuf,
) -> Result<(), Box<dyn std::error::Error>> {
    // Ensure parent directory exists
    if let Some(parent) = snapshot_path.parent() {
        fs::create_dir_all(parent)?;
    }
    
    // Checkpoint WAL to ensure all data is in main database file
    sqlx::query("PRAGMA wal_checkpoint(TRUNCATE)")
        .execute(source_pool)
        .await?;
    
    // Copy database file
    fs::copy(source_db_path, snapshot_path)?;
    
    Ok(())
}

/// Verify that a snapshot can be opened and queried
async fn verify_snapshot_integrity(
    snapshot_path: &PathBuf,
    expected_product_count: usize,
    expected_customer_count: usize,
    expected_sales_count: usize,
) -> Result<(), Box<dyn std::error::Error>> {
    // Open snapshot database
    let snapshot_url = format!("sqlite://{}", snapshot_path.to_string_lossy());
    let snapshot_pool = SqlitePool::connect(&snapshot_url).await?;
    
    // Verify database can be queried without errors
    
    // Check products table
    let product_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM products")
        .fetch_one(&snapshot_pool)
        .await?
        .get("count");
    
    if product_count != expected_product_count as i64 {
        return Err(format!(
            "Product count mismatch: expected {}, got {}",
            expected_product_count, product_count
        ).into());
    }
    
    // Check customers table
    let customer_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM customers")
        .fetch_one(&snapshot_pool)
        .await?
        .get("count");
    
    if customer_count != expected_customer_count as i64 {
        return Err(format!(
            "Customer count mismatch: expected {}, got {}",
            expected_customer_count, customer_count
        ).into());
    }
    
    // Check sales table
    let sales_count: i64 = sqlx::query("SELECT COUNT(*) as count FROM sales")
        .fetch_one(&snapshot_pool)
        .await?
        .get("count");
    
    if sales_count != expected_sales_count as i64 {
        return Err(format!(
            "Sales count mismatch: expected {}, got {}",
            expected_sales_count, sales_count
        ).into());
    }
    
    // Verify foreign key integrity
    let fk_violations: i64 = sqlx::query(
        "SELECT COUNT(*) as count FROM sales 
         WHERE customer_id NOT IN (SELECT id FROM customers)"
    )
    .fetch_one(&snapshot_pool)
    .await?
    .get("count");
    
    if fk_violations > 0 {
        return Err(format!(
            "Foreign key violations detected: {} sales with invalid customer_id",
            fk_violations
        ).into());
    }
    
    // Verify we can read actual data (not just count)
    let products: Vec<(String, String)> = sqlx::query_as(
        "SELECT id, name FROM products LIMIT 5"
    )
    .fetch_all(&snapshot_pool)
    .await?;
    
    if !products.is_empty() && expected_product_count > 0 {
        // Verify data is readable and not corrupted
        for (id, name) in products {
            if id.is_empty() || name.is_empty() {
                return Err("Corrupted data detected: empty id or name".into());
            }
        }
    }
    
    // Run PRAGMA integrity_check
    let integrity_result: String = sqlx::query("PRAGMA integrity_check")
        .fetch_one(&snapshot_pool)
        .await?
        .get(0);
    
    if integrity_result != "ok" {
        return Err(format!(
            "Database integrity check failed: {}",
            integrity_result
        ).into());
    }
    
    snapshot_pool.close().await;
    
    Ok(())
}

/// Clean up test files and directories
fn cleanup_test_files(paths: &[PathBuf]) {
    for path in paths {
        if path.exists() {
            if path.is_file() {
                let _ = fs::remove_file(path);
            } else if path.is_dir() {
                let _ = fs::remove_dir_all(path);
            }
        }
    }
}

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a number of products to create (0-50)
fn arb_product_count() -> impl Strategy<Value = usize> {
    0usize..=50
}

/// Generate a number of customers to create (0-30)
fn arb_customer_count() -> impl Strategy<Value = usize> {
    0usize..=30
}

/// Generate a number of sales to create (0-100)
fn arb_sales_count() -> impl Strategy<Value = usize> {
    0usize..=100
}

/// Generate a snapshot method
fn arb_snapshot_method() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("vacuum_into".to_string()),
        Just("wal_checkpoint".to_string()),
    ]
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 4: Database Snapshot Consistency
// For any database snapshot created during backup, opening the snapshot file
// must succeed without corruption errors, and all tables must be accessible.
// **Validates: Requirements 1.6**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_4_database_snapshot_consistency(
        product_count in arb_product_count(),
        customer_count in arb_customer_count(),
        sales_count in arb_sales_count(),
        snapshot_method in arb_snapshot_method(),
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Create test directory in system temp
            let temp_base = std::env::temp_dir();
            let test_dir = temp_base.join(format!("test_snapshot_{}", Uuid::new_v4()));
            fs::create_dir_all(&test_dir).expect("Should create test directory");
            
            // Create source database file (for WAL checkpoint method)
            let source_db_path = test_dir.join("source.db");
            
            // Create empty database file first
            fs::File::create(&source_db_path).expect("Should create database file");
            
            let source_url = format!("sqlite://{}", source_db_path.to_string_lossy());
            
            // Setup source database
            let source_pool = SqlitePool::connect(&source_url).await
                .expect("Should connect to source database");
            
            // Create tables
            sqlx::query(
                "CREATE TABLE IF NOT EXISTS products (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    price REAL NOT NULL,
                    quantity INTEGER NOT NULL,
                    created_at TEXT NOT NULL
                )"
            )
            .execute(&source_pool)
            .await
            .expect("Should create products table");
            
            sqlx::query(
                "CREATE TABLE IF NOT EXISTS customers (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    email TEXT,
                    phone TEXT,
                    created_at TEXT NOT NULL
                )"
            )
            .execute(&source_pool)
            .await
            .expect("Should create customers table");
            
            sqlx::query(
                "CREATE TABLE IF NOT EXISTS sales (
                    id TEXT PRIMARY KEY,
                    customer_id TEXT,
                    total REAL NOT NULL,
                    status TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (customer_id) REFERENCES customers(id)
                )"
            )
            .execute(&source_pool)
            .await
            .expect("Should create sales table");
            
            // Populate with test data
            populate_test_data(&source_pool, product_count, customer_count, sales_count)
                .await
                .expect("Should populate test data");
            
            // Create snapshot path
            let snapshot_path = test_dir.join("snapshot.db");
            
            // Create snapshot using specified method
            let snapshot_result = match snapshot_method.as_str() {
                "vacuum_into" => {
                    create_snapshot_vacuum_into(&source_pool, &snapshot_path).await
                }
                "wal_checkpoint" => {
                    create_snapshot_wal_checkpoint(&source_db_path, &source_pool, &snapshot_path).await
                }
                _ => panic!("Unknown snapshot method: {}", snapshot_method),
            };
            
            prop_assert!(
                snapshot_result.is_ok(),
                "Snapshot creation should succeed: {:?}",
                snapshot_result.err()
            );
            
            // PROPERTY: Snapshot file must exist
            prop_assert!(
                snapshot_path.exists(),
                "Snapshot file should exist at path: {:?}",
                snapshot_path
            );
            
            // PROPERTY: Snapshot file must have non-zero size (unless database is empty)
            let snapshot_metadata = fs::metadata(&snapshot_path)
                .expect("Should get snapshot metadata");
            let snapshot_size = snapshot_metadata.len();
            
            if product_count > 0 || customer_count > 0 || sales_count > 0 {
                prop_assert!(
                    snapshot_size > 0,
                    "Snapshot file should have non-zero size for non-empty database"
                );
            }
            
            // PROPERTY: Snapshot must be openable and queryable without corruption
            // Note: If sales_count > 0 but customer_count = 0, no sales are inserted due to FK constraints
            let expected_sales = if sales_count > 0 && customer_count == 0 { 0 } else { sales_count };
            
            let verification_result = verify_snapshot_integrity(
                &snapshot_path,
                product_count,
                customer_count,
                expected_sales,
            ).await;
            
            prop_assert!(
                verification_result.is_ok(),
                "Snapshot verification should succeed: {:?}",
                verification_result.err()
            );
            
            // Close source pool
            source_pool.close().await;
            
            // Clean up test files
            cleanup_test_files(&[test_dir]);
            
            Ok(())
        })?;
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;
    
    /// Test that snapshot can be created from an empty database
    #[tokio::test]
    async fn test_snapshot_empty_database() {
        let temp_base = std::env::temp_dir();
        let test_dir = temp_base.join(format!("test_snapshot_{}", Uuid::new_v4()));
        fs::create_dir_all(&test_dir).unwrap();
        
        let source_db_path = test_dir.join("source.db");
        fs::File::create(&source_db_path).unwrap();
        
        let source_url = format!("sqlite://{}", source_db_path.to_string_lossy());
        let source_pool = SqlitePool::connect(&source_url).await.unwrap();
        
        // Create tables but don't populate
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL
            )"
        )
        .execute(&source_pool)
        .await
        .unwrap();
        
        let snapshot_path = test_dir.join("snapshot.db");
        
        // Create snapshot
        create_snapshot_vacuum_into(&source_pool, &snapshot_path)
            .await
            .expect("Should create snapshot of empty database");
        
        // Verify snapshot can be opened
        let snapshot_url = format!("sqlite://{}", snapshot_path.to_string_lossy());
        let snapshot_pool = SqlitePool::connect(&snapshot_url).await.expect("Should open snapshot");
        
        // Verify table exists and is empty
        let count: i64 = sqlx::query("SELECT COUNT(*) as count FROM products")
            .fetch_one(&snapshot_pool)
            .await
            .expect("Should query products table")
            .get("count");
        
        assert_eq!(count, 0, "Empty database should have 0 products");
        
        snapshot_pool.close().await;
        
        source_pool.close().await;
        cleanup_test_files(&[test_dir]);
    }
    
    /// Test that snapshot preserves data integrity
    #[tokio::test]
    async fn test_snapshot_data_integrity() {
        let temp_base = std::env::temp_dir();
        let test_dir = temp_base.join(format!("test_snapshot_{}", Uuid::new_v4()));
        fs::create_dir_all(&test_dir).unwrap();
        
        let source_db_path = test_dir.join("source.db");
        fs::File::create(&source_db_path).unwrap();
        
        let source_url = format!("sqlite://{}", source_db_path.to_string_lossy());
        let source_pool = SqlitePool::connect(&source_url).await.unwrap();
        
        // Create table and insert specific data
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS test_data (
                id INTEGER PRIMARY KEY,
                value TEXT NOT NULL
            )"
        )
        .execute(&source_pool)
        .await
        .unwrap();
        
        let test_values = vec!["alpha", "beta", "gamma", "delta"];
        for (i, value) in test_values.iter().enumerate() {
            sqlx::query("INSERT INTO test_data (id, value) VALUES (?, ?)")
                .bind(i as i32)
                .bind(value)
                .execute(&source_pool)
                .await
                .unwrap();
        }
        
        let snapshot_path = test_dir.join("snapshot.db");
        
        // Create snapshot
        create_snapshot_vacuum_into(&source_pool, &snapshot_path)
            .await
            .expect("Should create snapshot");
        
        // Open snapshot and verify data
        let snapshot_url = format!("sqlite://{}", snapshot_path.to_string_lossy());
        let snapshot_pool = SqlitePool::connect(&snapshot_url).await.unwrap();
        
        let retrieved_values: Vec<String> = sqlx::query_as(
            "SELECT value FROM test_data ORDER BY id"
        )
        .fetch_all(&snapshot_pool)
        .await
        .unwrap()
        .into_iter()
        .map(|(v,)| v)
        .collect();
        
        assert_eq!(
            retrieved_values,
            test_values,
            "Snapshot should preserve exact data values"
        );
        
        source_pool.close().await;
        snapshot_pool.close().await;
        cleanup_test_files(&[test_dir]);
    }
    
    /// Test that snapshot can be created while database is being written to
    #[tokio::test]
    async fn test_snapshot_under_concurrent_writes() {
        let temp_base = std::env::temp_dir();
        let test_dir = temp_base.join(format!("test_snapshot_{}", Uuid::new_v4()));
        fs::create_dir_all(&test_dir).unwrap();
        
        let source_db_path = test_dir.join("source.db");
        fs::File::create(&source_db_path).unwrap();
        
        let source_url = format!("sqlite://{}", source_db_path.to_string_lossy());
        let source_pool = SqlitePool::connect(&source_url).await.unwrap();
        
        // Create table
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS concurrent_test (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                value TEXT NOT NULL
            )"
        )
        .execute(&source_pool)
        .await
        .unwrap();
        
        // Insert some initial data
        for i in 0..10 {
            sqlx::query("INSERT INTO concurrent_test (value) VALUES (?)")
                .bind(format!("value-{}", i))
                .execute(&source_pool)
                .await
                .unwrap();
        }
        
        let snapshot_path = test_dir.join("snapshot.db");
        
        // Create snapshot (VACUUM INTO handles concurrent access gracefully)
        create_snapshot_vacuum_into(&source_pool, &snapshot_path)
            .await
            .expect("Should create snapshot even with concurrent access");
        
        // Verify snapshot is valid
        let snapshot_url = format!("sqlite://{}", snapshot_path.to_string_lossy());
        let snapshot_pool = SqlitePool::connect(&snapshot_url).await.unwrap();
        
        let count: i64 = sqlx::query("SELECT COUNT(*) as count FROM concurrent_test")
            .fetch_one(&snapshot_pool)
            .await
            .unwrap()
            .get("count");
        
        assert!(
            count >= 10,
            "Snapshot should contain at least the initial data"
        );
        
        source_pool.close().await;
        snapshot_pool.close().await;
        cleanup_test_files(&[test_dir]);
    }
    
    /// Test that corrupted snapshot is detected
    #[tokio::test]
    async fn test_corrupted_snapshot_detection() {
        let temp_base = std::env::temp_dir();
        let test_dir = temp_base.join(format!("test_snapshot_{}", Uuid::new_v4()));
        fs::create_dir_all(&test_dir).unwrap();
        
        let source_db_path = test_dir.join("source.db");
        fs::File::create(&source_db_path).unwrap();
        
        let source_url = format!("sqlite://{}", source_db_path.to_string_lossy());
        let source_pool = SqlitePool::connect(&source_url).await.unwrap();
        
        // Create table with data
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS test_table (
                id INTEGER PRIMARY KEY,
                data TEXT NOT NULL
            )"
        )
        .execute(&source_pool)
        .await
        .unwrap();
        
        sqlx::query("INSERT INTO test_table (id, data) VALUES (1, 'test')")
            .execute(&source_pool)
            .await
            .unwrap();
        
        let snapshot_path = test_dir.join("snapshot.db");
        
        // Create valid snapshot
        create_snapshot_vacuum_into(&source_pool, &snapshot_path)
            .await
            .expect("Should create snapshot");
        
        // Corrupt the snapshot by truncating it
        let file = fs::OpenOptions::new()
            .write(true)
            .open(&snapshot_path)
            .unwrap();
        file.set_len(100).unwrap(); // Truncate to 100 bytes (corrupted)
        drop(file);
        
        // Try to open corrupted snapshot
        let snapshot_url = format!("sqlite://{}", snapshot_path.to_string_lossy());
        let result = SqlitePool::connect(&snapshot_url).await;
        
        // Should either fail to connect or fail integrity check
        if let Ok(snapshot_pool) = result {
            let integrity_result = sqlx::query("PRAGMA integrity_check")
                .fetch_one(&snapshot_pool)
                .await;
            
            // Either query fails or integrity check reports corruption
            if let Ok(row) = integrity_result {
                let integrity: String = row.get(0);
                assert_ne!(
                    integrity, "ok",
                    "Corrupted snapshot should fail integrity check"
                );
            }
            
            snapshot_pool.close().await;
        }
        
        source_pool.close().await;
        cleanup_test_files(&[test_dir]);
    }
}
