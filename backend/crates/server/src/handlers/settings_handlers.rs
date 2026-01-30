use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::models::UserContext;
use crate::services::settings_resolution::{
    ResolvedSetting, SettingScope, SettingValue, SettingsResolutionService,
};

/// Response for effective settings endpoint
#[derive(Debug, Serialize)]
pub struct EffectiveSettingsResponse {
    pub settings: HashMap<String, ResolvedSetting>,
    pub context: SettingsContext,
}

#[derive(Debug, Serialize)]
pub struct SettingsContext {
    pub user_id: Option<String>,
    pub station_id: Option<String>,
    pub store_id: Option<String>,
}

/// Query parameters for settings export
#[derive(Debug, Deserialize)]
pub struct ExportQuery {
    pub format: Option<String>, // "json" or "csv"
}

/// GET /api/settings/effective
/// Get all effective settings for the current user context
pub async fn get_effective_settings(
    user_ctx: web::ReqData<UserContext>,
) -> Result<HttpResponse> {
    // TODO: Fetch all settings from database
    // For now, return mock data
    let all_settings = get_mock_settings();

    let resolved = SettingsResolutionService::resolve_settings(
        Some(user_ctx.user_id.clone()),
        user_ctx.station_id.clone(),
        user_ctx.store_id.clone(),
        all_settings,
    );

    let response = EffectiveSettingsResponse {
        settings: resolved,
        context: SettingsContext {
            user_id: Some(user_ctx.user_id.clone()),
            station_id: user_ctx.station_id.clone(),
            store_id: user_ctx.store_id.clone(),
        },
    };

    Ok(HttpResponse::Ok().json(response))
}

/// GET /api/settings/effective/export
/// Export effective settings to JSON or CSV
pub async fn export_effective_settings(
    user_ctx: web::ReqData<UserContext>,
    query: web::Query<ExportQuery>,
) -> Result<HttpResponse> {
    // TODO: Fetch all settings from database
    let all_settings = get_mock_settings();

    let resolved = SettingsResolutionService::resolve_settings(
        Some(user_ctx.user_id.clone()),
        user_ctx.station_id.clone(),
        user_ctx.store_id.clone(),
        all_settings,
    );

    let format = query.format.as_deref().unwrap_or("json");

    match format {
        "csv" => {
            let csv = generate_csv(&resolved);
            Ok(HttpResponse::Ok()
                .content_type("text/csv")
                .insert_header((
                    "Content-Disposition",
                    "attachment; filename=\"effective-settings.csv\"",
                ))
                .body(csv))
        }
        "json" | _ => {
            let response = EffectiveSettingsResponse {
                settings: resolved,
                context: SettingsContext {
                    user_id: Some(user_ctx.user_id.clone()),
                    station_id: user_ctx.station_id.clone(),
                    store_id: user_ctx.store_id.clone(),
                },
            };
            Ok(HttpResponse::Ok()
                .content_type("application/json")
                .insert_header((
                    "Content-Disposition",
                    "attachment; filename=\"effective-settings.json\"",
                ))
                .json(response))
        }
    }
}

/// Generate CSV from resolved settings
fn generate_csv(settings: &HashMap<String, ResolvedSetting>) -> String {
    let mut csv = String::from("Key,Effective Value,Effective Scope,Source ID,Is Overridden,Description\n");

    let mut sorted_keys: Vec<&String> = settings.keys().collect();
    sorted_keys.sort();

    for key in sorted_keys {
        if let Some(setting) = settings.get(key) {
            let value_str = setting.effective_value.to_string().replace('"', "'");
            let source_id = setting
                .effective_source_id
                .as_ref()
                .map(|id| id.to_string())
                .unwrap_or_else(|| "N/A".to_string());
            let description = setting
                .description
                .as_ref()
                .map(|d| d.replace('"', "'"))
                .unwrap_or_default();

            csv.push_str(&format!(
                "\"{}\",\"{}\",\"{}\",\"{}\",\"{}\",\"{}\"\n",
                key,
                value_str,
                setting.effective_scope.as_str(),
                source_id,
                setting.is_overridden,
                description
            ));
        }
    }

    csv
}

/// Mock settings data (TODO: Replace with database queries)
fn get_mock_settings() -> Vec<SettingValue> {
    use serde_json::json;

    vec![
        // Theme settings
        SettingValue {
            key: "theme".to_string(),
            value: json!("dark"),
            scope: SettingScope::Global,
            source_id: None,
            description: Some("Application color theme".to_string()),
        },
        SettingValue {
            key: "theme".to_string(),
            value: json!("light"),
            scope: SettingScope::User,
            source_id: Some("1".to_string()),
            description: Some("Application color theme".to_string()),
        },
        // Currency settings
        SettingValue {
            key: "currency".to_string(),
            value: json!("USD"),
            scope: SettingScope::Global,
            source_id: None,
            description: Some("Default currency".to_string()),
        },
        SettingValue {
            key: "currency".to_string(),
            value: json!("CAD"),
            scope: SettingScope::Store,
            source_id: Some("1".to_string()),
            description: Some("Default currency".to_string()),
        },
        // Language settings
        SettingValue {
            key: "language".to_string(),
            value: json!("en"),
            scope: SettingScope::Global,
            source_id: None,
            description: Some("Interface language".to_string()),
        },
        // Timeout settings
        SettingValue {
            key: "session_timeout".to_string(),
            value: json!(30),
            scope: SettingScope::Global,
            source_id: None,
            description: Some("Session timeout in minutes".to_string()),
        },
        SettingValue {
            key: "session_timeout".to_string(),
            value: json!(60),
            scope: SettingScope::Store,
            source_id: Some("1".to_string()),
            description: Some("Session timeout in minutes".to_string()),
        },
        // Receipt printer settings
        SettingValue {
            key: "receipt_printer_enabled".to_string(),
            value: json!(true),
            scope: SettingScope::Station,
            source_id: Some("1".to_string()),
            description: Some("Enable receipt printer".to_string()),
        },
        // Tax rate
        SettingValue {
            key: "tax_rate".to_string(),
            value: json!(0.13),
            scope: SettingScope::Store,
            source_id: Some("1".to_string()),
            description: Some("Default tax rate".to_string()),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn test_generate_csv() {
        let mut settings = HashMap::new();
        settings.insert(
            "theme".to_string(),
            ResolvedSetting {
                key: "theme".to_string(),
                effective_value: json!("dark"),
                effective_scope: SettingScope::Global,
                effective_source_id: None,
                description: Some("Application theme".to_string()),
                all_values: vec![],
                is_overridden: false,
            },
        );

        let csv = generate_csv(&settings);
        assert!(csv.contains("Key,Effective Value"));
        assert!(csv.contains("theme"));
        assert!(csv.contains("dark"));
        assert!(csv.contains("global"));
    }

    #[test]
    fn test_mock_settings() {
        let settings = get_mock_settings();
        assert!(!settings.is_empty());
        assert!(settings.iter().any(|s| s.key == "theme"));
        assert!(settings.iter().any(|s| s.key == "currency"));
    }
}
