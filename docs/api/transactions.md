# Transaction Endpoints

API reference for sales transaction operations.

**Base URL**: `http://localhost:8923/api`

**Authentication**: All endpoints require JWT Bearer token

---

## Create Transaction

Create a new sales transaction.

```
POST /api/transactions
```

### Required Permission

`access_sell`

### Request Body

```json
{
  "customer_id": 123,
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 19.99,
      "discount": 0,
      "discount_type": "fixed",
      "notes": "Customer requested gift wrap"
    }
  ],
  "payment": {
    "method": "card",
    "amount": 43.18,
    "reference": "CARD-12345",
    "tender": 50.00,
    "change": 6.82
  },
  "discounts": [
    {
      "type": "percentage",
      "value": 10,
      "reason": "Loyalty discount",
      "applied_by": 1
    }
  ],
  "notes": "Customer requested gift wrap",
  "station_id": 1
}
```

### Request Example

```bash
curl -X POST "http://localhost:8923/api/transactions" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product_id": 1,
        "quantity": 2,
        "price": 19.99
      }
    ],
    "payment": {
      "method": "cash",
      "amount": 43.18,
      "tender": 50.00
    }
  }'
```

### Response

**201 Created**

```json
{
  "id": 456,
  "transaction_number": "TXN-2026-01-30-0456",
  "type": "sale",
  "status": "completed",
  "customer_id": 123,
  "customer_name": "John Doe",
  "items": [
    {
      "id": 1001,
      "product_id": 1,
      "product_name": "Red Baseball Cap",
      "barcode": "123456789012",
      "sku": "CAP-RED-001",
      "quantity": 2,
      "unit_price": 19.99,
      "discount": 0,
      "tax": 3.30,
      "subtotal": 39.98,
      "total": 43.28
    }
  ],
  "subtotal": 39.98,
  "discount_total": 0,
  "tax_total": 3.30,
  "total": 43.28,
  "payment": {
    "method": "cash",
    "amount": 43.28,
    "tender": 50.00,
    "change": 6.72,
    "reference": null
  },
  "station_id": 1,
  "station_name": "Register 1",
  "created_by": 1,
  "created_by_name": "admin",
  "created_at": "2026-01-30T09:15:23Z"
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 403 | `FORBIDDEN` | Missing `access_sell` permission |
| 404 | `NOT_FOUND` | Product or customer not found |
| 409 | `INSUFFICIENT_STOCK` | Not enough stock available |

---

## Get Transaction

Retrieve a single transaction by ID.

```
GET /api/transactions/{id}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Transaction ID |

### Request Example

```bash
curl -X GET "http://localhost:8923/api/transactions/456" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

Returns full transaction object (same structure as Create response).

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 404 | `NOT_FOUND` | Transaction not found |

---

## List Transactions

Retrieve a paginated list of transactions.

```
GET /api/transactions
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start_date` | string | No | Filter by start date (ISO 8601) |
| `end_date` | string | No | Filter by end date (ISO 8601) |
| `customer_id` | integer | No | Filter by customer |
| `type` | string | No | Filter by type (sale, return, exchange) |
| `status` | string | No | Filter by status (completed, voided, pending) |
| `payment_method` | string | No | Filter by payment method |
| `station_id` | integer | No | Filter by station |
| `created_by` | integer | No | Filter by cashier |
| `limit` | integer | No | Results per page (default: 50, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |

### Request Example

```bash
curl -X GET "http://localhost:8923/api/transactions?start_date=2026-01-30&type=sale&limit=25" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "transactions": [
    {
      "id": 456,
      "transaction_number": "TXN-2026-01-30-0456",
      "type": "sale",
      "status": "completed",
      "customer_id": 123,
      "customer_name": "John Doe",
      "subtotal": 39.98,
      "discount_total": 0,
      "tax_total": 3.30,
      "total": 43.28,
      "payment_method": "cash",
      "item_count": 1,
      "station_id": 1,
      "created_by": 1,
      "created_by_name": "admin",
      "created_at": "2026-01-30T09:15:23Z"
    }
  ],
  "total": 1,
  "limit": 25,
  "offset": 0,
  "summary": {
    "total_sales": 43.28,
    "total_tax": 3.30,
    "transaction_count": 1
  }
}
```

---

## Process Return

Process a return transaction.

```
POST /api/transactions/return
```

### Required Permission

`process_return`

### Request Body

```json
{
  "original_transaction_id": 456,
  "items": [
    {
      "product_id": 1,
      "quantity": 1,
      "reason": "defective"
    }
  ],
  "refund": {
    "method": "original",
    "amount": 21.64
  },
  "notes": "Item had manufacturing defect"
}
```

### Request Example

```bash
curl -X POST "http://localhost:8923/api/transactions/return" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "original_transaction_id": 456,
    "items": [
      {
        "product_id": 1,
        "quantity": 1,
        "reason": "defective"
      }
    ],
    "refund": {
      "method": "cash",
      "amount": 21.64
    }
  }'
```

### Response

**201 Created**

```json
{
  "id": 457,
  "transaction_number": "RTN-2026-01-30-0457",
  "type": "return",
  "status": "completed",
  "original_transaction_id": 456,
  "original_transaction_number": "TXN-2026-01-30-0456",
  "items": [
    {
      "product_id": 1,
      "product_name": "Red Baseball Cap",
      "quantity": 1,
      "unit_price": 19.99,
      "tax": 1.65,
      "total": 21.64,
      "reason": "defective"
    }
  ],
  "refund_total": 21.64,
  "refund": {
    "method": "cash",
    "amount": 21.64
  },
  "notes": "Item had manufacturing defect",
  "created_by": 1,
  "created_at": "2026-01-30T10:30:00Z"
}
```

### Return Reasons

| Reason | Description |
|--------|-------------|
| `defective` | Product has defect or damage |
| `wrong_item` | Wrong item sold/received |
| `not_needed` | Customer no longer needs item |
| `price_match` | Price adjustment/match |
| `other` | Other reason (notes required) |

---

## Process Exchange

Process an exchange transaction.

```
POST /api/transactions/exchange
```

### Required Permission

`process_return`

### Request Body

```json
{
  "original_transaction_id": 456,
  "return_items": [
    {
      "product_id": 1,
      "quantity": 1,
      "reason": "wrong_item"
    }
  ],
  "new_items": [
    {
      "product_id": 2,
      "quantity": 1,
      "price": 24.99
    }
  ],
  "payment": {
    "method": "card",
    "amount": 5.43
  }
}
```

### Response

**201 Created**

Returns exchange transaction with both returned and new items.

---

## Void Transaction

Void a completed transaction.

```
POST /api/transactions/{id}/void
```

### Required Permission

`void_transaction`

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Transaction ID |

### Request Body

```json
{
  "reason": "Customer changed mind",
  "manager_override": false
}
```

### Request Example

```bash
curl -X POST "http://localhost:8923/api/transactions/456/void" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Customer changed mind"}'
```

### Response

**200 OK**

```json
{
  "id": 456,
  "transaction_number": "TXN-2026-01-30-0456",
  "status": "voided",
  "void_reason": "Customer changed mind",
  "voided_by": 1,
  "voided_at": "2026-01-30T10:45:00Z",
  "inventory_restored": true
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `ALREADY_VOIDED` | Transaction already voided |
| 400 | `RETURN_EXISTS` | Cannot void - return exists for this transaction |
| 403 | `FORBIDDEN` | Missing permission or requires manager override |

---

## Apply Discount

Apply a discount to a pending transaction.

```
POST /api/transactions/{id}/discount
```

### Required Permission

`apply_discount`

### Request Body

```json
{
  "type": "percentage",
  "value": 10,
  "reason": "Loyalty customer",
  "item_id": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | `percentage` or `fixed` |
| `value` | decimal | Discount value |
| `reason` | string | Reason for discount |
| `item_id` | integer | Apply to specific item (null = entire transaction) |

### Response

**200 OK**

Returns updated transaction with discount applied.

### Notes

- Discounts over a threshold may require manager approval
- Discount limits configured in system settings
- All discounts logged in audit trail

---

## Get Daily Summary

Get sales summary for a specific date.

```
GET /api/transactions/summary
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `date` | string | No | Date (YYYY-MM-DD), defaults to today |
| `station_id` | integer | No | Filter by station |

### Request Example

```bash
curl -X GET "http://localhost:8923/api/transactions/summary?date=2026-01-30" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "date": "2026-01-30",
  "summary": {
    "total_sales": 15420.50,
    "total_returns": 342.00,
    "net_sales": 15078.50,
    "total_tax": 1243.47,
    "total_discounts": 245.00,
    "transaction_count": 156,
    "return_count": 4,
    "average_transaction": 98.85,
    "items_sold": 423
  },
  "by_payment_method": {
    "cash": {
      "count": 45,
      "total": 3250.00
    },
    "card": {
      "count": 98,
      "total": 10450.50
    },
    "other": {
      "count": 13,
      "total": 1720.00
    }
  },
  "by_category": {
    "caps": {
      "count": 89,
      "total": 2450.00
    },
    "parts": {
      "count": 234,
      "total": 9870.50
    },
    "paint": {
      "count": 67,
      "total": 2340.00
    },
    "equipment": {
      "count": 33,
      "total": 760.00
    }
  },
  "by_station": [
    {
      "station_id": 1,
      "station_name": "Register 1",
      "transaction_count": 78,
      "total": 8450.25
    },
    {
      "station_id": 2,
      "station_name": "Register 2",
      "transaction_count": 78,
      "total": 6970.25
    }
  ],
  "by_hour": [
    { "hour": 8, "count": 12, "total": 850.00 },
    { "hour": 9, "count": 18, "total": 1420.00 },
    { "hour": 10, "count": 22, "total": 1780.00 }
  ]
}
```

---

## Print Receipt

Get receipt data or trigger print.

```
GET /api/transactions/{id}/receipt
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | Output format: `json` (default), `html`, `text`, `escpos` |
| `print` | boolean | Trigger print to default printer |
| `printer_id` | integer | Specific printer ID (if print=true) |

### Request Example

```bash
# Get receipt data as JSON
curl -X GET "http://localhost:8923/api/transactions/456/receipt" \
  -H "Authorization: Bearer <token>"

# Get HTML receipt
curl -X GET "http://localhost:8923/api/transactions/456/receipt?format=html" \
  -H "Authorization: Bearer <token>"

# Print receipt
curl -X GET "http://localhost:8923/api/transactions/456/receipt?print=true" \
  -H "Authorization: Bearer <token>"
```

### Response (JSON format)

**200 OK**

```json
{
  "header": {
    "store_name": "Acme Auto Parts",
    "store_address": "123 Main St",
    "store_phone": "(555) 123-4567",
    "logo_url": "/assets/logo.png"
  },
  "transaction": {
    "number": "TXN-2026-01-30-0456",
    "date": "2026-01-30",
    "time": "09:15:23",
    "cashier": "John Smith"
  },
  "customer": {
    "name": "Jane Doe",
    "loyalty_points": 150
  },
  "items": [
    {
      "name": "Red Baseball Cap",
      "sku": "CAP-RED-001",
      "quantity": 2,
      "price": 19.99,
      "total": 39.98
    }
  ],
  "totals": {
    "subtotal": 39.98,
    "discount": 0,
    "tax": 3.30,
    "total": 43.28
  },
  "payment": {
    "method": "Cash",
    "tender": 50.00,
    "change": 6.72
  },
  "footer": {
    "message": "Thank you for your business!",
    "return_policy": "Returns within 30 days with receipt"
  },
  "barcode": "TXN202601300456"
}
```

---

## Transaction Data Models

### Transaction Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique transaction ID |
| `transaction_number` | string | Human-readable transaction number |
| `type` | string | `sale`, `return`, `exchange` |
| `status` | string | `pending`, `completed`, `voided` |
| `customer_id` | integer | Associated customer (optional) |
| `items` | array | Line items |
| `subtotal` | decimal | Pre-tax total |
| `discount_total` | decimal | Total discounts applied |
| `tax_total` | decimal | Total tax |
| `total` | decimal | Final total |
| `payment` | object | Payment information |
| `station_id` | integer | POS station |
| `created_by` | integer | Cashier user ID |
| `created_at` | datetime | Transaction timestamp |

### Transaction Item Object

| Field | Type | Description |
|-------|------|-------------|
| `product_id` | integer | Product ID |
| `product_name` | string | Product name |
| `barcode` | string | Product barcode |
| `sku` | string | Product SKU |
| `quantity` | integer | Quantity sold |
| `unit_price` | decimal | Price per unit |
| `discount` | decimal | Item discount |
| `tax` | decimal | Item tax |
| `subtotal` | decimal | Pre-tax line total |
| `total` | decimal | Line total with tax |

### Payment Object

| Field | Type | Description |
|-------|------|-------------|
| `method` | string | `cash`, `card`, `check`, `gift_card`, `store_credit` |
| `amount` | decimal | Amount paid |
| `tender` | decimal | Amount tendered (cash) |
| `change` | decimal | Change given (cash) |
| `reference` | string | Payment reference (card auth, check number) |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Transaction not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `INSUFFICIENT_STOCK` | 409 | Not enough inventory |
| `ALREADY_VOIDED` | 400 | Transaction already voided |
| `RETURN_EXISTS` | 400 | Cannot void - return exists |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Related Documentation

- [Product Endpoints](./products.md) - Product management
- [Customer Endpoints](./customers.md) - Customer management
- [Inventory Endpoints](./inventory.md) - Stock management
- [API Overview](./README.md) - Authentication and general info
