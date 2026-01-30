//! Document Cleanup Engine
//!
//! Provides automatic noise region detection and user-defined cleanup shields
//! for document OCR processing. Supports vendor-specific and template-specific
//! rule persistence with multi-tenant isolation.
//!
//! # Terminology
//! - **Cleanup Shield**: A region to be excluded from OCR processing (formerly "Mask")
//! - **Shield Type**: Classification of shield regions (Logo, Watermark, etc.)
//! - **Apply Mode**: How the shield is applied (Applied, Suggested, Disabled)
//!
//! # Architecture
//! - Fail-open: Detection failures never block OCR processing
//! - Zone-targeted: Shields can target specific document zones
//! - Resolution-independent: Normalized coordinates (0.0-1.0)
//! - Precedence-based: Session → Template → Vendor → Auto

pub mod config;
pub mod detectors;
pub mod engine;
pub mod outcome_tracking;
pub mod persistence;
pub mod precedence;
pub mod renderer;
pub mod types;

#[cfg(test)]
mod precedence_property_tests;

#[cfg(test)]
mod persistence_property_tests;

#[cfg(test)]
mod renderer_property_tests;

#[cfg(test)]
mod outcome_tracking_property_tests;

// Re-export main types
pub use config::CleanupEngineConfig;
pub use engine::CleanupEngine;
pub use types::{ApplyMode, CleanupShield, ShieldType};

// Re-export additional types for external use
#[allow(unused_imports)]
pub use types::{
    NormalizedBBox, PageTarget, RiskLevel, ShieldProvenance, ShieldSource, ZoneTarget,
};

// Re-export detection result
pub use engine::CleanupDetectionResult;

// Re-export errors
pub use engine::CleanupEngineError;

// Re-export outcome tracking
#[allow(unused_imports)]
pub use outcome_tracking::{
    CleanupReviewOutcome, OutcomeBuilder, OutcomeStatus, OutcomeTrackingError,
    ShieldEffectivenessRecord, UserSatisfaction, VendorThresholdAdjustments,
};

// Re-export multi-tenant key type
#[allow(unused_imports)]
pub use engine::TenantScopedKey;

// Re-export precedence types
#[allow(unused_imports)]
pub use precedence::{
    highest_precedence_source, merge_shields, overlaps_critical_zone, PrecedenceExplanation,
    PrecedenceResult, ZoneConflict,
};

// Re-export persistence types
#[allow(unused_imports)]
pub use persistence::{
    CleanupAuditEntry, CleanupPersistence, PersistenceError, ReviewCaseShields,
    TemplateCleanupRule, VendorCleanupRule,
};

// Re-export renderer types
#[allow(unused_imports)]
pub use renderer::{OverlayRenderer, RendererConfig, RendererError};
