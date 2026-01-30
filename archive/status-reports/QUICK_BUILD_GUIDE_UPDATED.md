# Quick Build Guide - Updated System

## 🎯 Everything is Now Automated!

The build system has been completely fixed. Database setup and migrations now run automatically.

## Build Scripts Available

### 1. `build-prod.bat` - Clean Production Build (Recommended)
**Use this for:**
- First time setup
- After pulling code changes
- When you want to ensure everything is fresh
- Before deployment

**What it does:**
- Builds with `--no-cache` flag
- Ensures all code changes are included
- Takes longer but guarantees clean build
- Removes old images first

```bash
build-prod.bat
```

### 2. `build-prod-fast.bat` - Fast Build (Development)
**Use this for:**
- Quick iterations during development
- When you know cache is valid
- Testing small changes

**What it does:**
- Uses Docker cache for speed
- Much faster rebuilds
- May miss some changes if cache is stale

```bash
build-prod-fast.bat
```

### 3. `build.bat` - Local Development Build
**Use this for:**
- Running without Docker
- Local development with hot reload
- Debugging

```bash
build.bat
```

## Fresh Install (First Time)

### Recommended: Clean Production Build
```bash
# One command does everything:
build-prod.bat

# That's it! The system will:
# ✅ Build without cache (ensures fresh build)
# ✅ Create database automatically
# ✅ Run all 37 migrations
# ✅ Build frontend and backend
# ✅ Start all services
```

### Alternative: Local Development
```bash
# One command does everything:
build.bat

# That's it! The system will:
# ✅ Setup database automatically
# ✅ Run all migrations
# ✅ Build backend and frontend
# ✅ Ready to run
```

## After Clean/Wipe

### If you run docker-clean.bat:
```bash
# Use clean build (recommended):
build-prod.bat

# Or fast build if you're in a hurry:
build-prod-fast.bat

# Database will be recreated automatically!
```

### If you delete backend/rust/data/:
```bash
# Just rebuild:
cd backend/rust
setup-db.bat
cargo build
```

## Why --no-cache?

Docker caches build layers to speed up builds. However, this can cause issues:
- ❌ Code changes might not be included
- ❌ Old compilation errors might persist
- ❌ Fixes might not take effect

Using `--no-cache`:
- ✅ Guarantees fresh build
- ✅ All code changes included
- ✅ All fixes applied
- ✅ Reliable and predictable

**Trade-off**: Takes longer (5-10 minutes vs 1-2 minutes)

## When to Use Each Script

| Scenario | Script | Why |
|----------|--------|-----|
| First clone | `build-prod.bat` | Clean start |
| After git pull | `build-prod.bat` | Ensure changes included |
| Code changes | `build-prod.bat` | Avoid cache issues |
| Quick test | `build-prod-fast.bat` | Speed |
| Local dev | `build.bat` | No Docker needed |
| Before deploy | `build-prod.bat` | Guarantee clean build |

## Manual Database Setup (Optional)

If you want to manually setup/reset the database:

```bash
cd backend/rust
setup-db.bat
```

This will:
1. Create `data/` directory
2. Create `pos.db` database
3. Run all 37 migration files
4. Verify schema
5. Show sample data

## Verify Everything Works

### Check Database:
```bash
cd backend/rust
sqlite3 data/pos.db ".tables"
```

Expected: ~50+ tables including:
- tenants
- users
- products
- stores
- stations
- settings
- feature_flags
- etc.

### Check Docker:
```bash
docker ps
docker logs EasySale-backend
```

Look for:
```
Running database migrations...
Migrations completed successfully!
Found 50+ tables in database
Starting EasySale API Server...
```

## What Changed?

### Before (Manual):
1. Clone repo
2. Manually create database
3. Manually run migrations
4. Set DATABASE_URL
5. Build
6. Hope it works

### Now (Automatic):
1. Clone repo
2. Run `build-prod.bat`
3. ✅ Done!

## Files That Handle This

- `build-prod.bat` - Clean production build (--no-cache)
- `build-prod-fast.bat` - Fast build (uses cache)
- `build.bat` - Local development build
- `backend/rust/setup-db.bat` - Local database setup
- `backend/rust/entrypoint.sh` - Docker database setup
- `backend/rust/Dockerfile` - Uses entrypoint

## Common Scenarios

### Scenario: Fresh clone
```bash
git clone <repo>
cd <repo>
build-prod.bat
# ✅ Everything works!
```

### Scenario: After pulling updates
```bash
git pull
build-prod.bat  # Use clean build to ensure changes included
# ✅ New migrations run automatically!
```

### Scenario: Quick iteration
```bash
# Make small code change
build-prod-fast.bat  # Faster rebuild
# ✅ Quick test!
```

### Scenario: Reset everything
```bash
docker-clean.bat
build-prod.bat
# ✅ Fresh database created!
```

### Scenario: Local development
```bash
build.bat
start-backend.bat  # Terminal 1
start-frontend.bat # Terminal 2
# ✅ Everything works!
```

## Troubleshooting

### Build fails with "no such table"
**Rare, but if it happens:**
```bash
cd backend/rust
del data\pos.db
setup-db.bat
cargo build
```

### Docker build uses old code
**Solution:**
```bash
build-prod.bat  # Already uses --no-cache
```

### Docker container exits immediately
```bash
docker logs EasySale-backend
# Check for migration errors
```

### Want to see what migrations ran
```bash
cd backend/rust
sqlite3 data/pos.db "SELECT * FROM _sqlx_migrations;"
```

## Summary

**You don't need to do anything special anymore!**

Just run:
- `build-prod.bat` for clean Docker build (recommended)
- `build-prod-fast.bat` for fast Docker build (development)
- `build.bat` for local development

The system handles:
- ✅ Database creation
- ✅ Running migrations
- ✅ Schema verification
- ✅ Error handling
- ✅ Logging
- ✅ Cache management

**It just works!** 🎉
