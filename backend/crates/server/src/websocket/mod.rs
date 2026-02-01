// WebSocket module for real-time notifications
// Provides WebSocket server for configuration change notifications and other real-time updates

mod config_notifier;
mod session;
mod server;

pub use config_notifier::ConfigNotifier;
pub use session::WsSession;
pub use server::{WsServer, WsMessage, ClientInfo};
