/**
 * Barcode Handlers
 * 
 * API endpoints for barcode generation and validation.
 */

use actix_web::{get, post, web, HttpResponse, Responder};
use serde::Deserialize;
use sqlx::SqlitePool;

use crate::services::BarcodeService;

/// POST /api/products/:id/barcode/generate
/// Generate a barcode for a product
#[post("/api/products/{id}/barcode/generate")]
pub async fn generate_barcode(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    req: web::Json<GenerateBarcodeRequest>,
) -> impl Responder {
    let product_id = path.into_inner();
    tracing::info!("Generating barcode for product: {}", product_id);

    let barcode_service = BarcodeService::new(pool.get_ref().clone());
    
    match barcode_service.generate_barcode(&req.tenant_id, Some(&req.barcode_type)).await {
        Ok(barcode) => HttpResponse::Ok().json(serde_json::json!({
            "product_id": product_id,
            "barcode": barcode,
            "barcode_type": req.barcode_type
        })),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "errors": errors
        }))
    }
}

/// POST /api/barcodes/validate
/// Validate a barcode format
#[post("/api/barcodes/validate")]
pub async fn validate_barcode(
    pool: web::Data<SqlitePool>,
    req: web::Json<ValidateBarcodeRequest>,
) -> impl Responder {
    tracing::info!("Validating barcode: {}", req.barcode);

    let barcode_service = BarcodeService::new(pool.get_ref().clone());
    
    match barcode_service.validate_barcode(&req.barcode, &req.barcode_type, &req.tenant_id, None).await {
        Ok(_) => HttpResponse::Ok().json(serde_json::json!({
            "valid": true,
            "barcode": req.barcode,
            "barcode_type": req.barcode_type
        })),
        Err(errors) => HttpResponse::BadRequest().json(serde_json::json!({
            "valid": false,
            "barcode": req.barcode,
            "barcode_type": req.barcode_type,
            "errors": errors
        }))
    }
}

/// GET /api/products/barcodes
/// Get products by barcode type
#[get("/api/products/barcodes")]
pub async fn get_products_by_barcode_type(
    pool: web::Data<SqlitePool>,
    query: web::Query<BarcodeTypeQuery>,
) -> impl Responder {
    tracing::info!("Getting products by barcode type: {:?}", query.barcode_type);

    let barcode_service = BarcodeService::new(pool.get_ref().clone());
    
    match barcode_service.get_products_by_barcode_type(&query.barcode_type, &query.tenant_id).await {
        Ok(products) => HttpResponse::Ok().json(serde_json::json!({
            "products": products,
            "barcode_type": query.barcode_type,
            "total": products.len()
        })),
        Err(errors) => {
            tracing::error!("Failed to get products by barcode type: {:?}", errors);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "errors": errors
            }))
        }
    }
}

/// POST /api/products/barcodes/generate-bulk
/// Generate barcodes for multiple products
#[post("/api/products/barcodes/generate-bulk")]
pub async fn generate_barcodes_bulk(
    pool: web::Data<SqlitePool>,
    req: web::Json<BulkGenerateRequest>,
) -> impl Responder {
    tracing::info!("Generating barcodes for {} products", req.product_ids.len());

    let barcode_service = BarcodeService::new(pool.get_ref().clone());
    let mut results = Vec::new();
    let mut errors = Vec::new();
    
    for product_id in &req.product_ids {
        match barcode_service.generate_barcode(&req.tenant_id, Some(&req.barcode_type)).await {
            Ok(barcode) => {
                results.push(serde_json::json!({
                    "product_id": product_id,
                    "barcode": barcode,
                    "success": true
                }));
            }
            Err(err) => {
                errors.push(serde_json::json!({
                    "product_id": product_id,
                    "errors": err,
                    "success": false
                }));
            }
        }
    }
    
    HttpResponse::Ok().json(serde_json::json!({
        "results": results,
        "errors": errors,
        "total_requested": req.product_ids.len(),
        "successful": results.len(),
        "failed": errors.len()
    }))
}

/// GET /api/barcodes/types
/// Get supported barcode types
#[get("/api/barcodes/types")]
pub async fn get_barcode_types() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "types": [
            {
                "code": "UPC-A",
                "name": "UPC-A",
                "description": "12-digit Universal Product Code",
                "length": 12
            },
            {
                "code": "EAN-13",
                "name": "EAN-13",
                "description": "13-digit European Article Number",
                "length": 13
            },
            {
                "code": "CODE-128",
                "name": "Code 128",
                "description": "Variable length alphanumeric code",
                "length": null
            }
        ]
    }))
}

// Request/Response types

#[derive(Deserialize)]
pub struct GenerateBarcodeRequest {
    pub barcode_type: String,
    pub tenant_id: String,
}

#[derive(Deserialize)]
pub struct ValidateBarcodeRequest {
    pub barcode: String,
    pub barcode_type: String,
    pub tenant_id: String,
}

#[derive(Deserialize)]
pub struct BarcodeTypeQuery {
    pub barcode_type: String,
    pub tenant_id: String,
}

#[derive(Deserialize)]
pub struct BulkGenerateRequest {
    pub product_ids: Vec<String>,
    pub barcode_type: String,
    pub tenant_id: String,
}
