// Inventory Integration Service
// Integrates approved OCR invoices with inventory system

use sqlx::{SqlitePool, Row};
use serde::{Deserialize, Serialize};
use chrono::Utc;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct InventoryIntegrationService {
    pool: SqlitePool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LineItemData {
    pub sku: String,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub line_total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IntegrationResult {
    pub items_created: usize,
    pub items_updated: usize,
    pub errors: Vec<String>,
}

#[derive(Debug)]
pub enum IntegrationError {
    DatabaseError(String),
    ValidationError(String),
    SkuMappingError(String),
}

impl std::fmt::Display for IntegrationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IntegrationError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            IntegrationError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            IntegrationError::SkuMappingError(msg) => write!(f, "SKU mapping error: {}", msg),
        }
    }
}

impl std::error::Error for IntegrationError {}

impl InventoryIntegrationService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Process approved invoice and create/update inventory items
    pub async fn process_invoice(
        &self,
        _case_id: &str,
        line_items: Vec<LineItemData>,
        tenant_id: &str,
    ) -> Result<IntegrationResult, IntegrationError> {
        let mut items_created = 0;
        let mut items_updated = 0;
        let mut errors = Vec::new();

        // Start transaction
        let mut tx = self.pool.begin().await
            .map_err(|e| IntegrationError::DatabaseError(e.to_string()))?;

        for item in line_items {
            // Validate line item
            if let Err(e) = self.validate_line_item(&item) {
                errors.push(format!("SKU {}: {}", item.sku, e));
                continue;
            }

            // Map vendor SKU to internal SKU if needed
            let internal_sku = match self.map_sku(&item.sku, tenant_id).await {
                Ok(sku) => sku,
                Err(e) => {
                    errors.push(format!("SKU {}: {}", item.sku, e));
                    continue;
                }
            };

            // Check if product exists
            let exists = self.product_exists(&internal_sku, tenant_id, &mut tx).await?;

            if exists {
                // Update existing product
                if let Err(e) = self.update_inventory(&internal_sku, &item, tenant_id, &mut tx).await {
                    errors.push(format!("SKU {}: {}", internal_sku, e));
                    continue;
                }
                items_updated += 1;
            } else {
                // Create new product
                if let Err(e) = self.create_inventory(&internal_sku, &item, tenant_id, &mut tx).await {
                    errors.push(format!("SKU {}: {}", internal_sku, e));
                    continue;
                }
                items_created += 1;
            }
        }

        // Commit transaction if no critical errors
        if errors.is_empty() || items_created > 0 || items_updated > 0 {
            tx.commit().await
                .map_err(|e| IntegrationError::DatabaseError(e.to_string()))?;
        } else {
            tx.rollback().await
                .map_err(|e| IntegrationError::DatabaseError(e.to_string()))?;
        }

        Ok(IntegrationResult {
            items_created,
            items_updated,
            errors,
        })
    }

    /// Validate line item data
    fn validate_line_item(&self, item: &LineItemData) -> Result<(), String> {
        if item.sku.is_empty() {
            return Err("SKU is required".to_string());
        }
        if item.quantity <= 0.0 {
            return Err("Quantity must be positive".to_string());
        }
        if item.unit_price < 0.0 {
            return Err("Unit price cannot be negative".to_string());
        }
        Ok(())
    }

    /// Map vendor SKU to internal SKU
    async fn map_sku(&self, vendor_sku: &str, tenant_id: &str) -> Result<String, String> {
        // Check for SKU alias
        let result = sqlx::query(
            r#"
            SELECT internal_sku
            FROM vendor_sku_aliases
            WHERE vendor_sku_norm = ? AND tenant_id = ?
            "#
        )
        .bind(vendor_sku)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await
        .map_err(|e| format!("Failed to lookup SKU alias: {}", e))?;

        Ok(result
            .and_then(|r| r.try_get::<String, _>("internal_sku").ok())
            .unwrap_or_else(|| vendor_sku.to_string()))
    }

    /// Check if product exists
    async fn product_exists(
        &self,
        sku: &str,
        tenant_id: &str,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    ) -> Result<bool, IntegrationError> {
        let result = sqlx::query(
            r#"
            SELECT COUNT(*) as count
            FROM products
            WHERE sku = ? AND tenant_id = ?
            "#
        )
        .bind(sku)
        .bind(tenant_id)
        .fetch_one(&mut **tx)
        .await
        .map_err(|e| IntegrationError::DatabaseError(e.to_string()))?;

        let count: i32 = result.try_get("count").unwrap_or(0);
        Ok(count > 0)
    }

    /// Create new inventory item
    async fn create_inventory(
        &self,
        sku: &str,
        item: &LineItemData,
        tenant_id: &str,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    ) -> Result<(), String> {
        let product_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO products (
                id, tenant_id, sku, name, category, cost, unit_price, quantity_on_hand,
                store_id, created_at, updated_at, sync_version
            )
            VALUES (?, ?, ?, ?, 'imported', ?, ?, ?, 'default-store', ?, ?, 0)
            "#
        )
        .bind(&product_id)
        .bind(tenant_id)
        .bind(sku)
        .bind(&item.description)
        .bind(item.unit_price)
        .bind(item.unit_price)
        .bind(item.quantity)
        .bind(&now)
        .bind(&now)
        .execute(&mut **tx)
        .await
        .map_err(|e| format!("Failed to create product: {}", e))?;

        Ok(())
    }

    /// Update existing inventory item
    async fn update_inventory(
        &self,
        sku: &str,
        item: &LineItemData,
        tenant_id: &str,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    ) -> Result<(), String> {
        let now = Utc::now().to_rfc3339();

        // Update cost and add to quantity
        sqlx::query(
            r#"
            UPDATE products
            SET cost = ?,
                quantity_on_hand = quantity_on_hand + ?,
                updated_at = ?
            WHERE sku = ? AND tenant_id = ?
            "#
        )
        .bind(item.unit_price)
        .bind(item.quantity)
        .bind(&now)
        .bind(sku)
        .bind(tenant_id)
        .execute(&mut **tx)
        .await
        .map_err(|e| format!("Failed to update product: {}", e))?;

        Ok(())
    }

    /// Rollback inventory changes
    pub async fn rollback_invoice(
        &self,
        case_id: &str,
        _tenant_id: &str,
    ) -> Result<(), IntegrationError> {
        // TODO: Implement rollback logic
        // This would track what was changed and reverse it
        tracing::warn!("Rollback not yet implemented for case: {}", case_id);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_validate_line_item() {
        let service = InventoryIntegrationService::new(
            sqlx::SqlitePool::connect("sqlite::memory:").await.unwrap()
        );

        // Valid item
        let valid_item = LineItemData {
            sku: "TEST-001".to_string(),
            description: "Test Item".to_string(),
            quantity: 10.0,
            unit_price: 5.99,
            line_total: 59.90,
        };
        assert!(service.validate_line_item(&valid_item).is_ok());

        // Invalid: empty SKU
        let invalid_sku = LineItemData {
            sku: "".to_string(),
            description: "Test".to_string(),
            quantity: 1.0,
            unit_price: 1.0,
            line_total: 1.0,
        };
        assert!(service.validate_line_item(&invalid_sku).is_err());

        // Invalid: negative quantity
        let invalid_qty = LineItemData {
            sku: "TEST".to_string(),
            description: "Test".to_string(),
            quantity: -1.0,
            unit_price: 1.0,
            line_total: 1.0,
        };
        assert!(service.validate_line_item(&invalid_qty).is_err());
    }
}
