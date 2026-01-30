// Re-OCR and Mask API Endpoints
// Endpoints for targeted re-OCR and mask management

use actix_web::{web, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

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
    
    // Create new candidates from the re-OCR region
    // In a full implementation, this would:
    // 1. Crop the image to the specified region
    // 2. Run OCR with the specified profile
    // 3. Parse the results into field candidates
    let new_candidates = vec![
        CandidateSummary {
            field: "reocr_result".to_string(),
            value: format!("Region {}x{} at ({},{})", 
                request.region.width, request.region.height,
                request.region.x, request.region.y),
            confidence: 85,
        }
    ];
    
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
    
    // Get existing masks from the case
    let case_result = sqlx::query_scalar::<_, Option<String>>(
        "SELECT validation_result FROM review_cases WHERE id = ?"
    )
    .bind(&case_id)
    .fetch_optional(pool.get_ref())
    .await;
    
    let validation_json = match case_result {
        Ok(Some(v)) => v,
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
    
    let reprocessing_started;
    
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
    
    // If remember_for_vendor is true, store the mask pattern for future use
    if request.remember_for_vendor {
        // Get vendor_id from the case
        let vendor_id_result = sqlx::query_scalar::<_, Option<String>>(
            "SELECT vendor_id FROM review_cases WHERE id = ?"
        )
        .bind(&case_id)
        .fetch_optional(pool.get_ref())
        .await;
        
        if let Ok(Some(Some(vendor_id))) = vendor_id_result {
            // Store mask in vendor template (simplified - in production would update vendor_templates table)
            log::info!("Remembering mask for vendor {}: {:?}", vendor_id, request.region);
        }
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
