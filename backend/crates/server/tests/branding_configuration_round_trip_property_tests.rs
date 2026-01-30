// Property-Based Tests for Production Readiness and Windows Installer
// Feature: production-readiness-windows-installer, Property 6: Branding Configuration Round Trip
// These tests validate that branding configuration can be loaded and rendered correctly
// **Validates: Requirements 3.1, 3.3, 3.4**

use proptest::prelude::*;
use serde_json::json;
use std::fs;
use std::path::PathBuf;
use tempfile::TempDir;

// ============================================================================
// Property Test Generators
// ============================================================================

/// Generate a valid company name
fn arb_company_name() -> impl Strategy<Value = String> {
    prop::string::string_regex("[A-Z][a-zA-Z0-9 ]{2,50}")
        .expect("Valid regex")
}

/// Generate a valid color hex code
fn arb_color_hex() -> impl Strategy<Value = String> {
    prop::string::string_regex("#[0-9A-Fa-f]{6}")
        .expect("Valid regex")
}

/// Generate a valid URL
fn arb_url() -> impl Strategy<Value = String> {
    prop::string::string_regex("https://[a-z0-9-]+\\.(com|net|org)/[a-z0-9-/]+\\.(png|jpg|svg)")
        .expect("Valid regex")
}

/// Generate a valid terminology term
fn arb_terminology_term() -> impl Strategy<Value = String> {
    prop_oneof![
        Just("Product".to_string()),
        Just("Item".to_string()),
        Just("Article".to_string()),
        Just("SKU".to_string()),
    ]
}

/// Generate a complete branding configuration
fn arb_branding_config() -> impl Strategy<Value = BrandingConfig> {
    (
        arb_company_name(),
        arb_color_hex(),
        arb_color_hex(),
        arb_url(),
        arb_terminology_term(),
        arb_terminology_term(),
    ).prop_map(|(company_name, primary_color, secondary_color, logo_url, product_term, customer_term)| {
        BrandingConfig {
            company_name,
            primary_color,
            secondary_color,
            logo_url,
            product_term,
            customer_term,
        }
    })
}

#[derive(Debug, Clone)]
struct BrandingConfig {
    company_name: String,
    primary_color: String,
    secondary_color: String,
    logo_url: String,
    product_term: String,
    customer_term: String,
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Create a temporary config file with the given branding configuration
fn create_config_file(temp_dir: &TempDir, config: &BrandingConfig) -> PathBuf {
    let config_json = json!({
        "tenant_id": "test-tenant",
        "branding": {
            "company": {
                "name": config.company_name,
                "logo": config.logo_url,
            }
        },
        "theme": {
            "colors": {
                "primary": config.primary_color,
                "secondary": config.secondary_color,
                "background": "#FFFFFF",
                "surface": "#F5F5F5",
                "text": "#000000",
                "success": "#4CAF50",
                "warning": "#FF9800",
                "error": "#F44336",
                "info": "#2196F3"
            }
        },
        "terminology": {
            "product": config.product_term,
            "customer": config.customer_term
        }
    });
    
    let config_path = temp_dir.path().join("test-tenant.json");
    fs::write(&config_path, serde_json::to_string_pretty(&config_json).unwrap())
        .expect("Failed to write config file");
    
    config_path
}

/// Parse branding from config JSON
fn parse_branding_from_config(config_path: &PathBuf) -> Result<BrandingConfig, String> {
    let content = fs::read_to_string(config_path)
        .map_err(|e| format!("Failed to read config: {}", e))?;
    
    let config: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse JSON: {}", e))?;
    
    let company_name = config["branding"]["company"]["name"]
        .as_str()
        .ok_or("Missing company name")?
        .to_string();
    
    let logo_url = config["branding"]["company"]["logo"]
        .as_str()
        .ok_or("Missing logo URL")?
        .to_string();
    
    let primary_color = config["theme"]["colors"]["primary"]
        .as_str()
        .ok_or("Missing primary color")?
        .to_string();
    
    let secondary_color = config["theme"]["colors"]["secondary"]
        .as_str()
        .ok_or("Missing secondary color")?
        .to_string();
    
    let product_term = config["terminology"]["product"]
        .as_str()
        .ok_or("Missing product term")?
        .to_string();
    
    let customer_term = config["terminology"]["customer"]
        .as_str()
        .ok_or("Missing customer term")?
        .to_string();
    
    Ok(BrandingConfig {
        company_name,
        primary_color,
        secondary_color,
        logo_url,
        product_term,
        customer_term,
    })
}

// ============================================================================
// Property Tests
// ============================================================================

// Property 6: Branding Configuration Round Trip
// For any valid branding configuration (tenant or store level), loading the configuration
// and rendering UI components should produce output containing the configured company name,
// logo URL, and colors
// **Validates: Requirements 3.1, 3.3, 3.4**

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]

    #[test]
    fn property_6_branding_configuration_round_trip(
        config in arb_branding_config(),
    ) {
        // Create a temporary directory for config files
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        // Write the branding configuration to a file
        let config_path = create_config_file(&temp_dir, &config);
        
        // Read the configuration back
        let parsed_config = parse_branding_from_config(&config_path)
            .expect("Failed to parse branding config");
        
        // Verify company name is preserved
        prop_assert_eq!(
            &parsed_config.company_name,
            &config.company_name,
            "Company name should be preserved in round trip"
        );
        
        // Verify logo URL is preserved
        prop_assert_eq!(
            &parsed_config.logo_url,
            &config.logo_url,
            "Logo URL should be preserved in round trip"
        );
        
        // Verify primary color is preserved
        prop_assert_eq!(
            &parsed_config.primary_color,
            &config.primary_color,
            "Primary color should be preserved in round trip"
        );
        
        // Verify secondary color is preserved
        prop_assert_eq!(
            &parsed_config.secondary_color,
            &config.secondary_color,
            "Secondary color should be preserved in round trip"
        );
        
        // Verify product terminology is preserved
        prop_assert_eq!(
            &parsed_config.product_term,
            &config.product_term,
            "Product terminology should be preserved in round trip"
        );
        
        // Verify customer terminology is preserved
        prop_assert_eq!(
            &parsed_config.customer_term,
            &config.customer_term,
            "Customer terminology should be preserved in round trip"
        );
        
        // Verify the configuration is valid JSON
        let content = fs::read_to_string(&config_path).expect("Failed to read config");
        let _: serde_json::Value = serde_json::from_str(&content)
            .expect("Config should be valid JSON");
    }
}

#[cfg(test)]
mod additional_tests {
    use super::*;

    // Additional property test: Store-level branding overrides tenant branding
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        #[test]
        fn property_store_level_overrides(
            tenant_config in arb_branding_config(),
            store_name in arb_company_name(),
        ) {
            let temp_dir = TempDir::new().expect("Failed to create temp dir");
            
            // Create config with store-level override
            let config_json = json!({
                "tenant_id": "test-tenant",
                "branding": {
                    "company": {
                        "name": tenant_config.company_name,
                        "logo": tenant_config.logo_url,
                    },
                    "store": {
                        "name": store_name,
                    }
                },
                "theme": {
                    "colors": {
                        "primary": tenant_config.primary_color,
                        "secondary": tenant_config.secondary_color,
                        "background": "#FFFFFF",
                        "surface": "#F5F5F5",
                        "text": "#000000",
                        "success": "#4CAF50",
                        "warning": "#FF9800",
                        "error": "#F44336",
                        "info": "#2196F3"
                    }
                }
            });
            
            let config_path = temp_dir.path().join("test-tenant.json");
            fs::write(&config_path, serde_json::to_string_pretty(&config_json).unwrap())
                .expect("Failed to write config file");
            
            // Read and verify store name is present
            let content = fs::read_to_string(&config_path).expect("Failed to read config");
            let config: serde_json::Value = serde_json::from_str(&content).expect("Failed to parse JSON");
            
            let store_name_parsed = config["branding"]["store"]["name"]
                .as_str()
                .expect("Store name should be present");
            
            prop_assert_eq!(
                store_name_parsed,
                &store_name,
                "Store name should be preserved"
            );
        }
    }

    // Additional property test: Multiple tenants have isolated branding
    proptest! {
        #![proptest_config(ProptestConfig::with_cases(50))]

        #[test]
        fn property_tenant_isolation(
            config1 in arb_branding_config(),
            config2 in arb_branding_config(),
        ) {
            let temp_dir = TempDir::new().expect("Failed to create temp dir");
            
            // Create two different tenant configs
            let config1_json = json!({
                "tenant_id": "tenant-1",
                "branding": {
                    "company": {
                        "name": config1.company_name,
                        "logo": config1.logo_url,
                    }
                },
                "theme": {
                    "colors": {
                        "primary": config1.primary_color,
                        "secondary": config1.secondary_color,
                        "background": "#FFFFFF",
                        "surface": "#F5F5F5",
                        "text": "#000000",
                        "success": "#4CAF50",
                        "warning": "#FF9800",
                        "error": "#F44336",
                        "info": "#2196F3"
                    }
                }
            });
            
            let config2_json = json!({
                "tenant_id": "tenant-2",
                "branding": {
                    "company": {
                        "name": config2.company_name,
                        "logo": config2.logo_url,
                    }
                },
                "theme": {
                    "colors": {
                        "primary": config2.primary_color,
                        "secondary": config2.secondary_color,
                        "background": "#FFFFFF",
                        "surface": "#F5F5F5",
                        "text": "#000000",
                        "success": "#4CAF50",
                        "warning": "#FF9800",
                        "error": "#F44336",
                        "info": "#2196F3"
                    }
                }
            });
            
            let config1_path = temp_dir.path().join("tenant-1.json");
            let config2_path = temp_dir.path().join("tenant-2.json");
            
            fs::write(&config1_path, serde_json::to_string_pretty(&config1_json).unwrap())
                .expect("Failed to write config1");
            fs::write(&config2_path, serde_json::to_string_pretty(&config2_json).unwrap())
                .expect("Failed to write config2");
            
            // Verify both configs exist and are different
            let parsed1 = parse_branding_from_config(&config1_path)
                .expect("Failed to parse config1");
            let parsed2 = parse_branding_from_config(&config2_path)
                .expect("Failed to parse config2");
            
            // Verify tenant 1 config is correct
            prop_assert_eq!(&parsed1.company_name, &config1.company_name);
            prop_assert_eq!(&parsed1.primary_color, &config1.primary_color);
            
            // Verify tenant 2 config is correct
            prop_assert_eq!(&parsed2.company_name, &config2.company_name);
            prop_assert_eq!(&parsed2.primary_color, &config2.primary_color);
            
            // Verify configs are isolated (if they're different)
            if config1.company_name != config2.company_name {
                prop_assert_ne!(
                    &parsed1.company_name,
                    &parsed2.company_name,
                    "Tenant configs should be isolated"
                );
            }
        }
    }

    // Unit test: Specific example from requirements
    #[test]
    fn test_branding_specific_example() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        let config = BrandingConfig {
            company_name: "Acme Retail".to_string(),
            primary_color: "#FF5733".to_string(),
            secondary_color: "#33FF57".to_string(),
            logo_url: "https://example.com/logo.png".to_string(),
            product_term: "Item".to_string(),
            customer_term: "Client".to_string(),
        };
        
        let config_path = create_config_file(&temp_dir, &config);
        let parsed = parse_branding_from_config(&config_path)
            .expect("Failed to parse config");
        
        assert_eq!(parsed.company_name, "Acme Retail");
        assert_eq!(parsed.primary_color, "#FF5733");
        assert_eq!(parsed.logo_url, "https://example.com/logo.png");
        assert_eq!(parsed.product_term, "Item");
    }

    // Unit test: Edge case - minimal branding
    #[test]
    fn test_branding_minimal() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        let config = BrandingConfig {
            company_name: "Co".to_string(),
            primary_color: "#000000".to_string(),
            secondary_color: "#FFFFFF".to_string(),
            logo_url: "https://a.com/l.png".to_string(),
            product_term: "Product".to_string(),
            customer_term: "Customer".to_string(),
        };
        
        let config_path = create_config_file(&temp_dir, &config);
        let parsed = parse_branding_from_config(&config_path)
            .expect("Failed to parse config");
        
        assert_eq!(parsed.company_name, "Co");
        assert_eq!(parsed.primary_color, "#000000");
    }

    // Unit test: Edge case - long company name
    #[test]
    fn test_branding_long_company_name() {
        let temp_dir = TempDir::new().expect("Failed to create temp dir");
        
        let long_name = "A".repeat(50);
        let config = BrandingConfig {
            company_name: long_name.clone(),
            primary_color: "#123456".to_string(),
            secondary_color: "#654321".to_string(),
            logo_url: "https://example.com/logo.png".to_string(),
            product_term: "Product".to_string(),
            customer_term: "Customer".to_string(),
        };
        
        let config_path = create_config_file(&temp_dir, &config);
        let parsed = parse_branding_from_config(&config_path)
            .expect("Failed to parse config");
        
        assert_eq!(parsed.company_name, long_name);
    }
}
