# Design Document

## Overview

This design establishes the foundational infrastructure for the CAPS POS system following the principle that **structure prevents chaos**. By creating a rigid layout contract, feature-based organization, and reusable design system upfront, we prevent the code duplication, layout drift, and complexity that plague growing applications.

The foundation consists of:
- **Monorepo structure** with clear boundaries between frontend, backend, and services
- **Design system** with layout primitives that enforce the "one layout contract" principle
- **Feature modules** organized by domain to prevent scattered implementations
- **Build and deployment** infrastructure for consistent environments
- **Testing framework** that runs across all layers

This foundation directly supports the CAPS design principles: checkout stays sacred because the layout contract prevents navigation surprises; progressive disclosure works because components are built with it in mind; role-adaptive UI is possible because permissions are baked into the architecture from day one.

## Architecture

### Monorepo Structure

```
caps-pos/
├── frontend/                    # React + TypeScript application
│   ├── src/
│   │   ├── features/           # Feature-based organization
│   │   │   ├── sell/           # Sell module (Register)
│   │   │   ├── lookup/         # Product lookup
│   │   │   ├── warehouse/      # Receiving, putaway, picking
│   │   │   ├── customers/      # Customer management
│   │   │   ├── reporting/      # Reports and analytics
│   │   │   └── admin/          # Settings and configuration
│   │   ├── common/             # Shared code
│   │   │   ├── components/     # Design system components
│   │   │   ├── layouts/        # Layout primitives (AppShell, PageHeader)
│   │   │   ├── contexts/       # React contexts (Auth, Permissions)
│   │   │   └── utils/          # Shared utilities
│   │   ├── domains/            # Business logic modules
│   │   │   ├── cart/           # Cart math, pricing
│   │   │   ├── pricing/        # Tier rules, discounts
│   │   │   ├── stock/          # Reservations, transfers
│   │   │   ├── auth/           # Authentication
│   │   │   └── documents/      # Invoice/quote/credit
│   │   └── assets/             # Static assets
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── backend/
│   └── rust/                   # Rust API server
│       ├── src/
│       │   ├── handlers/       # HTTP handlers
│       │   ├── models/         # Data models
│       │   ├── db/             # Database access
│       │   └── config/         # Configuration
│       └── Cargo.toml
├── sync/                       # Cross-store sync service
├── backup/                     # Backup service
├── installer/                  # Installation scripts
├── docs/                       # Documentation
└── docker-compose.yml          # Development environment
```


### Technology Decisions

**Frontend Stack:**
- **React 18+** with TypeScript for type safety
- **Vite** for fast builds and hot module replacement
- **Tailwind CSS** configured with design tokens
- **shadcn/ui** as component library base (customized to our design system)
- **React Router** for navigation with route guards
- **React Query** for data fetching and caching
- **Zustand** for lightweight state management (avoid Redux complexity)

**Backend Stack:**
- **Rust with Actix Web** for the local API server
- **SQLite** with sqlx for database access (compile-time checked queries)
- **Diesel** for migrations (or sqlx migrations)

**Development Tools:**
- **Docker & docker-compose** for local development
- **ESLint + Prettier** for TypeScript
- **rustfmt + clippy** for Rust
- **Husky** for pre-commit hooks
- **Storybook** for component documentation

## Components and Interfaces

### 1. Layout Contract System

The layout contract prevents "layout gets weird" by enforcing a consistent structure across all screens.

**AppShell Component** (the one true layout):
```typescript
interface AppShellProps {
  children: React.ReactNode;
}

// AppShell.tsx
// Provides: TopBar + LeftNav + MainWorkspace + optional RightContextPanel
// All pages render inside MainWorkspace
// No page can define its own outer grid
```

**Layout Primitives:**
- `PageHeader` - Consistent page titles, breadcrumbs, actions
- `SplitPane` - Two-column layouts with resizable divider
- `Panel` - Card-like containers with consistent padding
- `DataTable` - Virtualized tables with sorting, filtering
- `Drawer` - Right-side drawer for advanced actions
- `FormLayout` - Consistent form field layout


### 2. Design System Architecture

**Design Tokens** (tailwind.config.js):
```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Brand colors
        primary: { /* ... */ },
        secondary: { /* ... */ },
        // Semantic colors
        success: { /* ... */ },
        warning: { /* ... */ },
        error: { /* ... */ },
        // UI colors
        background: { /* ... */ },
        surface: { /* ... */ },
        border: { /* ... */ },
      },
      spacing: {
        // Only use these tokens (prevents random margins)
        // 2, 3, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64
      },
      fontSize: {
        // Typography scale
      },
    },
  },
};
```

**Base Components** (all in `common/components/`):
- Button (primary, secondary, ghost, danger variants)
- Input (text, number, search with validation states)
- Select (single, multi, searchable)
- Table (virtualized, sortable, filterable)
- Card (with header, body, footer slots)
- Modal (with size variants, but use sparingly)
- Toast (for confirmations and errors)
- Badge (for status indicators)
- Tabs (for secondary navigation within modules)


### 3. Feature Module Structure

Each feature follows this structure to keep related code together:

```
features/sell/
├── components/           # UI components specific to Sell
│   ├── CartPanel.tsx
│   ├── ProductSearch.tsx
│   └── PaymentPane.tsx
├── hooks/               # Custom hooks for Sell logic
│   ├── useCart.ts
│   └── usePayment.ts
├── pages/               # Route pages
│   └── SellPage.tsx
├── types.ts             # TypeScript types
└── index.ts             # Public exports
```

**Module Boundaries:**
- Features can import from `common/` and `domains/`
- Features CANNOT import from other features
- Business logic lives in `domains/`, not in feature components
- This prevents circular dependencies and scattered implementations

### 4. Domain Logic Modules

Business logic is centralized in domain modules (not in UI components):

```
domains/cart/
├── cartEngine.ts        # Cart math, line item operations
├── cartHooks.ts         # React hooks that use cartEngine
└── types.ts             # Cart types

domains/pricing/
├── pricingEngine.ts     # Tier rules, discounts, approvals
├── pricingHooks.ts
└── types.ts

domains/stock/
├── stockEngine.ts       # Reservations, transfers, adjustments
├── stockHooks.ts
└── types.ts
```

**Why separate domains from features?**
- A new feature (e.g., "core deposit") only touches the domain module
- UI components stay thin and focused on presentation
- Business logic can be tested independently
- Prevents duplication when multiple features need the same logic


### 5. Permissions and Role-Based UI

**Permissions Context:**
```typescript
interface PermissionsContext {
  role: UserRole;
  permissions: Set<Permission>;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (...permissions: Permission[]) => boolean;
}

// Usage in components:
const { hasPermission } = usePermissions();

{hasPermission('apply_discount') && (
  <Button onClick={applyDiscount}>Apply Discount</Button>
)}
```

**Route Guards:**
```typescript
<Route
  path="/admin"
  element={
    <RequirePermission permission="access_admin">
      <AdminPage />
    </RequirePermission>
  }
/>
```

**Navigation Adaptation:**
```typescript
// Navigation items filtered by permissions
const navItems = [
  { path: '/sell', label: 'Sell', icon: ShoppingCart, permission: 'access_sell' },
  { path: '/warehouse', label: 'Warehouse', icon: Package, permission: 'access_warehouse' },
  { path: '/admin', label: 'Admin', icon: Settings, permission: 'access_admin' },
].filter(item => hasPermission(item.permission));
```

**Key Principle:** One screen, different capabilities. Never duplicate screens for different roles.


## Data Models

### Configuration Files

**Environment Variables** (.env.example):
```bash
# API Configuration
API_HOST=localhost
API_PORT=8923
DATABASE_PATH=./data/pos.db

# Store Configuration
STORE_ID=store-001
STORE_NAME="CAPS Edmonton"

# Sync Configuration
SYNC_ENABLED=true
SYNC_INTERVAL_MS=300000  # 5 minutes
REMOTE_STORES=store-002:192.168.1.10:8923

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_LOCAL_PATH=/mnt/backup
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_CREDENTIALS_PATH=./secrets/gdrive-service-account.json

# Security
JWT_SECRET=<generate-random-secret>
DEVICE_CERT_PATH=./certs/device.pem

# Development
NODE_ENV=development
LOG_LEVEL=info
```

### Project Metadata

**package.json** (frontend):
```json
{
  "name": "@caps-pos/frontend",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx}\"",
    "storybook": "storybook dev -p 7946",
    "build-storybook": "storybook build"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.3.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@playwright/test": "^1.40.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0",
    "storybook": "^7.6.0"
  }
}
```


**Cargo.toml** (backend):
```toml
[package]
name = "caps-pos-api"
version = "0.1.0"
edition = "2021"

[dependencies]
actix-web = "4.4"
sqlx = { version = "0.7", features = ["runtime-tokio-native-tls", "sqlite"] }
tokio = { version = "1", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
dotenv = "0.15"
jsonwebtoken = "9.2"
argon2 = "0.5"
chrono = { version = "0.4", features = ["serde"] }
uuid = { version = "1.6", features = ["v4", "serde"] }

[dev-dependencies]
actix-rt = "2.9"
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Since this is foundational infrastructure rather than business logic, our properties focus on structural correctness and consistency.

**Property 1: Module Boundary Integrity**
*For any* feature module, importing code from another feature module (not via common/ or domains/) should fail at build time.
**Validates: Requirements 4.5**

**Property 2: Layout Contract Enforcement**
*For any* page component, attempting to define its own outer grid or layout structure should be prevented by the type system or linting rules.
**Validates: Requirements 3.3**

**Property 3: Design Token Consistency**
*For any* component using spacing or colors, only values from the design token system should be allowed (no arbitrary values like `margin: 17px`).
**Validates: Requirements 3.1**

**Property 4: Permission Check Coverage**
*For any* protected route or action, there must exist a corresponding permission check in the code.
**Validates: Requirements 9.2, 9.3**

**Property 5: Build Reproducibility**
*For any* given commit hash, running the build process twice should produce byte-identical artifacts.
**Validates: Requirements 5.1, 5.2**


## Error Handling

### Frontend Error Boundaries

```typescript
// ErrorBoundary.tsx - catches React errors
class ErrorBoundary extends React.Component {
  // Logs errors, shows fallback UI
  // Prevents entire app crash
}

// Usage: wrap AppShell
<ErrorBoundary>
  <AppShell>
    <Routes />
  </AppShell>
</ErrorBoundary>
```

### API Error Handling

```typescript
// apiClient.ts - centralized error handling
async function apiCall(endpoint: string, options: RequestInit) {
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }
    return response.json();
  } catch (error) {
    // Log to monitoring service
    // Show user-friendly toast
    throw error;
  }
}
```

### Build Error Prevention

- **TypeScript strict mode** catches type errors at compile time
- **ESLint rules** prevent common mistakes (unused vars, missing deps)
- **Pre-commit hooks** block commits with errors
- **CI pipeline** fails on any error (tests, linting, build)

## Testing Strategy

### Unit Tests

**Frontend (Vitest + React Testing Library):**
- Test individual components in isolation
- Test custom hooks
- Test domain logic (cart, pricing, stock engines)
- Mock API calls and external dependencies

**Backend (Cargo test):**
- Test handlers with mock database
- Test database queries
- Test business logic functions
- Test authentication and authorization

**Coverage Target:** 80% for business logic, 60% for UI components


### Integration Tests

**Frontend Integration:**
- Test feature workflows (e.g., add item to cart → apply discount → checkout)
- Use real API calls against test backend
- Test offline behavior (mock network failures)

**Backend Integration:**
- Test API endpoints with real SQLite database (in-memory)
- Test authentication flow
- Test permission checks

### End-to-End Tests (Playwright)

- Test complete user journeys across the full stack
- Test critical paths: login → sell item → payment → receipt
- Test offline mode: disconnect network → continue working → reconnect
- Test role-based access: verify different roles see different UI

### Property-Based Tests

Since this is infrastructure, property tests focus on structural invariants:

**Test 1: Module imports respect boundaries**
- Generate random import statements
- Verify feature-to-feature imports are rejected

**Test 2: Design tokens are used consistently**
- Parse all component files
- Verify no arbitrary spacing/color values

**Test 3: Permission checks exist for protected routes**
- Parse route definitions
- Verify each protected route has a permission check

### Testing Configuration

**vitest.config.ts:**
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['**/*.test.{ts,tsx}', '**/test/**'],
    },
  },
});
```

**playwright.config.ts:**
```typescript
export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:7945',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```


## Implementation Notes

### Development Workflow

1. **Initial Setup:**
   ```bash
   git clone <repo>
   cd caps-pos
   cp .env.example .env
   docker-compose up -d  # Start all services
   cd frontend && npm install
   cd ../backend/rust && cargo build
   ```

2. **Daily Development:**
   ```bash
   # Terminal 1: Frontend dev server
   cd frontend && npm run dev
   
   # Terminal 2: Backend API
   cd backend/rust && cargo watch -x run
   
   # Terminal 3: Run tests on change
   npm run test -- --watch
   ```

3. **Before Committing:**
   - Pre-commit hooks run automatically (format, lint)
   - Run full test suite: `npm test && cargo test`
   - Check coverage: `npm run test:coverage`

### Storybook Workflow

```bash
# Start Storybook
npm run storybook

# Add new component story
# src/common/components/Button.stories.tsx
export default {
  title: 'Components/Button',
  component: Button,
};

export const Primary = {
  args: { variant: 'primary', children: 'Click me' },
};
```

### Adding a New Feature

1. Create feature directory: `src/features/my-feature/`
2. Add components, hooks, pages following the structure
3. Export public API from `index.ts`
4. Add route to `App.tsx`
5. Add navigation item (with permission check)
6. Write tests
7. Document in Storybook if reusable

### Adding a New Domain Module

1. Create domain directory: `src/domains/my-domain/`
2. Implement business logic (pure functions, no React)
3. Create React hooks that use the logic
4. Export types and functions
5. Write unit tests (high coverage for business logic)
6. Document API in JSDoc comments


### Code Quality Enforcement

**ESLint Configuration** (.eslintrc.json):
```json
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "react/prop-types": "off",
    "react-hooks/exhaustive-deps": "error"
  }
}
```

**Prettier Configuration** (.prettierrc):
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

**Husky Pre-commit Hook** (.husky/pre-commit):
```bash
#!/bin/sh
npm run lint
npm run format
npm test -- --run
```

### Performance Considerations

**Frontend:**
- Use React.memo for expensive components
- Virtualize long lists (cart items, product search results)
- Lazy load routes: `const AdminPage = lazy(() => import('./features/admin/pages/AdminPage'))`
- Debounce search inputs
- Use React Query for caching API responses

**Build Optimization:**
- Code splitting by route
- Tree shaking unused code
- Minification and compression
- Asset optimization (images, fonts)

**Bundle Size Targets:**
- Initial bundle: < 200KB gzipped
- Route chunks: < 50KB gzipped each
- Measure with `npm run build -- --analyze`


### Docker Development Environment

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "7945:7945"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:8923

  backend:
    build:
      context: ./backend/rust
      dockerfile: Dockerfile.dev
    ports:
      - "8923:8923"
    volumes:
      - ./backend/rust:/app
      - ./data:/data
    environment:
      - DATABASE_PATH=/data/pos.db
      - RUST_LOG=info

  storybook:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    command: npm run storybook
    ports:
      - "7946:7946"
    volumes:
      - ./frontend:/app
      - /app/node_modules
```

### CI/CD Pipeline

**GitHub Actions** (.github/workflows/ci.yml):
```yaml
name: CI

on: [push, pull_request]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npm test
      - run: cd frontend && npm run build

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      - run: cd backend/rust && cargo fmt -- --check
      - run: cd backend/rust && cargo clippy -- -D warnings
      - run: cd backend/rust && cargo test
      - run: cd backend/rust && cargo build --release

  e2e:
    runs-on: ubuntu-latest
    needs: [frontend, backend]
    steps:
      - uses: actions/checkout@v3
      - run: docker-compose up -d
      - run: cd frontend && npx playwright install
      - run: cd frontend && npm run test:e2e
```


## Security Considerations

### Frontend Security

**Content Security Policy:**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';",
    },
  },
});
```

**Input Sanitization:**
- All user inputs validated on frontend AND backend
- Use TypeScript types to enforce valid data shapes
- Sanitize HTML if displaying user-generated content

**Authentication:**
- JWT tokens stored in httpOnly cookies (not localStorage)
- Tokens expire after 8 hours
- Refresh token mechanism for long sessions

### Build Security

**Dependency Scanning:**
```bash
# Run on every build
npm audit
cargo audit
```

**Secret Management:**
- Never commit secrets to git
- Use .env files (gitignored)
- Use environment variables in production
- Rotate secrets regularly

### Access Control

**Permission System:**
```typescript
enum Permission {
  // Sell module
  ACCESS_SELL = 'access_sell',
  APPLY_DISCOUNT = 'apply_discount',
  OVERRIDE_PRICE = 'override_price',
  PROCESS_RETURN = 'process_return',
  
  // Warehouse module
  ACCESS_WAREHOUSE = 'access_warehouse',
  RECEIVE_STOCK = 'receive_stock',
  ADJUST_INVENTORY = 'adjust_inventory',
  
  // Admin module
  ACCESS_ADMIN = 'access_admin',
  MANAGE_USERS = 'manage_users',
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_AUDIT_LOGS = 'view_audit_logs',
}

enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  CASHIER = 'cashier',
  PARTS_SPECIALIST = 'parts_specialist',
  PAINT_TECH = 'paint_tech',
  INVENTORY_CLERK = 'inventory_clerk',
  SERVICE_TECH = 'service_tech',
}
```


## Deployment Strategy

### Development Environment
- Run locally with `docker-compose up`
- Hot reload for frontend and backend
- Storybook for component development
- Test database with seed data

### Staging Environment
- Deploy to staging server before production
- Use production-like configuration
- Run full test suite including E2E
- Manual QA testing

### Production Deployment
- Build optimized artifacts
- Deploy to on-premise servers at each store
- Use environment variables for configuration
- Run database migrations automatically
- Monitor logs and metrics

### Rollback Plan
- Keep previous version artifacts
- Database migrations must be reversible
- Feature flags for gradual rollout
- Automated health checks

## Monitoring and Observability

### Logging

**Frontend:**
```typescript
// logger.ts
export const logger = {
  info: (message: string, context?: object) => {
    console.log(JSON.stringify({ level: 'info', message, context, timestamp: new Date() }));
  },
  error: (message: string, error?: Error, context?: object) => {
    console.error(JSON.stringify({ level: 'error', message, error: error?.stack, context, timestamp: new Date() }));
  },
};
```

**Backend:**
```rust
// Use tracing crate for structured logging
use tracing::{info, error};

info!(user_id = %user.id, "User logged in");
error!(error = %e, "Database query failed");
```

### Metrics

- API response times (p50, p95, p99)
- Error rates by endpoint
- Active users per store
- Database query performance
- Sync queue size and lag

### Health Checks

```rust
// health endpoint
#[get("/health")]
async fn health() -> impl Responder {
    HttpResponse::Ok().json(json!({
        "status": "healthy",
        "database": check_database().await,
        "sync_queue": check_sync_queue().await,
    }))
}
```


## Documentation Requirements

### Code Documentation

**TypeScript (JSDoc):**
```typescript
/**
 * Calculates the total price for a cart including discounts and taxes.
 * 
 * @param cart - The shopping cart
 * @param customer - Customer for pricing tier lookup
 * @returns Total price breakdown
 * 
 * @example
 * const total = calculateCartTotal(cart, customer);
 * console.log(total.subtotal, total.tax, total.total);
 */
export function calculateCartTotal(cart: Cart, customer: Customer): PriceBreakdown {
  // ...
}
```

**Rust (rustdoc):**
```rust
/// Applies a discount to a cart line item.
///
/// # Arguments
/// * `line_item` - The cart line item to discount
/// * `discount` - The discount to apply
/// * `approver_id` - User ID of the approver (required for discounts > threshold)
///
/// # Returns
/// Updated line item with discount applied
///
/// # Errors
/// Returns `DiscountError::RequiresApproval` if discount exceeds threshold and no approver provided
pub fn apply_discount(
    line_item: &mut LineItem,
    discount: Discount,
    approver_id: Option<UserId>,
) -> Result<(), DiscountError> {
    // ...
}
```

### Architecture Documentation

**docs/architecture/:**
- `overview.md` - High-level system architecture
- `data-flow.md` - How data flows through the system
- `offline-sync.md` - Offline mode and synchronization
- `security.md` - Security model and threat analysis
- `deployment.md` - Deployment procedures

### API Documentation

**docs/api/:**
- OpenAPI/Swagger spec for REST endpoints
- GraphQL schema (if used)
- WebSocket message formats
- Authentication flow diagrams

### User Documentation

**docs/user-guides/:**
- `cashier-guide.md` - How to use the Sell module
- `inventory-guide.md` - Receiving, putaway, transfers
- `admin-guide.md` - System configuration
- `troubleshooting.md` - Common issues and solutions


## Success Criteria

### Technical Success Metrics

1. **Build Performance:**
   - Frontend build completes in < 30 seconds
   - Backend build completes in < 2 minutes
   - Hot reload responds in < 1 second

2. **Code Quality:**
   - Test coverage > 80% for business logic
   - Zero ESLint/clippy warnings
   - All pre-commit hooks pass

3. **Bundle Size:**
   - Initial bundle < 200KB gzipped
   - Route chunks < 50KB gzipped each
   - Lighthouse performance score > 90

4. **Developer Experience:**
   - New developer can set up environment in < 30 minutes
   - Adding a new feature follows clear patterns
   - Storybook documents all reusable components

### Architectural Success Metrics

1. **Module Boundaries:**
   - Zero feature-to-feature imports (enforced by linting)
   - Business logic centralized in domain modules
   - No duplicate implementations

2. **Layout Consistency:**
   - All pages use AppShell
   - All spacing uses design tokens
   - No arbitrary CSS values

3. **Permission System:**
   - All protected routes have permission checks
   - Role-based UI works without screen duplication
   - Unauthorized access properly blocked

4. **Testing:**
   - Unit tests run in < 10 seconds
   - Integration tests run in < 30 seconds
   - E2E tests run in < 5 minutes
   - CI pipeline completes in < 10 minutes

### Maintainability Metrics

1. **Adding a new feature doesn't require touching 10+ files**
2. **Layout never "breaks" because screens follow the contract**
3. **No duplicate settings pages or scattered configuration**
4. **Code reviews focus on business logic, not style issues**

