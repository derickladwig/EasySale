use sqlx::SqlitePool;
use rust_decimal::Decimal;
use pos_core_models::TaxRate;
use thiserror::Error;
use serde::{Deserialize, Serialize};

#[derive(Debug, Error)]
pub enum TaxServiceError {
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Validation error: {0}")]
    ValidationError(String),
    #[error("Not found: {0}")]
    NotFound(String),
}

type Result<T> = std::result::Result<T, TaxServiceError>;

/// Result of a tax calculation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxCalculation {
    /// Tax rate code/ID
    pub rate_code: String,
    /// Tax rate label/name
    pub label: String,
    /// Tax rate percentage
    pub rate_percent: Decimal,
    /// Calculated tax amount
    pub tax_amount: Decimal,
    /// Whether this is a compound tax (applied after other taxes)
    pub is_compound: bool,
}

/// Service for managing tax rates
pub struct TaxService {
    pool: SqlitePool,
}

impl TaxService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Calculate tax for a given amount
    /// 
    /// # Arguments
    /// * `tenant_id` - The tenant ID
    /// * `amount` - The amount to calculate tax on
    /// * `category` - Optional product category for category-specific tax rates
    /// * `location` - Optional customer location (currently unused, reserved for future use)
    /// 
    /// # Returns
    /// A vector of tax calculations, one for each applicable tax rate.
    /// Compound taxes are calculated on the amount plus previous taxes.
    /// 
    /// # Requirements
    /// - Load tax rates from `tax_rules` table
    /// - Support multiple tax rates per transaction
    /// - Calculate tax based on product category
    /// - Support compound tax rates
    pub async fn calculate_tax(
        &self,
        tenant_id: &str,
        amount: Decimal,
        category: Option<&str>,
        _location: Option<&str>,
    ) -> Result<Vec<TaxCalculation>> {
        // Validate input
        if amount < Decimal::ZERO {
            return Err(TaxServiceError::ValidationError(
                "Amount cannot be negative".to_string(),
            ));
        }

        // Load applicable tax rates
        // Priority: category-specific rates, then default rates
        let mut query = String::from(
            "SELECT id, name, rate, category, 0 as is_compound
             FROM tax_rules
             WHERE tenant_id = ? AND is_default = 1"
        );

        // Add category filter if provided
        if category.is_some() {
            query.push_str(" AND (category IS NULL OR category = ?)");
        } else {
            query.push_str(" AND category IS NULL");
        }

        query.push_str(" ORDER BY category DESC, created_at");

        let rows = if let Some(cat) = category {
            sqlx::query_as::<_, (String, String, f64, Option<String>, i32)>(&query)
                .bind(tenant_id)
                .bind(cat)
                .fetch_all(&self.pool)
                .await
        } else {
            sqlx::query_as::<_, (String, String, f64, Option<String>, i32)>(&query)
                .bind(tenant_id)
                .fetch_all(&self.pool)
                .await
        }
        .map_err(|e| TaxServiceError::DatabaseError(format!("Failed to load tax rates: {}", e)))?;

        // Calculate taxes
        let mut calculations = Vec::new();
        let mut running_total = amount;

        for (id, name, rate, _category, is_compound) in rows {
            let rate_percent = Decimal::try_from(rate)
                .map_err(|e| TaxServiceError::ValidationError(format!("Invalid tax rate: {}", e)))?;

            // Calculate tax on the appropriate base
            // Compound taxes are calculated on amount + previous taxes
            let tax_base = if is_compound != 0 {
                running_total
            } else {
                amount
            };

            let tax_amount = tax_base * rate_percent / Decimal::from(100);

            calculations.push(TaxCalculation {
                rate_code: id,
                label: name,
                rate_percent,
                tax_amount,
                is_compound: is_compound != 0,
            });

            // Update running total for compound tax calculations
            if is_compound != 0 {
                running_total += tax_amount;
            } else {
                running_total += tax_amount;
            }
        }

        Ok(calculations)
    }

    /// Load tax rates for a tenant and store
    pub async fn load_tax_rates(
        &self,
        tenant_id: &str,
        store_id: Option<&str>,
    ) -> Result<Vec<TaxRate>> {
        let store_id = store_id.unwrap_or("default");

        let rows = sqlx::query!(
            r#"
            SELECT name, rate, id
            FROM tax_rules
            WHERE tenant_id = ? AND store_id = ? AND is_default = 1
            ORDER BY created_at
            "#,
            tenant_id,
            store_id
        )
        .fetch_all(&self.pool)
        .await
        .map_err(|e| TaxServiceError::DatabaseError(format!("Failed to load tax rates: {}", e)))?;

        let mut tax_rates = Vec::new();
        for row in rows {
            let rate_percent = Decimal::try_from(row.rate)
                .map_err(|e| TaxServiceError::ValidationError(format!("Invalid tax rate: {}", e)))?;

            tax_rates.push(
                TaxRate::new(row.id, rate_percent, row.name)
                    .map_err(|e| TaxServiceError::ValidationError(format!("Invalid tax rate: {}", e)))?
            );
        }

        Ok(tax_rates)
    }

    /// Get default tax rate for a tenant
    pub async fn get_default_tax_rate(
        &self,
        tenant_id: &str,
        store_id: Option<&str>,
    ) -> Result<Option<TaxRate>> {
        let store_id = store_id.unwrap_or("default");

        let row = sqlx::query!(
            r#"
            SELECT name, rate, id
            FROM tax_rules
            WHERE tenant_id = ? AND store_id = ? AND is_default = 1
            LIMIT 1
            "#,
            tenant_id,
            store_id
        )
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| TaxServiceError::DatabaseError(format!("Failed to load default tax rate: {}", e)))?;

        if let Some(row) = row {
            let rate_percent = Decimal::try_from(row.rate)
                .map_err(|e| TaxServiceError::ValidationError(format!("Invalid tax rate: {}", e)))?;

            Ok(Some(
                TaxRate::new(row.id, rate_percent, row.name)
                    .map_err(|e| TaxServiceError::ValidationError(format!("Invalid tax rate: {}", e)))?
            ))
        } else {
            Ok(None)
        }
    }

    /// Create a new tax rate
    pub async fn create_tax_rate(
        &self,
        tenant_id: &str,
        store_id: &str,
        name: &str,
        rate: Decimal,
        is_default: bool,
    ) -> Result<String> {
        let id = uuid::Uuid::new_v4().to_string();
        let rate_f64 = rate.to_string().parse::<f64>()
            .map_err(|e| TaxServiceError::ValidationError(format!("Invalid rate: {}", e)))?;
        let is_default_int = if is_default { 1 } else { 0 };

        sqlx::query!(
            r#"
            INSERT INTO tax_rules (id, tenant_id, store_id, name, rate, is_default)
            VALUES (?, ?, ?, ?, ?, ?)
            "#,
            id,
            tenant_id,
            store_id,
            name,
            rate_f64,
            is_default_int
        )
        .execute(&self.pool)
        .await
        .map_err(|e| TaxServiceError::DatabaseError(format!("Failed to create tax rate: {}", e)))?;

        Ok(id)
    }

    /// Update an existing tax rate
    pub async fn update_tax_rate(
        &self,
        id: &str,
        name: &str,
        rate: Decimal,
        is_default: bool,
    ) -> Result<()> {
        let rate_f64 = rate.to_string().parse::<f64>()
            .map_err(|e| TaxServiceError::ValidationError(format!("Invalid rate: {}", e)))?;
        let is_default_int = if is_default { 1 } else { 0 };

        let result = sqlx::query!(
            r#"
            UPDATE tax_rules
            SET name = ?, rate = ?, is_default = ?, updated_at = datetime('now')
            WHERE id = ?
            "#,
            name,
            rate_f64,
            is_default_int,
            id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| TaxServiceError::DatabaseError(format!("Failed to update tax rate: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(TaxServiceError::NotFound(format!("Tax rate not found: {}", id)));
        }

        Ok(())
    }

    /// Delete a tax rate
    pub async fn delete_tax_rate(&self, id: &str) -> Result<()> {
        let result = sqlx::query!(
            r#"
            DELETE FROM tax_rules WHERE id = ?
            "#,
            id
        )
        .execute(&self.pool)
        .await
        .map_err(|e| TaxServiceError::DatabaseError(format!("Failed to delete tax rate: {}", e)))?;

        if result.rows_affected() == 0 {
            return Err(TaxServiceError::NotFound(format!("Tax rate not found: {}", id)));
        }

        Ok(())
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
            "CREATE TABLE tax_rules (
                id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                store_id TEXT NOT NULL DEFAULT 'default',
                name TEXT NOT NULL,
                rate REAL NOT NULL,
                category TEXT,
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now')),
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
    async fn test_create_and_load_tax_rates() {
        let pool = create_test_pool().await;
        let service = TaxService::new(pool.clone());

        // Create tax rate
        let id = service
            .create_tax_rate("test-tenant", "default", "Sales Tax", dec!(8.5), true)
            .await
            .expect("Failed to create tax rate");

        // Load tax rates
        let rates = service
            .load_tax_rates("test-tenant", Some("default"))
            .await
            .expect("Failed to load tax rates");

        assert_eq!(rates.len(), 1);
        assert_eq!(rates[0].rate_code, id);
        assert_eq!(rates[0].rate_percent, dec!(8.5));
        assert_eq!(rates[0].label, "Sales Tax");
    }

    #[tokio::test]
    async fn test_get_default_tax_rate() {
        let pool = create_test_pool().await;
        let service = TaxService::new(pool.clone());

        // Create default tax rate
        service
            .create_tax_rate("test-tenant", "default", "Default Tax", dec!(13.0), true)
            .await
            .expect("Failed to create tax rate");

        // Get default tax rate
        let rate = service
            .get_default_tax_rate("test-tenant", Some("default"))
            .await
            .expect("Failed to get default tax rate");

        assert!(rate.is_some());
        let rate = rate.unwrap();
        assert_eq!(rate.rate_percent, dec!(13.0));
        assert_eq!(rate.label, "Default Tax");
    }

    #[tokio::test]
    async fn test_update_tax_rate() {
        let pool = create_test_pool().await;
        let service = TaxService::new(pool.clone());

        // Create tax rate
        let id = service
            .create_tax_rate("test-tenant", "default", "Sales Tax", dec!(8.5), true)
            .await
            .expect("Failed to create tax rate");

        // Update tax rate
        service
            .update_tax_rate(&id, "Updated Tax", dec!(9.0), true)
            .await
            .expect("Failed to update tax rate");

        // Verify update
        let rates = service
            .load_tax_rates("test-tenant", Some("default"))
            .await
            .expect("Failed to load tax rates");

        assert_eq!(rates.len(), 1);
        assert_eq!(rates[0].rate_percent, dec!(9.0));
        assert_eq!(rates[0].label, "Updated Tax");
    }

    #[tokio::test]
    async fn test_delete_tax_rate() {
        let pool = create_test_pool().await;
        let service = TaxService::new(pool.clone());

        // Create tax rate
        let id = service
            .create_tax_rate("test-tenant", "default", "Sales Tax", dec!(8.5), true)
            .await
            .expect("Failed to create tax rate");

        // Delete tax rate
        service
            .delete_tax_rate(&id)
            .await
            .expect("Failed to delete tax rate");

        // Verify deletion
        let rates = service
            .load_tax_rates("test-tenant", Some("default"))
            .await
            .expect("Failed to load tax rates");

        assert_eq!(rates.len(), 0);
    }

    #[tokio::test]
    async fn test_calculate_tax_single_rate() {
        let pool = create_test_pool().await;
        let service = TaxService::new(pool.clone());

        // Create tax rate
        service
            .create_tax_rate("test-tenant", "default", "Sales Tax", dec!(10.0), true)
            .await
            .expect("Failed to create tax rate");

        // Calculate tax on $100
        let calculations = service
            .calculate_tax("test-tenant", dec!(100.0), None, None)
            .await
            .expect("Failed to calculate tax");

        assert_eq!(calculations.len(), 1);
        assert_eq!(calculations[0].rate_percent, dec!(10.0));
        assert_eq!(calculations[0].tax_amount, dec!(10.0)); // 10% of 100
        assert_eq!(calculations[0].label, "Sales Tax");
        assert!(!calculations[0].is_compound);
    }

    #[tokio::test]
    async fn test_calculate_tax_multiple_rates() {
        let pool = create_test_pool().await;
        let service = TaxService::new(pool.clone());

        // Create multiple tax rates
        service
            .create_tax_rate("test-tenant", "default", "GST", dec!(5.0), true)
            .await
            .expect("Failed to create GST");

        service
            .create_tax_rate("test-tenant", "default", "PST", dec!(7.0), true)
            .await
            .expect("Failed to create PST");

        // Calculate tax on $100
        let calculations = service
            .calculate_tax("test-tenant", dec!(100.0), None, None)
            .await
            .expect("Failed to calculate tax");

        assert_eq!(calculations.len(), 2);
        
        // Total tax should be 12% (5% + 7%)
        let total_tax: Decimal = calculations.iter().map(|c| c.tax_amount).sum();
        assert_eq!(total_tax, dec!(12.0));
    }

    #[tokio::test]
    async fn test_calculate_tax_with_category() {
        let pool = create_test_pool().await;
        let service = TaxService::new(pool.clone());

        // Create default tax rate
        service
            .create_tax_rate("test-tenant", "default", "Default Tax", dec!(10.0), true)
            .await
            .expect("Failed to create default tax");

        // Create category-specific tax rate
        let id = uuid::Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO tax_rules (id, tenant_id, store_id, name, rate, category, is_default)
             VALUES (?, 'test-tenant', 'default', 'Alcohol Tax', 15.0, 'alcohol', 1)"
        )
        .bind(&id)
        .execute(&pool)
        .await
        .expect("Failed to insert category tax");

        // Calculate tax for alcohol category
        let calculations = service
            .calculate_tax("test-tenant", dec!(100.0), Some("alcohol"), None)
            .await
            .expect("Failed to calculate tax");

        // Should get category-specific rate
        assert!(calculations.iter().any(|c| c.label == "Alcohol Tax"));
    }

    #[tokio::test]
    async fn test_calculate_tax_negative_amount_error() {
        let pool = create_test_pool().await;
        let service = TaxService::new(pool.clone());

        // Try to calculate tax on negative amount
        let result = service
            .calculate_tax("test-tenant", dec!(-100.0), None, None)
            .await;

        assert!(result.is_err());
        match result {
            Err(TaxServiceError::ValidationError(msg)) => {
                assert!(msg.contains("negative"));
            }
            _ => panic!("Expected ValidationError"),
        }
    }

    #[tokio::test]
    async fn test_calculate_tax_zero_amount() {
        let pool = create_test_pool().await;
        let service = TaxService::new(pool.clone());

        // Create tax rate
        service
            .create_tax_rate("test-tenant", "default", "Sales Tax", dec!(10.0), true)
            .await
            .expect("Failed to create tax rate");

        // Calculate tax on $0
        let calculations = service
            .calculate_tax("test-tenant", dec!(0.0), None, None)
            .await
            .expect("Failed to calculate tax");

        assert_eq!(calculations.len(), 1);
        assert_eq!(calculations[0].tax_amount, dec!(0.0));
    }

    #[tokio::test]
    async fn test_calculate_tax_no_rates() {
        let pool = create_test_pool().await;
        let service = TaxService::new(pool.clone());

        // Calculate tax with no tax rates configured
        let calculations = service
            .calculate_tax("test-tenant", dec!(100.0), None, None)
            .await
            .expect("Failed to calculate tax");

        // Should return empty vector
        assert_eq!(calculations.len(), 0);
    }
}
