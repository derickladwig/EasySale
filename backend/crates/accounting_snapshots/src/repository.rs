//! Repository for persisting and retrieving accounting snapshots

use chrono::{DateTime, Utc};
use sqlx::Row;
use uuid::Uuid;

use pos_core_storage::DatabasePool;
use crate::errors::{SnapshotError, SnapshotResult};
use crate::snapshot::{AccountingSnapshot, Payment, SnapshotLine};

/// Repository for accounting snapshot database operations
pub struct SnapshotRepository {
    pool: DatabasePool,
}

impl SnapshotRepository {
    /// Create a new snapshot repository
    #[must_use] 
    pub const fn new(pool: DatabasePool) -> Self {
        Self { pool }
    }

    /// Save a new accounting snapshot
    ///
    /// # Errors
    ///
    /// Returns error if snapshot already exists or database operation fails
    pub async fn save(&self, snapshot: &AccountingSnapshot) -> SnapshotResult<()> {
        // Check if snapshot already exists
        let exists = sqlx::query("SELECT COUNT(*) as count FROM accounting_snapshots WHERE transaction_id = ?")
            .bind(snapshot.transaction_id.to_string())
            .fetch_one(&self.pool)
            .await?;
        
        let count: i64 = exists.try_get("count")?;
        if count > 0 {
            return Err(SnapshotError::AlreadyExists(snapshot.transaction_id.to_string()));
        }

        // Insert snapshot
        sqlx::query(
            "INSERT INTO accounting_snapshots (id, transaction_id, created_at, finalized_at, subtotal, tax, discount, total)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(snapshot.id.to_string())
        .bind(snapshot.transaction_id.to_string())
        .bind(snapshot.created_at.to_rfc3339())
        .bind(snapshot.finalized_at.to_rfc3339())
        .bind(snapshot.subtotal.to_string())
        .bind(snapshot.tax.to_string())
        .bind(snapshot.discount.to_string())
        .bind(snapshot.total.to_string())
        .execute(&self.pool)
        .await?;

        // Insert lines
        for line in &snapshot.lines {
            sqlx::query(
                "INSERT INTO snapshot_lines (id, snapshot_id, product_id, description, quantity, unit_price, line_total, tax_amount)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(Uuid::new_v4().to_string())
            .bind(snapshot.id.to_string())
            .bind(&line.product_id)
            .bind(&line.description)
            .bind(line.quantity.to_string())
            .bind(line.unit_price.to_string())
            .bind(line.line_total.to_string())
            .bind(line.tax_amount.to_string())
            .execute(&self.pool)
            .await?;
        }

        // Insert payments
        for payment in &snapshot.payments {
            sqlx::query(
                "INSERT INTO snapshot_payments (id, snapshot_id, method, amount)
                 VALUES (?, ?, ?, ?)"
            )
            .bind(Uuid::new_v4().to_string())
            .bind(snapshot.id.to_string())
            .bind(&payment.method)
            .bind(payment.amount.to_string())
            .execute(&self.pool)
            .await?;
        }

        Ok(())
    }

    /// Find snapshot by transaction ID
    pub async fn find_by_transaction_id(&self, transaction_id: Uuid) -> SnapshotResult<AccountingSnapshot> {
        let row = sqlx::query("SELECT * FROM accounting_snapshots WHERE transaction_id = ?")
            .bind(transaction_id.to_string())
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| SnapshotError::NotFound(transaction_id.to_string()))?;

        self.row_to_snapshot(row).await
    }

    /// Find snapshot by ID
    pub async fn find_by_id(&self, id: Uuid) -> SnapshotResult<AccountingSnapshot> {
        let row = sqlx::query("SELECT * FROM accounting_snapshots WHERE id = ?")
            .bind(id.to_string())
            .fetch_optional(&self.pool)
            .await?
            .ok_or_else(|| SnapshotError::NotFound(id.to_string()))?;

        self.row_to_snapshot(row).await
    }

    /// Attempt to update a snapshot (will fail due to trigger)
    pub async fn update(&self, _snapshot: &AccountingSnapshot) -> SnapshotResult<()> {
        Err(SnapshotError::Immutable)
    }

    /// Attempt to delete a snapshot (will fail due to trigger)
    pub async fn delete(&self, _id: Uuid) -> SnapshotResult<()> {
        Err(SnapshotError::Immutable)
    }

    async fn row_to_snapshot(&self, row: sqlx::sqlite::SqliteRow) -> SnapshotResult<AccountingSnapshot> {
        let id_str: String = row.try_get("id")?;
        let id = Uuid::parse_str(&id_str)
            .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?;

        let transaction_id_str: String = row.try_get("transaction_id")?;
        let transaction_id = Uuid::parse_str(&transaction_id_str)
            .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?;

        let created_at_str: String = row.try_get("created_at")?;
        let _created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?
            .with_timezone(&Utc);

        let finalized_at_str: String = row.try_get("finalized_at")?;
        let finalized_at = DateTime::parse_from_rfc3339(&finalized_at_str)
            .map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?
            .with_timezone(&Utc);

        let subtotal_str: String = row.try_get("subtotal")?;
        let tax_str: String = row.try_get("tax")?;
        let discount_str: String = row.try_get("discount")?;
        let total_str: String = row.try_get("total")?;

        // Load lines
        let lines = self.load_lines(id).await?;

        // Load payments
        let payments = self.load_payments(id).await?;

        Ok(AccountingSnapshot::with_id(
            id,
            transaction_id,
            finalized_at,
            subtotal_str.parse().map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            tax_str.parse().map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            discount_str.parse().map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            total_str.parse().map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            payments,
            lines,
        ))
    }

    async fn load_lines(&self, snapshot_id: Uuid) -> SnapshotResult<Vec<SnapshotLine>> {
        let rows = sqlx::query("SELECT * FROM snapshot_lines WHERE snapshot_id = ?")
            .bind(snapshot_id.to_string())
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
                quantity_str.parse().map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
                unit_price_str.parse().map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
                line_total_str.parse().map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
                tax_amount_str.parse().map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            ));
        }

        Ok(lines)
    }

    async fn load_payments(&self, snapshot_id: Uuid) -> SnapshotResult<Vec<Payment>> {
        let rows = sqlx::query("SELECT * FROM snapshot_payments WHERE snapshot_id = ?")
            .bind(snapshot_id.to_string())
            .fetch_all(&self.pool)
            .await?;

        let mut payments = Vec::new();
        for row in rows {
            let method: String = row.try_get("method")?;
            let amount_str: String = row.try_get("amount")?;

            payments.push(Payment {
                method,
                amount: amount_str.parse().map_err(|e| SnapshotError::Database(sqlx::Error::Decode(Box::new(e))))?,
            });
        }

        Ok(payments)
    }
}
