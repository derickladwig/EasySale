use actix_cors::Cors;
use std::env;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum CorsConfigError {
    #[error("Invalid origin format: {0}")]
    InvalidOrigin(String),
    #[error("No origins configured - CORS will deny all requests")]
    NoOriginsConfigured,
}

pub struct CorsConfig {
    pub allowed_origins: Vec<String>,
}

impl CorsConfig {
    /// Load CORS configuration from environment variables
    pub fn from_env() -> Result<Self, CorsConfigError> {
        let origins_str = env::var("CORS_ALLOWED_ORIGINS").unwrap_or_default();
        
        if origins_str.is_empty() {
            return Err(CorsConfigError::NoOriginsConfigured);
        }

        let origins: Vec<String> = origins_str
            .split(',')
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();

        // Validate each origin
        for origin in &origins {
            if !is_valid_origin(origin) {
                return Err(CorsConfigError::InvalidOrigin(origin.clone()));
            }
        }

        Ok(CorsConfig {
            allowed_origins: origins,
        })
    }

    /// Build Actix CORS configuration
    pub fn build_cors(&self) -> Cors {
        let mut cors = Cors::default()
            .allow_any_method()
            .allow_any_header()
            .supports_credentials()
            .max_age(3600);

        // Add each allowed origin
        for origin in &self.allowed_origins {
            cors = cors.allowed_origin(origin);
        }

        cors
    }
}

/// Validate origin format
fn is_valid_origin(origin: &str) -> bool {
    // Basic validation - must be a valid URL format
    if origin.starts_with("http://") || origin.starts_with("https://") {
        // Additional validation could be added here
        !origin.contains(' ') && origin.len() > 10
    } else {
        false
    }
}

/// Build CORS configuration with secure defaults
pub fn build_cors_from_config(origins_str: &str) -> Result<Cors, CorsConfigError> {
    if origins_str.is_empty() {
        // Secure default: deny all origins
        return Ok(Cors::default()
            .allow_any_method()
            .allow_any_header()
            .max_age(3600));
    }

    let origins: Vec<String> = origins_str
        .split(',')
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .collect();

    let mut cors = Cors::default()
        .allow_any_method()
        .allow_any_header()
        .supports_credentials()
        .max_age(3600);

    for origin in origins {
        if !is_valid_origin(&origin) {
            return Err(CorsConfigError::InvalidOrigin(origin));
        }
        cors = cors.allowed_origin(&origin);
    }

    Ok(cors)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_origins() {
        assert!(is_valid_origin("http://localhost:3000"));
        assert!(is_valid_origin("https://example.com"));
        assert!(is_valid_origin("https://app.example.com:8080"));
    }

    #[test]
    fn test_invalid_origins() {
        assert!(!is_valid_origin("invalid"));
        assert!(!is_valid_origin("ftp://example.com"));
        assert!(!is_valid_origin("http://"));
        assert!(!is_valid_origin("https://example .com"));
    }

    #[test]
    fn test_cors_config_from_multiple_origins() {
        let origins = "https://example.com,http://localhost:3000";
        let cors = build_cors_from_config(origins);
        assert!(cors.is_ok());
    }

    #[test]
    fn test_cors_config_empty_origins() {
        let cors = build_cors_from_config("");
        assert!(cors.is_ok());
    }

    #[test]
    fn test_cors_config_invalid_origin() {
        let origins = "https://example.com,invalid-origin";
        let cors = build_cors_from_config(origins);
        assert!(cors.is_err());
    }
}
