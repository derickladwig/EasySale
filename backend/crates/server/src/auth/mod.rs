/// Authentication and authorization module
///
/// This module provides:
/// - JWT token generation and validation
/// - Password hashing and verification
/// - Middleware for protecting routes

pub mod jwt;
pub mod password;

pub use jwt::{generate_token, validate_token};
pub use password::{hash_password, verify_password};
