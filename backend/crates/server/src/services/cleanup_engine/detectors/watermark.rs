//! Watermark detection for the Document Cleanup Engine

use image::{DynamicImage, GenericImageView};

use crate::services::cleanup_engine::types::{
    normalize_bbox, CleanupShield, ShieldType,
};

/// Detect watermark regions in an image
///
/// Checks center region for semi-transparent watermarks
/// characterized by mid-range pixel values.
#[must_use]
pub fn detect_watermarks(img: &DynamicImage) -> Vec<CleanupShield> {
    let (width, height) = img.dimensions();
    let mut shields = Vec::new();

    // Check center region (40% of width, 40% of height)
    let center_x = width.saturating_mul(30) / 100;
    let center_y = height.saturating_mul(30) / 100;
    let center_w = width.saturating_mul(40) / 100;
    let center_h = height.saturating_mul(40) / 100;

    if is_watermark_region(img, center_x, center_y, center_w, center_h) {
        let bbox = normalize_bbox(center_x, center_y, center_w, center_h, width, height);
        shields.push(CleanupShield::auto_detected(
            ShieldType::Watermark,
            bbox,
            0.65,
            "Watermark detected in center region".to_string(),
        ));
    }

    shields
}

/// Check if a region likely contains a watermark
///
/// Watermarks typically have low contrast (mid-range pixel values).
/// High mid-range ratio (> 60%) suggests watermark presence.
fn is_watermark_region(img: &DynamicImage, x: u32, y: u32, width: u32, height: u32) -> bool {
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

    // Watermarks typically have low contrast (mid-range pixel values)
    #[allow(clippy::cast_precision_loss)]
    let mean = pixel_values.iter().map(|&v| f64::from(v)).sum::<f64>() / pixel_values.len() as f64;
    let in_mid_range = pixel_values.iter().filter(|&&v| v > 100 && v < 200).count();

    #[allow(clippy::cast_precision_loss)]
    let mid_range_ratio = in_mid_range as f64 / pixel_values.len() as f64;

    // High mid-range ratio suggests watermark
    mid_range_ratio > 0.6 && mean > 120.0 && mean < 180.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::DynamicImage;

    #[test]
    fn test_detect_watermarks_empty_image() {
        let img = DynamicImage::new_rgb8(100, 100);
        let shields = detect_watermarks(&img);
        // Empty/black image should not detect watermarks
        assert!(shields.is_empty());
    }

    #[test]
    fn test_is_watermark_region_zero_dimensions() {
        let img = DynamicImage::new_rgb8(100, 100);
        assert!(!is_watermark_region(&img, 0, 0, 0, 0));
    }
}
