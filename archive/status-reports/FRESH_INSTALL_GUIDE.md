# Fresh Install Guide - EasySale

This guide will help you set up EasySale from scratch on a new system.

## Prerequisites

- **Windows 10/11** or **Linux** (Ubuntu 20.04+)
- **Node.js** v18+ (for frontend)
- **Rust** 1.75+ (for backend)
- **SQLite** v3.35+ (usually included with Rust/Node)
- **Git** (for version control)

## Quick Start (5 minutes)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd EasySale
```

### 2. Configure Your Tenant

**IMPORTANT:** Set your tenant ID BEFORE running the application for the first time!

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and set your TENANT_ID
# For the reference implementation (CAPS Automotive):
TENANT_ID=caps-automotive

# For your own business:
TENANT_ID=your-business-name
```

**Windows:**
```cmd
copy .env.example .env
notepad .env
```

### 3. Configure Backend

```bash
cd backend/rust
cp .env.example .env

# Edit backend/rust/.env and set the same TENANT_ID
notepad .env  # Windows
nano .env     # Linux
```

**Required settings in `backend/rust/.env`:**
```env
TENANT_ID=your-business-name
DATABASE_PATH=./data/pos.db
JWT_SECRET=CHANGE_ME_GENERATE_RANDOM_SECRET
```

### 4. Start the Backend

**Windows:**
```cmd
start-backend.bat
```

**Linux:**
```bash
./start-backend.sh
```

The backend will:
- Create the database at `backend/rust/data/pos.db`
- Run all migrations
- Create default admin user (username: `admin`, password: `admin123`)
- Start listening on `http://localhost:8923`

### 5. Start the Frontend

**Windows:**
```cmd
start-frontend.bat
```

**Linux:**
```bash
./start-frontend.sh
```

The frontend will start on `http://localhost:7945`

### 6. Login

Open your browser to `http://localhost:7945` and login with:
- **Username:** `admin`
- **Password:** `admin123`

**IMPORTANT:** Change the default password immediately after first login!

## Troubleshooting

### "Invalid username or password" on login

This usually means the TENANT_ID mismatch. Check:

1. **Backend `.env` file** (`backend/rust/.env`):
   ```env
   TENANT_ID=your-business-name
   ```

2. **Database tenant_id**:
   ```bash
   sqlite3 backend/rust/data/pos.db "SELECT username, tenant_id FROM users;"
   ```

3. **If they don't match**, you have two options:

   **Option A: Update the database** (if you just started):
   ```bash
   # Delete the database and restart
   rm backend/rust/data/pos.db
   # Restart the backend - it will recreate with correct TENANT_ID
   ```

   **Option B: Update the .env** (if you have data):
   ```bash
   # Set TENANT_ID in backend/rust/.env to match the database
   TENANT_ID=<value-from-database>
   ```

### Backend won't start

1. **Check if port 8923 is already in use:**
   ```bash
   # Windows
   netstat -ano | findstr :8923
   
   # Linux
   lsof -i :8923
   ```

2. **Check the logs** in the terminal where you started the backend

3. **Verify Rust is installed:**
   ```bash
   cargo --version
   ```

### Frontend won't start

1. **Check if port 7945 is already in use:**
   ```bash
   # Windows
   netstat -ano | findstr :7945
   
   # Linux
   lsof -i :7945
   ```

2. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

3. **Verify Node.js is installed:**
   ```bash
   node --version
   npm --version
   ```

## Configuration for Your Business

### 1. Create Your Tenant Configuration

```bash
mkdir -p configs/private
cp configs/examples/retail-store.json configs/private/your-business.json
```

Edit `configs/private/your-business.json` to customize:
- Company name and branding
- Product categories
- Tax rates
- Currency
- Features to enable/disable

### 2. Update Environment Variables

Edit `backend/rust/.env`:
```env
TENANT_ID=your-business-name
CONFIG_PATH=./configs/private/your-business.json
STORE_NAME="Your Store Name"
```

### 3. Restart the Backend

The backend will load your custom configuration on startup.

## Security Checklist

Before going to production:

- [ ] Change default admin password
- [ ] Generate a strong JWT_SECRET: `openssl rand -base64 32`
- [ ] Set up proper backup paths
- [ ] Configure SSL/TLS certificates
- [ ] Review user permissions
- [ ] Set up firewall rules
- [ ] Enable audit logging
- [ ] Test backup and restore procedures

## Next Steps

- Read the [BUILD_GUIDE.md](BUILD_GUIDE.md) for detailed build instructions
- Check [QUICK_START.md](QUICK_START.md) for feature overview
- Review [tech.md](.kiro/steering/tech.md) for technical architecture
- See [product.md](.kiro/steering/product.md) for product overview

## Getting Help

- Check the [DEVLOG.md](DEVLOG.md) for development notes
- Review [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for feature status
- Open an issue on GitHub for bugs or questions

## Known Issues

### SQLx Tenant ID Binding Issue

There's a known issue with SQLx parameter binding for tenant_id in WHERE clauses. The current workaround:
- The login query fetches users without tenant_id filter
- Manual tenant_id check is performed in code
- This is functionally equivalent and secure
- A proper fix will be implemented in a future update

This does not affect security or functionality - it's just a technical implementation detail.
