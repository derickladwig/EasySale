# Full Project Audit - What's Left to Complete

**Date:** January 30, 2026  
**Status:** Comprehensive audit of remaining work  
**Total Issues:** 200+ across frontend, backend, CI/CD, security, and documentation

---

## Executive Summary

| Category | High | Medium | Low | Total |
|----------|------|--------|-----|-------|
| Frontend TODOs | 6 | 8 | 10+ | 24+ |
| Backend TODOs | 5 | 18 | 2 | 25+ |
| Theming/CSS | 3 | 10 | 5+ | 18+ |
| Settings Architecture | 7 | 0 | 0 | 7 |
| Test/CI Gaps | 3 | 4 | 2 | 9 |
| **Security Issues** | **2** | **2** | **2** | **6** |
| **Code Quality** | **1** | **3** | **20+** | **24+** |
| **Documentation** | **3** | **4** | **3** | **10** |
| **TOTAL** | **30** | **49** | **44+** | **123+** |

---

## Priority 0 - Critical Blockers

### 1. ConfigStore Methods Not Implemented
**File:** `frontend/src/config/ConfigStore.ts`
**Lines:** 193-240

```typescript
// These all throw "Not implemented" errors:
getSetting()      // Line 193
setSetting()      // Line 201
getTheme()        // Line 209
setTheme()        // Line 222
getTenantConfig() // Line 230
getResolvedConfig() // Line 240
```

**Impact:** Blocks theme/config functionality for multi-tenant support.

### 2. Sync Queue Processor - Entity Operations Are Stubs
**File:** `backend/crates/server/src/services/sync_queue_processor.rs`
**Lines:** 640-690

```rust
// All these just log debug messages, no actual implementation:
create_product()  // Line 640
update_product()  // Line 646
delete_product()  // Line 652
create_order()    // Line 658
update_order()    // Line 664
delete_order()    // Line 670
create_invoice()  // Line 676
update_invoice()  // Line 682
delete_invoice()  // Line 688
```

**Impact:** Core sync functionality doesn't actually sync data.

### 3. Settings Handlers Return Mock Data
**File:** `backend/crates/server/src/handlers/settings_handlers.rs`
**Lines:** 35, 64, 143

```rust
get_effective_settings()    // Returns mock data
export_effective_settings() // Returns mock data
get_mock_settings()         // TODO marker
```

**Impact:** Settings API doesn't return real data.

### 4. Export Handlers Are Placeholders
**File:** `backend/crates/server/src/handlers/export.rs`
**Lines:** 42, 60, 70

```rust
export_case()         // Returns placeholder URL
generate_csv_export() // Stub
generate_json_export() // Stub
```

**Impact:** Export functionality doesn't work.

### 5. CSV Exports Return Empty Data
**File:** `backend/crates/csv_export_pack/src/generic.rs`
**Lines:** 31, 57, 80

```rust
// All return CSV with headers only, no data:
export_products()   // Empty
export_customers()  // Empty
export_inventory()  // Empty
```

**Impact:** Data export is broken.

---

## Priority 1 - High Impact Issues

### Frontend

| # | Issue | File | Line | Fix |
|---|-------|------|------|-----|
| 1 | Admin user creation not implemented | `AdminStepContent.tsx` | 86 | Call backend API |
| 2 | Password reset missing | `useUsers.ts` | 107 | Implement endpoint |
| 3 | Review queue assign not working | `ReviewQueueIntegrated.tsx` | 60 | Implement handler |
| 4 | Review queue export not working | `ReviewQueueIntegrated.tsx` | 74 | Implement handler |
| 5 | Period calculations missing | `ReportingPage.tsx` | 46 | Calculate from data |
| 6 | Remote stores returns empty | `settings/hooks.ts` | 74 | Connect to backend |

### Backend

| # | Issue | File | Line | Fix |
|---|-------|------|------|-----|
| 1 | Customer import not implemented | `data_management.rs` | 339 | Implement import |
| 2 | Vendor import not implemented | `data_management.rs` | 351 | Implement import |
| 3 | Hardcoded tenant ID everywhere | `sync_operations.rs` | Multiple | Extract from auth |
| 4 | Performance metrics are mock | `performance_export.rs` | 21 | Query real data |
| 5 | Webhook config not persisted | `webhooks.rs` | 663, 678 | Add DB storage |
| 6 | OAuth redirect URIs hardcoded | `integrations.rs` | 190, 285 | Use config |

### Theming (P1 Remaining)

| # | Issue | File | Fix |
|---|-------|------|-----|
| 1 | Theme toggle on login | `LoginPage.tsx` | Add ThemeToggle component |
| 2 | Add semantic tokens | `tokens.css` | Add status color scales |

---

## Priority 2 - Medium Impact Issues

### Frontend

| # | Issue | File | Line |
|---|-------|------|------|
| 1 | OCR alternatives not populated | `GuidedReviewViewIntegrated.tsx` | 147 |
| 2 | "Never logged in" filter broken | `UsersTab.tsx` | 109 |
| 3 | Customers hook returns empty | `customers/hooks.ts` | 32 |
| 4 | Logger not sending to monitoring | `logger.ts` | 53 |
| 5 | Test utilities incomplete | `test/utils.tsx` | 8 |

### Backend

| # | Issue | File | Line |
|---|-------|------|------|
| 1 | Inventory rollback not implemented | `inventory_integration_service.rs` | 254 |
| 2 | Backup retention field missing | `backup_service.rs` | 1353 |
| 3 | Store names hardcoded | `conflicts.rs` | 238-239 |
| 4 | User/store lookups missing | `product_advanced.rs` | 270, 316, 319, 397 |
| 5 | Backup paths hardcoded | `backup.rs` | 584, 587 |
| 6 | Critical zones empty | `cleanup.rs` | 487 |
| 7 | Time formatting placeholder | `stats.rs` | 216 |
| 8 | Account validation missing | `quickbooks/item.rs` | 174 |
| 9 | Admin alerts not implemented | `scheduler_service.rs` | 362 |
| 10 | Review counters always 0 | `review_session_service.rs` | 163-164 |
| 11 | Token revocation missing | `google_drive_oauth.rs` | 308 |
| 12 | Layaway query hardcoded | `layaway.rs` | 412 |
| 13 | Entity type hardcoded | `csv_export_pack/quickbooks.rs` | 61, 110, 157 |
| 14 | Tax/discount loading missing | `pos_core_storage/transaction.rs` | 280-281 |

### Theming (P2)

| # | Issue | File |
|---|-------|------|
| 1 | NetworkStepContent colors | `NetworkStepContent.tsx` |
| 2 | BackupsPage colors | `BackupsPage.tsx` |
| 3 | ScopeBadge dark mode | `ScopeBadge.tsx` |
| 4 | ThemeEngine hardcoded defaults | `ThemeEngine.ts` |

---

## Priority 3 - Low Impact / Cleanup

### Frontend

| # | Issue | File |
|---|-------|------|
| 1 | Test validation fixes needed | `DynamicCategoryForm.test.tsx` |
| 2 | Theme lockContrast not implemented | `ThemeEngine.ts` |
| 3 | Widget types not all implemented | `DynamicWidget.tsx` |

### Backend

| # | Issue | File |
|---|-------|------|
| 1 | Placeholder tests need implementation | Multiple test files |
| 2 | PDF support TODOs | Documentation |

### Theming (P3)

| # | Issue | File |
|---|-------|------|
| 1 | SettingsSearch colors | `SettingsSearch.tsx` |
| 2 | PermissionMatrix colors | `PermissionMatrix.tsx` |
| 3 | EffectiveSettingsView colors | `EffectiveSettingsView.tsx` |
| 4 | SettingsPageShell colors | `SettingsPageShell.tsx` |
| 5 | defaultConfig brand names | `defaultConfig.ts` |
| 6 | brandConfig brand names | `brandConfig.ts` |

---

## Settings Architecture Issues

From `audit/SETTINGS_ARCHITECTURE_AUDIT.md`:

| # | Issue | Severity |
|---|-------|----------|
| 1 | 21 flat navigation items | High |
| 2 | Dual navigation patterns | High |
| 3 | Code duplication | Medium |
| 4 | Placeholder sections | Low |
| 5 | Route mismatch bug | Medium |
| 6 | Redundant sections | Medium |
| 7 | No logical grouping | High |

---

## Test & CI/CD Gaps

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | E2E tests not in CI | High | Add Playwright job to ci.yml |
| 2 | Coverage failures non-blocking | High | Set `fail_ci_if_error: true` |
| 3 | Skipped tests need review | Medium | Fix or remove quarantined tests |
| 4 | Backend coverage tool inconsistency | Medium | Standardize on one tool |
| 5 | Python tests non-blocking | Medium | Fix tests or make blocking |
| 6 | Coverage thresholds not enforced | Medium | Add threshold checks |
| 7 | Property test documentation | Low | Document patterns |
| 8 | Test performance monitoring | Low | Add metrics |
| 9 | Smoke tests missing | Medium | Create quick verification |

---

## POS System Remaining Issues

From `DEVELOPMENT_LOG.md`:

### Minor Issues
1. Email receipt - Shows "coming soon" placeholder
2. Duplicate state bug - `showCouponModal` declared twice in SellPage.tsx
3. DiscountModal signature - Type parameter ignored
4. Coupon validation - Falls back to mock if API unavailable

### Feature Gaps
5. Hold/suspend transaction - Cannot pause sales
6. Customer transaction history endpoint - API missing
7. Tax rate configurable - Currently hardcoded 13%
8. Cart persistence - Cart lost on refresh
9. CASCADE constraints - Prevent orphaned records
10. Soft delete customers - Preserve history

---

## Estimated Effort by Area

| Area | Effort | Priority |
|------|--------|----------|
| ConfigStore implementation | 2-3 days | P0 |
| Sync queue entity operations | 3-5 days | P0 |
| Settings handlers real data | 1-2 days | P0 |
| Export functionality | 2-3 days | P0 |
| Data import (customers/vendors) | 1-2 days | P1 |
| Auth context integration | 1 day | P1 |
| Theming P1-P2 fixes | 1-2 days | P1-P2 |
| Settings architecture refactor | 3-5 days | P2 |
| Test/CI fixes | 1-2 days | P2 |
| P3 cleanup | 1-2 days | P3 |

**Total estimated effort:** 15-25 days for full completion

---

## Quick Wins (Can Fix in < 1 Hour Each)

1. Fix duplicate `showCouponModal` state in SellPage.tsx
2. Add theme toggle to login page
3. Fix route mismatch `/admin/branding`
4. Remove placeholder sections from AdminPage
5. Fix hardcoded tenant IDs (search & replace)
6. Add semantic tokens to tokens.css
7. Fix time formatting in stats.rs

---

## Files Most Needing Attention

| File | Issue Count | Priority |
|------|-------------|----------|
| `sync_queue_processor.rs` | 9 stubs | P0 |
| `ConfigStore.ts` | 6 not implemented | P0 |
| `settings_handlers.rs` | 3 mock data | P0 |
| `export.rs` | 3 placeholders | P0 |
| `sync_operations.rs` | 7 hardcoded tenant | P1 |
| `AdminPage.tsx` | 21 nav items, 3 placeholders | P2 |
| `LoginPage.tsx` | Theme toggle missing | P1 |

---

## Security Issues

### High Severity

| # | Issue | File | Line | Fix |
|---|-------|------|------|-----|
| 1 | Auth token in localStorage | `AuthContext.tsx` | 119 | Move to httpOnly cookies |
| 2 | Default webhook secret fallback | `webhooks.rs` | 47 | Fail if env var missing |

### Medium Severity

| # | Issue | File | Fix |
|---|-------|------|-----|
| 3 | No CSRF protection | API layer | Implement CSRF tokens |
| 4 | Dynamic SQL table names | `sync_queue_processor.rs:557` | Validate against allowlist |

### Low Severity

| # | Issue | File | Fix |
|---|-------|------|-----|
| 5 | Input validation consistency | Various | Audit all input points |
| 6 | Dynamic column names in UPDATE | `work_order.rs:304` | Validate column names |

---

## Code Quality Issues

### High Severity

| # | Issue | Files | Count |
|---|-------|-------|-------|
| 1 | Console.log in production | `components/review/*.tsx` | 8 files |

### Medium Severity

| # | Issue | Files | Count |
|---|-------|-------|-------|
| 2 | Missing error handling | Review components | 3 components |
| 3 | Missing loading states | Review components | 3 components |
| 4 | Missing error states | Review components | 4 components |

### Low Severity (TypeScript `any` types)

| # | File | Line(s) |
|---|------|---------|
| 1 | `ProductForm.tsx` | 77 |
| 2 | `BillHistory.tsx` | 53, 76 |
| 3 | `VendorMappings.tsx` | 58, 81 |
| 4 | `BillUpload.tsx` | 159 |
| 5 | `BackupsPage.tsx` | 1497 |
| 6 | `lazyRoutes.tsx` | 33 |
| 7 | `HardwareTemplates.tsx` | 11-15 |
| 8 | `favicon.ts` | 59, 72, 90, 103 |
| 9 | `UsersTab.tsx` | 317 |
| 10 | `EntityEditorModal.tsx` | 60, 79, 118 |
| 11 | `EditUserModal.tsx` | 124, 162 |
| 12 | `settingsApi.ts` | 80, 85, 94, 99 |
| 13 | `SettingsPersistence.ts` | 59, 95, 159, 176, 193 |
| 14 | `EffectiveSettingsView.tsx` | 7, 15, 59, 101 |
| 15 | `RolesTab.tsx` | 33, 38, 52, 58, 69 |
| 16 | `SyncConfiguration.tsx` | 67, 97 |
| 17 | `GuidedReviewView.tsx` | 21, 22 |
| 18 | `DynamicWidget.tsx` | 45, 243 |
| 19 | `DataTable.tsx` | 21 |

---

## Documentation Gaps

### High Severity

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | Port mismatch in API docs | `docs/api/*.md` | Change 3000 → 8923 |
| 2 | 100+ undocumented endpoints | Backend | Create API reference |
| 3 | Broken link | `README.md:229` | Fix `docs/integrations/payments.md` |

### Medium Severity

| # | Issue | Fix |
|---|-------|-----|
| 4 | No OpenAPI/Swagger spec | Generate from code |
| 5 | Missing permission docs | Document per endpoint |
| 6 | CHANGELOG incomplete | Add recent changes |
| 7 | No API versioning docs | Document strategy |

### Low Severity

| # | Issue | Fix |
|---|-------|-----|
| 8 | Missing request/response examples | Add to API docs |
| 9 | No comprehensive error codes | Document all errors |
| 10 | No API index | Create master endpoint list |

---

## Quick Wins (< 1 Hour Each)

### Already Identified
1. Fix duplicate `showCouponModal` state in SellPage.tsx
2. Add theme toggle to login page
3. Fix route mismatch `/admin/branding`
4. Remove placeholder sections from AdminPage
5. Fix hardcoded tenant IDs (search & replace)
6. Add semantic tokens to tokens.css
7. Fix time formatting in stats.rs

### New Quick Wins
8. Remove console.log from review components (8 files)
9. Fix port numbers in API docs (3000 → 8923)
10. Fix broken link in README.md
11. Remove default_secret fallback in webhooks.rs
12. Update CHANGELOG with recent changes

---

## Estimated Total Effort (Updated)

| Area | Days |
|------|------|
| P0 Critical fixes | 8-13 |
| P1 High impact | 4-6 |
| Security fixes | 2-3 |
| Code quality cleanup | 2-3 |
| Documentation | 2-3 |
| P2-P3 Cleanup | 3-6 |
| **Total** | **21-34 days** |

---

*Last Updated: 2026-01-30 (Comprehensive Update)*
