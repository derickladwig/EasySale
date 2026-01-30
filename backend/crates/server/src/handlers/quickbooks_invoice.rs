/**
 * QuickBooks Invoice Operations
 * 
 * Full CRUD operations for QuickBooks invoices
 * 
 * Requirements: 11.4, 2.2, 2.3, 2.4, 2.5
 */

use actix_web::{post, put, delete, web, HttpResponse};
use sqlx::SqlitePool;
use serde::Deserialize;

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::quickbooks::client::QuickBooksClient;
use crate::connectors::quickbooks::invoice::QBInvoice;

#[derive(Debug, Deserialize)]
pub struct GetInvoiceRequest {
    pub tenant_id: String,
    pub invoice_id: String,
}

#[derive(Debug, Deserialize)]
pub struct QueryInvoiceRequest {
    pub tenant_id: String,
    pub doc_number: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceRequest {
    pub tenant_id: String,
    pub invoice: QBInvoice,
}

#[derive(Debug, Deserialize)]
pub struct UpdateInvoiceRequest {
    pub tenant_id: String,
    pub invoice: QBInvoice,
}

#[derive(Debug, Deserialize)]
pub struct DeleteInvoiceRequest {
    pub tenant_id: String,
    pub invoice_id: String,
    pub sync_token: String,
}

/// Get invoice by ID
/// 
/// Requirements: 11.4
#[post("/api/quickbooks/invoices/get")]
pub async fn get_invoice(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetInvoiceRequest>,
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

    let invoice = qbo_client.get_invoice(&req.invoice_id).await?;
    
    Ok(HttpResponse::Ok().json(invoice))
}

/// Query invoice by DocNumber
/// 
/// Requirements: 11.4
#[post("/api/quickbooks/invoices/query")]
pub async fn query_invoice(
    pool: web::Data<SqlitePool>,
    req: web::Json<QueryInvoiceRequest>,
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

    let invoice = qbo_client.query_invoice_by_doc_number(&req.doc_number).await?;
    
    Ok(HttpResponse::Ok().json(invoice))
}

/// Create invoice
/// 
/// Requirements: 11.4, 2.2, 2.3, 2.4, 2.5
#[post("/api/quickbooks/invoices/create")]
pub async fn create_invoice(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateInvoiceRequest>,
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

    let created_invoice = qbo_client.create_invoice(&req.invoice).await?;
    
    Ok(HttpResponse::Ok().json(created_invoice))
}

/// Update invoice
/// 
/// Requirements: 2.4
#[put("/api/quickbooks/invoices/update")]
pub async fn update_invoice(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateInvoiceRequest>,
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

    let updated_invoice = qbo_client.update_invoice(&req.invoice).await?;
    
    Ok(HttpResponse::Ok().json(updated_invoice))
}

/// Delete invoice
#[delete("/api/quickbooks/invoices/delete")]
pub async fn delete_invoice(
    pool: web::Data<SqlitePool>,
    req: web::Json<DeleteInvoiceRequest>,
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

    qbo_client.delete_invoice(&req.invoice_id, &req.sync_token).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Invoice deleted successfully"
    })))
}
