use actix_web::{get, post, web, HttpResponse, Responder};
use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::{LoyaltyTransaction, LoyaltyTransactionType, PriceLevel, RedeemPointsRequest};

/// GET /api/customers/:id/loyalty
/// Get loyalty balance for a customer
#[get("/api/customers/{id}/loyalty")]
pub async fn get_loyalty_balance(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let customer_id = path.into_inner();
    tracing::info!("Fetching loyalty balance for customer: {}", customer_id);

    // Get current points from customer record
    let result = sqlx::query_as::<_, (i32,)>(
        "SELECT loyalty_points FROM customers WHERE id = ?"
    )
    .bind(&customer_id)
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok((loyalty_points,)) => {
            // Fetch recent transactions
            let transactions = sqlx::query_as::<_, LoyaltyTransaction>(
                "SELECT id, customer_id, transaction_type, points, amount, reference_id, 
                 created_at, employee_id 
                 FROM loyalty_transactions 
                 WHERE customer_id = ? 
                 ORDER BY created_at DESC 
                 LIMIT 50",
            )
            .bind(&customer_id)
            .fetch_all(pool.get_ref())
            .await
            .unwrap_or_default();

            HttpResponse::Ok().json(serde_json::json!({
                "customer_id": customer_id,
                "current_points": loyalty_points,
                "recent_transactions": transactions
            }))
        }
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Customer not found"
        })),
        Err(e) => {
            tracing::error!("Failed to fetch loyalty balance: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch loyalty balance"
            }))
        }
    }
}

/// Award loyalty points for a purchase
/// This is called internally when processing sales
pub async fn award_loyalty_points(
    pool: &SqlitePool,
    customer_id: &str,
    purchase_amount: f64,
    reference_id: &str,
    employee_id: &str,
    points_per_dollar: f64,
) -> Result<i32, sqlx::Error> {
    tracing::info!(
        "Awarding loyalty points for customer {} on purchase {}",
        customer_id,
        reference_id
    );

    // Calculate points (rounded down)
    let points = (purchase_amount * points_per_dollar).floor() as i32;

    if points <= 0 {
        return Ok(0);
    }

    let transaction_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Record loyalty transaction
    sqlx::query(
        "INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, amount, 
         reference_id, created_at, employee_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&transaction_id)
    .bind(customer_id)
    .bind(LoyaltyTransactionType::Earned.as_str())
    .bind(points)
    .bind(purchase_amount)
    .bind(reference_id)
    .bind(&now)
    .bind(employee_id)
    .execute(pool)
    .await?;

    // Update customer points balance
    sqlx::query(
        "UPDATE customers 
         SET loyalty_points = loyalty_points + ?, updated_at = ?, sync_version = sync_version + 1 
         WHERE id = ?",
    )
    .bind(points)
    .bind(&now)
    .bind(customer_id)
    .execute(pool)
    .await?;

    tracing::info!(
        "Awarded {} points to customer {}",
        points,
        customer_id
    );

    Ok(points)
}

/// POST /api/customers/:id/loyalty/redeem
/// Redeem loyalty points
#[post("/api/customers/{id}/loyalty/redeem")]
pub async fn redeem_loyalty_points(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<RedeemPointsRequest>,
) -> impl Responder {
    let customer_id = path.into_inner();
    tracing::info!(
        "Redeeming {} points for customer: {}",
        req.points,
        customer_id
    );

    // Validate points amount
    if req.points <= 0 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Points to redeem must be greater than zero"
        }));
    }

    // Get current points balance
    let result = sqlx::query_as::<_, (i32,)>(
        "SELECT loyalty_points FROM customers WHERE id = ?"
    )
    .bind(&customer_id)
    .fetch_one(pool.get_ref())
    .await;

    let current_points = match result {
        Ok((loyalty_points,)) => loyalty_points,
        Err(sqlx::Error::RowNotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Customer not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch customer: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch customer"
            }));
        }
    };

    // Check if customer has enough points
    if current_points < req.points {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Insufficient points",
            "current_points": current_points,
            "requested_points": req.points
        }));
    }

    let transaction_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to start transaction"
            }));
        }
    };

    // Record loyalty transaction
    let result = sqlx::query(
        "INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, amount, 
         reference_id, created_at, employee_id)
         VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)",
    )
    .bind(&transaction_id)
    .bind(&customer_id)
    .bind(LoyaltyTransactionType::Redeemed.as_str())
    .bind(-req.points) // Negative for redemption
    .bind(&now)
    .bind(&req.employee_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record loyalty transaction: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to record loyalty transaction"
        }));
    }

    // Update customer points balance
    let result = sqlx::query(
        "UPDATE customers 
         SET loyalty_points = loyalty_points - ?, updated_at = ?, sync_version = sync_version + 1 
         WHERE id = ?",
    )
    .bind(req.points)
    .bind(&now)
    .bind(&customer_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to update customer points: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update customer points"
        }));
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to commit transaction"
        }));
    }

    tracing::info!(
        "Redeemed {} points for customer {}",
        req.points,
        customer_id
    );

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Points redeemed successfully",
        "points_redeemed": req.points,
        "new_balance": current_points - req.points
    }))
}

/// GET /api/price-levels
/// Get price levels (optionally filtered by product and tier)
#[get("/api/price-levels")]
pub async fn get_price_levels(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    tracing::info!("Fetching price levels");

    let mut sql = "SELECT id, product_id, pricing_tier, price, markup_percentage 
                   FROM price_levels 
                   WHERE 1=1".to_string();

    if let Some(product_id) = query.get("product_id") {
        sql.push_str(&format!(" AND product_id = '{}'", product_id));
    }
    if let Some(pricing_tier) = query.get("pricing_tier") {
        sql.push_str(&format!(" AND pricing_tier = '{}'", pricing_tier));
    }

    sql.push_str(" ORDER BY product_id, pricing_tier");

    let result = sqlx::query_as::<_, PriceLevel>(&sql)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(price_levels) => HttpResponse::Ok().json(price_levels),
        Err(e) => {
            tracing::error!("Failed to fetch price levels: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch price levels"
            }))
        }
    }
}

/// POST /api/price-levels
/// Create a new price level
#[post("/api/price-levels")]
pub async fn create_price_level(
    pool: web::Data<SqlitePool>,
    req: web::Json<PriceLevel>,
) -> impl Responder {
    tracing::info!(
        "Creating price level for product {} tier {}",
        req.product_id,
        req.pricing_tier
    );

    let price_level_id = Uuid::new_v4().to_string();

    let result = sqlx::query(
        "INSERT INTO price_levels (id, product_id, pricing_tier, price, markup_percentage)
         VALUES (?, ?, ?, ?, ?)",
    )
    .bind(&price_level_id)
    .bind(&req.product_id)
    .bind(&req.pricing_tier)
    .bind(req.price)
    .bind(req.markup_percentage)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Price level created successfully: {}", price_level_id);
            HttpResponse::Created().json(serde_json::json!({
                "id": price_level_id,
                "product_id": req.product_id,
                "pricing_tier": req.pricing_tier,
                "price": req.price,
                "markup_percentage": req.markup_percentage
            }))
        }
        Err(e) => {
            tracing::error!("Failed to create price level: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create price level"
            }))
        }
    }
}

/// Get price for a product based on customer's pricing tier
pub async fn get_product_price(
    pool: &SqlitePool,
    product_id: &str,
    pricing_tier: &str,
) -> Result<Option<f64>, sqlx::Error> {
    let result = sqlx::query_as::<_, (f64,)>(
        "SELECT price FROM price_levels WHERE product_id = ? AND pricing_tier = ?"
    )
    .bind(product_id)
    .bind(pricing_tier)
    .fetch_optional(pool)
    .await?;

    Ok(result.map(|(price,)| price))
}

/// GET /api/customers/:id/store-credit
/// Get store credit balance for a customer
#[get("/api/customers/{id}/store-credit")]
pub async fn get_store_credit_balance(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let customer_id = path.into_inner();
    tracing::info!("Fetching store credit balance for customer: {}", customer_id);

    let result = sqlx::query_as::<_, (f64,)>(
        "SELECT store_credit FROM customers WHERE id = ?"
    )
    .bind(&customer_id)
    .fetch_one(pool.get_ref())
    .await;

    match result {
        Ok((store_credit,)) => HttpResponse::Ok().json(serde_json::json!({
            "customer_id": customer_id,
            "store_credit": store_credit
        })),
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Customer not found"
        })),
        Err(e) => {
            tracing::error!("Failed to fetch store credit balance: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch store credit balance"
            }))
        }
    }
}

/// POST /api/customers/:id/store-credit/issue
/// Issue store credit to a customer (for returns, promotions, etc.)
#[post("/api/customers/{id}/store-credit/issue")]
pub async fn issue_store_credit(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let customer_id = path.into_inner();
    
    let amount = match req.get("amount").and_then(|v| v.as_f64()) {
        Some(amt) if amt > 0.0 => amt,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Amount must be greater than zero"
            }));
        }
    };

    let reason = req.get("reason")
        .and_then(|v| v.as_str())
        .unwrap_or("Store credit issued");
    
    let employee_id = req.get("employee_id")
        .and_then(|v| v.as_str())
        .unwrap_or("system");

    tracing::info!(
        "Issuing ${:.2} store credit to customer {} - Reason: {}",
        amount,
        customer_id,
        reason
    );

    let now = Utc::now().to_rfc3339();

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to start transaction"
            }));
        }
    };

    // Update customer store credit balance
    let result = sqlx::query(
        "UPDATE customers 
         SET store_credit = store_credit + ?, updated_at = ?, sync_version = sync_version + 1 
         WHERE id = ?",
    )
    .bind(amount)
    .bind(&now)
    .bind(&customer_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to update store credit: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update store credit"
        }));
    }

    // Record loyalty transaction for audit trail
    let transaction_id = Uuid::new_v4().to_string();
    let result = sqlx::query(
        "INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, amount, 
         reference_id, created_at, employee_id)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)",
    )
    .bind(&transaction_id)
    .bind(&customer_id)
    .bind("StoreCredit")
    .bind(amount)
    .bind(reason)
    .bind(&now)
    .bind(employee_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record store credit transaction: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to record transaction"
        }));
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to commit transaction"
        }));
    }

    // Get new balance
    let new_balance = sqlx::query_as::<_, (f64,)>(
        "SELECT store_credit FROM customers WHERE id = ?"
    )
    .bind(&customer_id)
    .fetch_one(pool.get_ref())
    .await
    .map(|(balance,)| balance)
    .unwrap_or(0.0);

    tracing::info!(
        "Issued ${:.2} store credit to customer {}. New balance: ${:.2}",
        amount,
        customer_id,
        new_balance
    );

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Store credit issued successfully",
        "amount_issued": amount,
        "new_balance": new_balance
    }))
}

/// POST /api/customers/:id/store-credit/redeem
/// Redeem store credit at checkout
#[post("/api/customers/{id}/store-credit/redeem")]
pub async fn redeem_store_credit(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let customer_id = path.into_inner();
    
    let amount = match req.get("amount").and_then(|v| v.as_f64()) {
        Some(amt) if amt > 0.0 => amt,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Amount must be greater than zero"
            }));
        }
    };

    let reference_id = req.get("reference_id")
        .and_then(|v| v.as_str())
        .unwrap_or("checkout");
    
    let employee_id = req.get("employee_id")
        .and_then(|v| v.as_str())
        .unwrap_or("system");

    tracing::info!(
        "Redeeming ${:.2} store credit for customer {} on {}",
        amount,
        customer_id,
        reference_id
    );

    // Get current store credit balance
    let result = sqlx::query_as::<_, (f64,)>(
        "SELECT store_credit FROM customers WHERE id = ?"
    )
    .bind(&customer_id)
    .fetch_one(pool.get_ref())
    .await;

    let current_balance = match result {
        Ok((balance,)) => balance,
        Err(sqlx::Error::RowNotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Customer not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch customer: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch customer"
            }));
        }
    };

    // Check if customer has enough store credit
    if current_balance < amount {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Insufficient store credit",
            "current_balance": current_balance,
            "requested_amount": amount
        }));
    }

    let now = Utc::now().to_rfc3339();

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to start transaction"
            }));
        }
    };

    // Update customer store credit balance
    let result = sqlx::query(
        "UPDATE customers 
         SET store_credit = store_credit - ?, updated_at = ?, sync_version = sync_version + 1 
         WHERE id = ?",
    )
    .bind(amount)
    .bind(&now)
    .bind(&customer_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to update store credit: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update store credit"
        }));
    }

    // Record loyalty transaction for audit trail
    let transaction_id = Uuid::new_v4().to_string();
    let result = sqlx::query(
        "INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, amount, 
         reference_id, created_at, employee_id)
         VALUES (?, ?, ?, NULL, ?, ?, ?, ?)",
    )
    .bind(&transaction_id)
    .bind(&customer_id)
    .bind("StoreCreditRedeemed")
    .bind(-amount) // Negative for redemption
    .bind(reference_id)
    .bind(&now)
    .bind(employee_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record store credit redemption: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to record transaction"
        }));
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to commit transaction"
        }));
    }

    tracing::info!(
        "Redeemed ${:.2} store credit for customer {}. New balance: ${:.2}",
        amount,
        customer_id,
        current_balance - amount
    );

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Store credit redeemed successfully",
        "amount_redeemed": amount,
        "new_balance": current_balance - amount
    }))
}

/// POST /api/customers/:id/loyalty/adjust
/// Manual adjustment to loyalty points (manager only)
#[post("/api/customers/{id}/loyalty/adjust")]
pub async fn adjust_loyalty_points(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let customer_id = path.into_inner();
    
    let adjustment = match req.get("adjustment").and_then(|v| v.as_i64()) {
        Some(adj) if adj != 0 => adj as i32,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Adjustment must be a non-zero integer"
            }));
        }
    };

    let reason = match req.get("reason").and_then(|v| v.as_str()) {
        Some(r) if !r.is_empty() => r,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Reason is required for manual adjustments"
            }));
        }
    };
    
    let employee_id = match req.get("employee_id").and_then(|v| v.as_str()) {
        Some(id) if !id.is_empty() => id,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Employee ID is required for manual adjustments"
            }));
        }
    };

    tracing::info!(
        "Manual adjustment of {} points for customer {} by employee {} - Reason: {}",
        adjustment,
        customer_id,
        employee_id,
        reason
    );

    let now = Utc::now().to_rfc3339();

    // Start transaction
    let mut tx = match pool.begin().await {
        Ok(tx) => tx,
        Err(e) => {
            tracing::error!("Failed to start transaction: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to start transaction"
            }));
        }
    };

    // Update customer points balance
    let result = sqlx::query(
        "UPDATE customers 
         SET loyalty_points = loyalty_points + ?, updated_at = ?, sync_version = sync_version + 1 
         WHERE id = ?",
    )
    .bind(adjustment)
    .bind(&now)
    .bind(&customer_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to update loyalty points: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update loyalty points"
        }));
    }

    // Record loyalty transaction with audit trail
    let transaction_id = Uuid::new_v4().to_string();
    let transaction_type = if adjustment > 0 { "ManualAdjustmentAdd" } else { "ManualAdjustmentSubtract" };
    
    let result = sqlx::query(
        "INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, amount, 
         reference_id, created_at, employee_id)
         VALUES (?, ?, ?, ?, NULL, ?, ?, ?)",
    )
    .bind(&transaction_id)
    .bind(&customer_id)
    .bind(transaction_type)
    .bind(adjustment)
    .bind(reason)
    .bind(&now)
    .bind(employee_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record adjustment transaction: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to record transaction"
        }));
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to commit transaction"
        }));
    }

    // Get new balance
    let new_balance = sqlx::query_as::<_, (i32,)>(
        "SELECT loyalty_points FROM customers WHERE id = ?"
    )
    .bind(&customer_id)
    .fetch_one(pool.get_ref())
    .await
    .map(|(balance,)| balance)
    .unwrap_or(0);

    tracing::info!(
        "Adjusted loyalty points by {} for customer {}. New balance: {}",
        adjustment,
        customer_id,
        new_balance
    );

    HttpResponse::Ok().json(serde_json::json!({
        "message": "Loyalty points adjusted successfully",
        "adjustment": adjustment,
        "new_balance": new_balance,
        "reason": reason,
        "employee_id": employee_id
    }))
}

/// POST /api/customers/:id/pricing-tier/adjust
/// Manual adjustment to customer pricing tier (manager only)
#[post("/api/customers/{id}/pricing-tier/adjust")]
pub async fn adjust_pricing_tier(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let customer_id = path.into_inner();
    
    let new_tier = match req.get("pricing_tier").and_then(|v| v.as_str()) {
        Some(tier) if ["Retail", "Wholesale", "Contractor", "VIP"].contains(&tier) => tier,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid pricing tier. Must be one of: Retail, Wholesale, Contractor, VIP"
            }));
        }
    };

    let reason = match req.get("reason").and_then(|v| v.as_str()) {
        Some(r) if !r.is_empty() => r,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Reason is required for tier adjustments"
            }));
        }
    };
    
    let employee_id = match req.get("employee_id").and_then(|v| v.as_str()) {
        Some(id) if !id.is_empty() => id,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Employee ID is required for tier adjustments"
            }));
        }
    };

    tracing::info!(
        "Adjusting pricing tier to {} for customer {} by employee {} - Reason: {}",
        new_tier,
        customer_id,
        employee_id,
        reason
    );

    let now = Utc::now().to_rfc3339();

    // Get old tier for audit trail
    let old_tier = sqlx::query_as::<_, (String,)>(
        "SELECT pricing_tier FROM customers WHERE id = ?"
    )
    .bind(&customer_id)
    .fetch_one(pool.get_ref())
    .await
    .map(|(tier,)| tier)
    .unwrap_or_else(|_| "Unknown".to_string());

    // Update customer pricing tier
    let result = sqlx::query(
        "UPDATE customers 
         SET pricing_tier = ?, updated_at = ?, sync_version = sync_version + 1 
         WHERE id = ?",
    )
    .bind(new_tier)
    .bind(&now)
    .bind(&customer_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Record audit log in loyalty_transactions table
            let transaction_id = Uuid::new_v4().to_string();
            let audit_message = format!("Tier changed from {} to {} - {}", old_tier, new_tier, reason);
            
            let _ = sqlx::query(
                "INSERT INTO loyalty_transactions (id, customer_id, transaction_type, points, amount, 
                 reference_id, created_at, employee_id)
                 VALUES (?, ?, ?, NULL, NULL, ?, ?, ?)",
            )
            .bind(&transaction_id)
            .bind(&customer_id)
            .bind("TierAdjustment")
            .bind(&audit_message)
            .bind(&now)
            .bind(employee_id)
            .execute(pool.get_ref())
            .await;

            tracing::info!(
                "Adjusted pricing tier from {} to {} for customer {}",
                old_tier,
                new_tier,
                customer_id
            );

            HttpResponse::Ok().json(serde_json::json!({
                "message": "Pricing tier adjusted successfully",
                "old_tier": old_tier,
                "new_tier": new_tier,
                "reason": reason,
                "employee_id": employee_id
            }))
        }
        Err(sqlx::Error::RowNotFound) => {
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Customer not found"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to update pricing tier: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update pricing tier"
            }))
        }
    }
}
