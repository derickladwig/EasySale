/**
 * QuickBooks Bill Operations
 * 
 * Bill CRUD operations for vendor bill receiving
 * 
 * Requirements: 11.7, 2.7
 */

use actix_web::{post, put, delete, web, HttpResponse};
use sqlx::SqlitePool;
use serde::Deserialize;

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::quickbooks::client::QuickBooksClient;
use crate::connectors::quickbooks::bill::QBBill;

#[derive(Debug, Deserialize)]
pub struct GetBillRequest {
    pub tenant_id: String,
    pub bill_id: String,
}

#[derive(Debug, Deserialize)]
pub struct QueryBillsRequest {
    pub tenant_id: String,
    pub vendor_id: String,
}

#[derive(Debug, Deserialize)]
pub struct QueryBillByDocNumberRequest {
    pub tenant_id: String,
    pub doc_number: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateBillRequest {
    pub tenant_id: String,
    pub bill: QBBill,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBillRequest {
    pub tenant_id: String,
    pub bill: QBBill,
}

#[derive(Debug, Deserialize)]
pub struct DeleteBillRequest {
    pub tenant_id: String,
    pub bill_id: String,
    pub sync_token: String,
}

/// Get bill by ID
#[post("/api/quickbooks/bills/get")]
pub async fn get_bill(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetBillRequest>,
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

    let bill = qbo_client.get_bill(&req.bill_id).await?;
    
    Ok(HttpResponse::Ok().json(bill))
}

/// Query bills by vendor
#[post("/api/quickbooks/bills/query-by-vendor")]
pub async fn query_bills_by_vendor(
    pool: web::Data<SqlitePool>,
    req: web::Json<QueryBillsRequest>,
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

    let bills = qbo_client.query_bills_by_vendor(&req.vendor_id).await?;
    
    Ok(HttpResponse::Ok().json(bills))
}

/// Query bill by DocNumber
#[post("/api/quickbooks/bills/query-by-doc-number")]
pub async fn query_bill_by_doc_number(
    pool: web::Data<SqlitePool>,
    req: web::Json<QueryBillByDocNumberRequest>,
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

    let bill = qbo_client.query_bill_by_doc_number(&req.doc_number).await?;
    
    Ok(HttpResponse::Ok().json(bill))
}

/// Create bill
#[post("/api/quickbooks/bills/create")]
pub async fn create_bill(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateBillRequest>,
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

    let created_bill = qbo_client.create_bill(&req.bill).await?;
    
    Ok(HttpResponse::Ok().json(created_bill))
}

/// Update bill
#[put("/api/quickbooks/bills/update")]
pub async fn update_bill(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateBillRequest>,
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

    let updated_bill = qbo_client.update_bill(&req.bill).await?;
    
    Ok(HttpResponse::Ok().json(updated_bill))
}

/// Delete bill
#[delete("/api/quickbooks/bills/delete")]
pub async fn delete_bill(
    pool: web::Data<SqlitePool>,
    req: web::Json<DeleteBillRequest>,
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

    qbo_client.delete_bill(&req.bill_id, &req.sync_token).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Bill deleted successfully"
    })))
}
