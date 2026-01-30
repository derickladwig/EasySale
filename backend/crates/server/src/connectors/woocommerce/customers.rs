/**
 * WooCommerce Customers API
 * 
 * Handles customer fetching with billing/shipping addresses
 * 
 * Requirements: 12.2, 12.6, 2.1
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::WooCommerceClient;

/// WooCommerce customer
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WooCommerceCustomer {
    pub id: i64,
    pub date_created: String,
    pub date_created_gmt: String,
    pub date_modified: String,
    pub date_modified_gmt: String,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub username: String,
    pub billing: BillingAddress,
    pub shipping: ShippingAddress,
    pub is_paying_customer: bool,
    pub avatar_url: String,
    pub meta_data: Vec<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BillingAddress {
    pub first_name: String,
    pub last_name: String,
    pub company: String,
    pub address_1: String,
    pub address_2: String,
    pub city: String,
    pub state: String,
    pub postcode: String,
    pub country: String,
    pub email: String,
    pub phone: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShippingAddress {
    pub first_name: String,
    pub last_name: String,
    pub company: String,
    pub address_1: String,
    pub address_2: String,
    pub city: String,
    pub state: String,
    pub postcode: String,
    pub country: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetaData {
    pub id: i64,
    pub key: String,
    pub value: serde_json::Value,
}

/// Customer query parameters
#[derive(Debug, Clone, Default)]
pub struct CustomerQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub search: Option<String>,
    pub email: Option<String>,
    pub role: Option<String>,
    pub order_by: Option<String>,
    pub order: Option<String>,
}

impl WooCommerceClient {
    /// Fetch customers with pagination and filtering
    /// 
    /// Requirements: 12.2, 12.6
    pub async fn get_customers(&self, query: CustomerQuery) -> Result<Vec<WooCommerceCustomer>, ApiError> {
        let mut params = Vec::new();
        
        // Pagination (max 100 per page)
        let per_page = query.per_page.unwrap_or(100).min(100);
        params.push(format!("per_page={}", per_page));
        
        if let Some(page) = query.page {
            params.push(format!("page={}", page));
        }
        
        // Search
        if let Some(search) = query.search {
            params.push(format!("search={}", urlencoding::encode(&search)));
        }
        
        // Email filtering
        if let Some(email) = query.email {
            params.push(format!("email={}", urlencoding::encode(&email)));
        }
        
        // Role filtering
        if let Some(role) = query.role {
            params.push(format!("role={}", role));
        }
        
        // Ordering
        if let Some(order_by) = query.order_by {
            params.push(format!("orderby={}", order_by));
        }
        if let Some(order) = query.order {
            params.push(format!("order={}", order));
        }
        
        let endpoint = if params.is_empty() {
            "customers".to_string()
        } else {
            format!("customers?{}", params.join("&"))
        };
        
        let response = self.get(&endpoint).await?;
        let customers: Vec<WooCommerceCustomer> = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse customers: {}", e)))?;
        
        Ok(customers)
    }
    
    /// Fetch a single customer by ID
    pub async fn get_customer(&self, customer_id: i64) -> Result<WooCommerceCustomer, ApiError> {
        let endpoint = format!("customers/{}", customer_id);
        let response = self.get(&endpoint).await?;
        let customer: WooCommerceCustomer = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse customer: {}", e)))?;
        
        Ok(customer)
    }
    
    /// Fetch customer by email
    /// 
    /// Requirements: 12.6 (customer lookup)
    pub async fn get_customer_by_email(&self, email: &str) -> Result<Option<WooCommerceCustomer>, ApiError> {
        let query = CustomerQuery {
            email: Some(email.to_string()),
            per_page: Some(1),
            ..Default::default()
        };
        
        let customers = self.get_customers(query).await?;
        Ok(customers.into_iter().next())
    }
    
    /// Fetch all customers with automatic pagination
    pub async fn get_all_customers(&self) -> Result<Vec<WooCommerceCustomer>, ApiError> {
        let mut all_customers = Vec::new();
        let mut page = 1;
        
        loop {
            let query = CustomerQuery {
                page: Some(page),
                per_page: Some(100),
                ..Default::default()
            };
            
            let customers = self.get_customers(query).await?;
            
            if customers.is_empty() {
                break;
            }
            
            all_customers.extend(customers);
            page += 1;
        }
        
        Ok(all_customers)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_customer_query_builder() {
        let query = CustomerQuery {
            page: Some(1),
            per_page: Some(50),
            search: Some("john".to_string()),
            email: Some("john@example.com".to_string()),
            role: Some("customer".to_string()),
            ..Default::default()
        };
        
        assert_eq!(query.page, Some(1));
        assert_eq!(query.per_page, Some(50));
        assert!(query.search.is_some());
        assert!(query.email.is_some());
        assert!(query.role.is_some());
    }
}
