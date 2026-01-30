/**
 * QuickBooks Online API Client
 * 
 * Base URL: https://quickbooks.api.intuit.com/v3/company/{realmId}
 * CRITICAL: minorversion=75 required on ALL requests (August 1, 2025)
 * 
 * Requirements: 1.4
 * 
 * Note: Some methods are currently unused but are part of the complete API client
 * implementation for future use.
 */

use async_trait::async_trait;
use reqwest::{Client, Response, StatusCode};
use serde::{Deserialize, Serialize};

use crate::connectors::{ConnectionStatus, PlatformConnector};
use crate::models::errors::ApiError;
use crate::services::credential_service::{QuickBooksCredentials, QuickBooksTokens};
use super::errors::{QBError, QBErrorHandler};

/// QuickBooks API base URL
const BASE_URL: &str = "https://quickbooks.api.intuit.com/v3/company";

/// Minor version (required after August 1, 2025)
const MINOR_VERSION: u32 = 75;

/// QuickBooks API client
#[derive(Clone)]
pub struct QuickBooksClient {
    client: Client,
    realm_id: String,
    access_token: String,
}

impl QuickBooksClient {
    /// Create a new QuickBooks client
    pub fn new(credentials: &QuickBooksCredentials, tokens: &QuickBooksTokens) -> Result<Self, ApiError> {
        let client = Client::builder()
            .user_agent("EasySale/1.0")
            .build()
            .map_err(|e| ApiError::internal(format!("Failed to create HTTP client: {}", e)))?;

        Ok(Self {
            client,
            realm_id: credentials.realm_id.clone(),
            access_token: tokens.access_token.clone(),
        })
    }

    /// Make a GET request to QuickBooks API
    pub async fn get(&self, endpoint: &str) -> Result<Response, ApiError> {
        let url = format!(
            "{}/{}/{}?minorversion={}",
            BASE_URL,
            self.realm_id,
            endpoint.trim_start_matches('/'),
            MINOR_VERSION
        );

        tracing::debug!("QuickBooks GET: {}", url);

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("QuickBooks API request failed: {}", e)))?;

        self.handle_response(response).await
    }

    /// Make a POST request to QuickBooks API
    pub async fn post<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<Response, ApiError> {
        let url = format!(
            "{}/{}/{}?minorversion={}",
            BASE_URL,
            self.realm_id,
            endpoint.trim_start_matches('/'),
            MINOR_VERSION
        );

        tracing::debug!("QuickBooks POST: {}", url);

        let response = self
            .client
            .post(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("QuickBooks API request failed: {}", e)))?;

        self.handle_response(response).await
    }

    /// Make a sparse update (partial update with SyncToken)
    pub async fn sparse_update<T: Serialize>(&self, endpoint: &str, body: &T) -> Result<Response, ApiError> {
        let url = format!(
            "{}/{}/{}?minorversion={}&operation=update",
            BASE_URL,
            self.realm_id,
            endpoint.trim_start_matches('/'),
            MINOR_VERSION
        );

        tracing::debug!("QuickBooks SPARSE UPDATE: {}", url);

        let response = self
            .client
            .post(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .json(body)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("QuickBooks API request failed: {}", e)))?;

        self.handle_response(response).await
    }

    /// Execute a query
    pub async fn query(&self, query: &str) -> Result<Response, ApiError> {
        let url = format!(
            "{}/{}/query?query={}&minorversion={}",
            BASE_URL,
            self.realm_id,
            urlencoding::encode(query),
            MINOR_VERSION
        );

        tracing::debug!("QuickBooks QUERY: {}", query);

        let response = self
            .client
            .get(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("QuickBooks API request failed: {}", e)))?;

        self.handle_response(response).await
    }

    /// Execute a query and return JSON (for flows)
    pub async fn query_json(&self, query: &str) -> Result<serde_json::Value, String> {
        let response = self.query(query)
            .await
            .map_err(|e| format!("Query failed: {}", e))?;

        let body = response.text().await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse JSON: {}", e))
    }

    /// Create an entity
    pub async fn create(&self, entity_type: &str, data: &serde_json::Value) -> Result<serde_json::Value, String> {
        let url = format!(
            "{}/{}/{}?minorversion={}",
            BASE_URL,
            self.realm_id,
            entity_type,
            MINOR_VERSION
        );

        tracing::debug!("QuickBooks CREATE: {}", entity_type);

        let response = self
            .client
            .post(&url)
            .bearer_auth(&self.access_token)
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .json(data)
            .send()
            .await
            .map_err(|e| format!("QuickBooks API request failed: {}", e))?;

        let body = response.text().await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        serde_json::from_str(&body)
            .map_err(|e| format!("Failed to parse JSON: {}", e))
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

        // Parse as QuickBooks error for better handling
        let qb_error = QBError::from_status(status.as_u16(), &error_text);
        
        // Log the error with context
        QBErrorHandler::log_error(&qb_error, "API Request", None);
        
        // Determine handling strategy
        let strategy = QBErrorHandler::handle_error(&qb_error);
        tracing::info!("QuickBooks error handling strategy: {:?}", strategy);
        tracing::info!("Recommended action: {}", qb_error.recommended_action());

        // Convert to ApiError for return
        match status {
            StatusCode::UNAUTHORIZED => Err(ApiError::unauthorized("Invalid QuickBooks credentials or expired token")),
            StatusCode::FORBIDDEN => Err(ApiError::forbidden("Access denied to QuickBooks resource")),
            StatusCode::NOT_FOUND => Err(ApiError::not_found("QuickBooks resource not found")),
            StatusCode::TOO_MANY_REQUESTS => {
                if let Some(retry_after) = qb_error.retry_delay() {
                    tracing::warn!("Rate limit exceeded. Retry after {} seconds", retry_after);
                }
                Err(ApiError::internal("QuickBooks rate limit exceeded"))
            },
            StatusCode::BAD_REQUEST => Err(ApiError::validation_msg(&error_text)),
            _ => Err(ApiError::internal(format!(
                "QuickBooks API error ({}): {}",
                status, error_text
            ))),
        }
    }
}

#[async_trait]
impl PlatformConnector for QuickBooksClient {
    async fn test_connection(&self) -> Result<bool, ApiError> {
        // Test connection by querying company info
        let response = self.get("companyinfo/1").await?;
        Ok(response.status().is_success())
    }

    fn platform_name(&self) -> &str {
        "quickbooks"
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

/// QuickBooks API error response
/// 
/// Note: Currently unused - error handling uses QBError from errors module.
/// Reserved for future detailed error parsing.
#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct QuickBooksError {
    #[serde(rename = "Fault")]
    pub fault: Fault,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct Fault {
    #[serde(rename = "Error")]
    pub error: Vec<ErrorDetail>,
    #[serde(rename = "type")]
    pub error_type: String,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
pub struct ErrorDetail {
    #[serde(rename = "Message")]
    pub message: String,
    #[serde(rename = "Detail")]
    pub detail: Option<String>,
    #[serde(rename = "code")]
    pub code: String,
}
