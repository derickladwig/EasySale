use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// User preferences settings
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserPreferences {
    pub user_id: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub theme: String, // "light", "dark", "auto"
    pub email_notifications: bool,
    pub desktop_notifications: bool,
    pub tenant_id: String,
}

/// Localization settings
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct LocalizationSettings {
    pub tenant_id: String,
    pub language: String, // "en", "fr", "es"
    pub currency: String, // "CAD", "USD", "EUR"
    pub currency_symbol: String,
    pub currency_position: String, // "before", "after"
    pub decimal_places: i32,
    pub tax_enabled: bool,
    pub tax_rate: f64,
    pub tax_name: String, // "GST", "HST", "PST", "VAT"
    pub date_format: String, // "YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"
    pub time_format: String, // "24h", "12h"
    pub timezone: String, // "America/Toronto", etc.
}

/// Network and sync settings
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct NetworkSettings {
    pub tenant_id: String,
    pub sync_enabled: bool,
    pub sync_interval: i32, // seconds
    pub auto_resolve_conflicts: bool,
    pub offline_mode_enabled: bool,
    pub max_queue_size: i32,
}

/// Performance monitoring settings
#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct PerformanceSettings {
    pub tenant_id: String,
    pub monitoring_enabled: bool,
    pub monitoring_url: Option<String>,
    pub sentry_dsn: Option<String>,
}

/// Request/Response DTOs
#[derive(Debug, Deserialize)]
pub struct UpdateUserPreferencesRequest {
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub theme: Option<String>,
    pub email_notifications: Option<bool>,
    pub desktop_notifications: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateLocalizationRequest {
    pub language: Option<String>,
    pub currency: Option<String>,
    pub currency_symbol: Option<String>,
    pub currency_position: Option<String>,
    pub decimal_places: Option<i32>,
    pub tax_enabled: Option<bool>,
    pub tax_rate: Option<f64>,
    pub tax_name: Option<String>,
    pub date_format: Option<String>,
    pub time_format: Option<String>,
    pub timezone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateNetworkRequest {
    pub sync_enabled: Option<bool>,
    pub sync_interval: Option<i32>,
    pub auto_resolve_conflicts: Option<bool>,
    pub offline_mode_enabled: Option<bool>,
    pub max_queue_size: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePerformanceRequest {
    pub monitoring_enabled: Option<bool>,
    pub monitoring_url: Option<String>,
    pub sentry_dsn: Option<String>,
}

impl Default for LocalizationSettings {
    fn default() -> Self {
        Self {
            tenant_id: String::new(),
            language: "en".to_string(),
            currency: "CAD".to_string(),
            currency_symbol: "$".to_string(),
            currency_position: "before".to_string(),
            decimal_places: 2,
            tax_enabled: true,
            tax_rate: 13.0,
            tax_name: "HST".to_string(),
            date_format: "YYYY-MM-DD".to_string(),
            time_format: "24h".to_string(),
            timezone: "America/Toronto".to_string(),
        }
    }
}

impl Default for NetworkSettings {
    fn default() -> Self {
        Self {
            tenant_id: String::new(),
            sync_enabled: true,
            sync_interval: 300,
            auto_resolve_conflicts: true,
            offline_mode_enabled: true,
            max_queue_size: 10000,
        }
    }
}

impl Default for PerformanceSettings {
    fn default() -> Self {
        Self {
            tenant_id: String::new(),
            monitoring_enabled: false,
            monitoring_url: None,
            sentry_dsn: None,
        }
    }
}
