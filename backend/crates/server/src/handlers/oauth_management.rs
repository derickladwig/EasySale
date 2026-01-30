/**
 * OAuth Token Management
 * 
 * Token refresh and management operations
 * 
 * Requirements: 1.4
 */

use actix_web::{post, web, HttpResponse};
use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};

use crate::models::ApiError;
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::quickbooks::oauth::QuickBooksOAuth;

#[derive(Debug, Deserialize)]
pub struct RefreshTokenRequest {
    pub tenant_id: String,
}

#[derive(Debug, Serialize)]
pub struct RefreshTokenResponse {
    pub success: bool,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

#[derive(Debug, Deserialize)]
pub struct RevokeTokenRequest {
    pub tenant_id: String,
}

#[derive(Debug, Serialize)]
pub struct TokenStatusResponse {
    pub needs_refresh: bool,
    pub expires_at: i64,
    pub expires_in_seconds: i64,
}

/// Refresh QuickBooks access token
#[post("/api/oauth/quickbooks/refresh")]
pub async fn refresh_quickbooks_token(
    pool: web::Data<SqlitePool>,
    req: web::Json<RefreshTokenRequest>,
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

    // Load current tokens
    let current_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    // Create OAuth client
    let redirect_uri = std::env::var("QUICKBOOKS_REDIRECT_URI")
        .map_err(|_| ApiError::configuration("QUICKBOOKS_REDIRECT_URI not configured"))?;
    let oauth_client = QuickBooksOAuth::new(qbo_config.clone(), redirect_uri)
        .map_err(|e| ApiError::internal(format!("Failed to create OAuth client: {}", e)))?;

    // Refresh token
    let new_tokens = oauth_client.refresh_access_token(&current_tokens.refresh_token).await?;

    // Store new tokens
    credential_service
        .store_oauth_tokens(&req.tenant_id, "quickbooks", &new_tokens)
        .await?;

    Ok(HttpResponse::Ok().json(RefreshTokenResponse {
        success: true,
        access_token: new_tokens.access_token,
        refresh_token: new_tokens.refresh_token,
        expires_at: new_tokens.expires_at,
    }))
}

/// Revoke QuickBooks access token
#[post("/api/oauth/quickbooks/revoke")]
pub async fn revoke_quickbooks_token(
    pool: web::Data<SqlitePool>,
    req: web::Json<RevokeTokenRequest>,
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

    // Load current tokens
    let current_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    // Create OAuth client
    let redirect_uri = std::env::var("QUICKBOOKS_REDIRECT_URI")
        .map_err(|_| ApiError::configuration("QUICKBOOKS_REDIRECT_URI not configured"))?;
    let oauth_client = QuickBooksOAuth::new(qbo_config, redirect_uri)
        .map_err(|e| ApiError::internal(format!("Failed to create OAuth client: {}", e)))?;

    // Revoke token
    oauth_client.revoke_token(&current_tokens.access_token).await?;

    // Note: Tokens should be manually deleted from database after revocation
    // The credential service doesn't have a delete method yet

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Token revoked successfully. Please delete credentials manually."
    })))
}

/// Check if token needs refresh
#[post("/api/oauth/quickbooks/status")]
pub async fn check_token_status(
    pool: web::Data<SqlitePool>,
    req: web::Json<RefreshTokenRequest>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Load current tokens
    let current_tokens = credential_service
        .get_oauth_tokens(&req.tenant_id, "quickbooks")
        .await?
        .ok_or_else(|| ApiError::not_found("QuickBooks OAuth tokens not found"))?;

    let needs_refresh = QuickBooksOAuth::needs_refresh(&current_tokens);
    let now = chrono::Utc::now().timestamp();
    let expires_in = current_tokens.expires_at - now;

    Ok(HttpResponse::Ok().json(TokenStatusResponse {
        needs_refresh,
        expires_at: current_tokens.expires_at,
        expires_in_seconds: expires_in,
    }))
}
