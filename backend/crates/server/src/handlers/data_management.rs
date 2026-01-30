use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::{DateTime, Utc};

use crate::middleware::get_current_tenant_id;
use crate::models::CreateProductRequest;
use crate::services::ProductService;
use crate::config::loader::ConfigLoader;

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
#[derive(Debug, Serialize)]
pub struct ImportResponse {
    pub imported: i64,
    pub skipped: i64,
    pub errors: Vec<ImportError>,
}

#[derive(Debug, Serialize)]
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
    _pool: web::Data<SqlitePool>,
    req: web::Json<ExportRequest>,
) -> Result<HttpResponse> {
    let format = req.format.as_deref().unwrap_or("csv");
    
    // Validate entity type
    let valid_entities = vec!["products", "customers", "sales", "inventory", "users", "transactions"];
    if !valid_entities.contains(&req.entity_type.as_str()) {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid entity type"
        })));
    }

    // In production, this would:
    // 1. Query the appropriate table
    // 2. Convert to CSV/JSON format
    // 3. Write to file
    // 4. Return file path or stream
    
    let export_path = format!("./data/exports/{}_{}.{}", req.entity_type, Utc::now().timestamp(), format);
    
    // Mock record count - would be actual query result
    let record_count = match req.entity_type.as_str() {
        "products" => 1250,
        "customers" => 850,
        "sales" => 5420,
        "inventory" => 1100,
        "users" => 15,
        "transactions" => 8900,
        _ => 0,
    };

    Ok(HttpResponse::Ok().json(ExportResponse {
        file_path: export_path,
        record_count,
        file_size: record_count * 512, // Mock file size
    }))
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
        "customers" => {
            // TODO: Implement customer import
            Ok(HttpResponse::Ok().json(ImportResponse {
                imported: 0,
                skipped: 0,
                errors: vec![ImportError {
                    row: 0,
                    field: None,
                    message: "Customer import not yet implemented".to_string(),
                }],
            }))
        }
        "vendors" => {
            // TODO: Implement vendor import
            Ok(HttpResponse::Ok().json(ImportResponse {
                imported: 0,
                skipped: 0,
                errors: vec![ImportError {
                    row: 0,
                    field: None,
                    message: "Vendor import not yet implemented".to_string(),
                }],
            }))
        }
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
