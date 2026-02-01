// WebSocket session handler for individual client connections
// Manages the lifecycle of a single WebSocket connection

use std::time::{Duration, Instant};

use actix::prelude::*;
use actix_web_actors::ws;
use serde_json;
use tracing::{debug, error, info, warn};

use super::server::{Connect, Disconnect, WsMessage, WsServer};

/// How often heartbeat pings are sent
const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(5);

/// How long before lack of client response causes a timeout
const CLIENT_TIMEOUT: Duration = Duration::from_secs(10);

/// WebSocket session actor
/// Represents a single client connection
pub struct WsSession {
    /// Unique session ID
    pub id: usize,
    
    /// Tenant ID for this session
    pub tenant_id: String,
    
    /// Last heartbeat timestamp
    pub hb: Instant,
    
    /// WebSocket server address
    pub server: Addr<WsServer>,
}

impl WsSession {
    pub fn new(tenant_id: String, server: Addr<WsServer>) -> Self {
        Self {
            id: 0,
            tenant_id,
            hb: Instant::now(),
            server,
        }
    }
    
    /// Start heartbeat process for this connection
    fn start_heartbeat(&self, ctx: &mut ws::WebsocketContext<Self>) {
        ctx.run_interval(HEARTBEAT_INTERVAL, |act, ctx| {
            // Check client heartbeat
            if Instant::now().duration_since(act.hb) > CLIENT_TIMEOUT {
                warn!("WebSocket client {} heartbeat timeout, disconnecting", act.id);
                
                // Notify server of disconnect
                act.server.do_send(Disconnect { id: act.id });
                
                // Stop actor
                ctx.stop();
                
                return;
            }
            
            // Send ping
            ctx.ping(b"");
        });
    }
}

impl Actor for WsSession {
    type Context = ws::WebsocketContext<Self>;
    
    fn started(&mut self, ctx: &mut Self::Context) {
        // Start heartbeat
        self.start_heartbeat(ctx);
        
        // Register with server
        let addr = ctx.address();
        self.server
            .send(Connect {
                tenant_id: self.tenant_id.clone(),
                addr: addr.recipient(),
            })
            .into_actor(self)
            .then(|res, act, ctx| {
                match res {
                    Ok(_) => {
                        info!(
                            "WebSocket session started for tenant: {}",
                            act.tenant_id
                        );
                    }
                    Err(e) => {
                        error!("Failed to register with WebSocket server: {}", e);
                        ctx.stop();
                    }
                }
                fut::ready(())
            })
            .wait(ctx);
    }
    
    fn stopping(&mut self, _ctx: &mut Self::Context) -> Running {
        // Notify server of disconnect
        self.server.do_send(Disconnect { id: self.id });
        info!("WebSocket session stopping for tenant: {}", self.tenant_id);
        Running::Stop
    }
}

/// Handle messages from WebSocket server
impl Handler<WsMessage> for WsSession {
    type Result = ();
    
    fn handle(&mut self, msg: WsMessage, ctx: &mut Self::Context) {
        // Serialize message to JSON
        match serde_json::to_string(&msg) {
            Ok(json) => {
                debug!(
                    "Sending message to client {} (tenant: {}): {}",
                    self.id, self.tenant_id, json
                );
                ctx.text(json);
            }
            Err(e) => {
                error!("Failed to serialize WebSocket message: {}", e);
            }
        }
    }
}

/// Handle incoming WebSocket messages from client
impl StreamHandler<Result<ws::Message, ws::ProtocolError>> for WsSession {
    fn handle(&mut self, msg: Result<ws::Message, ws::ProtocolError>, ctx: &mut Self::Context) {
        match msg {
            Ok(ws::Message::Ping(msg)) => {
                self.hb = Instant::now();
                ctx.pong(&msg);
            }
            Ok(ws::Message::Pong(_)) => {
                self.hb = Instant::now();
            }
            Ok(ws::Message::Text(text)) => {
                debug!(
                    "Received text message from client {} (tenant: {}): {}",
                    self.id, self.tenant_id, text
                );
                
                // Parse incoming message
                match serde_json::from_str::<WsMessage>(&text) {
                    Ok(WsMessage::Ping) => {
                        // Respond to ping with pong
                        if let Ok(json) = serde_json::to_string(&WsMessage::Pong) {
                            ctx.text(json);
                        }
                    }
                    Ok(_) => {
                        // Other message types not expected from client
                        debug!("Received unexpected message type from client");
                    }
                    Err(e) => {
                        warn!("Failed to parse client message: {}", e);
                    }
                }
            }
            Ok(ws::Message::Binary(_)) => {
                warn!("Received unexpected binary message from client");
            }
            Ok(ws::Message::Close(reason)) => {
                info!(
                    "Client {} (tenant: {}) closed connection: {:?}",
                    self.id, self.tenant_id, reason
                );
                ctx.stop();
            }
            Ok(ws::Message::Continuation(_)) => {
                warn!("Received unexpected continuation frame");
            }
            Ok(ws::Message::Nop) => {}
            Err(e) => {
                error!("WebSocket protocol error: {}", e);
                ctx.stop();
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_ws_session_creation() {
        let server = WsServer::new().start();
        let session = WsSession::new("test-tenant".to_string(), server);
        
        assert_eq!(session.tenant_id, "test-tenant");
        assert_eq!(session.id, 0);
    }
    
    #[test]
    fn test_heartbeat_constants() {
        assert!(HEARTBEAT_INTERVAL < CLIENT_TIMEOUT);
        assert_eq!(HEARTBEAT_INTERVAL.as_secs(), 5);
        assert_eq!(CLIENT_TIMEOUT.as_secs(), 10);
    }
}
