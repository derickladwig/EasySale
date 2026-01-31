// Property-Based Tests for Transaction Audit Logging
// Feature: sales-customer-management, Property 27: Transaction audit logging
// **Validates: Requirements 1.3, 4.8, 6.7, 9.8**
//
// For any transaction (layaway payment, loyalty point change, gift card activity,
// credit transaction), an audit log entry should be created recording the transaction
// details, timestamp, and employee ID

use proptest::prelude::*;
use serde_json::json;
use easysale_server::AuditLogger;
use easysale_server::AuditLogEntry;
use easysale_server::test_utils::create_test_db;
use uuid::Uuid;

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a random monetary amount
fn arb_amount() -> impl Strategy<Value = f64> {
    (0.01f64..10000.0f64).prop_map(|v| (v * 100.0).round() / 100.0)
}

/// Generate a random positive integer for points
fn arb_points() -> impl Strategy<Value = i32> {
    1..10000i32
}

/// Generate a random employee ID
fn arb_employee_id() -> impl Strategy<Value = String> {
    "emp-[0-9]{1,5}".prop_map(|s| s)
}

/// Generate a random customer ID
fn arb_customer_id() -> impl Strategy<Value = String> {
    "cust-[0-9]{1,5}".prop_map(|s| s)
}

/// Generate a random store ID
fn arb_store_id() -> impl Strategy<Value = String> {
    "store-[0-9]{1,3}".prop_map(|s| s)
}

/// Generate a random payment method
fn arb_payment_method() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("cash".to_string()),
        Just("credit_card".to_string()),
        Just("debit_card".to_string()),
        Just("check".to_string()),
    ]
}

/// Generate a random loyalty transaction type
fn arb_loyalty_type() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("Earned".to_string()),
        Just("Redeemed".to_string()),
        Just("Adjusted".to_string()),
        Just("Expired".to_string()),
    ]
}

/// Generate a random gift card transaction type
fn arb_gift_card_type() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("Issued".to_string()),
        Just("Reloaded".to_string()),
        Just("Redeemed".to_string()),
        Just("Refunded".to_string()),
    ]
}

/// Generate a random credit transaction type
fn arb_credit_type() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("Charge".to_string()),
        Just("Payment".to_string()),
        Just("ServiceCharge".to_string()),
        Just("Adjustment".to_string()),
    ]
}

/// Generate a random transaction ID
fn arb_transaction_id() -> impl Strategy<Value = String> {
    "[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}".prop_map(|s| s)
}

/// Generate a random card number
fn arb_card_number() -> impl Strategy<Value = String> {
    "[0-9]{16}".prop_map(|s| s)
}

/// Generate offline flag
fn arb_offline() -> impl Strategy<Value = bool> {
    any::<bool>()
}

// ============================================================================
// Transaction Type Generators
// ============================================================================

#[derive(Debug, Clone)]
enum TransactionType {
    LayawayPayment {
        layaway_id: String,
        amount: f64,
        payment_method: String,
        employee_id: String,
        customer_id: String,
    },
    LoyaltyPointChange {
        customer_id: String,
        transaction_type: String,
        points: i32,
        employee_id: String,
        reference_id: Option<String>,
    },
    GiftCardActivity {
        card_number: String,
        transaction_type: String,
        amount: f64,
        reference_id: Option<String>,
    },
    CreditTransaction {
        account_id: String,
        transaction_type: String,
        amount: f64,
        reference_id: String,
        customer_id: String,
    },
}

fn arb_transaction_type() -> impl Strategy<Value = TransactionType> {
    prop_oneof![
        // Layaway payment
        (
            arb_transaction_id(),
            arb_amount(),
            arb_payment_method(),
            arb_employee_id(),
            arb_customer_id(),
        )
            .prop_map(|(layaway_id, amount, payment_method, employee_id, customer_id)| {
                TransactionType::LayawayPayment {
                    layaway_id,
                    amount,
                    payment_method,
                    employee_id,
                    customer_id,
                }
            }),
        // Loyalty point change
        (
            arb_customer_id(),
            arb_loyalty_type(),
            arb_points(),
            arb_employee_id(),
            prop::option::of(arb_transaction_id()),
        )
            .prop_map(
                |(customer_id, transaction_type, points, employee_id, reference_id)| {
                    TransactionType::LoyaltyPointChange {
                        customer_id,
                        transaction_type,
                        points,
                        employee_id,
                        reference_id,
                    }
                }
            ),
        // Gift card activity
        (
            arb_card_number(),
            arb_gift_card_type(),
            arb_amount(),
            prop::option::of(arb_transaction_id()),
        )
            .prop_map(|(card_number, transaction_type, amount, reference_id)| {
                TransactionType::GiftCardActivity {
                    card_number,
                    transaction_type,
                    amount,
                    reference_id,
                }
            }),
        // Credit transaction
        (
            arb_transaction_id(),
            arb_credit_type(),
            arb_amount(),
            arb_transaction_id(),
            arb_customer_id(),
        )
            .prop_map(|(account_id, transaction_type, amount, reference_id, customer_id)| {
                TransactionType::CreditTransaction {
                    account_id,
                    transaction_type,
                    amount,
                    reference_id,
                    customer_id,
                }
            }),
    ]
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Log a transaction to the audit log based on its type
async fn log_transaction(
    logger: &AuditLogger,
    transaction: &TransactionType,
    store_id: &str,
    is_offline: bool,
) -> Result<String, Box<dyn std::error::Error>> {
    match transaction {
        TransactionType::LayawayPayment {
            layaway_id,
            amount,
            payment_method,
            employee_id,
            customer_id,
        } => {
            let changes = json!({
                "layaway_id": layaway_id,
                "amount": amount,
                "payment_method": payment_method,
                "customer_id": customer_id,
            });

            logger
                .log(
                    "layaway_payment",
                    layaway_id,
                    "payment",
                    None,
                    Some(employee_id),
                    Some(changes),
                    None,
                    None,
                    is_offline,
                    store_id,
                )
                .await
        }
        TransactionType::LoyaltyPointChange {
            customer_id,
            transaction_type,
            points,
            employee_id,
            reference_id,
        } => {
            let transaction_id = Uuid::new_v4().to_string();
            let changes = json!({
                "customer_id": customer_id,
                "transaction_type": transaction_type,
                "points": points,
                "reference_id": reference_id,
            });

            logger
                .log(
                    "loyalty_transaction",
                    &transaction_id,
                    transaction_type,
                    None,
                    Some(employee_id),
                    Some(changes),
                    None,
                    None,
                    is_offline,
                    store_id,
                )
                .await
        }
        TransactionType::GiftCardActivity {
            card_number,
            transaction_type,
            amount,
            reference_id,
        } => {
            let transaction_id = Uuid::new_v4().to_string();
            let changes = json!({
                "card_number": card_number,
                "transaction_type": transaction_type,
                "amount": amount,
                "reference_id": reference_id,
            });

            logger
                .log(
                    "gift_card_transaction",
                    &transaction_id,
                    transaction_type,
                    None,
                    None, // Gift card transactions may not have employee_id
                    Some(changes),
                    None,
                    None,
                    is_offline,
                    store_id,
                )
                .await
        }
        TransactionType::CreditTransaction {
            account_id,
            transaction_type,
            amount,
            reference_id,
            customer_id,
        } => {
            let transaction_id = Uuid::new_v4().to_string();
            let changes = json!({
                "account_id": account_id,
                "transaction_type": transaction_type,
                "amount": amount,
                "reference_id": reference_id,
                "customer_id": customer_id,
            });

            logger
                .log(
                    "credit_transaction",
                    &transaction_id,
                    transaction_type,
                    None,
                    None,
                    Some(changes),
                    None,
                    None,
                    is_offline,
                    store_id,
                )
                .await
        }
    }
}

// ============================================================================
// Property 27: Transaction Audit Logging
// ============================================================================
// **Validates: Requirements 1.3, 4.8, 6.7, 9.8**
//
// For any transaction (layaway payment, loyalty point change, gift card activity,
// credit transaction), an audit log entry should be created recording the transaction
// details, timestamp, and employee ID

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_27_transaction_audit_logging(
        transaction in arb_transaction_type(),
        store_id in arb_store_id(),
        is_offline in arb_offline(),
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Create test database
            let pool = create_test_db().await.unwrap();
            let logger = AuditLogger::new(pool.clone());

            // Log the transaction
            let log_id = log_transaction(&logger, &transaction, &store_id, is_offline)
                .await
                .expect("Failed to log transaction");

            // Verify the audit log entry was created
            let entry = sqlx::query_as::<_, AuditLogEntry>(
                "SELECT * FROM audit_log WHERE id = ?"
            )
            .bind(&log_id)
            .fetch_one(&pool)
            .await
            .expect("Failed to fetch audit log entry");

            // Verify common fields
            prop_assert_eq!(
                entry.store_id,
                store_id,
                "Store ID mismatch"
            );

            prop_assert_eq!(
                entry.is_offline,
                is_offline,
                "Offline flag mismatch"
            );

            // Verify timestamp exists and is valid RFC3339
            prop_assert!(
                !entry.created_at.is_empty(),
                "Timestamp is empty"
            );
            prop_assert!(
                chrono::DateTime::parse_from_rfc3339(&entry.created_at).is_ok(),
                "Invalid timestamp format: {}",
                entry.created_at
            );

            // Verify transaction-specific fields
            match &transaction {
                TransactionType::LayawayPayment {
                    layaway_id,
                    amount,
                    payment_method,
                    employee_id,
                    customer_id,
                } => {
                    prop_assert_eq!(
                        entry.entity_type,
                        "layaway_payment",
                        "Entity type mismatch for layaway payment"
                    );
                    prop_assert_eq!(
                        entry.entity_id,
                        layaway_id.clone(),
                        "Entity ID mismatch for layaway payment"
                    );
                    prop_assert_eq!(
                        entry.operation,
                        "payment",
                        "Operation mismatch for layaway payment"
                    );
                    prop_assert_eq!(
                        entry.employee_id,
                        Some(employee_id.clone()),
                        "Employee ID mismatch for layaway payment"
                    );

                    // Verify changes JSON contains transaction details
                    if let Some(changes_str) = entry.changes {
                        let changes: serde_json::Value = serde_json::from_str(&changes_str)
                            .expect("Failed to parse changes JSON");

                        prop_assert_eq!(
                            changes.get("layaway_id").and_then(|v| v.as_str()),
                            Some(layaway_id.as_str()),
                            "Layaway ID not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("amount").and_then(|v| v.as_f64()),
                            Some(*amount),
                            "Amount not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("payment_method").and_then(|v| v.as_str()),
                            Some(payment_method.as_str()),
                            "Payment method not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("customer_id").and_then(|v| v.as_str()),
                            Some(customer_id.as_str()),
                            "Customer ID not found in changes"
                        );
                    } else {
                        return Err(proptest::test_runner::TestCaseError::fail(
                            "Changes field is missing for layaway payment"
                        ));
                    }
                }
                TransactionType::LoyaltyPointChange {
                    customer_id,
                    transaction_type,
                    points,
                    employee_id,
                    reference_id,
                } => {
                    prop_assert_eq!(
                        entry.entity_type,
                        "loyalty_transaction",
                        "Entity type mismatch for loyalty transaction"
                    );
                    prop_assert_eq!(
                        entry.operation,
                        transaction_type.clone(),
                        "Operation mismatch for loyalty transaction"
                    );
                    prop_assert_eq!(
                        entry.employee_id,
                        Some(employee_id.clone()),
                        "Employee ID mismatch for loyalty transaction"
                    );

                    // Verify changes JSON contains transaction details
                    if let Some(changes_str) = entry.changes {
                        let changes: serde_json::Value = serde_json::from_str(&changes_str)
                            .expect("Failed to parse changes JSON");

                        prop_assert_eq!(
                            changes.get("customer_id").and_then(|v| v.as_str()),
                            Some(customer_id.as_str()),
                            "Customer ID not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("transaction_type").and_then(|v| v.as_str()),
                            Some(transaction_type.as_str()),
                            "Transaction type not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("points").and_then(|v| v.as_i64()),
                            Some(*points as i64),
                            "Points not found in changes"
                        );
                        if let Some(ref_id) = reference_id {
                            prop_assert_eq!(
                                changes.get("reference_id").and_then(|v| v.as_str()),
                                Some(ref_id.as_str()),
                                "Reference ID not found in changes"
                            );
                        }
                    } else {
                        return Err(proptest::test_runner::TestCaseError::fail(
                            "Changes field is missing for loyalty transaction"
                        ));
                    }
                }
                TransactionType::GiftCardActivity {
                    card_number,
                    transaction_type,
                    amount,
                    reference_id,
                } => {
                    prop_assert_eq!(
                        entry.entity_type,
                        "gift_card_transaction",
                        "Entity type mismatch for gift card transaction"
                    );
                    prop_assert_eq!(
                        entry.operation,
                        transaction_type.clone(),
                        "Operation mismatch for gift card transaction"
                    );

                    // Verify changes JSON contains transaction details
                    if let Some(changes_str) = entry.changes {
                        let changes: serde_json::Value = serde_json::from_str(&changes_str)
                            .expect("Failed to parse changes JSON");

                        prop_assert_eq!(
                            changes.get("card_number").and_then(|v| v.as_str()),
                            Some(card_number.as_str()),
                            "Card number not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("transaction_type").and_then(|v| v.as_str()),
                            Some(transaction_type.as_str()),
                            "Transaction type not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("amount").and_then(|v| v.as_f64()),
                            Some(*amount),
                            "Amount not found in changes"
                        );
                        if let Some(ref_id) = reference_id {
                            prop_assert_eq!(
                                changes.get("reference_id").and_then(|v| v.as_str()),
                                Some(ref_id.as_str()),
                                "Reference ID not found in changes"
                            );
                        }
                    } else {
                        return Err(proptest::test_runner::TestCaseError::fail(
                            "Changes field is missing for gift card transaction"
                        ));
                    }
                }
                TransactionType::CreditTransaction {
                    account_id,
                    transaction_type,
                    amount,
                    reference_id,
                    customer_id,
                } => {
                    prop_assert_eq!(
                        entry.entity_type,
                        "credit_transaction",
                        "Entity type mismatch for credit transaction"
                    );
                    prop_assert_eq!(
                        entry.operation,
                        transaction_type.clone(),
                        "Operation mismatch for credit transaction"
                    );

                    // Verify changes JSON contains transaction details
                    if let Some(changes_str) = entry.changes {
                        let changes: serde_json::Value = serde_json::from_str(&changes_str)
                            .expect("Failed to parse changes JSON");

                        prop_assert_eq!(
                            changes.get("account_id").and_then(|v| v.as_str()),
                            Some(account_id.as_str()),
                            "Account ID not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("transaction_type").and_then(|v| v.as_str()),
                            Some(transaction_type.as_str()),
                            "Transaction type not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("amount").and_then(|v| v.as_f64()),
                            Some(*amount),
                            "Amount not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("reference_id").and_then(|v| v.as_str()),
                            Some(reference_id.as_str()),
                            "Reference ID not found in changes"
                        );
                        prop_assert_eq!(
                            changes.get("customer_id").and_then(|v| v.as_str()),
                            Some(customer_id.as_str()),
                            "Customer ID not found in changes"
                        );
                    } else {
                        return Err(proptest::test_runner::TestCaseError::fail(
                            "Changes field is missing for credit transaction"
                        ));
                    }
                }
            }

            Ok(())
        })?;
    }
}

// ============================================================================
// Additional Property Tests
// ============================================================================

#[cfg(test)]
mod additional_tests {
    use super::*;

    /// Property: Multiple transactions should all be logged
    /// This tests that performing multiple transaction operations in sequence
    /// results in multiple audit log entries
    #[test]
    fn property_multiple_transactions_all_logged() {
        proptest!(|(
            transactions in prop::collection::vec(arb_transaction_type(), 2..5),
            store_id in arb_store_id(),
            is_offline in arb_offline(),
        )| {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = create_test_db().await.unwrap();
                let logger = AuditLogger::new(pool.clone());

                let mut log_ids = Vec::new();

                // Log all transactions
                for transaction in &transactions {
                    let log_id = log_transaction(&logger, transaction, &store_id, is_offline)
                        .await
                        .expect("Failed to log transaction");
                    log_ids.push(log_id);
                }

                // Verify all log entries exist
                prop_assert_eq!(
                    log_ids.len(),
                    transactions.len(),
                    "Not all transactions were logged"
                );

                // Verify each log entry
                for log_id in log_ids.iter() {
                    let entry = sqlx::query_as::<_, AuditLogEntry>(
                        "SELECT * FROM audit_log WHERE id = ?"
                    )
                    .bind(log_id)
                    .fetch_one(&pool)
                    .await
                    .expect("Failed to fetch audit log entry");

                    prop_assert!(
                        !entry.created_at.is_empty(),
                        "Timestamp is empty for log entry"
                    );
                }

                Ok(())
            })?;
        });
    }

    /// Property: Offline transactions should be flagged correctly
    /// This tests that offline transactions are properly marked in the audit log
    #[test]
    fn property_offline_transactions_flagged() {
        proptest!(|(
            transaction in arb_transaction_type(),
            store_id in arb_store_id(),
        )| {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = create_test_db().await.unwrap();
                let logger = AuditLogger::new(pool.clone());

                // Log transaction as offline
                let log_id = log_transaction(&logger, &transaction, &store_id, true)
                    .await
                    .expect("Failed to log offline transaction");

                // Verify the audit log entry has is_offline = true
                let entry = sqlx::query_as::<_, AuditLogEntry>(
                    "SELECT * FROM audit_log WHERE id = ?"
                )
                .bind(&log_id)
                .fetch_one(&pool)
                .await
                .expect("Failed to fetch audit log entry");

                prop_assert!(
                    entry.is_offline,
                    "Offline flag should be true for offline transaction"
                );

                Ok(())
            })?;
        });
    }

    /// Property: Audit logs should be retrievable by store
    /// This tests that we can query audit logs for a specific store
    #[test]
    fn property_audit_logs_retrievable_by_store() {
        proptest!(|(
            transactions in prop::collection::vec(arb_transaction_type(), 1..3),
            store_id in arb_store_id(),
        )| {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = create_test_db().await.unwrap();
                let logger = AuditLogger::new(pool.clone());

                // Log transactions for the specific store
                for transaction in &transactions {
                    log_transaction(&logger, transaction, &store_id, false)
                        .await
                        .expect("Failed to log transaction");
                }

                // Retrieve audit logs for the store
                let entries = sqlx::query_as::<_, AuditLogEntry>(
                    "SELECT * FROM audit_log WHERE store_id = ? ORDER BY created_at DESC"
                )
                .bind(&store_id)
                .fetch_all(&pool)
                .await
                .expect("Failed to fetch audit log entries");

                // Verify we got at least the transactions we logged
                prop_assert!(
                    entries.len() >= transactions.len(),
                    "Expected at least {} audit log entries, got {}",
                    transactions.len(),
                    entries.len()
                );

                // Verify all entries are for the correct store
                for entry in entries {
                    prop_assert_eq!(
                        &entry.store_id,
                        &store_id,
                        "Wrong store ID in audit trail"
                    );
                }

                Ok(())
            })?;
        });
    }
}
