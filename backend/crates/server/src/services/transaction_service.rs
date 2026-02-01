//! Transaction service for business logic

use sqlx::{SqlitePool, Row};
use rust_decimal::Decimal;
use chrono::Utc;
use uuid::Uuid;

use pos_core_models::{Transaction, TransactionStatus, LineItem};
use crate::services::discount_service::{DiscountService, DiscountServiceError};
use crate::services::tax_service::{TaxService, TaxServiceError};

#[derive(Debug, thiserror::Error)]
pub enum TransactionServiceError {
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Validation error: {0}")]
    ValidationError(String),
    #[error("Discount service error: {0}")]
    DiscountError(#[from] DiscountServiceError),
    #[error("Tax service error: {0}")]
    TaxError(#[from] TaxServiceError),
}

type Result<T> = std::result::Result<T, TransactionServiceError>;

/// Service for transaction business logic
pub struct TransactionService {
    pool: SqlitePool,
    discount_service: DiscountService,
    tax_service: TaxService,
}

impl TransactionService {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            discount_service: DiscountService::new(pool.clone()),
            tax_service: TaxService::new(pool.clone()),
            pool,
        }
    }

    /// Calculate transaction totals with discounts and taxes
    /// 
    /// This method applies the standard accounting practice:
    /// 1. Calculate subtotal from line items
    /// 2. Apply discounts to subtotal
    /// 3. Calculate tax on discounted subtotal
    /// 4. Calculate final total
    /// 
    /// # Arguments
    /// * `tenant_id` - The tenant ID
    /// * `transaction` - The transaction to calculate totals for
    /// 
    /// # Returns
    /// Updated transaction with calculated totals
    pub async fn calculate_totals(
        &self,
        tenant_id: &str,
        mut transaction: Transaction,
    ) -> Result<Transaction> {
        // 1. Calculate subtotal from line items
        let subtotal: Decimal = transaction
            .items
            .iter()
            .map(|item| item.quantity * item.unit_price)
            .sum();
        
        transaction.subtotal = subtotal;

        // 2. Apply discounts to subtotal
        let discount_calculations = self
            .discount_service
            .calculate_discounts(tenant_id, &transaction)
            .await?;

        let total_discount: Decimal = discount_calculations
            .iter()
            .map(|calc| calc.discount_amount)
            .sum();

        transaction.discount_total = total_discount;
        let discounted_subtotal = subtotal - total_discount;

        // 3. Calculate tax on discounted subtotal
        // Tax is calculated on the amount after discounts
        let tax_calculations = self
            .tax_service
            .calculate_tax(tenant_id, discounted_subtotal, None, None)
            .await?;

        let total_tax: Decimal = tax_calculations
            .iter()
            .map(|calc| calc.tax_amount)
            .sum();

        transaction.tax = total_tax;

        // 4. Calculate final total
        // Total = Subtotal - Discounts + Tax
        transaction.total = discounted_subtotal + total_tax;

        Ok(transaction)
    }

    /// Create a new transaction with calculated totals
    /// 
    /// # Arguments
    /// * `tenant_id` - The tenant ID
    /// * `store_id` - The store ID
    /// * `items` - Line items for the transaction
    /// * `customer_id` - Optional customer ID
    /// 
    /// # Returns
    /// Created transaction with ID and calculated totals
    pub async fn create_transaction(
        &self,
        tenant_id: &str,
        store_id: &str,
        items: Vec<LineItem>,
        customer_id: Option<&str>,
    ) -> Result<Transaction> {
        // Validate items
        if items.is_empty() {
            return Err(TransactionServiceError::ValidationError(
                "Transaction must have at least one item".to_string(),
            ));
        }

        // Create transaction
        let mut transaction = Transaction::new();
        for item in items {
            transaction
                .add_item(item)
                .map_err(|e| TransactionServiceError::ValidationError(e.to_string()))?;
        }

        // Calculate totals
        let transaction = self.calculate_totals(tenant_id, transaction).await?;

        // Save to database
        let id = Uuid::new_v4();
        let now = Utc::now();

        sqlx::query(
            r#"
            INSERT INTO transactions (
                id, tenant_id, store_id, customer_id,
                subtotal, tax, discount_total, total,
                status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(id.to_string())
        .bind(tenant_id)
        .bind(store_id)
        .bind(customer_id)
        .bind(transaction.subtotal.to_string())
        .bind(transaction.tax.to_string())
        .bind(transaction.discount_total.to_string())
        .bind(transaction.total.to_string())
        .bind("draft")
        .bind(now.to_rfc3339())
        .execute(&self.pool)
        .await
        .map_err(|e| TransactionServiceError::DatabaseError(format!("Failed to create transaction: {}", e)))?;

        // Save line items
        for (index, item) in transaction.items.iter().enumerate() {
            let line_id = Uuid::new_v4();
            sqlx::query(
                r#"
                INSERT INTO transaction_line_items (
                    id, transaction_id, line_number, product_id,
                    quantity, unit_price, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                "#,
            )
            .bind(line_id.to_string())
            .bind(id.to_string())
            .bind(index as i32)
            .bind(&item.product_id)
            .bind(item.quantity.to_string())
            .bind(item.unit_price.to_string())
            .bind(now.to_rfc3339())
            .execute(&self.pool)
            .await
            .map_err(|e| TransactionServiceError::DatabaseError(format!("Failed to create line item: {}", e)))?;
        }

        Ok(transaction)
    }

    /// Finalize a transaction
    /// 
    /// Recalculates totals and marks the transaction as finalized
    pub async fn finalize_transaction(
        &self,
        tenant_id: &str,
        transaction_id: Uuid,
    ) -> Result<Transaction> {
        // Load transaction
        let row = sqlx::query(
            "SELECT id, subtotal, tax, discount_total, total, status, created_at 
             FROM transactions WHERE id = ? AND tenant_id = ?"
        )
        .bind(transaction_id.to_string())
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await
        .map_err(|e| TransactionServiceError::DatabaseError(format!("Transaction not found: {}", e)))?;

        let status: String = row.try_get("status")
            .map_err(|e| TransactionServiceError::DatabaseError(e.to_string()))?;

        if status == "finalized" {
            return Err(TransactionServiceError::ValidationError(
                "Transaction is already finalized".to_string(),
            ));
        }

        // Load line items
        let item_rows = sqlx::query(
            "SELECT product_id, quantity, unit_price 
             FROM transaction_line_items 
             WHERE transaction_id = ? 
             ORDER BY line_number"
        )
        .bind(transaction_id.to_string())
        .fetch_all(&self.pool)
        .await
        .map_err(|e| TransactionServiceError::DatabaseError(format!("Failed to load line items: {}", e)))?;

        let mut transaction = Transaction::new();
        for row in item_rows {
            let product_id: String = row.try_get("product_id")
                .map_err(|e| TransactionServiceError::DatabaseError(e.to_string()))?;
            let quantity_str: String = row.try_get("quantity")
                .map_err(|e| TransactionServiceError::DatabaseError(e.to_string()))?;
            let unit_price_str: String = row.try_get("unit_price")
                .map_err(|e| TransactionServiceError::DatabaseError(e.to_string()))?;

            let quantity = quantity_str.parse::<Decimal>()
                .map_err(|e| TransactionServiceError::ValidationError(format!("Invalid quantity: {}", e)))?;
            let unit_price = unit_price_str.parse::<Decimal>()
                .map_err(|e| TransactionServiceError::ValidationError(format!("Invalid unit price: {}", e)))?;

            transaction
                .add_item(LineItem::new(product_id, quantity, unit_price))
                .map_err(|e| TransactionServiceError::ValidationError(e.to_string()))?;
        }

        // Recalculate totals
        let transaction = self.calculate_totals(tenant_id, transaction).await?;

        // Update database
        let now = Utc::now();
        sqlx::query(
            r#"
            UPDATE transactions
            SET subtotal = ?, tax = ?, discount_total = ?, total = ?,
                status = 'finalized', finalized_at = ?
            WHERE id = ? AND tenant_id = ?
            "#,
        )
        .bind(transaction.subtotal.to_string())
        .bind(transaction.tax.to_string())
        .bind(transaction.discount_total.to_string())
        .bind(transaction.total.to_string())
        .bind(now.to_rfc3339())
        .bind(transaction_id.to_string())
        .bind(tenant_id)
        .execute(&self.pool)
        .await
        .map_err(|e| TransactionServiceError::DatabaseError(format!("Failed to finalize transaction: {}", e)))?;

        Ok(transaction)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;
    use pos_core_models::DiscountType;

    async fn create_test_pool() -> SqlitePool {
        let pool = SqlitePool::connect("sqlite::memory:")
            .await
            .expect("Failed to create test pool");

        // Create test tables
        sqlx::query(
            "CREATE TABLE tenants (
                id TEXT PRIMARY KEY
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create tenants table");

        sqlx::query(
            "CREATE TABLE transactions (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                store_id TEXT NOT NULL,
                customer_id TEXT,
                subtotal TEXT NOT NULL,
                tax TEXT NOT NULL,
                discount_total TEXT NOT NULL DEFAULT '0',
                total TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'draft',
                created_at TEXT NOT NULL,
                finalized_at TEXT,
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create transactions table");

        sqlx::query(
            "CREATE TABLE transaction_line_items (
                id TEXT PRIMARY KEY,
                transaction_id TEXT NOT NULL,
                line_number INTEGER NOT NULL,
                product_id TEXT NOT NULL,
                quantity TEXT NOT NULL,
                unit_price TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (transaction_id) REFERENCES transactions(id)
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create transaction_line_items table");

        sqlx::query(
            "CREATE TABLE discounts (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                store_id TEXT NOT NULL DEFAULT 'default',
                code TEXT NOT NULL,
                name TEXT NOT NULL,
                discount_type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                min_purchase_amount REAL,
                max_discount_amount REAL,
                start_date TEXT,
                end_date TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create discounts table");

        sqlx::query(
            "CREATE TABLE tax_rules (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                store_id TEXT NOT NULL DEFAULT 'default',
                name TEXT NOT NULL,
                rate REAL NOT NULL,
                category TEXT,
                is_default INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)
            )"
        )
        .execute(&pool)
        .await
        .expect("Failed to create tax_rules table");

        // Insert test tenant
        sqlx::query("INSERT INTO tenants (id) VALUES ('test-tenant')")
            .execute(&pool)
            .await
            .expect("Failed to insert test tenant");

        pool
    }

    #[tokio::test]
    async fn test_calculate_totals_no_discounts_no_tax() {
        let pool = create_test_pool().await;
        let service = TransactionService::new(pool.clone());

        let mut transaction = Transaction::new();
        transaction
            .add_item(LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00)))
            .unwrap();
        transaction
            .add_item(LineItem::new("PROD-002".to_string(), dec!(1.0), dec!(5.50)))
            .unwrap();

        let result = service
            .calculate_totals("test-tenant", transaction)
            .await
            .expect("Failed to calculate totals");

        assert_eq!(result.subtotal, dec!(25.50)); // 20.00 + 5.50
        assert_eq!(result.discount_total, dec!(0.00));
        assert_eq!(result.tax, dec!(0.00));
        assert_eq!(result.total, dec!(25.50));
    }

    #[tokio::test]
    async fn test_calculate_totals_with_discount() {
        let pool = create_test_pool().await;
        let service = TransactionService::new(pool.clone());

        // Create a 10% discount
        let discount_service = DiscountService::new(pool.clone());
        discount_service
            .create_discount(
                "test-tenant",
                "default",
                "SAVE10",
                "10% Off",
                DiscountType::Percent,
                dec!(10.0),
                None,
            )
            .await
            .expect("Failed to create discount");

        let mut transaction = Transaction::new();
        transaction
            .add_item(LineItem::new("PROD-001".to_string(), dec!(1.0), dec!(100.00)))
            .unwrap();

        let result = service
            .calculate_totals("test-tenant", transaction)
            .await
            .expect("Failed to calculate totals");

        assert_eq!(result.subtotal, dec!(100.00));
        assert_eq!(result.discount_total, dec!(10.00)); // 10% of 100
        assert_eq!(result.tax, dec!(0.00));
        assert_eq!(result.total, dec!(90.00)); // 100 - 10
    }

    #[tokio::test]
    async fn test_calculate_totals_with_discount_and_tax() {
        let pool = create_test_pool().await;
        let service = TransactionService::new(pool.clone());

        // Create a 10% discount
        let discount_service = DiscountService::new(pool.clone());
        discount_service
            .create_discount(
                "test-tenant",
                "default",
                "SAVE10",
                "10% Off",
                DiscountType::Percent,
                dec!(10.0),
                None,
            )
            .await
            .expect("Failed to create discount");

        // Create an 8.5% tax rate
        let tax_service = TaxService::new(pool.clone());
        tax_service
            .create_tax_rate(
                "test-tenant",
                "default",
                "TAX",
                dec!(8.5),
                true,
            )
            .await
            .expect("Failed to create tax rate");

        let mut transaction = Transaction::new();
        transaction
            .add_item(LineItem::new("PROD-001".to_string(), dec!(1.0), dec!(100.00)))
            .unwrap();

        let result = service
            .calculate_totals("test-tenant", transaction)
            .await
            .expect("Failed to calculate totals");

        assert_eq!(result.subtotal, dec!(100.00));
        assert_eq!(result.discount_total, dec!(10.00)); // 10% of 100
        // Tax is calculated on discounted amount: 90.00 * 8.5% = 7.65
        assert_eq!(result.tax, dec!(7.65));
        // Total = 90.00 + 7.65 = 97.65
        assert_eq!(result.total, dec!(97.65));
    }

    #[tokio::test]
    async fn test_calculate_totals_discount_before_tax() {
        let pool = create_test_pool().await;
        let service = TransactionService::new(pool.clone());

        // Create a $5 fixed discount
        let discount_service = DiscountService::new(pool.clone());
        discount_service
            .create_discount(
                "test-tenant",
                "default",
                "SAVE5",
                "$5 Off",
                DiscountType::FixedCart,
                dec!(5.0),
                None,
            )
            .await
            .expect("Failed to create discount");

        // Create a 10% tax rate
        let tax_service = TaxService::new(pool.clone());
        tax_service
            .create_tax_rate(
                "test-tenant",
                "default",
                "TAX",
                dec!(10.0),
                true,
            )
            .await
            .expect("Failed to create tax rate");

        let mut transaction = Transaction::new();
        transaction
            .add_item(LineItem::new("PROD-001".to_string(), dec!(1.0), dec!(50.00)))
            .unwrap();

        let result = service
            .calculate_totals("test-tenant", transaction)
            .await
            .expect("Failed to calculate totals");

        assert_eq!(result.subtotal, dec!(50.00));
        assert_eq!(result.discount_total, dec!(5.00));
        // Tax is calculated on discounted amount: 45.00 * 10% = 4.50
        assert_eq!(result.tax, dec!(4.50));
        // Total = 45.00 + 4.50 = 49.50
        assert_eq!(result.total, dec!(49.50));
    }

    #[tokio::test]
    async fn test_create_transaction() {
        let pool = create_test_pool().await;
        let service = TransactionService::new(pool.clone());

        let items = vec![
            LineItem::new("PROD-001".to_string(), dec!(2.0), dec!(10.00)),
            LineItem::new("PROD-002".to_string(), dec!(1.0), dec!(5.50)),
        ];

        let result = service
            .create_transaction("test-tenant", "default", items, None)
            .await
            .expect("Failed to create transaction");

        assert_eq!(result.subtotal, dec!(25.50));
        assert_eq!(result.total, dec!(25.50));
    }

    #[tokio::test]
    async fn test_create_transaction_empty_items_error() {
        let pool = create_test_pool().await;
        let service = TransactionService::new(pool.clone());

        let result = service
            .create_transaction("test-tenant", "default", vec![], None)
            .await;

        assert!(result.is_err());
        match result {
            Err(TransactionServiceError::ValidationError(msg)) => {
                assert!(msg.contains("at least one item"));
            }
            _ => panic!("Expected ValidationError"),
        }
    }
}
