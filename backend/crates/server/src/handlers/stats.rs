use actix_web::{get, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::middleware::get_current_tenant_id;

#[derive(Debug, Serialize, Deserialize)]
pub struct DashboardStats {
    pub daily_sales: f64,
    pub transactions: i64,
    pub avg_transaction: f64,
    pub items_sold: i64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Alert {
    pub id: String,
    #[serde(rename = "type")]
    pub alert_type: String,
    pub message: String,
    pub time: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecentTransaction {
    pub id: String,
    pub customer: String,
    pub amount: f64,
    pub items: i64,
    pub time: String,
    pub status: String,
}

/// GET /api/stats/dashboard
/// Get dashboard statistics for today
#[get("/api/stats/dashboard")]
pub async fn get_dashboard_stats(pool: web::Data<SqlitePool>) -> impl Responder {
    let tenant_id = get_current_tenant_id();
    
    // Get today's sales total
    let daily_sales: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(total_amount), 0.0) FROM sales_transactions 
         WHERE DATE(created_at) = DATE('now') AND tenant_id = ?"
    )
    .bind(&tenant_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0.0);
    
    // Get today's transaction count
    let transactions: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sales_transactions 
         WHERE DATE(created_at) = DATE('now') AND tenant_id = ?"
    )
    .bind(&tenant_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);
    
    // Calculate average transaction
    let avg_transaction = if transactions > 0 {
        daily_sales / transactions as f64
    } else {
        0.0
    };
    
    // Get items sold today (sum of quantities from line items)
    let items_sold: i64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(stl.quantity), 0) 
         FROM sales_transaction_lines stl
         JOIN sales_transactions st ON stl.transaction_id = st.id
         WHERE DATE(st.created_at) = DATE('now') AND st.tenant_id = ?"
    )
    .bind(&tenant_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);
    
    let stats = DashboardStats {
        daily_sales,
        transactions,
        avg_transaction,
        items_sold,
    };
    
    HttpResponse::Ok().json(stats)
}

/// GET /api/alerts/recent
/// Get recent alerts (low stock, out of stock, etc.)
#[get("/api/alerts/recent")]
pub async fn get_recent_alerts(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let tenant_id = get_current_tenant_id();
    let limit: i64 = query.get("limit").and_then(|l| l.parse().ok()).unwrap_or(5);
    
    let mut alerts: Vec<Alert> = Vec::new();
    
    // Get low stock alerts
    let low_stock_items: Vec<(String, String, i64, i64)> = sqlx::query_as(
        "SELECT id, name, quantity, COALESCE(min_quantity, 10) as min_qty
         FROM products 
         WHERE quantity < COALESCE(min_quantity, 10) 
         AND quantity > 0
         AND tenant_id = ?
         ORDER BY quantity ASC
         LIMIT ?"
    )
    .bind(&tenant_id)
    .bind(limit)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();
    
    for (id, name, quantity, _min_qty) in low_stock_items {
        alerts.push(Alert {
            id: format!("low-stock-{}", id),
            alert_type: "warning".to_string(),
            message: format!("Low stock: {} ({} remaining)", name, quantity),
            time: "Recently".to_string(),
        });
    }
    
    // Get out of stock alerts
    let out_of_stock_items: Vec<(String, String)> = sqlx::query_as(
        "SELECT id, name
         FROM products 
         WHERE quantity = 0
         AND tenant_id = ?
         ORDER BY updated_at DESC
         LIMIT ?"
    )
    .bind(&tenant_id)
    .bind(limit)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();
    
    for (id, name) in out_of_stock_items {
        alerts.push(Alert {
            id: format!("out-of-stock-{}", id),
            alert_type: "error".to_string(),
            message: format!("Out of stock: {}", name),
            time: "Recently".to_string(),
        });
    }
    
    // Limit total alerts
    alerts.truncate(limit as usize);
    
    HttpResponse::Ok().json(alerts)
}

/// GET /api/transactions/recent
/// Get recent transactions
#[get("/api/transactions/recent")]
pub async fn get_recent_transactions(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let tenant_id = get_current_tenant_id();
    let limit: i64 = query.get("limit").and_then(|l| l.parse().ok()).unwrap_or(10);
    
    let transactions: Vec<(String, Option<String>, f64, String, String)> = sqlx::query_as(
        "SELECT 
            st.id,
            COALESCE(c.name, 'Walk-in') as customer,
            st.total_amount,
            st.created_at,
            COALESCE(st.status, 'completed') as status
         FROM sales_transactions st
         LEFT JOIN customers c ON st.customer_id = c.id
         WHERE st.tenant_id = ?
         ORDER BY st.created_at DESC
         LIMIT ?"
    )
    .bind(&tenant_id)
    .bind(limit)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();
    
    let mut result = Vec::new();
    
    for (id, customer, amount, created_at, status) in transactions {
        // Get item count for this transaction
        let items: i64 = sqlx::query_scalar(
            "SELECT COALESCE(SUM(quantity), 0) FROM sales_transaction_lines WHERE transaction_id = ?"
        )
        .bind(&id)
        .fetch_one(pool.get_ref())
        .await
        .unwrap_or(0);
        
        // Calculate time ago
        let time = format_time_ago(&created_at);
        
        result.push(RecentTransaction {
            id: id.clone(),
            customer: customer.unwrap_or_else(|| "Walk-in".to_string()),
            amount,
            items,
            time,
            status,
        });
    }
    
    HttpResponse::Ok().json(result)
}

/// Helper function to format time ago
fn format_time_ago(timestamp: &str) -> String {
    use chrono::{DateTime, Utc};
    
    let now = Utc::now();
    
    // Try to parse the timestamp
    let parsed = DateTime::parse_from_rfc3339(timestamp)
        .map(|dt| dt.with_timezone(&Utc))
        .or_else(|_| {
            // Try parsing as naive datetime (SQLite format)
            chrono::NaiveDateTime::parse_from_str(timestamp, "%Y-%m-%d %H:%M:%S")
                .map(|dt| dt.and_utc())
        });
    
    match parsed {
        Ok(dt) => {
            let duration = now.signed_duration_since(dt);
            let seconds = duration.num_seconds();
            
            if seconds < 0 {
                return "In the future".to_string();
            }
            
            if seconds < 60 {
                return "Just now".to_string();
            }
            
            let minutes = seconds / 60;
            if minutes < 60 {
                return if minutes == 1 {
                    "1 minute ago".to_string()
                } else {
                    format!("{} minutes ago", minutes)
                };
            }
            
            let hours = minutes / 60;
            if hours < 24 {
                return if hours == 1 {
                    "1 hour ago".to_string()
                } else {
                    format!("{} hours ago", hours)
                };
            }
            
            let days = hours / 24;
            if days < 30 {
                return if days == 1 {
                    "Yesterday".to_string()
                } else {
                    format!("{} days ago", days)
                };
            }
            
            let months = days / 30;
            if months < 12 {
                return if months == 1 {
                    "1 month ago".to_string()
                } else {
                    format!("{} months ago", months)
                };
            }
            
            let years = months / 12;
            if years == 1 {
                "1 year ago".to_string()
            } else {
                format!("{} years ago", years)
            }
        }
        Err(_) => "Unknown".to_string(),
    }
}
