/**
 * Advanced Product Features Handlers
 * 
 * Handles product relationships, price history, and templates
 * 
 * Requirements: Product management, price tracking, template system
 */

use actix_web::{web, HttpResponse, Responder, get, post, put, delete};
use serde_json::json;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::{
    ProductRelationship, ProductRelationshipResponse, CreateProductRelationshipRequest,
    ProductPriceHistory, ProductPriceHistoryResponse,
    ProductTemplate, ProductTemplateResponse, CreateProductTemplateRequest, UpdateProductTemplateRequest,
    Product, ProductResponse,
};

/// GET /api/products/:id/relationships
/// Get all relationships for a product
#[get("/api/products/{id}/relationships")]
pub async fn get_product_relationships(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let product_id = path.into_inner();
    let tenant_id = crate::middleware::get_current_tenant_id();
    tracing::info!("Fetching relationships for product: {}", product_id);

    let relationships = sqlx::query_as::<_, ProductRelationship>(
        "SELECT * FROM product_relationships WHERE product_id = ? AND tenant_id = ? ORDER BY display_order ASC, created_at DESC"
    )
    .bind(&product_id)
    .bind(&tenant_id)
    .fetch_all(pool.get_ref())
    .await;

    match relationships {
        Ok(rels) => {
            // Fetch related product details for each relationship
            let mut responses = Vec::new();
            for rel in rels {
                // Get related product details
                let related_product = sqlx::query_as::<_, Product>(
                    "SELECT * FROM products WHERE id = ?"
                )
                .bind(&rel.related_product_id)
                .fetch_optional(pool.get_ref())
                .await;

                if let Ok(Some(product)) = related_product {
                    // Convert Product to ProductResponse using From trait
                    let product_response = ProductResponse::from(product);

                    responses.push(ProductRelationshipResponse {
                        id: rel.id.clone(),
                        product_id: rel.product_id.clone(),
                        related_product_id: rel.related_product_id.clone(),
                        relationship_type: rel.relationship_type().as_str().to_string(),
                        display_order: rel.display_order,
                        related_product: product_response,
                        created_at: rel.created_at.clone(),
                        updated_at: rel.updated_at.clone(),
                    });
                }
            }

            HttpResponse::Ok().json(responses)
        }
        Err(e) => {
            tracing::error!("Failed to fetch relationships: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to fetch relationships: {}", e)
            }))
        }
    }
}

/// POST /api/products/relationships
/// Create a product relationship
#[post("/api/products/relationships")]
pub async fn create_product_relationship(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateProductRelationshipRequest>,
) -> impl Responder {
    let tenant_id = crate::middleware::get_current_tenant_id();
    tracing::info!("Creating product relationship: {} -> {}", req.product_id, req.related_product_id);

    // Verify both products exist and belong to this tenant
    let product_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM products WHERE id = ? AND tenant_id = ?"
    )
    .bind(&req.product_id)
    .bind(&tenant_id)
    .fetch_one(pool.get_ref())
    .await;

    let related_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM products WHERE id = ? AND tenant_id = ?"
    )
    .bind(&req.related_product_id)
    .bind(&tenant_id)
    .fetch_one(pool.get_ref())
    .await;

    if product_exists.is_err() || related_exists.is_err() {
        return HttpResponse::InternalServerError().json(json!({
            "error": "Failed to verify products exist"
        }));
    }

    if product_exists.unwrap() == 0 {
        return HttpResponse::NotFound().json(json!({
            "error": "Product not found"
        }));
    }

    if related_exists.unwrap() == 0 {
        return HttpResponse::NotFound().json(json!({
            "error": "Related product not found"
        }));
    }

    // Create relationship
    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();

    let result = sqlx::query(
        "INSERT INTO product_relationships (id, product_id, related_product_id, relationship_type, display_order, tenant_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&req.product_id)
    .bind(&req.related_product_id)
    .bind(req.relationship_type.as_str())
    .bind(req.display_order.unwrap_or(0))
    .bind(&tenant_id)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            let relationship = sqlx::query_as::<_, ProductRelationship>(
                "SELECT * FROM product_relationships WHERE id = ?"
            )
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await;

            match relationship {
                Ok(rel) => HttpResponse::Created().json(rel),
                Err(e) => HttpResponse::InternalServerError().json(json!({
                    "error": format!("Failed to fetch created relationship: {}", e)
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to create relationship: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to create relationship: {}", e)
            }))
        }
    }
}

/// DELETE /api/products/relationships/:id
/// Delete a product relationship
#[delete("/api/products/relationships/{id}")]
pub async fn delete_product_relationship(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let relationship_id = path.into_inner();
    let tenant_id = crate::middleware::get_current_tenant_id();
    tracing::info!("Deleting product relationship: {}", relationship_id);

    let result = sqlx::query(
        "DELETE FROM product_relationships WHERE id = ? AND tenant_id = ?"
    )
    .bind(&relationship_id)
    .bind(&tenant_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                HttpResponse::NotFound().json(json!({
                    "error": "Relationship not found"
                }))
            } else {
                HttpResponse::Ok().json(json!({
                    "message": "Relationship deleted successfully"
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete relationship: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to delete relationship: {}", e)
            }))
        }
    }
}

/// GET /api/products/:id/price-history
/// Get price history for a product
#[get("/api/products/{id}/price-history")]
pub async fn get_price_history(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let product_id = path.into_inner();
    let tenant_id = crate::middleware::get_current_tenant_id();
    tracing::info!("Fetching price history for product: {}", product_id);

    // Get product details for SKU and name
    let product = sqlx::query_as::<_, Product>(
        "SELECT * FROM products WHERE id = ? AND tenant_id = ?"
    )
    .bind(&product_id)
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await;

    let (product_sku, product_name) = match product {
        Ok(Some(p)) => (p.sku, p.name),
        Ok(None) => {
            return HttpResponse::NotFound().json(json!({
                "error": "Product not found"
            }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to fetch product: {}", e)
            }));
        }
    };

    let history = sqlx::query_as::<_, ProductPriceHistory>(
        "SELECT * FROM product_price_history WHERE product_id = ? AND tenant_id = ? ORDER BY changed_at DESC LIMIT 100"
    )
    .bind(&product_id)
    .bind(&tenant_id)
    .fetch_all(pool.get_ref())
    .await;

    match history {
        Ok(records) => {
            let responses: Vec<ProductPriceHistoryResponse> = records.iter().map(|h| {
                ProductPriceHistoryResponse {
                    id: h.id.clone(),
                    product_id: h.product_id.clone(),
                    product_sku: product_sku.clone(),
                    product_name: product_name.clone(),
                    old_price: h.old_price,
                    new_price: h.new_price,
                    price_change: h.price_change(),
                    price_change_percent: h.price_change_percent(),
                    old_cost: h.old_cost,
                    new_cost: h.new_cost,
                    cost_change: h.cost_change(),
                    new_margin_percent: h.new_margin_percent(),
                    old_margin_percent: h.old_margin_percent(),
                    changed_by: h.changed_by.clone(),
                    changed_by_username: None, // TODO: Fetch from users table
                    changed_at: h.changed_at.clone(),
                    reason: h.reason.clone(),
                }
            }).collect();

            HttpResponse::Ok().json(responses)
        }
        Err(e) => {
            tracing::error!("Failed to fetch price history: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to fetch price history: {}", e)
            }))
        }
    }
}

/// GET /api/products/templates
/// List all product templates
#[get("/api/products/templates")]
pub async fn list_templates(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Listing product templates");
    let tenant_id = crate::middleware::get_current_tenant_id();

    let templates = sqlx::query_as::<_, ProductTemplate>(
        "SELECT * FROM product_templates WHERE tenant_id = ? ORDER BY name ASC"
    )
    .bind(&tenant_id)
    .fetch_all(pool.get_ref())
    .await;

    match templates {
        Ok(temps) => {
            let responses: Vec<ProductTemplateResponse> = temps.iter().map(|t| {
                ProductTemplateResponse {
                    id: t.id.clone(),
                    name: t.name.clone(),
                    description: t.description.clone(),
                    category: t.category.clone(),
                    subcategory: t.subcategory.clone(),
                    template_attributes: t.get_template_attributes().unwrap_or(serde_json::json!({})),
                    is_shared: t.is_shared,
                    sharing_type: if t.is_shared { "Shared across all stores".to_string() } else { "Store-specific".to_string() },
                    created_by: t.created_by.clone(),
                    created_by_username: None, // TODO: Fetch from users table
                    tenant_id: t.tenant_id.clone(),
                    store_id: t.store_id.clone(),
                    store_name: None, // TODO: Fetch from stores table
                    created_at: t.created_at.clone(),
                    updated_at: t.updated_at.clone(),
                }
            }).collect();

            HttpResponse::Ok().json(responses)
        }
        Err(e) => {
            tracing::error!("Failed to fetch templates: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to fetch templates: {}", e)
            }))
        }
    }
}

/// GET /api/products/templates/:id
/// Get a specific template
#[get("/api/products/templates/{id}")]
pub async fn get_template(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let template_id = path.into_inner();
    let tenant_id = crate::middleware::get_current_tenant_id();
    tracing::info!("Fetching template: {}", template_id);

    let template = sqlx::query_as::<_, ProductTemplate>(
        "SELECT * FROM product_templates WHERE id = ? AND tenant_id = ?"
    )
    .bind(&template_id)
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await;

    match template {
        Ok(Some(t)) => {
            let response = ProductTemplateResponse {
                id: t.id.clone(),
                name: t.name.clone(),
                description: t.description.clone(),
                category: t.category.clone(),
                subcategory: t.subcategory.clone(),
                template_attributes: t.get_template_attributes().unwrap_or(serde_json::json!({})),
                is_shared: t.is_shared,
                sharing_type: if t.is_shared { "Shared across all stores".to_string() } else { "Store-specific".to_string() },
                created_by: t.created_by.clone(),
                created_by_username: None,
                tenant_id: t.tenant_id.clone(),
                store_id: t.store_id.clone(),
                store_name: None,
                created_at: t.created_at.clone(),
                updated_at: t.updated_at.clone(),
            };
            HttpResponse::Ok().json(response)
        }
        Ok(None) => HttpResponse::NotFound().json(json!({
            "error": "Template not found"
        })),
        Err(e) => {
            tracing::error!("Failed to fetch template: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to fetch template: {}", e)
            }))
        }
    }
}

/// POST /api/products/templates
/// Create a new product template
#[post("/api/products/templates")]
pub async fn create_template(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateProductTemplateRequest>,
) -> impl Responder {
    tracing::info!("Creating product template: {}", req.name);
    let tenant_id = crate::middleware::get_current_tenant_id();
    // TODO: Get actual user ID from auth context
    let created_by = "system".to_string();

    let id = Uuid::new_v4().to_string();
    let now = chrono::Utc::now().to_rfc3339();
    let attributes_str = serde_json::to_string(&req.template_attributes).unwrap_or_else(|_| "{}".to_string());

    let result = sqlx::query(
        "INSERT INTO product_templates (id, name, description, category, subcategory, template_attributes, is_shared, created_by, tenant_id, store_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .bind(&id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.subcategory)
    .bind(&attributes_str)
    .bind(req.is_shared.unwrap_or(false))
    .bind(&created_by)
    .bind(&tenant_id)
    .bind(&req.store_id)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            let template = sqlx::query_as::<_, ProductTemplate>(
                "SELECT * FROM product_templates WHERE id = ?"
            )
            .bind(&id)
            .fetch_one(pool.get_ref())
            .await;

            match template {
                Ok(t) => {
                    let response = ProductTemplateResponse {
                        id: t.id.clone(),
                        name: t.name.clone(),
                        description: t.description.clone(),
                        category: t.category.clone(),
                        subcategory: t.subcategory.clone(),
                        template_attributes: t.get_template_attributes().unwrap_or(serde_json::json!({})),
                        is_shared: t.is_shared,
                        sharing_type: if t.is_shared { "Shared across all stores".to_string() } else { "Store-specific".to_string() },
                        created_by: t.created_by.clone(),
                        created_by_username: None,
                        tenant_id: t.tenant_id.clone(),
                        store_id: t.store_id.clone(),
                        store_name: None,
                        created_at: t.created_at.clone(),
                        updated_at: t.updated_at.clone(),
                    };
                    HttpResponse::Created().json(response)
                }
                Err(e) => HttpResponse::InternalServerError().json(json!({
                    "error": format!("Failed to fetch created template: {}", e)
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to create template: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to create template: {}", e)
            }))
        }
    }
}

/// PUT /api/products/templates/:id
/// Update a product template
#[put("/api/products/templates/{id}")]
pub async fn update_template(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<UpdateProductTemplateRequest>,
) -> impl Responder {
    let template_id = path.into_inner();
    let tenant_id = crate::middleware::get_current_tenant_id();
    tracing::info!("Updating product template: {}", template_id);

    let now = chrono::Utc::now().to_rfc3339();
    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(ref name) = req.name {
        updates.push("name = ?");
        params.push(name.clone());
    }

    if let Some(ref description) = req.description {
        updates.push("description = ?");
        params.push(description.clone());
    }

    if let Some(ref attrs) = req.template_attributes {
        updates.push("template_attributes = ?");
        params.push(serde_json::to_string(attrs).unwrap_or_else(|_| "{}".to_string()));
    }

    if let Some(is_shared) = req.is_shared {
        updates.push("is_shared = ?");
        params.push(if is_shared { "1" } else { "0" }.to_string());
    }

    if updates.is_empty() {
        return HttpResponse::BadRequest().json(json!({
            "error": "No fields to update"
        }));
    }

    updates.push("updated_at = ?");
    params.push(now.clone());
    params.push(tenant_id.clone());
    params.push(template_id.clone());

    let sql = format!(
        "UPDATE product_templates SET {} WHERE id = ? AND tenant_id = ?",
        updates.join(", ")
    );

    let mut query = sqlx::query(&sql);
    for param in params {
        query = query.bind(param);
    }

    let result = query.execute(pool.get_ref()).await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                HttpResponse::NotFound().json(json!({
                    "error": "Template not found"
                }))
            } else {
                // Fetch updated template
                let template = sqlx::query_as::<_, ProductTemplate>(
                    "SELECT * FROM product_templates WHERE id = ?"
                )
                .bind(&template_id)
                .fetch_one(pool.get_ref())
                .await;

                match template {
                    Ok(t) => {
                        let response = ProductTemplateResponse {
                            id: t.id.clone(),
                            name: t.name.clone(),
                            description: t.description.clone(),
                            category: t.category.clone(),
                            subcategory: t.subcategory.clone(),
                            template_attributes: t.get_template_attributes().unwrap_or(serde_json::json!({})),
                            is_shared: t.is_shared,
                            sharing_type: if t.is_shared { "Shared across all stores".to_string() } else { "Store-specific".to_string() },
                            created_by: t.created_by.clone(),
                            created_by_username: None,
                            tenant_id: t.tenant_id.clone(),
                            store_id: t.store_id.clone(),
                            store_name: None,
                            created_at: t.created_at.clone(),
                            updated_at: t.updated_at.clone(),
                        };
                        HttpResponse::Ok().json(response)
                    }
                    Err(e) => HttpResponse::InternalServerError().json(json!({
                        "error": format!("Failed to fetch updated template: {}", e)
                    }))
                }
            }
        }
        Err(e) => {
            tracing::error!("Failed to update template: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to update template: {}", e)
            }))
        }
    }
}

/// DELETE /api/products/templates/:id
/// Delete a product template (hard delete since no is_active field)
#[delete("/api/products/templates/{id}")]
pub async fn delete_template(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let template_id = path.into_inner();
    let tenant_id = crate::middleware::get_current_tenant_id();
    tracing::info!("Deleting product template: {}", template_id);

    let result = sqlx::query(
        "DELETE FROM product_templates WHERE id = ? AND tenant_id = ?"
    )
    .bind(&template_id)
    .bind(&tenant_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(res) => {
            if res.rows_affected() == 0 {
                HttpResponse::NotFound().json(json!({
                    "error": "Template not found"
                }))
            } else {
                HttpResponse::Ok().json(json!({
                    "message": "Template deleted successfully"
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete template: {:?}", e);
            HttpResponse::InternalServerError().json(json!({
                "error": format!("Failed to delete template: {}", e)
            }))
        }
    }
}
