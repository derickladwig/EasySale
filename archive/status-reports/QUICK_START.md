# Quick Start Guide

**Get the system running in 5 minutes!**

---

## Prerequisites

- Rust 1.75+ installed
- Node.js 18+ installed
- SQLite 3.35+ installed

---

## Step 1: Start Backend (2 minutes)

```bash
# Navigate to backend
cd backend/rust

# Run migrations (first time only)
cargo run -- migrate

# Start backend server
cargo run --release
```

**Backend will be available at:** `http://localhost:7946`

**You should see:**
```
Server running on http://0.0.0.0:7946
All services initialized successfully
```

---

## Step 2: Start Frontend (2 minutes)

```bash
# Navigate to frontend (in new terminal)
cd frontend

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

**Frontend will be available at:** `http://localhost:5173`

**You should see:**
```
VITE v6.4.1  ready in 1234 ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Step 3: Login (30 seconds)

1. Open browser to `http://localhost:5173`
2. Login with:
   - **Username:** `admin`
   - **Password:** `admin123`

---

## Step 4: Test Features (1 minute)

### Test Integrations Page
1. Click **Settings** (gear icon in sidebar)
2. Click **Integrations**
3. Toggle an integration on
4. Click **Configure**
5. Click **Test Connection**

### Test Sync Dashboard
1. Click **Settings** (gear icon in sidebar)
2. Click **Sync Dashboard**
3. View connection status cards
4. View recent sync activity
5. Click **Refresh** to update

### Test Field Mappings
1. Go to **Settings** → **Integrations**
2. Enable an integration
3. Click **Configure**
4. Click **Field Mappings** button
5. Add a new mapping:
   - Source: `billing.email`
   - Target: `BillEmail.Address`
   - Transformation: (none)
6. Click **Save Mappings**

---

## Quick Test Commands

### Test API Endpoints

```bash
# Get JWT token (after login)
TOKEN="your-jwt-token-from-browser-storage"

# Test connection status
curl -H "Authorization: Bearer $TOKEN" http://localhost:7946/api/integrations/connections

# Test sync status
curl -H "Authorization: Bearer $TOKEN" http://localhost:7946/api/sync/status

# Test field mappings
curl -H "Authorization: Bearer $TOKEN" http://localhost:7946/api/mappings
```

---

## Troubleshooting

### Backend won't start
```bash
# Check if port 7946 is in use
netstat -an | findstr 7946

# Kill process if needed
taskkill /F /PID <process-id>
```

### Frontend won't start
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Can't login
- Default credentials: `admin` / `admin123`
- Check backend is running on port 7946
- Check browser console for errors

---

## What to Test

✅ **Must Test:**
- [ ] Login works
- [ ] Navigate to Integrations page
- [ ] Navigate to Sync Dashboard
- [ ] Toggle integration on/off
- [ ] Open field mapping editor
- [ ] Add/remove field mappings
- [ ] View sync history
- [ ] View failed records queue

⚠️ **With Credentials:**
- [ ] Test real WooCommerce connection
- [ ] Test real QuickBooks connection
- [ ] Trigger real sync operation
- [ ] View real sync status

---

## Next Steps

1. ✅ System is running
2. ✅ Basic features tested
3. 📖 Read `READY_FOR_TESTING.md` for detailed testing
4. 🔧 Configure real integration credentials
5. 🚀 Deploy to staging/production

---

## Need Help?

- **Full Testing Guide:** See `READY_FOR_TESTING.md`
- **Complete Status:** See `FINAL_STATUS.md`
- **API Documentation:** See `IMPLEMENTATION_COMPLETE.md`
- **Troubleshooting:** See `READY_FOR_TESTING.md` → Troubleshooting section

---

**That's it! You're ready to test!** 🎉

