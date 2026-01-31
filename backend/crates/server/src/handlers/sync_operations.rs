/**
 * Sync Operations Handlers
 * 
 * API endpoints for triggering, monitoring, and retrying sync operations.
 */

use actix_web::{get, post, web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;
use uuid::Uuid;

use crate::models::UserContext;
use crate::services::SyncOrchestrator;
use crate::services::dry_run_executor::DryRunExecutor;
use crate::services::bulk_operation_safety::{BulkOperationSafety, OperationType, ChangeDescription};

/// POST /api/sync/{entity}
/// Trigger sync for a specific entity type
#[post("/api/sync/{entity}")]
pub async fn trigger_sync(
    pool: web::Data<SqlitePool>,
    orchestrator: web::Data<Arc<SyncOrchestrator>>,
    user_ctx: web::ReqData<UserContext>,
    path: web::Path<String>,
    req: web::Json<TriggerSyncRequest>,
) -> impl Responder {
    let entity = path.into_inner();
    tracing::info!("Triggering sync for entity: {}, mode: {}", entity, req.mode);

    // Validate entity type
    let valid_entities = vec!["orders", "customers", "products", "invoices", "payments"];
    if !valid_entities.contains(&entity.as_str()) {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Invalid entity type: {}. Valid types: {:?}", entity, valid_entities)
        }));
    }

    // Generate sync ID
    let sync_id = req.idempotency_key.clone().unwrap_or_else(|| Uuid::new_v4().to_string());

    // Check if this sync is already running
    if let Ok(existing) = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM sync_queue WHERE sync_id = ? AND status IN ('pending', 'running')"
    )
    .bind(&sync_id)
    .fetch_one(pool.get_ref())
    .await
    {
        if existing > 0 {
            return HttpResponse::Conflict().json(serde_json::json!({
                "error": "Sync with this idempotency key is already running",
                "sync_id": sync_id
            }));
        }
    }

    // If dry run, just return preview
    if req.dry_run {
        return HttpResponse::Ok().json(serde_json::json!({
            "sync_id": sync_id,
            "status": "dry_run",
            "mode": req.mode,
            "entity": entity,
            "message": "Dry run mode - no actual sync will be performed. Use POST /api/sync/dry-run for preview.",
            "started_at": chrono::Utc::now().to_rfc3339()
        }));
    }

    // Extract tenant_id from auth context
    let tenant_id = user_ctx.tenant_id.clone();
    let mode = req.mode.as_str();
    let filters_json = serde_json::to_string(&req.filters).unwrap_or_else(|_| "{}".to_string());
    let ids_json = serde_json::to_string(&req.ids).unwrap_or_else(|_| "[]".to_string());

    match sqlx::query(
        "INSERT INTO sync_queue (id, sync_id, tenant_id, entity_type, operation, status, mode, filters, entity_ids, created_at)
         VALUES (?, ?, ?, ?, 'sync', 'pending', ?, ?, ?, CURRENT_TIMESTAMP)"
    )
    .bind(Uuid::new_v4().to_string())
    .bind(&sync_id)
    .bind(&tenant_id)
    .bind(&entity)
    .bind(mode)
    .bind(&filters_json)
    .bind(&ids_json)
    .execute(pool.get_ref())
    .await
    {
        Ok(_) => {
            // Trigger async sync in background
            let orchestrator_clone = Arc::clone(&orchestrator);
            let tenant_id_clone = tenant_id.clone();
            let entity_clone = entity.clone();
            let mode_clone = req.mode.clone();
            
            tokio::spawn(async move {
                let options = crate::services::sync_orchestrator::SyncOptions {
                    mode: if mode_clone == "full" {
                        crate::services::sync_orchestrator::SyncMode::Full
                    } else {
                        crate::services::sync_orchestrator::SyncMode::Incremental
                    },
                    dry_run: false,
                    entity_types: Some(vec![entity_clone.clone()]),
                    date_range: None,
                    filters: std::collections::HashMap::new(),
                };
                
                // Use entity as connector_id for now
                if let Err(e) = orchestrator_clone.start_sync(&tenant_id_clone, &entity_clone, options).await {
                    tracing::error!("Sync failed for {}: {:?}", entity_clone, e);
                }
            });

            HttpResponse::Accepted().json(serde_json::json!({
                "sync_id": sync_id,
                "status": "queued",
                "mode": req.mode,
                "entity": entity,
                "started_at": chrono::Utc::now().to_rfc3339(),
                "message": "Sync operation queued successfully"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to queue sync: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to queue sync: {}", e)
            }))
        }
    }
}

/// POST /api/sync/woocommerce/orders
/// Trigger WooCommerce orders sync to QuickBooks or Supabase
#[post("/api/sync/woocommerce/orders")]
pub async fn sync_woocommerce_orders(
    _pool: web::Data<SqlitePool>,
    orchestrator: web::Data<Arc<SyncOrchestrator>>,
    user_ctx: web::ReqData<UserContext>,
    req: web::Json<WooCommerceSyncRequest>,
) -> impl Responder {
    tracing::info!("Triggering WooCommerce orders sync to {}", req.target);

    let tenant_id = user_ctx.tenant_id.clone();
    let connector_id = format!("woocommerce-to-{}", req.target);
    
    let options = crate::services::sync_orchestrator::SyncOptions {
        mode: if req.full_sync {
            crate::services::sync_orchestrator::SyncMode::Full
        } else {
            crate::services::sync_orchestrator::SyncMode::Incremental
        },
        dry_run: req.dry_run,
        entity_types: Some(vec!["orders".to_string()]),
        date_range: req.date_range.as_ref().map(|dr| crate::services::sync_orchestrator::DateRange {
            start: dr.start.clone(),
            end: dr.end.clone(),
        }),
        filters: std::collections::HashMap::new(),
    };

    match orchestrator.start_sync(&tenant_id, &connector_id, options).await {
        Ok(result) => HttpResponse::Ok().json(serde_json::json!({
            "sync_id": result.sync_id,
            "status": format!("{:?}", result.status),
            "records_processed": result.records_processed,
            "records_created": result.records_created,
            "records_updated": result.records_updated,
            "records_failed": result.records_failed,
            "duration_ms": result.duration_ms,
            "errors": result.errors.iter().map(|e| serde_json::json!({
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "error": e.error_message
            })).collect::<Vec<_>>()
        })),
        Err(e) => {
            tracing::error!("WooCommerce orders sync failed: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Sync failed: {}", e)
            }))
        }
    }
}

/// POST /api/sync/woocommerce/products
/// Trigger WooCommerce products sync to QuickBooks or Supabase
#[post("/api/sync/woocommerce/products")]
pub async fn sync_woocommerce_products(
    _pool: web::Data<SqlitePool>,
    orchestrator: web::Data<Arc<SyncOrchestrator>>,
    user_ctx: web::ReqData<UserContext>,
    req: web::Json<WooCommerceSyncRequest>,
) -> impl Responder {
    tracing::info!("Triggering WooCommerce products sync to {}", req.target);

    let tenant_id = user_ctx.tenant_id.clone();
    let connector_id = format!("woocommerce-to-{}", req.target);
    
    let options = crate::services::sync_orchestrator::SyncOptions {
        mode: if req.full_sync {
            crate::services::sync_orchestrator::SyncMode::Full
        } else {
            crate::services::sync_orchestrator::SyncMode::Incremental
        },
        dry_run: req.dry_run,
        entity_types: Some(vec!["products".to_string()]),
        date_range: req.date_range.as_ref().map(|dr| crate::services::sync_orchestrator::DateRange {
            start: dr.start.clone(),
            end: dr.end.clone(),
        }),
        filters: std::collections::HashMap::new(),
    };

    match orchestrator.start_sync(&tenant_id, &connector_id, options).await {
        Ok(result) => HttpResponse::Ok().json(serde_json::json!({
            "sync_id": result.sync_id,
            "status": format!("{:?}", result.status),
            "records_processed": result.records_processed,
            "records_created": result.records_created,
            "records_updated": result.records_updated,
            "records_failed": result.records_failed,
            "duration_ms": result.duration_ms,
            "errors": result.errors.iter().map(|e| serde_json::json!({
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "error": e.error_message
            })).collect::<Vec<_>>()
        })),
        Err(e) => {
            tracing::error!("WooCommerce products sync failed: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Sync failed: {}", e)
            }))
        }
    }
}

/// POST /api/sync/woocommerce/customers
/// Trigger WooCommerce customers sync to QuickBooks or Supabase
#[post("/api/sync/woocommerce/customers")]
pub async fn sync_woocommerce_customers(
    _pool: web::Data<SqlitePool>,
    orchestrator: web::Data<Arc<SyncOrchestrator>>,
    user_ctx: web::ReqData<UserContext>,
    req: web::Json<WooCommerceSyncRequest>,
) -> impl Responder {
    tracing::info!("Triggering WooCommerce customers sync to {}", req.target);

    let tenant_id = user_ctx.tenant_id.clone();
    let connector_id = format!("woocommerce-to-{}", req.target);
    
    let options = crate::services::sync_orchestrator::SyncOptions {
        mode: if req.full_sync {
            crate::services::sync_orchestrator::SyncMode::Full
        } else {
            crate::services::sync_orchestrator::SyncMode::Incremental
        },
        dry_run: req.dry_run,
        entity_types: Some(vec!["customers".to_string()]),
        date_range: req.date_range.as_ref().map(|dr| crate::services::sync_orchestrator::DateRange {
            start: dr.start.clone(),
            end: dr.end.clone(),
        }),
        filters: std::collections::HashMap::new(),
    };

    match orchestrator.start_sync(&tenant_id, &connector_id, options).await {
        Ok(result) => HttpResponse::Ok().json(serde_json::json!({
            "sync_id": result.sync_id,
            "status": format!("{:?}", result.status),
            "records_processed": result.records_processed,
            "records_created": result.records_created,
            "records_updated": result.records_updated,
            "records_failed": result.records_failed,
            "duration_ms": result.duration_ms,
            "errors": result.errors.iter().map(|e| serde_json::json!({
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "error": e.error_message
            })).collect::<Vec<_>>()
        })),
        Err(e) => {
            tracing::error!("WooCommerce customers sync failed: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Sync failed: {}", e)
            }))
        }
    }
}

/// GET /api/sync/status
/// List recent sync runs with status
#[get("/api/sync/status")]
pub async fn list_sync_status(
    pool: web::Data<SqlitePool>,
    query: web::Query<SyncStatusQuery>,
) -> impl Responder {
    tracing::info!("Listing sync status");

    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut sql = String::from(
        "SELECT DISTINCT sync_id, entity_type, mode, status, 
         MIN(created_at) as started_at, MAX(updated_at) as ended_at,
         COUNT(*) as total_records,
         SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as records_completed,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as records_failed
         FROM sync_queue
         WHERE 1=1"
    );

    let mut params: Vec<String> = Vec::new();

    if let Some(entity) = &query.entity {
        sql.push_str(" AND entity_type = ?");
        params.push(entity.clone());
    }

    if let Some(status) = &query.status {
        sql.push_str(" AND status = ?");
        params.push(status.clone());
    }

    sql.push_str(" GROUP BY sync_id, entity_type, mode, status");
    sql.push_str(" ORDER BY started_at DESC");
    sql.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

    #[derive(sqlx::FromRow, Serialize)]
    struct SyncRun {
        sync_id: String,
        entity_type: String,
        mode: String,
        status: String,
        started_at: String,
        ended_at: Option<String>,
        total_records: i64,
        records_completed: i64,
        records_failed: i64,
    }

    let mut query_builder = sqlx::query_as::<_, SyncRun>(&sql);
    for param in params {
        query_builder = query_builder.bind(param);
    }

    match query_builder.fetch_all(pool.get_ref()).await {
        Ok(runs) => HttpResponse::Ok().json(serde_json::json!({
            "sync_runs": runs,
            "total": runs.len(),
            "limit": limit,
            "offset": offset
        })),
        Err(e) => {
            tracing::error!("Failed to list sync status: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to list sync status: {}", e)
            }))
        }
    }
}

/// GET /api/sync/status/{syncId}
/// Get specific sync run details
#[get("/api/sync/status/{sync_id}")]
pub async fn get_sync_status(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let sync_id = path.into_inner();
    tracing::info!("Getting sync status for: {}", sync_id);

    #[derive(sqlx::FromRow, Serialize)]
    struct SyncDetail {
        id: String,
        entity_type: String,
        entity_id: Option<String>,
        operation: String,
        status: String,
        error_message: Option<String>,
        created_at: String,
        updated_at: Option<String>,
    }

    match sqlx::query_as::<_, SyncDetail>(
        "SELECT id, entity_type, entity_id, operation, status, error_message, created_at, updated_at
         FROM sync_queue
         WHERE sync_id = ?
         ORDER BY created_at ASC"
    )
    .bind(&sync_id)
    .fetch_all(pool.get_ref())
    .await
    {
        Ok(details) => {
            if details.is_empty() {
                return HttpResponse::NotFound().json(serde_json::json!({
                    "error": "Sync run not found"
                }));
            }

            let total = details.len();
            let completed = details.iter().filter(|d| d.status == "completed").count();
            let failed = details.iter().filter(|d| d.status == "failed").count();
            let pending = details.iter().filter(|d| d.status == "pending").count();
            let running = details.iter().filter(|d| d.status == "running").count();

            let overall_status = if failed > 0 && completed + failed == total {
                "completed_with_errors"
            } else if completed == total {
                "completed"
            } else if running > 0 {
                "running"
            } else {
                "pending"
            };

            HttpResponse::Ok().json(serde_json::json!({
                "sync_id": sync_id,
                "entity": details[0].entity_type,
                "status": overall_status,
                "records_processed": completed + failed,
                "records_created": completed,
                "records_failed": failed,
                "records_pending": pending,
                "started_at": details[0].created_at,
                "ended_at": details.last().and_then(|d| d.updated_at.clone()),
                "details": details,
                "errors": details.iter()
                    .filter(|d| d.error_message.is_some())
                    .map(|d| serde_json::json!({
                        "entity_id": d.entity_id,
                        "error": d.error_message
                    }))
                    .collect::<Vec<_>>()
            }))
        }
        Err(e) => {
            tracing::error!("Failed to get sync status: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get sync status: {}", e)
            }))
        }
    }
}

/// POST /api/sync/retry
/// Retry failed records
#[post("/api/sync/retry")]
pub async fn retry_failed_records(
    pool: web::Data<SqlitePool>,
    orchestrator: web::Data<Arc<SyncOrchestrator>>,
    user_ctx: web::ReqData<UserContext>,
    req: web::Json<RetryRequest>,
) -> impl Responder {
    tracing::info!("Retrying failed records");

    let mut sql = String::from(
        "SELECT id, sync_id, entity_type, entity_id FROM sync_queue WHERE status = 'failed'"
    );

    let mut params: Vec<String> = Vec::new();

    if let Some(entity) = &req.entity {
        sql.push_str(" AND entity_type = ?");
        params.push(entity.clone());
    }

    if let Some(ids) = &req.record_ids {
        if !ids.is_empty() {
            let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            sql.push_str(&format!(" AND id IN ({})", placeholders));
            params.extend(ids.clone());
        }
    }

    #[derive(sqlx::FromRow)]
    struct FailedRecord {
        id: String,
        #[allow(dead_code)] // Part of sync error data model
        sync_id: String,
        entity_type: String,
        #[allow(dead_code)] // Part of sync error data model
        entity_id: Option<String>,
    }

    let mut query_builder = sqlx::query_as::<_, FailedRecord>(&sql);
    for param in params {
        query_builder = query_builder.bind(param);
    }

    match query_builder.fetch_all(pool.get_ref()).await {
        Ok(records) => {
            if records.is_empty() {
                return HttpResponse::Ok().json(serde_json::json!({
                    "message": "No failed records found to retry",
                    "retried": 0
                }));
            }

            let count = records.len();

            // Reset status to pending
            for record in &records {
                let _ = sqlx::query(
                    "UPDATE sync_queue SET status = 'pending', retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                )
                .bind(&record.id)
                .execute(pool.get_ref())
                .await;
            }

            // Trigger retry in background
            let orchestrator_clone = Arc::clone(&orchestrator);
            let tenant_id = user_ctx.tenant_id.clone();
            
            tokio::spawn(async move {
                for record in records {
                    let options = crate::services::sync_orchestrator::SyncOptions {
                        mode: crate::services::sync_orchestrator::SyncMode::Incremental,
                        dry_run: false,
                        entity_types: Some(vec![record.entity_type.clone()]),
                        date_range: None,
                        filters: std::collections::HashMap::new(),
                    };
                    
                    if let Err(e) = orchestrator_clone.start_sync(&tenant_id, &record.entity_type, options).await {
                        tracing::error!("Retry failed for {}: {:?}", record.entity_type, e);
                    }
                }
            });

            HttpResponse::Ok().json(serde_json::json!({
                "message": "Retry queued successfully",
                "retried": count
            }))
        }
        Err(e) => {
            tracing::error!("Failed to retry records: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to retry records: {}", e)
            }))
        }
    }
}

/// POST /api/sync/failures/{id}/retry
/// Retry specific failed record
#[post("/api/sync/failures/{id}/retry")]
pub async fn retry_single_failure(
    pool: web::Data<SqlitePool>,
    orchestrator: web::Data<Arc<SyncOrchestrator>>,
    user_ctx: web::ReqData<UserContext>,
    path: web::Path<String>,
) -> impl Responder {
    let record_id = path.into_inner();
    tracing::info!("Retrying failed record: {}", record_id);

    #[derive(sqlx::FromRow)]
    struct FailedRecord {
        #[allow(dead_code)] // Part of sync error data model
        sync_id: String,
        entity_type: String,
        status: String,
    }

    match sqlx::query_as::<_, FailedRecord>(
        "SELECT sync_id, entity_type, status FROM sync_queue WHERE id = ?"
    )
    .bind(&record_id)
    .fetch_one(pool.get_ref())
    .await
    {
        Ok(record) => {
            if record.status != "failed" {
                return HttpResponse::BadRequest().json(serde_json::json!({
                    "error": format!("Record is not in failed status (current: {})", record.status)
                }));
            }

            // Reset status to pending
            match sqlx::query(
                "UPDATE sync_queue SET status = 'pending', retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
            )
            .bind(&record_id)
            .execute(pool.get_ref())
            .await
            {
                Ok(_) => {
                    // Trigger retry in background
                    let orchestrator_clone = Arc::clone(&orchestrator);
                    let entity_type = record.entity_type.clone();
                    let tenant_id = user_ctx.tenant_id.clone();
                    
                    tokio::spawn(async move {
                        let options = crate::services::sync_orchestrator::SyncOptions {
                            mode: crate::services::sync_orchestrator::SyncMode::Incremental,
                            dry_run: false,
                            entity_types: Some(vec![entity_type.clone()]),
                            date_range: None,
                            filters: std::collections::HashMap::new(),
                        };
                        
                        if let Err(e) = orchestrator_clone.start_sync(&tenant_id, &entity_type, options).await {
                            tracing::error!("Retry failed for {}: {:?}", entity_type, e);
                        }
                    });

                    HttpResponse::Ok().json(serde_json::json!({
                        "message": "Retry queued successfully",
                        "record_id": record_id
                    }))
                }
                Err(e) => {
                    tracing::error!("Failed to update record: {:?}", e);
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": format!("Failed to update record: {}", e)
                    }))
                }
            }
        }
        Err(sqlx::Error::RowNotFound) => {
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Record not found"
            }))
        }
        Err(e) => {
            tracing::error!("Failed to get record: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get record: {}", e)
            }))
        }
    }
}

/// GET /api/sync/failures
/// List failed records requiring manual attention
#[get("/api/sync/failures")]
pub async fn list_failures(
    pool: web::Data<SqlitePool>,
    query: web::Query<FailuresQuery>,
) -> impl Responder {
    tracing::info!("Listing failed records");

    let limit = query.limit.unwrap_or(50).min(100);
    let offset = query.offset.unwrap_or(0);

    let mut sql = String::from(
        "SELECT id, sync_id, entity_type, entity_id, operation, error_message, retry_count, created_at, updated_at
         FROM sync_queue
         WHERE status = 'failed'"
    );

    let mut params: Vec<String> = Vec::new();

    if let Some(entity) = &query.entity {
        sql.push_str(" AND entity_type = ?");
        params.push(entity.clone());
    }

    sql.push_str(" ORDER BY updated_at DESC");
    sql.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

    #[derive(sqlx::FromRow, Serialize)]
    struct FailedRecord {
        id: String,
        sync_id: String,
        entity_type: String,
        entity_id: Option<String>,
        operation: String,
        error_message: Option<String>,
        retry_count: i64,
        created_at: String,
        updated_at: Option<String>,
    }

    let mut query_builder = sqlx::query_as::<_, FailedRecord>(&sql);
    for param in params {
        query_builder = query_builder.bind(param);
    }

    match query_builder.fetch_all(pool.get_ref()).await {
        Ok(failures) => HttpResponse::Ok().json(serde_json::json!({
            "failures": failures,
            "total": failures.len(),
            "limit": limit,
            "offset": offset
        })),
        Err(e) => {
            tracing::error!("Failed to list failures: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to list failures: {}", e)
            }))
        }
    }
}

/// POST /api/sync/dry-run
/// Execute dry run to preview changes without making actual API calls
#[post("/api/sync/dry-run")]
pub async fn execute_dry_run(
    pool: web::Data<SqlitePool>,
    user_ctx: web::ReqData<UserContext>,
    req: web::Json<DryRunRequest>,
) -> impl Responder {
    tracing::info!(
        "Executing dry run: {} -> {} for {}",
        req.source_system,
        req.target_system,
        req.entity_type
    );

    let executor = DryRunExecutor::new(pool.get_ref().clone());
    let tenant_id = user_ctx.tenant_id.as_str();

    match executor
        .execute_dry_run(
            tenant_id,
            &req.source_system,
            &req.target_system,
            &req.entity_type,
            req.entity_ids.clone(),
        )
        .await
    {
        Ok(result) => HttpResponse::Ok().json(serde_json::json!({
            "dry_run": true,
            "source_system": req.source_system,
            "target_system": req.target_system,
            "entity_type": req.entity_type,
            "result": result,
            "message": "Dry run completed successfully. No actual changes were made."
        })),
        Err(e) => {
            tracing::error!("Dry run failed: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Dry run failed: {}", e)
            }))
        }
    }
}

/// POST /api/sync/check-confirmation
/// Check if bulk operation requires confirmation
#[post("/api/sync/check-confirmation")]
pub async fn check_confirmation_requirement(
    pool: web::Data<SqlitePool>,
    req: web::Json<CheckConfirmationRequest>,
) -> impl Responder {
    tracing::info!(
        "Checking confirmation requirement for {:?} on {} ({} records)",
        req.operation_type,
        req.entity_type,
        req.record_count
    );

    let safety = BulkOperationSafety::new(pool.get_ref().clone());

    let operation_type = match req.operation_type.to_lowercase().as_str() {
        "update" => OperationType::Update,
        "delete" => OperationType::Delete,
        "sync" => OperationType::Sync,
        "import" => OperationType::Import,
        "export" => OperationType::Export,
        _ => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid operation type. Use: update, delete, sync, import, export"
            }));
        }
    };

    match safety
        .check_confirmation_requirement(
            operation_type,
            &req.entity_type,
            req.record_count,
            req.changes.clone(),
        )
        .await
    {
        Ok(requirement) => HttpResponse::Ok().json(requirement),
        Err(e) => {
            tracing::error!("Failed to check confirmation requirement: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to check confirmation: {}", e)
            }))
        }
    }
}

/// POST /api/sync/confirm/{token}
/// Execute confirmed bulk operation
#[post("/api/sync/confirm/{token}")]
pub async fn execute_confirmed_operation(
    pool: web::Data<SqlitePool>,
    orchestrator: web::Data<Arc<SyncOrchestrator>>,
    user_ctx: web::ReqData<UserContext>,
    path: web::Path<String>,
    req: web::Json<ExecuteConfirmedRequest>,
) -> impl Responder {
    let token = path.into_inner();
    tracing::info!("Executing confirmed operation with token: {}", token);

    let safety = BulkOperationSafety::new(pool.get_ref().clone());

    // Validate and consume token
    let confirmation = match safety.consume_confirmation(&token).await {
        Ok(conf) => conf,
        Err(e) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": e
            }));
        }
    };

    tracing::info!(
        "Confirmed operation: {:?} on {} ({} records)",
        confirmation.operation_type,
        confirmation.entity_type,
        confirmation.record_count
    );

    // Execute the operation based on type
    match confirmation.operation_type {
        OperationType::Sync => {
            // Trigger sync operation
            let tenant_id = user_ctx.tenant_id.clone();
            let entity_type = confirmation.entity_type.clone();
            
            let orchestrator_clone = Arc::clone(&orchestrator);
            tokio::spawn(async move {
                let options = crate::services::sync_orchestrator::SyncOptions {
                    mode: crate::services::sync_orchestrator::SyncMode::Full,
                    dry_run: false,
                    entity_types: Some(vec![entity_type.clone()]),
                    date_range: None,
                    filters: std::collections::HashMap::new(),
                };
                
                if let Err(e) = orchestrator_clone.start_sync(&tenant_id, &entity_type, options).await {
                    tracing::error!("Confirmed sync failed: {:?}", e);
                }
            });

            HttpResponse::Accepted().json(serde_json::json!({
                "message": "Confirmed operation queued successfully",
                "operation_type": "sync",
                "entity_type": confirmation.entity_type,
                "record_count": confirmation.record_count
            }))
        }
        OperationType::Delete => {
            // Execute delete operation
            if let Some(entity_ids) = &req.entity_ids {
                let mut deleted = 0;
                let mut errors = Vec::new();

                for entity_id in entity_ids {
                    match sqlx::query(
                        "UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
                    )
                    .bind(entity_id)
                    .execute(pool.get_ref())
                    .await
                    {
                        Ok(_) => deleted += 1,
                        Err(e) => errors.push(format!("{}: {}", entity_id, e)),
                    }
                }

                HttpResponse::Ok().json(serde_json::json!({
                    "message": "Confirmed delete operation completed",
                    "deleted": deleted,
                    "errors": errors,
                    "total_requested": entity_ids.len()
                }))
            } else {
                HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "entity_ids required for delete operation"
                }))
            }
        }
        OperationType::Update => {
            HttpResponse::Ok().json(serde_json::json!({
                "message": "Confirmed update operation would be executed here",
                "note": "Implement specific update logic based on your requirements"
            }))
        }
        _ => {
            HttpResponse::Ok().json(serde_json::json!({
                "message": format!("Confirmed {:?} operation acknowledged", confirmation.operation_type),
                "entity_type": confirmation.entity_type,
                "record_count": confirmation.record_count
            }))
        }
    }
}

/// GET /api/settings/sandbox
/// Get sandbox mode status and configuration
#[get("/api/settings/sandbox")]
pub async fn get_sandbox_status(
    pool: web::Data<SqlitePool>,
    user_ctx: web::ReqData<UserContext>,
) -> impl Responder {
    tracing::info!("Getting sandbox mode status");

    let tenant_id = user_ctx.tenant_id.as_str();
    let safety = BulkOperationSafety::new(pool.get_ref().clone());

    match safety.is_sandbox_mode(tenant_id).await {
        Ok(enabled) => {
            let config = safety.get_sandbox_config(tenant_id).await.ok();

            HttpResponse::Ok().json(serde_json::json!({
                "sandbox_mode": enabled,
                "tenant_id": tenant_id,
                "config": config,
                "message": if enabled {
                    "Sandbox mode is ENABLED. All operations will use test/staging environments."
                } else {
                    "Sandbox mode is DISABLED. Operations will use production environments."
                }
            }))
        }
        Err(e) => {
            tracing::error!("Failed to get sandbox status: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to get sandbox status: {}", e)
            }))
        }
    }
}

/// POST /api/settings/sandbox
/// Toggle sandbox mode and update configuration
#[post("/api/settings/sandbox")]
pub async fn set_sandbox_mode(
    pool: web::Data<SqlitePool>,
    user_ctx: web::ReqData<UserContext>,
    req: web::Json<SetSandboxRequest>,
) -> impl Responder {
    tracing::info!("Setting sandbox mode: {}", req.enabled);

    let tenant_id = user_ctx.tenant_id.as_str();
    let safety = BulkOperationSafety::new(pool.get_ref().clone());

    match safety.set_sandbox_mode(tenant_id, req.enabled).await {
        Ok(_) => {
            HttpResponse::Ok().json(serde_json::json!({
                "message": if req.enabled {
                    "Sandbox mode ENABLED. All operations will now use test/staging environments."
                } else {
                    "Sandbox mode DISABLED. Operations will now use production environments."
                },
                "sandbox_mode": req.enabled,
                "tenant_id": tenant_id,
                "warning": if !req.enabled {
                    Some("⚠️ Production mode active. All operations will affect live data.")
                } else {
                    None
                }
            }))
        }
        Err(e) => {
            tracing::error!("Failed to set sandbox mode: {:?}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": format!("Failed to set sandbox mode: {}", e)
            }))
        }
    }
}

// Request types

#[derive(Deserialize)]
pub struct TriggerSyncRequest {
    pub mode: String, // "full" or "incremental"
    #[serde(default)]
    pub dry_run: bool,
    #[serde(default)]
    pub filters: SyncFilters,
    #[serde(default)]
    pub ids: Vec<String>,
    pub idempotency_key: Option<String>,
}

#[derive(Deserialize)]
pub struct WooCommerceSyncRequest {
    pub target: String, // "quickbooks" or "supabase"
    #[serde(default)]
    pub full_sync: bool,
    #[serde(default)]
    pub dry_run: bool,
    pub date_range: Option<DateRange>,
}

#[derive(Deserialize, Serialize, Default)]
pub struct SyncFilters {
    pub status: Option<Vec<String>>,
    pub date_range: Option<DateRange>,
}

#[derive(Deserialize, Serialize)]
pub struct DateRange {
    pub start: String,
    pub end: String,
}

#[derive(Deserialize)]
pub struct SyncStatusQuery {
    pub entity: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize)]
pub struct RetryRequest {
    pub entity: Option<String>,
    pub record_ids: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct FailuresQuery {
    pub entity: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Deserialize)]
pub struct DryRunRequest {
    pub source_system: String,
    pub target_system: String,
    pub entity_type: String,
    pub entity_ids: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct CheckConfirmationRequest {
    pub operation_type: String,
    pub entity_type: String,
    pub record_count: usize,
    #[serde(default)]
    pub changes: Vec<ChangeDescription>,
}

#[derive(Deserialize)]
pub struct ExecuteConfirmedRequest {
    pub entity_ids: Option<Vec<String>>,
}

#[derive(Deserialize)]
pub struct SetSandboxRequest {
    pub enabled: bool,
}

// ============================================================================
// Circuit Breaker Status Endpoint (Phase 6 - Task 7.2)
// ============================================================================

/// Circuit breaker status response
#[derive(Serialize)]
pub struct CircuitBreakerStatusResponse {
    pub connectors: Vec<ConnectorCircuitStatus>,
}

#[derive(Serialize)]
pub struct ConnectorCircuitStatus {
    pub connector_id: String,
    pub state: String,
    pub is_open: bool,
}

/// GET /api/sync/circuit-breaker/status
/// Get circuit breaker status for all connectors
#[get("/api/sync/circuit-breaker/status")]
pub async fn get_circuit_breaker_status(
    orchestrator: web::Data<Arc<SyncOrchestrator>>,
) -> impl Responder {
    tracing::info!("Getting circuit breaker status");

    let status_map = orchestrator.get_circuit_breaker_status().await;
    
    let connectors: Vec<ConnectorCircuitStatus> = status_map
        .into_iter()
        .map(|(connector_id, state)| {
            let is_open = state.starts_with("open");
            ConnectorCircuitStatus {
                connector_id,
                state,
                is_open,
            }
        })
        .collect();

    HttpResponse::Ok().json(CircuitBreakerStatusResponse { connectors })
}
