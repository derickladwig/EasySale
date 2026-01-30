# Sync Rules Matrix

**Audit Date:** 2026-01-29  
**Status:** APPROVED

---

## 1. ENTITY SYNC DIRECTION MATRIX

### 1.1 WooCommerce ↔ POS

| Entity | Default Direction | Configurable | Notes |
|--------|-------------------|--------------|-------|
| Products | Pull | ✅ Yes | WooCommerce is source of truth for catalog |
| Inventory | Bidirectional | ✅ Yes | POS decrements on sale, Woo updates on web sale |
| Orders | Pull | ✅ Yes | Web orders pulled to POS for fulfillment |
| Customers | Bidirectional | ✅ Yes | Created in either system |
| Prices | Pull | ✅ Yes | WooCommerce manages pricing |
| Categories | Pull | ✅ Yes | WooCommerce manages taxonomy |

### 1.2 QuickBooks ↔ POS

| Entity | Default Direction | Configurable | Notes |
|--------|-------------------|--------------|-------|
| Customers | Push | ✅ Yes | POS creates, QB receives |
| Items | Push | ✅ Yes | POS products → QB items |
| Invoices | Push | ✅ Yes | POS sales → QB invoices |
| Sales Receipts | Push | ✅ Yes | Paid POS sales → QB receipts |
| Payments | Push | ✅ Yes | POS payments → QB payments |
| Vendors | Bidirectional | ✅ Yes | Created in either system |
| Bills | Pull | ✅ Yes | QB bills → POS for receiving |

### 1.3 WooCommerce → QuickBooks (Flow)

| Entity | Direction | Notes |
|--------|-----------|-------|
| Orders → Invoices | One-way | Woo orders become QB invoices |
| Customers → Customers | One-way | Woo customers synced to QB |
| Products → Items | One-way | Woo products become QB items |

---

## 2. FIELD-LEVEL SYNC RULES

### 2.1 Product Fields

| Field | WooCommerce → POS | POS → WooCommerce | Conflict Rule |
|-------|-------------------|-------------------|---------------|
| SKU | ✅ Pull | ❌ No | WooCommerce authoritative |
| Name | ✅ Pull | ⚠️ Optional | WooCommerce authoritative |
| Price | ✅ Pull | ⚠️ Optional | WooCommerce authoritative |
| Cost | ❌ No | ✅ Push | POS authoritative |
| Quantity | ✅ Pull | ✅ Push | Last-write-wins |
| Description | ✅ Pull | ❌ No | WooCommerce authoritative |
| Categories | ✅ Pull | ❌ No | WooCommerce authoritative |
| Images | ✅ Pull | ❌ No | WooCommerce authoritative |
| Weight | ✅ Pull | ❌ No | WooCommerce authoritative |
| Dimensions | ✅ Pull | ❌ No | WooCommerce authoritative |

### 2.2 Customer Fields

| Field | WooCommerce → POS | POS → WooCommerce | Conflict Rule |
|-------|-------------------|-------------------|---------------|
| Email | ✅ Pull | ✅ Push | Merge (unique key) |
| First Name | ✅ Pull | ✅ Push | Last-write-wins |
| Last Name | ✅ Pull | ✅ Push | Last-write-wins |
| Phone | ✅ Pull | ✅ Push | Last-write-wins |
| Billing Address | ✅ Pull | ✅ Push | Last-write-wins |
| Shipping Address | ✅ Pull | ✅ Push | Last-write-wins |
| Company | ✅ Pull | ✅ Push | Last-write-wins |
| Notes | ✅ Pull | ✅ Push | Append (merge) |

### 2.3 Order Fields

| Field | WooCommerce → POS | POS → WooCommerce | Conflict Rule |
|-------|-------------------|-------------------|---------------|
| Order Number | ✅ Pull | ❌ No | WooCommerce authoritative |
| Status | ✅ Pull | ✅ Push | Last-write-wins |
| Line Items | ✅ Pull | ❌ No | WooCommerce authoritative |
| Totals | ✅ Pull | ❌ No | WooCommerce authoritative |
| Customer | ✅ Pull | ❌ No | WooCommerce authoritative |
| Shipping | ✅ Pull | ❌ No | WooCommerce authoritative |
| Payment Method | ✅ Pull | ❌ No | WooCommerce authoritative |
| Notes | ✅ Pull | ✅ Push | Append (merge) |

### 2.4 Inventory Fields

| Field | WooCommerce → POS | POS → WooCommerce | Conflict Rule |
|-------|-------------------|-------------------|---------------|
| Quantity | ✅ Pull | ✅ Push | **Special: Delta sync** |
| Reserved | ❌ No | ✅ Push | POS authoritative |
| Reorder Point | ❌ No | ✅ Push | POS authoritative |
| Location | ❌ No | ✅ Push | POS authoritative |

**Delta Sync for Inventory:**
- POS sale: Decrement local, queue delta (-N) for remote
- Woo sale: Pull delta, apply to local
- Conflict: Sum deltas, not replace

---

## 3. CONFLICT RESOLUTION STRATEGIES

### 3.1 Strategy Definitions

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `LastWriteWins` | Most recent `updated_at` wins | Default for most entities |
| `LocalWins` | POS version always wins | Offline-critical data |
| `RemoteWins` | Remote version always wins | Source-of-truth data |
| `Merge` | Combine both versions | Customer notes, tags |
| `Manual` | Queue for human review | Financial discrepancies |

### 3.2 Entity-Specific Strategies

| Entity | Default Strategy | Override Allowed |
|--------|------------------|------------------|
| Products | `RemoteWins` (Woo) | ✅ Yes |
| Customers | `Merge` | ✅ Yes |
| Orders | `RemoteWins` (Woo) | ❌ No |
| Inventory | `LastWriteWins` | ✅ Yes |
| Invoices | `Manual` | ❌ No |
| Payments | `Manual` | ❌ No |
| Sales Receipts | `LocalWins` | ❌ No |

### 3.3 Conflict Detection

```
Conflict detected when:
1. Same entity modified in both systems since last sync
2. local.updated_at > last_sync_at AND remote.updated_at > last_sync_at
3. local.sync_version != remote.sync_version
```

---

## 4. DELETE POLICY MATRIX

### 4.1 Default Policies

| Entity | Local Delete | Remote Delete | Archive |
|--------|--------------|---------------|---------|
| Products | ✅ Soft delete | ❌ Never | ✅ Yes |
| Customers | ✅ Soft delete | ❌ Never | ✅ Yes |
| Orders | ❌ Never | ❌ Never | ✅ Yes |
| Inventory | ✅ Zero out | ❌ Never | ✅ Yes |
| Invoices | ❌ Never | ❌ Never | ✅ Yes |

### 4.2 Configurable Delete Policies

| Policy | Description | Guard |
|--------|-------------|-------|
| `LocalOnly` | Delete locally, remote unchanged | Default |
| `ArchiveRemote` | Archive locally, mark inactive remotely | Requires confirmation |
| `DeleteRemote` | Delete both local and remote | Requires role + confirmation + delay |

### 4.3 Delete Guards

```
Remote delete requires:
1. User has 'admin' or 'manager' role
2. Explicit confirmation dialog
3. 24-hour delay (configurable)
4. Audit log entry
5. Undo window (7 days)
```

---

## 5. SYNC TIMING RULES

### 5.1 Trigger Types

| Trigger | Description | Entities |
|---------|-------------|----------|
| Immediate | On entity change | Inventory (sale) |
| Scheduled | Cron-based | Products, Customers, Orders |
| Manual | User-initiated | All |
| Webhook | External event | Orders (Woo webhook) |

### 5.2 Default Schedules

| Entity | Default Schedule | Mode |
|--------|------------------|------|
| Products | Every 6 hours | Incremental |
| Customers | Every 6 hours | Incremental |
| Orders | Every hour | Incremental |
| Inventory | Immediate + hourly | Delta |
| Invoices | Every 15 minutes | Incremental |

### 5.3 Rate Limits

| Platform | Requests/Minute | Batch Size |
|----------|-----------------|------------|
| WooCommerce | 40 | 100 |
| QuickBooks | 500 | 30 |
| Supabase | 1000 | 1000 |

---

## 6. CONFIGURATION SCHEMA

### 6.1 Global Sync Config

```json
{
  "sync_enabled": true,
  "global_direction": "bidirectional",
  "delete_policy": "local_only",
  "conflict_strategy": "last_write_wins",
  "rate_limit_per_minute": 40,
  "batch_size": 100,
  "retry_policy": {
    "max_retries": 10,
    "base_delay_ms": 1000,
    "max_delay_ms": 300000
  }
}
```

### 6.2 Entity Override Config

```json
{
  "entity_overrides": {
    "products": {
      "direction": "pull",
      "conflict_strategy": "remote_wins",
      "schedule": "0 */6 * * *"
    },
    "inventory": {
      "direction": "bidirectional",
      "conflict_strategy": "last_write_wins",
      "immediate_on_sale": true
    },
    "customers": {
      "direction": "bidirectional",
      "conflict_strategy": "merge"
    }
  }
}
```

### 6.3 Field Override Config

```json
{
  "field_overrides": {
    "products": {
      "price": {
        "direction": "pull",
        "authoritative": "woocommerce"
      },
      "cost": {
        "direction": "push",
        "authoritative": "pos"
      }
    }
  }
}
```

---

## 7. IMPLEMENTATION NOTES

### 7.1 Existing Implementation

The `SyncDirectionControl` service already supports:
- Per-entity direction configuration
- Direction values: `pull`, `push`, `bidirectional`, `disabled`
- Database storage in `sync_direction_config` table

### 7.2 Missing Implementation

Need to add:
- Field-level direction control
- Delete policy configuration
- Conflict strategy configuration
- UI for all configuration options

### 7.3 Migration Path

1. Add new columns to `sync_direction_config` table
2. Extend `SyncDirectionControl` service
3. Add frontend UI components
4. Document configuration options
