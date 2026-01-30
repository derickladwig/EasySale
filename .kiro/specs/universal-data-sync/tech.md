# Technical Specifications: Universal Data Synchronization

## Technology Stack

### Backend Services

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Sync Engine | Rust (Actix Web) | 1.75+ | Core orchestration |
| Local Database | SQLite | 3.35+ | Primary data store (per-store) |
| Cloud Backup | Supabase (PostgreSQL) | 15+ | Optional backup/analytics |
| Queue | SQLite tables | Built-in | Job scheduling (sync_queue) |
| Encryption | Rust crypto | Built-in | Credential storage |

**Note**: EasySale uses SQLite as the primary database for offline-first operation. Each store maintains a complete local database. Supabase is optionally used for cloud backup and multi-store analytics, not as the primary database.

### External APIs

| Platform | API Version | Authentication | Base URL |
|----------|-------------|----------------|----------|
| WooCommerce | REST API v3 | Consumer Key/Secret | `https://{store}/wp-json/wc/v3` |
| QuickBooks Online | v3 (minor 75) | OAuth 2.0 | `https://quickbooks.api.intuit.com/v3/company/{realmId}` |
| Supabase | Latest | Service Role Key | `https://{project}.supabase.co` |

### Frontend

| Component | Technology | Purpose |
|-----------|------------|---------|
| UI Framework | React 18+ | Settings and dashboard |
| State Management | React Query | API state caching |
| Forms | React Hook Form | Configuration forms |
| UI Components | Existing design system | Consistent styling |

## API Specifications

### WooCommerce REST API v3

**Important**: Legacy API (v1/v2) was removed in WooCommerce 9.0 (June 11, 2024). Only v3 is supported.

#### Authentication

```typescript
// Basic Auth over HTTPS
const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
headers['Authorization'] = `Basic ${auth}`;

// Or query string (less secure, for HTTP)
const url = `${storeUrl}/wp-json/wc/v3/orders?consumer_key=${key}&consumer_secret=${secret}`;
```

#### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/orders` | GET | List orders with filtering |
| `/orders/{id}` | GET | Get single order |
| `/products` | GET | List products |
| `/products/{id}` | GET | Get single product |
| `/customers` | GET | List customers |
| `/webhooks` | POST | Register webhook |

#### Rate Limits

- No official rate limit, but recommended: 25 requests/second
- Implement client-side throttling

#### Webhook Payload Example

```json
{
  "id": 123,
  "number": "123",
  "status": "completed",
  "date_created": "2025-01-11T10:00:00",
  "billing": {
    "first_name": "John",
    "last_name": "Doe",
    "email": "john@example.com"
  },
  "line_items": [
    {
      "id": 1,
      "name": "Product Name",
      "sku": "SKU-001",
      "quantity": 2,
      "price": 19.99,
      "total": "39.98"
    }
  ],
  "total": "43.98"
}
```

### QuickBooks Online API

**Reference**: [developer.intuit.com/app/developer/qbo/docs/develop](https://developer.intuit.com/app/developer/qbo/docs/develop)

#### Authentication (OAuth 2.0)

```typescript
// Authorization URL
const authUrl = 'https://appcenter.intuit.com/connect/oauth2';

// Token endpoint
const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

// Required scopes
const scopes = 'com.intuit.quickbooks.accounting';

// Token refresh (before expiry)
const refreshToken = async (refreshToken: string) => {
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=refresh_token&refresh_token=${refreshToken}`
  });
  return response.json();
};
```

#### API Request Format

```typescript
// All requests must include minor version
const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}`;

const makeRequest = async (endpoint: string, method: string, body?: object) => {
  const response = await fetch(`${baseUrl}/${endpoint}?minorversion=75`, {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  return response.json();
};
```

#### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/customer` | POST | Create customer |
| `/customer/{id}` | POST | Update customer (sparse) |
| `/query?query=...` | GET | Query entities |
| `/item` | POST | Create item |
| `/invoice` | POST | Create invoice |
| `/payment` | POST | Create payment |
| `/creditmemo` | POST | Create credit memo |

#### Invoice Creation Example

```json
{
  "DocNumber": "WOO-1234",
  "TxnDate": "2025-01-11",
  "CustomerRef": {
    "value": "123"
  },
  "BillEmail": {
    "Address": "customer@example.com"
  },
  "Line": [
    {
      "Amount": 39.98,
      "DetailType": "SalesItemLineDetail",
      "SalesItemLineDetail": {
        "ItemRef": {
          "value": "456"
        },
        "UnitPrice": 19.99,
        "Qty": 2
      }
    },
    {
      "Amount": 4.00,
      "DetailType": "SalesItemLineDetail",
      "Description": "Shipping",
      "SalesItemLineDetail": {
        "ItemRef": {
          "value": "SHIPPING_ITEM_ID"
        }
      }
    }
  ]
}
```

#### Error Codes

| Code | Description | Action |
|------|-------------|--------|
| 429 | Rate limit exceeded | Wait for Retry-After header |
| 5010 | Stale object | Refetch and retry with new SyncToken |
| 6000 | Business validation error | Check error detail |
| 6240 | Duplicate name | Use existing record |

#### Rate Limits

- **Sandbox**: 500 requests/minute
- **Production**: 500 requests/minute per realm
- Implement exponential backoff for 429 responses

#### CloudEvents Migration (Required by May 15, 2026)

```typescript
// New CloudEvents format
interface CloudEvent {
  specversion: '1.0';
  type: 'com.intuit.quickbooks.accounting.customer.created';
  source: 'https://quickbooks.api.intuit.com';
  id: string;
  time: string;
  datacontenttype: 'application/json';
  data: {
    realmId: string;
    name: string;
    id: string;
    operation: 'Create' | 'Update' | 'Delete';
    lastUpdated: string;
  };
}
```

### Supabase

**Reference**: [supabase.com/docs](https://supabase.com/docs)

#### Connection

```typescript
import { createClient } from '@supabase/supabase-js';

// For server-side operations (full access)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// For client-side (limited access)
const supabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
```

#### Database Schema

**Note**: This schema is for Supabase (optional cloud backup), not the primary SQLite database. The primary database schema is defined in `backend/rust/migrations/`.

```sql
-- Orders table (Supabase backup/analytics)
CREATE TABLE sync_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source VARCHAR(50) NOT NULL,
  source_id VARCHAR(100) NOT NULL,
  order_number VARCHAR(50),
  status VARCHAR(50),
  customer_id UUID REFERENCES sync_customers(id),
  billing_address JSONB,
  shipping_address JSONB,
  subtotal DECIMAL(10,2),
  tax_total DECIMAL(10,2),
  shipping_total DECIMAL(10,2),
  discount_total DECIMAL(10,2),
  total DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source, source_id)
);

-- ID Mappings table
CREATE TABLE sync_id_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_system VARCHAR(50) NOT NULL,
  source_entity VARCHAR(50) NOT NULL,
  source_id VARCHAR(100) NOT NULL,
  target_system VARCHAR(50) NOT NULL,
  target_entity VARCHAR(50) NOT NULL,
  target_id VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(source_system, source_entity, source_id, target_system)
);

-- Sync logs table
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id VARCHAR(100),
  connector VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100),
  operation VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  error_message TEXT,
  error_details JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sync_orders_source ON sync_orders(source, source_id);
CREATE INDEX idx_sync_logs_connector ON sync_logs(connector, created_at DESC);
CREATE INDEX idx_sync_logs_status ON sync_logs(status, created_at DESC);
CREATE INDEX idx_id_mappings_lookup ON sync_id_mappings(source_system, source_entity, source_id);
```

## Security Specifications

### Credential Storage

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

interface EncryptedCredential {
  iv: string;
  authTag: string;
  data: string;
}

function encrypt(plaintext: string): EncryptedCredential {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, KEY, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex'),
    data: encrypted
  };
}

function decrypt(encrypted: EncryptedCredential): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(encrypted.iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(encrypted.authTag, 'hex'));
  
  let decrypted = decipher.update(encrypted.data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### Webhook Signature Validation

#### WooCommerce

```typescript
import { createHmac } from 'crypto';

function validateWooCommerceWebhook(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
  
  return signature === expectedSignature;
}
```

#### QuickBooks

```typescript
import { createHmac } from 'crypto';

function validateQBOWebhook(
  payload: string,
  signature: string,
  verifierToken: string
): boolean {
  const expectedSignature = createHmac('sha256', verifierToken)
    .update(payload)
    .digest('base64');
  
  return signature === expectedSignature;
}
```

## Performance Specifications

### Rate Limiting

```typescript
interface RateLimiter {
  platform: string;
  maxRequests: number;
  windowMs: number;
  currentCount: number;
  windowStart: number;
}

const rateLimits: Record<string, RateLimiter> = {
  woocommerce: {
    platform: 'woocommerce',
    maxRequests: 25,
    windowMs: 1000, // 25 req/sec
    currentCount: 0,
    windowStart: Date.now()
  },
  quickbooks: {
    platform: 'quickbooks',
    maxRequests: 500,
    windowMs: 60000, // 500 req/min
    currentCount: 0,
    windowStart: Date.now()
  }
};

async function throttle(platform: string): Promise<void> {
  const limiter = rateLimits[platform];
  const now = Date.now();
  
  if (now - limiter.windowStart > limiter.windowMs) {
    limiter.currentCount = 0;
    limiter.windowStart = now;
  }
  
  if (limiter.currentCount >= limiter.maxRequests) {
    const waitTime = limiter.windowMs - (now - limiter.windowStart);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    limiter.currentCount = 0;
    limiter.windowStart = Date.now();
  }
  
  limiter.currentCount++;
}
```

### Batch Processing

```typescript
interface BatchConfig {
  batchSize: number;
  delayBetweenBatches: number;
}

async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  config: BatchConfig
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += config.batchSize) {
    const batch = items.slice(i, i + config.batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);
    
    if (i + config.batchSize < items.length) {
      await new Promise(resolve => 
        setTimeout(resolve, config.delayBetweenBatches)
      );
    }
  }
  
  return results;
}
```

## Environment Variables

```bash
# Encryption
ENCRYPTION_KEY=<64-character-hex-string>

# WooCommerce
WOOCOMMERCE_STORE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx
WOOCOMMERCE_WEBHOOK_SECRET=<webhook-secret>

# QuickBooks Online
QBO_CLIENT_ID=<client-id>
QBO_CLIENT_SECRET=<client-secret>
QBO_REDIRECT_URI=https://your-app.com/callback/quickbooks
QBO_ENVIRONMENT=sandbox|production

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Sync Configuration
SYNC_DRY_RUN=false
SYNC_LOG_LEVEL=info
SYNC_RETRY_MAX_ATTEMPTS=3
SYNC_RETRY_INITIAL_DELAY=1000
```

## Monitoring and Observability

### Metrics to Track

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| sync_operations_total | Total sync operations | N/A |
| sync_operations_failed | Failed sync operations | > 10% failure rate |
| sync_duration_seconds | Time per sync operation | > 30 seconds |
| api_requests_total | Total API requests per platform | N/A |
| api_rate_limit_hits | Rate limit encounters | > 5 per hour |
| queue_depth | Pending sync jobs | > 1000 |

### Logging Format

```typescript
interface SyncLogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  syncId: string;
  connector: string;
  entityType: string;
  entityId?: string;
  operation: string;
  status: 'started' | 'success' | 'failed' | 'retrying';
  duration?: number;
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, unknown>;
}
```

## API Deprecation Timeline

| Platform | Change | Deadline | Action Required |
|----------|--------|----------|-----------------|
| WooCommerce | Legacy API removed | June 11, 2024 | Use REST API v3 only |
| QuickBooks | Minor version 75 required | August 1, 2025 | Set minorversion=75 |
| QuickBooks | CloudEvents webhooks | May 15, 2026 | Update webhook handlers |
| Shopify | Private apps deprecated | January 1, 2026 | Use custom apps (N/A for this spec) |
