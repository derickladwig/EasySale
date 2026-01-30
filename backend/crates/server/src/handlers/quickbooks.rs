/**
 * QuickBooks Integration Handlers
 * 
 * Direct QuickBooks API operations for testing and manual operations
 * 
 * Requirements: 11.2, 11.3
 */

use actix_web::{get, post, web, HttpResponse};
use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::quickbooks::client::QuickBooksClient;

#[derive(Debug, Deserialize)]
pub struct CustomerLookupRequest {
    pub tenant_id: String,
    pub email: String,
}

#[derive(Debug, Serialize)]
pub struct CustomerLookupResponse {
    pub found: bool,
    pub customer_id: Option<String>,
    pub display_name: Option<String>,
    pub email: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ItemLookupRequest {
    pub tenant_id: String,
    pub sku: String,
}

#[derive(Debug, Serialize)]
pub struct ItemLookupResponse {
    pub found: bool,
    pub item_id: Option<String>,
    pub name: Option<String>,
    pub sku: Option<String>,
    pub unit_price: Option<f64>,
}

/// Lookup customer by email in QuickBooks
/// 
/// Requirements: 11.2
#[post("/api/quickbooks/customers/lookup")]
pub async fn lookup_customer(
    pool: web::Data<SqlitePool>,
    req: web::Json<CustomerLookupRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Load QuickBooks credentials
    let qbo_creds = credential_service
        .get_credentials(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    // Load OAuth tokens
    let qbo_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    // Lookup by email
    if let Some(customer) = qbo_client.query_customer_by_email(&req.email).await? {
        return Ok(HttpResponse::Ok().json(CustomerLookupResponse {
            found: true,
            customer_id: customer.id.clone(),
            display_name: Some(customer.display_name),
            email: customer.primary_email_addr.map(|e| e.address),
        }));
    }

    Ok(HttpResponse::Ok().json(CustomerLookupResponse {
        found: false,
        customer_id: None,
        display_name: None,
        email: None,
    }))
}

/// Lookup item by SKU in QuickBooks
/// 
/// Requirements: 11.3
#[post("/api/quickbooks/items/lookup")]
pub async fn lookup_item(
    pool: web::Data<SqlitePool>,
    req: web::Json<ItemLookupRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Load QuickBooks credentials
    let qbo_creds = credential_service
        .get_credentials(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    // Load OAuth tokens
    let qbo_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    // Lookup by SKU
    if let Some(item) = qbo_client.query_item_by_sku(&req.sku).await? {
        return Ok(HttpResponse::Ok().json(ItemLookupResponse {
            found: true,
            item_id: item.id.clone(),
            name: Some(item.name),
            sku: item.sku,
            unit_price: item.unit_price,
        }));
    }

    Ok(HttpResponse::Ok().json(ItemLookupResponse {
        found: false,
        item_id: None,
        name: None,
        sku: None,
        unit_price: None,
    }))
}

/// Test QuickBooks connection
#[get("/api/quickbooks/test/{tenant_id}")]
pub async fn test_connection(
    pool: web::Data<SqlitePool>,
    tenant_id: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Load QuickBooks credentials
    let qbo_creds = credential_service
        .get_credentials(&tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    // Load OAuth tokens
    let qbo_tokens = credential_service
        .get_oauth_tokens(&tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    // Test connection
    use crate::connectors::PlatformConnector;
    let is_connected = qbo_client.test_connection().await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "connected": is_connected,
        "message": if is_connected { "QuickBooks connection successful" } else { "QuickBooks connection failed" }
    })))
}
