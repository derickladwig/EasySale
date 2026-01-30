/**
 * QuickBooks Transformers
 * 
 * Transforms internal canonical models to QuickBooks entities.
 * 
 * Requirements: 2.1
 */

use serde::{Serialize, Deserialize};

use crate::models::{
    InternalOrder, InternalCustomer, InternalProduct,
    PaymentStatus, Address as InternalAddress,
};
use crate::models::ApiError;

use super::customer::{QBCustomer, EmailAddress, PhoneNumber, Address as CustomerAddress};
use super::item::{QBItem, AccountRef};
use super::invoice::{QBInvoice, Line, SalesItemLineDetail, CustomField, Address as InvoiceAddress, TaxCodeRef};

/// QuickBooks Transformers struct
pub struct QuickBooksTransformers;

impl QuickBooksTransformers {
    /// Transform internal customer to QuickBooks customer
    pub fn internal_customer_to_qbo(internal: &InternalCustomer) -> Result<QBCustomer, ApiError> {
        transform_customer(internal)
    }

    /// Transform internal product to QuickBooks item
    pub fn internal_product_to_qbo(internal: &InternalProduct, income_account_id: &str) -> Result<QBItem, ApiError> {
        transform_item(internal, income_account_id)
    }

    /// Transform internal order to QuickBooks invoice
    pub fn internal_order_to_qbo(
        internal: &InternalOrder,
        customer_qb_id: &str,
        config: &TransformerConfig,
    ) -> Result<QBInvoice, ApiError> {
        transform_invoice(internal, customer_qb_id, config)
    }
}

/// Configuration for transformer behavior
/// 
/// Requirements: 2.5, 3.5, 11.4
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformerConfig {
    /// Shipping item ID in QuickBooks (configurable per tenant)
    pub shipping_item_id: String,
    
    /// Default payment terms in days (e.g., 30 for Net 30)
    pub default_payment_terms_days: i32,
    
    /// Custom field mappings (max 3 per QBO API limitation)
    pub custom_field_mappings: Vec<CustomFieldMapping>,
    
    /// Tax code mappings: tax_class -> QBO tax code ID
    pub tax_code_mappings: std::collections::HashMap<String, String>,
    
    /// Default tax code ID if no mapping found
    pub default_tax_code_id: Option<String>,
}

/// Custom field mapping configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomFieldMapping {
    pub definition_id: String,
    pub name: String,
    pub source_field: String, // e.g., "order_number", "customer.email"
}

impl Default for TransformerConfig {
    fn default() -> Self {
        Self {
            shipping_item_id: "SHIPPING_ITEM".to_string(),
            default_payment_terms_days: 30,
            custom_field_mappings: Vec::new(),
            tax_code_mappings: std::collections::HashMap::new(),
            default_tax_code_id: None,
        }
    }
}

// ============================================================================
// Customer Transformation
// ============================================================================

/// Transform internal customer to QuickBooks customer
/// 
/// Requirements: 2.1
fn transform_customer(internal: &InternalCustomer) -> Result<QBCustomer, ApiError> {
    // QuickBooks requires DisplayName to be unique
    let display_name = if internal.display_name.is_empty() {
        internal.full_name()
    } else {
        internal.display_name.clone()
    };
    
    let mut customer = QBCustomer {
        id: internal.get_external_id("quickbooks").map(|s| s.clone()),
        sync_token: None, // Will be set during update operations
        display_name,
        given_name: Some(internal.first_name.clone()),
        family_name: Some(internal.last_name.clone()),
        company_name: internal.company.clone(),
        primary_email_addr: if !internal.email.is_empty() {
            Some(EmailAddress {
                address: internal.email.clone(),
            })
        } else {
            None
        },
        primary_phone: internal.phone.as_ref().map(|phone| PhoneNumber {
            free_form_number: phone.clone(),
        }),
        bill_addr: None,
        ship_addr: None,
        active: Some(true),
        meta_data: None,
    };
    
    // Transform billing address
    if let Some(billing) = &internal.billing_address {
        customer.bill_addr = Some(transform_address_to_qbo(billing));
    }
    
    // Transform shipping address
    if let Some(shipping) = &internal.shipping_address {
        customer.ship_addr = Some(transform_address_to_qbo(shipping));
    }
    
    Ok(customer)
}

/// Helper function to transform internal address to QBO address format
/// 
/// Requirements: 2.4
fn transform_address_to_qbo(addr: &InternalAddress) -> CustomerAddress {
    CustomerAddress {
        line1: addr.address_1.clone(),
        line2: addr.address_2.clone(),
        city: addr.city.clone(),
        country_sub_division_code: addr.state.clone(),
        postal_code: addr.postcode.clone(),
        country: addr.country.clone(),
    }
}

// ============================================================================
// Item Transformation
// ============================================================================

/// Transform internal product to QuickBooks item
/// 
/// Requirements: 2.1
pub fn transform_item(
    internal: &InternalProduct,
    income_account_id: &str,
) -> Result<QBItem, ApiError> {
    // Determine item type string
    let item_type_str = match internal.product_type {
        crate::models::ProductType::Simple => "NonInventory",
        crate::models::ProductType::Variable => "NonInventory",
        crate::models::ProductType::Service => "Service",
    }.to_string();
    
    let item = QBItem {
        id: internal.get_external_id("quickbooks").map(|s| s.clone()),
        sync_token: None, // Will be set during update operations
        name: internal.name.clone(),
        sku: Some(internal.sku.clone()),
        item_type: item_type_str,
        description: internal.description.clone(),
        active: Some(true),
        unit_price: Some(internal.price),
        purchase_cost: internal.cost_price,
        qty_on_hand: internal.stock_quantity,
        inv_start_date: None,
        income_account_ref: AccountRef {
            value: income_account_id.to_string(),
            name: None,
        },
        expense_account_ref: None,
        asset_account_ref: None,
        track_qty_on_hand: Some(internal.track_inventory),
        meta_data: None,
    };
    
    Ok(item)
}

// ============================================================================
// Invoice Transformation
// ============================================================================

/// Transform internal order to QuickBooks invoice
/// 
/// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 11.4
pub fn transform_invoice(
    internal: &InternalOrder,
    customer_qb_id: &str,
    config: &TransformerConfig,
) -> Result<QBInvoice, ApiError> {
    // Transform line items
    let mut lines = Vec::new();
    let mut line_num = 1;
    
    for item in &internal.line_items {
        // Resolve tax code for this line item
        let tax_code_ref = resolve_tax_code(&item.tax_class, config);
        
        let line = Line {
            id: None,
            line_num: Some(line_num),
            description: Some(item.name.clone()),
            amount: item.total,
            detail_type: "SalesItemLineDetail".to_string(),
            sales_item_line_detail: Some(SalesItemLineDetail {
                item_ref: super::invoice::ItemRef {
                    value: item.product_id.clone(), // Should be QBO item ID
                    name: Some(item.name.clone()),
                },
                unit_price: Some(item.unit_price),
                qty: Some(item.quantity),
                tax_code_ref, // Task 7.4.1: Tax code mapping implemented
            }),
            sub_total_line_detail: None,
        };
        
        lines.push(line);
        line_num += 1;
    }
    
    // Add shipping line if present
    // Task 7.4.5: Use configurable shipping item ID
    if !internal.shipping_lines.is_empty() && internal.shipping_total > 0.0 {
        let shipping_line = Line {
            id: None,
            line_num: Some(line_num),
            description: Some("Shipping".to_string()),
            amount: internal.shipping_total,
            detail_type: "SalesItemLineDetail".to_string(),
            sales_item_line_detail: Some(SalesItemLineDetail {
                item_ref: super::invoice::ItemRef {
                    value: config.shipping_item_id.clone(),
                    name: Some("Shipping".to_string()),
                },
                unit_price: Some(internal.shipping_total),
                qty: Some(1.0),
                tax_code_ref: None,
            }),
            sub_total_line_detail: None,
        };
        
        lines.push(shipping_line);
        // Note: line_num not incremented here as it's the last line
    }
    
    // Task 7.4.3: Calculate due date based on payment terms
    let due_date = calculate_due_date(&internal.created_at, config.default_payment_terms_days)?;
    
    // Task 7.4.4: Map custom fields (max 3 per QBO API)
    let custom_fields = map_custom_fields(internal, config)?;
    
    // Create invoice
    let invoice = QBInvoice {
        id: internal.get_external_id("quickbooks").map(|s| s.clone()),
        sync_token: None, // Will be set during update operations
        doc_number: Some(internal.order_number.clone()),
        txn_date: Some(internal.created_at[..10].to_string()), // Extract date part
        customer_ref: super::invoice::CustomerRef {
            value: customer_qb_id.to_string(),
            name: Some(internal.customer.display_name.clone()),
        },
        line: lines,
        // Task 7.4.2: Transform billing and shipping addresses
        bill_addr: Some(transform_address_to_invoice_addr(&internal.billing_address)),
        ship_addr: Some(transform_address_to_invoice_addr(&internal.shipping_address)),
        due_date: Some(due_date),
        ship_date: None,
        tracking_num: None,
        customer_memo: None,
        total_amt: None, // Read-only, calculated by QBO
        balance: None, // Read-only, calculated by QBO
        custom_field: custom_fields,
        meta_data: None, // Task 7.4.7: MetaData not needed for creation
    };
    
    Ok(invoice)
}

/// Resolve tax code ID from tax class name
/// 
/// Requirements: 2.5, 11.4
/// Task 7.4.1: Tax code mapping implementation
fn resolve_tax_code(
    tax_class: &Option<String>,
    config: &TransformerConfig,
) -> Option<TaxCodeRef> {
    if let Some(tax_class_name) = tax_class {
        // Try to find mapping for this tax class
        if let Some(tax_code_id) = config.tax_code_mappings.get(tax_class_name) {
            return Some(TaxCodeRef {
                value: tax_code_id.clone(),
            });
        }
    }
    
    // Fall back to default tax code if configured
    config.default_tax_code_id.as_ref().map(|id| TaxCodeRef {
        value: id.clone(),
    })
}

/// Calculate due date based on invoice date and payment terms
/// 
/// Requirements: 11.4
/// Task 7.4.3: Due date calculation implementation
fn calculate_due_date(
    invoice_date: &str,
    payment_terms_days: i32,
) -> Result<String, ApiError> {
    use chrono::{NaiveDate, Duration};
    
    // Parse invoice date (ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ)
    let date = NaiveDate::parse_from_str(&invoice_date[..10], "%Y-%m-%d")
        .map_err(|e| ApiError::internal(format!("Failed to parse invoice date: {}", e)))?;
    
    // Add payment terms days
    let due_date = date + Duration::days(payment_terms_days as i64);
    
    // Format as YYYY-MM-DD for QBO
    Ok(due_date.format("%Y-%m-%d").to_string())
}

/// Map custom fields from internal order to QBO custom fields
/// 
/// Requirements: 3.5, 11.4
/// Task 7.4.4: Custom field mapping implementation
fn map_custom_fields(
    internal: &InternalOrder,
    config: &TransformerConfig,
) -> Result<Option<Vec<CustomField>>, ApiError> {
    if config.custom_field_mappings.is_empty() {
        return Ok(None);
    }
    
    // Enforce QBO API limitation: max 3 string custom fields
    if config.custom_field_mappings.len() > 3 {
        return Err(ApiError::validation_msg(
            "QuickBooks API only supports 3 string custom fields (Requirement 3.5)"
        ));
    }
    
    let mut custom_fields = Vec::new();
    
    for mapping in &config.custom_field_mappings {
        // Extract value from internal order based on source_field
        let value = extract_field_value(internal, &mapping.source_field);
        
        if let Some(val) = value {
            custom_fields.push(CustomField {
                definition_id: mapping.definition_id.clone(),
                name: mapping.name.clone(),
                field_type: "StringType".to_string(),
                string_value: Some(val),
            });
        }
    }
    
    if custom_fields.is_empty() {
        Ok(None)
    } else {
        Ok(Some(custom_fields))
    }
}

/// Extract field value from internal order using dot notation
/// 
/// Supports: "order_number", "customer.email", "customer.display_name", etc.
fn extract_field_value(internal: &InternalOrder, field_path: &str) -> Option<String> {
    match field_path {
        "order_number" => Some(internal.order_number.clone()),
        "customer.email" => Some(internal.customer.email.clone()),
        "customer.display_name" => Some(internal.customer.display_name.clone()),
        "customer.company" => internal.customer.company.clone(),
        "customer.phone" => internal.customer.phone.clone(),
        "currency" => Some(internal.currency.clone()),
        "payment_status" => Some(format!("{:?}", internal.payment_status)),
        _ => None,
    }
}

/// Transform internal address to QBO invoice address format
/// 
/// Requirements: 2.4, 11.4
/// Task 7.4.2: Address transformation for invoices
fn transform_address_to_invoice_addr(addr: &InternalAddress) -> InvoiceAddress {
    InvoiceAddress {
        line1: addr.address_1.clone(),
        line2: addr.address_2.clone(),
        city: addr.city.clone(),
        country_sub_division_code: addr.state.clone(),
        postal_code: addr.postcode.clone(),
    }
}

/// Determine if order should be Invoice or SalesReceipt
/// 
/// Requirements: 2.2, 11.6
pub fn should_create_sales_receipt(internal: &InternalOrder) -> bool {
    // If order is paid in full, create SalesReceipt instead of Invoice
    matches!(internal.payment_status, PaymentStatus::Paid)
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    
    fn create_test_config() -> TransformerConfig {
        let mut tax_mappings = HashMap::new();
        tax_mappings.insert("standard".to_string(), "TAX".to_string());
        
        TransformerConfig {
            shipping_item_id: "SHIP-001".to_string(),
            default_payment_terms_days: 30,
            custom_field_mappings: vec![
                CustomFieldMapping {
                    definition_id: "1".to_string(),
                    name: "Order Number".to_string(),
                    source_field: "order_number".to_string(),
                },
            ],
            tax_code_mappings: tax_mappings,
            default_tax_code_id: Some("TAX".to_string()),
        }
    }
    
    #[test]
    fn test_transform_customer() {
        let internal = InternalCustomer {
            id: "1".to_string(),
            external_ids: HashMap::new(),
            email: "john@example.com".to_string(),
            first_name: "John".to_string(),
            last_name: "Doe".to_string(),
            display_name: "John Doe".to_string(),
            company: Some("ACME Inc".to_string()),
            phone: Some("555-1234".to_string()),
            billing_address: None,
            shipping_address: None,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };
        
        let result = transform_customer(&internal).unwrap();
        assert_eq!(result.display_name, "John Doe");
        assert_eq!(result.given_name, Some("John".to_string()));
        assert_eq!(result.family_name, Some("Doe".to_string()));
        assert_eq!(result.company_name, Some("ACME Inc".to_string()));
        assert!(result.primary_email_addr.is_some());
        assert!(result.primary_phone.is_some());
    }
    
    #[test]
    fn test_transform_item() {
        let internal = InternalProduct {
            id: "1".to_string(),
            external_ids: HashMap::new(),
            sku: "PROD-001".to_string(),
            name: "Test Product".to_string(),
            description: Some("A test product".to_string()),
            product_type: crate::models::ProductType::Simple,
            price: 99.99,
            cost_price: Some(50.00),
            taxable: true,
            track_inventory: true,
            stock_quantity: Some(100.0),
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };
        
        let result = transform_item(&internal, "80").unwrap();
        assert_eq!(result.name, "Test Product");
        assert_eq!(result.sku, Some("PROD-001".to_string()));
        assert_eq!(result.unit_price, Some(99.99));
        assert_eq!(result.purchase_cost, Some(50.00));
        assert_eq!(result.income_account_ref.value, "80");
    }
    
    #[test]
    fn test_should_create_sales_receipt() {
        let mut order = create_test_order();
        
        order.payment_status = PaymentStatus::Paid;
        assert!(should_create_sales_receipt(&order));
        
        order.payment_status = PaymentStatus::Pending;
        assert!(!should_create_sales_receipt(&order));
    }
    
    #[test]
    fn test_transform_invoice_with_config() {
        let order = create_test_order();
        let config = create_test_config();
        
        let result = transform_invoice(&order, "123", &config).unwrap();
        
        assert_eq!(result.doc_number, Some("ORD-001".to_string()));
        assert_eq!(result.customer_ref.value, "123");
        assert!(result.due_date.is_some());
        assert!(result.bill_addr.is_some());
        assert!(result.ship_addr.is_some());
        assert!(result.custom_field.is_some());
    }
    
    #[test]
    fn test_calculate_due_date() {
        let invoice_date = "2024-01-01T00:00:00Z";
        let due_date = calculate_due_date(invoice_date, 30).unwrap();
        assert_eq!(due_date, "2024-01-31");
    }
    
    #[test]
    fn test_custom_field_limit() {
        let mut config = create_test_config();
        
        // Add 4 custom fields (exceeds limit)
        config.custom_field_mappings = vec![
            CustomFieldMapping {
                definition_id: "1".to_string(),
                name: "Field1".to_string(),
                source_field: "order_number".to_string(),
            },
            CustomFieldMapping {
                definition_id: "2".to_string(),
                name: "Field2".to_string(),
                source_field: "customer.email".to_string(),
            },
            CustomFieldMapping {
                definition_id: "3".to_string(),
                name: "Field3".to_string(),
                source_field: "currency".to_string(),
            },
            CustomFieldMapping {
                definition_id: "4".to_string(),
                name: "Field4".to_string(),
                source_field: "payment_status".to_string(),
            },
        ];
        
        let order = create_test_order();
        let result = transform_invoice(&order, "123", &config);
        
        assert!(result.is_err());
        assert!(result.unwrap_err().to_string().contains("3 string custom fields"));
    }
    
    #[test]
    fn test_tax_code_mapping() {
        let config = create_test_config();
        
        // Test with mapped tax class
        let tax_class = Some("standard".to_string());
        let tax_code = resolve_tax_code(&tax_class, &config);
        assert!(tax_code.is_some());
        assert_eq!(tax_code.unwrap().value, "TAX");
        
        // Test with unmapped tax class (should use default)
        let tax_class = Some("unknown".to_string());
        let tax_code = resolve_tax_code(&tax_class, &config);
        assert!(tax_code.is_some());
        assert_eq!(tax_code.unwrap().value, "TAX");
        
        // Test with no tax class (should use default)
        let tax_code = resolve_tax_code(&None, &config);
        assert!(tax_code.is_some());
    }
    
    fn create_test_order() -> InternalOrder {
        use crate::models::{OrderStatus, LineItem};
        
        InternalOrder {
            id: "1".to_string(),
            external_ids: HashMap::new(),
            order_number: "ORD-001".to_string(),
            status: OrderStatus::Completed,
            customer: InternalCustomer {
                id: "1".to_string(),
                external_ids: HashMap::new(),
                email: "john@example.com".to_string(),
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
            billing_address: InternalAddress {
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
            shipping_address: InternalAddress {
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
            line_items: vec![
                LineItem {
                    id: "1".to_string(),
                    product_id: "100".to_string(),
                    sku: "PROD-001".to_string(),
                    name: "Test Product".to_string(),
                    quantity: 2.0,
                    unit_price: 50.00,
                    total: 100.00,
                    tax_class: Some("standard".to_string()),
                }
            ],
            tax_lines: vec![],
            shipping_lines: vec![],
            discounts: vec![],
            subtotal: 100.00,
            tax_total: 10.00,
            shipping_total: 5.00,
            discount_total: 0.0,
            total: 115.00,
            currency: "USD".to_string(),
            payment_status: PaymentStatus::Paid,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        }
    }
}
