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

pub use checkout::{CreateCheckoutRequest, CheckoutSessionResponse};
pub use client::StripeClient;
pub use oauth::{StripeOAuth, StripeConnectTokens};
