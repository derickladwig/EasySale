/**
 * Sync History Handler
 * 
 * API endpoints for sync history and monitoring:
 * - GET /api/sync/history - Paginated sync history with filters
 * - GET /api/sync/metrics - Aggregate metrics for tenant
 * - GET /api/integrations/health - Service health and connector status
 * 
 * Requirements: Task 14.2, 14.4, 14.5
 */

use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::Utc;

use crate::middleware::tenant::get_current_tenant_id;
use crate::services::sync_logger::SyncLogEntry;

/// Query parameters for sync history
#[derive(Debug, Deserialize)]
pub struct SyncHistoryQuery {
    pub entity: Option<String>,
    pub status: Option<String>,  // success, warning, error
    pub start_date: Option<String>,  // ISO 8601
    pub end_date: Option<String>,  // ISO 8601
    pub connection: Option<String>,  // connector_id
    pub page: Option<i64>,
    pub per_page: Option<i64>,
}

/// Sync history response
#[derive(Debug, Serialize)]
pub struct SyncHistoryResponse {
    pub logs: Vec<SyncLogEntry>,
    pub total: i64,
    pub page: i64,
    pub per_page: i64,
    pub total_pages: i64,
}

/// Sync metrics response
#[derive(Debug, Serialize)]
pub struct SyncMetricsResponse {
    pub tenant_id: String,
    pub total_records_processed: i64,
    pub total_errors: i64,
    pub total_warnings: i64,
    pub average_duration_ms: Option<f64>,
    pub last_run_at: Option<String>,
    pub by_entity: Vec<EntityMetrics>,
    pub by_connector: Vec<ConnectorMetrics>,
}

/// Per-entity metrics
#[derive(Debug, Serialize)]
pub struct EntityMetrics {
    pub entity_type: String,
    pub count: i64,
    pub errors: i64,
    pub warnings: i64,
    pub avg_duration_ms: Option<f64>,
}

/// Per-connector metrics
#[derive(Debug, Serialize)]
pub struct ConnectorMetrics {
    pub connector_id: String,
    pub count: i64,
    pub errors: i64,
    pub warnings: i64,
    pub last_sync_at: Option<String>,
}

/// Health check response
#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,  // healthy, degraded, unhealthy
    pub version: String,
    pub timestamp: String,
    pub connectors: Vec<ConnectorHealth>,
}

/// Connector health status
#[derive(Debug, Serialize)]
pub struct ConnectorHealth {
    pub connector_id: String,
    pub platform: String,
    pub status: String,  // connected, disconnected, error
    pub last_sync_at: Option<String>,
    pub error_count_24h: i64,
    pub is_active: bool,
}

/// GET /api/sync/history - Get paginated sync history
pub async fn get_sync_history(
    pool: web::Data<SqlitePool>,
    query: web::Query<SyncHistoryQuery>,
) -> impl Responder {
    let tenant_id = get_current_tenant_id();

    let page = query.page.unwrap_or(1).max(1);
    let per_page = query.per_page.unwrap_or(50).min(100);
    let offset = (page - 1) * per_page;

    // Build dynamic query
    let mut where_clauses = vec!["tenant_id = ?".to_string()];
    let mut params: Vec<String> = vec![tenant_id.clone()];

    if let Some(entity) = &query.entity {
        where_clauses.push("entity_type = ?".to_string());
        params.push(entity.clone());
    }

    if let Some(status) = &query.status {
        where_clauses.push("result = ?".to_string());
        params.push(status.clone());
    }

    if let Some(connection) = &query.connection {
        where_clauses.push("connector_id = ?".to_string());
        params.push(connection.clone());
    }

    if let Some(start_date) = &query.start_date {
        where_clauses.push("created_at >= ?".to_string());
        params.push(start_date.clone());
    }

    if let Some(end_date) = &query.end_date {
        where_clauses.push("created_at <= ?".to_string());
        params.push(end_date.clone());
    }

    let where_clause = where_clauses.join(" AND ");

    // Get total count
    let count_query = format!(
        "SELECT COUNT(*) FROM sync_logs WHERE {}",
        where_clause
    );

    let mut count_query_builder = sqlx::query_scalar::<_, i64>(&count_query);
    for param in &params {
        count_query_builder = count_query_builder.bind(param);
    }

    let total = match count_query_builder.fetch_one(pool.as_ref()).await {
        Ok(count) => count,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to count logs: {}", e)
            }));
        }
    };

    // Get paginated logs
    let logs_query = format!(
        "SELECT id, tenant_id, sync_id, connector_id, entity_type, entity_id,
                operation, result, level, message, error_details, duration_ms,
                metadata, created_at
         FROM sync_logs
         WHERE {}
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?",
        where_clause
    );

    let mut logs_query_builder = sqlx::query_as::<_, (
        String, String, String, String, String, String, String, String, String,
        String, Option<String>, Option<i64>, Option<String>, String,
    )>(&logs_query);

    for param in &params {
        logs_query_builder = logs_query_builder.bind(param);
    }
    logs_query_builder = logs_query_builder.bind(per_page).bind(offset);

    let logs = match logs_query_builder.fetch_all(pool.as_ref()).await {
        Ok(rows) => rows,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch logs: {}", e)
            }));
        }
    };

    let log_entries: Vec<SyncLogEntry> = logs
        .into_iter()
        .map(|row| {
            use crate::services::sync_logger::{SyncResult, LogLevel};

            let result = match row.7.as_str() {
                "success" => SyncResult::Success,
                "warning" => SyncResult::Warning,
                "error" => SyncResult::Error,
                _ => SyncResult::Error,
            };

            let level = match row.8.as_str() {
                "debug" => LogLevel::Debug,
                "info" => LogLevel::Info,
                "warn" => LogLevel::Warn,
                "error" => LogLevel::Error,
                _ => LogLevel::Info,
            };

            SyncLogEntry {
                id: row.0,
                tenant_id: row.1,
                sync_id: row.2,
                connector_id: row.3,
                entity_type: row.4,
                entity_id: row.5,
                operation: row.6,
                result,
                level,
                message: row.9,
                error_details: row.10,
                duration_ms: row.11,
                metadata: row.12.and_then(|m| serde_json::from_str(&m).ok()),
                created_at: row.13,
            }
        })
        .collect();

    let total_pages = (total as f64 / per_page as f64).ceil() as i64;

    HttpResponse::Ok().json(SyncHistoryResponse {
        logs: log_entries,
        total,
        page,
        per_page,
        total_pages,
    })
}

/// GET /api/sync/metrics - Get aggregate sync metrics
pub async fn get_sync_metrics(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    let tenant_id = get_current_tenant_id();

    // Get overall metrics
    let overall = sqlx::query_as::<_, (i64, i64, i64, Option<f64>, Option<String>)>(
        r#"
        SELECT 
            COUNT(*) as total_records,
            SUM(CASE WHEN result = 'error' THEN 1 ELSE 0 END) as total_errors,
            SUM(CASE WHEN result = 'warning' THEN 1 ELSE 0 END) as total_warnings,
            AVG(duration_ms) as avg_duration,
            MAX(created_at) as last_run
        FROM sync_logs
        WHERE tenant_id = ?
        "#
    )
    .bind(&tenant_id)
    .fetch_one(pool.as_ref())
    .await;

    let (total_records, total_errors, total_warnings, avg_duration, last_run) = match overall {
        Ok(row) => row,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch overall metrics: {}", e)
            }));
        }
    };

    // Get per-entity metrics
    let entity_metrics = sqlx::query_as::<_, (String, i64, i64, i64, Option<f64>)>(
        r#"
        SELECT 
            entity_type,
            COUNT(*) as count,
            SUM(CASE WHEN result = 'error' THEN 1 ELSE 0 END) as errors,
            SUM(CASE WHEN result = 'warning' THEN 1 ELSE 0 END) as warnings,
            AVG(duration_ms) as avg_duration
        FROM sync_logs
        WHERE tenant_id = ?
        GROUP BY entity_type
        ORDER BY count DESC
        "#
    )
    .bind(&tenant_id)
    .fetch_all(pool.as_ref())
    .await;

    let by_entity: Vec<EntityMetrics> = match entity_metrics {
        Ok(rows) => rows
            .into_iter()
            .map(|row| EntityMetrics {
                entity_type: row.0,
                count: row.1,
                errors: row.2,
                warnings: row.3,
                avg_duration_ms: row.4,
            })
            .collect(),
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch entity metrics: {}", e)
            }));
        }
    };

    // Get per-connector metrics
    let connector_metrics = sqlx::query_as::<_, (String, i64, i64, i64, Option<String>)>(
        r#"
        SELECT 
            connector_id,
            COUNT(*) as count,
            SUM(CASE WHEN result = 'error' THEN 1 ELSE 0 END) as errors,
            SUM(CASE WHEN result = 'warning' THEN 1 ELSE 0 END) as warnings,
            MAX(created_at) as last_sync
        FROM sync_logs
        WHERE tenant_id = ?
        GROUP BY connector_id
        ORDER BY count DESC
        "#
    )
    .bind(&tenant_id)
    .fetch_all(pool.as_ref())
    .await;

    let by_connector: Vec<ConnectorMetrics> = match connector_metrics {
        Ok(rows) => rows
            .into_iter()
            .map(|row| ConnectorMetrics {
                connector_id: row.0,
                count: row.1,
                errors: row.2,
                warnings: row.3,
                last_sync_at: row.4,
            })
            .collect(),
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch connector metrics: {}", e)
            }));
        }
    };

    HttpResponse::Ok().json(SyncMetricsResponse {
        tenant_id,
        total_records_processed: total_records,
        total_errors,
        total_warnings,
        average_duration_ms: avg_duration,
        last_run_at: last_run,
        by_entity,
        by_connector,
    })
}

/// GET /api/integrations/health - Get service health and connector status
pub async fn get_health(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    let tenant_id = get_current_tenant_id();

    let now = Utc::now().to_rfc3339();

    // Get connector statuses
    let connectors = sqlx::query_as::<_, (String, String, bool, Option<String>)>(
        r#"
        SELECT id, platform, is_active, last_verified_at
        FROM integration_credentials
        WHERE tenant_id = ?
        "#
    )
    .bind(&tenant_id)
    .fetch_all(pool.as_ref())
    .await;

    let mut connector_health = Vec::new();

    if let Ok(rows) = connectors {
        for row in rows {
            let connector_id = row.0;
            let platform = row.1;
            let is_active = row.2;
            let _last_verified = row.3;

            // Get error count in last 24 hours
            let error_count = sqlx::query_scalar::<_, i64>(
                r#"
                SELECT COUNT(*)
                FROM sync_logs
                WHERE tenant_id = ? 
                  AND connector_id = ?
                  AND result = 'error'
                  AND created_at >= datetime('now', '-24 hours')
                "#
            )
            .bind(&tenant_id)
            .bind(&connector_id)
            .fetch_one(pool.as_ref())
            .await
            .unwrap_or(0);

            // Get last sync time
            let last_sync = sqlx::query_scalar::<_, Option<String>>(
                r#"
                SELECT MAX(created_at)
                FROM sync_logs
                WHERE tenant_id = ? AND connector_id = ?
                "#
            )
            .bind(&tenant_id)
            .bind(&connector_id)
            .fetch_one(pool.as_ref())
            .await
            .unwrap_or(None);

            // Determine status
            let status = if !is_active {
                "disconnected".to_string()
            } else if error_count > 10 {
                "error".to_string()
            } else {
                "connected".to_string()
            };

            connector_health.push(ConnectorHealth {
                connector_id,
                platform,
                status,
                last_sync_at: last_sync,
                error_count_24h: error_count,
                is_active,
            });
        }
    }

    // Determine overall health
    let overall_status = if connector_health.iter().any(|c| c.status == "error") {
        "degraded"
    } else if connector_health.iter().all(|c| c.status == "connected") {
        "healthy"
    } else {
        "degraded"
    };

    HttpResponse::Ok().json(HealthResponse {
        status: overall_status.to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        timestamp: now,
        connectors: connector_health,
    })
}

/// Export sync history to CSV
#[derive(Debug, Deserialize)]
pub struct ExportQuery {
    pub format: Option<String>,  // csv, json
}

/// GET /api/sync/history/export - Export sync history
pub async fn export_sync_history(
    pool: web::Data<SqlitePool>,
    query: web::Query<SyncHistoryQuery>,
    export_query: web::Query<ExportQuery>,
) -> impl Responder {
    let tenant_id = get_current_tenant_id();

    let format = export_query.format.as_deref().unwrap_or("csv");

    // Build query (same as get_sync_history but without pagination)
    let mut where_clauses = vec!["tenant_id = ?".to_string()];
    let mut params: Vec<String> = vec![tenant_id.clone()];

    if let Some(entity) = &query.entity {
        where_clauses.push("entity_type = ?".to_string());
        params.push(entity.clone());
    }

    if let Some(status) = &query.status {
        where_clauses.push("result = ?".to_string());
        params.push(status.clone());
    }

    if let Some(connection) = &query.connection {
        where_clauses.push("connector_id = ?".to_string());
        params.push(connection.clone());
    }

    if let Some(start_date) = &query.start_date {
        where_clauses.push("created_at >= ?".to_string());
        params.push(start_date.clone());
    }

    if let Some(end_date) = &query.end_date {
        where_clauses.push("created_at <= ?".to_string());
        params.push(end_date.clone());
    }

    let where_clause = where_clauses.join(" AND ");

    let logs_query = format!(
        "SELECT id, sync_id, connector_id, entity_type, entity_id,
                operation, result, level, message, error_details, duration_ms, created_at
         FROM sync_logs
         WHERE {}
         ORDER BY created_at DESC
         LIMIT 10000",  // Limit exports to 10k records
        where_clause
    );

    let mut logs_query_builder = sqlx::query_as::<_, (
        String, String, String, String, String, String, String, String,
        String, Option<String>, Option<i64>, String,
    )>(&logs_query);

    for param in &params {
        logs_query_builder = logs_query_builder.bind(param);
    }

    let logs = match logs_query_builder.fetch_all(pool.as_ref()).await {
        Ok(rows) => rows,
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch logs: {}", e)
            }));
        }
    };

    match format {
        "json" => {
            let json_data: Vec<serde_json::Value> = logs
                .into_iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.0,
                        "sync_id": row.1,
                        "connector_id": row.2,
                        "entity_type": row.3,
                        "entity_id": row.4,
                        "operation": row.5,
                        "result": row.6,
                        "level": row.7,
                        "message": row.8,
                        "error_details": row.9,
                        "duration_ms": row.10,
                        "created_at": row.11,
                    })
                })
                .collect();

            HttpResponse::Ok()
                .content_type("application/json")
                .insert_header(("Content-Disposition", "attachment; filename=\"sync_history.json\""))
                .json(json_data)
        }
        "csv" | _ => {
            // Build CSV
            let mut csv = String::from("id,sync_id,connector_id,entity_type,entity_id,operation,result,level,message,error_details,duration_ms,created_at\n");

            for row in logs {
                csv.push_str(&format!(
                    "{},{},{},{},{},{},{},{},{},{},{},{}\n",
                    row.0,
                    row.1,
                    row.2,
                    row.3,
                    row.4,
                    row.5,
                    row.6,
                    row.7,
                    escape_csv(&row.8),
                    escape_csv(&row.9.unwrap_or_default()),
                    row.10.map(|d| d.to_string()).unwrap_or_default(),
                    row.11,
                ));
            }

            HttpResponse::Ok()
                .content_type("text/csv")
                .insert_header(("Content-Disposition", "attachment; filename=\"sync_history.csv\""))
                .body(csv)
        }
    }
}

/// Escape CSV field
fn escape_csv(field: &str) -> String {
    if field.contains(',') || field.contains('"') || field.contains('\n') {
        format!("\"{}\"", field.replace('"', "\"\""))
    } else {
        field.to_string()
    }
}

// ============================================================================
// Route Configuration
// ============================================================================

/// Configure sync history and monitoring routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/sync")
            .route("/history", web::get().to(get_sync_history))
            .route("/history/export", web::get().to(export_sync_history))
            .route("/metrics", web::get().to(get_sync_metrics))
    )
    .service(
        web::scope("/api/integrations")
            .route("/health", web::get().to(get_health))
    );
}
