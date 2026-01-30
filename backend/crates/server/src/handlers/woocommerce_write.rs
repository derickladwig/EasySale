/**
 * WooCommerce Write Operations
 * 
 * Create, update, and delete operations for WooCommerce
 * 
 * Requirements: 12.2, 12.6
 */

use actix_web::{post, put, delete, web, HttpResponse};
use sqlx::SqlitePool;
use serde::Deserialize;

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::woocommerce::client::WooCommerceClient;

#[derive(Debug, Deserialize)]
pub struct CreateProductRequest {
    pub tenant_id: String,
    pub product: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateProductRequest {
    pub tenant_id: String,
    pub product_id: i64,
    pub product: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct DeleteProductRequest {
    pub tenant_id: String,
    pub product_id: i64,
    pub force: Option<bool>,
}

/// Create product in WooCommerce
#[post("/api/woocommerce/products/create")]
pub async fn create_product(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateProductRequest>,
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

    let response = woo_client.post("products", &req.product).await?;
    let product: serde_json::Value = response.json().await
        .map_err(|e| ApiError::internal(format!("Failed to parse response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(product))
}

/// Update product in WooCommerce
#[put("/api/woocommerce/products/update")]
pub async fn update_product(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateProductRequest>,
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

    let endpoint = format!("products/{}", req.product_id);
    let response = woo_client.put(&endpoint, &req.product).await?;
    let product: serde_json::Value = response.json().await
        .map_err(|e| ApiError::internal(format!("Failed to parse response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(product))
}

/// Delete product in WooCommerce
#[delete("/api/woocommerce/products/delete")]
pub async fn delete_product(
    pool: web::Data<SqlitePool>,
    req: web::Json<DeleteProductRequest>,
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

    let force = req.force.unwrap_or(false);
    let endpoint = format!("products/{}?force={}", req.product_id, force);
    let response = woo_client.delete(&endpoint).await?;
    let result: serde_json::Value = response.json().await
        .map_err(|e| ApiError::internal(format!("Failed to parse response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(result))
}

// Customer operations
#[derive(Debug, Deserialize)]
pub struct CreateCustomerRequest {
    pub tenant_id: String,
    pub customer: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCustomerRequest {
    pub tenant_id: String,
    pub customer_id: i64,
    pub customer: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct DeleteCustomerRequest {
    pub tenant_id: String,
    pub customer_id: i64,
    pub force: Option<bool>,
}

/// Create customer in WooCommerce
#[post("/api/woocommerce/customers/create")]
pub async fn create_customer(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateCustomerRequest>,
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

    let response = woo_client.post("customers", &req.customer).await?;
    let customer: serde_json::Value = response.json().await
        .map_err(|e| ApiError::internal(format!("Failed to parse response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(customer))
}

/// Update customer in WooCommerce
#[put("/api/woocommerce/customers/update")]
pub async fn update_customer(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateCustomerRequest>,
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

    let endpoint = format!("customers/{}", req.customer_id);
    let response = woo_client.put(&endpoint, &req.customer).await?;
    let customer: serde_json::Value = response.json().await
        .map_err(|e| ApiError::internal(format!("Failed to parse response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(customer))
}

/// Delete customer in WooCommerce
#[delete("/api/woocommerce/customers/delete")]
pub async fn delete_customer(
    pool: web::Data<SqlitePool>,
    req: web::Json<DeleteCustomerRequest>,
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

    let force = req.force.unwrap_or(false);
    let endpoint = format!("customers/{}?force={}", req.customer_id, force);
    let response = woo_client.delete(&endpoint).await?;
    let result: serde_json::Value = response.json().await
        .map_err(|e| ApiError::internal(format!("Failed to parse response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(result))
}

// Order operations
#[derive(Debug, Deserialize)]
pub struct CreateOrderRequest {
    pub tenant_id: String,
    pub order: serde_json::Value,
}

#[derive(Debug, Deserialize)]
pub struct UpdateOrderRequest {
    pub tenant_id: String,
    pub order_id: i64,
    pub order: serde_json::Value,
}

/// Create order in WooCommerce
#[post("/api/woocommerce/orders/create")]
pub async fn create_order(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateOrderRequest>,
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

    let response = woo_client.post("orders", &req.order).await?;
    let order: serde_json::Value = response.json().await
        .map_err(|e| ApiError::internal(format!("Failed to parse response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(order))
}

/// Update order in WooCommerce
#[put("/api/woocommerce/orders/update")]
pub async fn update_order(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateOrderRequest>,
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

    let endpoint = format!("orders/{}", req.order_id);
    let response = woo_client.put(&endpoint, &req.order).await?;
    let order: serde_json::Value = response.json().await
        .map_err(|e| ApiError::internal(format!("Failed to parse response: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(order))
}
