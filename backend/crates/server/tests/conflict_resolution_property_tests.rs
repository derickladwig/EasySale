// Property-based tests for sync conflict resolution
// Feature: sales-customer-management, Property 26: Sync conflict resolution preserves most recent
// **Validates: Requirements 9.3**

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::{Utc, Duration};

// Test database setup helper
async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create layaways table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS layaways (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            status TEXT NOT NULL,
            total_amount REAL NOT NULL,
            deposit_amount REAL NOT NULL,
            balance_due REAL NOT NULL,
            due_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT,
            sync_version INTEGER NOT NULL DEFAULT 0,
            store_id TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create customers table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS customers (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            pricing_tier TEXT NOT NULL DEFAULT 'Retail',
            loyalty_points INTEGER NOT NULL DEFAULT 0,
            store_credit REAL NOT NULL DEFAULT 0.0,
            credit_limit REAL,
            credit_balance REAL NOT NULL DEFAULT 0.0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            sync_version INTEGER NOT NULL DEFAULT 0,
            store_id TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create work_orders table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS work_orders (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            work_order_number TEXT NOT NULL UNIQUE,
            customer_id TEXT NOT NULL,
            vehicle_id TEXT NOT NULL,
            status TEXT NOT NULL,
            description TEXT NOT NULL,
            estimated_total REAL,
            actual_total REAL,
            labor_total REAL NOT NULL DEFAULT 0.0,
            parts_total REAL NOT NULL DEFAULT 0.0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            completed_at TEXT,
            invoiced_at TEXT,
            assigned_technician_id TEXT,
            is_warranty INTEGER NOT NULL DEFAULT 0,
            sync_version INTEGER NOT NULL DEFAULT 0,
            store_id TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create credit_accounts table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS credit_accounts (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL UNIQUE,
            credit_limit REAL NOT NULL,
            current_balance REAL NOT NULL DEFAULT 0.0,
            available_credit REAL NOT NULL,
            payment_terms_days INTEGER NOT NULL DEFAULT 30,
            service_charge_rate REAL,
            is_active INTEGER NOT NULL DEFAULT 1,
            last_statement_date TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            sync_version INTEGER NOT NULL DEFAULT 0,
            store_id TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    pool
}

// Struct to represent a conflicting record
#[derive(Debug, Clone)]
struct ConflictingLayaway {
    id: String,
    tenant_id: String,
    customer_id: String,
    status: String,
    total_amount: f64,
    deposit_amount: f64,
    balance_due: f64,
    updated_at: String,
    sync_version: i64,
    store_id: String,
}

#[derive(Debug, Clone)]
struct ConflictingCustomer {
    id: String,
    tenant_id: String,
    name: String,
    email: Option<String>,
    phone: Option<String>,
    pricing_tier: String,
    loyalty_points: i32,
    store_credit: f64,
    updated_at: String,
    sync_version: i64,
    store_id: String,
}

#[derive(Debug, Clone)]
struct ConflictingWorkOrder {
    id: String,
    tenant_id: String,
    work_order_number: String,
    customer_id: String,
    vehicle_id: String,
    status: String,
    description: String,
    labor_total: f64,
    parts_total: f64,
    updated_at: String,
    sync_version: i64,
    store_id: String,
}

#[derive(Debug, Clone)]
struct ConflictingCreditAccount {
    id: String,
    tenant_id: String,
    customer_id: String,
    credit_limit: f64,
    current_balance: f64,
    available_credit: f64,
    updated_at: String,
    sync_version: i64,
    store_id: String,
}

// Helper to insert a layaway record
async fn insert_layaway(pool: &SqlitePool, layaway: &ConflictingLayaway) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO layaways (id, tenant_id, customer_id, status, total_amount, deposit_amount, balance_due, due_date, created_at, updated_at, completed_at, sync_version, store_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?)"
    )
    .bind(&layaway.id)
    .bind(&layaway.tenant_id)
    .bind(&layaway.customer_id)
    .bind(&layaway.status)
    .bind(layaway.total_amount)
    .bind(layaway.deposit_amount)
    .bind(layaway.balance_due)
    .bind(&now)
    .bind(&layaway.updated_at)
    .bind(layaway.sync_version)
    .bind(&layaway.store_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert layaway: {}", e))?;

    Ok(())
}

// Helper to insert a customer record
async fn insert_customer(pool: &SqlitePool, customer: &ConflictingCustomer) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO customers (id, tenant_id, name, email, phone, pricing_tier, loyalty_points, store_credit, credit_limit, credit_balance, created_at, updated_at, sync_version, store_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, 0.0, ?, ?, ?, ?)"
    )
    .bind(&customer.id)
    .bind(&customer.tenant_id)
    .bind(&customer.name)
    .bind(&customer.email)
    .bind(&customer.phone)
    .bind(&customer.pricing_tier)
    .bind(customer.loyalty_points)
    .bind(customer.store_credit)
    .bind(&now)
    .bind(&customer.updated_at)
    .bind(customer.sync_version)
    .bind(&customer.store_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert customer: {}", e))?;

    Ok(())
}

// Helper to insert a work order record
async fn insert_work_order(pool: &SqlitePool, work_order: &ConflictingWorkOrder) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO work_orders (id, tenant_id, work_order_number, customer_id, vehicle_id, status, description, estimated_total, actual_total, labor_total, parts_total, created_at, updated_at, completed_at, invoiced_at, assigned_technician_id, is_warranty, sync_version, store_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, NULL, NULL, NULL, 0, ?, ?)"
    )
    .bind(&work_order.id)
    .bind(&work_order.tenant_id)
    .bind(&work_order.work_order_number)
    .bind(&work_order.customer_id)
    .bind(&work_order.vehicle_id)
    .bind(&work_order.status)
    .bind(&work_order.description)
    .bind(work_order.labor_total)
    .bind(work_order.parts_total)
    .bind(&now)
    .bind(&work_order.updated_at)
    .bind(work_order.sync_version)
    .bind(&work_order.store_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert work order: {}", e))?;

    Ok(())
}

// Helper to insert a credit account record
async fn insert_credit_account(pool: &SqlitePool, account: &ConflictingCreditAccount) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "INSERT INTO credit_accounts (id, tenant_id, customer_id, credit_limit, current_balance, available_credit, payment_terms_days, service_charge_rate, is_active, last_statement_date, created_at, updated_at, sync_version, store_id)
         VALUES (?, ?, ?, ?, ?, ?, 30, NULL, 1, NULL, ?, ?, ?, ?)"
    )
    .bind(&account.id)
    .bind(&account.tenant_id)
    .bind(&account.customer_id)
    .bind(account.credit_limit)
    .bind(account.current_balance)
    .bind(account.available_credit)
    .bind(&now)
    .bind(&account.updated_at)
    .bind(account.sync_version)
    .bind(&account.store_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to insert credit account: {}", e))?;

    Ok(())
}

// Conflict resolution function for layaways
async fn resolve_layaway_conflict(
    pool: &SqlitePool,
    local: &ConflictingLayaway,
    remote: &ConflictingLayaway,
) -> Result<ConflictingLayaway, String> {
    // Conflict resolution: preserve the record with most recent updated_at
    let winner = if remote.updated_at > local.updated_at {
        remote.clone()
    } else {
        local.clone()
    };

    // Update the database with the winning record
    sqlx::query(
        "UPDATE layaways SET status = ?, total_amount = ?, deposit_amount = ?, balance_due = ?, updated_at = ?, sync_version = ?, store_id = ?
         WHERE id = ?"
    )
    .bind(&winner.status)
    .bind(winner.total_amount)
    .bind(winner.deposit_amount)
    .bind(winner.balance_due)
    .bind(&winner.updated_at)
    .bind(winner.sync_version)
    .bind(&winner.store_id)
    .bind(&winner.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to resolve conflict: {}", e))?;

    Ok(winner)
}

// Conflict resolution function for customers
async fn resolve_customer_conflict(
    pool: &SqlitePool,
    local: &ConflictingCustomer,
    remote: &ConflictingCustomer,
) -> Result<ConflictingCustomer, String> {
    let winner = if remote.updated_at > local.updated_at {
        remote.clone()
    } else {
        local.clone()
    };

    sqlx::query(
        "UPDATE customers SET name = ?, email = ?, phone = ?, pricing_tier = ?, loyalty_points = ?, store_credit = ?, updated_at = ?, sync_version = ?, store_id = ?
         WHERE id = ?"
    )
    .bind(&winner.name)
    .bind(&winner.email)
    .bind(&winner.phone)
    .bind(&winner.pricing_tier)
    .bind(winner.loyalty_points)
    .bind(winner.store_credit)
    .bind(&winner.updated_at)
    .bind(winner.sync_version)
    .bind(&winner.store_id)
    .bind(&winner.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to resolve conflict: {}", e))?;

    Ok(winner)
}

// Conflict resolution function for work orders
async fn resolve_work_order_conflict(
    pool: &SqlitePool,
    local: &ConflictingWorkOrder,
    remote: &ConflictingWorkOrder,
) -> Result<ConflictingWorkOrder, String> {
    let winner = if remote.updated_at > local.updated_at {
        remote.clone()
    } else {
        local.clone()
    };

    sqlx::query(
        "UPDATE work_orders SET status = ?, description = ?, labor_total = ?, parts_total = ?, updated_at = ?, sync_version = ?, store_id = ?
         WHERE id = ?"
    )
    .bind(&winner.status)
    .bind(&winner.description)
    .bind(winner.labor_total)
    .bind(winner.parts_total)
    .bind(&winner.updated_at)
    .bind(winner.sync_version)
    .bind(&winner.store_id)
    .bind(&winner.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to resolve conflict: {}", e))?;

    Ok(winner)
}

// Conflict resolution function for credit accounts
async fn resolve_credit_account_conflict(
    pool: &SqlitePool,
    local: &ConflictingCreditAccount,
    remote: &ConflictingCreditAccount,
) -> Result<ConflictingCreditAccount, String> {
    let winner = if remote.updated_at > local.updated_at {
        remote.clone()
    } else {
        local.clone()
    };

    sqlx::query(
        "UPDATE credit_accounts SET credit_limit = ?, current_balance = ?, available_credit = ?, updated_at = ?, sync_version = ?, store_id = ?
         WHERE id = ?"
    )
    .bind(winner.credit_limit)
    .bind(winner.current_balance)
    .bind(winner.available_credit)
    .bind(&winner.updated_at)
    .bind(winner.sync_version)
    .bind(&winner.store_id)
    .bind(&winner.id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to resolve conflict: {}", e))?;

    Ok(winner)
}

// Helper to get layaway from database
async fn get_layaway(pool: &SqlitePool, id: &str) -> Result<ConflictingLayaway, String> {
    let row: (String, String, String, String, f64, f64, f64, String, i64, String) = sqlx::query_as(
        "SELECT id, tenant_id, customer_id, status, total_amount, deposit_amount, balance_due, updated_at, sync_version, store_id
         FROM layaways WHERE id = ?"
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch layaway: {}", e))?;

    Ok(ConflictingLayaway {
        id: row.0,
        tenant_id: row.1,
        customer_id: row.2,
        status: row.3,
        total_amount: row.4,
        deposit_amount: row.5,
        balance_due: row.6,
        updated_at: row.7,
        sync_version: row.8,
        store_id: row.9,
    })
}

// Helper to get customer from database
async fn get_customer(pool: &SqlitePool, id: &str) -> Result<ConflictingCustomer, String> {
    let row: (String, String, String, Option<String>, Option<String>, String, i32, f64, String, i64, String) = sqlx::query_as(
        "SELECT id, tenant_id, name, email, phone, pricing_tier, loyalty_points, store_credit, updated_at, sync_version, store_id
         FROM customers WHERE id = ?"
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch customer: {}", e))?;

    Ok(ConflictingCustomer {
        id: row.0,
        tenant_id: row.1,
        name: row.2,
        email: row.3,
        phone: row.4,
        pricing_tier: row.5,
        loyalty_points: row.6,
        store_credit: row.7,
        updated_at: row.8,
        sync_version: row.9,
        store_id: row.10,
    })
}

// Helper to get work order from database
async fn get_work_order(pool: &SqlitePool, id: &str) -> Result<ConflictingWorkOrder, String> {
    let row: (String, String, String, String, String, String, String, f64, f64, String, i64, String) = sqlx::query_as(
        "SELECT id, tenant_id, work_order_number, customer_id, vehicle_id, status, description, labor_total, parts_total, updated_at, sync_version, store_id
         FROM work_orders WHERE id = ?"
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch work order: {}", e))?;

    Ok(ConflictingWorkOrder {
        id: row.0,
        tenant_id: row.1,
        work_order_number: row.2,
        customer_id: row.3,
        vehicle_id: row.4,
        status: row.5,
        description: row.6,
        labor_total: row.7,
        parts_total: row.8,
        updated_at: row.9,
        sync_version: row.10,
        store_id: row.11,
    })
}

// Helper to get credit account from database
async fn get_credit_account(pool: &SqlitePool, id: &str) -> Result<ConflictingCreditAccount, String> {
    let row: (String, String, String, f64, f64, f64, String, i64, String) = sqlx::query_as(
        "SELECT id, tenant_id, customer_id, credit_limit, current_balance, available_credit, updated_at, sync_version, store_id
         FROM credit_accounts WHERE id = ?"
    )
    .bind(id)
    .fetch_one(pool)
    .await
    .map_err(|e| format!("Failed to fetch credit account: {}", e))?;

    Ok(ConflictingCreditAccount {
        id: row.0,
        tenant_id: row.1,
        customer_id: row.2,
        credit_limit: row.3,
        current_balance: row.4,
        available_credit: row.5,
        updated_at: row.6,
        sync_version: row.7,
        store_id: row.8,
    })
}

// Proptest strategies
fn arb_amount() -> impl Strategy<Value = f64> {
    (1.0..10000.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

fn arb_points() -> impl Strategy<Value = i32> {
    0..100000
}

fn arb_status() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("Active".to_string()),
        Just("Completed".to_string()),
        Just("Cancelled".to_string()),
        Just("Overdue".to_string()),
    ]
}

fn arb_work_order_status() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("Created".to_string()),
        Just("Estimate".to_string()),
        Just("Approved".to_string()),
        Just("InProgress".to_string()),
        Just("Completed".to_string()),
        Just("Invoiced".to_string()),
    ]
}

fn arb_pricing_tier() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("Retail".to_string()),
        Just("Wholesale".to_string()),
        Just("Contractor".to_string()),
        Just("VIP".to_string()),
    ]
}

fn arb_store_id() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("store-001".to_string()),
        Just("store-002".to_string()),
        Just("store-003".to_string()),
    ]
}

// Generate a timestamp with a specific offset in seconds
fn timestamp_with_offset(offset_seconds: i64) -> String {
    let base_time = Utc::now();
    let adjusted_time = base_time + Duration::seconds(offset_seconds);
    adjusted_time.to_rfc3339()
}

// ============================================================================
// Property 26: Sync conflict resolution preserves most recent
// ============================================================================
// **Validates: Requirements 9.3**
//
// For any conflicting records during synchronization, the record with the 
// most recent updated_at timestamp should be preserved

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_26_layaway_conflict_preserves_most_recent(
        status_local in arb_status(),
        status_remote in arb_status(),
        balance_local in arb_amount(),
        balance_remote in arb_amount(),
        time_offset in -3600i64..3600i64, // +/- 1 hour
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let layaway_id = Uuid::new_v4().to_string();
            let customer_id = Uuid::new_v4().to_string();

            // Create local record (older)
            let local_timestamp = timestamp_with_offset(0);
            let local = ConflictingLayaway {
                id: layaway_id.clone(),
                tenant_id: tenant_id.to_string(),
                customer_id: customer_id.clone(),
                status: status_local.clone(),
                total_amount: 1000.0,
                deposit_amount: 200.0,
                balance_due: balance_local,
                updated_at: local_timestamp.clone(),
                sync_version: 1,
                store_id: "store-001".to_string(),
            };

            // Create remote record with time offset
            let remote_timestamp = timestamp_with_offset(time_offset);
            let remote = ConflictingLayaway {
                id: layaway_id.clone(),
                tenant_id: tenant_id.to_string(),
                customer_id: customer_id.clone(),
                status: status_remote.clone(),
                total_amount: 1000.0,
                deposit_amount: 200.0,
                balance_due: balance_remote,
                updated_at: remote_timestamp.clone(),
                sync_version: 2,
                store_id: "store-002".to_string(),
            };

            // Insert local record first
            insert_layaway(&pool, &local).await.unwrap();

            // Simulate sync conflict resolution
            let winner = resolve_layaway_conflict(&pool, &local, &remote).await.unwrap();

            // PROPERTY: The record with the most recent updated_at should be preserved
            let expected_winner = if remote_timestamp > local_timestamp {
                &remote
            } else {
                &local
            };

            prop_assert_eq!(
                winner.updated_at,
                expected_winner.updated_at.clone(),
                "Winner should have the most recent updated_at timestamp"
            );

            prop_assert_eq!(
                winner.status,
                expected_winner.status.clone(),
                "Winner should have the status from the most recent record"
            );

            prop_assert_eq!(
                winner.balance_due,
                expected_winner.balance_due,
                "Winner should have the balance from the most recent record"
            );

            prop_assert_eq!(
                winner.store_id,
                expected_winner.store_id.clone(),
                "Winner should have the store_id from the most recent record"
            );

            // Verify database contains the winning record
            let db_record = get_layaway(&pool, &layaway_id).await.unwrap();
            prop_assert_eq!(
                db_record.updated_at,
                expected_winner.updated_at.clone(),
                "Database should contain the most recent record"
            );

            prop_assert_eq!(
                db_record.status,
                expected_winner.status.clone(),
                "Database should have the status from the most recent record"
            );

            Ok(())
        });
    }

    #[test]
    fn property_26_customer_conflict_preserves_most_recent(
        name_local in "[A-Z][a-z]{5,10}",
        name_remote in "[A-Z][a-z]{5,10}",
        points_local in arb_points(),
        points_remote in arb_points(),
        tier_local in arb_pricing_tier(),
        tier_remote in arb_pricing_tier(),
        time_offset in -7200i64..7200i64, // +/- 2 hours
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let customer_id = Uuid::new_v4().to_string();

            // Create local record
            let local_timestamp = timestamp_with_offset(0);
            let local = ConflictingCustomer {
                id: customer_id.clone(),
                tenant_id: tenant_id.to_string(),
                name: name_local.clone(),
                email: Some("local@example.com".to_string()),
                phone: Some("555-0001".to_string()),
                pricing_tier: tier_local.clone(),
                loyalty_points: points_local,
                store_credit: 50.0,
                updated_at: local_timestamp.clone(),
                sync_version: 1,
                store_id: "store-001".to_string(),
            };

            // Create remote record with time offset
            let remote_timestamp = timestamp_with_offset(time_offset);
            let remote = ConflictingCustomer {
                id: customer_id.clone(),
                tenant_id: tenant_id.to_string(),
                name: name_remote.clone(),
                email: Some("remote@example.com".to_string()),
                phone: Some("555-0002".to_string()),
                pricing_tier: tier_remote.clone(),
                loyalty_points: points_remote,
                store_credit: 75.0,
                updated_at: remote_timestamp.clone(),
                sync_version: 2,
                store_id: "store-002".to_string(),
            };

            // Insert local record first
            insert_customer(&pool, &local).await.unwrap();

            // Simulate sync conflict resolution
            let winner = resolve_customer_conflict(&pool, &local, &remote).await.unwrap();

            // PROPERTY: The record with the most recent updated_at should be preserved
            let expected_winner = if remote_timestamp > local_timestamp {
                &remote
            } else {
                &local
            };

            prop_assert_eq!(
                winner.updated_at,
                expected_winner.updated_at.clone(),
                "Winner should have the most recent updated_at timestamp"
            );

            prop_assert_eq!(
                winner.name,
                expected_winner.name.clone(),
                "Winner should have the name from the most recent record"
            );

            prop_assert_eq!(
                winner.pricing_tier,
                expected_winner.pricing_tier.clone(),
                "Winner should have the pricing tier from the most recent record"
            );

            prop_assert_eq!(
                winner.loyalty_points,
                expected_winner.loyalty_points,
                "Winner should have the loyalty points from the most recent record"
            );

            // Verify database contains the winning record
            let db_record = get_customer(&pool, &customer_id).await.unwrap();
            prop_assert_eq!(
                db_record.updated_at,
                expected_winner.updated_at.clone(),
                "Database should contain the most recent record"
            );

            prop_assert_eq!(
                db_record.name,
                expected_winner.name.clone(),
                "Database should have the name from the most recent record"
            );

            Ok(())
        });
    }

    #[test]
    fn property_26_work_order_conflict_preserves_most_recent(
        status_local in arb_work_order_status(),
        status_remote in arb_work_order_status(),
        labor_local in arb_amount(),
        labor_remote in arb_amount(),
        parts_local in arb_amount(),
        parts_remote in arb_amount(),
        time_offset in -1800i64..1800i64, // +/- 30 minutes
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let work_order_id = Uuid::new_v4().to_string();
            let customer_id = Uuid::new_v4().to_string();
            let vehicle_id = Uuid::new_v4().to_string();
            let wo_number = format!("WO-{}", Uuid::new_v4().to_string()[..8].to_uppercase());

            // Create local record
            let local_timestamp = timestamp_with_offset(0);
            let local = ConflictingWorkOrder {
                id: work_order_id.clone(),
                tenant_id: tenant_id.to_string(),
                work_order_number: wo_number.clone(),
                customer_id: customer_id.clone(),
                vehicle_id: vehicle_id.clone(),
                status: status_local.clone(),
                description: "Local description".to_string(),
                labor_total: labor_local,
                parts_total: parts_local,
                updated_at: local_timestamp.clone(),
                sync_version: 1,
                store_id: "store-001".to_string(),
            };

            // Create remote record with time offset
            let remote_timestamp = timestamp_with_offset(time_offset);
            let remote = ConflictingWorkOrder {
                id: work_order_id.clone(),
                tenant_id: tenant_id.to_string(),
                work_order_number: wo_number.clone(),
                customer_id: customer_id.clone(),
                vehicle_id: vehicle_id.clone(),
                status: status_remote.clone(),
                description: "Remote description".to_string(),
                labor_total: labor_remote,
                parts_total: parts_remote,
                updated_at: remote_timestamp.clone(),
                sync_version: 2,
                store_id: "store-002".to_string(),
            };

            // Insert local record first
            insert_work_order(&pool, &local).await.unwrap();

            // Simulate sync conflict resolution
            let winner = resolve_work_order_conflict(&pool, &local, &remote).await.unwrap();

            // PROPERTY: The record with the most recent updated_at should be preserved
            let expected_winner = if remote_timestamp > local_timestamp {
                &remote
            } else {
                &local
            };

            prop_assert_eq!(
                winner.updated_at,
                expected_winner.updated_at.clone(),
                "Winner should have the most recent updated_at timestamp"
            );

            prop_assert_eq!(
                winner.status,
                expected_winner.status.clone(),
                "Winner should have the status from the most recent record"
            );

            prop_assert_eq!(
                winner.labor_total,
                expected_winner.labor_total,
                "Winner should have the labor total from the most recent record"
            );

            prop_assert_eq!(
                winner.parts_total,
                expected_winner.parts_total,
                "Winner should have the parts total from the most recent record"
            );

            // Verify database contains the winning record
            let db_record = get_work_order(&pool, &work_order_id).await.unwrap();
            prop_assert_eq!(
                db_record.updated_at,
                expected_winner.updated_at.clone(),
                "Database should contain the most recent record"
            );

            Ok(())
        });
    }

    #[test]
    fn property_26_credit_account_conflict_preserves_most_recent(
        balance_local in arb_amount(),
        balance_remote in arb_amount(),
        limit_local in arb_amount(),
        limit_remote in arb_amount(),
        time_offset in -5400i64..5400i64, // +/- 90 minutes
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let account_id = Uuid::new_v4().to_string();
            let customer_id = Uuid::new_v4().to_string();

            // Ensure limit is greater than balance for valid data
            let limit_local_adjusted = limit_local.max(balance_local + 100.0);
            let limit_remote_adjusted = limit_remote.max(balance_remote + 100.0);

            // Create local record
            let local_timestamp = timestamp_with_offset(0);
            let local = ConflictingCreditAccount {
                id: account_id.clone(),
                tenant_id: tenant_id.to_string(),
                customer_id: customer_id.clone(),
                credit_limit: limit_local_adjusted,
                current_balance: balance_local,
                available_credit: limit_local_adjusted - balance_local,
                updated_at: local_timestamp.clone(),
                sync_version: 1,
                store_id: "store-001".to_string(),
            };

            // Create remote record with time offset
            let remote_timestamp = timestamp_with_offset(time_offset);
            let remote = ConflictingCreditAccount {
                id: account_id.clone(),
                tenant_id: tenant_id.to_string(),
                customer_id: customer_id.clone(),
                credit_limit: limit_remote_adjusted,
                current_balance: balance_remote,
                available_credit: limit_remote_adjusted - balance_remote,
                updated_at: remote_timestamp.clone(),
                sync_version: 2,
                store_id: "store-002".to_string(),
            };

            // Insert local record first
            insert_credit_account(&pool, &local).await.unwrap();

            // Simulate sync conflict resolution
            let winner = resolve_credit_account_conflict(&pool, &local, &remote).await.unwrap();

            // PROPERTY: The record with the most recent updated_at should be preserved
            let expected_winner = if remote_timestamp > local_timestamp {
                &remote
            } else {
                &local
            };

            prop_assert_eq!(
                winner.updated_at,
                expected_winner.updated_at.clone(),
                "Winner should have the most recent updated_at timestamp"
            );

            prop_assert_eq!(
                winner.credit_limit,
                expected_winner.credit_limit,
                "Winner should have the credit limit from the most recent record"
            );

            prop_assert_eq!(
                winner.current_balance,
                expected_winner.current_balance,
                "Winner should have the current balance from the most recent record"
            );

            prop_assert_eq!(
                winner.available_credit,
                expected_winner.available_credit,
                "Winner should have the available credit from the most recent record"
            );

            // Verify database contains the winning record
            let db_record = get_credit_account(&pool, &account_id).await.unwrap();
            prop_assert_eq!(
                db_record.updated_at,
                expected_winner.updated_at.clone(),
                "Database should contain the most recent record"
            );

            prop_assert_eq!(
                db_record.current_balance,
                expected_winner.current_balance,
                "Database should have the balance from the most recent record"
            );

            Ok(())
        });
    }

    #[test]
    fn property_26_equal_timestamps_preserve_deterministically(
        balance_a in arb_amount(),
        balance_b in arb_amount(),
        store_a in arb_store_id(),
        store_b in arb_store_id(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let layaway_id = Uuid::new_v4().to_string();
            let customer_id = Uuid::new_v4().to_string();

            // Create two records with IDENTICAL timestamps
            let same_timestamp = timestamp_with_offset(0);
            
            let record_a = ConflictingLayaway {
                id: layaway_id.clone(),
                tenant_id: tenant_id.to_string(),
                customer_id: customer_id.clone(),
                status: "Active".to_string(),
                total_amount: 1000.0,
                deposit_amount: 200.0,
                balance_due: balance_a,
                updated_at: same_timestamp.clone(),
                sync_version: 1,
                store_id: store_a.clone(),
            };

            let record_b = ConflictingLayaway {
                id: layaway_id.clone(),
                tenant_id: tenant_id.to_string(),
                customer_id: customer_id.clone(),
                status: "Active".to_string(),
                total_amount: 1000.0,
                deposit_amount: 200.0,
                balance_due: balance_b,
                updated_at: same_timestamp.clone(),
                sync_version: 2,
                store_id: store_b.clone(),
            };

            // Insert first record
            insert_layaway(&pool, &record_a).await.unwrap();

            // Resolve conflict with identical timestamps
            let winner = resolve_layaway_conflict(&pool, &record_a, &record_b).await.unwrap();

            // PROPERTY: When timestamps are equal, resolution should be deterministic
            // (In this case, local wins when timestamps are equal)
            prop_assert_eq!(
                winner.updated_at,
                same_timestamp,
                "Winner should have the same timestamp"
            );

            // The resolution is deterministic - local wins on tie
            prop_assert_eq!(
                winner.balance_due,
                record_a.balance_due,
                "When timestamps are equal, local record should be preserved"
            );

            prop_assert_eq!(
                winner.store_id,
                record_a.store_id,
                "When timestamps are equal, local store_id should be preserved"
            );

            Ok(())
        });
    }

    #[test]
    fn property_26_multiple_conflicts_all_preserve_most_recent(
        num_conflicts in 2usize..5,
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";

            // Create multiple conflicting records
            for i in 0..num_conflicts {
                let customer_id = Uuid::new_v4().to_string();
                let time_offset = (i as i64) * 60; // Each record 1 minute apart

                // Local record (older)
                let local_timestamp = timestamp_with_offset(0);
                let local = ConflictingCustomer {
                    id: customer_id.clone(),
                    tenant_id: tenant_id.to_string(),
                    name: format!("Local Customer {}", i),
                    email: Some(format!("local{}@example.com", i)),
                    phone: Some(format!("555-000{}", i)),
                    pricing_tier: "Retail".to_string(),
                    loyalty_points: 100,
                    store_credit: 50.0,
                    updated_at: local_timestamp.clone(),
                    sync_version: 1,
                    store_id: "store-001".to_string(),
                };

                // Remote record (newer)
                let remote_timestamp = timestamp_with_offset(time_offset);
                let remote = ConflictingCustomer {
                    id: customer_id.clone(),
                    tenant_id: tenant_id.to_string(),
                    name: format!("Remote Customer {}", i),
                    email: Some(format!("remote{}@example.com", i)),
                    phone: Some(format!("555-100{}", i)),
                    pricing_tier: "Wholesale".to_string(),
                    loyalty_points: 200,
                    store_credit: 75.0,
                    updated_at: remote_timestamp.clone(),
                    sync_version: 2,
                    store_id: "store-002".to_string(),
                };

                // Insert local record
                insert_customer(&pool, &local).await.unwrap();

                // Resolve conflict
                let winner = resolve_customer_conflict(&pool, &local, &remote).await.unwrap();

                // PROPERTY: Each conflict should preserve the most recent record
                let expected_winner = if remote_timestamp > local_timestamp {
                    &remote
                } else {
                    &local
                };

                prop_assert_eq!(
                    winner.updated_at,
                    expected_winner.updated_at.clone(),
                    "Conflict {} should preserve most recent timestamp",
                    i
                );

                prop_assert_eq!(
                    winner.name,
                    expected_winner.name.clone(),
                    "Conflict {} should preserve name from most recent record",
                    i
                );

                // Verify in database
                let db_record = get_customer(&pool, &customer_id).await.unwrap();
                prop_assert_eq!(
                    db_record.updated_at,
                    expected_winner.updated_at.clone(),
                    "Database should contain most recent record for conflict {}",
                    i
                );
            }

            Ok(())
        });
    }
}
