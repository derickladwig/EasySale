/// Integration tests for fresh install restore functionality
/// 
/// Tests the complete upload and restore flow for fresh installations,
/// including validation, error handling, and corrupted archive detection.
/// 
/// **Validates: Requirements 7.2, 7.3, 7.5**

use EasySale_server::services::RestoreService;
use sqlx::SqlitePool;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use tempfile::TempDir;
use zip::write::{FileOptions, ZipWriter};
use sha2::{Sha256, Digest};

/// Helper function to create a test database pool
async fn create_test_pool() -> SqlitePool {
    let pool = SqlitePool::connect("sqlite::memory:")
        .await
        .expect("Failed to create test pool");
    
    // Create necessary tables manually (avoid migration conflicts)
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS backup_jobs (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            backup_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
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
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            store_id TEXT,
            created_by TEXT
        )
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create backup_jobs table");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS restore_jobs (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            backup_job_id TEXT NOT NULL,
            restore_type TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            started_at TEXT,
            completed_at TEXT,
            files_restored INTEGER DEFAULT 0,
            error_message TEXT,
            restore_point TEXT,
            pre_restore_snapshot_id TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            created_by TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create restore_jobs table");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS backup_manifests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            backup_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            checksum TEXT NOT NULL,
            is_deleted BOOLEAN DEFAULT FALSE,
            created_at TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create backup_manifests table");

    // Create test tables for database restore verification
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            email TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create users table");

    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create products table");
    
    pool
}

/// Helper function to create a valid backup archive for testing
async fn create_test_backup_archive(
    pool: &SqlitePool,
    backup_dir: &PathBuf,
    include_database: bool,
    include_files: bool,
) -> Result<(String, String), Box<dyn std::error::Error>> {
    let backup_id = uuid::Uuid::new_v4().to_string();
    let archive_filename = format!("test_backup_{}.zip", chrono::Utc::now().timestamp());
    let archive_path = backup_dir.join(&archive_filename);
    
    // Create ZIP archive
    let file = fs::File::create(&archive_path)?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    
    // Add database if requested
    if include_database {
        // Create a minimal valid SQLite database file
        // SQLite files start with "SQLite format 3\0" header
        let temp_db_name = format!("test_backup_{}.db", uuid::Uuid::new_v4());
        let temp_db = std::env::temp_dir().join(&temp_db_name);
        
        // Create a minimal valid SQLite database
        // This is a hex dump of a minimal SQLite database with one table
        let sqlite_header = b"SQLite format 3\0";
        let mut db_content = Vec::new();
        db_content.extend_from_slice(sqlite_header);
        // Pad to minimum SQLite file size (100 bytes header)
        db_content.resize(100, 0);
        // Set page size (bytes 16-17): 4096 (0x1000)
        db_content[16] = 0x10;
        db_content[17] = 0x00;
        
        fs::write(&temp_db, &db_content)?;
        
        // Add to ZIP
        zip.start_file("db/store_local.db", options)?;
        zip.write_all(&db_content)?;
        
        // Clean up temp database
        let _ = fs::remove_file(&temp_db);
    }
    
    // Add files if requested
    if include_files {
        zip.start_file("files/uploads/test_product.jpg", options)?;
        zip.write_all(b"fake image content")?;
        
        zip.start_file("files/config/settings.json", options)?;
        zip.write_all(b"{\"version\": \"1.0\"}")?;
    }
    
    // Add metadata
    zip.start_file("meta/manifest.json", options)?;
    let manifest = serde_json::json!({
        "backup_id": backup_id,
        "backup_type": "full",
        "timestamp": chrono::Utc::now().to_rfc3339(),
        "files": []
    });
    zip.write_all(manifest.to_string().as_bytes())?;
    
    zip.start_file("meta/backup.json", options)?;
    let backup_meta = serde_json::json!({
        "id": backup_id,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "type": "full"
    });
    zip.write_all(backup_meta.to_string().as_bytes())?;
    
    zip.finish()?;
    
    // Calculate checksum
    let checksum = {
        let mut file = fs::File::open(&archive_path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];
        loop {
            let n = std::io::Read::read(&mut file, &mut buffer)?;
            if n == 0 {
                break;
            }
            hasher.update(&buffer[..n]);
        }
        format!("{:x}", hasher.finalize())
    };
    
    // Insert backup job record
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO backup_jobs (id, tenant_id, backup_type, status, started_at, completed_at, archive_path, checksum, created_at, updated_at, created_by)
         VALUES (?, 'test-tenant', 'full', 'completed', ?, ?, ?, ?, ?, ?, 'system')"
    )
    .bind(&backup_id)
    .bind(&now)
    .bind(&now)
    .bind(&archive_filename)
    .bind(&checksum)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;
    
    Ok((backup_id, archive_filename))
}

/// Helper function to create a corrupted backup archive
async fn create_corrupted_backup_archive(
    pool: &SqlitePool,
    backup_dir: &PathBuf,
) -> Result<(String, String), Box<dyn std::error::Error>> {
    let backup_id = uuid::Uuid::new_v4().to_string();
    let archive_filename = format!("corrupted_backup_{}.zip", chrono::Utc::now().timestamp());
    let archive_path = backup_dir.join(&archive_filename);
    
    // Create a valid archive first
    let file = fs::File::create(&archive_path)?;
    let mut zip = ZipWriter::new(file);
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    
    zip.start_file("meta/backup.json", options)?;
    zip.write_all(b"{\"id\": \"test\"}")?;
    zip.finish()?;
    
    // Calculate checksum of the valid archive
    let valid_checksum = {
        let mut file = fs::File::open(&archive_path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];
        loop {
            let n = std::io::Read::read(&mut file, &mut buffer)?;
            if n == 0 {
                break;
            }
            hasher.update(&buffer[..n]);
        }
        format!("{:x}", hasher.finalize())
    };
    
    // Now corrupt the archive by appending garbage
    let mut file = fs::OpenOptions::new()
        .append(true)
        .open(&archive_path)?;
    file.write_all(b"CORRUPTED DATA")?;
    
    // Insert backup job record with the VALID checksum (so validation will fail)
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO backup_jobs (id, tenant_id, backup_type, status, started_at, completed_at, archive_path, checksum, created_at, updated_at, created_by)
         VALUES (?, 'test-tenant', 'full', 'completed', ?, ?, ?, ?, ?, ?, 'system')"
    )
    .bind(&backup_id)
    .bind(&now)
    .bind(&now)
    .bind(&archive_filename)
    .bind(&valid_checksum)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;
    
    Ok((backup_id, archive_filename))
}

/// Test 1: Upload and restore a valid backup archive
/// 
/// This test verifies the complete upload and restore flow:
/// 1. Creates a valid backup archive with database and files
/// 2. Simulates uploading it via the API
/// 3. Verifies the restore completes successfully
/// 
/// **Validates: Requirement 7.2 (upload and restore flow)**
#[tokio::test]
async fn test_upload_and_restore_valid_archive() {
    // Set up test environment
    let pool = create_test_pool().await;
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let backup_dir = temp_dir.path().join("backups");
    fs::create_dir_all(&backup_dir).expect("Failed to create backup dir");
    
    let db_path = temp_dir.path().join("store_local.db");
    let files_dir = temp_dir.path().join("uploads");
    fs::create_dir_all(&files_dir).expect("Failed to create files dir");
    
    // Set environment variables
    std::env::set_var("BACKUP_ROOT", backup_dir.to_str().unwrap());
    std::env::set_var("DATABASE_PATH", db_path.to_str().unwrap());
    std::env::set_var("UPLOADS_DIR", files_dir.to_str().unwrap());
    
    // Create an empty database file (RestoreService expects it to exist for atomic replacement)
    fs::write(&db_path, b"").expect("Failed to create empty database file");
    
    // Create a valid backup archive
    let (backup_id, archive_filename) = create_test_backup_archive(
        &pool,
        &backup_dir,
        true,  // include database
        true,  // include files
    ).await.expect("Failed to create test backup");
    
    // Read the archive file
    let archive_path = backup_dir.join(&archive_filename);
    let _archive_data = fs::read(&archive_path).expect("Failed to read archive");
    
    // Create RestoreService and validate archive
    let restore_service = RestoreService::new(pool.clone(), &backup_dir);
    let validation_result = restore_service.validate_archive(&backup_id).await;
    
    assert!(
        validation_result.is_ok(),
        "Archive validation should succeed for valid archive: {:?}",
        validation_result.err()
    );
    
    // Perform restore
    let restore_result = restore_service.restore_backup(
        &backup_id,
        "default",
        "default",
        db_path.to_str().unwrap(),
        files_dir.to_str().unwrap(),
        false, // no pre-restore snapshot for fresh install
        false, // no strict delete
        Some("system"),
    ).await;
    
    assert!(
        restore_result.is_ok(),
        "Restore should succeed for valid archive: {:?}",
        restore_result.err()
    );
    
    let restore_job = restore_result.unwrap();
    assert_eq!(restore_job.status, "completed", "Restore job should be completed");
    assert!(restore_job.error_message.is_none(), "Should have no error message");
    
    // Verify database was restored
    assert!(db_path.exists(), "Database file should exist after restore");
    
    // Verify files were restored
    let restored_file = files_dir.join("uploads/test_product.jpg");
    assert!(restored_file.exists(), "Uploaded file should exist after restore");
    
    println!("✓ Test passed: Upload and restore valid archive");
}

/// Test 2: Validate archive checksums before restore
/// 
/// This test verifies that archive validation detects checksum mismatches:
/// 1. Creates a backup archive
/// 2. Corrupts the archive after checksum calculation
/// 3. Attempts to validate the archive
/// 4. Verifies validation fails with appropriate error message
/// 
/// **Validates: Requirement 7.3 (validation of uploaded archives)**
#[tokio::test]
async fn test_validate_archive_checksum() {
    // Set up test environment
    let pool = create_test_pool().await;
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let backup_dir = temp_dir.path().join("backups");
    fs::create_dir_all(&backup_dir).expect("Failed to create backup dir");
    
    // Create a corrupted backup archive
    let (backup_id, _archive_filename) = create_corrupted_backup_archive(
        &pool,
        &backup_dir,
    ).await.expect("Failed to create corrupted backup");
    
    // Create RestoreService and attempt to validate
    let restore_service = RestoreService::new(pool.clone(), &backup_dir);
    let validation_result = restore_service.validate_archive(&backup_id).await;
    
    assert!(
        validation_result.is_err(),
        "Archive validation should fail for corrupted archive"
    );
    
    let error_message = validation_result.err().unwrap().to_string();
    assert!(
        error_message.contains("Checksum mismatch") || error_message.contains("corrupted"),
        "Error message should indicate checksum mismatch or corruption, got: {}",
        error_message
    );
    
    println!("✓ Test passed: Validate archive checksum detects corruption");
}

/// Test 3: Handle corrupted archives with proper error messages
/// 
/// This test verifies that attempting to restore a corrupted archive:
/// 1. Fails validation before any restore actions
/// 2. Returns a clear error message
/// 3. Does not create a restore job record with 'completed' status
/// 4. Provides remediation steps in the error message
/// 
/// **Validates: Requirement 7.5 (error handling for corrupted archives)**
#[tokio::test]
async fn test_restore_corrupted_archive_error_handling() {
    // Set up test environment
    let pool = create_test_pool().await;
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let backup_dir = temp_dir.path().join("backups");
    fs::create_dir_all(&backup_dir).expect("Failed to create backup dir");
    
    let db_path = temp_dir.path().join("store_local.db");
    let files_dir = temp_dir.path().join("uploads");
    fs::create_dir_all(&files_dir).expect("Failed to create files dir");
    
    // Create a corrupted backup archive
    let (backup_id, _archive_filename) = create_corrupted_backup_archive(
        &pool,
        &backup_dir,
    ).await.expect("Failed to create corrupted backup");
    
    // Create RestoreService and attempt restore
    let restore_service = RestoreService::new(pool.clone(), &backup_dir);
    let restore_result = restore_service.restore_backup(
        &backup_id,
        "default",
        "default",
        db_path.to_str().unwrap(),
        files_dir.to_str().unwrap(),
        false, // no pre-restore snapshot
        false, // no strict delete
        Some("system"),
    ).await;
    
    // Verify restore failed
    assert!(
        restore_result.is_err(),
        "Restore should fail for corrupted archive"
    );
    
    let error_message = restore_result.err().unwrap().to_string();
    
    // Verify error message contains useful information
    assert!(
        error_message.contains("Checksum mismatch") || 
        error_message.contains("corrupted") ||
        error_message.contains("Archive corrupted"),
        "Error message should indicate corruption, got: {}",
        error_message
    );
    
    // Verify error message contains remediation steps
    assert!(
        error_message.contains("Remediation") || 
        error_message.contains("DO NOT use this backup") ||
        error_message.contains("steps"),
        "Error message should contain remediation guidance, got: {}",
        error_message
    );
    
    // Verify no completed restore job was created
    let restore_jobs: Vec<(String,)> = sqlx::query_as(
        "SELECT status FROM restore_jobs WHERE backup_job_id = ? AND status = 'completed'"
    )
    .bind(&backup_id)
    .fetch_all(&pool)
    .await
    .expect("Failed to query restore jobs");
    
    assert!(
        restore_jobs.is_empty(),
        "No completed restore job should exist for corrupted archive"
    );
    
    // Verify a failed restore job was created
    let failed_jobs: Vec<(String, Option<String>)> = sqlx::query_as(
        "SELECT status, error_message FROM restore_jobs WHERE backup_job_id = ? AND status = 'failed'"
    )
    .bind(&backup_id)
    .fetch_all(&pool)
    .await
    .expect("Failed to query restore jobs");
    
    assert!(
        !failed_jobs.is_empty(),
        "A failed restore job should exist for corrupted archive"
    );
    
    let (status, error_msg) = &failed_jobs[0];
    assert_eq!(status, "failed", "Restore job status should be 'failed'");
    assert!(
        error_msg.is_some(),
        "Failed restore job should have an error message"
    );
    
    println!("✓ Test passed: Corrupted archive error handling");
}

/// Test 4: Validate archive with missing database file
/// 
/// This test verifies that archives without a database file are rejected:
/// 1. Creates an archive with only files (no database)
/// 2. Attempts to restore
/// 3. Verifies restore fails with appropriate error
/// 
/// **Validates: Requirement 7.3 (validation of uploaded archives)**
#[tokio::test]
async fn test_restore_archive_missing_database() {
    // Set up test environment
    let pool = create_test_pool().await;
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let backup_dir = temp_dir.path().join("backups");
    fs::create_dir_all(&backup_dir).expect("Failed to create backup dir");
    
    let db_path = temp_dir.path().join("store_local.db");
    let files_dir = temp_dir.path().join("uploads");
    fs::create_dir_all(&files_dir).expect("Failed to create files dir");
    
    // Create a backup archive WITHOUT database
    let (backup_id, _archive_filename) = create_test_backup_archive(
        &pool,
        &backup_dir,
        false, // NO database
        true,  // include files
    ).await.expect("Failed to create test backup");
    
    // Create RestoreService and attempt restore
    let restore_service = RestoreService::new(pool.clone(), &backup_dir);
    let restore_result = restore_service.restore_backup(
        &backup_id,
        "default",
        "default",
        db_path.to_str().unwrap(),
        files_dir.to_str().unwrap(),
        false,
        false,
        Some("system"),
    ).await;
    
    // Verify restore failed
    assert!(
        restore_result.is_err(),
        "Restore should fail for archive without database"
    );
    
    let error_message = restore_result.err().unwrap().to_string();
    assert!(
        error_message.contains("No database file found") || 
        error_message.contains("database"),
        "Error message should indicate missing database, got: {}",
        error_message
    );
    
    println!("✓ Test passed: Archive missing database is rejected");
}

/// Test 5: Validate archive with invalid ZIP format
/// 
/// This test verifies that non-ZIP files are rejected:
/// 1. Creates a file that is not a valid ZIP archive
/// 2. Registers it as a backup
/// 3. Attempts to restore
/// 4. Verifies restore fails appropriately
/// 
/// **Validates: Requirement 7.5 (error handling for corrupted archives)**
#[tokio::test]
async fn test_restore_invalid_zip_format() {
    // Set up test environment
    let pool = create_test_pool().await;
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let backup_dir = temp_dir.path().join("backups");
    fs::create_dir_all(&backup_dir).expect("Failed to create backup dir");
    
    let db_path = temp_dir.path().join("store_local.db");
    let files_dir = temp_dir.path().join("uploads");
    fs::create_dir_all(&files_dir).expect("Failed to create files dir");
    
    // Create an invalid (non-ZIP) file
    let backup_id = uuid::Uuid::new_v4().to_string();
    let archive_filename = format!("invalid_{}.zip", chrono::Utc::now().timestamp());
    let archive_path = backup_dir.join(&archive_filename);
    
    // Write garbage data
    let mut file = fs::File::create(&archive_path).expect("Failed to create file");
    file.write_all(b"This is not a valid ZIP file!").expect("Failed to write");
    
    // Calculate checksum
    let checksum = {
        let mut file = fs::File::open(&archive_path).expect("Failed to open file");
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];
        loop {
            let n = std::io::Read::read(&mut file, &mut buffer).expect("Failed to read");
            if n == 0 {
                break;
            }
            hasher.update(&buffer[..n]);
        }
        format!("{:x}", hasher.finalize())
    };
    
    // Insert backup job record
    let now = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "INSERT INTO backup_jobs (id, tenant_id, backup_type, status, started_at, completed_at, archive_path, checksum, created_at, updated_at, created_by)
         VALUES (?, 'test-tenant', 'full', 'completed', ?, ?, ?, ?, ?, ?, 'system')"
    )
    .bind(&backup_id)
    .bind(&now)
    .bind(&now)
    .bind(&archive_filename)
    .bind(&checksum)
    .bind(&now)
    .bind(&now)
    .execute(&pool)
    .await
    .expect("Failed to insert backup job");
    
    // Create RestoreService and attempt restore
    let restore_service = RestoreService::new(pool.clone(), &backup_dir);
    let restore_result = restore_service.restore_backup(
        &backup_id,
        "default",
        "default",
        db_path.to_str().unwrap(),
        files_dir.to_str().unwrap(),
        false,
        false,
        Some("system"),
    ).await;
    
    // Verify restore failed
    assert!(
        restore_result.is_err(),
        "Restore should fail for invalid ZIP format"
    );
    
    let error_message = restore_result.err().unwrap().to_string();
    // The error could be about ZIP format or about missing database file
    assert!(
        error_message.contains("ZIP") || 
        error_message.contains("database") ||
        error_message.contains("Invalid") ||
        error_message.contains("archive"),
        "Error message should indicate invalid archive format, got: {}",
        error_message
    );
    
    println!("✓ Test passed: Invalid ZIP format is rejected");
}

/// Test 6: End-to-end fresh install restore flow
/// 
/// This test simulates the complete fresh install restore process:
/// 1. Creates a valid backup with database and files
/// 2. Validates the archive
/// 3. Performs the restore
/// 4. Verifies the database and files are correctly restored
/// 5. Verifies the restore job is recorded correctly
/// 
/// **Validates: Requirements 7.2, 7.3**
#[tokio::test]
async fn test_end_to_end_fresh_install_restore() {
    // Set up test environment
    let pool = create_test_pool().await;
    let temp_dir = TempDir::new().expect("Failed to create temp dir");
    let backup_dir = temp_dir.path().join("backups");
    fs::create_dir_all(&backup_dir).expect("Failed to create backup dir");
    
    let db_path = temp_dir.path().join("store_local.db");
    let files_dir = temp_dir.path().join("uploads");
    fs::create_dir_all(&files_dir).expect("Failed to create files dir");
    
    // Create an empty database file (RestoreService expects it to exist for atomic replacement)
    fs::write(&db_path, b"").expect("Failed to create empty database file");
    
    // Create a valid backup archive
    let (backup_id, _archive_filename) = create_test_backup_archive(
        &pool,
        &backup_dir,
        true,  // include database
        true,  // include files
    ).await.expect("Failed to create test backup");
    
    // Create RestoreService
    let restore_service = RestoreService::new(pool.clone(), &backup_dir);
    
    // Step 1: Validate archive
    let validation_result = restore_service.validate_archive(&backup_id).await;
    assert!(
        validation_result.is_ok(),
        "Archive validation should succeed: {:?}",
        validation_result.err()
    );
    
    // Step 2: Perform restore
    let restore_result = restore_service.restore_backup(
        &backup_id,
        "default",
        "default",
        db_path.to_str().unwrap(),
        files_dir.to_str().unwrap(),
        false, // no pre-restore snapshot for fresh install
        false, // no strict delete
        Some("system"),
    ).await;
    
    assert!(
        restore_result.is_ok(),
        "Restore should succeed: {:?}",
        restore_result.err()
    );
    
    let restore_job = restore_result.unwrap();
    
    // Step 3: Verify restore job record
    assert_eq!(restore_job.status, "completed", "Restore job should be completed");
    assert_eq!(restore_job.backup_job_id, backup_id, "Restore job should reference correct backup");
    assert!(restore_job.error_message.is_none(), "Should have no error message");
    assert!(restore_job.completed_at.is_some(), "Should have completion timestamp");
    assert!(
        restore_job.pre_restore_snapshot_id.is_none(),
        "Fresh install should not create pre-restore snapshot"
    );
    
    // Step 4: Verify database was restored
    assert!(db_path.exists(), "Database file should exist after restore");
    
    // Verify the database file has content (not empty)
    let metadata = fs::metadata(&db_path).expect("Should be able to get database metadata");
    assert!(metadata.len() > 0, "Restored database should not be empty");
    
    // Note: We're using a minimal SQLite header for testing, so we can't actually query it
    // In a real scenario, the database would be fully functional
    
    // Step 5: Verify files were restored
    let restored_file = files_dir.join("uploads/test_product.jpg");
    assert!(restored_file.exists(), "Uploaded file should exist after restore");
    
    let file_content = fs::read(&restored_file).expect("Should be able to read restored file");
    assert_eq!(
        file_content,
        b"fake image content",
        "Restored file should have correct content"
    );
    
    let config_file = files_dir.join("config/settings.json");
    assert!(config_file.exists(), "Config file should exist after restore");
    
    println!("✓ Test passed: End-to-end fresh install restore");
}
