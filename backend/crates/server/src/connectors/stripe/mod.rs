/**
 * Stripe Connector
 * 
 * Provides connectivity to Stripe via Connect OAuth.
 * Supports connected accounts for multi-tenant payment processing.
 * 
 * Requirements: 1.2, 1.7, 6.6
 */

pub mod checkout;
pub mod client;
pub mod oauth;

// Re-export types for external use - some may not be used yet but are part of the public API
#[allow(unused_imports)]
pub use checkout::{CreateCheckoutRequest, CheckoutSessionResponse};
pub use client::StripeClient;
#[allow(unused_imports)]
pub use oauth::{StripeOAuth, StripeConnectTokens};
