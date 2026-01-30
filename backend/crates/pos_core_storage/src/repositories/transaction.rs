//! Transaction repository for database operations

use chrono::{DateTime, Utc};
use sqlx::Row;
use uuid::Uuid;

use pos_core_models::{Transaction, TransactionStatus, Payment, LineItem};
use crate::error::{StorageError, StorageResult};
use crate::connection::DatabasePool;
use crate::query_builder::{SelectQueryBuilder, InsertQueryBuilder, UpdateQueryBuilder};

/// Repository for transaction database operations
pub struct TransactionRepository {
    pool: DatabasePool,
}

impl TransactionRepository {
    /// Create a new transaction repository
    #[must_use] 
    pub const fn new(pool: DatabasePool) -> Self {
        Self { pool }
    }

    /// Find a transaction by ID
    ///
    /// # Errors
    ///
    /// Returns `StorageError::NotFound` if the transaction doesn't exist
    /// Returns `StorageError::QueryError` for database errors
    pub async fn find_by_id(&self, id: Uuid) -> StorageResult<Transaction> {
        let query = SelectQueryBuilder::new("transactions")
            .where_clause("id = ?")
            .build();

        let row = sqlx::query(&query)
            .bind(id.to_string())
            .fetch_one(&self.pool)
            .await?;

        self.row_to_transaction(row).await
    }

    /// Find all transactions with a specific status
    pub async fn find_by_status(&self, status: TransactionStatus) -> StorageResult<Vec<Transaction>> {
        let status_str = match status {
            TransactionStatus::Draft => "draft",
            TransactionStatus::Finalized => "finalized",
            TransactionStatus::Voided => "voided",
        };

        let query = SelectQueryBuilder::new("transactions")
            .where_clause("status = ?")
            .order_by("created_at", false)
            .build();

        let rows = sqlx::query(&query)
            .bind(status_str)
            .fetch_all(&self.pool)
            .await?;

        let mut transactions = Vec::new();
        for row in rows {
            transactions.push(self.row_to_transaction(row).await?);
        }

        Ok(transactions)
    }

    /// Find transactions within a date range
    pub async fn find_by_date_range(
        &self,
        start: DateTime<Utc>,
        end: DateTime<Utc>,
    ) -> StorageResult<Vec<Transaction>> {
        let query = SelectQueryBuilder::new("transactions")
            .where_clause("created_at >= ?")
            .where_clause("created_at <= ?")
            .order_by("created_at", false)
            .build();

        let rows = sqlx::query(&query)
            .bind(start.to_rfc3339())
            .bind(end.to_rfc3339())
            .fetch_all(&self.pool)
            .await?;

        let mut transactions = Vec::new();
        for row in rows {
            transactions.push(self.row_to_transaction(row).await?);
        }

        Ok(transactions)
    }

    /// Save a new transaction
    ///
    /// # Errors
    ///
    /// Returns `StorageError::ConstraintViolation` if a transaction with the same ID exists
    /// Returns `StorageError::QueryError` for database errors
    pub async fn save(&self, transaction: &Transaction) -> StorageResult<()> {
        let query = InsertQueryBuilder::new("transactions")
            .column("id")
            .column("subtotal")
            .column("tax")
            .column("discount_total")
            .column("total")
            .column("status")
            .column("created_at")
            .column("finalized_at")
            .build();

        let status_str = match transaction.status {
            TransactionStatus::Draft => "draft",
            TransactionStatus::Finalized => "finalized",
            TransactionStatus::Voided => "voided",
        };

        sqlx::query(&query)
            .bind(transaction.id.to_string())
            .bind(transaction.subtotal.to_string())
            .bind(transaction.tax.to_string())
            .bind(transaction.discount_total.to_string())
            .bind(transaction.total.to_string())
            .bind(status_str)
            .bind(transaction.created_at.to_rfc3339())
            .bind(transaction.finalized_at.map(|dt| dt.to_rfc3339()))
            .execute(&self.pool)
            .await?;

        // Save line items
        self.save_line_items(transaction.id, &transaction.items).await?;

        // Save payments
        self.save_payments(transaction.id, &transaction.payments).await?;

        Ok(())
    }

    /// Update an existing transaction
    ///
    /// # Errors
    ///
    /// Returns `StorageError::NotFound` if the transaction doesn't exist
    /// Returns `StorageError::QueryError` for database errors
    pub async fn update(&self, transaction: &Transaction) -> StorageResult<()> {
        let query = UpdateQueryBuilder::new("transactions")
            .set("subtotal")
            .set("tax")
            .set("discount_total")
            .set("total")
            .set("status")
            .set("finalized_at")
            .where_clause("id = ?")
            .build();

        let status_str = match transaction.status {
            TransactionStatus::Draft => "draft",
            TransactionStatus::Finalized => "finalized",
            TransactionStatus::Voided => "voided",
        };

        let result = sqlx::query(&query)
            .bind(transaction.subtotal.to_string())
            .bind(transaction.tax.to_string())
            .bind(transaction.discount_total.to_string())
            .bind(transaction.total.to_string())
            .bind(status_str)
            .bind(transaction.finalized_at.map(|dt| dt.to_rfc3339()))
            .bind(transaction.id.to_string())
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound(format!(
                "Transaction with id {} not found",
                transaction.id
            )));
        }

        // Update line items (delete and re-insert for simplicity)
        self.delete_line_items(transaction.id).await?;
        self.save_line_items(transaction.id, &transaction.items).await?;

        // Update payments (delete and re-insert for simplicity)
        self.delete_payments(transaction.id).await?;
        self.save_payments(transaction.id, &transaction.payments).await?;

        Ok(())
    }

    /// Delete a transaction
    ///
    /// # Errors
    ///
    /// Returns `StorageError::NotFound` if the transaction doesn't exist
    /// Returns `StorageError::QueryError` for database errors
    pub async fn delete(&self, id: Uuid) -> StorageResult<()> {
        // Delete line items first (foreign key constraint)
        self.delete_line_items(id).await?;
        
        // Delete payments
        self.delete_payments(id).await?;

        // Delete transaction
        let result = sqlx::query("DELETE FROM transactions WHERE id = ?")
            .bind(id.to_string())
            .execute(&self.pool)
            .await?;

        if result.rows_affected() == 0 {
            return Err(StorageError::NotFound(format!(
                "Transaction with id {id} not found"
            )));
        }

        Ok(())
    }

    /// Count transactions with a specific status
    pub async fn count_by_status(&self, status: TransactionStatus) -> StorageResult<i64> {
        let status_str = match status {
            TransactionStatus::Draft => "draft",
            TransactionStatus::Finalized => "finalized",
            TransactionStatus::Voided => "voided",
        };

        let row = sqlx::query("SELECT COUNT(*) as count FROM transactions WHERE status = ?")
            .bind(status_str)
            .fetch_one(&self.pool)
            .await?;

        let count: i64 = row.try_get("count")?;
        Ok(count)
    }

    // Private helper methods

    async fn row_to_transaction(&self, row: sqlx::sqlite::SqliteRow) -> StorageResult<Transaction> {
        let id_str: String = row.try_get("id")?;
        let id = Uuid::parse_str(&id_str)
            .map_err(|e| StorageError::SerializationError(e.to_string()))?;

        let subtotal_str: String = row.try_get("subtotal")?;
        let tax_str: String = row.try_get("tax")?;
        let discount_str: String = row.try_get("discount_total")?;
        let total_str: String = row.try_get("total")?;

        let status_str: String = row.try_get("status")?;
        let status = match status_str.as_str() {
            "draft" => TransactionStatus::Draft,
            "finalized" => TransactionStatus::Finalized,
            "voided" => TransactionStatus::Voided,
            _ => return Err(StorageError::SerializationError(
                format!("Invalid transaction status: {status_str}")
            )),
        };

        let created_at_str: String = row.try_get("created_at")?;
        let created_at = DateTime::parse_from_rfc3339(&created_at_str)
            .map_err(|e| StorageError::SerializationError(e.to_string()))?
            .with_timezone(&Utc);

        let finalized_at: Option<String> = row.try_get("finalized_at")?;
        let finalized_at = finalized_at
            .map(|s| DateTime::parse_from_rfc3339(&s)
                .map(|dt| dt.with_timezone(&Utc)))
            .transpose()
            .map_err(|e| StorageError::SerializationError(e.to_string()))?;

        // Load line items
        let items = self.load_line_items(id).await?;

        // Load payments
        let payments = self.load_payments(id).await?;

        Ok(Transaction {
            id,
            items,
            tax_rates: Vec::new(), // TODO: Load tax rates when implemented
            discounts: Vec::new(), // TODO: Load discounts when implemented
            payments,
            subtotal: subtotal_str.parse()
                .map_err(|e| StorageError::SerializationError(format!("Invalid decimal: {e}")))?,
            tax: tax_str.parse()
                .map_err(|e| StorageError::SerializationError(format!("Invalid decimal: {e}")))?,
            discount_total: discount_str.parse()
                .map_err(|e| StorageError::SerializationError(format!("Invalid decimal: {e}")))?,
            total: total_str.parse()
                .map_err(|e| StorageError::SerializationError(format!("Invalid decimal: {e}")))?,
            status,
            created_at,
            finalized_at,
        })
    }

    async fn save_line_items(&self, transaction_id: Uuid, items: &[LineItem]) -> StorageResult<()> {
        for item in items {
            let query = InsertQueryBuilder::new("transaction_line_items")
                .column("id")
                .column("transaction_id")
                .column("product_id")
                .column("quantity")
                .column("unit_price")
                .column("line_total")
                .build();

            sqlx::query(&query)
                .bind(Uuid::new_v4().to_string())
                .bind(transaction_id.to_string())
                .bind(&item.product_id)
                .bind(item.quantity.to_string())
                .bind(item.unit_price.to_string())
                .bind(item.line_total.map(|d| d.to_string()))
                .execute(&self.pool)
                .await?;
        }

        Ok(())
    }

    async fn load_line_items(&self, transaction_id: Uuid) -> StorageResult<Vec<LineItem>> {
        let query = SelectQueryBuilder::new("transaction_line_items")
            .where_clause("transaction_id = ?")
            .build();

        let rows = sqlx::query(&query)
            .bind(transaction_id.to_string())
            .fetch_all(&self.pool)
            .await?;

        let mut items = Vec::new();
        for row in rows {
            let product_id: String = row.try_get("product_id")?;
            let quantity_str: String = row.try_get("quantity")?;
            let unit_price_str: String = row.try_get("unit_price")?;
            let line_total_str: Option<String> = row.try_get("line_total")?;

            let quantity = quantity_str.parse()
                .map_err(|e| StorageError::SerializationError(format!("Invalid decimal: {e}")))?;
            let unit_price = unit_price_str.parse()
                .map_err(|e| StorageError::SerializationError(format!("Invalid decimal: {e}")))?;
            let line_total = line_total_str
                .map(|s| s.parse())
                .transpose()
                .map_err(|e| StorageError::SerializationError(format!("Invalid decimal: {e}")))?;

            items.push(LineItem {
                product_id,
                quantity,
                unit_price,
                line_total,
            });
        }

        Ok(items)
    }

    async fn delete_line_items(&self, transaction_id: Uuid) -> StorageResult<()> {
        sqlx::query("DELETE FROM transaction_line_items WHERE transaction_id = ?")
            .bind(transaction_id.to_string())
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    async fn save_payments(&self, transaction_id: Uuid, payments: &[Payment]) -> StorageResult<()> {
        for payment in payments {
            let query = InsertQueryBuilder::new("transaction_payments")
                .column("id")
                .column("transaction_id")
                .column("method")
                .column("amount")
                .build();

            sqlx::query(&query)
                .bind(Uuid::new_v4().to_string())
                .bind(transaction_id.to_string())
                .bind(&payment.method)
                .bind(payment.amount.to_string())
                .execute(&self.pool)
                .await?;
        }

        Ok(())
    }

    async fn load_payments(&self, transaction_id: Uuid) -> StorageResult<Vec<Payment>> {
        let query = SelectQueryBuilder::new("transaction_payments")
            .where_clause("transaction_id = ?")
            .build();

        let rows = sqlx::query(&query)
            .bind(transaction_id.to_string())
            .fetch_all(&self.pool)
            .await?;

        let mut payments = Vec::new();
        for row in rows {
            let method: String = row.try_get("method")?;
            let amount_str: String = row.try_get("amount")?;

            let amount = amount_str.parse()
                .map_err(|e| StorageError::SerializationError(format!("Invalid decimal: {e}")))?;

            payments.push(Payment { method, amount });
        }

        Ok(payments)
    }

    async fn delete_payments(&self, transaction_id: Uuid) -> StorageResult<()> {
        sqlx::query("DELETE FROM transaction_payments WHERE transaction_id = ?")
            .bind(transaction_id.to_string())
            .execute(&self.pool)
            .await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

    async fn create_test_pool() -> DatabasePool {
        let pool = sqlx::SqlitePool::connect("sqlite::memory:")
            .await
            .expect("Failed to create test pool");

        // Create test tables
        sqlx::query(
            "CREATE TABLE transactions (
                id TEXT PRIMARY KEY,
                subtotal TEXT NOT NULL,
                tax TEXT NOT NULL,
                discount_total TEXT NOT NULL,
                total TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at TEXT NOT NULL,
                finalized_at TEXT
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create transactions table");

        sqlx::query(
            "CREATE TABLE transaction_line_items (
                id TEXT PRIMARY KEY,
                transaction_id TEXT NOT NULL,
                product_id TEXT NOT NULL,
                quantity TEXT NOT NULL,
                unit_price TEXT NOT NULL,
                line_total TEXT,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id)
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create line items table");

        sqlx::query(
            "CREATE TABLE transaction_payments (
                id TEXT PRIMARY KEY,
                transaction_id TEXT NOT NULL,
                method TEXT NOT NULL,
                amount TEXT NOT NULL,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id)
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create payments table");

        pool
    }

    #[tokio::test]
    async fn test_save_and_find_transaction() {
        let pool = create_test_pool().await;
        let repo = TransactionRepository::new(pool);

        let mut transaction = Transaction::new();
        transaction.subtotal = dec!(100.00);
        transaction.tax = dec!(8.00);
        transaction.total = dec!(108.00);
        transaction.add_item(LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(50.00)))
            .expect("Failed to add item");
        transaction.add_payment(Payment {
            method: "cash".to_string(),
            amount: dec!(108.00),
        }).expect("Failed to add payment");

        // Save transaction
        repo.save(&transaction).await.expect("Failed to save transaction");

        // Find transaction
        let found = repo.find_by_id(transaction.id).await.expect("Failed to find transaction");

        assert_eq!(found.id, transaction.id);
        assert_eq!(found.subtotal, transaction.subtotal);
        assert_eq!(found.tax, transaction.tax);
        assert_eq!(found.total, transaction.total);
        assert_eq!(found.items.len(), 1);
        assert_eq!(found.payments.len(), 1);
    }

    #[tokio::test]
    async fn test_find_by_status() {
        let pool = create_test_pool().await;
        let repo = TransactionRepository::new(pool);

        // Create draft transaction
        let mut draft = Transaction::new();
        draft.total = dec!(50.00);
        repo.save(&draft).await.expect("Failed to save draft");

        // Create finalized transaction
        let mut finalized = Transaction::new();
        finalized.total = dec!(100.00);
        finalized.status = TransactionStatus::Finalized;
        finalized.finalized_at = Some(Utc::now());
        repo.save(&finalized).await.expect("Failed to save finalized");

        // Find draft transactions
        let drafts = repo.find_by_status(TransactionStatus::Draft).await
            .expect("Failed to find drafts");
        assert_eq!(drafts.len(), 1);
        assert_eq!(drafts[0].id, draft.id);

        // Find finalized transactions
        let finalized_txns = repo.find_by_status(TransactionStatus::Finalized).await
            .expect("Failed to find finalized");
        assert_eq!(finalized_txns.len(), 1);
        assert_eq!(finalized_txns[0].id, finalized.id);
    }

    #[tokio::test]
    async fn test_update_transaction() {
        let pool = create_test_pool().await;
        let repo = TransactionRepository::new(pool);

        let mut transaction = Transaction::new();
        transaction.total = dec!(100.00);
        repo.save(&transaction).await.expect("Failed to save");

        // Update transaction
        transaction.total = dec!(150.00);
        transaction.status = TransactionStatus::Finalized;
        transaction.finalized_at = Some(Utc::now());
        repo.update(&transaction).await.expect("Failed to update");

        // Verify update
        let found = repo.find_by_id(transaction.id).await.expect("Failed to find");
        assert_eq!(found.total, dec!(150.00));
        assert_eq!(found.status, TransactionStatus::Finalized);
        assert!(found.finalized_at.is_some());
    }

    #[tokio::test]
    async fn test_delete_transaction() {
        let pool = create_test_pool().await;
        let repo = TransactionRepository::new(pool);

        let transaction = Transaction::new();
        repo.save(&transaction).await.expect("Failed to save");

        // Delete transaction
        repo.delete(transaction.id).await.expect("Failed to delete");

        // Verify deletion
        let result = repo.find_by_id(transaction.id).await;
        assert!(result.is_err());
        assert!(matches!(result.unwrap_err(), StorageError::NotFound(_)));
    }

    #[tokio::test]
    async fn test_count_by_status() {
        let pool = create_test_pool().await;
        let repo = TransactionRepository::new(pool);

        // Create multiple transactions
        for _ in 0..3 {
            let transaction = Transaction::new();
            repo.save(&transaction).await.expect("Failed to save");
        }

        let count = repo.count_by_status(TransactionStatus::Draft).await
            .expect("Failed to count");
        assert_eq!(count, 3);
    }
}
