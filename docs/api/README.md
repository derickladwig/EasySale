# API Documentation

## Overview

The EasySale API is a RESTful API built with Rust and Actix-web. It provides endpoints for all POS operations including authentication, sales, inventory, customers, and reporting.

**Base URL**: `http://localhost:8923/api`

**Authentication**: JWT Bearer tokens

**Content Type**: `application/json`

## Quick Start

### Authentication

```bash
# Login (use credentials created during initial setup)
curl -X POST http://localhost:8923/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "your_username",
    "role": "admin",
    "permissions": ["access_sell", "apply_discount", ...]
  }
}

# Use token in subsequent requests
curl -X GET http://localhost:8923/api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> **Note**: Credentials are set during initial setup. There are no default passwords.

## API Endpoints

### Authentication

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request**:
```json
{
  "username": "your_username",
  "password": "your_password"
}
```

**Response** (200 OK):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "permissions": ["access_sell", "apply_discount", "override_price", ...]
  }
}
```

**Errors**:
- `401 Unauthorized`: Invalid credentials
- `400 Bad Request`: Missing username or password

---

#### POST /api/auth/logout
Invalidate current session.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "message": "Logged out successfully"
}
```

**Errors**:
- `401 Unauthorized`: Invalid or expired token

---

#### GET /api/auth/me
Get current user information.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "username": "admin",
  "role": "admin",
  "permissions": ["access_sell", "apply_discount", "override_price", ...]
}
```

**Errors**:
- `401 Unauthorized`: Invalid or expired token

---

### Health Check

#### GET /health
Check API health status.

**No authentication required**

**Response** (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2026-01-09T12:34:56Z",
  "version": "0.1.0"
}
```

---

### Capabilities

#### GET /api/capabilities
Get backend build capabilities and available features.

**No authentication required**

**Purpose**: Allows frontend to detect which features are available in the current backend build variant (Lite, Export, or Full). Frontend should query this endpoint on startup to adapt UI based on backend capabilities.

**Response** (200 OK):
```json
{
  "accounting_mode": "export_only",
  "features": {
    "export": true,
    "sync": false
  },
  "version": "0.1.0",
  "build_hash": "abc123def456"
}
```

**Response Fields**:
- `accounting_mode`: Current accounting integration mode
  - `"disabled"`: No accounting features (Lite build)
  - `"export_only"`: CSV export available (Export build)
  - `"sync"`: Full sync with QuickBooks/Xero (Full build with sync sidecar)
- `features`: Object with boolean flags for optional features
  - `export`: CSV export functionality available
  - `sync`: Real-time sync with accounting systems available
- `version`: Backend version string
- `build_hash`: Git commit hash of the build

**Build Variants**:
- **Lite**: `accounting_mode: "disabled"`, `export: false`, `sync: false`
- **Export** (default): `accounting_mode: "export_only"`, `export: true`, `sync: false`
- **Full**: `accounting_mode: "export_only"`, `export: true`, `sync: false` (sync becomes true when sidecar is running)

**Usage Example**:
```typescript
// Frontend capability detection
const response = await fetch('/api/capabilities');
const capabilities = await response.json();

if (capabilities.features.export) {
  // Show export buttons
} else {
  // Hide export features
}
```

**Notes**:
- Capabilities are determined at compile time (except sync which is runtime-detected)
- Frontend should cache this response (capabilities don't change at runtime)
- Use this to conditionally render features based on backend build

---

### Products

> **Full documentation**: [products.md](./products.md)

#### GET /api/products
List products with optional filtering.

**Query Parameters**:
- `search` (string): Search by name, barcode, SKU
- `category` (string): Filter by category (caps, parts, paint, equipment)
- `limit` (number): Results per page (default: 50, max: 100)
- `offset` (number): Pagination offset (default: 0)

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "products": [
    {
      "id": 1,
      "name": "Red Baseball Cap",
      "barcode": "123456789",
      "sku": "CAP-RED-001",
      "category": "caps",
      "price": 19.99,
      "stock": 50,
      "attributes": {
        "size": "One Size",
        "color": "Red",
        "brand": "CAPS"
      }
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

#### GET /api/products/:id
Get product by ID.

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "Red Baseball Cap",
  "barcode": "123456789",
  "sku": "CAP-RED-001",
  "category": "caps",
  "price": 19.99,
  "stock": 50,
  "attributes": {
    "size": "One Size",
    "color": "Red",
    "brand": "CAPS"
  }
}
```

**Errors**:
- `404 Not Found`: Product not found

---

### Transactions

> **Full documentation**: [transactions.md](./transactions.md)

#### POST /api/transactions
Create a new sales transaction.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "customer_id": 123,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 19.99,
      "discount": 0
    }
  ],
  "payment": {
    "method": "card",
    "amount": 39.98,
    "reference": "CARD-12345"
  },
  "notes": "Customer requested gift wrap"
}
```

**Response** (201 Created):
```json
{
  "id": 456,
  "transaction_number": "TXN-2026-01-09-456",
  "customer_id": 123,
  "items": [...],
  "subtotal": 39.98,
  "tax": 3.20,
  "total": 43.18,
  "payment": {...},
  "created_at": "2026-01-09T12:34:56Z",
  "created_by": 1
}
```

**Errors**:
- `400 Bad Request`: Invalid request data
- `403 Forbidden`: Insufficient permissions
- `409 Conflict`: Insufficient stock

---

#### GET /api/transactions
List transactions with optional filtering.

**Query Parameters**:
- `start_date` (string): Filter by start date (ISO 8601)
- `end_date` (string): Filter by end date (ISO 8601)
- `customer_id` (number): Filter by customer
- `limit` (number): Results per page (default: 50, max: 100)
- `offset` (number): Pagination offset (default: 0)

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "transactions": [
    {
      "id": 456,
      "transaction_number": "TXN-2026-01-09-456",
      "customer_id": 123,
      "subtotal": 39.98,
      "tax": 3.20,
      "total": 43.18,
      "created_at": "2026-01-09T12:34:56Z",
      "created_by": 1
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

### Customers

> **Full documentation**: [customers.md](./customers.md)

#### GET /api/customers
List customers with optional filtering.

**Query Parameters**:
- `search` (string): Search by name, email, phone
- `limit` (number): Results per page (default: 50, max: 100)
- `offset` (number): Pagination offset (default: 0)

**Headers**:
```
Authorization: Bearer <token>
```

**Response** (200 OK):
```json
{
  "customers": [
    {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "555-1234",
      "loyalty_points": 150,
      "pricing_tier": "retail"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

#### POST /api/customers
Create a new customer.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "pricing_tier": "retail"
}
```

**Response** (201 Created):
```json
{
  "id": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "loyalty_points": 0,
  "pricing_tier": "retail",
  "created_at": "2026-01-09T12:34:56Z"
}
```

---

### Inventory

> **Full documentation**: [inventory.md](./inventory.md)

#### POST /api/inventory/adjustments
Adjust inventory levels.

**Headers**:
```
Authorization: Bearer <token>
```

**Request**:
```json
{
  "product_id": 1,
  "old_quantity": 100,
  "new_quantity": 95,
  "reason": "damaged",
  "notes": "Water damage from roof leak"
}
```

**Response** (201 Created):
```json
{
  "id": 789,
  "product_id": 1,
  "old_quantity": 100,
  "new_quantity": 95,
  "difference": -5,
  "reason": "damaged",
  "notes": "Water damage from roof leak",
  "created_at": "2026-01-09T12:34:56Z",
  "created_by": 1
}
```

**Errors**:
- `403 Forbidden`: Missing `adjust_inventory` permission

---

## Error Responses

All error responses follow this format:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid username or password",
    "details": {}
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_CREDENTIALS` | 401 | Invalid username or password |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Resource conflict (e.g., insufficient stock) |
| `INTERNAL_ERROR` | 500 | Internal server error |

## Authentication

### JWT Token Format

Tokens are signed with HS256 algorithm and contain:

```json
{
  "sub": "1",
  "username": "admin",
  "role": "admin",
  "exp": 1704816896
}
```

**Token Expiration**: 8 hours

**Token Storage**: Store in httpOnly cookies (recommended) or localStorage

### Permission System

**Roles**:
- `admin`: Full access to all features
- `manager`: Access to sales, inventory, customers, reporting
- `cashier`: Access to sales only
- `specialist`: Access to specialized lookup and inventory
- `inventory_clerk`: Access to warehouse and inventory
- `technician`: Access to service orders and inventory

**Permissions**:
- `access_sell`: Access sell module
- `apply_discount`: Apply discounts to transactions
- `override_price`: Override product prices
- `process_return`: Process returns and refunds
- `access_warehouse`: Access warehouse module
- `receive_stock`: Receive incoming stock
- `adjust_inventory`: Adjust inventory levels
- `access_admin`: Access admin module
- `manage_users`: Create and manage users
- `manage_settings`: Modify system settings
- `view_audit_logs`: View audit logs

## Rate Limiting

**Not implemented yet**

Future implementation will limit:
- Login attempts: 5 per minute per IP
- API calls: 100 per minute per user
- Search queries: 20 per minute per user

## Pagination

All list endpoints support pagination:

**Query Parameters**:
- `limit`: Results per page (default: 50, max: 100)
- `offset`: Number of results to skip (default: 0)

**Response**:
```json
{
  "data": [...],
  "total": 1000,
  "limit": 50,
  "offset": 0
}
```

**Example**:
```bash
# Get first page (results 0-49)
GET /api/products?limit=50&offset=0

# Get second page (results 50-99)
GET /api/products?limit=50&offset=50

# Get third page (results 100-149)
GET /api/products?limit=50&offset=100
```

## Filtering and Sorting

**Filtering**:
```bash
# Filter by category
GET /api/products?category=caps

# Filter by date range
GET /api/transactions?start_date=2026-01-01&end_date=2026-01-31

# Search by keyword
GET /api/customers?search=john
```

**Sorting** (not implemented yet):
```bash
# Sort by name ascending
GET /api/products?sort=name&order=asc

# Sort by price descending
GET /api/products?sort=price&order=desc
```

## Versioning

**Current Version**: v1 (implicit)

**Future Versioning**: Will use URL versioning when breaking changes are introduced:
- `/api/v1/products`
- `/api/v2/products`

## Testing

### Using curl

```bash
# Login (replace with your credentials from initial setup)
TOKEN=$(curl -s -X POST http://localhost:8923/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}' \
  | jq -r '.token')

# Get current user
curl -X GET http://localhost:8923/api/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Health check
curl -X GET http://localhost:8923/health
```

### Using Postman

1. Use the API documentation below or explore endpoints via the health check
2. Set environment variable `base_url` to `http://localhost:8923/api`
3. Login with credentials you created during setup
4. Token is automatically used in subsequent requests

### Using JavaScript

```javascript
// Login (replace with your credentials from initial setup)
const response = await fetch('http://localhost:8923/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'your_username', password: 'your_password' })
});
const { token, user } = await response.json();

// Use token
const products = await fetch('http://localhost:8923/api/products', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await products.json();
```

## WebSocket API (Future)

Real-time updates will be available via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:8923/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'inventory_update':
      // Handle inventory change
      break;
    case 'sync_status':
      // Handle sync status change
      break;
  }
};
```

## References

- [System Architecture](../architecture/overview.md)
- [Data Flow](../architecture/data-flow.md)
- [Database Schema](../architecture/database.md)
- [Security Documentation](../architecture/security.md)


## Feature Modules

### Work Orders

See [Work Orders API Documentation](./work-orders-api.md) for detailed endpoint information.

**Quick Reference**:
- `GET /api/work-orders` - List work orders
- `POST /api/work-orders` - Create work order
- `GET /api/work-orders/{id}` - Get work order details
- `PUT /api/work-orders/{id}` - Update work order
- `POST /api/work-orders/{id}/complete` - Complete work order (auto-generates invoice)
- `POST /api/work-orders/{id}/invoice` - Manually create invoice
- `POST /api/work-orders/{id}/cancel` - Cancel work order

### Appointments

**Endpoints**:
- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `GET /api/appointments/{id}` - Get appointment details
- `PUT /api/appointments/{id}` - Update appointment
- `DELETE /api/appointments/{id}` - Delete appointment
- `POST /api/appointments/{id}/confirm` - Confirm appointment
- `POST /api/appointments/{id}/complete` - Complete appointment
- `POST /api/appointments/{id}/cancel` - Cancel appointment

**Query Parameters** (List):
- `status`: Filter by status (scheduled, confirmed, completed, cancelled, no_show)
- `staff_id`: Filter by assigned staff member
- `from_date`: Start date filter (ISO 8601)
- `to_date`: End date filter (ISO 8601)
- `service_type`: Filter by service type

### Time Tracking

**Endpoints**:
- `GET /api/time-entries` - List time entries
- `POST /api/time-entries/clock-in` - Clock in
- `POST /api/time-entries/{id}/clock-out` - Clock out
- `POST /api/time-entries` - Create manual time entry
- `PUT /api/time-entries/{id}` - Update time entry
- `DELETE /api/time-entries/{id}` - Delete time entry
- `POST /api/time-entries/{id}/approve` - Approve time entry
- `POST /api/time-entries/{id}/reject` - Reject time entry
- `GET /api/time-entries/current` - Get current clock-in status

**Query Parameters** (List):
- `employee_id`: Filter by employee
- `project_id`: Filter by project
- `from_date`: Start date filter (ISO 8601)
- `to_date`: End date filter (ISO 8601)
- `billable`: Filter by billable status (true/false)
- `approval_status`: Filter by approval status (pending, approved, rejected)

### Estimates

**Endpoints**:
- `GET /api/estimates` - List estimates
- `POST /api/estimates` - Create estimate
- `GET /api/estimates/{id}` - Get estimate details
- `PUT /api/estimates/{id}` - Update estimate
- `DELETE /api/estimates/{id}` - Delete estimate
- `POST /api/estimates/{id}/send` - Send estimate to customer
- `POST /api/estimates/{id}/accept` - Accept estimate (customer action)
- `POST /api/estimates/{id}/reject` - Reject estimate (customer action)
- `POST /api/estimates/{id}/convert-to-invoice` - Convert to invoice
- `POST /api/estimates/{id}/convert-to-work-order` - Convert to work order
- `GET /api/estimates/{id}/pdf` - Download estimate PDF

**Query Parameters** (List):
- `status`: Filter by status (draft, sent, viewed, accepted, rejected, expired, converted)
- `customer_id`: Filter by customer
- `sales_rep_id`: Filter by sales representative
- `from_date`: Start date filter (ISO 8601)
- `to_date`: End date filter (ISO 8601)

### Invoices

**Endpoints**:
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice manually
- `GET /api/invoices/{id}` - Get invoice details
- `PUT /api/invoices/{id}` - Update invoice
- `POST /api/invoices/{id}/void` - Void invoice
- `POST /api/invoices/{id}/send` - Send invoice to customer
- `POST /api/invoices/{id}/payments` - Record payment
- `GET /api/invoices/{id}/pdf` - Download invoice PDF

**Query Parameters** (List):
- `status`: Filter by status (draft, sent, paid, partially_paid, overdue, void)
- `customer_id`: Filter by customer
- `work_order_id`: Filter by work order
- `from_date`: Start date filter (ISO 8601)
- `to_date`: End date filter (ISO 8601)

## Tax and Discount Endpoints

### Tax Rates

**Endpoints**:
- `GET /api/tax-rates` - List tax rates
- `POST /api/tax-rates` - Create tax rate
- `GET /api/tax-rates/{id}` - Get tax rate details
- `PUT /api/tax-rates/{id}` - Update tax rate
- `DELETE /api/tax-rates/{id}` - Delete tax rate
- `POST /api/tax-rates/calculate` - Calculate tax for transaction

**Tax Rate Object**:
```json
{
  "id": 1,
  "tenant_id": "tenant_default",
  "name": "State Sales Tax",
  "rate": 0.0825,
  "is_compound": false,
  "applies_to_category": null,
  "applies_to_location": "TX",
  "active": true
}
```

### Discounts

**Endpoints**:
- `GET /api/discounts` - List discounts
- `POST /api/discounts` - Create discount
- `GET /api/discounts/{id}` - Get discount details
- `PUT /api/discounts/{id}` - Update discount
- `DELETE /api/discounts/{id}` - Delete discount
- `POST /api/discounts/calculate` - Calculate discount for transaction

**Discount Object**:
```json
{
  "id": 1,
  "tenant_id": "tenant_default",
  "name": "VIP Customer Discount",
  "type": "percentage",
  "value": 10.0,
  "applies_to": "transaction",
  "category_filter": null,
  "customer_tier_filter": "vip",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "active": true
}
```

## Email Notifications

### Send Notification

```http
POST /api/notifications/send
```

Send email notification manually.

**Request Body**:
```json
{
  "type": "appointment_reminder",
  "recipient": "customer@example.com",
  "data": {
    "appointment_id": 123,
    "customer_name": "John Doe",
    "appointment_date": "2026-02-01T10:00:00Z"
  }
}
```

**Response** (200 OK):
```json
{
  "message_id": "msg_abc123",
  "status": "sent",
  "sent_at": "2026-01-30T16:00:00Z"
}
```

### Notification Types

- `appointment_confirmation`: Sent when appointment created
- `appointment_reminder`: Sent before appointment
- `appointment_rescheduled`: Sent when appointment rescheduled
- `invoice_notification`: Sent when invoice created
- `estimate_notification`: Sent when estimate created
- `work_order_status`: Sent when work order status changes
- `low_stock_alert`: Sent when inventory low
- `sync_failure`: Sent when sync fails

## Module Configuration

### Check Module Status

```http
GET /api/modules/{module_name}/status
```

Check if a module is enabled.

**Path Parameters**:
- `module_name`: Module name (workOrders, appointments, timeTracking, estimates)

**Response** (200 OK):
```json
{
  "module": "workOrders",
  "enabled": true,
  "settings": {
    "autoInvoiceOnComplete": true,
    "defaultLaborRate": 75.00
  }
}
```

### Get Module Settings

```http
GET /api/modules/{module_name}/settings
```

Get module configuration settings.

**Response** (200 OK):
```json
{
  "module": "appointments",
  "settings": {
    "slotDuration": 30,
    "advanceBookingDays": 30,
    "allowOnlineBooking": true,
    "sendReminders": true,
    "reminderTiming": [1440, 60]
  }
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid request data",
  "details": {
    "field": "customer_id",
    "issue": "Customer ID is required"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions",
  "required_permission": "create_work_order"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Work order not found",
  "resource_id": 123
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "request_id": "req_abc123"
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Default**: 100 requests per minute per IP
- **Authenticated**: 1000 requests per minute per user
- **Burst**: Up to 20 requests in 1 second

**Rate Limit Headers**:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1643673600
```

## Pagination

List endpoints support pagination:

**Query Parameters**:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 50, max: 100)

**Response Headers**:
```
X-Total-Count: 250
X-Page: 1
X-Per-Page: 50
X-Total-Pages: 5
```

**Response Body**:
```json
{
  "items": [...],
  "pagination": {
    "total": 250,
    "page": 1,
    "limit": 50,
    "total_pages": 5
  }
}
```

## Filtering and Sorting

### Filtering

Most list endpoints support filtering via query parameters:

```http
GET /api/work-orders?status=in_progress&assigned_to=5&from_date=2026-01-01
```

### Sorting

Use `sort` and `order` query parameters:

```http
GET /api/work-orders?sort=due_date&order=asc
```

**Sort Options**:
- `asc`: Ascending order
- `desc`: Descending order (default)

## Webhooks

Configure webhooks to receive real-time notifications:

### Register Webhook

```http
POST /api/webhooks
```

**Request Body**:
```json
{
  "url": "https://your-app.com/webhooks/easysale",
  "events": [
    "work_order.completed",
    "invoice.created",
    "appointment.confirmed"
  ],
  "secret": "your_webhook_secret"
}
```

### Webhook Events

- `work_order.created`
- `work_order.updated`
- `work_order.completed`
- `work_order.cancelled`
- `invoice.created`
- `invoice.paid`
- `appointment.created`
- `appointment.confirmed`
- `appointment.completed`
- `appointment.cancelled`
- `estimate.sent`
- `estimate.accepted`
- `estimate.rejected`
- `time_entry.created`
- `time_entry.approved`

### Webhook Payload

```json
{
  "event": "work_order.completed",
  "timestamp": "2026-01-30T16:00:00Z",
  "data": {
    "work_order_id": 123,
    "invoice_id": 456,
    "customer_id": 789
  }
}
```

## SDK and Client Libraries

Official client libraries:

- **JavaScript/TypeScript**: `npm install @easysale/api-client`
- **Python**: `pip install easysale-api`
- **PHP**: `composer require easysale/api-client`
- **Ruby**: `gem install easysale-api`

**Example (JavaScript)**:
```javascript
import { EasySaleClient } from '@easysale/api-client';

const client = new EasySaleClient({
  baseUrl: 'http://localhost:7945',
  token: 'your_jwt_token'
});

// Create work order
const workOrder = await client.workOrders.create({
  customer_id: 123,
  description: 'Oil change',
  line_items: [...]
});

// Complete work order (auto-generates invoice)
const result = await client.workOrders.complete(workOrder.id);
console.log(`Invoice created: ${result.invoice_number}`);
```

## Additional Resources

- [OpenAPI Specification](./openapi.yaml) - Complete API specification
- [Postman Collection](./easysale-api.postman_collection.json) - Import into Postman
- [Authentication Guide](../guides/authentication.md) - Detailed auth documentation
- [Integration Examples](../guides/integration-examples.md) - Code examples
- [Troubleshooting](../user-guides/troubleshooting.md) - Common API issues

---

*Last updated: 2026-01-30*
*Version: 1.0*
