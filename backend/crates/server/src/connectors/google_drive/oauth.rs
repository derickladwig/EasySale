/**
 * Google Drive OAuth 2.0 Implementation
 * 
 * Implements OAuth 2.0 authorization code flow for Google Drive API
 * Scope: https://www.googleapis.com/auth/drive.file
 * 
 * Requirements: 4.1 (Google Drive OAuth Synchronization)
 */

use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::models::errors::ApiError;

/// Google OAuth endpoints
const AUTH_URL: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL: &str = "https://oauth2.googleapis.com/token";
const REVOKE_URL: &str = "https://oauth2.googleapis.com/revoke";

/// Google Drive API scope - allows creating and managing files created by the app
const SCOPE: &str = "https://www.googleapis.com/auth/drive.file";

/// Google Drive OAuth credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleDriveCredentials {
    pub client_id: String,
    pub client_secret: String,
}

/// Google Drive OAuth tokens
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GoogleDriveTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,  // Unix timestamp
}

/// Google Drive OAuth handler
pub struct GoogleDriveOAuth {
    client: Client,
    credentials: GoogleDriveCredentials,
    redirect_uri: String,
}

impl GoogleDriveOAuth {
    /// Create a new Google Drive OAuth handler
    pub fn new(credentials: GoogleDriveCredentials, redirect_uri: String) -> Result<Self, ApiError> {
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
    /// 
    /// This URL should be opened in a browser to initiate the OAuth flow.
    /// The user will be redirected to redirect_uri with an authorization code.
    pub fn get_authorization_url(&self, state: &str) -> String {
        format!(
            "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}&access_type=offline&prompt=consent",
            AUTH_URL,
            urlencoding::encode(&self.credentials.client_id),
            urlencoding::encode(&self.redirect_uri),
            urlencoding::encode(SCOPE),
            urlencoding::encode(state)
        )
    }

    /// Exchange authorization code for access and refresh tokens
    /// 
    /// After the user authorizes the app, Google redirects to redirect_uri with a code parameter.
    /// This method exchanges that code for access and refresh tokens.
    pub async fn exchange_code_for_tokens(
        &self,
        code: &str,
    ) -> Result<GoogleDriveTokens, ApiError> {
        let mut params = HashMap::new();
        params.insert("grant_type", "authorization_code");
        params.insert("code", code);
        params.insert("redirect_uri", &self.redirect_uri);
        params.insert("client_id", &self.credentials.client_id);
        params.insert("client_secret", &self.credentials.client_secret);

        let response = self
            .client
            .post(TOKEN_URL)
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

        Ok(GoogleDriveTokens {
            access_token: token_response.access_token,
            refresh_token: token_response.refresh_token.ok_or_else(|| {
                ApiError::internal("No refresh token in response. Make sure access_type=offline and prompt=consent are set.")
            })?,
            expires_at,
        })
    }

    /// Refresh access token using refresh token
    /// 
    /// Access tokens expire after 1 hour. Use this method to get a new access token
    /// without requiring user interaction.
    pub async fn refresh_access_token(
        &self,
        refresh_token: &str,
    ) -> Result<GoogleDriveTokens, ApiError> {
        let mut params = HashMap::new();
        params.insert("grant_type", "refresh_token");
        params.insert("refresh_token", refresh_token);
        params.insert("client_id", &self.credentials.client_id);
        params.insert("client_secret", &self.credentials.client_secret);

        let response = self
            .client
            .post(TOKEN_URL)
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

        Ok(GoogleDriveTokens {
            access_token: token_response.access_token,
            // Google typically doesn't return a new refresh token during refresh
            // Keep the existing refresh token
            refresh_token: token_response
                .refresh_token
                .unwrap_or_else(|| refresh_token.to_string()),
            expires_at,
        })
    }

    /// Revoke access token
    /// 
    /// This revokes both the access token and refresh token, requiring the user
    /// to re-authorize the app.
    pub async fn revoke_token(&self, token: &str) -> Result<(), ApiError> {
        let params = [("token", token)];

        let response = self
            .client
            .post(REVOKE_URL)
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
    pub fn needs_refresh(tokens: &GoogleDriveTokens) -> bool {
        let now = chrono::Utc::now().timestamp();
        let refresh_threshold = tokens.expires_at - 300; // 5 minutes before expiry
        now >= refresh_threshold
    }
}

/// OAuth token response from Google
#[derive(Debug, Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
    #[allow(dead_code)] // Part of OAuth 2.0 spec
    token_type: String,
    #[allow(dead_code)] // Part of OAuth 2.0 spec
    scope: Option<String>,
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
        let tokens = GoogleDriveTokens {
            access_token: "test".to_string(),
            refresh_token: "test".to_string(),
            expires_at: chrono::Utc::now().timestamp() + 600,
        };

        // Should need refresh (within 5 minute threshold)
        assert!(GoogleDriveOAuth::needs_refresh(&tokens));

        // Token expires in 1 hour
        let tokens = GoogleDriveTokens {
            access_token: "test".to_string(),
            refresh_token: "test".to_string(),
            expires_at: chrono::Utc::now().timestamp() + 3600,
        };

        // Should not need refresh yet
        assert!(!GoogleDriveOAuth::needs_refresh(&tokens));
    }

    #[test]
    fn test_authorization_url_generation() {
        let credentials = GoogleDriveCredentials {
            client_id: "test_client".to_string(),
            client_secret: "test_secret".to_string(),
        };

        let oauth = GoogleDriveOAuth::new(
            credentials,
            "https://example.com/callback".to_string(),
        )
        .unwrap();

        let url = oauth.get_authorization_url("test_state");

        assert!(url.contains("client_id=test_client"));
        assert!(url.contains("state=test_state"));
        assert!(url.contains("response_type=code"));
        assert!(url.contains("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file"));
        assert!(url.contains("access_type=offline"));
        assert!(url.contains("prompt=consent"));
    }
}
