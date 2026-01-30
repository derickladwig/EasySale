/**
 * WooCommerce Integration Handlers
 * 
 * Direct WooCommerce API operations for testing and manual operations
 * 
 * Requirements: 12.2, 12.6
 */

use actix_web::{get, post, web, HttpResponse};
use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::woocommerce::client::WooCommerceClient;
use crate::connectors::woocommerce::products::ProductQuery;

#[derive(Debug, Deserialize)]
pub struct ProductLookupRequest {
    pub tenant_id: String,
    pub sku: Option<String>,
    pub search: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ProductLookupResponse {
    pub found: bool,
    pub product_id: Option<i64>,
    pub name: Option<String>,
    pub sku: Option<String>,
    pub price: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CustomerLookupRequest {
    pub tenant_id: String,
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct CustomerLookupResponse {
    pub found: bool,
    pub customer_id: Option<i64>,
    pub email: Option<String>,
    pub first_name: Option<String>,
    pub last_name: Option<String>,
}

/// Lookup product by SKU in WooCommerce
/// 
/// Requirements: 12.6 (SKU mapping)
#[post("/api/woocommerce/products/lookup")]
pub async fn lookup_product(
    pool: web::Data<SqlitePool>,
    req: web::Json<ProductLookupRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Load WooCommerce credentials
    let woo_creds = credential_service
        .get_credentials(&req.tenant_id, "woocommerce")
        .await?
        .ok_or_else(|| ApiError::not_found("WooCommerce credentials not found"))?;

    let woo_config = match woo_creds {
        PlatformCredentials::WooCommerce(config) => config,
        _ => return Err(ApiError::internal("Invalid WooCommerce credentials type")),
    };

    let woo_client = WooCommerceClient::new(woo_config)?;

    // Lookup by SKU if provided
    if let Some(sku) = &req.sku {
        if let Some(product) = woo_client.get_product_by_sku(sku).await? {
            return Ok(HttpResponse::Ok().json(ProductLookupResponse {
                found: true,
                product_id: Some(product.id),
                name: Some(product.name),
                sku: Some(product.sku),
                price: Some(product.price),
            }));
        }
    }

    // Lookup by search term if provided
    if let Some(search) = &req.search {
        let query = ProductQuery {
            search: Some(search.clone()),
            per_page: Some(1),
            ..Default::default()
        };
        
        let products = woo_client.get_products(query).await?;
        if let Some(product) = products.first() {
            return Ok(HttpResponse::Ok().json(ProductLookupResponse {
                found: true,
                product_id: Some(product.id),
                name: Some(product.name.clone()),
                sku: Some(product.sku.clone()),
                price: Some(product.price.clone()),
            }));
        }
    }

    Ok(HttpResponse::Ok().json(ProductLookupResponse {
        found: false,
        product_id: None,
        name: None,
        sku: None,
        price: None,
    }))
}

/// Lookup customer by email in WooCommerce
/// 
/// Requirements: 12.6 (customer lookup)
#[post("/api/woocommerce/customers/lookup")]
pub async fn lookup_customer(
    pool: web::Data<SqlitePool>,
    req: web::Json<CustomerLookupRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Load WooCommerce credentials
    let woo_creds = credential_service
        .get_credentials(&req.tenant_id, "woocommerce")
        .await?
        .ok_or_else(|| ApiError::not_found("WooCommerce credentials not found"))?;

    let woo_config = match woo_creds {
        PlatformCredentials::WooCommerce(config) => config,
        _ => return Err(ApiError::internal("Invalid WooCommerce credentials type")),
    };

    let woo_client = WooCommerceClient::new(woo_config)?;

    // Lookup by email
    if let Some(customer) = woo_client.get_customer_by_email(&req.email).await? {
        return Ok(HttpResponse::Ok().json(CustomerLookupResponse {
            found: true,
            customer_id: Some(customer.id),
            email: Some(customer.email),
            first_name: Some(customer.first_name),
            last_name: Some(customer.last_name),
        }));
    }

    Ok(HttpResponse::Ok().json(CustomerLookupResponse {
        found: false,
        customer_id: None,
        email: None,
        first_name: None,
        last_name: None,
    }))
}

/// Test WooCommerce connection
#[get("/api/woocommerce/test/{tenant_id}")]
pub async fn test_connection(
    pool: web::Data<SqlitePool>,
    tenant_id: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Load WooCommerce credentials
    let woo_creds = credential_service
        .get_credentials(&tenant_id, "woocommerce")
        .await?
        .ok_or_else(|| ApiError::not_found("WooCommerce credentials not found"))?;

    let woo_config = match woo_creds {
        PlatformCredentials::WooCommerce(config) => config,
        _ => return Err(ApiError::internal("Invalid WooCommerce credentials type")),
    };

    let woo_client = WooCommerceClient::new(woo_config)?;

    // Test by fetching a single product
    let query = ProductQuery {
        per_page: Some(1),
        ..Default::default()
    };
    
    let products = woo_client.get_products(query).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "connected": true,
        "products_found": products.len(),
        "message": "WooCommerce connection successful"
    })))
}
