# Module Boundary Enforcement

## Overview

This project enforces strict module boundaries to maintain clean architecture and prevent circular dependencies. The boundaries are enforced through ESLint rules configured in `eslint.config.js`.

## Rules

### 1. Feature Isolation
**Features cannot import from other features.**

```typescript
// ❌ BAD: Feature importing from another feature
import { SomeComponent } from '../sell/components/SomeComponent';

// ✅ GOOD: Use shared code from common/ or domains/
import { SomeComponent } from '@common/components/SomeComponent';
import { someLogic } from '@domains/cart/someLogic';
```

**Rationale:** Features represent independent user workflows. Cross-feature dependencies create tight coupling and make features harder to maintain, test, and potentially extract.

### 2. Domain Independence
**Domains cannot import from features.**

```typescript
// ❌ BAD: Domain importing from feature
import { SellPage } from '@features/sell/pages/SellPage';

// ✅ GOOD: Domains contain pure business logic
import { calculatePrice } from '@domains/pricing/calculator';
```

**Rationale:** Domains contain reusable business logic that should be independent of UI features. This allows domains to be used across multiple features without creating circular dependencies.

### 3. Common Layer Purity
**Common utilities cannot import from features or domains.**

```typescript
// ❌ BAD: Common importing from feature or domain
import { Cart } from '@domains/cart/Cart';
import { SellPage } from '@features/sell/pages/SellPage';

// ✅ GOOD: Common contains only generic utilities
import { formatCurrency } from '@common/utils/format';
import { Button } from '@common/components/Button';
```

**Rationale:** The common layer provides generic, reusable utilities and components. It should have no knowledge of business logic or features to remain truly reusable.

## Directory Structure

```
src/
├── common/          # Generic utilities, components (no business logic)
│   ├── components/  # Reusable UI components
│   ├── layouts/     # Layout components
│   ├── contexts/    # React contexts
│   └── utils/       # Generic utilities
├── domains/         # Business logic (independent of UI)
│   ├── cart/        # Cart business logic
│   ├── pricing/     # Pricing calculations
│   ├── stock/       # Inventory logic
│   ├── auth/        # Authentication logic
│   └── documents/   # Document generation
└── features/        # User-facing features (can use common/ and domains/)
    ├── sell/        # Sales workflow
    ├── lookup/      # Product lookup
    ├── warehouse/   # Warehouse management
    ├── customers/   # Customer management
    ├── reporting/   # Reports and analytics
    └── admin/       # Admin functions
```

## Dependency Flow

```
Features → Domains → Common
   ↓         ↓         ↓
  UI    Business    Generic
         Logic     Utilities
```

- **Features** can import from **Domains** and **Common**
- **Domains** can import from **Common** only
- **Common** cannot import from **Domains** or **Features**
- **Features** cannot import from other **Features**

## Enforcement

Module boundaries are enforced through:

1. **ESLint Rules**: `import/no-restricted-paths` rule in `eslint.config.js`
2. **CI Pipeline**: Linting runs on every commit and PR
3. **Pre-commit Hooks**: Husky runs linting before commits

## Checking Violations

Run the linter to check for boundary violations:

```bash
npm run lint
```

Violations will show errors like:
```
error  Features should not import from other features. Use domains/ or common/ instead.  import/no-restricted-paths
```

## Best Practices

1. **Keep features independent**: Each feature should be a self-contained workflow
2. **Extract shared logic to domains**: If multiple features need the same logic, move it to a domain
3. **Keep common generic**: Don't add business-specific code to common utilities
4. **Use path aliases**: Always use `@common`, `@domains`, `@features` instead of relative paths
5. **Think before importing**: Ask "Does this create a dependency I want?"

## Examples

### Good: Feature using domain logic
```typescript
// features/sell/pages/SellPage.tsx
import { calculateTotal } from '@domains/cart/calculator';
import { Button } from '@common/components/Button';

export function SellPage() {
  const total = calculateTotal(items);
  return <Button>Checkout ${total}</Button>;
}
```

### Bad: Feature importing from another feature
```typescript
// features/warehouse/pages/WarehousePage.tsx
import { ProductSearch } from '@features/sell/components/ProductSearch'; // ❌ Violation!
```

### Good: Extract shared component to common
```typescript
// common/components/ProductSearch.tsx
export function ProductSearch() {
  // Generic product search component
}

// features/sell/pages/SellPage.tsx
import { ProductSearch } from '@common/components/ProductSearch'; // ✅ Good!

// features/warehouse/pages/WarehousePage.tsx
import { ProductSearch } from '@common/components/ProductSearch'; // ✅ Good!
```

## Troubleshooting

### "Features should not import from other features"
Move the shared code to `common/` or `domains/` depending on whether it's generic UI or business logic.

### "Domains should not import from features"
Domains should contain pure business logic. If you need UI, create a feature that uses the domain logic.

### "Common utilities should not import from domains/features"
Common should be generic. If you need business logic, it belongs in a domain, not common.

## References

- [Feature-Sliced Design](https://feature-sliced.design/)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Screaming Architecture](https://blog.cleancoder.com/uncle-bob/2011/09/30/Screaming-Architecture.html)
