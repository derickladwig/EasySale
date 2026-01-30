// Property-Based Tests for Settings Resolution
// Feature: settings-consolidation
// These tests validate that settings resolution follows the correct scope hierarchy

use proptest::prelude::*;
use serde_json::json;
use EasySale_server::services::settings_resolution::{
    SettingScope, SettingValue, SettingsResolutionService,
};

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a random setting key
fn arb_setting_key() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("theme".to_string()),
        Just("currency".to_string()),
        Just("language".to_string()),
        Just("timeout".to_string()),
        Just("receipt_width".to_string()),
        Just("tax_rate".to_string()),
        Just("sync_interval".to_string()),
        "[a-z_]{3,15}".prop_map(|s| s),
    ]
}

/// Generate a random setting value
fn arb_setting_value() -> impl Strategy<Value = serde_json::Value> {
    prop_oneof![
        // String values
        "[a-z]{2,10}".prop_map(|s| json!(s)),
        // Number values
        (1..1000i32).prop_map(|n| json!(n)),
        // Boolean values
        any::<bool>().prop_map(|b| json!(b)),
        // Object values
        ("[a-z]{3,8}", "[a-z]{3,8}").prop_map(|(k, v)| json!({ k: v })),
    ]
}

/// Generate a random user ID
fn arb_user_id() -> impl Strategy<Value = String> {
    "user-[0-9]{1,5}".prop_map(|s| s)
}

/// Generate a random station ID
fn arb_station_id() -> impl Strategy<Value = String> {
    "station-[0-9]{1,3}".prop_map(|s| s)
}

/// Generate a random store ID
fn arb_store_id() -> impl Strategy<Value = String> {
    "store-[0-9]{1,3}".prop_map(|s| s)
}

/// Generate a setting at a specific scope
fn arb_setting_at_scope(
    key: String,
    scope: SettingScope,
) -> impl Strategy<Value = SettingValue> {
    let key_clone = key.clone();
    (arb_setting_value(), any::<bool>()).prop_flat_map(move |(value, has_source)| {
        let key = key_clone.clone();
        let source_strategy: BoxedStrategy<Option<String>> = match scope {
            SettingScope::User if has_source => arb_user_id().prop_map(Some).boxed(),
            SettingScope::Station if has_source => arb_station_id().prop_map(Some).boxed(),
            SettingScope::Store if has_source => arb_store_id().prop_map(Some).boxed(),
            SettingScope::Global => Just(None).boxed(),
            _ => Just(None).boxed(),
        };

        source_strategy.prop_map(move |source_id| SettingValue {
            key: key.clone(),
            value: value.clone(),
            scope,
            source_id,
            description: None,
        })
    })
}

/// Generate a random setting hierarchy for a single key
/// This creates settings at multiple scopes with the same key
fn arb_setting_hierarchy() -> impl Strategy<Value = SettingHierarchy> {
    arb_setting_key().prop_flat_map(|key| {
        let key_clone = key.clone();
        (
            // Global setting (always present)
            arb_setting_at_scope(key.clone(), SettingScope::Global),
            // Optional store setting
            prop::option::of(arb_setting_at_scope(key.clone(), SettingScope::Store)),
            // Optional station setting
            prop::option::of(arb_setting_at_scope(key.clone(), SettingScope::Station)),
            // Optional user setting
            prop::option::of(arb_setting_at_scope(key.clone(), SettingScope::User)),
        )
            .prop_map(move |(global, store, station, user)| {
                let mut settings = vec![global];
                if let Some(s) = store {
                    settings.push(s);
                }
                if let Some(s) = station {
                    settings.push(s);
                }
                if let Some(s) = user {
                    settings.push(s);
                }
                SettingHierarchy {
                    key: key_clone.clone(),
                    settings,
                }
            })
    })
}

/// Generate a random user context
fn arb_user_context() -> impl Strategy<Value = UserContext> {
    (
        prop::option::of(arb_user_id()),
        prop::option::of(arb_station_id()),
        prop::option::of(arb_store_id()),
    )
        .prop_map(|(user_id, station_id, store_id)| UserContext {
            user_id,
            station_id,
            store_id,
        })
}

#[derive(Debug, Clone)]
struct SettingHierarchy {
    key: String,
    settings: Vec<SettingValue>,
}

#[derive(Debug, Clone)]
struct UserContext {
    user_id: Option<String>,
    station_id: Option<String>,
    store_id: Option<String>,
}

// ============================================================================
// Property 4: Settings Scope Resolution
// ============================================================================
// **Validates: Requirements 1.5, 11.2, 11.3**
//
// For any setting key, the effective value should be resolved by checking
// User → Station → Store → Global in that order, returning the first
// non-null value that matches the current context.
//
// This property ensures that:
// 1. The resolution follows the correct precedence order
// 2. Context matching is correct (user_id, station_id, store_id)
// 3. Fallback to lower scopes works correctly
// 4. Global settings are always available as fallback

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_4_settings_scope_resolution(
        hierarchy in arb_setting_hierarchy(),
        context in arb_user_context()
    ) {
        // Resolve the settings with the given context
        let resolved = SettingsResolutionService::resolve_settings(
            context.user_id.clone(),
            context.station_id.clone(),
            context.store_id.clone(),
            hierarchy.settings.clone(),
        );

        // Should have exactly one resolved setting for this key
        prop_assert_eq!(
            resolved.len(),
            1,
            "Expected exactly one resolved setting for key '{}'",
            hierarchy.key
        );

        let resolved_setting = resolved.get(&hierarchy.key).unwrap();

        // Determine the expected effective scope based on context and available settings
        let expected_scope = determine_expected_scope(&hierarchy.settings, &context);

        // Verify the effective scope matches expectations
        prop_assert_eq!(
            resolved_setting.effective_scope,
            expected_scope,
            "Expected scope {:?} but got {:?} for context user={:?}, station={:?}, store={:?}",
            expected_scope,
            resolved_setting.effective_scope,
            context.user_id,
            context.station_id,
            context.store_id
        );

        // Verify the effective value matches the expected scope's value
        let expected_value = hierarchy
            .settings
            .iter()
            .find(|s| {
                s.scope == expected_scope
                    && matches_context(s, &context)
            })
            .map(|s| &s.value);

        if let Some(expected) = expected_value {
            prop_assert_eq!(
                &resolved_setting.effective_value,
                expected,
                "Effective value doesn't match expected value for scope {:?}",
                expected_scope
            );
        }

        // Verify is_overridden flag
        let expected_overridden = expected_scope != SettingScope::Global;
        prop_assert_eq!(
            resolved_setting.is_overridden,
            expected_overridden,
            "is_overridden flag should be {} for scope {:?}",
            expected_overridden,
            expected_scope
        );

        // Verify all_values contains all settings for this key
        prop_assert_eq!(
            resolved_setting.all_values.len(),
            hierarchy.settings.len(),
            "all_values should contain all settings for this key"
        );
    }
}

/// Determine the expected effective scope based on the hierarchy and context
/// This implements the same logic as the resolution service to verify correctness
fn determine_expected_scope(
    settings: &[SettingValue],
    context: &UserContext,
) -> SettingScope {
    // Try User scope first
    if context.user_id.is_some() {
        if settings.iter().any(|s| {
            s.scope == SettingScope::User
                && s.source_id.as_ref() == context.user_id.as_ref()
        }) {
            return SettingScope::User;
        }
    }

    // Try Station scope
    if context.station_id.is_some() {
        if settings.iter().any(|s| {
            s.scope == SettingScope::Station
                && s.source_id.as_ref() == context.station_id.as_ref()
        }) {
            return SettingScope::Station;
        }
    }

    // Try Store scope
    if context.store_id.is_some() {
        if settings.iter().any(|s| {
            s.scope == SettingScope::Store
                && s.source_id.as_ref() == context.store_id.as_ref()
        }) {
            return SettingScope::Store;
        }
    }

    // Fall back to Global
    SettingScope::Global
}

/// Check if a setting matches the current context
fn matches_context(setting: &SettingValue, context: &UserContext) -> bool {
    match setting.scope {
        SettingScope::User => setting.source_id.as_ref() == context.user_id.as_ref(),
        SettingScope::Station => setting.source_id.as_ref() == context.station_id.as_ref(),
        SettingScope::Store => setting.source_id.as_ref() == context.store_id.as_ref(),
        SettingScope::Global => setting.source_id.is_none(),
    }
}

// ============================================================================
// Additional Property Tests
// ============================================================================

#[cfg(test)]
mod additional_tests {
    use super::*;

    /// Property: Global settings are always available as fallback
    /// Even with no context, global settings should always resolve
    #[test]
    fn property_global_fallback_always_works() {
        proptest!(|(
            key in arb_setting_key(),
            value in arb_setting_value()
        )| {
            let settings = vec![SettingValue {
                key: key.clone(),
                value: value.clone(),
                scope: SettingScope::Global,
                source_id: None,
                description: None,
            }];

            // Resolve with no context
            let resolved = SettingsResolutionService::resolve_settings(
                None,
                None,
                None,
                settings,
            );

            prop_assert_eq!(resolved.len(), 1);
            let resolved_setting = resolved.get(&key).unwrap();
            prop_assert_eq!(&resolved_setting.effective_value, &value);
            prop_assert_eq!(resolved_setting.effective_scope, SettingScope::Global);
            prop_assert!(!resolved_setting.is_overridden);
        });
    }

    /// Property: User scope always wins when present and matching
    /// If a user-scoped setting exists for the current user, it should always be used
    #[test]
    fn property_user_scope_highest_precedence() {
        proptest!(|(
            key in arb_setting_key(),
            user_id in arb_user_id(),
            global_value in arb_setting_value(),
            store_value in arb_setting_value(),
            station_value in arb_setting_value(),
            user_value in arb_setting_value(),
        )| {
            let settings = vec![
                SettingValue {
                    key: key.clone(),
                    value: global_value,
                    scope: SettingScope::Global,
                    source_id: None,
                    description: None,
                },
                SettingValue {
                    key: key.clone(),
                    value: store_value,
                    scope: SettingScope::Store,
                    source_id: Some("store-1".to_string()),
                    description: None,
                },
                SettingValue {
                    key: key.clone(),
                    value: station_value,
                    scope: SettingScope::Station,
                    source_id: Some("station-1".to_string()),
                    description: None,
                },
                SettingValue {
                    key: key.clone(),
                    value: user_value.clone(),
                    scope: SettingScope::User,
                    source_id: Some(user_id.clone()),
                    description: None,
                },
            ];

            // Resolve with user context
            let resolved = SettingsResolutionService::resolve_settings(
                Some(user_id),
                Some("station-1".to_string()),
                Some("store-1".to_string()),
                settings,
            );

            let resolved_setting = resolved.get(&key).unwrap();
            prop_assert_eq!(&resolved_setting.effective_value, &user_value);
            prop_assert_eq!(resolved_setting.effective_scope, SettingScope::User);
            prop_assert!(resolved_setting.is_overridden);
        });
    }

    /// Property: Context mismatch causes fallback to lower scope
    /// If a setting exists at a higher scope but doesn't match the context,
    /// resolution should fall back to the next lower scope
    #[test]
    fn property_context_mismatch_fallback() {
        proptest!(|(
            key in arb_setting_key(),
            global_value in arb_setting_value(),
            store_value in arb_setting_value(),
        )| {
            let settings = vec![
                SettingValue {
                    key: key.clone(),
                    value: global_value.clone(),
                    scope: SettingScope::Global,
                    source_id: None,
                    description: None,
                },
                SettingValue {
                    key: key.clone(),
                    value: store_value,
                    scope: SettingScope::Store,
                    source_id: Some("store-1".to_string()),
                    description: None,
                },
            ];

            // Resolve with different store context (mismatch)
            let resolved = SettingsResolutionService::resolve_settings(
                None,
                None,
                Some("store-2".to_string()), // Different store
                settings,
            );

            // Should fall back to global
            let resolved_setting = resolved.get(&key).unwrap();
            prop_assert_eq!(&resolved_setting.effective_value, &global_value);
            prop_assert_eq!(resolved_setting.effective_scope, SettingScope::Global);
            prop_assert!(!resolved_setting.is_overridden);
        });
    }

    /// Property: Multiple settings with same key are all tracked
    /// The all_values field should contain all settings for a key across all scopes
    #[test]
    fn property_all_values_tracked() {
        proptest!(|(
            hierarchy in arb_setting_hierarchy(),
            context in arb_user_context()
        )| {
            let resolved = SettingsResolutionService::resolve_settings(
                context.user_id,
                context.station_id,
                context.store_id,
                hierarchy.settings.clone(),
            );

            let resolved_setting = resolved.get(&hierarchy.key).unwrap();

            // Verify all_values contains all settings
            prop_assert_eq!(
                resolved_setting.all_values.len(),
                hierarchy.settings.len()
            );

            // Verify all scopes are represented
            let mut expected_scopes: Vec<SettingScope> = hierarchy
                .settings
                .iter()
                .map(|s| s.scope)
                .collect();
            expected_scopes.sort();
            expected_scopes.dedup();

            let mut actual_scopes: Vec<SettingScope> = resolved_setting
                .all_values
                .iter()
                .map(|s| s.scope)
                .collect();
            actual_scopes.sort();
            actual_scopes.dedup();

            prop_assert_eq!(actual_scopes, expected_scopes);
        });
    }

    /// Property: Station scope takes precedence over store
    /// When both station and store settings exist, station should win
    #[test]
    fn property_station_over_store() {
        proptest!(|(
            key in arb_setting_key(),
            station_id in arb_station_id(),
            store_id in arb_store_id(),
            global_value in arb_setting_value(),
            store_value in arb_setting_value(),
            station_value in arb_setting_value(),
        )| {
            let settings = vec![
                SettingValue {
                    key: key.clone(),
                    value: global_value,
                    scope: SettingScope::Global,
                    source_id: None,
                    description: None,
                },
                SettingValue {
                    key: key.clone(),
                    value: store_value,
                    scope: SettingScope::Store,
                    source_id: Some(store_id.clone()),
                    description: None,
                },
                SettingValue {
                    key: key.clone(),
                    value: station_value.clone(),
                    scope: SettingScope::Station,
                    source_id: Some(station_id.clone()),
                    description: None,
                },
            ];

            // Resolve with both station and store context
            let resolved = SettingsResolutionService::resolve_settings(
                None,
                Some(station_id),
                Some(store_id),
                settings,
            );

            let resolved_setting = resolved.get(&key).unwrap();
            prop_assert_eq!(&resolved_setting.effective_value, &station_value);
            prop_assert_eq!(resolved_setting.effective_scope, SettingScope::Station);
        });
    }

    /// Property: Store scope takes precedence over global
    /// When both store and global settings exist, store should win
    #[test]
    fn property_store_over_global() {
        proptest!(|(
            key in arb_setting_key(),
            store_id in arb_store_id(),
            global_value in arb_setting_value(),
            store_value in arb_setting_value(),
        )| {
            let settings = vec![
                SettingValue {
                    key: key.clone(),
                    value: global_value,
                    scope: SettingScope::Global,
                    source_id: None,
                    description: None,
                },
                SettingValue {
                    key: key.clone(),
                    value: store_value.clone(),
                    scope: SettingScope::Store,
                    source_id: Some(store_id.clone()),
                    description: None,
                },
            ];

            // Resolve with store context
            let resolved = SettingsResolutionService::resolve_settings(
                None,
                None,
                Some(store_id),
                settings,
            );

            let resolved_setting = resolved.get(&key).unwrap();
            prop_assert_eq!(&resolved_setting.effective_value, &store_value);
            prop_assert_eq!(resolved_setting.effective_scope, SettingScope::Store);
            prop_assert!(resolved_setting.is_overridden);
        });
    }
}

