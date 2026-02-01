use sqlx::SqlitePool;
use rust_decimal::Decimal;
use pos_core_models::{Discount, DiscountType, Transaction};
use thiserror::Error;
use serde::{Deserialize, Serialize};

#[derive(Debug, Error)]
pub enum DiscountServiceError {
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Validation error: {0}")]
    ValidationError(String),
    #[error("Not found: {0}")]
    NotFound(String),
}

type Result<T> = std::result::Result<T, DiscountServiceError>;

/// Result of a discount calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscountCalculation {
    /// Discount code
    pub code: String,
    /// Discount name/label
    pub label: String,
    /// Discount type (percent, fixed, fixed_cart)
    pub discount_type: DiscountType,
    /// Discount amount/percentage value
    pub discount_value: Decimal,
    /// Calculated discount amount
    pub discount_amount: Decimal,
    /// Whether this applies to entire transaction or line items
    pub applies_to: String,
}

/// Service for managing discounts
pub struct DiscountService {
    pool: SqlitePool,
}

impl DiscountService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Calculate discounts for a transaction
    /// 
    /// # Arguments
    /// * `tenant_id` - The tenant ID
    /// * `transaction` - The transaction to calculate discounts for
    /// 
    /// # Returns
    /// A vector of discount calculations, one for each applicable discount.
    /// 
    /// # Requirements
    /// - Load discounts from `discounts` table
    /// - Support percentage and fixed-amount discounts
    /// - Support line-item and transaction-level discounts
    /// - Validate discount eligibility (date range, customer tier, product category)
    /// - Apply discount precedence rules
    pub async fn calculate_discounts(
        &self,
        tenant_id: &str,
        transaction: &Transaction,
    ) -> Result<Vec<DiscountCalculation>> {
        // Validate input
        if transaction.subtotal < Decimal::ZERO {
            return Err(DiscountServiceError::ValidationError(
                "Transaction subtotal cannot be negative".to_string(),
            ));
        }

        // Load applicable discounts from database
        let rows = sqlx::query!(
            r#"
            SELECT id, code, name, discount_type, amount, description,
                   min_purchase_amount, max_discount_amount
            FROM discounts
            WHERE tenant_id = ? AND is_active = 1
            AND (start_date IS NULL OR start_date <= datetime('now'))
            AND (end_date IS NULL OR end_date >= datetime('now'))
            ORDER BY created_at
            "#,
            tenant_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DiscountServiceError::DatabaseError(format!("Failed to load discounts: {}", e)))?;

        // Calculate discounts
        let mut calculations = Vec::new();

        for row in rows {
            // Parse discount type
            let discount_type = match row.discount_type.as_str() {
                "percent" => DiscountType::Percent,
                "fixed" => DiscountType::Fixed,
                "fixed_cart" => DiscountType::FixedCart,
                _ => continue, // Skip invalid discount types
            };

            let discount_value = Decimal::try_from(row.amount)
                .map_err(|e| DiscountServiceError::ValidationError(format!("Invalid discount amount: {}", e)))?;

            // Validate minimum purchase amount
            if let Some(min_amount) = row.min_purchase_amount {
                let min_decimal = Decimal::try_from(min_amount)
                    .map_err(|e| DiscountServiceError::ValidationError(format!("Invalid min amount: {}", e)))?;
                if transaction.subtotal < min_decimal {
                    continue; // Skip this discount if minimum not met
                }
            }

            // Calculate discount amount based on type
            let mut discount_amount = match discount_type {
                DiscountType::Percent => {
                    // Percentage discount: apply to subtotal
                    transaction.subtotal * discount_value / Decimal::from(100)
                }
                DiscountType::Fixed => {
                    // Fixed amount discount per item (line-item level)
                    // For now, apply to subtotal (can be enhanced for line-item logic)
                    discount_value.min(transaction.subtotal)
                }
                DiscountType::FixedCart => {
                    // Fixed cart discount: apply fixed amount to entire cart
                    discount_value.min(transaction.subtotal)
                }
            };

            // Apply maximum discount amount if specified
            if let Some(max_amount) = row.max_discount_amount {
                let max_decimal = Decimal::try_from(max_amount)
                    .map_err(|e| DiscountServiceError::ValidationError(format!("Invalid max amount: {}", e)))?;
                discount_amount = discount_amount.min(max_decimal);
            }

            // Ensure discount doesn't exceed subtotal
            discount_amount = discount_amount.min(transaction.subtotal);

            // Determine applies_to based on discount type
            let applies_to = match discount_type {
                DiscountType::Percent | DiscountType::FixedCart => "transaction".to_string(),
                DiscountType::Fixed => "line_item".to_string(),
            };

            calculations.push(DiscountCalculation {
                code: row.code,
                label: row.name,
                discount_type,
                discount_value,
                discount_amount,
                applies_to,
            });
        }

        Ok(calculations)
    }

    /// Load active discounts for a tenant and store
    pub async fn load_discounts(
        &self,
        tenant_id: &str,
        store_id: Option<&str>,
    ) -> Result<Vec<Discount>> {
        let store_id = store_id.unwrap_or("default");

        let rows = sqlx::query!(
            r#"
            SELECT id, code, name, discount_type, amount, description
            FROM discounts
            WHERE tenant_id = ? AND store_id = ? AND is_active = 1
            AND (start_date IS NULL OR start_date <= datetime('now'))
            AND (end_date IS NULL OR end_date >= datetime('now'))
            ORDER BY created_at
            "#,
            tenant_id,
            store_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| DiscountServiceError::DatabaseError(format!("Failed to load discounts: {}", e)))?;

        let mut discounts = Vec::new();
        for row in rows {
            let discount_type = match row.discount_type.as_str() {
                "percent" => DiscountType::Percent,
                "fixed" => DiscountType::Fixed,
                "fixed_cart" => DiscountType::FixedCart,
                _ => return Err(DiscountServiceError::ValidationError(format!("Invalid discount type: {}", row.discount_type))),
            };

            let amount = Decimal::try_from(row.amount)
                .map_err(|e| DiscountServiceError::ValidationError(format!("Invalid discount amount: {}", e)))?;

            let mut discount = Discount::new(row.code, discount_type, amount)
                .map_err(|e| DiscountServiceError::ValidationError(format!("Invalid discount: {}", e)))?;

            if let Some(desc) = row.description {
                discount = discount.with_description(desc);
            }

            discounts.push(discount);
        }

        Ok(discounts)
    }

    /// Get a discount by code
    pub async fn get_by_code(
        &self,
        tenant_id: &str,
        code: &str,
    ) -> Result<Option<Discount>> {
        let row = sqlx::query!(
            r#"
            SELECT id, code, name, discount_type, amount, description
            FROM discounts
            WHERE tenant_id = ? AND code = ? AND is_active = 1
            AND (start_date IS NULL OR start_date <= datetime('now'))
            AND (end_date IS NULL OR end_date >= datetime('now'))
            LIMIT 1
            "#,
            tenant_id,
            code
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DiscountServiceError::DatabaseError(format!("Failed to get discount: {}", e)))?;

        if let Some(row) = row {
            let discount_type = match row.discount_type.as_str() {
                "percent" => DiscountType::Percent,
                "fixed" => DiscountType::Fixed,
                "fixed_cart" => DiscountType::FixedCart,
                _ => return Err(DiscountServiceError::ValidationError(format!("Invalid discount type: {}", row.discount_type))),
            };

            let amount = Decimal::try_from(row.amount)
                .map_err(|e| DiscountServiceError::ValidationError(format!("Invalid discount amount: {}", e)))?;

            let mut discount = Discount::new(row.code, discount_type, amount)
                .map_err(|e| DiscountServiceError::ValidationError(format!("Invalid discount: {}", e)))?;

            if let Some(desc) = row.description {
                discount = discount.with_description(desc);
            }

            Ok(Some(discount))
        } else {
            Ok(None)
        }
    }

    /// Create a new discount
    pub async fn create_discount(
        &self,
        tenant_id: &str,
        store_id: &str,
        code: &str,
        name: &str,
        discount_type: DiscountType,
        amount: Decimal,
        description: Option<&str>,
    ) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let amount_f64 = amount.to_string().parse::<f64>()
            .map_err(|e| DiscountServiceError::ValidationError(format!("Invalid amount: {}", e)))?;

        let discount_type_str = match discount_type {
            DiscountType::Percent => "percent",
            DiscountType::Fixed => "fixed",
            DiscountType::FixedCart => "fixed_cart",
        };

        sqlx::query!(
            r#"
            INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
            id,
            tenant_id,
            store_id,
            code,
            name,
            discount_type_str,
            amount_f64,
            description
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DiscountServiceError::DatabaseError(format!("Failed to create discount: {}", e)))?;

        Ok(id)
    }

    /// Update an existing discount
    pub async fn update_discount(
        &self,
        id: &str,
        name: &str,
        discount_type: DiscountType,
        amount: Decimal,
        description: Option<&str>,
        is_active: bool,
    ) -> Result<()> {
        let amount_f64 = amount.to_string().parse::<f64>()
            .map_err(|e| DiscountServiceError::ValidationError(format!("Invalid amount: {}", e)))?;

        let discount_type_str = match discount_type {
            DiscountType::Percent => "percent",
            DiscountType::Fixed => "fixed",
            DiscountType::FixedCart => "fixed_cart",
        };

        let is_active_int = if is_active { 1 } else { 0 };

        let result = sqlx::query!(
            r#"
            UPDATE discounts
            SET name = ?, discount_type = ?, amount = ?, description = ?, 
                is_active = ?, updated_at = datetime('now')
            WHERE id = ?
            "#,
            name,
            discount_type_str,
            amount_f64,
            description,
            is_active_int,
            id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DiscountServiceError::DatabaseError(format!("Failed to update discount: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(DiscountServiceError::NotFound(format!("Discount not found: {}", id)));
        }

        Ok(())
    }

    /// Delete a discount (soft delete by setting is_active = 0)
    pub async fn delete_discount(&self, id: &str) -> Result<()> {
        let result = sqlx::query!(
            r#"
            UPDATE discounts SET is_active = 0, updated_at = datetime('now')
            WHERE id = ?
            "#,
            id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| DiscountServiceError::DatabaseError(format!("Failed to delete discount: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(DiscountServiceError::NotFound(format!("Discount not found: {}", id)));
        }

        Ok(())
    }

    /// Validate if a discount can be applied to a purchase
    pub async fn validate_discount(
        &self,
        tenant_id: &str,
        code: &str,
        subtotal: Decimal,
    ) -> Result<bool> {
        let row = sqlx::query!(
            r#"
            SELECT min_purchase_amount
            FROM discounts
            WHERE tenant_id = ? AND code = ? AND is_active = 1
            AND (start_date IS NULL OR start_date <= datetime('now'))
            AND (end_date IS NULL OR end_date >= datetime('now'))
            LIMIT 1
            "#,
            tenant_id,
            code
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| DiscountServiceError::DatabaseError(format!("Failed to validate discount: {}", e)))?;

        if let Some(row) = row {
            if let Some(min_amount) = row.min_purchase_amount {
                let min_decimal = Decimal::try_from(min_amount)
                    .map_err(|e| DiscountServiceError::ValidationError(format!("Invalid min amount: {}", e)))?;
                Ok(subtotal >= min_decimal)
            } else {
                Ok(true)
            }
        } else {
            Ok(false)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal_macros::dec;

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

        // Insert test tenant
        sqlx::query("INSERT INTO tenants (id) VALUES ('test-tenant')")
            .execute(&pool)
            .await
            .expect("Failed to insert test tenant");

        pool
    }

    #[tokio::test]
    async fn test_create_and_load_discounts() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create discount
        let id = service
            .create_discount(
                "test-tenant",
                "default",
                "SAVE10",
                "10% Off",
                DiscountType::Percent,
                dec!(10.0),
                Some("Save 10%"),
            )
            .await
            .expect("Failed to create discount");

        // Load discounts
        let discounts = service
            .load_discounts("test-tenant", Some("default"))
            .await
            .expect("Failed to load discounts");

        assert_eq!(discounts.len(), 1);
        assert_eq!(discounts[0].code, "SAVE10");
        assert_eq!(discounts[0].amount, dec!(10.0));
        assert_eq!(discounts[0].discount_type, DiscountType::Percent);
    }

    #[tokio::test]
    async fn test_get_by_code() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create discount
        service
            .create_discount(
                "test-tenant",
                "default",
                "SAVE20",
                "20% Off",
                DiscountType::Percent,
                dec!(20.0),
                None,
            )
            .await
            .expect("Failed to create discount");

        // Get by code
        let discount = service
            .get_by_code("test-tenant", "SAVE20")
            .await
            .expect("Failed to get discount");

        assert!(discount.is_some());
        let discount = discount.unwrap();
        assert_eq!(discount.code, "SAVE20");
        assert_eq!(discount.amount, dec!(20.0));
    }

    #[tokio::test]
    async fn test_update_discount() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create discount
        let id = service
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

        // Update discount
        service
            .update_discount(
                &id,
                "15% Off",
                DiscountType::Percent,
                dec!(15.0),
                Some("Updated discount"),
                true,
            )
            .await
            .expect("Failed to update discount");

        // Verify update
        let discount = service
            .get_by_code("test-tenant", "SAVE10")
            .await
            .expect("Failed to get discount");

        assert!(discount.is_some());
        let discount = discount.unwrap();
        assert_eq!(discount.amount, dec!(15.0));
    }

    #[tokio::test]
    async fn test_delete_discount() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create discount
        let id = service
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

        // Delete discount
        service
            .delete_discount(&id)
            .await
            .expect("Failed to delete discount");

        // Verify deletion (soft delete)
        let discount = service
            .get_by_code("test-tenant", "SAVE10")
            .await
            .expect("Failed to get discount");

        assert!(discount.is_none());
    }

    #[tokio::test]
    async fn test_validate_discount_with_min_purchase() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create discount with min purchase
        sqlx::query(
            "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, min_purchase_amount)
             VALUES ('test-id', 'test-tenant', 'default', 'SAVE50', '50% Off', 'percent', 50.0, 100.0)"
        )
        .execute(&pool)
        .await
        .expect("Failed to insert discount");

        // Test with subtotal below minimum
        let valid = service
            .validate_discount("test-tenant", "SAVE50", dec!(50.0))
            .await
            .expect("Failed to validate");
        assert!(!valid);

        // Test with subtotal above minimum
        let valid = service
            .validate_discount("test-tenant", "SAVE50", dec!(150.0))
            .await
            .expect("Failed to validate");
        assert!(valid);
    }

    #[tokio::test]
    async fn test_calculate_discounts_percentage() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create percentage discount
        service
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

        // Create a test transaction
        let mut transaction = pos_core_models::Transaction::new();
        transaction.subtotal = dec!(100.0);

        // Calculate discounts
        let calculations = service
            .calculate_discounts("test-tenant", &transaction)
            .await
            .expect("Failed to calculate discounts");

        assert_eq!(calculations.len(), 1);
        assert_eq!(calculations[0].code, "SAVE10");
        assert_eq!(calculations[0].discount_amount, dec!(10.0)); // 10% of 100
        assert_eq!(calculations[0].discount_type, DiscountType::Percent);
        assert_eq!(calculations[0].applies_to, "transaction");
    }

    #[tokio::test]
    async fn test_calculate_discounts_fixed_cart() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create fixed cart discount
        service
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

        // Create a test transaction
        let mut transaction = pos_core_models::Transaction::new();
        transaction.subtotal = dec!(50.0);

        // Calculate discounts
        let calculations = service
            .calculate_discounts("test-tenant", &transaction)
            .await
            .expect("Failed to calculate discounts");

        assert_eq!(calculations.len(), 1);
        assert_eq!(calculations[0].code, "SAVE5");
        assert_eq!(calculations[0].discount_amount, dec!(5.0));
        assert_eq!(calculations[0].discount_type, DiscountType::FixedCart);
        assert_eq!(calculations[0].applies_to, "transaction");
    }

    #[tokio::test]
    async fn test_calculate_discounts_with_min_purchase() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create discount with minimum purchase
        sqlx::query(
            "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, min_purchase_amount)
             VALUES ('test-id', 'test-tenant', 'default', 'SAVE20', '20% Off', 'percent', 20.0, 100.0)"
        )
        .execute(&pool)
        .await
        .expect("Failed to insert discount");

        // Test with subtotal below minimum
        let mut transaction = pos_core_models::Transaction::new();
        transaction.subtotal = dec!(50.0);

        let calculations = service
            .calculate_discounts("test-tenant", &transaction)
            .await
            .expect("Failed to calculate discounts");

        assert_eq!(calculations.len(), 0); // Discount not applied

        // Test with subtotal above minimum
        transaction.subtotal = dec!(150.0);

        let calculations = service
            .calculate_discounts("test-tenant", &transaction)
            .await
            .expect("Failed to calculate discounts");

        assert_eq!(calculations.len(), 1);
        assert_eq!(calculations[0].discount_amount, dec!(30.0)); // 20% of 150
    }

    #[tokio::test]
    async fn test_calculate_discounts_with_max_discount() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create discount with maximum discount amount
        sqlx::query(
            "INSERT INTO discounts (id, tenant_id, store_id, code, name, discount_type, amount, max_discount_amount)
             VALUES ('test-id', 'test-tenant', 'default', 'SAVE50', '50% Off', 'percent', 50.0, 25.0)"
        )
        .execute(&pool)
        .await
        .expect("Failed to insert discount");

        // Test with large subtotal
        let mut transaction = pos_core_models::Transaction::new();
        transaction.subtotal = dec!(100.0);

        let calculations = service
            .calculate_discounts("test-tenant", &transaction)
            .await
            .expect("Failed to calculate discounts");

        assert_eq!(calculations.len(), 1);
        // 50% of 100 would be 50, but max is 25
        assert_eq!(calculations[0].discount_amount, dec!(25.0));
    }

    #[tokio::test]
    async fn test_calculate_discounts_multiple() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create multiple discounts
        service
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
            .expect("Failed to create discount 1");

        service
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
            .expect("Failed to create discount 2");

        // Create a test transaction
        let mut transaction = pos_core_models::Transaction::new();
        transaction.subtotal = dec!(100.0);

        // Calculate discounts
        let calculations = service
            .calculate_discounts("test-tenant", &transaction)
            .await
            .expect("Failed to calculate discounts");

        assert_eq!(calculations.len(), 2);
        
        // Total discount should be 15 (10% + $5)
        let total_discount: Decimal = calculations.iter().map(|c| c.discount_amount).sum();
        assert_eq!(total_discount, dec!(15.0));
    }

    #[tokio::test]
    async fn test_calculate_discounts_negative_subtotal_error() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create a transaction with negative subtotal
        let mut transaction = pos_core_models::Transaction::new();
        transaction.subtotal = dec!(-100.0);

        // Try to calculate discounts
        let result = service
            .calculate_discounts("test-tenant", &transaction)
            .await;

        assert!(result.is_err());
        match result {
            Err(DiscountServiceError::ValidationError(msg)) => {
                assert!(msg.contains("negative"));
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[tokio::test]
    async fn test_calculate_discounts_zero_subtotal() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create discount
        service
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

        // Create a transaction with zero subtotal
        let mut transaction = pos_core_models::Transaction::new();
        transaction.subtotal = dec!(0.0);

        // Calculate discounts
        let calculations = service
            .calculate_discounts("test-tenant", &transaction)
            .await
            .expect("Failed to calculate discounts");

        assert_eq!(calculations.len(), 1);
        assert_eq!(calculations[0].discount_amount, dec!(0.0));
    }

    #[tokio::test]
    async fn test_calculate_discounts_no_active_discounts() {
        let pool = create_test_pool().await;
        let service = DiscountService::new(pool.clone());

        // Create a test transaction
        let mut transaction = pos_core_models::Transaction::new();
        transaction.subtotal = dec!(100.0);

        // Calculate discounts with no active discounts
        let calculations = service
            .calculate_discounts("test-tenant", &transaction)
            .await
            .expect("Failed to calculate discounts");

        // Should return empty vector
        assert_eq!(calculations.len(), 0);
    }
}

