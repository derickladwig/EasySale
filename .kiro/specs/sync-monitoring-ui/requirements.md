# Requirements Document

## Introduction

This document defines the requirements for the Sync Monitoring UI feature, which provides a comprehensive frontend interface for monitoring and managing data synchronization between EasySale POS and external platforms (WooCommerce, QuickBooks, Supabase). The backend sync system is fully implemented; this feature focuses on building the user-facing components to interact with existing sync APIs.

## Glossary

- **Sync_Dashboard**: The main monitoring interface displaying real-time sync status, metrics, and controls
- **Connector**: An integration with an external platform (WooCommerce, QuickBooks, Supabase, Stripe, Square, Clover)
- **Sync_Queue**: The pending operations waiting to be synchronized
- **Failed_Records_Queue**: Records that failed to sync and require retry or manual intervention
- **Mapping_Editor**: UI component for configuring field mappings between EasySale and external platforms
- **Sync_Direction**: Configuration determining data flow direction (pull, push, bidirectional, disabled)
- **Delete_Policy**: Configuration determining how deletions are handled across systems
- **Circuit_Breaker**: Protection mechanism that blocks requests to failing connectors
- **Scope_Selector**: UI control for selecting tenant/store context for multi-tenant operations
- **RBAC**: Role-Based Access Control determining user permissions for sync operations

## Status Enumerations

### Connector Status
- `connected`: Integration is active and credentials are valid
- `disconnected`: Integration is not configured
- `degraded`: Integration is connected but experiencing issues
- `reauth_required`: OAuth token expired or revoked, re-authorization needed
- `error`: Integration has a configuration or connection error

### Sync Run Status
- `queued`: Sync is waiting to start
- `running`: Sync is currently in progress
- `completed`: Sync finished successfully
- `failed`: Sync encountered errors
- `skipped`: Sync was skipped due to overlap or concurrency policy

### Circuit Breaker State
- `closed`: Healthy, requests flowing normally
- `open`: Blocked, too many failures detected
- `half_open`: Recovering, testing if service is available

## Requirements

### Requirement 1: Enhanced Integrations Page

**User Story:** As a store administrator, I want to configure and manage external integrations from a single page, so that I can connect my POS to WooCommerce, QuickBooks, and other platforms.

#### Acceptance Criteria

1. WHEN a user navigates to the Integrations page, THE Integrations_Page SHALL display all available connectors with their current connection status
2. WHEN a connector is disconnected, THE Integrations_Page SHALL display a configuration form with required credentials fields
3. WHEN a user submits valid credentials for WooCommerce, THE Integrations_Page SHALL call the connect API and update the connection status
4. WHEN a user clicks "Connect" for QuickBooks, THE Integrations_Page SHALL initiate the OAuth flow by opening the authorization URL
5. WHEN a connector is connected, THE Integrations_Page SHALL display a "Sync Now" button and last sync timestamp
6. WHEN a user clicks "Sync Now", THE Integrations_Page SHALL trigger an incremental sync and display progress feedback
7. WHEN a user clicks "Disconnect", THE Integrations_Page SHALL call the disconnect API and clear stored credentials
8. IF a connection test fails, THEN THE Integrations_Page SHALL display the error message returned by the API
9. WHEN a connector has sync capability enabled, THE Integrations_Page SHALL display sync direction and delete policy controls
10. WHEN a user changes sync direction, THE Integrations_Page SHALL persist the setting via the sync direction API

### Requirement 2: Sync Status Dashboard

**User Story:** As a store administrator, I want to view real-time sync status and metrics, so that I can monitor data synchronization health across all platforms.

#### Acceptance Criteria

1. WHEN a user navigates to the Sync Dashboard, THE Sync_Dashboard SHALL display aggregate metrics (total syncs, successful, failed, records processed)
2. WHEN the dashboard loads, THE Sync_Dashboard SHALL fetch and display connection status for all configured connectors
3. WHEN a sync is in progress, THE Sync_Dashboard SHALL display a spinning indicator and "running" status
4. WHEN a sync completes, THE Sync_Dashboard SHALL update the status to "completed" or "failed" with appropriate styling
5. WHILE the dashboard is open, THE Sync_Dashboard SHALL auto-refresh data every 30 seconds
6. WHEN a user clicks "Refresh", THE Sync_Dashboard SHALL immediately fetch updated data from all sync APIs
7. WHEN system health is degraded, THE Sync_Dashboard SHALL display a warning banner with affected connectors
8. WHEN circuit breakers are open, THE Sync_Dashboard SHALL display which connectors are blocked and why

### Requirement 3: Sync History View

**User Story:** As a store administrator, I want to view sync history with timestamps and results, so that I can audit past synchronization operations.

#### Acceptance Criteria

1. WHEN a user views sync history, THE Sync_History SHALL display a paginated list of past sync operations
2. WHEN displaying a sync entry, THE Sync_History SHALL show entity type, operation, status, records processed, and timestamp
3. WHEN a user clicks on a sync entry, THE Sync_History SHALL open a details modal with full sync information
4. WHEN a user filters by entity type, THE Sync_History SHALL display only syncs for the selected entity
5. WHEN a user filters by status, THE Sync_History SHALL display only syncs matching the selected status
6. WHEN a user filters by date range, THE Sync_History SHALL display only syncs within the specified period
7. WHEN a sync has errors, THE Sync_History SHALL display error count and allow viewing error details

### Requirement 4: Failed Records Queue

**User Story:** As a store administrator, I want to view and retry failed sync records, so that I can resolve synchronization issues without losing data.

#### Acceptance Criteria

1. WHEN a user views the failed records queue, THE Failed_Records_Queue SHALL display all records that failed to sync
2. WHEN displaying a failed record, THE Failed_Records_Queue SHALL show entity type, source ID, error message, and retry count
3. WHEN a user clicks "Retry" on a single record, THE Failed_Records_Queue SHALL call the retry API for that record
4. WHEN a user clicks "Retry All", THE Failed_Records_Queue SHALL call the bulk retry API for all failed records
5. IF a retry succeeds, THEN THE Failed_Records_Queue SHALL remove the record from the queue
6. IF a retry fails, THEN THE Failed_Records_Queue SHALL increment the retry count and update the error message
7. WHEN a record has exceeded maximum retries, THE Failed_Records_Queue SHALL display a warning indicator

### Requirement 5: Connector Configuration UI

**User Story:** As a store administrator, I want to configure connector settings including sync direction and delete policies, so that I can control how data flows between systems.

#### Acceptance Criteria

1. WHEN a user opens connector settings, THE Connector_Config SHALL display current sync direction (pull/push/bidirectional/disabled)
2. WHEN a user changes sync direction, THE Connector_Config SHALL call the sync direction API and display confirmation
3. WHEN a user opens delete policy settings, THE Connector_Config SHALL display current policy (local_only/archive_remote/delete_remote)
4. WHEN a user changes delete policy, THE Connector_Config SHALL call the delete policy API and display confirmation
5. WHEN entity-level overrides exist, THE Connector_Config SHALL display them separately from global settings
6. WHEN a user adds an entity override, THE Connector_Config SHALL persist it via the appropriate API

### Requirement 6: Mapping Editor Component

**User Story:** As a store administrator, I want to configure field mappings between EasySale and external platforms, so that data synchronizes correctly.

#### Acceptance Criteria

1. WHEN a user opens the mapping editor, THE Mapping_Editor SHALL display current field mappings for the selected connector
2. WHEN displaying a mapping, THE Mapping_Editor SHALL show source field, target field, and optional transformation
3. WHEN a user adds a new mapping, THE Mapping_Editor SHALL validate that both source and target fields are selected
4. WHEN a user removes a mapping, THE Mapping_Editor SHALL confirm the action before deletion
5. WHEN a user saves mappings, THE Mapping_Editor SHALL persist changes and display success confirmation
6. IF mapping validation fails, THEN THE Mapping_Editor SHALL display specific validation errors

### Requirement 7: Sync Schedule Management

**User Story:** As a store administrator, I want to configure automatic sync schedules, so that data synchronizes regularly without manual intervention.

#### Acceptance Criteria

1. WHEN a user views sync schedules, THE Sync_Schedule_Manager SHALL display all configured schedules
2. WHEN displaying a schedule, THE Sync_Schedule_Manager SHALL show entity, cron expression, mode, enabled status, and next run time
3. WHEN a user creates a schedule, THE Sync_Schedule_Manager SHALL validate the cron expression format
4. WHEN a user toggles a schedule, THE Sync_Schedule_Manager SHALL update the enabled status via API
5. WHEN a user deletes a schedule, THE Sync_Schedule_Manager SHALL confirm the action before deletion
6. WHEN a schedule is due to run, THE Sync_Schedule_Manager SHALL display the countdown to next execution

### Requirement 8: UI Theming Compliance

**User Story:** As a developer, I want all sync UI components to use semantic tokens, so that the interface respects the application's theming system.

#### Acceptance Criteria

1. THE Sync_Monitoring_UI SHALL use only semantic color tokens from tokens.css (no hardcoded hex values)
2. THE Sync_Monitoring_UI SHALL use Tailwind utility classes mapped to CSS variables
3. WHEN the theme changes, THE Sync_Monitoring_UI SHALL update colors automatically without page refresh
4. THE Sync_Monitoring_UI SHALL maintain WCAG 2.1 AA contrast ratios in both light and dark themes

### Requirement 9: Role-Based Access Control

**User Story:** As a store owner, I want sync operations to respect user roles, so that only authorized personnel can modify critical integration settings.

#### Acceptance Criteria

1. WHEN a user has view-only role, THE Sync_Monitoring_UI SHALL display status, history, and metrics but disable modification controls
2. WHEN a user attempts a destructive action (disconnect, delete schedule, change delete policy), THE Sync_Monitoring_UI SHALL require elevated permission
3. WHEN a destructive action is requested, THE Sync_Monitoring_UI SHALL display a confirmation dialog before execution
4. THE Sync_Monitoring_UI SHALL check user permissions via the capabilities context before rendering action buttons
5. WHEN a user lacks permission for an action, THE Sync_Monitoring_UI SHALL display the control as disabled with a tooltip explaining the restriction

### Requirement 10: Multi-Tenant and Multi-Store Scope

**User Story:** As a multi-store administrator, I want to view and manage sync settings per store or across all stores, so that I can control synchronization at the appropriate level.

#### Acceptance Criteria

1. WHEN a user has access to multiple stores, THE Sync_Monitoring_UI SHALL display a scope selector (All Stores / specific store)
2. WHEN a scope is selected, THE Sync_Monitoring_UI SHALL filter all displayed data to that scope
3. WHEN editing connector settings, THE Sync_Monitoring_UI SHALL indicate whether the setting applies to tenant, store, or global level
4. WHEN a setting has store-level overrides, THE Sync_Monitoring_UI SHALL display the override indicator and allow viewing/editing per-store values
5. THE Sync_Monitoring_UI SHALL persist the selected scope in session storage for continuity

### Requirement 11: Credential Security and OAuth Handling

**User Story:** As a store administrator, I want credentials to be handled securely and OAuth flows to handle edge cases gracefully, so that integrations remain secure and recoverable.

#### Acceptance Criteria

1. WHEN credentials are saved, THE Integrations_Page SHALL mask sensitive fields and never re-display full values
2. THE Integrations_Page SHALL provide a separate "Test Connection" button distinct from "Save"
3. WHEN OAuth consent is denied, THE Integrations_Page SHALL display a clear message and allow retry
4. WHEN an OAuth token expires, THE Integrations_Page SHALL display "Re-authorization required" status with a re-auth button
5. WHEN OAuth tokens are revoked externally, THE Integrations_Page SHALL detect this on next API call and prompt for re-authorization
6. IF a connection test fails, THEN THE Integrations_Page SHALL display the specific error without exposing sensitive details

### Requirement 12: Enhanced Failed Records Operations

**User Story:** As a store administrator, I want advanced controls for managing failed records, so that I can efficiently resolve sync issues.

#### Acceptance Criteria

1. WHEN viewing failed records, THE Failed_Records_Queue SHALL support bulk selection via checkboxes
2. WHEN records are selected, THE Failed_Records_Queue SHALL enable "Retry Selected" action
3. THE Failed_Records_Queue SHALL provide an "Acknowledge/Ignore" action to remove records from active queue without retry
4. WHEN a user clicks on a failed record, THE Failed_Records_Queue SHALL display raw payload and full error details in a read-only modal
5. THE Failed_Records_Queue SHALL display next retry time and backoff information for each record
6. WHEN a record has exceeded maximum retries (5), THE Failed_Records_Queue SHALL display a "Max Retries Exceeded" badge

### Requirement 13: Schedule Timezone and Concurrency

**User Story:** As a store administrator, I want sync schedules to respect timezone settings and prevent overlapping runs, so that synchronization is predictable and reliable.

#### Acceptance Criteria

1. WHEN creating or editing a schedule, THE Sync_Schedule_Manager SHALL display timezone selection (store timezone or UTC)
2. THE Sync_Schedule_Manager SHALL compute and display "next run time" in the selected timezone
3. WHEN a schedule would overlap with a running sync, THE Sync_Schedule_Manager SHALL queue the new run or skip based on configuration
4. THE Sync_Schedule_Manager SHALL display concurrency policy (queue/skip) for each schedule
5. WHEN a schedule is running, THE Sync_Schedule_Manager SHALL display "In Progress" status and disable manual trigger

### Requirement 14: UX States and Accessibility

**User Story:** As a user, I want consistent loading, empty, and error states with full keyboard accessibility, so that the interface is usable and accessible.

#### Acceptance Criteria

1. THE Sync_Monitoring_UI SHALL display loading spinners during data fetch operations
2. WHEN no data exists, THE Sync_Monitoring_UI SHALL display appropriate empty state messages with guidance
3. WHEN an API error occurs, THE Sync_Monitoring_UI SHALL display an error state with retry option
4. THE Sync_Monitoring_UI SHALL support full keyboard navigation for all interactive elements
5. THE Sync_Monitoring_UI SHALL include ARIA labels and roles for modal dialogs and dynamic content
6. THE Sync_Monitoring_UI SHALL use consistent toast notifications for success/error feedback
7. WHILE the browser tab is hidden, THE Sync_Monitoring_UI SHALL pause auto-refresh polling to reduce load

### Requirement 15: Audit Logging for Configuration Changes

**User Story:** As a store owner, I want configuration changes to be logged with user attribution, so that I can audit who changed integration settings.

#### Acceptance Criteria

1. WHEN a user disconnects a connector, THE Sync_Monitoring_UI SHALL log the action with user ID and timestamp
2. WHEN a user saves credentials, THE Sync_Monitoring_UI SHALL log the action (without sensitive data)
3. WHEN a user changes sync direction or delete policy, THE Sync_Monitoring_UI SHALL log the change with before/after values
4. WHEN a user modifies field mappings, THE Sync_Monitoring_UI SHALL log the mapping changes
5. WHEN a user creates, updates, or deletes a schedule, THE Sync_Monitoring_UI SHALL log the action
6. WHEN a user triggers "Retry All" on failed records, THE Sync_Monitoring_UI SHALL log the bulk action
7. THE Sync_Monitoring_UI SHALL display "Changed by / When" information in settings detail views

### Requirement 16: Sync Now Semantics

**User Story:** As a store administrator, I want clear control over manual sync triggers, so that I can synchronize data on demand without confusion.

#### Acceptance Criteria

1. THE Integrations_Page SHALL provide "Sync Now" per connector (not per entity)
2. WHEN "Sync Now" is clicked, THE Integrations_Page SHALL trigger an incremental sync by default
3. WHEN a sync is already running for a connector, THE Integrations_Page SHALL disable "Sync Now" and display "In Progress"
4. WHERE a user has admin role, THE Integrations_Page SHALL provide a "Full Resync" option in a dropdown menu
5. WHEN "Full Resync" is selected, THE Integrations_Page SHALL display a confirmation dialog warning about duration and impact

### Requirement 17: Payload Viewing Security

**User Story:** As a store administrator, I want to view failed record payloads for debugging while protecting sensitive data, so that I can resolve issues without exposing PII.

#### Acceptance Criteria

1. WHEN viewing raw payloads, THE Failed_Records_Queue SHALL require at least manager role
2. THE Failed_Records_Queue SHALL redact fields containing: passwords, tokens, API keys, credit card numbers
3. THE Failed_Records_Queue SHALL mask customer PII fields (email, phone, address) showing only partial values
4. THE Failed_Records_Queue SHALL display a "Sensitive data redacted" notice when viewing payloads

## API Contract Appendix

### Sync Status API

| Endpoint | Method | Request | Response | Errors |
|----------|--------|---------|----------|--------|
| `/api/sync/status` | GET | - | `{ pending_count, failed_count, last_sync_at, is_online }` | 500: Internal error |
| `/api/sync/pending` | GET | - | `SyncQueueItem[]` | 500: Internal error |
| `/api/sync/retry` | POST | `{ ids?: number[] }` | `{ message }` | 500: Internal error |

### Sync History API

| Endpoint | Method | Request | Response | Errors |
|----------|--------|---------|----------|--------|
| `/api/sync/history` | GET | `?entity&status&startDate&endDate&limit&offset` | `{ entries: SyncHistoryEntry[], total }` | 400: Invalid params |
| `/api/sync/metrics` | GET | `?startDate&endDate` | `SyncMetrics` | 500: Internal error |

### Sync Configuration API

| Endpoint | Method | Request | Response | Errors |
|----------|--------|---------|----------|--------|
| `/api/sync/direction` | GET | - | `SyncDirectionConfig` | 500: Internal error |
| `/api/sync/direction` | PUT | `SyncDirectionConfig` | `{ success, message }` | 400: Invalid config |
| `/api/sync/delete-policy` | GET | - | `DeletePolicyConfig` | 500: Internal error |
| `/api/sync/delete-policy` | PUT | `DeletePolicyConfig` | `{ success, message }` | 400: Invalid config |

### Integration APIs

| Endpoint | Method | Request | Response | Errors |
|----------|--------|---------|----------|--------|
| `/api/integrations/connections` | GET | - | `{ connections: ConnectionStatus[] }` | 500: Internal error |
| `/api/integrations/health` | GET | - | `{ status, connections: HealthStatus[] }` | 500: Internal error |
| `/api/integrations/{platform}/status` | GET | - | `IntegrationStatusResponse` | 404: Not found |
| `/api/integrations/{platform}/test` | POST | - | `{ success, message }` | 500: Test failed |
| `/api/integrations/woocommerce/credentials` | POST | `WooCommerceCredentials` | `{ success, message }` | 400: Invalid creds |
| `/api/integrations/quickbooks/auth-url` | POST | - | `{ auth_url, state }` | 500: Config error |

### Circuit Breaker API

| Endpoint | Method | Request | Response | Errors |
|----------|--------|---------|----------|--------|
| `/api/sync/circuit-breaker/status` | GET | - | `{ connectors: CircuitBreakerStatus[] }` | 500: Internal error |

### Schedule APIs

| Endpoint | Method | Request | Response | Errors |
|----------|--------|---------|----------|--------|
| `/api/sync/schedules` | GET | - | `SyncSchedule[]` | 500: Internal error |
| `/api/sync/schedules` | POST | `CreateScheduleRequest` | `SyncSchedule` | 400: Invalid cron |
| `/api/sync/schedules/{id}` | PUT | `UpdateScheduleRequest` | `SyncSchedule` | 404: Not found |
| `/api/sync/schedules/{id}` | DELETE | - | `{ success }` | 404: Not found |

### Pagination Convention

- `limit`: Number of records per page (default: 20, max: 100)
- `offset`: Number of records to skip (default: 0)
- Response includes `total` for calculating page count

### Error Response Shape

```typescript
{
  error: string;        // Human-readable message
  code?: string;        // Machine-readable error code
  details?: unknown;    // Additional context (validation errors, etc.)
}
```

### Refresh Behavior

- Dashboard auto-refresh: 30 seconds (paused when tab hidden)
- Manual refresh: Immediate fetch, debounced to prevent spam
- Cache: No client-side caching; always fetch fresh data

### Scope Parameter Convention

- Query parameter: `?scope=all` or `?scope=store:{store_id}`
- Header alternative: `X-Store-Scope: all | {store_id}`
- Capabilities context: Fetched from `/api/capabilities` or `useCapabilities()` hook
