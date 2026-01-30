/**
 * Settings Scope Enforcement
 * Backend validation to ensure settings are only written to allowed scopes
 * 
 * This mirrors the frontend SettingsRegistry validation to prevent data corruption
 * Requirements: 5.9 (unified-design-system spec)
 */

use std::collections::HashMap;
use once_cell::sync::Lazy;

#[derive(Debug, Clone, PartialEq)]
pub enum SettingType {
    Policy,
    Preference,
}

#[derive(Debug, Clone, PartialEq)]
pub enum SettingScope {
    Store,
    User,
}

#[derive(Debug, Clone)]
pub struct SettingScopeRule {
    pub key: String,
    pub setting_type: SettingType,
    pub allowed_scopes: Vec<SettingScope>,
}

#[derive(Debug)]
pub struct InvalidScopeError {
    pub key: String,
    pub attempted_scope: String,
    pub allowed_scopes: Vec<String>,
}

impl std::fmt::Display for InvalidScopeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "Cannot set setting '{}' at {} scope. Allowed scopes: {}",
            self.key,
            self.attempted_scope,
            self.allowed_scopes.join(", ")
        )
    }
}

impl std::error::Error for InvalidScopeError {}

// Backend whitelist of setting scope rules
// This is a small, stable list that mirrors the frontend definitions
static SETTING_SCOPE_RULES: Lazy<HashMap<String, SettingScopeRule>> = Lazy::new(|| {
    let mut rules = HashMap::new();

    // Personal settings (preference, user-only)
    for key in &[
        "user.display_name",
        "user.email",
        "user.email_notifications",
        "user.desktop_notifications",
    ] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Preference,
                allowed_scopes: vec![SettingScope::User],
            },
        );
    }

    // Theme preferences (preference, user or store)
    // THEMESYNC[BE-0001][module=settings][type=theme-setting-contract]: Backend theme setting keys
    // These keys must match frontend ThemeProvider expectations.
    // Any rename requires coordinated frontend update.
    // See: audit/THEME_CONFLICT_MAP.md#BE-0001
    for key in &["user.theme_mode", "user.theme_accent", "user.theme_density"] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Preference,
                allowed_scopes: vec![SettingScope::User, SettingScope::Store],
            },
        );
    }

    // Store configuration (policy, store-only)
    for key in &[
        "store.name",
        "store.address",
        "store.phone",
        "store.tax_enabled",
        "store.default_tax_rate",
        "store.tax_name",
        "store.theme_lock_mode",
        "store.theme_lock_accent",
        "store.theme_lock_contrast",
    ] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Policy,
                allowed_scopes: vec![SettingScope::Store],
            },
        );
    }

    // Sell & Payments (policy, store-only)
    for key in &[
        "sell.allow_discounts",
        "sell.max_discount_percent",
        "sell.require_customer",
        "sell.allow_negative_inventory",
        "payments.cash_enabled",
        "payments.card_enabled",
        "payments.digital_wallet_enabled",
    ] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Policy,
                allowed_scopes: vec![SettingScope::Store],
            },
        );
    }

    // Receipt printer (preference, user or store)
    rules.insert(
        "payments.receipt_printer_enabled".to_string(),
        SettingScopeRule {
            key: "payments.receipt_printer_enabled".to_string(),
            setting_type: SettingType::Preference,
            allowed_scopes: vec![SettingScope::User, SettingScope::Store],
        },
    );

    // Inventory & Products (policy, store-only)
    for key in &[
        "inventory.track_stock",
        "inventory.low_stock_threshold",
        "inventory.auto_reorder_enabled",
        "inventory.serial_number_tracking",
        "inventory.batch_tracking",
        "products.require_barcode",
        "products.auto_generate_sku",
    ] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Policy,
                allowed_scopes: vec![SettingScope::Store],
            },
        );
    }

    // Customers & AR (policy, store-only)
    for key in &[
        "customers.require_phone",
        "customers.require_email",
        "customers.loyalty_enabled",
        "customers.loyalty_points_per_dollar",
        "ar.credit_limit_enabled",
        "ar.default_credit_limit",
        "ar.payment_terms_days",
    ] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Policy,
                allowed_scopes: vec![SettingScope::Store],
            },
        );
    }

    // Users & Security (policy, store-only)
    for key in &[
        "security.password_min_length",
        "security.password_require_uppercase",
        "security.password_require_lowercase",
        "security.password_require_number",
        "security.password_require_special",
        "security.session_timeout_minutes",
        "security.max_login_attempts",
        "security.audit_log_enabled",
    ] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Policy,
                allowed_scopes: vec![SettingScope::Store],
            },
        );
    }

    // Devices & Offline (policy, store-only)
    for key in &[
        "devices.receipt_printer_type",
        "devices.receipt_printer_port",
        "devices.barcode_scanner_enabled",
        "devices.cash_drawer_enabled",
        "offline.sync_enabled",
        "offline.sync_interval_minutes",
        "offline.auto_resolve_conflicts",
        "offline.max_queue_size",
    ] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Policy,
                allowed_scopes: vec![SettingScope::Store],
            },
        );
    }

    // Integrations (policy, store-only)
    for key in &[
        "integrations.quickbooks_enabled",
        "integrations.quickbooks_company_id",
        "integrations.woocommerce_enabled",
        "integrations.woocommerce_url",
        "integrations.woocommerce_consumer_key",
        "integrations.woocommerce_consumer_secret",
        "integrations.stripe_enabled",
        "integrations.stripe_publishable_key",
    ] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Policy,
                allowed_scopes: vec![SettingScope::Store],
            },
        );
    }

    // Advanced (policy, store-only)
    for key in &[
        "advanced.debug_mode",
        "advanced.performance_monitoring",
        "advanced.error_reporting_url",
        "advanced.api_timeout_seconds",
        "advanced.cache_enabled",
        "advanced.cache_ttl_minutes",
        "localization.currency",
        "localization.currency_symbol",
        "localization.timezone",
    ] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Policy,
                allowed_scopes: vec![SettingScope::Store],
            },
        );
    }

    // Localization preferences (preference, user or store)
    for key in &[
        "localization.language",
        "localization.date_format",
        "localization.time_format",
    ] {
        rules.insert(
            key.to_string(),
            SettingScopeRule {
                key: key.to_string(),
                setting_type: SettingType::Preference,
                allowed_scopes: vec![SettingScope::User, SettingScope::Store],
            },
        );
    }

    rules
});

pub struct SettingsScopeEnforcement;

impl SettingsScopeEnforcement {
    /// Validate that a setting can be written to the specified scope
    /// Returns Ok(()) if valid, Err(InvalidScopeError) if invalid
    pub fn validate_write(key: &str, scope: &str) -> Result<(), InvalidScopeError> {
        // Convert scope string to enum
        let scope_enum = match scope {
            "store" => SettingScope::Store,
            "user" => SettingScope::User,
            _ => {
                return Err(InvalidScopeError {
                    key: key.to_string(),
                    attempted_scope: scope.to_string(),
                    allowed_scopes: vec!["store".to_string(), "user".to_string()],
                });
            }
        };

        // Check if setting has a rule
        if let Some(rule) = SETTING_SCOPE_RULES.get(key) {
            // Check if scope is allowed
            if !rule.allowed_scopes.contains(&scope_enum) {
                let allowed_scopes: Vec<String> = rule
                    .allowed_scopes
                    .iter()
                    .map(|s| match s {
                        SettingScope::Store => "store".to_string(),
                        SettingScope::User => "user".to_string(),
                    })
                    .collect();

                return Err(InvalidScopeError {
                    key: key.to_string(),
                    attempted_scope: scope.to_string(),
                    allowed_scopes,
                });
            }
            Ok(())
        } else {
            // Unknown setting key - allow it but log a warning
            // This prevents breaking changes when new settings are added
            log::warn!("Unknown setting key: {}. Allowing write.", key);
            Ok(())
        }
    }

    /// Get the setting type for a key
    pub fn get_setting_type(key: &str) -> Option<SettingType> {
        SETTING_SCOPE_RULES.get(key).map(|rule| rule.setting_type.clone())
    }

    /// Get allowed scopes for a key
    pub fn get_allowed_scopes(key: &str) -> Vec<String> {
        SETTING_SCOPE_RULES
            .get(key)
            .map(|rule| {
                rule.allowed_scopes
                    .iter()
                    .map(|s| match s {
                        SettingScope::Store => "store".to_string(),
                        SettingScope::User => "user".to_string(),
                    })
                    .collect()
            })
            .unwrap_or_else(|| vec!["store".to_string(), "user".to_string()])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_policy_setting_store_scope_allowed() {
        let result = SettingsScopeEnforcement::validate_write("store.name", "store");
        assert!(result.is_ok());
    }

    #[test]
    fn test_policy_setting_user_scope_rejected() {
        let result = SettingsScopeEnforcement::validate_write("store.name", "user");
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert_eq!(err.key, "store.name");
        assert_eq!(err.attempted_scope, "user");
        assert_eq!(err.allowed_scopes, vec!["store"]);
    }

    #[test]
    fn test_preference_setting_user_scope_allowed() {
        let result = SettingsScopeEnforcement::validate_write("user.display_name", "user");
        assert!(result.is_ok());
    }

    #[test]
    fn test_preference_setting_store_scope_rejected() {
        let result = SettingsScopeEnforcement::validate_write("user.display_name", "store");
        assert!(result.is_err());
    }

    #[test]
    fn test_theme_preference_both_scopes_allowed() {
        assert!(SettingsScopeEnforcement::validate_write("user.theme_mode", "user").is_ok());
        assert!(SettingsScopeEnforcement::validate_write("user.theme_mode", "store").is_ok());
    }

    #[test]
    fn test_unknown_setting_allowed_with_warning() {
        let result = SettingsScopeEnforcement::validate_write("unknown.setting", "store");
        assert!(result.is_ok());
    }

    #[test]
    fn test_invalid_scope_rejected() {
        let result = SettingsScopeEnforcement::validate_write("store.name", "global");
        assert!(result.is_err());
    }
}

