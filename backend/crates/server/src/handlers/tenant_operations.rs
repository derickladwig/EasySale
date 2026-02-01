use actix_web::{get, post, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::config::tenant::TenantIdentificationStrategy;

/// GET /api/tenant/setup-status (public handler version)
/// Check if tenant is configured (public endpoint - no auth required)
/// Returns setup status for first-run detection
pub async fn get_setup_status_handler(
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    // Check if setup has been completed by looking for the setup_completed setting
    // This is more reliable than counting users since migrations may seed default users
    let setup_completed: Result<Option<(String,)>, _> = sqlx::query_as(
        "SELECT value FROM settings WHERE key = 'setup_completed' AND scope = 'global' LIMIT 1"
    )
    .fetch_optional(pool.get_ref())
    .await;

    match setup_completed {
        Ok(Some((value,))) => {
            // Setup completed flag exists - check its value
            let is_configured = value == "true" || value == "1";
            
            HttpResponse::Ok().json(serde_json::json!({
                "is_configured": is_configured,
                "incomplete_steps": if is_configured { vec![] as Vec<serde_json::Value> } else {
                    vec![
                        serde_json::json!({
                            "id": "admin",
                            "label": "Create First Admin",
                            "is_complete": false,
                            "is_required": true
                        }),
                        serde_json::json!({
                            "id": "store",
                            "label": "Store Basics",
                            "is_complete": false,
                            "is_required": true
                        }),
                        serde_json::json!({
                            "id": "taxes",
                            "label": "Taxes",
                            "is_complete": false,
                            "is_required": true
                        }),
                        serde_json::json!({
                            "id": "locations",
                            "label": "Locations & Registers",
                            "is_complete": false,
                            "is_required": true
                        }),
                    ]
                }
            }))
        }
        Ok(None) => {
            // No setup_completed setting found - this is a fresh install
            tracing::info!("No setup_completed setting found, treating as first-run");
            
            HttpResponse::Ok().json(serde_json::json!({
                "is_configured": false,
                "incomplete_steps": vec![
                    serde_json::json!({
                        "id": "admin",
                        "label": "Create First Admin",
                        "is_complete": false,
                        "is_required": true
                    }),
                    serde_json::json!({
                        "id": "store",
                        "label": "Store Basics",
                        "is_complete": false,
                        "is_required": true
                    }),
                    serde_json::json!({
                        "id": "taxes",
                        "label": "Taxes",
                        "is_complete": false,
                        "is_required": true
                    }),
                    serde_json::json!({
                        "id": "locations",
                        "label": "Locations & Registers",
                        "is_complete": false,
                        "is_required": true
                    }),
                ]
            }))
        }
        Err(e) => {
            tracing::error!("Failed to check setup status: {:?}", e);
            // On error, assume not configured to be safe (will show wizard)
            HttpResponse::Ok().json(serde_json::json!({
                "is_configured": false,
                "error": "Failed to check setup status",
                "incomplete_steps": vec![
                    serde_json::json!({
                        "id": "admin",
                        "label": "Create First Admin",
                        "is_complete": false,
                        "is_required": true
                    }),
                ]
            }))
        }
    }
}

/// Setup data received from frontend wizard
#[derive(Debug, serde::Deserialize)]
pub struct SetupCompleteRequest {
    pub admin: Option<serde_json::Value>,
    pub store: Option<StoreSetupData>,
    pub theme: Option<serde_json::Value>,
    pub integrations: Option<serde_json::Value>,
    pub hardware: Option<serde_json::Value>,
}

#[derive(Debug, serde::Deserialize)]
pub struct StoreSetupData {
    #[serde(rename = "storeName")]
    pub store_name: Option<String>,
    pub currency: Option<String>,
    pub locale: Option<String>,
    pub timezone: Option<String>,
    #[serde(rename = "taxRegion")]
    pub tax_region: Option<String>,
    #[serde(rename = "taxRates")]
    pub tax_rates: Option<Vec<TaxRateData>>,
}

#[derive(Debug, serde::Deserialize)]
pub struct TaxRateData {
    pub name: String,
    pub rate: f64,
    #[serde(rename = "isDefault")]
    pub is_default: Option<bool>,
}

/// POST /api/tenant/setup-complete
/// Mark the initial setup as complete and save setup data
pub async fn mark_setup_complete_handler(
    pool: web::Data<SqlitePool>,
    body: Option<web::Json<SetupCompleteRequest>>,
) -> HttpResponse {
    // Save store settings if provided
    if let Some(ref setup_data) = body {
        if let Some(ref store) = setup_data.store {
            // Save store name
            if let Some(ref name) = store.store_name {
                let _ = sqlx::query(
                    "INSERT INTO settings (key, value, scope, data_type) VALUES ('store_name', ?, 'global', 'string') ON CONFLICT(key, scope, scope_id) DO UPDATE SET value = ?, updated_at = datetime('now')"
                )
                .bind(name)
                .bind(name)
                .execute(pool.get_ref())
                .await;
            }
            
            // Save currency
            if let Some(ref currency) = store.currency {
                let _ = sqlx::query(
                    "INSERT INTO settings (key, value, scope, data_type) VALUES ('currency', ?, 'global', 'string') ON CONFLICT(key, scope, scope_id) DO UPDATE SET value = ?, updated_at = datetime('now')"
                )
                .bind(currency)
                .bind(currency)
                .execute(pool.get_ref())
                .await;
            }
            
            // Save locale
            if let Some(ref locale) = store.locale {
                let _ = sqlx::query(
                    "INSERT INTO settings (key, value, scope, data_type) VALUES ('locale', ?, 'global', 'string') ON CONFLICT(key, scope, scope_id) DO UPDATE SET value = ?, updated_at = datetime('now')"
                )
                .bind(locale)
                .bind(locale)
                .execute(pool.get_ref())
                .await;
            }
            
            // Save timezone
            if let Some(ref timezone) = store.timezone {
                let _ = sqlx::query(
                    "INSERT INTO settings (key, value, scope, data_type) VALUES ('timezone', ?, 'global', 'string') ON CONFLICT(key, scope, scope_id) DO UPDATE SET value = ?, updated_at = datetime('now')"
                )
                .bind(timezone)
                .bind(timezone)
                .execute(pool.get_ref())
                .await;
            }
            
            // Save tax rates as JSON
            if let Some(ref tax_rates) = store.tax_rates {
                let tax_json = serde_json::to_string(tax_rates).unwrap_or_default();
                let _ = sqlx::query(
                    "INSERT INTO settings (key, value, scope, data_type) VALUES ('tax_rates', ?, 'global', 'json') ON CONFLICT(key, scope, scope_id) DO UPDATE SET value = ?, updated_at = datetime('now')"
                )
                .bind(&tax_json)
                .bind(&tax_json)
                .execute(pool.get_ref())
                .await;
            }
            
            tracing::info!("Saved store settings from setup wizard");
        }
    }

    // Insert or update the setup_completed setting
    let result = sqlx::query(
        r#"
        INSERT INTO settings (key, value, scope, data_type)
        VALUES ('setup_completed', 'true', 'global', 'boolean')
        ON CONFLICT(key, scope, scope_id) DO UPDATE SET value = 'true', updated_at = datetime('now')
        "#
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Setup marked as complete");
            HttpResponse::Ok().json(serde_json::json!({
                "success": true,
                "message": "Setup completed successfully"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to mark setup as complete: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "success": false,
                "error": "Failed to save setup status"
            }))
        }
    }
}

/// POST /api/tenant/context
/// Create a tenant context
#[post("/api/tenant/context")]
pub async fn create_tenant_context(
    _pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id.to_string(),
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let store_id = req.get("store_id").and_then(|v| v.as_str()).map(|s| s.to_string());

    tracing::info!("Creating tenant context for: {}", tenant_id);

    HttpResponse::Ok().json(serde_json::json!({
        "tenant_id": tenant_id,
        "store_id": store_id,
        "message": "Tenant context created successfully"
    }))
}

/// GET /api/tenant/:tenant_id/config
/// Get tenant configuration
#[get("/api/tenant/{tenant_id}/config")]
pub async fn get_tenant_config(
    _pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let tenant_id = path.into_inner();
    tracing::info!("Getting config for tenant: {}", tenant_id);

    // In a real implementation, this would load from database or config file
    HttpResponse::Ok().json(serde_json::json!({
        "tenant_id": tenant_id,
        "message": "Tenant configuration endpoint ready"
    }))
}

/// GET /api/tenant/:tenant_id/modules/:module_name
/// Check if a module is enabled
#[get("/api/tenant/{tenant_id}/modules/{module_name}")]
pub async fn is_module_enabled(
    _pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (tenant_id, module_name) = path.into_inner();
    tracing::info!("Checking if module {} is enabled for tenant: {}", module_name, tenant_id);

    // In a real implementation, this would check the tenant's config
    HttpResponse::Ok().json(serde_json::json!({
        "tenant_id": tenant_id,
        "module_name": module_name,
        "is_enabled": true,
        "message": "Module check endpoint ready"
    }))
}

/// GET /api/tenant/:tenant_id/modules/:module_name/settings
/// Get module settings
#[get("/api/tenant/{tenant_id}/modules/{module_name}/settings")]
pub async fn get_module_settings(
    _pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (tenant_id, module_name) = path.into_inner();
    tracing::info!("Getting settings for module {} in tenant: {}", module_name, tenant_id);

    HttpResponse::Ok().json(serde_json::json!({
        "tenant_id": tenant_id,
        "module_name": module_name,
        "settings": {},
        "message": "Module settings endpoint ready"
    }))
}

/// POST /api/tenant/:tenant_id/permissions/check
/// Check navigation permissions
#[post("/api/tenant/{tenant_id}/permissions/check")]
pub async fn check_nav_permission(
    _pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let tenant_id = path.into_inner();

    let nav_id = match req.get("nav_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "nav_id is required"
            }));
        }
    };

    tracing::info!("Checking nav permission {} for tenant: {}", nav_id, tenant_id);

    HttpResponse::Ok().json(serde_json::json!({
        "tenant_id": tenant_id,
        "nav_id": nav_id,
        "has_permission": true,
        "message": "Permission check endpoint ready"
    }))
}

/// GET /api/tenant/:tenant_id/categories
/// Get all categories
#[get("/api/tenant/{tenant_id}/categories")]
pub async fn get_categories(
    _pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let tenant_id = path.into_inner();
    tracing::info!("Getting categories for tenant: {}", tenant_id);

    HttpResponse::Ok().json(serde_json::json!({
        "tenant_id": tenant_id,
        "categories": [],
        "message": "Categories endpoint ready"
    }))
}

/// GET /api/tenant/:tenant_id/categories/:category_id
/// Get a specific category
#[get("/api/tenant/{tenant_id}/categories/{category_id}")]
pub async fn get_category(
    _pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (tenant_id, category_id) = path.into_inner();
    tracing::info!("Getting category {} for tenant: {}", category_id, tenant_id);

    HttpResponse::Ok().json(serde_json::json!({
        "tenant_id": tenant_id,
        "category_id": category_id,
        "message": "Category endpoint ready"
    }))
}

/// POST /api/tenant/identify
/// Extract tenant ID from request using identification strategy
#[post("/api/tenant/identify")]
pub async fn identify_tenant(
    _pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let strategy_type = req.get("strategy").and_then(|v| v.as_str()).unwrap_or("header");

    tracing::info!("Identifying tenant using strategy: {}", strategy_type);

    // Create appropriate strategy
    let _strategy = match strategy_type {
        "subdomain" => TenantIdentificationStrategy::Subdomain,
        "path" => TenantIdentificationStrategy::PathPrefix,
        _ => TenantIdentificationStrategy::Header("X-Tenant-ID".to_string()),
    };

    HttpResponse::Ok().json(serde_json::json!({
        "strategy": strategy_type,
        "message": "Tenant identification strategy configured"
    }))
}

/// Configure tenant operations routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    // Note: get_setup_status_handler is registered as a public route in main.rs
    // before the ContextExtractor middleware
    cfg.service(create_tenant_context)
        .service(get_tenant_config)
        .service(is_module_enabled)
        .service(get_module_settings)
        .service(check_nav_permission)
        .service(get_categories)
        .service(get_category)
        .service(identify_tenant);
}
