/**
 * QuickBooks Transformation Operations
 * 
 * Transform internal models to QuickBooks entities
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 11.4
 */

use actix_web::{post, web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::models::{ApiError, InternalCustomer, InternalProduct, InternalOrder};
use crate::connectors::quickbooks::transformers::{
    QuickBooksTransformers, TransformerConfig, should_create_sales_receipt
};

// ============================================================================
// Transform Customer
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct TransformCustomerRequest {
    pub customer: InternalCustomer,
}

#[derive(Debug, Serialize)]
pub struct TransformCustomerResponse {
    pub qbo_customer: serde_json::Value,
}

/// Transform internal customer to QuickBooks customer
/// 
/// Requirements: 2.1
#[post("/api/quickbooks/transform/customer")]
pub async fn transform_customer(
    req: web::Json<TransformCustomerRequest>,
) -> Result<HttpResponse, ApiError> {
    let qbo_customer = QuickBooksTransformers::internal_customer_to_qbo(&req.customer)?;
    
    Ok(HttpResponse::Ok().json(TransformCustomerResponse {
        qbo_customer: serde_json::to_value(qbo_customer)
            .map_err(|e| ApiError::internal(format!("Serialization failed: {}", e)))?,
    }))
}

// ============================================================================
// Transform Product
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct TransformProductRequest {
    pub product: InternalProduct,
    pub income_account_id: String,
}

#[derive(Debug, Serialize)]
pub struct TransformProductResponse {
    pub qbo_item: serde_json::Value,
}

/// Transform internal product to QuickBooks item
/// 
/// Requirements: 2.1
#[post("/api/quickbooks/transform/product")]
pub async fn transform_product(
    req: web::Json<TransformProductRequest>,
) -> Result<HttpResponse, ApiError> {
    let qbo_item = QuickBooksTransformers::internal_product_to_qbo(
        &req.product,
        &req.income_account_id
    )?;
    
    Ok(HttpResponse::Ok().json(TransformProductResponse {
        qbo_item: serde_json::to_value(qbo_item)
            .map_err(|e| ApiError::internal(format!("Serialization failed: {}", e)))?,
    }))
}

// ============================================================================
// Transform Order
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct TransformOrderRequest {
    pub order: InternalOrder,
    pub customer_qb_id: String,
    pub config: Option<TransformerConfig>,
}

#[derive(Debug, Serialize)]
pub struct TransformOrderResponse {
    pub qbo_invoice: serde_json::Value,
    pub should_use_sales_receipt: bool,
}

/// Transform internal order to QuickBooks invoice
/// 
/// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 11.4
#[post("/api/quickbooks/transform/order")]
pub async fn transform_order(
    req: web::Json<TransformOrderRequest>,
) -> Result<HttpResponse, ApiError> {
    let config = req.config.clone().unwrap_or_default();
    
    let qbo_invoice = QuickBooksTransformers::internal_order_to_qbo(
        &req.order,
        &req.customer_qb_id,
        &config
    )?;
    
    let should_use_sales_receipt = should_create_sales_receipt(&req.order);
    
    Ok(HttpResponse::Ok().json(TransformOrderResponse {
        qbo_invoice: serde_json::to_value(qbo_invoice)
            .map_err(|e| ApiError::internal(format!("Serialization failed: {}", e)))?,
        should_use_sales_receipt,
    }))
}

// ============================================================================
// Check Transaction Type
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CheckTransactionTypeRequest {
    pub order: InternalOrder,
}

#[derive(Debug, Serialize)]
pub struct CheckTransactionTypeResponse {
    pub should_use_sales_receipt: bool,
    pub transaction_type: String,
    pub reason: String,
}

/// Check if order should be Invoice or SalesReceipt
/// 
/// Requirements: 2.2, 11.6
#[post("/api/quickbooks/transform/check-transaction-type")]
pub async fn check_transaction_type(
    req: web::Json<CheckTransactionTypeRequest>,
) -> Result<HttpResponse, ApiError> {
    let should_use_sales_receipt = should_create_sales_receipt(&req.order);
    
    let (transaction_type, reason) = if should_use_sales_receipt {
        ("SalesReceipt".to_string(), "Order is paid in full".to_string())
    } else {
        ("Invoice".to_string(), "Order has pending payment".to_string())
    };
    
    Ok(HttpResponse::Ok().json(CheckTransactionTypeResponse {
        should_use_sales_receipt,
        transaction_type,
        reason,
    }))
}
