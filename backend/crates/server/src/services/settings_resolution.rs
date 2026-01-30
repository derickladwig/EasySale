use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Setting scope in order of precedence (highest to lowest)
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SettingScope {
    User = 4,
    Station = 3,
    Store = 2,
    Global = 1,
}

impl SettingScope {
    pub fn as_str(&self) -> &'static str {
        match self {
            SettingScope::User => "user",
            SettingScope::Station => "station",
            SettingScope::Store => "store",
            SettingScope::Global => "global",
        }
    }
}

/// A setting value with its source
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SettingValue {
    pub key: String,
    pub value: serde_json::Value,
    pub scope: SettingScope,
    pub source_id: Option<String>, // user_id, station_id, store_id, or None for global
    pub description: Option<String>,
}

/// Resolved setting with all scope values
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResolvedSetting {
    pub key: String,
    pub effective_value: serde_json::Value,
    pub effective_scope: SettingScope,
    pub effective_source_id: Option<String>,
    pub description: Option<String>,
    pub all_values: Vec<SettingValue>, // All values across scopes
    pub is_overridden: bool, // True if not using global value
}

/// Settings resolution service
pub struct SettingsResolutionService;

impl SettingsResolutionService {
    /// Resolve effective settings for a given context
    /// 
    /// Resolution order (highest to lowest precedence):
    /// 1. User-specific settings
    /// 2. Station-specific settings
    /// 3. Store-specific settings
    /// 4. Global settings
    pub fn resolve_settings(
        user_id: Option<String>,
        station_id: Option<String>,
        store_id: Option<String>,
        all_settings: Vec<SettingValue>,
    ) -> HashMap<String, ResolvedSetting> {
        let mut settings_by_key: HashMap<String, Vec<SettingValue>> = HashMap::new();

        // Group settings by key
        for setting in all_settings {
            settings_by_key
                .entry(setting.key.clone())
                .or_insert_with(Vec::new)
                .push(setting);
        }

        // Resolve each setting
        let mut resolved = HashMap::new();
        for (key, values) in settings_by_key {
            if let Some(resolved_setting) = Self::resolve_single_setting(
                &key,
                values,
                user_id.as_ref(),
                station_id.as_ref(),
                store_id.as_ref(),
            ) {
                resolved.insert(key, resolved_setting);
            }
        }

        resolved
    }

    /// Resolve a single setting key
    fn resolve_single_setting(
        key: &str,
        mut values: Vec<SettingValue>,
        user_id: Option<&String>,
        station_id: Option<&String>,
        store_id: Option<&String>,
    ) -> Option<ResolvedSetting> {
        if values.is_empty() {
            return None;
        }

        // Sort by scope (highest precedence first)
        values.sort_by(|a, b| b.scope.cmp(&a.scope));

        // Find the effective value based on context
        let effective = Self::find_effective_value(&values, user_id, station_id, store_id)?;

        // Check if overridden (not using global value)
        let is_overridden = effective.scope != SettingScope::Global;

        Some(ResolvedSetting {
            key: key.to_string(),
            effective_value: effective.value.clone(),
            effective_scope: effective.scope,
            effective_source_id: effective.source_id.clone(),
            description: effective.description.clone(),
            all_values: values,
            is_overridden,
        })
    }

    /// Find the effective value based on scope hierarchy
    fn find_effective_value<'a>(
        values: &'a [SettingValue],
        user_id: Option<&String>,
        station_id: Option<&String>,
        store_id: Option<&String>,
    ) -> Option<&'a SettingValue> {
        // Try user scope first
        if let Some(uid) = user_id {
            if let Some(value) = values.iter().find(|v| {
                v.scope == SettingScope::User && v.source_id.as_ref() == Some(uid)
            }) {
                return Some(value);
            }
        }

        // Try station scope
        if let Some(sid) = station_id {
            if let Some(value) = values.iter().find(|v| {
                v.scope == SettingScope::Station && v.source_id.as_ref() == Some(sid)
            }) {
                return Some(value);
            }
        }

        // Try store scope
        if let Some(store) = store_id {
            if let Some(value) = values.iter().find(|v| {
                v.scope == SettingScope::Store && v.source_id.as_ref() == Some(store)
            }) {
                return Some(value);
            }
        }

        // Fall back to global
        values.iter().find(|v| v.scope == SettingScope::Global)
    }

    /// Get a single resolved setting value
    pub fn get_setting_value(
        key: &str,
        user_id: Option<String>,
        station_id: Option<String>,
        store_id: Option<String>,
        all_settings: Vec<SettingValue>,
    ) -> Option<serde_json::Value> {
        let values: Vec<SettingValue> = all_settings
            .into_iter()
            .filter(|s| s.key == key)
            .collect();

        if values.is_empty() {
            return None;
        }

        Self::find_effective_value(&values, user_id.as_ref(), station_id.as_ref(), store_id.as_ref())
            .map(|v| v.value.clone())
    }

    /// Check if a setting is overridden at any level
    pub fn is_setting_overridden(
        key: &str,
        all_settings: &[SettingValue],
    ) -> bool {
        all_settings
            .iter()
            .any(|s| s.key == key && s.scope != SettingScope::Global)
    }

    /// Get all scopes where a setting is defined
    pub fn get_setting_scopes(
        key: &str,
        all_settings: &[SettingValue],
    ) -> Vec<SettingScope> {
        let mut scopes: Vec<SettingScope> = all_settings
            .iter()
            .filter(|s| s.key == key)
            .map(|s| s.scope)
            .collect();
        scopes.sort();
        scopes.dedup();
        scopes
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn create_setting(
        key: &str,
        value: serde_json::Value,
        scope: SettingScope,
        source_id: Option<&str>,
    ) -> SettingValue {
        SettingValue {
            key: key.to_string(),
            value,
            scope,
            source_id: source_id.map(|s| s.to_string()),
            description: None,
        }
    }

    #[test]
    fn test_resolve_global_only() {
        let settings = vec![create_setting("theme", json!("dark"), SettingScope::Global, None)];

        let resolved = SettingsResolutionService::resolve_settings(None, None, None, settings);

        assert_eq!(resolved.len(), 1);
        let theme = resolved.get("theme").unwrap();
        assert_eq!(theme.effective_value, json!("dark"));
        assert_eq!(theme.effective_scope, SettingScope::Global);
        assert!(!theme.is_overridden);
    }

    #[test]
    fn test_resolve_with_store_override() {
        let settings = vec![
            create_setting("currency", json!("USD"), SettingScope::Global, None),
            create_setting("currency", json!("CAD"), SettingScope::Store, Some("1")),
        ];

        let resolved =
            SettingsResolutionService::resolve_settings(None, None, Some("1".to_string()), settings);

        let currency = resolved.get("currency").unwrap();
        assert_eq!(currency.effective_value, json!("CAD"));
        assert_eq!(currency.effective_scope, SettingScope::Store);
        assert!(currency.is_overridden);
        assert_eq!(currency.all_values.len(), 2);
    }

    #[test]
    fn test_resolve_with_user_override() {
        let settings = vec![
            create_setting("theme", json!("dark"), SettingScope::Global, None),
            create_setting("theme", json!("light"), SettingScope::Store, Some("1")),
            create_setting("theme", json!("blue"), SettingScope::User, Some("5")),
        ];

        let resolved = SettingsResolutionService::resolve_settings(
            Some("5".to_string()),
            None,
            Some("1".to_string()),
            settings,
        );

        let theme = resolved.get("theme").unwrap();
        assert_eq!(theme.effective_value, json!("blue"));
        assert_eq!(theme.effective_scope, SettingScope::User);
        assert!(theme.is_overridden);
        assert_eq!(theme.all_values.len(), 3);
    }

    #[test]
    fn test_resolve_hierarchy() {
        let settings = vec![
            create_setting("timeout", json!(30), SettingScope::Global, None),
            create_setting("timeout", json!(60), SettingScope::Store, Some("1")),
            create_setting("timeout", json!(90), SettingScope::Station, Some("10")),
        ];

        // With station context
        let resolved = SettingsResolutionService::resolve_settings(
            None,
            Some("10".to_string()),
            Some("1".to_string()),
            settings.clone(),
        );
        let timeout = resolved.get("timeout").unwrap();
        assert_eq!(timeout.effective_value, json!(90));
        assert_eq!(timeout.effective_scope, SettingScope::Station);

        // Without station context (falls back to store)
        let resolved =
            SettingsResolutionService::resolve_settings(None, None, Some("1".to_string()), settings);
        let timeout = resolved.get("timeout").unwrap();
        assert_eq!(timeout.effective_value, json!(60));
        assert_eq!(timeout.effective_scope, SettingScope::Store);
    }

    #[test]
    fn test_get_setting_value() {
        let settings = vec![
            create_setting("language", json!("en"), SettingScope::Global, None),
            create_setting("language", json!("fr"), SettingScope::User, Some("3")),
        ];

        let value = SettingsResolutionService::get_setting_value(
            "language",
            Some("3".to_string()),
            None,
            None,
            settings,
        );

        assert_eq!(value, Some(json!("fr")));
    }

    #[test]
    fn test_is_setting_overridden() {
        let settings = vec![
            create_setting("theme", json!("dark"), SettingScope::Global, None),
            create_setting("currency", json!("USD"), SettingScope::Global, None),
            create_setting("currency", json!("CAD"), SettingScope::Store, Some("1")),
        ];

        assert!(!SettingsResolutionService::is_setting_overridden("theme", &settings));
        assert!(SettingsResolutionService::is_setting_overridden("currency", &settings));
    }

    #[test]
    fn test_get_setting_scopes() {
        let settings = vec![
            create_setting("timeout", json!(30), SettingScope::Global, None),
            create_setting("timeout", json!(60), SettingScope::Store, Some("1")),
            create_setting("timeout", json!(90), SettingScope::Station, Some("10")),
        ];

        let scopes = SettingsResolutionService::get_setting_scopes("timeout", &settings);
        assert_eq!(scopes.len(), 3);
        assert!(scopes.contains(&SettingScope::Global));
        assert!(scopes.contains(&SettingScope::Store));
        assert!(scopes.contains(&SettingScope::Station));
    }
}
