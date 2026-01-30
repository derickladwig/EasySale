# Actionable Code Quality Fixes

**Date:** January 30, 2026  
**Status:** Ready for Implementation

This document provides exact file locations and fixes for remaining code quality issues.

---

## 1. Critical `.unwrap()` Calls to Fix (20 items)

### Priority 1: Request Handlers (Can crash on user input)

| # | File | Line | Current Code | Fix |
|---|------|------|--------------|-----|
| 1 | `handlers/auth.rs` | 77 | `RATE_LIMITER.lock().unwrap()` | Use `lock().map_err(\|_\| ApiError::internal("Rate limiter lock failed"))?` |
| 2 | `handlers/promotion.rs` | 35 | `serde_json::to_string(v).unwrap()` | Use `serde_json::to_string(v).unwrap_or_default()` |
| 3 | `handlers/promotion.rs` | 39 | `serde_json::to_string(v).unwrap()` | Use `serde_json::to_string(v).unwrap_or_default()` |
| 4 | `handlers/promotion.rs` | 43 | `serde_json::to_string(v).unwrap()` | Use `serde_json::to_string(v).unwrap_or_default()` |
| 5 | `handlers/promotion.rs` | 363 | `b_discount.partial_cmp(&a_discount).unwrap()` | Use `.unwrap_or(std::cmp::Ordering::Equal)` |
| 6 | `handlers/promotion.rs` | 511 | `serde_json::to_string(&vec![category_id]).unwrap()` | Use `.unwrap_or_default()` |
| 7 | `handlers/commission.rs` | 60 | `serde_json::to_string(v).unwrap()` | Use `.unwrap_or_default()` |
| 8 | `handlers/commission.rs` | 64 | `serde_json::to_string(v).unwrap()` | Use `.unwrap_or_default()` |
| 9 | `handlers/theme.rs` | 243 | `value.as_str().unwrap()` | Use `.as_str().unwrap_or("")` or validate first |
| 10 | `handlers/theme.rs` | 387 | `prop_name.chars().next().unwrap()` | Use `.chars().next().unwrap_or('_')` |
| 11 | `handlers/product_advanced.rs` | 114 | `product_exists.unwrap()` | Already checked, use `?` operator instead |
| 12 | `handlers/product_advanced.rs` | 120 | `related_exists.unwrap()` | Already checked, use `?` operator instead |

### Priority 2: Database/I/O Operations

| # | File | Line | Current Code | Fix |
|---|------|------|--------------|-----|
| 13 | `services/backup_service.rs` | 192 | `job.backup_chain_id.as_ref().unwrap()` | Use `.as_ref().ok_or(BackupError::MissingChainId)?` |
| 14 | `services/backup_service.rs` | 259 | `job.backup_chain_id.as_ref().unwrap()` | Use `.as_ref().ok_or(BackupError::MissingChainId)?` |
| 15 | `services/sync_notifier.rs` | 642 | `payload["attachments"][0]["fields"].as_array_mut().unwrap()` | Use safe JSON navigation with `get_mut()` |

### Priority 3: Connector Serialization

| # | File | Line | Current Code | Fix |
|---|------|------|--------------|-----|
| 16 | `connectors/clover/client.rs` | 200 | `serde_json::to_string(&summary).unwrap()` | Use `.map_err(\|e\| ConnectorError::Serialization(e))?` |
| 17 | `connectors/square/client.rs` | 213 | `serde_json::to_string(&creds).unwrap()` | Use `.map_err(\|e\| ConnectorError::Serialization(e))?` |
| 18 | `connectors/stripe/client.rs` | 231 | `serde_json::to_string(&summary).unwrap()` | Use `.map_err(\|e\| ConnectorError::Serialization(e))?` |
| 19 | `connectors/stripe/checkout.rs` | 193 | `serde_json::to_string(&request).unwrap()` | Use `.map_err(\|e\| CheckoutError::Serialization(e))?` |
| 20 | `connectors/stripe/checkout.rs` | 207 | `serde_json::to_string(&response).unwrap()` | Use `.map_err(\|e\| CheckoutError::Serialization(e))?` |

---

## 2. TODO/FIXME Items to Implement (18 items)

### Missing Implementations (Critical)

| # | File | Line | TODO | Implementation |
|---|------|------|------|----------------|
| 1 | `services/inventory_integration_service.rs` | 254 | `// TODO: Implement rollback logic` | Add rollback function that reverses partial changes on error |
| 2 | `handlers/cleanup.rs` | 721 | `// TODO: Implement actual overlay rendering` | Implement image overlay generation using `image` crate |
| 3 | `handlers/google_drive_oauth.rs` | 308 | `// TODO: Decrypt tokens and revoke with Google` | Call Google's revoke endpoint before deleting DB record |

### Configuration Improvements (High)

| # | File | Line | TODO | Implementation |
|---|------|------|------|----------------|
| 4 | `handlers/integrations.rs` | 285 | `// TODO: Get redirect_uri from config` | Read from `config.oauth.redirect_base_url` |
| 5 | `services/backup_service.rs` | 1353 | `// TODO: Add retention_count field` | Add migration for `backup_destinations.retention_count` column |
| 6 | `handlers/cleanup.rs` | 487 | `// TODO: Get critical zones from config` | Load from tenant config `cleanup.critical_zones` |
| 7 | `handlers/backup.rs` | 584, 587 | `// TODO: Get from settings` | Read backup paths from `config.backup.local_path` |

### Missing Data Enrichment (Medium)

| # | File | Line | TODO | Implementation |
|---|------|------|------|----------------|
| 8 | `handlers/product_advanced.rs` | 270 | `// TODO: Fetch from users table` | Join with `users` table to get `changed_by_username` |
| 9 | `handlers/product_advanced.rs` | 316 | `// TODO: Fetch from users table` | Join with `users` table to get `created_by_username` |
| 10 | `handlers/product_advanced.rs` | 319 | `// TODO: Fetch from stores table` | Join with `stores` table to get `store_name` |
| 11 | `handlers/product_advanced.rs` | 397 | `// TODO: Get actual user ID from auth context` | Use `ctx.user_id()` from request extensions |
| 12 | `handlers/conflicts.rs` | 238-239 | `// TODO: Get from context` | Use `ctx.store_id()` and sync metadata |

### Missing Features (Low)

| # | File | Line | TODO | Implementation |
|---|------|------|------|----------------|
| 13 | `connectors/quickbooks/item.rs` | 174 | `// TODO: Add account validation` | Call QBO API to verify account exists before creating item |
| 14 | `services/scheduler_service.rs` | 362 | `// TODO: Send alert to administrators` | Call `AlertService::send_admin_alert()` |
| 15 | `middleware/permissions.rs` | 88 | `// TODO: Add to audit log service` | Call `AuditLogger::log_permission_denied()` |
| 16 | `handlers/layaway.rs` | 412 | `// TODO: Get from tenant context` | Fix malformed code and use `ctx.tenant_id()` |
| 17 | `services/review_session_service.rs` | 163-164 | `// TODO: Track approved/rejected count` | Update counters when cases are approved/rejected |

---

## 3. TypeScript `any` Types to Fix (Top 30)

### Priority 1: API Response Types

| # | File | Line | Current | Proper Type |
|---|------|------|---------|-------------|
| 1 | `settings/pages/DataManagementPage.tsx` | 32 | `(response as any).data` | `response.data as BackupHistoryItem[]` |
| 2 | `settings/pages/DataManagementPage.tsx` | 61 | `(response as any).data.record_count` | Define `{ data: { record_count: number } }` |
| 3 | `settings/pages/DataManagementPage.tsx` | 84 | `(response as any).data.deleted_count` | Define `{ data: { deleted_count: number } }` |
| 4 | `settings/pages/DataManagementPage.tsx` | 101 | `(response as any).data.deleted_count` | Define `{ data: { deleted_count: number } }` |

### Priority 2: Component Props

| # | File | Line | Current | Proper Type |
|---|------|------|---------|-------------|
| 5 | `admin/pages/BackupsPage.tsx` | 1497 | `backup: any` | `backup: BackupJob` |
| 6 | `admin/components/UsersTab.tsx` | 317 | `data: any` | `data: UpdateUserData` |
| 7 | `routes/lazyRoutes.tsx` | 33 | `props: any` | `props: Record<string, unknown>` |
| 8 | `admin/components/EntityEditorModal.tsx` | 60 | `initialData: any = {}` | `initialData: Partial<T> = {}` |
| 9 | `admin/components/EntityEditorModal.tsx` | 79 | `value: any` | `value: T[keyof T]` |
| 10 | `admin/components/SyncConfiguration.tsx` | 98 | `value: any` | `value: RemoteStore[keyof RemoteStore]` |

### Priority 3: Table Components (DynamicTable.tsx)

| # | File | Line | Current | Proper Type |
|---|------|------|---------|-------------|
| 11 | `common/components/DynamicTable.tsx` | 121 | `(row as any)[column.key]` | `row[column.key as keyof T]` |
| 12 | `common/components/DynamicTable.tsx` | 148 | `(a as any)[column.key]` | `a[column.key as keyof T]` |
| 13 | `common/components/DynamicTable.tsx` | 149 | `(b as any)[column.key]` | `b[column.key as keyof T]` |
| 14 | `common/components/DynamicTable.tsx` | 216 | `(row as any)[schema.keyField]` | `row[schema.keyField as keyof T]` |
| 15 | `common/components/DynamicTable.tsx` | 226 | `(row as any)[schema.keyField]` | `row[schema.keyField as keyof T]` |
| 16 | `common/components/DynamicTable.tsx` | 237 | `(r as any)[schema.keyField]` | `r[schema.keyField as keyof T]` |
| 17 | `common/components/DynamicTable.tsx` | 270 | `(row as any)[column.key]` | `row[column.key as keyof T]` |
| 18 | `common/components/DynamicTable.tsx` | 381 | `(row as any)[schema.keyField]` | `row[schema.keyField as keyof T]` |
| 19 | `common/components/DynamicTable.tsx` | 433 | `(row as any)[schema.keyField]` | `row[schema.keyField as keyof T]` |

### Priority 4: Settings Components

| # | File | Line | Current | Proper Type |
|---|------|------|---------|-------------|
| 20 | `admin/components/EffectiveSettingsView.tsx` | 7 | `value: any` | `value: SettingValue` (define union type) |
| 21 | `admin/components/EffectiveSettingsView.tsx` | 15 | `effective_value: any` | `effective_value: SettingValue` |
| 22 | `admin/components/EffectiveSettingsView.tsx` | 102 | `formatValue(value: any)` | `formatValue(value: SettingValue): string` |
| 23 | `admin/components/SettingsTable.tsx` | 96 | `(a as any)[sortColumn]` | `a[sortColumn as keyof T]` |
| 24 | `admin/components/SettingsTable.tsx` | 97 | `(b as any)[sortColumn]` | `b[sortColumn as keyof T]` |
| 25 | `admin/components/SettingsTable.tsx` | 229 | `(row as any)[column.key]` | `row[column.key as keyof T]` |

### Priority 5: UI Component Variants

| # | File | Line | Current | Proper Type |
|---|------|------|---------|-------------|
| 26 | `common/components/atoms/Badge.tsx` | 107 | `variant: variant as any` | Fix `badgeVariants` type definition |
| 27 | `common/components/atoms/Input.tsx` | 184 | `variant: effectiveVariant as any` | Fix `inputVariants` type definition |
| 28 | `common/components/atoms/Button.tsx` | 128 | `variant: variant as any` | Fix `buttonVariants` type definition |
| 29 | `config/configMerge.ts` | 152 | `result[key] = sourceValue as any` | Use `result[key as keyof T] = sourceValue as T[keyof T]` |
| 30 | `common/utils/devLog.ts` | 9,15,21,27 | `...args: any[]` | `...args: unknown[]` |

---

## Recommended Type Definitions to Add

Create `frontend/src/types/api.ts`:

```typescript
// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface DeleteResponse {
  deleted_count: number;
}

export interface RecordCountResponse {
  record_count: number;
}

// Setting Value Union Type
export type SettingValue = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined 
  | Record<string, unknown>
  | unknown[];
```

Create `frontend/src/types/hardware.ts`:

```typescript
export interface ReceiptPrinter {
  name: string;
  type: string;
  connection: string;
  port?: string;
  width?: string;
}

export interface LabelPrinter {
  name: string;
  type: string;
  ip_address?: string;
  port?: number;
}

export interface Scanner {
  name: string;
  type: string;
  prefix?: string;
  suffix?: string;
}

export interface CashDrawer {
  name: string;
  type: string;
  connection?: string;
  open_code?: string;
}

export interface PaymentTerminal {
  name: string;
  type: string;
  connection_settings?: string;
}
```

---

## Quick Wins (< 30 minutes each)

### Backend
1. Fix all `serde_json::to_string().unwrap()` → `.unwrap_or_default()` (10 instances)
2. Fix `partial_cmp().unwrap()` → `.unwrap_or(Ordering::Equal)` (1 instance)
3. Fix empty string/char unwraps with defaults (2 instances)

### Frontend
1. Replace `...args: any[]` with `...args: unknown[]` in devLog.ts (4 instances)
2. Create `SettingValue` type alias and use it (3 instances)
3. Fix DynamicTable generic typing (9 instances - same pattern)

---

## Implementation Order

1. **Week 1**: Fix critical `.unwrap()` in request handlers (12 items)
2. **Week 2**: Implement missing rollback logic and token revocation (3 items)
3. **Week 3**: Add configuration-based settings (5 items)
4. **Week 4**: Fix TypeScript `any` types in table components (9 items)
5. **Ongoing**: Address remaining items as part of regular development

---

## Verification

After fixes, run:

```bash
# Backend
cargo clippy --all-features -- -D warnings
cargo test

# Frontend
npm run type-check
npm run lint:strict
npm test
```
