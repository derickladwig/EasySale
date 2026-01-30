/**
 * WooCommerce Orders API
 * 
 * Handles order fetching with pagination and incremental sync support
 * 
 * Requirements: 12.2, 12.4, 12.6, 5.1, 5.2, 5.4
 * 
 * Note: Some methods are currently unused but are part of the complete API implementation.
 */

use serde::{Deserialize, Serialize};
use crate::models::ApiError;
use super::client::WooCommerceClient;

/// WooCommerce order status
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum OrderStatus {
    Pending,
    Processing,
    OnHold,
    Completed,
    Cancelled,
    Refunded,
    Failed,
    Trash,
}

/// WooCommerce order
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WooCommerceOrder {
    pub id: i64,
    pub parent_id: i64,
    pub number: String,
    pub order_key: String,
    pub created_via: String,
    pub version: String,
    pub status: String,
    pub currency: String,
    pub date_created: String,
    pub date_created_gmt: String,
    pub date_modified: String,
    pub date_modified_gmt: String,
    pub discount_total: String,
    pub discount_tax: String,
    pub shipping_total: String,
    pub shipping_tax: String,
    pub cart_tax: String,
    pub total: String,
    pub total_tax: String,
    pub prices_include_tax: bool,
    pub customer_id: i64,
    pub customer_ip_address: String,
    pub customer_user_agent: String,
    pub customer_note: String,
    pub billing: BillingAddress,
    pub shipping: ShippingAddress,
    pub payment_method: String,
    pub payment_method_title: String,
    pub transaction_id: String,
    pub date_paid: Option<String>,
    pub date_paid_gmt: Option<String>,
    pub date_completed: Option<String>,
    pub date_completed_gmt: Option<String>,
    pub cart_hash: String,
    pub meta_data: Vec<MetaData>,
    pub line_items: Vec<LineItem>,
    pub tax_lines: Vec<TaxLine>,
    pub shipping_lines: Vec<ShippingLine>,
    pub fee_lines: Vec<FeeLine>,
    pub coupon_lines: Vec<CouponLine>,
    pub refunds: Vec<Refund>,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItem {
    pub id: i64,
    pub name: String,
    pub product_id: i64,
    pub variation_id: i64,
    pub quantity: i32,
    pub tax_class: String,
    pub subtotal: String,
    pub subtotal_tax: String,
    pub total: String,
    pub total_tax: String,
    pub taxes: Vec<Tax>,
    pub meta_data: Vec<MetaData>,
    pub sku: String,
    pub price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tax {
    pub id: i64,
    pub total: String,
    pub subtotal: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxLine {
    pub id: i64,
    pub rate_code: String,
    pub rate_id: i64,
    pub label: String,
    pub compound: bool,
    pub tax_total: String,
    pub shipping_tax_total: String,
    pub meta_data: Vec<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShippingLine {
    pub id: i64,
    pub method_title: String,
    pub method_id: String,
    pub total: String,
    pub total_tax: String,
    pub taxes: Vec<Tax>,
    pub meta_data: Vec<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeLine {
    pub id: i64,
    pub name: String,
    pub tax_class: String,
    pub tax_status: String,
    pub total: String,
    pub total_tax: String,
    pub taxes: Vec<Tax>,
    pub meta_data: Vec<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CouponLine {
    pub id: i64,
    pub code: String,
    pub discount: String,
    pub discount_tax: String,
    pub meta_data: Vec<MetaData>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Refund {
    pub id: i64,
    pub reason: String,
    pub total: String,
}

/// Order query parameters
#[derive(Debug, Clone, Default)]
pub struct OrderQuery {
    pub page: Option<u32>,
    pub per_page: Option<u32>,
    pub status: Option<Vec<OrderStatus>>,
    pub modified_after: Option<String>,
    pub order_by: Option<String>,
    pub order: Option<String>,
}

impl WooCommerceClient {
    /// Fetch orders with pagination and filtering
    /// 
    /// Requirements: 12.2, 12.4, 5.1, 5.2
    pub async fn get_orders(&self, query: OrderQuery) -> Result<Vec<WooCommerceOrder>, ApiError> {
        let mut params = Vec::new();
        
        // Pagination (max 100 per page)
        let per_page = query.per_page.unwrap_or(100).min(100);
        params.push(format!("per_page={}", per_page));
        
        if let Some(page) = query.page {
            params.push(format!("page={}", page));
        }
        
        // Status filtering
        if let Some(statuses) = query.status {
            let status_str = statuses
                .iter()
                .map(|s| serde_json::to_string(s).unwrap_or_default().trim_matches('"').to_string())
                .collect::<Vec<_>>()
                .join(",");
            params.push(format!("status={}", status_str));
        }
        
        // Incremental sync support
        if let Some(modified_after) = query.modified_after {
            params.push(format!("modified_after={}", urlencoding::encode(&modified_after)));
        }
        
        // Ordering
        if let Some(order_by) = query.order_by {
            params.push(format!("orderby={}", order_by));
        }
        if let Some(order) = query.order {
            params.push(format!("order={}", order));
        }
        
        let endpoint = if params.is_empty() {
            "orders".to_string()
        } else {
            format!("orders?{}", params.join("&"))
        };
        
        let response = self.get(&endpoint).await?;
        let orders: Vec<WooCommerceOrder> = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse orders: {}", e)))?;
        
        Ok(orders)
    }
    
    /// Fetch a single order by ID
    pub async fn get_order(&self, order_id: i64) -> Result<WooCommerceOrder, ApiError> {
        let endpoint = format!("orders/{}", order_id);
        let response = self.get(&endpoint).await?;
        let order: WooCommerceOrder = response
            .json()
            .await
            .map_err(|e| ApiError::internal(format!("Failed to parse order: {}", e)))?;
        
        Ok(order)
    }
    
    /// Fetch all orders with automatic pagination
    /// 
    /// Requirements: 5.4 (incremental sync)
    pub async fn get_all_orders(&self, modified_after: Option<String>) -> Result<Vec<WooCommerceOrder>, ApiError> {
        let mut all_orders = Vec::new();
        let mut page = 1;
        
        loop {
            let query = OrderQuery {
                page: Some(page),
                per_page: Some(100),
                modified_after: modified_after.clone(),
                ..Default::default()
            };
            
            let orders = self.get_orders(query).await?;
            
            if orders.is_empty() {
                break;
            }
            
            all_orders.extend(orders);
            page += 1;
        }
        
        Ok(all_orders)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_order_query_builder() {
        let query = OrderQuery {
            page: Some(1),
            per_page: Some(50),
            status: Some(vec![OrderStatus::Completed, OrderStatus::Processing]),
            modified_after: Some("2024-01-01T00:00:00".to_string()),
            ..Default::default()
        };
        
        assert_eq!(query.page, Some(1));
        assert_eq!(query.per_page, Some(50));
        assert!(query.status.is_some());
        assert!(query.modified_after.is_some());
    }
}
