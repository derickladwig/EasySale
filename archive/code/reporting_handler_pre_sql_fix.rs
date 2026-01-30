use actix_web::{get, post, web, HttpResponse, Responder};
use sqlx::{Row, SqlitePool};
use serde::{Deserialize, Serialize};
use crate::security::sql_allowlist;

#[derive(Debug, Serialize, Deserialize)]
pub struct SalesReportParams {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub category: Option<String>,
    pub employee_id: Option<String>,
    pub pricing_tier: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, sqlx::FromRow)]
pub struct SalesSummary {
    pub total_sales: f64,
    pub total_transactions: i64,
    pub average_transaction: f64,
    pub total_items_sold: i64,
}

/// GET /api/reports/sales
/// Generate sales report with aggregations
#[get("/api/reports/sales")]
pub async fn get_sales_report(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating sales report");

    // Use parameterized queries to prevent SQL injection
    let mut sql = "SELECT 
        COALESCE(SUM(total_amount), 0.0) as total_sales,
        COUNT(DISTINCT id) as total_transactions,
        COALESCE(AVG(total_amount), 0.0) as average_transaction,
        COALESCE(SUM(items_count), 0) as total_items_sold
        FROM sales_transactions
        WHERE 1=1".to_string();
    
    let mut query_builder = sqlx::query_as::<_, SalesSummary>(&sql);

    if let Some(start_date) = &query.start_date {
        sql.push_str(" AND created_at >= ?");
        query_builder = sqlx::query_as::<_, SalesSummary>(&sql).bind(start_date);
    }
    if let Some(end_date) = &query.end_date {
        sql.push_str(" AND created_at <= ?");
        query_builder = sqlx::query_as::<_, SalesSummary>(&sql).bind(end_date);
    }
    if let Some(employee_id) = &query.employee_id {
        sql.push_str(" AND employee_id = ?");
        query_builder = sqlx::query_as::<_, SalesSummary>(&sql).bind(employee_id);
    }

    let result = query_builder
        .fetch_one(pool.get_ref())
        .await;

    match result {
        Ok(summary) => {
            tracing::info!("Sales report generated successfully");
            HttpResponse::Ok().json(summary)
        }
        Err(e) => {
            tracing::error!("Failed to generate sales report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate sales report"
            }))
        }
    }
}

/// GET /api/reports/sales/by-category
/// Sales breakdown by category
#[get("/api/reports/sales/by-category")]
pub async fn get_sales_by_category(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating sales by category report");

    // Use parameterized queries to prevent SQL injection
    let mut sql = "SELECT 
        p.category,
        COUNT(DISTINCT st.id) as transaction_count,
        SUM(sli.quantity) as items_sold,
        SUM(sli.subtotal) as total_revenue
        FROM sales_transactions st
        JOIN sales_line_items sli ON st.id = sli.transaction_id
        JOIN products p ON sli.product_id = p.id
        WHERE 1=1".to_string();
    
    let mut query_builder = sqlx::query(&sql);

    if let Some(start_date) = &query.start_date {
        sql.push_str(" AND st.created_at >= ?");
        query_builder = sqlx::query(&sql).bind(start_date);
    }
    if let Some(end_date) = &query.end_date {
        sql.push_str(" AND st.created_at <= ?");
        query_builder = sqlx::query(&sql).bind(end_date);
    }

    sql.push_str(" GROUP BY p.category ORDER BY total_revenue DESC");
    query_builder = sqlx::query(&sql);

    let result = query_builder
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            let categories: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "category": row.try_get::<String, _>("category").unwrap_or_default(),
                        "transaction_count": row.try_get::<i64, _>("transaction_count").unwrap_or(0),
                        "items_sold": row.try_get::<i64, _>("items_sold").unwrap_or(0),
                        "total_revenue": row.try_get::<f64, _>("total_revenue").unwrap_or(0.0),
                    })
                })
                .collect();

            HttpResponse::Ok().json(categories)
        }
        Err(e) => {
            tracing::error!("Failed to generate category report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate category report"
            }))
        }
    }
}

/// GET /api/reports/sales/by-employee
/// Sales breakdown by employee
#[get("/api/reports/sales/by-employee")]
pub async fn get_sales_by_employee(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating sales by employee report");

    let mut sql = "SELECT 
        employee_id,
        COUNT(DISTINCT id) as transaction_count,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as average_transaction
        FROM sales_transactions
        WHERE 1=1".to_string();

    if let Some(start_date) = &query.start_date {
        sql.push_str(&format!(" AND created_at >= '{}'", start_date));
    }
    if let Some(end_date) = &query.end_date {
        sql.push_str(&format!(" AND created_at <= '{}'", end_date));
    }

    sql.push_str(" GROUP BY employee_id ORDER BY total_sales DESC");

    let result = sqlx::query(&sql)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            let employees: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "employee_id": row.try_get::<String, _>("employee_id").unwrap_or_default(),
                        "transaction_count": row.try_get::<i64, _>("transaction_count").unwrap_or(0),
                        "total_sales": row.try_get::<f64, _>("total_sales").unwrap_or(0.0),
                        "average_transaction": row.try_get::<f64, _>("average_transaction").unwrap_or(0.0),
                    })
                })
                .collect();

            HttpResponse::Ok().json(employees)
        }
        Err(e) => {
            tracing::error!("Failed to generate employee report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate employee report"
            }))
        }
    }
}

/// GET /api/reports/sales/by-tier
/// Sales breakdown by pricing tier
#[get("/api/reports/sales/by-tier")]
pub async fn get_sales_by_tier(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating sales by pricing tier report");

    let mut sql = "SELECT 
        c.pricing_tier,
        COUNT(DISTINCT st.id) as transaction_count,
        SUM(st.total_amount) as total_sales,
        AVG(st.total_amount) as average_transaction
        FROM sales_transactions st
        JOIN customers c ON st.customer_id = c.id
        WHERE 1=1".to_string();

    if let Some(start_date) = &query.start_date {
        sql.push_str(&format!(" AND st.created_at >= '{}'", start_date));
    }
    if let Some(end_date) = &query.end_date {
        sql.push_str(&format!(" AND st.created_at <= '{}'", end_date));
    }

    sql.push_str(" GROUP BY c.pricing_tier ORDER BY total_sales DESC");

    let result = sqlx::query(&sql)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            let tiers: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "pricing_tier": row.try_get::<String, _>("pricing_tier").unwrap_or_default(),
                        "transaction_count": row.try_get::<i64, _>("transaction_count").unwrap_or(0),
                        "total_sales": row.try_get::<f64, _>("total_sales").unwrap_or(0.0),
                        "average_transaction": row.try_get::<f64, _>("average_transaction").unwrap_or(0.0),
                    })
                })
                .collect();

            HttpResponse::Ok().json(tiers)
        }
        Err(e) => {
            tracing::error!("Failed to generate tier report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate tier report"
            }))
        }
    }
}


/// GET /api/reports/customers
/// Customer reporting - rank by revenue, loyalty, credit status
#[get("/api/reports/customers")]
pub async fn get_customer_report(
    pool: web::Data<SqlitePool>,
    _query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating customer report");

    // Top customers by revenue (from work orders and layaways)
    let sql = "SELECT 
        c.id,
        c.name,
        c.email,
        c.pricing_tier,
        c.loyalty_points,
        c.store_credit,
        c.credit_balance,
        COUNT(DISTINCT wo.id) as work_order_count,
        COALESCE(SUM(wo.actual_total), 0.0) as total_revenue
        FROM customers c
        LEFT JOIN work_orders wo ON c.id = wo.customer_id
        GROUP BY c.id
        ORDER BY total_revenue DESC
        LIMIT 100";

    let result = sqlx::query(sql)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            let customers: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.try_get::<String, _>("id").unwrap_or_default(),
                        "name": row.try_get::<String, _>("name").unwrap_or_default(),
                        "email": row.try_get::<String, _>("email").unwrap_or_default(),
                        "pricing_tier": row.try_get::<String, _>("pricing_tier").unwrap_or_default(),
                        "loyalty_points": row.try_get::<i32, _>("loyalty_points").unwrap_or(0),
                        "store_credit": row.try_get::<f64, _>("store_credit").unwrap_or(0.0),
                        "credit_balance": row.try_get::<f64, _>("credit_balance").unwrap_or(0.0),
                        "work_order_count": row.try_get::<i64, _>("work_order_count").unwrap_or(0),
                        "total_revenue": row.try_get::<f64, _>("total_revenue").unwrap_or(0.0),
                    })
                })
                .collect();

            HttpResponse::Ok().json(customers)
        }
        Err(e) => {
            tracing::error!("Failed to generate customer report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate customer report"
            }))
        }
    }
}

/// GET /api/reports/employees
/// Employee performance reporting
#[get("/api/reports/employees")]
pub async fn get_employee_report(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating employee performance report");

    let mut sql = "SELECT 
        c.employee_id,
        COUNT(DISTINCT c.id) as commission_count,
        SUM(c.amount) as total_commission,
        AVG(c.amount) as average_commission
        FROM commissions c
        WHERE 1=1".to_string();

    if let Some(start_date) = &query.start_date {
        sql.push_str(&format!(" AND c.created_at >= '{}'", start_date));
    }
    if let Some(end_date) = &query.end_date {
        sql.push_str(&format!(" AND c.created_at <= '{}'", end_date));
    }

    sql.push_str(" GROUP BY c.employee_id ORDER BY total_commission DESC");

    let result = sqlx::query(&sql)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            let employees: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "employee_id": row.try_get::<String, _>("employee_id").unwrap_or_default(),
                        "commission_count": row.try_get::<i64, _>("commission_count").unwrap_or(0),
                        "total_commission": row.try_get::<f64, _>("total_commission").unwrap_or(0.0),
                        "average_commission": row.try_get::<f64, _>("average_commission").unwrap_or(0.0),
                    })
                })
                .collect();

            HttpResponse::Ok().json(employees)
        }
        Err(e) => {
            tracing::error!("Failed to generate employee report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate employee report"
            }))
        }
    }
}

/// GET /api/reports/layaways
/// Layaway reporting
#[get("/api/reports/layaways")]
pub async fn get_layaway_report(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Generating layaway report");

    let sql = "SELECT 
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_count,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_count,
        COUNT(CASE WHEN status = 'Active' AND due_date < datetime('now') THEN 1 END) as overdue_count,
        COALESCE(SUM(CASE WHEN status = 'Active' THEN balance_remaining END), 0.0) as total_outstanding,
        COALESCE(AVG(CASE WHEN status = 'Completed' THEN 
            (julianday(updated_at) - julianday(created_at)) END), 0.0) as avg_days_to_complete
        FROM layaways";

    let result = sqlx::query(sql)
        .fetch_one(pool.get_ref())
        .await;

    match result {
        Ok(row) => {
            let report = serde_json::json!({
                "active_count": row.try_get::<i64, _>("active_count").unwrap_or(0),
                "completed_count": row.try_get::<i64, _>("completed_count").unwrap_or(0),
                "cancelled_count": row.try_get::<i64, _>("cancelled_count").unwrap_or(0),
                "overdue_count": row.try_get::<i64, _>("overdue_count").unwrap_or(0),
                "total_outstanding": row.try_get::<f64, _>("total_outstanding").unwrap_or(0.0),
                "avg_days_to_complete": row.try_get::<f64, _>("avg_days_to_complete").unwrap_or(0.0),
            });

            HttpResponse::Ok().json(report)
        }
        Err(e) => {
            tracing::error!("Failed to generate layaway report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate layaway report"
            }))
        }
    }
}

/// GET /api/reports/work-orders
/// Work order reporting
#[get("/api/reports/work-orders")]
pub async fn get_work_order_report(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating work order report");

    let mut sql = "SELECT 
        COUNT(*) as total_orders,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'InProgress' THEN 1 END) as in_progress_count,
        COALESCE(SUM(labor_total), 0.0) as total_labor_revenue,
        COALESCE(SUM(parts_total), 0.0) as total_parts_revenue,
        COALESCE(SUM(actual_total), 0.0) as total_revenue,
        COALESCE(AVG(CASE WHEN status = 'Completed' THEN 
            (julianday(updated_at) - julianday(created_at)) END), 0.0) as avg_completion_days
        FROM work_orders
        WHERE 1=1".to_string();

    if let Some(start_date) = &query.start_date {
        sql.push_str(&format!(" AND created_at >= '{}'", start_date));
    }
    if let Some(end_date) = &query.end_date {
        sql.push_str(&format!(" AND created_at <= '{}'", end_date));
    }

    let result = sqlx::query(&sql)
        .fetch_one(pool.get_ref())
        .await;

    match result {
        Ok(row) => {
            let report = serde_json::json!({
                "total_orders": row.try_get::<i64, _>("total_orders").unwrap_or(0),
                "completed_count": row.try_get::<i64, _>("completed_count").unwrap_or(0),
                "in_progress_count": row.try_get::<i64, _>("in_progress_count").unwrap_or(0),
                "total_labor_revenue": row.try_get::<f64, _>("total_labor_revenue").unwrap_or(0.0),
                "total_parts_revenue": row.try_get::<f64, _>("total_parts_revenue").unwrap_or(0.0),
                "total_revenue": row.try_get::<f64, _>("total_revenue").unwrap_or(0.0),
                "avg_completion_days": row.try_get::<f64, _>("avg_completion_days").unwrap_or(0.0),
            });

            HttpResponse::Ok().json(report)
        }
        Err(e) => {
            tracing::error!("Failed to generate work order report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate work order report"
            }))
        }
    }
}

/// GET /api/reports/promotions
/// Promotion effectiveness reporting
#[get("/api/reports/promotions")]
pub async fn get_promotion_report(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Generating promotion effectiveness report");

    let sql = "SELECT 
        p.id,
        p.name,
        p.promotion_type,
        p.discount_value,
        COUNT(pu.id) as usage_count,
        COALESCE(SUM(pu.discount_amount), 0.0) as total_discount_given,
        COALESCE(SUM(pu.items_affected), 0) as total_items_affected
        FROM promotions p
        LEFT JOIN promotion_usage pu ON p.id = pu.promotion_id
        GROUP BY p.id
        ORDER BY total_discount_given DESC";

    let result = sqlx::query(sql)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            let promotions: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    serde_json::json!({
                        "id": row.try_get::<String, _>("id").unwrap_or_default(),
                        "name": row.try_get::<String, _>("name").unwrap_or_default(),
                        "promotion_type": row.try_get::<String, _>("promotion_type").unwrap_or_default(),
                        "discount_value": row.try_get::<f64, _>("discount_value").unwrap_or(0.0),
                        "usage_count": row.try_get::<i64, _>("usage_count").unwrap_or(0),
                        "total_discount_given": row.try_get::<f64, _>("total_discount_given").unwrap_or(0.0),
                        "total_items_affected": row.try_get::<i64, _>("total_items_affected").unwrap_or(0),
                    })
                })
                .collect();

            HttpResponse::Ok().json(promotions)
        }
        Err(e) => {
            tracing::error!("Failed to generate promotion report: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate promotion report"
            }))
        }
    }
}

/// GET /api/reports/dashboard
/// Dashboard metrics - daily sales, active layaways, overdue accounts, top products
#[get("/api/reports/dashboard")]
pub async fn get_dashboard_metrics(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Generating dashboard metrics");

    // Get today's date
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    // Active layaways count
    let active_layaways = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM layaways WHERE status = 'Active'"
    )
    .fetch_one(pool.get_ref())
    .await
    .map(|(count,)| count)
    .unwrap_or(0);

    // Overdue accounts count
    let overdue_accounts = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM credit_accounts WHERE due_date < ? AND balance > 0"
    )
    .bind(&today)
    .fetch_one(pool.get_ref())
    .await
    .map(|(count,)| count)
    .unwrap_or(0);

    // Today's work orders
    let todays_work_orders = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM work_orders WHERE DATE(created_at) = DATE(?)"
    )
    .bind(&today)
    .fetch_one(pool.get_ref())
    .await
    .map(|(count,)| count)
    .unwrap_or(0);

    // Today's revenue from completed work orders
    let todays_revenue = sqlx::query_as::<_, (f64,)>(
        "SELECT COALESCE(SUM(actual_total), 0.0) FROM work_orders 
         WHERE DATE(created_at) = DATE(?) AND status = 'Completed'"
    )
    .bind(&today)
    .fetch_one(pool.get_ref())
    .await
    .map(|(revenue,)| revenue)
    .unwrap_or(0.0);

    let dashboard = serde_json::json!({
        "date": today,
        "todays_revenue": todays_revenue,
        "todays_work_orders": todays_work_orders,
        "active_layaways": active_layaways,
        "overdue_accounts": overdue_accounts,
    });

    HttpResponse::Ok().json(dashboard)
}

/// POST /api/reports/export
/// Export report to CSV or PDF
#[post("/api/reports/export")]
pub async fn export_report(
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let report_type = req.get("report_type")
        .and_then(|v| v.as_str())
        .unwrap_or("sales");
    
    let format = req.get("format")
        .and_then(|v| v.as_str())
        .unwrap_or("csv");

    tracing::info!("Exporting {} report as {}", report_type, format);

    // TODO: Implement actual export logic
    // For now, return a placeholder response
    HttpResponse::Ok().json(serde_json::json!({
        "message": "Export functionality coming soon",
        "report_type": report_type,
        "format": format
    }))
}
