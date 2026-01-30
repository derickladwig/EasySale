# Product Import Feature

## Overview

The product import feature allows bulk importing of products from CSV files. The system supports all product fields available in the backend, with clear distinction between required and optional fields.

## CSV Template

### Required Fields (marked with *)

| Field | Description | Example |
|-------|-------------|---------|
| `sku*` | Unique product identifier | SKU001 |
| `name*` | Product name | Blue T-Shirt Large |
| `category*` | Product category | Apparel |
| `unit_price*` | Selling price | 29.99 |
| `cost*` | Cost/purchase price | 12.00 |
| `store_id*` | Store identifier | store-001 |

### Optional Fields

| Field | Description | Example |
|-------|-------------|---------|
| `description` | Product description | Cotton t-shirt |
| `subcategory` | Product subcategory | Shirts |
| `quantity` | Initial quantity on hand | 50 |
| `reorder_point` | Low stock alert threshold | 5 |
| `barcode` | Barcode value (UPC, EAN, etc.) | 123456789013 |
| `barcode_type` | Barcode format | UPC-A, EAN-13, Code128, QR |
| `is_active` | Active status | true/false |
| `parent_sku` | Parent product SKU for variants | SKU001 |
| `images` | Comma-separated image URLs | url1,url2 |

### Custom Attributes

| Field | Description |
|-------|-------------|
| `attr_color` | Color attribute |
| `attr_size` | Size attribute |
| `attr_brand` | Brand attribute |
| `attr_weight` | Weight attribute |
| `attr_material` | Material attribute |

### Vendor Information

| Field | Description |
|-------|-------------|
| `vendor_name` | Primary vendor/supplier name |
| `vendor_sku` | Vendor's SKU for this product |
| `vendor_cost` | Cost from this vendor |

### Additional Fields

| Field | Description |
|-------|-------------|
| `tax_class` | Tax classification (standard, reduced, exempt) |
| `notes` | Internal notes |

## Import Process

### 1. Upload CSV File
- Select a CSV file with the required headers
- File must be UTF-8 encoded
- First row must contain column headers

### 2. Validation
- System validates all required fields are present
- Checks for valid numeric values in price/cost/quantity fields
- Validates parent_sku references exist (for variants)

### 3. Import
- Products without parent_sku are imported first
- Variant products (with parent_sku) are imported after their parents
- Duplicate SKUs will cause an error for that row

### 4. Results
- Shows count of successfully imported products
- Lists any rows that were skipped with error details
- Option to download error report as CSV

## API Endpoint

```
POST /api/data-management/import
Content-Type: application/json

{
  "entity_type": "products",
  "csv_data": "sku*,name*,category*,unit_price*,cost*,store_id*\nSKU001,Product,General,19.99,10.00,store-001"
}
```

### Response

```json
{
  "imported": 10,
  "skipped": 2,
  "errors": [
    {
      "row": 5,
      "field": "unit_price",
      "message": "Invalid number for 'unit_price': 'abc'"
    }
  ]
}
```

## Best Practices

1. **Start with the template**: Download the CSV template to ensure correct column headers
2. **Test with small batches**: Import a few products first to verify format
3. **Parent products first**: When importing variants, ensure parent products exist or are in the same file (listed before variants)
4. **Unique SKUs**: Each SKU must be unique across the entire product catalog
5. **Consistent categories**: Use existing category names for proper organization

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| Required field missing | Column header not in CSV | Add the required column |
| Required field empty | Value is blank for required field | Fill in the value |
| Invalid number | Non-numeric value in price/cost/quantity | Use numeric values only |
| Parent not found | parent_sku references non-existent product | Import parent first or check SKU |
| Duplicate SKU | SKU already exists in database | Use unique SKU or update existing |

## Supported Barcode Types

- UPC-A (12 digits)
- UPC-E (8 digits)
- EAN-13 (13 digits)
- EAN-8 (8 digits)
- Code128
- Code39
- QR Code
- DataMatrix
