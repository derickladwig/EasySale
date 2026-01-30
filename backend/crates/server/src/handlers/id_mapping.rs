use actix_web::{delete, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::services::id_mapper::IdMapper;

/// DELETE /api/mappings/:tenant_id/:platform/:entity_type/:source_id/:target_system
/// Delete an ID mapping
#[delete("/api/mappings/{tenant_id}/{platform}/{entity_type}/{source_id}/{target_system}")]
pub async fn delete_mapping(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String, String, String, String)>,
) -> impl Responder {
    let (tenant_id, platform, entity_type, source_id, target_system) = path.into_inner();
    
    tracing::info!(
        "Deleting ID mapping: {} {} {} {} {}",
        tenant_id,
        platform,
        entity_type,
        source_id,
        target_system
    );

    let mapper = IdMapper::new(pool.get_ref().clone());

    match mapper
        .delete_mapping(&tenant_id, &platform, &entity_type, &source_id, &target_system)
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Mapping deleted successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to delete mapping: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to delete mapping: {}", e)
            }))
        }
    }
}

/// Configure ID mapping routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(delete_mapping);
}
