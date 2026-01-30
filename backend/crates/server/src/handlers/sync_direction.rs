use actix_web::{get, post, put, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::services::sync_direction_control::{
    ConflictStrategy, EntitySyncConfig, SourceOfTruth, SyncConfig, SyncDirection,
    SyncDirectionControl,
};

/// GET /api/sync/direction/:credential_id
/// Get sync direction for a credential
#[get("/api/sync/direction/{credential_id}")]
pub async fn get_sync_direction(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let credential_id = path.into_inner();
    tracing::info!("Getting sync direction for credential: {}", credential_id);

    let service = SyncDirectionControl::new(pool.get_ref().clone());

    match service.get_sync_direction(&credential_id).await {
        Ok(direction) => HttpResponse::Ok().json(serde_json::json!({
            "credential_id": credential_id,
            "sync_direction": direction.as_str()
        })),
        Err(e) => {
            tracing::error!("Failed to get sync direction: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get sync direction: {}", e)
            }))
        }
    }
}

/// PUT /api/sync/direction/:credential_id
/// Set sync direction for a credential
#[put("/api/sync/direction/{credential_id}")]
pub async fn set_sync_direction(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let credential_id = path.into_inner();

    let direction_str = match req.get("sync_direction").and_then(|v| v.as_str()) {
        Some(d) => d,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "sync_direction is required"
            }));
        }
    };

    let direction = match SyncDirection::from_str(direction_str) {
        Ok(d) => d,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": e
            }));
        }
    };

    tracing::info!(
        "Setting sync direction for credential {} to {}",
        credential_id,
        direction.as_str()
    );

    let service = SyncDirectionControl::new(pool.get_ref().clone());

    match service.set_sync_direction(&credential_id, direction).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Sync direction updated successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to set sync direction: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to set sync direction: {}", e)
            }))
        }
    }
}

/// GET /api/sync/config/:credential_id
/// Get sync configuration for a credential
#[get("/api/sync/config/{credential_id}")]
pub async fn get_sync_config(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let credential_id = path.into_inner();
    tracing::info!("Getting sync config for credential: {}", credential_id);

    let service = SyncDirectionControl::new(pool.get_ref().clone());

    match service.get_sync_config(&credential_id).await {
        Ok(config) => HttpResponse::Ok().json(config),
        Err(e) => {
            tracing::error!("Failed to get sync config: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get sync config: {}", e)
            }))
        }
    }
}

/// PUT /api/sync/config/:credential_id
/// Set sync configuration for a credential
#[put("/api/sync/config/{credential_id}")]
pub async fn set_sync_config(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<SyncConfig>,
) -> impl Responder {
    let credential_id = path.into_inner();
    tracing::info!("Setting sync config for credential: {}", credential_id);

    let service = SyncDirectionControl::new(pool.get_ref().clone());

    match service.set_sync_config(&credential_id, &req).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Sync configuration updated successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to set sync config: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to set sync config: {}", e)
            }))
        }
    }
}

/// POST /api/sync/config/:credential_id/entity
/// Add entity-specific sync configuration
#[post("/api/sync/config/{credential_id}/entity")]
pub async fn add_entity_config(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let credential_id = path.into_inner();

    let entity_type = match req.get("entity_type").and_then(|v| v.as_str()) {
        Some(e) => e,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "entity_type is required"
            }));
        }
    };

    let source_of_truth_str = match req.get("source_of_truth").and_then(|v| v.as_str()) {
        Some(s) => s,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "source_of_truth is required"
            }));
        }
    };

    let conflict_strategy_str = match req.get("conflict_strategy").and_then(|v| v.as_str()) {
        Some(c) => c,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "conflict_strategy is required"
            }));
        }
    };

    let source_of_truth = match SourceOfTruth::from_str(source_of_truth_str) {
        Ok(s) => s,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": e
            }));
        }
    };

    let conflict_strategy = match ConflictStrategy::from_str(conflict_strategy_str) {
        Ok(c) => c,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": e
            }));
        }
    };

    tracing::info!(
        "Adding entity config for credential {}: {} - {} / {}",
        credential_id,
        entity_type,
        source_of_truth.as_str(),
        conflict_strategy.as_str()
    );

    let service = SyncDirectionControl::new(pool.get_ref().clone());

    // Get existing config
    let mut config = match service.get_sync_config(&credential_id).await {
        Ok(c) => c,
        Err(_) => SyncConfig::new(),
    };

    // Add entity config
    config.add_entity(
        entity_type.to_string(),
        EntitySyncConfig {
            source_of_truth,
            conflict_strategy,
        },
    );

    // Save updated config
    match service.set_sync_config(&credential_id, &config).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Entity configuration added successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to add entity config: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to add entity config: {}", e)
            }))
        }
    }
}

/// GET /api/sync/conflicts/:tenant_id
/// Get pending conflicts for a tenant
#[get("/api/sync/conflicts/{tenant_id}")]
pub async fn get_pending_conflicts(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let tenant_id = path.into_inner();
    tracing::info!("Getting pending conflicts for tenant: {}", tenant_id);

    let service = SyncDirectionControl::new(pool.get_ref().clone());

    match service.get_pending_conflicts(&tenant_id).await {
        Ok(conflicts) => HttpResponse::Ok().json(conflicts),
        Err(e) => {
            tracing::error!("Failed to get pending conflicts: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get pending conflicts: {}", e)
            }))
        }
    }
}

/// POST /api/sync/conflicts/:conflict_id/resolve
/// Resolve a conflict
#[post("/api/sync/conflicts/{conflict_id}/resolve")]
pub async fn resolve_conflict(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let conflict_id = path.into_inner();

    let resolved_version = match req.get("resolved_version").and_then(|v| v.as_str()) {
        Some(v) => v,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "resolved_version is required"
            }));
        }
    };

    let resolved_data = match req.get("resolved_data").and_then(|v| v.as_str()) {
        Some(d) => d,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "resolved_data is required"
            }));
        }
    };

    let resolved_by = req.get("resolved_by").and_then(|v| v.as_str());

    tracing::info!("Resolving conflict: {}", conflict_id);

    let service = SyncDirectionControl::new(pool.get_ref().clone());

    match service
        .resolve_conflict(&conflict_id, resolved_version, resolved_data, resolved_by)
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Conflict resolved successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to resolve conflict: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to resolve conflict: {}", e)
            }))
        }
    }
}

/// Configure sync direction routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(get_sync_direction)
        .service(set_sync_direction)
        .service(get_sync_config)
        .service(set_sync_config)
        .service(add_entity_config)
        .service(get_pending_conflicts)
        .service(resolve_conflict);
}
