/**
 * Unit Conversion Handlers
 * 
 * API endpoints for unit conversion operations.
 */

use actix_web::{get, post, web, HttpResponse, Responder};
use serde::Deserialize;

use crate::services::UnitConversionService;

/// POST /api/units/convert
/// Convert a quantity from one unit to another
#[post("/api/units/convert")]
pub async fn convert_units(
    req: web::Json<ConvertUnitsRequest>,
) -> impl Responder {
    tracing::info!("Converting {} {} to {}", req.quantity, req.from_unit, req.to_unit);

    // Create service with default conversions
    let service = UnitConversionService::new();
    
    // Use normalize_quantity which handles the conversion
    match service.normalize_quantity(
        &req.quantity.to_string(),
        &req.from_unit,
        Some(&req.to_unit)
    ) {
        Ok(normalized) => HttpResponse::Ok().json(serde_json::json!({
            "original": {
                "quantity": req.quantity,
                "unit": req.from_unit
            },
            "converted": {
                "quantity": normalized.quantity,
                "unit": normalized.unit
            },
            "formula": format!("{} {} = {} {}", req.quantity, req.from_unit, normalized.quantity, normalized.unit),
            "conversion_applied": normalized.conversion_applied
        })),
        Err(e) => HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Conversion failed: {}", e)
        }))
    }
}

/// GET /api/units/conversions
/// Get all available unit conversions
#[get("/api/units/conversions")]
pub async fn get_conversions(
    query: web::Query<ConversionsQuery>,
) -> impl Responder {
    tracing::info!("Getting unit conversions");

    let service = UnitConversionService::new();
    
    if let Some(unit) = &query.unit {
        // Get conversions for specific unit
        let conversions = service.get_conversions_for_unit(unit);
        
        let conversion_list: Vec<serde_json::Value> = conversions
            .iter()
            .map(|c| serde_json::json!({
                "from_unit": c.from_unit,
                "to_unit": c.to_unit,
                "multiplier": c.multiplier
            }))
            .collect();
        
        HttpResponse::Ok().json(serde_json::json!({
            "unit": unit,
            "conversions": conversion_list,
            "total": conversion_list.len()
        }))
    } else {
        // Get all conversions grouped by category
        HttpResponse::Ok().json(serde_json::json!({
            "categories": {
                "length": [
                    {"from": "m", "to": "cm", "multiplier": 100.0},
                    {"from": "m", "to": "mm", "multiplier": 1000.0},
                    {"from": "m", "to": "km", "multiplier": 0.001},
                    {"from": "m", "to": "in", "multiplier": 39.3701},
                    {"from": "m", "to": "ft", "multiplier": 3.28084},
                    {"from": "m", "to": "yd", "multiplier": 1.09361},
                    {"from": "m", "to": "mi", "multiplier": 0.000621371}
                ],
                "weight": [
                    {"from": "kg", "to": "g", "multiplier": 1000.0},
                    {"from": "kg", "to": "mg", "multiplier": 1_000_000.0},
                    {"from": "kg", "to": "lb", "multiplier": 2.20462},
                    {"from": "kg", "to": "oz", "multiplier": 35.274}
                ],
                "volume": [
                    {"from": "l", "to": "ml", "multiplier": 1000.0},
                    {"from": "l", "to": "gal", "multiplier": 0.264172},
                    {"from": "l", "to": "qt", "multiplier": 1.05669},
                    {"from": "l", "to": "pt", "multiplier": 2.11338},
                    {"from": "l", "to": "cup", "multiplier": 4.22675},
                    {"from": "l", "to": "fl_oz", "multiplier": 33.814}
                ],
                "temperature": [
                    {"from": "C", "to": "F", "formula": "(C * 9/5) + 32"},
                    {"from": "C", "to": "K", "formula": "C + 273.15"},
                    {"from": "F", "to": "C", "formula": "(F - 32) * 5/9"}
                ]
            }
        }))
    }
}

/// POST /api/units/normalize
/// Normalize a quantity string (e.g., "5.5 kg" -> 5.5)
#[post("/api/units/normalize")]
pub async fn normalize_quantity(
    req: web::Json<NormalizeQuantityRequest>,
) -> impl Responder {
    tracing::info!("Normalizing quantity: {}", req.quantity_string);

    let service = UnitConversionService::new();
    
    // Parse the quantity string to extract quantity and unit
    // For now, assume format is "quantity unit" or just "quantity"
    let parts: Vec<&str> = req.quantity_string.trim().split_whitespace().collect();
    
    let (quantity_str, source_unit) = if parts.len() >= 2 {
        (parts[0], parts[1])
    } else {
        (parts[0], req.target_unit.as_str())
    };
    
    match service.normalize_quantity(quantity_str, source_unit, Some(&req.target_unit)) {
        Ok(normalized) => HttpResponse::Ok().json(serde_json::json!({
            "original": req.quantity_string,
            "normalized": {
                "quantity": normalized.quantity,
                "unit": normalized.unit
            },
            "conversion_applied": normalized.conversion_applied
        })),
        Err(e) => HttpResponse::BadRequest().json(serde_json::json!({
            "error": format!("Normalization failed: {}", e)
        }))
    }
}

/// GET /api/units/categories
/// Get all unit categories
#[get("/api/units/categories")]
pub async fn get_unit_categories() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "categories": [
            {
                "name": "length",
                "units": ["m", "cm", "mm", "km", "in", "ft", "yd", "mi"],
                "base_unit": "m"
            },
            {
                "name": "weight",
                "units": ["kg", "g", "mg", "lb", "oz"],
                "base_unit": "kg"
            },
            {
                "name": "volume",
                "units": ["l", "ml", "gal", "qt", "pt", "cup", "fl_oz"],
                "base_unit": "l"
            },
            {
                "name": "temperature",
                "units": ["C", "F", "K"],
                "base_unit": "C"
            },
            {
                "name": "area",
                "units": ["m2", "cm2", "km2", "ft2", "yd2", "acre"],
                "base_unit": "m2"
            }
        ]
    }))
}

/// POST /api/units/batch-convert
/// Convert multiple quantities at once
#[post("/api/units/batch-convert")]
pub async fn batch_convert(
    req: web::Json<BatchConvertRequest>,
) -> impl Responder {
    tracing::info!("Batch converting {} items", req.conversions.len());

    let service = UnitConversionService::new();
    let mut results = Vec::new();
    let mut errors = Vec::new();
    
    for conversion in &req.conversions {
        match service.normalize_quantity(
            &conversion.quantity.to_string(),
            &conversion.from_unit,
            Some(&conversion.to_unit)
        ) {
            Ok(normalized) => {
                results.push(serde_json::json!({
                    "original": {
                        "quantity": conversion.quantity,
                        "unit": conversion.from_unit
                    },
                    "converted": {
                        "quantity": normalized.quantity,
                        "unit": normalized.unit
                    },
                    "success": true
                }));
            }
            Err(e) => {
                errors.push(serde_json::json!({
                    "original": {
                        "quantity": conversion.quantity,
                        "unit": conversion.from_unit
                    },
                    "to_unit": conversion.to_unit,
                    "error": format!("{}", e),
                    "success": false
                }));
            }
        }
    }
    
    HttpResponse::Ok().json(serde_json::json!({
        "results": results,
        "errors": errors,
        "total_requested": req.conversions.len(),
        "successful": results.len(),
        "failed": errors.len()
    }))
}

// Request types

#[derive(Deserialize)]
pub struct ConvertUnitsRequest {
    pub quantity: f64,
    pub from_unit: String,
    pub to_unit: String,
}

#[derive(Deserialize)]
pub struct ConversionsQuery {
    pub unit: Option<String>,
}

#[derive(Deserialize)]
pub struct NormalizeQuantityRequest {
    pub quantity_string: String,
    pub target_unit: String,
}

#[derive(Deserialize)]
pub struct BatchConvertRequest {
    pub conversions: Vec<ConvertUnitsRequest>,
}
