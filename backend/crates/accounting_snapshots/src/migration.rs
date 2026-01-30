//! Historical snapshot migration
//!
//! This module provides functionality to create accounting snapshots for
//! existing finalized transactions that don't have snapshots yet.

use chrono::Utc;
use sqlx::Row;
use uuid::Uuid;
use rust_decimal::Decimal;

use pos_core_storage::DatabasePool;
use crate::snapshot::{AccountingSnapshot, SnapshotLine, Payment};
use crate::repository::SnapshotRepository;
use crate::errors::{SnapshotError, SnapshotResult};

/// Migration statistics
#[derive(Debug, Clone)]
pub struct MigrationStats {
    /// Total finalized transactions found
    pub total_transactions: usize,
    
    /// Transactions that already have snapshots
    pub existing_snapshots: usize,
    
    /// Snapshots successfully created
    pub created_snapshots: usize,
    
    /// Transactions that failed migration
    pub failed_transactions: usize,
    
    /// List of failed transaction IDs
    pub failed_ids: Vec<String>,
}

impl MigrationStats {
    const fn new() -> Self {
        Self {
            total_transactions: 0,
            existing_snapshots: 0,
            created_snapshots: 0,
            failed_transactions: 0,
            failed_ids: Vec::new(),
        }
    }
}

/// Migration job for creating snapshots from historical transactions
pub struct MigrationJob {
    pool: DatabasePool,
    repository: SnapshotRepository,
}

impl MigrationJob {
    /// Create a new migration job
    #[must_use] 
    pub fn new(pool: DatabasePool) -> Self {
        let repository = SnapshotRepository::new(pool.clone());
        Self { pool, repository }
    }
    
    /// Run the migration
    /// 
    /// This finds all finalized transactions without snapshots and creates
    /// snapshots for them using current `POS_Core` logic.
    pub async fn run(&self) -> SnapshotResult<MigrationStats> {
        let mut stats = MigrationStats::new();
        
        tracing::info!("Starting snapshot migration");
        
        // Find all finalized transactions
        let transactions = self.find_finalized_transactions().await?;
        stats.total_transactions = transactions.len();
        
        tracing::info!("Found {} finalized transactions", stats.total_transactions);
        
        // Process each transaction
        for transaction_id in transactions {
            // Check if snapshot already exists
            if self.snapshot_exists(&transaction_id).await? {
                stats.existing_snapshots += 1;
                continue;
            }
            
            // Create snapshot
            match self.create_snapshot_for_transaction(&transaction_id).await {
                Ok(()) => {
                    stats.created_snapshots += 1;
                    if stats.created_snapshots.is_multiple_of(100) {
                        tracing::info!("Created {} snapshots", stats.created_snapshots);
                    }
                }
                Err(e) => {
                    stats.failed_transactions += 1;
                    stats.failed_ids.push(transaction_id.to_string());
                    tracing::error!(
                        "Failed to create snapshot for transaction {}: {}",
                        transaction_id,
                        e
                    );
                }
            }
        }
        
        tracing::info!(
            "Migration complete: {} total, {} existing, {} created, {} failed",
            stats.total_transactions,
            stats.existing_snapshots,
            stats.created_snapshots,
            stats.failed_transactions
        );
        
        Ok(stats)
    }
    
    /// Find all finalized transactions
    async fn find_finalized_transactions(&self) -> SnapshotResult<Vec<Uuid>> {
        let rows = sqlx::query(
            r"
            SELECT id
            FROM transactions
            WHERE status = 'finalized'
            ORDER BY finalized_at
            "
        )
        .fetch_all(&self.pool)
        .await?;
        
        let mut transaction_ids = Vec::new();
        for row in rows {
            let id_str: String = row.try_get("id")?;
            let id = Uuid::parse_str(&id_str)
                .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?;
            transaction_ids.push(id);
        }
        
        Ok(transaction_ids)
    }
    
    /// Check if snapshot exists for transaction
    async fn snapshot_exists(&self, transaction_id: &Uuid) -> SnapshotResult<bool> {
        let row = sqlx::query(
            "SELECT COUNT(*) as count FROM accounting_snapshots WHERE transaction_id = ?"
        )
        .bind(transaction_id.to_string())
        .fetch_one(&self.pool)
        .await?;
        
        let count: i64 = row.try_get("count")?;
        Ok(count > 0)
    }
    
    /// Create snapshot for a transaction
    async fn create_snapshot_for_transaction(&self, transaction_id: &Uuid) -> SnapshotResult<()> {
        // Load transaction data
        let transaction = self.load_transaction(transaction_id).await?;
        
        // Create snapshot
        let snapshot = AccountingSnapshot::new(
            *transaction_id,
            transaction.finalized_at,
            transaction.subtotal,
            transaction.tax,
            transaction.discount,
            transaction.total,
            transaction.payments,
            transaction.lines,
        );
        
        // Save snapshot
        self.repository.save(&snapshot).await?;
        
        // Track migration
        self.track_migration(&snapshot.id, transaction_id).await?;
        
        Ok(())
    }
    
    /// Track migrated snapshot for rollback
    async fn track_migration(&self, snapshot_id: &Uuid, transaction_id: &Uuid) -> SnapshotResult<()> {
        let batch_id = Utc::now().format("%Y%m%d_%H%M%S").to_string();
        
        sqlx::query(
            r"
            INSERT INTO migration_snapshots (snapshot_id, transaction_id, migrated_at, migration_batch)
            VALUES (?, ?, ?, ?)
            "
        )
        .bind(snapshot_id.to_string())
        .bind(transaction_id.to_string())
        .bind(Utc::now().to_rfc3339())
        .bind(batch_id)
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }
    
    /// Rollback migration - delete snapshots created by migration
    pub async fn rollback(&self) -> SnapshotResult<usize> {
        tracing::info!("Starting migration rollback");
        
        // Find all migrated snapshots
        let rows = sqlx::query("SELECT snapshot_id FROM migration_snapshots")
            .fetch_all(&self.pool)
            .await?;
        
        let mut deleted = 0;
        for row in rows {
            let snapshot_id_str: String = row.try_get("snapshot_id")?;
            let snapshot_id = Uuid::parse_str(&snapshot_id_str)
                .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?;
            
            // Delete snapshot lines
            sqlx::query("DELETE FROM snapshot_lines WHERE snapshot_id = ?")
                .bind(snapshot_id.to_string())
                .execute(&self.pool)
                .await?;
            
            // Delete snapshot payments
            sqlx::query("DELETE FROM snapshot_payments WHERE snapshot_id = ?")
                .bind(snapshot_id.to_string())
                .execute(&self.pool)
                .await?;
            
            // Delete snapshot
            sqlx::query("DELETE FROM accounting_snapshots WHERE id = ?")
                .bind(snapshot_id.to_string())
                .execute(&self.pool)
                .await?;
            
            deleted += 1;
        }
        
        // Clear migration tracking
        sqlx::query("DELETE FROM migration_snapshots")
            .execute(&self.pool)
            .await?;
        
        tracing::info!("Rollback complete: deleted {} snapshots", deleted);
        
        Ok(deleted)
    }
    
    /// Load transaction data
    async fn load_transaction(&self, transaction_id: &Uuid) -> SnapshotResult<TransactionData> {
        // Load transaction
        let row = sqlx::query(
            r"
            SELECT finalized_at, subtotal, tax, discount, total
            FROM transactions
            WHERE id = ?
            "
        )
        .bind(transaction_id.to_string())
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| SnapshotError::NotFound(transaction_id.to_string()))?;
        
        let finalized_at_str: String = row.try_get("finalized_at")?;
        let finalized_at = chrono::DateTime::parse_from_rfc3339(&finalized_at_str)
            .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?
            .with_timezone(&Utc);
        
        let subtotal_str: String = row.try_get("subtotal")?;
        let tax_str: String = row.try_get("tax")?;
        let discount_str: String = row.try_get("discount")?;
        let total_str: String = row.try_get("total")?;
        
        // Load lines
        let lines = self.load_transaction_lines(transaction_id).await?;
        
        // Load payments
        let payments = self.load_transaction_payments(transaction_id).await?;
        
        Ok(TransactionData {
            finalized_at,
            subtotal: subtotal_str.parse()
                .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            tax: tax_str.parse()
                .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            discount: discount_str.parse()
                .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            total: total_str.parse()
                .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            lines,
            payments,
        })
    }
    
    /// Load transaction lines
    async fn load_transaction_lines(&self, transaction_id: &Uuid) -> SnapshotResult<Vec<SnapshotLine>> {
        let rows = sqlx::query(
            r"
            SELECT product_id, description, quantity, unit_price, line_total, tax_amount
            FROM transaction_lines
            WHERE transaction_id = ?
            "
        )
        .bind(transaction_id.to_string())
        .fetch_all(&self.pool)
        .await?;
        
        let mut lines = Vec::new();
        for row in rows {
            let product_id: String = row.try_get("product_id")?;
            let description: String = row.try_get("description")?;
            let quantity_str: String = row.try_get("quantity")?;
            let unit_price_str: String = row.try_get("unit_price")?;
            let line_total_str: String = row.try_get("line_total")?;
            let tax_amount_str: String = row.try_get("tax_amount")?;
            
            lines.push(SnapshotLine::new(
                product_id,
                description,
                quantity_str.parse()
                    .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
                unit_price_str.parse()
                    .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
                line_total_str.parse()
                    .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
                tax_amount_str.parse()
                    .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            ));
        }
        
        Ok(lines)
    }
    
    /// Load transaction payments
    async fn load_transaction_payments(&self, transaction_id: &Uuid) -> SnapshotResult<Vec<Payment>> {
        let rows = sqlx::query(
            r"
            SELECT method, amount
            FROM transaction_payments
            WHERE transaction_id = ?
            "
        )
        .bind(transaction_id.to_string())
        .fetch_all(&self.pool)
        .await?;
        
        let mut payments = Vec::new();
        for row in rows {
            let method: String = row.try_get("method")?;
            let amount_str: String = row.try_get("amount")?;
            
            payments.push(Payment {
                method,
                amount: amount_str.parse()
                    .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            });
        }
        
        Ok(payments)
    }
    
    /// Verify migration completeness
    pub async fn verify(&self) -> SnapshotResult<VerificationResult> {
        let finalized_count = self.count_finalized_transactions().await?;
        let snapshot_count = self.count_snapshots().await?;
        let missing = self.find_transactions_without_snapshots().await?;
        
        Ok(VerificationResult {
            finalized_transactions: finalized_count,
            snapshots: snapshot_count,
            missing_snapshots: missing.len(),
            missing_transaction_ids: missing,
        })
    }
    
    async fn count_finalized_transactions(&self) -> SnapshotResult<usize> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM transactions WHERE status = 'finalized'")
            .fetch_one(&self.pool)
            .await?;
        
        let count: i64 = row.try_get("count")?;
        Ok(count as usize)
    }
    
    async fn count_snapshots(&self) -> SnapshotResult<usize> {
        let row = sqlx::query("SELECT COUNT(*) as count FROM accounting_snapshots")
            .fetch_one(&self.pool)
            .await?;
        
        let count: i64 = row.try_get("count")?;
        Ok(count as usize)
    }
    
    async fn find_transactions_without_snapshots(&self) -> SnapshotResult<Vec<String>> {
        let rows = sqlx::query(
            r"
            SELECT t.id
            FROM transactions t
            LEFT JOIN accounting_snapshots s ON t.id = s.transaction_id
            WHERE t.status = 'finalized' AND s.id IS NULL
            "
        )
        .fetch_all(&self.pool)
        .await?;
        
        let mut missing = Vec::new();
        for row in rows {
            let id: String = row.try_get("id")?;
            missing.push(id);
        }
        
        Ok(missing)
    }
}

/// Transaction data for migration
struct TransactionData {
    finalized_at: chrono::DateTime<Utc>,
    subtotal: Decimal,
    tax: Decimal,
    discount: Decimal,
    total: Decimal,
    lines: Vec<SnapshotLine>,
    payments: Vec<Payment>,
}

/// Verification result
#[derive(Debug, Clone)]
pub struct VerificationResult {
    /// Number of finalized transactions
    pub finalized_transactions: usize,
    
    /// Number of snapshots
    pub snapshots: usize,
    
    /// Number of missing snapshots
    pub missing_snapshots: usize,
    
    /// IDs of transactions without snapshots
    pub missing_transaction_ids: Vec<String>,
}
