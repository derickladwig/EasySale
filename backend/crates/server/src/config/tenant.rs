use actix_web::{dev::ServiceRequest, Error, HttpMessage};
use actix_web::error::ErrorUnauthorized;
use std::sync::Arc;

use super::loader::ConfigLoader;
use super::models::TenantConfig;
use super::error::{ConfigError, ConfigResult};

/// Tenant context for request handling
#[derive(Debug, Clone)]
#[allow(dead_code)]
/// Tenant context for request handling
/// This provides tenant-specific configuration and permissions
/// 
/// Note: Currently unused - tenant ID is passed explicitly in requests.
/// This middleware system is reserved for future multi-tenant routing.
#[allow(dead_code)]
pub struct TenantContext {
    /// Tenant ID
    pub tenant_id: String,
    
    /// Tenant configuration
    pub config: Arc<TenantConfig>,
    
    /// Store ID (for multi-store tenants)
    pub store_id: Option<String>,
}

impl TenantContext {
    /// Create a new tenant context
    pub fn new(tenant_id: String, config: TenantConfig, store_id: Option<String>) -> Self {
        Self {
            tenant_id,
            config: Arc::new(config),
            store_id,
        }
    }

    /// Get tenant ID
    pub fn tenant_id(&self) -> &str {
        &self.tenant_id
    }

    /// Get tenant configuration
    pub fn config(&self) -> &TenantConfig {
        &self.config
    }

    /// Get store ID
    pub fn store_id(&self) -> Option<&str> {
        self.store_id.as_deref()
    }

    /// Check if a module is enabled
    pub fn is_module_enabled(&self, module_name: &str) -> bool {
        self.config
            .modules
            .modules
            .get(module_name)
            .map(|m| m.enabled)
            .unwrap_or(false)
    }

    /// Get module settings
    pub fn get_module_settings(&self, module_name: &str) -> Option<&std::collections::HashMap<String, serde_json::Value>> {
        self.config
            .modules
            .modules
            .get(module_name)
            .and_then(|m| m.settings.as_ref())
    }

    /// Check if user has permission for a navigation item
    pub fn has_nav_permission(&self, nav_id: &str, user_permissions: &[String]) -> bool {
        // Find navigation item
        let nav_item = self.config
            .navigation
            .main
            .iter()
            .find(|item| item.id == nav_id);

        if let Some(item) = nav_item {
            // If no permission required, allow access
            if item.permission.is_none() {
                return true;
            }

            // Check if user has required permission
            if let Some(required_permission) = &item.permission {
                return user_permissions.contains(required_permission);
            }
        }

        false
    }

    /// Get category by ID
    pub fn get_category(&self, category_id: &str) -> Option<&super::models::CategoryConfig> {
        self.config
            .categories
            .iter()
            .find(|c| c.id == category_id)
    }

    /// Get all categories
    pub fn get_categories(&self) -> &[super::models::CategoryConfig] {
        &self.config.categories
    }
}

/// Tenant identification strategy
#[derive(Debug, Clone)]
#[allow(dead_code)]
/// Strategy for identifying tenant from HTTP request
/// 
/// Note: Currently unused - reserved for future automatic tenant routing.
#[allow(dead_code)]
pub enum TenantIdentificationStrategy {
    /// From environment variable
    Environment(String),
    
    /// From HTTP header
    Header(String),
    
    /// From subdomain (e.g., tenant1.example.com)
    Subdomain,
    
    /// From path prefix (e.g., /tenant1/...)
    PathPrefix,
    
    /// Fixed tenant (for single-tenant deployments)
    Fixed(String),
}

impl TenantIdentificationStrategy {
    /// Extract tenant ID from request
    pub fn extract_tenant_id(&self, req: &ServiceRequest) -> ConfigResult<String> {
        match self {
            TenantIdentificationStrategy::Environment(var_name) => {
                std::env::var(var_name)
                    .map_err(|_| ConfigError::TenantNotFound(format!("Environment variable {} not set", var_name)))
            }
            
            TenantIdentificationStrategy::Header(header_name) => {
                req.headers()
                    .get(header_name)
                    .and_then(|h| h.to_str().ok())
                    .map(|s| s.to_string())
                    .ok_or_else(|| ConfigError::TenantNotFound(format!("Header {} not found", header_name)))
            }
            
            TenantIdentificationStrategy::Subdomain => {
                // Extract subdomain from Host header
                let host = req.headers()
                    .get("host")
                    .and_then(|h| h.to_str().ok())
                    .ok_or_else(|| ConfigError::TenantNotFound("Host header not found".to_string()))?;

                // Extract subdomain (first part before first dot)
                let subdomain = host.split('.').next()
                    .ok_or_else(|| ConfigError::TenantNotFound("Invalid host format".to_string()))?;

                Ok(subdomain.to_string())
            }
            
            TenantIdentificationStrategy::PathPrefix => {
                // Extract tenant from path (e.g., /tenant1/api/...)
                let path = req.path();
                let parts: Vec<&str> = path.split('/').collect();
                
                if parts.len() > 1 && !parts[1].is_empty() {
                    Ok(parts[1].to_string())
                } else {
                    Err(ConfigError::TenantNotFound("No tenant in path".to_string()))
                }
            }
            
            TenantIdentificationStrategy::Fixed(tenant_id) => {
                Ok(tenant_id.clone())
            }
        }
    }
}

/// Tenant context extractor
#[allow(dead_code)]
/// Tenant context extractor
/// 
/// Note: Currently unused - reserved for future automatic tenant routing.
#[allow(dead_code)]
pub struct TenantContextExtractor {
    config_loader: Arc<ConfigLoader>,
    identification_strategy: TenantIdentificationStrategy,
}

impl TenantContextExtractor {
    /// Create a new tenant context extractor
    pub fn new(
        config_loader: Arc<ConfigLoader>,
        identification_strategy: TenantIdentificationStrategy,
    ) -> Self {
        Self {
            config_loader,
            identification_strategy,
        }
    }

    /// Extract tenant context from request
    pub fn extract(&self, req: &ServiceRequest) -> Result<TenantContext, Error> {
        // Extract tenant ID
        let tenant_id = self.identification_strategy
            .extract_tenant_id(req)
            .map_err(|e| ErrorUnauthorized(format!("Failed to identify tenant: {}", e)))?;

        // Load tenant configuration
        let config = self.config_loader
            .load_config(&tenant_id)
            .map_err(|e| ErrorUnauthorized(format!("Failed to load tenant configuration: {}", e)))?;

        // Extract store ID from header (optional)
        let store_id = req.headers()
            .get("X-Store-ID")
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_string());

        Ok(TenantContext::new(tenant_id, config, store_id))
    }
}

/// Middleware for injecting tenant context into requests
#[allow(dead_code)]
/// Tenant context middleware
/// 
/// Note: Currently unused - reserved for future automatic tenant routing.
#[allow(dead_code)]
pub struct TenantContextMiddleware {
    extractor: Arc<TenantContextExtractor>,
}

impl TenantContextMiddleware {
    /// Create a new tenant context middleware
    pub fn new(extractor: Arc<TenantContextExtractor>) -> Self {
        Self { extractor }
    }

    /// Process request and inject tenant context
    pub fn process(&self, req: &ServiceRequest) -> Result<(), Error> {
        // Extract tenant context
        let tenant_context = self.extractor.extract(req)?;

        // Insert into request extensions
        req.extensions_mut().insert(tenant_context);

        Ok(())
    }
}

/// Helper function to get tenant context from request extensions
/// Get tenant context from request extensions
/// 
/// Note: Currently unused - reserved for future automatic tenant routing.
#[allow(dead_code)]
pub fn get_tenant_context(req: &actix_web::HttpRequest) -> Option<TenantContext> {
    req.extensions().get::<TenantContext>().cloned()
}

/// Helper function to get tenant context or return error
/// Require tenant context from request (returns error if not found)
/// 
/// Note: Currently unused - reserved for future automatic tenant routing.
#[allow(dead_code)]
pub fn require_tenant_context(req: &actix_web::HttpRequest) -> Result<TenantContext, Error> {
    get_tenant_context(req)
        .ok_or_else(|| ErrorUnauthorized("Tenant context not found"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test;
    use std::path::PathBuf;

    fn create_test_loader() -> ConfigLoader {
        let config_dir = PathBuf::from("../../configs");
        ConfigLoader::new(config_dir, 300, false)
    }

    #[actix_web::test]
    async fn test_tenant_identification_environment() {
        std::env::set_var("TENANT_ID", "test-tenant");
        
        let strategy = TenantIdentificationStrategy::Environment("TENANT_ID".to_string());
        let req = test::TestRequest::default().to_srv_request();
        
        let tenant_id = strategy.extract_tenant_id(&req).unwrap();
        assert_eq!(tenant_id, "test-tenant");
    }

    #[actix_web::test]
    async fn test_tenant_identification_header() {
        let strategy = TenantIdentificationStrategy::Header("X-Tenant-ID".to_string());
        let req = test::TestRequest::default()
            .insert_header(("X-Tenant-ID", "test-tenant"))
            .to_srv_request();
        
        let tenant_id = strategy.extract_tenant_id(&req).unwrap();
        assert_eq!(tenant_id, "test-tenant");
    }

    #[actix_web::test]
    async fn test_tenant_identification_subdomain() {
        let strategy = TenantIdentificationStrategy::Subdomain;
        let req = test::TestRequest::default()
            .insert_header(("host", "tenant1.example.com"))
            .to_srv_request();
        
        let tenant_id = strategy.extract_tenant_id(&req).unwrap();
        assert_eq!(tenant_id, "tenant1");
    }

    #[actix_web::test]
    async fn test_tenant_identification_path_prefix() {
        let strategy = TenantIdentificationStrategy::PathPrefix;
        let req = test::TestRequest::default()
            .uri("/tenant1/api/products")
            .to_srv_request();
        
        let tenant_id = strategy.extract_tenant_id(&req).unwrap();
        assert_eq!(tenant_id, "tenant1");
    }

    #[actix_web::test]
    async fn test_tenant_identification_fixed() {
        let strategy = TenantIdentificationStrategy::Fixed("fixed-tenant".to_string());
        let req = test::TestRequest::default().to_srv_request();
        
        let tenant_id = strategy.extract_tenant_id(&req).unwrap();
        assert_eq!(tenant_id, "fixed-tenant");
    }

    #[::core::prelude::v1::test]
    fn test_tenant_context_module_check() {
        use super::super::models::*;
        use std::collections::HashMap;

        let mut modules = HashMap::new();
        modules.insert("layaway".to_string(), ModuleConfig {
            enabled: true,
            settings: None,
        });
        modules.insert("commissions".to_string(), ModuleConfig {
            enabled: false,
            settings: None,
        });

        let config = TenantConfig {
            version: "1.0.0".to_string(),
            tenant: TenantInfo {
                id: "test".to_string(),
                name: "Test".to_string(),
                slug: "test".to_string(),
                domain: None,
                description: None,
            },
            branding: BrandingConfig {
                company: CompanyBranding {
                    name: "Test Company".to_string(),
                    short_name: None,
                    tagline: None,
                    logo: None,
                    logo_light: None,
                    logo_dark: None,
                    favicon: None,
                    icon: None,
                },
                login: None,
                receipts: None,
                store: None,
            },
            theme: ThemeConfig {
                mode: "dark".to_string(),
                colors: ThemeColors {
                    primary: ColorValue::Simple("#3b82f6".to_string()),
                    secondary: None,
                    accent: None,
                    background: "#0f172a".to_string(),
                    surface: "#1e293b".to_string(),
                    text: "#f1f5f9".to_string(),
                    success: "#10b981".to_string(),
                    warning: "#f59e0b".to_string(),
                    error: "#ef4444".to_string(),
                    info: "#3b82f6".to_string(),
                },
                fonts: None,
                spacing: None,
                border_radius: None,
                animations: None,
            },
            categories: vec![],
            navigation: NavigationConfig {
                main: vec![],
                quick_actions: None,
                sidebar: None,
                header: None,
            },
            widgets: WidgetsConfig {
                dashboard: vec![],
                available: None,
            },
            modules: ModulesConfig { modules },
            localization: LocalizationConfig {
                language: None,
                date_format: None,
                time_format: None,
                number_format: None,
                currency: None,
                timezone: None,
                first_day_of_week: None,
                measurement_units: None,
            },
            layouts: None,
            wizards: None,
            database: None,
        };

        let context = TenantContext::new("test".to_string(), config, None);

        assert!(context.is_module_enabled("layaway"));
        assert!(!context.is_module_enabled("commissions"));
        assert!(!context.is_module_enabled("nonexistent"));
    }
}
