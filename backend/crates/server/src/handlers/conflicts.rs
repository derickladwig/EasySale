/**
 * Conflict Resolution Handlers
 * 
 * API endpoints for viewing and resolving sync conflicts.
 */

use actix_web::{get, post, web, HttpResponse, Responder, HttpRequest, HttpMessage};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::services::ConflictResolver;
use crate::models::UserContext;

/// GET /api/sync/conflicts
/// List all pending sync conflicts
#[get("/api/sync/conflicts")]
pub async fn list_conflicts(
    pool: web::Data<SqlitePool>,
    query: web::Query<ListConflictsQuery>,
) -> impl Responder {
    tracing::info!("Listing sync conflicts");

    let resolver = ConflictResolver::new(pool.get_ref().clone());
    
    // Build query based on filters
    let mut sql = String::from(
        "SELECT id, entity_type, entity_id, local_version, remote_version, 
         conflict_type, detected_at, resolved_at, resolution_strategy 
         FROM sync_conflicts 
         WHERE 1=1"
    );
    
    let mut params: Vec<String> = Vec::new();
    
    if let Some(entity_type) = &query.entity_type {
        sql.push_str(" AND entity_type = ?");
        params.push(entity_type.clone());
    }
    
    if let Some(resolved) = query.resolved {
        if resolved {
            sql.push_str(" AND resolved_at IS NOT NULL");
        } else {
            sql.push_str(" AND resolved_at IS NULL");
        }
    }
    
    sql.push_str(" ORDER BY detected_at DESC");
    
    if let Some(limit) = query.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }
    
    // Execute query
    #[derive(sqlx::FromRow, Serialize)]
    struct ConflictRow {
        id: String,
        entity_type: String,
        entity_id: String,
        local_version: String,
        remote_version: String,
        conflict_type: String,
        detected_at: String,
        resolved_at: Option<String>,
        resolution_strategy: Option<String>,
    }
    
    let mut query_builder = sqlx::query_as::<_, ConflictRow>(&sql);
    for param in params {
        query_builder = query_builder.bind(param);
    }
    
    match query_builder.fetch_all(pool.get_ref()).await {
        Ok(mut conflicts) => {
            // For unresolved conflicts, add resolution suggestions using the resolver
            for conflict in &mut conflicts {
                if conflict.resolved_at.is_none() {
                    // Get suggested resolution strategy based on entity type
                    let suggested_strategy = resolver.get_suggested_strategy(&conflict.entity_type);
                    // Store in a custom field (would need to modify struct, so just log for now)
                    tracing::debug!(
                        "Conflict {} suggested strategy: {}",
                        conflict.id,
                        suggested_strategy
                    );
                }
            }
            
            HttpResponse::Ok().json(serde_json::json!({
                "conflicts": conflicts,
                "total": conflicts.len()
            }))
        },
        Err(e) => {
            tracing::error!("Failed to fetch conflicts: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch conflicts: {}", e)
            }))
        }
    }
}

/// GET /api/sync/conflicts/:id
/// Get details of a specific conflict
#[get("/api/sync/conflicts/{id}")]
pub async fn get_conflict(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let conflict_id = path.into_inner();
    tracing::info!("Fetching conflict: {}", conflict_id);

    #[derive(sqlx::FromRow, Serialize)]
    struct ConflictDetail {
        id: String,
        entity_type: String,
        entity_id: String,
        local_version: String,
        remote_version: String,
        conflict_type: String,
        detected_at: String,
        resolved_at: Option<String>,
        resolution_strategy: Option<String>,
    }

    match sqlx::query_as::<_, ConflictDetail>(
        "SELECT id, entity_type, entity_id, local_version, remote_version, 
         conflict_type, detected_at, resolved_at, resolution_strategy 
         FROM sync_conflicts 
         WHERE id = ?"
    )
    .bind(&conflict_id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(conflict) => {
            // Parse JSON versions
            let local_json: serde_json::Value = serde_json::from_str(&conflict.local_version)
                .unwrap_or(serde_json::json!({}));
            let remote_json: serde_json::Value = serde_json::from_str(&conflict.remote_version)
                .unwrap_or(serde_json::json!({}));
            
            HttpResponse::Ok().json(serde_json::json!({
                "id": conflict.id,
                "entity_type": conflict.entity_type,
                "entity_id": conflict.entity_id,
                "local_version": local_json,
                "remote_version": remote_json,
                "conflict_type": conflict.conflict_type,
                "detected_at": conflict.detected_at,
                "resolved_at": conflict.resolved_at,
                "resolution_strategy": conflict.resolution_strategy
            }))
        }
        Err(sqlx::Error::RowNotFound) => {
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Conflict not found"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch conflict: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch conflict: {}", e)
            }))
        }
    }
}

/// POST /api/sync/conflicts/:id/resolve
/// Resolve a sync conflict
#[post("/api/sync/conflicts/{id}/resolve")]
pub async fn resolve_conflict(
    pool: web::Data<SqlitePool>,
    http_req: HttpRequest,
    path: web::Path<String>,
    req: web::Json<ResolveConflictRequest>,
) -> impl Responder {
    let conflict_id = path.into_inner();
    tracing::info!("Resolving conflict: {}", conflict_id);

    let resolver = ConflictResolver::new(pool.get_ref().clone());
    
    // Fetch conflict details
    #[derive(sqlx::FromRow)]
    struct ConflictData {
        entity_type: String,
        entity_id: String,
        local_version: String,
        remote_version: String,
    }
    
    let conflict = match sqlx::query_as::<_, ConflictData>(
        "SELECT entity_type, entity_id, local_version, remote_version 
         FROM sync_conflicts 
         WHERE id = ? AND resolved_at IS NULL"
    )
    .bind(&conflict_id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(c) => c,
        Err(sqlx::Error::RowNotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Conflict not found or already resolved"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch conflict: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch conflict: {}", e)
            }));
        }
    };
    
    // Parse JSON versions
    let local_json: serde_json::Value = match serde_json::from_str(&conflict.local_version) {
        Ok(v) => v,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Invalid local version JSON: {}", e)
            }));
        }
    };
    
    let remote_json: serde_json::Value = match serde_json::from_str(&conflict.remote_version) {
        Ok(v) => v,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Invalid remote version JSON: {}", e)
            }));
        }
    };
    
    // Resolve conflict using the resolver service
    match resolver.resolve_conflict(
        &conflict.entity_type,
        &conflict.entity_id,
        local_json,
        remote_json,
        "local-store",  // TODO: Get from context
        "remote-store", // TODO: Get from sync metadata
    ).await {
        Ok((resolved_version, resolution_method)) => {
            // Mark conflict as resolved
            let now = chrono::Utc::now().to_rfc3339();
            let strategy = req.strategy.as_deref().unwrap_or(&resolution_method);
            
            match sqlx::query(
                "UPDATE sync_conflicts 
                 SET resolved_at = ?, resolution_strategy = ? 
                 WHERE id = ?"
            )
            .bind(&now)
            .bind(strategy)
            .bind(&conflict_id)
            .execute(pool.get_ref())
            .await
            {
                Ok(_) => {
                    tracing::info!("Conflict resolved successfully: {}", conflict_id);
                    HttpResponse::Ok().json(serde_json::json!({
                        "message": "Conflict resolved successfully",
                        "conflict_id": conflict_id,
                        "resolved_version": resolved_version,
                        "strategy": strategy,
                        "resolution_method": resolution_method
                    }))
                }
                Err(e) => {
                    tracing::error!("Failed to update conflict status: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Conflict resolved but failed to update status: {}", e)
                    }))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to resolve conflict: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to resolve conflict: {}", e)
            }))
        }
    }
}

/// POST /api/sync/conflicts/:id/accept-local
/// Accept local version to resolve conflict
#[post("/api/sync/conflicts/{id}/accept-local")]
pub async fn accept_local_version(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let conflict_id = path.into_inner();
    tracing::info!("Accepting local version for conflict: {}", conflict_id);

    let now = chrono::Utc::now().to_rfc3339();
    
    match sqlx::query(
        "UPDATE sync_conflicts 
         SET resolved_at = ?, resolution_strategy = 'accept_local' 
         WHERE id = ? AND resolved_at IS NULL"
    )
    .bind(&now)
    .bind(&conflict_id)
    .execute(pool.get_ref())
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Conflict not found or already resolved"
                }))
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Local version accepted",
                    "conflict_id": conflict_id
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to accept local version: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to accept local version: {}", e)
            }))
        }
    }
}

/// POST /api/sync/conflicts/:id/accept-remote
/// Accept remote version to resolve conflict
#[post("/api/sync/conflicts/{id}/accept-remote")]
pub async fn accept_remote_version(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let conflict_id = path.into_inner();
    tracing::info!("Accepting remote version for conflict: {}", conflict_id);

    let now = chrono::Utc::now().to_rfc3339();
    
    match sqlx::query(
        "UPDATE sync_conflicts 
         SET resolved_at = ?, resolution_strategy = 'accept_remote' 
         WHERE id = ? AND resolved_at IS NULL"
    )
    .bind(&now)
    .bind(&conflict_id)
    .execute(pool.get_ref())
    .await
    {
        Ok(result) => {
            if result.rows_affected() == 0 {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Conflict not found or already resolved"
                }))
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Remote version accepted",
                    "conflict_id": conflict_id
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to accept remote version: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to accept remote version: {}", e)
            }))
        }
    }
}

/// GET /api/sync/conflicts/stats
/// Get conflict statistics
#[get("/api/sync/conflicts/stats")]
pub async fn get_conflict_stats(pool: web::Data<SqlitePool>) -> impl Responder {
    tracing::info!("Getting conflict statistics");

    #[derive(sqlx::FromRow)]
    struct Stats {
        total: i64,
        pending: i64,
        resolved: i64,
    }

    match sqlx::query_as::<_, Stats>(
        "SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN resolved_at IS NULL THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN resolved_at IS NOT NULL THEN 1 ELSE 0 END) as resolved
         FROM sync_conflicts"
    )
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(stats) => HttpResponse::Ok().json(serde_json::json!({
            "total_conflicts": stats.total,
            "pending_conflicts": stats.pending,
            "resolved_conflicts": stats.resolved
        })),
        Err(e) => {
            tracing::error!("Failed to get conflict stats: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get conflict stats: {}", e)
            }))
        }
    }
}

// Request/Response types

#[derive(Deserialize)]
pub struct ListConflictsQuery {
    pub entity_type: Option<String>,
    pub resolved: Option<bool>,
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct ResolveConflictRequest {
    pub strategy: Option<String>,
}
