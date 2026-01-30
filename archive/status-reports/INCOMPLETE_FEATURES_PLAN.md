# Incomplete Features Implementation Plan

## Executive Summary

Analysis of the codebase reveals that while most backend infrastructure is implemented, there are **incomplete features** that need to be finished. These are NOT duplicates - they are partially implemented features that need completion.

---

## Category 1: CRITICAL - Must Complete for Production

### 1.1 QuickBooks Transformer Completion (Task 7.4)
**Status**: Partially implemented with TODOs
**Location**: `backend/rust/src/connectors/quickbooks/transformers.rs`

**Missing Implementations**:
- [ ] Tax code mapping (line 169 TODO)
- [ ] Billing/shipping address transformation for invoices
- [ ] Due date calculation based on payment terms
- [ ] Custom field mapping (max 3 fields per QBO API limitation)
- [ ] Configurable shipping item ID (currently hardcoded)
- [ ] Account validation before creating items
- [ ] Clean up unused imports (Serialize, MetaData, CustomField)

**Impact**: Cannot sync orders to QuickBooks without these
**Effort**: 2-3 days
**Priority**: HIGH

---

### 1.2 Sync Orchestrator Flow Wiring (Task 9.4)
**Status**: Orchestrator exists but flows not wired up
**Location**: `backend/rust/src/services/sync_orchestrator.rs`

**Missing Implementations**:
- [ ] Wire up `woo_to_qbo.rs` flow for order syncing
- [ ] Wire up `woo_to_supabase.rs` flow for data warehousing
- [ ] Add entity type routing (orders → invoice, products → item, customers → customer)
- [ ] Implement `sync_entity` method dispatch logic

**Impact**: Sync operations won't actually execute
**Effort**: 1-2 days
**Priority**: HIGH

---

### 1.3 OAuth State Validation (Task 19.3)
**Status**: ✅ COMPLETED (migration 027 created, handlers updated)
**Location**: `backend/rust/src/handlers/integrations.rs`

---

### 1.4 Real Connectivity Checks (Task 22.1)
**Status**: ✅ COMPLETED (HealthCheckService implemented)
**Location**: `backend/rust/src/services/health_check.rs`

---

### 1.5 Webhook Configuration Storage (Task 20.1)
**Status**: TODO comments in code
**Location**: `backend/rust/src/handlers/webhooks.rs`

**Missing Implementations**:
- [ ] Create migration for `webhook_configs` table
- [ ] Implement database CRUD operations
- [ ] Load configs on startup and cache
- [ ] Update get/update webhook config handlers

**Impact**: Webhook settings not persisted across restarts
**Effort**: 1 day
**Priority**: MEDIUM

---

## Category 2: IMPORTANT - Needed for Full Functionality

### 2.1 Sync Direction Control (Task 9.5)
**Status**: Not implemented
**Location**: New feature needed

**Missing Implementations**:
- [ ] Add `sync_direction` field to integration config (one_way, two_way)
- [ ] Add `source_of_truth` field per entity type
- [ ] Integrate with existing conflict_resolver for two-way sync
- [ ] Implement sync loop prevention with sync_version tracking

**Impact**: Only one-way sync supported currently
**Effort**: 2-3 days
**Priority**: MEDIUM

---

### 2.2 Incremental Sync Logic (Task 10.2)
**Status**: Not implemented
**Location**: `backend/rust/src/services/sync_orchestrator.rs`

**Missing Implementations**:
- [ ] Track `last_sync_at` per connector per entity in sync_state table
- [ ] Use `modified_after` parameter for WooCommerce
- [ ] Use `MetaData.LastUpdatedTime` for QBO queries
- [ ] Only fetch records changed since last sync

**Impact**: All syncs are full syncs (inefficient)
**Effort**: 2 days
**Priority**: MEDIUM

---

### 2.3 Webhook-Triggered Sync (Task 10.3)
**Status**: Webhook handlers exist but don't trigger sync
**Location**: `backend/rust/src/handlers/webhooks.rs`

**Missing Implementations**:
- [ ] Enqueue incremental sync job on valid webhook receipt
- [ ] Deduplicate events using idempotency keys
- [ ] Support disabling webhooks per tenant

**Impact**: Webhooks received but not acted upon
**Effort**: 1 day
**Priority**: MEDIUM

---

### 2.4 Sync Schedule API (Task 10.4)
**Status**: Routes defined but not fully implemented
**Location**: `backend/rust/src/handlers/sync_operations.rs`

**Missing Implementations**:
- [ ] Complete schedule CRUD operations
- [ ] Persist schedules to database
- [ ] Load schedules on startup

**Impact**: Cannot manage sync schedules via API
**Effort**: 1-2 days
**Priority**: MEDIUM

---

### 2.5 Automatic Token Refresh (Task 3.2)
**Status**: ✅ COMPLETED (TokenRefreshService implemented)
**Location**: `backend/rust/src/services/token_refresh_service.rs`

---

### 2.6 Alert Notifications (Task 10.1 & 14.3)
**Status**: TODO comments in code
**Location**: `backend/rust/src/services/scheduler_service.rs`, `sync_notifier.rs`

**Missing Implementations**:
- [ ] Implement alert notification when backup retries fail
- [ ] Integrate with notification system (email, webhook, Slack)
- [ ] Include error details and remediation steps
- [ ] Implement email sending (currently placeholder)

**Impact**: No alerts on failures
**Effort**: 2-3 days
**Priority**: MEDIUM

---

## Category 3: ENHANCEMENTS - Nice to Have

### 3.1 Dry Run Mode (Task 12.1-12.2)
**Status**: Not implemented
**Location**: New service needed

**Missing Implementations**:
- [ ] Create `dry_run_executor.rs` service
- [ ] Execute transformations without external API calls
- [ ] Return preview of changes
- [ ] Add dry run API endpoint

**Impact**: Cannot preview sync changes before executing
**Effort**: 2-3 days
**Priority**: LOW

---

### 3.2 Bulk Operation Safety (Task 13.1-13.2)
**Status**: Not implemented
**Location**: New feature needed

**Missing Implementations**:
- [ ] Require confirmation for operations affecting >10 records
- [ ] Generate confirmation tokens (5-minute expiry)
- [ ] Display warnings for destructive operations
- [ ] Log destructive operations to audit_log

**Impact**: No safety checks for bulk operations
**Effort**: 2 days
**Priority**: LOW

---

### 3.3 Report Export Functionality (Task 21.1)
**Status**: TODO in code
**Location**: `backend/rust/src/handlers/reporting.rs`

**Missing Implementations**:
- [ ] Implement CSV export for all report types
- [ ] Implement PDF export for financial reports
- [ ] Stream large exports to avoid memory issues

**Impact**: Cannot export reports
**Effort**: 2-3 days
**Priority**: LOW

---

### 3.4 Configurable Backup Paths (Task 20.2)
**Status**: Hardcoded paths in code
**Location**: `backend/rust/src/handlers/backup.rs`

**Missing Implementations**:
- [ ] Add backup configuration to settings table
- [ ] Support per-tenant backup paths
- [ ] Validate paths exist and writable on startup

**Impact**: Backup paths not configurable
**Effort**: 1 day
**Priority**: LOW

---

### 3.5 Configurable OAuth Redirect URIs (Task 19.2)
**Status**: Hardcoded in code
**Location**: `backend/rust/src/handlers/integrations.rs`

**Missing Implementations**:
- [ ] Add `OAUTH_REDIRECT_URI` to environment variables
- [ ] Support per-tenant redirect URIs
- [ ] Update QuickBooks OAuth flow

**Impact**: OAuth redirect not configurable
**Effort**: 0.5 days
**Priority**: LOW

---

### 3.6 OCR Service Implementation (Not in spec)
**Status**: Placeholder implementations
**Location**: `backend/rust/src/services/ocr_service.rs`

**Missing Implementations**:
- [ ] Integrate Google Vision API
- [ ] Integrate AWS Textract

**Impact**: OCR features don't work
**Effort**: 3-4 days
**Priority**: LOW (not in spec)

---

## Category 4: FRONTEND - User Interface

### 4.1 Enhanced Integrations Page (Task 15.1-15.2)
**Status**: Basic shell exists
**Location**: `frontend/src/features/settings/pages/IntegrationsPage.tsx`

**Missing Implementations**:
- [ ] OAuth flow button for QuickBooks
- [ ] Connection status indicators with last sync time
- [ ] "Test Connection" button per connector
- [ ] "Sync Now" button with mode selection
- [ ] Dry run toggle
- [ ] Filter configuration UI
- [ ] Progress indicator during sync

**Impact**: Cannot manage integrations via UI
**Effort**: 3-4 days
**Priority**: MEDIUM

---

### 4.2 Mapping Editor Component (Task 15.3)
**Status**: Not implemented
**Location**: New component needed

**Missing Implementations**:
- [ ] Create `MappingEditor.tsx` component
- [ ] Drag-and-drop field mapping
- [ ] Transformation function selection
- [ ] Preview with sample data

**Impact**: Cannot customize field mappings via UI
**Effort**: 4-5 days
**Priority**: LOW

---

### 4.3 Sync Monitoring Dashboard (Task 16.1-16.4)
**Status**: Not implemented
**Location**: New pages/components needed

**Missing Implementations**:
- [ ] Create `SyncDashboardPage.tsx`
- [ ] Create `SyncHistory.tsx` component
- [ ] Create `FailedRecordsQueue.tsx` component
- [ ] Create `syncApi.ts` service

**Impact**: Cannot monitor sync operations via UI
**Effort**: 5-6 days
**Priority**: MEDIUM

---

## Category 5: TESTING & DOCUMENTATION

### 5.1 Integration Tests (Task 17.1-17.5)
**Status**: Not implemented
**Location**: `backend/rust/tests/` directory

**Missing Implementations**:
- [ ] WooCommerce integration tests
- [ ] QuickBooks integration tests
- [ ] Supabase integration tests
- [ ] End-to-end sync tests
- [ ] Mapping engine tests

**Impact**: No automated integration testing
**Effort**: 5-7 days
**Priority**: MEDIUM

---

### 5.2 Property-Based Tests (Various tasks)
**Status**: Not implemented
**Location**: Test files needed

**Missing Implementations**:
- [ ] Property 1: Idempotent Sync Operations (Task 6.4)
- [ ] Property 2: Data Integrity Round-Trip (Task 3.7)
- [ ] Property 3: Credential Security (Task 1.5)
- [ ] Property 4: Rate Limit Compliance (Task 4.3)
- [ ] Property 5: Conflict Resolution Determinism (Task 9.6)
- [ ] Property 6: Webhook Authenticity (Task 2.4)
- [ ] Property 7: Dry Run Isolation (Task 12.3)
- [ ] Property 8: Mapping Configuration Validity (Task 8.4)

**Impact**: No property-based testing
**Effort**: 7-10 days
**Priority**: LOW (recommended but not required)

---

### 5.3 Documentation (Task 18.1-18.5)
**Status**: Not created
**Location**: `docs/sync/` directory

**Missing Implementations**:
- [ ] Setup guide (SETUP_GUIDE.md)
- [ ] Mapping guide (MAPPING_GUIDE.md)
- [ ] Troubleshooting guide (TROUBLESHOOTING.md)
- [ ] API migration notes (API_MIGRATION.md)
- [ ] Architecture documentation (ARCHITECTURE.md)

**Impact**: No user/developer documentation
**Effort**: 3-4 days
**Priority**: MEDIUM

---

## Implementation Priority Order

### Phase 1: Critical Path (Week 1-2)
1. **QuickBooks Transformer Completion** (Task 7.4) - 2-3 days
2. **Sync Orchestrator Flow Wiring** (Task 9.4) - 1-2 days
3. **Webhook Configuration Storage** (Task 20.1) - 1 day
4. **Webhook-Triggered Sync** (Task 10.3) - 1 day

**Deliverable**: Basic sync functionality working end-to-end

---

### Phase 2: Core Features (Week 3-4)
5. **Sync Direction Control** (Task 9.5) - 2-3 days
6. **Incremental Sync Logic** (Task 10.2) - 2 days
7. **Sync Schedule API** (Task 10.4) - 1-2 days
8. **Alert Notifications** (Task 10.1, 14.3) - 2-3 days

**Deliverable**: Full sync engine with scheduling and alerts

---

### Phase 3: User Interface (Week 5-6)
9. **Enhanced Integrations Page** (Task 15.1-15.2) - 3-4 days
10. **Sync Monitoring Dashboard** (Task 16.1-16.4) - 5-6 days

**Deliverable**: Complete UI for managing and monitoring sync

---

### Phase 4: Safety & Polish (Week 7-8)
11. **Dry Run Mode** (Task 12.1-12.2) - 2-3 days
12. **Bulk Operation Safety** (Task 13.1-13.2) - 2 days
13. **Report Export** (Task 21.1) - 2-3 days
14. **Configurable Settings** (Tasks 20.2, 19.2) - 1-2 days

**Deliverable**: Production-ready with safety controls

---

### Phase 5: Testing & Documentation (Week 9-10)
15. **Integration Tests** (Task 17.1-17.5) - 5-7 days
16. **Documentation** (Task 18.1-18.5) - 3-4 days

**Deliverable**: Tested and documented system

---

## Estimated Total Effort

| Category | Effort |
|----------|--------|
| Critical Backend | 5-7 days |
| Core Features | 7-10 days |
| User Interface | 8-10 days |
| Safety & Polish | 7-10 days |
| Testing & Docs | 8-11 days |
| **TOTAL** | **35-48 days** (7-10 weeks) |

---

## Quick Wins (Can Complete Today)

1. **Configurable OAuth Redirect** (0.5 days)
2. **Configurable Backup Paths** (1 day)
3. **Webhook Configuration Storage** (1 day)

---

## Notes

- All "planned" features marked with `#![allow(dead_code)]` are actually implemented but not wired up
- External API schemas (QuickBooks, WooCommerce types) are complete - they're just comprehensive API definitions
- The sync infrastructure exists - it just needs the flows connected
- Most backend work is integration/wiring, not new development
- Frontend is the biggest gap - needs 8-10 days of work

---

## Recommendation

**Start with Phase 1 (Critical Path)** to get basic sync working, then decide based on business priorities whether to continue with UI or add more backend features.

The system is actually quite complete - it just needs the pieces connected together.
