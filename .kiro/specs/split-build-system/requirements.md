# Requirements Document: Split Build System

## Introduction

The EasySale system currently exists as a monolithic Rust backend with all integrations (QuickBooks, WooCommerce, Supabase) compiled into every build. This creates several problems:

1. **Open-source distribution**: Cannot share the codebase publicly without exposing proprietary QuickBooks integration code
2. **Build bloat**: All users compile integration code they may never use
3. **Deployment complexity**: Single binary contains all features, making it difficult to offer tiered products
4. **Docker inefficiency**: No root .dockerignore file results in 35.49 GB target/ directory being sent to Docker context

This feature implements a production-ready split build system that creates two distinct builds from the same codebase:

- **Lite Build (OSS)**: Core POS functionality with optional CSV export capability
- **Full Build (Private)**: Lite + QuickBooks OAuth sync integration

The system uses Cargo workspace architecture with feature flags to enable compile-time selection of capabilities. The frontend adapts dynamically based on backend capabilities exposed through an API endpoint.

## Glossary

- **POS_Core**: The fundamental point-of-sale domain logic (pricing, tax, rounding, transaction finalization)
- **Lite_Build**: Open-source build containing POS_Core with optional CSV export
- **Full_Build**: Private build containing Lite_Build plus QuickBooks OAuth sync
- **Accounting_Snapshot**: Immutable financial record created at transaction finalization
- **Export_Batch**: Collection of accounting snapshots prepared for export
- **Capability_API**: REST endpoint that reports which features the backend supports
- **Feature_Flag**: Cargo feature that enables/disables code at compile time
- **QBO**: QuickBooks Online
- **CSV_Export_Pack**: Optional module that generates QuickBooks-compatible CSV files
- **Sync_Add_On**: Private module that handles OAuth and real-time QuickBooks synchronization

## Requirements

### Requirement 1: Cargo Workspace Architecture

**User Story:** As a developer, I want the codebase organized as a Cargo workspace with feature flags, so that I can compile different builds from the same source.

#### Acceptance Criteria

1. WHEN the project is built, THE Build_System SHALL use a Cargo workspace structure with multiple crates
2. THE Build_System SHALL define feature flags for "export" and "sync" capabilities
3. WHEN building with no features, THE Build_System SHALL produce a working Lite_Build
4. WHEN building with "export" feature, THE Build_System SHALL include CSV export functionality
5. WHEN building with "sync" feature, THE Build_System SHALL include QuickBooks OAuth and sync functionality
6. THE Build_System SHALL ensure POS_Core compiles independently without any integration dependencies

### Requirement 2: Core Domain Isolation

**User Story:** As a developer, I want the core POS logic separated from integrations, so that the open-source build has no proprietary dependencies.

#### Acceptance Criteria

1. THE POS_Core SHALL contain all pricing, tax, rounding, and transaction finalization logic
2. THE POS_Core SHALL NOT depend on any integration-specific code (QuickBooks, WooCommerce, Supabase)
3. WHEN compiling Lite_Build, THE Build_System SHALL NOT include any QuickBooks OAuth or API client code
4. THE POS_Core SHALL expose trait-based interfaces for optional integrations
5. THE Build_System SHALL verify that POS_Core compiles with zero integration dependencies

### Requirement 3: Accounting Snapshot System

**User Story:** As a developer, I want immutable accounting snapshots created at transaction finalization, so that exports never recompute financial data.

#### Acceptance Criteria

1. WHEN a transaction is finalized, THE POS_Core SHALL create an Accounting_Snapshot with all computed totals
2. THE Accounting_Snapshot SHALL include subtotal, tax, discounts, final total, payment method, and timestamp
3. THE Accounting_Snapshot SHALL be immutable after creation
4. WHEN exporting data, THE Export_System SHALL use Accounting_Snapshot values without recomputation
5. THE Accounting_Snapshot SHALL persist to the database immediately upon transaction finalization

### Requirement 4: Capability Discovery API

**User Story:** As a frontend developer, I want to query backend capabilities at runtime, so that the UI adapts to available features.

#### Acceptance Criteria

1. THE Backend SHALL expose a GET /api/capabilities endpoint
2. WHEN queried, THE Capability_API SHALL return a JSON object indicating available features
3. THE Capability_API SHALL report accounting mode as "disabled", "export_only", or "sync"
4. WHEN the backend is built without export feature, THE Capability_API SHALL report accounting mode as "disabled"
5. WHEN the backend is built with export feature, THE Capability_API SHALL report accounting mode as "export_only"
6. WHEN the backend is built with sync feature, THE Capability_API SHALL report accounting mode as "sync"
7. THE Frontend SHALL query /api/capabilities on startup and adapt UI accordingly

### Requirement 5: Export Batch Management

**User Story:** As a user, I want to create export batches of transactions, so that I can export accounting data to CSV files.

#### Acceptance Criteria

1. THE Export_System SHALL allow creating an Export_Batch from a date range
2. WHEN creating an Export_Batch, THE Export_System SHALL collect all Accounting_Snapshots in the specified range
3. THE Export_Batch SHALL be assigned a unique batch ID and creation timestamp
4. THE Export_System SHALL persist Export_Batch metadata to the database
5. WHEN an Export_Batch is created, THE Export_System SHALL mark it as "pending" status
6. THE Export_System SHALL support querying Export_Batches by date range and status

### Requirement 6: CSV Export Generation

**User Story:** As a user, I want to export accounting data as QuickBooks-compatible CSV files, so that I can import transactions into QuickBooks manually.

#### Acceptance Criteria

1. WHEN the "export" feature is enabled, THE CSV_Export_Pack SHALL be available
2. THE CSV_Export_Pack SHALL generate CSV files matching QuickBooks import templates
3. WHEN generating a CSV export, THE CSV_Export_Pack SHALL use Accounting_Snapshot data without recomputation
4. THE CSV_Export_Pack SHALL support exporting sales receipts, invoices, and refunds
5. THE CSV_Export_Pack SHALL include all required QuickBooks fields (date, customer, items, amounts, tax)
6. WHEN an export completes successfully, THE Export_System SHALL mark the Export_Batch as "completed"
7. IF an export fails, THE Export_System SHALL mark the Export_Batch as "failed" and log the error

### Requirement 7: Idempotent Export Operations

**User Story:** As a user, I want export operations to be idempotent, so that re-running an export doesn't create duplicate data.

#### Acceptance Criteria

1. WHEN an Export_Batch is marked "completed", THE Export_System SHALL prevent re-exporting the same batch
2. THE Export_System SHALL track which transactions have been included in completed exports
3. WHEN creating a new Export_Batch, THE Export_System SHALL exclude transactions already in completed batches
4. THE Export_System SHALL allow re-exporting a "failed" Export_Batch
5. THE Export_System SHALL provide an API to reset an Export_Batch status for manual re-export

### Requirement 8: QuickBooks Sync Add-On (Private)

**User Story:** As a premium user, I want real-time QuickBooks synchronization, so that transactions automatically sync without manual export.

#### Acceptance Criteria

1. WHEN the "sync" feature is enabled, THE Sync_Add_On SHALL be available
2. THE Sync_Add_On SHALL include all QuickBooks OAuth 2.0 authentication code
3. THE Sync_Add_On SHALL include QuickBooks API client for creating sales receipts, invoices, and refunds
4. WHEN a transaction is finalized, THE Sync_Add_On SHALL automatically sync to QuickBooks if configured
5. THE Sync_Add_On SHALL handle OAuth token refresh automatically
6. THE Sync_Add_On SHALL log sync operations and errors
7. THE Sync_Add_On SHALL support webhook notifications from QuickBooks

### Requirement 9: Docker Build Optimization

**User Story:** As a developer, I want efficient Docker builds, so that build times and image sizes are minimized.

#### Acceptance Criteria

1. THE Build_System SHALL include a root .dockerignore file
2. THE .dockerignore SHALL exclude target/, node_modules/, .git/, and other build artifacts
3. WHEN building a Docker image, THE Build_System SHALL NOT include the 35+ GB target/ directory in context
4. THE Dockerfile SHALL use multi-stage builds to minimize final image size
5. THE Dockerfile SHALL cache Cargo dependencies separately from application code
6. THE Build_System SHALL produce Docker images under 500 MB for Lite_Build
7. THE Build_System SHALL produce Docker images under 600 MB for Full_Build

### Requirement 10: Build Matrix Documentation

**User Story:** As a developer, I want clear documentation of build configurations, so that I understand how to compile each variant.

#### Acceptance Criteria

1. THE Documentation SHALL include a build matrix showing all feature combinations
2. THE Documentation SHALL provide exact cargo build commands for each variant
3. THE Documentation SHALL list which files are included in each build
4. THE Documentation SHALL document the /api/capabilities response for each build
5. THE Documentation SHALL explain the difference between Lite_Build and Full_Build
6. THE Documentation SHALL include Docker build commands for each variant

### Requirement 11: Frontend Capability Gating

**User Story:** As a user, I want the UI to show only available features, so that I don't see options for disabled functionality.

#### Acceptance Criteria

1. WHEN accounting mode is "disabled", THE Frontend SHALL hide all accounting-related UI elements
2. WHEN accounting mode is "export_only", THE Frontend SHALL show export UI but hide sync UI
3. WHEN accounting mode is "sync", THE Frontend SHALL show both export and sync UI
4. THE Frontend SHALL query /api/capabilities on startup before rendering navigation
5. THE Frontend SHALL cache capabilities for the session duration
6. WHEN capabilities change (e.g., after backend upgrade), THE Frontend SHALL refresh capabilities on next startup

### Requirement 12: Zero Code Duplication

**User Story:** As a developer, I want zero duplication of accounting logic, so that bug fixes apply to all builds.

#### Acceptance Criteria

1. THE Build_System SHALL ensure Accounting_Snapshot creation logic exists in exactly one location
2. THE Build_System SHALL ensure tax calculation logic exists in exactly one location
3. THE Build_System SHALL ensure pricing logic exists in exactly one location
4. WHEN a bug is fixed in POS_Core, THE Fix SHALL apply to both Lite_Build and Full_Build
5. THE Build_System SHALL use conditional compilation (#[cfg(feature = "...")]) to include optional features
6. THE Build_System SHALL NOT use copy-paste or code duplication for feature variants

### Requirement 13: Migration Path for Existing Data

**User Story:** As a developer, I want existing transactions to work with the new snapshot system, so that historical data remains accessible.

#### Acceptance Criteria

1. THE Migration_System SHALL create Accounting_Snapshots for all existing finalized transactions
2. WHEN migrating historical data, THE Migration_System SHALL compute snapshots using current POS_Core logic
3. THE Migration_System SHALL verify that all finalized transactions have corresponding snapshots
4. THE Migration_System SHALL log any transactions that cannot be migrated
5. THE Migration_System SHALL provide a rollback mechanism if migration fails

### Requirement 14: Testing Strategy for Split Builds

**User Story:** As a developer, I want comprehensive tests for each build variant, so that I can verify correctness.

#### Acceptance Criteria

1. THE Test_Suite SHALL include unit tests for POS_Core that run in all builds
2. THE Test_Suite SHALL include integration tests for CSV_Export_Pack that run only when "export" feature is enabled
3. THE Test_Suite SHALL include integration tests for Sync_Add_On that run only when "sync" feature is enabled
4. THE Test_Suite SHALL verify that Lite_Build compiles without integration dependencies
5. THE Test_Suite SHALL verify that /api/capabilities returns correct values for each build
6. THE Test_Suite SHALL include property-based tests for Accounting_Snapshot immutability
