/**
 * QuickBooks Payment Operations
 * 
 * CRUD operations for QuickBooks payments (linked to invoices)
 * 
 * Requirements: 11.5
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::QuickBooksClient;

/// QuickBooks Payment
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QBPayment {
    #[serde(rename = "Id")]
    pub id: Option<String>,
    
    #[serde(rename = "SyncToken")]
    pub sync_token: Option<String>,
    
    #[serde(rename = "TxnDate", skip_serializing_if = "Option::is_none")]
    pub txn_date: Option<String>,
    
    #[serde(rename = "CustomerRef")]
    pub customer_ref: CustomerRef,
    
    #[serde(rename = "TotalAmt")]
    pub total_amt: f64,
    
    #[serde(rename = "UnappliedAmt", skip_serializing_if = "Option::is_none")]
    pub unapplied_amt: Option<f64>,
    
    #[serde(rename = "PaymentMethodRef", skip_serializing_if = "Option::is_none")]
    pub payment_method_ref: Option<PaymentMethodRef>,
    
    #[serde(rename = "DepositToAccountRef", skip_serializing_if = "Option::is_none")]
    pub deposit_to_account_ref: Option<AccountRef>,
    
    #[serde(rename = "Line", skip_serializing_if = "Option::is_none")]
    pub line: Option<Vec<PaymentLine>>,
    
    #[serde(rename = "PrivateNote", skip_serializing_if = "Option::is_none")]
    pub private_note: Option<String>,
    
    #[serde(rename = "MetaData", skip_serializing_if = "Option::is_none")]
    pub meta_data: Option<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerRef {
    #[serde(rename = "value")]
    pub value: String,
    
    #[serde(rename = "name", skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentMethodRef {
    #[serde(rename = "value")]
    pub value: String,
    
    #[serde(rename = "name", skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountRef {
    #[serde(rename = "value")]
    pub value: String,
    
    #[serde(rename = "name", skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

/// Payment line linking to invoice
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaymentLine {
    #[serde(rename = "Amount")]
    pub amount: f64,
    
    #[serde(rename = "LinkedTxn")]
    pub linked_txn: Vec<LinkedTxn>,
}

/// Linked transaction (invoice)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LinkedTxn {
    #[serde(rename = "TxnId")]
    pub txn_id: String,
    
    #[serde(rename = "TxnType")]
    pub txn_type: String, // "Invoice"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaData {
    #[serde(rename = "CreateTime")]
    pub create_time: String,
    
    #[serde(rename = "LastUpdatedTime")]
    pub last_updated_time: String,
}

#[derive(Debug, Deserialize)]
pub struct PaymentResponse {
    #[serde(rename = "Payment")]
    pub payment: QBPayment,
}

#[derive(Debug, Deserialize)]
pub struct QueryResponse {
    #[serde(rename = "QueryResponse")]
    pub query_response: QueryResult,
}

#[derive(Debug, Deserialize)]
pub struct QueryResult {
    #[serde(rename = "Payment", default)]
    pub payment: Vec<QBPayment>,
    
    #[serde(rename = "maxResults", default)]
    pub max_results: i32,
}

impl QuickBooksClient {
    /// Get payment by ID
    pub async fn get_payment(&self, payment_id: &str) -> Result<QBPayment, ApiError> {
        let endpoint = format!("payment/{}", payment_id);
        let response = self.get(&endpoint).await?;
        
        let result: PaymentResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse payment response: {}", e)))?;
        
        Ok(result.payment)
    }
    
    /// Query payments by customer
    pub async fn query_payments_by_customer(&self, customer_id: &str) -> Result<Vec<QBPayment>, ApiError> {
        let sanitized = customer_id.replace('\'', "''");
        let query = format!("SELECT * FROM Payment WHERE CustomerRef = '{}'", sanitized);
        let response = self.query(&query).await?;
        
        let result: QueryResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse payment query response: {}", e)))?;
        
        Ok(result.query_response.payment)
    }
    
    /// Create a new payment (linked to invoice)
    /// 
    /// Requirements: 11.5
    pub async fn create_payment(&self, payment: &QBPayment) -> Result<QBPayment, ApiError> {
        // Validate required fields
        if payment.customer_ref.value.is_empty() {
            return Err(ApiError::validation_msg("CustomerRef is required"));
        }
        
        if payment.total_amt <= 0.0 {
            return Err(ApiError::validation_msg("TotalAmt must be positive"));
        }
        
        // Validate linked transactions if provided
        if let Some(ref lines) = payment.line {
            for line in lines {
                if line.linked_txn.is_empty() {
                    return Err(ApiError::validation_msg("Payment line must have at least one LinkedTxn"));
                }
                
                for linked_txn in &line.linked_txn {
                    if linked_txn.txn_type != "Invoice" {
                        return Err(ApiError::validation_msg("Payment can only be linked to Invoice transactions"));
                    }
                }
            }
        }
        
        let response = self.post("payment", payment).await?;
        
        let result: PaymentResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse payment response: {}", e)))?;
        
        Ok(result.payment)
    }
    
    /// Update an existing payment
    pub async fn update_payment(&self, payment: &QBPayment) -> Result<QBPayment, ApiError> {
        if payment.id.is_none() {
            return Err(ApiError::validation_msg("Payment ID is required for update"));
        }
        
        if payment.sync_token.is_none() {
            return Err(ApiError::validation_msg("SyncToken is required for update"));
        }
        
        let response = self.sparse_update("payment", payment).await?;
        
        let result: PaymentResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse payment response: {}", e)))?;
        
        Ok(result.payment)
    }
    
    /// Delete a payment
    pub async fn delete_payment(&self, payment_id: &str, sync_token: &str) -> Result<(), ApiError> {
        let endpoint = format!("payment?operation=delete");
        
        let delete_request = serde_json::json!({
            "Id": payment_id,
            "SyncToken": sync_token
        });
        
        self.post(&endpoint, &delete_request).await?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_payment_serialization() {
        let payment = QBPayment {
            id: None,
            sync_token: None,
            txn_date: Some("2024-01-01".to_string()),
            customer_ref: CustomerRef {
                value: "123".to_string(),
                name: Some("John Doe".to_string()),
            },
            total_amt: 100.0,
            unapplied_amt: Some(0.0),
            payment_method_ref: Some(PaymentMethodRef {
                value: "1".to_string(),
                name: Some("Cash".to_string()),
            }),
            deposit_to_account_ref: None,
            line: Some(vec![
                PaymentLine {
                    amount: 100.0,
                    linked_txn: vec![
                        LinkedTxn {
                            txn_id: "456".to_string(),
                            txn_type: "Invoice".to_string(),
                        }
                    ],
                }
            ]),
            private_note: None,
            meta_data: None,
        };
        
        let json = serde_json::to_string(&payment).unwrap();
        assert!(json.contains("CustomerRef"));
        assert!(json.contains("LinkedTxn"));
    }
    
    #[test]
    fn test_partial_payment() {
        let payment = QBPayment {
            id: None,
            sync_token: None,
            txn_date: Some("2024-01-01".to_string()),
            customer_ref: CustomerRef {
                value: "123".to_string(),
                name: None,
            },
            total_amt: 50.0,
            unapplied_amt: Some(0.0),
            payment_method_ref: None,
            deposit_to_account_ref: None,
            line: Some(vec![
                PaymentLine {
                    amount: 30.0,
                    linked_txn: vec![
                        LinkedTxn {
                            txn_id: "INV-001".to_string(),
                            txn_type: "Invoice".to_string(),
                        }
                    ],
                },
                PaymentLine {
                    amount: 20.0,
                    linked_txn: vec![
                        LinkedTxn {
                            txn_id: "INV-002".to_string(),
                            txn_type: "Invoice".to_string(),
                        }
                    ],
                }
            ]),
            private_note: Some("Partial payment for multiple invoices".to_string()),
            meta_data: None,
        };
        
        assert_eq!(payment.total_amt, 50.0);
        assert_eq!(payment.line.as_ref().unwrap().len(), 2);
    }
}
