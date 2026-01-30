use std::env;
use thiserror::Error;
use url::Url;

#[derive(Error, Debug)]
pub enum OAuthConfigError {
    #[error("Missing OAuth redirect URI environment variable: {0}")]
    MissingRedirectUri(String),
    #[error("Invalid OAuth redirect URI format: {0}")]
    InvalidRedirectUri(String),
    #[error("OAuth redirect URI must use HTTPS in production: {0}")]
    HttpsRequired(String),
    #[error("OAuth redirect URI domain not allowed: {0}")]
    DomainNotAllowed(String),
}

#[derive(Debug, Clone)]
pub struct OAuthConfig {
    pub quickbooks_redirect_uri: String,
    pub google_drive_redirect_uri: Option<String>,
}

impl OAuthConfig {
    /// Load OAuth configuration from environment variables
    pub fn from_env(profile: &str) -> Result<Self, OAuthConfigError> {
        let quickbooks_uri = env::var("QUICKBOOKS_REDIRECT_URI")
            .map_err(|_| OAuthConfigError::MissingRedirectUri("QUICKBOOKS_REDIRECT_URI".to_string()))?;

        let google_drive_uri = env::var("GOOGLE_DRIVE_REDIRECT_URI").ok();

        // Validate QuickBooks URI
        validate_oauth_redirect_uri(&quickbooks_uri, profile)?;

        // Validate Google Drive URI if provided
        if let Some(ref uri) = google_drive_uri {
            validate_oauth_redirect_uri(uri, profile)?;
        }

        Ok(OAuthConfig {
            quickbooks_redirect_uri: quickbooks_uri,
            google_drive_redirect_uri: google_drive_uri,
        })
    }
}

/// Validate OAuth redirect URI format and security requirements
pub fn validate_oauth_redirect_uri(uri: &str, profile: &str) -> Result<(), OAuthConfigError> {
    // Parse URI to validate format
    let parsed_uri = Url::parse(uri)
        .map_err(|_| OAuthConfigError::InvalidRedirectUri(uri.to_string()))?;

    // In production profiles, require HTTPS
    if profile == "prod" && parsed_uri.scheme() != "https" {
        return Err(OAuthConfigError::HttpsRequired(uri.to_string()));
    }

    // Validate domain (basic check - could be expanded)
    if let Some(host) = parsed_uri.host_str() {
        if host.is_empty() {
            return Err(OAuthConfigError::InvalidRedirectUri(uri.to_string()));
        }
        
        // In production, don't allow localhost
        if profile == "prod" && (host == "localhost" || host == "127.0.0.1") {
            return Err(OAuthConfigError::DomainNotAllowed(uri.to_string()));
        }
    } else {
        return Err(OAuthConfigError::InvalidRedirectUri(uri.to_string()));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_https_uri() {
        let uri = "https://example.com/oauth/callback";
        assert!(validate_oauth_redirect_uri(uri, "prod").is_ok());
    }

    #[test]
    fn test_http_uri_in_dev() {
        let uri = "http://localhost:3000/oauth/callback";
        assert!(validate_oauth_redirect_uri(uri, "dev").is_ok());
    }

    #[test]
    fn test_http_uri_in_prod_fails() {
        let uri = "http://example.com/oauth/callback";
        assert!(matches!(
            validate_oauth_redirect_uri(uri, "prod"),
            Err(OAuthConfigError::HttpsRequired(_))
        ));
    }

    #[test]
    fn test_localhost_in_prod_fails() {
        let uri = "https://localhost:3000/oauth/callback";
        assert!(matches!(
            validate_oauth_redirect_uri(uri, "prod"),
            Err(OAuthConfigError::DomainNotAllowed(_))
        ));
    }

    #[test]
    fn test_invalid_uri_format() {
        let uri = "not-a-valid-uri";
        assert!(matches!(
            validate_oauth_redirect_uri(uri, "dev"),
            Err(OAuthConfigError::InvalidRedirectUri(_))
        ));
    }
}
