// Configuration module for multi-tenant POS system
// Handles loading, caching, and validation of tenant configurations

pub mod app_config;
pub mod cors_config;
pub mod oauth_config;
pub mod loader;
pub mod models;
pub mod profile;
pub mod tenant;
pub mod schema;
pub mod error;
pub mod validator;

// Re-export commonly used types
pub use app_config::Config;
#[allow(unused_imports)]
pub use cors_config::{CorsConfig, CorsConfigError, build_cors_from_config};
#[allow(unused_imports)]
pub use oauth_config::{OAuthConfig, OAuthConfigError, validate_oauth_redirect_uri};
pub use loader::ConfigLoader;
pub use models::*;
pub use profile::{ProfileManager, RuntimeProfile};
pub use error::ConfigError;
