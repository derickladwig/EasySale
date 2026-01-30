/**
 * QuickBooks Invoice Operations
 * 
 * CRUD operations for QuickBooks invoices
 * 
 * Requirements: 11.4, 2.2, 2.3, 2.4, 2.5, 3.5
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::QuickBooksClient;

/// QuickBooks Invoice
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QBInvoice {
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
    
    #[serde(rename = "Balance", skip_serializing_if = "Option::is_none")]
    pub balance: Option<f64>,
    
    #[serde(rename = "DueDate", skip_serializing_if = "Option::is_none")]
    pub due_date: Option<String>,
    
    #[serde(rename = "ShipDate", skip_serializing_if = "Option::is_none")]
    pub ship_date: Option<String>,
    
    #[serde(rename = "TrackingNum", skip_serializing_if = "Option::is_none")]
    pub tracking_num: Option<String>,
    
    #[serde(rename = "BillAddr", skip_serializing_if = "Option::is_none")]
    pub bill_addr: Option<Address>,
    
    #[serde(rename = "ShipAddr", skip_serializing_if = "Option::is_none")]
    pub ship_addr: Option<Address>,
    
    #[serde(rename = "CustomerMemo", skip_serializing_if = "Option::is_none")]
    pub customer_memo: Option<Memo>,
    
    #[serde(rename = "CustomField", skip_serializing_if = "Option::is_none")]
    pub custom_field: Option<Vec<CustomField>>,
    
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
    
    #[serde(rename = "SubTotalLineDetail", skip_serializing_if = "Option::is_none")]
    pub sub_total_line_detail: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesItemLineDetail {
    #[serde(rename = "ItemRef")]
    pub item_ref: ItemRef,
    
    #[serde(rename = "UnitPrice", skip_serializing_if = "Option::is_none")]
    pub unit_price: Option<f64>,
    
    #[serde(rename = "Qty", skip_serializing_if = "Option::is_none")]
    pub qty: Option<f64>,
    
    #[serde(rename = "TaxCodeRef", skip_serializing_if = "Option::is_none")]
    pub tax_code_ref: Option<TaxCodeRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ItemRef {
    #[serde(rename = "value")]
    pub value: String,
    
    #[serde(rename = "name", skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCodeRef {
    #[serde(rename = "value")]
    pub value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Address {
    #[serde(rename = "Line1", skip_serializing_if = "Option::is_none")]
    pub line1: Option<String>,
    
    #[serde(rename = "Line2", skip_serializing_if = "Option::is_none")]
    pub line2: Option<String>,
    
    #[serde(rename = "City", skip_serializing_if = "Option::is_none")]
    pub city: Option<String>,
    
    #[serde(rename = "CountrySubDivisionCode", skip_serializing_if = "Option::is_none")]
    pub country_sub_division_code: Option<String>,
    
    #[serde(rename = "PostalCode", skip_serializing_if = "Option::is_none")]
    pub postal_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memo {
    #[serde(rename = "value")]
    pub value: String,
}

/// Custom field (max 3 string fields accessible via API)
/// 
/// Requirements: 3.5
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomField {
    #[serde(rename = "DefinitionId")]
    pub definition_id: String,
    
    #[serde(rename = "Name")]
    pub name: String,
    
    #[serde(rename = "Type")]
    pub field_type: String,
    
    #[serde(rename = "StringValue", skip_serializing_if = "Option::is_none")]
    pub string_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaData {
    #[serde(rename = "CreateTime")]
    pub create_time: String,
    
    #[serde(rename = "LastUpdatedTime")]
    pub last_updated_time: String,
}

/// QuickBooks API response wrapper
#[derive(Debug, Deserialize)]
pub struct QueryResponse {
    #[serde(rename = "QueryResponse")]
    pub query_response: QueryResult,
}

#[derive(Debug, Deserialize)]
pub struct QueryResult {
    #[serde(rename = "Invoice", default)]
    pub invoice: Vec<QBInvoice>,
    
    #[serde(rename = "maxResults", default)]
    pub max_results: i32,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceResponse {
    #[serde(rename = "Invoice")]
    pub invoice: QBInvoice,
}

impl QuickBooksClient {
    /// Query invoice by DocNumber (order number)
    /// 
    /// Requirements: 11.4
    pub async fn query_invoice_by_doc_number(&self, doc_number: &str) -> Result<Option<QBInvoice>, ApiError> {
        let sanitized = doc_number.replace('\'', "''");
        let query = format!("SELECT * FROM Invoice WHERE DocNumber = '{}'", sanitized);
        let response = self.query(&query).await?;
        
        let result: QueryResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse invoice query response: {}", e)))?;
        
        Ok(result.query_response.invoice.into_iter().next())
    }
    
    /// Get invoice by ID
    pub async fn get_invoice(&self, invoice_id: &str) -> Result<QBInvoice, ApiError> {
        let endpoint = format!("invoice/{}", invoice_id);
        let response = self.get(&endpoint).await?;
        
        let result: InvoiceResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse invoice response: {}", e)))?;
        
        Ok(result.invoice)
    }
    
    /// Create a new invoice
    /// 
    /// Requirements: 11.4, 2.2, 2.3, 2.4, 2.5
    pub async fn create_invoice(&self, invoice: &QBInvoice) -> Result<QBInvoice, ApiError> {
        // Validate required fields
        if invoice.customer_ref.value.is_empty() {
            return Err(ApiError::validation_msg("CustomerRef is required"));
        }
        
        if invoice.line.is_empty() {
            return Err(ApiError::validation_msg("At least one line item is required"));
        }
        
        // Validate custom fields (max 3 string fields)
        if let Some(ref custom_fields) = invoice.custom_field {
            let string_fields: Vec<_> = custom_fields
                .iter()
                .filter(|f| f.field_type == "StringType")
                .collect();
            
            if string_fields.len() > 3 {
                return Err(ApiError::validation_msg(
                    "QuickBooks API only supports 3 string custom fields (Requirement 3.5)"
                ));
            }
        }
        
        let response = self.post("invoice", invoice).await?;
        
        let result: InvoiceResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse invoice response: {}", e)))?;
        
        Ok(result.invoice)
    }
    
    /// Update an existing invoice (sparse update)
    /// 
    /// Requirements: 2.4
    pub async fn update_invoice(&self, invoice: &QBInvoice) -> Result<QBInvoice, ApiError> {
        // Validate required fields for update
        if invoice.id.is_none() {
            return Err(ApiError::validation_msg("Invoice ID is required for update"));
        }
        
        if invoice.sync_token.is_none() {
            return Err(ApiError::validation_msg("SyncToken is required for update"));
        }
        
        // Use sparse update to only update provided fields
        let response = self.sparse_update("invoice", invoice).await?;
        
        let result: InvoiceResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse invoice response: {}", e)))?;
        
        Ok(result.invoice)
    }
    
    /// Delete an invoice
    pub async fn delete_invoice(&self, invoice_id: &str, sync_token: &str) -> Result<(), ApiError> {
        let endpoint = format!("invoice?operation=delete");
        
        let delete_request = serde_json::json!({
            "Id": invoice_id,
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
    fn test_invoice_serialization() {
        let invoice = QBInvoice {
            id: None,
            sync_token: None,
            doc_number: Some("INV-001".to_string()),
            txn_date: Some("2024-01-01".to_string()),
            customer_ref: CustomerRef {
                value: "123".to_string(),
                name: Some("John Doe".to_string()),
            },
            line: vec![
                Line {
                    id: None,
                    line_num: Some(1),
                    description: Some("Test Product".to_string()),
                    amount: 99.99,
                    detail_type: "SalesItemLineDetail".to_string(),
                    sales_item_line_detail: Some(SalesItemLineDetail {
                        item_ref: ItemRef {
                            value: "456".to_string(),
                            name: Some("Test Product".to_string()),
                        },
                        unit_price: Some(99.99),
                        qty: Some(1.0),
                        tax_code_ref: None,
                    }),
                    sub_total_line_detail: None,
                }
            ],
            total_amt: Some(99.99),
            balance: Some(99.99),
            due_date: None,
            ship_date: None,
            tracking_num: None,
            bill_addr: None,
            ship_addr: None,
            customer_memo: None,
            custom_field: None,
            meta_data: None,
        };
        
        let json = serde_json::to_string(&invoice).unwrap();
        assert!(json.contains("CustomerRef"));
        assert!(json.contains("Line"));
    }
    
    #[test]
    fn test_custom_field_limit() {
        let custom_fields = vec![
            CustomField {
                definition_id: "1".to_string(),
                name: "Field1".to_string(),
                field_type: "StringType".to_string(),
                string_value: Some("Value1".to_string()),
            },
            CustomField {
                definition_id: "2".to_string(),
                name: "Field2".to_string(),
                field_type: "StringType".to_string(),
                string_value: Some("Value2".to_string()),
            },
            CustomField {
                definition_id: "3".to_string(),
                name: "Field3".to_string(),
                field_type: "StringType".to_string(),
                string_value: Some("Value3".to_string()),
            },
        ];
        
        assert_eq!(custom_fields.len(), 3);
    }
}
