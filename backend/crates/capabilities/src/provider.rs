//! Capability provider

use crate::types::{AccountingMode, Capabilities, FeatureFlags};

/// Capability provider trait
pub trait CapabilityProvider {
    /// Get current capabilities
    fn get_capabilities(&self) -> Capabilities;
}

/// Default capability provider
pub struct DefaultCapabilityProvider {
    version: String,
    build_hash: String,
}

impl DefaultCapabilityProvider {
    /// Create new default capability provider
    #[must_use] 
    pub const fn new(version: String, build_hash: String) -> Self {
        Self {
            version,
            build_hash,
        }
    }
    
    /// Detect if export feature is enabled at compile time
    const fn detect_export_compile_time() -> bool {
        cfg!(feature = "export")
    }
    
    /// Detect if sync is available at runtime
    /// 
    /// This checks if the sync add-on is present and healthy.
    /// For now, this is a placeholder that always returns false.
    /// In Phase 8, this will be implemented to check for:
    /// - Sidecar healthcheck at http://127.0.0.1:8924/health
    /// - OR plugin file present + signature check
    /// - OR config points to sync service + ping succeeds
    #[cfg(feature = "runtime_detection")]
    async fn detect_sync_runtime() -> bool {
        // Placeholder: will be implemented in Phase 8
        // For now, sync is never available
        false
    }
    
    #[cfg(not(feature = "runtime_detection"))]
    const fn detect_sync_runtime_sync() -> bool {
        false
    }
    
    /// Determine accounting mode based on features
    const fn determine_accounting_mode(export_enabled: bool, sync_enabled: bool) -> AccountingMode {
        match (export_enabled, sync_enabled) {
            (false, _) => AccountingMode::Disabled,
            (true, false) => AccountingMode::ExportOnly,
            (true, true) => AccountingMode::Sync,
        }
    }
}

impl CapabilityProvider for DefaultCapabilityProvider {
    fn get_capabilities(&self) -> Capabilities {
        let export_enabled = Self::detect_export_compile_time();
        
        // Sync detection is synchronous for now
        #[cfg(not(feature = "runtime_detection"))]
        let sync_enabled = Self::detect_sync_runtime_sync();
        
        // In Phase 8, we'll need async detection
        #[cfg(feature = "runtime_detection")]
        let sync_enabled = false; // Placeholder
        
        let accounting_mode = Self::determine_accounting_mode(export_enabled, sync_enabled);
        
        Capabilities::new(
            accounting_mode,
            FeatureFlags::new(export_enabled, sync_enabled),
            self.version.clone(),
            self.build_hash.clone(),
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_accounting_mode_disabled() {
        let mode = DefaultCapabilityProvider::determine_accounting_mode(false, false);
        assert_eq!(mode, AccountingMode::Disabled);
    }
    
    #[test]
    fn test_accounting_mode_export_only() {
        let mode = DefaultCapabilityProvider::determine_accounting_mode(true, false);
        assert_eq!(mode, AccountingMode::ExportOnly);
    }
    
    #[test]
    fn test_accounting_mode_sync() {
        let mode = DefaultCapabilityProvider::determine_accounting_mode(true, true);
        assert_eq!(mode, AccountingMode::Sync);
    }
    
    #[test]
    fn test_get_capabilities() {
        let provider = DefaultCapabilityProvider::new(
            "0.1.0".to_string(),
            "test-hash".to_string(),
        );
        
        let caps = provider.get_capabilities();
        
        assert_eq!(caps.version, "0.1.0");
        assert_eq!(caps.build_hash, "test-hash");
        
        // Export feature detection depends on compile-time flags
        #[cfg(feature = "export")]
        {
            assert!(caps.features.export);
            assert_eq!(caps.accounting_mode, AccountingMode::ExportOnly);
        }
        
        #[cfg(not(feature = "export"))]
        {
            assert!(!caps.features.export);
            assert_eq!(caps.accounting_mode, AccountingMode::Disabled);
        }
        
        // Sync is never enabled in this phase
        assert!(!caps.features.sync);
    }
}
