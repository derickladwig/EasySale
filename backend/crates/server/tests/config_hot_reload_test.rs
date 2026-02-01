// Integration test for configuration hot-reload functionality
// Tests that configuration changes are detected and reloaded without server restart

use std::fs;
use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;
use tempfile::TempDir;
use tokio::time::sleep;

use easysale_server::config::{ConfigFileWatcher, ConfigLoader};

/// Create a test configuration directory with a sample tenant config
fn create_test_config_dir() -> TempDir {
    let temp_dir = TempDir::new().unwrap();
    let private_dir = temp_dir.path().join("private");
    fs::create_dir_all(&private_dir).unwrap();
    temp_dir
}

/// Create a valid tenant configuration file
fn create_tenant_config(dir: &std::path::Path, tenant_id: &str, version: &str) -> PathBuf {
    let config_json = format!(
        r##"{{
            "version": "{}",
            "tenant": {{
                "id": "{}",
                "name": "Test Tenant",
                "slug": "test-tenant"
            }},
            "branding": {{
                "company": {{
                    "name": "Test Company"
                }}
            }},
            "theme": {{
                "mode": "dark",
                "colors": {{
                    "primary": "#3b82f6",
                    "background": "#0f172a",
                    "surface": "#1e293b",
                    "text": "#f1f5f9",
                    "success": "#10b981",
                    "warning": "#f59e0b",
                    "error": "#ef4444",
                    "info": "#3b82f6"
                }}
            }},
            "categories": [{{
                "id": "test-category",
                "name": "Test Category",
                "attributes": [{{
                    "name": "test-attr",
                    "type": "text"
                }}]
            }}],
            "navigation": {{
                "main": [{{
                    "id": "home",
                    "label": "Home",
                    "route": "/"
                }}]
            }},
            "widgets": {{
                "dashboard": []
            }},
            "modules": {{}},
            "localization": {{}}
        }}"##,
        version, tenant_id
    );

    let private_dir = dir.join("private");
    let config_path = private_dir.join(format!("{}.json", tenant_id));
    fs::write(&config_path, config_json).unwrap();
    config_path
}

#[tokio::test]
async fn test_config_hot_reload_on_modification() {
    // Create test configuration directory
    let temp_dir = create_test_config_dir();
    let config_dir = temp_dir.path();

    // Initialize configuration loader
    let config_loader = Arc::new(ConfigLoader::new(config_dir, 300, true));

    // Create initial configuration file
    let tenant_id = "test-tenant";
    let config_path = create_tenant_config(config_dir, tenant_id, "1.0.0");

    // Load initial configuration
    let initial_config = config_loader.load_config(tenant_id).unwrap();
    assert_eq!(initial_config.version, "1.0.0");

    // Start file watcher
    let config_loader_clone = config_loader.clone();
    let (_watcher, event_rx) = ConfigFileWatcher::new(config_loader_clone.clone(), config_dir).unwrap();

    // Spawn event processor
    let processor_handle = tokio::spawn(async move {
        ConfigFileWatcher::process_events(config_loader_clone, event_rx).await;
    });

    // Wait for watcher to initialize
    sleep(Duration::from_millis(500)).await;

    // Modify configuration file
    create_tenant_config(config_dir, tenant_id, "1.0.1");

    // Wait for file watcher to detect change and reload
    sleep(Duration::from_secs(3)).await;

    // Reload configuration (should get updated version from cache)
    let updated_config = config_loader.reload_config(tenant_id).unwrap();
    assert_eq!(updated_config.version, "1.0.1");

    // Cleanup
    processor_handle.abort();
}

#[tokio::test]
async fn test_config_hot_reload_on_creation() {
    // Create test configuration directory
    let temp_dir = create_test_config_dir();
    let config_dir = temp_dir.path();

    // Initialize configuration loader
    let config_loader = Arc::new(ConfigLoader::new(config_dir, 300, true));

    // Start file watcher
    let config_loader_clone = config_loader.clone();
    let (_watcher, event_rx) = ConfigFileWatcher::new(config_loader_clone.clone(), config_dir).unwrap();

    // Spawn event processor
    let processor_handle = tokio::spawn(async move {
        ConfigFileWatcher::process_events(config_loader_clone, event_rx).await;
    });

    // Wait for watcher to initialize
    sleep(Duration::from_millis(500)).await;

    // Create new configuration file
    let tenant_id = "new-tenant";
    create_tenant_config(config_dir, tenant_id, "1.0.0");

    // Wait for file watcher to detect creation and load
    sleep(Duration::from_secs(3)).await;

    // Load configuration (should be available)
    let config = config_loader.load_config(tenant_id).unwrap();
    assert_eq!(config.tenant.id, tenant_id);
    assert_eq!(config.version, "1.0.0");

    // Cleanup
    processor_handle.abort();
}

#[tokio::test]
async fn test_config_hot_reload_handles_invalid_config() {
    // Create test configuration directory
    let temp_dir = create_test_config_dir();
    let config_dir = temp_dir.path();

    // Initialize configuration loader
    let config_loader = Arc::new(ConfigLoader::new(config_dir, 300, true));

    // Create initial valid configuration
    let tenant_id = "test-tenant";
    let config_path = create_tenant_config(config_dir, tenant_id, "1.0.0");

    // Load initial configuration
    let initial_config = config_loader.load_config(tenant_id).unwrap();
    assert_eq!(initial_config.version, "1.0.0");

    // Start file watcher
    let config_loader_clone = config_loader.clone();
    let (_watcher, event_rx) = ConfigFileWatcher::new(config_loader_clone.clone(), config_dir).unwrap();

    // Spawn event processor
    let processor_handle = tokio::spawn(async move {
        ConfigFileWatcher::process_events(config_loader_clone, event_rx).await;
    });

    // Wait for watcher to initialize
    sleep(Duration::from_millis(500)).await;

    // Write invalid JSON to configuration file
    fs::write(&config_path, r#"{"invalid": json}"#).unwrap();

    // Wait for file watcher to detect change
    sleep(Duration::from_secs(3)).await;

    // Configuration should still be available from cache (old version)
    // The reload should fail but not crash the server
    let cached_config = config_loader.load_config(tenant_id).unwrap();
    assert_eq!(cached_config.version, "1.0.0"); // Still has old version

    // Cleanup
    processor_handle.abort();
}

#[tokio::test]
async fn test_config_hot_reload_thread_safety() {
    // Create test configuration directory
    let temp_dir = create_test_config_dir();
    let config_dir = temp_dir.path();

    // Initialize configuration loader
    let config_loader = Arc::new(ConfigLoader::new(config_dir, 300, true));

    // Create initial configuration
    let tenant_id = "test-tenant";
    let config_path = create_tenant_config(config_dir, tenant_id, "1.0.0");

    // Start file watcher
    let config_loader_clone = config_loader.clone();
    let (_watcher, event_rx) = ConfigFileWatcher::new(config_loader_clone.clone(), config_dir).unwrap();

    // Spawn event processor
    let processor_handle = tokio::spawn(async move {
        ConfigFileWatcher::process_events(config_loader_clone, event_rx).await;
    });

    // Wait for watcher to initialize
    sleep(Duration::from_millis(500)).await;

    // Spawn multiple tasks that read configuration concurrently
    let mut handles = vec![];
    for i in 0..10 {
        let loader = config_loader.clone();
        let tid = tenant_id.to_string();
        let handle = tokio::spawn(async move {
            for _ in 0..5 {
                let config = loader.load_config(&tid).unwrap();
                assert!(config.version.starts_with("1.0"));
                sleep(Duration::from_millis(100)).await;
            }
            i
        });
        handles.push(handle);
    }

    // Modify configuration while reads are happening
    sleep(Duration::from_millis(200)).await;
    create_tenant_config(config_dir, tenant_id, "1.0.1");

    // Wait for all read tasks to complete
    for handle in handles {
        handle.await.unwrap();
    }

    // Verify final configuration is updated
    sleep(Duration::from_secs(3)).await;
    let final_config = config_loader.reload_config(tenant_id).unwrap();
    assert_eq!(final_config.version, "1.0.1");

    // Cleanup
    processor_handle.abort();
}
