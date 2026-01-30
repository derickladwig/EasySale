//! Sync Orchestrator
//!
//! Coordinates multi-step sync flows between platforms:
//! - Ensures dependencies are created first (customer before invoice, item before line)
//! - Manages sync state and operation tracking
//! - Prevents concurrent syncs for same entity type per tenant
//! - Uses existing sync_queue for operation tracking
//! - Circuit breaker pattern for external service resilience (TASK-005)
//!
//! Requirements: 2.2, 2.6, 4.5, 8.6

use crate::models::sync::SyncState;
use crate::services::sync_direction_control::{SyncDirectionControl, SyncDirection};
use crate::services::credential_service::{CredentialService, PlatformCredentials};
use crate::connectors::woocommerce::client::WooCommerceClient;
use crate::connectors::quickbooks::client::QuickBooksClient;
use crate::connectors::supabase::client::SupabaseClient;
use crate::flows::woo_to_qbo::WooToQboFlow;
use crate::flows::woo_to_supabase::WooToSupabaseFlow;
use sqlx::SqlitePool;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::Mutex;
use uuid::Uuid;
use serde::{Deserialize, Serialize};

// ============================================================================
// TASK-005: Circuit Breaker Implementation
// ============================================================================

/// Circuit breaker configuration
#[derive(Debug, Clone)]
pub struct CircuitBreakerPolicy {
    /// Number of consecutive failures before opening the circuit
    pub failure_threshold: u32,
    /// Time to wait before attempting to close the circuit (half-open state)
    pub reset_timeout_ms: u64,
    /// Number of successful requests needed to close the circuit from half-open
    pub success_threshold: u32,
}

impl Default for CircuitBreakerPolicy {
    fn default() -> Self {
        Self {
            failure_threshold: 5,
            reset_timeout_ms: 60_000, // 1 minute
            success_threshold: 3,
        }
    }
}

/// Circuit breaker state
#[derive(Debug, Clone)]
pub enum CircuitState {
    /// Normal operation - requests allowed
    Closed,
    /// Circuit is open - requests blocked
    Open { opened_at: Instant },
    /// Testing if service recovered - limited requests allowed
    HalfOpen { successes: u32 },
}

/// Circuit breaker for a specific service/connector
#[derive(Debug)]
pub struct CircuitBreaker {
    policy: CircuitBreakerPolicy,
    state: CircuitState,
    consecutive_failures: u32,
    service_name: String,
}

impl CircuitBreaker {
    pub fn new(service_name: &str, policy: CircuitBreakerPolicy) -> Self {
        Self {
            policy,
            state: CircuitState::Closed,
            consecutive_failures: 0,
            service_name: service_name.to_string(),
        }
    }

    /// Check if a request should be allowed
    pub fn should_allow_request(&mut self) -> bool {
        match &self.state {
            CircuitState::Closed => true,
            CircuitState::Open { opened_at } => {
                let elapsed = opened_at.elapsed().as_millis() as u64;
                if elapsed >= self.policy.reset_timeout_ms {
                    // Transition to half-open
                    tracing::info!(
                        "Circuit breaker for {} transitioning to half-open after {}ms",
                        self.service_name, elapsed
                    );
                    self.state = CircuitState::HalfOpen { successes: 0 };
                    true
                } else {
                    tracing::debug!(
                        "Circuit breaker for {} is open, blocking request ({}ms remaining)",
                        self.service_name, self.policy.reset_timeout_ms - elapsed
                    );
                    false
                }
            }
            CircuitState::HalfOpen { .. } => true,
        }
    }

    /// Record a successful request
    pub fn record_success(&mut self) {
        self.consecutive_failures = 0;

        match &mut self.state {
            CircuitState::HalfOpen { successes } => {
                *successes += 1;
                if *successes >= self.policy.success_threshold {
                    tracing::info!(
                        "Circuit breaker for {} closing after {} successful requests",
                        self.service_name, successes
                    );
                    self.state = CircuitState::Closed;
                }
            }
            CircuitState::Open { .. } => {
                // Shouldn't happen, but handle gracefully
                self.state = CircuitState::Closed;
            }
            CircuitState::Closed => {
                // Already closed, nothing to do
            }
        }
    }

    /// Record a failed request
    pub fn record_failure(&mut self) {
        self.consecutive_failures += 1;

        match &self.state {
            CircuitState::Closed => {
                if self.consecutive_failures >= self.policy.failure_threshold {
                    tracing::warn!(
                        "Circuit breaker for {} opening after {} consecutive failures",
                        self.service_name, self.consecutive_failures
                    );
                    self.state = CircuitState::Open { opened_at: Instant::now() };
                }
            }
            CircuitState::HalfOpen { .. } => {
                // Any failure in half-open state reopens the circuit
                tracing::warn!(
                    "Circuit breaker for {} reopening from half-open state",
                    self.service_name
                );
                self.state = CircuitState::Open { opened_at: Instant::now() };
            }
            CircuitState::Open { .. } => {
                // Already open, nothing to do
            }
        }
    }

    /// Get current state
    pub fn state(&self) -> &CircuitState {
        &self.state
    }

    /// Check if circuit is open (blocking requests)
    pub fn is_open(&self) -> bool {
        matches!(self.state, CircuitState::Open { .. })
    }

    /// Get service name
    pub fn service_name(&self) -> &str {
        &self.service_name
    }
}

/// Error when circuit breaker is open
#[derive(Debug, Clone)]
pub struct CircuitOpenError {
    pub service_name: String,
    pub retry_after_ms: u64,
}

impl std::fmt::Display for CircuitOpenError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Circuit breaker open for {}, retry after {}ms",
            self.service_name, self.retry_after_ms
        )
    }
}

// ============================================================================
// Existing Types
// ============================================================================

/// Resume checkpoint for interrupted syncs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResumeCheckpoint {
    pub entity_type: String,
    pub last_entity_id: String,
    pub page: u32,
    pub timestamp: String,
}

/// Sync run result
#[derive(Debug, Clone)]
pub struct SyncResult {
    pub sync_id: String,
    pub status: SyncResultStatus,
    pub records_processed: usize,
    pub records_created: usize,
    pub records_updated: usize,
    pub records_failed: usize,
    pub errors: Vec<SyncError>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, PartialEq)]
pub enum SyncResultStatus {
    Success,
    Partial,
    Failed,
}

#[derive(Debug, Clone)]
pub struct SyncError {
    pub entity_type: String,
    pub entity_id: String,
    pub error_message: String,
}

/// Sync options
#[derive(Debug, Clone)]
pub struct SyncOptions {
    pub mode: SyncMode,
    pub dry_run: bool,
    pub entity_types: Option<Vec<String>>,
    pub date_range: Option<DateRange>,
    pub filters: HashMap<String, String>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum SyncMode {
    Full,
    Incremental,
}

#[derive(Debug, Clone)]
pub struct DateRange {
    pub start: String,
    pub end: String,
}

/// Sync orchestrator
pub struct SyncOrchestrator {
    db: SqlitePool,
    /// Active syncs per tenant/entity to prevent concurrent runs
    active_syncs: Arc<Mutex<HashMap<String, String>>>,
    /// Sync direction control service
    direction_control: Arc<SyncDirectionControl>,
    /// Credential service for loading platform credentials
    credential_service: Arc<CredentialService>,
    /// Circuit breakers per connector (TASK-005)
    circuit_breakers: Arc<Mutex<HashMap<String, CircuitBreaker>>>,
}

impl SyncOrchestrator {
    pub fn new(db: SqlitePool) -> Self {
        let direction_control = Arc::new(SyncDirectionControl::new(db.clone()));
        let credential_service = Arc::new(
            CredentialService::new(db.clone())
                .expect("Failed to initialize credential service")
        );
        Self {
            db,
            active_syncs: Arc::new(Mutex::new(HashMap::new())),
            direction_control,
            credential_service,
            circuit_breakers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    // ========================================================================
    // TASK-005: Circuit Breaker Methods
    // ========================================================================

    /// Check if sync should proceed (circuit breaker check)
    async fn check_circuit_breaker(&self, connector_id: &str) -> Result<(), CircuitOpenError> {
        let mut breakers = self.circuit_breakers.lock().await;
        
        // Create breaker if it doesn't exist
        if !breakers.contains_key(connector_id) {
            breakers.insert(
                connector_id.to_string(),
                CircuitBreaker::new(connector_id, CircuitBreakerPolicy::default()),
            );
        }
        
        if let Some(breaker) = breakers.get_mut(connector_id) {
            if !breaker.should_allow_request() {
                if let CircuitState::Open { opened_at } = breaker.state() {
                    let elapsed = opened_at.elapsed().as_millis() as u64;
                    let retry_after = breaker.policy.reset_timeout_ms.saturating_sub(elapsed);
                    return Err(CircuitOpenError {
                        service_name: connector_id.to_string(),
                        retry_after_ms: retry_after,
                    });
                }
            }
        }
        Ok(())
    }

    /// Record a successful sync operation
    async fn record_sync_success(&self, connector_id: &str) {
        let mut breakers = self.circuit_breakers.lock().await;
        if let Some(breaker) = breakers.get_mut(connector_id) {
            breaker.record_success();
        }
    }

    /// Record a failed sync operation
    async fn record_sync_failure(&self, connector_id: &str) {
        let mut breakers = self.circuit_breakers.lock().await;
        if let Some(breaker) = breakers.get_mut(connector_id) {
            breaker.record_failure();
        }
    }

    /// Get circuit breaker status for all connectors
    pub async fn get_circuit_breaker_status(&self) -> HashMap<String, String> {
        let breakers = self.circuit_breakers.lock().await;
        breakers
            .iter()
            .map(|(k, v)| {
                let status = match v.state() {
                    CircuitState::Closed => "closed".to_string(),
                    CircuitState::Open { opened_at } => {
                        format!("open ({}ms ago)", opened_at.elapsed().as_millis())
                    }
                    CircuitState::HalfOpen { successes } => {
                        format!("half-open ({} successes)", successes)
                    }
                };
                (k.clone(), status)
            })
            .collect()
    }

    /// Start a sync operation
    pub async fn start_sync(
        &self,
        tenant_id: &str,
        connector_id: &str,
        options: SyncOptions,
    ) -> Result<SyncResult, String> {
        let sync_id = Uuid::new_v4().to_string();
        let start_time = std::time::Instant::now();

        // TASK-005: Check circuit breaker before starting
        if let Err(e) = self.check_circuit_breaker(connector_id).await {
            return Err(format!(
                "Sync blocked by circuit breaker: {} (retry after {}ms)",
                e.service_name, e.retry_after_ms
            ));
        }

        // Initialize circuit breaker for this connector if not exists
        {
            let mut breakers = self.circuit_breakers.lock().await;
            if !breakers.contains_key(connector_id) {
                breakers.insert(
                    connector_id.to_string(),
                    CircuitBreaker::new(connector_id, CircuitBreakerPolicy::default()),
                );
            }
        }

        // Check if sync already running for this tenant/connector
        let lock_key = format!("{}:{}", tenant_id, connector_id);
        {
            let mut active = self.active_syncs.lock().await;
            if active.contains_key(&lock_key) {
                return Err(format!(
                    "Sync already running for tenant {} connector {}",
                    tenant_id, connector_id
                ));
            }
            active.insert(lock_key.clone(), sync_id.clone());
        }

        // Execute sync
        let result = self.execute_sync(tenant_id, connector_id, &sync_id, options).await;

        // Release lock
        {
            let mut active = self.active_syncs.lock().await;
            active.remove(&lock_key);
        }

        // Calculate duration
        let duration_ms = start_time.elapsed().as_millis() as u64;

        match result {
            Ok(mut sync_result) => {
                sync_result.duration_ms = duration_ms;
                
                // TASK-005: Record success with circuit breaker
                if sync_result.status == SyncResultStatus::Success {
                    self.record_sync_success(connector_id).await;
                } else if sync_result.status == SyncResultStatus::Failed {
                    self.record_sync_failure(connector_id).await;
                }
                
                Ok(sync_result)
            }
            Err(e) => {
                // TASK-005: Record failure with circuit breaker
                self.record_sync_failure(connector_id).await;
                Err(e)
            }
        }
    }

    /// Execute sync operation
    async fn execute_sync(
        &self,
        tenant_id: &str,
        connector_id: &str,
        sync_id: &str,
        options: SyncOptions,
    ) -> Result<SyncResult, String> {
        // Create sync state record
        self.create_sync_state(tenant_id, sync_id, connector_id, &options).await?;

        let mut result = SyncResult {
            sync_id: sync_id.to_string(),
            status: SyncResultStatus::Success,
            records_processed: 0,
            records_created: 0,
            records_updated: 0,
            records_failed: 0,
            errors: Vec::new(),
            duration_ms: 0,
        };

        // Determine entity types to sync
        let entity_types = options.entity_types.clone().unwrap_or_else(|| {
            vec!["customers".to_string(), "products".to_string(), "orders".to_string()]
        });

        // Sync each entity type in dependency order
        for entity_type in entity_types {
            match self.sync_entity_type(
                tenant_id,
                connector_id,
                sync_id,
                &entity_type,
                &options,
            ).await {
                Ok(entity_result) => {
                    result.records_processed += entity_result.records_processed;
                    result.records_created += entity_result.records_created;
                    result.records_updated += entity_result.records_updated;
                    result.records_failed += entity_result.records_failed;
                    result.errors.extend(entity_result.errors);
                    
                    // Update progress after each entity type
                    if let Err(e) = self.update_sync_progress(
                        sync_id,
                        result.records_processed,
                        result.records_created,
                        result.records_failed,
                    ).await {
                        tracing::warn!("Failed to update sync progress: {}", e);
                    }
                }
                Err(e) => {
                    result.errors.push(SyncError {
                        entity_type: entity_type.clone(),
                        entity_id: "N/A".to_string(),
                        error_message: e,
                    });
                    result.records_failed += 1;
                }
            }
        }

        // Determine final status
        if result.records_failed > 0 {
            if result.records_created > 0 || result.records_updated > 0 {
                result.status = SyncResultStatus::Partial;
            } else {
                result.status = SyncResultStatus::Failed;
            }
        }

        // Update sync state
        self.update_sync_state(sync_id, &result).await?;

        Ok(result)
    }

    /// Sync a specific entity type
    async fn sync_entity_type(
        &self,
        tenant_id: &str,
        connector_id: &str,
        sync_id: &str,
        entity_type: &str,
        options: &SyncOptions,
    ) -> Result<SyncResult, String> {
        let mut result = SyncResult {
            sync_id: sync_id.to_string(),
            status: SyncResultStatus::Success,
            records_processed: 0,
            records_created: 0,
            records_updated: 0,
            records_failed: 0,
            errors: Vec::new(),
            duration_ms: 0,
        };
        
        // Parse connector_id to determine source and target
        // Format: "source-to-target" (e.g., "woocommerce-to-quickbooks", "woocommerce-to-supabase")
        let parts: Vec<&str> = connector_id.split("-to-").collect();
        if parts.len() != 2 {
            return Err(format!("Invalid connector_id format: {}", connector_id));
        }
        
        let source = parts[0];
        let target = parts[1];
        
        tracing::info!(
            "Syncing {} from {} to {} (tenant: {}, sync_id: {})",
            entity_type, source, target, tenant_id, sync_id
        );
        
        // Route based on source and target
        match (source, target, entity_type) {
            ("woocommerce", "quickbooks", entity) => {
                self.sync_woo_to_qbo(tenant_id, sync_id, entity, options, &mut result).await?;
            }
            ("woocommerce", "supabase", entity) => {
                self.sync_woo_to_supabase(tenant_id, sync_id, entity, options, &mut result).await?;
            }
            _ => {
                return Err(format!(
                    "Unsupported sync route: {} → {} for entity type {}",
                    source, target, entity_type
                ));
            }
        }
        
        Ok(result)
    }

    /// Sync WooCommerce to QuickBooks
    async fn sync_woo_to_qbo(
        &self,
        tenant_id: &str,
        sync_id: &str,
        entity_type: &str,
        options: &SyncOptions,
        result: &mut SyncResult,
    ) -> Result<(), String> {
        // Load WooCommerce credentials
        let woo_creds = self.credential_service
            .get_credentials(tenant_id, "woocommerce")
            .await
            .map_err(|e| format!("Failed to load WooCommerce credentials: {}", e))?
            .ok_or_else(|| "WooCommerce credentials not found".to_string())?;

        let woo_config = match woo_creds {
            PlatformCredentials::WooCommerce(config) => config,
            _ => return Err("Invalid WooCommerce credentials type".to_string()),
        };

        // Load QuickBooks credentials
        let qbo_creds = self.credential_service
            .get_credentials(tenant_id, "quickbooks")
            .await
            .map_err(|e| format!("Failed to load QuickBooks credentials: {}", e))?
            .ok_or_else(|| "QuickBooks credentials not found".to_string())?;

        let qbo_config = match qbo_creds {
            PlatformCredentials::QuickBooks(config) => config,
            _ => return Err("Invalid QuickBooks credentials type".to_string()),
        };

        // Load OAuth tokens
        let qbo_tokens = self.credential_service
            .get_oauth_tokens(tenant_id, "quickbooks")
            .await
            .map_err(|e| format!("Failed to load QuickBooks tokens: {}", e))?
            .ok_or_else(|| "QuickBooks OAuth tokens not found".to_string())?;

        // Create clients
        let woo_client = WooCommerceClient::new(woo_config)
            .map_err(|e| format!("Failed to create WooCommerce client: {}", e))?;

        let qbo_client = QuickBooksClient::new(&qbo_config, &qbo_tokens)
            .map_err(|e| format!("Failed to create QuickBooks client: {}", e))?;

        // Create flow
        let flow = WooToQboFlow::with_default_config(
            self.db.clone(),
            woo_client,
            qbo_client,
        );

        // Sync based on entity type
        match entity_type {
            "orders" => {
                self.sync_woo_orders_to_qbo(&flow, sync_id, options, result).await?;
            }
            "customers" => {
                tracing::info!("Customer sync not yet implemented for WooCommerce → QuickBooks");
                // TODO: Implement customer sync
            }
            "products" => {
                tracing::info!("Product sync not yet implemented for WooCommerce → QuickBooks");
                // TODO: Implement product sync
            }
            _ => {
                return Err(format!("Unsupported entity type: {}", entity_type));
            }
        }

        Ok(())
    }

    /// Sync WooCommerce orders to QuickBooks
    async fn sync_woo_orders_to_qbo(
        &self,
        flow: &WooToQboFlow,
        sync_id: &str,
        options: &SyncOptions,
        result: &mut SyncResult,
    ) -> Result<(), String> {
        use crate::connectors::woocommerce::orders::OrderQuery;
        use futures_util::stream::{self, StreamExt};
        
        let mut page = 1;
        let mut total_fetched = 0;
        let concurrency_limit = 5; // Process 5 orders concurrently
        
        loop {
            // Build query for current page
            let query = OrderQuery {
                per_page: Some(100),
                page: Some(page),
                status: None,
                modified_after: options.date_range.as_ref().map(|dr| dr.start.clone()),
                order_by: Some("date".to_string()),
                order: Some("desc".to_string()),
            };

            // Fetch orders from WooCommerce
            let orders = flow.woo_client()
                .get_orders(query)
                .await
                .map_err(|e| format!("Failed to fetch WooCommerce orders (page {}): {}", page, e))?;

            if orders.is_empty() {
                tracing::info!("No more orders to fetch (page {})", page);
                break;
            }

            total_fetched += orders.len();
            tracing::info!("Fetched {} orders from WooCommerce (page {}, total: {})", orders.len(), page, total_fetched);

            if options.dry_run {
                result.records_processed += orders.len();
                tracing::info!("DRY RUN: Would sync {} orders", orders.len());
                page += 1;
                continue;
            }

            // Process orders in parallel
            let sync_results: Vec<_> = stream::iter(orders)
                .map(|woo_order| {
                    let flow_ref = flow;
                    let order_id = woo_order.id;
                    async move {
                        (order_id, flow_ref.sync_order("default-tenant", order_id, false).await)
                    }
                })
                .buffer_unordered(concurrency_limit)
                .collect()
                .await;

            // Aggregate results and store last processed ID
            let mut last_order_id = String::new();
            for (order_id, sync_result) in sync_results {
                last_order_id = order_id.to_string();
                result.records_processed += 1;
                match sync_result {
                    Ok(order_result) => {
                        if order_result.customer_created {
                            result.records_created += 1;
                        }
                        result.records_created += order_result.items_created;
                        if order_result.qbo_id.is_some() {
                            result.records_created += 1;
                        }
                        tracing::info!(
                            "Successfully synced order {} to QuickBooks (QBO ID: {:?})",
                            order_result.order_id,
                            order_result.qbo_id
                        );
                    }
                    Err(e) => {
                        result.records_failed += 1;
                        result.errors.push(SyncError {
                            entity_type: "order".to_string(),
                            entity_id: order_id.to_string(),
                            error_message: e.clone(),
                        });
                        tracing::error!("Failed to sync order {}: {}", order_id, e);
                    }
                }
            }

            // Store resume checkpoint after each page
            if !last_order_id.is_empty() {
                if let Err(e) = self.store_resume_checkpoint(sync_id, "order", &last_order_id, page).await {
                    tracing::warn!("Failed to store resume checkpoint: {}", e);
                }
            }

            // Update progress after each page
            if let Err(e) = self.update_sync_progress(
                sync_id,
                result.records_processed,
                result.records_created,
                result.records_failed,
            ).await {
                tracing::warn!("Failed to update sync progress: {}", e);
            }

            page += 1;
        }

        tracing::info!("Completed order sync: {} total orders fetched", total_fetched);
        Ok(())
    }

    /// Sync WooCommerce to Supabase
    async fn sync_woo_to_supabase(
        &self,
        tenant_id: &str,
        sync_id: &str,
        entity_type: &str,
        options: &SyncOptions,
        result: &mut SyncResult,
    ) -> Result<(), String> {
        // Load WooCommerce credentials
        let woo_creds = self.credential_service
            .get_credentials(tenant_id, "woocommerce")
            .await
            .map_err(|e| format!("Failed to load WooCommerce credentials: {}", e))?
            .ok_or_else(|| "WooCommerce credentials not found".to_string())?;

        let woo_config = match woo_creds {
            PlatformCredentials::WooCommerce(config) => config,
            _ => return Err("Invalid WooCommerce credentials type".to_string()),
        };

        // Load Supabase credentials
        let supabase_creds = self.credential_service
            .get_credentials(tenant_id, "supabase")
            .await
            .map_err(|e| format!("Failed to load Supabase credentials: {}", e))?
            .ok_or_else(|| "Supabase credentials not found".to_string())?;

        let supabase_config = match supabase_creds {
            PlatformCredentials::Supabase(config) => config,
            _ => return Err("Invalid Supabase credentials type".to_string()),
        };

        // Create clients
        let woo_client = WooCommerceClient::new(woo_config)
            .map_err(|e| format!("Failed to create WooCommerce client: {}", e))?;

        use crate::connectors::supabase::client::SupabaseConfig;
        let supabase_config_struct = SupabaseConfig {
            project_url: supabase_config.project_url.clone(),
            service_role_key: supabase_config.service_role_key.clone(),
            read_only: false,
        };

        let supabase_client = SupabaseClient::new(supabase_config_struct)
            .map_err(|e| format!("Failed to create Supabase client: {}", e))?;

        // Create flow
        let flow = WooToSupabaseFlow::new(
            self.db.clone(),
            woo_client,
            supabase_client,
        );

        // Sync based on entity type
        match entity_type {
            "orders" => {
                self.sync_woo_orders_to_supabase(&flow, sync_id, options, result).await?;
            }
            "customers" => {
                self.sync_woo_customers_to_supabase(&flow, sync_id, options, result).await?;
            }
            "products" => {
                self.sync_woo_products_to_supabase(&flow, sync_id, options, result).await?;
            }
            _ => {
                return Err(format!("Unsupported entity type: {}", entity_type));
            }
        }

        Ok(())
    }

    /// Sync WooCommerce orders to Supabase
    async fn sync_woo_orders_to_supabase(
        &self,
        flow: &WooToSupabaseFlow,
        _sync_id: &str,
        options: &SyncOptions,
        result: &mut SyncResult,
    ) -> Result<(), String> {
        use crate::connectors::woocommerce::orders::OrderQuery;
        
        // Build query for fetching orders
        let query = OrderQuery {
            per_page: Some(100),
            page: Some(1),
            status: None,
            modified_after: options.date_range.as_ref().map(|dr| dr.start.clone()),
            order_by: Some("date".to_string()),
            order: Some("desc".to_string()),
        };

        // Fetch orders from WooCommerce
        let orders = flow.woo_client()
            .get_orders(query)
            .await
            .map_err(|e| format!("Failed to fetch WooCommerce orders: {}", e))?;

        tracing::info!("Fetched {} orders from WooCommerce for Supabase sync", orders.len());

        // Process each order
        for woo_order in orders {
            let order_id = woo_order.id;

            match flow.sync_order(order_id, options.dry_run).await {
                Ok(sync_result) => {
                    result.records_processed += 1;
                    if sync_result.supabase_id.is_some() {
                        result.records_created += 1;
                    }
                    tracing::info!(
                        "Successfully synced order {} to Supabase (ID: {:?})",
                        sync_result.entity_id,
                        sync_result.supabase_id
                    );
                }
                Err(e) => {
                    result.records_failed += 1;
                    result.errors.push(SyncError {
                        entity_type: "order".to_string(),
                        entity_id: order_id.to_string(),
                        error_message: e.clone(),
                    });
                    tracing::error!("Failed to sync order {}: {}", order_id, e);
                }
            }
        }

        Ok(())
    }

    /// Sync WooCommerce customers to Supabase
    async fn sync_woo_customers_to_supabase(
        &self,
        flow: &WooToSupabaseFlow,
        _sync_id: &str,
        options: &SyncOptions,
        result: &mut SyncResult,
    ) -> Result<(), String> {
        use crate::connectors::woocommerce::customers::CustomerQuery;
        
        // Build query for fetching customers
        let query = CustomerQuery {
            per_page: Some(100),
            page: Some(1),
            search: None,
            email: None,
            role: None,
            order_by: Some("registered_date".to_string()),
            order: Some("desc".to_string()),
        };

        // Fetch customers from WooCommerce
        let customers = flow.woo_client()
            .get_customers(query)
            .await
            .map_err(|e| format!("Failed to fetch WooCommerce customers: {}", e))?;

        tracing::info!("Fetched {} customers from WooCommerce for Supabase sync", customers.len());

        // Process each customer
        for woo_customer in customers {
            let customer_id = woo_customer.id;

            match flow.sync_customer(customer_id, options.dry_run).await {
                Ok(sync_result) => {
                    result.records_processed += 1;
                    if sync_result.supabase_id.is_some() {
                        result.records_created += 1;
                    }
                    tracing::info!(
                        "Successfully synced customer {} to Supabase (ID: {:?})",
                        sync_result.entity_id,
                        sync_result.supabase_id
                    );
                }
                Err(e) => {
                    result.records_failed += 1;
                    result.errors.push(SyncError {
                        entity_type: "customer".to_string(),
                        entity_id: customer_id.to_string(),
                        error_message: e.clone(),
                    });
                    tracing::error!("Failed to sync customer {}: {}", customer_id, e);
                }
            }
        }

        Ok(())
    }

    /// Sync WooCommerce products to Supabase
    async fn sync_woo_products_to_supabase(
        &self,
        flow: &WooToSupabaseFlow,
        _sync_id: &str,
        options: &SyncOptions,
        result: &mut SyncResult,
    ) -> Result<(), String> {
        use crate::connectors::woocommerce::products::ProductQuery;
        
        // Build query for fetching products
        let query = ProductQuery {
            per_page: Some(100),
            page: Some(1),
            search: None,
            sku: None,
            status: None,
            product_type: None,
            category: None,
            tag: None,
            modified_after: options.date_range.as_ref().map(|dr| dr.start.clone()),
            order_by: Some("date".to_string()),
            order: Some("desc".to_string()),
        };

        // Fetch products from WooCommerce
        let products = flow.woo_client()
            .get_products(query)
            .await
            .map_err(|e| format!("Failed to fetch WooCommerce products: {}", e))?;

        tracing::info!("Fetched {} products from WooCommerce for Supabase sync", products.len());

        // Process each product
        for woo_product in products {
            let product_id = woo_product.id;

            match flow.sync_product(product_id, options.dry_run).await {
                Ok(sync_result) => {
                    result.records_processed += 1;
                    if sync_result.supabase_id.is_some() {
                        result.records_created += 1;
                    }
                    tracing::info!(
                        "Successfully synced product {} to Supabase (ID: {:?})",
                        sync_result.entity_id,
                        sync_result.supabase_id
                    );
                }
                Err(e) => {
                    result.records_failed += 1;
                    result.errors.push(SyncError {
                        entity_type: "product".to_string(),
                        entity_id: product_id.to_string(),
                        error_message: e.clone(),
                    });
                    tracing::error!("Failed to sync product {}: {}", product_id, e);
                }
            }
        }

        Ok(())
    }

    /// Create sync state record
    async fn create_sync_state(
        &self,
        tenant_id: &str,
        sync_id: &str,
        connector_id: &str,
        options: &SyncOptions,
    ) -> Result<(), String> {
        let mode = match options.mode {
            SyncMode::Full => "full",
            SyncMode::Incremental => "incremental",
        };

        sqlx::query(
            r"
            INSERT INTO sync_state (
                id, tenant_id, connector_id, sync_mode, status, 
                dry_run, started_at, created_at, updated_at
            )
            VALUES (?, ?, ?, ?, 'running', ?, datetime('now'), datetime('now'), datetime('now'))
            "
        )
        .bind(sync_id)
        .bind(tenant_id)
        .bind(connector_id)
        .bind(mode)
        .bind(options.dry_run)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to create sync state: {}", e))?;

        Ok(())
    }

    /// Update sync state with results
    async fn update_sync_state(
        &self,
        sync_id: &str,
        result: &SyncResult,
    ) -> Result<(), String> {
        let status = match result.status {
            SyncResultStatus::Success => "completed",
            SyncResultStatus::Partial => "partial",
            SyncResultStatus::Failed => "failed",
        };

        sqlx::query(
            r"
            UPDATE sync_state 
            SET status = ?,
                records_processed = ?,
                records_created = ?,
                records_updated = ?,
                records_failed = ?,
                completed_at = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ?
            "
        )
        .bind(status)
        .bind(result.records_processed as i64)
        .bind(result.records_created as i64)
        .bind(result.records_updated as i64)
        .bind(result.records_failed as i64)
        .bind(sync_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to update sync state: {}", e))?;

        Ok(())
    }

    /// Update sync progress (for real-time updates)
    async fn update_sync_progress(
        &self,
        sync_id: &str,
        records_processed: usize,
        records_created: usize,
        records_failed: usize,
    ) -> Result<(), String> {
        sqlx::query(
            r"
            UPDATE sync_state 
            SET records_processed = ?,
                records_created = ?,
                records_failed = ?,
                updated_at = datetime('now')
            WHERE id = ?
            "
        )
        .bind(records_processed as i64)
        .bind(records_created as i64)
        .bind(records_failed as i64)
        .bind(sync_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to update sync progress: {}", e))?;

        Ok(())
    }

    /// Store resume checkpoint (last processed entity ID)
    async fn store_resume_checkpoint(
        &self,
        sync_id: &str,
        entity_type: &str,
        last_entity_id: &str,
        page: u32,
    ) -> Result<(), String> {
        let checkpoint_data = serde_json::json!({
            "entity_type": entity_type,
            "last_entity_id": last_entity_id,
            "page": page,
            "timestamp": chrono::Utc::now().to_rfc3339()
        });

        sqlx::query(
            r"
            UPDATE sync_state 
            SET resume_checkpoint = ?,
                updated_at = datetime('now')
            WHERE id = ?
            "
        )
        .bind(checkpoint_data.to_string())
        .bind(sync_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to store resume checkpoint: {}", e))?;

        Ok(())
    }

    /// Get resume checkpoint for a sync
    /// 
    /// Note: Currently unused - reserved for future resume capability.
    #[allow(dead_code)]
    async fn get_resume_checkpoint(
        &self,
        sync_id: &str,
    ) -> Result<Option<ResumeCheckpoint>, String> {
        let row: Option<(Option<String>,)> = sqlx::query_as(
            r"
            SELECT resume_checkpoint FROM sync_state WHERE id = ?
            "
        )
        .bind(sync_id)
        .fetch_optional(&self.db)
        .await
        .map_err(|e| format!("Failed to get resume checkpoint: {}", e))?;

        match row {
            Some((Some(checkpoint_json),)) => {
                let checkpoint: ResumeCheckpoint = serde_json::from_str(&checkpoint_json)
                    .map_err(|e| format!("Failed to parse resume checkpoint: {}", e))?;
                Ok(Some(checkpoint))
            }
            _ => Ok(None),
        }
    }

    /// Get sync status
    pub async fn get_sync_status(&self, sync_id: &str) -> Result<SyncState, String> {
        let row = sqlx::query_as::<_, SyncState>(
            r"
            SELECT * FROM sync_state WHERE id = ?
            "
        )
        .bind(sync_id)
        .fetch_one(&self.db)
        .await
        .map_err(|e| format!("Failed to get sync status: {}", e))?;

        Ok(row)
    }

    /// Stop a running sync
    pub async fn stop_sync(&self, sync_id: &str) -> Result<(), String> {
        sqlx::query(
            r"
            UPDATE sync_state 
            SET status = 'cancelled',
                completed_at = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ? AND status = 'running'
            "
        )
        .bind(sync_id)
        .execute(&self.db)
        .await
        .map_err(|e| format!("Failed to stop sync: {}", e))?;

        Ok(())
    }

    /// Check if sync should proceed based on direction configuration
    pub async fn should_sync_entity(
        &self,
        credential_id: &str,
        entity_type: &str,
        entity_id: &str,
        data_hash: &str,
    ) -> Result<bool, String> {
        // Check sync direction
        let direction = self.direction_control.get_sync_direction(credential_id).await?;
        
        // For one-way sync, always allow (assuming we're syncing in the correct direction)
        if direction == SyncDirection::OneWay {
            // Check for sync loops
            return self.direction_control.should_sync(entity_type, entity_id, data_hash).await;
        }

        // For two-way sync, check sync loops
        self.direction_control.should_sync(entity_type, entity_id, data_hash).await
    }

    /// Handle a sync conflict
    pub async fn handle_conflict(
        &self,
        tenant_id: &str,
        credential_id: &str,
        platform: &str,
        entity_type: &str,
        entity_id: &str,
        platform_entity_id: Option<&str>,
        pos_data: &str,
        platform_data: &str,
        pos_updated_at: &str,
        platform_updated_at: &str,
    ) -> Result<String, String> {
        // Get sync configuration
        let config = self.direction_control.get_sync_config(credential_id).await?;
        
        // Get entity-specific configuration
        let entity_config = config.get_entity_config(entity_type)
            .ok_or_else(|| format!("No sync configuration for entity type: {}", entity_type))?;

        // Create conflict record
        let conflict_id = self.direction_control.create_conflict(
            tenant_id,
            credential_id,
            platform,
            entity_type,
            entity_id,
            platform_entity_id,
            pos_data,
            platform_data,
            pos_updated_at,
            platform_updated_at,
            entity_config.conflict_strategy.clone(),
        ).await?;

        // Apply resolution strategy
        let resolved_data = self.direction_control.apply_resolution_strategy(
            &conflict_id,
            entity_config.conflict_strategy.clone(),
            pos_data,
            platform_data,
            pos_updated_at,
            platform_updated_at,
        ).await?;

        Ok(resolved_data)
    }

    /// Get sync direction control service
    pub fn direction_control(&self) -> Arc<SyncDirectionControl> {
        self.direction_control.clone()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sync_result_status() {
        let mut result = SyncResult {
            sync_id: "test".to_string(),
            status: SyncResultStatus::Success,
            records_processed: 10,
            records_created: 5,
            records_updated: 5,
            records_failed: 0,
            errors: Vec::new(),
            duration_ms: 1000,
        };

        assert_eq!(result.status, SyncResultStatus::Success);

        result.records_failed = 2;
        result.status = if result.records_created > 0 || result.records_updated > 0 {
            SyncResultStatus::Partial
        } else {
            SyncResultStatus::Failed
        };

        assert_eq!(result.status, SyncResultStatus::Partial);
    }

    #[test]
    fn test_sync_options() {
        let options = SyncOptions {
            mode: SyncMode::Incremental,
            dry_run: true,
            entity_types: Some(vec!["orders".to_string()]),
            date_range: Some(DateRange {
                start: "2024-01-01".to_string(),
                end: "2024-01-31".to_string(),
            }),
            filters: HashMap::new(),
        };

        assert_eq!(options.mode, SyncMode::Incremental);
        assert!(options.dry_run);
        assert_eq!(options.entity_types.unwrap().len(), 1);
    }

    // ========================================================================
    // TASK-005: Circuit Breaker Tests
    // ========================================================================

    #[test]
    fn test_circuit_breaker_default_policy() {
        let policy = CircuitBreakerPolicy::default();
        assert_eq!(policy.failure_threshold, 5);
        assert_eq!(policy.reset_timeout_ms, 60_000);
        assert_eq!(policy.success_threshold, 3);
    }

    #[test]
    fn test_circuit_breaker_initial_state() {
        let breaker = CircuitBreaker::new("test-service", CircuitBreakerPolicy::default());
        assert!(matches!(breaker.state(), CircuitState::Closed));
        assert!(!breaker.is_open());
    }

    #[test]
    fn test_circuit_breaker_opens_after_failures() {
        let policy = CircuitBreakerPolicy {
            failure_threshold: 3,
            reset_timeout_ms: 60_000,
            success_threshold: 2,
        };
        let mut breaker = CircuitBreaker::new("test-service", policy);

        // Should be closed initially
        assert!(breaker.should_allow_request());

        // Record failures
        breaker.record_failure();
        assert!(!breaker.is_open());
        breaker.record_failure();
        assert!(!breaker.is_open());
        breaker.record_failure();

        // Should be open after 3 failures
        assert!(breaker.is_open());
        assert!(!breaker.should_allow_request());
    }

    #[test]
    fn test_circuit_breaker_success_resets_failures() {
        let policy = CircuitBreakerPolicy {
            failure_threshold: 3,
            reset_timeout_ms: 60_000,
            success_threshold: 2,
        };
        let mut breaker = CircuitBreaker::new("test-service", policy);

        // Record 2 failures
        breaker.record_failure();
        breaker.record_failure();

        // Success should reset the counter
        breaker.record_success();

        // Now need 3 more failures to open
        breaker.record_failure();
        breaker.record_failure();
        assert!(!breaker.is_open());
        breaker.record_failure();
        assert!(breaker.is_open());
    }

    #[test]
    fn test_circuit_breaker_half_open_closes_on_success() {
        let policy = CircuitBreakerPolicy {
            failure_threshold: 1,
            reset_timeout_ms: 0, // Immediate transition to half-open
            success_threshold: 2,
        };
        let mut breaker = CircuitBreaker::new("test-service", policy);

        // Open the circuit
        breaker.record_failure();
        assert!(breaker.is_open());

        // Should transition to half-open immediately (reset_timeout_ms = 0)
        assert!(breaker.should_allow_request());
        assert!(matches!(breaker.state(), CircuitState::HalfOpen { .. }));

        // Record successes to close
        breaker.record_success();
        assert!(matches!(breaker.state(), CircuitState::HalfOpen { successes: 1 }));
        breaker.record_success();
        assert!(matches!(breaker.state(), CircuitState::Closed));
    }

    #[test]
    fn test_circuit_breaker_half_open_reopens_on_failure() {
        let policy = CircuitBreakerPolicy {
            failure_threshold: 1,
            reset_timeout_ms: 0,
            success_threshold: 2,
        };
        let mut breaker = CircuitBreaker::new("test-service", policy);

        // Open the circuit
        breaker.record_failure();

        // Transition to half-open
        breaker.should_allow_request();

        // Failure in half-open should reopen
        breaker.record_failure();
        assert!(breaker.is_open());
    }

    #[test]
    fn test_circuit_open_error_display() {
        let error = CircuitOpenError {
            service_name: "woocommerce".to_string(),
            retry_after_ms: 30_000,
        };

        let msg = error.to_string();
        assert!(msg.contains("woocommerce"));
        assert!(msg.contains("30000"));
    }
}
