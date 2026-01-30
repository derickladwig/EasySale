# Data Flow Documentation

## Overview

This document describes how data flows through the CAPS POS system for key operations. Understanding these flows is essential for debugging, optimization, and feature development.

## Core Data Flow Patterns

### 1. Request-Response Pattern (Synchronous)

Used for operations that require immediate feedback:

```
Frontend → Backend API → SQLite → Backend API → Frontend
```

**Examples**: Product lookup, customer search, price calculation

### 2. Event Sourcing Pattern (Asynchronous)

Used for operations that need to be replicated across stores:

```
Frontend → Backend API → SQLite (data + event log) → Sync Service → Other Stores
```

**Examples**: Sales transactions, inventory adjustments, customer updates

### 3. Offline Queue Pattern

Used when network is unavailable:

```
Frontend → Backend API → SQLite (data + queue) → [Network Down] → Queue persists
                                                  ↓ [Network Up]
                                            Sync Service → Other Stores
```

**Examples**: All operations during network outage

## Detailed Flow Diagrams

### Product Lookup Flow

**Scenario**: Cashier searches for a product by barcode or keyword

```
┌──────────┐
│ Cashier  │
└────┬─────┘
     │ 1. Scan barcode or type search
     ↓
┌──────────────────┐
│ Frontend (React) │
└────┬─────────────┘
     │ 2. GET /products?search=ABC123
     ↓
┌──────────────────┐
│ Backend (Rust)   │
└────┬─────────────┘
     │ 3. Query database
     ↓
┌──────────────────┐
│ SQLite Database  │
│ SELECT * FROM    │
│ products WHERE   │
│ barcode = ?      │
└────┬─────────────┘
     │ 4. Return product data
     ↓
┌──────────────────┐
│ Backend (Rust)   │
│ - Check stock    │
│ - Apply pricing  │
└────┬─────────────┘
     │ 5. JSON response
     ↓
┌──────────────────┐
│ Frontend (React) │
│ - Display product│
│ - Show stock     │
│ - Show price     │
└──────────────────┘
```

**Performance**: < 1 second end-to-end

**Error Handling**:
- Product not found → Show "No results" message
- Database error → Show error toast, log to console
- Network error → Retry with exponential backoff

### Sales Transaction Flow

**Scenario**: Cashier completes a sale with payment

```
┌──────────┐
│ Cashier  │
└────┬─────┘
     │ 1. Add items to cart (local state)
     │ 2. Apply discounts (permission check)
     │ 3. Process payment
     ↓
┌──────────────────┐
│ Frontend (React) │
│ Cart State:      │
│ - Line items     │
│ - Discounts      │
│ - Tax            │
│ - Total          │
└────┬─────────────┘
     │ 4. POST /transactions
     │    {
     │      items: [...],
     │      payment: {...},
     │      customer_id: 123
     │    }
     ↓
┌──────────────────┐
│ Backend (Rust)   │
│ Validation:      │
│ - Check stock    │
│ - Verify prices  │
│ - Check perms    │
└────┬─────────────┘
     │ 5. Begin transaction
     ↓
┌──────────────────┐
│ SQLite Database  │
│ BEGIN TRANSACTION│
│                  │
│ INSERT INTO      │
│ transactions     │
│                  │
│ INSERT INTO      │
│ transaction_items│
│                  │
│ UPDATE products  │
│ SET stock -= qty │
│                  │
│ INSERT INTO      │
│ sync_events      │
│                  │
│ COMMIT           │
└────┬─────────────┘
     │ 6. Transaction ID
     ↓
┌──────────────────┐
│ Backend (Rust)   │
│ - Generate       │
│   receipt data   │
└────┬─────────────┘
     │ 7. JSON response
     ↓
┌──────────────────┐
│ Frontend (React) │
│ - Print receipt  │
│ - Clear cart     │
│ - Show success   │
└────┬─────────────┘
     │ 8. Background sync
     ↓
┌──────────────────┐
│ Sync Service     │
│ - Read events    │
│ - Push to stores │
└──────────────────┘
```

**Performance**: < 30 seconds end-to-end (including receipt print)

**Error Handling**:
- Insufficient stock → Show error, prevent sale
- Payment failure → Rollback transaction, show error
- Database error → Rollback transaction, log error
- Sync failure → Queue for retry, continue operation

### Inventory Adjustment Flow

**Scenario**: Inventory clerk adjusts stock levels after physical count

```
┌──────────────────┐
│ Inventory Clerk  │
└────┬─────────────┘
     │ 1. Enter product and new quantity
     │ 2. Enter reason (damaged, lost, found)
     ↓
┌──────────────────┐
│ Frontend (React) │
└────┬─────────────┘
     │ 3. POST /inventory/adjustments
     │    {
     │      product_id: 456,
     │      old_qty: 100,
     │      new_qty: 95,
     │      reason: "damaged",
     │      notes: "Water damage"
     │    }
     ↓
┌──────────────────┐
│ Backend (Rust)   │
│ Permission check:│
│ - adjust_        │
│   inventory      │
└────┬─────────────┘
     │ 4. Begin transaction
     ↓
┌──────────────────┐
│ SQLite Database  │
│ BEGIN TRANSACTION│
│                  │
│ UPDATE products  │
│ SET stock = 95   │
│                  │
│ INSERT INTO      │
│ inventory_       │
│ adjustments      │
│                  │
│ INSERT INTO      │
│ sync_events      │
│                  │
│ COMMIT           │
└────┬─────────────┘
     │ 5. Success
     ↓
┌──────────────────┐
│ Backend (Rust)   │
│ - Log audit event│
└────┬─────────────┘
     │ 6. JSON response
     ↓
┌──────────────────┐
│ Frontend (React) │
│ - Show success   │
│ - Update display │
└────┬─────────────┘
     │ 7. Background sync
     ↓
┌──────────────────┐
│ Sync Service     │
│ - Replicate to   │
│   other stores   │
└──────────────────┘
```

**Performance**: < 5 seconds end-to-end

**Error Handling**:
- Permission denied → Show error, prevent adjustment
- Invalid quantity → Show validation error
- Database error → Rollback transaction, log error

### Multi-Store Sync Flow

**Scenario**: Changes from Store A replicate to Store B

```
┌──────────────────┐
│ Store A          │
│ Transaction saved│
└────┬─────────────┘
     │ 1. Event logged in sync_events table
     ↓
┌──────────────────┐
│ Sync Service (A) │
│ - Poll every     │
│   1-5 minutes    │
└────┬─────────────┘
     │ 2. SELECT * FROM sync_events
     │    WHERE synced = false
     ↓
┌──────────────────┐
│ SQLite (Store A) │
│ Returns:         │
│ - Event ID       │
│ - Event type     │
│ - Event data     │
│ - Timestamp      │
│ - Store ID       │
└────┬─────────────┘
     │ 3. Push events to Store B
     ↓
┌──────────────────┐
│ Network          │
│ POST /sync/events│
│ [event1, event2] │
└────┬─────────────┘
     │ 4. Receive events
     ↓
┌──────────────────┐
│ Sync Service (B) │
│ - Validate events│
│ - Check conflicts│
└────┬─────────────┘
     │ 5. Apply events
     ↓
┌──────────────────┐
│ SQLite (Store B) │
│ BEGIN TRANSACTION│
│                  │
│ For each event:  │
│ - Check conflict │
│ - Apply change   │
│ - Log receipt    │
│                  │
│ COMMIT           │
└────┬─────────────┘
     │ 6. Acknowledge receipt
     ↓
┌──────────────────┐
│ Sync Service (B) │
│ POST /sync/ack   │
│ [event_ids]      │
└────┬─────────────┘
     │ 7. Mark as synced
     ↓
┌──────────────────┐
│ SQLite (Store A) │
│ UPDATE           │
│ sync_events      │
│ SET synced = true│
└──────────────────┘
```

**Performance**: 1-5 minutes latency between stores

**Conflict Resolution**:
- **Last-write-wins**: Use timestamp + store ID
- **Deterministic**: Same inputs always produce same result
- **Logged**: All conflicts logged for audit

### Offline Operation Flow

**Scenario**: Network is down, operations continue normally

```
┌──────────┐
│ Cashier  │
└────┬─────┘
     │ 1. Complete sale (network down)
     ↓
┌──────────────────┐
│ Frontend (React) │
│ - Show offline   │
│   indicator      │
└────┬─────────────┘
     │ 2. POST /transactions (local API)
     ↓
┌──────────────────┐
│ Backend (Rust)   │
│ - Save to SQLite │
│ - Log event      │
└────┬─────────────┘
     │ 3. Transaction saved
     ↓
┌──────────────────┐
│ SQLite Database  │
│ - Transaction    │
│ - Sync event     │
│   (pending)      │
└────┬─────────────┘
     │ 4. Success response
     ↓
┌──────────────────┐
│ Frontend (React) │
│ - Print receipt  │
│ - Show "Offline" │
│   badge          │
└────┬─────────────┘
     │ 5. Sync service tries to sync
     ↓
┌──────────────────┐
│ Sync Service     │
│ - Network error  │
│ - Add to queue   │
│ - Retry later    │
└────┬─────────────┘
     │ 6. Wait for network
     ↓
┌──────────────────┐
│ Network Up       │
└────┬─────────────┘
     │ 7. Process queue
     ↓
┌──────────────────┐
│ Sync Service     │
│ - Retry with     │
│   backoff        │
│ - Push events    │
└────┬─────────────┘
     │ 8. Events synced
     ↓
┌──────────────────┐
│ Frontend (React) │
│ - Show online    │
│   indicator      │
│ - Clear badge    │
└──────────────────┘
```

**Performance**: Unlimited offline duration, < 1 hour recovery

**Queue Management**:
- **Persistent**: Queue stored in SQLite
- **Ordered**: FIFO processing
- **Retry**: Exponential backoff (1s, 2s, 4s, 8s, ...)
- **Capacity**: 100,000+ pending operations

## State Management

### Frontend State

**Local State (React useState)**:
- Form inputs
- UI toggles (modals, dropdowns)
- Temporary data (search queries)

**Global State (Zustand)**:
- Cart contents
- User session
- Permissions
- Offline status

**Server State (React Query)**:
- Product data
- Customer data
- Transaction history
- Inventory levels

**Persistence**:
- Cart → localStorage (survives page refresh)
- Session → httpOnly cookies (secure)
- Offline queue → SQLite (survives app restart)

### Backend State

**Database State (SQLite)**:
- All operational data
- Event log for sync
- Session tokens
- Audit logs

**In-Memory State**:
- JWT validation cache (5 minutes)
- Database connection pool
- Active sessions

**No Shared State**:
- Each request is independent
- No global variables
- Stateless API design

## Data Consistency

### ACID Guarantees (SQLite)

**Atomicity**: All-or-nothing transactions
```sql
BEGIN TRANSACTION;
  UPDATE products SET stock = stock - 1 WHERE id = 123;
  INSERT INTO transactions (...) VALUES (...);
COMMIT;  -- Both succeed or both fail
```

**Consistency**: Foreign key constraints enforced
```sql
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
```

**Isolation**: Serializable isolation level
```sql
PRAGMA journal_mode = WAL;  -- Write-Ahead Logging
```

**Durability**: Changes persisted to disk
```sql
PRAGMA synchronous = FULL;  -- Ensure durability
```

### Eventual Consistency (Multi-Store)

**Sync Latency**: 1-5 minutes between stores

**Conflict Resolution**:
- Last-write-wins (timestamp + store ID)
- Deterministic algorithm
- Logged for audit

**Convergence**: All stores eventually reach same state

## Performance Optimization

### Database Optimization

**Indexes**:
```sql
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_sync_events_synced ON sync_events(synced, created_at);
```

**Query Optimization**:
- Use prepared statements
- Limit result sets
- Avoid N+1 queries
- Use EXPLAIN QUERY PLAN

**Connection Pooling**:
- Reuse connections
- Limit pool size (5-10)
- Close idle connections

### API Optimization

**Caching**:
- Product data (5 minutes)
- Customer data (5 minutes)
- Permissions (session lifetime)

**Pagination**:
- Limit results to 50-100 per page
- Use cursor-based pagination
- Lazy load additional data

**Compression**:
- Gzip response bodies
- Reduce payload size

### Frontend Optimization

**Code Splitting**:
- Lazy load routes
- Split by feature
- Reduce initial bundle

**Virtualization**:
- Virtualize long lists
- Render only visible items
- Reduce DOM nodes

**Debouncing**:
- Debounce search inputs (300ms)
- Throttle scroll events
- Reduce API calls

## Error Handling

### Frontend Errors

**Network Errors**:
- Show offline indicator
- Queue operations
- Retry with backoff

**Validation Errors**:
- Show inline errors
- Prevent submission
- Clear on fix

**Runtime Errors**:
- ErrorBoundary catches
- Show fallback UI
- Log to console

### Backend Errors

**Database Errors**:
- Rollback transaction
- Log error details
- Return 500 status

**Validation Errors**:
- Return 400 status
- Include error details
- Don't log (expected)

**Authorization Errors**:
- Return 403 status
- Log security event
- Audit trail

### Sync Errors

**Network Errors**:
- Add to queue
- Retry with backoff
- Alert after 3 failures

**Conflict Errors**:
- Apply resolution algorithm
- Log conflict details
- Continue sync

**Data Errors**:
- Skip invalid event
- Log error
- Continue with next event

## Monitoring and Debugging

### Logging

**Frontend**:
```typescript
logger.info('Product added to cart', { productId, quantity });
logger.error('API call failed', { endpoint, error });
```

**Backend**:
```rust
info!(user_id = %user.id, "User logged in");
error!(error = %e, "Database query failed");
```

### Metrics

**Transaction Metrics**:
- Checkout time (p50, p95, p99)
- Items per transaction
- Average transaction value

**Database Metrics**:
- Query time (p50, p95, p99)
- Connection pool usage
- Slow queries (> 100ms)

**Sync Metrics**:
- Sync latency (time between stores)
- Queue depth
- Conflict rate

### Tracing

**Request Tracing**:
- Trace ID per request
- Log all operations
- Measure duration

**Sync Tracing**:
- Event ID per sync
- Track replication
- Measure latency

## References

- [System Architecture Overview](./overview.md)
- [Offline Sync Documentation](./offline-sync.md)
- [Database Schema](./database.md)
- [API Documentation](../api/README.md)
