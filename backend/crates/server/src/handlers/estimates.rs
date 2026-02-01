//! Estimate Handlers
//!
//! HTTP endpoints for estimate operations.
//!
//! Requirements:
//! - Task 1.6: Estimate Generation
//! - Create, read, update, delete estimates
//! - Generate PDF exports
//! - Convert estimates to invoices/work orders

use actix_web::{get, post, put, delete, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::middleware::tenant::get_current_tenant_id;
use crate::services::estimate_service::{
    EstimateService, EstimateError, CreateEstimateRequest, UpdateEstimateRequest,
};
use crate::services::pdf_service::{PdfService, TenantBranding};

/// POST /api/estimates
/// Create a new estimate
#[post("/api/estimates")]
pub async fn create_estimate(
    pool: web::Data<SqlitePool>,
    request: web::Json<CreateEstimateRequest>,
) -> impl Responder {
    let tenant_id = get_current_tenant_id();
    let store_id = "default-store"; // TODO: Get from context
    let user_id = None; // TODO: Get from auth context
    
    tracing::info!(
        tenant_id = %tenant_id,
        customer_id = %request.customer_id,
        "Creating estimate"
    );
    
    let estimate_service = EstimateService::new(pool.get_ref().clone());
    
    match estimate_service.create_estimate(&tenant_id, store_id, user_id, request.into_inner()).await {
        Ok(estimate) => {
            tracing::info!(
                estimate_id = %estimate.id,
                estimate_number = %estimate.estimate_number,
                "Successfully created estimate"
            );
            HttpResponse::Created().json(estimate)
        }
        Err(EstimateError::CustomerNotFound(id)) => {
            tracing::warn!(customer_id = %id, "Customer not found");
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Customer not found",
                "customer_id": id
            }))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to create estimate");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create estimate",
                "details": e.to_string()
            }))
        }
    }
}

/// GET /api/estimates
/// List estimates with optional filters
#[get("/api/estimates")]
pub async fn list_estimates(
    pool: web::Data<SqlitePool>,
    query: web::Query<ListEstimatesQuery>,
) -> impl Responder {
    let tenant_id = get_current_tenant_id();
    
    tracing::info!(
        tenant_id = %tenant_id,
        "Listing estimates"
    );
    
    let estimate_service = EstimateService::new(pool.get_ref().clone());
    
    match estimate_service.list_estimates(
        &tenant_id,
        query.customer_id.as_deref(),
        query.status.as_deref(),
        query.limit,
        query.offset,
    ).await {
        Ok(estimates) => {
            tracing::info!(
                count = estimates.len(),
                "Successfully listed estimates"
            );
            HttpResponse::Ok().json(estimates)
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to list estimates");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to list estimates",
                "details": e.to_string()
            }))
        }
    }
}

/// GET /api/estimates/{id}
/// Get estimate by ID
#[get("/api/estimates/{id}")]
pub async fn get_estimate(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let estimate_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!(
        tenant_id = %tenant_id,
        estimate_id = %estimate_id,
        "Getting estimate"
    );
    
    let estimate_service = EstimateService::new(pool.get_ref().clone());
    
    match estimate_service.get_estimate(&tenant_id, &estimate_id).await {
        Ok(estimate) => {
            tracing::info!(
                estimate_id = %estimate.id,
                "Successfully retrieved estimate"
            );
            HttpResponse::Ok().json(estimate)
        }
        Err(EstimateError::EstimateNotFound(id)) => {
            tracing::warn!(estimate_id = %id, "Estimate not found");
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Estimate not found",
                "estimate_id": id
            }))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get estimate");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get estimate",
                "details": e.to_string()
            }))
        }
    }
}

/// GET /api/estimates/{id}/line-items
/// Get estimate line items
#[get("/api/estimates/{id}/line-items")]
pub async fn get_estimate_line_items(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let estimate_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!(
        tenant_id = %tenant_id,
        estimate_id = %estimate_id,
        "Getting estimate line items"
    );
    
    let estimate_service = EstimateService::new(pool.get_ref().clone());
    
    // Verify estimate exists and belongs to tenant
    match estimate_service.get_estimate(&tenant_id, &estimate_id).await {
        Ok(_) => {
            match estimate_service.get_estimate_line_items(&estimate_id).await {
                Ok(items) => {
                    tracing::info!(
                        count = items.len(),
                        "Successfully retrieved estimate line items"
                    );
                    HttpResponse::Ok().json(items)
                }
                Err(e) => {
                    tracing::error!(error = %e, "Failed to get estimate line items");
                    HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to get estimate line items",
                        "details": e.to_string()
                    }))
                }
            }
        }
        Err(EstimateError::EstimateNotFound(id)) => {
            tracing::warn!(estimate_id = %id, "Estimate not found");
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Estimate not found",
                "estimate_id": id
            }))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to verify estimate");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to verify estimate",
                "details": e.to_string()
            }))
        }
    }
}

/// PUT /api/estimates/{id}
/// Update estimate
#[put("/api/estimates/{id}")]
pub async fn update_estimate(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
    request: web::Json<UpdateEstimateRequest>,
) -> impl Responder {
    let estimate_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!(
        tenant_id = %tenant_id,
        estimate_id = %estimate_id,
        "Updating estimate"
    );
    
    let estimate_service = EstimateService::new(pool.get_ref().clone());
    
    match estimate_service.update_estimate(&tenant_id, &estimate_id, request.into_inner()).await {
        Ok(estimate) => {
            tracing::info!(
                estimate_id = %estimate.id,
                "Successfully updated estimate"
            );
            HttpResponse::Ok().json(estimate)
        }
        Err(EstimateError::EstimateNotFound(id)) => {
            tracing::warn!(estimate_id = %id, "Estimate not found");
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Estimate not found",
                "estimate_id": id
            }))
        }
        Err(EstimateError::AlreadyConverted) => {
            tracing::warn!(estimate_id = %estimate_id, "Estimate already converted");
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Cannot update estimate that has been converted",
                "estimate_id": estimate_id
            }))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to update estimate");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to update estimate",
                "details": e.to_string()
            }))
        }
    }
}

/// DELETE /api/estimates/{id}
/// Delete estimate (soft delete)
#[delete("/api/estimates/{id}")]
pub async fn delete_estimate(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let estimate_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!(
        tenant_id = %tenant_id,
        estimate_id = %estimate_id,
        "Deleting estimate"
    );
    
    let estimate_service = EstimateService::new(pool.get_ref().clone());
    
    match estimate_service.delete_estimate(&tenant_id, &estimate_id).await {
        Ok(_) => {
            tracing::info!(
                estimate_id = %estimate_id,
                "Successfully deleted estimate"
            );
            HttpResponse::NoContent().finish()
        }
        Err(EstimateError::EstimateNotFound(id)) => {
            tracing::warn!(estimate_id = %id, "Estimate not found");
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Estimate not found",
                "estimate_id": id
            }))
        }
        Err(EstimateError::AlreadyConverted) => {
            tracing::warn!(estimate_id = %estimate_id, "Estimate already converted");
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Cannot delete estimate that has been converted",
                "estimate_id": estimate_id
            }))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to delete estimate");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to delete estimate",
                "details": e.to_string()
            }))
        }
    }
}

/// GET /api/estimates/{id}/pdf
/// Generate PDF for estimate
#[get("/api/estimates/{id}/pdf")]
pub async fn generate_estimate_pdf(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let estimate_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!(
        tenant_id = %tenant_id,
        estimate_id = %estimate_id,
        "Generating estimate PDF"
    );
    
    let estimate_service = EstimateService::new(pool.get_ref().clone());
    let pdf_service = PdfService::new();
    
    // Get estimate
    let estimate = match estimate_service.get_estimate(&tenant_id, &estimate_id).await {
        Ok(e) => e,
        Err(EstimateError::EstimateNotFound(id)) => {
            tracing::warn!(estimate_id = %id, "Estimate not found");
            return HttpResponse::NotFound().json(serde_json::json!({
                "error": "Estimate not found",
                "estimate_id": id
            }));
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to get estimate");
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get estimate",
                "details": e.to_string()
            }));
        }
    };
    
    // Get line items
    let line_items = match estimate_service.get_estimate_line_items(&estimate_id).await {
        Ok(items) => items,
        Err(e) => {
            tracing::error!(error = %e, "Failed to get line items");
            return HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to get line items",
                "details": e.to_string()
            }));
        }
    };
    
    // Get customer info
    let customer_name = match get_customer_name(&pool, &estimate.customer_id).await {
        Ok(name) => name,
        Err(_) => "Unknown Customer".to_string(),
    };
    
    let customer_address = get_customer_address(&pool, &estimate.customer_id).await.ok();
    
    // TODO: Load tenant branding from config
    let branding = TenantBranding {
        company_name: "EasySale".to_string(),
        logo_url: None,
        primary_color: Some("#2563eb".to_string()),
        address: None,
        phone: None,
        email: None,
        website: None,
    };
    
    // Generate PDF HTML
    match pdf_service.generate_estimate_html(
        &estimate,
        &line_items,
        &branding,
        &customer_name,
        customer_address.as_deref(),
    ).await {
        Ok(html) => {
            tracing::info!(
                estimate_id = %estimate_id,
                "Successfully generated estimate PDF HTML"
            );
            HttpResponse::Ok()
                .content_type("text/html; charset=utf-8")
                .body(html)
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to generate PDF");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to generate PDF",
                "details": e.to_string()
            }))
        }
    }
}

/// POST /api/estimates/{id}/convert-to-invoice
/// Convert estimate to invoice
#[post("/api/estimates/{id}/convert-to-invoice")]
pub async fn convert_estimate_to_invoice(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let estimate_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!(
        tenant_id = %tenant_id,
        estimate_id = %estimate_id,
        "Converting estimate to invoice"
    );
    
    let estimate_service = EstimateService::new(pool.get_ref().clone());
    
    match estimate_service.convert_to_invoice(&tenant_id, &estimate_id).await {
        Ok(invoice_id) => {
            tracing::info!(
                estimate_id = %estimate_id,
                invoice_id = %invoice_id,
                "Successfully converted estimate to invoice"
            );
            HttpResponse::Created().json(serde_json::json!({
                "invoice_id": invoice_id,
                "message": "Estimate converted to invoice successfully"
            }))
        }
        Err(EstimateError::EstimateNotFound(id)) => {
            tracing::warn!(estimate_id = %id, "Estimate not found");
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Estimate not found",
                "estimate_id": id
            }))
        }
        Err(EstimateError::AlreadyConverted) => {
            tracing::warn!(estimate_id = %estimate_id, "Estimate already converted");
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Estimate has already been converted",
                "estimate_id": estimate_id
            }))
        }
        Err(EstimateError::Expired) => {
            tracing::warn!(estimate_id = %estimate_id, "Estimate expired");
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Cannot convert expired estimate",
                "estimate_id": estimate_id
            }))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to convert estimate");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to convert estimate to invoice",
                "details": e.to_string()
            }))
        }
    }
}

/// POST /api/estimates/{id}/convert-to-work-order
/// Convert estimate to work order
#[post("/api/estimates/{id}/convert-to-work-order")]
pub async fn convert_estimate_to_work_order(
    pool: web::Data<SqlitePool>,
    path: web::Path<String>,
) -> impl Responder {
    let estimate_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!(
        tenant_id = %tenant_id,
        estimate_id = %estimate_id,
        "Converting estimate to work order"
    );
    
    let estimate_service = EstimateService::new(pool.get_ref().clone());
    
    match estimate_service.convert_to_work_order(&tenant_id, &estimate_id).await {
        Ok(work_order_id) => {
            tracing::info!(
                estimate_id = %estimate_id,
                work_order_id = %work_order_id,
                "Successfully converted estimate to work order"
            );
            HttpResponse::Created().json(serde_json::json!({
                "work_order_id": work_order_id,
                "message": "Estimate converted to work order successfully"
            }))
        }
        Err(EstimateError::EstimateNotFound(id)) => {
            tracing::warn!(estimate_id = %id, "Estimate not found");
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Estimate not found",
                "estimate_id": id
            }))
        }
        Err(EstimateError::AlreadyConverted) => {
            tracing::warn!(estimate_id = %estimate_id, "Estimate already converted");
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Estimate has already been converted",
                "estimate_id": estimate_id
            }))
        }
        Err(EstimateError::Expired) => {
            tracing::warn!(estimate_id = %estimate_id, "Estimate expired");
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Cannot convert expired estimate",
                "estimate_id": estimate_id
            }))
        }
        Err(e) => {
            tracing::error!(error = %e, "Failed to convert estimate");
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to convert estimate to work order",
                "details": e.to_string()
            }))
        }
    }
}

// Helper functions

async fn get_customer_name(pool: &SqlitePool, customer_id: &str) -> Result<String, sqlx::Error> {
    let name: String = sqlx::query_scalar(
        "SELECT COALESCE(company_name, first_name || ' ' || last_name) FROM customers WHERE id = ?",
    )
    .bind(customer_id)
    .fetch_one(pool)
    .await?;
    
    Ok(name)
}

async fn get_customer_address(pool: &SqlitePool, customer_id: &str) -> Result<String, sqlx::Error> {
    let address: Option<String> = sqlx::query_scalar(
        "SELECT address FROM customers WHERE id = ?",
    )
    .bind(customer_id)
    .fetch_one(pool)
    .await?;
    
    Ok(address.unwrap_or_default())
}

// Query parameters

#[derive(serde::Deserialize)]
pub struct ListEstimatesQuery {
    pub customer_id: Option<String>,
    pub status: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}
