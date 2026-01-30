/**
 * QuickBooks CloudEvents Webhook Handler
 * 
 * Handles incoming webhooks from QuickBooks Online in the CloudEvents format.
 * Required by May 15, 2026 (migration from current format).
 * 
 * Requirements: 11.8
 * 
 * CloudEvents Format:
 * {
 *   "specversion": "1.0",
 *   "type": "qbo.invoice.created.v1",
 *   "source": "https://quickbooks.api.intuit.com",
 *   "id": "unique-event-id",
 *   "time": "2024-01-01T12:00:00Z",
 *   "datacontenttype": "application/json",
 *   "intuitaccountid": "123456789",
 *   "intuitentityid": "42",
 *   "data": {
 *     // Entity-specific data
 *   }
 * }
 */

use serde::{Deserialize, Serialize};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use base64::{Engine as _, engine::general_purpose};

use crate::models::ApiError;

type HmacSha256 = Hmac<Sha256>;

// ============================================================================
// CloudEvents Payload Structures
// ============================================================================

/// CloudEvents webhook payload from QuickBooks
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudEvent {
    /// CloudEvents specification version (should be "1.0")
    pub specversion: String,
    
    /// Event type (e.g., "qbo.invoice.created.v1")
    #[serde(rename = "type")]
    pub event_type: String,
    
    /// Event source (QuickBooks API URL)
    pub source: String,
    
    /// Unique event ID
    pub id: String,
    
    /// Event timestamp (ISO 8601)
    pub time: String,
    
    /// Content type of data field
    #[serde(default)]
    pub datacontenttype: Option<String>,
    
    /// QuickBooks realm ID (company ID)
    pub intuitaccountid: String,
    
    /// Entity ID
    pub intuitentityid: String,
    
    /// Event-specific data
    #[serde(default)]
    pub data: Option<serde_json::Value>,
}

// ============================================================================
// CloudEvents Signature Validation
// ============================================================================

/// Validate CloudEvents webhook signature
/// 
/// Uses the same HMAC-SHA256 validation as current format,
/// but with CloudEvents payload structure.
/// 
/// Requirements: 10.5, 11.8
pub fn validate_cloudevents_signature(
    payload: &[u8],
    signature_header: &str,
    verifier_token: &str,
) -> Result<bool, ApiError> {
    // Decode the signature from base64
    let expected_signature = general_purpose::STANDARD
        .decode(signature_header)
        .map_err(|e| ApiError::validation_msg(&format!("Invalid signature encoding: {}", e)))?;
    
    // Create HMAC with verifier token
    let mut mac = HmacSha256::new_from_slice(verifier_token.as_bytes())
        .map_err(|e| ApiError::internal(format!("HMAC initialization failed: {}", e)))?;
    
    // Update with payload
    mac.update(payload);
    
    // Verify signature
    mac.verify_slice(&expected_signature)
        .map(|_| true)
        .or(Ok(false))
}

// ============================================================================
// CloudEvents Parsing
// ============================================================================

/// Parse CloudEvents webhook payload
pub fn parse_cloudevents(payload: &[u8]) -> Result<CloudEvent, ApiError> {
    serde_json::from_slice(payload)
        .map_err(|e| ApiError::validation_msg(&format!("Invalid CloudEvents payload: {}", e)))
}

/// Detect if payload is CloudEvents format
/// 
/// CloudEvents payloads have a "specversion" field
pub fn is_cloudevents_format(payload: &[u8]) -> bool {
    if let Ok(json) = serde_json::from_slice::<serde_json::Value>(payload) {
        json.get("specversion").is_some()
    } else {
        false
    }
}

/// Parse CloudEvents type field to extract entity and operation
/// 
/// Format: "qbo.{entity}.{operation}.v{version}"
/// Examples:
/// - "qbo.invoice.created.v1" -> (Invoice, Create)
/// - "qbo.customer.updated.v1" -> (Customer, Update)
/// - "qbo.item.deleted.v1" -> (Item, Delete)
pub fn parse_cloudevents_type(event_type: &str) -> Result<(CloudEntityType, CloudOperation), ApiError> {
    let parts: Vec<&str> = event_type.split('.').collect();
    
    if parts.len() < 4 || parts[0] != "qbo" {
        return Err(ApiError::validation_msg(&format!(
            "Invalid CloudEvents type format: {}",
            event_type
        )));
    }
    
    let entity = match parts[1] {
        "customer" => CloudEntityType::Customer,
        "invoice" => CloudEntityType::Invoice,
        "item" => CloudEntityType::Item,
        "payment" => CloudEntityType::Payment,
        "salesreceipt" => CloudEntityType::SalesReceipt,
        "creditmemo" => CloudEntityType::CreditMemo,
        "refundreceipt" => CloudEntityType::RefundReceipt,
        "vendor" => CloudEntityType::Vendor,
        "bill" => CloudEntityType::Bill,
        "purchase" => CloudEntityType::Purchase,
        "vendorcredit" => CloudEntityType::VendorCredit,
        other => return Err(ApiError::validation_msg(&format!("Unsupported entity type: {}", other))),
    };
    
    let operation = match parts[2] {
        "created" => CloudOperation::Created,
        "updated" => CloudOperation::Updated,
        "deleted" => CloudOperation::Deleted,
        "voided" => CloudOperation::Voided,
        "merged" => CloudOperation::Merged,
        other => return Err(ApiError::validation_msg(&format!("Unsupported operation: {}", other))),
    };
    
    Ok((entity, operation))
}

// ============================================================================
// Entity Types and Operations
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CloudEntityType {
    Customer,
    Invoice,
    Item,
    Payment,
    SalesReceipt,
    CreditMemo,
    RefundReceipt,
    Vendor,
    Bill,
    Purchase,
    VendorCredit,
}

impl CloudEntityType {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Customer => "customer",
            Self::Invoice => "invoice",
            Self::Item => "item",
            Self::Payment => "payment",
            Self::SalesReceipt => "sales_receipt",
            Self::CreditMemo => "credit_memo",
            Self::RefundReceipt => "refund_receipt",
            Self::Vendor => "vendor",
            Self::Bill => "bill",
            Self::Purchase => "purchase",
            Self::VendorCredit => "vendor_credit",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CloudOperation {
    Created,
    Updated,
    Deleted,
    Voided,
    Merged,
}

impl CloudOperation {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Created => "create",
            Self::Updated => "update",
            Self::Deleted => "delete",
            Self::Voided => "void",
            Self::Merged => "merge",
        }
    }
}

// ============================================================================
// Sync Queue Integration
// ============================================================================

/// Sync operation from CloudEvents
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CloudEventsSyncOperation {
    pub realm_id: String,
    pub entity_type: CloudEntityType,
    pub entity_id: String,
    pub operation: CloudOperation,
    pub event_time: String,
    pub event_id: String,
}

impl CloudEventsSyncOperation {
    pub fn from_cloudevent(event: &CloudEvent) -> Result<Self, ApiError> {
        let (entity_type, operation) = parse_cloudevents_type(&event.event_type)?;
        
        Ok(Self {
            realm_id: event.intuitaccountid.clone(),
            entity_type,
            entity_id: event.intuitentityid.clone(),
            operation,
            event_time: event.time.clone(),
            event_id: event.id.clone(),
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
    fn test_parse_cloudevents() {
        let payload = r#"{
            "specversion": "1.0",
            "type": "qbo.invoice.created.v1",
            "source": "https://quickbooks.api.intuit.com",
            "id": "event-123",
            "time": "2024-01-01T12:00:00Z",
            "intuitaccountid": "123456789",
            "intuitentityid": "42"
        }"#;
        
        let result = parse_cloudevents(payload.as_bytes());
        assert!(result.is_ok());
        
        let event = result.unwrap();
        assert_eq!(event.specversion, "1.0");
        assert_eq!(event.event_type, "qbo.invoice.created.v1");
        assert_eq!(event.intuitaccountid, "123456789");
        assert_eq!(event.intuitentityid, "42");
    }
    
    #[test]
    fn test_is_cloudevents_format() {
        let cloudevents_payload = r#"{"specversion": "1.0", "type": "qbo.invoice.created.v1"}"#;
        assert!(is_cloudevents_format(cloudevents_payload.as_bytes()));
        
        let legacy_payload = r#"{"eventNotifications": []}"#;
        assert!(!is_cloudevents_format(legacy_payload.as_bytes()));
    }
    
    #[test]
    fn test_parse_cloudevents_type() {
        let result = parse_cloudevents_type("qbo.invoice.created.v1");
        assert!(result.is_ok());
        
        let (entity, operation) = result.unwrap();
        assert_eq!(entity, CloudEntityType::Invoice);
        assert_eq!(operation, CloudOperation::Created);
    }
    
    #[test]
    fn test_parse_cloudevents_type_customer_updated() {
        let result = parse_cloudevents_type("qbo.customer.updated.v1");
        assert!(result.is_ok());
        
        let (entity, operation) = result.unwrap();
        assert_eq!(entity, CloudEntityType::Customer);
        assert_eq!(operation, CloudOperation::Updated);
    }
    
    #[test]
    fn test_parse_cloudevents_type_invalid() {
        let result = parse_cloudevents_type("invalid.format");
        assert!(result.is_err());
    }
    
    #[test]
    fn test_sync_operation_from_cloudevent() {
        let event = CloudEvent {
            specversion: "1.0".to_string(),
            event_type: "qbo.customer.created.v1".to_string(),
            source: "https://quickbooks.api.intuit.com".to_string(),
            id: "event-123".to_string(),
            time: "2024-01-01T12:00:00Z".to_string(),
            datacontenttype: Some("application/json".to_string()),
            intuitaccountid: "realm123".to_string(),
            intuitentityid: "456".to_string(),
            data: None,
        };
        
        let result = CloudEventsSyncOperation::from_cloudevent(&event);
        assert!(result.is_ok());
        
        let sync_op = result.unwrap();
        assert_eq!(sync_op.realm_id, "realm123");
        assert_eq!(sync_op.entity_type, CloudEntityType::Customer);
        assert_eq!(sync_op.entity_id, "456");
        assert_eq!(sync_op.operation, CloudOperation::Created);
        assert_eq!(sync_op.event_id, "event-123");
    }
    
    #[test]
    fn test_validate_cloudevents_signature() {
        let payload = b"test cloudevents payload";
        let verifier_token = "test_secret";
        
        // Generate valid signature
        let mut mac = HmacSha256::new_from_slice(verifier_token.as_bytes()).unwrap();
        mac.update(payload);
        let signature = mac.finalize().into_bytes();
        let signature_b64 = general_purpose::STANDARD.encode(&signature);
        
        // Validate
        let result = validate_cloudevents_signature(payload, &signature_b64, verifier_token);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }
}
