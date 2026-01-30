# Customer Endpoints

API reference for customer management operations.

**Base URL**: `http://localhost:3000/api`

**Authentication**: All endpoints require JWT Bearer token

---

## List Customers

Retrieve a paginated list of customers with optional filtering.

```
GET /api/customers
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by name, email, phone |
| `pricing_tier` | string | No | Filter by pricing tier |
| `has_balance` | boolean | No | Filter customers with store credit |
| `created_after` | string | No | Filter by creation date (ISO 8601) |
| `limit` | integer | No | Results per page (default: 50, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |
| `sort` | string | No | Sort field (name, created_at, total_spent) |
| `order` | string | No | Sort order (asc, desc) |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/customers?search=john&limit=25" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "customers": [
    {
      "id": 123,
      "first_name": "John",
      "last_name": "Doe",
      "email": "john.doe@example.com",
      "phone": "555-123-4567",
      "company": "Acme Corp",
      "pricing_tier": "retail",
      "loyalty_points": 150,
      "store_credit": 0,
      "total_spent": 1245.50,
      "transaction_count": 12,
      "last_transaction_date": "2026-01-28T14:30:00Z",
      "notes": "Prefers pickup over delivery",
      "tax_exempt": false,
      "active": true,
      "created_at": "2025-06-15T10:30:00Z",
      "updated_at": "2026-01-28T14:30:00Z"
    }
  ],
  "total": 1,
  "limit": 25,
  "offset": 0
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 403 | `FORBIDDEN` | Insufficient permissions |

---

## Get Customer

Retrieve a single customer by ID with full details.

```
GET /api/customers/{id}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Customer ID |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/customers/123" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "id": 123,
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com",
  "phone": "555-123-4567",
  "company": "Acme Corp",
  "addresses": [
    {
      "id": 1,
      "type": "billing",
      "line1": "123 Main Street",
      "line2": "Suite 100",
      "city": "Austin",
      "state": "TX",
      "postal_code": "78701",
      "country": "US",
      "default": true
    },
    {
      "id": 2,
      "type": "shipping",
      "line1": "456 Oak Avenue",
      "city": "Austin",
      "state": "TX",
      "postal_code": "78702",
      "country": "US",
      "default": false
    }
  ],
  "pricing_tier": "retail",
  "loyalty_points": 150,
  "loyalty_tier": "Silver",
  "store_credit": 0,
  "payment_terms": "net_0",
  "credit_limit": 0,
  "tax_exempt": false,
  "tax_exempt_number": null,
  "vehicles": [
    {
      "id": 1,
      "year": 2020,
      "make": "Toyota",
      "model": "Camry",
      "vin": "1HGBH41JXMN109186",
      "license_plate": "ABC-123",
      "notes": "Gray sedan"
    }
  ],
  "statistics": {
    "total_spent": 1245.50,
    "total_saved": 85.00,
    "transaction_count": 12,
    "average_transaction": 103.79,
    "last_transaction_date": "2026-01-28T14:30:00Z",
    "first_transaction_date": "2025-06-20T09:15:00Z",
    "favorite_categories": ["caps", "parts"],
    "lifetime_value": 1245.50
  },
  "notes": "Prefers pickup over delivery",
  "active": true,
  "created_at": "2025-06-15T10:30:00Z",
  "updated_at": "2026-01-28T14:30:00Z"
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 404 | `NOT_FOUND` | Customer not found |

---

## Create Customer

Create a new customer.

```
POST /api/customers
```

### Required Permission

`manage_customers`

### Request Body

```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "phone": "555-987-6543",
  "company": "Smith Auto",
  "pricing_tier": "retail",
  "addresses": [
    {
      "type": "billing",
      "line1": "789 Elm Street",
      "city": "Houston",
      "state": "TX",
      "postal_code": "77001",
      "country": "US",
      "default": true
    }
  ],
  "notes": "Referred by John Doe"
}
```

### Request Example

```bash
curl -X POST "http://localhost:3000/api/customers" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "email": "jane.smith@example.com",
    "phone": "555-987-6543"
  }'
```

### Response

**201 Created**

```json
{
  "id": 124,
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "phone": "555-987-6543",
  "company": null,
  "pricing_tier": "retail",
  "loyalty_points": 0,
  "store_credit": 0,
  "tax_exempt": false,
  "active": true,
  "created_at": "2026-01-30T09:15:00Z",
  "updated_at": "2026-01-30T09:15:00Z"
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 403 | `FORBIDDEN` | Missing permission |
| 409 | `CONFLICT` | Email already exists |

---

## Update Customer

Update an existing customer.

```
PUT /api/customers/{id}
```

### Required Permission

`manage_customers`

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Customer ID |

### Request Body

Only include fields to update:

```json
{
  "phone": "555-111-2222",
  "pricing_tier": "wholesale"
}
```

### Request Example

```bash
curl -X PUT "http://localhost:3000/api/customers/124" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "555-111-2222",
    "pricing_tier": "wholesale"
  }'
```

### Response

**200 OK**

Returns updated customer object.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 403 | `FORBIDDEN` | Missing permission |
| 404 | `NOT_FOUND` | Customer not found |
| 409 | `CONFLICT` | Email already exists |

---

## Delete Customer

Delete (deactivate) a customer.

```
DELETE /api/customers/{id}
```

### Required Permission

`manage_customers`

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Customer ID |

### Request Example

```bash
curl -X DELETE "http://localhost:3000/api/customers/124" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "message": "Customer deleted successfully",
  "id": 124
}
```

**Note**: Customers are soft-deleted (marked inactive) to preserve transaction history.

---

## Search Customers

Quick search for customers (optimized for POS lookup).

```
GET /api/customers/search
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (name, phone, email) |
| `limit` | integer | No | Max results (default: 10) |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/customers/search?q=555-123" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "customers": [
    {
      "id": 123,
      "name": "John Doe",
      "phone": "555-123-4567",
      "email": "john.doe@example.com",
      "pricing_tier": "retail",
      "loyalty_points": 150
    }
  ]
}
```

---

## Get Customer Transactions

Get transaction history for a customer.

```
GET /api/customers/{id}/transactions
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Customer ID |

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string | No | Filter by start date |
| `end_date` | string | No | Filter by end date |
| `type` | string | No | Filter by type (sale, return) |
| `limit` | integer | No | Results per page (default: 25) |
| `offset` | integer | No | Pagination offset |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/customers/123/transactions?limit=10" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "transactions": [
    {
      "id": 456,
      "transaction_number": "TXN-2026-01-28-0456",
      "type": "sale",
      "total": 89.99,
      "items_count": 3,
      "created_at": "2026-01-28T14:30:00Z"
    }
  ],
  "total": 12,
  "limit": 10,
  "offset": 0
}
```

---

## Loyalty Points

### Get Loyalty Balance

```
GET /api/customers/{id}/loyalty
```

### Response

**200 OK**

```json
{
  "customer_id": 123,
  "points_balance": 150,
  "points_value": 1.50,
  "loyalty_tier": "Silver",
  "tier_benefits": {
    "discount_percentage": 5,
    "points_multiplier": 1.5,
    "free_shipping": false
  },
  "points_to_next_tier": 350,
  "next_tier": "Gold",
  "points_expiring": 50,
  "expiration_date": "2026-06-30"
}
```

### Add Loyalty Points

```
POST /api/customers/{id}/loyalty/add
```

### Request Body

```json
{
  "points": 50,
  "reason": "Purchase bonus",
  "transaction_id": 456
}
```

### Response

**200 OK**

```json
{
  "customer_id": 123,
  "points_added": 50,
  "new_balance": 200,
  "transaction_id": 456
}
```

### Redeem Loyalty Points

```
POST /api/customers/{id}/loyalty/redeem
```

### Request Body

```json
{
  "points": 100,
  "transaction_id": 457
}
```

### Response

**200 OK**

```json
{
  "customer_id": 123,
  "points_redeemed": 100,
  "redemption_value": 1.00,
  "new_balance": 100,
  "transaction_id": 457
}
```

---

## Store Credit

### Get Store Credit Balance

```
GET /api/customers/{id}/credit
```

### Response

**200 OK**

```json
{
  "customer_id": 123,
  "credit_balance": 25.50,
  "credit_history": [
    {
      "id": 1,
      "amount": 25.50,
      "type": "return",
      "reference": "RTN-2026-01-25-0123",
      "created_at": "2026-01-25T11:00:00Z"
    }
  ]
}
```

### Add Store Credit

```
POST /api/customers/{id}/credit/add
```

### Required Permission

`manage_credits`

### Request Body

```json
{
  "amount": 10.00,
  "reason": "Price adjustment",
  "reference": "ADJ-001"
}
```

### Apply Store Credit

```
POST /api/customers/{id}/credit/apply
```

### Request Body

```json
{
  "amount": 15.00,
  "transaction_id": 458
}
```

---

## Customer Vehicles

### List Customer Vehicles

```
GET /api/customers/{id}/vehicles
```

### Response

**200 OK**

```json
{
  "vehicles": [
    {
      "id": 1,
      "year": 2020,
      "make": "Toyota",
      "model": "Camry",
      "trim": "SE",
      "engine": "2.5L 4-Cylinder",
      "vin": "1HGBH41JXMN109186",
      "license_plate": "ABC-123",
      "color": "Gray",
      "mileage": 45000,
      "notes": "Primary vehicle"
    }
  ]
}
```

### Add Vehicle

```
POST /api/customers/{id}/vehicles
```

### Request Body

```json
{
  "year": 2019,
  "make": "Honda",
  "model": "Civic",
  "vin": "2HGFC2F59KH123456",
  "license_plate": "XYZ-789"
}
```

### Update Vehicle

```
PUT /api/customers/{id}/vehicles/{vehicle_id}
```

### Delete Vehicle

```
DELETE /api/customers/{id}/vehicles/{vehicle_id}
```

---

## Bulk Operations

### Import Customers

```
POST /api/customers/import
```

### Required Permission

`manage_customers`

### Request (multipart/form-data)

| Field | Type | Description |
|-------|------|-------------|
| `file` | file | CSV or JSON file |
| `update_existing` | boolean | Update if email exists |

### CSV Format

```csv
first_name,last_name,email,phone,company,pricing_tier
John,Doe,john@example.com,555-1234,Acme Corp,retail
Jane,Smith,jane@example.com,555-5678,Smith Auto,wholesale
```

### Response

**200 OK**

```json
{
  "imported": 45,
  "updated": 12,
  "failed": 3,
  "errors": [
    {
      "row": 15,
      "email": "invalid",
      "error": "Invalid email format"
    }
  ]
}
```

### Export Customers

```
GET /api/customers/export
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | Export format: csv (default), json |
| `pricing_tier` | string | Filter by pricing tier |

---

## Customer Data Models

### Customer Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique customer ID |
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `email` | string | Email address (unique) |
| `phone` | string | Phone number |
| `company` | string | Company name |
| `pricing_tier` | string | Pricing tier (retail, wholesale, etc.) |
| `loyalty_points` | integer | Current loyalty points |
| `store_credit` | decimal | Store credit balance |
| `tax_exempt` | boolean | Tax exempt status |
| `tax_exempt_number` | string | Tax exemption certificate |
| `payment_terms` | string | Payment terms (net_0, net_30, etc.) |
| `credit_limit` | decimal | Credit limit for terms |
| `notes` | string | Customer notes |
| `active` | boolean | Active status |
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last update timestamp |

### Pricing Tiers

| Tier | Description |
|------|-------------|
| `retail` | Standard retail pricing |
| `wholesale` | Wholesale/bulk pricing |
| `contractor` | Contractor discount pricing |
| `vip` | VIP customer pricing |
| `employee` | Employee discount |

### Loyalty Tiers

| Tier | Points Required | Benefits |
|------|-----------------|----------|
| Bronze | 0 | Base earning rate |
| Silver | 500 | 5% discount, 1.5x points |
| Gold | 1000 | 10% discount, 2x points |
| Platinum | 2500 | 15% discount, 3x points |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Customer not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Email already exists |
| `INSUFFICIENT_CREDIT` | 400 | Not enough store credit |
| `INSUFFICIENT_POINTS` | 400 | Not enough loyalty points |

---

## Related Documentation

- [Transaction Endpoints](./transactions.md) - Sales with customers
- [Product Endpoints](./products.md) - Product catalog
- [API Overview](./README.md) - Authentication and general info
