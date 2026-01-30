/**
 * QuickBooks OAuth 2.0 Implementation
 * 
 * Implements OAuth 2.0 authorization code flow for QuickBooks Online
 * Scope: com.intuit.quickbooks.accounting
 * 
 * Requirements: 11.1, 1.5, 1.6
 */

use reqwest::Client;
use serde::Deserialize;
use std::collections::HashMap;

use crate::models::errors::ApiError;
use crate::services::credential_service::{QuickBooksCredentials, QuickBooksTokens};

/// QuickBooks OAuth endpoints
const AUTH_URL: &str = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL: &str = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const REVOKE_URL: &str = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";

/// QuickBooks OAuth scope
const SCOPE: &str = "com.intuit.quickbooks.accounting";

/// QuickBooks OAuth handler
pub struct QuickBooksOAuth {
    client: Client,
    credentials: QuickBooksCredentials,
    redirect_uri: String,
}

impl QuickBooksOAuth {
    /// Create a new QuickBooks OAuth handler
    pub fn new(credentials: QuickBooksCredentials, redirect_uri: String) -> Result<Self, ApiError> {
        let client = Client::builder()
            .user_agent("EasySale/1.0")
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            client,
            credentials,
            redirect_uri,
        })
    }

    /// Generate authorization URL with CSRF state token
    pub fn get_authorization_url(&self, state: &str) -> String {
        format!(
            "{}?client_id={}&scope={}&redirect_uri={}&response_type=code&state={}",
            AUTH_URL,
            urlencoding::encode(&self.credentials.client_id),
            urlencoding::encode(SCOPE),
            urlencoding::encode(&self.redirect_uri),
            urlencoding::encode(state)
        )
    }

    /// Exchange authorization code for access and refresh tokens
    pub async fn exchange_code_for_tokens(
        &self,
        code: &str,
    ) -> Result<QuickBooksTokens, ApiError> {
        let mut params = HashMap::new();
        params.insert("grant_type", "authorization_code");
        params.insert("code", code);
        params.insert("redirect_uri", &self.redirect_uri);

        let response = self
            .client
            .post(TOKEN_URL)
            .basic_auth(&self.credentials.client_id, Some(&self.credentials.client_secret))
            .form(&params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Token exchange request failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ApiError::internal(format!(
                "Token exchange failed: {}",
                error_text
            )));
        }

        let token_response: TokenResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse token response: {}", e)))?;

        // Calculate expiry timestamp
        let expires_at = chrono::Utc::now().timestamp() + token_response.expires_in;

        Ok(QuickBooksTokens {
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token.ok_or_else(|| {
                ApiError::internal("No refresh token in response")
            })?,
            expires_at,
        })
    }

    /// Refresh access token using refresh token
    pub async fn refresh_access_token(
        &self,
        refresh_token: &str,
    ) -> Result<QuickBooksTokens, ApiError> {
        let mut params = HashMap::new();
        params.insert("grant_type", "refresh_token");
        params.insert("refresh_token", refresh_token);

        let response = self
            .client
            .post(TOKEN_URL)
            .basic_auth(&self.credentials.client_id, Some(&self.credentials.client_secret))
            .form(&params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Token refresh request failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ApiError::internal(format!(
                "Token refresh failed: {}",
                error_text
            )));
        }

        let token_response: TokenResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse token response: {}", e)))?;

        // Calculate expiry timestamp
        let expires_at = chrono::Utc::now().timestamp() + token_response.expires_in;

        Ok(QuickBooksTokens {
            access_token: token_response.access_token,
            // Intuit may return a new refresh token during rotation
            refresh_token: token_response
                .refresh_token
                .unwrap_or_else(|| refresh_token.to_string()),
            expires_at,
        })
    }

    /// Revoke access token
    pub async fn revoke_token(&self, token: &str) -> Result<(), ApiError> {
        let mut params = HashMap::new();
        params.insert("token", token);

        let response = self
            .client
            .post(REVOKE_URL)
            .basic_auth(&self.credentials.client_id, Some(&self.credentials.client_secret))
            .form(&params)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Token revocation request failed: {}", e)))?;

        if !response.status().is_success() {
            let error_text = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(ApiError::internal(format!(
                "Token revocation failed: {}",
                error_text
            )));
        }

        Ok(())
    }

    /// Check if token needs refresh (5 minutes before expiry)
    pub fn needs_refresh(tokens: &QuickBooksTokens) -> bool {
        let now = chrono::Utc::now().timestamp();
        let refresh_threshold = tokens.expires_at - 300; // 5 minutes before expiry
        now >= refresh_threshold
    }
}

/// OAuth token response from QuickBooks
#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
    #[allow(dead_code)] // Part of OAuth 2.0 spec, may be needed for validation
    token_type: String,
}

/// OAuth error response
#[derive(Debug, Deserialize)]
pub struct OAuthError {
    pub error: String,
    pub error_description: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_needs_refresh() {
        // Token expires in 10 minutes
        let tokens = QuickBooksTokens {
            access_token: "test".to_string(),
            refresh_token: "test".to_string(),
            expires_at: chrono::Utc::now().timestamp() + 600,
        };

        // Should need refresh (within 5 minute threshold)
        assert!(QuickBooksOAuth::needs_refresh(&tokens));

        // Token expires in 10 minutes from now
        let tokens = QuickBooksTokens {
            access_token: "test".to_string(),
            refresh_token: "test".to_string(),
            expires_at: chrono::Utc::now().timestamp() + 600,
        };

        // Should need refresh
        assert!(QuickBooksOAuth::needs_refresh(&tokens));
    }

    #[test]
    fn test_authorization_url_generation() {
        let credentials = QuickBooksCredentials {
            client_id: "test_client".to_string(),
            client_secret: "test_secret".to_string(),
            realm_id: "123456".to_string(),
        };

        let oauth = QuickBooksOAuth::new(
            credentials,
            "https://example.com/callback".to_string(),
        )
        .unwrap();

        let url = oauth.get_authorization_url("test_state");

        assert!(url.contains("client_id=test_client"));
        assert!(url.contains("state=test_state"));
        assert!(url.contains("response_type=code"));
        assert!(url.contains("scope=com.intuit.quickbooks.accounting"));
    }
}
