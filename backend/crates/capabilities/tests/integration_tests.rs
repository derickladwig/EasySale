// Integration tests for capabilities
// Feature: split-build-system, Property 7: Capabilities Response Validity
// Validates: Requirements 4.2, 4.3, 4.4, 4.5, 4.6, 11.1, 11.2, 11.3

use capabilities::{CapabilityProvider, DefaultCapabilityProvider, AccountingMode};

#[test]
fn test_capabilities_without_export_feature() {
    // When compiled without export feature, accounting should be disabled
    let provider = DefaultCapabilityProvider::new("0.1.0".to_string(), "test".to_string());
    let caps = provider.get_capabilities();
    
    #[cfg(not(feature = "export"))]
    {
        assert_eq!(caps.accounting_mode, AccountingMode::Disabled);
        assert!(!caps.features.export);
        assert!(!caps.features.sync);
    }
    
    #[cfg(feature = "export")]
    {
        // If export is enabled, mode should be at least ExportOnly
        assert!(matches!(
            caps.accounting_mode,
            AccountingMode::ExportOnly | AccountingMode::Sync
        ));
        assert!(caps.features.export);
    }
}

#[test]
fn test_capabilities_structure() {
    let provider = DefaultCapabilityProvider::new("0.1.0".to_string(), "test".to_string());
    let caps = provider.get_capabilities();
    
    // Verify all required fields are present
    assert!(!caps.version.is_empty());
    assert!(!caps.build_hash.is_empty());
    
    // Verify accounting mode is valid
    assert!(matches!(
        caps.accounting_mode,
        AccountingMode::Disabled | AccountingMode::ExportOnly | AccountingMode::Sync
    ));
}

#[test]
fn test_capabilities_consistency() {
    let provider = DefaultCapabilityProvider::new("0.1.0".to_string(), "test".to_string());
    let caps = provider.get_capabilities();
    
    // If accounting is disabled, export and sync should be false
    if caps.accounting_mode == AccountingMode::Disabled {
        assert!(!caps.features.export);
        assert!(!caps.features.sync);
    }
    
    // If accounting is export-only, export should be true but sync false
    if caps.accounting_mode == AccountingMode::ExportOnly {
        assert!(caps.features.export);
        assert!(!caps.features.sync);
    }
    
    // If accounting is sync, both export and sync should be true
    if caps.accounting_mode == AccountingMode::Sync {
        assert!(caps.features.export);
        assert!(caps.features.sync);
    }
}

#[test]
fn test_capabilities_serialization() {
    let provider = DefaultCapabilityProvider::new("0.1.0".to_string(), "test".to_string());
    let caps = provider.get_capabilities();
    
    // Verify capabilities can be serialized to JSON
    let json = serde_json::to_string(&caps);
    assert!(json.is_ok());
    
    let json_str = json.unwrap();
    assert!(json_str.contains("accounting_mode"));
    assert!(json_str.contains("features"));
    assert!(json_str.contains("version"));
    assert!(json_str.contains("build_hash"));
}

#[test]
fn test_capabilities_deserialization() {
    let provider = DefaultCapabilityProvider::new("0.1.0".to_string(), "test".to_string());
    let caps = provider.get_capabilities();
    
    // Serialize and deserialize
    let json = serde_json::to_string(&caps).unwrap();
    let deserialized: Result<capabilities::Capabilities, _> = serde_json::from_str(&json);
    
    assert!(deserialized.is_ok());
    let deserialized_caps = deserialized.unwrap();
    
    // Verify fields match
    assert_eq!(deserialized_caps.accounting_mode, caps.accounting_mode);
    assert_eq!(deserialized_caps.features.export, caps.features.export);
    assert_eq!(deserialized_caps.features.sync, caps.features.sync);
    assert_eq!(deserialized_caps.version, caps.version);
    assert_eq!(deserialized_caps.build_hash, caps.build_hash);
}

#[cfg(feature = "export")]
#[test]
fn test_export_feature_enabled() {
    let provider = DefaultCapabilityProvider::new("0.1.0".to_string(), "test".to_string());
    let caps = provider.get_capabilities();
    
    // When export feature is enabled, accounting should not be disabled
    assert_ne!(caps.accounting_mode, AccountingMode::Disabled);
    assert!(caps.features.export);
}

#[cfg(not(feature = "export"))]
#[test]
fn test_export_feature_disabled() {
    let provider = DefaultCapabilityProvider::new("0.1.0".to_string(), "test".to_string());
    let caps = provider.get_capabilities();
    
    // When export feature is disabled, accounting should be disabled
    assert_eq!(caps.accounting_mode, AccountingMode::Disabled);
    assert!(!caps.features.export);
    assert!(!caps.features.sync);
}
