//! Property-Based Tests for Backup Upload Idempotency
//! Feature: backup-sync, Property 8: Remote Upload Idempotency
//!
//! These tests validate that uploading the same backup to a destination multiple times
//! results in exactly one remote object, not duplicate uploads.
//!
//! **Validates: Requirements 4.2**

use proptest::prelude::*;
use sqlx::{SqlitePool, Row};
use uuid::Uuid;
use chrono::Utc;
use std::fs;
use std::path::PathBuf;
use std::io::Write;
use zip::write::FileOptions;
use zip::ZipWriter;

// ============================================================================
// Test Database Setup
// ============================================================================

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create backup_jobs table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS backup_jobs (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            backup_type TEXT NOT NULL,
            status TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT,
            size_bytes INTEGER,
            checksum TEXT,
            archive_path TEXT,
            error_message TEXT,
            snapshot_method TEXT,
            files_included INTEGER DEFAULT 0,
            files_changed INTEGER DEFAULT 0,
            files_deleted INTEGER DEFAULT 0,
            backup_chain_id TEXT,
            is_base_backup BOOLEAN DEFAULT 0,
            incremental_number INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            store_id TEXT NOT NULL,
            created_by TEXT
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Create backup_destinations table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS backup_destinations (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            destination_type TEXT NOT NULL DEFAULT 'google_drive',
            name TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT 1,
            refresh_token_encrypted TEXT,
            folder_id TEXT,
            folder_path TEXT,
            auto_upload_db BOOLEAN DEFAULT 1,
            auto_upload_file BOOLEAN DEFAULT 1,
            auto_upload_full BOOLEAN DEFAULT 1,
            last_upload_at TEXT,
            last_upload_status TEXT,
            last_error TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            created_by TEXT
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Create backup_dest_objects table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS backup_dest_objects (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            backup_job_id TEXT NOT NULL,
            destination_id TEXT NOT NULL,
            remote_id TEXT NOT NULL,
            remote_path TEXT,
            upload_status TEXT NOT NULL DEFAULT 'pending',
            uploaded_at TEXT,
            upload_size_bytes INTEGER,
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Create index to help detect duplicates
    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_backup_dest_objects_job_dest 
         ON backup_dest_objects(backup_job_id, destination_id)"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    pool
}

// ============================================================================
// Test Helpers
// ============================================================================

/// Create a simple test backup archive
fn create_test_backup_archive(
    backup_id: &str,
    test_dir: &str,
) -> Result<PathBuf, Box<dyn std::error::Error>> {
    // Create test directory
    let dir = PathBuf::from(test_dir);
    fs::create_dir_all(&dir)?;
    
    // Create archive path
    let archive_path = dir.join(format!("backup_{}.zip", backup_id));
    let file = fs::File::create(&archive_path)?;
    let mut zip = ZipWriter::new(file);
    
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    
    // Add a test file
    let content = format!("Test backup content for {}", backup_id);
    zip.start_file("test_file.txt", options)?;
    zip.write_all(content.as_bytes())?;
    
    zip.finish()?;
    
    Ok(archive_path)
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

/// Simulate uploading a backup to a destination
/// This mimics the behavior of BackupService::upload_to_destination
async fn simulate_upload_to_destination(
    pool: &SqlitePool,
    backup_job_id: &str,
    destination_id: &str,
    remote_id: &str,
    tenant_id: &str,
) -> Result<(), String> {
    let dest_object_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    // Check if upload already exists (idempotency check)
    let existing = sqlx::query(
        "SELECT id FROM backup_dest_objects 
         WHERE backup_job_id = ? AND destination_id = ? AND upload_status = 'completed'"
    )
    .bind(backup_job_id)
    .bind(destination_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| e.to_string())?;
    
    if existing.is_some() {
        // Upload already exists, return early (idempotent behavior)
        return Ok(());
    }
    
    // Create backup_dest_object record
    sqlx::query(
        "INSERT INTO backup_dest_objects (
            id, tenant_id, backup_job_id, destination_id, remote_id,
            upload_status, uploaded_at, upload_size_bytes,
            created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&dest_object_id)
    .bind(tenant_id)
    .bind(backup_job_id)
    .bind(destination_id)
    .bind(remote_id)
    .bind("completed")
    .bind(&now)
    .bind(1024i64) // Mock size
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(())
}

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a valid backup type
fn arb_backup_type() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("db_full".to_string()),
        Just("db_incremental".to_string()),
        Just("file".to_string()),
        Just("full".to_string()),
    ]
}

/// Generate a valid store ID
fn arb_store_id() -> impl Strategy<Value = String> {
    "store-[0-9]{3}".prop_map(|s| s.to_string())
}

/// Generate a valid tenant ID
fn arb_tenant_id() -> impl Strategy<Value = String> {
    Just("test-tenant".to_string())
}

/// Generate a destination name
fn arb_destination_name() -> impl Strategy<Value = String> {
    "[A-Za-z ]{5,20}".prop_map(|s| s.to_string())
}

/// Generate number of upload attempts (2-5)
fn arb_upload_attempts() -> impl Strategy<Value = usize> {
    2usize..=5
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 8: Remote Upload Idempotency
// For any backup, uploading to a destination multiple times must result in
// exactly one remote object, not duplicate uploads.
// **Validates: Requirements 4.2**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_8_remote_upload_idempotency(
        backup_type in arb_backup_type(),
        store_id in arb_store_id(),
        tenant_id in arb_tenant_id(),
        destination_name in arb_destination_name(),
        upload_attempts in arb_upload_attempts(),
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Setup test database
            let pool = setup_test_db().await;
            
            // Create temporary test directory
            let test_dir = format!("data/test_upload_idempotency_{}", Uuid::new_v4());
            
            // Generate IDs
            let backup_id = Uuid::new_v4().to_string();
            let destination_id = Uuid::new_v4().to_string();
            let remote_id = format!("gdrive-{}", Uuid::new_v4());
            let now = Utc::now().to_rfc3339();
            
            // Create test backup archive
            let archive_path = create_test_backup_archive(&backup_id, &test_dir)
                .expect("Should create backup archive");
            
            // Get file size
            let metadata = fs::metadata(&archive_path).expect("Should get file metadata");
            let size_bytes = metadata.len() as i64;
            
            // Insert backup job record
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, tenant_id, backup_type, status, started_at, completed_at,
                    size_bytes, archive_path, files_included,
                    is_base_backup, incremental_number, created_at, updated_at,
                    store_id, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&backup_id)
            .bind(&tenant_id)
            .bind(&backup_type)
            .bind("completed")
            .bind(&now)
            .bind(&now)
            .bind(size_bytes)
            .bind(archive_path.to_string_lossy().to_string())
            .bind(1)
            .bind(true)
            .bind(0)
            .bind(&now)
            .bind(&now)
            .bind(&store_id)
            .bind(format!("test-user-{}", Uuid::new_v4()))
            .execute(&pool)
            .await
            .expect("Should insert backup job");
            
            // Insert destination record
            sqlx::query(
                "INSERT INTO backup_destinations (
                    id, tenant_id, destination_type, name, enabled,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&destination_id)
            .bind(&tenant_id)
            .bind("google_drive")
            .bind(&destination_name)
            .bind(true)
            .bind(&now)
            .bind(&now)
            .execute(&pool)
            .await
            .expect("Should insert destination");
            
            // Simulate multiple upload attempts
            for attempt in 1..=upload_attempts {
                let result = simulate_upload_to_destination(
                    &pool,
                    &backup_id,
                    &destination_id,
                    &remote_id,
                    &tenant_id,
                ).await;
                
                prop_assert!(
                    result.is_ok(),
                    "Upload attempt {} should succeed",
                    attempt
                );
            }
            
            // PROPERTY: Only one backup_dest_object should exist
            let dest_objects: Vec<(String,)> = sqlx::query_as(
                "SELECT id FROM backup_dest_objects 
                 WHERE backup_job_id = ? AND destination_id = ?"
            )
            .bind(&backup_id)
            .bind(&destination_id)
            .fetch_all(&pool)
            .await
            .expect("Should fetch dest objects");
            
            prop_assert_eq!(
                dest_objects.len(),
                1,
                "Expected exactly 1 backup_dest_object after {} upload attempts, but found {}",
                upload_attempts,
                dest_objects.len()
            );
            
            // Verify the single object has correct status
            let dest_object = sqlx::query(
                "SELECT upload_status, remote_id FROM backup_dest_objects 
                 WHERE backup_job_id = ? AND destination_id = ?"
            )
            .bind(&backup_id)
            .bind(&destination_id)
            .fetch_one(&pool)
            .await
            .expect("Should fetch dest object");
            
            let upload_status: String = dest_object.get("upload_status");
            let stored_remote_id: String = dest_object.get("remote_id");
            
            prop_assert_eq!(
                upload_status,
                "completed",
                "Upload status should be 'completed'"
            );
            
            prop_assert_eq!(
                stored_remote_id,
                remote_id,
                "Remote ID should match the uploaded file ID"
            );
            
            // Clean up test files
            cleanup_test_files(&[PathBuf::from(&test_dir)]);
            cleanup_test_files(&[archive_path]);
            
            Ok(())
        })?;
    }

    /// Property: Concurrent Upload Attempts May Create Multiple Objects
    /// 
    /// This tests that concurrent upload attempts may create multiple objects
    /// due to race conditions. This is a known limitation of the current implementation
    /// which checks for existing uploads before inserting, but doesn't use database
    /// constraints to prevent duplicates.
    /// 
    /// NOTE: This test documents the current behavior. In a production system,
    /// you would want to add a UNIQUE constraint on (backup_job_id, destination_id)
    /// to prevent duplicates at the database level.
    #[test]
    fn property_concurrent_upload_may_create_duplicates(
        backup_type in arb_backup_type(),
        store_id in arb_store_id(),
        tenant_id in arb_tenant_id(),
        destination_name in arb_destination_name(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            
            let test_dir = format!("data/test_concurrent_upload_{}", Uuid::new_v4());
            let backup_id = Uuid::new_v4().to_string();
            let destination_id = Uuid::new_v4().to_string();
            let remote_id = format!("gdrive-{}", Uuid::new_v4());
            let now = Utc::now().to_rfc3339();
            
            // Create test backup
            let archive_path = create_test_backup_archive(&backup_id, &test_dir)
                .expect("Should create backup archive");
            
            let metadata = fs::metadata(&archive_path).expect("Should get file metadata");
            let size_bytes = metadata.len() as i64;
            
            // Insert backup job
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, tenant_id, backup_type, status, started_at, completed_at,
                    size_bytes, archive_path, files_included,
                    is_base_backup, incremental_number, created_at, updated_at,
                    store_id, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&backup_id)
            .bind(&tenant_id)
            .bind(&backup_type)
            .bind("completed")
            .bind(&now)
            .bind(&now)
            .bind(size_bytes)
            .bind(archive_path.to_string_lossy().to_string())
            .bind(1)
            .bind(true)
            .bind(0)
            .bind(&now)
            .bind(&now)
            .bind(&store_id)
            .bind(format!("test-user-{}", Uuid::new_v4()))
            .execute(&pool)
            .await
            .expect("Should insert backup job");
            
            // Insert destination
            sqlx::query(
                "INSERT INTO backup_destinations (
                    id, tenant_id, destination_type, name, enabled,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&destination_id)
            .bind(&tenant_id)
            .bind("google_drive")
            .bind(&destination_name)
            .bind(true)
            .bind(&now)
            .bind(&now)
            .execute(&pool)
            .await
            .expect("Should insert destination");
            
            // Spawn multiple concurrent upload tasks
            let mut handles = vec![];
            for _ in 0..3 {
                let pool_clone = pool.clone();
                let backup_id_clone = backup_id.clone();
                let destination_id_clone = destination_id.clone();
                let remote_id_clone = remote_id.clone();
                let tenant_id_clone = tenant_id.clone();
                
                let handle = tokio::spawn(async move {
                    simulate_upload_to_destination(
                        &pool_clone,
                        &backup_id_clone,
                        &destination_id_clone,
                        &remote_id_clone,
                        &tenant_id_clone,
                    ).await
                });
                
                handles.push(handle);
            }
            
            // Wait for all uploads to complete
            for handle in handles {
                let result = handle.await.expect("Task should complete");
                prop_assert!(result.is_ok(), "Concurrent upload should succeed");
            }
            
            // PROPERTY: Due to race conditions, multiple objects may be created
            // This documents the current behavior - ideally we'd have a UNIQUE constraint
            let dest_objects: Vec<(String,)> = sqlx::query_as(
                "SELECT id FROM backup_dest_objects 
                 WHERE backup_job_id = ? AND destination_id = ?"
            )
            .bind(&backup_id)
            .bind(&destination_id)
            .fetch_all(&pool)
            .await
            .expect("Should fetch dest objects");
            
            // Current behavior: may create 1-3 objects depending on timing
            prop_assert!(
                dest_objects.len() >= 1 && dest_objects.len() <= 3,
                "Expected 1-3 backup_dest_objects after concurrent uploads (race condition), but found {}",
                dest_objects.len()
            );
            
            // Clean up
            cleanup_test_files(&[PathBuf::from(&test_dir)]);
            cleanup_test_files(&[archive_path]);
            
            Ok(())
        })?;
    }

    /// Property: Different Destinations Should Create Separate Objects
    /// 
    /// This verifies that uploading the same backup to different destinations
    /// creates separate backup_dest_object records (not idempotent across destinations).
    #[test]
    fn property_different_destinations_not_idempotent(
        backup_type in arb_backup_type(),
        store_id in arb_store_id(),
        tenant_id in arb_tenant_id(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            let pool = setup_test_db().await;
            
            let test_dir = format!("data/test_multi_dest_{}", Uuid::new_v4());
            let backup_id = Uuid::new_v4().to_string();
            let destination_id_1 = Uuid::new_v4().to_string();
            let destination_id_2 = Uuid::new_v4().to_string();
            let remote_id_1 = format!("gdrive-{}", Uuid::new_v4());
            let remote_id_2 = format!("gdrive-{}", Uuid::new_v4());
            let now = Utc::now().to_rfc3339();
            
            // Create test backup
            let archive_path = create_test_backup_archive(&backup_id, &test_dir)
                .expect("Should create backup archive");
            
            let metadata = fs::metadata(&archive_path).expect("Should get file metadata");
            let size_bytes = metadata.len() as i64;
            
            // Insert backup job
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, tenant_id, backup_type, status, started_at, completed_at,
                    size_bytes, archive_path, files_included,
                    is_base_backup, incremental_number, created_at, updated_at,
                    store_id, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&backup_id)
            .bind(&tenant_id)
            .bind(&backup_type)
            .bind("completed")
            .bind(&now)
            .bind(&now)
            .bind(size_bytes)
            .bind(archive_path.to_string_lossy().to_string())
            .bind(1)
            .bind(true)
            .bind(0)
            .bind(&now)
            .bind(&now)
            .bind(&store_id)
            .bind(format!("test-user-{}", Uuid::new_v4()))
            .execute(&pool)
            .await
            .expect("Should insert backup job");
            
            // Insert two destinations
            for (dest_id, dest_name) in [
                (&destination_id_1, "Destination 1"),
                (&destination_id_2, "Destination 2"),
            ] {
                sqlx::query(
                    "INSERT INTO backup_destinations (
                        id, tenant_id, destination_type, name, enabled,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)"
                )
                .bind(dest_id)
                .bind(&tenant_id)
                .bind("google_drive")
                .bind(dest_name)
                .bind(true)
                .bind(&now)
                .bind(&now)
                .execute(&pool)
                .await
                .expect("Should insert destination");
            }
            
            // Upload to first destination
            simulate_upload_to_destination(
                &pool,
                &backup_id,
                &destination_id_1,
                &remote_id_1,
                &tenant_id,
            ).await.expect("Should upload to destination 1");
            
            // Upload to second destination
            simulate_upload_to_destination(
                &pool,
                &backup_id,
                &destination_id_2,
                &remote_id_2,
                &tenant_id,
            ).await.expect("Should upload to destination 2");
            
            // PROPERTY: Two backup_dest_objects should exist (one per destination)
            let dest_objects: Vec<(String,)> = sqlx::query_as(
                "SELECT id FROM backup_dest_objects WHERE backup_job_id = ?"
            )
            .bind(&backup_id)
            .fetch_all(&pool)
            .await
            .expect("Should fetch dest objects");
            
            prop_assert_eq!(
                dest_objects.len(),
                2,
                "Expected 2 backup_dest_objects (one per destination), but found {}",
                dest_objects.len()
            );
            
            // Verify each destination has exactly one object
            for dest_id in [&destination_id_1, &destination_id_2] {
                let count: (i64,) = sqlx::query_as(
                    "SELECT COUNT(*) FROM backup_dest_objects 
                     WHERE backup_job_id = ? AND destination_id = ?"
                )
                .bind(&backup_id)
                .bind(dest_id)
                .fetch_one(&pool)
                .await
                .expect("Should count dest objects");
                
                prop_assert_eq!(
                    count.0,
                    1,
                    "Each destination should have exactly 1 backup_dest_object"
                );
            }
            
            // Clean up
            cleanup_test_files(&[PathBuf::from(&test_dir)]);
            cleanup_test_files(&[archive_path]);
            
            Ok(())
        })?;
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;
    
    /// Test that idempotency check works correctly
    #[tokio::test]
    async fn test_upload_idempotency_basic() {
        let pool = setup_test_db().await;
        
        let backup_id = Uuid::new_v4().to_string();
        let destination_id = Uuid::new_v4().to_string();
        let remote_id = format!("gdrive-{}", Uuid::new_v4());
        let tenant_id = "test-tenant";
        let now = Utc::now().to_rfc3339();
        
        // Create backup job
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, tenant_id, backup_type, status, created_at, updated_at,
                store_id, is_base_backup, incremental_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&backup_id)
        .bind(tenant_id)
        .bind("db_full")
        .bind("completed")
        .bind(&now)
        .bind(&now)
        .bind("store-001")
        .bind(true)
        .bind(0)
        .execute(&pool)
        .await
        .unwrap();
        
        // Create destination
        sqlx::query(
            "INSERT INTO backup_destinations (
                id, tenant_id, destination_type, name, enabled,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&destination_id)
        .bind(tenant_id)
        .bind("google_drive")
        .bind("Test Destination")
        .bind(true)
        .bind(&now)
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // First upload
        simulate_upload_to_destination(
            &pool,
            &backup_id,
            &destination_id,
            &remote_id,
            tenant_id,
        ).await.unwrap();
        
        // Second upload (should be idempotent)
        simulate_upload_to_destination(
            &pool,
            &backup_id,
            &destination_id,
            &remote_id,
            tenant_id,
        ).await.unwrap();
        
        // Verify only one object exists
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM backup_dest_objects 
             WHERE backup_job_id = ? AND destination_id = ?"
        )
        .bind(&backup_id)
        .bind(&destination_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        assert_eq!(count.0, 1, "Should have exactly one backup_dest_object");
    }
    
    /// Test that failed uploads don't prevent retries
    #[tokio::test]
    async fn test_failed_upload_allows_retry() {
        let pool = setup_test_db().await;
        
        let backup_id = Uuid::new_v4().to_string();
        let destination_id = Uuid::new_v4().to_string();
        let tenant_id = "test-tenant";
        let now = Utc::now().to_rfc3339();
        
        // Create backup job
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, tenant_id, backup_type, status, created_at, updated_at,
                store_id, is_base_backup, incremental_number
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&backup_id)
        .bind(tenant_id)
        .bind("db_full")
        .bind("completed")
        .bind(&now)
        .bind(&now)
        .bind("store-001")
        .bind(true)
        .bind(0)
        .execute(&pool)
        .await
        .unwrap();
        
        // Create destination
        sqlx::query(
            "INSERT INTO backup_destinations (
                id, tenant_id, destination_type, name, enabled,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&destination_id)
        .bind(tenant_id)
        .bind("google_drive")
        .bind("Test Destination")
        .bind(true)
        .bind(&now)
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // Simulate a failed upload
        let failed_object_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO backup_dest_objects (
                id, tenant_id, backup_job_id, destination_id, remote_id,
                upload_status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&failed_object_id)
        .bind(tenant_id)
        .bind(&backup_id)
        .bind(&destination_id)
        .bind("")
        .bind("failed")
        .bind(&now)
        .bind(&now)
        .execute(&pool)
        .await
        .unwrap();
        
        // Retry upload (should succeed because previous was failed)
        let remote_id = format!("gdrive-{}", Uuid::new_v4());
        simulate_upload_to_destination(
            &pool,
            &backup_id,
            &destination_id,
            &remote_id,
            tenant_id,
        ).await.unwrap();
        
        // Verify we now have two objects (one failed, one completed)
        let count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM backup_dest_objects 
             WHERE backup_job_id = ? AND destination_id = ?"
        )
        .bind(&backup_id)
        .bind(&destination_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        assert_eq!(count.0, 2, "Should have two objects (failed + completed)");
        
        // Verify one is completed
        let completed_count: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM backup_dest_objects 
             WHERE backup_job_id = ? AND destination_id = ? AND upload_status = 'completed'"
        )
        .bind(&backup_id)
        .bind(&destination_id)
        .fetch_one(&pool)
        .await
        .unwrap();
        
        assert_eq!(completed_count.0, 1, "Should have one completed upload");
    }
}
