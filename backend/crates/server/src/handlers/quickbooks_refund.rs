/**
 * QuickBooks Refund Operations
 * 
 * Credit memos and refund receipts for returns
 * 
 * Requirements: 11.8, 2.8
 */

use actix_web::{post, put, web, HttpResponse};
use sqlx::SqlitePool;
use serde::Deserialize;

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::quickbooks::client::QuickBooksClient;
use crate::connectors::quickbooks::refund::{QBCreditMemo, QBRefundReceipt};

// ============================================================================
// Credit Memo Operations
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GetCreditMemoRequest {
    pub tenant_id: String,
    pub credit_memo_id: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateCreditMemoRequest {
    pub tenant_id: String,
    pub credit_memo: QBCreditMemo,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCreditMemoRequest {
    pub tenant_id: String,
    pub credit_memo: QBCreditMemo,
}

/// Get credit memo by ID
#[post("/api/quickbooks/credit-memos/get")]
pub async fn get_credit_memo(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetCreditMemoRequest>,
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

    let credit_memo = qbo_client.get_credit_memo(&req.credit_memo_id).await?;
    
    Ok(HttpResponse::Ok().json(credit_memo))
}

/// Create credit memo
#[post("/api/quickbooks/credit-memos/create")]
pub async fn create_credit_memo(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateCreditMemoRequest>,
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

    let created_credit_memo = qbo_client.create_credit_memo(&req.credit_memo).await?;
    
    Ok(HttpResponse::Ok().json(created_credit_memo))
}

/// Update credit memo
#[put("/api/quickbooks/credit-memos/update")]
pub async fn update_credit_memo(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateCreditMemoRequest>,
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

    let updated_credit_memo = qbo_client.update_credit_memo(&req.credit_memo).await?;
    
    Ok(HttpResponse::Ok().json(updated_credit_memo))
}

// ============================================================================
// Refund Receipt Operations
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GetRefundReceiptRequest {
    pub tenant_id: String,
    pub refund_receipt_id: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateRefundReceiptRequest {
    pub tenant_id: String,
    pub refund_receipt: QBRefundReceipt,
}

#[derive(Debug, Deserialize)]
pub struct UpdateRefundReceiptRequest {
    pub tenant_id: String,
    pub refund_receipt: QBRefundReceipt,
}

/// Get refund receipt by ID
#[post("/api/quickbooks/refund-receipts/get")]
pub async fn get_refund_receipt(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetRefundReceiptRequest>,
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

    let refund_receipt = qbo_client.get_refund_receipt(&req.refund_receipt_id).await?;
    
    Ok(HttpResponse::Ok().json(refund_receipt))
}

/// Create refund receipt
#[post("/api/quickbooks/refund-receipts/create")]
pub async fn create_refund_receipt(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateRefundReceiptRequest>,
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

    let created_refund_receipt = qbo_client.create_refund_receipt(&req.refund_receipt).await?;
    
    Ok(HttpResponse::Ok().json(created_refund_receipt))
}

/// Update refund receipt
#[put("/api/quickbooks/refund-receipts/update")]
pub async fn update_refund_receipt(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateRefundReceiptRequest>,
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

    let updated_refund_receipt = qbo_client.update_refund_receipt(&req.refund_receipt).await?;
    
    Ok(HttpResponse::Ok().json(updated_refund_receipt))
}

#[derive(Debug, Deserialize)]
pub struct VoidRefundReceiptRequest {
    pub tenant_id: String,
    pub refund_receipt_id: String,
    pub sync_token: String,
}

/// Void refund receipt
#[post("/api/quickbooks/refund-receipts/void")]
pub async fn void_refund_receipt(
    pool: web::Data<SqlitePool>,
    req: web::Json<VoidRefundReceiptRequest>,
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

    qbo_client.void_refund_receipt(&req.refund_receipt_id, &req.sync_token).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Refund receipt voided successfully"
    })))
}
