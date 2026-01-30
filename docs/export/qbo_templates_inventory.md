# QuickBooks Online CSV Templates Inventory

**Generated**: 2026-01-20  
**Purpose**: Authoritative QuickBooks CSV import templates for split-build-system CSV export pack  
**Status**: Phase 0 - Truth Sync (Evidence-Based Documentation)  
**Source**: `.kiro/specs/split-build-system/design.md` (Section 5: CSV Export Pack)

## Overview

This document provides the **authoritative** QuickBooks Online (QBO) CSV import templates that the CSV export pack MUST generate. These templates are used for manual import of accounting data into QuickBooks when the sync add-on is not available.

**Critical Rules**:
1. Header order MUST match exactly
2. Required fields (marked with `*`) MUST be present
3. Date format: `YYYY-MM-DD` (configurable)
4. Decimal precision: 2 places (`0.00`)
5. UTF-8 encoding
6. No recomputation of totals (use snapshot values)

## Template 1: Sales Receipt

**Use Case**: Export cash/card sales (immediate payment transactions)

**File Naming**: `sales_receipts_YYYYMMDD_HHMMSS.csv`

### Header Row (Authoritative)

```csv
*InvoiceNo,*Customer,*InvoiceDate,*DueDate,Ship Date,Quantity,*Item(Product/Service),ItemDescription,*Rate,*Amount,Taxable,*TaxAmount,CustomerMsg
```

### Field Definitions

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `*InvoiceNo` | ✅ Yes | String | Unique transaction identifier | `SR-001`, `TXN-20260120-001` |
| `*Customer` | ✅ Yes | String | Customer name or ID | `John Doe`, `CUST-123` |
| `*InvoiceDate` | ✅ Yes | Date | Transaction date (YYYY-MM-DD) | `2026-01-20` |
| `*DueDate` | ✅ Yes | Date | Payment due date (same as invoice date for sales receipts) | `2026-01-20` |
| `Ship Date` | ❌ No | Date | Shipping date (optional) | `2026-01-21` |
| `Quantity` | ❌ No | Decimal | Item quantity | `2`, `1.5` |
| `*Item(Product/Service)` | ✅ Yes | String | Product SKU or service code | `PROD-001`, `SERVICE-REPAIR` |
| `ItemDescription` | ❌ No | String | Product description | `Widget`, `Repair Service` |
| `*Rate` | ✅ Yes | Decimal | Unit price (2 decimal places) | `10.00`, `25.50` |
| `*Amount` | ✅ Yes | Decimal | Line total (quantity × rate) | `20.00`, `38.25` |
| `Taxable` | ❌ No | String | Tax status (`Y` or `N`) | `Y`, `N` |
| `*TaxAmount` | ✅ Yes | Decimal | Tax amount for line or total | `1.60`, `3.06` |
| `CustomerMsg` | ❌ No | String | Message to customer | `Thank you`, `Warranty included` |

### Example Data Rows

```csv
*InvoiceNo,*Customer,*InvoiceDate,*DueDate,Ship Date,Quantity,*Item(Product/Service),ItemDescription,*Rate,*Amount,Taxable,*TaxAmount,CustomerMsg
SR-001,John Doe,2026-01-20,2026-01-20,,2,PROD-001,Widget,10.00,20.00,Y,1.60,Thank you
SR-001,John Doe,2026-01-20,2026-01-20,,1,PROD-002,Gadget,15.00,15.00,Y,1.20,Thank you
SR-002,Jane Smith,2026-01-20,2026-01-20,,3,PROD-003,Tool,8.50,25.50,Y,2.04,
```

### Multi-Line Transactions

**Important**: Each line item gets its own row with the same `InvoiceNo`. QuickBooks groups rows by `InvoiceNo` to create a single sales receipt.

**Example**: Transaction SR-001 has 2 line items, so it appears as 2 rows with the same `InvoiceNo`.

### Data Source

**Table**: `accounting_snapshots` (to be created in Phase 3)

**Mapping**:
- `InvoiceNo` ← `accounting_snapshots.transaction_id`
- `Customer` ← `customers.name` (join via `transactions.customer_id`)
- `InvoiceDate` ← `accounting_snapshots.finalized_at`
- `DueDate` ← `accounting_snapshots.finalized_at` (same as invoice date)
- `Quantity` ← `snapshot_lines.quantity`
- `Item(Product/Service)` ← `products.sku` (join via `snapshot_lines.product_id`)
- `ItemDescription` ← `snapshot_lines.description`
- `Rate` ← `snapshot_lines.unit_price`
- `Amount` ← `snapshot_lines.line_total`
- `TaxAmount` ← `snapshot_lines.tax_amount`

## Template 2: Invoice

**Use Case**: Export on-account sales (payment due later)

**File Naming**: `invoices_YYYYMMDD_HHMMSS.csv`

### Header Row (Authoritative)

```csv
*InvoiceNo,*Customer,*InvoiceDate,*DueDate,Terms,Location,Memo,*Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount,ItemTaxCode,ItemTaxAmount
```

### Field Definitions

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `*InvoiceNo` | ✅ Yes | String | Unique invoice identifier | `INV-001`, `INV-20260120-001` |
| `*Customer` | ✅ Yes | String | Customer name or ID | `John Doe`, `CUST-123` |
| `*InvoiceDate` | ✅ Yes | Date | Invoice date (YYYY-MM-DD) | `2026-01-20` |
| `*DueDate` | ✅ Yes | Date | Payment due date | `2026-02-20` |
| `Terms` | ❌ No | String | Payment terms | `Net 30`, `Net 15`, `Due on receipt` |
| `Location` | ❌ No | String | Store location | `Main Store`, `Warehouse` |
| `Memo` | ❌ No | String | Invoice memo | `Purchase`, `Bulk order` |
| `*Item(Product/Service)` | ✅ Yes | String | Product SKU or service code | `PROD-001`, `SERVICE-INSTALL` |
| `ItemDescription` | ❌ No | String | Product description | `Widget`, `Installation Service` |
| `ItemQuantity` | ❌ No | Decimal | Item quantity | `2`, `1.5` |
| `ItemRate` | ❌ No | Decimal | Unit price | `10.00`, `25.50` |
| `ItemAmount` | ❌ No | Decimal | Line total | `20.00`, `38.25` |
| `ItemTaxCode` | ❌ No | String | Tax code | `TAX`, `EXEMPT` |
| `ItemTaxAmount` | ❌ No | Decimal | Tax amount for line | `1.60`, `3.06` |

### Example Data Rows

```csv
*InvoiceNo,*Customer,*InvoiceDate,*DueDate,Terms,Location,Memo,*Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount,ItemTaxCode,ItemTaxAmount
INV-001,John Doe,2026-01-20,2026-02-20,Net 30,Main Store,Purchase,PROD-001,Widget,2,10.00,20.00,TAX,1.60
INV-001,John Doe,2026-01-20,2026-02-20,Net 30,Main Store,Purchase,PROD-002,Gadget,1,15.00,15.00,TAX,1.20
INV-002,Jane Smith,2026-01-20,2026-02-05,Net 15,Warehouse,Bulk order,PROD-003,Tool,10,8.50,85.00,TAX,6.80
```

### Multi-Line Invoices

**Important**: Each line item gets its own row with the same `InvoiceNo`. QuickBooks groups rows by `InvoiceNo` to create a single invoice.

### Data Source

**Table**: `accounting_snapshots` (to be created in Phase 3)

**Mapping**:
- `InvoiceNo` ← `accounting_snapshots.transaction_id`
- `Customer` ← `customers.name` (join via `transactions.customer_id`)
- `InvoiceDate` ← `accounting_snapshots.finalized_at`
- `DueDate` ← `accounting_snapshots.finalized_at + payment_terms_days`
- `Terms` ← `customers.payment_terms` or default `Net 30`
- `Location` ← `stores.name` (join via `transactions.store_id`)
- `Item(Product/Service)` ← `products.sku`
- `ItemDescription` ← `snapshot_lines.description`
- `ItemQuantity` ← `snapshot_lines.quantity`
- `ItemRate` ← `snapshot_lines.unit_price`
- `ItemAmount` ← `snapshot_lines.line_total`
- `ItemTaxAmount` ← `snapshot_lines.tax_amount`

## Template 3: Credit Memo

**Use Case**: Export returns/refunds

**File Naming**: `credit_memos_YYYYMMDD_HHMMSS.csv`

### Header Row (Authoritative)

```csv
*CreditMemoNo,*Customer,*CreditMemoDate,*Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount,ItemTaxCode,ItemTaxAmount,Memo
```

### Field Definitions

| Field | Required | Type | Description | Example |
|-------|----------|------|-------------|---------|
| `*CreditMemoNo` | ✅ Yes | String | Unique credit memo identifier | `CM-001`, `CM-20260120-001` |
| `*Customer` | ✅ Yes | String | Customer name or ID | `John Doe`, `CUST-123` |
| `*CreditMemoDate` | ✅ Yes | Date | Credit memo date (YYYY-MM-DD) | `2026-01-20` |
| `*Item(Product/Service)` | ✅ Yes | String | Product SKU or service code | `PROD-001`, `SERVICE-REFUND` |
| `ItemDescription` | ❌ No | String | Product description | `Widget Return`, `Service Refund` |
| `ItemQuantity` | ❌ No | Decimal | Returned quantity | `1`, `2.5` |
| `ItemRate` | ❌ No | Decimal | Unit price | `10.00`, `25.50` |
| `ItemAmount` | ❌ No | Decimal | Line total | `10.00`, `63.75` |
| `ItemTaxCode` | ❌ No | String | Tax code | `TAX`, `EXEMPT` |
| `ItemTaxAmount` | ❌ No | Decimal | Tax amount for line | `0.80`, `5.10` |
| `Memo` | ❌ No | String | Reason for credit | `Return - damaged item`, `Customer dissatisfied` |

### Example Data Rows

```csv
*CreditMemoNo,*Customer,*CreditMemoDate,*Item(Product/Service),ItemDescription,ItemQuantity,ItemRate,ItemAmount,ItemTaxCode,ItemTaxAmount,Memo
CM-001,John Doe,2026-01-20,PROD-001,Widget Return,1,10.00,10.00,TAX,0.80,Return - damaged item
CM-002,Jane Smith,2026-01-20,PROD-002,Gadget Return,2,15.00,30.00,TAX,2.40,Customer dissatisfied
CM-002,Jane Smith,2026-01-20,PROD-003,Tool Return,1,8.50,8.50,TAX,0.68,Customer dissatisfied
```

### Multi-Line Credit Memos

**Important**: Each line item gets its own row with the same `CreditMemoNo`. QuickBooks groups rows by `CreditMemoNo` to create a single credit memo.

### Data Source

**Table**: `accounting_snapshots` (to be created in Phase 3)

**Mapping**:
- `CreditMemoNo` ← `accounting_snapshots.transaction_id`
- `Customer` ← `customers.name` (join via `transactions.customer_id`)
- `CreditMemoDate` ← `accounting_snapshots.finalized_at`
- `Item(Product/Service)` ← `products.sku`
- `ItemDescription` ← `snapshot_lines.description`
- `ItemQuantity` ← `snapshot_lines.quantity` (negative for returns)
- `ItemRate` ← `snapshot_lines.unit_price`
- `ItemAmount` ← `snapshot_lines.line_total` (negative for returns)
- `ItemTaxAmount` ← `snapshot_lines.tax_amount` (negative for returns)
- `Memo` ← `transactions.notes` or `returns.reason`

## Export Rules (Critical)

### 1. No Recomputation

**Rule**: Exports MUST use `accounting_snapshots` values exactly as stored. NO recalculation of totals, tax, or discounts.

**Rationale**: Snapshots are immutable financial records created at transaction finalization. Recomputing values could introduce discrepancies.

**Validation**: Property Test 3 (Export Snapshot Faithfulness) verifies this.

### 2. Decimal Precision

**Rule**: All monetary values MUST have exactly 2 decimal places.

**Format**: `0.00` (not `0.0` or `0`)

**Examples**:
- ✅ `10.00`
- ✅ `25.50`
- ✅ `0.00`
- ❌ `10` (missing decimals)
- ❌ `25.5` (only 1 decimal)
- ❌ `10.000` (too many decimals)

### 3. Date Format

**Rule**: Dates MUST be in `YYYY-MM-DD` format (ISO 8601).

**Configurable**: Date format can be configured per tenant, but default is `YYYY-MM-DD`.

**Examples**:
- ✅ `2026-01-20`
- ✅ `2026-12-31`
- ❌ `01/20/2026` (US format)
- ❌ `20/01/2026` (EU format)
- ❌ `2026-1-20` (missing leading zero)

### 4. UTF-8 Encoding

**Rule**: CSV files MUST be UTF-8 encoded to support international characters.

**Rationale**: Customer names, product descriptions, and memos may contain non-ASCII characters.

**BOM**: Do NOT include UTF-8 BOM (Byte Order Mark) - QuickBooks doesn't require it.

### 5. Header Order

**Rule**: Header columns MUST appear in the exact order specified in templates.

**Rationale**: QuickBooks CSV import is position-dependent. Changing column order will cause import failures.

**Validation**: Golden file tests verify header order exactly matches templates.

### 6. Required Fields

**Rule**: Required fields (marked with `*`) MUST be present and non-empty.

**Validation**: Export should fail if any required field is missing or empty.

**Error Handling**: Log transaction ID and missing field, mark export batch as "failed".

### 7. Multi-Line Transactions

**Rule**: Transactions with multiple line items MUST have one row per line item, all with the same transaction ID.

**Example**:
```csv
SR-001,John Doe,2026-01-20,2026-01-20,,2,PROD-001,Widget,10.00,20.00,Y,1.60,
SR-001,John Doe,2026-01-20,2026-01-20,,1,PROD-002,Gadget,15.00,15.00,Y,1.20,
```

**QuickBooks Behavior**: Groups rows by transaction ID to create a single sales receipt/invoice/credit memo.

## Multi-Tender Support

**Status**: ⚠️ **DESIGN DECISION REQUIRED**

**Issue**: QuickBooks CSV templates do NOT support multi-tender transactions (e.g., $50 cash + $30 card).

**Current Design**: `accounting_snapshots` has `payments: Vec<Payment>` to support multi-tender.

**Options**:

### Option 1: Split Multi-Tender into Multiple Sales Receipts
- Create one sales receipt per payment method
- Split line items proportionally across receipts
- **Pros**: Accurate payment method tracking
- **Cons**: Complex logic, multiple QBO transactions for one POS transaction

### Option 2: Use Primary Payment Method Only
- Export only the largest payment amount's method
- Ignore other payment methods
- **Pros**: Simple, one-to-one mapping
- **Cons**: Loses payment method detail

### Option 3: Add Custom Field for Secondary Payments
- Use `CustomerMsg` or `Memo` field to note multi-tender
- Example: `CustomerMsg: "Paid: $50 cash, $30 card"`
- **Pros**: Preserves information
- **Cons**: Not machine-readable in QuickBooks

**Recommendation**: Option 2 (primary payment method) for MVP, Option 3 (custom field) for full implementation.

## ZIP Packaging (Optional)

**Feature**: Package multiple CSV files into a single ZIP for download.

**Use Case**: Export all accounting data (sales receipts + invoices + credit memos) in one operation.

**Structure**:
```
export_20260120_143022.zip
├── manifest.json
├── sales_receipts.csv
├── invoices.csv
├── credit_memos.csv
└── README.txt
```

**Manifest** (`manifest.json`):
```json
{
  "export_date": "2026-01-20T14:30:22Z",
  "batch_id": "batch-uuid-here",
  "date_range": {
    "start": "2026-01-01",
    "end": "2026-01-20"
  },
  "files": [
    {
      "filename": "sales_receipts.csv",
      "record_count": 150,
      "file_size": 45000
    },
    {
      "filename": "invoices.csv",
      "record_count": 75,
      "file_size": 22000
    },
    {
      "filename": "credit_memos.csv",
      "record_count": 10,
      "file_size": 3000
    }
  ],
  "import_order": [
    "sales_receipts.csv",
    "invoices.csv",
    "credit_memos.csv"
  ]
}
```

**README** (`README.txt`):
```
EasySale QuickBooks Export
Generated: 2026-01-20 14:30:22 UTC
Batch ID: batch-uuid-here
Date Range: 2026-01-01 to 2026-01-20

Import Instructions:
1. Log in to QuickBooks Online
2. Go to Settings > Import Data
3. Import files in this order:
   a. sales_receipts.csv (150 records)
   b. invoices.csv (75 records)
   c. credit_memos.csv (10 records)
4. Review import results and resolve any errors

Notes:
- All monetary values are in USD with 2 decimal places
- Dates are in YYYY-MM-DD format
- Multi-line transactions have one row per line item
- Contact support if you encounter import errors
```

## Testing Requirements

### Golden File Tests (Property 4)

**Purpose**: Verify CSV format matches templates exactly.

**Test Cases**:
1. Sales receipt header matches template
2. Invoice header matches template
3. Credit memo header matches template
4. Field order is correct
5. Required fields are present
6. Decimal precision is 2 places
7. Date format is YYYY-MM-DD
8. UTF-8 encoding is used

### Snapshot Faithfulness Tests (Property 3)

**Purpose**: Verify exported values match snapshot values exactly (no recomputation).

**Test Cases**:
1. Subtotal matches snapshot
2. Tax matches snapshot
3. Discount matches snapshot
4. Total matches snapshot
5. Line item amounts match snapshot
6. Line item tax amounts match snapshot

## References

- **Requirements**: `.kiro/specs/split-build-system/requirements.md` (R6)
- **Design**: `.kiro/specs/split-build-system/design.md` (Section 5: CSV Export Pack)
- **Current State**: `docs/export/current_export_surface.md`
- **QuickBooks Documentation**: [QuickBooks CSV Import Guide](https://quickbooks.intuit.com/learn-support/en-us/help-article/import-data/import-sales-receipts-invoices-quickbooks-online/L9yCHdJLl_US_en_US)
