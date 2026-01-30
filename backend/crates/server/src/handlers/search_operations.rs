/**
 * Search Operations Handler
 * 
 * Endpoints for product search:
 * - Update search index
 * - Rebuild search index
 * - Search by barcode
 * - Search by SKU
 */

use actix_web::{web, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use crate::services::search_service::SearchService;
use crate::config::loader::ConfigLoader;

// ============================================================================
// Search Index Management
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct UpdateIndexRequest {
    pub tenant_id: String,
    pub product_id: String,
}

/// Update search index for a product
/// POST /api/search/index/update
pub async fn update_index(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: web::Json<UpdateIndexRequest>,
) -> impl Responder {
    let service = SearchService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service.update_index(&req.tenant_id, &req.product_id).await {
        Ok(()) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": format!("Index updated for product {}", req.product_id)
        })),
        Err(errors) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to update index",
            "details": errors
        })),
    }
}

#[derive(Debug, Deserialize)]
pub struct RebuildIndexRequest {
    pub tenant_id: String,
}

/// Rebuild entire search index
/// POST /api/search/index/rebuild
pub async fn rebuild_index(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: web::Json<RebuildIndexRequest>,
) -> impl Responder {
    let service = SearchService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service.rebuild_index(&req.tenant_id).await {
        Ok(count) => HttpResponse::Ok().json(serde_json::json!({
            "success": true,
            "message": format!("Index rebuilt with {} products", count),
            "product_count": count
        })),
        Err(errors) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Failed to rebuild index",
            "details": errors
        })),
    }
}

// ============================================================================
// Search Operations
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct SearchByBarcodeRequest {
    pub tenant_id: String,
    pub barcode: String,
}

#[derive(Debug, Serialize)]
pub struct SearchResult {
    pub products: Vec<serde_json::Value>,
    pub count: usize,
}

/// Search products by barcode
/// POST /api/search/barcode
pub async fn search_by_barcode(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: web::Json<SearchByBarcodeRequest>,
) -> impl Responder {
    let service = SearchService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service.search_by_barcode(&req.barcode, &req.tenant_id).await {
        Ok(Some(product)) => {
            HttpResponse::Ok().json(serde_json::json!({
                "product": {
                    "id": product.id,
                    "sku": product.sku,
                    "name": product.name,
                    "barcode": product.barcode,
                    "category": product.category,
                    "is_active": product.is_active,
                },
                "found": true
            }))
        }
        Ok(None) => {
            HttpResponse::Ok().json(serde_json::json!({
                "product": null,
                "found": false
            }))
        }
        Err(errors) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Search failed",
            "details": errors
        })),
    }
}

#[derive(Debug, Deserialize)]
pub struct SearchBySkuRequest {
    pub tenant_id: String,
    pub sku: String,
}

/// Search products by SKU
/// POST /api/search/sku
pub async fn search_by_sku(
    pool: web::Data<SqlitePool>,
    config_loader: web::Data<ConfigLoader>,
    req: web::Json<SearchBySkuRequest>,
) -> impl Responder {
    let service = SearchService::new(pool.get_ref().clone(), config_loader.get_ref().clone());

    match service.search_by_sku(&req.sku, &req.tenant_id).await {
        Ok(Some(product)) => {
            HttpResponse::Ok().json(serde_json::json!({
                "product": {
                    "id": product.id,
                    "sku": product.sku,
                    "name": product.name,
                    "barcode": product.barcode,
                    "category": product.category,
                    "is_active": product.is_active,
                },
                "found": true
            }))
        }
        Ok(None) => {
            HttpResponse::Ok().json(serde_json::json!({
                "product": null,
                "found": false
            }))
        }
        Err(errors) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": "Search failed",
            "details": errors
        })),
    }
}

// ============================================================================
// Route Configuration
// ============================================================================

pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/api/search")
            // Index management
            .route("/index/update", web::post().to(update_index))
            .route("/index/rebuild", web::post().to(rebuild_index))
            // Search operations
            .route("/barcode", web::post().to(search_by_barcode))
            .route("/sku", web::post().to(search_by_sku))
    );
}
