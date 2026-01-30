# Quick Edit Guide - Remove Mock Data

## 🚀 Quick Start

1. Run: `open-mock-files.bat`
2. This opens all 9 files in VS Code
3. Edit each file as shown below
4. Save all files (Ctrl+K, S)
5. Run: `build-prod.bat`

## 📝 What to Change in Each File

### 1. WarehousePage.tsx (Line 34)

**Find:**
```typescript
const mockInventory: InventoryItem[] = [
  { id: '1', name: 'Baseball Cap - Black', sku: 'CAP-BLK-001', category: 'Caps', stock: 45, minStock: 20, location: 'A-1-3', lastReceived: '2026-01-08', status: 'in-stock' },
  { id: '2', name: 'Oil Filter - Toyota', sku: 'OIL-TOY-001', category: 'Parts', stock: 8, minStock: 15, location: 'B-2-1', lastReceived: '2026-01-05', status: 'low-stock' },
  // ... 18 more items
];
```

**Replace with:**
```typescript
const mockInventory: InventoryItem[] = [];
```

---

### 2. SellPage.tsx (Line 37)

**Find:**
```typescript
const mockProducts: Product[] = [
  { id: '1', name: 'Baseball Cap - Black', sku: 'CAP-BLK-001', price: 24.99, category: 'caps', stock: 45 },
  { id: '2', name: 'Baseball Cap - Navy', sku: 'CAP-NVY-001', price: 24.99, category: 'caps', stock: 32 },
  // ... 50+ more items
];
```

**Replace with:**
```typescript
const mockProducts: Product[] = [];
```

---

### 3. LookupPage.tsx (Line 28)

**Find:**
```typescript
const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Baseball Cap - Black',
    // ... lots of properties
  },
  // ... 50+ more items
];
```

**Replace with:**
```typescript
const mockProducts: Product[] = [];
```

---

### 4. CustomersPage.tsx (Line 35)

**Find:**
```typescript
const mockCustomers: Customer[] = [
  {
    id: '1',
    name: 'John Smith',
    // ... more properties
  },
  // ... 10+ more customers
];
```

**Replace with:**
```typescript
const mockCustomers: Customer[] = [];
```

---

### 5. AdminPage.tsx (Line 59)

**Find:**
```typescript
const mockUsers: User[] = [
  { id: '1', username: 'admin', name: 'System Administrator', email: 'admin@EasySale.local', role: 'admin', status: 'active', lastLogin: '2026-01-10 09:30' },
  { id: '2', username: 'manager', name: 'John Manager', email: 'manager@EasySale.local', role: 'manager', status: 'active', lastLogin: '2026-01-10 08:15' },
  // ... more users
];
```

**Replace with:**
```typescript
const mockUsers: User[] = [];
```

---

### 6. TaxRulesPage.tsx (Line 17)

**Find:**
```typescript
const mockTaxRules: TaxRule[] = [
  { id: '1', name: 'HST (Ontario)', rate: 13.0, category: null, is_default: true, store_id: 'store-001' },
  { id: '2', name: 'Reduced Rate (Food)', rate: 5.0, category: 'Food & Beverages', is_default: false, store_id: 'store-001' },
  // ... more rules
];
```

**Replace with:**
```typescript
const mockTaxRules: TaxRule[] = [];
```

---

### 7. IntegrationsPage.tsx (Line 19)

**Find:**
```typescript
const mockIntegrations: Integration[] = [
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    // ... more properties
  },
  // ... more integrations
];
```

**Replace with:**
```typescript
const mockIntegrations: Integration[] = [];
```

---

### 8. NetworkPage.tsx (Line 17)

**Find:**
```typescript
const mockRemoteStores: RemoteStore[] = [
  {
    id: '1',
    name: 'Store 1',
    // ... more properties
  },
  // ... more stores
];
```

**Replace with:**
```typescript
const mockRemoteStores: RemoteStore[] = [];
```

---

### 9. PerformancePage.tsx (Lines 21 & 30)

**Find TWO arrays:**

```typescript
const mockMetrics: PerformanceMetric[] = [
  { name: 'API Response Time (p50)', value: '45ms', status: 'good' },
  { name: 'API Response Time (p95)', value: '120ms', status: 'good' },
  // ... more metrics
];

const mockErrors: RecentError[] = [
  {
    id: '1',
    timestamp: '2026-01-10 14:23:15',
    // ... more properties
  },
  // ... more errors
];
```

**Replace with:**
```typescript
const mockMetrics: PerformanceMetric[] = [];

const mockErrors: RecentError[] = [];
```

---

## 🎯 Quick Tips

### Use Find & Replace in VS Code:

1. Press `Ctrl+H` (Find & Replace)
2. Enable regex mode (click `.*` button)
3. Find: `const mock\w+: \w+\[\] = \[[^\]]*\];`
4. Replace: `const mock$1: $2[] = [];`
5. Click "Replace All" in each file

### Or Use Multi-Cursor:

1. Find the line with `const mock...`
2. Select from `= [` to the closing `];`
3. Delete and type `= [];`

### Keyboard Shortcuts:

- `Ctrl+F` - Find
- `Ctrl+H` - Find & Replace
- `Ctrl+S` - Save
- `Ctrl+K, S` - Save All
- `Ctrl+W` - Close file
- `Ctrl+Tab` - Switch between files

## ✅ Verification

After editing all files, check:

- [ ] All 9 files edited
- [ ] All mock arrays are now empty `[]`
- [ ] No syntax errors (red squiggles)
- [ ] All files saved

## 🚀 Build & Test

```bash
# Build with changes
.\build-prod.bat

# Wait 8-10 minutes for build

# Test
# Open: http://192.168.2.65:7945
# Login: admin / admin123
# Check each page shows empty states
```

## 📊 Expected Results

After rebuild:

- **Dashboard**: Shows real data or $0.00
- **Warehouse**: "No inventory items"
- **Sell**: "No products available"
- **Lookup**: "No products found"
- **Customers**: "No customers yet"
- **Admin**: Shows only real users from database
- **Settings**: Empty configuration pages

This is CORRECT! It means no fake data.

## 🎨 Theme Check

While you're editing, the theme should already be orange after the container restart.

Test: http://192.168.2.65:7945

If still blue:
- Hard refresh: `Ctrl+Shift+R`
- Or open incognito mode

## ⏱️ Time Estimate

- Opening files: 30 seconds
- Editing 9 files: 5-10 minutes
- Saving: 10 seconds
- Building: 8-10 minutes
- Testing: 2-3 minutes

**Total: ~15-20 minutes**

## 🎉 You're Done!

After this, you'll have:
- ✅ Orange theme
- ✅ No mock data
- ✅ Clean empty states
- ✅ Ready for real data integration

Good luck! 🚀
