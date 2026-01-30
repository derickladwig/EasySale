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
    _pool: web::Data<SqlitePool>,
    _context: web::ReqData<crate::models::UserContext>,
    query: web::Query<ExportQuery>,
) -> ApiResult<HttpResponse> {
    // TODO: Fetch actual performance metrics from database
    // For now, generate mock data
    
    let format = query.format.as_deref().unwrap_or("csv");
    
    match format {
        "csv" => {
            let csv = generate_csv_export(&query);
            Ok(HttpResponse::Ok()
                .content_type("text/csv")
                .insert_header((
                    "Content-Disposition",
                    "attachment; filename=\"performance-metrics.csv\"",
                ))
                .body(csv))
        }
        "json" | _ => {
            let json = generate_json_export(&query);
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

fn generate_csv_export(_query: &ExportQuery) -> String {
    let mut csv = String::from("Timestamp,Metric,Value,Unit\n");
    
    // Mock data
    csv.push_str("2026-01-18 10:00:00,API Response Time (p50),45,ms\n");
    csv.push_str("2026-01-18 10:00:00,API Response Time (p95),120,ms\n");
    csv.push_str("2026-01-18 10:00:00,API Response Time (p99),250,ms\n");
    csv.push_str("2026-01-18 10:00:00,Database Query Time,15,ms\n");
    csv.push_str("2026-01-18 10:00:00,Memory Usage,512,MB\n");
    csv.push_str("2026-01-18 10:00:00,Error Rate,0.5,%\n");
    
    csv
}

fn generate_json_export(query: &ExportQuery) -> serde_json::Value {
    serde_json::json!({
        "export_date": "2026-01-18T10:00:00Z",
        "time_range": {
            "start": query.start_date.as_deref().unwrap_or("2026-01-01"),
            "end": query.end_date.as_deref().unwrap_or("2026-01-18")
        },
        "metrics": [
            {
                "timestamp": "2026-01-18T10:00:00Z",
                "metric": "API Response Time (p50)",
                "value": 45,
                "unit": "ms"
            },
            {
                "timestamp": "2026-01-18T10:00:00Z",
                "metric": "API Response Time (p95)",
                "value": 120,
                "unit": "ms"
            },
            {
                "timestamp": "2026-01-18T10:00:00Z",
                "metric": "API Response Time (p99)",
                "value": 250,
                "unit": "ms"
            },
            {
                "timestamp": "2026-01-18T10:00:00Z",
                "metric": "Database Query Time",
                "value": 15,
                "unit": "ms"
            },
            {
                "timestamp": "2026-01-18T10:00:00Z",
                "metric": "Memory Usage",
                "value": 512,
                "unit": "MB"
            },
            {
                "timestamp": "2026-01-18T10:00:00Z",
                "metric": "Error Rate",
                "value": 0.5,
                "unit": "%"
            }
        ]
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_csv_export() {
        let query = ExportQuery {
            start_date: None,
            end_date: None,
            format: Some("csv".to_string()),
        };
        
        let csv = generate_csv_export(&query);
        assert!(csv.contains("Timestamp,Metric,Value,Unit"));
        assert!(csv.contains("API Response Time"));
    }

    #[test]
    fn test_json_export() {
        let query = ExportQuery {
            start_date: None,
            end_date: None,
            format: Some("json".to_string()),
        };
        
        let json = generate_json_export(&query);
        assert!(json["metrics"].is_array());
        assert_eq!(json["metrics"].as_array().unwrap().len(), 6);
    }
}
