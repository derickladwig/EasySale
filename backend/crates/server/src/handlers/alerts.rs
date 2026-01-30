/**
 * Alert System Handlers
 * 
 * API endpoints for system alerts and notifications.
 */

use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::services::AlertService;

/// GET /api/alerts
/// List all alerts (optionally filter by acknowledged status)
#[get("/api/alerts")]
pub async fn list_alerts(
    pool: web::Data<SqlitePool>,
    query: web::Query<ListAlertsQuery>,
) -> impl Responder {
    tracing::info!("Listing alerts");

    let alert_service = AlertService::new(pool.get_ref().clone());
    
    // If only unacknowledged requested
    if query.unacknowledged.unwrap_or(false) {
        match alert_service.get_unacknowledged_alerts().await {
            Ok(alerts) => {
                let alerts_json: Vec<serde_json::Value> = alerts
                    .iter()
                    .map(|a| serde_json::json!({
                        "id": a.id,
                        "alert_type": a.alert_type,
                        "severity": a.severity,
                        "title": a.title,
                        "message": a.message,
                        "backup_job_id": a.backup_job_id,
                        "error_details": a.error_details,
                        "suggested_actions": a.suggested_actions,
                        "acknowledged": a.acknowledged,
                        "acknowledged_at": a.acknowledged_at,
                        "acknowledged_by": a.acknowledged_by,
                        "created_at": a.created_at
                    }))
                    .collect();
                
                return HttpResponse::Ok().json(serde_json::json!({
                    "alerts": alerts_json,
                    "total": alerts_json.len()
                }));
            }
            Err(e) => {
                tracing::error!("Failed to get unacknowledged alerts: {:?}", e);
                return HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to get alerts: {}", e)
                }));
            }
        }
    }
    
    // Get all alerts with optional filters
    let mut sql = String::from(
        "SELECT id, alert_type, severity, title, message, backup_job_id, error_details, 
         suggested_actions, acknowledged, acknowledged_at, acknowledged_by, created_at 
         FROM backup_alerts 
         WHERE 1=1"
    );
    
    let mut params: Vec<String> = Vec::new();
    
    if let Some(alert_type) = &query.alert_type {
        sql.push_str(" AND alert_type = ?");
        params.push(alert_type.clone());
    }
    
    if let Some(severity) = &query.severity {
        sql.push_str(" AND severity = ?");
        params.push(severity.clone());
    }
    
    sql.push_str(" ORDER BY created_at DESC");
    
    if let Some(limit) = query.limit {
        sql.push_str(&format!(" LIMIT {}", limit));
    }
    
    #[derive(sqlx::FromRow, Serialize)]
    struct AlertRow {
        id: String,
        alert_type: String,
        severity: String,
        title: String,
        message: String,
        backup_job_id: Option<String>,
        error_details: Option<String>,
        suggested_actions: Option<String>,
        acknowledged: bool,
        acknowledged_at: Option<String>,
        acknowledged_by: Option<String>,
        created_at: String,
    }
    
    let mut query_builder = sqlx::query_as::<_, AlertRow>(&sql);
    for param in params {
        query_builder = query_builder.bind(param);
    }
    
    match query_builder.fetch_all(pool.get_ref()).await {
        Ok(alerts) => HttpResponse::Ok().json(serde_json::json!({
            "alerts": alerts,
            "total": alerts.len()
        })),
        Err(e) => {
            tracing::error!("Failed to fetch alerts: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch alerts: {}", e)
            }))
        }
    }
}

/// GET /api/alerts/:id
/// Get a specific alert by ID
#[get("/api/alerts/{id}")]
pub async fn get_alert(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let alert_id = path.into_inner();
    tracing::info!("Fetching alert: {}", alert_id);

    #[derive(sqlx::FromRow, Serialize)]
    struct AlertDetail {
        id: String,
        alert_type: String,
        severity: String,
        title: String,
        message: String,
        backup_job_id: Option<String>,
        error_details: Option<String>,
        suggested_actions: Option<String>,
        acknowledged: bool,
        acknowledged_at: Option<String>,
        acknowledged_by: Option<String>,
        created_at: String,
    }

    match sqlx::query_as::<_, AlertDetail>(
        "SELECT id, alert_type, severity, title, message, backup_job_id, error_details, 
         suggested_actions, acknowledged, acknowledged_at, acknowledged_by, created_at 
         FROM backup_alerts 
         WHERE id = ?"
    )
    .bind(&alert_id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(alert) => HttpResponse::Ok().json(alert),
        Err(sqlx::Error::RowNotFound) => {
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Alert not found"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch alert: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch alert: {}", e)
            }))
        }
    }
}

/// POST /api/alerts/:id/acknowledge
/// Acknowledge an alert
#[post("/api/alerts/{id}/acknowledge")]
pub async fn acknowledge_alert(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let alert_id = path.into_inner();
    tracing::info!("Acknowledging alert: {}", alert_id);

    let alert_service = AlertService::new(pool.get_ref().clone());
    
    match alert_service.acknowledge_alert(&alert_id, "system").await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Alert acknowledged successfully",
            "alert_id": alert_id
        })),
        Err(e) => {
            tracing::error!("Failed to acknowledge alert: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to acknowledge alert: {}", e)
            }))
        }
    }
}

/// POST /api/alerts
/// Create a new alert (backup failure or disk space warning)
#[post("/api/alerts")]
pub async fn create_alert(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateAlertRequest>,
) -> impl Responder {
    tracing::info!("Creating alert: {}", req.alert_type);

    let alert_service = AlertService::new(pool.get_ref().clone());
    
    // Route to appropriate alert creation method
    let result = match req.alert_type.as_str() {
        "backup_failure" => {
            alert_service.send_backup_failure_alert(
                &req.backup_job_id.clone().unwrap_or_else(|| "unknown".to_string()),
                &req.backup_type.clone().unwrap_or_else(|| "manual".to_string()),
                &req.error_details.clone().unwrap_or_else(|| req.message.clone()),
            ).await.map(|alert| alert.id)
        }
        "disk_space_warning" => {
            let available_gb = req.available_gb.unwrap_or(0.0);
            let threshold_gb = req.threshold_gb.unwrap_or(10.0);
            alert_service.send_disk_space_warning(available_gb, threshold_gb).await.map(|alert| alert.id)
        }
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Unknown alert type: {}. Use 'backup_failure' or 'disk_space_warning'", req.alert_type)
            }));
        }
    };
    
    match result {
        Ok(alert_id) => HttpResponse::Created().json(serde_json::json!({
            "message": "Alert created successfully",
            "alert_id": alert_id
        })),
        Err(e) => {
            tracing::error!("Failed to create alert: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to create alert: {}", e)
            }))
        }
    }
}

/// GET /api/alerts/stats
/// Get alert statistics
#[get("/api/alerts/stats")]
pub async fn get_alert_stats(pool: web::Data<SqlitePool>) -> impl Responder {
    tracing::info!("Getting alert statistics");

    #[derive(sqlx::FromRow)]
    struct Stats {
        total: i64,
        unacknowledged: i64,
        acknowledged: i64,
        critical: i64,
        warning: i64,
        info: i64,
    }

    match sqlx::query_as::<_, Stats>(
        "SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN acknowledged = 0 THEN 1 ELSE 0 END) as unacknowledged,
            SUM(CASE WHEN acknowledged = 1 THEN 1 ELSE 0 END) as acknowledged,
            SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
            SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END) as warning,
            SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END) as info
         FROM backup_alerts"
    )
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(stats) => HttpResponse::Ok().json(serde_json::json!({
            "total_alerts": stats.total,
            "unacknowledged": stats.unacknowledged,
            "acknowledged": stats.acknowledged,
            "by_severity": {
                "critical": stats.critical,
                "warning": stats.warning,
                "info": stats.info
            }
        })),
        Err(e) => {
            tracing::error!("Failed to get alert stats: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get alert stats: {}", e)
            }))
        }
    }
}

/// POST /api/alerts/acknowledge-all
/// Acknowledge all unacknowledged alerts
#[post("/api/alerts/acknowledge-all")]
pub async fn acknowledge_all_alerts(pool: web::Data<SqlitePool>) -> impl Responder {
    tracing::info!("Acknowledging all alerts");

    let now = chrono::Utc::now().to_rfc3339();
    
    match sqlx::query(
        "UPDATE backup_alerts 
         SET acknowledged = 1, acknowledged_at = ?, acknowledged_by = ? 
         WHERE acknowledged = 0"
    )
    .bind(&now)
    .bind("system")
    .execute(pool.get_ref())
    .await
    {
        Ok(result) => HttpResponse::Ok().json(serde_json::json!({
            "message": "All alerts acknowledged",
            "count": result.rows_affected()
        })),
        Err(e) => {
            tracing::error!("Failed to acknowledge all alerts: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to acknowledge all alerts: {}", e)
            }))
        }
    }
}

// Request/Response types

#[derive(Deserialize)]
pub struct ListAlertsQuery {
    pub unacknowledged: Option<bool>,
    pub alert_type: Option<String>,
    pub severity: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Deserialize)]
pub struct CreateAlertRequest {
    pub alert_type: String,  // "backup_failure" or "disk_space_warning"
    pub message: String,
    pub backup_job_id: Option<String>,
    pub backup_type: Option<String>,
    pub error_details: Option<String>,
    pub available_gb: Option<f64>,
    pub threshold_gb: Option<f64>,
}
