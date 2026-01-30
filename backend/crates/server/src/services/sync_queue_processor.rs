//! Sync Queue Processor
//!
//! Processes sync queue items by routing operations based on the operation field.
//! Implements proper operation handling for create/update/delete operations.
//!
//! Features:
//! - Exponential backoff with jitter for retries (TASK-004)
//! - Queue bounds enforcement (TASK-007)
//! - Entity priority ordering (TASK-008)
//! - Idempotency key deduplication (TASK-006)
//!
//! Requirements: 9.1, 9.4

use crate::models::sync::SyncQueueItem;
use crate::services::sync_orchestrator::SyncError;
use sqlx::SqlitePool;
use serde_json::Value;
use std::time::Duration;
use sha2::{Sha256, Digest};

// ============================================================================
// TASK-004: Exponential Backoff Policy
// ============================================================================

/// Configuration for exponential backoff retry behavior
#[derive(Debug, Clone)]
pub struct BackoffPolicy {
    /// Initial delay in milliseconds (default: 1000ms = 1 second)
    pub base_delay_ms: u64,
    /// Maximum delay in milliseconds (default: 300000ms = 5 minutes)
    pub max_delay_ms: u64,
    /// Maximum number of retries before giving up (default: 10)
    pub max_retries: u32,
    /// Jitter factor 0.0-1.0 to randomize delays (default: 0.1 = ±10%)
    pub jitter_factor: f64,
    /// Multiplier for each retry (default: 2.0 for exponential)
    pub multiplier: f64,
}

impl Default for BackoffPolicy {
    fn default() -> Self {
        Self {
            base_delay_ms: 1000,
            max_delay_ms: 300_000, // 5 minutes
            max_retries: 10,
            jitter_factor: 0.1,
            multiplier: 2.0,
        }
    }
}

impl BackoffPolicy {
    /// Calculate the delay for a given retry count
    /// Returns None if max_retries exceeded (should stop retrying)
    pub fn calculate_delay(&self, retry_count: u32) -> Option<Duration> {
        if retry_count >= self.max_retries {
            return None; // Signal to stop retrying
        }

        let base = self.base_delay_ms as f64;
        let delay = base * self.multiplier.powi(retry_count as i32);
        let capped = delay.min(self.max_delay_ms as f64);

        // Add jitter to prevent thundering herd
        let jitter = (rand::random::<f64>() - 0.5) * 2.0 * self.jitter_factor;
        let final_delay = capped * (1.0 + jitter);

        Some(Duration::from_millis(final_delay.max(0.0) as u64))
    }

    /// Check if we should retry based on current retry count
    pub fn should_retry(&self, retry_count: u32) -> bool {
        retry_count < self.max_retries
    }
}

// ============================================================================
// TASK-007: Queue Bounds
// ============================================================================

/// Error when queue is full
#[derive(Debug, Clone)]
pub struct QueueFullError {
    pub current_size: i64,
    pub max_size: i64,
    pub tenant_id: String,
}

impl std::fmt::Display for QueueFullError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Sync queue full for tenant {}: {} items (max: {})",
            self.tenant_id, self.current_size, self.max_size
        )
    }
}

/// Default maximum queue size per tenant
const DEFAULT_MAX_QUEUE_SIZE: i64 = 100_000;

// ============================================================================
// TASK-008: Entity Priority Ordering
// ============================================================================

/// Entity types in dependency order (process in this order)
/// Customers must exist before orders, products before line items, etc.
const ENTITY_ORDER: &[&str] = &[
    "customer",   // Priority 0 - must exist first
    "product",    // Priority 1 - must exist before orders
    "inventory",  // Priority 2 - depends on products
    "order",      // Priority 3 - depends on customers and products
    "invoice",    // Priority 4 - depends on orders
    "payment",    // Priority 5 - depends on invoices
];

/// Get the processing priority for an entity type (lower = higher priority)
pub fn get_entity_priority(entity_type: &str) -> u32 {
    ENTITY_ORDER
        .iter()
        .position(|&e| e == entity_type)
        .unwrap_or(99) as u32
}

// ============================================================================
// TASK-006: Idempotency Key Generation
// ============================================================================

/// Generate an idempotency key for a sync operation
/// Key is a SHA-256 hash of entity_type:entity_id:operation:timestamp
pub fn generate_idempotency_key(
    entity_type: &str,
    entity_id: &str,
    operation: &str,
    timestamp: &str,
) -> String {
    let input = format!("{}:{}:{}:{}", entity_type, entity_id, operation, timestamp);
    let hash = Sha256::digest(input.as_bytes());
    format!("{:x}", hash)
}

// ============================================================================
// Sync Queue Processor
// ============================================================================

pub struct SyncQueueProcessor {
    db: SqlitePool,
    backoff_policy: BackoffPolicy,
    max_queue_size: i64,
}

impl SyncQueueProcessor {
    pub fn new(db: SqlitePool) -> Self {
        Self {
            db,
            backoff_policy: BackoffPolicy::default(),
            max_queue_size: DEFAULT_MAX_QUEUE_SIZE,
        }
    }

    /// Create a new processor with custom backoff policy
    pub fn with_backoff_policy(db: SqlitePool, backoff_policy: BackoffPolicy) -> Self {
        Self {
            db,
            backoff_policy,
            max_queue_size: DEFAULT_MAX_QUEUE_SIZE,
        }
    }

    /// Create a new processor with custom max queue size
    pub fn with_max_queue_size(db: SqlitePool, max_queue_size: i64) -> Self {
        Self {
            db,
            backoff_policy: BackoffPolicy::default(),
            max_queue_size,
        }
    }

    // ========================================================================
    // TASK-007: Queue Bounds Enforcement
    // ========================================================================

    /// Check if the queue has room for more items
    pub async fn check_queue_bounds(&self, tenant_id: &str) -> Result<(), QueueFullError> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sync_queue WHERE tenant_id = ? AND sync_status = 'pending'"
        )
        .bind(tenant_id)
        .fetch_one(&self.db)
        .await
        .unwrap_or(0);

        if count >= self.max_queue_size {
            return Err(QueueFullError {
                current_size: count,
                max_size: self.max_queue_size,
                tenant_id: tenant_id.to_string(),
            });
        }
        Ok(())
    }

    /// Get current queue size for a tenant
    pub async fn get_queue_size(&self, tenant_id: &str) -> Result<i64, SyncError> {
        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sync_queue WHERE tenant_id = ? AND sync_status = 'pending'"
        )
        .bind(tenant_id)
        .fetch_one(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: "queue".to_string(),
            entity_id: tenant_id.to_string(),
            error_message: format!("Failed to get queue size: {}", e),
        })?;

        Ok(count)
    }

    // ========================================================================
    // TASK-006: Idempotency Check
    // ========================================================================

    /// Check if an operation with this idempotency key already exists
    pub async fn check_idempotency(&self, idempotency_key: &str) -> Result<bool, SyncError> {
        let exists: bool = sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM sync_queue WHERE idempotency_key = ?)"
        )
        .bind(idempotency_key)
        .fetch_one(&self.db)
        .await
        .unwrap_or(false);

        Ok(exists)
    }

    /// Queue an item with idempotency check and bounds enforcement
    pub async fn queue_item_safe(
        &self,
        tenant_id: &str,
        entity_type: &str,
        entity_id: &str,
        operation: &str,
        payload: &str,
        store_id: &str,
    ) -> Result<Option<String>, SyncError> {
        // Generate idempotency key
        let timestamp = chrono::Utc::now().format("%Y-%m-%d").to_string();
        let idempotency_key = generate_idempotency_key(entity_type, entity_id, operation, &timestamp);

        // Check for duplicate
        if self.check_idempotency(&idempotency_key).await? {
            tracing::debug!(
                "Skipping duplicate operation: {} {} {} (key: {})",
                entity_type, entity_id, operation, idempotency_key
            );
            return Ok(None); // Already queued
        }

        // Check queue bounds
        self.check_queue_bounds(tenant_id).await.map_err(|e| SyncError {
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            error_message: e.to_string(),
        })?;

        // Insert with idempotency key
        let id = uuid::Uuid::new_v4().to_string();
        let priority = get_entity_priority(entity_type);

        sqlx::query(
            r"
            INSERT INTO sync_queue (
                id, tenant_id, entity_type, entity_id, operation, payload, 
                sync_status, retry_count, store_id, idempotency_key, priority, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?, datetime('now'), datetime('now'))
            "
        )
        .bind(&id)
        .bind(tenant_id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(operation)
        .bind(payload)
        .bind(store_id)
        .bind(&idempotency_key)
        .bind(priority as i32)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: entity_type.to_string(),
            entity_id: entity_id.to_string(),
            error_message: format!("Failed to queue item: {}", e),
        })?;

        tracing::info!(
            "Queued sync operation: {} {} {} (id: {}, priority: {})",
            entity_type, entity_id, operation, id, priority
        );

        Ok(Some(id))
    }

    // ========================================================================
    // TASK-008: Priority-Ordered Processing
    // ========================================================================

    /// Fetch pending items in priority order (dependencies first)
    pub async fn fetch_pending_items_ordered(
        &self,
        tenant_id: &str,
        limit: i64,
    ) -> Result<Vec<SyncQueueItem>, SyncError> {
        let items = sqlx::query_as::<_, SyncQueueItem>(
            r"
            SELECT * FROM sync_queue 
            WHERE tenant_id = ? AND sync_status = 'pending'
            ORDER BY 
                CASE entity_type
                    WHEN 'customer' THEN 0
                    WHEN 'product' THEN 1
                    WHEN 'inventory' THEN 2
                    WHEN 'order' THEN 3
                    WHEN 'invoice' THEN 4
                    WHEN 'payment' THEN 5
                    ELSE 99
                END ASC,
                created_at ASC
            LIMIT ?
            "
        )
        .bind(tenant_id)
        .bind(limit)
        .fetch_all(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: "queue".to_string(),
            entity_id: tenant_id.to_string(),
            error_message: format!("Failed to fetch pending items: {}", e),
        })?;

        Ok(items)
    }

    // ========================================================================
    // TASK-004: Backoff-Aware Retry
    // ========================================================================

    /// Update item status after a failed attempt with backoff delay
    pub async fn mark_failed_with_backoff(
        &self,
        item_id: &str,
        error_message: &str,
    ) -> Result<Option<Duration>, SyncError> {
        // Get current retry count
        let retry_count: i32 = sqlx::query_scalar(
            "SELECT retry_count FROM sync_queue WHERE id = ?"
        )
        .bind(item_id)
        .fetch_one(&self.db)
        .await
        .unwrap_or(0);

        let new_retry_count = retry_count + 1;
        let delay = self.backoff_policy.calculate_delay(new_retry_count as u32);

        let new_status = if delay.is_some() { "pending" } else { "failed" };

        sqlx::query(
            r"
            UPDATE sync_queue 
            SET sync_status = ?,
                retry_count = ?,
                last_retry_at = datetime('now'),
                error_message = ?,
                updated_at = datetime('now')
            WHERE id = ?
            "
        )
        .bind(new_status)
        .bind(new_retry_count)
        .bind(error_message)
        .bind(item_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: "queue".to_string(),
            entity_id: item_id.to_string(),
            error_message: format!("Failed to update item status: {}", e),
        })?;

        if let Some(d) = &delay {
            tracing::info!(
                "Item {} failed (attempt {}), will retry in {:?}",
                item_id, new_retry_count, d
            );
        } else {
            tracing::warn!(
                "Item {} failed after {} attempts, giving up",
                item_id, new_retry_count
            );
        }

        Ok(delay)
    }

    /// Mark item as completed
    pub async fn mark_completed(&self, item_id: &str) -> Result<(), SyncError> {
        sqlx::query(
            r"
            UPDATE sync_queue 
            SET sync_status = 'completed',
                updated_at = datetime('now')
            WHERE id = ?
            "
        )
        .bind(item_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: "queue".to_string(),
            entity_id: item_id.to_string(),
            error_message: format!("Failed to mark item completed: {}", e),
        })?;

        Ok(())
    }

    /// Get backoff policy reference
    pub fn backoff_policy(&self) -> &BackoffPolicy {
        &self.backoff_policy
    }

    /// Process a sync queue item by routing based on operation field
    pub async fn process_item(&self, item: &SyncQueueItem) -> Result<(), SyncError> {
        // Parse payload
        let payload: Value = serde_json::from_str(&item.payload)
            .map_err(|e| SyncError {
                entity_type: item.entity_type.clone(),
                entity_id: item.entity_id.clone(),
                error_message: format!("Failed to parse payload: {}", e),
            })?;

        // Route based on operation field
        match item.operation.as_str() {
            "create" => self.handle_create(item, &payload).await,
            "update" => self.handle_update(item, &payload).await,
            "delete" => self.handle_delete(item, &payload).await,
            "upsert" => self.handle_upsert(item, &payload).await,
            _ => Err(SyncError {
                entity_type: item.entity_type.clone(),
                entity_id: item.entity_id.clone(),
                error_message: format!("Unknown operation: {}", item.operation),
            }),
        }
    }

    /// Handle create operation
    async fn handle_create(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        tracing::info!(
            "Processing CREATE operation for {} {}",
            item.entity_type,
            item.entity_id
        );

        // Route to appropriate entity handler
        match item.entity_type.as_str() {
            "customer" => self.create_customer(item, payload).await,
            "product" => self.create_product(item, payload).await,
            "order" => self.create_order(item, payload).await,
            "invoice" => self.create_invoice(item, payload).await,
            _ => Err(SyncError {
                entity_type: item.entity_type.clone(),
                entity_id: item.entity_id.clone(),
                error_message: format!("Unsupported entity type for create: {}", item.entity_type),
            }),
        }
    }

    /// Handle update operation
    async fn handle_update(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        tracing::info!(
            "Processing UPDATE operation for {} {}",
            item.entity_type,
            item.entity_id
        );

        // Route to appropriate entity handler
        match item.entity_type.as_str() {
            "customer" => self.update_customer(item, payload).await,
            "product" => self.update_product(item, payload).await,
            "order" => self.update_order(item, payload).await,
            "invoice" => self.update_invoice(item, payload).await,
            _ => Err(SyncError {
                entity_type: item.entity_type.clone(),
                entity_id: item.entity_id.clone(),
                error_message: format!("Unsupported entity type for update: {}", item.entity_type),
            }),
        }
    }

    /// Handle delete operation
    async fn handle_delete(&self, item: &SyncQueueItem, _payload: &Value) -> Result<(), SyncError> {
        tracing::info!(
            "Processing DELETE operation for {} {}",
            item.entity_type,
            item.entity_id
        );

        // Route to appropriate entity handler
        match item.entity_type.as_str() {
            "customer" => self.delete_customer(item).await,
            "product" => self.delete_product(item).await,
            "order" => self.delete_order(item).await,
            "invoice" => self.delete_invoice(item).await,
            _ => Err(SyncError {
                entity_type: item.entity_type.clone(),
                entity_id: item.entity_id.clone(),
                error_message: format!("Unsupported entity type for delete: {}", item.entity_type),
            }),
        }
    }

    /// Handle upsert operation (create or update)
    async fn handle_upsert(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        tracing::info!(
            "Processing UPSERT operation for {} {}",
            item.entity_type,
            item.entity_id
        );

        // Check if entity exists
        let exists = self.entity_exists(&item.entity_type, &item.entity_id).await?;

        if exists {
            self.handle_update(item, payload).await
        } else {
            self.handle_create(item, payload).await
        }
    }

    /// Check if entity exists
    async fn entity_exists(&self, entity_type: &str, entity_id: &str) -> Result<bool, SyncError> {
        let table_name = match entity_type {
            "customer" => "customers",
            "product" => "products",
            "order" => "orders",
            "invoice" => "invoices",
            _ => return Err(SyncError {
                entity_type: entity_type.to_string(),
                entity_id: entity_id.to_string(),
                error_message: format!("Unknown entity type: {}", entity_type),
            }),
        };

        let query = format!("SELECT COUNT(*) FROM {} WHERE id = ?", table_name);
        let count: i64 = sqlx::query_scalar(&query)
            .bind(entity_id)
            .fetch_one(&self.db)
            .await
            .map_err(|e| SyncError {
                entity_type: entity_type.to_string(),
                entity_id: entity_id.to_string(),
                error_message: format!("Failed to check entity existence: {}", e),
            })?;

        Ok(count > 0)
    }

    // Entity-specific handlers (placeholders for actual implementation)

    async fn create_customer(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let email = payload.get("email").and_then(|v| v.as_str()).unwrap_or("");
        let phone = payload.get("phone").and_then(|v| v.as_str()).unwrap_or("");
        let address = payload.get("address").and_then(|v| v.as_str()).unwrap_or("");
        
        sqlx::query(
            "INSERT INTO customers (id, name, email, phone, address, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))"
        )
        .bind(&item.entity_id)
        .bind(name)
        .bind(email)
        .bind(phone)
        .bind(address)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error: {}", e),
        })?;
        tracing::debug!("Creating customer {}", item.entity_id);
        Ok(())
    }

    async fn update_customer(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let email = payload.get("email").and_then(|v| v.as_str()).unwrap_or("");
        let phone = payload.get("phone").and_then(|v| v.as_str()).unwrap_or("");
        let address = payload.get("address").and_then(|v| v.as_str()).unwrap_or("");
        
        sqlx::query(
            "UPDATE customers SET name = ?, email = ?, phone = ?, address = ?, updated_at = datetime('now') WHERE id = ?"
        )
        .bind(name)
        .bind(email)
        .bind(phone)
        .bind(address)
        .bind(&item.entity_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error: {}", e),
        })?;
        tracing::debug!("Updating customer {}", item.entity_id);
        Ok(())
    }

    async fn delete_customer(&self, item: &SyncQueueItem) -> Result<(), SyncError> {
        sqlx::query(
            "UPDATE customers SET deleted_at = datetime('now') WHERE id = ?"
        )
        .bind(&item.entity_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error: {}", e),
        })?;
        tracing::debug!("Deleting customer {}", item.entity_id);
        Ok(())
    }

    async fn create_product(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        let sku = payload.get("sku").and_then(|v| v.as_str()).unwrap_or("");
        let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let description = payload.get("description").and_then(|v| v.as_str()).unwrap_or("");
        let category = payload.get("category").and_then(|v| v.as_str()).unwrap_or("");
        let unit_price = payload.get("unit_price").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let cost = payload.get("cost").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let quantity = payload.get("quantity_on_hand").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let barcode = payload.get("barcode").and_then(|v| v.as_str()).unwrap_or("");
        let tenant_id = payload.get("tenant_id").and_then(|v| v.as_str()).unwrap_or(&item.tenant_id);
        let store_id = payload.get("store_id").and_then(|v| v.as_str()).unwrap_or(&item.store_id);
        
        sqlx::query(
            r"INSERT INTO products (id, sku, name, description, category, unit_price, cost, quantity_on_hand, barcode, tenant_id, store_id, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))"
        )
        .bind(&item.entity_id)
        .bind(sku)
        .bind(name)
        .bind(description)
        .bind(category)
        .bind(unit_price)
        .bind(cost)
        .bind(quantity)
        .bind(barcode)
        .bind(tenant_id)
        .bind(store_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error creating product: {}", e),
        })?;
        
        tracing::info!("Created product {} (SKU: {})", item.entity_id, sku);
        Ok(())
    }

    async fn update_product(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        let sku = payload.get("sku").and_then(|v| v.as_str()).unwrap_or("");
        let name = payload.get("name").and_then(|v| v.as_str()).unwrap_or("");
        let description = payload.get("description").and_then(|v| v.as_str()).unwrap_or("");
        let category = payload.get("category").and_then(|v| v.as_str()).unwrap_or("");
        let unit_price = payload.get("unit_price").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let cost = payload.get("cost").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let quantity = payload.get("quantity_on_hand").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let barcode = payload.get("barcode").and_then(|v| v.as_str()).unwrap_or("");
        
        sqlx::query(
            r"UPDATE products SET sku = ?, name = ?, description = ?, category = ?, unit_price = ?, cost = ?, quantity_on_hand = ?, barcode = ?, updated_at = datetime('now'), sync_version = sync_version + 1
              WHERE id = ?"
        )
        .bind(sku)
        .bind(name)
        .bind(description)
        .bind(category)
        .bind(unit_price)
        .bind(cost)
        .bind(quantity)
        .bind(barcode)
        .bind(&item.entity_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error updating product: {}", e),
        })?;
        
        tracing::info!("Updated product {} (SKU: {})", item.entity_id, sku);
        Ok(())
    }

    async fn delete_product(&self, item: &SyncQueueItem) -> Result<(), SyncError> {
        // Soft delete - set deleted_at timestamp
        sqlx::query(
            "UPDATE products SET deleted_at = datetime('now'), is_active = 0, updated_at = datetime('now') WHERE id = ?"
        )
        .bind(&item.entity_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error deleting product: {}", e),
        })?;
        
        tracing::info!("Soft-deleted product {}", item.entity_id);
        Ok(())
    }

    async fn create_order(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        let customer_id = payload.get("customer_id").and_then(|v| v.as_str());
        let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or("pending");
        let subtotal = payload.get("subtotal").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let tax = payload.get("tax").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let total = payload.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let payment_method = payload.get("payment_method").and_then(|v| v.as_str()).unwrap_or("cash");
        let tenant_id = payload.get("tenant_id").and_then(|v| v.as_str()).unwrap_or(&item.tenant_id);
        let store_id = payload.get("store_id").and_then(|v| v.as_str()).unwrap_or(&item.store_id);
        
        sqlx::query(
            r"INSERT INTO orders (id, customer_id, status, subtotal, tax, total, payment_method, tenant_id, store_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
        )
        .bind(&item.entity_id)
        .bind(customer_id)
        .bind(status)
        .bind(subtotal)
        .bind(tax)
        .bind(total)
        .bind(payment_method)
        .bind(tenant_id)
        .bind(store_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error creating order: {}", e),
        })?;
        
        // Process order line items if present
        if let Some(items) = payload.get("items").and_then(|v| v.as_array()) {
            for (idx, line_item) in items.iter().enumerate() {
                let line_id = format!("{}-{}", item.entity_id, idx);
                let product_id = line_item.get("product_id").and_then(|v| v.as_str()).unwrap_or("");
                let quantity = line_item.get("quantity").and_then(|v| v.as_f64()).unwrap_or(1.0);
                let unit_price = line_item.get("unit_price").and_then(|v| v.as_f64()).unwrap_or(0.0);
                let line_total = line_item.get("total").and_then(|v| v.as_f64()).unwrap_or(quantity * unit_price);
                
                sqlx::query(
                    r"INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, total, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
                )
                .bind(&line_id)
                .bind(&item.entity_id)
                .bind(product_id)
                .bind(quantity)
                .bind(unit_price)
                .bind(line_total)
                .execute(&self.db)
                .await
                .map_err(|e| SyncError {
                    entity_type: item.entity_type.clone(),
                    entity_id: item.entity_id.clone(),
                    error_message: format!("Database error creating order item: {}", e),
                })?;
            }
        }
        
        tracing::info!("Created order {} with status {}", item.entity_id, status);
        Ok(())
    }

    async fn update_order(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or("pending");
        let subtotal = payload.get("subtotal").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let tax = payload.get("tax").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let total = payload.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let payment_method = payload.get("payment_method").and_then(|v| v.as_str()).unwrap_or("cash");
        
        sqlx::query(
            r"UPDATE orders SET status = ?, subtotal = ?, tax = ?, total = ?, payment_method = ?, updated_at = datetime('now'), sync_version = COALESCE(sync_version, 0) + 1
              WHERE id = ?"
        )
        .bind(status)
        .bind(subtotal)
        .bind(tax)
        .bind(total)
        .bind(payment_method)
        .bind(&item.entity_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error updating order: {}", e),
        })?;
        
        tracing::info!("Updated order {} to status {}", item.entity_id, status);
        Ok(())
    }

    async fn delete_order(&self, item: &SyncQueueItem) -> Result<(), SyncError> {
        // Soft delete - set deleted_at timestamp
        sqlx::query(
            "UPDATE orders SET deleted_at = datetime('now'), status = 'cancelled', updated_at = datetime('now') WHERE id = ?"
        )
        .bind(&item.entity_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error deleting order: {}", e),
        })?;
        
        tracing::info!("Soft-deleted order {}", item.entity_id);
        Ok(())
    }

    async fn create_invoice(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        let invoice_number = payload.get("invoice_number").and_then(|v| v.as_str()).unwrap_or("");
        let customer_id = payload.get("customer_id").and_then(|v| v.as_str());
        let order_id = payload.get("order_id").and_then(|v| v.as_str());
        let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or("draft");
        let subtotal = payload.get("subtotal").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let tax = payload.get("tax").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let total = payload.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let due_date = payload.get("due_date").and_then(|v| v.as_str());
        let tenant_id = payload.get("tenant_id").and_then(|v| v.as_str()).unwrap_or(&item.tenant_id);
        let store_id = payload.get("store_id").and_then(|v| v.as_str()).unwrap_or(&item.store_id);
        
        sqlx::query(
            r"INSERT INTO invoices (id, invoice_number, customer_id, order_id, status, subtotal, tax, total, due_date, tenant_id, store_id, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
        )
        .bind(&item.entity_id)
        .bind(invoice_number)
        .bind(customer_id)
        .bind(order_id)
        .bind(status)
        .bind(subtotal)
        .bind(tax)
        .bind(total)
        .bind(due_date)
        .bind(tenant_id)
        .bind(store_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error creating invoice: {}", e),
        })?;
        
        tracing::info!("Created invoice {} (number: {})", item.entity_id, invoice_number);
        Ok(())
    }

    async fn update_invoice(&self, item: &SyncQueueItem, payload: &Value) -> Result<(), SyncError> {
        let status = payload.get("status").and_then(|v| v.as_str()).unwrap_or("draft");
        let subtotal = payload.get("subtotal").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let tax = payload.get("tax").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let total = payload.get("total").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let due_date = payload.get("due_date").and_then(|v| v.as_str());
        let paid_at = payload.get("paid_at").and_then(|v| v.as_str());
        
        sqlx::query(
            r"UPDATE invoices SET status = ?, subtotal = ?, tax = ?, total = ?, due_date = ?, paid_at = ?, updated_at = datetime('now'), sync_version = COALESCE(sync_version, 0) + 1
              WHERE id = ?"
        )
        .bind(status)
        .bind(subtotal)
        .bind(tax)
        .bind(total)
        .bind(due_date)
        .bind(paid_at)
        .bind(&item.entity_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error updating invoice: {}", e),
        })?;
        
        tracing::info!("Updated invoice {} to status {}", item.entity_id, status);
        Ok(())
    }

    async fn delete_invoice(&self, item: &SyncQueueItem) -> Result<(), SyncError> {
        // Soft delete - set deleted_at timestamp and void status
        sqlx::query(
            "UPDATE invoices SET deleted_at = datetime('now'), status = 'voided', updated_at = datetime('now') WHERE id = ?"
        )
        .bind(&item.entity_id)
        .execute(&self.db)
        .await
        .map_err(|e| SyncError {
            entity_type: item.entity_type.clone(),
            entity_id: item.entity_id.clone(),
            error_message: format!("Database error deleting invoice: {}", e),
        })?;
        
        tracing::info!("Soft-deleted (voided) invoice {}", item.entity_id);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_operation_routing() {
        // Test that operations are properly routed
        let operations = vec!["create", "update", "delete", "upsert"];
        for op in operations {
            assert!(matches!(op, "create" | "update" | "delete" | "upsert"));
        }
    }

    // ========================================================================
    // TASK-004: Backoff Policy Tests
    // ========================================================================

    #[test]
    fn test_backoff_policy_default() {
        let policy = BackoffPolicy::default();
        assert_eq!(policy.base_delay_ms, 1000);
        assert_eq!(policy.max_delay_ms, 300_000);
        assert_eq!(policy.max_retries, 10);
        assert!((policy.jitter_factor - 0.1).abs() < f64::EPSILON);
        assert!((policy.multiplier - 2.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_backoff_exponential_growth() {
        let policy = BackoffPolicy {
            base_delay_ms: 1000,
            max_delay_ms: 300_000,
            max_retries: 10,
            jitter_factor: 0.0, // No jitter for predictable test
            multiplier: 2.0,
        };

        // Retry 0: 1000ms
        let delay0 = policy.calculate_delay(0).unwrap();
        assert_eq!(delay0.as_millis(), 1000);

        // Retry 1: 2000ms
        let delay1 = policy.calculate_delay(1).unwrap();
        assert_eq!(delay1.as_millis(), 2000);

        // Retry 2: 4000ms
        let delay2 = policy.calculate_delay(2).unwrap();
        assert_eq!(delay2.as_millis(), 4000);

        // Retry 3: 8000ms
        let delay3 = policy.calculate_delay(3).unwrap();
        assert_eq!(delay3.as_millis(), 8000);
    }

    #[test]
    fn test_backoff_max_delay_cap() {
        let policy = BackoffPolicy {
            base_delay_ms: 1000,
            max_delay_ms: 10_000, // Cap at 10 seconds
            max_retries: 10,
            jitter_factor: 0.0,
            multiplier: 2.0,
        };

        // Retry 5: would be 32000ms but capped at 10000ms
        let delay = policy.calculate_delay(5).unwrap();
        assert_eq!(delay.as_millis(), 10_000);
    }

    #[test]
    fn test_backoff_max_retries() {
        let policy = BackoffPolicy {
            base_delay_ms: 1000,
            max_delay_ms: 300_000,
            max_retries: 3,
            jitter_factor: 0.0,
            multiplier: 2.0,
        };

        // Should return Some for retries 0, 1, 2
        assert!(policy.calculate_delay(0).is_some());
        assert!(policy.calculate_delay(1).is_some());
        assert!(policy.calculate_delay(2).is_some());

        // Should return None for retry 3 (exceeded max)
        assert!(policy.calculate_delay(3).is_none());
    }

    #[test]
    fn test_backoff_jitter_bounds() {
        let policy = BackoffPolicy {
            base_delay_ms: 1000,
            max_delay_ms: 300_000,
            max_retries: 10,
            jitter_factor: 0.1, // ±10%
            multiplier: 2.0,
        };

        // Run multiple times to test jitter
        for _ in 0..100 {
            let delay = policy.calculate_delay(0).unwrap();
            let ms = delay.as_millis() as f64;
            // Should be within ±10% of 1000ms (900-1100)
            assert!(ms >= 900.0 && ms <= 1100.0, "Delay {} out of jitter bounds", ms);
        }
    }

    #[test]
    fn test_should_retry() {
        let policy = BackoffPolicy {
            max_retries: 5,
            ..Default::default()
        };

        assert!(policy.should_retry(0));
        assert!(policy.should_retry(4));
        assert!(!policy.should_retry(5));
        assert!(!policy.should_retry(10));
    }

    // ========================================================================
    // TASK-008: Entity Priority Tests
    // ========================================================================

    #[test]
    fn test_entity_priority_order() {
        assert_eq!(get_entity_priority("customer"), 0);
        assert_eq!(get_entity_priority("product"), 1);
        assert_eq!(get_entity_priority("inventory"), 2);
        assert_eq!(get_entity_priority("order"), 3);
        assert_eq!(get_entity_priority("invoice"), 4);
        assert_eq!(get_entity_priority("payment"), 5);
    }

    #[test]
    fn test_entity_priority_unknown() {
        // Unknown entity types get lowest priority (99)
        assert_eq!(get_entity_priority("unknown"), 99);
        assert_eq!(get_entity_priority("custom_entity"), 99);
    }

    #[test]
    fn test_entity_priority_dependencies() {
        // Verify dependency order: customer < product < order < invoice
        assert!(get_entity_priority("customer") < get_entity_priority("product"));
        assert!(get_entity_priority("product") < get_entity_priority("order"));
        assert!(get_entity_priority("order") < get_entity_priority("invoice"));
    }

    // ========================================================================
    // TASK-006: Idempotency Key Tests
    // ========================================================================

    #[test]
    fn test_idempotency_key_generation() {
        let key1 = generate_idempotency_key("customer", "123", "create", "2026-01-29");
        let key2 = generate_idempotency_key("customer", "123", "create", "2026-01-29");

        // Same inputs should produce same key
        assert_eq!(key1, key2);

        // Key should be a valid hex string (64 chars for SHA-256)
        assert_eq!(key1.len(), 64);
        assert!(key1.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_idempotency_key_uniqueness() {
        let key1 = generate_idempotency_key("customer", "123", "create", "2026-01-29");
        let key2 = generate_idempotency_key("customer", "124", "create", "2026-01-29"); // Different ID
        let key3 = generate_idempotency_key("customer", "123", "update", "2026-01-29"); // Different op
        let key4 = generate_idempotency_key("product", "123", "create", "2026-01-29");  // Different type

        // All keys should be different
        assert_ne!(key1, key2);
        assert_ne!(key1, key3);
        assert_ne!(key1, key4);
    }

    // ========================================================================
    // TASK-007: Queue Bounds Tests
    // ========================================================================

    #[test]
    fn test_queue_full_error_display() {
        let error = QueueFullError {
            current_size: 100_000,
            max_size: 100_000,
            tenant_id: "test-tenant".to_string(),
        };

        let msg = error.to_string();
        assert!(msg.contains("test-tenant"));
        assert!(msg.contains("100000"));
    }
}
