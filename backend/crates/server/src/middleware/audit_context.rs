/**
 * Audit Context Extractor
 * 
 * Extracts audit information from HTTP requests:
 * - Employee ID from JWT claims
 * - IP address from connection info
 * - User agent from headers
 * 
 * Requirements: 14.1, 10.4
 */

use actix_web::{HttpRequest, dev::ServiceRequest};
use actix_web::http::header::USER_AGENT;

/// Extract employee ID from JWT claims
pub fn extract_employee_id(req: &HttpRequest) -> Option<String> {
    // Try to get from header (primary method for now)
    req.headers()
        .get("X-Employee-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
}

/// Extract employee ID from ServiceRequest (for middleware)
pub fn extract_employee_id_from_service_req(req: &ServiceRequest) -> Option<String> {
    // Try to get from header (primary method for now)
    req.headers()
        .get("X-Employee-ID")
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
}

/// Extract IP address from connection info
pub fn extract_ip_address(req: &HttpRequest) -> Option<String> {
    // Try X-Forwarded-For header first (for proxied requests)
    if let Some(forwarded) = req.headers().get("X-Forwarded-For") {
        if let Ok(forwarded_str) = forwarded.to_str() {
            // Take the first IP in the chain
            if let Some(first_ip) = forwarded_str.split(',').next() {
                return Some(first_ip.trim().to_string());
            }
        }
    }
    
    // Try X-Real-IP header
    if let Some(real_ip) = req.headers().get("X-Real-IP") {
        if let Ok(ip_str) = real_ip.to_str() {
            return Some(ip_str.to_string());
        }
    }
    
    // Fallback to connection info
    req.connection_info()
        .realip_remote_addr()
        .map(|s| s.to_string())
}

/// Extract IP address from ServiceRequest (for middleware)
pub fn extract_ip_address_from_service_req(req: &ServiceRequest) -> Option<String> {
    // Try X-Forwarded-For header first (for proxied requests)
    if let Some(forwarded) = req.headers().get("X-Forwarded-For") {
        if let Ok(forwarded_str) = forwarded.to_str() {
            // Take the first IP in the chain
            if let Some(first_ip) = forwarded_str.split(',').next() {
                return Some(first_ip.trim().to_string());
            }
        }
    }
    
    // Try X-Real-IP header
    if let Some(real_ip) = req.headers().get("X-Real-IP") {
        if let Ok(ip_str) = real_ip.to_str() {
            return Some(ip_str.to_string());
        }
    }
    
    // Fallback to connection info
    req.connection_info()
        .realip_remote_addr()
        .map(|s| s.to_string())
}

/// Extract user agent from headers
pub fn extract_user_agent(req: &HttpRequest) -> Option<String> {
    req.headers()
        .get(USER_AGENT)
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
}

/// Extract user agent from ServiceRequest (for middleware)
pub fn extract_user_agent_from_service_req(req: &ServiceRequest) -> Option<String> {
    req.headers()
        .get(USER_AGENT)
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string())
}

/// Audit context struct for easy passing
#[derive(Debug, Clone)]
pub struct AuditContext {
    pub employee_id: Option<String>,
    pub ip_address: Option<String>,
    pub user_agent: Option<String>,
}

impl AuditContext {
    /// Extract audit context from HttpRequest
    pub fn from_request(req: &HttpRequest) -> Self {
        Self {
            employee_id: extract_employee_id(req),
            ip_address: extract_ip_address(req),
            user_agent: extract_user_agent(req),
        }
    }
    
    /// Extract audit context from ServiceRequest
    pub fn from_service_request(req: &ServiceRequest) -> Self {
        Self {
            employee_id: extract_employee_id_from_service_req(req),
            ip_address: extract_ip_address_from_service_req(req),
            user_agent: extract_user_agent_from_service_req(req),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use actix_web::test;

    #[actix_web::test]
    async fn test_extract_ip_from_forwarded_header() {
        let req = test::TestRequest::default()
            .insert_header(("X-Forwarded-For", "203.0.113.1, 198.51.100.1"))
            .to_http_request();
        
        let ip = extract_ip_address(&req);
        assert_eq!(ip, Some("203.0.113.1".to_string()));
    }

    #[actix_web::test]
    async fn test_extract_user_agent() {
        let req = test::TestRequest::default()
            .insert_header(("User-Agent", "Mozilla/5.0"))
            .to_http_request();
        
        let ua = extract_user_agent(&req);
        assert_eq!(ua, Some("Mozilla/5.0".to_string()));
    }

    #[actix_web::test]
    async fn test_audit_context_from_request() {
        let req = test::TestRequest::default()
            .insert_header(("User-Agent", "TestAgent/1.0"))
            .insert_header(("X-Real-IP", "192.0.2.1"))
            .to_http_request();
        
        let context = AuditContext::from_request(&req);
        assert_eq!(context.user_agent, Some("TestAgent/1.0".to_string()));
        assert_eq!(context.ip_address, Some("192.0.2.1".to_string()));
    }
}
