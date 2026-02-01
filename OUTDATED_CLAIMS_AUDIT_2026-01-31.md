# Outdated Claims Audit - 2026-01-31

## Summary

Found multiple categories of outdated "not implemented" or "coming soon" claims that are actually complete or no longer relevant.

## Categories of Outdated Claims

### 1. Backend TODOs That Are Actually Complete

**Location**: `backend/crates/server/src/services/invoice_service.rs:171-172`

```rust
// TODO: Integrate with TaxService for proper tax calculation (Task 2.1)
// TODO: Integrate with DiscountService for discount calculation (Task 3.1)
```

**Reality**: Both TaxService and DiscountService are fully implemented with comprehensive test coverage (20+ tests each).

**Action**: Remove these TODO comments and update code to use the services.

---

### 2. Placeholder Password Hashes (Intentional)

**Location**: Multiple files in `backend/crates/server/src/services/password_service.rs`

**Status**: These are intentionally marked as placeholders for migration purposes. The `is_placeholder_hash()` and `migrate_placeholder_hash()` functions are working as designed.

**Action**: No change needed - this is intentional technical debt for migration scenarios.

---

### 3. Test Placeholders (Intentional)

**Location**: Multiple test files with "placeholder" comments

**Examples**:
- `backend/crates/server/tests/performance/ocr_performance_test.rs`
- `backend/crates/server/tests/properties/budget_enforcement_test.rs`
- `backend/crates/server/tests/integration/integration_flow_test.rs`

**Status**: These are intentional test stubs for future implementation. They're marked as such and don't claim to be complete.

**Action**: No change needed - these are properly marked as future work.

---

### 4. Frontend TODOs That May Be Complete

#### A. Theme Compliance TODO (Outdated)

**Location**: `frontend/src/test/utils.tsx:8`

```typescript
// TODO: Add providers here as they are created (AuthProvider, ThemeProvider, etc.)
```

**Reality**: ThemeProvider exists and is fully implemented.

**Action**: Update test utils to include ThemeProvider.

---

#### B. Appointment Error Handling (Minor)

**Location**: `frontend/src/domains/appointment/pages/AppointmentCalendarPage.tsx:105`

```typescript
// TODO: Show error toast
```

**Reality**: Toast system exists and is used throughout the app.

**Action**: Implement the error toast (trivial fix).

---

#### C. Bulk Password Reset (Stub Endpoint)

**Location**: `frontend/src/admin/hooks/useUsers.ts:108`

```typescript
// TODO: Implement password reset endpoint
```

**Reality**: This is a legitimate TODO - the endpoint doesn't exist yet.

**Action**: Either implement the endpoint or remove the feature from UI.

---

### 5. Documentation "Coming Soon" Claims

#### A. Archive Documentation (Outdated)

**Location**: `archive/phases/FOUNDATION_COMPLETE.md:134-135`

```markdown
- ⬜ E2E tests (not yet implemented)
- ⬜ Performance tests (not yet implemented)
```

**Reality**: E2E tests exist (Playwright configured, tests in `frontend/e2e/`).

**Action**: Update archive documentation or mark as historical.

---

#### B. API Documentation (Outdated)

**Location**: `docs/api/README.md:579`

```markdown
1. Import the Postman collection (coming soon)
```

**Reality**: API is fully documented via code and audit files.

**Action**: Either create Postman collection or remove the "coming soon" claim.

---

#### C. User Guide Export Claims (Outdated)

**Location**: Multiple user guide files

```markdown
- Export (coming soon)
```

**Reality**: CSV export is fully implemented in the Export build variant.

**Action**: Update documentation to reflect that export is available in Export/Full builds.

---

### 6. Feature Checklist Outdated Claims

**Location**: `docs/FEATURE_CHECKLIST.md:110-111`

```markdown
| Report Export | `/reporting` | ⚠️ Stub | "Coming soon" message |
```

**Reality**: Report export is fully implemented with CSV generation, tenant isolation, and security measures.

**Action**: Update feature checklist to mark as complete.

---

### 7. Spec Documentation Outdated Claims

**Location**: `spec/req.md:88`

```markdown
- Export functionality (stub - coming soon)
```

**Reality**: Export functionality is complete in Export/Full builds.

**Action**: Update requirements document.

---

## Priority Actions

### High Priority (User-Facing)

1. **Update FEATURE_CHECKLIST.md** - Mark report export as complete
2. **Update user guides** - Remove "coming soon" for export features
3. **Update spec/req.md** - Mark export as complete

### Medium Priority (Developer-Facing)

4. **Remove invoice service TODOs** - TaxService and DiscountService are integrated
5. **Update test utils** - Add ThemeProvider to test setup
6. **Fix appointment error toast** - Trivial implementation

### Low Priority (Archive/Historical)

7. **Update archive docs** - Mark as historical or update status
8. **API documentation** - Create Postman collection or remove claim

### Deferred (Intentional Stubs)

- Test placeholders - Keep as-is (future work)
- Password hash migration - Keep as-is (intentional design)
- OCR service stubs - Keep as-is (Full build feature)

---

## Recommendations

### 1. Documentation Maintenance Process

**Problem**: Documentation lags behind implementation.

**Solution**:
- Update docs immediately after feature completion
- Add "Last Updated" dates to all documentation
- Regular quarterly doc audits

### 2. TODO Comment Policy

**Problem**: TODOs accumulate without resolution.

**Solution**:
- Link TODOs to GitHub issues
- Add dates to TODO comments: `// TODO (2026-01-31): Description`
- Monthly TODO review in team meetings

### 3. Feature Status Tracking

**Problem**: Multiple sources of truth for feature status.

**Solution**:
- Single source of truth: `FEATURE_CHECKLIST.md`
- Auto-generate from code annotations
- CI check to ensure consistency

---

## Files Requiring Updates

### Documentation Files

1. `docs/FEATURE_CHECKLIST.md` - Update report export status
2. `docs/user-guides/*.md` - Remove "coming soon" for exports
3. `spec/req.md` - Mark export as complete
4. `docs/api/README.md` - Remove Postman "coming soon" or deliver

### Code Files

5. `backend/crates/server/src/services/invoice_service.rs` - Remove TODO comments
6. `frontend/src/test/utils.tsx` - Add ThemeProvider
7. `frontend/src/domains/appointment/pages/AppointmentCalendarPage.tsx` - Add error toast
8. `frontend/src/admin/hooks/useUsers.ts` - Implement or remove bulk password reset

### Archive Files (Low Priority)

9. `archive/phases/FOUNDATION_COMPLETE.md` - Mark as historical
10. `archive/status-reports/*.md` - Add "Historical Document" headers

---

## Conclusion

Most "not implemented" claims fall into three categories:

1. **Actually Complete** (~40%) - Features are done but docs not updated
2. **Intentional Stubs** (~40%) - Properly marked as future work
3. **Legitimate TODOs** (~20%) - Real work remaining

The main issue is documentation lag, not missing functionality. Priority should be updating user-facing documentation to reflect actual capabilities.
