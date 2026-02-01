/**
 * Appointments Handlers
 * 
 * Backend handlers for appointment scheduling functionality
 */

use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::{Utc, NaiveDateTime, Duration};

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct Appointment {
    pub id: i64,
    pub tenant_id: String,
    pub customer_id: i64,
    pub customer_name: Option<String>,
    pub staff_id: Option<i64>,
    pub staff_name: Option<String>,
    pub service_type: String,
    pub start_time: String,
    pub end_time: String,
    pub duration_minutes: i32,
    pub status: String,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateAppointmentRequest {
    pub customer_id: i64,
    pub staff_id: Option<i64>,
    pub service_type: String,
    pub start_time: String,
    pub duration_minutes: i32,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateAppointmentRequest {
    pub customer_id: Option<i64>,
    pub staff_id: Option<i64>,
    pub service_type: Option<String>,
    pub start_time: Option<String>,
    pub duration_minutes: Option<i32>,
    pub status: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AppointmentFilters {
    pub start_date: String,
    pub end_date: String,
    pub staff_id: Option<i64>,
    pub status: Option<String>,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /api/appointments
pub async fn list_appointments(
    pool: web::Data<SqlitePool>,
    query: web::Query<AppointmentFilters>,
) -> Result<HttpResponse> {
    let mut sql = String::from(
        r#"
        SELECT a.id, a.tenant_id, a.customer_id, c.name as customer_name,
               a.staff_id, u.display_name as staff_name, a.service_type,
               a.start_time, a.end_time, a.duration_minutes, a.status,
               a.notes, a.created_at, a.updated_at
        FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        LEFT JOIN users u ON a.staff_id = u.id
        WHERE a.start_time >= ? AND a.start_time <= ?
        "#
    );

    let mut bind_values: Vec<String> = vec![query.start_date.clone(), query.end_date.clone()];

    if let Some(staff_id) = query.staff_id {
        sql.push_str(" AND a.staff_id = ?");
        bind_values.push(staff_id.to_string());
    }
    if let Some(ref status) = query.status {
        sql.push_str(" AND a.status = ?");
        bind_values.push(status.clone());
    }

    sql.push_str(" ORDER BY a.start_time ASC");

    let mut query_builder = sqlx::query_as::<_, Appointment>(&sql);
    for value in bind_values {
        query_builder = query_builder.bind(value);
    }

    let appointments = query_builder.fetch_all(pool.get_ref()).await;

    match appointments {
        Ok(appointments) => Ok(HttpResponse::Ok().json(appointments)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch appointments: {}", e)
        }))),
    }
}

/// GET /api/appointments/{id}
pub async fn get_appointment(
    pool: web::Data<SqlitePool>,
    appointment_id: web::Path<i64>,
) -> Result<HttpResponse> {
    let appointment: Option<Appointment> = sqlx::query_as(
        r#"
        SELECT a.id, a.tenant_id, a.customer_id, c.name as customer_name,
               a.staff_id, u.display_name as staff_name, a.service_type,
               a.start_time, a.end_time, a.duration_minutes, a.status,
               a.notes, a.created_at, a.updated_at
        FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        LEFT JOIN users u ON a.staff_id = u.id
        WHERE a.id = ?
        "#
    )
    .bind(appointment_id.into_inner())
    .fetch_optional(pool.get_ref())
    .await
    .ok()
    .flatten();

    match appointment {
        Some(appointment) => Ok(HttpResponse::Ok().json(appointment)),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Appointment not found"
        }))),
    }
}

/// POST /api/appointments
pub async fn create_appointment(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateAppointmentRequest>,
) -> Result<HttpResponse> {
    let now = Utc::now().to_rfc3339();
    let tenant_id = "default";
    
    // Calculate end time based on start time and duration
    let start_time = &req.start_time;
    let end_time = match NaiveDateTime::parse_from_str(&start_time.replace('T', " ").replace('Z', ""), "%Y-%m-%d %H:%M:%S") {
        Ok(dt) => {
            let end = dt + Duration::minutes(req.duration_minutes as i64);
            end.format("%Y-%m-%dT%H:%M:%SZ").to_string()
        }
        Err(_) => {
            // If parsing fails, just add duration in a simple way
            start_time.clone()
        }
    };

    let result = sqlx::query(
        r#"
        INSERT INTO appointments (
            tenant_id, customer_id, staff_id, service_type,
            start_time, end_time, duration_minutes, status,
            notes, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)
        "#
    )
    .bind(tenant_id)
    .bind(req.customer_id)
    .bind(req.staff_id)
    .bind(&req.service_type)
    .bind(start_time)
    .bind(&end_time)
    .bind(req.duration_minutes)
    .bind(&req.notes)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(result) => {
            let appointment_id = result.last_insert_rowid();
            Ok(HttpResponse::Created().json(serde_json::json!({
                "id": appointment_id,
                "customer_id": req.customer_id,
                "service_type": req.service_type,
                "start_time": start_time,
                "end_time": end_time,
                "status": "scheduled",
                "message": "Appointment created successfully"
            })))
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create appointment: {}", e)
        }))),
    }
}

/// PUT /api/appointments/{id}
pub async fn update_appointment(
    pool: web::Data<SqlitePool>,
    appointment_id: web::Path<i64>,
    req: web::Json<UpdateAppointmentRequest>,
) -> Result<HttpResponse> {
    let appointment_id = appointment_id.into_inner();
    let now = Utc::now().to_rfc3339();

    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(customer_id) = req.customer_id {
        updates.push("customer_id = ?");
        params.push(customer_id.to_string());
    }
    if let Some(staff_id) = req.staff_id {
        updates.push("staff_id = ?");
        params.push(staff_id.to_string());
    }
    if let Some(ref service_type) = req.service_type {
        updates.push("service_type = ?");
        params.push(service_type.clone());
    }
    if let Some(ref start_time) = req.start_time {
        updates.push("start_time = ?");
        params.push(start_time.clone());
        
        // Recalculate end_time if duration is also provided or use existing
        if let Some(duration) = req.duration_minutes {
            if let Ok(dt) = NaiveDateTime::parse_from_str(&start_time.replace('T', " ").replace('Z', ""), "%Y-%m-%d %H:%M:%S") {
                let end = dt + Duration::minutes(duration as i64);
                updates.push("end_time = ?");
                params.push(end.format("%Y-%m-%dT%H:%M:%SZ").to_string());
            }
        }
    }
    if let Some(duration) = req.duration_minutes {
        updates.push("duration_minutes = ?");
        params.push(duration.to_string());
    }
    if let Some(ref status) = req.status {
        updates.push("status = ?");
        params.push(status.clone());
    }
    if let Some(ref notes) = req.notes {
        updates.push("notes = ?");
        params.push(notes.clone());
    }

    if updates.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "No fields to update"
        })));
    }

    updates.push("updated_at = ?");
    params.push(now.clone());
    params.push(appointment_id.to_string());

    let query = format!(
        "UPDATE appointments SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut query_builder = sqlx::query(&query);
    for param in &params {
        query_builder = query_builder.bind(param);
    }

    let result = query_builder.execute(pool.get_ref()).await;

    match result {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "id": appointment_id,
            "message": "Appointment updated successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to update appointment: {}", e)
        }))),
    }
}

/// DELETE /api/appointments/{id}
pub async fn delete_appointment(
    pool: web::Data<SqlitePool>,
    appointment_id: web::Path<i64>,
) -> Result<HttpResponse> {
    let result = sqlx::query("DELETE FROM appointments WHERE id = ?")
        .bind(appointment_id.into_inner())
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(HttpResponse::Ok().json(serde_json::json!({
                    "message": "Appointment deleted successfully"
                })))
            } else {
                Ok(HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Appointment not found"
                })))
            }
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to delete appointment: {}", e)
        }))),
    }
}
