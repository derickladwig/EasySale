// Configuration API handlers
// Provides endpoints for frontend to fetch and manage tenant configurations

use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use std::env;

use crate::auth::jwt::Claims;
use crate::config::{ConfigLoader, RuntimeProfile, TenantConfig};

/// Get the configuration directory path
/// Checks environment variable first, then common Docker paths, then relative path
fn get_config_dir() -> String {
    env::var("CONFIG_DIR").unwrap_or_else(|_| {
        // Try common Docker paths first
        if std::path::Path::new("/configs").exists() {
            "/configs".to_string()
        } else if std::path::Path::new("/app/configs").exists() {
            "/app/configs".to_string()
        } else {
            "configs".to_string()
        }
    })
}

/// Configuration response with runtime metadata
#[derive(Debug, Serialize)]
pub struct ConfigResponse {
    /// Tenant configuration
    #[serde(flatten)]
    pub config: TenantConfig,
    
    /// Runtime profile (dev, demo, prod)
    pub profile: String,
    
    /// Preset pack data (only in demo mode)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preset_pack: Option<PresetPack>,
}

/// Demo preset pack data
#[derive(Debug, Serialize, Deserialize)]
pub struct PresetPack {
    /// Demo user accounts
    #[serde(skip_serializing_if = "Option::is_none")]
    pub users: Option<Vec<DemoUser>>,
    
    /// Demo products
    #[serde(skip_serializing_if = "Option::is_none")]
    pub products: Option<Vec<serde_json::Value>>,
    
    /// Demo customers
    #[serde(skip_serializing_if = "Option::is_none")]
    pub customers: Option<Vec<serde_json::Value>>,
}

/// Demo user account
#[derive(Debug, Serialize, Deserialize)]
pub struct DemoUser {
    pub username: String,
    pub password: String,
    pub role: String,
}

/// Get current tenant configuration
/// GET /api/config
#[actix_web::get("/api/config")]
pub async fn get_config(
    _req: HttpRequest,
) -> HttpResponse {
    // Extract tenant ID from environment or use default
    let tenant_id = env::var("TENANT_ID")
        .unwrap_or_else(|_| "default".to_string());
    
    // Get runtime profile
    let profile_str = env::var("RUNTIME_PROFILE")
        .unwrap_or_else(|_| "dev".to_string());
    
    let profile = match profile_str.parse::<RuntimeProfile>() {
        Ok(p) => p,
        Err(_) => RuntimeProfile::Dev,
    };
    
    // Get config directory
    let config_dir = get_config_dir();
    
    // Create config loader
    let config_loader = ConfigLoader::new(&config_dir, 300, false);
    
    // Load configuration
    let config = match config_loader.load_config(&tenant_id) {
        Ok(config) => config,
        Err(e) => {
            tracing::warn!("Failed to load config for tenant {}: {:?}, using default", tenant_id, e);
            // Try to load default config as fallback
            match config_loader.load_config("default") {
                Ok(config) => config,
                Err(e2) => {
                    tracing::error!("Failed to load default config: {:?}", e2);
                    return HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to load config: {}", e2)
                    }));
                }
            }
        }
    };
    
    // Load preset pack if in demo mode
    let preset_pack = if profile.is_demo() {
        load_preset_pack().await
    } else {
        None
    };
    
    let response = ConfigResponse {
        config,
        profile: profile.to_string(),
        preset_pack,
    };
    
    HttpResponse::Ok().json(response)
}

/// Load demo preset pack from file
async fn load_preset_pack() -> Option<PresetPack> {
    // Try to load preset pack from environment variable or default location
    let preset_path = env::var("PRESET_PACK_PATH")
        .unwrap_or_else(|_| "configs/presets/demo.json".to_string());
    
    match tokio::fs::read_to_string(&preset_path).await {
        Ok(content) => {
            match serde_json::from_str::<PresetPack>(&content) {
                Ok(pack) => {
                    tracing::info!("Loaded preset pack from {}", preset_path);
                    Some(pack)
                }
                Err(e) => {
                    tracing::warn!("Failed to parse preset pack: {:?}", e);
                    None
                }
            }
        }
        Err(e) => {
            tracing::warn!("Failed to load preset pack from {}: {:?}", preset_path, e);
            None
        }
    }
}

/// Get configuration for specific tenant (admin only)
/// GET /api/config/tenants/{tenant_id}
pub async fn get_tenant_config(
    _req: HttpRequest,
    tenant_id: web::Path<String>,
    _claims: web::ReqData<Claims>,
) -> HttpResponse {
    // Permission check is handled by middleware
    
    // Create config loader
    let config_loader = ConfigLoader::new(&get_config_dir(), 300, false);
    
    // Load configuration
    match config_loader.load_config(&tenant_id) {
        Ok(config) => HttpResponse::Ok().json(config),
        Err(e) => {
            tracing::error!("Tenant not found: {:?}", e);
            HttpResponse::NotFound().json(serde_json::json!({
                "error": format!("Tenant not found: {}", e)
            }))
        }
    }
}

/// List available tenants (admin only)
/// GET /api/config/tenants
pub async fn list_tenants(
    _req: HttpRequest,
    _claims: web::ReqData<Claims>,
) -> HttpResponse {
    // Permission check is handled by middleware
    
    // Create config loader
    let config_loader = ConfigLoader::new(&get_config_dir(), 300, false);
    
    // List available tenants
    match config_loader.list_tenants() {
        Ok(tenants) => HttpResponse::Ok().json(tenants),
        Err(e) => {
            tracing::error!("Failed to list tenants: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to list tenants: {}", e)
            }))
        }
    }
}

/// Reload configuration (admin only, dev mode)
/// POST /api/config/reload
pub async fn reload_config(
    _req: HttpRequest,
    _claims: web::ReqData<Claims>,
) -> HttpResponse {
    // Permission check is handled by middleware
    
    // Get tenant ID
    let tenant_id = std::env::var("TENANT_ID")
        .unwrap_or_else(|_| "default".to_string());
    
    // Create config loader
    let config_loader = ConfigLoader::new(&get_config_dir(), 300, false);
    
    // Reload configuration
    match config_loader.reload_config(&tenant_id) {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Configuration reloaded successfully",
            "tenant_id": tenant_id
        })),
        Err(e) => {
            tracing::error!("Failed to reload config: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to reload config: {}", e)
            }))
        }
    }
}

/// Validate configuration (admin only)
/// POST /api/config/validate
#[derive(Debug, Deserialize)]
pub struct ValidateConfigRequest {
    pub config: TenantConfig,
}

#[derive(Debug, Serialize)]
pub struct ValidateConfigResponse {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

pub async fn validate_config(
    _req: HttpRequest,
    body: web::Json<ValidateConfigRequest>,
    _claims: web::ReqData<Claims>,
) -> HttpResponse {
    // Permission check is handled by middleware
    
    // Create config loader
    let config_loader = ConfigLoader::new(&get_config_dir(), 300, false);
    
    // Validate configuration
    let validation_result = config_loader.validate_config_detailed(&body.config).await;
    
    let response = match validation_result {
        Ok(warnings) => ValidateConfigResponse {
            valid: true,
            errors: vec![],
            warnings,
        },
        Err(errors) => ValidateConfigResponse {
            valid: false,
            errors: errors.iter().map(|e| e.to_string()).collect(),
            warnings: vec![],
        },
    };
    
    HttpResponse::Ok().json(response)
}

/// Get configuration schema (for UI editors)
/// GET /api/config/schema
pub async fn get_config_schema(
    _req: HttpRequest,
    _claims: web::ReqData<Claims>,
) -> HttpResponse {
    // Permission check is handled by middleware
    
    // Load schema from file
    let config_dir = get_config_dir();
    let schema_path = format!("{}/schema.json", config_dir);
    match tokio::fs::read_to_string(&schema_path).await {
        Ok(schema_str) => {
            match serde_json::from_str::<serde_json::Value>(&schema_str) {
                Ok(schema) => HttpResponse::Ok().json(schema),
                Err(e) => {
                    tracing::error!("Invalid schema JSON: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Invalid schema JSON: {}", e)
                    }))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to load schema: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to load schema: {}", e)
            }))
        }
    }
}

/// Get branding configuration (resolved tenant/store branding)
/// GET /api/config/brand
/// 
/// Returns branding configuration including:
/// - company name, logo, colors
/// - terminology map
/// - store-level overrides (if applicable)
#[derive(Debug, Serialize)]
pub struct BrandingResponse {
    /// Company branding
    pub company: CompanyBrandingResponse,
    
    /// Theme colors
    pub colors: ThemeColorsResponse,
    
    /// Terminology map
    pub terminology: TerminologyMap,
    
    /// Store-specific branding (if applicable)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub store: Option<StoreBrandingResponse>,
    
    /// Login branding
    #[serde(skip_serializing_if = "Option::is_none")]
    pub login: Option<LoginBrandingResponse>,
    
    /// Receipt branding
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receipts: Option<ReceiptBrandingResponse>,
}

#[derive(Debug, Serialize)]
pub struct CompanyBrandingResponse {
    pub name: String,
    pub short_name: Option<String>,
    pub tagline: Option<String>,
    pub logo_url: Option<String>,
    pub logo_light_url: Option<String>,
    pub logo_dark_url: Option<String>,
    pub logo_alt_text: String,
    pub favicon_url: Option<String>,
    pub icon_url: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ThemeColorsResponse {
    pub primary: String,
    pub secondary: Option<String>,
    pub accent: Option<String>,
    pub background: String,
    pub surface: String,
    pub text: String,
    pub success: String,
    pub warning: String,
    pub error: String,
    pub info: String,
}

#[derive(Debug, Serialize)]
pub struct TerminologyMap {
    pub product: String,
    pub products: String,
    pub customer: String,
    pub customers: String,
    pub sale: String,
    pub sales: String,
    pub sku_label: String,
}

#[derive(Debug, Serialize)]
pub struct StoreBrandingResponse {
    pub name: String,
    pub station: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct LoginBrandingResponse {
    pub background: Option<String>,
    pub message: Option<String>,
    pub show_logo: bool,
    pub layout: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ReceiptBrandingResponse {
    pub header: Option<String>,
    pub footer: Option<String>,
    pub show_logo: bool,
}

use crate::config::models::{CompanyBranding, LoginBranding, ReceiptBranding, StoreBranding};

#[actix_web::get("/api/config/brand")]
pub async fn get_brand_config(
    _req: HttpRequest,
) -> HttpResponse {
    // Extract tenant ID from environment or use default
    let tenant_id = env::var("TENANT_ID")
        .unwrap_or_else(|_| "default".to_string());
    
    // Extract store ID from environment (optional)
    let store_id = env::var("STORE_ID").ok();
    
    // Create config loader
    let config_loader = ConfigLoader::new(&get_config_dir(), 300, false);
    
    // Load configuration
    let config = match config_loader.load_config(&tenant_id) {
        Ok(config) => config,
        Err(e) => {
            tracing::warn!("Failed to load config for tenant {}: {:?}, using default", tenant_id, e);
            // Try to load default config as fallback
            match config_loader.load_config("default") {
                Ok(config) => config,
                Err(e2) => {
                    tracing::error!("Failed to load default config: {:?}", e2);
                    return HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to load config: {}", e2)
                    }));
                }
            }
        }
    };
    
    // Build branding response
    let company = build_company_branding(&config.branding.company);
    let colors = build_theme_colors(&config.theme.colors);
    let terminology = build_terminology_map();
    
    // Store-level overrides (if store_id is provided and store branding exists)
    let store = if store_id.is_some() {
        config.branding.store.as_ref().map(build_store_branding)
    } else {
        None
    };
    
    let login = config.branding.login.as_ref().map(build_login_branding);
    let receipts = config.branding.receipts.as_ref().map(build_receipt_branding);
    
    let response = BrandingResponse {
        company,
        colors,
        terminology,
        store,
        login,
        receipts,
    };
    
    HttpResponse::Ok().json(response)
}

fn build_company_branding(company: &CompanyBranding) -> CompanyBrandingResponse {
    CompanyBrandingResponse {
        name: company.name.clone(),
        short_name: company.short_name.clone(),
        tagline: company.tagline.clone(),
        logo_url: company.logo.clone(),
        logo_light_url: company.logo_light.clone(),
        logo_dark_url: company.logo_dark.clone(),
        logo_alt_text: format!("{} Logo", company.name),
        favicon_url: company.favicon.clone(),
        icon_url: company.icon.clone(),
    }
}

fn build_theme_colors(colors: &crate::config::models::ThemeColors) -> ThemeColorsResponse {
    ThemeColorsResponse {
        primary: colors.primary.primary_value(),
        secondary: colors.secondary.as_ref().map(|c| c.primary_value()),
        accent: colors.accent.as_ref().map(|c| c.primary_value()),
        background: colors.background.clone(),
        surface: colors.surface.clone(),
        text: colors.text.clone(),
        success: colors.success.clone(),
        warning: colors.warning.clone(),
        error: colors.error.clone(),
        info: colors.info.clone(),
    }
}

fn build_terminology_map() -> TerminologyMap {
    // Default terminology - can be extended to read from config
    TerminologyMap {
        product: "Product".to_string(),
        products: "Products".to_string(),
        customer: "Customer".to_string(),
        customers: "Customers".to_string(),
        sale: "Sale".to_string(),
        sales: "Sales".to_string(),
        sku_label: "SKU".to_string(),
    }
}

fn build_store_branding(store: &StoreBranding) -> StoreBrandingResponse {
    StoreBrandingResponse {
        name: store.name.clone().unwrap_or_else(|| "Store".to_string()),
        station: store.station.clone(),
    }
}

fn build_login_branding(login: &LoginBranding) -> LoginBrandingResponse {
    LoginBrandingResponse {
        background: login.background.clone(),
        message: login.message.clone(),
        show_logo: login.show_logo.unwrap_or(true),
        layout: login.layout.clone(),
    }
}

fn build_receipt_branding(receipts: &ReceiptBranding) -> ReceiptBrandingResponse {
    ReceiptBrandingResponse {
        header: receipts.header.clone(),
        footer: receipts.footer.clone(),
        show_logo: receipts.show_logo.unwrap_or(true),
    }
}

/// Get system capabilities (enabled modules/features)
/// GET /api/config/capabilities
/// 
/// Returns which modules and features are enabled:
/// - vertical packs (automotive, etc.)
/// - optional features (layaway, loyalty, etc.)
#[derive(Debug, Serialize)]
pub struct CapabilitiesResponse {
    /// Enabled modules
    pub modules: ModulesStatus,
    
    /// Vertical packs status
    pub vertical_packs: VerticalPacksStatus,
}

#[derive(Debug, Serialize)]
pub struct ModulesStatus {
    pub layaway: bool,
    pub loyalty: bool,
    pub commissions: bool,
    pub special_orders: bool,
    pub gift_cards: bool,
    pub store_credit: bool,
}

#[derive(Debug, Serialize)]
pub struct VerticalPacksStatus {
    pub automotive: bool,
}

#[actix_web::get("/api/config/capabilities")]
pub async fn get_capabilities(
    _req: HttpRequest,
) -> HttpResponse {
    // Extract tenant ID from environment or use default
    let tenant_id = env::var("TENANT_ID")
        .unwrap_or_else(|_| "default".to_string());
    
    // Create config loader
    let config_loader = ConfigLoader::new(&get_config_dir(), 300, false);
    
    // Load configuration
    let config = match config_loader.load_config(&tenant_id) {
        Ok(config) => config,
        Err(e) => {
            tracing::warn!("Failed to load config for tenant {}: {:?}, using default", tenant_id, e);
            // Try to load default config as fallback
            match config_loader.load_config("default") {
                Ok(config) => config,
                Err(e2) => {
                    tracing::error!("Failed to load default config: {:?}", e2);
                    return HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to load config: {}", e2)
                    }));
                }
            }
        }
    };
    
    // Build capabilities response from modules config
    let modules = ModulesStatus {
        layaway: config.modules.modules.get("layaway")
            .map(|m| m.enabled)
            .unwrap_or(false),
        loyalty: config.modules.modules.get("loyalty")
            .map(|m| m.enabled)
            .unwrap_or(false),
        commissions: config.modules.modules.get("commissions")
            .map(|m| m.enabled)
            .unwrap_or(false),
        special_orders: config.modules.modules.get("special_orders")
            .map(|m| m.enabled)
            .unwrap_or(false),
        gift_cards: config.modules.modules.get("gift_cards")
            .map(|m| m.enabled)
            .unwrap_or(false),
        store_credit: config.modules.modules.get("store_credit")
            .map(|m| m.enabled)
            .unwrap_or(false),
    };
    
    let vertical_packs = VerticalPacksStatus {
        automotive: config.modules.modules.get("automotive")
            .map(|m| m.enabled)
            .unwrap_or(false),
    };
    
    let response = CapabilitiesResponse {
        modules,
        vertical_packs,
    };
    
    HttpResponse::Ok().json(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};
    
    #[actix_web::test]
    async fn test_get_config() {
        // Test will be implemented with mock ConfigLoader
        // For now, this is a placeholder
    }
    
    #[actix_web::test]
    async fn test_validate_config() {
        // Test will be implemented with mock ConfigLoader
        // For now, this is a placeholder
    }
}
