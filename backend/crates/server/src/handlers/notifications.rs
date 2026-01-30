/**
 * Notification Configuration Handlers
 * 
 * API endpoints for managing notification configurations:
 * - GET /api/notifications/configs - List notification configs
 * - POST /api/notifications/configs - Create notification config
 * - PUT /api/notifications/configs/{id} - Update notification config
 * - DELETE /api/notifications/configs/{id} - Delete notification config
 * - POST /api/notifications/test - Test notification
 * - GET /api/notifications/history - Get notification history
 * 
 * Requirements: Task 14.3 - Error notification system
 */

use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::services::sync_notifier::{
    NotificationChannelConfig, NotificationConfig, NotificationEvent, NotificationFilters,
    NotificationSeverity, NotificationType, SyncNotifier,
};

/// Request to create/update notification config
#[derive(Debug, Deserialize)]
pub struct NotificationConfigRequest {
    pub notification_type: NotificationType,
    pub enabled: bool,
    pub config: NotificationChannelConfig,
    pub filters: NotificationFilters,
}

/// Response for notification config
#[derive(Debug, Serialize)]
pub struct NotificationConfigResponse {
    pub id: String,
    pub tenant_id: String,
    pub notification_type: NotificationType,
    pub enabled: bool,
    pub config: NotificationChannelConfig,
    pub filters: NotificationFilters,
    pub created_at: String,
    pub updated_at: String,
}

/// Request to test notification
#[derive(Debug, Deserialize)]
pub struct TestNotificationRequest {
    pub config_id: String,
}

/// Query parameters for notification history
#[derive(Debug, Deserialize)]
pub struct NotificationHistoryQuery {
    pub severity: Option<String>,
    pub connector_id: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

/// Configure notification routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/notifications")
            .route("/configs", web::get().to(list_configs))
            .route("/configs", web::post().to(create_config))
            .route("/configs/{id}", web::put().to(update_config))
            .route("/configs/{id}", web::delete().to(delete_config))
            .route("/test", web::post().to(test_notification))
            .route("/history", web::get().to(get_history))
    );
}

/// GET /api/notifications/configs
/// List notification configurations for tenant
pub async fn list_configs(
    tenant_id: web::ReqData<String>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    let configs = sqlx::query_as::<_, (
        String,
        String,
        String,
        bool,
        String,
        String,
        String,
        String,
    )>(
        r#"
        SELECT id, tenant_id, notification_type, enabled, config, filters, created_at, updated_at
        FROM notification_configs
        WHERE tenant_id = ?
        ORDER BY created_at DESC
        "#
    )
    .bind(&**tenant_id)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let response: Vec<serde_json::Value> = configs
        .iter()
        .filter_map(|row| {
            let notification_type = match row.2.as_str() {
                "email" => NotificationType::Email,
                "slack" => NotificationType::Slack,
                "webhook" => NotificationType::Webhook,
                _ => return None,
            };

            let config: NotificationChannelConfig = serde_json::from_str(&row.4).ok()?;
            let filters: NotificationFilters = serde_json::from_str(&row.5).ok()?;

            Some(serde_json::json!({
                "id": row.0,
                "tenant_id": row.1,
                "notification_type": notification_type,
                "enabled": row.3,
                "config": config,
                "filters": filters,
                "created_at": row.6,
                "updated_at": row.7,
            }))
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}

/// POST /api/notifications/configs
/// Create notification configuration
pub async fn create_config(
    tenant_id: web::ReqData<String>,
    pool: web::Data<SqlitePool>,
    request: web::Json<NotificationConfigRequest>,
) -> Result<HttpResponse> {
    let config_id = format!("notif_{}", Uuid::new_v4().simple());
    let now = chrono::Utc::now().to_rfc3339();

    let notification_type_str = match request.notification_type {
        NotificationType::Email => "email",
        NotificationType::Slack => "slack",
        NotificationType::Webhook => "webhook",
    };

    let config_json = serde_json::to_string(&request.config)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid config: {}", e)))?;

    let filters_json = serde_json::to_string(&request.filters)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid filters: {}", e)))?;

    sqlx::query(
        r#"
        INSERT INTO notification_configs (id, tenant_id, notification_type, enabled, config, filters, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&config_id)
    .bind(&**tenant_id)
    .bind(notification_type_str)
    .bind(request.enabled)
    .bind(&config_json)
    .bind(&filters_json)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "id": config_id,
        "tenant_id": &**tenant_id,
        "notification_type": request.notification_type,
        "enabled": request.enabled,
        "config": request.config,
        "filters": request.filters,
        "created_at": now,
        "updated_at": now,
    })))
}

/// PUT /api/notifications/configs/{id}
/// Update notification configuration
pub async fn update_config(
    tenant_id: web::ReqData<String>,
    pool: web::Data<SqlitePool>,
    config_id: web::Path<String>,
    request: web::Json<NotificationConfigRequest>,
) -> Result<HttpResponse> {
    let now = chrono::Utc::now().to_rfc3339();

    let notification_type_str = match request.notification_type {
        NotificationType::Email => "email",
        NotificationType::Slack => "slack",
        NotificationType::Webhook => "webhook",
    };

    let config_json = serde_json::to_string(&request.config)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid config: {}", e)))?;

    let filters_json = serde_json::to_string(&request.filters)
        .map_err(|e| actix_web::error::ErrorBadRequest(format!("Invalid filters: {}", e)))?;

    let result = sqlx::query(
        r#"
        UPDATE notification_configs
        SET notification_type = ?, enabled = ?, config = ?, filters = ?, updated_at = ?
        WHERE id = ? AND tenant_id = ?
        "#
    )
    .bind(notification_type_str)
    .bind(request.enabled)
    .bind(&config_json)
    .bind(&filters_json)
    .bind(&now)
    .bind(&*config_id)
    .bind(&**tenant_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if result.rows_affected() == 0 {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Notification config not found"
        })));
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "id": &*config_id,
        "tenant_id": &**tenant_id,
        "notification_type": request.notification_type,
        "enabled": request.enabled,
        "config": request.config,
        "filters": request.filters,
        "updated_at": now,
    })))
}

/// DELETE /api/notifications/configs/{id}
/// Delete notification configuration
pub async fn delete_config(
    tenant_id: web::ReqData<String>,
    pool: web::Data<SqlitePool>,
    config_id: web::Path<String>,
) -> Result<HttpResponse> {
    let result = sqlx::query(
        r#"
        DELETE FROM notification_configs
        WHERE id = ? AND tenant_id = ?
        "#
    )
    .bind(&*config_id)
    .bind(&**tenant_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if result.rows_affected() == 0 {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Notification config not found"
        })));
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Notification config deleted successfully"
    })))
}

/// POST /api/notifications/test
/// Test notification configuration
pub async fn test_notification(
    tenant_id: web::ReqData<String>,
    pool: web::Data<SqlitePool>,
    request: web::Json<TestNotificationRequest>,
) -> Result<HttpResponse> {
    let notifier = SyncNotifier::new(pool.get_ref().clone());

    // Create test event
    let event = NotificationEvent {
        event_type: "test".to_string(),
        severity: NotificationSeverity::Info,
        title: "Test Notification".to_string(),
        message: "This is a test notification from EasySale Sync Monitor.".to_string(),
        connector_id: Some("test".to_string()),
        entity_type: Some("test".to_string()),
        error_type: None,
        details: std::collections::HashMap::new(),
        suggested_actions: vec![
            "If you received this notification, your configuration is working correctly.".to_string(),
        ],
        timestamp: chrono::Utc::now().to_rfc3339(),
    };

    // Load specific config
    let config = sqlx::query_as::<_, (String, String, String, bool, String, String)>(
        r#"
        SELECT id, tenant_id, notification_type, enabled, config, filters
        FROM notification_configs
        WHERE id = ? AND tenant_id = ?
        "#
    )
    .bind(&request.config_id)
    .bind(&**tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if let Some(row) = config {
        let notification_type = match row.2.as_str() {
            "email" => NotificationType::Email,
            "slack" => NotificationType::Slack,
            "webhook" => NotificationType::Webhook,
            _ => {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "Invalid notification type"
                })))
            }
        };

        let channel_config: NotificationChannelConfig = serde_json::from_str(&row.4)
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

        let filters: NotificationFilters = serde_json::from_str(&row.5)
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

        let test_config = NotificationConfig {
            id: row.0,
            tenant_id: row.1,
            notification_type,
            enabled: row.3,
            config: channel_config,
            filters,
        };

        // Send test notification
        if let Err(e) = notifier.send_to_channel(&test_config, &event).await {
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to send test notification: {}", e)
            })));
        }

        Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Test notification sent successfully"
        })))
    } else {
        Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Notification config not found"
        })))
    }
}

/// GET /api/notifications/history
/// Get notification history
pub async fn get_history(
    tenant_id: web::ReqData<String>,
    pool: web::Data<SqlitePool>,
    query: web::Query<NotificationHistoryQuery>,
) -> Result<HttpResponse> {
    let limit = query.limit.unwrap_or(50).min(200);
    let offset = query.offset.unwrap_or(0);

    let mut sql = String::from(
        r#"
        SELECT id, config_id, event_type, severity, title, message,
               connector_id, entity_type, error_type, sent_at, success, error_message
        FROM notification_history
        WHERE tenant_id = ?
        "#
    );

    let mut params: Vec<String> = vec![tenant_id.to_string()];

    if let Some(ref severity) = query.severity {
        sql.push_str(" AND severity = ?");
        params.push(severity.clone());
    }

    if let Some(ref connector_id) = query.connector_id {
        sql.push_str(" AND connector_id = ?");
        params.push(connector_id.clone());
    }

    sql.push_str(" ORDER BY sent_at DESC LIMIT ? OFFSET ?");

    let mut db_query = sqlx::query_as::<_, (
        String,
        String,
        String,
        String,
        String,
        String,
        Option<String>,
        Option<String>,
        Option<String>,
        String,
        bool,
        Option<String>,
    )>(&sql);

    for param in params {
        db_query = db_query.bind(param);
    }
    db_query = db_query.bind(limit).bind(offset);

    let history = db_query
        .fetch_all(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let response: Vec<serde_json::Value> = history
        .iter()
        .map(|row| {
            serde_json::json!({
                "id": row.0,
                "config_id": row.1,
                "event_type": row.2,
                "severity": row.3,
                "title": row.4,
                "message": row.5,
                "connector_id": row.6,
                "entity_type": row.7,
                "error_type": row.8,
                "sent_at": row.9,
                "success": row.10,
                "error_message": row.11,
            })
        })
        .collect();

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "history": response,
        "limit": limit,
        "offset": offset,
    })))
}

