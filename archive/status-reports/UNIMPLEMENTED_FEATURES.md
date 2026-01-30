# Unimplemented Features Audit

**Generated:** 2026-01-17  
**Status:** Infrastructure built, API endpoints needed

## Overview

This document tracks features that have **backend service code implemented** but are **not yet exposed through API endpoints** or integrated into the application flow.

These are not "dead code" - they are **tasks remaining** to complete the system.

## Categories

### 🔴 Critical - Core Business Features

#### 1. Work Order Management
**Service:** `src/models/work_order.rs`  
**Status:** Model defined, no handlers  
**What's Built:**
- WorkOrderStatus enum (Pending, InProgress, Completed, etc.)
- WorkOrderLineType enum
- WorkOrder and WorkOrderLine structs
- Status management methods

**What's Needed:**
- [ ] Create work order endpoint (`POST /api/work-orders`)
- [ ] List work orders endpoint (`GET /api/work-orders`)
- [ ] Update work order status (`PATCH /api/work-orders/:id/status`)
- [ ] Add line items to work orders
- [ ] Work order search and filtering

**Priority:** HIGH - Service businesses need this

---

#### 2. Vendor Bill Processing (OCR & Ingestion)
**Service:** `src/services/bill_ingest_service.rs`  
**Status:** Full OCR pipeline built, no API exposure  
**What's Built:**
- OCR service with multiple engines (Tesseract, Google Vision, AWS Textract)
- Bill parsing service with template support
- Line item extraction and matching
- Confidence scoring
- Cache system for parsed results

**What's Needed:**
- [ ] Upload bill image endpoint (`POST /api/bills/upload`)
- [ ] Process OCR endpoint (`POST /api/bills/:id/process-ocr`)
- [ ] Review parsed bill endpoint (`GET /api/bills/:id/parsed`)
- [ ] Approve/edit parsed data (`PATCH /api/bills/:id/parsed`)
- [ ] Configure OCR templates (`POST /api/bills/templates`)

**Priority:** HIGH - Automated bill entry is a key feature

---

#### 3. Offline Credit Checking
**Service:** `src/services/offline_credit_checker.rs`  
**Status:** Complete service, no integration  
**What's Built:**
- Credit limit checking for offline transactions
- Flagging for verification when online
- Verification workflow
- Pending verification tracking

**What's Needed:**
- [ ] Check credit endpoint (`POST /api/customers/:id/check-credit`)
- [ ] Verify offline transactions (`POST /api/transactions/verify-offline`)
- [ ] Get pending verifications (`GET /api/transactions/pending-verifications`)
- [ ] Integration with sales flow

**Priority:** HIGH - Critical for offline operation

---

### 🟡 Important - Enhanced Features

#### 4. Product Matching Engine
**Service:** `src/services/matching_engine.rs`  
**Status:** Sophisticated matching algorithms built  
**What's Built:**
- Match by SKU alias
- Match by exact SKU
- Match by description similarity
- Match by purchase history
- Confidence scoring with thresholds
- Levenshtein distance calculation

**What's Needed:**
- [ ] Match line item endpoint (`POST /api/products/match`)
- [ ] Bulk match endpoint (`POST /api/products/match-bulk`)
- [ ] Review matches endpoint (`GET /api/products/matches/pending`)
- [ ] Accept/reject match (`POST /api/products/matches/:id/accept`)
- [ ] Configure thresholds (`PATCH /api/settings/matching`)

**Priority:** MEDIUM - Improves bill processing accuracy

---

#### 5. Conflict Resolution System
**Service:** `src/services/conflict_resolver.rs`  
**Status:** Complete conflict resolution logic  
**What's Built:**
- Multiple resolution strategies (LastWriteWins, MostRecent, Manual, etc.)
- Entity-specific merge logic (customers, vehicles, products)
- Conflict logging and tracking
- Pending conflict detection

**What's Needed:**
- [ ] Get pending conflicts (`GET /api/sync/conflicts`)
- [ ] Resolve conflict (`POST /api/sync/conflicts/:id/resolve`)
- [ ] Configure resolution strategy (`PATCH /api/sync/config`)
- [ ] Conflict history (`GET /api/sync/conflicts/history`)

**Priority:** MEDIUM - Important for multi-location sync

---

#### 6. Barcode Generation & Validation
**Service:** `src/services/barcode_service.rs`  
**Status:** Full barcode system implemented  
**What's Built:**
- Generate UPC-A, EAN-13, Code-128
- Validate barcode formats
- Check digit calculation
- Uniqueness checking
- Format validation

**What's Needed:**
- [ ] Generate barcode endpoint (`POST /api/products/:id/barcode/generate`)
- [ ] Validate barcode endpoint (`POST /api/barcodes/validate`)
- [ ] Bulk generate (`POST /api/products/barcodes/generate-bulk`)
- [ ] Get products by barcode type (`GET /api/products?barcode_type=UPC-A`)

**Priority:** MEDIUM - Useful for inventory management

---

#### 7. Alert & Notification System
**Service:** `src/services/alert_service.rs`  
**Status:** Alert infrastructure ready  
**What's Built:**
- Create backup alerts
- Track unacknowledged alerts
- Acknowledge alerts
- Alert persistence

**What's Needed:**
- [ ] Get alerts endpoint (`GET /api/alerts`)
- [ ] Acknowledge alert (`POST /api/alerts/:id/acknowledge`)
- [ ] Configure alert rules (`POST /api/alerts/rules`)
- [ ] Alert preferences per user

**Priority:** MEDIUM - Improves system monitoring

---

#### 8. File Management Service
**Service:** `src/services/file_service.rs`  
**Status:** File storage system built  
**What's Built:**
- Store bill files
- Retrieve bill files
- Delete bill files
- Path management

**What's Needed:**
- [ ] Upload file endpoint (`POST /api/files/upload`)
- [ ] Download file endpoint (`GET /api/files/:id`)
- [ ] Delete file endpoint (`DELETE /api/files/:id`)
- [ ] List files endpoint (`GET /api/files`)

**Priority:** MEDIUM - Needed for bill image storage

---

#### 9. Health Check & Connectivity
**Service:** `src/services/health_check.rs`  
**Status:** Connectivity checking implemented  
**What's Built:**
- Check WooCommerce connectivity
- Check QuickBooks connectivity
- Check Supabase connectivity
- Cache connectivity status
- Error message tracking

**What's Needed:**
- [ ] Check connectivity endpoint (`GET /api/health/connectivity`)
- [ ] Check specific platform (`GET /api/health/connectivity/:platform`)
- [ ] Clear cache endpoint (`POST /api/health/cache/clear`)
- [ ] Dashboard integration

**Priority:** LOW - Nice to have for troubleshooting

---

### 🟢 Advanced - Future Enhancements

#### 10. ID Mapping Service
**Service:** `src/services/id_mapper.rs`  
**Status:** Cross-platform ID mapping ready  
**What's Built:**
- Store ID mappings between platforms
- Retrieve mappings
- Delete mappings
- Multi-platform support

**What's Needed:**
- [ ] Create mapping endpoint (`POST /api/mappings`)
- [ ] Get mapping endpoint (`GET /api/mappings`)
- [ ] Delete mapping endpoint (`DELETE /api/mappings/:id`)
- [ ] Bulk operations

**Priority:** LOW - Sync system handles this internally

---

#### 11. Unit Conversion Service
**Service:** `src/services/unit_conversion_service.rs`  
**Status:** Conversion system implemented  
**What's Built:**
- Define conversion rules
- Convert between units
- Normalize quantities
- Parse quantity strings
- Configuration-driven conversions

**What's Needed:**
- [ ] Convert quantity endpoint (`POST /api/units/convert`)
- [ ] Get conversions endpoint (`GET /api/units/conversions`)
- [ ] Add conversion rule (`POST /api/units/rules`)
- [ ] Product integration

**Priority:** LOW - Useful for specific industries

---

#### 12. Sync Direction Control
**Service:** `src/services/sync_direction_control.rs`  
**Status:** Advanced sync control built  
**What's Built:**
- Configure sync direction per entity
- Source of truth designation
- Conflict strategies
- Sync config management
- Conflict tracking

**What's Needed:**
- [ ] Get sync config (`GET /api/sync/config`)
- [ ] Set sync direction (`POST /api/sync/config/direction`)
- [ ] Configure entity sync (`POST /api/sync/config/entities`)
- [ ] UI for sync configuration

**Priority:** LOW - Current sync works well

---

## Integration Status

### ✅ Fully Integrated Services
- Product Service
- Customer Service  
- Sales Service
- Inventory Service
- Settings Service
- Authentication
- Tenant Management
- Sync Orchestrator (basic)
- Backup Service (basic)
- Webhook Handlers

### ⚠️ Partially Integrated
- Audit Logger (some methods unused)
- Backup Service (advanced features unused)
- Credential Service (verification unused)
- Search Service (some methods unused)
- Sync Scheduler (webhook features unused)

### ❌ Not Integrated
- Work Order Management
- Bill Ingest Service
- OCR Service
- Parsing Service
- Offline Credit Checker
- Matching Engine
- Conflict Resolver
- Barcode Service
- Alert Service
- File Service
- Health Check Service
- ID Mapper
- Unit Conversion

## Implementation Priority

### Phase 1: Critical Business Features (Next Sprint)
1. **Work Order Management** - Service businesses need this
2. **Bill OCR & Ingestion** - Automated data entry
3. **Offline Credit Checking** - Offline reliability

### Phase 2: Enhanced Features (Following Sprint)
4. **Product Matching Engine** - Improve bill processing
5. **Conflict Resolution UI** - Better sync management
6. **Barcode Generation** - Inventory management
7. **Alert System** - System monitoring

### Phase 3: Advanced Features (Future)
8. **Health Check Dashboard** - Troubleshooting
9. **File Management UI** - Document storage
10. **Unit Conversion** - Industry-specific needs
11. **Sync Direction Control UI** - Advanced sync config

## Recommendations

### Immediate Actions
1. **Create API handlers** for Phase 1 features
2. **Add routes** to `main.rs` for new endpoints
3. **Test endpoints** with Postman/curl
4. **Document APIs** in OpenAPI spec
5. **Add frontend components** for new features

### Code Organization
- Keep service code as-is (it's well-structured)
- Add handlers in `src/handlers/` directory
- Register routes in `main.rs`
- Add tests in `tests/` directory

### Testing Strategy
- Unit tests for services (already exist)
- Integration tests for new endpoints
- End-to-end tests for workflows
- Load testing for performance

## Summary

**Total Services:** 23  
**Fully Integrated:** 10 (43%)  
**Partially Integrated:** 6 (26%)  
**Not Integrated:** 7 (31%)  

**Estimated Work:**
- Phase 1: 2-3 weeks (3 critical features)
- Phase 2: 2-3 weeks (4 enhanced features)
- Phase 3: 1-2 weeks (4 advanced features)

**Total:** 5-8 weeks to complete all unimplemented features

---

*This audit was generated by analyzing Rust compiler warnings for unused code. Each "dead code" warning represents a feature that's built but not yet exposed through the API.*
