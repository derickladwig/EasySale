use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use url::Url;

use crate::models::ApiError;
use crate::services::{
    CredentialService,
    credential_service::{
        PlatformCredentials,
        WooCommerceCredentials,
        QuickBooksCredentials,
        SupabaseCredentials,
        SquareCredentials,
        CloverCredentials,
        StripeConnectCredentials,
    },
};
use crate::connectors::{
    ConnectionStatus,
    PlatformConnector,
    woocommerce::WooCommerceClient,
    quickbooks::{QuickBooksOAuth, QuickBooksClient},
    stripe::{StripeOAuth, StripeClient},
    square::SquareClient,
    clover::{CloverOAuth, CloverClient, CloverTokens},
};

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct StoreWooCommerceCredentials {
    pub store_url: String,
    pub consumer_key: String,
    pub consumer_secret: String,
}

#[derive(Debug, Deserialize)]
pub struct StoreSupabaseCredentials {
    pub project_url: String,
    pub service_role_key: String,
}

#[derive(Debug, Serialize)]
pub struct ConnectionsResponse {
    pub connections: Vec<ConnectionStatus>,
}

#[derive(Debug, Serialize)]
pub struct TestConnectionResponse {
    pub success: bool,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct QuickBooksAuthUrlResponse {
    pub auth_url: String,
    pub state: String,
}

#[derive(Debug, Deserialize)]
pub struct QuickBooksCallbackQuery {
    pub code: String,
    pub state: String,
    #[serde(rename = "realmId")]
    pub realm_id: String,
}

// ============================================================================
// WooCommerce Endpoints
// ============================================================================

/// POST /api/integrations/woocommerce/credentials
/// Store WooCommerce credentials (encrypted)
pub async fn store_woocommerce_credentials(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    payload: web::Json<StoreWooCommerceCredentials>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let credentials = PlatformCredentials::WooCommerce(WooCommerceCredentials {
        store_url: payload.store_url.clone(),
        consumer_key: payload.consumer_key.clone(),
        consumer_secret: payload.consumer_secret.clone(),
    });
    
    credential_service.store_credentials(&tenant_id, credentials).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "WooCommerce credentials stored successfully"
    })))
}

/// GET /api/integrations/woocommerce/status
/// Get WooCommerce connection status (no secrets returned)
pub async fn get_woocommerce_status(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let status = get_connection_status(pool.get_ref(), &tenant_id, "woocommerce").await?;
    Ok(HttpResponse::Ok().json(status))
}

/// DELETE /api/integrations/woocommerce/credentials
/// Remove WooCommerce credentials
pub async fn delete_woocommerce_credentials(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    credential_service.delete_credentials(&tenant_id, "woocommerce").await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "WooCommerce credentials deleted successfully"
    })))
}

/// POST /api/integrations/woocommerce/test
/// Test WooCommerce connection
pub async fn test_woocommerce_connection(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "woocommerce").await?
        .ok_or_else(|| ApiError::not_found("WooCommerce credentials not found"))?;
    
    let woo_creds = match creds {
        PlatformCredentials::WooCommerce(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    let client = WooCommerceClient::new(woo_creds)?;
    
    // Test connection by fetching system status
    match client.get("system_status").await {
        Ok(response) => {
            // Update last_verified_at
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "woocommerce", true, None).await;
            
            // Try to parse response as JSON
            let details = response.json::<serde_json::Value>().await.ok();
            
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: true,
                message: "WooCommerce connection successful".to_string(),
                details,
            }))
        }
        Err(e) => {
            // Update status with error
            let error_msg = format!("Connection failed: {}", e);
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "woocommerce", false, Some(&error_msg)).await;
            
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: false,
                message: error_msg,
                details: None,
            }))
        }
    }
}

// ============================================================================
// QuickBooks Endpoints
// ============================================================================

/// POST /api/integrations/quickbooks/auth-url
/// Generate QuickBooks OAuth authorization URL
pub async fn get_quickbooks_auth_url(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "quickbooks").await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found - please configure client ID and secret first"))?;
    
    let qb_creds = match creds {
        PlatformCredentials::QuickBooks(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    // Get redirect_uri from environment variable
    let redirect_uri = std::env::var("QUICKBOOKS_REDIRECT_URI")
        .map_err(|_| ApiError::configuration("QUICKBOOKS_REDIRECT_URI not configured"))?;
    
    // Validate redirect URI security
    // 1. Must be HTTPS in production (except localhost for dev)
    // 2. Localhost not allowed in production builds
    // 3. Must be a valid URL format
    if cfg!(not(debug_assertions)) {
        // Production validation
        if redirect_uri.contains("localhost") || redirect_uri.contains("127.0.0.1") {
            return Err(ApiError::configuration("Localhost redirect URIs not allowed in production"));
        }
        if !redirect_uri.starts_with("https://") {
            return Err(ApiError::configuration("Redirect URI must use HTTPS in production"));
        }
    }
    
    // Validate URL format
    if Url::parse(&redirect_uri).is_err() {
        return Err(ApiError::configuration("Invalid redirect URI format"));
    }
    
    let oauth = QuickBooksOAuth::new(qb_creds, redirect_uri)?;
    
    // Generate a random state token for CSRF protection (Task 19.3)
    let state = uuid::Uuid::new_v4().to_string();
    
    // Store state in database with 5-minute expiry
    let state_id = uuid::Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::minutes(5);
    
    sqlx::query(
        "INSERT INTO oauth_states (id, tenant_id, platform, state, expires_at, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))"
    )
    .bind(&state_id)
    .bind(tenant_id.to_string())
    .bind("quickbooks")
    .bind(&state)
    .bind(expires_at.to_rfc3339())
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to store OAuth state: {}", e)))?;
    
    let auth_url = oauth.get_authorization_url(&state);
    
    Ok(HttpResponse::Ok().json(QuickBooksAuthUrlResponse {
        auth_url,
        state,
    }))
}

/// GET /api/integrations/quickbooks/callback
/// Handle QuickBooks OAuth callback
pub async fn quickbooks_oauth_callback(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    query: web::Query<QuickBooksCallbackQuery>,
) -> Result<HttpResponse, ApiError> {
    // Task 19.3: Validate state parameter against stored value
    let state_result = sqlx::query_as::<_, (String, String)>(
        "SELECT id, expires_at FROM oauth_states 
         WHERE state = ? AND tenant_id = ? AND platform = 'quickbooks'"
    )
    .bind(&query.state)
    .bind(tenant_id.to_string())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to validate OAuth state: {}", e)))?;
    
    let (state_id, expires_at) = match state_result {
        Some((id, exp)) => (id, exp),
        None => {
            tracing::warn!("Invalid OAuth state received for tenant {}", tenant_id.to_string());
            return Err(ApiError::unauthorized("Invalid OAuth state - possible CSRF attack"));
        }
    };
    
    // Check if state has expired
    let expires_at_dt = chrono::DateTime::parse_from_rfc3339(&expires_at)
        .map_err(|e| ApiError::internal(format!("Failed to parse expiry: {}", e)))?;
    
    if chrono::Utc::now() > expires_at_dt {
        tracing::warn!("Expired OAuth state for tenant {}", tenant_id.to_string());
        // Clean up expired state
        let _ = sqlx::query("DELETE FROM oauth_states WHERE id = ?")
            .bind(&state_id)
            .execute(pool.get_ref())
            .await;
        return Err(ApiError::unauthorized("OAuth state expired - please try again"));
    }
    
    // State is valid - delete it (one-time use)
    sqlx::query("DELETE FROM oauth_states WHERE id = ?")
        .bind(&state_id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to delete OAuth state: {}", e)))?;
    
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "quickbooks").await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;
    
    let qb_creds = match creds {
        PlatformCredentials::QuickBooks(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    // TODO: Get redirect_uri from config or environment
    let redirect_uri = std::env::var("QUICKBOOKS_REDIRECT_URI")
        .map_err(|_| ApiError::configuration("QUICKBOOKS_REDIRECT_URI not configured"))?;
    
    
    // Validate redirect URI is not localhost in production
    if cfg!(not(debug_assertions)) && (redirect_uri.contains("localhost") || redirect_uri.contains("127.0.0.1")) {
        return Err(ApiError::configuration("Localhost redirect URIs not allowed in production"));
    }    let oauth = QuickBooksOAuth::new(qb_creds.clone(), redirect_uri)?;
    
    let tokens = oauth.exchange_code_for_tokens(&query.code).await?;
    
    // Store OAuth tokens
    credential_service.store_oauth_tokens(
        &tenant_id,
        "quickbooks",
        &tokens,
    ).await?;
    
    // Also update the realm_id in credentials
    let updated_creds = PlatformCredentials::QuickBooks(QuickBooksCredentials {
        client_id: qb_creds.client_id,
        client_secret: qb_creds.client_secret,
        realm_id: query.realm_id.clone(),
    });
    credential_service.store_credentials(&tenant_id, updated_creds).await?;
    
    // Update connection status
    let _ = update_connection_status(pool.get_ref(), &tenant_id, "quickbooks", true, None).await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "QuickBooks connected successfully",
        "realm_id": query.realm_id,
    })))
}

/// GET /api/integrations/quickbooks/status
/// Get QuickBooks connection status (no secrets returned)
pub async fn get_quickbooks_status(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let status = get_connection_status(pool.get_ref(), &tenant_id, "quickbooks").await?;
    Ok(HttpResponse::Ok().json(status))
}

/// DELETE /api/integrations/quickbooks/credentials
/// Remove QuickBooks credentials and tokens
pub async fn delete_quickbooks_credentials(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    credential_service.delete_credentials(&tenant_id, "quickbooks").await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "QuickBooks credentials deleted successfully"
    })))
}

/// POST /api/integrations/quickbooks/test
/// Test QuickBooks connection
pub async fn test_quickbooks_connection(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "quickbooks").await?
        .ok_or_else(|| ApiError::not_found("QuickBooks credentials not found"))?;
    
    let qb_creds = match creds {
        PlatformCredentials::QuickBooks(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    let tokens = credential_service.get_oauth_tokens(&tenant_id, "quickbooks").await?
        .ok_or_else(|| ApiError::not_found("QuickBooks tokens not found - please reconnect"))?;
    
    let client = QuickBooksClient::new(&qb_creds, &tokens)?;
    
    // Test connection by querying company info
    match client.query("SELECT * FROM CompanyInfo").await {
        Ok(response) => {
            // Update last_verified_at
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "quickbooks", true, None).await;
            
            // Try to parse response as JSON
            let details = response.json::<serde_json::Value>().await.ok();
            
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: true,
                message: "QuickBooks connection successful".to_string(),
                details,
            }))
        }
        Err(e) => {
            // Update status with error
            let error_msg = format!("Connection failed: {}", e);
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "quickbooks", false, Some(&error_msg)).await;
            
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: false,
                message: error_msg,
                details: None,
            }))
        }
    }
}

// ============================================================================
// Supabase Endpoints
// ============================================================================

/// POST /api/integrations/supabase/credentials
/// Store Supabase credentials (encrypted)
pub async fn store_supabase_credentials(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    payload: web::Json<StoreSupabaseCredentials>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let credentials = PlatformCredentials::Supabase(SupabaseCredentials {
        project_url: payload.project_url.clone(),
        service_role_key: payload.service_role_key.clone(),
    });
    
    credential_service.store_credentials(&tenant_id, credentials).await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Supabase credentials stored successfully"
    })))
}

/// GET /api/integrations/supabase/status
/// Get Supabase connection status (no secrets returned)
pub async fn get_supabase_status(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let status = get_connection_status(pool.get_ref(), &tenant_id, "supabase").await?;
    Ok(HttpResponse::Ok().json(status))
}

/// DELETE /api/integrations/supabase/credentials
/// Remove Supabase credentials
pub async fn delete_supabase_credentials(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    credential_service.delete_credentials(&tenant_id, "supabase").await?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Supabase credentials deleted successfully"
    })))
}

/// POST /api/integrations/supabase/test
/// Test Supabase connection
pub async fn test_supabase_connection(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "supabase").await?
        .ok_or_else(|| ApiError::not_found("Supabase credentials not found"))?;
    
    let supabase_creds = match creds {
        PlatformCredentials::Supabase(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    // Test connection by making a simple REST API call
    let client = reqwest::Client::new();
    let test_url = format!("{}/rest/v1/", supabase_creds.project_url.trim_end_matches('/'));
    
    match client
        .get(&test_url)
        .header("apikey", &supabase_creds.service_role_key)
        .header("Authorization", format!("Bearer {}", supabase_creds.service_role_key))
        .send()
        .await
    {
        Ok(response) if response.status().is_success() => {
            // Update last_verified_at
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "supabase", true, None).await;
            
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: true,
                message: "Supabase connection successful".to_string(),
                details: None,
            }))
        }
        Ok(response) => {
            let error_msg = format!("Connection failed with status: {}", response.status());
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "supabase", false, Some(&error_msg)).await;
            
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: false,
                message: error_msg,
                details: None,
            }))
        }
        Err(e) => {
            let error_msg = format!("Connection failed: {}", e);
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "supabase", false, Some(&error_msg)).await;
            
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: false,
                message: error_msg,
                details: None,
            }))
        }
    }
}

/// Response type for Supabase summary
#[derive(Debug, Serialize)]
pub struct SupabaseSummaryResponse {
    pub project_name: Option<String>,
    pub last_sync_at: Option<String>,
    pub pending_queue_count: i64,
}

/// GET /api/integrations/supabase/summary
/// Get Supabase integration summary
pub async fn get_supabase_summary(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    // Check if credentials exist
    let creds = credential_service.get_credentials(&tenant_id, "supabase").await?
        .ok_or_else(|| ApiError::not_found("Supabase credentials not found"))?;
    
    let supabase_creds = match creds {
        PlatformCredentials::Supabase(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    // Extract project name from URL (e.g., "https://myproject.supabase.co" -> "myproject")
    let project_name = supabase_creds.project_url
        .replace("https://", "")
        .replace("http://", "")
        .split('.')
        .next()
        .map(|s| s.to_string());
    
    // Get last sync time from integration_status
    let status = get_connection_status(pool.get_ref(), &tenant_id, "supabase").await?;
    let last_sync_at = if status.is_connected {
        Some(status.last_check)
    } else {
        None
    };
    
    // Get pending queue count from sync_queue table
    let pending_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sync_queue WHERE tenant_id = ? AND status = 'pending'"
    )
    .bind(tenant_id.to_string())
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);
    
    Ok(HttpResponse::Ok().json(SupabaseSummaryResponse {
        project_name,
        last_sync_at,
        pending_queue_count: pending_count,
    }))
}

// ============================================================================
// Stripe Endpoints (OAuth via Connect)
// ============================================================================

#[derive(Debug, Serialize)]
pub struct StripeAuthUrlResponse {
    pub auth_url: String,
    pub state: String,
}

#[derive(Debug, Deserialize)]
pub struct StripeCallbackQuery {
    pub code: String,
    pub state: String,
}

#[derive(Debug, Serialize)]
pub struct StripeSummaryResponse {
    pub business_name: Option<String>,
    pub country: Option<String>,
    pub default_currency: Option<String>,
    pub account_id_masked: String,
}

/// POST /api/integrations/stripe/auth-url
/// Generate Stripe Connect OAuth authorization URL
pub async fn get_stripe_auth_url(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let oauth = StripeOAuth::from_env()?;
    
    // Generate a random state token for CSRF protection
    let state = uuid::Uuid::new_v4().to_string();
    
    // Store state in database with 5-minute expiry
    let state_id = uuid::Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::minutes(5);
    
    sqlx::query(
        "INSERT INTO oauth_states (id, tenant_id, platform, state, expires_at, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))"
    )
    .bind(&state_id)
    .bind(tenant_id.to_string())
    .bind("stripe")
    .bind(&state)
    .bind(expires_at.to_rfc3339())
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to store OAuth state: {}", e)))?;
    
    let auth_url = oauth.get_authorization_url(&state);
    
    Ok(HttpResponse::Ok().json(StripeAuthUrlResponse {
        auth_url,
        state,
    }))
}

/// GET /api/integrations/stripe/callback
/// Handle Stripe Connect OAuth callback
pub async fn stripe_oauth_callback(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    query: web::Query<StripeCallbackQuery>,
) -> Result<HttpResponse, ApiError> {
    // Validate state parameter
    let state_result = sqlx::query_as::<_, (String, String)>(
        "SELECT id, expires_at FROM oauth_states 
         WHERE state = ? AND tenant_id = ? AND platform = 'stripe'"
    )
    .bind(&query.state)
    .bind(tenant_id.to_string())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to validate OAuth state: {}", e)))?;
    
    let (state_id, expires_at) = match state_result {
        Some((id, exp)) => (id, exp),
        None => {
            tracing::warn!("Invalid Stripe OAuth state received for tenant {}", tenant_id.to_string());
            return Err(ApiError::unauthorized("Invalid OAuth state - possible CSRF attack"));
        }
    };
    
    // Check if state has expired
    let expires_at_dt = chrono::DateTime::parse_from_rfc3339(&expires_at)
        .map_err(|e| ApiError::internal(format!("Failed to parse expiry: {}", e)))?;
    
    if chrono::Utc::now() > expires_at_dt {
        let _ = sqlx::query("DELETE FROM oauth_states WHERE id = ?")
            .bind(&state_id)
            .execute(pool.get_ref())
            .await;
        return Err(ApiError::unauthorized("OAuth state expired - please try again"));
    }
    
    // Delete state (one-time use)
    sqlx::query("DELETE FROM oauth_states WHERE id = ?")
        .bind(&state_id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to delete OAuth state: {}", e)))?;
    
    // Exchange code for tokens
    let oauth = StripeOAuth::from_env()?;
    let tokens = oauth.exchange_code_for_tokens(&query.code).await?;
    
    // Store credentials
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    let credentials = PlatformCredentials::Stripe(StripeConnectCredentials {
        stripe_user_id: tokens.stripe_user_id.clone(),
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        scope: tokens.scope,
    });
    credential_service.store_credentials(&tenant_id, credentials).await?;
    
    // Update connection status
    let _ = update_connection_status(pool.get_ref(), &tenant_id, "stripe", true, None).await;
    
    // Log the connection
    log_integration_event(pool.get_ref(), &tenant_id, "stripe", "info", "connected", "Stripe account connected successfully").await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Stripe connected successfully",
        "account_id": tokens.stripe_user_id,
    })))
}

/// GET /api/integrations/stripe/status
pub async fn get_stripe_status(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let status = get_connection_status(pool.get_ref(), &tenant_id, "stripe").await?;
    Ok(HttpResponse::Ok().json(status))
}

/// GET /api/integrations/stripe/summary
pub async fn get_stripe_summary(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "stripe").await?
        .ok_or_else(|| ApiError::not_found("Stripe credentials not found"))?;
    
    let stripe_creds = match creds {
        PlatformCredentials::Stripe(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    let client = StripeClient::new(stripe_creds.stripe_user_id)?;
    let summary = client.get_account_summary().await?;
    
    Ok(HttpResponse::Ok().json(StripeSummaryResponse {
        business_name: summary.business_name,
        country: summary.country,
        default_currency: summary.default_currency,
        account_id_masked: summary.account_id_masked,
    }))
}

/// POST /api/integrations/stripe/test
pub async fn test_stripe_connection(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "stripe").await?
        .ok_or_else(|| ApiError::not_found("Stripe credentials not found"))?;
    
    let stripe_creds = match creds {
        PlatformCredentials::Stripe(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    let client = StripeClient::new(stripe_creds.stripe_user_id)?;
    
    match client.test_connection().await {
        Ok(true) => {
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "stripe", true, None).await;
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: true,
                message: "Stripe connection successful".to_string(),
                details: None,
            }))
        }
        Ok(false) | Err(_) => {
            let error_msg = "Connection test failed";
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "stripe", false, Some(error_msg)).await;
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: false,
                message: error_msg.to_string(),
                details: None,
            }))
        }
    }
}

/// DELETE /api/integrations/stripe/disconnect
pub async fn disconnect_stripe(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    credential_service.delete_credentials(&tenant_id, "stripe").await?;
    
    log_integration_event(pool.get_ref(), &tenant_id, "stripe", "info", "disconnected", "Stripe account disconnected").await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Stripe disconnected successfully"
    })))
}

/// GET /api/integrations/stripe/logs
pub async fn get_stripe_logs(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    get_integration_logs(pool.get_ref(), &tenant_id, "stripe").await
}

// ============================================================================
// Square Endpoints (API Key)
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct StoreSquareCredentials {
    pub access_token: String,
    pub location_id: String,
}

#[derive(Debug, Serialize)]
pub struct SquareSummaryResponse {
    pub location_name: Option<String>,
    pub address: Option<String>,
    pub capabilities: Vec<String>,
}

/// POST /api/integrations/square/credentials
pub async fn store_square_credentials(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    payload: web::Json<StoreSquareCredentials>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let credentials = PlatformCredentials::Square(SquareCredentials {
        access_token: payload.access_token.clone(),
        location_id: payload.location_id.clone(),
    });
    
    credential_service.store_credentials(&tenant_id, credentials).await?;
    let _ = update_connection_status(pool.get_ref(), &tenant_id, "square", true, None).await;
    
    log_integration_event(pool.get_ref(), &tenant_id, "square", "info", "connected", "Square credentials stored").await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Square credentials stored successfully"
    })))
}

/// GET /api/integrations/square/status
pub async fn get_square_status(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let status = get_connection_status(pool.get_ref(), &tenant_id, "square").await?;
    Ok(HttpResponse::Ok().json(status))
}

/// GET /api/integrations/square/summary
pub async fn get_square_summary(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "square").await?
        .ok_or_else(|| ApiError::not_found("Square credentials not found"))?;
    
    let square_creds = match creds {
        PlatformCredentials::Square(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    let client = SquareClient::new(crate::connectors::square::client::SquareCredentials {
        access_token: square_creds.access_token,
        location_id: square_creds.location_id,
    })?;
    let summary = client.get_location_summary().await?;
    
    Ok(HttpResponse::Ok().json(SquareSummaryResponse {
        location_name: summary.location_name,
        address: summary.address,
        capabilities: summary.capabilities,
    }))
}

/// POST /api/integrations/square/test
pub async fn test_square_connection(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "square").await?
        .ok_or_else(|| ApiError::not_found("Square credentials not found"))?;
    
    let square_creds = match creds {
        PlatformCredentials::Square(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    let client = SquareClient::new(crate::connectors::square::client::SquareCredentials {
        access_token: square_creds.access_token,
        location_id: square_creds.location_id,
    })?;
    
    match client.test_connection().await {
        Ok(true) => {
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "square", true, None).await;
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: true,
                message: "Square connection successful".to_string(),
                details: None,
            }))
        }
        Ok(false) | Err(_) => {
            let error_msg = "Connection test failed";
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "square", false, Some(error_msg)).await;
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: false,
                message: error_msg.to_string(),
                details: None,
            }))
        }
    }
}

/// DELETE /api/integrations/square/disconnect
pub async fn disconnect_square(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    credential_service.delete_credentials(&tenant_id, "square").await?;
    
    log_integration_event(pool.get_ref(), &tenant_id, "square", "info", "disconnected", "Square disconnected").await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Square disconnected successfully"
    })))
}

/// GET /api/integrations/square/logs
pub async fn get_square_logs(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    get_integration_logs(pool.get_ref(), &tenant_id, "square").await
}

// ============================================================================
// Clover Endpoints (OAuth)
// ============================================================================

#[derive(Debug, Serialize)]
pub struct CloverAuthUrlResponse {
    pub auth_url: String,
    pub state: String,
}

#[derive(Debug, Deserialize)]
pub struct CloverCallbackQuery {
    pub code: String,
    pub state: String,
    pub merchant_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CloverSummaryResponse {
    pub merchant_name: Option<String>,
    pub address: Option<String>,
}

/// POST /api/integrations/clover/auth-url
pub async fn get_clover_auth_url(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let oauth = CloverOAuth::from_env()?;
    
    let state = uuid::Uuid::new_v4().to_string();
    let state_id = uuid::Uuid::new_v4().to_string();
    let expires_at = chrono::Utc::now() + chrono::Duration::minutes(5);
    
    sqlx::query(
        "INSERT INTO oauth_states (id, tenant_id, platform, state, expires_at, created_at) 
         VALUES (?, ?, ?, ?, ?, datetime('now'))"
    )
    .bind(&state_id)
    .bind(tenant_id.to_string())
    .bind("clover")
    .bind(&state)
    .bind(expires_at.to_rfc3339())
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to store OAuth state: {}", e)))?;
    
    let auth_url = oauth.get_authorization_url(&state);
    
    Ok(HttpResponse::Ok().json(CloverAuthUrlResponse {
        auth_url,
        state,
    }))
}

/// GET /api/integrations/clover/callback
pub async fn clover_oauth_callback(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    query: web::Query<CloverCallbackQuery>,
) -> Result<HttpResponse, ApiError> {
    // Validate state
    let state_result = sqlx::query_as::<_, (String, String)>(
        "SELECT id, expires_at FROM oauth_states 
         WHERE state = ? AND tenant_id = ? AND platform = 'clover'"
    )
    .bind(&query.state)
    .bind(tenant_id.to_string())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to validate OAuth state: {}", e)))?;
    
    let (state_id, expires_at) = match state_result {
        Some((id, exp)) => (id, exp),
        None => {
            return Err(ApiError::unauthorized("Invalid OAuth state"));
        }
    };
    
    let expires_at_dt = chrono::DateTime::parse_from_rfc3339(&expires_at)
        .map_err(|e| ApiError::internal(format!("Failed to parse expiry: {}", e)))?;
    
    if chrono::Utc::now() > expires_at_dt {
        let _ = sqlx::query("DELETE FROM oauth_states WHERE id = ?")
            .bind(&state_id)
            .execute(pool.get_ref())
            .await;
        return Err(ApiError::unauthorized("OAuth state expired"));
    }
    
    sqlx::query("DELETE FROM oauth_states WHERE id = ?")
        .bind(&state_id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to delete OAuth state: {}", e)))?;
    
    // Exchange code for tokens
    let oauth = CloverOAuth::from_env()?;
    let tokens = oauth.exchange_code_for_tokens(&query.code).await?;
    
    // Store credentials
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    let credentials = PlatformCredentials::Clover(CloverCredentials {
        access_token: tokens.access_token.clone(),
        merchant_id: tokens.merchant_id.clone(),
    });
    credential_service.store_credentials(&tenant_id, credentials).await?;
    
    let _ = update_connection_status(pool.get_ref(), &tenant_id, "clover", true, None).await;
    log_integration_event(pool.get_ref(), &tenant_id, "clover", "info", "connected", "Clover account connected").await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Clover connected successfully",
        "merchant_id": tokens.merchant_id,
    })))
}

/// GET /api/integrations/clover/status
pub async fn get_clover_status(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let status = get_connection_status(pool.get_ref(), &tenant_id, "clover").await?;
    Ok(HttpResponse::Ok().json(status))
}

/// GET /api/integrations/clover/summary
pub async fn get_clover_summary(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "clover").await?
        .ok_or_else(|| ApiError::not_found("Clover credentials not found"))?;
    
    let clover_creds = match creds {
        PlatformCredentials::Clover(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    let client = CloverClient::new(CloverTokens {
        access_token: clover_creds.access_token,
        merchant_id: clover_creds.merchant_id,
    })?;
    let summary = client.get_merchant_summary().await?;
    
    Ok(HttpResponse::Ok().json(CloverSummaryResponse {
        merchant_name: summary.merchant_name,
        address: summary.address,
    }))
}

/// POST /api/integrations/clover/test
pub async fn test_clover_connection(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    
    let creds = credential_service.get_credentials(&tenant_id, "clover").await?
        .ok_or_else(|| ApiError::not_found("Clover credentials not found"))?;
    
    let clover_creds = match creds {
        PlatformCredentials::Clover(c) => c,
        _ => return Err(ApiError::internal("Invalid credential type")),
    };
    
    let client = CloverClient::new(CloverTokens {
        access_token: clover_creds.access_token,
        merchant_id: clover_creds.merchant_id,
    })?;
    
    match client.test_connection().await {
        Ok(true) => {
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "clover", true, None).await;
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: true,
                message: "Clover connection successful".to_string(),
                details: None,
            }))
        }
        Ok(false) | Err(_) => {
            let error_msg = "Connection test failed";
            let _ = update_connection_status(pool.get_ref(), &tenant_id, "clover", false, Some(error_msg)).await;
            Ok(HttpResponse::Ok().json(TestConnectionResponse {
                success: false,
                message: error_msg.to_string(),
                details: None,
            }))
        }
    }
}

/// DELETE /api/integrations/clover/disconnect
pub async fn disconnect_clover(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    credential_service.delete_credentials(&tenant_id, "clover").await?;
    
    log_integration_event(pool.get_ref(), &tenant_id, "clover", "info", "disconnected", "Clover disconnected").await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Clover disconnected successfully"
    })))
}

/// GET /api/integrations/clover/logs
pub async fn get_clover_logs(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    get_integration_logs(pool.get_ref(), &tenant_id, "clover").await
}

// ============================================================================
// General Endpoints
// ============================================================================

/// GET /api/integrations/connections
/// Get all connector statuses for tenant
pub async fn get_all_connections(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let platforms = vec!["woocommerce", "quickbooks", "supabase", "stripe", "square", "clover"];
    let mut connections = Vec::new();
    
    for platform in platforms {
        match get_connection_status(pool.get_ref(), &tenant_id, platform).await {
            Ok(status) => connections.push(status),
            Err(_) => {
                // If no credentials exist, return disconnected status
                connections.push(ConnectionStatus {
                    platform: platform.to_string(),
                    is_connected: false,
                    last_check: chrono::Utc::now().to_rfc3339(),
                    error_message: None,
                });
            }
        }
    }
    
    Ok(HttpResponse::Ok().json(ConnectionsResponse { connections }))
}

// ============================================================================
// Helper Functions
// ============================================================================

async fn get_connection_status(
    pool: &SqlitePool,
    tenant_id: &str,
    platform: &str,
) -> Result<ConnectionStatus, ApiError> {
    let row = sqlx::query(
        r#"
        SELECT is_active, last_verified_at, last_error
        FROM integration_status
        WHERE tenant_id = ? AND platform = ?
        "#
    )
    .bind(tenant_id)
    .bind(platform)
    .fetch_optional(pool)
    .await
    .map_err(|e| ApiError::internal_server_error(format!("Database error: {}", e)))?;
    
    match row {
        Some(row) => {
            use sqlx::Row;
            Ok(ConnectionStatus {
                platform: platform.to_string(),
                is_connected: row.get::<i32, _>("is_active") == 1,
                last_check: row.get::<Option<String>, _>("last_verified_at").unwrap_or_else(|| chrono::Utc::now().to_rfc3339()),
                error_message: row.get("last_error"),
            })
        },
        None => Ok(ConnectionStatus {
            platform: platform.to_string(),
            is_connected: false,
            last_check: chrono::Utc::now().to_rfc3339(),
            error_message: None,
        }),
    }
}

async fn update_connection_status(
    pool: &SqlitePool,
    tenant_id: &str,
    platform: &str,
    is_active: bool,
    error: Option<&str>,
) -> Result<(), ApiError> {
    let now = chrono::Utc::now().to_rfc3339();
    let is_active_int = if is_active { 1 } else { 0 };
    
    sqlx::query(
        r#"
        INSERT INTO integration_status (tenant_id, platform, is_active, last_verified_at, last_error, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(tenant_id, platform) DO UPDATE SET
            is_active = excluded.is_active,
            last_verified_at = excluded.last_verified_at,
            last_error = excluded.last_error,
            updated_at = excluded.updated_at
        "#
    )
    .bind(tenant_id)
    .bind(platform)
    .bind(is_active_int)
    .bind(&now)
    .bind(error)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| ApiError::internal_server_error(format!("Database error: {}", e)))?;
    
    Ok(())
}

/// Log an integration event
async fn log_integration_event(
    pool: &SqlitePool,
    tenant_id: &str,
    platform: &str,
    level: &str,
    event: &str,
    message: &str,
) {
    let id = uuid::Uuid::new_v4().to_string();
    let _ = sqlx::query(
        "INSERT INTO integration_logs (id, tenant_id, platform, level, event, message, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
    )
    .bind(&id)
    .bind(tenant_id)
    .bind(platform)
    .bind(level)
    .bind(event)
    .bind(message)
    .execute(pool)
    .await;
}

/// Get integration logs for a platform
async fn get_integration_logs(
    pool: &SqlitePool,
    tenant_id: &str,
    platform: &str,
) -> Result<HttpResponse, ApiError> {
    let logs: Vec<(String, String, String, String, String, String)> = sqlx::query_as(
        "SELECT id, level, event, message, details, created_at 
         FROM integration_logs 
         WHERE tenant_id = ? AND platform = ? 
         ORDER BY created_at DESC 
         LIMIT 100"
    )
    .bind(tenant_id)
    .bind(platform)
    .fetch_all(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Failed to fetch logs: {}", e)))?;
    
    let log_entries: Vec<serde_json::Value> = logs.iter().map(|(id, level, event, message, details, created_at)| {
        serde_json::json!({
            "id": id,
            "level": level,
            "event": event,
            "message": message,
            "details": details,
            "timestamp": created_at,
        })
    }).collect();
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "logs": log_entries
    })))
}

// ============================================================================
// Route Configuration
// ============================================================================

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/integrations")
            // WooCommerce routes
            .route("/woocommerce/credentials", web::post().to(store_woocommerce_credentials))
            .route("/woocommerce/credentials", web::delete().to(delete_woocommerce_credentials))
            .route("/woocommerce/status", web::get().to(get_woocommerce_status))
            .route("/woocommerce/test", web::post().to(test_woocommerce_connection))
            // QuickBooks routes
            .route("/quickbooks/auth-url", web::post().to(get_quickbooks_auth_url))
            .route("/quickbooks/callback", web::get().to(quickbooks_oauth_callback))
            .route("/quickbooks/credentials", web::delete().to(delete_quickbooks_credentials))
            .route("/quickbooks/status", web::get().to(get_quickbooks_status))
            .route("/quickbooks/test", web::post().to(test_quickbooks_connection))
            // Supabase routes
            .route("/supabase/credentials", web::post().to(store_supabase_credentials))
            .route("/supabase/credentials", web::delete().to(delete_supabase_credentials))
            .route("/supabase/status", web::get().to(get_supabase_status))
            .route("/supabase/summary", web::get().to(get_supabase_summary))
            .route("/supabase/test", web::post().to(test_supabase_connection))
            // Stripe routes (OAuth via Connect)
            .route("/stripe/auth-url", web::post().to(get_stripe_auth_url))
            .route("/stripe/callback", web::get().to(stripe_oauth_callback))
            .route("/stripe/status", web::get().to(get_stripe_status))
            .route("/stripe/summary", web::get().to(get_stripe_summary))
            .route("/stripe/test", web::post().to(test_stripe_connection))
            .route("/stripe/disconnect", web::delete().to(disconnect_stripe))
            .route("/stripe/logs", web::get().to(get_stripe_logs))
            // Square routes (API Key)
            .route("/square/credentials", web::post().to(store_square_credentials))
            .route("/square/status", web::get().to(get_square_status))
            .route("/square/summary", web::get().to(get_square_summary))
            .route("/square/test", web::post().to(test_square_connection))
            .route("/square/disconnect", web::delete().to(disconnect_square))
            .route("/square/logs", web::get().to(get_square_logs))
            // Clover routes (OAuth)
            .route("/clover/auth-url", web::post().to(get_clover_auth_url))
            .route("/clover/callback", web::get().to(clover_oauth_callback))
            .route("/clover/status", web::get().to(get_clover_status))
            .route("/clover/summary", web::get().to(get_clover_summary))
            .route("/clover/test", web::post().to(test_clover_connection))
            .route("/clover/disconnect", web::delete().to(disconnect_clover))
            .route("/clover/logs", web::get().to(get_clover_logs))
            // General routes
            .route("/connections", web::get().to(get_all_connections))
    );
}
