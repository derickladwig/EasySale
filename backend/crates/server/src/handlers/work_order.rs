use actix_web::{get, post, put, web, HttpResponse, Responder};
use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::middleware::tenant::get_current_tenant_id;
use crate::models::{
    CreateWorkOrderLineRequest, CreateWorkOrderRequest, UpdateWorkOrderRequest, WorkOrder,
    WorkOrderLine, WorkOrderLineType, WorkOrderResponse, WorkOrderStatus,
};

/// Generate unique work order number
fn generate_work_order_number() -> String {
    let now = Utc::now();
    format!("WO-{}-{}", now.format("%Y%m%d"), Uuid::new_v4().to_string()[..8].to_uppercase())
}

/// POST /api/work-orders
/// Create a new work order
#[post("/api/work-orders")]
pub async fn create_work_order(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateWorkOrderRequest>,
) -> impl Responder {
    tracing::info!("Creating work order for customer: {}", req.customer_id);

    let work_order_id = Uuid::new_v4().to_string();
    let work_order_number = generate_work_order_number();
    let now = Utc::now().to_rfc3339();
    let is_warranty_int = if req.is_warranty { 1 } else { 0 };

    let result = sqlx::query(
        "INSERT INTO work_orders (id, tenant_id, work_order_number, customer_id, vehicle_id, status, 
         description, estimated_total, labor_total, parts_total, created_at, updated_at, 
         assigned_technician_id, is_warranty, sync_version, store_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0.0, 0.0, ?, ?, ?, ?, 0, ?)",
    )
    .bind(&work_order_id)
    .bind(&get_current_tenant_id())
    .bind(&work_order_number)
    .bind(&req.customer_id)
    .bind(&req.vehicle_id)
    .bind(WorkOrderStatus::Created.as_str())
    .bind(&req.description)
    .bind(req.estimated_total)
    .bind(&now)
    .bind(&now)
    .bind(&req.assigned_technician_id)
    .bind(is_warranty_int)
    .bind(&req.store_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Work order created successfully: {}", work_order_number);
            match get_work_order_with_lines(pool.get_ref(), &work_order_id).await {
                Ok(work_order) => HttpResponse::Created().json(work_order),
                Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Work order created but failed to fetch"
                })),
            }
        }
        Err(e) => {
            tracing::error!("Failed to create work order: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create work order"
            }))
        }
    }
}

/// POST /api/work-orders/:id/lines
/// Add a line item to a work order
#[post("/api/work-orders/{id}/lines")]
pub async fn add_work_order_line(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<CreateWorkOrderLineRequest>,
) -> impl Responder {
    let work_order_id = path.into_inner();
    tracing::info!("Adding line to work order: {}", work_order_id);

    // Calculate total price (for labor: quantity is hours, unit_price is hourly rate)
    let total_price = req.quantity * req.unit_price;

    let line_id = Uuid::new_v4().to_string();
    let is_warranty_int = if req.is_warranty { 1 } else { 0 };

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

    // Insert line
    let result = sqlx::query(
        "INSERT INTO work_order_lines (id, tenant_id, work_order_id, line_type, product_id, description, 
         quantity, unit_price, total_price, is_warranty)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&line_id)
    .bind(&get_current_tenant_id())
    .bind(&work_order_id)
    .bind(req.line_type.as_str())
    .bind(&req.product_id)
    .bind(&req.description)
    .bind(req.quantity)
    .bind(req.unit_price)
    .bind(total_price)
    .bind(is_warranty_int)
    .execute(&mut *tx)
    .await;

    if let Err(e) = result {
        tracing::error!("Failed to add work order line: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to add work order line"
        }));
    }

    // Update work order totals
    let update_field = match req.line_type {
        WorkOrderLineType::Labor => "labor_total",
        WorkOrderLineType::Part | WorkOrderLineType::Miscellaneous => "parts_total",
    };

    let now = Utc::now().to_rfc3339();
    let query = format!(
        "UPDATE work_orders 
         SET {} = {} + ?, updated_at = ?, sync_version = sync_version + 1
         WHERE id = ? AND tenant_id = ?",
        update_field, update_field
    );

    let result = sqlx::query(&query)
        .bind(total_price)
        .bind(&now)
        .bind(&work_order_id)
        .bind(&get_current_tenant_id())
        .execute(&mut *tx)
        .await;

    if let Err(e) = result {
        tracing::error!("Failed to update work order totals: {:?}", e);
        let _ = tx.rollback().await;
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update work order totals"
        }));
    }

    // Commit transaction
    if let Err(e) = tx.commit().await {
        tracing::error!("Failed to commit transaction: {:?}", e);
        return HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to commit transaction"
        }));
    }

    tracing::info!("Line added successfully to work order: {}", work_order_id);

    match get_work_order_with_lines(pool.get_ref(), &work_order_id).await {
        Ok(work_order) => HttpResponse::Ok().json(work_order),
        Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Line added but failed to fetch work order"
        })),
    }
}


/// PUT /api/work-orders/:id/complete
/// Complete a work order
#[put("/api/work-orders/{id}/complete")]
pub async fn complete_work_order(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let work_order_id = path.into_inner();
    tracing::info!("Completing work order: {}", work_order_id);

    let now = Utc::now().to_rfc3339();

    // Fetch work order to calculate actual total
    let work_order = match get_work_order_by_id(pool.get_ref(), &work_order_id).await {
        Ok(wo) => wo,
        Err(sqlx::Error::RowNotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Work order not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch work order: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch work order"
            }));
        }
    };

    let actual_total = work_order.labor_total + work_order.parts_total;

    let result = sqlx::query(
        "UPDATE work_orders 
         SET status = ?, actual_total = ?, completed_at = ?, updated_at = ?, sync_version = sync_version + 1
         WHERE id = ? AND tenant_id = ?",
    )
    .bind(WorkOrderStatus::Completed.as_str())
    .bind(actual_total)
    .bind(&now)
    .bind(&now)
    .bind(&work_order_id)
    .bind(&get_current_tenant_id())
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            tracing::info!("Work order completed successfully: {}", work_order_id);
            match get_work_order_with_lines(pool.get_ref(), &work_order_id).await {
                Ok(work_order) => HttpResponse::Ok().json(work_order),
                Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Work order completed but failed to fetch"
                })),
            }
        }
        Err(e) => {
            tracing::error!("Failed to complete work order: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to complete work order"
            }))
        }
    }
}

/// GET /api/work-orders/:id
/// Get a work order by ID with lines
#[get("/api/work-orders/{id}")]
pub async fn get_work_order(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let work_order_id = path.into_inner();
    tracing::info!("Fetching work order: {}", work_order_id);

    match get_work_order_with_lines(pool.get_ref(), &work_order_id).await {
        Ok(work_order) => HttpResponse::Ok().json(work_order),
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Work order not found"
        })),
        Err(e) => {
            tracing::error!("Failed to fetch work order: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch work order"
            }))
        }
    }
}

/// PUT /api/work-orders/:id
/// Update a work order
#[put("/api/work-orders/{id}")]
pub async fn update_work_order(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<UpdateWorkOrderRequest>,
) -> impl Responder {
    let work_order_id = path.into_inner();
    tracing::info!("Updating work order: {}", work_order_id);

    let mut updates = Vec::new();
    if req.description.is_some() {
        updates.push("description = ?");
    }
    if req.estimated_total.is_some() {
        updates.push("estimated_total = ?");
    }
    if req.assigned_technician_id.is_some() {
        updates.push("assigned_technician_id = ?");
    }
    if req.status.is_some() {
        updates.push("status = ?");
    }

    if updates.is_empty() {
        match get_work_order_with_lines(pool.get_ref(), &work_order_id).await {
            Ok(work_order) => return HttpResponse::Ok().json(work_order),
            Err(_) => {
                return HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Work order not found"
                }))
            }
        }
    }

    let now = Utc::now().to_rfc3339();
    updates.push("updated_at = ?");
    updates.push("sync_version = sync_version + 1");

    let query_str = format!("UPDATE work_orders SET {} WHERE id = ? AND tenant_id = ?", updates.join(", "));
    let tenant_id = get_current_tenant_id();

    let mut query = sqlx::query(&query_str);
    if let Some(desc) = &req.description {
        query = query.bind(desc);
    }
    if let Some(total) = req.estimated_total {
        query = query.bind(total);
    }
    if let Some(tech_id) = &req.assigned_technician_id {
        query = query.bind(tech_id);
    }
    if let Some(status) = &req.status {
        query = query.bind(status.as_str());
    }
    query = query.bind(&now).bind(&work_order_id).bind(&tenant_id);

    let result = query.execute(pool.get_ref()).await;

    match result {
        Ok(_) => {
            tracing::info!("Work order updated successfully: {}", work_order_id);
            match get_work_order_with_lines(pool.get_ref(), &work_order_id).await {
                Ok(work_order) => HttpResponse::Ok().json(work_order),
                Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": "Work order updated but failed to fetch"
                })),
            }
        }
        Err(e) => {
            tracing::error!("Failed to update work order: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update work order"
            }))
        }
    }
}

/// GET /api/work-orders
/// List work orders with optional filtering
#[get("/api/work-orders")]
pub async fn list_work_orders(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    tracing::info!("Listing work orders");

    let mut sql = "SELECT id, tenant_id, work_order_number, customer_id, vehicle_id, status, description, 
                   estimated_total, actual_total, labor_total, parts_total, created_at, updated_at, 
                   completed_at, invoiced_at, assigned_technician_id, is_warranty, sync_version, store_id 
                   FROM work_orders WHERE tenant_id = ?".to_string();

    let mut bindings: Vec<String> = vec![get_current_tenant_id()];

    if let Some(customer_id) = query.get("customer_id") {
        sql.push_str(" AND customer_id = ?");
        bindings.push(customer_id.clone());
    }
    if let Some(status) = query.get("status") {
        sql.push_str(" AND status = ?");
        bindings.push(status.clone());
    }
    if let Some(store_id) = query.get("store_id") {
        sql.push_str(" AND store_id = ?");
        bindings.push(store_id.clone());
    }

    sql.push_str(" ORDER BY created_at DESC");

    let mut query_builder = sqlx::query_as::<_, WorkOrder>(&sql);
    for binding in bindings {
        query_builder = query_builder.bind(binding);
    }

    let result = query_builder.fetch_all(pool.get_ref()).await;

    match result {
        Ok(work_orders) => {
            let responses: Vec<WorkOrderResponse> = work_orders
                .into_iter()
                .map(WorkOrderResponse::from)
                .collect();
            HttpResponse::Ok().json(responses)
        }
        Err(e) => {
            tracing::error!("Failed to list work orders: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list work orders"
            }))
        }
    }
}

// Helper functions
async fn get_work_order_by_id(pool: &SqlitePool, id: &str) -> Result<WorkOrder, sqlx::Error> {
    sqlx::query_as::<_, WorkOrder>(
        "SELECT id, tenant_id, work_order_number, customer_id, vehicle_id, status, description, 
         estimated_total, actual_total, labor_total, parts_total, created_at, updated_at, 
         completed_at, invoiced_at, assigned_technician_id, is_warranty, sync_version, store_id 
         FROM work_orders 
         WHERE id = ? AND tenant_id = ?",
    )
    .bind(id)
    .bind(&get_current_tenant_id())
    .fetch_one(pool)
    .await
}

async fn get_work_order_with_lines(
    pool: &SqlitePool,
    id: &str,
) -> Result<WorkOrderResponse, sqlx::Error> {
    let work_order = get_work_order_by_id(pool, id).await?;

    let lines = sqlx::query_as::<_, WorkOrderLine>(
        "SELECT id, tenant_id, work_order_id, line_type, product_id, description, quantity, 
         unit_price, total_price, is_warranty 
         FROM work_order_lines 
         WHERE work_order_id = ? AND tenant_id = ?",
    )
    .bind(id)
    .bind(&get_current_tenant_id())
    .fetch_all(pool)
    .await?;

    let mut response = WorkOrderResponse::from(work_order);
    response.lines = lines;

    Ok(response)
}
