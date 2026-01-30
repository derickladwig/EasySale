use std::env;

/// Application configuration (separate from tenant configuration)
/// This handles server-level settings like host, port, database path, etc.
#[derive(Debug, Clone)]
pub struct Config {
    pub api_host: String,
    pub api_port: u16,
    #[allow(dead_code)]
    pub database_url: String,
    pub store_id: String,
    pub store_name: String,
    pub jwt_secret: String,
    pub jwt_expiration_hours: u64,
    
    // OAuth configuration
    pub quickbooks_redirect_uri: Option<String>,
    pub google_drive_redirect_uri: Option<String>,
    
    // Feature flags
    pub enable_dev_endpoints: bool,
    pub enable_demo: bool,
    
    // Integration flags
    pub integrations_enabled: bool,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            api_host: "127.0.0.1".to_string(),
            api_port: 8923,
            database_url: "sqlite:./data/pos.db".to_string(),
            store_id: "store-001".to_string(),
            store_name: "Main Store".to_string(),
            jwt_secret: "test-secret-key-for-testing-only".to_string(),
            jwt_expiration_hours: 8,
            quickbooks_redirect_uri: None,
            google_drive_redirect_uri: None,
            enable_dev_endpoints: true,  // Default to true for dev
            enable_demo: false,
            integrations_enabled: false,
        }
    }
}

impl Config {
    /// Load configuration from environment variables
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            api_host: env::var("API_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),
            api_port: env::var("API_PORT")
                .unwrap_or_else(|_| "8923".to_string())
                .parse()
                .map_err(|e| format!("Invalid API_PORT: {}", e))?,
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "sqlite:./data/pos.db".to_string()),
            store_id: env::var("STORE_ID").unwrap_or_else(|_| "store-001".to_string()),
            store_name: env::var("STORE_NAME").unwrap_or_else(|_| "Main Store".to_string()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "your-secret-key-change-in-production".to_string()),
            jwt_expiration_hours: env::var("JWT_EXPIRATION_HOURS")
                .unwrap_or_else(|_| "8".to_string())
                .parse()
                .unwrap_or(8),
            quickbooks_redirect_uri: env::var("QUICKBOOKS_REDIRECT_URI").ok(),
            google_drive_redirect_uri: env::var("GOOGLE_DRIVE_REDIRECT_URI").ok(),
            enable_dev_endpoints: env::var("ENABLE_DEV_ENDPOINTS")
                .unwrap_or_else(|_| "true".to_string())
                .parse()
                .unwrap_or(true),
            enable_demo: env::var("ENABLE_DEMO")
                .unwrap_or_else(|_| "false".to_string())
                .parse()
                .unwrap_or(false),
            integrations_enabled: env::var("INTEGRATIONS_ENABLED")
                .unwrap_or_else(|_| "false".to_string())
                .parse()
                .unwrap_or(false),
        })
    }
}
