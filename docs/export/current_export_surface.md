# Current Export Surface Inventory

**Generated**: 2026-01-20  
**Purpose**: Document existing export functionality before implementing CSV export pack for split-build-system  
**Status**: Phase 0 - Truth Sync (Evidence-Based Documentation)

## Overview

This document inventories the current state of export functionality in EasySale. The system has basic export UI and stub endpoints, but **no actual CSV export implementation** for accounting data (invoices, sales receipts, credit memos).

## Existing Export Endpoints

### 1. Data Management Export (`/api/data-management/export`)

**Location**: `backend/rust/src/handlers/data_management.rs`

**Status**: ⚠️ **STUB IMPLEMENTATION** - Returns mock data, does not generate actual CSV files

**Endpoint**: `POST /api/data-management/export`

**Request Body**:
```json
{
  "entity_type": "products" | "customers" | "sales" | "inventory" | "users" | "transactions",
  "format": "csv" | "json"
}
```

**Response**:
```json
{
  "file_path": "./data/exports/products_1234567890.csv",
  "record_count": 1250,
  "file_size": 640000
}
```

**Current Behavior**:
- Validates entity type against hardcoded list
- Returns mock file path and record counts
- **Does NOT actually query database**
- **Does NOT generate CSV files**
- **Does NOT trigger file download**

**Supported Entity Types**:
- `products` (mock: 1250 records)
- `customers` (mock: 850 records)
- `sales` (mock: 5420 records)
- `inventory` (mock: 1100 records)
- `users` (mock: 15 records)
- `transactions` (mock: 8900 records)

### 2. Performance Metrics Export (`/api/performance/export`)

**Location**: `backend/rust/src/handlers/performance_export.rs`

**Status**: ✅ **FUNCTIONAL** - Generates CSV/JSON for performance metrics (not accounting data)

**Endpoint**: `GET /api/performance/export?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&format=csv`

**Query Parameters**:
- `start_date` (optional): Start date for metrics
- `end_date` (optional): End date for metrics
- `format` (optional): `csv` or `json` (default: `csv`)

**Response**: CSV or JSON file download

**CSV Format**:
```csv
Timestamp,Metric,Value,Unit
2026-01-18 10:00:00,API Response Time (p50),45,ms
2026-01-18 10:00:00,API Response Time (p95),120,ms
2026-01-18 10:00:00,API Response Time (p99),250,ms
2026-01-18 10:00:00,Database Query Time,15,ms
2026-01-18 10:00:00,Memory Usage,512,MB
2026-01-18 10:00:00,Error Rate,0.5,%
```

**Current Behavior**:
- Generates mock performance metrics
- Returns actual CSV/JSON file with proper headers
- Sets `Content-Disposition` for file download
- **This is NOT accounting data** - it's system performance metrics

## Frontend Export UI

### 1. Data Management Page

**Location**: `frontend/src/features/settings/pages/DataManagementPage.tsx`

**Status**: ✅ **UI EXISTS** - Calls stub backend endpoint

**Export Section**:
- Grid of 6 export buttons: Products, Customers, Sales, Inventory, Users, Transactions
- Each button calls `POST /api/data-management/export` with entity type
- Shows toast notification with mock record count
- **Does NOT trigger actual file download** (backend returns mock data)

**Code**:
```typescript
const handleExportData = async (entityType: string) => {
  toast.info(`Exporting ${entityType} to CSV...`);
  try {
    const response = await apiClient.post('/api/data-management/export', {
      entity_type: entityType.toLowerCase(),
      format: 'csv',
    });
    toast.success(`Exported ${response.data.record_count} ${entityType} records`);
    // TODO: In production, would trigger file download
  } catch (error) {
    console.error('Export failed:', error);
    toast.error('Export failed');
  }
};
```

### 2. Product Bulk Operations

**Location**: `frontend/src/features/products/components/BulkOperations.tsx`

**Status**: ✅ **UI EXISTS** - Calls product API (not data management API)

**Export Section**:
- Export format selector: CSV, Excel (.xlsx), JSON
- Export selected products or all products
- Calls `productApi.bulkOperation({ operation: 'export', productIds, format })`
- Creates blob and triggers browser download
- **This is product-specific export, not accounting data**

**Code**:
```typescript
const handleExport = async () => {
  const productIds = selectedProducts.length > 0 
    ? selectedProducts.map((p) => p.id) 
    : undefined; // undefined means export all

  const response = await productApi.bulkOperation({
    operation: 'export',
    productIds,
    format: exportFormat,
  });

  // Create download link
  const blob = new Blob([response.data], {
    type: exportFormat === 'json' ? 'application/json' : 'text/csv',
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `products_export_${Date.now()}.${exportFormat}`;
  document.body.appendChild(a);
  a.click();
  // ... cleanup
};
```

## Missing Exporters (Required for CSV Export Pack)

The following exporters are **required** for QuickBooks CSV export functionality but **do NOT exist**:

### 1. Sales Receipt Exporter ❌

**Status**: NOT IMPLEMENTED

**Required For**: Exporting finalized cash/card sales to QuickBooks

**Data Source**: `accounting_snapshots` table (to be created in Phase 3)

**Output Format**: QuickBooks Sales Receipt CSV template (see `qbo_templates_inventory.md`)

**Required Fields**:
- Invoice number (transaction ID)
- Customer name
- Transaction date
- Line items (product, description, quantity, rate, amount)
- Tax amounts
- Payment method
- Total amount

### 2. Invoice Exporter ❌

**Status**: NOT IMPLEMENTED

**Required For**: Exporting on-account sales to QuickBooks

**Data Source**: `accounting_snapshots` table (to be created in Phase 3)

**Output Format**: QuickBooks Invoice CSV template (see `qbo_templates_inventory.md`)

**Required Fields**:
- Invoice number
- Customer name
- Invoice date
- Due date
- Terms (e.g., "Net 30")
- Line items
- Tax amounts
- Total amount

### 3. Credit Memo Exporter ❌

**Status**: NOT IMPLEMENTED

**Required For**: Exporting returns/refunds to QuickBooks

**Data Source**: `accounting_snapshots` table (to be created in Phase 3)

**Output Format**: QuickBooks Credit Memo CSV template (see `qbo_templates_inventory.md`)

**Required Fields**:
- Credit memo number
- Customer name
- Credit memo date
- Line items (returned products)
- Tax amounts
- Total credit amount
- Memo/reason

### 4. Generic Product Exporter ❌

**Status**: PARTIALLY IMPLEMENTED (UI exists, backend is stub)

**Required For**: Exporting product catalog for QuickBooks item import

**Data Source**: `products` table

**Output Format**: Generic CSV (not QuickBooks-specific)

**Required Fields**:
- Product ID/SKU
- Name
- Description
- Price
- Cost
- Category
- Quantity on hand

### 5. Generic Customer Exporter ❌

**Status**: PARTIALLY IMPLEMENTED (UI exists, backend is stub)

**Required For**: Exporting customer list for QuickBooks customer import

**Data Source**: `customers` table

**Output Format**: Generic CSV (not QuickBooks-specific)

**Required Fields**:
- Customer ID
- Name
- Email
- Phone
- Address
- Account balance

## Export Batch System

**Status**: ❌ NOT IMPLEMENTED

**Required For**: Idempotent export operations (Requirements 5, 7)

**Missing Components**:
- `export_batches` table
- `batch_snapshots` junction table
- Batch creation logic
- Idempotency tracking (prevent duplicate exports)
- Batch status management (pending, completed, failed)

**Required Functionality**:
1. Create export batch from date range
2. Collect snapshots within date range
3. Exclude snapshots already in completed batches
4. Mark batch as completed after successful export
5. Allow re-export of failed batches
6. Prevent re-export of completed batches

## Accounting Snapshot System

**Status**: ❌ NOT IMPLEMENTED

**Required For**: Immutable financial records (Requirements 3)

**Missing Components**:
- `accounting_snapshots` table
- `snapshot_lines` table
- `snapshot_payments` table
- Snapshot creation on transaction finalization
- Immutability enforcement (database triggers + API layer)

**Critical Requirement**:
- Snapshots MUST be created at transaction finalization
- Snapshots MUST be immutable (no updates allowed)
- Exports MUST use snapshot values (no recomputation)

## Summary

### What Exists ✅

1. **Performance metrics export** - Functional CSV/JSON export for system metrics
2. **Product bulk export UI** - Frontend component with format selector
3. **Data management export UI** - Frontend page with export buttons
4. **Export endpoint stubs** - Backend handlers that return mock data

### What's Missing ❌

1. **Accounting snapshot system** - No immutable financial records
2. **Export batch system** - No idempotency tracking
3. **QuickBooks CSV exporters** - No sales receipt, invoice, or credit memo exporters
4. **Generic exporters** - Product and customer export stubs need implementation
5. **Actual CSV generation** - Backend returns mock data, doesn't generate files
6. **File download mechanism** - Backend doesn't stream files to frontend

## Next Steps (Phase 3-6)

1. **Phase 3**: Implement accounting snapshot system
2. **Phase 4**: Implement capability API (report export availability)
3. **Phase 5**: Implement export batch system with idempotency
4. **Phase 6**: Implement CSV export pack with QuickBooks templates

## References

- **Requirements**: `.kiro/specs/split-build-system/requirements.md` (R3, R5, R6, R7)
- **Design**: `.kiro/specs/split-build-system/design.md` (Section 5: CSV Export Pack)
- **QuickBooks Templates**: `docs/export/qbo_templates_inventory.md`
