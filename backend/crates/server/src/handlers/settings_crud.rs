use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::Utc;
use crate::services::audit_logger::AuditLogger;

#[derive(Debug, Serialize, Deserialize)]
pub struct SettingValue {
    pub key: String,
    pub value: String,
    pub scope: String, // global, store, station, user
    pub scope_id: Option<String>,
    pub data_type: String, // string, number, boolean, json
}

#[derive(Debug, Serialize)]
pub struct SettingResponse {
    pub id: i64,
    pub key: String,
    pub value: String,
    pub scope: String,
    pub scope_id: Option<String>,
    pub data_type: String,
    pub created_at: String,
    pub updated_at: String,
}

/// Get setting by key and scope
pub async fn get_setting(
    pool: web::Data<SqlitePool>,
    key: web::Path<String>,
    scope: web::Query<SettingValue>,
) -> Result<HttpResponse> {
    let key_value = key.into_inner();
    let setting = sqlx::query_as!(
        SettingResponse,
        r#"
        SELECT id as "id!: i64", key, value, scope, scope_id, data_type, created_at, updated_at
        FROM settings
        WHERE key = ? AND scope = ? AND (scope_id = ? OR scope_id IS NULL)
        ORDER BY 
            CASE scope
                WHEN 'user' THEN 1
                WHEN 'station' THEN 2
                WHEN 'store' THEN 3
                WHEN 'global' THEN 4
            END
        LIMIT 1
        "#,
        key_value,
        scope.scope,
        scope.scope_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match setting {
        Ok(Some(setting)) => Ok(HttpResponse::Ok().json(setting)),
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Setting not found"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch setting: {}", e)
        }))),
    }
}

/// List all settings
pub async fn list_settings(
    pool: web::Data<SqlitePool>,
    scope: web::Query<SettingValue>,
) -> Result<HttpResponse> {
    let settings = if !scope.scope.is_empty() {
        sqlx::query_as!(
            SettingResponse,
            r#"
            SELECT id as "id!: i64", key, value, scope, scope_id, data_type, created_at, updated_at
            FROM settings
            WHERE scope = ? AND (scope_id = ? OR scope_id IS NULL)
            ORDER BY key
            "#,
            scope.scope,
            scope.scope_id
        )
        .fetch_all(pool.get_ref())
        .await
    } else {
        sqlx::query_as!(
            SettingResponse,
            r#"
            SELECT id as "id!: i64", key, value, scope, scope_id, data_type, created_at, updated_at
            FROM settings
            ORDER BY key, scope
            "#
        )
        .fetch_all(pool.get_ref())
        .await
    };

    match settings {
        Ok(settings) => Ok(HttpResponse::Ok().json(settings)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch settings: {}", e)
        }))),
    }
}

/// Create or update setting
pub async fn upsert_setting(
    pool: web::Data<SqlitePool>,
    audit_logger: web::Data<AuditLogger>,
    context: web::ReqData<crate::models::UserContext>,
    req: web::Json<SettingValue>,
) -> Result<HttpResponse> {
    // Validate scope
    let valid_scopes = vec!["global", "store", "station", "user"];
    if !valid_scopes.contains(&req.scope.as_str()) {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Invalid scope. Must be one of: {}", valid_scopes.join(", "))
        })));
    }

    // Validate data type
    let valid_types = vec!["string", "number", "boolean", "json"];
    if !valid_types.contains(&req.data_type.as_str()) {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Invalid data type. Must be one of: {}", valid_types.join(", "))
        })));
    }

    let now = Utc::now().to_rfc3339();

    // Check if setting exists
    let existing = sqlx::query!(
        r#"
        SELECT id as "id!: i64", value
        FROM settings
        WHERE key = ? AND scope = ? AND (scope_id = ? OR (scope_id IS NULL AND ? IS NULL))
        "#,
        req.key,
        req.scope,
        req.scope_id,
        req.scope_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match existing {
        Ok(Some(existing)) => {
            // Update existing setting
            let old_value = existing.value;
            
            let result = sqlx::query!(
                r#"
                UPDATE settings
                SET value = ?, data_type = ?, updated_at = ?
                WHERE id = ?
                "#,
                req.value,
                req.data_type,
                now,
                existing.id
            )
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => {
                    // Log audit event
                    let before_data = serde_json::json!({
                        "key": req.key,
                        "value": old_value,
                        "scope": req.scope,
                        "scope_id": req.scope_id,
                    });

                    let after_data = serde_json::json!({
                        "key": req.key,
                        "value": req.value,
                        "scope": req.scope,
                        "scope_id": req.scope_id,
                    });

                    audit_logger.log_settings_change(
                        "setting",
                        &existing.id.to_string(),
                        "update",
                        &context.user_id,
                        &context.username,
                        context.store_id.as_deref(),
                        context.station_id.as_deref(),
                        Some(before_data),
                        Some(after_data),
                        false, // is_offline
                    ).await.ok(); // Ignore audit errors

                    Ok(HttpResponse::Ok().json(serde_json::json!({
                        "id": existing.id,
                        "message": "Setting updated successfully"
                    })))
                }
                Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to update setting: {}", e)
                }))),
            }
        }
        Ok(None) => {
            // Create new setting
            let result = sqlx::query!(
                r#"
                INSERT INTO settings (key, value, scope, scope_id, data_type, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                "#,
                req.key,
                req.value,
                req.scope,
                req.scope_id,
                req.data_type,
                now,
                now
            )
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(result) => {
                    let setting_id = result.last_insert_rowid();

                    // Log audit event
                    let after_data = serde_json::json!({
                        "key": req.key,
                        "value": req.value,
                        "scope": req.scope,
                        "scope_id": req.scope_id,
                    });

                    audit_logger.log_settings_change(
                        "setting",
                        &setting_id.to_string(),
                        "create",
                        &context.user_id,
                        &context.username,
                        context.store_id.as_deref(),
                        context.station_id.as_deref(),
                        None,
                        Some(after_data),
                        false, // is_offline
                    ).await.ok(); // Ignore audit errors

                    Ok(HttpResponse::Created().json(serde_json::json!({
                        "id": setting_id,
                        "message": "Setting created successfully"
                    })))
                }
                Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to create setting: {}", e)
                }))),
            }
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to check existing setting: {}", e)
        }))),
    }
}

/// Delete setting
pub async fn delete_setting(
    pool: web::Data<SqlitePool>,
    audit_logger: web::Data<AuditLogger>,
    context: web::ReqData<crate::models::UserContext>,
    key: web::Path<String>,
    scope: web::Query<SettingValue>,
) -> Result<HttpResponse> {
    let key = key.into_inner();

    // Fetch setting data for audit log
    let setting = sqlx::query!(
        r#"
        SELECT id as "id!: i64", value, scope, scope_id
        FROM settings
        WHERE key = ? AND scope = ? AND (scope_id = ? OR (scope_id IS NULL AND ? IS NULL))
        "#,
        key,
        scope.scope,
        scope.scope_id,
        scope.scope_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    let (setting_id, setting_data) = match setting {
        Ok(Some(setting)) => {
            let data = serde_json::json!({
                "key": key,
                "value": setting.value,
                "scope": setting.scope,
                "scope_id": setting.scope_id,
            });
            (setting.id, data)
        }
        Ok(None) => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Setting not found"
            })));
        }
        Err(e) => {
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch setting: {}", e)
            })));
        }
    };

    // Delete setting
    let result = sqlx::query!(
        r#"
        DELETE FROM settings
        WHERE id = ?
        "#,
        setting_id
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Log audit event
            audit_logger.log_settings_change(
                "setting",
                &setting_id.to_string(),
                "delete",
                &context.user_id,
                &context.username,
                context.store_id.as_deref(),
                context.station_id.as_deref(),
                Some(setting_data),
                None,
                false, // is_offline
            ).await.ok(); // Ignore audit errors

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Setting deleted successfully"
            })))
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to delete setting: {}", e)
        }))),
    }
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/settings")
            .route("", web::get().to(list_settings))
            .route("/{key}", web::get().to(get_setting))
            .route("", web::post().to(upsert_setting))
            .route("/{key}", web::delete().to(delete_setting))
    );
}
