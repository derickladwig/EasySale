/**
 * Google Drive OAuth Handlers
 * 
 * Handles OAuth 2.0 flow for Google Drive backup destinations
 * 
 * Requirements: 4.1 (Google Drive OAuth Synchronization)
 */

use actix_web::{get, post, web, HttpResponse};
use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::models::errors::ApiError;
use crate::models::backup::BackupDestination;
use crate::connectors::google_drive::{GoogleDriveCredentials, GoogleDriveOAuth};
use crate::services::{AuditLogger, CredentialService};

/// Request to initiate Google Drive OAuth connection
#[derive(Debug, Deserialize)]
pub struct ConnectGoogleDriveRequest {
    pub tenant_id: String,
    pub name: String,  // Friendly name for the destination
    pub folder_path: Option<String>,  // Optional folder path in Drive
}

/// Response with OAuth authorization URL
#[derive(Debug, Serialize)]
pub struct ConnectGoogleDriveResponse {
    pub authorization_url: String,
    pub state: String,  // CSRF token to verify callback
}

/// OAuth callback parameters
#[derive(Debug, Deserialize)]
pub struct OAuthCallbackQuery {
    pub code: Option<String>,
    pub state: Option<String>,
    pub error: Option<String>,
    pub error_description: Option<String>,
}

/// Response after successful OAuth connection
#[derive(Debug, Serialize)]
pub struct OAuthCallbackResponse {
    pub success: bool,
    pub destination_id: Option<String>,
    pub message: String,
}

/// Initiate Google Drive OAuth connection
/// 
/// POST /api/backups/destinations/gdrive/connect
/// 
/// This endpoint generates an OAuth authorization URL that the user should open
/// in their browser to authorize the application to access their Google Drive.
#[post("/api/backups/destinations/gdrive/connect")]
pub async fn connect_google_drive(
    pool: web::Data<SqlitePool>,
    req: web::Json<ConnectGoogleDriveRequest>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, ApiError> {
    let user_id = query.get("user_id").map(|s| s.as_str());
    let store_id = query.get("store_id").map(|s| s.as_str()).unwrap_or("store-1");
    
    // Get Google Drive credentials from environment
    let client_id = std::env::var("GOOGLE_DRIVE_CLIENT_ID")
        .map_err(|_| ApiError::internal("GOOGLE_DRIVE_CLIENT_ID not configured"))?;
    let client_secret = std::env::var("GOOGLE_DRIVE_CLIENT_SECRET")
        .map_err(|_| ApiError::internal("GOOGLE_DRIVE_CLIENT_SECRET not configured"))?;
    
    let credentials = GoogleDriveCredentials {
        client_id,
        client_secret,
    };
    
    // Get redirect URI from environment (required)
    let redirect_uri = std::env::var("GOOGLE_DRIVE_REDIRECT_URI")
        .map_err(|_| ApiError::configuration("GOOGLE_DRIVE_REDIRECT_URI not configured"))?;
    
    // Create OAuth client
    let oauth = GoogleDriveOAuth::new(credentials, redirect_uri)?;
    
    // Generate CSRF state token
    let state = Uuid::new_v4().to_string();
    
    // Store state in database for verification (with expiry)
    let expires_at = chrono::Utc::now() + chrono::Duration::minutes(10);
    sqlx::query(
        "INSERT INTO oauth_states (state, tenant_id, platform, destination_name, folder_path, expires_at, created_at)
         VALUES (?, ?, 'google_drive', ?, ?, ?, ?)"
    )
    .bind(&state)
    .bind(&req.tenant_id)
    .bind(&req.name)
    .bind(&req.folder_path)
    .bind(expires_at.to_rfc3339())
    .bind(chrono::Utc::now().to_rfc3339())
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to store OAuth state: {}", e)))?;
    
    // Generate authorization URL
    let authorization_url = oauth.get_authorization_url(&state);
    
    // Log OAuth initiation
    let audit_logger = AuditLogger::new(pool.get_ref().clone());
    let _ = audit_logger.log_create(
        "google_drive_oauth",
        &state,
        serde_json::json!({
            "action": "initiate",
            "destination_name": &req.name,
            "tenant_id": &req.tenant_id,
        }),
        user_id,
        false,
        store_id,
    ).await;
    
    Ok(HttpResponse::Ok().json(ConnectGoogleDriveResponse {
        authorization_url,
        state,
    }))
}

/// Handle OAuth callback from Google
/// 
/// GET /api/backups/destinations/gdrive/callback?code=...&state=...
/// 
/// This endpoint is called by Google after the user authorizes the application.
/// It exchanges the authorization code for access and refresh tokens, then stores
/// them encrypted in the backup_destinations table.
#[get("/api/backups/destinations/gdrive/callback")]
pub async fn google_drive_callback(
    pool: web::Data<SqlitePool>,
    query: web::Query<OAuthCallbackQuery>,
) -> Result<HttpResponse, ApiError> {
    // Check for OAuth errors
    if let Some(error) = &query.error {
        let error_desc = query.error_description.as_deref().unwrap_or("Unknown error");
        return Ok(HttpResponse::BadRequest().json(OAuthCallbackResponse {
            success: false,
            destination_id: None,
            message: format!("OAuth error: {} - {}", error, error_desc),
        }));
    }
    
    // Verify required parameters
    let code = query.code.as_ref()
        .ok_or_else(|| ApiError::bad_request("Missing authorization code"))?;
    let state = query.state.as_ref()
        .ok_or_else(|| ApiError::bad_request("Missing state parameter"))?;
    
    // Verify state token and get stored OAuth request data
    let oauth_state: Option<(String, String, Option<String>, String)> = sqlx::query_as(
        "SELECT tenant_id, destination_name, folder_path, expires_at 
         FROM oauth_states 
         WHERE state = ? AND platform = 'google_drive'"
    )
    .bind(state)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to verify OAuth state: {}", e)))?;
    
    let (tenant_id, destination_name, folder_path, expires_at_str) = oauth_state
        .ok_or_else(|| ApiError::bad_request("Invalid or expired state token"))?;
    
    // Check if state has expired
    let expires_at = chrono::DateTime::parse_from_rfc3339(&expires_at_str)
        .map_err(|_| ApiError::internal("Invalid expiry timestamp"))?;
    if chrono::Utc::now() > expires_at {
        return Err(ApiError::bad_request("OAuth state has expired. Please try again."));
    }
    
    // Get Google Drive credentials from environment
    let client_id = std::env::var("GOOGLE_DRIVE_CLIENT_ID")
        .map_err(|_| ApiError::internal("GOOGLE_DRIVE_CLIENT_ID not configured"))?;
    let client_secret = std::env::var("GOOGLE_DRIVE_CLIENT_SECRET")
        .map_err(|_| ApiError::internal("GOOGLE_DRIVE_CLIENT_SECRET not configured"))?;
    
    let credentials = GoogleDriveCredentials {
        client_id,
        client_secret,
    };
    
    // Get redirect URI (required)
    let redirect_uri = std::env::var("GOOGLE_DRIVE_REDIRECT_URI")
        .map_err(|_| ApiError::configuration("GOOGLE_DRIVE_REDIRECT_URI not configured"))?;
    
    // Create OAuth client
    let oauth = GoogleDriveOAuth::new(credentials, redirect_uri)?;
    
    // Exchange code for tokens
    let tokens = oauth.exchange_code_for_tokens(code).await?;
    
    // Encrypt tokens before storing using CredentialService
    let credential_service = CredentialService::new(pool.get_ref().clone())?;
    let tokens_json = serde_json::to_string(&tokens)
        .map_err(|e| ApiError::internal(format!("Failed to serialize tokens: {}", e)))?;
    let tokens_encrypted = credential_service.encrypt_data(&tokens_json)?;
    
    // Create backup destination record
    let destination_id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO backup_destinations (
            id, tenant_id, destination_type, name, enabled,
            refresh_token_encrypted, folder_path,
            auto_upload_db, auto_upload_file, auto_upload_full,
            last_upload_status,
            created_at, updated_at
         ) VALUES (?, ?, 'google_drive', ?, 1, ?, ?, 1, 1, 1, 'connected', ?, ?)"
    )
    .bind(&destination_id)
    .bind(&tenant_id)
    .bind(&destination_name)
    .bind(&tokens_encrypted)  // Now properly encrypted
    .bind(&folder_path)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to create backup destination: {}", e)))?;
    
    // Delete used OAuth state
    sqlx::query("DELETE FROM oauth_states WHERE state = ?")
        .bind(state)
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to delete OAuth state: {}", e)))?;
    
    // Log successful connection
    let audit_logger = AuditLogger::new(pool.get_ref().clone());
    let _ = audit_logger.log_create(
        "backup_destination",
        &destination_id,
        serde_json::json!({
            "destination_type": "google_drive",
            "name": &destination_name,
            "tenant_id": &tenant_id,
        }),
        None,
        false,
        "system",
    ).await;
    
    Ok(HttpResponse::Ok().json(OAuthCallbackResponse {
        success: true,
        destination_id: Some(destination_id),
        message: "Google Drive connected successfully".to_string(),
    }))
}

/// Get Google Drive connection status
/// 
/// GET /api/backups/destinations/gdrive/status?tenant_id=...
#[get("/api/backups/destinations/gdrive/status")]
pub async fn get_google_drive_status(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = query.get("tenant_id")
        .ok_or_else(|| ApiError::bad_request("Missing tenant_id parameter"))?;
    
    // Get all Google Drive destinations for this tenant
    let destinations = sqlx::query_as::<_, BackupDestination>(
        "SELECT * FROM backup_destinations 
         WHERE tenant_id = ? AND destination_type = 'google_drive'
         ORDER BY created_at DESC"
    )
    .bind(tenant_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to fetch destinations: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "destinations": destinations,
        "count": destinations.len(),
    })))
}

/// Disconnect Google Drive destination
/// 
/// DELETE /api/backups/destinations/gdrive/{destination_id}
#[actix_web::delete("/api/backups/destinations/gdrive/{destination_id}")]
pub async fn disconnect_google_drive(
    pool: web::Data<SqlitePool>,
    destination_id: web::Path<String>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> Result<HttpResponse, ApiError> {
    let user_id = query.get("user_id").map(|s| s.as_str());
    let store_id = query.get("store_id").map(|s| s.as_str()).unwrap_or("store-1");
    
    // Get destination to verify it exists and get tokens for revocation
    let destination = sqlx::query_as::<_, BackupDestination>(
        "SELECT * FROM backup_destinations WHERE id = ?"
    )
    .bind(destination_id.as_str())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to fetch destination: {}", e)))?
    .ok_or_else(|| ApiError::not_found("Destination not found"))?;
    
    // Optionally revoke tokens with Google
    if let Some(tokens_encrypted) = &destination.refresh_token_encrypted {
        // TODO: Decrypt tokens and revoke with Google
        // For now, we'll just delete the record
        let _ = tokens_encrypted; // Suppress unused warning
    }
    
    // Delete destination
    sqlx::query("DELETE FROM backup_destinations WHERE id = ?")
        .bind(destination_id.as_str())
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to delete destination: {}", e)))?;
    
    // Log disconnection
    let audit_logger = AuditLogger::new(pool.get_ref().clone());
    let _ = audit_logger.log_delete(
        "backup_destination",
        destination_id.as_str(),
        serde_json::json!({
            "destination_type": "google_drive",
            "name": &destination.name,
        }),
        user_id,
        false,
        store_id,
    ).await;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Google Drive destination disconnected successfully"
    })))
}
