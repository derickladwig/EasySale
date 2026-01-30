use std::fmt;

/// Configuration error types
#[derive(Debug, Clone)]
pub enum ConfigError {
    /// Configuration file not found
    NotFound(String),
    
    /// Failed to read configuration file
    ReadError(String),
    
    /// Failed to parse configuration JSON
    ParseError(String),
    
    /// Configuration validation failed
    ValidationError(String),
    
    /// Configuration schema is invalid
    SchemaError(String),
    
    /// Tenant not found
    TenantNotFound(String),
}

impl fmt::Display for ConfigError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ConfigError::NotFound(path) => write!(f, "Configuration file not found: {}", path),
            ConfigError::ReadError(msg) => write!(f, "Failed to read configuration: {}", msg),
            ConfigError::ParseError(msg) => write!(f, "Failed to parse configuration: {}", msg),
            ConfigError::ValidationError(msg) => write!(f, "Configuration validation failed: {}", msg),
            ConfigError::SchemaError(msg) => write!(f, "Configuration schema error: {}", msg),
            ConfigError::TenantNotFound(id) => write!(f, "Tenant not found: {}", id),
        }
    }
}

impl std::error::Error for ConfigError {}

/// Convert IO errors to ConfigError
pub fn io_error_to_config_error(err: std::io::Error) -> ConfigError {
    ConfigError::ReadError(err.to_string())
}

/// Convert JSON errors to ConfigError
pub fn json_error_to_config_error(err: serde_json::Error) -> ConfigError {
    ConfigError::ParseError(err.to_string())
}

/// Result type for configuration operations
pub type ConfigResult<T> = Result<T, ConfigError>;
