/**
 * QuickBooks Bill Operations
 * 
 * CRUD operations for QuickBooks bills (vendor invoices)
 * 
 * Requirements: 11.6, 2.2
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::QuickBooksClient;

/// QuickBooks Bill
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QBBill {
    #[serde(rename = "Id")]
    pub id: Option<String>,
    
    #[serde(rename = "SyncToken")]
    pub sync_token: Option<String>,
    
    #[serde(rename = "DocNumber", skip_serializing_if = "Option::is_none")]
    pub doc_number: Option<String>,
    
    #[serde(rename = "TxnDate", skip_serializing_if = "Option::is_none")]
    pub txn_date: Option<String>,
    
    #[serde(rename = "DueDate", skip_serializing_if = "Option::is_none")]
    pub due_date: Option<String>,
    
    #[serde(rename = "VendorRef")]
    pub vendor_ref: VendorRef,
    
    #[serde(rename = "Line")]
    pub line: Vec<Line>,
    
    #[serde(rename = "TotalAmt", skip_serializing_if = "Option::is_none")]
    pub total_amt: Option<f64>,
    
    #[serde(rename = "Balance", skip_serializing_if = "Option::is_none")]
    pub balance: Option<f64>,
    
    #[serde(rename = "APAccountRef", skip_serializing_if = "Option::is_none")]
    pub ap_account_ref: Option<AccountRef>,
    
    #[serde(rename = "PrivateNote", skip_serializing_if = "Option::is_none")]
    pub private_note: Option<String>,
    
    #[serde(rename = "MetaData", skip_serializing_if = "Option::is_none")]
    pub meta_data: Option<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VendorRef {
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
    
    #[serde(rename = "ItemBasedExpenseLineDetail", skip_serializing_if = "Option::is_none")]
    pub item_based_expense_line_detail: Option<ItemBasedExpenseLineDetail>,
    
    #[serde(rename = "AccountBasedExpenseLineDetail", skip_serializing_if = "Option::is_none")]
    pub account_based_expense_line_detail: Option<AccountBasedExpenseLineDetail>,
}

/// Item-based expense line (for inventory items)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemBasedExpenseLineDetail {
    #[serde(rename = "ItemRef")]
    pub item_ref: ItemRef,
    
    #[serde(rename = "UnitPrice", skip_serializing_if = "Option::is_none")]
    pub unit_price: Option<f64>,
    
    #[serde(rename = "Qty", skip_serializing_if = "Option::is_none")]
    pub qty: Option<f64>,
    
    #[serde(rename = "CustomerRef", skip_serializing_if = "Option::is_none")]
    pub customer_ref: Option<CustomerRef>,
    
    #[serde(rename = "BillableStatus", skip_serializing_if = "Option::is_none")]
    pub billable_status: Option<String>,
}

/// Account-based expense line (for non-inventory expenses)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountBasedExpenseLineDetail {
    #[serde(rename = "AccountRef")]
    pub account_ref: AccountRef,
    
    #[serde(rename = "CustomerRef", skip_serializing_if = "Option::is_none")]
    pub customer_ref: Option<CustomerRef>,
    
    #[serde(rename = "BillableStatus", skip_serializing_if = "Option::is_none")]
    pub billable_status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemRef {
    #[serde(rename = "value")]
    pub value: String,
    
    #[serde(rename = "name", skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomerRef {
    #[serde(rename = "value")]
    pub value: String,
    
    #[serde(rename = "name", skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaData {
    #[serde(rename = "CreateTime")]
    pub create_time: String,
    
    #[serde(rename = "LastUpdatedTime")]
    pub last_updated_time: String,
}

#[derive(Debug, Deserialize)]
pub struct BillResponse {
    #[serde(rename = "Bill")]
    pub bill: QBBill,
}

#[derive(Debug, Deserialize)]
pub struct QueryResponse {
    #[serde(rename = "QueryResponse")]
    pub query_response: QueryResult,
}

#[derive(Debug, Deserialize)]
pub struct QueryResult {
    #[serde(rename = "Bill", default)]
    pub bill: Vec<QBBill>,
    
    #[serde(rename = "maxResults", default)]
    pub max_results: i32,
}

impl QuickBooksClient {
    /// Get bill by ID
    pub async fn get_bill(&self, bill_id: &str) -> Result<QBBill, ApiError> {
        let endpoint = format!("bill/{}", bill_id);
        let response = self.get(&endpoint).await?;
        
        let result: BillResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse bill response: {}", e)))?;
        
        Ok(result.bill)
    }
    
    /// Query bills by vendor
    /// 
    /// Requirements: 11.6
    pub async fn query_bills_by_vendor(&self, vendor_id: &str) -> Result<Vec<QBBill>, ApiError> {
        let sanitized = vendor_id.replace('\'', "''");
        let query = format!("SELECT * FROM Bill WHERE VendorRef = '{}'", sanitized);
        let response = self.query(&query).await?;
        
        let result: QueryResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse bill query response: {}", e)))?;
        
        Ok(result.query_response.bill)
    }
    
    /// Query bill by DocNumber
    pub async fn query_bill_by_doc_number(&self, doc_number: &str) -> Result<Option<QBBill>, ApiError> {
        let sanitized = doc_number.replace('\'', "''");
        let query = format!("SELECT * FROM Bill WHERE DocNumber = '{}'", sanitized);
        let response = self.query(&query).await?;
        
        let result: QueryResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse bill query response: {}", e)))?;
        
        Ok(result.query_response.bill.into_iter().next())
    }
    
    /// Create a new bill
    /// 
    /// Requirements: 11.6, 2.2
    pub async fn create_bill(&self, bill: &QBBill) -> Result<QBBill, ApiError> {
        // Validate required fields
        if bill.vendor_ref.value.is_empty() {
            return Err(ApiError::validation_msg("VendorRef is required"));
        }
        
        if bill.line.is_empty() {
            return Err(ApiError::validation_msg("At least one line item is required"));
        }
        
        // Validate line items
        for line in &bill.line {
            match line.detail_type.as_str() {
                "ItemBasedExpenseLineDetail" => {
                    if line.item_based_expense_line_detail.is_none() {
                        return Err(ApiError::validation_msg(
                            "ItemBasedExpenseLineDetail is required for ItemBasedExpenseLineDetail type"
                        ));
                    }
                }
                "AccountBasedExpenseLineDetail" => {
                    if line.account_based_expense_line_detail.is_none() {
                        return Err(ApiError::validation_msg(
                            "AccountBasedExpenseLineDetail is required for AccountBasedExpenseLineDetail type"
                        ));
                    }
                }
                _ => {
                    return Err(ApiError::validation_msg(&format!(
                        "Invalid DetailType: {}. Must be ItemBasedExpenseLineDetail or AccountBasedExpenseLineDetail",
                        line.detail_type
                    )));
                }
            }
        }
        
        let response = self.post("bill", bill).await?;
        
        let result: BillResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse bill response: {}", e)))?;
        
        Ok(result.bill)
    }
    
    /// Update an existing bill
    pub async fn update_bill(&self, bill: &QBBill) -> Result<QBBill, ApiError> {
        if bill.id.is_none() {
            return Err(ApiError::validation_msg("Bill ID is required for update"));
        }
        
        if bill.sync_token.is_none() {
            return Err(ApiError::validation_msg("SyncToken is required for update"));
        }
        
        let response = self.sparse_update("bill", bill).await?;
        
        let result: BillResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse bill response: {}", e)))?;
        
        Ok(result.bill)
    }
    
    /// Delete a bill
    pub async fn delete_bill(&self, bill_id: &str, sync_token: &str) -> Result<(), ApiError> {
        let endpoint = format!("bill?operation=delete");
        
        let delete_request = serde_json::json!({
            "Id": bill_id,
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
    fn test_bill_with_item_line_serialization() {
        let bill = QBBill {
            id: None,
            sync_token: None,
            doc_number: Some("BILL-001".to_string()),
            txn_date: Some("2024-01-01".to_string()),
            due_date: Some("2024-01-31".to_string()),
            vendor_ref: VendorRef {
                value: "123".to_string(),
                name: Some("Acme Supplies".to_string()),
            },
            line: vec![
                Line {
                    id: None,
                    line_num: Some(1),
                    description: Some("Widget purchase".to_string()),
                    amount: 100.0,
                    detail_type: "ItemBasedExpenseLineDetail".to_string(),
                    item_based_expense_line_detail: Some(ItemBasedExpenseLineDetail {
                        item_ref: ItemRef {
                            value: "456".to_string(),
                            name: Some("Widget".to_string()),
                        },
                        unit_price: Some(10.0),
                        qty: Some(10.0),
                        customer_ref: None,
                        billable_status: None,
                    }),
                    account_based_expense_line_detail: None,
                }
            ],
            total_amt: Some(100.0),
            balance: Some(100.0),
            ap_account_ref: None,
            private_note: None,
            meta_data: None,
        };
        
        let json = serde_json::to_string(&bill).unwrap();
        assert!(json.contains("VendorRef"));
        assert!(json.contains("ItemBasedExpenseLineDetail"));
    }
    
    #[test]
    fn test_bill_with_account_line_serialization() {
        let bill = QBBill {
            id: None,
            sync_token: None,
            doc_number: Some("BILL-002".to_string()),
            txn_date: Some("2024-01-01".to_string()),
            due_date: Some("2024-01-31".to_string()),
            vendor_ref: VendorRef {
                value: "123".to_string(),
                name: Some("Office Supplies Inc".to_string()),
            },
            line: vec![
                Line {
                    id: None,
                    line_num: Some(1),
                    description: Some("Office supplies".to_string()),
                    amount: 50.0,
                    detail_type: "AccountBasedExpenseLineDetail".to_string(),
                    item_based_expense_line_detail: None,
                    account_based_expense_line_detail: Some(AccountBasedExpenseLineDetail {
                        account_ref: AccountRef {
                            value: "789".to_string(),
                            name: Some("Office Expense".to_string()),
                        },
                        customer_ref: None,
                        billable_status: None,
                    }),
                }
            ],
            total_amt: Some(50.0),
            balance: Some(50.0),
            ap_account_ref: None,
            private_note: Some("Monthly office supplies".to_string()),
            meta_data: None,
        };
        
        let json = serde_json::to_string(&bill).unwrap();
        assert!(json.contains("VendorRef"));
        assert!(json.contains("AccountBasedExpenseLineDetail"));
    }
}
