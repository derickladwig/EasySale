use actix_web::{web, HttpResponse};
use sqlx::SqlitePool;

use crate::models::{
    ApiError, ApiResult, LocalizationSettings, NetworkSettings, PerformanceSettings,
    UpdateLocalizationRequest, UpdateNetworkRequest, UpdatePerformanceRequest,
    UpdateUserPreferencesRequest, UserContext, UserPreferences,
};

/// GET /api/settings/preferences
/// Get current user's preferences
pub async fn get_preferences(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
) -> ApiResult<HttpResponse> {
    let preferences = sqlx::query_as::<_, UserPreferences>(
        "SELECT user_id, display_name, email, theme, email_notifications, desktop_notifications, tenant_id
         FROM user_preferences WHERE user_id = ? AND tenant_id = ?"
    )
    .bind(&context.user_id)
    .bind(&context.tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?
    .unwrap_or_else(|| UserPreferences {
        user_id: context.user_id.clone(),
        display_name: None,
        email: None,
        theme: "dark".to_string(),
        email_notifications: true,
        desktop_notifications: true,
        tenant_id: context.tenant_id.clone(),
    });

    Ok(HttpResponse::Ok().json(preferences))
}

/// PUT /api/settings/preferences
/// Update current user's preferences
pub async fn update_preferences(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    req: web::Json<UpdateUserPreferencesRequest>,
) -> ApiResult<HttpResponse> {
    sqlx::query(
        "INSERT INTO user_preferences (user_id, display_name, email, theme, email_notifications, desktop_notifications, tenant_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, tenant_id) DO UPDATE SET
            display_name = COALESCE(?, display_name),
            email = COALESCE(?, email),
            theme = COALESCE(?, theme),
            email_notifications = COALESCE(?, email_notifications),
            desktop_notifications = COALESCE(?, desktop_notifications)"
    )
    .bind(&context.user_id)
    .bind(&req.display_name)
    .bind(&req.email)
    .bind(&req.theme)
    .bind(&req.email_notifications)
    .bind(&req.desktop_notifications)
    .bind(&context.tenant_id)
    .bind(&req.display_name)
    .bind(&req.email)
    .bind(&req.theme)
    .bind(&req.email_notifications)
    .bind(&req.desktop_notifications)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to update preferences: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Preferences updated successfully"
    })))
}

/// GET /api/settings/localization
/// Get localization settings for current tenant
pub async fn get_localization(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
) -> ApiResult<HttpResponse> {
    let settings = sqlx::query_as::<_, LocalizationSettings>(
        "SELECT tenant_id, language, currency, currency_symbol, currency_position, decimal_places,
                tax_enabled, tax_rate, tax_name, date_format, time_format, timezone
         FROM localization_settings WHERE tenant_id = ?"
    )
    .bind(&context.tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?
    .unwrap_or_else(|| {
        let mut defaults = LocalizationSettings::default();
        defaults.tenant_id = context.tenant_id.clone();
        defaults
    });

    Ok(HttpResponse::Ok().json(settings))
}

/// PUT /api/settings/localization
/// Update localization settings for current tenant
pub async fn update_localization(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    req: web::Json<UpdateLocalizationRequest>,
) -> ApiResult<HttpResponse> {
    // Validate tax rate
    if let Some(rate) = req.tax_rate {
        if rate < 0.0 || rate > 100.0 {
            return Err(ApiError::validation_msg("Tax rate must be between 0 and 100"));
        }
    }

    // Validate decimal places
    if let Some(places) = req.decimal_places {
        if places < 0 || places > 4 {
            return Err(ApiError::validation_msg("Decimal places must be between 0 and 4"));
        }
    }

    // Upsert settings
    sqlx::query(
        "INSERT INTO localization_settings (
            tenant_id, language, currency, currency_symbol, currency_position, decimal_places,
            tax_enabled, tax_rate, tax_name, date_format, time_format, timezone
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id) DO UPDATE SET
            language = COALESCE(?, language),
            currency = COALESCE(?, currency),
            currency_symbol = COALESCE(?, currency_symbol),
            currency_position = COALESCE(?, currency_position),
            decimal_places = COALESCE(?, decimal_places),
            tax_enabled = COALESCE(?, tax_enabled),
            tax_rate = COALESCE(?, tax_rate),
            tax_name = COALESCE(?, tax_name),
            date_format = COALESCE(?, date_format),
            time_format = COALESCE(?, time_format),
            timezone = COALESCE(?, timezone)"
    )
    .bind(&context.tenant_id)
    .bind(&req.language)
    .bind(&req.currency)
    .bind(&req.currency_symbol)
    .bind(&req.currency_position)
    .bind(&req.decimal_places)
    .bind(&req.tax_enabled)
    .bind(&req.tax_rate)
    .bind(&req.tax_name)
    .bind(&req.date_format)
    .bind(&req.time_format)
    .bind(&req.timezone)
    .bind(&req.language)
    .bind(&req.currency)
    .bind(&req.currency_symbol)
    .bind(&req.currency_position)
    .bind(&req.decimal_places)
    .bind(&req.tax_enabled)
    .bind(&req.tax_rate)
    .bind(&req.tax_name)
    .bind(&req.date_format)
    .bind(&req.time_format)
    .bind(&req.timezone)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to update localization settings: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Localization settings updated successfully"
    })))
}

/// GET /api/settings/network
/// Get network and sync settings for current tenant
pub async fn get_network(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
) -> ApiResult<HttpResponse> {
    let settings = sqlx::query_as::<_, NetworkSettings>(
        "SELECT tenant_id, sync_enabled, sync_interval, auto_resolve_conflicts, offline_mode_enabled, max_queue_size
         FROM network_settings WHERE tenant_id = ?"
    )
    .bind(&context.tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?
    .unwrap_or_else(|| {
        let mut defaults = NetworkSettings::default();
        defaults.tenant_id = context.tenant_id.clone();
        defaults
    });

    Ok(HttpResponse::Ok().json(settings))
}

/// PUT /api/settings/network
/// Update network and sync settings for current tenant
pub async fn update_network(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    req: web::Json<UpdateNetworkRequest>,
) -> ApiResult<HttpResponse> {
    // Validate sync interval
    if let Some(interval) = req.sync_interval {
        if interval < 60 || interval > 3600 {
            return Err(ApiError::validation_msg("Sync interval must be between 60 and 3600 seconds"));
        }
    }

    // Validate max queue size
    if let Some(size) = req.max_queue_size {
        if size < 100 || size > 100000 {
            return Err(ApiError::validation_msg("Max queue size must be between 100 and 100000"));
        }
    }

    // Upsert settings
    sqlx::query(
        "INSERT INTO network_settings (tenant_id, sync_enabled, sync_interval, auto_resolve_conflicts, offline_mode_enabled, max_queue_size)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(tenant_id) DO UPDATE SET
            sync_enabled = COALESCE(?, sync_enabled),
            sync_interval = COALESCE(?, sync_interval),
            auto_resolve_conflicts = COALESCE(?, auto_resolve_conflicts),
            offline_mode_enabled = COALESCE(?, offline_mode_enabled),
            max_queue_size = COALESCE(?, max_queue_size)"
    )
    .bind(&context.tenant_id)
    .bind(&req.sync_enabled)
    .bind(&req.sync_interval)
    .bind(&req.auto_resolve_conflicts)
    .bind(&req.offline_mode_enabled)
    .bind(&req.max_queue_size)
    .bind(&req.sync_enabled)
    .bind(&req.sync_interval)
    .bind(&req.auto_resolve_conflicts)
    .bind(&req.offline_mode_enabled)
    .bind(&req.max_queue_size)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to update network settings: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Network settings updated successfully"
    })))
}

/// GET /api/settings/performance
/// Get performance monitoring settings for current tenant
pub async fn get_performance(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
) -> ApiResult<HttpResponse> {
    let settings = sqlx::query_as::<_, PerformanceSettings>(
        "SELECT tenant_id, monitoring_enabled, monitoring_url, sentry_dsn
         FROM performance_settings WHERE tenant_id = ?"
    )
    .bind(&context.tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?
    .unwrap_or_else(|| {
        let mut defaults = PerformanceSettings::default();
        defaults.tenant_id = context.tenant_id.clone();
        defaults
    });

    Ok(HttpResponse::Ok().json(settings))
}

/// PUT /api/settings/performance
/// Update performance monitoring settings for current tenant
pub async fn update_performance(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    req: web::Json<UpdatePerformanceRequest>,
) -> ApiResult<HttpResponse> {
    // Upsert settings
    sqlx::query(
        "INSERT INTO performance_settings (tenant_id, monitoring_enabled, monitoring_url, sentry_dsn)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(tenant_id) DO UPDATE SET
            monitoring_enabled = COALESCE(?, monitoring_enabled),
            monitoring_url = COALESCE(?, monitoring_url),
            sentry_dsn = COALESCE(?, sentry_dsn)"
    )
    .bind(&context.tenant_id)
    .bind(&req.monitoring_enabled)
    .bind(&req.monitoring_url)
    .bind(&req.sentry_dsn)
    .bind(&req.monitoring_enabled)
    .bind(&req.monitoring_url)
    .bind(&req.sentry_dsn)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to update performance settings: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Performance settings updated successfully"
    })))
}

/// Configure settings routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/settings")
            .route("/preferences", web::get().to(get_preferences))
            .route("/preferences", web::put().to(update_preferences))
            .route("/localization", web::get().to(get_localization))
            .route("/localization", web::put().to(update_localization))
            .route("/network", web::get().to(get_network))
            .route("/network", web::put().to(update_network))
            .route("/performance", web::get().to(get_performance))
            .route("/performance", web::put().to(update_performance))
            .route("/tax-rules", web::get().to(get_tax_rules))
            .route("/effective", web::get().to(crate::handlers::settings_handlers::get_effective_settings))
            .route("/effective/export", web::get().to(crate::handlers::settings_handlers::export_effective_settings)),
    );
    
    // User-specific routes
    cfg.service(
        web::scope("/api/users/me")
            .route("/preferences", web::get().to(get_preferences))
            .route("/preferences", web::put().to(update_preferences))
            .route("/password", web::put().to(change_password)),
    );
}

/// GET /api/settings/tax-rules
/// Get tax rules for current tenant
pub async fn get_tax_rules(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
) -> ApiResult<HttpResponse> {
    // First try to get from tax_rules table
    let rules: Vec<TaxRule> = sqlx::query_as::<_, TaxRule>(
        "SELECT id, name, rate, category, is_default, store_id
         FROM tax_rules WHERE tenant_id = ? ORDER BY is_default DESC, name ASC"
    )
    .bind(&context.tenant_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();
    
    // If no rules exist, return default from localization settings
    if rules.is_empty() {
        let localization = sqlx::query_as::<_, LocalizationSettings>(
            "SELECT tenant_id, language, currency, currency_symbol, currency_position, decimal_places,
                    tax_enabled, tax_rate, tax_name, date_format, time_format, timezone
             FROM localization_settings WHERE tenant_id = ?"
        )
        .bind(&context.tenant_id)
        .fetch_optional(pool.get_ref())
        .await
        .ok()
        .flatten();
        
        let default_rate = localization.map(|l| l.tax_rate).unwrap_or(13.0);
        
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "rules": [{
                "id": "default",
                "name": "Default Tax",
                "rate": default_rate,
                "category": null,
                "is_default": true,
                "store_id": "default"
            }]
        })));
    }
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "rules": rules
    })))
}

#[derive(Debug, serde::Serialize, sqlx::FromRow)]
struct TaxRule {
    id: String,
    name: String,
    rate: f64,
    category: Option<String>,
    is_default: bool,
    store_id: String,
}

/// PUT /api/users/me/password
/// Change current user's password
pub async fn change_password(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    req: web::Json<serde_json::Value>,
) -> ApiResult<HttpResponse> {
    let current_password = req
        .get("current_password")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::validation_msg("Current password is required"))?;

    let new_password = req
        .get("new_password")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::validation_msg("New password is required"))?;

    // Validate new password strength
    if new_password.len() < 8 {
        return Err(ApiError::validation_msg(
            "New password must be at least 8 characters",
        ));
    }

    // Get current user
    let user = sqlx::query!(
        "SELECT password_hash FROM users WHERE id = ? AND tenant_id = ?",
        context.user_id,
        context.tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?
    .ok_or_else(|| ApiError::not_found("User not found"))?;

    // Verify current password
    let is_valid = bcrypt::verify(current_password, &user.password_hash)
        .map_err(|e| ApiError::internal(format!("Password verification error: {}", e)))?;

    if !is_valid {
        return Err(ApiError::unauthorized("Current password is incorrect"));
    }

    // Hash new password
    let new_hash = bcrypt::hash(new_password, bcrypt::DEFAULT_COST)
        .map_err(|e| ApiError::internal(format!("Password hashing error: {}", e)))?;

    // Update password
    sqlx::query!(
        "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND tenant_id = ?",
        new_hash,
        context.user_id,
        context.tenant_id
    )
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to update password: {}", e)))?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Password changed successfully"
    })))
}
