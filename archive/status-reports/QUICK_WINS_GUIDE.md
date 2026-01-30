# Quick Wins Guide - EasySale Sync

## 🎯 High-Impact Tasks (< 2 hours each)

These tasks will significantly improve the sync system with minimal effort.

---

## 1. Integrate Credential Decryption (2 hours)

**Current State**: Credential service exists but orchestrator doesn't use it properly

**What to Do**:
```rust
// In sync_orchestrator.rs, update get_credentials():
async fn get_credentials(
    &self,
    tenant_id: &str,
    platform: &str,
) -> Result<serde_json::Value, String> {
    // Use credential_service instead of direct query
    let cred_service = CredentialService::new(self.db.clone());
    cred_service.get_credentials(tenant_id, platform).await
}
```

**Files to Modify**:
- `backend/rust/src/services/sync_orchestrator.rs`

**Impact**: Proper credential decryption, more secure

---

## 2. Implement Order Fetching Logic (2 hours)

**Current State**: Returns empty Vec, needs real query

**What to Do**:
```rust
// In sync_orchestrator.rs, update get_orders_to_sync():
async fn get_orders_to_sync(
    &self,
    tenant_id: &str,
    options: &SyncOptions,
) -> Result<Vec<i64>, String> {
    let mut query = "SELECT id FROM orders WHERE tenant_id = ?".to_string();
    
    // Add filters from options
    if let Some(date_range) = &options.date_range {
        query.push_str(" AND created_at BETWEEN ? AND ?");
    }
    
    if let Some(filters) = options.filters.get("status") {
        query.push_str(" AND status = ?");
    }
    
    // Execute query and return IDs
    sqlx::query_scalar(&query)
        .bind(tenant_id)
        .fetch_all(&self.db)
        .await
        .map_err(|e| format!("Failed to fetch orders: {}", e))
}
```

**Files to Modify**:
- `backend/rust/src/services/sync_orchestrator.rs`

**Impact**: Sync actually processes real orders

---

## 3. Load Transformer Config from Database (1 hour)

**Current State**: Returns default config, should load from database

**What to Do**:
```rust
// In sync_orchestrator.rs, update get_transformer_config():
async fn get_transformer_config(
    &self,
    tenant_id: &str,
) -> Result<TransformerConfig, String> {
    // Query settings table for transformer config
    let config_json: Option<String> = sqlx::query_scalar(
        "SELECT value FROM settings WHERE tenant_id = ? AND key = 'transformer_config'"
    )
    .bind(tenant_id)
    .fetch_optional(&self.db)
    .await
    .map_err(|e| format!("Failed to load config: {}", e))?;
    
    match config_json {
        Some(json) => serde_json::from_str(&json)
            .map_err(|e| format!("Invalid config JSON: {}", e)),
        None => Ok(TransformerConfig::default()),
    }
}
```

**Files to Modify**:
- `backend/rust/src/services/sync_orchestrator.rs`

**Impact**: Per-tenant transformer customization

---

## 4. Wire Up Webhook-Triggered Sync (2 hours)

**Current State**: Webhooks received but don't trigger sync

**What to Do**:
```rust
// In handlers/webhooks.rs, after validating webhook:
async fn handle_woocommerce_webhook(
    webhook: WooCommerceWebhook,
    db: web::Data<SqlitePool>,
) -> Result<HttpResponse, Error> {
    // Validate signature (already done)
    
    // Enqueue sync job
    let sync_id = Uuid::new_v4().to_string();
    sqlx::query(
        "INSERT INTO sync_queue (id, tenant_id, entity_type, entity_id, operation, status)
         VALUES (?, ?, ?, ?, 'sync', 'pending')"
    )
    .bind(&sync_id)
    .bind(&webhook.tenant_id)
    .bind(&webhook.topic) // e.g., "order.updated"
    .bind(&webhook.resource_id)
    .execute(db.get_ref())
    .await?;
    
    // Trigger sync orchestrator
    let orchestrator = SyncOrchestrator::new(db.get_ref().clone());
    tokio::spawn(async move {
        orchestrator.process_queue().await;
    });
    
    Ok(HttpResponse::Ok().finish())
}
```

**Files to Modify**:
- `backend/rust/src/handlers/webhooks.rs`
- `backend/rust/src/services/sync_orchestrator.rs` (add process_queue method)

**Impact**: Real-time sync on webhook events

---

## 5. Implement Incremental Sync (3 hours)

**Current State**: Only full sync supported

**What to Do**:
```rust
// In sync_orchestrator.rs, update sync_entity_type():
async fn sync_entity_type(...) -> Result<SyncResult, String> {
    // Get last sync timestamp
    let last_sync: Option<String> = sqlx::query_scalar(
        "SELECT last_sync_at FROM sync_state 
         WHERE tenant_id = ? AND connector_id = ? AND entity_type = ?"
    )
    .bind(tenant_id)
    .bind(connector_id)
    .bind(entity_type)
    .fetch_optional(&self.db)
    .await?;
    
    // Add modified_after filter for incremental sync
    if options.mode == SyncMode::Incremental && last_sync.is_some() {
        // Fetch only records modified since last_sync
        // For WooCommerce: add ?modified_after={last_sync} to API call
        // For QuickBooks: use WHERE MetaData.LastUpdatedTime > '{last_sync}'
    }
    
    // After successful sync, update last_sync_at
    sqlx::query(
        "UPDATE sync_state SET last_sync_at = datetime('now') 
         WHERE tenant_id = ? AND connector_id = ? AND entity_type = ?"
    )
    .bind(tenant_id)
    .bind(connector_id)
    .bind(entity_type)
    .execute(&self.db)
    .await?;
    
    // ... rest of sync logic
}
```

**Files to Modify**:
- `backend/rust/src/services/sync_orchestrator.rs`
- `backend/rust/src/connectors/woocommerce/orders.rs` (add modified_after param)
- `backend/rust/src/connectors/quickbooks/client.rs` (add LastUpdatedTime filter)

**Impact**: Much faster syncs, less API usage

---

## 6. Add Configurable OAuth Redirect URI (30 minutes)

**Current State**: Hardcoded `http://localhost:7945/api/integrations/quickbooks/callback`

**What to Do**:
```rust
// In .env file:
OAUTH_REDIRECT_URI=http://localhost:7945/api/integrations/quickbooks/callback

// In handlers/integrations.rs:
let redirect_uri = std::env::var("OAUTH_REDIRECT_URI")
    .unwrap_or_else(|_| "http://localhost:7945/api/integrations/quickbooks/callback".to_string());

let auth_url = format!(
    "https://appcenter.intuit.com/connect/oauth2?client_id={}&redirect_uri={}&response_type=code&scope={}&state={}",
    client_id, redirect_uri, scope, state
);
```

**Files to Modify**:
- `backend/rust/.env`
- `backend/rust/src/handlers/integrations.rs` (2 locations)

**Impact**: Production-ready OAuth configuration

---

## 7. Implement Webhook Configuration Storage (2 hours)

**Current State**: TODO in code, configs not persisted

**What to Do**:

**Step 1**: Create migration
```sql
-- migrations/030_webhook_configs.sql
CREATE TABLE IF NOT EXISTS webhook_configs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    platform TEXT NOT NULL, -- 'woocommerce', 'quickbooks'
    event_type TEXT NOT NULL, -- 'order.created', 'invoice.updated', etc.
    enabled INTEGER NOT NULL DEFAULT 1,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(tenant_id, platform, event_type)
);

CREATE INDEX idx_webhook_configs_tenant ON webhook_configs(tenant_id);
CREATE INDEX idx_webhook_configs_platform ON webhook_configs(tenant_id, platform);
```

**Step 2**: Update handlers
```rust
// In handlers/webhooks.rs:
async fn get_webhook_config(
    tenant_id: &str,
    platform: &str,
    event_type: &str,
    db: &SqlitePool,
) -> Result<WebhookConfig, String> {
    sqlx::query_as::<_, WebhookConfig>(
        "SELECT * FROM webhook_configs 
         WHERE tenant_id = ? AND platform = ? AND event_type = ? AND enabled = 1"
    )
    .bind(tenant_id)
    .bind(platform)
    .bind(event_type)
    .fetch_one(db)
    .await
    .map_err(|e| format!("Webhook config not found: {}", e))
}
```

**Files to Modify**:
- `backend/rust/migrations/030_webhook_configs.sql` (create)
- `backend/rust/src/handlers/webhooks.rs`
- `backend/rust/src/db/migrations.rs` (add to list)

**Impact**: Webhook settings persist across restarts

---

## 8. Add Real Connectivity Check Cache (Already Done! ✅)

**Status**: ✅ COMPLETE

Task 22.1 implemented HealthCheckService with 30-second caching.

---

## 🎯 Recommended Order

**Day 1 (4 hours)**:
1. Configurable OAuth redirect URI (30 min)
2. Integrate credential decryption (2 hours)
3. Load transformer config from database (1 hour)
4. Test OAuth flow with real credentials (30 min)

**Day 2 (4 hours)**:
1. Implement order fetching logic (2 hours)
2. Wire up webhook-triggered sync (2 hours)
3. Test webhook flow with WooCommerce staging (30 min)

**Day 3 (4 hours)**:
1. Implement incremental sync (3 hours)
2. Webhook configuration storage (2 hours)
3. Test full sync flow end-to-end (1 hour)

**Total**: 3 days to fully functional sync system

---

## 🧪 Testing Checklist

After completing these tasks:

- [ ] OAuth flow works with QuickBooks sandbox
- [ ] Credentials decrypt correctly
- [ ] Orders fetch with filters (status, date range)
- [ ] Transformer config loads from database
- [ ] Webhooks trigger sync jobs
- [ ] Incremental sync only fetches new records
- [ ] Webhook configs persist across restarts
- [ ] Full sync flow: WooCommerce → QuickBooks works
- [ ] Full sync flow: WooCommerce → Supabase works

---

## 📝 Notes

- All these tasks build on existing infrastructure
- No breaking changes required
- Each task is independent (can be done in any order)
- Total effort: ~12 hours spread over 3 days
- Result: Production-ready sync system

---

**Next**: After these quick wins, move to Epic 4 (Safety Controls) or Epic 6 (UI)

