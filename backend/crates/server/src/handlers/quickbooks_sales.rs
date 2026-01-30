/**
 * QuickBooks Sales Operations
 * 
 * Sales receipts, payments, credit memos, and refunds
 * 
 * Requirements: 11.4, 2.2, 2.3, 2.4, 2.5
 */

use actix_web::{post, put, web, HttpResponse};
use sqlx::SqlitePool;
use serde::Deserialize;

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::quickbooks::client::QuickBooksClient;
use crate::connectors::quickbooks::sales_receipt::QBSalesReceipt;
use crate::connectors::quickbooks::payment::QBPayment;

// ============================================================================
// Sales Receipt Operations
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GetSalesReceiptRequest {
    pub tenant_id: String,
    pub sales_receipt_id: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateSalesReceiptRequest {
    pub tenant_id: String,
    pub sales_receipt: QBSalesReceipt,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSalesReceiptRequest {
    pub tenant_id: String,
    pub sales_receipt: QBSalesReceipt,
}

#[derive(Debug, Deserialize)]
pub struct VoidSalesReceiptRequest {
    pub tenant_id: String,
    pub sales_receipt_id: String,
    pub sync_token: String,
}

/// Get sales receipt by ID
#[post("/api/quickbooks/sales-receipts/get")]
pub async fn get_sales_receipt(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetSalesReceiptRequest>,
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

    let sales_receipt = qbo_client.get_sales_receipt(&req.sales_receipt_id).await?;
    
    Ok(HttpResponse::Ok().json(sales_receipt))
}

/// Create sales receipt
#[post("/api/quickbooks/sales-receipts/create")]
pub async fn create_sales_receipt(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateSalesReceiptRequest>,
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

    let created_sales_receipt = qbo_client.create_sales_receipt(&req.sales_receipt).await?;
    
    Ok(HttpResponse::Ok().json(created_sales_receipt))
}

/// Update sales receipt
#[put("/api/quickbooks/sales-receipts/update")]
pub async fn update_sales_receipt(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateSalesReceiptRequest>,
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

    let updated_sales_receipt = qbo_client.update_sales_receipt(&req.sales_receipt).await?;
    
    Ok(HttpResponse::Ok().json(updated_sales_receipt))
}

/// Void sales receipt
#[post("/api/quickbooks/sales-receipts/void")]
pub async fn void_sales_receipt(
    pool: web::Data<SqlitePool>,
    req: web::Json<VoidSalesReceiptRequest>,
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

    let voided_sales_receipt = qbo_client.void_sales_receipt(&req.sales_receipt_id, &req.sync_token).await?;
    
    Ok(HttpResponse::Ok().json(voided_sales_receipt))
}

// ============================================================================
// Payment Operations
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GetPaymentRequest {
    pub tenant_id: String,
    pub payment_id: String,
}

#[derive(Debug, Deserialize)]
pub struct QueryPaymentsRequest {
    pub tenant_id: String,
    pub customer_id: String,
}

#[derive(Debug, Deserialize)]
pub struct CreatePaymentRequest {
    pub tenant_id: String,
    pub payment: QBPayment,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePaymentRequest {
    pub tenant_id: String,
    pub payment: QBPayment,
}

#[derive(Debug, Deserialize)]
pub struct DeletePaymentRequest {
    pub tenant_id: String,
    pub payment_id: String,
    pub sync_token: String,
}

/// Get payment by ID
#[post("/api/quickbooks/payments/get")]
pub async fn get_payment(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetPaymentRequest>,
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

    let payment = qbo_client.get_payment(&req.payment_id).await?;
    
    Ok(HttpResponse::Ok().json(payment))
}

/// Query payments by customer
#[post("/api/quickbooks/payments/query")]
pub async fn query_payments(
    pool: web::Data<SqlitePool>,
    req: web::Json<QueryPaymentsRequest>,
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

    let payments = qbo_client.query_payments_by_customer(&req.customer_id).await?;
    
    Ok(HttpResponse::Ok().json(payments))
}

/// Create payment
#[post("/api/quickbooks/payments/create")]
pub async fn create_payment(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreatePaymentRequest>,
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

    let created_payment = qbo_client.create_payment(&req.payment).await?;
    
    Ok(HttpResponse::Ok().json(created_payment))
}

/// Update payment
#[put("/api/quickbooks/payments/update")]
pub async fn update_payment(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdatePaymentRequest>,
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

    let updated_payment = qbo_client.update_payment(&req.payment).await?;
    
    Ok(HttpResponse::Ok().json(updated_payment))
}

/// Delete payment
#[post("/api/quickbooks/payments/delete")]
pub async fn delete_payment(
    pool: web::Data<SqlitePool>,
    req: web::Json<DeletePaymentRequest>,
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

    qbo_client.delete_payment(&req.payment_id, &req.sync_token).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Payment deleted successfully"
    })))
}
