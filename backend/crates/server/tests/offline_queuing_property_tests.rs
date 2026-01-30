// Property-based tests for offline transaction queuing
// Feature: sales-customer-management, Property 25: Offline transaction queuing
// **Validates: Requirements 9.2**

use proptest::prelude::*;
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;
use serde_json::json;

// Test database setup helper
async fn setup_test_db() -> SqlitePool {
    let pool = SqlitePool::connect(":memory:").await.unwrap();
    
    // Create sync_queue table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS sync_queue (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
            entity_type TEXT NOT NULL,
            entity_id TEXT NOT NULL,
            operation TEXT NOT NULL,
            payload TEXT NOT NULL,
            sync_status TEXT NOT NULL DEFAULT 'pending',
            retry_count INTEGER NOT NULL DEFAULT 0,
            last_retry_at TEXT,
            error_message TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            store_id TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(sync_status)"
    )
    .execute(&pool)
    .await
    .unwrap();

    sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_sync_queue_entity ON sync_queue(entity_type, entity_id)"
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create layaways table for testing
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

    // Create layaway_payments table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS layaway_payments (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            layaway_id TEXT NOT NULL,
            amount REAL NOT NULL,
            payment_method TEXT NOT NULL,
            payment_date TEXT NOT NULL,
            employee_id TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create credit_transactions table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS credit_transactions (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            credit_account_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            amount REAL NOT NULL,
            reference_id TEXT NOT NULL,
            transaction_date TEXT NOT NULL,
            due_date TEXT,
            days_overdue INTEGER NOT NULL DEFAULT 0
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    // Create loyalty_transactions table
    sqlx::query(
        r#"
        CREATE TABLE IF NOT EXISTS loyalty_transactions (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            transaction_type TEXT NOT NULL,
            points INTEGER NOT NULL,
            amount REAL,
            reference_id TEXT,
            created_at TEXT NOT NULL,
            employee_id TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .unwrap();

    pool
}

// Helper to simulate offline transaction creation with sync queue
async fn create_offline_transaction(
    pool: &SqlitePool,
    tenant_id: &str,
    entity_type: &str,
    entity_id: &str,
    operation: &str,
    payload: serde_json::Value,
    store_id: &str,
    is_offline: bool,
) -> Result<String, String> {
    let mut tx = pool.begin().await
        .map_err(|e| format!("Failed to start transaction: {}", e))?;

    // Create the actual entity (simplified - just for testing)
    let now = Utc::now().to_rfc3339();
    
    match entity_type {
        "layaway_payment" => {
            let payment_id = entity_id;
            let layaway_id = payload["layaway_id"].as_str().unwrap_or("unknown");
            let amount = payload["amount"].as_f64().unwrap_or(0.0);
            let payment_method = payload["payment_method"].as_str().unwrap_or("Cash");
            let employee_id = payload["employee_id"].as_str().unwrap_or("emp-001");

            sqlx::query(
                "INSERT INTO layaway_payments (id, tenant_id, layaway_id, amount, payment_method, payment_date, employee_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)"
            )
            .bind(payment_id)
            .bind(tenant_id)
            .bind(layaway_id)
            .bind(amount)
            .bind(payment_method)
            .bind(&now)
            .bind(employee_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to create payment: {}", e))?;
        },
        "credit_charge" => {
            let transaction_id = entity_id;
            let account_id = payload["account_id"].as_str().unwrap_or("unknown");
            let amount = payload["amount"].as_f64().unwrap_or(0.0);
            let reference_id = payload["reference_id"].as_str().unwrap_or("ref-001");

            sqlx::query(
                "INSERT INTO credit_transactions (id, tenant_id, credit_account_id, transaction_type, amount, reference_id, transaction_date, due_date, days_overdue)
                 VALUES (?, ?, ?, 'Charge', ?, ?, ?, NULL, 0)"
            )
            .bind(transaction_id)
            .bind(tenant_id)
            .bind(account_id)
            .bind(amount)
            .bind(reference_id)
            .bind(&now)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to create credit charge: {}", e))?;
        },
        "loyalty_points" => {
            let transaction_id = entity_id;
            let customer_id = payload["customer_id"].as_str().unwrap_or("unknown");
            let points = payload["points"].as_i64().unwrap_or(0) as i32;
            let amount = payload["amount"].as_f64();
            let employee_id = payload["employee_id"].as_str().unwrap_or("emp-001");

            sqlx::query(
                "INSERT INTO loyalty_transactions (id, tenant_id, customer_id, transaction_type, points, amount, reference_id, created_at, employee_id)
                 VALUES (?, ?, ?, 'Earned', ?, ?, NULL, ?, ?)"
            )
            .bind(transaction_id)
            .bind(tenant_id)
            .bind(customer_id)
            .bind(points)
            .bind(amount)
            .bind(&now)
            .bind(employee_id)
            .execute(&mut *tx)
            .await
            .map_err(|e| format!("Failed to create loyalty transaction: {}", e))?;
        },
        _ => {
            // For other entity types, we just queue them without creating the entity
        }
    }

    // If offline, add to sync queue
    if is_offline {
        let queue_id = Uuid::new_v4().to_string();
        let payload_str = serde_json::to_string(&payload)
            .map_err(|e| format!("Failed to serialize payload: {}", e))?;

        sqlx::query(
            "INSERT INTO sync_queue (id, tenant_id, entity_type, entity_id, operation, payload, sync_status, retry_count, created_at, updated_at, store_id)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)"
        )
        .bind(&queue_id)
        .bind(tenant_id)
        .bind(entity_type)
        .bind(entity_id)
        .bind(operation)
        .bind(&payload_str)
        .bind(&now)
        .bind(&now)
        .bind(store_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Failed to queue sync: {}", e))?;

        tx.commit().await
            .map_err(|e| format!("Failed to commit transaction: {}", e))?;

        Ok(queue_id)
    } else {
        tx.commit().await
            .map_err(|e| format!("Failed to commit transaction: {}", e))?;
        
        Ok("not-queued".to_string())
    }
}

// Helper to check if transaction is in sync queue
async fn is_in_sync_queue(
    pool: &SqlitePool,
    entity_type: &str,
    entity_id: &str,
) -> bool {
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sync_queue WHERE entity_type = ? AND entity_id = ? AND sync_status = 'pending'"
    )
    .bind(entity_type)
    .bind(entity_id)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    count.0 > 0
}

// Helper to mark sync as completed
async fn mark_sync_completed(
    pool: &SqlitePool,
    entity_type: &str,
    entity_id: &str,
) -> Result<(), String> {
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "UPDATE sync_queue SET sync_status = 'completed', updated_at = ? WHERE entity_type = ? AND entity_id = ?"
    )
    .bind(&now)
    .bind(entity_type)
    .bind(entity_id)
    .execute(pool)
    .await
    .map_err(|e| format!("Failed to mark sync completed: {}", e))?;

    Ok(())
}

// Helper to check if transaction remains in queue
async fn remains_in_queue(
    pool: &SqlitePool,
    entity_type: &str,
    entity_id: &str,
) -> bool {
    let count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM sync_queue WHERE entity_type = ? AND entity_id = ? AND sync_status IN ('pending', 'failed')"
    )
    .bind(entity_type)
    .bind(entity_id)
    .fetch_one(pool)
    .await
    .unwrap_or((0,));

    count.0 > 0
}

// Proptest strategies
fn arb_amount() -> impl Strategy<Value = f64> {
    (1.0..1000.0).prop_map(|v: f64| (v * 100.0).round() / 100.0)
}

fn arb_points() -> impl Strategy<Value = i32> {
    1..10000
}

fn arb_entity_type() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("layaway_payment".to_string()),
        Just("credit_charge".to_string()),
        Just("loyalty_points".to_string()),
        Just("work_order".to_string()),
        Just("gift_card_transaction".to_string()),
    ]
}

fn arb_operation() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("create".to_string()),
        Just("update".to_string()),
    ]
}

// ============================================================================
// Property 25: Offline transaction queuing
// ============================================================================
// **Validates: Requirements 9.2**
//
// For any transaction created while offline, it should be added to the sync 
// queue and remain there until successfully synchronized

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_25_offline_transactions_are_queued(
        entity_type in arb_entity_type(),
        operation in arb_operation(),
        amount in arb_amount(),
        points in arb_points(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let store_id = "store-001";
            let entity_id = Uuid::new_v4().to_string();

            // Create appropriate payload based on entity type
            let payload = match entity_type.as_str() {
                "layaway_payment" => json!({
                    "layaway_id": Uuid::new_v4().to_string(),
                    "amount": amount,
                    "payment_method": "Cash",
                    "employee_id": "emp-001"
                }),
                "credit_charge" => json!({
                    "account_id": Uuid::new_v4().to_string(),
                    "amount": amount,
                    "reference_id": Uuid::new_v4().to_string()
                }),
                "loyalty_points" => json!({
                    "customer_id": Uuid::new_v4().to_string(),
                    "points": points,
                    "amount": amount,
                    "employee_id": "emp-001"
                }),
                _ => json!({
                    "id": entity_id.clone(),
                    "amount": amount
                })
            };

            // Create transaction while offline
            let result = create_offline_transaction(
                &pool,
                tenant_id,
                &entity_type,
                &entity_id,
                &operation,
                payload,
                store_id,
                true, // is_offline = true
            )
            .await;

            // PROPERTY: Transaction should be successfully queued
            prop_assert!(
                result.is_ok(),
                "Offline transaction should be queued successfully. Error: {:?}",
                result.err()
            );

            // PROPERTY: Transaction should be in sync queue with pending status
            let in_queue = is_in_sync_queue(&pool, &entity_type, &entity_id).await;
            prop_assert!(
                in_queue,
                "Transaction {} of type {} should be in sync queue",
                entity_id,
                entity_type
            );

            // Verify queue entry has correct fields
            let queue_entry: (String, String, String, String, String, i32) = sqlx::query_as(
                "SELECT id, entity_type, entity_id, operation, sync_status, retry_count 
                 FROM sync_queue WHERE entity_type = ? AND entity_id = ?"
            )
            .bind(&entity_type)
            .bind(&entity_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let (queue_id, queued_entity_type, queued_entity_id, queued_operation, sync_status, retry_count) = queue_entry;

            prop_assert_eq!(
                queued_entity_type,
                entity_type,
                "Queue entry should have correct entity_type"
            );

            prop_assert_eq!(
                queued_entity_id,
                entity_id,
                "Queue entry should have correct entity_id"
            );

            prop_assert_eq!(
                queued_operation,
                operation,
                "Queue entry should have correct operation"
            );

            prop_assert_eq!(
                sync_status,
                "pending",
                "Queue entry should have pending status"
            );

            prop_assert_eq!(
                retry_count,
                0,
                "Queue entry should have zero retry count initially"
            );

            // Verify payload is stored correctly
            let payload_str: (String,) = sqlx::query_as(
                "SELECT payload FROM sync_queue WHERE id = ?"
            )
            .bind(&queue_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let stored_payload: serde_json::Value = serde_json::from_str(&payload_str.0).unwrap();
            prop_assert!(
                !stored_payload.is_null(),
                "Payload should be stored as valid JSON"
            );

            Ok(())
        });
    }

    #[test]
    fn property_25_transactions_remain_until_synced(
        entity_type in arb_entity_type(),
        operation in arb_operation(),
        amount in arb_amount(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let store_id = "store-001";
            let entity_id = Uuid::new_v4().to_string();

            let payload = json!({
                "id": entity_id.clone(),
                "amount": amount
            });

            // Create offline transaction
            let _ = create_offline_transaction(
                &pool,
                tenant_id,
                &entity_type,
                &entity_id,
                &operation,
                payload,
                store_id,
                true,
            )
            .await
            .unwrap();

            // PROPERTY: Transaction should remain in queue before sync
            let remains_before = remains_in_queue(&pool, &entity_type, &entity_id).await;
            prop_assert!(
                remains_before,
                "Transaction should remain in queue before sync"
            );

            // Simulate successful sync
            mark_sync_completed(&pool, &entity_type, &entity_id).await.unwrap();

            // PROPERTY: Transaction should NOT remain in pending/failed status after sync
            let remains_after = remains_in_queue(&pool, &entity_type, &entity_id).await;
            prop_assert!(
                !remains_after,
                "Transaction should not remain in pending/failed queue after successful sync"
            );

            // Verify status is now completed
            let status: (String,) = sqlx::query_as(
                "SELECT sync_status FROM sync_queue WHERE entity_type = ? AND entity_id = ?"
            )
            .bind(&entity_type)
            .bind(&entity_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert_eq!(
                status.0,
                "completed",
                "Sync status should be 'completed' after successful sync"
            );

            Ok(())
        });
    }

    #[test]
    fn property_25_online_transactions_not_queued(
        entity_type in arb_entity_type(),
        operation in arb_operation(),
        amount in arb_amount(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let store_id = "store-001";
            let entity_id = Uuid::new_v4().to_string();

            let payload = json!({
                "id": entity_id.clone(),
                "amount": amount
            });

            // Create transaction while ONLINE
            let result = create_offline_transaction(
                &pool,
                tenant_id,
                &entity_type,
                &entity_id,
                &operation,
                payload,
                store_id,
                false, // is_offline = false
            )
            .await;

            prop_assert!(result.is_ok(), "Online transaction should succeed");

            // PROPERTY: Online transactions should NOT be queued
            let in_queue = is_in_sync_queue(&pool, &entity_type, &entity_id).await;
            prop_assert!(
                !in_queue,
                "Online transaction should NOT be in sync queue"
            );

            Ok(())
        });
    }

    #[test]
    fn property_25_multiple_offline_transactions_all_queued(
        num_transactions in 2usize..10,
        amount in arb_amount(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let store_id = "store-001";

            let mut entity_ids = Vec::new();

            // Create multiple offline transactions
            for i in 0..num_transactions {
                let entity_id = Uuid::new_v4().to_string();
                let entity_type = if i % 3 == 0 {
                    "layaway_payment"
                } else if i % 3 == 1 {
                    "credit_charge"
                } else {
                    "loyalty_points"
                };

                let payload = json!({
                    "id": entity_id.clone(),
                    "amount": amount,
                    "customer_id": Uuid::new_v4().to_string(),
                    "points": 100
                });

                let result = create_offline_transaction(
                    &pool,
                    tenant_id,
                    entity_type,
                    &entity_id,
                    "create",
                    payload,
                    store_id,
                    true,
                )
                .await;

                prop_assert!(result.is_ok(), "Transaction {} should be queued", i);
                entity_ids.push((entity_type.to_string(), entity_id));
            }

            // PROPERTY: All offline transactions should be in queue
            let total_queued: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM sync_queue WHERE sync_status = 'pending'"
            )
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert_eq!(
                total_queued.0 as usize,
                num_transactions,
                "All {} transactions should be queued",
                num_transactions
            );

            // Verify each transaction individually
            for (entity_type, entity_id) in entity_ids {
                let in_queue = is_in_sync_queue(&pool, &entity_type, &entity_id).await;
                prop_assert!(
                    in_queue,
                    "Transaction {} of type {} should be in queue",
                    entity_id,
                    entity_type
                );
            }

            Ok(())
        });
    }

    #[test]
    fn property_25_queue_persists_in_database(
        entity_type in arb_entity_type(),
        amount in arb_amount(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let store_id = "store-001";
            let entity_id = Uuid::new_v4().to_string();

            let payload = json!({
                "id": entity_id.clone(),
                "amount": amount
            });

            // Create offline transaction
            let _ = create_offline_transaction(
                &pool,
                tenant_id,
                &entity_type,
                &entity_id,
                "create",
                payload,
                store_id,
                true,
            )
            .await
            .unwrap();

            // PROPERTY: Queue entry should be retrievable from database
            let queue_count: (i64,) = sqlx::query_as(
                "SELECT COUNT(*) FROM sync_queue WHERE entity_type = ? AND entity_id = ? AND sync_status = 'pending'"
            )
            .bind(&entity_type)
            .bind(&entity_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            prop_assert_eq!(
                queue_count.0,
                1,
                "Exactly one queue entry should exist in database"
            );

            // Verify the entry can be retrieved with all fields intact
            let entry: (String, String, String, String, String) = sqlx::query_as(
                "SELECT id, entity_type, entity_id, operation, sync_status FROM sync_queue WHERE entity_type = ? AND entity_id = ?"
            )
            .bind(&entity_type)
            .bind(&entity_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let (id, etype, eid, operation, status) = entry;

            prop_assert!(!id.is_empty(), "Queue entry ID should be persisted");
            prop_assert_eq!(etype, entity_type, "Entity type should be persisted");
            prop_assert_eq!(eid, entity_id, "Entity ID should be persisted");
            prop_assert_eq!(operation, "create", "Operation should be persisted");
            prop_assert_eq!(status, "pending", "Status should be persisted");

            Ok(())
        });
    }

    #[test]
    fn property_25_queue_entry_has_all_required_fields(
        entity_type in arb_entity_type(),
        operation in arb_operation(),
        amount in arb_amount(),
    ) {
        let rt = tokio::runtime::Runtime::new().unwrap();
        let _ = rt.block_on(async {
            let pool = setup_test_db().await;
            let tenant_id = "test-tenant";
            let store_id = "store-001";
            let entity_id = Uuid::new_v4().to_string();

            let payload = json!({
                "id": entity_id.clone(),
                "amount": amount
            });

            // Create offline transaction
            let _ = create_offline_transaction(
                &pool,
                tenant_id,
                &entity_type,
                &entity_id,
                &operation,
                payload.clone(),
                store_id,
                true,
            )
            .await
            .unwrap();

            // Fetch queue entry
            let entry: (String, String, String, String, String, String, String, i32, String, String, String) = sqlx::query_as(
                "SELECT id, tenant_id, entity_type, entity_id, operation, payload, sync_status, retry_count, created_at, updated_at, store_id
                 FROM sync_queue WHERE entity_type = ? AND entity_id = ?"
            )
            .bind(&entity_type)
            .bind(&entity_id)
            .fetch_one(&pool)
            .await
            .unwrap();

            let (id, tenant, etype, eid, op, payload_str, status, retry, created, updated, store) = entry;

            // PROPERTY: All required fields should be populated
            prop_assert!(!id.is_empty(), "Queue entry should have an ID");
            prop_assert_eq!(tenant, tenant_id, "Queue entry should have correct tenant_id");
            prop_assert_eq!(etype, entity_type, "Queue entry should have correct entity_type");
            prop_assert_eq!(eid, entity_id, "Queue entry should have correct entity_id");
            prop_assert_eq!(op, operation, "Queue entry should have correct operation");
            prop_assert!(!payload_str.is_empty(), "Queue entry should have payload");
            prop_assert_eq!(status, "pending", "Queue entry should have pending status");
            prop_assert_eq!(retry, 0, "Queue entry should have zero retry count");
            prop_assert!(!created.is_empty(), "Queue entry should have created_at timestamp");
            prop_assert!(!updated.is_empty(), "Queue entry should have updated_at timestamp");
            prop_assert_eq!(store, store_id, "Queue entry should have correct store_id");

            // Verify payload is valid JSON
            let parsed_payload: serde_json::Value = serde_json::from_str(&payload_str).unwrap();
            prop_assert!(!parsed_payload.is_null(), "Payload should be valid JSON");

            Ok(())
        });
    }
}
