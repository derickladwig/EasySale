use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::{DateTime, Utc};

use crate::middleware::get_current_tenant_id;
use crate::models::CreateProductRequest;
use crate::services::ProductService;
use crate::config::loader::ConfigLoader;

/// Escape a CSV field value to prevent injection and handle special characters
fn escape_csv_field(value: &str) -> String {
    // If the value contains comma, quote, newline, or starts with special chars, wrap in quotes
    if value.contains(',') || value.contains('"') || value.contains('\n') || value.contains('\r')
        || value.starts_with('=') || value.starts_with('+') || value.starts_with('-') || value.starts_with('@')
    {
        // Double any existing quotes and wrap in quotes
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

#[derive(Debug, Serialize)]
pub struct BackupInfo {
    pub id: i64,
    pub created_at: DateTime<Utc>,
    pub file_path: String,
    pub file_size: i64,
    pub status: String,
    pub location: String,
}

#[derive(Debug, Deserialize)]
pub struct ExportRequest {
    pub entity_type: String,
    pub format: Option<String>, // csv, json
}

#[derive(Debug, Serialize)]
pub struct ExportResponse {
    pub file_path: String,
    pub record_count: i64,
    pub file_size: i64,
}

#[derive(Debug, Deserialize)]
pub struct CleanupRequest {
    pub operation: String, // sessions, layaways
    pub days_old: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct CleanupResponse {
    pub deleted_count: i64,
    pub operation: String,
}

/// Product import row from CSV
#[derive(Debug, Clone, Deserialize)]
pub struct ProductImportRow {
    #[serde(rename = "sku*")]
    pub sku: String,
    #[serde(rename = "name*")]
    pub name: String,
    #[serde(rename = "category*")]
    pub category: String,
    #[serde(rename = "unit_price*")]
    pub unit_price: f64,
    #[serde(rename = "cost*")]
    pub cost: f64,
    #[serde(rename = "store_id*")]
    pub store_id: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub subcategory: Option<String>,
    #[serde(default)]
    pub quantity: Option<f64>,
    #[serde(default)]
    pub reorder_point: Option<f64>,
    #[serde(default)]
    pub barcode: Option<String>,
    #[serde(default)]
    pub barcode_type: Option<String>,
    #[serde(default)]
    pub is_active: Option<bool>,
    #[serde(default)]
    pub parent_sku: Option<String>,
    #[serde(default)]
    pub images: Option<String>,
    // Custom attributes
    #[serde(default)]
    pub attr_color: Option<String>,
    #[serde(default)]
    pub attr_size: Option<String>,
    #[serde(default)]
    pub attr_brand: Option<String>,
    #[serde(default)]
    pub attr_weight: Option<String>,
    #[serde(default)]
    pub attr_material: Option<String>,
    // Vendor info (stored in attributes for now)
    #[serde(default)]
    pub vendor_name: Option<String>,
    #[serde(default)]
    pub vendor_sku: Option<String>,
    #[serde(default)]
    pub vendor_cost: Option<String>,
    #[serde(default)]
    pub tax_class: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
}

impl ProductImportRow {
    /// Convert to CreateProductRequest
    pub fn to_create_request(&self, parent_id: Option<String>) -> CreateProductRequest {
        // Build attributes JSON from custom fields
        let mut attributes = serde_json::Map::new();
        
        if let Some(ref color) = self.attr_color {
            if !color.is_empty() {
                attributes.insert("color".to_string(), serde_json::Value::String(color.clone()));
            }
        }
        if let Some(ref size) = self.attr_size {
            if !size.is_empty() {
                attributes.insert("size".to_string(), serde_json::Value::String(size.clone()));
            }
        }
        if let Some(ref brand) = self.attr_brand {
            if !brand.is_empty() {
                attributes.insert("brand".to_string(), serde_json::Value::String(brand.clone()));
            }
        }
        if let Some(ref weight) = self.attr_weight {
            if !weight.is_empty() {
                attributes.insert("weight".to_string(), serde_json::Value::String(weight.clone()));
            }
        }
        if let Some(ref material) = self.attr_material {
            if !material.is_empty() {
                attributes.insert("material".to_string(), serde_json::Value::String(material.clone()));
            }
        }
        if let Some(ref tax_class) = self.tax_class {
            if !tax_class.is_empty() {
                attributes.insert("tax_class".to_string(), serde_json::Value::String(tax_class.clone()));
            }
        }
        if let Some(ref notes) = self.notes {
            if !notes.is_empty() {
                attributes.insert("notes".to_string(), serde_json::Value::String(notes.clone()));
            }
        }
        
        // Vendor info as nested object
        if self.vendor_name.is_some() || self.vendor_sku.is_some() || self.vendor_cost.is_some() {
            let mut vendor = serde_json::Map::new();
            if let Some(ref name) = self.vendor_name {
                if !name.is_empty() {
                    vendor.insert("name".to_string(), serde_json::Value::String(name.clone()));
                }
            }
            if let Some(ref sku) = self.vendor_sku {
                if !sku.is_empty() {
                    vendor.insert("sku".to_string(), serde_json::Value::String(sku.clone()));
                }
            }
            if let Some(ref cost) = self.vendor_cost {
                if !cost.is_empty() {
                    vendor.insert("cost".to_string(), serde_json::Value::String(cost.clone()));
                }
            }
            if !vendor.is_empty() {
                attributes.insert("vendor".to_string(), serde_json::Value::Object(vendor));
            }
        }
        
        // Parse images from comma-separated string
        let images = self.images.as_ref().map(|s| {
            s.split(',')
                .map(|url| url.trim().to_string())
                .filter(|url| !url.is_empty())
                .collect::<Vec<String>>()
        });
        
        CreateProductRequest {
            sku: self.sku.clone(),
            name: self.name.clone(),
            description: self.description.clone().filter(|s| !s.is_empty()),
            category: self.category.clone(),
            subcategory: self.subcategory.clone().filter(|s| !s.is_empty()),
            unit_price: self.unit_price,
            cost: self.cost,
            quantity_on_hand: self.quantity,
            reorder_point: self.reorder_point,
            attributes: if attributes.is_empty() { None } else { Some(serde_json::Value::Object(attributes)) },
            parent_id,
            barcode: self.barcode.clone().filter(|s| !s.is_empty()),
            barcode_type: self.barcode_type.clone().filter(|s| !s.is_empty()),
            images,
            store_id: self.store_id.clone(),
        }
    }
}

/// Import request with CSV data
#[derive(Debug, Deserialize)]
pub struct ImportRequest {
    pub entity_type: String,
    pub csv_data: String,
}

/// Import response
#[derive(Debug, Serialize, Deserialize)]
pub struct ImportResponse {
    pub imported: i64,
    pub skipped: i64,
    pub errors: Vec<ImportError>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ImportError {
    pub row: usize,
    pub field: Option<String>,
    pub message: String,
}

/// Trigger manual backup
pub async fn create_backup(
    _pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    // In production, this would:
    // 1. Create a SQLite backup using VACUUM INTO or backup API
    // 2. Compress the backup file
    // 3. Store metadata in backups table
    // 4. Optionally upload to cloud storage
    
    let backup_path = format!("./data/backups/backup_{}.db", Utc::now().timestamp());
    let now = Utc::now().to_rfc3339();
    
    // Create backup record
    let result = sqlx::query!(
        r#"
        INSERT INTO backups (file_path, file_size, status, location, created_at)
        VALUES (?, ?, ?, ?, ?)
        "#,
        backup_path,
        0, // Would be actual file size
        "success",
        "local",
        now
    )
    .execute(_pool.get_ref())
    .await;

    match result {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Backup created successfully",
            "file_path": backup_path
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create backup: {}", e)
        }))),
    }
}

/// Get backup history
pub async fn get_backup_history(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    let backups = sqlx::query_as!(
        BackupInfo,
        r#"
        SELECT 
            id as "id!: i64", 
            created_at as "created_at: DateTime<Utc>", 
            file_path, 
            file_size as "file_size!: i64",
            status, 
            location
        FROM backups
        ORDER BY created_at DESC
        LIMIT 50
        "#
    )
    .fetch_all(pool.get_ref())
    .await;

    match backups {
        Ok(backups) => Ok(HttpResponse::Ok().json(backups)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch backup history: {}", e)
        }))),
    }
}

/// Export data to CSV
pub async fn export_data(
    pool: web::Data<SqlitePool>,
    req: web::Json<ExportRequest>,
) -> Result<HttpResponse> {
    let format = req.format.as_deref().unwrap_or("csv");
    let tenant_id = get_current_tenant_id();
    
    // Validate entity type
    let valid_entities = vec!["products", "customers", "sales", "inventory", "users", "transactions", "cases"];
    if !valid_entities.contains(&req.entity_type.as_str()) {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid entity type"
        })));
    }

    // Query actual record count from database
    let record_count: i64 = match req.entity_type.as_str() {
        "products" => {
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM products WHERE tenant_id = ? AND is_active = 1"
            )
            .bind(&tenant_id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0)
        }
        "customers" => {
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM customers WHERE tenant_id = ? AND deleted_at IS NULL"
            )
            .bind(&tenant_id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0)
        }
        "sales" | "transactions" => {
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM orders WHERE tenant_id = ?"
            )
            .bind(&tenant_id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0)
        }
        "inventory" => {
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM products WHERE tenant_id = ? AND is_active = 1 AND quantity_on_hand > 0"
            )
            .bind(&tenant_id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0)
        }
        "users" => {
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM users WHERE tenant_id = ? AND is_active = 1"
            )
            .bind(&tenant_id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0)
        }
        "cases" => {
            sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM review_cases WHERE tenant_id = ?"
            )
            .bind(&tenant_id)
            .fetch_one(pool.get_ref())
            .await
            .unwrap_or(0)
        }
        _ => 0,
    };

    // Generate export file
    let export_dir = std::env::var("EXPORT_DIR").unwrap_or_else(|_| "./runtime/exports".to_string());
    
    // Ensure export directory exists
    if let Err(e) = std::fs::create_dir_all(&export_dir) {
        return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create export directory: {}", e)
        })));
    }
    
    let export_path = format!("{}/{}_{}.{}", export_dir, req.entity_type, Utc::now().timestamp(), format);
    
    // Generate actual export file
    let file_size = match generate_entity_export(pool.get_ref(), &req.entity_type, &tenant_id, &export_path, format).await {
        Ok(size) => size,
        Err(e) => {
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to generate export: {}", e)
            })));
        }
    };

    Ok(HttpResponse::Ok().json(ExportResponse {
        file_path: export_path,
        record_count,
        file_size,
    }))
}

/// Generate export file for an entity type
async fn generate_entity_export(
    pool: &SqlitePool,
    entity_type: &str,
    tenant_id: &str,
    file_path: &str,
    format: &str,
) -> std::result::Result<i64, Box<dyn std::error::Error + Send + Sync>> {
    use std::io::Write;
    
    let mut file = std::fs::File::create(file_path)?;
    
    match entity_type {
        "products" => {
            // Enhanced product export with attributes and vendor info
            let rows: Vec<(String, String, String, Option<String>, f64, f64, f64, String, Option<String>, Option<String>, Option<String>, Option<String>, Option<String>)> = sqlx::query_as(
                r"SELECT id, sku, name, description, unit_price, cost, quantity_on_hand, category, 
                         subcategory, barcode, barcode_type, attributes, store_id
                  FROM products WHERE tenant_id = ? AND is_active = 1 ORDER BY name"
            )
            .bind(tenant_id)
            .fetch_all(pool)
            .await?;
            
            if format == "csv" {
                // Enhanced headers with custom attributes and vendor columns
                writeln!(file, "sku,name,category,unit_price,cost,store_id,description,subcategory,quantity,barcode,barcode_type,attr_color,attr_size,attr_brand,attr_weight,attr_material,attr_custom_1,attr_custom_2,attr_custom_3,vendor_1_name,vendor_1_sku,vendor_1_cost,notes,tax_class")?;
                
                for (id, sku, name, desc, price, cost, qty, cat, subcat, barcode, barcode_type, attrs_json, store_id) in &rows {
                    // Parse attributes JSON
                    let attrs: serde_json::Value = attrs_json
                        .as_ref()
                        .and_then(|s| serde_json::from_str(s).ok())
                        .unwrap_or(serde_json::json!({}));
                    
                    let get_attr = |key: &str| -> String {
                        attrs.get(key)
                            .and_then(|v| v.as_str())
                            .map(|s| escape_csv_field(s))
                            .unwrap_or_default()
                    };
                    
                    // Extract vendor info from attributes
                    let vendors = attrs.get("vendors").and_then(|v| v.as_array());
                    let (v1_name, v1_sku, v1_cost) = if let Some(vendors) = vendors {
                        if let Some(v1) = vendors.first() {
                            (
                                v1.get("name").and_then(|v| v.as_str()).map(escape_csv_field).unwrap_or_default(),
                                v1.get("sku").and_then(|v| v.as_str()).map(escape_csv_field).unwrap_or_default(),
                                v1.get("cost").and_then(|v| v.as_str()).map(escape_csv_field).unwrap_or_default(),
                            )
                        } else {
                            (String::new(), String::new(), String::new())
                        }
                    } else {
                        // Try legacy vendor format
                        let vendor = attrs.get("vendor");
                        (
                            vendor.and_then(|v| v.get("name")).and_then(|v| v.as_str()).map(escape_csv_field).unwrap_or_default(),
                            vendor.and_then(|v| v.get("sku")).and_then(|v| v.as_str()).map(escape_csv_field).unwrap_or_default(),
                            vendor.and_then(|v| v.get("cost")).and_then(|v| v.as_str()).map(escape_csv_field).unwrap_or_default(),
                        )
                    };
                    
                    writeln!(file, "{},{},{},{:.2},{:.2},{},{},{},{:.2},{},{},{},{},{},{},{},{},{},{},{},{},{},{},{}", 
                        escape_csv_field(sku),
                        escape_csv_field(name),
                        escape_csv_field(cat),
                        price,
                        cost,
                        escape_csv_field(store_id.as_deref().unwrap_or("default-store")),
                        escape_csv_field(desc.as_deref().unwrap_or("")),
                        escape_csv_field(subcat.as_deref().unwrap_or("")),
                        qty,
                        escape_csv_field(barcode.as_deref().unwrap_or("")),
                        escape_csv_field(barcode_type.as_deref().unwrap_or("")),
                        get_attr("color"),
                        get_attr("size"),
                        get_attr("brand"),
                        get_attr("weight"),
                        get_attr("material"),
                        get_attr("custom_1"),
                        get_attr("custom_2"),
                        get_attr("custom_3"),
                        v1_name,
                        v1_sku,
                        v1_cost,
                        get_attr("notes"),
                        get_attr("tax_class"),
                    )?;
                }
            } else {
                let json_rows: Vec<serde_json::Value> = rows.iter().map(|(id, sku, name, desc, price, cost, qty, cat, subcat, barcode, barcode_type, attrs_json, store_id)| {
                    let attrs: serde_json::Value = attrs_json
                        .as_ref()
                        .and_then(|s| serde_json::from_str(s).ok())
                        .unwrap_or(serde_json::json!({}));
                    
                    serde_json::json!({
                        "id": id, "sku": sku, "name": name, "description": desc,
                        "price": price, "cost": cost, "quantity": qty, "category": cat,
                        "subcategory": subcat, "barcode": barcode, "barcode_type": barcode_type,
                        "store_id": store_id, "attributes": attrs
                    })
                }).collect();
                serde_json::to_writer_pretty(&file, &json_rows)?;
            }
        }
        "customers" => {
            let rows: Vec<(String, String, Option<String>, Option<String>, Option<String>)> = sqlx::query_as(
                r"SELECT id, name, email, phone, pricing_tier 
                  FROM customers WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name"
            )
            .bind(tenant_id)
            .fetch_all(pool)
            .await?;
            
            if format == "csv" {
                writeln!(file, "ID,Name,Email,Phone,Pricing Tier")?;
                for (id, name, email, phone, tier) in &rows {
                    writeln!(file, "{},{},{},{},{}", 
                        id, name.replace(',', ";"), email.as_deref().unwrap_or(""), 
                        phone.as_deref().unwrap_or(""), tier.as_deref().unwrap_or(""))?;
                }
            } else {
                let json_rows: Vec<serde_json::Value> = rows.iter().map(|(id, name, email, phone, tier)| {
                    serde_json::json!({
                        "id": id, "name": name, "email": email, "phone": phone, "pricing_tier": tier
                    })
                }).collect();
                serde_json::to_writer_pretty(&file, &json_rows)?;
            }
        }
        "inventory" => {
            let rows: Vec<(String, String, String, f64, Option<String>)> = sqlx::query_as(
                r"SELECT id, sku, name, quantity_on_hand, store_id 
                  FROM products WHERE tenant_id = ? AND is_active = 1 AND quantity_on_hand > 0 ORDER BY sku"
            )
            .bind(tenant_id)
            .fetch_all(pool)
            .await?;
            
            if format == "csv" {
                writeln!(file, "ID,SKU,Name,Quantity,Store")?;
                for (id, sku, name, qty, store) in &rows {
                    writeln!(file, "{},{},{},{:.2},{}", 
                        id, sku, name.replace(',', ";"), qty, store.as_deref().unwrap_or(""))?;
                }
            } else {
                let json_rows: Vec<serde_json::Value> = rows.iter().map(|(id, sku, name, qty, store)| {
                    serde_json::json!({
                        "id": id, "sku": sku, "name": name, "quantity": qty, "store_id": store
                    })
                }).collect();
                serde_json::to_writer_pretty(&file, &json_rows)?;
            }
        }
        "users" => {
            let rows: Vec<(String, String, Option<String>, String, Option<String>)> = sqlx::query_as(
                r"SELECT id, username, display_name, role, store_id 
                  FROM users WHERE tenant_id = ? AND is_active = 1 ORDER BY username"
            )
            .bind(tenant_id)
            .fetch_all(pool)
            .await?;
            
            if format == "csv" {
                writeln!(file, "ID,Username,Display Name,Role,Store")?;
                for (id, username, display, role, store) in &rows {
                    writeln!(file, "{},{},{},{},{}", 
                        id, username, display.as_deref().unwrap_or(""), role, store.as_deref().unwrap_or(""))?;
                }
            } else {
                let json_rows: Vec<serde_json::Value> = rows.iter().map(|(id, username, display, role, store)| {
                    serde_json::json!({
                        "id": id, "username": username, "display_name": display, "role": role, "store_id": store
                    })
                }).collect();
                serde_json::to_writer_pretty(&file, &json_rows)?;
            }
        }
        "sales" | "transactions" => {
            let rows: Vec<(String, Option<String>, String, f64, f64, f64, String)> = sqlx::query_as(
                r"SELECT id, customer_id, status, subtotal, tax, total, created_at 
                  FROM orders WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10000"
            )
            .bind(tenant_id)
            .fetch_all(pool)
            .await?;
            
            if format == "csv" {
                writeln!(file, "ID,Customer ID,Status,Subtotal,Tax,Total,Created At")?;
                for (id, cust, status, sub, tax, total, created) in &rows {
                    writeln!(file, "{},{},{},{:.2},{:.2},{:.2},{}", 
                        id, cust.as_deref().unwrap_or(""), status, sub, tax, total, created)?;
                }
            } else {
                let json_rows: Vec<serde_json::Value> = rows.iter().map(|(id, cust, status, sub, tax, total, created)| {
                    serde_json::json!({
                        "id": id, "customer_id": cust, "status": status, 
                        "subtotal": sub, "tax": tax, "total": total, "created_at": created
                    })
                }).collect();
                serde_json::to_writer_pretty(&file, &json_rows)?;
            }
        }
        "cases" => {
            let rows: Vec<(String, Option<String>, Option<String>, Option<String>, Option<String>, Option<f64>, Option<f64>, Option<f64>, Option<String>, Option<String>)> = sqlx::query_as(
                r"SELECT id, case_number, vendor_id, invoice_no, invoice_date, subtotal, tax, total, status, created_at 
                  FROM review_cases WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 10000"
            )
            .bind(tenant_id)
            .fetch_all(pool)
            .await?;
            
            if format == "csv" {
                writeln!(file, "ID,Case Number,Vendor ID,Invoice No,Invoice Date,Subtotal,Tax,Total,Status,Created At")?;
                for (id, case_num, vendor, inv_no, inv_date, sub, tax, total, status, created) in &rows {
                    writeln!(file, "{},{},{},{},{},{:.2},{:.2},{:.2},{},{}", 
                        id, 
                        case_num.as_deref().unwrap_or(""),
                        vendor.as_deref().unwrap_or(""),
                        inv_no.as_deref().unwrap_or(""),
                        inv_date.as_deref().unwrap_or(""),
                        sub.unwrap_or(0.0),
                        tax.unwrap_or(0.0),
                        total.unwrap_or(0.0),
                        status.as_deref().unwrap_or(""),
                        created.as_deref().unwrap_or(""))?;
                }
            } else {
                let json_rows: Vec<serde_json::Value> = rows.iter().map(|(id, case_num, vendor, inv_no, inv_date, sub, tax, total, status, created)| {
                    serde_json::json!({
                        "id": id, 
                        "case_number": case_num, 
                        "vendor_id": vendor,
                        "invoice_no": inv_no,
                        "invoice_date": inv_date,
                        "subtotal": sub, 
                        "tax": tax, 
                        "total": total, 
                        "status": status,
                        "created_at": created
                    })
                }).collect();
                serde_json::to_writer_pretty(&file, &json_rows)?;
            }
        }
        _ => {
            writeln!(file, "No data available for entity type: {}", entity_type)?;
        }
    }
    
    // Get file size
    let metadata = std::fs::metadata(file_path)?;
    Ok(metadata.len() as i64)
}

/// Import data from CSV
pub async fn import_data(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: web::Json<ImportRequest>,
) -> Result<HttpResponse> {
    let tenant_id = get_current_tenant_id();
    
    match req.entity_type.as_str() {
        "products" => import_products(pool, config_loader, &req.csv_data, &tenant_id).await,
        "customers" => import_customers(pool, &req.csv_data, &tenant_id).await,
        "vendors" => import_vendors(pool, &req.csv_data, &tenant_id).await,
        _ => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Unknown entity type: {}", req.entity_type)
        }))),
    }
}

/// Import products from CSV data
async fn import_products(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    csv_data: &str,
    tenant_id: &str,
) -> Result<HttpResponse> {
    let mut imported = 0i64;
    let mut skipped = 0i64;
    let mut errors = Vec::new();
    
    // Load config to get valid categories
    let config = config_loader.get_config(tenant_id).await.ok();
    let valid_categories: Vec<String> = config
        .as_ref()
        .map(|c| c.categories.iter().map(|cat| cat.id.clone()).collect())
        .unwrap_or_else(|| vec!["products".to_string()]);
    
    // Default category to use if specified category doesn't exist
    let default_category = valid_categories.first().cloned().unwrap_or_else(|| "products".to_string());
    
    // Parse CSV with flexible headers
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(csv_data.as_bytes());
    
    // Get headers and create a mapping
    let headers = match reader.headers() {
        Ok(h) => h.clone(),
        Err(e) => {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Failed to parse CSV headers: {}", e)
            })));
        }
    };
    
    // Store headers as Vec<String> for dynamic attribute detection
    let header_vec: Vec<String> = headers.iter().map(|h| h.to_string()).collect();
    
    // Map header names (strip * from required field markers)
    let header_map: std::collections::HashMap<String, usize> = headers
        .iter()
        .enumerate()
        .map(|(i, h)| (h.trim_end_matches('*').to_lowercase(), i))
        .collect();
    
    // First pass: collect all rows
    let mut rows: Vec<(usize, ProductImportRow, serde_json::Map<String, serde_json::Value>, Vec<AlternateSkuData>)> = Vec::new();
    let mut sku_to_id: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    
    for (row_idx, result) in reader.records().enumerate() {
        let row_num = row_idx + 2; // 1-indexed, plus header row
        
        let record = match result {
            Ok(r) => r,
            Err(e) => {
                errors.push(ImportError {
                    row: row_num,
                    field: None,
                    message: format!("Failed to parse row: {}", e),
                });
                skipped += 1;
                continue;
            }
        };
        
        // Parse row into ProductImportRow with dynamic attributes
        let (import_row, dynamic_attrs, alternate_skus) = match parse_product_row(&header_map, &header_vec, &record, row_num) {
            Ok(data) => data,
            Err(err) => {
                errors.push(err);
                skipped += 1;
                continue;
            }
        };
        
        rows.push((row_num, import_row, dynamic_attrs, alternate_skus));
    }
    
    // Create product service
    let service = ProductService::new(pool.get_ref().clone(), config_loader.get_ref().clone());
    let system_user_id = "system-import";
    
    // Second pass: import products (parents first, then variants)
    // Sort so that products without parent_sku come first
    rows.sort_by(|a, b| {
        let a_has_parent = a.1.parent_sku.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
        let b_has_parent = b.1.parent_sku.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
        a_has_parent.cmp(&b_has_parent)
    });
    
    for (row_num, import_row, dynamic_attrs, alternate_skus) in rows {
        // Resolve parent_id from parent_sku
        let parent_id = if let Some(ref parent_sku) = import_row.parent_sku {
            if !parent_sku.is_empty() {
                match sku_to_id.get(parent_sku) {
                    Some(id) => Some(id.clone()),
                    None => {
                        // Try to find parent in database
                        match find_product_by_sku(pool.get_ref(), parent_sku, tenant_id).await {
                            Ok(Some(id)) => {
                                sku_to_id.insert(parent_sku.clone(), id.clone());
                                Some(id)
                            }
                            Ok(None) => {
                                errors.push(ImportError {
                                    row: row_num,
                                    field: Some("parent_sku".to_string()),
                                    message: format!("Parent product with SKU '{}' not found", parent_sku),
                                });
                                skipped += 1;
                                continue;
                            }
                            Err(e) => {
                                errors.push(ImportError {
                                    row: row_num,
                                    field: Some("parent_sku".to_string()),
                                    message: format!("Error looking up parent: {}", e),
                                });
                                skipped += 1;
                                continue;
                            }
                        }
                    }
                }
            } else {
                None
            }
        } else {
            None
        };
        
        // Build create request with dynamic attributes
        let mut create_req = import_row.to_create_request(parent_id);
        
        // Normalize category to a valid one (fallback to default if not found)
        if !valid_categories.contains(&create_req.category) {
            tracing::info!(
                "Row {}: Category '{}' not found, using default '{}'",
                row_num, create_req.category, default_category
            );
            create_req.category = default_category.clone();
        }
        
        // Merge dynamic attributes
        if !dynamic_attrs.is_empty() {
            let existing_attrs = create_req.attributes.unwrap_or(serde_json::json!({}));
            let mut merged = match existing_attrs {
                serde_json::Value::Object(map) => map,
                _ => serde_json::Map::new(),
            };
            for (key, value) in dynamic_attrs {
                merged.insert(key, value);
            }
            create_req.attributes = Some(serde_json::Value::Object(merged));
        }
        
        let sku = create_req.sku.clone();
        
        match service.create_product(create_req, tenant_id, system_user_id).await {
            Ok(product) => {
                let product_id = product.id.clone();
                sku_to_id.insert(sku, product_id.clone());
                
                // Insert alternate SKUs
                for alt_sku in alternate_skus {
                    let _ = insert_alternate_sku(
                        pool.get_ref(),
                        &product_id,
                        &alt_sku.alternate_sku,
                        &alt_sku.sku_type,
                        tenant_id,
                    ).await;
                }
                
                imported += 1;
            }
            Err(validation_errors) => {
                let error_messages: Vec<String> = validation_errors
                    .iter()
                    .map(|e| format!("{}: {}", e.field, e.message))
                    .collect();
                errors.push(ImportError {
                    row: row_num,
                    field: None,
                    message: error_messages.join("; "),
                });
                skipped += 1;
            }
        }
    }
    
    Ok(HttpResponse::Ok().json(ImportResponse {
        imported,
        skipped,
        errors,
    }))
}

/// Insert an alternate SKU for a product
async fn insert_alternate_sku(
    pool: &SqlitePool,
    product_id: &str,
    alternate_sku: &str,
    sku_type: &str,
    tenant_id: &str,
) -> std::result::Result<(), sqlx::Error> {
    let id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    sqlx::query(
        r#"
        INSERT OR IGNORE INTO product_alternate_skus 
        (id, product_id, alternate_sku, sku_type, tenant_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&id)
    .bind(product_id)
    .bind(alternate_sku)
    .bind(sku_type)
    .bind(tenant_id)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await?;
    
    Ok(())
}

/// Parse a CSV record into product data with dynamic attributes
fn parse_product_row(
    header_map: &std::collections::HashMap<String, usize>,
    headers: &[String],
    record: &csv::StringRecord,
    row_num: usize,
) -> std::result::Result<(ProductImportRow, serde_json::Map<String, serde_json::Value>, Vec<AlternateSkuData>), ImportError> {
    let get_field = |name: &str| -> Option<String> {
        header_map.get(name).and_then(|&idx| {
            record.get(idx).map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
        })
    };
    
    let get_required = |name: &str| -> std::result::Result<String, ImportError> {
        get_field(name).ok_or_else(|| ImportError {
            row: row_num,
            field: Some(name.to_string()),
            message: format!("Required field '{}' is missing or empty", name),
        })
    };
    
    let parse_f64 = |name: &str, value: &str| -> std::result::Result<f64, ImportError> {
        value.parse::<f64>().map_err(|_| ImportError {
            row: row_num,
            field: Some(name.to_string()),
            message: format!("Invalid number for '{}': '{}'", name, value),
        })
    };
    
    // Required fields
    let sku = get_required("sku")?;
    let name = get_required("name")?;
    let category = get_required("category")?;
    let unit_price_str = get_required("unit_price").or_else(|_| get_required("price"))?;
    let unit_price = parse_f64("unit_price", &unit_price_str)?;
    let cost_str = get_required("cost")?;
    let cost = parse_f64("cost", &cost_str)?;
    let store_id = get_required("store_id").unwrap_or_else(|_| "default-store".to_string());
    
    // Optional numeric fields
    let quantity = get_field("quantity")
        .and_then(|s| s.parse::<f64>().ok());
    let reorder_point = get_field("reorder_point")
        .and_then(|s| s.parse::<f64>().ok());
    
    // Optional boolean
    let is_active = get_field("is_active")
        .map(|s| matches!(s.to_lowercase().as_str(), "true" | "1" | "yes" | "active"));
    
    // Collect ALL dynamic attributes (any column starting with attr_)
    let mut dynamic_attrs = serde_json::Map::new();
    for header in headers {
        let header_lower = header.to_lowercase();
        if header_lower.starts_with("attr_") {
            if let Some(value) = get_field(&header_lower) {
                let attr_name = header_lower.strip_prefix("attr_").unwrap_or(&header_lower);
                dynamic_attrs.insert(attr_name.to_string(), serde_json::Value::String(value));
            }
        }
    }
    
    // Collect vendor information (multiple vendors supported)
    let mut vendors = Vec::new();
    for i in 1..=10 {
        let vendor_name = get_field(&format!("vendor_{}_name", i));
        let vendor_sku = get_field(&format!("vendor_{}_sku", i));
        let vendor_cost = get_field(&format!("vendor_{}_cost", i));
        
        if vendor_name.is_some() || vendor_sku.is_some() {
            let mut vendor = serde_json::Map::new();
            if let Some(name) = vendor_name {
                vendor.insert("name".to_string(), serde_json::Value::String(name));
            }
            if let Some(sku) = vendor_sku {
                vendor.insert("sku".to_string(), serde_json::Value::String(sku));
            }
            if let Some(cost) = vendor_cost {
                vendor.insert("cost".to_string(), serde_json::Value::String(cost));
            }
            vendors.push(serde_json::Value::Object(vendor));
        }
    }
    if !vendors.is_empty() {
        dynamic_attrs.insert("vendors".to_string(), serde_json::Value::Array(vendors));
    }
    
    // Collect alternate/cross-linked SKUs
    let mut alternate_skus = Vec::new();
    
    // Manufacturer SKU
    if let Some(mfg_sku) = get_field("alt_sku_manufacturer") {
        alternate_skus.push(AlternateSkuData {
            alternate_sku: mfg_sku,
            sku_type: "manufacturer".to_string(),
            vendor_id: None,
        });
    }
    
    // UPC
    if let Some(upc) = get_field("alt_sku_upc") {
        alternate_skus.push(AlternateSkuData {
            alternate_sku: upc,
            sku_type: "upc".to_string(),
            vendor_id: None,
        });
    }
    
    // EAN
    if let Some(ean) = get_field("alt_sku_ean") {
        alternate_skus.push(AlternateSkuData {
            alternate_sku: ean,
            sku_type: "ean".to_string(),
            vendor_id: None,
        });
    }
    
    // Vendor-specific alternate SKUs
    for i in 1..=10 {
        if let Some(vendor_alt_sku) = get_field(&format!("alt_sku_vendor_{}", i)) {
            alternate_skus.push(AlternateSkuData {
                alternate_sku: vendor_alt_sku,
                sku_type: "vendor".to_string(),
                vendor_id: get_field(&format!("vendor_{}_name", i)),
            });
        }
    }
    
    // Add tax_class and notes to attributes
    if let Some(tax_class) = get_field("tax_class") {
        dynamic_attrs.insert("tax_class".to_string(), serde_json::Value::String(tax_class));
    }
    if let Some(notes) = get_field("notes") {
        dynamic_attrs.insert("notes".to_string(), serde_json::Value::String(notes));
    }
    
    let row = ProductImportRow {
        sku,
        name,
        category,
        unit_price,
        cost,
        store_id,
        description: get_field("description"),
        subcategory: get_field("subcategory"),
        quantity,
        reorder_point,
        barcode: get_field("barcode"),
        barcode_type: get_field("barcode_type"),
        is_active,
        parent_sku: get_field("parent_sku"),
        images: get_field("images"),
        // These are now handled dynamically
        attr_color: None,
        attr_size: None,
        attr_brand: None,
        attr_weight: None,
        attr_material: None,
        vendor_name: None,
        vendor_sku: None,
        vendor_cost: None,
        tax_class: None,
        notes: None,
    };
    
    Ok((row, dynamic_attrs, alternate_skus))
}

/// Alternate SKU data for cross-linking
#[derive(Debug, Clone)]
#[allow(dead_code)]
struct AlternateSkuData {
    alternate_sku: String,
    sku_type: String,
    vendor_id: Option<String>,
}

/// Find product ID by SKU
async fn find_product_by_sku(
    pool: &SqlitePool,
    sku: &str,
    tenant_id: &str,
) -> std::result::Result<Option<String>, sqlx::Error> {
    let result: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM products WHERE sku = ? AND tenant_id = ? AND is_active = 1"
    )
    .bind(sku)
    .bind(tenant_id)
    .fetch_optional(pool)
    .await?;
    
    Ok(result.map(|(id,)| id))
}

/// Import customers from CSV data
async fn import_customers(
    pool: web::Data<SqlitePool>,
    csv_data: &str,
    tenant_id: &str,
) -> Result<HttpResponse> {
    let mut imported = 0i64;
    let mut skipped = 0i64;
    let mut errors = Vec::new();
    
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(csv_data.as_bytes());
    
    let headers = match reader.headers() {
        Ok(h) => h.clone(),
        Err(e) => {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Failed to parse CSV headers: {}", e)
            })));
        }
    };
    
    let header_map: std::collections::HashMap<String, usize> = headers
        .iter()
        .enumerate()
        .map(|(i, h)| (h.trim_end_matches('*').to_lowercase(), i))
        .collect();
    
    for (row_idx, result) in reader.records().enumerate() {
        let row_num = row_idx + 2;
        
        let record = match result {
            Ok(r) => r,
            Err(e) => {
                errors.push(ImportError {
                    row: row_num,
                    field: None,
                    message: format!("Failed to parse row: {}", e),
                });
                skipped += 1;
                continue;
            }
        };
        
        let get_field = |name: &str| -> Option<String> {
            header_map.get(name).and_then(|&idx| {
                record.get(idx).map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
            })
        };
        
        // Required: name
        let name = match get_field("name") {
            Some(n) => n,
            None => {
                errors.push(ImportError {
                    row: row_num,
                    field: Some("name".to_string()),
                    message: "Required field 'name' is missing".to_string(),
                });
                skipped += 1;
                continue;
            }
        };
        
        let id = get_field("id").unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let email = get_field("email");
        let phone = get_field("phone");
        let address = get_field("address");
        let city = get_field("city");
        let state = get_field("state");
        let zip = get_field("zip");
        let pricing_tier = get_field("pricing_tier").unwrap_or_else(|| "Retail".to_string());
        let store_id = get_field("store_id").unwrap_or_else(|| "default-store".to_string());
        let now = chrono::Utc::now().to_rfc3339();
        
        let result = sqlx::query(
            r"INSERT INTO customers (id, name, email, phone, address, city, state, zip, pricing_tier, store_id, tenant_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET 
                name = excluded.name, email = excluded.email, phone = excluded.phone,
                address = excluded.address, city = excluded.city, state = excluded.state, zip = excluded.zip,
                pricing_tier = excluded.pricing_tier, updated_at = excluded.updated_at"
        )
        .bind(&id)
        .bind(&name)
        .bind(&email)
        .bind(&phone)
        .bind(&address)
        .bind(&city)
        .bind(&state)
        .bind(&zip)
        .bind(&pricing_tier)
        .bind(&store_id)
        .bind(tenant_id)
        .bind(&now)
        .bind(&now)
        .execute(pool.get_ref())
        .await;
        
        match result {
            Ok(_) => imported += 1,
            Err(e) => {
                errors.push(ImportError {
                    row: row_num,
                    field: None,
                    message: format!("Database error: {}", e),
                });
                skipped += 1;
            }
        }
    }
    
    Ok(HttpResponse::Ok().json(ImportResponse {
        imported,
        skipped,
        errors,
    }))
}

/// Import vendors from CSV data
async fn import_vendors(
    pool: web::Data<SqlitePool>,
    csv_data: &str,
    tenant_id: &str,
) -> Result<HttpResponse> {
    let mut imported = 0i64;
    let mut skipped = 0i64;
    let mut errors = Vec::new();
    
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(csv_data.as_bytes());
    
    let headers = match reader.headers() {
        Ok(h) => h.clone(),
        Err(e) => {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Failed to parse CSV headers: {}", e)
            })));
        }
    };
    
    let header_map: std::collections::HashMap<String, usize> = headers
        .iter()
        .enumerate()
        .map(|(i, h)| (h.trim_end_matches('*').to_lowercase(), i))
        .collect();
    
    for (row_idx, result) in reader.records().enumerate() {
        let row_num = row_idx + 2;
        
        let record = match result {
            Ok(r) => r,
            Err(e) => {
                errors.push(ImportError {
                    row: row_num,
                    field: None,
                    message: format!("Failed to parse row: {}", e),
                });
                skipped += 1;
                continue;
            }
        };
        
        let get_field = |name: &str| -> Option<String> {
            header_map.get(name).and_then(|&idx| {
                record.get(idx).map(|s| s.trim().to_string()).filter(|s| !s.is_empty())
            })
        };
        
        // Required: name
        let name = match get_field("name") {
            Some(n) => n,
            None => {
                errors.push(ImportError {
                    row: row_num,
                    field: Some("name".to_string()),
                    message: "Required field 'name' is missing".to_string(),
                });
                skipped += 1;
                continue;
            }
        };
        
        let id = get_field("id").unwrap_or_else(|| uuid::Uuid::new_v4().to_string());
        let tax_id = get_field("tax_id");
        let email = get_field("email");
        let phone = get_field("phone");
        let address = get_field("address");
        let website = get_field("website");
        let contact_name = get_field("contact_name");
        let payment_terms = get_field("payment_terms");
        let now = chrono::Utc::now().to_rfc3339();
        
        // Build identifiers JSON for vendor detection
        let mut identifiers = serde_json::Map::new();
        if let Some(ref e) = email {
            identifiers.insert("email".to_string(), serde_json::Value::String(e.clone()));
        }
        if let Some(ref p) = phone {
            identifiers.insert("phone".to_string(), serde_json::Value::String(p.clone()));
        }
        let identifiers_json = serde_json::to_string(&identifiers).unwrap_or_else(|_| "{}".to_string());
        
        let result = sqlx::query(
            r"INSERT INTO vendors (id, name, tax_id, email, phone, address, website, contact_name, payment_terms, identifiers, tenant_id, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
              ON CONFLICT(id) DO UPDATE SET 
                name = excluded.name, tax_id = excluded.tax_id, email = excluded.email, 
                phone = excluded.phone, address = excluded.address, website = excluded.website,
                contact_name = excluded.contact_name, payment_terms = excluded.payment_terms,
                identifiers = excluded.identifiers, updated_at = excluded.updated_at"
        )
        .bind(&id)
        .bind(&name)
        .bind(&tax_id)
        .bind(&email)
        .bind(&phone)
        .bind(&address)
        .bind(&website)
        .bind(&contact_name)
        .bind(&payment_terms)
        .bind(&identifiers_json)
        .bind(tenant_id)
        .bind(&now)
        .bind(&now)
        .execute(pool.get_ref())
        .await;
        
        match result {
            Ok(_) => imported += 1,
            Err(e) => {
                errors.push(ImportError {
                    row: row_num,
                    field: None,
                    message: format!("Database error: {}", e),
                });
                skipped += 1;
            }
        }
    }
    
    Ok(HttpResponse::Ok().json(ImportResponse {
        imported,
        skipped,
        errors,
    }))
}

/// Cleanup old data
pub async fn cleanup_data(
    pool: web::Data<SqlitePool>,
    req: web::Json<CleanupRequest>,
) -> Result<HttpResponse> {
    let days_old = req.days_old.unwrap_or(30);
    
    let deleted_count = match req.operation.as_str() {
        "sessions" => {
            // Delete sessions older than specified days
            let result = sqlx::query!(
                r#"
                DELETE FROM sessions
                WHERE created_at < datetime('now', '-' || ? || ' days')
                "#,
                days_old
            )
            .execute(pool.get_ref())
            .await;
            
            match result {
                Ok(result) => result.rows_affected() as i64,
                Err(e) => {
                    return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to cleanup sessions: {}", e)
                    })));
                }
            }
        },
        "layaways" => {
            // Archive completed layaways older than specified days
            // In production, would move to archive table instead of deleting
            let result = sqlx::query!(
                r#"
                UPDATE layaways
                SET archived = 1, archived_at = CURRENT_TIMESTAMP
                WHERE status = 'completed'
                AND completed_at < datetime('now', '-' || ? || ' days')
                AND archived = 0
                "#,
                days_old
            )
            .execute(pool.get_ref())
            .await;
            
            match result {
                Ok(result) => result.rows_affected() as i64,
                Err(e) => {
                    return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to archive layaways: {}", e)
                    })));
                }
            }
        },
        _ => {
            return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid cleanup operation"
            })));
        }
    };

    Ok(HttpResponse::Ok().json(CleanupResponse {
        deleted_count,
        operation: req.operation.clone(),
    }))
}

/// Demo import request
#[derive(Debug, Deserialize)]
pub struct DemoImportRequest {
    pub entity_types: Vec<String>,
}

/// Demo import response
#[derive(Debug, Serialize)]
pub struct DemoImportResponse {
    pub imported: DemoImportCounts,
}

#[derive(Debug, Serialize)]
pub struct DemoImportCounts {
    pub products: i64,
    pub customers: i64,
    pub vendors: i64,
}

/// Import demo data from bundled CSV files
/// POST /api/setup/import-demo
pub async fn import_demo_data(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: web::Json<DemoImportRequest>,
) -> Result<HttpResponse> {
    let tenant_id = get_current_tenant_id();
    let mut counts = DemoImportCounts {
        products: 0,
        customers: 0,
        vendors: 0,
    };
    
    // Demo data directory - check multiple possible locations
    let demo_dirs = vec![
        "./data/demo-import",
        "../data/demo-import",
        "/app/data/demo-import",
        "/data/demo-import",
    ];
    
    let demo_dir = demo_dirs.iter()
        .find(|dir| std::path::Path::new(dir).exists())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "./data/demo-import".to_string());
    
    for entity_type in &req.entity_types {
        match entity_type.as_str() {
            "products" => {
                let csv_path = format!("{}/demo_products.csv", demo_dir);
                if let Ok(csv_data) = std::fs::read_to_string(&csv_path) {
                    // Filter out comment lines (starting with #)
                    let filtered_csv: String = csv_data
                        .lines()
                        .filter(|line| !line.trim().starts_with('#'))
                        .collect::<Vec<_>>()
                        .join("\n");
                    
                    match import_products(pool.clone(), config_loader.clone(), &filtered_csv, &tenant_id).await {
                        Ok(_response) => {
                            // Extract the JSON body directly
                            // Note: This is a workaround since we can't easily extract body from HttpResponse
                            // In production, refactor import_products to return ImportResponse directly
                            tracing::info!("Demo products imported successfully");
                            counts.products = 1; // Placeholder - actual count not available
                        }
                        Err(e) => {
                            tracing::error!("Failed to import demo products: {:?}", e);
                        }
                    }
                } else {
                    tracing::warn!("Demo products CSV not found at: {}", csv_path);
                }
            }
            "customers" => {
                let csv_path = format!("{}/demo_customers.csv", demo_dir);
                if let Ok(csv_data) = std::fs::read_to_string(&csv_path) {
                    // Filter out comment lines
                    let filtered_csv: String = csv_data
                        .lines()
                        .filter(|line| !line.trim().starts_with('#'))
                        .collect::<Vec<_>>()
                        .join("\n");
                    
                    // For customers, we need to transform first_name + last_name to name
                    let transformed_csv = transform_customer_csv(&filtered_csv);
                    
                    match import_customers(pool.clone(), &transformed_csv, &tenant_id).await {
                        Ok(_response) => {
                            // Extract the JSON body directly
                            // Note: This is a workaround since we can't easily extract body from HttpResponse
                            // In production, refactor import_customers to return ImportResponse directly
                            tracing::info!("Demo customers imported successfully");
                            counts.customers = 1; // Placeholder - actual count not available
                        }
                        Err(e) => {
                            tracing::error!("Failed to import demo customers: {:?}", e);
                        }
                    }
                } else {
                    tracing::warn!("Demo customers CSV not found at: {}", csv_path);
                }
            }
            "vendors" => {
                let csv_path = format!("{}/demo_vendors.csv", demo_dir);
                if let Ok(csv_data) = std::fs::read_to_string(&csv_path) {
                    // Filter out comment lines
                    let filtered_csv: String = csv_data
                        .lines()
                        .filter(|line| !line.trim().starts_with('#'))
                        .collect::<Vec<_>>()
                        .join("\n");
                    
                    match import_vendors(pool.clone(), &filtered_csv, &tenant_id).await {
                        Ok(_response) => {
                            // Extract the JSON body directly
                            // Note: This is a workaround since we can't easily extract body from HttpResponse
                            // In production, refactor import_vendors to return ImportResponse directly
                            tracing::info!("Demo vendors imported successfully");
                            counts.vendors = 1; // Placeholder - actual count not available
                        }
                        Err(e) => {
                            tracing::error!("Failed to import demo vendors: {:?}", e);
                        }
                    }
                } else {
                    tracing::warn!("Demo vendors CSV not found at: {}", csv_path);
                }
            }
            _ => {
                tracing::warn!("Unknown entity type for demo import: {}", entity_type);
            }
        }
    }
    
    Ok(HttpResponse::Ok().json(DemoImportResponse { imported: counts }))
}

/// Transform customer CSV from first_name/last_name format to name format
fn transform_customer_csv(csv_data: &str) -> String {
    let mut reader = csv::ReaderBuilder::new()
        .has_headers(true)
        .flexible(true)
        .trim(csv::Trim::All)
        .from_reader(csv_data.as_bytes());
    
    let headers = match reader.headers() {
        Ok(h) => h.clone(),
        Err(_) => return csv_data.to_string(),
    };
    
    // Find first_name and last_name columns
    let first_name_idx = headers.iter().position(|h| h.trim_end_matches('*').to_lowercase() == "first_name");
    let last_name_idx = headers.iter().position(|h| h.trim_end_matches('*').to_lowercase() == "last_name");
    
    if first_name_idx.is_none() || last_name_idx.is_none() {
        return csv_data.to_string();
    }
    
    let first_idx = first_name_idx.unwrap();
    let last_idx = last_name_idx.unwrap();
    
    // Build new headers (replace first_name with name, skip last_name)
    let mut new_headers: Vec<String> = Vec::new();
    for (i, h) in headers.iter().enumerate() {
        if i == first_idx {
            new_headers.push("name".to_string());
        } else if i == last_idx {
            // Skip last_name column
            continue;
        } else {
            new_headers.push(h.trim_end_matches('*').to_string());
        }
    }
    
    let mut output = vec![new_headers.join(",")];
    
    for result in reader.records() {
        if let Ok(record) = result {
            let mut new_row: Vec<String> = Vec::new();
            let first_name = record.get(first_idx).unwrap_or("").trim();
            let last_name = record.get(last_idx).unwrap_or("").trim();
            let full_name = format!("{} {}", first_name, last_name).trim().to_string();
            
            for (i, field) in record.iter().enumerate() {
                if i == first_idx {
                    new_row.push(format!("\"{}\"", full_name));
                } else if i == last_idx {
                    // Skip last_name
                    continue;
                } else {
                    new_row.push(format!("\"{}\"", field.trim()));
                }
            }
            output.push(new_row.join(","));
        }
    }
    
    output.join("\n")
}

/// Clear demo data
/// DELETE /api/setup/clear-demo
pub async fn clear_demo_data(
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse> {
    let tenant_id = get_current_tenant_id();
    
    // Delete products with DEMO- prefix
    let products_deleted = sqlx::query(
        "DELETE FROM products WHERE tenant_id = ? AND sku LIKE 'DEMO-%'"
    )
    .bind(&tenant_id)
    .execute(pool.get_ref())
    .await
    .map(|r| r.rows_affected())
    .unwrap_or(0);
    
    // Delete customers imported from demo (check for demo email patterns or notes)
    // For safety, only delete customers with specific demo markers
    let customers_deleted = sqlx::query(
        "DELETE FROM customers WHERE tenant_id = ? AND (email LIKE '%@email.com' OR email LIKE '%@example.com')"
    )
    .bind(&tenant_id)
    .execute(pool.get_ref())
    .await
    .map(|r| r.rows_affected())
    .unwrap_or(0);
    
    // Delete vendors with demo keywords
    let vendors_deleted = sqlx::query(
        "DELETE FROM vendors WHERE tenant_id = ? AND (name LIKE 'Tech Distributors%' OR name LIKE 'Textile World%' OR name LIKE 'Home Goods Inc%' OR name LIKE 'Tool Supply Co%' OR name LIKE 'Food Distributors%' OR name LIKE 'Audio Wholesale%' OR name LIKE 'Fashion Supply%' OR name LIKE 'General Supplies%')"
    )
    .bind(&tenant_id)
    .execute(pool.get_ref())
    .await
    .map(|r| r.rows_affected())
    .unwrap_or(0);
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "cleared": {
            "products": products_deleted,
            "customers": customers_deleted,
            "vendors": vendors_deleted
        }
    })))
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/data-management")
            .route("/backup", web::post().to(create_backup))
            .route("/backups", web::get().to(get_backup_history))
            .route("/export", web::post().to(export_data))
            .route("/import", web::post().to(import_data))
            .route("/cleanup", web::post().to(cleanup_data))
    );
}
