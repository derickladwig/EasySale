use actix_web::{get, post, put, web, HttpResponse, Responder};
use chrono::Utc;
use sqlx::{SqlitePool, Transaction, Sqlite, QueryBuilder};
use uuid::Uuid;

use crate::middleware::tenant::get_current_tenant_id;
use crate::models::{
    CreateLayawayPaymentRequest, CreateLayawayRequest, Layaway, LayawayItem, LayawayPayment,
    LayawayResponse, LayawayStatus,
};

/// POST /api/layaways
/// Create a new layaway
#[post("/api/layaways")]
pub async fn create_layaway(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateLayawayRequest>,
) -> impl Responder {
    tracing::info!("Creating layaway for customer: {}", req.customer_id);

    // Calculate total amount
    let total_amount: f64 = req
        .items
        .iter()
        .map(|item| item.quantity * item.unit_price)
        .sum();

    // Validate deposit
    if req.deposit_amount > total_amount {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Deposit amount cannot exceed total amount"
        }));
    }

    let layaway_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let balance_due = total_amount - req.deposit_amount;

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

    // Insert layaway
    let result = sqlx::query(
        "INSERT INTO layaways (id, tenant_id, customer_id, status, total_amount, deposit_amount, 
         balance_due, due_date, created_at, updated_at, sync_version, store_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)",
    )
    .bind(&layaway_id)
    .bind(&get_current_tenant_id())
    .bind(&req.customer_id)
    .bind(LayawayStatus::Active.as_str())
    .bind(total_amount)
    .bind(req.deposit_amount)
    .bind(balance_due)
    .bind(&req.due_date)
    .bind(&now)
    .bind(&now)
    .bind(&req.store_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to create layaway: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to create layaway"
        }));
    }

    // Insert layaway items
    for item in &req.items {
        let item_id = Uuid::new_v4().to_string();
        let total_price = item.quantity * item.unit_price;

        let result = sqlx::query(
            "INSERT INTO layaway_items (id, tenant_id, layaway_id, product_id, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(&item_id)
        .bind(&get_current_tenant_id())
        .bind(&layaway_id)
        .bind(&item.product_id)
        .bind(item.quantity)
        .bind(item.unit_price)
        .bind(total_price)
        .execute(&mut *tx)
        .await;

        if let Err(e) = result {
            tracing::error!("Failed to create layaway item: {:?}", e);
            let _ = tx.rollback().await;
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create layaway items"
            }));
        }
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to commit transaction"
        }));
    }

    tracing::info!("Layaway created successfully: {}", layaway_id);

    // Fetch and return the created layaway
    match get_layaway_with_details(pool.get_ref(), &layaway_id).await {
        Ok(layaway) => HttpResponse::Created().json(layaway),
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Layaway created but failed to fetch"
        })),
    }
}


/// POST /api/layaways/:id/payments
/// Record a payment on a layaway
#[post("/api/layaways/{id}/payments")]
pub async fn record_layaway_payment(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<CreateLayawayPaymentRequest>,
) -> impl Responder {
    let layaway_id = path.into_inner();
    tracing::info!("Recording payment for layaway: {}", layaway_id);

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

    // Fetch layaway
    let layaway = match get_layaway_by_id_tx(&mut tx, &layaway_id).await {
        Ok(layaway) => layaway,
        Err(sqlx::Error::RowNotFound) => {
            let _ = tx.rollback().await;
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Layaway not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch layaway: {:?}", e);
            let _ = tx.rollback().await;
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch layaway"
            }));
        }
    };

    // Validate layaway status
    if layaway.status() != LayawayStatus::Active {
        let _ = tx.rollback().await;
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Cannot process payment for {} layaway", layaway.status().as_str())
        }));
    }

    // Validate payment amount
    if req.amount <= 0.0 {
        let _ = tx.rollback().await;
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Payment amount must be greater than zero"
        }));
    }

    if req.amount > layaway.balance_due {
        let _ = tx.rollback().await;
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Payment amount exceeds balance due",
            "balance_due": layaway.balance_due
        }));
    }

    // Record payment
    let payment_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        "INSERT INTO layaway_payments (id, tenant_id, layaway_id, amount, payment_method, payment_date, employee_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&payment_id)
    .bind(&get_current_tenant_id())
    .bind(&layaway_id)
    .bind(req.amount)
    .bind(&req.payment_method)
    .bind(&now)
    .bind(&req.employee_id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to record payment: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to record payment"
        }));
    }

    // Update layaway balance
    let new_balance = layaway.balance_due - req.amount;
    let new_status = if new_balance <= 0.01 {
        // Consider paid if balance is less than 1 cent
        LayawayStatus::Completed
    } else {
        LayawayStatus::Active
    };

    let completed_at = if new_status == LayawayStatus::Completed {
        Some(now.clone())
    } else {
        None
    };

    let result = sqlx::query(
        "UPDATE layaways 
         SET balance_due = ?, status = ?, completed_at = ?, updated_at = ?, sync_version = sync_version + 1
         WHERE id = ? AND tenant_id = ?",
    )
    .bind(new_balance)
    .bind(new_status.as_str())
    .bind(&completed_at)
    .bind(&now)
    .bind(&layaway_id)
    .bind(&get_current_tenant_id())
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to update layaway: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update layaway"
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
        "Payment recorded successfully for layaway: {} (new balance: {})",
        layaway_id,
        new_balance
    );

    // Fetch and return updated layaway
    match get_layaway_with_details(pool.get_ref(), &layaway_id).await {
        Ok(layaway) => HttpResponse::Ok().json(layaway),
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Payment recorded but failed to fetch layaway"
        })),
    }
}


/// PUT /api/layaways/:id/complete
/// Complete a layaway (mark as completed)
#[put("/api/layaways/{id}/complete")]
pub async fn complete_layaway(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let layaway_id = path.into_inner();
    tracing::info!("Completing layaway: {}", layaway_id);

    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        "UPDATE layaways 
         SET status = ?, completed_at = ?, updated_at = ?, sync_version = sync_version + 1
         WHERE id = ? AND status = ? AND tenant_id = ?",
    )
    .bind(LayawayStatus::Completed.as_str())
    .bind(&now)
    .bind(&now)
    .bind(&layaway_id)
    .bind(LayawayStatus::Active.as_str())
    .bind(&get_current_tenant_id())
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                tracing::info!("Layaway completed successfully: {}", layaway_id);
                match get_layaway_with_details(pool.get_ref(), &layaway_id).await {
                    Ok(layaway) => HttpResponse::Ok().json(layaway),
                    Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Layaway completed but failed to fetch"
                    })),
                }
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Layaway not found or not in active status"
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to complete layaway: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to complete layaway"
            }))
        }
    }
}

/// PUT /api/layaways/:id/cancel
/// Cancel a layaway
#[put("/api/layaways/{id}/cancel")]
pub async fn cancel_layaway(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let layaway_id = path.into_inner();
    tracing::info!("Cancelling layaway: {}", layaway_id);

    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        "UPDATE layaways 
         SET status = ?, updated_at = ?, sync_version = sync_version + 1
         WHERE id = ? AND status = ? AND tenant_id = ?",
    )
    .bind(LayawayStatus::Cancelled.as_str())
    .bind(&now)
    .bind(&layaway_id)
    .bind(LayawayStatus::Active.as_str())
    .bind(&get_current_tenant_id())
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                tracing::info!("Layaway cancelled successfully: {}", layaway_id);
                match get_layaway_with_details(pool.get_ref(), &layaway_id).await {
                    Ok(layaway) => HttpResponse::Ok().json(layaway),
                    Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Layaway cancelled but failed to fetch"
                    })),
                }
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Layaway not found or not in active status"
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to cancel layaway: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to cancel layaway"
            }))
        }
    }
}

/// GET /api/layaways/:id
/// Get a layaway by ID with items and payments
#[get("/api/layaways/{id}")]
pub async fn get_layaway(pool: web::Data<SqlitePool>, path: web::Path<String>) -> impl Responder {
    let layaway_id = path.into_inner();
    tracing::info!("Fetching layaway: {}", layaway_id);

    match get_layaway_with_details(pool.get_ref(), &layaway_id).await {
        Ok(layaway) => HttpResponse::Ok().json(layaway),
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Layaway not found"
        })),
        Err(e) => {
            tracing::error!("Failed to fetch layaway: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch layaway"
            }))
        }
    }
}

/// GET /api/layaways
/// List layaways with optional filtering
#[get("/api/layaways")]
pub async fn list_layaways(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    tracing::info!("Listing layaways");

    let tenant_id = get_current_tenant_id();
    
    // Build parameterized query with tenant isolation
    let mut query_builder = sqlx::QueryBuilder::new(
        "SELECT id, tenant_id, customer_id, status, total_amount, deposit_amount, balance_due, 
         due_date, created_at, updated_at, completed_at, sync_version, store_id 
         FROM layaways WHERE tenant_id = "
    );
    query_builder.push_bind(&tenant_id);

    if let Some(customer_id) = query.get("customer_id") {
        query_builder.push(" AND customer_id = ");
        query_builder.push_bind(customer_id);
    }
    if let Some(status) = query.get("status") {
        query_builder.push(" AND status = ");
        query_builder.push_bind(status);
    }
    if let Some(store_id) = query.get("store_id") {
        query_builder.push(" AND store_id = ");
        query_builder.push_bind(store_id);
    }

    query_builder.push(" ORDER BY created_at DESC");

    let result = query_builder.build_query_as::<Layaway>()
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(layaways) => {
            let responses: Vec<LayawayResponse> = layaways
                .into_iter()
                .map(LayawayResponse::from)
                .collect();
            HttpResponse::Ok().json(responses)
        }
        Err(e) => {
            tracing::error!("Failed to list layaways: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list layaways"
            }))
        }
    }
}

// Helper functions
async fn get_layaway_by_id_tx(
    tx: &mut Transaction<'_, Sqlite>,
    id: &str,
) -> Result<Layaway, sqlx::Error> {
    sqlx::query_as::<_, Layaway>(
        "SELECT id, tenant_id, customer_id, status, total_amount, deposit_amount, balance_due, 
         due_date, created_at, updated_at, completed_at, sync_version, store_id 
         FROM layaways 
         WHERE id = ? AND tenant_id = ?",
    )
    .bind(id)
    .bind(&get_current_tenant_id())
    .fetch_one(&mut **tx)
    .await
}

async fn get_layaway_with_details(
    pool: &SqlitePool,
    id: &str,
) -> Result<LayawayResponse, sqlx::Error> {
    // Fetch layaway
    let layaway = sqlx::query_as::<_, Layaway>(
        "SELECT id, tenant_id, customer_id, status, total_amount, deposit_amount, balance_due, 
         due_date, created_at, updated_at, completed_at, sync_version, store_id 
         FROM layaways 
         WHERE id = ? AND tenant_id = ?",
    )
    .bind(id)
    .bind(&get_current_tenant_id())
    .fetch_one(pool)
    .await?;

    // Fetch items
    let items = sqlx::query_as::<_, LayawayItem>(
        "SELECT id, tenant_id, layaway_id, product_id, quantity, unit_price, total_price 
         FROM layaway_items 
         WHERE layaway_id = ? AND tenant_id = ?",
    )
    .bind(id)
    .bind(&get_current_tenant_id())
    .fetch_all(pool)
    .await?;

    // Fetch payments
    let payments = sqlx::query_as::<_, LayawayPayment>(
        "SELECT id, tenant_id, layaway_id, amount, payment_method, payment_date, employee_id 
         FROM layaway_payments 
         WHERE layaway_id = ? AND tenant_id = ?
         ORDER BY payment_date ASC",
    )
    .bind(id)
    .bind(&get_current_tenant_id())
    .fetch_all(pool)
    .await?;

    let mut response = LayawayResponse::from(layaway);
    response.items = items;
    response.payments = payments;

    Ok(response)
}


/// POST /api/layaways/check-overdue
/// Check and flag overdue layaways
#[post("/api/layaways/check-overdue")]
pub async fn check_overdue_layaways(pool: web::Data<SqlitePool>) -> impl Responder {
    tracing::info!("Checking for overdue layaways");

    let now = Utc::now().to_rfc3339();

    // Update overdue layaways
    let result = sqlx::query(
        "UPDATE layaways 
         SET status = ?, updated_at = ?, sync_version = sync_version + 1
         WHERE status = ? AND due_date IS NOT NULL AND due_date < ? AND tenant_id = ?",
    )
    .bind(LayawayStatus::Overdue.as_str())
    .bind(&now)
    .bind(LayawayStatus::Active.as_str())
    .bind(&now)
    .bind(&get_current_tenant_id())
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(rows) => {
            let count = rows.rows_affected();
            tracing::info!("Flagged {} layaways as overdue", count);
            HttpResponse::Ok().json(serde_json::json!({
                "message": format!("Flagged {} layaways as overdue", count),
                "count": count
            }))
        }
        Err(e) => {
            tracing::error!("Failed to check overdue layaways: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to check overdue layaways"
            }))
        }
    }
}

/// GET /api/layaways/overdue
/// Get all overdue layaways
#[get("/api/layaways/overdue")]
pub async fn get_overdue_layaways(pool: web::Data<SqlitePool>) -> impl Responder {
    tracing::info!("Fetching overdue layaways");

    let result = sqlx::query_as::<_, Layaway>(
        "SELECT id, tenant_id, customer_id, status, total_amount, deposit_amount, balance_due, 
         due_date, created_at, updated_at, completed_at, sync_version, store_id 
         FROM layaways 
         WHERE (status = ? OR (status = ? AND due_date IS NOT NULL AND due_date < datetime('now')))
         AND tenant_id = ?
         ORDER BY due_date ASC",
    )
    .bind(LayawayStatus::Overdue.as_str())
    .bind(LayawayStatus::Active.as_str())
    .bind(&get_current_tenant_id())
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(layaways) => {
            let responses: Vec<LayawayResponse> = layaways
                .into_iter()
                .map(LayawayResponse::from)
                .collect();
            HttpResponse::Ok().json(responses)
        }
        Err(e) => {
            tracing::error!("Failed to fetch overdue layaways: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch overdue layaways"
            }))
        }
    }
}
