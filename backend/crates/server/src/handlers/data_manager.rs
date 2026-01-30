/**
 * Data Manager Handlers
 * 
 * Provides endpoints for managing data batches:
 * - Seed demo data with batch tracking
 * - CSV import with batch tracking
 * - List and query batches
 * - Purge data by batch ID
 * 
 * Requirements: 11.1, 11.2, 11.3, 11.4
 */

use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::models::errors::ApiError;

// ============================================================================
// Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct SeedDataRequest {
    /// Type of demo data to seed (e.g., "products", "customers", "all")
    pub data_type: String,
    /// Number of records to generate
    pub count: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UploadDataRequest {
    /// Entity type (e.g., "products", "customers", "vendors")
    pub entity_type: String,
    /// CSV data as string
    pub csv_data: String,
}

#[derive(Debug, Serialize)]
pub struct BatchResponse {
    pub batch_id: String,
    pub status: String,
    pub message: String,
    pub records_affected: i64,
}

#[derive(Debug, Serialize)]
pub struct BatchListResponse {
    pub batches: Vec<BatchInfo>,
}

#[derive(Debug, Serialize)]
pub struct BatchInfo {
    pub id: String,
    pub batch_type: String,
    pub entity_type: String,
    pub status: String,
    pub records_count: i64,
    pub created_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct BatchStatusResponse {
    pub id: String,
    pub batch_type: String,
    pub entity_type: String,
    pub status: String,
    pub records_count: i64,
    pub error_message: Option<String>,
    pub created_at: String,
    pub completed_at: Option<String>,
}

// ============================================================================
// Handlers
// ============================================================================

/// POST /api/data-manager/seed
/// Create demo data with batch tracking
/// Requirements: 11.1
pub async fn seed_data(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    payload: web::Json<SeedDataRequest>,
) -> Result<HttpResponse, ApiError> {
    let batch_id = uuid::Uuid::new_v4().to_string();
    let count = payload.count.unwrap_or(10);
    let now = chrono::Utc::now().to_rfc3339();
    
    // Create batch record
    sqlx::query(
        "INSERT INTO data_batches (id, tenant_id, batch_type, entity_type, status, records_count, created_at) 
         VALUES (?, ?, 'seed', ?, 'processing', 0, ?)"
    )
    .bind(&batch_id)
    .bind(tenant_id.to_string())
    .bind(&payload.data_type)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to create batch: {}", e)))?;
    
    // Generate demo data based on type
    let records_created = match payload.data_type.as_str() {
        "products" => seed_demo_products(pool.get_ref(), &tenant_id, &batch_id, count).await?,
        "customers" => seed_demo_customers(pool.get_ref(), &tenant_id, &batch_id, count).await?,
        "all" => {
            let products = seed_demo_products(pool.get_ref(), &tenant_id, &batch_id, count).await?;
            let customers = seed_demo_customers(pool.get_ref(), &tenant_id, &batch_id, count).await?;
            products + customers
        }
        _ => return Err(ApiError::bad_request(format!("Unknown data type: {}", payload.data_type))),
    };
    
    // Update batch status
    let completed_at = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "UPDATE data_batches SET status = 'completed', records_count = ?, completed_at = ? WHERE id = ?"
    )
    .bind(records_created)
    .bind(&completed_at)
    .bind(&batch_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to update batch: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(BatchResponse {
        batch_id,
        status: "completed".to_string(),
        message: format!("Successfully seeded {} records", records_created),
        records_affected: records_created,
    }))
}

/// POST /api/data-manager/upload
/// Import CSV data with batch tracking
/// Requirements: 11.2
pub async fn upload_data(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    payload: web::Json<UploadDataRequest>,
) -> Result<HttpResponse, ApiError> {
    let batch_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    // Create batch record
    sqlx::query(
        "INSERT INTO data_batches (id, tenant_id, batch_type, entity_type, status, records_count, created_at) 
         VALUES (?, ?, 'import', ?, 'processing', 0, ?)"
    )
    .bind(&batch_id)
    .bind(tenant_id.to_string())
    .bind(&payload.entity_type)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to create batch: {}", e)))?;
    
    // Parse and import CSV data
    let records_imported = match payload.entity_type.as_str() {
        "products" => import_products_csv(pool.get_ref(), &tenant_id, &batch_id, &payload.csv_data).await?,
        "customers" => import_customers_csv(pool.get_ref(), &tenant_id, &batch_id, &payload.csv_data).await?,
        _ => {
            // Mark batch as failed
            let _ = sqlx::query("UPDATE data_batches SET status = 'failed', error_message = ? WHERE id = ?")
                .bind(format!("Unknown entity type: {}", payload.entity_type))
                .bind(&batch_id)
                .execute(pool.get_ref())
                .await;
            return Err(ApiError::bad_request(format!("Unknown entity type: {}", payload.entity_type)));
        }
    };
    
    // Update batch status
    let completed_at = chrono::Utc::now().to_rfc3339();
    sqlx::query(
        "UPDATE data_batches SET status = 'completed', records_count = ?, completed_at = ? WHERE id = ?"
    )
    .bind(records_imported)
    .bind(&completed_at)
    .bind(&batch_id)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to update batch: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(BatchResponse {
        batch_id,
        status: "completed".to_string(),
        message: format!("Successfully imported {} records", records_imported),
        records_affected: records_imported,
    }))
}

/// GET /api/data-manager/batches
/// List all data batches for tenant
/// Requirements: 11.3
pub async fn list_batches(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    let rows: Vec<(String, String, String, String, i64, String, Option<String>)> = sqlx::query_as(
        "SELECT id, batch_type, entity_type, status, records_count, created_at, completed_at 
         FROM data_batches 
         WHERE tenant_id = ? 
         ORDER BY created_at DESC 
         LIMIT 100"
    )
    .bind(tenant_id.to_string())
    .fetch_all(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to fetch batches: {}", e)))?;
    
    let batches: Vec<BatchInfo> = rows.into_iter().map(|(id, batch_type, entity_type, status, records_count, created_at, completed_at)| {
        BatchInfo {
            id,
            batch_type,
            entity_type,
            status,
            records_count,
            created_at,
            completed_at,
        }
    }).collect();
    
    Ok(HttpResponse::Ok().json(BatchListResponse { batches }))
}

/// GET /api/data-manager/batches/{id}
/// Get batch status by ID
/// Requirements: 11.3
pub async fn get_batch_status(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    path: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let batch_id = path.into_inner();
    
    let row: Option<(String, String, String, String, i64, Option<String>, String, Option<String>)> = sqlx::query_as(
        "SELECT id, batch_type, entity_type, status, records_count, error_message, created_at, completed_at 
         FROM data_batches 
         WHERE id = ? AND tenant_id = ?"
    )
    .bind(&batch_id)
    .bind(tenant_id.to_string())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to fetch batch: {}", e)))?;
    
    match row {
        Some((id, batch_type, entity_type, status, records_count, error_message, created_at, completed_at)) => {
            Ok(HttpResponse::Ok().json(BatchStatusResponse {
                id,
                batch_type,
                entity_type,
                status,
                records_count,
                error_message,
                created_at,
                completed_at,
            }))
        }
        None => Err(ApiError::not_found("Batch not found")),
    }
}

/// DELETE /api/data-manager/batches/{id}
/// Purge data by batch ID
/// Requirements: 11.4
pub async fn purge_batch(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    path: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let batch_id = path.into_inner();
    
    // Get batch info first
    let batch_info: Option<(String, String)> = sqlx::query_as(
        "SELECT entity_type, status FROM data_batches WHERE id = ? AND tenant_id = ?"
    )
    .bind(&batch_id)
    .bind(tenant_id.to_string())
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to fetch batch: {}", e)))?;
    
    let (entity_type, _status) = match batch_info {
        Some(info) => info,
        None => return Err(ApiError::not_found("Batch not found")),
    };
    
    // Delete records associated with this batch
    let records_deleted = match entity_type.as_str() {
        "products" => {
            let result = sqlx::query("DELETE FROM products WHERE batch_id = ? AND tenant_id = ?")
                .bind(&batch_id)
                .bind(tenant_id.to_string())
                .execute(pool.get_ref())
                .await
                .map_err(|e| ApiError::internal(format!("Failed to delete products: {}", e)))?;
            result.rows_affected() as i64
        }
        "customers" => {
            let result = sqlx::query("DELETE FROM customers WHERE batch_id = ? AND tenant_id = ?")
                .bind(&batch_id)
                .bind(tenant_id.to_string())
                .execute(pool.get_ref())
                .await
                .map_err(|e| ApiError::internal(format!("Failed to delete customers: {}", e)))?;
            result.rows_affected() as i64
        }
        "all" => {
            let products = sqlx::query("DELETE FROM products WHERE batch_id = ? AND tenant_id = ?")
                .bind(&batch_id)
                .bind(tenant_id.to_string())
                .execute(pool.get_ref())
                .await
                .map_err(|e| ApiError::internal(format!("Failed to delete products: {}", e)))?
                .rows_affected() as i64;
            let customers = sqlx::query("DELETE FROM customers WHERE batch_id = ? AND tenant_id = ?")
                .bind(&batch_id)
                .bind(tenant_id.to_string())
                .execute(pool.get_ref())
                .await
                .map_err(|e| ApiError::internal(format!("Failed to delete customers: {}", e)))?
                .rows_affected() as i64;
            products + customers
        }
        _ => 0,
    };
    
    // Update batch status to purged
    sqlx::query("UPDATE data_batches SET status = 'purged', records_count = 0 WHERE id = ?")
        .bind(&batch_id)
        .execute(pool.get_ref())
        .await
        .map_err(|e| ApiError::internal(format!("Failed to update batch: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(BatchResponse {
        batch_id,
        status: "purged".to_string(),
        message: format!("Successfully purged {} records", records_deleted),
        records_affected: records_deleted,
    }))
}

// ============================================================================
// Helper Functions
// ============================================================================

async fn seed_demo_products(
    pool: &SqlitePool,
    tenant_id: &str,
    batch_id: &str,
    count: i32,
) -> Result<i64, ApiError> {
    let mut created = 0i64;
    let now = chrono::Utc::now().to_rfc3339();
    
    for i in 0..count {
        let id = uuid::Uuid::new_v4().to_string();
        let sku = format!("DEMO-{:05}", i + 1);
        let name = format!("Demo Product {}", i + 1);
        let price = 9.99 + (i as f64 * 0.5);
        
        let result = sqlx::query(
            "INSERT INTO products (id, tenant_id, sku, name, unit_price, quantity_on_hand, batch_id, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, 100, ?, ?, ?)
             ON CONFLICT(tenant_id, sku) DO NOTHING"
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(&sku)
        .bind(&name)
        .bind(price)
        .bind(batch_id)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await;
        
        if result.is_ok() {
            created += 1;
        }
    }
    
    Ok(created)
}

async fn seed_demo_customers(
    pool: &SqlitePool,
    tenant_id: &str,
    batch_id: &str,
    count: i32,
) -> Result<i64, ApiError> {
    let mut created = 0i64;
    let now = chrono::Utc::now().to_rfc3339();
    
    for i in 0..count {
        let id = uuid::Uuid::new_v4().to_string();
        let name = format!("Demo Customer {}", i + 1);
        let email = format!("demo{}@example.com", i + 1);
        
        let result = sqlx::query(
            "INSERT INTO customers (id, tenant_id, name, email, batch_id, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(tenant_id, email) DO NOTHING"
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(&name)
        .bind(&email)
        .bind(batch_id)
        .bind(&now)
        .bind(&now)
        .execute(pool)
        .await;
        
        if result.is_ok() {
            created += 1;
        }
    }
    
    Ok(created)
}

async fn import_products_csv(
    pool: &SqlitePool,
    tenant_id: &str,
    batch_id: &str,
    csv_data: &str,
) -> Result<i64, ApiError> {
    let mut imported = 0i64;
    let now = chrono::Utc::now().to_rfc3339();
    
    // Simple CSV parsing (header: sku,name,price,quantity)
    let lines: Vec<&str> = csv_data.lines().collect();
    if lines.is_empty() {
        return Ok(0);
    }
    
    // Skip header row
    for line in lines.iter().skip(1) {
        let fields: Vec<&str> = line.split(',').collect();
        if fields.len() >= 4 {
            let id = uuid::Uuid::new_v4().to_string();
            let sku = fields[0].trim();
            let name = fields[1].trim();
            let price: f64 = fields[2].trim().parse().unwrap_or(0.0);
            let quantity: i32 = fields[3].trim().parse().unwrap_or(0);
            
            let result = sqlx::query(
                "INSERT INTO products (id, tenant_id, sku, name, unit_price, quantity_on_hand, batch_id, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(tenant_id, sku) DO UPDATE SET name = excluded.name, unit_price = excluded.unit_price, quantity_on_hand = excluded.quantity_on_hand, updated_at = excluded.updated_at"
            )
            .bind(&id)
            .bind(tenant_id)
            .bind(sku)
            .bind(name)
            .bind(price)
            .bind(quantity)
            .bind(batch_id)
            .bind(&now)
            .bind(&now)
            .execute(pool)
            .await;
            
            if result.is_ok() {
                imported += 1;
            }
        }
    }
    
    Ok(imported)
}

async fn import_customers_csv(
    pool: &SqlitePool,
    tenant_id: &str,
    batch_id: &str,
    csv_data: &str,
) -> Result<i64, ApiError> {
    let mut imported = 0i64;
    let now = chrono::Utc::now().to_rfc3339();
    
    // Simple CSV parsing (header: name,email,phone)
    let lines: Vec<&str> = csv_data.lines().collect();
    if lines.is_empty() {
        return Ok(0);
    }
    
    // Skip header row
    for line in lines.iter().skip(1) {
        let fields: Vec<&str> = line.split(',').collect();
        if fields.len() >= 2 {
            let id = uuid::Uuid::new_v4().to_string();
            let name = fields[0].trim();
            let email = fields[1].trim();
            let phone = if fields.len() > 2 { Some(fields[2].trim()) } else { None };
            
            let result = sqlx::query(
                "INSERT INTO customers (id, tenant_id, name, email, phone, batch_id, created_at, updated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(tenant_id, email) DO UPDATE SET name = excluded.name, phone = excluded.phone, updated_at = excluded.updated_at"
            )
            .bind(&id)
            .bind(tenant_id)
            .bind(name)
            .bind(email)
            .bind(phone)
            .bind(batch_id)
            .bind(&now)
            .bind(&now)
            .execute(pool)
            .await;
            
            if result.is_ok() {
                imported += 1;
            }
        }
    }
    
    Ok(imported)
}

// ============================================================================
// Route Configuration
// ============================================================================

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/data-manager")
            .route("/seed", web::post().to(seed_data))
            .route("/upload", web::post().to(upload_data))
            .route("/batches", web::get().to(list_batches))
            .route("/batches/{id}", web::get().to(get_batch_status))
            .route("/batches/{id}", web::delete().to(purge_batch))
    );
}
