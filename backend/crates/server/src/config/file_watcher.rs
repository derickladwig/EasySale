// File watcher for configuration hot-reload
// Monitors configuration files for changes and triggers reload handlers

use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::time::Duration;

use notify::{
    Config as NotifyConfig, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use tokio::sync::mpsc;
use tracing::{debug, error, info, warn};

use super::error::{ConfigError, ConfigResult};
use super::loader::ConfigLoader;

/// Configuration change event
#[derive(Debug, Clone)]
pub struct ConfigChangeEvent {
    /// Path to the changed configuration file
    pub path: PathBuf,
    
    /// Type of change (created, modified, deleted)
    pub kind: ConfigChangeKind,
    
    /// Tenant ID extracted from filename (if applicable)
    pub tenant_id: Option<String>,
}

/// Type of configuration change
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConfigChangeKind {
    /// Configuration file was created
    Created,
    
    /// Configuration file was modified
    Modified,
    
    /// Configuration file was deleted
    Deleted,
}

/// Configuration file watcher
pub struct ConfigFileWatcher {
    /// Configuration loader for reloading configs
    config_loader: Arc<ConfigLoader>,
    
    /// Channels for sending change events (supports multiple subscribers)
    event_txs: Vec<mpsc::UnboundedSender<ConfigChangeEvent>>,
    
    /// File system watcher
    _watcher: RecommendedWatcher,
}

impl ConfigFileWatcher {
    /// Create a new configuration file watcher
    ///
    /// # Arguments
    /// * `config_loader` - Configuration loader for reloading configs
    /// * `config_dir` - Directory to watch for configuration changes
    ///
    /// # Returns
    /// * `ConfigResult<(Self, mpsc::UnboundedReceiver<ConfigChangeEvent>, mpsc::UnboundedReceiver<ConfigChangeEvent>)>` - Watcher and two event receivers (one for reload, one for WebSocket)
    pub fn new(
        config_loader: Arc<ConfigLoader>,
        config_dir: impl AsRef<Path>,
    ) -> ConfigResult<(Self, mpsc::UnboundedReceiver<ConfigChangeEvent>, mpsc::UnboundedReceiver<ConfigChangeEvent>)> {
        let config_dir = config_dir.as_ref().to_path_buf();
        
        // Create channels for events (two subscribers: reload handler and WebSocket notifier)
        let (reload_tx, reload_rx) = mpsc::unbounded_channel();
        let (ws_tx, ws_rx) = mpsc::unbounded_channel();
        
        // Create file system watcher
        let reload_tx_clone = reload_tx.clone();
        let ws_tx_clone = ws_tx.clone();
        let dir = config_dir.clone();
        
        let mut watcher = RecommendedWatcher::new(
            move |result: Result<Event, notify::Error>| {
                match result {
                    Ok(event) => {
                        if let Err(e) = Self::handle_fs_event(&[reload_tx_clone.clone(), ws_tx_clone.clone()], &dir, event) {
                            error!("Error handling file system event: {}", e);
                        }
                    }
                    Err(e) => {
                        error!("File system watcher error: {}", e);
                    }
                }
            },
            NotifyConfig::default()
                .with_poll_interval(Duration::from_secs(2))
                .with_compare_contents(true),
        )
        .map_err(|e| ConfigError::ReadError(format!("Failed to create file watcher: {}", e)))?;
        
        // Watch the config directory recursively
        watcher
            .watch(&config_dir, RecursiveMode::Recursive)
            .map_err(|e| {
                ConfigError::ReadError(format!(
                    "Failed to watch directory {}: {}",
                    config_dir.display(),
                    e
                ))
            })?;
        
        info!("Configuration file watcher started for directory: {}", config_dir.display());
        
        Ok((
            Self {
                config_loader,
                event_txs: vec![reload_tx, ws_tx],
                _watcher: watcher,
            },
            reload_rx,
            ws_rx,
        ))
    }
    
    /// Handle a file system event
    fn handle_fs_event(
        txs: &[mpsc::UnboundedSender<ConfigChangeEvent>],
        config_dir: &Path,
        event: Event,
    ) -> ConfigResult<()> {
        // Only process events for JSON files
        let paths: Vec<_> = event
            .paths
            .iter()
            .filter(|p| {
                p.extension()
                    .and_then(|ext| ext.to_str())
                    .map(|ext| ext == "json")
                    .unwrap_or(false)
            })
            .collect();
        
        if paths.is_empty() {
            return Ok(());
        }
        
        // Determine change kind
        let kind = match event.kind {
            EventKind::Create(_) => ConfigChangeKind::Created,
            EventKind::Modify(_) => ConfigChangeKind::Modified,
            EventKind::Remove(_) => ConfigChangeKind::Deleted,
            _ => return Ok(()), // Ignore other event types
        };
        
        // Process each changed file
        for path in paths {
            let tenant_id = Self::extract_tenant_id(config_dir, path);
            
            let change_event = ConfigChangeEvent {
                path: path.to_path_buf(),
                kind,
                tenant_id: tenant_id.clone(),
            };
            
            debug!(
                "Configuration file {} detected: {} (tenant: {:?})",
                match kind {
                    ConfigChangeKind::Created => "created",
                    ConfigChangeKind::Modified => "modified",
                    ConfigChangeKind::Deleted => "deleted",
                },
                path.display(),
                tenant_id
            );
            
            // Send event to all subscribers
            for tx in txs {
                if let Err(e) = tx.send(change_event.clone()) {
                    error!("Failed to send configuration change event: {}", e);
                }
            }
        }
        
        Ok(())
    }
    
    /// Extract tenant ID from configuration file path
    fn extract_tenant_id(config_dir: &Path, file_path: &Path) -> Option<String> {
        // Get relative path from config directory
        let relative_path = file_path.strip_prefix(config_dir).ok()?;
        
        // Get filename without extension
        let file_stem = file_path.file_stem()?.to_str()?;
        
        // Skip schema.json and other non-tenant files
        if file_stem == "schema" || file_stem == "default" {
            return None;
        }
        
        // Check if file is in private/ or examples/ subdirectory
        let parent = relative_path.parent()?;
        let parent_name = parent.file_name()?.to_str()?;
        
        if parent_name == "private" || parent_name == "examples" {
            Some(file_stem.to_string())
        } else if parent == Path::new("") {
            // File is in root config directory
            Some(file_stem.to_string())
        } else {
            None
        }
    }
    
    /// Start processing configuration change events
    ///
    /// This method runs in a loop, processing events from the file watcher
    /// and triggering configuration reloads as needed.
    ///
    /// # Arguments
    /// * `event_rx` - Receiver for configuration change events
    pub async fn process_events(
        config_loader: Arc<ConfigLoader>,
        mut event_rx: mpsc::UnboundedReceiver<ConfigChangeEvent>,
    ) {
        info!("Configuration change event processor started");
        
        while let Some(event) = event_rx.recv().await {
            Self::handle_change_event(&config_loader, event).await;
        }
        
        warn!("Configuration change event processor stopped");
    }
    
    /// Handle a configuration change event
    async fn handle_change_event(config_loader: &ConfigLoader, event: ConfigChangeEvent) {
        match event.kind {
            ConfigChangeKind::Created => {
                info!(
                    "Configuration file created: {} (tenant: {:?})",
                    event.path.display(),
                    event.tenant_id
                );
                
                // Attempt to load the new configuration
                if let Some(tenant_id) = &event.tenant_id {
                    match config_loader.load_config(tenant_id) {
                        Ok(_) => {
                            info!("Successfully loaded new configuration for tenant: {}", tenant_id);
                        }
                        Err(e) => {
                            error!(
                                "Failed to load new configuration for tenant {}: {}",
                                tenant_id, e
                            );
                        }
                    }
                }
            }
            
            ConfigChangeKind::Modified => {
                info!(
                    "Configuration file modified: {} (tenant: {:?})",
                    event.path.display(),
                    event.tenant_id
                );
                
                // Reload the configuration
                if let Some(tenant_id) = &event.tenant_id {
                    match config_loader.reload_config(tenant_id) {
                        Ok(_) => {
                            info!("Successfully reloaded configuration for tenant: {}", tenant_id);
                        }
                        Err(e) => {
                            error!(
                                "Failed to reload configuration for tenant {}: {}",
                                tenant_id, e
                            );
                        }
                    }
                }
            }
            
            ConfigChangeKind::Deleted => {
                warn!(
                    "Configuration file deleted: {} (tenant: {:?})",
                    event.path.display(),
                    event.tenant_id
                );
                
                // Note: We don't remove from cache on delete to avoid breaking running operations
                // The cache will naturally expire based on TTL
                if let Some(tenant_id) = &event.tenant_id {
                    warn!(
                        "Configuration for tenant {} was deleted. Cached version will remain until TTL expires.",
                        tenant_id
                    );
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;
    use tokio::time::{sleep, Duration};
    
    fn create_test_config_dir() -> TempDir {
        let temp_dir = TempDir::new().unwrap();
        let private_dir = temp_dir.path().join("private");
        fs::create_dir_all(&private_dir).unwrap();
        temp_dir
    }
    
    fn create_test_config_file(dir: &Path, tenant_id: &str) -> PathBuf {
        let config_json = r##"{
            "version": "1.0.0",
            "tenant": {
                "id": "test-tenant",
                "name": "Test Tenant",
                "slug": "test-tenant"
            },
            "branding": {
                "company": {
                    "name": "Test Company"
                }
            },
            "theme": {
                "mode": "dark",
                "colors": {
                    "primary": "#3b82f6",
                    "background": "#0f172a",
                    "surface": "#1e293b",
                    "text": "#f1f5f9",
                    "success": "#10b981",
                    "warning": "#f59e0b",
                    "error": "#ef4444",
                    "info": "#3b82f6"
                }
            },
            "categories": [{
                "id": "test-category",
                "name": "Test Category",
                "attributes": [{
                    "name": "test-attr",
                    "type": "text"
                }]
            }],
            "navigation": {
                "main": [{
                    "id": "home",
                    "label": "Home",
                    "route": "/"
                }]
            },
            "widgets": {
                "dashboard": []
            },
            "modules": {},
            "localization": {}
        }"##;
        
        let private_dir = dir.join("private");
        let config_path = private_dir.join(format!("{}.json", tenant_id));
        fs::write(&config_path, config_json).unwrap();
        config_path
    }
    
    #[test]
    fn test_extract_tenant_id() {
        let config_dir = PathBuf::from("/configs");
        
        // Test private directory
        let path = PathBuf::from("/configs/private/tenant1.json");
        let tenant_id = ConfigFileWatcher::extract_tenant_id(&config_dir, &path);
        assert_eq!(tenant_id, Some("tenant1".to_string()));
        
        // Test examples directory
        let path = PathBuf::from("/configs/examples/tenant2.json");
        let tenant_id = ConfigFileWatcher::extract_tenant_id(&config_dir, &path);
        assert_eq!(tenant_id, Some("tenant2".to_string()));
        
        // Test root directory
        let path = PathBuf::from("/configs/default.json");
        let tenant_id = ConfigFileWatcher::extract_tenant_id(&config_dir, &path);
        assert_eq!(tenant_id, Some("default".to_string()));
        
        // Test schema.json (should be None)
        let path = PathBuf::from("/configs/schema.json");
        let tenant_id = ConfigFileWatcher::extract_tenant_id(&config_dir, &path);
        assert_eq!(tenant_id, None);
    }
    
    #[tokio::test]
    async fn test_file_watcher_creation() {
        let temp_dir = create_test_config_dir();
        let config_loader = Arc::new(ConfigLoader::new(temp_dir.path(), 300, true));
        
        let result = ConfigFileWatcher::new(config_loader, temp_dir.path());
        assert!(result.is_ok());
        
        let (_watcher, _reload_rx, _ws_rx) = result.unwrap();
        // Watcher is created successfully
    }
    
    #[tokio::test]
    async fn test_file_modification_detection() {
        let temp_dir = create_test_config_dir();
        let config_loader = Arc::new(ConfigLoader::new(temp_dir.path(), 300, true));
        
        let (_watcher, mut reload_rx, mut ws_rx) = ConfigFileWatcher::new(
            config_loader.clone(),
            temp_dir.path(),
        )
        .unwrap();
        
        // Create a config file
        let config_path = create_test_config_file(temp_dir.path(), "test-tenant");
        
        // Wait for creation event
        sleep(Duration::from_millis(500)).await;
        
        // Modify the file
        fs::write(&config_path, r#"{"version": "1.0.1"}"#).unwrap();
        
        // Wait for modification event
        sleep(Duration::from_millis(500)).await;
        
        // Check for events in both channels
        let mut found_modify_reload = false;
        let mut found_modify_ws = false;
        
        while let Ok(event) = reload_rx.try_recv() {
            if event.kind == ConfigChangeKind::Modified {
                found_modify_reload = true;
                assert_eq!(event.tenant_id, Some("test-tenant".to_string()));
            }
        }
        
        while let Ok(event) = ws_rx.try_recv() {
            if event.kind == ConfigChangeKind::Modified {
                found_modify_ws = true;
                assert_eq!(event.tenant_id, Some("test-tenant".to_string()));
            }
        }
        
        assert!(found_modify_reload, "Should detect file modification in reload channel");
        assert!(found_modify_ws, "Should detect file modification in WebSocket channel");
    }
    
    #[tokio::test]
    async fn test_file_deletion_detection() {
        let temp_dir = create_test_config_dir();
        let config_loader = Arc::new(ConfigLoader::new(temp_dir.path(), 300, true));
        
        let (_watcher, mut reload_rx, mut ws_rx) = ConfigFileWatcher::new(
            config_loader.clone(),
            temp_dir.path(),
        )
        .unwrap();
        
        // Create a config file
        let config_path = create_test_config_file(temp_dir.path(), "test-tenant");
        
        // Wait for creation event
        sleep(Duration::from_millis(500)).await;
        
        // Delete the file
        fs::remove_file(&config_path).unwrap();
        
        // Wait for deletion event
        sleep(Duration::from_millis(500)).await;
        
        // Check for events in both channels
        let mut found_delete_reload = false;
        let mut found_delete_ws = false;
        
        while let Ok(event) = reload_rx.try_recv() {
            if event.kind == ConfigChangeKind::Deleted {
                found_delete_reload = true;
                assert_eq!(event.tenant_id, Some("test-tenant".to_string()));
            }
        }
        
        while let Ok(event) = ws_rx.try_recv() {
            if event.kind == ConfigChangeKind::Deleted {
                found_delete_ws = true;
                assert_eq!(event.tenant_id, Some("test-tenant".to_string()));
            }
        }
        
        assert!(found_delete_reload, "Should detect file deletion in reload channel");
        assert!(found_delete_ws, "Should detect file deletion in WebSocket channel");
    }
}
