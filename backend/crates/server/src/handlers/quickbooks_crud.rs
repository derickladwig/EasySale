/**
 * QuickBooks CRUD Operations
 * 
 * Full CRUD operations for QuickBooks entities
 * 
 * Requirements: 11.2, 11.3, 11.4, 2.4
 */

use actix_web::{post, put, delete, web, HttpResponse};
use sqlx::SqlitePool;
use serde::Deserialize;

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::quickbooks::client::QuickBooksClient;
use crate::connectors::quickbooks::customer::QBCustomer;
use crate::connectors::quickbooks::item::QBItem;

// ============================================================================
// Customer CRUD
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GetCustomerRequest {
    pub tenant_id: String,
    pub customer_id: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCustomerRequest {
    pub tenant_id: String,
    pub customer: QBCustomer,
}

#[derive(Debug, Deserialize)]
pub struct QueryCustomerByNameRequest {
    pub tenant_id: String,
    pub display_name: String,
}

/// Get customer by ID
/// 
/// Requirements: 11.2
#[post("/api/quickbooks/customers/get")]
pub async fn get_customer(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetCustomerRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let qbo_creds = credential_service
        .get_credentials(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    let qbo_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    let customer = qbo_client.get_customer(&req.customer_id).await?;
    
    Ok(HttpResponse::Ok().json(customer))
}

/// Update customer
/// 
/// Requirements: 2.4
#[put("/api/quickbooks/customers/update")]
pub async fn update_customer(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateCustomerRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let qbo_creds = credential_service
        .get_credentials(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    let qbo_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    let updated_customer = qbo_client.update_customer(&req.customer).await?;
    
    Ok(HttpResponse::Ok().json(updated_customer))
}

/// Deactivate customer (soft delete)
/// 
/// Requirements: 2.4
#[delete("/api/quickbooks/customers/{tenant_id}/{customer_id}")]
pub async fn deactivate_customer(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, ApiError> {
    let (tenant_id, customer_id) = path.into_inner();
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let qbo_creds = credential_service
        .get_credentials(&tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    let qbo_tokens = credential_service
        .get_oauth_tokens(&tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    let deactivated_customer = qbo_client.deactivate_customer(&customer_id).await?;
    
    Ok(HttpResponse::Ok().json(deactivated_customer))
}

/// Query customer by display name
#[post("/api/quickbooks/customers/query-by-name")]
pub async fn query_customer_by_name(
    pool: web::Data<SqlitePool>,
    req: web::Json<QueryCustomerByNameRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let qbo_creds = credential_service
        .get_credentials(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    let qbo_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    let customer = qbo_client.query_customer_by_name(&req.display_name).await?;
    
    Ok(HttpResponse::Ok().json(customer))
}

// ============================================================================
// Item CRUD
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GetItemRequest {
    pub tenant_id: String,
    pub item_id: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateItemRequest {
    pub tenant_id: String,
    pub item: QBItem,
}

#[derive(Debug, Deserialize)]
pub struct QueryItemByNameRequest {
    pub tenant_id: String,
    pub name: String,
}

/// Get item by ID
/// 
/// Requirements: 11.3
#[post("/api/quickbooks/items/get")]
pub async fn get_item(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetItemRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let qbo_creds = credential_service
        .get_credentials(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    let qbo_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    let item = qbo_client.get_item(&req.item_id).await?;
    
    Ok(HttpResponse::Ok().json(item))
}

/// Update item
#[put("/api/quickbooks/items/update")]
pub async fn update_item(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateItemRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let qbo_creds = credential_service
        .get_credentials(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    let qbo_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    let updated_item = qbo_client.update_item(&req.item).await?;
    
    Ok(HttpResponse::Ok().json(updated_item))
}

/// Deactivate item (soft delete)
#[delete("/api/quickbooks/items/{tenant_id}/{item_id}")]
pub async fn deactivate_item(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> Result<HttpResponse, ApiError> {
    let (tenant_id, item_id) = path.into_inner();
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let qbo_creds = credential_service
        .get_credentials(&tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    let qbo_tokens = credential_service
        .get_oauth_tokens(&tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    let deactivated_item = qbo_client.deactivate_item(&item_id).await?;
    
    Ok(HttpResponse::Ok().json(deactivated_item))
}

/// Query item by name
#[post("/api/quickbooks/items/query-by-name")]
pub async fn query_item_by_name(
    pool: web::Data<SqlitePool>,
    req: web::Json<QueryItemByNameRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let qbo_creds = credential_service
        .get_credentials(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;

    let qbo_config = match qbo_creds {
        PlatformCredentials::QuickBooks(config) => config,
        _ => return Err(ApiError::internal("Invalid QuickBooks credentials type")),
    };

    let qbo_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)?;

    let item = qbo_client.query_item_by_name(&req.name).await?;
    
    Ok(HttpResponse::Ok().json(item))
}
