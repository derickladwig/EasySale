// Integration tests for accounting snapshots
// Feature: split-build-system, Property 1: Snapshot Creation Completeness
// Validates: Requirements 3.1, 3.2, 3.5

use accounting_snapshots::builder::{DefaultSnapshotBuilder, SnapshotBuilder};
use pos_core_models::{Transaction, TransactionStatus, LineItem, Payment as TransactionPayment};
use rust_decimal::Decimal;
use rust_decimal_macros::dec;
use sqlx::SqlitePool;
use uuid::Uuid;

async fn setup_test_db() -> SqlitePool {
    // Create in-memory database
    let pool = SqlitePool::connect("sqlite::memory:")
        .await
        .expect("Failed to create test pool");
    
    // Create accounting_snapshots table
    sqlx::query(
        r#"
        CREATE TABLE accounting_snapshots (
            id TEXT PRIMARY KEY,
            transaction_id TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL,
            finalized_at TEXT NOT NULL,
            subtotal TEXT NOT NULL,
            tax TEXT NOT NULL,
            discount TEXT NOT NULL,
            total TEXT NOT NULL
        )
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create accounting_snapshots table");
    
    // Create snapshot_lines table
    sqlx::query(
        r#"
        CREATE TABLE snapshot_lines (
            id TEXT PRIMARY KEY,
            snapshot_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            description TEXT NOT NULL,
            quantity TEXT NOT NULL,
            unit_price TEXT NOT NULL,
            line_total TEXT NOT NULL,
            tax_amount TEXT NOT NULL,
            FOREIGN KEY (snapshot_id) REFERENCES accounting_snapshots(id)
        )
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create snapshot_lines table");
    
    // Create snapshot_payments table
    sqlx::query(
        r#"
        CREATE TABLE snapshot_payments (
            id TEXT PRIMARY KEY,
            snapshot_id TEXT NOT NULL,
            method TEXT NOT NULL,
            amount TEXT NOT NULL,
            FOREIGN KEY (snapshot_id) REFERENCES accounting_snapshots(id)
        )
        "#,
    )
    .execute(&pool)
    .await
    .expect("Failed to create snapshot_payments table");
    
    pool
}

#[tokio::test]
async fn test_snapshot_creation_completeness() {
    // Feature: split-build-system, Property 1: Snapshot Creation Completeness
    // Validates: Requirements 3.1, 3.2, 3.5
    
    let pool = setup_test_db().await;
    
    // Create a finalized transaction
    let transaction_id = Uuid::new_v4();
    let mut transaction = Transaction::with_id(transaction_id);
    
    // Add line items
    let item1 = LineItem::new(Uuid::new_v4().to_string(), dec!(2.0), dec!(10.00));
    let item2 = LineItem::new(Uuid::new_v4().to_string(), dec!(1.0), dec!(15.00));
    transaction.add_item(item1).unwrap();
    transaction.add_item(item2).unwrap();
    
    // Set calculated totals
    transaction.subtotal = dec!(35.00);
    transaction.tax = dec!(2.80);
    transaction.discount_total = dec!(0.00);
    transaction.total = dec!(37.80);
    
    // Add payment
    transaction.add_payment(TransactionPayment {
        method: "cash".to_string(),
        amount: dec!(37.80),
    }).unwrap();
    
    // Finalize
    transaction.status = TransactionStatus::Finalized;
    transaction.finalized_at = Some(chrono::Utc::now());
    
    // Build snapshot from transaction
    let builder = DefaultSnapshotBuilder::new();
    let snapshot = builder.build_snapshot(&transaction)
        .expect("Failed to build snapshot");
    
    // Verify snapshot has all required fields
    assert_eq!(snapshot.transaction_id, transaction_id);
    assert_eq!(snapshot.subtotal, dec!(35.00));
    assert_eq!(snapshot.tax, dec!(2.80));
    assert_eq!(snapshot.discount, dec!(0.00));
    assert_eq!(snapshot.total, dec!(37.80));
    assert_eq!(snapshot.payments.len(), 1);
    assert_eq!(snapshot.payments[0].method, "cash");
    assert_eq!(snapshot.payments[0].amount, dec!(37.80));
    assert_eq!(snapshot.lines.len(), 2);
    
    // Verify line items (note: description is product_id since we don't have product lookup)
    assert_eq!(snapshot.lines[0].quantity, dec!(2.0));
    assert_eq!(snapshot.lines[0].unit_price, dec!(10.00));
    assert_eq!(snapshot.lines[0].line_total, dec!(20.00));
    
    assert_eq!(snapshot.lines[1].quantity, dec!(1.0));
    assert_eq!(snapshot.lines[1].unit_price, dec!(15.00));
    assert_eq!(snapshot.lines[1].line_total, dec!(15.00));
    
    // Persist snapshot to database
    let snapshot_id = snapshot.id.to_string();
    sqlx::query(
        r#"
        INSERT INTO accounting_snapshots 
        (id, transaction_id, created_at, finalized_at, subtotal, tax, discount, total)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#,
    )
    .bind(&snapshot_id)
    .bind(snapshot.transaction_id.to_string())
    .bind(snapshot.created_at.to_rfc3339())
    .bind(snapshot.finalized_at.to_rfc3339())
    .bind(snapshot.subtotal.to_string())
    .bind(snapshot.tax.to_string())
    .bind(snapshot.discount.to_string())
    .bind(snapshot.total.to_string())
    .execute(&pool)
    .await
    .expect("Failed to insert snapshot");
    
    // Insert lines
    for line in &snapshot.lines {
        sqlx::query(
            r#"
            INSERT INTO snapshot_lines 
            (id, snapshot_id, product_id, description, quantity, unit_price, line_total, tax_amount)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&snapshot_id)
        .bind(&line.product_id)
        .bind(&line.description)
        .bind(line.quantity.to_string())
        .bind(line.unit_price.to_string())
        .bind(line.line_total.to_string())
        .bind(line.tax_amount.to_string())
        .execute(&pool)
        .await
        .expect("Failed to insert snapshot line");
    }
    
    // Insert payments
    for payment in &snapshot.payments {
        sqlx::query(
            r#"
            INSERT INTO snapshot_payments 
            (id, snapshot_id, method, amount)
            VALUES (?, ?, ?, ?)
            "#,
        )
        .bind(Uuid::new_v4().to_string())
        .bind(&snapshot_id)
        .bind(&payment.method)
        .bind(payment.amount.to_string())
        .execute(&pool)
        .await
        .expect("Failed to insert payment");
    }
    
    // Verify snapshot is immediately queryable
    let row: (String,) = sqlx::query_as(
        "SELECT id FROM accounting_snapshots WHERE transaction_id = ?"
    )
    .bind(transaction_id.to_string())
    .fetch_one(&pool)
    .await
    .expect("Failed to query snapshot");
    
    assert_eq!(row.0, snapshot_id);
    
    // Verify lines are queryable
    let line_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM snapshot_lines WHERE snapshot_id = ?"
    )
    .bind(&snapshot_id)
    .fetch_one(&pool)
    .await
    .expect("Failed to count lines");
    
    assert_eq!(line_count.0, 2);
    
    // Verify payments are queryable
    let payment_count: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM snapshot_payments WHERE snapshot_id = ?"
    )
    .bind(&snapshot_id)
    .fetch_one(&pool)
    .await
    .expect("Failed to count payments");
    
    assert_eq!(payment_count.0, 1);
}

#[tokio::test]
async fn test_snapshot_with_multiple_payments() {
    // Feature: split-build-system, Property 1: Snapshot Creation Completeness
    // Validates: Requirements 3.1, 3.2, 3.5
    
    let pool = setup_test_db().await;
    
    // Create transaction with multiple payments (split tender)
    let transaction_id = Uuid::new_v4();
    let mut transaction = Transaction::with_id(transaction_id);
    
    // Add line item
    let item = LineItem::new(Uuid::new_v4().to_string(), dec!(1.0), dec!(100.00));
    transaction.add_item(item).unwrap();
    
    // Set calculated totals
    transaction.subtotal = dec!(100.00);
    transaction.tax = dec!(8.00);
    transaction.discount_total = dec!(0.00);
    transaction.total = dec!(108.00);
    
    // Add multiple payments BEFORE finalizing
    transaction.add_payment(TransactionPayment {
        method: "cash".to_string(),
        amount: dec!(50.00),
    }).unwrap();
    transaction.add_payment(TransactionPayment {
        method: "card".to_string(),
        amount: dec!(58.00),
    }).unwrap();
    
    // Finalize
    transaction.status = TransactionStatus::Finalized;
    transaction.finalized_at = Some(chrono::Utc::now());
    
    // Build snapshot
    let builder = DefaultSnapshotBuilder::new();
    let snapshot = builder.build_snapshot(&transaction)
        .expect("Failed to build snapshot");
    
    // Verify multiple payments are captured
    assert_eq!(snapshot.payments.len(), 2);
    assert_eq!(snapshot.payments[0].method, "cash");
    assert_eq!(snapshot.payments[0].amount, dec!(50.00));
    assert_eq!(snapshot.payments[1].method, "card");
    assert_eq!(snapshot.payments[1].amount, dec!(58.00));
    
    // Verify total matches sum of payments
    let total_paid: Decimal = snapshot.payments.iter().map(|p| p.amount).sum();
    assert_eq!(total_paid, snapshot.total);
}

#[tokio::test]
async fn test_snapshot_with_discount() {
    // Feature: split-build-system, Property 1: Snapshot Creation Completeness
    // Validates: Requirements 3.1, 3.2, 3.5
    
    let transaction_id = Uuid::new_v4();
    let mut transaction = Transaction::with_id(transaction_id);
    
    // Add line item
    let item = LineItem::new(Uuid::new_v4().to_string(), dec!(1.0), dec!(100.00));
    transaction.add_item(item).unwrap();
    
    // Set calculated totals with discount
    transaction.subtotal = dec!(100.00);
    transaction.tax = dec!(8.00);
    transaction.discount_total = dec!(10.00);
    transaction.total = dec!(98.00);
    
    // Add payment
    transaction.add_payment(TransactionPayment {
        method: "cash".to_string(),
        amount: dec!(98.00),
    }).unwrap();
    
    // Finalize
    transaction.status = TransactionStatus::Finalized;
    transaction.finalized_at = Some(chrono::Utc::now());
    
    // Build snapshot
    let builder = DefaultSnapshotBuilder::new();
    let snapshot = builder.build_snapshot(&transaction)
        .expect("Failed to build snapshot");
    
    // Verify discount is captured
    assert_eq!(snapshot.discount, dec!(10.00));
    assert_eq!(snapshot.total, dec!(98.00));
    assert_eq!(snapshot.subtotal + snapshot.tax - snapshot.discount, snapshot.total);
}
