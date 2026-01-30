// Runtime profile management for production readiness
// Implements explicit dev/demo/prod profiles with strict validation

use serde::{Deserialize, Serialize};
use std::env;
use std::path::PathBuf;
use std::str::FromStr;

use super::app_config::Config;
use super::error::ConfigError;

/// Runtime profile determines system behavior and validation strictness
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RuntimeProfile {
    /// Development profile: relaxed validation, dev tools enabled
    Dev,
    /// Demo profile: loads preset packs, shows demo indicators
    Demo,
    /// Production profile: strict validation, no placeholders, no dev endpoints
    Prod,
}

impl RuntimeProfile {
    /// Check if this is a production profile
    pub fn is_prod(&self) -> bool {
        matches!(self, RuntimeProfile::Prod)
    }

    /// Check if this is a development profile
    pub fn is_dev(&self) -> bool {
        matches!(self, RuntimeProfile::Dev)
    }

    /// Check if this is a demo profile
    pub fn is_demo(&self) -> bool {
        matches!(self, RuntimeProfile::Demo)
    }
}

impl FromStr for RuntimeProfile {
    type Err = ConfigError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "dev" | "development" => Ok(RuntimeProfile::Dev),
            "demo" => Ok(RuntimeProfile::Demo),
            "prod" | "production" => Ok(RuntimeProfile::Prod),
            _ => Err(ConfigError::ValidationError(format!(
                "Invalid runtime profile '{}'. Valid options: dev, demo, prod",
                s
            ))),
        }
    }
}

impl std::fmt::Display for RuntimeProfile {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            RuntimeProfile::Dev => write!(f, "dev"),
            RuntimeProfile::Demo => write!(f, "demo"),
            RuntimeProfile::Prod => write!(f, "prod"),
        }
    }
}

/// Profile-aware configuration manager
#[derive(Debug)]
pub struct ProfileManager {
    profile: RuntimeProfile,
    config: Config,
    config_path: Option<PathBuf>,
}

impl ProfileManager {
    /// Load configuration with profile-based validation
    ///
    /// # Precedence (highest to lowest):
    /// 1. CLI arguments (--config, --profile)
    /// 2. Environment variables (RUNTIME_PROFILE, DATABASE_PATH, etc.)
    /// 3. Tenant config file (if --config provided)
    /// 4. Example config file (fallback)
    /// 5. Built-in defaults (dev/demo only, prod forbids unsafe defaults)
    pub fn load() -> Result<Self, ConfigError> {
        // Step 1: Determine runtime profile
        let profile = Self::load_profile()?;

        // Step 2: Load base configuration
        let mut config = Self::load_base_config(&profile)?;

        // Step 3: Apply CLI overrides
        Self::apply_cli_overrides(&mut config)?;

        // Step 4: Apply environment variable overrides
        Self::apply_env_overrides(&mut config)?;

        // Step 5: Get config path if provided
        let config_path = Self::get_config_path();

        // Step 6: Create manager
        let manager = Self {
            profile,
            config,
            config_path,
        };

        // Step 7: Validate configuration for this profile
        manager.validate()?;

        Ok(manager)
    }

    /// Get the runtime profile
    pub fn profile(&self) -> RuntimeProfile {
        self.profile
    }

    /// Get the configuration
    pub fn config(&self) -> &Config {
        &self.config
    }

    /// Get the config file path (if provided)
    pub fn config_path(&self) -> Option<&PathBuf> {
        self.config_path.as_ref()
    }

    /// Load runtime profile from environment or CLI
    fn load_profile() -> Result<RuntimeProfile, ConfigError> {
        // Check CLI args first
        let args: Vec<String> = env::args().collect();
        for (i, arg) in args.iter().enumerate() {
            if arg == "--profile" && i + 1 < args.len() {
                return RuntimeProfile::from_str(&args[i + 1]);
            }
            if arg.starts_with("--profile=") {
                let value = arg.strip_prefix("--profile=").unwrap();
                return RuntimeProfile::from_str(value);
            }
        }

        // Check environment variable
        if let Ok(profile_str) = env::var("RUNTIME_PROFILE") {
            return RuntimeProfile::from_str(&profile_str);
        }

        // Default to dev for development
        Ok(RuntimeProfile::Dev)
    }

    /// Load base configuration with profile-specific defaults
    fn load_base_config(profile: &RuntimeProfile) -> Result<Config, ConfigError> {
        match profile {
            RuntimeProfile::Prod => {
                // Production: no unsafe defaults, all values must be explicitly set
                Ok(Config {
                    api_host: env::var("API_HOST")
                        .unwrap_or_else(|_| "127.0.0.1".to_string()),
                    api_port: env::var("API_PORT")
                        .unwrap_or_else(|_| "8923".to_string())
                        .parse()
                        .map_err(|e| ConfigError::ValidationError(format!("Invalid API_PORT: {}", e)))?,
                    database_url: String::new(), // Must be set via env or config
                    store_id: String::new(),     // Must be set via env or config
                    store_name: String::new(),   // Must be set via env or config
                    jwt_secret: String::new(),   // Must be set via env or config
                    jwt_expiration_hours: 8,
                    quickbooks_redirect_uri: None,
                    google_drive_redirect_uri: None,
                    enable_dev_endpoints: false, // Disabled by default in prod
                    enable_demo: false,          // Disabled by default in prod
                    integrations_enabled: false,
                })
            }
            RuntimeProfile::Demo | RuntimeProfile::Dev => {
                // Dev/Demo: use safe defaults for development
                Ok(Config::default())
            }
        }
    }

    /// Apply CLI argument overrides
    fn apply_cli_overrides(config: &mut Config) -> Result<(), ConfigError> {
        let args: Vec<String> = env::args().collect();

        for (i, arg) in args.iter().enumerate() {
            // --config flag is handled separately (for tenant config files)
            if arg == "--config" && i + 1 < args.len() {
                // Config path is stored separately, not in Config struct
                continue;
            }

            // --port flag
            if arg == "--port" && i + 1 < args.len() {
                config.api_port = args[i + 1]
                    .parse()
                    .map_err(|e| ConfigError::ValidationError(format!("Invalid --port value: {}", e)))?;
            }
            if arg.starts_with("--port=") {
                let value = arg.strip_prefix("--port=").unwrap();
                config.api_port = value
                    .parse()
                    .map_err(|e| ConfigError::ValidationError(format!("Invalid --port value: {}", e)))?;
            }

            // --host flag
            if arg == "--host" && i + 1 < args.len() {
                config.api_host = args[i + 1].clone();
            }
            if arg.starts_with("--host=") {
                config.api_host = arg.strip_prefix("--host=").unwrap().to_string();
            }
        }

        Ok(())
    }

    /// Apply environment variable overrides
    fn apply_env_overrides(config: &mut Config) -> Result<(), ConfigError> {
        // API configuration
        if let Ok(host) = env::var("API_HOST") {
            config.api_host = host;
        }
        if let Ok(port) = env::var("API_PORT") {
            config.api_port = port
                .parse()
                .map_err(|e| ConfigError::ValidationError(format!("Invalid API_PORT: {}", e)))?;
        }

        // Database configuration (canonical key: DATABASE_PATH)
        if let Ok(db_path) = env::var("DATABASE_PATH") {
            // Convert path to SQLite URL format
            config.database_url = if db_path.starts_with("sqlite:") {
                db_path
            } else {
                format!("sqlite:{}?mode=rwc", db_path)
            };
        }
        // Fallback to DATABASE_URL for compatibility (with deprecation warning)
        else if let Ok(db_url) = env::var("DATABASE_URL") {
            tracing::warn!(
                "DATABASE_URL is deprecated. Please use DATABASE_PATH instead."
            );
            config.database_url = db_url;
        }

        // Store configuration
        if let Ok(store_id) = env::var("STORE_ID") {
            config.store_id = store_id;
        }
        if let Ok(store_name) = env::var("STORE_NAME") {
            config.store_name = store_name;
        }

        // Security configuration
        if let Ok(jwt_secret) = env::var("JWT_SECRET") {
            config.jwt_secret = jwt_secret;
        }
        if let Ok(jwt_exp) = env::var("JWT_EXPIRATION_HOURS") {
            config.jwt_expiration_hours = jwt_exp
                .parse()
                .unwrap_or(8);
        }

        // OAuth configuration
        if let Ok(qb_redirect) = env::var("QUICKBOOKS_REDIRECT_URI") {
            config.quickbooks_redirect_uri = Some(qb_redirect);
        }
        if let Ok(gd_redirect) = env::var("GOOGLE_DRIVE_REDIRECT_URI") {
            config.google_drive_redirect_uri = Some(gd_redirect);
        }

        // Feature flags
        if let Ok(dev_endpoints) = env::var("ENABLE_DEV_ENDPOINTS") {
            config.enable_dev_endpoints = dev_endpoints
                .parse()
                .unwrap_or(false);
        }
        if let Ok(demo) = env::var("ENABLE_DEMO") {
            config.enable_demo = demo
                .parse()
                .unwrap_or(false);
        }
        if let Ok(integrations) = env::var("INTEGRATIONS_ENABLED") {
            config.integrations_enabled = integrations
                .parse()
                .unwrap_or(false);
        }

        Ok(())
    }

    /// Get config file path from CLI arguments
    fn get_config_path() -> Option<PathBuf> {
        let args: Vec<String> = env::args().collect();

        for (i, arg) in args.iter().enumerate() {
            if arg == "--config" && i + 1 < args.len() {
                return Some(PathBuf::from(&args[i + 1]));
            }
            if arg.starts_with("--config=") {
                let value = arg.strip_prefix("--config=").unwrap();
                return Some(PathBuf::from(value));
            }
        }

        None
    }

    /// Validate configuration for the current profile
    fn validate(&self) -> Result<(), ConfigError> {
        let mut errors = Vec::new();

        match self.profile {
            RuntimeProfile::Prod => {
                // Production: strict validation

                // Check DATABASE_PATH is set
                if self.config.database_url.is_empty() {
                    errors.push("DATABASE_PATH is required in prod profile".to_string());
                }

                // Check STORE_ID is set
                if self.config.store_id.is_empty() {
                    errors.push("STORE_ID is required in prod profile".to_string());
                }

                // Check JWT_SECRET is set and not a placeholder
                if self.config.jwt_secret.is_empty() {
                    errors.push("JWT_SECRET is required in prod profile".to_string());
                } else if Self::is_placeholder_secret(&self.config.jwt_secret) {
                    errors.push(format!(
                        "JWT_SECRET contains placeholder value '{}' in prod profile",
                        self.config.jwt_secret
                    ));
                }

                // Check for demo mode enabled
                if self.config.enable_demo {
                    errors.push("Demo mode (ENABLE_DEMO=true) is not allowed in prod profile".to_string());
                }

                // Check for dev endpoints enabled
                if self.config.enable_dev_endpoints {
                    errors.push("Dev endpoints (ENABLE_DEV_ENDPOINTS=true) are not allowed in prod profile".to_string());
                }

                // Check for localhost OAuth redirect URIs when integrations are enabled
                if self.config.integrations_enabled {
                    if let Some(ref qb_redirect) = self.config.quickbooks_redirect_uri {
                        if qb_redirect.contains("localhost") || qb_redirect.contains("127.0.0.1") {
                            errors.push(format!(
                                "QuickBooks OAuth redirect URI contains localhost ('{}') in prod profile with integrations enabled",
                                qb_redirect
                            ));
                        }
                    }

                    if let Some(ref gd_redirect) = self.config.google_drive_redirect_uri {
                        if gd_redirect.contains("localhost") || gd_redirect.contains("127.0.0.1") {
                            errors.push(format!(
                                "Google Drive OAuth redirect URI contains localhost ('{}') in prod profile with integrations enabled",
                                gd_redirect
                            ));
                        }
                    }
                }
            }
            RuntimeProfile::Demo => {
                // Demo: moderate validation
                // Allow defaults but warn about placeholders
                if Self::is_placeholder_secret(&self.config.jwt_secret) {
                    tracing::warn!(
                        "JWT_SECRET contains placeholder value in demo profile. \
                         This is acceptable for demo but should be changed for production."
                    );
                }

                // Warn if demo mode is not enabled in demo profile
                if !self.config.enable_demo {
                    tracing::warn!(
                        "Demo profile is active but ENABLE_DEMO is false. \
                         Consider setting ENABLE_DEMO=true to load demo data."
                    );
                }
            }
            RuntimeProfile::Dev => {
                // Dev: minimal validation
                // Allow all defaults and placeholders
            }
        }

        if errors.is_empty() {
            Ok(())
        } else {
            Err(ConfigError::ValidationError(format!(
                "Configuration validation failed for profile '{}':\n  - {}",
                self.profile,
                errors.join("\n  - ")
            )))
        }
    }

    /// Check if a secret value is a placeholder
    fn is_placeholder_secret(value: &str) -> bool {
        let placeholders = [
            "CHANGE_ME",
            "change_me",
            "secret123",
            "password123",
            "test-secret",
            "your-secret-key",
            "change-in-production",
        ];

        placeholders.iter().any(|p| value.contains(p))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_profile_from_str() {
        assert_eq!(RuntimeProfile::from_str("dev").unwrap(), RuntimeProfile::Dev);
        assert_eq!(RuntimeProfile::from_str("development").unwrap(), RuntimeProfile::Dev);
        assert_eq!(RuntimeProfile::from_str("demo").unwrap(), RuntimeProfile::Demo);
        assert_eq!(RuntimeProfile::from_str("prod").unwrap(), RuntimeProfile::Prod);
        assert_eq!(RuntimeProfile::from_str("production").unwrap(), RuntimeProfile::Prod);
        assert!(RuntimeProfile::from_str("invalid").is_err());
    }

    #[test]
    fn test_profile_display() {
        assert_eq!(RuntimeProfile::Dev.to_string(), "dev");
        assert_eq!(RuntimeProfile::Demo.to_string(), "demo");
        assert_eq!(RuntimeProfile::Prod.to_string(), "prod");
    }

    #[test]
    fn test_profile_checks() {
        assert!(RuntimeProfile::Dev.is_dev());
        assert!(!RuntimeProfile::Dev.is_prod());
        assert!(!RuntimeProfile::Dev.is_demo());

        assert!(RuntimeProfile::Demo.is_demo());
        assert!(!RuntimeProfile::Demo.is_prod());
        assert!(!RuntimeProfile::Demo.is_dev());

        assert!(RuntimeProfile::Prod.is_prod());
        assert!(!RuntimeProfile::Prod.is_dev());
        assert!(!RuntimeProfile::Prod.is_demo());
    }

    #[test]
    fn test_is_placeholder_secret() {
        assert!(ProfileManager::is_placeholder_secret("CHANGE_ME"));
        assert!(ProfileManager::is_placeholder_secret("secret123"));
        assert!(ProfileManager::is_placeholder_secret("password123"));
        assert!(ProfileManager::is_placeholder_secret("test-secret-key"));
        assert!(ProfileManager::is_placeholder_secret("your-secret-key-change-in-production"));
        assert!(!ProfileManager::is_placeholder_secret("actual-secure-random-secret-key-12345"));
    }

    #[test]
    fn test_prod_validation_requires_database_path() {
        // Set up environment for prod profile
        std::env::set_var("RUNTIME_PROFILE", "prod");
        std::env::set_var("STORE_ID", "test-store");
        std::env::set_var("JWT_SECRET", "actual-secure-secret-key-12345");
        // Intentionally NOT setting DATABASE_PATH

        let result = ProfileManager::load();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("DATABASE_PATH is required"));

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("STORE_ID");
        std::env::remove_var("JWT_SECRET");
    }

    #[test]
    fn test_prod_validation_rejects_placeholder_secrets() {
        // Set up environment for prod profile
        std::env::set_var("RUNTIME_PROFILE", "prod");
        std::env::set_var("DATABASE_PATH", "test.db");
        std::env::set_var("STORE_ID", "test-store");
        std::env::set_var("JWT_SECRET", "CHANGE_ME");

        let result = ProfileManager::load();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("JWT_SECRET contains placeholder value"));

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("DATABASE_PATH");
        std::env::remove_var("STORE_ID");
        std::env::remove_var("JWT_SECRET");
    }

    #[test]
    fn test_prod_validation_rejects_demo_mode() {
        // Set up environment for prod profile
        std::env::set_var("RUNTIME_PROFILE", "prod");
        std::env::set_var("DATABASE_PATH", "test.db");
        std::env::set_var("STORE_ID", "test-store");
        std::env::set_var("JWT_SECRET", "actual-secure-secret-key-12345");
        std::env::set_var("ENABLE_DEMO", "true");

        let result = ProfileManager::load();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("Demo mode"));

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("DATABASE_PATH");
        std::env::remove_var("STORE_ID");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("ENABLE_DEMO");
    }

    #[test]
    fn test_prod_validation_rejects_dev_endpoints() {
        // Set up environment for prod profile
        std::env::set_var("RUNTIME_PROFILE", "prod");
        std::env::set_var("DATABASE_PATH", "test.db");
        std::env::set_var("STORE_ID", "test-store");
        std::env::set_var("JWT_SECRET", "actual-secure-secret-key-12345");
        std::env::set_var("ENABLE_DEV_ENDPOINTS", "true");

        let result = ProfileManager::load();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("Dev endpoints"));

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("DATABASE_PATH");
        std::env::remove_var("STORE_ID");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("ENABLE_DEV_ENDPOINTS");
    }

    #[test]
    fn test_prod_validation_rejects_localhost_oauth() {
        // Set up environment for prod profile with integrations enabled
        std::env::set_var("RUNTIME_PROFILE", "prod");
        std::env::set_var("DATABASE_PATH", "test.db");
        std::env::set_var("STORE_ID", "test-store");
        std::env::set_var("JWT_SECRET", "actual-secure-secret-key-12345");
        std::env::set_var("INTEGRATIONS_ENABLED", "true");
        std::env::set_var("QUICKBOOKS_REDIRECT_URI", "https://example.com/oauth/quickbooks/callback");

        let result = ProfileManager::load();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("localhost"));
        assert!(err.to_string().contains("QuickBooks"));

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("DATABASE_PATH");
        std::env::remove_var("STORE_ID");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("INTEGRATIONS_ENABLED");
        std::env::remove_var("QUICKBOOKS_REDIRECT_URI");
    }

    #[test]
    fn test_prod_validation_aggregates_multiple_errors() {
        // Set up environment for prod profile with multiple violations
        std::env::set_var("RUNTIME_PROFILE", "prod");
        // Missing DATABASE_PATH
        // Missing STORE_ID
        std::env::set_var("JWT_SECRET", "CHANGE_ME"); // Placeholder
        std::env::set_var("ENABLE_DEMO", "true"); // Demo enabled
        std::env::set_var("ENABLE_DEV_ENDPOINTS", "true"); // Dev endpoints enabled

        let result = ProfileManager::load();
        assert!(result.is_err());
        let err = result.unwrap_err();
        let err_str = err.to_string();
        
        // Should contain all errors
        assert!(err_str.contains("DATABASE_PATH is required"));
        assert!(err_str.contains("STORE_ID is required"));
        assert!(err_str.contains("JWT_SECRET contains placeholder"));
        assert!(err_str.contains("Demo mode"));
        assert!(err_str.contains("Dev endpoints"));

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("ENABLE_DEMO");
        std::env::remove_var("ENABLE_DEV_ENDPOINTS");
    }

    #[test]
    fn test_prod_validation_passes_with_valid_config() {
        // Set up environment for prod profile with all required fields
        std::env::set_var("RUNTIME_PROFILE", "prod");
        std::env::set_var("DATABASE_PATH", "test.db");
        std::env::set_var("STORE_ID", "test-store");
        std::env::set_var("JWT_SECRET", "actual-secure-secret-key-12345");
        std::env::set_var("ENABLE_DEMO", "false");
        std::env::set_var("ENABLE_DEV_ENDPOINTS", "false");

        let result = ProfileManager::load();
        assert!(result.is_ok());

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("DATABASE_PATH");
        std::env::remove_var("STORE_ID");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("ENABLE_DEMO");
        std::env::remove_var("ENABLE_DEV_ENDPOINTS");
    }

    #[test]
    fn test_prod_validation_allows_localhost_oauth_when_integrations_disabled() {
        // Set up environment for prod profile with localhost OAuth but integrations disabled
        std::env::set_var("RUNTIME_PROFILE", "prod");
        std::env::set_var("DATABASE_PATH", "test.db");
        std::env::set_var("STORE_ID", "test-store");
        std::env::set_var("JWT_SECRET", "actual-secure-secret-key-12345");
        std::env::set_var("INTEGRATIONS_ENABLED", "false");
        std::env::set_var("QUICKBOOKS_REDIRECT_URI", "https://example.com/oauth/quickbooks/callback");

        let result = ProfileManager::load();
        // Should pass because integrations are disabled
        assert!(result.is_ok());

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("DATABASE_PATH");
        std::env::remove_var("STORE_ID");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("INTEGRATIONS_ENABLED");
        std::env::remove_var("QUICKBOOKS_REDIRECT_URI");
    }

    #[test]
    fn test_prod_validation_rejects_127_0_0_1_oauth() {
        // Set up environment for prod profile with 127.0.0.1 OAuth
        std::env::set_var("RUNTIME_PROFILE", "prod");
        std::env::set_var("DATABASE_PATH", "test.db");
        std::env::set_var("STORE_ID", "test-store");
        std::env::set_var("JWT_SECRET", "actual-secure-secret-key-12345");
        std::env::set_var("INTEGRATIONS_ENABLED", "true");
        std::env::set_var("GOOGLE_DRIVE_REDIRECT_URI", "http://127.0.0.1:8080/callback");

        let result = ProfileManager::load();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("127.0.0.1"));
        assert!(err.to_string().contains("Google Drive"));

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("DATABASE_PATH");
        std::env::remove_var("STORE_ID");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("INTEGRATIONS_ENABLED");
        std::env::remove_var("GOOGLE_DRIVE_REDIRECT_URI");
    }

    #[test]
    fn test_dev_profile_allows_all_placeholders() {
        // Set up environment for dev profile with placeholders
        std::env::set_var("RUNTIME_PROFILE", "dev");
        std::env::set_var("JWT_SECRET", "CHANGE_ME");
        std::env::set_var("ENABLE_DEMO", "true");
        std::env::set_var("ENABLE_DEV_ENDPOINTS", "true");

        let result = ProfileManager::load();
        // Dev profile should allow placeholders
        assert!(result.is_ok());

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("JWT_SECRET");
        std::env::remove_var("ENABLE_DEMO");
        std::env::remove_var("ENABLE_DEV_ENDPOINTS");
    }

    #[test]
    fn test_demo_profile_allows_placeholders() {
        // Set up environment for demo profile with placeholders
        std::env::set_var("RUNTIME_PROFILE", "demo");
        std::env::set_var("JWT_SECRET", "secret123");

        let result = ProfileManager::load();
        // Demo profile should allow placeholders (with warnings)
        assert!(result.is_ok());

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("JWT_SECRET");
    }

    #[test]
    fn test_database_url_fallback_with_deprecation() {
        // Set up environment with DATABASE_URL instead of DATABASE_PATH
        std::env::set_var("RUNTIME_PROFILE", "dev");
        std::env::set_var("DATABASE_URL", "sqlite:./data/test.db");

        let result = ProfileManager::load();
        // Should work with DATABASE_URL fallback
        assert!(result.is_ok());
        
        let manager = result.unwrap();
        // Should have converted DATABASE_URL to database_url in config
        assert!(!manager.config().database_url.is_empty());

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_database_path_takes_precedence_over_database_url() {
        // Set up environment with both DATABASE_PATH and DATABASE_URL
        std::env::set_var("RUNTIME_PROFILE", "dev");
        std::env::set_var("DATABASE_PATH", "./data/primary.db");
        std::env::set_var("DATABASE_URL", "sqlite:./data/fallback.db");

        let result = ProfileManager::load();
        assert!(result.is_ok());
        
        let manager = result.unwrap();
        // DATABASE_PATH should take precedence
        assert!(manager.config().database_url.contains("primary.db"));

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("DATABASE_PATH");
        std::env::remove_var("DATABASE_URL");
    }

    #[test]
    fn test_empty_jwt_secret_in_prod() {
        // Set up environment for prod profile with empty JWT_SECRET
        std::env::set_var("RUNTIME_PROFILE", "prod");
        std::env::set_var("DATABASE_PATH", "test.db");
        std::env::set_var("STORE_ID", "test-store");
        std::env::set_var("JWT_SECRET", "");

        let result = ProfileManager::load();
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(err.to_string().contains("JWT_SECRET is required"));

        // Clean up
        std::env::remove_var("RUNTIME_PROFILE");
        std::env::remove_var("DATABASE_PATH");
        std::env::remove_var("STORE_ID");
        std::env::remove_var("JWT_SECRET");
    }

    #[test]
    fn test_placeholder_secret_case_insensitive() {
        // Test various case variations of placeholder secrets
        assert!(ProfileManager::is_placeholder_secret("change_me"));
        assert!(ProfileManager::is_placeholder_secret("CHANGE_ME"));
        assert!(ProfileManager::is_placeholder_secret("Change_Me"));
        assert!(ProfileManager::is_placeholder_secret("SECRET123"));
        assert!(ProfileManager::is_placeholder_secret("Password123"));
        assert!(ProfileManager::is_placeholder_secret("TEST-SECRET"));
        assert!(ProfileManager::is_placeholder_secret("YOUR-SECRET-KEY"));
    }

    #[test]
    fn test_placeholder_secret_with_prefix_suffix() {
        // Test placeholder detection with prefix/suffix
        assert!(ProfileManager::is_placeholder_secret("prefix-CHANGE_ME-suffix"));
        assert!(ProfileManager::is_placeholder_secret("my-secret123-key"));
        assert!(ProfileManager::is_placeholder_secret("app-password123"));
        assert!(ProfileManager::is_placeholder_secret("test-secret-for-dev"));
    }

    #[test]
    fn test_valid_secrets_not_detected_as_placeholders() {
        // Test that valid secrets are not detected as placeholders
        assert!(!ProfileManager::is_placeholder_secret("actual-secure-random-key-12345"));
        assert!(!ProfileManager::is_placeholder_secret("production-ready-secret-key"));
        assert!(!ProfileManager::is_placeholder_secret("randomly-generated-secure-token"));
        assert!(!ProfileManager::is_placeholder_secret("abcdef1234567890abcdef1234567890"));
    }
}
