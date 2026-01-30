use actix_web::{get, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::services::RetentionService;
use crate::models::backup::BackupSettings;

/// GET /api/retention/deletable/:tenant_id
/// Find backups that can be deleted based on retention policy
#[get("/api/retention/deletable/{tenant_id}")]
pub async fn find_deletable_backups(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let tenant_id = path.into_inner();
    tracing::info!("Finding deletable backups for tenant: {}", tenant_id);

    let service = RetentionService::new(pool.get_ref().clone());

    // Fetch backup settings from database
    let settings_result = sqlx::query_as::<_, BackupSettings>(
        "SELECT * FROM backup_settings WHERE tenant_id = ? LIMIT 1"
    )
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await;

    let settings = match settings_result {
        Ok(Some(s)) => s,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Backup settings not found for tenant"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch backup settings: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch backup settings"
            }));
        }
    };

    match service.find_deletable_backups(&settings).await {
        Ok(backups) => {
            let total_size: i64 = backups.iter().filter_map(|b| b.size_bytes).sum();
            
            HttpResponse::Ok().json(serde_json::json!({
                "tenant_id": tenant_id,
                "deletable_backups": backups,
                "total_count": backups.len(),
                "total_size_bytes": total_size,
                "total_size_mb": total_size / (1024 * 1024)
            }))
        }
        Err(e) => {
            tracing::error!("Failed to find deletable backups: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to find deletable backups: {}", e)
            }))
        }
    }
}

/// Configure retention operations routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(find_deletable_backups);
}
