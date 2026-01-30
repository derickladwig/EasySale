//! Multi-page strip detection for the Document Cleanup Engine
//!
//! This module provides detection of repetitive header/footer patterns across
//! multiple pages of a document. When stable patterns are detected across pages,
//! the confidence score is boosted.
//!
//! # Requirements
//!
//! - **Requirement 7.1**: Compare top and bottom strips across pages
//! - **Requirement 7.2**: Create repetitive header/footer shields with higher confidence
//!   when stable patterns are detected
//! - Multi-page detection must complete within 5 seconds for documents up to 20 pages

use image::{DynamicImage, GenericImageView};

use crate::services::cleanup_engine::types::{
    bbox_iou, normalize_bbox, CleanupShield, NormalizedBBox, ShieldType,
};

/// Configuration for multi-page strip detection
#[derive(Debug, Clone)]
pub struct MultiPageConfig {
    /// Height of header strip as fraction of page height (default: 0.08 = 8%)
    pub header_strip_height: f64,
    /// Height of footer strip as fraction of page height (default: 0.08 = 8%)
    pub footer_strip_height: f64,
    /// Minimum similarity threshold for considering strips as matching (0.0-1.0)
    pub similarity_threshold: f64,
    /// Base confidence for single-page detection
    pub base_confidence: f64,
    /// Maximum confidence boost for multi-page detection
    pub max_confidence_boost: f64,
    /// IoU threshold for considering two shields as the same region
    pub iou_threshold: f64,
}

impl Default for MultiPageConfig {
    fn default() -> Self {
        Self {
            header_strip_height: 0.08,
            footer_strip_height: 0.08,
            similarity_threshold: 0.85,
            base_confidence: 0.65,
            max_confidence_boost: 0.25,
            iou_threshold: 0.7,
        }
    }
}

/// Result of extracting a strip from a page
#[derive(Debug, Clone)]
pub struct StripData {
    /// Normalized bounding box of the strip
    pub bbox: NormalizedBBox,
    /// Mean pixel intensity (0-255)
    pub mean_intensity: f64,
    /// Pixel variance (measure of content complexity)
    pub variance: f64,
    /// Whether the strip appears to have content (not blank)
    pub has_content: bool,
}

/// Result of multi-page strip analysis
#[derive(Debug, Clone)]
pub struct MultiPageStripResult {
    /// Detected header shields with boosted confidence
    pub header_shields: Vec<CleanupShield>,
    /// Detected footer shields with boosted confidence
    pub footer_shields: Vec<CleanupShield>,
    /// Number of pages analyzed
    pub pages_analyzed: usize,
    /// Number of pages with matching header pattern
    pub header_match_count: usize,
    /// Number of pages with matching footer pattern
    pub footer_match_count: usize,
}

/// Extract top strip data from an image
///
/// Extracts pixel statistics from the top portion of the image
/// to identify potential header regions.
///
/// # Arguments
///
/// * `img` - The image to analyze
/// * `strip_height_ratio` - Height of strip as fraction of image height (0.0-1.0)
///
/// # Returns
///
/// `StripData` containing statistics about the top strip
#[must_use]
pub fn extract_top_strip(img: &DynamicImage, strip_height_ratio: f64) -> StripData {
    let (width, height) = img.dimensions();
    let strip_height = ((f64::from(height) * strip_height_ratio).round() as u32).max(1);
    
    let bbox = normalize_bbox(0, 0, width, strip_height, width, height);
    let (mean_intensity, variance) = calculate_strip_statistics(img, 0, 0, width, strip_height);
    
    StripData {
        bbox,
        mean_intensity,
        variance,
        // Consider strip as having content if variance is above threshold
        // Low variance (< 100) suggests blank/uniform region
        has_content: variance > 100.0,
    }
}

/// Extract bottom strip data from an image
///
/// Extracts pixel statistics from the bottom portion of the image
/// to identify potential footer regions.
///
/// # Arguments
///
/// * `img` - The image to analyze
/// * `strip_height_ratio` - Height of strip as fraction of image height (0.0-1.0)
///
/// # Returns
///
/// `StripData` containing statistics about the bottom strip
#[must_use]
pub fn extract_bottom_strip(img: &DynamicImage, strip_height_ratio: f64) -> StripData {
    let (width, height) = img.dimensions();
    let strip_height = ((f64::from(height) * strip_height_ratio).round() as u32).max(1);
    let strip_y = height.saturating_sub(strip_height);
    
    let bbox = normalize_bbox(0, strip_y, width, strip_height, width, height);
    let (mean_intensity, variance) = calculate_strip_statistics(img, 0, strip_y, width, strip_height);
    
    StripData {
        bbox,
        mean_intensity,
        variance,
        has_content: variance > 100.0,
    }
}

/// Calculate pixel statistics for a region
///
/// Computes mean intensity and variance for the specified region.
fn calculate_strip_statistics(
    img: &DynamicImage,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> (f64, f64) {
    if width == 0 || height == 0 {
        return (0.0, 0.0);
    }

    let gray = img.to_luma8();
    let mut pixel_values = Vec::new();

    let end_x = (x + width).min(gray.width());
    let end_y = (y + height).min(gray.height());

    for py in y..end_y {
        for px in x..end_x {
            pixel_values.push(gray.get_pixel(px, py)[0]);
        }
    }

    if pixel_values.is_empty() {
        return (0.0, 0.0);
    }

    // Calculate mean
    #[allow(clippy::cast_precision_loss)]
    let mean = pixel_values.iter().map(|&v| f64::from(v)).sum::<f64>() / pixel_values.len() as f64;

    // Calculate variance
    #[allow(clippy::cast_precision_loss)]
    let variance = pixel_values
        .iter()
        .map(|&v| {
            let diff = f64::from(v) - mean;
            diff * diff
        })
        .sum::<f64>()
        / pixel_values.len() as f64;

    (mean, variance)
}

/// Compare two strips for similarity
///
/// Determines if two strips are similar based on their pixel statistics.
/// Strips are considered similar if their mean intensities and variances
/// are within acceptable thresholds.
///
/// # Arguments
///
/// * `strip1` - First strip data
/// * `strip2` - Second strip data
/// * `threshold` - Similarity threshold (0.0-1.0)
///
/// # Returns
///
/// `true` if strips are considered similar
#[must_use]
pub fn strips_are_similar(strip1: &StripData, strip2: &StripData, threshold: f64) -> bool {
    // Both strips should have similar content status
    if strip1.has_content != strip2.has_content {
        return false;
    }
    
    // If both are blank, consider them similar
    if !strip1.has_content && !strip2.has_content {
        return true;
    }
    
    // Compare mean intensities (normalized to 0-1 range)
    let mean_diff = (strip1.mean_intensity - strip2.mean_intensity).abs() / 255.0;
    
    // Compare variances (use ratio for scale-invariant comparison)
    let max_var = strip1.variance.max(strip2.variance);
    let min_var = strip1.variance.min(strip2.variance);
    let variance_ratio = if max_var > 0.0 { min_var / max_var } else { 1.0 };
    
    // Combined similarity score
    let mean_similarity = 1.0 - mean_diff;
    let combined_similarity = (mean_similarity + variance_ratio) / 2.0;
    
    combined_similarity >= threshold
}

/// Calculate confidence boost based on match ratio
///
/// Computes a confidence boost factor based on how many pages
/// have matching patterns. More matches = higher confidence.
///
/// # Arguments
///
/// * `match_count` - Number of pages with matching pattern
/// * `total_pages` - Total number of pages analyzed
/// * `max_boost` - Maximum confidence boost (0.0-1.0)
///
/// # Returns
///
/// Confidence boost value (0.0 to max_boost)
///
/// # Requirements
///
/// Validates: Requirement 7.2 (higher confidence for stable patterns)
#[must_use]
pub fn calculate_confidence_boost(match_count: usize, total_pages: usize, max_boost: f64) -> f64 {
    if total_pages <= 1 || match_count <= 1 {
        return 0.0;
    }
    
    // Match ratio: what fraction of pages have the pattern
    #[allow(clippy::cast_precision_loss)]
    let match_ratio = match_count as f64 / total_pages as f64;
    
    // Scale boost by match ratio
    // Full boost when all pages match, partial boost for partial matches
    match_ratio * max_boost
}

/// Detect repetitive strips across multiple page images
///
/// Analyzes multiple page images to find repetitive header and footer patterns.
/// When stable patterns are detected across pages, shields are created with
/// boosted confidence scores.
///
/// # Arguments
///
/// * `images` - Slice of page images to analyze
/// * `config` - Configuration for detection parameters
///
/// # Returns
///
/// `MultiPageStripResult` containing detected shields and match statistics
///
/// # Requirements
///
/// - **Requirement 7.1**: Compares top and bottom strips across pages
/// - **Requirement 7.2**: Creates shields with higher confidence for stable patterns
///
/// # Performance
///
/// Designed to complete within 5 seconds for documents up to 20 pages.
#[must_use]
pub fn detect_multi_page_strips(
    images: &[&DynamicImage],
    config: &MultiPageConfig,
) -> MultiPageStripResult {
    if images.is_empty() {
        return MultiPageStripResult {
            header_shields: vec![],
            footer_shields: vec![],
            pages_analyzed: 0,
            header_match_count: 0,
            footer_match_count: 0,
        };
    }

    let pages_analyzed = images.len();
    
    // Extract strips from all pages
    let header_strips: Vec<StripData> = images
        .iter()
        .map(|img| extract_top_strip(img, config.header_strip_height))
        .collect();
    
    let footer_strips: Vec<StripData> = images
        .iter()
        .map(|img| extract_bottom_strip(img, config.footer_strip_height))
        .collect();
    
    // Use first page as reference for comparison
    let reference_header = &header_strips[0];
    let reference_footer = &footer_strips[0];
    
    // Count matching headers
    let header_match_count = header_strips
        .iter()
        .filter(|strip| strips_are_similar(reference_header, strip, config.similarity_threshold))
        .count();
    
    // Count matching footers
    let footer_match_count = footer_strips
        .iter()
        .filter(|strip| strips_are_similar(reference_footer, strip, config.similarity_threshold))
        .count();
    
    // Create shields with boosted confidence
    let mut header_shields = Vec::new();
    let mut footer_shields = Vec::new();
    
    // Only create header shield if pattern is found on multiple pages and has content
    if header_match_count > 1 && reference_header.has_content {
        let confidence_boost = calculate_confidence_boost(
            header_match_count,
            pages_analyzed,
            config.max_confidence_boost,
        );
        let final_confidence = (config.base_confidence + confidence_boost).min(1.0);
        
        header_shields.push(CleanupShield::auto_detected(
            ShieldType::RepetitiveHeader,
            reference_header.bbox,
            final_confidence,
            format!(
                "Repetitive header detected across {}/{} pages",
                header_match_count, pages_analyzed
            ),
        ));
    }
    
    // Only create footer shield if pattern is found on multiple pages and has content
    if footer_match_count > 1 && reference_footer.has_content {
        let confidence_boost = calculate_confidence_boost(
            footer_match_count,
            pages_analyzed,
            config.max_confidence_boost,
        );
        let final_confidence = (config.base_confidence + confidence_boost).min(1.0);
        
        footer_shields.push(CleanupShield::auto_detected(
            ShieldType::RepetitiveFooter,
            reference_footer.bbox,
            final_confidence,
            format!(
                "Repetitive footer detected across {}/{} pages",
                footer_match_count, pages_analyzed
            ),
        ));
    }
    
    MultiPageStripResult {
        header_shields,
        footer_shields,
        pages_analyzed,
        header_match_count,
        footer_match_count,
    }
}

/// Check if a shield from one page has a similar shield on another page
///
/// Used by the engine to determine if shields should receive confidence boosts.
///
/// # Arguments
///
/// * `shield` - The shield to check
/// * `other_shields` - Shields from another page
/// * `iou_threshold` - IoU threshold for considering shields as matching
///
/// # Returns
///
/// `true` if a similar shield exists in `other_shields`
#[must_use]
pub fn has_similar_shield_on_page(
    shield: &CleanupShield,
    other_shields: &[CleanupShield],
    iou_threshold: f64,
) -> bool {
    for other in other_shields {
        // Must be same shield type
        if shield.shield_type != other.shield_type {
            continue;
        }
        
        // Check IoU
        let iou = bbox_iou(&shield.normalized_bbox, &other.normalized_bbox);
        if iou >= iou_threshold {
            return true;
        }
    }
    false
}

/// Boost confidence for shields that appear across multiple pages
///
/// Takes shields detected on individual pages and boosts confidence
/// for those that appear consistently across pages.
///
/// # Arguments
///
/// * `page_shields` - Vector of shields detected on each page
/// * `config` - Configuration for detection parameters
///
/// # Returns
///
/// Vector of shields with boosted confidence for multi-page patterns
///
/// # Requirements
///
/// Validates: Requirement 7.2 (higher confidence for stable patterns)
#[must_use]
pub fn boost_multi_page_confidence(
    page_shields: &[Vec<CleanupShield>],
    config: &MultiPageConfig,
) -> Vec<CleanupShield> {
    if page_shields.is_empty() {
        return vec![];
    }
    
    let page_count = page_shields.len();
    if page_count == 1 {
        // Single page - no boost possible
        return page_shields[0].clone();
    }
    
    let mut result_shields = Vec::new();
    
    // Use first page shields as candidates
    for shield in &page_shields[0] {
        let mut match_count: usize = 1;
        
        // Count how many other pages have a similar shield
        for other_page_shields in page_shields.iter().skip(1) {
            if has_similar_shield_on_page(shield, other_page_shields, config.iou_threshold) {
                match_count += 1;
            }
        }
        
        // Create boosted shield
        let mut boosted_shield = shield.clone();
        if match_count > 1 {
            let confidence_boost = calculate_confidence_boost(
                match_count,
                page_count,
                config.max_confidence_boost,
            );
            boosted_shield.confidence = (boosted_shield.confidence + confidence_boost).min(1.0);
            boosted_shield.why_detected = format!(
                "{} (found on {}/{} pages)",
                boosted_shield.why_detected, match_count, page_count
            );
        }
        
        result_shields.push(boosted_shield);
    }
    
    result_shields
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::DynamicImage;

    #[test]
    fn test_extract_top_strip() {
        let img = DynamicImage::new_rgb8(100, 100);
        let strip = extract_top_strip(&img, 0.1);
        
        assert!((strip.bbox.x - 0.0).abs() < f64::EPSILON);
        assert!((strip.bbox.y - 0.0).abs() < f64::EPSILON);
        assert!((strip.bbox.width - 1.0).abs() < f64::EPSILON);
        assert!((strip.bbox.height - 0.1).abs() < f64::EPSILON);
    }

    #[test]
    fn test_extract_bottom_strip() {
        let img = DynamicImage::new_rgb8(100, 100);
        let strip = extract_bottom_strip(&img, 0.1);
        
        assert!((strip.bbox.x - 0.0).abs() < f64::EPSILON);
        assert!((strip.bbox.y - 0.9).abs() < f64::EPSILON);
        assert!((strip.bbox.width - 1.0).abs() < f64::EPSILON);
        assert!((strip.bbox.height - 0.1).abs() < f64::EPSILON);
    }

    #[test]
    fn test_strips_are_similar_identical() {
        let strip1 = StripData {
            bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            mean_intensity: 128.0,
            variance: 500.0,
            has_content: true,
        };
        let strip2 = strip1.clone();
        
        assert!(strips_are_similar(&strip1, &strip2, 0.85));
    }

    #[test]
    fn test_strips_are_similar_blank() {
        let strip1 = StripData {
            bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            mean_intensity: 255.0,
            variance: 0.0,
            has_content: false,
        };
        let strip2 = StripData {
            bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            mean_intensity: 255.0,
            variance: 50.0,
            has_content: false,
        };
        
        // Both blank strips should be considered similar
        assert!(strips_are_similar(&strip1, &strip2, 0.85));
    }

    #[test]
    fn test_strips_are_similar_different_content_status() {
        let strip1 = StripData {
            bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            mean_intensity: 128.0,
            variance: 500.0,
            has_content: true,
        };
        let strip2 = StripData {
            bbox: NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            mean_intensity: 128.0,
            variance: 50.0,
            has_content: false,
        };
        
        // Different content status = not similar
        assert!(!strips_are_similar(&strip1, &strip2, 0.85));
    }

    #[test]
    fn test_calculate_confidence_boost_single_page() {
        // Single page should have no boost
        assert!((calculate_confidence_boost(1, 1, 0.25) - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_calculate_confidence_boost_all_pages_match() {
        // All 5 pages match - should get full boost
        let boost = calculate_confidence_boost(5, 5, 0.25);
        assert!((boost - 0.25).abs() < f64::EPSILON);
    }

    #[test]
    fn test_calculate_confidence_boost_partial_match() {
        // 3 of 5 pages match - should get 60% of max boost
        let boost = calculate_confidence_boost(3, 5, 0.25);
        assert!((boost - 0.15).abs() < f64::EPSILON);
    }

    #[test]
    fn test_calculate_confidence_boost_no_matches() {
        // Only 1 match (reference page) - no boost
        let boost = calculate_confidence_boost(1, 5, 0.25);
        assert!((boost - 0.0).abs() < f64::EPSILON);
    }

    #[test]
    fn test_detect_multi_page_strips_empty() {
        let config = MultiPageConfig::default();
        let result = detect_multi_page_strips(&[], &config);
        
        assert!(result.header_shields.is_empty());
        assert!(result.footer_shields.is_empty());
        assert_eq!(result.pages_analyzed, 0);
    }

    #[test]
    fn test_detect_multi_page_strips_single_page() {
        let img = DynamicImage::new_rgb8(100, 100);
        let images: Vec<&DynamicImage> = vec![&img];
        let config = MultiPageConfig::default();
        
        let result = detect_multi_page_strips(&images, &config);
        
        // Single page - no multi-page patterns possible
        assert!(result.header_shields.is_empty());
        assert!(result.footer_shields.is_empty());
        assert_eq!(result.pages_analyzed, 1);
    }

    #[test]
    fn test_detect_multi_page_strips_uniform_pages() {
        // Create multiple uniform (blank) pages
        let img1 = DynamicImage::new_rgb8(100, 100);
        let img2 = DynamicImage::new_rgb8(100, 100);
        let img3 = DynamicImage::new_rgb8(100, 100);
        let images: Vec<&DynamicImage> = vec![&img1, &img2, &img3];
        let config = MultiPageConfig::default();
        
        let result = detect_multi_page_strips(&images, &config);
        
        // Uniform/blank pages should not create shields (no content)
        assert!(result.header_shields.is_empty());
        assert!(result.footer_shields.is_empty());
        assert_eq!(result.pages_analyzed, 3);
        // But they should still count as matching (all blank)
        assert_eq!(result.header_match_count, 3);
        assert_eq!(result.footer_match_count, 3);
    }

    #[test]
    fn test_has_similar_shield_on_page_matching() {
        let shield = CleanupShield::auto_detected(
            ShieldType::RepetitiveHeader,
            NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            0.7,
            "Test header".to_string(),
        );
        
        let other_shields = vec![
            CleanupShield::auto_detected(
                ShieldType::RepetitiveHeader,
                NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
                0.7,
                "Other header".to_string(),
            ),
        ];
        
        assert!(has_similar_shield_on_page(&shield, &other_shields, 0.7));
    }

    #[test]
    fn test_has_similar_shield_on_page_different_type() {
        let shield = CleanupShield::auto_detected(
            ShieldType::RepetitiveHeader,
            NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            0.7,
            "Test header".to_string(),
        );
        
        let other_shields = vec![
            CleanupShield::auto_detected(
                ShieldType::RepetitiveFooter, // Different type
                NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
                0.7,
                "Footer".to_string(),
            ),
        ];
        
        assert!(!has_similar_shield_on_page(&shield, &other_shields, 0.7));
    }

    #[test]
    fn test_has_similar_shield_on_page_different_position() {
        let shield = CleanupShield::auto_detected(
            ShieldType::RepetitiveHeader,
            NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            0.7,
            "Test header".to_string(),
        );
        
        let other_shields = vec![
            CleanupShield::auto_detected(
                ShieldType::RepetitiveHeader,
                NormalizedBBox::new(0.0, 0.5, 1.0, 0.1), // Different position
                0.7,
                "Other header".to_string(),
            ),
        ];
        
        assert!(!has_similar_shield_on_page(&shield, &other_shields, 0.7));
    }

    #[test]
    fn test_boost_multi_page_confidence_empty() {
        let config = MultiPageConfig::default();
        let result = boost_multi_page_confidence(&[], &config);
        assert!(result.is_empty());
    }

    #[test]
    fn test_boost_multi_page_confidence_single_page() {
        let config = MultiPageConfig::default();
        let shield = CleanupShield::auto_detected(
            ShieldType::RepetitiveHeader,
            NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            0.7,
            "Test header".to_string(),
        );
        let page_shields = vec![vec![shield.clone()]];
        
        let result = boost_multi_page_confidence(&page_shields, &config);
        
        // Single page - no boost, just return original
        assert_eq!(result.len(), 1);
        assert!((result[0].confidence - 0.7).abs() < f64::EPSILON);
    }

    #[test]
    fn test_boost_multi_page_confidence_matching_shields() {
        let config = MultiPageConfig::default();
        let shield1 = CleanupShield::auto_detected(
            ShieldType::RepetitiveHeader,
            NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            0.7,
            "Test header".to_string(),
        );
        let shield2 = CleanupShield::auto_detected(
            ShieldType::RepetitiveHeader,
            NormalizedBBox::new(0.0, 0.0, 1.0, 0.1),
            0.7,
            "Test header".to_string(),
        );
        let page_shields = vec![vec![shield1], vec![shield2]];
        
        let result = boost_multi_page_confidence(&page_shields, &config);
        
        // Both pages have matching shield - should get boost
        assert_eq!(result.len(), 1);
        // 2/2 pages match = 100% = full boost of 0.25
        // 0.7 + 0.25 = 0.95
        assert!((result[0].confidence - 0.95).abs() < f64::EPSILON);
        assert!(result[0].why_detected.contains("2/2 pages"));
    }
}

// ============================================================================
// Property-Based Tests for Multi-Page Confidence Boost
// ============================================================================

#[cfg(test)]
mod property_tests {
    use super::*;
    use proptest::prelude::*;

    // ========================================================================
    // Arbitrary Generators
    // ========================================================================

    /// Generate a valid normalized bounding box for header/footer regions
    fn arb_strip_bbox(is_header: bool) -> impl Strategy<Value = NormalizedBBox> {
        // Headers are at top (y near 0), footers at bottom (y near 0.9)
        let y_range = if is_header { 0.0..=0.05 } else { 0.85..=0.95 };
        
        (
            0.0..=0.1f64,      // x: typically full width, small offset
            y_range,           // y: top for header, bottom for footer
            0.8..=1.0f64,      // width: typically full width
            0.05..=0.15f64,    // height: strip height
        ).prop_map(|(x, y, width, height)| {
            NormalizedBBox::new(x, y, width, height)
        })
    }

    /// Generate a valid base confidence value
    fn arb_base_confidence() -> impl Strategy<Value = f64> {
        0.3..=0.8f64
    }

    /// Generate a valid max boost value
    fn arb_max_boost() -> impl Strategy<Value = f64> {
        0.1..=0.4f64
    }

    /// Generate a valid page count (2-20 pages for multi-page documents)
    fn arb_page_count() -> impl Strategy<Value = usize> {
        2..=20usize
    }

    /// Generate a match count that is valid for the given page count
    fn arb_match_count(page_count: usize) -> impl Strategy<Value = usize> {
        1..=page_count
    }

    /// Generate a MultiPageConfig with arbitrary but valid values
    fn arb_multi_page_config() -> impl Strategy<Value = MultiPageConfig> {
        (
            0.05..=0.15f64,    // header_strip_height
            0.05..=0.15f64,    // footer_strip_height
            0.7..=0.95f64,     // similarity_threshold
            0.3..=0.8f64,      // base_confidence
            0.1..=0.4f64,      // max_confidence_boost
            0.5..=0.9f64,      // iou_threshold
        ).prop_map(|(header_h, footer_h, sim_thresh, base_conf, max_boost, iou_thresh)| {
            MultiPageConfig {
                header_strip_height: header_h,
                footer_strip_height: footer_h,
                similarity_threshold: sim_thresh,
                base_confidence: base_conf,
                max_confidence_boost: max_boost,
                iou_threshold: iou_thresh,
            }
        })
    }

    /// Generate a CleanupShield for testing
    fn arb_cleanup_shield(shield_type: ShieldType, bbox: NormalizedBBox, confidence: f64) -> CleanupShield {
        CleanupShield::auto_detected(
            shield_type,
            bbox,
            confidence,
            format!("Test {:?} shield", shield_type),
        )
    }

    // ========================================================================
    // Feature: cleanup-engine, Property 9: Multi-Page Detection Confidence Boost
    // **Validates: Requirements 7.1, 7.2**
    // ========================================================================

    proptest! {
        #![proptest_config(ProptestConfig::with_cases(100))]

        // ====================================================================
        // Property 9.1: Single page detection has no confidence boost
        // 
        // For any single-page document, the confidence boost should be 0.0
        // because multi-page patterns cannot be detected with only one page.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// Single page documents should have no confidence boost since
        /// multi-page pattern detection requires N > 1 pages.
        #[test]
        fn single_page_has_no_boost(
            max_boost in arb_max_boost(),
        ) {
            // Single page = 1 match out of 1 total
            let boost = calculate_confidence_boost(1, 1, max_boost);
            
            prop_assert!(
                boost.abs() < f64::EPSILON,
                "Single page should have no boost, got {}",
                boost
            );
        }

        // ====================================================================
        // Property 9.2: Confidence boost is monotonically increasing with match count
        // 
        // For any multi-page document, as the number of pages with matching
        // patterns increases, the confidence boost should increase or stay the same.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// More pages matching the same pattern should result in higher
        /// or equal confidence boost (monotonically increasing).
        #[test]
        fn confidence_boost_monotonically_increasing(
            total_pages in 3..=20usize,
            max_boost in arb_max_boost(),
        ) {
            let mut prev_boost = 0.0;
            
            // Test increasing match counts from 1 to total_pages
            for match_count in 1..=total_pages {
                let boost = calculate_confidence_boost(match_count, total_pages, max_boost);
                
                prop_assert!(
                    boost >= prev_boost,
                    "Boost should be monotonically increasing: {} matches gave {} but {} matches gave {}",
                    match_count - 1, prev_boost, match_count, boost
                );
                
                prev_boost = boost;
            }
        }

        // ====================================================================
        // Property 9.3: More pages matching = higher confidence
        // 
        // For any two match counts where count_a > count_b (both > 1),
        // the confidence boost for count_a should be >= boost for count_b.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// Given the same total pages and max boost, a higher match count
        /// should always result in a higher or equal confidence boost.
        #[test]
        fn more_matches_means_higher_confidence(
            total_pages in 4..=20usize,
            match_count_low in 2..=10usize,
            match_count_high in 2..=10usize,
            max_boost in arb_max_boost(),
        ) {
            // Ensure we have valid match counts within total_pages
            let low = match_count_low.min(total_pages);
            let high = match_count_high.min(total_pages);
            
            // Skip if they're equal
            prop_assume!(low != high);
            
            let (smaller, larger) = if low < high { (low, high) } else { (high, low) };
            
            let boost_smaller = calculate_confidence_boost(smaller, total_pages, max_boost);
            let boost_larger = calculate_confidence_boost(larger, total_pages, max_boost);
            
            prop_assert!(
                boost_larger >= boost_smaller,
                "More matches ({}) should have >= boost than fewer matches ({}): {} vs {}",
                larger, smaller, boost_larger, boost_smaller
            );
        }

        // ====================================================================
        // Property 9.4: Confidence never exceeds 1.0
        // 
        // For any base confidence and boost combination, the final confidence
        // should never exceed 1.0 (clamped).
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// The final confidence score (base + boost) should never exceed 1.0,
        /// ensuring valid probability-like confidence values.
        #[test]
        fn confidence_never_exceeds_one(
            base_confidence in arb_base_confidence(),
            total_pages in 2..=20usize,
            match_count in 2..=20usize,
            max_boost in arb_max_boost(),
        ) {
            let actual_match_count = match_count.min(total_pages);
            let boost = calculate_confidence_boost(actual_match_count, total_pages, max_boost);
            let final_confidence = (base_confidence + boost).min(1.0);
            
            prop_assert!(
                final_confidence <= 1.0,
                "Final confidence should never exceed 1.0, got {}",
                final_confidence
            );
        }

        // ====================================================================
        // Property 9.5: Confidence boost is proportional to match ratio
        // 
        // The confidence boost should be proportional to the ratio of
        // matching pages to total pages.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// Confidence boost should scale linearly with the match ratio
        /// (match_count / total_pages).
        #[test]
        fn confidence_boost_proportional_to_match_ratio(
            total_pages in 2..=20usize,
            match_count in 2..=20usize,
            max_boost in arb_max_boost(),
        ) {
            let actual_match_count = match_count.min(total_pages);
            let boost = calculate_confidence_boost(actual_match_count, total_pages, max_boost);
            
            #[allow(clippy::cast_precision_loss)]
            let expected_ratio = actual_match_count as f64 / total_pages as f64;
            let expected_boost = expected_ratio * max_boost;
            
            prop_assert!(
                (boost - expected_boost).abs() < f64::EPSILON,
                "Boost {} should equal match_ratio * max_boost = {} * {} = {}",
                boost, expected_ratio, max_boost, expected_boost
            );
        }

        // ====================================================================
        // Property 9.6: Full match gives maximum boost
        // 
        // When all pages match (match_count == total_pages), the boost
        // should equal max_boost.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// When all pages have matching patterns, the confidence boost
        /// should equal the maximum configured boost.
        #[test]
        fn full_match_gives_max_boost(
            total_pages in 2..=20usize,
            max_boost in arb_max_boost(),
        ) {
            let boost = calculate_confidence_boost(total_pages, total_pages, max_boost);
            
            prop_assert!(
                (boost - max_boost).abs() < f64::EPSILON,
                "Full match should give max boost {}, got {}",
                max_boost, boost
            );
        }

        // ====================================================================
        // Property 9.7: Boost is non-negative
        // 
        // The confidence boost should always be >= 0.0.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// Confidence boost should never be negative.
        #[test]
        fn boost_is_non_negative(
            total_pages in 1..=20usize,
            match_count in 0..=20usize,
            max_boost in arb_max_boost(),
        ) {
            let actual_match_count = match_count.min(total_pages);
            let boost = calculate_confidence_boost(actual_match_count, total_pages, max_boost);
            
            prop_assert!(
                boost >= 0.0,
                "Boost should be non-negative, got {}",
                boost
            );
        }

        // ====================================================================
        // Property 9.8: boost_multi_page_confidence preserves shields on single page
        // 
        // For single-page documents, boost_multi_page_confidence should
        // return the original shields unchanged.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// Single page documents should have shields returned unchanged
        /// since no multi-page boost is possible.
        #[test]
        fn single_page_shields_unchanged(
            base_confidence in arb_base_confidence(),
        ) {
            let config = MultiPageConfig::default();
            let bbox = NormalizedBBox::new(0.0, 0.0, 1.0, 0.1);
            let shield = arb_cleanup_shield(ShieldType::RepetitiveHeader, bbox, base_confidence);
            let original_confidence = shield.confidence;
            
            let page_shields = vec![vec![shield]];
            let result = boost_multi_page_confidence(&page_shields, &config);
            
            prop_assert_eq!(result.len(), 1, "Should return exactly one shield");
            prop_assert!(
                (result[0].confidence - original_confidence).abs() < f64::EPSILON,
                "Single page shield confidence should be unchanged: {} vs {}",
                result[0].confidence, original_confidence
            );
        }

        // ====================================================================
        // Property 9.9: Multi-page matching shields get boosted confidence
        // 
        // When the same shield region appears on multiple pages, the
        // resulting confidence should be higher than the original.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// Shields that appear identically across multiple pages should
        /// have their confidence boosted above the single-page confidence.
        #[test]
        fn multi_page_matching_shields_get_boost(
            base_confidence in 0.3..=0.7f64,  // Leave room for boost
            page_count in 2..=10usize,
        ) {
            let config = MultiPageConfig::default();
            let bbox = NormalizedBBox::new(0.0, 0.0, 1.0, 0.1);
            
            // Create identical shields on all pages
            let page_shields: Vec<Vec<CleanupShield>> = (0..page_count)
                .map(|_| vec![arb_cleanup_shield(ShieldType::RepetitiveHeader, bbox, base_confidence)])
                .collect();
            
            let result = boost_multi_page_confidence(&page_shields, &config);
            
            prop_assert_eq!(result.len(), 1, "Should return exactly one shield");
            prop_assert!(
                result[0].confidence > base_confidence,
                "Multi-page shield confidence {} should be higher than base {}",
                result[0].confidence, base_confidence
            );
        }

        // ====================================================================
        // Property 9.10: Non-matching shields don't get boosted
        // 
        // Shields that don't appear on other pages should not receive
        // a confidence boost.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// Shields that only appear on one page (no matches on other pages)
        /// should not receive a confidence boost.
        #[test]
        fn non_matching_shields_no_boost(
            base_confidence in arb_base_confidence(),
        ) {
            let config = MultiPageConfig::default();
            
            // Create shields at different positions on each page (no overlap)
            let shield1 = arb_cleanup_shield(
                ShieldType::RepetitiveHeader,
                NormalizedBBox::new(0.0, 0.0, 0.3, 0.1),
                base_confidence,
            );
            let shield2 = arb_cleanup_shield(
                ShieldType::RepetitiveHeader,
                NormalizedBBox::new(0.7, 0.0, 0.3, 0.1),  // Different position
                base_confidence,
            );
            
            let page_shields = vec![vec![shield1], vec![shield2]];
            let result = boost_multi_page_confidence(&page_shields, &config);
            
            prop_assert_eq!(result.len(), 1, "Should return shields from first page");
            prop_assert!(
                (result[0].confidence - base_confidence).abs() < f64::EPSILON,
                "Non-matching shield confidence should be unchanged: {} vs {}",
                result[0].confidence, base_confidence
            );
        }

        // ====================================================================
        // Property 9.11: Boosted confidence is capped at 1.0
        // 
        // Even with high base confidence and full page matches, the
        // final confidence should never exceed 1.0.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// The boosted confidence should be capped at 1.0 to maintain
        /// valid probability semantics.
        #[test]
        fn boosted_confidence_capped_at_one(
            page_count in 2..=10usize,
        ) {
            let config = MultiPageConfig {
                max_confidence_boost: 0.5,  // High boost
                ..MultiPageConfig::default()
            };
            let bbox = NormalizedBBox::new(0.0, 0.0, 1.0, 0.1);
            
            // Create shields with high base confidence
            let page_shields: Vec<Vec<CleanupShield>> = (0..page_count)
                .map(|_| vec![arb_cleanup_shield(ShieldType::RepetitiveHeader, bbox, 0.9)])
                .collect();
            
            let result = boost_multi_page_confidence(&page_shields, &config);
            
            prop_assert_eq!(result.len(), 1, "Should return exactly one shield");
            prop_assert!(
                result[0].confidence <= 1.0,
                "Boosted confidence should not exceed 1.0, got {}",
                result[0].confidence
            );
        }

        // ====================================================================
        // Property 9.12: Different shield types don't match
        // 
        // Shields of different types at the same position should not
        // be considered matches for confidence boosting.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// Only shields of the same type should be considered for
        /// multi-page matching and confidence boosting.
        #[test]
        fn different_shield_types_dont_match(
            base_confidence in arb_base_confidence(),
        ) {
            let config = MultiPageConfig::default();
            let bbox = NormalizedBBox::new(0.0, 0.0, 1.0, 0.1);
            
            // Same position but different types
            let shield1 = arb_cleanup_shield(ShieldType::RepetitiveHeader, bbox, base_confidence);
            let shield2 = arb_cleanup_shield(ShieldType::RepetitiveFooter, bbox, base_confidence);
            
            let page_shields = vec![vec![shield1], vec![shield2]];
            let result = boost_multi_page_confidence(&page_shields, &config);
            
            prop_assert_eq!(result.len(), 1, "Should return shields from first page");
            prop_assert!(
                (result[0].confidence - base_confidence).abs() < f64::EPSILON,
                "Different type shields should not boost: {} vs {}",
                result[0].confidence, base_confidence
            );
        }

        // ====================================================================
        // Property 9.13: Empty input returns empty output
        // 
        // boost_multi_page_confidence with empty input should return empty.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// Empty input should produce empty output without errors.
        #[test]
        fn empty_input_returns_empty(_seed in 0..100u32) {
            let config = MultiPageConfig::default();
            let result = boost_multi_page_confidence(&[], &config);
            
            prop_assert!(
                result.is_empty(),
                "Empty input should return empty output"
            );
        }

        // ====================================================================
        // Property 9.14: Partial matches give proportional boost
        // 
        // If a shield matches on some but not all pages, the boost should
        // be proportional to the match ratio.
        // ====================================================================
        
        /// **Validates: Requirements 7.1, 7.2**
        /// 
        /// Partial page matches should result in proportionally scaled
        /// confidence boost.
        #[test]
        fn partial_matches_proportional_boost(
            base_confidence in 0.3..=0.6f64,
            matching_pages in 2..=5usize,
            non_matching_pages in 1..=5usize,
        ) {
            let config = MultiPageConfig::default();
            let total_pages = matching_pages + non_matching_pages;
            let matching_bbox = NormalizedBBox::new(0.0, 0.0, 1.0, 0.1);
            let non_matching_bbox = NormalizedBBox::new(0.5, 0.5, 0.3, 0.3);  // Different position
            
            // Create matching shields on some pages
            let mut page_shields: Vec<Vec<CleanupShield>> = (0..matching_pages)
                .map(|_| vec![arb_cleanup_shield(ShieldType::RepetitiveHeader, matching_bbox, base_confidence)])
                .collect();
            
            // Add non-matching shields on remaining pages
            for _ in 0..non_matching_pages {
                page_shields.push(vec![arb_cleanup_shield(
                    ShieldType::RepetitiveHeader,
                    non_matching_bbox,
                    base_confidence,
                )]);
            }
            
            let result = boost_multi_page_confidence(&page_shields, &config);
            
            // Calculate expected boost
            #[allow(clippy::cast_precision_loss)]
            let expected_boost = (matching_pages as f64 / total_pages as f64) * config.max_confidence_boost;
            let expected_confidence = (base_confidence + expected_boost).min(1.0);
            
            prop_assert_eq!(result.len(), 1, "Should return shields from first page");
            prop_assert!(
                (result[0].confidence - expected_confidence).abs() < 0.001,
                "Partial match boost should be proportional: expected {}, got {}",
                expected_confidence, result[0].confidence
            );
        }
    }
}
