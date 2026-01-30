//! Error types for accounting snapshots

use thiserror::Error;

/// Result type for snapshot operations
pub type SnapshotResult<T> = Result<T, SnapshotError>;

/// Errors that can occur during snapshot operations
#[derive(Debug, Error)]
pub enum SnapshotError {
    /// Snapshot already exists for this transaction
    #[error("Snapshot already exists for transaction {0}")]
    AlreadyExists(String),

    /// Snapshot not found
    #[error("Snapshot not found: {0}")]
    NotFound(String),

    /// Attempt to modify an immutable snapshot
    #[error("Cannot modify immutable snapshot")]
    Immutable,

    /// Snapshot data is inconsistent
    #[error("Snapshot data is inconsistent: {0}")]
    InconsistentData(String),

    /// Transaction is not in a valid state for snapshot creation
    #[error("Invalid transaction state: {0}")]
    InvalidTransactionState(String),

    /// Database error
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    /// Domain error from `pos_core`
    #[error("Domain error: {0}")]
    Domain(String),

    /// Serialization error
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}
