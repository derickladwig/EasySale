//! Repetitive region detection for the Document Cleanup Engine

use image::{DynamicImage, GenericImageView};

use crate::services::cleanup_engine::types::{
    normalize_bbox, CleanupShield, ShieldType,
};

/// Detect repetitive header/footer regions in an image
///
/// Checks top 5% and bottom 5% of image for low-variance regions
/// that typically indicate repetitive content like page numbers.
#[must_use]
pub fn detect_repetitive_regions(img: &DynamicImage) -> Vec<CleanupShield> {
    let (width, height) = img.dimensions();
    let mut shields = Vec::new();

    // Check top header (full width, 5% of height)
    let header_height = height.saturating_mul(5) / 100;

    if is_repetitive_region(img, 0, 0, width, header_height) {
        let bbox = normalize_bbox(0, 0, width, header_height, width, height);
        shields.push(CleanupShield::auto_detected(
            ShieldType::RepetitiveHeader,
            bbox,
            0.70,
            "Repetitive header detected (e.g., page number)".to_string(),
        ));
    }

    // Check bottom footer (full width, 5% of height)
    let footer_y = height.saturating_sub(header_height);

    if is_repetitive_region(img, 0, footer_y, width, header_height) {
        let bbox = normalize_bbox(0, footer_y, width, header_height, width, height);
        shields.push(CleanupShield::auto_detected(
            ShieldType::RepetitiveFooter,
            bbox,
            0.70,
            "Repetitive footer detected (e.g., company tagline)".to_string(),
        ));
    }

    shields
}

/// Check if a region is repetitive (low information content)
///
/// Low variance (< 500) suggests repetitive content.
fn is_repetitive_region(img: &DynamicImage, x: u32, y: u32, width: u32, height: u32) -> bool {
    if width == 0 || height == 0 {
        return false;
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
        return false;
    }

    // Calculate variance (repetitive regions have low variance)
    #[allow(clippy::cast_precision_loss)]
    let mean = pixel_values.iter().map(|&v| f64::from(v)).sum::<f64>() / pixel_values.len() as f64;
    #[allow(clippy::cast_precision_loss)]
    let variance = pixel_values
        .iter()
        .map(|&v| {
            let diff = f64::from(v) - mean;
            diff * diff
        })
        .sum::<f64>()
        / pixel_values.len() as f64;

    // Low variance suggests repetitive content
    variance < 500.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::DynamicImage;

    #[test]
    fn test_detect_repetitive_uniform_image() {
        // A uniform image should detect repetitive regions
        let img = DynamicImage::new_rgb8(100, 100);
        let shields = detect_repetitive_regions(&img);
        // Uniform black image has low variance, so should detect
        assert!(!shields.is_empty());
    }

    #[test]
    fn test_is_repetitive_region_zero_dimensions() {
        let img = DynamicImage::new_rgb8(100, 100);
        assert!(!is_repetitive_region(&img, 0, 0, 0, 0));
    }
}
