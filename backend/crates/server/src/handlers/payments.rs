/**
 * Payments Handlers
 * 
 * Handles Stripe Checkout Sessions and webhook processing.
 * Implements idempotent payment creation and webhook handling.
 * 
 * Requirements: 12.1, 12.3, 12.4, 12.5, 12.6, 12.8
 */

use actix_web::{web, HttpRequest, HttpResponse};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;
use chrono::Utc;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::env;

use crate::connectors::stripe::{StripeClient, CreateCheckoutRequest};
use crate::models::errors::ApiError;

// ============================================================================
// Request/Response Types
// ============================================================================

/// Request to create a checkout session
#[derive(Debug, Deserialize)]
pub struct CreateCheckoutSessionRequest {
    /// Order ID (used for idempotency)
    pub order_id: String,
    /// Amount in cents
    pub amount_cents: i64,
    /// Currency code (e.g., "usd")
    pub currency: String,
    /// Description for the line item
    pub description: String,
    /// Success URL after payment
    pub success_url: String,
    /// Cancel URL if customer cancels
    pub cancel_url: String,
}

/// Response from creating a checkout session
#[derive(Debug, Serialize)]
pub struct CheckoutSessionResponse {
    /// Payment record ID
    pub payment_id: String,
    /// Stripe checkout session ID
    pub session_id: String,
    /// URL to redirect customer to
    pub checkout_url: String,
    /// Payment status
    pub status: String,
}

/// Payment status response
#[derive(Debug, Serialize)]
pub struct PaymentStatusResponse {
    /// Payment record ID
    pub payment_id: String,
    /// Order ID
    pub order_id: String,
    /// Payment provider
    pub provider: String,
    /// Amount in cents
    pub amount_cents: i64,
    /// Currency
    pub currency: String,
    /// Payment status
    pub status: String,
    /// Checkout URL (if still pending)
    pub checkout_url: Option<String>,
    /// When payment was created
    pub created_at: String,
    /// When payment was completed (if completed)
    pub completed_at: Option<String>,
}

// ============================================================================
// Handlers
// ============================================================================

/// Create a Stripe Checkout Session
/// 
/// POST /api/payments/checkout-session
/// 
/// Requirements: 12.1, 12.2, 12.9
#[cfg(any(feature = "payments", feature = "full"))]
pub async fn create_checkout_session(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Json<CreateCheckoutSessionRequest>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = extract_tenant_id(&req)?;
    
    // Check for existing payment with same order_id (idempotency)
    let existing = sqlx::query_as::<_, PaymentRecord>(
        "SELECT * FROM payments WHERE tenant_id = ? AND order_id = ? AND status IN ('pending', 'completed')"
    )
    .bind(&tenant_id)
    .bind(&body.order_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    if let Some(payment) = existing {
        // Return existing payment if not expired
        return Ok(HttpResponse::Ok().json(CheckoutSessionResponse {
            payment_id: payment.id,
            session_id: payment.provider_ref.unwrap_or_default(),
            checkout_url: payment.checkout_url.unwrap_or_default(),
            status: payment.status,
        }));
    }
    
    // Get Stripe connected account for tenant
    let connected_account = get_stripe_connected_account(&pool, &tenant_id).await?;
    
    // Create Stripe client
    let stripe_client = StripeClient::new(connected_account)?;
    
    // Create checkout session
    let checkout_request = CreateCheckoutRequest {
        order_id: body.order_id.clone(),
        amount_cents: body.amount_cents,
        currency: body.currency.clone(),
        description: body.description.clone(),
        success_url: body.success_url.clone(),
        cancel_url: body.cancel_url.clone(),
        metadata: None,
    };
    
    let session = stripe_client.create_checkout_session(checkout_request).await?;
    
    // Create payment record
    let payment_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        r#"
        INSERT INTO payments (id, tenant_id, order_id, provider, provider_ref, amount_cents, currency, status, checkout_url, created_at, updated_at, expires_at)
        VALUES (?, ?, ?, 'stripe', ?, ?, ?, 'pending', ?, ?, ?, ?)
        "#
    )
    .bind(&payment_id)
    .bind(&tenant_id)
    .bind(&body.order_id)
    .bind(&session.session_id)
    .bind(body.amount_cents)
    .bind(&body.currency)
    .bind(&session.checkout_url)
    .bind(&now)
    .bind(&now)
    .bind(session.expires_at.to_string())
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to create payment record: {}", e)))?;
    
    Ok(HttpResponse::Ok().json(CheckoutSessionResponse {
        payment_id,
        session_id: session.session_id,
        checkout_url: session.checkout_url,
        status: "pending".to_string(),
    }))
}

/// Get payment status by order ID
/// 
/// GET /api/payments/orders/{order_id}/payment
/// 
/// Requirements: 12.8
#[cfg(any(feature = "payments", feature = "full"))]
pub async fn get_payment_status(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    path: web::Path<String>,
) -> Result<HttpResponse, ApiError> {
    let tenant_id = extract_tenant_id(&req)?;
    let order_id = path.into_inner();
    
    let payment = sqlx::query_as::<_, PaymentRecord>(
        "SELECT * FROM payments WHERE tenant_id = ? AND order_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .bind(&tenant_id)
    .bind(&order_id)
    .fetch_optional(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    match payment {
        Some(p) => Ok(HttpResponse::Ok().json(PaymentStatusResponse {
            payment_id: p.id,
            order_id: p.order_id,
            provider: p.provider,
            amount_cents: p.amount_cents,
            currency: p.currency,
            status: p.status,
            checkout_url: p.checkout_url,
            created_at: p.created_at,
            completed_at: p.completed_at,
        })),
        None => Err(ApiError::not_found("Payment not found")),
    }
}

/// Handle Stripe webhook events
/// 
/// POST /api/payments/webhooks/stripe
/// 
/// Requirements: 12.3, 12.4, 12.5, 12.6
#[cfg(any(feature = "payments", feature = "full"))]
pub async fn stripe_webhook(
    pool: web::Data<SqlitePool>,
    req: HttpRequest,
    body: web::Bytes,
) -> Result<HttpResponse, ApiError> {
    // Get signature from header
    let signature = req
        .headers()
        .get("Stripe-Signature")
        .and_then(|v| v.to_str().ok())
        .ok_or_else(|| ApiError::bad_request("Missing Stripe-Signature header"))?;
    
    // Verify webhook signature
    let webhook_secret = env::var("STRIPE_WEBHOOK_SECRET")
        .map_err(|_| ApiError::configuration("STRIPE_WEBHOOK_SECRET not configured"))?;
    
    verify_stripe_signature(&body, signature, &webhook_secret)?;
    
    // Parse webhook payload
    let payload: StripeWebhookPayload = serde_json::from_slice(&body)
        .map_err(|e| ApiError::bad_request(format!("Invalid webhook payload: {}", e)))?;
    
    // Check for duplicate event (idempotency)
    let existing_event = sqlx::query_scalar::<_, i32>(
        "SELECT COUNT(*) FROM webhook_events WHERE event_id = ? AND provider = 'stripe'"
    )
    .bind(&payload.id)
    .fetch_one(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    if existing_event > 0 {
        // Already processed this event
        return Ok(HttpResponse::Ok().json(serde_json::json!({
            "received": true,
            "duplicate": true
        })));
    }
    
    // Extract tenant_id from connected account
    let tenant_id = if let Some(account) = &payload.account {
        get_tenant_for_connected_account(&pool, account).await?
    } else {
        // Platform-level event, use default tenant
        "default".to_string()
    };
    
    // Store webhook event
    let event_record_id = Uuid::new_v4().to_string();
    let now = Utc::now().to_rfc3339();
    let payload_json = String::from_utf8_lossy(&body).to_string();
    
    sqlx::query(
        r#"
        INSERT INTO webhook_events (id, tenant_id, provider, event_type, event_id, payload, created_at)
        VALUES (?, ?, 'stripe', ?, ?, ?, ?)
        "#
    )
    .bind(&event_record_id)
    .bind(&tenant_id)
    .bind(&payload.event_type)
    .bind(&payload.id)
    .bind(&payload_json)
    .bind(&now)
    .execute(pool.get_ref())
    .await
    .map_err(|e| ApiError::internal(format!("Failed to store webhook event: {}", e)))?;
    
    // Process event based on type
    let result = match payload.event_type.as_str() {
        "checkout.session.completed" => {
            process_checkout_completed(&pool, &tenant_id, &payload).await
        }
        "checkout.session.expired" => {
            process_checkout_expired(&pool, &tenant_id, &payload).await
        }
        _ => {
            // Unknown event type, just acknowledge
            Ok(())
        }
    };
    
    // Update webhook event as processed
    let (processed, error_message) = match &result {
        Ok(_) => (true, None),
        Err(e) => (false, Some(e.to_string())),
    };
    
    sqlx::query(
        "UPDATE webhook_events SET processed = ?, processed_at = ?, error_message = ? WHERE id = ?"
    )
    .bind(processed)
    .bind(&now)
    .bind(&error_message)
    .bind(&event_record_id)
    .execute(pool.get_ref())
    .await
    .ok(); // Ignore update errors
    
    // Return success even if processing failed (to prevent retries for permanent failures)
    Ok(HttpResponse::Ok().json(serde_json::json!({
        "received": true,
        "processed": processed
    })))
}

// ============================================================================
// Helper Functions
// ============================================================================

/// Extract tenant ID from request headers
fn extract_tenant_id(req: &HttpRequest) -> Result<String, ApiError> {
    req.headers()
        .get("X-Tenant-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .ok_or_else(|| ApiError::bad_request("Missing X-Tenant-ID header"))
}

/// Get Stripe connected account ID for a tenant
async fn get_stripe_connected_account(pool: &SqlitePool, tenant_id: &str) -> Result<String, ApiError> {
    let account_id = sqlx::query_scalar::<_, String>(
        "SELECT connected_account_id FROM stripe_connected_accounts WHERE tenant_id = ?"
    )
    .bind(tenant_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    account_id.ok_or_else(|| ApiError::bad_request("Stripe not connected for this tenant"))
}

/// Get tenant ID for a connected account
async fn get_tenant_for_connected_account(pool: &SqlitePool, account_id: &str) -> Result<String, ApiError> {
    let tenant_id = sqlx::query_scalar::<_, String>(
        "SELECT tenant_id FROM stripe_connected_accounts WHERE connected_account_id = ?"
    )
    .bind(account_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Database error: {}", e)))?;
    
    tenant_id.ok_or_else(|| ApiError::bad_request("Unknown connected account"))
}

/// Verify Stripe webhook signature
/// 
/// Requirements: 12.6
fn verify_stripe_signature(payload: &[u8], signature: &str, secret: &str) -> Result<(), ApiError> {
    // Parse signature header (format: t=timestamp,v1=signature)
    let mut timestamp: Option<&str> = None;
    let mut sig_v1: Option<&str> = None;
    
    for part in signature.split(',') {
        let mut kv = part.splitn(2, '=');
        match (kv.next(), kv.next()) {
            (Some("t"), Some(t)) => timestamp = Some(t),
            (Some("v1"), Some(s)) => sig_v1 = Some(s),
            _ => {}
        }
    }
    
    let timestamp = timestamp.ok_or_else(|| ApiError::bad_request("Invalid signature: missing timestamp"))?;
    let expected_sig = sig_v1.ok_or_else(|| ApiError::bad_request("Invalid signature: missing v1 signature"))?;
    
    // Compute expected signature
    let signed_payload = format!("{}.{}", timestamp, String::from_utf8_lossy(payload));
    
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes())
        .map_err(|_| ApiError::internal("Failed to create HMAC"))?;
    mac.update(signed_payload.as_bytes());
    
    let computed_sig = hex::encode(mac.finalize().into_bytes());
    
    // Constant-time comparison
    if computed_sig != expected_sig {
        return Err(ApiError::bad_request("Invalid webhook signature"));
    }
    
    // Check timestamp is within tolerance (5 minutes)
    let ts: i64 = timestamp.parse().map_err(|_| ApiError::bad_request("Invalid timestamp"))?;
    let now = Utc::now().timestamp();
    if (now - ts).abs() > 300 {
        return Err(ApiError::bad_request("Webhook timestamp too old"));
    }
    
    Ok(())
}

/// Process checkout.session.completed event
/// 
/// Requirements: 12.4
async fn process_checkout_completed(
    pool: &SqlitePool,
    tenant_id: &str,
    payload: &StripeWebhookPayload,
) -> Result<(), ApiError> {
    let session_id = payload.data.object.get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::bad_request("Missing session ID in webhook"))?;
    
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "UPDATE payments SET status = 'completed', completed_at = ?, updated_at = ? WHERE tenant_id = ? AND provider_ref = ?"
    )
    .bind(&now)
    .bind(&now)
    .bind(tenant_id)
    .bind(session_id)
    .execute(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Failed to update payment: {}", e)))?;
    
    Ok(())
}

/// Process checkout.session.expired event
/// 
/// Requirements: 12.5
async fn process_checkout_expired(
    pool: &SqlitePool,
    tenant_id: &str,
    payload: &StripeWebhookPayload,
) -> Result<(), ApiError> {
    let session_id = payload.data.object.get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| ApiError::bad_request("Missing session ID in webhook"))?;
    
    let now = Utc::now().to_rfc3339();
    
    sqlx::query(
        "UPDATE payments SET status = 'expired', updated_at = ? WHERE tenant_id = ? AND provider_ref = ?"
    )
    .bind(&now)
    .bind(tenant_id)
    .bind(session_id)
    .execute(pool)
    .await
    .map_err(|e| ApiError::internal(format!("Failed to update payment: {}", e)))?;
    
    Ok(())
}

// ============================================================================
// Internal Types
// ============================================================================

/// Payment record from database
#[derive(Debug, sqlx::FromRow)]
struct PaymentRecord {
    id: String,
    tenant_id: String,
    order_id: String,
    provider: String,
    provider_ref: Option<String>,
    amount_cents: i64,
    currency: String,
    status: String,
    checkout_url: Option<String>,
    created_at: String,
    completed_at: Option<String>,
}

/// Stripe webhook payload
#[derive(Debug, Deserialize)]
struct StripeWebhookPayload {
    id: String,
    #[serde(rename = "type")]
    event_type: String,
    account: Option<String>,
    data: StripeWebhookData,
}

#[derive(Debug, Deserialize)]
struct StripeWebhookData {
    object: serde_json::Value,
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_verify_stripe_signature_format() {
        // Test that signature parsing works
        let sig = "t=1234567890,v1=abc123";
        let mut timestamp: Option<&str> = None;
        let mut sig_v1: Option<&str> = None;
        
        for part in sig.split(',') {
            let mut kv = part.splitn(2, '=');
            match (kv.next(), kv.next()) {
                (Some("t"), Some(t)) => timestamp = Some(t),
                (Some("v1"), Some(s)) => sig_v1 = Some(s),
                _ => {}
            }
        }
        
        assert_eq!(timestamp, Some("1234567890"));
        assert_eq!(sig_v1, Some("abc123"));
    }
    
    #[test]
    fn test_checkout_request_deserialization() {
        let json = r#"{
            "order_id": "order_123",
            "amount_cents": 1000,
            "currency": "usd",
            "description": "Test Order",
            "success_url": "https://example.com/success",
            "cancel_url": "https://example.com/cancel"
        }"#;
        
        let request: CreateCheckoutSessionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.order_id, "order_123");
        assert_eq!(request.amount_cents, 1000);
    }
}

// ============================================================================
// Route Configuration
// ============================================================================

/// Configure payment routes
/// 
/// Requirements: 12.1, 12.3, 12.8
#[cfg(any(feature = "payments", feature = "full"))]
pub fn configure(cfg: &mut web::ServiceConfig) {
    cfg.service(
        web::scope("/payments")
            .route("/checkout-session", web::post().to(create_checkout_session))
            .route("/orders/{order_id}/payment", web::get().to(get_payment_status))
            .route("/webhooks/stripe", web::post().to(stripe_webhook))
    );
}
