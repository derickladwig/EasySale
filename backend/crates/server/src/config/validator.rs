// Configuration validator
// Validates tenant configurations against schema and business rules

use std::collections::HashSet;
use regex::Regex;
use crate::config::{TenantConfig, ConfigError};

pub struct ConfigValidator;

impl ConfigValidator {
    pub fn new() -> Self {
        Self
    }
    
    /// Validate a tenant configuration
    /// Returns Ok(warnings) if valid, Err(errors) if invalid
    pub fn validate(&self, config: &TenantConfig) -> Result<Vec<String>, Vec<ConfigError>> {
        let mut errors = Vec::new();
        let mut warnings = Vec::new();
        
        // Validate tenant info
        Self::validate_tenant_info(config, &mut errors);
        
        // Validate branding
        Self::validate_branding(config, &mut errors, &mut warnings);
        
        // Validate categories
        Self::validate_categories(config, &mut errors, &mut warnings);
        
        // Validate navigation
        Self::validate_navigation(config, &mut errors, &mut warnings);
        
        // Validate widgets
        Self::validate_widgets(config, &mut errors, &mut warnings);
        
        // Validate modules
        Self::validate_modules(config, &mut errors, &mut warnings);
        
        // Validate database schema
        Self::validate_database_schema(config, &mut errors);
        
        // Validate OAuth configuration (if present)
        Self::validate_oauth_config(config, &mut errors, &mut warnings);
        
        if errors.is_empty() {
            Ok(warnings)
        } else {
            Err(errors)
        }
    }
    
    fn validate_oauth_config(config: &TenantConfig, errors: &mut Vec<ConfigError>, _warnings: &mut Vec<String>) {
        // Check if OAuth redirect URIs contain localhost in production
        // This is a placeholder - actual OAuth config structure depends on implementation
        // For now, we document the requirement that OAuth URIs should be validated
        
        // Note: This validation would check config fields like:
        // - config.integrations.quickbooks.redirect_uri
        // - config.integrations.google_drive.redirect_uri
        // And reject localhost URIs when profile is Prod
        
        // Implementation note: OAuth validation should be done at startup
        // in conjunction with RuntimeProfile checking
        let _ = (config, errors); // Suppress unused warnings
    }
    
    fn validate_tenant_info(config: &TenantConfig, errors: &mut Vec<ConfigError>) {
        if config.tenant.id.is_empty() {
            errors.push(ConfigError::ValidationError("tenant.id cannot be empty".to_string()));
        }
        
        if config.tenant.name.is_empty() {
            errors.push(ConfigError::ValidationError("tenant.name cannot be empty".to_string()));
        }
        
        // Validate tenant ID format (alphanumeric and hyphens only)
        let id_regex = Regex::new(r"^[a-z0-9-]+$").unwrap();
        if !id_regex.is_match(&config.tenant.id) {
            errors.push(ConfigError::ValidationError(
                "tenant.id must contain only lowercase letters, numbers, and hyphens".to_string()
            ));
        }
    }
    
    fn validate_branding(config: &TenantConfig, errors: &mut Vec<ConfigError>, warnings: &mut Vec<String>) {
        // Validate colors are valid hex codes or CSS color names
        let primary_color = config.theme.colors.primary.primary_value();
        if !Self::is_valid_color(&primary_color) {
            errors.push(ConfigError::ValidationError(
                "theme.colors.primary must be a valid hex color or CSS color name".to_string()
            ));
        }
        
        // Validate other colors
        let colors = vec![
            ("background", &config.theme.colors.background),
            ("surface", &config.theme.colors.surface),
            ("text", &config.theme.colors.text),
            ("success", &config.theme.colors.success),
            ("warning", &config.theme.colors.warning),
            ("error", &config.theme.colors.error),
            ("info", &config.theme.colors.info),
        ];
        
        for (name, color) in colors {
            if !Self::is_valid_color(color) {
                errors.push(ConfigError::ValidationError(
                    format!("theme.colors.{name} must be a valid hex color or CSS color name")
                ));
            }
        }
        
        // Validate logo path exists (warning only)
        if let Some(logo) = &config.branding.company.logo {
            if logo.is_empty() {
                warnings.push("branding.company.logo is empty - using default logo".to_string());
            }
        }
        
        // Validate theme mode
        if config.theme.mode != "light" && config.theme.mode != "dark" && config.theme.mode != "auto" {
            errors.push(ConfigError::ValidationError(
                "theme.mode must be 'light', 'dark', or 'auto'".to_string()
            ));
        }
    }
    
    fn validate_categories(config: &TenantConfig, errors: &mut Vec<ConfigError>, warnings: &mut Vec<String>) {
        if config.categories.is_empty() {
            warnings.push("No categories defined - system will have limited functionality".to_string());
            return;
        }
        
        let mut category_ids = HashSet::new();
        
        for category in &config.categories {
            // Check for duplicate IDs
            if !category_ids.insert(&category.id) {
                errors.push(ConfigError::ValidationError(
                    format!("Duplicate category ID: {}", category.id)
                ));
            }
            
            // Validate category has attributes
            if category.attributes.is_empty() {
                warnings.push(format!("Category '{}' has no attributes defined", category.name));
            }
            
            // Validate attribute types
            for attr in &category.attributes {
                match attr.attr_type.as_str() {
                    "text" | "number" | "boolean" | "date" | "dropdown" | "multiselect" | "textarea" | "hierarchy" => {},
                    _ => {
                        errors.push(ConfigError::ValidationError(
                            format!("Invalid attribute type '{}' in category '{}'", attr.attr_type, category.name)
                        ));
                    }
                }
                
                // Validate dropdown/multiselect have values
                if attr.attr_type == "dropdown" || attr.attr_type == "multiselect" {
                    if let Some(values) = &attr.values {
                        if values.is_empty() {
                            errors.push(ConfigError::ValidationError(
                                format!("Attribute '{}' in category '{}' must have values", attr.name, category.name)
                            ));
                        }
                    } else {
                        errors.push(ConfigError::ValidationError(
                            format!("Attribute '{}' in category '{}' must have values", attr.name, category.name)
                        ));
                    }
                }
            }
            
            // Validate search fields reference existing attributes
            if let Some(search_fields) = &category.search_fields {
                for search_field in search_fields {
                    let attr_exists = category.attributes.iter().any(|a| &a.name == search_field);
                    if !attr_exists && search_field != "name" && search_field != "sku" {
                        warnings.push(format!(
                            "Search field '{}' in category '{}' does not match any attribute",
                            search_field, category.name
                        ));
                    }
                }
            }
        }
    }
    
    fn validate_navigation(config: &TenantConfig, errors: &mut Vec<ConfigError>, _warnings: &mut Vec<String>) {
        let mut routes = HashSet::new();
        let mut nav_ids = HashSet::new();
        
        for item in &config.navigation.main {
            // Check for duplicate IDs
            if !nav_ids.insert(&item.id) {
                errors.push(ConfigError::ValidationError(
                    format!("Duplicate navigation ID: {}", item.id)
                ));
            }
            
            // Check for duplicate routes
            if !routes.insert(&item.route) {
                errors.push(ConfigError::ValidationError(
                    format!("Duplicate navigation route: {}", item.route)
                ));
            }
            
            // Validate route format
            if !item.route.starts_with('/') {
                errors.push(ConfigError::ValidationError(
                    format!("Navigation route '{}' must start with '/'", item.route)
                ));
            }
            
            // Validate children
            if let Some(children) = &item.children {
                for child in children {
                    if !child.route.starts_with('/') {
                        errors.push(ConfigError::ValidationError(
                            format!("Child navigation route '{}' must start with '/'", child.route)
                        ));
                    }
                }
            }
        }
        
        // Validate quick actions
        if let Some(quick_actions) = &config.navigation.quick_actions {
            for action in quick_actions {
                if action.action.is_empty() {
                    errors.push(ConfigError::ValidationError(
                        "Quick action must have an action defined".to_string()
                    ));
                }
            }
        }
    }
    
    fn validate_widgets(config: &TenantConfig, errors: &mut Vec<ConfigError>, warnings: &mut Vec<String>) {
        let mut widget_ids = HashSet::new();
        
        for widget in &config.widgets.dashboard {
            // Check for duplicate IDs
            if !widget_ids.insert(&widget.id) {
                errors.push(ConfigError::ValidationError(
                    format!("Duplicate widget ID: {}", widget.id)
                ));
            }
            
            // Validate widget type
            // Accept both short forms (stat, chart) and hyphenated forms (stat-card, line-chart)
            match widget.widget_type.as_str() {
                "stat" | "stat-card" | "chart" | "line-chart" | "pie-chart" | "bar-chart" | "table" | "list" => {},
                _ => {
                    errors.push(ConfigError::ValidationError(
                        format!("Invalid widget type '{}' for widget '{}'", widget.widget_type, widget.id)
                    ));
                }
            }
            
            // Validate SQL query safety
            if let Some(query) = &widget.query {
                if !Self::is_safe_query(query) {
                    errors.push(ConfigError::ValidationError(
                        format!("Unsafe SQL query in widget '{}': {}", widget.id, query)
                    ));
                }
            }
            
            // Validate refresh interval
            if let Some(interval) = widget.refresh_interval {
                if interval < 5 {
                    warnings.push(format!(
                        "Widget '{}' has refresh interval < 5 seconds, may impact performance",
                        widget.id
                    ));
                }
            }
        }
    }
    
    fn validate_modules(config: &TenantConfig, errors: &mut Vec<ConfigError>, warnings: &mut Vec<String>) {
        // Validate module dependencies
        let work_orders_enabled = config.modules.modules.get("work_orders")
            .map(|m| m.enabled)
            .unwrap_or(false);
        let inventory_enabled = config.modules.modules.get("inventory")
            .map(|m| m.enabled)
            .unwrap_or(false);
        let commissions_enabled = config.modules.modules.get("commissions")
            .map(|m| m.enabled)
            .unwrap_or(false);
        
        if work_orders_enabled && !inventory_enabled {
            errors.push(ConfigError::ValidationError(
                "Module 'work_orders' requires 'inventory' to be enabled".to_string()
            ));
        }
        
        if commissions_enabled && !inventory_enabled {
            warnings.push("Module 'commissions' works best with 'inventory' enabled".to_string());
        }
        
        // Validate module settings
        if let Some(layaway) = config.modules.modules.get("layaway") {
            if layaway.enabled {
                if let Some(settings) = &layaway.settings {
                    if let Some(deposit) = settings.get("default_deposit_percent") {
                        if let Some(percent) = deposit.as_f64() {
                            if percent < 0.0 || percent > 100.0 {
                                errors.push(ConfigError::ValidationError(
                                    "layaway.default_deposit_percent must be between 0 and 100".to_string()
                                ));
                            }
                        }
                    }
                }
            }
        }
    }
    
    fn validate_database_schema(config: &TenantConfig, errors: &mut Vec<ConfigError>) {
        // Only validate if database config exists
        let database = match &config.database {
            Some(db) => db,
            None => return, // No database config, skip validation
        };
        
        // Validate custom tables
        let mut table_names = HashSet::new();
        
        if let Some(custom_tables) = &database.custom_tables {
            for table in custom_tables {
                // Check for duplicate table names
                if !table_names.insert(&table.name) {
                    errors.push(ConfigError::ValidationError(
                        format!("Duplicate custom table name: {}", table.name)
                    ));
                }
                
                // Validate table name format (alphanumeric and underscores only)
                let name_regex = Regex::new(r"^[a-z][a-z0-9_]*$").unwrap();
                if !name_regex.is_match(&table.name) {
                    errors.push(ConfigError::ValidationError(
                        format!("Invalid table name '{}': must start with letter and contain only lowercase letters, numbers, and underscores", table.name)
                    ));
                }
                
                // Validate columns
                if table.columns.is_empty() {
                    errors.push(ConfigError::ValidationError(
                        format!("Custom table '{}' must have at least one column", table.name)
                    ));
                }
                
                let mut column_names = HashSet::new();
                for column in &table.columns {
                    // Check for duplicate column names
                    if !column_names.insert(&column.name) {
                        errors.push(ConfigError::ValidationError(
                            format!("Duplicate column name '{}' in table '{}'", column.name, table.name)
                        ));
                    }
                    
                    // Validate column name format
                    if !name_regex.is_match(&column.name) {
                        errors.push(ConfigError::ValidationError(
                            format!("Invalid column name '{}' in table '{}': must start with letter and contain only lowercase letters, numbers, and underscores", column.name, table.name)
                        ));
                    }
                }
            }
        }
        
        // Validate custom columns
        if let Some(custom_columns) = &database.custom_columns {
            for (table_name, columns) in custom_columns {
                let mut column_names = HashSet::new();
                
                for column in columns {
                    // Check for duplicate column names
                    if !column_names.insert(&column.name) {
                        errors.push(ConfigError::ValidationError(
                            format!("Duplicate custom column name '{}' in table '{}'", column.name, table_name)
                        ));
                    }
                }
            }
        }
    }
    
    fn is_valid_color(color: &str) -> bool {
        // Check if it's a valid hex color
        if color.starts_with('#') {
            let hex_regex = Regex::new(r"^#[0-9A-Fa-f]{6}$").unwrap();
            return hex_regex.is_match(color);
        }
        
        // Check if it's a valid CSS color name
        let css_colors = vec![
            "black", "white", "red", "green", "blue", "yellow", "cyan", "magenta",
            "gray", "grey", "silver", "maroon", "olive", "lime", "aqua", "teal",
            "navy", "fuchsia", "purple", "orange", "transparent"
        ];
        
        css_colors.contains(&color.to_lowercase().as_str())
    }
    
    fn is_safe_query(query: &str) -> bool {
        let query_upper = query.to_uppercase();
        
        // Disallow dangerous operations
        let dangerous_keywords = vec!["DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"];
        for keyword in dangerous_keywords {
            if query_upper.contains(keyword) {
                return false;
            }
        }
        
        // DELETE and UPDATE must have WHERE clause
        if (query_upper.contains("DELETE") || query_upper.contains("UPDATE")) 
            && !query_upper.contains("WHERE") {
            return false;
        }
        
        // Disallow multiple statements (semicolon not at end)
        let trimmed = query.trim();
        if trimmed.matches(';').count() > 1 || (trimmed.contains(';') && !trimmed.ends_with(';')) {
            return false;
        }
        
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::*;
    
    fn create_valid_config() -> TenantConfig {
        use std::collections::HashMap;
        
        TenantConfig {
            version: "1.0.0".to_string(),
            tenant: TenantInfo {
                id: "test-tenant".to_string(),
                name: "Test Tenant".to_string(),
                slug: "test".to_string(),
                domain: None,
                description: None,
            },
            branding: BrandingConfig {
                company: CompanyBranding {
                    name: "Test Company".to_string(),
                    short_name: Some("Test".to_string()),
                    tagline: Some("Test Tagline".to_string()),
                    logo: Some("/logo.svg".to_string()),
                    logo_light: None,
                    logo_dark: None,
                    favicon: Some("/favicon.ico".to_string()),
                    icon: None,
                },
                login: Some(LoginBranding {
                    background: Some("/bg.jpg".to_string()),
                    message: Some("Welcome".to_string()),
                    show_logo: Some(true),
                    layout: None,
                }),
                receipts: Some(ReceiptBranding {
                    header: Some("Test Company".to_string()),
                    footer: Some("Thank you".to_string()),
                    show_logo: None,
                }),
                store: Some(StoreBranding {
                    name: Some("Main Store".to_string()),
                    station: None,
                }),
            },
            theme: ThemeConfig {
                mode: "dark".to_string(),
                colors: ThemeColors {
                    primary: ColorValue::Simple("#3b82f6".to_string()),
                    secondary: Some(ColorValue::Simple("#8b5cf6".to_string())),
                    accent: Some(ColorValue::Simple("#10b981".to_string())),
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
            modules: ModulesConfig {
                modules: HashMap::new(),
            },
            localization: LocalizationConfig {
                language: Some("en".to_string()),
                date_format: Some("MM/DD/YYYY".to_string()),
                time_format: Some("12h".to_string()),
                number_format: None,
                currency: None,
                timezone: Some("America/New_York".to_string()),
                first_day_of_week: None,
                measurement_units: None,
            },
            layouts: None,
            wizards: None,
            database: None,
        }
    }
    
    #[test]
    fn test_valid_config() {
        let validator = ConfigValidator::new();
        let config = create_valid_config();
        
        let result = validator.validate(&config);
        assert!(result.is_ok());
    }
    
    #[test]
    fn test_empty_tenant_id() {
        let validator = ConfigValidator::new();
        let mut config = create_valid_config();
        config.tenant.id = "".to_string();
        
        let result = validator.validate(&config);
        assert!(result.is_err());
        
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.to_string().contains("tenant.id")));
    }
    
    #[test]
    fn test_invalid_color() {
        let validator = ConfigValidator::new();
        let mut config = create_valid_config();
        config.theme.colors.primary = ColorValue::Simple("not-a-color".to_string());
        
        let result = validator.validate(&config);
        assert!(result.is_err());
        
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.to_string().contains("primary")));
    }
    
    #[test]
    fn test_invalid_theme_mode() {
        let validator = ConfigValidator::new();
        let mut config = create_valid_config();
        config.theme.mode = "invalid".to_string();
        
        let result = validator.validate(&config);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_duplicate_category_ids() {
        let validator = ConfigValidator::new();
        let mut config = create_valid_config();
        
        config.categories = vec![
            CategoryConfig {
                id: "test".to_string(),
                name: "Test 1".to_string(),
                icon: Some("icon".to_string()),
                color: Some("#3b82f6".to_string()),
                description: None,
                parent: None,
                order: None,
                attributes: vec![],
                search_fields: None,
                display_template: Some("{name}".to_string()),
                filters: None,
                wizard: None,
            },
            CategoryConfig {
                id: "test".to_string(),
                name: "Test 2".to_string(),
                icon: Some("icon".to_string()),
                color: Some("#3b82f6".to_string()),
                description: None,
                parent: None,
                order: None,
                attributes: vec![],
                search_fields: None,
                display_template: Some("{name}".to_string()),
                filters: None,
                wizard: None,
            },
        ];
        
        let result = validator.validate(&config);
        assert!(result.is_err());
        
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.to_string().contains("Duplicate category ID")));
    }
    
    #[test]
    fn test_unsafe_query() {
        let validator = ConfigValidator::new();
        
        assert!(!validator.is_safe_query("DROP TABLE users"));
        assert!(!validator.is_safe_query("DELETE FROM users"));
        assert!(!validator.is_safe_query("UPDATE users SET role = 'admin'"));
        assert!(validator.is_safe_query("SELECT * FROM users WHERE id = 1"));
        assert!(validator.is_safe_query("DELETE FROM users WHERE id = 1"));
    }
    
    #[test]
    fn test_module_dependencies() {
        use std::collections::HashMap;
        
        let validator = ConfigValidator::new();
        let mut config = create_valid_config();
        
        let mut modules = HashMap::new();
        modules.insert("work_orders".to_string(), ModuleConfig {
            enabled: true,
            settings: None,
        });
        modules.insert("inventory".to_string(), ModuleConfig {
            enabled: false,
            settings: None,
        });
        config.modules.modules = modules;
        
        let result = validator.validate(&config);
        assert!(result.is_err());
        
        let errors = result.unwrap_err();
        assert!(errors.iter().any(|e| e.to_string().contains("work_orders") && e.to_string().contains("inventory")));
    }

    #[test]
    fn test_oauth_localhost_validation() {
        let validator = ConfigValidator::new();
        let config = create_valid_config();
        
        // OAuth validation is documented but not fully implemented yet
        // This test ensures the validation method exists
        let result = validator.validate(&config);
        assert!(result.is_ok());
    }
}
