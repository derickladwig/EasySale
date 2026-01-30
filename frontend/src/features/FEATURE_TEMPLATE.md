# Feature Template

This document describes the standard structure for feature modules in the EasySale system.

## Directory Structure

```
feature-name/
├── components/          # UI components specific to this feature
│   ├── ComponentA.tsx
│   ├── ComponentB.tsx
│   └── index.ts        # Export components
├── hooks/              # Custom hooks for feature logic
│   ├── useFeatureData.ts
│   ├── useFeatureActions.ts
│   └── index.ts        # Export hooks
├── pages/              # Route pages
│   ├── FeaturePage.tsx
│   ├── FeatureDetailPage.tsx
│   └── index.ts        # Export pages
├── types/              # TypeScript types
│   └── index.ts        # Export types
├── index.ts            # Public API - exports for other modules
└── README.md           # Feature documentation
```

## Module Boundaries

### ✅ Can Import From:
- `@common/*` - Shared components, layouts, hooks, utilities
- `@domains/*` - Business logic modules (cart, pricing, stock, auth, documents)

### ❌ Cannot Import From:
- Other features (e.g., `@features/other-feature/*`)
- This prevents circular dependencies and maintains clear boundaries

### 📝 Export Rules:
- Only export what other modules need
- Keep internal components private
- Export pages for routing
- Export types if needed by other features

## Creating a New Feature

### 1. Create Directory Structure

```bash
cd frontend/src/features
mkdir my-feature
cd my-feature
mkdir components hooks pages types
```

### 2. Create index.ts

```typescript
// My Feature - Public API

// Export pages
export { MyFeaturePage } from './pages/MyFeaturePage';

// Export types (if needed by other features)
export type { MyFeatureData } from './types';

// Don't export internal components unless necessary
```

### 3. Create README.md

```markdown
# My Feature

Brief description of what this feature does.

## Structure

[List key components and their purposes]

## Module Boundaries

[Document what this feature imports and exports]

## Usage

[Show how to use this feature in routes]
```

### 4. Create Components

```typescript
// components/MyComponent.tsx
import { Button, Input } from '@common/components';
import { useMyDomain } from '@domains/my-domain';

export function MyComponent() {
  const { data, actions } = useMyDomain();
  
  return (
    <div>
      {/* Component implementation */}
    </div>
  );
}
```

### 5. Create Hooks

```typescript
// hooks/useMyFeature.ts
import { useState, useEffect } from 'react';
import { myDomainLogic } from '@domains/my-domain';

export function useMyFeature() {
  const [state, setState] = useState();
  
  // Hook implementation using domain logic
  
  return { state, actions };
}
```

### 6. Create Pages

```typescript
// pages/MyFeaturePage.tsx
import { PageHeader, Panel } from '@common/layouts';
import { MyComponent } from '../components/MyComponent';

export function MyFeaturePage() {
  return (
    <>
      <PageHeader
        title="My Feature"
        subtitle="Feature description"
      />
      <div className="p-4 sm:p-6 lg:p-8">
        <Panel>
          <MyComponent />
        </Panel>
      </div>
    </>
  );
}
```

## Best Practices

### Component Organization
- Keep components small and focused
- Use composition over inheritance
- Extract reusable logic into hooks
- Keep business logic in domain modules

### State Management
- Use React hooks for local UI state
- Use domain modules for business logic
- Avoid prop drilling - use context when needed
- Keep state as close to where it's used as possible

### Styling
- Use Tailwind utility classes
- Follow responsive design patterns
- Use design tokens from tailwind.config.js
- Never use arbitrary values (e.g., `px-[17px]`)

### Testing
- Write unit tests for hooks
- Write component tests for complex UI
- Test integration with domain logic
- Use property-based tests for business logic

### Performance
- Use React.memo for expensive components
- Lazy load pages with React.lazy
- Virtualize long lists
- Debounce search inputs

## Examples

### Sell Feature
Point-of-sale checkout interface.

**Key Components:**
- CartPanel - Display cart items
- ProductSearch - Search and add products
- PaymentPane - Process payment

**Imports:**
- `@domains/cart` - Cart operations
- `@domains/pricing` - Price calculations
- `@domains/auth` - User permissions

### Inventory Feature
Inventory receiving and management.

**Key Components:**
- ReceivingForm - Receive new stock
- PutawayQueue - Organize stock
- TransferList - Move stock between locations

**Imports:**
- `@domains/stock` - Inventory operations
- `@domains/auth` - User permissions

## Troubleshooting

### Import Errors
If you see "Cannot import from other feature":
- Check that you're only importing from `@common` or `@domains`
- Move shared code to `@common` if needed
- Move business logic to `@domains` if needed

### Circular Dependencies
If you have circular dependencies:
- Extract shared types to `@common/types`
- Move business logic to `@domains`
- Ensure features don't import from each other

### Type Errors
If TypeScript can't find types:
- Check that types are exported from index.ts
- Verify path aliases in tsconfig.json
- Restart TypeScript server in your IDE
