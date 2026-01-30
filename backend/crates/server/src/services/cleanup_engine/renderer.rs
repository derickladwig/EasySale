//! Overlay Renderer for Document Cleanup Engine
//!
//! Renders semi-transparent colored overlays on document images to visualize
//! cleanup shields. Supports distinct colors per shield type, zone boundaries,
//! and critical zone intersection highlighting.
//!
//! # Features
//! - Semi-transparent colored overlays per shield type
//! - Bounding box borders
//! - Zone boundary visualization
//! - Critical zone intersection highlighting
//! - Optional legend

use image::{Rgba, RgbaImage};
#[allow(unused_imports)]
use image::DynamicImage;
use std::path::Path;

use super::types::{CleanupShield, NormalizedBBox, ShieldType};

/// Overlay rendering error
#[derive(Debug, thiserror::Error)]
pub enum RendererError {
    #[error("Failed to load image: {0}")]
    ImageLoadError(String),

    #[error("Failed to save image: {0}")]
    ImageSaveError(String),

    #[error("Invalid image dimensions")]
    InvalidDimensions,
}

/// Color configuration for shield types (RGBA)
#[derive(Debug, Clone, Copy)]
pub struct ShieldColor {
    pub fill: Rgba<u8>,
    pub border: Rgba<u8>,
}

impl ShieldColor {
    const fn new(r: u8, g: u8, b: u8, fill_alpha: u8, border_alpha: u8) -> Self {
        Self {
            fill: Rgba([r, g, b, fill_alpha]),
            border: Rgba([r, g, b, border_alpha]),
        }
    }
}


/// Get color for a shield type
fn get_shield_color(shield_type: ShieldType) -> ShieldColor {
    match shield_type {
        ShieldType::Logo => ShieldColor::new(59, 130, 246, 128, 200),           // Blue
        ShieldType::Watermark => ShieldColor::new(234, 179, 8, 128, 200),       // Yellow
        ShieldType::RepetitiveHeader => ShieldColor::new(107, 114, 128, 128, 200), // Gray
        ShieldType::RepetitiveFooter => ShieldColor::new(107, 114, 128, 128, 200), // Gray
        ShieldType::Stamp => ShieldColor::new(249, 115, 22, 128, 200),          // Orange
        ShieldType::UserDefined => ShieldColor::new(34, 197, 94, 128, 200),     // Green
        ShieldType::VendorSpecific => ShieldColor::new(168, 85, 247, 128, 200), // Purple
        ShieldType::TemplateSpecific => ShieldColor::new(6, 182, 212, 128, 200), // Cyan
    }
}

/// Critical zone highlight color (red)
const CRITICAL_ZONE_COLOR: ShieldColor = ShieldColor::new(239, 68, 68, 64, 180);

/// Zone boundary color (dark gray)
const ZONE_BOUNDARY_COLOR: Rgba<u8> = Rgba([75, 85, 99, 200]);

/// Overlay renderer configuration
#[derive(Debug, Clone)]
pub struct RendererConfig {
    /// Border width in pixels
    pub border_width: u32,
    /// Whether to include a legend
    pub include_legend: bool,
    /// Legend position (top-left offset)
    pub legend_x: u32,
    pub legend_y: u32,
}

impl Default for RendererConfig {
    fn default() -> Self {
        Self {
            border_width: 2,
            include_legend: true,
            legend_x: 10,
            legend_y: 10,
        }
    }
}

/// Overlay renderer
pub struct OverlayRenderer {
    config: RendererConfig,
}

impl OverlayRenderer {
    /// Create a new renderer with default config
    #[must_use]
    pub fn new() -> Self {
        Self {
            config: RendererConfig::default(),
        }
    }

    /// Create a new renderer with custom config
    #[must_use]
    pub fn with_config(config: RendererConfig) -> Self {
        Self { config }
    }


    /// Render shields overlay on an image
    ///
    /// # Arguments
    /// * `image_path` - Path to the source image
    /// * `shields` - Shields to render
    /// * `output_path` - Path to save the overlay image
    /// * `zones` - Optional zone boundaries to render
    /// * `critical_zones` - Zones that trigger highlighting when overlapped
    ///
    /// # Errors
    /// Returns `RendererError` if image loading or saving fails.
    pub fn render_overlay(
        &self,
        image_path: &Path,
        shields: &[CleanupShield],
        output_path: &Path,
        zones: &[(String, NormalizedBBox)],
        critical_zones: &[(String, NormalizedBBox)],
    ) -> Result<(), RendererError> {
        // Load image
        let img = image::open(image_path)
            .map_err(|e| RendererError::ImageLoadError(e.to_string()))?;

        let (width, height) = (img.width(), img.height());
        if width == 0 || height == 0 {
            return Err(RendererError::InvalidDimensions);
        }

        // Convert to RGBA
        let mut overlay = img.to_rgba8();

        // Draw zone boundaries first (underneath shields)
        for (_, zone_bbox) in zones {
            self.draw_zone_boundary(&mut overlay, zone_bbox, width, height);
        }

        // Draw shields
        for shield in shields {
            let color = get_shield_color(shield.shield_type);
            self.draw_shield(&mut overlay, &shield.normalized_bbox, &color, width, height);

            // Check for critical zone overlap and highlight
            for (_, critical_bbox) in critical_zones {
                if self.bboxes_overlap(&shield.normalized_bbox, critical_bbox) {
                    self.draw_shield(&mut overlay, &shield.normalized_bbox, &CRITICAL_ZONE_COLOR, width, height);
                }
            }
        }

        // Draw legend if enabled
        if self.config.include_legend {
            self.draw_legend(&mut overlay, shields);
        }

        // Save output
        overlay
            .save(output_path)
            .map_err(|e| RendererError::ImageSaveError(e.to_string()))?;

        Ok(())
    }

    /// Draw a shield overlay
    fn draw_shield(
        &self,
        img: &mut RgbaImage,
        bbox: &NormalizedBBox,
        color: &ShieldColor,
        img_width: u32,
        img_height: u32,
    ) {
        let x = (bbox.x * f64::from(img_width)).round() as u32;
        let y = (bbox.y * f64::from(img_height)).round() as u32;
        let w = (bbox.width * f64::from(img_width)).round() as u32;
        let h = (bbox.height * f64::from(img_height)).round() as u32;

        // Draw filled rectangle with alpha blending
        for py in y..y.saturating_add(h).min(img_height) {
            for px in x..x.saturating_add(w).min(img_width) {
                let pixel = img.get_pixel_mut(px, py);
                *pixel = blend_pixels(*pixel, color.fill);
            }
        }

        // Draw border
        self.draw_rect_border(img, x, y, w, h, color.border, img_width, img_height);
    }


    /// Draw zone boundary (dashed outline)
    fn draw_zone_boundary(
        &self,
        img: &mut RgbaImage,
        bbox: &NormalizedBBox,
        img_width: u32,
        img_height: u32,
    ) {
        let x = (bbox.x * f64::from(img_width)).round() as u32;
        let y = (bbox.y * f64::from(img_height)).round() as u32;
        let w = (bbox.width * f64::from(img_width)).round() as u32;
        let h = (bbox.height * f64::from(img_height)).round() as u32;

        self.draw_rect_border(img, x, y, w, h, ZONE_BOUNDARY_COLOR, img_width, img_height);
    }

    /// Draw rectangle border
    fn draw_rect_border(
        &self,
        img: &mut RgbaImage,
        x: u32,
        y: u32,
        w: u32,
        h: u32,
        color: Rgba<u8>,
        img_width: u32,
        img_height: u32,
    ) {
        let border = self.config.border_width;

        // Top edge
        for py in y..y.saturating_add(border).min(img_height) {
            for px in x..x.saturating_add(w).min(img_width) {
                let pixel = img.get_pixel_mut(px, py);
                *pixel = blend_pixels(*pixel, color);
            }
        }

        // Bottom edge
        let bottom_y = y.saturating_add(h).saturating_sub(border);
        for py in bottom_y..y.saturating_add(h).min(img_height) {
            for px in x..x.saturating_add(w).min(img_width) {
                let pixel = img.get_pixel_mut(px, py);
                *pixel = blend_pixels(*pixel, color);
            }
        }

        // Left edge
        for py in y..y.saturating_add(h).min(img_height) {
            for px in x..x.saturating_add(border).min(img_width) {
                let pixel = img.get_pixel_mut(px, py);
                *pixel = blend_pixels(*pixel, color);
            }
        }

        // Right edge
        let right_x = x.saturating_add(w).saturating_sub(border);
        for py in y..y.saturating_add(h).min(img_height) {
            for px in right_x..x.saturating_add(w).min(img_width) {
                let pixel = img.get_pixel_mut(px, py);
                *pixel = blend_pixels(*pixel, color);
            }
        }
    }

    /// Check if two bboxes overlap
    fn bboxes_overlap(&self, a: &NormalizedBBox, b: &NormalizedBBox) -> bool {
        let a_right = a.x + a.width;
        let a_bottom = a.y + a.height;
        let b_right = b.x + b.width;
        let b_bottom = b.y + b.height;

        a.x < b_right && a_right > b.x && a.y < b_bottom && a_bottom > b.y
    }

    /// Draw legend showing shield types and colors
    fn draw_legend(&self, img: &mut RgbaImage, shields: &[CleanupShield]) {
        // Collect unique shield types
        let mut types: Vec<ShieldType> = shields.iter().map(|s| s.shield_type).collect();
        types.sort_by_key(|t| *t as u8);
        types.dedup();

        if types.is_empty() {
            return;
        }

        let legend_x = self.config.legend_x;
        let mut legend_y = self.config.legend_y;
        let box_size = 16u32;
        let spacing = 4u32;

        for shield_type in types {
            let color = get_shield_color(shield_type);

            // Draw color box
            for py in legend_y..legend_y.saturating_add(box_size).min(img.height()) {
                for px in legend_x..legend_x.saturating_add(box_size).min(img.width()) {
                    let pixel = img.get_pixel_mut(px, py);
                    *pixel = blend_pixels(*pixel, color.fill);
                }
            }

            // Draw border around color box
            self.draw_rect_border(
                img,
                legend_x,
                legend_y,
                box_size,
                box_size,
                color.border,
                img.width(),
                img.height(),
            );

            legend_y = legend_y.saturating_add(box_size).saturating_add(spacing);
        }
    }
}

impl Default for OverlayRenderer {
    fn default() -> Self {
        Self::new()
    }
}

/// Blend two pixels with alpha compositing
fn blend_pixels(base: Rgba<u8>, overlay: Rgba<u8>) -> Rgba<u8> {
    let base_a = f32::from(base[3]) / 255.0;
    let overlay_a = f32::from(overlay[3]) / 255.0;

    let out_a = overlay_a + base_a * (1.0 - overlay_a);
    if out_a == 0.0 {
        return Rgba([0, 0, 0, 0]);
    }

    let blend = |b: u8, o: u8| -> u8 {
        let b_f = f32::from(b) / 255.0;
        let o_f = f32::from(o) / 255.0;
        let result = (o_f * overlay_a + b_f * base_a * (1.0 - overlay_a)) / out_a;
        (result * 255.0).round() as u8
    };

    Rgba([
        blend(base[0], overlay[0]),
        blend(base[1], overlay[1]),
        blend(base[2], overlay[2]),
        (out_a * 255.0).round() as u8,
    ])
}
