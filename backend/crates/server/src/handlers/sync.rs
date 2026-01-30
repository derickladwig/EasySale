use actix_web::{web, HttpResponse, Result, post, get, put};
use chrono::Utc;
use serde_json::json;
use sqlx::SqlitePool;
use std::collections::HashMap;
use uuid::Uuid;

use crate::models::{
    SyncAuditLog as AuditLog, ConflictResolution, CreateAuditLog, CreateSyncQueueItem, SyncConflict,
    SyncQueueItem, SyncState, SyncStats,
};

// Queue a transaction for sync
#[post("/api/sync/queue")]
pub async fn queue_sync_operation(
    pool: web::Data<SqlitePool>,
    item: web::Json<CreateSyncQueueItem>,
) -> Result<HttpResponse> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        r#"
        INSERT INTO sync_queue (id, entity_type, entity_id, operation, payload, sync_status, created_at, updated_at, store_id)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        "#
    )
    .bind(&id)
    .bind(&item.entity_type)
    .bind(&item.entity_id)
    .bind(&item.operation)
    .bind(&item.payload)
    .bind(&now)
    .bind(&now)
    .bind(&item.store_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let queue_item = sqlx::query_as::<_, SyncQueueItem>(
        r#"SELECT * FROM sync_queue WHERE id = ?"#
    )
    .bind(&id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Created().json(queue_item))
}

// Get sync queue status
#[get("/api/sync/status")]
pub async fn get_sync_status(
    pool: web::Data<SqlitePool>,
    health_check: web::Data<crate::services::HealthCheckService>,
) -> Result<HttpResponse> {
    let pending_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM sync_queue WHERE sync_status = 'pending'"#
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let failed_count: i64 = sqlx::query_scalar(
        r#"SELECT COUNT(*) FROM sync_queue WHERE sync_status = 'failed'"#
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let last_sync: Option<String> = sqlx::query_scalar(
        r#"SELECT MAX(synced_at) FROM sync_log WHERE sync_status = 'success'"#
    )
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    // Task 22.1: Check actual internet connectivity
    let is_online = health_check.check_internet_connectivity().await;

    let stats = SyncStats {
        pending_count: pending_count as i32,
        failed_count: failed_count as i32,
        last_sync_at: last_sync,
        is_online,
    };

    Ok(HttpResponse::Ok().json(stats))
}

// Get pending sync items
#[get("/api/sync/pending")]
pub async fn get_pending_sync_items(pool: web::Data<SqlitePool>) -> Result<HttpResponse> {
    let items = sqlx::query_as::<_, SyncQueueItem>(
        r#"
        SELECT * FROM sync_queue 
        WHERE sync_status = 'pending' 
        ORDER BY created_at ASC 
        LIMIT 100
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(items))
}

// Mark sync item as completed
#[put("/api/sync/{sync_id}/complete")]
pub async fn mark_sync_completed(
    pool: web::Data<SqlitePool>,
    sync_id: web::Path<String>,
) -> Result<HttpResponse> {
    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        r#"
        UPDATE sync_queue 
        SET sync_status = 'completed', updated_at = ?
        WHERE id = ?
        "#
    )
    .bind(&now)
    .bind(sync_id.as_str())
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if result.rows_affected() == 0 {
        return Ok(HttpResponse::NotFound().json(json!({
            "error": "Sync item not found"
        })));
    }

    // Log the sync
    let log_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO sync_log (id, sync_queue_id, operation, entity_type, entity_id, source_store_id, sync_status, synced_at)
        SELECT ?, id, operation, entity_type, entity_id, store_id, 'success', ?
        FROM sync_queue WHERE id = ?
        "#
    )
    .bind(&log_id)
    .bind(&now)
    .bind(sync_id.as_str())
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(json!({
        "message": "Sync item marked as completed"
    })))
}

// Mark sync item as failed
#[put("/api/sync/{sync_id}/fail")]
pub async fn mark_sync_failed(
    pool: web::Data<SqlitePool>,
    sync_id: web::Path<String>,
    error: web::Json<serde_json::Value>,
) -> Result<HttpResponse> {
    let now = Utc::now().to_rfc3339();
    let error_message = error.get("error").and_then(|e| e.as_str()).unwrap_or("Unknown error");

    let result = sqlx::query(
        r#"
        UPDATE sync_queue 
        SET sync_status = 'failed', 
            retry_count = retry_count + 1,
            last_retry_at = ?,
            error_message = ?,
            updated_at = ?
        WHERE id = ?
        "#
    )
    .bind(&now)
    .bind(error_message)
    .bind(&now)
    .bind(sync_id.as_str())
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if result.rows_affected() == 0 {
        return Ok(HttpResponse::NotFound().json(json!({
            "error": "Sync item not found"
        })));
    }

    // Log the failure
    let log_id = Uuid::new_v4().to_string();
    sqlx::query(
        r#"
        INSERT INTO sync_log (id, sync_queue_id, operation, entity_type, entity_id, source_store_id, sync_status, error_message, synced_at)
        SELECT ?, id, operation, entity_type, entity_id, store_id, 'error', ?, ?
        FROM sync_queue WHERE id = ?
        "#
    )
    .bind(&log_id)
    .bind(error_message)
    .bind(&now)
    .bind(sync_id.as_str())
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(json!({
        "message": "Sync item marked as failed"
    })))
}

// Retry failed sync items
#[post("/api/sync/retry")]
pub async fn retry_failed_syncs(pool: web::Data<SqlitePool>) -> Result<HttpResponse> {
    let now = Utc::now().to_rfc3339();

    // Reset failed items with retry_count < 5
    let result = sqlx::query(
        r#"
        UPDATE sync_queue 
        SET sync_status = 'pending', updated_at = ?
        WHERE sync_status = 'failed' AND retry_count < 5
        "#
    )
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(json!({
        "message": format!("Retrying {} failed sync items", result.rows_affected())
    })))
}

// Get sync conflicts
#[get("/api/sync/conflicts")]
pub async fn get_sync_conflicts(pool: web::Data<SqlitePool>) -> Result<HttpResponse> {
    let conflicts = sqlx::query_as::<_, SyncConflict>(
        r#"
        SELECT * FROM sync_conflicts 
        WHERE resolution_status = 'pending' 
        ORDER BY created_at DESC
        "#
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(conflicts))
}

// Resolve sync conflict
#[put("/api/sync/conflicts/{conflict_id}/resolve")]
pub async fn resolve_conflict(
    pool: web::Data<SqlitePool>,
    conflict_id: web::Path<String>,
    resolution: web::Json<ConflictResolution>,
) -> Result<HttpResponse> {
    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        r#"
        UPDATE sync_conflicts 
        SET resolution_status = 'resolved',
            resolved_by = ?,
            resolved_at = ?,
            resolution_notes = ?
        WHERE id = ?
        "#
    )
    .bind(&resolution.resolved_by)
    .bind(&now)
    .bind(&resolution.notes)
    .bind(conflict_id.as_str())
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if result.rows_affected() == 0 {
        return Ok(HttpResponse::NotFound().json(json!({
            "error": "Conflict not found"
        })));
    }

    Ok(HttpResponse::Ok().json(json!({
        "message": "Conflict resolved"
    })))
}

// Create audit log entry
#[post("/api/audit")]
pub async fn create_audit_log(
    pool: web::Data<SqlitePool>,
    req: actix_web::HttpRequest,
    log: web::Json<CreateAuditLog>,
) -> Result<HttpResponse> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Extract audit context from request if not provided
    let audit_ctx = crate::middleware::AuditContext::from_request(&req);
    let employee_id = log.employee_id.clone().or(audit_ctx.employee_id);
    let ip_address = log.ip_address.clone().or(audit_ctx.ip_address);
    let user_agent = log.user_agent.clone().or(audit_ctx.user_agent);

    sqlx::query(
        r#"
        INSERT INTO audit_log (id, entity_type, entity_id, operation, user_id, employee_id, changes, ip_address, user_agent, is_offline, created_at, store_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&id)
    .bind(&log.entity_type)
    .bind(&log.entity_id)
    .bind(&log.operation)
    .bind(&log.user_id)
    .bind(&employee_id)
    .bind(&log.changes)
    .bind(&ip_address)
    .bind(&user_agent)
    .bind(log.is_offline)
    .bind(&now)
    .bind(&log.store_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let audit_log = sqlx::query_as::<_, AuditLog>(
        r#"SELECT * FROM audit_log WHERE id = ?"#
    )
    .bind(&id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Created().json(audit_log))
}

// Get audit logs for an entity
#[get("/api/audit/{entity_type}/{entity_id}")]
pub async fn get_audit_logs(
    pool: web::Data<SqlitePool>,
    entity_type: web::Path<(String, String)>,
) -> Result<HttpResponse> {
    let (entity_type_str, entity_id) = entity_type.into_inner();
    let tenant_id = crate::middleware::get_current_tenant_id();

    let logs = sqlx::query_as::<_, AuditLog>(
        r#"
        SELECT * FROM audit_log 
        WHERE entity_type = ? AND entity_id = ? AND tenant_id = ?
        ORDER BY created_at DESC
        LIMIT 100
        "#
    )
    .bind(&entity_type_str)
    .bind(&entity_id)
    .bind(&tenant_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(logs))
}

// Get sync state
#[get("/api/sync/state/{store_id}")]
pub async fn get_sync_state(
    pool: web::Data<SqlitePool>,
    store_id: web::Path<String>,
) -> Result<HttpResponse> {
    let state = sqlx::query_as::<_, SyncState>(
        r#"SELECT * FROM sync_state WHERE store_id = ?"#
    )
    .bind(store_id.as_str())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    match state {
        Some(s) => Ok(HttpResponse::Ok().json(s)),
        None => Ok(HttpResponse::NotFound().json(json!({
            "error": "Sync state not found for store"
        }))),
    }
}

// Update sync state
#[put("/api/sync/state/{store_id}")]
pub async fn update_sync_state(
    pool: web::Data<SqlitePool>,
    store_id: web::Path<String>,
    state: web::Json<serde_json::Value>,
) -> Result<HttpResponse> {
    let now = Utc::now().to_rfc3339();
    let last_sync_version = state.get("last_sync_version").and_then(|v| v.as_i64()).unwrap_or(0);

    // Upsert sync state
    sqlx::query(
        r#"
        INSERT INTO sync_state (store_id, last_sync_at, last_sync_version, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(store_id) DO UPDATE SET
            last_sync_at = excluded.last_sync_at,
            last_sync_version = excluded.last_sync_version,
            updated_at = excluded.updated_at
        "#
    )
    .bind(store_id.as_str())
    .bind(&now)
    .bind(last_sync_version)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(json!({
        "message": "Sync state updated"
    })))
}
use serde::{Deserialize, Serialize};
use std::time::Instant;

#[derive(Debug, Deserialize)]
pub struct TestConnectionRequest {
    pub server_url: Option<String>,
    pub store_id: Option<String>,
    pub url: Option<String>,
    pub api_key: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct TestConnectionResponse {
    pub success: bool,
    pub latency_ms: u64,
    pub error: Option<String>,
}

#[post("/api/sync/test-connection")]
pub async fn test_connection(
    req: web::Json<TestConnectionRequest>,
) -> Result<HttpResponse> {
    let start = Instant::now();
    
    let url = req.server_url.as_ref()
        .or(req.url.as_ref())
        .ok_or_else(|| actix_web::error::ErrorBadRequest("Missing server URL"))?;
    
    // Validate URL format
    if url.is_empty() {
        return Ok(HttpResponse::BadRequest().json(TestConnectionResponse {
            success: false,
            latency_ms: 0,
            error: Some("Empty URL provided".to_string()),
        }));
    }
    
    // Test connection (simulate for now)
    let latency = start.elapsed().as_millis() as u64;
    
    // Simulate network test
    tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
    
    let response = if url.starts_with("http://") || url.starts_with("https://") {
        TestConnectionResponse {
            success: true,
            latency_ms: latency + 50, // Add simulated network latency
            error: None,
        }
    } else {
        TestConnectionResponse {
            success: false,
            latency_ms: 0,
            error: Some("Invalid URL format".to_string()),
        }
    };
    
    Ok(HttpResponse::Ok().json(response))
}

#[derive(Debug, Deserialize)]
pub struct UpdateSyncSettingsRequest {
    pub sync_enabled: bool,
    pub sync_interval: u32,
    pub server_url: String,
    pub auto_sync: bool,
}

#[put("/api/sync/settings")]
pub async fn update_sync_settings(
    pool: web::Data<SqlitePool>,
    req: web::Json<UpdateSyncSettingsRequest>,
) -> Result<HttpResponse> {
    // Update sync settings in database
    sqlx::query(
        "INSERT OR REPLACE INTO sync_settings (key, value) VALUES 
         ('sync_enabled', ?), 
         ('sync_interval', ?), 
         ('server_url', ?), 
         ('auto_sync', ?)"
    )
    .bind(req.sync_enabled.to_string())
    .bind(req.sync_interval.to_string())
    .bind(&req.server_url)
    .bind(req.auto_sync.to_string())
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "message": "Sync settings updated successfully"
    })))
}

// ============================================================================
// TASK-009 & TASK-010: Sync Direction and Delete Policy API Endpoints
// ============================================================================

/// Sync direction options
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum SyncDirection {
    /// Pull data from remote to local only
    Pull,
    /// Push data from local to remote only
    Push,
    /// Sync in both directions
    Bidirectional,
    /// Sync disabled
    Disabled,
}

impl Default for SyncDirection {
    fn default() -> Self {
        Self::Bidirectional
    }
}

/// Delete policy options
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DeletePolicy {
    /// Only delete locally, keep remote data
    LocalOnly,
    /// Archive remote data instead of deleting
    ArchiveRemote,
    /// Delete from both local and remote
    DeleteRemote,
}

impl Default for DeletePolicy {
    fn default() -> Self {
        Self::LocalOnly
    }
}

/// Sync direction configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncDirectionConfig {
    /// Global sync direction for all entities
    pub global_direction: SyncDirection,
    /// Per-entity direction overrides
    #[serde(default)]
    pub entity_overrides: HashMap<String, SyncDirection>,
}

impl Default for SyncDirectionConfig {
    fn default() -> Self {
        Self {
            global_direction: SyncDirection::default(),
            entity_overrides: HashMap::new(),
        }
    }
}

/// Delete policy configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeletePolicyConfig {
    /// Global delete policy for all entities
    pub global_policy: DeletePolicy,
    /// Per-entity policy overrides
    #[serde(default)]
    pub entity_overrides: HashMap<String, DeletePolicy>,
}

impl Default for DeletePolicyConfig {
    fn default() -> Self {
        Self {
            global_policy: DeletePolicy::default(),
            entity_overrides: HashMap::new(),
        }
    }
}

/// Get sync direction configuration
#[get("/api/sync/direction")]
pub async fn get_sync_direction(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    // Try to load from settings table
    let config_json: Option<String> = sqlx::query_scalar(
        "SELECT value FROM settings WHERE key = 'sync_direction_config'"
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    .flatten();

    let config: SyncDirectionConfig = match config_json {
        Some(json) => serde_json::from_str(&json).unwrap_or_default(),
        None => SyncDirectionConfig::default(),
    };

    Ok(HttpResponse::Ok().json(config))
}

/// Update sync direction configuration
#[put("/api/sync/direction")]
pub async fn update_sync_direction(
    pool: web::Data<SqlitePool>,
    config: web::Json<SyncDirectionConfig>,
) -> Result<HttpResponse> {
    let config_json = serde_json::to_string(&config.into_inner())
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    sqlx::query(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('sync_direction_config', ?, datetime('now'))"
    )
    .bind(&config_json)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "message": "Sync direction configuration updated successfully"
    })))
}

/// Get delete policy configuration
#[get("/api/sync/delete-policy")]
pub async fn get_delete_policy(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    // Try to load from settings table
    let config_json: Option<String> = sqlx::query_scalar(
        "SELECT value FROM settings WHERE key = 'delete_policy_config'"
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    .flatten();

    let config: DeletePolicyConfig = match config_json {
        Some(json) => serde_json::from_str(&json).unwrap_or_default(),
        None => DeletePolicyConfig::default(),
    };

    Ok(HttpResponse::Ok().json(config))
}

/// Update delete policy configuration
#[put("/api/sync/delete-policy")]
pub async fn update_delete_policy(
    pool: web::Data<SqlitePool>,
    config: web::Json<DeletePolicyConfig>,
) -> Result<HttpResponse> {
    let config_json = serde_json::to_string(&config.into_inner())
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    sqlx::query(
        "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES ('delete_policy_config', ?, datetime('now'))"
    )
    .bind(&config_json)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Ok().json(json!({
        "success": true,
        "message": "Delete policy configuration updated successfully"
    })))
}

/// Get effective sync direction for a specific entity
#[get("/api/sync/direction/{entity_type}")]
pub async fn get_entity_sync_direction(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let entity_type = path.into_inner();

    // Load config
    let config_json: Option<String> = sqlx::query_scalar(
        "SELECT value FROM settings WHERE key = 'sync_direction_config'"
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    .flatten();

    let config: SyncDirectionConfig = match config_json {
        Some(json) => serde_json::from_str(&json).unwrap_or_default(),
        None => SyncDirectionConfig::default(),
    };

    // Get effective direction (entity override or global)
    let direction = config.entity_overrides
        .get(&entity_type)
        .cloned()
        .unwrap_or(config.global_direction);

    Ok(HttpResponse::Ok().json(json!({
        "entity_type": entity_type,
        "direction": direction
    })))
}

/// Get effective delete policy for a specific entity
#[get("/api/sync/delete-policy/{entity_type}")]
pub async fn get_entity_delete_policy(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> Result<HttpResponse> {
    let entity_type = path.into_inner();

    // Load config
    let config_json: Option<String> = sqlx::query_scalar(
        "SELECT value FROM settings WHERE key = 'delete_policy_config'"
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?
    .flatten();

    let config: DeletePolicyConfig = match config_json {
        Some(json) => serde_json::from_str(&json).unwrap_or_default(),
        None => DeletePolicyConfig::default(),
    };

    // Get effective policy (entity override or global)
    let policy = config.entity_overrides
        .get(&entity_type)
        .cloned()
        .unwrap_or(config.global_policy);

    Ok(HttpResponse::Ok().json(json!({
        "entity_type": entity_type,
        "policy": policy
    })))
}
