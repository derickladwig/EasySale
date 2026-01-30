use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::services::audit_logger::{AuditLogger, AuditLogEntry};

/// Query parameters for listing audit logs
#[derive(Debug, Deserialize)]
pub struct AuditLogQuery {
    /// Filter by entity type (user, role, store, station, setting)
    pub entity_type: Option<String>,
    /// Filter by entity ID
    pub entity_id: Option<String>,
    /// Filter by user ID who performed the action
    pub user_id: Option<String>,
    /// Filter by store ID
    pub store_id: Option<String>,
    /// Filter by action (create, update, delete)
    pub operation: Option<String>,
    /// Filter by date range - start date (ISO 8601)
    pub start_date: Option<String>,
    /// Filter by date range - end date (ISO 8601)
    pub end_date: Option<String>,
    /// Filter offline operations only
    pub offline_only: Option<bool>,
    /// Limit number of results (default: 100, max: 1000)
    pub limit: Option<i32>,
}

/// Response for audit log list
#[derive(Debug, Serialize, Deserialize)]
pub struct AuditLogResponse {
    pub logs: Vec<AuditLogEntryResponse>,
    pub total: usize,
}

/// Audit log entry response with parsed changes
#[derive(Debug, Serialize, Deserialize)]
pub struct AuditLogEntryResponse {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub user_id: Option<String>,
    pub changes: Option<serde_json::Value>,
    pub is_offline: bool,
    pub created_at: String,
    pub store_id: String,
}

impl From<AuditLogEntry> for AuditLogEntryResponse {
    fn from(entry: AuditLogEntry) -> Self {
        let changes = entry.changes.and_then(|c| serde_json::from_str(&c).ok());
        
        Self {
            id: entry.id,
            entity_type: entry.entity_type,
            entity_id: entry.entity_id,
            operation: entry.operation,
            user_id: entry.user_id,
            changes,
            is_offline: entry.is_offline,
            created_at: entry.created_at,
            store_id: entry.store_id,
        }
    }
}

/// GET /api/audit-logs - List audit logs with filtering
pub async fn list_audit_logs(
    pool: web::Data<SqlitePool>,
    query: web::Query<AuditLogQuery>,
) -> impl Responder {
    let logger = AuditLogger::new(pool.get_ref().clone());
    let limit = query.limit.unwrap_or(100).min(1000);

    // Build query based on filters
    let logs = if let (Some(start_date), Some(end_date)) = (&query.start_date, &query.end_date) {
        // Date range query
        logger
            .get_operations_by_date_range(
                start_date,
                end_date,
                query.store_id.as_deref(),
                limit,
            )
            .await
    } else if let Some(user_id) = &query.user_id {
        // User-specific query
        logger.get_user_operations(user_id, limit).await
    } else if let Some(entity_type) = &query.entity_type {
        if let Some(entity_id) = &query.entity_id {
            // Entity-specific query
            logger.get_audit_trail(entity_type, entity_id, limit).await
        } else {
            // Entity type only - need custom query
            get_logs_by_entity_type(pool.get_ref(), entity_type, limit).await
        }
    } else if query.offline_only == Some(true) {
        // Offline operations
        if let Some(store_id) = &query.store_id {
            logger.get_offline_operations(store_id, limit).await
        } else {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "store_id is required when filtering offline operations"
            }));
        }
    } else {
        // All logs (with optional store filter)
        get_all_logs(pool.get_ref(), query.store_id.as_deref(), limit).await
    };

    match logs {
        Ok(entries) => {
            let total = entries.len();
            let response_logs: Vec<AuditLogEntryResponse> = entries
                .into_iter()
                .map(AuditLogEntryResponse::from)
                .collect();

            HttpResponse::Ok().json(AuditLogResponse {
                logs: response_logs,
                total,
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch audit logs: {}", e)
        })),
    }
}

/// GET /api/audit-logs/:id - Get a single audit log entry
pub async fn get_audit_log(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let log_id = path.into_inner();

    match sqlx::query_as::<_, AuditLogEntry>(
        "SELECT id, entity_type, entity_id, operation, user_id, employee_id, 
                changes, ip_address, user_agent, is_offline, created_at, store_id
         FROM audit_log WHERE id = ?"
    )
    .bind(&log_id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(entry) => {
            let response = AuditLogEntryResponse::from(entry);
            HttpResponse::Ok().json(response)
        }
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Audit log entry not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch audit log: {}", e)
        })),
    }
}

/// GET /api/audit-logs/export - Export audit logs to CSV
pub async fn export_audit_logs(
    pool: web::Data<SqlitePool>,
    query: web::Query<AuditLogQuery>,
) -> impl Responder {
    let logger = AuditLogger::new(pool.get_ref().clone());
    let limit = query.limit.unwrap_or(1000).min(10000); // Higher limit for exports

    // Fetch logs using same logic as list
    let logs = if let (Some(start_date), Some(end_date)) = (&query.start_date, &query.end_date) {
        logger
            .get_operations_by_date_range(
                start_date,
                end_date,
                query.store_id.as_deref(),
                limit,
            )
            .await
    } else {
        get_all_logs(pool.get_ref(), query.store_id.as_deref(), limit).await
    };

    match logs {
        Ok(entries) => {
            // Build CSV
            let mut csv = String::from("ID,Entity Type,Entity ID,Operation,User ID,Store ID,Offline,Created At,Changes\n");
            
            for entry in entries {
                let changes_str = entry.changes.unwrap_or_default().replace("\"", "\"\"");
                csv.push_str(&format!(
                    "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",{},\"{}\",\"{}\"\n",
                    entry.id,
                    entry.entity_type,
                    entry.entity_id,
                    entry.operation,
                    entry.user_id.unwrap_or_default(),
                    entry.store_id,
                    entry.is_offline,
                    entry.created_at,
                    changes_str
                ));
            }

            HttpResponse::Ok()
                .content_type("text/csv")
                .insert_header(("Content-Disposition", "attachment; filename=\"audit_logs.csv\""))
                .body(csv)
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to export audit logs: {}", e)
        })),
    }
}

// Helper functions

async fn get_logs_by_entity_type(
    pool: &SqlitePool,
    entity_type: &str,
    limit: i32,
) -> Result<Vec<AuditLogEntry>, Box<dyn std::error::Error>> {
    let entries = sqlx::query_as::<_, AuditLogEntry>(
        r#"
        SELECT id, entity_type, entity_id, operation, user_id, employee_id,
               changes, ip_address, user_agent, is_offline, created_at, store_id
        FROM audit_log
        WHERE entity_type = ?
        ORDER BY created_at DESC
        LIMIT ?
        "#
    )
    .bind(entity_type)
    .bind(limit)
    .fetch_all(pool)
    .await?;

    Ok(entries)
}

async fn get_all_logs(
    pool: &SqlitePool,
    store_id: Option<&str>,
    limit: i32,
) -> Result<Vec<AuditLogEntry>, Box<dyn std::error::Error>> {
    let entries = if let Some(sid) = store_id {
        sqlx::query_as::<_, AuditLogEntry>(
            r#"
            SELECT id, entity_type, entity_id, operation, user_id, employee_id,
                   changes, ip_address, user_agent, is_offline, created_at, store_id
            FROM audit_log
            WHERE store_id = ?
            ORDER BY created_at DESC
            LIMIT ?
            "#
        )
        .bind(sid)
        .bind(limit)
        .fetch_all(pool)
        .await?
    } else {
        sqlx::query_as::<_, AuditLogEntry>(
            r#"
            SELECT id, entity_type, entity_id, operation, user_id, employee_id,
                   changes, ip_address, user_agent, is_offline, created_at, store_id
            FROM audit_log
            ORDER BY created_at DESC
            LIMIT ?
            "#
        )
        .bind(limit)
        .fetch_all(pool)
        .await?
    };

    Ok(entries)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::create_test_db;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn test_list_audit_logs() {
        let pool = create_test_db().await.unwrap();
        let logger = AuditLogger::new(pool.clone());

        // Create some test audit logs
        logger.log_settings_change(
            "user",
            "user-1",
            "create",
            "admin-1",
            "admin",
            Some("store-1"),
            None,
            None,
            Some(serde_json::json!({"username": "testuser"})),
            false,
        ).await.unwrap();

        logger.log_settings_change(
            "store",
            "store-1",
            "update",
            "admin-1",
            "admin",
            Some("store-1"),
            None,
            Some(serde_json::json!({"name": "Old Name"})),
            Some(serde_json::json!({"name": "New Name"})),
            false,
        ).await.unwrap();

        // Test the endpoint
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .route("/api/audit-logs", web::get().to(list_audit_logs))
        ).await;

        let req = test::TestRequest::get()
            .uri("/api/audit-logs")
            .to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
        
        let body: AuditLogResponse = test::read_body_json(resp).await;
        assert_eq!(body.total, 2);
        assert_eq!(body.logs.len(), 2);
    }

    #[actix_web::test]
    async fn test_list_audit_logs_with_entity_type_filter() {
        let pool = create_test_db().await.unwrap();
        let logger = AuditLogger::new(pool.clone());

        // Create test logs
        logger.log_settings_change(
            "user",
            "user-1",
            "create",
            "admin-1",
            "admin",
            Some("store-1"),
            None,
            None,
            Some(serde_json::json!({"username": "testuser"})),
            false,
        ).await.unwrap();

        logger.log_settings_change(
            "store",
            "store-1",
            "update",
            "admin-1",
            "admin",
            Some("store-1"),
            None,
            None,
            Some(serde_json::json!({"name": "Store"})),
            false,
        ).await.unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .route("/api/audit-logs", web::get().to(list_audit_logs))
        ).await;

        let req = test::TestRequest::get()
            .uri("/api/audit-logs?entity_type=user")
            .to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
        
        let body: AuditLogResponse = test::read_body_json(resp).await;
        assert_eq!(body.total, 1);
        assert_eq!(body.logs[0].entity_type, "user");
    }

    #[actix_web::test]
    async fn test_get_audit_log() {
        let pool = create_test_db().await.unwrap();
        let logger = AuditLogger::new(pool.clone());

        let log_id = logger.log_settings_change(
            "user",
            "user-1",
            "create",
            "admin-1",
            "admin",
            Some("store-1"),
            None,
            None,
            Some(serde_json::json!({"username": "testuser"})),
            false,
        ).await.unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .route("/api/audit-logs/{id}", web::get().to(get_audit_log))
        ).await;

        let req = test::TestRequest::get()
            .uri(&format!("/api/audit-logs/{}", log_id))
            .to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
        
        let body: AuditLogEntryResponse = test::read_body_json(resp).await;
        assert_eq!(body.id, log_id);
        assert_eq!(body.entity_type, "user");
    }

    #[actix_web::test]
    async fn test_get_audit_log_not_found() {
        let pool = create_test_db().await.unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .route("/api/audit-logs/{id}", web::get().to(get_audit_log))
        ).await;

        let req = test::TestRequest::get()
            .uri("/api/audit-logs/nonexistent-id")
            .to_request();
        let resp = test::call_service(&app, req).await;

        assert_eq!(resp.status(), 404);
    }

    #[actix_web::test]
    async fn test_export_audit_logs() {
        let pool = create_test_db().await.unwrap();
        let logger = AuditLogger::new(pool.clone());

        logger.log_settings_change(
            "user",
            "user-1",
            "create",
            "admin-1",
            "admin",
            Some("store-1"),
            None,
            None,
            Some(serde_json::json!({"username": "testuser"})),
            false,
        ).await.unwrap();

        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .route("/api/audit-logs/export", web::get().to(export_audit_logs))
        ).await;

        let req = test::TestRequest::get()
            .uri("/api/audit-logs/export")
            .to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
        
        let body = test::read_body(resp).await;
        let csv = String::from_utf8(body.to_vec()).unwrap();
        
        // Check CSV header
        assert!(csv.contains("ID,Entity Type,Entity ID"));
        // Check CSV contains the data (entity type, entity id, operation)
        assert!(csv.contains("\"user\""));
        assert!(csv.contains("\"user-1\""));
        assert!(csv.contains("\"create\""));
    }
}
