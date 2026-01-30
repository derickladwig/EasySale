use actix_web::{web, HttpResponse, Responder};
use chrono::Utc;
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::middleware::tenant::get_current_tenant_id;
use crate::models::{CreateStoreRequest, CreateStationRequest, Store, Station, UpdateStoreRequest, UpdateStationRequest};

// ============================================================================
// Store Handlers
// ============================================================================

/// Create a new store
pub async fn create_store(
    pool: web::Data<SqlitePool>,
    store_data: web::Json<CreateStoreRequest>,
) -> impl Responder {
    // Validate request
    if let Err(e) = store_data.validate() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": e
        }));
    }

    let store_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let timezone = store_data.timezone.clone().unwrap_or_else(|| "America/Toronto".to_string());
    let currency = store_data.currency.clone().unwrap_or_else(|| "CAD".to_string());

    let result = sqlx::query(
        r#"
        INSERT INTO stores (
            id, tenant_id, name, address, city, state, zip, phone, email,
            timezone, currency, receipt_footer, is_active,
            created_at, updated_at, sync_version
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 1)
        "#
    )
    .bind(&store_id)
    .bind(&get_current_tenant_id())
    .bind(&store_data.name)
    .bind(&store_data.address)
    .bind(&store_data.city)
    .bind(&store_data.state)
    .bind(&store_data.zip)
    .bind(&store_data.phone)
    .bind(&store_data.email)
    .bind(&timezone)
    .bind(&currency)
    .bind(&store_data.receipt_footer)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Fetch the created store
            match sqlx::query_as::<_, Store>("SELECT * FROM stores WHERE id = ? AND tenant_id = ?")
                .bind(&store_id)
                .bind(&get_current_tenant_id())
                .fetch_one(pool.get_ref())
                .await
            {
                Ok(store) => HttpResponse::Created().json(store),
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to fetch created store: {}", e)
                })),
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create store: {}", e)
        })),
    }
}

/// Get all stores
pub async fn get_stores(pool: web::Data<SqlitePool>) -> impl Responder {
    match sqlx::query_as::<_, Store>("SELECT * FROM stores WHERE tenant_id = ? ORDER BY name")
        .bind(&get_current_tenant_id())
        .fetch_all(pool.get_ref())
        .await
    {
        Ok(stores) => HttpResponse::Ok().json(stores),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch stores: {}", e)
        })),
    }
}

/// Get a single store by ID
pub async fn get_store(pool: web::Data<SqlitePool>, path: web::Path<String>) -> impl Responder {
    let store_id = path.into_inner();

    match sqlx::query_as::<_, Store>("SELECT * FROM stores WHERE id = ? AND tenant_id = ?")
        .bind(&store_id)
        .bind(&get_current_tenant_id())
        .fetch_one(pool.get_ref())
        .await
    {
        Ok(store) => HttpResponse::Ok().json(store),
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Store not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch store: {}", e)
        })),
    }
}

/// Update a store
pub async fn update_store(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    store_data: web::Json<UpdateStoreRequest>,
) -> impl Responder {
    let store_id = path.into_inner();
    let now = Utc::now().to_rfc3339();

    // Fetch existing store
    let existing_store = match sqlx::query_as::<_, Store>("SELECT * FROM stores WHERE id = ? AND tenant_id = ?")
        .bind(&store_id)
        .bind(&get_current_tenant_id())
        .fetch_one(pool.get_ref())
        .await
    {
        Ok(store) => store,
        Err(sqlx::Error::RowNotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Store not found"
            }))
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch store: {}", e)
            }))
        }
    };

    // Update fields
    let name = store_data.name.clone().unwrap_or(existing_store.name);
    let address = store_data.address.clone().or(existing_store.address);
    let city = store_data.city.clone().or(existing_store.city);
    let state = store_data.state.clone().or(existing_store.state);
    let zip = store_data.zip.clone().or(existing_store.zip);
    let phone = store_data.phone.clone().or(existing_store.phone);
    let email = store_data.email.clone().or(existing_store.email);
    let timezone = store_data.timezone.clone().unwrap_or(existing_store.timezone);
    let currency = store_data.currency.clone().unwrap_or(existing_store.currency);
    let receipt_footer = store_data.receipt_footer.clone().or(existing_store.receipt_footer);
    let is_active = store_data.is_active.unwrap_or(existing_store.is_active);

    let result = sqlx::query(
        r#"
        UPDATE stores
        SET name = ?, address = ?, city = ?, state = ?, zip = ?,
            phone = ?, email = ?, timezone = ?, currency = ?,
            receipt_footer = ?, is_active = ?, updated_at = ?,
            sync_version = sync_version + 1
        WHERE id = ? AND tenant_id = ?
        "#
    )
    .bind(&name)
    .bind(&address)
    .bind(&city)
    .bind(&state)
    .bind(&zip)
    .bind(&phone)
    .bind(&email)
    .bind(&timezone)
    .bind(&currency)
    .bind(&receipt_footer)
    .bind(is_active)
    .bind(&now)
    .bind(&store_id)
    .bind(&get_current_tenant_id())
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Fetch updated store
            match sqlx::query_as::<_, Store>("SELECT * FROM stores WHERE id = ? AND tenant_id = ?")
                .bind(&store_id)
                .bind(&get_current_tenant_id())
                .fetch_one(pool.get_ref())
                .await
            {
                Ok(store) => HttpResponse::Ok().json(store),
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to fetch updated store: {}", e)
                })),
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to update store: {}", e)
        })),
    }
}

/// Delete a store (soft delete by setting is_active = false)
pub async fn delete_store(pool: web::Data<SqlitePool>, path: web::Path<String>) -> impl Responder {
    let store_id = path.into_inner();
    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        r#"
        UPDATE stores
        SET is_active = 0, updated_at = ?, sync_version = sync_version + 1
        WHERE id = ? AND tenant_id = ?
        "#
    )
    .bind(&now)
    .bind(&store_id)
    .bind(&get_current_tenant_id())
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(result) => {
            if result.rows_affected() == 0 {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Store not found"
                }))
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Store deleted successfully"
                }))
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to delete store: {}", e)
        })),
    }
}

// ============================================================================
// Station Handlers
// ============================================================================

/// Create a new station
pub async fn create_station(
    pool: web::Data<SqlitePool>,
    station_data: web::Json<CreateStationRequest>,
) -> impl Responder {
    // Validate request
    if let Err(e) = station_data.validate() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": e
        }));
    }

    // Check if store exists
    let store_exists = sqlx::query("SELECT id FROM stores WHERE id = ?")
        .bind(&station_data.store_id)
        .fetch_optional(pool.get_ref())
        .await;

    match store_exists {
        Ok(None) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Store not found"
            }))
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to check store: {}", e)
            }))
        }
        _ => {}
    }

    let station_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let offline_mode = station_data.offline_mode_enabled.unwrap_or(false);

    let result = sqlx::query(
        r#"
        INSERT INTO stations (
            id, tenant_id, store_id, name, device_id, ip_address,
            is_active, offline_mode_enabled, created_at, updated_at, sync_version
        )
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 1)
        "#
    )
    .bind(&station_id)
    .bind(&get_current_tenant_id())
    .bind(&station_data.store_id)
    .bind(&station_data.name)
    .bind(&station_data.device_id)
    .bind(&station_data.ip_address)
    .bind(offline_mode)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Fetch the created station
            match sqlx::query_as::<_, Station>("SELECT * FROM stations WHERE id = ? AND tenant_id = ?")
                .bind(&station_id)
                .bind(&get_current_tenant_id())
                .fetch_one(pool.get_ref())
                .await
            {
                Ok(station) => HttpResponse::Created().json(station),
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to fetch created station: {}", e)
                })),
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to create station: {}", e)
        })),
    }
}

/// Get all stations (optionally filtered by store)
pub async fn get_stations(
    pool: web::Data<SqlitePool>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let store_id = query.get("store_id");

    let stations = if let Some(store_id) = store_id {
        sqlx::query_as::<_, Station>("SELECT * FROM stations WHERE store_id = ? AND tenant_id = ? ORDER BY name")
            .bind(store_id)
            .bind(&get_current_tenant_id())
            .fetch_all(pool.get_ref())
            .await
    } else {
        sqlx::query_as::<_, Station>("SELECT * FROM stations WHERE tenant_id = ? ORDER BY name")
            .bind(&get_current_tenant_id())
            .fetch_all(pool.get_ref())
            .await
    };

    match stations {
        Ok(stations) => HttpResponse::Ok().json(stations),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch stations: {}", e)
        })),
    }
}

/// Get a single station by ID
pub async fn get_station(pool: web::Data<SqlitePool>, path: web::Path<String>) -> impl Responder {
    let station_id = path.into_inner();

    match sqlx::query_as::<_, Station>("SELECT * FROM stations WHERE id = ? AND tenant_id = ?")
        .bind(&station_id)
        .bind(&get_current_tenant_id())
        .fetch_one(pool.get_ref())
        .await
    {
        Ok(station) => HttpResponse::Ok().json(station),
        Err(sqlx::Error::RowNotFound) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Station not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch station: {}", e)
        })),
    }
}

/// Update a station
pub async fn update_station(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    station_data: web::Json<UpdateStationRequest>,
) -> impl Responder {
    let station_id = path.into_inner();
    let now = Utc::now().to_rfc3339();

    // Fetch existing station
    let existing_station = match sqlx::query_as::<_, Station>("SELECT * FROM stations WHERE id = ? AND tenant_id = ?")
        .bind(&station_id)
        .bind(&get_current_tenant_id())
        .fetch_one(pool.get_ref())
        .await
    {
        Ok(station) => station,
        Err(sqlx::Error::RowNotFound) => {
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Station not found"
            }))
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to fetch station: {}", e)
            }))
        }
    };

    // Update fields
    let name = station_data.name.clone().unwrap_or(existing_station.name);
    let device_id = station_data.device_id.clone().or(existing_station.device_id);
    let ip_address = station_data.ip_address.clone().or(existing_station.ip_address);
    let is_active = station_data.is_active.unwrap_or(existing_station.is_active);
    let offline_mode = station_data.offline_mode_enabled.unwrap_or(existing_station.offline_mode_enabled);

    let result = sqlx::query(
        r#"
        UPDATE stations
        SET name = ?, device_id = ?, ip_address = ?, is_active = ?,
            offline_mode_enabled = ?, updated_at = ?, sync_version = sync_version + 1
        WHERE id = ? AND tenant_id = ?
        "#
    )
    .bind(&name)
    .bind(&device_id)
    .bind(&ip_address)
    .bind(is_active)
    .bind(offline_mode)
    .bind(&now)
    .bind(&station_id)
    .bind(&get_current_tenant_id())
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(_) => {
            // Fetch updated station
            match sqlx::query_as::<_, Station>("SELECT * FROM stations WHERE id = ? AND tenant_id = ?")
                .bind(&station_id)
                .bind(&get_current_tenant_id())
                .fetch_one(pool.get_ref())
                .await
            {
                Ok(station) => HttpResponse::Ok().json(station),
                Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to fetch updated station: {}", e)
                })),
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to update station: {}", e)
        })),
    }
}

/// Delete a station (soft delete by setting is_active = false)
pub async fn delete_station(pool: web::Data<SqlitePool>, path: web::Path<String>) -> impl Responder {
    let station_id = path.into_inner();
    let now = Utc::now().to_rfc3339();

    let result = sqlx::query(
        r#"
        UPDATE stations
        SET is_active = 0, updated_at = ?, sync_version = sync_version + 1
        WHERE id = ? AND tenant_id = ?
        "#
    )
    .bind(&now)
    .bind(&station_id)
    .bind(&get_current_tenant_id())
    .execute(pool.get_ref())
    .await;

    match result {
        Ok(result) => {
            if result.rows_affected() == 0 {
                HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Station not found"
                }))
            } else {
                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Station deleted successfully"
                }))
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to delete station: {}", e)
        })),
    }
}
