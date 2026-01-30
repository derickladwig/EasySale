# Test Plan: Offline, Online, and Idempotency

**Audit Date:** 2026-01-29  
**Status:** APPROVED

---

## 1. TEST SCENARIOS

### 1.1 Offline Sale → Queue → Flush

**Scenario:** User makes a sale while offline, system queues the operation, and flushes when online.

**Steps:**
1. Disconnect network (simulate offline)
2. Create a sale in POS
3. Verify local inventory decremented
4. Verify sync_queue has pending operation
5. Reconnect network (simulate online)
6. Trigger sync or wait for scheduled sync
7. Verify queue flushed (sync_status = 'completed')
8. Verify remote inventory updated (WooCommerce/QuickBooks)

**Expected Results:**
- Local inventory: Decremented immediately
- Queue: Operation added with sync_status = 'pending'
- Remote: Updated after flush
- No duplicate operations

### 1.2 Repeated Flush → No Duplicates (Idempotency)

**Scenario:** Same sync event is processed multiple times, but remote is only updated once.

**Steps:**
1. Create a sync queue item with idempotency_key
2. Process the item (first flush)
3. Verify remote updated
4. Attempt to process same item again (second flush)
5. Verify remote NOT updated again
6. Verify no duplicate records created

**Expected Results:**
- First flush: Remote updated, item marked 'completed'
- Second flush: Skipped due to idempotency check
- Remote: Only one update applied

### 1.3 Conflict Resolution

**Scenario:** Same entity modified in both POS and WooCommerce since last sync.

**Steps:**
1. Sync product from WooCommerce to POS
2. Modify product price in POS
3. Modify product price in WooCommerce
4. Trigger sync
5. Verify conflict detected
6. Verify resolution strategy applied (LastWriteWins)
7. Verify final state matches expected winner

**Expected Results:**
- Conflict logged in sync_conflicts table
- Resolution applied based on strategy
- Both systems have consistent data

### 1.4 Rate Limit Handling

**Scenario:** API returns 429 Too Many Requests.

**Steps:**
1. Configure low rate limit (e.g., 5 requests/minute)
2. Trigger sync with 100 items
3. Verify rate limit hit after 5 requests
4. Verify backoff applied
5. Verify sync resumes after backoff
6. Verify all items eventually synced

**Expected Results:**
- First 5 requests succeed
- 429 response received
- Backoff delay applied (exponential)
- Sync resumes and completes

### 1.5 Circuit Breaker

**Scenario:** API consistently fails, circuit breaker opens.

**Steps:**
1. Configure circuit breaker (threshold = 5)
2. Simulate API failures
3. Verify circuit opens after 5 failures
4. Verify subsequent requests rejected immediately
5. Wait for reset timeout
6. Verify circuit half-opens
7. Simulate success
8. Verify circuit closes

**Expected Results:**
- Circuit opens after threshold failures
- Requests rejected while open
- Circuit half-opens after timeout
- Circuit closes after success threshold

---

## 2. TEST IMPLEMENTATION

### 2.1 Unit Tests (Rust)

```rust
// backend/crates/server/tests/sync_offline_test.rs

#[tokio::test]
async fn test_offline_sale_queues_operation() {
    let db = setup_test_db().await;
    let queue_processor = SyncQueueProcessor::new(db.clone());
    
    // Create sale while "offline" (no external calls)
    let sale = create_test_sale(&db).await;
    
    // Verify local inventory decremented
    let product = get_product(&db, sale.product_id).await;
    assert_eq!(product.quantity, 99); // Was 100
    
    // Verify queue has pending operation
    let queue_items = get_pending_queue_items(&db).await;
    assert_eq!(queue_items.len(), 1);
    assert_eq!(queue_items[0].entity_type, "inventory");
    assert_eq!(queue_items[0].operation, "update");
    assert_eq!(queue_items[0].sync_status, "pending");
}

#[tokio::test]
async fn test_queue_flush_updates_remote() {
    let db = setup_test_db().await;
    let mock_woo = MockWooCommerceClient::new();
    let queue_processor = SyncQueueProcessor::new(db.clone());
    
    // Add pending operation
    add_queue_item(&db, "inventory", "prod_123", "update", r#"{"quantity": 99}"#).await;
    
    // Process queue
    queue_processor.process_pending(&mock_woo).await.unwrap();
    
    // Verify remote updated
    assert_eq!(mock_woo.update_calls.len(), 1);
    assert_eq!(mock_woo.update_calls[0].product_id, "prod_123");
    assert_eq!(mock_woo.update_calls[0].quantity, 99);
    
    // Verify queue item completed
    let item = get_queue_item(&db, "prod_123").await;
    assert_eq!(item.sync_status, "completed");
}

#[tokio::test]
async fn test_idempotent_flush_no_duplicates() {
    let db = setup_test_db().await;
    let mock_woo = MockWooCommerceClient::new();
    let queue_processor = SyncQueueProcessor::new(db.clone());
    
    let idempotency_key = "idem_123";
    
    // Add queue item with idempotency key
    add_queue_item_with_key(&db, "inventory", "prod_123", "update", 
        r#"{"quantity": 99}"#, idempotency_key).await;
    
    // First flush
    queue_processor.process_pending(&mock_woo).await.unwrap();
    assert_eq!(mock_woo.update_calls.len(), 1);
    
    // Reset mock but keep idempotency record
    mock_woo.clear_calls();
    
    // Add same item again (simulating retry)
    add_queue_item_with_key(&db, "inventory", "prod_123", "update", 
        r#"{"quantity": 99}"#, idempotency_key).await;
    
    // Second flush - should be skipped
    queue_processor.process_pending(&mock_woo).await.unwrap();
    assert_eq!(mock_woo.update_calls.len(), 0); // No new calls
}

#[tokio::test]
async fn test_exponential_backoff() {
    let policy = BackoffPolicy::default();
    
    assert_eq!(policy.calculate_delay(0).as_millis(), 1000); // ~1s
    assert_eq!(policy.calculate_delay(1).as_millis(), 2000); // ~2s
    assert_eq!(policy.calculate_delay(2).as_millis(), 4000); // ~4s
    assert_eq!(policy.calculate_delay(3).as_millis(), 8000); // ~8s
    
    // Verify max cap
    assert!(policy.calculate_delay(20).as_millis() <= 300000); // Max 5 min
}

#[tokio::test]
async fn test_circuit_breaker_opens_on_failures() {
    let mut breaker = CircuitBreaker::new(CircuitBreakerPolicy {
        failure_threshold: 3,
        reset_timeout: Duration::from_secs(60),
        success_threshold: 2,
    });
    
    // Initial state: closed
    assert!(breaker.should_allow_request());
    
    // Record failures
    breaker.record_failure();
    breaker.record_failure();
    assert!(breaker.should_allow_request()); // Still closed
    
    breaker.record_failure(); // Third failure
    assert!(!breaker.should_allow_request()); // Now open
}
```

### 2.2 Integration Tests (Rust)

```rust
// backend/crates/server/tests/sync_integration_test.rs

#[tokio::test]
async fn test_full_offline_online_cycle() {
    let db = setup_test_db().await;
    let woo_client = create_test_woo_client().await;
    let sync_orchestrator = SyncOrchestrator::new(db.clone());
    
    // 1. Create initial product in WooCommerce
    let woo_product = woo_client.create_product(TestProduct {
        name: "Test Product",
        sku: "TEST-001",
        price: "19.99",
        stock_quantity: 100,
    }).await.unwrap();
    
    // 2. Sync to POS
    sync_orchestrator.sync_products("test_tenant", SyncMode::Full).await.unwrap();
    
    // 3. Verify product in POS
    let pos_product = get_product_by_sku(&db, "TEST-001").await.unwrap();
    assert_eq!(pos_product.quantity, 100);
    
    // 4. Simulate offline sale
    create_sale(&db, &pos_product.id, 5).await; // Sell 5 units
    
    // 5. Verify local inventory decremented
    let pos_product = get_product_by_sku(&db, "TEST-001").await.unwrap();
    assert_eq!(pos_product.quantity, 95);
    
    // 6. Verify queue has pending operation
    let queue = get_pending_queue_items(&db).await;
    assert_eq!(queue.len(), 1);
    
    // 7. Flush queue (simulate going online)
    sync_orchestrator.flush_queue("test_tenant").await.unwrap();
    
    // 8. Verify WooCommerce updated
    let woo_product = woo_client.get_product(woo_product.id).await.unwrap();
    assert_eq!(woo_product.stock_quantity, 95);
    
    // 9. Verify queue empty
    let queue = get_pending_queue_items(&db).await;
    assert_eq!(queue.len(), 0);
}
```

### 2.3 Frontend Tests (TypeScript)

```typescript
// frontend/src/services/syncApi.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { syncApi } from './syncApi';

describe('Sync API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should trigger sync and return sync ID', async () => {
    const mockResponse = { syncId: 'sync_123', status: 'pending' };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await syncApi.triggerSync('products', { mode: 'incremental' });
    
    expect(result.syncId).toBe('sync_123');
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sync/products'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should retry failed records', async () => {
    const mockResponse = { retried: 5, failed: 0 };
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await syncApi.retryFailedRecords(['id1', 'id2', 'id3', 'id4', 'id5']);
    
    expect(result.retried).toBe(5);
  });

  it('should handle rate limit response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers: new Headers({ 'Retry-After': '60' }),
    } as Response);

    await expect(syncApi.triggerSync('products', { mode: 'full' }))
      .rejects.toThrow('Rate limited');
  });
});
```

### 2.4 E2E Tests (Playwright)

```typescript
// frontend/e2e/sync-offline.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Offline Sync', () => {
  test('should queue operations when offline and flush when online', async ({ page, context }) => {
    // 1. Navigate to POS
    await page.goto('/pos');
    
    // 2. Go offline
    await context.setOffline(true);
    
    // 3. Create a sale
    await page.click('[data-testid="product-TEST-001"]');
    await page.click('[data-testid="add-to-cart"]');
    await page.click('[data-testid="checkout"]');
    await page.click('[data-testid="complete-sale"]');
    
    // 4. Verify offline indicator shown
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // 5. Verify pending operations count
    await expect(page.locator('[data-testid="pending-count"]')).toHaveText('1');
    
    // 6. Go online
    await context.setOffline(false);
    
    // 7. Wait for sync
    await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 30000 });
    
    // 8. Verify pending operations cleared
    await expect(page.locator('[data-testid="pending-count"]')).toHaveText('0');
  });

  test('should show sync progress', async ({ page }) => {
    await page.goto('/settings/sync');
    
    // Trigger sync
    await page.click('[data-testid="sync-now-products"]');
    
    // Verify progress shown
    await expect(page.locator('[data-testid="sync-progress"]')).toBeVisible();
    
    // Wait for completion
    await page.waitForSelector('[data-testid="sync-complete"]', { timeout: 60000 });
    
    // Verify success message
    await expect(page.locator('[data-testid="sync-status"]')).toHaveText('Completed');
  });
});
```

---

## 3. TEST DATA

### 3.1 Test Products

```json
[
  {
    "sku": "TEST-001",
    "name": "Test Product 1",
    "price": "19.99",
    "quantity": 100
  },
  {
    "sku": "TEST-002",
    "name": "Test Product 2",
    "price": "29.99",
    "quantity": 50
  },
  {
    "sku": "TEST-003",
    "name": "Test Product 3",
    "price": "9.99",
    "quantity": 200
  }
]
```

### 3.2 Test Customers

```json
[
  {
    "email": "test1@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  {
    "email": "test2@example.com",
    "first_name": "Jane",
    "last_name": "Smith"
  }
]
```

### 3.3 Test Sales

```json
[
  {
    "product_sku": "TEST-001",
    "quantity": 5,
    "customer_email": "test1@example.com"
  },
  {
    "product_sku": "TEST-002",
    "quantity": 2,
    "customer_email": "test2@example.com"
  }
]
```

---

## 4. TEST EXECUTION

### 4.1 Run Unit Tests

```bash
# Backend
cd backend
cargo test --package server --test sync_offline_test
cargo test --package server --test sync_idempotency_test
cargo test --package server --test sync_backoff_test
cargo test --package server --test sync_circuit_breaker_test

# Frontend
cd frontend
npm run test:ci -- --filter sync
```

### 4.2 Run Integration Tests

```bash
# Backend (requires test database)
cd backend
cargo test --package server --test sync_integration_test -- --test-threads=1

# Frontend (requires backend running)
cd frontend
npm run test:integration
```

### 4.3 Run E2E Tests

```bash
cd frontend
npx playwright test sync-offline.spec.ts
```

---

## 5. SUCCESS CRITERIA

| Test | Pass Criteria |
|------|---------------|
| Offline sale queues | Queue item created with correct payload |
| Queue flush updates remote | Remote API called with correct data |
| Idempotent flush | No duplicate API calls on retry |
| Conflict resolution | Correct winner selected, both systems consistent |
| Rate limit handling | Backoff applied, sync eventually completes |
| Circuit breaker | Opens on failures, closes on recovery |
| E2E offline cycle | Full cycle completes without errors |

---

## 6. VERIFICATION EVIDENCE

After implementation, document evidence in `IMPLEMENTATION_LOG.md`:

1. **Screenshot:** Offline indicator showing pending count
2. **Log excerpt:** Queue flush with timestamps
3. **API trace:** Single remote update (no duplicates)
4. **Test output:** All tests passing
5. **Metrics:** Sync duration, success rate
