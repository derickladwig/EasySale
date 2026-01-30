/**
 * OCR Operations
 * 
 * Image preprocessing for vendor bill processing
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

use actix_web::{post, web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::models::ApiError;
use crate::services::image_preprocessing::{
    ImagePreprocessor, PreprocessingPipeline, PreprocessingStep,
    PreprocessingImprovements
};

// ============================================================================
// Image Preprocessing
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct PreprocessImageRequest {
    pub tenant_id: String,
    pub input_path: String,
    pub output_path: String,
    pub steps: Vec<String>, // e.g., ["grayscale", "deskew", "sharpen"]
}

#[derive(Debug, Serialize)]
pub struct PreprocessImageResponse {
    pub output_path: String,
    pub improvements: PreprocessingImprovements,
    pub steps_applied: Vec<String>,
    pub processing_time_ms: u64,
}

/// Preprocess image for better OCR results
/// 
/// Requirements: 9.1
#[post("/api/ocr/preprocess")]
pub async fn preprocess_image(
    req: web::Json<PreprocessImageRequest>,
) -> Result<HttpResponse, ApiError> {
    // Parse preprocessing steps
    let mut steps = Vec::new();
    for step_name in &req.steps {
        match step_name.as_str() {
            "grayscale" => steps.push(PreprocessingStep::Grayscale),
            "brightness_contrast" => steps.push(PreprocessingStep::BrightnessContrast { 
                brightness: 1.2, 
                contrast: 1.3 
            }),
            "deskew" => steps.push(PreprocessingStep::Deskew { max_angle: 10.0 }),
            "noise_removal" => steps.push(PreprocessingStep::NoiseRemoval { threshold: 128 }),
            "binarize" => steps.push(PreprocessingStep::Binarize { threshold: 128 }),
            "sharpen" => steps.push(PreprocessingStep::Sharpen { amount: 0.5 }),
            "remove_borders" => steps.push(PreprocessingStep::RemoveBorders { border_size: 10 }),
            _ => {}
        }
    }
    
    let pipeline = PreprocessingPipeline { steps };
    let preprocessor = ImagePreprocessor::with_pipeline(pipeline);
    
    // Preprocess image
    let result = preprocessor.preprocess(&req.input_path, &req.output_path)
        .map_err(|e| ApiError::internal(format!("Preprocessing failed: {:?}", e)))?;
    
    Ok(HttpResponse::Ok().json(PreprocessImageResponse {
        output_path: result.output_path,
        improvements: result.improvements,
        steps_applied: result.steps_applied,
        processing_time_ms: result.processing_time_ms,
    }))
}

// ============================================================================
// Batch Preprocessing
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct BatchPreprocessRequest {
    pub tenant_id: String,
    pub images: Vec<ImageToPreprocess>,
    pub steps: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct ImageToPreprocess {
    pub input_path: String,
    pub output_path: String,
}

#[derive(Debug, Serialize)]
pub struct BatchPreprocessResponse {
    pub results: Vec<PreprocessImageResponse>,
    pub total_processed: usize,
    pub total_time_ms: u64,
}

/// Batch preprocess multiple images
/// 
/// Requirements: 9.2
#[post("/api/ocr/batch-preprocess")]
pub async fn batch_preprocess(
    req: web::Json<BatchPreprocessRequest>,
) -> Result<HttpResponse, ApiError> {
    // Parse preprocessing steps
    let mut steps = Vec::new();
    for step_name in &req.steps {
        match step_name.as_str() {
            "grayscale" => steps.push(PreprocessingStep::Grayscale),
            "brightness_contrast" => steps.push(PreprocessingStep::BrightnessContrast { 
                brightness: 1.2, 
                contrast: 1.3 
            }),
            "deskew" => steps.push(PreprocessingStep::Deskew { max_angle: 10.0 }),
            "noise_removal" => steps.push(PreprocessingStep::NoiseRemoval { threshold: 128 }),
            "binarize" => steps.push(PreprocessingStep::Binarize { threshold: 128 }),
            "sharpen" => steps.push(PreprocessingStep::Sharpen { amount: 0.5 }),
            "remove_borders" => steps.push(PreprocessingStep::RemoveBorders { border_size: 10 }),
            _ => {}
        }
    }
    
    let pipeline = PreprocessingPipeline { steps };
    let preprocessor = ImagePreprocessor::with_pipeline(pipeline);
    
    let mut results = Vec::new();
    let mut total_time = 0u64;
    
    for image in &req.images {
        match preprocessor.preprocess(&image.input_path, &image.output_path) {
            Ok(result) => {
                total_time += result.processing_time_ms;
                results.push(PreprocessImageResponse {
                    output_path: result.output_path,
                    improvements: result.improvements,
                    steps_applied: result.steps_applied,
                    processing_time_ms: result.processing_time_ms,
                });
            }
            Err(e) => {
                tracing::warn!("Failed to preprocess {}: {:?}", image.input_path, e);
            }
        }
    }
    
    Ok(HttpResponse::Ok().json(BatchPreprocessResponse {
        total_processed: results.len(),
        results,
        total_time_ms: total_time,
    }))
}

/// Configure OCR operations routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(preprocess_image)
        .service(batch_preprocess);
}
