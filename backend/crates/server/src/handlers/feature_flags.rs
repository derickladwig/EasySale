use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::models::{ApiError, ApiResult, UserContext};
use crate::services::audit_logger::AuditLogger;

#[derive(Debug, Serialize, Deserialize)]
pub struct FeatureFlag {
    pub name: String,
    pub enabled: bool,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateFeatureFlagRequest {
    pub enabled: bool,
}

/// GET /api/feature-flags
/// Get all feature flags
pub async fn get_feature_flags(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
) -> ApiResult<HttpResponse> {
    let flags = sqlx::query_as!(
        FeatureFlag,
        r#"SELECT name, enabled as "enabled: bool", description FROM feature_flags WHERE tenant_id = ?"#,
        context.tenant_id
    )
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;

    Ok(HttpResponse::Ok().json(flags))
}

/// PUT /api/feature-flags/{name}
/// Update a feature flag
pub async fn update_feature_flag(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    name: web::Path<String>,
    req: web::Json<UpdateFeatureFlagRequest>,
) -> ApiResult<HttpResponse> {
    let flag_name = name.into_inner();

    // Get current state for audit log
    let current = sqlx::query!(
        r#"SELECT enabled as "enabled: bool" FROM feature_flags WHERE name = ? AND tenant_id = ?"#,
        flag_name,
        context.tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?
    .ok_or_else(|| ApiError::not_found("Feature flag not found"))?;

    let enabled_i32 = req.enabled as i32;

    // Update flag
    sqlx::query!(
        "UPDATE feature_flags SET enabled = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE name = ? AND tenant_id = ?",
        enabled_i32,
        flag_name,
        context.tenant_id
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to update feature flag: {}", e)))?;

    // Log the change
    let audit_logger = AuditLogger::new(pool.get_ref().clone());
    audit_logger
        .log_settings_change(
            "feature_flag",
            &flag_name,
            "update",
            &context.user_id.to_string(),
            &context.username,
            context.store_id.as_deref(),
            context.station_id.as_deref(),
            Some(serde_json::json!({ "enabled": current.enabled })),
            Some(serde_json::json!({ "enabled": req.enabled })),
            false, // is_offline
        )
        .await
        .map_err(|e| ApiError::internal(format!("Failed to log audit entry: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Feature flag updated successfully"
    })))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_feature_flag_serialization() {
        let flag = FeatureFlag {
            name: "loyalty_program".to_string(),
            enabled: true,
            description: Some("Loyalty program features".to_string()),
        };

        let json = serde_json::to_string(&flag).unwrap();
        assert!(json.contains("loyalty_program"));
        assert!(json.contains("true"));
    }
}
