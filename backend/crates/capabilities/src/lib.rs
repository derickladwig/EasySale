//! Capabilities API
//!
//! This crate provides runtime capability detection for the `EasySale` backend.
//! It reports which features are available (export, sync) and the accounting mode.
//!
//! The frontend queries `/api/capabilities` on startup to adapt the UI based on
//! available backend features.

#![deny(unsafe_code)]
#![warn(clippy::pedantic, clippy::nursery, clippy::unwrap_used)]

pub mod types;
pub mod provider;
pub mod errors;

// Re-export commonly used types
pub use types::{Capabilities, AccountingMode, FeatureFlags};
pub use provider::{CapabilityProvider, DefaultCapabilityProvider};
pub use errors::{CapabilityError, CapabilityResult};
