/**
 * Vendor Operations Handler
 * 
 * Endpoints for vendor bill processing:
 * - SKU matching engine
 * - OCR processing
 * - Bill parsing
 * - Sync logging
 * - Queue processing
 */

use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use crate::services::matching_engine::{MatchingEngine, MatchStatus};
use crate::services::ocr_service::{OCRService, OCREngine, OCRConfig};
use crate::services::parsing_service::{ParsingService, ParsedBill};
use crate::services::sync_logger::{SyncLogger, LogLevel, SyncResult};
use crate::services::sync_queue_processor::SyncQueueProcessor;
use crate::models::vendor::VendorBillLine;
use crate::models::sync::SyncQueueItem;

// ============================================================================
// SKU Matching Endpoints
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct MatchSkuRequest {
    pub vendor_id: String,
    pub vendor_sku: String,
    pub description: String,
    pub tenant_id: String,
}

#[derive(Debug, Serialize)]
pub struct MatchSkuResponse {
    pub matched_sku: String,
    pub confidence: f64,
    pub reason: String,
    pub status: String,
    pub alternatives: Vec<serde_json::Value>,
}

/// Match vendor SKU to internal product
/// POST /api/vendor/match-sku
pub async fn match_sku(
    pool: web::Data<SqlitePool>,
    req: web::Json<MatchSkuRequest>,
) -> impl Responder {
    let engine = MatchingEngine::new(pool.get_ref().clone());
    
    // Create a temporary bill line for matching
    let line = VendorBillLine {
        id: String::new(),
        vendor_bill_id: String::new(),
        line_no: 1,
        vendor_sku_raw: req.vendor_sku.clone(),
        vendor_sku_norm: VendorBillLine::normalize_sku(&req.vendor_sku),
        desc_raw: req.description.clone(),
        qty_raw: "1".to_string(),
        unit_raw: "EA".to_string(),
        unit_price_raw: "0.00".to_string(),
        ext_price_raw: "0.00".to_string(),
        normalized_qty: 1.0,
        normalized_unit: "EA".to_string(),
        unit_price: 0.0,
        ext_price: 0.0,
        matched_sku: None,
        match_confidence: 0.0,
        match_reason: String::new(),
        user_overridden: false,
        created_at: chrono::Utc::now().to_rfc3339(),
        updated_at: chrono::Utc::now().to_rfc3339(),
    };

    match engine.match_line(&line, &req.vendor_id, &req.tenant_id).await {
        Ok(result) => {
            let status = MatchingEngine::apply_thresholds(result.confidence, 0.95, 0.70);
            let status_str = match status {
                MatchStatus::AutoAccept => "auto_accept",
                MatchStatus::Review => "review",
                MatchStatus::Manual => "manual",
            };

            HttpResponse::Ok().json(MatchSkuResponse {
                matched_sku: result.matched_sku,
                confidence: result.confidence,
                reason: result.reason,
                status: status_str.to_string(),
                alternatives: result.alternatives.iter()
                    .map(|alt| serde_json::json!({
                        "sku": alt.sku,
                        "name": alt.name,
                        "confidence": alt.confidence,
                        "reason": alt.reason,
                    }))
                    .collect(),
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Matching failed: {}", e)
        })),
    }
}

// ============================================================================
// OCR Processing Endpoints
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ProcessImageRequest {
    pub image_path: String,
    pub engine: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ProcessImageResponse {
    pub text: String,
    pub confidence: f64,
    pub engine: String,
    pub processing_time_ms: u64,
}

/// Process image with OCR
/// POST /api/vendor/ocr/process
pub async fn process_image_ocr(
    req: web::Json<ProcessImageRequest>,
) -> impl Responder {
    // Create OCR service with specified or default engine
    let engine = match req.engine.as_deref() {
        Some("tesseract") | None => OCREngine::Tesseract {
            tesseract_path: "tesseract".to_string(),
        },
        Some("google_vision") => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Google Vision requires API key configuration"
            }));
        }
        Some("aws_textract") => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": "AWS Textract requires region configuration"
            }));
        }
        Some(other) => {
            return HttpResponse::BadRequest().json(serde_json::json!({
                "error": format!("Unknown OCR engine: {}", other)
            }));
        }
    };

    let service = OCRService::new(engine);

    match service.process_image(&req.image_path).await {
        Ok(result) => HttpResponse::Ok().json(ProcessImageResponse {
            text: result.text,
            confidence: result.confidence,
            engine: result.engine,
            processing_time_ms: result.processing_time_ms,
        }),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("OCR processing failed: {}", e)
        })),
    }
}

/// Get OCR configuration
/// GET /api/vendor/ocr/config
pub async fn get_ocr_config() -> impl Responder {
    let config = OCRConfig::default();
    HttpResponse::Ok().json(config)
}

// ============================================================================
// Bill Parsing Endpoints
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ParseBillRequest {
    pub ocr_text: String,
    pub use_template: bool,
    pub template_id: Option<String>,
}

/// Parse OCR text into structured bill
/// POST /api/vendor/parse
pub async fn parse_bill(
    pool: web::Data<SqlitePool>,
    req: web::Json<ParseBillRequest>,
) -> impl Responder {
    let result: Result<ParsedBill, String> = if req.use_template {
        if let Some(template_id) = &req.template_id {
            // Load template from database
            let template_result = sqlx::query_as::<_, crate::models::vendor::VendorTemplate>(
                "SELECT * FROM vendor_templates WHERE id = ?"
            )
            .bind(template_id)
            .fetch_optional(pool.get_ref())
            .await;

            match template_result {
                Ok(Some(template)) => {
                    ParsingService::parse_with_template(&req.ocr_text, &template)
                        .map_err(|e| format!("Template parsing failed: {}", e))
                }
                Ok(None) => Err(format!("Template not found: {}", template_id)),
                Err(e) => Err(format!("Database error: {}", e)),
            }
        } else {
            Err("Template ID required when use_template is true".to_string())
        }
    } else {
        ParsingService::parse_generic(&req.ocr_text)
            .map_err(|e| format!("Generic parsing failed: {}", e))
    };

    match result {
        Ok(parsed) => HttpResponse::Ok().json(parsed),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}

#[derive(Debug, Deserialize)]
pub struct ValidateTotalsRequest {
    pub parsed_bill: ParsedBill,
    pub tolerance_percent: Option<f64>,
}

/// Validate parsed bill totals
/// POST /api/vendor/validate-totals
pub async fn validate_totals(
    req: web::Json<ValidateTotalsRequest>,
) -> impl Responder {
    let tolerance = req.tolerance_percent.unwrap_or(5.0);
    
    match ParsingService::validate_totals(&req.parsed_bill, tolerance) {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "valid": true,
            "message": "Totals validated successfully"
        })),
        Err(e) => HttpResponse::Ok().json(serde_json::json!({
            "valid": false,
            "message": format!("{}", e)
        })),
    }
}

// ============================================================================
// Sync Logging Endpoints
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct LogSyncRequest {
    pub tenant_id: String,
    pub sync_id: String,
    pub connector_id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub operation: String,
    pub result: String,
    pub level: String,
    pub message: String,
    pub error_details: Option<String>,
    pub duration_ms: Option<i64>,
}

/// Log a sync operation
/// POST /api/sync/log
pub async fn log_sync_operation(
    pool: web::Data<SqlitePool>,
    req: web::Json<LogSyncRequest>,
) -> impl Responder {
    let logger = SyncLogger::new(pool.get_ref().clone());

    let result = match req.result.as_str() {
        "success" => SyncResult::Success,
        "warning" => SyncResult::Warning,
        "error" => SyncResult::Error,
        _ => SyncResult::Error,
    };

    let level = match req.level.as_str() {
        "debug" => LogLevel::Debug,
        "info" => LogLevel::Info,
        "warn" => LogLevel::Warn,
        "error" => LogLevel::Error,
        _ => LogLevel::Info,
    };

    match logger.log(
        &req.tenant_id,
        &req.sync_id,
        &req.connector_id,
        &req.entity_type,
        &req.entity_id,
        &req.operation,
        result,
        level,
        &req.message,
        req.error_details.as_deref(),
        req.duration_ms,
        None,
    ).await {
        Ok(log_id) => HttpResponse::Ok().json(serde_json::json!({
            "log_id": log_id,
            "message": "Log entry created"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}

/// Get sync logs for a sync run
/// GET /api/sync/logs/{tenant_id}/{sync_id}
pub async fn get_sync_logs(
    pool: web::Data<SqlitePool>,
    path: web::Path<(String, String)>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let (tenant_id, sync_id) = path.into_inner();
    let limit = query.get("limit")
        .and_then(|l| l.parse::<i64>().ok());

    let logger = SyncLogger::new(pool.get_ref().clone());

    match logger.get_sync_logs(&tenant_id, &sync_id, limit).await {
        Ok(logs) => HttpResponse::Ok().json(logs),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}

/// Get error logs
/// GET /api/sync/errors/{tenant_id}
pub async fn get_error_logs(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let tenant_id = path.into_inner();
    let connector_id = query.get("connector_id").map(|s| s.as_str());
    let limit = query.get("limit")
        .and_then(|l| l.parse::<i64>().ok());

    let logger = SyncLogger::new(pool.get_ref().clone());

    match logger.get_error_logs(&tenant_id, connector_id, limit).await {
        Ok(logs) => HttpResponse::Ok().json(logs),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}

// ============================================================================
// Queue Processing Endpoints
// ============================================================================

/// Process a sync queue item
/// POST /api/sync/queue/process
pub async fn process_queue_item(
    pool: web::Data<SqlitePool>,
    req: web::Json<SyncQueueItem>,
) -> impl Responder {
    let processor = SyncQueueProcessor::new(pool.get_ref().clone());

    match processor.process_item(&req).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": format!("Processed {} {} {}", req.operation, req.entity_type, req.entity_id)
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e.error_message,
            "entity_type": e.entity_type,
            "entity_id": e.entity_id,
        })),
    }
}

/// Get pending queue items
/// GET /api/sync/queue/{tenant_id}
pub async fn get_queue_items(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    query: web::Query<std::collections::HashMap<String, String>>,
) -> impl Responder {
    let tenant_id = path.into_inner();
    let limit = query.get("limit")
        .and_then(|l| l.parse::<i64>().ok())
        .unwrap_or(100);

    let result = sqlx::query_as::<_, SyncQueueItem>(
        r#"
        SELECT * FROM sync_queue
        WHERE tenant_id = ? AND status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT ?
        "#
    )
    .bind(&tenant_id)
    .bind(limit)
    .fetch_all(pool.get_ref())
    .await;

    match result {
        Ok(items) => HttpResponse::Ok().json(items),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": format!("Failed to fetch queue items: {}", e)
        })),
    }
}

// ============================================================================
// Route Configuration
// ============================================================================

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/vendor")
            // SKU Matching
            .route("/match-sku", web::post().to(match_sku))
            // OCR Processing
            .route("/ocr/process", web::post().to(process_image_ocr))
            .route("/ocr/config", web::get().to(get_ocr_config))
            // Bill Parsing
            .route("/parse", web::post().to(parse_bill))
            .route("/validate-totals", web::post().to(validate_totals))
    )
    .service(
        web::scope("/api/sync")
            // Sync Logging
            .route("/log", web::post().to(log_sync_operation))
            .route("/logs/{tenant_id}/{sync_id}", web::get().to(get_sync_logs))
            .route("/errors/{tenant_id}", web::get().to(get_error_logs))
            // Queue Processing
            .route("/queue/process", web::post().to(process_queue_item))
            .route("/queue/{tenant_id}", web::get().to(get_queue_items))
    );
}
