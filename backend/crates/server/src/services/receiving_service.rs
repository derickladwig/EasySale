/**
 * ReceivingService
 * 
 * Handles posting vendor bill receiving transactions to inventory
 * Requirements: 11.1, 11.2, 12.1, 12.2, 12.3, 12.6, 12.7, 13.1, 13.2, 13.3, 13.4
 */

use crate::models::vendor::{VendorBill, VendorBillLine};
use crate::models::product::Product;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

#[allow(dead_code)] // Planned feature
pub struct ReceivingService {
    pool: SqlitePool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceivingSummary {
    pub bill_id: String,
    pub lines_posted: usize,
    pub total_items: f64,
    pub total_cost: f64,
    pub posted_at: String,
    pub posted_by: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub field: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CostPolicy {
    AverageCost,
    LastCost,
    VendorCost,
    NoUpdate,
}

impl CostPolicy {
    pub fn from_str(s: &str) -> Result<Self, String> {
        match s.to_lowercase().as_str() {
            "average_cost" => Ok(CostPolicy::AverageCost),
            "last_cost" => Ok(CostPolicy::LastCost),
            "vendor_cost" => Ok(CostPolicy::VendorCost),
            "no_update" => Ok(CostPolicy::NoUpdate),
            _ => Err(format!("Invalid cost policy: {}", s)),
        }
    }
}

impl ReceivingService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Validate bill is ready for posting
    /// Requirements: 11.1, 11.2, 12.7
    pub async fn validate_for_posting(
        &self,
        bill_id: &str,
        tenant_id: &str,
    ) -> Result<Vec<ValidationError>, sqlx::Error> {
        let mut errors = Vec::new();

        // Get bill
        let bill = sqlx::query_as::<_, VendorBill>(
            "SELECT * FROM vendor_bills WHERE id = ? AND tenant_id = ?"
        )
        .bind(bill_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?;

        let bill = match bill {
            Some(b) => b,
            None => {
                errors.push(ValidationError {
                    field: "bill_id".to_string(),
                    message: "Bill not found".to_string(),
                });
                return Ok(errors);
            }
        };

        // Check status
        if bill.status != "REVIEW" {
            errors.push(ValidationError {
                field: "status".to_string(),
                message: format!("Bill status must be REVIEW, current status: {}", bill.status),
            });
        }

        // Check if already posted
        if bill.posted_at.is_some() {
            errors.push(ValidationError {
                field: "posted_at".to_string(),
                message: "Bill has already been posted".to_string(),
            });
        }

        // Get lines
        let lines = sqlx::query_as::<_, VendorBillLine>(
            "SELECT * FROM vendor_bill_lines WHERE vendor_bill_id = ? ORDER BY line_no"
        )
        .bind(bill_id)
        .fetch_all(&self.pool)
        .await?;

        if lines.is_empty() {
            errors.push(ValidationError {
                field: "lines".to_string(),
                message: "Bill has no line items".to_string(),
            });
            return Ok(errors);
        }

        // Check all lines have matched SKUs
        for line in &lines {
            if line.matched_sku.is_none() || line.matched_sku.as_ref().unwrap().is_empty() {
                errors.push(ValidationError {
                    field: format!("line_{}", line.line_no),
                    message: format!("Line {} has no matched SKU", line.line_no),
                });
            }

            // Check quantities are positive
            if line.normalized_qty <= 0.0 {
                errors.push(ValidationError {
                    field: format!("line_{}_qty", line.line_no),
                    message: format!("Line {} has invalid quantity: {}", line.line_no, line.normalized_qty),
                });
            }
        }

        // Check for duplicate invoice (idempotency)
        let duplicate_count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*) FROM vendor_bills
            WHERE vendor_id = ? AND invoice_no = ? AND invoice_date = ?
            AND status = 'POSTED' AND tenant_id = ? AND id != ?
            "#
        )
        .bind(&bill.vendor_id)
        .bind(&bill.invoice_no)
        .bind(&bill.invoice_date)
        .bind(tenant_id)
        .bind(bill_id)
        .fetch_one(&self.pool)
        .await?;

        if duplicate_count > 0 {
            errors.push(ValidationError {
                field: "invoice_no".to_string(),
                message: format!(
                    "Duplicate invoice: {} from vendor {} on {} has already been posted",
                    bill.invoice_no, bill.vendor_id, bill.invoice_date
                ),
            });
        }

        Ok(errors)
    }

    /// Post receiving transaction
    /// Requirements: 12.1, 12.2, 12.3, 12.6
    pub async fn post_receiving(
        &self,
        bill_id: &str,
        tenant_id: &str,
        user_id: &str,
        cost_policy: CostPolicy,
    ) -> Result<ReceivingSummary, Box<dyn std::error::Error>> {
        // Validate first
        let validation_errors = self.validate_for_posting(bill_id, tenant_id).await?;
        if !validation_errors.is_empty() {
            return Err(format!("Validation failed: {:?}", validation_errors).into());
        }

        // Begin transaction
        let mut tx = self.pool.begin().await?;

        // Get bill
        let bill = sqlx::query_as::<_, VendorBill>(
            "SELECT * FROM vendor_bills WHERE id = ? AND tenant_id = ?"
        )
        .bind(bill_id)
        .bind(tenant_id)
        .fetch_one(&mut *tx)
        .await?;

        // Get lines
        let lines = sqlx::query_as::<_, VendorBillLine>(
            "SELECT * FROM vendor_bill_lines WHERE vendor_bill_id = ? ORDER BY line_no"
        )
        .bind(bill_id)
        .fetch_all(&mut *tx)
        .await?;

        let now = Utc::now().to_rfc3339();
        let mut total_items = 0.0;
        let mut total_cost = 0.0;

        // Process each line
        for line in &lines {
            let matched_sku = line.matched_sku.as_ref().unwrap();
            
            // Get current product
            let product = sqlx::query_as::<_, Product>(
                "SELECT * FROM products WHERE sku = ? AND tenant_id = ?"
            )
            .bind(matched_sku)
            .bind(tenant_id)
            .fetch_optional(&mut *tx)
            .await?;

            let product = match product {
                Some(p) => p,
                None => {
                    return Err(format!("Product not found: {}", matched_sku).into());
                }
            };

            // Calculate new cost based on policy
            let new_cost = self.calculate_new_cost(
                &cost_policy,
                product.cost,
                line.unit_price,
                product.quantity_on_hand,
                line.normalized_qty,
            );

            // Update product quantity and cost
            let new_quantity = product.quantity_on_hand + line.normalized_qty;
            
            sqlx::query(
                r#"
                UPDATE products
                SET quantity_on_hand = ?,
                    cost = ?,
                    updated_at = ?,
                    sync_version = sync_version + 1
                WHERE sku = ? AND tenant_id = ?
                "#
            )
            .bind(new_quantity)
            .bind(new_cost)
            .bind(&now)
            .bind(matched_sku)
            .bind(tenant_id)
            .execute(&mut *tx)
            .await?;

            // Create audit log entry
            sqlx::query(
                r#"
                INSERT INTO audit_log (
                    id, entity_type, entity_id, action, user_id,
                    changes, tenant_id, store_id, created_at
                )
                VALUES (?, 'product', ?, 'receiving', ?, ?, ?, ?, ?)
                "#
            )
            .bind(uuid::Uuid::new_v4().to_string())
            .bind(&product.id)
            .bind(user_id)
            .bind(serde_json::json!({
                "bill_id": bill_id,
                "vendor_bill_line_id": line.id,
                "vendor_sku": line.vendor_sku_raw,
                "internal_sku": matched_sku,
                "quantity_change": line.normalized_qty,
                "old_quantity": product.quantity_on_hand,
                "new_quantity": new_quantity,
                "old_cost": product.cost,
                "new_cost": new_cost,
                "unit_price": line.unit_price,
                "cost_policy": format!("{:?}", cost_policy),
            }).to_string())
            .bind(tenant_id)
            .bind(&bill.store_id)
            .bind(&now)
            .execute(&mut *tx)
            .await?;

            // Update vendor SKU alias usage stats
            sqlx::query(
                r#"
                UPDATE vendor_sku_aliases
                SET usage_count = usage_count + 1,
                    last_seen_at = ?
                WHERE vendor_id = ? AND vendor_sku_norm = ? AND internal_sku = ? AND tenant_id = ?
                "#
            )
            .bind(&now)
            .bind(&bill.vendor_id)
            .bind(&line.vendor_sku_norm)
            .bind(matched_sku)
            .bind(tenant_id)
            .execute(&mut *tx)
            .await
            .ok(); // Ignore if alias doesn't exist

            total_items += line.normalized_qty;
            total_cost += line.ext_price;
        }

        // Update bill status
        sqlx::query(
            r#"
            UPDATE vendor_bills
            SET status = 'POSTED',
                posted_at = ?,
                posted_by = ?,
                updated_at = ?
            WHERE id = ? AND tenant_id = ?
            "#
        )
        .bind(&now)
        .bind(user_id)
        .bind(&now)
        .bind(bill_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await?;

        // Create audit log for bill posting
        sqlx::query(
            r#"
            INSERT INTO audit_log (
                id, entity_type, entity_id, action, user_id,
                changes, tenant_id, store_id, created_at
            )
            VALUES (?, 'vendor_bill', ?, 'post_receiving', ?, ?, ?, ?, ?)
            "#
        )
        .bind(uuid::Uuid::new_v4().to_string())
        .bind(bill_id)
        .bind(user_id)
        .bind(serde_json::json!({
            "vendor_id": bill.vendor_id,
            "invoice_no": bill.invoice_no,
            "invoice_date": bill.invoice_date,
            "total": bill.total,
            "lines_posted": lines.len(),
            "total_items": total_items,
            "total_cost": total_cost,
        }).to_string())
        .bind(tenant_id)
        .bind(&bill.store_id)
        .bind(&now)
        .execute(&mut *tx)
        .await?;

        // Commit transaction
        tx.commit().await?;

        Ok(ReceivingSummary {
            bill_id: bill_id.to_string(),
            lines_posted: lines.len(),
            total_items,
            total_cost,
            posted_at: now.clone(),
            posted_by: user_id.to_string(),
        })
    }

    /// Calculate new cost based on policy
    /// Requirements: 13.1, 13.2, 13.3, 13.4
    fn calculate_new_cost(
        &self,
        policy: &CostPolicy,
        current_cost: f64,
        vendor_cost: f64,
        current_qty: f64,
        received_qty: f64,
    ) -> f64 {
        match policy {
            CostPolicy::AverageCost => {
                // Weighted average: (current_cost * current_qty + vendor_cost * received_qty) / (current_qty + received_qty)
                if current_qty + received_qty == 0.0 {
                    vendor_cost
                } else {
                    ((current_cost * current_qty) + (vendor_cost * received_qty)) / (current_qty + received_qty)
                }
            }
            CostPolicy::LastCost => {
                // Use the most recent vendor cost
                vendor_cost
            }
            CostPolicy::VendorCost => {
                // Always use vendor cost
                vendor_cost
            }
            CostPolicy::NoUpdate => {
                // Keep current cost
                current_cost
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_calculate_new_cost_average() {
        let service = ReceivingService {
            pool: sqlx::SqlitePool::connect(":memory:").await.unwrap(),
        };

        // Current: 10 units @ $5 = $50
        // Receiving: 5 units @ $6 = $30
        // Average: $80 / 15 = $5.33
        let new_cost = service.calculate_new_cost(
            &CostPolicy::AverageCost,
            5.0,
            6.0,
            10.0,
            5.0,
        );
        assert!((new_cost - 5.333).abs() < 0.01);
    }

    #[tokio::test]
    async fn test_calculate_new_cost_last() {
        let service = ReceivingService {
            pool: sqlx::SqlitePool::connect(":memory:").await.unwrap(),
        };

        let new_cost = service.calculate_new_cost(
            &CostPolicy::LastCost,
            5.0,
            6.0,
            10.0,
            5.0,
        );
        assert_eq!(new_cost, 6.0);
    }

    #[tokio::test]
    async fn test_calculate_new_cost_no_update() {
        let service = ReceivingService {
            pool: sqlx::SqlitePool::connect(":memory:").await.unwrap(),
        };

        let new_cost = service.calculate_new_cost(
            &CostPolicy::NoUpdate,
            5.0,
            6.0,
            10.0,
            5.0,
        );
        assert_eq!(new_cost, 5.0);
    }

    #[test]
    fn test_cost_policy_from_str() {
        assert!(matches!(
            CostPolicy::from_str("average_cost").unwrap(),
            CostPolicy::AverageCost
        ));
        assert!(matches!(
            CostPolicy::from_str("last_cost").unwrap(),
            CostPolicy::LastCost
        ));
        assert!(matches!(
            CostPolicy::from_str("vendor_cost").unwrap(),
            CostPolicy::VendorCost
        ));
        assert!(matches!(
            CostPolicy::from_str("no_update").unwrap(),
            CostPolicy::NoUpdate
        ));
        assert!(CostPolicy::from_str("invalid").is_err());
    }
}
