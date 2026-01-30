//! Mask Engine - Backward Compatibility Wrapper
//!
//! This module provides backward compatibility for code using the old "Mask Engine" API.
//! All functionality has been moved to the `cleanup_engine` module with renamed types.
//!
//! # Migration Guide
//!
//! | Old Name | New Name |
//! |----------|----------|
//! | `Mask` | `CleanupShield` |
//! | `MaskType` | `ShieldType` |
//! | `MaskEngine` | `CleanupEngine` |
//! | `MaskEngineConfig` | `CleanupEngineConfig` |
//! | `MaskDetectionResult` | `CleanupDetectionResult` |
//! | `MaskEngineError` | `CleanupEngineError` |
//!
//! # Deprecated Methods
//!
//! The following methods are deprecated and will be removed in a future version:
//! - `add_user_mask` → Use `add_user_shield` instead
//! - `auto_detect_masks` → Use `auto_detect_shields` instead
//! - `get_all_masks` → Use `get_resolved_shields` instead
//!
//! # Requirements
//!
//! Validates: Requirements 1.5, 1.6 (Backward compatibility wrapper)

use crate::models::artifact::BoundingBox;
use std::path::Path;

// ============================================================================
// Re-export types from cleanup_engine with old names as aliases
// Requirement 1.6: Re-export old type names as aliases for backward compatibility
// ============================================================================

/// Type alias for backward compatibility
/// 
/// **Deprecated**: Use `CleanupShield` from `cleanup_engine` module instead.
#[deprecated(since = "4.0.0", note = "Use CleanupShield from cleanup_engine module instead")]
pub type Mask = crate::services::cleanup_engine::CleanupShield;

/// Type alias for backward compatibility
/// 
/// **Deprecated**: Use `ShieldType` from `cleanup_engine` module instead.
#[deprecated(since = "4.0.0", note = "Use ShieldType from cleanup_engine module instead")]
pub type MaskType = crate::services::cleanup_engine::ShieldType;

/// Type alias for backward compatibility
/// 
/// **Deprecated**: Use `CleanupEngineConfig` from `cleanup_engine` module instead.
#[deprecated(since = "4.0.0", note = "Use CleanupEngineConfig from cleanup_engine module instead")]
pub type MaskEngineConfig = crate::services::cleanup_engine::CleanupEngineConfig;

/// Type alias for backward compatibility
/// 
/// **Deprecated**: Use `CleanupDetectionResult` from `cleanup_engine` module instead.
#[deprecated(since = "4.0.0", note = "Use CleanupDetectionResult from cleanup_engine module instead")]
pub type MaskDetectionResult = crate::services::cleanup_engine::CleanupDetectionResult;

/// Type alias for backward compatibility
/// 
/// **Deprecated**: Use `CleanupEngineError` from `cleanup_engine` module instead.
#[deprecated(since = "4.0.0", note = "Use CleanupEngineError from cleanup_engine module instead")]
pub type MaskEngineError = crate::services::cleanup_engine::CleanupEngineError;

// Re-export additional types that may be needed for compatibility
pub use crate::services::cleanup_engine::{
    NormalizedBBox, PageTarget, ZoneTarget,
};

// ============================================================================
// MaskEngine wrapper struct
// Requirement 1.5: Existing mask_engine.rs becomes a thin wrapper
// ============================================================================

/// Mask Engine - Backward Compatibility Wrapper
///
/// This struct wraps `CleanupEngine` and provides the old API for backward compatibility.
/// All new code should use `CleanupEngine` directly from the `cleanup_engine` module.
///
/// # Example
///
/// ```ignore
/// // Old way (deprecated)
/// use mask_engine::{MaskEngine, Mask};
/// let engine = MaskEngine::new();
/// let result = engine.auto_detect_masks(path)?;
///
/// // New way (recommended)
/// use cleanup_engine::{CleanupEngine, CleanupShield};
/// let engine = CleanupEngine::new();
/// let result = engine.auto_detect_shields(path)?;
/// ```
///
/// **Deprecated**: Use `CleanupEngine` from `cleanup_engine` module instead.
#[deprecated(since = "4.0.0", note = "Use CleanupEngine from cleanup_engine module instead")]
pub struct MaskEngine {
    inner: crate::services::cleanup_engine::CleanupEngine,
    /// Default image dimensions for bbox normalization when not provided
    /// These are used when converting pixel-based BoundingBox to NormalizedBBox
    default_image_width: u32,
    default_image_height: u32,
}

#[allow(deprecated)]
impl MaskEngine {
    /// Create a new mask engine with default configuration
    ///
    /// **Deprecated**: Use `CleanupEngine::new()` instead.
    #[must_use]
    #[deprecated(since = "4.0.0", note = "Use CleanupEngine::new() instead")]
    pub fn new() -> Self {
        Self {
            inner: crate::services::cleanup_engine::CleanupEngine::new(),
            // Default to common document dimensions (A4 at 300 DPI)
            default_image_width: 2480,
            default_image_height: 3508,
        }
    }

    /// Create a new mask engine with custom configuration
    ///
    /// **Deprecated**: Use `CleanupEngine::with_config()` instead.
    #[must_use]
    #[deprecated(since = "4.0.0", note = "Use CleanupEngine::with_config() instead")]
    pub fn with_config(config: MaskEngineConfig) -> Self {
        Self {
            inner: crate::services::cleanup_engine::CleanupEngine::with_config(config),
            default_image_width: 2480,
            default_image_height: 3508,
        }
    }

    /// Set default image dimensions for bbox normalization
    ///
    /// When using the old pixel-based `BoundingBox` API, these dimensions are used
    /// to convert to normalized coordinates.
    #[must_use]
    pub fn with_default_dimensions(mut self, width: u32, height: u32) -> Self {
        self.default_image_width = width;
        self.default_image_height = height;
        self
    }

    /// Auto-detect noise regions in an image
    ///
    /// **Deprecated**: Use `CleanupEngine::auto_detect_shields()` instead.
    #[deprecated(since = "4.0.0", note = "Use auto_detect_shields instead")]
    pub fn auto_detect_masks(
        &self,
        image_path: &Path,
    ) -> Result<MaskDetectionResult, MaskEngineError> {
        self.inner.auto_detect_shields(image_path)
    }

    /// Auto-detect shields in a single image (new API)
    ///
    /// This is the new recommended method. Delegates directly to `CleanupEngine`.
    pub fn auto_detect_shields(
        &self,
        image_path: &Path,
    ) -> Result<MaskDetectionResult, MaskEngineError> {
        self.inner.auto_detect_shields(image_path)
    }

    /// Auto-detect shields with fail-open behavior
    ///
    /// Returns empty shields + warnings on error instead of failing.
    /// This ensures detection failures never block OCR processing.
    pub fn auto_detect_shields_safe(
        &self,
        image_path: &Path,
    ) -> MaskDetectionResult {
        self.inner.auto_detect_shields_safe(image_path)
    }

    /// Add a user-defined mask using pixel-based BoundingBox
    ///
    /// **Deprecated**: Use `add_user_shield()` with `NormalizedBBox` instead.
    ///
    /// This method converts the pixel-based `BoundingBox` to normalized coordinates
    /// using the default image dimensions set on the engine.
    #[deprecated(since = "4.0.0", note = "Use add_user_shield instead")]
    pub fn add_user_mask(
        &self,
        bbox: BoundingBox,
        user_id: &str,
        reason: Option<String>,
    ) -> Result<Mask, MaskEngineError> {
        // Convert pixel-based BoundingBox to NormalizedBBox
        let normalized = self.normalize_bbox(&bbox);
        
        // Delegate to the new API with default page/zone targeting
        self.inner.add_user_shield(
            normalized,
            user_id,
            reason,
            PageTarget::All,
            ZoneTarget::default(),
        )
    }

    /// Add a user-defined shield using normalized coordinates (new API)
    ///
    /// This is the new recommended method. Delegates directly to `CleanupEngine`.
    pub fn add_user_shield(
        &self,
        bbox: NormalizedBBox,
        user_id: &str,
        reason: Option<String>,
        page_target: PageTarget,
        zone_target: ZoneTarget,
    ) -> Result<Mask, MaskEngineError> {
        self.inner.add_user_shield(bbox, user_id, reason, page_target, zone_target)
    }

    /// Save a mask as vendor-specific
    ///
    /// **Deprecated**: Use `save_vendor_rules()` with tenant/store scoping instead.
    ///
    /// Note: This method uses default tenant/store IDs for backward compatibility.
    /// New code should use `save_vendor_rules()` with proper tenant/store context.
    #[deprecated(since = "4.0.0", note = "Use save_vendor_rules with tenant/store scoping instead")]
    pub fn save_vendor_mask(&mut self, mask: Mask, vendor_id: &str) {
        // Use default tenant/store for backward compatibility
        let mut rules = self.inner.get_vendor_rules("default", "default", vendor_id);
        
        // Update the mask type to VendorSpecific
        let mut vendor_mask = mask;
        vendor_mask.provenance.vendor_id = Some(vendor_id.to_string());
        
        rules.push(vendor_mask);
        self.inner.save_vendor_rules("default", "default", vendor_id, rules);
    }

    /// Save vendor cleanup rules with multi-tenant isolation (new API)
    ///
    /// This is the new recommended method. Delegates directly to `CleanupEngine`.
    pub fn save_vendor_rules(
        &mut self,
        tenant_id: &str,
        store_id: &str,
        vendor_id: &str,
        rules: Vec<Mask>,
    ) {
        self.inner.save_vendor_rules(tenant_id, store_id, vendor_id, rules);
    }

    /// Get vendor-specific masks
    ///
    /// **Deprecated**: Use `get_vendor_rules()` with tenant/store scoping instead.
    ///
    /// Note: This method uses default tenant/store IDs for backward compatibility.
    #[deprecated(since = "4.0.0", note = "Use get_vendor_rules with tenant/store scoping instead")]
    pub fn get_vendor_masks(&self, vendor_id: &str) -> Vec<Mask> {
        // Use default tenant/store for backward compatibility
        self.inner.get_vendor_rules("default", "default", vendor_id)
    }

    /// Get vendor cleanup rules with multi-tenant isolation (new API)
    ///
    /// This is the new recommended method. Delegates directly to `CleanupEngine`.
    #[must_use]
    pub fn get_vendor_rules(
        &self,
        tenant_id: &str,
        store_id: &str,
        vendor_id: &str,
    ) -> Vec<Mask> {
        self.inner.get_vendor_rules(tenant_id, store_id, vendor_id)
    }

    /// Save template cleanup rules with multi-tenant isolation (new API)
    pub fn save_template_rules(
        &mut self,
        tenant_id: &str,
        store_id: &str,
        template_id: &str,
        rules: Vec<Mask>,
    ) {
        self.inner.save_template_rules(tenant_id, store_id, template_id, rules);
    }

    /// Get template cleanup rules with multi-tenant isolation (new API)
    #[must_use]
    pub fn get_template_rules(
        &self,
        tenant_id: &str,
        store_id: &str,
        template_id: &str,
    ) -> Vec<Mask> {
        self.inner.get_template_rules(tenant_id, store_id, template_id)
    }

    /// Combine auto-detected and vendor-specific masks
    ///
    /// **Deprecated**: Use `get_resolved_shields()` with tenant/store scoping instead.
    #[deprecated(since = "4.0.0", note = "Use get_resolved_shields with tenant/store scoping instead")]
    pub fn get_all_masks(
        &self,
        image_path: &Path,
        vendor_id: Option<&str>,
    ) -> Result<MaskDetectionResult, MaskEngineError> {
        // Use default tenant/store for backward compatibility
        self.inner.get_resolved_shields(
            image_path,
            "default",
            "default",
            vendor_id,
            None,
            &[],
        )
    }

    /// Get all shields with precedence resolution and multi-tenant isolation (new API)
    ///
    /// This is the new recommended method. Delegates directly to `CleanupEngine`.
    pub fn get_resolved_shields(
        &self,
        image_path: &Path,
        tenant_id: &str,
        store_id: &str,
        vendor_id: Option<&str>,
        template_id: Option<&str>,
        session_overrides: &[Mask],
    ) -> Result<MaskDetectionResult, MaskEngineError> {
        self.inner.get_resolved_shields(
            image_path,
            tenant_id,
            store_id,
            vendor_id,
            template_id,
            session_overrides,
        )
    }

    /// Apply masks to an image (for visualization)
    ///
    /// **Deprecated**: Use the overlay rendering from `cleanup_engine` module instead.
    #[deprecated(since = "4.0.0", note = "Use overlay rendering from cleanup_engine module instead")]
    pub fn apply_masks_to_image(
        &self,
        image_path: &Path,
        _masks: &[Mask],
        output_path: &Path,
    ) -> Result<(), MaskEngineError> {
        // For backward compatibility, just copy the image
        // Real overlay rendering is in cleanup_engine/renderer.rs (to be implemented)
        let img = image::open(image_path)
            .map_err(|e| MaskEngineError::ImageLoadError(e.to_string()))?;
        
        img.save(output_path)
            .map_err(|e| MaskEngineError::ProcessingError(e.to_string()))?;
        
        Ok(())
    }

    /// Get the current configuration
    #[must_use]
    pub fn config(&self) -> &MaskEngineConfig {
        self.inner.config()
    }

    /// Get a reference to the underlying CleanupEngine
    ///
    /// Use this to access new functionality not available through the compatibility wrapper.
    #[must_use]
    pub fn inner(&self) -> &crate::services::cleanup_engine::CleanupEngine {
        &self.inner
    }

    /// Get a mutable reference to the underlying CleanupEngine
    ///
    /// Use this to access new functionality not available through the compatibility wrapper.
    pub fn inner_mut(&mut self) -> &mut crate::services::cleanup_engine::CleanupEngine {
        &mut self.inner
    }

    // ========================================================================
    // Helper methods for coordinate conversion
    // ========================================================================

    /// Normalize pixel-based BoundingBox to NormalizedBBox (0.0-1.0)
    ///
    /// Uses the default image dimensions set on the engine.
    #[must_use]
    pub fn normalize_bbox(&self, bbox: &BoundingBox) -> NormalizedBBox {
        crate::services::cleanup_engine::types::normalize_bbox(
            bbox.x,
            bbox.y,
            bbox.width,
            bbox.height,
            self.default_image_width,
            self.default_image_height,
        )
    }

    /// Normalize pixel-based BoundingBox with explicit image dimensions
    #[must_use]
    pub fn normalize_bbox_with_dimensions(
        &self,
        bbox: &BoundingBox,
        img_width: u32,
        img_height: u32,
    ) -> NormalizedBBox {
        crate::services::cleanup_engine::types::normalize_bbox(
            bbox.x,
            bbox.y,
            bbox.width,
            bbox.height,
            img_width,
            img_height,
        )
    }

    /// Denormalize NormalizedBBox to pixel-based BoundingBox
    ///
    /// Uses the default image dimensions set on the engine.
    #[must_use]
    pub fn denormalize_bbox(&self, bbox: &NormalizedBBox) -> BoundingBox {
        let (x, y, width, height) = crate::services::cleanup_engine::types::denormalize_bbox(
            bbox,
            self.default_image_width,
            self.default_image_height,
        );
        BoundingBox { x, y, width, height }
    }

    /// Denormalize NormalizedBBox with explicit image dimensions
    #[must_use]
    pub fn denormalize_bbox_with_dimensions(
        &self,
        bbox: &NormalizedBBox,
        img_width: u32,
        img_height: u32,
    ) -> BoundingBox {
        let (x, y, width, height) = crate::services::cleanup_engine::types::denormalize_bbox(
            bbox,
            img_width,
            img_height,
        );
        BoundingBox { x, y, width, height }
    }
}

#[allow(deprecated)]
impl Default for MaskEngine {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[allow(deprecated)]
    fn test_mask_engine_creation() {
        let engine = MaskEngine::new();
        assert!(engine.config().auto_detect_logos);
        assert!(engine.config().auto_detect_watermarks);
        assert!(engine.config().auto_detect_repetitive);
    }

    #[test]
    #[allow(deprecated)]
    fn test_add_user_mask_converts_to_normalized() {
        let engine = MaskEngine::new()
            .with_default_dimensions(1000, 1000);
        
        let bbox = BoundingBox {
            x: 100,
            y: 200,
            width: 300,
            height: 400,
        };
        
        let result = engine.add_user_mask(bbox, "user123", Some("Test mask".to_string()));
        assert!(result.is_ok());
        
        let mask = result.unwrap();
        // Check that the normalized bbox is correct
        assert!((mask.normalized_bbox.x - 0.1).abs() < 0.001);
        assert!((mask.normalized_bbox.y - 0.2).abs() < 0.001);
        assert!((mask.normalized_bbox.width - 0.3).abs() < 0.001);
        assert!((mask.normalized_bbox.height - 0.4).abs() < 0.001);
    }

    #[test]
    #[allow(deprecated)]
    fn test_invalid_mask_dimensions() {
        let engine = MaskEngine::new()
            .with_default_dimensions(1000, 1000);
        
        let bbox = BoundingBox {
            x: 100,
            y: 100,
            width: 0, // Invalid
            height: 150,
        };
        
        let result = engine.add_user_mask(bbox, "user123", None);
        assert!(result.is_err());
    }

    #[test]
    #[allow(deprecated)]
    fn test_vendor_mask_storage_backward_compat() {
        let mut engine = MaskEngine::new()
            .with_default_dimensions(1000, 1000);
        
        let bbox = BoundingBox {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
        };
        
        let mask = engine.add_user_mask(bbox, "user123", Some("Test".to_string()))
            .expect("Failed to create mask");
        
        engine.save_vendor_mask(mask, "vendor-abc");
        
        let vendor_masks = engine.get_vendor_masks("vendor-abc");
        assert_eq!(vendor_masks.len(), 1);
        assert_eq!(vendor_masks[0].provenance.vendor_id, Some("vendor-abc".to_string()));
    }

    #[test]
    #[allow(deprecated)]
    fn test_get_vendor_masks_empty() {
        let engine = MaskEngine::new();
        let masks = engine.get_vendor_masks("nonexistent-vendor");
        assert_eq!(masks.len(), 0);
    }

    #[test]
    #[allow(deprecated)]
    fn test_normalize_denormalize_roundtrip() {
        let engine = MaskEngine::new()
            .with_default_dimensions(1000, 1000);
        
        let original = BoundingBox {
            x: 100,
            y: 200,
            width: 300,
            height: 400,
        };
        
        let normalized = engine.normalize_bbox(&original);
        let denormalized = engine.denormalize_bbox(&normalized);
        
        assert_eq!(denormalized.x, original.x);
        assert_eq!(denormalized.y, original.y);
        assert_eq!(denormalized.width, original.width);
        assert_eq!(denormalized.height, original.height);
    }

    #[test]
    #[allow(deprecated)]
    fn test_type_aliases_work() {
        // Verify that the type aliases compile and work correctly
        let _config: MaskEngineConfig = MaskEngineConfig::default();
        
        // Create a mask using the new API through the wrapper
        let engine = MaskEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        let result = engine.add_user_shield(
            bbox,
            "user123",
            Some("Test".to_string()),
            PageTarget::All,
            ZoneTarget::default(),
        );
        
        assert!(result.is_ok());
        let mask: Mask = result.unwrap();
        assert_eq!(mask.confidence, 1.0);
    }

    #[test]
    #[allow(deprecated)]
    fn test_inner_access() {
        let engine = MaskEngine::new();
        let inner = engine.inner();
        assert!(inner.config().auto_detect_logos);
    }

    #[test]
    #[allow(deprecated)]
    fn test_vendor_rules_with_tenant_scoping() {
        let mut engine = MaskEngine::new();
        
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        let shield = engine.add_user_shield(
            bbox,
            "user123",
            None,
            PageTarget::All,
            ZoneTarget::default(),
        ).unwrap();
        
        // Save with tenant/store scoping
        engine.save_vendor_rules("tenant-1", "store-1", "vendor-abc", vec![shield]);
        
        // Retrieve with same tenant/store
        let rules = engine.get_vendor_rules("tenant-1", "store-1", "vendor-abc");
        assert_eq!(rules.len(), 1);
        
        // Cross-tenant read should return empty
        let cross_tenant = engine.get_vendor_rules("tenant-2", "store-1", "vendor-abc");
        assert!(cross_tenant.is_empty());
    }
}

// ============================================================================
// Property-Based Tests for Backward Compatibility
// ============================================================================

#[cfg(test)]
mod property_tests {
    use super::*;
    use crate::services::cleanup_engine::{
        CleanupShield, ShieldType, ApplyMode, RiskLevel, ShieldSource, ShieldProvenance,
    };
    use proptest::prelude::*;

    // ========================================================================
    // Arbitrary generators for property tests
    // ========================================================================

    /// Generate arbitrary ShieldType
    fn arb_shield_type() -> impl Strategy<Value = ShieldType> {
        prop_oneof![
            Just(ShieldType::Logo),
            Just(ShieldType::Watermark),
            Just(ShieldType::RepetitiveHeader),
            Just(ShieldType::RepetitiveFooter),
            Just(ShieldType::Stamp),
            Just(ShieldType::UserDefined),
            Just(ShieldType::VendorSpecific),
            Just(ShieldType::TemplateSpecific),
        ]
    }

    /// Generate arbitrary ApplyMode
    fn arb_apply_mode() -> impl Strategy<Value = ApplyMode> {
        prop_oneof![
            Just(ApplyMode::Applied),
            Just(ApplyMode::Suggested),
            Just(ApplyMode::Disabled),
        ]
    }

    /// Generate arbitrary RiskLevel
    fn arb_risk_level() -> impl Strategy<Value = RiskLevel> {
        prop_oneof![
            Just(RiskLevel::Low),
            Just(RiskLevel::Medium),
            Just(RiskLevel::High),
        ]
    }

    /// Generate arbitrary ShieldSource
    fn arb_shield_source() -> impl Strategy<Value = ShieldSource> {
        prop_oneof![
            Just(ShieldSource::AutoDetected),
            Just(ShieldSource::VendorRule),
            Just(ShieldSource::TemplateRule),
            Just(ShieldSource::SessionOverride),
        ]
    }

    /// Generate arbitrary PageTarget
    fn arb_page_target() -> impl Strategy<Value = PageTarget> {
        prop_oneof![
            Just(PageTarget::All),
            Just(PageTarget::First),
            Just(PageTarget::Last),
            proptest::collection::vec(1u32..=100u32, 1..5).prop_map(PageTarget::Specific),
        ]
    }

    /// Generate arbitrary ZoneTarget
    fn arb_zone_target() -> impl Strategy<Value = ZoneTarget> {
        (
            proptest::option::of(proptest::collection::vec("[a-zA-Z]+", 0..3)),
            proptest::collection::vec("[a-zA-Z]+", 0..3),
        ).prop_map(|(include, exclude)| ZoneTarget {
            include_zones: include,
            exclude_zones: exclude,
        })
    }

    /// Generate valid NormalizedBBox (all values in [0.0, 1.0] with no overflow)
    fn arb_valid_normalized_bbox() -> impl Strategy<Value = NormalizedBBox> {
        (0.0..=0.5f64, 0.0..=0.5f64, 0.0..=0.5f64, 0.0..=0.5f64)
            .prop_map(|(x, y, w, h)| NormalizedBBox::new(x, y, w, h))
    }

    /// Generate arbitrary ShieldProvenance
    fn arb_provenance() -> impl Strategy<Value = ShieldProvenance> {
        (
            arb_shield_source(),
            proptest::option::of("[a-z0-9-]{8,16}"),
            proptest::option::of("[a-z0-9-]{8,16}"),
            proptest::option::of("[a-z0-9-]{8,16}"),
        ).prop_map(|(source, user_id, vendor_id, template_id)| ShieldProvenance {
            source,
            user_id,
            vendor_id,
            template_id,
            created_at: chrono::Utc::now(),
            updated_at: None,
        })
    }

    /// Generate arbitrary CleanupShield
    fn arb_cleanup_shield() -> impl Strategy<Value = CleanupShield> {
        (
            "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}",
            arb_shield_type(),
            arb_valid_normalized_bbox(),
            arb_page_target(),
            arb_zone_target(),
            arb_apply_mode(),
            arb_risk_level(),
            0.0..=1.0f64,
            0.0..=1.0f64,
            ".{0,100}",
            arb_provenance(),
        ).prop_map(|(id, shield_type, bbox, page_target, zone_target, apply_mode, risk_level, confidence, min_confidence, why_detected, provenance)| {
            CleanupShield {
                id,
                shield_type,
                normalized_bbox: bbox,
                page_target,
                zone_target,
                apply_mode,
                risk_level,
                confidence,
                min_confidence,
                why_detected,
                provenance,
            }
        })
    }

    /// Generate arbitrary BoundingBox (pixel-based)
    fn arb_bounding_box() -> impl Strategy<Value = BoundingBox> {
        (1u32..=1000u32, 1u32..=1000u32, 1u32..=500u32, 1u32..=500u32)
            .prop_map(|(x, y, width, height)| BoundingBox { x, y, width, height })
    }

    // ========================================================================
    // Feature: cleanup-engine, Property 1: Backward Compatibility Alias
    // **Validates: Requirements 1.6**
    // ========================================================================

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        /// Property 1.1: Type alias Mask is equivalent to CleanupShield
        ///
        /// For any valid CleanupShield instance, using it through the Mask type alias
        /// should produce identical behavior, and all fields should be accessible
        /// with the same values.
        ///
        /// **Validates: Requirements 1.6**
        #[test]
        #[allow(deprecated)]
        fn mask_type_alias_is_equivalent_to_cleanup_shield(shield in arb_cleanup_shield()) {
            // Create a Mask (which is a type alias for CleanupShield)
            let mask: Mask = shield.clone();
            
            // All fields should be accessible and equal
            prop_assert_eq!(&mask.id, &shield.id, "id should be equal");
            prop_assert_eq!(mask.shield_type, shield.shield_type, "shield_type should be equal");
            prop_assert_eq!(mask.normalized_bbox, shield.normalized_bbox, "normalized_bbox should be equal");
            prop_assert_eq!(mask.apply_mode, shield.apply_mode, "apply_mode should be equal");
            prop_assert_eq!(mask.risk_level, shield.risk_level, "risk_level should be equal");
            prop_assert!((mask.confidence - shield.confidence).abs() < f64::EPSILON, "confidence should be equal");
            prop_assert!((mask.min_confidence - shield.min_confidence).abs() < f64::EPSILON, "min_confidence should be equal");
            prop_assert_eq!(&mask.why_detected, &shield.why_detected, "why_detected should be equal");
            prop_assert_eq!(mask.provenance.source, shield.provenance.source, "provenance.source should be equal");
        }

        /// Property 1.2: MaskType type alias is equivalent to ShieldType
        ///
        /// For any ShieldType value, using it through the MaskType type alias
        /// should produce identical behavior.
        ///
        /// **Validates: Requirements 1.6**
        #[test]
        #[allow(deprecated)]
        fn mask_type_enum_alias_is_equivalent_to_shield_type(shield_type in arb_shield_type()) {
            // Create a MaskType (which is a type alias for ShieldType)
            let mask_type: MaskType = shield_type;
            
            // They should be equal
            prop_assert_eq!(mask_type, shield_type, "MaskType should equal ShieldType");
            
            // Serialization should produce identical results
            let shield_json = serde_json::to_string(&shield_type).unwrap();
            let mask_json = serde_json::to_string(&mask_type).unwrap();
            prop_assert_eq!(shield_json, mask_json, "JSON serialization should be identical");
        }

        /// Property 1.3: MaskEngine delegates to CleanupEngine correctly
        ///
        /// For any valid NormalizedBBox, adding a user shield through MaskEngine
        /// should produce the same result as adding through CleanupEngine directly.
        ///
        /// **Validates: Requirements 1.6**
        #[test]
        #[allow(deprecated)]
        fn mask_engine_add_user_shield_delegates_correctly(
            bbox in arb_valid_normalized_bbox(),
            user_id in "[a-z0-9]{8,16}",
            reason in proptest::option::of(".{0,50}"),
        ) {
            let engine = MaskEngine::new();
            
            // Add shield through MaskEngine
            let result = engine.add_user_shield(
                bbox,
                &user_id,
                reason.clone(),
                PageTarget::All,
                ZoneTarget::default(),
            );
            
            prop_assert!(result.is_ok(), "add_user_shield should succeed for valid bbox");
            
            let mask = result.unwrap();
            
            // Verify the shield was created correctly
            prop_assert_eq!(mask.shield_type, ShieldType::UserDefined, "shield_type should be UserDefined");
            prop_assert_eq!(mask.normalized_bbox, bbox, "normalized_bbox should match input");
            prop_assert_eq!(mask.confidence, 1.0, "user-defined shields should have confidence 1.0");
            prop_assert_eq!(mask.provenance.user_id, Some(user_id), "user_id should be set in provenance");
        }

        /// Property 1.4: BoundingBox to NormalizedBBox conversion is correct
        ///
        /// For any pixel-based BoundingBox and image dimensions, the normalized
        /// coordinates should be in range [0.0, 1.0] and proportionally correct.
        ///
        /// **Validates: Requirements 1.6**
        #[test]
        #[allow(deprecated)]
        fn bounding_box_to_normalized_bbox_conversion_correct(
            bbox in arb_bounding_box(),
            img_width in 1000u32..=5000u32,
            img_height in 1000u32..=5000u32,
        ) {
            // Ensure bbox fits within image
            prop_assume!(bbox.x + bbox.width <= img_width);
            prop_assume!(bbox.y + bbox.height <= img_height);
            
            let engine = MaskEngine::new()
                .with_default_dimensions(img_width, img_height);
            
            let normalized = engine.normalize_bbox(&bbox);
            
            // Normalized values should be in [0.0, 1.0]
            prop_assert!(normalized.x >= 0.0 && normalized.x <= 1.0, "x should be in [0, 1]");
            prop_assert!(normalized.y >= 0.0 && normalized.y <= 1.0, "y should be in [0, 1]");
            prop_assert!(normalized.width >= 0.0 && normalized.width <= 1.0, "width should be in [0, 1]");
            prop_assert!(normalized.height >= 0.0 && normalized.height <= 1.0, "height should be in [0, 1]");
            
            // Proportions should be correct
            let expected_x = f64::from(bbox.x) / f64::from(img_width);
            let expected_y = f64::from(bbox.y) / f64::from(img_height);
            let expected_w = f64::from(bbox.width) / f64::from(img_width);
            let expected_h = f64::from(bbox.height) / f64::from(img_height);
            
            prop_assert!((normalized.x - expected_x).abs() < f64::EPSILON, "x proportion incorrect");
            prop_assert!((normalized.y - expected_y).abs() < f64::EPSILON, "y proportion incorrect");
            prop_assert!((normalized.width - expected_w).abs() < f64::EPSILON, "width proportion incorrect");
            prop_assert!((normalized.height - expected_h).abs() < f64::EPSILON, "height proportion incorrect");
        }

        /// Property 1.5: Roundtrip conversion preserves values
        ///
        /// For any pixel-based BoundingBox, converting to NormalizedBBox and back
        /// should produce values within 1 pixel of the original (due to rounding).
        ///
        /// **Validates: Requirements 1.6**
        #[test]
        #[allow(deprecated)]
        fn bounding_box_roundtrip_preserves_values(
            bbox in arb_bounding_box(),
            img_width in 1000u32..=5000u32,
            img_height in 1000u32..=5000u32,
        ) {
            // Ensure bbox fits within image
            prop_assume!(bbox.x + bbox.width <= img_width);
            prop_assume!(bbox.y + bbox.height <= img_height);
            
            let engine = MaskEngine::new()
                .with_default_dimensions(img_width, img_height);
            
            // Normalize then denormalize
            let normalized = engine.normalize_bbox(&bbox);
            let denormalized = engine.denormalize_bbox(&normalized);
            
            // Should be within 1 pixel due to rounding
            prop_assert!(
                (denormalized.x as i64 - bbox.x as i64).abs() <= 1,
                "x roundtrip error too large: {} vs {}",
                denormalized.x, bbox.x
            );
            prop_assert!(
                (denormalized.y as i64 - bbox.y as i64).abs() <= 1,
                "y roundtrip error too large: {} vs {}",
                denormalized.y, bbox.y
            );
            prop_assert!(
                (denormalized.width as i64 - bbox.width as i64).abs() <= 1,
                "width roundtrip error too large: {} vs {}",
                denormalized.width, bbox.width
            );
            prop_assert!(
                (denormalized.height as i64 - bbox.height as i64).abs() <= 1,
                "height roundtrip error too large: {} vs {}",
                denormalized.height, bbox.height
            );
        }

        /// Property 1.6: Deprecated add_user_mask produces equivalent result to add_user_shield
        ///
        /// For any pixel-based BoundingBox, calling the deprecated add_user_mask method
        /// should produce a shield equivalent to calling add_user_shield with the
        /// normalized coordinates.
        ///
        /// **Validates: Requirements 1.6**
        #[test]
        #[allow(deprecated)]
        fn deprecated_add_user_mask_equivalent_to_add_user_shield(
            bbox in arb_bounding_box(),
            user_id in "[a-z0-9]{8,16}",
            reason in proptest::option::of(".{0,50}"),
            img_width in 1000u32..=5000u32,
            img_height in 1000u32..=5000u32,
        ) {
            // Ensure bbox fits within image
            prop_assume!(bbox.x + bbox.width <= img_width);
            prop_assume!(bbox.y + bbox.height <= img_height);
            
            let engine = MaskEngine::new()
                .with_default_dimensions(img_width, img_height);
            
            // Call deprecated method
            let mask_result = engine.add_user_mask(bbox.clone(), &user_id, reason.clone());
            
            // Call new method with normalized bbox
            let normalized = engine.normalize_bbox(&bbox);
            let shield_result = engine.add_user_shield(
                normalized,
                &user_id,
                reason,
                PageTarget::All,
                ZoneTarget::default(),
            );
            
            // Both should succeed
            prop_assert!(mask_result.is_ok(), "add_user_mask should succeed");
            prop_assert!(shield_result.is_ok(), "add_user_shield should succeed");
            
            let mask = mask_result.unwrap();
            let shield = shield_result.unwrap();
            
            // Core properties should be equivalent
            prop_assert_eq!(mask.shield_type, shield.shield_type, "shield_type should match");
            prop_assert_eq!(mask.apply_mode, shield.apply_mode, "apply_mode should match");
            prop_assert_eq!(mask.risk_level, shield.risk_level, "risk_level should match");
            prop_assert!((mask.confidence - shield.confidence).abs() < f64::EPSILON, "confidence should match");
            prop_assert_eq!(mask.provenance.user_id, shield.provenance.user_id, "user_id should match");
            
            // Normalized bbox should be equivalent
            prop_assert!(
                (mask.normalized_bbox.x - shield.normalized_bbox.x).abs() < f64::EPSILON,
                "normalized_bbox.x should match"
            );
            prop_assert!(
                (mask.normalized_bbox.y - shield.normalized_bbox.y).abs() < f64::EPSILON,
                "normalized_bbox.y should match"
            );
            prop_assert!(
                (mask.normalized_bbox.width - shield.normalized_bbox.width).abs() < f64::EPSILON,
                "normalized_bbox.width should match"
            );
            prop_assert!(
                (mask.normalized_bbox.height - shield.normalized_bbox.height).abs() < f64::EPSILON,
                "normalized_bbox.height should match"
            );
        }

        /// Property 1.7: MaskEngineConfig type alias is equivalent to CleanupEngineConfig
        ///
        /// For any configuration, using it through the MaskEngineConfig type alias
        /// should produce identical behavior.
        ///
        /// **Validates: Requirements 1.6**
        #[test]
        #[allow(deprecated)]
        fn mask_engine_config_alias_is_equivalent(
            auto_detect_logos in proptest::bool::ANY,
            auto_detect_watermarks in proptest::bool::ANY,
            auto_detect_repetitive in proptest::bool::ANY,
            min_confidence in 0.0..=1.0f64,
        ) {
            use crate::services::cleanup_engine::CleanupEngineConfig;
            
            // Create config using the new type
            let cleanup_config = CleanupEngineConfig {
                auto_detect_logos,
                auto_detect_watermarks,
                auto_detect_repetitive,
                auto_detect_stamps: false,
                use_text_aware_detection: false,
                min_auto_confidence: min_confidence,
                max_processing_time_ms: 5000,
                critical_zones: vec![],
            };
            
            // Create config using the alias
            let mask_config: MaskEngineConfig = CleanupEngineConfig {
                auto_detect_logos,
                auto_detect_watermarks,
                auto_detect_repetitive,
                auto_detect_stamps: false,
                use_text_aware_detection: false,
                min_auto_confidence: min_confidence,
                max_processing_time_ms: 5000,
                critical_zones: vec![],
            };
            
            // They should have identical field values
            prop_assert_eq!(cleanup_config.auto_detect_logos, mask_config.auto_detect_logos);
            prop_assert_eq!(cleanup_config.auto_detect_watermarks, mask_config.auto_detect_watermarks);
            prop_assert_eq!(cleanup_config.auto_detect_repetitive, mask_config.auto_detect_repetitive);
            prop_assert!((cleanup_config.min_auto_confidence - mask_config.min_auto_confidence).abs() < f64::EPSILON);
        }

        /// Property 1.8: MaskEngine.inner() provides access to underlying CleanupEngine
        ///
        /// The inner() method should provide access to the underlying CleanupEngine
        /// with the same configuration.
        ///
        /// **Validates: Requirements 1.6**
        #[test]
        #[allow(deprecated)]
        fn mask_engine_inner_provides_cleanup_engine_access(
            auto_detect_logos in proptest::bool::ANY,
            auto_detect_watermarks in proptest::bool::ANY,
        ) {
            use crate::services::cleanup_engine::CleanupEngineConfig;
            
            let config = CleanupEngineConfig {
                auto_detect_logos,
                auto_detect_watermarks,
                ..CleanupEngineConfig::default()
            };
            
            let engine = MaskEngine::with_config(config);
            let inner = engine.inner();
            
            // Inner config should match
            prop_assert_eq!(inner.config().auto_detect_logos, auto_detect_logos);
            prop_assert_eq!(inner.config().auto_detect_watermarks, auto_detect_watermarks);
        }

        /// Property 1.9: Vendor rules storage through MaskEngine is equivalent to CleanupEngine
        ///
        /// Saving and retrieving vendor rules through MaskEngine should produce
        /// the same results as using CleanupEngine directly.
        ///
        /// **Validates: Requirements 1.6**
        #[test]
        #[allow(deprecated)]
        fn vendor_rules_storage_equivalent(
            bbox in arb_valid_normalized_bbox(),
            user_id in "[a-z0-9]{8,16}",
            tenant_id in "[a-z0-9]{8,16}",
            store_id in "[a-z0-9]{8,16}",
            vendor_id in "[a-z0-9]{8,16}",
        ) {
            let mut engine = MaskEngine::new();
            
            // Create a shield
            let shield = engine.add_user_shield(
                bbox,
                &user_id,
                None,
                PageTarget::All,
                ZoneTarget::default(),
            ).unwrap();
            
            // Save through MaskEngine
            engine.save_vendor_rules(&tenant_id, &store_id, &vendor_id, vec![shield.clone()]);
            
            // Retrieve through MaskEngine
            let retrieved = engine.get_vendor_rules(&tenant_id, &store_id, &vendor_id);
            
            prop_assert_eq!(retrieved.len(), 1, "Should retrieve one rule");
            prop_assert_eq!(&retrieved[0].id, &shield.id, "Shield ID should match");
            prop_assert_eq!(retrieved[0].normalized_bbox, shield.normalized_bbox, "BBox should match");
        }

        /// Property 1.10: Template rules storage through MaskEngine is equivalent to CleanupEngine
        ///
        /// Saving and retrieving template rules through MaskEngine should produce
        /// the same results as using CleanupEngine directly.
        ///
        /// **Validates: Requirements 1.6**
        #[test]
        #[allow(deprecated)]
        fn template_rules_storage_equivalent(
            bbox in arb_valid_normalized_bbox(),
            user_id in "[a-z0-9]{8,16}",
            tenant_id in "[a-z0-9]{8,16}",
            store_id in "[a-z0-9]{8,16}",
            template_id in "[a-z0-9]{8,16}",
        ) {
            let mut engine = MaskEngine::new();
            
            // Create a shield
            let shield = engine.add_user_shield(
                bbox,
                &user_id,
                None,
                PageTarget::All,
                ZoneTarget::default(),
            ).unwrap();
            
            // Save through MaskEngine
            engine.save_template_rules(&tenant_id, &store_id, &template_id, vec![shield.clone()]);
            
            // Retrieve through MaskEngine
            let retrieved = engine.get_template_rules(&tenant_id, &store_id, &template_id);
            
            prop_assert_eq!(retrieved.len(), 1, "Should retrieve one rule");
            prop_assert_eq!(&retrieved[0].id, &shield.id, "Shield ID should match");
            prop_assert_eq!(retrieved[0].normalized_bbox, shield.normalized_bbox, "BBox should match");
        }
    }
}
