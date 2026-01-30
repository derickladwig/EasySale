use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};
use std::time::{Duration, SystemTime};

use super::error::{ConfigError, ConfigResult, io_error_to_config_error};
use super::models::TenantConfig;
use super::validator::ConfigValidator;

/// Configuration cache entry
#[derive(Debug, Clone)]
struct CacheEntry {
    config: TenantConfig,
    loaded_at: SystemTime,
    file_path: PathBuf,
}

/// Configuration loader with caching
#[derive(Clone)]
pub struct ConfigLoader {
    /// Cache of loaded configurations by tenant ID
    cache: Arc<RwLock<HashMap<String, CacheEntry>>>,
    
    /// Base directory for configuration files
    config_dir: PathBuf,
    
    /// Cache TTL (time-to-live) in seconds
    cache_ttl: Duration,
    
    /// Enable hot-reload in development mode
    hot_reload: bool,
}

impl ConfigLoader {
    /// Create a new configuration loader
    ///
    /// # Arguments
    /// * `config_dir` - Base directory containing configuration files
    /// * `cache_ttl_secs` - Cache time-to-live in seconds (0 = no caching)
    /// * `hot_reload` - Enable hot-reload for development
    pub fn new<P: AsRef<Path>>(
        config_dir: P,
        cache_ttl_secs: u64,
        hot_reload: bool,
    ) -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            config_dir: config_dir.as_ref().to_path_buf(),
            cache_ttl: Duration::from_secs(cache_ttl_secs),
            hot_reload,
        }
    }

    /// Load configuration for a tenant
    ///
    /// # Arguments
    /// * `tenant_id` - Tenant identifier
    ///
    /// # Returns
    /// * `ConfigResult<TenantConfig>` - Loaded configuration or error
    pub fn load_config(&self, tenant_id: &str) -> ConfigResult<TenantConfig> {
        // Check cache first
        if let Some(cached) = self.get_from_cache(tenant_id) {
            return Ok(cached);
        }

        // Load from file
        let config = self.load_from_file(tenant_id)?;

        // Cache the configuration
        self.cache_config(tenant_id, config.clone())?;

        Ok(config)
    }

    /// Load configuration from file
    fn load_from_file(&self, tenant_id: &str) -> ConfigResult<TenantConfig> {
        let file_path = self.get_config_path(tenant_id);

        // Check if file exists
        if !file_path.exists() {
            return Err(ConfigError::NotFound(file_path.display().to_string()));
        }

        // Read file contents
        let contents = fs::read_to_string(&file_path)
            .map_err(|e| ConfigError::ReadError(format!("{}: {}", file_path.display(), e)))?;

        // Parse JSON
        let config: TenantConfig = serde_json::from_str(&contents)
            .map_err(|e| ConfigError::ParseError(format!("{}: {e}", file_path.display())))?;

        // Validate configuration
        Self::validate_config(&config)?;

        Ok(config)
    }

    /// Get configuration from cache
    fn get_from_cache(&self, tenant_id: &str) -> Option<TenantConfig> {
        let cache = self.cache.read().ok()?;
        let entry = cache.get(tenant_id)?;

        // Check if cache entry is still valid
        if !self.is_cache_valid(entry) {
            return None;
        }

        // In hot-reload mode, check if file has been modified
        if self.hot_reload && Self::is_file_modified(entry) {
            return None;
        }

        Some(entry.config.clone())
    }

    /// Cache a configuration
    fn cache_config(&self, tenant_id: &str, config: TenantConfig) -> ConfigResult<()> {
        let mut cache = self.cache.write()
            .map_err(|e| ConfigError::ReadError(format!("Failed to acquire cache lock: {}", e)))?;

        let entry = CacheEntry {
            config,
            loaded_at: SystemTime::now(),
            file_path: self.get_config_path(tenant_id),
        };

        cache.insert(tenant_id.to_string(), entry);
        Ok(())
    }

    /// Check if cache entry is still valid
    fn is_cache_valid(&self, entry: &CacheEntry) -> bool {
        if self.cache_ttl.as_secs() == 0 {
            return false; // Caching disabled
        }

        match SystemTime::now().duration_since(entry.loaded_at) {
            Ok(elapsed) => elapsed < self.cache_ttl,
            Err(_) => false,
        }
    }

    /// Check if configuration file has been modified
    fn is_file_modified(entry: &CacheEntry) -> bool {
        if let Ok(metadata) = fs::metadata(&entry.file_path) {
            if let Ok(modified) = metadata.modified() {
                return modified > entry.loaded_at;
            }
        }
        false
    }

    /// Get configuration file path for a tenant
    fn get_config_path(&self, tenant_id: &str) -> PathBuf {
        // Try private directory first
        let private_path = self.config_dir.join("private").join(format!("{tenant_id}.json"));
        if private_path.exists() {
            return private_path;
        }

        // Fall back to examples directory
        let examples_path = self.config_dir.join("examples").join(format!("{tenant_id}.json"));
        if examples_path.exists() {
            return examples_path;
        }

        // Fall back to root configs directory (for default.json)
        let root_path = self.config_dir.join(format!("{tenant_id}.json"));
        if root_path.exists() {
            return root_path;
        }

        // Default to private directory (will fail with NotFound)
        private_path
    }

    /// Validate configuration
    fn validate_config(config: &TenantConfig) -> ConfigResult<()> {
        // Use comprehensive validator
        let validator = ConfigValidator::new();
        match validator.validate(config) {
            Ok(_warnings) => {
                // Warnings are logged but don't prevent loading
                Ok(())
            }
            Err(errors) => {
                // Return first error
                if let Some(first_error) = errors.first() {
                    Err(first_error.clone())
                } else {
                    Err(ConfigError::ValidationError("Unknown validation error".to_string()))
                }
            }
        }
    }

    /// Reload configuration for a tenant (bypass cache)
    pub fn reload_config(&self, tenant_id: &str) -> ConfigResult<TenantConfig> {
        // Remove from cache
        if let Ok(mut cache) = self.cache.write() {
            cache.remove(tenant_id);
        }

        // Load fresh from file
        self.load_config(tenant_id)
    }

    /// Clear all cached configurations
    /// Clear configuration cache
    /// 
    /// Note: Currently unused - reserved for future cache management API.
    #[allow(dead_code)]
    pub fn clear_cache(&self) -> ConfigResult<()> {
        let mut cache = self.cache.write()
            .map_err(|e| ConfigError::ReadError(format!("Failed to acquire cache lock: {}", e)))?;
        cache.clear();
        Ok(())
    }

    /// Get list of available tenant configurations
    pub fn list_tenants(&self) -> ConfigResult<Vec<String>> {
        let mut tenants = Vec::new();

        // Check root directory (for default.json)
        tenants.extend(Self::list_configs_in_dir(&self.config_dir)?);

        // Check private directory
        let private_dir = self.config_dir.join("private");
        if private_dir.exists() {
            tenants.extend(Self::list_configs_in_dir(&private_dir)?);
        }

        // Check examples directory
        let examples_dir = self.config_dir.join("examples");
        if examples_dir.exists() {
            tenants.extend(Self::list_configs_in_dir(&examples_dir)?);
        }

        // Remove duplicates (private takes precedence)
        tenants.sort();
        tenants.dedup();

        Ok(tenants)
    }

    /// List configuration files in a directory
    fn list_configs_in_dir(dir: &Path) -> ConfigResult<Vec<String>> {
        let mut configs = Vec::new();

        for entry in fs::read_dir(dir).map_err(io_error_to_config_error)? {
            let entry = entry.map_err(io_error_to_config_error)?;
            let path = entry.path();

            if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                    configs.push(stem.to_string());
                }
            }
        }

        Ok(configs)
    }

    /// Get cache statistics
    /// Get cache statistics
    /// 
    /// Note: Currently unused - reserved for future cache management API.
    #[allow(dead_code)]
    pub fn cache_stats(&self) -> ConfigResult<CacheStats> {
        let cache = self.cache.read()
            .map_err(|e| ConfigError::ReadError(format!("Failed to acquire cache lock: {e}")))?;

        Ok(CacheStats {
            total_entries: cache.len(),
            cache_ttl_secs: self.cache_ttl.as_secs(),
            hot_reload_enabled: self.hot_reload,
        })
    }
    
    /// Validate a configuration without loading it (public API for handlers)
    /// Returns Ok(warnings) if valid, Err(errors) if invalid
    pub async fn validate_config_detailed(&self, config: &TenantConfig) -> Result<Vec<String>, Vec<ConfigError>> {
        let validator = ConfigValidator::new();
        validator.validate(config)
    }

    /// Get configuration for a tenant (async wrapper for load_config)
    /// This method provides an async interface for compatibility with async handlers
    pub async fn get_config(&self, tenant_id: &str) -> ConfigResult<TenantConfig> {
        self.load_config(tenant_id)
    }
}

/// Cache statistics
#[derive(Debug, Clone)]
#[allow(dead_code)]
/// Cache statistics
/// 
/// Note: Currently unused - reserved for future cache management API.
#[allow(dead_code)]
pub struct CacheStats {
    pub total_entries: usize,
    pub cache_ttl_secs: u64,
    pub hot_reload_enabled: bool,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn create_test_config(dir: &Path, tenant_id: &str) -> PathBuf {
        let config_json = r##"{
            "version": "1.0.0",
            "tenant": {
                "id": "test-tenant",
                "name": "Test Tenant",
                "slug": "test-tenant"
            },
            "branding": {
                "company": {
                    "name": "Test Company"
                }
            },
            "theme": {
                "mode": "dark",
                "colors": {
                    "primary": "#3b82f6",
                    "background": "#0f172a",
                    "surface": "#1e293b",
                    "text": "#f1f5f9",
                    "success": "#10b981",
                    "warning": "#f59e0b",
                    "error": "#ef4444",
                    "info": "#3b82f6"
                }
            },
            "categories": [{
                "id": "test-category",
                "name": "Test Category",
                "attributes": [{
                    "name": "test-attr",
                    "type": "text"
                }]
            }],
            "navigation": {
                "main": [{
                    "id": "home",
                    "label": "Home",
                    "route": "/"
                }]
            },
            "widgets": {
                "dashboard": []
            },
            "modules": {},
            "localization": {}
        }"##;

        let private_dir = dir.join("private");
        fs::create_dir_all(&private_dir).unwrap();
        let config_path = private_dir.join(format!("{}.json", tenant_id));
        fs::write(&config_path, config_json).unwrap();
        config_path
    }

    #[test]
    fn test_load_config() {
        let temp_dir = TempDir::new().unwrap();
        create_test_config(temp_dir.path(), "test-tenant");

        let loader = ConfigLoader::new(temp_dir.path(), 300, false);
        let config = loader.load_config("test-tenant").unwrap();

        assert_eq!(config.tenant.id, "test-tenant");
        assert_eq!(config.tenant.name, "Test Tenant");
    }

    #[test]
    fn test_cache() {
        let temp_dir = TempDir::new().unwrap();
        create_test_config(temp_dir.path(), "test-tenant");

        let loader = ConfigLoader::new(temp_dir.path(), 300, false);
        
        // First load
        let config1 = loader.load_config("test-tenant").unwrap();
        
        // Second load (should come from cache)
        let config2 = loader.load_config("test-tenant").unwrap();

        assert_eq!(config1.tenant.id, config2.tenant.id);

        // Check cache stats
        let stats = loader.cache_stats().unwrap();
        assert_eq!(stats.total_entries, 1);
    }

    #[test]
    fn test_reload_config() {
        let temp_dir = TempDir::new().unwrap();
        create_test_config(temp_dir.path(), "test-tenant");

        let loader = ConfigLoader::new(temp_dir.path(), 300, false);
        
        // Load and cache
        loader.load_config("test-tenant").unwrap();

        // Reload (bypass cache)
        let config = loader.reload_config("test-tenant").unwrap();
        assert_eq!(config.tenant.id, "test-tenant");
    }

    #[test]
    fn test_validation() {
        let temp_dir = TempDir::new().unwrap();
        let private_dir = temp_dir.path().join("private");
        fs::create_dir_all(&private_dir).unwrap();

        // Invalid config (missing required fields)
        let invalid_config = r#"{"version": "1.0.0"}"#;
        let config_path = private_dir.join("invalid.json");
        fs::write(&config_path, invalid_config).unwrap();

        let loader = ConfigLoader::new(temp_dir.path(), 300, false);
        let result = loader.load_config("invalid");

        assert!(result.is_err());
    }

    #[test]
    fn test_list_tenants() {
        let temp_dir = TempDir::new().unwrap();
        create_test_config(temp_dir.path(), "tenant1");
        create_test_config(temp_dir.path(), "tenant2");

        let loader = ConfigLoader::new(temp_dir.path(), 300, false);
        let tenants = loader.list_tenants().unwrap();

        assert_eq!(tenants.len(), 2);
        assert!(tenants.contains(&"tenant1".to_string()));
        assert!(tenants.contains(&"tenant2".to_string()));
    }
}
