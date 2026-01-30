# Quick Reference - Sync System

## 🚀 Quick Start

### Run the System
```bash
# Start backend
start-backend.bat

# Start frontend
start-frontend.bat

# Access
http://localhost:7945 (frontend)
http://localhost:8923 (backend API)
```

### Test Sync
```bash
# Trigger manual sync
curl -X POST http://localhost:8923/api/sync/orders \
  -H "Content-Type: application/json" \
  -d '{"mode": "full", "dryRun": false}'

# Check sync status
curl http://localhost:8923/api/sync/status

# View sync history
curl http://localhost:8923/api/sync/history
```

---

## 📊 System Status

### What's Working ✅
- Credential storage with AES-256 encryption
- WooCommerce connector (REST API v3)
- QuickBooks connector (OAuth 2.0)
- Supabase connector
- Data transformers
- Field mapping engine
- Sync orchestrator
- Webhook handlers
- Error handling
- Health checks
- **NEW**: Credential decryption
- **NEW**: Order fetching with filters
- **NEW**: Transformer config from database
- **NEW**: Webhook-triggered sync
- **NEW**: Incremental sync

### What Needs Testing ⚠️
- End-to-end sync flows
- Webhook signature validation
- OAuth token refresh
- Conflict resolution
- Rate limiting
- Error recovery

---

## 🔧 Key Components

### Sync Orchestrator
**Location**: `backend/rust/src/services/sync_orchestrator.rs`

**Methods**:
- `start_sync()` - Trigger sync operation
- `process_queue()` - Process pending webhooks
- `get_sync_status()` - Get sync run status
- `stop_sync()` - Cancel running sync

**Usage**:
```rust
let orchestrator = SyncOrchestrator::new(pool);
let result = orchestrator.start_sync(tenant_id, connector_id, options).await?;
```

### Credential Service
**Location**: `backend/rust/src/services/credential_service.rs`

**Methods**:
- `store_credentials()` - Store encrypted credentials
- `get_credentials()` - Retrieve and decrypt credentials
- `store_oauth_tokens()` - Store OAuth tokens
- `get_oauth_tokens()` - Retrieve OAuth tokens

**Usage**:
```rust
let service = CredentialService::new(pool)?;
let creds = service.get_credentials(tenant_id, "woocommerce").await?;
```

### Transformers
**Location**: `backend/rust/src/connectors/quickbooks/transformers.rs`

**Methods**:
- `transform_customer()` - WooCommerce → QuickBooks customer
- `transform_item()` - WooCommerce → QuickBooks item
- `transform_invoice()` - Order → QuickBooks invoice

**Usage**:
```rust
let config = TransformerConfig::default();
let qb_invoice = transform_invoice(&order, &config)?;
```

---

## 🔐 Configuration

### Environment Variables
```env
# Database
DATABASE_URL=sqlite:./data/pos.db

# API
API_HOST=127.0.0.1
API_PORT=8923

# Encryption
INTEGRATION_ENCRYPTION_KEY=<base64-encoded-32-byte-key>

# OAuth
OAUTH_REDIRECT_URI=http://localhost:7945/api/integrations/quickbooks/callback

# Webhooks
WOOCOMMERCE_WEBHOOK_SECRET=<your-secret>
QUICKBOOKS_WEBHOOK_SECRET=<your-secret>
```

### Database Settings
```sql
-- Transformer config (per tenant)
INSERT INTO settings (tenant_id, key, value) VALUES (
  'tenant-001',
  'transformer_config',
  '{
    "shipping_item_id": "SHIPPING",
    "default_payment_terms_days": 30,
    "custom_field_mappings": [],
    "tax_code_mappings": {},
    "default_tax_code_id": null
  }'
);
```

---

## 📡 API Endpoints

### Sync Operations
```
POST   /api/sync/{entity}           - Trigger sync
GET    /api/sync/status             - List sync runs
GET    /api/sync/status/{syncId}    - Get sync details
POST   /api/sync/retry              - Retry failed records
GET    /api/sync/failures           - List failed records
```

### Credentials
```
POST   /api/integrations/{platform}/credentials  - Store credentials
GET    /api/integrations/{platform}/status       - Connection status
DELETE /api/integrations/{platform}/credentials  - Remove credentials
POST   /api/integrations/{platform}/test         - Test connection
```

### Webhooks
```
POST   /api/webhooks/woocommerce    - WooCommerce webhook
POST   /api/webhooks/quickbooks     - QuickBooks webhook
POST   /api/webhooks/quickbooks/cloudevents  - CloudEvents format
```

---

## 🔍 Debugging

### Check Logs
```bash
# Backend logs (console output)
# Look for:
# - "Received WooCommerce webhook"
# - "Queued sync operation"
# - "Processing sync"
# - "Found X orders to sync"
# - "Updated last_sync_at"
```

### Check Database
```sql
-- View sync queue
SELECT * FROM sync_queue WHERE status = 'pending';

-- View sync state
SELECT * FROM sync_state ORDER BY updated_at DESC;

-- View credentials (encrypted)
SELECT id, tenant_id, platform, is_active FROM integration_credentials;

-- View last sync timestamps
SELECT tenant_id, entity_type, last_sync_at 
FROM sync_state 
ORDER BY last_sync_at DESC;
```

### Common Issues

**Issue**: Credentials not found
```
Solution: Check integration_credentials table
- Verify tenant_id matches
- Verify platform name is correct
- Verify is_active = 1
```

**Issue**: No orders fetched
```
Solution: Check orders table
- Verify orders exist for tenant
- Verify is_active = 1
- Check date range filters
```

**Issue**: Webhook not triggering sync
```
Solution: Check webhook signature
- Verify WOOCOMMERCE_WEBHOOK_SECRET is set
- Check webhook logs for validation errors
- Verify queue processing is running
```

**Issue**: Incremental sync not working
```
Solution: Check sync_state table
- Verify last_sync_at is set
- Check if timestamp is recent
- Try full sync first
```

---

## 🧪 Testing

### Manual Sync Test
```bash
# 1. Configure credentials
curl -X POST http://localhost:8923/api/integrations/woocommerce/credentials \
  -H "Content-Type: application/json" \
  -d '{
    "store_url": "https://your-store.com",
    "consumer_key": "ck_xxx",
    "consumer_secret": "cs_xxx"
  }'

# 2. Test connection
curl http://localhost:8923/api/integrations/woocommerce/status

# 3. Trigger sync
curl -X POST http://localhost:8923/api/sync/orders \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "full",
    "dryRun": false,
    "filters": {
      "status": "completed"
    }
  }'

# 4. Check status
curl http://localhost:8923/api/sync/status
```

### Webhook Test
```bash
# Send test webhook
curl -X POST http://localhost:8923/api/webhooks/woocommerce \
  -H "Content-Type: application/json" \
  -H "X-WC-Webhook-Signature: <signature>" \
  -d '{
    "id": 12345,
    "event": "order.updated",
    "payload": {
      "id": 100,
      "status": "completed"
    }
  }'

# Check queue
sqlite3 data/pos.db "SELECT * FROM sync_queue WHERE status='pending';"
```

---

## 📚 Documentation

### User Guides
- `BUILD_INSTRUCTIONS.md` - How to build and run
- `QUICK_WINS_GUIDE.md` - Implementation guide
- `CURRENT_STATE.md` - System status

### Developer Guides
- `TASKS_1_5_COMPLETE.md` - Recent implementation details
- `INCOMPLETE_FEATURES_PLAN.md` - Remaining work
- `.kiro/specs/universal-data-sync/tasks.md` - Complete task list

### Session Summaries
- `SESSION_COMPLETE_2026-01-15.md` - Latest session
- `SESSION_SUMMARY_2026-01-15.md` - Earlier session
- `IMPLEMENTATION_COMPLETE.md` - Previous work

---

## 🎯 Next Steps

### Immediate (Today)
1. Set up WooCommerce staging store
2. Set up QuickBooks sandbox
3. Set up Supabase test project
4. Test end-to-end sync flows

### Short Term (This Week)
1. Add error handling and retry logic
2. Implement sync schedule API
3. Add dry run mode
4. Write integration tests

### Medium Term (Next Week)
1. Build sync monitoring UI
2. Create mapping editor
3. Complete documentation
4. Performance optimization

---

## 💡 Tips

### Performance
- Use incremental sync for regular updates
- Limit batch size to 1000 records
- Run full sync during off-peak hours
- Monitor sync duration and adjust

### Security
- Rotate encryption keys regularly
- Use environment variables for secrets
- Enable webhook signature validation
- Monitor failed login attempts

### Reliability
- Set up health check monitoring
- Configure error notifications
- Enable automatic retry for failed syncs
- Keep sync logs for debugging

### Maintenance
- Review sync logs weekly
- Clean up old sync_queue entries
- Monitor database size
- Update external API credentials before expiry

---

**Last Updated**: January 15, 2026  
**Version**: 0.85 (85% complete)  
**Status**: Ready for testing

