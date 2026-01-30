// Orientation service for document rotation detection and correction
// Evaluates 0/90/180/270 rotations and applies deskew

use crate::models::PageArtifact;
use image::{DynamicImage, GenericImage, GenericImageView, GrayImage};
use imageproc::edges::canny;
use imageproc::hough::{detect_lines, LineDetectionOptions, PolarLine};
use std::path::Path;
use thiserror::Error;

/// Errors that can occur during orientation detection
#[derive(Debug, Error)]
pub enum OrientationError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Image processing error: {0}")]
    Image(#[from] image::ImageError),

    #[error("Invalid rotation angle: {0}")]
    InvalidRotation(u16),

    #[error("Processing failed: {0}")]
    ProcessingFailed(String),
}

/// Configuration for orientation detection
#[derive(Debug, Clone)]
pub struct OrientationConfig {
    /// Maximum skew angle to detect in degrees (default: 10.0)
    pub max_skew_angle: f32,
    /// Minimum confidence threshold for rotation (default: 0.6)
    pub min_confidence: f64,
    /// Enable deskew after rotation (default: true)
    pub enable_deskew: bool,
}

impl Default for OrientationConfig {
    fn default() -> Self {
        Self {
            max_skew_angle: 10.0,
            min_confidence: 0.6,
            enable_deskew: true,
        }
    }
}

/// Result of orientation detection
#[derive(Debug, Clone)]
pub struct OrientationResult {
    /// Best rotation angle (0, 90, 180, or 270)
    pub rotation: u16,
    /// Confidence score for the rotation (0.0 to 1.0)
    pub confidence: f64,
    /// Skew angle detected after rotation (in degrees)
    pub skew_angle: f32,
    /// Whether deskew was applied
    pub deskew_applied: bool,
    /// Path to the corrected image
    pub corrected_image_path: String,
    /// Evidence for the rotation decision
    pub evidence: RotationEvidence,
    /// Processing time in milliseconds
    pub processing_time_ms: u64,
}

/// Evidence for rotation decision
#[derive(Debug, Clone)]
pub struct RotationEvidence {
    /// Scores for each rotation angle
    pub rotation_scores: Vec<RotationScore>,
    /// Number of text lines detected
    pub text_lines_detected: usize,
    /// Average line angle (for skew detection)
    pub average_line_angle: f32,
    /// Confidence breakdown
    pub confidence_factors: Vec<(String, f64)>,
}

/// Score for a specific rotation
#[derive(Debug, Clone)]
pub struct RotationScore {
    /// Rotation angle (0, 90, 180, or 270)
    pub angle: u16,
    /// Readability score (0.0 to 1.0)
    pub score: f64,
    /// Number of horizontal lines detected
    pub horizontal_lines: usize,
    /// Number of vertical lines detected
    pub vertical_lines: usize,
    /// Text density score
    pub text_density: f64,
}

/// Orientation detection service
pub struct OrientationService {
    config: OrientationConfig,
}

impl OrientationService {
    /// Create a new orientation service
    pub fn new(config: OrientationConfig) -> Self {
        Self { config }
    }

    /// Detect and correct orientation for a page artifact
    pub async fn detect_and_correct(
        &self,
        page_artifact: &PageArtifact,
        output_dir: &Path,
    ) -> Result<OrientationResult, OrientationError> {
        let start_time = std::time::Instant::now();

        // Load the image
        let img = image::open(&page_artifact.image_path)?;

        // Evaluate all 4 rotations
        let rotation_scores = self.evaluate_rotations(&img).await?;

        // Find the best rotation
        let best_rotation = rotation_scores
            .iter()
            .max_by(|a, b| a.score.partial_cmp(&b.score).unwrap())
            .ok_or_else(|| {
                OrientationError::ProcessingFailed("No rotation scores available".to_string())
            })?;

        // Apply the best rotation
        let rotated_img = Self::rotate_image(&img, best_rotation.angle)?;

        // Detect skew angle
        let skew_angle = if self.config.enable_deskew {
            Self::detect_skew_angle(&rotated_img.to_luma8(), self.config.max_skew_angle)?
        } else {
            0.0
        };

        // Apply deskew if needed
        let (final_img, deskew_applied) = if self.config.enable_deskew && skew_angle.abs() > 0.5 {
            (Self::deskew_image(&rotated_img, skew_angle)?, true)
        } else {
            (rotated_img, false)
        };

        // Save the corrected image
        let output_filename = format!(
            "corrected_{}_rot{}_skew{:.1}.png",
            page_artifact.artifact_id,
            best_rotation.angle,
            skew_angle
        );
        let output_path = output_dir.join(&output_filename);
        std::fs::create_dir_all(output_dir)?;
        final_img.save(&output_path)?;

        // Calculate confidence
        let confidence = Self::calculate_confidence(best_rotation, &rotation_scores);

        // Build evidence
        let evidence = self.build_evidence(&rotation_scores, skew_angle, confidence);

        let processing_time_ms = start_time.elapsed().as_millis() as u64;

        Ok(OrientationResult {
            rotation: best_rotation.angle,
            confidence,
            skew_angle,
            deskew_applied,
            corrected_image_path: output_path.to_string_lossy().to_string(),
            evidence,
            processing_time_ms,
        })
    }

    /// Evaluate all 4 rotation angles
    async fn evaluate_rotations(
        &self,
        img: &DynamicImage,
    ) -> Result<Vec<RotationScore>, OrientationError> {
        let angles = [0, 90, 180, 270];
        let mut scores = Vec::with_capacity(4);

        for angle in angles {
            let rotated = Self::rotate_image(img, angle)?;
            let score = self.calculate_readability_score(&rotated)?;
            scores.push(score);
        }

        Ok(scores)
    }

    /// Calculate readability score for an image
    fn calculate_readability_score(
        &self,
        img: &DynamicImage,
    ) -> Result<RotationScore, OrientationError> {
        let gray = img.to_luma8();
        let (width, height) = gray.dimensions();

        // Detect edges using Canny
        let edges = canny(&gray, 50.0, 100.0);

        // Detect lines using Hough transform
        let options = LineDetectionOptions {
            vote_threshold: 40,
            suppression_radius: 8,
        };
        let lines = detect_lines(&edges, options);

        // Analyze line orientations
        let (horizontal_lines, vertical_lines) = Self::count_line_orientations(&lines);

        // Calculate text density (ratio of edge pixels to total pixels)
        let edge_pixels = edges.pixels().filter(|p| p[0] > 0).count();
        let total_pixels = (width * height) as usize;
        let text_density = edge_pixels as f64 / total_pixels as f64;

        // Calculate readability score
        // Horizontal lines indicate proper orientation for text
        let horizontal_score = horizontal_lines as f64 / (horizontal_lines + vertical_lines + 1) as f64;
        let density_score = text_density.min(0.3) / 0.3; // Normalize to 0-1, cap at 0.3

        // Combined score (weighted)
        let score = (horizontal_score * 0.7 + density_score * 0.3).min(1.0);

        // Determine rotation angle based on which rotation this is
        // This will be set by the caller
        Ok(RotationScore {
            angle: 0, // Will be set by caller
            score,
            horizontal_lines,
            vertical_lines,
            text_density,
        })
    }

    /// Count horizontal and vertical lines
    fn count_line_orientations(lines: &[PolarLine]) -> (usize, usize) {
        let mut horizontal = 0;
        let mut vertical = 0;

        for line in lines {
            // PolarLine has angle_in_degrees as a u32 field
            let angle_deg = line.angle_in_degrees as f32;

            // Horizontal lines: angle near 0 or 180 degrees
            if (angle_deg.abs() < 15.0) || ((angle_deg - 180.0).abs() < 15.0) {
                horizontal += 1;
            }
            // Vertical lines: angle near 90 or 270 degrees
            else if ((angle_deg - 90.0).abs() < 15.0) || ((angle_deg - 270.0).abs() < 15.0) {
                vertical += 1;
            }
        }

        (horizontal, vertical)
    }

    /// Rotate image by specified angle
    fn rotate_image(img: &DynamicImage, angle: u16) -> Result<DynamicImage, OrientationError> {
        match angle {
            0 => Ok(img.clone()),
            90 => Ok(img.rotate90()),
            180 => Ok(img.rotate180()),
            270 => Ok(img.rotate270()),
            _ => Err(OrientationError::InvalidRotation(angle)),
        }
    }

    /// Detect skew angle using Hough transform
    fn detect_skew_angle(gray: &GrayImage, max_skew_angle: f32) -> Result<f32, OrientationError> {
        // Detect edges
        let edges = canny(gray, 50.0, 100.0);

        // Detect lines
        let options = LineDetectionOptions {
            vote_threshold: 40,
            suppression_radius: 8,
        };
        let lines = detect_lines(&edges, options);

        if lines.is_empty() {
            return Ok(0.0);
        }

        // Calculate average angle of horizontal lines
        let mut horizontal_angles = Vec::new();
        for line in &lines {
            let angle_deg = line.angle_in_degrees as f32;
            
            // Consider lines near horizontal (within 15 degrees of 0 or 180)
            if angle_deg.abs() < 15.0 {
                horizontal_angles.push(angle_deg);
            } else if (angle_deg - 180.0).abs() < 15.0 {
                horizontal_angles.push(angle_deg - 180.0);
            }
        }

        if horizontal_angles.is_empty() {
            return Ok(0.0);
        }

        // Calculate median angle (more robust than mean)
        horizontal_angles.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let median_angle = horizontal_angles[horizontal_angles.len() / 2];

        // Clamp to max skew angle
        let clamped_angle = median_angle.clamp(-max_skew_angle, max_skew_angle);

        Ok(clamped_angle)
    }

    /// Apply deskew transformation
    fn deskew_image(img: &DynamicImage, angle: f32) -> Result<DynamicImage, OrientationError> {
        // For small angles, use affine transformation
        if angle.abs() < 0.1 {
            return Ok(img.clone());
        }

        // Convert angle to radians
        let radians = -angle.to_radians(); // Negative to correct the skew

        // Get image dimensions
        let (width, height) = img.dimensions();
        let center_x = width as f32 / 2.0;
        let center_y = height as f32 / 2.0;

        // Create output image
        let mut output = DynamicImage::new_rgb8(width, height);

        // Apply rotation transformation
        let cos_angle = radians.cos();
        let sin_angle = radians.sin();

        for y in 0..height {
            for x in 0..width {
                // Translate to origin
                let tx = x as f32 - center_x;
                let ty = y as f32 - center_y;

                // Rotate
                let rx = tx * cos_angle - ty * sin_angle;
                let ry = tx * sin_angle + ty * cos_angle;

                // Translate back
                let src_x = (rx + center_x) as i32;
                let src_y = (ry + center_y) as i32;

                // Check bounds and copy pixel
                if src_x >= 0 && src_x < width as i32 && src_y >= 0 && src_y < height as i32 {
                    let pixel = img.get_pixel(src_x as u32, src_y as u32);
                    output.put_pixel(x, y, pixel);
                }
            }
        }

        Ok(output)
    }

    /// Calculate overall confidence score
    fn calculate_confidence(best: &RotationScore, all_scores: &[RotationScore]) -> f64 {
        // Confidence is based on:
        // 1. Absolute score of best rotation
        // 2. Margin between best and second-best
        // 3. Number of horizontal lines detected

        let best_score = best.score;

        // Find second-best score
        let mut sorted_scores: Vec<f64> = all_scores.iter().map(|s| s.score).collect();
        sorted_scores.sort_by(|a, b| b.partial_cmp(a).unwrap());
        let second_best = if sorted_scores.len() > 1 {
            sorted_scores[1]
        } else {
            0.0
        };

        // Calculate margin
        let margin = best_score - second_best;

        // Normalize horizontal lines (more lines = higher confidence)
        let line_confidence = (best.horizontal_lines as f64 / 20.0).min(1.0);

        // Combined confidence (weighted)
        let confidence = (best_score * 0.5 + margin * 0.3 + line_confidence * 0.2).min(1.0);

        confidence
    }

    /// Build evidence structure
    fn build_evidence(
        &self,
        rotation_scores: &[RotationScore],
        skew_angle: f32,
        _confidence: f64,
    ) -> RotationEvidence {
        let best = rotation_scores
            .iter()
            .max_by(|a, b| a.score.partial_cmp(&b.score).unwrap())
            .unwrap();

        let mut confidence_factors = Vec::new();
        confidence_factors.push(("Readability score".to_string(), best.score));
        confidence_factors.push(("Horizontal lines detected".to_string(), best.horizontal_lines as f64 / 20.0));
        confidence_factors.push(("Text density".to_string(), best.text_density));

        RotationEvidence {
            rotation_scores: rotation_scores.to_vec(),
            text_lines_detected: best.horizontal_lines,
            average_line_angle: skew_angle,
            confidence_factors,
        }
    }

    /// Update page artifact with orientation results
    pub fn update_page_artifact(
        page_artifact: &mut PageArtifact,
        result: &OrientationResult,
    ) {
        page_artifact.rotation = result.rotation;
        page_artifact.rotation_score = result.confidence;
        page_artifact.image_path = result.corrected_image_path.clone();
    }
}

impl Default for OrientationService {
    fn default() -> Self {
        Self::new(OrientationConfig::default())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_image(width: u32, height: u32) -> DynamicImage {
        DynamicImage::new_rgb8(width, height)
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
            1.0,
            image_path.to_string_lossy().to_string(),
            None,
        )
    }

    #[tokio::test]
    async fn test_orientation_service_creation() {
        let config = OrientationConfig::default();
        let service = OrientationService::new(config);
        assert!(service.config.enable_deskew);
        assert_eq!(service.config.max_skew_angle, 10.0);
    }

    #[tokio::test]
    async fn test_detect_and_correct() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("output");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let service = OrientationService::default();

        let result = service
            .detect_and_correct(&page_artifact, &output_dir)
            .await;

        assert!(result.is_ok());
        let orientation_result = result.unwrap();

        // Check that rotation is one of the valid angles
        assert!([0, 90, 180, 270].contains(&orientation_result.rotation));

        // Check that confidence is in valid range
        assert!(orientation_result.confidence >= 0.0);
        assert!(orientation_result.confidence <= 1.0);

        // Check that processing time is reasonable (< 5 seconds)
        assert!(orientation_result.processing_time_ms < 5000);

        // Check that output file exists
        assert!(Path::new(&orientation_result.corrected_image_path).exists());
    }

    #[tokio::test]
    async fn test_evaluate_rotations() {
        let img = create_test_image(800, 600);
        let service = OrientationService::default();

        let result = service.evaluate_rotations(&img).await;
        assert!(result.is_ok());

        let scores = result.unwrap();
        assert_eq!(scores.len(), 4);

        // All scores should be in valid range
        for score in &scores {
            assert!(score.score >= 0.0);
            assert!(score.score <= 1.0);
        }
    }

    #[test]
    fn test_rotate_image() {
        let img = create_test_image(800, 600);
        let service = OrientationService::default();

        // Test 0 degree rotation
        let rotated_0 = OrientationService::rotate_image(&img, 0).unwrap();
        assert_eq!(rotated_0.dimensions(), (800, 600));

        // Test 90 degree rotation
        let rotated_90 = OrientationService::rotate_image(&img, 90).unwrap();
        assert_eq!(rotated_90.dimensions(), (600, 800));

        // Test 180 degree rotation
        let rotated_180 = OrientationService::rotate_image(&img, 180).unwrap();
        assert_eq!(rotated_180.dimensions(), (800, 600));

        // Test 270 degree rotation
        let rotated_270 = OrientationService::rotate_image(&img, 270).unwrap();
        assert_eq!(rotated_270.dimensions(), (600, 800));

        // Test invalid rotation
        let result = OrientationService::rotate_image(&img, 45);
        assert!(result.is_err());
    }

    #[test]
    fn test_detect_skew_angle() {
        let img = create_test_image(800, 600);
        let gray = img.to_luma8();
        let service = OrientationService::default();

        let result = OrientationService::detect_skew_angle(&gray, service.config.max_skew_angle);
        assert!(result.is_ok());

        let angle = result.unwrap();
        // Angle should be within max_skew_angle
        assert!(angle.abs() <= service.config.max_skew_angle);
    }

    #[test]
    fn test_deskew_image() {
        let img = create_test_image(800, 600);
        let service = OrientationService::default();

        // Test small angle (should return original)
        let result = OrientationService::deskew_image(&img, 0.05);
        assert!(result.is_ok());

        // Test larger angle
        let result = OrientationService::deskew_image(&img, 2.5);
        assert!(result.is_ok());
        let deskewed = result.unwrap();
        assert_eq!(deskewed.dimensions(), img.dimensions());
    }

    #[test]
    fn test_calculate_confidence() {
        let service = OrientationService::default();

        let scores = vec![
            RotationScore {
                angle: 0,
                score: 0.9,
                horizontal_lines: 15,
                vertical_lines: 3,
                text_density: 0.15,
            },
            RotationScore {
                angle: 90,
                score: 0.3,
                horizontal_lines: 2,
                vertical_lines: 12,
                text_density: 0.15,
            },
            RotationScore {
                angle: 180,
                score: 0.2,
                horizontal_lines: 1,
                vertical_lines: 1,
                text_density: 0.15,
            },
            RotationScore {
                angle: 270,
                score: 0.4,
                horizontal_lines: 3,
                vertical_lines: 10,
                text_density: 0.15,
            },
        ];

        let confidence = OrientationService::calculate_confidence(&scores[0], &scores);

        // Confidence should be high for clear winner
        assert!(confidence > 0.7);
        assert!(confidence <= 1.0);
    }

    #[test]
    fn test_count_line_orientations() {
        let service = OrientationService::default();

        // Create test lines
        let lines = vec![
            PolarLine {
                r: 100.0,
                angle_in_degrees: 0,
            },
            PolarLine {
                r: 100.0,
                angle_in_degrees: 5,
            },
            PolarLine {
                r: 100.0,
                angle_in_degrees: 90,
            },
            PolarLine {
                r: 100.0,
                angle_in_degrees: 95,
            },
        ];

        let (horizontal, vertical) = OrientationService::count_line_orientations(&lines);

        assert_eq!(horizontal, 2);
        assert_eq!(vertical, 2);
    }

    #[test]
    fn test_update_page_artifact() {
        let temp_dir = TempDir::new().unwrap();
        let mut page_artifact = create_test_page_artifact(&temp_dir);

        let result = OrientationResult {
            rotation: 90,
            confidence: 0.95,
            skew_angle: 2.5,
            deskew_applied: true,
            corrected_image_path: "/path/to/corrected.png".to_string(),
            evidence: RotationEvidence {
                rotation_scores: vec![],
                text_lines_detected: 15,
                average_line_angle: 2.5,
                confidence_factors: vec![],
            },
            processing_time_ms: 1500,
        };

        OrientationService::update_page_artifact(&mut page_artifact, &result);

        assert_eq!(page_artifact.rotation, 90);
        assert_eq!(page_artifact.rotation_score, 0.95);
        assert_eq!(page_artifact.image_path, "/path/to/corrected.png");
    }

    #[test]
    fn test_build_evidence() {
        let service = OrientationService::default();

        let scores = vec![
            RotationScore {
                angle: 0,
                score: 0.9,
                horizontal_lines: 15,
                vertical_lines: 3,
                text_density: 0.15,
            },
        ];

        let evidence = service.build_evidence(&scores, 2.5, 0.95);

        assert_eq!(evidence.text_lines_detected, 15);
        assert_eq!(evidence.average_line_angle, 2.5);
        assert_eq!(evidence.rotation_scores.len(), 1);
        assert!(!evidence.confidence_factors.is_empty());
    }

    #[tokio::test]
    async fn test_processing_time_under_5_seconds() {
        let temp_dir = TempDir::new().unwrap();
        let output_dir = temp_dir.path().join("output");
        std::fs::create_dir_all(&output_dir).unwrap();

        let page_artifact = create_test_page_artifact(&temp_dir);
        let service = OrientationService::default();

        let start = std::time::Instant::now();
        let result = service
            .detect_and_correct(&page_artifact, &output_dir)
            .await
            .unwrap();

        let elapsed = start.elapsed().as_millis() as u64;

        // Verify processing time is under 5 seconds
        assert!(elapsed < 5000, "Processing took {}ms, expected < 5000ms", elapsed);
        assert!(result.processing_time_ms < 5000);
    }

    #[test]
    fn test_rotation_evidence_structure() {
        let evidence = RotationEvidence {
            rotation_scores: vec![
                RotationScore {
                    angle: 0,
                    score: 0.9,
                    horizontal_lines: 15,
                    vertical_lines: 3,
                    text_density: 0.15,
                },
            ],
            text_lines_detected: 15,
            average_line_angle: 2.5,
            confidence_factors: vec![
                ("Readability score".to_string(), 0.9),
                ("Horizontal lines".to_string(), 0.75),
            ],
        };

        assert_eq!(evidence.rotation_scores.len(), 1);
        assert_eq!(evidence.text_lines_detected, 15);
        assert_eq!(evidence.confidence_factors.len(), 2);
    }

    #[test]
    fn test_config_defaults() {
        let config = OrientationConfig::default();
        assert_eq!(config.max_skew_angle, 10.0);
        assert_eq!(config.min_confidence, 0.6);
        assert!(config.enable_deskew);
    }

    #[test]
    fn test_custom_config() {
        let config = OrientationConfig {
            max_skew_angle: 15.0,
            min_confidence: 0.8,
            enable_deskew: false,
        };

        let service = OrientationService::new(config);
        assert_eq!(service.config.max_skew_angle, 15.0);
        assert_eq!(service.config.min_confidence, 0.8);
        assert!(!service.config.enable_deskew);
    }
}
