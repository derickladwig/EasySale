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

1. Import the Postman collection (coming soon)
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
