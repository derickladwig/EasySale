# Implementation Plan: Sync Monitoring UI

## Overview

This plan implements the Sync Monitoring UI feature in phases, starting with shared primitives and progressively building out page enhancements. The approach minimizes rework by establishing reusable components first, then wiring them into existing pages.

All components must use semantic tokens from `tokens.css` and follow EasySale's theming rules (no hardcoded colors, no Tailwind base color utilities).

## Tasks

- [x] 1. Phase 0: Wire-up Audit and API Contract Alignment
  - [x] 1.1 Audit existing sync infrastructure
    - Review `frontend/src/services/syncApi.ts` for existing endpoints
    - Review `frontend/src/settings/pages/IntegrationsPage.tsx` for current implementation
    - Review `frontend/src/settings/pages/SyncDashboardPage.tsx` for current implementation
    - Document gaps between design and existing code
    - _Requirements: All_

  - [x] 1.2 Extend syncApi.ts with missing endpoints
    - Add `getFailedRecordDetails(id)` for payload viewing
    - Add `acknowledgeFailedRecord(id)` for ignore functionality
    - Add `acknowledgeFailedRecords(ids)` for bulk ignore
    - Verify schedule CRUD endpoints exist and match design
    - _Requirements: 4.3, 4.4, 12.3, 12.4_

- [x] 2. Phase 1: Shared Primitives
  - [x] 2.1 Create ScopeSelector component
    - Implement `frontend/src/common/components/molecules/ScopeSelector.tsx`
    - Add sessionStorage persistence with key `easysale_sync_scope`
    - Add fallback to 'all' when persisted store no longer accessible
    - Use `useStores()` hook for store list
    - _Requirements: 10.1, 10.5_

  - [x] 2.2 Write property test for ScopeSelector persistence
    - **Property 11: Session Storage Scope Persistence**
    - **Validates: Requirements 10.5**

  - [x] 2.3 Create StatusChip component
    - Implement `frontend/src/common/components/atoms/StatusChip.tsx`
    - Map connector statuses to semantic color tokens (success, warning, error, muted)
    - Map sync run statuses to appropriate icons and colors
    - Support 'sm' and 'md' sizes
    - _Requirements: 2.3, 2.4_

  - [x] 2.4 Write property test for StatusChip rendering
    - **Property 2: Sync Status Visual Indicators**
    - **Validates: Requirements 2.3, 2.4**

  - [x] 2.5 Create ConfirmDialog component
    - Implement `frontend/src/common/components/molecules/ConfirmDialog.tsx`
    - Add focus trap for accessibility
    - Add keyboard navigation (Escape to cancel, Enter to confirm)
    - Add ARIA labels and roles
    - _Requirements: 9.3, 14.4, 14.5_

  - [x] 2.6 Create useSyncQuery hook
    - Implement `frontend/src/hooks/useSyncQuery.ts`
    - Add polling with configurable interval (default 30s)
    - Add pause when tab hidden using `document.visibilityState`
    - Add debounced manual refresh
    - Add request cancellation on unmount
    - Add sessionStorage caching with timestamp for offline support
    - _Requirements: 2.5, 2.6, 14.7_

  - [x] 2.7 Write unit tests for useSyncQuery hook
    - Test polling starts and stops correctly
    - Test pause when tab hidden
    - Test manual refresh debouncing
    - _Requirements: 2.5, 14.7_

- [x] 3. Checkpoint - Ensure primitives work
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Phase 2: IntegrationsPage Enhancement
  - [x] 4.1 Add ScopeSelector to IntegrationsPage header
    - Import and render ScopeSelector in page header
    - Pass scope to all data fetching hooks
    - _Requirements: 10.1, 10.2_

  - [x] 4.2 Enhance ConnectorCard with RBAC controls
    - Add permission checks using `useCapabilities()` hook
    - Disable actions when user lacks permission
    - Add tooltips explaining disabled state
    - _Requirements: 9.1, 9.4, 9.5_

  - [x] 4.3 Write property test for RBAC control rendering
    - **Property 4: RBAC-Based Control Rendering**
    - **Validates: Requirements 9.1, 9.4, 9.5**

  - [x] 4.4 Add confirmation dialogs for destructive actions
    - Add ConfirmDialog for Disconnect action
    - Add ConfirmDialog for Full Resync action
    - _Requirements: 9.2, 9.3, 16.5_

  - [x] 4.5 Implement OAuth popup flow with state validation
    - Generate and store state in sessionStorage before opening popup
    - Validate state on callback before trusting result
    - Add popup-blocked fallback with "Open authorization link" button
    - _Requirements: 11.3, 11.4, 11.5_

  - [x] 4.6 Add Sync Now dropdown with Full Resync option
    - Show dropdown only for admin role
    - Default action is incremental sync
    - Full Resync requires confirmation dialog
    - Disable when sync is running
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

  - [x] 4.7 Add credential masking for saved credentials
    - Display masked placeholders for saved credential fields
    - Never re-display full credential values
    - _Requirements: 11.1_

  - [x] 4.8 Write property test for credential masking
    - **Property 12: Credential Masking**
    - **Validates: Requirements 11.1**

- [x] 5. Checkpoint - Ensure IntegrationsPage works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Phase 3: SyncDashboardPage Enhancement
  - [x] 6.1 Add ScopeSelector to SyncDashboardPage header
    - Import and render ScopeSelector
    - Pass scope to all data fetching hooks
    - _Requirements: 10.1, 10.2_

  - [x] 6.2 Add offline banner and staleness indicator
    - Show banner when `is_online === false`
    - Display "As of {timestamp}" for cached data
    - Disable write actions when offline
    - _Requirements: 2.7, 14.2_

  - [x] 6.3 Enhance useSyncQuery usage with caching
    - Store fetched data in sessionStorage with timestamp
    - Show cached data when offline
    - _Requirements: 2.5, 14.7_

  - [x] 6.4 Write property test for data fetch states
    - **Property 7: Data Fetch State Indicators**
    - **Validates: Requirements 14.1, 14.2, 14.3**

- [x] 7. Phase 4: Sync History Page
  - [x] 7.1 Create SyncHistoryPage component
    - Create `frontend/src/settings/pages/SyncHistoryPage.tsx`
    - Add to AdminPage settings sections
    - Gate with sync capability check
    - _Requirements: 3.1_

  - [x] 7.2 Implement history filters
    - Add entity type filter dropdown
    - Add status filter dropdown
    - Add date range picker
    - _Requirements: 3.4, 3.5, 3.6_

  - [x] 7.3 Write property test for history filtering
    - **Property 3: History Filtering Correctness**
    - **Validates: Requirements 3.4, 3.5, 3.6**

  - [x] 7.4 Implement paginated history table
    - Use existing DataTable pattern or create wrapper
    - Display entity, operation, status, records, timestamp
    - Add row click to open details modal
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 7.5 Create SyncDetailsModal component
    - Enhance existing `frontend/src/settings/components/SyncDetailsModal.tsx`
    - Display full sync metadata
    - Display error list with pagination if needed
    - Add link to view failed records from this sync
    - _Requirements: 3.3, 3.7_

- [x] 8. Checkpoint - Ensure history page works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Phase 5: Failed Records Page Enhancement
  - [x] 9.1 Create dedicated FailedRecordsPage
    - Create `frontend/src/settings/pages/FailedRecordsPage.tsx`
    - Move/enhance existing FailedRecordsQueue component
    - Add to AdminPage settings sections
    - _Requirements: 4.1_

  - [x] 9.2 Add bulk selection functionality
    - Add checkbox column to table
    - Add "Select All" checkbox in header
    - Track selected IDs in state
    - _Requirements: 12.1_

  - [x] 9.3 Implement bulk actions bar
    - Show bar when records selected
    - Add "Retry Selected" button
    - Add "Acknowledge Selected" button
    - Display selection count
    - _Requirements: 12.2, 12.3_

  - [x] 9.4 Write property test for bulk selection state
    - **Property 6: Bulk Selection State Management**
    - **Validates: Requirements 12.1, 12.2**

  - [x] 9.5 Create PayloadDetailsModal component
    - Create `frontend/src/settings/components/PayloadDetailsModal.tsx`
    - Display raw payload in read-only JSON viewer
    - Display full error message and stack trace
    - Display retry history
    - _Requirements: 12.4_

  - [x] 9.6 Implement PII redaction in PayloadDetailsModal
    - Redact password, token, api_key, card_number fields
    - Mask email (j***@example.com), phone (***-***-1234)
    - Display "Sensitive data redacted" banner
    - Gate viewing with manager role check
    - _Requirements: 17.1, 17.2, 17.3, 17.4_

  - [x] 9.7 Write property test for PII redaction
    - **Property 8: PII Redaction in Payloads**
    - **Validates: Requirements 12.4, 11.6**

  - [x] 9.8 Add max retry indicator and backoff info
    - Display "Max Retries Exceeded" badge when retry_count >= 5
    - Display next retry time for each record
    - _Requirements: 4.7, 12.5, 12.6_

  - [x] 9.9 Write property test for max retry indicator
    - **Property 10: Max Retry Indicator**
    - **Validates: Requirements 4.7, 12.6**

- [x] 10. Checkpoint - Ensure failed records page works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Phase 6: Schedules and Mapping Editor
  - [x] 11.1 Enhance SyncScheduleManager component
    - Enhance existing `frontend/src/settings/components/SyncScheduleManager.tsx`
    - Add timezone selector (store timezone or UTC)
    - Add concurrency policy selector (queue/skip)
    - Display computed next run time in selected timezone
    - _Requirements: 7.1, 7.2, 13.1, 13.2, 13.4_

  - [x] 11.2 Add schedule CRUD operations
    - Add create schedule modal with cron helper
    - Add edit schedule functionality
    - Add delete with confirmation dialog
    - Add toggle enabled/disabled
    - _Requirements: 7.3, 7.4, 7.5_

  - [x] 11.3 Add schedule status indicators
    - Display "In Progress" when schedule is running
    - Disable manual trigger when running
    - Display countdown to next execution
    - _Requirements: 7.6, 13.5_

  - [x] 11.4 Enhance MappingEditor component
    - Enhance existing `frontend/src/settings/components/MappingEditor.tsx`
    - Add transformation dropdown (none, uppercase, lowercase, trim)
    - Add inline validation errors
    - Add confirmation dialog for row deletion
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 11.5 Add entry points for mapping/schedules per connector
    - Add "Mappings" button to ConnectorCard
    - Add "Schedules" button to ConnectorCard
    - Open as modal/drawer overlay
    - _Requirements: 1.9, 6.1, 7.1_

- [x] 12. Phase 7: QA and Non-Functional Hardening
  - [x] 12.1 Run color lint and fix violations
    - Run `npm run lint:colors`
    - Fix any hardcoded colors found
    - Ensure all components use semantic tokens
    - _Requirements: 8.1, 8.2_

  - [x] 12.2 Add accessibility tests with axe-core
    - Add axe-core checks to key page tests
    - Verify ARIA labels on modals
    - Verify keyboard navigation
    - _Requirements: 14.4, 14.5_

  - [x] 12.3 Add contrast ratio verification
    - Verify WCAG 2.1 AA compliance in light theme
    - Verify WCAG 2.1 AA compliance in dark theme
    - _Requirements: 8.4_

  - [x] 12.4 Verify audit logging integration
    - Confirm disconnect actions are logged
    - Confirm credential saves are logged (without sensitive data)
    - Confirm policy changes are logged with before/after
    - Display "Changed by / When" in settings views
    - _Requirements: 15.1, 15.2, 15.3, 15.7_

- [x] 13. Final Checkpoint - All tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify `npm run lint:colors` passes
  - Verify all property tests pass with 100 iterations

## Notes

- All tasks are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check (100 iterations minimum)
- All components must use semantic tokens from `frontend/src/styles/tokens.css`
- No hardcoded hex/rgb/hsl colors outside `src/styles/` and `src/theme/` directories
