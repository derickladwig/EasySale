# Product Endpoints

API reference for product management operations.

**Base URL**: `http://localhost:3000/api`

**Authentication**: All endpoints require JWT Bearer token

---

## List Products

Retrieve a paginated list of products with optional filtering.

```
GET /api/products
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search by name, barcode, SKU |
| `category` | string | No | Filter by category |
| `barcode` | string | No | Filter by exact barcode |
| `sku` | string | No | Filter by exact SKU |
| `in_stock` | boolean | No | Filter to only in-stock items |
| `low_stock` | boolean | No | Filter to low stock items |
| `limit` | integer | No | Results per page (default: 50, max: 100) |
| `offset` | integer | No | Pagination offset (default: 0) |
| `sort` | string | No | Sort field (name, price, stock, created_at) |
| `order` | string | No | Sort order (asc, desc) |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/products?search=cap&category=caps&limit=25" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "products": [
    {
      "id": 1,
      "name": "Red Baseball Cap",
      "barcode": "123456789012",
      "sku": "CAP-RED-001",
      "category": "caps",
      "description": "Classic red baseball cap with adjustable strap",
      "price": 19.99,
      "cost": 8.50,
      "stock": 50,
      "min_stock": 10,
      "max_stock": 100,
      "unit": "each",
      "tax_rate": 0.0825,
      "taxable": true,
      "active": true,
      "attributes": {
        "size": "One Size",
        "color": "Red",
        "brand": "CAPS",
        "material": "Cotton"
      },
      "images": [
        {
          "url": "/assets/products/cap-red-001.jpg",
          "primary": true
        }
      ],
      "created_at": "2026-01-15T10:30:00Z",
      "updated_at": "2026-01-28T14:22:00Z"
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

## Get Product

Retrieve a single product by ID.

```
GET /api/products/{id}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Product ID |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/products/1" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "id": 1,
  "name": "Red Baseball Cap",
  "barcode": "123456789012",
  "sku": "CAP-RED-001",
  "category": "caps",
  "description": "Classic red baseball cap with adjustable strap",
  "price": 19.99,
  "cost": 8.50,
  "stock": 50,
  "min_stock": 10,
  "max_stock": 100,
  "unit": "each",
  "tax_rate": 0.0825,
  "taxable": true,
  "active": true,
  "attributes": {
    "size": "One Size",
    "color": "Red",
    "brand": "CAPS",
    "material": "Cotton"
  },
  "images": [
    {
      "url": "/assets/products/cap-red-001.jpg",
      "primary": true
    }
  ],
  "pricing_tiers": [
    {
      "tier": "retail",
      "price": 19.99
    },
    {
      "tier": "wholesale",
      "price": 14.99
    }
  ],
  "stock_locations": [
    {
      "location": "Main Floor",
      "aisle": "A",
      "shelf": "3",
      "quantity": 35
    },
    {
      "location": "Backroom",
      "quantity": 15
    }
  ],
  "created_at": "2026-01-15T10:30:00Z",
  "updated_at": "2026-01-28T14:22:00Z"
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 404 | `NOT_FOUND` | Product not found |

---

## Get Product by Barcode

Retrieve a product by its barcode (optimized for scanner input).

```
GET /api/products/barcode/{barcode}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `barcode` | string | Product barcode (UPC, EAN, etc.) |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/products/barcode/123456789012" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

Returns same structure as Get Product.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 404 | `NOT_FOUND` | Product with barcode not found |

---

## Create Product

Create a new product.

```
POST /api/products
```

### Required Permission

`manage_products`

### Request Body

```json
{
  "name": "Blue Baseball Cap",
  "barcode": "123456789013",
  "sku": "CAP-BLUE-001",
  "category": "caps",
  "description": "Classic blue baseball cap with adjustable strap",
  "price": 19.99,
  "cost": 8.50,
  "stock": 25,
  "min_stock": 10,
  "max_stock": 100,
  "unit": "each",
  "tax_rate": 0.0825,
  "taxable": true,
  "attributes": {
    "size": "One Size",
    "color": "Blue",
    "brand": "CAPS"
  }
}
```

### Request Example

```bash
curl -X POST "http://localhost:3000/api/products" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Blue Baseball Cap",
    "barcode": "123456789013",
    "sku": "CAP-BLUE-001",
    "category": "caps",
    "price": 19.99,
    "stock": 25
  }'
```

### Response

**201 Created**

```json
{
  "id": 2,
  "name": "Blue Baseball Cap",
  "barcode": "123456789013",
  "sku": "CAP-BLUE-001",
  "category": "caps",
  "description": null,
  "price": 19.99,
  "cost": null,
  "stock": 25,
  "min_stock": 0,
  "max_stock": null,
  "unit": "each",
  "tax_rate": 0.0825,
  "taxable": true,
  "active": true,
  "attributes": {},
  "images": [],
  "created_at": "2026-01-30T09:15:00Z",
  "updated_at": "2026-01-30T09:15:00Z"
}
```

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 403 | `FORBIDDEN` | Missing `manage_products` permission |
| 409 | `CONFLICT` | Barcode or SKU already exists |

---

## Update Product

Update an existing product.

```
PUT /api/products/{id}
```

### Required Permission

`manage_products`

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Product ID |

### Request Body

Only include fields to update:

```json
{
  "price": 24.99,
  "description": "Premium blue baseball cap with embroidered logo"
}
```

### Request Example

```bash
curl -X PUT "http://localhost:3000/api/products/2" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 24.99,
    "description": "Premium blue baseball cap with embroidered logo"
  }'
```

### Response

**200 OK**

Returns updated product (same structure as Get Product).

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 403 | `FORBIDDEN` | Missing `manage_products` permission |
| 404 | `NOT_FOUND` | Product not found |
| 409 | `CONFLICT` | Barcode or SKU already exists |

---

## Delete Product

Delete (deactivate) a product.

```
DELETE /api/products/{id}
```

### Required Permission

`manage_products`

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | integer | Product ID |

### Request Example

```bash
curl -X DELETE "http://localhost:3000/api/products/2" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "message": "Product deleted successfully",
  "id": 2
}
```

**Note**: Products are soft-deleted (marked inactive) rather than permanently removed to preserve transaction history.

### Error Responses

| Status | Code | Description |
|--------|------|-------------|
| 401 | `UNAUTHORIZED` | Invalid or missing token |
| 403 | `FORBIDDEN` | Missing `manage_products` permission |
| 404 | `NOT_FOUND` | Product not found |

---

## Search Products

Advanced product search with multiple criteria.

```
POST /api/products/search
```

### Request Body

```json
{
  "query": "baseball cap",
  "filters": {
    "categories": ["caps"],
    "price_min": 10,
    "price_max": 50,
    "in_stock": true,
    "brands": ["CAPS", "Nike"]
  },
  "sort": {
    "field": "price",
    "order": "asc"
  },
  "pagination": {
    "limit": 25,
    "offset": 0
  }
}
```

### Request Example

```bash
curl -X POST "http://localhost:3000/api/products/search" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "red",
    "filters": {
      "categories": ["caps"],
      "in_stock": true
    }
  }'
```

### Response

**200 OK**

```json
{
  "products": [...],
  "total": 15,
  "limit": 25,
  "offset": 0,
  "facets": {
    "categories": [
      { "value": "caps", "count": 12 },
      { "value": "accessories", "count": 3 }
    ],
    "brands": [
      { "value": "CAPS", "count": 8 },
      { "value": "Nike", "count": 7 }
    ]
  }
}
```

---

## Bulk Import Products

Import multiple products from CSV or JSON.

```
POST /api/products/import
```

### Required Permission

`manage_products`

### Request (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | CSV or JSON file |
| `format` | string | No | File format (csv, json). Auto-detected if not provided |
| `update_existing` | boolean | No | Update products if barcode exists (default: false) |

### CSV Format

```csv
name,barcode,sku,category,price,cost,stock
Red Baseball Cap,123456789012,CAP-RED-001,caps,19.99,8.50,50
Blue Baseball Cap,123456789013,CAP-BLUE-001,caps,19.99,8.50,25
```

### Request Example

```bash
curl -X POST "http://localhost:3000/api/products/import" \
  -H "Authorization: Bearer <token>" \
  -F "file=@products.csv" \
  -F "update_existing=true"
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
      "barcode": "invalid",
      "error": "Invalid barcode format"
    },
    {
      "row": 23,
      "barcode": "123456789099",
      "error": "Duplicate barcode in import file"
    }
  ]
}
```

---

## Export Products

Export products to CSV or JSON.

```
GET /api/products/export
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `format` | string | No | Export format: csv (default), json |
| `category` | string | No | Filter by category |
| `active` | boolean | No | Filter by active status |

### Request Example

```bash
curl -X GET "http://localhost:3000/api/products/export?format=csv&category=caps" \
  -H "Authorization: Bearer <token>" \
  -o products.csv
```

### Response

**200 OK**

Returns file download with appropriate Content-Type header.

---

## Get Product Categories

List all product categories.

```
GET /api/products/categories
```

### Request Example

```bash
curl -X GET "http://localhost:3000/api/products/categories" \
  -H "Authorization: Bearer <token>"
```

### Response

**200 OK**

```json
{
  "categories": [
    {
      "id": "caps",
      "name": "Caps",
      "description": "Baseball caps, hats, and headwear",
      "product_count": 156
    },
    {
      "id": "parts",
      "name": "Auto Parts",
      "description": "Automotive parts and accessories",
      "product_count": 2340
    },
    {
      "id": "paint",
      "name": "Paint",
      "description": "Automotive paint and supplies",
      "product_count": 890
    },
    {
      "id": "equipment",
      "name": "Equipment",
      "description": "Tools and equipment",
      "product_count": 432
    }
  ]
}
```

---

## Product Data Models

### Product Object

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique product ID |
| `name` | string | Product name |
| `barcode` | string | Product barcode (UPC, EAN) |
| `sku` | string | Stock keeping unit |
| `category` | string | Product category |
| `description` | string | Product description |
| `price` | decimal | Retail price |
| `cost` | decimal | Cost/wholesale price |
| `stock` | integer | Current stock level |
| `min_stock` | integer | Minimum stock level (reorder point) |
| `max_stock` | integer | Maximum stock level |
| `unit` | string | Unit of measure (each, case, etc.) |
| `tax_rate` | decimal | Tax rate (0.0825 = 8.25%) |
| `taxable` | boolean | Whether item is taxable |
| `active` | boolean | Whether product is active |
| `attributes` | object | Custom attributes (size, color, etc.) |
| `images` | array | Product images |
| `created_at` | datetime | Creation timestamp |
| `updated_at` | datetime | Last update timestamp |

### Attributes Object

Custom attributes vary by category:

**Caps**:
```json
{
  "size": "One Size",
  "color": "Red",
  "brand": "CAPS",
  "material": "Cotton",
  "style": "Snapback"
}
```

**Auto Parts**:
```json
{
  "make": "Toyota",
  "model": "Camry",
  "year_from": 2018,
  "year_to": 2024,
  "oem_number": "90915-YZZD1",
  "position": "Front"
}
```

**Paint**:
```json
{
  "color_code": "1G3",
  "color_name": "Magnetic Gray Metallic",
  "base_type": "Waterborne",
  "size_oz": 32
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Product not found |
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `CONFLICT` | 409 | Barcode or SKU already exists |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Related Documentation

- [Inventory Endpoints](./inventory.md) - Stock management
- [Transaction Endpoints](./transactions.md) - Sales with products
- [API Overview](./README.md) - Authentication and general info
