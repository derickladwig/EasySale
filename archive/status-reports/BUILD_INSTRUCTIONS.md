# Build Instructions - EasySale

## Prerequisites

### Required Software
1. **Rust** (1.75 or later)
   - Install from: https://rustup.rs/
   - Verify: `rustc --version`

2. **Node.js** (18 or later)
   - Install from: https://nodejs.org/
   - Verify: `node --version` and `npm --version`

3. **SQLite** (3.35 or later)
   - Windows: Included with Rust installation
   - Linux: `sudo apt-get install sqlite3`
   - macOS: Pre-installed

---

## Quick Start (Windows)

### Option 1: Using build.bat (Recommended)
```cmd
build.bat
```

This will:
1. Build the Rust backend
2. Install frontend dependencies
3. Build the frontend
4. Start both backend and frontend

### Option 2: Manual Build
```cmd
cd backend\rust
cargo build --release
cargo run

REM In a new terminal:
cd frontend
npm install
npm run dev
```

---

## Quick Start (Linux/macOS)

### Option 1: Using build.sh (Recommended)
```bash
chmod +x build.sh
./build.sh
```

### Option 2: Manual Build
```bash
cd backend/rust
cargo build --release
cargo run &

cd ../../frontend
npm install
npm run dev
```

---

## First-Time Setup

### 1. Backend Setup

The backend will automatically:
- Create the SQLite database at `backend/rust/data/pos.db`
- Run all migrations
- Create default admin user (username: `admin`, password: `admin123`)
- Start on port 8923

**Important**: The migration system is idempotent - it's safe to run multiple times. If migrations were partially applied, the system will skip duplicate columns/indexes and continue.

### 2. Frontend Setup

The frontend will:
- Install dependencies from package.json
- Start development server on port 7945
- Connect to backend at http://localhost:8923

---

## Troubleshooting

### Backend Won't Start

**Problem**: Migration errors about duplicate columns
**Solution**: This is normal if migrations were partially applied. The system will skip duplicates and continue.

**Problem**: Port 8923 already in use
**Solution**: 
```cmd
REM Windows
netstat -ano | findstr :8923
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:8923 | xargs kill -9
```

**Problem**: Database locked
**Solution**: Close any SQLite browser tools and restart

### Frontend Won't Start

**Problem**: Port 7945 already in use
**Solution**:
```cmd
REM Windows
netstat -ano | findstr :7945
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:7945 | xargs kill -9
```

**Problem**: Cannot connect to backend
**Solution**: Ensure backend is running on port 8923
```cmd
curl http://localhost:8923/api/health
```

### Build Errors

**Problem**: Rust compilation errors
**Solution**:
```cmd
cd backend\rust
cargo clean
cargo build
```

**Problem**: npm install fails
**Solution**:
```cmd
cd frontend
rm -rf node_modules package-lock.json
npm install
```

---

## Development Workflow

### Running Backend Only
```cmd
cd backend\rust
cargo run
```

### Running Frontend Only
```cmd
cd frontend
npm run dev
```

### Running Tests
```cmd
REM Backend tests
cd backend\rust
cargo test

REM Frontend tests
cd frontend
npm test
```

### Building for Production
```cmd
REM Backend
cd backend\rust
cargo build --release

REM Frontend
cd frontend
npm run build
```

---

## Database Management

### Reset Database
```cmd
cd backend\rust
del data\pos.db
cargo run
```

This will recreate the database with all migrations.

### View Database
```cmd
cd backend\rust
sqlite3 data\pos.db
.tables
.schema users
SELECT * FROM users;
.quit
```

### Backup Database
```cmd
cd backend\rust
copy data\pos.db data\pos_backup.db
```

---

## Default Credentials

After first run, you can login with:
- **Username**: `admin`
- **Password**: `admin123`

**IMPORTANT**: Change the default password immediately in production!

---

## Port Configuration

Default ports:
- **Backend**: 8923
- **Frontend**: 7945

To change ports:

**Backend**: Edit `backend/rust/.env`
```env
API_PORT=8923
```

**Frontend**: Edit `frontend/vite.config.ts`
```typescript
server: {
  port: 7945
}
```

---

## Environment Variables

### Backend (.env)
```env
DATABASE_URL=sqlite:./data/pos.db
API_HOST=127.0.0.1
API_PORT=8923
STORE_ID=store-001
STORE_NAME=Main Store
LOG_LEVEL=info
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8923
```

---

## Common Issues

### "Migration already applied" warnings
**Status**: Normal - migrations are idempotent
**Action**: None needed

### "Column already exists" warnings
**Status**: Normal - migration system handles this
**Action**: None needed

### Backend starts but frontend can't connect
**Check**:
1. Backend is running: `curl http://localhost:8923/api/health`
2. CORS is configured correctly (should allow localhost:7945)
3. Frontend .env has correct API_URL

---

## Getting Help

1. Check logs:
   - Backend: Console output
   - Frontend: Browser console (F12)

2. Verify services are running:
   ```cmd
   netstat -ano | findstr :8923
   netstat -ano | findstr :7945
   ```

3. Check database:
   ```cmd
   sqlite3 backend/rust/data/pos.db "SELECT COUNT(*) FROM _migrations;"
   ```

4. Clean build:
   ```cmd
   cd backend\rust
   cargo clean
   cargo build

   cd ..\..\frontend
   rm -rf node_modules
   npm install
   ```

---

## Success Indicators

You'll know everything is working when:

1. ✅ Backend shows: `listening on: 127.0.0.1:8923`
2. ✅ Frontend shows: `Local: http://localhost:7945/`
3. ✅ Browser opens to login page
4. ✅ Can login with admin/admin123
5. ✅ No errors in browser console

---

## Next Steps

After successful build:
1. Login with default credentials
2. Change admin password
3. Create additional users
4. Configure store settings
5. Start using the system!

---

## Support

For issues:
1. Check this document first
2. Review console logs
3. Check database migrations: `SELECT * FROM _migrations;`
4. Try clean build
5. Check GitHub issues
