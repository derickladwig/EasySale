# QuickBooks Online Integration Map

**Generated**: 2026-01-20  
**Purpose**: Document current state of QuickBooks integration before extraction (Phase 0 - Truth Sync)  
**Spec**: split-build-system  
**Task**: 0.1 Generate QuickBooks integration map

## Overview

This document maps all QuickBooks-related code, database tables, and API endpoints in the current monolithic EasySale backend. This serves as the authoritative reference for Phase 8 (QuickBooks Sync Add-On extraction).

**Current State**: QuickBooks integration is fully compiled into the monolithic backend at `backend/rust/src/`.

**Target State**: Extract to private `sync/` directory as a sidecar service (not required for OSS builds).

---

## Table of Contents

1. [Connector Files](#connector-files)
2. [Handler Files & API Endpoints](#handler-files--api-endpoints)
3. [Database Schema](#database-schema)
4. [OAuth Flow](#oauth-flow)
5. [Sync Jobs & Flows](#sync-jobs--flows)
6. [Webhook Handling](#webhook-handling)
7. [Error Handling](#error-handling)
8. [Data Transformers](#data-transformers)

---

## Connector Files

Location: `backend/rust/src/connectors/quickbooks/`

### Core Infrastructure


#### 1. `mod.rs`
- **Purpose**: Module declaration and public exports
- **Exports**: `QuickBooksOAuth`, `QuickBooksClient`
- **Modules**: oauth, client, customer, item, invoice, sales_receipt, payment, refund, vendor, bill, errors, webhooks, cloudevents, transformers
- **Requirements**: 11.1-11.6, 1.4, 1.5, 1.6
- **Notes**: 
  - Minor version 75 required after August 1, 2025
  - CloudEvents webhook format required by May 15, 2026

#### 2. `client.rs`
- **Purpose**: Base QuickBooks API client with HTTP request handling
- **Key Types**: `QuickBooksClient`
- **Key Methods**:
  - `new()` - Create client with credentials and tokens
  - `get()` - GET request with minorversion=75
  - `post()` - POST request for entity creation
  - `sparse_update()` - Partial update with SyncToken
  - `query()` - Execute QuickBooks SQL-like queries
  - `query_json()` - Query with JSON response (for flows)
  - `create()` - Generic entity creation
- **Base URL**: `https://quickbooks.api.intuit.com/v3/company/{realmId}`
- **Minor Version**: 75 (required on ALL requests)
- **Requirements**: 1.4
- **Implements**: `PlatformConnector` trait (test_connection, get_status)


#### 3. `oauth.rs`
- **Purpose**: OAuth 2.0 authorization code flow implementation
- **Key Types**: `QuickBooksOAuth`, `TokenResponse`, `OAuthError`
- **Key Methods**:
  - `new()` - Create OAuth handler with credentials
  - `get_authorization_url()` - Generate auth URL with CSRF state
  - `exchange_code_for_tokens()` - Exchange auth code for tokens
  - `refresh_access_token()` - Refresh expired access token
  - `revoke_token()` - Revoke access token
  - `needs_refresh()` - Check if token needs refresh (5 min threshold)
- **OAuth Endpoints**:
  - Auth: `https://appcenter.intuit.com/connect/oauth2`
  - Token: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
  - Revoke: `https://developer.api.intuit.com/v2/oauth2/tokens/revoke`
- **Scope**: `com.intuit.quickbooks.accounting`
- **Requirements**: 11.1, 1.5, 1.6
- **Token Refresh**: Auto-refresh 5 minutes before expiry

#### 4. `errors.rs`
- **Purpose**: QuickBooks-specific error handling and retry strategies
- **Key Types**: 
  - `QBError` - Classified error with retry strategy
  - `QBErrorType` - Authentication, Validation, RateLimit, Conflict, Network, Internal
  - `QBErrorHandler` - Error handling logic
  - `ErrorHandlingStrategy` - RetryWithBackoff, RetryAfter, RefetchAndRetry, Skip, Fail
- **Error Codes**:
  - `5010` - Stale object (SyncToken mismatch) → Refetch and retry
  - `6240` - Duplicate name → Skip or rename with suffix
  - `6000` - Business validation error → Manual review required
- **Requirements**: 8.1, 8.2, 8.3, 8.6
- **Retry Logic**: Exponential backoff for rate limits, network errors, internal errors


### Entity-Specific Connectors

#### 5. `customer.rs`
- **Purpose**: Customer CRUD operations
- **Key Types**: `QBCustomer`, `EmailAddress`, `PhoneNumber`, `Address`, `MetaData`
- **QuickBooks Fields**: Id, SyncToken, DisplayName, GivenName, FamilyName, CompanyName, PrimaryEmailAddr, PrimaryPhone, BillAddr, ShipAddr, Active
- **Requirements**: 11.2, 2.4
- **Notes**: DisplayName must be unique in QuickBooks

#### 6. `invoice.rs`
- **Purpose**: Invoice CRUD operations (unpaid/partial orders)
- **Key Types**: `QBInvoice`, `CustomerRef`, `Line`, `SalesItemLineDetail`, `CustomField`
- **QuickBooks Fields**: Id, SyncToken, DocNumber, TxnDate, CustomerRef, Line[], TotalAmt, Balance, DueDate, ShipDate, TrackingNum, BillAddr, ShipAddr, CustomerMemo, CustomField[]
- **Requirements**: 11.4, 2.2, 2.3, 2.4, 2.5, 3.5
- **Notes**: Used for orders with PaymentStatus != Paid

#### 7. `sales_receipt.rs`
- **Purpose**: Sales receipt CRUD operations (paid-in-full orders)
- **Key Types**: `QBSalesReceipt`, `CustomerRef`, `PaymentMethodRef`, `AccountRef`, `Line`
- **QuickBooks Fields**: Id, SyncToken, DocNumber, TxnDate, CustomerRef, Line[], TotalAmt, PaymentMethodRef, DepositToAccountRef, BillAddr, ShipAddr, CustomerMemo
- **Requirements**: 2.2, 11.6
- **Notes**: Used for orders with PaymentStatus == Paid

#### 8. `payment.rs`
- **Purpose**: Payment CRUD operations (linked to invoices)
- **Key Types**: `QBPayment`, `CustomerRef`, `PaymentMethodRef`, `AccountRef`, `PaymentLine`, `LinkedTxn`
- **QuickBooks Fields**: Id, SyncToken, TxnDate, CustomerRef, TotalAmt, UnappliedAmt, PaymentMethodRef, DepositToAccountRef, Line[], PrivateNote
- **Requirements**: 11.5
- **Notes**: Links payments to invoices via LinkedTxn


#### 9. `refund.rs`
- **Purpose**: Refund operations (CreditMemo for store credit, RefundReceipt for money-out)
- **Key Types**: `QBCreditMemo`, `QBRefundReceipt`, `CustomerRef`, `PaymentMethodRef`, `AccountRef`, `Line`
- **QuickBooks Fields**:
  - CreditMemo: Id, SyncToken, DocNumber, TxnDate, CustomerRef, Line[], TotalAmt, RemainingCredit, CustomerMemo
  - RefundReceipt: Id, SyncToken, DocNumber, TxnDate, CustomerRef, Line[], TotalAmt, PaymentMethodRef, DepositToAccountRef, CustomerMemo
- **Requirements**: 11.6
- **Notes**: CreditMemo for store credit, RefundReceipt for direct refunds

#### 10. `vendor.rs`
- **Purpose**: Vendor CRUD operations
- **Key Types**: `QBVendor`, `EmailAddress`, `PhoneNumber`, `Address`, `MetaData`
- **QuickBooks Fields**: Id, SyncToken, DisplayName, CompanyName, GivenName, FamilyName, PrimaryEmailAddr, PrimaryPhone, BillAddr, Active, Balance, AcctNum, Vendor1099
- **Requirements**: 11.6, 2.2
- **Notes**: Used for supplier/vendor management

#### 11. `bill.rs`
- **Purpose**: Bill CRUD operations (vendor invoices)
- **Key Types**: `QBBill`, `VendorRef`, `AccountRef`, `Line`, `ItemBasedExpenseLineDetail`, `AccountBasedExpenseLineDetail`
- **QuickBooks Fields**: Id, SyncToken, DocNumber, TxnDate, DueDate, VendorRef, Line[], TotalAmt, Balance, APAccountRef, PrivateNote
- **Requirements**: 11.6, 2.2
- **Notes**: Supports both item-based and account-based expense lines

#### 12. `item.rs`
- **Purpose**: Item (product/service) CRUD operations
- **Key Types**: `QBItem`, `AccountRef`, `MetaData`, `ItemType` (Inventory, NonInventory, Service)
- **QuickBooks Fields**: Id, SyncToken, Name, Sku, Type, Description, Active, UnitPrice, PurchaseCost, QtyOnHand, InvStartDate, IncomeAccountRef, ExpenseAccountRef, AssetAccountRef, TrackQtyOnHand
- **Requirements**: 11.3
- **Notes**: Supports inventory tracking and account references


### Webhook & Event Handling

#### 13. `webhooks.rs`
- **Purpose**: Handle incoming webhooks from QuickBooks (current format)
- **Key Types**: `QBWebhookPayload`, `EventNotification`, `DataChangeEvent`, `EntityChange`, `QBEntityType`, `QBOperation`
- **Webhook Format** (Current):
  ```json
  {
    "eventNotifications": [{
      "realmId": "123456789",
      "dataChangeEvent": {
        "entities": [{
          "name": "Customer",
          "id": "1",
          "operation": "Create",
          "lastUpdated": "2024-01-01T12:00:00Z"
        }]
      }
    }]
  }
  ```
- **Signature Validation**: HMAC-SHA256 with verifier token (intuit-signature header)
- **Supported Entities**: Customer, Invoice, Item, Payment, SalesReceipt, CreditMemo, RefundReceipt, Vendor, Bill, Purchase, VendorCredit
- **Supported Operations**: Create, Update, Delete, Merge, Void
- **Requirements**: 11.8, 10.5, 5.5, 5.6
- **Functions**:
  - `validate_qb_signature()` - Verify webhook signature
  - `parse_qb_webhook()` - Parse webhook payload
  - `parse_entity_change()` - Extract entity type and operation


#### 14. `cloudevents.rs`
- **Purpose**: Handle incoming webhooks from QuickBooks (CloudEvents format - required by May 15, 2026)
- **Key Types**: `CloudEvent`, `CloudEntityType`, `CloudOperation`
- **CloudEvents Format**:
  ```json
  {
    "specversion": "1.0",
    "type": "qbo.invoice.created.v1",
    "source": "https://quickbooks.api.intuit.com",
    "id": "unique-event-id",
    "time": "2024-01-01T12:00:00Z",
    "datacontenttype": "application/json",
    "intuitaccountid": "123456789",
    "intuitentityid": "42",
    "data": { /* entity-specific data */ }
  }
  ```
- **Event Type Format**: `qbo.{entity}.{operation}.v{version}`
  - Examples: `qbo.invoice.created.v1`, `qbo.customer.updated.v1`, `qbo.item.deleted.v1`
- **Signature Validation**: Same HMAC-SHA256 as current format
- **Requirements**: 11.8
- **Functions**:
  - `validate_cloudevents_signature()` - Verify webhook signature
  - `parse_cloudevents()` - Parse CloudEvents payload
  - `is_cloudevents_format()` - Detect CloudEvents vs current format
  - `parse_cloudevents_type()` - Extract entity and operation from type field
- **Migration Deadline**: May 15, 2026


### Data Transformation

#### 15. `transformers.rs`
- **Purpose**: Transform internal canonical models to QuickBooks entities
- **Key Types**: `QuickBooksTransformers`, `TransformerConfig`, `CustomFieldMapping`
- **Transformers**:
  - `internal_customer_to_qbo()` - Transform InternalCustomer → QBCustomer
  - `internal_product_to_qbo()` - Transform InternalProduct → QBItem
  - `internal_order_to_qbo()` - Transform InternalOrder → QBInvoice
- **TransformerConfig Fields**:
  - `shipping_item_id` - QuickBooks shipping item ID (configurable per tenant)
  - `default_payment_terms_days` - Default payment terms (e.g., 30 for Net 30)
  - `custom_field_mappings` - Custom field mappings (max 3 per QBO API limitation)
  - `tax_code_mappings` - Tax class → QBO tax code ID mappings
  - `default_tax_code_id` - Fallback tax code
- **Requirements**: 2.1, 2.4, 2.5, 3.5, 11.4
- **Notes**: 
  - DisplayName must be unique (uses full_name() if display_name is empty)
  - Handles address transformation (billing and shipping)
  - Supports custom field mapping (max 3 fields per QBO limitation)

---


## Handler Files & API Endpoints

Location: `backend/rust/src/handlers/`

### 1. `quickbooks.rs` - Core Operations

**Endpoints**:
- `POST /api/quickbooks/customers/lookup` - Lookup customer by email or name
- `POST /api/quickbooks/items/lookup` - Lookup item by SKU or name
- `GET /api/quickbooks/test/{tenant_id}` - Test QuickBooks connection

**Requirements**: 11.2, 11.3

### 2. `quickbooks_crud.rs` - Customer & Item CRUD

**Customer Endpoints**:
- `POST /api/quickbooks/customers/get` - Get customer by ID
- `PUT /api/quickbooks/customers/update` - Update customer
- `DELETE /api/quickbooks/customers/{tenant_id}/{customer_id}` - Deactivate customer
- `POST /api/quickbooks/customers/query-by-name` - Query customer by display name

**Item Endpoints**:
- `POST /api/quickbooks/items/get` - Get item by ID
- `PUT /api/quickbooks/items/update` - Update item
- `DELETE /api/quickbooks/items/{tenant_id}/{item_id}` - Deactivate item
- `POST /api/quickbooks/items/query-by-name` - Query item by name

**Requirements**: 11.2, 11.3, 2.4


### 3. `quickbooks_invoice.rs` - Invoice Operations

**Endpoints**:
- `POST /api/quickbooks/invoices/get` - Get invoice by ID
- `POST /api/quickbooks/invoices/query` - Query invoice by DocNumber
- `POST /api/quickbooks/invoices/create` - Create invoice
- `PUT /api/quickbooks/invoices/update` - Update invoice
- `DELETE /api/quickbooks/invoices/delete` - Delete invoice

**Requirements**: 11.4, 2.2, 2.3, 2.4, 2.5

### 4. `quickbooks_sales.rs` - Sales Receipt & Payment Operations

**Sales Receipt Endpoints**:
- `POST /api/quickbooks/sales-receipts/get` - Get sales receipt by ID
- `POST /api/quickbooks/sales-receipts/create` - Create sales receipt
- `PUT /api/quickbooks/sales-receipts/update` - Update sales receipt
- `POST /api/quickbooks/sales-receipts/void` - Void sales receipt

**Payment Endpoints**:
- `POST /api/quickbooks/payments/get` - Get payment by ID
- `POST /api/quickbooks/payments/query` - Query payments by customer
- `POST /api/quickbooks/payments/create` - Create payment
- `PUT /api/quickbooks/payments/update` - Update payment
- `POST /api/quickbooks/payments/delete` - Delete payment

**Requirements**: 11.5, 11.6


### 5. `quickbooks_refund.rs` - Refund Operations

**Credit Memo Endpoints**:
- `POST /api/quickbooks/credit-memos/get` - Get credit memo by ID
- `POST /api/quickbooks/credit-memos/create` - Create credit memo
- `PUT /api/quickbooks/credit-memos/update` - Update credit memo

**Refund Receipt Endpoints**:
- `POST /api/quickbooks/refund-receipts/get` - Get refund receipt by ID
- `POST /api/quickbooks/refund-receipts/create` - Create refund receipt
- `PUT /api/quickbooks/refund-receipts/update` - Update refund receipt
- `POST /api/quickbooks/refund-receipts/void` - Void refund receipt

**Requirements**: 11.6

### 6. `quickbooks_vendor.rs` - Vendor Operations

**Endpoints**:
- `POST /api/quickbooks/vendors/get` - Get vendor by ID
- `POST /api/quickbooks/vendors/query` - Query vendor by display name
- `POST /api/quickbooks/vendors/create` - Create vendor
- `PUT /api/quickbooks/vendors/update` - Update vendor
- `POST /api/quickbooks/vendors/query-by-email` - Query vendor by email
- `POST /api/quickbooks/vendors/deactivate` - Deactivate vendor (soft delete)
- `POST /api/quickbooks/vendors/reactivate` - Reactivate vendor

**Requirements**: 11.7


### 7. `quickbooks_bill.rs` - Bill Operations

**Endpoints**:
- `POST /api/quickbooks/bills/get` - Get bill by ID
- `POST /api/quickbooks/bills/query-by-vendor` - Query bills by vendor
- `POST /api/quickbooks/bills/query-by-doc-number` - Query bill by DocNumber
- `POST /api/quickbooks/bills/create` - Create bill
- `PUT /api/quickbooks/bills/update` - Update bill
- `DELETE /api/quickbooks/bills/delete` - Delete bill

**Requirements**: 11.6, 2.2

### 8. `quickbooks_transform.rs` - Transformation Endpoints

**Endpoints**:
- `POST /api/quickbooks/transform/customer` - Transform internal customer to QBO format
- `POST /api/quickbooks/transform/product` - Transform internal product to QBO format
- `POST /api/quickbooks/transform/order` - Transform internal order to QBO format
- `POST /api/quickbooks/transform/check-transaction-type` - Check if order should be Invoice or SalesReceipt

**Requirements**: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 11.4, 11.6

**Notes**: These endpoints expose transformation logic for testing and debugging


### 9. `webhooks.rs` - Webhook Handlers

**Endpoints**:
- `POST /webhooks/quickbooks` - Handle QuickBooks webhook (current format)
- `POST /webhooks/quickbooks/cloudevents` - Handle QuickBooks webhook (CloudEvents format)
- `GET /webhooks/config` - Get webhook configuration
- `PUT /webhooks/config` - Update webhook configuration

**Handler Functions**:
- `handle_quickbooks_webhook()` - Process current format webhooks
- `handle_quickbooks_cloudevents()` - Process CloudEvents format webhooks (auto-detects format)
- `check_duplicate_qb_webhook()` - Prevent duplicate event processing
- `queue_qb_sync_operation()` - Queue sync operation for background processing
- `record_qb_webhook_event()` - Record webhook event for audit trail

**Requirements**: 11.8, 10.5, 5.5, 5.6

**Notes**:
- Validates intuit-signature header using HMAC-SHA256
- Supports both current and CloudEvents formats
- Prevents duplicate processing using event IDs
- Queues operations for async processing

---


## Database Schema

### Migration 025: Integration Credentials (`025_integration_credentials.sql`)

**Tables**:

#### `integration_credentials`
- **Purpose**: Store encrypted credentials for external platforms (WooCommerce, QuickBooks, Supabase)
- **Key Columns**:
  - `id` TEXT PRIMARY KEY
  - `tenant_id` TEXT NOT NULL
  - `platform` TEXT NOT NULL CHECK (platform IN ('woocommerce', 'quickbooks', 'supabase'))
  - `credentials_encrypted` TEXT NOT NULL - Encrypted JSON blob
    - QuickBooks: `{ client_id, client_secret, realm_id }`
  - `oauth_tokens_encrypted` TEXT - Encrypted JSON blob
    - QuickBooks: `{ access_token, refresh_token, expires_at }`
  - `realm_id` TEXT - QuickBooks realm ID
  - `is_active` BOOLEAN NOT NULL DEFAULT 1
  - `last_verified_at` TIMESTAMP
  - `verification_error` TEXT
  - `created_at`, `updated_at`, `created_by`, `updated_by`
- **Constraints**: UNIQUE(tenant_id, platform)
- **Requirements**: 10.1, 10.2, 10.5, 10.6


#### `integration_status`
- **Purpose**: Track connection health and sync statistics
- **Key Columns**:
  - `id` TEXT PRIMARY KEY
  - `credential_id` TEXT NOT NULL (FK to integration_credentials)
  - `tenant_id` TEXT NOT NULL
  - `platform` TEXT NOT NULL
  - `is_connected` BOOLEAN NOT NULL DEFAULT 0
  - `last_connection_check` TIMESTAMP
  - `last_successful_sync` TIMESTAMP
  - `last_sync_error` TEXT
  - `consecutive_failures` INTEGER NOT NULL DEFAULT 0
  - `total_syncs`, `successful_syncs`, `failed_syncs`, `entities_synced` INTEGER
  - `requests_today` INTEGER NOT NULL DEFAULT 0
  - `rate_limit_reset_at` TIMESTAMP
  - `is_rate_limited` BOOLEAN NOT NULL DEFAULT 0
  - `webhook_url`, `webhook_secret` TEXT
  - `webhook_last_received` TIMESTAMP
- **Constraints**: UNIQUE(credential_id)

#### `integration_field_mappings`
- **Purpose**: Define field mappings between POS and external platforms
- **Key Columns**:
  - `id` TEXT PRIMARY KEY
  - `tenant_id` TEXT NOT NULL
  - `platform` TEXT NOT NULL
  - `entity_type` TEXT NOT NULL (customer, product, invoice, payment, etc.)
  - `mapping_config` TEXT NOT NULL - JSON mapping configuration
  - `sync_direction` TEXT NOT NULL CHECK (sync_direction IN ('pos_to_platform', 'platform_to_pos', 'bidirectional'))
  - `is_active` BOOLEAN NOT NULL DEFAULT 1
- **Constraints**: UNIQUE(tenant_id, platform, entity_type)


#### `integration_sync_operations`
- **Purpose**: Track individual sync operations for debugging and audit
- **Key Columns**:
  - `id` TEXT PRIMARY KEY
  - `tenant_id` TEXT NOT NULL
  - `credential_id` TEXT NOT NULL (FK to integration_credentials)
  - `platform` TEXT NOT NULL
  - `operation_type` TEXT NOT NULL (create, update, delete, sync)
  - `entity_type` TEXT NOT NULL (customer, product, invoice, etc.)
  - `entity_id` TEXT - POS entity ID
  - `platform_entity_id` TEXT - External platform entity ID
  - `status` TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'skipped'))
  - `direction` TEXT NOT NULL CHECK (direction IN ('pos_to_platform', 'platform_to_pos'))
  - `request_payload` TEXT - JSON payload sent
  - `response_data` TEXT - JSON response received
  - `error_message`, `error_code` TEXT
  - `started_at`, `completed_at` TIMESTAMP
  - `duration_ms` INTEGER
  - `retry_count` INTEGER NOT NULL DEFAULT 0
  - `max_retries` INTEGER NOT NULL DEFAULT 3
  - `next_retry_at` TIMESTAMP

#### `integration_webhook_events`
- **Purpose**: Store incoming webhook events from external platforms
- **Key Columns**:
  - `id` TEXT PRIMARY KEY
  - `tenant_id` TEXT NOT NULL
  - `platform` TEXT NOT NULL
  - `event_type` TEXT NOT NULL
  - `event_id` TEXT - Platform's event ID
  - `entity_type`, `entity_id` TEXT
  - `payload` TEXT NOT NULL - Full webhook payload (JSON)
  - `signature` TEXT - HMAC signature for verification
  - `signature_verified` BOOLEAN NOT NULL DEFAULT 0
  - `status` TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed', 'ignored'))
  - `processed_at` TIMESTAMP
  - `error_message` TEXT
  - `received_at`, `created_at` TIMESTAMP
- **Constraints**: UNIQUE(platform, event_id) - Prevent duplicate event processing


### Migration 030: OAuth States (`030_oauth_states.sql`)

#### `oauth_states`
- **Purpose**: OAuth state storage for CSRF protection
- **Key Columns**:
  - `id` TEXT PRIMARY KEY
  - `tenant_id` TEXT NOT NULL
  - `platform` TEXT NOT NULL
  - `state` TEXT NOT NULL UNIQUE
  - `expires_at` TEXT NOT NULL
  - `created_at` TEXT NOT NULL DEFAULT (datetime('now'))
- **Indexes**: state, expires_at, tenant_id
- **Requirements**: 10.5 (security)
- **Notes**: Expired states should be cleaned up periodically

### Migration 032: Sync Logs (`032_sync_logs.sql`)

#### `sync_logs`
- **Purpose**: Comprehensive sync operation logging
- **Key Columns**:
  - `id` TEXT PRIMARY KEY
  - `tenant_id` TEXT NOT NULL
  - `sync_id` TEXT NOT NULL
  - `connector_id` TEXT NOT NULL
  - `entity_type` TEXT NOT NULL
  - `entity_id` TEXT NOT NULL
  - `operation` TEXT NOT NULL ('create', 'update', 'delete', 'fetch')
  - `result` TEXT NOT NULL ('success', 'warning', 'error')
  - `level` TEXT NOT NULL ('debug', 'info', 'warn', 'error')
  - `message` TEXT NOT NULL
  - `error_details` TEXT
  - `duration_ms` INTEGER
  - `metadata` TEXT - JSON with additional context
  - `created_at` TEXT NOT NULL DEFAULT (datetime('now'))
- **Indexes**: tenant_id, sync_id, connector_id, result, created_at, composite indexes
- **Requirements**: Task 14.1


### Migration 033: Webhook Configs (`033_webhook_configs.sql`)

#### `webhook_configs`
- **Purpose**: Store webhook configurations per tenant and platform
- **Key Columns**:
  - `id` TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))
  - `tenant_id` TEXT NOT NULL
  - `platform` TEXT NOT NULL ('woocommerce', 'quickbooks', 'supabase')
  - `event_type` TEXT - Optional: specific event type (e.g., 'order.created', 'invoice.updated')
  - `enabled` INTEGER NOT NULL DEFAULT 1 (1 = enabled, 0 = disabled)
  - `url` TEXT - Optional: custom webhook URL
  - `secret` TEXT NOT NULL - Webhook secret for signature validation (encrypted)
  - `created_at`, `updated_at` TEXT NOT NULL DEFAULT (datetime('now'))
- **Constraints**: UNIQUE(tenant_id, platform, event_type)
- **Indexes**: (tenant_id, platform), (tenant_id, platform, enabled) WHERE enabled = 1
- **Requirements**: Task 20.1

### Migration 038: Integration Sync State (`038_integration_sync_state.sql`)

#### `sync_state` (Enhanced)
- **Purpose**: Multi-page fetching, progress tracking, resume capability
- **Added Columns**:
  - `id` TEXT
  - `connector_id` TEXT
  - `sync_mode` TEXT ('full' or 'incremental')
  - `status` TEXT ('pending', 'running', 'completed', 'partial', 'failed', 'cancelled')
  - `dry_run` BOOLEAN DEFAULT 0
  - `records_processed`, `records_created`, `records_updated`, `records_failed` INTEGER DEFAULT 0
  - `resume_checkpoint` TEXT - JSON with last processed entity info
  - `started_at`, `completed_at` TEXT
- **Indexes**: id, connector_id, status, (tenant_id, connector_id), (tenant_id, status)
- **Requirements**: Multi-page fetching, progress tracking, resume capability

---


## OAuth Flow

### Implementation Location
- **Connector**: `backend/rust/src/connectors/quickbooks/oauth.rs`
- **Handler**: OAuth endpoints in integration handlers
- **Database**: `oauth_states` table (migration 030), `integration_credentials` table (migration 025)

### OAuth 2.0 Authorization Code Flow

#### Step 1: Generate Authorization URL
```rust
QuickBooksOAuth::get_authorization_url(state: &str) -> String
```
- **URL**: `https://appcenter.intuit.com/connect/oauth2`
- **Parameters**: client_id, scope, redirect_uri, response_type=code, state (CSRF token)
- **Scope**: `com.intuit.quickbooks.accounting`
- **State**: Stored in `oauth_states` table with expiry (CSRF protection)

#### Step 2: Exchange Authorization Code for Tokens
```rust
QuickBooksOAuth::exchange_code_for_tokens(code: &str) -> Result<QuickBooksTokens>
```
- **URL**: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
- **Method**: POST with Basic Auth (client_id:client_secret)
- **Parameters**: grant_type=authorization_code, code, redirect_uri
- **Response**: access_token, refresh_token, expires_in
- **Storage**: Encrypted in `integration_credentials.oauth_tokens_encrypted`


#### Step 3: Refresh Access Token
```rust
QuickBooksOAuth::refresh_access_token(refresh_token: &str) -> Result<QuickBooksTokens>
```
- **URL**: `https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer`
- **Method**: POST with Basic Auth (client_id:client_secret)
- **Parameters**: grant_type=refresh_token, refresh_token
- **Response**: new access_token, optionally new refresh_token (token rotation), expires_in
- **Trigger**: Auto-refresh 5 minutes before expiry (`QuickBooksOAuth::needs_refresh()`)
- **Storage**: Updated in `integration_credentials.oauth_tokens_encrypted`

#### Step 4: Revoke Token
```rust
QuickBooksOAuth::revoke_token(token: &str) -> Result<()>
```
- **URL**: `https://developer.api.intuit.com/v2/oauth2/tokens/revoke`
- **Method**: POST with Basic Auth (client_id:client_secret)
- **Parameters**: token
- **Use Case**: User disconnects QuickBooks integration

### Token Management
- **Encryption**: AES-256-GCM (stored in `integration_credentials.oauth_tokens_encrypted`)
- **Expiry**: Tokens expire after ~1 hour (3600 seconds)
- **Refresh Threshold**: 5 minutes before expiry (300 seconds)
- **Refresh Token Rotation**: Intuit may return new refresh token during refresh
- **CSRF Protection**: State token stored in `oauth_states` table with expiry

---


## Sync Jobs & Flows

### WooCommerce to QuickBooks Flow

**Location**: `backend/rust/src/flows/woo_to_qbo.rs`

**Purpose**: Sync WooCommerce orders to QuickBooks (Invoice or SalesReceipt)

**Key Type**: `WooToQboFlow`

**Sync Steps**:
1. **Fetch WooCommerce order** - `woo_client.get_order(order_id)`
2. **Transform to internal format** - `WooCommerceTransformers::order_to_internal()`
3. **Resolve customer** - Create if missing, lookup by email
4. **Resolve items** - Create if missing, lookup by SKU
5. **Create Invoice or SalesReceipt** - Based on payment status:
   - `PaymentStatus::Paid` → SalesReceipt (paid-in-full)
   - Other statuses → Invoice (unpaid/partial)
6. **Store ID mapping** - Map WooCommerce order ID to QuickBooks entity ID
7. **Update sync state** - Record sync operation in `sync_logs`

**Key Methods**:
- `sync_order(tenant_id, order_id, dry_run)` - Main sync orchestration
- `resolve_customer(tenant_id, order)` - Ensure customer exists in QuickBooks
- `resolve_items(tenant_id, order)` - Ensure items exist in QuickBooks
- `create_invoice(tenant_id, order)` - Create QuickBooks invoice
- `create_sales_receipt(tenant_id, order)` - Create QuickBooks sales receipt

**Requirements**: 2.2, 2.6, 11.4

**Dependencies**:
- `WooCommerceClient` - Fetch orders from WooCommerce
- `QuickBooksClient` - Create entities in QuickBooks
- `IdMapper` - Store platform ID mappings
- `TransformerConfig` - Transformation configuration


### Sync Orchestration

**Location**: `backend/rust/src/services/sync_orchestrator.rs` (referenced in task 0.1)

**Purpose**: Background job orchestration for sync operations

**Key Responsibilities**:
- Queue management for sync operations
- Retry logic with exponential backoff
- Error handling and logging
- Rate limit management
- Webhook event processing

**Integration with QuickBooks**:
- Processes queued sync operations from `integration_sync_operations` table
- Handles webhook events from `integration_webhook_events` table
- Updates sync state in `sync_state` table
- Logs operations to `sync_logs` table

### Token Refresh Service

**Location**: `backend/rust/src/services/token_refresh_service.rs` (referenced in task 0.1)

**Purpose**: Automatic OAuth token refresh

**Key Responsibilities**:
- Monitor token expiry (check every 5 minutes)
- Auto-refresh tokens before expiry (5 minute threshold)
- Update encrypted tokens in `integration_credentials` table
- Handle refresh failures (log and alert)

**Integration with QuickBooks**:
- Uses `QuickBooksOAuth::needs_refresh()` to check expiry
- Uses `QuickBooksOAuth::refresh_access_token()` to refresh
- Updates `integration_credentials.oauth_tokens_encrypted`
- Logs refresh operations to `sync_logs`

---


## Webhook Handling

### Current Format (Active)

**Handler**: `backend/rust/src/handlers/webhooks.rs::handle_quickbooks_webhook()`

**Endpoint**: `POST /webhooks/quickbooks`

**Signature Validation**:
- **Header**: `intuit-signature`
- **Algorithm**: HMAC-SHA256
- **Secret**: Stored in `webhook_configs.secret` (encrypted)
- **Function**: `validate_qb_signature(payload, signature_header, verifier_token)`

**Payload Structure**:
```json
{
  "eventNotifications": [{
    "realmId": "123456789",
    "dataChangeEvent": {
      "entities": [{
        "name": "Customer",
        "id": "1",
        "operation": "Create",
        "lastUpdated": "2024-01-01T12:00:00Z"
      }]
    }
  }]
}
```

**Processing Flow**:
1. Validate signature using HMAC-SHA256
2. Parse webhook payload
3. Check for duplicate events (using `integration_webhook_events` table)
4. Queue sync operations (insert into `integration_sync_operations`)
5. Record webhook event (insert into `integration_webhook_events`)
6. Return 200 OK

**Supported Entities**: Customer, Invoice, Item, Payment, SalesReceipt, CreditMemo, RefundReceipt, Vendor, Bill, Purchase, VendorCredit

**Supported Operations**: Create, Update, Delete, Merge, Void


### CloudEvents Format (Required by May 15, 2026)

**Handler**: `backend/rust/src/handlers/webhooks.rs::handle_quickbooks_cloudevents()`

**Endpoint**: `POST /webhooks/quickbooks/cloudevents`

**Auto-Detection**: Handler automatically detects CloudEvents format (checks for `specversion` field)

**Signature Validation**: Same HMAC-SHA256 as current format

**Payload Structure**:
```json
{
  "specversion": "1.0",
  "type": "qbo.invoice.created.v1",
  "source": "https://quickbooks.api.intuit.com",
  "id": "unique-event-id",
  "time": "2024-01-01T12:00:00Z",
  "datacontenttype": "application/json",
  "intuitaccountid": "123456789",
  "intuitentityid": "42",
  "data": { /* entity-specific data */ }
}
```

**Event Type Format**: `qbo.{entity}.{operation}.v{version}`
- Examples: `qbo.invoice.created.v1`, `qbo.customer.updated.v1`, `qbo.item.deleted.v1`

**Processing Flow**: Same as current format, but with CloudEvents parsing

**Migration Strategy**:
- Support both formats simultaneously
- Auto-detect format using `is_cloudevents_format()`
- Fallback to current format if not CloudEvents
- Migrate to CloudEvents-only after May 15, 2026

---


## Error Handling

### Error Classification

**Location**: `backend/rust/src/connectors/quickbooks/errors.rs`

**Error Types**:
1. **Authentication** (401, 403) - Token expired or invalid credentials
2. **Validation** (400) - Business rule violations, invalid data
3. **RateLimit** (429) - API rate limit exceeded
4. **Conflict** - Stale object (5010), duplicate name (6240)
5. **Network** - Timeout, connection refused
6. **Internal** (500, 503) - QuickBooks server errors

### QuickBooks-Specific Error Codes

#### Error 5010: Stale Object
- **Cause**: SyncToken mismatch (entity was modified by another process)
- **Strategy**: `RefetchAndRetry` - Fetch current entity for latest SyncToken, then retry
- **Retryable**: Yes
- **Action**: `QBErrorHandler::handle_error()` returns `ErrorHandlingStrategy::RefetchAndRetry`

#### Error 6240: Duplicate Name
- **Cause**: Entity with same DisplayName already exists
- **Strategy**: `Skip` - Log warning, skip creation, or rename with suffix (e.g., "Name (2)")
- **Retryable**: No (requires manual intervention)
- **Action**: `QBErrorHandler::handle_error()` returns `ErrorHandlingStrategy::Skip`

#### Error 6000: Business Validation Error
- **Cause**: Business rule violation (e.g., account doesn't exist, invalid tax code)
- **Strategy**: `Fail` - Log error for manual review
- **Retryable**: No (requires data fix)
- **Action**: `QBErrorHandler::handle_error()` returns `ErrorHandlingStrategy::Fail`


### Retry Strategies

#### Rate Limit (429)
- **Strategy**: `RetryAfter { seconds }` - Wait for specified duration (from Retry-After header or default 60s)
- **Retryable**: Yes
- **Backoff**: Use Retry-After header value or default 60 seconds
- **Max Retries**: 3 (configurable in `integration_sync_operations.max_retries`)

#### Network Errors
- **Strategy**: `RetryWithBackoff` - Exponential backoff (1s, 2s, 4s, 8s, ...)
- **Retryable**: Yes
- **Max Retries**: 3

#### Internal Server Errors (500, 503)
- **Strategy**: `RetryWithBackoff` - Exponential backoff
- **Retryable**: Yes
- **Max Retries**: 3

### Error Logging

**Function**: `QBErrorHandler::log_error(error, entity_type, entity_id)`

**Log Levels**:
- **ERROR**: Authentication, Validation, Internal errors
- **WARN**: Rate limit, Conflict, Network errors

**Log Destination**: `sync_logs` table with:
- `result` = 'error' or 'warning'
- `level` = 'error' or 'warn'
- `message` = Error message
- `error_details` = Full error details (JSON)

**Monitoring**: Errors logged to `sync_logs` can be queried for alerting and monitoring

---


## Data Transformers

### Transformation Architecture

**Location**: `backend/rust/src/connectors/quickbooks/transformers.rs`

**Purpose**: Transform internal canonical models to QuickBooks entities

**Key Struct**: `QuickBooksTransformers` (static methods)

### Transformation Methods

#### 1. Customer Transformation
```rust
QuickBooksTransformers::internal_customer_to_qbo(internal: &InternalCustomer) -> Result<QBCustomer>
```
- **Input**: `InternalCustomer` (canonical POS model)
- **Output**: `QBCustomer` (QuickBooks API format)
- **Key Transformations**:
  - DisplayName: Uses `display_name` or falls back to `full_name()` (must be unique)
  - Email: Maps to `PrimaryEmailAddr.Address`
  - Phone: Maps to `PrimaryPhone.FreeFormNumber`
  - Addresses: Transforms `billing_address` → `BillAddr`, `shipping_address` → `ShipAddr`
  - Address fields: Line1, Line2, City, CountrySubDivisionCode (state), PostalCode, Country
- **Requirements**: 2.1, 2.4

#### 2. Product Transformation
```rust
QuickBooksTransformers::internal_product_to_qbo(internal: &InternalProduct, income_account_id: &str) -> Result<QBItem>
```
- **Input**: `InternalProduct` (canonical POS model), income account ID
- **Output**: `QBItem` (QuickBooks API format)
- **Key Transformations**:
  - Name: Product name
  - Sku: Product SKU
  - Type: "Inventory", "NonInventory", or "Service"
  - UnitPrice: Selling price
  - PurchaseCost: Cost price
  - IncomeAccountRef: Required account reference
  - TrackQtyOnHand: Enable inventory tracking
- **Requirements**: 2.1


#### 3. Order Transformation
```rust
QuickBooksTransformers::internal_order_to_qbo(
    internal: &InternalOrder,
    customer_qb_id: &str,
    config: &TransformerConfig
) -> Result<QBInvoice>
```
- **Input**: `InternalOrder` (canonical POS model), QuickBooks customer ID, transformer config
- **Output**: `QBInvoice` (QuickBooks API format)
- **Key Transformations**:
  - CustomerRef: Maps to QuickBooks customer ID
  - Line items: Transforms order lines to `SalesItemLineDetail`
  - Shipping: Adds shipping line using `config.shipping_item_id`
  - Tax: Maps tax classes using `config.tax_code_mappings`
  - Custom fields: Maps up to 3 custom fields using `config.custom_field_mappings`
  - Payment terms: Uses `config.default_payment_terms_days` for DueDate calculation
  - Addresses: Transforms billing and shipping addresses
- **Requirements**: 2.1, 2.2, 2.3, 2.4, 2.5, 3.5, 11.4

### Transformer Configuration

**Type**: `TransformerConfig`

**Fields**:
- `shipping_item_id: String` - QuickBooks item ID for shipping charges (configurable per tenant)
- `default_payment_terms_days: i32` - Default payment terms (e.g., 30 for Net 30)
- `custom_field_mappings: Vec<CustomFieldMapping>` - Custom field mappings (max 3 per QBO API limitation)
- `tax_code_mappings: HashMap<String, String>` - Tax class → QBO tax code ID mappings
- `default_tax_code_id: Option<String>` - Fallback tax code if no mapping found

**Custom Field Mapping**:
- `definition_id: String` - QuickBooks custom field definition ID
- `name: String` - Field name
- `source_field: String` - Source field path (e.g., "order_number", "customer.email")

**Storage**: Configuration stored per tenant (likely in tenant settings or database)

---


## Summary: Files to Extract for Phase 8

### Connector Files (15 files)
All files in `backend/rust/src/connectors/quickbooks/`:
1. `mod.rs` - Module declaration
2. `client.rs` - API client
3. `oauth.rs` - OAuth 2.0 flow
4. `errors.rs` - Error handling
5. `customer.rs` - Customer operations
6. `invoice.rs` - Invoice operations
7. `sales_receipt.rs` - Sales receipt operations
8. `payment.rs` - Payment operations
9. `refund.rs` - Refund operations (CreditMemo, RefundReceipt)
10. `vendor.rs` - Vendor operations
11. `bill.rs` - Bill operations
12. `item.rs` - Item operations
13. `webhooks.rs` - Webhook handling (current format)
14. `cloudevents.rs` - Webhook handling (CloudEvents format)
15. `transformers.rs` - Data transformers

### Handler Files (8 files)
All files in `backend/rust/src/handlers/`:
1. `quickbooks.rs` - Core operations (lookup, test connection)
2. `quickbooks_crud.rs` - Customer & item CRUD
3. `quickbooks_invoice.rs` - Invoice operations
4. `quickbooks_sales.rs` - Sales receipt & payment operations
5. `quickbooks_refund.rs` - Refund operations
6. `quickbooks_vendor.rs` - Vendor operations
7. `quickbooks_bill.rs` - Bill operations
8. `quickbooks_transform.rs` - Transformation endpoints
9. `webhooks.rs` - Webhook handlers (partial - QuickBooks-specific functions only)


### Flow Files (1 file)
1. `backend/rust/src/flows/woo_to_qbo.rs` - WooCommerce to QuickBooks sync flow

### Service Files (2 files)
1. `backend/rust/src/services/sync_orchestrator.rs` - Sync job orchestration
2. `backend/rust/src/services/token_refresh_service.rs` - OAuth token refresh

### Database Migrations (5 files)
1. `backend/rust/migrations/025_integration_credentials.sql` - Credentials storage
2. `backend/rust/migrations/030_oauth_states.sql` - OAuth state storage
3. `backend/rust/migrations/032_sync_logs.sql` - Sync logging
4. `backend/rust/migrations/033_webhook_configs.sql` - Webhook configuration
5. `backend/rust/migrations/038_integration_sync_state.sql` - Sync state tracking

**Note**: These migrations are shared with other integrations (WooCommerce, Supabase). Only QuickBooks-specific data needs to be migrated.

### Total Files to Extract
- **Connector files**: 15
- **Handler files**: 8 (+ partial webhooks.rs)
- **Flow files**: 1
- **Service files**: 2
- **Migrations**: 5 (shared, QuickBooks data only)
- **Total**: ~26 files + database data

---


## Extraction Strategy for Phase 8

### Recommended Approach: Sidecar Service

**Rationale**: Avoids Rust dynamic library complexity across Windows/Linux/Docker

**Architecture**:
```
┌─────────────────────┐         HTTP/gRPC          ┌─────────────────────┐
│  EasySale Server    │ ◄────────────────────────► │  QuickBooks Sync    │
│  (OSS Build)        │    Loopback (127.0.0.1)    │  Sidecar Service    │
│                     │                             │  (Private)          │
│  - POS Core         │                             │  - OAuth            │
│  - Accounting       │                             │  - API Client       │
│  - Export Batches   │                             │  - Transformers     │
│  - CSV Export       │                             │  - Webhooks         │
│                     │                             │  - Sync Jobs        │
└─────────────────────┘                             └─────────────────────┘
         │                                                    │
         │                                                    │
         └────────────────────┬───────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   SQLite Database  │
                    │   (Shared)         │
                    └────────────────────┘
```

**Communication Protocol**:
- **Healthcheck**: `GET http://127.0.0.1:8924/health`
- **Sync Transaction**: `POST http://127.0.0.1:8924/sync/transaction`
- **OAuth Refresh**: `POST http://127.0.0.1:8924/oauth/refresh`

**Capability Detection**:
```rust
fn detect_sync_runtime() -> bool {
    // Ping sidecar healthcheck
    reqwest::get("http://127.0.0.1:8924/health")
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}
```


### Extraction Steps (Phase 8)

#### 8.1 Design Sync Add-On Architecture
- Choose sidecar service approach
- Define HTTP API contract (healthcheck, sync, oauth)
- Document communication protocol

#### 8.2 Extract QuickBooks Code to sync/ Directory
- Create `sync/` directory at repo root (private, not in OSS)
- Move connector files: `backend/rust/src/connectors/quickbooks/` → `sync/src/connectors/quickbooks/`
- Move handler files: `backend/rust/src/handlers/quickbooks*.rs` → `sync/src/handlers/`
- Move flow files: `backend/rust/src/flows/woo_to_qbo.rs` → `sync/src/flows/`
- Move service files: `backend/rust/src/services/sync_orchestrator.rs` → `sync/src/services/`
- Move service files: `backend/rust/src/services/token_refresh_service.rs` → `sync/src/services/`
- Create `sync/Cargo.toml` for sidecar service
- Create `sync/src/main.rs` with HTTP server (Actix-web)

#### 8.3 Implement OAuth Token Management in Sidecar
- Move token refresh logic to sidecar
- Use existing `oauth_states` table (migration 030)
- Use existing `integration_credentials` table (migration 025) with AES-GCM encryption
- Implement auto-refresh (check token expiry before each API call)

#### 8.4 Implement Sync Trigger in Core Server
- Add hook to transaction finalization handler
- Check if sync sidecar is healthy (ping healthcheck)
- Send accounting snapshot to sidecar
- Don't block transaction if sync fails (log error)


#### 8.5 Implement Sync Logging in Sidecar
- Use existing `sync_logs` table (migration 032)
- Log all sync operations (create, update, void)
- Log results (success, failure, skipped)
- Include error details for failures

#### 8.6 Implement Webhook Handling in Sidecar
- Use existing `webhook_configs` table (migration 033)
- Expose `POST /webhooks/quickbooks` endpoint in sidecar
- Validate Intuit signature (HMAC-SHA256)
- Parse CloudEvents format (see `cloudevents.rs`)
- Update local records, trigger re-sync if needed

#### 8.7-8.8 Write Integration Tests
- Test sync trigger on finalization (Property 9)
- Test token refresh (Property 10)
- Use wiremock to mock QuickBooks API

#### 8.9 Verify Sync Code Not in Lite Build
- Build with `--no-default-features`
- Check binary for QuickBooks symbols: `nm target/release/EasySale-server | grep -i "qbo\|quickbooks\|oauth"`
- Expected: Empty output (no QBO symbols)
- Verify `sync/` directory can be deleted and OSS still builds

---


## API Endpoint Summary

### Customer Operations
- `POST /api/quickbooks/customers/lookup` - Lookup by email/name
- `POST /api/quickbooks/customers/get` - Get by ID
- `PUT /api/quickbooks/customers/update` - Update customer
- `DELETE /api/quickbooks/customers/{tenant_id}/{customer_id}` - Deactivate
- `POST /api/quickbooks/customers/query-by-name` - Query by name

### Item Operations
- `POST /api/quickbooks/items/lookup` - Lookup by SKU/name
- `POST /api/quickbooks/items/get` - Get by ID
- `PUT /api/quickbooks/items/update` - Update item
- `DELETE /api/quickbooks/items/{tenant_id}/{item_id}` - Deactivate
- `POST /api/quickbooks/items/query-by-name` - Query by name

### Invoice Operations
- `POST /api/quickbooks/invoices/get` - Get by ID
- `POST /api/quickbooks/invoices/query` - Query by DocNumber
- `POST /api/quickbooks/invoices/create` - Create invoice
- `PUT /api/quickbooks/invoices/update` - Update invoice
- `DELETE /api/quickbooks/invoices/delete` - Delete invoice

### Sales Receipt Operations
- `POST /api/quickbooks/sales-receipts/get` - Get by ID
- `POST /api/quickbooks/sales-receipts/create` - Create sales receipt
- `PUT /api/quickbooks/sales-receipts/update` - Update sales receipt
- `POST /api/quickbooks/sales-receipts/void` - Void sales receipt


### Payment Operations
- `POST /api/quickbooks/payments/get` - Get by ID
- `POST /api/quickbooks/payments/query` - Query by customer
- `POST /api/quickbooks/payments/create` - Create payment
- `PUT /api/quickbooks/payments/update` - Update payment
- `POST /api/quickbooks/payments/delete` - Delete payment

### Refund Operations
- `POST /api/quickbooks/credit-memos/get` - Get credit memo by ID
- `POST /api/quickbooks/credit-memos/create` - Create credit memo
- `PUT /api/quickbooks/credit-memos/update` - Update credit memo
- `POST /api/quickbooks/refund-receipts/get` - Get refund receipt by ID
- `POST /api/quickbooks/refund-receipts/create` - Create refund receipt
- `PUT /api/quickbooks/refund-receipts/update` - Update refund receipt
- `POST /api/quickbooks/refund-receipts/void` - Void refund receipt

### Vendor Operations
- `POST /api/quickbooks/vendors/get` - Get by ID
- `POST /api/quickbooks/vendors/query` - Query by name
- `POST /api/quickbooks/vendors/create` - Create vendor
- `PUT /api/quickbooks/vendors/update` - Update vendor
- `POST /api/quickbooks/vendors/query-by-email` - Query by email
- `POST /api/quickbooks/vendors/deactivate` - Deactivate vendor
- `POST /api/quickbooks/vendors/reactivate` - Reactivate vendor

### Bill Operations
- `POST /api/quickbooks/bills/get` - Get by ID
- `POST /api/quickbooks/bills/query-by-vendor` - Query by vendor
- `POST /api/quickbooks/bills/query-by-doc-number` - Query by DocNumber
- `POST /api/quickbooks/bills/create` - Create bill
- `PUT /api/quickbooks/bills/update` - Update bill
- `DELETE /api/quickbooks/bills/delete` - Delete bill


### Transformation Operations
- `POST /api/quickbooks/transform/customer` - Transform internal customer to QBO
- `POST /api/quickbooks/transform/product` - Transform internal product to QBO
- `POST /api/quickbooks/transform/order` - Transform internal order to QBO
- `POST /api/quickbooks/transform/check-transaction-type` - Check Invoice vs SalesReceipt

### Webhook Operations
- `POST /webhooks/quickbooks` - Handle QuickBooks webhook (current format)
- `POST /webhooks/quickbooks/cloudevents` - Handle QuickBooks webhook (CloudEvents format)
- `GET /webhooks/config` - Get webhook configuration
- `PUT /webhooks/config` - Update webhook configuration

### Connection Testing
- `GET /api/quickbooks/test/{tenant_id}` - Test QuickBooks connection

**Total Endpoints**: 50+ QuickBooks-specific API endpoints

---

## Next Steps

This integration map provides the complete picture of QuickBooks integration in the current monolithic backend. Use this document as the authoritative reference for:

1. **Phase 8 (QuickBooks Sync Add-On)**: Extract all listed files to `sync/` directory
2. **Sidecar Implementation**: Design HTTP API contract based on current endpoints
3. **Testing**: Verify OSS builds work without any QuickBooks code
4. **Migration**: Move QuickBooks-specific data from shared tables to sidecar

**Validation**: Task 0.1 complete ✓

