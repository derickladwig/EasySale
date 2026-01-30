/**
 * Stripe API Client
 * 
 * HTTP client for Stripe API using connected accounts.
 * All requests include Stripe-Account header for the connected account.
 * 
 * Requirements: 1.4, 1.8
 */

use async_trait::async_trait;
use reqwest::{Client, Response};
use serde::{Deserialize, Serialize};
use std::env;

use crate::connectors::{ConnectionStatus, PlatformConnector};
use crate::models::errors::ApiError;

// ============================================================================
// Client Configuration
// ============================================================================

/// Stripe API client for connected accounts
#[derive(Clone)]
pub struct StripeClient {
    /// HTTP client
    http_client: Client,
    /// Platform secret key
    platform_secret_key: String,
    /// Connected account ID (acct_xxx)
    connected_account_id: String,
    /// Base URL for Stripe API
    base_url: String,
}

impl StripeClient {
    /// Create new Stripe client for a connected account
    /// 
    /// Requirements: 1.4
    pub fn new(connected_account_id: String) -> Result<Self, ApiError> {
        let platform_secret_key = env::var("STRIPE_SECRET_KEY")
            .map_err(|_| ApiError::configuration("STRIPE_SECRET_KEY not configured"))?;
        
        let http_client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to create HTTP client: {}", e)))?;
        
        Ok(Self {
            http_client,
            platform_secret_key,
            connected_account_id,
            base_url: "https://api.stripe.com/v1".to_string(),
        })
    }
    
    /// Make a GET request to Stripe API
    pub async fn get(&self, endpoint: &str) -> Result<Response, ApiError> {
        let url = format!("{}{}", self.base_url, endpoint);
        
        self.http_client
            .get(&url)
            .bearer_auth(&self.platform_secret_key)
            .header("Stripe-Account", &self.connected_account_id)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Stripe API request failed: {}", e)))
    }
    
    /// Make a POST request to Stripe API
    pub async fn post<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<Response, ApiError> {
        let url = format!("{}{}", self.base_url, endpoint);
        
        self.http_client
            .post(&url)
            .bearer_auth(&self.platform_secret_key)
            .header("Stripe-Account", &self.connected_account_id)
            .form(body)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Stripe API request failed: {}", e)))
    }
    
    /// Get account summary for the connected account
    /// 
    /// Requirements: 1.8
    pub async fn get_account_summary(&self) -> Result<StripeSummary, ApiError> {
        let response = self.get("/account").await?;
        
        if !response.status().is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Failed to get Stripe account: {}",
                error_body
            )));
        }
        
        let account: StripeAccountResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse Stripe response: {}", e)))?;
        
        Ok(StripeSummary {
            business_name: account.business_profile.and_then(|bp| bp.name),
            country: account.country,
            default_currency: account.default_currency,
            account_id_masked: mask_account_id(&self.connected_account_id),
        })
    }
    
    /// Get the connected account ID
    pub fn connected_account_id(&self) -> &str {
        &self.connected_account_id
    }
    
    /// Get the base URL
    pub fn base_url(&self) -> &str {
        &self.base_url
    }
    
    /// Get the platform secret key (for internal use only)
    pub(crate) fn platform_secret_key(&self) -> &str {
        &self.platform_secret_key
    }
    
    /// Get the HTTP client reference
    pub(crate) fn http_client(&self) -> &Client {
        &self.http_client
    }
}

// ============================================================================
// PlatformConnector Implementation
// ============================================================================

#[async_trait]
impl PlatformConnector for StripeClient {
    /// Test connection to Stripe
    /// 
    /// Requirements: 1.4
    async fn test_connection(&self) -> Result<bool, ApiError> {
        let response = self.get("/account").await?;
        Ok(response.status().is_success())
    }
    
    fn platform_name(&self) -> &str {
        "stripe"
    }
    
    async fn get_status(&self) -> Result<ConnectionStatus, ApiError> {
        let is_connected = self.test_connection().await.unwrap_or(false);
        
        Ok(ConnectionStatus {
            platform: "stripe".to_string(),
            is_connected,
            last_check: chrono::Utc::now().to_rfc3339(),
            error_message: None,
        })
    }
}

// ============================================================================
// Response Types
// ============================================================================

/// Stripe account summary for display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripeSummary {
    /// Business name (if set)
    pub business_name: Option<String>,
    /// Country code (e.g., "US")
    pub country: Option<String>,
    /// Default currency (e.g., "usd")
    pub default_currency: Option<String>,
    /// Masked account ID (e.g., "acct_...xxxx")
    pub account_id_masked: String,
}

/// Stripe account API response
#[derive(Debug, Deserialize)]
#[allow(dead_code)]
struct StripeAccountResponse {
    id: String,
    country: Option<String>,
    default_currency: Option<String>,
    business_profile: Option<StripeBusinessProfile>,
}

#[derive(Debug, Deserialize)]
struct StripeBusinessProfile {
    name: Option<String>,
}

// ============================================================================
// Helpers
// ============================================================================

/// Mask account ID for display (e.g., "acct_...xxxx")
fn mask_account_id(account_id: &str) -> String {
    if account_id.len() > 8 {
        let prefix = &account_id[..5];
        let suffix = &account_id[account_id.len() - 4..];
        format!("{}...{}", prefix, suffix)
    } else {
        "****".to_string()
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_mask_account_id() {
        assert_eq!(mask_account_id("acct_1234567890abcdef"), "acct_...cdef");
        assert_eq!(mask_account_id("short"), "****");
    }
    
    #[test]
    fn test_stripe_summary_serialization() {
        let summary = StripeSummary {
            business_name: Some("Test Business".to_string()),
            country: Some("US".to_string()),
            default_currency: Some("usd".to_string()),
            account_id_masked: "acct_...xxxx".to_string(),
        };
        
        let json = serde_json::to_string(&summary).unwrap();
        assert!(json.contains("Test Business"));
        assert!(json.contains("acct_...xxxx"));
    }
}
