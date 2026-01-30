# Module Boundaries Quick Reference

## Import Rules

| From ↓ / To → | features/ | domains/ | common/ |
|---------------|-----------|----------|---------|
| **features/** | ❌ NO     | ✅ YES   | ✅ YES  |
| **domains/**  | ❌ NO     | ✅ YES   | ✅ YES  |
| **common/**   | ❌ NO     | ❌ NO    | ✅ YES  |

## Quick Decision Tree

```
Need to share code between features?
│
├─ Is it business logic? → Move to domains/
│
├─ Is it a UI component? → Move to common/components/
│
├─ Is it a utility function? → Move to common/utils/
│
└─ Is it truly feature-specific? → Duplicate it (rare)
```

## Examples

### ✅ ALLOWED

```typescript
// Feature importing from domain
// features/sell/components/Cart.tsx
import { calculateTotal } from '../../../domains/cart/cartEngine';

// Feature importing from common
// features/sell/components/Toolbar.tsx
import { Button } from '../../../common/components/Button';

// Domain importing from common
// domains/cart/cartHooks.ts
import { useLocalStorage } from '../../common/hooks/useLocalStorage';
```

### ❌ BLOCKED

```typescript
// Feature importing from another feature
// features/sell/components/Cart.tsx
import { ProductSearch } from '../../lookup/components/ProductSearch'; // ❌

// Domain importing from feature
// domains/cart/cartEngine.ts
import { CartPanel } from '../../features/sell/components/CartPanel'; // ❌

// Common importing from domain
// common/components/Button.tsx
import { useAuth } from '../../domains/auth/authHooks'; // ❌

// Common importing from feature
// common/utils/helpers.ts
import { formatPrice } from '../../features/sell/utils/formatting'; // ❌
```

## Common Scenarios

### Scenario 1: Two features need the same calculation

**Problem:**
```typescript
// features/sell/utils/pricing.ts
export const calculateDiscount = (price: number, percent: number) => {
  return price * (1 - percent / 100);
};

// features/warehouse/utils/pricing.ts
export const calculateDiscount = (price: number, percent: number) => {
  return price * (1 - percent / 100);
}; // ❌ Duplication!
```

**Solution:**
```typescript
// domains/pricing/pricingEngine.ts
export const calculateDiscount = (price: number, percent: number) => {
  return price * (1 - percent / 100);
};

// features/sell/components/Cart.tsx
import { calculateDiscount } from '../../../domains/pricing/pricingEngine';

// features/warehouse/components/PriceAdjustment.tsx
import { calculateDiscount } from '../../../domains/pricing/pricingEngine';
```

### Scenario 2: Two features need the same UI component

**Problem:**
```typescript
// features/sell/components/ProductCard.tsx
export const ProductCard = ({ product }) => { /* ... */ };

// features/lookup/components/ProductCard.tsx
export const ProductCard = ({ product }) => { /* ... */ }; // ❌ Duplication!
```

**Solution:**
```typescript
// common/components/ProductCard.tsx
export const ProductCard = ({ product }) => { /* ... */ };

// features/sell/components/ProductList.tsx
import { ProductCard } from '../../../common/components/ProductCard';

// features/lookup/components/SearchResults.tsx
import { ProductCard } from '../../../common/components/ProductCard';
```

### Scenario 3: Feature needs specialized version of common component

**Problem:**
```typescript
// features/warehouse/components/InventoryTable.tsx
import { DataTable } from '../../../common/components/DataTable';
// How do I customize it for inventory?
```

**Solution:**
```typescript
// features/warehouse/components/InventoryTable.tsx
import { DataTable } from '../../../common/components/DataTable';

export const InventoryTable = ({ inventory }) => {
  const columns = [
    { key: 'sku', label: 'SKU' },
    { key: 'quantity', label: 'Qty' },
    // Feature-specific columns
  ];
  
  return <DataTable columns={columns} data={inventory} />;
};
```

## Checking for Violations

### During Development
```bash
# Run linter
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

### Before Committing
Pre-commit hooks automatically run linting. If there are violations, the commit will be blocked.

### In CI/CD
The CI pipeline runs linting on every push and pull request. Violations will fail the build.

## Getting Help

If you're unsure where to put code:
1. Check this guide
2. Look at similar existing code
3. Ask in code review
4. Refer to [full documentation](./architecture/module-boundaries.md)

## Remember

- **Features** = User-facing functionality (pages, components, hooks)
- **Domains** = Business logic (calculations, rules, data operations)
- **Common** = Shared utilities (design system, helpers, contexts)

When in doubt, move code to a more general location (feature → domain → common).
