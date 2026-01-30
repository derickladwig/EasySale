//! Logo detection for the Document Cleanup Engine

use image::{DynamicImage, GenericImageView};

use crate::services::cleanup_engine::types::{
    normalize_bbox, CleanupShield, ShieldType,
};

/// Detect logo regions in an image
///
/// Checks top-left and top-right corners for high-variance regions
/// that typically indicate logo presence.
#[must_use]
pub fn detect_logos(img: &DynamicImage) -> Vec<CleanupShield> {
    let (width, height) = img.dimensions();
    let mut shields = Vec::new();

    // Check top-left corner (20% of width, 15% of height)
    let tl_width = width.saturating_mul(20) / 100;
    let tl_height = height.saturating_mul(15) / 100;

    if is_logo_region(img, 0, 0, tl_width, tl_height) {
        let bbox = normalize_bbox(0, 0, tl_width, tl_height, width, height);
        shields.push(CleanupShield::auto_detected(
            ShieldType::Logo,
            bbox,
            0.75,
            "Logo detected in top-left corner".to_string(),
        ));
    }

    // Check top-right corner
    let tr_x = width.saturating_sub(tl_width);

    if is_logo_region(img, tr_x, 0, tl_width, tl_height) {
        let bbox = normalize_bbox(tr_x, 0, tl_width, tl_height, width, height);
        shields.push(CleanupShield::auto_detected(
            ShieldType::Logo,
            bbox,
            0.75,
            "Logo detected in top-right corner".to_string(),
        ));
    }

    shields
}

/// Check if a region likely contains a logo
///
/// Uses pixel variance to identify complex content.
/// High variance (> 2000) suggests logo presence.
fn is_logo_region(img: &DynamicImage, x: u32, y: u32, width: u32, height: u32) -> bool {
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

    // Calculate variance (logos typically have high variance)
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

    // High variance suggests complex content like a logo
    variance > 2000.0
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::DynamicImage;

    #[test]
    fn test_detect_logos_empty_image() {
        let img = DynamicImage::new_rgb8(100, 100);
        let shields = detect_logos(&img);
        // Empty/uniform image should not detect logos
        assert!(shields.is_empty());
    }

    #[test]
    fn test_is_logo_region_zero_dimensions() {
        let img = DynamicImage::new_rgb8(100, 100);
        assert!(!is_logo_region(&img, 0, 0, 0, 0));
        assert!(!is_logo_region(&img, 0, 0, 0, 10));
        assert!(!is_logo_region(&img, 0, 0, 10, 0));
    }
}
