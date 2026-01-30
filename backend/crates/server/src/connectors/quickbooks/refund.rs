/**
 * QuickBooks Refund Operations
 * 
 * CRUD operations for QuickBooks refunds (CreditMemo for store credit, RefundReceipt for money-out)
 * 
 * Requirements: 11.6
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::QuickBooksClient;

/// QuickBooks CreditMemo (store credit refund)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QBCreditMemo {
    #[serde(rename = "Id")]
    pub id: Option<String>,
    
    #[serde(rename = "SyncToken")]
    pub sync_token: Option<String>,
    
    #[serde(rename = "DocNumber", skip_serializing_if = "Option::is_none")]
    pub doc_number: Option<String>,
    
    #[serde(rename = "TxnDate", skip_serializing_if = "Option::is_none")]
    pub txn_date: Option<String>,
    
    #[serde(rename = "CustomerRef")]
    pub customer_ref: CustomerRef,
    
    #[serde(rename = "Line")]
    pub line: Vec<Line>,
    
    #[serde(rename = "TotalAmt", skip_serializing_if = "Option::is_none")]
    pub total_amt: Option<f64>,
    
    #[serde(rename = "RemainingCredit", skip_serializing_if = "Option::is_none")]
    pub remaining_credit: Option<f64>,
    
    #[serde(rename = "CustomerMemo", skip_serializing_if = "Option::is_none")]
    pub customer_memo: Option<Memo>,
    
    #[serde(rename = "MetaData", skip_serializing_if = "Option::is_none")]
    pub meta_data: Option<MetaData>,
}

/// QuickBooks RefundReceipt (direct money-out refund)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QBRefundReceipt {
    #[serde(rename = "Id")]
    pub id: Option<String>,
    
    #[serde(rename = "SyncToken")]
    pub sync_token: Option<String>,
    
    #[serde(rename = "DocNumber", skip_serializing_if = "Option::is_none")]
    pub doc_number: Option<String>,
    
    #[serde(rename = "TxnDate", skip_serializing_if = "Option::is_none")]
    pub txn_date: Option<String>,
    
    #[serde(rename = "CustomerRef")]
    pub customer_ref: CustomerRef,
    
    #[serde(rename = "Line")]
    pub line: Vec<Line>,
    
    #[serde(rename = "TotalAmt", skip_serializing_if = "Option::is_none")]
    pub total_amt: Option<f64>,
    
    #[serde(rename = "PaymentMethodRef", skip_serializing_if = "Option::is_none")]
    pub payment_method_ref: Option<PaymentMethodRef>,
    
    #[serde(rename = "DepositToAccountRef", skip_serializing_if = "Option::is_none")]
    pub deposit_to_account_ref: Option<AccountRef>,
    
    #[serde(rename = "CustomerMemo", skip_serializing_if = "Option::is_none")]
    pub customer_memo: Option<Memo>,
    
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Line {
    #[serde(rename = "Id", skip_serializing_if = "Option::is_none")]
    pub id: Option<String>,
    
    #[serde(rename = "LineNum", skip_serializing_if = "Option::is_none")]
    pub line_num: Option<i32>,
    
    #[serde(rename = "Description", skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    
    #[serde(rename = "Amount")]
    pub amount: f64,
    
    #[serde(rename = "DetailType")]
    pub detail_type: String,
    
    #[serde(rename = "SalesItemLineDetail", skip_serializing_if = "Option::is_none")]
    pub sales_item_line_detail: Option<SalesItemLineDetail>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesItemLineDetail {
    #[serde(rename = "ItemRef")]
    pub item_ref: ItemRef,
    
    #[serde(rename = "UnitPrice", skip_serializing_if = "Option::is_none")]
    pub unit_price: Option<f64>,
    
    #[serde(rename = "Qty", skip_serializing_if = "Option::is_none")]
    pub qty: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemRef {
    #[serde(rename = "value")]
    pub value: String,
    
    #[serde(rename = "name", skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memo {
    #[serde(rename = "value")]
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaData {
    #[serde(rename = "CreateTime")]
    pub create_time: String,
    
    #[serde(rename = "LastUpdatedTime")]
    pub last_updated_time: String,
}

#[derive(Debug, Deserialize)]
pub struct CreditMemoResponse {
    #[serde(rename = "CreditMemo")]
    pub credit_memo: QBCreditMemo,
}

#[derive(Debug, Deserialize)]
pub struct RefundReceiptResponse {
    #[serde(rename = "RefundReceipt")]
    pub refund_receipt: QBRefundReceipt,
}

impl QuickBooksClient {
    /// Get credit memo by ID
    pub async fn get_credit_memo(&self, credit_memo_id: &str) -> Result<QBCreditMemo, ApiError> {
        let endpoint = format!("creditmemo/{}", credit_memo_id);
        let response = self.get(&endpoint).await?;
        
        let result: CreditMemoResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse credit memo response: {}", e)))?;
        
        Ok(result.credit_memo)
    }
    
    /// Create a new credit memo (store credit refund)
    /// 
    /// Requirements: 11.6
    pub async fn create_credit_memo(&self, credit_memo: &QBCreditMemo) -> Result<QBCreditMemo, ApiError> {
        // Validate required fields
        if credit_memo.customer_ref.value.is_empty() {
            return Err(ApiError::validation_msg("CustomerRef is required"));
        }
        
        if credit_memo.line.is_empty() {
            return Err(ApiError::validation_msg("At least one line item is required"));
        }
        
        let response = self.post("creditmemo", credit_memo).await?;
        
        let result: CreditMemoResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse credit memo response: {}", e)))?;
        
        Ok(result.credit_memo)
    }
    
    /// Update an existing credit memo
    pub async fn update_credit_memo(&self, credit_memo: &QBCreditMemo) -> Result<QBCreditMemo, ApiError> {
        if credit_memo.id.is_none() {
            return Err(ApiError::validation_msg("CreditMemo ID is required for update"));
        }
        
        if credit_memo.sync_token.is_none() {
            return Err(ApiError::validation_msg("SyncToken is required for update"));
        }
        
        let response = self.sparse_update("creditmemo", credit_memo).await?;
        
        let result: CreditMemoResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse credit memo response: {}", e)))?;
        
        Ok(result.credit_memo)
    }
    
    /// Get refund receipt by ID
    pub async fn get_refund_receipt(&self, refund_receipt_id: &str) -> Result<QBRefundReceipt, ApiError> {
        let endpoint = format!("refundreceipt/{}", refund_receipt_id);
        let response = self.get(&endpoint).await?;
        
        let result: RefundReceiptResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse refund receipt response: {}", e)))?;
        
        Ok(result.refund_receipt)
    }
    
    /// Create a new refund receipt (direct money-out refund)
    /// 
    /// Requirements: 11.6
    pub async fn create_refund_receipt(&self, refund_receipt: &QBRefundReceipt) -> Result<QBRefundReceipt, ApiError> {
        // Validate required fields
        if refund_receipt.customer_ref.value.is_empty() {
            return Err(ApiError::validation_msg("CustomerRef is required"));
        }
        
        if refund_receipt.line.is_empty() {
            return Err(ApiError::validation_msg("At least one line item is required"));
        }
        
        let response = self.post("refundreceipt", refund_receipt).await?;
        
        let result: RefundReceiptResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse refund receipt response: {}", e)))?;
        
        Ok(result.refund_receipt)
    }
    
    /// Update an existing refund receipt
    pub async fn update_refund_receipt(&self, refund_receipt: &QBRefundReceipt) -> Result<QBRefundReceipt, ApiError> {
        if refund_receipt.id.is_none() {
            return Err(ApiError::validation_msg("RefundReceipt ID is required for update"));
        }
        
        if refund_receipt.sync_token.is_none() {
            return Err(ApiError::validation_msg("SyncToken is required for update"));
        }
        
        let response = self.sparse_update("refundreceipt", refund_receipt).await?;
        
        let result: RefundReceiptResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse refund receipt response: {}", e)))?;
        
        Ok(result.refund_receipt)
    }
    
    /// Void a refund receipt
    pub async fn void_refund_receipt(&self, refund_receipt_id: &str, sync_token: &str) -> Result<(), ApiError> {
        let endpoint = format!("refundreceipt?operation=void");
        
        let void_request = serde_json::json!({
            "Id": refund_receipt_id,
            "SyncToken": sync_token
        });
        
        self.post(&endpoint, &void_request).await?;
        
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_credit_memo_serialization() {
        let credit_memo = QBCreditMemo {
            id: None,
            sync_token: None,
            doc_number: Some("CM-001".to_string()),
            txn_date: Some("2024-01-01".to_string()),
            customer_ref: CustomerRef {
                value: "123".to_string(),
                name: Some("John Doe".to_string()),
            },
            line: vec![],
            total_amt: Some(50.0),
            remaining_credit: Some(50.0),
            customer_memo: Some(Memo {
                value: "Store credit for return".to_string(),
            }),
            meta_data: None,
        };
        
        let json = serde_json::to_string(&credit_memo).unwrap();
        assert!(json.contains("CustomerRef"));
        assert!(json.contains("RemainingCredit"));
    }
    
    #[test]
    fn test_refund_receipt_serialization() {
        let refund_receipt = QBRefundReceipt {
            id: None,
            sync_token: None,
            doc_number: Some("RR-001".to_string()),
            txn_date: Some("2024-01-01".to_string()),
            customer_ref: CustomerRef {
                value: "123".to_string(),
                name: Some("John Doe".to_string()),
            },
            line: vec![],
            total_amt: Some(75.0),
            payment_method_ref: Some(PaymentMethodRef {
                value: "1".to_string(),
                name: Some("Cash".to_string()),
            }),
            deposit_to_account_ref: None,
            customer_memo: Some(Memo {
                value: "Cash refund for return".to_string(),
            }),
            meta_data: None,
        };
        
        let json = serde_json::to_string(&refund_receipt).unwrap();
        assert!(json.contains("CustomerRef"));
        assert!(json.contains("PaymentMethodRef"));
    }
}
