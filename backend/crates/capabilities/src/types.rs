//! Capability types

use serde::{Deserialize, Serialize};

/// Capabilities response
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Capabilities {
    /// Accounting mode (disabled, `export_only`, sync)
    pub accounting_mode: AccountingMode,
    
    /// Feature flags
    pub features: FeatureFlags,
    
    /// Backend version
    pub version: String,
    
    /// Build hash
    pub build_hash: String,
}

/// Accounting mode
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum AccountingMode {
    /// No accounting features available
    Disabled,
    
    /// CSV export available, no sync
    ExportOnly,
    
    /// Full sync with `QuickBooks`
    Sync,
}

/// Feature flags
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct FeatureFlags {
    /// CSV export feature enabled
    pub export: bool,
    
    /// `QuickBooks` sync feature enabled
    pub sync: bool,
}

impl Capabilities {
    /// Create new capabilities
    #[must_use] 
    pub const fn new(
        accounting_mode: AccountingMode,
        features: FeatureFlags,
        version: String,
        build_hash: String,
    ) -> Self {
        Self {
            accounting_mode,
            features,
            version,
            build_hash,
        }
    }
}

impl FeatureFlags {
    /// Create new feature flags
    #[must_use] 
    pub const fn new(export: bool, sync: bool) -> Self {
        Self { export, sync }
    }
}
