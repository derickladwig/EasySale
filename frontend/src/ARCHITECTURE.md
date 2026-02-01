# Frontend Architecture

This document describes the architectural patterns and organization of the EasySale frontend.

## Table of Contents

1. [Directory Structure](#directory-structure)
2. [Layer Responsibilities](#layer-responsibilities)
3. [State Management](#state-management)
4. [API Client Patterns](#api-client-patterns)
5. [Module Boundaries](#module-boundaries)
6. [Build Variants](#build-variants)
7. [Code Splitting](#code-splitting)

---

## Directory Structure

```
src/
├── admin/              # Admin feature (root-level, critical)
├── auth/               # Authentication pages and components
├── common/             # Shared utilities, components, contexts
│   ├── api/            # API client re-exports
│   ├── components/     # Shared UI components (atoms, molecules, organisms)
│   ├── contexts/       # React contexts (auth, permissions, etc.)
│   ├── hooks/          # Shared hooks
│   └── utils/          # Utility functions
├── config/             # Configuration providers
├── customers/          # Customer management (root-level, critical)
├── domains/            # Business logic layer (NO UI)
│   ├── customer/       # Customer domain
│   ├── product/        # Product domain
│   ├── settings/       # Settings domain
│   └── ...
├── features/           # Optional/lazy-loaded features
│   ├── reporting/      # Reporting feature
│   ├── review/         # Document review feature
│   └── ...
├── inventory/          # Inventory management (root-level, critical)
├── nav/                # Navigation configuration
├── sell/               # POS checkout (root-level, critical)
├── settings/           # Settings pages
├── stores/             # Zustand stores
└── styles/             # Global styles and theme
```

### Feature Location Strategy

**Root-Level Features** (always loaded, critical path):
- `admin/` - Admin panel and configuration
- `sell/` - Point of sale checkout
- `customers/` - Customer management
- `inventory/` - Inventory management
- `auth/` - Authentication

**Features Directory** (lazy-loaded, optional):
- `features/reporting/` - Reports and analytics
- `features/review/` - Document review workflow
- `features/templates/` - Template management
- `features/exports/` - Export functionality

**Domains Directory** (business logic only):
- Contains API clients, types, and React Query hooks
- NO UI components (use features for UI)
- Shared across multiple features

---

## Layer Responsibilities

### Domains Layer (`domains/`)

Pure business logic with no UI dependencies.

```
domains/customer/
├── api.ts       # API client functions
├── hooks.ts     # React Query hooks
├── types.ts     # TypeScript types
└── index.ts     # Public exports
```

**Guidelines:**
- Only export types, API functions, and hooks
- No React components
- No imports from `features/` or root-level features
- Can import from `@common/`

### Features Layer (`features/`)

Feature-specific UI and logic.

```
features/reporting/
├── components/  # Feature-specific components
├── hooks/       # Feature-specific hooks
├── pages/       # Feature pages
├── types.ts     # Feature types
└── index.ts     # Public exports
```

**Guidelines:**
- Can import from `@domains/` and `@common/`
- Cannot import from other features
- Lazy-loaded by default

### Common Layer (`common/`)

Shared utilities and components.

```
common/
├── api/         # API client
├── components/  # Reusable UI components
├── contexts/    # Global contexts
├── hooks/       # Shared hooks
└── utils/       # Utility functions
```

**Guidelines:**
- No imports from `@domains/` or `@features/`
- Must be feature-agnostic
- Used by all layers

---

## State Management

### When to Use Each Pattern

| Pattern | Use Case | Example |
|---------|----------|---------|
| **React Query** | Server state, API data | Products, customers, sales |
| **Zustand** | Complex client state | Cart, product cache |
| **React Context** | Simple global state | Auth, theme, permissions |
| **useState** | Component-local state | Form inputs, modals |

### Zustand Stores (`stores/`)

```typescript
// Import from @stores
import { useCartStore } from '@stores';

// Use in components
const { items, addItem, clear } = useCartStore();
```

**Available Stores:**
- `cartStore` - Shopping cart state
- `productStore` - Product cache for quick lookups

### React Contexts (`common/contexts/`)

```typescript
// Import from @common/contexts
import { useAuth } from '@common/contexts';

// Use in components
const { user, isAuthenticated } = useAuth();
```

**Available Contexts:**
- `AuthContext` - User authentication
- `PermissionsContext` - Permission checks
- `CapabilitiesContext` - Feature flags
- `TenantSetupContext` - Setup status

---

## API Client Patterns

### Centralized API Client

Always use the centralized API client:

```typescript
// Correct - use @common/api/client
import { apiClient } from '@common/api/client';

// Incorrect - don't use these
import axios from 'axios';
import { apiClient } from '../../common/utils/apiClient';
```

### Domain API Pattern

```typescript
// domains/customer/api.ts
import { apiClient } from '@common/api/client';

export const customerApi = {
  list: () => apiClient.get<Customer[]>('/api/customers'),
  get: (id: string) => apiClient.get<Customer>(`/api/customers/${id}`),
  create: (data: CreateCustomerRequest) => apiClient.post<Customer>('/api/customers', data),
  update: (id: string, data: UpdateCustomerRequest) => apiClient.put<Customer>(`/api/customers/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/customers/${id}`),
};
```

### React Query Hooks

```typescript
// domains/customer/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customerApi } from './api';

export function useCustomersQuery() {
  return useQuery({
    queryKey: ['customers'],
    queryFn: customerApi.list,
  });
}

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: customerApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
```

---

## Module Boundaries

### Import Rules

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   common/   │ ←── │  domains/   │ ←── │  features/  │
└─────────────┘     └─────────────┘     └─────────────┘
      ↑                   ↑                    ↑
      │                   │                    │
      └───────────────────┴────────────────────┘
                    Root Features
```

**Allowed:**
- `features/` can import from `domains/` and `common/`
- `domains/` can import from `common/`
- Root features can import from `domains/` and `common/`

**Forbidden:**
- `common/` cannot import from `domains/` or `features/`
- `domains/` cannot import from `features/`
- `features/` cannot import from other `features/`

### ESLint Enforcement

Module boundaries are enforced via ESLint rules in `eslint.config.js`.

---

## Build Variants

### Available Variants

| Variant | Features | Bundle Size |
|---------|----------|-------------|
| `lite` | Core POS only | ~80 KB gzip |
| `export` | Lite + Admin, Reports, CSV | ~100 KB gzip |
| `full` | Export + OCR, Documents, Review | ~120 KB gzip |

### Feature Flags

```typescript
// Check build variant
import { ENABLE_ADMIN, ENABLE_DOCUMENTS, ENABLE_REVIEW } from '@common/utils/buildVariant';

// Conditional rendering
{ENABLE_DOCUMENTS && <DocumentsPage />}
```

### Build Commands

```bash
npm run build:lite    # Lite variant
npm run build:export  # Export variant (default)
npm run build:full    # Full variant
```

---

## Code Splitting

### Lazy Loading

Non-critical routes are lazy-loaded:

```typescript
// routes/lazyRoutes.tsx
export const LazyAdminPage = lazyWithFallback(
  () => import('../admin/pages/AdminPage')
);
```

### Critical Path (Eagerly Loaded)

- `LoginPage`
- `HomePage`
- `SellPage`
- `LookupPage`
- `InventoryPage`
- `CustomersPage`

### Heavy Libraries

Load heavy libraries dynamically:

```typescript
// Only load when needed
const ChartJS = await import('chart.js');
const ReactPDF = await import('@react-pdf/renderer');
```

---

## Adding New Features

1. **Create domain** (if new business logic needed):
   ```
   domains/new-feature/
   ├── api.ts
   ├── hooks.ts
   ├── types.ts
   └── index.ts
   ```

2. **Create feature** (for UI):
   ```
   features/new-feature/
   ├── components/
   ├── pages/
   └── index.ts
   ```

3. **Add lazy route** in `routes/lazyRoutes.tsx`

4. **Add feature flag** if optional

5. **Update this document** if adding new patterns

---

## Related Documentation

- [DOMAIN_TEMPLATE.md](./domains/DOMAIN_TEMPLATE.md) - Domain creation guide
- [FEATURE_TEMPLATE.md](./features/FEATURE_TEMPLATE.md) - Feature creation guide
- [CSS_OWNERSHIP_RULES.md](./docs/CSS_OWNERSHIP_RULES.md) - Styling guidelines
