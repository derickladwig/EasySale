# Dead Code Cleanup Plan

**Date**: January 19, 2026  
**Status**: Action Required

## Overview

This document lists all unused code that needs to be either:
1. **REMOVED** - Not needed, delete it
2. **IMPLEMENTED** - Needed but not wired up yet

---

## Category 1: REMOVE - Unused Future Features

These are placeholder implementations that aren't needed for production:

### Multi-Tenant Context System (Not Used)
**Files**: `backend/rust/src/config/tenant.rs`
- [ ] `TenantContext` struct
- [ ] `TenantContextExtractor` struct  
- [ ] `TenantContextMiddleware` struct
- [ ] `TenantIdentificationStrategy` enum
- [ ] `get_tenant_context()` function
- [ ] `require_tenant_context()` function
- [ ] `extract_tenant_id()` method

**Action**: Already marked with `#[allow(dead_code)]` - KEEP for future multi-tenant expansion

---

### Schema Generator (Not Used)
**Files**: `backend/rust/src/config/schema.rs`
- [ ] `SchemaGenerator` struct
- [ ] `SqlType` enum
- [ ] `from_config_type()` method
- [ ] `to_sql()` method

**Action**: REMOVE - Not needed, dynamic schema not implemented

---

### Retry System (Partially Used)
**Files**: `backend/rust/src/connectors/common/retry.rs`
- [ ] `RetryConfig` struct
- [ ] `RetryPolicy` struct
- [ ] `retry_with_backoff()` function
- [ ] `retry_with_condition()` function
- [ ] `retry_with_retry_after()` function

**Action**: Already marked with `#[allow(unused_imports)]` - KEEP for future use in connectors

---

### WooCommerce Models (Not Wired Up)
**Files**: `backend/rust/src/connectors/woocommerce/*.rs`

**Unused Structs**:
- [ ] `WooCommerceError`
- [ ] `WooCommerceOrder`
- [ ] `BillingAddress`
- [ ] `ShippingAddress`
- [ ] `LineItem`
- [ ] `Tax`, `TaxLine`
- [ ] `ShippingLine`, `FeeLine`, `CouponLine`
- [ ] `Refund`
- [ ] `OrderQuery`
- [ ] `WooCommerceProduct`
- [ ] `Dimensions`, `Category`, `Tag`, `Image`
- [ ] `Attribute`, `DefaultAttribute`
- [ ] `MetaData` (multiple)

**Unused Enums**:
- [ ] `OrderStatus`
- [ ] `ProductType`
- [ ] `ProductStatus`

**Unused Methods**:
- [ ] `get_orders()`
- [ ] `get_order()`
- [ ] `get_all_orders()`
- [ ] `post()`, `put()`, `delete()` in client

**Action**: REMOVE or IMPLEMENT - These are for WooCommerce sync which is "complete" but not wired to handlers

---

### Platform Connector Trait (Not Used)
**Files**: `backend/rust/src/connectors/mod.rs`
- [ ] `PlatformConnector` trait
- [ ] `PaginationParams` struct
- [ ] `DateFilter` struct

**Action**: REMOVE - Not needed, each connector has its own interface

---

### Cache Methods (Not Used)
**Files**: `backend/rust/src/services/tenant_resolver.rs`
- [ ] `clear_cache()` method
- [ ] `cache_stats()` method

**Action**: REMOVE - Cache management not needed in production

---

### Config Errors (Not Used)
**Files**: `backend/rust/src/config/error.rs`
- [ ] `SchemaError` variant
- [ ] `TenantNotFound` variant
- [ ] `json_error_to_config_error()` function

**Action**: REMOVE - Not used in current implementation

---

### Parser Method (Not Used)
**Files**: `backend/rust/src/services/ocr_service.rs` (or similar)
- [ ] `store_parse_result()` method

**Action**: REMOVE - Not used

---

## Category 2: IMPLEMENT - Needed But Not Wired Up

These should be connected to make the system fully functional:

### WooCommerce Sync (Implemented but not wired)
**Status**: Models and transformers exist, but not connected to API handlers

**Action Required**:
1. Wire up WooCommerce connector to sync handlers
2. Connect `get_orders()`, `get_order()` to sync orchestrator
3. Enable WooCommerce → QuickBooks sync flow
4. Enable WooCommerce → Supabase sync flow

**Files to Update**:
- `backend/rust/src/handlers/sync_operations.rs`
- `backend/rust/src/services/sync_orchestrator.rs`

**Estimated Time**: 2-3 hours

---

## Cleanup Actions

### Immediate (High Priority)

1. **Remove Schema Generator** (15 min)
   ```bash
   # Remove unused schema generation code
   - Delete SqlType enum
   - Delete SchemaGenerator struct
   - Remove from_config_type, to_sql methods
   ```

2. **Remove Platform Connector Trait** (10 min)
   ```bash
   # Remove unused trait
   - Delete PlatformConnector trait
   - Delete PaginationParams struct
   - Delete DateFilter struct
   ```

3. **Remove Cache Methods** (5 min)
   ```bash
   # Remove from TenantResolver
   - Delete clear_cache() method
   - Delete cache_stats() method
   ```

4. **Remove Unused Config Errors** (5 min)
   ```bash
   # Remove from ConfigError enum
   - Delete SchemaError variant
   - Delete TenantNotFound variant
   - Delete json_error_to_config_error function
   ```

5. **Remove store_parse_result** (2 min)
   ```bash
   # Find and remove unused method
   ```

**Total Time**: ~40 minutes

---

### Optional (Low Priority)

6. **Wire Up WooCommerce Sync** (2-3 hours)
   - Connect WooCommerce models to sync handlers
   - Enable sync flows
   - Test end-to-end

7. **Remove WooCommerce Models** (30 min)
   - Only if NOT wiring up sync
   - Remove all unused WooCommerce structs/enums

---

## Recommendation

### For Production Deployment NOW:

**Do the Immediate cleanup** (40 minutes):
- Remove schema generator
- Remove platform connector trait  
- Remove cache methods
- Remove unused config errors
- Remove store_parse_result

This will eliminate ~90% of dead code warnings.

### For Future Enhancement:

**Wire up WooCommerce sync** (2-3 hours):
- This makes the Universal Data Sync feature fully functional
- Connects all the existing WooCommerce code
- Enables WooCommerce → QuickBooks/Supabase flows

---

## Decision Required

**Option A**: Clean up dead code now (40 min) → Deploy
- Removes unused code
- System is production-ready
- WooCommerce sync can be added later

**Option B**: Wire up WooCommerce sync (3 hours) → Deploy
- Fully functional sync system
- All features working
- No dead code warnings

**Option C**: Do both (4 hours total)
- Clean system
- All features working
- Production-ready with no warnings

---

## My Recommendation

**Do Option A** (40 minutes cleanup):
1. Remove the 5 immediate items
2. Deploy to production
3. Add WooCommerce sync later if needed

This gets you to production fastest with a clean codebase.

---

## Files to Modify

### Immediate Cleanup:
1. `backend/rust/src/config/schema.rs` - Remove schema generator
2. `backend/rust/src/connectors/mod.rs` - Remove platform connector trait
3. `backend/rust/src/services/tenant_resolver.rs` - Remove cache methods
4. `backend/rust/src/config/error.rs` - Remove unused error variants
5. Find and remove `store_parse_result` method

### Optional (WooCommerce):
6. `backend/rust/src/handlers/sync_operations.rs` - Wire up WooCommerce
7. `backend/rust/src/services/sync_orchestrator.rs` - Connect flows

---

**What do you want to do?**
- A) Quick cleanup (40 min) and deploy
- B) Wire up WooCommerce (3 hours) then deploy
- C) Both (4 hours total)
