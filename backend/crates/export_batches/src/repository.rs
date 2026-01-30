//! Repository for persisting and retrieving export batches

use chrono::{DateTime, Utc};
use sqlx::Row;
use uuid::Uuid;
use sha2::{Sha256, Digest};

use pos_core_storage::DatabasePool;
use crate::batch::{ExportBatch, BatchStatus};
use crate::errors::{BatchError, BatchResult};
use crate::manager::BatchManager;

/// Repository for export batch database operations
pub struct BatchRepository {
    pool: DatabasePool,
}

impl BatchRepository {
    /// Create a new batch repository
    #[must_use] 
    pub const fn new(pool: DatabasePool) -> Self {
        Self { pool }
    }
    
    /// Calculate configuration hash for idempotency
    fn calculate_config_hash(start_date: &DateTime<Utc>, end_date: &DateTime<Utc>) -> String {
        let mut hasher = Sha256::new();
        hasher.update(start_date.to_rfc3339().as_bytes());
        hasher.update(end_date.to_rfc3339().as_bytes());
        format!("{:x}", hasher.finalize())
    }
    
    /// Get snapshots that haven't been included in completed batches
    async fn get_eligible_snapshots(
        &self,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> BatchResult<Vec<Uuid>> {
        let rows = sqlx::query(
            r"
            SELECT DISTINCT s.id
            FROM accounting_snapshots s
            WHERE s.finalized_at >= ? AND s.finalized_at <= ?
            AND s.id NOT IN (
                SELECT bs.snapshot_id
                FROM batch_snapshots bs
                JOIN export_batches eb ON bs.batch_id = eb.id
                WHERE eb.status = 'completed'
            )
            ORDER BY s.finalized_at
            "
        )
        .bind(start_date.to_rfc3339())
        .bind(end_date.to_rfc3339())
        .fetch_all(&self.pool)
        .await?;
        
        let mut snapshot_ids = Vec::new();
        for row in rows {
            let id_str: String = row.try_get("id")?;
            let id = Uuid::parse_str(&id_str)
                .map_err(|e| BatchError::Database(sqlx::Error::Decode(Box::new(e))))?;
            snapshot_ids.push(id);
        }
        
        Ok(snapshot_ids)
    }
    
    /// Save a new export batch
    async fn save(&self, batch: &ExportBatch) -> BatchResult<()> {
        sqlx::query(
            r"
            INSERT INTO export_batches (
                id, created_at, created_by, start_date, end_date,
                status, snapshot_count, config_hash, error_message
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            "
        )
        .bind(batch.id.to_string())
        .bind(batch.created_at.to_rfc3339())
        .bind(batch.created_by.to_string())
        .bind(batch.start_date.to_rfc3339())
        .bind(batch.end_date.to_rfc3339())
        .bind(batch.status.as_str())
        .bind(batch.snapshot_count)
        .bind(&batch.config_hash)
        .bind(&batch.error_message)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    /// Link snapshots to a batch
    async fn link_snapshots(&self, batch_id: Uuid, snapshot_ids: &[Uuid]) -> BatchResult<()> {
        let now = Utc::now().to_rfc3339();
        
        for snapshot_id in snapshot_ids {
            sqlx::query(
                r"
                INSERT INTO batch_snapshots (batch_id, snapshot_id, included_at)
                VALUES (?, ?, ?)
                "
            )
            .bind(batch_id.to_string())
            .bind(snapshot_id.to_string())
            .bind(&now)
            .execute(&self.pool)
            .await?;
        }
        
        Ok(())
    }
    
    /// Find batch by ID
    async fn find_by_id(&self, id: Uuid) -> BatchResult<ExportBatch> {
        let row = sqlx::query("SELECT * FROM export_batches WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| BatchError::NotFound(id.to_string()))?;
        
        Self::row_to_batch(row)
    }
    
    /// Update batch status
    async fn update_status(&self, id: Uuid, status: BatchStatus, error_message: Option<String>) -> BatchResult<()> {
        sqlx::query(
            r"
            UPDATE export_batches
            SET status = ?, error_message = ?
            WHERE id = ?
            "
        )
        .bind(status.as_str())
        .bind(&error_message)
        .bind(id.to_string())
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    fn row_to_batch(row: sqlx::sqlite::SqliteRow) -> BatchResult<ExportBatch> {
        let id_str: String = row.try_get("id")?;
        let id = Uuid::parse_str(&id_str)
            .map_err(|e| BatchError::Database(sqlx::Error::Decode(Box::new(e))))?;
        
        let created_by_str: String = row.try_get("created_by")?;
        let created_by = Uuid::parse_str(&created_by_str)
            .map_err(|e| BatchError::Database(sqlx::Error::Decode(Box::new(e))))?;
        
        let created_at_str: String = row.try_get("created_at")?;
        let created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map_err(|e| BatchError::Database(sqlx::Error::Decode(Box::new(e))))?
            .with_timezone(&Utc);
        
        let start_date_str: String = row.try_get("start_date")?;
        let start_date = DateTime::parse_from_rfc3339(&start_date_str)
            .map_err(|e| BatchError::Database(sqlx::Error::Decode(Box::new(e))))?
            .with_timezone(&Utc);
        
        let end_date_str: String = row.try_get("end_date")?;
        let end_date = DateTime::parse_from_rfc3339(&end_date_str)
            .map_err(|e| BatchError::Database(sqlx::Error::Decode(Box::new(e))))?
            .with_timezone(&Utc);
        
        let status_str: String = row.try_get("status")?;
        let status = BatchStatus::from_str(&status_str)
            .ok_or_else(|| BatchError::ConfigError(format!("Invalid status: {status_str}")))?;
        
        let snapshot_count: i32 = row.try_get("snapshot_count")?;
        let config_hash: String = row.try_get("config_hash")?;
        let error_message: Option<String> = row.try_get("error_message")?;
        
        Ok(ExportBatch::with_id(
            id,
            created_at,
            created_by,
            start_date,
            end_date,
            status,
            snapshot_count,
            config_hash,
            error_message,
        ))
    }
}

#[async_trait::async_trait]
impl BatchManager for BatchRepository {
    async fn create_batch(
        &self,
        created_by: Uuid,
        start_date: DateTime<Utc>,
        end_date: DateTime<Utc>,
    ) -> BatchResult<ExportBatch> {
        // Validate date range
        if start_date > end_date {
            return Err(BatchError::InvalidDateRange(
                format!("Start date {start_date} is after end date {end_date}")
            ));
        }
        
        // Get eligible snapshots (excluding those in completed batches)
        let snapshot_ids = self.get_eligible_snapshots(start_date, end_date).await?;
        
        // Calculate config hash for idempotency
        let config_hash = Self::calculate_config_hash(&start_date, &end_date);
        
        // Create batch
        let batch = ExportBatch::new(
            created_by,
            start_date,
            end_date,
            snapshot_ids.len() as i32,
            config_hash,
        );
        
        // Save batch
        self.save(&batch).await?;
        
        // Link snapshots to batch
        self.link_snapshots(batch.id, &snapshot_ids).await?;
        
        Ok(batch)
    }
    
    async fn get_batch(&self, batch_id: Uuid) -> BatchResult<ExportBatch> {
        self.find_by_id(batch_id).await
    }
    
    async fn mark_completed(&self, batch_id: Uuid) -> BatchResult<()> {
        let batch = self.find_by_id(batch_id).await?;
        
        if batch.status == BatchStatus::Completed {
            return Err(BatchError::AlreadyCompleted(batch_id.to_string()));
        }
        
        self.update_status(batch_id, BatchStatus::Completed, None).await
    }
    
    async fn mark_failed(&self, batch_id: Uuid, error: String) -> BatchResult<()> {
        self.update_status(batch_id, BatchStatus::Failed, Some(error)).await
    }
    
    async fn reset_batch(&self, batch_id: Uuid) -> BatchResult<()> {
        self.update_status(batch_id, BatchStatus::Pending, None).await
    }
    
    async fn get_batch_snapshots(&self, batch_id: Uuid) -> BatchResult<Vec<Uuid>> {
        let rows = sqlx::query(
            r"
            SELECT snapshot_id
            FROM batch_snapshots
            WHERE batch_id = ?
            ORDER BY included_at
            "
        )
        .bind(batch_id.to_string())
        .fetch_all(&self.pool)
        .await?;
        
        let mut snapshot_ids = Vec::new();
        for row in rows {
            let id_str: String = row.try_get("snapshot_id")?;
            let id = Uuid::parse_str(&id_str)
                .map_err(|e| BatchError::Database(sqlx::Error::Decode(Box::new(e))))?;
            snapshot_ids.push(id);
        }
        
        Ok(snapshot_ids)
    }
}
