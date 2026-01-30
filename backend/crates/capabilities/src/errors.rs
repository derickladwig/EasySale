//! Capability errors

use thiserror::Error;

/// Capability error type
#[derive(Debug, Error)]
pub enum CapabilityError {
    /// Healthcheck failed
    #[error("Healthcheck failed: {0}")]
    HealthcheckFailed(String),
    
    /// Configuration error
    #[error("Configuration error: {0}")]
    ConfigError(String),
}

/// Capability result type
pub type CapabilityResult<T> = Result<T, CapabilityError>;
