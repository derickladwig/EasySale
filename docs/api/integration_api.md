# Integration API Documentation

## Overview

The Integration API provides endpoints for exporting approved cases and integrating with inventory, AP, and accounting systems.

**Base URL:** `/api`  
**Authentication:** Required (Bearer token)  
**Rate Limits:** 100 requests/minute per tenant

---

## Endpoints

### POST /api/cases/:id/export

Export an approved case to CSV or JSON format.

**Request:**
```http
POST /api/cases/case-abc123/export
Content-Type: application/json
Authorization: Bearer <token>

{
  "format": "json",
  "include_line_items": true,
  "include_artifacts": false
}
```

**Response:**
```json
{
  "export_url": "https://api.example.com/exports/export-xyz789.json",
  "expires_at": "2026-01-25T11:00:00Z",
  "format": "json",
  "size_bytes": 15420
}
```

**Export Formats:**

**JSON:**
```json
{
  "case_id": "case-abc123",
  "invoice_number": "INV-001",
  "invoice_date": "2026-01-20",
  "vendor_name": "Acme Corp",
  "vendor_id": "vendor-456",
  "subtotal": 1000.00,
  "tax": 100.00,
  "total": 1100.00,
  "line_items": [
    {
      "sku": "PROD-001",
      "description": "Widget A",
      "quantity": 10,
      "unit_price": 100.00,
      "line_total": 1000.00
    }
  ],
  "approved_by": "user-123",
  "approved_at": "2026-01-25T10:30:00Z"
}
```

**CSV:**
```csv
case_id,invoice_number,invoice_date,vendor_name,subtotal,tax,total
case-abc123,INV-001,2026-01-20,Acme Corp,1000.00,100.00,1100.00
```

**Status Codes:**
- `200 OK`: Export created
- `404 Not Found`: Case not found
- `400 Bad Request`: Invalid format or case not approved
- `403 Forbidden`: Case not approved for export

---

### POST /api/integrations/inventory

Integrate approved case with inventory system.

**Request:**
```http
POST /api/integrations/inventory
Content-Type: application/json
Authorization: Bearer <token>

{
  "case_id": "case-abc123",
  "tenant_id": "tenant-123"
}
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "items_created": 5,
  "items_updated": 3,
  "errors": [],
  "status": "success"
}
```

**Integration Actions:**
- Creates new inventory items for unknown SKUs
- Updates quantities for existing items
- Updates costs based on invoice prices
- Maps vendor SKUs to internal SKUs
- Transactional (all or nothing)

**Error Response:**
```json
{
  "case_id": "case-abc123",
  "items_created": 0,
  "items_updated": 0,
  "errors": [
    "SKU PROD-001: Mapping not found",
    "SKU PROD-002: Invalid quantity"
  ],
  "status": "failed"
}
```

---

### POST /api/integrations/ap

Integrate approved case with accounts payable system.

**Request:**
```http
POST /api/integrations/ap
Content-Type: application/json
Authorization: Bearer <token>

{
  "case_id": "case-abc123",
  "tenant_id": "tenant-123"
}
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "bill_id": "bill-xyz789",
  "vendor_id": "vendor-456",
  "amount": 1100.00,
  "due_date": "2026-02-20",
  "status": "created"
}
```

**Integration Actions:**
- Creates vendor bill record
- Updates vendor balance
- Sets due date (default: invoice_date + 30 days)
- Links bill to original invoice
- Transactional (all or nothing)

---

### POST /api/integrations/accounting

Integrate approved case with accounting system.

**Request:**
```http
POST /api/integrations/accounting
Content-Type: application/json
Authorization: Bearer <token>

{
  "case_id": "case-abc123",
  "tenant_id": "tenant-123"
}
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "entry_id": "entry-jkl012",
  "total_debits": 1100.00,
  "total_credits": 1100.00,
  "balanced": true,
  "status": "posted"
}
```

**Journal Entry Example:**
```
DR  Inventory/COGS     1000.00
DR  Tax Expense         100.00
    CR  Accounts Payable        1100.00
```

**Integration Actions:**
- Generates journal entries
- Ensures DR = CR balance
- Maps to chart of accounts
- Handles tax entries
- Transactional (all or nothing)

---

### POST /api/integrations/rollback

Rollback integration for a case.

**Request:**
```http
POST /api/integrations/rollback
Content-Type: application/json
Authorization: Bearer <token>

{
  "case_id": "case-abc123",
  "systems": ["inventory", "ap", "accounting"]
}
```

**Response:**
```json
{
  "case_id": "case-abc123",
  "rollback_status": {
    "inventory": "success",
    "ap": "success",
    "accounting": "success"
  },
  "status": "rolled_back"
}
```

**Rollback Actions:**
- Reverses inventory changes
- Deletes vendor bill
- Reverses journal entries
- Restores previous state
- Transactional per system

---

## Integration Workflow

**Typical Flow:**
```
1. Case Approved
2. Export to JSON/CSV (optional)
3. Integrate with Inventory
4. Integrate with AP
5. Integrate with Accounting
6. Mark case as integrated
```

**Automatic Integration:**
Configure automatic integration on approval:

```json
{
  "auto_integrate": {
    "enabled": true,
    "systems": ["inventory", "ap", "accounting"],
    "on_failure": "rollback"
  }
}
```

---

## SKU Mapping

**Vendor SKU → Internal SKU:**

Configure SKU aliases in database:
```sql
INSERT INTO vendor_sku_aliases (vendor_sku, internal_sku, vendor_id, tenant_id)
VALUES ('ACME-001', 'PROD-001', 'vendor-456', 'tenant-123');
```

**Mapping Priority:**
1. Vendor-specific alias
2. Global alias
3. Direct match (vendor SKU = internal SKU)

---

## Error Handling

**Integration Errors:**
- `SKU_MAPPING_NOT_FOUND`: Vendor SKU not mapped
- `VENDOR_NOT_FOUND`: Vendor not in system
- `ACCOUNT_NOT_FOUND`: Chart of accounts mapping missing
- `UNBALANCED_ENTRY`: Journal entry DR ≠ CR
- `DUPLICATE_BILL`: Bill already exists for invoice

**Retry Strategy:**
- Transient errors: Retry with exponential backoff
- Permanent errors: Mark for manual review
- Rollback on failure: Restore previous state

---

## Webhooks

Configure webhooks for integration events:

**Events:**
- `integration.inventory.success`
- `integration.ap.success`
- `integration.accounting.success`
- `integration.failed`
- `integration.rolled_back`

**Webhook Payload:**
```json
{
  "event": "integration.inventory.success",
  "case_id": "case-abc123",
  "items_created": 5,
  "items_updated": 3,
  "timestamp": "2026-01-25T10:35:00Z"
}
```

---

## Best Practices

1. **Test Mode**: Use test tenant for integration testing
2. **Rollback**: Always implement rollback for failed integrations
3. **SKU Mapping**: Maintain complete SKU alias tables
4. **Validation**: Validate data before integration
5. **Monitoring**: Monitor integration success rates
6. **Audit Trail**: Log all integration actions

---

**Version:** 3.0  
**Last Updated:** January 25, 2026
