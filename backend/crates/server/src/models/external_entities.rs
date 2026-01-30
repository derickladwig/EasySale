/**
 * Internal Canonical Models
 * 
 * Defines internal representations of entities for cross-system sync.
 * These models serve as the "lingua franca" between different platforms.
 * 
 * Requirements: 2.1
 */

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

// ============================================================================
// Internal Order
// ============================================================================

/// Canonical order representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InternalOrder {
    pub id: String,
    pub external_ids: HashMap<String, String>, // system -> id
    pub order_number: String,
    pub status: OrderStatus,
    pub customer: InternalCustomer,
    pub billing_address: Address,
    pub shipping_address: Address,
    pub line_items: Vec<LineItem>,
    pub tax_lines: Vec<TaxLine>,
    pub shipping_lines: Vec<ShippingLine>,
    pub discounts: Vec<Discount>,
    pub subtotal: f64,
    pub tax_total: f64,
    pub shipping_total: f64,
    pub discount_total: f64,
    pub total: f64,
    pub currency: String,
    pub payment_status: PaymentStatus,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum OrderStatus {
    Pending,
    Processing,
    Completed,
    Cancelled,
    Refunded,
    OnHold,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PaymentStatus {
    Pending,
    Paid,
    Refunded,
    Partial,
}

// ============================================================================
// Internal Customer
// ============================================================================

/// Canonical customer representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InternalCustomer {
    pub id: String,
    pub external_ids: HashMap<String, String>,
    pub email: String,
    pub first_name: String,
    pub last_name: String,
    pub display_name: String,
    pub company: Option<String>,
    pub phone: Option<String>,
    pub billing_address: Option<Address>,
    pub shipping_address: Option<Address>,
    pub created_at: String,
    pub updated_at: String,
}

// ============================================================================
// Internal Product
// ============================================================================

/// Canonical product representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InternalProduct {
    pub id: String,
    pub external_ids: HashMap<String, String>,
    pub sku: String,
    pub name: String,
    pub description: Option<String>,
    pub product_type: ProductType,
    pub price: f64,
    pub cost_price: Option<f64>,
    pub taxable: bool,
    pub track_inventory: bool,
    pub stock_quantity: Option<f64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ProductType {
    Simple,
    Variable,
    Service,
}

// ============================================================================
// Supporting Structures
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Address {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub company: Option<String>,
    pub address_1: Option<String>,
    pub address_2: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub postcode: Option<String>,
    pub country: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItem {
    pub id: String,
    pub product_id: String,
    pub sku: String,
    pub name: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total: f64,
    pub tax_class: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxLine {
    pub id: String,
    pub rate_code: String,
    pub rate_percent: f64,
    pub total: f64,
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShippingLine {
    pub id: String,
    pub method_id: String,
    pub method_title: String,
    pub total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Discount {
    pub code: String,
    pub amount: f64,
    pub discount_type: DiscountType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DiscountType {
    Percent,
    Fixed,
    FixedCart,
}

// ============================================================================
// Helper Methods
// ============================================================================

impl InternalOrder {
    pub fn add_external_id(&mut self, system: String, id: String) {
        self.external_ids.insert(system, id);
    }
    
    pub fn get_external_id(&self, system: &str) -> Option<&String> {
        self.external_ids.get(system)
    }
}

impl InternalCustomer {
    pub fn add_external_id(&mut self, system: String, id: String) {
        self.external_ids.insert(system, id);
    }
    
    pub fn get_external_id(&self, system: &str) -> Option<&String> {
        self.external_ids.get(system)
    }
    
    pub fn full_name(&self) -> String {
        format!("{} {}", self.first_name, self.last_name)
    }
}

impl InternalProduct {
    pub fn add_external_id(&mut self, system: String, id: String) {
        self.external_ids.insert(system, id);
    }
    
    pub fn get_external_id(&self, system: &str) -> Option<&String> {
        self.external_ids.get(system)
    }
}

impl Address {
    pub fn full_address(&self) -> String {
        let mut parts = Vec::new();
        
        if let Some(addr1) = &self.address_1 {
            parts.push(addr1.clone());
        }
        if let Some(addr2) = &self.address_2 {
            if !addr2.is_empty() {
                parts.push(addr2.clone());
            }
        }
        if let Some(city) = &self.city {
            parts.push(city.clone());
        }
        if let Some(state) = &self.state {
            parts.push(state.clone());
        }
        if let Some(postcode) = &self.postcode {
            parts.push(postcode.clone());
        }
        if let Some(country) = &self.country {
            parts.push(country.clone());
        }
        
        parts.join(", ")
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_internal_order_external_ids() {
        let mut order = InternalOrder {
            id: "1".to_string(),
            external_ids: HashMap::new(),
            order_number: "ORD-001".to_string(),
            status: OrderStatus::Completed,
            customer: InternalCustomer {
                id: "1".to_string(),
                external_ids: HashMap::new(),
                email: "test@example.com".to_string(),
                first_name: "John".to_string(),
                last_name: "Doe".to_string(),
                display_name: "John Doe".to_string(),
                company: None,
                phone: None,
                billing_address: None,
                shipping_address: None,
                created_at: "2024-01-01T00:00:00Z".to_string(),
                updated_at: "2024-01-01T00:00:00Z".to_string(),
            },
            billing_address: Address {
                first_name: Some("John".to_string()),
                last_name: Some("Doe".to_string()),
                company: None,
                address_1: Some("123 Main St".to_string()),
                address_2: None,
                city: Some("New York".to_string()),
                state: Some("NY".to_string()),
                postcode: Some("10001".to_string()),
                country: Some("US".to_string()),
                email: None,
                phone: None,
            },
            shipping_address: Address {
                first_name: Some("John".to_string()),
                last_name: Some("Doe".to_string()),
                company: None,
                address_1: Some("123 Main St".to_string()),
                address_2: None,
                city: Some("New York".to_string()),
                state: Some("NY".to_string()),
                postcode: Some("10001".to_string()),
                country: Some("US".to_string()),
                email: None,
                phone: None,
            },
            line_items: vec![],
            tax_lines: vec![],
            shipping_lines: vec![],
            discounts: vec![],
            subtotal: 100.0,
            tax_total: 10.0,
            shipping_total: 5.0,
            discount_total: 0.0,
            total: 115.0,
            currency: "USD".to_string(),
            payment_status: PaymentStatus::Paid,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };
        
        order.add_external_id("woocommerce".to_string(), "123".to_string());
        order.add_external_id("quickbooks".to_string(), "456".to_string());
        
        assert_eq!(order.get_external_id("woocommerce"), Some(&"123".to_string()));
        assert_eq!(order.get_external_id("quickbooks"), Some(&"456".to_string()));
        assert_eq!(order.get_external_id("unknown"), None);
    }
    
    #[test]
    fn test_customer_full_name() {
        let customer = InternalCustomer {
            id: "1".to_string(),
            external_ids: HashMap::new(),
            email: "test@example.com".to_string(),
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            display_name: "John Doe".to_string(),
            company: None,
            phone: None,
            billing_address: None,
            shipping_address: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };
        
        assert_eq!(customer.full_name(), "John Doe");
    }
    
    #[test]
    fn test_address_full_address() {
        let address = Address {
            first_name: Some("John".to_string()),
            last_name: Some("Doe".to_string()),
            company: None,
            address_1: Some("123 Main St".to_string()),
            address_2: Some("Apt 4B".to_string()),
            city: Some("New York".to_string()),
            state: Some("NY".to_string()),
            postcode: Some("10001".to_string()),
            country: Some("US".to_string()),
            email: None,
            phone: None,
        };
        
        let full = address.full_address();
        assert!(full.contains("123 Main St"));
        assert!(full.contains("Apt 4B"));
        assert!(full.contains("New York"));
        assert!(full.contains("NY"));
        assert!(full.contains("10001"));
        assert!(full.contains("US"));
    }
}
