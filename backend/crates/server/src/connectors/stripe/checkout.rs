/**
 * Stripe Checkout Session
 * 
 * Creates Checkout Sessions under connected accounts for payment processing.
 * Implements idempotent session creation.
 * 
 * Requirements: 12.1, 12.2, 12.9
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::models::errors::ApiError;
use super::client::StripeClient;

// ============================================================================
// Request/Response Types
// ============================================================================

/// Request to create a Checkout Session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateCheckoutRequest {
    /// Order ID for idempotency
    pub order_id: String,
    /// Amount in cents
    pub amount_cents: i64,
    /// Currency code (e.g., "usd")
    pub currency: String,
    /// Line items description
    pub description: String,
    /// Success URL after payment
    pub success_url: String,
    /// Cancel URL if customer cancels
    pub cancel_url: String,
    /// Optional metadata
    pub metadata: Option<HashMap<String, String>>,
}

/// Response from creating a Checkout Session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckoutSessionResponse {
    /// Checkout session ID
    pub session_id: String,
    /// URL to redirect customer to
    pub checkout_url: String,
    /// Session status
    pub status: String,
    /// Expiration time (Unix timestamp)
    pub expires_at: i64,
}

/// Stripe API response for Checkout Session
#[derive(Debug, Deserialize)]
struct StripeCheckoutSession {
    id: String,
    url: Option<String>,
    status: String,
    expires_at: i64,
}

// ============================================================================
// Checkout Implementation
// ============================================================================

impl StripeClient {
    /// Create a Checkout Session under the connected account
    /// 
    /// Requirements: 12.1, 12.2
    pub async fn create_checkout_session(
        &self,
        request: CreateCheckoutRequest,
    ) -> Result<CheckoutSessionResponse, ApiError> {
        // Build form data for Stripe API
        let mut form_data: Vec<(&str, String)> = vec![
            ("mode", "payment".to_string()),
            ("success_url", request.success_url),
            ("cancel_url", request.cancel_url),
            ("line_items[0][price_data][currency]", request.currency),
            ("line_items[0][price_data][unit_amount]", request.amount_cents.to_string()),
            ("line_items[0][price_data][product_data][name]", request.description.clone()),
            ("line_items[0][quantity]", "1".to_string()),
        ];
        
        // Add idempotency key based on order_id
        // This ensures same order_id returns existing session if not expired
        let idempotency_key = format!("checkout_{}", request.order_id);
        
        // Add metadata
        form_data.push(("metadata[order_id]", request.order_id.clone()));
        form_data.push(("metadata[idempotency_key]", idempotency_key.clone()));
        
        if let Some(metadata) = request.metadata {
            for (key, value) in metadata {
                form_data.push(("metadata[custom]", format!("{}:{}", key, value)));
            }
        }
        
        // Make request to Stripe
        let response = self.post_form_with_idempotency("/checkout/sessions", &form_data, Some(&idempotency_key)).await?;
        
        if !response.status().is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Failed to create Checkout Session: {}",
                error_body
            )));
        }
        
        let session: StripeCheckoutSession = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse Stripe response: {}", e)))?;
        
        Ok(CheckoutSessionResponse {
            session_id: session.id,
            checkout_url: session.url.unwrap_or_default(),
            status: session.status,
            expires_at: session.expires_at,
        })
    }
    
    /// Retrieve an existing Checkout Session
    pub async fn get_checkout_session(&self, session_id: &str) -> Result<CheckoutSessionResponse, ApiError> {
        let response = self.get(&format!("/checkout/sessions/{}", session_id)).await?;
        
        if !response.status().is_success() {
            let error_body = response.text().await.unwrap_or_default();
            return Err(ApiError::internal(format!(
                "Failed to get Checkout Session: {}",
                error_body
            )));
        }
        
        let session: StripeCheckoutSession = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse Stripe response: {}", e)))?;
        
        Ok(CheckoutSessionResponse {
            session_id: session.id,
            checkout_url: session.url.unwrap_or_default(),
            status: session.status,
            expires_at: session.expires_at,
        })
    }
    
    /// Make a POST request with form data and optional idempotency key
    async fn post_form_with_idempotency(
        &self,
        endpoint: &str,
        form_data: &[(&str, String)],
        idempotency_key: Option<&str>,
    ) -> Result<reqwest::Response, ApiError> {
        let url = format!("{}{}", self.base_url(), endpoint);
        
        let mut request = self.http_client()
            .post(&url)
            .bearer_auth(self.platform_secret_key())
            .header("Stripe-Account", self.connected_account_id());
        
        if let Some(key) = idempotency_key {
            request = request.header("Idempotency-Key", key);
        }
        
        request
            .form(form_data)
            .send()
            .await
            .map_err(|e| ApiError::internal(format!("Stripe API request failed: {}", e)))
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_create_checkout_request_serialization() {
        let request = CreateCheckoutRequest {
            order_id: "order_123".to_string(),
            amount_cents: 1000,
            currency: "usd".to_string(),
            description: "Test Order".to_string(),
            success_url: "https://example.com/success".to_string(),
            cancel_url: "https://example.com/cancel".to_string(),
            metadata: None,
        };
        
        let json = serde_json::to_string(&request).unwrap();
        assert!(json.contains("order_123"));
        assert!(json.contains("1000"));
    }
    
    #[test]
    fn test_checkout_session_response_serialization() {
        let response = CheckoutSessionResponse {
            session_id: "cs_test_123".to_string(),
            checkout_url: "https://checkout.stripe.com/pay/cs_test_123".to_string(),
            status: "open".to_string(),
            expires_at: 1234567890,
        };
        
        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("cs_test_123"));
        assert!(json.contains("open"));
    }
}
