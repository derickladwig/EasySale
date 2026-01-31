// Middleware modules
pub mod pos_validation;
pub mod tenant;
pub mod audit_context;
pub mod context;
pub mod permissions;
pub mod profile_gate;
pub mod csrf;

// Re-export middleware utilities
#[allow(unused_imports)]
pub use pos_validation::PosValidation;
#[allow(unused_imports)]
pub use tenant::{get_tenant_id, get_current_tenant_id};
pub use audit_context::AuditContext;
pub use profile_gate::ProfileGate;
pub use csrf::{generate_csrf_token, create_csrf_cookie, clear_csrf_cookie};

// CSRF middleware and constants are available but optional
// The SameSite=Strict cookie already provides CSRF protection
// Use CsrfProtection middleware for additional defense-in-depth
#[allow(unused_imports)]
pub use csrf::{CsrfProtection, CSRF_COOKIE_NAME, CSRF_HEADER_NAME};
