# Vendor Bill Mapping Contract

## Overview

This document describes the mapping contract between OCR document outputs and the EasySale domain entities. The mapping flow ensures that vendor bills are properly integrated with inventory, products, and accounting systems.

## Mapping Flow

```
OCR Document
  → Vendor Bill (header: vendor, date, total, bill number)
    → Line Items (part number, description, qty, unit price, total)
      → Part Matching (SKU, MPN, vendor catalog ref)
        → Part Creation (if no match)
          → Cost Update (update part cost from bill)
            → Inventory Adjustment (optional: receive stock)
```

## Entity Relationships

### 1. Vendor Bill → Vendor

**Table**: `vendor_bills` → `vendors`

| Field | Description |
|-------|-------------|
| `vendor_id` | Foreign key to vendors table |
| `invoice_no` | Vendor's invoice number |
| `invoice_date` | Date on vendor invoice |
| `po_number` | Optional purchase order reference |

**Matching Logic**:
- Vendor detection from OCR text using keywords, tax IDs, and patterns
- Manual vendor selection if auto-detection fails
- Vendor templates for parsing vendor-specific invoice formats

### 2. Line Items → Parts

**Table**: `vendor_bill_lines` → `products`

| Field | Description |
|-------|-------------|
| `vendor_sku_raw` | Original SKU from vendor invoice |
| `vendor_sku_norm` | Normalized SKU (uppercase, no special chars) |
| `matched_sku` | Internal product SKU |
| `match_confidence` | 0.0 to 1.0 confidence score |
| `match_reason` | Explanation of match method |

**Matching Strategies** (in priority order):

1. **Exact Alias Match** (confidence: 1.0)
   - Lookup in `vendor_sku_aliases` table
   - Vendor-specific SKU mappings

2. **Exact Internal SKU** (confidence: 0.9)
   - Direct match on normalized SKU

3. **MPN/Barcode Match** (confidence: 0.85)
   - Match against product barcode field
   - Match against MPN in product attributes

4. **Fuzzy Description Match** (confidence: 0.5-0.8)
   - Levenshtein similarity on product name
   - Weighted by similarity score

5. **Historical Match** (confidence: 0.75)
   - Previously confirmed matches for same vendor SKU

### 3. Vendor SKU Aliases

**Table**: `vendor_sku_aliases`

| Field | Description |
|-------|-------------|
| `vendor_id` | Vendor this alias applies to |
| `vendor_sku_norm` | Normalized vendor SKU |
| `internal_sku` | Internal product SKU |
| `unit_conversion` | JSON: `{multiplier, from_unit, to_unit}` |
| `priority` | Higher = preferred when multiple matches |
| `usage_count` | Times this alias has been used |

**Example Unit Conversion**:
```json
{
  "multiplier": 12,
  "from_unit": "CASE",
  "to_unit": "EA"
}
```

### 4. Costs → Inventory

**Table**: `products`

| Field | Description |
|-------|-------------|
| `cost` | Current product cost |
| `quantity_on_hand` | Current inventory level |

**Cost Policies**:

1. **Average Cost** (default)
   - `new_cost = (current_cost * current_qty + vendor_cost * received_qty) / (current_qty + received_qty)`

2. **Last Cost**
   - `new_cost = vendor_cost`

3. **Vendor Cost**
   - Always use vendor cost

4. **No Update**
   - Keep current cost unchanged

### 5. Store Scope (Multi-Tenant)

All operations are scoped by:
- `tenant_id` - Business/organization isolation
- `store_id` - Location-specific data

**Enforcement**:
- All queries include tenant_id filter
- Store-specific inventory tracking
- Cross-store sync via event sourcing

## API Endpoints

### Match Suggestions

```
GET /api/vendor-bills/match-suggestions
Query: vendor_sku, description, vendor_id?, limit?
Response: { suggestions: MatchCandidate[], total_candidates: number }
```

### Create Product from Line

```
POST /api/vendor-bills/{bill_id}/create-product
Body: {
  line_id: string,
  sku: string,
  name: string,
  category: string,
  cost: number,
  unit_price: number,
  quantity_on_hand?: number,
  barcode?: string,
  vendor_catalog_ref?: string,
  create_alias?: boolean
}
Response: { product_id, sku, name, message }
```

### Reopen Bill

```
POST /api/vendor-bills/{bill_id}/reopen
Body: { reason?: string }
Response: { message, status }
```

### Post Receiving

```
POST /api/vendor-bills/{bill_id}/post
Body: { cost_policy?: string }
Response: ReceivingSummary
```

## Export Compatibility

### QuickBooks Online

- Vendor bills map to QBO Bills
- Line items map to Bill Line Items
- Vendor SKU stored in item description
- Cost updates sync to QBO inventory items

### WooCommerce

- Products sync via WooCommerce REST API
- SKU mapping maintained in `vendor_sku_aliases`
- Cost updates reflected in product cost field

### Shopify

- Products sync via Shopify Admin API
- Vendor catalog refs stored in product metafields
- Inventory levels sync to Shopify locations

## UI Affordances

### Bill Review Screen

1. **Match Suggestions Dropdown**
   - Shows ranked list of potential matches
   - Displays confidence score and reason
   - One-click selection

2. **Create Part Button**
   - Available on unmatched line items
   - Pre-fills form from line item data
   - Auto-creates vendor SKU alias

3. **Vendor Catalog Reference Field**
   - Stores vendor's part number
   - Used for future matching

4. **Cost Update Confirmation**
   - Shows current vs new cost
   - Displays cost policy being applied

5. **Inventory Adjustment Option**
   - Toggle to receive stock
   - Shows quantity being added

6. **Reopen Bill**
   - Available on POSTED bills
   - Requires reason for audit trail

## Audit Trail

All operations are logged to `audit_log`:

| Action | Entity Type | Details |
|--------|-------------|---------|
| `upload` | vendor_bill | File uploaded |
| `create_from_bill_line` | product | Product created from line |
| `post_receiving` | vendor_bill | Bill posted, inventory updated |
| `reopen` | vendor_bill | Bill reopened for editing |
| `receiving` | product | Quantity/cost updated |

## Error Handling

### Validation Errors

- All lines must have matched SKU before posting
- Quantities must be positive
- Duplicate invoice detection (idempotency key)

### Conflict Resolution

- Last-write-wins with timestamp + store_id
- Audit log preserves history
- Manual review queue for conflicts

## Security Considerations

- Tenant isolation enforced at database layer
- Role-based permissions for posting
- Audit logging for all sensitive operations
- No cross-tenant data access
