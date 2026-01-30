// Property-Based Tests for Audit Logging
// Feature: settings-consolidation
// These tests validate that all settings changes result in audit log entries

use proptest::prelude::*;
use serde_json::json;
use EasySale_server::AuditLogger;
use EasySale_server::AuditLogEntry;
use EasySale_server::test_utils::create_test_db;

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a random entity type for settings
fn arb_entity_type() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("user".to_string()),
        Just("role".to_string()),
        Just("store".to_string()),
        Just("station".to_string()),
        Just("setting".to_string()),
    ]
}

/// Generate a random action type
fn arb_action() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("create".to_string()),
        Just("update".to_string()),
        Just("delete".to_string()),
    ]
}

/// Generate a random entity ID
fn arb_entity_id() -> impl Strategy<Value = String> {
    "[a-z0-9]{8,16}".prop_map(|s| s)
}

/// Generate a random user ID
fn arb_user_id() -> impl Strategy<Value = String> {
    "user-[0-9]{1,5}".prop_map(|s| s)
}

/// Generate a random username
fn arb_username() -> impl Strategy<Value = String> {
    "[a-z]{3,10}".prop_map(|s| s)
}

/// Generate optional store ID
fn arb_optional_store_id() -> impl Strategy<Value = Option<String>> {
    prop_oneof![
        Just(None),
        "store-[0-9]{1,3}".prop_map(Some),
    ]
}

/// Generate optional station ID
fn arb_optional_station_id() -> impl Strategy<Value = Option<String>> {
    prop_oneof![
        Just(None),
        "station-[0-9]{1,3}".prop_map(Some),
    ]
}

/// Generate random entity data (before/after values)
fn arb_entity_data() -> impl Strategy<Value = serde_json::Value> {
    prop_oneof![
        // User data
        ("[a-z]{3,10}", "[a-z]+@[a-z]+\\.com", "[a-z]{5,10}")
            .prop_map(|(username, email, role)| json!({
                "username": username,
                "email": email,
                "role": role
            })),
        // Store data
        ("[A-Z][a-z ]{5,20}", "[0-9]{1,5} [A-Z][a-z ]{5,15}")
            .prop_map(|(name, address)| json!({
                "name": name,
                "address": address
            })),
        // Station data
        ("[A-Z][a-z ]{5,15}", "store-[0-9]{1,3}")
            .prop_map(|(name, store_id)| json!({
                "name": name,
                "store_id": store_id
            })),
        // Setting data
        ("[a-z_]{3,15}", "[a-zA-Z0-9 ]{1,20}")
            .prop_map(|(key, value)| json!({
                "key": key,
                "value": value
            })),
    ]
}

/// Generate a random settings change operation
fn arb_settings_change() -> impl Strategy<Value = SettingsChange> {
    (
        arb_entity_type(),
        arb_entity_id(),
        arb_action(),
        arb_user_id(),
        arb_username(),
        arb_optional_store_id(),
        arb_optional_station_id(),
        any::<bool>(), // is_offline
    )
        .prop_flat_map(
            |(entity_type, entity_id, action, user_id, username, store_id, station_id, is_offline)| {
                let action_clone = action.clone();
                (
                    Just(entity_type),
                    Just(entity_id),
                    Just(action),
                    Just(user_id),
                    Just(username),
                    Just(store_id),
                    Just(station_id),
                    Just(is_offline),
                    arb_entity_data(),
                    arb_entity_data(),
                )
                    .prop_map(
                        move |(
                            entity_type,
                            entity_id,
                            action,
                            user_id,
                            username,
                            store_id,
                            station_id,
                            is_offline,
                            before_data,
                            after_data,
                        )| {
                            let (before_value, after_value) = match action_clone.as_str() {
                                "create" => (None, Some(after_data)),
                                "update" => (Some(before_data), Some(after_data)),
                                "delete" => (Some(before_data), None),
                                _ => (None, None),
                            };

                            SettingsChange {
                                entity_type,
                                entity_id,
                                action,
                                user_id,
                                username,
                                store_id,
                                station_id,
                                before_value,
                                after_value,
                                is_offline,
                            }
                        },
                    )
            },
        )
}

#[derive(Debug, Clone)]
struct SettingsChange {
    entity_type: String,
    entity_id: String,
    action: String,
    user_id: String,
    username: String,
    store_id: Option<String>,
    station_id: Option<String>,
    before_value: Option<serde_json::Value>,
    after_value: Option<serde_json::Value>,
    is_offline: bool,
}

// ============================================================================
// Property 6: Audit Log Completeness
// ============================================================================
// **Validates: Requirements 8.1, 8.2**
//
// For any settings change operation (create, update, delete on users, roles,
// stores, stations, or settings), an audit log entry must be created with:
// - Correct entity type and ID
// - Correct action/operation
// - User context (user_id, username)
// - Store/station context (if provided)
// - Before/after values (as appropriate for the action)
// - Offline flag
// - Timestamp

proptest! {
    #![proptest_config(ProptestConfig::with_cases(50))]

    #[test]
    fn property_6_audit_log_completeness(
        change in arb_settings_change()
    ) {
        // Run async test
        let rt = tokio::runtime::Runtime::new().unwrap();
        rt.block_on(async {
            // Create test database
            let pool = create_test_db().await.unwrap();
            let logger = AuditLogger::new(pool.clone());

            // Perform the settings change and log it
            let log_id = logger
                .log_settings_change(
                    &change.entity_type,
                    &change.entity_id,
                    &change.action,
                    &change.user_id,
                    &change.username,
                    change.store_id.as_deref(),
                    change.station_id.as_deref(),
                    change.before_value.clone(),
                    change.after_value.clone(),
                    change.is_offline,
                )
                .await
                .expect("Failed to log settings change");

            // Verify the audit log entry was created
            let entry = sqlx::query_as::<_, AuditLogEntry>(
                "SELECT * FROM audit_log WHERE id = ?"
            )
            .bind(&log_id)
            .fetch_one(&pool)
            .await
            .expect("Failed to fetch audit log entry");

            // Verify entity type and ID
            prop_assert_eq!(
                entry.entity_type,
                change.entity_type,
                "Entity type mismatch"
            );
            prop_assert_eq!(
                entry.entity_id,
                change.entity_id,
                "Entity ID mismatch"
            );

            // Verify action/operation
            prop_assert_eq!(
                entry.operation,
                change.action,
                "Operation/action mismatch"
            );

            // Verify user context
            prop_assert_eq!(
                entry.user_id,
                Some(change.user_id.clone()),
                "User ID mismatch"
            );

            // Verify offline flag
            prop_assert_eq!(
                entry.is_offline,
                change.is_offline,
                "Offline flag mismatch"
            );

            // Verify store context
            let expected_store_id = change.store_id.clone().unwrap_or_else(|| "system".to_string());
            prop_assert_eq!(
                entry.store_id,
                expected_store_id,
                "Store ID mismatch"
            );

            // Verify changes JSON contains expected data
            if let Some(changes_str) = entry.changes {
                let changes: serde_json::Value = serde_json::from_str(&changes_str)
                    .expect("Failed to parse changes JSON");

                // Verify username is in changes
                prop_assert_eq!(
                    changes.get("username").and_then(|v| v.as_str()),
                    Some(change.username.as_str()),
                    "Username not found in changes"
                );

                // Verify before value (if expected)
                if let Some(expected_before) = &change.before_value {
                    prop_assert!(
                        changes.get("before").is_some(),
                        "Before value missing"
                    );
                    prop_assert_eq!(
                        changes.get("before").unwrap(),
                        expected_before,
                        "Before value mismatch"
                    );
                }

                // Verify after value (if expected)
                if let Some(expected_after) = &change.after_value {
                    prop_assert!(
                        changes.get("after").is_some(),
                        "After value missing"
                    );
                    prop_assert_eq!(
                        changes.get("after").unwrap(),
                        expected_after,
                        "After value mismatch"
                    );
                }

                // Verify context fields
                if let Some(store_id) = &change.store_id {
                    prop_assert_eq!(
                        changes.get("context_store_id").and_then(|v| v.as_str()),
                        Some(store_id.as_str()),
                        "Context store ID mismatch"
                    );
                }

                if let Some(station_id) = &change.station_id {
                    prop_assert_eq!(
                        changes.get("context_station_id").and_then(|v| v.as_str()),
                        Some(station_id.as_str()),
                        "Context station ID mismatch"
                    );
                }
            } else {
                // If no changes field, verify we didn't expect any data
                prop_assert!(
                    change.before_value.is_none() && change.after_value.is_none(),
                    "Expected changes data but none was logged"
                );
            }

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

    /// Property: Multiple settings changes should all be logged
    /// This tests that performing multiple operations in sequence
    /// results in multiple audit log entries
    #[test]
    fn property_multiple_changes_all_logged() {
        proptest!(|(
            changes in prop::collection::vec(arb_settings_change(), 2..5)
        )| {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = create_test_db().await.unwrap();
                let logger = AuditLogger::new(pool.clone());

                let mut log_ids = Vec::new();

                // Log all changes
                for change in &changes {
                    let log_id = logger
                        .log_settings_change(
                            &change.entity_type,
                            &change.entity_id,
                            &change.action,
                            &change.user_id,
                            &change.username,
                            change.store_id.as_deref(),
                            change.station_id.as_deref(),
                            change.before_value.clone(),
                            change.after_value.clone(),
                            change.is_offline,
                        )
                        .await
                        .expect("Failed to log settings change");
                    log_ids.push(log_id);
                }

                // Verify all log entries exist
                prop_assert_eq!(
                    log_ids.len(),
                    changes.len(),
                    "Not all changes were logged"
                );

                // Verify each log entry
                for (i, log_id) in log_ids.iter().enumerate() {
                    let entry = sqlx::query_as::<_, AuditLogEntry>(
                        "SELECT * FROM audit_log WHERE id = ?"
                    )
                    .bind(log_id)
                    .fetch_one(&pool)
                    .await
                    .expect("Failed to fetch audit log entry");

                    prop_assert_eq!(
                        &entry.entity_type,
                        &changes[i].entity_type,
                        "Entity type mismatch for change {}", i
                    );
                }

                Ok(())
            })?;
        });
    }

    /// Property: Audit logs should be retrievable by entity
    /// This tests that we can query audit logs for a specific entity
    #[test]
    fn property_audit_logs_retrievable_by_entity() {
        proptest!(|(
            entity_type in arb_entity_type(),
            entity_id in arb_entity_id(),
            changes in prop::collection::vec(arb_settings_change(), 1..3)
        )| {
            let rt = tokio::runtime::Runtime::new().unwrap();
            rt.block_on(async {
                let pool = create_test_db().await.unwrap();
                let logger = AuditLogger::new(pool.clone());

                // Log changes for the specific entity
                for change in changes.clone() {
                    let mut modified_change = change;
                    modified_change.entity_type = entity_type.clone();
                    modified_change.entity_id = entity_id.clone();

                    logger
                        .log_settings_change(
                            &modified_change.entity_type,
                            &modified_change.entity_id,
                            &modified_change.action,
                            &modified_change.user_id,
                            &modified_change.username,
                            modified_change.store_id.as_deref(),
                            modified_change.station_id.as_deref(),
                            modified_change.before_value.clone(),
                            modified_change.after_value.clone(),
                            modified_change.is_offline,
                        )
                        .await
                        .expect("Failed to log settings change");
                }

                // Retrieve audit trail for the entity
                let trail = logger
                    .get_audit_trail(&entity_type, &entity_id, 100)
                    .await
                    .expect("Failed to get audit trail");

                // Verify we got at least the changes we logged
                prop_assert!(
                    trail.len() >= changes.len(),
                    "Expected at least {} audit log entries, got {}",
                    changes.len(),
                    trail.len()
                );

                // Verify all entries are for the correct entity
                for entry in trail {
                    prop_assert_eq!(
                        &entry.entity_type,
                        &entity_type,
                        "Wrong entity type in audit trail"
                    );
                    prop_assert_eq!(
                        &entry.entity_id,
                        &entity_id,
                        "Wrong entity ID in audit trail"
                    );
                }

                Ok(())
            })?;
        });
    }
}
