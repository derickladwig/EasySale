/// Integration tests for configuration system
/// 
/// Tests the complete configuration loading and validation flow
/// with real configuration files.

use easysale_server::{ConfigLoader, TenantConfig};
use std::path::PathBuf;

#[tokio::test]
async fn test_load_default_configuration() {
    let loader = ConfigLoader::new("../../configs", 300, false);
    
    // Load default configuration (from configs/default.json)
    let result = loader.load_config("default");
    assert!(result.is_ok(), "Failed to load default configuration: {:?}", result.err());
    
    let config: TenantConfig = result.unwrap();
    
    // Verify tenant info
    assert_eq!(config.tenant.id, "default");
    assert_eq!(config.tenant.name, "EasySale");
    
    // Verify branding
    assert_eq!(config.branding.company.name, "EasySale");
    
    // Verify categories - should have generic "Products" category only
    assert!(!config.categories.is_empty(), "No categories found");
    let category_ids: Vec<&str> = config.categories.iter().map(|c| c.id.as_str()).collect();
    assert!(category_ids.contains(&"products"), "Missing 'products' category");
    
    // Should NOT have CAPS-specific categories
    assert!(!category_ids.contains(&"caps"), "Should not have 'caps' category");
    assert!(!category_ids.contains(&"auto-parts"), "Should not have 'auto-parts' category");
    assert!(!category_ids.contains(&"paint"), "Should not have 'paint' category");
    
    // Verify navigation
    assert!(!config.navigation.main.is_empty(), "No navigation items found");
}

#[tokio::test]
async fn test_load_caps_configuration() {
    // Get path to CAPS configuration
    let config_path = PathBuf::from("../../configs/private/caps-automotive.json");
    
    // Skip test if private config doesn't exist (CI environment)
    if !config_path.exists() {
        println!("Skipping test: CAPS configuration not found (expected in CI)");
        return;
    }
    
    // Create config loader (config_dir, cache_ttl_secs, hot_reload)
    let loader = ConfigLoader::new("../../configs", 300, false);
    
    // Load CAPS configuration
    let result = loader.load_config("caps-automotive");
    
    // Verify configuration loaded successfully
    assert!(result.is_ok(), "Failed to load CAPS configuration: {:?}", result.err());
    
    let config: TenantConfig = result.unwrap();
    
    // Verify tenant info
    assert_eq!(config.tenant.id, "caps-automotive");
    assert_eq!(config.tenant.name, "CAPS Automotive & Paint Supply");
    
    // Verify branding (company name may differ from tenant name)
    assert!(!config.branding.company.name.is_empty(), "Company name should not be empty");
    assert!(config.branding.company.logo.is_some());
    
    // Verify categories exist
    assert!(!config.categories.is_empty(), "No categories found");
    assert!(config.categories.len() >= 5, "Expected at least 5 categories");
    
    // Verify specific categories
    let category_ids: Vec<&str> = config.categories.iter().map(|c| c.id.as_str()).collect();
    assert!(category_ids.contains(&"caps"), "Missing 'caps' category");
    assert!(category_ids.contains(&"auto-parts"), "Missing 'auto-parts' category");
    assert!(category_ids.contains(&"paint"), "Missing 'paint' category");
    
    // Verify navigation (main menu items)
    assert!(!config.navigation.main.is_empty(), "No navigation items found");
    
    // Verify modules (check if specific modules exist in the HashMap)
    assert!(config.modules.modules.contains_key("layaway"), "Layaway module should exist");
    assert!(config.modules.modules.contains_key("commissions"), "Commissions module should exist");
    assert!(config.modules.modules.contains_key("loyalty"), "Loyalty module should exist");
    
    // Verify modules are enabled
    if let Some(layaway) = config.modules.modules.get("layaway") {
        assert!(layaway.enabled, "Layaway module should be enabled");
    }
}

#[tokio::test]
async fn test_load_example_configurations() {
    let loader = ConfigLoader::new("../../configs", 300, false);
    
    // Test retail store configuration
    let retail_result = loader.load_config("retail-store");
    assert!(retail_result.is_ok(), "Failed to load retail-store configuration: {:?}", retail_result.err());
    
    let retail_config: TenantConfig = retail_result.unwrap();
    assert_eq!(retail_config.tenant.id, "retail-store");
    assert!(!retail_config.categories.is_empty());
    
    // Test restaurant configuration
    let restaurant_result = loader.load_config("restaurant");
    assert!(restaurant_result.is_ok(), "Failed to load restaurant configuration: {:?}", restaurant_result.err());
    
    let restaurant_config: TenantConfig = restaurant_result.unwrap();
    assert_eq!(restaurant_config.tenant.id, "restaurant");
    assert!(!restaurant_config.categories.is_empty());
    
    // Test service business configuration
    let service_result = loader.load_config("service-business");
    assert!(service_result.is_ok(), "Failed to load service-business configuration: {:?}", service_result.err());
    
    let service_config: TenantConfig = service_result.unwrap();
    assert_eq!(service_config.tenant.id, "service-business");
    assert!(!service_config.categories.is_empty());
}

#[tokio::test]
async fn test_configuration_caching() {
    let loader = ConfigLoader::new("../../configs", 300, false);
    
    // Load configuration first time
    let result1 = loader.load_config("retail-store");
    assert!(result1.is_ok());
    
    // Load same configuration again (should use cache)
    let result2 = loader.load_config("retail-store");
    assert!(result2.is_ok());
    
    // Verify both loads succeeded
    let config1 = result1.unwrap();
    let config2 = result2.unwrap();
    
    // Verify configurations are identical
    assert_eq!(config1.tenant.id, config2.tenant.id);
    assert_eq!(config1.tenant.name, config2.tenant.name);
}

#[tokio::test]
async fn test_list_available_tenants() {
    let loader = ConfigLoader::new("../../configs", 300, false);
    
    // List all available tenant configurations
    let result = loader.list_tenants();
    assert!(result.is_ok(), "Failed to list tenants: {:?}", result.err());
    
    let tenants = result.unwrap();
    
    // Verify example configurations are listed
    assert!(tenants.contains(&"retail-store".to_string()), "retail-store not found in tenant list");
    assert!(tenants.contains(&"restaurant".to_string()), "restaurant not found in tenant list");
    assert!(tenants.contains(&"service-business".to_string()), "service-business not found in tenant list");
    
    // CAPS configuration may or may not be present (private)
    println!("Available tenants: {:?}", tenants);
}

#[tokio::test]
async fn test_invalid_configuration_path() {
    let loader = ConfigLoader::new("../../configs", 300, false);
    
    // Try to load non-existent configuration
    let result = loader.load_config("non-existent-tenant");
    
    // Should return error
    assert!(result.is_err(), "Expected error for non-existent configuration");
}

#[tokio::test]
async fn test_configuration_validation() {
    let loader = ConfigLoader::new("../../configs", 300, false);
    
    // Load a valid configuration
    let result = loader.load_config("retail-store");
    assert!(result.is_ok());
    
    let config = result.unwrap();
    
    // Validate configuration structure
    assert!(!config.tenant.id.is_empty(), "Tenant ID should not be empty");
    assert!(!config.tenant.name.is_empty(), "Tenant name should not be empty");
    assert!(!config.branding.company.name.is_empty(), "Company name should not be empty");
    
    // Validate categories
    for category in &config.categories {
        assert!(!category.id.is_empty(), "Category ID should not be empty");
        assert!(!category.name.is_empty(), "Category name should not be empty");
        assert!(!category.attributes.is_empty(), "Category should have at least one attribute");
    }
    
    // Validate navigation
    for item in &config.navigation.main {
        assert!(!item.id.is_empty(), "Navigation item ID should not be empty");
        assert!(!item.label.is_empty(), "Navigation item label should not be empty");
    }
}
