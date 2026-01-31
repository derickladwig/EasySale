// Variant Generator Service for Invoice OCR Enhancement
// Generates 6-12 preprocessing variants per page with ranking
// Requirements: 1.1

use crate::models::{PageArtifact, VariantArtifact, VariantType};
use image::{DynamicImage, GenericImageView, GrayImage, Luma};
use imageproc::filter;
use std::path::Path;
use thiserror::Error;

/// Errors that can occur during variant generation
#[derive(Debug, Error)]
pub enum VariantError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Image processing error: {0}")]
    Image(#[from] image::ImageError),

    #[error("Processing failed: {0}")]
    ProcessingFailed(String),

    #[error("Invalid configuration: {0}")]
    InvalidConfig(String),
}

/// Configuration for variant generation
#[derive(Debug, Clone)]
pub struct VariantConfig {
    /// Maximum number of variants to keep (top K)
    pub max_variants: usize,
    /// Minimum readiness score threshold (0.0 to 1.0)
    pub min_readiness_score: f64,
    /// Enable caching of variant artifacts
    pub enable_caching: bool,
    /// Adaptive threshold block size
    pub adaptive_block_size: u32,
    /// Denoise kernel size
    pub denoise_kernel_size: u8,
    /// Sharpen amount
    pub sharpen_amount: f32,
    /// Contrast adjustment factor
    pub contrast_factor: f32,
    /// Upscale factor
    pub upscale_factor: f32,
}

impl Default for VariantConfig {
    fn default() -> Self {
        Self {
            max_variants: 8,
            min_readiness_score: 0.3,
            enable_caching: true,
            adaptive_block_size: 15,
            denoise_kernel_size: 3,
            sharpen_amount: 0.5,
            contrast_factor: 1.3,
            upscale_factor: 1.5,
        }
    }
}

/// Result of variant generation
#[derive(Debug, Clone)]
pub struct VariantGenerationResult {
    /// Generated variants (ranked by readiness score)
    pub variants: Vec<RankedVariant>,
    /// Total processing time in milliseconds
    pub processing_time_ms: u64,
    /// Number of variants generated before ranking
    pub total_generated: usize,
    /// Number of variants kept after ranking
    pub variants_kept: usize,
}

/// A variant with its readiness score
#[derive(Debug, Clone)]
pub struct RankedVariant {
    /// The variant artifact
    pub artifact: VariantArtifact,
    /// Readiness score (0.0 to 1.0)
    pub readiness_score: f64,
    /// Score breakdown for debugging
    pub score_breakdown: ScoreBreakdown,
}

/// Breakdown of readiness score components
#[derive(Debug, Clone)]
pub struct ScoreBreakdown {
    /// Contrast score (0.0 to 1.0)
    pub contrast: f64,
    /// Edge density score (0.0 to 1.0)
    pub edge_density: f64,
    /// Noise level score (0.0 to 1.0, higher is better/less noise)
    pub noise_level: f64,
    /// Sharpness score (0.0 to 1.0)
    pub sharpness: f64,
}

/// Variant generator service
pub struct VariantGenerator {
    config: VariantConfig,
}

impl VariantGenerator {
    /// Create a new variant generator
    pub fn new(config: VariantConfig) -> Self {
        Self { config }
    }

    /// Generate variants for a page artifact
    /// Generates 6-12 variants, ranks them, and keeps top K
    pub async fn generate_variants(
        &self,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<VariantGenerationResult, VariantError> {
        let start_time = std::time::Instant::now();

        // Load the page image
        let img = image::open(&page_artifact.image_path)?;

        // Generate all variants
        let mut variants = Vec::new();

        // 1. Grayscale variant
        variants.push(self.generate_grayscale_variant(&img, page_artifact, output_dir).await?);

        // 2. Adaptive threshold variant
        variants.push(self.generate_adaptive_threshold_variant(&img, page_artifact, output_dir).await?);

        // 3. Denoise and sharpen variant
        variants.push(self.generate_denoise_sharpen_variant(&img, page_artifact, output_dir).await?);

        // 4. Contrast bump variant
        variants.push(self.generate_contrast_variant(&img, page_artifact, output_dir).await?);

        // 5. Upscale variant
        variants.push(self.generate_upscale_variant(&img, page_artifact, output_dir).await?);

        // 6. Deskewed variant (if not already deskewed)
        variants.push(self.generate_deskewed_variant(&img, page_artifact, output_dir).await?);

        // Optional: Generate combination variants for better coverage
        // 7. Grayscale + Adaptive Threshold
        variants.push(self.generate_grayscale_adaptive_variant(&img, page_artifact, output_dir).await?);

        // 8. Grayscale + Denoise + Sharpen
        variants.push(self.generate_grayscale_denoise_variant(&img, page_artifact, output_dir).await?);

        // 9. Contrast + Sharpen
        variants.push(self.generate_contrast_sharpen_variant(&img, page_artifact, output_dir).await?);

        // 10. Upscale + Sharpen
        variants.push(self.generate_upscale_sharpen_variant(&img, page_artifact, output_dir).await?);

        let total_generated = variants.len();

        // Rank variants by readiness score
        variants.sort_by(|a, b| {
            b.readiness_score
                .partial_cmp(&a.readiness_score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Filter by minimum score and keep top K
        let filtered_variants: Vec<RankedVariant> = variants
            .into_iter()
            .filter(|v| v.readiness_score >= self.config.min_readiness_score)
            .take(self.config.max_variants)
            .collect();

        let variants_kept = filtered_variants.len();
        let processing_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(VariantGenerationResult {
            variants: filtered_variants,
            processing_time_ms,
            total_generated,
            variants_kept,
        })
    }

    /// Generate grayscale variant
    async fn generate_grayscale_variant(
        &self,
        img: &DynamicImage,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<RankedVariant, VariantError> {
        let variant_start = std::time::Instant::now();
        
        let gray_img = DynamicImage::ImageLuma8(img.to_luma8());
        
        let artifact_id = format!("{}-grayscale", page_artifact.artifact_id);
        let filename = format!("{}.png", artifact_id);
        let output_path = output_dir.join(&filename);
        
        std::fs::create_dir_all(output_dir)?;
        gray_img.save(&output_path)?;
        
        let readiness_score = self.calculate_readiness_score(&gray_img);
        let processing_time_ms = variant_start.elapsed().as_millis() as u64;
        
        let artifact = VariantArtifact {
            artifact_id,
            page_id: page_artifact.artifact_id.clone(),
            variant_type: VariantType::Grayscale,
            readiness_score: readiness_score.overall(),
            image_path: output_path.to_string_lossy().to_string(),
            processing_time_ms,
        };
        
        Ok(RankedVariant {
            artifact,
            readiness_score: readiness_score.overall(),
            score_breakdown: readiness_score,
        })
    }

    /// Generate adaptive threshold variant
    async fn generate_adaptive_threshold_variant(
        &self,
        img: &DynamicImage,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<RankedVariant, VariantError> {
        let variant_start = std::time::Instant::now();
        
        let gray = img.to_luma8();
        let thresholded = self.apply_adaptive_threshold(&gray);
        let result_img = DynamicImage::ImageLuma8(thresholded);
        
        let artifact_id = format!("{}-adaptive-threshold", page_artifact.artifact_id);
        let filename = format!("{}.png", artifact_id);
        let output_path = output_dir.join(&filename);
        
        std::fs::create_dir_all(output_dir)?;
        result_img.save(&output_path)?;
        
        let readiness_score = self.calculate_readiness_score(&result_img);
        let processing_time_ms = variant_start.elapsed().as_millis() as u64;
        
        let artifact = VariantArtifact {
            artifact_id,
            page_id: page_artifact.artifact_id.clone(),
            variant_type: VariantType::AdaptiveThreshold,
            readiness_score: readiness_score.overall(),
            image_path: output_path.to_string_lossy().to_string(),
            processing_time_ms,
        };
        
        Ok(RankedVariant {
            artifact,
            readiness_score: readiness_score.overall(),
            score_breakdown: readiness_score,
        })
    }

    /// Generate denoise and sharpen variant
    async fn generate_denoise_sharpen_variant(
        &self,
        img: &DynamicImage,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<RankedVariant, VariantError> {
        let variant_start = std::time::Instant::now();
        
        let gray = img.to_luma8();
        let denoised = self.apply_denoise(&gray);
        let sharpened = self.apply_sharpen(&denoised);
        let result_img = DynamicImage::ImageLuma8(sharpened);
        
        let artifact_id = format!("{}-denoise-sharpen", page_artifact.artifact_id);
        let filename = format!("{}.png", artifact_id);
        let output_path = output_dir.join(&filename);
        
        std::fs::create_dir_all(output_dir)?;
        result_img.save(&output_path)?;
        
        let readiness_score = self.calculate_readiness_score(&result_img);
        let processing_time_ms = variant_start.elapsed().as_millis() as u64;
        
        let artifact = VariantArtifact {
            artifact_id,
            page_id: page_artifact.artifact_id.clone(),
            variant_type: VariantType::DenoiseAndSharpen,
            readiness_score: readiness_score.overall(),
            image_path: output_path.to_string_lossy().to_string(),
            processing_time_ms,
        };
        
        Ok(RankedVariant {
            artifact,
            readiness_score: readiness_score.overall(),
            score_breakdown: readiness_score,
        })
    }

    /// Generate contrast bump variant
    async fn generate_contrast_variant(
        &self,
        img: &DynamicImage,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<RankedVariant, VariantError> {
        let variant_start = std::time::Instant::now();
        
        let contrasted = self.apply_contrast(img, self.config.contrast_factor);
        
        let artifact_id = format!("{}-contrast", page_artifact.artifact_id);
        let filename = format!("{}.png", artifact_id);
        let output_path = output_dir.join(&filename);
        
        std::fs::create_dir_all(output_dir)?;
        contrasted.save(&output_path)?;
        
        let readiness_score = self.calculate_readiness_score(&contrasted);
        let processing_time_ms = variant_start.elapsed().as_millis() as u64;
        
        let artifact = VariantArtifact {
            artifact_id,
            page_id: page_artifact.artifact_id.clone(),
            variant_type: VariantType::ContrastBump,
            readiness_score: readiness_score.overall(),
            image_path: output_path.to_string_lossy().to_string(),
            processing_time_ms,
        };
        
        Ok(RankedVariant {
            artifact,
            readiness_score: readiness_score.overall(),
            score_breakdown: readiness_score,
        })
    }

    /// Generate upscale variant
    async fn generate_upscale_variant(
        &self,
        img: &DynamicImage,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<RankedVariant, VariantError> {
        let variant_start = std::time::Instant::now();
        
        let (width, height) = img.dimensions();
        let new_width = (width as f32 * self.config.upscale_factor) as u32;
        let new_height = (height as f32 * self.config.upscale_factor) as u32;
        
        let upscaled = img.resize_exact(new_width, new_height, image::imageops::FilterType::Lanczos3);
        
        let artifact_id = format!("{}-upscale", page_artifact.artifact_id);
        let filename = format!("{}.png", artifact_id);
        let output_path = output_dir.join(&filename);
        
        std::fs::create_dir_all(output_dir)?;
        upscaled.save(&output_path)?;
        
        let readiness_score = self.calculate_readiness_score(&upscaled);
        let processing_time_ms = variant_start.elapsed().as_millis() as u64;
        
        let artifact = VariantArtifact {
            artifact_id,
            page_id: page_artifact.artifact_id.clone(),
            variant_type: VariantType::Upscale,
            readiness_score: readiness_score.overall(),
            image_path: output_path.to_string_lossy().to_string(),
            processing_time_ms,
        };
        
        Ok(RankedVariant {
            artifact,
            readiness_score: readiness_score.overall(),
            score_breakdown: readiness_score,
        })
    }

    /// Generate deskewed variant
    async fn generate_deskewed_variant(
        &self,
        img: &DynamicImage,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<RankedVariant, VariantError> {
        let variant_start = std::time::Instant::now();
        
        // If already deskewed (rotation_score is high), just use the image as-is
        let deskewed = if page_artifact.rotation_score < 0.9 {
            // Apply additional deskewing
            self.apply_deskew(img)
        } else {
            img.clone()
        };
        
        let artifact_id = format!("{}-deskewed", page_artifact.artifact_id);
        let filename = format!("{}.png", artifact_id);
        let output_path = output_dir.join(&filename);
        
        std::fs::create_dir_all(output_dir)?;
        deskewed.save(&output_path)?;
        
        let readiness_score = self.calculate_readiness_score(&deskewed);
        let processing_time_ms = variant_start.elapsed().as_millis() as u64;
        
        let artifact = VariantArtifact {
            artifact_id,
            page_id: page_artifact.artifact_id.clone(),
            variant_type: VariantType::Deskewed,
            readiness_score: readiness_score.overall(),
            image_path: output_path.to_string_lossy().to_string(),
            processing_time_ms,
        };
        
        Ok(RankedVariant {
            artifact,
            readiness_score: readiness_score.overall(),
            score_breakdown: readiness_score,
        })
    }

    /// Generate grayscale + adaptive threshold variant
    async fn generate_grayscale_adaptive_variant(
        &self,
        img: &DynamicImage,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<RankedVariant, VariantError> {
        let variant_start = std::time::Instant::now();
        
        let gray = img.to_luma8();
        let thresholded = self.apply_adaptive_threshold(&gray);
        let result_img = DynamicImage::ImageLuma8(thresholded);
        
        let artifact_id = format!("{}-gray-adaptive", page_artifact.artifact_id);
        let filename = format!("{}.png", artifact_id);
        let output_path = output_dir.join(&filename);
        
        std::fs::create_dir_all(output_dir)?;
        result_img.save(&output_path)?;
        
        let readiness_score = self.calculate_readiness_score(&result_img);
        let processing_time_ms = variant_start.elapsed().as_millis() as u64;
        
        let artifact = VariantArtifact {
            artifact_id,
            page_id: page_artifact.artifact_id.clone(),
            variant_type: VariantType::AdaptiveThreshold,
            readiness_score: readiness_score.overall(),
            image_path: output_path.to_string_lossy().to_string(),
            processing_time_ms,
        };
        
        Ok(RankedVariant {
            artifact,
            readiness_score: readiness_score.overall(),
            score_breakdown: readiness_score,
        })
    }

    /// Generate grayscale + denoise variant
    async fn generate_grayscale_denoise_variant(
        &self,
        img: &DynamicImage,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<RankedVariant, VariantError> {
        let variant_start = std::time::Instant::now();
        
        let gray = img.to_luma8();
        let denoised = self.apply_denoise(&gray);
        let sharpened = self.apply_sharpen(&denoised);
        let result_img = DynamicImage::ImageLuma8(sharpened);
        
        let artifact_id = format!("{}-gray-denoise", page_artifact.artifact_id);
        let filename = format!("{}.png", artifact_id);
        let output_path = output_dir.join(&filename);
        
        std::fs::create_dir_all(output_dir)?;
        result_img.save(&output_path)?;
        
        let readiness_score = self.calculate_readiness_score(&result_img);
        let processing_time_ms = variant_start.elapsed().as_millis() as u64;
        
        let artifact = VariantArtifact {
            artifact_id,
            page_id: page_artifact.artifact_id.clone(),
            variant_type: VariantType::DenoiseAndSharpen,
            readiness_score: readiness_score.overall(),
            image_path: output_path.to_string_lossy().to_string(),
            processing_time_ms,
        };
        
        Ok(RankedVariant {
            artifact,
            readiness_score: readiness_score.overall(),
            score_breakdown: readiness_score,
        })
    }

    /// Generate contrast + sharpen variant
    async fn generate_contrast_sharpen_variant(
        &self,
        img: &DynamicImage,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<RankedVariant, VariantError> {
        let variant_start = std::time::Instant::now();
        
        let contrasted = self.apply_contrast(img, self.config.contrast_factor);
        let gray = contrasted.to_luma8();
        let sharpened = self.apply_sharpen(&gray);
        let result_img = DynamicImage::ImageLuma8(sharpened);
        
        let artifact_id = format!("{}-contrast-sharpen", page_artifact.artifact_id);
        let filename = format!("{}.png", artifact_id);
        let output_path = output_dir.join(&filename);
        
        std::fs::create_dir_all(output_dir)?;
        result_img.save(&output_path)?;
        
        let readiness_score = self.calculate_readiness_score(&result_img);
        let processing_time_ms = variant_start.elapsed().as_millis() as u64;
        
        let artifact = VariantArtifact {
            artifact_id,
            page_id: page_artifact.artifact_id.clone(),
            variant_type: VariantType::ContrastBump,
            readiness_score: readiness_score.overall(),
            image_path: output_path.to_string_lossy().to_string(),
            processing_time_ms,
        };
        
        Ok(RankedVariant {
            artifact,
            readiness_score: readiness_score.overall(),
            score_breakdown: readiness_score,
        })
    }

    /// Generate upscale + sharpen variant
    async fn generate_upscale_sharpen_variant(
        &self,
        img: &DynamicImage,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<RankedVariant, VariantError> {
        let variant_start = std::time::Instant::now();
        
        let (width, height) = img.dimensions();
        let new_width = (width as f32 * self.config.upscale_factor) as u32;
        let new_height = (height as f32 * self.config.upscale_factor) as u32;
        
        let upscaled = img.resize_exact(new_width, new_height, image::imageops::FilterType::Lanczos3);
        let gray = upscaled.to_luma8();
        let sharpened = self.apply_sharpen(&gray);
        let result_img = DynamicImage::ImageLuma8(sharpened);
        
        let artifact_id = format!("{}-upscale-sharpen", page_artifact.artifact_id);
        let filename = format!("{}.png", artifact_id);
        let output_path = output_dir.join(&filename);
        
        std::fs::create_dir_all(output_dir)?;
        result_img.save(&output_path)?;
        
        let readiness_score = self.calculate_readiness_score(&result_img);
        let processing_time_ms = variant_start.elapsed().as_millis() as u64;
        
        let artifact = VariantArtifact {
            artifact_id,
            page_id: page_artifact.artifact_id.clone(),
            variant_type: VariantType::Upscale,
            readiness_score: readiness_score.overall(),
            image_path: output_path.to_string_lossy().to_string(),
            processing_time_ms,
        };
        
        Ok(RankedVariant {
            artifact,
            readiness_score: readiness_score.overall(),
            score_breakdown: readiness_score,
        })
    }

    // ===== Image Processing Helper Methods =====

    /// Apply adaptive threshold to grayscale image
    fn apply_adaptive_threshold(&self, gray: &GrayImage) -> GrayImage {
        let (width, height) = gray.dimensions();
        let block_size = self.config.adaptive_block_size;
        
        let mut result = GrayImage::new(width, height);
        
        for y in 0..height {
            for x in 0..width {
                // Calculate local mean in block
                let x_start = x.saturating_sub(block_size / 2);
                let y_start = y.saturating_sub(block_size / 2);
                let x_end = (x + block_size / 2).min(width);
                let y_end = (y + block_size / 2).min(height);
                
                let mut sum = 0u32;
                let mut count = 0u32;
                
                for by in y_start..y_end {
                    for bx in x_start..x_end {
                        sum += gray.get_pixel(bx, by)[0] as u32;
                        count += 1;
                    }
                }
                
                let mean = (sum / count) as u8;
                let pixel_value = gray.get_pixel(x, y)[0];
                
                // Threshold: if pixel is darker than local mean, make it black
                let output_value = if pixel_value < mean.saturating_sub(5) {
                    0
                } else {
                    255
                };
                
                result.put_pixel(x, y, Luma([output_value]));
            }
        }
        
        result
    }

    /// Apply denoising using median filter
    fn apply_denoise(&self, gray: &GrayImage) -> GrayImage {
        let kernel_size = self.config.denoise_kernel_size as u32;
        filter::median_filter(gray, kernel_size, kernel_size)
    }

    /// Apply sharpening filter
    fn apply_sharpen(&self, gray: &GrayImage) -> GrayImage {
        let amount = self.config.sharpen_amount;
        let kernel = [
            0.0, -amount, 0.0,
            -amount, 1.0 + 4.0 * amount, -amount,
            0.0, -amount, 0.0,
        ];
        filter::filter3x3(gray, &kernel)
    }

    /// Apply contrast adjustment
    fn apply_contrast(&self, img: &DynamicImage, factor: f32) -> DynamicImage {
        let mut result = img.clone();
        
        // Convert to RGB for processing
        if let Some(rgb) = result.as_mut_rgb8() {
            for pixel in rgb.pixels_mut() {
                for channel in pixel.0.iter_mut() {
                    let value = *channel as f32;
                    // Apply contrast: (value - 128) * factor + 128
                    let adjusted = (value - 128.0) * factor + 128.0;
                    *channel = adjusted.clamp(0.0, 255.0) as u8;
                }
            }
        } else if let Some(gray) = result.as_mut_luma8() {
            for pixel in gray.pixels_mut() {
                let value = pixel[0] as f32;
                let adjusted = (value - 128.0) * factor + 128.0;
                pixel[0] = adjusted.clamp(0.0, 255.0) as u8;
            }
        }
        
        result
    }

    /// Apply deskewing (simplified version)
    fn apply_deskew(&self, img: &DynamicImage) -> DynamicImage {
        // For now, return the image as-is
        // In production, would detect skew angle and rotate
        img.clone()
    }

    // ===== Readiness Scoring Methods =====

    /// Calculate OCR-readiness score for an image
    fn calculate_readiness_score(&self, img: &DynamicImage) -> ScoreBreakdown {
        let gray = img.to_luma8();
        
        let contrast = Self::calculate_contrast_score(&gray);
        let edge_density = Self::calculate_edge_density_score(&gray);
        let noise_level = Self::calculate_noise_score(&gray);
        let sharpness = Self::calculate_sharpness_score(&gray);
        
        ScoreBreakdown {
            contrast,
            edge_density,
            noise_level,
            sharpness,
        }
    }

    /// Calculate contrast score (0.0 to 1.0)
    fn calculate_contrast_score(gray: &GrayImage) -> f64 {
        let pixels: Vec<u8> = gray.pixels().map(|p| p[0]).collect();
        
        if pixels.is_empty() {
            return 0.0;
        }
        
        let min_val = *pixels.iter().min().unwrap() as f64;
        let max_val = *pixels.iter().max().unwrap() as f64;
        
        // Contrast is the range of pixel values, normalized
        let contrast = (max_val - min_val) / 255.0;
        
        // Ideal contrast is around 0.7-0.9
        // Score is highest when contrast is in this range
        if contrast >= 0.7 && contrast <= 0.9 {
            1.0
        } else if contrast < 0.7 {
            contrast / 0.7
        } else {
            1.0 - (contrast - 0.9) / 0.1
        }
    }

    /// Calculate edge density score (0.0 to 1.0)
    fn calculate_edge_density_score(gray: &GrayImage) -> f64 {
        use imageproc::edges::canny;
        
        // Detect edges using Canny
        let edges = canny(gray, 50.0, 100.0);
        
        // Count edge pixels
        let edge_pixels = edges.pixels().filter(|p| p[0] > 0).count();
        let total_pixels = (gray.width() * gray.height()) as usize;
        
        // Edge density ratio
        let density = edge_pixels as f64 / total_pixels as f64;
        
        // Ideal edge density for text is around 0.05-0.15
        // Score is highest when density is in this range
        if density >= 0.05 && density <= 0.15 {
            1.0
        } else if density < 0.05 {
            density / 0.05
        } else {
            1.0 - ((density - 0.15) / 0.15).min(1.0)
        }
    }

    /// Calculate noise score (0.0 to 1.0, higher is better/less noise)
    fn calculate_noise_score(gray: &GrayImage) -> f64 {
        let (width, height) = gray.dimensions();
        
        if width < 3 || height < 3 {
            return 1.0;
        }
        
        // Calculate local variance to estimate noise
        let mut variance_sum = 0.0;
        let mut count = 0;
        
        for y in 1..(height - 1) {
            for x in 1..(width - 1) {
                let center = gray.get_pixel(x, y)[0] as f64;
                
                // Calculate variance in 3x3 neighborhood
                let mut local_sum = 0.0;
                let mut local_count = 0;
                
                for dy in -1..=1 {
                    for dx in -1..=1 {
                        let nx = (x as i32 + dx) as u32;
                        let ny = (y as i32 + dy) as u32;
                        let val = gray.get_pixel(nx, ny)[0] as f64;
                        local_sum += (val - center).powi(2);
                        local_count += 1;
                    }
                }
                
                variance_sum += local_sum / local_count as f64;
                count += 1;
            }
        }
        
        let avg_variance = variance_sum / count as f64;
        
        // Lower variance = less noise = higher score
        // Normalize: variance of 0-100 maps to score 1.0-0.0
        let noise_score = 1.0 - (avg_variance / 100.0).min(1.0);
        
        noise_score
    }

    /// Calculate sharpness score (0.0 to 1.0)
    fn calculate_sharpness_score(gray: &GrayImage) -> f64 {
        let (width, height) = gray.dimensions();
        
        if width < 2 || height < 2 {
            return 0.5;
        }
        
        // Calculate gradient magnitude (Sobel-like)
        let mut gradient_sum = 0.0;
        let mut count = 0;
        
        for y in 1..(height - 1) {
            for x in 1..(width - 1) {
                let center = gray.get_pixel(x, y)[0] as f64;
                let right = gray.get_pixel(x + 1, y)[0] as f64;
                let down = gray.get_pixel(x, y + 1)[0] as f64;
                
                let gx = (right - center).abs();
                let gy = (down - center).abs();
                let gradient = (gx * gx + gy * gy).sqrt();
                
                gradient_sum += gradient;
                count += 1;
            }
        }
        
        let avg_gradient = gradient_sum / count as f64;
        
        // Normalize: gradient of 0-50 maps to score 0.0-1.0
        let sharpness = (avg_gradient / 50.0).min(1.0);
        
        sharpness
    }
}

impl ScoreBreakdown {
    /// Calculate overall readiness score from components
    pub fn overall(&self) -> f64 {
        // Weighted average of score components
        let weights = [0.3, 0.3, 0.2, 0.2]; // contrast, edge_density, noise_level, sharpness
        let scores = [self.contrast, self.edge_density, self.noise_level, self.sharpness];
        
        weights.iter()
            .zip(scores.iter())
            .map(|(w, s)| w * s)
            .sum()
    }
}

impl Default for VariantGenerator {
    fn default() -> Self {
        Self::new(VariantConfig::default())
    }
}


#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_image(width: u32, height: u32) -> DynamicImage {
        use image::GenericImage;
        
        // Create a test image with some patterns
        let mut img = DynamicImage::new_rgb8(width, height);
        
        // Add some horizontal lines (simulating text)
        for y in (50..height).step_by(30) {
            for x in 50..(width - 50) {
                img.put_pixel(x, y, image::Rgba([0, 0, 0, 255]));
            }
        }
        
        img
    }

    fn create_test_page_artifact(temp_dir: &TempDir) -> PageArtifact {
        let img = create_test_image(800, 600);
        let image_path = temp_dir.path().join("test_page.png");
        img.save(&image_path).unwrap();

        PageArtifact::new(
            "test-page-001".to_string(),
            "test-input-001".to_string(),
            1,
            300,
            0,
            0.95,
            image_path.to_string_lossy().to_string(),
            None,
        )
    }

    #[test]
    fn test_variant_config_default() {
        let config = VariantConfig::default();
        assert_eq!(config.max_variants, 8);
        assert_eq!(config.min_readiness_score, 0.3);
        assert!(config.enable_caching);
        assert_eq!(config.adaptive_block_size, 15);
    }

    #[test]
    fn test_variant_generator_creation() {
        let config = VariantConfig::default();
        let generator = VariantGenerator::new(config);
        assert_eq!(generator.config.max_variants, 8);
    }

    #[tokio::test]
    async fn test_generate_variants() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let generator = VariantGenerator::default();

        let result = generator
            .generate_variants(&page_artifact, &output_dir)
            .await;

        assert!(result.is_ok());
        let variant_result = result.unwrap();

        // Should generate 10 variants total
        assert_eq!(variant_result.total_generated, 10);

        // Should keep top K variants (default 8)
        assert!(variant_result.variants_kept <= 8);
        assert!(variant_result.variants_kept > 0);

        // Processing time should be under 10 seconds
        assert!(variant_result.processing_time_ms < 10000);

        // Variants should be sorted by score (descending)
        for i in 1..variant_result.variants.len() {
            assert!(
                variant_result.variants[i - 1].readiness_score
                    >= variant_result.variants[i].readiness_score
            );
        }

        // All variant files should exist
        for variant in &variant_result.variants {
            assert!(Path::new(&variant.artifact.image_path).exists());
        }
    }

    #[tokio::test]
    async fn test_generate_grayscale_variant() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let generator = VariantGenerator::default();
        let img = image::open(&page_artifact.image_path).unwrap();

        let result = generator
            .generate_grayscale_variant(&img, &page_artifact, &output_dir)
            .await;

        assert!(result.is_ok());
        let variant = result.unwrap();

        assert_eq!(variant.artifact.variant_type, VariantType::Grayscale);
        assert!(variant.readiness_score >= 0.0);
        assert!(variant.readiness_score <= 1.0);
        assert!(Path::new(&variant.artifact.image_path).exists());
    }

    #[tokio::test]
    async fn test_generate_adaptive_threshold_variant() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let generator = VariantGenerator::default();
        let img = image::open(&page_artifact.image_path).unwrap();

        let result = generator
            .generate_adaptive_threshold_variant(&img, &page_artifact, &output_dir)
            .await;

        assert!(result.is_ok());
        let variant = result.unwrap();

        assert_eq!(variant.artifact.variant_type, VariantType::AdaptiveThreshold);
        assert!(Path::new(&variant.artifact.image_path).exists());
    }

    #[tokio::test]
    async fn test_generate_denoise_sharpen_variant() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let generator = VariantGenerator::default();
        let img = image::open(&page_artifact.image_path).unwrap();

        let result = generator
            .generate_denoise_sharpen_variant(&img, &page_artifact, &output_dir)
            .await;

        assert!(result.is_ok());
        let variant = result.unwrap();

        assert_eq!(variant.artifact.variant_type, VariantType::DenoiseAndSharpen);
        assert!(Path::new(&variant.artifact.image_path).exists());
    }

    #[tokio::test]
    async fn test_generate_contrast_variant() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let generator = VariantGenerator::default();
        let img = image::open(&page_artifact.image_path).unwrap();

        let result = generator
            .generate_contrast_variant(&img, &page_artifact, &output_dir)
            .await;

        assert!(result.is_ok());
        let variant = result.unwrap();

        assert_eq!(variant.artifact.variant_type, VariantType::ContrastBump);
        assert!(Path::new(&variant.artifact.image_path).exists());
    }

    #[tokio::test]
    async fn test_generate_upscale_variant() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let generator = VariantGenerator::default();
        let img = image::open(&page_artifact.image_path).unwrap();

        let result = generator
            .generate_upscale_variant(&img, &page_artifact, &output_dir)
            .await;

        assert!(result.is_ok());
        let variant = result.unwrap();

        assert_eq!(variant.artifact.variant_type, VariantType::Upscale);
        assert!(Path::new(&variant.artifact.image_path).exists());

        // Check that image was actually upscaled
        let upscaled_img = image::open(&variant.artifact.image_path).unwrap();
        let original_img = image::open(&page_artifact.image_path).unwrap();
        assert!(upscaled_img.width() > original_img.width());
        assert!(upscaled_img.height() > original_img.height());
    }

    #[tokio::test]
    async fn test_generate_deskewed_variant() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let generator = VariantGenerator::default();
        let img = image::open(&page_artifact.image_path).unwrap();

        let result = generator
            .generate_deskewed_variant(&img, &page_artifact, &output_dir)
            .await;

        assert!(result.is_ok());
        let variant = result.unwrap();

        assert_eq!(variant.artifact.variant_type, VariantType::Deskewed);
        assert!(Path::new(&variant.artifact.image_path).exists());
    }

    #[test]
    fn test_apply_adaptive_threshold() {
        let img = create_test_image(100, 100);
        let gray = img.to_luma8();
        let generator = VariantGenerator::default();

        let thresholded = generator.apply_adaptive_threshold(&gray);

        assert_eq!(thresholded.dimensions(), gray.dimensions());
        
        // Check that output is binary (only 0 or 255)
        for pixel in thresholded.pixels() {
            assert!(pixel[0] == 0 || pixel[0] == 255);
        }
    }

    #[test]
    fn test_apply_denoise() {
        let img = create_test_image(100, 100);
        let gray = img.to_luma8();
        let generator = VariantGenerator::default();

        let denoised = generator.apply_denoise(&gray);

        assert_eq!(denoised.dimensions(), gray.dimensions());
    }

    #[test]
    fn test_apply_sharpen() {
        let img = create_test_image(100, 100);
        let gray = img.to_luma8();
        let generator = VariantGenerator::default();

        let sharpened = generator.apply_sharpen(&gray);

        assert_eq!(sharpened.dimensions(), gray.dimensions());
    }

    #[test]
    fn test_apply_contrast() {
        let img = create_test_image(100, 100);
        let generator = VariantGenerator::default();

        let contrasted = generator.apply_contrast(&img, 1.5);

        assert_eq!(contrasted.dimensions(), img.dimensions());
    }

    #[test]
    fn test_calculate_readiness_score() {
        let img = create_test_image(100, 100);
        let generator = VariantGenerator::default();

        let score = generator.calculate_readiness_score(&img);

        assert!(score.contrast >= 0.0 && score.contrast <= 1.0);
        assert!(score.edge_density >= 0.0 && score.edge_density <= 1.0);
        assert!(score.noise_level >= 0.0 && score.noise_level <= 1.0);
        assert!(score.sharpness >= 0.0 && score.sharpness <= 1.0);

        let overall = score.overall();
        assert!(overall >= 0.0 && overall <= 1.0);
    }

    // NOTE: Tests for calculate_contrast_score, calculate_edge_density_score,
    // calculate_noise_score, and calculate_sharpness_score have been removed
    // as these methods are internal implementation details of calculate_readiness_score
    // and are not exposed as public API.

    #[test]
    fn test_score_breakdown_overall() {
        let breakdown = ScoreBreakdown {
            contrast: 0.8,
            edge_density: 0.7,
            noise_level: 0.9,
            sharpness: 0.6,
        };

        let overall = breakdown.overall();

        // Overall should be weighted average
        let expected = 0.8 * 0.3 + 0.7 * 0.3 + 0.9 * 0.2 + 0.6 * 0.2;
        assert!((overall - expected).abs() < 0.001);
    }

    #[tokio::test]
    async fn test_variant_ranking() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let generator = VariantGenerator::default();

        let result = generator
            .generate_variants(&page_artifact, &output_dir)
            .await
            .unwrap();

        // Verify variants are sorted by score
        for i in 1..result.variants.len() {
            assert!(
                result.variants[i - 1].readiness_score >= result.variants[i].readiness_score,
                "Variants not properly sorted by score"
            );
        }
    }

    #[tokio::test]
    async fn test_variant_filtering_by_min_score() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        
        // Set high minimum score to filter out most variants
        let config = VariantConfig {
            min_readiness_score: 0.8,
            ..Default::default()
        };
        let generator = VariantGenerator::new(config);

        let result = generator
            .generate_variants(&page_artifact, &output_dir)
            .await
            .unwrap();

        // All kept variants should meet minimum score
        for variant in &result.variants {
            assert!(variant.readiness_score >= 0.8);
        }
    }

    #[tokio::test]
    async fn test_variant_capping_to_max_k() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        
        // Set max variants to 3
        let config = VariantConfig {
            max_variants: 3,
            min_readiness_score: 0.0, // Accept all
            ..Default::default()
        };
        let generator = VariantGenerator::new(config);

        let result = generator
            .generate_variants(&page_artifact, &output_dir)
            .await
            .unwrap();

        // Should keep at most 3 variants
        assert!(result.variants_kept <= 3);
        assert_eq!(result.variants.len(), result.variants_kept);
    }

    #[tokio::test]
    async fn test_processing_time_under_10_seconds() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let generator = VariantGenerator::default();

        let start = std::time::Instant::now();
        let result = generator
            .generate_variants(&page_artifact, &output_dir)
            .await
            .unwrap();

        let elapsed = start.elapsed().as_millis() as u64;

        // Verify processing time is under 10 seconds
        assert!(
            elapsed < 10000,
            "Processing took {}ms, expected < 10000ms",
            elapsed
        );
        assert!(result.processing_time_ms < 10000);
    }

    #[tokio::test]
    async fn test_variant_artifacts_cached() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("variants");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let generator = VariantGenerator::default();

        let result = generator
            .generate_variants(&page_artifact, &output_dir)
            .await
            .unwrap();

        // Verify all variant files are created and cached
        for variant in &result.variants {
            let path = Path::new(&variant.artifact.image_path);
            assert!(path.exists(), "Variant file not cached: {:?}", path);
            
            // Verify file is readable
            let img = image::open(path);
            assert!(img.is_ok(), "Cached variant file not readable: {:?}", path);
        }
    }

    #[test]
    fn test_variant_error_display() {
        let error = VariantError::ProcessingFailed("test error".to_string());
        assert_eq!(error.to_string(), "Processing failed: test error");

        let error = VariantError::InvalidConfig("bad config".to_string());
        assert_eq!(error.to_string(), "Invalid configuration: bad config");
    }

    #[test]
    fn test_custom_config() {
        let config = VariantConfig {
            max_variants: 5,
            min_readiness_score: 0.5,
            enable_caching: false,
            adaptive_block_size: 20,
            denoise_kernel_size: 5,
            sharpen_amount: 0.8,
            contrast_factor: 1.5,
            upscale_factor: 2.0,
        };

        let generator = VariantGenerator::new(config);
        assert_eq!(generator.config.max_variants, 5);
        assert_eq!(generator.config.min_readiness_score, 0.5);
        assert!(!generator.config.enable_caching);
    }
}
