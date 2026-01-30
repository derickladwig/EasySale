# Deploying EasySale for CAPS Automotive

**Date:** 2026-01-11  
**Purpose:** Deployment instructions for CAPS Automotive (reference implementation)

---

## Overview

This guide shows how to deploy EasySale for CAPS Automotive. CAPS is the **reference implementation** - their configuration demonstrates all features but is NOT hardcoded into the system.

**Key Principle:** CAPS configuration exists ONLY in `configs/private/caps-automotive.json`, not in the code.

---

## Prerequisites

1. EasySale codebase (white-label, no business-specific code)
2. CAPS configuration file: `configs/private/caps-automotive.json`
3. Environment variables configured
4. Database initialized

---

## Step 1: Set Environment Variables

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` and set:

```bash
# REQUIRED: Set tenant ID to match CAPS configuration
TENANT_ID=caps-automotive

# REQUIRED: Point to CAPS configuration file
CONFIG_PATH=./configs/private/caps-automotive.json

# Store configuration
STORE_ID=store-001
STORE_NAME="CAPS Edmonton"
STORE_TIMEZONE=America/Edmonton

# ... other settings as needed
```

**CRITICAL:** The `TENANT_ID` must be set to `caps-automotive` for CAPS deployment. This is NOT a default - it's explicitly configured for CAPS.

---

## Step 2: Verify Configuration File

Ensure `configs/private/caps-automotive.json` exists and contains:

```json
{
  "tenant_id": "caps-automotive",
  "company": {
    "name": "CAPS Automotive & Paint Supply",
    "logo": "/assets/logos/caps-logo.png",
    ...
  },
  "categories": [
    {
      "id": "caps",
      "name": "Caps & Hats",
      ...
    },
    {
      "id": "auto-parts",
      "name": "Automotive Parts",
      ...
    },
    {
      "id": "paint",
      "name": "Paint & Supplies",
      ...
    }
  ],
  ...
}
```

---

## Step 3: Initialize Database

Run migrations (will use TENANT_ID from environment):

```bash
cd backend/rust
cargo run --release -- migrate
```

**What happens:**
- Migration 008 adds `tenant_id` column to all tables
- Existing data gets assigned to 'default-tenant' by default
- You need to update existing data to 'caps-automotive':

```sql
-- Update all existing data to CAPS tenant
UPDATE users SET tenant_id = 'caps-automotive' WHERE tenant_id = 'default-tenant';
UPDATE sessions SET tenant_id = 'caps-automotive' WHERE tenant_id = 'default-tenant';
UPDATE audit_log SET tenant_id = 'caps-automotive' WHERE tenant_id = 'default-tenant';
-- ... repeat for all 32 tables
```

**OR** set TENANT_ID before first migration:

```bash
export TENANT_ID=caps-automotive
cargo run --release -- migrate
```

---

## Step 4: Start Services

```bash
# Backend
cd backend/rust
TENANT_ID=caps-automotive cargo run --release

# Frontend  
cd frontend
npm run dev
```

---

## Step 5: Verify CAPS Configuration Loaded

1. Open browser to `http://localhost:7945`
2. Login with CAPS credentials
3. Verify:
   - Company name shows "CAPS Automotive & Paint Supply"
   - Logo shows CAPS logo
   - Categories include Caps, Auto Parts, Paint
   - Navigation shows CAPS-specific menu items

---

## For Other Tenants

To deploy for a DIFFERENT business:

1. Create their configuration: `configs/private/their-business.json`
2. Set `TENANT_ID=their-business` in `.env`
3. Set `CONFIG_PATH=./configs/private/their-business.json`
4. Run migrations (data will be assigned to 'their-business')
5. Start services

**The code never changes** - only configuration and environment variables.

---

## Production Deployment

### Docker Deployment

```bash
# Build with CAPS configuration
docker build \
  --build-arg TENANT_ID=caps-automotive \
  --build-arg CONFIG_PATH=./configs/private/caps-automotive.json \
  -t EasySale-caps:latest \
  .

# Run with environment variables
docker run -d \
  -e TENANT_ID=caps-automotive \
  -e CONFIG_PATH=/app/configs/private/caps-automotive.json \
  -v ./configs/private:/app/configs/private:ro \
  -v ./data:/app/data \
  -p 8923:8923 \
  EasySale-caps:latest
```

### Environment Variables for Production

```bash
# Required
TENANT_ID=caps-automotive
CONFIG_PATH=./configs/private/caps-automotive.json

# Security
JWT_SECRET=<generate-random-secret>
PASSWORD_HASH_ROUNDS=12

# Database
DATABASE_PATH=./data/caps-pos.db

# Backup
BACKUP_ENABLED=true
BACKUP_LOCAL_PATH=/mnt/backup/caps
GOOGLE_DRIVE_ENABLED=true

# Hardware (CAPS-specific)
RECEIPT_PRINTER_TYPE=ESC_POS
LABEL_PRINTER_TYPE=ZEBRA_ZPL
PAYMENT_TERMINAL_TYPE=STRIPE_TERMINAL
```

---

## Troubleshooting

### Error: "TENANT_ID environment variable must be set"

**Cause:** TENANT_ID not set in production mode  
**Fix:** Set `TENANT_ID=caps-automotive` in `.env` or environment

### Error: "Configuration file not found"

**Cause:** CONFIG_PATH points to non-existent file  
**Fix:** Ensure `configs/private/caps-automotive.json` exists

### Wrong branding shows

**Cause:** TENANT_ID doesn't match configuration file  
**Fix:** Ensure TENANT_ID matches the tenant_id in the JSON config

### Data from wrong tenant appears

**Cause:** Database has mixed tenant_id values  
**Fix:** Run SQL to verify and fix tenant_id values:

```sql
SELECT DISTINCT tenant_id FROM users;
-- Should only show 'caps-automotive' for CAPS deployment
```

---

## Summary

**CAPS is configured, not hardcoded:**
- ✅ Configuration: `configs/private/caps-automotive.json`
- ✅ Environment: `TENANT_ID=caps-automotive` in `.env`
- ✅ Database: All data has `tenant_id = 'caps-automotive'`
- ✅ Code: NO hardcoded 'caps-automotive' values

**The system is white-label** - CAPS is just one tenant configuration.
