/**
 * WooCommerce REST API v3 Connector
 * 
 * Implements WooCommerce REST API v3 integration
 * Legacy API removed in WooCommerce 9.0 (June 2024)
 * 
 * Requirements: 1.3, 12.1, 12.2, 12.4, 12.6
 */

pub mod client;
pub mod orders;
pub mod products;
pub mod customers;
pub mod webhooks;
pub mod transformers;

pub use client::WooCommerceClient;
