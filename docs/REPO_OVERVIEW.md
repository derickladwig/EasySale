# EasySale Repository Overview

**Last Updated**: 2026-01-29

A high-level overview of the EasySale codebase for new contributors.

---

## What is EasySale?

EasySale is a white-label, multi-tenant point-of-sale system designed for flexibility and offline-first operation. It can be customized for any retail business through JSON configuration files, without code changes.

### Key Characteristics

- **White-Label**: Fully customizable branding, colors, and categories
- **Multi-Tenant**: Isolated data and configuration per business
- **Offline-First**: Full functionality without internet connection
- **Configuration-Driven**: Everything customizable via JSON

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   React + TypeScript + Vite                  │
│                      Port: 7945 (dev)                        │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                        Backend                               │
│                   Rust + Actix-web                           │
│                      Port: 8923                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                       Database                               │
│                   SQLite (embedded)                          │
│                   47 migrations                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

### Core Application

| Directory | Purpose |
|-----------|---------|
| `backend/` | Rust API server (Actix-web) |
| `backend/crates/` | Cargo workspace members |
| `backend/migrations/` | SQLite schema migrations |
| `frontend/` | React TypeScript application |
| `frontend/src/features/` | Feature modules (sell, lookup, etc.) |
| `frontend/src/common/` | Shared components and utilities |

### Configuration

| Directory | Purpose |
|-----------|---------|
| `configs/` | Tenant configuration files |
| `configs/default.json` | Default configuration |
| `configs/private/` | Tenant-specific (gitignored) |
| `.env.example` | Environment variable template |

### Documentation

| Directory | Purpose |
|-----------|---------|
| `docs/` | User and developer documentation |
| `audit/` | Quality assurance reports |
| `memory-bank/` | AI context persistence |
| `.kiro/` | Kiro AI configuration |

### DevOps

| Directory | Purpose |
|-----------|---------|
| `.github/workflows/` | CI/CD pipelines |
| `ci/` | Property tests and CI scripts |
| `installer/` | Windows/Linux installers |
| `archive/` | Historical files (NO DELETES policy) |

---

## Backend Crates

The backend uses a Cargo workspace with multiple crates:

| Crate | Purpose |
|-------|---------|
| `server` | HTTP server, handlers, middleware |
| `pos_core_domain` | Pure business logic (pricing, tax) |
| `pos_core_models` | Shared types and traits |
| `pos_core_storage` | Database access layer |
| `accounting_snapshots` | Immutable financial records |
| `export_batches` | Batch management for exports |
| `capabilities` | Feature detection API |
| `csv_export_pack` | CSV export (feature-gated) |

---

## Key Files

### Entry Points

| File | Purpose |
|------|---------|
| `backend/crates/server/src/main.rs` | Backend entry point |
| `frontend/src/main.tsx` | Frontend entry point |
| `frontend/src/App.tsx` | React app root |

### Configuration

| File | Purpose |
|------|---------|
| `backend/Cargo.toml` | Rust workspace config |
| `frontend/package.json` | Node.js dependencies |
| `docker-compose.yml` | Development Docker config |
| `docker-compose.prod.yml` | Production Docker config |
| `Dockerfile.backend` | Backend container build |
| `frontend/Dockerfile` | Frontend container build |

### Documentation

| File | Purpose |
|------|---------|
| `README.md` | Project overview |
| `START_HERE.md` | Quick start guide |
| `docs/INDEX.md` | Documentation hub |
| `docs/INSTALL.md` | Installation guide |
| `docs/RUNBOOK.md` | Operations guide |

---

## Technology Stack

### Frontend

- **React** 19.2.3 - UI framework
- **TypeScript** 5.9.3 - Type safety
- **Vite** 6.4.1 - Build tool
- **Tailwind CSS** 4.1.18 - Styling
- **React Router** 7.12.0 - Navigation
- **TanStack Query** 5.90.16 - Data fetching
- **Vitest** 4.0.16 - Unit testing
- **Playwright** 1.57.0 - E2E testing

### Backend

- **Rust** 1.75+ - Systems language
- **Actix-web** 4.4 - Web framework
- **SQLx** 0.7 - Database toolkit
- **SQLite** - Embedded database
- **JWT** - Authentication
- **bcrypt** - Password hashing

### DevOps

- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **nginx** - Production web server

---

## API Overview

The backend exposes 150+ REST endpoints. Key categories:

| Category | Base Path | Purpose |
|----------|-----------|---------|
| Auth | `/api/auth/*` | Login, logout, user info |
| Products | `/api/products/*` | Product CRUD, search |
| Customers | `/api/customers/*` | Customer management |
| Inventory | `/api/inventory/*` | Stock management |
| Sales | `/api/sales/*` | Transaction processing |
| Reports | `/api/reports/*` | Analytics and exports |
| Settings | `/api/settings/*` | System configuration |
| Sync | `/api/sync/*` | Multi-store sync |
| Backups | `/api/backups/*` | Backup management |

### Public Endpoints (No Auth)

- `GET /health` - Health check
- `GET /api/capabilities` - Feature detection
- `POST /api/auth/login` - Authentication
- `GET /api/config` - Tenant configuration

---

## Development Workflow

### Making Changes

1. Create feature branch from `develop`
2. Make changes
3. Run tests: `cargo test && npm run test:run`
4. Run linters: `cargo clippy && npm run lint`
5. Create pull request

### Commit Convention

```
type(scope): brief description

feat(products): add bulk import
fix(auth): resolve token expiration
docs(readme): update installation steps
```

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes

---

## Testing

### Backend Tests

```bash
cd backend
cargo test
```

### Frontend Tests

```bash
cd frontend
npm run test:run      # Unit tests
npm run test:e2e      # E2E tests
```

### Property Tests

```bash
cd ci
npm install
npx vitest run
```

---

## Configuration System

EasySale uses a hierarchical configuration system:

1. **Environment Variables** - Highest priority
2. **Private Config** - `configs/private/{tenant}.json`
3. **Default Config** - `configs/default.json`

### Configurable Elements

- Branding (logo, colors, company name)
- Product categories and attributes
- Navigation menus
- Dashboard widgets
- Feature modules (layaway, loyalty, etc.)
- Localization (currency, date format)

---

## Known Limitations

### Production Readiness Gaps

- OAuth redirect URI is hardcoded (see `audit/PRODUCTION_READINESS_GAPS.md`)
- Report export returns placeholder response
- Some frontend features not wired to backend

### Conflicting Documentation

The repo contains conflicting completion claims. See:
- `audit/truth_sync_2026-01-25/` for reconciliation
- `audit/DOCS_VS_CODE_MATRIX.md` for doc-vs-code analysis

---

## Getting Help

- **Installation**: [docs/INSTALL.md](INSTALL.md)
- **Operations**: [docs/RUNBOOK.md](RUNBOOK.md)
- **Commands**: [audit/COMMANDS_FOUND.md](../audit/COMMANDS_FOUND.md)
- **Issues**: [GitHub Issues](https://github.com/derickladwig/EasySale/issues)

---

*This overview is truth-synced against the actual codebase as of 2026-01-29.*
