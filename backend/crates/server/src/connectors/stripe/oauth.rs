/**
 * Stripe Connect OAuth
 * 
 * Handles OAuth 2.0 authorization code flow for Stripe Connect.
 * Platform credentials are read from environment variables.
 * 
 * Requirements: 1.2, 1.3, 1.6
 */

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;

use crate::models::errors::ApiError;

// ============================================================================
// Configuration
// ============================================================================

/// Stripe Connect OAuth configuration
#[derive(Debug, Clone)]
pub struct StripeOAuth {
    /// OAuth client ID (ca_xxx)
    client_id: String,
    /// Platform secret key (sk_xxx)
    client_secret: String,
    /// OAuth redirect URI
    redirect_uri: String,
    /// HTTP client
    http_client: Client,
}

impl StripeOAuth {
    /// Create new Stripe OAuth handler from environment variables
    /// 
    /// Required environment variables:
    /// - STRIPE_CLIENT_ID: OAuth client ID (ca_xxx)
    /// - STRIPE_SECRET_KEY: Platform secret key (sk_xxx)
    /// - STRIPE_REDIRECT_URI: OAuth callback URL
    /// 
    /// Requirements: 1.2, 6.6
    pub fn from_env() -> Result<Self, ApiError> {
        let client_id = env::var("STRIPE_CLIENT_ID")
            .map_err(|_| ApiError::configuration("STRIPE_CLIENT_ID not configured"))?;
        
        let client_secret = env::var("STRIPE_SECRET_KEY")
            .map_err(|_| ApiError::configuration("STRIPE_SECRET_KEY not configured"))?;
        
        let redirect_uri = env::var("STRIPE_REDIRECT_URI")
            .map_err(|_| ApiError::configuration("STRIPE_REDIRECT_URI not configured"))?;
        
        // Validate redirect URI is not localhost in production
        if env::var("ENVIRONMENT").unwrap_or_default() == "production" 
            && redirect_uri.contains("localhost") 
        {
            return Err(ApiError::configuration(
                "STRIPE_REDIRECT_URI cannot use localhost in production"
            ));
        }
        
        let http_client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to create HTTP client: {}", e)))?;
        
        Ok(Self {
            client_id,
            client_secret,
            redirect_uri,
            http_client,
        })
    }
    
    /// Generate Stripe Connect OAuth authorization URL
    /// 
    /// Requirements: 1.2
    pub fn get_authorization_url(&self, state: &str) -> String {
        let params = [
            ("response_type", "code"),
            ("client_id", &self.client_id),
            ("scope", "read_write"),
            ("redirect_uri", &self.redirect_uri),
            ("state", state),
        ];
        
        let query = params
            .iter()
            .map(|(k, v)| format!("{}={}", k, urlencoding::encode(v)))
            .collect::<Vec<_>>()
            .join("&");
        
        format!("https://connect.stripe.com/oauth/authorize?{}", query)
    }
    
    /// Exchange authorization code for tokens
    /// 
    /// Requirements: 1.3
    pub async fn exchange_code_for_tokens(&self, code: &str) -> Result<StripeConnectTokens, ApiError> {
        let params = [
            ("grant_type", "authorization_code"),
            ("code", code),
        ];
        
        let response = self.http_client
            .post("https://connect.stripe.com/oauth/token")
            .basic_auth(&self.client_secret, None::<&str>)
            .form(&params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Stripe OAuth request failed: {}", e)))?;
        
        if !response.status().is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Stripe OAuth token exchange failed: {}",
                error_body
            )));
        }
        
        let tokens: StripeOAuthResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse Stripe response: {}", e)))?;
        
        Ok(StripeConnectTokens {
            stripe_user_id: tokens.stripe_user_id,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            scope: tokens.scope,
        })
    }
    
    /// Get the configured redirect URI
    pub fn redirect_uri(&self) -> &str {
        &self.redirect_uri
    }
}

// ============================================================================
// Response Types
// ============================================================================

/// Stripe OAuth token response
#[derive(Debug, Deserialize)]
struct StripeOAuthResponse {
    /// Connected account ID (acct_xxx)
    stripe_user_id: String,
    /// OAuth access token
    access_token: String,
    /// OAuth refresh token (optional)
    refresh_token: Option<String>,
    /// Granted scope
    scope: String,
}

/// Stripe Connect tokens for storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripeConnectTokens {
    /// Connected account ID (acct_xxx)
    pub stripe_user_id: String,
    /// OAuth access token
    pub access_token: String,
    /// OAuth refresh token (optional)
    pub refresh_token: Option<String>,
    /// Granted scope
    pub scope: String,
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_authorization_url_format() {
        // Set up test environment
        std::env::set_var("STRIPE_CLIENT_ID", "ca_test123");
        std::env::set_var("STRIPE_SECRET_KEY", "sk_test_secret");
        std::env::set_var("STRIPE_REDIRECT_URI", "https://example.com/callback");
        
        let oauth = StripeOAuth::from_env().unwrap();
        let url = oauth.get_authorization_url("test_state_123");
        
        assert!(url.starts_with("https://connect.stripe.com/oauth/authorize"));
        assert!(url.contains("client_id=ca_test123"));
        assert!(url.contains("state=test_state_123"));
        assert!(url.contains("redirect_uri="));
        assert!(url.contains("scope=read_write"));
        
        // Clean up
        std::env::remove_var("STRIPE_CLIENT_ID");
        std::env::remove_var("STRIPE_SECRET_KEY");
        std::env::remove_var("STRIPE_REDIRECT_URI");
    }
    
    #[test]
    fn test_missing_client_id_error() {
        std::env::remove_var("STRIPE_CLIENT_ID");
        std::env::remove_var("STRIPE_SECRET_KEY");
        std::env::remove_var("STRIPE_REDIRECT_URI");
        
        let result = StripeOAuth::from_env();
        assert!(result.is_err());
    }
}
