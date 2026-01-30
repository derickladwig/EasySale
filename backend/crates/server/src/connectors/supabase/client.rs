/**
 * Supabase Client
 * 
 * Handles connection to Supabase using REST API and PostgreSQL.
 * 
 * Requirements: 13.1
 */

use reqwest::{Client, Response};
use serde::Serialize;

use crate::models::ApiError;
use crate::connectors::PlatformConnector;

// ============================================================================
// Configuration
// ============================================================================

/// Supabase connection configuration
#[derive(Debug, Clone)]
pub struct SupabaseConfig {
    /// Supabase project URL (e.g., https://xxx.supabase.co)
    pub project_url: String,
    
    /// Service role key (server-side, full access)
    pub service_role_key: String,
    
    /// Read-only mode (for analytics-only use cases)
    pub read_only: bool,
}

impl SupabaseConfig {
    pub fn new(project_url: String, service_role_key: String) -> Self {
        Self {
            project_url,
            service_role_key,
            read_only: false,
        }
    }
    
    pub fn with_read_only(mut self, read_only: bool) -> Self {
        self.read_only = read_only;
        self
    }
}

// ============================================================================
// Client
// ============================================================================

/// Supabase REST API client
#[derive(Clone)]
pub struct SupabaseClient {
    config: SupabaseConfig,
    http_client: Client,
    base_url: String,
}

impl SupabaseClient {
    /// Create new Supabase client
    /// 
    /// Requirements: 13.1
    pub fn new(config: SupabaseConfig) -> Result<Self, ApiError> {
        let http_client = Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to create HTTP client: {}", e)))?;
        
        let base_url = format!("{}/rest/v1", config.project_url);
        
        Ok(Self {
            config,
            http_client,
            base_url,
        })
    }
    
    /// Get HTTP client with authentication headers
    pub(crate) fn authenticated_request(&self, method: reqwest::Method, endpoint: &str) -> reqwest::RequestBuilder {
        let url = format!("{}/{}", self.base_url, endpoint);
        
        self.http_client
            .request(method, &url)
            .header("apikey", &self.config.service_role_key)
            .header("Authorization", format!("Bearer {}", self.config.service_role_key))
            .header("Content-Type", "application/json")
            .header("Prefer", "return=representation")
    }
    
    /// GET request
    pub async fn get(&self, endpoint: &str) -> Result<Response, ApiError> {
        let response = self.authenticated_request(reqwest::Method::GET, endpoint)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("GET request failed: {}", e)))?;
        
        Ok(response)
    }
    
    /// POST request
    pub async fn post<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<Response, ApiError> {
        if self.config.read_only {
            return Err(ApiError::forbidden("Write operations not allowed in read-only mode"));
        }
        
        let response = self.authenticated_request(reqwest::Method::POST, endpoint)
            .json(body)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("POST request failed: {}", e)))?;
        
        Ok(response)
    }
    
    /// PATCH request
    pub async fn patch<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<Response, ApiError> {
        if self.config.read_only {
            return Err(ApiError::forbidden("Write operations not allowed in read-only mode"));
        }
        
        let response = self.authenticated_request(reqwest::Method::PATCH, endpoint)
            .json(body)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("PATCH request failed: {}", e)))?;
        
        Ok(response)
    }
    
    /// DELETE request
    pub async fn delete(&self, endpoint: &str) -> Result<Response, ApiError> {
        if self.config.read_only {
            return Err(ApiError::forbidden("Write operations not allowed in read-only mode"));
        }
        
        let response = self.authenticated_request(reqwest::Method::DELETE, endpoint)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("DELETE request failed: {}", e)))?;
        
        Ok(response)
    }

    /// Upsert operation (insert or update)
    pub async fn upsert(&self, table: &str, data: &serde_json::Value) -> Result<String, String> {
        if self.config.read_only {
            return Err("Write operations not allowed in read-only mode".to_string());
        }

        let endpoint = format!("/rest/v1/{}", table);
        let response = self.post(&endpoint, data)
            .await
            .map_err(|e| format!("Upsert failed: {}", e))?;

        // Extract ID from response
        let body = response.text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        let json: serde_json::Value = serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        // Try to get ID from response
        if let Some(id) = json.get("id").and_then(|v| v.as_str()) {
            return Ok(id.to_string());
        } else if let Some(arr) = json.as_array() {
            if let Some(first) = arr.first() {
                if let Some(id) = first.get("id").and_then(|v| v.as_str()) {
                    return Ok(id.to_string());
                }
            }
        }
        
        // If no ID found, return a placeholder
        Ok("upserted".to_string())
    }
}

// ============================================================================
// Platform Connector Implementation
// ============================================================================

#[async_trait::async_trait]
impl PlatformConnector for SupabaseClient {
    /// Test connection to Supabase
    /// 
    /// Requirements: 13.1
    async fn test_connection(&self) -> Result<bool, ApiError> {
        // Try to query a system table to verify connection
        let response = self.get("").await?;
        
        Ok(response.status().is_success())
    }
    
    fn platform_name(&self) -> &str {
        "supabase"
    }
    
    async fn get_status(&self) -> Result<crate::connectors::ConnectionStatus, ApiError> {
        let is_connected = self.test_connection().await.unwrap_or(false);
        let now = chrono::Utc::now().to_rfc3339();
        
        Ok(crate::connectors::ConnectionStatus {
            platform: self.platform_name().to_string(),
            is_connected,
            last_check: now,
            error_message: if is_connected { None } else { Some("Connection test failed".to_string()) },
        })
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_supabase_config_new() {
        let config = SupabaseConfig::new(
            "https://xxx.supabase.co".to_string(),
            "test_key".to_string(),
        );
        
        assert_eq!(config.project_url, "https://xxx.supabase.co");
        assert_eq!(config.service_role_key, "test_key");
        assert!(!config.read_only);
    }
    
    #[test]
    fn test_supabase_config_read_only() {
        let config = SupabaseConfig::new(
            "https://xxx.supabase.co".to_string(),
            "test_key".to_string(),
        )
        .with_read_only(true);
        
        assert!(config.read_only);
    }
    
    #[test]
    fn test_supabase_client_creation() {
        let config = SupabaseConfig::new(
            "https://xxx.supabase.co".to_string(),
            "test_key".to_string(),
        );
        
        let result = SupabaseClient::new(config);
        assert!(result.is_ok());
        
        let client = result.unwrap();
        assert_eq!(client.base_url, "https://xxx.supabase.co/rest/v1");
    }
    
    #[test]
    fn test_platform_name() {
        let config = SupabaseConfig::new(
            "https://xxx.supabase.co".to_string(),
            "test_key".to_string(),
        );
        let client = SupabaseClient::new(config).unwrap();
        
        assert_eq!(client.platform_name(), "supabase");
    }
}
