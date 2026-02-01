// WebSocket server for managing client connections and broadcasting messages
// Handles connection lifecycle and message routing with tenant isolation

use std::collections::HashMap;
use std::sync::{Arc, RwLock};

use actix::prelude::*;
use serde::{Deserialize, Serialize};
use tracing::{debug, info, warn};

/// WebSocket message types
#[derive(Debug, Clone, Serialize, Deserialize, Message)]
#[rtype(result = "()")]
pub enum WsMessage {
    /// Configuration changed for a tenant
    ConfigChanged {
        tenant_id: String,
        change_type: String,
    },
    
    /// Ping message for keepalive
    Ping,
    
    /// Pong response to ping
    Pong,
}

/// Client information
#[derive(Debug, Clone)]
pub struct ClientInfo {
    /// Client's tenant ID
    pub tenant_id: String,
    
    /// Client's actor address
    pub addr: Recipient<WsMessage>,
}

/// Message to connect a new client
#[derive(Message)]
#[rtype(result = "()")]
pub struct Connect {
    pub tenant_id: String,
    pub addr: Recipient<WsMessage>,
}

/// Message to disconnect a client
#[derive(Message)]
#[rtype(result = "()")]
pub struct Disconnect {
    pub id: usize,
}

/// Message to broadcast to all clients of a tenant
#[derive(Message)]
#[rtype(result = "()")]
pub struct BroadcastToTenant {
    pub tenant_id: String,
    pub message: WsMessage,
}

/// WebSocket server actor
/// Manages all connected clients and handles message broadcasting
pub struct WsServer {
    /// Connected clients: client_id -> ClientInfo
    clients: HashMap<usize, ClientInfo>,
    
    /// Next client ID
    next_id: usize,
}

impl WsServer {
    pub fn new() -> Self {
        Self {
            clients: HashMap::new(),
            next_id: 1,
        }
    }
    
    /// Send message to all clients of a specific tenant
    fn broadcast_to_tenant(&self, tenant_id: &str, message: &WsMessage) {
        let mut sent_count = 0;
        let mut error_count = 0;
        
        for (client_id, client) in &self.clients {
            if client.tenant_id == tenant_id {
                match client.addr.try_send(message.clone()) {
                    Ok(_) => {
                        sent_count += 1;
                        debug!("Sent message to client {} (tenant: {})", client_id, tenant_id);
                    }
                    Err(e) => {
                        error_count += 1;
                        warn!(
                            "Failed to send message to client {} (tenant: {}): {}",
                            client_id, tenant_id, e
                        );
                    }
                }
            }
        }
        
        if sent_count > 0 {
            info!(
                "Broadcast to tenant {}: {} clients notified, {} errors",
                tenant_id, sent_count, error_count
            );
        }
    }
}

impl Default for WsServer {
    fn default() -> Self {
        Self::new()
    }
}

impl Actor for WsServer {
    type Context = Context<Self>;
    
    fn started(&mut self, _ctx: &mut Self::Context) {
        info!("WebSocket server started");
    }
    
    fn stopped(&mut self, _ctx: &mut Self::Context) {
        info!("WebSocket server stopped");
    }
}

/// Handle client connection
impl Handler<Connect> for WsServer {
    type Result = ();
    
    fn handle(&mut self, msg: Connect, _ctx: &mut Self::Context) {
        let client_id = self.next_id;
        self.next_id += 1;
        
        let client_info = ClientInfo {
            tenant_id: msg.tenant_id.clone(),
            addr: msg.addr,
        };
        
        self.clients.insert(client_id, client_info);
        
        info!(
            "Client {} connected (tenant: {}). Total clients: {}",
            client_id,
            msg.tenant_id,
            self.clients.len()
        );
    }
}

/// Handle client disconnection
impl Handler<Disconnect> for WsServer {
    type Result = ();
    
    fn handle(&mut self, msg: Disconnect, _ctx: &mut Self::Context) {
        if let Some(client) = self.clients.remove(&msg.id) {
            info!(
                "Client {} disconnected (tenant: {}). Total clients: {}",
                msg.id,
                client.tenant_id,
                self.clients.len()
            );
        } else {
            warn!("Attempted to disconnect unknown client: {}", msg.id);
        }
    }
}

/// Handle broadcast to tenant
impl Handler<BroadcastToTenant> for WsServer {
    type Result = ();
    
    fn handle(&mut self, msg: BroadcastToTenant, _ctx: &mut Self::Context) {
        debug!(
            "Broadcasting message to tenant: {} (type: {:?})",
            msg.tenant_id, msg.message
        );
        self.broadcast_to_tenant(&msg.tenant_id, &msg.message);
    }
}

/// Shared WebSocket server instance
pub type SharedWsServer = Arc<RwLock<Addr<WsServer>>>;

#[cfg(test)]
mod tests {
    use super::*;
    use actix::Actor;
    
    #[actix_rt::test]
    async fn test_ws_server_creation() {
        let server = WsServer::new();
        assert_eq!(server.clients.len(), 0);
        assert_eq!(server.next_id, 1);
    }
    
    #[actix_rt::test]
    async fn test_ws_server_actor_lifecycle() {
        let server = WsServer::new().start();
        
        // Server should be running
        assert!(server.connected());
        
        // Stop the server
        server.do_send(actix::dev::Stop);
        
        // Give it time to stop
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
    }
}
