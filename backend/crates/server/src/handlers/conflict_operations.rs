use actix_web::{get, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::services::ConflictResolver;

/// GET /api/conflicts/:tenant_id/:entity_type/check
/// Check if an entity type has conflicts
#[get("/api/conflicts/{tenant_id}/{entity_type}/check")]
pub async fn has_conflict(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (tenant_id, entity_type) = path.into_inner();
    
    tracing::info!(
        "Checking for conflicts: {} {}",
        tenant_id,
        entity_type
    );

    let resolver = ConflictResolver::new(pool.get_ref().clone());

    match resolver
        .has_conflict(&tenant_id, &entity_type)
        .await
    {
        Ok(has_conflict) => HttpResponse::Ok().json(serde_json::json!({
            "tenant_id": tenant_id,
            "entity_type": entity_type,
            "has_conflict": has_conflict
        })),
        Err(e) => {
            tracing::error!("Failed to check for conflicts: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to check for conflicts: {}", e)
            }))
        }
    }
}

/// GET /api/conflicts/pending
/// Get all pending conflicts
#[get("/api/conflicts/pending")]
pub async fn get_pending_conflicts(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Getting all pending conflicts");

    let resolver = ConflictResolver::new(pool.get_ref().clone());

    match resolver.get_pending_conflicts().await {
        Ok(conflicts) => HttpResponse::Ok().json(serde_json::json!({
            "conflicts": conflicts,
            "count": conflicts.len()
        })),
        Err(e) => {
            tracing::error!("Failed to get pending conflicts: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get pending conflicts: {}", e)
            }))
        }
    }
}

/// Configure conflict operations routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(has_conflict)
        .service(get_pending_conflicts);
}
