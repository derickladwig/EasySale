# Implementation Tasks

**Created:** 2026-01-29  
**Status:** ✅ ALL TASKS COMPLETE

---

## Task List

### Phase 1: Critical Fixes (Day 1)

#### TASK-001: Fix OAuth Redirect URI Configuration
- **Priority:** 🔴 CRITICAL
- **Effort:** 1 hour
- **File:** `backend/crates/server/src/main.rs`
- **Description:** Add startup validation for `QUICKBOOKS_REDIRECT_URI` environment variable
- **Acceptance Criteria:**
  - [x] Server fails to start if `QUICKBOOKS_REDIRECT_URI` not set
  - [x] Clear error message displayed
  - [x] `.env.example` updated with variable
- **Rollback:** Remove validation, restore current behavior

#### TASK-002: Fix Default STORE_ID/TENANT_ID
- **Priority:** 🔴 CRITICAL
- **Effort:** 1 hour
- **File:** `backend/crates/server/src/main.rs` (lines 117-127)
- **Description:** Remove fallback defaults, require explicit configuration
- **Acceptance Criteria:**
  - [x] Server fails to start if `STORE_ID` not set
  - [x] Server fails to start if `TENANT_ID` not set
  - [x] Clear error messages displayed
  - [x] `.env.example` updated with variables
- **Rollback:** Restore fallback defaults

#### TASK-003: Fix SQL Injection in Reporting
- **Priority:** 🔴 CRITICAL
- **Effort:** 2 hours
- **File:** `backend/crates/server/src/handlers/reporting.rs`
- **Description:** Replace string interpolation with parameterized queries
- **Acceptance Criteria:**
  - [x] All user inputs sanitized via `qbo_sanitizer`
  - [x] Parameterized queries used throughout
  - [x] Security test added for injection attempts
- **Rollback:** Revert to current queries (document risk)

---

### Phase 2: Sync Engine Resilience (Days 2-3)

#### TASK-004: Add Exponential Backoff
- **Priority:** 🟠 HIGH
- **Effort:** 1.5 hours
- **File:** `backend/crates/server/src/services/sync_queue_processor.rs`
- **Description:** Implement `BackoffPolicy` struct with configurable delays
- **Acceptance Criteria:**
  - [x] `BackoffPolicy` struct with base_delay, max_delay, max_retries, jitter
  - [x] `calculate_delay()` method with exponential growth
  - [x] Jitter applied to prevent thundering herd
  - [x] Unit tests for backoff calculation
- **Rollback:** Remove `BackoffPolicy`, use fixed delays

#### TASK-005: Add Circuit Breaker
- **Priority:** 🟠 HIGH
- **Effort:** 1.5 hours
- **File:** `backend/crates/server/src/services/sync_orchestrator.rs`
- **Description:** Implement `CircuitBreaker` with open/half-open/closed states
- **Acceptance Criteria:**
  - [x] `CircuitBreaker` struct with failure_threshold, reset_timeout
  - [x] `should_allow_request()` method
  - [x] `record_success()` and `record_failure()` methods
  - [x] State transitions: Closed → Open → HalfOpen → Closed
  - [x] Unit tests for state transitions
- **Rollback:** Remove `CircuitBreaker`, allow all requests

#### TASK-006: Add Idempotency Keys
- **Priority:** 🟠 HIGH
- **Effort:** 1.5 hours
- **Files:** 
  - `backend/migrations/XXX_add_idempotency_key.sql` (new)
  - `backend/crates/server/src/services/sync_queue_processor.rs`
- **Description:** Add idempotency_key column and deduplication check
- **Acceptance Criteria:**
  - [x] Migration adds `idempotency_key` column to `sync_queue`
  - [x] Unique index on `idempotency_key`
  - [x] `generate_idempotency_key()` function
  - [x] `check_idempotency()` function
  - [x] Duplicate operations skipped
  - [x] Unit tests for deduplication
- **Rollback:** Drop column and index

#### TASK-007: Enforce Queue Bounds
- **Priority:** 🟠 HIGH
- **Effort:** 1 hour
- **File:** `backend/crates/server/src/services/sync_queue_processor.rs`
- **Description:** Check queue size before insert, reject if full
- **Acceptance Criteria:**
  - [x] `check_queue_bounds()` method
  - [x] `QueueFull` error type
  - [x] Configurable max_queue_size per tenant
  - [x] Unit tests for bounds checking
- **Rollback:** Remove check, allow unbounded queue

#### TASK-008: Add Ordering Constraints
- **Priority:** 🟡 MEDIUM
- **Effort:** 0.5 hours
- **File:** `backend/crates/server/src/services/sync_queue_processor.rs`
- **Description:** Process queue items in dependency order
- **Acceptance Criteria:**
  - [x] `ENTITY_ORDER` constant defining priority
  - [x] `get_entity_priority()` function
  - [x] Queue processed in priority order
  - [x] Unit tests for ordering
- **Rollback:** Remove ordering, process in insertion order

---

### Phase 3: Frontend Operator Controls (Days 4-5)

#### TASK-009: Add Sync Direction API
- **Priority:** 🔴 CRITICAL
- **Effort:** 2 hours
- **File:** `backend/crates/server/src/handlers/sync.rs`
- **Description:** Add GET/PUT endpoints for sync direction configuration
- **Acceptance Criteria:**
  - [x] `GET /api/sync/direction` endpoint
  - [x] `PUT /api/sync/direction` endpoint
  - [x] `SyncDirectionConfig` struct with global_direction, entity_overrides
  - [x] Persists to database
  - [x] Integration tests
- **Rollback:** Remove endpoints

#### TASK-010: Add Delete Policy API
- **Priority:** 🔴 CRITICAL
- **Effort:** 2 hours
- **File:** `backend/crates/server/src/handlers/sync.rs`
- **Description:** Add GET/PUT endpoints for delete policy configuration
- **Acceptance Criteria:**
  - [x] `GET /api/sync/delete-policy` endpoint
  - [x] `PUT /api/sync/delete-policy` endpoint
  - [x] `DeletePolicyConfig` struct with policy, entity_overrides
  - [x] Persists to database
  - [x] Integration tests
- **Rollback:** Remove endpoints

#### TASK-011: Add SyncDirectionToggle Component
- **Priority:** 🔴 CRITICAL
- **Effort:** 2 hours
- **Files:**
  - `frontend/src/settings/components/SyncDirectionToggle.tsx` (new)
  - `frontend/src/settings/pages/IntegrationsPage.tsx`
  - `frontend/src/services/syncApi.ts`
- **Description:** Add dropdown for sync direction selection
- **Acceptance Criteria:**
  - [x] `SyncDirectionToggle` component with dropdown
  - [x] Options: Pull, Push, Bidirectional, Disabled
  - [x] Global setting in IntegrationsPage
  - [x] Per-entity override option
  - [x] API functions in syncApi.ts
  - [x] Persists to backend
  - [x] Unit tests
- **Rollback:** Remove component

#### TASK-012: Add DeletePolicyToggle Component
- **Priority:** 🔴 CRITICAL
- **Effort:** 2 hours
- **Files:**
  - `frontend/src/settings/components/DeletePolicyToggle.tsx` (new)
  - `frontend/src/settings/pages/NetworkPage.tsx`
  - `frontend/src/services/syncApi.ts`
- **Description:** Add dropdown for delete policy selection
- **Acceptance Criteria:**
  - [x] `DeletePolicyToggle` component with dropdown
  - [x] Options: Local Only, Archive Remote, Delete Remote
  - [x] Warning modal for "Delete Remote"
  - [x] API functions in syncApi.ts
  - [x] Persists to backend
  - [x] Unit tests
- **Rollback:** Remove component

---

### Phase 4: Verification (Day 6)

#### TASK-013: Startup Validation Test
- **Priority:** 🟡 MEDIUM
- **Effort:** 0.5 hours
- **Description:** Verify no external calls during startup
- **Acceptance Criteria:**
  - [x] Test that server starts without network
  - [x] Test that required env vars are checked
  - [x] Document in IMPLEMENTATION_LOG.md
- **Rollback:** N/A

#### TASK-014: Rate Limiting Test
- **Priority:** 🟡 MEDIUM
- **Effort:** 1 hour
- **Description:** Demonstrate exponential backoff and circuit breaker
- **Acceptance Criteria:**
  - [x] Test exponential backoff delays
  - [x] Test circuit breaker state transitions
  - [x] Document in IMPLEMENTATION_LOG.md
- **Rollback:** N/A

#### TASK-015: Idempotency Test
- **Priority:** 🟡 MEDIUM
- **Effort:** 1 hour
- **Description:** Demonstrate offline sale → queue → flush without duplicates
- **Acceptance Criteria:**
  - [x] Test offline sale queues operation
  - [x] Test queue flush updates remote once
  - [x] Test retry does not create duplicates
  - [x] Document in IMPLEMENTATION_LOG.md
- **Rollback:** N/A

#### TASK-016: Documentation Update
- **Priority:** 🟢 LOW
- **Effort:** 0.5 hours
- **Description:** Update documentation with configuration requirements
- **Acceptance Criteria:**
  - [x] IMPLEMENTATION_LOG.md updated with evidence
  - [x] README.md updated with env var requirements
  - [x] .env.example updated
- **Rollback:** N/A

---

## Task Dependencies

```
TASK-001 ─┐
TASK-002 ─┼─► Phase 1 Complete ─┐
TASK-003 ─┘                     │
                                │
TASK-004 ─┐                     │
TASK-005 ─┤                     │
TASK-006 ─┼─► Phase 2 Complete ─┼─► TASK-013
TASK-007 ─┤                     │   TASK-014
TASK-008 ─┘                     │   TASK-015
                                │   TASK-016
TASK-009 ─┐                     │
TASK-010 ─┼─► Phase 3 Complete ─┘
TASK-011 ─┤
TASK-012 ─┘
```

---

## Effort Summary

| Phase | Tasks | Backend | Frontend | Total |
|-------|-------|---------|----------|-------|
| Phase 1 | 3 | 4h | 0h | 4h |
| Phase 2 | 5 | 6h | 0h | 6h |
| Phase 3 | 4 | 4h | 4h | 8h |
| Phase 4 | 4 | 1.5h | 1.5h | 3h |
| **Total** | **16** | **15.5h** | **5.5h** | **21h** |

---

## Definition of Done

Each task is complete when:
1. ✅ Code implemented and compiles
2. ✅ Unit tests pass
3. ✅ Integration tests pass (if applicable)
4. ✅ Code reviewed
5. ✅ Documentation updated
6. ✅ Rollback plan verified
