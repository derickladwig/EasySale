// Middleware modules
pub mod pos_validation;
pub mod tenant;
pub mod audit_context;
pub mod context;
pub mod permissions;
pub mod profile_gate;

// Re-export middleware utilities
#[allow(unused_imports)]
pub use pos_validation::PosValidation;
#[allow(unused_imports)]
pub use tenant::{get_tenant_id, get_current_tenant_id};
pub use audit_context::AuditContext;
pub use profile_gate::ProfileGate;
