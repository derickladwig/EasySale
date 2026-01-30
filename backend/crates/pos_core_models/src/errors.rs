//! Domain-level error types

use thiserror::Error;

/// Domain-level errors for POS core operations
#[derive(Debug, Error)]
pub enum DomainError {
    /// Invalid transaction state for the requested operation
    #[error("Invalid transaction state: {0}")]
    InvalidState(String),

    /// Calculation error (e.g., negative values where not allowed)
    #[error("Calculation error: {0}")]
    CalculationError(String),

    /// Validation error (e.g., totals don't match)
    #[error("Validation error: {0}")]
    ValidationError(String),

    /// Missing required data
    #[error("Missing required data: {0}")]
    MissingData(String),

    /// Invalid input
    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

/// Result type for domain operations
pub type DomainResult<T> = Result<T, DomainError>;
