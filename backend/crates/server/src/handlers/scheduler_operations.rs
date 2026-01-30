use actix_web::{get, post, web, HttpResponse, Responder};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::services::{BackupService, SchedulerService};

/// POST /api/scheduler/stop
/// Stop the scheduler
#[post("/api/scheduler/stop")]
pub async fn stop_scheduler(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Stopping scheduler");

    let backup_service = Arc::new(BackupService::new(pool.get_ref().clone()));
    
    let store_id = std::env::var("STORE_ID").unwrap_or_else(|_| "store-1".to_string());
    let tenant_id = std::env::var("TENANT_ID").unwrap_or_else(|_| "caps-automotive".to_string());
    
    let scheduler = match SchedulerService::new(
        pool.get_ref().clone(),
        backup_service,
        store_id,
        tenant_id,
    )
    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create scheduler: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to create scheduler: {}", e)
            }));
        }
    };

    match scheduler.stop().await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Scheduler stopped successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to stop scheduler: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to stop scheduler: {}", e)
            }))
        }
    }
}

/// GET /api/scheduler/status
/// Check if scheduler is running
#[get("/api/scheduler/status")]
pub async fn is_job_running(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Checking if scheduler is running");

    let backup_service = Arc::new(BackupService::new(pool.get_ref().clone()));
    
    let store_id = std::env::var("STORE_ID").unwrap_or_else(|_| "store-1".to_string());
    let tenant_id = std::env::var("TENANT_ID").unwrap_or_else(|_| "caps-automotive".to_string());
    
    let scheduler = match SchedulerService::new(
        pool.get_ref().clone(),
        backup_service,
        store_id,
        tenant_id,
    )
    .await
    {
        Ok(s) => s,
        Err(e) => {
            tracing::error!("Failed to create scheduler: {}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to create scheduler: {}", e)
            }));
        }
    };

    let is_running = scheduler.is_job_running().await;
    
    HttpResponse::Ok().json(serde_json::json!({
        "is_running": is_running
    }))
}

/// Configure scheduler operations routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(stop_scheduler)
        .service(is_job_running);
}
