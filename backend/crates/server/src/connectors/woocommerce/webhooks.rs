/**
 * WooCommerce Webhooks Handler
 * 
 * Validates webhook signatures and processes events
 * 
 * Requirements: 12.3, 12.5, 10.5, 5.5, 5.6
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;

/// WooCommerce webhook event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookEvent {
    pub id: i64,
    pub name: String,
    pub resource: String,
    pub event: String,
    pub hook_id: i64,
    pub delivered_at: String,
    pub payload: serde_json::Value,
}

/// Webhook event types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WebhookEventType {
    Created,
    Updated,
    Deleted,
    Restored,
}

/// Webhook resource types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WebhookResource {
    Order,
    Product,
    Customer,
}

/// Validate WooCommerce webhook signature
/// 
/// Requirements: 12.5 (HMAC-SHA256 validation)
pub fn validate_signature(
    body: &[u8],
    signature: &str,
    secret: &str,
) -> Result<bool, ApiError> {
    use hmac::{Hmac, Mac};
    use sha2::Sha256;
    use base64::{Engine as _, engine::general_purpose};
    
    type HmacSha256 = Hmac<Sha256>;
    
    let mut mac = HmacSha256::new_from_slice(secret.as_bytes())
        .map_err(|e| ApiError::internal(format!("Failed to create HMAC: {}", e)))?;
    
    mac.update(body);
    
    let expected = mac.finalize().into_bytes();
    let expected_base64 = general_purpose::STANDARD.encode(&expected);
    
    Ok(expected_base64 == signature)
}

/// Parse webhook event and extract resource type and action
pub fn parse_webhook_event(event: &WebhookEvent) -> Result<(WebhookResource, WebhookEventType), ApiError> {
    // Event format: "resource.action" (e.g., "order.created", "product.updated")
    let parts: Vec<&str> = event.event.split('.').collect();
    
    if parts.len() != 2 {
        return Err(ApiError::validation_msg("Invalid webhook event format"));
    }
    
    let resource = match parts[0] {
        "order" => WebhookResource::Order,
        "product" => WebhookResource::Product,
        "customer" => WebhookResource::Customer,
        _ => return Err(ApiError::validation_msg(&format!("Unknown resource type: {}", parts[0]))),
    };
    
    let event_type = match parts[1] {
        "created" => WebhookEventType::Created,
        "updated" => WebhookEventType::Updated,
        "deleted" => WebhookEventType::Deleted,
        "restored" => WebhookEventType::Restored,
        _ => return Err(ApiError::validation_msg(&format!("Unknown event type: {}", parts[1]))),
    };
    
    Ok((resource, event_type))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validate_signature() {
        use base64::{Engine as _, engine::general_purpose};
        
        let body = b"test payload";
        let secret = "test_secret";
        
        // Generate valid signature
        use hmac::{Hmac, Mac};
        use sha2::Sha256;
        type HmacSha256 = Hmac<Sha256>;
        
        let mut mac = HmacSha256::new_from_slice(secret.as_bytes()).unwrap();
        mac.update(body);
        let expected = mac.finalize().into_bytes();
        let signature = general_purpose::STANDARD.encode(&expected);
        
        // Test valid signature
        assert!(validate_signature(body, &signature, secret).unwrap());
        
        // Test invalid signature
        assert!(!validate_signature(body, "invalid", secret).unwrap());
    }
    
    #[test]
    fn test_parse_webhook_event() {
        let event = WebhookEvent {
            id: 1,
            name: "Order Created".to_string(),
            resource: "order".to_string(),
            event: "order.created".to_string(),
            hook_id: 123,
            delivered_at: "2024-01-01T00:00:00".to_string(),
            payload: serde_json::json!({}),
        };
        
        let (resource, event_type) = parse_webhook_event(&event).unwrap();
        
        assert!(matches!(resource, WebhookResource::Order));
        assert!(matches!(event_type, WebhookEventType::Created));
    }
}
