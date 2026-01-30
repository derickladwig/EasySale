# Spec Updates Summary - Universal Data Sync

## Date: January 13, 2026

## Overview

Updated the **universal-data-sync** spec to address incomplete implementations and TODOs found throughout the codebase. The spec now includes comprehensive tasks for finishing incomplete work.

---

## Issues Identified

### 1. QuickBooks Transformer Incomplete (Task 7.3)
**Location**: `backend/rust/src/connectors/quickbooks/transformers.rs`

**Problem**: Task 7.3 marked as complete (✅) but has:
- 5 unused imports causing compiler warnings
- 6 TODO comments for unimplemented features

**Unused Imports**:
- `Serialize` (never used)
- `Deserialize` (never used)
- `MetaData as CustomerMetaData` (never used)
- `MetaData as ItemMetaData` (never used)
- `MetaData as InvoiceMetaData` (never used)
- `CustomField` (never used)

**TODOs Found**:
1. Line 176: Map tax class to QBO tax code
2. Line 195: Configure shipping item ID (hardcoded "SHIPPING_ITEM")
3. Line 220: Transform billing address for invoices
4. Line 221: Transform shipping address for invoices
5. Line 222: Calculate due date based on payment terms
6. Line 228: Map custom fields (max 3 string fields per QBO API)

**Additional Issue**:
- Line 169 in `item.rs`: Account validation not implemented

---

### 2. Sync Orchestrator Incomplete (Task 9.3)
**Location**: `backend/rust/src/services/sync_orchestrator.rs`

**Problem**: 
- Line 211: TODO for implementing actual sync logic per entity type
- Flow modules exist but not wired up to orchestrator

---

### 3. Scheduler Service Incomplete (Task 10.1)
**Location**: `backend/rust/src/services/scheduler_service.rs`

**Problem**:
- Line 362: TODO for sending alerts to administrators on backup failures

---

### 4. Cross-Cutting Authentication Issues
**Locations**: Multiple handler files

**Problem**: Hardcoded `user_id = "current_user"` in:
- `handlers/product.rs` (5 locations: lines 91, 119, 154, 209, 335)
- `handlers/layaway.rs` (1 location: line 412)
- `handlers/work_order.rs` (1 location: line 357)

**Impact**: Audit logging and user tracking not working correctly

---

### 5. OAuth Configuration Issues
**Location**: `backend/rust/src/handlers/integrations.rs`

**Problems**:
- Lines 189, 221: Hardcoded redirect URI `http://localhost:7945/api/integrations/quickbooks/callback`
- Line 226: TODO for state parameter validation (CSRF protection)

---

### 6. Webhook Configuration Storage
**Location**: `backend/rust/src/handlers/webhooks.rs`

**Problem**:
- Lines 662, 677: TODO for database storage of webhook configs
- Currently using in-memory only

---

### 7. Backup Path Configuration
**Location**: `backend/rust/src/handlers/backup.rs`

**Problem**:
- Lines 584, 587: Hardcoded paths `data/backups`, `data/pos.db`, `data/uploads`
- Not configurable per tenant or environment

---

### 8. Tenant Context Extraction
**Locations**: Multiple handler files

**Problem**:
- `handlers/work_order.rs` line 357: TODO for tenant context
- `handlers/layaway.rs` line 412: TODO for tenant context

---

### 9. Report Export Not Implemented
**Location**: `backend/rust/src/handlers/reporting.rs`

**Problem**:
- Line 582: TODO for actual export logic
- Returns placeholder response only

---

### 10. Connectivity Check Hardcoded
**Location**: `backend/rust/src/handlers/sync.rs`

**Problem**:
- Line 78: Hardcoded `is_online: true`
- No actual connectivity check to external services

---

## Changes Made to Spec

### New Task 7.4: Complete QBO Transformer Implementation
Added comprehensive sub-tasks to finish the transformer:
- 7.4.1: Implement tax code mapping
- 7.4.2: Implement billing/shipping address transformation for invoices
- 7.4.3: Implement due date calculation
- 7.4.4: Implement custom field mapping (max 3)
- 7.4.5: Configure shipping item ID
- 7.4.6: Implement account validation
- 7.4.7: Populate MetaData fields (optional)
- 7.4.8: Clean up unused imports

### New Task 9.4: Complete Sync Orchestrator Implementation
- Wire up flow modules to orchestrator
- Implement entity type routing
- Dispatch to appropriate flows

### Updated Task 10.1: Extend Scheduler for Sync Jobs
- Added administrator alerts implementation
- Integrate with notification system

### New Epic 8: Cross-Cutting Concerns & Technical Debt

#### Task 19: Authentication Context Integration
- 19.1: Implement user_id extraction from auth context
- 19.2: Implement configurable redirect URIs for OAuth
- 19.3: Implement state parameter validation for OAuth

#### Task 20: Configuration & Settings Management
- 20.1: Implement webhook configuration storage
- 20.2: Implement configurable backup paths
- 20.3: Implement tenant context extraction

#### Task 21: Reporting & Export Features
- 21.1: Implement report export functionality

#### Task 22: Connectivity & Health Checks
- 22.1: Implement actual connectivity check

---

## Updated Timeline

**Previous**: 11 weeks  
**Updated**: 12 weeks (added Epic 8)

### New Checkpoints Added

**Checkpoint 3.5: QuickBooks Transformers Complete**
- All transformer TODOs resolved
- No unused imports or compiler warnings

**Checkpoint 8.5: Technical Debt Resolved (End of Week 12)**
- All cross-cutting concerns addressed
- Auth context working
- Configuration management complete
- Health checks implemented

---

## Requirements Traceability

All new tasks reference existing requirements from the requirements.md:
- **2.1, 2.4, 2.5**: Data entity synchronization
- **3.5**: Custom field mapping (QBO limitation)
- **10.1, 10.4, 10.5**: Security and access control
- **11.3, 11.4**: QuickBooks integration
- **14.1**: User interface and audit logging
- **9.4, 9.5**: Logging and monitoring

---

## Impact Assessment

### High Priority (Blocking Production)
1. **Task 7.4**: QuickBooks transformer completion - Required for invoice sync
2. **Task 19.1**: User ID from auth context - Required for audit logging
3. **Task 19.3**: OAuth state validation - Security vulnerability
4. **Task 22.1**: Connectivity checks - Required for accurate sync status

### Medium Priority (Production Ready but Incomplete)
1. **Task 9.4**: Sync orchestrator wiring - Flows exist but not integrated
2. **Task 20.1**: Webhook config storage - Currently in-memory only
3. **Task 20.2**: Configurable backup paths - Hardcoded values

### Low Priority (Nice to Have)
1. **Task 10.1**: Administrator alerts - Improves monitoring
2. **Task 21.1**: Report export - Feature enhancement
3. **Task 7.4.7**: MetaData population - Optional metadata

---

## Next Steps

1. **Review this summary** with the team
2. **Prioritize tasks** based on production readiness needs
3. **Execute high-priority tasks** first (7.4, 19.1, 19.3, 22.1)
4. **Update project timeline** to reflect 12-week estimate
5. **Begin implementation** starting with Task 7.4
6. **Consider creating a cross-cutting concerns spec** for authentication and configuration issues that affect multiple features

---

## Cross-Feature Impact

The following issues identified in Epic 8 affect **multiple features** beyond just universal-data-sync:

### Authentication Context (Task 19.1)
**Affected Features**:
- Universal Product Catalog (`handlers/product.rs` - 5 locations)
- Layaway Management (`handlers/layaway.rs` - 1 location)
- Work Order Management (`handlers/work_order.rs` - 1 location)
- Universal Data Sync (audit logging)

**Recommendation**: Consider creating a dedicated spec for "Authentication & Authorization Infrastructure" or adding these tasks to the foundation-infrastructure spec.

### Configuration Management (Tasks 19.2, 20.2, 20.3)
**Affected Features**:
- Universal Data Sync (OAuth, webhooks, backups)
- All features using tenant context
- All features using backup functionality

**Recommendation**: These could be part of a "Configuration Management" spec or added to settings-consolidation spec.

### Reporting Export (Task 21.1)
**Affected Features**:
- Reporting module
- Universal Data Sync (log export)
- Any feature requiring data export

**Recommendation**: Could be part of a "Reporting & Analytics" spec.

---

## Notes

- All tasks are now properly tracked in `.kiro/specs/universal-data-sync/tasks.md`
- Each task references specific requirements for traceability
- Compiler warnings will be resolved once Task 7.4.8 is complete
- No new requirements added - all tasks implement existing requirements
- Epic 8 can be executed in parallel with other epics if needed

---

## Files Modified

1. `.kiro/specs/universal-data-sync/tasks.md` - Added Tasks 7.4, 9.4, Epic 8 (Tasks 19-22), updated timeline and checkpoints

---

## Validation

To verify all TODOs are now tracked, run:
```bash
# Find all TODOs in Rust code
rg "TODO:|FIXME:|XXX:" --type rust

# Check against tasks.md to ensure all are tracked
```

Current TODO count: **16 TODOs** found across 8 files  
All TODOs now tracked in spec: ✅

---

## Conclusion

The universal-data-sync spec is now **complete and accurate**, reflecting the actual state of the codebase. All incomplete work is properly tracked with clear sub-tasks, requirements references, and implementation guidance.

The spec can now be used to:
1. Complete the QuickBooks integration
2. Resolve technical debt
3. Achieve production readiness
4. Maintain code quality standards
