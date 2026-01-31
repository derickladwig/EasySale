use actix_web::{delete, get, post, put, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use sqlx::SqlitePool;
use std::collections::HashMap;

use crate::config::loader::ConfigLoader;
use crate::middleware::get_current_tenant_id;
use crate::models::{
    BulkOperationRequest, CreateProductRequest, ProductSearchRequest, UpdateProductRequest,
};
use crate::services::{BarcodeService, ProductService, ProductLookupService, SearchService, VariantService};

/// Helper function to extract user_id from request context (Task 19.1)
fn get_user_id_from_context(req: &HttpRequest) -> Result<String, HttpResponse> {
    match req.extensions().get::<crate::models::UserContext>() {
        Some(context) => Ok(context.user_id.clone()),
        None => {
            tracing::error!("User context not found in request");
            Err(HttpResponse::Unauthorized().json(serde_json::json!({
                "error": "Authentication required"
            })))
        }
    }
}

/// GET /api/products
/// List products with pagination and filters
#[get("/api/products")]
pub async fn list_products(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    query: web::Query<HashMap<String, String>>,
) -> impl Responder {
    tracing::info!("Listing products");

    let tenant_id = get_current_tenant_id();
    let page = query
        .get("page")
        .and_then(|p| p.parse::<u32>().ok())
        .unwrap_or(0);
    let page_size = query
        .get("page_size")
        .and_then(|p| p.parse::<u32>().ok())
        .unwrap_or(50)
        .min(100);
    let category = query.get("category").map(|s| s.as_str());
    let sort_by = query.get("sort_by").map(|s| s.as_str());
    let sort_order = query.get("sort_order").map(|s| s.as_str());

    let service = ProductService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service
        .list_products(&tenant_id, category, page, page_size, sort_by, sort_order)
        .await
    {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// GET /api/products/:id
/// Get a single product by ID
#[get("/api/products/{id}")]
pub async fn get_product(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    path: web::Path<String>,
) -> impl Responder {
    let product_id = path.into_inner();
    tracing::info!("Fetching product: {}", product_id);

    let tenant_id = get_current_tenant_id();
    let service = ProductService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service.get_product(&product_id, &tenant_id).await {
        Ok(product) => HttpResponse::Ok().json(product),
        Err(errors) => {
            if errors.iter().any(|e| e.message.contains("not found")) {
                HttpResponse::NotFound().json(serde_json::json!({
                    "errors": errors
                }))
            } else {
                HttpResponse::BadRequest().json(serde_json::json!({
                    "errors": errors
                }))
            }
        }
    }
}

/// POST /api/products
/// Create a new product
#[post("/api/products")]
pub async fn create_product(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: web::Json<CreateProductRequest>,
    http_req: HttpRequest,
) -> impl Responder {
    tracing::info!("Creating product: {}", req.name);

    let tenant_id = get_current_tenant_id();
    let user_id = match get_user_id_from_context(&http_req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let service = ProductService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service
        .create_product(req.into_inner(), &tenant_id, &user_id)
        .await
    {
        Ok(product) => HttpResponse::Created().json(product),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// PUT /api/products/:id
/// Update an existing product
#[put("/api/products/{id}")]
pub async fn update_product(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    path: web::Path<String>,
    req: web::Json<UpdateProductRequest>,
    http_req: HttpRequest,
) -> impl Responder {
    let product_id = path.into_inner();
    tracing::info!("Updating product: {}", product_id);

    let tenant_id = get_current_tenant_id();
    let user_id = match get_user_id_from_context(&http_req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let service = ProductService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service
        .update_product(&product_id, req.into_inner(), &tenant_id, &user_id)
        .await
    {
        Ok(product) => HttpResponse::Ok().json(product),
        Err(errors) => {
            if errors.iter().any(|e| e.message.contains("not found")) {
                HttpResponse::NotFound().json(serde_json::json!({
                    "errors": errors
                }))
            } else {
                HttpResponse::BadRequest().json(serde_json::json!({
                    "errors": errors
                }))
            }
        }
    }
}

/// DELETE /api/products/:id
/// Delete a product (soft delete)
#[delete("/api/products/{id}")]
pub async fn delete_product(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    path: web::Path<String>,
    http_req: HttpRequest,
) -> impl Responder {
    let product_id = path.into_inner();
    tracing::info!("Deleting product: {}", product_id);

    let tenant_id = get_current_tenant_id();
    
    // Extract user_id from auth context (Task 19.1)
    let user_id = match get_user_id_from_context(&http_req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let service = ProductService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service.delete_product(&product_id, &tenant_id, &user_id).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(errors) => {
            if errors.iter().any(|e| e.message.contains("not found")) {
                HttpResponse::NotFound().json(serde_json::json!({
                    "errors": errors
                }))
            } else {
                HttpResponse::BadRequest().json(serde_json::json!({
                    "errors": errors
                }))
            }
        }
    }
}

/// POST /api/products/search
/// Advanced product search with filters
#[post("/api/products/search")]
pub async fn search_products(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: web::Json<ProductSearchRequest>,
) -> impl Responder {
    tracing::info!("Searching products");

    let tenant_id = get_current_tenant_id();
    let service = SearchService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service.search_products(req.into_inner(), &tenant_id).await {
        Ok(response) => HttpResponse::Ok().json(response),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// POST /api/products/bulk
/// Bulk operations (update, delete, import, export)
#[post("/api/products/bulk")]
pub async fn bulk_operations(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: web::Json<BulkOperationRequest>,
    http_req: HttpRequest,
) -> impl Responder {
    tracing::info!("Bulk operation: {:?}", req.operation);

    let tenant_id = get_current_tenant_id();
    let user_id = match get_user_id_from_context(&http_req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    match req.operation {
        crate::models::BulkOperation::Update => {
            handle_bulk_update(pool, config_loader, req.into_inner(), &tenant_id, &user_id).await
        }
        crate::models::BulkOperation::Delete => {
            handle_bulk_delete(pool, config_loader, req.into_inner(), &tenant_id, &user_id).await
        }
        crate::models::BulkOperation::Import => {
            handle_bulk_import(pool, config_loader, req.into_inner(), &tenant_id, &user_id).await
        }
        crate::models::BulkOperation::Export => {
            handle_bulk_export(pool, config_loader, req.into_inner(), &tenant_id).await
        }
    }
}

/// GET /api/products/categories
/// Get all categories from tenant configuration
#[get("/api/products/categories")]
pub async fn get_categories(config_loader: web::Data<ConfigLoader>) -> impl Responder {
    tracing::info!("Fetching categories");

    let tenant_id = get_current_tenant_id();

    match config_loader.get_config(&tenant_id).await {
        Ok(config) => HttpResponse::Ok().json(config.categories),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to load categories: {}", e)
        })),
    }
}

/// GET /api/products/autocomplete
/// Autocomplete suggestions
#[get("/api/products/autocomplete")]
pub async fn autocomplete(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    query: web::Query<HashMap<String, String>>,
) -> impl Responder {
    let search_query = match query.get("q") {
        Some(q) => q,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Query parameter 'q' is required"
            }));
        }
    };

    let tenant_id = get_current_tenant_id();
    let category = query.get("category").map(|s| s.as_str());
    let limit = query
        .get("limit")
        .and_then(|l| l.parse::<u32>().ok())
        .unwrap_or(10);

    let service = SearchService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service
        .autocomplete(search_query, &tenant_id, category, limit)
        .await
    {
        Ok(suggestions) => HttpResponse::Ok().json(suggestions),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// GET /api/products/barcode/:barcode
/// Lookup product by barcode
#[get("/api/products/barcode/{barcode}")]
pub async fn lookup_by_barcode(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let barcode = path.into_inner();
    tracing::info!("Looking up product by barcode: {}", barcode);

    let tenant_id = get_current_tenant_id();
    let service = BarcodeService::new(pool.get_ref().clone());

    match service.lookup_by_barcode(&barcode, &tenant_id).await {
        Ok(Some(product)) => HttpResponse::Ok().json(product),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Product not found"
        })),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// GET /api/products/lookup/:query
/// Universal product lookup - searches by SKU, barcode, alternate SKUs, vendor SKUs
/// Returns all matching products with match type information
#[get("/api/products/lookup/{query}")]
pub async fn universal_lookup(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let query = path.into_inner();
    tracing::info!("Universal product lookup: {}", query);

    let tenant_id = get_current_tenant_id();
    let service = ProductLookupService::new(pool.get_ref().clone());

    match service.lookup(&query, &tenant_id).await {
        Ok(results) => {
            if results.is_empty() {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "No products found",
                    "query": query,
                    "results": []
                }))
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "query": query,
                    "count": results.len(),
                    "results": results
                }))
            }
        }
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// GET /api/products/:id/variants
/// Get all variants for a product
#[get("/api/products/{id}/variants")]
pub async fn get_variants(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let product_id = path.into_inner();
    tracing::info!("Fetching variants for product: {}", product_id);

    let tenant_id = get_current_tenant_id();
    let service = VariantService::new(pool.get_ref().clone());

    match service.get_variants(&product_id, &tenant_id).await {
        Ok(variants) => HttpResponse::Ok().json(variants),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// POST /api/products/variants
/// Create a product variant
#[post("/api/products/variants")]
pub async fn create_variant(
    pool: web::Data<SqlitePool>,
    req: web::Json<crate::models::CreateProductVariantRequest>,
    http_req: HttpRequest,
) -> impl Responder {
    tracing::info!("Creating variant for parent: {}", req.parent_id);

    let tenant_id = get_current_tenant_id();
    let user_id = match get_user_id_from_context(&http_req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let service = VariantService::new(pool.get_ref().clone());

    match service
        .create_variant(req.into_inner(), &tenant_id, &user_id)
        .await
    {
        Ok(variant) => HttpResponse::Created().json(variant),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

// Bulk operation handlers

async fn handle_bulk_update(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: BulkOperationRequest,
    tenant_id: &str,
    user_id: &str,
) -> HttpResponse {
    let product_ids = match req.product_ids {
        Some(ids) => ids,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "product_ids is required for bulk update"
            }));
        }
    };

    let updates = match req.updates {
        Some(u) => u,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "updates is required for bulk update"
            }));
        }
    };

    let service = ProductService::new(pool.get_ref().clone(), config_loader.get_ref().clone());
    let mut success_count = 0;
    let mut errors = Vec::new();

    // Convert JSON updates to UpdateProductRequest
    let update_req: UpdateProductRequest = match serde_json::from_value(updates) {
        Ok(req) => req,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Invalid updates format: {}", e)
            }));
        }
    };

    for product_id in product_ids {
        match service
            .update_product(&product_id, update_req.clone(), tenant_id, user_id)
            .await
        {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(serde_json::json!({
                "product_id": product_id,
                "errors": e
            })),
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "success_count": success_count,
        "errors": errors
    }))
}

async fn handle_bulk_delete(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: BulkOperationRequest,
    tenant_id: &str,
    user_id: &str,
) -> HttpResponse {
    let product_ids = match req.product_ids {
        Some(ids) => ids,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "product_ids is required for bulk delete"
            }));
        }
    };

    let service = ProductService::new(pool.get_ref().clone(), config_loader.get_ref().clone());
    let mut success_count = 0;
    let mut errors = Vec::new();

    for product_id in product_ids {
        match service.delete_product(&product_id, tenant_id, user_id).await {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(serde_json::json!({
                "product_id": product_id,
                "errors": e
            })),
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "success_count": success_count,
        "errors": errors
    }))
}

async fn handle_bulk_import(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: BulkOperationRequest,
    tenant_id: &str,
    user_id: &str,
) -> HttpResponse {
    let import_data = match req.import_data {
        Some(data) => data,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "import_data is required for bulk import"
            }));
        }
    };

    let service = ProductService::new(pool.get_ref().clone(), config_loader.get_ref().clone());
    let mut success_count = 0;
    let mut errors = Vec::new();

    // Validate all rows first
    let mut create_requests = Vec::new();
    for (index, row) in import_data.iter().enumerate() {
        match serde_json::from_value::<CreateProductRequest>(row.clone()) {
            Ok(req) => create_requests.push(req),
            Err(e) => errors.push(serde_json::json!({
                "row": index + 1,
                "error": format!("Invalid data format: {}", e)
            })),
        }
    }

    // If validation errors, return without processing
    if !errors.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Validation failed",
            "errors": errors
        }));
    }

    // Process all rows
    for (index, create_req) in create_requests.into_iter().enumerate() {
        match service.create_product(create_req, tenant_id, user_id).await {
            Ok(_) => success_count += 1,
            Err(e) => errors.push(serde_json::json!({
                "row": index + 1,
                "errors": e
            })),
        }
    }

    HttpResponse::Ok().json(serde_json::json!({
        "success_count": success_count,
        "total": import_data.len(),
        "errors": errors
    }))
}

async fn handle_bulk_export(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: BulkOperationRequest,
    tenant_id: &str,
) -> HttpResponse {
    let service = ProductService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    // If product_ids provided, export only those products
    // Otherwise export all products
    let products = if let Some(product_ids) = req.product_ids {
        let mut results = Vec::new();
        for product_id in product_ids {
            match service.get_product(&product_id, tenant_id).await {
                Ok(product) => results.push(product),
                Err(_) => continue,
            }
        }
        results
    } else {
        // Export all products (paginated)
        match service.list_products(tenant_id, None, 0, 10000, None, None).await {
            Ok(response) => response.products,
            Err(errors) => {
                return HttpResponse::BadRequest().json(serde_json::json!({
                    "errors": errors
                }));
            }
        }
    };

    HttpResponse::Ok().json(serde_json::json!({
        "products": products,
        "count": products.len()
    }))
}

/// PUT /api/products/variants/:id
/// Update a product variant
#[put("/api/products/variants/{id}")]
pub async fn update_variant(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<serde_json::Value>,
    http_req: HttpRequest,
) -> impl Responder {
    let variant_id = path.into_inner();
    tracing::info!("Updating variant: {}", variant_id);

    let tenant_id = get_current_tenant_id();
    let user_id = match get_user_id_from_context(&http_req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let service = VariantService::new(pool.get_ref().clone());

    // Extract display_order if present
    let display_order = req.get("display_order")
        .and_then(|v| v.as_i64())
        .map(|v| v as i32);

    match service
        .update_variant(&variant_id, req.into_inner(), display_order, &tenant_id, &user_id)
        .await
    {
        Ok(variant) => HttpResponse::Ok().json(variant),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// DELETE /api/products/variants/:id
/// Delete a product variant
#[delete("/api/products/variants/{id}")]
pub async fn delete_variant(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    http_req: HttpRequest,
) -> impl Responder {
    let variant_id = path.into_inner();
    tracing::info!("Deleting variant: {}", variant_id);

    let tenant_id = get_current_tenant_id();
    let user_id = match get_user_id_from_context(&http_req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let service = VariantService::new(pool.get_ref().clone());

    match service
        .delete_variant(&variant_id, &tenant_id, &user_id)
        .await
    {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// GET /api/products/:id/variants/check
/// Check if a product has variants
#[get("/api/products/{id}/variants/check")]
pub async fn has_variants(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let product_id = path.into_inner();
    tracing::info!("Checking if product has variants: {}", product_id);

    let tenant_id = get_current_tenant_id();
    let service = VariantService::new(pool.get_ref().clone());

    match service.has_variants(&product_id, &tenant_id).await {
        Ok(has_variants) => HttpResponse::Ok().json(serde_json::json!({
            "has_variants": has_variants
        })),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// GET /api/products/:id/variants/count
/// Get the count of variants for a product
#[get("/api/products/{id}/variants/count")]
pub async fn get_variant_count(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let product_id = path.into_inner();
    tracing::info!("Getting variant count for product: {}", product_id);

    let tenant_id = get_current_tenant_id();
    let service = VariantService::new(pool.get_ref().clone());

    match service.get_variant_count(&product_id, &tenant_id).await {
        Ok(count) => HttpResponse::Ok().json(serde_json::json!({
            "count": count
        })),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        })),
    }
}

/// Stock adjustment request
#[derive(Debug, serde::Deserialize)]
pub struct StockAdjustmentRequest {
    /// Adjustment type: "add", "subtract", or "set"
    pub adjustment_type: String,
    /// Quantity to adjust by (or set to)
    pub quantity: i32,
    /// Reason for adjustment
    pub reason: String,
    /// Optional notes
    pub notes: Option<String>,
}

/// POST /api/products/:id/stock/adjust
/// Adjust stock with audit trail
#[post("/api/products/{id}/stock/adjust")]
pub async fn adjust_stock(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<StockAdjustmentRequest>,
) -> impl Responder {
    let product_id = path.into_inner();
    tracing::info!("Adjusting stock for product: {}", product_id);

    let user_id = match get_user_id_from_context(&req) {
        Ok(id) => id,
        Err(response) => return response,
    };

    let tenant_id = get_current_tenant_id();
    let pool_ref = pool.get_ref();

    // Get current product
    let service = ProductService::new(pool_ref.clone(), config_loader.get_ref().clone());
    let product = match service.get_product(&product_id, &tenant_id).await {
        Ok(p) => p,
        Err(errors) => {
            // Check if it's a "not found" error
            if errors.iter().any(|e| e.message.contains("not found")) {
                return HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Product not found"
                }));
            }
            return HttpResponse::BadRequest().json(serde_json::json!({
                "errors": errors
            }));
        }
    };

    let old_quantity = product.quantity_on_hand as i32;
    let new_quantity = match body.adjustment_type.as_str() {
        "add" => old_quantity + body.quantity,
        "subtract" => (old_quantity - body.quantity).max(0),
        "set" => body.quantity.max(0),
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid adjustment_type. Use 'add', 'subtract', or 'set'"
            }));
        }
    };

    // Record the adjustment in audit log
    let adjustment_id = uuid::Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    
    let audit_result = sqlx::query(
        r#"
        INSERT INTO stock_adjustments (
            id, product_id, tenant_id, user_id,
            adjustment_type, quantity_before, quantity_after, quantity_change,
            reason, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(&adjustment_id)
    .bind(&product_id)
    .bind(&tenant_id)
    .bind(&user_id)
    .bind(&body.adjustment_type)
    .bind(old_quantity)
    .bind(new_quantity)
    .bind(new_quantity - old_quantity)
    .bind(&body.reason)
    .bind(&body.notes)
    .bind(&now)
    .execute(pool_ref)
    .await;

    // If audit table doesn't exist, log warning but continue
    if let Err(e) = audit_result {
        tracing::warn!("Could not record stock adjustment audit: {}. Table may not exist.", e);
    }

    // Update the product quantity
    let update_result = sqlx::query(
        "UPDATE products SET quantity_on_hand = ?, updated_at = ? WHERE id = ? AND tenant_id = ?"
    )
    .bind(new_quantity)
    .bind(&now)
    .bind(&product_id)
    .bind(&tenant_id)
    .execute(pool_ref)
    .await;

    match update_result {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "adjustment_id": adjustment_id,
            "product_id": product_id,
            "quantity_before": old_quantity,
            "quantity_after": new_quantity,
            "quantity_change": new_quantity - old_quantity,
            "adjustment_type": body.adjustment_type,
            "reason": body.reason
        })),
        Err(e) => {
            tracing::error!("Failed to update stock: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update stock"
            }))
        }
    }
}

/// GET /api/products/:id/stock/history
/// Get stock adjustment history for a product
#[get("/api/products/{id}/stock/history")]
pub async fn get_stock_history(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let product_id = path.into_inner();
    tracing::info!("Getting stock history for product: {}", product_id);

    let tenant_id = get_current_tenant_id();

    let result = sqlx::query_as::<_, (String, String, String, i32, i32, i32, String, Option<String>, String)>(
        r#"
        SELECT id, user_id, adjustment_type, quantity_before, quantity_after, quantity_change, reason, notes, created_at
        FROM stock_adjustments
        WHERE product_id = ? AND tenant_id = ?
        ORDER BY created_at DESC
        LIMIT 100
        "#
    )
    .bind(&product_id)
    .bind(&tenant_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(rows) => {
            let history: Vec<serde_json::Value> = rows.iter().map(|r| {
                serde_json::json!({
                    "id": r.0,
                    "user_id": r.1,
                    "adjustment_type": r.2,
                    "quantity_before": r.3,
                    "quantity_after": r.4,
                    "quantity_change": r.5,
                    "reason": r.6,
                    "notes": r.7,
                    "created_at": r.8
                })
            }).collect();
            HttpResponse::Ok().json(serde_json::json!({
                "product_id": product_id,
                "history": history
            }))
        }
        Err(e) => {
            tracing::warn!("Could not fetch stock history: {}. Table may not exist.", e);
            HttpResponse::Ok().json(serde_json::json!({
                "product_id": product_id,
                "history": [],
                "note": "Stock adjustment history not available"
            }))
        }
    }
}
