//! Export batch errors

use thiserror::Error;

/// Batch error type
#[derive(Debug, Error)]
pub enum BatchError {
    /// Database error
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    /// Batch not found
    #[error("Batch not found: {0}")]
    NotFound(String),
    
    /// Invalid date range
    #[error("Invalid date range: {0}")]
    InvalidDateRange(String),
    
    /// Batch already completed
    #[error("Batch already completed: {0}")]
    AlreadyCompleted(String),
    
    /// Configuration error
    #[error("Configuration error: {0}")]
    ConfigError(String),
}

/// Batch result type
pub type BatchResult<T> = Result<T, BatchError>;
