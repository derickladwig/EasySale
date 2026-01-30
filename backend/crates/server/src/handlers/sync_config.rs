/**
 * Sync Configuration Handlers
 * 
 * API endpoints for managing sync direction and configuration.
 */

use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use crate::services::SyncDirectionControl;

/// GET /api/sync/config
/// Get sync configuration for all entities
#[get("/api/sync/config")]
pub async fn get_sync_config(
    pool: web::Data<SqlitePool>,
    query: web::Query<SyncConfigQuery>,
) -> impl Responder {
    tracing::info!("Getting sync configuration");

    let control = SyncDirectionControl::new(pool.get_ref().clone());
    
    if let Some(entity_type) = &query.entity_type {
        // Get config for specific entity
        match control.get_sync_config(entity_type).await {
            Ok(config) => HttpResponse::Ok().json(serde_json::json!({
                "entity_type": entity_type,
                "config": config
            })),
            Err(e) => {
                tracing::error!("Failed to get sync config: {:?}", e);
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to get sync config: {}", e)
                }))
            }
        }
    } else {
        // Get all configs
        #[derive(sqlx::FromRow, Serialize)]
        struct SyncConfigRow {
            entity_type: String,
            sync_direction: String,
            source_of_truth: String,
            conflict_strategy: String,
            auto_sync_enabled: bool,
            sync_interval_minutes: Option<i32>,
        }

        match sqlx::query_as::<_, SyncConfigRow>(
            "SELECT entity_type, sync_direction, source_of_truth, conflict_strategy, 
             auto_sync_enabled, sync_interval_minutes 
             FROM sync_direction_config 
             ORDER BY entity_type"
        )
        .fetch_all(pool.get_ref())
        .await
        {
            Ok(configs) => HttpResponse::Ok().json(serde_json::json!({
                "configs": configs,
                "total": configs.len()
            })),
            Err(e) => {
                tracing::error!("Failed to get sync configs: {:?}", e);
                HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("Failed to get sync configs: {}", e)
                }))
            }
        }
    }
}

/// POST /api/sync/config/direction
/// Set sync direction for an entity type
#[post("/api/sync/config/direction")]
pub async fn set_sync_direction(
    pool: web::Data<SqlitePool>,
    req: web::Json<SetSyncDirectionRequest>,
) -> impl Responder {
    tracing::info!("Setting sync direction for credential {}: {}", req.credential_id, req.direction);

    let control = SyncDirectionControl::new(pool.get_ref().clone());
    
    // Parse direction
    let direction = match req.direction.to_uppercase().as_str() {
        "TWO_WAY" | "BIDIRECTIONAL" => crate::services::sync_direction_control::SyncDirection::TwoWay,
        "ONE_WAY" | "PUSH_ONLY" => crate::services::sync_direction_control::SyncDirection::OneWay,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Invalid direction: {}. Use TWO_WAY or ONE_WAY", req.direction)
            }));
        }
    };
    
    match control.set_sync_direction(&req.credential_id, direction).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Sync direction updated successfully",
            "credential_id": req.credential_id,
            "direction": req.direction
        })),
        Err(e) => {
            tracing::error!("Failed to set sync direction: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to set sync direction: {}", e)
            }))
        }
    }
}

/// POST /api/sync/config/entity
/// Configure sync settings for an entity type
#[post("/api/sync/config/entity")]
pub async fn configure_entity_sync(
    pool: web::Data<SqlitePool>,
    req: web::Json<ConfigureEntitySyncRequest>,
) -> impl Responder {
    tracing::info!("Configuring sync for entity: {}", req.entity_type);

    let now = chrono::Utc::now().to_rfc3339();
    
    // Upsert sync configuration
    match sqlx::query(
        "INSERT INTO sync_direction_config (
            entity_type, sync_direction, source_of_truth, conflict_strategy,
            auto_sync_enabled, sync_interval_minutes, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(entity_type) DO UPDATE SET
            sync_direction = excluded.sync_direction,
            source_of_truth = excluded.source_of_truth,
            conflict_strategy = excluded.conflict_strategy,
            auto_sync_enabled = excluded.auto_sync_enabled,
            sync_interval_minutes = excluded.sync_interval_minutes,
            updated_at = excluded.updated_at"
    )
    .bind(&req.entity_type)
    .bind(&req.sync_direction)
    .bind(&req.source_of_truth)
    .bind(&req.conflict_strategy)
    .bind(req.auto_sync_enabled)
    .bind(req.sync_interval_minutes)
    .bind(&now)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "message": "Entity sync configuration updated successfully",
            "entity_type": req.entity_type
        })),
        Err(e) => {
            tracing::error!("Failed to configure entity sync: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to configure entity sync: {}", e)
            }))
        }
    }
}

/// GET /api/sync/config/directions
/// Get available sync directions
#[get("/api/sync/config/directions")]
pub async fn get_sync_directions() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "directions": [
            {
                "code": "bidirectional",
                "name": "Bidirectional",
                "description": "Sync changes in both directions"
            },
            {
                "code": "push_only",
                "name": "Push Only",
                "description": "Only push local changes to remote"
            },
            {
                "code": "pull_only",
                "name": "Pull Only",
                "description": "Only pull remote changes to local"
            },
            {
                "code": "disabled",
                "name": "Disabled",
                "description": "No synchronization"
            }
        ]
    }))
}

/// GET /api/sync/config/strategies
/// Get available conflict resolution strategies
#[get("/api/sync/config/strategies")]
pub async fn get_conflict_strategies() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "strategies": [
            {
                "code": "last_write_wins",
                "name": "Last Write Wins",
                "description": "Most recent change takes precedence"
            },
            {
                "code": "source_of_truth",
                "name": "Source of Truth",
                "description": "Designated source always wins"
            },
            {
                "code": "manual",
                "name": "Manual Resolution",
                "description": "Require manual conflict resolution"
            },
            {
                "code": "merge",
                "name": "Merge",
                "description": "Attempt to merge changes automatically"
            }
        ]
    }))
}

/// POST /api/sync/config/test
/// Test sync configuration for an entity
#[post("/api/sync/config/test")]
pub async fn test_sync_config(
    pool: web::Data<SqlitePool>,
    req: web::Json<TestSyncConfigRequest>,
) -> impl Responder {
    tracing::info!("Testing sync config for entity: {}", req.entity_type);

    let control = SyncDirectionControl::new(pool.get_ref().clone());
    
    // Check if entity should sync (using empty hash for test)
    let test_hash = "test_hash_placeholder";
    match control.should_sync(&req.entity_type, &req.entity_id, test_hash).await {
        Ok(should_sync) => {
            HttpResponse::Ok().json(serde_json::json!({
                "entity_type": req.entity_type,
                "entity_id": req.entity_id,
                "should_sync": should_sync,
                "test_result": if should_sync { "pass" } else { "skip" },
                "note": "Test uses placeholder hash"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to test sync config: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to test sync config: {}", e)
            }))
        }
    }
}

/// GET /api/sync/config/stats
/// Get sync configuration statistics
#[get("/api/sync/config/stats")]
pub async fn get_sync_config_stats(pool: web::Data<SqlitePool>) -> impl Responder {
    tracing::info!("Getting sync configuration statistics");

    #[derive(sqlx::FromRow)]
    struct Stats {
        total_entities: i64,
        bidirectional: i64,
        push_only: i64,
        pull_only: i64,
        disabled: i64,
        auto_sync_enabled: i64,
    }

    match sqlx::query_as::<_, Stats>(
        "SELECT 
            COUNT(*) as total_entities,
            SUM(CASE WHEN sync_direction = 'bidirectional' THEN 1 ELSE 0 END) as bidirectional,
            SUM(CASE WHEN sync_direction = 'push_only' THEN 1 ELSE 0 END) as push_only,
            SUM(CASE WHEN sync_direction = 'pull_only' THEN 1 ELSE 0 END) as pull_only,
            SUM(CASE WHEN sync_direction = 'disabled' THEN 1 ELSE 0 END) as disabled,
            SUM(CASE WHEN auto_sync_enabled = 1 THEN 1 ELSE 0 END) as auto_sync_enabled
         FROM sync_direction_config"
    )
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(stats) => HttpResponse::Ok().json(serde_json::json!({
            "total_entities": stats.total_entities,
            "by_direction": {
                "bidirectional": stats.bidirectional,
                "push_only": stats.push_only,
                "pull_only": stats.pull_only,
                "disabled": stats.disabled
            },
            "auto_sync_enabled": stats.auto_sync_enabled
        })),
        Err(e) => {
            tracing::error!("Failed to get sync config stats: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get sync config stats: {}", e)
            }))
        }
    }
}

// Request types

#[derive(Deserialize)]
pub struct SyncConfigQuery {
    pub entity_type: Option<String>,
}

#[derive(Deserialize)]
pub struct SetSyncDirectionRequest {
    pub credential_id: String,
    pub direction: String,
}

#[derive(Deserialize)]
pub struct ConfigureEntitySyncRequest {
    pub entity_type: String,
    pub sync_direction: String,
    pub source_of_truth: String,
    pub conflict_strategy: String,
    pub auto_sync_enabled: bool,
    pub sync_interval_minutes: Option<i32>,
}

#[derive(Deserialize)]
pub struct TestSyncConfigRequest {
    pub entity_type: String,
    pub entity_id: String,
}
