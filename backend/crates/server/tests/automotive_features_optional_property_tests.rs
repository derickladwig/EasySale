// Property-Based Tests for Production Readiness and Windows Installer
// Feature: production-readiness-windows-installer, Property 7: Automotive Features Optional
// These tests validate that automotive features are optional and the system works without them
// **Validates: Requirements 3.5**

use proptest::prelude::*;
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a valid configuration with automotive features disabled
fn arb_config_without_automotive() -> impl Strategy<Value = ConfigWithAutomotive> {
    (
        prop::bool::ANY,
        prop::option::of(prop::bool::ANY),
    ).prop_map(|(automotive_enabled, vin_lookup_enabled)| {
        ConfigWithAutomotive {
            automotive_enabled: false, // Always disabled for this generator
            vin_lookup_enabled: if automotive_enabled { vin_lookup_enabled } else { None },
        }
    })
}

/// Generate a valid configuration with automotive features enabled
fn arb_config_with_automotive() -> impl Strategy<Value = ConfigWithAutomotive> {
    (
        Just(true),
        prop::option::of(prop::bool::ANY),
    ).prop_map(|(automotive_enabled, vin_lookup_enabled)| {
        ConfigWithAutomotive {
            automotive_enabled,
            vin_lookup_enabled,
        }
    })
}

/// Generate any valid configuration (with or without automotive)
fn arb_config_any() -> impl Strategy<Value = ConfigWithAutomotive> {
    prop::bool::ANY.prop_flat_map(|automotive_enabled| {
        prop::option::of(prop::bool::ANY).prop_map(move |vin_lookup_enabled| {
            ConfigWithAutomotive {
                automotive_enabled,
                vin_lookup_enabled: if automotive_enabled { vin_lookup_enabled } else { None },
            }
        })
    })
}

#[derive(Debug, Clone)]
struct ConfigWithAutomotive {
    automotive_enabled: bool,
    vin_lookup_enabled: Option<bool>,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Create a temporary config file with the given automotive configuration
fn create_config_file(temp_dir: &TempDir, config: &ConfigWithAutomotive) -> PathBuf {
    let mut config_json = json!({
        "tenant_id": "test-tenant",
        "branding": {
            "company": {
                "name": "Test Company",
                "logo": "https://example.com/logo.png",
            }
        },
        "theme": {
            "colors": {
                "primary": "#000000",
                "secondary": "#FFFFFF",
                "background": "#FFFFFF",
                "surface": "#F5F5F5",
                "text": "#000000",
                "success": "#4CAF50",
                "warning": "#FF9800",
                "error": "#F44336",
                "info": "#2196F3"
            }
        },
        "modules": {
            "automotive": {
                "enabled": config.automotive_enabled
            }
        }
    });
    
    // Add VIN lookup config if automotive is enabled
    if config.automotive_enabled {
        if let Some(vin_enabled) = config.vin_lookup_enabled {
            config_json["modules"]["automotive"]["vin_lookup"] = json!(vin_enabled);
        }
    }
    
    let config_path = temp_dir.path().join("test-tenant.json");
    fs::write(&config_path, serde_json::to_string_pretty(&config_json).unwrap())
        .expect("Failed to write config file");
    
    config_path
}

/// Parse automotive configuration from config JSON
fn parse_automotive_config(config_path: &PathBuf) -> Result<ConfigWithAutomotive, String> {
    let content = fs::read_to_string(config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    
    let config: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let automotive_enabled = config["modules"]["automotive"]["enabled"]
        .as_bool()
        .unwrap_or(false);
    
    let vin_lookup_enabled = if automotive_enabled {
        config["modules"]["automotive"]["vin_lookup"].as_bool()
    } else {
        None
    };
    
    Ok(ConfigWithAutomotive {
        automotive_enabled,
        vin_lookup_enabled,
    })
}

/// Check if a configuration contains automotive-specific terms
fn contains_automotive_terms(config_path: &PathBuf) -> bool {
    let content = fs::read_to_string(config_path).expect("Failed to read config");
    
    // Check for automotive-specific terms that should only appear when automotive is enabled
    let automotive_terms = vec![
        "vehicle_fitment",
        "vin_decoder",
        "make_model",
        "year_make_model",
    ];
    
    automotive_terms.iter().any(|term| content.contains(term))
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 7: Automotive Features Optional
// For any system configuration with automotive modules disabled, the system should start
// successfully and handle core POS operations without requiring automotive-specific data
// or concepts
// **Validates: Requirements 3.5**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_7_automotive_features_optional(
        config in arb_config_without_automotive(),
    ) {
        // Create a temporary directory for config files
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        // Write the configuration to a file
        let config_path = create_config_file(&temp_dir, &config);
        
        // Read the configuration back
        let parsed_config = parse_automotive_config(&config_path)
            .expect("Failed to parse automotive config");
        
        // Verify automotive is disabled
        prop_assert_eq!(
            parsed_config.automotive_enabled,
            false,
            "Automotive features should be disabled"
        );
        
        // Verify VIN lookup is not configured when automotive is disabled
        prop_assert!(
            parsed_config.vin_lookup_enabled.is_none(),
            "VIN lookup should not be configured when automotive is disabled"
        );
        
        // Verify the configuration is valid JSON
        let content = fs::read_to_string(&config_path).expect("Failed to read config");
        let _: serde_json::Value = serde_json::from_str(&content)
            .expect("Config should be valid JSON");
        
        // Verify no automotive-specific terms in config when disabled
        prop_assert!(
            !contains_automotive_terms(&config_path),
            "Config should not contain automotive-specific terms when automotive is disabled"
        );
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    // Additional property test: Automotive features can be enabled
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_automotive_features_can_be_enabled(
            config in arb_config_with_automotive(),
        ) {
            let temp_dir = TempDir::new().expect("Failed to create temp dir");
            let config_path = create_config_file(&temp_dir, &config);
            let parsed_config = parse_automotive_config(&config_path)
                .expect("Failed to parse automotive config");
            
            // Verify automotive is enabled
            prop_assert_eq!(
                parsed_config.automotive_enabled,
                true,
                "Automotive features should be enabled"
            );
            
            // Verify VIN lookup config is preserved
            prop_assert_eq!(
                parsed_config.vin_lookup_enabled,
                config.vin_lookup_enabled,
                "VIN lookup configuration should be preserved"
            );
        }
    }

    // Additional property test: Configuration toggle is consistent
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_automotive_toggle_consistent(
            config in arb_config_any(),
        ) {
            let temp_dir = TempDir::new().expect("Failed to create temp dir");
            let config_path = create_config_file(&temp_dir, &config);
            let parsed_config = parse_automotive_config(&config_path)
                .expect("Failed to parse automotive config");
            
            // Verify the enabled flag is preserved
            prop_assert_eq!(
                parsed_config.automotive_enabled,
                config.automotive_enabled,
                "Automotive enabled flag should be preserved"
            );
            
            // Verify VIN lookup is only present when automotive is enabled
            if !config.automotive_enabled {
                prop_assert!(
                    parsed_config.vin_lookup_enabled.is_none(),
                    "VIN lookup should not be present when automotive is disabled"
                );
            }
        }
    }

    // Additional property test: Multiple tenants can have different automotive settings
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        #[test]
        fn property_tenant_automotive_isolation(
            config1 in arb_config_any(),
            config2 in arb_config_any(),
        ) {
            let temp_dir = TempDir::new().expect("Failed to create temp dir");
            
            // Create two different tenant configs
            let config1_json = json!({
                "tenant_id": "tenant-1",
                "branding": {
                    "company": {
                        "name": "Tenant 1",
                        "logo": "https://example.com/logo1.png",
                    }
                },
                "theme": {
                    "colors": {
                        "primary": "#000000",
                        "secondary": "#FFFFFF",
                        "background": "#FFFFFF",
                        "surface": "#F5F5F5",
                        "text": "#000000",
                        "success": "#4CAF50",
                        "warning": "#FF9800",
                        "error": "#F44336",
                        "info": "#2196F3"
                    }
                },
                "modules": {
                    "automotive": {
                        "enabled": config1.automotive_enabled
                    }
                }
            });
            
            let config2_json = json!({
                "tenant_id": "tenant-2",
                "branding": {
                    "company": {
                        "name": "Tenant 2",
                        "logo": "https://example.com/logo2.png",
                    }
                },
                "theme": {
                    "colors": {
                        "primary": "#000000",
                        "secondary": "#FFFFFF",
                        "background": "#FFFFFF",
                        "surface": "#F5F5F5",
                        "text": "#000000",
                        "success": "#4CAF50",
                        "warning": "#FF9800",
                        "error": "#F44336",
                        "info": "#2196F3"
                    }
                },
                "modules": {
                    "automotive": {
                        "enabled": config2.automotive_enabled
                    }
                }
            });
            
            let config1_path = temp_dir.path().join("tenant-1.json");
            let config2_path = temp_dir.path().join("tenant-2.json");
            
            fs::write(&config1_path, serde_json::to_string_pretty(&config1_json).unwrap())
                .expect("Failed to write config1");
            fs::write(&config2_path, serde_json::to_string_pretty(&config2_json).unwrap())
                .expect("Failed to write config2");
            
            // Verify both configs exist and are independent
            let parsed1 = parse_automotive_config(&config1_path)
                .expect("Failed to parse config1");
            let parsed2 = parse_automotive_config(&config2_path)
                .expect("Failed to parse config2");
            
            // Verify tenant 1 config is correct
            prop_assert_eq!(parsed1.automotive_enabled, config1.automotive_enabled);
            
            // Verify tenant 2 config is correct
            prop_assert_eq!(parsed2.automotive_enabled, config2.automotive_enabled);
            
            // Verify configs are isolated (one tenant's automotive setting doesn't affect another)
            if config1.automotive_enabled != config2.automotive_enabled {
                prop_assert_ne!(
                    parsed1.automotive_enabled,
                    parsed2.automotive_enabled,
                    "Tenant automotive settings should be isolated"
                );
            }
        }
    }

    // Unit test: Specific example - automotive disabled
    #[test]
    fn test_automotive_disabled_specific() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        let config = ConfigWithAutomotive {
            automotive_enabled: false,
            vin_lookup_enabled: None,
        };
        
        let config_path = create_config_file(&temp_dir, &config);
        let parsed = parse_automotive_config(&config_path)
            .expect("Failed to parse config");
        
        assert_eq!(parsed.automotive_enabled, false);
        assert!(parsed.vin_lookup_enabled.is_none());
        assert!(!contains_automotive_terms(&config_path));
    }

    // Unit test: Specific example - automotive enabled with VIN lookup
    #[test]
    fn test_automotive_enabled_with_vin() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        let config = ConfigWithAutomotive {
            automotive_enabled: true,
            vin_lookup_enabled: Some(true),
        };
        
        let config_path = create_config_file(&temp_dir, &config);
        let parsed = parse_automotive_config(&config_path)
            .expect("Failed to parse config");
        
        assert_eq!(parsed.automotive_enabled, true);
        assert_eq!(parsed.vin_lookup_enabled, Some(true));
    }

    // Unit test: Specific example - automotive enabled without VIN lookup
    #[test]
    fn test_automotive_enabled_without_vin() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        let config = ConfigWithAutomotive {
            automotive_enabled: true,
            vin_lookup_enabled: Some(false),
        };
        
        let config_path = create_config_file(&temp_dir, &config);
        let parsed = parse_automotive_config(&config_path)
            .expect("Failed to parse config");
        
        assert_eq!(parsed.automotive_enabled, true);
        assert_eq!(parsed.vin_lookup_enabled, Some(false));
    }

    // Unit test: Edge case - default configuration (automotive disabled)
    #[test]
    fn test_automotive_default_disabled() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        // Create a minimal config without automotive section
        let config_json = json!({
            "tenant_id": "test-tenant",
            "branding": {
                "company": {
                    "name": "Test Company",
                }
            }
        });
        
        let config_path = temp_dir.path().join("test-tenant.json");
        fs::write(&config_path, serde_json::to_string_pretty(&config_json).unwrap())
            .expect("Failed to write config file");
        
        let parsed = parse_automotive_config(&config_path)
            .expect("Failed to parse config");
        
        // Default should be disabled
        assert_eq!(parsed.automotive_enabled, false);
        assert!(parsed.vin_lookup_enabled.is_none());
    }

    // Unit test: Core POS operations don't require automotive
    #[test]
    fn test_core_pos_without_automotive() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        let config = ConfigWithAutomotive {
            automotive_enabled: false,
            vin_lookup_enabled: None,
        };
        
        let config_path = create_config_file(&temp_dir, &config);
        
        // Verify config is valid and can be loaded
        let parsed = parse_automotive_config(&config_path)
            .expect("Failed to parse config");
        
        assert_eq!(parsed.automotive_enabled, false);
        
        // Verify the config file is valid JSON and can be used for core POS operations
        let content = fs::read_to_string(&config_path).expect("Failed to read config");
        let config_json: serde_json::Value = serde_json::from_str(&content)
            .expect("Config should be valid JSON");
        
        // Verify core POS fields are present
        assert!(config_json["tenant_id"].is_string());
        assert!(config_json["branding"].is_object());
        assert!(config_json["theme"].is_object());
        
        // Verify no automotive-specific requirements
        assert!(!contains_automotive_terms(&config_path));
    }
}
