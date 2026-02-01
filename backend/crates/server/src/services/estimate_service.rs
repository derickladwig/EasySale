//! Estimate Service
//!
//! Handles estimate creation, PDF generation, and conversion to invoices/work orders.
//!
//! Requirements:
//! - 2.5: Estimate Generation (HIGH)
//! - Create and manage estimates
//! - Generate PDF exports with tenant branding
//! - Convert estimates to invoices or work orders

use sqlx::{SqlitePool, Row};
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;
use chrono::Utc;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error};
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum EstimateError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),
    
    #[error("Estimate not found: {0}")]
    EstimateNotFound(String),
    
    #[error("Customer not found: {0}")]
    CustomerNotFound(String),
    
    #[error("Invalid estimate state: {0}")]
    InvalidState(String),
    
    #[error("Estimate already converted")]
    AlreadyConverted,
    
    #[error("Estimate expired")]
    Expired,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Estimate {
    pub id: String,
    pub tenant_id: String,
    pub estimate_number: String,
    pub customer_id: String,
    pub estimate_date: String,
    pub expiration_date: Option<String>,
    pub subtotal: Decimal,
    pub tax_amount: Decimal,
    pub discount_amount: Decimal,
    pub total_amount: Decimal,
    pub status: String, // draft, sent, accepted, rejected, expired, converted
    pub terms: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub created_by: Option<String>,
    pub converted_to_invoice_id: Option<String>,
    pub converted_to_work_order_id: Option<String>,
    pub store_id: String,
    pub sync_version: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EstimateLineItem {
    pub id: String,
    pub estimate_id: String,
    pub product_id: Option<String>,
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub tax_rate: Decimal,
    pub discount_rate: Decimal,
    pub line_total: Decimal,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateEstimateRequest {
    pub customer_id: String,
    pub estimate_date: String,
    pub expiration_date: Option<String>,
    pub terms: Option<String>,
    pub notes: Option<String>,
    pub line_items: Vec<CreateEstimateLineItem>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEstimateLineItem {
    pub product_id: Option<String>,
    pub description: String,
    pub quantity: Decimal,
    pub unit_price: Decimal,
    pub tax_rate: Option<Decimal>,
    pub discount_rate: Option<Decimal>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEstimateRequest {
    pub customer_id: Option<String>,
    pub estimate_date: Option<String>,
    pub expiration_date: Option<String>,
    pub status: Option<String>,
    pub terms: Option<String>,
    pub notes: Option<String>,
    pub line_items: Option<Vec<CreateEstimateLineItem>>,
}

pub struct EstimateService {
    pool: SqlitePool,
}

impl EstimateService {
    pub fn new(pool: SqlitePool) -> Self {
        Self { pool }
    }
    
    /// Generate next estimate number
    /// Format: EST-YYYYMMDD-NNNN
    async fn generate_estimate_number(
        &self,
        tenant_id: &str,
    ) -> Result<String, EstimateError> {
        let today = Utc::now().format("%Y%m%d").to_string();
        
        // Get count of estimates created today
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM estimates 
             WHERE tenant_id = ? AND estimate_number LIKE ?",
        )
        .bind(tenant_id)
        .bind(format!("EST-{}-%%", today))
        .fetch_one(&self.pool)
        .await?;
        
        let sequence = count + 1;
        Ok(format!("EST-{}-{:04}", today, sequence))
    }
    
    /// Create a new estimate
    pub async fn create_estimate(
        &self,
        tenant_id: &str,
        store_id: &str,
        user_id: Option<&str>,
        request: CreateEstimateRequest,
    ) -> Result<Estimate, EstimateError> {
        info!(
            tenant_id = %tenant_id,
            customer_id = %request.customer_id,
            "Creating new estimate"
        );
        
        // Verify customer exists
        let customer_exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM customers WHERE id = ? AND tenant_id = ?)",
        )
        .bind(&request.customer_id)
        .bind(tenant_id)
        .fetch_one(&self.pool)
        .await?;
        
        if !customer_exists {
            return Err(EstimateError::CustomerNotFound(request.customer_id.clone()));
        }
        
        // Generate estimate number
        let estimate_number = self.generate_estimate_number(tenant_id).await?;
        let estimate_id = Uuid::new_v4().to_string();
        
        // Calculate totals
        let mut subtotal = Decimal::ZERO;
        let mut tax_amount = Decimal::ZERO;
        let mut discount_amount = Decimal::ZERO;
        
        for item in &request.line_items {
            let line_subtotal = item.quantity * item.unit_price;
            let discount = line_subtotal * item.discount_rate.unwrap_or(Decimal::ZERO);
            let taxable_amount = line_subtotal - discount;
            let tax = taxable_amount * item.tax_rate.unwrap_or(Decimal::ZERO);
            
            subtotal += line_subtotal;
            discount_amount += discount;
            tax_amount += tax;
        }
        
        let total_amount = subtotal - discount_amount + tax_amount;
        
        // Start transaction
        let mut tx = self.pool.begin().await?;
        
        // Insert estimate
        sqlx::query(
            "INSERT INTO estimates (
                id, tenant_id, estimate_number, customer_id, estimate_date,
                expiration_date, subtotal, tax_amount, discount_amount, total_amount,
                status, terms, notes, created_by, store_id, sync_version
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, 0)",
        )
        .bind(&estimate_id)
        .bind(tenant_id)
        .bind(&estimate_number)
        .bind(&request.customer_id)
        .bind(&request.estimate_date)
        .bind(&request.expiration_date)
        .bind(subtotal.to_f64().unwrap_or(0.0))
        .bind(tax_amount.to_f64().unwrap_or(0.0))
        .bind(discount_amount.to_f64().unwrap_or(0.0))
        .bind(total_amount.to_f64().unwrap_or(0.0))
        .bind(&request.terms)
        .bind(&request.notes)
        .bind(user_id)
        .bind(store_id)
        .execute(&mut *tx)
        .await?;
        
        // Insert line items
        for item in &request.line_items {
            let line_id = Uuid::new_v4().to_string();
            let line_subtotal = item.quantity * item.unit_price;
            let discount = line_subtotal * item.discount_rate.unwrap_or(Decimal::ZERO);
            let taxable_amount = line_subtotal - discount;
            let tax = taxable_amount * item.tax_rate.unwrap_or(Decimal::ZERO);
            let line_total = taxable_amount + tax;
            
            sqlx::query(
                "INSERT INTO estimate_line_items (
                    id, estimate_id, product_id, description, quantity,
                    unit_price, tax_rate, discount_rate, line_total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&line_id)
            .bind(&estimate_id)
            .bind(&item.product_id)
            .bind(&item.description)
            .bind(item.quantity.to_f64().unwrap_or(0.0))
            .bind(item.unit_price.to_f64().unwrap_or(0.0))
            .bind(item.tax_rate.unwrap_or(Decimal::ZERO).to_f64().unwrap_or(0.0))
            .bind(item.discount_rate.unwrap_or(Decimal::ZERO).to_f64().unwrap_or(0.0))
            .bind(line_total.to_f64().unwrap_or(0.0))
            .execute(&mut *tx)
            .await?;
        }
        
        tx.commit().await?;
        
        info!(
            estimate_id = %estimate_id,
            estimate_number = %estimate_number,
            "Successfully created estimate"
        );
        
        // Fetch and return the created estimate
        self.get_estimate(tenant_id, &estimate_id).await
    }
    
    /// Get estimate by ID
    pub async fn get_estimate(
        &self,
        tenant_id: &str,
        estimate_id: &str,
    ) -> Result<Estimate, EstimateError> {
        let estimate = sqlx::query_as::<_, Estimate>(
            "SELECT * FROM estimates WHERE id = ? AND tenant_id = ?",
        )
        .bind(estimate_id)
        .bind(tenant_id)
        .fetch_optional(&self.pool)
        .await?
        .ok_or_else(|| EstimateError::EstimateNotFound(estimate_id.to_string()))?;
        
        Ok(estimate)
    }
    
    /// Get estimate line items
    pub async fn get_estimate_line_items(
        &self,
        estimate_id: &str,
    ) -> Result<Vec<EstimateLineItem>, EstimateError> {
        let items = sqlx::query_as::<_, EstimateLineItem>(
            "SELECT * FROM estimate_line_items WHERE estimate_id = ? ORDER BY created_at",
        )
        .bind(estimate_id)
        .fetch_all(&self.pool)
        .await?;
        
        Ok(items)
    }
    
    /// List estimates with optional filters
    pub async fn list_estimates(
        &self,
        tenant_id: &str,
        customer_id: Option<&str>,
        status: Option<&str>,
        limit: Option<i64>,
        offset: Option<i64>,
    ) -> Result<Vec<Estimate>, EstimateError> {
        let mut query = String::from("SELECT * FROM estimates WHERE tenant_id = ?");
        let mut bindings = vec![tenant_id.to_string()];
        
        if let Some(cid) = customer_id {
            query.push_str(" AND customer_id = ?");
            bindings.push(cid.to_string());
        }
        
        if let Some(s) = status {
            query.push_str(" AND status = ?");
            bindings.push(s.to_string());
        }
        
        query.push_str(" ORDER BY estimate_date DESC, created_at DESC");
        
        if let Some(l) = limit {
            query.push_str(&format!(" LIMIT {}", l));
        }
        
        if let Some(o) = offset {
            query.push_str(&format!(" OFFSET {}", o));
        }
        
        let mut q = sqlx::query_as::<_, Estimate>(&query);
        for binding in bindings {
            q = q.bind(binding);
        }
        
        let estimates = q.fetch_all(&self.pool).await?;
        Ok(estimates)
    }
    
    /// Update estimate
    pub async fn update_estimate(
        &self,
        tenant_id: &str,
        estimate_id: &str,
        request: UpdateEstimateRequest,
    ) -> Result<Estimate, EstimateError> {
        info!(
            tenant_id = %tenant_id,
            estimate_id = %estimate_id,
            "Updating estimate"
        );
        
        // Verify estimate exists
        let estimate = self.get_estimate(tenant_id, estimate_id).await?;
        
        // Check if estimate can be updated
        if estimate.status == "converted" {
            return Err(EstimateError::AlreadyConverted);
        }
        
        let mut tx = self.pool.begin().await?;
        
        // Update estimate fields
        if let Some(customer_id) = &request.customer_id {
            sqlx::query("UPDATE estimates SET customer_id = ? WHERE id = ?")
                .bind(customer_id)
                .bind(estimate_id)
                .execute(&mut *tx)
                .await?;
        }
        
        if let Some(estimate_date) = &request.estimate_date {
            sqlx::query("UPDATE estimates SET estimate_date = ? WHERE id = ?")
                .bind(estimate_date)
                .bind(estimate_id)
                .execute(&mut *tx)
                .await?;
        }
        
        if let Some(expiration_date) = &request.expiration_date {
            sqlx::query("UPDATE estimates SET expiration_date = ? WHERE id = ?")
                .bind(expiration_date)
                .bind(estimate_id)
                .execute(&mut *tx)
                .await?;
        }
        
        if let Some(status) = &request.status {
            sqlx::query("UPDATE estimates SET status = ? WHERE id = ?")
                .bind(status)
                .bind(estimate_id)
                .execute(&mut *tx)
                .await?;
        }
        
        if let Some(terms) = &request.terms {
            sqlx::query("UPDATE estimates SET terms = ? WHERE id = ?")
                .bind(terms)
                .bind(estimate_id)
                .execute(&mut *tx)
                .await?;
        }
        
        if let Some(notes) = &request.notes {
            sqlx::query("UPDATE estimates SET notes = ? WHERE id = ?")
                .bind(notes)
                .bind(estimate_id)
                .execute(&mut *tx)
                .await?;
        }
        
        // Update line items if provided
        if let Some(line_items) = &request.line_items {
            // Delete existing line items
            sqlx::query("DELETE FROM estimate_line_items WHERE estimate_id = ?")
                .bind(estimate_id)
                .execute(&mut *tx)
                .await?;
            
            // Recalculate totals
            let mut subtotal = Decimal::ZERO;
            let mut tax_amount = Decimal::ZERO;
            let mut discount_amount = Decimal::ZERO;
            
            for item in line_items {
                let line_subtotal = item.quantity * item.unit_price;
                let discount = line_subtotal * item.discount_rate.unwrap_or(Decimal::ZERO);
                let taxable_amount = line_subtotal - discount;
                let tax = taxable_amount * item.tax_rate.unwrap_or(Decimal::ZERO);
                
                subtotal += line_subtotal;
                discount_amount += discount;
                tax_amount += tax;
            }
            
            let total_amount = subtotal - discount_amount + tax_amount;
            
            // Update totals
            sqlx::query(
                "UPDATE estimates SET subtotal = ?, tax_amount = ?, discount_amount = ?, total_amount = ? WHERE id = ?",
            )
            .bind(subtotal.to_f64().unwrap_or(0.0))
            .bind(tax_amount.to_f64().unwrap_or(0.0))
            .bind(discount_amount.to_f64().unwrap_or(0.0))
            .bind(total_amount.to_f64().unwrap_or(0.0))
            .bind(estimate_id)
            .execute(&mut *tx)
            .await?;
            
            // Insert new line items
            for item in line_items {
                let line_id = Uuid::new_v4().to_string();
                let line_subtotal = item.quantity * item.unit_price;
                let discount = line_subtotal * item.discount_rate.unwrap_or(Decimal::ZERO);
                let taxable_amount = line_subtotal - discount;
                let tax = taxable_amount * item.tax_rate.unwrap_or(Decimal::ZERO);
                let line_total = taxable_amount + tax;
                
                sqlx::query(
                    "INSERT INTO estimate_line_items (
                        id, estimate_id, product_id, description, quantity,
                        unit_price, tax_rate, discount_rate, line_total
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                )
                .bind(&line_id)
                .bind(estimate_id)
                .bind(&item.product_id)
                .bind(&item.description)
                .bind(item.quantity.to_f64().unwrap_or(0.0))
                .bind(item.unit_price.to_f64().unwrap_or(0.0))
                .bind(item.tax_rate.unwrap_or(Decimal::ZERO).to_f64().unwrap_or(0.0))
                .bind(item.discount_rate.unwrap_or(Decimal::ZERO).to_f64().unwrap_or(0.0))
                .bind(line_total.to_f64().unwrap_or(0.0))
                .execute(&mut *tx)
                .await?;
            }
        }
        
        tx.commit().await?;
        
        info!(
            estimate_id = %estimate_id,
            "Successfully updated estimate"
        );
        
        // Fetch and return the updated estimate
        self.get_estimate(tenant_id, estimate_id).await
    }
    
    /// Delete estimate (soft delete)
    pub async fn delete_estimate(
        &self,
        tenant_id: &str,
        estimate_id: &str,
    ) -> Result<(), EstimateError> {
        info!(
            tenant_id = %tenant_id,
            estimate_id = %estimate_id,
            "Deleting estimate"
        );
        
        // Verify estimate exists
        let estimate = self.get_estimate(tenant_id, estimate_id).await?;
        
        // Check if estimate can be deleted
        if estimate.status == "converted" {
            return Err(EstimateError::AlreadyConverted);
        }
        
        // Update status to rejected (soft delete)
        sqlx::query("UPDATE estimates SET status = 'rejected' WHERE id = ?")
            .bind(estimate_id)
            .execute(&self.pool)
            .await?;
        
        info!(
            estimate_id = %estimate_id,
            "Successfully deleted estimate"
        );
        
        Ok(())
    }
    
    /// Convert estimate to invoice
    /// 
    /// This creates an invoice from the estimate and marks the estimate as converted.
    /// The invoice will have the same line items, customer, and totals as the estimate.
    pub async fn convert_to_invoice(
        &self,
        tenant_id: &str,
        estimate_id: &str,
    ) -> Result<String, EstimateError> {
        info!(
            tenant_id = %tenant_id,
            estimate_id = %estimate_id,
            "Converting estimate to invoice"
        );
        
        // Get estimate
        let estimate = self.get_estimate(tenant_id, estimate_id).await?;
        
        // Check if estimate can be converted
        if estimate.status == "converted" {
            return Err(EstimateError::AlreadyConverted);
        }
        
        if estimate.status == "expired" {
            return Err(EstimateError::Expired);
        }
        
        // Get line items
        let line_items = self.get_estimate_line_items(estimate_id).await?;
        
        let mut tx = self.pool.begin().await?;
        
        // Generate invoice number
        let today = Utc::now().format("%Y%m%d").to_string();
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM invoices WHERE tenant_id = ? AND invoice_number LIKE ?",
        )
        .bind(tenant_id)
        .bind(format!("INV-{}-%%", today))
        .fetch_one(&mut *tx)
        .await?;
        
        let invoice_number = format!("INV-{}-{:04}", today, count + 1);
        let invoice_id = Uuid::new_v4().to_string();
        
        // Create invoice
        sqlx::query(
            "INSERT INTO invoices (
                id, tenant_id, invoice_number, customer_id, invoice_date,
                subtotal, tax_amount, discount_amount, total_amount,
                status, notes, store_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)",
        )
        .bind(&invoice_id)
        .bind(tenant_id)
        .bind(&invoice_number)
        .bind(&estimate.customer_id)
        .bind(Utc::now().format("%Y-%m-%d").to_string())
        .bind(estimate.subtotal.to_f64().unwrap_or(0.0))
        .bind(estimate.tax_amount.to_f64().unwrap_or(0.0))
        .bind(estimate.discount_amount.to_f64().unwrap_or(0.0))
        .bind(estimate.total_amount.to_f64().unwrap_or(0.0))
        .bind(&estimate.notes)
        .bind(&estimate.store_id)
        .execute(&mut *tx)
        .await?;
        
        // Create invoice line items
        for item in &line_items {
            let line_id = Uuid::new_v4().to_string();
            
            sqlx::query(
                "INSERT INTO invoice_line_items (
                    id, invoice_id, product_id, description, quantity,
                    unit_price, tax_rate, discount_rate, line_total
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&line_id)
            .bind(&invoice_id)
            .bind(&item.product_id)
            .bind(&item.description)
            .bind(item.quantity.to_f64().unwrap_or(0.0))
            .bind(item.unit_price.to_f64().unwrap_or(0.0))
            .bind(item.tax_rate.to_f64().unwrap_or(0.0))
            .bind(item.discount_rate.to_f64().unwrap_or(0.0))
            .bind(item.line_total.to_f64().unwrap_or(0.0))
            .execute(&mut *tx)
            .await?;
        }
        
        // Update estimate status and link to invoice
        sqlx::query(
            "UPDATE estimates SET status = 'converted', converted_to_invoice_id = ? WHERE id = ?",
        )
        .bind(&invoice_id)
        .bind(estimate_id)
        .execute(&mut *tx)
        .await?;
        
        tx.commit().await?;
        
        info!(
            estimate_id = %estimate_id,
            invoice_id = %invoice_id,
            "Successfully converted estimate to invoice"
        );
        
        Ok(invoice_id)
    }
    
    /// Convert estimate to work order
    /// 
    /// This creates a work order from the estimate and marks the estimate as converted.
    /// The work order will have the same line items, customer, and estimated total as the estimate.
    pub async fn convert_to_work_order(
        &self,
        tenant_id: &str,
        estimate_id: &str,
    ) -> Result<String, EstimateError> {
        info!(
            tenant_id = %tenant_id,
            estimate_id = %estimate_id,
            "Converting estimate to work order"
        );
        
        // Get estimate
        let estimate = self.get_estimate(tenant_id, estimate_id).await?;
        
        // Check if estimate can be converted
        if estimate.status == "converted" {
            return Err(EstimateError::AlreadyConverted);
        }
        
        if estimate.status == "expired" {
            return Err(EstimateError::Expired);
        }
        
        // Get line items
        let line_items = self.get_estimate_line_items(estimate_id).await?;
        
        let mut tx = self.pool.begin().await?;
        
        // Generate work order number
        let today = Utc::now().format("%Y%m%d").to_string();
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM work_orders WHERE work_order_number LIKE ?",
        )
        .bind(format!("WO-{}-%%", today))
        .fetch_one(&mut *tx)
        .await?;
        
        let work_order_number = format!("WO-{}-{:04}", today, count + 1);
        let work_order_id = Uuid::new_v4().to_string();
        
        // Create work order
        sqlx::query(
            "INSERT INTO work_orders (
                id, work_order_number, customer_id, status, description,
                estimated_total, labor_total, parts_total, store_id
            ) VALUES (?, ?, ?, 'pending', ?, ?, 0.0, 0.0, ?)",
        )
        .bind(&work_order_id)
        .bind(&work_order_number)
        .bind(&estimate.customer_id)
        .bind(estimate.notes.as_deref().unwrap_or("Work order from estimate"))
        .bind(estimate.total_amount.to_f64().unwrap_or(0.0))
        .bind(&estimate.store_id)
        .execute(&mut *tx)
        .await?;
        
        // Create work order line items
        for item in &line_items {
            let line_id = Uuid::new_v4().to_string();
            
            // Determine line type (labor vs parts)
            let line_type = if item.description.to_lowercase().contains("labor") {
                "labor"
            } else {
                "parts"
            };
            
            sqlx::query(
                "INSERT INTO work_order_lines (
                    id, work_order_id, line_type, product_id, description,
                    quantity, unit_price, total_price
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            )
            .bind(&line_id)
            .bind(&work_order_id)
            .bind(line_type)
            .bind(&item.product_id)
            .bind(&item.description)
            .bind(item.quantity.to_f64().unwrap_or(0.0))
            .bind(item.unit_price.to_f64().unwrap_or(0.0))
            .bind(item.line_total.to_f64().unwrap_or(0.0))
            .execute(&mut *tx)
            .await?;
        }
        
        // Update estimate status and link to work order
        sqlx::query(
            "UPDATE estimates SET status = 'converted', converted_to_work_order_id = ? WHERE id = ?",
        )
        .bind(&work_order_id)
        .bind(estimate_id)
        .execute(&mut *tx)
        .await?;
        
        tx.commit().await?;
        
        info!(
            estimate_id = %estimate_id,
            work_order_id = %work_order_id,
            "Successfully converted estimate to work order"
        );
        
        Ok(work_order_id)
    }
}

// Implement sqlx::FromRow for Estimate
impl sqlx::FromRow<'_, sqlx::sqlite::SqliteRow> for Estimate {
    fn from_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, sqlx::Error> {
        Ok(Self {
            id: row.try_get("id")?,
            tenant_id: row.try_get("tenant_id")?,
            estimate_number: row.try_get("estimate_number")?,
            customer_id: row.try_get("customer_id")?,
            estimate_date: row.try_get("estimate_date")?,
            expiration_date: row.try_get("expiration_date")?,
            subtotal: Decimal::from_f64_retain(row.try_get::<f64, _>("subtotal")?).unwrap_or(Decimal::ZERO),
            tax_amount: Decimal::from_f64_retain(row.try_get::<f64, _>("tax_amount")?).unwrap_or(Decimal::ZERO),
            discount_amount: Decimal::from_f64_retain(row.try_get::<f64, _>("discount_amount")?).unwrap_or(Decimal::ZERO),
            total_amount: Decimal::from_f64_retain(row.try_get::<f64, _>("total_amount")?).unwrap_or(Decimal::ZERO),
            status: row.try_get("status")?,
            terms: row.try_get("terms")?,
            notes: row.try_get("notes")?,
            created_at: row.try_get("created_at")?,
            updated_at: row.try_get("updated_at")?,
            created_by: row.try_get("created_by")?,
            converted_to_invoice_id: row.try_get("converted_to_invoice_id")?,
            converted_to_work_order_id: row.try_get("converted_to_work_order_id")?,
            store_id: row.try_get("store_id")?,
            sync_version: row.try_get("sync_version")?,
        })
    }
}

// Implement sqlx::FromRow for EstimateLineItem
impl sqlx::FromRow<'_, sqlx::sqlite::SqliteRow> for EstimateLineItem {
    fn from_row(row: &sqlx::sqlite::SqliteRow) -> Result<Self, sqlx::Error> {
        Ok(Self {
            id: row.try_get("id")?,
            estimate_id: row.try_get("estimate_id")?,
            product_id: row.try_get("product_id")?,
            description: row.try_get("description")?,
            quantity: Decimal::from_f64_retain(row.try_get::<f64, _>("quantity")?).unwrap_or(Decimal::ZERO),
            unit_price: Decimal::from_f64_retain(row.try_get::<f64, _>("unit_price")?).unwrap_or(Decimal::ZERO),
            tax_rate: Decimal::from_f64_retain(row.try_get::<f64, _>("tax_rate")?).unwrap_or(Decimal::ZERO),
            discount_rate: Decimal::from_f64_retain(row.try_get::<f64, _>("discount_rate")?).unwrap_or(Decimal::ZERO),
            line_total: Decimal::from_f64_retain(row.try_get::<f64, _>("line_total")?).unwrap_or(Decimal::ZERO),
            created_at: row.try_get("created_at")?,
        })
    }
}
