# Requirements Document: Backend Stability Fixes

## Introduction

This specification addresses critical stability issues in the EasySale backend that prevent proper system operation. The system currently has three categories of issues: migration failures, scheduler configuration errors, and missing database tables for optional services. These issues must be resolved to ensure reliable backend operation.

## Glossary

- **Migration System**: Database schema versioning system that applies SQL changes incrementally
- **Backup Scheduler**: Automated service that triggers database and file backups on a schedule
- **Sync Scheduler**: Service that coordinates data synchronization between stores
- **Token Refresh Service**: Background service that refreshes OAuth tokens for integrations
- **Cron Expression**: Time-based schedule specification using standard cron syntax
- **Foreign Key Constraint**: Database rule ensuring referential integrity between tables

## Requirements

### Requirement 1: Migration System Reliability

**User Story:** As a system administrator, I want database migrations to execute reliably, so that the backend starts successfully with the correct schema.

#### Acceptance Criteria

1. WHEN the migration parser encounters SQL triggers with CASE...END expressions, THE Migration System SHALL parse them as complete statements without splitting at internal semicolons
2. WHEN the migration parser encounters statements with leading SQL comments, THE Migration System SHALL execute the SQL content after stripping comments
3. WHEN a migration contains CREATE TRIGGER statements with nested BEGIN...END and CASE...END blocks, THE Migration System SHALL track block depth correctly
4. WHEN all migrations execute successfully, THE Migration System SHALL record each migration in the _migrations table
5. WHEN a migration fails, THE Migration System SHALL provide clear error messages indicating the statement number and SQL content

### Requirement 2: Backup Scheduler Configuration

**User Story:** As a system administrator, I want automated backups to run on schedule, so that data is protected without manual intervention.

#### Acceptance Criteria

1. WHEN the backup scheduler initializes, THE Backup Scheduler SHALL use valid cron expressions compatible with tokio-cron-scheduler 0.10
2. WHEN hourly incremental backups are enabled, THE Backup Scheduler SHALL schedule them to run at the top of each hour
3. WHEN daily full backups are enabled, THE Backup Scheduler SHALL schedule them to run at 23:59 each day
4. WHEN weekly file backups are enabled, THE Backup Scheduler SHALL schedule them to run on Sunday at 3:00 AM
5. WHEN monthly full backups are enabled, THE Backup Scheduler SHALL schedule them to run on the 1st of each month at 4:00 AM
6. WHEN the scheduler fails to start, THE Backend SHALL log a warning and continue operation without crashing
7. WHEN backup settings indicate all backup types are disabled, THE Backup Scheduler SHALL start successfully without scheduling any jobs

### Requirement 3: Sync Scheduler Database Schema

**User Story:** As a system administrator, I want the sync scheduler to operate correctly, so that multi-store synchronization works reliably.

#### Acceptance Criteria

1. WHEN the backend initializes, THE Sync Scheduler SHALL have a sync_schedules table available in the database
2. WHEN the sync_schedules table does not exist, THE Backend SHALL create it through a migration
3. WHEN the sync scheduler fails to start due to missing tables, THE Backend SHALL log a warning and continue operation
4. WHEN sync schedules are stored, THE System SHALL persist schedule configuration including cron expressions and entity types

### Requirement 4: Integration Credentials Schema

**User Story:** As a system administrator, I want integration credentials to be stored securely, so that external API connections work reliably.

#### Acceptance Criteria

1. WHEN the backend initializes, THE Token Refresh Service SHALL have an integration_credentials table available
2. WHEN the integration_credentials table does not exist, THE Backend SHALL create it through a migration
3. WHEN the token refresh service fails due to missing tables, THE Backend SHALL log a warning and continue operation
4. WHEN OAuth tokens are stored, THE System SHALL encrypt sensitive credential data

### Requirement 5: Price History Trigger Correctness

**User Story:** As a system administrator, I want price changes to be logged automatically, so that audit trails are complete and accurate.

#### Acceptance Criteria

1. WHEN a product price is updated, THE Price History Trigger SHALL log the change to product_price_history table
2. WHEN the price change is system-generated, THE Price History Trigger SHALL insert NULL for changed_by field
3. WHEN the price change is user-generated, THE Application SHALL provide the user ID to the trigger
4. WHEN the changed_by field is NULL, THE System SHALL not enforce foreign key constraints to the users table
5. WHEN price history records are queried, THE View SHALL join with users table using LEFT JOIN to handle NULL changed_by values

### Requirement 6: Graceful Service Degradation

**User Story:** As a system administrator, I want the backend to start successfully even when optional services fail, so that core functionality remains available.

#### Acceptance Criteria

1. WHEN the backup scheduler fails to initialize, THE Backend SHALL log a warning and continue startup
2. WHEN the sync scheduler fails to initialize, THE Backend SHALL log a warning and continue startup
3. WHEN the token refresh service fails to initialize, THE Backend SHALL log a warning and continue startup
4. WHEN core services (database, HTTP server) fail, THE Backend SHALL exit with a clear error message
5. WHEN optional services are degraded, THE Health Endpoint SHALL still report healthy status for core services

### Requirement 7: Compiler Warning Cleanup

**User Story:** As a developer, I want the codebase to compile without warnings, so that real issues are not hidden in noise.

#### Acceptance Criteria

1. WHEN unused imports exist in service modules, THE System SHALL remove them or mark them with allow(unused_imports) if they are part of a public API
2. WHEN unused structs exist for external integrations, THE System SHALL keep them if they represent external API schemas or remove them if truly unused
3. WHEN unused methods exist on services, THE System SHALL remove them if they are not part of planned features or mark them with allow(dead_code) if they are part of a public API
4. WHEN the backend compiles, THE Compiler SHALL produce zero warnings for production builds
5. WHEN scaffolded code exists for future features, THE System SHALL use conditional compilation or feature flags to exclude it from builds
