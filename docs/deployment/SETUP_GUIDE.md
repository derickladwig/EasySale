# EasySale - Fresh Install Setup Guide

**Last Updated:** 2026-01-17  
**Version:** 1.0.0

This guide will help you set up EasySale from scratch on any machine.

## Prerequisites

### Required Software
- **Node.js** v18+ (LTS recommended)
- **Rust** 1.75+ with Cargo
- **Git** (for cloning the repository)

### Optional Software
- **Docker Desktop** (for containerized deployment)
- **VS Code** (recommended IDE)

## Quick Start (5 Minutes)

### Windows

```cmd
# 1. Clone the repository
git clone <repository-url>
cd EasySale

# 2. Run setup script
setup.bat

# 3. Start backend (in one terminal)
start-backend.bat

# 4. Start frontend (in another terminal)
start-frontend.bat

# 5. Open browser
http://localhost:7945
```

### Linux/Mac

```bash
# 1. Clone the repository
git clone <repository-url>
cd EasySale

# 2. Run setup script
chmod +x setup.sh
./setup.sh

# 3. Start backend (in one terminal)
./start-backend.sh

# 4. Start frontend (in another terminal)
./start-frontend.sh

# 5. Open browser
http://localhost:7945
```

## Default Credentials

- **Username:** `admin`
- **Password:** `admin123`
- **Tenant:** `default-tenant`

⚠️ **IMPORTANT:** Change the admin password after first login in production!

## Manual Setup (If Scripts Fail)

### Step 1: Install Dependencies

#### Install Node.js
- **Windows:** Download from https://nodejs.org/
- **Linux:** `sudo apt install nodejs npm` or `sudo yum install nodejs npm`
- **Mac:** `brew install node`

#### Install Rust
```bash
# All platforms
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Step 2: Configure Environment

#### Create Root .env File
```bash
# Copy template
cp .env.example .env

# Edit .env and ensure these values:
TENANT_ID=default-tenant
API_PORT=8923
VITE_PORT=7945
VITE_API_URL=http://localhost:8923
```

#### Create Backend .env File
```bash
# Copy template
cp backend/.env.example backend/.env

# Edit backend/.env and ensure:
TENANT_ID=default-tenant
API_PORT=8923
```

### Step 3: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### Step 4: Build Backend (First Time)
```bash
cd backend
cargo build
cd ..
```

### Step 5: Start Services

#### Terminal 1 - Backend
```bash
# Windows
start-backend.bat

# Linux/Mac
./start-backend.sh
```

#### Terminal 2 - Frontend
```bash
# Windows
start-frontend.bat

# Linux/Mac
./start-frontend.sh
```

### Step 6: Access Application
Open your browser to: http://localhost:7945

## Docker Setup (Alternative)

### Prerequisites
- Docker Desktop installed and running

### Quick Start
```bash
# Windows
docker-start.bat

# Linux/Mac
./docker-start.sh
```

### Access
- **Frontend:** http://localhost:7945
- **Backend API:** http://localhost:8923

## Network Access (Multiple Devices)

To access EasySale from other devices on your network:

### Find Your IP Address

#### Windows
```cmd
ipconfig
# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

#### Linux/Mac
```bash
ifconfig
# or
ip addr show
# Look for inet address under your active network interface
# Example: 192.168.1.100
```

### Access from Other Devices
Replace `localhost` with your IP address:
- **From same network:** `http://192.168.1.100:7945`
- **From same machine:** `http://localhost:7945`

The CORS configuration automatically allows all local network IPs (192.168.x.x, 10.x.x.x, 172.x.x.x).

## Troubleshooting

### Port Already in Use

#### Check What's Using the Port
```bash
# Windows
netstat -ano | findstr :7945
netstat -ano | findstr :8923

# Linux/Mac
lsof -i :7945
lsof -i :8923
```

#### Kill Process Using Port
```bash
# Windows
kill-ports.bat

# Linux/Mac
kill -9 <PID>
```

### CORS Errors

If you see CORS errors in the browser console:

1. **Check backend is running** on port 8923
2. **Verify TENANT_ID** matches in both .env files
3. **Restart backend** after changing .env
4. **Clear browser cache** and reload

### Database Errors

If you see "user not found" or tenant errors:

1. **Check TENANT_ID** in both .env files:
   - Root `.env`: `TENANT_ID=default-tenant`
   - Backend `backend/.env`: `TENANT_ID=default-tenant`

2. **Delete and recreate database:**
   ```bash
   # Stop backend
   # Delete database
   rm -rf data/pos.db
   # Restart backend (will recreate with migrations)
   ```

### Rust Compilation Errors

If cargo build fails:

1. **Update Rust:**
   ```bash
   rustup update
   ```

2. **Clean build cache:**
   ```bash
   cd backend
   cargo clean
   cargo build
   ```

### Frontend Build Errors

If npm install or dev server fails:

1. **Clear npm cache:**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node version:**
   ```bash
   node --version
   # Should be v18 or higher
   ```

## Configuration

### Changing Ports

Edit `.env` file:
```bash
# Backend port
API_PORT=8923

# Frontend port
VITE_PORT=7945

# Update frontend API URL to match backend port
VITE_API_URL=http://localhost:8923
```

### Multi-Tenant Setup

To run multiple tenants:

1. **Create tenant-specific .env:**
   ```bash
   cp .env .env.tenant1
   ```

2. **Edit tenant configuration:**
   ```bash
   # .env.tenant1
   TENANT_ID=tenant1
   API_PORT=8924
   VITE_PORT=7946
   ```

3. **Start with specific .env:**
   ```bash
   # Load tenant1 config
   export $(cat .env.tenant1 | xargs)
   ./start-backend.sh
   ```

## Production Deployment

### Security Checklist

- [ ] Change default admin password
- [ ] Generate new JWT_SECRET
- [ ] Set strong database password
- [ ] Configure HTTPS/TLS
- [ ] Restrict CORS to specific domains
- [ ] Enable firewall rules
- [ ] Set up automated backups
- [ ] Configure monitoring/logging

### Environment Variables for Production

```bash
# .env (production)
NODE_ENV=production
TENANT_ID=your-company-name
JWT_SECRET=<generate-with-openssl-rand-base64-32>
API_HOST=0.0.0.0
API_PORT=8923
DATABASE_PATH=/var/lib/EasySale/pos.db
BACKUP_ENABLED=true
BACKUP_LOCAL_PATH=/var/backups/EasySale
```

### Build for Production

```bash
# Frontend
cd frontend
npm run build
# Output: frontend/dist/

# Backend
cd backend
cargo build --release --bin EasySale-server
# Output: backend/target/release/EasySale-server
```

## Getting Help

### Documentation
- **README.md** - Project overview
- **QUICK_START.md** - Quick reference
- **tech.md** - Technical architecture
- **product.md** - Product features

### Common Issues
- **Login fails:** Check TENANT_ID matches in both .env files
- **CORS errors:** Restart backend after .env changes
- **Port conflicts:** Use kill-ports.bat/sh to free ports
- **Database errors:** Delete data/pos.db and restart

### Support
- Check existing documentation in `/docs`
- Review error logs in terminal output
- Ensure all prerequisites are installed
- Verify .env configuration matches this guide

## Next Steps

After successful setup:

1. **Change admin password** in Settings
2. **Configure your store** details
3. **Add users** with appropriate roles
4. **Import products** or create categories
5. **Test a sale** transaction
6. **Set up backups** for production

---

**Need help?** Review the troubleshooting section or check the documentation in the `/docs` folder.
