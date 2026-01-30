//! Core types for the Document Cleanup Engine

use serde::{Deserialize, Serialize};

/// Zone constants for critical zone detection
pub const ZONE_LINE_ITEMS: &str = "LineItems";
pub const ZONE_TOTALS: &str = "Totals";
pub const ZONE_HEADER: &str = "Header";
pub const ZONE_FOOTER: &str = "Footer";
pub const ZONE_BARCODE: &str = "Barcode";
pub const ZONE_LOGO: &str = "Logo";

/// Overlap thresholds for critical zone protection
pub const CRITICAL_OVERLAP_WARN: f64 = 0.05; // 5% overlap triggers warning
pub const CRITICAL_OVERLAP_BLOCK_APPLY: f64 = 0.10; // 10% overlap forces Suggested

/// De-duplication threshold
pub const SHIELD_DEDUP_IOU_THRESHOLD: f64 = 0.85; // IoU >= 0.85 = same shield

/// Shield type classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ShieldType {
    /// Auto-detected logo region
    Logo,
    /// Auto-detected watermark
    Watermark,
    /// Repetitive header (e.g., "Page 1 of 3")
    RepetitiveHeader,
    /// Repetitive footer (e.g., company tagline)
    RepetitiveFooter,
    /// Stamp pattern (e.g., "PAID", "COPY")
    Stamp,
    /// User-defined shield
    UserDefined,
    /// Vendor-specific shield (saved for vendor)
    VendorSpecific,
    /// Template-specific shield
    TemplateSpecific,
}

/// Apply mode for shields
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum ApplyMode {
    /// Shield is actively applied
    Applied,
    /// Shield is suggested but not applied
    #[default]
    Suggested,
    /// Shield is disabled
    Disabled,
}

/// Risk level for shields
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum RiskLevel {
    /// Low risk - safe to apply
    #[default]
    Low,
    /// Medium risk - review recommended
    Medium,
    /// High risk - may affect critical data
    High,
}

/// Page targeting for shields
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub enum PageTarget {
    /// Apply to all pages
    #[default]
    All,
    /// Apply to first page only
    First,
    /// Apply to last page only
    Last,
    /// Apply to specific page numbers
    Specific(Vec<u32>),
}

/// Zone targeting for shields
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ZoneTarget {
    /// Zones to include (None = all zones)
    pub include_zones: Option<Vec<String>>,
    /// Zones to exclude
    pub exclude_zones: Vec<String>,
}

/// Normalized bounding box (0.0 to 1.0)
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub struct NormalizedBBox {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

impl NormalizedBBox {
    /// Create a new normalized bounding box
    #[must_use]
    pub const fn new(x: f64, y: f64, width: f64, height: f64) -> Self {
        Self { x, y, width, height }
    }

    /// Validate that all coordinates are in range [0.0, 1.0]
    #[must_use]
    pub fn is_valid(&self) -> bool {
        self.x >= 0.0
            && self.x <= 1.0
            && self.y >= 0.0
            && self.y <= 1.0
            && self.width >= 0.0
            && self.width <= 1.0
            && self.height >= 0.0
            && self.height <= 1.0
            && (self.x + self.width) <= 1.0
            && (self.y + self.height) <= 1.0
    }

    /// Calculate area
    #[must_use]
    pub fn area(&self) -> f64 {
        self.width * self.height
    }
}

/// Shield source for precedence ordering
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, PartialOrd, Ord)]
pub enum ShieldSource {
    /// Auto-detected by engine
    AutoDetected = 0,
    /// Saved vendor rule
    VendorRule = 1,
    /// Saved template rule
    TemplateRule = 2,
    /// Session-only override
    SessionOverride = 3,
}

/// Provenance tracking for shields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShieldProvenance {
    pub source: ShieldSource,
    pub user_id: Option<String>,
    pub vendor_id: Option<String>,
    pub template_id: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl Default for ShieldProvenance {
    fn default() -> Self {
        Self {
            source: ShieldSource::AutoDetected,
            user_id: None,
            vendor_id: None,
            template_id: None,
            created_at: chrono::Utc::now(),
            updated_at: None,
        }
    }
}

/// Cleanup Shield with full metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupShield {
    pub id: String,
    pub shield_type: ShieldType,
    pub normalized_bbox: NormalizedBBox,
    pub page_target: PageTarget,
    pub zone_target: ZoneTarget,
    pub apply_mode: ApplyMode,
    pub risk_level: RiskLevel,
    pub confidence: f64,
    pub min_confidence: f64,
    pub why_detected: String,
    pub provenance: ShieldProvenance,
}

impl CleanupShield {
    /// Create a new auto-detected shield
    #[must_use]
    pub fn auto_detected(
        shield_type: ShieldType,
        bbox: NormalizedBBox,
        confidence: f64,
        why_detected: String,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            shield_type,
            normalized_bbox: bbox,
            page_target: PageTarget::All,
            zone_target: ZoneTarget::default(),
            apply_mode: ApplyMode::Suggested,
            risk_level: RiskLevel::Low,
            confidence,
            min_confidence: 0.6,
            why_detected,
            provenance: ShieldProvenance::default(),
        }
    }

    /// Create a user-defined shield
    #[must_use]
    pub fn user_defined(
        bbox: NormalizedBBox,
        user_id: &str,
        reason: Option<String>,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            shield_type: ShieldType::UserDefined,
            normalized_bbox: bbox,
            page_target: PageTarget::All,
            zone_target: ZoneTarget::default(),
            apply_mode: ApplyMode::Applied,
            risk_level: RiskLevel::Low,
            confidence: 1.0,
            min_confidence: 0.0,
            why_detected: reason.unwrap_or_else(|| "User-defined shield".to_string()),
            provenance: ShieldProvenance {
                source: ShieldSource::SessionOverride,
                user_id: Some(user_id.to_string()),
                vendor_id: None,
                template_id: None,
                created_at: chrono::Utc::now(),
                updated_at: None,
            },
        }
    }
}

// ============================================================================
// BBox Math Helpers
// ============================================================================

/// Calculate intersection area of two bboxes
#[must_use]
pub fn bbox_intersection_area(a: &NormalizedBBox, b: &NormalizedBBox) -> f64 {
    let x_overlap = (a.x + a.width).min(b.x + b.width) - a.x.max(b.x);
    let y_overlap = (a.y + a.height).min(b.y + b.height) - a.y.max(b.y);
    if x_overlap <= 0.0 || y_overlap <= 0.0 {
        return 0.0;
    }
    x_overlap * y_overlap
}

/// Calculate Intersection over Union (`IoU`) for de-duplication
#[must_use]
pub fn bbox_iou(a: &NormalizedBBox, b: &NormalizedBBox) -> f64 {
    let intersection = bbox_intersection_area(a, b);
    let area_a = a.area();
    let area_b = b.area();
    let union = area_a + area_b - intersection;
    if union == 0.0 {
        return 0.0;
    }
    intersection / union
}

/// Calculate overlap ratio: `intersection_area / shield_area`
#[must_use]
pub fn calculate_overlap_ratio(shield: &NormalizedBBox, zone: &NormalizedBBox) -> f64 {
    let intersection = bbox_intersection_area(shield, zone);
    let shield_area = shield.area();
    if shield_area == 0.0 {
        return 0.0;
    }
    intersection / shield_area
}

/// Normalize pixel-based coordinates to 0.0-1.0 range
///
/// Converts pixel coordinates to normalized coordinates for resolution independence.
///
/// # Arguments
///
/// * `x`, `y` - Top-left corner in pixels
/// * `width`, `height` - Dimensions in pixels
/// * `img_width`, `img_height` - Image dimensions in pixels
#[must_use]
pub fn normalize_bbox(x: u32, y: u32, width: u32, height: u32, img_width: u32, img_height: u32) -> NormalizedBBox {
    NormalizedBBox {
        x: f64::from(x) / f64::from(img_width),
        y: f64::from(y) / f64::from(img_height),
        width: f64::from(width) / f64::from(img_width),
        height: f64::from(height) / f64::from(img_height),
    }
}

/// Denormalize to pixel coordinates (saturating)
///
/// Converts normalized coordinates (0.0-1.0) back to pixel coordinates.
/// Uses saturating conversions to prevent overflow (Requirement 2.1).
///
/// # Arguments
///
/// * `bbox` - Normalized bounding box
/// * `img_width` - Image width in pixels
/// * `img_height` - Image height in pixels
///
/// # Returns
///
/// Tuple of `(x, y, width, height)` in pixel coordinates
#[must_use]
pub fn denormalize_bbox(bbox: &NormalizedBBox, img_width: u32, img_height: u32) -> (u32, u32, u32, u32) {
    let x = (bbox.x * f64::from(img_width)).round();
    let y = (bbox.y * f64::from(img_height)).round();
    let w = (bbox.width * f64::from(img_width)).round();
    let h = (bbox.height * f64::from(img_height)).round();
    
    // Saturating conversion from f64 to u32 (Requirement 2.1)
    // This avoids clippy warnings about `as` casts and handles edge cases safely
    let saturate_to_u32 = |v: f64| -> u32 {
        if v.is_nan() || v < 0.0 {
            0
        } else if v > f64::from(u32::MAX) {
            u32::MAX
        } else {
            // Safe because we've checked bounds above
            #[allow(clippy::cast_possible_truncation, clippy::cast_sign_loss)]
            { v as u32 }
        }
    };
    
    (saturate_to_u32(x), saturate_to_u32(y), saturate_to_u32(w), saturate_to_u32(h))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalized_bbox_valid() {
        let bbox = NormalizedBBox::new(0.1, 0.2, 0.3, 0.4);
        assert!(bbox.is_valid());
    }

    #[test]
    fn test_normalized_bbox_invalid_negative() {
        let bbox = NormalizedBBox::new(-0.1, 0.2, 0.3, 0.4);
        assert!(!bbox.is_valid());
    }

    #[test]
    fn test_normalized_bbox_invalid_overflow() {
        let bbox = NormalizedBBox::new(0.8, 0.2, 0.3, 0.4);
        assert!(!bbox.is_valid()); // x + width > 1.0
    }

    #[test]
    fn test_bbox_intersection_no_overlap() {
        let a = NormalizedBBox::new(0.0, 0.0, 0.2, 0.2);
        let b = NormalizedBBox::new(0.5, 0.5, 0.2, 0.2);
        assert_eq!(bbox_intersection_area(&a, &b), 0.0);
    }

    #[test]
    fn test_bbox_intersection_partial_overlap() {
        let a = NormalizedBBox::new(0.0, 0.0, 0.5, 0.5);
        let b = NormalizedBBox::new(0.25, 0.25, 0.5, 0.5);
        let intersection = bbox_intersection_area(&a, &b);
        assert!((intersection - 0.0625).abs() < 0.0001); // 0.25 * 0.25
    }

    #[test]
    fn test_bbox_iou_identical() {
        let a = NormalizedBBox::new(0.1, 0.1, 0.3, 0.3);
        let b = NormalizedBBox::new(0.1, 0.1, 0.3, 0.3);
        assert!((bbox_iou(&a, &b) - 1.0).abs() < 0.0001);
    }

    #[test]
    fn test_normalize_denormalize_roundtrip() {
        let (x, y, w, h) = (100, 200, 300, 400);
        let (img_w, img_h) = (1000, 1000);
        
        let normalized = normalize_bbox(x, y, w, h, img_w, img_h);
        let (dx, dy, dw, dh) = denormalize_bbox(&normalized, img_w, img_h);
        
        assert_eq!(dx, x);
        assert_eq!(dy, y);
        assert_eq!(dw, w);
        assert_eq!(dh, h);
    }

    #[test]
    fn test_shield_source_ordering() {
        assert!(ShieldSource::AutoDetected < ShieldSource::VendorRule);
        assert!(ShieldSource::VendorRule < ShieldSource::TemplateRule);
        assert!(ShieldSource::TemplateRule < ShieldSource::SessionOverride);
    }
}

// ============================================================================
// Property-Based Tests for BBox Math Helpers
// ============================================================================

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        // ====================================================================
        // Feature: cleanup-engine, Property 4: Normalized BBox Validation
        // **Validates: Requirements 4.1**
        // ====================================================================

        /// Property 4.1: Valid normalized coordinates (all in [0.0, 1.0] and no overflow) pass validation
        /// 
        /// For any NormalizedBBox with x, y, width, height all in range [0.0, 1.0]
        /// AND x + width <= 1.0 AND y + height <= 1.0, the bbox should be valid.
        #[test]
        fn valid_bbox_passes_validation(
            x in 0.0..=0.5f64,
            y in 0.0..=0.5f64,
            width in 0.0..=0.5f64,
            height in 0.0..=0.5f64,
        ) {
            // Constrain to ensure no overflow: x + width <= 1.0 and y + height <= 1.0
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                bbox.is_valid(),
                "BBox with x={}, y={}, width={}, height={} should be valid (x+w={}, y+h={})",
                x, y, width, height, x + width, y + height
            );
        }

        /// Property 4.2: Negative x coordinate fails validation
        #[test]
        fn negative_x_fails_validation(
            x in -10.0..-0.001f64,
            y in 0.0..=1.0f64,
            width in 0.0..=0.5f64,
            height in 0.0..=0.5f64,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                !bbox.is_valid(),
                "BBox with negative x={} should be invalid",
                x
            );
        }

        /// Property 4.3: Negative y coordinate fails validation
        #[test]
        fn negative_y_fails_validation(
            x in 0.0..=1.0f64,
            y in -10.0..-0.001f64,
            width in 0.0..=0.5f64,
            height in 0.0..=0.5f64,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                !bbox.is_valid(),
                "BBox with negative y={} should be invalid",
                y
            );
        }

        /// Property 4.4: Negative width fails validation
        #[test]
        fn negative_width_fails_validation(
            x in 0.0..=1.0f64,
            y in 0.0..=1.0f64,
            width in -10.0..-0.001f64,
            height in 0.0..=0.5f64,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                !bbox.is_valid(),
                "BBox with negative width={} should be invalid",
                width
            );
        }

        /// Property 4.5: Negative height fails validation
        #[test]
        fn negative_height_fails_validation(
            x in 0.0..=1.0f64,
            y in 0.0..=1.0f64,
            width in 0.0..=0.5f64,
            height in -10.0..-0.001f64,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                !bbox.is_valid(),
                "BBox with negative height={} should be invalid",
                height
            );
        }

        /// Property 4.6: x > 1.0 fails validation
        #[test]
        fn x_greater_than_one_fails_validation(
            x in 1.001..10.0f64,
            y in 0.0..=1.0f64,
            width in 0.0..=0.5f64,
            height in 0.0..=0.5f64,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                !bbox.is_valid(),
                "BBox with x={} > 1.0 should be invalid",
                x
            );
        }

        /// Property 4.7: y > 1.0 fails validation
        #[test]
        fn y_greater_than_one_fails_validation(
            x in 0.0..=1.0f64,
            y in 1.001..10.0f64,
            width in 0.0..=0.5f64,
            height in 0.0..=0.5f64,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                !bbox.is_valid(),
                "BBox with y={} > 1.0 should be invalid",
                y
            );
        }

        /// Property 4.8: width > 1.0 fails validation
        #[test]
        fn width_greater_than_one_fails_validation(
            x in 0.0..=0.5f64,
            y in 0.0..=0.5f64,
            width in 1.001..10.0f64,
            height in 0.0..=0.5f64,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                !bbox.is_valid(),
                "BBox with width={} > 1.0 should be invalid",
                width
            );
        }

        /// Property 4.9: height > 1.0 fails validation
        #[test]
        fn height_greater_than_one_fails_validation(
            x in 0.0..=0.5f64,
            y in 0.0..=0.5f64,
            width in 0.0..=0.5f64,
            height in 1.001..10.0f64,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                !bbox.is_valid(),
                "BBox with height={} > 1.0 should be invalid",
                height
            );
        }

        /// Property 4.10: x + width > 1.0 (overflow) fails validation
        #[test]
        fn x_plus_width_overflow_fails_validation(
            x in 0.6..=1.0f64,
            y in 0.0..=0.5f64,
            width in 0.5..=1.0f64,
            height in 0.0..=0.5f64,
        ) {
            // Only test when x + width > 1.0
            prop_assume!(x + width > 1.0);
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                !bbox.is_valid(),
                "BBox with x={} + width={} = {} > 1.0 should be invalid",
                x, width, x + width
            );
        }

        /// Property 4.11: y + height > 1.0 (overflow) fails validation
        #[test]
        fn y_plus_height_overflow_fails_validation(
            x in 0.0..=0.5f64,
            y in 0.6..=1.0f64,
            width in 0.0..=0.5f64,
            height in 0.5..=1.0f64,
        ) {
            // Only test when y + height > 1.0
            prop_assume!(y + height > 1.0);
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                !bbox.is_valid(),
                "BBox with y={} + height={} = {} > 1.0 should be invalid",
                y, height, y + height
            );
        }

        /// Property 4.12: Boundary values (exactly 0.0 and 1.0) are valid when no overflow
        #[test]
        fn boundary_values_valid_when_no_overflow(
            use_zero_x in proptest::bool::ANY,
            use_zero_y in proptest::bool::ANY,
        ) {
            // Test boundary cases: x=0, y=0, x+width=1, y+height=1
            let x = if use_zero_x { 0.0 } else { 0.5 };
            let y = if use_zero_y { 0.0 } else { 0.5 };
            let width = if use_zero_x { 1.0 } else { 0.5 };
            let height = if use_zero_y { 1.0 } else { 0.5 };
            
            let bbox = NormalizedBBox::new(x, y, width, height);
            prop_assert!(
                bbox.is_valid(),
                "BBox at boundary x={}, y={}, width={}, height={} should be valid",
                x, y, width, height
            );
        }

        // ====================================================================
        // Additional BBox Math Helper Properties
        // ====================================================================

        /// Property: Intersection area is always non-negative
        #[test]
        fn intersection_area_non_negative(
            x1 in 0.0..=0.5f64,
            y1 in 0.0..=0.5f64,
            w1 in 0.0..=0.5f64,
            h1 in 0.0..=0.5f64,
            x2 in 0.0..=0.5f64,
            y2 in 0.0..=0.5f64,
            w2 in 0.0..=0.5f64,
            h2 in 0.0..=0.5f64,
        ) {
            let a = NormalizedBBox::new(x1, y1, w1, h1);
            let b = NormalizedBBox::new(x2, y2, w2, h2);
            let intersection = bbox_intersection_area(&a, &b);
            prop_assert!(
                intersection >= 0.0,
                "Intersection area should be non-negative, got {}",
                intersection
            );
        }

        /// Property: Intersection area is symmetric (A ∩ B = B ∩ A)
        #[test]
        fn intersection_area_symmetric(
            x1 in 0.0..=0.5f64,
            y1 in 0.0..=0.5f64,
            w1 in 0.0..=0.5f64,
            h1 in 0.0..=0.5f64,
            x2 in 0.0..=0.5f64,
            y2 in 0.0..=0.5f64,
            w2 in 0.0..=0.5f64,
            h2 in 0.0..=0.5f64,
        ) {
            let a = NormalizedBBox::new(x1, y1, w1, h1);
            let b = NormalizedBBox::new(x2, y2, w2, h2);
            let ab = bbox_intersection_area(&a, &b);
            let ba = bbox_intersection_area(&b, &a);
            prop_assert!(
                (ab - ba).abs() < f64::EPSILON,
                "Intersection should be symmetric: A∩B={} vs B∩A={}",
                ab, ba
            );
        }

        /// Property: IoU is always in range [0.0, 1.0]
        #[test]
        fn iou_in_valid_range(
            x1 in 0.0..=0.5f64,
            y1 in 0.0..=0.5f64,
            w1 in 0.01..=0.5f64,  // Avoid zero-area boxes
            h1 in 0.01..=0.5f64,
            x2 in 0.0..=0.5f64,
            y2 in 0.0..=0.5f64,
            w2 in 0.01..=0.5f64,
            h2 in 0.01..=0.5f64,
        ) {
            let a = NormalizedBBox::new(x1, y1, w1, h1);
            let b = NormalizedBBox::new(x2, y2, w2, h2);
            let iou = bbox_iou(&a, &b);
            prop_assert!(
                iou >= 0.0 && iou <= 1.0,
                "IoU should be in [0, 1], got {}",
                iou
            );
        }

        /// Property: IoU is symmetric (IoU(A, B) = IoU(B, A))
        #[test]
        fn iou_symmetric(
            x1 in 0.0..=0.5f64,
            y1 in 0.0..=0.5f64,
            w1 in 0.01..=0.5f64,
            h1 in 0.01..=0.5f64,
            x2 in 0.0..=0.5f64,
            y2 in 0.0..=0.5f64,
            w2 in 0.01..=0.5f64,
            h2 in 0.01..=0.5f64,
        ) {
            let a = NormalizedBBox::new(x1, y1, w1, h1);
            let b = NormalizedBBox::new(x2, y2, w2, h2);
            let iou_ab = bbox_iou(&a, &b);
            let iou_ba = bbox_iou(&b, &a);
            prop_assert!(
                (iou_ab - iou_ba).abs() < f64::EPSILON,
                "IoU should be symmetric: IoU(A,B)={} vs IoU(B,A)={}",
                iou_ab, iou_ba
            );
        }

        /// Property: IoU of identical boxes is 1.0
        #[test]
        fn iou_identical_boxes_is_one(
            x in 0.0..=0.5f64,
            y in 0.0..=0.5f64,
            w in 0.01..=0.5f64,
            h in 0.01..=0.5f64,
        ) {
            let a = NormalizedBBox::new(x, y, w, h);
            let b = NormalizedBBox::new(x, y, w, h);
            let iou = bbox_iou(&a, &b);
            prop_assert!(
                (iou - 1.0).abs() < f64::EPSILON,
                "IoU of identical boxes should be 1.0, got {}",
                iou
            );
        }

        /// Property: Overlap ratio is always in range [0.0, 1.0]
        #[test]
        fn overlap_ratio_in_valid_range(
            x1 in 0.0..=0.5f64,
            y1 in 0.0..=0.5f64,
            w1 in 0.01..=0.5f64,
            h1 in 0.01..=0.5f64,
            x2 in 0.0..=0.5f64,
            y2 in 0.0..=0.5f64,
            w2 in 0.01..=0.5f64,
            h2 in 0.01..=0.5f64,
        ) {
            let shield = NormalizedBBox::new(x1, y1, w1, h1);
            let zone = NormalizedBBox::new(x2, y2, w2, h2);
            let ratio = calculate_overlap_ratio(&shield, &zone);
            prop_assert!(
                ratio >= 0.0 && ratio <= 1.0,
                "Overlap ratio should be in [0, 1], got {}",
                ratio
            );
        }

        // ====================================================================
        // Feature: cleanup-engine, Property 2: Safe Type Casting
        // **Validates: Requirements 2.1, 2.2**
        // ====================================================================

        /// Property 2.1: For any f32 value representing image dimensions, converting
        /// to u32 using saturating conversion should never panic and should produce
        /// a valid u32 (saturating at u32::MAX for values > u32::MAX).
        ///
        /// Tests denormalize_bbox with normal image dimensions.
        #[test]
        fn denormalize_bbox_never_panics_normal_dimensions(
            x in 0.0..=1.0f64,
            y in 0.0..=1.0f64,
            width in 0.0..=1.0f64,
            height in 0.0..=1.0f64,
            img_width in 1u32..=10000u32,
            img_height in 1u32..=10000u32,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            // This should never panic
            let (dx, dy, dw, dh) = denormalize_bbox(&bbox, img_width, img_height);
            
            // All results should be valid u32 values
            prop_assert!(dx <= img_width, "x should not exceed image width");
            prop_assert!(dy <= img_height, "y should not exceed image height");
            prop_assert!(dw <= img_width, "width should not exceed image width");
            prop_assert!(dh <= img_height, "height should not exceed image height");
        }

        /// Property 2.2: For any f32 value representing image dimensions with extreme
        /// values (very large), converting to u32 should saturate at u32::MAX without panic.
        #[test]
        fn denormalize_bbox_saturates_at_u32_max_for_large_values(
            x in 0.0..=1.0f64,
            y in 0.0..=1.0f64,
            width in 0.0..=1.0f64,
            height in 0.0..=1.0f64,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            // Use u32::MAX as image dimensions - this tests saturation
            let (dx, dy, dw, dh) = denormalize_bbox(&bbox, u32::MAX, u32::MAX);
            
            // Results should be valid u32 values (saturated if necessary)
            // The key property is that this doesn't panic
            prop_assert!(dx <= u32::MAX);
            prop_assert!(dy <= u32::MAX);
            prop_assert!(dw <= u32::MAX);
            prop_assert!(dh <= u32::MAX);
        }

        /// Property 2.3: For any normalized bbox with values > 1.0 (invalid but possible
        /// to construct), denormalize_bbox should still not panic and should saturate.
        #[test]
        fn denormalize_bbox_handles_out_of_range_normalized_values(
            x in 0.0..=10.0f64,
            y in 0.0..=10.0f64,
            width in 0.0..=10.0f64,
            height in 0.0..=10.0f64,
            img_width in 1u32..=10000u32,
            img_height in 1u32..=10000u32,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            // This should never panic even with out-of-range values
            let (dx, dy, dw, dh) = denormalize_bbox(&bbox, img_width, img_height);
            
            // All results should be valid u32 values
            prop_assert!(dx <= u32::MAX);
            prop_assert!(dy <= u32::MAX);
            prop_assert!(dw <= u32::MAX);
            prop_assert!(dh <= u32::MAX);
        }

        /// Property 2.4: For any negative normalized values (invalid but possible),
        /// denormalize_bbox should saturate to 0 without panic.
        #[test]
        fn denormalize_bbox_handles_negative_values(
            x in -10.0..=0.0f64,
            y in -10.0..=0.0f64,
            width in -10.0..=0.0f64,
            height in -10.0..=0.0f64,
            img_width in 1u32..=10000u32,
            img_height in 1u32..=10000u32,
        ) {
            let bbox = NormalizedBBox::new(x, y, width, height);
            // This should never panic even with negative values
            let (dx, dy, dw, dh) = denormalize_bbox(&bbox, img_width, img_height);
            
            // Negative values should saturate to 0
            prop_assert_eq!(dx, 0, "Negative x should saturate to 0");
            prop_assert_eq!(dy, 0, "Negative y should saturate to 0");
            prop_assert_eq!(dw, 0, "Negative width should saturate to 0");
            prop_assert_eq!(dh, 0, "Negative height should saturate to 0");
        }

        /// Property 2.5: For NaN values, denormalize_bbox should handle gracefully
        /// (saturate to 0) without panic.
        #[test]
        fn denormalize_bbox_handles_nan_values(
            img_width in 1u32..=10000u32,
            img_height in 1u32..=10000u32,
        ) {
            let bbox = NormalizedBBox::new(f64::NAN, f64::NAN, f64::NAN, f64::NAN);
            // This should never panic
            let (dx, dy, dw, dh) = denormalize_bbox(&bbox, img_width, img_height);
            
            // NaN should saturate to 0
            prop_assert_eq!(dx, 0, "NaN x should saturate to 0");
            prop_assert_eq!(dy, 0, "NaN y should saturate to 0");
            prop_assert_eq!(dw, 0, "NaN width should saturate to 0");
            prop_assert_eq!(dh, 0, "NaN height should saturate to 0");
        }

        /// Property 2.6: For infinity values, denormalize_bbox should saturate
        /// at u32::MAX without panic.
        #[test]
        fn denormalize_bbox_handles_infinity_values(
            img_width in 1u32..=10000u32,
            img_height in 1u32..=10000u32,
        ) {
            let bbox = NormalizedBBox::new(f64::INFINITY, f64::INFINITY, f64::INFINITY, f64::INFINITY);
            // This should never panic
            let (dx, dy, dw, dh) = denormalize_bbox(&bbox, img_width, img_height);
            
            // Infinity should saturate to u32::MAX
            prop_assert_eq!(dx, u32::MAX, "Infinity x should saturate to u32::MAX");
            prop_assert_eq!(dy, u32::MAX, "Infinity y should saturate to u32::MAX");
            prop_assert_eq!(dw, u32::MAX, "Infinity width should saturate to u32::MAX");
            prop_assert_eq!(dh, u32::MAX, "Infinity height should saturate to u32::MAX");
        }

        /// Property 2.7: For negative infinity values, denormalize_bbox should
        /// saturate to 0 without panic.
        #[test]
        fn denormalize_bbox_handles_neg_infinity_values(
            img_width in 1u32..=10000u32,
            img_height in 1u32..=10000u32,
        ) {
            let bbox = NormalizedBBox::new(f64::NEG_INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY);
            // This should never panic
            let (dx, dy, dw, dh) = denormalize_bbox(&bbox, img_width, img_height);
            
            // Negative infinity should saturate to 0
            prop_assert_eq!(dx, 0, "Negative infinity x should saturate to 0");
            prop_assert_eq!(dy, 0, "Negative infinity y should saturate to 0");
            prop_assert_eq!(dw, 0, "Negative infinity width should saturate to 0");
            prop_assert_eq!(dh, 0, "Negative infinity height should saturate to 0");
        }

        /// Property 2.8: Normalize then denormalize should produce values close to
        /// original (within rounding error) for valid inputs.
        #[test]
        fn normalize_denormalize_roundtrip_preserves_values(
            x in 0u32..=500u32,
            y in 0u32..=500u32,
            width in 1u32..=500u32,
            height in 1u32..=500u32,
            img_width in 1000u32..=2000u32,
            img_height in 1000u32..=2000u32,
        ) {
            // Ensure bbox fits within image
            prop_assume!(x + width <= img_width);
            prop_assume!(y + height <= img_height);
            
            let normalized = normalize_bbox(x, y, width, height, img_width, img_height);
            let (dx, dy, dw, dh) = denormalize_bbox(&normalized, img_width, img_height);
            
            // Should be within 1 pixel due to rounding
            prop_assert!((dx as i64 - x as i64).abs() <= 1, "x roundtrip error too large");
            prop_assert!((dy as i64 - y as i64).abs() <= 1, "y roundtrip error too large");
            prop_assert!((dw as i64 - width as i64).abs() <= 1, "width roundtrip error too large");
            prop_assert!((dh as i64 - height as i64).abs() <= 1, "height roundtrip error too large");
        }
    }
}
