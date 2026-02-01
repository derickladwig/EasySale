use crate::models::vendor::{VendorBill, VendorBillLine, VendorSkuAlias};
use crate::services::{BillIngestService, ReceivingService, UnitConversionService};
use crate::services::receiving_service::CostPolicy;
use crate::services::matching_engine::{MatchingEngine, MatchSuggestionsRequest};
use actix_multipart::Multipart;
use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use futures_util::StreamExt;
use serde::Deserialize;
use sqlx::SqlitePool;
use chrono;
use uuid;

/// Upload vendor bill file
/// Requirements: 1.1, 1.7
pub async fn upload_bill(
    req: HttpRequest,
    mut payload: Multipart,
    _pool: web::Data<SqlitePool>,
    ingest_service: web::Data<BillIngestService>,
) -> Result<HttpResponse, actix_web::Error> {
    // Extract user context from request
    let user_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let tenant_id = req.extensions().get::<String>().cloned().unwrap_or_default();

    let mut file_data: Vec<u8> = Vec::new();
    let mut filename = String::new();
    let mut mime_type = String::from("application/octet-stream");
    let mut vendor_id: Option<String> = None;

    // Process multipart form data
    while let Some(item) = payload.next().await {
        let mut field = item?;
        let content_disposition = field.content_disposition();
        
        match content_disposition.get_name() {
            Some("file") => {
                filename = content_disposition
                    .get_filename()
                    .unwrap_or("unknown")
                    .to_string();
                
                if let Some(content_type) = field.content_type() {
                    mime_type = content_type.to_string();
                }

                while let Some(chunk) = field.next().await {
                    let data = chunk?;
                    file_data.extend_from_slice(&data);
                }
            }
            Some("vendor_id") => {
                while let Some(chunk) = field.next().await {
                    let data = chunk?;
                    vendor_id = Some(String::from_utf8_lossy(&data).to_string());
                }
            }
            _ => {}
        }
    }

    if file_data.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "No file provided"
        })));
    }

    // Upload bill
    match ingest_service
        .upload_bill(&file_data, &filename, &mime_type, vendor_id, &tenant_id, &user_id)
        .await
    {
        Ok(bill_id) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "bill_id": bill_id,
            "status": "DRAFT",
            "message": "Bill uploaded successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

/// Get vendor bill with parse and lines
/// Requirements: 14.3
pub async fn get_bill(
    req: HttpRequest,
    bill_id: web::Path<String>,
    ingest_service: web::Data<BillIngestService>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = req.extensions().get::<String>().cloned().unwrap_or_default();

    match ingest_service
        .get_bill_with_parse(&bill_id, &tenant_id)
        .await
    {
        Ok((bill, parse, lines)) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "bill": bill,
            "parse": parse,
            "lines": lines
        }))),
        Err(e) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

#[derive(Debug, Deserialize)]
pub struct ListBillsQuery {
    pub vendor_id: Option<String>,
    pub status: Option<String>,
    pub date_from: Option<String>,
    pub date_to: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

/// List vendor bills with filters
/// Requirements: 14.1, 14.4
pub async fn list_bills(
    req: HttpRequest,
    query: web::Query<ListBillsQuery>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(50);
    let offset = (page - 1) * page_size;

    let mut sql = String::from("SELECT * FROM vendor_bills WHERE tenant_id = ?");
    let mut params: Vec<String> = vec![tenant_id.clone()];

    if let Some(ref vendor_id) = query.vendor_id {
        sql.push_str(" AND vendor_id = ?");
        params.push(vendor_id.clone());
    }

    if let Some(ref status) = query.status {
        sql.push_str(" AND status = ?");
        params.push(status.clone());
    }

    if let Some(ref date_from) = query.date_from {
        sql.push_str(" AND invoice_date >= ?");
        params.push(date_from.clone());
    }

    if let Some(ref date_to) = query.date_to {
        sql.push_str(" AND invoice_date <= ?");
        params.push(date_to.clone());
    }

    sql.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");

    let mut query_builder = sqlx::query_as::<_, VendorBill>(&sql);
    for param in params {
        query_builder = query_builder.bind(param);
    }
    query_builder = query_builder.bind(page_size).bind(offset);

    match query_builder.fetch_all(pool.get_ref()).await {
        Ok(bills) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "bills": bills,
            "page": page,
            "page_size": page_size
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

#[derive(Debug, Deserialize)]
pub struct UpdateMatchesRequest {
    pub lines: Vec<LineUpdate>,
}

#[derive(Debug, Deserialize)]
pub struct LineUpdate {
    pub line_id: String,
    pub matched_sku: String,
    pub normalized_qty: Option<f64>,
    pub normalized_unit: Option<String>,
}

/// Update line item matches
/// Requirements: 9.5, 9.6
pub async fn update_matches(
    req: HttpRequest,
    bill_id: web::Path<String>,
    updates: web::Json<UpdateMatchesRequest>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let now = chrono::Utc::now().to_rfc3339();
    let unit_service = UnitConversionService::new();

    for line_update in &updates.lines {
        // Get the line to check for unit conversion from alias
        let line: Option<VendorBillLine> = sqlx::query_as(
            r#"
            SELECT vbl.* FROM vendor_bill_lines vbl
            JOIN vendor_bills vb ON vbl.vendor_bill_id = vb.id
            WHERE vbl.id = ? AND vb.id = ? AND vb.tenant_id = ?
            "#
        )
        .bind(&line_update.line_id)
        .bind(bill_id.as_str())
        .bind(&tenant_id)
        .fetch_optional(pool.get_ref())
        .await
        .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

        let line = match line {
            Some(l) => l,
            None => continue, // Skip if line not found
        };

        // Check if there's an alias with unit conversion
        let mut final_qty = line_update.normalized_qty;
        let mut final_unit = line_update.normalized_unit.clone();

        if let (Some(qty), Some(unit)) = (line_update.normalized_qty, &line_update.normalized_unit) {
            let alias: Option<VendorSkuAlias> = sqlx::query_as(
                "SELECT * FROM vendor_sku_aliases WHERE vendor_sku_norm = ? AND internal_sku = ? AND tenant_id = ?"
            )
            .bind(&line.vendor_sku_norm)
            .bind(&line_update.matched_sku)
            .bind(&tenant_id)
            .fetch_optional(pool.get_ref())
            .await
            .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

            if let Some(alias) = alias {
                if let Ok(Some(unit_conv)) = alias.get_unit_conversion() {
                    // Apply unit conversion from alias
                    if let Ok(normalized) = unit_service.apply_alias_conversion(qty, &unit_conv) {
                        final_qty = Some(normalized.quantity);
                        final_unit = Some(normalized.unit.clone());
                        tracing::info!(
                            "Applied unit conversion for line {}: {} {} -> {} {}",
                            line.line_no,
                            qty,
                            unit,
                            normalized.quantity,
                            &normalized.unit
                        );
                    }
                }
            }
        }

        let result = sqlx::query(
            r#"
            UPDATE vendor_bill_lines
            SET matched_sku = ?, normalized_qty = ?, normalized_unit = ?,
                user_overridden = 1, updated_at = ?
            WHERE id = ? AND vendor_bill_id IN (
                SELECT id FROM vendor_bills WHERE id = ? AND tenant_id = ?
            )
            "#,
        )
        .bind(&line_update.matched_sku)
        .bind(final_qty)
        .bind(&final_unit)
        .bind(&now)
        .bind(&line_update.line_id)
        .bind(bill_id.as_str())
        .bind(&tenant_id)
        .execute(pool.get_ref())
        .await;

        if let Err(e) = result {
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": e.to_string()
            })));
        }
    }

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Matches updated successfully"
    })))
}

#[derive(Debug, Deserialize)]
pub struct CreateAliasRequest {
    pub vendor_id: String,
    pub vendor_sku: String,
    pub internal_sku: String,
    pub unit_conversion: Option<serde_json::Value>,
    pub priority: Option<i32>,
}

/// Create vendor SKU alias
/// Requirements: 7.1, 7.3
pub async fn create_alias(
    req: HttpRequest,
    alias_req: web::Json<CreateAliasRequest>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let user_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let now = chrono::Utc::now().to_rfc3339();

    let vendor_sku_norm = VendorBillLine::normalize_sku(&alias_req.vendor_sku);
    let unit_conversion_str = alias_req.unit_conversion.as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "null".to_string()))
        .unwrap_or_else(|| "null".to_string());

    let result = sqlx::query(
        r#"
        INSERT INTO vendor_sku_aliases (
            id, vendor_id, vendor_sku_norm, internal_sku, unit_conversion,
            priority, last_seen_at, usage_count, created_by, tenant_id, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
        "#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&alias_req.vendor_id)
    .bind(&vendor_sku_norm)
    .bind(&alias_req.internal_sku)
    .bind(&unit_conversion_str)
    .bind(alias_req.priority.unwrap_or(0))
    .bind(&now)
    .bind(&user_id)
    .bind(&tenant_id)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Alias created successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

#[derive(Debug, Deserialize)]
pub struct ListAliasesQuery {
    pub vendor_id: Option<String>,
    pub internal_sku: Option<String>,
    pub page: Option<u32>,
    pub page_size: Option<u32>,
}

/// List vendor SKU aliases
/// Requirements: 16.2, 16.5
pub async fn list_aliases(
    req: HttpRequest,
    query: web::Query<ListAliasesQuery>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let page = query.page.unwrap_or(1);
    let page_size = query.page_size.unwrap_or(50);
    let offset = (page - 1) * page_size;

    let mut sql = String::from("SELECT * FROM vendor_sku_aliases WHERE tenant_id = ?");
    let mut params: Vec<String> = vec![tenant_id];

    if let Some(ref vendor_id) = query.vendor_id {
        sql.push_str(" AND vendor_id = ?");
        params.push(vendor_id.clone());
    }

    if let Some(ref internal_sku) = query.internal_sku {
        sql.push_str(" AND internal_sku = ?");
        params.push(internal_sku.clone());
    }

    sql.push_str(" ORDER BY usage_count DESC, priority DESC LIMIT ? OFFSET ?");

    let mut query_builder = sqlx::query_as::<_, VendorSkuAlias>(&sql);
    for param in params {
        query_builder = query_builder.bind(param);
    }
    query_builder = query_builder.bind(page_size).bind(offset);

    match query_builder.fetch_all(pool.get_ref()).await {
        Ok(aliases) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "aliases": aliases,
            "page": page,
            "page_size": page_size
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

#[derive(Debug, Deserialize)]
pub struct PostReceivingRequest {
    pub cost_policy: Option<String>,
}

/// Post receiving transaction
/// Requirements: 12.1, 12.7
pub async fn post_receiving(
    req: HttpRequest,
    bill_id: web::Path<String>,
    body: web::Json<PostReceivingRequest>,
    receiving_service: web::Data<ReceivingService>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let user_id = req.extensions().get::<String>().cloned().unwrap_or_default();

    // Parse cost policy (default to average_cost)
    let cost_policy = match &body.cost_policy {
        Some(policy_str) => {
            match CostPolicy::from_str(policy_str) {
                Ok(policy) => policy,
                Err(e) => {
                    return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                        "error": e
                    })));
                }
            }
        }
        None => CostPolicy::AverageCost,
    };

    // Validate first
    match receiving_service.validate_for_posting(&bill_id, &tenant_id).await {
        Ok(errors) => {
            if !errors.is_empty() {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "Validation failed",
                    "validation_errors": errors
                })));
            }
        }
        Err(e) => {
            return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": e.to_string()
            })));
        }
    }

    // Post receiving
    match receiving_service
        .post_receiving(&bill_id, &tenant_id, &user_id, cost_policy)
        .await
    {
        Ok(summary) => Ok(HttpResponse::Ok().json(summary)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

#[derive(Debug, Deserialize)]
pub struct GetMatchSuggestionsQuery {
    pub vendor_sku: String,
    pub description: String,
    pub vendor_id: Option<String>,
    pub limit: Option<usize>,
}

/// Get match suggestions for a vendor SKU
/// Requirements: 6.1, 6.3, 9.4
pub async fn get_match_suggestions(
    req: HttpRequest,
    query: web::Query<GetMatchSuggestionsQuery>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = req.extensions().get::<String>().cloned().unwrap_or_default();

    let matching_engine = MatchingEngine::new(pool.get_ref().clone());
    
    let request = MatchSuggestionsRequest {
        vendor_sku: query.vendor_sku.clone(),
        description: query.description.clone(),
        vendor_id: query.vendor_id.clone(),
        limit: query.limit,
    };

    match matching_engine.get_match_suggestions(&request, &tenant_id).await {
        Ok(response) => Ok(HttpResponse::Ok().json(response)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        }))),
    }
}

#[derive(Debug, Deserialize)]
pub struct CreateProductFromLineRequest {
    pub line_id: String,
    pub sku: String,
    pub name: String,
    pub category: String,
    pub cost: f64,
    pub unit_price: f64,
    pub quantity_on_hand: Option<f64>,
    pub barcode: Option<String>,
    pub vendor_catalog_ref: Option<String>,
    pub create_alias: Option<bool>,
}

/// Create a new product from a vendor bill line item
/// Requirements: 9.5, 9.6
pub async fn create_product_from_line(
    req: HttpRequest,
    bill_id: web::Path<String>,
    body: web::Json<CreateProductFromLineRequest>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let user_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let now = chrono::Utc::now().to_rfc3339();

    // Verify the line exists and belongs to the bill
    let line: Option<VendorBillLine> = sqlx::query_as(
        r#"
        SELECT vbl.* FROM vendor_bill_lines vbl
        JOIN vendor_bills vb ON vbl.vendor_bill_id = vb.id
        WHERE vbl.id = ? AND vb.id = ? AND vb.tenant_id = ?
        "#
    )
    .bind(&body.line_id)
    .bind(bill_id.as_str())
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let line = match line {
        Some(l) => l,
        None => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Line item not found"
            })));
        }
    };

    // Get the bill to get vendor_id
    let bill: Option<VendorBill> = sqlx::query_as(
        "SELECT * FROM vendor_bills WHERE id = ? AND tenant_id = ?"
    )
    .bind(bill_id.as_str())
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let bill = match bill {
        Some(b) => b,
        None => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Bill not found"
            })));
        }
    };

    // Check if SKU already exists
    let existing: Option<(String,)> = sqlx::query_as(
        "SELECT id FROM products WHERE sku = ? AND tenant_id = ?"
    )
    .bind(&body.sku)
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    if existing.is_some() {
        return Ok(HttpResponse::Conflict().json(serde_json::json!({
            "error": format!("Product with SKU '{}' already exists", body.sku)
        })));
    }

    // Build attributes JSON with vendor catalog reference if provided
    let mut attributes = serde_json::json!({});
    if let Some(ref vendor_ref) = body.vendor_catalog_ref {
        attributes["vendor_catalog_ref"] = serde_json::json!(vendor_ref);
        attributes["vendor_sku"] = serde_json::json!(line.vendor_sku_raw);
    }
    let attributes_str = serde_json::to_string(&attributes).unwrap_or_else(|_| "{}".to_string());

    // Create the product
    let product_id = uuid::Uuid::new_v4().to_string();
    let quantity = body.quantity_on_hand.unwrap_or(line.normalized_qty);

    let result = sqlx::query(
        r#"
        INSERT INTO products (
            id, sku, name, description, category, subcategory,
            unit_price, cost, quantity_on_hand, reorder_point,
            attributes, parent_id, barcode, barcode_type, images,
            tenant_id, store_id, is_active, sync_version,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?, NULL, ?, NULL, ?, NULL, '[]', ?, ?, 1, 0, ?, ?)
        "#,
    )
    .bind(&product_id)
    .bind(&body.sku)
    .bind(&body.name)
    .bind(&line.desc_raw)
    .bind(&body.category)
    .bind(body.unit_price)
    .bind(body.cost)
    .bind(quantity)
    .bind(&attributes_str)
    .bind(&body.barcode)
    .bind(&tenant_id)
    .bind(&bill.store_id)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    if let Err(e) = result {
        return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create product: {}", e)
        })));
    }

    // Update the line item with the matched SKU
    let _ = sqlx::query(
        r#"
        UPDATE vendor_bill_lines
        SET matched_sku = ?, match_confidence = 1.0, match_reason = 'Created from line item',
            user_overridden = 1, updated_at = ?
        WHERE id = ?
        "#,
    )
    .bind(&body.sku)
    .bind(&now)
    .bind(&body.line_id)
    .execute(pool.get_ref())
    .await;

    // Create vendor SKU alias if requested
    if body.create_alias.unwrap_or(true) {
        let alias_id = uuid::Uuid::new_v4().to_string();
        let vendor_sku_norm = VendorBillLine::normalize_sku(&line.vendor_sku_raw);

        let _ = sqlx::query(
            r#"
            INSERT OR IGNORE INTO vendor_sku_aliases (
                id, vendor_id, vendor_sku_norm, internal_sku, unit_conversion,
                priority, last_seen_at, usage_count, created_by, tenant_id, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, NULL, 10, ?, 1, ?, ?, ?, ?)
            "#,
        )
        .bind(&alias_id)
        .bind(&bill.vendor_id)
        .bind(&vendor_sku_norm)
        .bind(&body.sku)
        .bind(&now)
        .bind(&user_id)
        .bind(&tenant_id)
        .bind(&now)
        .bind(&now)
        .execute(pool.get_ref())
        .await;
    }

    // Log to audit
    let _ = sqlx::query(
        r#"
        INSERT INTO audit_log (
            id, entity_type, entity_id, action, user_id, tenant_id, timestamp
        )
        VALUES (?, 'product', ?, 'create_from_bill_line', ?, ?, ?)
        "#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(&product_id)
    .bind(&user_id)
    .bind(&tenant_id)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    Ok(HttpResponse::Created().json(serde_json::json!({
        "product_id": product_id,
        "sku": body.sku,
        "name": body.name,
        "message": "Product created successfully and linked to line item"
    })))
}

#[derive(Debug, Deserialize)]
pub struct ReopenBillRequest {
    pub reason: Option<String>,
}

/// Reopen a posted bill for editing
/// Requirements: 14.5
pub async fn reopen_bill(
    req: HttpRequest,
    bill_id: web::Path<String>,
    body: web::Json<ReopenBillRequest>,
    pool: web::Data<SqlitePool>,
) -> Result<HttpResponse, actix_web::Error> {
    let tenant_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let user_id = req.extensions().get::<String>().cloned().unwrap_or_default();
    let now = chrono::Utc::now().to_rfc3339();

    // Get the bill
    let bill: Option<VendorBill> = sqlx::query_as(
        "SELECT * FROM vendor_bills WHERE id = ? AND tenant_id = ?"
    )
    .bind(bill_id.as_str())
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| actix_web::error::ErrorInternalServerError(e))?;

    let bill = match bill {
        Some(b) => b,
        None => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Bill not found"
            })));
        }
    };

    // Only POSTED bills can be reopened
    if bill.status != "POSTED" {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Cannot reopen bill with status '{}'. Only POSTED bills can be reopened.", bill.status)
        })));
    }

    // Update bill status to REVIEW
    let result = sqlx::query(
        r#"
        UPDATE vendor_bills
        SET status = 'REVIEW', updated_at = ?
        WHERE id = ? AND tenant_id = ?
        "#,
    )
    .bind(&now)
    .bind(bill_id.as_str())
    .bind(&tenant_id)
    .execute(pool.get_ref())
    .await;

    if let Err(e) = result {
        return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.to_string()
        })));
    }

    // Log to audit
    let _ = sqlx::query(
        r#"
        INSERT INTO audit_log (
            id, entity_type, entity_id, action, user_id, changes, tenant_id, timestamp
        )
        VALUES (?, 'vendor_bill', ?, 'reopen', ?, ?, ?, ?)
        "#,
    )
    .bind(uuid::Uuid::new_v4().to_string())
    .bind(bill_id.as_str())
    .bind(&user_id)
    .bind(serde_json::json!({
        "reason": body.reason,
        "previous_status": "POSTED"
    }).to_string())
    .bind(&tenant_id)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Bill reopened successfully",
        "status": "REVIEW"
    })))
}

/// GET /api/vendor-bills/:id/file
/// Download the source file for a vendor bill
pub async fn download_bill_file(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: HttpRequest,
) -> HttpResponse {
    let bill_id = path.into_inner();
    let tenant_id = req.extensions()
        .get::<crate::middleware::context::UserContext>()
        .map(|ctx| ctx.tenant_id.clone())
        .unwrap_or_else(|| "default".to_string());
    
    // Get file path from database
    let result: Option<(String, String)> = sqlx::query_as(
        "SELECT file_path, mime_type FROM vendor_bills WHERE id = ? AND tenant_id = ?"
    )
    .bind(&bill_id)
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await
    .ok()
    .flatten();
    
    match result {
        Some((file_path, mime_type)) => {
            // Read file from disk
            match std::fs::read(&file_path) {
                Ok(contents) => {
                    let filename = std::path::Path::new(&file_path)
                        .file_name()
                        .and_then(|n| n.to_str())
                        .unwrap_or("vendor-bill");
                    
                    HttpResponse::Ok()
                        .content_type(mime_type)
                        .insert_header(("Content-Disposition", format!("attachment; filename=\"{}\"", filename)))
                        .body(contents)
                }
                Err(e) => {
                    tracing::error!("Failed to read file {}: {:?}", file_path, e);
                    HttpResponse::NotFound().json(serde_json::json!({
                        "error": "File not found on disk"
                    }))
                }
            }
        }
        None => {
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Bill not found"
            }))
        }
    }
}
