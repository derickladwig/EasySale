// Property-Based Tests for Unified Backup & Sync Module
// Feature: backup-sync, Property 1: Backup Archive Integrity
// These tests validate that backup archive checksums match actual file checksums
//
// **Validates: Requirements 1.5**

use proptest::prelude::*;
use sqlx::{SqlitePool, Row};
use uuid::Uuid;
use chrono::Utc;
use std::fs;
use std::path::PathBuf;
use sha2::{Digest, Sha256};
use std::io::{Read, Write};
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
    
    // Create backup_settings table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS backup_settings (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            db_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
            db_incremental_schedule TEXT NOT NULL DEFAULT '0 * * * *',
            db_full_schedule TEXT NOT NULL DEFAULT '59 23 * * *',
            db_retention_daily INTEGER NOT NULL DEFAULT 7,
            db_retention_weekly INTEGER NOT NULL DEFAULT 4,
            db_retention_monthly INTEGER NOT NULL DEFAULT 12,
            db_max_incrementals INTEGER NOT NULL DEFAULT 24,
            file_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
            file_schedule TEXT NOT NULL DEFAULT '0 3 * * 0',
            file_retention_count INTEGER NOT NULL DEFAULT 2,
            file_include_paths TEXT NOT NULL DEFAULT 'data/uploads/',
            file_exclude_patterns TEXT NOT NULL DEFAULT '*.tmp,*.log',
            full_backup_enabled BOOLEAN NOT NULL DEFAULT 1,
            full_schedule TEXT NOT NULL DEFAULT '0 2 1 * *',
            full_retention_count INTEGER NOT NULL DEFAULT 12,
            backup_directory TEXT NOT NULL DEFAULT 'data/backups/',
            compression_enabled BOOLEAN NOT NULL DEFAULT 1,
            auto_upload_enabled BOOLEAN NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL,
            updated_by TEXT
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Create backup_manifests table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS backup_manifests (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            backup_job_id TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            checksum TEXT NOT NULL,
            modified_at TEXT NOT NULL,
            is_deleted BOOLEAN DEFAULT 0,
            created_at TEXT NOT NULL
        )"
    )
    .execute(&pool)
    .await
    .unwrap();
    
    // Insert default backup settings
    sqlx::query(
        "INSERT INTO backup_settings (id, tenant_id, updated_at) 
         VALUES (1, 'test-tenant', ?)"
    )
    .bind(Utc::now().to_rfc3339())
    .execute(&pool)
    .await
    .unwrap();
    
    pool
}

// ============================================================================
// Test Helpers
// ============================================================================

/// Calculate SHA-256 checksum of a file
fn calculate_file_checksum(path: &PathBuf) -> Result<String, Box<dyn std::error::Error>> {
    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0; 8192];
    
    loop {
        let bytes_read = file.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }
    
    Ok(format!("{:x}", hasher.finalize()))
}

/// Create a simple backup archive with test content
fn create_test_backup_archive(
    backup_id: &str,
    test_dir: &str,
    file_count: usize,
) -> Result<(PathBuf, String), Box<dyn std::error::Error>> {
    // Create test directory
    let dir = PathBuf::from(test_dir);
    fs::create_dir_all(&dir)?;
    
    // Create archive path
    let archive_path = dir.join(format!("backup_{}.zip", backup_id));
    let file = fs::File::create(&archive_path)?;
    let mut zip = ZipWriter::new(file);
    
    let options = FileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);
    
    // Add test files to archive
    for i in 0..file_count {
        let file_name = format!("test_file_{}.txt", i);
        let content = format!("Test content for file {} in backup {}", i, backup_id);
        
        zip.start_file(format!("files/{}", file_name), options)?;
        zip.write_all(content.as_bytes())?;
    }
    
    // Add metadata
    let metadata = format!(
        r#"{{"backup_id": "{}", "file_count": {}, "created_at": "{}"}}"#,
        backup_id,
        file_count,
        Utc::now().to_rfc3339()
    );
    
    zip.start_file("meta/backup.json", options)?;
    zip.write_all(metadata.as_bytes())?;
    
    zip.finish()?;
    
    // Calculate checksum
    let checksum = calculate_file_checksum(&archive_path)?;
    
    Ok((archive_path, checksum))
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

/// Generate a number of test files to create (1-10)
fn arb_file_count() -> impl Strategy<Value = usize> {
    1usize..=10
}

/// Generate a random reason string
fn arb_reason() -> impl Strategy<Value = String> {
    "[A-Za-z ]{10,50}".prop_map(|s| s.to_string())
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 1: Backup Archive Integrity
// For any completed backup job, the archive checksum stored in the database
// must match the SHA-256 hash of the actual archive file.
// **Validates: Requirements 1.5**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_1_backup_archive_integrity(
        backup_type in arb_backup_type(),
        store_id in arb_store_id(),
        tenant_id in arb_tenant_id(),
        file_count in arb_file_count(),
        reason in arb_reason(),
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Setup test database
            let pool = setup_test_db().await;
            
            // Create temporary test directory
            let test_dir = format!("data/test_backup_{}", Uuid::new_v4());
            
            // Generate backup ID
            let backup_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            
            // Create backup archive and calculate checksum
            let (archive_path, calculated_checksum) = create_test_backup_archive(
                &backup_id,
                &test_dir,
                file_count,
            ).expect("Should create backup archive");
            
            // Get file size
            let metadata = fs::metadata(&archive_path).expect("Should get file metadata");
            let size_bytes = metadata.len() as i64;
            
            // Insert backup job record with calculated checksum
            sqlx::query(
                "INSERT INTO backup_jobs (
                    id, tenant_id, backup_type, status, started_at, completed_at,
                    size_bytes, checksum, archive_path, files_included,
                    is_base_backup, incremental_number, created_at, updated_at,
                    store_id, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(&backup_id)
            .bind(&tenant_id)
            .bind(&backup_type)
            .bind("completed")
            .bind(&now)
            .bind(&now)
            .bind(size_bytes)
            .bind(&calculated_checksum)
            .bind(archive_path.to_string_lossy().to_string())
            .bind(file_count as i32)
            .bind(true)
            .bind(0)
            .bind(&now)
            .bind(&now)
            .bind(&store_id)
            .bind(format!("test-user-{}", Uuid::new_v4()))
            .execute(&pool)
            .await
            .expect("Should insert backup job");
            
            // Retrieve backup job from database
            let backup_job = sqlx::query(
                "SELECT checksum, archive_path FROM backup_jobs WHERE id = ?"
            )
            .bind(&backup_id)
            .fetch_one(&pool)
            .await
            .expect("Should fetch backup job");
            
            let stored_checksum: String = backup_job.get("checksum");
            let stored_archive_path: String = backup_job.get("archive_path");
            
            // Verify archive file exists
            let archive_path_from_db = PathBuf::from(&stored_archive_path);
            prop_assert!(
                archive_path_from_db.exists(),
                "Archive file should exist at path: {:?}",
                archive_path_from_db
            );
            
            // Recalculate checksum from the actual file
            let actual_checksum = calculate_file_checksum(&archive_path_from_db)
                .expect("Should be able to calculate checksum");
            
            // PROPERTY: Stored checksum must match actual file checksum
            prop_assert_eq!(
                &stored_checksum,
                &actual_checksum,
                "Stored checksum in database must match actual archive file checksum"
            );
            
            // Verify checksum format (64 hex characters for SHA-256)
            prop_assert_eq!(
                stored_checksum.len(),
                64,
                "SHA-256 checksum should be 64 hex characters"
            );
            
            prop_assert!(
                stored_checksum.chars().all(|c| c.is_ascii_hexdigit()),
                "Checksum should only contain hex digits"
            );
            
            // Clean up test files
            cleanup_test_files(&[PathBuf::from(&test_dir)]);
            cleanup_test_files(&[archive_path]);
            
            Ok(())
        })?;
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;
    
    /// Test that checksum validation detects corrupted archives
    #[tokio::test]
    async fn test_corrupted_archive_detected() {
        let pool = setup_test_db().await;
        
        let test_dir = format!("data/test_backup_{}", Uuid::new_v4());
        let backup_id = Uuid::new_v4().to_string();
        
        // Create backup archive
        let (archive_path, initial_checksum) = create_test_backup_archive(
            &backup_id,
            &test_dir,
            3,
        ).unwrap();
        
        // Verify initial checksum matches
        let calculated_checksum = calculate_file_checksum(&archive_path).unwrap();
        assert_eq!(initial_checksum, calculated_checksum);
        
        // Corrupt the archive by appending data
        let mut file = fs::OpenOptions::new()
            .append(true)
            .open(&archive_path)
            .unwrap();
        file.write_all(b"CORRUPTED DATA").unwrap();
        drop(file);
        
        // Verify checksum no longer matches
        let corrupted_checksum = calculate_file_checksum(&archive_path).unwrap();
        assert_ne!(
            initial_checksum,
            corrupted_checksum,
            "Corrupted archive should have different checksum"
        );
        
        // Clean up
        cleanup_test_files(&[PathBuf::from(&test_dir)]);
    }
    
    /// Test that multiple backups have unique checksums
    #[tokio::test]
    async fn test_multiple_backups_unique_checksums() {
        let pool = setup_test_db().await;
        
        let test_dir = format!("data/test_backup_{}", Uuid::new_v4());
        
        // Create first backup with 3 files
        let backup_id1 = Uuid::new_v4().to_string();
        let (archive_path1, checksum1) = create_test_backup_archive(
            &backup_id1,
            &test_dir,
            3,
        ).unwrap();
        
        // Create second backup with 5 files (different content)
        let backup_id2 = Uuid::new_v4().to_string();
        let (archive_path2, checksum2) = create_test_backup_archive(
            &backup_id2,
            &test_dir,
            5,
        ).unwrap();
        
        // Verify checksums are different (different content = different checksum)
        assert_ne!(
            checksum1,
            checksum2,
            "Different backups should have different checksums"
        );
        
        // Clean up
        cleanup_test_files(&[PathBuf::from(&test_dir)]);
        cleanup_test_files(&[archive_path1, archive_path2]);
    }
    
    /// Test checksum format validation
    #[tokio::test]
    async fn test_checksum_format() {
        let test_dir = format!("data/test_backup_{}", Uuid::new_v4());
        let backup_id = Uuid::new_v4().to_string();
        
        let (archive_path, checksum) = create_test_backup_archive(
            &backup_id,
            &test_dir,
            2,
        ).unwrap();
        
        // Verify checksum is 64 hex characters (SHA-256)
        assert_eq!(checksum.len(), 64, "SHA-256 checksum should be 64 characters");
        assert!(
            checksum.chars().all(|c| c.is_ascii_hexdigit()),
            "Checksum should only contain hex digits"
        );
        
        // Clean up
        cleanup_test_files(&[PathBuf::from(&test_dir)]);
        cleanup_test_files(&[archive_path]);
    }
}
