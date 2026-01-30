# System Architecture Overview

## High-Level Architecture

EasySale is an offline-first, desktop application designed for retail businesses. The architecture prioritizes local-first operation with background synchronization.

```
┌─────────────────────────────────────────────────────────────┐
│                     Store Location                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Desktop Application (Electron)           │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         Frontend (React + TypeScript)           │  │  │
│  │  │  - Touch-optimized UI                           │  │  │
│  │  │  - Role-based navigation                        │  │  │
│  │  │  - Offline-first state management               │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                         ↕                              │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         Backend API (Rust + Actix-web)          │  │  │
│  │  │  - REST API endpoints                           │  │  │
│  │  │  - Business logic                               │  │  │
│  │  │  - Authentication & permissions                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │                         ↕                              │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │         Local Database (SQLite)                 │  │  │
│  │  │  - All operational data                         │  │  │
│  │  │  - Offline-first storage                        │  │  │
│  │  │  - Event log for sync                           │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                         ↕                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         Sync Service (Background Process)             │  │
│  │  - Multi-store replication                            │  │
│  │  - Conflict resolution                                │  │
│  │  - Queue management                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                         ↕ (when online)
┌─────────────────────────────────────────────────────────────┐
│                   Other Store Locations                     │
│              (Same architecture, different data)            │
└─────────────────────────────────────────────────────────────┘
                         ↕ (periodic)
┌─────────────────────────────────────────────────────────────┐
│                   Cloud Backup Storage                      │
│              (Google Drive, network storage)                │
└─────────────────────────────────────────────────────────────┘
```

## Core Principles

### 1. Offline-First
- **All operations work offline**: Sales, returns, inventory, customer management
- **Local database is source of truth**: SQLite stores all operational data
- **Background sync**: Changes replicate to other stores when connectivity available
- **Queue persistence**: Failed syncs retry with exponential backoff

### 2. Role-Based Access
- **7 user roles**: Admin, Manager, Cashier, Parts Specialist, Paint Tech, Inventory Clerk, Service Tech
- **11 permissions**: Granular control over operations
- **Dynamic UI**: Navigation and features adapt to user permissions
- **One screen per feature**: No duplicate screens for different roles

### 3. Multi-Category Inventory
- **Caps**: Search by size, color, brand
- **Auto Parts**: Search by make, model, year, OEM/aftermarket number
- **Paint**: Search by formula, tint code, color matching
- **Equipment**: Search by category, brand, SKU

### 4. Hardware Integration
- **Barcode scanners**: USB/Serial interface
- **Receipt printers**: ESC/POS protocol
- **Label printers**: Zebra ZPL, Brother QL
- **Cash drawers**: RJ11/USB via printer
- **Payment terminals**: PAX, Ingenico, Verifone

## Technology Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite (fast builds, hot reload)
- **Styling**: Tailwind CSS with design tokens
- **State Management**: Zustand (lightweight)
- **Data Fetching**: React Query (caching, offline support)
- **Routing**: React Router v6 with route guards
- **Testing**: Vitest + React Testing Library

### Backend
- **Language**: Rust (performance, safety)
- **Web Framework**: Actix-web (async, fast)
- **Database**: SQLite with sqlx (compile-time checked queries)
- **Authentication**: JWT tokens with Argon2 password hashing
- **Logging**: tracing crate (structured logging)
- **Testing**: Cargo test with mock database

### Desktop Application
- **Runtime**: Electron (cross-platform)
- **OS Support**: Windows, Linux
- **Hardware Access**: Node.js native modules
- **Auto-update**: electron-updater

### Development Tools
- **Version Control**: Git with feature branches
- **CI/CD**: GitHub Actions (test, lint, build, deploy)
- **Containerization**: Docker + docker-compose
- **Code Quality**: ESLint, Prettier, rustfmt, clippy
- **Pre-commit Hooks**: Husky (format, lint)

## System Components

### 1. Frontend Application

**Purpose**: User interface for all POS operations

**Key Features**:
- Touch-optimized UI with large buttons
- Role-based navigation (dynamic menu)
- Offline indicators and sync status
- Real-time barcode scanner input
- Print management (receipts, labels, invoices)

**Architecture**:
- **AppShell**: Top bar + left nav + main workspace + right context panel
- **Feature modules**: Sell, Lookup, Warehouse, Customers, Reporting, Admin
- **Domain modules**: Cart, Pricing, Stock, Auth, Documents
- **Common components**: Design system (buttons, inputs, tables, modals)

### 2. Backend API

**Purpose**: Business logic and data access layer

**Key Features**:
- RESTful API endpoints
- Authentication and authorization
- Database operations (CRUD)
- Business logic (pricing, discounts, inventory)
- Health checks and monitoring

**Architecture**:
- **Handlers**: HTTP request handlers
- **Models**: Data models (User, Product, Transaction)
- **Database**: SQLite access with sqlx
- **Auth**: JWT generation/validation, permission checks
- **Middleware**: Logging, error handling, CORS

### 3. Local Database

**Purpose**: Offline-first data storage

**Key Features**:
- All operational data stored locally
- Event log for synchronization
- Indexes for fast queries
- Foreign key constraints
- Migrations for schema updates

**Schema**:
- **Users & Sessions**: Authentication data
- **Products**: Multi-category inventory
- **Transactions**: Sales, returns, exchanges
- **Customers**: Profiles, loyalty, pricing tiers
- **Inventory**: Stock levels, movements, adjustments
- **Sync Log**: Event sourcing for replication

### 4. Sync Service

**Purpose**: Multi-store data replication

**Key Features**:
- Background synchronization (every 1-5 minutes)
- Conflict resolution (last-write-wins with timestamp + store ID)
- Queue management (pending operations)
- Retry logic (exponential backoff)
- Status monitoring

**Architecture**:
- **Event sourcing**: Append-only log of changes
- **Replication**: Push/pull changes between stores
- **Conflict resolution**: Deterministic algorithm
- **Queue**: Persistent storage of pending operations

### 5. Backup Service

**Purpose**: Data protection and disaster recovery

**Key Features**:
- Daily local backups to network storage
- Weekly cloud backups (Google Drive)
- 30-day local retention, 1-year cloud retention
- Encrypted backups (AES-256)
- Automated restore procedures

## Data Flow

### Transaction Flow (Sell Module)

```
1. Cashier scans barcode or searches product
   ↓
2. Frontend queries local API (GET /products/:id)
   ↓
3. Backend queries SQLite database
   ↓
4. Product data returned to frontend
   ↓
5. Cashier adds to cart (local state)
   ↓
6. Cashier applies discount (permission check)
   ↓
7. Cashier processes payment
   ↓
8. Frontend sends transaction (POST /transactions)
   ↓
9. Backend validates and saves to SQLite
   ↓
10. Backend updates inventory (stock -= quantity)
   ↓
11. Backend logs event for sync
   ↓
12. Frontend prints receipt
   ↓
13. Sync service replicates to other stores (background)
```

### Sync Flow (Multi-Store Replication)

```
1. Store A: Transaction saved to SQLite
   ↓
2. Store A: Event logged in sync_events table
   ↓
3. Sync service: Polls for new events (every 1-5 min)
   ↓
4. Sync service: Pushes events to Store B
   ↓
5. Store B: Receives events, checks for conflicts
   ↓
6. Store B: Applies events to local database
   ↓
7. Store B: Acknowledges receipt
   ↓
8. Store A: Marks events as synced
```

### Offline Flow (Network Outage)

```
1. Network disconnects
   ↓
2. Frontend shows offline indicator
   ↓
3. All operations continue normally (local database)
   ↓
4. Sync service queues events (persistent storage)
   ↓
5. Network reconnects
   ↓
6. Sync service processes queue (retry with backoff)
   ↓
7. Events replicate to other stores
   ↓
8. Frontend shows online indicator
```

## Security Architecture

### Authentication
- **JWT tokens**: 8-hour expiration
- **Password hashing**: Argon2 (industry standard)
- **Session management**: Stored in database, invalidated on logout
- **Token storage**: httpOnly cookies (not localStorage)

### Authorization
- **Role-based**: 7 roles with different permissions
- **Permission checks**: Backend validates all operations
- **Route guards**: Frontend prevents unauthorized access
- **Audit logging**: All sensitive operations logged

### Data Protection
- **Encryption at rest**: SQLite database encrypted with SQLCipher
- **Encryption in transit**: TLS 1.3 for network communication
- **Backup encryption**: AES-256 for backup files
- **Input sanitization**: All user inputs validated and sanitized

### Payment Security
- **PCI DSS compliance**: Use certified payment terminals
- **No card storage**: Never store full card numbers
- **Tokenization**: Use payment processor tokens
- **EMV support**: Chip card processing required

## Performance Characteristics

### Transaction Processing
- **Checkout time**: < 30 seconds (scan to receipt)
- **Product search**: < 1 second for any query
- **Report generation**: < 5 seconds for daily reports

### Database Performance
- **Read queries**: < 100ms for 95th percentile
- **Write operations**: < 50ms for single transaction
- **Concurrent users**: Support 5+ simultaneous users per store

### Sync Performance
- **Sync interval**: Every 1-5 minutes when online
- **Batch size**: 1000 transactions per sync cycle
- **Conflict resolution**: < 1 second per conflict

### Offline Capability
- **Offline duration**: Unlimited (days/weeks if needed)
- **Queue capacity**: 100,000+ pending operations
- **Recovery time**: < 1 hour to sync after extended outage

## Scalability

### Vertical Scaling
- **Store capacity**: 10,000+ products per store
- **Transaction volume**: 1,000+ transactions per day
- **Customer database**: 50,000+ customers per store

### Horizontal Scaling
- **Multi-store**: Support 10+ store locations
- **Sync performance**: Scales linearly with number of stores
- **Backup storage**: Cloud storage scales automatically

## Monitoring and Observability

### Logging
- **Structured logging**: JSON format with context
- **Log levels**: ERROR, WARN, INFO, DEBUG
- **Log rotation**: Daily rotation, 30-day retention
- **Log aggregation**: Centralized logging (future)

### Metrics
- **Transaction times**: Track checkout duration
- **Database performance**: Monitor slow queries
- **Sync status**: Track last sync time per store
- **Hardware status**: Printer, scanner connectivity

### Health Checks
- **API health**: GET /health endpoint
- **Database health**: Connection and query test
- **Sync health**: Queue depth and last sync time
- **Hardware health**: Printer, scanner status

### Alerts
- **Sync failures**: Email/SMS after 3 failed attempts
- **Low stock**: Notify when inventory below reorder point
- **Hardware issues**: Alert on printer/scanner errors
- **Security events**: Failed login attempts, permission violations

## Deployment Architecture

### Development Environment
- **Docker Compose**: 3 services (frontend, backend, storybook)
- **Hot reload**: < 1s frontend, 2-5s backend
- **Test database**: In-memory SQLite with seed data

### Staging Environment
- **Production-like**: Same configuration as production
- **Full test suite**: Unit, integration, E2E tests
- **Manual QA**: Testing before production deployment

### Production Environment
- **On-premise**: Deployed to store servers
- **Automated deployment**: CI/CD pipeline
- **Database migrations**: Run automatically on startup
- **Health monitoring**: Continuous health checks

## Future Enhancements

### Phase 2: Advanced Features
- **E-commerce integration**: WooCommerce, Shopify
- **Accounting integration**: QuickBooks, Xero
- **Parts catalogs**: ACES/PIES standards, OEM APIs

### Phase 3: Analytics
- **Business intelligence**: Sales trends, profitability
- **Predictive analytics**: Demand forecasting, reorder optimization
- **Customer insights**: Purchase patterns, loyalty analysis

### Phase 4: Mobile
- **Mobile app**: iOS/Android for inventory management
- **Tablet POS**: iPad/Android tablet for mobile checkout
- **Mobile payments**: Apple Pay, Google Pay integration

## References

- [Data Flow Documentation](./data-flow.md)
- [Offline Sync Documentation](./offline-sync.md)
- [Security Documentation](./security.md)
- [Database Schema](./database.md)
- [API Documentation](../api/README.md)
