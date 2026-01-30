/**
 * WooCommerce Product Variations
 * 
 * Product variation operations for WooCommerce
 * 
 * Requirements: 12.6 (product variations)
 */

use actix_web::{post, web, HttpResponse};
use sqlx::SqlitePool;
use serde::Deserialize;

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::woocommerce::client::WooCommerceClient;

#[derive(Debug, Deserialize)]
pub struct GetVariationsRequest {
    pub tenant_id: String,
    pub product_id: i64,
}

#[derive(Debug, Deserialize)]
pub struct GetVariationRequest {
    pub tenant_id: String,
    pub product_id: i64,
    pub variation_id: i64,
}

/// Get all variations for a product
/// 
/// Requirements: 12.6 (product variations)
#[post("/api/woocommerce/products/variations/list")]
pub async fn get_product_variations(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetVariationsRequest>,
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

    let variations = woo_client.get_product_variations(req.product_id).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "product_id": req.product_id,
        "total_count": variations.len(),
        "variations": variations
    })))
}

/// Get single variation
#[post("/api/woocommerce/products/variations/get")]
pub async fn get_product_variation(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetVariationRequest>,
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

    let variation = woo_client.get_product_variation(req.product_id, req.variation_id).await?;
    
    Ok(HttpResponse::Ok().json(variation))
}
