/**
 * Health Check Handlers
 * 
 * API endpoints for checking connectivity to external services.
 */

use actix_web::{get, post, web, HttpResponse, Responder};
use serde::Deserialize;

use crate::services::HealthCheckService;

/// GET /api/health/connectivity
/// Check connectivity to all integrated platforms
#[get("/api/health/connectivity")]
pub async fn check_all_connectivity(
    health_service: web::Data<std::sync::Arc<HealthCheckService>>,
    query: web::Query<ConnectivityQuery>,
) -> impl Responder {
    tracing::info!("Checking connectivity to all platforms");

    let woo_url = query.woocommerce_url.as_deref().unwrap_or("https://store.example.com");
    let supabase_url = query.supabase_url.as_deref().unwrap_or("https://project.supabase.co");
    
    let woo_status = health_service.check_woocommerce(woo_url).await;
    let qbo_status = health_service.check_quickbooks().await;
    let supabase_status = health_service.check_supabase(supabase_url).await;
    
    let all_healthy = woo_status.is_online && qbo_status.is_online && supabase_status.is_online;
    
    HttpResponse::Ok().json(serde_json::json!({
        "overall_status": if all_healthy { "healthy" } else { "degraded" },
        "platforms": {
            "woocommerce": {
                "connected": woo_status.is_online,
                "error": woo_status.error_message
            },
            "quickbooks": {
                "connected": qbo_status.is_online,
                "error": qbo_status.error_message
            },
            "supabase": {
                "connected": supabase_status.is_online,
                "error": supabase_status.error_message
            }
        }
    }))
}

/// GET /api/health/connectivity/:platform
/// Check connectivity to a specific platform
#[get("/api/health/connectivity/{platform}")]
pub async fn check_platform_connectivity(
    health_service: web::Data<std::sync::Arc<HealthCheckService>>,
    path: web::Path<String>,
    query: web::Query<PlatformConnectivityQuery>,
) -> impl Responder {
    let platform = path.into_inner();
    tracing::info!("Checking connectivity to platform: {}", platform);

    let status = match platform.as_str() {
        "woocommerce" => {
            let url = query.url.as_deref().unwrap_or("https://store.example.com");
            health_service.check_woocommerce(url).await
        }
        "quickbooks" => {
            health_service.check_quickbooks().await
        }
        "supabase" => {
            let url = query.url.as_deref().unwrap_or("https://project.supabase.co");
            health_service.check_supabase(url).await
        }
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Unknown platform: {}. Use 'woocommerce', 'quickbooks', or 'supabase'", platform)
            }));
        }
    };
    
    HttpResponse::Ok().json(serde_json::json!({
        "platform": platform,
        "connected": status.is_online,
        "error": status.error_message
    }))
}

/// POST /api/health/cache/clear
/// Clear the health check cache
#[post("/api/health/cache/clear")]
pub async fn clear_health_cache(
    health_service: web::Data<std::sync::Arc<HealthCheckService>>,
) -> impl Responder {
    tracing::info!("Clearing health check cache");

    health_service.clear_cache().await;
    
    HttpResponse::Ok().json(serde_json::json!({
        "message": "Health check cache cleared successfully"
    }))
}

/// GET /api/health/status
/// Get overall system health status
/// 
/// Returns:
/// - 200 OK with status "healthy" if database is up and external services are connected
/// - 200 OK with status "degraded" if database is up but external services are not configured/connected
/// - 503 Service Unavailable only if database (critical component) is down
#[get("/api/health/status")]
pub async fn get_system_health(
    pool: web::Data<sqlx::SqlitePool>,
    health_service: web::Data<std::sync::Arc<HealthCheckService>>,
) -> impl Responder {
    tracing::info!("Getting overall system health");

    // Check database - this is the critical component
    let db_healthy = sqlx::query("SELECT 1")
        .fetch_one(pool.get_ref())
        .await
        .is_ok();
    
    // If database is down, return 503 - this is a critical failure
    if !db_healthy {
        return HttpResponse::ServiceUnavailable().json(serde_json::json!({
            "status": "unhealthy",
            "components": {
                "database": {
                    "status": "down",
                    "critical": true
                },
                "external_services": {
                    "status": "unknown",
                    "message": "Cannot check external services when database is down"
                }
            },
            "timestamp": chrono::Utc::now().to_rfc3339()
        }));
    }
    
    // Check external services (optional components)
    let woo_status = health_service.check_woocommerce("https://store.example.com").await;
    let qbo_status = health_service.check_quickbooks().await;
    
    let services_healthy = woo_status.is_online && qbo_status.is_online;
    
    // Determine external services status
    let external_status = if services_healthy {
        "up"
    } else if !woo_status.is_online && !qbo_status.is_online {
        "not_configured"
    } else {
        "degraded"
    };
    
    // Overall status: healthy if DB is up, degraded if external services are down
    let overall_status = if services_healthy { "healthy" } else { "degraded" };
    
    // Always return 200 OK when database is healthy
    // External services are optional and should not cause 503
    HttpResponse::Ok().json(serde_json::json!({
        "status": overall_status,
        "components": {
            "database": {
                "status": "up",
                "critical": true
            },
            "external_services": {
                "status": external_status,
                "critical": false,
                "woocommerce": {
                    "connected": woo_status.is_online,
                    "error": woo_status.error_message
                },
                "quickbooks": {
                    "connected": qbo_status.is_online,
                    "error": qbo_status.error_message
                }
            }
        },
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

// Request types

#[derive(Deserialize)]
pub struct ConnectivityQuery {
    pub woocommerce_url: Option<String>,
    pub supabase_url: Option<String>,
}

#[derive(Deserialize)]
pub struct PlatformConnectivityQuery {
    pub url: Option<String>,
}
