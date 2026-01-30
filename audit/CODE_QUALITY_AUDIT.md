# Code Quality Audit Report

**Date:** January 30, 2026  
**Status:** Audit Only (No fixes applied)

## Executive Summary

| Category | Backend (Rust) | Frontend (TS/React) | Priority |
|----------|---------------|---------------------|----------|
| Dead Code / Unused | 59 instances | N/A | Medium |
| TODO/FIXME Comments | 58 (20 prod) | 20 production | Medium |
| Unsafe Code (.unwrap) | 894 production | N/A | High |
| Type Safety (any) | N/A | 73 `: any` + 105 `as any` | Medium |
| console.log in prod | N/A | 7 instances | Low |
| Hardcoded Secrets | **7 critical** | 0 | **Critical** |
| Empty Error Handling | ~50 expect() | 2 (test files) | Medium |

---

## Critical Issues (Must Fix Before Production)

### 1. Hardcoded Test Secrets in Production Code

| File | Line | Issue |
|------|------|-------|
| `connectors/woocommerce/webhooks.rs` | 104 | `let secret = "test_secret";` |
| `connectors/quickbooks/webhooks.rs` | 307, 324 | `let verifier_token = "test_secret";` |
| `connectors/quickbooks/cloudevents.rs` | 351 | `let verifier_token = "test_secret";` |
| `handlers/auth.rs` | 434, 493, 562, 615 | Hardcoded `"password123"` |
| `handlers/setup.rs` | 33 | Default password `"admin123"` |

**Risk:** Security vulnerability - attackers could use hardcoded secrets.

---

## High Priority Issues

### 2. Excessive `.unwrap()` Usage (Backend)

Found **894 instances** in production code. High-risk files:

| File | Count | Risk |
|------|-------|------|
| `services/variant_generator.rs` | 47 | Panic on invalid data |
| `services/backup_service.rs` | 74 | Panic on backup failure |
| `services/artifact_storage.rs` | 41 | Panic on storage issues |
| `services/retention_service.rs` | 30 | Panic on retention logic |
| `services/zone_detector_service.rs` | 29 | Panic on OCR zones |
| `handlers/review_cases.rs` | 23 | Panic on review data |
| `handlers/auth.rs` | 16 | Panic on auth logic |

**Risk:** Application panics in production instead of graceful error handling.

---

## Medium Priority Issues

### 3. TODO/FIXME Comments (Incomplete Implementations)

**Backend Production Code:**
| File | Line | TODO |
|------|------|------|
| `services/inventory_integration_service.rs` | 254 | Rollback logic not implemented |
| `handlers/integrations.rs` | 190, 285 | Redirect URI should come from config |
| `services/backup_service.rs` | 1353 | Missing retention_count field |
| `connectors/quickbooks/item.rs` | 174 | Account validation missing |
| `services/scheduler_service.rs` | 362 | Alert administrators missing |
| `handlers/conflicts.rs` | 238, 239 | Store names hardcoded |
| `middleware/permissions.rs` | 88 | Audit logging missing |
| `handlers/google_drive_oauth.rs` | 308 | Token decryption/revocation missing |

**Frontend Production Code:**
| File | Line | TODO |
|------|------|------|
| `components/review/ReviewQueueIntegrated.tsx` | 60 | Assign to me functionality |
| `components/review/ReviewQueueIntegrated.tsx` | 73 | Export functionality |
| `admin/hooks/useUsers.ts` | 108 | Password reset endpoint |
| `components/review/FieldReviewItem.tsx` | 41 | Field value save via API |
| `components/review/GuidedReviewView.tsx` | 89 | Field edit modal |
| `settings/hooks.ts` | 74 | Replace mock with API call |
| `customers/hooks.ts` | 32 | Replace mock with API call |

### 4. TypeScript `any` Type Usage

**Production files with most `any` usage:**
| File | Count | Issue |
|------|-------|-------|
| `DynamicTable.tsx` | 10+ | Multiple untyped parameters |
| `EffectiveSettingsView.tsx` | 3 | Untyped settings data |
| `SettingsTable.tsx` | 4 | `as any` assertions |
| `DataManagementPage.tsx` | 4 | `as any` assertions |
| `EntityEditorModal.tsx` | 2 | Untyped form data |

### 5. Dead Code Annotations (Backend)

**Production code with `#[allow(dead_code)]`:**
| File | Lines | Description |
|------|-------|-------------|
| `services/bill_ingest_service.rs` | 15, 28, 58, 366 | Planned features |
| `services/ocr_service.rs` | 6, 11, 19, 28 | Planned OCR features |
| `config/tenant.rs` | 11, 17, 113, 117, 186, 190, 231, 235, 262, 271 | Unused config fields |
| `config/loader.rs` | 214, 270, 298, 302 | Unused config options |
| `connectors/quickbooks/client.rs` | 271, 278, 287 | Unused API methods |

---

## Low Priority Issues

### 6. console.log in Production (Frontend)

| File | Line | Statement |
|------|------|-----------|
| `theme/ThemeEngine.ts` | 483 | `console.log('Applied cached accent colors:', ...)` |
| `theme/ThemeEngine.ts` | 505 | `console.log('Applied cached theme:', ...)` |
| `theme/ThemeEngine.ts` | 517 | `console.log('Applied default theme:', ...)` |
| `common/utils/toast.ts` | 12, 19, 26, 33 | Toast logging statements |

**Recommendation:** Replace with `devLog` utility or remove.

### 7. Hardcoded Localhost URLs (Frontend)

| File | Line | URL |
|------|------|-----|
| `admin/components/wizard/NetworkStepContent.tsx` | 141 | `http://localhost:${DEFAULT_PORT}` |
| `admin/pages/NetworkSettingsPage.tsx` | 122 | `http://localhost:7945` |

**Note:** These are in network configuration UI, may be intentional.

---

## Build Warning: ReceiptLineItem Dead Code

The Docker build warning about `ReceiptLineItem` is a **warning only**, not an error:

```
warning: field `product_name` is never read
   --> handlers/sales.rs:630
    |
626 | struct ReceiptLineItem {
    |        --------------- field in this struct
...
630 |     product_name: Option<String>,
    |     ^^^^^^^^^^^^
```

**Location:** `backend/crates/server/src/handlers/sales.rs:626-631`

**Status:** The struct is used but `product_name` field is never accessed after query. Either:
1. Remove the unused field, or
2. Add `#[allow(dead_code)]` if field is needed for future use

---

## Recommendations

### Immediate (Before Production)
1. ❌ Remove hardcoded test secrets from webhook handlers
2. ❌ Replace hardcoded default password in setup handler
3. ❌ Move test passwords from `handlers/auth.rs` to test files

### High Priority
4. Replace critical `.unwrap()` calls with proper error handling
5. Address TODO items related to missing security features (audit logging, token revocation)

### Medium Priority
6. Define proper TypeScript types to replace `any` usage
7. Review and implement or remove dead code marked as "planned features"
8. Address remaining TODO items for incomplete features

### Low Priority
9. Replace `console.log` with proper logging utility
10. Clean up unused struct fields to eliminate build warnings

---

## Statistics Summary

| Metric | Count |
|--------|-------|
| Critical security issues | 7 |
| `.unwrap()` in production | 894 |
| `.expect()` in production | 50 |
| TODOs in production code | ~40 |
| `any` types in production | ~178 |
| Dead code annotations | 59 |
| console.log in production | 7 |

**Estimated effort to fix all issues:** 3-5 developer days
