use bcrypt::{hash, verify, DEFAULT_COST};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum PasswordError {
    #[error("Password hashing failed")]
    HashingFailed,
    #[error("Password verification failed")]
    VerificationFailed,
    #[error("Invalid password format")]
    InvalidFormat,
}

pub struct PasswordService;

impl PasswordService {
    /// Hash a password using bcrypt with default cost (12)
    pub fn hash_password(password: &str) -> Result<String, PasswordError> {
        // Validate password is not empty
        if password.is_empty() {
            return Err(PasswordError::InvalidFormat);
        }

        // Use bcrypt with cost 12 for security
        hash(password, DEFAULT_COST).map_err(|_| PasswordError::HashingFailed)
    }

    /// Verify a password against a hash using constant-time comparison
    pub fn verify_password(password: &str, hash: &str) -> Result<bool, PasswordError> {
        verify(password, hash).map_err(|_| PasswordError::VerificationFailed)
    }

    /// Check if a hash is a placeholder hash that needs migration
    pub fn is_placeholder_hash(hash: &str) -> bool {
        hash.starts_with("hashed_")
    }

    /// Migrate a placeholder hash to a proper bcrypt hash
    pub fn migrate_placeholder_hash(original_password: &str) -> Result<String, PasswordError> {
        // For placeholder hashes, we need the original password to create a proper hash
        // This should only be called during migration with known passwords
        Self::hash_password(original_password)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "test_password_123";
        let hash = PasswordService::hash_password(password).unwrap();
        
        // Hash should not be the original password
        assert_ne!(hash, password);
        
        // Hash should start with bcrypt prefix
        assert!(hash.starts_with("$2b$"));
    }

    #[test]
    fn test_password_verification() {
        let password = "test_password_123";
        let hash = PasswordService::hash_password(password).unwrap();
        
        // Correct password should verify
        assert!(PasswordService::verify_password(password, &hash).unwrap());
        
        // Incorrect password should not verify
        assert!(!PasswordService::verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_placeholder_detection() {
        assert!(PasswordService::is_placeholder_hash("hashed_password123"));
        assert!(!PasswordService::is_placeholder_hash("$2b$12$valid_bcrypt_hash"));
    }

    #[test]
    fn test_empty_password_rejection() {
        let result = PasswordService::hash_password("");
        assert!(matches!(result, Err(PasswordError::InvalidFormat)));
    }

    #[test]
    fn test_timing_attack_resistance() {
        let password = "test_password";
        let hash = PasswordService::hash_password(password).unwrap();
        
        // Multiple verifications should take similar time (bcrypt is naturally resistant)
        let start = std::time::Instant::now();
        let _ = PasswordService::verify_password("wrong1", &hash);
        let time1 = start.elapsed();
        
        let start = std::time::Instant::now();
        let _ = PasswordService::verify_password("wrong2", &hash);
        let time2 = start.elapsed();
        
        // Times should be similar (within reasonable variance)
        let ratio = time1.as_nanos() as f64 / time2.as_nanos() as f64;
        assert!(ratio > 0.5 && ratio < 2.0, "Timing difference too large: {}", ratio);
    }
}
