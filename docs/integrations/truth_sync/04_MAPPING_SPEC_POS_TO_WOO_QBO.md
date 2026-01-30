# Mapping Specification: POS ↔ WooCommerce ↔ QuickBooks

**Audit Date:** 2026-01-29  
**Status:** APPROVED

---

## 1. EXISTING MAPPING CONFIGS

### 1.1 Location

```
configs/mappings/
├── woo-to-qbo-invoice.json      # WooCommerce Order → QB Invoice
├── woo-to-qbo-customer.json     # WooCommerce Customer → QB Customer
└── woo-to-supabase-order.json   # WooCommerce Order → Supabase
```

### 1.2 Mapping Format

```json
{
  "mapping_id": "unique-id",
  "source_connector": "woocommerce",
  "target_connector": "quickbooks",
  "entity_type": "order-to-invoice",
  "description": "Human-readable description",
  "mappings": [
    {
      "source_field": "billing.email",
      "target_field": "BillEmail.Address",
      "required": true,
      "transform": "lowercase",
      "description": "Field description"
    }
  ]
}
```

---

## 2. WOOCOMMERCE → POS MAPPING

### 2.1 Product Mapping

| WooCommerce Field | POS Column | Transform | Notes |
|-------------------|------------|-----------|-------|
| `id` | `external_ids.woocommerce` | String | Remote ID storage |
| `sku` | `sku` | None | Primary lookup key |
| `name` | `name` | None | |
| `regular_price` | `price` | ParseDecimal | Tax-exclusive |
| `sale_price` | `sale_price` | ParseDecimal | Optional |
| `description` | `description` | StripHtml | Remove HTML tags |
| `short_description` | `short_description` | StripHtml | |
| `categories[].name` | `category` | FirstOrDefault | Primary category |
| `tags[].name` | `tags` | JoinComma | Comma-separated |
| `images[0].src` | `image_url` | None | Primary image |
| `stock_quantity` | `quantity` | Integer | |
| `manage_stock` | `track_inventory` | Boolean | |
| `weight` | `weight` | ParseDecimal | |
| `dimensions.length` | `length` | ParseDecimal | |
| `dimensions.width` | `width` | ParseDecimal | |
| `dimensions.height` | `height` | ParseDecimal | |
| `date_modified` | `updated_at` | ISO8601 | |

### 2.2 Customer Mapping

| WooCommerce Field | POS Column | Transform | Notes |
|-------------------|------------|-----------|-------|
| `id` | `external_ids.woocommerce` | String | |
| `email` | `email` | Lowercase | Unique key |
| `first_name` | `first_name` | None | |
| `last_name` | `last_name` | None | |
| `billing.phone` | `phone` | NormalizePhone | |
| `billing.company` | `company` | None | |
| `billing.address_1` | `billing_address.line1` | None | |
| `billing.address_2` | `billing_address.line2` | None | |
| `billing.city` | `billing_address.city` | None | |
| `billing.state` | `billing_address.state` | None | |
| `billing.postcode` | `billing_address.postal_code` | None | |
| `billing.country` | `billing_address.country` | ISO3166 | |
| `shipping.*` | `shipping_address.*` | Same as billing | |
| `date_modified` | `updated_at` | ISO8601 | |

### 2.3 Order Mapping

| WooCommerce Field | POS Column | Transform | Notes |
|-------------------|------------|-----------|-------|
| `id` | `external_ids.woocommerce` | String | |
| `number` | `order_number` | String | Display number |
| `status` | `status` | MapStatus | See status map |
| `date_created` | `created_at` | ISO8601 | |
| `date_modified` | `updated_at` | ISO8601 | |
| `date_paid` | `paid_at` | ISO8601 | Nullable |
| `customer_id` | `customer_id` | LookupCustomer | Resolve to POS ID |
| `billing.*` | `billing_address.*` | Same as customer | |
| `shipping.*` | `shipping_address.*` | Same as customer | |
| `line_items[]` | `line_items[]` | MapLineItems | See below |
| `tax_lines[]` | `tax_lines[]` | MapTaxLines | |
| `shipping_lines[]` | `shipping_lines[]` | MapShippingLines | |
| `coupon_lines[]` | `discounts[]` | MapDiscounts | |
| `total` | `total` | ParseDecimal | |
| `total_tax` | `total_tax` | ParseDecimal | |
| `discount_total` | `discount_total` | ParseDecimal | |
| `shipping_total` | `shipping_total` | ParseDecimal | |
| `payment_method` | `payment_method` | None | |
| `payment_method_title` | `payment_method_title` | None | |
| `customer_note` | `notes` | None | |

### 2.4 Order Status Mapping

| WooCommerce Status | POS Status |
|--------------------|------------|
| `pending` | `Pending` |
| `processing` | `Processing` |
| `on-hold` | `OnHold` |
| `completed` | `Completed` |
| `cancelled` | `Cancelled` |
| `refunded` | `Refunded` |
| `failed` | `Failed` |

---

## 3. POS → QUICKBOOKS MAPPING

### 3.1 Customer Mapping

| POS Column | QuickBooks Field | Transform | Notes |
|------------|------------------|-----------|-------|
| `id` | N/A | N/A | Not sent |
| `external_ids.quickbooks` | `Id` | String | For updates |
| `first_name` + `last_name` | `DisplayName` | Concat | Required, unique |
| `first_name` | `GivenName` | None | |
| `last_name` | `FamilyName` | None | |
| `company` | `CompanyName` | None | |
| `email` | `PrimaryEmailAddr.Address` | None | |
| `phone` | `PrimaryPhone.FreeFormNumber` | None | |
| `billing_address.line1` | `BillAddr.Line1` | None | |
| `billing_address.city` | `BillAddr.City` | None | |
| `billing_address.state` | `BillAddr.CountrySubDivisionCode` | None | |
| `billing_address.postal_code` | `BillAddr.PostalCode` | None | |
| `billing_address.country` | `BillAddr.Country` | None | |
| `shipping_address.*` | `ShipAddr.*` | Same as billing | |

### 3.2 Item Mapping

| POS Column | QuickBooks Field | Transform | Notes |
|------------|------------------|-----------|-------|
| `id` | N/A | N/A | Not sent |
| `external_ids.quickbooks` | `Id` | String | For updates |
| `sku` | `Sku` | None | |
| `name` | `Name` | Truncate(100) | Max 100 chars |
| `description` | `Description` | Truncate(4000) | Max 4000 chars |
| `price` | `UnitPrice` | Decimal | |
| `cost` | `PurchaseCost` | Decimal | |
| `track_inventory` | `TrackQtyOnHand` | Boolean | |
| `quantity` | `QtyOnHand` | Integer | |
| `category` | `Type` | MapItemType | Service/Inventory/NonInventory |

### 3.3 Invoice Mapping (from POS Sale)

| POS Column | QuickBooks Field | Transform | Notes |
|------------|------------------|-----------|-------|
| `id` | `DocNumber` | String | Unique per company |
| `external_ids.quickbooks` | `Id` | String | For updates |
| `customer_id` | `CustomerRef.value` | LookupQBOCustomer | Resolve to QB ID |
| `created_at` | `TxnDate` | DateOnly | YYYY-MM-DD |
| `due_date` | `DueDate` | DateOnly | |
| `line_items[]` | `Line[]` | MapInvoiceLines | See below |
| `total` | N/A | Calculated | QB calculates |
| `notes` | `CustomerMemo.value` | Truncate(4000) | |
| `billing_address.*` | `BillAddr.*` | Same as customer | |
| `shipping_address.*` | `ShipAddr.*` | Same as customer | |

### 3.4 Invoice Line Item Mapping

| POS Line Item | QuickBooks Line | Transform | Notes |
|---------------|-----------------|-----------|-------|
| `product_id` | `SalesItemLineDetail.ItemRef.value` | LookupQBOItem | Resolve to QB ID |
| `quantity` | `SalesItemLineDetail.Qty` | Decimal | |
| `unit_price` | `SalesItemLineDetail.UnitPrice` | Decimal | |
| `total` | `Amount` | Decimal | qty * price |
| `description` | `Description` | Truncate(4000) | |
| `tax_code` | `SalesItemLineDetail.TaxCodeRef.value` | LookupTaxCode | |

### 3.5 Sales Receipt Mapping (Paid Sales)

Same as Invoice, but:
- Used when `payment_status = Paid`
- No `DueDate` field
- `PaymentMethodRef` included

---

## 4. WOOCOMMERCE → QUICKBOOKS MAPPING (Direct Flow)

### 4.1 Order → Invoice

| WooCommerce Field | QuickBooks Field | Transform |
|-------------------|------------------|-----------|
| `id` | `DocNumber` | String |
| `billing.email` | `BillEmail.Address` | Lowercase |
| `billing.first_name` + `last_name` | `CustomerMemo.value` | Concat |
| `date_created` | `TxnDate` | DateOnly |
| `line_items[].product_id` | `Line[].SalesItemLineDetail.ItemRef.value` | LookupQBOItem |
| `line_items[].quantity` | `Line[].SalesItemLineDetail.Qty` | Decimal |
| `line_items[].price` | `Line[].SalesItemLineDetail.UnitPrice` | Decimal |
| `line_items[].total` | `Line[].Amount` | Decimal |
| `customer_id` | `CustomerRef.value` | LookupQBOCustomer |

---

## 5. TRANSFORMATION FUNCTIONS

### 5.1 Available Transforms

| Function | Description | Example |
|----------|-------------|---------|
| `None` | Pass through | `"value"` → `"value"` |
| `String` | Convert to string | `123` → `"123"` |
| `Integer` | Parse as integer | `"123"` → `123` |
| `Decimal` | Parse as decimal | `"12.34"` → `12.34` |
| `Boolean` | Parse as boolean | `"true"` → `true` |
| `Lowercase` | Convert to lowercase | `"ABC"` → `"abc"` |
| `Uppercase` | Convert to uppercase | `"abc"` → `"ABC"` |
| `Truncate(N)` | Limit to N chars | `"abcdef"` → `"abc"` (N=3) |
| `StripHtml` | Remove HTML tags | `"<p>text</p>"` → `"text"` |
| `DateOnly` | Extract date | `"2026-01-29T10:00:00Z"` → `"2026-01-29"` |
| `ISO8601` | Format as ISO 8601 | `"Jan 29, 2026"` → `"2026-01-29T00:00:00Z"` |
| `NormalizePhone` | Format phone number | `"(555) 123-4567"` → `"+15551234567"` |
| `ISO3166` | Country code | `"United States"` → `"US"` |
| `Concat` | Join with space | `["John", "Doe"]` → `"John Doe"` |
| `JoinComma` | Join with comma | `["a", "b"]` → `"a, b"` |
| `FirstOrDefault` | First item or null | `["a", "b"]` → `"a"` |
| `LookupQBOCustomer` | Resolve to QB ID | `"woo_123"` → `"qbo_456"` |
| `LookupQBOItem` | Resolve to QB ID | `"woo_789"` → `"qbo_012"` |
| `LookupTaxCode` | Resolve tax code | `"standard"` → `"TAX"` |
| `MapStatus` | Map status enum | `"processing"` → `"Processing"` |
| `MapItemType` | Map item type | `"simple"` → `"Inventory"` |

### 5.2 Custom Transform Example

```json
{
  "source_field": "billing.first_name",
  "target_field": "CustomerMemo.value",
  "transform": "concat( )",
  "transform_args": ["billing.first_name", "billing.last_name"],
  "description": "Combine first and last name"
}
```

---

## 6. TAX HANDLING

### 6.1 WooCommerce Tax

- Prices can be tax-inclusive or tax-exclusive (store setting)
- Tax lines provided separately
- Tax class per line item

### 6.2 QuickBooks Tax

- Prices are always tax-exclusive
- Tax calculated by QB based on TaxCodeRef
- GlobalTaxCalculation: `TaxExcluded` or `TaxInclusive`

### 6.3 Tax Conversion

```
If WooCommerce prices are tax-inclusive:
  QB_Price = Woo_Price / (1 + Tax_Rate)
  
If WooCommerce prices are tax-exclusive:
  QB_Price = Woo_Price (no conversion)
```

---

## 7. ROUNDING RULES

| Platform | Decimal Places | Rounding |
|----------|----------------|----------|
| WooCommerce | 2 | Half-up |
| QuickBooks | 2 | Half-up |
| POS | 2 | Half-up |

**Rule:** All monetary values rounded to 2 decimal places using half-up rounding.

---

## 8. SKU RULES

### 8.1 SKU Format

- Max length: 100 characters
- Allowed characters: A-Z, a-z, 0-9, -, _
- Case-sensitive in WooCommerce
- Case-insensitive in QuickBooks

### 8.2 SKU Matching

```
1. Exact match first
2. Case-insensitive match second
3. Create new if no match
```

### 8.3 SKU Generation

If product has no SKU:
```
Generated SKU = "POS-" + product_id
```

---

## 9. ID MAPPING TABLE

### 9.1 Schema

```sql
CREATE TABLE id_mappings (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    source_system TEXT NOT NULL,      -- 'woocommerce', 'pos'
    source_entity_type TEXT NOT NULL, -- 'product', 'customer', 'order'
    source_id TEXT NOT NULL,
    target_system TEXT NOT NULL,      -- 'quickbooks', 'supabase'
    target_entity_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(tenant_id, source_system, source_entity_type, source_id, target_system)
);
```

### 9.2 Lookup Functions

```rust
// Lookup QB customer ID from WooCommerce customer ID
async fn lookup_qbo_customer(woo_customer_id: &str) -> Option<String> {
    id_mapper.get_target_id(
        "woocommerce", "customer", woo_customer_id,
        "quickbooks"
    ).await
}

// Lookup QB item ID from WooCommerce product ID
async fn lookup_qbo_item(woo_product_id: &str) -> Option<String> {
    id_mapper.get_target_id(
        "woocommerce", "product", woo_product_id,
        "quickbooks"
    ).await
}
```

---

## 10. VALIDATION RULES

### 10.1 Required Fields

| Entity | Required Fields |
|--------|-----------------|
| QB Customer | DisplayName |
| QB Item | Name, Type |
| QB Invoice | CustomerRef, Line[] |
| QB Sales Receipt | CustomerRef, Line[] |

### 10.2 Field Constraints

| Field | Constraint |
|-------|------------|
| QB DisplayName | Max 500 chars, unique per company |
| QB Name (Item) | Max 100 chars, unique per company |
| QB Description | Max 4000 chars |
| QB DocNumber | Max 21 chars |
| QB Memo | Max 4000 chars |

### 10.3 Validation Errors

```rust
pub enum MappingError {
    RequiredFieldMissing { field: String },
    FieldTooLong { field: String, max: usize, actual: usize },
    InvalidFormat { field: String, expected: String },
    LookupFailed { entity: String, id: String },
    DuplicateValue { field: String, value: String },
}
```
