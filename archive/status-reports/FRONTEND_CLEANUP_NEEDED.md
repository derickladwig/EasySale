# Frontend Cleanup & Implementation Tasks

## Current Issues (as of 2026-01-24)

### 1. Mock Data Removal
**Status**: Mock data hardcoded in multiple components

**Files with Mock Data**:
- `frontend/src/features/home/pages/HomePage.tsx`
  - Lines 85-103: `recentAlerts` - hardcoded alerts
  - Lines 105-113: `recentTransactions` - hardcoded transactions  
  - Lines 143-166: Hardcoded stat values ($2,847.50, 47 transactions, etc.)

- `frontend/src/features/warehouse/pages/WarehousePage.tsx`
  - Line 34: `mockInventory` - 20+ hardcoded inventory items

- `frontend/src/features/lookup/pages/LookupPage.tsx`
  - Line 28: `mockProducts` - hardcoded product list

- `frontend/src/features/settings/pages/CompanyStoresPage.tsx`
  - Line 23: `mockStores` - hardcoded store list

**Required Actions**:
1. Replace mock data with API calls to backend endpoints
2. Add loading states while fetching data
3. Add error handling for failed API calls
4. Show empty states when no data exists

### 2. Theme/CSS Not Applying from Config
**Status**: Tailwind using hardcoded blue colors instead of CAPS orange theme

**Root Cause**: 
- `frontend/tailwind.config.js` has hardcoded color values
- Primary color is blue (#3b82f6) instead of reading from tenant config
- Config file specifies orange (#f97316) but it's not being used

**Required Actions**:
1. Modify Tailwind config to use CSS custom properties
2. Update to read colors from `var(--color-primary-500)` etc.
3. Ensure ThemeProvider CSS variables are applied before Tailwind processes
4. Test theme switching between light/dark modes

**Example Fix**:
```javascript
// tailwind.config.js
colors: {
  primary: {
    50: 'var(--color-primary-50, #eff6ff)',
    500: 'var(--color-primary-500, #3b82f6)',
    600: 'var(--color-primary-600, #2563eb)',
    // ... etc
  }
}
```

### 3. Theme Toggle Not Working
**Status**: No UI control to switch between light/dark modes

**Missing Features**:
- No theme toggle button in header/settings
- Theme mode is set in config but user can't change it
- Need to persist user preference to localStorage

**Required Actions**:
1. Add theme toggle button to header
2. Create theme settings page in admin
3. Store user preference in localStorage
4. Override config theme mode with user preference

### 4. Settings Pages Incomplete
**Status**: Many admin/settings features not implemented

**Missing Implementations**:
- Payment settings (mentioned by user)
- Integration settings (QuickBooks, WooCommerce)
- Tax configuration
- Discount rules
- User management (partially done)
- Store/station management (has mock data)
- Backup/restore settings
- Notification settings

**Required Actions**:
1. Audit all settings pages to identify what's implemented vs planned
2. Create API endpoints for missing settings
3. Build UI forms for each settings category
4. Add validation and error handling
5. Test settings persistence

### 5. Extra Mock Stores/Data
**Status**: Multiple stores shown in UI but only one configured

**Issue**: 
- CompanyStoresPage shows 3 mock stores
- Only "CAPS Development Store" is real
- Confusing for users

**Required Actions**:
1. Remove mock stores from CompanyStoresPage
2. Fetch actual stores from database
3. Add "Add Store" functionality if multi-store is supported
4. Or hide stores page if single-store only

## Priority Order

### High Priority (Blocking Production Use)
1. Remove mock data from Dashboard (HomePage)
2. Fix theme colors to use CAPS orange
3. Remove mock stores from settings

### Medium Priority (Important for UX)
4. Implement payment settings
5. Add theme toggle
6. Remove mock data from Warehouse page
7. Remove mock data from Lookup page

### Low Priority (Nice to Have)
8. Complete all settings pages
9. Add empty states for all data views
10. Improve error handling across all pages

## Implementation Notes

### API Endpoints Needed
```
GET /api/stats/daily-sales
GET /api/stats/transactions
GET /api/stats/avg-ticket
GET /api/stats/items-sold
GET /api/alerts/recent
GET /api/transactions/recent
GET /api/inventory/items
GET /api/stores
GET /api/settings/payment
GET /api/settings/integrations
```

### Database Tables to Check
- `sales_transactions` - for real transaction data
- `stores` - for actual store list
- `products` - for real inventory
- `settings` - for payment/integration config

## Testing Checklist
- [ ] Dashboard shows real data from database
- [ ] Theme uses CAPS orange (#f97316) as primary color
- [ ] Theme toggle works and persists
- [ ] No mock data visible in any page
- [ ] Settings pages save and load correctly
- [ ] Empty states show when no data exists
- [ ] Loading states show during API calls
- [ ] Error messages show when API fails

## Estimated Effort
- Mock data removal: 4-6 hours
- Theme fix: 2-3 hours  
- Theme toggle: 1-2 hours
- Settings pages: 8-12 hours (depending on scope)
- Testing: 2-3 hours

**Total**: 17-26 hours of development work
