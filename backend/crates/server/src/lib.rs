// Library exports for EasySale API
// This allows integration tests to access internal modules
#![allow(unused_imports)]

pub mod auth;
pub mod config;
pub mod connectors;
pub mod db;
pub mod flows;
pub mod handlers;
pub mod mappers;
pub mod middleware;
pub mod models;
pub mod security;
pub mod services;
pub mod test_utils;
pub mod test_constants;
pub mod validators;
pub mod websocket;

#[cfg(test)]
mod tests;

// Re-export commonly used types
pub use config::{ConfigLoader, TenantConfig, ConfigError};
pub use config::error::ConfigResult;

// Re-export auth types for tests
pub use auth::jwt::Claims;

// Re-export services for tests
pub use services::audit_logger::{AuditLogger, AuditLogEntry};
pub use services::attribute_validator::AttributeValidator;
pub use services::product_service::ProductService;
pub use services::search_service::SearchService;

// Re-export models for tests
pub use models::UserContext;
pub use models::user::get_permissions_for_role;
pub use models::product::{Product, CreateProductRequest, ProductSearchRequest};

// Re-export mappers for tests
pub use mappers::{MappingEngine, FieldMapping, MappingValidator, TransformationRegistry};
pub use mappers::schema::FieldMap;
pub use mappers::transformations::TransformationContext;

// Re-export core crate types for use throughout the server
pub use pos_core_domain::{
    DefaultPricingEngine, DiscountApplicator, TaxCalculator, TransactionFinalizer,
};
pub use pos_core_models::{
    Discount as CoreDiscount, DiscountType as CoreDiscountType, DomainError, DomainResult,
    LineItem as CoreLineItem, Payment, PricingEngine, TaxRate, Transaction, TransactionStatus,
};
pub use pos_core_storage::{DatabasePool, StorageError, StorageResult};
