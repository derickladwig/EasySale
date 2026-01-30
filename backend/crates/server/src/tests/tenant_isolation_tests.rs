// Unit tests for tenant isolation
// Tests that tenant_id is properly enforced across all models and queries

use crate::models::*;
use crate::test_constants::*;
use sqlx::SqlitePool;

/// Test that all models serialize with tenant_id field
#[tokio::test]
async fn test_model_serialization_includes_tenant_id() {
    // Test User model
    let user = User {
        id: "user-1".to_string(),
        tenant_id: TEST_TENANT_ID.to_string(),
        username: "test_user".to_string(),
        email: "test@example.com".to_string(),
        password_hash: "hash".to_string(),
        display_name: None,
        role: "cashier".to_string(),
        first_name: Some("Test".to_string()),
        last_name: Some("User".to_string()),
        store_id: Some(TEST_STORE_ID.to_string()),
        station_policy: "any".to_string(),
        station_id: None,
        is_active: true,
        created_at: "2026-01-12T00:00:00Z".to_string(),
        updated_at: "2026-01-12T00:00:00Z".to_string(),
    };
    
    let json = serde_json::to_string(&user).unwrap();
    assert!(json.contains("tenant_id"));
    assert!(json.contains(TEST_TENANT_ID));
    
    // Test BackupJob model
    let backup_job = BackupJob {
        id: "backup-1".to_string(),
        tenant_id: TEST_TENANT_ID.to_string(),
        backup_type: "database".to_string(),
        status: "pending".to_string(),
        started_at: None,
        completed_at: None,
        size_bytes: None,
        checksum: None,
        archive_path: None,
        error_message: None,
        snapshot_method: None,
        files_included: 0,
        files_changed: 0,
        files_deleted: 0,
        backup_chain_id: None,
        is_base_backup: true,
        incremental_number: 0,
        created_at: "2026-01-12T00:00:00Z".to_string(),
        updated_at: "2026-01-12T00:00:00Z".to_string(),
        store_id: TEST_STORE_ID.to_string(),
        created_by: None,
    };
    
    let json = serde_json::to_string(&backup_job).unwrap();
    assert!(json.contains("tenant_id"));
    assert!(json.contains(TEST_TENANT_ID));
}

/// Test that queries filter by tenant_id
#[tokio::test]
async fn test_query_filtering_by_tenant_id() {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create schema
    sqlx::query(
        "CREATE TABLE users (
            id TEXT PRIMARY KEY,
            tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive',
            username TEXT NOT NULL,
            email TEXT NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            store_id VARCHAR(255),
            station_policy VARCHAR(50) NOT NULL DEFAULT 'any',
            station_id VARCHAR(255),
            is_active BOOLEAN NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Insert users for two different tenants
    sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, role, tenant_id, station_policy, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .bind("user-1")
    .bind("user1")
    .bind("user1@example.com")
    .bind("hash1")
    .bind("cashier")
    .bind("tenant-a")
    .bind("any")
    .bind(true)
    .execute(&pool)
    .await
    .unwrap();
    
    sqlx::query(
        "INSERT INTO users (id, username, email, password_hash, role, tenant_id, station_policy, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .bind("user-2")
    .bind("user2")
    .bind("user2@example.com")
    .bind("hash2")
    .bind("cashier")
    .bind("tenant-b")
    .bind("any")
    .bind(true)
    .execute(&pool)
    .await
    .unwrap();
    
    // Query for tenant-a only
    let users: Vec<(String,)> = sqlx::query_as(
        "SELECT username FROM users WHERE tenant_id = ?"
    )
    .bind("tenant-a")
    .fetch_all(&pool)
    .await
    .unwrap();
    
    assert_eq!(users.len(), 1);
    assert_eq!(users[0].0, "user1");
    
    // Query for tenant-b only
    let users: Vec<(String,)> = sqlx::query_as(
        "SELECT username FROM users WHERE tenant_id = ?"
    )
    .bind("tenant-b")
    .fetch_all(&pool)
    .await
    .unwrap();
    
    assert_eq!(users.len(), 1);
    assert_eq!(users[0].0, "user2");
}

/// Test that INSERT includes tenant_id
#[tokio::test]
async fn test_insert_with_tenant_id() {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create schema
    sqlx::query(
        "CREATE TABLE backup_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive',
            backup_type VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL,
            started_at TEXT,
            completed_at TEXT,
            error_message TEXT,
            total_size INTEGER,
            files_count INTEGER,
            created_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Insert with explicit tenant_id
    let result = sqlx::query(
        "INSERT INTO backup_jobs (tenant_id, backup_type, status, created_at)
         VALUES (?, ?, ?, datetime('now'))"
    )
    .bind(TEST_TENANT_ID)
    .bind("database")
    .bind("pending")
    .execute(&pool)
    .await
    .unwrap();
    
    assert_eq!(result.rows_affected(), 1);
    
    // Verify tenant_id was stored correctly
    let tenant_id: String = sqlx::query_scalar(
        "SELECT tenant_id FROM backup_jobs WHERE id = ?"
    )
    .bind(result.last_insert_rowid())
    .fetch_one(&pool)
    .await
    .unwrap();
    
    assert_eq!(tenant_id, TEST_TENANT_ID);
}

/// Test that UPDATE respects tenant_id
#[tokio::test]
async fn test_update_respects_tenant_id() {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create schema
    sqlx::query(
        "CREATE TABLE backup_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive',
            backup_type VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL,
            created_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Insert jobs for two tenants
    sqlx::query(
        "INSERT INTO backup_jobs (tenant_id, backup_type, status, created_at)
         VALUES (?, ?, ?, datetime('now'))"
    )
    .bind("tenant-a")
    .bind("database")
    .bind("pending")
    .execute(&pool)
    .await
    .unwrap();
    
    sqlx::query(
        "INSERT INTO backup_jobs (tenant_id, backup_type, status, created_at)
         VALUES (?, ?, ?, datetime('now'))"
    )
    .bind("tenant-b")
    .bind("database")
    .bind("pending")
    .execute(&pool)
    .await
    .unwrap();
    
    // Try to update tenant-a's job
    let result = sqlx::query(
        "UPDATE backup_jobs SET status = ? WHERE tenant_id = ? AND id = ?"
    )
    .bind("completed")
    .bind("tenant-a")
    .bind(1)
    .execute(&pool)
    .await
    .unwrap();
    
    assert_eq!(result.rows_affected(), 1);
    
    // Verify only tenant-a's job was updated
    let status: String = sqlx::query_scalar(
        "SELECT status FROM backup_jobs WHERE id = 1"
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(status, "completed");
    
    let status: String = sqlx::query_scalar(
        "SELECT status FROM backup_jobs WHERE id = 2"
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(status, "pending");
    
    // Try to update tenant-b's job as tenant-a (should fail)
    let result = sqlx::query(
        "UPDATE backup_jobs SET status = ? WHERE tenant_id = ? AND id = ?"
    )
    .bind("completed")
    .bind("tenant-a")
    .bind(2)
    .execute(&pool)
    .await
    .unwrap();
    
    assert_eq!(result.rows_affected(), 0); // No rows updated
}

/// Test that DELETE respects tenant_id
#[tokio::test]
async fn test_delete_respects_tenant_id() {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create schema
    sqlx::query(
        "CREATE TABLE backup_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id VARCHAR(255) NOT NULL DEFAULT 'caps-automotive',
            backup_type VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL,
            created_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Insert jobs for two tenants
    sqlx::query(
        "INSERT INTO backup_jobs (tenant_id, backup_type, status, created_at)
         VALUES (?, ?, ?, datetime('now'))"
    )
    .bind("tenant-a")
    .bind("database")
    .bind("pending")
    .execute(&pool)
    .await
    .unwrap();
    
    sqlx::query(
        "INSERT INTO backup_jobs (tenant_id, backup_type, status, created_at)
         VALUES (?, ?, ?, datetime('now'))"
    )
    .bind("tenant-b")
    .bind("database")
    .bind("pending")
    .execute(&pool)
    .await
    .unwrap();
    
    // Try to delete tenant-a's job
    let result = sqlx::query(
        "DELETE FROM backup_jobs WHERE tenant_id = ? AND id = ?"
    )
    .bind("tenant-a")
    .bind(1)
    .execute(&pool)
    .await
    .unwrap();
    
    assert_eq!(result.rows_affected(), 1);
    
    // Verify only tenant-a's job was deleted
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM backup_jobs"
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(count, 1);
    
    let tenant_id: String = sqlx::query_scalar(
        "SELECT tenant_id FROM backup_jobs WHERE id = 2"
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    assert_eq!(tenant_id, "tenant-b");
    
    // Try to delete tenant-b's job as tenant-a (should fail)
    let result = sqlx::query(
        "DELETE FROM backup_jobs WHERE tenant_id = ? AND id = ?"
    )
    .bind("tenant-a")
    .bind(2)
    .execute(&pool)
    .await
    .unwrap();
    
    assert_eq!(result.rows_affected(), 0); // No rows deleted
}

/// Test that JOINs respect tenant_id
#[tokio::test]
async fn test_joins_respect_tenant_id() {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create schema
    sqlx::query(
        "CREATE TABLE backup_jobs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id VARCHAR(255) NOT NULL,
            backup_type VARCHAR(50) NOT NULL,
            status VARCHAR(50) NOT NULL,
            created_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    sqlx::query(
        "CREATE TABLE backup_manifests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id VARCHAR(255) NOT NULL,
            backup_job_id INTEGER NOT NULL,
            manifest_data TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id)
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Insert data for tenant-a
    sqlx::query(
        "INSERT INTO backup_jobs (tenant_id, backup_type, status, created_at)
         VALUES (?, ?, ?, datetime('now'))"
    )
    .bind("tenant-a")
    .bind("database")
    .bind("completed")
    .execute(&pool)
    .await
    .unwrap();
    
    sqlx::query(
        "INSERT INTO backup_manifests (tenant_id, backup_job_id, manifest_data, created_at)
         VALUES (?, ?, ?, datetime('now'))"
    )
    .bind("tenant-a")
    .bind(1)
    .bind("{}")
    .execute(&pool)
    .await
    .unwrap();
    
    // Insert data for tenant-b
    sqlx::query(
        "INSERT INTO backup_jobs (tenant_id, backup_type, status, created_at)
         VALUES (?, ?, ?, datetime('now'))"
    )
    .bind("tenant-b")
    .bind("database")
    .bind("completed")
    .execute(&pool)
    .await
    .unwrap();
    
    sqlx::query(
        "INSERT INTO backup_manifests (tenant_id, backup_job_id, manifest_data, created_at)
         VALUES (?, ?, ?, datetime('now'))"
    )
    .bind("tenant-b")
    .bind(2)
    .bind("{}")
    .execute(&pool)
    .await
    .unwrap();
    
    // Query with JOIN for tenant-a only
    let results: Vec<(i64, String)> = sqlx::query_as(
        "SELECT bj.id, bj.status 
         FROM backup_jobs bj
         INNER JOIN backup_manifests bm ON bj.id = bm.backup_job_id
         WHERE bj.tenant_id = ? AND bm.tenant_id = ?"
    )
    .bind("tenant-a")
    .bind("tenant-a")
    .fetch_all(&pool)
    .await
    .unwrap();
    
    assert_eq!(results.len(), 1);
    assert_eq!(results[0].0, 1);
    assert_eq!(results[0].1, "completed");
}

/// Test that indexes exist on tenant_id columns (optional - may not exist in test DB)
#[tokio::test]
#[ignore] // Ignore by default since it requires production database
async fn test_tenant_id_indexes_exist() {
    let pool = SqlitePool::connect("data/pos.db").await.unwrap();
    
    // Check for tenant_id indexes on key tables
    let tables = vec![
        "users",
        "sessions",
        "backup_jobs",
        "backup_settings",
        "backup_manifests",
        "backup_destinations",
        "backup_dest_objects",
        "restore_jobs",
    ];
    
    for table in tables {
        let index_name = format!("idx_{}_tenant_id", table);
        
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master 
             WHERE type = 'index' AND name = ?"
        )
        .bind(&index_name)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        assert_eq!(count, 1, "Index {} should exist", index_name);
    }
}
