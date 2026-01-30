/**
 * Credential Service
 * 
 * Handles secure storage and retrieval of integration credentials
 * Uses AES-256-GCM encryption for credential protection
 * 
 * Requirements: 10.1, 10.2, 10.5, 10.6
 */

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::env;

use crate::models::errors::ApiError;

/// Encryption key size (32 bytes for AES-256)
const KEY_SIZE: usize = 32;

/// Nonce size for AES-GCM (12 bytes)
const NONCE_SIZE: usize = 12;

/// WooCommerce credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WooCommerceCredentials {
    pub consumer_key: String,
    pub consumer_secret: String,
    pub store_url: String,
}

/// QuickBooks OAuth credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickBooksCredentials {
    pub client_id: String,
    pub client_secret: String,
    pub realm_id: String,
}

/// QuickBooks OAuth tokens
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickBooksTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,  // Unix timestamp
}

/// Supabase credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupabaseCredentials {
    pub project_url: String,
    pub service_role_key: String,
}

/// Square credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SquareCredentials {
    pub access_token: String,
    pub location_id: String,
}

/// Clover credentials (OAuth tokens)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloverCredentials {
    pub access_token: String,
    pub merchant_id: String,
}

/// Stripe Connect credentials (OAuth tokens)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripeConnectCredentials {
    pub stripe_user_id: String,
    pub access_token: String,
    pub refresh_token: Option<String>,
    pub scope: String,
}

/// Platform-specific credentials enum
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "platform", content = "credentials")]
pub enum PlatformCredentials {
    WooCommerce(WooCommerceCredentials),
    QuickBooks(QuickBooksCredentials),
    Supabase(SupabaseCredentials),
    Square(SquareCredentials),
    Clover(CloverCredentials),
    Stripe(StripeConnectCredentials),
}

/// Integration credential record
#[derive(Debug, Clone, sqlx::FromRow)]
pub struct IntegrationCredential {
    pub id: String,
    pub tenant_id: String,
    pub platform: String,
    pub credentials_encrypted: String,
    pub oauth_tokens_encrypted: Option<String>,
    pub realm_id: Option<String>,
    pub store_url: Option<String>,
    pub project_url: Option<String>,
    pub is_active: bool,
    pub last_verified_at: Option<String>,
    pub verification_error: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// Credential service for secure credential management
pub struct CredentialService {
    pool: SqlitePool,
    encryption_key: Vec<u8>,
}

impl CredentialService {
    /// Create a new credential service
    pub fn new(pool: SqlitePool) -> Result<Self, ApiError> {
        // Get encryption key from environment or generate one
        let encryption_key = Self::get_or_generate_key()?;
        
        Ok(Self {
            pool,
            encryption_key,
        })
    }

    /// Get encryption key from environment or generate a new one
    fn get_or_generate_key() -> Result<Vec<u8>, ApiError> {
        // Try to get key from environment
        if let Ok(key_base64) = env::var("INTEGRATION_ENCRYPTION_KEY") {
            let key = general_purpose::STANDARD
                .decode(&key_base64)
                .map_err(|e| ApiError::internal(format!("Invalid encryption key format: {}", e)))?;
            
            if key.len() != KEY_SIZE {
                return Err(ApiError::internal(format!(
                    "Encryption key must be {} bytes, got {}",
                    KEY_SIZE,
                    key.len()
                )));
            }
            
            return Ok(key);
        }

        // Generate a new key (for development only - in production, use env var)
        tracing::warn!("INTEGRATION_ENCRYPTION_KEY not set, generating temporary key");
        let mut key = vec![0u8; KEY_SIZE];
        use rand::RngCore;
        rand::thread_rng().fill_bytes(&mut key);
        
        // Log the generated key (for development setup)
        let key_base64 = general_purpose::STANDARD.encode(&key);
        tracing::warn!("Generated encryption key (add to .env): INTEGRATION_ENCRYPTION_KEY={}", key_base64);
        
        Ok(key)
    }

    /// Encrypt data using AES-256-GCM
    fn encrypt(&self, plaintext: &str) -> Result<String, ApiError> {
        let cipher = Aes256Gcm::new_from_slice(&self.encryption_key)
            .map_err(|e| ApiError::internal(format!("Failed to create cipher: {}", e)))?;

        // Generate random nonce
        let mut nonce_bytes = [0u8; NONCE_SIZE];
        use rand::RngCore;
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| ApiError::internal(format!("Encryption failed: {}", e)))?;

        // Combine nonce + ciphertext and encode as base64
        let mut combined = nonce_bytes.to_vec();
        combined.extend_from_slice(&ciphertext);
        
        Ok(general_purpose::STANDARD.encode(&combined))
    }

    /// Decrypt data using AES-256-GCM
    fn decrypt(&self, encrypted: &str) -> Result<String, ApiError> {
        let cipher = Aes256Gcm::new_from_slice(&self.encryption_key)
            .map_err(|e| ApiError::internal(format!("Failed to create cipher: {}", e)))?;

        // Decode from base64
        let combined = general_purpose::STANDARD
            .decode(encrypted)
            .map_err(|e| ApiError::internal(format!("Invalid encrypted data format: {}", e)))?;

        if combined.len() < NONCE_SIZE {
            return Err(ApiError::internal("Encrypted data too short"));
        }

        // Split nonce and ciphertext
        let (nonce_bytes, ciphertext) = combined.split_at(NONCE_SIZE);
        let nonce = Nonce::from_slice(nonce_bytes);

        // Decrypt
        let plaintext = cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| ApiError::internal(format!("Decryption failed: {}", e)))?;

        String::from_utf8(plaintext)
            .map_err(|e| ApiError::internal(format!("Invalid UTF-8 in decrypted data: {}", e)))
    }

    /// Store credentials for a platform
    pub async fn store_credentials(
        &self,
        tenant_id: &str,
        credentials: PlatformCredentials,
    ) -> Result<String, ApiError> {
        let id = uuid::Uuid::new_v4().to_string();
        
        // Serialize and encrypt credentials
        let credentials_json = serde_json::to_string(&credentials)
            .map_err(|e| ApiError::internal(format!("Failed to serialize credentials: {}", e)))?;
        let credentials_encrypted = self.encrypt(&credentials_json)?;

        // Extract platform-specific fields
        let (platform, realm_id, store_url, project_url) = match &credentials {
            PlatformCredentials::WooCommerce(creds) => {
                ("woocommerce", None, Some(creds.store_url.clone()), None)
            }
            PlatformCredentials::QuickBooks(creds) => {
                ("quickbooks", Some(creds.realm_id.clone()), None, None)
            }
            PlatformCredentials::Supabase(creds) => {
                ("supabase", None, None, Some(creds.project_url.clone()))
            }
            PlatformCredentials::Square(_) => {
                ("square", None, None, None)
            }
            PlatformCredentials::Clover(_) => {
                ("clover", None, None, None)
            }
            PlatformCredentials::Stripe(_) => {
                ("stripe", None, None, None)
            }
        };

        // Insert into database
        sqlx::query(
            r#"
            INSERT INTO integration_credentials (
                id, tenant_id, platform, credentials_encrypted,
                realm_id, store_url, project_url, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            ON CONFLICT(tenant_id, platform) DO UPDATE SET
                credentials_encrypted = excluded.credentials_encrypted,
                realm_id = excluded.realm_id,
                store_url = excluded.store_url,
                project_url = excluded.project_url,
                updated_at = CURRENT_TIMESTAMP
            "#,
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(platform)
        .bind(&credentials_encrypted)
        .bind(&realm_id)
        .bind(&store_url)
        .bind(&project_url)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Failed to store credentials: {}", e)))?;

        Ok(id)
    }

    /// Retrieve credentials for a platform
    pub async fn get_credentials(
        &self,
        tenant_id: &str,
        platform: &str,
    ) -> Result<Option<PlatformCredentials>, ApiError> {
        let record: Option<IntegrationCredential> = sqlx::query_as(
            r#"
            SELECT * FROM integration_credentials
            WHERE tenant_id = ? AND platform = ? AND is_active = 1
            "#,
        )
        .bind(tenant_id)
        .bind(platform)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Failed to fetch credentials: {}", e)))?;

        match record {
            Some(cred) => {
                // Decrypt credentials
                let decrypted = self.decrypt(&cred.credentials_encrypted)?;
                let credentials: PlatformCredentials = serde_json::from_str(&decrypted)
                    .map_err(|e| ApiError::internal(format!("Failed to deserialize credentials: {}", e)))?;
                Ok(Some(credentials))
            }
            None => Ok(None),
        }
    }

    /// Store OAuth tokens (for QuickBooks)
    pub async fn store_oauth_tokens(
        &self,
        tenant_id: &str,
        platform: &str,
        tokens: &QuickBooksTokens,
    ) -> Result<(), ApiError> {
        // Serialize and encrypt tokens
        let tokens_json = serde_json::to_string(tokens)
            .map_err(|e| ApiError::internal(format!("Failed to serialize tokens: {}", e)))?;
        let tokens_encrypted = self.encrypt(&tokens_json)?;

        // Update database
        sqlx::query(
            r#"
            UPDATE integration_credentials
            SET oauth_tokens_encrypted = ?, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ? AND platform = ?
            "#,
        )
        .bind(&tokens_encrypted)
        .bind(tenant_id)
        .bind(platform)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Failed to store OAuth tokens: {}", e)))?;

        Ok(())
    }

    /// Retrieve OAuth tokens (for QuickBooks)
    pub async fn get_oauth_tokens(
        &self,
        tenant_id: &str,
        platform: &str,
    ) -> Result<Option<QuickBooksTokens>, ApiError> {
        let record: Option<IntegrationCredential> = sqlx::query_as(
            r#"
            SELECT * FROM integration_credentials
            WHERE tenant_id = ? AND platform = ? AND is_active = 1
            "#,
        )
        .bind(tenant_id)
        .bind(platform)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Failed to fetch credentials: {}", e)))?;

        match record {
            Some(cred) => {
                if let Some(encrypted) = cred.oauth_tokens_encrypted {
                    let decrypted = self.decrypt(&encrypted)?;
                    let tokens: QuickBooksTokens = serde_json::from_str(&decrypted)
                        .map_err(|e| ApiError::internal(format!("Failed to deserialize tokens: {}", e)))?;
                    Ok(Some(tokens))
                } else {
                    Ok(None)
                }
            }
            None => Ok(None),
        }
    }

    /// Delete credentials for a platform
    pub async fn delete_credentials(
        &self,
        tenant_id: &str,
        platform: &str,
    ) -> Result<(), ApiError> {
        sqlx::query(
            r#"
            UPDATE integration_credentials
            SET is_active = 0, updated_at = CURRENT_TIMESTAMP
            WHERE tenant_id = ? AND platform = ?
            "#,
        )
        .bind(tenant_id)
        .bind(platform)
        .execute(&self.pool)
        .await
        .map_err(|e| ApiError::internal(format!("Failed to delete credentials: {}", e)))?;

        Ok(())
    }

    /// Verify credentials are valid
    pub async fn verify_credentials(
        &self,
        tenant_id: &str,
        platform: &str,
    ) -> Result<bool, ApiError> {
        // This will be implemented when we add the platform connectors
        // For now, just check if credentials exist
        let exists = self.get_credentials(tenant_id, platform).await?.is_some();
        Ok(exists)
    }

    /// Encrypt arbitrary data (public method for external use)
    /// 
    /// This method can be used by other services that need to encrypt sensitive data
    /// using the same encryption key and algorithm as credentials.
    pub fn encrypt_data(&self, plaintext: &str) -> Result<String, ApiError> {
        self.encrypt(plaintext)
    }

    /// Decrypt arbitrary data (public method for external use)
    /// 
    /// This method can be used by other services that need to decrypt sensitive data
    /// that was encrypted using encrypt_data.
    pub fn decrypt_data(&self, encrypted: &str) -> Result<String, ApiError> {
        self.decrypt(encrypted)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encryption_decryption() {
        let pool = SqlitePool::connect_lazy("sqlite::memory:").unwrap();
        let service = CredentialService::new(pool).unwrap();

        let plaintext = "sensitive data";
        let encrypted = service.encrypt(plaintext).unwrap();
        let decrypted = service.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext, decrypted);
    }

    #[test]
    fn test_encryption_produces_different_ciphertexts() {
        let pool = SqlitePool::connect_lazy("sqlite::memory:").unwrap();
        let service = CredentialService::new(pool).unwrap();

        let plaintext = "sensitive data";
        let encrypted1 = service.encrypt(plaintext).unwrap();
        let encrypted2 = service.encrypt(plaintext).unwrap();

        // Different nonces should produce different ciphertexts
        assert_ne!(encrypted1, encrypted2);

        // But both should decrypt to the same plaintext
        assert_eq!(service.decrypt(&encrypted1).unwrap(), plaintext);
        assert_eq!(service.decrypt(&encrypted2).unwrap(), plaintext);
    }
}
