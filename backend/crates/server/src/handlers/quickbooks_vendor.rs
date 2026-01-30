/**
 * QuickBooks Vendor Operations
 * 
 * Vendor CRUD operations for QuickBooks
 * 
 * Requirements: 11.7
 */

use actix_web::{post, put, web, HttpResponse};
use sqlx::SqlitePool;
use serde::Deserialize;

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::quickbooks::client::QuickBooksClient;
use crate::connectors::quickbooks::vendor::QBVendor;

#[derive(Debug, Deserialize)]
pub struct GetVendorRequest {
    pub tenant_id: String,
    pub vendor_id: String,
}

#[derive(Debug, Deserialize)]
pub struct QueryVendorRequest {
    pub tenant_id: String,
    pub display_name: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateVendorRequest {
    pub tenant_id: String,
    pub vendor: QBVendor,
}

#[derive(Debug, Deserialize)]
pub struct UpdateVendorRequest {
    pub tenant_id: String,
    pub vendor: QBVendor,
}

/// Get vendor by ID
#[post("/api/quickbooks/vendors/get")]
pub async fn get_vendor(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetVendorRequest>,
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

    let vendor = qbo_client.get_vendor(&req.vendor_id).await?;
    
    Ok(HttpResponse::Ok().json(vendor))
}

/// Query vendor by display name
#[post("/api/quickbooks/vendors/query")]
pub async fn query_vendor(
    pool: web::Data<SqlitePool>,
    req: web::Json<QueryVendorRequest>,
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

    let vendor = qbo_client.query_vendor_by_name(&req.display_name).await?;
    
    Ok(HttpResponse::Ok().json(vendor))
}

/// Create vendor
#[post("/api/quickbooks/vendors/create")]
pub async fn create_vendor(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateVendorRequest>,
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

    let created_vendor = qbo_client.create_vendor(&req.vendor).await?;
    
    Ok(HttpResponse::Ok().json(created_vendor))
}

/// Update vendor
#[put("/api/quickbooks/vendors/update")]
pub async fn update_vendor(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateVendorRequest>,
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

    let updated_vendor = qbo_client.update_vendor(&req.vendor).await?;
    
    Ok(HttpResponse::Ok().json(updated_vendor))
}

#[derive(Debug, Deserialize)]
pub struct QueryVendorByEmailRequest {
    pub tenant_id: String,
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct DeactivateVendorRequest {
    pub tenant_id: String,
    pub vendor_id: String,
}

#[derive(Debug, Deserialize)]
pub struct ReactivateVendorRequest {
    pub tenant_id: String,
    pub vendor_id: String,
}

/// Query vendor by email
#[post("/api/quickbooks/vendors/query-by-email")]
pub async fn query_vendor_by_email(
    pool: web::Data<SqlitePool>,
    req: web::Json<QueryVendorByEmailRequest>,
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

    let vendor = qbo_client.query_vendor_by_email(&req.email).await?;
    
    Ok(HttpResponse::Ok().json(vendor))
}

/// Deactivate vendor (soft delete)
#[post("/api/quickbooks/vendors/deactivate")]
pub async fn deactivate_vendor(
    pool: web::Data<SqlitePool>,
    req: web::Json<DeactivateVendorRequest>,
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

    let deactivated_vendor = qbo_client.deactivate_vendor(&req.vendor_id).await?;
    
    Ok(HttpResponse::Ok().json(deactivated_vendor))
}

/// Reactivate vendor
#[post("/api/quickbooks/vendors/reactivate")]
pub async fn reactivate_vendor(
    pool: web::Data<SqlitePool>,
    req: web::Json<ReactivateVendorRequest>,
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

    let reactivated_vendor = qbo_client.reactivate_vendor(&req.vendor_id).await?;
    
    Ok(HttpResponse::Ok().json(reactivated_vendor))
}
