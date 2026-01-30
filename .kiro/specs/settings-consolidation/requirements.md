# Requirements Document

## Introduction

This specification defines the consolidation, audit, and UX upgrade of the Settings module for the CAPS POS system. Rather than rebuilding from scratch, this effort focuses on making the existing foundation coherent, consistent, and professional by:

- Auditing what exists (UI patterns, backend logic, permission rules)
- Identifying and fixing inconsistencies (store/station/user/role logic)
- Consolidating duplicated patterns (modals, tables, validation, API calls)
- Upgrading UX to reduce friction and improve clarity for operators
- Hardening settings and permissions for reliable LAN/offline operation

The goal is to deliver the same features with fewer clicks, the same data with cleaner rules, and the same pages with better flow.

## Glossary

- **Settings_Module**: The admin interface for configuring system-wide, store-level, station-level, and user-level settings
- **Setting_Scope**: The level at which a setting applies (Global, Store, Station, User)
- **Station**: A specific POS terminal/device within a store
- **Store_Context**: The current store a user is operating within
- **Station_Context**: The current station/device a user is logged into
- **Effective_Settings**: The resolved configuration values after applying scope hierarchy
- **Bulk_Action**: An operation that applies to multiple selected entities simultaneously
- **Audit_Trail**: A log of who changed what settings, when, and from where

## Requirements

### Requirement 1: Settings Information Architecture

**User Story:** As a system administrator, I want a clear, organized Settings interface, so that I can quickly find and modify any configuration without confusion.

#### Acceptance Criteria

1. THE System SHALL organize Settings into logical tabs: My Preferences, Company & Stores, Users & Roles, Network, Product Config, Data Management, Tax Rules, Integrations
2. THE System SHALL display the scope (Global/Store/Station/User) for each setting
3. THE System SHALL provide a Settings Search feature that allows jumping directly to any setting by keyword
4. THE System SHALL show the current context (Store, Station, User) in the Settings header
5. THE System SHALL provide an "Effective Settings" view that shows resolved values and their source

### Requirement 2: Users & Roles Management

**User Story:** As a manager, I want to manage users and their permissions efficiently, so that I can onboard staff quickly and maintain security.

#### Acceptance Criteria

1. THE System SHALL display all users in a searchable, filterable table
2. WHEN users have missing required assignments, THE System SHALL display warning indicators
3. THE System SHALL provide filters for: Active/Inactive, Unassigned Store, Unassigned Station, Role, Never Logged In
4. THE System SHALL support bulk actions: Assign Store, Assign Role, Enable/Disable, Reset Password
5. WHEN multiple users have issues, THE System SHALL display a "Fix Issues" banner with guided resolution
6. THE System SHALL separate Users and Roles into distinct sub-tabs within Users & Roles
7. THE System SHALL require Store assignment for users who need to perform POS operations
8. THE System SHALL support three Station policies: Any Station, Specific Station, No Station Required

### Requirement 3: User Editor Consistency

**User Story:** As an administrator, I want a consistent, clear interface for editing users, so that I don't make configuration mistakes.

#### Acceptance Criteria

1. THE System SHALL organize the Edit User modal into three sections: Profile, Access, Security
2. THE System SHALL display effective permissions preview based on selected role
3. THE System SHALL validate all fields before allowing save
4. THE System SHALL show inline validation errors (not just toast notifications)
5. THE System SHALL guard against unsaved changes when closing the modal
6. THE System SHALL label Store assignment clearly as "Primary Store" with future support for "Allowed Stores"
7. THE System SHALL present Station assignment as a policy choice, not a broken requirement
8. THE System SHALL prevent saving invalid combinations (e.g., POS role without store assignment)

### Requirement 4: Settings Page Consistency

**User Story:** As a user navigating Settings, I want all settings pages to look and behave the same way, so that I can work efficiently without relearning each page.

#### Acceptance Criteria

1. THE System SHALL use a standard page shell for all Settings pages with: search, filter chips, problems badge, primary action button
2. THE System SHALL use a standard table layout with: sortable columns, fixed action column, bulk selection
3. THE System SHALL display standard empty states with clear calls-to-action
4. THE System SHALL provide a standard bulk actions bar when items are selected
5. THE System SHALL show inline warnings for problematic entities
6. THE System SHALL use consistent modal editors across all entity types (Users, Stores, Stations, Roles)

### Requirement 5: Permission Enforcement

**User Story:** As a security-conscious administrator, I want permissions enforced consistently across the system, so that unauthorized actions are prevented reliably.

#### Acceptance Criteria

1. THE System SHALL enforce all permissions server-side, not just in the UI
2. THE System SHALL return 403 Forbidden for unauthorized API requests
3. THE System SHALL use a standard permission check wrapper across all protected routes
4. THE System SHALL derive user context (user, store, station) from a single source of truth
5. THE System SHALL validate permission requirements before executing sensitive operations
6. THE System SHALL log all permission denials for audit purposes

### Requirement 6: Store and Station Context

**User Story:** As a multi-store operator, I want clear rules about store and station requirements, so that users can work without confusion or errors.

#### Acceptance Criteria

1. THE System SHALL define clear rules for when Store assignment is required
2. THE System SHALL define clear rules for when Station assignment is required
3. WHEN a user lacks required Store assignment, THE System SHALL prevent POS operations and display clear error
4. WHEN a user lacks required Station assignment (if policy requires it), THE System SHALL prevent login and display clear error
5. THE System SHALL allow users with "Any Station" policy to log in from any terminal
6. THE System SHALL allow users with "No Station Required" policy to access non-POS functions without station assignment
7. THE System SHALL store current store and station context in the user session
8. THE System SHALL display current context prominently in the UI header

### Requirement 7: Validation Consistency

**User Story:** As a developer, I want validation rules defined once and enforced everywhere, so that the system behaves predictably.

#### Acceptance Criteria

1. THE System SHALL define validation schemas shared between frontend and backend
2. THE System SHALL return structured validation errors with field-level details
3. THE System SHALL display validation errors inline next to the relevant field
4. THE System SHALL prevent form submission when validation fails
5. THE System SHALL validate on blur for immediate feedback
6. THE System SHALL validate on submit for comprehensive checking
7. THE System SHALL use consistent error message formatting across all forms

### Requirement 8: Audit Logging for Settings

**User Story:** As an administrator, I want to see who changed what settings and when, so that I can track changes and troubleshoot issues.

#### Acceptance Criteria

1. THE System SHALL log all changes to users, roles, stores, stations, and system settings
2. THE System SHALL record: who made the change, what changed, before/after values, timestamp, station/device
3. THE System SHALL provide an Audit Log page within Settings
4. THE System SHALL allow filtering audit logs by: entity type, user, date range, action type
5. THE System SHALL display audit logs in reverse chronological order
6. THE System SHALL support exporting audit logs to CSV
7. THE System SHALL retain audit logs for at least 90 days

### Requirement 9: Bulk Operations

**User Story:** As a manager setting up multiple users, I want to perform actions on many users at once, so that I can work efficiently.

#### Acceptance Criteria

1. THE System SHALL support selecting multiple users via checkboxes
2. THE System SHALL display a bulk actions bar when users are selected
3. THE System SHALL support bulk assign store operation
4. THE System SHALL support bulk assign role operation
5. THE System SHALL support bulk enable/disable operation
6. THE System SHALL support bulk reset password operation
7. THE System SHALL show a confirmation dialog before executing bulk operations
8. THE System SHALL display progress and results after bulk operations complete

### Requirement 10: Settings Search and Navigation

**User Story:** As a user looking for a specific setting, I want to search and jump directly to it, so that I don't waste time clicking through tabs.

#### Acceptance Criteria

1. THE System SHALL provide a search input in the Settings header
2. WHEN a user types a search query, THE System SHALL show matching settings in a dropdown
3. WHEN a user selects a search result, THE System SHALL navigate to that setting and highlight it
4. THE System SHALL index searchable terms: setting name, description, keywords, scope
5. THE System SHALL support fuzzy matching for typos
6. THE System SHALL show recent searches for quick access

### Requirement 11: Effective Settings Resolution

**User Story:** As a technician troubleshooting a station, I want to see the effective configuration for the current context, so that I can understand what settings are actually in use.

#### Acceptance Criteria

1. THE System SHALL provide a "View Effective Settings" button in the Settings header
2. WHEN clicked, THE System SHALL display all resolved settings for the current context (store, station, user)
3. THE System SHALL show the source of each setting value (Global, Store, Station, User)
4. THE System SHALL highlight settings that are overridden at lower scopes
5. THE System SHALL allow exporting effective settings to JSON or CSV
6. THE System SHALL refresh effective settings when context changes

### Requirement 12: Roles and Permissions Management

**User Story:** As an administrator, I want to view and understand role permissions clearly, so that I can assign appropriate roles to users.

#### Acceptance Criteria

1. THE System SHALL display all roles in a table with: role name, description, user count
2. THE System SHALL show the full permission set for each role
3. THE System SHALL display permissions grouped by module (Sell, Warehouse, Admin, etc.)
4. THE System SHALL indicate which permissions are "high risk" (e.g., manage_users, adjust_inventory)
5. THE System SHALL prevent deleting roles that are assigned to active users
6. THE System SHALL support viewing which users have a specific role
7. THE System SHALL display a permission matrix view (roles × permissions grid)

### Requirement 13: Network and Offline Settings

**User Story:** As a store manager, I want to configure network and offline behavior, so that the system works reliably even when connectivity is poor.

#### Acceptance Criteria

1. THE System SHALL provide Network settings tab with: sync interval, remote stores, offline mode
2. THE System SHALL allow configuring sync interval (1-60 minutes)
3. THE System SHALL allow adding/removing remote store connections
4. THE System SHALL test network connectivity to remote stores
5. THE System SHALL display current sync status and last sync time
6. THE System SHALL allow enabling/disabling offline mode per station
7. THE System SHALL show pending sync queue size

### Requirement 14: Data Management Tools

**User Story:** As an administrator, I want tools to manage data integrity, so that I can maintain a healthy database.

#### Acceptance Criteria

1. THE System SHALL provide Data Management tab with: backup, restore, export, import, cleanup tools
2. THE System SHALL allow triggering manual backups
3. THE System SHALL display backup history with: date, size, status
4. THE System SHALL allow exporting data to CSV by entity type
5. THE System SHALL allow importing data from CSV with validation
6. THE System SHALL provide data cleanup tools (e.g., delete old sessions, archive completed layaways)
7. THE System SHALL require confirmation before destructive operations

### Requirement 15: Tax Rules Configuration

**User Story:** As a manager, I want to configure tax rules per store, so that the system calculates taxes correctly for each location.

#### Acceptance Criteria

1. THE System SHALL provide Tax Rules tab with store-scoped tax configuration
2. THE System SHALL allow defining multiple tax rates per store
3. THE System SHALL support tax rules by product category
4. THE System SHALL allow setting default tax rate for uncategorized products
5. THE System SHALL validate that tax rates are between 0% and 100%
6. THE System SHALL show which products are affected by each tax rule
7. THE System SHALL allow testing tax calculations with sample transactions

### Requirement 16: Integration Settings

**User Story:** As an administrator, I want to configure external integrations, so that the POS connects to accounting, e-commerce, and other systems.

#### Acceptance Criteria

1. THE System SHALL provide Integrations tab with: QuickBooks, WooCommerce, Stripe, Square, Paint Systems
2. THE System SHALL allow enabling/disabling each integration
3. THE System SHALL store integration credentials securely (encrypted at rest)
4. THE System SHALL test integration connectivity with "Test Connection" button
5. THE System SHALL display integration sync status and last sync time
6. THE System SHALL log integration errors for troubleshooting
7. THE System SHALL allow configuring integration-specific settings (e.g., sync frequency, data mapping)
8. THE System SHALL support QuickBooks OAuth flow for authentication
9. THE System SHALL support WooCommerce REST API configuration (URL, consumer key, consumer secret)
10. THE System SHALL support Stripe Terminal configuration (API key, location ID)
11. THE System SHALL support Square configuration (access token, location ID)
12. THE System SHALL support Paint System API configuration (URL, API key)

### Requirement 17: Company and Store Settings

**User Story:** As an administrator, I want to configure company and store information, so that receipts, invoices, and reports display correct details.

#### Acceptance Criteria

1. THE System SHALL provide Company & Stores tab with: company info, store list, store details
2. THE System SHALL allow editing company name, address, phone, email, logo
3. THE System SHALL display all stores in a table with: name, address, status, station count
4. THE System SHALL allow adding/editing/disabling stores
5. THE System SHALL require unique store IDs
6. THE System SHALL allow configuring store-specific settings: timezone, currency, receipt footer
7. THE System SHALL prevent deleting stores with active transactions

### Requirement 18: My Preferences

**User Story:** As a user, I want to customize my personal preferences, so that the system works the way I prefer.

#### Acceptance Criteria

1. THE System SHALL provide My Preferences tab with: display name, email, password, theme, language
2. THE System SHALL allow users to change their display name and email
3. THE System SHALL allow users to change their password with current password verification
4. THE System SHALL allow users to select theme (Light, Dark, Auto)
5. THE System SHALL allow users to select language (if multi-language support exists)
6. THE System SHALL allow users to configure notification preferences
7. THE System SHALL save preferences per user, not per session

### Requirement 19: Product Configuration

**User Story:** As a manager, I want to configure product-related settings, so that the catalog behaves correctly for my business.

#### Acceptance Criteria

1. THE System SHALL provide Product Config tab with: categories, units, pricing tiers, core charges
2. THE System SHALL allow defining product categories with hierarchical structure
3. THE System SHALL allow defining units of measure (each, case, gallon, liter, etc.)
4. THE System SHALL allow configuring pricing tiers (Retail, Wholesale, Contractor, etc.)
5. THE System SHALL allow defining core charge types and amounts
6. THE System SHALL validate that pricing tiers have unique names
7. THE System SHALL prevent deleting categories or units that are in use

### Requirement 20: Settings Module Performance

**User Story:** As a user working in Settings, I want fast, responsive interactions, so that I can work efficiently.

#### Acceptance Criteria

1. THE System SHALL load Settings pages in less than 500ms
2. THE System SHALL render tables with 1000+ rows using virtualization
3. THE System SHALL debounce search inputs to avoid excessive API calls
4. THE System SHALL cache settings data for 5 minutes to reduce server load
5. THE System SHALL show loading indicators for operations taking more than 200ms
6. THE System SHALL paginate large result sets (100 items per page)
7. THE System SHALL optimize database queries with appropriate indexes

### Requirement 21: Hardware Configuration

**User Story:** As a store manager, I want to configure hardware devices, so that printers, scanners, and payment terminals work correctly.

#### Acceptance Criteria

1. THE System SHALL provide Hardware tab with: Receipt Printers, Label Printers, Barcode Scanners, Cash Drawers, Payment Terminals
2. THE System SHALL allow configuring receipt printer type (ESC/POS), port, and width
3. THE System SHALL allow configuring label printer type (Zebra ZPL, Brother QL), IP address, and port
4. THE System SHALL allow configuring barcode scanner type (USB HID), prefix, and suffix
5. THE System SHALL allow configuring cash drawer type and open code
6. THE System SHALL allow configuring payment terminal type (Stripe Terminal, Square, PAX, Ingenico)
7. THE System SHALL test hardware connectivity with "Test Print" and "Test Connection" buttons
8. THE System SHALL display hardware status (connected, disconnected, error)
9. THE System SHALL store hardware configuration per station
10. THE System SHALL provide default hardware templates for common setups

### Requirement 22: Feature Flags

**User Story:** As an administrator, I want to enable/disable features, so that I can control which functionality is available.

#### Acceptance Criteria

1. THE System SHALL provide Feature Flags section in Settings
2. THE System SHALL allow enabling/disabling: Loyalty Program, Service Orders, Paint Mixing, E-commerce Sync
3. THE System SHALL hide disabled features from navigation and UI
4. THE System SHALL prevent access to disabled features via API
5. THE System SHALL display feature status (enabled, disabled) with toggle switches
6. THE System SHALL require confirmation before disabling features with active data
7. THE System SHALL log all feature flag changes in audit log

### Requirement 23: Localization Settings

**User Story:** As a store manager, I want to configure language, currency, and tax settings, so that the system works correctly for my region.

#### Acceptance Criteria

1. THE System SHALL provide Localization section in Settings
2. THE System SHALL allow selecting default language (English, French, Spanish)
3. THE System SHALL allow selecting default currency (CAD, USD)
4. THE System SHALL allow configuring tax settings: enabled/disabled, rate, name (GST, HST, PST, VAT)
5. THE System SHALL apply localization settings to all displays, receipts, and reports
6. THE System SHALL format currency according to selected locale
7. THE System SHALL format dates and times according to store timezone

### Requirement 24: Backup and Restore

**User Story:** As an administrator, I want to configure automated backups, so that data is protected.

#### Acceptance Criteria

1. THE System SHALL provide Backup section in Data Management
2. THE System SHALL allow enabling/disabling automated backups
3. THE System SHALL allow configuring backup schedule (cron format)
4. THE System SHALL allow configuring local backup path (network drive)
5. THE System SHALL allow configuring backup retention (days)
6. THE System SHALL allow enabling Google Drive backup with service account credentials
7. THE System SHALL display backup history with: date, size, status, location
8. THE System SHALL allow triggering manual backups
9. THE System SHALL allow restoring from backup with confirmation
10. THE System SHALL test backup path accessibility

### Requirement 25: Performance Monitoring

**User Story:** As an administrator, I want to monitor system performance, so that I can identify and resolve issues.

#### Acceptance Criteria

1. THE System SHALL provide Performance section in Settings
2. THE System SHALL allow enabling/disabling performance monitoring
3. THE System SHALL allow configuring monitoring endpoint URL
4. THE System SHALL allow configuring error tracking DSN (e.g., Sentry)
5. THE System SHALL display current performance metrics: API response times, database query times, memory usage
6. THE System SHALL display error rate and recent errors
7. THE System SHALL allow exporting performance data to CSV
