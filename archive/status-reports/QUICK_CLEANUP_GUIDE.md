# Quick Cleanup Guide - Remove Mock Data

## Immediate Actions You Can Take

### 1. Hide Mock Stores (2 minutes)

**File**: `frontend/src/features/settings/pages/CompanyStoresPage.tsx`

**Change line 42** from:
```typescript
const [stores, _setStores] = useState<Store[]>(mockStores);
```

To:
```typescript
const [stores, _setStores] = useState<Store[]>([]);
```

This will show an empty stores list instead of 3 fake stores.

### 2. Show "No Data" Message on Dashboard (5 minutes)

**File**: `frontend/src/features/home/pages/HomePage.tsx`

**Replace lines 85-103** (recentAlerts) with:
```typescript
const recentAlerts: Alert[] = [];
```

**Replace lines 105-113** (recentTransactions) with:
```typescript
const recentTransactions: RecentTransaction[] = [];
```

**Add empty state message** around line 220:
```typescript
{recentAlerts.length === 0 ? (
  <div className="p-8 text-center text-dark-400">
    <AlertTriangle size={48} className="mx-auto mb-4 opacity-50" />
    <p>No alerts at this time</p>
  </div>
) : (
  <div className="divide-y divide-dark-700">
    {recentAlerts.map((alert) => (
      // ... existing alert rendering
    ))}
  </div>
)}
```

### 3. Update Stats to Show "Coming Soon" (3 minutes)

**File**: `frontend/src/features/home/pages/HomePage.tsx`

**Replace lines 143-166** with:
```typescript
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard
    label="Today's Sales"
    value="--"
    icon={DollarSign}
    variant="default"
  />
  <StatCard
    label="Transactions"
    value="--"
    icon={ShoppingCart}
    variant="success"
  />
  <StatCard
    label="Avg. Transaction"
    value="--"
    icon={DollarSign}
    variant="warning"
  />
  <StatCard
    label="Items Sold"
    value="--"
    icon={Package}
    variant="info"
  />
</div>
```

### 4. Verify Theme Colors After Rebuild

Once `.\build-prod.bat` completes:

1. Open http://192.168.2.65:7945
2. Login with admin/admin123
3. Check if buttons are orange (#f97316) instead of blue
4. Check if "Quick Actions" use orange theme
5. If still blue, check browser console for CSS variable values:
   ```javascript
   getComputedStyle(document.documentElement).getPropertyValue('--color-primary-500')
   ```

## Backend API Implementation Priority

### Phase 1: Dashboard Stats (High Priority)

**Create**: `backend/rust/src/handlers/stats.rs`

```rust
use actix_web::{get, web, HttpResponse, Responder};
use sqlx::SqlitePool;

#[get("/api/stats/dashboard")]
pub async fn get_dashboard_stats(pool: web::Data<SqlitePool>) -> impl Responder {
    // Query real data from sales_transactions table
    let daily_sales: f64 = sqlx::query_scalar(
        "SELECT COALESCE(SUM(total_amount), 0) FROM sales_transactions 
         WHERE DATE(created_at) = DATE('now') AND tenant_id = ?"
    )
    .bind(get_current_tenant_id())
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0.0);
    
    let transactions: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sales_transactions 
         WHERE DATE(created_at) = DATE('now') AND tenant_id = ?"
    )
    .bind(get_current_tenant_id())
    .fetch_one(pool.get_ref())
    .await
    .unwrap_or(0);
    
    HttpResponse::Ok().json(serde_json::json!({
        "dailySales": daily_sales,
        "transactions": transactions,
        "avgTransaction": if transactions > 0 { daily_sales / transactions as f64 } else { 0.0 },
        "itemsSold": 0 // TODO: Calculate from line items
    }))
}
```

**Register in**: `backend/rust/src/main.rs`

```rust
mod handlers {
    pub mod auth;
    pub mod stats; // Add this
    // ... other handlers
}

// In configure_routes:
.service(handlers::stats::get_dashboard_stats)
```

### Phase 2: Recent Data (Medium Priority)

**Alerts endpoint**:
```rust
#[get("/api/alerts/recent")]
pub async fn get_recent_alerts(pool: web::Data<SqlitePool>) -> impl Responder {
    // Query from inventory for low stock alerts
    let alerts = sqlx::query_as::<_, Alert>(
        "SELECT id, 'warning' as type, 
         'Low stock: ' || name || ' (' || quantity || ' remaining)' as message,
         updated_at as time
         FROM products 
         WHERE quantity < min_quantity AND tenant_id = ?
         ORDER BY updated_at DESC LIMIT 5"
    )
    .bind(get_current_tenant_id())
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();
    
    HttpResponse::Ok().json(alerts)
}
```

**Transactions endpoint**:
```rust
#[get("/api/transactions/recent")]
pub async fn get_recent_transactions(pool: web::Data<SqlitePool>) -> impl Responder {
    let transactions = sqlx::query_as::<_, Transaction>(
        "SELECT id, customer_name as customer, total_amount as amount,
         (SELECT COUNT(*) FROM sales_transaction_lines WHERE transaction_id = sales_transactions.id) as items,
         created_at as time, status
         FROM sales_transactions 
         WHERE tenant_id = ?
         ORDER BY created_at DESC LIMIT 10"
    )
    .bind(get_current_tenant_id())
    .fetch_all(pool.get_ref())
    .await
    .unwrap_or_default();
    
    HttpResponse::Ok().json(transactions)
}
```

### Phase 3: Settings (Lower Priority)

Payment settings, integrations, etc. can wait until core functionality is working.

## Testing Commands

```bash
# Check if backend is running
docker ps | grep EasySale-backend

# View backend logs
docker logs EasySale-backend --tail 50

# Test API endpoint
curl http://192.168.2.65:7945/api/stats/dashboard

# Restart containers
docker-compose -f docker-compose.prod.yml restart

# Rebuild frontend only
docker-compose -f docker-compose.prod.yml build frontend --no-cache
docker-compose -f docker-compose.prod.yml up -d frontend

# Rebuild backend only
docker-compose -f docker-compose.prod.yml build backend --no-cache
docker-compose -f docker-compose.prod.yml up -d backend
```

## Quick Verification Checklist

After making changes:

- [ ] Login works (admin/admin123)
- [ ] Dashboard loads without errors
- [ ] No mock data visible (or shows "No data" message)
- [ ] Theme colors are orange (not blue)
- [ ] No console errors in browser
- [ ] Backend logs show no errors

## Common Issues & Solutions

**Issue**: Theme still blue after rebuild
**Solution**: Clear browser cache (Ctrl+Shift+R) or open in incognito

**Issue**: "No data" everywhere
**Solution**: Expected until API endpoints are implemented

**Issue**: Build fails
**Solution**: Check for syntax errors in modified files

**Issue**: Container won't start
**Solution**: Check logs with `docker logs EasySale-frontend` or `docker logs EasySale-backend`

## Time Estimates

- Hide mock stores: 2 minutes
- Show "No data" messages: 5 minutes
- Implement dashboard stats API: 30 minutes
- Implement alerts API: 20 minutes
- Implement transactions API: 20 minutes
- Test everything: 15 minutes

**Total for basic cleanup**: ~1.5 hours
