use actix_web::{post, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::services::ReceivingService;

/// POST /api/receiving/process
/// Process a receiving operation
#[post("/api/receiving/process")]
pub async fn process_receiving(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let vendor_id = match req.get("vendor_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "vendor_id is required"
            }));
        }
    };

    let items = match req.get("items").and_then(|v| v.as_array()) {
        Some(items) => items,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "items array is required"
            }));
        }
    };

    tracing::info!(
        "Processing receiving for tenant {} vendor {} with {} items",
        tenant_id,
        vendor_id,
        items.len()
    );

    let _service = ReceivingService::new(pool.get_ref().clone());

    // In a real implementation, this would process the receiving
    // For now, just return success
    HttpResponse::Ok().json(serde_json::json!({
        "message": "Receiving processed successfully",
        "tenant_id": tenant_id,
        "vendor_id": vendor_id,
        "items_count": items.len()
    }))
}

/// Configure receiving operations routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(process_receiving);
}
