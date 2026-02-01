//! Invoice Handlers
//!
//! HTTP endpoints for invoice operations, particularly invoice creation from work orders.
//!
//! Requirements:
//! - Task 1.4: Create API endpoint POST /api/work-orders/{id}/invoice
//! - Extract tenant_id from request context
//! - Call InvoiceService.create_from_work_order()
//! - Return created invoice as JSON
//! - Handle errors appropriately (404, 400, 500)

use actix_web::{post, get, web, HttpResponse, Responder};
use sqlx::SqlitePool;

use crate::middleware::tenant::get_current_tenant_id;
use crate::services::invoice_service::{InvoiceService, InvoiceError};

/// POST /api/work-orders/{id}/invoice
/// Create an invoice from a completed work order
///
/// This endpoint:
/// 1. Validates the work order exists and is completed
/// 2. Creates an invoice with all work order line items
/// 3. Reduces inventory for consumed parts
/// 4. Updates work_order.invoiced_at timestamp
/// 5. Audit logs the invoice creation
///
/// Requirements: Task 1.4 - Create API endpoint POST /api/work-orders/{id}/invoice
#[post("/api/work-orders/{id}/invoice")]
pub async fn create_invoice_from_work_order(
    pool: web::Data<SqlitePool>,
    path: web::Path<i64>,
) -> impl Responder {
    let work_order_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!(
        tenant_id = %tenant_id,
        work_order_id = %work_order_id,
        "Creating invoice from work order"
    );
    
    // Initialize invoice service
    let invoice_service = InvoiceService::new(pool.get_ref().clone());
    
    // Create invoice from work order
    match invoice_service.create_from_work_order(&tenant_id, work_order_id).await {
        Ok(invoice) => {
            tracing::info!(
                invoice_id = %invoice.id,
                invoice_number = %invoice.invoice_number,
                work_order_id = %work_order_id,
                "Successfully created invoice from work order"
            );
            HttpResponse::Created().json(invoice)
        }
        Err(InvoiceError::WorkOrderNotFound(id)) => {
            tracing::warn!(
                work_order_id = %id,
                "Work order not found"
            );
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Work order not found",
                "work_order_id": id
            }))
        }
        Err(InvoiceError::WorkOrderNotCompleted) => {
            tracing::warn!(
                work_order_id = %work_order_id,
                "Work order is not completed"
            );
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Work order must be completed before creating invoice",
                "work_order_id": work_order_id
            }))
        }
        Err(InvoiceError::AlreadyInvoiced) => {
            tracing::warn!(
                work_order_id = %work_order_id,
                "Work order already has an invoice"
            );
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Work order already has an invoice",
                "work_order_id": work_order_id
            }))
        }
        Err(InvoiceError::InsufficientInventory(product_id)) => {
            tracing::error!(
                work_order_id = %work_order_id,
                product_id = %product_id,
                "Insufficient inventory for product"
            );
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Insufficient inventory for product",
                "product_id": product_id,
                "work_order_id": work_order_id
            }))
        }
        Err(InvoiceError::InvalidState(msg)) => {
            tracing::error!(
                work_order_id = %work_order_id,
                message = %msg,
                "Invalid work order state"
            );
            HttpResponse::BadRequest().json(serde_json::json!({
                "error": "Invalid work order state",
                "message": msg,
                "work_order_id": work_order_id
            }))
        }
        Err(InvoiceError::Database(e)) => {
            tracing::error!(
                work_order_id = %work_order_id,
                error = %e,
                "Database error while creating invoice"
            );
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to create invoice",
                "message": "An internal error occurred"
            }))
        }
    }
}

/// GET /api/invoices/{id}
/// Get an invoice by ID
///
/// Returns the invoice details including all line items.
#[get("/api/invoices/{id}")]
pub async fn get_invoice(
    pool: web::Data<SqlitePool>,
    path: web::Path<i64>,
) -> impl Responder {
    let invoice_id = path.into_inner();
    let tenant_id = get_current_tenant_id();
    
    tracing::info!(
        tenant_id = %tenant_id,
        invoice_id = %invoice_id,
        "Fetching invoice"
    );
    
    let invoice_service = InvoiceService::new(pool.get_ref().clone());
    
    match invoice_service.get_invoice(&tenant_id, invoice_id).await {
        Ok(invoice) => {
            tracing::info!(
                invoice_id = %invoice_id,
                invoice_number = %invoice.invoice_number,
                "Successfully fetched invoice"
            );
            HttpResponse::Ok().json(invoice)
        }
        Err(InvoiceError::Database(sqlx::Error::RowNotFound)) => {
            tracing::warn!(
                invoice_id = %invoice_id,
                "Invoice not found"
            );
            HttpResponse::NotFound().json(serde_json::json!({
                "error": "Invoice not found",
                "invoice_id": invoice_id
            }))
        }
        Err(e) => {
            tracing::error!(
                invoice_id = %invoice_id,
                error = %e,
                "Failed to fetch invoice"
            );
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch invoice"
            }))
        }
    }
}

/// GET /api/invoices/{id}/line-items
/// Get line items for an invoice
///
/// Returns all line items associated with the invoice.
#[get("/api/invoices/{id}/line-items")]
pub async fn get_invoice_line_items(
    pool: web::Data<SqlitePool>,
    path: web::Path<i64>,
) -> impl Responder {
    let invoice_id = path.into_inner();
    
    tracing::info!(
        invoice_id = %invoice_id,
        "Fetching invoice line items"
    );
    
    let invoice_service = InvoiceService::new(pool.get_ref().clone());
    
    match invoice_service.get_line_items(invoice_id).await {
        Ok(line_items) => {
            tracing::info!(
                invoice_id = %invoice_id,
                line_item_count = %line_items.len(),
                "Successfully fetched invoice line items"
            );
            HttpResponse::Ok().json(line_items)
        }
        Err(e) => {
            tracing::error!(
                invoice_id = %invoice_id,
                error = %e,
                "Failed to fetch invoice line items"
            );
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": "Failed to fetch invoice line items"
            }))
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};
    use crate::db;
    use crate::test_constants::TEST_TENANT_ID;
    
    /// Test that the endpoint is registered and responds
    /// Note: Full integration tests should be run with a properly initialized database
    #[actix_web::test]
    async fn test_create_invoice_endpoint_exists() {
        // Set up test database
        let pool = db::init_pool().await.expect("Failed to create test pool");
        
        // Run migrations to ensure tables exist
        if let Err(e) = crate::db::migrations::run_migrations(&pool).await {
            eprintln!("Warning: Migration failed in test: {}", e);
            // Continue anyway - endpoint should still be registered
        }
        
        // Set tenant ID for test
        std::env::set_var("TENANT_ID", TEST_TENANT_ID);
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .service(create_invoice_from_work_order)
        ).await;
        
        let req = test::TestRequest::post()
            .uri("/api/work-orders/99999/invoice")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        let status = resp.status();
        
        // Endpoint should respond (not 404 for route not found)
        // It may return 404 (work order not found), 500 (table doesn't exist), or other errors
        // The important thing is the route is registered
        assert_ne!(status, 404, "Route should be registered (404 means route not found)");
        
        // Clean up
        std::env::remove_var("TENANT_ID");
    }
    
    /// Test that the get invoice endpoint is registered
    #[actix_web::test]
    async fn test_get_invoice_endpoint_exists() {
        // Set up test database
        let pool = db::init_pool().await.expect("Failed to create test pool");
        
        // Run migrations to ensure tables exist
        if let Err(e) = crate::db::migrations::run_migrations(&pool).await {
            eprintln!("Warning: Migration failed in test: {}", e);
        }
        
        // Set tenant ID for test
        std::env::set_var("TENANT_ID", TEST_TENANT_ID);
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .service(get_invoice)
        ).await;
        
        let req = test::TestRequest::get()
            .uri("/api/invoices/99999")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        let status = resp.status();
        
        // Endpoint should respond (not 404 for route not found)
        assert_ne!(status, 404, "Route should be registered (404 means route not found)");
        
        // Clean up
        std::env::remove_var("TENANT_ID");
    }
    
    /// Test that the get line items endpoint is registered
    #[actix_web::test]
    async fn test_get_line_items_endpoint_exists() {
        let pool = db::init_pool().await.expect("Failed to create test pool");
        
        if let Err(e) = crate::db::migrations::run_migrations(&pool).await {
            eprintln!("Warning: Migration failed in test: {}", e);
        }
        
        std::env::set_var("TENANT_ID", TEST_TENANT_ID);
        
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(pool.clone()))
                .service(get_invoice_line_items)
        ).await;
        
        let req = test::TestRequest::get()
            .uri("/api/invoices/99999/line-items")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        let status = resp.status();
        
        // Endpoint should respond
        assert_ne!(status, 404, "Route should be registered");
        
        std::env::remove_var("TENANT_ID");
    }
}
