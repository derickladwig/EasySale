/**
 * QuickBooks Online Connector
 * 
 * Implements QuickBooks Online API integration with OAuth 2.0
 * Minor version 75 required after August 1, 2025
 * CloudEvents webhook format required by May 15, 2026
 * 
 * Requirements: 11.1-11.6, 1.4, 1.5, 1.6
 */

pub mod oauth;
pub mod client;
pub mod customer;
pub mod item;
pub mod invoice;
pub mod sales_receipt;
pub mod payment;
pub mod refund;
pub mod vendor;
pub mod bill;
pub mod errors;
pub mod webhooks;
pub mod cloudevents;
pub mod transformers;

pub use oauth::QuickBooksOAuth;
pub use client::QuickBooksClient;
