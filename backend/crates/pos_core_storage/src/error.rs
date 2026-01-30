//! Storage error types

use thiserror::Error;

/// Storage layer errors
#[derive(Debug, Error)]
pub enum StorageError {
    /// Database connection error
    #[error("Database connection error: {0}")]
    ConnectionError(String),

    /// Database query error
    #[error("Database query error: {0}")]
    QueryError(String),

    /// Entity not found
    #[error("Entity not found: {0}")]
    NotFound(String),

    /// Constraint violation (e.g., unique constraint, foreign key)
    #[error("Constraint violation: {0}")]
    ConstraintViolation(String),

    /// Serialization/deserialization error
    #[error("Serialization error: {0}")]
    SerializationError(String),

    /// Invalid state (e.g., trying to modify immutable data)
    #[error("Invalid state: {0}")]
    InvalidState(String),

    /// Configuration error
    #[error("Configuration error: {0}")]
    ConfigurationError(String),
}

/// Result type for storage operations
pub type StorageResult<T> = Result<T, StorageError>;

/// Convert sqlx errors to storage errors
impl From<sqlx::Error> for StorageError {
    fn from(err: sqlx::Error) -> Self {
        match err {
            sqlx::Error::RowNotFound => {
                Self::NotFound("Row not found".to_string())
            }
            sqlx::Error::Database(db_err) => {
                // Check for constraint violations
                let message = db_err.message();
                if message.contains("UNIQUE") || message.contains("unique") {
                    Self::ConstraintViolation(message.to_string())
                } else if message.contains("FOREIGN KEY") || message.contains("foreign key") {
                    Self::ConstraintViolation(message.to_string())
                } else {
                    Self::QueryError(message.to_string())
                }
            }
            sqlx::Error::PoolTimedOut => {
                Self::ConnectionError("Connection pool timed out".to_string())
            }
            sqlx::Error::PoolClosed => {
                Self::ConnectionError("Connection pool closed".to_string())
            }
            _ => Self::QueryError(err.to_string()),
        }
    }
}

/// Convert `serde_json` errors to storage errors
impl From<serde_json::Error> for StorageError {
    fn from(err: serde_json::Error) -> Self {
        Self::SerializationError(err.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_display() {
        let err = StorageError::NotFound("Transaction".to_string());
        assert_eq!(err.to_string(), "Entity not found: Transaction");

        let err = StorageError::QueryError("Invalid SQL".to_string());
        assert_eq!(err.to_string(), "Database query error: Invalid SQL");
    }

    #[test]
    fn test_sqlx_error_conversion() {
        let err = sqlx::Error::RowNotFound;
        let storage_err: StorageError = err.into();
        assert!(matches!(storage_err, StorageError::NotFound(_)));
    }
}
