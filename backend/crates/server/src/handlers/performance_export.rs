use actix_web::{web, HttpResponse};
use serde::Deserialize;
use sqlx::SqlitePool;

use crate::models::ApiResult;

#[derive(Debug, Deserialize)]
pub struct ExportQuery {
    pub start_date: Option<String>,
    pub end_date: Option<String>,
    pub format: Option<String>, // "csv" or "json"
}

/// GET /api/performance/export
/// Export performance metrics to CSV
pub async fn export_performance_metrics(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<crate::models::UserContext>,
    query: web::Query<ExportQuery>,
) -> ApiResult<HttpResponse> {
    let tenant_id = &context.tenant_id;
    let start_date = query.start_date.as_deref().unwrap_or("2026-01-01");
    let end_date = query.end_date.as_deref().unwrap_or("2099-12-31");
    
    // Fetch real metrics from database
    let metrics = fetch_performance_metrics(pool.get_ref(), tenant_id, start_date, end_date).await;
    
    let format = query.format.as_deref().unwrap_or("csv");
    
    match format {
        "csv" => {
            let csv = generate_csv_export(&metrics, start_date, end_date);
            Ok(HttpResponse::Ok()
                .content_type("text/csv")
                .insert_header((
                    "Content-Disposition",
                    "attachment; filename=\"performance-metrics.csv\"",
                ))
                .body(csv))
        }
        "json" | _ => {
            let json = generate_json_export(&metrics, start_date, end_date);
            Ok(HttpResponse::Ok()
                .content_type("application/json")
                .insert_header((
                    "Content-Disposition",
                    "attachment; filename=\"performance-metrics.json\"",
                ))
                .json(json))
        }
    }
}

#[derive(Debug)]
struct PerformanceMetric {
    timestamp: String,
    metric_name: String,
    value: f64,
    unit: String,
}

async fn fetch_performance_metrics(
    pool: &SqlitePool,
    tenant_id: &str,
    start_date: &str,
    end_date: &str,
) -> Vec<PerformanceMetric> {
    let mut metrics = Vec::new();
    
    // Get transaction count per day
    if let Ok(rows) = sqlx::query_as::<_, (String, i64)>(
        "SELECT DATE(created_at) as date, COUNT(*) as count 
         FROM audit_log 
         WHERE tenant_id = ? AND created_at >= ? AND created_at <= ?
         GROUP BY DATE(created_at)
         ORDER BY date DESC
         LIMIT 30"
    )
    .bind(tenant_id)
    .bind(start_date)
    .bind(end_date)
    .fetch_all(pool)
    .await
    {
        for (date, count) in rows {
            metrics.push(PerformanceMetric {
                timestamp: format!("{}T00:00:00Z", date),
                metric_name: "Daily Transactions".to_string(),
                value: count as f64,
                unit: "count".to_string(),
            });
        }
    }
    
    // Get sync queue stats
    if let Ok(row) = sqlx::query_as::<_, (i64, i64, i64)>(
        "SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
         FROM sync_queue 
         WHERE tenant_id = ? AND created_at >= ? AND created_at <= ?"
    )
    .bind(tenant_id)
    .bind(start_date)
    .bind(end_date)
    .fetch_one(pool)
    .await
    {
        let (total, completed, failed) = row;
        let now = chrono::Utc::now().to_rfc3339();
        
        metrics.push(PerformanceMetric {
            timestamp: now.clone(),
            metric_name: "Sync Queue Total".to_string(),
            value: total as f64,
            unit: "count".to_string(),
        });
        
        metrics.push(PerformanceMetric {
            timestamp: now.clone(),
            metric_name: "Sync Queue Completed".to_string(),
            value: completed as f64,
            unit: "count".to_string(),
        });
        
        metrics.push(PerformanceMetric {
            timestamp: now.clone(),
            metric_name: "Sync Queue Failed".to_string(),
            value: failed as f64,
            unit: "count".to_string(),
        });
        
        if total > 0 {
            let success_rate = (completed as f64 / total as f64) * 100.0;
            metrics.push(PerformanceMetric {
                timestamp: now,
                metric_name: "Sync Success Rate".to_string(),
                value: success_rate,
                unit: "%".to_string(),
            });
        }
    }
    
    // Get product count
    if let Ok(count) = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM products WHERE tenant_id = ? AND is_active = 1"
    )
    .bind(tenant_id)
    .fetch_one(pool)
    .await
    {
        metrics.push(PerformanceMetric {
            timestamp: chrono::Utc::now().to_rfc3339(),
            metric_name: "Active Products".to_string(),
            value: count as f64,
            unit: "count".to_string(),
        });
    }
    
    // Get customer count
    if let Ok(count) = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM customers WHERE tenant_id = ? AND deleted_at IS NULL"
    )
    .bind(tenant_id)
    .fetch_one(pool)
    .await
    {
        metrics.push(PerformanceMetric {
            timestamp: chrono::Utc::now().to_rfc3339(),
            metric_name: "Active Customers".to_string(),
            value: count as f64,
            unit: "count".to_string(),
        });
    }
    
    // If no metrics found, return some basic system info
    if metrics.is_empty() {
        let now = chrono::Utc::now().to_rfc3339();
        metrics.push(PerformanceMetric {
            timestamp: now,
            metric_name: "System Status".to_string(),
            value: 1.0,
            unit: "healthy".to_string(),
        });
    }
    
    metrics
}

fn generate_csv_export(metrics: &[PerformanceMetric], start_date: &str, end_date: &str) -> String {
    let mut csv = String::from("Timestamp,Metric,Value,Unit\n");
    
    if metrics.is_empty() {
        csv.push_str(&format!("{},No Data Available,0,N/A\n", chrono::Utc::now().to_rfc3339()));
    } else {
        for metric in metrics {
            csv.push_str(&format!(
                "{},{},{},{}\n",
                metric.timestamp, metric.metric_name, metric.value, metric.unit
            ));
        }
    }
    
    // Add metadata
    csv.push_str(&format!("\n# Export Date: {}\n", chrono::Utc::now().to_rfc3339()));
    csv.push_str(&format!("# Date Range: {} to {}\n", start_date, end_date));
    
    csv
}

fn generate_json_export(metrics: &[PerformanceMetric], start_date: &str, end_date: &str) -> serde_json::Value {
    let metrics_json: Vec<serde_json::Value> = metrics
        .iter()
        .map(|m| {
            serde_json::json!({
                "timestamp": m.timestamp,
                "metric": m.metric_name,
                "value": m.value,
                "unit": m.unit
            })
        })
        .collect();
    
    serde_json::json!({
        "export_date": chrono::Utc::now().to_rfc3339(),
        "time_range": {
            "start": start_date,
            "end": end_date
        },
        "metrics": metrics_json,
        "total_metrics": metrics.len()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_csv_export_with_metrics() {
        let metrics = vec![
            PerformanceMetric {
                timestamp: "2026-01-18T10:00:00Z".to_string(),
                metric_name: "Daily Transactions".to_string(),
                value: 100.0,
                unit: "count".to_string(),
            },
            PerformanceMetric {
                timestamp: "2026-01-18T10:00:00Z".to_string(),
                metric_name: "Sync Success Rate".to_string(),
                value: 95.5,
                unit: "%".to_string(),
            },
        ];
        
        let csv = generate_csv_export(&metrics, "2026-01-01", "2026-01-18");
        assert!(csv.contains("Timestamp,Metric,Value,Unit"));
        assert!(csv.contains("Daily Transactions"));
        assert!(csv.contains("Sync Success Rate"));
    }

    #[test]
    fn test_csv_export_empty() {
        let metrics: Vec<PerformanceMetric> = vec![];
        let csv = generate_csv_export(&metrics, "2026-01-01", "2026-01-18");
        assert!(csv.contains("No Data Available"));
    }

    #[test]
    fn test_json_export_with_metrics() {
        let metrics = vec![
            PerformanceMetric {
                timestamp: "2026-01-18T10:00:00Z".to_string(),
                metric_name: "Active Products".to_string(),
                value: 500.0,
                unit: "count".to_string(),
            },
        ];
        
        let json = generate_json_export(&metrics, "2026-01-01", "2026-01-18");
        assert!(json["metrics"].is_array());
        assert_eq!(json["metrics"].as_array().unwrap().len(), 1);
        assert_eq!(json["total_metrics"], 1);
    }

    #[test]
    fn test_json_export_empty() {
        let metrics: Vec<PerformanceMetric> = vec![];
        let json = generate_json_export(&metrics, "2026-01-01", "2026-01-18");
        assert!(json["metrics"].is_array());
        assert_eq!(json["total_metrics"], 0);
    }
}
