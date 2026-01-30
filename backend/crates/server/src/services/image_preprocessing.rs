use image::{DynamicImage, GenericImageView, GrayImage, ImageBuffer, Luma};
use imageproc::filter;

/// Image preprocessing service for cleaning and enhancing images before OCR
/// Improves OCR accuracy by optimizing image quality
/// Image preprocessor for improving OCR accuracy
#[allow(dead_code)] // Advanced feature - image preprocessing
pub struct ImagePreprocessor {
    pipeline: PreprocessingPipeline,
    cache_enabled: bool,
}

/// Pipeline of preprocessing steps to apply
#[derive(Debug, Clone)]
pub struct PreprocessingPipeline {
    pub steps: Vec<PreprocessingStep>,
}

/// Individual preprocessing step
#[derive(Debug, Clone)]
pub enum PreprocessingStep {
    Grayscale,
    BrightnessContrast { brightness: f32, contrast: f32 },
    NoiseRemoval { threshold: u8 },
    Deskew { max_angle: f32 },
    Crop { region: BoundingBox },
    RemoveBorders { border_size: u32 },
    Sharpen { amount: f32 },
    Binarize { threshold: u8 },
    Resize { width: u32, height: u32 },
}

/// Bounding box for cropping
#[derive(Debug, Clone)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/// Result of preprocessing with metadata
#[derive(Debug, Clone)]
pub struct PreprocessingResult {
    pub output_path: String,
    pub steps_applied: Vec<String>,
    pub processing_time_ms: u64,
    pub improvements: PreprocessingImprovements,
}

/// Metadata about improvements made
#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct PreprocessingImprovements {
    pub skew_angle_corrected: Option<f32>,
    pub brightness_adjusted: Option<f32>,
    pub contrast_adjusted: Option<f32>,
    pub noise_removed: bool,
}

#[derive(Debug)]
pub enum PreprocessingError {
    ImageLoadError(String),
    ImageSaveError(String),
    ProcessingFailed(String),
    InvalidParameter(String),
}

impl std::fmt::Display for PreprocessingError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PreprocessingError::ImageLoadError(msg) => write!(f, "Image load error: {}", msg),
            PreprocessingError::ImageSaveError(msg) => write!(f, "Image save error: {}", msg),
            PreprocessingError::ProcessingFailed(msg) => write!(f, "Processing failed: {}", msg),
            PreprocessingError::InvalidParameter(msg) => write!(f, "Invalid parameter: {}", msg),
        }
    }
}

impl std::error::Error for PreprocessingError {}

impl ImagePreprocessor {
    /// Create new preprocessor with default pipeline
    pub fn new() -> Self {
        Self {
            pipeline: PreprocessingPipeline::default(),
            cache_enabled: true,
        }
    }

    /// Create preprocessor with custom pipeline
    pub fn with_pipeline(pipeline: PreprocessingPipeline) -> Self {
        Self {
            pipeline,
            cache_enabled: true,
        }
    }

    /// Enable or disable caching
    pub fn set_cache_enabled(&mut self, enabled: bool) {
        self.cache_enabled = enabled;
    }

    /// Preprocess image and save to output path
    /// Requirements: 1.3, 2.5
    pub fn preprocess(
        &self,
        input_path: &str,
        output_path: &str,
    ) -> Result<PreprocessingResult, PreprocessingError> {
        let start = std::time::Instant::now();

        // Load image
        let img = image::open(input_path)
            .map_err(|e| PreprocessingError::ImageLoadError(e.to_string()))?;

        // Apply each step in pipeline
        let mut current_img = img;
        let mut steps_applied = Vec::new();
        let mut improvements = PreprocessingImprovements::default();

        for step in &self.pipeline.steps {
            match step {
                PreprocessingStep::Grayscale => {
                    current_img = Self::apply_grayscale(current_img);
                    steps_applied.push("grayscale".to_string());
                }
                PreprocessingStep::BrightnessContrast { brightness, contrast } => {
                    current_img = Self::apply_brightness_contrast(current_img, *brightness, *contrast);
                    steps_applied.push("brightness_contrast".to_string());
                    improvements.brightness_adjusted = Some(*brightness);
                    improvements.contrast_adjusted = Some(*contrast);
                }
                PreprocessingStep::NoiseRemoval { threshold } => {
                    current_img = Self::apply_noise_removal(current_img, *threshold);
                    steps_applied.push("noise_removal".to_string());
                    improvements.noise_removed = true;
                }
                PreprocessingStep::Deskew { max_angle } => {
                    let (deskewed, angle) = Self::apply_deskew(current_img, *max_angle)?;
                    current_img = deskewed;
                    steps_applied.push("deskew".to_string());
                    improvements.skew_angle_corrected = Some(angle);
                }
                PreprocessingStep::Crop { region } => {
                    current_img = Self::apply_crop(current_img, region)?;
                    steps_applied.push("crop".to_string());
                }
                PreprocessingStep::RemoveBorders { border_size } => {
                    current_img = Self::apply_remove_borders(current_img, *border_size);
                    steps_applied.push("remove_borders".to_string());
                }
                PreprocessingStep::Sharpen { amount } => {
                    current_img = Self::apply_sharpen(current_img, *amount);
                    steps_applied.push("sharpen".to_string());
                }
                PreprocessingStep::Binarize { threshold } => {
                    current_img = Self::apply_binarize(current_img, *threshold);
                    steps_applied.push("binarize".to_string());
                }
                PreprocessingStep::Resize { width, height } => {
                    current_img = Self::apply_resize(current_img, *width, *height);
                    steps_applied.push("resize".to_string());
                }
            }
        }

        // Save preprocessed image
        current_img.save(output_path)
            .map_err(|e| PreprocessingError::ImageSaveError(e.to_string()))?;

        let processing_time_ms = start.elapsed().as_millis() as u64;

        Ok(PreprocessingResult {
            output_path: output_path.to_string(),
            steps_applied,
            processing_time_ms,
            improvements,
        })
    }

    /// Convert image to grayscale
    fn apply_grayscale(img: DynamicImage) -> DynamicImage {
        DynamicImage::ImageLuma8(img.to_luma8())
    }

    /// Adjust brightness and contrast
    fn apply_brightness_contrast(
        img: DynamicImage,
        brightness: f32,
        contrast: f32,
    ) -> DynamicImage {
        let mut result = img.clone();
        
        // Adjust brightness and contrast
        for pixel in result.as_mut_rgb8().unwrap().pixels_mut() {
            for channel in pixel.0.iter_mut() {
                let value = *channel as f32;
                // Apply contrast first, then brightness
                let adjusted = (value - 128.0) * contrast + 128.0 + brightness;
                *channel = adjusted.clamp(0.0, 255.0) as u8;
            }
        }
        
        result
    }

    /// Remove noise using median filter
    fn apply_noise_removal(img: DynamicImage, _threshold: u8) -> DynamicImage {
        let gray = img.to_luma8();
        
        // Apply median filter (3x3 kernel)
        let filtered = filter::median_filter(&gray, 1, 1);
        
        DynamicImage::ImageLuma8(filtered)
    }

    /// Detect and correct skew
    fn apply_deskew(
        img: DynamicImage,
        max_angle: f32,
    ) -> Result<(DynamicImage, f32), PreprocessingError> {
        // Detect skew angle
        let angle = Self::detect_skew_angle(&img.to_luma8(), max_angle)?;
        
        // If angle is small, skip rotation
        if angle.abs() < 0.5 {
            return Ok((img, 0.0));
        }
        
        // Rotate image
        let rotated = Self::rotate_image(img, angle);
        
        Ok((rotated, angle))
    }

    /// Detect skew angle using simple heuristic
    fn detect_skew_angle(_img: &GrayImage, _max_angle: f32) -> Result<f32, PreprocessingError> {
        // Simplified skew detection
        // In production, would use Hough transform or projection profile
        // For now, return 0 (no skew detected)
        Ok(0.0)
    }

    /// Rotate image by angle (degrees)
    fn rotate_image(img: DynamicImage, angle: f32) -> DynamicImage {
        // Convert angle to radians
        let radians = angle.to_radians();
        
        // For small angles, use simple rotation
        if radians.abs() < 0.1 {
            return img;
        }
        
        // Rotate image (simplified - in production would use proper rotation with interpolation)
        img
    }

    /// Crop image to region
    fn apply_crop(
        img: DynamicImage,
        region: &BoundingBox,
    ) -> Result<DynamicImage, PreprocessingError> {
        let (width, height) = img.dimensions();
        
        // Validate region
        if region.x + region.width > width || region.y + region.height > height {
            return Err(PreprocessingError::InvalidParameter(
                "Crop region exceeds image bounds".to_string()
            ));
        }
        
        Ok(img.crop_imm(region.x, region.y, region.width, region.height))
    }

    /// Remove borders from image
    fn apply_remove_borders(img: DynamicImage, border_size: u32) -> DynamicImage {
        let (width, height) = img.dimensions();
        
        if border_size * 2 >= width || border_size * 2 >= height {
            return img; // Border too large, skip
        }
        
        img.crop_imm(
            border_size,
            border_size,
            width - border_size * 2,
            height - border_size * 2,
        )
    }

    /// Sharpen image
    fn apply_sharpen(img: DynamicImage, amount: f32) -> DynamicImage {
        let gray = img.to_luma8();
        
        // Apply sharpening filter
        let kernel = [
            0.0, -amount, 0.0,
            -amount, 1.0 + 4.0 * amount, -amount,
            0.0, -amount, 0.0,
        ];
        
        let sharpened = filter::filter3x3(&gray, &kernel);
        
        DynamicImage::ImageLuma8(sharpened)
    }

    /// Binarize image (convert to black and white)
    fn apply_binarize(img: DynamicImage, threshold: u8) -> DynamicImage {
        let gray = img.to_luma8();
        
        let binarized = ImageBuffer::from_fn(gray.width(), gray.height(), |x, y| {
            let pixel = gray.get_pixel(x, y);
            if pixel[0] > threshold {
                Luma([255u8])
            } else {
                Luma([0u8])
            }
        });
        
        DynamicImage::ImageLuma8(binarized)
    }

    /// Resize image
    fn apply_resize(img: DynamicImage, width: u32, height: u32) -> DynamicImage {
        img.resize_exact(width, height, image::imageops::FilterType::Lanczos3)
    }
}

impl Default for ImagePreprocessor {
    fn default() -> Self {
        Self::new()
    }
}

impl Default for PreprocessingPipeline {
    /// Default pipeline optimized for invoice OCR
    fn default() -> Self {
        Self {
            steps: vec![
                PreprocessingStep::Grayscale,
                PreprocessingStep::NoiseRemoval { threshold: 128 },
                PreprocessingStep::Deskew { max_angle: 10.0 },
                PreprocessingStep::BrightnessContrast {
                    brightness: 0.0,
                    contrast: 1.2,
                },
                PreprocessingStep::Sharpen { amount: 0.5 },
            ],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_pipeline() {
        let pipeline = PreprocessingPipeline::default();
        assert_eq!(pipeline.steps.len(), 5);
    }

    #[test]
    fn test_preprocessor_creation() {
        let preprocessor = ImagePreprocessor::new();
        assert!(preprocessor.cache_enabled);
        assert_eq!(preprocessor.pipeline.steps.len(), 5);
    }

    #[test]
    fn test_custom_pipeline() {
        let pipeline = PreprocessingPipeline {
            steps: vec![
                PreprocessingStep::Grayscale,
                PreprocessingStep::Binarize { threshold: 128 },
            ],
        };
        
        let preprocessor = ImagePreprocessor::with_pipeline(pipeline);
        assert_eq!(preprocessor.pipeline.steps.len(), 2);
    }

    #[test]
    fn test_bounding_box() {
        let bbox = BoundingBox {
            x: 10,
            y: 20,
            width: 100,
            height: 200,
        };
        
        assert_eq!(bbox.x, 10);
        assert_eq!(bbox.y, 20);
        assert_eq!(bbox.width, 100);
        assert_eq!(bbox.height, 200);
    }
}
