# Comprehensive Fixes Needed - Mock Data & Settings Issues

## Issues Identified from Screenshots

### 1. ✅ FIXED: Hardcoded "CAPS" References
**Status**: Partially fixed, more work needed

**Fixed**:
- TopBar: Removed hardcoded "CAPS POS" default
- Sidebar: Removed hardcoded "CAPS Development Store" default  
- AdminPage: Changed "CAPS Development Store" to use config, changed email from "store@caps-pos.local" to "store@example.com"

**Still Need to Fix**:
- CompanyStoresPage: Has "CAPS Automotive" and "info@caps-pos.local"
- PerformancePage: Has "https://monitoring.caps-pos.local"
- ReportingPage: Mock data shows "Caps" category
- LookupPage: Has "CAPS Original", "Premium Caps", etc. in brand filters
- Test files: Multiple test files have "caps-pos.local" emails
- Sample data generators: Have "Caps" as a category

### 2. ❌ NOT FIXED: Mock Data in Inventory/Warehouse
**Issue**: The inventory page shows mock data (Engine Air Filter, Front Brake Pack, etc.)

**Root Cause**: Backend API is returning mock/seed data, NOT the frontend

**Evidence**:
- Frontend correctly uses `useInventoryQuery` hook
- Hook fetches from `/api/inventory/items` API endpoint
- Frontend shows loading states, error states, empty states correctly
- The data you see is what the backend is returning

**Solution Required**: Fix the backend Rust API
- Check `backend/rust/src/routes/inventory.rs` or similar
- Remove mock data from backend
- Ensure backend returns empty array `[]` when no inventory exists
- Or populate real inventory data in the database

### 3. ❌ NOT FIXED: Mock Data in Reports
**Issue**: Reports page shows mock sales data ($24,847.50, categories like "Caps", etc.)

**Root Cause**: ReportingPage has hardcoded mock data

**Files to Fix**:
- `frontend/src/features/reporting/pages/ReportingPage.tsx`
  - Lines 56-59: `salesByCategory` array with hardcoded data
  - Need to create API endpoint for reports
  - Need to fetch real data from backend

### 4. ❌ NOT FIXED: Theme Settings Don't Work
**Issue**: Light/Dark theme toggle doesn't actually change the theme

**Root Cause**: Theme settings are not connected to actual theme system

**What's Needed**:
1. Create a theme context/provider that manages theme state
2. Connect theme toggle in settings to the theme provider
3. Apply theme classes to root element
4. Persist theme preference to localStorage or backend
5. Update Tailwind config to support light mode classes

**Files Involved**:
- Need to create: `frontend/src/common/contexts/ThemeContext.tsx`
- Update: Settings pages that have theme toggles
- Update: `frontend/tailwind.config.js` to enable dark mode variants
- Update: Root App component to apply theme class

### 5. ❌ NOT FIXED: Settings Buttons Don't Work
**Issue**: Many settings buttons are non-functional (just show toast messages)

**Examples from Screenshots**:
- Company & Stores settings: Save buttons don't persist
- Theme settings: Toggles don't apply changes
- Sidebar width settings: Don't actually change sidebar
- Primary/Secondary/Tertiary color pickers: Don't apply colors

**What's Needed**:
1. Create backend API endpoints for settings:
   - `POST /api/settings/company` - Save company info
   - `POST /api/settings/theme` - Save theme preferences
   - `POST /api/settings/display` - Save display preferences
   - `GET /api/settings` - Load all settings
   
2. Connect frontend forms to API:
   - Add form state management
   - Add submit handlers that call API
   - Add success/error handling
   - Reload config after successful save

3. Make settings actually apply:
   - Theme changes should update ThemeContext
   - Sidebar width should update layout state
   - Colors should update CSS variables or Tailwind config

### 6. ❌ NOT FIXED: Store Name Override
**Issue**: Store name shows "Main Store" or config default instead of user's actual store name

**Root Cause**: Backend `/api/config` endpoint returns default config

**Solution**:
1. Backend needs to return tenant-specific config
2. Config should be loaded from database, not hardcoded
3. Settings changes should update the config in database
4. Frontend already correctly uses config - just needs backend to return right data

## Priority Fix Order

### Priority 1: Critical UX Issues
1. **Fix Backend Mock Data** (Inventory, Reports)
   - Users see fake data instead of their real data
   - Most visible issue

2. **Make Settings Functional**
   - Users can't customize their system
   - Creates impression that software is incomplete

### Priority 2: Branding Issues  
3. **Remove All "CAPS" References**
   - Makes it look like a demo/incomplete product
   - Affects white-label perception

4. **Fix Store Name Override**
   - Users want to see their business name
   - Part of branding/customization

### Priority 3: Polish
5. **Implement Theme Switching**
   - Nice-to-have feature
   - Some users prefer light mode

## Quick Wins (Can Fix Now)

### Remove Hardcoded "CAPS" References
```bash
# Search and replace in these files:
- frontend/src/features/settings/pages/CompanyStoresPage.tsx
- frontend/src/features/settings/pages/PerformancePage.tsx
- frontend/src/features/reporting/pages/ReportingPage.tsx
- frontend/src/features/lookup/pages/LookupPage.tsx
```

### Fix Reports Mock Data
```typescript
// In ReportingPage.tsx, replace hardcoded data with:
const { data: salesData, isLoading } = useSalesQuery();
const { data: categoryData } = useCategoryReportsQuery();

// Then create these hooks to fetch from backend
```

## Backend Work Required

### 1. Inventory API
```rust
// backend/rust/src/routes/inventory.rs
// Remove mock data, return from database:
pub async fn get_inventory_items(
    pool: web::Data<DbPool>,
    tenant_id: web::ReqData<String>,
) -> Result<HttpResponse> {
    let items = sqlx::query_as!(
        InventoryItem,
        "SELECT * FROM inventory_items WHERE tenant_id = $1",
        tenant_id.as_str()
    )
    .fetch_all(pool.get_ref())
    .await?;
    
    Ok(HttpResponse::Ok().json(items))
}
```

### 2. Settings API
```rust
// backend/rust/src/routes/settings.rs
// Create endpoints:
POST /api/settings/company
POST /api/settings/theme  
POST /api/settings/display
GET /api/settings
```

### 3. Config API
```rust
// backend/rust/src/routes/config.rs
// Return tenant-specific config from database
GET /api/config -> returns tenant's config, not default
```

### 4. Reports API
```rust
// backend/rust/src/routes/reports.rs
// Create endpoints:
GET /api/reports/sales
GET /api/reports/categories
GET /api/reports/products
```

## Testing Checklist

After fixes:
- [ ] Inventory page shows empty state when no data (not mock data)
- [ ] Reports page shows empty state when no data (not mock data)
- [ ] No "CAPS" references visible anywhere in UI
- [ ] Store name shows user's actual business name
- [ ] Theme toggle actually changes light/dark mode
- [ ] Company settings save and persist
- [ ] Theme settings save and persist
- [ ] Display settings (sidebar width) actually apply
- [ ] Color pickers actually change colors

## Files Modified So Far

1. ✅ `backend/rust/src/main.rs` - Added CORS for network IP
2. ✅ `frontend/src/features/settings/pages/IntegrationsPage.tsx` - Fixed React hooks
3. ✅ `frontend/src/features/warehouse/pages/WarehousePage.tsx` - Renamed to "Inventory Management"
4. ✅ `frontend/src/features/home/pages/HomePage.tsx` - Changed "Warehouse" to "Inventory"
5. ✅ `frontend/src/common/components/organisms/TopBar.tsx` - Removed hardcoded "CAPS POS"
6. ✅ `frontend/src/common/components/organisms/Sidebar.tsx` - Removed hardcoded "CAPS Development Store"
7. ✅ `frontend/src/features/admin/pages/AdminPage.tsx` - Fixed hardcoded values, added useConfig

## Next Steps

1. **Immediate**: Remove remaining "CAPS" references (search and replace)
2. **Short-term**: Create backend API endpoints for settings
3. **Short-term**: Connect frontend settings forms to backend APIs
4. **Medium-term**: Implement theme switching system
5. **Medium-term**: Fix backend mock data in inventory and reports
6. **Long-term**: Make all settings fully functional and persistent
