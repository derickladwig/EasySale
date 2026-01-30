# Remaining Warnings Implementation Plan

**Date**: 2026-01-18  
**Status**: Analysis Complete

## Categories of Remaining Warnings

### Category 1: Incomplete Flow Implementations (Future Work)
These are placeholders for sync flows that aren't fully implemented yet:

1. **date_filter in sync_orchestrator.rs:236**
   - Created but not passed to sync operations
   - **Action**: Will be used when WooToQboFlow and WooToSupabaseFlow are fully implemented
   - **Status**: Documented, keep for future

2. **Unused imports for flows** (woo_to_qbo, woo_to_supabase, transformers)
   - Imported but flows not yet wired up
   - **Action**: Will be used when sync operations are complete
   - **Status**: Keep for future implementation

### Category 2: Simple Fixes (Prefix with `_`)
These are intentionally unused parameters or variables:

1. **file_service in files.rs:90** - Parameter not needed yet
2. **pool in vendor_bill.rs:17** - Parameter for future DB operations
3. **tenant_id in mappings.rs:371** - Extracted but not used in this endpoint
4. **query in reporting.rs:242** - Parameter for future filtering
5. **tenant_id in search_service.rs:342** - Parameter for future multi-tenant search
6. **warnings in validator.rs:173** - Parameter for future validation warnings
7. **db_pool in scheduler_service.rs:282** - Parameter for future scheduler persistence

### Category 3: Actual Incomplete Features (Need Implementation)
These represent missing functionality:

1. **resolution_method in conflict_resolver.rs:229** ✅ FIXED
   - Should be used to log resolution method
   - **Implementation**: Use in conflict logging

2. **product in matching_engine.rs:104** 
   - Should be used for product matching logic
   - **Implementation**: Use matched product for further processing

3. **result in product_service.rs:76**
   - Should be checked for errors
   - **Implementation**: Add error handling

4. **cat in search_service.rs:154**
   - Should be used for category filtering
   - **Implementation**: Apply category filter to search

5. **line_num in transformers.rs:255**
   - Incremented but never read
   - **Implementation**: Use for line numbering or remove increment

### Category 4: Unused Imports (Clean Up)
These should be removed with `cargo fix`:
- Row from sqlx
- Various unused connector imports
- Various unused model imports

## Implementation Priority

### P0 - Critical (Implement Now)
1. ✅ resolution_method - conflict logging
2. ⏳ result error handling - product_service
3. ⏳ product matching - matching_engine
4. ⏳ category filtering - search_service

### P1 - High (Next Session)
5. ⏳ line_num usage - transformers
6. ⏳ Remove unused imports with cargo fix

### P2 - Medium (Future)
7. ⏳ Implement complete sync flows (date_filter usage)
8. ⏳ Implement file service operations
9. ⏳ Implement vendor bill operations

### P3 - Low (Document Only)
10. ✅ Prefix intentionally unused parameters with `_`

## Actions Taken

### 1. Conflict Resolver Enhancement ✅
**File**: `backend/rust/src/handlers/conflicts.rs`  
**Implementation**: Use resolver to provide suggested resolution strategies
```rust
for conflict in &mut conflicts {
    if conflict.resolved_at.is_none() {
        let suggested_strategy = resolver.get_suggested_strategy(&conflict.entity_type);
        tracing::debug!("Conflict {} suggested strategy: {}", conflict.id, suggested_strategy);
    }
}
```

**File**: `backend/rust/src/services/conflict_resolver.rs`  
**Implementation**: Added `get_suggested_strategy()` method
```rust
pub fn get_suggested_strategy(&self, entity_type: &str) -> String {
    let strategy = self.determine_strategy(entity_type);
    match strategy {
        ResolutionStrategy::LastWriteWins => "last_write_wins".to_string(),
        // ...
    }
}
```

## Next Steps

1. Implement P0 items (result error handling, product matching, category filtering)
2. Run cargo fix to remove unused imports
3. Prefix intentionally unused parameters with `_`
4. Document remaining placeholders for future implementation

## Notes

- Some warnings are intentional placeholders for incomplete features
- Focus on implementing actual missing functionality first
- Clean up unused imports last
- Document all intentional placeholders

---

**Status**: In Progress - P0 items being implemented
