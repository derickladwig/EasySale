// Configuration change notifier
// Bridges configuration file watcher events to WebSocket broadcasts

use std::sync::Arc;

use actix::Addr;
use tokio::sync::mpsc;
use tracing::{debug, error, info};

use crate::config::file_watcher::{ConfigChangeEvent, ConfigChangeKind};
use super::server::{BroadcastToTenant, WsMessage, WsServer};

/// Configuration change notifier
/// Listens to configuration change events and broadcasts them via WebSocket
pub struct ConfigNotifier {
    /// WebSocket server for broadcasting
    ws_server: Addr<WsServer>,
}

impl ConfigNotifier {
    /// Create a new configuration notifier
    pub fn new(ws_server: Addr<WsServer>) -> Self {
        Self { ws_server }
    }
    
    /// Start processing configuration change events
    ///
    /// This method runs in a loop, receiving events from the file watcher
    /// and broadcasting them to connected WebSocket clients.
    ///
    /// # Arguments
    /// * `event_rx` - Receiver for configuration change events
    pub async fn process_events(
        self: Arc<Self>,
        mut event_rx: mpsc::UnboundedReceiver<ConfigChangeEvent>,
    ) {
        info!("Configuration notifier started");
        
        while let Some(event) = event_rx.recv().await {
            self.handle_change_event(event).await;
        }
        
        info!("Configuration notifier stopped");
    }
    
    /// Handle a configuration change event
    async fn handle_change_event(&self, event: ConfigChangeEvent) {
        // Only broadcast events for tenant-specific configurations
        let Some(tenant_id) = event.tenant_id else {
            debug!(
                "Skipping broadcast for non-tenant configuration: {}",
                event.path.display()
            );
            return;
        };
        
        // Determine change type string
        let change_type = match event.kind {
            ConfigChangeKind::Created => "created",
            ConfigChangeKind::Modified => "modified",
            ConfigChangeKind::Deleted => "deleted",
        };
        
        debug!(
            "Broadcasting configuration change to tenant {}: {} ({})",
            tenant_id,
            change_type,
            event.path.display()
        );
        
        // Create WebSocket message
        let message = WsMessage::ConfigChanged {
            tenant_id: tenant_id.clone(),
            change_type: change_type.to_string(),
        };
        
        // Broadcast to all clients of this tenant
        let broadcast = BroadcastToTenant {
            tenant_id: tenant_id.clone(),
            message,
        };
        
        if let Err(e) = self.ws_server.try_send(broadcast) {
            error!(
                "Failed to broadcast configuration change for tenant {}: {}",
                tenant_id, e
            );
        } else {
            info!(
                "Configuration change broadcast sent for tenant: {} ({})",
                tenant_id, change_type
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::websocket::server::WsServer;
    use std::path::PathBuf;
    
    #[actix_rt::test]
    async fn test_config_notifier_creation() {
        let ws_server = WsServer::new().start();
        let notifier = ConfigNotifier::new(ws_server);
        
        // Notifier should be created successfully
        assert!(std::mem::size_of_val(&notifier) > 0);
    }
    
    #[actix_rt::test]
    async fn test_handle_change_event_with_tenant() {
        let ws_server = WsServer::new().start();
        let notifier = ConfigNotifier::new(ws_server);
        
        let event = ConfigChangeEvent {
            path: PathBuf::from("/configs/private/test-tenant.json"),
            kind: ConfigChangeKind::Modified,
            tenant_id: Some("test-tenant".to_string()),
        };
        
        // Should not panic
        notifier.handle_change_event(event).await;
    }
    
    #[actix_rt::test]
    async fn test_handle_change_event_without_tenant() {
        let ws_server = WsServer::new().start();
        let notifier = ConfigNotifier::new(ws_server);
        
        let event = ConfigChangeEvent {
            path: PathBuf::from("/configs/schema.json"),
            kind: ConfigChangeKind::Modified,
            tenant_id: None,
        };
        
        // Should not panic and should skip broadcast
        notifier.handle_change_event(event).await;
    }
}
