//! Property-Based Tests for Backup Service
//! 
//! These tests use proptest to verify universal properties that should hold
//! across all valid executions of the backup system.

#[cfg(test)]
mod manifest_completeness_tests {
    use crate::models::backup::BackupManifest;
    use crate::services::BackupService;
    use proptest::prelude::*;
    use sqlx::sqlite::SqlitePoolOptions;
    use sqlx::SqlitePool;
    use std::collections::HashSet;
    use std::fs;
    use std::io::Write;
    use std::path::{Path, PathBuf};
    use uuid::Uuid;
    use zip::ZipArchive;

    /// Setup test database with required tables
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .connect("sqlite::memory:")
            .await
            .unwrap();

        // Create backup_jobs table
        sqlx::query(
            "CREATE TABLE backup_jobs (
                id TEXT PRIMARY KEY,
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
                tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
                created_by TEXT
            )",
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create backup_settings table
        sqlx::query(
            "CREATE TABLE backup_settings (
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
            )",
        )
        .execute(&pool)
        .await
        .unwrap();

        // Create backup_manifests table
        sqlx::query(
            "CREATE TABLE backup_manifests (
                id TEXT PRIMARY KEY,
                backup_job_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                checksum TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                is_deleted BOOLEAN DEFAULT 0,
                created_at TEXT NOT NULL,
                tenant_id TEXT NOT NULL DEFAULT 'test-tenant'
            )",
        )
        .execute(&pool)
        .await
        .unwrap();

        // Insert default settings
        sqlx::query(
            "INSERT INTO backup_settings (id, tenant_id, updated_at) VALUES (1, 'test-tenant', datetime('now'))",
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    /// Strategy to generate random file names
    fn file_name_strategy() -> impl Strategy<Value = String> {
        prop::string::string_regex("[a-z]{3,10}\\.(txt|jpg|pdf|json)")
            .expect("valid regex")
    }

    /// Strategy to generate random file content
    fn file_content_strategy() -> impl Strategy<Value = Vec<u8>> {
        prop::collection::vec(any::<u8>(), 10..1000)
    }

    /// Strategy to generate a set of test files (1-20 files)
    fn file_set_strategy() -> impl Strategy<Value = Vec<(String, Vec<u8>)>> {
        prop::collection::vec(
            (file_name_strategy(), file_content_strategy()),
            1..20,
        )
    }

    /// Create temporary test files and return their paths
    fn create_test_files(
        base_dir: &Path,
        files: &[(String, Vec<u8>)],
    ) -> Result<Vec<PathBuf>, Box<dyn std::error::Error>> {
        fs::create_dir_all(base_dir)?;

        let mut paths = Vec::new();
        for (name, content) in files {
            let path = base_dir.join(name);
            let mut file = fs::File::create(&path)?;
            file.write_all(content)?;
            paths.push(path);
        }

        Ok(paths)
    }

    /// Extract file paths from a ZIP archive
    fn extract_archive_file_list(
        archive_path: &Path,
    ) -> Result<HashSet<String>, Box<dyn std::error::Error>> {
        let file = fs::File::open(archive_path)?;
        let mut archive = ZipArchive::new(file)?;

        let mut files = HashSet::new();
        for i in 0..archive.len() {
            let file = archive.by_index(i)?;
            let name = file.name().to_string();

            // Only include files in the "files/" directory (not metadata or db)
            if name.starts_with("files/") && !name.ends_with('/') {
                // Strip "files/" prefix to get relative path
                let relative_path = name.strip_prefix("files/").unwrap_or(&name);
                files.insert(relative_path.to_string());
            }
        }

        Ok(files)
    }

    /// Get manifest file paths from database
    async fn get_manifest_file_list(
        pool: &SqlitePool,
        backup_id: &str,
    ) -> Result<HashSet<String>, Box<dyn std::error::Error>> {
        let manifests = sqlx::query_as::<_, BackupManifest>(
            "SELECT * FROM backup_manifests WHERE backup_job_id = ? AND is_deleted = 0",
        )
        .bind(backup_id)
        .fetch_all(pool)
        .await?;

        let files: HashSet<String> = manifests
            .iter()
            .map(|m| {
                // Extract relative path (strip "data/" prefix if present)
                let path = &m.file_path;
                path.strip_prefix("data/")
                    .unwrap_or(path)
                    .to_string()
            })
            .collect();

        Ok(files)
    }

    /// **Property 2: Manifest Completeness**
    /// 
    /// For any backup archive, the manifest must list all files included in the archive,
    /// and no files in the archive should be missing from the manifest.
    /// 
    /// **Validates: Requirements 1.4**
    #[tokio::test]
    async fn prop_manifest_completeness() {
        // Run the property test with 100 iterations
        let mut runner = proptest::test_runner::TestRunner::new(
            proptest::test_runner::Config {
                cases: 100,
                max_shrink_iters: 0,
                ..Default::default()
            }
        );

        let result = runner.run(&file_set_strategy(), |test_files| {
            // We need to run async code in a blocking context
            // Use tokio::task::block_in_place to avoid nested runtime error
            tokio::task::block_in_place(|| {
                let handle = tokio::runtime::Handle::current();
                handle.block_on(async {
                    // Setup
                    let pool = setup_test_db().await;
                    let service = BackupService::new(pool.clone());

                    // Create temporary directory for test files
                    let temp_dir = std::env::temp_dir().join(format!("backup_test_{}", Uuid::new_v4()));
                    let test_data_dir = temp_dir.join("data").join("uploads");

                    // Create test files
                    let _file_paths = create_test_files(&test_data_dir, &test_files)
                        .expect("Failed to create test files");

                    // Update backup settings to include our test directory
                    sqlx::query(
                        "UPDATE backup_settings SET 
                         file_include_paths = ?,
                         backup_directory = ?
                         WHERE id = 1",
                    )
                    .bind(test_data_dir.to_string_lossy().to_string())
                    .bind(temp_dir.join("backups").to_string_lossy().to_string())
                    .execute(&pool)
                    .await
                    .expect("Failed to update settings");

                    // Create backup directory
                    fs::create_dir_all(temp_dir.join("backups"))
                        .expect("Failed to create backup directory");

                    // Create a file backup (which will include all files in the manifest)
                    let backup_result = service
                        .create_backup(
                            "file",
                            "test-store",
                            "test-tenant",
                            Some("test-user".to_string()),
                        )
                        .await;

                    // Cleanup function
                    let cleanup = || {
                        let _ = fs::remove_dir_all(&temp_dir);
                    };

                    // Check if backup succeeded
                    if let Err(e) = backup_result {
                        cleanup();
                        // If backup failed due to disk space or other infrastructure issues,
                        // skip this iteration rather than failing the test
                        if e.to_string().contains("Insufficient disk space") {
                            return Ok(());
                        }
                        panic!("Backup failed: {}", e);
                    }

                    let backup_job = backup_result.unwrap();

                    // Verify backup completed successfully
                    prop_assert_eq!(
                        backup_job.status,
                        "completed",
                        "Backup should complete successfully"
                    );

                    // Get archive path
                    let archive_path = backup_job
                        .archive_path
                        .as_ref()
                        .expect("Archive path should be set");
                    let archive_path = Path::new(archive_path);

                    // Verify archive exists
                    prop_assert!(
                        archive_path.exists(),
                        "Archive file should exist at: {}",
                        archive_path.display()
                    );

                    // Extract file list from archive
                    let archive_files = extract_archive_file_list(archive_path)
                        .expect("Failed to extract archive file list");

                    // Get file list from manifest
                    let manifest_files = get_manifest_file_list(&pool, &backup_job.id)
                        .await
                        .expect("Failed to get manifest file list");

                    // Normalize paths for comparison (handle different path separators)
                    let normalize_path = |p: &str| -> String {
                        p.replace('\\', "/")
                    };

                    let archive_files_normalized: HashSet<String> = archive_files
                        .iter()
                        .map(|p| normalize_path(p))
                        .collect();

                    let manifest_files_normalized: HashSet<String> = manifest_files
                        .iter()
                        .map(|p| normalize_path(p))
                        .collect();

                    // Property 1: All files in archive must be in manifest
                    let files_in_archive_not_in_manifest: Vec<_> = archive_files_normalized
                        .difference(&manifest_files_normalized)
                        .collect();

                    prop_assert!(
                        files_in_archive_not_in_manifest.is_empty(),
                        "All files in archive must be listed in manifest. Missing from manifest: {:?}",
                        files_in_archive_not_in_manifest
                    );

                    // Property 2: All files in manifest must be in archive
                    let files_in_manifest_not_in_archive: Vec<_> = manifest_files_normalized
                        .difference(&archive_files_normalized)
                        .collect();

                    prop_assert!(
                        files_in_manifest_not_in_archive.is_empty(),
                        "All files in manifest must be present in archive. Missing from archive: {:?}",
                        files_in_manifest_not_in_archive
                    );

                    // Property 3: File counts must match
                    prop_assert_eq!(
                        archive_files_normalized.len(),
                        manifest_files_normalized.len(),
                        "Archive and manifest must contain the same number of files"
                    );

                    // Cleanup
                    cleanup();

                    Ok(())
                })
            })
        });

        // Assert that the property test passed
        result.expect("Property test failed");
    }

    /// Additional test: Verify manifest completeness with empty file set
    #[tokio::test]
    async fn test_manifest_completeness_empty_files() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());

        let temp_dir = std::env::temp_dir().join(format!("backup_test_empty_{}", Uuid::new_v4()));
        let test_data_dir = temp_dir.join("data").join("uploads");

        // Create empty directory
        fs::create_dir_all(&test_data_dir).expect("Failed to create test directory");

        // Update backup settings
        sqlx::query(
            "UPDATE backup_settings SET 
             file_include_paths = ?,
             backup_directory = ?
             WHERE id = 1",
        )
        .bind(test_data_dir.to_string_lossy().to_string())
        .bind(temp_dir.join("backups").to_string_lossy().to_string())
        .execute(&pool)
        .await
        .expect("Failed to update settings");

        fs::create_dir_all(temp_dir.join("backups"))
            .expect("Failed to create backup directory");

        // Create backup with no files
        let backup_job = service
            .create_backup(
                "file",
                "test-store",
                "test-tenant",
                Some("test-user".to_string()),
            )
            .await
            .expect("Backup should succeed even with no files");

        assert_eq!(backup_job.status, "completed");
        assert_eq!(backup_job.files_included, 0);

        // Get manifest
        let manifest_files = get_manifest_file_list(&pool, &backup_job.id)
            .await
            .expect("Failed to get manifest");

        assert_eq!(
            manifest_files.len(),
            0,
            "Manifest should be empty when no files are backed up"
        );

        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }

    /// Additional test: Verify manifest completeness with single file
    #[tokio::test]
    async fn test_manifest_completeness_single_file() {
        let pool = setup_test_db().await;
        let service = BackupService::new(pool.clone());

        let temp_dir = std::env::temp_dir().join(format!("backup_test_single_{}", Uuid::new_v4()));
        let test_data_dir = temp_dir.join("data").join("uploads");

        fs::create_dir_all(&test_data_dir).expect("Failed to create test directory");

        // Create single test file
        let test_file = test_data_dir.join("single.txt");
        fs::write(&test_file, b"test content").expect("Failed to write test file");

        // Update backup settings
        sqlx::query(
            "UPDATE backup_settings SET 
             file_include_paths = ?,
             backup_directory = ?
             WHERE id = 1",
        )
        .bind(test_data_dir.to_string_lossy().to_string())
        .bind(temp_dir.join("backups").to_string_lossy().to_string())
        .execute(&pool)
        .await
        .expect("Failed to update settings");

        fs::create_dir_all(temp_dir.join("backups"))
            .expect("Failed to create backup directory");

        // Create backup
        let backup_job = service
            .create_backup(
                "file",
                "test-store",
                "test-tenant",
                Some("test-user".to_string()),
            )
            .await
            .expect("Backup should succeed");

        assert_eq!(backup_job.status, "completed");
        assert_eq!(backup_job.files_included, 1);

        // Verify manifest
        let manifest_files = get_manifest_file_list(&pool, &backup_job.id)
            .await
            .expect("Failed to get manifest");

        assert_eq!(manifest_files.len(), 1, "Manifest should contain exactly 1 file");

        // Verify archive
        let archive_path = Path::new(backup_job.archive_path.as_ref().unwrap());
        let archive_files = extract_archive_file_list(archive_path)
            .expect("Failed to extract archive");

        assert_eq!(archive_files.len(), 1, "Archive should contain exactly 1 file");

        // Cleanup
        let _ = fs::remove_dir_all(&temp_dir);
    }
}
