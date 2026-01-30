# WooCommerce + QuickBooks Integration Consolidation Plan

**Created:** 2026-01-29  
**Status:** APPROVED FOR IMPLEMENTATION

---

## Executive Summary

The audit found that WooCommerce and QuickBooks integrations are **substantially complete** with a clean, canonical architecture. No duplication exists. The plan focuses on:

1. **Fixing 3 critical security/configuration issues** (Day 1)
2. **Adding missing sync engine resilience features** (Days 2-3)
3. **Adding missing frontend operator controls** (Days 4-5)
4. **Verification and documentation** (Day 6)

**Total estimated effort:** 21 hours (10 backend + 11 frontend)

---

## Phase 1: Critical Fixes (Day 1) — 4 hours

### 1.1 Fix Hardcoded OAuth Redirect URI
- **File:** `backend/crates/server/src/handlers/integrations.rs`
- **Issue:** OAuth redirect URI must be configured via environment variable
- **Fix:** Add startup validation, document in `.env.example`
- **Effort:** 1 hour

### 1.2 Fix Default STORE_ID/TENANT_ID
- **File:** `backend/crates/server/src/main.rs`
- **Issue:** Fallback defaults create multi-tenant isolation risk
- **Fix:** Remove defaults, require explicit configuration
- **Effort:** 1 hour

### 1.3 Fix SQL Injection in Reporting
- **File:** `backend/crates/server/src/handlers/reporting.rs`
- **Issue:** String interpolation for query parameters
- **Fix:** Use parameterized queries, apply `qbo_sanitizer`
- **Effort:** 2 hours

---

## Phase 2: Sync Engine Resilience (Days 2-3) — 6 hours

### 2.1 Add Exponential Backoff
- **File:** `backend/crates/server/src/services/sync_queue_processor.rs`
- **Add:** `BackoffPolicy` struct with configurable delays
- **Effort:** 1.5 hours

### 2.2 Add Circuit Breaker
- **File:** `backend/crates/server/src/services/sync_orchestrator.rs`
- **Add:** `CircuitBreaker` struct with open/half-open/closed states
- **Effort:** 1.5 hours

### 2.3 Add Idempotency Keys
- **File:** New migration + `sync_queue_processor.rs`
- **Add:** `idempotency_key` column, deduplication check
- **Effort:** 1.5 hours

### 2.4 Enforce Queue Bounds
- **File:** `backend/crates/server/src/services/sync_queue_processor.rs`
- **Add:** Check queue size before insert, reject if full
- **Effort:** 1 hour

### 2.5 Add Ordering Constraints
- **File:** `backend/crates/server/src/services/sync_queue_processor.rs`
- **Add:** Entity priority ordering (customer before order)
- **Effort:** 0.5 hours

---

## Phase 3: Frontend Operator Controls (Days 4-5) — 8 hours

### 3.1 Add Sync Direction API
- **File:** `backend/crates/server/src/handlers/settings.rs`
- **Add:** GET/PUT endpoints for sync direction config
- **Effort:** 2 hours

### 3.2 Add Delete Policy API
- **File:** `backend/crates/server/src/handlers/settings.rs`
- **Add:** GET/PUT endpoints for delete policy config
- **Effort:** 2 hours

### 3.3 Add SyncDirectionToggle Component
- **File:** New component + `IntegrationsPage.tsx`
- **Add:** Dropdown for pull/push/bidirectional/disabled
- **Effort:** 2 hours

### 3.4 Add DeletePolicyToggle Component
- **File:** New component + `NetworkPage.tsx`
- **Add:** Dropdown for local-only/archive-remote/delete-remote
- **Effort:** 2 hours

---

## Phase 4: Verification (Day 6) — 3 hours

### 4.1 Startup Validation Test
- Verify no external calls during startup
- Verify required env vars checked
- **Effort:** 0.5 hours

### 4.2 Rate Limiting Test
- Demonstrate exponential backoff
- Demonstrate circuit breaker
- **Effort:** 1 hour

### 4.3 Idempotency Test
- Demonstrate offline sale → queue → flush
- Demonstrate retry without duplicates
- **Effort:** 1 hour

### 4.4 Documentation
- Update `IMPLEMENTATION_LOG.md` with evidence
- Update `README.md` with configuration requirements
- **Effort:** 0.5 hours

---

## Files to Modify

| File | Phase | Change |
|------|-------|--------|
| `backend/crates/server/src/main.rs` | 1 | Startup validation |
| `backend/crates/server/src/handlers/integrations.rs` | 1 | OAuth redirect fix |
| `backend/crates/server/src/handlers/reporting.rs` | 1 | SQL injection fix |
| `backend/crates/server/src/services/sync_queue_processor.rs` | 2 | Backoff, bounds, ordering |
| `backend/crates/server/src/services/sync_orchestrator.rs` | 2 | Circuit breaker |
| `backend/migrations/` | 2 | Idempotency column |
| `backend/crates/server/src/handlers/settings.rs` | 3 | Direction/policy APIs |
| `frontend/src/settings/pages/IntegrationsPage.tsx` | 3 | Direction toggle |
| `frontend/src/settings/pages/NetworkPage.tsx` | 3 | Delete policy toggle |
| `frontend/src/services/syncApi.ts` | 3 | New API functions |

---

## Success Criteria

1. ✅ No external calls during server startup/login
2. ✅ No runaway background loops (rate limiting demonstrated)
3. ✅ Build passes (`cargo build --release`)
4. ✅ Tests pass (`cargo test`)
5. ✅ Offline sale → queue → flush works
6. ✅ Retry is idempotent (no duplicate remote changes)
7. ✅ Frontend controls persist and change backend behavior

---

## Rollback Plan

Each phase can be independently rolled back:
- **Phase 1:** `git revert` commits
- **Phase 2:** Drop migration, revert code
- **Phase 3:** Remove UI components
- **Phase 4:** Remove tests

Full rollback: `git revert --no-commit HEAD~N`

---

## Non-Goals (Out of Scope)

- New integration platforms (Stripe, Square)
- Real-time sync progress UI
- DLQ management UI
- Mapping persistence to backend
- CDC polling for QuickBooks
