# Remove All Mock Data - Action Plan

## Files with Mock Data (Priority Order)

### 🔴 High Priority - User-Facing Pages

1. **Warehouse Page** - `frontend/src/features/warehouse/pages/WarehousePage.tsx`
   - Line 34: `mockInventory` (20+ items)
   - **Action**: Replace with API call to `/api/inventory/items`

2. **Sell Page** - `frontend/src/features/sell/pages/SellPage.tsx`
   - Line 37: `mockProducts` (50+ items)
   - **Action**: Replace with API call to `/api/products`

3. **Lookup Page** - `frontend/src/features/lookup/pages/LookupPage.tsx`
   - Line 28: `mockProducts` (50+ items)
   - **Action**: Replace with API call to `/api/products`

4. **Customers Page** - `frontend/src/features/customers/pages/CustomersPage.tsx`
   - Line 35: `mockCustomers` (10+ items)
   - **Action**: Replace with API call to `/api/customers`

5. **Admin Page** - `frontend/src/features/admin/pages/AdminPage.tsx`
   - Line 59: `mockUsers` (5+ items)
   - **Action**: Replace with API call to `/api/users`

### 🟡 Medium Priority - Settings Pages

6. **Tax Rules Page** - `frontend/src/features/settings/pages/TaxRulesPage.tsx`
   - Line 17: `mockTaxRules`
   - **Action**: Replace with API call to `/api/settings/tax-rules`

7. **Integrations Page** - `frontend/src/features/settings/pages/IntegrationsPage.tsx`
   - Line 19: `mockIntegrations`
   - **Action**: Replace with API call to `/api/integrations`

8. **Network Page** - `frontend/src/features/settings/pages/NetworkPage.tsx`
   - Line 17: `mockRemoteStores`
   - **Action**: Replace with API call to `/api/stores/remote`

9. **Performance Page** - `frontend/src/features/settings/pages/PerformancePage.tsx`
   - Line 21: `mockMetrics`
   - Line 30: `mockErrors`
   - **Action**: Replace with API calls to `/api/performance/metrics` and `/api/performance/errors`

### 🟢 Low Priority - Test Files (Keep These)

These are test files and should keep mock data:
- `frontend/src/features/auth/components/DemoAccountsAccordion.test.tsx`
- `frontend/src/common/components/organisms/BottomNav.test.tsx`
- `frontend/src/common/components/organisms/Breadcrumbs.test.tsx`
- `frontend/src/common/components/organisms/DataTable.test.tsx`
- `frontend/src/common/components/organisms/PageHeader.test.tsx`
- `frontend/src/common/components/organisms/Tabs.test.tsx`

## Quick Fix Strategy

Since you want this done quickly, here's the fastest approach:

### Option A: Empty Arrays (Immediate)
Replace all mock data with empty arrays:
```typescript
const mockInventory: InventoryItem[] = [];
```

**Pros**: 
- Takes 5 minutes
- Shows empty states immediately
- No backend work needed

**Cons**:
- Pages show "no data" everywhere
- Need to add real data later

### Option B: Real API Integration (Complete)
Replace with actual API calls:
```typescript
const [inventory, setInventory] = useState<InventoryItem[]>([]);

useEffect(() => {
  apiClient.get<InventoryItem[]>('/api/inventory/items')
    .then(setInventory)
    .catch(console.error);
}, []);
```

**Pros**:
- Shows real data
- Production-ready
- Proper solution

**Cons**:
- Requires backend endpoints
- Takes 2-3 hours total

## Recommended: Hybrid Approach

1. **Now** (5 min): Replace mock arrays with empty arrays
2. **Next** (30 min): Add loading states and empty state messages
3. **Later** (2 hours): Implement backend APIs one by one

## Implementation Commands

### Quick Empty Arrays Fix

Run these replacements in each file:

```typescript
// Warehouse Page
const mockInventory: InventoryItem[] = [];

// Sell Page  
const mockProducts: Product[] = [];

// Lookup Page
const mockProducts: Product[] = [];

// Customers Page
const mockCustomers: Customer[] = [];

// Admin Page
const mockUsers: User[] = [];

// Tax Rules Page
const mockTaxRules: TaxRule[] = [];

// Integrations Page
const mockIntegrations: Integration[] = [];

// Network Page
const mockRemoteStores: RemoteStore[] = [];

// Performance Page
const mockMetrics: PerformanceMetric[] = [];
const mockErrors: RecentError[] = [];
```

## Backend APIs Needed

To fully remove mock data, these endpoints must exist:

```
GET /api/inventory/items
GET /api/products
GET /api/customers
GET /api/users (already exists)
GET /api/settings/tax-rules
GET /api/integrations
GET /api/stores/remote
GET /api/performance/metrics
GET /api/performance/errors
```

## Testing After Changes

1. Open each page
2. Verify it shows empty state (not errors)
3. Verify no console errors
4. Verify page doesn't crash

## Time Estimates

- **Empty arrays only**: 5 minutes
- **Empty arrays + empty states**: 30 minutes
- **Full API integration**: 2-3 hours
- **Testing**: 15 minutes

## Your Choice

What would you like me to do?

**A)** Quick fix - empty all mock arrays (5 min)
**B)** Empty arrays + nice empty states (30 min)
**C)** Full API integration (2-3 hours)

Let me know and I'll execute it!
