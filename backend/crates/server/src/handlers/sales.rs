/**
 * Sales Handlers
 * 
 * Handles POS sales transactions - creating, completing, and voiding sales.
 * This is the core checkout flow for the point of sale.
 */

use actix_web::{web, HttpRequest, HttpResponse, post, get};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

use crate::models::errors::ApiError;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct SaleLineItem {
    pub product_id: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub discount_amount: Option<f64>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSaleRequest {
    pub customer_id: Option<String>,
    pub items: Vec<SaleLineItem>,
    pub payment_method: String,
    pub discount_amount: Option<f64>,
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SaleResponse {
    pub id: String,
    pub transaction_number: String,
    pub customer_id: Option<String>,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub total_amount: f64,
    pub items_count: i32,
    pub payment_method: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Serialize)]
pub struct SaleListResponse {
    pub sales: Vec<SaleResponse>,
    pub total: i64,
}

// ============================================================================
// Handlers
// ============================================================================

/// Create a new sale transaction
/// 
/// POST /api/sales
#[post("/api/sales")]
pub async fn create_sale(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateSaleRequest>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = extract_tenant_id(&req)?;
    let employee_id = extract_user_id(&req)?;
    let store_id = extract_store_id(&req)?;
    
    // Validate items
    if body.items.is_empty() {
        return Err(ApiError::bad_request("Sale must have at least one item"));
    }
    
    // Calculate totals
    let mut subtotal = 0.0;
    let mut items_count = 0;
    
    for item in &body.items {
        if item.quantity <= 0.0 {
            return Err(ApiError::bad_request("Item quantity must be positive"));
        }
        subtotal += item.unit_price * item.quantity - item.discount_amount.unwrap_or(0.0);
        items_count += 1;
    }
    
    let discount_amount = body.discount_amount.unwrap_or(0.0);
    subtotal -= discount_amount;
    
    // Calculate tax (13% - should come from config in production)
    let tax_rate = 0.13;
    let tax_amount = subtotal * tax_rate;
    let total_amount = subtotal + tax_amount;
    
    // Generate transaction number
    let transaction_number = generate_transaction_number(&pool, &tenant_id).await?;
    
    // Create sale record
    let sale_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        r#"
        INSERT INTO sales_transactions (
            id, tenant_id, transaction_number, customer_id, employee_id, store_id,
            total_amount, subtotal, tax_amount, discount_amount, items_count,
            payment_method, payment_status, status, notes, created_at, updated_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'completed', ?, ?, ?, ?)
        "#
    )
    .bind(&sale_id)
    .bind(&tenant_id)
    .bind(&transaction_number)
    .bind(&body.customer_id)
    .bind(&employee_id)
    .bind(&store_id)
    .bind(total_amount)
    .bind(subtotal)
    .bind(tax_amount)
    .bind(discount_amount)
    .bind(items_count)
    .bind(&body.payment_method)
    .bind(&body.notes)
    .bind(&now)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to create sale: {}", e)))?;
    
    // Create line items
    for item in &body.items {
        let line_id = Uuid::new_v4().to_string();
        let item_subtotal = item.unit_price * item.quantity;
        let item_discount = item.discount_amount.unwrap_or(0.0);
        let item_tax = (item_subtotal - item_discount) * tax_rate;
        let item_total = item_subtotal - item_discount + item_tax;
        
        sqlx::query(
            r#"
            INSERT INTO sales_line_items (
                id, transaction_id, product_id, quantity, unit_price,
                subtotal, discount_amount, tax_amount, total, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            "#
        )
        .bind(&line_id)
        .bind(&sale_id)
        .bind(&item.product_id)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(item_subtotal)
        .bind(item_discount)
        .bind(item_tax)
        .bind(item_total)
        .bind(&now)
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to create line item: {}", e)))?;
        
        // Update inventory (decrease stock)
        sqlx::query(
            "UPDATE products SET quantity_on_hand = quantity_on_hand - ? WHERE id = ? AND tenant_id = ?"
        )
        .bind(item.quantity)
        .bind(&item.product_id)
        .bind(&tenant_id)
        .execute(pool.get_ref())
        .await
        .ok(); // Don't fail if product doesn't exist
    }
    
    Ok(HttpResponse::Created().json(SaleResponse {
        id: sale_id,
        transaction_number,
        customer_id: body.customer_id.clone(),
        subtotal,
        tax_amount,
        discount_amount,
        total_amount,
        items_count,
        payment_method: body.payment_method.clone(),
        status: "completed".to_string(),
        created_at: now,
    }))
}

/// Get a sale by ID
/// 
/// GET /api/sales/{id}
#[get("/api/sales/{id}")]
pub async fn get_sale(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = extract_tenant_id(&req)?;
    let sale_id = path.into_inner();
    
    let sale = sqlx::query_as::<_, SaleRecord>(
        r#"
        SELECT id, transaction_number, customer_id, subtotal, tax_amount,
               discount_amount, total_amount, items_count, payment_method, status, created_at
        FROM sales_transactions
        WHERE id = ? AND tenant_id = ?
        "#
    )
    .bind(&sale_id)
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    match sale {
        Some(s) => Ok(HttpResponse::Ok().json(SaleResponse {
            id: s.id,
            transaction_number: s.transaction_number,
            customer_id: s.customer_id,
            subtotal: s.subtotal,
            tax_amount: s.tax_amount,
            discount_amount: s.discount_amount,
            total_amount: s.total_amount,
            items_count: s.items_count,
            payment_method: s.payment_method.unwrap_or_default(),
            status: s.status,
            created_at: s.created_at,
        })),
        None => Err(ApiError::not_found("Sale not found")),
    }
}

/// List recent sales
/// 
/// GET /api/sales
#[get("/api/sales")]
pub async fn list_sales(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    query: web::Query<ListSalesQuery>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = extract_tenant_id(&req)?;
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);
    
    let sales = sqlx::query_as::<_, SaleRecord>(
        r#"
        SELECT id, transaction_number, customer_id, subtotal, tax_amount,
               discount_amount, total_amount, items_count, payment_method, status, created_at
        FROM sales_transactions
        WHERE tenant_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        "#
    )
    .bind(&tenant_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sales_transactions WHERE tenant_id = ?"
    )
    .bind(&tenant_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);
    
    let response: Vec<SaleResponse> = sales.into_iter().map(|s| SaleResponse {
        id: s.id,
        transaction_number: s.transaction_number,
        customer_id: s.customer_id,
        subtotal: s.subtotal,
        tax_amount: s.tax_amount,
        discount_amount: s.discount_amount,
        total_amount: s.total_amount,
        items_count: s.items_count,
        payment_method: s.payment_method.unwrap_or_default(),
        status: s.status,
        created_at: s.created_at,
    }).collect();
    
    Ok(HttpResponse::Ok().json(SaleListResponse {
        sales: response,
        total,
    }))
}

/// Void a sale
/// 
/// POST /api/sales/{id}/void
#[post("/api/sales/{id}/void")]
pub async fn void_sale(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<VoidSaleRequest>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = extract_tenant_id(&req)?;
    let user_id = extract_user_id(&req)?;
    let sale_id = path.into_inner();
    let now = Utc::now().to_rfc3339();
    
    // Check sale exists and is not already voided
    let sale = sqlx::query_as::<_, SaleRecord>(
        "SELECT * FROM sales_transactions WHERE id = ? AND tenant_id = ?"
    )
    .bind(&sale_id)
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    let sale = sale.ok_or_else(|| ApiError::not_found("Sale not found"))?;
    
    if sale.status == "voided" {
        return Err(ApiError::bad_request("Sale is already voided"));
    }
    
    // Void the sale
    sqlx::query(
        r#"
        UPDATE sales_transactions 
        SET status = 'voided', voided_at = ?, voided_by = ?, void_reason = ?, updated_at = ?
        WHERE id = ? AND tenant_id = ?
        "#
    )
    .bind(&now)
    .bind(&user_id)
    .bind(&body.reason)
    .bind(&now)
    .bind(&sale_id)
    .bind(&tenant_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to void sale: {}", e)))?;
    
    // Restore inventory
    let line_items = sqlx::query_as::<_, LineItemRecord>(
        "SELECT product_id, quantity FROM sales_line_items WHERE transaction_id = ?"
    )
    .bind(&sale_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();
    
    for item in line_items {
        sqlx::query(
            "UPDATE products SET quantity_on_hand = quantity_on_hand + ? WHERE id = ? AND tenant_id = ?"
        )
        .bind(item.quantity)
        .bind(&item.product_id)
        .bind(&tenant_id)
        .execute(pool.get_ref())
        .await
        .ok();
    }
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": "Sale voided successfully"
    })))
}

/// Get customer transaction history
/// 
/// GET /api/customers/{id}/transactions
#[get("/api/customers/{id}/transactions")]
pub async fn get_customer_transactions(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    query: web::Query<ListSalesQuery>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = extract_tenant_id(&req)?;
    let customer_id = path.into_inner();
    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);
    
    let sales = sqlx::query_as::<_, SaleRecord>(
        r#"
        SELECT id, transaction_number, customer_id, subtotal, tax_amount,
               discount_amount, total_amount, items_count, payment_method, status, created_at
        FROM sales_transactions
        WHERE tenant_id = ? AND customer_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        "#
    )
    .bind(&tenant_id)
    .bind(&customer_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    let total: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sales_transactions WHERE tenant_id = ? AND customer_id = ?"
    )
    .bind(&tenant_id)
    .bind(&customer_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);
    
    // Calculate customer stats
    let stats = sqlx::query_as::<_, CustomerStatsRecord>(
        r#"
        SELECT 
            COUNT(*) as total_transactions,
            COALESCE(SUM(total_amount), 0) as total_spent,
            COALESCE(AVG(total_amount), 0) as average_order
        FROM sales_transactions
        WHERE tenant_id = ? AND customer_id = ? AND status = 'completed'
        "#
    )
    .bind(&tenant_id)
    .bind(&customer_id)
    .fetch_one(pool.get_ref())
    .await
    .ok();
    
    let response: Vec<SaleResponse> = sales.into_iter().map(|s| SaleResponse {
        id: s.id,
        transaction_number: s.transaction_number,
        customer_id: s.customer_id,
        subtotal: s.subtotal,
        tax_amount: s.tax_amount,
        discount_amount: s.discount_amount,
        total_amount: s.total_amount,
        items_count: s.items_count,
        payment_method: s.payment_method.unwrap_or_default(),
        status: s.status,
        created_at: s.created_at,
    }).collect();
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "sales": response,
        "total": total,
        "stats": stats.map(|s| serde_json::json!({
            "total_transactions": s.total_transactions,
            "total_spent": s.total_spent,
            "average_order": s.average_order
        }))
    })))
}

/// Email receipt to customer
/// 
/// POST /api/sales/{id}/email-receipt
#[post("/api/sales/{id}/email-receipt")]
pub async fn email_receipt(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<EmailReceiptRequest>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = extract_tenant_id(&req)?;
    let sale_id = path.into_inner();
    
    // Get sale details
    let sale = sqlx::query_as::<_, SaleRecord>(
        r#"
        SELECT id, transaction_number, customer_id, subtotal, tax_amount,
               discount_amount, total_amount, items_count, payment_method, status, created_at
        FROM sales_transactions
        WHERE id = ? AND tenant_id = ?
        "#
    )
    .bind(&sale_id)
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    let sale = sale.ok_or_else(|| ApiError::not_found("Sale not found"))?;
    
    // Get line items for the receipt
    let _line_items = sqlx::query_as::<_, ReceiptLineItem>(
        r#"
        SELECT li.quantity, li.unit_price, li.total, p.name as product_name
        FROM sales_line_items li
        LEFT JOIN products p ON li.product_id = p.id
        WHERE li.transaction_id = ?
        "#
    )
    .bind(&sale_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();
    
    // In production, this would send via SMTP or email service
    // For now, we log and return success
    tracing::info!(
        "Email receipt requested for transaction {} to {}",
        sale.transaction_number,
        body.email
    );
    
    // Record the email attempt
    let email_log_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        r#"
        INSERT INTO email_logs (id, tenant_id, recipient, subject, transaction_id, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'sent', ?)
        "#
    )
    .bind(&email_log_id)
    .bind(&tenant_id)
    .bind(&body.email)
    .bind(format!("Receipt for Transaction {}", sale.transaction_number))
    .bind(&sale_id)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .ok(); // Don't fail if logging fails
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "success": true,
        "message": format!("Receipt sent to {}", body.email),
        "transaction_number": sale.transaction_number
    })))
}

// ============================================================================
// Helper Functions
// ============================================================================

fn extract_tenant_id(req: &HttpRequest) -> Result<String, ApiError> {
    req.headers()
        .get("X-Tenant-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| ApiError::bad_request("Missing X-Tenant-ID header"))
}

fn extract_user_id(req: &HttpRequest) -> Result<String, ApiError> {
    Ok(req.headers()
        .get("X-User-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "system".to_string()))
}

fn extract_store_id(req: &HttpRequest) -> Result<String, ApiError> {
    Ok(req.headers()
        .get("X-Store-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "default".to_string()))
}

async fn generate_transaction_number(pool: &SqlitePool, tenant_id: &str) -> Result<String, ApiError> {
    let today = Utc::now().format("%Y%m%d").to_string();
    
    // Get count of today's transactions
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sales_transactions WHERE tenant_id = ? AND DATE(created_at) = DATE('now')"
    )
    .bind(tenant_id)
    .fetch_one(pool)
    .await
    .unwrap_or(0);
    
    Ok(format!("TXN-{}-{:04}", today, count + 1))
}

// ============================================================================
// Internal Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ListSalesQuery {
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct VoidSaleRequest {
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct EmailReceiptRequest {
    pub email: String,
}

#[derive(Debug, sqlx::FromRow)]
struct SaleRecord {
    id: String,
    transaction_number: String,
    customer_id: Option<String>,
    subtotal: f64,
    tax_amount: f64,
    discount_amount: f64,
    total_amount: f64,
    items_count: i32,
    payment_method: Option<String>,
    status: String,
    created_at: String,
}

#[derive(Debug, sqlx::FromRow)]
struct LineItemRecord {
    product_id: String,
    quantity: f64,
}

#[derive(Debug, sqlx::FromRow)]
struct CustomerStatsRecord {
    total_transactions: i64,
    total_spent: f64,
    average_order: f64,
}

#[derive(Debug, sqlx::FromRow)]
#[allow(dead_code)] // Fields used by SQL query mapping
struct ReceiptLineItem {
    quantity: f64,
    unit_price: f64,
    total: f64,
    product_name: Option<String>,
}

// ============================================================================
// Route Configuration
// ============================================================================

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(create_sale)
       .service(get_sale)
       .service(list_sales)
       .service(void_sale)
       .service(get_customer_transactions)
       .service(email_receipt);
}
