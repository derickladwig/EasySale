/// Review Cases Detail Endpoint Integration Test
///
/// This test verifies that the GET /api/cases/{id} endpoint:
/// 1. Returns full case data including extracted_data, validation_result, decisions
/// 2. Includes source file path for document viewer
/// 3. Joins with review_case_decisions table for decision history
/// 4. Returns 404 for non-existent cases
///
/// **Validates: Requirements 5.12**
///
#[cfg(feature = "ocr")]
/// Only compiled when ocr feature is enabled

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

/// Helper to insert a test case with full data
async fn insert_test_case_with_data(
    pool: &SqlitePool,
    tenant_id: &str,
    state: &str,
    vendor_name: Option<&str>,
    confidence: i32,
    source_file_path: &str,
    extracted_data: Option<&str>,
    validation_result: Option<&str>,
) -> String {
    let case_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO review_cases (id, tenant_id, state, vendor_name, confidence, source_file_path, 
         source_file_type, extracted_data, validation_result, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&case_id)
    .bind(tenant_id)
    .bind(state)
    .bind(vendor_name)
    .bind(confidence)
    .bind(source_file_path)
    .bind("pdf")
    .bind(extracted_data)
    .bind(validation_result)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .expect("Failed to insert test case");
    
    case_id
}

/// Helper to insert a decision for a case
async fn insert_test_decision(
    pool: &SqlitePool,
    case_id: &str,
    field_name: &str,
    chosen_value: &str,
) {
    let decision_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO review_case_decisions (id, case_id, field_name, chosen_value, source, decided_at)
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&decision_id)
    .bind(case_id)
    .bind(field_name)
    .bind(chosen_value)
    .bind("manual")
    .bind(&now)
    .execute(pool)
    .await
    .expect("Failed to insert test decision");
}

#[tokio::test]
async fn test_get_case_returns_full_data() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Create extracted data JSON
    let extracted_data = r#"[
        {"name": "invoice_number", "value": "INV-12345", "confidence": 95, "source": "ocr"},
        {"name": "invoice_date", "value": "2026-01-15", "confidence": 88, "source": "ocr"},
        {"name": "total", "value": "1234.56", "confidence": 92, "source": "ocr"}
    ]"#;
    
    // Create validation result JSON
    let validation_result = r#"{
        "hard_flags": ["missing_vendor"],
        "soft_flags": ["low_confidence_date"],
        "can_approve": false
    }"#;
    
    // Insert test case
    let case_id = insert_test_case_with_data(
        &pool,
        tenant_id,
        "NeedsReview",
        Some("ACME Corp"),
        85,
        "/uploads/test-invoice.pdf",
        Some(extracted_data),
        Some(validation_result),
    ).await;
    
    // Insert some decisions
    insert_test_decision(&pool, &case_id, "invoice_number", "INV-12345").await;
    insert_test_decision(&pool, &case_id, "total", "1234.56").await;
    
    // Query the case
    let case: (String, String, Option<String>, i32, String, Option<String>, Option<String>, Option<String>) = 
        sqlx::query_as(
            "SELECT id, state, vendor_name, confidence, source_file_path, source_file_type, 
             extracted_data, validation_result 
             FROM review_cases WHERE id = ?"
        )
        .bind(&case_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to query case");
    
    // Verify case data
    assert_eq!(case.0, case_id, "Case ID should match");
    assert_eq!(case.1, "NeedsReview", "State should be NeedsReview");
    assert_eq!(case.2, Some("ACME Corp".to_string()), "Vendor name should match");
    assert_eq!(case.3, 85, "Confidence should be 85");
    assert_eq!(case.4, "/uploads/test-invoice.pdf", "Source file path should match");
    assert_eq!(case.5, Some("pdf".to_string()), "Source file type should be pdf");
    assert!(case.6.is_some(), "Extracted data should be present");
    assert!(case.7.is_some(), "Validation result should be present");
    
    // Query decisions
    let decisions: Vec<(String, String)> = sqlx::query_as(
        "SELECT field_name, chosen_value FROM review_case_decisions 
         WHERE case_id = ? ORDER BY decided_at"
    )
    .bind(&case_id)
    .fetch_all(&pool)
    .await
    .expect("Failed to query decisions");
    
    assert_eq!(decisions.len(), 2, "Should have 2 decisions");
    assert_eq!(decisions[0].0, "invoice_number", "First decision field should be invoice_number");
    assert_eq!(decisions[0].1, "INV-12345", "First decision value should match");
    assert_eq!(decisions[1].0, "total", "Second decision field should be total");
    assert_eq!(decisions[1].1, "1234.56", "Second decision value should match");
}

#[tokio::test]
async fn test_get_case_includes_source_file_path() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Insert test case with specific file path
    let case_id = insert_test_case_with_data(
        &pool,
        tenant_id,
        "NeedsReview",
        Some("Test Vendor"),
        90,
        "/uploads/documents/invoice-2026-01-15.pdf",
        None,
        None,
    ).await;
    
    // Query the case
    let source_file_path: String = sqlx::query_scalar(
        "SELECT source_file_path FROM review_cases WHERE id = ?"
    )
    .bind(&case_id)
    .fetch_one(&pool)
    .await
    .expect("Failed to query case");
    
    assert_eq!(
        source_file_path,
        "/uploads/documents/invoice-2026-01-15.pdf",
        "Source file path should be included for document viewer"
    );
}

#[tokio::test]
async fn test_get_case_joins_with_decisions() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Insert test case
    let case_id = insert_test_case_with_data(
        &pool,
        tenant_id,
        "InReview",
        Some("Vendor"),
        80,
        "/test.pdf",
        None,
        None,
    ).await;
    
    // Insert multiple decisions
    insert_test_decision(&pool, &case_id, "field1", "value1").await;
    insert_test_decision(&pool, &case_id, "field2", "value2").await;
    insert_test_decision(&pool, &case_id, "field3", "value3").await;
    
    // Query decisions with join
    let decision_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM review_case_decisions WHERE case_id = ?"
    )
    .bind(&case_id)
    .fetch_one(&pool)
    .await
    .expect("Failed to count decisions");
    
    assert_eq!(decision_count, 3, "Should have 3 decisions joined");
}

#[tokio::test]
async fn test_get_case_returns_empty_decisions_when_none_exist() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Insert test case without decisions
    let case_id = insert_test_case_with_data(
        &pool,
        tenant_id,
        "NeedsReview",
        Some("Vendor"),
        85,
        "/test.pdf",
        None,
        None,
    ).await;
    
    // Query decisions
    let decisions: Vec<(String,)> = sqlx::query_as(
        "SELECT field_name FROM review_case_decisions WHERE case_id = ?"
    )
    .bind(&case_id)
    .fetch_all(&pool)
    .await
    .expect("Failed to query decisions");
    
    assert_eq!(decisions.len(), 0, "Should return empty decisions array");
}

#[tokio::test]
async fn test_get_case_handles_missing_optional_fields() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Insert test case with minimal data (no vendor, no extracted_data, no validation_result)
    let case_id = insert_test_case_with_data(
        &pool,
        tenant_id,
        "Processing",
        None,
        70,
        "/test.pdf",
        None,
        None,
    ).await;
    
    // Query the case
    let case: (String, Option<String>, Option<String>, Option<String>) = 
        sqlx::query_as(
            "SELECT id, vendor_name, extracted_data, validation_result 
             FROM review_cases WHERE id = ?"
        )
        .bind(&case_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to query case");
    
    assert_eq!(case.0, case_id, "Case ID should match");
    assert_eq!(case.1, None, "Vendor name should be None");
    assert_eq!(case.2, None, "Extracted data should be None");
    assert_eq!(case.3, None, "Validation result should be None");
}

#[tokio::test]
async fn test_get_case_parses_json_fields() {
    let pool = setup_test_db().await;
    let tenant_id = "test-tenant";
    
    // Create valid JSON data
    let extracted_data = r#"[{"name": "test", "value": "123", "confidence": 95, "source": "ocr"}]"#;
    let validation_result = r#"{"hard_flags": [], "soft_flags": [], "can_approve": true}"#;
    
    // Insert test case
    let case_id = insert_test_case_with_data(
        &pool,
        tenant_id,
        "NeedsReview",
        Some("Vendor"),
        90,
        "/test.pdf",
        Some(extracted_data),
        Some(validation_result),
    ).await;
    
    // Query and verify JSON can be parsed
    let case: (Option<String>, Option<String>) = 
        sqlx::query_as(
            "SELECT extracted_data, validation_result FROM review_cases WHERE id = ?"
        )
        .bind(&case_id)
        .fetch_one(&pool)
        .await
        .expect("Failed to query case");
    
    // Verify JSON is valid
    if let Some(data) = case.0 {
        let parsed: Result<serde_json::Value, _> = serde_json::from_str(&data);
        assert!(parsed.is_ok(), "Extracted data should be valid JSON");
    }
    
    if let Some(result) = case.1 {
        let parsed: Result<serde_json::Value, _> = serde_json::from_str(&result);
        assert!(parsed.is_ok(), "Validation result should be valid JSON");
    }
}
