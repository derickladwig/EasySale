# Requirements Document: Universal Data Synchronization

## Introduction

This document defines the requirements for a universal data synchronization feature that connects e-commerce platforms (WooCommerce), databases (Supabase), and accounting software (QuickBooks Online) to a point-of-sale system. The feature enables reliable, configurable, and secure data exchange while preventing accidental or uncontrolled synchronization operations.

## Glossary

- **Sync_Engine**: The central orchestration service that manages data flow between connected platforms
- **Connector**: A modular adapter that interfaces with a specific external platform (WooCommerce, Supabase, QuickBooks)
- **Mapping_Table**: Configuration that defines how fields from one system correspond to fields in another
- **Webhook**: An HTTP callback triggered by events in external systems
- **OAuth_Token**: Authentication credential used for secure API access
- **Dry_Run**: A simulation mode that previews sync operations without executing them
- **Idempotent_Operation**: An operation that produces the same result regardless of how many times it is executed
- **Rate_Limiter**: A component that controls API request frequency to avoid exceeding platform limits
- **CloudEvents**: A specification for describing event data in a common format (required by QuickBooks by May 2026)

## Requirements

### Requirement 1: Platform Connectivity

**User Story:** As a system administrator, I want to connect multiple external platforms to the POS system, so that data can flow seamlessly between e-commerce, database, and accounting systems.

#### Acceptance Criteria

1. THE Sync_Engine SHALL support connections to WooCommerce, Supabase, and QuickBooks Online
2. WHEN a new platform connector is added, THE Sync_Engine SHALL validate credentials before enabling the connection
3. THE Connector SHALL use WooCommerce REST API v3 (legacy APIs removed in version 9.0, June 2024)
4. THE Connector SHALL use QuickBooks Online API with minor version 75 (required from August 1, 2025)
5. THE Connector SHALL store OAuth tokens securely with encryption at rest
6. WHEN OAuth tokens expire, THE Connector SHALL automatically refresh them without user intervention
7. THE Sync_Engine SHALL provide a unified interface for managing all platform connections

### Requirement 2: Data Entity Synchronization

**User Story:** As a business owner, I want to synchronize products, orders, customers, and inventory between platforms, so that all systems have consistent data.

#### Acceptance Criteria

1. THE Sync_Engine SHALL support synchronization of products, orders, customers, inventory, and financial records
2. WHEN an order is created in WooCommerce, THE Sync_Engine SHALL create a corresponding invoice in QuickBooks Online
3. THE Sync_Engine SHALL map WooCommerce order numbers to QuickBooks DocNumber fields
4. THE Sync_Engine SHALL map customer details to QuickBooks CustomerRef objects
5. THE Sync_Engine SHALL map line items to QuickBooks SalesItemLineDetail with ItemRef and quantity
6. WHEN a product does not exist in QuickBooks, THE Sync_Engine SHALL create it before creating the invoice
7. THE Sync_Engine SHALL store synchronized data in Supabase for analytics and backup

### Requirement 3: Configurable Field Mapping

**User Story:** As an administrator, I want to configure how fields map between systems, so that I can customize the integration for my business needs.

#### Acceptance Criteria

1. THE Mapping_Table SHALL allow administrators to define source-to-target field relationships
2. THE Mapping_Table SHALL provide default mappings based on common use cases
3. WHEN a mapping is modified, THE Sync_Engine SHALL validate the new configuration before applying it
4. THE Mapping_Table SHALL support transformation rules (e.g., concatenation, formatting)
5. THE Sync_Engine SHALL document that only the first three string custom fields are available through the QuickBooks API
6. THE Mapping_Table SHALL be exportable and importable as JSON configuration files

### Requirement 4: Sync Direction Control

**User Story:** As an administrator, I want to control the direction of data flow, so that I can prevent unintended overwrites of authoritative data.

#### Acceptance Criteria

1. THE Sync_Engine SHALL support one-way sync (source → target only)
2. THE Sync_Engine SHALL support two-way sync with conflict resolution
3. WHEN two-way sync is enabled, THE Sync_Engine SHALL use timestamps to resolve conflicts
4. THE Sync_Engine SHALL allow administrators to designate a source-of-truth for each entity type
5. WHEN a conflict occurs, THE Sync_Engine SHALL log the conflict and apply the configured resolution strategy
6. THE Sync_Engine SHALL prevent sync loops by marking records as "already synced"

### Requirement 5: Filtering and Scheduling

**User Story:** As an administrator, I want to filter which records sync and schedule when syncs occur, so that I have fine-grained control over data flow.

#### Acceptance Criteria

1. THE Sync_Engine SHALL support filtering orders by status (e.g., "completed", "processing")
2. THE Sync_Engine SHALL support filtering by date range
3. THE Sync_Engine SHALL support scheduled full syncs (e.g., daily, hourly)
4. THE Sync_Engine SHALL support scheduled incremental syncs based on last-modified timestamps
5. WHEN a webhook is received, THE Sync_Engine SHALL trigger an incremental sync for the affected entity
6. THE Sync_Engine SHALL allow administrators to disable webhooks and rely solely on scheduled syncs

### Requirement 6: Manual Sync Controls

**User Story:** As an administrator, I want manual controls to trigger syncs on demand, so that I can synchronize specific records when needed.

#### Acceptance Criteria

1. THE Sync_Engine SHALL provide a "Sync Now" button for each connector
2. THE Sync_Engine SHALL provide a "Resend" button for failed records
3. WHEN a manual sync is triggered, THE Sync_Engine SHALL display progress and results
4. THE Sync_Engine SHALL allow syncing a specific order or product by ID
5. THE Sync_Engine SHALL support bulk sync operations with confirmation dialogs

### Requirement 7: Safety and Prevention Controls

**User Story:** As an administrator, I want safety controls to prevent accidental data changes, so that I can test configurations without affecting production data.

#### Acceptance Criteria

1. THE Sync_Engine SHALL provide a sandbox/test mode toggle
2. THE Sync_Engine SHALL provide a dry-run mode that simulates sync without making API calls
3. WHEN dry-run mode is enabled, THE Sync_Engine SHALL display what would be created/updated
4. THE Sync_Engine SHALL require confirmation before bulk operations affecting more than 10 records
5. THE Sync_Engine SHALL maintain a mapping table linking external IDs to prevent duplicate creation
6. IF a destructive operation is requested, THEN THE Sync_Engine SHALL display a warning and require explicit confirmation

### Requirement 8: Error Handling and Retry

**User Story:** As an administrator, I want robust error handling, so that temporary failures don't cause data loss or inconsistency.

#### Acceptance Criteria

1. WHEN an API call fails, THE Sync_Engine SHALL retry with exponential backoff
2. WHEN a rate limit (HTTP 429) is received, THE Sync_Engine SHALL pause and retry after the specified delay
3. WHEN a record fails to sync, THE Sync_Engine SHALL log the error and mark the record for retry
4. THE Sync_Engine SHALL provide a queue of failed operations for manual review
5. THE Sync_Engine SHALL support batch operations for QuickBooks to reduce API calls
6. WHEN a required entity is missing (e.g., customer not found), THE Sync_Engine SHALL create it and retry

### Requirement 9: Logging and Monitoring

**User Story:** As an administrator, I want comprehensive logs, so that I can audit sync operations and troubleshoot issues.

#### Acceptance Criteria

1. THE Sync_Engine SHALL log every sync operation with timestamp, entity type, entity ID, and result
2. THE Sync_Engine SHALL provide a "Sync History" page showing recent operations
3. THE Sync_Engine SHALL allow filtering logs by connector, entity type, and status (success/failure)
4. THE Sync_Engine SHALL allow exporting logs for auditing purposes
5. WHEN an error occurs, THE Sync_Engine SHALL send a notification (email or webhook)
6. THE Sync_Engine SHALL track sync metrics (records synced, errors, duration)

### Requirement 10: Security and Access Control

**User Story:** As a system administrator, I want secure credential storage and role-based access, so that sensitive data is protected.

#### Acceptance Criteria

1. THE Sync_Engine SHALL encrypt API credentials at rest
2. THE Sync_Engine SHALL use HTTPS for all external API communications
3. THE Sync_Engine SHALL implement role-based access control (admin, user roles)
4. THE Sync_Engine SHALL restrict credential management to admin users only
5. THE Sync_Engine SHALL validate webhook signatures to prevent spoofing
6. THE Sync_Engine SHALL never log or display full API credentials

### Requirement 11: QuickBooks Online Integration

**User Story:** As a business owner, I want orders to automatically create invoices in QuickBooks, so that my accounting is always up to date.

#### Acceptance Criteria

1. THE Connector SHALL authenticate using OAuth 2.0 with Client ID and Secret
2. THE Connector SHALL create or update Customer records in QuickBooks
3. THE Connector SHALL create or update Item records matching product SKUs
4. THE Connector SHALL create Invoice objects with CustomerRef and Line items
5. WHEN an order is paid, THE Connector SHALL create a Payment object linked to the invoice
6. WHEN a refund occurs, THE Connector SHALL create a CreditMemo or RefundReceipt
7. THE Connector SHALL use sparse update mode to modify existing records
8. THE Connector SHALL prepare for CloudEvents webhook format migration by May 15, 2026

### Requirement 12: WooCommerce Integration

**User Story:** As a business owner, I want my WooCommerce orders to sync automatically, so that I don't have to manually enter them.

#### Acceptance Criteria

1. THE Connector SHALL authenticate using Consumer Key and Secret (REST API v3)
2. THE Connector SHALL fetch orders, products, customers, and inventory
3. THE Connector SHALL register webhooks for order.created and order.updated events
4. THE Connector SHALL support incremental sync using updated_at timestamps
5. WHEN a webhook is received, THE Connector SHALL validate the payload signature
6. THE Connector SHALL handle product variations and their SKUs

### Requirement 13: Supabase Integration (Optional)

**User Story:** As a business owner, I want synchronized data optionally stored in Supabase, so that I have a central data warehouse for analytics across multiple stores.

**Note**: Supabase integration is completely optional. The POS works fully offline with local SQLite. Supabase is only needed for multi-store analytics or cloud backup.

#### Acceptance Criteria

1. THE Connector SHALL connect using Supabase REST API credentials (service_role_key)
2. THE Connector MAY optionally use direct PostgreSQL connection for bulk operations
3. THE Connector SHALL create tables for orders, order_lines, products, customers, and invoices
4. THE Connector SHALL use upsert operations to avoid duplicate records
5. THE Connector SHALL store raw JSON data alongside parsed columns
6. THE Connector SHALL handle connection errors gracefully with retry logic
7. THE Connector SHALL support read-only mode for analytics-only use cases
8. THE System SHALL continue operating normally if Supabase is not configured

### Requirement 14: User Interface

**User Story:** As an administrator, I want a web-based dashboard, so that I can configure and monitor the sync system easily.

#### Acceptance Criteria

1. THE Dashboard SHALL provide forms for entering API credentials
2. THE Dashboard SHALL provide a mapping editor with default mappings
3. THE Dashboard SHALL provide toggles for enabling/disabling each connector
4. THE Dashboard SHALL display sync status and recent activity
5. THE Dashboard SHALL provide filter configuration for each data stream
6. THE Dashboard SHALL be accessible only to authenticated users
