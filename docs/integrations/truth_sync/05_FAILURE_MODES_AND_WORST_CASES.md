# Failure Modes and Worst Cases

**Audit Date:** 2026-01-29  
**Status:** APPROVED

---

## 1. FAILURE MODE CATALOG

### 1.1 External Service Outages

| Scenario | Current Behavior | Required Behavior | Gap |
|----------|------------------|-------------------|-----|
| WooCommerce API down | Sync fails, error logged | Queue operations, retry with backoff | ❌ No backoff |
| QuickBooks API down | Sync fails, error logged | Queue operations, retry with backoff | ❌ No backoff |
| Supabase down | Sync fails, error logged | Queue operations, retry with backoff | ❌ No backoff |
| Network partition | Sync fails immediately | Detect, queue, retry when restored | ⚠️ Partial |

### 1.2 Rate Limiting (429 Responses)

| Scenario | Current Behavior | Required Behavior | Gap |
|----------|------------------|-------------------|-----|
| WooCommerce 429 | Alert sent, sync stops | Parse Retry-After, auto-retry | ❌ No auto-retry |
| QuickBooks 429 | Alert sent, sync stops | Parse Retry-After, auto-retry | ❌ No auto-retry |
| Burst of requests | All requests sent | Throttle to rate limit | ❌ No throttling |

### 1.3 Authentication Failures

| Scenario | Current Behavior | Required Behavior | Gap |
|----------|------------------|-------------------|-----|
| OAuth token expired | 401 error, sync fails | Auto-refresh, retry | ⚠️ Background refresh only |
| Token expired mid-sync | Sync fails with 401 | Refresh inline, continue | ❌ No inline refresh |
| Refresh token expired | Sync fails | Alert user, require re-auth | ✅ Implemented |
| Invalid credentials | Sync fails | Clear credentials, alert user | ✅ Implemented |

### 1.4 Data Conflicts

| Scenario | Current Behavior | Required Behavior | Gap |
|----------|------------------|-------------------|-----|
| Same entity modified both sides | LastWriteWins applied | Configurable strategy | ⚠️ Not configurable |
| Concurrent edits | No detection | Optimistic locking | ❌ Not implemented |
| Merge conflict | Manual resolution | Auto-merge where possible | ⚠️ Only for customers |

### 1.5 Duplicate Events

| Scenario | Current Behavior | Required Behavior | Gap |
|----------|------------------|-------------------|-----|
| Webhook delivered twice | Deduplication via event_id | Same | ✅ Implemented |
| Queue item retried | No deduplication | Idempotency key check | ❌ No idempotency keys |
| Same operation queued twice | Both executed | Deduplicate by entity+operation | ❌ Not implemented |

### 1.6 Partial Batch Failures

| Scenario | Current Behavior | Required Behavior | Gap |
|----------|------------------|-------------------|-----|
| 50/100 records fail | Status = Partial, continue | Same + retry failed | ⚠️ No auto-retry |
| Critical record fails | Continue with others | Option to abort batch | ❌ No abort option |
| Dependency fails | Continue anyway | Skip dependents | ❌ No dependency tracking |

---

## 2. REQUIRED BEHAVIORS

### 2.1 Exponential Backoff Policy

```rust
pub struct BackoffPolicy {
    /// Initial delay in milliseconds
    pub base_delay_ms: u64,        // Default: 1000 (1 second)
    
    /// Maximum delay in milliseconds
    pub max_delay_ms: u64,         // Default: 300000 (5 minutes)
    
    /// Maximum number of retries
    pub max_retries: u32,          // Default: 10
    
    /// Jitter factor (0.0 to 1.0)
    pub jitter_factor: f64,        // Default: 0.1 (±10%)
    
    /// Multiplier for each retry
    pub multiplier: f64,           // Default: 2.0
}

impl BackoffPolicy {
    pub fn calculate_delay(&self, retry_count: u32) -> Duration {
        if retry_count >= self.max_retries {
            return Duration::MAX; // Signal to stop retrying
        }
        
        let base = self.base_delay_ms as f64;
        let delay = base * self.multiplier.powi(retry_count as i32);
        let capped = delay.min(self.max_delay_ms as f64);
        
        // Add jitter
        let jitter = (rand::random::<f64>() - 0.5) * 2.0 * self.jitter_factor;
        let final_delay = capped * (1.0 + jitter);
        
        Duration::from_millis(final_delay as u64)
    }
}
```

### 2.2 Circuit Breaker Policy

```rust
pub struct CircuitBreakerPolicy {
    /// Number of failures before opening circuit
    pub failure_threshold: u32,    // Default: 5
    
    /// Time to wait before trying again (half-open)
    pub reset_timeout: Duration,   // Default: 60 seconds
    
    /// Number of successful requests to close circuit
    pub success_threshold: u32,    // Default: 3
}

pub enum CircuitState {
    /// Normal operation
    Closed,
    
    /// Failing, reject all requests
    Open { opened_at: Instant },
    
    /// Testing if service recovered
    HalfOpen { successes: u32 },
}

impl CircuitBreaker {
    pub fn should_allow_request(&self) -> bool {
        match self.state {
            CircuitState::Closed => true,
            CircuitState::Open { opened_at } => {
                opened_at.elapsed() >= self.policy.reset_timeout
            }
            CircuitState::HalfOpen { .. } => true,
        }
    }
    
    pub fn record_success(&mut self) {
        match &mut self.state {
            CircuitState::HalfOpen { successes } => {
                *successes += 1;
                if *successes >= self.policy.success_threshold {
                    self.state = CircuitState::Closed;
                }
            }
            _ => {}
        }
    }
    
    pub fn record_failure(&mut self) {
        self.failures += 1;
        if self.failures >= self.policy.failure_threshold {
            self.state = CircuitState::Open { opened_at: Instant::now() };
        }
    }
}
```

### 2.3 Rate Limiting Policy

```rust
pub struct RateLimitPolicy {
    /// Maximum requests per window
    pub max_requests: u32,         // Default: 40 (WooCommerce)
    
    /// Window duration
    pub window: Duration,          // Default: 60 seconds
    
    /// Burst allowance (above max_requests)
    pub burst_allowance: u32,      // Default: 10
}

pub struct RateLimiter {
    policy: RateLimitPolicy,
    requests: VecDeque<Instant>,
}

impl RateLimiter {
    pub async fn acquire(&mut self) -> Result<(), RateLimitError> {
        self.cleanup_old_requests();
        
        if self.requests.len() >= (self.policy.max_requests + self.policy.burst_allowance) as usize {
            let oldest = self.requests.front().unwrap();
            let wait_time = self.policy.window - oldest.elapsed();
            return Err(RateLimitError::TooManyRequests { retry_after: wait_time });
        }
        
        self.requests.push_back(Instant::now());
        Ok(())
    }
}
```

### 2.4 Idempotency Policy

```rust
pub struct IdempotencyPolicy {
    /// How long to remember processed keys
    pub key_ttl: Duration,         // Default: 24 hours
    
    /// Maximum keys to store
    pub max_keys: usize,           // Default: 100000
}

pub fn generate_idempotency_key(
    entity_type: &str,
    entity_id: &str,
    operation: &str,
    timestamp: &str,
) -> String {
    use sha2::{Sha256, Digest};
    let input = format!("{}:{}:{}:{}", entity_type, entity_id, operation, timestamp);
    let hash = Sha256::digest(input.as_bytes());
    format!("{:x}", hash)
}

pub async fn check_idempotency(
    db: &SqlitePool,
    key: &str,
) -> Result<bool, sqlx::Error> {
    let exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM sync_queue WHERE idempotency_key = ?)"
    )
    .bind(key)
    .fetch_one(db)
    .await?;
    
    Ok(exists)
}
```

---

## 3. ANTI-SPAM POLICIES

### 3.1 Per-Platform Rate Limits

| Platform | Requests/Minute | Batch Size | Concurrent Requests |
|----------|-----------------|------------|---------------------|
| WooCommerce | 40 | 100 | 5 |
| QuickBooks | 500 | 30 | 10 |
| Supabase | 1000 | 1000 | 20 |

### 3.2 Sync Throttling

```rust
pub struct SyncThrottlePolicy {
    /// Minimum time between syncs for same entity type
    pub min_sync_interval: Duration,  // Default: 5 minutes
    
    /// Maximum concurrent syncs per tenant
    pub max_concurrent_syncs: u32,    // Default: 3
    
    /// Cooldown after failed sync
    pub failure_cooldown: Duration,   // Default: 15 minutes
}
```

### 3.3 "Sync Now" Safety

```rust
pub async fn trigger_manual_sync(
    tenant_id: &str,
    entity_type: &str,
) -> Result<SyncResult, SyncError> {
    // 1. Check if sync already running
    if is_sync_running(tenant_id, entity_type).await? {
        return Err(SyncError::AlreadyRunning);
    }
    
    // 2. Check cooldown from last sync
    let last_sync = get_last_sync_time(tenant_id, entity_type).await?;
    if let Some(last) = last_sync {
        if last.elapsed() < MIN_SYNC_INTERVAL {
            return Err(SyncError::TooSoon { retry_after: MIN_SYNC_INTERVAL - last.elapsed() });
        }
    }
    
    // 3. Acquire sync lock
    let lock = acquire_sync_lock(tenant_id, entity_type).await?;
    
    // 4. Run sync with cancellation support
    let result = run_sync_with_cancellation(tenant_id, entity_type, lock).await;
    
    result
}
```

### 3.4 Cancellation Support

```rust
pub struct SyncCancellation {
    cancelled: AtomicBool,
}

impl SyncCancellation {
    pub fn cancel(&self) {
        self.cancelled.store(true, Ordering::SeqCst);
    }
    
    pub fn is_cancelled(&self) -> bool {
        self.cancelled.load(Ordering::SeqCst)
    }
}

// In sync loop:
for item in items {
    if cancellation.is_cancelled() {
        return Err(SyncError::Cancelled);
    }
    process_item(item).await?;
}
```

---

## 4. WORST-CASE HANDLING MATRIX

| Scenario | Detection | Response | Recovery |
|----------|-----------|----------|----------|
| API outage | Connection timeout | Open circuit breaker | Auto-retry after reset_timeout |
| Rate limit (429) | HTTP status code | Parse Retry-After header | Wait and retry |
| Auth expired (401) | HTTP status code | Refresh token inline | Retry with new token |
| Network flapping | Intermittent failures | Increase backoff | Stabilize before resuming |
| Conflict detected | Version mismatch | Apply resolution strategy | Log for audit |
| Duplicate event | Idempotency key exists | Skip processing | Return success |
| Partial batch failure | Some items fail | Continue with others | Queue failed for retry |
| Queue overflow | Count exceeds max | Reject new items | Alert operator |
| Memory pressure | Queue size growing | Pause sync | Resume when cleared |

---

## 5. ERROR CLASSIFICATION

### 5.1 Retryable Errors

| Error Type | Retry Strategy | Max Retries |
|------------|----------------|-------------|
| Network timeout | Exponential backoff | 10 |
| 429 Too Many Requests | Retry-After header | 5 |
| 500 Internal Server Error | Exponential backoff | 5 |
| 502 Bad Gateway | Exponential backoff | 5 |
| 503 Service Unavailable | Exponential backoff | 5 |
| Connection refused | Exponential backoff | 10 |

### 5.2 Non-Retryable Errors

| Error Type | Action |
|------------|--------|
| 400 Bad Request | Log error, skip item |
| 401 Unauthorized | Refresh token, retry once |
| 403 Forbidden | Log error, alert user |
| 404 Not Found | Log error, skip item |
| 409 Conflict | Apply conflict resolution |
| 422 Unprocessable Entity | Log error, skip item |

### 5.3 Fatal Errors

| Error Type | Action |
|------------|--------|
| Invalid credentials | Stop sync, alert user |
| Database connection lost | Stop sync, alert operator |
| Out of memory | Stop sync, alert operator |
| Disk full | Stop sync, alert operator |

---

## 6. MONITORING & ALERTING

### 6.1 Metrics to Track

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Sync queue depth | > 10000 | Warning |
| Sync queue depth | > 50000 | Critical |
| Failed syncs (1 hour) | > 10 | Warning |
| Failed syncs (1 hour) | > 50 | Critical |
| Circuit breaker open | Any | Warning |
| Rate limit hits (1 hour) | > 100 | Warning |
| Avg sync duration | > 5 minutes | Warning |

### 6.2 Alert Channels

| Severity | Channel |
|----------|---------|
| Info | Log only |
| Warning | Email + Log |
| Critical | Email + Slack + Log |
| Fatal | Email + Slack + SMS + Log |

---

## 7. IMPLEMENTATION CHECKLIST

### 7.1 Phase 1: Backoff & Circuit Breaker

- [ ] Add `BackoffPolicy` struct
- [ ] Add `CircuitBreaker` struct
- [ ] Integrate with `SyncQueueProcessor`
- [ ] Add unit tests
- [ ] Add integration tests

### 7.2 Phase 2: Rate Limiting

- [ ] Add `RateLimiter` struct
- [ ] Add per-platform rate limits
- [ ] Integrate with API clients
- [ ] Add Retry-After header parsing
- [ ] Add unit tests

### 7.3 Phase 3: Idempotency

- [ ] Add `idempotency_key` column to `sync_queue`
- [ ] Add key generation function
- [ ] Add deduplication check
- [ ] Add unit tests

### 7.4 Phase 4: Cancellation

- [ ] Add `SyncCancellation` struct
- [ ] Add cancellation check in sync loop
- [ ] Add API endpoint to cancel sync
- [ ] Add UI button to cancel sync
- [ ] Add unit tests
