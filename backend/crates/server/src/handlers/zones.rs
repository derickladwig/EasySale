// Zone Management API Endpoints
// CRUD operations for document zones in the review editor

use actix_web::{delete, get, post, put, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;

use crate::middleware::get_current_tenant_id;

/// Zone data structure
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Zone {
    pub id: String,
    pub case_id: String,
    pub tenant_id: String,
    pub name: Option<String>,
    pub zone_type: Option<String>,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub created_at: String,
    pub updated_at: String,
}

/// Zone response (without tenant_id for API)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneResponse {
    pub id: String,
    pub case_id: String,
    pub name: Option<String>,
    pub zone_type: Option<String>,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    pub created_at: String,
    pub updated_at: String,
}

impl From<Zone> for ZoneResponse {
    fn from(zone: Zone) -> Self {
        Self {
            id: zone.id,
            case_id: zone.case_id,
            name: zone.name,
            zone_type: zone.zone_type,
            x: zone.x,
            y: zone.y,
            width: zone.width,
            height: zone.height,
            created_at: zone.created_at,
            updated_at: zone.updated_at,
        }
    }
}

/// Request to create a new zone
#[derive(Debug, Deserialize)]
pub struct CreateZoneRequest {
    pub name: Option<String>,
    pub zone_type: Option<String>,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Request to update a zone
#[derive(Debug, Deserialize)]
pub struct UpdateZoneRequest {
    pub name: Option<String>,
    pub zone_type: Option<String>,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub width: Option<f64>,
    pub height: Option<f64>,
}

/// GET /api/cases/:case_id/zones
/// List all zones for a case
#[get("/api/cases/{case_id}/zones")]
pub async fn list_zones(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let case_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!("Listing zones for case: {}", case_id);

    let result = sqlx::query_as::<_, Zone>(
        r#"
        SELECT id, case_id, tenant_id, name, zone_type, x, y, width, height, created_at, updated_at
        FROM zones
        WHERE case_id = ? AND tenant_id = ?
        ORDER BY created_at ASC
        "#,
    )
    .bind(&case_id)
    .bind(&tenant_id)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(zones) => {
            let responses: Vec<ZoneResponse> = zones.into_iter().map(ZoneResponse::from).collect();
            HttpResponse::Ok().json(responses)
        }
        Err(e) => {
            tracing::error!("Failed to list zones: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list zones"
            }))
        }
    }
}

/// POST /api/cases/:case_id/zones
/// Create a new zone for a case
#[post("/api/cases/{case_id}/zones")]
pub async fn create_zone(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<CreateZoneRequest>,
) -> impl Responder {
    let case_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    let zone_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    tracing::info!("Creating zone for case: {}", case_id);

    // Verify case exists
    let case_exists = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM review_cases WHERE id = ? AND tenant_id = ?"
    )
    .bind(&case_id)
    .bind(&tenant_id)
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);

    if case_exists == 0 {
        return HttpResponse::NotFound().json(serde_json::json!({
            "error": "Case not found"
        }));
    }

    let result = sqlx::query(
        r#"
        INSERT INTO zones (id, case_id, tenant_id, name, zone_type, x, y, width, height, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&zone_id)
    .bind(&case_id)
    .bind(&tenant_id)
    .bind(&req.name)
    .bind(&req.zone_type)
    .bind(req.x)
    .bind(req.y)
    .bind(req.width)
    .bind(req.height)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            let zone = ZoneResponse {
                id: zone_id,
                case_id,
                name: req.name.clone(),
                zone_type: req.zone_type.clone(),
                x: req.x,
                y: req.y,
                width: req.width,
                height: req.height,
                created_at: now.clone(),
                updated_at: now,
            };
            HttpResponse::Created().json(zone)
        }
        Err(e) => {
            tracing::error!("Failed to create zone: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create zone"
            }))
        }
    }
}

/// GET /api/cases/:case_id/zones/:zone_id
/// Get a specific zone
#[get("/api/cases/{case_id}/zones/{zone_id}")]
pub async fn get_zone(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (case_id, zone_id) = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!("Getting zone {} for case {}", zone_id, case_id);

    let result = sqlx::query_as::<_, Zone>(
        r#"
        SELECT id, case_id, tenant_id, name, zone_type, x, y, width, height, created_at, updated_at
        FROM zones
        WHERE id = ? AND case_id = ? AND tenant_id = ?
        "#,
    )
    .bind(&zone_id)
    .bind(&case_id)
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await;

    match result {
        Ok(Some(zone)) => HttpResponse::Ok().json(ZoneResponse::from(zone)),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Zone not found"
        })),
        Err(e) => {
            tracing::error!("Failed to get zone: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get zone"
            }))
        }
    }
}

/// PUT /api/cases/:case_id/zones/:zone_id
/// Update a zone's bounds or properties
#[put("/api/cases/{case_id}/zones/{zone_id}")]
pub async fn update_zone(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
    req: web::Json<UpdateZoneRequest>,
) -> impl Responder {
    let (case_id, zone_id) = path.into_inner();
    let tenant_id = get_current_tenant_id();
    let now = Utc::now().to_rfc3339();
    
    tracing::info!("Updating zone {} for case {}", zone_id, case_id);

    // Get existing zone
    let existing = sqlx::query_as::<_, Zone>(
        r#"
        SELECT id, case_id, tenant_id, name, zone_type, x, y, width, height, created_at, updated_at
        FROM zones
        WHERE id = ? AND case_id = ? AND tenant_id = ?
        "#,
    )
    .bind(&zone_id)
    .bind(&case_id)
    .bind(&tenant_id)
    .fetch_optional(pool.get_ref())
    .await;

    let existing_zone = match existing {
        Ok(Some(zone)) => zone,
        Ok(None) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Zone not found"
            }));
        }
        Err(e) => {
            tracing::error!("Failed to fetch zone: {:?}", e);
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch zone"
            }));
        }
    };

    // Apply updates
    let name = req.name.clone().or(existing_zone.name);
    let zone_type = req.zone_type.clone().or(existing_zone.zone_type);
    let x = req.x.unwrap_or(existing_zone.x);
    let y = req.y.unwrap_or(existing_zone.y);
    let width = req.width.unwrap_or(existing_zone.width);
    let height = req.height.unwrap_or(existing_zone.height);

    let result = sqlx::query(
        r#"
        UPDATE zones
        SET name = ?, zone_type = ?, x = ?, y = ?, width = ?, height = ?, updated_at = ?
        WHERE id = ? AND case_id = ? AND tenant_id = ?
        "#,
    )
    .bind(&name)
    .bind(&zone_type)
    .bind(x)
    .bind(y)
    .bind(width)
    .bind(height)
    .bind(&now)
    .bind(&zone_id)
    .bind(&case_id)
    .bind(&tenant_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            let zone = ZoneResponse {
                id: zone_id,
                case_id,
                name,
                zone_type,
                x,
                y,
                width,
                height,
                created_at: existing_zone.created_at,
                updated_at: now,
            };
            HttpResponse::Ok().json(zone)
        }
        Err(e) => {
            tracing::error!("Failed to update zone: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update zone"
            }))
        }
    }
}

/// DELETE /api/cases/:case_id/zones/:zone_id
/// Delete a zone
#[delete("/api/cases/{case_id}/zones/{zone_id}")]
pub async fn delete_zone(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
) -> impl Responder {
    let (case_id, zone_id) = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!("Deleting zone {} for case {}", zone_id, case_id);

    let result = sqlx::query(
        "DELETE FROM zones WHERE id = ? AND case_id = ? AND tenant_id = ?"
    )
    .bind(&zone_id)
    .bind(&case_id)
    .bind(&tenant_id)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(rows) => {
            if rows.rows_affected() > 0 {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Zone deleted successfully"
                }))
            } else {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Zone not found"
                }))
            }
        }
        Err(e) => {
            tracing::error!("Failed to delete zone: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to delete zone"
            }))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_zone_response_from_zone() {
        let zone = Zone {
            id: "zone-1".to_string(),
            case_id: "case-1".to_string(),
            tenant_id: "tenant-1".to_string(),
            name: Some("Header".to_string()),
            zone_type: Some("header".to_string()),
            x: 10.0,
            y: 20.0,
            width: 100.0,
            height: 50.0,
            created_at: "2024-01-01T00:00:00Z".to_string(),
            updated_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let response = ZoneResponse::from(zone.clone());
        
        assert_eq!(response.id, zone.id);
        assert_eq!(response.case_id, zone.case_id);
        assert_eq!(response.name, zone.name);
        assert_eq!(response.x, zone.x);
        assert_eq!(response.y, zone.y);
        assert_eq!(response.width, zone.width);
        assert_eq!(response.height, zone.height);
    }
}
