use actix_web::{get, post, web, HttpResponse, Responder};
use sqlx::{Row, SqlitePool, QueryBuilder};
use serde::{Deserialize, Serialize};
use crate::validators::ValidatedDateRange;

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
/// Generate sales report with aggregations and period comparison
#[get("/api/reports/sales")]
pub async fn get_sales_report(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating sales report with period comparison");

    // Validate date inputs
    let date_range = match ValidatedDateRange::new(
        query.start_date.as_deref(),
        query.end_date.as_deref(),
    ) {
        Ok(range) => range,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Invalid date parameters: {}", e)
            }));
        }
    };

    // Build secure parameterized query for current period
    let mut query_builder = QueryBuilder::new(
        "SELECT 
        COALESCE(SUM(total_amount), 0.0) as total_sales,
        COUNT(DISTINCT id) as total_transactions,
        COALESCE(AVG(total_amount), 0.0) as average_transaction,
        COALESCE(SUM(items_count), 0) as total_items_sold
        FROM sales_transactions
        WHERE 1=1"
    );

    if let Some(ref start_date) = date_range.start_date {
        query_builder.push(" AND created_at >= ").push_bind(start_date.to_string());
    }
    if let Some(ref end_date) = date_range.end_date {
        query_builder.push(" AND created_at <= ").push_bind(end_date.to_string());
    }

    let result = query_builder.build_query_as::<SalesSummary>()
        .fetch_one(pool.get_ref())
        .await;

    // Calculate previous period for comparison
    let start_str = date_range.start_date.map(|d| d.format("%Y-%m-%d").to_string());
    let end_str = date_range.end_date.map(|d| d.format("%Y-%m-%d").to_string());
    let (prev_start, prev_end) = calculate_previous_period(
        start_str.as_deref(),
        end_str.as_deref(),
    );

    // Query previous period
    let prev_result = if prev_start.is_some() && prev_end.is_some() {
        let mut prev_query = QueryBuilder::new(
            "SELECT 
            COALESCE(SUM(total_amount), 0.0) as total_sales,
            COUNT(DISTINCT id) as total_transactions,
            COALESCE(AVG(total_amount), 0.0) as average_transaction,
            COALESCE(SUM(items_count), 0) as total_items_sold
            FROM sales_transactions
            WHERE created_at >= "
        );
        prev_query.push_bind(prev_start.clone().unwrap());
        prev_query.push(" AND created_at <= ");
        prev_query.push_bind(prev_end.clone().unwrap());
        
        prev_query.build_query_as::<SalesSummary>()
            .fetch_one(pool.get_ref())
            .await
            .ok()
    } else {
        None
    };

    match result {
        Ok(summary) => {
            // Calculate change percentages
            let changes = if let Some(prev) = prev_result {
                serde_json::json!({
                    "sales_change": calculate_percentage_change(summary.total_sales, prev.total_sales),
                    "transactions_change": calculate_percentage_change(summary.total_transactions as f64, prev.total_transactions as f64),
                    "average_change": calculate_percentage_change(summary.average_transaction, prev.average_transaction),
                    "items_change": calculate_percentage_change(summary.total_items_sold as f64, prev.total_items_sold as f64),
                })
            } else {
                serde_json::json!({
                    "sales_change": 0.0,
                    "transactions_change": 0.0,
                    "average_change": 0.0,
                    "items_change": 0.0,
                })
            };

            HttpResponse::Ok().json(serde_json::json!({
                "summary": summary,
                "changes": changes,
                "previous_period": {
                    "start": prev_start,
                    "end": prev_end,
                },
                "status": "success"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to generate sales report: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate sales report"
            }))
        }
    }
}

/// Calculate the previous period dates based on current period
fn calculate_previous_period(start: Option<&str>, end: Option<&str>) -> (Option<String>, Option<String>) {
    use chrono::{NaiveDate, Duration};
    
    match (start, end) {
        (Some(start_str), Some(end_str)) => {
            let start_date = NaiveDate::parse_from_str(start_str, "%Y-%m-%d").ok();
            let end_date = NaiveDate::parse_from_str(end_str, "%Y-%m-%d").ok();
            
            match (start_date, end_date) {
                (Some(s), Some(e)) => {
                    let duration = e.signed_duration_since(s);
                    let prev_end = s - Duration::days(1);
                    let prev_start = prev_end - duration;
                    
                    (
                        Some(prev_start.format("%Y-%m-%d").to_string()),
                        Some(prev_end.format("%Y-%m-%d").to_string()),
                    )
                }
                _ => (None, None),
            }
        }
        _ => {
            // Default to comparing with previous 30 days
            use chrono::Utc;
            let today = Utc::now().date_naive();
            let thirty_days_ago = today - Duration::days(30);
            let sixty_days_ago = today - Duration::days(60);
            
            (
                Some(sixty_days_ago.format("%Y-%m-%d").to_string()),
                Some((thirty_days_ago - Duration::days(1)).format("%Y-%m-%d").to_string()),
            )
        }
    }
}

/// Calculate percentage change between current and previous values
fn calculate_percentage_change(current: f64, previous: f64) -> f64 {
    if previous == 0.0 {
        if current > 0.0 {
            100.0 // 100% increase from zero
        } else {
            0.0
        }
    } else {
        ((current - previous) / previous) * 100.0
    }
}

/// GET /api/reports/sales/by-employee
/// Generate sales report grouped by employee
#[get("/api/reports/sales/by-employee")]
pub async fn get_sales_by_employee(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating sales by employee report");

    // Validate date inputs
    let date_range = match ValidatedDateRange::new(
        query.start_date.as_deref(),
        query.end_date.as_deref(),
    ) {
        Ok(range) => range,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Invalid date parameters: {}", e)
            }));
        }
    };

    // Build secure parameterized query
    let mut query_builder = QueryBuilder::new(
        "SELECT 
        employee_id,
        COUNT(DISTINCT id) as transaction_count,
        SUM(total_amount) as total_sales,
        AVG(total_amount) as average_transaction
        FROM sales_transactions
        WHERE 1=1"
    );

    if let Some(start_date) = date_range.start_date {
        query_builder.push(" AND created_at >= ").push_bind(start_date.to_string());
    }
    if let Some(end_date) = date_range.end_date {
        query_builder.push(" AND created_at <= ").push_bind(end_date.to_string());
    }

    query_builder.push(" GROUP BY employee_id ORDER BY total_sales DESC");

    let result = query_builder.build()
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

            HttpResponse::Ok().json(serde_json::json!({
                "employees": employees,
                "status": "success"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to generate employee sales report: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate employee sales report"
            }))
        }
    }
}

/// GET /api/reports/sales/by-pricing-tier
/// Generate sales report grouped by customer pricing tier
#[get("/api/reports/sales/by-pricing-tier")]
pub async fn get_sales_by_pricing_tier(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating sales by pricing tier report");

    // Validate date inputs
    let date_range = match ValidatedDateRange::new(
        query.start_date.as_deref(),
        query.end_date.as_deref(),
    ) {
        Ok(range) => range,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Invalid date parameters: {}", e)
            }));
        }
    };

    // Build secure parameterized query
    let mut query_builder = QueryBuilder::new(
        "SELECT 
        c.pricing_tier,
        COUNT(DISTINCT st.id) as transaction_count,
        SUM(st.total_amount) as total_sales,
        AVG(st.total_amount) as average_transaction
        FROM sales_transactions st
        JOIN customers c ON st.customer_id = c.id
        WHERE 1=1"
    );

    if let Some(start_date) = date_range.start_date {
        query_builder.push(" AND st.created_at >= ").push_bind(start_date.to_string());
    }
    if let Some(end_date) = date_range.end_date {
        query_builder.push(" AND st.created_at <= ").push_bind(end_date.to_string());
    }

    query_builder.push(" GROUP BY c.pricing_tier ORDER BY total_sales DESC");

    let result = query_builder.build()
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

            HttpResponse::Ok().json(serde_json::json!({
                "pricing_tiers": tiers,
                "status": "success"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to generate pricing tier sales report: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate pricing tier sales report"
            }))
        }
    }
}

/// GET /api/reports/commissions
/// Generate commission report
#[get("/api/reports/commissions")]
pub async fn get_commission_report(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating commission report");

    // Validate date inputs
    let date_range = match ValidatedDateRange::new(
        query.start_date.as_deref(),
        query.end_date.as_deref(),
    ) {
        Ok(range) => range,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Invalid date parameters: {}", e)
            }));
        }
    };

    // Build secure parameterized query
    let mut query_builder = QueryBuilder::new(
        "SELECT 
        c.employee_id,
        COUNT(DISTINCT c.id) as commission_count,
        SUM(c.amount) as total_commission,
        AVG(c.amount) as average_commission
        FROM commissions c
        WHERE 1=1"
    );

    if let Some(start_date) = date_range.start_date {
        query_builder.push(" AND c.created_at >= ").push_bind(start_date.to_string());
    }
    if let Some(end_date) = date_range.end_date {
        query_builder.push(" AND c.created_at <= ").push_bind(end_date.to_string());
    }

    query_builder.push(" GROUP BY c.employee_id ORDER BY total_commission DESC");

    let result = query_builder.build()
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            let commissions: Vec<serde_json::Value> = rows
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

            HttpResponse::Ok().json(serde_json::json!({
                "commissions": commissions,
                "status": "success"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to generate commission report: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate commission report"
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

    // Validate date inputs
    let date_range = match ValidatedDateRange::new(
        query.start_date.as_deref(),
        query.end_date.as_deref(),
    ) {
        Ok(range) => range,
        Err(_) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid date format or range"
            }));
        }
    };

    let mut query_builder = QueryBuilder::new(
        "SELECT 
            p.category,
            COUNT(DISTINCT st.id) as transaction_count,
            SUM(sli.quantity) as items_sold,
            SUM(sli.subtotal) as total_revenue
        FROM sales_transactions st
        JOIN sales_line_items sli ON st.id = sli.transaction_id
        JOIN products p ON sli.product_id = p.id
        WHERE 1=1"
    );

    if let Some(start_date) = &date_range.start_date {
        query_builder.push(" AND st.created_at >= ");
        query_builder.push_bind(start_date);
    }
    if let Some(end_date) = &date_range.end_date {
        query_builder.push(" AND st.created_at <= ");
        query_builder.push_bind(end_date);
    }

    query_builder.push(" GROUP BY p.category ORDER BY total_revenue DESC");

    let result = query_builder.build().fetch_all(pool.get_ref()).await;

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

/// GET /api/reports/sales/by-tier
/// Sales breakdown by pricing tier
#[get("/api/reports/sales/by-tier")]
pub async fn get_sales_by_tier(
    pool: web::Data<SqlitePool>,
    query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating sales by pricing tier report");

    // Validate date inputs
    let date_range = match ValidatedDateRange::new(
        query.start_date.as_deref(),
        query.end_date.as_deref(),
    ) {
        Ok(range) => range,
        Err(_) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid date format or range"
            }));
        }
    };

    let mut query_builder = QueryBuilder::new(
        "SELECT 
            c.pricing_tier,
            COUNT(DISTINCT st.id) as transaction_count,
            SUM(st.total_amount) as total_sales,
            AVG(st.total_amount) as average_transaction
        FROM sales_transactions st
        JOIN customers c ON st.customer_id = c.id
        WHERE 1=1"
    );

    if let Some(start_date) = &date_range.start_date {
        query_builder.push(" AND st.created_at >= ");
        query_builder.push_bind(start_date);
    }
    if let Some(end_date) = &date_range.end_date {
        query_builder.push(" AND st.created_at <= ");
        query_builder.push_bind(end_date);
    }

    query_builder.push(" GROUP BY c.pricing_tier ORDER BY total_sales DESC");

    let result = query_builder.build().fetch_all(pool.get_ref()).await;

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

    let sql = "SELECT 
        c.id,
        c.name,
        c.email,
        c.pricing_tier,
        c.loyalty_points,
        c.store_credit,
        c.credit_balance,
        COUNT(DISTINCT st.id) as transaction_count,
        COALESCE(SUM(st.total_amount), 0.0) as total_revenue
        FROM customers c
        LEFT JOIN sales_transactions st ON c.id = st.customer_id
        GROUP BY c.id
        ORDER BY total_revenue DESC
        LIMIT 100";

    let result = sqlx::query(sql).fetch_all(pool.get_ref()).await;

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
                        "transaction_count": row.try_get::<i64, _>("transaction_count").unwrap_or(0),
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

    // Validate date inputs
    let date_range = match ValidatedDateRange::new(
        query.start_date.as_deref(),
        query.end_date.as_deref(),
    ) {
        Ok(range) => range,
        Err(_) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid date format or range"
            }));
        }
    };

    let mut query_builder = QueryBuilder::new(
        "SELECT 
            employee_id,
            COUNT(DISTINCT id) as transaction_count,
            SUM(total_amount) as total_sales,
            AVG(total_amount) as average_transaction
        FROM sales_transactions
        WHERE 1=1"
    );

    if let Some(start_date) = &date_range.start_date {
        query_builder.push(" AND created_at >= ");
        query_builder.push_bind(start_date);
    }
    if let Some(end_date) = &date_range.end_date {
        query_builder.push(" AND created_at <= ");
        query_builder.push_bind(end_date);
    }

    query_builder.push(" GROUP BY employee_id ORDER BY total_sales DESC");

    let result = query_builder.build().fetch_all(pool.get_ref()).await;

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
        COALESCE(SUM(CASE WHEN status = 'Active' THEN balance_remaining END), 0.0) as total_outstanding
        FROM layaways";

    let result = sqlx::query(sql).fetch_one(pool.get_ref()).await;

    match result {
        Ok(row) => {
            let report = serde_json::json!({
                "active_count": row.try_get::<i64, _>("active_count").unwrap_or(0),
                "completed_count": row.try_get::<i64, _>("completed_count").unwrap_or(0),
                "cancelled_count": row.try_get::<i64, _>("cancelled_count").unwrap_or(0),
                "total_outstanding": row.try_get::<f64, _>("total_outstanding").unwrap_or(0.0),
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
    _pool: web::Data<SqlitePool>,
    _query: web::Query<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Generating work order report - stub implementation");

    // Stub implementation - work_orders table may not exist
    HttpResponse::Ok().json(serde_json::json!({
        "total_orders": 0,
        "completed_count": 0,
        "in_progress_count": 0,
        "total_revenue": 0.0,
        "message": "Work order reporting not fully implemented"
    }))
}

/// GET /api/reports/promotions
/// Promotion effectiveness reporting
#[get("/api/reports/promotions")]
pub async fn get_promotion_report(
    _pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Generating promotion effectiveness report - stub implementation");

    // Stub implementation - promotions table may not exist
    HttpResponse::Ok().json(serde_json::json!({
        "promotions": [],
        "message": "Promotion reporting not fully implemented"
    }))
}

/// GET /api/reports/dashboard
/// Dashboard metrics - daily sales, active layaways, overdue accounts
#[get("/api/reports/dashboard")]
pub async fn get_dashboard_metrics(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    tracing::info!("Generating dashboard metrics");

    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();

    // Today's sales
    let todays_sales = sqlx::query_as::<_, (f64,)>(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM sales_transactions WHERE DATE(created_at) = DATE(?)"
    )
    .bind(&today)
    .fetch_one(pool.get_ref())
    .await
    .map(|(sales,)| sales)
    .unwrap_or(0.0);

    // Active layaways count
    let active_layaways = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM layaways WHERE status = 'Active'"
    )
    .fetch_one(pool.get_ref())
    .await
    .map(|(count,)| count)
    .unwrap_or(0);

    let dashboard = serde_json::json!({
        "date": today,
        "todays_sales": todays_sales,
        "active_layaways": active_layaways,
    });

    HttpResponse::Ok().json(dashboard)
}

/// POST /api/reports/export
/// Export report data to CSV format
#[post("/api/reports/export")]
pub async fn export_report(
    pool: web::Data<SqlitePool>,
    query: web::Json<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Export report requested");

    // Validate date inputs
    let date_range = match ValidatedDateRange::new(
        query.start_date.as_deref(),
        query.end_date.as_deref(),
    ) {
        Ok(range) => range,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Invalid date parameters: {}", e)
            }));
        }
    };

    // Build query for sales data
    let mut query_builder = sqlx::QueryBuilder::new(
        "SELECT 
            st.id,
            st.created_at,
            st.total_amount,
            st.employee_id,
            c.name as customer_name,
            c.pricing_tier
        FROM sales_transactions st
        LEFT JOIN customers c ON st.customer_id = c.id
        WHERE 1=1"
    );

    if let Some(start_date) = date_range.start_date {
        query_builder.push(" AND st.created_at >= ").push_bind(start_date.to_string());
    }
    if let Some(end_date) = date_range.end_date {
        query_builder.push(" AND st.created_at <= ").push_bind(end_date.to_string());
    }

    query_builder.push(" ORDER BY st.created_at DESC");

    let result = query_builder.build().fetch_all(pool.get_ref()).await;

    match result {
        Ok(rows) => {
            // Generate CSV content
            let mut csv_content = String::from("Transaction ID,Date,Amount,Employee ID,Customer Name,Pricing Tier\n");
            
            for row in rows {
                let id: String = row.try_get("id").unwrap_or_default();
                let created_at: String = row.try_get("created_at").unwrap_or_default();
                let total_amount: f64 = row.try_get("total_amount").unwrap_or(0.0);
                let employee_id: String = row.try_get("employee_id").unwrap_or_default();
                let customer_name: String = row.try_get("customer_name").unwrap_or_default();
                let pricing_tier: String = row.try_get("pricing_tier").unwrap_or_default();
                
                csv_content.push_str(&format!("{},{},{},{},{},{}\n", 
                    id, created_at, total_amount, employee_id, customer_name, pricing_tier));
            }

            HttpResponse::Ok()
                .content_type("text/csv")
                .insert_header(("Content-Disposition", "attachment; filename=\"sales_report.csv\""))
                .body(csv_content)
        }
        Err(e) => {
            tracing::error!("Failed to export report: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to export report data"
            }))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::validators::ValidationError;

    #[test]
    fn test_sql_injection_prevention() {
        // Test that malicious input is properly validated
        let malicious_date = "2024-01-01'; DROP TABLE sales_transactions; --";
        let result = ValidatedDateRange::new(Some(malicious_date), None);
        
        assert!(matches!(result, Err(ValidationError::InvalidDateFormat)));
    }

    #[test]
    fn test_valid_date_range() {
        let result = ValidatedDateRange::new(Some("2024-01-01"), Some("2024-01-31"));
        assert!(result.is_ok());
    }

    #[test]
    fn test_invalid_date_range() {
        let result = ValidatedDateRange::new(Some("2024-01-31"), Some("2024-01-01"));
        assert!(matches!(result, Err(ValidationError::InvalidDateRange)));
    }
}
