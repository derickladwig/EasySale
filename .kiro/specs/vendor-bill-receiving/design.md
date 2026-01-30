# Design Document: Vendor Bill Receiving with OCR

## Overview

The Vendor Bill Receiving system integrates OCR-based document ingestion with the existing EasySale inventory management system. It enables automated processing of vendor invoices through intelligent SKU matching, creating receiving transactions that update inventory levels and costs through the existing product and audit infrastructure.

**Key Design Principles:**
1. **Integration Over Isolation**: Use existing `products`, `audit_log`, and file storage systems
2. **Human-in-the-Loop**: All automated matches are reviewable before posting
3. **Learning System**: Confirmed matches create permanent aliases for future automation
4. **Idempotent Posting**: Bills cannot be received twice (duplicate detection)
5. **Cache-First OCR**: OCR runs once per file/template/config version
6. **Offline-First**: Full functionality works offline with sync when online

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  Vendor Bill UI                                              │
│  ├── BillUpload (scan/upload with vendor detection)         │
│  ├── BillReview (line matching with confidence scores)      │
│  ├── VendorMappings (alias management)                      │
│  ├── BillHistory (audit trail with reprocess)               │
│  └── TemplateEditor (vendor template configuration)         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API (Rust)                        │
├─────────────────────────────────────────────────────────────┤
│  Vendor Bill Handlers                                        │
│  ├── upload_bill (file + vendor detection)                  │
│  ├── get_bill (with parse + matches)                        │
│  ├── review_matches (update matches, create aliases)        │
│  ├── post_receiving (create inventory transactions)         │
│  ├── list_bills (history with filters)                      │
│  └── reprocess_bill (re-parse/match without posting)        │
├─────────────────────────────────────────────────────────────┤
│  Service Layer                                               │
│  ├── BillIngestService (file, OCR, parse, vendor detect)    │
│  ├── MatchingEngine (SKU matching with confidence)          │
│  ├── ReceivingService (post to inventory via products)      │
│  ├── VendorService (vendor CRUD, templates)                 │
│  └── OCRService (external OCR API integration)              │
└─────────────────────────────────────────────────────────────┘

                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (SQLite)                         │
├─────────────────────────────────────────────────────────────┤
│  vendors (NEW)                                               │
│  ├── id, name, tax_id, contact info                         │
│  ├── identifiers (JSON: keywords, patterns)                 │
│  └── tenant_id, is_active                                   │
├─────────────────────────────────────────────────────────────┤
│  vendor_bills (NEW)                                          │
│  ├── id, vendor_id, invoice_no, date, totals                │
│  ├── status (DRAFT, REVIEW, POSTED, VOID)                   │
│  ├── file_path, file_hash (SHA256)                          │
│  ├── idempotency_key (vendor+invoice+date hash)             │
│  └── posted_at, posted_by, tenant_id                        │
├─────────────────────────────────────────────────────────────┤
│  vendor_bill_parses (NEW)                                    │
│  ├── id, vendor_bill_id, ocr_text, parsed_json              │
│  ├── template_id, template_version, ocr_engine              │
│  └── config_hash, created_at                                │
├─────────────────────────────────────────────────────────────┤
│  vendor_bill_lines (NEW)                                     │
│  ├── id, vendor_bill_id, line_no                            │
│  ├── vendor_sku_raw, vendor_sku_norm, desc_raw              │
│  ├── qty_raw, unit_raw, unit_price_raw, ext_price_raw       │
│  ├── normalized_qty, normalized_unit                        │
│  ├── matched_sku, match_confidence, match_reason            │
│  └── user_overridden, created_at                            │
├─────────────────────────────────────────────────────────────┤
│  vendor_sku_aliases (NEW)                                    │
│  ├── id, vendor_id, vendor_sku_norm, internal_sku           │
│  ├── unit_conversion (JSON: multiplier, from_unit, to_unit) │
│  ├── priority, last_seen_at, usage_count                    │
│  └── created_by, tenant_id                                  │
├─────────────────────────────────────────────────────────────┤
│  vendor_templates (NEW)                                      │
│  ├── id, vendor_id, name, version, active                   │
│  ├── config_json (parsing rules, field locations)           │
│  └── created_at, tenant_id                                  │
├─────────────────────────────────────────────────────────────┤
│  products (EXISTING - NO CHANGES)                            │
│  └── Used for SKU lookup and inventory updates              │
├─────────────────────────────────────────────────────────────┤
│  audit_log (EXISTING - USED)                                 │
│  └── Logs all bill operations and inventory changes         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Bill Upload Flow:**
```
1. User uploads PDF/image file
2. Calculate SHA256 hash, check for duplicate file
3. Save to data/uploads/vendor-bills/{tenant_id}/{bill_id}.{ext}
4. Detect vendor from filename/OCR preview
5. Create vendor_bill record (status=DRAFT)
6. Queue for OCR processing (async)
7. Return bill_id to frontend
```

**OCR and Parsing Flow:**
```
1. Check parse cache by (file_hash + template_version + config_hash)
2. If cached, load from vendor_bill_parses
3. If not cached:
   a. Call OCR service (Tesseract/Cloud OCR)
   b. Extract text and confidence scores
   c. Apply vendor template parsing rules
   d. Extract header fields (invoice#, date, totals)
   e. Extract line items (SKU, desc, qty, price)
   f. Store in vendor_bill_parses
4. Create vendor_bill_lines records
5. Update bill status to REVIEW
```

**Matching Flow:**
```
1. For each vendor_bill_line:
   a. Normalize vendor SKU (trim, uppercase, remove special chars)
   b. Try exact alias match (vendor_sku_aliases)
   c. Try exact internal SKU match (products.sku)
   d. Try fuzzy description match (products.name, Levenshtein)
   e. Try historical match (same vendor+desc previously confirmed)
2. Calculate confidence score (0-1) and explanation
3. Store top match in vendor_bill_lines.matched_sku
4. Store alternatives in parsed_json for UI
5. Flag lines below threshold for manual review
```

**Review and Confirmation Flow:**
```
1. User reviews matches in UI
2. User can:
   - Accept high-confidence matches
   - Search and select different SKU
   - Create new alias mapping
   - Adjust quantity/unit conversion
   - Split or merge lines
3. On save, update vendor_bill_lines with user selections
4. Mark user_overridden=true for manual changes
5. Create vendor_sku_aliases for new mappings
```

**Posting Flow:**
```
1. Validate all lines have matched_sku
2. Check duplicate: query vendor_bills for same vendor+invoice_no
3. Begin transaction:
   a. For each line:
      - Update products.quantity_on_hand += normalized_qty
      - Update products.cost (per cost policy)
      - Update products.updated_at, sync_version++
   b. Create audit_log entries for each product update
   c. Update vendor_bill.status = POSTED
   d. Set vendor_bill.posted_at, posted_by
   e. Update vendor_sku_aliases.last_seen_at, usage_count++
4. Commit transaction
5. Queue for sync to other stores
6. Return success with receiving summary
```

## Components and Interfaces

### Backend Models

```rust
// Vendor model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Vendor {
    pub id: String,
    pub name: String,
    pub tax_id: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub address: Option<String>,
    pub website: Option<String>,
    
    // JSON: {"keywords": ["ACME", "ACME SUPPLY"], "tax_ids": ["123456789"]}
    pub identifiers: String,
    
    pub tenant_id: String,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}


// Vendor Bill model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorBill {
    pub id: String,
    pub vendor_id: String,
    pub invoice_no: String,
    pub invoice_date: String,
    pub po_number: Option<String>,
    pub subtotal: f64,
    pub tax: f64,
    pub total: f64,
    pub currency: String,
    
    // DRAFT, REVIEW, POSTED, VOID
    pub status: String,
    
    // File storage
    pub file_path: String,
    pub file_hash: String, // SHA256
    pub file_size: i64,
    pub mime_type: String,
    
    // Idempotency: hash of vendor_id + invoice_no + invoice_date
    pub idempotency_key: String,
    
    // Posting info
    pub posted_at: Option<String>,
    pub posted_by: Option<String>,
    
    // Multi-tenant
    pub tenant_id: String,
    pub store_id: String,
    
    pub created_at: String,
    pub updated_at: String,
}

// Vendor Bill Parse model (OCR cache)
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorBillParse {
    pub id: String,
    pub vendor_bill_id: String,
    
    // Raw OCR output
    pub ocr_text: String,
    pub ocr_confidence: f64,
    
    // Structured parse result (JSON)
    pub parsed_json: String,
    
    // Versioning for cache invalidation
    pub template_id: Option<String>,
    pub template_version: i32,
    pub ocr_engine: String,
    pub config_hash: String,
    
    pub created_at: String,
}

// Vendor Bill Line model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorBillLine {
    pub id: String,
    pub vendor_bill_id: String,
    pub line_no: i32,
    
    // Raw vendor data
    pub vendor_sku_raw: String,
    pub vendor_sku_norm: String, // Normalized for matching
    pub desc_raw: String,
    pub qty_raw: String,
    pub unit_raw: String,
    pub unit_price_raw: String,
    pub ext_price_raw: String,
    
    // Normalized/parsed values
    pub normalized_qty: f64,
    pub normalized_unit: String,
    pub unit_price: f64,
    pub ext_price: f64,
    
    // Matching result
    pub matched_sku: Option<String>,
    pub match_confidence: f64,
    pub match_reason: String,
    
    // User override flag
    pub user_overridden: bool,
    
    pub created_at: String,
    pub updated_at: String,
}

// Vendor SKU Alias model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorSkuAlias {
    pub id: String,
    pub vendor_id: String,
    pub vendor_sku_norm: String,
    pub internal_sku: String,
    
    // Unit conversion: {"multiplier": 12, "from_unit": "CASE", "to_unit": "EA"}
    pub unit_conversion: Option<String>,
    
    // Priority for multiple aliases (higher = preferred)
    pub priority: i32,
    
    // Usage tracking
    pub last_seen_at: String,
    pub usage_count: i32,
    
    pub created_by: String,
    pub tenant_id: String,
    pub created_at: String,
    pub updated_at: String,
}

// Vendor Template model
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VendorTemplate {
    pub id: String,
    pub vendor_id: String,
    pub name: String,
    pub version: i32,
    pub active: bool,
    
    // Template configuration (JSON)
    pub config_json: String,
    
    pub tenant_id: String,
    pub created_at: String,
    pub updated_at: String,
}
```

### Frontend Components

```typescript
// Vendor Bill Upload Component
interface BillUploadProps {
  onUploadComplete: (billId: string) => void;
}

// Displays: drag-drop zone, vendor selector, OCR status
// Actions: upload file, detect vendor, queue OCR

// Vendor Bill Review Component
interface BillReviewProps {
  billId: string;
  onPostComplete: () => void;
}

// Displays: header fields, line items table with:
//   - Vendor SKU, Description, Qty, Unit, Price
//   - Matched Internal SKU, Confidence, Reason
//   - Actions: search SKU, create alias, adjust qty/unit
// Actions: accept all, post receiving, save draft

// Vendor Mappings Admin Component
interface VendorMappingsProps {
  vendorId?: string;
}

// Displays: alias list with filters
// Actions: create, edit, delete aliases
// Shows: usage stats, last seen dates

// Bill History Component
interface BillHistoryProps {
  filters?: BillHistoryFilters;
}

// Displays: bill list with status, vendor, date, total
// Actions: view details, reprocess, void
// Links to: receiving transactions, audit logs
```

## Data Models

### Database Schema (New Tables)

```sql
-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tax_id TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    website TEXT,
    identifiers TEXT NOT NULL DEFAULT '{}', -- JSON
    tenant_id TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);

-- Vendor bills table
CREATE TABLE IF NOT EXISTS vendor_bills (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    invoice_no TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    po_number TEXT,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, REVIEW, POSTED, VOID
    file_path TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    idempotency_key TEXT NOT NULL UNIQUE,
    posted_at TEXT,
    posted_by TEXT,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_vendor_bills_vendor ON vendor_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_invoice ON vendor_bills(invoice_no);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_date ON vendor_bills(invoice_date);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_status ON vendor_bills(status);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_tenant ON vendor_bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_idempotency ON vendor_bills(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_vendor_bills_hash ON vendor_bills(file_hash);

-- Vendor bill parses table (OCR cache)
CREATE TABLE IF NOT EXISTS vendor_bill_parses (
    id TEXT PRIMARY KEY,
    vendor_bill_id TEXT NOT NULL,
    ocr_text TEXT NOT NULL,
    ocr_confidence REAL NOT NULL DEFAULT 0.0,
    parsed_json TEXT NOT NULL,
    template_id TEXT,
    template_version INTEGER NOT NULL DEFAULT 1,
    ocr_engine TEXT NOT NULL,
    config_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (vendor_bill_id) REFERENCES vendor_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES vendor_templates(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bill_parses_bill ON vendor_bill_parses(vendor_bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_parses_template ON vendor_bill_parses(template_id);

-- Vendor bill lines table
CREATE TABLE IF NOT EXISTS vendor_bill_lines (
    id TEXT PRIMARY KEY,
    vendor_bill_id TEXT NOT NULL,
    line_no INTEGER NOT NULL,
    vendor_sku_raw TEXT NOT NULL,
    vendor_sku_norm TEXT NOT NULL,
    desc_raw TEXT NOT NULL,
    qty_raw TEXT NOT NULL,
    unit_raw TEXT NOT NULL,
    unit_price_raw TEXT NOT NULL,
    ext_price_raw TEXT NOT NULL,
    normalized_qty REAL NOT NULL,
    normalized_unit TEXT NOT NULL,
    unit_price REAL NOT NULL,
    ext_price REAL NOT NULL,
    matched_sku TEXT,
    match_confidence REAL NOT NULL DEFAULT 0.0,
    match_reason TEXT NOT NULL DEFAULT '',
    user_overridden INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (vendor_bill_id) REFERENCES vendor_bills(id) ON DELETE CASCADE,
    FOREIGN KEY (matched_sku) REFERENCES products(sku) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_bill_lines_bill ON vendor_bill_lines(vendor_bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_lines_vendor_sku ON vendor_bill_lines(vendor_sku_norm);
CREATE INDEX IF NOT EXISTS idx_bill_lines_matched ON vendor_bill_lines(matched_sku);

-- Vendor SKU aliases table
CREATE TABLE IF NOT EXISTS vendor_sku_aliases (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    vendor_sku_norm TEXT NOT NULL,
    internal_sku TEXT NOT NULL,
    unit_conversion TEXT, -- JSON: {"multiplier": 12, "from_unit": "CASE", "to_unit": "EA"}
    priority INTEGER NOT NULL DEFAULT 0,
    last_seen_at TEXT NOT NULL,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (internal_sku) REFERENCES products(sku) ON DELETE CASCADE,
    UNIQUE(vendor_id, vendor_sku_norm, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_sku_aliases_vendor ON vendor_sku_aliases(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sku_aliases_vendor_sku ON vendor_sku_aliases(vendor_sku_norm);
CREATE INDEX IF NOT EXISTS idx_sku_aliases_internal ON vendor_sku_aliases(internal_sku);
CREATE INDEX IF NOT EXISTS idx_sku_aliases_tenant ON vendor_sku_aliases(tenant_id);

-- Vendor templates table
CREATE TABLE IF NOT EXISTS vendor_templates (
    id TEXT PRIMARY KEY,
    vendor_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    config_json TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_templates_vendor ON vendor_templates(vendor_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON vendor_templates(active);
CREATE INDEX IF NOT EXISTS idx_templates_tenant ON vendor_templates(tenant_id);
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Idempotent Bill Posting
*For any* vendor bill, if it has been posted (status=POSTED), then attempting to post it again should be rejected without modifying inventory.

**Validates: Requirements 11.1, 11.5**

### Property 2: Duplicate Detection Consistency
*For any* two bills with the same vendor_id, invoice_no, and invoice_date, the system should detect them as duplicates and prevent double-posting.

**Validates: Requirements 11.2, 11.3**

### Property 3: Alias Match Determinism
*For any* vendor SKU with an active alias, matching should always return the aliased internal SKU with confidence 1.0.

**Validates: Requirements 6.1, 7.1**

### Property 4: Inventory Update Atomicity
*For any* bill posting operation, either all line items update inventory successfully, or none do (all-or-nothing).

**Validates: Requirements 12.1, 12.6**

### Property 5: Cost Policy Compliance
*For any* product receiving, the cost update must follow the configured cost policy (average, last, vendor-specific).

**Validates: Requirements 13.1, 13.2, 13.3**

### Property 6: Audit Trail Completeness
*For any* bill operation (upload, match, post, void), a corresponding audit_log entry must exist.

**Validates: Requirements 14.1, 14.2, 14.3**

### Property 7: OCR Cache Consistency
*For any* bill file, if the file_hash, template_version, and config_hash match an existing parse, OCR should not be re-run.

**Validates: Requirements 2.4, 2.5**

### Property 8: Match Confidence Bounds
*For any* line item match, the confidence score must be between 0.0 and 1.0 inclusive.

**Validates: Requirements 10.1, 10.2**

### Property 9: Tenant Isolation
*For any* two bills from different tenants, operations on one bill must never affect the other bill or its vendor data.

**Validates: Requirements 19.1, 19.2, 19.3**

### Property 10: File Hash Uniqueness
*For any* uploaded bill file, if the SHA256 hash matches an existing bill, the system should detect it as a duplicate upload.

**Validates: Requirements 1.3, 11.2**

### Property 11: Alias Creation Idempotency
*For any* vendor SKU to internal SKU mapping, creating the same alias multiple times should result in a single alias record.

**Validates: Requirements 7.1, 7.5**

### Property 12: Quantity Normalization Consistency
*For any* vendor bill line with unit conversion, the normalized quantity must equal vendor quantity multiplied by the conversion factor.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 13: Status Transition Validity
*For any* vendor bill, status transitions must follow the valid flow: DRAFT → REVIEW → POSTED or VOID.

**Validates: Requirements 12.1, 14.4**

### Property 14: Reprocessing Safety
*For any* bill reprocessing operation, inventory quantities must remain unchanged.

**Validates: Requirements 15.1, 15.2, 15.5**

### Property 15: Matched SKU Existence
*For any* bill line with a matched_sku, that SKU must exist in the products table.

**Validates: Requirements 6.2, 9.1**

## Error Handling

### Validation Errors
- **Missing Required Fields**: Return 400 with field names
- **Invalid Vendor**: Return 404 with vendor suggestions
- **Duplicate Invoice**: Return 409 with existing bill reference
- **Invalid File Format**: Return 400 with supported formats
- **File Too Large**: Return 413 with size limit

### OCR Errors
- **OCR Service Unavailable**: Queue for retry, notify user
- **Low Confidence OCR**: Flag for manual review
- **Parse Failure**: Store raw text, allow manual entry

### Matching Errors
- **No Match Found**: Flag line for manual SKU selection
- **Ambiguous Match**: Present alternatives to user
- **Invalid SKU**: Reject with validation error

### Posting Errors
- **Inventory Update Failure**: Rollback transaction, return 500
- **Cost Policy Error**: Rollback, return 400 with policy details
- **Duplicate Detection**: Return 409 with existing bill
- **Permission Denied**: Return 403

## Testing Strategy

### Unit Tests
- Vendor SKU normalization logic
- Confidence score calculation
- Unit conversion calculations
- Idempotency key generation
- Template parsing rules
- Duplicate detection logic

### Property-Based Tests
- Property 1: Idempotent bill posting (100 iterations)
- Property 2: Duplicate detection consistency (100 iterations)
- Property 3: Alias match determinism (100 iterations)
- Property 4: Inventory update atomicity (100 iterations)
- Property 5: Cost policy compliance (100 iterations)
- Property 6: Audit trail completeness (100 iterations)
- Property 7: OCR cache consistency (100 iterations)
- Property 8: Match confidence bounds (100 iterations)
- Property 9: Tenant isolation (100 iterations)
- Property 10: File hash uniqueness (100 iterations)
- Property 11: Alias creation idempotency (100 iterations)
- Property 12: Quantity normalization consistency (100 iterations)
- Property 13: Status transition validity (100 iterations)
- Property 14: Reprocessing safety (100 iterations)
- Property 15: Matched SKU existence (100 iterations)

### Integration Tests
- End-to-end bill upload to posting
- OCR processing with mock service
- Matching with various confidence levels
- Alias creation and reuse
- Duplicate bill detection
- Reprocessing without inventory changes
- Multi-tenant isolation

### Performance Tests
- OCR processing time (target: < 10s for 2-page bill)
- Matching speed (target: < 1s per line)
- Posting speed (target: < 5s for 50-line bill)
- Concurrent bill processing (target: 10 concurrent users)

## Performance Considerations

### OCR Optimization
- Cache results by file_hash + template_version + config_hash
- Process OCR asynchronously (don't block UI)
- Use incremental parsing for large documents
- Implement timeout and retry logic

### Matching Optimization
- Index vendor_sku_norm for fast alias lookup
- Cache fuzzy match results per session
- Limit fuzzy matching to top 10 candidates
- Use prepared statements for all queries

### File Storage
- Store files in tenant-specific directories
- Use SHA256 hash to detect duplicate uploads
- Implement file cleanup for voided bills (configurable retention)
- Support external storage (S3, Azure Blob) for scale

### Database Performance
- Indexes on all foreign keys
- Composite indexes for common queries
- Pagination for bill history (50 per page)
- Archive old bills to separate table (> 2 years)

## Security Considerations

### Authentication & Authorization
- All endpoints require JWT authentication
- Permissions:
  - `upload_vendor_bills`: Upload and create bills
  - `review_vendor_bills`: Review and match line items
  - `post_vendor_bills`: Post receiving transactions
  - `manage_vendors`: Create/edit vendors and templates
  - `view_vendor_bills`: View bill history

### Data Validation
- Sanitize all file uploads (check magic bytes)
- Validate file extensions against MIME type
- Limit file size (10MB default)
- Validate all numeric fields (no negative quantities/prices)
- Prevent SQL injection (use parameterized queries)

### Tenant Isolation
- All queries filtered by tenant_id
- File storage segregated by tenant
- No cross-tenant vendor or alias access
- Audit logs per tenant

### File Security
- Store files outside web root
- Generate unique filenames (UUID)
- Scan uploads for malware (optional integration)
- Encrypt sensitive vendor data at rest

## Deployment Considerations

### Database Migrations
- Migration 016: Create vendors table
- Migration 017: Create vendor_bills table
- Migration 018: Create vendor_bill_parses table
- Migration 019: Create vendor_bill_lines table
- Migration 020: Create vendor_sku_aliases table
- Migration 021: Create vendor_templates table

### Configuration
- OCR service endpoint and API key
- File storage path (default: data/uploads/vendor-bills/)
- Cost policy (average_cost, last_cost, vendor_cost)
- Confidence thresholds (auto_accept: 0.95, review: 0.70)
- Duplicate detection tolerance (date ±1 day, total ±5%)

### Feature Flag
- `vendor_bill_receiving_enabled`: Enable/disable per tenant
- `ocr_processing_enabled`: Enable/disable OCR (manual entry fallback)
- `auto_matching_enabled`: Enable/disable automatic matching

### Backward Compatibility
- All new tables, no changes to existing schema
- Existing product updates use same transaction model
- Existing audit_log used for all operations
- Existing file storage pattern extended

### Rollback Plan
- Migrations are reversible (DROP TABLE IF EXISTS)
- Backup database before migration
- Feature flag allows disabling without uninstall
- Rollback script provided for each migration
