# Module Boundary Enforcement

## Overview

The CAPS POS system enforces strict module boundaries to prevent code duplication, circular dependencies, and feature sprawl. These boundaries are enforced through ESLint rules that run during development and in the CI pipeline.

## Architecture Principles

### Feature Isolation
Features are self-contained modules that represent distinct user-facing functionality (e.g., sell, lookup, warehouse, customers). Each feature:
- Contains its own components, hooks, pages, and tests
- Can import from `common/` and `domains/`
- **Cannot** import from other features
- Exports a public API through its `index.ts` file

### Domain Logic Separation
Domains contain pure business logic that is independent of UI concerns (e.g., cart, pricing, stock, auth). Each domain:
- Contains business logic, types, and React hooks
- Can import from `common/`
- **Cannot** import from `features/`
- Is reusable across multiple features

### Common Utilities
Common utilities are shared code used across the application (e.g., design system components, contexts, utilities). Common code:
- Provides reusable UI components and utilities
- **Cannot** import from `features/` or `domains/`
- Must remain generic and feature-agnostic

## Directory Structure

```
src/
├── features/           # Feature modules (user-facing functionality)
│   ├── sell/          # Can import from common/ and domains/
│   ├── lookup/        # Cannot import from other features
│   ├── warehouse/
│   ├── customers/
│   ├── reporting/
│   └── admin/
├── domains/           # Business logic modules
│   ├── cart/          # Can import from common/
│   ├── pricing/       # Cannot import from features/
│   ├── stock/
│   ├── auth/
│   └── documents/
└── common/            # Shared utilities and components
    ├── components/    # Cannot import from features/ or domains/
    ├── layouts/
    ├── contexts/
    └── utils/
```

## Enforcement Rules

### Rule 1: Features Cannot Import from Other Features

**Rationale:** Prevents tight coupling between features and allows features to evolve independently.

**Example Violation:**
```typescript
// ❌ BAD: In features/sell/components/Cart.tsx
import { ProductSearch } from '../../lookup/components/ProductSearch';
```

**Correct Approach:**
```typescript
// ✅ GOOD: Extract shared logic to domains or common
import { searchProducts } from '../../../domains/product/productService';
import { SearchInput } from '../../../common/components/SearchInput';
```

### Rule 2: Domains Cannot Import from Features

**Rationale:** Keeps business logic independent of UI implementation, making it reusable and testable.

**Example Violation:**
```typescript
// ❌ BAD: In domains/cart/cartEngine.ts
import { CartPanel } from '../../features/sell/components/CartPanel';
```

**Correct Approach:**
```typescript
// ✅ GOOD: Domains provide logic, features consume it
// In domains/cart/cartEngine.ts
export function calculateCartTotal(cart: Cart): number {
  // Pure business logic
}

// In features/sell/components/CartPanel.tsx
import { calculateCartTotal } from '../../../domains/cart/cartEngine';
```

### Rule 3: Common Cannot Import from Features or Domains

**Rationale:** Ensures common utilities remain generic and don't create circular dependencies.

**Example Violation:**
```typescript
// ❌ BAD: In common/components/Button.tsx
import { useAuth } from '../../domains/auth/authHooks';
```

**Correct Approach:**
```typescript
// ✅ GOOD: Pass dependencies as props
// In common/components/Button.tsx
interface ButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

// In features/sell/components/Toolbar.tsx
import { Button } from '../../../common/components/Button';
import { useAuth } from '../../../domains/auth/authHooks';

const Toolbar = () => {
  const { isAuthenticated } = useAuth();
  return <Button disabled={!isAuthenticated} />;
};
```

## ESLint Configuration

The module boundaries are enforced through ESLint rules in `frontend/eslint.config.js`:

```javascript
// For files in features/
{
  files: ['src/features/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../*/!(index)', '../*/!(index).ts', '../*/!(index).tsx', '../*/**'],
            message: 'Features should not import from other features. Use domains/ or common/ instead.',
          },
        ],
      },
    ],
  },
}

// For files in domains/
{
  files: ['src/domains/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/features/**'],
            message: 'Domains should not import from features. Keep domain logic independent.',
          },
        ],
      },
    ],
  },
}

// For files in common/
{
  files: ['src/common/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/features/**', '**/domains/**'],
            message: 'Common utilities should not import from features or domains.',
          },
        ],
      },
    ],
  },
}
```

## CI/CD Integration

The linting rules run automatically in the CI pipeline:

```yaml
- name: Run linter
  run: npm run lint
```

Any violations will cause the build to fail, preventing code with boundary violations from being merged.

## Testing

Module boundary enforcement is tested in `src/test/module-boundary.test.ts`. These tests verify that:
1. Feature-to-feature imports are blocked
2. Features can import from common and domains
3. Domains cannot import from features
4. Common cannot import from features or domains

Run the tests with:
```bash
npm test src/test/module-boundary.test.ts
```

## Common Patterns

### Sharing Logic Between Features

**Problem:** Two features need the same logic.

**Solution:** Extract to a domain module.

```typescript
// domains/product/productService.ts
export async function searchProducts(query: string): Promise<Product[]> {
  // Shared logic
}

// features/sell/hooks/useProductSearch.ts
import { searchProducts } from '../../../domains/product/productService';

// features/lookup/hooks/useProductSearch.ts
import { searchProducts } from '../../../domains/product/productService';
```

### Sharing UI Components Between Features

**Problem:** Two features need the same UI component.

**Solution:** Move to common/components.

```typescript
// common/components/ProductCard.tsx
export const ProductCard = ({ product }: { product: Product }) => {
  // Reusable UI component
};

// features/sell/components/ProductList.tsx
import { ProductCard } from '../../../common/components/ProductCard';

// features/lookup/components/SearchResults.tsx
import { ProductCard } from '../../../common/components/ProductCard';
```

### Feature-Specific Variations

**Problem:** A feature needs a specialized version of a common component.

**Solution:** Create a feature-specific wrapper.

```typescript
// common/components/DataTable.tsx
export const DataTable = ({ columns, data }: DataTableProps) => {
  // Generic table component
};

// features/warehouse/components/InventoryTable.tsx
import { DataTable } from '../../../common/components/DataTable';

export const InventoryTable = ({ inventory }: { inventory: Inventory[] }) => {
  const columns = [
    // Feature-specific column configuration
  ];
  return <DataTable columns={columns} data={inventory} />;
};
```

## Benefits

1. **Prevents Circular Dependencies:** Clear hierarchy prevents import cycles
2. **Enables Independent Development:** Features can be developed in parallel
3. **Improves Testability:** Domain logic can be tested without UI
4. **Reduces Code Duplication:** Shared logic naturally moves to domains
5. **Simplifies Refactoring:** Changes to one feature don't break others
6. **Enforces Best Practices:** Automated enforcement through linting

## Troubleshooting

### ESLint Error: "Features should not import from other features"

**Cause:** You're trying to import from another feature.

**Solution:** 
1. If it's business logic, move it to a domain module
2. If it's a UI component, move it to common/components
3. If it's truly feature-specific, duplicate it (rare)

### ESLint Error: "Domains should not import from features"

**Cause:** Domain logic is trying to use UI components.

**Solution:** Invert the dependency - have features import from domains, not the other way around.

### ESLint Error: "Common utilities should not import from features or domains"

**Cause:** Common code is trying to use feature or domain-specific logic.

**Solution:** Pass the logic as props or callbacks instead of importing it.

## Related Documentation

- [Feature-Based Code Organization](./feature-organization.md)
- [Domain-Driven Design](./domain-driven-design.md)
- [Design System](../design-system/README.md)
- [Testing Strategy](./testing-strategy.md)
