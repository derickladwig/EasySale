# Domain Module Template

This document describes the standard structure for domain modules in the EasySale system.

## What is a Domain Module?

Domain modules contain **business logic** separate from UI concerns. They are pure TypeScript/JavaScript functions and React hooks that implement core business rules.

## Directory Structure

```
domain-name/
├── domainEngine.ts     # Pure business logic functions
├── domainHooks.ts      # React hooks that use the engine
├── types.ts            # TypeScript types and interfaces
├── index.ts            # Public API exports
└── README.md           # Domain documentation
```

## Module Boundaries

### ✅ Can Import From:
- Other domain modules (e.g., `@domains/pricing` can use `@domains/cart`)
- Utility libraries (lodash, date-fns, etc.)
- No React components (domain logic is UI-agnostic)

### ❌ Cannot Import From:
- `@features/*` - Features depend on domains, not the other way around
- `@common/components` - Domain logic should be UI-agnostic
- `@common/layouts` - Domain logic should be UI-agnostic

### 📝 Export Rules:
- Export engine functions (pure business logic)
- Export React hooks (for use in components)
- Export types and interfaces
- Keep internal helpers private

## Creating a New Domain

### 1. Create Directory

```bash
cd frontend/src/domains
mkdir my-domain
cd my-domain
```

### 2. Create Engine (Pure Logic)

```typescript
// domainEngine.ts
import { MyData, MyResult } from './types';

/**
 * Core business logic - pure functions, no React
 */

export function calculateSomething(data: MyData): MyResult {
  // Pure business logic
  // No side effects
  // Testable without React
  return result;
}

export function validateSomething(data: MyData): boolean {
  // Validation logic
  return isValid;
}
```

### 3. Create Hooks (React Integration)

```typescript
// domainHooks.ts
import { useState, useEffect } from 'react';
import { calculateSomething } from './domainEngine';
import { MyData } from './types';

/**
 * React hooks that use the domain engine
 */

export function useMyDomain(initialData: MyData) {
  const [data, setData] = useState(initialData);
  const [result, setResult] = useState(null);

  useEffect(() => {
    // Use engine functions
    const calculated = calculateSomething(data);
    setResult(calculated);
  }, [data]);

  const actions = {
    updateData: (newData: MyData) => setData(newData),
  };

  return { data, result, actions };
}
```

### 4. Create Types

```typescript
// types.ts

export interface MyData {
  id: string;
  value: number;
  // ... other fields
}

export interface MyResult {
  total: number;
  breakdown: Record<string, number>;
}

export type MyStatus = 'pending' | 'complete' | 'error';
```

### 5. Create Public API

```typescript
// index.ts

// Export engine functions
export { calculateSomething, validateSomething } from './domainEngine';

// Export hooks
export { useMyDomain } from './domainHooks';

// Export types
export type { MyData, MyResult, MyStatus } from './types';
```

### 6. Create README

```markdown
# My Domain

Brief description of the business logic this domain handles.

## Engine Functions

### calculateSomething(data: MyData): MyResult
Description of what this function does.

### validateSomething(data: MyData): boolean
Description of validation rules.

## Hooks

### useMyDomain(initialData: MyData)
React hook for using this domain in components.

## Types

[Document key types and their purposes]
```

## Best Practices

### Pure Functions
- Engine functions should be pure (no side effects)
- Same input always produces same output
- Easy to test without mocking
- Can be used in Node.js, React Native, etc.

### Separation of Concerns
- **Engine**: Pure business logic
- **Hooks**: React integration
- **Types**: Data structures

### Testing
- Test engine functions with unit tests
- Test hooks with React Testing Library
- Use property-based tests for complex logic
- Aim for 80%+ coverage on business logic

### Performance
- Memoize expensive calculations
- Use useMemo/useCallback in hooks
- Keep engine functions fast
- Profile and optimize hot paths

## Examples

### Cart Domain

```typescript
// cartEngine.ts
export function addItemToCart(cart: Cart, item: LineItem): Cart {
  // Pure function - returns new cart
  return {
    ...cart,
    items: [...cart.items, item],
  };
}

export function calculateCartTotal(cart: Cart): number {
  return cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// cartHooks.ts
export function useCart(initialCart: Cart) {
  const [cart, setCart] = useState(initialCart);

  const addItem = (item: LineItem) => {
    setCart(current => addItemToCart(current, item));
  };

  const total = useMemo(() => calculateCartTotal(cart), [cart]);

  return { cart, addItem, total };
}
```

### Pricing Domain

```typescript
// pricingEngine.ts
export function calculateDiscount(price: number, discount: Discount): number {
  if (discount.type === 'percentage') {
    return price * (discount.value / 100);
  }
  return discount.value;
}

export function applyPricingTier(price: number, tier: PriceTier): number {
  return price * tier.multiplier;
}

// pricingHooks.ts
export function usePricing(customerId: string) {
  const [tier, setTier] = useState<PriceTier | null>(null);

  useEffect(() => {
    // Fetch customer's pricing tier
    fetchPricingTier(customerId).then(setTier);
  }, [customerId]);

  const calculatePrice = (basePrice: number) => {
    if (!tier) return basePrice;
    return applyPricingTier(basePrice, tier);
  };

  return { tier, calculatePrice };
}
```

### Stock Domain

```typescript
// stockEngine.ts
export function reserveStock(stock: StockLevel, quantity: number): StockLevel {
  if (stock.available < quantity) {
    throw new Error('Insufficient stock');
  }

  return {
    ...stock,
    available: stock.available - quantity,
    reserved: stock.reserved + quantity,
  };
}

export function releaseReservation(stock: StockLevel, quantity: number): StockLevel {
  return {
    ...stock,
    available: stock.available + quantity,
    reserved: stock.reserved - quantity,
  };
}

// stockHooks.ts
export function useStock(productId: string) {
  const [stock, setStock] = useState<StockLevel | null>(null);

  useEffect(() => {
    // Fetch stock level
    fetchStockLevel(productId).then(setStock);
  }, [productId]);

  const reserve = async (quantity: number) => {
    if (!stock) return;
    const updated = reserveStock(stock, quantity);
    await updateStockLevel(productId, updated);
    setStock(updated);
  };

  return { stock, reserve };
}
```

## Troubleshooting

### Import Errors
If domain can't import from features:
- This is correct! Domains should not import from features
- Move shared logic to another domain
- Keep domains UI-agnostic

### Testing Issues
If tests are difficult:
- Ensure engine functions are pure
- Mock external dependencies
- Use dependency injection for API calls

### Performance Issues
If calculations are slow:
- Profile with React DevTools
- Memoize expensive calculations
- Consider Web Workers for heavy computation
- Cache results when appropriate
