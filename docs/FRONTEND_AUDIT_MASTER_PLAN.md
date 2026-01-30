# Frontend Audit Master Plan

**Generated:** 2026-01-30
**Purpose:** Detailed execution plan for fixing all frontend issues
**Execution Model:** Sub-agents with master oversight

---

## Executive Summary

A comprehensive audit of the EasySale POS frontend revealed **67 distinct issues** across 10 functional areas. The issues range from **critical** (non-functional payment buttons in POS) to **minor** (inconsistent toast vs alert usage).

### Issue Severity Distribution
| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 Critical | 5 | Core functionality broken/missing |
| 🟠 High | 12 | Major features incomplete |
| 🟡 Medium | 23 | Partial implementations, API mismatches |
| 🟢 Low | 27 | UX inconsistencies, minor gaps |

### Functional Area Health
| Area | Status | Critical Issues |
|------|--------|----------------|
| Navigation & Routing | 🟡 Partial | Orphan pages, duplicate routes |
| Sales/POS | 🔴 Critical | Payment buttons non-functional |
| Inventory | 🟢 Good | Minor filter issues |
| Settings | 🟡 Partial | Several placeholder sections |
| Customers/CRM | 🟢 Good | Minor tier mapping issues |
| Reports | 🟡 Partial | Only sales reports implemented |
| Integrations | 🟢 Good | Minor endpoint missing |
| User Management | 🟢 Good | Password reset not implemented |
| API Client | 🟡 Partial | Inconsistent patterns |
| Forms/Modals | 🟢 Good | Alert vs toast inconsistency |

---

## Phase 1: Critical Fixes (Must Complete First)

### 1.1 POS Payment System - CRITICAL 🔴

**Problem:** The Cash, Card, and Other payment buttons in SellPage.tsx have NO onClick handlers. No transaction is created, no API is called, cart is purely local state.

**Impact:** Cannot complete any sales transactions - core POS functionality is missing.

**Files to Modify:**
- `frontend/src/sell/pages/SellPage.tsx`
- `frontend/src/sell/hooks/useCart.ts` (create if not exists)
- `frontend/src/sell/api/transactions.ts` (create)

**Backend Files to Verify/Create:**
- `backend/crates/server/src/handlers/transactions.rs` (create if not exists)
- `backend/crates/server/src/models/transaction.rs` (create if not exists)

### 1.2 Loyalty API Path Mismatch - CRITICAL 🔴

**Problem:** Frontend calls `/api/loyalty/*` but backend implements `/api/customers/:id/loyalty` and `/api/price-levels`.

**Impact:** Entire Loyalty tab in Sales Management is non-functional.

**Files to Modify:**
- `frontend/src/sales/api/index.ts`
- `frontend/src/sales/components/LoyaltyTab.tsx`

### 1.3 Missing /profile Route - HIGH 🟠

**Problem:** ProfileMenu links to `/profile` but no route exists.

**Files to Modify:**
- `frontend/src/App.tsx`

### 1.4 Duplicate /admin/branding Route - HIGH 🟠

**Problem:** Route defined twice - once for LocalizationPage, once for BrandingSettingsPage.

**Files to Modify:**
- `frontend/src/App.tsx`

### 1.5 HTTP Method Mismatches - HIGH 🟠

**Problem:** Frontend uses POST for some endpoints where backend expects PUT.

**Files to Modify:**
- `frontend/src/sales/api/index.ts`

---

## Phase 2: High Priority Fixes

### 2.1 Wire UsersRolesPage to /admin/users
### 2.2 Implement Password Reset Flow
### 2.3 Fix Backup API Prefix
### 2.4 Implement Missing Report Types
### 2.5 Implement Tax Rules CRUD
### 2.6 Implement Hardware Configuration Persistence

---

## Phase 3: Medium Priority Fixes

### 3.1 Navigation Improvements
### 3.2 Wire Orphan Pages
### 3.3 Fix Advanced Filters in LookupPage
### 3.4 Implement Inventory Tabs
### 3.5 Fix Commission Report Path
### 3.6 Add /api/integrations List Endpoint
### 3.7 Standardize API Client Usage

---

## Phase 4: Low Priority Fixes

### 4.1 Replace alert() with toast()
### 4.2 Fix Customer Tier Mapping
### 4.3 Consolidate Navigation Configs
### 4.4 Add PDF/Excel Export
### 4.5 Implement Period Comparison in Reports
### 4.6 Add Token Refresh Mechanism

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Critical Issues | 5 | 0 |
| High Issues | 12 | 0 |
| Medium Issues | 23 | <5 |
| Low Issues | 27 | <10 |
| POS Functional | No | Yes |
| All Routes Accessible | No | Yes |
| API Consistency | 70% | 100% |
| UX Consistency | 80% | 95% |

---

## Appendix: Full Issue List

### Navigation & Routing (10 issues)
1. 🟠 Duplicate `/admin/branding` route
2. 🟠 Missing `/profile` route
3. 🟡 `/admin/users` uses wrong component
4. 🟢 Orphan: NotificationSettingsPage
5. 🟢 Orphan: DataManagerPage
6. 🟢 Orphan: LocalizationPageConnected
7. 🟢 Orphan: MyPreferencesPage
8. 🟢 Orphan: BackupsPage
9. 🟢 Orphan: UsersRolesPage
10. 🟢 Navigation config duplication

### Sales/POS (10 issues)
1. 🔴 Payment buttons non-functional
2. 🔴 No transaction recording endpoint
3. 🔴 Loyalty API path mismatch
4. 🟠 HTTP method mismatches (layaway, work orders)
5. 🟠 Commission report path mismatch
6. 🟠 Gift card parameter name mismatch
7. 🟡 Discount button placeholder
8. 🟡 Coupon button placeholder
9. 🟡 Add Commission Rule placeholder
10. 🟡 View Statement placeholder

### Inventory (5 issues)
1. 🟡 Advanced filters not wired
2. 🟡 Simulated barcode scanner
3. 🟡 Receiving tab placeholder
4. 🟡 Transfers tab placeholder
5. 🟡 Parts mapping client-side only

### Settings (11 issues)
1. 🟠 Hardware config hardcoded
2. 🟠 Tax rules not persisted
3. 🟠 Company API endpoint missing
4. 🟡 Payment section placeholder
5. 🟡 Security section placeholder
6. 🟡 Notifications section placeholder
7. 🟡 Store locations no CRUD
8. 🟡 Data export stub
9. 🟡 Performance metrics endpoints unverified
10. 🟡 Store info save not wired
11. 🟡 General settings not persisted

### Customers/CRM (5 issues)
1. 🟡 Tier mapping mismatch (Contractor)
2. 🟡 Customer type not persisted
3. 🟡 Order statistics placeholder
4. 🟡 Loyalty API path inconsistency
5. 🟢 Recent orders mock data

### Reports (8 issues)
1. 🟠 Only sales reports implemented
2. 🟠 Top products placeholder
3. 🟠 Sales trend chart placeholder
4. 🟠 Data management export mock
5. 🟡 No PDF export
6. 🟡 No Excel export
7. 🟡 Export jobs history empty
8. 🟡 Change percentage always zero

### Integrations (1 issue)
1. 🟡 Missing `/api/integrations` list endpoint

### User Management (3 issues)
1. 🟠 Forgot password not implemented
2. 🟡 Bulk reset password endpoint missing
3. 🟡 Roles API not implemented (hardcoded works)

### API Client (8 issues)
1. 🟠 Backup API missing `/api` prefix
2. 🟠 Product API missing auth header
3. 🟡 Inconsistent client patterns
4. 🟡 Stub endpoints called unconditionally
5. 🟡 Feature-gated endpoints called unconditionally
6. 🟡 No token refresh mechanism
7. 🟡 Dry-run endpoint dev-only
8. 🟢 SQL injection risk in backend (not frontend)

### Forms/Modals (6 issues)
1. 🟢 FormTemplatesPage uses alert()
2. 🟢 CompanyInfoEditor uses alert()
3. 🟢 OfflineModeConfiguration uses alert()
4. 🟢 SyncConfiguration uses alert()
5. 🟢 Vendor bill components use alert()
6. 🟢 Admin management forms no API
