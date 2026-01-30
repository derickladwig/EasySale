/**
 * QuickBooks Item Operations
 * 
 * CRUD operations for QuickBooks items (products/services)
 * 
 * Requirements: 11.3
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::QuickBooksClient;

/// QuickBooks Item Type
/// 
/// Note: Currently unused - reserved for future type-safe item creation.
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ItemType {
    Inventory,
    NonInventory,
    Service,
}

/// QuickBooks Item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QBItem {
    #[serde(rename = "Id")]
    pub id: Option<String>,
    
    #[serde(rename = "SyncToken")]
    pub sync_token: Option<String>,
    
    #[serde(rename = "Name")]
    pub name: String,
    
    #[serde(rename = "Sku", skip_serializing_if = "Option::is_none")]
    pub sku: Option<String>,
    
    #[serde(rename = "Type")]
    pub item_type: String,
    
    #[serde(rename = "Description", skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    
    #[serde(rename = "Active", skip_serializing_if = "Option::is_none")]
    pub active: Option<bool>,
    
    #[serde(rename = "UnitPrice", skip_serializing_if = "Option::is_none")]
    pub unit_price: Option<f64>,
    
    #[serde(rename = "PurchaseCost", skip_serializing_if = "Option::is_none")]
    pub purchase_cost: Option<f64>,
    
    #[serde(rename = "QtyOnHand", skip_serializing_if = "Option::is_none")]
    pub qty_on_hand: Option<f64>,
    
    #[serde(rename = "InvStartDate", skip_serializing_if = "Option::is_none")]
    pub inv_start_date: Option<String>,
    
    #[serde(rename = "IncomeAccountRef")]
    pub income_account_ref: AccountRef,
    
    #[serde(rename = "ExpenseAccountRef", skip_serializing_if = "Option::is_none")]
    pub expense_account_ref: Option<AccountRef>,
    
    #[serde(rename = "AssetAccountRef", skip_serializing_if = "Option::is_none")]
    pub asset_account_ref: Option<AccountRef>,
    
    #[serde(rename = "TrackQtyOnHand", skip_serializing_if = "Option::is_none")]
    pub track_qty_on_hand: Option<bool>,
    
    #[serde(rename = "MetaData", skip_serializing_if = "Option::is_none")]
    pub meta_data: Option<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AccountRef {
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

/// QuickBooks API response wrapper
#[derive(Debug, Deserialize)]
pub struct QueryResponse {
    #[serde(rename = "QueryResponse")]
    pub query_response: QueryResult,
}

#[derive(Debug, Deserialize)]
pub struct QueryResult {
    #[serde(rename = "Item", default)]
    pub item: Vec<QBItem>,
    
    #[serde(rename = "maxResults", default)]
    pub max_results: i32,
}

#[derive(Debug, Deserialize)]
pub struct ItemResponse {
    #[serde(rename = "Item")]
    pub item: QBItem,
}

impl QuickBooksClient {
    /// Query item by SKU
    /// 
    /// Requirements: 11.3
    pub async fn query_item_by_sku(&self, sku: &str) -> Result<Option<QBItem>, ApiError> {
        let sanitized = sku.replace('\'', "''");
        let query = format!("SELECT * FROM Item WHERE Sku = '{}'", sanitized);
        let response = self.query(&query).await?;
        
        let result: QueryResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse item query response: {}", e)))?;
        
        Ok(result.query_response.item.into_iter().next())
    }
    
    /// Query item by name
    pub async fn query_item_by_name(&self, name: &str) -> Result<Option<QBItem>, ApiError> {
        let sanitized = name.replace('\'', "''");
        let query = format!("SELECT * FROM Item WHERE Name = '{}'", sanitized);
        let response = self.query(&query).await?;
        
        let result: QueryResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse item query response: {}", e)))?;
        
        Ok(result.query_response.item.into_iter().next())
    }
    
    /// Get item by ID
    pub async fn get_item(&self, item_id: &str) -> Result<QBItem, ApiError> {
        let endpoint = format!("item/{}", item_id);
        let response = self.get(&endpoint).await?;
        
        let result: ItemResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse item response: {}", e)))?;
        
        Ok(result.item)
    }
    
    /// Create a new item
    /// 
    /// Requirements: 11.3
    pub async fn create_item(&self, item: &QBItem) -> Result<QBItem, ApiError> {
        // Validate required fields
        if item.name.is_empty() {
            return Err(ApiError::validation_msg("Name is required"));
        }
        
        if item.name.len() > 100 {
            return Err(ApiError::validation_msg("Name must be 100 characters or less"));
        }
        
        // Validate that income account exists
        // TODO: Add account validation
        
        // Name must be unique - check if it already exists
        if let Some(existing) = self.query_item_by_name(&item.name).await? {
            return Err(ApiError::validation_msg(&format!(
                "Item with Name '{}' already exists (ID: {})",
                item.name,
                existing.id.unwrap_or_default()
            )));
        }
        
        let response = self.post("item", item).await?;
        
        let result: ItemResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse item response: {}", e)))?;
        
        Ok(result.item)
    }
    
    /// Update an existing item (sparse update)
    pub async fn update_item(&self, item: &QBItem) -> Result<QBItem, ApiError> {
        // Validate required fields for update
        if item.id.is_none() {
            return Err(ApiError::validation_msg("Item ID is required for update"));
        }
        
        if item.sync_token.is_none() {
            return Err(ApiError::validation_msg("SyncToken is required for update"));
        }
        
        // Use sparse update to only update provided fields
        let response = self.sparse_update("item", item).await?;
        
        let result: ItemResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse item response: {}", e)))?;
        
        Ok(result.item)
    }
    
    /// Soft delete an item (set Active = false)
    pub async fn deactivate_item(&self, item_id: &str) -> Result<QBItem, ApiError> {
        // First, get the current item to get the SyncToken
        let mut item = self.get_item(item_id).await?;
        
        // Set Active to false
        item.active = Some(false);
        
        // Update the item
        self.update_item(&item).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_item_serialization() {
        let item = QBItem {
            id: Some("123".to_string()),
            sync_token: Some("0".to_string()),
            name: "Test Product".to_string(),
            sku: Some("TEST-SKU".to_string()),
            item_type: "Inventory".to_string(),
            description: Some("Test description".to_string()),
            active: Some(true),
            unit_price: Some(99.99),
            purchase_cost: Some(50.00),
            qty_on_hand: Some(10.0),
            inv_start_date: None,
            income_account_ref: AccountRef {
                value: "79".to_string(),
                name: Some("Sales".to_string()),
            },
            expense_account_ref: None,
            asset_account_ref: None,
            track_qty_on_hand: Some(true),
            meta_data: None,
        };
        
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("Name"));
        assert!(json.contains("Test Product"));
    }
    
    #[test]
    fn test_item_name_validation() {
        let long_name = "a".repeat(101);
        assert!(long_name.len() > 100);
    }
}
