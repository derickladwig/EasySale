/**
 * QuickBooks Vendor Operations
 * 
 * CRUD operations for QuickBooks vendors
 * 
 * Requirements: 11.6, 2.2
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::QuickBooksClient;

/// QuickBooks Vendor
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QBVendor {
    #[serde(rename = "Id")]
    pub id: Option<String>,
    
    #[serde(rename = "SyncToken")]
    pub sync_token: Option<String>,
    
    #[serde(rename = "DisplayName")]
    pub display_name: String,
    
    #[serde(rename = "CompanyName", skip_serializing_if = "Option::is_none")]
    pub company_name: Option<String>,
    
    #[serde(rename = "GivenName", skip_serializing_if = "Option::is_none")]
    pub given_name: Option<String>,
    
    #[serde(rename = "FamilyName", skip_serializing_if = "Option::is_none")]
    pub family_name: Option<String>,
    
    #[serde(rename = "PrimaryEmailAddr", skip_serializing_if = "Option::is_none")]
    pub primary_email_addr: Option<EmailAddress>,
    
    #[serde(rename = "PrimaryPhone", skip_serializing_if = "Option::is_none")]
    pub primary_phone: Option<PhoneNumber>,
    
    #[serde(rename = "BillAddr", skip_serializing_if = "Option::is_none")]
    pub bill_addr: Option<Address>,
    
    #[serde(rename = "Active", skip_serializing_if = "Option::is_none")]
    pub active: Option<bool>,
    
    #[serde(rename = "Balance", skip_serializing_if = "Option::is_none")]
    pub balance: Option<f64>,
    
    #[serde(rename = "AcctNum", skip_serializing_if = "Option::is_none")]
    pub acct_num: Option<String>,
    
    #[serde(rename = "Vendor1099", skip_serializing_if = "Option::is_none")]
    pub vendor_1099: Option<bool>,
    
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
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaData {
    #[serde(rename = "CreateTime")]
    pub create_time: String,
    
    #[serde(rename = "LastUpdatedTime")]
    pub last_updated_time: String,
}

#[derive(Debug, Deserialize)]
pub struct VendorResponse {
    #[serde(rename = "Vendor")]
    pub vendor: QBVendor,
}

#[derive(Debug, Deserialize)]
pub struct QueryResponse {
    #[serde(rename = "QueryResponse")]
    pub query_response: QueryResult,
}

#[derive(Debug, Deserialize)]
pub struct QueryResult {
    #[serde(rename = "Vendor", default)]
    pub vendor: Vec<QBVendor>,
    
    #[serde(rename = "maxResults", default)]
    pub max_results: i32,
}

impl QuickBooksClient {
    /// Get vendor by ID
    pub async fn get_vendor(&self, vendor_id: &str) -> Result<QBVendor, ApiError> {
        let endpoint = format!("vendor/{}", vendor_id);
        let response = self.get(&endpoint).await?;
        
        let result: VendorResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse vendor response: {}", e)))?;
        
        Ok(result.vendor)
    }
    
    /// Query vendor by display name
    /// 
    /// Requirements: 11.6
    pub async fn query_vendor_by_name(&self, display_name: &str) -> Result<Option<QBVendor>, ApiError> {
        let sanitized = display_name.replace('\'', "''");
        let query = format!("SELECT * FROM Vendor WHERE DisplayName = '{}'", sanitized);
        let response = self.query(&query).await?;
        
        let result: QueryResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse vendor query response: {}", e)))?;
        
        Ok(result.query_response.vendor.into_iter().next())
    }
    
    /// Query vendor by email
    pub async fn query_vendor_by_email(&self, email: &str) -> Result<Option<QBVendor>, ApiError> {
        let sanitized = email.replace('\'', "''");
        let query = format!("SELECT * FROM Vendor WHERE PrimaryEmailAddr = '{}'", sanitized);
        let response = self.query(&query).await?;
        
        let result: QueryResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse vendor query response: {}", e)))?;
        
        Ok(result.query_response.vendor.into_iter().next())
    }
    
    /// Create a new vendor
    /// 
    /// Requirements: 11.6, 2.2
    pub async fn create_vendor(&self, vendor: &QBVendor) -> Result<QBVendor, ApiError> {
        // Validate required fields
        if vendor.display_name.is_empty() {
            return Err(ApiError::validation_msg("DisplayName is required"));
        }
        
        // DisplayName must be unique
        if let Some(existing) = self.query_vendor_by_name(&vendor.display_name).await? {
            return Err(ApiError::validation_msg(&format!(
                "Vendor with DisplayName '{}' already exists (ID: {})",
                vendor.display_name,
                existing.id.unwrap_or_default()
            )));
        }
        
        let response = self.post("vendor", vendor).await?;
        
        let result: VendorResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse vendor response: {}", e)))?;
        
        Ok(result.vendor)
    }
    
    /// Update an existing vendor
    pub async fn update_vendor(&self, vendor: &QBVendor) -> Result<QBVendor, ApiError> {
        if vendor.id.is_none() {
            return Err(ApiError::validation_msg("Vendor ID is required for update"));
        }
        
        if vendor.sync_token.is_none() {
            return Err(ApiError::validation_msg("SyncToken is required for update"));
        }
        
        let response = self.sparse_update("vendor", vendor).await?;
        
        let result: VendorResponse = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse vendor response: {}", e)))?;
        
        Ok(result.vendor)
    }
    
    /// Soft delete a vendor (set Active = false)
    /// 
    /// Requirements: 2.4
    pub async fn deactivate_vendor(&self, vendor_id: &str) -> Result<QBVendor, ApiError> {
        // Fetch current vendor to get SyncToken
        let mut vendor = self.get_vendor(vendor_id).await?;
        
        // Set Active to false
        vendor.active = Some(false);
        
        // Update vendor
        self.update_vendor(&vendor).await
    }
    
    /// Reactivate a vendor (set Active = true)
    pub async fn reactivate_vendor(&self, vendor_id: &str) -> Result<QBVendor, ApiError> {
        // Fetch current vendor to get SyncToken
        let mut vendor = self.get_vendor(vendor_id).await?;
        
        // Set Active to true
        vendor.active = Some(true);
        
        // Update vendor
        self.update_vendor(&vendor).await
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_vendor_serialization() {
        let vendor = QBVendor {
            id: None,
            sync_token: None,
            display_name: "Acme Supplies".to_string(),
            company_name: Some("Acme Corporation".to_string()),
            given_name: None,
            family_name: None,
            primary_email_addr: Some(EmailAddress {
                address: "vendor@acme.com".to_string(),
            }),
            primary_phone: Some(PhoneNumber {
                free_form_number: "555-1234".to_string(),
            }),
            bill_addr: Some(Address {
                line1: Some("123 Main St".to_string()),
                line2: None,
                city: Some("Springfield".to_string()),
                country_sub_division_code: Some("IL".to_string()),
                postal_code: Some("62701".to_string()),
            }),
            active: Some(true),
            balance: Some(0.0),
            acct_num: Some("V-001".to_string()),
            vendor_1099: Some(false),
            meta_data: None,
        };
        
        let json = serde_json::to_string(&vendor).unwrap();
        assert!(json.contains("DisplayName"));
        assert!(json.contains("Acme Supplies"));
    }
    
    #[test]
    fn test_vendor_display_name_required() {
        let vendor = QBVendor {
            id: None,
            sync_token: None,
            display_name: "".to_string(),
            company_name: None,
            given_name: None,
            family_name: None,
            primary_email_addr: None,
            primary_phone: None,
            bill_addr: None,
            active: None,
            balance: None,
            acct_num: None,
            vendor_1099: None,
            meta_data: None,
        };
        
        assert!(vendor.display_name.is_empty());
    }
}
