use actix_web::{web, HttpResponse, Responder};
use std::sync::Arc;

use crate::services::TenantResolver;

/// POST /api/cache/tenant/clear
/// Clear tenant resolver cache
#[actix_web::post("/api/cache/tenant/clear")]
pub async fn clear_tenant_cache(
    tenant_resolver: web::Data<Arc<TenantResolver>>,
) -> impl Responder {
    tenant_resolver.as_ref().clear_cache().await;
    
    HttpResponse::Ok().json(serde_json::json!({
        "message": "Tenant cache cleared successfully"
    }))
}
