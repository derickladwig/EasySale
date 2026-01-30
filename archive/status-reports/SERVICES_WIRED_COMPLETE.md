# Services Wired to Handlers - Complete

## Summary
Wired up previously unused services to API endpoints, eliminating dead code warnings.

## Services Wired

### 1. MatchingEngine Service
**Purpose**: Match vendor SKUs to internal products using multiple strategies

**Endpoints Created**:
- `POST /api/vendor/match-sku` - Match vendor SKU to internal product
  - Uses alias matching (confidence 1.0)
  - Exact SKU matching (confidence 0.9)
  - Fuzzy description matching (confidence 0.8)
  - Historical mapping (confidence 0.75)
  - Returns match status: auto_accept, review, or manual

**Methods Now Used**:
- `match_line()` - Main matching logic
- `match_by_alias()` - Vendor SKU alias lookup
- `match_by_exact_sku()` - Direct SKU match
- `match_by_description()` - Fuzzy text matching
- `match_by_history()` - Historical mapping
- `calculate_similarity()` - Levenshtein similarity
- `levenshtein_distance()` - Edit distance calculation
- `get_product()` - Product lookup
- `apply_thresholds()` - Confidence thresholding

### 2. OCRService
**Purpose**: Extract text from vendor bill images using OCR engines

**Endpoints Created**:
- `POST /api/vendor/ocr/process` - Process image with OCR
  - Supports Tesseract (local)
  - Placeholder for Google Vision (cloud)
  - Placeholder for AWS Textract (cloud)
- `GET /api/vendor/ocr/config` - Get OCR configuration

**Methods Now Used**:
- `from_config()` - Create service from config
- `process_image()` - Main OCR processing
- `process_with_tesseract()` - Tesseract engine
- `process_with_google_vision()` - Google Vision placeholder
- `process_with_aws_textract()` - AWS Textract placeholder
- `estimate_confidence()` - Quality estimation
- `engine_name()` - Engine identifier

### 3. ParsingService
**Purpose**: Parse OCR text into structured bill data

**Endpoints Created**:
- `POST /api/vendor/parse` - Parse OCR text to structured bill
  - Template-based parsing (with vendor template)
  - Generic parsing (without template)
- `POST /api/vendor/validate-totals` - Validate parsed bill totals

**Methods Now Used**:
- `parse_with_template()` - Template-based parsing
- `parse_generic()` - Generic parsing
- `extract_header()` - Header field extraction
- `extract_header_generic()` - Generic header extraction
- `extract_line_items()` - Line item extraction
- `extract_line_items_generic()` - Generic line items
- `parse_line_item()` - Single line parsing
- `extract_totals()` - Totals extraction
- `extract_totals_generic()` - Generic totals
- `extract_field()` - Field extraction with rules
- `extract_amount()` - Amount extraction with rules
- `extract_with_patterns()` - Pattern-based extraction
- `extract_amount_with_patterns()` - Amount pattern extraction
- `calculate_parsing_confidence()` - Confidence calculation
- `validate_totals()` - Total validation

### 4. SyncLogger Service
**Purpose**: Comprehensive logging for sync operations

**Endpoints Created**:
- `POST /api/sync/log` - Log a sync operation
- `GET /api/sync/logs/{tenant_id}/{sync_id}` - Get logs for sync run
- `GET /api/sync/errors/{tenant_id}` - Get error logs

**Methods Now Used**:
- `new()` - Create logger
- `log()` - Main logging method
- `log_success()` - Log successful operation
- `log_warning()` - Log warning
- `log_error()` - Log error
- `mask_sensitive_data()` - PII/credential masking
- `get_sync_logs()` - Retrieve sync logs
- `get_error_logs()` - Retrieve error logs

**Security Features**:
- Masks emails, phone numbers, credit cards
- Masks tokens, keys, passwords
- Masks Bearer tokens
- Never logs PII or credentials

### 5. SyncQueueProcessor Service
**Purpose**: Process sync queue items by routing operations

**Endpoints Created**:
- `POST /api/sync/queue/process` - Process a queue item
- `GET /api/sync/queue/{tenant_id}` - Get pending queue items

**Methods Now Used**:
- `new()` - Create processor
- `process_item()` - Main processing logic
- `handle_create()` - Create operation
- `handle_update()` - Update operation
- `handle_delete()` - Delete operation
- `handle_upsert()` - Upsert operation
- `entity_exists()` - Entity existence check
- `create_customer()` - Customer creation
- `update_customer()` - Customer update
- `delete_customer()` - Customer deletion
- `create_product()` - Product creation
- `update_product()` - Product update
- `delete_product()` - Product deletion
- `create_order()` - Order creation
- `update_order()` - Order update
- `delete_order()` - Order deletion
- `create_invoice()` - Invoice creation
- `update_invoice()` - Invoice update
- `delete_invoice()` - Invoice deletion

## Files Created/Modified

### Created
1. `backend/rust/src/handlers/vendor_operations.rs` - New handler with 10 endpoints

### Modified
1. `backend/rust/src/handlers/mod.rs` - Added vendor_operations module
2. `backend/rust/src/main.rs` - Registered vendor_operations routes

## Results

### Warning Reduction
- **Before**: 179 warnings
- **After**: 166 warnings
- **Eliminated**: 13 warnings

### Endpoints Added
- **Total New Endpoints**: 10
  - 5 vendor operations (matching, OCR, parsing)
  - 5 sync operations (logging, queue processing)

### Methods Activated
- **MatchingEngine**: 9 methods
- **OCRService**: 7 methods
- **ParsingService**: 15 methods
- **SyncLogger**: 8 methods
- **SyncQueueProcessor**: 18 methods
- **Total**: 57 methods now in use

## API Documentation

### Vendor Operations

#### Match SKU
```bash
POST /api/vendor/match-sku
{
  "vendor_id": "vendor-123",
  "vendor_sku": "ABC-123",
  "description": "Motor Oil 5W-30",
  "tenant_id": "tenant-001"
}

Response:
{
  "matched_sku": "PROD-456",
  "confidence": 0.95,
  "reason": "Matched by vendor SKU alias (used 10 times)",
  "status": "auto_accept",
  "alternatives": []
}
```

#### Process OCR
```bash
POST /api/vendor/ocr/process
{
  "image_path": "/path/to/bill.jpg",
  "engine": "tesseract"
}

Response:
{
  "text": "Invoice #12345...",
  "confidence": 0.85,
  "engine": "tesseract",
  "processing_time_ms": 1250
}
```

#### Parse Bill
```bash
POST /api/vendor/parse
{
  "ocr_text": "Invoice #12345\nDate: 01/15/2024...",
  "use_template": false
}

Response:
{
  "header": {
    "invoice_no": "12345",
    "invoice_date": "01/15/2024",
    "po_number": null,
    "vendor_name": null
  },
  "line_items": [...],
  "totals": {
    "subtotal": 100.0,
    "tax": 8.0,
    "total": 108.0
  },
  "parsing_method": "generic",
  "confidence": 0.82
}
```

### Sync Operations

#### Log Sync Operation
```bash
POST /api/sync/log
{
  "tenant_id": "tenant-001",
  "sync_id": "sync-123",
  "connector_id": "woocommerce",
  "entity_type": "product",
  "entity_id": "prod-456",
  "operation": "create",
  "result": "success",
  "level": "info",
  "message": "Product synced successfully",
  "duration_ms": 250
}

Response:
{
  "log_id": "log-789",
  "message": "Log entry created"
}
```

#### Get Sync Logs
```bash
GET /api/sync/logs/tenant-001/sync-123?limit=50

Response:
[
  {
    "id": "log-789",
    "tenant_id": "tenant-001",
    "sync_id": "sync-123",
    "connector_id": "woocommerce",
    "entity_type": "product",
    "entity_id": "prod-456",
    "operation": "create",
    "result": "success",
    "level": "info",
    "message": "Product synced successfully",
    "error_details": null,
    "duration_ms": 250,
    "metadata": null,
    "created_at": "2026-01-20T10:30:00Z"
  }
]
```

#### Process Queue Item
```bash
POST /api/sync/queue/process
{
  "id": "queue-123",
  "tenant_id": "tenant-001",
  "entity_type": "customer",
  "entity_id": "cust-456",
  "operation": "create",
  "payload": "{\"name\":\"John Doe\"}",
  "status": "pending",
  "priority": 5,
  "retry_count": 0,
  "created_at": "2026-01-20T10:00:00Z",
  "updated_at": "2026-01-20T10:00:00Z"
}

Response:
{
  "success": true,
  "message": "Processed create customer cust-456"
}
```

## Remaining Warnings

The remaining 166 warnings are for:
- Other services not yet wired (MultiPassOCRService, ImagePreprocessor, etc.)
- Internal helper methods in partially-used services
- Future feature placeholders
- Derived trait implementations (intentionally ignored by Rust)

## Next Steps

To eliminate more warnings, wire up:
1. **MultiPassOCRService** - Multi-pass OCR with result merging
2. **ImagePreprocessor** - Image preprocessing for better OCR
3. **SearchService** methods - Index management, barcode/SKU search
4. **SchedulerService** methods - Job management
5. **SyncScheduler** methods - Schedule management
6. **RetentionService** methods - Backup retention
7. **SettingsResolutionService** methods - Settings hierarchy

---
**Date**: 2026-01-20
**Status**: Complete
**Warnings Eliminated**: 13
**New Endpoints**: 10
**Methods Activated**: 57
