/**
 * QuickBooks Customer Operations
 * 
 * CRUD operations for QuickBooks customers
 * 
 * Requirements: 11.2, 2.4
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::QuickBooksClient;

/// QuickBooks Customer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QBCustomer {
    #[serde(rename = "Id")]
    pub id: Option<String>,
    
    #[serde(rename = "SyncToken")]
    pub sync_token: Option<String>,
    
    #[serde(rename = "DisplayName")]
    pub display_name: String,
    
    #[serde(rename = "GivenName", skip_serializing_if = "Option::is_none")]
    pub given_name: Option<String>,
    
    #[serde(rename = "FamilyName", skip_serializing_if = "Option::is_none")]
    pub family_name: Option<String>,
    
    #[serde(rename = "CompanyName", skip_serializing_if = "Option::is_none")]
    pub company_name: Option<String>,
    
    #[serde(rename = "PrimaryEmailAddr", skip_serializing_if = "Option::is_none")]
    pub primary_email_addr: Option<EmailAddress>,
    
    #[serde(rename = "PrimaryPhone", skip_serializing_if = "Option::is_none")]
    pub primary_phone: Option<PhoneNumber>,
    
    #[serde(rename = "BillAddr", skip_serializing_if = "Option::is_none")]
    pub bill_addr: Option<Address>,
    
    #[serde(rename = "ShipAddr", skip_serializing_if = "Option::is_none")]
    pub ship_addr: Option<Address>,
    
    #[serde(rename = "Active", skip_serializing_if = "Option::is_none")]
    pub active: Option<bool>,
    
    #[serde(rename = "MetaData", skip_serializing_if = "Option::is_none")]
    pub meta_data: Option<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailAddress {
    #[serde(rename = "Address")]
    pub address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PhoneNumber {
    #[serde(rename = "FreeFormNumber")]
    pub free_form_number: String,
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
    
    #[serde(rename = "Country", skip_serializing_if = "Option::is_none")]
    pub country: Option<String>,
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
    #[serde(rename = "Customer", default)]
    pub customer: Vec<QBCustomer>,
    
    #[serde(rename = "maxResults", default)]
    pub max_results: i32,
}

#[derive(Debug, Deserialize)]
pub struct CustomerResponse {
    #[serde(rename = "Customer")]
    pub customer: QBCustomer,
}

impl QuickBooksClient {
    /// Query customer by email
    /// 
    /// Requirements: 11.2
    pub async fn query_customer_by_email(&self, email: &str) -> Result<Option<QBCustomer>, ApiError> {
        let sanitized = email.replace('\'', "''");
        let query = format!("SELECT * FROM Customer WHERE PrimaryEmailAddr = '{}'", sanitized);
        let response = self.query(&query).await?;
        
        let result: QueryResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse customer query response: {}", e)))?;
        
        Ok(result.query_response.customer.into_iter().next())
    }
    
    /// Query customer by display name
    pub async fn query_customer_by_name(&self, display_name: &str) -> Result<Option<QBCustomer>, ApiError> {
        let sanitized = display_name.replace('\'', "''");
        let query = format!("SELECT * FROM Customer WHERE DisplayName = '{}'", sanitized);
        let response = self.query(&query).await?;
        
        let result: QueryResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse customer query response: {}", e)))?;
        
        Ok(result.query_response.customer.into_iter().next())
    }
    
    /// Get customer by ID
    pub async fn get_customer(&self, customer_id: &str) -> Result<QBCustomer, ApiError> {
        let endpoint = format!("customer/{}", customer_id);
        let response = self.get(&endpoint).await?;
        
        let result: CustomerResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse customer response: {}", e)))?;
        
        Ok(result.customer)
    }
    
    /// Create a new customer
    /// 
    /// Requirements: 11.2, 2.4
    pub async fn create_customer(&self, customer: &QBCustomer) -> Result<QBCustomer, ApiError> {
        // Validate required fields
        if customer.display_name.is_empty() {
            return Err(ApiError::validation_msg("DisplayName is required"));
        }
        
        // DisplayName must be unique - check if it already exists
        if let Some(existing) = self.query_customer_by_name(&customer.display_name).await? {
            return Err(ApiError::validation_msg(&format!(
                "Customer with DisplayName '{}' already exists (ID: {})",
                customer.display_name,
                existing.id.unwrap_or_default()
            )));
        }
        
        let response = self.post("customer", customer).await?;
        
        let result: CustomerResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse customer response: {}", e)))?;
        
        Ok(result.customer)
    }
    
    /// Update an existing customer (sparse update)
    /// 
    /// Requirements: 2.4
    pub async fn update_customer(&self, customer: &QBCustomer) -> Result<QBCustomer, ApiError> {
        // Validate required fields for update
        if customer.id.is_none() {
            return Err(ApiError::validation_msg("Customer ID is required for update"));
        }
        
        if customer.sync_token.is_none() {
            return Err(ApiError::validation_msg("SyncToken is required for update"));
        }
        
        // Use sparse update to only update provided fields
        let response = self.sparse_update("customer", customer).await?;
        
        let result: CustomerResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse customer response: {}", e)))?;
        
        Ok(result.customer)
    }
    
    /// Soft delete a customer (set Active = false)
    /// 
    /// Requirements: 2.4
    pub async fn deactivate_customer(&self, customer_id: &str) -> Result<QBCustomer, ApiError> {
        // First, get the current customer to get the SyncToken
        let mut customer = self.get_customer(customer_id).await?;
        
        // Set Active to false
        customer.active = Some(false);
        
        // Update the customer
        self.update_customer(&customer).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_customer_serialization() {
        let customer = QBCustomer {
            id: Some("123".to_string()),
            sync_token: Some("0".to_string()),
            display_name: "John Doe".to_string(),
            given_name: Some("John".to_string()),
            family_name: Some("Doe".to_string()),
            company_name: None,
            primary_email_addr: Some(EmailAddress {
                address: "john@example.com".to_string(),
            }),
            primary_phone: None,
            bill_addr: None,
            ship_addr: None,
            active: Some(true),
            meta_data: None,
        };
        
        let json = serde_json::to_string(&customer).unwrap();
        assert!(json.contains("DisplayName"));
        assert!(json.contains("John Doe"));
    }
    
    #[test]
    fn test_customer_validation() {
        let customer = QBCustomer {
            id: None,
            sync_token: None,
            display_name: "".to_string(),
            given_name: None,
            family_name: None,
            company_name: None,
            primary_email_addr: None,
            primary_phone: None,
            bill_addr: None,
            ship_addr: None,
            active: None,
            meta_data: None,
        };
        
        assert!(customer.display_name.is_empty());
    }
}
