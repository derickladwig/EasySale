use actix_web::{get, web, HttpResponse, Responder};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::services::BackupService;

/// GET /api/backups/chain/:backup_id
/// Get all backups in a chain
#[get("/api/backups/chain/{backup_id}")]
pub async fn get_chain_backups(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let backup_id = path.into_inner();
    tracing::info!("Getting backup chain for: {}", backup_id);

    let service = Arc::new(BackupService::new(pool.get_ref().clone()));

    match service.get_chain_backups(&backup_id).await {
        Ok(backups) => HttpResponse::Ok().json(backups),
        Err(e) => {
            tracing::error!("Failed to get backup chain: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get backup chain: {}", e)
            }))
        }
    }
}

/// GET /api/backups/chain/:backup_id/base
/// Get the base backup for a chain
#[get("/api/backups/chain/{backup_id}/base")]
pub async fn get_chain_base_backup(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let backup_id = path.into_inner();
    tracing::info!("Getting base backup for chain: {}", backup_id);

    let service = Arc::new(BackupService::new(pool.get_ref().clone()));

    match service.get_chain_base_backup(&backup_id).await {
        Ok(Some(backup)) => HttpResponse::Ok().json(backup),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Base backup not found"
        })),
        Err(e) => {
            tracing::error!("Failed to get base backup: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get base backup: {}", e)
            }))
        }
    }
}

/// GET /api/backups/chain/:backup_id/stats
/// Get statistics for a backup chain
#[get("/api/backups/chain/{backup_id}/stats")]
pub async fn get_chain_stats(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let backup_id = path.into_inner();
    tracing::info!("Getting backup chain stats for: {}", backup_id);

    let service = Arc::new(BackupService::new(pool.get_ref().clone()));

    match service.get_chain_stats(&backup_id).await {
        Ok(stats) => HttpResponse::Ok().json(stats),
        Err(e) => {
            tracing::error!("Failed to get chain stats: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get chain stats: {}", e)
            }))
        }
    }
}

/// Configure backup operations routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(get_chain_backups)
        .service(get_chain_base_backup)
        .service(get_chain_stats);
}
