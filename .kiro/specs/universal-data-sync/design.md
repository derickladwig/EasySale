# Design Document: Universal Data Synchronization

## Overview

This design document describes the architecture and implementation approach for a universal data synchronization feature that connects WooCommerce, Supabase, and QuickBooks Online to a POS system. The solution uses a hub-and-spoke architecture with modular connectors, a central orchestration engine, and a configuration-driven approach to field mapping and sync control.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         POS Application                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐          │
│  │  WooCommerce │    │   Supabase   │    │  QuickBooks  │          │
│  │  Connector   │    │  Connector   │    │  Connector   │          │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘          │
│         │                   │                   │                   │
│         └───────────────────┼───────────────────┘                   │
│                             │                                        │
│                    ┌────────▼────────┐                              │
│                    │   Sync Engine   │                              │
│                    │  (Orchestrator) │                              │
│                    └────────┬────────┘                              │
│                             │                                        │
│         ┌───────────────────┼───────────────────┐                   │
│         │                   │                   │                   │
│  ┌──────▼──────┐    ┌──────▼──────┐    ┌──────▼──────┐            │
│  │ Transformer │    │   Mapper    │    │   Logger    │            │
│  └─────────────┘    └─────────────┘    └─────────────┘            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| Sync Engine | Orchestrates sync operations, manages scheduling, handles retries |
| Connectors | Platform-specific API communication and authentication |
| Transformer | Converts data between source and target formats |
| Mapper | Applies field mapping configurations |
| Logger | Records all operations for audit and debugging |

## Components and Interfaces

### 1. Sync Engine

```typescript
interface SyncEngine {
  // Core operations
  startSync(connectorId: string, options: SyncOptions): Promise<SyncResult>;
  stopSync(syncId: string): Promise<void>;
  getSyncStatus(syncId: string): Promise<SyncStatus>;
  
  // Scheduling
  scheduleSync(config: ScheduleConfig): Promise<string>;
  cancelSchedule(scheduleId: string): Promise<void>;
  
  // Manual controls
  syncEntity(connectorId: string, entityType: string, entityId: string): Promise<SyncResult>;
  resyncFailed(connectorId: string): Promise<SyncResult>;
  
  // Configuration
  setMapping(connectorId: string, mapping: FieldMapping[]): Promise<void>;
  setFilters(connectorId: string, filters: SyncFilter[]): Promise<void>;
}

interface SyncOptions {
  mode: 'full' | 'incremental';
  dryRun: boolean;
  entityTypes?: string[];
  dateRange?: { start: Date; end: Date };
}

interface SyncResult {
  syncId: string;
  status: 'success' | 'partial' | 'failed';
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: SyncError[];
  duration: number;
}
```

### 2. Base Connector Interface

```typescript
interface Connector {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  
  // Lifecycle
  connect(credentials: ConnectorCredentials): Promise<void>;
  disconnect(): Promise<void>;
  testConnection(): Promise<boolean>;
  
  // Data operations
  fetchEntities(entityType: string, options: FetchOptions): Promise<Entity[]>;
  createEntity(entityType: string, data: EntityData): Promise<Entity>;
  updateEntity(entityType: string, id: string, data: EntityData): Promise<Entity>;
  deleteEntity(entityType: string, id: string): Promise<void>;
  
  // Webhooks
  registerWebhook(eventType: string, callbackUrl: string): Promise<string>;
  unregisterWebhook(webhookId: string): Promise<void>;
  handleWebhook(payload: WebhookPayload): Promise<void>;
}

interface FetchOptions {
  since?: Date;
  limit?: number;
  offset?: number;
  filters?: Record<string, unknown>;
}
```

### 3. WooCommerce Connector

Based on [WooCommerce REST API v3](https://woocommerce.github.io/woocommerce-rest-api-docs/):

```typescript
interface WooCommerceConnector extends Connector {
  // Authentication: Consumer Key + Secret (Basic Auth or OAuth 1.0a)
  credentials: {
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
  };
  
  // Supported entities
  entityTypes: ['products', 'orders', 'customers', 'refunds', 'inventory'];
  
  // Webhook events
  webhookEvents: [
    'order.created',
    'order.updated', 
    'order.deleted',
    'product.created',
    'product.updated',
    'customer.created',
    'customer.updated'
  ];
}

// WooCommerce Order → Internal Order mapping
interface WooOrderMapping {
  source: {
    id: number;
    number: string;
    status: string;
    date_created: string;
    billing: WooBillingAddress;
    shipping: WooShippingAddress;
    line_items: WooLineItem[];
    tax_lines: WooTaxLine[];
    shipping_lines: WooShippingLine[];
    total: string;
    customer_id: number;
  };
  target: InternalOrder;
}
```

### 4. QuickBooks Online Connector

Based on [QuickBooks Online API](https://developer.intuit.com/app/developer/qbo/docs/develop):

```typescript
interface QuickBooksConnector extends Connector {
  // OAuth 2.0 Authentication
  credentials: {
    clientId: string;
    clientSecret: string;
    accessToken: string;
    refreshToken: string;
    realmId: string;  // Company ID
    tokenExpiry: Date;
  };
  
  // API Configuration (required from Aug 1, 2025)
  apiVersion: {
    minorVersion: 75;  // Required minor version
    baseUrl: 'https://quickbooks.api.intuit.com/v3/company';
  };
  
  // Supported entities
  entityTypes: ['Customer', 'Item', 'Invoice', 'Payment', 'CreditMemo', 'RefundReceipt'];
}

// QuickBooks Invoice structure per API docs
interface QBOInvoice {
  Id?: string;           // Read-only, assigned by QBO
  SyncToken?: string;    // Required for updates
  DocNumber?: string;    // Invoice number (map from order number)
  TxnDate?: string;      // Transaction date (YYYY-MM-DD)
  
  // Required: Customer reference
  CustomerRef: {
    value: string;       // Customer ID
    name?: string;       // Customer display name
  };
  
  // Required: Line items
  Line: QBOLineItem[];
  
  // Optional fields
  BillAddr?: QBOAddress;
  ShipAddr?: QBOAddress;
  BillEmail?: { Address: string };
  DueDate?: string;
  
  // Totals (read-only, calculated by QBO)
  TotalAmt?: number;
  Balance?: number;
}

interface QBOLineItem {
  Id?: string;
  LineNum?: number;
  Description?: string;
  Amount: number;        // Line total (Qty × UnitPrice)
  DetailType: 'SalesItemLineDetail' | 'DiscountLineDetail' | 'SubTotalLineDetail';
  
  SalesItemLineDetail?: {
    ItemRef: {
      value: string;     // Item ID
      name?: string;     // Item name
    };
    UnitPrice?: number;
    Qty?: number;
    TaxCodeRef?: {
      value: string;     // Tax code ID
    };
  };
}

// QuickBooks Customer structure
interface QBOCustomer {
  Id?: string;
  SyncToken?: string;
  DisplayName: string;   // Required, must be unique
  GivenName?: string;
  FamilyName?: string;
  CompanyName?: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: QBOAddress;
  ShipAddr?: QBOAddress;
}

// QuickBooks Item structure
interface QBOItem {
  Id?: string;
  SyncToken?: string;
  Name: string;          // Required, max 100 chars
  Sku?: string;          // For matching with e-commerce SKUs
  Type: 'Inventory' | 'NonInventory' | 'Service';
  IncomeAccountRef: {
    value: string;       // Account ID for sales
  };
  UnitPrice?: number;
  QtyOnHand?: number;    // For Inventory type
  TrackQtyOnHand?: boolean;
}

// QuickBooks Payment structure
interface QBOPayment {
  Id?: string;
  SyncToken?: string;
  TotalAmt: number;
  CustomerRef: {
    value: string;
  };
  Line: {
    Amount: number;
    LinkedTxn: {
      TxnId: string;     // Invoice ID
      TxnType: 'Invoice';
    }[];
  }[];
}
```

### 5. Supabase Connector

Based on [Supabase Documentation](https://supabase.com/docs):

```typescript
interface SupabaseConnector extends Connector {
  credentials: {
    projectUrl: string;
    anonKey: string;      // For client-side (limited)
    serviceRoleKey: string; // For server-side (full access)
  };
  
  // Database schema
  tables: {
    orders: OrderTable;
    order_lines: OrderLineTable;
    products: ProductTable;
    customers: CustomerTable;
    invoices: InvoiceTable;
    sync_logs: SyncLogTable;
    id_mappings: IdMappingTable;
  };
}

// Supabase table schemas
interface OrderTable {
  id: string;              // UUID primary key
  source: string;          // 'woocommerce' | 'manual'
  source_id: string;       // Original ID from source
  order_number: string;
  status: string;
  customer_id: string;     // FK to customers
  billing_address: Json;
  shipping_address: Json;
  subtotal: number;
  tax_total: number;
  shipping_total: number;
  discount_total: number;
  total: number;
  currency: string;
  raw_data: Json;          // Original payload
  created_at: string;
  updated_at: string;
  synced_at: string;
}

interface IdMappingTable {
  id: string;
  source_system: string;   // 'woocommerce' | 'quickbooks'
  source_entity: string;   // 'order' | 'customer' | 'product'
  source_id: string;
  target_system: string;
  target_entity: string;
  target_id: string;
  created_at: string;
}
```

## Data Models

### Internal Canonical Models

```typescript
// Canonical Order (internal representation)
interface InternalOrder {
  id: string;
  externalIds: {
    woocommerce?: string;
    quickbooks?: string;
  };
  orderNumber: string;
  status: OrderStatus;
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    company?: string;
  };
  billingAddress: Address;
  shippingAddress: Address;
  lineItems: LineItem[];
  taxLines: TaxLine[];
  shippingLines: ShippingLine[];
  discounts: Discount[];
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  discountTotal: number;
  total: number;
  currency: string;
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'partial';
  createdAt: Date;
  updatedAt: Date;
}

interface LineItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxClass?: string;
}

// Canonical Customer
interface InternalCustomer {
  id: string;
  externalIds: {
    woocommerce?: string;
    quickbooks?: string;
  };
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  company?: string;
  phone?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  createdAt: Date;
  updatedAt: Date;
}

// Canonical Product
interface InternalProduct {
  id: string;
  externalIds: {
    woocommerce?: string;
    quickbooks?: string;
  };
  sku: string;
  name: string;
  description?: string;
  type: 'simple' | 'variable' | 'service';
  price: number;
  costPrice?: number;
  taxable: boolean;
  trackInventory: boolean;
  stockQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Field Mapping Configuration

```typescript
interface FieldMapping {
  id: string;
  sourceConnector: string;
  targetConnector: string;
  entityType: string;
  mappings: FieldMap[];
  transformations?: Transformation[];
}

interface FieldMap {
  sourceField: string;     // Dot notation: "billing.email"
  targetField: string;     // Dot notation: "CustomerRef.value"
  required: boolean;
  defaultValue?: unknown;
  transform?: string;      // Transform function name
}

interface Transformation {
  name: string;
  type: 'concat' | 'split' | 'format' | 'lookup' | 'custom';
  config: Record<string, unknown>;
}

// Default WooCommerce → QuickBooks Invoice mapping
const defaultWooToQBOMapping: FieldMapping = {
  id: 'woo-to-qbo-invoice',
  sourceConnector: 'woocommerce',
  targetConnector: 'quickbooks',
  entityType: 'order-to-invoice',
  mappings: [
    { sourceField: 'number', targetField: 'DocNumber', required: false },
    { sourceField: 'date_created', targetField: 'TxnDate', required: true, transform: 'dateFormat' },
    { sourceField: 'customer_id', targetField: 'CustomerRef.value', required: true, transform: 'lookupQBOCustomer' },
    { sourceField: 'billing.email', targetField: 'BillEmail.Address', required: false },
    { sourceField: 'line_items', targetField: 'Line', required: true, transform: 'mapLineItems' },
  ]
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do.*

### Property 1: Idempotent Sync Operations

*For any* sync operation executed multiple times with the same input data, the target system SHALL contain exactly one record per source record, with no duplicates created.

**Validates: Requirements 2.6, 7.5**

### Property 2: Data Integrity Round-Trip

*For any* order synced from WooCommerce to QuickBooks, the essential financial data (total, line items, customer) SHALL be preserved and recoverable from the QuickBooks invoice.

**Validates: Requirements 2.3, 2.4, 2.5**

### Property 3: Credential Security

*For any* stored credential, the plaintext value SHALL never appear in logs, error messages, or API responses.

**Validates: Requirements 10.1, 10.6**

### Property 4: Rate Limit Compliance

*For any* sequence of API calls to a rate-limited service, the Sync_Engine SHALL not exceed the documented rate limits, implementing backoff when limits are approached.

**Validates: Requirements 8.1, 8.2**

### Property 5: Conflict Resolution Determinism

*For any* two-way sync conflict between the same record in different systems, applying the configured resolution strategy SHALL produce a consistent, predictable result.

**Validates: Requirements 4.3, 4.5**

### Property 6: Webhook Authenticity

*For any* incoming webhook payload, the Sync_Engine SHALL verify the signature before processing, rejecting unsigned or incorrectly signed payloads.

**Validates: Requirements 10.5, 12.5**

### Property 7: Dry Run Isolation

*For any* sync operation executed in dry-run mode, zero write operations SHALL be performed against external APIs.

**Validates: Requirements 7.2, 7.3**

### Property 8: Mapping Configuration Validity

*For any* field mapping configuration, the Sync_Engine SHALL validate that all referenced source and target fields exist before applying the mapping.

**Validates: Requirements 3.3, 3.6**

## Error Handling

### Error Categories

```typescript
enum SyncErrorCategory {
  AUTHENTICATION = 'authentication',    // OAuth failures, invalid credentials
  RATE_LIMIT = 'rate_limit',           // 429 responses
  VALIDATION = 'validation',           // Invalid data format
  NOT_FOUND = 'not_found',             // Referenced entity doesn't exist
  CONFLICT = 'conflict',               // Concurrent modification
  NETWORK = 'network',                 // Connection failures
  INTERNAL = 'internal',               // Unexpected errors
}

interface SyncError {
  category: SyncErrorCategory;
  code: string;
  message: string;
  entityType?: string;
  entityId?: string;
  retryable: boolean;
  retryAfter?: number;        // Seconds to wait before retry
  originalError?: unknown;
}
```

### Retry Strategy

```typescript
interface RetryConfig {
  maxRetries: number;          // Default: 3
  initialDelay: number;        // Default: 1000ms
  maxDelay: number;            // Default: 60000ms
  backoffMultiplier: number;   // Default: 2
  retryableCategories: SyncErrorCategory[];
}

// Exponential backoff implementation
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}
```

### QuickBooks-Specific Error Handling

Per [QBO Error Handling](https://developer.intuit.com/app/developer/qbo/docs/develop/troubleshooting/error-codes):

```typescript
const QBO_ERROR_HANDLERS: Record<string, ErrorHandler> = {
  // Rate limiting
  '429': {
    category: SyncErrorCategory.RATE_LIMIT,
    retryable: true,
    handler: (error) => {
      const retryAfter = parseInt(error.headers['retry-after'] || '60');
      return { retryAfter };
    }
  },
  
  // Stale object (concurrent modification)
  '5010': {
    category: SyncErrorCategory.CONFLICT,
    retryable: true,
    handler: async (error, context) => {
      // Refetch entity to get current SyncToken
      const current = await context.connector.fetchEntity(
        context.entityType, 
        context.entityId
      );
      return { refreshedData: current };
    }
  },
  
  // Duplicate name
  '6240': {
    category: SyncErrorCategory.VALIDATION,
    retryable: false,
    handler: (error) => ({
      message: 'A record with this name already exists in QuickBooks'
    })
  },
  
  // Business validation error
  '6000': {
    category: SyncErrorCategory.VALIDATION,
    retryable: false,
    handler: (error) => ({
      message: error.detail || 'Business validation failed'
    })
  }
};
```

## Testing Strategy

### Unit Tests

- Test transformation functions with various input formats
- Test field mapping application
- Test error categorization and retry logic
- Test credential encryption/decryption

### Integration Tests

- Test OAuth flow with QuickBooks sandbox
- Test WooCommerce API connectivity with test store
- Test Supabase read/write operations
- Test webhook signature validation

### Property-Based Tests

Each correctness property should have a corresponding property-based test:

1. **Idempotency Test**: Generate random orders, sync multiple times, verify no duplicates
2. **Round-Trip Test**: Sync order to QBO, read back, verify essential fields match
3. **Rate Limit Test**: Simulate rapid API calls, verify backoff behavior
4. **Dry Run Test**: Execute sync in dry-run, verify no external API writes

### End-to-End Tests

- Full sync flow: WooCommerce order → Internal → QuickBooks Invoice
- Webhook-triggered incremental sync
- Failed record retry and recovery
- Bulk sync with rate limiting

## API References

### QuickBooks Online

- **Base URL**: `https://quickbooks.api.intuit.com/v3/company/{realmId}`
- **Minor Version**: 75 (required from August 1, 2025)
- **OAuth 2.0**: [Authorization Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization)
- **Invoice API**: [Invoice Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice)
- **Customer API**: [Customer Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/customer)
- **Item API**: [Item Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/item)
- **Webhooks**: [Webhooks Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/webhooks) - CloudEvents format required by May 15, 2026

### WooCommerce

- **Base URL**: `https://{store-url}/wp-json/wc/v3`
- **Authentication**: Consumer Key/Secret (Basic Auth over HTTPS)
- **Orders API**: [Orders Reference](https://woocommerce.github.io/woocommerce-rest-api-docs/#orders)
- **Products API**: [Products Reference](https://woocommerce.github.io/woocommerce-rest-api-docs/#products)
- **Webhooks**: [Webhooks Reference](https://woocommerce.github.io/woocommerce-rest-api-docs/#webhooks)

### Supabase (Optional Cloud Backup)

**Note**: Supabase is optional. EasySale uses SQLite as primary database. Supabase is only for multi-store analytics or cloud backup.

- **Rust Client**: [supabase-rs](https://github.com/supabase-community/supabase-rs) or REST API via reqwest
- **REST API**: Primary connection method (recommended) - [REST API Docs](https://supabase.com/docs/guides/api)
- **PostgreSQL Direct**: Optional for bulk operations (requires service_role_key) - Use with caution
- **Real-time**: [Real-time Subscriptions](https://supabase.com/docs/guides/realtime) - For live analytics dashboards
