/// Security tests for backup system
/// 
/// Tests:
/// - File permissions on created archives (0600)
/// - Unauthorized access prevention (download tokens)
/// - Token expiration and validation
/// 
/// Requirements: 9.2, 9.3

#[cfg(test)]
mod tests {
    use crate::models::backup::{BackupJob, DownloadToken};
    use crate::services::BackupService;
    use crate::test_constants::*;
    use sqlx::SqlitePool;
    use std::fs;
    use tempfile::TempDir;

    /// Test that backup archives are created with restrictive permissions (0600)
    #[cfg(unix)]
    #[sqlx::test]
    async fn test_backup_archive_file_permissions(pool: SqlitePool) -> sqlx::Result<()> {
        use std::os::unix::fs::PermissionsExt;
        
        // Create temporary backup directory
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        let backup_dir = temp_dir.path().to_str().unwrap();
        
        // Initialize backup service
        let backup_service = BackupService::new(pool.clone());
        
        // Create a test backup
        let backup_job = backup_service
            .create_backup(
                "db_full",
                TEST_STORE_ID,
                TEST_TENANT_ID,
                Some("test-user".to_string()),
            )
            .await
            .expect("Failed to create backup");
        
        // Verify backup completed
        assert_eq!(backup_job.status, "completed");
        assert!(backup_job.archive_path.is_some());
        
        let archive_path = backup_job.archive_path.unwrap();
        
        // Check file exists
        assert!(fs::metadata(&archive_path).is_ok(), "Archive file should exist");
        
        // Check file permissions
        let metadata = fs::metadata(&archive_path).expect("Failed to get file metadata");
        let permissions = metadata.permissions();
        let mode = permissions.mode();
        
        // Extract permission bits (last 9 bits)
        let permission_bits = mode & 0o777;
        
        // Verify permissions are 0600 (owner read/write only)
        assert_eq!(
            permission_bits, 0o600,
            "Archive should have 0600 permissions (owner read/write only), got {:o}",
            permission_bits
        );
        
        // Verify no group permissions
        assert_eq!(
            mode & 0o070, 0,
            "Archive should have no group permissions"
        );
        
        // Verify no other permissions
        assert_eq!(
            mode & 0o007, 0,
            "Archive should have no other permissions"
        );
        
        Ok(())
    }

    /// Test that download tokens expire after TTL
    #[sqlx::test]
    async fn test_download_token_expiration(pool: SqlitePool) -> sqlx::Result<()> {
        // Create a token with 1 second TTL
        let token = DownloadToken::generate(
            "backup-123".to_string(),
            "user-456".to_string(),
            1, // 1 second TTL
        );
        
        // Token should be valid initially
        assert!(token.is_valid(), "Token should be valid initially");
        assert!(!token.is_expired(), "Token should not be expired initially");
        
        // Wait for token to expire
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        
        // Token should now be expired
        assert!(token.is_expired(), "Token should be expired after TTL");
        assert!(!token.is_valid(), "Token should not be valid after expiration");
        
        Ok(())
    }

    /// Test that used tokens cannot be reused
    #[sqlx::test]
    async fn test_download_token_single_use(pool: SqlitePool) -> sqlx::Result<()> {
        // Create a token with long TTL
        let mut token = DownloadToken::generate(
            "backup-123".to_string(),
            "user-456".to_string(),
            900, // 15 minutes
        );
        
        // Token should be valid initially
        assert!(token.is_valid(), "Token should be valid initially");
        
        // Mark token as used
        token.used = true;
        token.used_at = Some(chrono::Utc::now().to_rfc3339());
        
        // Token should no longer be valid
        assert!(!token.is_valid(), "Token should not be valid after use");
        
        Ok(())
    }

    /// Test that tokens are cryptographically secure (high entropy)
    #[test]
    fn test_download_token_entropy() {
        // Generate multiple tokens
        let tokens: Vec<String> = (0..100)
            .map(|_| {
                DownloadToken::generate(
                    "backup-123".to_string(),
                    "user-456".to_string(),
                    900,
                )
                .token
            })
            .collect();
        
        // Verify all tokens are unique
        let unique_tokens: std::collections::HashSet<_> = tokens.iter().collect();
        assert_eq!(
            unique_tokens.len(),
            tokens.len(),
            "All generated tokens should be unique"
        );
        
        // Verify token length (should be 64 characters)
        for token in &tokens {
            assert_eq!(
                token.len(),
                64,
                "Token should be 64 characters long"
            );
            
            // Verify token contains only alphanumeric characters
            assert!(
                token.chars().all(|c| c.is_alphanumeric()),
                "Token should contain only alphanumeric characters"
            );
        }
    }

    /// Test that unauthorized access to download endpoint is prevented
    #[sqlx::test]
    async fn test_unauthorized_download_prevention(pool: SqlitePool) -> sqlx::Result<()> {
        use actix_web::{test, web, App};
        use crate::handlers::backup;
        
        // Create test app
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .route(
                    "/api/backups/download",
                    web::get().to(backup::download_with_token),
                ),
        )
        .await;
        
        // Test 1: Missing token parameter
        let req = test::TestRequest::get()
            .uri("/api/backups/download")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert_eq!(
            resp.status(),
            actix_web::http::StatusCode::BAD_REQUEST,
            "Should return 400 for missing token"
        );
        
        // Test 2: Invalid token
        let req = test::TestRequest::get()
            .uri("/api/backups/download?token=invalid-token-12345")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert_eq!(
            resp.status(),
            actix_web::http::StatusCode::UNAUTHORIZED,
            "Should return 401 for invalid token"
        );
        
        Ok(())
    }

    /// Test that expired tokens are rejected
    #[sqlx::test]
    async fn test_expired_token_rejection(pool: SqlitePool) -> sqlx::Result<()> {
        // Create a backup job
        let backup_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, tenant_id, backup_type, status, created_at, updated_at, 
                store_id, is_base_backup, incremental_number, 
                files_included, files_changed, files_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&backup_id)
        .bind(TEST_TENANT_ID)
        .bind("db_full")
        .bind("completed")
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(TEST_STORE_ID)
        .bind(true)
        .bind(0)
        .bind(0)
        .bind(0)
        .bind(0)
        .execute(&pool)
        .await?;
        
        // Create an expired token
        let token = DownloadToken::generate(
            backup_id.clone(),
            "user-123".to_string(),
            -60, // Expired 60 seconds ago
        );
        
        // Store token in database
        sqlx::query(
            "INSERT INTO download_tokens (
                token, backup_job_id, created_by, expires_at, used, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&token.token)
        .bind(&token.backup_job_id)
        .bind(&token.created_by)
        .bind(&token.expires_at)
        .bind(token.used)
        .bind(&token.created_at)
        .execute(&pool)
        .await?;
        
        // Verify token is expired
        assert!(token.is_expired(), "Token should be expired");
        
        // Try to use expired token
        use actix_web::{test, web, App};
        use crate::handlers::backup;
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .route(
                    "/api/backups/download",
                    web::get().to(backup::download_with_token),
                ),
        )
        .await;
        
        let req = test::TestRequest::get()
            .uri(&format!("/api/backups/download?token={}", token.token))
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert_eq!(
            resp.status(),
            actix_web::http::StatusCode::UNAUTHORIZED,
            "Should return 401 for expired token"
        );
        
        Ok(())
    }

    /// Test that used tokens cannot be reused
    #[sqlx::test]
    async fn test_used_token_rejection(pool: SqlitePool) -> sqlx::Result<()> {
        // Create a backup job
        let backup_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, tenant_id, backup_type, status, created_at, updated_at, 
                store_id, is_base_backup, incremental_number, 
                files_included, files_changed, files_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&backup_id)
        .bind(TEST_TENANT_ID)
        .bind("db_full")
        .bind("completed")
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(TEST_STORE_ID)
        .bind(true)
        .bind(0)
        .bind(0)
        .bind(0)
        .bind(0)
        .execute(&pool)
        .await?;
        
        // Create a valid token but mark it as used
        let token = DownloadToken::generate(
            backup_id.clone(),
            "user-123".to_string(),
            900, // 15 minutes
        );
        
        // Store token as already used
        sqlx::query(
            "INSERT INTO download_tokens (
                token, backup_job_id, created_by, expires_at, used, used_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&token.token)
        .bind(&token.backup_job_id)
        .bind(&token.created_by)
        .bind(&token.expires_at)
        .bind(true) // Already used
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(&token.created_at)
        .execute(&pool)
        .await?;
        
        // Try to use already-used token
        use actix_web::{test, web, App};
        use crate::handlers::backup;
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .route(
                    "/api/backups/download",
                    web::get().to(backup::download_with_token),
                ),
        )
        .await;
        
        let req = test::TestRequest::get()
            .uri(&format!("/api/backups/download?token={}", token.token))
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert_eq!(
            resp.status(),
            actix_web::http::StatusCode::UNAUTHORIZED,
            "Should return 401 for already-used token"
        );
        
        Ok(())
    }

    /// Test token cleanup removes expired and used tokens
    #[sqlx::test]
    async fn test_token_cleanup(pool: SqlitePool) -> sqlx::Result<()> {
        // Create backup job
        let backup_id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO backup_jobs (
                id, tenant_id, backup_type, status, created_at, updated_at, 
                store_id, is_base_backup, incremental_number, 
                files_included, files_changed, files_deleted
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&backup_id)
        .bind(TEST_TENANT_ID)
        .bind("db_full")
        .bind("completed")
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(TEST_STORE_ID)
        .bind(true)
        .bind(0)
        .bind(0)
        .bind(0)
        .bind(0)
        .execute(&pool)
        .await?;
        
        // Create expired token
        let expired_token = DownloadToken::generate(
            backup_id.clone(),
            "user-123".to_string(),
            -60, // Expired
        );
        
        sqlx::query(
            "INSERT INTO download_tokens (
                token, backup_job_id, created_by, expires_at, used, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&expired_token.token)
        .bind(&expired_token.backup_job_id)
        .bind(&expired_token.created_by)
        .bind(&expired_token.expires_at)
        .bind(false)
        .bind(&expired_token.created_at)
        .execute(&pool)
        .await?;
        
        // Create used token
        let used_token = DownloadToken::generate(
            backup_id.clone(),
            "user-456".to_string(),
            900, // Valid TTL
        );
        
        sqlx::query(
            "INSERT INTO download_tokens (
                token, backup_job_id, created_by, expires_at, used, used_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&used_token.token)
        .bind(&used_token.backup_job_id)
        .bind(&used_token.created_by)
        .bind(&used_token.expires_at)
        .bind(true) // Used
        .bind(chrono::Utc::now().to_rfc3339())
        .bind(&used_token.created_at)
        .execute(&pool)
        .await?;
        
        // Create valid unused token
        let valid_token = DownloadToken::generate(
            backup_id.clone(),
            "user-789".to_string(),
            900, // Valid TTL
        );
        
        sqlx::query(
            "INSERT INTO download_tokens (
                token, backup_job_id, created_by, expires_at, used, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&valid_token.token)
        .bind(&valid_token.backup_job_id)
        .bind(&valid_token.created_by)
        .bind(&valid_token.expires_at)
        .bind(false)
        .bind(&valid_token.created_at)
        .execute(&pool)
        .await?;
        
        // Run cleanup
        let now = chrono::Utc::now().to_rfc3339();
        let result = sqlx::query(
            "DELETE FROM download_tokens WHERE expires_at < ? OR used = 1"
        )
        .bind(&now)
        .execute(&pool)
        .await?;
        
        // Should have deleted 2 tokens (expired and used)
        assert_eq!(result.rows_affected(), 2, "Should delete expired and used tokens");
        
        // Verify valid token still exists
        let remaining: (i64,) = sqlx::query_as(
            "SELECT COUNT(*) FROM download_tokens WHERE token = ?"
        )
        .bind(&valid_token.token)
        .fetch_one(&pool)
        .await?;
        
        assert_eq!(remaining.0, 1, "Valid token should still exist");
        
        Ok(())
    }
}
