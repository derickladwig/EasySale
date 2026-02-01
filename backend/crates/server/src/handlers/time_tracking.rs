/**
 * Time Tracking Handlers
 * 
 * Backend handlers for employee time tracking functionality
 */

use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use chrono::{Utc, NaiveDateTime, Duration};

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct TimeEntry {
    pub id: i64,
    pub tenant_id: String,
    pub employee_id: i64,
    pub employee_name: Option<String>,
    pub clock_in: String,
    pub clock_out: Option<String>,
    pub break_duration_minutes: Option<i32>,
    pub work_order_id: Option<i64>,
    pub project_name: Option<String>,
    pub task_name: Option<String>,
    pub notes: Option<String>,
    pub status: String,
    pub total_hours: Option<f64>,
    pub is_billable: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateTimeEntryRequest {
    pub employee_id: i64,
    pub clock_in: String,
    pub work_order_id: Option<i64>,
    pub project_name: Option<String>,
    pub task_name: Option<String>,
    pub notes: Option<String>,
    pub is_billable: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateTimeEntryRequest {
    pub clock_out: Option<String>,
    pub break_duration_minutes: Option<i32>,
    pub work_order_id: Option<i64>,
    pub project_name: Option<String>,
    pub task_name: Option<String>,
    pub notes: Option<String>,
    pub is_billable: Option<bool>,
    pub status: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct ClockInRequest {
    pub employee_id: i64,
    pub work_order_id: Option<i64>,
    pub project_name: Option<String>,
    pub task_name: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TimeEntryFilters {
    pub start_date: String,
    pub end_date: String,
    pub employee_id: Option<i64>,
    pub project_name: Option<String>,
    pub is_billable: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct TimeSummary {
    pub today_hours: f64,
    pub week_hours: f64,
    pub current_entry: Option<TimeEntry>,
    pub recent_entries: Vec<TimeEntry>,
}

#[derive(Debug, Serialize)]
pub struct TimeReport {
    pub employee_id: i64,
    pub employee_name: String,
    pub total_hours: f64,
    pub billable_hours: f64,
    pub non_billable_hours: f64,
    pub overtime_hours: f64,
    pub entries: Vec<TimeEntry>,
}

#[derive(Debug, Serialize)]
pub struct ProjectTimeReport {
    pub project_name: String,
    pub total_hours: f64,
    pub billable_hours: f64,
    pub entries: Vec<TimeEntry>,
}

// ============================================================================
// Handlers
// ============================================================================

/// GET /api/time-entries/summary/{employee_id}
pub async fn get_time_summary(
    pool: web::Data<SqlitePool>,
    employee_id: web::Path<i64>,
) -> Result<HttpResponse> {
    let employee_id = employee_id.into_inner();
    let now = Utc::now();
    let today_start = now.date_naive().and_hms_opt(0, 0, 0).unwrap().to_string();
    let week_start = (now - Duration::days(now.weekday().num_days_from_monday() as i64))
        .date_naive()
        .and_hms_opt(0, 0, 0)
        .unwrap()
        .to_string();

    // Get today's hours
    let today_hours: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(
            CASE 
                WHEN clock_out IS NOT NULL THEN 
                    (julianday(clock_out) - julianday(clock_in)) * 24 - COALESCE(break_duration_minutes, 0) / 60.0
                ELSE 
                    (julianday('now') - julianday(clock_in)) * 24 - COALESCE(break_duration_minutes, 0) / 60.0
            END
        ), 0.0)
        FROM time_entries
        WHERE employee_id = ? AND clock_in >= ?
        "#
    )
    .bind(employee_id)
    .bind(&today_start)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0.0);

    // Get week's hours
    let week_hours: f64 = sqlx::query_scalar(
        r#"
        SELECT COALESCE(SUM(
            CASE 
                WHEN clock_out IS NOT NULL THEN 
                    (julianday(clock_out) - julianday(clock_in)) * 24 - COALESCE(break_duration_minutes, 0) / 60.0
                ELSE 
                    (julianday('now') - julianday(clock_in)) * 24 - COALESCE(break_duration_minutes, 0) / 60.0
            END
        ), 0.0)
        FROM time_entries
        WHERE employee_id = ? AND clock_in >= ?
        "#
    )
    .bind(employee_id)
    .bind(&week_start)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0.0);

    // Get current clocked-in entry
    let current_entry: Option<TimeEntry> = sqlx::query_as(
        r#"
        SELECT id, tenant_id, employee_id, NULL as employee_name, clock_in, clock_out,
               break_duration_minutes, work_order_id, project_name, task_name, notes,
               status, total_hours, is_billable, created_at, updated_at
        FROM time_entries
        WHERE employee_id = ? AND status = 'clocked_in'
        ORDER BY clock_in DESC
        LIMIT 1
        "#
    )
    .bind(employee_id)
    .fetch_optional(pool.get_ref())
    .await
    .ok()
    .flatten();

    // Get recent entries
    let recent_entries: Vec<TimeEntry> = sqlx::query_as(
        r#"
        SELECT id, tenant_id, employee_id, NULL as employee_name, clock_in, clock_out,
               break_duration_minutes, work_order_id, project_name, task_name, notes,
               status, total_hours, is_billable, created_at, updated_at
        FROM time_entries
        WHERE employee_id = ?
        ORDER BY clock_in DESC
        LIMIT 10
        "#
    )
    .bind(employee_id)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    Ok(HttpResponse::Ok().json(TimeSummary {
        today_hours,
        week_hours,
        current_entry,
        recent_entries,
    }))
}

/// GET /api/time-entries
pub async fn list_time_entries(
    pool: web::Data<SqlitePool>,
    query: web::Query<TimeEntryFilters>,
) -> Result<HttpResponse> {
    let mut sql = String::from(
        r#"
        SELECT te.id, te.tenant_id, te.employee_id, u.display_name as employee_name,
               te.clock_in, te.clock_out, te.break_duration_minutes, te.work_order_id,
               te.project_name, te.task_name, te.notes, te.status, te.total_hours,
               te.is_billable, te.created_at, te.updated_at
        FROM time_entries te
        LEFT JOIN users u ON te.employee_id = u.id
        WHERE te.clock_in >= ? AND te.clock_in <= ?
        "#
    );

    let mut bind_values: Vec<String> = vec![query.start_date.clone(), query.end_date.clone()];

    if let Some(employee_id) = query.employee_id {
        sql.push_str(" AND te.employee_id = ?");
        bind_values.push(employee_id.to_string());
    }
    if let Some(ref project_name) = query.project_name {
        sql.push_str(" AND te.project_name = ?");
        bind_values.push(project_name.clone());
    }
    if let Some(is_billable) = query.is_billable {
        sql.push_str(" AND te.is_billable = ?");
        bind_values.push(if is_billable { "1".to_string() } else { "0".to_string() });
    }

    sql.push_str(" ORDER BY te.clock_in DESC");

    let mut query_builder = sqlx::query_as::<_, TimeEntry>(&sql);
    for value in bind_values {
        query_builder = query_builder.bind(value);
    }

    let entries = query_builder.fetch_all(pool.get_ref()).await;

    match entries {
        Ok(entries) => Ok(HttpResponse::Ok().json(entries)),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch time entries: {}", e)
        }))),
    }
}

/// GET /api/time-entries/{id}
pub async fn get_time_entry(
    pool: web::Data<SqlitePool>,
    entry_id: web::Path<i64>,
) -> Result<HttpResponse> {
    let entry: Option<TimeEntry> = sqlx::query_as(
        r#"
        SELECT te.id, te.tenant_id, te.employee_id, u.display_name as employee_name,
               te.clock_in, te.clock_out, te.break_duration_minutes, te.work_order_id,
               te.project_name, te.task_name, te.notes, te.status, te.total_hours,
               te.is_billable, te.created_at, te.updated_at
        FROM time_entries te
        LEFT JOIN users u ON te.employee_id = u.id
        WHERE te.id = ?
        "#
    )
    .bind(entry_id.into_inner())
    .fetch_optional(pool.get_ref())
    .await
    .ok()
    .flatten();

    match entry {
        Some(entry) => Ok(HttpResponse::Ok().json(entry)),
        None => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Time entry not found"
        }))),
    }
}

/// POST /api/time-entries/clock-in
pub async fn clock_in(
    pool: web::Data<SqlitePool>,
    req: web::Json<ClockInRequest>,
) -> Result<HttpResponse> {
    let now = Utc::now().to_rfc3339();
    let tenant_id = "default";

    let result = sqlx::query(
        r#"
        INSERT INTO time_entries (
            tenant_id, employee_id, clock_in, work_order_id, project_name,
            task_name, notes, status, is_billable, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'clocked_in', 0, ?, ?)
        "#
    )
    .bind(tenant_id)
    .bind(req.employee_id)
    .bind(&now)
    .bind(req.work_order_id)
    .bind(&req.project_name)
    .bind(&req.task_name)
    .bind(&req.notes)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(result) => {
            let entry_id = result.last_insert_rowid();
            Ok(HttpResponse::Created().json(serde_json::json!({
                "id": entry_id,
                "employee_id": req.employee_id,
                "clock_in": now,
                "status": "clocked_in",
                "message": "Clocked in successfully"
            })))
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to clock in: {}", e)
        }))),
    }
}

/// POST /api/time-entries/{id}/clock-out
pub async fn clock_out(
    pool: web::Data<SqlitePool>,
    entry_id: web::Path<i64>,
) -> Result<HttpResponse> {
    let entry_id = entry_id.into_inner();
    let now = Utc::now().to_rfc3339();

    // Calculate total hours
    let entry: Option<(String,)> = sqlx::query_as(
        "SELECT clock_in FROM time_entries WHERE id = ? AND status = 'clocked_in'"
    )
    .bind(entry_id)
    .fetch_optional(pool.get_ref())
    .await
    .ok()
    .flatten();

    if entry.is_none() {
        return Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Time entry not found or already clocked out"
        })));
    }

    let result = sqlx::query(
        r#"
        UPDATE time_entries
        SET clock_out = ?,
            status = 'clocked_out',
            total_hours = (julianday(?) - julianday(clock_in)) * 24 - COALESCE(break_duration_minutes, 0) / 60.0,
            updated_at = ?
        WHERE id = ?
        "#
    )
    .bind(&now)
    .bind(&now)
    .bind(&now)
    .bind(entry_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "id": entry_id,
            "clock_out": now,
            "status": "clocked_out",
            "message": "Clocked out successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to clock out: {}", e)
        }))),
    }
}

/// POST /api/time-entries
pub async fn create_time_entry(
    pool: web::Data<SqlitePool>,
    req: web::Json<CreateTimeEntryRequest>,
) -> Result<HttpResponse> {
    let now = Utc::now().to_rfc3339();
    let tenant_id = "default";
    let is_billable = req.is_billable.unwrap_or(false);

    let result = sqlx::query(
        r#"
        INSERT INTO time_entries (
            tenant_id, employee_id, clock_in, work_order_id, project_name,
            task_name, notes, status, is_billable, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'clocked_in', ?, ?, ?)
        "#
    )
    .bind(tenant_id)
    .bind(req.employee_id)
    .bind(&req.clock_in)
    .bind(req.work_order_id)
    .bind(&req.project_name)
    .bind(&req.task_name)
    .bind(&req.notes)
    .bind(is_billable)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(result) => {
            let entry_id = result.last_insert_rowid();
            Ok(HttpResponse::Created().json(serde_json::json!({
                "id": entry_id,
                "employee_id": req.employee_id,
                "clock_in": req.clock_in,
                "status": "clocked_in",
                "message": "Time entry created successfully"
            })))
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create time entry: {}", e)
        }))),
    }
}

/// PUT /api/time-entries/{id}
pub async fn update_time_entry(
    pool: web::Data<SqlitePool>,
    entry_id: web::Path<i64>,
    req: web::Json<UpdateTimeEntryRequest>,
) -> Result<HttpResponse> {
    let entry_id = entry_id.into_inner();
    let now = Utc::now().to_rfc3339();

    let mut updates = Vec::new();
    let mut params: Vec<String> = Vec::new();

    if let Some(ref clock_out) = req.clock_out {
        updates.push("clock_out = ?");
        params.push(clock_out.clone());
    }
    if let Some(break_duration) = req.break_duration_minutes {
        updates.push("break_duration_minutes = ?");
        params.push(break_duration.to_string());
    }
    if let Some(work_order_id) = req.work_order_id {
        updates.push("work_order_id = ?");
        params.push(work_order_id.to_string());
    }
    if let Some(ref project_name) = req.project_name {
        updates.push("project_name = ?");
        params.push(project_name.clone());
    }
    if let Some(ref task_name) = req.task_name {
        updates.push("task_name = ?");
        params.push(task_name.clone());
    }
    if let Some(ref notes) = req.notes {
        updates.push("notes = ?");
        params.push(notes.clone());
    }
    if let Some(is_billable) = req.is_billable {
        updates.push("is_billable = ?");
        params.push(if is_billable { "1".to_string() } else { "0".to_string() });
    }
    if let Some(ref status) = req.status {
        updates.push("status = ?");
        params.push(status.clone());
    }

    if updates.is_empty() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "No fields to update"
        })));
    }

    updates.push("updated_at = ?");
    params.push(now.clone());
    params.push(entry_id.to_string());

    let query = format!(
        "UPDATE time_entries SET {} WHERE id = ?",
        updates.join(", ")
    );

    let mut query_builder = sqlx::query(&query);
    for param in &params {
        query_builder = query_builder.bind(param);
    }

    let result = query_builder.execute(pool.get_ref()).await;

    match result {
        Ok(_) => Ok(HttpResponse::Ok().json(serde_json::json!({
            "id": entry_id,
            "message": "Time entry updated successfully"
        }))),
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to update time entry: {}", e)
        }))),
    }
}

/// DELETE /api/time-entries/{id}
pub async fn delete_time_entry(
    pool: web::Data<SqlitePool>,
    entry_id: web::Path<i64>,
) -> Result<HttpResponse> {
    let result = sqlx::query("DELETE FROM time_entries WHERE id = ?")
        .bind(entry_id.into_inner())
        .execute(pool.get_ref())
        .await;

    match result {
        Ok(result) => {
            if result.rows_affected() > 0 {
                Ok(HttpResponse::Ok().json(serde_json::json!({
                    "message": "Time entry deleted successfully"
                })))
            } else {
                Ok(HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Time entry not found"
                })))
            }
        }
        Err(e) => Ok(HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to delete time entry: {}", e)
        }))),
    }
}

/// GET /api/time-entries/reports/employee
pub async fn get_employee_time_report(
    pool: web::Data<SqlitePool>,
    query: web::Query<TimeEntryFilters>,
) -> Result<HttpResponse> {
    let entries: Vec<TimeEntry> = sqlx::query_as(
        r#"
        SELECT te.id, te.tenant_id, te.employee_id, u.display_name as employee_name,
               te.clock_in, te.clock_out, te.break_duration_minutes, te.work_order_id,
               te.project_name, te.task_name, te.notes, te.status, te.total_hours,
               te.is_billable, te.created_at, te.updated_at
        FROM time_entries te
        LEFT JOIN users u ON te.employee_id = u.id
        WHERE te.clock_in >= ? AND te.clock_in <= ?
        ORDER BY te.employee_id, te.clock_in DESC
        "#
    )
    .bind(&query.start_date)
    .bind(&query.end_date)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    // Group by employee
    let mut reports: std::collections::HashMap<i64, TimeReport> = std::collections::HashMap::new();
    
    for entry in entries {
        let report = reports.entry(entry.employee_id).or_insert_with(|| TimeReport {
            employee_id: entry.employee_id,
            employee_name: entry.employee_name.clone().unwrap_or_default(),
            total_hours: 0.0,
            billable_hours: 0.0,
            non_billable_hours: 0.0,
            overtime_hours: 0.0,
            entries: Vec::new(),
        });

        let hours = entry.total_hours.unwrap_or(0.0);
        report.total_hours += hours;
        if entry.is_billable {
            report.billable_hours += hours;
        } else {
            report.non_billable_hours += hours;
        }
        report.entries.push(entry);
    }

    // Calculate overtime (hours over 40 per week)
    for report in reports.values_mut() {
        if report.total_hours > 40.0 {
            report.overtime_hours = report.total_hours - 40.0;
        }
    }

    let result: Vec<TimeReport> = reports.into_values().collect();
    Ok(HttpResponse::Ok().json(result))
}

/// GET /api/time-entries/reports/project
pub async fn get_project_time_report(
    pool: web::Data<SqlitePool>,
    query: web::Query<TimeEntryFilters>,
) -> Result<HttpResponse> {
    let entries: Vec<TimeEntry> = sqlx::query_as(
        r#"
        SELECT te.id, te.tenant_id, te.employee_id, u.display_name as employee_name,
               te.clock_in, te.clock_out, te.break_duration_minutes, te.work_order_id,
               te.project_name, te.task_name, te.notes, te.status, te.total_hours,
               te.is_billable, te.created_at, te.updated_at
        FROM time_entries te
        LEFT JOIN users u ON te.employee_id = u.id
        WHERE te.clock_in >= ? AND te.clock_in <= ? AND te.project_name IS NOT NULL
        ORDER BY te.project_name, te.clock_in DESC
        "#
    )
    .bind(&query.start_date)
    .bind(&query.end_date)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    // Group by project
    let mut reports: std::collections::HashMap<String, ProjectTimeReport> = std::collections::HashMap::new();
    
    for entry in entries {
        let project_name = entry.project_name.clone().unwrap_or_else(|| "Unassigned".to_string());
        let report = reports.entry(project_name.clone()).or_insert_with(|| ProjectTimeReport {
            project_name,
            total_hours: 0.0,
            billable_hours: 0.0,
            entries: Vec::new(),
        });

        let hours = entry.total_hours.unwrap_or(0.0);
        report.total_hours += hours;
        if entry.is_billable {
            report.billable_hours += hours;
        }
        report.entries.push(entry);
    }

    let result: Vec<ProjectTimeReport> = reports.into_values().collect();
    Ok(HttpResponse::Ok().json(result))
}

/// GET /api/time-entries/export
pub async fn export_time_report(
    pool: web::Data<SqlitePool>,
    query: web::Query<TimeEntryFilters>,
) -> Result<HttpResponse> {
    let entries: Vec<TimeEntry> = sqlx::query_as(
        r#"
        SELECT te.id, te.tenant_id, te.employee_id, u.display_name as employee_name,
               te.clock_in, te.clock_out, te.break_duration_minutes, te.work_order_id,
               te.project_name, te.task_name, te.notes, te.status, te.total_hours,
               te.is_billable, te.created_at, te.updated_at
        FROM time_entries te
        LEFT JOIN users u ON te.employee_id = u.id
        WHERE te.clock_in >= ? AND te.clock_in <= ?
        ORDER BY te.clock_in DESC
        "#
    )
    .bind(&query.start_date)
    .bind(&query.end_date)
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();

    // Generate CSV
    let mut csv = String::from("ID,Employee ID,Employee Name,Clock In,Clock Out,Break Minutes,Project,Task,Notes,Status,Total Hours,Billable\n");
    
    for entry in entries {
        csv.push_str(&format!(
            "{},{},{},{},{},{},{},{},{},{},{},{}\n",
            entry.id,
            entry.employee_id,
            entry.employee_name.unwrap_or_default(),
            entry.clock_in,
            entry.clock_out.unwrap_or_default(),
            entry.break_duration_minutes.unwrap_or(0),
            entry.project_name.unwrap_or_default(),
            entry.task_name.unwrap_or_default(),
            entry.notes.unwrap_or_default().replace(',', ";"),
            entry.status,
            entry.total_hours.unwrap_or(0.0),
            if entry.is_billable { "Yes" } else { "No" }
        ));
    }

    Ok(HttpResponse::Ok()
        .content_type("text/csv")
        .insert_header(("Content-Disposition", "attachment; filename=\"time_report.csv\""))
        .body(csv))
}
