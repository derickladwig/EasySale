# Design Document: Backend Stability Fixes

## Overview

This design addresses critical stability issues in the EasySale Rust backend that prevent reliable system operation. The fixes target three main areas: migration system parsing, scheduler configuration, and missing database schemas. The design ensures graceful degradation of optional services while maintaining core functionality.

## Architecture

### Current System State

The backend uses:
- **SQLite** for local data storage
- **Custom migration system** for schema versioning
- **tokio-cron-scheduler 0.10** for scheduled tasks
- **Actix-web** for HTTP server
- **Multiple background services** (backup, sync, token refresh)

### Problem Areas

1. **Migration Parser**: Splits SQL triggers incorrectly at semicolons inside CASE...END blocks
2. **Backup Scheduler**: Uses 6-field cron expressions incompatible with tokio-cron-scheduler 0.10
3. **Missing Tables**: sync_schedules and integration_credentials tables don't exist
4. **Service Coupling**: Optional service failures crash the entire backend
5. **Code Quality**: 353 compiler warnings obscure real issues

## Components and Interfaces

### 1. Migration System (`src/db/migrations.rs`)

**Current Implementation:**
```rust
pub struct MigrationRunner {
    pool: SqlitePool,
}

impl MigrationRunner {
    fn parse_statements(sql: &str) -> Vec<String> {
        // Splits on semicolons, tracks BEGIN...END depth
        // BUG: Doesn't track CASE...END depth
    }
}
```

**Fixed Implementation:**
```rust
fn parse_statements(sql: &str) -> Vec<String> {
    let mut statements = Vec::new();
    let mut current = String::new();
    let mut begin_end_depth = 0;
    let mut case_depth = 0;  // NEW: Track CASE blocks
    
    for line in sql.lines() {
        let trimmed = line.trim().to_uppercase();
        
        // Track CASE blocks
        if trimmed.starts_with("CASE") {
            case_depth += 1;
        }
        
        // Handle END keyword
        if trimmed.starts_with("END") {
            if case_depth > 0 {
                case_depth -= 1;  // Close CASE first
            } else if begin_end_depth > 0 {
                begin_end_depth -= 1;  // Then close BEGIN
            }
        }
        
        // Track BEGIN blocks
        if trimmed.starts_with("BEGIN") {
            begin_end_depth += 1;
        }
        
        current.push_str(line);
        current.push('\n');
        
        // Only split on semicolon if not inside any block
        if line.trim().ends_with(';') && begin_end_depth == 0 && case_depth == 0 {
            statements.push(current.trim().to_string());
            current.clear();
        }
    }
    
    statements
}
```

**Interface:**
- Input: SQL file content as string
- Output: Vector of complete SQL statements
- Error: Returns detailed error with statement number and content

### 2. Backup Scheduler (`src/services/scheduler_service.rs`)

**Current Implementation:**
```rust
pub struct BackupScheduler {
    scheduler: JobScheduler,
}

impl BackupScheduler {
    pub async fn new(pool: SqlitePool) -> Result<Self> {
        let scheduler = JobScheduler::new().await?;
        
        // BUG: Uses 6-field cron (includes seconds)
        scheduler.add(Job::new_async("0 0 * * * *", |_, _| {
            Box::pin(async move {
                // Hourly backup
            })
        })?).await?;
        
        Ok(Self { scheduler })
    }
}
```

**Fixed Implementation:**
```rust
impl BackupScheduler {
    pub async fn new(pool: SqlitePool) -> Result<Self> {
        let scheduler = JobScheduler::new().await?;
        
        // Load backup settings from database
        let settings = load_backup_settings(&pool).await?;
        
        // Use 5-field cron expressions (no seconds field)
        if settings.hourly_enabled {
            scheduler.add(Job::new_async("0 * * * *", move |_, _| {
                // Runs at :00 of every hour
                Box::pin(async move {
                    run_incremental_backup().await;
                })
            })?).await?;
        }
        
        if settings.daily_enabled {
            scheduler.add(Job::new_async("59 23 * * *", move |_, _| {
                // Runs at 23:59 every day
                Box::pin(async move {
                    run_full_backup().await;
                })
            })?).await?;
        }
        
        if settings.weekly_enabled {
            scheduler.add(Job::new_async("0 3 * * 0", move |_, _| {
                // Runs at 3:00 AM on Sunday
                Box::pin(async move {
                    run_file_backup().await;
                })
            })?).await?;
        }
        
        if settings.monthly_enabled {
            scheduler.add(Job::new_async("0 4 1 * *", move |_, _| {
                // Runs at 4:00 AM on 1st of month
                Box::pin(async move {
                    run_monthly_backup().await;
                })
            })?).await?;
        }
        
        Ok(Self { scheduler })
    }
}
```

**Cron Expression Format:**
- **5-field format**: `minute hour day month weekday`
- **Hourly**: `0 * * * *` (every hour at :00)
- **Daily**: `59 23 * * *` (every day at 23:59)
- **Weekly**: `0 3 * * 0` (Sunday at 3:00 AM)
- **Monthly**: `0 4 1 * *` (1st of month at 4:00 AM)

### 3. Database Migrations

**New Migration: 026_sync_schedules.sql**
```sql
-- Sync schedule configuration table
CREATE TABLE IF NOT EXISTS sync_schedules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,  -- 'products', 'customers', 'orders', etc.
    cron_expression TEXT NOT NULL,  -- 5-field cron format
    enabled INTEGER NOT NULL DEFAULT 1,
    last_run_at TEXT,
    next_run_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX idx_sync_schedules_tenant ON sync_schedules(tenant_id);
CREATE INDEX idx_sync_schedules_store ON sync_schedules(store_id);
CREATE INDEX idx_sync_schedules_enabled ON sync_schedules(enabled);
CREATE INDEX idx_sync_schedules_next_run ON sync_schedules(next_run_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_sync_schedules_timestamp
AFTER UPDATE ON sync_schedules
FOR EACH ROW
BEGIN
    UPDATE sync_schedules 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;
```

**New Migration: 027_oauth_states.sql**
```sql
-- OAuth state tracking for security
CREATE TABLE IF NOT EXISTS oauth_states (
    state TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    integration_type TEXT NOT NULL,
    redirect_uri TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX idx_oauth_states_expires ON oauth_states(expires_at);
CREATE INDEX idx_oauth_states_tenant ON oauth_states(tenant_id);
```

**New Migration: 028_confirmation_tokens.sql**
```sql
-- Confirmation tokens for OAuth flows
CREATE TABLE IF NOT EXISTS confirmation_tokens (
    token TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    integration_type TEXT NOT NULL,
    auth_code TEXT NOT NULL,
    realm_id TEXT,  -- For QuickBooks
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    used INTEGER NOT NULL DEFAULT 0,
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

CREATE INDEX idx_confirmation_tokens_expires ON confirmation_tokens(expires_at);
CREATE INDEX idx_confirmation_tokens_tenant ON confirmation_tokens(tenant_id);
```

**New Migration: 022_integration_credentials.sql**
```sql
-- Integration credentials storage
CREATE TABLE IF NOT EXISTS integration_credentials (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    integration_type TEXT NOT NULL,  -- 'quickbooks', 'woocommerce', etc.
    access_token TEXT NOT NULL,  -- Encrypted
    refresh_token TEXT,  -- Encrypted, nullable
    token_expires_at TEXT,
    scopes TEXT,  -- JSON array
    realm_id TEXT,  -- For QuickBooks
    metadata TEXT,  -- JSON for additional integration-specific data
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
    
    -- Only one credential per integration per store
    UNIQUE(store_id, integration_type)
);

CREATE INDEX idx_integration_credentials_tenant ON integration_credentials(tenant_id);
CREATE INDEX idx_integration_credentials_store ON integration_credentials(store_id);
CREATE INDEX idx_integration_credentials_type ON integration_credentials(integration_type);
CREATE INDEX idx_integration_credentials_expiry ON integration_credentials(token_expires_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_integration_credentials_timestamp
AFTER UPDATE ON integration_credentials
FOR EACH ROW
BEGIN
    UPDATE integration_credentials 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;
```

### 4. Service Initialization (`src/main.rs`)

**Current Implementation:**
```rust
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let pool = create_pool().await?;
    
    // BUG: Any service failure crashes the backend
    let backup_scheduler = BackupScheduler::new(pool.clone()).await?;
    let sync_scheduler = SyncScheduler::new(pool.clone()).await?;
    let token_refresh = TokenRefreshService::new(pool.clone()).await?;
    
    HttpServer::new(move || {
        App::new()
            .app_data(web::Data::new(pool.clone()))
            .app_data(web::Data::new(backup_scheduler.clone()))
            .app_data(web::Data::new(sync_scheduler.clone()))
            .app_data(web::Data::new(token_refresh.clone()))
    })
    .bind("0.0.0.0:8923")?
    .run()
    .await
}
```

**Fixed Implementation:**
```rust
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    tracing_subscriber::fmt::init();
    
    // Core services (required)
    let pool = create_pool().await
        .expect("Failed to create database pool - cannot continue");
    
    run_migrations(&pool).await
        .expect("Failed to run migrations - cannot continue");
    
    // Optional services (graceful degradation)
    let backup_scheduler = match BackupScheduler::new(pool.clone()).await {
        Ok(scheduler) => {
            match scheduler.start().await {
                Ok(_) => {
                    tracing::info!("Backup scheduler started successfully");
                    Some(Arc::new(scheduler))
                }
                Err(e) => {
                    tracing::warn!("Failed to start backup scheduler: {}. Backups will be disabled.", e);
                    None
                }
            }
        }
        Err(e) => {
            tracing::warn!("Failed to initialize backup scheduler: {}. Backups will be disabled.", e);
            None
        }
    };
    
    let sync_scheduler = match SyncScheduler::new(pool.clone()).await {
        Ok(scheduler) => {
            match scheduler.start().await {
                Ok(_) => {
                    tracing::info!("Sync scheduler started successfully");
                    Some(Arc::new(scheduler))
                }
                Err(e) => {
                    tracing::warn!("Failed to start sync scheduler: {}. Sync will be disabled.", e);
                    None
                }
            }
        }
        Err(e) => {
            tracing::warn!("Failed to initialize sync scheduler: {}. Sync will be disabled.", e);
            None
        }
    };
    
    let token_refresh = match TokenRefreshService::new(pool.clone()).await {
        Ok(service) => {
            match service.start().await {
                Ok(_) => {
                    tracing::info!("Token refresh service started successfully");
                    Some(Arc::new(service))
                }
                Err(e) => {
                    tracing::warn!("Failed to start token refresh service: {}. Token refresh will be disabled.", e);
                    None
                }
            }
        }
        Err(e) => {
            tracing::warn!("Failed to initialize token refresh service: {}. Token refresh will be disabled.", e);
            None
        }
    };
    
    tracing::info!("Starting HTTP server on 0.0.0.0:8923");
    
    HttpServer::new(move || {
        let mut app = App::new()
            .app_data(web::Data::new(pool.clone()));
        
        // Add optional services if available
        if let Some(ref scheduler) = backup_scheduler {
            app = app.app_data(web::Data::new(scheduler.clone()));
        }
        if let Some(ref scheduler) = sync_scheduler {
            app = app.app_data(web::Data::new(scheduler.clone()));
        }
        if let Some(ref service) = token_refresh {
            app = app.app_data(web::Data::new(service.clone()));
        }
        
        app.configure(configure_routes)
    })
    .bind("0.0.0.0:8923")?
    .run()
    .await
}
```

### 5. Health Check Enhancement (`src/handlers/health.rs`)

**Enhanced Health Response:**
```rust
#[derive(Serialize)]
pub struct HealthResponse {
    status: String,  // "healthy", "degraded", "unhealthy"
    timestamp: i64,
    version: String,
    services: ServiceStatus,
}

#[derive(Serialize)]
pub struct ServiceStatus {
    database: ServiceHealth,
    http_server: ServiceHealth,
    backup_scheduler: Option<ServiceHealth>,
    sync_scheduler: Option<ServiceHealth>,
    token_refresh: Option<ServiceHealth>,
}

#[derive(Serialize)]
pub struct ServiceHealth {
    status: String,  // "healthy", "degraded", "failed"
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    last_check: Option<i64>,
}

pub async fn health_check(
    pool: web::Data<SqlitePool>,
    backup: Option<web::Data<Arc<BackupScheduler>>>,
    sync: Option<web::Data<Arc<SyncScheduler>>>,
    token: Option<web::Data<Arc<TokenRefreshService>>>,
) -> impl Responder {
    let mut services = ServiceStatus {
        database: check_database(&pool).await,
        http_server: ServiceHealth {
            status: "healthy".to_string(),
            error: None,
            last_check: Some(chrono::Utc::now().timestamp()),
        },
        backup_scheduler: backup.map(|s| s.health_status()),
        sync_scheduler: sync.map(|s| s.health_status()),
        token_refresh: token.map(|s| s.health_status()),
    };
    
    let overall_status = if services.database.status == "healthy" {
        "healthy"  // Core services OK, optional services can be degraded
    } else {
        "unhealthy"  // Core service failed
    };
    
    HttpResponse::Ok().json(HealthResponse {
        status: overall_status.to_string(),
        timestamp: chrono::Utc::now().timestamp(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        services,
    })
}
```

## Data Models

### Sync Schedule Model
```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct SyncSchedule {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub entity_type: String,  // "products", "customers", "orders"
    pub cron_expression: String,  // 5-field cron format
    pub enabled: bool,
    pub last_run_at: Option<DateTime<Utc>>,
    pub next_run_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

### Integration Credential Model
```rust
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct IntegrationCredential {
    pub id: String,
    pub tenant_id: String,
    pub store_id: String,
    pub integration_type: String,  // "quickbooks", "woocommerce"
    #[serde(skip_serializing)]
    pub access_token: String,  // Encrypted
    #[serde(skip_serializing)]
    pub refresh_token: Option<String>,  // Encrypted
    pub token_expires_at: Option<DateTime<Utc>>,
    pub scopes: Option<Vec<String>>,  // Stored as JSON
    pub realm_id: Option<String>,  // QuickBooks specific
    pub metadata: Option<serde_json::Value>,  // Integration-specific data
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Migration Statement Completeness
*For any* SQL file containing triggers with CASE...END blocks, parsing the file should produce complete trigger statements where each trigger has matching BEGIN...END and CASE...END pairs.

**Validates: Requirements 1.1, 1.3**

### Property 2: Cron Expression Validity
*For any* backup schedule configuration, all generated cron expressions should be valid 5-field format and parseable by tokio-cron-scheduler.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: Service Degradation Isolation
*For any* optional service initialization failure, the backend should continue startup and the health endpoint should remain accessible.

**Validates: Requirements 2.6, 3.3, 4.3, 6.1, 6.2, 6.3, 6.5**

### Property 4: Schema Existence
*For any* service requiring a database table, either the table exists or the service fails gracefully without crashing the backend.

**Validates: Requirements 3.1, 3.2, 4.1, 4.2**

### Property 5: Foreign Key Nullability
*For any* price history record with NULL changed_by, querying the record should succeed without foreign key constraint violations.

**Validates: Requirements 5.2, 5.4, 5.5**

## Error Handling

### Migration Errors
- **Parse Error**: Log statement number and SQL content, exit with error code 1
- **Execution Error**: Log statement number, SQL content, and SQLite error, exit with error code 1
- **Rollback**: Not implemented (SQLite doesn't support transactional DDL)

### Scheduler Errors
- **Invalid Cron**: Log warning, skip that schedule, continue with other schedules
- **Job Execution Error**: Log error, continue scheduler operation
- **Initialization Error**: Log warning, return None, allow backend to start

### Service Errors
- **Database Connection**: Fatal error, exit with error code 1
- **Migration Failure**: Fatal error, exit with error code 1
- **Optional Service Failure**: Log warning, continue operation

## Testing Strategy

### Unit Tests

**Migration Parser Tests:**
- Test CASE...END handling in triggers
- Test nested BEGIN...END blocks
- Test comment stripping
- Test statement splitting at correct boundaries

**Cron Expression Tests:**
- Test 5-field format generation
- Test hourly schedule: `0 * * * *`
- Test daily schedule: `59 23 * * *`
- Test weekly schedule: `0 3 * * 0`
- Test monthly schedule: `0 4 1 * *`

**Service Initialization Tests:**
- Test graceful degradation when optional services fail
- Test backend starts with all services
- Test backend starts with no optional services
- Test health endpoint reports correct status

### Integration Tests

**Migration System:**
- Run all migrations from scratch
- Verify all tables created
- Verify all triggers work
- Verify foreign key constraints

**Scheduler System:**
- Initialize scheduler with various configurations
- Verify jobs are scheduled
- Verify cron expressions are valid
- Test job execution (mocked)

**Health Endpoint:**
- Test with all services healthy
- Test with optional services degraded
- Test with database failure
- Verify response format

### Property-Based Tests

**Property 1 Test:**
```rust
#[test]
fn test_migration_parser_completeness() {
    // Generate random SQL with nested CASE...END and BEGIN...END
    // Parse statements
    // Verify each trigger has matching pairs
    // Verify no statements are split mid-trigger
}
```

**Property 2 Test:**
```rust
#[test]
fn test_cron_expression_validity() {
    // Generate random backup configurations
    // Generate cron expressions
    // Verify all expressions are 5-field format
    // Verify all expressions parse successfully
}
```

**Property 3 Test:**
```rust
#[test]
fn test_service_degradation() {
    // Simulate various service failures
    // Verify backend starts successfully
    // Verify health endpoint accessible
    // Verify core functionality works
}
```

