/**
 * Square API Client
 * 
 * HTTP client for Square API using Bearer token authentication.
 * 
 * Requirements: 2.3, 2.8
 */

use async_trait::async_trait;
use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::connectors::{ConnectionStatus, PlatformConnector};
use crate::models::errors::ApiError;

// ============================================================================
// Client Configuration
// ============================================================================

/// Square API credentials
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SquareCredentials {
    /// Square access token
    pub access_token: String,
    /// Square location ID
    pub location_id: String,
}

/// Square API client
#[derive(Clone)]
pub struct SquareClient {
    /// HTTP client
    http_client: Client,
    /// Access token
    access_token: String,
    /// Location ID
    location_id: String,
    /// Base URL for Square API
    base_url: String,
}

impl SquareClient {
    /// Create new Square client
    /// 
    /// Requirements: 2.3
    pub fn new(credentials: SquareCredentials) -> Result<Self, ApiError> {
        let http_client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to create HTTP client: {}", e)))?;
        
        Ok(Self {
            http_client,
            access_token: credentials.access_token,
            location_id: credentials.location_id,
            base_url: "https://connect.squareup.com/v2".to_string(),
        })
    }
    
    /// Get location summary
    /// 
    /// Requirements: 2.8
    pub async fn get_location_summary(&self) -> Result<SquareSummary, ApiError> {
        let url = format!("{}/locations/{}", self.base_url, self.location_id);
        
        let response = self.http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Square-Version", "2024-01-18")
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Square API request failed: {}", e)))?;
        
        if !response.status().is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Failed to get Square location: {}",
                error_body
            )));
        }
        
        let location_response: SquareLocationResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse Square response: {}", e)))?;
        
        let location = location_response.location;
        
        Ok(SquareSummary {
            location_name: location.name,
            address: location.address.map(|a| format_address(&a)),
            capabilities: location.capabilities.unwrap_or_default(),
        })
    }
    
    /// Get the location ID
    pub fn location_id(&self) -> &str {
        &self.location_id
    }
}

// ============================================================================
// PlatformConnector Implementation
// ============================================================================

#[async_trait]
impl PlatformConnector for SquareClient {
    /// Test connection to Square
    /// 
    /// Requirements: 2.3
    async fn test_connection(&self) -> Result<bool, ApiError> {
        let url = format!("{}/locations", self.base_url);
        
        let response = self.http_client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Square-Version", "2024-01-18")
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Square API request failed: {}", e)))?;
        
        Ok(response.status().is_success())
    }
    
    fn platform_name(&self) -> &str {
        "square"
    }
    
    async fn get_status(&self) -> Result<ConnectionStatus, ApiError> {
        let is_connected = self.test_connection().await.unwrap_or(false);
        
        Ok(ConnectionStatus {
            platform: "square".to_string(),
            is_connected,
            last_check: chrono::Utc::now().to_rfc3339(),
            error_message: None,
        })
    }
}

// ============================================================================
// Response Types
// ============================================================================

/// Square location summary for display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SquareSummary {
    /// Location name
    pub location_name: Option<String>,
    /// Formatted address
    pub address: Option<String>,
    /// Location capabilities
    pub capabilities: Vec<String>,
}

#[derive(Debug, Deserialize)]
struct SquareLocationResponse {
    location: SquareLocation,
}

#[derive(Debug, Deserialize)]
struct SquareLocation {
    id: String,
    name: Option<String>,
    address: Option<SquareAddress>,
    capabilities: Option<Vec<String>>,
}

#[derive(Debug, Deserialize)]
struct SquareAddress {
    address_line_1: Option<String>,
    locality: Option<String>,
    administrative_district_level_1: Option<String>,
    postal_code: Option<String>,
    country: Option<String>,
}

// ============================================================================
// Helpers
// ============================================================================

fn format_address(address: &SquareAddress) -> String {
    let parts: Vec<&str> = [
        address.address_line_1.as_deref(),
        address.locality.as_deref(),
        address.administrative_district_level_1.as_deref(),
        address.postal_code.as_deref(),
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
    fn test_square_credentials_serialization() {
        let creds = SquareCredentials {
            access_token: "test_token".to_string(),
            location_id: "loc_123".to_string(),
        };
        
        let json = serde_json::to_string(&creds).unwrap();
        assert!(json.contains("test_token"));
        assert!(json.contains("loc_123"));
    }
    
    #[test]
    fn test_format_address() {
        let address = SquareAddress {
            address_line_1: Some("123 Main St".to_string()),
            locality: Some("San Francisco".to_string()),
            administrative_district_level_1: Some("CA".to_string()),
            postal_code: Some("94102".to_string()),
            country: Some("US".to_string()),
        };
        
        let formatted = format_address(&address);
        assert!(formatted.contains("123 Main St"));
        assert!(formatted.contains("San Francisco"));
    }
}
