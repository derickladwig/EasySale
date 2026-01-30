/**
 * Session Management
 * 
 * User session creation, validation, and cleanup
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

use actix_web::{post, web, HttpResponse};
use sqlx::SqlitePool;
use serde::{Deserialize, Serialize};
use chrono::Utc;

use crate::models::{ApiError, Session};

// ============================================================================
// Session Creation
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CreateSessionRequestBody {
    pub user_id: String,
    pub tenant_id: String,
    pub duration_minutes: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct CreateSessionResponse {
    pub session: Session,
    pub token: String,
}

/// Create a new user session
/// 
/// Requirements: 8.1
#[post("/api/sessions/create")]
pub async fn create_session(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateSessionRequestBody>,
) -> Result<HttpResponse, ApiError> {
    let session_id = uuid::Uuid::new_v4().to_string();
    let token = uuid::Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    let duration_minutes = req.duration_minutes.unwrap_or(480); // Default 8 hours
    let expires_at = Utc::now() + chrono::Duration::minutes(duration_minutes as i64);
    
    let session = Session {
        id: session_id.clone(),
        user_id: req.user_id.clone(),
        tenant_id: req.tenant_id.clone(),
        token: token.clone(),
        created_at: now.clone(),
        expires_at: expires_at.to_rfc3339(),
    };
    
    // Insert session into database
    sqlx::query(
        "INSERT INTO sessions (id, user_id, tenant_id, token, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&session.id)
    .bind(&session.user_id)
    .bind(&session.tenant_id)
    .bind(&session.token)
    .bind(&session.created_at)
    .bind(&session.expires_at)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to create session: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(CreateSessionResponse {
        session,
        token,
    }))
}

// ============================================================================
// Session Validation
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ValidateSessionRequest {
    pub token: String,
}

#[derive(Debug, Serialize)]
pub struct ValidateSessionResponse {
    pub valid: bool,
    pub session: Option<Session>,
    pub reason: Option<String>,
}

/// Validate a session token
/// 
/// Requirements: 8.2
#[post("/api/sessions/validate")]
pub async fn validate_session(
    pool: web::Data<SqlitePool>,
    req: web::Json<ValidateSessionRequest>,
) -> Result<HttpResponse, ApiError> {
    let session = sqlx::query_as::<_, Session>(
        "SELECT * FROM sessions WHERE token = ?"
    )
    .bind(&req.token)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to query session: {}", e)))?;
    
    if let Some(session) = session {
        // Check if expired
        if session.is_expired() {
            return Ok(HttpResponse::Ok().json(ValidateSessionResponse {
                valid: false,
                session: None,
                reason: Some("Session expired".to_string()),
            }));
        }
        
        Ok(HttpResponse::Ok().json(ValidateSessionResponse {
            valid: true,
            session: Some(session),
            reason: None,
        }))
    } else {
        Ok(HttpResponse::Ok().json(ValidateSessionResponse {
            valid: false,
            session: None,
            reason: Some("Session not found".to_string()),
        }))
    }
}

// ============================================================================
// Session Termination
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct TerminateSessionRequest {
    pub token: String,
}

/// Terminate a session (logout)
/// 
/// Requirements: 8.3
#[post("/api/sessions/terminate")]
pub async fn terminate_session(
    pool: web::Data<SqlitePool>,
    req: web::Json<TerminateSessionRequest>,
) -> Result<HttpResponse, ApiError> {
    sqlx::query("DELETE FROM sessions WHERE token = ?")
        .bind(&req.token)
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to terminate session: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Session terminated"
    })))
}

// ============================================================================
// Session Cleanup
// ============================================================================

/// Clean up expired sessions
/// 
/// Requirements: 8.3
#[post("/api/sessions/cleanup")]
pub async fn cleanup_expired_sessions(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, ApiError> {
    let now = Utc::now().to_rfc3339();
    
    let result = sqlx::query("DELETE FROM sessions WHERE expires_at < ?")
        .bind(&now)
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to cleanup sessions: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "cleaned_up": result.rows_affected()
    })))
}

// ============================================================================
// Get Active Sessions
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GetActiveSessionsRequest {
    pub tenant_id: String,
    pub user_id: Option<String>,
}

/// Get active sessions for a tenant or user
/// 
/// Requirements: 8.1
#[post("/api/sessions/active")]
pub async fn get_active_sessions(
    pool: web::Data<SqlitePool>,
    req: web::Json<GetActiveSessionsRequest>,
) -> Result<HttpResponse, ApiError> {
    let now = Utc::now().to_rfc3339();
    
    let sessions = if let Some(user_id) = &req.user_id {
        sqlx::query_as::<_, Session>(
            "SELECT * FROM sessions WHERE tenant_id = ? AND user_id = ? AND expires_at > ? ORDER BY created_at DESC"
        )
        .bind(&req.tenant_id)
        .bind(user_id)
        .bind(&now)
        .fetch_all(pool.get_ref())
        .await
    } else {
        sqlx::query_as::<_, Session>(
            "SELECT * FROM sessions WHERE tenant_id = ? AND expires_at > ? ORDER BY created_at DESC"
        )
        .bind(&req.tenant_id)
        .bind(&now)
        .fetch_all(pool.get_ref())
        .await
    }
    .map_err(|e| ApiError::internal(format!("Failed to query sessions: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "sessions": sessions,
        "count": sessions.len()
    })))
}

/// Configure session management routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(create_session)
        .service(validate_session)
        .service(terminate_session)
        .service(cleanup_expired_sessions)
        .service(get_active_sessions);
}
