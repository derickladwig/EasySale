//! Bin Location Management API Handlers
//!
//! Provides REST endpoints for warehouse bin location management:
//! - Bin location CRUD
//! - Zone management
//! - Product-bin assignment
//! - Location history tracking
//!
//! Ported from POS project's bin location feature.

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
pub struct CreateBinLocationRequest {
    pub store_id: String,
    pub code: String,
    pub name: Option<String>,
    pub zone: Option<String>,
    pub aisle: Option<String>,
    pub shelf: Option<String>,
    pub bin: Option<String>,
    pub description: Option<String>,
    pub bin_type: Option<String>,
    pub max_capacity: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateBinLocationRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub bin_type: Option<String>,
    pub max_capacity: Option<i32>,
    pub active: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct BinLocationResponse {
    pub id: String,
    pub store_id: String,
    pub code: String,
    pub name: Option<String>,
    pub zone: Option<String>,
    pub aisle: Option<String>,
    pub shelf: Option<String>,
    pub bin: Option<String>,
    pub description: Option<String>,
    pub bin_type: String,
    pub max_capacity: Option<i32>,
    pub current_count: i32,
    pub active: bool,
    pub created_at: String,
    pub updated_at: String,
    pub product_count: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct BinLocationFilters {
    pub store_id: Option<String>,
    pub zone: Option<String>,
    pub bin_type: Option<String>,
    pub active: Option<bool>,
    pub limit: Option<i32>,
    pub offset: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateZoneRequest {
    pub store_id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub zone_type: Option<String>,
    pub sort_order: Option<i32>,
}

#[derive(Debug, Serialize)]
pub struct ZoneResponse {
    pub id: String,
    pub store_id: String,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub zone_type: String,
    pub sort_order: i32,
    pub active: bool,
    pub bin_count: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct AssignProductToBinRequest {
    pub product_id: String,
    pub bin_location: String,
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct BulkAssignRequest {
    pub assignments: Vec<AssignProductToBinRequest>,
}

#[derive(Debug, Serialize)]
pub struct ProductInBinResponse {
    pub product_id: String,
    pub product_name: String,
    pub product_sku: String,
    pub quantity_on_hand: i32,
    pub bin_location: String,
}

#[derive(Debug, Serialize)]
pub struct BinHistoryResponse {
    pub id: String,
    pub product_id: String,
    pub from_bin_location: Option<String>,
    pub to_bin_location: Option<String>,
    pub quantity_moved: i32,
    pub moved_by_user_id: Option<String>,
    pub moved_at: String,
    pub reason: Option<String>,
}

// ============================================================================
// BIN LOCATION HANDLERS
// ============================================================================

/// Create a new bin location
pub async fn create_bin_location(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    body: web::Json<CreateBinLocationRequest>,
) -> Result<HttpResponse> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let bin_type = body.bin_type.as_deref().unwrap_or("standard");

    let result = sqlx::query!(
        r#"
        INSERT INTO bin_locations 
        (id, tenant_id, store_id, code, name, zone, aisle, shelf, bin, 
         description, bin_type, max_capacity, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        id,
        tenant_id,
        body.store_id,
        body.code,
        body.name,
        body.zone,
        body.aisle,
        body.shelf,
        body.bin,
        body.description,
        bin_type,
        body.max_capacity,
        now,
        now
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            audit_logger.log(
                "bin_location",
                &id,
                "create",
                context.user_id.as_deref(),
                Some(serde_json::json!({
                    "code": body.code,
                    "store_id": body.store_id,
                })),
            ).await;

            Ok(HttpResponse::Created().json(serde_json::json!({
                "id": id,
                "code": body.code,
                "message": "Bin location created"
            })))
        }
        Err(e) if e.to_string().contains("UNIQUE constraint") => {
            Ok(HttpResponse::Conflict().json(serde_json::json!({
                "error": "Bin location code already exists for this store"
            })))
        }
        Err(e) => {
            tracing::error!("Failed to create bin location: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create bin location"
            })))
        }
    }
}

/// List bin locations with filters
pub async fn list_bin_locations(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    query: web::Query<BinLocationFilters>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let limit = query.limit.unwrap_or(100);
    let offset = query.offset.unwrap_or(0);

    let rows = sqlx::query!(
        r#"
        SELECT 
            b.id, b.store_id, b.code, b.name, b.zone, b.aisle, b.shelf, b.bin,
            b.description, b.bin_type, b.max_capacity, b.current_count, b.active,
            b.created_at, b.updated_at,
            (SELECT COUNT(*) FROM products p WHERE p.bin_location = b.code AND p.tenant_id = b.tenant_id) as product_count
        FROM bin_locations b
        WHERE b.tenant_id = ?
        ORDER BY b.zone, b.aisle, b.shelf, b.bin
        LIMIT ? OFFSET ?
        "#,
        tenant_id,
        limit,
        offset
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(bins) => {
            let response: Vec<BinLocationResponse> = bins
                .into_iter()
                .map(|row| BinLocationResponse {
                    id: row.id,
                    store_id: row.store_id,
                    code: row.code,
                    name: row.name,
                    zone: row.zone,
                    aisle: row.aisle,
                    shelf: row.shelf,
                    bin: row.bin,
                    description: row.description,
                    bin_type: row.bin_type.unwrap_or_else(|| "standard".to_string()),
                    max_capacity: row.max_capacity,
                    current_count: row.current_count.unwrap_or(0),
                    active: row.active != 0,
                    created_at: row.created_at,
                    updated_at: row.updated_at,
                    product_count: row.product_count,
                })
                .collect();

            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            tracing::error!("Failed to list bin locations: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list bin locations"
            })))
        }
    }
}

/// Get a single bin location
pub async fn get_bin_location(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    bin_id: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");

    let result = sqlx::query!(
        r#"
        SELECT 
            b.id, b.store_id, b.code, b.name, b.zone, b.aisle, b.shelf, b.bin,
            b.description, b.bin_type, b.max_capacity, b.current_count, b.active,
            b.created_at, b.updated_at,
            (SELECT COUNT(*) FROM products p WHERE p.bin_location = b.code AND p.tenant_id = b.tenant_id) as product_count
        FROM bin_locations b
        WHERE b.id = ? AND b.tenant_id = ?
        "#,
        bin_id.as_str(),
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(row)) => {
            Ok(HttpResponse::Ok().json(BinLocationResponse {
                id: row.id,
                store_id: row.store_id,
                code: row.code,
                name: row.name,
                zone: row.zone,
                aisle: row.aisle,
                shelf: row.shelf,
                bin: row.bin,
                description: row.description,
                bin_type: row.bin_type.unwrap_or_else(|| "standard".to_string()),
                max_capacity: row.max_capacity,
                current_count: row.current_count.unwrap_or(0),
                active: row.active != 0,
                created_at: row.created_at,
                updated_at: row.updated_at,
                product_count: row.product_count,
            }))
        }
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Bin location not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to get bin location: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get bin location"
            })))
        }
    }
}

/// Update a bin location
pub async fn update_bin_location(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    bin_id: web::Path<String>,
    body: web::Json<UpdateBinLocationRequest>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let now = Utc::now().to_rfc3339();

    let result = sqlx::query!(
        r#"
        UPDATE bin_locations 
        SET name = COALESCE(?, name),
            description = COALESCE(?, description),
            bin_type = COALESCE(?, bin_type),
            max_capacity = COALESCE(?, max_capacity),
            active = COALESCE(?, active),
            updated_at = ?
        WHERE id = ? AND tenant_id = ?
        "#,
        body.name,
        body.description,
        body.bin_type,
        body.max_capacity,
        body.active.map(|b| if b { 1 } else { 0 }),
        now,
        bin_id.as_str(),
        tenant_id
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            audit_logger.log(
                "bin_location",
                &bin_id,
                "update",
                context.user_id.as_deref(),
                None,
            ).await;

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Bin location updated"
            })))
        }
        Ok(_) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Bin location not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to update bin location: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update bin location"
            })))
        }
    }
}

/// Delete a bin location (only if no products assigned)
pub async fn delete_bin_location(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    bin_id: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");

    // Check if any products are assigned to this bin
    let bin = sqlx::query!(
        r#"
        SELECT b.code, 
               (SELECT COUNT(*) FROM products p WHERE p.bin_location = b.code AND p.tenant_id = b.tenant_id) as product_count
        FROM bin_locations b
        WHERE b.id = ? AND b.tenant_id = ?
        "#,
        bin_id.as_str(),
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    match bin {
        Ok(Some(b)) if b.product_count.unwrap_or(0) > 0 => {
            Ok(HttpResponse::Conflict().json(serde_json::json!({
                "error": "Cannot delete bin location with assigned products",
                "product_count": b.product_count
            })))
        }
        Ok(Some(_)) => {
            let result = sqlx::query!(
                "DELETE FROM bin_locations WHERE id = ? AND tenant_id = ?",
                bin_id.as_str(),
                tenant_id
            )
            .execute(pool.get_ref())
            .await;

            match result {
                Ok(_) => {
                    audit_logger.log(
                        "bin_location",
                        &bin_id,
                        "delete",
                        context.user_id.as_deref(),
                        None,
                    ).await;

                    Ok(HttpResponse::Ok().json(serde_json::json!({
                        "message": "Bin location deleted"
                    })))
                }
                Err(e) => {
                    tracing::error!("Failed to delete bin location: {}", e);
                    Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to delete bin location"
                    })))
                }
            }
        }
        Ok(None) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Bin location not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to check bin location: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to check bin location"
            })))
        }
    }
}

/// Get products in a specific bin
pub async fn get_products_in_bin(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    bin_code: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");

    let products = sqlx::query!(
        r#"
        SELECT id, name, sku, COALESCE(quantity_on_hand, 0) as quantity_on_hand, bin_location
        FROM products
        WHERE bin_location = ? AND tenant_id = ?
        ORDER BY name
        "#,
        bin_code.as_str(),
        tenant_id
    )
    .fetch_all(pool.get_ref())
    .await;

    match products {
        Ok(rows) => {
            let response: Vec<ProductInBinResponse> = rows
                .into_iter()
                .map(|row| ProductInBinResponse {
                    product_id: row.id,
                    product_name: row.name,
                    product_sku: row.sku,
                    quantity_on_hand: row.quantity_on_hand.unwrap_or(0),
                    bin_location: row.bin_location.unwrap_or_default(),
                })
                .collect();

            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            tracing::error!("Failed to get products in bin: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get products in bin"
            })))
        }
    }
}

/// Assign a product to a bin location
pub async fn assign_product_to_bin(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    body: web::Json<AssignProductToBinRequest>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let now = Utc::now().to_rfc3339();

    // Get current bin location for history
    let current = sqlx::query!(
        "SELECT bin_location FROM products WHERE id = ? AND tenant_id = ?",
        body.product_id,
        tenant_id
    )
    .fetch_optional(pool.get_ref())
    .await;

    let from_bin = match current {
        Ok(Some(row)) => row.bin_location,
        _ => None,
    };

    // Update product bin location
    let result = sqlx::query!(
        "UPDATE products SET bin_location = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
        body.bin_location,
        now,
        body.product_id,
        tenant_id
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(r) if r.rows_affected() > 0 => {
            // Record history
            let history_id = Uuid::new_v4().to_string();
            let _ = sqlx::query!(
                r#"
                INSERT INTO bin_location_history 
                (id, tenant_id, product_id, from_bin_location, to_bin_location, 
                 moved_by_user_id, moved_at, reason, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                "#,
                history_id,
                tenant_id,
                body.product_id,
                from_bin,
                body.bin_location,
                user_id,
                now,
                body.reason,
                now
            )
            .execute(pool.get_ref())
            .await;

            audit_logger.log(
                "product",
                &body.product_id,
                "assign_bin",
                Some(user_id),
                Some(serde_json::json!({
                    "from": from_bin,
                    "to": body.bin_location,
                })),
            ).await;

            Ok(HttpResponse::Ok().json(serde_json::json!({
                "message": "Product assigned to bin",
                "product_id": body.product_id,
                "bin_location": body.bin_location
            })))
        }
        Ok(_) => Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Product not found"
        }))),
        Err(e) => {
            tracing::error!("Failed to assign product to bin: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to assign product to bin"
            })))
        }
    }
}

/// Bulk assign products to bins
pub async fn bulk_assign_products(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    body: web::Json<BulkAssignRequest>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let now = Utc::now().to_rfc3339();

    let mut success_count = 0;
    let mut error_count = 0;

    for assignment in &body.assignments {
        let result = sqlx::query!(
            "UPDATE products SET bin_location = ?, updated_at = ? WHERE id = ? AND tenant_id = ?",
            assignment.bin_location,
            now,
            assignment.product_id,
            tenant_id
        )
        .execute(pool.get_ref())
        .await;

        match result {
            Ok(r) if r.rows_affected() > 0 => {
                success_count += 1;
                
                // Record history
                let history_id = Uuid::new_v4().to_string();
                let _ = sqlx::query!(
                    r#"
                    INSERT INTO bin_location_history 
                    (id, tenant_id, product_id, to_bin_location, moved_by_user_id, moved_at, reason, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    "#,
                    history_id,
                    tenant_id,
                    assignment.product_id,
                    assignment.bin_location,
                    user_id,
                    now,
                    assignment.reason,
                    now
                )
                .execute(pool.get_ref())
                .await;
            }
            _ => error_count += 1,
        }
    }

    audit_logger.log(
        "bin_location",
        "bulk",
        "bulk_assign",
        Some(user_id),
        Some(serde_json::json!({
            "success_count": success_count,
            "error_count": error_count,
        })),
    ).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Bulk assignment completed",
        "success_count": success_count,
        "error_count": error_count
    })))
}

// ============================================================================
// ZONE HANDLERS
// ============================================================================

/// Create a new zone
pub async fn create_zone(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    body: web::Json<CreateZoneRequest>,
) -> Result<HttpResponse> {
    let id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");
    let zone_type = body.zone_type.as_deref().unwrap_or("storage");
    let sort_order = body.sort_order.unwrap_or(0);

    let result = sqlx::query!(
        r#"
        INSERT INTO bin_zones 
        (id, tenant_id, store_id, code, name, description, color, zone_type, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
        id,
        tenant_id,
        body.store_id,
        body.code,
        body.name,
        body.description,
        body.color,
        zone_type,
        sort_order,
        now,
        now
    )
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            audit_logger.log(
                "bin_zone",
                &id,
                "create",
                context.user_id.as_deref(),
                Some(serde_json::json!({
                    "code": body.code,
                    "name": body.name,
                })),
            ).await;

            Ok(HttpResponse::Created().json(serde_json::json!({
                "id": id,
                "code": body.code,
                "message": "Zone created"
            })))
        }
        Err(e) if e.to_string().contains("UNIQUE constraint") => {
            Ok(HttpResponse::Conflict().json(serde_json::json!({
                "error": "Zone code already exists for this store"
            })))
        }
        Err(e) => {
            tracing::error!("Failed to create zone: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create zone"
            })))
        }
    }
}

/// List zones
pub async fn list_zones(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    query: web::Query<BinLocationFilters>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");

    let rows = sqlx::query!(
        r#"
        SELECT 
            z.id, z.store_id, z.code, z.name, z.description, z.color, 
            z.zone_type, z.sort_order, z.active,
            (SELECT COUNT(*) FROM bin_locations b WHERE b.zone = z.code AND b.tenant_id = z.tenant_id) as bin_count
        FROM bin_zones z
        WHERE z.tenant_id = ?
        ORDER BY z.sort_order, z.code
        "#,
        tenant_id
    )
    .fetch_all(pool.get_ref())
    .await;

    match rows {
        Ok(zones) => {
            let response: Vec<ZoneResponse> = zones
                .into_iter()
                .map(|row| ZoneResponse {
                    id: row.id,
                    store_id: row.store_id,
                    code: row.code,
                    name: row.name,
                    description: row.description,
                    color: row.color,
                    zone_type: row.zone_type.unwrap_or_else(|| "storage".to_string()),
                    sort_order: row.sort_order.unwrap_or(0),
                    active: row.active != 0,
                    bin_count: row.bin_count,
                })
                .collect();

            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            tracing::error!("Failed to list zones: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list zones"
            })))
        }
    }
}

/// Get bin location history for a product
pub async fn get_bin_history(
    pool: web::Data<SqlitePool>,
    context: web::ReqData<UserContext>,
    product_id: web::Path<String>,
) -> Result<HttpResponse> {
    let tenant_id = context.tenant_id.as_deref().unwrap_or("default");

    let history = sqlx::query!(
        r#"
        SELECT id, product_id, from_bin_location, to_bin_location, 
               quantity_moved, moved_by_user_id, moved_at, reason
        FROM bin_location_history
        WHERE product_id = ? AND tenant_id = ?
        ORDER BY moved_at DESC
        LIMIT 50
        "#,
        product_id.as_str(),
        tenant_id
    )
    .fetch_all(pool.get_ref())
    .await;

    match history {
        Ok(rows) => {
            let response: Vec<BinHistoryResponse> = rows
                .into_iter()
                .map(|row| BinHistoryResponse {
                    id: row.id,
                    product_id: row.product_id,
                    from_bin_location: row.from_bin_location,
                    to_bin_location: row.to_bin_location,
                    quantity_moved: row.quantity_moved.unwrap_or(1),
                    moved_by_user_id: row.moved_by_user_id,
                    moved_at: row.moved_at,
                    reason: row.reason,
                })
                .collect();

            Ok(HttpResponse::Ok().json(response))
        }
        Err(e) => {
            tracing::error!("Failed to get bin history: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get bin history"
            })))
        }
    }
}
