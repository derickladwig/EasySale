use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,           // Subject (user ID)
    pub username: String,      // Username
    pub role: String,          // User role
    pub tenant_id: String,     // Tenant ID
    pub store_id: Option<String>,    // Store ID (if assigned)
    pub station_id: Option<String>,  // Station ID (if assigned)
    pub exp: i64,              // Expiration time
    pub iat: i64,              // Issued at
    pub permissions: Vec<String>,    // User permissions
}

#[derive(Debug)]
pub enum JwtError {
    InvalidToken,
    ExpiredToken,
    EncodingError,
}

impl std::fmt::Display for JwtError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            JwtError::InvalidToken => write!(f, "Invalid token"),
            JwtError::ExpiredToken => write!(f, "Token has expired"),
            JwtError::EncodingError => write!(f, "Error encoding token"),
        }
    }
}

impl std::error::Error for JwtError {}

/// Generate a JWT token for a user
pub fn generate_token(
    user_id: &str,
    username: &str,
    role: &str,
    tenant_id: &str,
    store_id: Option<String>,
    station_id: Option<String>,
    secret: &str,
    expiration_hours: i64,
) -> Result<String, JwtError> {
    let now = Utc::now();
    let exp = now + Duration::hours(expiration_hours);

    let claims = Claims {
        sub: user_id.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        tenant_id: tenant_id.to_string(),
        store_id,
        station_id,
        exp: exp.timestamp(),
        iat: now.timestamp(),
        permissions: vec![], // Will be populated by auth handler
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map_err(|_| JwtError::EncodingError)
}

/// Validate and decode a JWT token
pub fn validate_token(token: &str, secret: &str) -> Result<Claims, JwtError> {
    let validation = Validation::default();

    decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map(|data| data.claims)
    .map_err(|err| {
        if err.to_string().contains("ExpiredSignature") {
            JwtError::ExpiredToken
        } else {
            JwtError::InvalidToken
        }
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const TEST_SECRET: &str = "test-secret-key-for-testing-only";

    #[test]
    fn test_generate_and_validate_token() {
        let token = generate_token("user-001", "testuser", "admin", crate::test_constants::TEST_TENANT_ID, None, None, TEST_SECRET, 8).unwrap();
        assert!(!token.is_empty());

        let claims = validate_token(&token, TEST_SECRET).unwrap();
        assert_eq!(claims.sub, "user-001");
        assert_eq!(claims.username, "testuser");
        assert_eq!(claims.role, "admin");
        assert_eq!(claims.tenant_id, crate::test_constants::TEST_TENANT_ID);
        assert_eq!(claims.store_id, None);
        assert_eq!(claims.station_id, None);
    }

    #[test]
    fn test_generate_token_with_context() {
        let token = generate_token(
            "user-001",
            "testuser",
            "cashier",
            crate::test_constants::TEST_TENANT_ID,
            Some("store-1".to_string()),
            Some("station-1".to_string()),
            TEST_SECRET,
            8
        ).unwrap();
        
        let claims = validate_token(&token, TEST_SECRET).unwrap();
        assert_eq!(claims.tenant_id, crate::test_constants::TEST_TENANT_ID);
        assert_eq!(claims.store_id, Some("store-1".to_string()));
        assert_eq!(claims.station_id, Some("station-1".to_string()));
    }

    #[test]
    fn test_invalid_token() {
        let result = validate_token("invalid.token.here", TEST_SECRET);
        assert!(result.is_err());
    }

    #[test]
    fn test_wrong_secret() {
        let token = generate_token("user-001", "testuser", "admin", crate::test_constants::TEST_TENANT_ID, None, None, TEST_SECRET, 8).unwrap();
        let result = validate_token(&token, "wrong-secret");
        assert!(result.is_err());
    }

    #[test]
    fn test_expired_token() {
        // Generate a token that expires in the past (-1 hours)
        let token = generate_token("user-001", "testuser", "admin", crate::test_constants::TEST_TENANT_ID, None, None, TEST_SECRET, -1).unwrap();
        
        let result = validate_token(&token, TEST_SECRET);
        assert!(result.is_err());
    }
}


