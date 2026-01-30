/**
 * Clover Connector
 * 
 * Provides connectivity to Clover via OAuth authentication.
 * 
 * Requirements: 3.2, 3.7, 6.6
 */

pub mod client;
pub mod oauth;

pub use client::CloverClient;
pub use oauth::{CloverOAuth, CloverTokens};
