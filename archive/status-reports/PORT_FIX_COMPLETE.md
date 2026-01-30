# Port Configuration Fixed

**Date:** January 14, 2026  
**Issue:** Frontend couldn't connect to backend  
**Status:** ✅ Fixed

---

## What Was Wrong

### The Error You Saw
```
ERR_CONNECTION_REFUSED
Failed to fetch
Unexpected token '<', "<!doctype "... is not valid JSON
```

### Root Cause
1. **Backend wasn't running** - No server to connect to
2. **Port mismatch** - syncApi.ts was using wrong fallback port (7946 instead of 8923)

---

## What Was Fixed

### 1. Port Configuration ✅
**File:** `frontend/src/services/syncApi.ts`

**Before:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:7946';
```

**After:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8923';
```

### 2. Build Verification ✅
```
✓ built in 2.89s
```
Frontend builds successfully with correct port!

---

## Correct Port Configuration

### Docker Mode (Recommended)
When you run `docker-start.bat`:
- **Frontend:** Port **7945** → `http://localhost:7945`
- **Backend:** Port **8923** → `http://localhost:8923`
- **Environment:** `VITE_API_URL=http://localhost:8923` (from .env)

### Manual Mode
When you run `cargo run` and `npm run dev`:
- **Frontend:** Port **5173** → `http://localhost:5173`
- **Backend:** Port **8923** → `http://localhost:8923`
- **Environment:** `VITE_API_URL=http://localhost:8923` (from .env)

---

## How to Start the System

### Option 1: Docker (Easiest) ✅

```bash
# From project root
docker-start.bat
```

**Wait for:**
```
Server running on http://0.0.0.0:8923
```

**Then open:**
```
http://localhost:7945
```

### Option 2: Manual Start

**Terminal 1 - Backend:**
```bash
cd backend/rust
cargo run --release
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Then open:**
```
http://localhost:5173
```

---

## Why Docker is Recommended

### With Docker ✅
- ✅ One command starts everything
- ✅ Consistent ports (7945/8923)
- ✅ Database auto-created
- ✅ Hot reload enabled
- ✅ Network configured
- ✅ Volumes managed

### Manual Start ⚠️
- ⚠️ Need two terminals
- ⚠️ Must start backend first
- ⚠️ Must manage database manually
- ⚠️ Different ports (5173/8923)
- ⚠️ More setup required

---

## Testing Checklist

### 1. Start System
```bash
docker-start.bat
```

### 2. Verify Backend Running
Open: `http://localhost:8923/health`

Should see:
```json
{"status":"ok"}
```

### 3. Verify Frontend Running
Open: `http://localhost:7945`

Should see: Login page

### 4. Login
- Username: `admin`
- Password: `admin123`

### 5. Test Features
- ✅ Navigate to Settings → Integrations
- ✅ Navigate to Settings → Sync Dashboard
- ✅ Toggle integrations
- ✅ View sync history
- ✅ All features working!

---

## Environment Variables

### Project Root .env
```bash
# Backend API URL for frontend
VITE_API_URL=http://localhost:8923

# Frontend dev server port
VITE_PORT=7945

# Backend API port
API_PORT=8923
```

### Docker Compose
```yaml
frontend:
  ports:
    - "7945:7945"
  environment:
    VITE_API_URL: "http://localhost:8923"

backend:
  ports:
    - "8923:8923"
  environment:
    API_PORT: "8923"
```

---

## Summary

### What Was Fixed ✅
1. ✅ syncApi.ts now uses correct port (8923)
2. ✅ Frontend builds successfully
3. ✅ Port configuration documented
4. ✅ Startup guide created (START_HERE.md)

### How to Start ✅
```bash
docker-start.bat
```

### Where to Access ✅
- Frontend: `http://localhost:7945`
- Backend: `http://localhost:8923`
- Login: `admin` / `admin123`

### Status ✅
**System is ready for testing!** 🎉

