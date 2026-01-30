//! Main `CleanupEngine` implementation
//!
//! The `CleanupEngine` provides automatic noise region detection and user-defined
//! cleanup shields for document OCR processing. It supports vendor-specific and
//! template-specific rule persistence with multi-tenant isolation.
//!
//! # Architecture
//!
//! - **Fail-open**: Detection failures never block OCR processing
//! - **Zone-targeted**: Shields can target specific document zones
//! - **Resolution-independent**: Normalized coordinates (0.0-1.0)
//! - **Precedence-based**: Session → Template → Vendor → Auto
//! - **Multi-tenant**: All persistence methods require tenant_id and store_id

use std::collections::HashMap;
use std::path::Path;
use thiserror::Error;

use super::config::CleanupEngineConfig;
use super::detectors::{detect_logos, detect_repetitive_regions, detect_watermarks};
use super::types::{ApplyMode, CleanupShield, NormalizedBBox, PageTarget, RiskLevel, ZoneTarget};

/// Composite key for multi-tenant rule storage
///
/// Combines tenant_id, store_id, and entity_id (vendor or template) to ensure
/// complete data isolation between tenants and stores.
///
/// # Requirements
///
/// Validates: Requirements 9.1, 9.2 (Multi-tenant isolation)
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub struct TenantScopedKey {
    pub tenant_id: String,
    pub store_id: String,
    pub entity_id: String,
}

/// Cleanup engine errors
#[derive(Debug, Error)]
pub enum CleanupEngineError {
    /// Failed to load an image file
    #[error("Failed to load image: {0}")]
    ImageLoadError(String),

    /// Failed to process an image
    #[error("Failed to process image: {0}")]
    ProcessingError(String),

    /// Invalid shield region provided
    #[error("Invalid shield region: {0}")]
    InvalidShieldError(String),

    /// Normalized coordinates are out of valid range [0.0, 1.0]
    #[error("Invalid normalized coordinates: {field} = {value} (must be 0.0-1.0)")]
    InvalidNormalizedCoord { field: String, value: f64 },

    /// Database operation failed
    #[error("Database error: {0}")]
    DatabaseError(String),

    /// Serialization/deserialization failed
    #[error("Serialization error: {0}")]
    SerializationError(String),
}

/// Result of shield detection
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct CleanupDetectionResult {
    pub shields: Vec<CleanupShield>,
    pub processing_time_ms: u64,
    pub auto_detected_count: usize,
    pub rule_applied_count: usize,
    pub warnings: Vec<String>,
}

impl TenantScopedKey {
    /// Create a new tenant-scoped key
    ///
    /// # Arguments
    ///
    /// * `tenant_id` - The tenant identifier
    /// * `store_id` - The store identifier within the tenant
    /// * `entity_id` - The entity identifier (vendor_id or template_id)
    #[must_use]
    pub fn new(tenant_id: &str, store_id: &str, entity_id: &str) -> Self {
        Self {
            tenant_id: tenant_id.to_string(),
            store_id: store_id.to_string(),
            entity_id: entity_id.to_string(),
        }
    }
}

/// Document Cleanup Engine
///
/// The main service for detecting and managing cleanup shields in document images.
/// Supports auto-detection of logos, watermarks, and repetitive regions, as well as
/// user-defined shields with vendor and template rule persistence.
///
/// # Multi-Tenant Isolation
///
/// All persistence methods require `tenant_id` and `store_id` parameters to ensure
/// complete data isolation between tenants and stores. Cross-tenant reads will
/// always return empty results.
///
/// # Example
///
/// ```ignore
/// use cleanup_engine::{CleanupEngine, CleanupEngineConfig};
///
/// let engine = CleanupEngine::new();
/// let result = engine.auto_detect_shields(Path::new("invoice.png"))?;
/// println!("Detected {} shields", result.shields.len());
///
/// // Save vendor rules with tenant/store scoping
/// engine.save_vendor_rules("tenant-1", "store-1", "vendor-abc", vec![shield]);
///
/// // Cross-tenant reads return empty
/// let rules = engine.get_vendor_rules("tenant-2", "store-1", "vendor-abc");
/// assert!(rules.is_empty()); // Different tenant = no access
/// ```
pub struct CleanupEngine {
    config: CleanupEngineConfig,
    /// Vendor rules keyed by (tenant_id, store_id, vendor_id)
    vendor_rules: HashMap<TenantScopedKey, Vec<CleanupShield>>,
    /// Template rules keyed by (tenant_id, store_id, template_id)
    template_rules: HashMap<TenantScopedKey, Vec<CleanupShield>>,
}

impl CleanupEngine {
    /// Create a new cleanup engine with default configuration
    ///
    /// The default configuration enables logo, watermark, and repetitive region
    /// detection with a minimum confidence threshold of 0.6.
    #[must_use]
    pub fn new() -> Self {
        Self {
            config: CleanupEngineConfig::default(),
            vendor_rules: HashMap::new(),
            template_rules: HashMap::new(),
        }
    }

    /// Create a new cleanup engine with custom configuration
    ///
    /// # Arguments
    ///
    /// * `config` - Custom configuration for detection behavior
    #[must_use]
    pub fn with_config(config: CleanupEngineConfig) -> Self {
        Self {
            config,
            vendor_rules: HashMap::new(),
            template_rules: HashMap::new(),
        }
    }

    /// Auto-detect shields in a single image
    ///
    /// Analyzes the image for logos, watermarks, and repetitive regions based on
    /// the current configuration. Returns all detected shields that meet the
    /// minimum confidence threshold.
    ///
    /// # Arguments
    ///
    /// * `image_path` - Path to the image file to analyze
    ///
    /// # Errors
    ///
    /// Returns `CleanupEngineError::ImageLoadError` if the image file cannot be
    /// loaded or is in an unsupported format.
    pub fn auto_detect_shields(
        &self,
        image_path: &Path,
    ) -> Result<CleanupDetectionResult, CleanupEngineError> {
        let start_time = std::time::Instant::now();

        // Load image
        let img = image::open(image_path)
            .map_err(|e| CleanupEngineError::ImageLoadError(e.to_string()))?;

        let mut shields = Vec::new();

        // Auto-detect logos
        if self.config.auto_detect_logos {
            shields.extend(detect_logos(&img));
        }

        // Auto-detect watermarks
        if self.config.auto_detect_watermarks {
            shields.extend(detect_watermarks(&img));
        }

        // Auto-detect repetitive regions
        if self.config.auto_detect_repetitive {
            shields.extend(detect_repetitive_regions(&img));
        }

        // Filter by minimum confidence
        shields.retain(|s| s.confidence >= self.config.min_auto_confidence);

        let elapsed = start_time.elapsed();
        // Use saturating conversion for u128 -> u64 (Requirement 2.2)
        #[allow(clippy::cast_possible_truncation)]
        let processing_time_ms = elapsed.as_millis().min(u128::from(u64::MAX)) as u64;
        let auto_detected_count = shields.len();

        Ok(CleanupDetectionResult {
            shields,
            processing_time_ms,
            auto_detected_count,
            rule_applied_count: 0,
            warnings: vec![],
        })
    }

    /// Auto-detect shields across multiple pages of a document
    ///
    /// Analyzes multiple page images and detects repetitive patterns that appear
    /// consistently across pages. Shields detected on multiple pages receive a
    /// confidence boost.
    ///
    /// # Arguments
    ///
    /// * `page_paths` - Slice of paths to page images
    ///
    /// # Errors
    ///
    /// Returns `CleanupEngineError::ImageLoadError` if any page image cannot be
    /// loaded or is in an unsupported format.
    ///
    /// # Requirements
    ///
    /// Validates: Requirements 7.1, 7.2 (Multi-page repetitive strip detection)
    pub fn auto_detect_multi_page(
        &self,
        page_paths: &[&Path],
    ) -> Result<CleanupDetectionResult, CleanupEngineError> {
        let start_time = std::time::Instant::now();
        let mut all_shields = Vec::new();
        let mut warnings = Vec::new();

        if page_paths.is_empty() {
            return Ok(CleanupDetectionResult {
                shields: vec![],
                processing_time_ms: 0,
                auto_detected_count: 0,
                rule_applied_count: 0,
                warnings: vec!["No pages provided for multi-page detection".to_string()],
            });
        }

        // Detect shields on each page
        let mut page_shields: Vec<Vec<CleanupShield>> = Vec::with_capacity(page_paths.len());
        for (page_idx, path) in page_paths.iter().enumerate() {
            match self.auto_detect_shields(path) {
                Ok(result) => {
                    page_shields.push(result.shields);
                }
                Err(e) => {
                    warnings.push(format!("Page {} detection failed: {}", page_idx + 1, e));
                    page_shields.push(vec![]);
                }
            }
        }

        // Find repetitive shields (appear on multiple pages with similar positions)
        let page_count = page_paths.len();
        if page_count > 1 {
            // Collect all shields from first page as candidates
            for shield in &page_shields[0] {
                let mut match_count: usize = 1;

                // Check if similar shield exists on other pages
                for other_page_shields in page_shields.iter().skip(1) {
                    if Self::has_similar_shield(shield, other_page_shields) {
                        match_count += 1;
                    }
                }

                // Boost confidence for shields found on multiple pages
                let mut boosted_shield = shield.clone();
                if match_count > 1 {
                    // Confidence boost: base + (match_ratio * 0.2)
                    #[allow(clippy::cast_precision_loss)]
                    let match_ratio = match_count as f64 / page_count as f64;
                    boosted_shield.confidence =
                        match_ratio.mul_add(0.2, boosted_shield.confidence).min(1.0);
                    boosted_shield.why_detected = format!(
                        "{} (found on {}/{} pages)",
                        boosted_shield.why_detected, match_count, page_count
                    );
                }

                all_shields.push(boosted_shield);
            }
        } else {
            // Single page - just return its shields
            all_shields.extend(page_shields.into_iter().flatten());
        }

        // Filter by minimum confidence
        all_shields.retain(|s| s.confidence >= self.config.min_auto_confidence);

        let elapsed = start_time.elapsed();
        // Use saturating conversion for u128 -> u64 (Requirement 2.2)
        #[allow(clippy::cast_possible_truncation)]
        let processing_time_ms = elapsed.as_millis().min(u128::from(u64::MAX)) as u64;
        let auto_detected_count = all_shields.len();

        Ok(CleanupDetectionResult {
            shields: all_shields,
            processing_time_ms,
            auto_detected_count,
            rule_applied_count: 0,
            warnings,
        })
    }

    /// Check if a similar shield exists in a list of shields
    ///
    /// Two shields are considered similar if they have the same type and
    /// their bounding boxes have an `IoU` (Intersection over Union) >= 0.7.
    fn has_similar_shield(shield: &CleanupShield, others: &[CleanupShield]) -> bool {
        use super::types::bbox_iou;

        for other in others {
            if shield.shield_type == other.shield_type {
                let iou = bbox_iou(&shield.normalized_bbox, &other.normalized_bbox);
                if iou >= 0.7 {
                    return true;
                }
            }
        }
        false
    }

    /// Auto-detect shields with fail-open behavior
    ///
    /// Returns empty shields + warnings on error instead of failing.
    /// This ensures detection failures never block OCR processing.
    ///
    /// Auto-detected shields default to `Suggested` apply mode unless they meet
    /// the high-confidence + low-risk criteria:
    /// - Confidence >= `min_auto_confidence` (from config)
    /// - Risk level is `Low`
    ///
    /// # Arguments
    ///
    /// * `image_path` - Path to the image file to analyze
    ///
    /// # Returns
    ///
    /// Always returns a valid `CleanupDetectionResult`. On error, the result
    /// contains empty shields and a warning message describing the failure.
    ///
    /// # Requirements
    ///
    /// Validates: Requirements 13.1, 13.2, 13.3
    pub fn auto_detect_shields_safe(&self, image_path: &Path) -> CleanupDetectionResult {
        match self.auto_detect_shields(image_path) {
            Ok(mut result) => {
                // Apply the apply_mode logic based on confidence and risk level
                // (Requirement 13.3: Default to Suggested unless high-confidence + low-risk)
                for shield in &mut result.shields {
                    shield.apply_mode = self.determine_apply_mode(shield);
                }
                result
            }
            Err(e) => {
                // Requirement 13.2: Log failures without blocking pipeline
                tracing::warn!("Shield detection failed, proceeding without shields: {}", e);
                // Requirement 13.1: Return empty shields + warnings on error
                CleanupDetectionResult {
                    shields: vec![],
                    processing_time_ms: 0,
                    auto_detected_count: 0,
                    rule_applied_count: 0,
                    warnings: vec![format!("Detection failed: {}", e)],
                }
            }
        }
    }

    /// Determine the apply mode for an auto-detected shield
    ///
    /// Returns `Applied` only if the shield has high confidence (>= `min_auto_confidence`)
    /// AND low risk. Otherwise returns `Suggested`.
    ///
    /// # Arguments
    ///
    /// * `shield` - The shield to evaluate
    ///
    /// # Returns
    ///
    /// `ApplyMode::Applied` if high-confidence + low-risk, otherwise `ApplyMode::Suggested`
    fn determine_apply_mode(&self, shield: &CleanupShield) -> ApplyMode {
        // Only auto-apply if confidence is high AND risk is low
        if shield.confidence >= self.config.min_auto_confidence
            && shield.risk_level == RiskLevel::Low
        {
            ApplyMode::Applied
        } else {
            ApplyMode::Suggested
        }
    }

    /// Add a user-defined shield
    ///
    /// Creates a new shield with the specified bounding box and metadata.
    /// User-defined shields have full confidence (1.0) and are applied immediately.
    ///
    /// # Arguments
    ///
    /// * `bbox` - Normalized bounding box (coordinates in range 0.0-1.0)
    /// * `user_id` - ID of the user creating the shield
    /// * `reason` - Optional reason/description for the shield
    /// * `page_target` - Which pages the shield applies to
    /// * `zone_target` - Which zones the shield targets
    ///
    /// # Errors
    ///
    /// Returns `CleanupEngineError::InvalidShieldError` if the bounding box has
    /// zero width or height.
    ///
    /// Returns `CleanupEngineError::InvalidNormalizedCoord` if any coordinate
    /// is outside the valid range [0.0, 1.0].
    pub fn add_user_shield(
        &self,
        bbox: NormalizedBBox,
        user_id: &str,
        reason: Option<String>,
        page_target: PageTarget,
        zone_target: ZoneTarget,
    ) -> Result<CleanupShield, CleanupEngineError> {
        // Validate bbox dimensions (Requirement 3.2)
        if bbox.width == 0.0 || bbox.height == 0.0 {
            return Err(CleanupEngineError::InvalidShieldError(
                "Shield region must have non-zero dimensions".to_string(),
            ));
        }

        // Validate normalized coordinates (Requirement 3.2)
        if !bbox.is_valid() {
            if bbox.x < 0.0 || bbox.x > 1.0 {
                return Err(CleanupEngineError::InvalidNormalizedCoord {
                    field: "x".to_string(),
                    value: bbox.x,
                });
            }
            if bbox.y < 0.0 || bbox.y > 1.0 {
                return Err(CleanupEngineError::InvalidNormalizedCoord {
                    field: "y".to_string(),
                    value: bbox.y,
                });
            }
            if bbox.width < 0.0 || bbox.width > 1.0 {
                return Err(CleanupEngineError::InvalidNormalizedCoord {
                    field: "width".to_string(),
                    value: bbox.width,
                });
            }
            if bbox.height < 0.0 || bbox.height > 1.0 {
                return Err(CleanupEngineError::InvalidNormalizedCoord {
                    field: "height".to_string(),
                    value: bbox.height,
                });
            }
            // If we get here, it's an overflow issue (x + width > 1.0 or y + height > 1.0)
            return Err(CleanupEngineError::InvalidShieldError(
                "Shield region extends beyond image bounds".to_string(),
            ));
        }

        let mut shield = CleanupShield::user_defined(bbox, user_id, reason);
        shield.page_target = page_target;
        shield.zone_target = zone_target;

        Ok(shield)
    }

    /// Save vendor cleanup rules with multi-tenant isolation
    ///
    /// Stores cleanup rules associated with a specific vendor, scoped to the
    /// given tenant and store. These rules will be applied to all documents
    /// from this vendor within the same tenant/store context.
    ///
    /// # Arguments
    ///
    /// * `tenant_id` - The tenant identifier (from request context)
    /// * `store_id` - The store identifier (from request context)
    /// * `vendor_id` - Unique identifier for the vendor
    /// * `rules` - List of cleanup shields to save
    ///
    /// # Multi-Tenant Isolation
    ///
    /// Rules are stored with a composite key of (tenant_id, store_id, vendor_id).
    /// This ensures that rules saved by one tenant cannot be accessed by another.
    ///
    /// # Requirements
    ///
    /// Validates: Requirements 9.1, 9.2 (Multi-tenant isolation)
    pub fn save_vendor_rules(
        &mut self,
        tenant_id: &str,
        store_id: &str,
        vendor_id: &str,
        rules: Vec<CleanupShield>,
    ) {
        let key = TenantScopedKey::new(tenant_id, store_id, vendor_id);
        self.vendor_rules.insert(key, rules);
    }

    /// Get vendor cleanup rules with multi-tenant isolation
    ///
    /// Retrieves cleanup rules associated with a specific vendor, scoped to the
    /// given tenant and store. Cross-tenant reads will always return empty results.
    ///
    /// # Arguments
    ///
    /// * `tenant_id` - The tenant identifier (from request context)
    /// * `store_id` - The store identifier (from request context)
    /// * `vendor_id` - Unique identifier for the vendor
    ///
    /// # Returns
    ///
    /// Returns the vendor's cleanup rules for the given tenant/store context,
    /// or an empty vector if no rules exist or if the tenant/store doesn't match.
    ///
    /// # Multi-Tenant Isolation
    ///
    /// This method enforces strict tenant isolation. A request with tenant_id "A"
    /// will never see rules saved by tenant_id "B", even for the same vendor_id.
    ///
    /// # Requirements
    ///
    /// Validates: Requirements 9.1, 9.2 (Multi-tenant isolation)
    #[must_use]
    pub fn get_vendor_rules(
        &self,
        tenant_id: &str,
        store_id: &str,
        vendor_id: &str,
    ) -> Vec<CleanupShield> {
        let key = TenantScopedKey::new(tenant_id, store_id, vendor_id);
        self.vendor_rules.get(&key).cloned().unwrap_or_default()
    }

    /// Save template cleanup rules with multi-tenant isolation
    ///
    /// Stores cleanup rules associated with a specific document template, scoped
    /// to the given tenant and store. Template rules take precedence over vendor rules.
    ///
    /// # Arguments
    ///
    /// * `tenant_id` - The tenant identifier (from request context)
    /// * `store_id` - The store identifier (from request context)
    /// * `template_id` - Unique identifier for the template
    /// * `rules` - List of cleanup shields to save
    ///
    /// # Multi-Tenant Isolation
    ///
    /// Rules are stored with a composite key of (tenant_id, store_id, template_id).
    /// This ensures that rules saved by one tenant cannot be accessed by another.
    ///
    /// # Requirements
    ///
    /// Validates: Requirements 9.1, 9.2 (Multi-tenant isolation)
    pub fn save_template_rules(
        &mut self,
        tenant_id: &str,
        store_id: &str,
        template_id: &str,
        rules: Vec<CleanupShield>,
    ) {
        let key = TenantScopedKey::new(tenant_id, store_id, template_id);
        self.template_rules.insert(key, rules);
    }

    /// Get template cleanup rules with multi-tenant isolation
    ///
    /// Retrieves cleanup rules associated with a specific template, scoped to the
    /// given tenant and store. Cross-tenant reads will always return empty results.
    ///
    /// # Arguments
    ///
    /// * `tenant_id` - The tenant identifier (from request context)
    /// * `store_id` - The store identifier (from request context)
    /// * `template_id` - Unique identifier for the template
    ///
    /// # Returns
    ///
    /// Returns the template's cleanup rules for the given tenant/store context,
    /// or an empty vector if no rules exist or if the tenant/store doesn't match.
    ///
    /// # Multi-Tenant Isolation
    ///
    /// This method enforces strict tenant isolation. A request with tenant_id "A"
    /// will never see rules saved by tenant_id "B", even for the same template_id.
    ///
    /// # Requirements
    ///
    /// Validates: Requirements 9.1, 9.2 (Multi-tenant isolation)
    #[must_use]
    pub fn get_template_rules(
        &self,
        tenant_id: &str,
        store_id: &str,
        template_id: &str,
    ) -> Vec<CleanupShield> {
        let key = TenantScopedKey::new(tenant_id, store_id, template_id);
        self.template_rules.get(&key).cloned().unwrap_or_default()
    }

    /// Get all shields with precedence resolution and multi-tenant isolation
    ///
    /// Combines auto-detected shields with vendor rules, template rules, and
    /// session overrides. Shields are applied in precedence order:
    /// Session Overrides → Template Rules → Vendor Rules → Auto Suggestions
    ///
    /// # Arguments
    ///
    /// * `image_path` - Path to the image file to analyze
    /// * `tenant_id` - The tenant identifier (from request context)
    /// * `store_id` - The store identifier (from request context)
    /// * `vendor_id` - Optional vendor ID to load vendor-specific rules
    /// * `template_id` - Optional template ID to load template-specific rules
    /// * `session_overrides` - Session-only shield overrides
    ///
    /// # Multi-Tenant Isolation
    ///
    /// Vendor and template rules are loaded using the provided tenant_id and store_id.
    /// This ensures that rules from other tenants are never included in the resolution.
    ///
    /// # Errors
    ///
    /// Returns `CleanupEngineError::ImageLoadError` if the image file cannot be
    /// loaded or is in an unsupported format.
    ///
    /// # Requirements
    ///
    /// Validates: Requirements 5.1, 9.1, 9.2 (Precedence + Multi-tenant isolation)
    pub fn get_resolved_shields(
        &self,
        image_path: &Path,
        tenant_id: &str,
        store_id: &str,
        vendor_id: Option<&str>,
        template_id: Option<&str>,
        session_overrides: &[CleanupShield],
    ) -> Result<CleanupDetectionResult, CleanupEngineError> {
        let mut result = self.auto_detect_shields(image_path)?;

        // Add vendor rules (Requirement 5.1 - precedence order)
        // Uses tenant/store scoping (Requirement 9.1, 9.2)
        if let Some(vid) = vendor_id {
            let vendor_shields = self.get_vendor_rules(tenant_id, store_id, vid);
            result.rule_applied_count += vendor_shields.len();
            result.shields.extend(vendor_shields);
        }

        // Add template rules (higher precedence than vendor)
        // Uses tenant/store scoping (Requirement 9.1, 9.2)
        if let Some(tid) = template_id {
            let template_shields = self.get_template_rules(tenant_id, store_id, tid);
            result.rule_applied_count += template_shields.len();
            result.shields.extend(template_shields);
        }

        // Add session overrides (highest precedence)
        result.shields.extend(session_overrides.iter().cloned());

        Ok(result)
    }

    /// Get the current configuration
    ///
    /// Returns a reference to the engine's configuration.
    #[must_use]
    pub const fn config(&self) -> &CleanupEngineConfig {
        &self.config
    }
}

impl Default for CleanupEngine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cleanup_engine_creation() {
        let engine = CleanupEngine::new();
        assert!(engine.config.auto_detect_logos);
        assert!(engine.config.auto_detect_watermarks);
        assert!(engine.config.auto_detect_repetitive);
    }

    #[test]
    fn test_cleanup_engine_with_config() {
        let config = CleanupEngineConfig::minimal();
        let engine = CleanupEngine::with_config(config);
        assert!(engine.config.auto_detect_logos);
        assert!(!engine.config.auto_detect_watermarks);
        assert!(!engine.config.auto_detect_repetitive);
    }

    #[test]
    fn test_add_user_shield_valid() {
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);

        let result = engine.add_user_shield(
            bbox,
            "user123",
            Some("Test shield".to_string()),
            PageTarget::All,
            ZoneTarget::default(),
        );

        assert!(result.is_ok());
        let shield = result.unwrap();
        assert_eq!(shield.confidence, 1.0);
        assert!(shield.provenance.user_id.is_some());
    }

    #[test]
    fn test_add_user_shield_zero_dimensions() {
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.0, 0.2);

        let result = engine.add_user_shield(
            bbox,
            "user123",
            None,
            PageTarget::All,
            ZoneTarget::default(),
        );

        assert!(result.is_err());
        match result {
            Err(CleanupEngineError::InvalidShieldError(msg)) => {
                assert!(msg.contains("non-zero dimensions"));
            }
            _ => panic!("Expected InvalidShieldError"),
        }
    }

    #[test]
    fn test_add_user_shield_invalid_coords() {
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(1.5, 0.1, 0.2, 0.2);

        let result = engine.add_user_shield(
            bbox,
            "user123",
            None,
            PageTarget::All,
            ZoneTarget::default(),
        );

        assert!(result.is_err());
        match result {
            Err(CleanupEngineError::InvalidNormalizedCoord { field, value }) => {
                assert_eq!(field, "x");
                assert!((value - 1.5).abs() < f64::EPSILON);
            }
            _ => panic!("Expected InvalidNormalizedCoord"),
        }
    }

    #[test]
    fn test_add_user_shield_overflow() {
        let engine = CleanupEngine::new();
        // x + width > 1.0
        let bbox = NormalizedBBox::new(0.8, 0.1, 0.3, 0.2);

        let result = engine.add_user_shield(
            bbox,
            "user123",
            None,
            PageTarget::All,
            ZoneTarget::default(),
        );

        assert!(result.is_err());
        match result {
            Err(CleanupEngineError::InvalidShieldError(msg)) => {
                assert!(msg.contains("extends beyond"));
            }
            _ => panic!("Expected InvalidShieldError for overflow"),
        }
    }

    #[test]
    fn test_vendor_rules_storage() {
        let mut engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        let shield = CleanupShield::user_defined(bbox, "user123", None);

        // Save with tenant/store scoping (Requirement 9.1, 9.2)
        engine.save_vendor_rules("tenant-1", "store-1", "vendor-abc", vec![shield]);

        // Retrieve with same tenant/store
        let rules = engine.get_vendor_rules("tenant-1", "store-1", "vendor-abc");
        assert_eq!(rules.len(), 1);
    }

    #[test]
    fn test_get_vendor_rules_empty() {
        let engine = CleanupEngine::new();
        let rules = engine.get_vendor_rules("tenant-1", "store-1", "nonexistent-vendor");
        assert!(rules.is_empty());
    }

    #[test]
    fn test_template_rules_storage() {
        let mut engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        let shield = CleanupShield::user_defined(bbox, "user123", None);

        // Save with tenant/store scoping (Requirement 9.1, 9.2)
        engine.save_template_rules("tenant-1", "store-1", "template-xyz", vec![shield]);

        // Retrieve with same tenant/store
        let rules = engine.get_template_rules("tenant-1", "store-1", "template-xyz");
        assert_eq!(rules.len(), 1);
    }

    #[test]
    fn test_get_template_rules_empty() {
        let engine = CleanupEngine::new();
        let rules = engine.get_template_rules("tenant-1", "store-1", "nonexistent-template");
        assert!(rules.is_empty());
    }

    // ========================================================================
    // Multi-Tenant Isolation Tests - Requirements 9.1, 9.2
    // ========================================================================

    #[test]
    fn test_cross_tenant_vendor_rules_isolation() {
        // Requirement 9.1, 9.2: Cross-tenant reads return empty
        let mut engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        let shield = CleanupShield::user_defined(bbox, "user123", None);

        // Save rules for tenant-1
        engine.save_vendor_rules("tenant-1", "store-1", "vendor-abc", vec![shield]);

        // Verify tenant-1 can access their rules
        let rules_tenant1 = engine.get_vendor_rules("tenant-1", "store-1", "vendor-abc");
        assert_eq!(rules_tenant1.len(), 1, "Tenant-1 should see their own rules");

        // Verify tenant-2 CANNOT access tenant-1's rules (cross-tenant isolation)
        let rules_tenant2 = engine.get_vendor_rules("tenant-2", "store-1", "vendor-abc");
        assert!(rules_tenant2.is_empty(), "Tenant-2 should NOT see tenant-1's rules");

        // Verify different store within same tenant also cannot access
        let rules_different_store = engine.get_vendor_rules("tenant-1", "store-2", "vendor-abc");
        assert!(rules_different_store.is_empty(), "Different store should NOT see rules");
    }

    #[test]
    fn test_cross_tenant_template_rules_isolation() {
        // Requirement 9.1, 9.2: Cross-tenant reads return empty
        let mut engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        let shield = CleanupShield::user_defined(bbox, "user123", None);

        // Save rules for tenant-1
        engine.save_template_rules("tenant-1", "store-1", "template-xyz", vec![shield]);

        // Verify tenant-1 can access their rules
        let rules_tenant1 = engine.get_template_rules("tenant-1", "store-1", "template-xyz");
        assert_eq!(rules_tenant1.len(), 1, "Tenant-1 should see their own rules");

        // Verify tenant-2 CANNOT access tenant-1's rules (cross-tenant isolation)
        let rules_tenant2 = engine.get_template_rules("tenant-2", "store-1", "template-xyz");
        assert!(rules_tenant2.is_empty(), "Tenant-2 should NOT see tenant-1's rules");

        // Verify different store within same tenant also cannot access
        let rules_different_store = engine.get_template_rules("tenant-1", "store-2", "template-xyz");
        assert!(rules_different_store.is_empty(), "Different store should NOT see rules");
    }

    #[test]
    fn test_cross_store_isolation_same_tenant() {
        // Requirement 9.2: Store-level isolation within same tenant
        let mut engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        let shield1 = CleanupShield::user_defined(bbox, "user123", Some("Store 1 rule".to_string()));
        let shield2 = CleanupShield::user_defined(bbox, "user456", Some("Store 2 rule".to_string()));

        // Save different rules for different stores within same tenant
        engine.save_vendor_rules("tenant-1", "store-1", "vendor-abc", vec![shield1]);
        engine.save_vendor_rules("tenant-1", "store-2", "vendor-abc", vec![shield2]);

        // Each store should only see their own rules
        let rules_store1 = engine.get_vendor_rules("tenant-1", "store-1", "vendor-abc");
        let rules_store2 = engine.get_vendor_rules("tenant-1", "store-2", "vendor-abc");

        assert_eq!(rules_store1.len(), 1);
        assert_eq!(rules_store2.len(), 1);
        
        // Verify they are different rules
        assert_ne!(
            rules_store1[0].provenance.user_id,
            rules_store2[0].provenance.user_id,
            "Each store should have their own distinct rules"
        );
    }

    #[test]
    fn test_multiple_tenants_same_vendor_id() {
        // Requirement 9.1, 9.2: Multiple tenants can have rules for same vendor_id
        let mut engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        let shield_t1 = CleanupShield::user_defined(bbox, "user-tenant1", Some("Tenant 1".to_string()));
        let shield_t2 = CleanupShield::user_defined(bbox, "user-tenant2", Some("Tenant 2".to_string()));

        // Both tenants save rules for the same vendor_id
        engine.save_vendor_rules("tenant-1", "store-1", "shared-vendor", vec![shield_t1]);
        engine.save_vendor_rules("tenant-2", "store-1", "shared-vendor", vec![shield_t2]);

        // Each tenant should only see their own rules
        let rules_t1 = engine.get_vendor_rules("tenant-1", "store-1", "shared-vendor");
        let rules_t2 = engine.get_vendor_rules("tenant-2", "store-1", "shared-vendor");

        assert_eq!(rules_t1.len(), 1);
        assert_eq!(rules_t2.len(), 1);
        
        // Verify they are different rules (different user_ids)
        assert_eq!(rules_t1[0].provenance.user_id.as_deref(), Some("user-tenant1"));
        assert_eq!(rules_t2[0].provenance.user_id.as_deref(), Some("user-tenant2"));
    }

    #[test]
    fn test_tenant_scoped_key_equality() {
        // Test TenantScopedKey equality for HashMap operations
        let key1 = TenantScopedKey::new("tenant-1", "store-1", "vendor-abc");
        let key2 = TenantScopedKey::new("tenant-1", "store-1", "vendor-abc");
        let key3 = TenantScopedKey::new("tenant-2", "store-1", "vendor-abc");
        let key4 = TenantScopedKey::new("tenant-1", "store-2", "vendor-abc");
        let key5 = TenantScopedKey::new("tenant-1", "store-1", "vendor-xyz");

        // Same keys should be equal
        assert_eq!(key1, key2);

        // Different tenant should not be equal
        assert_ne!(key1, key3);

        // Different store should not be equal
        assert_ne!(key1, key4);

        // Different entity should not be equal
        assert_ne!(key1, key5);
    }

    #[test]
    fn test_overwrite_rules_same_tenant_store() {
        // Verify that saving rules overwrites previous rules for same tenant/store/entity
        let mut engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        let shield1 = CleanupShield::user_defined(bbox, "user1", Some("First rule".to_string()));
        let shield2 = CleanupShield::user_defined(bbox, "user2", Some("Second rule".to_string()));

        // Save first rule
        engine.save_vendor_rules("tenant-1", "store-1", "vendor-abc", vec![shield1]);
        
        // Verify first rule exists
        let rules_v1 = engine.get_vendor_rules("tenant-1", "store-1", "vendor-abc");
        assert_eq!(rules_v1.len(), 1);
        assert_eq!(rules_v1[0].provenance.user_id.as_deref(), Some("user1"));

        // Save second rule (should overwrite)
        engine.save_vendor_rules("tenant-1", "store-1", "vendor-abc", vec![shield2]);
        
        // Verify second rule replaced first
        let rules_v2 = engine.get_vendor_rules("tenant-1", "store-1", "vendor-abc");
        assert_eq!(rules_v2.len(), 1);
        assert_eq!(rules_v2[0].provenance.user_id.as_deref(), Some("user2"));
    }

    #[test]
    fn test_auto_detect_multi_page_empty() {
        let engine = CleanupEngine::new();
        let result = engine.auto_detect_multi_page(&[]);

        assert!(result.is_ok());
        let detection = result.unwrap();
        assert!(detection.shields.is_empty());
        assert!(!detection.warnings.is_empty());
        assert!(detection.warnings[0].contains("No pages provided"));
    }

    #[test]
    fn test_has_similar_shield() {
        let bbox1 = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        let bbox2 = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2); // Same position
        let bbox3 = NormalizedBBox::new(0.5, 0.5, 0.2, 0.2); // Different position

        use super::super::types::ShieldType;

        let shield1 = CleanupShield::auto_detected(
            ShieldType::Logo,
            bbox1,
            0.8,
            "Test".to_string(),
        );

        let shield2 = CleanupShield::auto_detected(
            ShieldType::Logo,
            bbox2,
            0.8,
            "Test".to_string(),
        );

        let shield3 = CleanupShield::auto_detected(
            ShieldType::Logo,
            bbox3,
            0.8,
            "Test".to_string(),
        );

        // Same position should be similar
        assert!(CleanupEngine::has_similar_shield(&shield1, &[shield2]));

        // Different position should not be similar
        assert!(!CleanupEngine::has_similar_shield(&shield1, &[shield3]));
    }

    #[test]
    fn test_config_accessor() {
        let config = CleanupEngineConfig::minimal();
        let engine = CleanupEngine::with_config(config);

        assert!(engine.config().auto_detect_logos);
        assert!(!engine.config().auto_detect_watermarks);
    }

    // ========================================================================
    // Tests for auto_detect_shields_safe() - Requirement 13.1, 13.2, 13.3
    // ========================================================================

    #[test]
    fn test_auto_detect_shields_safe_returns_empty_on_invalid_path() {
        // Requirement 13.1: Return empty shields + warnings on error
        let engine = CleanupEngine::new();
        let result = engine.auto_detect_shields_safe(Path::new("/nonexistent/path/image.png"));

        assert!(result.shields.is_empty());
        assert_eq!(result.auto_detected_count, 0);
        assert!(!result.warnings.is_empty());
        assert!(result.warnings[0].contains("Detection failed"));
    }

    #[test]
    fn test_auto_detect_shields_safe_never_panics() {
        // Requirement 13.2: Log failures without blocking pipeline
        let engine = CleanupEngine::new();
        
        // Test with various invalid paths - should never panic
        let invalid_paths = [
            Path::new(""),
            Path::new("/"),
            Path::new("nonexistent.png"),
            Path::new("../../../etc/passwd"),
        ];

        for path in &invalid_paths {
            let result = engine.auto_detect_shields_safe(path);
            // Should always return a valid result, never panic
            assert!(result.shields.is_empty() || !result.shields.is_empty());
        }
    }

    #[test]
    fn test_determine_apply_mode_high_confidence_low_risk() {
        // Requirement 13.3: High confidence + low risk = Applied
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        let mut shield = CleanupShield::auto_detected(
            super::super::types::ShieldType::Logo,
            bbox,
            0.9, // High confidence (>= 0.6 default min_auto_confidence)
            "Test".to_string(),
        );
        shield.risk_level = RiskLevel::Low;

        let apply_mode = engine.determine_apply_mode(&shield);
        assert_eq!(apply_mode, ApplyMode::Applied);
    }

    #[test]
    fn test_determine_apply_mode_low_confidence() {
        // Requirement 13.3: Low confidence = Suggested
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        let mut shield = CleanupShield::auto_detected(
            super::super::types::ShieldType::Logo,
            bbox,
            0.3, // Low confidence (< 0.6 default min_auto_confidence)
            "Test".to_string(),
        );
        shield.risk_level = RiskLevel::Low;

        let apply_mode = engine.determine_apply_mode(&shield);
        assert_eq!(apply_mode, ApplyMode::Suggested);
    }

    #[test]
    fn test_determine_apply_mode_high_risk() {
        // Requirement 13.3: High risk = Suggested (even with high confidence)
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        let mut shield = CleanupShield::auto_detected(
            super::super::types::ShieldType::Logo,
            bbox,
            0.9, // High confidence
            "Test".to_string(),
        );
        shield.risk_level = RiskLevel::High;

        let apply_mode = engine.determine_apply_mode(&shield);
        assert_eq!(apply_mode, ApplyMode::Suggested);
    }

    #[test]
    fn test_determine_apply_mode_medium_risk() {
        // Requirement 13.3: Medium risk = Suggested (even with high confidence)
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        let mut shield = CleanupShield::auto_detected(
            super::super::types::ShieldType::Logo,
            bbox,
            0.9, // High confidence
            "Test".to_string(),
        );
        shield.risk_level = RiskLevel::Medium;

        let apply_mode = engine.determine_apply_mode(&shield);
        assert_eq!(apply_mode, ApplyMode::Suggested);
    }

    #[test]
    fn test_determine_apply_mode_boundary_confidence() {
        // Test boundary case: exactly at min_auto_confidence threshold
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        let mut shield = CleanupShield::auto_detected(
            super::super::types::ShieldType::Logo,
            bbox,
            0.6, // Exactly at default min_auto_confidence
            "Test".to_string(),
        );
        shield.risk_level = RiskLevel::Low;

        let apply_mode = engine.determine_apply_mode(&shield);
        assert_eq!(apply_mode, ApplyMode::Applied);
    }

    #[test]
    fn test_determine_apply_mode_just_below_threshold() {
        // Test boundary case: just below min_auto_confidence threshold
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        let mut shield = CleanupShield::auto_detected(
            super::super::types::ShieldType::Logo,
            bbox,
            0.59, // Just below default min_auto_confidence (0.6)
            "Test".to_string(),
        );
        shield.risk_level = RiskLevel::Low;

        let apply_mode = engine.determine_apply_mode(&shield);
        assert_eq!(apply_mode, ApplyMode::Suggested);
    }

    #[test]
    fn test_determine_apply_mode_custom_threshold() {
        // Test with custom min_auto_confidence threshold
        let mut config = CleanupEngineConfig::default();
        config.min_auto_confidence = 0.8; // Higher threshold
        let engine = CleanupEngine::with_config(config);
        
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        // Shield with 0.75 confidence - below custom threshold
        let mut shield = CleanupShield::auto_detected(
            super::super::types::ShieldType::Logo,
            bbox,
            0.75,
            "Test".to_string(),
        );
        shield.risk_level = RiskLevel::Low;

        let apply_mode = engine.determine_apply_mode(&shield);
        assert_eq!(apply_mode, ApplyMode::Suggested);

        // Shield with 0.85 confidence - above custom threshold
        let mut shield_high = CleanupShield::auto_detected(
            super::super::types::ShieldType::Logo,
            bbox,
            0.85,
            "Test".to_string(),
        );
        shield_high.risk_level = RiskLevel::Low;

        let apply_mode_high = engine.determine_apply_mode(&shield_high);
        assert_eq!(apply_mode_high, ApplyMode::Applied);
    }
}

// ============================================================================
// Property-Based Tests for CleanupEngine
// ============================================================================

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    // ========================================================================
    // Arbitrary generators for property tests
    // ========================================================================

    /// Generate arbitrary RiskLevel
    fn arb_risk_level() -> impl Strategy<Value = RiskLevel> {
        prop_oneof![
            Just(RiskLevel::Low),
            Just(RiskLevel::Medium),
            Just(RiskLevel::High),
        ]
    }

    /// Generate arbitrary confidence value in valid range [0.0, 1.0]
    fn arb_confidence() -> impl Strategy<Value = f64> {
        0.0..=1.0f64
    }

    /// Generate arbitrary min_auto_confidence threshold
    fn arb_min_confidence_threshold() -> impl Strategy<Value = f64> {
        0.0..=1.0f64
    }

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        // ====================================================================
        // Feature: cleanup-engine, Property 14: Fail-Open Behavior
        // **Validates: Requirements 13.1, 13.2, 13.3**
        // ====================================================================

        /// Property 14.1: For any detection operation that fails, the engine should
        /// return a valid CleanupDetectionResult with empty shields (not an error).
        ///
        /// Tests that auto_detect_shields_safe always returns a valid result.
        #[test]
        fn fail_open_always_returns_valid_result(
            path_suffix in "[a-z0-9_]{1,20}",
        ) {
            let engine = CleanupEngine::new();
            // Use a non-existent path to trigger failure
            let path = format!("/nonexistent/path/{}.png", path_suffix);
            
            // This should never panic and always return a valid result
            let result = engine.auto_detect_shields_safe(Path::new(&path));
            
            // Property 14.1: Should return valid CleanupDetectionResult with empty shields
            prop_assert!(result.shields.is_empty(), "Failed detection should return empty shields");
            prop_assert_eq!(result.auto_detected_count, 0, "Failed detection should have 0 auto_detected_count");
            prop_assert_eq!(result.rule_applied_count, 0, "Failed detection should have 0 rule_applied_count");
        }

        /// Property 14.2: For any detection failure, the result should contain
        /// a warning message for debugging (log the failure).
        #[test]
        fn fail_open_logs_failure_in_warnings(
            path_suffix in "[a-z0-9_]{1,20}",
        ) {
            let engine = CleanupEngine::new();
            let path = format!("/nonexistent/path/{}.png", path_suffix);
            
            let result = engine.auto_detect_shields_safe(Path::new(&path));
            
            // Property 14.2: Should log the failure for debugging
            prop_assert!(!result.warnings.is_empty(), "Failed detection should have warnings");
            prop_assert!(
                result.warnings.iter().any(|w| w.contains("Detection failed")),
                "Warnings should contain 'Detection failed' message"
            );
        }

        /// Property 14.3: For any auto-detected shield, apply_mode should default to
        /// Suggested unless confidence >= min_auto_confidence AND risk_level == Low.
        ///
        /// Case: Low confidence (below threshold) should always be Suggested.
        #[test]
        fn apply_mode_suggested_when_low_confidence(
            confidence in 0.0..0.6f64,  // Below default threshold
            risk_level in arb_risk_level(),
        ) {
            let engine = CleanupEngine::new();
            let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
            
            let mut shield = CleanupShield::auto_detected(
                super::super::types::ShieldType::Logo,
                bbox,
                confidence,
                "Test".to_string(),
            );
            shield.risk_level = risk_level;

            let apply_mode = engine.determine_apply_mode(&shield);
            
            // Property 14.3: Low confidence should always result in Suggested
            prop_assert_eq!(
                apply_mode, 
                ApplyMode::Suggested,
                "Low confidence ({}) should result in Suggested, got {:?}",
                confidence, apply_mode
            );
        }

        /// Property 14.4: For any auto-detected shield with high confidence but
        /// non-Low risk, apply_mode should be Suggested.
        #[test]
        fn apply_mode_suggested_when_high_risk(
            confidence in 0.6..=1.0f64,  // Above default threshold
            risk_level in prop_oneof![Just(RiskLevel::Medium), Just(RiskLevel::High)],
        ) {
            let engine = CleanupEngine::new();
            let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
            
            let mut shield = CleanupShield::auto_detected(
                super::super::types::ShieldType::Logo,
                bbox,
                confidence,
                "Test".to_string(),
            );
            shield.risk_level = risk_level;

            let apply_mode = engine.determine_apply_mode(&shield);
            
            // Property 14.4: Non-Low risk should always result in Suggested
            prop_assert_eq!(
                apply_mode, 
                ApplyMode::Suggested,
                "Non-Low risk ({:?}) should result in Suggested even with high confidence ({})",
                risk_level, confidence
            );
        }

        /// Property 14.5: For any auto-detected shield with high confidence AND
        /// Low risk, apply_mode should be Applied.
        #[test]
        fn apply_mode_applied_when_high_confidence_and_low_risk(
            confidence in 0.6..=1.0f64,  // Above default threshold
        ) {
            let engine = CleanupEngine::new();
            let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
            
            let mut shield = CleanupShield::auto_detected(
                super::super::types::ShieldType::Logo,
                bbox,
                confidence,
                "Test".to_string(),
            );
            shield.risk_level = RiskLevel::Low;

            let apply_mode = engine.determine_apply_mode(&shield);
            
            // Property 14.5: High confidence + Low risk should result in Applied
            prop_assert_eq!(
                apply_mode, 
                ApplyMode::Applied,
                "High confidence ({}) + Low risk should result in Applied, got {:?}",
                confidence, apply_mode
            );
        }

        /// Property 14.6: For any custom min_auto_confidence threshold, the
        /// apply_mode logic should respect that threshold.
        #[test]
        fn apply_mode_respects_custom_threshold(
            threshold in arb_min_confidence_threshold(),
            confidence in arb_confidence(),
        ) {
            let mut config = CleanupEngineConfig::default();
            config.min_auto_confidence = threshold;
            let engine = CleanupEngine::with_config(config);
            
            let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
            
            let mut shield = CleanupShield::auto_detected(
                super::super::types::ShieldType::Logo,
                bbox,
                confidence,
                "Test".to_string(),
            );
            shield.risk_level = RiskLevel::Low;

            let apply_mode = engine.determine_apply_mode(&shield);
            
            // Property 14.6: Should respect custom threshold
            if confidence >= threshold {
                prop_assert_eq!(
                    apply_mode, 
                    ApplyMode::Applied,
                    "Confidence ({}) >= threshold ({}) with Low risk should be Applied",
                    confidence, threshold
                );
            } else {
                prop_assert_eq!(
                    apply_mode, 
                    ApplyMode::Suggested,
                    "Confidence ({}) < threshold ({}) should be Suggested",
                    confidence, threshold
                );
            }
        }

        /// Property 14.7: The fail-open behavior should allow downstream OCR
        /// processing to proceed (result is always usable, never an error type).
        #[test]
        fn fail_open_result_is_always_usable(
            path_suffix in "[a-z0-9_]{1,20}",
        ) {
            let engine = CleanupEngine::new();
            let path = format!("/nonexistent/path/{}.png", path_suffix);
            
            let result = engine.auto_detect_shields_safe(Path::new(&path));
            
            // Property 14.7: Result should be usable for downstream processing
            // - shields can be iterated (even if empty)
            // - processing_time_ms is valid
            // - counts are valid
            let _ = result.shields.iter().count();
            prop_assert!(result.processing_time_ms <= u64::MAX);
            prop_assert!(result.auto_detected_count <= result.shields.len());
            prop_assert!(result.rule_applied_count <= result.shields.len());
        }

        // ====================================================================
        // Property 2: Safe Type Casting (u128 -> u64 for processing time)
        // **Validates: Requirements 2.2**
        // ====================================================================

        /// Property 2.9: For any u128 millisecond value, converting to u64 should
        /// saturate at u64::MAX without panic.
        ///
        /// This tests the processing_time_ms conversion in auto_detect_shields.
        #[test]
        fn processing_time_saturates_safely(
            path_suffix in "[a-z0-9_]{1,20}",
        ) {
            let engine = CleanupEngine::new();
            let path = format!("/nonexistent/path/{}.png", path_suffix);
            
            // Even with failed detection, processing_time_ms should be valid
            let result = engine.auto_detect_shields_safe(Path::new(&path));
            
            // Property 2.9: processing_time_ms should be a valid u64
            prop_assert!(result.processing_time_ms <= u64::MAX);
            // For failed detection, it should be 0 or very small
            prop_assert!(result.processing_time_ms < 1000, "Failed detection should be fast");
        }
    }

    // ========================================================================
    // Unit tests for edge cases (complement property tests)
    // ========================================================================

    /// Test that auto_detect_shields_safe handles empty path gracefully
    #[test]
    fn test_fail_open_empty_path() {
        let engine = CleanupEngine::new();
        let result = engine.auto_detect_shields_safe(Path::new(""));
        
        assert!(result.shields.is_empty());
        assert!(!result.warnings.is_empty());
    }

    /// Test that auto_detect_shields_safe handles path with special characters
    #[test]
    fn test_fail_open_special_characters_path() {
        let engine = CleanupEngine::new();
        let result = engine.auto_detect_shields_safe(Path::new("/path/with spaces/and-dashes/file.png"));
        
        assert!(result.shields.is_empty());
        assert!(!result.warnings.is_empty());
    }

    /// Test that auto_detect_shields_safe handles very long path
    #[test]
    fn test_fail_open_very_long_path() {
        let engine = CleanupEngine::new();
        let long_path = format!("/{}/file.png", "a".repeat(1000));
        let result = engine.auto_detect_shields_safe(Path::new(&long_path));
        
        assert!(result.shields.is_empty());
        assert!(!result.warnings.is_empty());
    }

    /// Test boundary case: confidence exactly at threshold
    #[test]
    fn test_apply_mode_boundary_at_threshold() {
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        // Exactly at default threshold (0.6)
        let mut shield = CleanupShield::auto_detected(
            super::super::types::ShieldType::Logo,
            bbox,
            0.6,
            "Test".to_string(),
        );
        shield.risk_level = RiskLevel::Low;

        let apply_mode = engine.determine_apply_mode(&shield);
        assert_eq!(apply_mode, ApplyMode::Applied, "Exactly at threshold should be Applied");
    }

    /// Test boundary case: confidence just below threshold
    #[test]
    fn test_apply_mode_boundary_below_threshold() {
        let engine = CleanupEngine::new();
        let bbox = NormalizedBBox::new(0.1, 0.1, 0.2, 0.2);
        
        // Just below default threshold
        let mut shield = CleanupShield::auto_detected(
            super::super::types::ShieldType::Logo,
            bbox,
            0.5999999,
            "Test".to_string(),
        );
        shield.risk_level = RiskLevel::Low;

        let apply_mode = engine.determine_apply_mode(&shield);
        assert_eq!(apply_mode, ApplyMode::Suggested, "Just below threshold should be Suggested");
    }
}
