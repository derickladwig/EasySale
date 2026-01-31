use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::middleware::get_current_tenant_id;
use crate::models::{
    CreateCustomerRequest, Customer, CustomerResponse, CustomerWithStats, PricingTier, UpdateCustomerRequest,
};

/// POST /api/customers
/// Create a new customer
#[post("/api/customers")]
pub async fn create_customer(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateCustomerRequest>,
) -> impl Responder {
    tracing::info!("Creating customer: {}", req.name);

    let customer_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let pricing_tier = req
        .pricing_tier
        .as_ref()
        .unwrap_or(&PricingTier::Retail)
        .as_str();

    let result = sqlx::query(
        "INSERT INTO customers (id, tenant_id, name, email, phone, pricing_tier, loyalty_points, 
         store_credit, credit_balance, created_at, updated_at, sync_version, store_id)
         VALUES (?, ?, ?, ?, ?, ?, 0, 0.0, 0.0, ?, ?, 0, ?)",
    )
    .bind(&customer_id)
    .bind(get_current_tenant_id())
    .bind(&req.name)
    .bind(&req.email)
    .bind(&req.phone)
    .bind(pricing_tier)
    .bind(&now)
    .bind(&now)
    .bind(&req.store_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Customer created successfully: {}", customer_id);
            
            // Fetch the created customer
            match get_customer_by_id(pool.get_ref(), &customer_id).await {
                Ok(customer) => HttpResponse::Created().json(CustomerResponse::from(customer)),
                Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Customer created but failed to fetch"
                })),
            }
        }
        Err(e) => {
            tracing::error!("Failed to create customer: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create customer"
            }))
        }
    }
}


/// GET /api/customers/:id
/// Get a customer by ID
#[get("/api/customers/{id}")]
pub async fn get_customer(pool: web::Data<SqlitePool>, path: web::Path<String>) -> impl Responder {
    let customer_id = path.into_inner();
    tracing::info!("Fetching customer: {}", customer_id);

    match get_customer_by_id(pool.get_ref(), &customer_id).await {
        Ok(customer) => HttpResponse::Ok().json(CustomerResponse::from(customer)),
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Customer not found"
        })),
        Err(e) => {
            tracing::error!("Failed to fetch customer: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch customer"
            }))
        }
    }
}

/// PUT /api/customers/:id
/// Update a customer
#[put("/api/customers/{id}")]
pub async fn update_customer(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<UpdateCustomerRequest>,
) -> impl Responder {
    let customer_id = path.into_inner();
    tracing::info!("Updating customer: {}", customer_id);

    // Fetch existing customer
    let existing_customer = match get_customer_by_id(pool.get_ref(), &customer_id).await {
        Ok(customer) => customer,
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

    // Build update query dynamically
    let mut updates = Vec::new();
    let mut params: Vec<Box<dyn sqlx::Encode<'_, sqlx::Sqlite> + Send>> = Vec::new();

    if let Some(name) = &req.name {
        updates.push("name = ?");
        params.push(Box::new(name.clone()));
    }
    if let Some(email) = &req.email {
        updates.push("email = ?");
        params.push(Box::new(email.clone()));
    }
    if let Some(phone) = &req.phone {
        updates.push("phone = ?");
        params.push(Box::new(phone.clone()));
    }
    if let Some(tier) = &req.pricing_tier {
        updates.push("pricing_tier = ?");
        params.push(Box::new(tier.as_str().to_string()));
    }
    if let Some(points) = req.loyalty_points {
        updates.push("loyalty_points = ?");
        params.push(Box::new(points));
    }
    if let Some(credit) = req.store_credit {
        updates.push("store_credit = ?");
        params.push(Box::new(credit));
    }
    if let Some(limit) = req.credit_limit {
        updates.push("credit_limit = ?");
        params.push(Box::new(limit));
    }

    if updates.is_empty() {
        return HttpResponse::Ok().json(CustomerResponse::from(existing_customer));
    }

    let now = Utc::now().to_rfc3339();
    updates.push("updated_at = ?");
    updates.push("sync_version = sync_version + 1");

    let query_str = format!(
        "UPDATE customers SET {} WHERE id = ? AND tenant_id = ?",
        updates.join(", ")
    );

    // Execute update - simplified version without dynamic params
    let tenant_id = get_current_tenant_id();
    let result = if let Some(name) = &req.name {
        sqlx::query(&query_str)
            .bind(name)
            .bind(&now)
            .bind(&customer_id)
            .bind(&tenant_id)
            .execute(pool.get_ref())
            .await
    } else {
        sqlx::query(&query_str)
            .bind(&now)
            .bind(&customer_id)
            .bind(&tenant_id)
            .execute(pool.get_ref())
            .await
    };

    match result {
        Ok(_) => {
            tracing::info!("Customer updated successfully: {}", customer_id);
            match get_customer_by_id(pool.get_ref(), &customer_id).await {
                Ok(customer) => HttpResponse::Ok().json(CustomerResponse::from(customer)),
                Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Customer updated but failed to fetch"
                })),
            }
        }
        Err(e) => {
            tracing::error!("Failed to update customer: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update customer"
            }))
        }
    }
}


/// DELETE /api/customers/:id
/// Delete a customer
#[delete("/api/customers/{id}")]
pub async fn delete_customer(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let customer_id = path.into_inner();
    tracing::info!("Deleting customer: {}", customer_id);

    let result = sqlx::query("DELETE FROM customers WHERE id = ? AND tenant_id = ?")
        .bind(&customer_id)
        .bind(get_current_tenant_id())
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                tracing::info!("Customer deleted successfully: {}", customer_id);
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Customer deleted successfully"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Customer not found"
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete customer: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to delete customer"
            }))
        }
    }
}

/// GET /api/customers
/// List customers with optional filtering and sales statistics
#[get("/api/customers")]
pub async fn list_customers(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    tracing::info!("Listing customers with sales statistics");

    let tenant_id = get_current_tenant_id();
    
    // Query with LEFT JOIN to sales_transactions for aggregated statistics
    let mut sql = r#"
        SELECT 
            c.id, c.tenant_id, c.name, c.email, c.phone, c.pricing_tier, 
            c.loyalty_points, c.store_credit, c.credit_limit, c.credit_balance, 
            c.created_at, c.updated_at, c.sync_version, c.store_id,
            COALESCE(SUM(CASE WHEN st.status = 'completed' THEN st.total_amount ELSE 0 END), 0.0) as total_spent,
            COUNT(CASE WHEN st.status = 'completed' THEN 1 END) as order_count,
            MAX(CASE WHEN st.status = 'completed' THEN st.created_at END) as last_order
        FROM customers c
        LEFT JOIN sales_transactions st ON c.id = st.customer_id AND c.tenant_id = st.tenant_id
        WHERE c.tenant_id = ?
    "#.to_string();
    
    // Add filters
    if let Some(pricing_tier) = query.get("pricing_tier") {
        sql.push_str(&format!(" AND c.pricing_tier = '{}'", pricing_tier));
    }
    if let Some(store_id) = query.get("store_id") {
        sql.push_str(&format!(" AND c.store_id = '{}'", store_id));
    }

    sql.push_str(" GROUP BY c.id ORDER BY c.name ASC");

    let result = sqlx::query_as::<_, CustomerWithStats>(&sql)
        .bind(&tenant_id)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(customers) => {
            let responses: Vec<CustomerResponse> = customers
                .into_iter()
                .map(CustomerResponse::from)
                .collect();
            HttpResponse::Ok().json(responses)
        }
        Err(e) => {
            tracing::error!("Failed to list customers: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list customers"
            }))
        }
    }
}

// Helper function to get customer by ID
async fn get_customer_by_id(pool: &SqlitePool, id: &str) -> Result<Customer, sqlx::Error> {
    sqlx::query_as::<_, Customer>(
        "SELECT id, tenant_id, name, email, phone, pricing_tier, loyalty_points, store_credit, 
         credit_limit, credit_balance, created_at, updated_at, sync_version, store_id 
         FROM customers 
         WHERE id = ? AND tenant_id = ?",
    )
    .bind(id)
    .bind(get_current_tenant_id())
    .fetch_one(pool)
    .await
}

/// Customer order response
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, sqlx::FromRow)]
pub struct CustomerOrderResponse {
    pub id: String,
    pub transaction_number: String,
    pub total_amount: f64,
    pub subtotal: f64,
    pub tax_amount: f64,
    pub discount_amount: f64,
    pub items_count: i32,
    pub payment_method: Option<String>,
    pub status: String,
    pub created_at: String,
    pub completed_at: Option<String>,
}

/// GET /api/customers/:id/orders
/// Get recent orders for a customer
#[get("/api/customers/{id}/orders")]
pub async fn get_customer_orders(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let customer_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    // Get limit from query params, default to 10
    let limit: i64 = query
        .get("limit")
        .and_then(|s| s.parse().ok())
        .unwrap_or(10);
    
    tracing::info!("Fetching orders for customer: {} (limit: {})", customer_id, limit);

    let result = sqlx::query_as::<_, CustomerOrderResponse>(
        r#"
        SELECT 
            id, transaction_number, total_amount, subtotal, tax_amount, 
            discount_amount, items_count, payment_method, status, 
            created_at, completed_at
        FROM sales_transactions 
        WHERE customer_id = ? AND tenant_id = ? AND status = 'completed'
        ORDER BY created_at DESC 
        LIMIT ?
        "#,
    )
    .bind(&customer_id)
    .bind(&tenant_id)
    .bind(limit)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(orders) => {
            tracing::info!("Found {} orders for customer {}", orders.len(), customer_id);
            HttpResponse::Ok().json(orders)
        }
        Err(e) => {
            tracing::error!("Failed to fetch customer orders: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch customer orders"
            }))
        }
    }
}
