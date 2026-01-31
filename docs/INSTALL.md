# EasySale Installation Guide

**Last Updated**: 2026-01-29

This guide provides step-by-step instructions for installing and running EasySale.

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | ≥20.0.0 | Frontend build and development |
| npm | ≥10.0.0 | Package management |
| Rust | ≥1.75 | Backend compilation |
| Docker | ≥20.10 | Containerized deployment (optional) |

### Verify Prerequisites

```bash
# Check Node.js
node --version
# Expected: v20.x.x or higher

# Check npm
npm --version
# Expected: 10.x.x or higher

# Check Rust
rustc --version
# Expected: rustc 1.75.x or higher

# Check Docker (optional)
docker --version
# Expected: Docker version 20.10.x or higher
```

---

## Build Times

Approximate times on modern hardware (8-core CPU, 16GB RAM):

| Build Type | First Build | Cached/Incremental |
|------------|-------------|-------------------|
| Docker Production | 10-20 minutes | 2-5 minutes |
| Local Rust | 3-6 minutes | 10-30 seconds |
| Frontend | 30-60 seconds | 5-10 seconds |

**Fresh Install Total**: ~20-30 minutes (first time with Docker)

> **Note**: First-time Docker builds download dependencies and compile from scratch. Subsequent builds are significantly faster due to caching.

---

## Quick Start (Docker - Recommended)

The fastest way to get EasySale running is with Docker.

### Windows (PowerShell)

```powershell
# 1. Clone the repository
git clone https://github.com/derickladwig/EasySale.git
cd EasySale

# 2. Copy environment template
Copy-Item .env.example .env

# 3. Build and start
.\build-prod.bat
```

### Linux/Mac (Bash)

```bash
# 1. Clone the repository
git clone https://github.com/derickladwig/EasySale.git
cd EasySale

# 2. Copy environment template
cp .env.example .env

# 3. Build and start
./build-prod.sh
```

### Access the Application

After successful startup:
- **Frontend**: http://localhost:7945
- **Backend API**: http://localhost:8923
- **Health Check**: http://localhost:8923/health

### Initial Setup

On first launch, you'll be prompted to create an admin account:
- **Username**: Choose your admin username
- **Password**: Choose a secure password (minimum 8 characters)

✅ **No default passwords** - you set your own credentials during setup.**

---

## Local Development Setup

For development without Docker.

### Step 1: Clone and Configure

```bash
# Clone repository
git clone https://github.com/derickladwig/EasySale.git
cd EasySale

# Copy environment template
cp .env.example .env
```

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install
# or if you encounter peer dependency issues:
npm ci --legacy-peer-deps
cd ..
```

### Step 3: Build Backend

```bash
cd backend
cargo build
cd ..
```

### Step 4: Start Services

Open two terminal windows:

**Terminal 1 - Backend:**
```bash
cd backend
cargo run
```

Wait for: `Starting EasySale API server...`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Wait for: `VITE ready in XXXms`

### Step 5: Access Application

- **Frontend**: http://localhost:7945
- **Backend**: http://localhost:8923

---

## Database Setup

EasySale uses SQLite with automatic migrations.

### Automatic Setup

The database is created automatically on first run:
- **Local**: `./data/pos.db`
- **Docker**: `/data/EasySale.db`

### Manual Database Location

Set via environment variable:
```bash
DATABASE_PATH=./data/my-database.db
```

### Migrations

Migrations run automatically on server startup. To verify:
```bash
cd backend
cargo run -- verify-snapshots
```

---

## Environment Configuration

### Required Variables (Production)

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | Authentication secret (min 32 chars) | `openssl rand -base64 32` |
| `STORE_ID` | Unique store identifier | `store-001` |
| `TENANT_ID` | Multi-tenant identifier | `default` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_PATH` | `./data/pos.db` | SQLite database path |
| `API_HOST` | `0.0.0.0` | Server bind address |
| `API_PORT` | `8923` | Server port |
| `RUST_LOG` | `info` | Log level (error/warn/info/debug) |
| `VITE_API_URL` | (auto) | Frontend API URL override |

### Generate Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Or on Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## Windows-Specific Notes

### PowerShell Execution Policy

If scripts fail to run:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Path Separators

Use backslashes in Windows paths:
```powershell
$env:DATABASE_PATH = ".\data\pos.db"
```

### WSL Alternative

For a Linux-like experience on Windows:
1. Install WSL: `wsl --install`
2. Follow Linux instructions inside WSL

---

## Docker Development Environment

For development with hot-reload:

```bash
# Start development containers
docker-compose -p easysale up --build

# Or in detached mode
docker-compose -p easysale up -d --build

# View logs
docker-compose -p easysale logs -f

# Stop
docker-compose -p easysale down
```

### Storybook (Optional)

```bash
# Start with Storybook profile
docker-compose -p easysale --profile storybook up --build
```

Access Storybook at http://localhost:7946

---

## Verification

### Health Check

```bash
# Backend health
curl http://localhost:8923/health
# Expected: {"status":"healthy",...}

# Capabilities
curl http://localhost:8923/api/capabilities
# Expected: {"accounting_mode":"disabled",...}
```

### Frontend Check

Open http://localhost:7945 in a browser. You should see the login page.

### Test Login

1. Navigate to http://localhost:7945
2. On first launch, complete the setup wizard to create your admin account
3. Enter the username and password you created
4. Click Login

---

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 8923
# Linux/Mac
lsof -i :8923
# Windows
netstat -ano | findstr :8923

# Kill process (replace PID)
# Linux/Mac
kill -9 <PID>
# Windows
taskkill /PID <PID> /F
```

### Database Locked

If you see "database is locked" errors:
1. Stop all EasySale processes
2. Delete `pos.db-shm` and `pos.db-wal` files
3. Restart the backend

### Docker Build Fails

```bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker build --no-cache -t EasySale-backend:latest -f Dockerfile.backend .
```

### Frontend Dependencies Fail

```bash
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

---

## Next Steps

- [RUNBOOK.md](RUNBOOK.md) - Day-to-day operations
- [../README.md](../README.md) - Project overview
- [../configs/README.md](../configs/README.md) - Configuration guide

---

*For additional help, see [GitHub Issues](https://github.com/derickladwig/EasySale/issues)*
