//! Cleanup API Handlers
//!
//! Provides REST API endpoints for the Document Cleanup Engine:
//! - POST /api/cleanup/detect - Auto-detect shields
//! - POST /api/cleanup/resolve - Resolve shields with precedence
//! - GET/PUT /api/cleanup/vendors/{vendor_id}/rules - Vendor rules
//! - GET/PUT /api/cleanup/templates/{template_id}/rules - Template rules
//! - POST /api/cleanup/render-overlay - Render overlay image
//! - POST /api/review/{case_id}/cleanup-snapshot - Save shields snapshot
//!
//! Security: Frontend never sends file paths; backend resolves from DB.

use actix_web::{web, HttpMessage, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use tracing::{info, warn};

use crate::services::cleanup_engine::{
    ApplyMode, CleanupEngine, CleanupPersistence,
    CleanupShield, NormalizedBBox, PageTarget, ShieldSource, ShieldType,
    ZoneTarget,
};

// ============================================================================
// Request/Response Types
// ============================================================================

/// Request for shield detection
#[derive(Debug, Deserialize)]
pub struct DetectRequest {
    /// Review case ID (server resolves file path)
    pub review_case_id: Option<String>,
    /// Document ID (alternative to review_case_id)
    pub document_id: Option<String>,
    /// Specific pages to detect (default: all)
    pub pages: Option<Vec<u32>>,
}


/// Response for shield detection
#[derive(Debug, Serialize)]
pub struct DetectResponse {
    pub shields: Vec<CleanupShieldDto>,
    pub processing_time_ms: u64,
    pub auto_detected_count: usize,
    pub warnings: Vec<String>,
}

/// Request for shield resolution
#[derive(Debug, Deserialize)]
pub struct ResolveRequest {
    /// Review case ID (server resolves file path)
    pub review_case_id: Option<String>,
    /// Document ID (alternative to review_case_id)
    pub document_id: Option<String>,
    /// Specific pages to resolve (default: all)
    pub pages: Option<Vec<u32>>,
    /// Vendor context for rule lookup
    pub vendor_id: Option<String>,
    /// Template context for rule lookup
    pub template_id: Option<String>,
    /// Session-only overrides
    #[serde(default)]
    pub session_overrides: Vec<CleanupShieldDto>,
}

/// Response for shield resolution
#[derive(Debug, Serialize)]
pub struct ResolveResponse {
    pub resolved_shields: Vec<CleanupShieldDto>,
    pub warnings: Vec<String>,
    pub precedence_explanations: Vec<PrecedenceExplanationDto>,
    pub critical_zone_conflicts: Vec<ZoneConflictDto>,
}

/// DTO for CleanupShield (API representation)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupShieldDto {
    pub id: String,
    pub shield_type: String,
    pub normalized_bbox: NormalizedBBoxDto,
    pub page_target: PageTargetDto,
    #[serde(default)]
    pub zone_target: ZoneTargetDto,
    pub apply_mode: String,
    pub risk_level: String,
    pub confidence: f64,
    pub why_detected: String,
    pub source: String,
}


/// DTO for NormalizedBBox
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NormalizedBBoxDto {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// DTO for PageTarget
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "pages")]
pub enum PageTargetDto {
    All,
    First,
    Last,
    Specific(Vec<u32>),
}

impl Default for PageTargetDto {
    fn default() -> Self {
        PageTargetDto::All
    }
}

/// DTO for ZoneTarget
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ZoneTargetDto {
    pub include_zones: Option<Vec<String>>,
    #[serde(default)]
    pub exclude_zones: Vec<String>,
}

/// DTO for PrecedenceExplanation
#[derive(Debug, Serialize)]
pub struct PrecedenceExplanationDto {
    pub shield_id: String,
    pub winning_source: String,
    pub overridden_sources: Vec<String>,
    pub reason: String,
}

/// DTO for ZoneConflict
#[derive(Debug, Serialize)]
pub struct ZoneConflictDto {
    pub shield_id: String,
    pub zone_id: String,
    pub overlap_ratio: f64,
    pub action_taken: String,
}

/// Request for saving vendor rules
#[derive(Debug, Deserialize)]
pub struct SaveVendorRulesRequest {
    pub doc_type: Option<String>,
    pub rules: Vec<CleanupShieldDto>,
}

/// Request for saving template rules
#[derive(Debug, Deserialize)]
pub struct SaveTemplateRulesRequest {
    pub vendor_id: String,
    pub doc_type: Option<String>,
    pub rules: Vec<CleanupShieldDto>,
}

/// Request for rendering overlay
#[derive(Debug, Deserialize)]
pub struct RenderOverlayRequest {
    pub review_case_id: Option<String>,
    pub document_id: Option<String>,
    pub shields: Vec<CleanupShieldDto>,
    pub include_legend: Option<bool>,
}

/// Response for rendering overlay
#[derive(Debug, Serialize)]
pub struct RenderOverlayResponse {
    pub overlay_path: String,
}

/// Request for saving cleanup snapshot
#[derive(Debug, Deserialize)]
pub struct SaveSnapshotRequest {
    pub shields: Vec<CleanupShieldDto>,
}

/// Response for saving cleanup snapshot
#[derive(Debug, Serialize)]
pub struct SaveSnapshotResponse {
    pub snapshot_id: String,
}

/// Error response
#[derive(Debug, Serialize)]
pub struct ErrorResponse {
    pub error: String,
}


// ============================================================================
// Conversion Functions
// ============================================================================

impl From<&CleanupShield> for CleanupShieldDto {
    fn from(shield: &CleanupShield) -> Self {
        CleanupShieldDto {
            id: shield.id.clone(),
            shield_type: format!("{:?}", shield.shield_type),
            normalized_bbox: NormalizedBBoxDto {
                x: shield.normalized_bbox.x,
                y: shield.normalized_bbox.y,
                width: shield.normalized_bbox.width,
                height: shield.normalized_bbox.height,
            },
            page_target: match &shield.page_target {
                PageTarget::All => PageTargetDto::All,
                PageTarget::First => PageTargetDto::First,
                PageTarget::Last => PageTargetDto::Last,
                PageTarget::Specific(pages) => PageTargetDto::Specific(pages.clone()),
            },
            zone_target: ZoneTargetDto {
                include_zones: shield.zone_target.include_zones.clone(),
                exclude_zones: shield.zone_target.exclude_zones.clone(),
            },
            apply_mode: format!("{:?}", shield.apply_mode),
            risk_level: format!("{:?}", shield.risk_level),
            confidence: shield.confidence,
            why_detected: shield.why_detected.clone(),
            source: format!("{:?}", shield.provenance.source),
        }
    }
}

impl TryFrom<&CleanupShieldDto> for CleanupShield {
    type Error = String;

    fn try_from(dto: &CleanupShieldDto) -> Result<Self, Self::Error> {
        let shield_type = parse_shield_type(&dto.shield_type)?;
        let apply_mode = parse_apply_mode(&dto.apply_mode)?;
        let source = parse_shield_source(&dto.source)?;

        let bbox = NormalizedBBox::new(
            dto.normalized_bbox.x,
            dto.normalized_bbox.y,
            dto.normalized_bbox.width,
            dto.normalized_bbox.height,
        );

        let page_target = match &dto.page_target {
            PageTargetDto::All => PageTarget::All,
            PageTargetDto::First => PageTarget::First,
            PageTargetDto::Last => PageTarget::Last,
            PageTargetDto::Specific(pages) => PageTarget::Specific(pages.clone()),
        };

        let zone_target = ZoneTarget {
            include_zones: dto.zone_target.include_zones.clone(),
            exclude_zones: dto.zone_target.exclude_zones.clone(),
        };

        let mut shield = CleanupShield::auto_detected(
            shield_type,
            bbox,
            dto.confidence,
            dto.why_detected.clone(),
        );
        shield.id = dto.id.clone();
        shield.apply_mode = apply_mode;
        shield.page_target = page_target;
        shield.zone_target = zone_target;
        shield.provenance.source = source;

        Ok(shield)
    }
}


fn parse_shield_type(s: &str) -> Result<ShieldType, String> {
    match s {
        "Logo" => Ok(ShieldType::Logo),
        "Watermark" => Ok(ShieldType::Watermark),
        "RepetitiveHeader" => Ok(ShieldType::RepetitiveHeader),
        "RepetitiveFooter" => Ok(ShieldType::RepetitiveFooter),
        "Stamp" => Ok(ShieldType::Stamp),
        "UserDefined" => Ok(ShieldType::UserDefined),
        "VendorSpecific" => Ok(ShieldType::VendorSpecific),
        "TemplateSpecific" => Ok(ShieldType::TemplateSpecific),
        _ => Err(format!("Unknown shield type: {}", s)),
    }
}

fn parse_apply_mode(s: &str) -> Result<ApplyMode, String> {
    match s {
        "Applied" => Ok(ApplyMode::Applied),
        "Suggested" => Ok(ApplyMode::Suggested),
        "Disabled" => Ok(ApplyMode::Disabled),
        _ => Err(format!("Unknown apply mode: {}", s)),
    }
}

fn parse_shield_source(s: &str) -> Result<ShieldSource, String> {
    match s {
        "AutoDetected" => Ok(ShieldSource::AutoDetected),
        "VendorRule" => Ok(ShieldSource::VendorRule),
        "TemplateRule" => Ok(ShieldSource::TemplateRule),
        "SessionOverride" => Ok(ShieldSource::SessionOverride),
        _ => Err(format!("Unknown shield source: {}", s)),
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Extract tenant_id and store_id from request context
fn get_tenant_context(req: &HttpRequest) -> (String, String) {
    if let Some(context) = req.extensions().get::<crate::models::UserContext>() {
        (
            context.tenant_id.clone(),
            context.store_id.clone().unwrap_or_else(|| "default-store".to_string()),
        )
    } else {
        warn!("User context not found in request, using defaults");
        ("default-tenant".to_string(), "default-store".to_string())
    }
}

/// Extract user_id from request context
fn get_user_id(req: &HttpRequest) -> String {
    if let Some(context) = req.extensions().get::<crate::models::UserContext>() {
        context.user_id.clone()
    } else {
        warn!("User context not found in request, using system");
        "system".to_string()
    }
}

/// Resolve file path from review_case_id or document_id
async fn resolve_file_path(
    pool: &SqlitePool,
    tenant_id: &str,
    review_case_id: Option<&str>,
    document_id: Option<&str>,
) -> Result<String, String> {
    if let Some(case_id) = review_case_id {
        // Look up from review_cases table
        let row: Option<(String,)> = sqlx::query_as(
            "SELECT source_file_path FROM review_cases WHERE id = ? AND tenant_id = ?",
        )
        .bind(case_id)
        .bind(tenant_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        match row {
            Some((path,)) => Ok(path),
            None => Err(format!("Review case not found: {}", case_id)),
        }
    } else if let Some(doc_id) = document_id {
        // Look up from documents table (if exists)
        let row: Option<(String,)> = sqlx::query_as(
            "SELECT file_path FROM documents WHERE id = ? AND tenant_id = ?",
        )
        .bind(doc_id)
        .bind(tenant_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Database error: {}", e))?;

        match row {
            Some((path,)) => Ok(path),
            None => Err(format!("Document not found: {}", doc_id)),
        }
    } else {
        Err("Either review_case_id or document_id is required".to_string())
    }
}


// ============================================================================
// API Handlers
// ============================================================================

/// POST /api/cleanup/detect
/// Auto-detect shields in a document
pub async fn detect_shields(
    req: HttpRequest,
    body: web::Json<DetectRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, _store_id) = get_tenant_context(&req);

    // Resolve file path from case/document ID
    let file_path = match resolve_file_path(
        pool.get_ref(),
        &tenant_id,
        body.review_case_id.as_deref(),
        body.document_id.as_deref(),
    )
    .await
    {
        Ok(path) => path,
        Err(e) => {
            return HttpResponse::BadRequest().json(ErrorResponse { error: e });
        }
    };

    // Create engine and detect shields
    let engine = CleanupEngine::new();

    let result = engine.auto_detect_shields_safe(std::path::Path::new(&file_path));

    let shields_dto: Vec<CleanupShieldDto> = result.shields.iter().map(CleanupShieldDto::from).collect();

    info!(
        "Detected {} shields for file: {}",
        shields_dto.len(),
        file_path
    );

    HttpResponse::Ok().json(DetectResponse {
        shields: shields_dto,
        processing_time_ms: result.processing_time_ms,
        auto_detected_count: result.auto_detected_count,
        warnings: result.warnings,
    })
}

/// POST /api/cleanup/resolve
/// Resolve shields with precedence (for Review UI)
pub async fn resolve_shields(
    req: HttpRequest,
    body: web::Json<ResolveRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, store_id) = get_tenant_context(&req);

    // Resolve file path
    let file_path = match resolve_file_path(
        pool.get_ref(),
        &tenant_id,
        body.review_case_id.as_deref(),
        body.document_id.as_deref(),
    )
    .await
    {
        Ok(path) => path,
        Err(e) => {
            return HttpResponse::BadRequest().json(ErrorResponse { error: e });
        }
    };

    // Create engine and persistence
    let engine = CleanupEngine::new();
    let persistence = CleanupPersistence::new(pool.get_ref().clone());

    // Auto-detect shields
    let auto_result = engine.auto_detect_shields_safe(std::path::Path::new(&file_path));

    // Get vendor rules if vendor_id provided
    let vendor_shields = if let Some(vendor_id) = &body.vendor_id {
        persistence
            .get_vendor_rules(&tenant_id, &store_id, vendor_id, None)
            .await
            .unwrap_or_default()
    } else {
        vec![]
    };

    // Get template rules if template_id provided
    let template_shields = if let Some(template_id) = &body.template_id {
        persistence
            .get_template_rules(&tenant_id, &store_id, template_id, None)
            .await
            .unwrap_or_default()
    } else {
        vec![]
    };

    // Convert session overrides
    let session_shields: Vec<CleanupShield> = body
        .session_overrides
        .iter()
        .filter_map(|dto| CleanupShield::try_from(dto).ok())
        .collect();

    // Merge with precedence
    let merge_result = crate::services::cleanup_engine::merge_shields(
        auto_result.shields,
        vendor_shields,
        template_shields,
        session_shields,
        &[], // TODO: Get critical zones from config
    );

    // Convert to DTOs
    let shields_dto: Vec<CleanupShieldDto> =
        merge_result.shields.iter().map(CleanupShieldDto::from).collect();

    let explanations_dto: Vec<PrecedenceExplanationDto> = merge_result
        .explanations
        .iter()
        .map(|e| PrecedenceExplanationDto {
            shield_id: e.shield_id.clone(),
            winning_source: format!("{:?}", e.winning_source),
            overridden_sources: e.overridden_sources.iter().map(|s| format!("{:?}", s)).collect(),
            reason: e.reason.clone(),
        })
        .collect();

    let conflicts_dto: Vec<ZoneConflictDto> = merge_result
        .zone_conflicts
        .iter()
        .map(|c| ZoneConflictDto {
            shield_id: c.shield_id.clone(),
            zone_id: c.zone_id.clone(),
            overlap_ratio: c.overlap_ratio,
            action_taken: c.action_taken.clone(),
        })
        .collect();

    HttpResponse::Ok().json(ResolveResponse {
        resolved_shields: shields_dto,
        warnings: merge_result.warnings,
        precedence_explanations: explanations_dto,
        critical_zone_conflicts: conflicts_dto,
    })
}


/// GET /api/cleanup/vendors/{vendor_id}/rules
/// Get vendor cleanup rules
pub async fn get_vendor_rules(
    req: HttpRequest,
    path: web::Path<String>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, store_id) = get_tenant_context(&req);
    let vendor_id = path.into_inner();

    let persistence = CleanupPersistence::new(pool.get_ref().clone());

    match persistence
        .get_vendor_rules(&tenant_id, &store_id, &vendor_id, None)
        .await
    {
        Ok(rules) => {
            let rules_dto: Vec<CleanupShieldDto> = rules.iter().map(CleanupShieldDto::from).collect();
            HttpResponse::Ok().json(rules_dto)
        }
        Err(e) => {
            warn!("Failed to get vendor rules: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to get vendor rules: {}", e),
            })
        }
    }
}

/// PUT /api/cleanup/vendors/{vendor_id}/rules
/// Save vendor cleanup rules
pub async fn save_vendor_rules(
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<SaveVendorRulesRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, store_id) = get_tenant_context(&req);
    let user_id = get_user_id(&req);
    let vendor_id = path.into_inner();

    // Convert DTOs to shields
    let shields: Result<Vec<CleanupShield>, String> = body
        .rules
        .iter()
        .map(|dto| CleanupShield::try_from(dto))
        .collect();

    let shields = match shields {
        Ok(s) => s,
        Err(e) => {
            return HttpResponse::BadRequest().json(ErrorResponse { error: e });
        }
    };

    let persistence = CleanupPersistence::new(pool.get_ref().clone());

    match persistence
        .save_vendor_rules(
            &tenant_id,
            &store_id,
            &vendor_id,
            body.doc_type.as_deref(),
            &shields,
            &user_id,
        )
        .await
    {
        Ok(()) => {
            info!(
                "Saved {} vendor rules for vendor: {}",
                shields.len(),
                vendor_id
            );
            HttpResponse::Ok().json(serde_json::json!({"success": true}))
        }
        Err(e) => {
            warn!("Failed to save vendor rules: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to save vendor rules: {}", e),
            })
        }
    }
}

/// GET /api/cleanup/templates/{template_id}/rules
/// Get template cleanup rules
pub async fn get_template_rules(
    req: HttpRequest,
    path: web::Path<String>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, store_id) = get_tenant_context(&req);
    let template_id = path.into_inner();

    let persistence = CleanupPersistence::new(pool.get_ref().clone());

    match persistence
        .get_template_rules(&tenant_id, &store_id, &template_id, None)
        .await
    {
        Ok(rules) => {
            let rules_dto: Vec<CleanupShieldDto> = rules.iter().map(CleanupShieldDto::from).collect();
            HttpResponse::Ok().json(rules_dto)
        }
        Err(e) => {
            warn!("Failed to get template rules: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to get template rules: {}", e),
            })
        }
    }
}

/// PUT /api/cleanup/templates/{template_id}/rules
/// Save template cleanup rules
pub async fn save_template_rules(
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<SaveTemplateRulesRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, store_id) = get_tenant_context(&req);
    let user_id = get_user_id(&req);
    let template_id = path.into_inner();

    // Convert DTOs to shields
    let shields: Result<Vec<CleanupShield>, String> = body
        .rules
        .iter()
        .map(|dto| CleanupShield::try_from(dto))
        .collect();

    let shields = match shields {
        Ok(s) => s,
        Err(e) => {
            return HttpResponse::BadRequest().json(ErrorResponse { error: e });
        }
    };

    let persistence = CleanupPersistence::new(pool.get_ref().clone());

    match persistence
        .save_template_rules(
            &tenant_id,
            &store_id,
            &template_id,
            &body.vendor_id,
            body.doc_type.as_deref(),
            &shields,
            &user_id,
        )
        .await
    {
        Ok(()) => {
            info!(
                "Saved {} template rules for template: {}",
                shields.len(),
                template_id
            );
            HttpResponse::Ok().json(serde_json::json!({"success": true}))
        }
        Err(e) => {
            warn!("Failed to save template rules: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to save template rules: {}", e),
            })
        }
    }
}


/// POST /api/cleanup/render-overlay
/// Render shield overlay on document image
pub async fn render_overlay(
    req: HttpRequest,
    body: web::Json<RenderOverlayRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, _store_id) = get_tenant_context(&req);

    // Resolve file path
    let _file_path = match resolve_file_path(
        pool.get_ref(),
        &tenant_id,
        body.review_case_id.as_deref(),
        body.document_id.as_deref(),
    )
    .await
    {
        Ok(path) => path,
        Err(e) => {
            return HttpResponse::BadRequest().json(ErrorResponse { error: e });
        }
    };

    // Note: Overlay rendering requires image processing library (e.g., image crate)
    // This is a Full build feature - in Lite/Export builds, return placeholder
    // Full implementation would:
    // 1. Load the original document image
    // 2. Apply cleanup shields as transparent overlays
    // 3. Save the composited image
    // 4. Return the path to the rendered overlay
    #[cfg(feature = "full")]
    {
        // Full build: actual overlay rendering would go here
        tracing::info!("Overlay rendering requested for path: {}", resolved_path);
    }
    
    HttpResponse::Ok().json(RenderOverlayResponse {
        overlay_path: format!("/api/cleanup/overlays/{}.png", uuid::Uuid::new_v4()),
    })
}

/// POST /api/review/{case_id}/cleanup-snapshot
/// Save resolved shields snapshot for a review case
pub async fn save_cleanup_snapshot(
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<SaveSnapshotRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, store_id) = get_tenant_context(&req);
    let case_id = path.into_inner();

    // Convert DTOs to shields
    let shields: Result<Vec<CleanupShield>, String> = body
        .shields
        .iter()
        .map(|dto| CleanupShield::try_from(dto))
        .collect();

    let shields = match shields {
        Ok(s) => s,
        Err(e) => {
            return HttpResponse::BadRequest().json(ErrorResponse { error: e });
        }
    };

    let persistence = CleanupPersistence::new(pool.get_ref().clone());

    match persistence
        .save_review_case_shields(&tenant_id, &store_id, &case_id, &shields, None)
        .await
    {
        Ok(snapshot_id) => {
            info!(
                "Saved cleanup snapshot for case: {}, shields: {}",
                case_id,
                shields.len()
            );
            HttpResponse::Ok().json(SaveSnapshotResponse { snapshot_id })
        }
        Err(e) => {
            warn!("Failed to save cleanup snapshot: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to save cleanup snapshot: {}", e),
            })
        }
    }
}

// ============================================================================
// Route Configuration
// ============================================================================

/// Configure cleanup API routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::resource("/api/cleanup/detect").route(web::post().to(detect_shields)),
    )
    .service(
        web::resource("/api/cleanup/resolve").route(web::post().to(resolve_shields)),
    )
    .service(
        web::resource("/api/cleanup/vendors/{vendor_id}/rules")
            .route(web::get().to(get_vendor_rules))
            .route(web::put().to(save_vendor_rules)),
    )
    .service(
        web::resource("/api/cleanup/templates/{template_id}/rules")
            .route(web::get().to(get_template_rules))
            .route(web::put().to(save_template_rules)),
    )
    .service(
        web::resource("/api/cleanup/render-overlay").route(web::post().to(render_overlay)),
    )
    .service(
        web::resource("/api/review/{case_id}/cleanup-snapshot")
            .route(web::post().to(save_cleanup_snapshot)),
    );
}


// ============================================================================
// Backward-Compatible Mask API Proxies
// ============================================================================

/// Legacy mask detection request (maps to cleanup detect)
#[derive(Debug, Deserialize)]
pub struct MaskDetectRequest {
    pub review_case_id: Option<String>,
    pub document_id: Option<String>,
    pub pages: Option<Vec<u32>>,
}

/// Legacy mask response (terminology translated)
#[derive(Debug, Serialize)]
pub struct MaskDetectResponse {
    pub masks: Vec<MaskDto>,
    pub processing_time_ms: u64,
    pub auto_detected_count: usize,
    pub warnings: Vec<String>,
}

/// Legacy mask DTO (maps to CleanupShieldDto)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MaskDto {
    pub id: String,
    pub mask_type: String,
    pub normalized_bbox: NormalizedBBoxDto,
    pub page_target: PageTargetDto,
    #[serde(default)]
    pub zone_target: ZoneTargetDto,
    pub apply_mode: String,
    pub risk_level: String,
    pub confidence: f64,
    pub why_detected: String,
    pub source: String,
}

impl From<CleanupShieldDto> for MaskDto {
    fn from(shield: CleanupShieldDto) -> Self {
        MaskDto {
            id: shield.id,
            mask_type: shield.shield_type,
            normalized_bbox: shield.normalized_bbox,
            page_target: shield.page_target,
            zone_target: shield.zone_target,
            apply_mode: shield.apply_mode,
            risk_level: shield.risk_level,
            confidence: shield.confidence,
            why_detected: shield.why_detected,
            source: shield.source,
        }
    }
}

impl From<MaskDto> for CleanupShieldDto {
    fn from(mask: MaskDto) -> Self {
        CleanupShieldDto {
            id: mask.id,
            shield_type: mask.mask_type,
            normalized_bbox: mask.normalized_bbox,
            page_target: mask.page_target,
            zone_target: mask.zone_target,
            apply_mode: mask.apply_mode,
            risk_level: mask.risk_level,
            confidence: mask.confidence,
            why_detected: mask.why_detected,
            source: mask.source,
        }
    }
}

/// POST /api/masks/detect → /api/cleanup/detect
/// Backward-compatible mask detection endpoint
#[deprecated(since = "4.0.0", note = "Use /api/cleanup/detect instead")]
pub async fn detect_masks(
    req: HttpRequest,
    body: web::Json<MaskDetectRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, _store_id) = get_tenant_context(&req);

    // Resolve file path from case/document ID
    let file_path = match resolve_file_path(
        pool.get_ref(),
        &tenant_id,
        body.review_case_id.as_deref(),
        body.document_id.as_deref(),
    )
    .await
    {
        Ok(path) => path,
        Err(e) => {
            return HttpResponse::BadRequest().json(ErrorResponse { error: e });
        }
    };

    // Create engine and detect shields
    let engine = CleanupEngine::new();
    let result = engine.auto_detect_shields_safe(std::path::Path::new(&file_path));

    // Convert to legacy mask format
    let masks: Vec<MaskDto> = result
        .shields
        .iter()
        .map(|s| MaskDto::from(CleanupShieldDto::from(s)))
        .collect();

    info!(
        "[DEPRECATED] Detected {} masks for file: {}",
        masks.len(),
        file_path
    );

    HttpResponse::Ok().json(MaskDetectResponse {
        masks,
        processing_time_ms: result.processing_time_ms,
        auto_detected_count: result.auto_detected_count,
        warnings: result.warnings,
    })
}

/// Legacy vendor mask rules request
#[derive(Debug, Deserialize)]
pub struct SaveVendorMasksRequest {
    pub doc_type: Option<String>,
    pub masks: Vec<MaskDto>,
}

/// GET /api/masks/vendor/{id} → /api/cleanup/vendors/{id}/rules
/// Backward-compatible get vendor masks endpoint
#[deprecated(since = "4.0.0", note = "Use /api/cleanup/vendors/{id}/rules instead")]
pub async fn get_vendor_masks(
    req: HttpRequest,
    path: web::Path<String>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, store_id) = get_tenant_context(&req);
    let vendor_id = path.into_inner();

    let persistence = CleanupPersistence::new(pool.get_ref().clone());

    match persistence
        .get_vendor_rules(&tenant_id, &store_id, &vendor_id, None)
        .await
    {
        Ok(rules) => {
            let masks: Vec<MaskDto> = rules
                .iter()
                .map(|s| MaskDto::from(CleanupShieldDto::from(s)))
                .collect();
            HttpResponse::Ok().json(masks)
        }
        Err(e) => {
            warn!("Failed to get vendor masks: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to get vendor masks: {}", e),
            })
        }
    }
}

/// PUT /api/masks/vendor/{id} → /api/cleanup/vendors/{id}/rules
/// Backward-compatible save vendor masks endpoint
#[deprecated(since = "4.0.0", note = "Use /api/cleanup/vendors/{id}/rules instead")]
pub async fn save_vendor_masks(
    req: HttpRequest,
    path: web::Path<String>,
    body: web::Json<SaveVendorMasksRequest>,
    pool: web::Data<SqlitePool>,
) -> HttpResponse {
    let (tenant_id, store_id) = get_tenant_context(&req);
    let user_id = get_user_id(&req);
    let vendor_id = path.into_inner();

    // Convert masks to shields
    let shield_dtos: Vec<CleanupShieldDto> = body.masks.iter().cloned().map(CleanupShieldDto::from).collect();
    let shields: Result<Vec<CleanupShield>, String> = shield_dtos
        .iter()
        .map(|dto| CleanupShield::try_from(dto))
        .collect();

    let shields = match shields {
        Ok(s) => s,
        Err(e) => {
            return HttpResponse::BadRequest().json(ErrorResponse { error: e });
        }
    };

    let persistence = CleanupPersistence::new(pool.get_ref().clone());

    match persistence
        .save_vendor_rules(
            &tenant_id,
            &store_id,
            &vendor_id,
            body.doc_type.as_deref(),
            &shields,
            &user_id,
        )
        .await
    {
        Ok(()) => {
            info!(
                "[DEPRECATED] Saved {} vendor masks for vendor: {}",
                shields.len(),
                vendor_id
            );
            HttpResponse::Ok().json(serde_json::json!({"success": true}))
        }
        Err(e) => {
            warn!("Failed to save vendor masks: {}", e);
            HttpResponse::InternalServerError().json(ErrorResponse {
                error: format!("Failed to save vendor masks: {}", e),
            })
        }
    }
}

/// Configure backward-compatible mask API routes
pub fn configure_legacy(cfg: &mut web::ServiceConfig) {
    #[allow(deprecated)]
    cfg.service(
        web::resource("/api/masks/detect").route(web::post().to(detect_masks)),
    )
    .service(
        web::resource("/api/masks/vendor/{vendor_id}")
            .route(web::get().to(get_vendor_masks))
            .route(web::put().to(save_vendor_masks)),
    );
}
