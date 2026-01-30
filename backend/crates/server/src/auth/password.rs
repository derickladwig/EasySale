use bcrypt::{hash, verify, DEFAULT_COST};

#[derive(Debug)]
pub enum PasswordError {
    HashingError,
    VerificationError,
}

impl std::fmt::Display for PasswordError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PasswordError::HashingError => write!(f, "Error hashing password"),
            PasswordError::VerificationError => write!(f, "Error verifying password"),
        }
    }
}

impl std::error::Error for PasswordError {}

/// Hash a password using bcrypt
pub fn hash_password(password: &str) -> Result<String, PasswordError> {
    hash(password, DEFAULT_COST).map_err(|_| PasswordError::HashingError)
}

/// Verify a password against a hash
pub fn verify_password(password: &str, hash_str: &str) -> Result<bool, PasswordError> {
    verify(password, hash_str).map_err(|_| PasswordError::VerificationError)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_hash_and_verify_password() {
        let password = "secure_password_123";
        let hash = hash_password(password).unwrap();

        assert!(!hash.is_empty());
        assert_ne!(hash, password);

        let is_valid = verify_password(password, &hash).unwrap();
        assert!(is_valid);
    }

    #[test]
    fn test_verify_wrong_password() {
        let password = "correct_password";
        let hash = hash_password(password).unwrap();

        let is_valid = verify_password("wrong_password", &hash).unwrap();
        assert!(!is_valid);
    }

    #[test]
    fn test_different_hashes_for_same_password() {
        let password = "same_password";
        let hash1 = hash_password(password).unwrap();
        let hash2 = hash_password(password).unwrap();

        // Hashes should be different due to different salts
        assert_ne!(hash1, hash2);

        // But both should verify correctly
        assert!(verify_password(password, &hash1).unwrap());
        assert!(verify_password(password, &hash2).unwrap());
    }
}
