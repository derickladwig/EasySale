# Inventory Endpoints

API reference for inventory and stock management operations.

**Base URL**: `http://localhost:3000/api`

**Authentication**: All endpoints require JWT Bearer token

---

## Get Inventory Status

Get current inventory levels for products.

```
GET /api/inventory
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by product name, barcode, SKU |
| `category` | string | No | Filter by category |
| `location` | string | No | Filter by stock location |
| `low_stock` | boolean | No | Filter to low stock items only |
| `out_of_stock` | boolean | No | Filter to out of stock items only |
| `limit` | integer | No | Results per page (default: 50, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/inventory?low_stock=true&category=caps" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "items": [
    {
      "product_id": 1,
      "product_name": "Red Baseball Cap",
      "barcode": "123456789012",
      "sku": "CAP-RED-001",
      "category": "caps",
      "total_stock": 50,
      "available_stock": 48,
      "reserved_stock": 2,
      "min_stock": 10,
      "max_stock": 100,
      "reorder_point": 15,
      "reorder_quantity": 50,
      "stock_status": "in_stock",
      "unit": "each",
      "cost": 8.50,
      "stock_value": 425.00,
      "locations": [
        {
          "location_id": 1,
          "location_name": "Main Floor",
          "aisle": "A",
          "shelf": "3",
          "bin": "A3-01",
          "quantity": 35
        },
        {
          "location_id": 2,
          "location_name": "Backroom",
          "quantity": 15
        }
      ],
      "last_received": "2026-01-15T10:30:00Z",
      "last_sold": "2026-01-29T14:22:00Z",
      "last_count": "2026-01-01T08:00:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "summary": {
    "total_items": 1,
    "low_stock_items": 0,
    "out_of_stock_items": 0,
    "total_stock_value": 425.00
  }
}
```

---

## Get Product Inventory

Get detailed inventory for a specific product.

```
GET /api/inventory/{product_id}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `product_id` | integer | Product ID |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/inventory/1" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "product_id": 1,
  "product_name": "Red Baseball Cap",
  "barcode": "123456789012",
  "sku": "CAP-RED-001",
  "total_stock": 50,
  "available_stock": 48,
  "reserved_stock": 2,
  "min_stock": 10,
  "max_stock": 100,
  "locations": [
    {
      "location_id": 1,
      "location_name": "Main Floor",
      "aisle": "A",
      "shelf": "3",
      "bin": "A3-01",
      "quantity": 35,
      "reserved": 2
    },
    {
      "location_id": 2,
      "location_name": "Backroom",
      "quantity": 15,
      "reserved": 0
    }
  ],
  "reservations": [
    {
      "id": 1,
      "quantity": 2,
      "type": "layaway",
      "reference": "LAY-2026-01-25-001",
      "customer_name": "John Doe",
      "expires_at": "2026-02-25T00:00:00Z"
    }
  ],
  "pending_receipts": [
    {
      "po_number": "PO-2026-001",
      "expected_quantity": 50,
      "expected_date": "2026-02-01"
    }
  ],
  "movement_history": [
    {
      "id": 101,
      "type": "sale",
      "quantity": -2,
      "reference": "TXN-2026-01-29-0456",
      "created_at": "2026-01-29T14:22:00Z"
    },
    {
      "id": 100,
      "type": "receipt",
      "quantity": 25,
      "reference": "RCV-2026-01-15-001",
      "created_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```

---

## Adjust Inventory

Record an inventory adjustment (count, damage, loss, etc.).

```
POST /api/inventory/adjustments
```

### Required Permission

`adjust_inventory`

### Request Body

```json
{
  "product_id": 1,
  "location_id": 1,
  "old_quantity": 100,
  "new_quantity": 95,
  "reason": "damaged",
  "notes": "Water damage from roof leak - 5 units destroyed"
}
```

### Adjustment Reasons

| Reason | Description |
|--------|-------------|
| `count` | Physical count correction |
| `damaged` | Items damaged and removed |
| `lost` | Items lost or missing |
| `found` | Items found (positive adjustment) |
| `theft` | Items stolen |
| `expired` | Items expired and removed |
| `transfer_out` | Transferred to another location |
| `transfer_in` | Received from another location |
| `vendor_return` | Returned to vendor |
| `other` | Other reason (notes required) |

### Request Example

```bash
curl -X POST "http://localhost:3000/api/inventory/adjustments" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "old_quantity": 100,
    "new_quantity": 95,
    "reason": "damaged",
    "notes": "Water damage from roof leak"
  }'
```

### Response

**201 Created**

```json
{
  "id": 789,
  "product_id": 1,
  "product_name": "Red Baseball Cap",
  "location_id": 1,
  "location_name": "Main Floor",
  "old_quantity": 100,
  "new_quantity": 95,
  "difference": -5,
  "reason": "damaged",
  "notes": "Water damage from roof leak",
  "cost_impact": -42.50,
  "created_by": 1,
  "created_by_name": "admin",
  "created_at": "2026-01-30T09:15:00Z"
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 403 | `FORBIDDEN` | Missing `adjust_inventory` permission |
| 404 | `NOT_FOUND` | Product or location not found |
| 409 | `QUANTITY_MISMATCH` | Current quantity doesn't match old_quantity |

---

## Receive Stock

Record incoming stock from a purchase order or vendor.

```
POST /api/inventory/receive
```

### Required Permission

`receive_stock`

### Request Body

```json
{
  "po_number": "PO-2026-001",
  "vendor_id": 1,
  "location_id": 2,
  "items": [
    {
      "product_id": 1,
      "quantity": 50,
      "cost": 8.50,
      "lot_number": "LOT-2026-001",
      "expiration_date": null
    },
    {
      "product_id": 2,
      "quantity": 25,
      "cost": 12.00
    }
  ],
  "notes": "Received in good condition"
}
```

### Request Example

```bash
curl -X POST "http://localhost:3000/api/inventory/receive" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "po_number": "PO-2026-001",
    "location_id": 2,
    "items": [
      {
        "product_id": 1,
        "quantity": 50,
        "cost": 8.50
      }
    ]
  }'
```

### Response

**201 Created**

```json
{
  "id": 456,
  "receipt_number": "RCV-2026-01-30-0456",
  "po_number": "PO-2026-001",
  "vendor_id": 1,
  "vendor_name": "Cap Supplier Inc",
  "location_id": 2,
  "location_name": "Backroom",
  "items": [
    {
      "product_id": 1,
      "product_name": "Red Baseball Cap",
      "quantity": 50,
      "cost": 8.50,
      "line_total": 425.00,
      "new_stock_level": 100
    }
  ],
  "total_items": 50,
  "total_cost": 425.00,
  "created_by": 1,
  "created_at": "2026-01-30T10:00:00Z"
}
```

---

## Transfer Stock

Transfer stock between locations.

```
POST /api/inventory/transfer
```

### Required Permission

`adjust_inventory`

### Request Body

```json
{
  "product_id": 1,
  "from_location_id": 2,
  "to_location_id": 1,
  "quantity": 10,
  "notes": "Restocking main floor"
}
```

### Request Example

```bash
curl -X POST "http://localhost:3000/api/inventory/transfer" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 1,
    "from_location_id": 2,
    "to_location_id": 1,
    "quantity": 10
  }'
```

### Response

**201 Created**

```json
{
  "id": 123,
  "transfer_number": "TRF-2026-01-30-0123",
  "product_id": 1,
  "product_name": "Red Baseball Cap",
  "from_location": {
    "id": 2,
    "name": "Backroom",
    "old_quantity": 15,
    "new_quantity": 5
  },
  "to_location": {
    "id": 1,
    "name": "Main Floor",
    "old_quantity": 35,
    "new_quantity": 45
  },
  "quantity": 10,
  "notes": "Restocking main floor",
  "created_by": 1,
  "created_at": "2026-01-30T10:15:00Z"
}
```

---

## Cycle Count

Start or update a cycle count.

```
POST /api/inventory/cycle-count
```

### Required Permission

`adjust_inventory`

### Request Body

```json
{
  "location_id": 1,
  "category": "caps",
  "counts": [
    {
      "product_id": 1,
      "counted_quantity": 34,
      "notes": "One item damaged"
    },
    {
      "product_id": 2,
      "counted_quantity": 28
    }
  ]
}
```

### Request Example

```bash
curl -X POST "http://localhost:3000/api/inventory/cycle-count" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "location_id": 1,
    "counts": [
      {
        "product_id": 1,
        "counted_quantity": 34
      }
    ]
  }'
```

### Response

**201 Created**

```json
{
  "id": 45,
  "count_number": "CNT-2026-01-30-0045",
  "location_id": 1,
  "location_name": "Main Floor",
  "status": "completed",
  "results": [
    {
      "product_id": 1,
      "product_name": "Red Baseball Cap",
      "system_quantity": 35,
      "counted_quantity": 34,
      "variance": -1,
      "variance_value": -8.50,
      "adjustment_created": true,
      "adjustment_id": 790
    }
  ],
  "summary": {
    "items_counted": 1,
    "items_with_variance": 1,
    "total_variance": -1,
    "total_variance_value": -8.50
  },
  "created_by": 1,
  "created_at": "2026-01-30T08:00:00Z"
}
```

---

## Get Stock Locations

List all stock locations.

```
GET /api/inventory/locations
```

### Request Example

```bash
curl -X GET "http://localhost:3000/api/inventory/locations" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "locations": [
    {
      "id": 1,
      "name": "Main Floor",
      "type": "sales_floor",
      "description": "Main retail floor",
      "address": null,
      "aisles": ["A", "B", "C", "D"],
      "total_items": 1250,
      "total_stock_value": 45000.00,
      "active": true
    },
    {
      "id": 2,
      "name": "Backroom",
      "type": "warehouse",
      "description": "Storage and receiving",
      "address": null,
      "total_items": 3500,
      "total_stock_value": 125000.00,
      "active": true
    }
  ]
}
```

### Create Location

```
POST /api/inventory/locations
```

### Request Body

```json
{
  "name": "Overflow Storage",
  "type": "warehouse",
  "description": "Additional storage area"
}
```

---

## Get Adjustment History

Get history of inventory adjustments.

```
GET /api/inventory/adjustments
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_id` | integer | No | Filter by product |
| `location_id` | integer | No | Filter by location |
| `reason` | string | No | Filter by reason |
| `start_date` | string | No | Filter by start date |
| `end_date` | string | No | Filter by end date |
| `created_by` | integer | No | Filter by user |
| `limit` | integer | No | Results per page (default: 50) |
| `offset` | integer | No | Pagination offset |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/inventory/adjustments?reason=damaged&start_date=2026-01-01" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "adjustments": [
    {
      "id": 789,
      "product_id": 1,
      "product_name": "Red Baseball Cap",
      "location_id": 1,
      "location_name": "Main Floor",
      "old_quantity": 100,
      "new_quantity": 95,
      "difference": -5,
      "reason": "damaged",
      "notes": "Water damage from roof leak",
      "cost_impact": -42.50,
      "created_by": 1,
      "created_by_name": "admin",
      "created_at": "2026-01-30T09:15:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0,
  "summary": {
    "total_adjustments": 1,
    "total_cost_impact": -42.50
  }
}
```

---

## Low Stock Report

Get items at or below reorder point.

```
GET /api/inventory/low-stock
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category |
| `location_id` | integer | No | Filter by location |
| `include_zero` | boolean | No | Include out of stock items |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/inventory/low-stock" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "items": [
    {
      "product_id": 5,
      "product_name": "Blue Baseball Cap",
      "barcode": "123456789015",
      "sku": "CAP-BLUE-001",
      "category": "caps",
      "current_stock": 8,
      "min_stock": 10,
      "reorder_point": 15,
      "reorder_quantity": 50,
      "suggested_order": 50,
      "vendor_id": 1,
      "vendor_name": "Cap Supplier Inc",
      "cost": 8.50,
      "order_value": 425.00,
      "days_until_stockout": 4,
      "average_daily_sales": 2.1
    }
  ],
  "total": 1,
  "total_suggested_order_value": 425.00
}
```

---

## Stock Valuation Report

Get inventory valuation by various methods.

```
GET /api/inventory/valuation
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `method` | string | No | Valuation method: fifo, lifo, average (default: average) |
| `category` | string | No | Filter by category |
| `location_id` | integer | No | Filter by location |
| `as_of_date` | string | No | Valuation as of date |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/inventory/valuation?method=average" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "valuation_method": "average",
  "as_of_date": "2026-01-30",
  "summary": {
    "total_items": 5420,
    "total_units": 125000,
    "total_cost_value": 450000.00,
    "total_retail_value": 875000.00,
    "gross_margin_percent": 48.57
  },
  "by_category": [
    {
      "category": "caps",
      "units": 15000,
      "cost_value": 127500.00,
      "retail_value": 299850.00
    },
    {
      "category": "parts",
      "units": 85000,
      "cost_value": 255000.00,
      "retail_value": 425150.00
    }
  ],
  "by_location": [
    {
      "location_id": 1,
      "location_name": "Main Floor",
      "units": 45000,
      "cost_value": 162000.00
    },
    {
      "location_id": 2,
      "location_name": "Backroom",
      "units": 80000,
      "cost_value": 288000.00
    }
  ]
}
```

---

## Movement History

Get stock movement history for a product.

```
GET /api/inventory/movements
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `product_id` | integer | No | Filter by product |
| `location_id` | integer | No | Filter by location |
| `type` | string | No | Filter by movement type |
| `start_date` | string | No | Filter by start date |
| `end_date` | string | No | Filter by end date |
| `limit` | integer | No | Results per page (default: 50) |
| `offset` | integer | No | Pagination offset |

### Movement Types

| Type | Description |
|------|-------------|
| `sale` | Sold to customer |
| `return` | Returned by customer |
| `receipt` | Received from vendor |
| `adjustment` | Manual adjustment |
| `transfer` | Location transfer |
| `count` | Cycle count correction |

### Response

**200 OK**

```json
{
  "movements": [
    {
      "id": 1001,
      "product_id": 1,
      "product_name": "Red Baseball Cap",
      "location_id": 1,
      "location_name": "Main Floor",
      "type": "sale",
      "quantity": -2,
      "running_balance": 48,
      "reference_type": "transaction",
      "reference_id": 456,
      "reference_number": "TXN-2026-01-29-0456",
      "created_by": 1,
      "created_at": "2026-01-29T14:22:00Z"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

---

## Data Models

### Inventory Item

| Field | Type | Description |
|-------|------|-------------|
| `product_id` | integer | Product ID |
| `total_stock` | integer | Total stock across all locations |
| `available_stock` | integer | Stock available for sale |
| `reserved_stock` | integer | Stock reserved (layaways, etc.) |
| `min_stock` | integer | Minimum stock level |
| `max_stock` | integer | Maximum stock level |
| `reorder_point` | integer | Reorder threshold |
| `reorder_quantity` | integer | Suggested reorder quantity |
| `stock_status` | string | in_stock, low_stock, out_of_stock |
| `cost` | decimal | Unit cost |
| `stock_value` | decimal | Total stock value |

### Stock Location

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Location ID |
| `name` | string | Location name |
| `type` | string | sales_floor, warehouse, transit |
| `description` | string | Description |
| `address` | string | Physical address (if different) |
| `active` | boolean | Active status |

### Adjustment

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Adjustment ID |
| `product_id` | integer | Product ID |
| `location_id` | integer | Location ID |
| `old_quantity` | integer | Quantity before adjustment |
| `new_quantity` | integer | Quantity after adjustment |
| `difference` | integer | Change amount |
| `reason` | string | Adjustment reason |
| `notes` | string | Additional notes |
| `cost_impact` | decimal | Financial impact |
| `created_by` | integer | User who made adjustment |
| `created_at` | datetime | Timestamp |

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Product or location not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `QUANTITY_MISMATCH` | 409 | Current quantity doesn't match expected |
| `INSUFFICIENT_STOCK` | 409 | Not enough stock for operation |

---

## Related Documentation

- [Product Endpoints](./products.md) - Product management
- [Transaction Endpoints](./transactions.md) - Sales affecting inventory
- [API Overview](./README.md) - Authentication and general info
