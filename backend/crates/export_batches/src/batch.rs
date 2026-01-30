//! Export batch types

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Export batch
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportBatch {
    /// Batch ID
    pub id: Uuid,
    
    /// Creation timestamp
    pub created_at: DateTime<Utc>,
    
    /// User who created the batch
    pub created_by: Uuid,
    
    /// Start date of the batch range
    pub start_date: DateTime<Utc>,
    
    /// End date of the batch range
    pub end_date: DateTime<Utc>,
    
    /// Batch status
    pub status: BatchStatus,
    
    /// Number of snapshots in the batch
    pub snapshot_count: i32,
    
    /// Configuration hash (for idempotency)
    pub config_hash: String,
    
    /// Error message (if status is Failed)
    pub error_message: Option<String>,
}

/// Batch status
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum BatchStatus {
    /// Batch is pending export
    Pending,
    
    /// Batch export completed successfully
    Completed,
    
    /// Batch export failed
    Failed,
}

impl ExportBatch {
    /// Create a new export batch
    #[must_use] 
    pub fn new(
        created_by: Uuid,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
        snapshot_count: i32,
        config_hash: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            created_at: Utc::now(),
            created_by,
            start_date,
            end_date,
            status: BatchStatus::Pending,
            snapshot_count,
            config_hash,
            error_message: None,
        }
    }
    
    /// Create batch with specific ID (for loading from database)
    #[must_use] 
    pub const fn with_id(
        id: Uuid,
        created_at: DateTime<Utc>,
        created_by: Uuid,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
        status: BatchStatus,
        snapshot_count: i32,
        config_hash: String,
        error_message: Option<String>,
    ) -> Self {
        Self {
            id,
            created_at,
            created_by,
            start_date,
            end_date,
            status,
            snapshot_count,
            config_hash,
            error_message,
        }
    }
    
    /// Mark batch as completed
    pub fn mark_completed(&mut self) {
        self.status = BatchStatus::Completed;
        self.error_message = None;
    }
    
    /// Mark batch as failed
    pub fn mark_failed(&mut self, error: String) {
        self.status = BatchStatus::Failed;
        self.error_message = Some(error);
    }
    
    /// Reset batch to pending (for retry)
    pub fn reset(&mut self) {
        self.status = BatchStatus::Pending;
        self.error_message = None;
    }
}

impl BatchStatus {
    /// Convert string to batch status
    #[must_use] 
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "completed" => Some(Self::Completed),
            "failed" => Some(Self::Failed),
            _ => None,
        }
    }
    
    /// Convert batch status to string
    #[must_use] 
    pub const fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::Completed => "completed",
            Self::Failed => "failed",
        }
    }
}
