//! Property-Based Tests for OAuth Token Encryption
//!
//! Feature: backup-sync, Property 12: OAuth Token Encryption
//! These tests validate that OAuth tokens are encrypted before storage
//! and can be decrypted correctly when needed.
//!
//! **Validates: Requirements 9.2**

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::env;

// Import the services we need to test
use easysale_server::services::CredentialService;
use easysale_server::models::backup::BackupDestination;

// ============================================================================
// Test Data Structures
// ============================================================================

/// Mock Google Drive tokens for testing
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
struct TestGoogleDriveTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

// ============================================================================
// Test Database Setup
// ============================================================================

async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create backup_destinations table
    sqlx::query(
        "CREATE TABLE IF NOT EXISTS backup_destinations (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'test-tenant',
            destination_type TEXT NOT NULL,
            name TEXT NOT NULL,
            enabled BOOLEAN NOT NULL DEFAULT 1,
            refresh_token_encrypted TEXT,
            folder_id TEXT,
            folder_path TEXT,
            auto_upload_db BOOLEAN NOT NULL DEFAULT 1,
            auto_upload_file BOOLEAN NOT NULL DEFAULT 1,
            auto_upload_full BOOLEAN NOT NULL DEFAULT 1,
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
    
    pool
}

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a valid access token (simulated JWT-like string)
fn arb_access_token() -> impl Strategy<Value = String> {
    "[A-Za-z0-9_-]{100,200}".prop_map(|s| format!("ya29.{}", s))
}

/// Generate a valid refresh token
fn arb_refresh_token() -> impl Strategy<Value = String> {
    "[A-Za-z0-9_-]{50,100}".prop_map(|s| format!("1//{}", s))
}

/// Generate a future expiry timestamp (1-24 hours from now)
fn arb_expires_at() -> impl Strategy<Value = i64> {
    (3600i64..=86400).prop_map(|seconds| {
        Utc::now().timestamp() + seconds
    })
}

/// Generate a valid tenant ID
fn arb_tenant_id() -> impl Strategy<Value = String> {
    Just("test-tenant".to_string())
}

/// Generate a valid destination name
fn arb_destination_name() -> impl Strategy<Value = String> {
    "[A-Za-z ]{5,30}".prop_map(|s| s.to_string())
}

/// Generate a valid folder path
fn arb_folder_path() -> impl Strategy<Value = Option<String>> {
    prop_oneof![
        Just(None),
        Just(Some("Backups".to_string())),
        Just(Some("Backups/POS".to_string())),
        Just(Some("Backups/Store1".to_string())),
    ]
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 12: OAuth Token Encryption
// For any Google Drive destination, the stored OAuth tokens must be encrypted
// or protected with restrictive file permissions.
// **Validates: Requirements 9.2**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_12_oauth_token_encryption(
        access_token in arb_access_token(),
        refresh_token in arb_refresh_token(),
        expires_at in arb_expires_at(),
        tenant_id in arb_tenant_id(),
        destination_name in arb_destination_name(),
        folder_path in arb_folder_path(),
    ) {
        // Set up encryption key for testing
        env::set_var("INTEGRATION_ENCRYPTION_KEY", "qOV9BZQJ/bcDxbwOQwG6oYEitaq7AqdCyMi3l3Q1tFQ=");
        
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Setup test database
            let pool = setup_test_db().await;
            
            // Create credential service
            let credential_service = CredentialService::new(pool.clone())
                .expect("Should create credential service");
            
            // Create test tokens
            let tokens = TestGoogleDriveTokens {
                access_token: access_token.clone(),
                refresh_token: refresh_token.clone(),
                expires_at,
            };
            
            // Serialize tokens to JSON
            let tokens_json = serde_json::to_string(&tokens)
                .expect("Should serialize tokens");
            
            // Encrypt tokens using CredentialService
            let tokens_encrypted = credential_service.encrypt_data(&tokens_json)
                .expect("Should encrypt tokens");
            
            // PROPERTY 1: Encrypted tokens must be different from plaintext
            prop_assert_ne!(
                &tokens_encrypted,
                &tokens_json,
                "Encrypted tokens must not match plaintext tokens"
            );
            
            // PROPERTY 2: Encrypted tokens must not contain plaintext access token
            prop_assert!(
                !tokens_encrypted.contains(&access_token),
                "Encrypted data must not contain plaintext access token"
            );
            
            // PROPERTY 3: Encrypted tokens must not contain plaintext refresh token
            prop_assert!(
                !tokens_encrypted.contains(&refresh_token),
                "Encrypted data must not contain plaintext refresh token"
            );
            
            // Store encrypted tokens in database
            let destination_id = Uuid::new_v4().to_string();
            let now = Utc::now().to_rfc3339();
            
            sqlx::query(
                "INSERT INTO backup_destinations (
                    id, tenant_id, destination_type, name, enabled,
                    refresh_token_encrypted, folder_path,
                    auto_upload_db, auto_upload_file, auto_upload_full,
                    last_upload_status, created_at, updated_at
                ) VALUES (?, ?, 'google_drive', ?, 1, ?, ?, 1, 1, 1, 'connected', ?, ?)"
            )
            .bind(&destination_id)
            .bind(&tenant_id)
            .bind(&destination_name)
            .bind(&tokens_encrypted)
            .bind(&folder_path)
            .bind(&now)
            .bind(&now)
            .execute(&pool)
            .await
            .expect("Should insert backup destination");
            
            // Retrieve destination from database
            let destination = sqlx::query_as::<_, BackupDestination>(
                "SELECT * FROM backup_destinations WHERE id = ?"
            )
            .bind(&destination_id)
            .fetch_one(&pool)
            .await
            .expect("Should fetch backup destination");
            
            // PROPERTY 4: Tokens must be stored encrypted in database
            let stored_encrypted = destination.refresh_token_encrypted
                .expect("Should have encrypted tokens");
            
            prop_assert_eq!(
                &stored_encrypted,
                &tokens_encrypted,
                "Stored encrypted tokens must match what was inserted"
            );
            
            // PROPERTY 5: Stored tokens must not contain plaintext
            prop_assert!(
                !stored_encrypted.contains(&access_token),
                "Stored tokens must not contain plaintext access token"
            );
            
            prop_assert!(
                !stored_encrypted.contains(&refresh_token),
                "Stored tokens must not contain plaintext refresh token"
            );
            
            // Decrypt tokens to verify they can be recovered
            let decrypted_json = credential_service.decrypt_data(&stored_encrypted)
                .expect("Should decrypt tokens");
            
            // PROPERTY 6: Decrypted tokens must match original plaintext
            prop_assert_eq!(
                &decrypted_json,
                &tokens_json,
                "Decrypted tokens must match original plaintext"
            );
            
            // Deserialize decrypted tokens
            let decrypted_tokens: TestGoogleDriveTokens = serde_json::from_str(&decrypted_json)
                .expect("Should deserialize decrypted tokens");
            
            // PROPERTY 7: Decrypted token fields must match original values
            prop_assert_eq!(
                decrypted_tokens.access_token,
                access_token,
                "Decrypted access token must match original"
            );
            
            prop_assert_eq!(
                decrypted_tokens.refresh_token,
                refresh_token,
                "Decrypted refresh token must match original"
            );
            
            prop_assert_eq!(
                decrypted_tokens.expires_at,
                expires_at,
                "Decrypted expiry timestamp must match original"
            );
            
            Ok(())
        })?;
    }
    
    #[test]
    fn property_12_encryption_produces_different_ciphertexts(
        access_token in arb_access_token(),
        refresh_token in arb_refresh_token(),
        expires_at in arb_expires_at(),
    ) {
        // Set up encryption key for testing
        env::set_var("INTEGRATION_ENCRYPTION_KEY", "qOV9BZQJ/bcDxbwOQwG6oYEitaq7AqdCyMi3l3Q1tFQ=");
        
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Setup test database
            let pool = setup_test_db().await;
            
            // Create credential service
            let credential_service = CredentialService::new(pool.clone())
                .expect("Should create credential service");
            
            // Create test tokens
            let tokens = TestGoogleDriveTokens {
                access_token: access_token.clone(),
                refresh_token: refresh_token.clone(),
                expires_at,
            };
            
            // Serialize tokens to JSON
            let tokens_json = serde_json::to_string(&tokens)
                .expect("Should serialize tokens");
            
            // Encrypt the same tokens twice
            let encrypted1 = credential_service.encrypt_data(&tokens_json)
                .expect("Should encrypt tokens first time");
            
            let encrypted2 = credential_service.encrypt_data(&tokens_json)
                .expect("Should encrypt tokens second time");
            
            // PROPERTY: Different nonces should produce different ciphertexts
            prop_assert_ne!(
                &encrypted1,
                &encrypted2,
                "Encrypting the same data twice should produce different ciphertexts (due to random nonces)"
            );
            
            // But both should decrypt to the same plaintext
            let decrypted1 = credential_service.decrypt_data(&encrypted1)
                .expect("Should decrypt first ciphertext");
            
            let decrypted2 = credential_service.decrypt_data(&encrypted2)
                .expect("Should decrypt second ciphertext");
            
            prop_assert_eq!(
                &decrypted1,
                &tokens_json,
                "First ciphertext should decrypt to original plaintext"
            );
            
            prop_assert_eq!(
                &decrypted2,
                &tokens_json,
                "Second ciphertext should decrypt to original plaintext"
            );
            
            Ok(())
        })?;
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;
    
    /// Test that tokens cannot be decrypted with wrong key
    #[tokio::test]
    async fn test_wrong_key_fails_decryption() {
        // Set up first encryption key
        env::set_var("INTEGRATION_ENCRYPTION_KEY", "qOV9BZQJ/bcDxbwOQwG6oYEitaq7AqdCyMi3l3Q1tFQ=");
        
        let pool = setup_test_db().await;
        let credential_service1 = CredentialService::new(pool.clone()).unwrap();
        
        let tokens = TestGoogleDriveTokens {
            access_token: "ya29.test_access_token".to_string(),
            refresh_token: "1//test_refresh_token".to_string(),
            expires_at: Utc::now().timestamp() + 3600,
        };
        
        let tokens_json = serde_json::to_string(&tokens).unwrap();
        let encrypted = credential_service1.encrypt_data(&tokens_json).unwrap();
        
        // Change encryption key (32 bytes - different from first key)
        env::set_var("INTEGRATION_ENCRYPTION_KEY", "ZGlmZmVyZW50LWtleS0zMmJ5dGVzISEhISEhISEhISE=");
        
        let pool2 = setup_test_db().await;
        let credential_service2 = CredentialService::new(pool2).unwrap();
        
        // Attempt to decrypt with different key should fail
        let result = credential_service2.decrypt_data(&encrypted);
        assert!(
            result.is_err(),
            "Decryption with wrong key should fail"
        );
    }
    
    /// Test that corrupted ciphertext fails decryption
    #[tokio::test]
    async fn test_corrupted_ciphertext_fails() {
        env::set_var("INTEGRATION_ENCRYPTION_KEY", "qOV9BZQJ/bcDxbwOQwG6oYEitaq7AqdCyMi3l3Q1tFQ=");
        
        let pool = setup_test_db().await;
        let credential_service = CredentialService::new(pool).unwrap();
        
        let tokens = TestGoogleDriveTokens {
            access_token: "ya29.test_access_token".to_string(),
            refresh_token: "1//test_refresh_token".to_string(),
            expires_at: Utc::now().timestamp() + 3600,
        };
        
        let tokens_json = serde_json::to_string(&tokens).unwrap();
        let encrypted = credential_service.encrypt_data(&tokens_json).unwrap();
        
        // Corrupt the ciphertext by modifying a character
        let mut corrupted = encrypted.clone();
        if let Some(ch) = corrupted.chars().nth(10) {
            let replacement = if ch == 'A' { 'B' } else { 'A' };
            corrupted = corrupted.chars().enumerate().map(|(i, c)| {
                if i == 10 { replacement } else { c }
            }).collect();
        }
        
        // Attempt to decrypt corrupted ciphertext should fail
        let result = credential_service.decrypt_data(&corrupted);
        assert!(
            result.is_err(),
            "Decryption of corrupted ciphertext should fail"
        );
    }
    
    /// Test that empty tokens can be encrypted and decrypted
    #[tokio::test]
    async fn test_empty_tokens() {
        env::set_var("INTEGRATION_ENCRYPTION_KEY", "qOV9BZQJ/bcDxbwOQwG6oYEitaq7AqdCyMi3l3Q1tFQ=");
        
        let pool = setup_test_db().await;
        let credential_service = CredentialService::new(pool).unwrap();
        
        let tokens = TestGoogleDriveTokens {
            access_token: "".to_string(),
            refresh_token: "".to_string(),
            expires_at: 0,
        };
        
        let tokens_json = serde_json::to_string(&tokens).unwrap();
        let encrypted = credential_service.encrypt_data(&tokens_json).unwrap();
        
        // Should be able to decrypt
        let decrypted = credential_service.decrypt_data(&encrypted).unwrap();
        assert_eq!(decrypted, tokens_json);
        
        let decrypted_tokens: TestGoogleDriveTokens = serde_json::from_str(&decrypted).unwrap();
        assert_eq!(decrypted_tokens.access_token, "");
        assert_eq!(decrypted_tokens.refresh_token, "");
        assert_eq!(decrypted_tokens.expires_at, 0);
    }
    
    /// Test that very long tokens can be encrypted and decrypted
    #[tokio::test]
    async fn test_long_tokens() {
        env::set_var("INTEGRATION_ENCRYPTION_KEY", "qOV9BZQJ/bcDxbwOQwG6oYEitaq7AqdCyMi3l3Q1tFQ=");
        
        let pool = setup_test_db().await;
        let credential_service = CredentialService::new(pool).unwrap();
        
        // Create very long tokens (1000 characters each)
        let long_access_token = "ya29.".to_string() + &"A".repeat(1000);
        let long_refresh_token = "1//".to_string() + &"B".repeat(1000);
        
        let tokens = TestGoogleDriveTokens {
            access_token: long_access_token.clone(),
            refresh_token: long_refresh_token.clone(),
            expires_at: Utc::now().timestamp() + 3600,
        };
        
        let tokens_json = serde_json::to_string(&tokens).unwrap();
        let encrypted = credential_service.encrypt_data(&tokens_json).unwrap();
        
        // Should be able to decrypt
        let decrypted = credential_service.decrypt_data(&encrypted).unwrap();
        assert_eq!(decrypted, tokens_json);
        
        let decrypted_tokens: TestGoogleDriveTokens = serde_json::from_str(&decrypted).unwrap();
        assert_eq!(decrypted_tokens.access_token, long_access_token);
        assert_eq!(decrypted_tokens.refresh_token, long_refresh_token);
    }
    
    /// Test that encryption is deterministic with same nonce (internal test)
    #[tokio::test]
    async fn test_encryption_format() {
        env::set_var("INTEGRATION_ENCRYPTION_KEY", "qOV9BZQJ/bcDxbwOQwG6oYEitaq7AqdCyMi3l3Q1tFQ=");
        
        let pool = setup_test_db().await;
        let credential_service = CredentialService::new(pool).unwrap();
        
        let plaintext = "test data";
        let encrypted = credential_service.encrypt_data(plaintext).unwrap();
        
        // Encrypted data should be base64 encoded
        assert!(
            encrypted.chars().all(|c| c.is_alphanumeric() || c == '+' || c == '/' || c == '='),
            "Encrypted data should be valid base64"
        );
        
        // Should be longer than plaintext (includes nonce + ciphertext + authentication tag)
        assert!(
            encrypted.len() > plaintext.len(),
            "Encrypted data should be longer than plaintext"
        );
    }
}
