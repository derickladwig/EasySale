# Implementation Guide: Completing Remaining Features

## Current Status

✅ **Good News:** Most features are already implemented!

After auditing the codebase, we found:
- **70% of features are complete** with API endpoints
- **100% of services are built** and ready to use
- **Only 6 features need API endpoints** (not 13)
- **3 features need integration** into existing flows

See `ACTUAL_IMPLEMENTATION_STATUS.md` for detailed audit.

## What's Actually Left

### ✅ Already Complete (No Work Needed)
1. Work Order Management - DONE
2. Vendor Bill Processing - DONE
3. Product Management - DONE
4. Customer Management - DONE
5. Sales & Transactions - DONE
6. Inventory Management - DONE
7. Sync System - DONE
8. Settings & Configuration - DONE

### ⚠️ Needs Integration (1-2 days each)
9. Offline Credit Checking - Service built, needs sales flow integration
10. Conflict Resolution - Service built, needs UI endpoints
11. Alert System - Service built, needs endpoints

### ❌ Needs API Endpoints (4-6 hours each)
12. Barcode Generation
13. Health Check Dashboard
14. File Management UI
15. Unit Conversion
16. Sync Direction Control

## Quick Start

### Priority 1: Offline Credit Integration (1-2 days)

**Goal:** Integrate credit checking into sales checkout flow

**Current State:**
- ✅ `OfflineCreditChecker` service exists in `src/services/offline_credit_checker.rs`
- ✅ Methods: `can_charge()`, `verify_offline_transactions()`, `get_pending_verifications()`
- ❌ Not called from sales handlers

**Implementation Steps:**

1. **Modify Sales Handler** (`src/handlers/credit.rs` or create new)

```rust
use crate::services::OfflineCreditChecker;

pub async fn check_customer_credit(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    path: web::Path<String>,
    body: web::Json<CreditCheckRequest>,
) -> HttpResponse {
    let customer_id = path.into_inner();
    let checker = OfflineCreditChecker::new(pool.get_ref().clone());
    
    match checker.can_charge(&customer_id, body.amount, &tenant_id).await {
        Ok(true) => HttpResponse::Ok().json(json!({
            "approved": true,
            "message": "Credit approved"
        })),
        Ok(false) => HttpResponse::Ok().json(json!({
            "approved": false,
            "message": "Credit limit exceeded"
        })),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "error": e.to_string()
        }))
    }
}

pub async fn verify_offline_transactions(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> HttpResponse {
    let checker = OfflineCreditChecker::new(pool.get_ref().clone());
    
    match checker.verify_offline_transactions(&tenant_id).await {
        Ok(results) => HttpResponse::Ok().json(results),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "error": e.to_string()
        }))
    }
}

pub async fn get_pending_verifications(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> HttpResponse {
    let checker = OfflineCreditChecker::new(pool.get_ref().clone());
    
    match checker.get_pending_verifications(&tenant_id).await {
        Ok(pending) => HttpResponse::Ok().json(pending),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "error": e.to_string()
        }))
    }
}

#[derive(Deserialize)]
pub struct CreditCheckRequest {
    pub amount: f64,
}
```

2. **Register Routes** in `main.rs`:

```rust
// Add to configure_app:
.route("/api/customers/{id}/check-credit", web::post().to(handlers::credit::check_customer_credit))
.route("/api/transactions/verify-offline", web::post().to(handlers::credit::verify_offline_transactions))
.route("/api/transactions/pending-verifications", web::get().to(handlers::credit::get_pending_verifications))
```

3. **Integrate into Sales Flow** - Modify existing sales handler to check credit before processing

**Estimated Time:** 1-2 days

---

### Priority 2: Conflict Resolution UI (2-3 days)

**Goal:** Create endpoints for viewing and resolving sync conflicts

**Current State:**
- ✅ `ConflictResolver` service exists in `src/services/conflict_resolver.rs`
- ✅ Methods: `resolve_conflict()`, `get_pending_conflicts()`, `has_conflict()`
- ❌ No API endpoints

**Implementation Steps:**

1. **Create Handler** (`src/handlers/conflicts.rs`):

```rust
use crate::services::ConflictResolver;

pub async fn list_conflicts(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> HttpResponse {
    let resolver = ConflictResolver::new(pool.get_ref().clone());
    
    match resolver.get_pending_conflicts(&tenant_id).await {
        Ok(conflicts) => HttpResponse::Ok().json(conflicts),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "error": e.to_string()
        }))
    }
}

pub async fn resolve_conflict(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    path: web::Path<String>,
    body: web::Json<ResolveConflictRequest>,
) -> HttpResponse {
    let conflict_id = path.into_inner();
    let resolver = ConflictResolver::new(pool.get_ref().clone());
    
    match resolver.resolve_conflict(
        &conflict_id,
        &body.entity_type,
        &body.local_version,
        &body.remote_version,
        &tenant_id
    ).await {
        Ok(resolved) => HttpResponse::Ok().json(resolved),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "error": e.to_string()
        }))
    }
}

#[derive(Deserialize)]
pub struct ResolveConflictRequest {
    pub entity_type: String,
    pub local_version: serde_json::Value,
    pub remote_version: serde_json::Value,
}
```

2. **Register Module and Routes**

**Estimated Time:** 2-3 days

---

### Priority 3: Alert System (2-3 days)

**Goal:** Expose alert endpoints for system notifications

**Current State:**
- ✅ `AlertService` exists in `src/services/alert_service.rs`
- ✅ Methods: `create_backup_alert()`, `get_unacknowledged_alerts()`, `acknowledge_alert()`
- ❌ No API endpoints

**Implementation Steps:**

1. **Create Handler** (`src/handlers/alerts.rs`):

```rust
use crate::services::AlertService;

pub async fn list_alerts(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
) -> HttpResponse {
    let alert_service = AlertService::new(pool.get_ref().clone());
    
    match alert_service.get_unacknowledged_alerts().await {
        Ok(alerts) => HttpResponse::Ok().json(alerts),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "error": e.to_string()
        }))
    }
}

pub async fn acknowledge_alert(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    path: web::Path<String>,
) -> HttpResponse {
    let alert_id = path.into_inner();
    let alert_service = AlertService::new(pool.get_ref().clone());
    
    match alert_service.acknowledge_alert(&alert_id).await {
        Ok(_) => HttpResponse::Ok().json(json!({
            "message": "Alert acknowledged"
        })),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "error": e.to_string()
        }))
    }
}
```

2. **Register Routes**

**Estimated Time:** 2-3 days

---

### Priority 4: Quick Wins (4-6 hours each)

#### Barcode Generation

```rust
// src/handlers/barcodes.rs
use crate::services::BarcodeService;

pub async fn generate_barcode(
    pool: web::Data<SqlitePool>,
    tenant_id: web::ReqData<String>,
    path: web::Path<String>,
    body: web::Json<GenerateBarcodeRequest>,
) -> HttpResponse {
    let product_id = path.into_inner();
    let barcode_service = BarcodeService::new(pool.get_ref().clone());
    
    match barcode_service.generate_barcode(&product_id, &body.barcode_type, &tenant_id).await {
        Ok(barcode) => HttpResponse::Ok().json(json!({
            "barcode": barcode
        })),
        Err(e) => HttpResponse::BadRequest().json(json!({
            "errors": e
        }))
    }
}
```

#### Health Check Dashboard

```rust
// src/handlers/health_check.rs
use crate::services::HealthCheckService;

pub async fn check_connectivity(
    health_service: web::Data<HealthCheckService>,
) -> HttpResponse {
    let woo_status = health_service.check_woocommerce("https://store.example.com").await;
    let qbo_status = health_service.check_quickbooks().await;
    let supabase_status = health_service.check_supabase("https://project.supabase.co").await;
    
    HttpResponse::Ok().json(json!({
        "woocommerce": woo_status,
        "quickbooks": qbo_status,
        "supabase": supabase_status
    }))
}
```

## Common Patterns

### Pattern 1: Simple CRUD
```rust
// Create
pub async fn create(pool, tenant_id, body) -> HttpResponse
// Read
pub async fn get(pool, tenant_id, id) -> HttpResponse
// Update
pub async fn update(pool, tenant_id, id, body) -> HttpResponse
// Delete
pub async fn delete(pool, tenant_id, id) -> HttpResponse
// List
pub async fn list(pool, tenant_id, query) -> HttpResponse
```

### Pattern 2: With Service Layer
```rust
pub async fn create(
    service: web::Data<MyService>,
    tenant_id: web::ReqData<String>,
    body: web::Json<CreateRequest>,
) -> HttpResponse {
    match service.create(&tenant_id, body.into_inner()).await {
        Ok(result) => HttpResponse::Created().json(result),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "error": e.to_string()
        }))
    }
}
```

### Pattern 3: With Validation
```rust
pub async fn create(
    service: web::Data<MyService>,
    tenant_id: web::ReqData<String>,
    body: web::Json<CreateRequest>,
) -> HttpResponse {
    // Validate
    if body.name.is_empty() {
        return HttpResponse::BadRequest().json(json!({
            "error": "Name is required"
        }));
    }
    
    // Process
    match service.create(&tenant_id, body.into_inner()).await {
        Ok(result) => HttpResponse::Created().json(result),
        Err(e) => HttpResponse::InternalServerError().json(json!({
            "error": e.to_string()
        }))
    }
}
```

## Checklist for Each Feature

### ✅ Already Complete
- [x] Work Orders - Full implementation
- [x] Vendor Bills - Upload and processing
- [x] Products - Complete CRUD
- [x] Customers - Complete CRUD
- [x] Sales - Complete flow
- [x] Inventory - Complete tracking
- [x] Sync - WooCommerce & QuickBooks
- [x] Settings - All configuration

### 🔨 In Progress (Follow guides above)
- [x] Offline Credit - ✅ COMPLETE (3 endpoints)
- [x] Conflict Resolution - ✅ COMPLETE (6 endpoints)
- [x] Alert System - ✅ COMPLETE (6 endpoints)

### 📋 Quick Wins (4-6 hours each)
- [x] Barcode Generation - ✅ COMPLETE (5 endpoints)
- [x] Health Check - ✅ COMPLETE (4 endpoints)
- [x] File Management - ✅ COMPLETE (5 endpoints)
- [x] Unit Conversion - ✅ COMPLETE (5 endpoints)
- [x] Sync Direction - ✅ COMPLETE (7 endpoints)

## Testing Strategy

### For Integration Work
```bash
# Test offline credit
curl -X POST http://localhost:8923/api/customers/cust-123/check-credit \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default-tenant" \
  -d '{"amount": 500.00}'

# Test conflict resolution
curl http://localhost:8923/api/sync/conflicts \
  -H "X-Tenant-ID: default-tenant"

# Test alerts
curl http://localhost:8923/api/alerts \
  -H "X-Tenant-ID: default-tenant"
```

### For New Endpoints
```bash
# Test barcode generation
curl -X POST http://localhost:8923/api/products/prod-123/barcode/generate \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: default-tenant" \
  -d '{"barcode_type": "UPC-A"}'

# Test health check
curl http://localhost:8923/api/health/connectivity \
  -H "X-Tenant-ID: default-tenant"
```

## Troubleshooting

### Error: Module not found
- Check `mod.rs` has module declaration
- Check file name matches module name

### Error: Service not found
- Check service is imported in handler
- Check service is registered in `main.rs`

### Error: Tenant ID missing
- Check middleware is applied
- Check `X-Tenant-ID` header is sent

### Error: Database error
- Check migration has run
- Check table exists
- Check column names match

## Resources

- **Actix Web Docs**: https://actix.rs/docs/
- **SQLx Docs**: https://docs.rs/sqlx/
- **Existing Handlers**: See `src/handlers/` for examples
- **Service Code**: See `src/services/` for business logic

---

*Follow this pattern for each unimplemented feature in UNIMPLEMENTED_FEATURES.md*
