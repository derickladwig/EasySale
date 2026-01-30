/**
 * WooCommerce REST API v3 Client
 * 
 * Implements Basic Auth with Consumer Key/Secret over HTTPS
 * Base URL: /wp-json/wc/v3
 * 
 * Requirements: 1.3, 12.1
 */

use async_trait::async_trait;
use reqwest::{Client, Response, StatusCode};
use serde::{Deserialize, Serialize};

use crate::connectors::{ConnectionStatus, PlatformConnector};
use crate::models::errors::ApiError;
use crate::services::credential_service::WooCommerceCredentials;

/// WooCommerce API client
pub struct WooCommerceClient {
    client: Client,
    credentials: WooCommerceCredentials,
    base_url: String,
}

impl WooCommerceClient {
    /// Create a new WooCommerce client
    pub fn new(credentials: WooCommerceCredentials) -> Result<Self, ApiError> {
        // Validate store URL
        if !credentials.store_url.starts_with("https://") {
            return Err(ApiError::validation_msg(
                "WooCommerce store URL must use HTTPS",
            ));
        }

        let base_url = format!("{}/wp-json/wc/v3", credentials.store_url.trim_end_matches('/'));

        let client = Client::builder()
            .user_agent("EasySale/1.0")
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            client,
            credentials,
            base_url,
        })
    }

    /// Make a GET request to WooCommerce API
    pub async fn get(&self, endpoint: &str) -> Result<Response, ApiError> {
        let url = format!("{}/{}", self.base_url, endpoint.trim_start_matches('/'));

        tracing::debug!("WooCommerce GET: {}", url);

        let response = self
            .client
            .get(&url)
            .basic_auth(&self.credentials.consumer_key, Some(&self.credentials.consumer_secret))
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("WooCommerce API request failed: {}", e)))?;

        self.handle_response(response).await
    }

    /// Make a POST request to WooCommerce API
    pub async fn post<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<Response, ApiError> {
        let url = format!("{}/{}", self.base_url, endpoint.trim_start_matches('/'));

        tracing::debug!("WooCommerce POST: {}", url);

        let response = self
            .client
            .post(&url)
            .basic_auth(&self.credentials.consumer_key, Some(&self.credentials.consumer_secret))
            .json(body)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("WooCommerce API request failed: {}", e)))?;

        self.handle_response(response).await
    }

    /// Make a PUT request to WooCommerce API
    pub async fn put<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<Response, ApiError> {
        let url = format!("{}/{}", self.base_url, endpoint.trim_start_matches('/'));

        tracing::debug!("WooCommerce PUT: {}", url);

        let response = self
            .client
            .put(&url)
            .basic_auth(&self.credentials.consumer_key, Some(&self.credentials.consumer_secret))
            .json(body)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("WooCommerce API request failed: {}", e)))?;

        self.handle_response(response).await
    }

    /// Make a DELETE request to WooCommerce API
    pub async fn delete(&self, endpoint: &str) -> Result<Response, ApiError> {
        let url = format!("{}/{}", self.base_url, endpoint.trim_start_matches('/'));

        tracing::debug!("WooCommerce DELETE: {}", url);

        let response = self
            .client
            .delete(&url)
            .basic_auth(&self.credentials.consumer_key, Some(&self.credentials.consumer_secret))
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("WooCommerce API request failed: {}", e)))?;

        self.handle_response(response).await
    }

    /// Handle API response and check for errors
    async fn handle_response(&self, response: Response) -> Result<Response, ApiError> {
        let status = response.status();

        if status.is_success() {
            return Ok(response);
        }

        // Try to parse error response
        let error_text = response
            .text()
            .await
            .unwrap_or_else(|_| "Unknown error".to_string());

        tracing::error!("WooCommerce API error ({}): {}", status, error_text);

        match status {
            StatusCode::UNAUTHORIZED => Err(ApiError::unauthorized("Invalid WooCommerce credentials")),
            StatusCode::FORBIDDEN => Err(ApiError::forbidden("Access denied to WooCommerce resource")),
            StatusCode::NOT_FOUND => Err(ApiError::not_found("WooCommerce resource not found")),
            StatusCode::TOO_MANY_REQUESTS => Err(ApiError::internal("WooCommerce rate limit exceeded")),
            _ => Err(ApiError::internal(format!(
                "WooCommerce API error ({}): {}",
                status, error_text
            ))),
        }
    }
}

#[async_trait]
impl PlatformConnector for WooCommerceClient {
    async fn test_connection(&self) -> Result<bool, ApiError> {
        // Test connection by fetching system status
        let response = self.get("system_status").await?;
        Ok(response.status().is_success())
    }

    fn platform_name(&self) -> &str {
        "woocommerce"
    }

    async fn get_status(&self) -> Result<ConnectionStatus, ApiError> {
        let is_connected = self.test_connection().await.unwrap_or(false);

        Ok(ConnectionStatus {
            platform: self.platform_name().to_string(),
            is_connected,
            last_check: chrono::Utc::now().to_rfc3339(),
            error_message: if is_connected {
                None
            } else {
                Some("Connection test failed".to_string())
            },
        })
    }
}

/// WooCommerce API error response
/// 
/// Note: Currently unused - error handling uses ApiError directly.
/// Reserved for future detailed error parsing.
#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct WooCommerceError {
    pub code: String,
    pub message: String,
    pub data: Option<serde_json::Value>,
}
