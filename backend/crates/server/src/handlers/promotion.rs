use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::{CreatePromotionRequest, Promotion, PromotionUsage};

/// POST /api/promotions
/// Create a new promotion
#[post("/api/promotions")]
pub async fn create_promotion(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreatePromotionRequest>,
) -> impl Responder {
    tracing::info!("Creating promotion: {}", req.name);

    // Validate discount value
    if req.discount_value <= 0.0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Discount value must be greater than zero"
        }));
    }

    // Validate date range
    if req.end_date <= req.start_date {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "End date must be after start date"
        }));
    }

    let promotion_id = Uuid::new_v4().to_string();
    let applies_to_categories = req
        .applies_to_categories
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap());
    let applies_to_products = req
        .applies_to_products
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap());
    let applies_to_tiers = req
        .applies_to_tiers
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap());

    let result = sqlx::query(
        "INSERT INTO promotions (id, name, description, promotion_type, discount_value, 
         start_date, end_date, applies_to_categories, applies_to_products, applies_to_tiers, 
         min_quantity, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
    )
    .bind(&promotion_id)
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.promotion_type.as_str())
    .bind(req.discount_value)
    .bind(&req.start_date)
    .bind(&req.end_date)
    .bind(&applies_to_categories)
    .bind(&applies_to_products)
    .bind(&applies_to_tiers)
    .bind(req.min_quantity)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Promotion created successfully: {}", promotion_id);
            // Fetch and return the created promotion
            match sqlx::query_as::<_, Promotion>(
                "SELECT id, name, description, promotion_type, discount_value, start_date, 
                 end_date, applies_to_categories, applies_to_products, applies_to_tiers, 
                 min_quantity, is_active 
                 FROM promotions 
                 WHERE id = ?",
            )
            .bind(&promotion_id)
            .fetch_one(pool.get_ref())
            .await
            {
                Ok(promotion) => HttpResponse::Created().json(promotion),
                Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Promotion created but failed to fetch"
                })),
            }
        }
        Err(e) => {
            tracing::error!("Failed to create promotion: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create promotion"
            }))
        }
    }
}

/// GET /api/promotions
/// List all promotions
#[get("/api/promotions")]
pub async fn list_promotions(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    tracing::info!("Listing promotions");

    let mut sql = "SELECT id, name, description, promotion_type, discount_value, start_date, 
                   end_date, applies_to_categories, applies_to_products, applies_to_tiers, 
                   min_quantity, is_active 
                   FROM promotions 
                   WHERE 1=1".to_string();

    if let Some(is_active) = query.get("is_active") {
        sql.push_str(&format!(" AND is_active = {}", is_active));
    }

    // Filter by current date if requested
    if query.get("current").is_some() {
        let now = Utc::now().to_rfc3339();
        sql.push_str(&format!(
            " AND start_date <= '{}' AND end_date >= '{}'",
            now, now
        ));
    }

    sql.push_str(" ORDER BY start_date DESC");

    let result = sqlx::query_as::<_, Promotion>(&sql)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(promotions) => HttpResponse::Ok().json(promotions),
        Err(e) => {
            tracing::error!("Failed to list promotions: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list promotions"
            }))
        }
    }
}

/// PUT /api/promotions/:id
/// Update a promotion
#[put("/api/promotions/{id}")]
pub async fn update_promotion(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<CreatePromotionRequest>,
) -> impl Responder {
    let promotion_id = path.into_inner();
    tracing::info!("Updating promotion: {}", promotion_id);

    let applies_to_categories = req
        .applies_to_categories
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap());
    let applies_to_products = req
        .applies_to_products
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap());
    let applies_to_tiers = req
        .applies_to_tiers
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap());

    let result = sqlx::query(
        "UPDATE promotions 
         SET name = ?, description = ?, promotion_type = ?, discount_value = ?, 
             start_date = ?, end_date = ?, applies_to_categories = ?, applies_to_products = ?, 
             applies_to_tiers = ?, min_quantity = ? 
         WHERE id = ?",
    )
    .bind(&req.name)
    .bind(&req.description)
    .bind(req.promotion_type.as_str())
    .bind(req.discount_value)
    .bind(&req.start_date)
    .bind(&req.end_date)
    .bind(&applies_to_categories)
    .bind(&applies_to_products)
    .bind(&applies_to_tiers)
    .bind(req.min_quantity)
    .bind(&promotion_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                tracing::info!("Promotion updated successfully: {}", promotion_id);
                match sqlx::query_as::<_, Promotion>(
                    "SELECT id, name, description, promotion_type, discount_value, start_date, 
                     end_date, applies_to_categories, applies_to_products, applies_to_tiers, 
                     min_quantity, is_active 
                     FROM promotions 
                     WHERE id = ?",
                )
                .bind(&promotion_id)
                .fetch_one(pool.get_ref())
                .await
                {
                    Ok(promotion) => HttpResponse::Ok().json(promotion),
                    Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Promotion updated but failed to fetch"
                    })),
                }
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Promotion not found"
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to update promotion: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update promotion"
            }))
        }
    }
}

/// GET /api/promotions/:id/usage
/// Get promotion usage statistics
#[get("/api/promotions/{id}/usage")]
pub async fn get_promotion_usage(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let promotion_id = path.into_inner();
    tracing::info!("Fetching usage for promotion: {}", promotion_id);

    // Fetch usage records
    let result = sqlx::query_as::<_, PromotionUsage>(
        "SELECT id, promotion_id, transaction_id, customer_id, discount_amount, items_affected, 
         created_at 
         FROM promotion_usage 
         WHERE promotion_id = ? 
         ORDER BY created_at DESC",
    )
    .bind(&promotion_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(usage_records) => {
            // Calculate statistics
            let total_uses = usage_records.len();
            let total_discount: f64 = usage_records.iter().map(|u| u.discount_amount).sum();
            let total_items: i32 = usage_records.iter().map(|u| u.items_affected).sum();

            HttpResponse::Ok().json(serde_json::json!({
                "promotion_id": promotion_id,
                "total_uses": total_uses,
                "total_discount_amount": total_discount,
                "total_items_affected": total_items,
                "usage_records": usage_records
            }))
        }
        Err(e) => {
            tracing::error!("Failed to fetch promotion usage: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch promotion usage"
            }))
        }
    }
}

/// POST /api/promotions/evaluate
/// Evaluate applicable promotions for a cart
#[post("/api/promotions/evaluate")]
pub async fn evaluate_promotions(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    tracing::info!("Evaluating promotions for cart");

    // Extract cart details from request
    let items = match req.get("items").and_then(|v| v.as_array()) {
        Some(items) => items,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Missing or invalid 'items' field"
            }));
        }
    };

    let customer_tier = req
        .get("customer_tier")
        .and_then(|v| v.as_str())
        .unwrap_or("Retail");

    let now = Utc::now().to_rfc3339();

    // Fetch active promotions
    let promotions = match sqlx::query_as::<_, Promotion>(
        "SELECT id, name, description, promotion_type, discount_value, start_date, end_date, 
         applies_to_categories, applies_to_products, applies_to_tiers, min_quantity, is_active 
         FROM promotions 
         WHERE is_active = 1 AND start_date <= ? AND end_date >= ?",
    )
    .bind(&now)
    .bind(&now)
    .fetch_all(pool.get_ref())
    .await
    {
        Ok(promos) => promos,
        Err(e) => {
            tracing::error!("Failed to fetch promotions: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch promotions"
            }));
        }
    };

    let mut applicable_promotions = Vec::new();

    for promotion in promotions {
        // Check if promotion applies to customer tier
        if let Some(tiers_json) = &promotion.applies_to_tiers {
            if let Ok(tiers) = serde_json::from_str::<Vec<String>>(tiers_json) {
                if !tiers.contains(&customer_tier.to_string()) {
                    continue;
                }
            }
        }

        // Evaluate promotion for each item
        for item in items {
            let product_id = item.get("product_id").and_then(|v| v.as_str());
            let category_id = item.get("category_id").and_then(|v| v.as_str());
            let quantity = item.get("quantity").and_then(|v| v.as_i64()).unwrap_or(1);
            let price = item.get("price").and_then(|v| v.as_f64()).unwrap_or(0.0);

            // Check if promotion applies to this product/category
            let applies = check_promotion_applicability(&promotion, product_id, category_id);
            if !applies {
                continue;
            }

            // Check quantity threshold
            if let Some(min_qty) = promotion.min_quantity {
                if quantity < min_qty as i64 {
                    continue;
                }
            }

            // Calculate discount
            let discount = calculate_discount(&promotion, price, quantity as i32);

            applicable_promotions.push(serde_json::json!({
                "promotion_id": promotion.id,
                "promotion_name": promotion.name,
                "promotion_type": promotion.promotion_type,
                "discount_amount": discount,
                "product_id": product_id,
                "applies_to": "item"
            }));
        }
    }

    // Sort by discount amount (best first)
    applicable_promotions.sort_by(|a, b| {
        let a_discount = a.get("discount_amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let b_discount = b.get("discount_amount").and_then(|v| v.as_f64()).unwrap_or(0.0);
        b_discount.partial_cmp(&a_discount).unwrap()
    });

    HttpResponse::Ok().json(serde_json::json!({
        "applicable_promotions": applicable_promotions,
        "best_promotion": applicable_promotions.first()
    }))
}

/// Record promotion usage
pub async fn record_promotion_usage(
    pool: &SqlitePool,
    promotion_id: &str,
    transaction_id: &str,
    customer_id: Option<&str>,
    discount_amount: f64,
    items_affected: i32,
) -> Result<(), sqlx::Error> {
    let usage_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    sqlx::query(
        "INSERT INTO promotion_usage (id, promotion_id, transaction_id, customer_id, 
         discount_amount, items_affected, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&usage_id)
    .bind(promotion_id)
    .bind(transaction_id)
    .bind(customer_id)
    .bind(discount_amount)
    .bind(items_affected)
    .bind(&now)
    .execute(pool)
    .await?;

    Ok(())
}

// Helper functions
fn check_promotion_applicability(
    promotion: &Promotion,
    product_id: Option<&str>,
    category_id: Option<&str>,
) -> bool {
    // If no filters specified, promotion applies to all
    if promotion.applies_to_categories.is_none() && promotion.applies_to_products.is_none() {
        return true;
    }

    // Check product filter
    if let Some(products_json) = &promotion.applies_to_products {
        if let Ok(products) = serde_json::from_str::<Vec<String>>(products_json) {
            if let Some(pid) = product_id {
                if products.contains(&pid.to_string()) {
                    return true;
                }
            }
        }
    }

    // Check category filter
    if let Some(categories_json) = &promotion.applies_to_categories {
        if let Ok(categories) = serde_json::from_str::<Vec<String>>(categories_json) {
            if let Some(cid) = category_id {
                if categories.contains(&cid.to_string()) {
                    return true;
                }
            }
        }
    }

    false
}

fn calculate_discount(promotion: &Promotion, price: f64, quantity: i32) -> f64 {
    match promotion.promotion_type.as_str() {
        "PercentageOff" => price * quantity as f64 * (promotion.discount_value / 100.0),
        "FixedAmountOff" => promotion.discount_value * quantity as f64,
        "QuantityDiscount" => {
            if let Some(min_qty) = promotion.min_quantity {
                if quantity >= min_qty {
                    price * quantity as f64 * (promotion.discount_value / 100.0)
                } else {
                    0.0
                }
            } else {
                0.0
            }
        }
        _ => 0.0,
    }
}


/// POST /api/promotions/group-markdown
/// Apply a category-wide markdown (discount)
#[post("/api/promotions/group-markdown")]
pub async fn create_group_markdown(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let category_id = match req.get("category_id").and_then(|v| v.as_str()) {
        Some(id) if !id.is_empty() => id,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Category ID is required"
            }));
        }
    };

    let discount_percentage = match req.get("discount_percentage").and_then(|v| v.as_f64()) {
        Some(pct) if pct > 0.0 && pct <= 100.0 => pct,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Discount percentage must be between 0 and 100"
            }));
        }
    };

    let name = req.get("name")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| format!("Group Markdown - {}", category_id));

    let description = req.get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    let start_date = req.get("start_date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| Utc::now().to_rfc3339());

    let end_date = req.get("end_date")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    tracing::info!(
        "Creating group markdown: {}% off for category {}",
        discount_percentage,
        category_id
    );

    let promotion_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Create promotion with category filter
    let applies_to_categories = serde_json::to_string(&vec![category_id]).unwrap();

    let result = sqlx::query(
        "INSERT INTO promotions (id, name, description, promotion_type, discount_value,
         start_date, end_date, applies_to_categories, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&promotion_id)
    .bind(&name)
    .bind(description.as_deref())
    .bind("PercentageOff")
    .bind(discount_percentage)
    .bind(&start_date)
    .bind(end_date.as_deref())
    .bind(&applies_to_categories)
    .bind(1) // is_active = true
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Group markdown created successfully: {}", promotion_id);
            HttpResponse::Created().json(serde_json::json!({
                "id": promotion_id,
                "name": name,
                "category_id": category_id,
                "discount_percentage": discount_percentage,
                "start_date": start_date,
                "end_date": end_date,
                "message": "Group markdown created successfully"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to create group markdown: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create group markdown"
            }))
        }
    }
}

/// GET /api/promotions/group-markdowns
/// List all active group markdowns
#[get("/api/promotions/group-markdowns")]
pub async fn list_group_markdowns(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Fetching active group markdowns");

    let result = sqlx::query_as::<_, Promotion>(
        "SELECT id, name, description, promotion_type, discount_value, start_date, end_date,
         min_quantity, max_uses, applies_to_products, applies_to_categories, 
         applies_to_tiers, is_active, created_at
         FROM promotions
         WHERE promotion_type = 'PercentageOff'
         AND applies_to_categories IS NOT NULL
         AND is_active = 1
         AND (end_date IS NULL OR end_date > ?)
         ORDER BY created_at DESC",
    )
    .bind(&Utc::now().to_rfc3339())
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(markdowns) => HttpResponse::Ok().json(markdowns),
        Err(e) => {
            tracing::error!("Failed to fetch group markdowns: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch group markdowns"
            }))
        }
    }
}

/// DELETE /api/promotions/group-markdown/:id
/// Deactivate a group markdown
#[delete("/api/promotions/group-markdown/{id}")]
pub async fn deactivate_group_markdown(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let promotion_id = path.into_inner();
    tracing::info!("Deactivating group markdown: {}", promotion_id);

    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        "UPDATE promotions 
         SET is_active = 0, end_date = ? 
         WHERE id = ? AND promotion_type = 'PercentageOff'",
    )
    .bind(&now)
    .bind(&promotion_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(result) if result.rows_affected() > 0 => {
            tracing::info!("Group markdown deactivated: {}", promotion_id);
            HttpResponse::Ok().json(serde_json::json!({
                "message": "Group markdown deactivated successfully"
            }))
        }
        Ok(_) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Group markdown not found"
        })),
        Err(e) => {
            tracing::error!("Failed to deactivate group markdown: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to deactivate group markdown"
            }))
        }
    }
}
