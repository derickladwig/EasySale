// WebSocket endpoint handler
// Provides WebSocket connection endpoint for real-time notifications

use actix::Addr;
use actix_web::{web, HttpRequest, HttpResponse, Error};
use actix_web_actors::ws;
use tracing::{info, warn};

use crate::websocket::{WsServer, WsSession};

/// WebSocket connection endpoint
/// Establishes a WebSocket connection for real-time configuration change notifications
///
/// # Query Parameters
/// * `tenant_id` - Tenant ID for filtering notifications (required)
///
/// # Example
/// ```
/// ws://localhost:7945/ws?tenant_id=my-tenant
/// ```
pub async fn ws_index(
    req: HttpRequest,
    stream: web::Payload,
    ws_server: web::Data<Addr<WsServer>>,
) -> Result<HttpResponse, Error> {
    // Extract tenant_id from query parameters
    let query = web::Query::<TenantQuery>::from_query(req.query_string());
    
    let tenant_id = match query {
        Ok(q) => q.tenant_id.clone(),
        Err(e) => {
            warn!("WebSocket connection rejected: missing or invalid tenant_id parameter: {}", e);
            return Ok(HttpResponse::BadRequest()
                .body("Missing or invalid tenant_id query parameter"));
        }
    };
    
    // Validate tenant_id is not empty
    if tenant_id.is_empty() {
        warn!("WebSocket connection rejected: empty tenant_id");
        return Ok(HttpResponse::BadRequest()
            .body("tenant_id cannot be empty"));
    }
    
    info!("WebSocket connection request from tenant: {}", tenant_id);
    
    // Create WebSocket session
    let session = WsSession::new(tenant_id.clone(), ws_server.get_ref().clone());
    
    // Start WebSocket connection
    let resp = ws::start(session, &req, stream)?;
    
    info!("WebSocket connection established for tenant: {}", tenant_id);
    
    Ok(resp)
}

/// Query parameters for WebSocket connection
#[derive(serde::Deserialize)]
struct TenantQuery {
    tenant_id: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::{test, App};
    use crate::websocket::WsServer;
    
    #[actix_web::test]
    async fn test_ws_endpoint_missing_tenant_id() {
        let ws_server = WsServer::new().start();
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(ws_server))
                .route("/ws", web::get().to(ws_index))
        )
        .await;
        
        let req = test::TestRequest::get()
            .uri("/ws")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 400);
    }
    
    #[actix_web::test]
    async fn test_ws_endpoint_empty_tenant_id() {
        let ws_server = WsServer::new().start();
        let app = test::init_service(
            App::new()
                .app_data(web::Data::new(ws_server))
                .route("/ws", web::get().to(ws_index))
        )
        .await;
        
        let req = test::TestRequest::get()
            .uri("/ws?tenant_id=")
            .to_request();
        
        let resp = test::call_service(&app, req).await;
        assert_eq!(resp.status(), 400);
    }
}
