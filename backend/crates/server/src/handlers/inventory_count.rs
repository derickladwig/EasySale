//! Inventory Counting API Handlers
//!
//! Provides REST endpoints for inventory counting workflow:
//! - Count session management (CRUD, workflow transitions)
//! - Count item recording (manual, bulk)
//! - Reconciliation view
//! - Adjustment approval workflow
//!
//! Ported from POS project's inventory counting feature.

use actix_web::{web, HttpResponse, Result};
use chrono::Utc;
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::models::UserContext;
use crate::services::AuditLogger;

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct CreateCountSessionRequest {
    pub store_id: String,
    pub count_type: Option<String>, // full, cycle, spot
    pub category_filter: Option<String>,
    pub bin_filter: Option<String>,
    pub product_type_filter: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateCountSessionRequest {
    pub notes: Option<String>,
    pub category_filter: Option<String>,
    pub bin_filter: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct CountSessionResponse {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub count_type: String,
    pub status: String,
    pub category_filter: Option<String>,
    pub bin_filter: Option<String>,
    pub started_by_user_id: Option<String>,
    pub started_at: Option<String>,
    pub submitted_by_user_id: Option<String>,
    pub submitted_at: Option<String>,
    pub approved_by_user_id: Option<String>,
    pub approved_at: Option<String>,
    pub total_items_expected: i32,
    pub total_items_counted: i32,
    pub total_variance_items: i32,
    pub total_variance_qty: i32,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct RecordCountRequest {
    pub product_id: String,
    pub counted_qty: i32,
    pub bin_location: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BulkRecordCountRequest {
    pub items: Vec<RecordCountRequest>,
}

#[derive(Debug, Serialize)]
pub struct CountItemResponse {
    pub id: String,
    pub session_id: String,
    pub product_id: String,
    pub product_name: Option<String>,
    pub product_sku: Option<String>,
    pub expected_qty: i32,
    pub counted_qty: Option<i32>,
    pub variance: i32,
    pub counted_by_user_id: Option<String>,
    pub counted_at: Option<String>,
    pub bin_location: Option<String>,
    pub recount_requested: bool,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CountSessionFilters {
    pub store_id: Option<String>,
    pub status: Option<String>,
    pub count_type: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct DiscrepancyItem {
    pub product_id: String,
    pub product_name: String,
    pub product_sku: String,
    pub expected_qty: i32,
    pub counted_qty: i32,
    pub variance: i32,
    pub variance_value: f64,
    pub bin_location: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ReconciliationResponse {
    pub session_id: String,
    pub total_items: i32,
    pub items_with_variance: i32,
    pub total_variance_qty: i32,
    pub total_variance_value: f64,
    pub discrepancies: Vec<DiscrepancyItem>,
}

#[derive(Debug, Deserialize)]
pub struct CreateAdjustmentRequest {
    pub product_id: String,
    pub store_id: String,
    pub quantity_before: i32,
    pub quantity_after: i32,
    pub adjustment_type: Option<String>,
    pub reason: Option<String>,
    pub reference_type: Option<String>,
    pub reference_id: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AdjustmentResponse {
    pub id: String,
    pub session_id: Option<String>,
    pub product_id: String,
    pub store_id: String,
    pub quantity_before: i32,
    pub quantity_after: i32,
    pub adjustment_qty: i32,
    pub adjustment_type: String,
    pub reason: Option<String>,
    pub status: String,
    pub created_by_user_id: String,
    pub approved_by_user_id: Option<String>,
    pub approved_at: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
pub struct AdjustmentFilters {
    pub store_id: Option<String>,
    pub status: Option<String>,
    pub product_id: Option<String>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CountSettingsUpdate {
    pub cycle_count_frequency_days: Option<i32>,
    pub require_approval: Option<bool>,
    pub auto_approve_threshold: Option<i32>,
    pub approval_tier_required: Option<i32>,
    pub allow_blind_counts: Option<bool>,
    pub require_double_count: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct CountSettingsResponse {
    pub store_id: String,
    pub cycle_count_frequency_days: i32,
    pub require_approval: bool,
    pub auto_approve_threshold: i32,
    pub approval_tier_required: i32,
    pub allow_blind_counts: bool,
    pub require_double_count: bool,
}

// ============================================================================
// COUNT SESSION HANDLERS
// ============================================================================

/// Create a new inventory count session
pub async fn create_count_session(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    body: web::Json<CreateCountSessionRequest>,
) -> Result<HttpResponse> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let count_type = body.count_type.as_deref().unwrap_or("cycle");

    let result = sqlx::query!(
        r#"
        INSERT INTO inventory_count_sessions 
        (id, tenant_id, store_id, count_type, status, category_filter, bin_filter, 
         product_type_filter, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?)
        "#,
        id,
        tenant_id,
        body.store_id,
        count_type,
        body.category_filter,
        body.bin_filter,
        body.product_type_filter,
        body.notes,
        now,
        now
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            audit_logger.log(
                "inventory_count_session",
                &id,
                "create",
                context.user_id.as_deref(),
                Some(serde_json::json!({
                    "store_id": body.store_id,
                    "count_type": count_type,
                })),
            ).await;

            Ok(HttpResponse::Created().json(serde_json::json!({
                "id": id,
                "status": "draft",
                "message": "Count session created"
            })))
        }
        Err(e) => {
            tracing::error!("Failed to create count session: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create count session"
            })))
        }
    }
}

/// List count sessions with filters
pub async fn list_count_sessions(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    query: web::Query<CountSessionFilters>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);

    // Build dynamic query
    let mut sql = String::from(
        "SELECT id, tenant_id, store_id, count_type, status, category_filter, bin_filter,
         started_by_user_id, started_at, submitted_by_user_id, submitted_at,
         approved_by_user_id, approved_at, total_items_expected, total_items_counted,
         total_variance_items, total_variance_qty, notes, created_at, updated_at
         FROM inventory_count_sessions WHERE tenant_id = ?"
    );

    if query.store_id.is_some() {
        sql.push_str(" AND store_id = ?");
    }
    if query.status.is_some() {
        sql.push_str(" AND status = ?");
    }
    if query.count_type.is_some() {
        sql.push_str(" AND count_type = ?");
    }

    sql.push_str(" ORDER BY created_at DESC LIMIT ? OFFSET ?");

    // Execute with dynamic bindings
    let rows = sqlx::query_as::<_, (
        String, String, String, String, String, Option<String>, Option<String>,
        Option<String>, Option<String>, Option<String>, Option<String>,
        Option<String>, Option<String>, i32, i32, i32, i32, Option<String>, String, String
    )>(&sql)
        .bind(tenant_id)
        .bind(query.store_id.as_deref().unwrap_or(""))
        .bind(query.status.as_deref().unwrap_or(""))
        .bind(query.count_type.as_deref().unwrap_or(""))
        .bind(limit)
        .bind(offset)
        .fetch_all(pool.get_ref())
        .await;

    match rows {
        Ok(sessions) => {
            let response: Vec<CountSessionResponse> = sessions
                .into_iter()
                .map(|row| CountSessionResponse {
                    id: row.0,
                    tenant_id: row.1,
                    store_id: row.2,
                    count_type: row.3,
                    status: row.4,
                    category_filter: row.5,
                    bin_filter: row.6,
                    started_by_user_id: row.7,
                    started_at: row.8,
                    submitted_by_user_id: row.9,
                    submitted_at: row.10,
                    approved_by_user_id: row.11,
                    approved_at: row.12,
                    total_items_expected: row.13,
                    total_items_counted: row.14,
                    total_variance_items: row.15,
                    total_variance_qty: row.16,
                    notes: row.17,
                    created_at: row.18,
                    updated_at: row.19,
                })
                .collect();

            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            tracing::error!("Failed to list count sessions: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list count sessions"
            })))
        }
    }
}

/// Get a single count session
pub async fn get_count_session(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    session_id: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");

    let result = sqlx::query!(
        r#"
        SELECT id, tenant_id, store_id, count_type, status, category_filter, bin_filter,
               started_by_user_id, started_at, submitted_by_user_id, submitted_at,
               approved_by_user_id, approved_at, total_items_expected, total_items_counted,
               total_variance_items, total_variance_qty, notes, created_at, updated_at
        FROM inventory_count_sessions
        WHERE id = ? AND tenant_id = ?
        "#,
        session_id.as_str(),
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(row)) => {
            Ok(HttpResponse::Ok().json(CountSessionResponse {
                id: row.id,
                tenant_id: row.tenant_id,
                store_id: row.store_id,
                count_type: row.count_type,
                status: row.status,
                category_filter: row.category_filter,
                bin_filter: row.bin_filter,
                started_by_user_id: row.started_by_user_id,
                started_at: row.started_at,
                submitted_by_user_id: row.submitted_by_user_id,
                submitted_at: row.submitted_at,
                approved_by_user_id: row.approved_by_user_id,
                approved_at: row.approved_at,
                total_items_expected: row.total_items_expected.unwrap_or(0),
                total_items_counted: row.total_items_counted.unwrap_or(0),
                total_variance_items: row.total_variance_items.unwrap_or(0),
                total_variance_qty: row.total_variance_qty.unwrap_or(0),
                notes: row.notes,
                created_at: row.created_at,
                updated_at: row.updated_at,
            }))
        }
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Count session not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to get count session: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get count session"
            })))
        }
    }
}

/// Start a count session (transition from draft to in_progress)
pub async fn start_count_session(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    session_id: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let now = Utc::now().to_rfc3339();

    // Verify session exists and is in draft status
    let session = sqlx::query!(
        "SELECT status, store_id FROM inventory_count_sessions WHERE id = ? AND tenant_id = ?",
        session_id.as_str(),
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match session {
        Ok(Some(s)) if s.status == "draft" => {
            // Populate count items from products
            let _ = sqlx::query!(
                r#"
                INSERT INTO inventory_count_items (id, session_id, product_id, expected_qty, unit_cost, created_at, updated_at)
                SELECT 
                    lower(hex(randomblob(16))),
                    ?,
                    p.id,
                    COALESCE(p.quantity_on_hand, 0),
                    COALESCE(p.cost, 0),
                    ?,
                    ?
                FROM products p
                WHERE p.tenant_id = ? AND p.store_id = ?
                AND NOT EXISTS (SELECT 1 FROM inventory_count_items WHERE session_id = ? AND product_id = p.id)
                "#,
                session_id.as_str(),
                now,
                now,
                tenant_id,
                s.store_id,
                session_id.as_str()
            )
            .execute(pool.get_ref())
            .await;

            // Update session status
            let result = sqlx::query!(
                r#"
                UPDATE inventory_count_sessions 
                SET status = 'in_progress', 
                    started_by_user_id = ?, 
                    started_at = ?,
                    total_items_expected = (SELECT COUNT(*) FROM inventory_count_items WHERE session_id = ?),
                    updated_at = ?
                WHERE id = ? AND tenant_id = ?
                "#,
                user_id,
                now,
                session_id.as_str(),
                now,
                session_id.as_str(),
                tenant_id
            )
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => {
                    audit_logger.log(
                        "inventory_count_session",
                        &session_id,
                        "start",
                        Some(user_id),
                        None,
                    ).await;

                    Ok(HttpResponse::Ok().json(serde_json::json!({
                        "status": "in_progress",
                        "message": "Count session started"
                    })))
                }
                Err(e) => {
                    tracing::error!("Failed to start count session: {}", e);
                    Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to start count session"
                    })))
                }
            }
        }
        Ok(Some(_)) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Session must be in draft status to start"
        }))),
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Count session not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to verify count session: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to verify count session"
            })))
        }
    }
}

/// Record a count for a single item
pub async fn record_count(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    session_id: web::Path<String>,
    body: web::Json<RecordCountRequest>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let now = Utc::now().to_rfc3339();

    // Verify session is in_progress
    let session = sqlx::query!(
        "SELECT status FROM inventory_count_sessions WHERE id = ? AND tenant_id = ?",
        session_id.as_str(),
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match session {
        Ok(Some(s)) if s.status == "in_progress" => {
            // Update or insert count item
            let result = sqlx::query!(
                r#"
                UPDATE inventory_count_items 
                SET counted_qty = ?, 
                    counted_by_user_id = ?,
                    counted_at = ?,
                    bin_location = COALESCE(?, bin_location),
                    notes = COALESCE(?, notes),
                    updated_at = ?
                WHERE session_id = ? AND product_id = ?
                "#,
                body.counted_qty,
                user_id,
                now,
                body.bin_location,
                body.notes,
                now,
                session_id.as_str(),
                body.product_id
            )
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(r) if r.rows_affected() > 0 => {
                    // Update session statistics
                    let _ = sqlx::query!(
                        r#"
                        UPDATE inventory_count_sessions 
                        SET total_items_counted = (SELECT COUNT(*) FROM inventory_count_items WHERE session_id = ? AND counted_qty IS NOT NULL),
                            total_variance_items = (SELECT COUNT(*) FROM inventory_count_items WHERE session_id = ? AND variance != 0),
                            total_variance_qty = (SELECT COALESCE(SUM(ABS(variance)), 0) FROM inventory_count_items WHERE session_id = ?),
                            updated_at = ?
                        WHERE id = ?
                        "#,
                        session_id.as_str(),
                        session_id.as_str(),
                        session_id.as_str(),
                        now,
                        session_id.as_str()
                    )
                    .execute(pool.get_ref())
                    .await;

                    Ok(HttpResponse::Ok().json(serde_json::json!({
                        "message": "Count recorded",
                        "product_id": body.product_id,
                        "counted_qty": body.counted_qty
                    })))
                }
                Ok(_) => Ok(HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Product not found in count session"
                }))),
                Err(e) => {
                    tracing::error!("Failed to record count: {}", e);
                    Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to record count"
                    })))
                }
            }
        }
        Ok(Some(_)) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Session must be in_progress to record counts"
        }))),
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Count session not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to verify count session: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to verify count session"
            })))
        }
    }
}

/// Record counts for multiple items
pub async fn record_counts_bulk(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    session_id: web::Path<String>,
    body: web::Json<BulkRecordCountRequest>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let now = Utc::now().to_rfc3339();

    // Verify session is in_progress
    let session = sqlx::query!(
        "SELECT status FROM inventory_count_sessions WHERE id = ? AND tenant_id = ?",
        session_id.as_str(),
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match session {
        Ok(Some(s)) if s.status == "in_progress" => {
            let mut success_count = 0;
            let mut error_count = 0;

            for item in &body.items {
                let result = sqlx::query!(
                    r#"
                    UPDATE inventory_count_items 
                    SET counted_qty = ?, 
                        counted_by_user_id = ?,
                        counted_at = ?,
                        bin_location = COALESCE(?, bin_location),
                        notes = COALESCE(?, notes),
                        updated_at = ?
                    WHERE session_id = ? AND product_id = ?
                    "#,
                    item.counted_qty,
                    user_id,
                    now,
                    item.bin_location,
                    item.notes,
                    now,
                    session_id.as_str(),
                    item.product_id
                )
                .execute(pool.get_ref())
                .await;

                match result {
                    Ok(r) if r.rows_affected() > 0 => success_count += 1,
                    _ => error_count += 1,
                }
            }

            // Update session statistics
            let _ = sqlx::query!(
                r#"
                UPDATE inventory_count_sessions 
                SET total_items_counted = (SELECT COUNT(*) FROM inventory_count_items WHERE session_id = ? AND counted_qty IS NOT NULL),
                    total_variance_items = (SELECT COUNT(*) FROM inventory_count_items WHERE session_id = ? AND variance != 0),
                    total_variance_qty = (SELECT COALESCE(SUM(ABS(variance)), 0) FROM inventory_count_items WHERE session_id = ?),
                    updated_at = ?
                WHERE id = ?
                "#,
                session_id.as_str(),
                session_id.as_str(),
                session_id.as_str(),
                now,
                session_id.as_str()
            )
            .execute(pool.get_ref())
            .await;

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Bulk counts recorded",
                "success_count": success_count,
                "error_count": error_count
            })))
        }
        Ok(Some(_)) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Session must be in_progress to record counts"
        }))),
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Count session not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to verify count session: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to verify count session"
            })))
        }
    }
}

/// Submit count session for approval
pub async fn submit_count_session(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    session_id: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let now = Utc::now().to_rfc3339();

    let result = sqlx::query!(
        r#"
        UPDATE inventory_count_sessions 
        SET status = 'submitted', 
            submitted_by_user_id = ?, 
            submitted_at = ?,
            updated_at = ?
        WHERE id = ? AND tenant_id = ? AND status = 'in_progress'
        "#,
        user_id,
        now,
        now,
        session_id.as_str(),
        tenant_id
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            audit_logger.log(
                "inventory_count_session",
                &session_id,
                "submit",
                Some(user_id),
                None,
            ).await;

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "status": "submitted",
                "message": "Count session submitted for approval"
            })))
        }
        Ok(_) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Session not found or not in_progress"
        }))),
        Err(e) => {
            tracing::error!("Failed to submit count session: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to submit count session"
            })))
        }
    }
}

/// Approve count session and apply adjustments
pub async fn approve_count_session(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    session_id: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let now = Utc::now().to_rfc3339();

    // Get session and verify status
    let session = sqlx::query!(
        "SELECT status, store_id FROM inventory_count_sessions WHERE id = ? AND tenant_id = ?",
        session_id.as_str(),
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match session {
        Ok(Some(s)) if s.status == "submitted" => {
            // Create adjustments for items with variance
            let _ = sqlx::query!(
                r#"
                INSERT INTO inventory_adjustments 
                (id, tenant_id, session_id, product_id, store_id, quantity_before, quantity_after, 
                 adjustment_type, reason, status, created_by_user_id, approved_by_user_id, approved_at, created_at, updated_at)
                SELECT 
                    lower(hex(randomblob(16))),
                    ?,
                    ?,
                    product_id,
                    ?,
                    expected_qty,
                    COALESCE(counted_qty, expected_qty),
                    'count',
                    'Inventory count adjustment',
                    'approved',
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                FROM inventory_count_items
                WHERE session_id = ? AND variance != 0
                "#,
                tenant_id,
                session_id.as_str(),
                s.store_id,
                user_id,
                user_id,
                now,
                now,
                now,
                session_id.as_str()
            )
            .execute(pool.get_ref())
            .await;

            // Apply adjustments to product quantities
            let _ = sqlx::query!(
                r#"
                UPDATE products 
                SET quantity_on_hand = (
                    SELECT COALESCE(counted_qty, expected_qty)
                    FROM inventory_count_items 
                    WHERE inventory_count_items.product_id = products.id 
                    AND inventory_count_items.session_id = ?
                ),
                updated_at = ?
                WHERE id IN (SELECT product_id FROM inventory_count_items WHERE session_id = ? AND variance != 0)
                "#,
                session_id.as_str(),
                now,
                session_id.as_str()
            )
            .execute(pool.get_ref())
            .await;

            // Update session status
            let result = sqlx::query!(
                r#"
                UPDATE inventory_count_sessions 
                SET status = 'approved', 
                    approved_by_user_id = ?, 
                    approved_at = ?,
                    updated_at = ?
                WHERE id = ? AND tenant_id = ?
                "#,
                user_id,
                now,
                now,
                session_id.as_str(),
                tenant_id
            )
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => {
                    audit_logger.log(
                        "inventory_count_session",
                        &session_id,
                        "approve",
                        Some(user_id),
                        Some(serde_json::json!({
                            "action": "adjustments_applied"
                        })),
                    ).await;

                    Ok(HttpResponse::Ok().json(serde_json::json!({
                        "status": "approved",
                        "message": "Count session approved and adjustments applied"
                    })))
                }
                Err(e) => {
                    tracing::error!("Failed to approve count session: {}", e);
                    Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to approve count session"
                    })))
                }
            }
        }
        Ok(Some(_)) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Session must be submitted to approve"
        }))),
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Count session not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to verify count session: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to verify count session"
            })))
        }
    }
}

/// Get discrepancies/reconciliation view
pub async fn get_discrepancies(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    session_id: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");

    // Verify session exists
    let session = sqlx::query!(
        "SELECT id FROM inventory_count_sessions WHERE id = ? AND tenant_id = ?",
        session_id.as_str(),
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match session {
        Ok(Some(_)) => {
            let items = sqlx::query!(
                r#"
                SELECT 
                    ci.product_id,
                    COALESCE(p.name, 'Unknown') as product_name,
                    COALESCE(p.sku, ci.product_id) as product_sku,
                    ci.expected_qty,
                    COALESCE(ci.counted_qty, 0) as counted_qty,
                    COALESCE(ci.variance, 0) as variance,
                    COALESCE(ci.variance_value, 0.0) as variance_value,
                    ci.bin_location
                FROM inventory_count_items ci
                LEFT JOIN products p ON ci.product_id = p.id
                WHERE ci.session_id = ? AND ci.variance != 0
                ORDER BY ABS(ci.variance) DESC
                "#,
                session_id.as_str()
            )
            .fetch_all(pool.get_ref())
            .await;

            match items {
                Ok(rows) => {
                    let discrepancies: Vec<DiscrepancyItem> = rows
                        .into_iter()
                        .map(|row| DiscrepancyItem {
                            product_id: row.product_id,
                            product_name: row.product_name.unwrap_or_default(),
                            product_sku: row.product_sku.unwrap_or_default(),
                            expected_qty: row.expected_qty,
                            counted_qty: row.counted_qty.unwrap_or(0),
                            variance: row.variance.unwrap_or(0),
                            variance_value: row.variance_value.unwrap_or(0.0),
                            bin_location: row.bin_location,
                        })
                        .collect();

                    let total_variance_qty: i32 = discrepancies.iter().map(|d| d.variance.abs()).sum();
                    let total_variance_value: f64 = discrepancies.iter().map(|d| d.variance_value.abs()).sum();

                    Ok(HttpResponse::Ok().json(ReconciliationResponse {
                        session_id: session_id.to_string(),
                        total_items: discrepancies.len() as i32,
                        items_with_variance: discrepancies.len() as i32,
                        total_variance_qty,
                        total_variance_value,
                        discrepancies,
                    }))
                }
                Err(e) => {
                    tracing::error!("Failed to get discrepancies: {}", e);
                    Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to get discrepancies"
                    })))
                }
            }
        }
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Count session not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to verify count session: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to verify count session"
            })))
        }
    }
}

/// List count items for a session
pub async fn list_count_items(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    session_id: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");

    // Verify session exists
    let session = sqlx::query!(
        "SELECT id FROM inventory_count_sessions WHERE id = ? AND tenant_id = ?",
        session_id.as_str(),
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match session {
        Ok(Some(_)) => {
            let items = sqlx::query!(
                r#"
                SELECT 
                    ci.id, ci.session_id, ci.product_id,
                    p.name as product_name, p.sku as product_sku,
                    ci.expected_qty, ci.counted_qty, 
                    COALESCE(ci.variance, 0) as variance,
                    ci.counted_by_user_id, ci.counted_at, ci.bin_location,
                    ci.recount_requested, ci.notes
                FROM inventory_count_items ci
                LEFT JOIN products p ON ci.product_id = p.id
                WHERE ci.session_id = ?
                ORDER BY p.name
                "#,
                session_id.as_str()
            )
            .fetch_all(pool.get_ref())
            .await;

            match items {
                Ok(rows) => {
                    let response: Vec<CountItemResponse> = rows
                        .into_iter()
                        .map(|row| CountItemResponse {
                            id: row.id,
                            session_id: row.session_id,
                            product_id: row.product_id,
                            product_name: row.product_name,
                            product_sku: row.product_sku,
                            expected_qty: row.expected_qty,
                            counted_qty: row.counted_qty,
                            variance: row.variance.unwrap_or(0),
                            counted_by_user_id: row.counted_by_user_id,
                            counted_at: row.counted_at,
                            bin_location: row.bin_location,
                            recount_requested: row.recount_requested != 0,
                            notes: row.notes,
                        })
                        .collect();

                    Ok(HttpResponse::Ok().json(response))
                }
                Err(e) => {
                    tracing::error!("Failed to list count items: {}", e);
                    Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to list count items"
                    })))
                }
            }
        }
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Count session not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to verify count session: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to verify count session"
            })))
        }
    }
}

// ============================================================================
// ADJUSTMENT HANDLERS
// ============================================================================

/// Create a standalone adjustment (not from count session)
pub async fn create_adjustment(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    body: web::Json<CreateAdjustmentRequest>,
) -> Result<HttpResponse> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let adjustment_type = body.adjustment_type.as_deref().unwrap_or("manual");

    let result = sqlx::query!(
        r#"
        INSERT INTO inventory_adjustments 
        (id, tenant_id, product_id, store_id, quantity_before, quantity_after, 
         adjustment_type, reason, reference_type, reference_id, status, created_by_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
        "#,
        id,
        tenant_id,
        body.product_id,
        body.store_id,
        body.quantity_before,
        body.quantity_after,
        adjustment_type,
        body.reason,
        body.reference_type,
        body.reference_id,
        user_id,
        now,
        now
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            audit_logger.log(
                "inventory_adjustment",
                &id,
                "create",
                Some(user_id),
                Some(serde_json::json!({
                    "product_id": body.product_id,
                    "adjustment": body.quantity_after - body.quantity_before,
                })),
            ).await;

            Ok(HttpResponse::Created().json(serde_json::json!({
                "id": id,
                "status": "pending",
                "message": "Adjustment created and pending approval"
            })))
        }
        Err(e) => {
            tracing::error!("Failed to create adjustment: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create adjustment"
            })))
        }
    }
}

/// List adjustments with filters
pub async fn list_adjustments(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    query: web::Query<AdjustmentFilters>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let limit = query.limit.unwrap_or(50);
    let offset = query.offset.unwrap_or(0);

    let rows = sqlx::query!(
        r#"
        SELECT id, session_id, product_id, store_id, quantity_before, quantity_after,
               (quantity_after - quantity_before) as adjustment_qty,
               adjustment_type, reason, status, created_by_user_id, 
               approved_by_user_id, approved_at, created_at
        FROM inventory_adjustments
        WHERE tenant_id = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        "#,
        tenant_id,
        limit,
        offset
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(adjustments) => {
            let response: Vec<AdjustmentResponse> = adjustments
                .into_iter()
                .map(|row| AdjustmentResponse {
                    id: row.id,
                    session_id: row.session_id,
                    product_id: row.product_id,
                    store_id: row.store_id,
                    quantity_before: row.quantity_before,
                    quantity_after: row.quantity_after,
                    adjustment_qty: row.adjustment_qty.unwrap_or(0),
                    adjustment_type: row.adjustment_type,
                    reason: row.reason,
                    status: row.status,
                    created_by_user_id: row.created_by_user_id,
                    approved_by_user_id: row.approved_by_user_id,
                    approved_at: row.approved_at,
                    created_at: row.created_at,
                })
                .collect();

            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            tracing::error!("Failed to list adjustments: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list adjustments"
            })))
        }
    }
}

/// Approve an adjustment
pub async fn approve_adjustment(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    adjustment_id: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let now = Utc::now().to_rfc3339();

    // Get adjustment details
    let adjustment = sqlx::query!(
        "SELECT product_id, quantity_after, status FROM inventory_adjustments WHERE id = ? AND tenant_id = ?",
        adjustment_id.as_str(),
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match adjustment {
        Ok(Some(adj)) if adj.status == "pending" => {
            // Apply adjustment to product
            let _ = sqlx::query!(
                "UPDATE products SET quantity_on_hand = ?, updated_at = ? WHERE id = ?",
                adj.quantity_after,
                now,
                adj.product_id
            )
            .execute(pool.get_ref())
            .await;

            // Update adjustment status
            let result = sqlx::query!(
                r#"
                UPDATE inventory_adjustments 
                SET status = 'approved', 
                    approved_by_user_id = ?, 
                    approved_at = ?,
                    updated_at = ?
                WHERE id = ? AND tenant_id = ?
                "#,
                user_id,
                now,
                now,
                adjustment_id.as_str(),
                tenant_id
            )
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => {
                    audit_logger.log(
                        "inventory_adjustment",
                        &adjustment_id,
                        "approve",
                        Some(user_id),
                        None,
                    ).await;

                    Ok(HttpResponse::Ok().json(serde_json::json!({
                        "status": "approved",
                        "message": "Adjustment approved and applied"
                    })))
                }
                Err(e) => {
                    tracing::error!("Failed to approve adjustment: {}", e);
                    Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to approve adjustment"
                    })))
                }
            }
        }
        Ok(Some(_)) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Adjustment must be pending to approve"
        }))),
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Adjustment not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to verify adjustment: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to verify adjustment"
            })))
        }
    }
}

/// Reject an adjustment
pub async fn reject_adjustment(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    adjustment_id: web::Path<String>,
    body: web::Json<serde_json::Value>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let now = Utc::now().to_rfc3339();
    let reason = body.get("reason").and_then(|v| v.as_str()).unwrap_or("No reason provided");

    let result = sqlx::query!(
        r#"
        UPDATE inventory_adjustments 
        SET status = 'rejected', 
            rejected_by_user_id = ?, 
            rejected_at = ?,
            rejection_reason = ?,
            updated_at = ?
        WHERE id = ? AND tenant_id = ? AND status = 'pending'
        "#,
        user_id,
        now,
        reason,
        now,
        adjustment_id.as_str(),
        tenant_id
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            audit_logger.log(
                "inventory_adjustment",
                &adjustment_id,
                "reject",
                Some(user_id),
                Some(serde_json::json!({ "reason": reason })),
            ).await;

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "status": "rejected",
                "message": "Adjustment rejected"
            })))
        }
        Ok(_) => Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Adjustment not found or not pending"
        }))),
        Err(e) => {
            tracing::error!("Failed to reject adjustment: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to reject adjustment"
            })))
        }
    }
}
