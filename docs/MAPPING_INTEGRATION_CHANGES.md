# Mapping + Domain Integration Hardening - Changes Summary

## Date: 2026-01-25

## Overview

This document summarizes the changes made to validate and fix how document/OCR outputs integrate with the app domain.

## Files Modified

### Backend

#### 1. `backend/crates/server/src/services/matching_engine.rs`

**Before**: Basic matching with limited strategies and no product details in results.

**After**:
- Added `MatchSuggestionsRequest` and `MatchSuggestionsResponse` types
- Enhanced `MatchCandidate` with `product_id`, `category`, `cost`, `quantity_on_hand` fields
- Added `match_by_mpn_or_barcode()` method for MPN/barcode matching
- Added `get_suggestions()` method for ranked match suggestions
- Added `get_match_suggestions()` public API method
- Added `normalize_for_matching()` helper
- Enhanced all match methods to return full product details in alternatives
- Improved fuzzy matching to gather alternatives even when no match found

#### 2. `backend/crates/server/src/handlers/vendor_bill.rs`

**Before**: Basic CRUD operations for vendor bills.

**After**:
- Added `MatchingEngine` import
- Added `get_match_suggestions()` endpoint - GET `/api/vendor-bills/match-suggestions`
- Added `create_product_from_line()` endpoint - POST `/api/vendor-bills/{bill_id}/create-product`
- Added `reopen_bill()` endpoint - POST `/api/vendor-bills/{bill_id}/reopen`
- New endpoints support:
  - SKU/MPN matching algorithm with suggestions
  - Creating new products from unmatched line items
  - Vendor catalog reference storage
  - Automatic vendor SKU alias creation
  - Re-opening posted bills for editing

### Frontend

#### 3. `frontend/src/domains/vendor-bill/types.ts`

**Before**: Basic types without match suggestion support.

**After**:
- Enhanced `MatchCandidate` with `product_id`, `category`, `cost`, `quantity_on_hand`
- Added `MatchSuggestionsResponse` type
- Added `CreateProductFromLineRequest` type
- Added `CreateProductFromLineResponse` type

#### 4. `frontend/src/domains/vendor-bill/api.ts`

**Before**: Basic API functions.

**After**:
- Added `getMatchSuggestions()` function
- Added `createProductFromLine()` function
- Added `reopenBill()` function

#### 5. `frontend/src/components/vendor-bill/BillReview.tsx`

**Before**: Basic bill review with manual SKU entry only.

**After**:
- Added match suggestions state and loading
- Added create product dialog state and form
- Added `loadMatchSuggestions()` function
- Added `handleSelectSuggestion()` function
- Added `handleOpenCreateProduct()` function
- Added `handleCreateProduct()` function
- Added `handleReopenBill()` function
- Enhanced Edit Match Dialog with:
  - Match suggestions dropdown with confidence scores
  - Product details (category, cost, quantity)
  - "Create New Product" button
- Added Create Product Dialog with:
  - Pre-filled form from line item data
  - Vendor catalog reference field
  - Auto-create alias checkbox
- Added "Reopen Bill" button for posted bills
- Added "Create Part" button for unmatched line items

### Documentation

#### 6. `docs/vendor-bill-mapping-contract.md` (NEW)

Complete documentation of the mapping contract including:
- Entity relationships
- Matching strategies with confidence levels
- Cost policies
- API endpoints
- Export compatibility (QBO, WooCommerce, Shopify)
- UI affordances
- Audit trail
- Error handling
- Security considerations

## Mapping Contract Summary

```
OCR Document
  → Vendor Bill (header: vendor, date, total, bill number)
    → Line Items (part number, description, qty, unit price, total)
      → Part Matching (SKU, MPN, vendor catalog ref)
        → Part Creation (if no match)
          → Cost Update (update part cost from bill)
            → Inventory Adjustment (optional: receive stock)
```

## Matching Strategies (Priority Order)

1. **Exact Alias Match** (confidence: 1.0) - Vendor SKU aliases
2. **Exact Internal SKU** (confidence: 0.9) - Direct SKU match
3. **MPN/Barcode Match** (confidence: 0.85) - Barcode or MPN attribute
4. **Fuzzy Description** (confidence: 0.5-0.8) - Levenshtein similarity
5. **Historical Match** (confidence: 0.75) - Previously confirmed matches

## UI Affordances Added

1. ✅ Part match suggestions dropdown
2. ✅ "Create Part" button on unmatched line items
3. ✅ Vendor catalog reference field
4. ✅ Cost update confirmation (via cost policy selection)
5. ✅ Inventory adjustment option (via receiving flow)
6. ✅ Reopen/edit flows for finalized bills

## Export Compatibility

- ✅ QuickBooks Online - Bills sync via existing QBO handlers
- ✅ WooCommerce - Products sync via existing WooCommerce handlers
- ✅ Shopify - Products sync via existing Shopify handlers

No breaking changes to export functionality.

## Rules Followed

- ✅ NO DELETES - only additive changes
- ✅ No "TODO" placeholders - implemented real functionality
- ✅ Used existing patterns from the codebase
- ✅ Kept changes minimal and safe
- ✅ Multi-tenant boundaries respected (tenant_id filtering)
- ✅ Store-specific rules respected (store_id scoping)
