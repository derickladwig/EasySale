/**
 * Theme Handlers
 *
 * Provides HTTP endpoints for theme configuration management.
 * Implements offline-first persistence with sync queue support.
 *
 * Requirements:
 * - 6.1: Store-level theme configuration
 * - 6.2: User-level theme overrides
 * - 6.4: Theme persistence to local database
 * - 6.5: Theme synchronization across locations
 */

use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    Light,
    Dark,
    Auto,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ThemeDensity {
    Compact,
    Comfortable,
    Spacious,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AccentColor {
    #[serde(rename = "500")]
    pub color_500: String,
    #[serde(rename = "600")]
    pub color_600: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ThemeConfig {
    pub mode: ThemeMode,
    pub accent: AccentColor,
    pub density: ThemeDensity,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThemeLocks {
    #[serde(rename = "lockMode")]
    pub lock_mode: Option<bool>,
    #[serde(rename = "lockAccent")]
    pub lock_accent: Option<bool>,
    #[serde(rename = "lockContrast")]
    pub lock_contrast: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StoreThemeConfig {
    #[serde(flatten)]
    pub theme: ThemeConfig,
    pub locks: Option<ThemeLocks>,
    pub logo: Option<String>,
    #[serde(rename = "companyName")]
    pub company_name: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct GetThemeQuery {
    #[serde(rename = "storeId")]
    pub store_id: String,
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SetThemeRequest {
    pub scope: String, // 'store' or 'user'
    pub theme: serde_json::Value, // Partial theme config
    #[serde(rename = "storeId")]
    pub store_id: Option<String>,
    #[serde(rename = "userId")]
    pub user_id: Option<String>,
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Get theme configuration with scope resolution
 *
 * Resolves theme preferences using scope precedence:
 * - User preferences override store preferences (unless locked)
 * - Store preferences override global defaults
 * - Respects theme locks set at store level
 *
 * Query params:
 * - storeId: Store ID (required)
 * - userId: User ID (optional, for user-specific theme)
 *
 * Returns: Resolved ThemeConfig
 */
pub async fn get_theme(
    pool: web::Data<SqlitePool>,
    query: web::Query<GetThemeQuery>,
) -> Result<HttpResponse> {
    let store_id = &query.store_id;
    let user_id = query.user_id.as_deref();

    // Load theme settings from database
    let rows = sqlx::query!(
        r#"
        SELECT key, value, scope, scope_id
        FROM settings
        WHERE key LIKE 'theme.%'
        AND (
            (scope = 'global' AND scope_id IS NULL)
            OR (scope = 'store' AND scope_id = ?)
            OR (scope = 'user' AND scope_id = ?)
        )
        ORDER BY 
            CASE scope
                WHEN 'user' THEN 1
                WHEN 'store' THEN 2
                WHEN 'global' THEN 3
            END
        "#,
        store_id,
        user_id
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(rows) => {
            // Convert rows to ThemeSetting structs
            let settings: Vec<ThemeSetting> = rows.iter().map(|row| ThemeSetting {
                key: row.key.clone(),
                value: row.value.clone(),
                scope: row.scope.clone(),
                scope_id: row.scope_id.clone(),
            }).collect();
            
            // Resolve theme with scope precedence
            let resolved = resolve_theme_settings(&settings, store_id, user_id);
            Ok(HttpResponse::Ok().json(resolved))
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch theme: {}", e)
        }))),
    }
}

/**
 * Set theme configuration at a specific scope
 *
 * Writes theme preferences to the settings table and adds to sync queue.
 * Validates theme locks before allowing user overrides.
 *
 * Body:
 * - scope: 'store' or 'user'
 * - theme: Partial theme configuration
 * - storeId: Store ID (required for store scope)
 * - userId: User ID (required for user scope)
 *
 * Returns: Success message
 */
pub async fn set_theme(
    pool: web::Data<SqlitePool>,
    body: web::Json<SetThemeRequest>,
) -> Result<HttpResponse> {
    let scope = &body.scope;
    let theme = &body.theme;

    // Validate scope
    if scope != "store" && scope != "user" {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid scope. Must be 'store' or 'user'"
        })));
    }

    // Validate scope_id
    let scope_id = if scope == "store" {
        match body.store_id.as_ref() {
            Some(id) => id,
            None => {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "storeId is required for store scope"
                })));
            }
        }
    } else {
        match body.user_id.as_ref() {
            Some(id) => id,
            None => {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "userId is required for user scope"
                })));
            }
        }
    };

    // If user scope, check theme locks
    if scope == "user" {
        if let Some(store_id) = &body.store_id {
            let locks = get_theme_locks(pool.get_ref(), store_id).await?;
            
            // Validate user isn't trying to override locked settings
            if let Some(_mode) = theme.get("mode") {
                if locks.lock_mode.unwrap_or(false) {
                    return Ok(HttpResponse::Forbidden().json(serde_json::json!({
                        "error": "Theme mode is locked by store policy"
                    })));
                }
            }
            
            if let Some(_accent) = theme.get("accent") {
                if locks.lock_accent.unwrap_or(false) {
                    return Ok(HttpResponse::Forbidden().json(serde_json::json!({
                        "error": "Accent color is locked by store policy"
                    })));
                }
            }
        }
    }

    // Write theme settings to database
    let mut tx = pool.begin().await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to start transaction: {}", e))
    })?;

    // Flatten theme object and write each key
    if let Some(obj) = theme.as_object() {
        for (key, value) in obj {
            let full_key = format!("theme.{}", key);
            let value_str = if value.is_string() {
                value.as_str().unwrap().to_string()
            } else {
                value.to_string()
            };
            
            let data_type = if value.is_boolean() {
                "boolean"
            } else if value.is_number() {
                "number"
            } else if value.is_object() || value.is_array() {
                "json"
            } else {
                "string"
            };

            sqlx::query!(
                r#"
                INSERT INTO settings (key, value, scope, scope_id, data_type, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                ON CONFLICT(key, scope, scope_id) 
                DO UPDATE SET 
                    value = excluded.value,
                    updated_at = datetime('now')
                "#,
                full_key,
                value_str,
                scope,
                scope_id,
                data_type
            )
            .execute(&mut *tx)
            .await
            .map_err(|e| {
                actix_web::error::ErrorInternalServerError(format!("Failed to save theme setting: {}", e))
            })?;
        }
    }

    // Add to sync queue
    let sync_id = uuid::Uuid::new_v4().to_string();
    let entity_data = serde_json::to_string(&body.0).unwrap_or_default();
    
    sqlx::query!(
        r#"
        INSERT INTO sync_queue (
            id, entity_type, entity_id, operation, payload, 
            store_id, created_at, sync_status
        )
        VALUES (?, 'theme_preference', ?, 'update', ?, ?, datetime('now'), 'pending')
        "#,
        sync_id,
        scope_id,
        entity_data,
        body.store_id
    )
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to add to sync queue: {}", e))
    })?;

    // Commit transaction
    tx.commit().await.map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to commit transaction: {}", e))
    })?;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Theme preference saved successfully"
    })))
}

// ============================================================================
// Helper Functions
// ============================================================================

#[derive(Debug)]
struct ThemeSetting {
    key: String,
    value: String,
    scope: String,
    scope_id: Option<String>,
}

/**
 * Resolve theme settings with scope precedence
 */
fn resolve_theme_settings(
    settings: &[ThemeSetting],
    store_id: &str,
    user_id: Option<&str>,
) -> serde_json::Value {
    let mut resolved = serde_json::Map::new();
    
    // Default values
    resolved.insert("mode".to_string(), serde_json::json!("light"));
    resolved.insert("accent".to_string(), serde_json::json!({
        "500": "#3b82f6",
        "600": "#2563eb"
    }));
    resolved.insert("density".to_string(), serde_json::json!("comfortable"));
    
    // Apply settings with scope precedence (global → store → user)
    for setting in settings {
        let key = &setting.key;
        let value = &setting.value;
        let scope = &setting.scope;
        let scope_id = setting.scope_id.as_deref();
        
        // Extract the theme property name (remove "theme." prefix)
        let prop_name = key.strip_prefix("theme.").unwrap_or(key);
        
        // Skip locks for non-store scopes
        if prop_name.starts_with("locks.") && scope != "store" {
            continue;
        }
        
        // Parse value based on property
        let parsed_value = if prop_name == "accent" {
            // Parse accent color from stored format
            serde_json::from_str(value).unwrap_or_else(|_| {
                // Fallback: assume it's a color name and use defaults
                match value.as_str() {
                    "blue" => serde_json::json!({"500": "#3b82f6", "600": "#2563eb"}),
                    "green" => serde_json::json!({"500": "#10b981", "600": "#059669"}),
                    "purple" => serde_json::json!({"500": "#7c3aed", "600": "#6d28d9"}),
                    "orange" => serde_json::json!({"500": "#f97316", "600": "#ea580c"}),
                    "red" => serde_json::json!({"500": "#dc2626", "600": "#b91c1c"}),
                    _ => serde_json::json!({"500": "#3b82f6", "600": "#2563eb"}),
                }
            })
        } else if value == "true" || value == "false" {
            serde_json::json!(value == "true")
        } else {
            serde_json::json!(value)
        };
        
        // Apply with scope precedence
        if scope == "global" && scope_id.is_none() {
            resolved.insert(prop_name.to_string(), parsed_value);
        } else if scope == "store" && scope_id == Some(store_id) {
            resolved.insert(prop_name.to_string(), parsed_value);
        } else if scope == "user" && user_id.is_some() && scope_id == user_id {
            // Check if this property is locked
            let lock_key = format!("locks.lock{}", prop_name.chars().next().unwrap().to_uppercase().to_string() + &prop_name[1..]);
            let is_locked = resolved.get(&lock_key)
                .and_then(|v| v.as_bool())
                .unwrap_or(false);
            
            if !is_locked {
                resolved.insert(prop_name.to_string(), parsed_value);
            }
        }
    }
    
    // Remove lock keys from final output (they're internal only)
    resolved.retain(|k, _| !k.starts_with("locks."));
    
    serde_json::Value::Object(resolved)
}

/**
 * Get theme locks for a store
 */
async fn get_theme_locks(
    pool: &SqlitePool,
    store_id: &str,
) -> Result<ThemeLocks, actix_web::Error> {
    let locks = sqlx::query!(
        r#"
        SELECT key, value
        FROM settings
        WHERE key LIKE 'theme.locks.%'
        AND scope = 'store'
        AND scope_id = ?
        "#,
        store_id
    )
    .fetch_all(pool)
    .await
    .map_err(|e| {
        actix_web::error::ErrorInternalServerError(format!("Failed to fetch theme locks: {}", e))
    })?;

    let mut theme_locks = ThemeLocks {
        lock_mode: None,
        lock_accent: None,
        lock_contrast: None,
    };

    for lock in locks {
        let value = lock.value == "true";
        match lock.key.as_str() {
            "theme.locks.lockMode" => theme_locks.lock_mode = Some(value),
            "theme.locks.lockAccent" => theme_locks.lock_accent = Some(value),
            "theme.locks.lockContrast" => theme_locks.lock_contrast = Some(value),
            _ => {}
        }
    }

    Ok(theme_locks)
}

// ============================================================================
// Route Configuration
// ============================================================================

/// GET /api/login-theme/version
/// Returns the current login theme version (public endpoint - no auth required)
/// Used by frontend to check for theme updates
pub async fn get_login_theme_version() -> HttpResponse {
    HttpResponse::Ok().json(serde_json::json!({
        "version": "1.0.0",
        "timestamp": chrono::Utc::now().timestamp()
    }))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/theme")
            .route("", web::get().to(get_theme))
            .route("", web::put().to(set_theme))
    );
}
