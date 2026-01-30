/**
 * Clover API Client
 * 
 * HTTP client for Clover API using OAuth Bearer token.
 * 
 * Requirements: 3.4, 3.9
 */

use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;

use crate::connectors::{ConnectionStatus, PlatformConnector};
use crate::models::errors::ApiError;

use super::oauth::CloverTokens;

// ============================================================================
// Client Configuration
// ============================================================================

/// Clover API client
#[derive(Clone)]
pub struct CloverClient {
    /// HTTP client
    http_client: Client,
    /// Access token
    access_token: String,
    /// Merchant ID
    merchant_id: String,
    /// Base URL for Clover API
    base_url: String,
}

impl CloverClient {
    /// Create new Clover client from tokens
    /// 
    /// Requirements: 3.4
    pub fn new(tokens: CloverTokens) -> Result<Self, ApiError> {
        let http_client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to create HTTP client: {}", e)))?;
        
        // Determine API URL based on environment
        let base_url = match env::var("CLOVER_ENVIRONMENT").unwrap_or_default().as_str() {
            "production" => "https://api.clover.com/v3".to_string(),
            _ => "https://apisandbox.dev.clover.com/v3".to_string(),
        };
        
        Ok(Self {
            http_client,
            access_token: tokens.access_token,
            merchant_id: tokens.merchant_id,
            base_url,
        })
    }
    
    /// Get merchant summary
    /// 
    /// Requirements: 3.9
    pub async fn get_merchant_summary(&self) -> Result<CloverSummary, ApiError> {
        let url = format!("{}/merchants/{}", self.base_url, self.merchant_id);
        
        let response = self.http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Clover API request failed: {}", e)))?;
        
        if !response.status().is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Failed to get Clover merchant: {}",
                error_body
            )));
        }
        
        let merchant: CloverMerchantResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse Clover response: {}", e)))?;
        
        Ok(CloverSummary {
            merchant_name: merchant.name,
            address: merchant.address.map(|a| format_address(&a)),
        })
    }
    
    /// Get the merchant ID
    pub fn merchant_id(&self) -> &str {
        &self.merchant_id
    }
}

// ============================================================================
// PlatformConnector Implementation
// ============================================================================

#[async_trait]
impl PlatformConnector for CloverClient {
    /// Test connection to Clover
    /// 
    /// Requirements: 3.4
    async fn test_connection(&self) -> Result<bool, ApiError> {
        let url = format!("{}/merchants/{}", self.base_url, self.merchant_id);
        
        let response = self.http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Clover API request failed: {}", e)))?;
        
        Ok(response.status().is_success())
    }
    
    fn platform_name(&self) -> &str {
        "clover"
    }
    
    async fn get_status(&self) -> Result<ConnectionStatus, ApiError> {
        let is_connected = self.test_connection().await.unwrap_or(false);
        
        Ok(ConnectionStatus {
            platform: "clover".to_string(),
            is_connected,
            last_check: chrono::Utc::now().to_rfc3339(),
            error_message: None,
        })
    }
}

// ============================================================================
// Response Types
// ============================================================================

/// Clover merchant summary for display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloverSummary {
    /// Merchant name
    pub merchant_name: Option<String>,
    /// Formatted address
    pub address: Option<String>,
}

#[derive(Debug, Deserialize)]
struct CloverMerchantResponse {
    id: String,
    name: Option<String>,
    address: Option<CloverAddress>,
}

#[derive(Debug, Deserialize)]
struct CloverAddress {
    address1: Option<String>,
    city: Option<String>,
    state: Option<String>,
    zip: Option<String>,
    country: Option<String>,
}

// ============================================================================
// Helpers
// ============================================================================

fn format_address(address: &CloverAddress) -> String {
    let parts: Vec<&str> = [
        address.address1.as_deref(),
        address.city.as_deref(),
        address.state.as_deref(),
        address.zip.as_deref(),
    ]
    .iter()
    .filter_map(|&p| p)
    .collect();
    
    parts.join(", ")
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_clover_summary_serialization() {
        let summary = CloverSummary {
            merchant_name: Some("Test Merchant".to_string()),
            address: Some("123 Main St, City, ST 12345".to_string()),
        };
        
        let json = serde_json::to_string(&summary).unwrap();
        assert!(json.contains("Test Merchant"));
    }
    
    #[test]
    fn test_format_address() {
        let address = CloverAddress {
            address1: Some("123 Main St".to_string()),
            city: Some("San Francisco".to_string()),
            state: Some("CA".to_string()),
            zip: Some("94102".to_string()),
            country: Some("US".to_string()),
        };
        
        let formatted = format_address(&address);
        assert!(formatted.contains("123 Main St"));
        assert!(formatted.contains("San Francisco"));
    }
}
