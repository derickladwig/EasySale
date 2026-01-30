use actix_web::{get, post, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::services::audit_logger::AuditLogger;

/// POST /api/audit/payment
/// Log a payment audit event
#[post("/api/audit/payment")]
pub async fn log_payment(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let _tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let user_id = match req.get("user_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "user_id is required"
            }));
        }
    };

    let payment_id = match req.get("payment_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "payment_id is required"
            }));
        }
    };

    let amount = match req.get("amount").and_then(|v| v.as_f64()) {
        Some(amt) => amt,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "amount is required"
            }));
        }
    };

    let payment_method = req
        .get("payment_method")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    let store_id = req
        .get("store_id")
        .and_then(|v| v.as_str())
        .unwrap_or("default");

    let is_offline = req
        .get("is_offline")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    tracing::info!(
        "Logging payment audit: {} - ${:.2}",
        payment_id,
        amount
    );

    let logger = AuditLogger::new(pool.get_ref().clone());

    let amount_str = amount.to_string();

    match logger
        .log_payment(
            "payment",
            payment_id,
            &amount_str,
            payment_method,
            Some(user_id),
            None,
            is_offline,
            store_id,
        )
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Payment audit logged successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to log payment audit: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to log payment audit: {}", e)
            }))
        }
    }
}

/// POST /api/audit/commission
/// Log a commission audit event
#[post("/api/audit/commission")]
pub async fn log_commission(
    pool: web::Data<SqlitePool>,
    req: web::Json<serde_json::Value>,
) -> impl Responder {
    let _tenant_id = match req.get("tenant_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "tenant_id is required"
            }));
        }
    };

    let _user_id = match req.get("user_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "user_id is required"
            }));
        }
    };

    let commission_id = match req.get("commission_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "commission_id is required"
            }));
        }
    };

    let employee_id = match req.get("employee_id").and_then(|v| v.as_str()) {
        Some(id) => id,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "employee_id is required"
            }));
        }
    };

    let amount = match req.get("amount").and_then(|v| v.as_f64()) {
        Some(amt) => amt,
        None => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "amount is required"
            }));
        }
    };

    let store_id = req
        .get("store_id")
        .and_then(|v| v.as_str())
        .unwrap_or("default");

    let is_offline = req
        .get("is_offline")
        .and_then(|v| v.as_bool())
        .unwrap_or(false);

    tracing::info!(
        "Logging commission audit: {} - ${:.2} for employee {}",
        commission_id,
        amount,
        employee_id
    );

    let logger = AuditLogger::new(pool.get_ref().clone());

    let amount_str = amount.to_string();

    match logger
        .log_commission(
            "commission",
            commission_id,
            employee_id,
            &amount_str,
            is_offline,
            store_id,
        )
        .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Commission audit logged successfully"
        })),
        Err(e) => {
            tracing::error!("Failed to log commission audit: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to log commission audit: {}", e)
            }))
        }
    }
}

/// GET /api/audit/logs/:tenant_id
/// Get audit logs for a tenant
#[get("/api/audit/logs/{tenant_id}")]
pub async fn get_audit_logs(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let tenant_id = path.into_inner();
    tracing::info!("Fetching audit logs for tenant: {}", tenant_id);

    let limit: i64 = query
        .get("limit")
        .and_then(|l| l.parse().ok())
        .unwrap_or(100);

    let offset: i64 = query
        .get("offset")
        .and_then(|o| o.parse().ok())
        .unwrap_or(0);

    let action_filter = query.get("action").map(|s| s.as_str());

    let mut sql = "SELECT * FROM audit_logs WHERE tenant_id = ?".to_string();

    if let Some(action) = action_filter {
        sql.push_str(&format!(" AND action = '{}'", action));
    }

    sql.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");

    let result = sqlx::query(&sql)
        .bind(&tenant_id)
        .bind(limit)
        .bind(offset)
        .fetch_all(pool.get_ref())
        .await;

    match result {
        Ok(rows) => {
            let logs: Vec<serde_json::Value> = rows
                .iter()
                .map(|row| {
                    use sqlx::Row;
                    serde_json::json!({
                        "id": row.get::<String, _>("id"),
                        "tenant_id": row.get::<String, _>("tenant_id"),
                        "user_id": row.get::<String, _>("user_id"),
                        "action": row.get::<String, _>("action"),
                        "entity_type": row.get::<Option<String>, _>("entity_type"),
                        "entity_id": row.get::<Option<String>, _>("entity_id"),
                        "changes": row.get::<Option<String>, _>("changes"),
                        "created_at": row.get::<String, _>("created_at")
                    })
                })
                .collect();

            HttpResponse::Ok().json(logs)
        }
        Err(e) => {
            tracing::error!("Failed to fetch audit logs: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch audit logs"
            }))
        }
    }
}

/// Configure audit operations routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(log_payment)
        .service(log_commission)
        .service(get_audit_logs);
}
