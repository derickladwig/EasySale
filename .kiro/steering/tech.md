# Technical Architecture — EasySale System

## Technology Stack

### Core Application
- **Frontend**: Electron + React (cross-platform desktop app for Windows/Linux)
- **Backend**: Rust with Actix-web
- **Local Database**: SQLite (offline-first, embedded database)
- **Sync Engine**: Custom replication service for multi-location sync
- **State Management**: React Context API with hooks

### Hardware Integration
- **Barcode Scanners**: USB/Serial interface support
- **Receipt Printers**: ESC/POS protocol (Epson, Star, etc.)
- **Label Printers**: Zebra ZPL or Brother QL series
- **Cash Drawers**: RJ11/USB connection via printer
- **Payment Terminals**: PAX, Ingenico or Verifone integration
- **Touch Screens**: Standard capacitive touch displays

### Data & Sync
- **Local Storage**: SQLite with WAL mode for concurrent access
- **Sync Protocol**: Event sourcing with conflict resolution
- **Backup**: Automated daily backups to network storage and cloud
- **Conflict Resolution**: Last-write-wins with timestamp + store ID

### Integrations
- **Accounting**: QuickBooks API, Xero API
- **E-commerce**: WooCommerce REST API, Shopify API
- **Payment Processing**: Stripe Terminal, Square, or direct terminal integration

### Development Tools
- **Version Control**: Git with feature branch workflow
- **Package Manager**: npm (Node.js), cargo (Rust)
- **Build Tools**: Vite for frontend, cargo for backend
- **Testing**: Vitest for frontend, cargo test for backend
- **Linting**: ESLint/Prettier (JS), rustfmt/clippy (Rust)

## Architecture Overview

### Three-Tier Architecture

#### 1. Presentation Layer (React Desktop App)
- **Touch-optimized UI**: Large buttons, clear typography, responsive layout
- **Role-based screens**: Configurable navigation based on permissions
- **Offline indicators**: Visual status of sync state and pending operations
- **Barcode integration**: Real-time scanner input handling
- **Print management**: Receipt, label and invoice generation
- **Configuration-driven**: All UI elements read from JSON configuration

#### 2. Business Logic Layer (Rust Backend)
- **Transaction processing**: Sales, returns, exchanges, layaways
- **Inventory management**: Stock tracking, serial numbers, batch codes
- **Customer management**: Profiles, loyalty, pricing tiers
- **Financial calculations**: Tax, discounts, profit margins
- **Configuration loading**: Dynamic schema and business rules from config
- **Sync orchestration**: Queue management, conflict resolution

#### 3. Data Layer (SQLite + Sync)
- **Local database**: All operational data stored locally
- **Event log**: Append-only log of all changes for replication
- **Sync queue**: Pending operations when offline
- **Backup system**: Periodic snapshots to network and cloud storage
- **Dynamic schema**: Tables and columns created from configuration

### Offline-First Design Principles

1. **Local-first operations**: All CRUD operations hit local SQLite first
2. **Async replication**: Background sync process runs every 1-5 minutes
3. **Conflict resolution**: Timestamp + store ID determines winner
4. **Queue persistence**: Failed syncs retry with exponential backoff
5. **Status visibility**: UI shows sync state and pending item count

### Multi-Store Synchronization

```
Store A (SQLite) ←→ Sync Service ←→ Store B (SQLite)
                         ↓
                   Central Backup
                   (Cloud Storage)
```

- Each store maintains complete local database
- Sync service replicates changes between stores
- Central backup for disaster recovery
- Stores can operate independently for days if needed

### Configuration System

#### Configuration Files
```
configs/
├── schema.json              # JSON Schema for validation
├── default.json             # Generic defaults
├── private/                 # Tenant-specific (gitignored)
│   └── your-business.json
└── examples/                # Public examples
    ├── retail-store.json
    ├── restaurant.json
    └── service-business.json
```

#### Configuration Loading
1. Backend loads configuration on startup
2. Configuration cached in memory
3. Frontend fetches configuration from API
4. Frontend caches in localStorage for offline access
5. Hot-reload support in development mode

#### Configurable Elements
- **Branding**: Company name, logo, colors, theme
- **Categories**: Product types with custom attributes
- **Navigation**: Menu items, quick actions, permissions
- **Modules**: Enable/disable features (layaway, loyalty, etc.)
- **Widgets**: Dashboard components and reports
- **Database**: Custom tables and columns
- **Localization**: Language, currency, date formats

## Development Environment

### Required Tools
- **Node.js**: v18+ (LTS)
- **Rust**: 1.75+
- **SQLite**: v3.35+ with JSON support
- **Git**: Version control
- **VS Code**: Recommended IDE with extensions:
  - ESLint/Prettier
  - rust-analyzer
  - SQLite Viewer
  - REST Client

### Local Setup
```bash
# Clone repository
git clone <repo-url>
cd EasySale

# Install dependencies
npm install  # Frontend
cd backend/rust && cargo build  # Backend

# Set up local database
npm run db:init  # Creates SQLite schema

# Start development server
npm run dev  # Runs with hot reload

# Run tests
npm test
```

### Environment Variables
```
# .env.example
DB_PATH=./data/pos.db
SYNC_INTERVAL=300000  # 5 minutes in ms
BACKUP_PATH=\\server\backups\pos
CONFIG_PATH=./configs/private/your-business.json
LOG_LEVEL=info
```

## Code Standards

### File Organization
```
src/
├── main/              # Electron main process
├── renderer/          # React UI components
├── config/            # Configuration system
├── database/          # SQLite schema and queries
├── sync/              # Replication engine
├── hardware/          # Printer, scanner drivers
├── integrations/      # External API clients
└── utils/             # Shared utilities
```

### Naming Conventions
- **Files**: `kebab-case.ts` or `snake_case.rs`
- **Components**: `PascalCase.tsx` (React)
- **Functions**: `camelCase()` (TS) or `snake_case()` (Rust)
- **Database tables**: `snake_case` (e.g., `sales_transactions`)
- **Constants**: `SCREAMING_SNAKE_CASE`

### Commit Message Format
```
type(scope): brief description

feat(config): add dynamic category loading
fix(sync): resolve conflict resolution bug
docs(readme): update configuration guide
```

### Code Style
- **TypeScript**: ESLint with recommended config, Prettier formatting
- **Rust**: rustfmt, clippy with strict lints
- **SQL**: Uppercase keywords, snake_case identifiers
- **Comments**: JSDoc/rustdoc for public APIs

### Database Conventions
- **Primary keys**: `id INTEGER PRIMARY KEY AUTOINCREMENT`
- **Timestamps**: `created_at`, `updated_at` (ISO 8601 format)
- **Soft deletes**: `deleted_at` column (NULL = active)
- **Sync metadata**: `sync_version`, `store_id`, `synced_at`
- **Tenant isolation**: `tenant_id` on all tables

## Testing Strategy

### Unit Tests
- **Coverage target**: 80% for business logic
- **Framework**: Vitest (TS), cargo test (Rust)
- **Focus areas**: Calculations, inventory logic, sync algorithms, configuration loading

### Integration Tests
- **Database operations**: Test SQLite queries with test database
- **Hardware mocks**: Simulate printer, scanner responses
- **API integrations**: Use test/sandbox environments
- **Configuration loading**: Test with various config files

### End-to-End Tests
- **Framework**: Playwright
- **Scenarios**: Complete sale, return, inventory receive, sync, configuration changes
- **Offline testing**: Simulate network failures

### Performance Tests
- **Transaction speed**: < 30 seconds from scan to receipt
- **Database queries**: < 100ms for common operations
- **Sync performance**: 1000 transactions sync in < 5 minutes
- **Configuration loading**: < 100ms

## Deployment Process

### Build & Package
```bash
# Build production app
npm run build

# Package for Windows
npm run package:win

# Package for Linux
npm run package:linux

# Create installer
npm run make
```

### Installation
1. Run installer on store PC
2. Configure store ID and network settings
3. Place configuration file in configs/private/
4. Initialize local database
5. Set up hardware (printers, scanners)
6. Test offline operation
7. Enable sync to other stores

### Updates
- **Auto-update**: Electron auto-updater for minor updates
- **Manual updates**: Major versions require installer
- **Database migrations**: Automatic schema updates on launch
- **Configuration updates**: Hot-reload in development, restart in production

### Backup Strategy
- **Local backups**: Daily SQLite backup to network drive
- **Cloud backups**: Weekly full backup to cloud storage
- **Retention**: 30 days local, 1 year cloud

## Performance Requirements

### Transaction Processing
- **Checkout time**: < 30 seconds (scan to receipt)
- **Product search**: < 1 second for any query
- **Report generation**: < 5 seconds for daily reports
- **Configuration loading**: < 100ms

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

## Security Considerations

### Data Protection
- **Encryption at rest**: SQLite database encrypted with SQLCipher
- **Encryption in transit**: TLS 1.3 for all network communication
- **Backup encryption**: AES-256 for backup files
- **Configuration security**: Private configs excluded from version control

### Access Control
- **Authentication**: PIN or password per user
- **Authorization**: Role-based permissions (RBAC)
- **Session management**: Auto-logout after inactivity
- **Audit logging**: All sensitive operations logged

### Payment Security
- **PCI DSS compliance**: Use certified payment terminals
- **No card storage**: Never store full card numbers
- **Tokenization**: Use payment processor tokens
- **EMV support**: Chip card processing required

### Multi-Tenant Security
- **Data isolation**: Tenant ID on all tables
- **Configuration isolation**: Separate config files per tenant
- **No cross-tenant queries**: Enforced at database layer
- **Audit trails**: Per-tenant audit logs

## Monitoring & Logging

### Application Logs
- **Log levels**: ERROR, WARN, INFO, DEBUG
- **Log rotation**: Daily rotation, 30-day retention
- **Log location**: `./logs/pos-YYYY-MM-DD.log`

### Sync Monitoring
- **Sync status**: Track last sync time per store
- **Conflict count**: Monitor conflict resolution frequency
- **Queue depth**: Alert if queue exceeds threshold

### Performance Metrics
- **Transaction times**: Track checkout duration
- **Database performance**: Monitor slow queries
- **Hardware status**: Printer, scanner connectivity
- **Configuration load time**: Track config loading performance

### Alerts
- **Sync failures**: Email/SMS after 3 failed attempts
- **Low stock**: Notify when inventory below reorder point
- **Hardware issues**: Alert on printer/scanner errors
- **Security events**: Failed login attempts, permission violations
- **Configuration errors**: Invalid config file detected

---

## [2026-01-25] Steering Truth Sync — Feature & Change Reconciliation (Insert-Only)

This addendum records evidence-backed changes discovered during an insert-only truth-sync pass. It **does not delete** or rewrite earlier content.

### Constraints / policies (preserve)
- **NO DELETES**: preserve history; quarantine by moving + mapping only (Source: `archive/ARCHIVE_POLICY.md` → “Non-negotiables for quarantining code”; also echoed in `.kiro/specs/production-readiness-windows-installer/tasks.md` → “Policy: NO DELETES”).
- **Evidence-first status**: treat audits/logs as authoritative evidence when completion claims conflict (Sources: `audit/PRODUCTION_READINESS_GAPS.md`, `audit/DOCS_VS_CODE_MATRIX.md`, `PROD_READINESS_INFO_PACK.md`).

### Production readiness truth (evidence-based)
- The repo contains contradictory “production ready” claims. Treat “production ready” as **gated** by: no routed-page mock data, no stub endpoints presented as real features, no hardcoded OAuth redirect URIs (Source: `audit/CONSOLIDATION_PLAN.md` → “Production ready label gate”; see `audit/PRODUCTION_READINESS_GAPS.md`).

### Verified technical gaps (do not overwrite; record as known issues)
- **Hardcoded QuickBooks OAuth redirect URI** (localhost): `backend/crates/server/src/handlers/integrations.rs` → `// TODO: Get redirect_uri from config or environment` + hardcoded `http://localhost:7945/api/integrations/quickbooks/callback`.
- **Report export stub**: `backend/crates/server/src/handlers/reporting.rs` → `POST /api/reports/export` returns placeholder “Export functionality coming soon”.
- **Reporting SQL injection risk**: `backend/crates/server/src/handlers/reporting.rs` builds SQL with `format!(" ... '{}' ", ...)` for query params.
- **Backend startup default fallbacks**: `backend/crates/server/src/main.rs` uses `STORE_ID`/`TENANT_ID` defaults (`default-store`, `tenant_default`) and includes a TODO indicating these should come from config/env.

### Conflicts recorded (preserved for confirmation)
- **Fresh install wiring**: some docs claim fresh install routes are commented out, while code shows them wired (Sources: `PROD_READINESS_INFO_PACK.md`; Verified: `frontend/src/App.tsx`, `backend/crates/server/src/main.rs`).

### Pointer
- Truth-sync audit package: `audit/truth_sync_2026-01-25/*`

---

## [2026-01-30] Technical Status Update — Code Review Fixes Applied

### Issues Resolved from 2026-01-25 Audit

#### Hardcoded QuickBooks OAuth redirect URI [FIXED]
- **Previous**: Hardcoded `http://localhost:7945/api/integrations/quickbooks/callback`
- **Current**: Now reads from `QUICKBOOKS_REDIRECT_URI` environment variable
- **Validation**: Production builds reject localhost URIs (`cfg!(not(debug_assertions))` check)
- Location: `backend/crates/server/src/handlers/integrations.rs` lines 191-196

#### Report export stub [FIXED]
- **Previous**: Returned placeholder "Export functionality coming soon"
- **Current**: Fully implemented CSV export with:
  - Parameterized queries via `QueryBuilder`
  - Tenant isolation (`tenant_id` filtering)
  - CSV injection prevention (`escape_csv_value()` function)
- Location: `backend/crates/server/src/handlers/reporting.rs`

#### Reporting SQL injection risk [FIXED]
- **Previous**: Some queries used `format!()` for SQL construction
- **Current**: All queries use `QueryBuilder` with `push_bind()` for parameterized queries
- All 11 reporting endpoints updated with proper parameterization

#### Backend startup defaults [DOCUMENTED]
- Default `STORE_ID`/`TENANT_ID` values are intentional for development/demo
- Production profile (`prod.toml`) requires explicit configuration
- Profile system validates secrets and rejects placeholders in production

### Security Improvements Applied

| Issue | Status | Fix |
|-------|--------|-----|
| Hardcoded OAuth URI | ✅ Fixed | Environment variable + validation |
| SQL injection in reports | ✅ Fixed | QueryBuilder parameterization |
| Missing tenant isolation | ✅ Fixed | tenant_id on all report queries |
| CSV injection | ✅ Fixed | escape_csv_value() function |
| Hardcoded Tailwind colors | ✅ Fixed | Semantic tokens in LoginPage |
| Stub report endpoints | ✅ Fixed | work_orders, promotions implemented |

### Fresh Install Wiring [CONFIRMED WORKING]
- Fresh install routes are properly wired in `frontend/src/App.tsx`
- Setup wizard accessible at `/fresh-install`
- Backend tenant operations endpoint functional
- Setup completion properly tracked in settings table
