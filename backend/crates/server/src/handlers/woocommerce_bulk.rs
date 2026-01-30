/**
 * WooCommerce Bulk Operations
 * 
 * Bulk export and fetch operations for WooCommerce
 * 
 * Requirements: 5.4, 12.2, 12.6
 */

use actix_web::{post, web, HttpResponse};
use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::woocommerce::client::WooCommerceClient;

#[derive(Debug, Deserialize)]
pub struct BulkExportRequest {
    pub tenant_id: String,
    pub modified_after: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BulkExportResponse<T> {
    pub total_count: usize,
    pub items: Vec<T>,
}

/// Bulk export all orders
/// 
/// Requirements: 5.4 (incremental sync)
#[post("/api/woocommerce/orders/export")]
pub async fn export_all_orders(
    pool: web::Data<SqlitePool>,
    req: web::Json<BulkExportRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let woo_creds = credential_service
        .get_credentials(&req.tenant_id, "woocommerce")
        .await?
        .ok_or_else(|| ApiError::not_found("WooCommerce credentials not found"))?;

    let woo_config = match woo_creds {
        PlatformCredentials::WooCommerce(config) => config,
        _ => return Err(ApiError::internal("Invalid WooCommerce credentials type")),
    };

    let woo_client = WooCommerceClient::new(woo_config)?;

    // Fetch all orders with automatic pagination
    let orders = woo_client.get_all_orders(req.modified_after.clone()).await?;
    
    let response = BulkExportResponse {
        total_count: orders.len(),
        items: orders,
    };
    
    Ok(HttpResponse::Ok().json(response))
}

/// Bulk export all products
/// 
/// Requirements: 5.4 (incremental sync)
#[post("/api/woocommerce/products/export")]
pub async fn export_all_products(
    pool: web::Data<SqlitePool>,
    req: web::Json<BulkExportRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let woo_creds = credential_service
        .get_credentials(&req.tenant_id, "woocommerce")
        .await?
        .ok_or_else(|| ApiError::not_found("WooCommerce credentials not found"))?;

    let woo_config = match woo_creds {
        PlatformCredentials::WooCommerce(config) => config,
        _ => return Err(ApiError::internal("Invalid WooCommerce credentials type")),
    };

    let woo_client = WooCommerceClient::new(woo_config)?;

    // Fetch all products with automatic pagination
    let products = woo_client.get_all_products(req.modified_after.clone()).await?;
    
    let response = BulkExportResponse {
        total_count: products.len(),
        items: products,
    };
    
    Ok(HttpResponse::Ok().json(response))
}

/// Bulk export all customers
#[post("/api/woocommerce/customers/export")]
pub async fn export_all_customers(
    pool: web::Data<SqlitePool>,
    req: web::Json<BulkExportRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let woo_creds = credential_service
        .get_credentials(&req.tenant_id, "woocommerce")
        .await?
        .ok_or_else(|| ApiError::not_found("WooCommerce credentials not found"))?;

    let woo_config = match woo_creds {
        PlatformCredentials::WooCommerce(config) => config,
        _ => return Err(ApiError::internal("Invalid WooCommerce credentials type")),
    };

    let woo_client = WooCommerceClient::new(woo_config)?;

    // Fetch all customers with automatic pagination
    let customers = woo_client.get_all_customers().await?;
    
    let response = BulkExportResponse {
        total_count: customers.len(),
        items: customers,
    };
    
    Ok(HttpResponse::Ok().json(response))
}

#[derive(Debug, Deserialize)]
pub struct GetSingleRequest {
    pub tenant_id: String,
    pub id: i64,
}

/// Get single order by ID
#[post("/api/woocommerce/orders/get")]
pub async fn get_order(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetSingleRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let woo_creds = credential_service
        .get_credentials(&req.tenant_id, "woocommerce")
        .await?
        .ok_or_else(|| ApiError::not_found("WooCommerce credentials not found"))?;

    let woo_config = match woo_creds {
        PlatformCredentials::WooCommerce(config) => config,
        _ => return Err(ApiError::internal("Invalid WooCommerce credentials type")),
    };

    let woo_client = WooCommerceClient::new(woo_config)?;

    let order = woo_client.get_order(req.id).await?;
    
    Ok(HttpResponse::Ok().json(order))
}

/// Get single product by ID
#[post("/api/woocommerce/products/get")]
pub async fn get_product(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetSingleRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let woo_creds = credential_service
        .get_credentials(&req.tenant_id, "woocommerce")
        .await?
        .ok_or_else(|| ApiError::not_found("WooCommerce credentials not found"))?;

    let woo_config = match woo_creds {
        PlatformCredentials::WooCommerce(config) => config,
        _ => return Err(ApiError::internal("Invalid WooCommerce credentials type")),
    };

    let woo_client = WooCommerceClient::new(woo_config)?;

    let product = woo_client.get_product(req.id).await?;
    
    Ok(HttpResponse::Ok().json(product))
}

/// Get single customer by ID
#[post("/api/woocommerce/customers/get")]
pub async fn get_customer(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetSingleRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let woo_creds = credential_service
        .get_credentials(&req.tenant_id, "woocommerce")
        .await?
        .ok_or_else(|| ApiError::not_found("WooCommerce credentials not found"))?;

    let woo_config = match woo_creds {
        PlatformCredentials::WooCommerce(config) => config,
        _ => return Err(ApiError::internal("Invalid WooCommerce credentials type")),
    };

    let woo_client = WooCommerceClient::new(woo_config)?;

    let customer = woo_client.get_customer(req.id).await?;
    
    Ok(HttpResponse::Ok().json(customer))
}
