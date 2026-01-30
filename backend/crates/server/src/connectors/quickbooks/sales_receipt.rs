/**
 * QuickBooks SalesReceipt Operations
 * 
 * CRUD operations for QuickBooks sales receipts (paid-in-full orders)
 * 
 * Requirements: 2.2, 11.6
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::QuickBooksClient;

/// QuickBooks SalesReceipt
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QBSalesReceipt {
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
    
    #[serde(rename = "BillAddr", skip_serializing_if = "Option::is_none")]
    pub bill_addr: Option<Address>,
    
    #[serde(rename = "ShipAddr", skip_serializing_if = "Option::is_none")]
    pub ship_addr: Option<Address>,
    
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
pub struct Address {
    #[serde(rename = "Line1", skip_serializing_if = "Option::is_none")]
    pub line1: Option<String>,
    
    #[serde(rename = "City", skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,
    
    #[serde(rename = "PostalCode", skip_serializing_if = "Option::is_none")]
    pub postal_code: Option<String>,
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
pub struct SalesReceiptResponse {
    #[serde(rename = "SalesReceipt")]
    pub sales_receipt: QBSalesReceipt,
}

impl QuickBooksClient {
    /// Get sales receipt by ID
    pub async fn get_sales_receipt(&self, sales_receipt_id: &str) -> Result<QBSalesReceipt, ApiError> {
        let endpoint = format!("salesreceipt/{}", sales_receipt_id);
        let response = self.get(&endpoint).await?;
        
        let result: SalesReceiptResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse sales receipt response: {}", e)))?;
        
        Ok(result.sales_receipt)
    }
    
    /// Create a new sales receipt (for paid-in-full orders)
    /// 
    /// Requirements: 2.2, 11.6
    pub async fn create_sales_receipt(&self, sales_receipt: &QBSalesReceipt) -> Result<QBSalesReceipt, ApiError> {
        // Validate required fields
        if sales_receipt.customer_ref.value.is_empty() {
            return Err(ApiError::validation_msg("CustomerRef is required"));
        }
        
        if sales_receipt.line.is_empty() {
            return Err(ApiError::validation_msg("At least one line item is required"));
        }
        
        let response = self.post("salesreceipt", sales_receipt).await?;
        
        let result: SalesReceiptResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse sales receipt response: {}", e)))?;
        
        Ok(result.sales_receipt)
    }
    
    /// Update an existing sales receipt
    pub async fn update_sales_receipt(&self, sales_receipt: &QBSalesReceipt) -> Result<QBSalesReceipt, ApiError> {
        if sales_receipt.id.is_none() {
            return Err(ApiError::validation_msg("SalesReceipt ID is required for update"));
        }
        
        if sales_receipt.sync_token.is_none() {
            return Err(ApiError::validation_msg("SyncToken is required for update"));
        }
        
        let response = self.sparse_update("salesreceipt", sales_receipt).await?;
        
        let result: SalesReceiptResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse sales receipt response: {}", e)))?;
        
        Ok(result.sales_receipt)
    }
    
    /// Void a sales receipt (for cancelled sales)
    /// 
    /// Requirements: 11.6
    pub async fn void_sales_receipt(&self, sales_receipt_id: &str, sync_token: &str) -> Result<(), ApiError> {
        let endpoint = format!("salesreceipt?operation=void");
        
        let void_request = serde_json::json!({
            "Id": sales_receipt_id,
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
    fn test_sales_receipt_serialization() {
        let sales_receipt = QBSalesReceipt {
            id: None,
            sync_token: None,
            doc_number: Some("SR-001".to_string()),
            txn_date: Some("2024-01-01".to_string()),
            customer_ref: CustomerRef {
                value: "123".to_string(),
                name: Some("John Doe".to_string()),
            },
            line: vec![],
            total_amt: Some(99.99),
            payment_method_ref: Some(PaymentMethodRef {
                value: "1".to_string(),
                name: Some("Cash".to_string()),
            }),
            deposit_to_account_ref: None,
            bill_addr: None,
            ship_addr: None,
            customer_memo: None,
            meta_data: None,
        };
        
        let json = serde_json::to_string(&sales_receipt).unwrap();
        assert!(json.contains("CustomerRef"));
    }
}
