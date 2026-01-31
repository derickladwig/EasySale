# EasySale — Installation Guide

**Version**: 1.1  
**Last Updated**: 2026-01-30  
**Platforms**: Windows 10/11, Linux, macOS (Docker)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Quick Start (Docker)](#2-quick-start-docker)
3. [Local Development (Windows Native)](#3-local-development-windows-native)
4. [Local Development (Docker)](#4-local-development-docker)
5. [Production Build](#5-production-build)
6. [Environment Configuration](#6-environment-configuration)
7. [Troubleshooting](#7-troubleshooting)
8. [Verification Checklist](#8-verification-checklist)

---

## 1. Prerequisites

### Required Software

| Software | Version | Download | Verify Command |
|----------|---------|----------|----------------|
| **Node.js** | ≥20.0.0 | [nodejs.org](https://nodejs.org/) | `node --version` |
| **npm** | ≥10.0.0 | (included with Node.js) | `npm --version` |
| **Rust** | ≥1.75 | [rustup.rs](https://rustup.rs/) | `rustc --version` |
| **Git** | Any | [git-scm.com](https://git-scm.com/) | `git --version` |

### Optional (for Docker workflow)

| Software | Version | Download |
|----------|---------|----------|
| **Docker Desktop** | ≥20.10 | [docker.com](https://www.docker.com/products/docker-desktop) |

### System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| Disk Space | 10 GB | 20 GB |
| CPU | 2 cores | 4 cores |

---

## 2. Quick Start (Docker)

The fastest way to get EasySale running:

```powershell
# 1. Clone repository
git clone https://github.com/derickladwig/EasySale.git
cd easysale

# 2. Copy environment template
copy .env.example .env

# 3. Start development environment
start-dev.bat

# 4. Wait for services to be ready (1-3 minutes)
# Browser will open automatically to http://localhost:7945
```

**First-Time Setup**: Create your admin account on first launch (minimum 8 character password).

**Access URLs**:
- Frontend: http://localhost:7945
- Backend API: http://localhost:8923
- Health Check: http://localhost:8923/health

---

## 3. Local Development (Windows Native)

For development without Docker:

### Step 1: Clone Repository

```powershell
git clone https://github.com/derickladwig/EasySale.git
cd easysale
```

### Step 2: Environment Configuration

```powershell
copy .env.example .env
# Edit .env with your preferred text editor
```

Key settings to review:
```env
TENANT_ID=default
STORE_ID=store-001
JWT_SECRET=<generate-random-32-char-string>
DATABASE_PATH=./data/pos.db
```

### Step 3: Frontend Setup

```powershell
cd frontend
npm install --legacy-peer-deps
cd ..
```

### Step 4: Backend Setup

```powershell
cd backend
cargo build
cd ..
```

### Step 5: Create Data Directory

```powershell
mkdir data 2>nul
```

### Step 6: Start Development Servers

**Terminal 1 - Backend:**
```powershell
cd backend
cargo run
# Backend runs on http://localhost:8923
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
# Frontend runs on http://localhost:7945
```

### Step 7: Verify Installation

1. Open http://localhost:7945 in browser
2. Complete setup wizard to create admin account
3. Login with your new credentials
4. Check health: http://localhost:8923/health

---

## 4. Local Development (Docker)

### Step 1: Clone Repository

```powershell
git clone https://github.com/derickladwig/EasySale.git
cd easysale
```

### Step 2: Environment Configuration

```powershell
copy .env.example .env
# Edit .env if needed (defaults work for development)
```

### Step 3: Start Development Environment

```powershell
start-dev.bat
```

**Options:**
- `start-dev.bat --no-browser` — Skip auto-opening browser
- `start-dev.bat --storybook` — Also start Storybook on port 7946

### Step 4: Verify Services

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:7945 | Vite dev server with HMR |
| Backend | http://localhost:8923 | Rust debug build |
| Health | http://localhost:8923/health | Health check endpoint |
| Storybook | http://localhost:7946 | Component docs (if enabled) |

### Step 5: View Logs

```powershell
docker-compose -p easysale logs -f           # All services
docker-compose -p easysale logs -f backend   # Backend only
docker-compose -p easysale logs -f frontend  # Frontend only
```

### Step 6: Stop Development Environment

```powershell
stop-dev.bat
```

**Options:**
- `stop-dev.bat --volumes` — Also remove volumes (clean slate)

### Development Features (Docker Mode)

- ✅ Frontend hot-reload (Vite HMR)
- ✅ Backend auto-rebuild on code changes
- ✅ Debug symbols enabled
- ✅ Verbose logging (RUST_LOG=info)
- ✅ Permissive CORS (any origin allowed)
- ✅ Volume mounts for live code changes

---

## 5. Production Build

### Build Variants

| Variant | Command | Features | Binary Size |
|---------|---------|----------|-------------|
| **Lite** | `build-prod.bat --lite` | Core POS only | ~20 MB |
| **Export** | `build-prod.bat --export` | + CSV export (default) | ~25 MB |
| **Full** | `build-prod.bat --full` | + OCR, document processing | ~35 MB |

### Step 1: Build Production Images

```powershell
# Default (export variant)
build-prod.bat

# Or specific variant
build-prod.bat --lite
build-prod.bat --full
```

### Step 2: Start Production Environment

```powershell
start-prod.bat
```

**Options:**
- `start-prod.bat --no-browser` — Skip auto-opening browser

### Step 3: Verify Production Deployment

| Check | URL | Expected |
|-------|-----|----------|
| Frontend | http://localhost:7945 | Login page loads |
| Backend | http://localhost:8923 | API responds |
| Health | http://localhost:8923/health | Returns `{"status":"ok"}` |

### Step 4: Stop Production Environment

```powershell
stop-prod.bat
```

**Options:**
- `stop-prod.bat --volumes` — Remove volumes (⚠️ DATA LOSS!)

### Production Configuration

Edit `.env` before production deployment:

```env
# REQUIRED - Change these!
JWT_SECRET=<generate-random-32-char-string>
STORE_ID=main-store
STORE_NAME="Your Store Name"
TENANT_ID=production

# CORS - Set for production domain
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

---

## 6. Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TENANT_ID` | Unique tenant identifier | `default` |
| `STORE_ID` | Unique store identifier | `store-001` |
| `JWT_SECRET` | Authentication secret (min 32 chars) | `<random-string>` |
| `DATABASE_PATH` | SQLite database path | `./data/pos.db` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_HOST` | Backend host | `localhost` |
| `API_PORT` | Backend port | `8923` |
| `VITE_PORT` | Frontend port | `7945` |
| `RUST_LOG` | Log level | `info` |
| `JWT_EXPIRATION_HOURS` | Token expiration | `8` |

### Generate JWT Secret

```powershell
# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or use OpenSSL
openssl rand -base64 32
```

---

## 7. Troubleshooting

### Port Conflicts

| Error | Solution |
|-------|----------|
| `Port 7945 already in use` | `netstat -ano \| findstr :7945` then `taskkill /PID <pid> /F` |
| `Port 8923 already in use` | `netstat -ano \| findstr :8923` then `taskkill /PID <pid> /F` |

### Docker Issues

| Error | Solution |
|-------|----------|
| `Docker is not running!` | Start Docker Desktop, wait for "Docker Desktop is running" |
| `Cannot connect to Docker daemon` | Restart Docker Desktop, check WSL 2 backend |
| `Image build fails with network error` | Check Docker Desktop network settings, try `docker system prune` |
| `Container exits immediately` | Check logs: `docker-compose -p easysale logs backend` |

### Node/Rust Issues

| Error | Solution |
|-------|----------|
| `npm ERR! engine` | Install Node.js 20+ from nodejs.org |
| `npm peer dependency conflict` | Use `npm install --legacy-peer-deps` |
| `cargo: command not found` | Install Rust from rustup.rs, restart terminal |
| `error[E0658]: edition 2024` | Use Rust nightly: `rustup default nightly` |

### Windows Path Issues

| Error | Solution |
|-------|----------|
| `'npm' is not recognized` | Add Node.js to PATH or reinstall with "Add to PATH" option |
| `'cargo' is not recognized` | Restart terminal after Rust install |
| `CRLF line ending issues` | `git config --global core.autocrlf true` |
| `Long path errors` | `git config --system core.longpaths true` |

### Database Issues

| Error | Solution |
|-------|----------|
| `database is locked` | Stop other processes accessing the database |
| `no such table` | Run migrations: `cargo sqlx migrate run` |
| `SQLX_OFFLINE error` | Run `cargo sqlx prepare --workspace` in backend/ |

### Build Failures

| Error | Solution |
|-------|----------|
| `Frontend build fails` | Delete `node_modules`, run `npm install --legacy-peer-deps` |
| `Backend build fails` | Run `cargo clean`, then `cargo build` |
| `Docker build timeout` | Increase Docker Desktop resources (Memory, CPU) |
| `Out of disk space` | Run `docker system prune -a` |

### Firewall/LAN Access

| Error | Solution |
|-------|----------|
| `Cannot access from other devices` | Configure Windows Firewall to allow ports 7945, 8923 |
| `LAN IP not detected` | Check `ipconfig`, ensure on same network |
| `Connection refused from LAN` | Create `runtime/docker-compose.override.yml` with LAN config |

---

## 8. Verification Checklist

### Environment Setup

- [ ] Node.js ≥20.0.0 installed (`node --version`)
- [ ] npm ≥10.0.0 installed (`npm --version`)
- [ ] Rust ≥1.75 installed (`rustc --version`)
- [ ] Docker ≥20.10 installed (optional) (`docker --version`)
- [ ] Git configured with user name and email

### Repository Setup

- [ ] Repository cloned successfully
- [ ] `.env` file created from `.env.example`
- [ ] Environment variables configured

### Dependencies

- [ ] Frontend dependencies installed (`cd frontend && npm ci`)
- [ ] Backend compiles (`cd backend && cargo build`)

### Services

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Health check passes: `curl http://localhost:8923/health`
- [ ] Login page loads at `http://localhost:7945`
- [ ] Default admin login works

### Network

- [ ] Port 7945 available (frontend)
- [ ] Port 8923 available (backend)
- [ ] Port 7946 available (Storybook, if used)

---

## Common Commands Reference

| Command | Description |
|---------|-------------|
| `start-dev.bat` | Start development environment |
| `stop-dev.bat` | Stop development environment |
| `build-dev.bat` | Rebuild development images |
| `start-prod.bat` | Start production environment |
| `stop-prod.bat` | Stop production environment |
| `build-prod.bat` | Build production images |
| `update-dev.bat` | Update dependencies (dev) |
| `update-prod.bat` | Update dependencies (prod) |
| `docker-clean.bat` | Remove all Docker resources |

---

## Next Steps

After successful installation:

1. **Read the User Guide**: [USER_GUIDE.md](USER_GUIDE.md)
2. **Review Checklists**: [CHECKLISTS.md](CHECKLISTS.md)
3. **Explore the API**: http://localhost:8923/api/capabilities
4. **Configure your store**: Admin → Company & Stores

---

*For additional help, see [Troubleshooting](#7-troubleshooting) or open a [GitHub Issue](https://github.com/derickladwig/EasySale/issues).*
