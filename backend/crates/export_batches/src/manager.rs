//! Batch manager trait

use chrono::{DateTime, Utc};
use uuid::Uuid;

use crate::batch::ExportBatch;
use crate::errors::BatchResult;

/// Batch manager trait
#[async_trait::async_trait]
pub trait BatchManager {
    /// Create a new export batch for the given date range
    /// 
    /// This collects all snapshots within the date range that haven't been
    /// included in completed batches.
    async fn create_batch(
        &self,
        created_by: Uuid,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> BatchResult<ExportBatch>;
    
    /// Get batch by ID
    async fn get_batch(&self, batch_id: Uuid) -> BatchResult<ExportBatch>;
    
    /// Mark batch as completed
    async fn mark_completed(&self, batch_id: Uuid) -> BatchResult<()>;
    
    /// Mark batch as failed
    async fn mark_failed(&self, batch_id: Uuid, error: String) -> BatchResult<()>;
    
    /// Reset batch to pending (for retry)
    async fn reset_batch(&self, batch_id: Uuid) -> BatchResult<()>;
    
    /// Get snapshot IDs for a batch
    async fn get_batch_snapshots(&self, batch_id: Uuid) -> BatchResult<Vec<Uuid>>;
}
