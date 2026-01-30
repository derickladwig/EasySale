/**
 * QuickBooks Online Webhook Handler
 * 
 * Handles incoming webhooks from QuickBooks Online in the current format.
 * Validates intuit-signature header (HMAC-SHA256) and queues sync operations.
 * 
 * Requirements: 11.8, 10.5, 5.5, 5.6
 * 
 * Webhook Format (Current):
 * {
 *   "eventNotifications": [
 *     {
 *       "realmId": "123456789",
 *       "dataChangeEvent": {
 *         "entities": [
 *           {
 *             "name": "Customer",
 *             "id": "1",
 *             "operation": "Create",
 *             "lastUpdated": "2024-01-01T12:00:00Z"
 *           }
 *         ]
 *       }
 *     }
 *   ]
 * }
 */

use serde::{Deserialize, Serialize};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use base64::{Engine as _, engine::general_purpose};

use crate::models::ApiError;

type HmacSha256 = Hmac<Sha256>;

// ============================================================================
// Webhook Payload Structures (Current Format)
// ============================================================================

/// Root webhook payload from QuickBooks
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QBWebhookPayload {
    pub event_notifications: Vec<EventNotification>,
}

/// Event notification for a specific realm (company)
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EventNotification {
    pub realm_id: String,
    pub data_change_event: DataChangeEvent,
}

/// Data change event containing entity changes
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DataChangeEvent {
    pub entities: Vec<EntityChange>,
}

/// Individual entity change
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub struct EntityChange {
    pub name: String,           // "Customer", "Invoice", "Item", etc.
    pub id: String,             // Entity ID
    pub operation: String,      // "Create", "Update", "Delete", "Merge", "Void"
    pub last_updated: String,   // ISO 8601 timestamp
}

// ============================================================================
// Webhook Signature Validation
// ============================================================================

/// Validate QuickBooks webhook signature
/// 
/// QuickBooks uses HMAC-SHA256 with the webhook verifier token.
/// The signature is sent in the `intuit-signature` header as base64.
/// 
/// Requirements: 10.5, 11.8
pub fn validate_qb_signature(
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
// Webhook Event Parsing
// ============================================================================

/// Parse QuickBooks webhook payload
pub fn parse_qb_webhook(payload: &[u8]) -> Result<QBWebhookPayload, ApiError> {
    serde_json::from_slice(payload)
        .map_err(|e| ApiError::validation_msg(&format!("Invalid webhook payload: {}", e)))
}

/// Extract entity type and operation from webhook
pub fn parse_entity_change(entity: &EntityChange) -> Result<(QBEntityType, QBOperation), ApiError> {
    let entity_type = match entity.name.as_str() {
        "Customer" => QBEntityType::Customer,
        "Invoice" => QBEntityType::Invoice,
        "Item" => QBEntityType::Item,
        "Payment" => QBEntityType::Payment,
        "SalesReceipt" => QBEntityType::SalesReceipt,
        "CreditMemo" => QBEntityType::CreditMemo,
        "RefundReceipt" => QBEntityType::RefundReceipt,
        "Vendor" => QBEntityType::Vendor,
        "Bill" => QBEntityType::Bill,
        "Purchase" => QBEntityType::Purchase,
        "VendorCredit" => QBEntityType::VendorCredit,
        other => return Err(ApiError::validation_msg(&format!("Unsupported entity type: {}", other))),
    };
    
    let operation = match entity.operation.as_str() {
        "Create" => QBOperation::Create,
        "Update" => QBOperation::Update,
        "Delete" => QBOperation::Delete,
        "Merge" => QBOperation::Merge,
        "Void" => QBOperation::Void,
        other => return Err(ApiError::validation_msg(&format!("Unsupported operation: {}", other))),
    };
    
    Ok((entity_type, operation))
}

// ============================================================================
// Entity Types and Operations
// ============================================================================

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum QBEntityType {
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

impl QBEntityType {
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
pub enum QBOperation {
    Create,
    Update,
    Delete,
    Merge,
    Void,
}

impl QBOperation {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Create => "create",
            Self::Update => "update",
            Self::Delete => "delete",
            Self::Merge => "merge",
            Self::Void => "void",
        }
    }
}

// ============================================================================
// Sync Queue Integration
// ============================================================================

/// Sync operation to be queued
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QBSyncOperation {
    pub realm_id: String,
    pub entity_type: QBEntityType,
    pub entity_id: String,
    pub operation: QBOperation,
    pub last_updated: String,
}

impl QBSyncOperation {
    pub fn from_entity_change(realm_id: String, entity: &EntityChange) -> Result<Self, ApiError> {
        let (entity_type, operation) = parse_entity_change(entity)?;
        
        Ok(Self {
            realm_id,
            entity_type,
            entity_id: entity.id.clone(),
            operation,
            last_updated: entity.last_updated.clone(),
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
    fn test_parse_qb_webhook() {
        let payload = r#"{
            "eventNotifications": [
                {
                    "realmId": "123456789",
                    "dataChangeEvent": {
                        "entities": [
                            {
                                "name": "Customer",
                                "id": "1",
                                "operation": "Create",
                                "lastUpdated": "2024-01-01T12:00:00Z"
                            }
                        ]
                    }
                }
            ]
        }"#;
        
        let result = parse_qb_webhook(payload.as_bytes());
        assert!(result.is_ok());
        
        let webhook = result.unwrap();
        assert_eq!(webhook.event_notifications.len(), 1);
        assert_eq!(webhook.event_notifications[0].realm_id, "123456789");
        assert_eq!(webhook.event_notifications[0].data_change_event.entities.len(), 1);
        
        let entity = &webhook.event_notifications[0].data_change_event.entities[0];
        assert_eq!(entity.name, "Customer");
        assert_eq!(entity.id, "1");
        assert_eq!(entity.operation, "Create");
    }
    
    #[test]
    fn test_parse_entity_change() {
        let entity = EntityChange {
            name: "Invoice".to_string(),
            id: "42".to_string(),
            operation: "Update".to_string(),
            last_updated: "2024-01-01T12:00:00Z".to_string(),
        };
        
        let result = parse_entity_change(&entity);
        assert!(result.is_ok());
        
        let (entity_type, operation) = result.unwrap();
        assert_eq!(entity_type, QBEntityType::Invoice);
        assert_eq!(operation, QBOperation::Update);
    }
    
    #[test]
    fn test_unsupported_entity_type() {
        let entity = EntityChange {
            name: "UnsupportedEntity".to_string(),
            id: "1".to_string(),
            operation: "Create".to_string(),
            last_updated: "2024-01-01T12:00:00Z".to_string(),
        };
        
        let result = parse_entity_change(&entity);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_validate_qb_signature() {
        let payload = b"test payload";
        let verifier_token = "test_secret";
        
        // Generate valid signature
        let mut mac = HmacSha256::new_from_slice(verifier_token.as_bytes()).unwrap();
        mac.update(payload);
        let signature = mac.finalize().into_bytes();
        let signature_b64 = general_purpose::STANDARD.encode(&signature);
        
        // Validate
        let result = validate_qb_signature(payload, &signature_b64, verifier_token);
        assert!(result.is_ok());
        assert!(result.unwrap());
    }
    
    #[test]
    fn test_invalid_signature() {
        let payload = b"test payload";
        let verifier_token = "test_secret";
        let invalid_signature = "invalid_signature_base64";
        
        let result = validate_qb_signature(payload, invalid_signature, verifier_token);
        // Should fail to decode or verify
        assert!(result.is_err() || !result.unwrap());
    }
    
    #[test]
    fn test_sync_operation_from_entity_change() {
        let entity = EntityChange {
            name: "Customer".to_string(),
            id: "123".to_string(),
            operation: "Create".to_string(),
            last_updated: "2024-01-01T12:00:00Z".to_string(),
        };
        
        let result = QBSyncOperation::from_entity_change("realm123".to_string(), &entity);
        assert!(result.is_ok());
        
        let sync_op = result.unwrap();
        assert_eq!(sync_op.realm_id, "realm123");
        assert_eq!(sync_op.entity_type, QBEntityType::Customer);
        assert_eq!(sync_op.entity_id, "123");
        assert_eq!(sync_op.operation, QBOperation::Create);
    }
}
