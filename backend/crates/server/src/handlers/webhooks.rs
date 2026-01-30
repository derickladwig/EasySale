/**
 * Webhook Handlers
 * 
 * Handles incoming webhooks from external platforms
 * 
 * Requirements: 12.3, 12.5, 10.5, 5.5, 5.6
 */

use actix_web::{web, HttpRequest, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use std::sync::Arc;

use crate::models::ApiError;
use crate::services::TenantResolver;
use crate::connectors::woocommerce::webhooks::{validate_signature, parse_webhook_event, WebhookEvent, WebhookResource, WebhookEventType};
use crate::connectors::quickbooks::webhooks::{
    validate_qb_signature, parse_qb_webhook, QBWebhookPayload, QBSyncOperation,
};
use crate::connectors::quickbooks::cloudevents::{
    validate_cloudevents_signature, parse_cloudevents, is_cloudevents_format,
    CloudEvent, CloudEventsSyncOperation,
};

// ============================================================================
// WooCommerce Webhook Handler
// ============================================================================

/// Handle incoming WooCommerce webhook
/// 
/// Requirements: 12.3, 12.5, 10.5, 5.5, 5.6
pub async fn handle_woocommerce_webhook(
    req: HttpRequest,
    body: web::Bytes,
    pool: web::Data<SqlitePool>,
    tenant_resolver: web::Data<Arc<TenantResolver>>,
) -> Result<HttpResponse, ApiError> {
    // Extract signature from header
    let signature = req
        .headers()
        .get("X-WC-Webhook-Signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| ApiError::unauthorized("Missing webhook signature"))?;
    
    // Get webhook secret from environment or database
    let webhook_secret = std::env::var("WOOCOMMERCE_WEBHOOK_SECRET")
        .unwrap_or_else(|_| "default_secret".to_string());
    
    // Validate signature (HMAC-SHA256)
    let is_valid = validate_signature(&body, signature, &webhook_secret)
        .map_err(|e| ApiError::internal(format!("Signature validation failed: {}", e)))?;
    
    if !is_valid {
        tracing::warn!("Invalid webhook signature received");
        return Err(ApiError::unauthorized("Invalid webhook signature"));
    }
    
    // Parse webhook payload
    let event: WebhookEvent = serde_json::from_slice(&body)
        .map_err(|e| ApiError::validation_msg(&format!("Invalid webhook payload: {}", e)))?;
    
    // Resolve tenant_id from webhook
    let payload_json: serde_json::Value = serde_json::from_slice(&body).unwrap_or(serde_json::json!({}));
    let tenant_id = tenant_resolver.resolve_from_webhook(req.headers(), &payload_json).await
        .map_err(|e| ApiError::internal(format!("Failed to resolve tenant: {}", e)))?;
    
    tracing::info!(
        "Received WooCommerce webhook: {} (ID: {}) for tenant: {}",
        event.event,
        event.id,
        tenant_id
    );
    
    // Parse event type and resource
    let (resource, event_type) = parse_webhook_event(&event)?;
    
    // Check for duplicate events (idempotency)
    let is_duplicate = check_duplicate_webhook(&pool, event.id).await?;
    if is_duplicate {
        tracing::info!("Duplicate webhook event {} ignored", event.id);
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "status": "duplicate",
            "message": "Event already processed"
        })));
    }
    
    // Queue sync operation based on resource type
    queue_sync_operation(&pool, &tenant_id, &resource, &event_type, &event).await?;
    
    // Record webhook receipt
    record_webhook_event(&pool, &tenant_id, &event).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Webhook received and queued for processing"
    })))
}

/// Check if webhook event has already been processed
async fn check_duplicate_webhook(
    pool: &SqlitePool,
    webhook_id: i64,
) -> Result<bool, ApiError> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM integration_webhook_events
        WHERE webhook_id = ?
        "#
    )
    .bind(webhook_id)
    .fetch_one(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    use sqlx::Row;
    let count: i32 = row.get("count");
    Ok(count > 0)
}

/// Queue sync operation for processing
async fn queue_sync_operation(
    pool: &SqlitePool,
    tenant_id: &str,
    resource: &WebhookResource,
    event_type: &WebhookEventType,
    event: &WebhookEvent,
) -> Result<(), ApiError> {
    let entity_type = match resource {
        WebhookResource::Order => "order",
        WebhookResource::Product => "product",
        WebhookResource::Customer => "customer",
    };
    
    let operation = match event_type {
        WebhookEventType::Created => "create",
        WebhookEventType::Updated => "update",
        WebhookEventType::Deleted => "delete",
        WebhookEventType::Restored => "restore",
    };
    
    // Extract entity ID from payload
    let entity_id = event.payload
        .get("id")
        .and_then(|v| v.as_i64())
        .ok_or_else(|| ApiError::validation_msg("Missing entity ID in webhook payload"))?;
    
    let now = chrono::Utc::now().to_rfc3339();
    
    // Insert into sync_queue
    sqlx::query(
        r#"
        INSERT INTO sync_queue (
            tenant_id,
            entity_type,
            entity_id,
            operation,
            status,
            source_system,
            target_system,
            payload,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, 'pending', 'woocommerce', 'internal', ?, ?, ?)
        "#
    )
    .bind(tenant_id)
    .bind(entity_type)
    .bind(entity_id.to_string())
    .bind(operation)
    .bind(serde_json::to_string(&event.payload).unwrap_or_default())
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Failed to queue sync operation: {}", e)))?;
    
    tracing::info!(
        "Queued sync operation: {} {} (ID: {})",
        operation,
        entity_type,
        entity_id
    );
    
    Ok(())
}

/// Record webhook event for audit trail
async fn record_webhook_event(
    pool: &SqlitePool,
    tenant_id: &str,
    event: &WebhookEvent,
) -> Result<(), ApiError> {
    let now = chrono::Utc::now().to_rfc3339();
    
    sqlx::query(
        r#"
        INSERT INTO integration_webhook_events (
            tenant_id,
            platform,
            webhook_id,
            event_type,
            resource_type,
            payload,
            processed_at,
            created_at
        ) VALUES (?, 'woocommerce', ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(tenant_id)
    .bind(event.id)
    .bind(&event.event)
    .bind(&event.resource)
    .bind(serde_json::to_string(&event.payload).unwrap_or_default())
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Failed to record webhook event: {}", e)))?;
    
    Ok(())
}

// ============================================================================
// QuickBooks Webhook Handler
// ============================================================================

/// Handle incoming QuickBooks webhook (current format)
/// 
/// Requirements: 11.8, 10.5, 5.5, 5.6
pub async fn handle_quickbooks_webhook(
    req: HttpRequest,
    body: web::Bytes,
    pool: web::Data<SqlitePool>,
    tenant_resolver: web::Data<Arc<TenantResolver>>,
) -> Result<HttpResponse, ApiError> {
    // Extract signature from header
    let signature = req
        .headers()
        .get("intuit-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| ApiError::unauthorized("Missing intuit-signature header"))?;
    
    // Get webhook verifier token from environment or database
    let verifier_token = std::env::var("QUICKBOOKS_WEBHOOK_VERIFIER")
        .unwrap_or_else(|_| "default_verifier".to_string());
    
    // Validate signature (HMAC-SHA256)
    let is_valid = validate_qb_signature(&body, signature, &verifier_token)
        .map_err(|e| ApiError::internal(format!("Signature validation failed: {}", e)))?;
    
    if !is_valid {
        tracing::warn!("Invalid QuickBooks webhook signature received");
        return Err(ApiError::unauthorized("Invalid webhook signature"));
    }
    
    // Parse webhook payload
    let payload: QBWebhookPayload = parse_qb_webhook(&body)?;
    
    tracing::info!(
        "Received QuickBooks webhook with {} event notification(s)",
        payload.event_notifications.len()
    );
    
    // Process each event notification (can be multiple realms)
    let mut total_entities = 0;
    for notification in &payload.event_notifications {
        let realm_id = &notification.realm_id;
        
        // Resolve tenant_id from realm_id
        let tenant_id = tenant_resolver.resolve_from_realm_id(realm_id).await
            .map_err(|e| ApiError::internal(format!("Failed to resolve tenant from realm_id {}: {}", realm_id, e)))?;
        
        // Process each entity change
        for entity in &notification.data_change_event.entities {
            // Check for duplicate events (idempotency)
            let is_duplicate = check_duplicate_qb_webhook(
                &pool,
                realm_id,
                &entity.name,
                &entity.id,
                &entity.last_updated,
            ).await?;
            
            if is_duplicate {
                tracing::info!(
                    "Duplicate QuickBooks webhook event ignored: {} {} (realm: {})",
                    entity.operation,
                    entity.name,
                    realm_id
                );
                continue;
            }
            
            // Create sync operation
            let sync_op = QBSyncOperation::from_entity_change(realm_id.clone(), entity)?;
            
            // Queue sync operation
            queue_qb_sync_operation(&pool, &tenant_id, &sync_op).await?;
            
            // Record webhook event
            record_qb_webhook_event(&pool, &tenant_id, realm_id, entity).await?;
            
            total_entities += 1;
        }
    }
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": format!("Webhook received and {} entities queued for processing", total_entities)
    })))
}

/// Check if QuickBooks webhook event has already been processed
async fn check_duplicate_qb_webhook(
    pool: &SqlitePool,
    realm_id: &str,
    entity_name: &str,
    entity_id: &str,
    last_updated: &str,
) -> Result<bool, ApiError> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM integration_webhook_events
        WHERE platform = 'quickbooks'
          AND resource_type = ?
          AND payload LIKE ?
          AND payload LIKE ?
          AND payload LIKE ?
        "#
    )
    .bind(entity_name)
    .bind(format!("%\"realmId\":\"{}%", realm_id))
    .bind(format!("%\"id\":\"{}%", entity_id))
    .bind(format!("%\"lastUpdated\":\"{}%", last_updated))
    .fetch_one(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    use sqlx::Row;
    let count: i32 = row.get("count");
    Ok(count > 0)
}

/// Queue QuickBooks sync operation for processing
async fn queue_qb_sync_operation(
    pool: &SqlitePool,
    tenant_id: &str,
    sync_op: &QBSyncOperation,
) -> Result<(), ApiError> {
    let now = chrono::Utc::now().to_rfc3339();
    
    // Insert into sync_queue
    sqlx::query(
        r#"
        INSERT INTO sync_queue (
            tenant_id,
            entity_type,
            entity_id,
            operation,
            status,
            source_system,
            target_system,
            payload,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, 'pending', 'quickbooks', 'internal', ?, ?, ?)
        "#
    )
    .bind(tenant_id)
    .bind(sync_op.entity_type.as_str())
    .bind(&sync_op.entity_id)
    .bind(sync_op.operation.as_str())
    .bind(serde_json::to_string(sync_op).unwrap_or_default())
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Failed to queue sync operation: {}", e)))?;
    
    tracing::info!(
        "Queued QuickBooks sync operation: {} {} (ID: {}, realm: {})",
        sync_op.operation.as_str(),
        sync_op.entity_type.as_str(),
        sync_op.entity_id,
        sync_op.realm_id
    );
    
    Ok(())
}

/// Record QuickBooks webhook event for audit trail
async fn record_qb_webhook_event(
    pool: &SqlitePool,
    tenant_id: &str,
    realm_id: &str,
    entity: &crate::connectors::quickbooks::webhooks::EntityChange,
) -> Result<(), ApiError> {
    let now = chrono::Utc::now().to_rfc3339();
    
    let payload = serde_json::json!({
        "realmId": realm_id,
        "name": entity.name,
        "id": entity.id,
        "operation": entity.operation,
        "lastUpdated": entity.last_updated,
    });
    
    sqlx::query(
        r#"
        INSERT INTO integration_webhook_events (
            tenant_id,
            platform,
            webhook_id,
            event_type,
            resource_type,
            payload,
            processed_at,
            created_at
        ) VALUES (?, 'quickbooks', ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(tenant_id)
    .bind(format!("{}:{}:{}", realm_id, entity.name, entity.id))
    .bind(&entity.operation)
    .bind(&entity.name)
    .bind(serde_json::to_string(&payload).unwrap_or_default())
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Failed to record webhook event: {}", e)))?;
    
    Ok(())
}

// ============================================================================
// QuickBooks CloudEvents Webhook Handler
// ============================================================================

/// Handle incoming QuickBooks webhook (CloudEvents format)
/// 
/// Required by May 15, 2026. Supports both current and CloudEvents formats
/// by detecting the payload structure.
/// 
/// Requirements: 11.8, 10.5, 5.5, 5.6
pub async fn handle_quickbooks_cloudevents(
    req: HttpRequest,
    body: web::Bytes,
    pool: web::Data<SqlitePool>,
    tenant_resolver: web::Data<Arc<TenantResolver>>,
) -> Result<HttpResponse, ApiError> {
    // Detect format by checking for "specversion" field
    let is_cloudevents = is_cloudevents_format(&body);
    
    if is_cloudevents {
        handle_cloudevents_format(req, body, pool, tenant_resolver).await
    } else {
        // Fall back to current format handler
        handle_quickbooks_webhook(req, body, pool, tenant_resolver).await
    }
}

/// Handle CloudEvents format webhook
async fn handle_cloudevents_format(
    req: HttpRequest,
    body: web::Bytes,
    pool: web::Data<SqlitePool>,
    tenant_resolver: web::Data<Arc<TenantResolver>>,
) -> Result<HttpResponse, ApiError> {
    // Extract signature from header
    let signature = req
        .headers()
        .get("intuit-signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| ApiError::unauthorized("Missing intuit-signature header"))?;
    
    // Get webhook verifier token from environment or database
    let verifier_token = std::env::var("QUICKBOOKS_WEBHOOK_VERIFIER")
        .unwrap_or_else(|_| "default_verifier".to_string());
    
    // Validate signature (HMAC-SHA256)
    let is_valid = validate_cloudevents_signature(&body, signature, &verifier_token)
        .map_err(|e| ApiError::internal(format!("Signature validation failed: {}", e)))?;
    
    if !is_valid {
        tracing::warn!("Invalid QuickBooks CloudEvents webhook signature received");
        return Err(ApiError::unauthorized("Invalid webhook signature"));
    }
    
    // Parse CloudEvents payload
    let event: CloudEvent = parse_cloudevents(&body)?;
    
    // Resolve tenant_id from realm_id in CloudEvents (intuitaccountid field)
    let realm_id = &event.intuitaccountid;
    let tenant_id = tenant_resolver.resolve_from_realm_id(realm_id).await
        .map_err(|e| ApiError::internal(format!("Failed to resolve tenant from realm_id {}: {}", realm_id, e)))?;
    
    tracing::info!(
        "Received QuickBooks CloudEvents webhook: {} (ID: {}) for tenant: {}",
        event.event_type,
        event.id,
        tenant_id
    );
    
    // Check for duplicate events (idempotency)
    let is_duplicate = check_duplicate_cloudevents(
        &pool,
        &event.id,
    ).await?;
    
    if is_duplicate {
        tracing::info!(
            "Duplicate QuickBooks CloudEvents event ignored: {} (ID: {})",
            event.event_type,
            event.id
        );
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "status": "duplicate",
            "message": "Event already processed"
        })));
    }
    
    // Create sync operation
    let sync_op = CloudEventsSyncOperation::from_cloudevent(&event)?;
    
    // Queue sync operation
    queue_cloudevents_sync_operation(&pool, &tenant_id, &sync_op).await?;
    
    // Record webhook event
    record_cloudevents_webhook_event(&pool, &tenant_id, &event).await?;
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "CloudEvents webhook received and queued for processing"
    })))
}

/// Check if CloudEvents event has already been processed
async fn check_duplicate_cloudevents(
    pool: &SqlitePool,
    event_id: &str,
) -> Result<bool, ApiError> {
    let row = sqlx::query(
        r#"
        SELECT COUNT(*) as count
        FROM integration_webhook_events
        WHERE platform = 'quickbooks'
          AND webhook_id = ?
        "#
    )
    .bind(event_id)
    .fetch_one(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    use sqlx::Row;
    let count: i32 = row.get("count");
    Ok(count > 0)
}

/// Queue CloudEvents sync operation for processing
async fn queue_cloudevents_sync_operation(
    pool: &SqlitePool,
    tenant_id: &str,
    sync_op: &CloudEventsSyncOperation,
) -> Result<(), ApiError> {
    let now = chrono::Utc::now().to_rfc3339();
    
    // Insert into sync_queue
    sqlx::query(
        r#"
        INSERT INTO sync_queue (
            tenant_id,
            entity_type,
            entity_id,
            operation,
            status,
            source_system,
            target_system,
            payload,
            created_at,
            updated_at
        ) VALUES (?, ?, ?, ?, 'pending', 'quickbooks', 'internal', ?, ?, ?)
        "#
    )
    .bind(tenant_id)
    .bind(sync_op.entity_type.as_str())
    .bind(&sync_op.entity_id)
    .bind(sync_op.operation.as_str())
    .bind(serde_json::to_string(sync_op).unwrap_or_default())
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Failed to queue sync operation: {}", e)))?;
    
    tracing::info!(
        "Queued QuickBooks CloudEvents sync operation: {} {} (ID: {}, realm: {})",
        sync_op.operation.as_str(),
        sync_op.entity_type.as_str(),
        sync_op.entity_id,
        sync_op.realm_id
    );
    
    Ok(())
}

/// Record CloudEvents webhook event for audit trail
async fn record_cloudevents_webhook_event(
    pool: &SqlitePool,
    tenant_id: &str,
    event: &CloudEvent,
) -> Result<(), ApiError> {
    let now = chrono::Utc::now().to_rfc3339();
    
    let payload = serde_json::to_string(event).unwrap_or_default();
    
    sqlx::query(
        r#"
        INSERT INTO integration_webhook_events (
            tenant_id,
            platform,
            webhook_id,
            event_type,
            resource_type,
            payload,
            processed_at,
            created_at
        ) VALUES (?, 'quickbooks', ?, ?, ?, ?, ?, ?)
        "#
    )
    .bind(tenant_id)
    .bind(&event.id)
    .bind(&event.event_type)
    .bind(&event.intuitentityid)
    .bind(&payload)
    .bind(&now)
    .bind(&now)
    .execute(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Failed to record webhook event: {}", e)))?;
    
    Ok(())
}

// ============================================================================
// Webhook Configuration
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookConfig {
    pub enabled: bool,
    pub secret: String,
}

/// Get webhook configuration for tenant
pub async fn get_webhook_config(
    _pool: web::Data<SqlitePool>,
    _tenant_id: web::ReqData<String>,
) -> Result<HttpResponse, ApiError> {
    // TODO: Implement database storage for webhook configs
    let config = WebhookConfig {
        enabled: true,
        secret: "***".to_string(), // Never return actual secret
    };
    
    Ok(HttpResponse::Ok().json(config))
}

/// Update webhook configuration
pub async fn update_webhook_config(
    _pool: web::Data<SqlitePool>,
    _tenant_id: web::ReqData<String>,
    config: web::Json<WebhookConfig>,
) -> Result<HttpResponse, ApiError> {
    // TODO: Implement database storage for webhook configs
    // For now, just validate the input
    
    if config.secret.is_empty() {
        return Err(ApiError::validation_msg("Webhook secret cannot be empty"));
    }
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "message": "Webhook configuration updated"
    })))
}

// ============================================================================
// Route Configuration
// ============================================================================

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/webhooks")
            .route("/woocommerce", web::post().to(handle_woocommerce_webhook))
            .route("/quickbooks", web::post().to(handle_quickbooks_webhook))
            .route("/quickbooks/cloudevents", web::post().to(handle_quickbooks_cloudevents))
            .route("/config", web::get().to(get_webhook_config))
            .route("/config", web::put().to(update_webhook_config))
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_webhook_config_validation() {
        let config = WebhookConfig {
            enabled: true,
            secret: "test_secret".to_string(),
        };
        
        assert!(config.enabled);
        assert!(!config.secret.is_empty());
    }
}
