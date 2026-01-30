/**
 * Unit Conversion Operations
 * 
 * Convert between different units of measurement
 * 
 * Requirements: 8.1, 8.2
 */

use actix_web::{post, web, HttpResponse};
use serde::{Deserialize, Serialize};

use crate::models::ApiError;
use crate::services::unit_conversion_service::{UnitConversionService, ConversionRule, NormalizedQuantity};

// ============================================================================
// Normalize Quantity
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct NormalizeQuantityRequest {
    pub quantity_string: String, // e.g., "5", "12.5"
    pub unit_string: String, // e.g., "GAL", "L"
    pub target_unit: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct NormalizeQuantityResponse {
    pub normalized: NormalizedQuantity,
}

/// Parse and normalize quantity string
/// 
/// Requirements: 8.2
#[post("/api/units/normalize")]
pub async fn normalize_quantity(
    req: web::Json<NormalizeQuantityRequest>,
) -> Result<HttpResponse, ApiError> {
    let service = UnitConversionService::new();
    
    let normalized = service.normalize_quantity(
        &req.quantity_string,
        &req.unit_string,
        req.target_unit.as_deref()
    )
    .map_err(|e| ApiError::bad_request(format!("Normalization failed: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(NormalizeQuantityResponse {
        normalized,
    }))
}

// ============================================================================
// Apply Alias Conversion
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct ApplyAliasConversionRequest {
    pub quantity: f64,
    pub unit_conversion: serde_json::Value, // JSON with multiplier, from_unit, to_unit
}

#[derive(Debug, Serialize)]
pub struct ApplyAliasConversionResponse {
    pub normalized: NormalizedQuantity,
}

/// Apply vendor-specific unit alias conversion
/// 
/// Requirements: 8.3
#[post("/api/units/apply-alias")]
pub async fn apply_alias_conversion(
    req: web::Json<ApplyAliasConversionRequest>,
) -> Result<HttpResponse, ApiError> {
    let service = UnitConversionService::new();
    
    let result = service.apply_alias_conversion(
        req.quantity,
        &req.unit_conversion,
    )
    .map_err(|e| ApiError::bad_request(format!("Alias conversion failed: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(ApplyAliasConversionResponse {
        normalized: result,
    }))
}

// ============================================================================
// Get Available Conversions
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct GetConversionsRequest {
    pub unit: String,
}

#[derive(Debug, Serialize)]
pub struct GetConversionsResponse {
    pub unit: String,
    pub available_conversions: Vec<ConversionRule>,
    pub count: usize,
}

/// Get available conversions for a unit
/// 
/// Requirements: 8.1
#[post("/api/units/get-conversions")]
pub async fn get_conversions(
    req: web::Json<GetConversionsRequest>,
) -> Result<HttpResponse, ApiError> {
    let service = UnitConversionService::new();
    let conversions = service.get_conversions_for_unit(&req.unit);
    
    let conversion_rules: Vec<ConversionRule> = conversions.into_iter().cloned().collect();
    
    Ok(HttpResponse::Ok().json(GetConversionsResponse {
        unit: req.unit.clone(),
        count: conversion_rules.len(),
        available_conversions: conversion_rules,
    }))
}

// ============================================================================
// Add Custom Conversion
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct AddConversionRequest {
    pub from_unit: String,
    pub to_unit: String,
    pub multiplier: f64,
}

/// Add a custom unit conversion rule
/// 
/// Requirements: 8.2
#[post("/api/units/add-conversion")]
pub async fn add_conversion(
    req: web::Json<AddConversionRequest>,
) -> Result<HttpResponse, ApiError> {
    let mut service = UnitConversionService::new();
    
    service.add_conversion(&req.from_unit, &req.to_unit, req.multiplier);
    
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "status": "success",
        "from_unit": req.from_unit,
        "to_unit": req.to_unit,
        "multiplier": req.multiplier
    })))
}

/// Configure unit conversion routes
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(normalize_quantity)
        .service(apply_alias_conversion)
        .service(get_conversions)
        .service(add_conversion);
}
