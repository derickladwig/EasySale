/**
 * WooCommerce Transformers
 * 
 * Transforms WooCommerce entities to internal canonical models.
 * 
 * Requirements: 2.1, 12.6
 */

use std::collections::HashMap;

use crate::models::{
    InternalOrder, InternalCustomer, InternalProduct,
    OrderStatus, PaymentStatus, ProductType,
    Address, LineItem, TaxLine, ShippingLine, Discount, DiscountType,
};
use crate::models::ApiError;

use super::orders::{WooCommerceOrder, BillingAddress as OrderBillingAddress, ShippingAddress as OrderShippingAddress};
use super::customers::{WooCommerceCustomer, BillingAddress as CustomerBillingAddress, ShippingAddress as CustomerShippingAddress};
use super::products::WooCommerceProduct;

/// WooCommerce Transformers struct
pub struct WooCommerceTransformers;

impl WooCommerceTransformers {
    /// Transform WooCommerce order to internal order
    /// 
    /// Requirements: 2.1, 12.6
    pub fn order_to_internal(woo_order: &WooCommerceOrder) -> Result<InternalOrder, ApiError> {
        transform_order(woo_order)
    }

    /// Transform WooCommerce customer to internal customer
    pub fn customer_to_internal(woo_customer: &WooCommerceCustomer) -> Result<InternalCustomer, ApiError> {
        transform_customer(woo_customer)
    }

    /// Transform WooCommerce product to internal product
    pub fn product_to_internal(woo_product: &WooCommerceProduct) -> Result<InternalProduct, ApiError> {
        transform_product(woo_product)
    }
}

// ============================================================================
// Order Transformation
// ============================================================================

/// Transform WooCommerce order to internal order
/// 
/// Requirements: 2.1, 12.6
fn transform_order(woo_order: &WooCommerceOrder) -> Result<InternalOrder, ApiError> {
    let mut external_ids = HashMap::new();
    external_ids.insert("woocommerce".to_string(), woo_order.id.to_string());
    
    // Transform status
    let status = match woo_order.status.as_str() {
        "pending" => OrderStatus::Pending,
        "processing" => OrderStatus::Processing,
        "completed" => OrderStatus::Completed,
        "cancelled" => OrderStatus::Cancelled,
        "refunded" => OrderStatus::Refunded,
        "on-hold" => OrderStatus::OnHold,
        _ => OrderStatus::Pending,
    };
    
    // Transform payment status
    let payment_status = if woo_order.date_paid.is_some() {
        PaymentStatus::Paid
    } else if woo_order.status == "refunded" {
        PaymentStatus::Refunded
    } else {
        PaymentStatus::Pending
    };
    
    // Transform customer
    let customer = transform_customer_from_order(woo_order)?;
    
    // Transform addresses
    let billing_address = transform_order_billing_address(&woo_order.billing);
    let shipping_address = transform_order_shipping_address(&woo_order.shipping);
    
    // Transform line items
    let line_items = woo_order.line_items.iter()
        .map(|item| LineItem {
            id: item.id.to_string(),
            product_id: item.product_id.to_string(),
            sku: item.sku.clone(),
            name: item.name.clone(),
            quantity: item.quantity as f64,
            unit_price: item.price,
            total: item.total.parse().unwrap_or(0.0),
            tax_class: Some(item.tax_class.clone()),
        })
        .collect();
    
    // Transform tax lines
    let tax_lines = woo_order.tax_lines.iter()
        .map(|tax| {
            // Calculate rate_percent from tax_total and subtotal if possible
            // For now, we'll use 0.0 as WooCommerce doesn't expose rate_percent directly
            TaxLine {
                id: tax.id.to_string(),
                rate_code: tax.rate_code.clone(),
                rate_percent: 0.0, // WooCommerce doesn't expose rate_percent in order response
                total: tax.tax_total.parse().unwrap_or(0.0),
                label: tax.label.clone(),
            }
        })
        .collect();
    
    // Transform shipping lines
    let shipping_lines = woo_order.shipping_lines.iter()
        .map(|ship| ShippingLine {
            id: ship.id.to_string(),
            method_id: ship.method_id.clone(),
            method_title: ship.method_title.clone(),
            total: ship.total.parse().unwrap_or(0.0),
        })
        .collect();
    
    // Transform discounts (from coupon lines)
    let discounts = woo_order.coupon_lines.iter()
        .map(|coupon| Discount {
            code: coupon.code.clone(),
            amount: coupon.discount.parse().unwrap_or(0.0),
            discount_type: DiscountType::Fixed, // WooCommerce doesn't expose type in order
        })
        .collect();
    
    Ok(InternalOrder {
        id: woo_order.id.to_string(),
        external_ids,
        order_number: woo_order.number.clone(),
        status,
        customer,
        billing_address,
        shipping_address,
        line_items,
        tax_lines,
        shipping_lines,
        discounts,
        subtotal: woo_order.total.parse().unwrap_or(0.0) - 
                  woo_order.total_tax.parse().unwrap_or(0.0) - 
                  woo_order.shipping_total.parse().unwrap_or(0.0),
        tax_total: woo_order.total_tax.parse().unwrap_or(0.0),
        shipping_total: woo_order.shipping_total.parse().unwrap_or(0.0),
        discount_total: woo_order.discount_total.parse().unwrap_or(0.0),
        total: woo_order.total.parse().unwrap_or(0.0),
        currency: woo_order.currency.clone(),
        payment_status,
        created_at: woo_order.date_created.clone(),
        updated_at: woo_order.date_modified.clone(),
    })
}

// ============================================================================
// Customer Transformation
// ============================================================================

/// Transform WooCommerce customer to internal customer
/// 
/// Requirements: 2.1
pub fn transform_customer(woo_customer: &WooCommerceCustomer) -> Result<InternalCustomer, ApiError> {
    let mut external_ids = HashMap::new();
    external_ids.insert("woocommerce".to_string(), woo_customer.id.to_string());
    
    let display_name = if !woo_customer.first_name.is_empty() || !woo_customer.last_name.is_empty() {
        format!("{} {}", woo_customer.first_name, woo_customer.last_name).trim().to_string()
    } else {
        woo_customer.email.clone()
    };
    
    Ok(InternalCustomer {
        id: woo_customer.id.to_string(),
        external_ids,
        email: woo_customer.email.clone(),
        first_name: woo_customer.first_name.clone(),
        last_name: woo_customer.last_name.clone(),
        display_name,
        company: if woo_customer.billing.company.is_empty() {
            None
        } else {
            Some(woo_customer.billing.company.clone())
        },
        phone: if woo_customer.billing.phone.is_empty() {
            None
        } else {
            Some(woo_customer.billing.phone.clone())
        },
        billing_address: Some(transform_customer_billing_address(&woo_customer.billing)),
        shipping_address: Some(transform_customer_shipping_address(&woo_customer.shipping)),
        created_at: woo_customer.date_created.clone(),
        updated_at: woo_customer.date_modified.clone(),
    })
}

/// Transform customer info from order (when customer entity not available)
fn transform_customer_from_order(woo_order: &WooCommerceOrder) -> Result<InternalCustomer, ApiError> {
    let mut external_ids = HashMap::new();
    if woo_order.customer_id > 0 {
        external_ids.insert("woocommerce".to_string(), woo_order.customer_id.to_string());
    }
    
    let display_name = format!("{} {}", 
        woo_order.billing.first_name, 
        woo_order.billing.last_name
    ).trim().to_string();
    
    Ok(InternalCustomer {
        id: woo_order.customer_id.to_string(),
        external_ids,
        email: woo_order.billing.email.clone(),
        first_name: woo_order.billing.first_name.clone(),
        last_name: woo_order.billing.last_name.clone(),
        display_name,
        company: if woo_order.billing.company.is_empty() {
            None
        } else {
            Some(woo_order.billing.company.clone())
        },
        phone: if woo_order.billing.phone.is_empty() {
            None
        } else {
            Some(woo_order.billing.phone.clone())
        },
        billing_address: Some(transform_order_billing_address(&woo_order.billing)),
        shipping_address: Some(transform_order_shipping_address(&woo_order.shipping)),
        created_at: woo_order.date_created.clone(),
        updated_at: woo_order.date_modified.clone(),
    })
}

// ============================================================================
// Product Transformation
// ============================================================================

/// Transform WooCommerce product to internal product
/// 
/// Requirements: 2.1, 12.6
pub fn transform_product(woo_product: &WooCommerceProduct) -> Result<InternalProduct, ApiError> {
    let mut external_ids = HashMap::new();
    external_ids.insert("woocommerce".to_string(), woo_product.id.to_string());
    
    // Transform product type
    let product_type = match woo_product.product_type.as_str() {
        "simple" => ProductType::Simple,
        "variable" => ProductType::Variable,
        _ => ProductType::Simple,
    };
    
    // Parse price
    let price = woo_product.price.parse().unwrap_or(0.0);
    
    // Parse regular price as cost (if sale price exists, regular is cost basis)
    let cost_price = if !woo_product.sale_price.is_empty() {
        Some(woo_product.regular_price.parse().unwrap_or(0.0))
    } else {
        None
    };
    
    Ok(InternalProduct {
        id: woo_product.id.to_string(),
        external_ids,
        sku: woo_product.sku.clone(),
        name: woo_product.name.clone(),
        description: Some(woo_product.description.clone()),
        product_type,
        price,
        cost_price,
        taxable: woo_product.tax_status == "taxable",
        track_inventory: woo_product.manage_stock,
        stock_quantity: if woo_product.manage_stock {
            woo_product.stock_quantity.map(|q| q as f64)
        } else {
            None
        },
        created_at: woo_product.date_created.clone(),
        updated_at: woo_product.date_modified.clone(),
    })
}

// ============================================================================
// Address Transformation
// ============================================================================

/// Transform WooCommerce order billing address to internal address
fn transform_order_billing_address(woo_addr: &OrderBillingAddress) -> Address {
    Address {
        first_name: Some(woo_addr.first_name.clone()),
        last_name: Some(woo_addr.last_name.clone()),
        company: if woo_addr.company.is_empty() {
            None
        } else {
            Some(woo_addr.company.clone())
        },
        address_1: Some(woo_addr.address_1.clone()),
        address_2: if woo_addr.address_2.is_empty() {
            None
        } else {
            Some(woo_addr.address_2.clone())
        },
        city: Some(woo_addr.city.clone()),
        state: Some(woo_addr.state.clone()),
        postcode: Some(woo_addr.postcode.clone()),
        country: Some(woo_addr.country.clone()),
        email: if woo_addr.email.is_empty() {
            None
        } else {
            Some(woo_addr.email.clone())
        },
        phone: if woo_addr.phone.is_empty() {
            None
        } else {
            Some(woo_addr.phone.clone())
        },
    }
}

/// Transform WooCommerce order shipping address to internal address
fn transform_order_shipping_address(woo_addr: &OrderShippingAddress) -> Address {
    Address {
        first_name: Some(woo_addr.first_name.clone()),
        last_name: Some(woo_addr.last_name.clone()),
        company: if woo_addr.company.is_empty() {
            None
        } else {
            Some(woo_addr.company.clone())
        },
        address_1: Some(woo_addr.address_1.clone()),
        address_2: if woo_addr.address_2.is_empty() {
            None
        } else {
            Some(woo_addr.address_2.clone())
        },
        city: Some(woo_addr.city.clone()),
        state: Some(woo_addr.state.clone()),
        postcode: Some(woo_addr.postcode.clone()),
        country: Some(woo_addr.country.clone()),
        email: None, // Shipping address doesn't have email
        phone: None, // Shipping address doesn't have phone
    }
}

/// Transform WooCommerce customer billing address to internal address
fn transform_customer_billing_address(woo_addr: &CustomerBillingAddress) -> Address {
    Address {
        first_name: Some(woo_addr.first_name.clone()),
        last_name: Some(woo_addr.last_name.clone()),
        company: if woo_addr.company.is_empty() {
            None
        } else {
            Some(woo_addr.company.clone())
        },
        address_1: Some(woo_addr.address_1.clone()),
        address_2: if woo_addr.address_2.is_empty() {
            None
        } else {
            Some(woo_addr.address_2.clone())
        },
        city: Some(woo_addr.city.clone()),
        state: Some(woo_addr.state.clone()),
        postcode: Some(woo_addr.postcode.clone()),
        country: Some(woo_addr.country.clone()),
        email: if woo_addr.email.is_empty() {
            None
        } else {
            Some(woo_addr.email.clone())
        },
        phone: if woo_addr.phone.is_empty() {
            None
        } else {
            Some(woo_addr.phone.clone())
        },
    }
}

/// Transform WooCommerce customer shipping address to internal address
fn transform_customer_shipping_address(woo_addr: &CustomerShippingAddress) -> Address {
    Address {
        first_name: Some(woo_addr.first_name.clone()),
        last_name: Some(woo_addr.last_name.clone()),
        company: if woo_addr.company.is_empty() {
            None
        } else {
            Some(woo_addr.company.clone())
        },
        address_1: Some(woo_addr.address_1.clone()),
        address_2: if woo_addr.address_2.is_empty() {
            None
        } else {
            Some(woo_addr.address_2.clone())
        },
        city: Some(woo_addr.city.clone()),
        state: Some(woo_addr.state.clone()),
        postcode: Some(woo_addr.postcode.clone()),
        country: Some(woo_addr.country.clone()),
        email: None, // Customer shipping address doesn't have email
        phone: None, // Customer shipping address doesn't have phone
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::external_entities::OrderStatus as InternalOrderStatus;
    
    #[test]
    fn test_transform_order_status() {
        let mut order = create_test_order();
        
        order.status = "completed".to_string();
        let result = transform_order(&order).unwrap();
        assert!(matches!(result.status, InternalOrderStatus::Completed));
        
        order.status = "processing".to_string();
        let result = transform_order(&order).unwrap();
        assert!(matches!(result.status, InternalOrderStatus::Processing));
    }
    
    #[test]
    fn test_transform_payment_status() {
        let mut order = create_test_order();
        
        order.date_paid = Some("2024-01-01T12:00:00Z".to_string());
        let result = transform_order(&order).unwrap();
        assert!(matches!(result.payment_status, PaymentStatus::Paid));
        
        order.date_paid = None;
        order.status = "refunded".to_string();
        let result = transform_order(&order).unwrap();
        assert!(matches!(result.payment_status, PaymentStatus::Refunded));
    }
    
    #[test]
    fn test_transform_order_billing_address() {
        let woo_addr = OrderBillingAddress {
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            company: "ACME Inc".to_string(),
            address_1: "123 Main St".to_string(),
            address_2: "Apt 4B".to_string(),
            city: "New York".to_string(),
            state: "NY".to_string(),
            postcode: "10001".to_string(),
            country: "US".to_string(),
            email: "john@example.com".to_string(),
            phone: "555-1234".to_string(),
        };
        
        let addr = transform_order_billing_address(&woo_addr);
        assert_eq!(addr.first_name, Some("John".to_string()));
        assert_eq!(addr.last_name, Some("Doe".to_string()));
        assert_eq!(addr.company, Some("ACME Inc".to_string()));
        assert_eq!(addr.city, Some("New York".to_string()));
    }
    
    fn create_test_order() -> WooCommerceOrder {
        WooCommerceOrder {
            id: 123,
            parent_id: 0,
            number: "ORD-123".to_string(),
            order_key: "wc_order_123".to_string(),
            created_via: "checkout".to_string(),
            version: "1.0".to_string(),
            status: "completed".to_string(),
            currency: "USD".to_string(),
            date_created: "2024-01-01T00:00:00Z".to_string(),
            date_created_gmt: "2024-01-01T00:00:00Z".to_string(),
            date_modified: "2024-01-01T00:00:00Z".to_string(),
            date_modified_gmt: "2024-01-01T00:00:00Z".to_string(),
            date_paid: None,
            date_paid_gmt: None,
            date_completed: None,
            date_completed_gmt: None,
            customer_id: 456,
            customer_ip_address: "127.0.0.1".to_string(),
            customer_user_agent: "Mozilla/5.0".to_string(),
            customer_note: "".to_string(),
            billing: OrderBillingAddress {
                first_name: "John".to_string(),
                last_name: "Doe".to_string(),
                company: "".to_string(),
                address_1: "123 Main St".to_string(),
                address_2: "".to_string(),
                city: "New York".to_string(),
                state: "NY".to_string(),
                postcode: "10001".to_string(),
                country: "US".to_string(),
                email: "john@example.com".to_string(),
                phone: "555-1234".to_string(),
            },
            shipping: OrderShippingAddress {
                first_name: "John".to_string(),
                last_name: "Doe".to_string(),
                company: "".to_string(),
                address_1: "123 Main St".to_string(),
                address_2: "".to_string(),
                city: "New York".to_string(),
                state: "NY".to_string(),
                postcode: "10001".to_string(),
                country: "US".to_string(),
            },
            payment_method: "stripe".to_string(),
            payment_method_title: "Credit Card".to_string(),
            transaction_id: "".to_string(),
            cart_hash: "".to_string(),
            meta_data: vec![],
            line_items: vec![],
            tax_lines: vec![],
            shipping_lines: vec![],
            fee_lines: vec![],
            coupon_lines: vec![],
            refunds: vec![],
            total: "100.00".to_string(),
            total_tax: "10.00".to_string(),
            shipping_total: "5.00".to_string(),
            shipping_tax: "0.50".to_string(),
            cart_tax: "9.50".to_string(),
            discount_total: "0.00".to_string(),
            discount_tax: "0.00".to_string(),
            prices_include_tax: false,
        }
    }
}
