# Offline Operation and Synchronization

## Overview

EasySale is built with an **offline-first architecture**, meaning the system works fully without an internet connection. All data is stored locally on each device, and changes synchronize automatically when connectivity is available.

## Offline Capabilities

### What Works Offline

Everything. The system is designed so that **no internet connection is required for daily operations**:

| Feature | Offline Support | Notes |
|---------|----------------|-------|
| Process sales | ✅ Full | All payment types except online card processing |
| Process returns | ✅ Full | Refunds processed locally |
| Look up products | ✅ Full | Search by barcode, keyword, category |
| Check inventory | ✅ Full | Real-time local stock levels |
| Manage customers | ✅ Full | Create, edit, view customer data |
| Adjust inventory | ✅ Full | Stock counts, adjustments, receiving |
| Print receipts | ✅ Full | All printing works locally |
| Generate reports | ✅ Full | Based on local data |
| User authentication | ✅ Full | Credentials cached locally |

### What Requires Online Access

Some features require internet connectivity:

| Feature | Reason |
|---------|--------|
| Multi-store sync | Requires network to exchange data |
| Cloud backups | Requires network to upload |
| Online card payments | Requires processor connectivity |
| Software updates | Requires network to download |
| Integration syncs (QuickBooks, WooCommerce) | Requires API access |

## How Offline Mode Works

### Local Database

Each device maintains a complete local SQLite database containing:

- Product catalog (all items, prices, descriptions)
- Customer database (profiles, loyalty points, history)
- Transaction history (sales, returns, exchanges)
- Inventory levels (stock counts, movements)
- User accounts and permissions
- Configuration and settings

### Automatic Detection

The system automatically detects connectivity status:

```
┌─────────────────────────────────────────────────────────────────┐
│ Top Bar: Store Name        [OFFLINE]        User: cashier01     │
└─────────────────────────────────────────────────────────────────┘
```

- **Green indicator**: Online and synced
- **Yellow indicator**: Online but syncing in progress
- **Red/Gray indicator**: Offline mode active

No user action is required to switch between online and offline modes.

### Event Sourcing

All changes are recorded as events:

```
┌──────────────────────────────────────────────────────────────┐
│ Event Log (Append-Only)                                      │
├──────────────────────────────────────────────────────────────┤
│ 1. [2026-01-30 09:15:23] SALE_CREATED  TXN-001  $45.99      │
│ 2. [2026-01-30 09:17:45] STOCK_ADJUSTED PRD-102 -5          │
│ 3. [2026-01-30 09:20:01] CUSTOMER_ADDED CST-456             │
│ 4. [2026-01-30 09:22:33] RETURN_PROCESSED TXN-002 $12.00    │
└──────────────────────────────────────────────────────────────┘
```

These events are stored persistently and queued for synchronization.

## Synchronization Process

### Sync Flow

When connectivity is available:

```
1. Device detects network connectivity
   ↓
2. Sync service wakes up (runs every 1-5 minutes)
   ↓
3. Device sends local events to sync target
   ↓
4. Sync target processes events and checks for conflicts
   ↓
5. Sync target sends acknowledgment and any updates
   ↓
6. Device applies remote changes to local database
   ↓
7. Device marks events as synced
```

### Sync Targets

Events can sync to multiple targets:

| Target | Purpose | Frequency |
|--------|---------|-----------|
| Other stores | Multi-store inventory/customer sharing | 1-5 minutes |
| Cloud backup | Disaster recovery | Daily |
| QuickBooks | Accounting integration | Configurable |
| WooCommerce | E-commerce sync | Configurable |

### Conflict Resolution

When the same data is modified on multiple devices while offline, conflicts can occur.

**Resolution Strategy: Last-Write-Wins with Store Priority**

```
Conflict: Product price changed at two stores while both offline

Store A: Changed price from $10 to $12 at 09:15:00
Store B: Changed price from $10 to $11 at 09:16:30

Resolution: Store B's change wins (later timestamp)
Final price: $11
```

**Conflict Types and Resolutions:**

| Conflict Type | Resolution | Example |
|---------------|------------|---------|
| Price change | Last write wins | See above |
| Stock adjustment | Merge (sum changes) | A: -5, B: -3 = Total: -8 |
| Customer edit | Last write wins | Latest email used |
| Product edit | Last write wins by field | Each field independent |
| Transaction | Never conflicts | Transactions are immutable |

### Queue Management

Pending operations are stored in a persistent queue:

```sql
-- Sync queue table structure
sync_queue (
  id INTEGER PRIMARY KEY,
  event_type TEXT,        -- SALE, STOCK_ADJUST, CUSTOMER_UPDATE
  entity_id TEXT,         -- Reference to affected entity
  payload TEXT,           -- JSON event data
  created_at TIMESTAMP,   -- When event occurred
  retry_count INTEGER,    -- Number of sync attempts
  last_error TEXT,        -- Last error message if failed
  status TEXT             -- PENDING, SYNCING, SYNCED, FAILED
)
```

**Queue Capacity**: 100,000+ pending operations

## Extended Offline Scenarios

### Multi-Day Offline Operation

The system supports extended offline operation (days or weeks):

1. **No data loss**: All operations saved locally
2. **Unlimited duration**: No timeout on offline mode
3. **Full functionality**: All features continue working
4. **Queue persistence**: Events stored until sync succeeds

### Recovery After Extended Outage

When connectivity returns after extended offline period:

```
1. Network reconnects
   ↓
2. Sync service detects queue backlog
   ↓
3. Events sync in chronological order (oldest first)
   ↓
4. Progress indicator shows sync status
   ↓
5. Large queues may take minutes to hours to fully sync
   ↓
6. System remains usable during sync
```

**Recovery Time Estimates:**

| Queue Size | Estimated Time |
|------------|----------------|
| 1,000 events | < 1 minute |
| 10,000 events | 5-10 minutes |
| 100,000 events | 30-60 minutes |

### Handling Sync Failures

If sync fails repeatedly:

1. **Automatic retry**: Exponential backoff (1s, 2s, 4s, 8s, ... up to 1 hour)
2. **Error logging**: All failures logged for diagnostics
3. **Manual intervention**: After 24 hours, alert displayed
4. **Data preservation**: Events never lost, only queued

## User Interface

### Offline Indicator

The top bar shows current connectivity status:

```
┌────────────────────────────────────────────────────────────────┐
│ Acme Auto Parts          [●] ONLINE           User: jsmith     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Acme Auto Parts          [○] OFFLINE          User: jsmith     │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│ Acme Auto Parts          [◐] SYNCING (42%)    User: jsmith     │
└────────────────────────────────────────────────────────────────┘
```

### Sync Status Panel

Access detailed sync status from the Admin menu:

```
┌──────────────────────────────────────────────────────────────┐
│ Sync Status                                                  │
├──────────────────────────────────────────────────────────────┤
│ Status:         ONLINE                                       │
│ Last sync:      2026-01-30 09:15:23 (5 minutes ago)         │
│ Pending events: 0                                            │
│ Failed events:  0                                            │
│                                                              │
│ Sync Targets:                                                │
│   ☑ Store B (Downtown)    Last: 09:15:23    Status: OK      │
│   ☑ Cloud Backup          Last: 06:00:00    Status: OK      │
│   ☑ QuickBooks            Last: 09:00:00    Status: OK      │
│   ☐ WooCommerce           Not configured                     │
│                                                              │
│ [Force Sync Now]  [View Queue]  [Clear Failed]              │
└──────────────────────────────────────────────────────────────┘
```

## Configuration

### Sync Settings

Configure sync behavior in Admin > Settings > Sync:

```yaml
# Sync configuration
sync:
  # How often to check for connectivity and sync
  interval_seconds: 60
  
  # Maximum events to sync per batch
  batch_size: 1000
  
  # Retry configuration
  retry:
    max_attempts: 10
    initial_delay_seconds: 1
    max_delay_seconds: 3600
    
  # Conflict resolution
  conflict_resolution: "last_write_wins"
  
  # Sync targets
  targets:
    multi_store: true
    cloud_backup: true
    quickbooks: false
    woocommerce: false
```

### Network Configuration

Configure network settings in Admin > Settings > Network:

```yaml
# Network configuration
network:
  # LAN sync settings
  lan:
    enabled: true
    discovery: "auto"  # or "manual"
    port: 3000
    
  # Internet connectivity check
  connectivity_check:
    url: "https://www.google.com/generate_204"
    interval_seconds: 30
    timeout_seconds: 5
```

## Troubleshooting

### Common Issues

#### Sync Not Working

1. **Check network connectivity**: Can you access the internet?
2. **Check sync status**: Admin > Sync Status
3. **Review error logs**: Admin > Logs
4. **Force sync**: Click "Force Sync Now" button
5. **Restart service**: Admin > Services > Restart Sync

#### Large Sync Queue

If you have many pending events:

1. **Be patient**: Large queues take time to process
2. **Check bandwidth**: Slow network = slow sync
3. **Review errors**: Look for failed events blocking queue
4. **Contact support**: If queue doesn't decrease

#### Conflict Resolution Issues

If data seems wrong after sync:

1. **Check audit log**: Admin > Audit Log to see changes
2. **Review sync history**: See which device made changes
3. **Manual correction**: Edit data to correct values
4. **Report issue**: If conflicts resolve incorrectly

### Diagnostic Commands

For technical troubleshooting:

```bash
# Check sync queue status
curl http://localhost:3000/api/sync/status

# Force immediate sync
curl -X POST http://localhost:3000/api/sync/force

# View pending events
curl http://localhost:3000/api/sync/queue

# Clear failed events (use with caution)
curl -X DELETE http://localhost:3000/api/sync/failed
```

## Best Practices

### For Reliable Operation

1. **Daily backups**: Even when offline, create local backups
2. **Periodic connectivity**: Connect at least once daily if possible
3. **Monitor sync status**: Check for errors regularly
4. **Train staff**: Ensure they know offline mode is normal

### For Multi-Store Setups

1. **Consistent pricing**: Sync pricing changes quickly
2. **Inventory visibility**: Understand sync delay (1-5 minutes)
3. **Customer data**: Same customer may exist at multiple stores
4. **Reporting**: Reports reflect local data only

### For Extended Offline

1. **Plan ahead**: Know what works without connectivity
2. **Local backups**: Critical during extended offline
3. **Queue monitoring**: Check queue size periodically
4. **Gradual sync**: Don't rush when connectivity returns

## Technical Architecture

### Database Schema (Sync-Related)

```sql
-- Sync events table
CREATE TABLE sync_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    payload TEXT NOT NULL,
    store_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_at TIMESTAMP,
    status TEXT DEFAULT 'pending'
);

-- Sync state tracking
CREATE TABLE sync_state (
    target_id TEXT PRIMARY KEY,
    last_sync_at TIMESTAMP,
    last_event_id TEXT,
    status TEXT,
    error_message TEXT
);

-- Indexes for performance
CREATE INDEX idx_sync_events_status ON sync_events(status);
CREATE INDEX idx_sync_events_created ON sync_events(created_at);
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sync/status` | GET | Current sync status |
| `/api/sync/queue` | GET | Pending events |
| `/api/sync/force` | POST | Trigger immediate sync |
| `/api/sync/config` | GET/PUT | Sync configuration |
| `/api/sync/history` | GET | Recent sync history |

## References

- [System Architecture](./architecture/overview.md)
- [Data Flow Documentation](./architecture/data-flow.md)
- [Security Documentation](./architecture/security.md)
- [API Documentation](./api/README.md)
