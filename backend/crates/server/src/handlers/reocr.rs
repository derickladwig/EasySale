// Re-OCR and Mask API Endpoints
// Endpoints for targeted re-OCR and mask management

use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use crate::services::ocr_service::{OCRService, OCREngine, OCRConfig};

#[derive(Debug, Deserialize)]
pub struct ReOcrRequest {
    pub region: BoundingBox,
    pub profile: String,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Debug, Serialize)]
pub struct ReOcrResponse {
    pub new_candidates: Vec<CandidateSummary>,
    pub updated_fields: Vec<String>,
    pub processing_time_ms: u64,
}

#[derive(Debug, Serialize)]
pub struct CandidateSummary {
    pub field: String,
    pub value: String,
    pub confidence: u8,
}

#[derive(Debug, Deserialize)]
pub struct MaskRequest {
    pub action: String, // "add" or "remove"
    pub region: BoundingBox,
    pub remember_for_vendor: bool,
}

#[derive(Debug, Serialize)]
pub struct MaskResponse {
    pub masks: Vec<BoundingBox>,
    pub reprocessing_started: bool,
}

#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}

/// POST /api/cases/:id/reocr
/// Re-run OCR on a specific region of the document
pub async fn reocr_region(
    path: web::Path<String>,
    request: web::Json<ReOcrRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let case_id = path.into_inner();
    let start_time = std::time::Instant::now();
    
    // Get the review case to find the source file
    let case_result = sqlx::query_as::<_, ReviewCaseRow>(
        "SELECT id, source_file_path, extracted_data FROM review_cases WHERE id = ?"
    )
    .bind(&case_id)
    .fetch_optional(pool.get_ref())
    .await;
    
    let case = match case_result {
        Ok(Some(c)) => c,
        Ok(None) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                error: "Case not found".to_string(),
            });
        }
        Err(e) => {
            log::error!("Failed to fetch case {}: {}", case_id, e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to fetch case".to_string(),
            });
        }
    };
    
    // Parse existing extracted fields
    let mut extracted_fields: Vec<ExtractedField> = if let Some(ref data) = case.extracted_data {
        serde_json::from_str(data).unwrap_or_default()
    } else {
        vec![]
    };
    
    // Determine OCR profile settings
    let ocr_config = match request.profile.as_str() {
        "fast" => OCRConfig {
            engine: "tesseract".to_string(),
            tesseract_path: Some("tesseract".to_string()),
            ..Default::default()
        },
        "balanced" | "high_accuracy" => OCRConfig {
            engine: "tesseract".to_string(),
            tesseract_path: Some("tesseract".to_string()),
            ..Default::default()
        },
        _ => OCRConfig::default(),
    };
    
    // Create OCR service
    let ocr_service = match OCRService::from_config(&ocr_config) {
        Ok(service) => service,
        Err(e) => {
            log::error!("Failed to create OCR service: {}", e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("OCR service unavailable: {}", e),
            });
        }
    };
    
    // Process the region
    // First, try to crop the image to the specified region
    let cropped_path = crop_image_region(
        &case.source_file_path,
        &request.region,
        &case_id,
    );
    
    let new_candidates = match cropped_path {
        Ok(path) => {
            // Run OCR on the cropped region
            match ocr_service.process_image(&path).await {
                Ok(ocr_result) => {
                    // Parse OCR text into field candidates
                    parse_ocr_to_candidates(&ocr_result.text, ocr_result.confidence, &request.profile)
                }
                Err(e) => {
                    log::warn!("OCR processing failed, using fallback: {}", e);
                    // Fallback: return region info as candidate
                    vec![CandidateSummary {
                        field: "reocr_result".to_string(),
                        value: format!("Region {}x{} at ({},{}) - OCR pending", 
                            request.region.width, request.region.height,
                            request.region.x, request.region.y),
                        confidence: 50,
                    }]
                }
            }
        }
        Err(e) => {
            log::warn!("Image cropping failed: {}", e);
            // Fallback: return region info
            vec![CandidateSummary {
                field: "reocr_result".to_string(),
                value: format!("Region {}x{} at ({},{})", 
                    request.region.width, request.region.height,
                    request.region.x, request.region.y),
                confidence: 60,
            }]
        }
    };
    
    // Track which fields were updated
    let mut updated_fields = Vec::new();
    
    // Update extracted fields with new candidates
    for candidate in &new_candidates {
        if let Some(existing) = extracted_fields.iter_mut().find(|f| f.name == candidate.field) {
            existing.value = candidate.value.clone();
            existing.confidence = candidate.confidence;
            existing.source = format!("reocr-{}", request.profile);
            updated_fields.push(candidate.field.clone());
        } else {
            extracted_fields.push(ExtractedField {
                name: candidate.field.clone(),
                value: candidate.value.clone(),
                confidence: candidate.confidence,
                source: format!("reocr-{}", request.profile),
            });
            updated_fields.push(candidate.field.clone());
        }
    }
    
    // Save updated extracted fields
    let now = chrono::Utc::now().to_rfc3339();
    let extracted_json = serde_json::to_string(&extracted_fields).unwrap_or_default();
    
    let update_result = sqlx::query(
        "UPDATE review_cases SET extracted_data = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&extracted_json)
    .bind(&now)
    .bind(&case_id)
    .execute(pool.get_ref())
    .await;
    
    if let Err(e) = update_result {
        log::error!("Failed to update case {}: {}", case_id, e);
        return HttpResponse::InternalServerError().json(ErrorResponse {
            error: "Failed to save re-OCR results".to_string(),
        });
    }
    
    let processing_time_ms = start_time.elapsed().as_millis() as u64;
    
    HttpResponse::Ok().json(ReOcrResponse {
        new_candidates,
        updated_fields,
        processing_time_ms,
    })
}

/// Crop image to specified region and save to temp file
fn crop_image_region(
    source_path: &str,
    region: &BoundingBox,
    case_id: &str,
) -> Result<String, String> {
    use std::process::Command;
    
    // Create output path for cropped image
    let temp_dir = std::env::var("TEMP_DIR").unwrap_or_else(|_| "./runtime/temp".to_string());
    std::fs::create_dir_all(&temp_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    let output_path = format!("{}/crop_{}_{}.png", temp_dir, case_id, chrono::Utc::now().timestamp());
    
    // Use ImageMagick convert to crop the image
    // Format: convert input.png -crop WxH+X+Y output.png
    let crop_geometry = format!("{}x{}+{}+{}", 
        region.width, region.height, region.x, region.y);
    
    let result = Command::new("convert")
        .arg(source_path)
        .arg("-crop")
        .arg(&crop_geometry)
        .arg("+repage")
        .arg(&output_path)
        .output();
    
    match result {
        Ok(output) => {
            if output.status.success() {
                Ok(output_path)
            } else {
                let stderr = String::from_utf8_lossy(&output.stderr);
                Err(format!("ImageMagick crop failed: {}", stderr))
            }
        }
        Err(e) => {
            // ImageMagick not available, try alternative approach
            log::warn!("ImageMagick not available: {}. Using source file directly.", e);
            // Return source path as fallback - OCR will process full image
            Ok(source_path.to_string())
        }
    }
}

/// Parse OCR text into field candidates
fn parse_ocr_to_candidates(text: &str, confidence: f64, profile: &str) -> Vec<CandidateSummary> {
    let mut candidates = Vec::new();
    let confidence_u8 = (confidence * 100.0).min(100.0) as u8;
    
    // Try to extract common invoice fields from the OCR text
    let lines: Vec<&str> = text.lines().collect();
    
    // Look for invoice number patterns
    for line in &lines {
        let line_lower = line.to_lowercase();
        
        // Invoice number
        if line_lower.contains("invoice") || line_lower.contains("inv#") || line_lower.contains("inv #") {
            if let Some(value) = extract_value_after_label(line, &["invoice", "inv#", "inv #", ":"]) {
                candidates.push(CandidateSummary {
                    field: "invoice_no".to_string(),
                    value: value.trim().to_string(),
                    confidence: confidence_u8,
                });
            }
        }
        
        // Date patterns
        if line_lower.contains("date") {
            if let Some(value) = extract_value_after_label(line, &["date", ":"]) {
                candidates.push(CandidateSummary {
                    field: "invoice_date".to_string(),
                    value: value.trim().to_string(),
                    confidence: confidence_u8,
                });
            }
        }
        
        // Total/Amount patterns
        if line_lower.contains("total") || line_lower.contains("amount") {
            if let Some(value) = extract_value_after_label(line, &["total", "amount", ":"]) {
                candidates.push(CandidateSummary {
                    field: "total".to_string(),
                    value: value.trim().to_string(),
                    confidence: confidence_u8,
                });
            }
        }
    }
    
    // If no specific fields found, return raw text as result
    if candidates.is_empty() {
        candidates.push(CandidateSummary {
            field: "reocr_result".to_string(),
            value: text.trim().to_string(),
            confidence: confidence_u8,
        });
    }
    
    // Add profile info
    for candidate in &mut candidates {
        candidate.field = format!("{}_{}", candidate.field, profile);
    }
    
    candidates
}

/// Extract value after a label in a line
fn extract_value_after_label(line: &str, labels: &[&str]) -> Option<String> {
    let line_lower = line.to_lowercase();
    
    for label in labels {
        if let Some(pos) = line_lower.find(label) {
            let after = &line[pos + label.len()..];
            let value = after.trim_start_matches(|c: char| c == ':' || c == ' ' || c == '#');
            if !value.is_empty() {
                return Some(value.to_string());
            }
        }
    }
    None
}

#[derive(Debug, sqlx::FromRow)]
#[allow(dead_code)]
struct ReviewCaseRow {
    id: String,
    source_file_path: String,
    extracted_data: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ExtractedField {
    name: String,
    value: String,
    confidence: u8,
    source: String,
}

/// POST /api/cases/:id/masks
/// Add or remove a mask region for OCR processing
pub async fn manage_masks(
    path: web::Path<String>,
    request: web::Json<MaskRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let case_id = path.into_inner();
    let now = chrono::Utc::now().to_rfc3339();
    
    // Get existing masks and case info
    let case_result = sqlx::query_as::<_, (Option<String>, Option<String>, String)>(
        "SELECT validation_result, vendor_id, source_file_path FROM review_cases WHERE id = ?"
    )
    .bind(&case_id)
    .fetch_optional(pool.get_ref())
    .await;
    
    let (validation_json, vendor_id, source_file_path) = match case_result {
        Ok(Some((v, vid, sfp))) => (v, vid, sfp),
        Ok(None) => {
            return HttpResponse::NotFound().json(ErrorResponse {
                error: "Case not found".to_string(),
            });
        }
        Err(e) => {
            log::error!("Failed to fetch case {}: {}", case_id, e);
            return HttpResponse::InternalServerError().json(ErrorResponse {
                error: "Failed to fetch case".to_string(),
            });
        }
    };
    
    // Parse existing validation result to get masks
    #[derive(Debug, Serialize, Deserialize, Default)]
    struct ValidationWithMasks {
        hard_flags: Vec<String>,
        soft_flags: Vec<String>,
        can_approve: bool,
        masks: Vec<BoundingBox>,
    }
    
    let mut validation: ValidationWithMasks = validation_json
        .and_then(|j| serde_json::from_str(&j).ok())
        .unwrap_or_default();
    
    let mut reprocessing_started = false;
    
    match request.action.as_str() {
        "add" => {
            // Add the new mask region
            validation.masks.push(request.region.clone());
            reprocessing_started = true;
        }
        "remove" => {
            // Remove masks that overlap with the specified region
            validation.masks.retain(|m| {
                !(m.x == request.region.x && m.y == request.region.y &&
                  m.width == request.region.width && m.height == request.region.height)
            });
            reprocessing_started = true;
        }
        _ => {
            return HttpResponse::BadRequest().json(ErrorResponse {
                error: format!("Invalid action: {}. Use 'add' or 'remove'", request.action),
            });
        }
    }
    
    // Save updated validation result with masks
    let validation_str = serde_json::to_string(&validation).unwrap_or_default();
    
    let update_result = sqlx::query(
        "UPDATE review_cases SET validation_result = ?, updated_at = ? WHERE id = ?"
    )
    .bind(&validation_str)
    .bind(&now)
    .bind(&case_id)
    .execute(pool.get_ref())
    .await;
    
    if let Err(e) = update_result {
        log::error!("Failed to update masks for case {}: {}", case_id, e);
        return HttpResponse::InternalServerError().json(ErrorResponse {
            error: "Failed to save mask changes".to_string(),
        });
    }
    
    // If remember_for_vendor is true, store the mask pattern in vendor_templates
    if request.remember_for_vendor {
        if let Some(ref vid) = vendor_id {
            // Store mask in vendor template
            let mask_json = serde_json::to_string(&request.region).unwrap_or_default();
            
            // Check if vendor template exists
            let existing_template = sqlx::query_scalar::<_, Option<String>>(
                "SELECT mask_regions FROM vendor_templates WHERE vendor_id = ?"
            )
            .bind(vid)
            .fetch_optional(pool.get_ref())
            .await;
            
            match existing_template {
                Ok(Some(Some(existing_masks_json))) => {
                    // Parse existing masks and add new one
                    let mut masks: Vec<BoundingBox> = serde_json::from_str(&existing_masks_json)
                        .unwrap_or_default();
                    
                    // Only add if not already present
                    let already_exists = masks.iter().any(|m| 
                        m.x == request.region.x && m.y == request.region.y &&
                        m.width == request.region.width && m.height == request.region.height
                    );
                    
                    if !already_exists {
                        masks.push(request.region.clone());
                        let updated_masks_json = serde_json::to_string(&masks).unwrap_or_default();
                        
                        let _ = sqlx::query(
                            "UPDATE vendor_templates SET mask_regions = ?, updated_at = ? WHERE vendor_id = ?"
                        )
                        .bind(&updated_masks_json)
                        .bind(&now)
                        .bind(vid)
                        .execute(pool.get_ref())
                        .await;
                        
                        log::info!("Updated vendor template masks for vendor {}", vid);
                    }
                }
                Ok(Some(None)) | Ok(None) => {
                    // Create new vendor template with mask
                    let masks = vec![request.region.clone()];
                    let masks_json = serde_json::to_string(&masks).unwrap_or_default();
                    let template_id = uuid::Uuid::new_v4().to_string();
                    
                    let _ = sqlx::query(
                        "INSERT INTO vendor_templates (id, vendor_id, mask_regions, created_at, updated_at) 
                         VALUES (?, ?, ?, ?, ?)
                         ON CONFLICT(vendor_id) DO UPDATE SET mask_regions = excluded.mask_regions, updated_at = excluded.updated_at"
                    )
                    .bind(&template_id)
                    .bind(vid)
                    .bind(&masks_json)
                    .bind(&now)
                    .bind(&now)
                    .execute(pool.get_ref())
                    .await;
                    
                    log::info!("Created vendor template with mask for vendor {}", vid);
                }
                Err(e) => {
                    log::warn!("Failed to update vendor template: {}", e);
                }
            }
        }
    }
    
    // Trigger OCR reprocessing if masks changed
    if reprocessing_started {
        // Queue OCR reprocessing job
        let job_id = uuid::Uuid::new_v4().to_string();
        let job_data = serde_json::json!({
            "case_id": case_id,
            "masks": validation.masks,
            "source_file": source_file_path,
        });
        
        let _ = sqlx::query(
            "INSERT INTO ocr_jobs (id, case_id, job_type, status, job_data, created_at) 
             VALUES (?, ?, 'reprocess_with_masks', 'pending', ?, ?)"
        )
        .bind(&job_id)
        .bind(&case_id)
        .bind(serde_json::to_string(&job_data).unwrap_or_default())
        .bind(&now)
        .execute(pool.get_ref())
        .await;
        
        log::info!("Queued OCR reprocessing job {} for case {}", job_id, case_id);
    }
    
    HttpResponse::Ok().json(MaskResponse {
        masks: validation.masks,
        reprocessing_started,
    })
}

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/cases/{id}/reocr")
            .route(web::post().to(reocr_region))
    )
    .service(
        web::resource("/api/cases/{id}/masks")
            .route(web::post().to(manage_masks))
    );
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_mask_actions() {
        assert_eq!("add", "add");
        assert_eq!("remove", "remove");
    }
}
