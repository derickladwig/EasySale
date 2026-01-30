// Accounts Payable Integration Service
// Creates vendor bills from approved OCR invoices

use sqlx::{SqlitePool, Row};
use serde::{Deserialize, Serialize};
use chrono::{Utc, NaiveDate};
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct ApIntegrationService {
    pool: SqlitePool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceData {
    pub invoice_number: String,
    pub invoice_date: NaiveDate,
    pub vendor_name: String,
    pub subtotal: f64,
    pub tax: f64,
    pub total: f64,
    pub due_date: Option<NaiveDate>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BillResult {
    pub bill_id: String,
    pub vendor_id: String,
    pub amount: f64,
}

#[derive(Debug)]
pub enum ApError {
    DatabaseError(String),
    ValidationError(String),
    VendorNotFound(String),
}

impl std::fmt::Display for ApError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ApError::DatabaseError(msg) => write!(f, "Database error: {}", msg),
            ApError::ValidationError(msg) => write!(f, "Validation error: {}", msg),
            ApError::VendorNotFound(msg) => write!(f, "Vendor not found: {}", msg),
        }
    }
}

impl std::error::Error for ApError {}

impl ApIntegrationService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }

    /// Create vendor bill from approved invoice
    pub async fn create_bill(
        &self,
        case_id: &str,
        invoice: InvoiceData,
        tenant_id: &str,
    ) -> Result<BillResult, ApError> {
        // Validate invoice data
        Self::validate_invoice(&invoice)?;

        // Start transaction
        let mut tx = self.pool.begin().await
            .map_err(|e| ApError::DatabaseError(e.to_string()))?;

        // Find or create vendor
        let vendor_id = self.find_or_create_vendor(&invoice.vendor_name, tenant_id, &mut tx).await?;

        // Calculate due date (default to 30 days if not provided)
        let due_date = invoice.due_date.unwrap_or_else(|| {
            invoice.invoice_date + chrono::Duration::days(30)
        });

        // Create bill record
        let bill_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();
        let invoice_date_str = invoice.invoice_date.to_string();
        let due_date_str = due_date.to_string();

        sqlx::query(
            r#"
            INSERT INTO vendor_bills (
                id, tenant_id, vendor_id, invoice_no,
                invoice_date, due_date, subtotal, tax, total,
                status, ocr_case_id, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
            "#
        )
        .bind(&bill_id)
        .bind(tenant_id)
        .bind(&vendor_id)
        .bind(&invoice.invoice_number)
        .bind(&invoice_date_str)
        .bind(&due_date_str)
        .bind(invoice.subtotal)
        .bind(invoice.tax)
        .bind(invoice.total)
        .bind(case_id)
        .bind(&now)
        .bind(&now)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApError::DatabaseError(e.to_string()))?;

        // Update vendor balance
        self.update_vendor_balance(&vendor_id, invoice.total, tenant_id, &mut tx).await?;

        // Commit transaction
        tx.commit().await
            .map_err(|e| ApError::DatabaseError(e.to_string()))?;

        Ok(BillResult {
            bill_id,
            vendor_id,
            amount: invoice.total,
        })
    }

    /// Validate invoice data
    fn validate_invoice(invoice: &InvoiceData) -> Result<(), ApError> {
        if invoice.invoice_number.is_empty() {
            return Err(ApError::ValidationError("Invoice number is required".to_string()));
        }
        if invoice.vendor_name.is_empty() {
            return Err(ApError::ValidationError("Vendor name is required".to_string()));
        }
        if invoice.total <= 0.0 {
            return Err(ApError::ValidationError("Total must be positive".to_string()));
        }
        
        // Validate math: subtotal + tax should equal total (with small tolerance)
        let calculated_total = invoice.subtotal + invoice.tax;
        let diff = (calculated_total - invoice.total).abs();
        if diff > 0.01 {
            return Err(ApError::ValidationError(
                format!("Total mismatch: {} + {} != {}", invoice.subtotal, invoice.tax, invoice.total)
            ));
        }

        Ok(())
    }

    /// Find existing vendor or create new one
    async fn find_or_create_vendor(
        &self,
        vendor_name: &str,
        tenant_id: &str,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    ) -> Result<String, ApError> {
        // Try to find existing vendor
        let result = sqlx::query(
            r#"
            SELECT id
            FROM vendors
            WHERE name = ? AND tenant_id = ?
            "#
        )
        .bind(vendor_name)
        .bind(tenant_id)
        .fetch_optional(&mut **tx)
        .await
        .map_err(|e| ApError::DatabaseError(e.to_string()))?;

        if let Some(vendor) = result {
            let id: String = vendor.try_get("id").unwrap_or_else(|_| Uuid::new_v4().to_string());
            return Ok(id);
        }

        // Create new vendor
        let vendor_id = Uuid::new_v4().to_string();
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            INSERT INTO vendors (
                id, tenant_id, name, balance,
                created_at, updated_at
            )
            VALUES (?, ?, ?, 0.0, ?, ?)
            "#
        )
        .bind(&vendor_id)
        .bind(tenant_id)
        .bind(vendor_name)
        .bind(&now)
        .bind(&now)
        .execute(&mut **tx)
        .await
        .map_err(|e| ApError::DatabaseError(e.to_string()))?;

        Ok(vendor_id)
    }

    /// Update vendor balance
    async fn update_vendor_balance(
        &self,
        vendor_id: &str,
        amount: f64,
        tenant_id: &str,
        tx: &mut sqlx::Transaction<'_, sqlx::Sqlite>,
    ) -> Result<(), ApError> {
        let now = Utc::now().to_rfc3339();

        sqlx::query(
            r#"
            UPDATE vendors
            SET balance = balance + ?,
                updated_at = ?
            WHERE id = ? AND tenant_id = ?
            "#
        )
        .bind(amount)
        .bind(&now)
        .bind(vendor_id)
        .bind(tenant_id)
        .execute(&mut **tx)
        .await
        .map_err(|e| ApError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    /// Rollback bill creation
    pub async fn rollback_bill(
        &self,
        bill_id: &str,
        tenant_id: &str,
    ) -> Result<(), ApError> {
        // Start transaction
        let mut tx = self.pool.begin().await
            .map_err(|e| ApError::DatabaseError(e.to_string()))?;

        // Get bill details
        let bill = sqlx::query(
            r#"
            SELECT vendor_id, total
            FROM vendor_bills
            WHERE id = ? AND tenant_id = ?
            "#
        )
        .bind(bill_id)
        .bind(tenant_id)
        .fetch_optional(&mut *tx)
        .await
        .map_err(|e| ApError::DatabaseError(e.to_string()))?
        .ok_or_else(|| ApError::ValidationError("Bill not found".to_string()))?;

        let vendor_id: String = bill.try_get("vendor_id").map_err(|e| ApError::DatabaseError(e.to_string()))?;
        let total: f64 = bill.try_get("total").map_err(|e| ApError::DatabaseError(e.to_string()))?;

        // Reverse vendor balance
        self.update_vendor_balance(&vendor_id, -total, tenant_id, &mut tx).await?;

        // Delete bill
        sqlx::query(
            r#"
            DELETE FROM vendor_bills
            WHERE id = ? AND tenant_id = ?
            "#
        )
        .bind(bill_id)
        .bind(tenant_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| ApError::DatabaseError(e.to_string()))?;

        // Commit transaction
        tx.commit().await
            .map_err(|e| ApError::DatabaseError(e.to_string()))?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_validate_invoice() {
        // Valid invoice
        let valid = InvoiceData {
            invoice_number: "INV-001".to_string(),
            invoice_date: NaiveDate::from_ymd_opt(2026, 1, 25).unwrap(),
            vendor_name: "Test Vendor".to_string(),
            subtotal: 100.0,
            tax: 10.0,
            total: 110.0,
            due_date: None,
        };
        assert!(ApIntegrationService::validate_invoice(&valid).is_ok());

        // Invalid: empty invoice number
        let invalid_number = InvoiceData {
            invoice_number: "".to_string(),
            invoice_date: NaiveDate::from_ymd_opt(2026, 1, 25).unwrap(),
            vendor_name: "Test".to_string(),
            subtotal: 100.0,
            tax: 10.0,
            total: 110.0,
            due_date: None,
        };
        assert!(ApIntegrationService::validate_invoice(&invalid_number).is_err());

        // Invalid: math doesn't add up
        let invalid_math = InvoiceData {
            invoice_number: "INV-001".to_string(),
            invoice_date: NaiveDate::from_ymd_opt(2026, 1, 25).unwrap(),
            vendor_name: "Test".to_string(),
            subtotal: 100.0,
            tax: 10.0,
            total: 120.0, // Wrong!
            due_date: None,
        };
        assert!(ApIntegrationService::validate_invoice(&invalid_math).is_err());
    }
}
