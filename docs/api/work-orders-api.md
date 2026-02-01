# Work Orders API

## Overview

The Work Orders API provides endpoints for managing service work orders, including creation, updates, completion, and automatic invoice generation.

**Base URL**: `/api/work-orders`

**Authentication**: Required (Bearer token)

**Module**: `workOrders` must be enabled

## Endpoints

### List Work Orders

```http
GET /api/work-orders
```

Retrieve a list of work orders with optional filtering.

**Query Parameters**:
- `status` (optional): Filter by status (draft, scheduled, in_progress, completed, cancelled)
- `customer_id` (optional): Filter by customer ID
- `assigned_to` (optional): Filter by assigned user ID
- `from_date` (optional): Filter by date range start (ISO 8601)
- `to_date` (optional): Filter by date range end (ISO 8601)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

**Response** (200 OK):
```json
{
  "work_orders": [
    {
      "id": 1,
      "tenant_id": "tenant_default",
      "work_order_number": "WO-2026-0001",
      "customer_id": 123,
      "customer_name": "John Doe",
      "description": "Replace brake pads",
      "status": "in_progress",
      "priority": "high",
      "assigned_to": 5,
      "assigned_to_name": "Jane Smith",
      "due_date": "2026-02-05T17:00:00Z",
      "invoiced_at": null,
      "created_at": "2026-01-30T10:00:00Z",
      "updated_at": "2026-01-30T14:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

---

### Get Work Order

```http
GET /api/work-orders/{id}
```

Retrieve a specific work order with line items.

**Path Parameters**:
- `id` (required): Work order ID

**Response** (200 OK):
```json
{
  "id": 1,
  "tenant_id": "tenant_default",
  "work_order_number": "WO-2026-0001",
  "customer_id": 123,
  "customer": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "555-0123"
  },
  "description": "Replace brake pads",
  "status": "in_progress",
  "priority": "high",
  "assigned_to": 5,
  "assigned_to_name": "Jane Smith",
  "due_date": "2026-02-05T17:00:00Z",
  "line_items": [
    {
      "id": 1,
      "type": "part",
      "product_id": 456,
      "description": "Brake pad set",
      "quantity": 1,
      "unit_price": 89.99,
      "line_total": 89.99
    },
    {
      "id": 2,
      "type": "labor",
      "description": "Brake pad installation",
      "quantity": 2,
      "unit_price": 75.00,
      "line_total": 150.00
    }
  ],
  "subtotal": 239.99,
  "tax_amount": 19.20,
  "total_amount": 259.19,
  "notes": "Customer requested OEM parts",
  "invoiced_at": null,
  "invoice_id": null,
  "created_at": "2026-01-30T10:00:00Z",
  "updated_at": "2026-01-30T14:30:00Z"
}
```

**Errors**:
- `404 Not Found`: Work order not found
- `403 Forbidden`: Module not enabled or insufficient permissions

---

### Create Work Order

```http
POST /api/work-orders
```

Create a new work order.

**Request Body**:
```json
{
  "customer_id": 123,
  "description": "Replace brake pads",
  "status": "scheduled",
  "priority": "high",
  "assigned_to": 5,
  "due_date": "2026-02-05T17:00:00Z",
  "line_items": [
    {
      "type": "part",
      "product_id": 456,
      "description": "Brake pad set",
      "quantity": 1,
      "unit_price": 89.99
    },
    {
      "type": "labor",
      "description": "Brake pad installation",
      "quantity": 2,
      "unit_price": 75.00
    }
  ],
  "notes": "Customer requested OEM parts"
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "work_order_number": "WO-2026-0001",
  "status": "scheduled",
  "created_at": "2026-01-30T10:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Invalid request data
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Customer or product not found

---

### Update Work Order

```http
PUT /api/work-orders/{id}
```

Update an existing work order.

**Path Parameters**:
- `id` (required): Work order ID

**Request Body**: Same as Create Work Order (all fields optional)

**Response** (200 OK):
```json
{
  "id": 1,
  "work_order_number": "WO-2026-0001",
  "status": "in_progress",
  "updated_at": "2026-01-30T14:30:00Z"
}
```

**Errors**:
- `400 Bad Request`: Invalid request data
- `403 Forbidden`: Insufficient permissions or work order already invoiced
- `404 Not Found`: Work order not found

---

### Complete Work Order

```http
POST /api/work-orders/{id}/complete
```

Mark work order as completed and automatically generate invoice.

**Path Parameters**:
- `id` (required): Work order ID

**Request Body** (optional):
```json
{
  "completion_notes": "Work completed successfully",
  "actual_hours": 2.5
}
```

**Response** (200 OK):
```json
{
  "work_order_id": 1,
  "status": "completed",
  "invoice_id": 42,
  "invoice_number": "INV-2026-0042",
  "invoiced_at": "2026-01-30T16:00:00Z",
  "inventory_reduced": true
}
```

**Errors**:
- `400 Bad Request`: Work order already completed or invalid state
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Work order not found
- `500 Internal Server Error`: Invoice generation failed

---

### Create Invoice from Work Order

```http
POST /api/work-orders/{id}/invoice
```

Manually create invoice from work order (if auto-generation failed or disabled).

**Path Parameters**:
- `id` (required): Work order ID

**Response** (201 Created):
```json
{
  "invoice_id": 42,
  "invoice_number": "INV-2026-0042",
  "total_amount": 259.19,
  "created_at": "2026-01-30T16:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Work order not completed or already invoiced
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Work order not found

---

### Cancel Work Order

```http
POST /api/work-orders/{id}/cancel
```

Cancel a work order and release reserved parts.

**Path Parameters**:
- `id` (required): Work order ID

**Request Body**:
```json
{
  "reason": "Customer cancelled appointment"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "status": "cancelled",
  "cancelled_at": "2026-01-30T16:00:00Z"
}
```

**Errors**:
- `400 Bad Request`: Work order already completed or invoiced
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Work order not found

---

## Data Models

### Work Order Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique identifier |
| `tenant_id` | string | Tenant identifier |
| `work_order_number` | string | Human-readable work order number |
| `customer_id` | integer | Customer ID |
| `description` | string | Work description |
| `status` | string | Status (draft, scheduled, in_progress, completed, cancelled) |
| `priority` | string | Priority (low, medium, high, urgent) |
| `assigned_to` | integer | Assigned user ID |
| `due_date` | string | Due date (ISO 8601) |
| `invoiced_at` | string | Invoice creation timestamp (ISO 8601) |
| `invoice_id` | integer | Related invoice ID |
| `notes` | string | Additional notes |
| `created_at` | string | Creation timestamp (ISO 8601) |
| `updated_at` | string | Last update timestamp (ISO 8601) |

### Line Item Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique identifier |
| `type` | string | Item type (part, labor) |
| `product_id` | integer | Product ID (for parts) |
| `description` | string | Item description |
| `quantity` | number | Quantity |
| `unit_price` | number | Price per unit |
| `line_total` | number | Total for line item |

---

## Permissions

Required permissions for work order operations:

- `view_work_orders`: View work order list and details
- `create_work_order`: Create new work orders
- `edit_work_order`: Edit existing work orders
- `complete_work_order`: Mark work orders as complete
- `cancel_work_order`: Cancel work orders
- `delete_work_order`: Delete work orders (admin only)

---

## Examples

### Create and Complete Work Order

```bash
# 1. Create work order
curl -X POST http://localhost:7945/api/work-orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "customer_id": 123,
    "description": "Oil change",
    "status": "scheduled",
    "line_items": [
      {
        "type": "part",
        "product_id": 789,
        "description": "Motor oil 5W-30",
        "quantity": 5,
        "unit_price": 8.99
      },
      {
        "type": "labor",
        "description": "Oil change service",
        "quantity": 0.5,
        "unit_price": 75.00
      }
    ]
  }'

# 2. Start work
curl -X PUT http://localhost:7945/api/work-orders/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}'

# 3. Complete work (generates invoice automatically)
curl -X POST http://localhost:7945/api/work-orders/1/complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"completion_notes": "Service completed"}'
```

---

*Last updated: 2026-01-30*
