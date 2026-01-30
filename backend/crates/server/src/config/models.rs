use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Complete tenant configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantConfig {
    pub version: String,
    pub tenant: TenantInfo,
    pub branding: BrandingConfig,
    pub theme: ThemeConfig,
    pub categories: Vec<CategoryConfig>,
    pub navigation: NavigationConfig,
    pub widgets: WidgetsConfig,
    pub modules: ModulesConfig,
    pub localization: LocalizationConfig,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layouts: Option<LayoutsConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wizards: Option<WizardsConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub database: Option<DatabaseConfig>,
}

/// Tenant information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantInfo {
    pub id: String,
    pub name: String,
    pub slug: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub domain: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
}

/// Branding configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrandingConfig {
    pub company: CompanyBranding,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub login: Option<LoginBranding>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub receipts: Option<ReceiptBranding>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub store: Option<StoreBranding>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompanyBranding {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tagline: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_light: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub logo_dark: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub favicon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginBranding {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub background: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_logo: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub layout: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReceiptBranding {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub header: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub footer: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_logo: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoreBranding {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub station: Option<String>,
}

/// Theme configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeConfig {
    pub mode: String, // "light" | "dark" | "auto"
    pub colors: ThemeColors,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fonts: Option<ThemeFonts>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub spacing: Option<ThemeSpacing>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub border_radius: Option<ThemeBorderRadius>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub animations: Option<ThemeAnimations>,
}

/// Color value - can be a simple string or an object with shade variants
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(untagged)]
pub enum ColorValue {
    /// Simple color string (e.g., "#10b981")
    Simple(String),
    /// Color with shades (e.g., { "500": "#10b981", "600": "#059669" })
    Shades(HashMap<String, String>),
}

impl ColorValue {
    /// Get the primary color value (simple string or first shade)
    pub fn primary_value(&self) -> String {
        match self {
            ColorValue::Simple(s) => s.clone(),
            ColorValue::Shades(map) => {
                // Try common shade keys in order of preference
                for key in &["500", "600", "DEFAULT", "base", "primary"] {
                    if let Some(value) = map.get(*key) {
                        return value.clone();
                    }
                }
                // Fallback to first value
                map.values().next().cloned().unwrap_or_else(|| "#000000".to_string())
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeColors {
    pub primary: ColorValue,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub secondary: Option<ColorValue>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub accent: Option<ColorValue>,
    pub background: String,
    pub surface: String,
    pub text: String,
    pub success: String,
    pub warning: String,
    pub error: String,
    pub info: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeFonts {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub heading: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub body: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mono: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeSpacing {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scale: Option<Vec<i32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeBorderRadius {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sm: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub md: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub lg: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub xl: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeAnimations {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fast: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub normal: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub slow: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub easing: Option<String>,
}

/// Category configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryConfig {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub parent: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order: Option<i32>,
    pub attributes: Vec<AttributeConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub search_fields: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub display_template: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filters: Option<Vec<FilterConfig>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub wizard: Option<WizardConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AttributeConfig {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(rename = "type")]
    pub attr_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unique: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub values: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hierarchy_source: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pattern: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub placeholder: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub help_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FilterConfig {
    pub field: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(rename = "type")]
    pub filter_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub options: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WizardConfig {
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub steps: Option<Vec<WizardStep>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WizardStep {
    pub id: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fields: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub depends_on: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filter_by: Option<String>,
}

/// Navigation configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavigationConfig {
    pub main: Vec<NavItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub quick_actions: Option<Vec<QuickAction>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sidebar: Option<SidebarConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub header: Option<HeaderConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NavItem {
    pub id: String,
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    pub route: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permission: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub order: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub badge: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<NavItem>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickAction {
    pub label: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    pub action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permission: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SidebarConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collapsible: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_labels: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeaderConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_search: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_notifications: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_sync: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub show_user: Option<bool>,
}

/// Widgets configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetsConfig {
    pub dashboard: Vec<WidgetConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub available: Option<Vec<WidgetConfig>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetConfig {
    pub id: String,
    #[serde(rename = "type")]
    pub widget_type: String,
    pub title: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub query: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub endpoint: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<WidgetPosition>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub refresh_interval: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permission: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetPosition {
    pub x: i32,
    pub y: i32,
}

/// Modules configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModulesConfig {
    #[serde(flatten)]
    pub modules: HashMap<String, ModuleConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleConfig {
    pub enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub settings: Option<HashMap<String, serde_json::Value>>,
}

/// Localization configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalizationConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub language: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub date_format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time_format: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub number_format: Option<NumberFormat>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<CurrencyFormat>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub timezone: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_day_of_week: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub measurement_units: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NumberFormat {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decimal: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub thousands: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrencyFormat {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub symbol: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub position: Option<String>,
}

/// Layouts configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LayoutsConfig {
    #[serde(flatten)]
    pub layouts: HashMap<String, PageLayout>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageLayout {
    #[serde(rename = "type")]
    pub layout_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub panels: Option<Vec<PanelConfig>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub responsive: Option<ResponsiveConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PanelConfig {
    pub id: String,
    #[serde(rename = "type")]
    pub panel_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub min_width: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_width: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub collapsible: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResponsiveConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mobile: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tablet: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub desktop: Option<String>,
}

/// Wizards configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WizardsConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hierarchies: Option<Vec<HierarchyConfig>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub import_mappings: Option<Vec<ImportMappingConfig>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HierarchyConfig {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    pub levels: Vec<HierarchyLevel>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Vec<serde_json::Value>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HierarchyLevel {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub placeholder: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportMappingConfig {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub supported_formats: Option<Vec<String>>,
    pub fields: Vec<ImportFieldConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportFieldConfig {
    pub target: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transform: Option<String>,
}

/// Database configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_tables: Option<Vec<CustomTableConfig>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_columns: Option<HashMap<String, Vec<CustomColumnConfig>>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomTableConfig {
    pub name: String,
    pub columns: Vec<CustomColumnConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomColumnConfig {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
    #[serde(rename = "type")]
    pub col_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub required: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unique: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub values: Option<Vec<String>>,
}
