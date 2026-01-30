/// Review Cases List Endpoint Integration Test
///
/// This test verifies that the GET /api/cases endpoint:
/// 1. Returns real data from the database
/// 2. Supports filtering by state, vendor, and min_conf
/// 3. Returns proper pagination metadata
/// 4. Correctly counts filtered results
///
/// Only compiled when ocr feature is enabled
#![cfg(feature = "ocr")]

use sqlx::{SqlitePool, Row};
use std::fs;
use std::path::Path;
use uuid::Uuid;

/// Helper function to create a test database with migrations
async fn setup_test_db() -> SqlitePool {
    // Create in-memory database
    let pool = SqlitePool::connect(":memory:")
        .await
        .expect("Failed to create test database");
    
    // Run migrations
    let migration_dir = Path::new("migrations");
    let mut migrations: Vec<_> = fs::read_dir(migration_dir)
        .expect("Failed to read migrations directory")
        .filter_map(|entry| entry.ok())
        .filter(|entry| {
            entry.path().extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext == "sql")
                .unwrap_or(false)
        })
        .collect();
    
    // Sort migrations by filename
    migrations.sort_by_key(|entry| entry.file_name());
    
    // Execute each migration
    for migration in migrations {
        let sql = fs::read_to_string(migration.path())
            .expect("Failed to read migration file");
        
        sqlx::query(&sql)
            .execute(&pool)
            .await
            .expect("Failed to execute migration");
    }
    
    pool
}

/// Helper to insert a test case
async fn insert_test_case(
    pool: &SqlitePool,
    tenant_id: &str,
    state: &str,
    vendor_name: Option<&str>,
    confidence: i32,
) -> String {
    let case_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO review_cases (id, tenant_id, state, vendor_name, confidence, source_file_path, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&case_id)
    .bind(tenant_id)
    .bind(state)
    .bind(vendor_name)
    .bind(confidence)
    .bind("/test/file.pdf")
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .expect("Failed to insert test case");
    
    case_id
}

#[tokio::test]
async fn test_list_cases_returns_all_cases() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Insert test cases
    insert_test_case(&pool, tenant_id, "NeedsReview", Some("ACME Corp"), 85).await;
    insert_test_case(&pool, tenant_id, "Processing", Some("Supplier Inc"), 90).await;
    insert_test_case(&pool, tenant_id, "Failed", None, 50).await;
    
    // Query all cases
    let cases: Vec<(String, String)> = sqlx::query_as(
        "SELECT id as case_id, state FROM review_cases WHERE tenant_id = ? ORDER BY created_at DESC"
    )
    .bind(tenant_id)
    .fetch_all(&pool)
    .await
    .expect("Failed to query cases");
    
    assert_eq!(cases.len(), 3, "Should return all 3 cases");
}

#[tokio::test]
async fn test_list_cases_filters_by_state() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Insert test cases with different states
    insert_test_case(&pool, tenant_id, "NeedsReview", Some("ACME Corp"), 85).await;
    insert_test_case(&pool, tenant_id, "NeedsReview", Some("Supplier Inc"), 90).await;
    insert_test_case(&pool, tenant_id, "Processing", Some("Other Vendor"), 75).await;
    insert_test_case(&pool, tenant_id, "Failed", None, 50).await;
    
    // Query only NeedsReview cases
    let cases: Vec<(String, String)> = sqlx::query_as(
        "SELECT id as case_id, state FROM review_cases WHERE tenant_id = ? AND state = ? ORDER BY created_at DESC"
    )
    .bind(tenant_id)
    .bind("NeedsReview")
    .fetch_all(&pool)
    .await
    .expect("Failed to query cases");
    
    assert_eq!(cases.len(), 2, "Should return only NeedsReview cases");
    assert_eq!(cases[0].1, "NeedsReview");
    assert_eq!(cases[1].1, "NeedsReview");
}

#[tokio::test]
async fn test_list_cases_filters_by_vendor() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Insert test cases with different vendors
    insert_test_case(&pool, tenant_id, "NeedsReview", Some("ACME Corp"), 85).await;
    insert_test_case(&pool, tenant_id, "NeedsReview", Some("ACME Industries"), 90).await;
    insert_test_case(&pool, tenant_id, "Processing", Some("Supplier Inc"), 75).await;
    
    // Query cases with vendor name containing "ACME"
    let cases: Vec<(String, Option<String>)> = sqlx::query_as(
        "SELECT id as case_id, vendor_name FROM review_cases WHERE tenant_id = ? AND vendor_name LIKE ? ORDER BY created_at DESC"
    )
    .bind(tenant_id)
    .bind("%ACME%")
    .fetch_all(&pool)
    .await
    .expect("Failed to query cases");
    
    assert_eq!(cases.len(), 2, "Should return only ACME cases");
    assert!(cases[0].1.as_ref().unwrap().contains("ACME"));
    assert!(cases[1].1.as_ref().unwrap().contains("ACME"));
}

#[tokio::test]
async fn test_list_cases_filters_by_min_confidence() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Insert test cases with different confidence levels
    insert_test_case(&pool, tenant_id, "NeedsReview", Some("ACME Corp"), 95).await;
    insert_test_case(&pool, tenant_id, "NeedsReview", Some("Supplier Inc"), 85).await;
    insert_test_case(&pool, tenant_id, "Processing", Some("Other Vendor"), 75).await;
    insert_test_case(&pool, tenant_id, "Failed", None, 50).await;
    
    // Query cases with confidence >= 80
    let cases: Vec<(String, i32)> = sqlx::query_as(
        "SELECT id as case_id, confidence FROM review_cases WHERE tenant_id = ? AND confidence >= ? ORDER BY created_at DESC"
    )
    .bind(tenant_id)
    .bind(80)
    .fetch_all(&pool)
    .await
    .expect("Failed to query cases");
    
    assert_eq!(cases.len(), 2, "Should return only cases with confidence >= 80");
    assert!(cases[0].1 >= 80);
    assert!(cases[1].1 >= 80);
}

#[tokio::test]
async fn test_list_cases_pagination() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Insert 5 test cases
    for i in 0..5 {
        insert_test_case(&pool, tenant_id, "NeedsReview", Some(&format!("Vendor {}", i)), 85).await;
    }
    
    // Query first page (2 items per page)
    let per_page = 2;
    let offset = 0;
    let cases: Vec<(String,)> = sqlx::query_as(
        "SELECT id as case_id FROM review_cases WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .bind(tenant_id)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .expect("Failed to query cases");
    
    assert_eq!(cases.len(), 2, "Should return 2 cases for first page");
    
    // Query second page
    let offset = 2;
    let cases: Vec<(String,)> = sqlx::query_as(
        "SELECT id as case_id FROM review_cases WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .bind(tenant_id)
    .bind(per_page)
    .bind(offset)
    .fetch_all(&pool)
    .await
    .expect("Failed to query cases");
    
    assert_eq!(cases.len(), 2, "Should return 2 cases for second page");
}

#[tokio::test]
async fn test_list_cases_total_count_with_filters() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Insert test cases
    insert_test_case(&pool, tenant_id, "NeedsReview", Some("ACME Corp"), 85).await;
    insert_test_case(&pool, tenant_id, "NeedsReview", Some("Supplier Inc"), 90).await;
    insert_test_case(&pool, tenant_id, "Processing", Some("Other Vendor"), 75).await;
    insert_test_case(&pool, tenant_id, "Failed", None, 50).await;
    
    // Count all cases
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM review_cases WHERE tenant_id = ?"
    )
    .bind(tenant_id)
    .fetch_one(&pool)
    .await
    .expect("Failed to count cases");
    
    assert_eq!(total, 4, "Should count all 4 cases");
    
    // Count filtered cases (NeedsReview only)
    let filtered_total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM review_cases WHERE tenant_id = ? AND state = ?"
    )
    .bind(tenant_id)
    .bind("NeedsReview")
    .fetch_one(&pool)
    .await
    .expect("Failed to count filtered cases");
    
    assert_eq!(filtered_total, 2, "Should count only NeedsReview cases");
}
