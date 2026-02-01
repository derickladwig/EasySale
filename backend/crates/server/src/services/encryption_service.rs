//! Data Encryption Service
//!
//! Provides AES-256-GCM encryption for sensitive data like API keys and OAuth tokens.
//! Ported from POS project's Python Fernet implementation to Rust AES-GCM.
//!
//! Features:
//! - AES-256-GCM authenticated encryption
//! - Secure key derivation from environment variable
//! - Field-level encryption for JSON objects
//! - Base64 encoding for storage

use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand_core::RngCore;
use serde_json::Value;
use std::sync::Arc;
use thiserror::Error;

// ============================================================================
// ERROR TYPES
// ============================================================================

#[derive(Debug, Error)]
pub enum EncryptionError {
    #[error("Invalid encryption key: {0}")]
    InvalidKey(String),

    #[error("Encryption failed: {0}")]
    EncryptionFailed(String),

    #[error("Decryption failed: {0}")]
    DecryptionFailed(String),

    #[error("Invalid ciphertext format")]
    InvalidCiphertext,

    #[error("Key not configured - set ENCRYPTION_KEY environment variable")]
    KeyNotConfigured,
}

// ============================================================================
// ENCRYPTION SERVICE
// ============================================================================

/// AES-256-GCM encryption service for sensitive data
pub struct EncryptionService {
    cipher: Aes256Gcm,
}

impl EncryptionService {
    /// Create a new encryption service with the given key
    ///
    /// The key should be a 32-byte (256-bit) key, either raw bytes or base64-encoded.
    pub fn new(key: &str) -> Result<Self, EncryptionError> {
        let key_bytes = Self::derive_key(key)?;
        let cipher = Aes256Gcm::new_from_slice(&key_bytes)
            .map_err(|e| EncryptionError::InvalidKey(e.to_string()))?;

        Ok(Self { cipher })
    }

    /// Create from environment variable ENCRYPTION_KEY
    pub fn from_env() -> Result<Self, EncryptionError> {
        let key = std::env::var("ENCRYPTION_KEY")
            .map_err(|_| EncryptionError::KeyNotConfigured)?;

        if key.is_empty() {
            return Err(EncryptionError::KeyNotConfigured);
        }

        Self::new(&key)
    }

    /// Create with a generated key (for testing or first-time setup)
    pub fn generate() -> (Self, String) {
        let mut key_bytes = [0u8; 32];
        OsRng.fill_bytes(&mut key_bytes);
        let key_b64 = BASE64.encode(key_bytes);

        let cipher = Aes256Gcm::new_from_slice(&key_bytes)
            .expect("32 bytes is valid key length");

        (Self { cipher }, key_b64)
    }

    /// Derive a 32-byte key from the input string
    fn derive_key(key: &str) -> Result<[u8; 32], EncryptionError> {
        // Try to decode as base64 first
        if let Ok(decoded) = BASE64.decode(key) {
            if decoded.len() == 32 {
                let mut arr = [0u8; 32];
                arr.copy_from_slice(&decoded);
                return Ok(arr);
            }
        }

        // If not base64 or wrong length, use SHA-256 to derive key
        use sha2::{Sha256, Digest};
        let mut hasher = Sha256::new();
        hasher.update(key.as_bytes());
        let result = hasher.finalize();

        let mut arr = [0u8; 32];
        arr.copy_from_slice(&result);
        Ok(arr)
    }

    /// Encrypt plaintext and return base64-encoded ciphertext
    ///
    /// Format: base64(nonce || ciphertext || tag)
    pub fn encrypt(&self, plaintext: &str) -> Result<String, EncryptionError> {
        // Generate random 12-byte nonce
        let mut nonce_bytes = [0u8; 12];
        OsRng.fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);

        // Encrypt
        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| EncryptionError::EncryptionFailed(e.to_string()))?;

        // Combine nonce + ciphertext
        let mut combined = Vec::with_capacity(12 + ciphertext.len());
        combined.extend_from_slice(&nonce_bytes);
        combined.extend_from_slice(&ciphertext);

        Ok(BASE64.encode(combined))
    }

    /// Decrypt base64-encoded ciphertext
    pub fn decrypt(&self, ciphertext: &str) -> Result<String, EncryptionError> {
        // Decode base64
        let combined = BASE64
            .decode(ciphertext)
            .map_err(|_| EncryptionError::InvalidCiphertext)?;

        // Need at least nonce (12) + tag (16)
        if combined.len() < 28 {
            return Err(EncryptionError::InvalidCiphertext);
        }

        // Split nonce and ciphertext
        let (nonce_bytes, ciphertext_bytes) = combined.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);

        // Decrypt
        let plaintext = self
            .cipher
            .decrypt(nonce, ciphertext_bytes)
            .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))?;

        String::from_utf8(plaintext)
            .map_err(|e| EncryptionError::DecryptionFailed(e.to_string()))
    }

    /// Encrypt specific fields in a JSON object
    ///
    /// Only encrypts string values at the specified paths.
    pub fn encrypt_fields(&self, data: &mut Value, fields: &[&str]) -> Result<(), EncryptionError> {
        for field in fields {
            if let Some(value) = data.get_mut(*field) {
                if let Some(s) = value.as_str() {
                    let encrypted = self.encrypt(s)?;
                    *value = Value::String(encrypted);
                }
            }
        }
        Ok(())
    }

    /// Decrypt specific fields in a JSON object
    pub fn decrypt_fields(&self, data: &mut Value, fields: &[&str]) -> Result<(), EncryptionError> {
        for field in fields {
            if let Some(value) = data.get_mut(*field) {
                if let Some(s) = value.as_str() {
                    // Only decrypt if it looks like encrypted data (base64)
                    if s.len() > 28 && BASE64.decode(s).is_ok() {
                        match self.decrypt(s) {
                            Ok(decrypted) => {
                                *value = Value::String(decrypted);
                            }
                            Err(_) => {
                                // Not encrypted or wrong key, leave as-is
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    /// Check if a string appears to be encrypted
    pub fn is_encrypted(&self, value: &str) -> bool {
        if value.len() < 28 {
            return false;
        }
        
        if let Ok(decoded) = BASE64.decode(value) {
            // Check if it has the right structure (nonce + ciphertext + tag)
            decoded.len() >= 28
        } else {
            false
        }
    }
}

// ============================================================================
// SHARED INSTANCE
// ============================================================================

/// Create a shared EncryptionService from environment
pub fn create_encryption_service() -> Result<Arc<EncryptionService>, EncryptionError> {
    Ok(Arc::new(EncryptionService::from_env()?))
}

/// Create a shared EncryptionService with the given key
pub fn create_encryption_service_with_key(key: &str) -> Result<Arc<EncryptionService>, EncryptionError> {
    Ok(Arc::new(EncryptionService::new(key)?))
}

/// Try to create encryption service, returning None if not configured
pub fn try_create_encryption_service() -> Option<Arc<EncryptionService>> {
    EncryptionService::from_env().ok().map(Arc::new)
}

// ============================================================================
// SENSITIVE FIELD DEFINITIONS
// ============================================================================

/// Fields that should be encrypted in settings
pub const SENSITIVE_SETTINGS_FIELDS: &[&str] = &[
    "api_key",
    "api_secret",
    "access_token",
    "refresh_token",
    "client_secret",
    "webhook_secret",
    "encryption_key",
    "password",
    "private_key",
];

/// Fields that should be encrypted in integrations
pub const SENSITIVE_INTEGRATION_FIELDS: &[&str] = &[
    "stripe_secret_key",
    "stripe_webhook_secret",
    "square_access_token",
    "clover_api_token",
    "quickbooks_access_token",
    "quickbooks_refresh_token",
    "woocommerce_consumer_secret",
    "supabase_service_role_key",
];

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let (service, _key) = EncryptionService::generate();

        let plaintext = "Hello, World! This is a secret message.";
        let ciphertext = service.encrypt(plaintext).unwrap();

        // Ciphertext should be different from plaintext
        assert_ne!(ciphertext, plaintext);

        // Should be base64
        assert!(BASE64.decode(&ciphertext).is_ok());

        // Decrypt should return original
        let decrypted = service.decrypt(&ciphertext).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_decrypt_unicode() {
        let (service, _key) = EncryptionService::generate();

        let plaintext = "こんにちは世界 🌍 مرحبا";
        let ciphertext = service.encrypt(plaintext).unwrap();
        let decrypted = service.decrypt(&ciphertext).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_different_nonces() {
        let (service, _key) = EncryptionService::generate();

        let plaintext = "Same message";
        let ciphertext1 = service.encrypt(plaintext).unwrap();
        let ciphertext2 = service.encrypt(plaintext).unwrap();

        // Same plaintext should produce different ciphertexts (different nonces)
        assert_ne!(ciphertext1, ciphertext2);

        // Both should decrypt to the same value
        assert_eq!(service.decrypt(&ciphertext1).unwrap(), plaintext);
        assert_eq!(service.decrypt(&ciphertext2).unwrap(), plaintext);
    }

    #[test]
    fn test_invalid_ciphertext() {
        let (service, _key) = EncryptionService::generate();

        // Too short
        assert!(service.decrypt("abc").is_err());

        // Invalid base64
        assert!(service.decrypt("not-valid-base64!!!").is_err());

        // Valid base64 but wrong key/tampered
        let (other_service, _) = EncryptionService::generate();
        let ciphertext = other_service.encrypt("secret").unwrap();
        assert!(service.decrypt(&ciphertext).is_err());
    }

    #[test]
    fn test_key_derivation() {
        // Short key should be derived via SHA-256
        let service1 = EncryptionService::new("short-key").unwrap();
        let service2 = EncryptionService::new("short-key").unwrap();

        let plaintext = "test";
        let ciphertext = service1.encrypt(plaintext).unwrap();
        let decrypted = service2.decrypt(&ciphertext).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_fields() {
        let (service, _key) = EncryptionService::generate();

        let mut data = serde_json::json!({
            "api_key": "sk_live_12345",
            "name": "My Integration",
            "enabled": true
        });

        service.encrypt_fields(&mut data, &["api_key"]).unwrap();

        // api_key should be encrypted
        let api_key = data["api_key"].as_str().unwrap();
        assert_ne!(api_key, "sk_live_12345");
        assert!(service.is_encrypted(api_key));

        // Other fields unchanged
        assert_eq!(data["name"], "My Integration");
        assert_eq!(data["enabled"], true);

        // Decrypt
        service.decrypt_fields(&mut data, &["api_key"]).unwrap();
        assert_eq!(data["api_key"], "sk_live_12345");
    }

    #[test]
    fn test_is_encrypted() {
        let (service, _key) = EncryptionService::generate();

        // Plaintext is not encrypted
        assert!(!service.is_encrypted("hello world"));
        assert!(!service.is_encrypted("sk_live_12345"));

        // Encrypted text is detected
        let ciphertext = service.encrypt("secret").unwrap();
        assert!(service.is_encrypted(&ciphertext));
    }
}
