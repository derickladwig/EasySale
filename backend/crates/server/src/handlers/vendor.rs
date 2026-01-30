use actix_web::{web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::middleware::get_current_tenant_id;
use crate::models::{
    CreateVendorRequest, UpdateVendorRequest, CreateVendorTemplateRequest,
};
use crate::services::VendorService;

/// Create a new vendor
#[actix_web::post("/api/vendors")]
pub async fn create_vendor(
    pool: web::Data<SqlitePool>,
    vendor: web::Json<CreateVendorRequest>,
) -> impl Responder {
    let service = VendorService::new(pool.get_ref().clone());
    let tenant_id = get_current_tenant_id();
    
    match service.create_vendor(&tenant_id, vendor.into_inner()).await {
        Ok(vendor) => HttpResponse::Created().json(vendor),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}

/// Get a vendor by ID
#[actix_web::get("/api/vendors/{id}")]
pub async fn get_vendor(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let service = VendorService::new(pool.get_ref().clone());
    let vendor_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    match service.get_vendor(&tenant_id, &vendor_id).await {
        Ok(Some(vendor)) => HttpResponse::Ok().json(vendor),
        Ok(None) => HttpResponse::NotFound().json(serde_json::json!({
            "error": "Vendor not found"
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}

/// List all vendors
#[actix_web::get("/api/vendors")]
pub async fn list_vendors(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    let service = VendorService::new(pool.get_ref().clone());
    let tenant_id = get_current_tenant_id();
    
    match service.list_vendors(&tenant_id).await {
        Ok(vendors) => HttpResponse::Ok().json(vendors),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}

/// Update a vendor
#[actix_web::put("/api/vendors/{id}")]
pub async fn update_vendor(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    vendor: web::Json<UpdateVendorRequest>,
) -> impl Responder {
    let service = VendorService::new(pool.get_ref().clone());
    let vendor_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    match service.update_vendor(&tenant_id, &vendor_id, vendor.into_inner()).await {
        Ok(vendor) => HttpResponse::Ok().json(vendor),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}

/// Delete a vendor
#[actix_web::delete("/api/vendors/{id}")]
pub async fn delete_vendor(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let service = VendorService::new(pool.get_ref().clone());
    let vendor_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    match service.delete_vendor(&tenant_id, &vendor_id).await {
        Ok(_) => HttpResponse::NoContent().finish(),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}

/// Get vendor templates
#[actix_web::get("/api/vendors/templates")]
pub async fn get_vendor_templates(
    pool: web::Data<SqlitePool>,
) -> impl Responder {
    let service = VendorService::new(pool.get_ref().clone());
    let tenant_id = get_current_tenant_id();
    
    match service.get_vendor_templates(&tenant_id).await {
        Ok(templates) => HttpResponse::Ok().json(serde_json::json!({
            "templates": templates,
            "total": templates.len()
        })),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}

/// Create a vendor template
#[actix_web::post("/api/vendors/templates")]
pub async fn create_vendor_template(
    pool: web::Data<SqlitePool>,
    template: web::Json<CreateVendorTemplateRequest>,
) -> impl Responder {
    let service = VendorService::new(pool.get_ref().clone());
    let tenant_id = get_current_tenant_id();
    
    match service.create_vendor_template(&tenant_id, template.into_inner()).await {
        Ok(template) => HttpResponse::Created().json(template),
        Err(e) => HttpResponse::InternalServerError().json(serde_json::json!({
            "error": e
        })),
    }
}
