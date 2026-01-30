/**
 * External Platform Connectors
 * 
 * This module provides connectors for external platforms:
 * - WooCommerce (e-commerce)
 * - QuickBooks Online (accounting)
 * - Supabase (data warehouse)
 * - Stripe (payments via Connect)
 * - Square (payments)
 * - Clover (payments)
 */

pub mod common;
pub mod woocommerce;
pub mod quickbooks;
pub mod supabase;
pub mod google_drive;
pub mod stripe;
pub mod square;
pub mod clover;

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::models::errors::ApiError;

// Re-export common types used by connectors

/// Generic connector trait for external platforms
#[async_trait]
pub trait PlatformConnector: Send + Sync {
    /// Test the connection to the platform
    async fn test_connection(&self) -> Result<bool, ApiError>;
    
    /// Get the platform name
    fn platform_name(&self) -> &str;
    
    /// Get connection status
    async fn get_status(&self) -> Result<ConnectionStatus, ApiError>;
}

/// Connection status for a platform
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionStatus {
    pub platform: String,
    pub is_connected: bool,
    pub last_check: String,
    pub error_message: Option<String>,
}
