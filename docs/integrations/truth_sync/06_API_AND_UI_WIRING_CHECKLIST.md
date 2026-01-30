# API and UI Wiring Checklist

**Audit Date:** 2026-01-29  
**Status:** COMPLETE

---

## 1. BACKEND API ENDPOINTS

### 1.1 Integration Management

| Endpoint | Method | Handler | Status | Notes |
|----------|--------|---------|--------|-------|
| `/api/integrations/connections` | GET | `integrations.rs` | ✅ Wired | Returns all connection statuses |
| `/api/integrations/health` | GET | `integrations.rs` | ✅ Wired | Returns health check results |
| `/api/integrations/{platform}/test` | POST | `integrations.rs` | ✅ Wired | Tests connection |

### 1.2 WooCommerce Endpoints

| Endpoint | Method | Handler | Status | Notes |
|----------|--------|---------|--------|-------|
| `/api/integrations/woocommerce/credentials` | POST | `integrations.rs` | ✅ Wired | Store credentials |
| `/api/integrations/woocommerce/credentials` | DELETE | `integrations.rs` | ✅ Wired | Delete credentials |
| `/api/integrations/woocommerce/status` | GET | `integrations.rs` | ✅ Wired | Get status |
| `/api/woocommerce/products/lookup` | POST | `woocommerce.rs` | ✅ Wired | SKU lookup |
| `/api/woocommerce/customers/lookup` | POST | `woocommerce.rs` | ✅ Wired | Email lookup |
| `/api/woocommerce/test/{tenant_id}` | GET | `woocommerce.rs` | ✅ Wired | Test connection |
| `/api/woocommerce/products/create` | POST | `woocommerce_write.rs` | ✅ Wired | Create product |
| `/api/woocommerce/products/update` | PUT | `woocommerce_write.rs` | ✅ Wired | Update product |
| `/api/woocommerce/products/delete` | DELETE | `woocommerce_write.rs` | ✅ Wired | Delete product |
| `/api/woocommerce/orders/export` | POST | `woocommerce_bulk.rs` | ✅ Wired | Bulk export |

### 1.3 QuickBooks Endpoints

| Endpoint | Method | Handler | Status | Notes |
|----------|--------|---------|--------|-------|
| `/api/integrations/quickbooks/auth-url` | POST | `integrations.rs` | ✅ Wired | Get OAuth URL |
| `/api/integrations/quickbooks/callback` | GET | `integrations.rs` | ✅ Wired | OAuth callback |
| `/api/integrations/quickbooks/credentials` | DELETE | `integrations.rs` | ✅ Wired | Disconnect |
| `/api/integrations/quickbooks/status` | GET | `integrations.rs` | ✅ Wired | Get status |
| `/api/quickbooks/customers/create` | POST | `quickbooks_crud.rs` | ✅ Wired | Create customer |
| `/api/quickbooks/items/create` | POST | `quickbooks_crud.rs` | ✅ Wired | Create item |
| `/api/quickbooks/invoices/create` | POST | `quickbooks_invoice.rs` | ✅ Wired | Create invoice |

### 1.4 Sync Endpoints

| Endpoint | Method | Handler | Status | Notes |
|----------|--------|---------|--------|-------|
| `/api/sync/{entity}` | POST | `sync.rs` | ✅ Wired | Trigger sync |
| `/api/sync/status` | GET | `sync.rs` | ✅ Wired | Get all sync statuses |
| `/api/sync/status/{syncId}` | GET | `sync.rs` | ✅ Wired | Get specific sync |
| `/api/sync/failures` | GET | `sync.rs` | ✅ Wired | Get failed records |
| `/api/sync/retry` | POST | `sync.rs` | ✅ Wired | Retry failed records |
| `/api/sync/failures/{id}/retry` | POST | `sync.rs` | ✅ Wired | Retry single record |
| `/api/sync/schedules` | GET | `sync.rs` | ✅ Wired | Get schedules |
| `/api/sync/schedules` | POST | `sync.rs` | ✅ Wired | Create schedule |
| `/api/sync/schedules/{id}` | PUT | `sync.rs` | ✅ Wired | Update schedule |
| `/api/sync/schedules/{id}` | DELETE | `sync.rs` | ✅ Wired | Delete schedule |
| `/api/sync/history` | GET | `sync.rs` | ✅ Wired | Get sync history |
| `/api/sync/metrics` | GET | `sync.rs` | ✅ Wired | Get sync metrics |
| `/api/sync/dry-run/{entity}` | POST | `sync.rs` | ✅ Wired | Dry run sync |

### 1.5 Settings Endpoints

| Endpoint | Method | Handler | Status | Notes |
|----------|--------|---------|--------|-------|
| `/api/settings/network` | GET | `settings.rs` | ✅ Wired | Get network settings |
| `/api/settings/network` | PUT | `settings.rs` | ✅ Wired | Update network settings |
| `/api/settings/sync/direction` | GET | `settings.rs` | ❌ Missing | Get sync direction |
| `/api/settings/sync/direction` | PUT | `settings.rs` | ❌ Missing | Update sync direction |
| `/api/settings/sync/delete-policy` | GET | `settings.rs` | ❌ Missing | Get delete policy |
| `/api/settings/sync/delete-policy` | PUT | `settings.rs` | ❌ Missing | Update delete policy |

---

## 2. FRONTEND UI COMPONENTS

### 2.1 Integration Pages

| Page | File | Status | API Calls |
|------|------|--------|-----------|
| IntegrationsPage | `settings/pages/IntegrationsPage.tsx` | ✅ Implemented | connections, credentials, test |
| SyncDashboardPage | `settings/pages/SyncDashboardPage.tsx` | ✅ Implemented | status, metrics, health |
| NetworkPage | `settings/pages/NetworkPage.tsx` | ✅ Implemented | network settings |

### 2.2 Integration Components

| Component | File | Status | Features |
|-----------|------|--------|----------|
| IntegrationCard | `admin/components/IntegrationCard.tsx` | ✅ Implemented | Status, toggle, actions |
| SyncScheduleManager | `settings/components/SyncScheduleManager.tsx` | ✅ Implemented | CRUD schedules |
| SyncHistory | `settings/components/SyncHistory.tsx` | ✅ Implemented | History, export |
| FailedRecordsQueue | `settings/components/FailedRecordsQueue.tsx` | ✅ Implemented | Retry, bulk retry |
| MappingEditor | `settings/components/MappingEditor.tsx` | ✅ Implemented | Field mapping |
| SyncDetailsModal | `settings/components/SyncDetailsModal.tsx` | ✅ Implemented | Sync details |

### 2.3 Missing UI Components

| Component | Purpose | Priority |
|-----------|---------|----------|
| SyncDirectionToggle | Control pull/push/bidirectional | 🔴 CRITICAL |
| DeletePolicyToggle | Control delete behavior | 🔴 CRITICAL |
| SyncProgressBar | Real-time sync progress | 🟡 MEDIUM |
| DLQManager | Dead letter queue management | 🟡 MEDIUM |
| RetryPolicyConfig | Configure backoff settings | 🟢 LOW |

---

## 3. API CLIENT WIRING

### 3.1 syncApi.ts Functions

| Function | Endpoint | Status |
|----------|----------|--------|
| `triggerSync(entity, options)` | `POST /api/sync/{entity}` | ✅ Wired |
| `getSyncStatus()` | `GET /api/sync/status` | ✅ Wired |
| `getSyncDetails(syncId)` | `GET /api/sync/status/{syncId}` | ✅ Wired |
| `getFailedRecords()` | `GET /api/sync/failures` | ✅ Wired |
| `retryFailedRecords(ids)` | `POST /api/sync/retry` | ✅ Wired |
| `retryFailedRecord(id)` | `POST /api/sync/failures/{id}/retry` | ✅ Wired |
| `getSchedules()` | `GET /api/sync/schedules` | ✅ Wired |
| `createSchedule(data)` | `POST /api/sync/schedules` | ✅ Wired |
| `updateSchedule(id, data)` | `PUT /api/sync/schedules/{id}` | ✅ Wired |
| `deleteSchedule(id)` | `DELETE /api/sync/schedules/{id}` | ✅ Wired |
| `getConnectionStatus()` | `GET /api/integrations/connections` | ✅ Wired |
| `testConnection(platform)` | `POST /api/integrations/{platform}/test` | ✅ Wired |
| `getSyncHistory(params)` | `GET /api/sync/history` | ✅ Wired |
| `getSyncMetrics()` | `GET /api/sync/metrics` | ✅ Wired |
| `dryRunSync(entity)` | `POST /api/sync/dry-run/{entity}` | ✅ Wired |
| `getIntegrationHealth()` | `GET /api/integrations/health` | ✅ Wired |
| `connectWooCommerce(creds)` | `POST /api/integrations/woocommerce/credentials` | ✅ Wired |
| `disconnectWooCommerce()` | `DELETE /api/integrations/woocommerce/credentials` | ✅ Wired |
| `getWooCommerceStatus()` | `GET /api/integrations/woocommerce/status` | ✅ Wired |
| `getQuickBooksAuthUrl()` | `POST /api/integrations/quickbooks/auth-url` | ✅ Wired |
| `disconnectQuickBooks()` | `DELETE /api/integrations/quickbooks/credentials` | ✅ Wired |
| `getQuickBooksStatus()` | `GET /api/integrations/quickbooks/status` | ✅ Wired |

### 3.2 Missing API Functions

| Function | Endpoint | Priority |
|----------|----------|----------|
| `getSyncDirection()` | `GET /api/settings/sync/direction` | 🔴 CRITICAL |
| `updateSyncDirection(config)` | `PUT /api/settings/sync/direction` | 🔴 CRITICAL |
| `getDeletePolicy()` | `GET /api/settings/sync/delete-policy` | 🔴 CRITICAL |
| `updateDeletePolicy(config)` | `PUT /api/settings/sync/delete-policy` | 🔴 CRITICAL |
| `cancelSync(syncId)` | `POST /api/sync/{syncId}/cancel` | 🟡 MEDIUM |
| `getSyncProgress(syncId)` | `GET /api/sync/{syncId}/progress` | 🟡 MEDIUM |

---

## 4. SETTINGS PERSISTENCE VERIFICATION

### 4.1 Settings That Persist

| Setting | Storage | Verified |
|---------|---------|----------|
| WooCommerce credentials | `integration_credentials` table | ✅ Yes |
| QuickBooks OAuth tokens | `integration_credentials` table | ✅ Yes |
| Sync schedules | `sync_schedules` table | ✅ Yes |
| Network settings | `network_settings` table | ✅ Yes |
| Sync enabled/disabled | `sync_state` table | ✅ Yes |

### 4.2 Settings That Don't Persist (Gaps)

| Setting | Expected Storage | Status |
|---------|------------------|--------|
| Sync direction (global) | `sync_direction_config` table | ❌ Missing UI |
| Sync direction (per-entity) | `sync_direction_config` table | ❌ Missing UI |
| Delete policy | `sync_settings` table | ❌ Missing |
| Retry policy | `sync_settings` table | ❌ Missing |
| Rate limit config | `sync_settings` table | ❌ Missing |

---

## 5. OPERATOR CONTROLS CHECKLIST

### 5.1 Implemented Controls ✅

| Control | Location | Persists | Changes Backend |
|---------|----------|----------|-----------------|
| Connect WooCommerce | IntegrationsPage | ✅ Yes | ✅ Yes |
| Disconnect WooCommerce | IntegrationsPage | ✅ Yes | ✅ Yes |
| Connect QuickBooks (OAuth) | IntegrationsPage | ✅ Yes | ✅ Yes |
| Disconnect QuickBooks | IntegrationsPage | ✅ Yes | ✅ Yes |
| Test connection | IntegrationsPage | N/A | ✅ Yes |
| Enable/disable sync | NetworkPage | ✅ Yes | ✅ Yes |
| Sync interval | NetworkPage | ✅ Yes | ✅ Yes |
| Auto-resolve conflicts | NetworkPage | ✅ Yes | ✅ Yes |
| Create sync schedule | SyncScheduleManager | ✅ Yes | ✅ Yes |
| Edit sync schedule | SyncScheduleManager | ✅ Yes | ✅ Yes |
| Delete sync schedule | SyncScheduleManager | ✅ Yes | ✅ Yes |
| Enable/disable schedule | SyncScheduleManager | ✅ Yes | ✅ Yes |
| Trigger manual sync | SyncDashboardPage | N/A | ✅ Yes |
| Retry failed records | FailedRecordsQueue | N/A | ✅ Yes |
| View sync history | SyncHistory | N/A | N/A |
| Export sync history | SyncHistory | N/A | N/A |
| Edit field mappings | MappingEditor | ⚠️ Local only | ❌ No |

### 5.2 Missing Controls ❌

| Control | Location | Priority | Backend Ready |
|---------|----------|----------|---------------|
| Sync direction toggle (global) | NetworkPage | 🔴 CRITICAL | ⚠️ Partial |
| Sync direction toggle (per-entity) | SyncScheduleManager | 🔴 CRITICAL | ⚠️ Partial |
| Delete policy toggle | NetworkPage | 🔴 CRITICAL | ❌ No |
| Cancel running sync | SyncDashboardPage | 🟡 MEDIUM | ❌ No |
| Real-time sync progress | SyncDashboardPage | 🟡 MEDIUM | ❌ No |
| DLQ management | New component | 🟡 MEDIUM | ❌ No |
| Retry policy config | NetworkPage | 🟢 LOW | ❌ No |
| Rate limit config | NetworkPage | 🟢 LOW | ❌ No |
| Mapping persistence | MappingEditor | 🟢 LOW | ❌ No |

---

## 6. CAPABILITY-BASED DISABLING

### 6.1 Current Implementation

```typescript
const INTEGRATION_CAPABILITIES = {
  woocommerce: { capability: 'sync', hasBackend: true },
  quickbooks: { capability: 'sync', hasBackend: true },
  supabase: { capability: 'sync', hasBackend: true },
  stripe: { capability: null, hasBackend: false },
  square: { capability: null, hasBackend: false },
};
```

### 6.2 States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Disabled | Capability off | Card disabled, shows reason |
| Bug | Capability on, backend missing | Card shows warning |
| Disconnected | Capability on, backend available, not connected | Card shows "Connect" button |
| Connected | Capability on, backend available, connected | Card shows status, actions |
| Error | Connection failed | Card shows error message |
| Syncing | Sync in progress | Card shows spinner |

---

## 7. IMPLEMENTATION TASKS

### 7.1 Backend Tasks

| Task | File | Priority | Effort |
|------|------|----------|--------|
| Add sync direction endpoints | `handlers/settings.rs` | 🔴 CRITICAL | 2 hours |
| Add delete policy endpoints | `handlers/settings.rs` | 🔴 CRITICAL | 2 hours |
| Add cancel sync endpoint | `handlers/sync.rs` | 🟡 MEDIUM | 1 hour |
| Add sync progress endpoint | `handlers/sync.rs` | 🟡 MEDIUM | 2 hours |
| Add mapping persistence | `handlers/mappings.rs` | 🟢 LOW | 3 hours |

### 7.2 Frontend Tasks

| Task | File | Priority | Effort |
|------|------|----------|--------|
| Add SyncDirectionToggle component | New component | 🔴 CRITICAL | 3 hours |
| Add DeletePolicyToggle component | New component | 🔴 CRITICAL | 2 hours |
| Integrate direction toggle in NetworkPage | `NetworkPage.tsx` | 🔴 CRITICAL | 1 hour |
| Integrate direction toggle in SyncScheduleManager | `SyncScheduleManager.tsx` | 🔴 CRITICAL | 1 hour |
| Add cancel sync button | `SyncDashboardPage.tsx` | 🟡 MEDIUM | 1 hour |
| Add sync progress bar | `SyncDashboardPage.tsx` | 🟡 MEDIUM | 2 hours |
| Add API functions for new endpoints | `syncApi.ts` | 🔴 CRITICAL | 1 hour |

### 7.3 Total Effort Estimate

| Priority | Backend | Frontend | Total |
|----------|---------|----------|-------|
| 🔴 CRITICAL | 4 hours | 8 hours | 12 hours |
| 🟡 MEDIUM | 3 hours | 3 hours | 6 hours |
| 🟢 LOW | 3 hours | 0 hours | 3 hours |
| **Total** | **10 hours** | **11 hours** | **21 hours** |
