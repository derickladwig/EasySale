/**
 * Clover OAuth
 * 
 * Handles OAuth 2.0 authorization code flow for Clover.
 * App credentials are read from environment variables.
 * 
 * Requirements: 3.2, 3.3, 3.8
 */

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;

use crate::models::errors::ApiError;

// ============================================================================
// Configuration
// ============================================================================

/// Clover OAuth configuration
#[derive(Debug, Clone)]
pub struct CloverOAuth {
    /// Clover App ID
    app_id: String,
    /// Clover App Secret
    app_secret: String,
    /// OAuth redirect URI
    redirect_uri: String,
    /// HTTP client
    http_client: Client,
    /// Clover environment (sandbox or production)
    environment: CloverEnvironment,
}

#[derive(Debug, Clone)]
enum CloverEnvironment {
    Sandbox,
    Production,
}

impl CloverEnvironment {
    fn base_url(&self) -> &str {
        match self {
            CloverEnvironment::Sandbox => "https://sandbox.dev.clover.com",
            CloverEnvironment::Production => "https://www.clover.com",
        }
    }
    
    fn api_url(&self) -> &str {
        match self {
            CloverEnvironment::Sandbox => "https://apisandbox.dev.clover.com",
            CloverEnvironment::Production => "https://api.clover.com",
        }
    }
}

impl CloverOAuth {
    /// Create new Clover OAuth handler from environment variables
    /// 
    /// Required environment variables:
    /// - CLOVER_APP_ID: Clover App ID
    /// - CLOVER_APP_SECRET: Clover App Secret
    /// - CLOVER_REDIRECT_URI: OAuth callback URL
    /// - CLOVER_ENVIRONMENT: "sandbox" or "production" (default: sandbox)
    /// 
    /// Requirements: 3.2, 6.6
    pub fn from_env() -> Result<Self, ApiError> {
        let app_id = env::var("CLOVER_APP_ID")
            .map_err(|_| ApiError::configuration("CLOVER_APP_ID not configured"))?;
        
        let app_secret = env::var("CLOVER_APP_SECRET")
            .map_err(|_| ApiError::configuration("CLOVER_APP_SECRET not configured"))?;
        
        let redirect_uri = env::var("CLOVER_REDIRECT_URI")
            .map_err(|_| ApiError::configuration("CLOVER_REDIRECT_URI not configured"))?;
        
        // Validate redirect URI is not localhost in production
        if env::var("ENVIRONMENT").unwrap_or_default() == "production" 
            && redirect_uri.contains("localhost") 
        {
            return Err(ApiError::configuration(
                "CLOVER_REDIRECT_URI cannot use localhost in production"
            ));
        }
        
        let environment = match env::var("CLOVER_ENVIRONMENT").unwrap_or_default().as_str() {
            "production" => CloverEnvironment::Production,
            _ => CloverEnvironment::Sandbox,
        };
        
        let http_client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to create HTTP client: {}", e)))?;
        
        Ok(Self {
            app_id,
            app_secret,
            redirect_uri,
            http_client,
            environment,
        })
    }
    
    /// Generate Clover OAuth authorization URL
    /// 
    /// Requirements: 3.2
    pub fn get_authorization_url(&self, state: &str) -> String {
        let params = [
            ("client_id", self.app_id.as_str()),
            ("redirect_uri", self.redirect_uri.as_str()),
            ("state", state),
        ];
        
        let query = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, urlencoding::encode(v)))
            .collect::<Vec<_>>()
            .join("&");
        
        format!("{}/oauth/authorize?{}", self.environment.base_url(), query)
    }
    
    /// Exchange authorization code for tokens
    /// 
    /// Requirements: 3.3
    pub async fn exchange_code_for_tokens(&self, code: &str) -> Result<CloverTokens, ApiError> {
        let url = format!("{}/oauth/token", self.environment.base_url());
        
        let params = [
            ("client_id", self.app_id.as_str()),
            ("client_secret", self.app_secret.as_str()),
            ("code", code),
        ];
        
        let response = self.http_client
            .post(&url)
            .form(&params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Clover OAuth request failed: {}", e)))?;
        
        if !response.status().is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Clover OAuth token exchange failed: {}",
                error_body
            )));
        }
        
        let tokens: CloverOAuthResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse Clover response: {}", e)))?;
        
        Ok(CloverTokens {
            access_token: tokens.access_token,
            merchant_id: tokens.merchant_id.unwrap_or_default(),
        })
    }
    
    /// Refresh tokens (Clover tokens don't expire, but this is for future compatibility)
    /// 
    /// Requirements: 3.8
    pub async fn refresh_tokens(&self, _refresh_token: &str) -> Result<CloverTokens, ApiError> {
        // Clover access tokens don't expire, so refresh is not needed
        // This method exists for API consistency
        Err(ApiError::internal("Clover tokens do not require refresh"))
    }
    
    /// Get the configured redirect URI
    pub fn redirect_uri(&self) -> &str {
        &self.redirect_uri
    }
    
    /// Get the API base URL
    pub fn api_url(&self) -> &str {
        self.environment.api_url()
    }
}

// ============================================================================
// Response Types
// ============================================================================

/// Clover OAuth token response
#[derive(Debug, Deserialize)]
struct CloverOAuthResponse {
    access_token: String,
    merchant_id: Option<String>,
}

/// Clover tokens for storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloverTokens {
    /// OAuth access token
    pub access_token: String,
    /// Merchant ID
    pub merchant_id: String,
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_authorization_url_format() {
        std::env::set_var("CLOVER_APP_ID", "test_app_id");
        std::env::set_var("CLOVER_APP_SECRET", "test_secret");
        std::env::set_var("CLOVER_REDIRECT_URI", "https://example.com/callback");
        std::env::set_var("CLOVER_ENVIRONMENT", "sandbox");
        
        let oauth = CloverOAuth::from_env().unwrap();
        let url = oauth.get_authorization_url("test_state_123");
        
        assert!(url.starts_with("https://sandbox.dev.clover.com/oauth/authorize"));
        assert!(url.contains("client_id=test_app_id"));
        assert!(url.contains("state=test_state_123"));
        
        // Clean up
        std::env::remove_var("CLOVER_APP_ID");
        std::env::remove_var("CLOVER_APP_SECRET");
        std::env::remove_var("CLOVER_REDIRECT_URI");
        std::env::remove_var("CLOVER_ENVIRONMENT");
    }
}
