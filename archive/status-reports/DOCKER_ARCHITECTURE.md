# EasySale Docker Architecture

## Overview
This document provides a visual representation of the EasySale Docker architecture with standardized naming.

## Development Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                      EasySale-network (bridge)                  │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ EasySale-frontend-dev│  │ EasySale-backend-dev │           │
│  │                      │  │                      │           │
│  │  Node 22 Alpine      │  │  Rust Nightly        │           │
│  │  Vite Dev Server     │  │  Cargo Run           │           │
│  │  Port: 7945          │  │  Port: 8923          │           │
│  │                      │  │                      │           │
│  └──────────┬───────────┘  └──────────┬───────────┘           │
│             │                          │                        │
│             │                          │                        │
│  ┌──────────▼───────────┐  ┌──────────▼───────────┐           │
│  │ EasySale-frontend-   │  │ EasySale-data-dev    │           │
│  │ modules (volume)     │  │ (volume)             │           │
│  └──────────────────────┘  │ /data/EasySale.db    │           │
│                             └──────────────────────┘           │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ EasySale-cargo-      │  │ EasySale-cargo-git   │           │
│  │ registry (volume)    │  │ (volume)             │           │
│  └──────────────────────┘  └──────────────────────┘           │
│                                                                 │
│  ┌──────────────────────┐                                      │
│  │ EasySale-target      │                                      │
│  │ (volume)             │                                      │
│  └──────────────────────┘                                      │
│                                                                 │
│  ┌──────────────────────┐                                      │
│  │ EasySale-storybook-  │                                      │
│  │ dev (optional)       │                                      │
│  │  Port: 7946          │                                      │
│  └──────────────────────┘                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                      EasySale-network (bridge)                  │
│                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐           │
│  │ EasySale-frontend    │  │ EasySale-backend     │           │
│  │                      │  │                      │           │
│  │  Nginx Alpine        │  │  Rust Alpine         │           │
│  │  Static Files        │  │  Binary: EasySale-api│           │
│  │  Port: 7945 (80)     │  │  Port: 8923          │           │
│  │                      │  │                      │           │
│  │  Health: /           │  │  Health: /health     │           │
│  └──────────────────────┘  └──────────┬───────────┘           │
│                                        │                        │
│                                        │                        │
│                             ┌──────────▼───────────┐           │
│                             │ EasySale-data        │           │
│                             │ (volume)             │           │
│                             │ /data/EasySale.db    │           │
│                             └──────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## Image Build Process

```
Development:
┌─────────────────┐
│ Source Code     │
│ ./frontend      │
│ ./backend/rust  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dockerfile.dev  │
│ - Hot reload    │
│ - Dev tools     │
│ - Volume mounts │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dev Containers  │
│ EasySale-*-dev  │
└─────────────────┘

Production:
┌─────────────────┐
│ Source Code     │
│ ./frontend      │
│ ./backend/rust  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Dockerfile      │
│ Multi-stage     │
│ - Build stage   │
│ - Runtime stage │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Images          │
│ EasySale-*:     │
│ latest          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Prod Containers │
│ EasySale-*      │
└─────────────────┘
```

## Volume Mapping

### Development Volumes
```
EasySale-frontend-modules
├── Purpose: Node.js dependencies cache
├── Mount: /app/node_modules
└── Shared: frontend, storybook

EasySale-data-dev
├── Purpose: SQLite database (development)
├── Mount: /data
└── File: EasySale.db

EasySale-cargo-registry
├── Purpose: Rust crate registry cache
├── Mount: /usr/local/cargo/registry
└── Speeds up: cargo build

EasySale-cargo-git
├── Purpose: Rust git dependencies cache
├── Mount: /usr/local/cargo/git
└── Speeds up: cargo build

EasySale-target
├── Purpose: Rust build artifacts
├── Mount: /app/target
└── Speeds up: cargo build
```

### Production Volumes
```
EasySale-data
├── Purpose: SQLite database (production)
├── Mount: /data
├── File: EasySale.db
└── Backup: Required for data persistence
```

## Network Communication

```
External Access:
┌─────────────────┐
│ Browser/Client  │
└────────┬────────┘
         │
         ├─────────────────────┐
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ localhost:7945  │   │ localhost:8923  │
│ (Frontend)      │   │ (Backend API)   │
└────────┬────────┘   └────────┬────────┘
         │                     │
         │  EasySale-network   │
         │                     │
         ▼                     ▼
┌─────────────────┐   ┌─────────────────┐
│ EasySale-       │   │ EasySale-       │
│ frontend[-dev]  │───│ backend[-dev]   │
│                 │   │                 │
│ Internal:       │   │ Internal:       │
│ http://backend: │   │ http://backend: │
│ 8923            │   │ 8923            │
└─────────────────┘   └─────────────────┘
```

## Script Workflow

### Development Start (docker-start.bat/sh)
```
1. Check Docker status
2. Verify configuration files
3. Clean up legacy resources
4. Create .env files if needed
5. Check port availability
6. Start services:
   docker-compose -p EasySale up --build
```

### Production Build (build-prod.bat/sh)
```
1. Check Docker status
2. Verify configuration files
3. Clean up legacy resources
4. Ensure network exists
5. Build frontend image:
   docker build -t EasySale-frontend:latest ./frontend
6. Build backend image:
   docker build -t EasySale-backend:latest ./backend/rust
7. Stop existing containers
8. Start production:
   docker-compose -p EasySale -f docker-compose.prod.yml up -d
9. Wait for health checks
```

### Stop Services (docker-stop.bat/sh)
```
1. Check Docker status
2. Stop all EasySale containers:
   docker-compose -p EasySale down --remove-orphans
   docker-compose -p EasySale -f docker-compose.prod.yml down
3. Remove orphaned containers
```

### Clean All (docker-clean.bat/sh)
```
1. Confirm with user
2. Stop all containers
3. Remove EasySale volumes
4. Remove legacy resources
5. Remove images
6. Prune build cache
7. Remove networks
```

## Naming Convention Rules

### Pattern
```
EasySale-{component}[-environment]
```

### Components
- `frontend` - React/Vite application
- `backend` - Rust API server
- `storybook` - Component documentation
- `data` - SQLite database volume
- `frontend-modules` - Node.js dependencies
- `cargo-registry` - Rust crate cache
- `cargo-git` - Rust git dependencies
- `target` - Rust build artifacts
- `network` - Docker network

### Environments
- `-dev` - Development environment
- (none) - Production environment

### Examples
```
Development:
- EasySale-frontend-dev
- EasySale-backend-dev
- EasySale-data-dev

Production:
- EasySale-frontend
- EasySale-backend
- EasySale-data

Shared:
- EasySale-network
- EasySale-frontend-modules
- EasySale-cargo-registry
```

## Port Assignments

| Service | Port | Environment | Protocol |
|---------|------|-------------|----------|
| Frontend | 7945 | Dev & Prod | HTTP |
| Backend | 8923 | Dev & Prod | HTTP |
| Storybook | 7946 | Dev only | HTTP |

## Health Checks

### Backend
```
Endpoint: http://localhost:8923/health
Interval: 30s
Timeout: 3s
Retries: 3
Start Period: 15s
```

### Frontend (Production)
```
Endpoint: http://localhost:7945/
Interval: 30s
Timeout: 3s
Retries: 3
Start Period: 10s
```

## Environment Variables

### Backend
```
DATABASE_PATH=/data/EasySale.db
RUST_LOG=info
API_HOST=0.0.0.0
API_PORT=8923
JWT_SECRET=<secret>
STORE_ID=store-001
STORE_NAME="Main Store"
```

### Frontend
```
VITE_API_URL=http://localhost:8923
NODE_ENV=development|production
```

## Summary

All Docker resources follow the `EasySale-` naming convention:
- ✅ Consistent across all environments
- ✅ Easy to identify and manage
- ✅ Automated legacy cleanup
- ✅ Clear separation of dev/prod
- ✅ Documented and standardized
