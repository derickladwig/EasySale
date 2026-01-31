# EasySale POS System — Design Specification

**Version**: 1.1  
**Last Updated**: 2026-01-30  
**Status**: Production-Ready Documentation

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module Structure](#2-module-structure)
3. [Data Flows](#3-data-flows)
4. [Authentication & Authorization](#4-authentication--authorization)
5. [Settings Scopes](#5-settings-scopes)
6. [Theming System](#6-theming-system)
7. [Integrations](#7-integrations)
8. [Deployment Model](#8-deployment-model)
9. [Folder Conventions](#9-folder-conventions)

---

## 1. Architecture Overview

### 1.1 Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EasySale POS System                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    PRESENTATION LAYER                                │    │
│  │  Frontend (React 19 + Vite + TypeScript)                            │    │
│  │  - Touch-optimized UI with role-based screens                       │    │
│  │  - Build variants: lite | export | full                             │    │
│  │  - Lazy-loaded routes for code splitting                            │    │
│  │  Port: 7945 (dev) | 80 (prod via nginx)                             │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    BUSINESS LOGIC LAYER                              │    │
│  │  Backend (Rust + Actix-web 4.4)                                     │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │ Workspace Crates:                                            │    │    │
│  │  │ • server (main API)      • pos_core_domain                   │    │    │
│  │  │ • pos_core_models        • pos_core_storage                  │    │    │
│  │  │ • accounting_snapshots   • export_batches                    │    │    │
│  │  │ • capabilities           • csv_export_pack (optional)        │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │  Features: default | export | ocr | document-cleanup | full         │    │
│  │  Port: 8923                                                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                                    ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    DATA LAYER                                        │    │
│  │  SQLite (WAL mode) + Event Sourcing for Sync                        │    │
│  │  - Local-first with offline capability                              │    │
│  │  - Multi-store sync via custom replication                          │    │
│  │  - Automated backups (local + Google Drive)                         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Multi-Store Synchronization

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

### 1.3 Offline-First Design Principles

1. **Local-first operations**: All CRUD operations hit local SQLite first
2. **Async replication**: Background sync process runs every 1-5 minutes
3. **Conflict resolution**: Timestamp + store ID determines winner
4. **Queue persistence**: Failed syncs retry with exponential backoff
5. **Status visibility**: UI shows sync state and pending item count

---

## 2. Module Structure

### 2.1 Frontend Structure

```
frontend/src/
├── App.tsx                    # Main router with all routes
├── AppLayout.tsx              # Main layout wrapper
├── auth/                      # Authentication module
│   └── pages/LoginPage.tsx    # Login flow entry
├── home/                      # Dashboard module
│   └── pages/HomePage.tsx     # Main dashboard
├── sell/                      # Point of Sale module
│   └── pages/SellPage.tsx     # Checkout interface
├── lookup/                    # Product search module
│   └── pages/LookupPage.tsx   # Product browser
├── inventory/                 # Inventory module
│   └── pages/InventoryPage.tsx
├── customers/                 # Customer management
│   └── pages/CustomersPage.tsx
├── preferences/               # User preferences
│   └── pages/PreferencesPage.tsx
├── setup/                     # First-run wizard
│   └── pages/FreshInstallWizard.tsx
├── admin/                     # Admin panel (lazy-loaded)
├── common/                    # Shared components/contexts
│   ├── components/            # Reusable UI components
│   ├── contexts/              # React contexts
│   └── utils/                 # Utility functions
├── config/                    # Configuration providers
│   ├── ConfigProvider.tsx
│   └── ThemeProvider.tsx
└── routes/
    └── lazyRoutes.ts          # Lazy-loaded route definitions
```

### 2.2 Backend Structure

```
backend/crates/
├── server/                    # Main API server
│   ├── src/
│   │   ├── main.rs           # Entrypoint with all routes
│   │   ├── handlers/         # 90+ API handlers
│   │   │   ├── auth.rs       # Authentication
│   │   │   ├── products.rs   # Product CRUD
│   │   │   ├── inventory.rs  # Inventory management
│   │   │   ├── customers.rs  # Customer management
│   │   │   ├── settings.rs   # Settings API
│   │   │   ├── sync.rs       # Synchronization
│   │   │   └── ...
│   │   ├── services/         # Business logic services
│   │   ├── db/               # Database operations
│   │   ├── connectors/       # External integrations
│   │   │   └── quickbooks/   # QuickBooks client
│   │   ├── middleware/       # Auth, permissions, context
│   │   └── models/           # Data models
│   └── migrations/           # SQL migrations
├── pos_core_domain/          # Pure business logic
│   └── src/                  # Pricing, tax, discounts
├── pos_core_models/          # Shared types and traits
├── pos_core_storage/         # Database access layer
├── accounting_snapshots/     # Immutable financial records
├── export_batches/           # Batch management for exports
├── capabilities/             # Feature detection API
└── csv_export_pack/          # CSV export (feature-gated)
```

### 2.3 Build Variants

| Variant | Frontend Flag | Backend Features | Binary Size |
|---------|---------------|------------------|-------------|
| **Lite** | `VITE_BUILD_VARIANT=lite` | (none) | ~20 MB |
| **Export** | `VITE_BUILD_VARIANT=export` | `export` | ~25 MB |
| **Full** | `VITE_BUILD_VARIANT=full` | `full` | ~35 MB |

Frontend feature flags:
- `ENABLE_ADMIN`
- `ENABLE_REPORTING`
- `ENABLE_VENDOR_BILLS`
- `ENABLE_DOCUMENTS`
- `ENABLE_EXPORTS`
- `ENABLE_REVIEW`

---

## 3. Data Flows

### 3.1 Login Flow

```
┌─────────┐    POST /api/auth/login    ┌─────────┐
│ Login   │ ─────────────────────────► │ Backend │
│ Page    │                            │ Auth    │
│         │ ◄───────────────────────── │ Handler │
└─────────┘    JWT Token + User Info   └─────────┘
     │                                      │
     ▼                                      ▼
┌─────────┐                            ┌─────────┐
│ Auth    │                            │ SQLite  │
│ Context │                            │ Users   │
└─────────┘                            └─────────┘
```

### 3.2 Sales Flow

```
┌─────────┐    GET /api/products       ┌─────────┐
│ Sell    │ ─────────────────────────► │ Product │
│ Page    │                            │ Handler │
└─────────┘                            └─────────┘
     │                                      │
     ▼                                      ▼
┌─────────┐    POST /api/sales         ┌─────────┐
│ Cart    │ ─────────────────────────► │ Sales   │
│ Context │                            │ Handler │
└─────────┘                            └─────────┘
     │                                      │
     ▼                                      ▼
┌─────────┐                            ┌─────────┐
│ Receipt │                            │ SQLite  │
│ Print   │                            │ Trans.  │
└─────────┘                            └─────────┘
```

### 3.3 Sync Flow

```
┌─────────┐    POST /api/sync/queue    ┌─────────┐
│ Local   │ ─────────────────────────► │ Sync    │
│ Changes │                            │ Handler │
└─────────┘                            └─────────┘
     │                                      │
     ▼                                      ▼
┌─────────┐                            ┌─────────┐
│ Event   │                            │ Sync    │
│ Log     │                            │ Service │
└─────────┘                            └─────────┘
     │                                      │
     ▼                                      ▼
┌─────────┐    Replicate               ┌─────────┐
│ Remote  │ ◄────────────────────────► │ Remote  │
│ Store A │                            │ Store B │
└─────────┘                            └─────────┘
```

### 3.4 OCR Document Flow (Full Build)

```
┌─────────┐    POST /api/ocr/ingest    ┌─────────┐
│ Upload  │ ─────────────────────────► │ OCR     │
│ Page    │                            │ Ingest  │
└─────────┘                            └─────────┘
     │                                      │
     ▼                                      ▼
┌─────────┐    GET /api/review/cases   ┌─────────┐
│ Review  │ ◄───────────────────────── │ Review  │
│ Queue   │                            │ Handler │
└─────────┘                            └─────────┘
     │                                      │
     ▼                                      ▼
┌─────────┐    POST /api/vendor-bills  ┌─────────┐
│ Approve │ ─────────────────────────► │ Vendor  │
│ Import  │                            │ Bills   │
└─────────┘                            └─────────┘
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Flow

1. User submits credentials (username/password or PIN)
2. Backend validates against stored hash (Argon2)
3. JWT token generated with user info and permissions
4. Token stored in localStorage (frontend)
5. Token included in Authorization header for API calls
6. Token validated by middleware on each request

### 4.2 JWT Token Structure

```json
{
  "sub": "user-uuid",
  "username": "admin",
  "role": "admin",
  "permissions": ["access_sell", "access_inventory", "access_admin"],
  "store_id": "store-001",
  "tenant_id": "default",
  "exp": 1706500000,
  "iat": 1706471200
}
```

### 4.3 Permission System

| Permission | Description |
|------------|-------------|
| `access_sell` | Access POS and product lookup |
| `access_inventory` | Access inventory management |
| `access_admin` | Access admin panel and settings |
| `upload_vendor_bills` | Upload vendor invoices |
| `view_vendor_bills` | View vendor bill history |
| `review_vendor_bills` | Review and approve bills |

### 4.4 Role Definitions

| Role | Permissions |
|------|-------------|
| **Admin** | All permissions |
| **Manager** | access_sell, access_inventory, view_vendor_bills |
| **Cashier** | access_sell |
| **Inventory** | access_inventory, upload_vendor_bills |
| **Viewer** | Read-only access |

---

## 5. Settings Scopes

### 5.1 Configuration Hierarchy

```
1. Environment Variables (.env)
   └── Highest priority, runtime overrides
   
2. Tenant Configuration (configs/private/{tenant_id}.json)
   └── Tenant-specific settings
   
3. Default Configuration (configs/default.json)
   └── Fallback defaults
   
4. Schema Validation (configs/schema.json)
   └── JSON Schema for validation
```

### 5.2 Settings Categories

| Category | Scope | Storage |
|----------|-------|---------|
| **Company Info** | Tenant | Database + Config |
| **Store Info** | Store | Database |
| **Tax Rules** | Tenant | Database |
| **User Preferences** | User | Database |
| **Theme** | User/Tenant | Database |
| **Hardware** | Store | Config |
| **Integrations** | Tenant | Database (encrypted) |
| **Feature Flags** | Tenant | Config |

### 5.3 Settings API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/settings` | GET | Get all settings |
| `/api/settings/{key}` | GET | Get specific setting |
| `/api/settings/{key}` | PUT | Update setting |
| `/api/theme` | GET/PUT | Theme configuration |
| `/api/tenant/setup-status` | GET | Check setup completion |
| `/api/tenant/setup-complete` | POST | Mark setup complete |

---

## 6. Theming System

### 6.1 Theme Structure

```typescript
interface Theme {
  mode: 'light' | 'dark' | 'system';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    error: string;
    warning: string;
    success: string;
  };
  branding: {
    logo: string;
    favicon: string;
    companyName: string;
  };
}
```

### 6.2 Theme Application

1. **ThemeProvider** wraps application
2. Theme loaded from API on startup
3. CSS variables set on `:root`
4. Components use CSS variables
5. Theme changes trigger re-render

### 6.3 CSS Variable Mapping

```css
:root {
  --color-primary: #3b82f6;
  --color-secondary: #6366f1;
  --color-background: #ffffff;
  --color-surface: #f8fafc;
  --color-text: #1e293b;
  /* ... */
}

[data-theme="dark"] {
  --color-background: #0f172a;
  --color-surface: #1e293b;
  --color-text: #f8fafc;
  /* ... */
}
```

---

## 7. Integrations

### 7.1 QuickBooks Integration

```
┌─────────┐    OAuth 2.0              ┌─────────┐
│ EasySale│ ─────────────────────────► │ Intuit  │
│ Backend │                            │ OAuth   │
└─────────┘                            └─────────┘
     │                                      │
     ▼                                      ▼
┌─────────┐    API Calls              ┌─────────┐
│ QBO     │ ─────────────────────────► │ QBO     │
│ Client  │                            │ API     │
└─────────┘                            └─────────┘
```

**Known Issue**: OAuth redirect URI is hardcoded to localhost in development. Production requires `QUICKBOOKS_REDIRECT_URI` environment variable.

### 7.2 WooCommerce Integration

```
┌─────────┐    REST API               ┌─────────┐
│ EasySale│ ─────────────────────────► │ WooComm │
│ Backend │                            │ Store   │
└─────────┘                            └─────────┘
```

- Consumer key/secret authentication
- Product sync (bidirectional)
- Order import

### 7.3 Integration Credentials Storage

- Credentials encrypted with AES-GCM
- Encryption key from `INTEGRATION_ENCRYPTION_KEY` env var
- Stored in database `integration_credentials` table
- Never logged or exposed in API responses

---

## 8. Deployment Model

### 8.1 Development Environment

```yaml
# docker-compose.yml
services:
  frontend:
    build: ./frontend (Dockerfile.dev)
    ports: 7945:7945
    volumes: ./frontend:/app (hot-reload)
    
  backend:
    build: ./backend (Dockerfile.dev)
    ports: 8923:8923
    volumes: ./backend:/app (hot-reload)
    command: cargo run (debug profile)
    
  storybook:
    ports: 7946:7946
    profiles: [storybook]
```

### 8.2 Production Environment

```yaml
# docker-compose.prod.yml
services:
  frontend:
    image: easysale-frontend:latest
    ports: 7945:80 (nginx)
    
  backend:
    image: easysale-backend:latest
    ports: 8923:8923
    volumes:
      - easysale-data:/data
      - ./configs:/app/configs:ro
    healthcheck: wget /health
```

### 8.3 Build Pipeline

```
┌─────────┐    npm install    ┌─────────┐    npm run build    ┌─────────┐
│ Source  │ ────────────────► │ Deps    │ ─────────────────► │ Dist    │
│ Code    │                   │ Install │                     │ Bundle  │
└─────────┘                   └─────────┘                     └─────────┘

┌─────────┐    cargo build    ┌─────────┐    --release        ┌─────────┐
│ Rust    │ ────────────────► │ Debug   │ ─────────────────► │ Release │
│ Source  │                   │ Binary  │                     │ Binary  │
└─────────┘                   └─────────┘                     └─────────┘
```

---

## 9. Folder Conventions

### 9.1 Root Directory

```
easysale/
├── frontend/              # React application
├── backend/               # Rust API server
├── configs/               # Configuration files
│   ├── default.json       # Default config
│   ├── schema.json        # JSON Schema
│   ├── private/           # Tenant configs (gitignored)
│   └── examples/          # Example configs
├── data/                  # Local database (gitignored)
├── docs/                  # Documentation
├── audit/                 # Audit reports
├── ci/                    # CI scripts and tests
├── scripts/               # Utility scripts
├── installer/             # Installation packages
├── spec/                  # This specification
├── .env.example           # Environment template
├── docker-compose.yml     # Development Docker
├── docker-compose.prod.yml # Production Docker
└── *.bat                  # Windows automation scripts
```

### 9.2 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Files (TS)** | kebab-case | `user-profile.tsx` |
| **Files (Rust)** | snake_case | `user_profile.rs` |
| **Components** | PascalCase | `UserProfile.tsx` |
| **Functions (TS)** | camelCase | `getUserProfile()` |
| **Functions (Rust)** | snake_case | `get_user_profile()` |
| **Database tables** | snake_case | `user_profiles` |
| **Constants** | SCREAMING_SNAKE | `MAX_RETRIES` |
| **Environment vars** | SCREAMING_SNAKE | `JWT_SECRET` |

### 9.3 Import Conventions

```typescript
// Frontend imports (order)
import { ... } from 'react';           // 1. React
import { ... } from 'react-router-dom'; // 2. External libs
import { ... } from '@common/...';      // 3. Internal aliases
import { ... } from './...';            // 4. Relative imports
```

```rust
// Backend imports (order)
use std::...;                          // 1. Standard library
use actix_web::...;                    // 2. External crates
use crate::...;                        // 3. Internal modules
```

---

## References

- [Technical Architecture](.kiro/steering/tech.md)
- [Project Structure](.kiro/steering/structure.md)
- [API Documentation](docs/api/README.md)
- [Database Schema](audit/DB_SCHEMA.md)

---

*Document generated from repository audit on 2026-01-29*
