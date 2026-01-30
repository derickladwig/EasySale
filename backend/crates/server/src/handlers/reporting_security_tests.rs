use actix_web::{get, post, web, HttpResponse, Responder};
use sqlx::{Row, SqlitePool, QueryBuilder, Sqlite};
use serde::{Deserialize, Serialize};
use crate::security::sql_allowlist;
use crate::validators::{ValidatedDateRange, ValidationError};

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
        COALESCE(SUM(total_amount), 0.0) as total_sales,
        COUNT(DISTINCT id) as total_transactions,
        COALESCE(AVG(total_amount), 0.0) as average_transaction,
        COALESCE(SUM(items_count), 0) as total_items_sold
        FROM sales_transactions
        WHERE 1=1"
    );

    if let Some(start_date) = date_range.start_date {
        query_builder.push(" AND created_at >= ").push_bind(start_date.to_string());
    }
    if let Some(end_date) = date_range.end_date {
        query_builder.push(" AND created_at <= ").push_bind(end_date.to_string());
    }

    let result = query_builder.build_query_as::<SalesSummary>()
        .fetch_one(pool.get_ref())
        .await;

    match result {
        Ok(summary) => {
            HttpResponse::Ok().json(serde_json::json!({
                "summary": summary,
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

/// POST /api/reports/export
/// Export report data (feature-gated)
#[post("/api/reports/export")]
pub async fn export_report(
    pool: web::Data<SqlitePool>,
    query: web::Json<SalesReportParams>,
) -> impl Responder {
    tracing::info!("Export report requested");

    // Feature flag check - replace stub with proper implementation
    HttpResponse::NotImplemented().json(serde_json::json!({
        "error": "Feature not available",
        "code": "FEATURE_DISABLED",
        "message": "Report export functionality is not enabled in this build"
    }))
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
