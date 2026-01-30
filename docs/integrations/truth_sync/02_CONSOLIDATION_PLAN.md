# Consolidation Plan

**Audit Date:** 2026-01-29  
**Status:** APPROVED FOR IMPLEMENTATION

---

## 1. EXECUTIVE SUMMARY

The existing WooCommerce and QuickBooks integrations are **well-architected with no duplication**. This plan focuses on:
1. **Fixing 3 critical security/configuration issues**
2. **Adding missing resilience features** to the sync engine
3. **Extending frontend UI** with missing operator controls
4. **NO new parallel systems** - all changes extend existing code

---

## 2. PHASE 1: CRITICAL FIXES (Day 1)

### 2.1 Fix Hardcoded OAuth Redirect URI

**File:** `backend/crates/server/src/handlers/integrations.rs`

**Current Code (lines 180-195):**
```rust
let redirect_uri = std::env::var("QUICKBOOKS_REDIRECT_URI")
    .map_err(|_| ApiError::configuration("QUICKBOOKS_REDIRECT_URI not configured"))?;
```

**Change:**
1. Add startup validation in `main.rs` to fail fast if `QUICKBOOKS_REDIRECT_URI` not set
2. Document in `.env.example`
3. Add to deployment checklist

**Rollback:** Revert to current behavior (env var with error message)

### 2.2 Fix Default STORE_ID/TENANT_ID

**File:** `backend/crates/server/src/main.rs`

**Current Code (lines 117-127):**
```rust
let store_id = std::env::var("STORE_ID").unwrap_or_else(|_| "default-store".to_string());
let tenant_id = std::env::var("TENANT_ID").unwrap_or_else(|_| "tenant_default".to_string());
```

**Change:**
1. Remove fallback defaults
2. Fail startup if not set (all environments)
3. Add to `.env.example` with clear documentation

**Rollback:** Restore fallback defaults

### 2.3 Fix SQL Injection in Reporting

**File:** `backend/crates/server/src/handlers/reporting.rs`

**Change:**
1. Apply `qbo_sanitizer` functions to all user inputs
2. Use parameterized queries throughout
3. Add security tests

**Rollback:** Revert to current queries (with documented risk)

---

## 3. PHASE 2: SYNC ENGINE RESILIENCE (Days 2-3)

### 3.1 Add Exponential Backoff

**File:** `backend/crates/server/src/services/sync_queue_processor.rs`

**Add:**
```rust
pub struct RetryPolicy {
    pub base_delay_ms: u64,      // 1000
    pub max_delay_ms: u64,       // 300000 (5 min)
    pub max_retries: u32,        // 10
    pub jitter_factor: f64,      // 0.1
}

fn calculate_backoff(retry_count: u32, policy: &RetryPolicy) -> u64 {
    let delay = policy.base_delay_ms * 2u64.pow(retry_count);
    let capped = delay.min(policy.max_delay_ms);
    let jitter = (rand::random::<f64>() - 0.5) * 2.0 * policy.jitter_factor;
    (capped as f64 * (1.0 + jitter)) as u64
}
```

**Rollback:** Remove retry policy, restore fixed intervals

### 3.2 Add Circuit Breaker

**File:** `backend/crates/server/src/services/sync_orchestrator.rs` (extend)

**Add:**
```rust
pub struct CircuitBreaker {
    pub failure_threshold: u32,   // 5
    pub reset_timeout_ms: u64,    // 60000 (1 min)
    pub half_open_requests: u32,  // 1
}

pub enum CircuitState {
    Closed,
    Open { until: Instant },
    HalfOpen,
}
```

**Rollback:** Remove circuit breaker, allow all requests

### 3.3 Add Idempotency Keys

**File:** `backend/migrations/` (new migration)

**Add column to `sync_queue`:**
```sql
ALTER TABLE sync_queue ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX idx_sync_queue_idempotency ON sync_queue(idempotency_key) WHERE idempotency_key IS NOT NULL;
```

**Rollback:** Drop column and index

### 3.4 Enforce Queue Bounds

**File:** `backend/crates/server/src/services/sync_queue_processor.rs`

**Add check before insert:**
```rust
async fn check_queue_bounds(&self, tenant_id: &str) -> Result<(), SyncError> {
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM sync_queue WHERE tenant_id = ? AND sync_status = 'pending'"
    )
    .bind(tenant_id)
    .fetch_one(&self.db)
    .await?;
    
    let max_size = self.get_max_queue_size(tenant_id).await?;
    if count >= max_size {
        return Err(SyncError::QueueFull { current: count, max: max_size });
    }
    Ok(())
}
```

**Rollback:** Remove check, allow unbounded queue

### 3.5 Add Ordering Constraints

**File:** `backend/crates/server/src/services/sync_queue_processor.rs`

**Add dependency tracking:**
```rust
const ENTITY_ORDER: &[&str] = &["customer", "product", "inventory", "order", "invoice"];

fn get_entity_priority(entity_type: &str) -> u32 {
    ENTITY_ORDER.iter().position(|&e| e == entity_type).unwrap_or(99) as u32
}
```

**Rollback:** Remove ordering, process in insertion order

---

## 4. PHASE 3: FRONTEND OPERATOR CONTROLS (Days 4-5)

### 4.1 Add Sync Direction Toggle

**File:** `frontend/src/settings/pages/IntegrationsPage.tsx` (extend)

**Add UI:**
- Global sync direction dropdown: Pull / Push / Bidirectional / Disabled
- Per-integration override toggle
- Per-entity override in SyncScheduleManager

**API:** Extend `PUT /api/settings/sync` with `direction` field

**Rollback:** Remove UI elements, keep backend defaults

### 4.2 Add Delete Policy Toggle

**File:** `frontend/src/settings/pages/NetworkPage.tsx` (extend)

**Add UI:**
- Delete policy dropdown: Local Only / Archive Remote / Delete Remote
- Warning modal for "Delete Remote" selection
- Per-entity override option

**API:** Extend `PUT /api/settings/sync` with `delete_policy` field

**Rollback:** Remove UI elements, default to "Local Only"

### 4.3 Add Sync Direction API

**File:** `backend/crates/server/src/handlers/settings.rs` (extend)

**Add endpoint:**
```rust
#[derive(Deserialize)]
pub struct SyncDirectionConfig {
    pub global_direction: SyncDirection,  // pull, push, bidirectional, disabled
    pub entity_overrides: HashMap<String, SyncDirection>,
    pub delete_policy: DeletePolicy,      // local_only, archive_remote, delete_remote
}

pub async fn update_sync_direction(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    config: web::Json<SyncDirectionConfig>,
) -> Result<HttpResponse, ApiError> {
    // Store in settings table
}
```

**Rollback:** Remove endpoint, use hardcoded defaults

---

## 5. PHASE 4: VERIFICATION (Day 6)

### 5.1 Startup Validation

**Add to `main.rs`:**
```rust
fn validate_required_env_vars() -> Result<(), std::io::Error> {
    let required = vec![
        "STORE_ID",
        "TENANT_ID",
        "QUICKBOOKS_REDIRECT_URI",
        "DATABASE_URL",
    ];
    
    for var in required {
        if std::env::var(var).is_err() {
            return Err(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                format!("Required environment variable {} not set", var)
            ));
        }
    }
    Ok(())
}
```

### 5.2 Rate Limiting Demonstration

**Add test:**
```rust
#[tokio::test]
async fn test_rate_limiting_backoff() {
    // Simulate 429 response
    // Verify exponential backoff applied
    // Verify jitter within bounds
}
```

### 5.3 Idempotency Demonstration

**Add test:**
```rust
#[tokio::test]
async fn test_idempotent_sync() {
    // Queue same event twice with same idempotency key
    // Verify only one operation executed
    // Verify no duplicate remote changes
}
```

---

## 6. FILES TO MODIFY

| File | Phase | Change Type |
|------|-------|-------------|
| `backend/crates/server/src/main.rs` | 1 | Extend (startup validation) |
| `backend/crates/server/src/handlers/integrations.rs` | 1 | Fix (OAuth redirect) |
| `backend/crates/server/src/handlers/reporting.rs` | 1 | Fix (SQL injection) |
| `backend/crates/server/src/services/sync_queue_processor.rs` | 2 | Extend (backoff, bounds, ordering) |
| `backend/crates/server/src/services/sync_orchestrator.rs` | 2 | Extend (circuit breaker) |
| `backend/migrations/` | 2 | Add (idempotency column) |
| `frontend/src/settings/pages/IntegrationsPage.tsx` | 3 | Extend (direction toggle) |
| `frontend/src/settings/pages/NetworkPage.tsx` | 3 | Extend (delete policy) |
| `frontend/src/services/syncApi.ts` | 3 | Extend (new API calls) |
| `backend/crates/server/src/handlers/settings.rs` | 3 | Extend (direction API) |

---

## 7. NO-DELETE POLICY

**Per project requirements:**
- No files will be deleted
- Deprecated code will be marked with `#[deprecated]` attribute
- Old behavior preserved behind feature flags where applicable
- All changes are additive or in-place modifications

---

## 8. ROLLBACK PLAN

Each phase has independent rollback:

| Phase | Rollback Method | Time to Rollback |
|-------|-----------------|------------------|
| Phase 1 | Git revert commits | < 5 minutes |
| Phase 2 | Drop migration, revert code | < 10 minutes |
| Phase 3 | Remove UI components | < 5 minutes |
| Phase 4 | Remove tests | < 2 minutes |

**Full rollback:** `git revert --no-commit HEAD~N` where N = number of commits

---

## 9. SUCCESS CRITERIA

| Criterion | Verification Method |
|-----------|---------------------|
| No external calls during startup | Startup log analysis |
| No runaway background loops | Rate limit test |
| Build passes | `cargo build --release` |
| Tests pass | `cargo test` |
| Offline sale → queue → flush works | Integration test |
| Retry is idempotent | Idempotency test |
| Frontend controls persist | E2E test |
