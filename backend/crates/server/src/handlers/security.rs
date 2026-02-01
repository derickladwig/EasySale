//! Security Dashboard API Handlers
//!
//! Provides REST endpoints for security monitoring and management:
//! - Dashboard statistics
//! - Security events
//! - IP blocking management
//! - Active sessions
//! - Security alerts
//!
//! Ported from POS project's security dashboard feature.

use actix_web::{web, HttpResponse, Result};
use serde::{Deserialize, Serialize};
use std::sync::Arc;

use crate::models::UserContext;
use crate::services::{
    ThreatMonitor, ThreatEventType, Severity, EventFilters, 
    RateLimitTracker, AuditLogger,
};

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

#[derive(Debug, Deserialize)]
pub struct BlockIpRequest {
    pub ip: String,
    pub reason: String,
    pub duration_secs: Option<u64>,
    pub permanent: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UnblockIpRequest {
    pub ip: String,
}

#[derive(Debug, Deserialize)]
pub struct EventsQuery {
    pub event_type: Option<String>,
    pub severity: Option<String>,
    pub source_ip: Option<String>,
    pub user_id: Option<String>,
    pub limit: Option<usize>,
}

#[derive(Debug, Deserialize)]
pub struct ForceLogoutRequest {
    pub reason: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct AcknowledgeAlertRequest {
    pub notes: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SecurityDashboardResponse {
    pub total_events_24h: usize,
    pub failed_logins_24h: usize,
    pub blocked_ips_count: usize,
    pub active_sessions_count: usize,
    pub unacknowledged_alerts: usize,
    pub events_by_severity: std::collections::HashMap<String, usize>,
    pub events_by_type: std::collections::HashMap<String, usize>,
    pub rate_limit_stats: RateLimitStatsResponse,
    pub recent_events: Vec<SecurityEventResponse>,
    pub top_blocked_ips: Vec<BlockedIpResponse>,
}

#[derive(Debug, Serialize)]
pub struct RateLimitStatsResponse {
    pub total_requests: u64,
    pub blocked_requests: u64,
    pub unique_identifiers: usize,
    pub active_violations: usize,
    pub blocked_identifiers: usize,
}

#[derive(Debug, Serialize)]
pub struct SecurityEventResponse {
    pub id: String,
    pub event_type: String,
    pub severity: String,
    pub source_ip: String,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub endpoint: Option<String>,
    pub details: serde_json::Value,
    pub timestamp: String,
}

#[derive(Debug, Serialize)]
pub struct BlockedIpResponse {
    pub ip: String,
    pub reason: String,
    pub blocked_at: String,
    pub expires_at: Option<String>,
    pub is_permanent: bool,
    pub blocked_by: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct ActiveSessionResponse {
    pub token_hash: String,
    pub user_id: String,
    pub username: Option<String>,
    pub ip_address: String,
    pub user_agent: Option<String>,
    pub created_at: String,
    pub last_activity: String,
}

#[derive(Debug, Serialize)]
pub struct SecurityAlertResponse {
    pub id: String,
    pub alert_type: String,
    pub severity: String,
    pub message: String,
    pub details: serde_json::Value,
    pub created_at: String,
    pub acknowledged: bool,
    pub acknowledged_by: Option<String>,
    pub acknowledged_at: Option<String>,
}

// ============================================================================
// DASHBOARD HANDLERS
// ============================================================================

/// GET /api/security/dashboard
/// Get security dashboard statistics
pub async fn get_dashboard(
    threat_monitor: web::Data<Arc<ThreatMonitor>>,
    rate_limiter: web::Data<Arc<RateLimitTracker>>,
) -> Result<HttpResponse> {
    let stats = threat_monitor.get_dashboard_stats().await;
    let rate_stats = rate_limiter.get_stats().await;

    let recent_events: Vec<SecurityEventResponse> = stats.recent_events
        .into_iter()
        .map(|e| SecurityEventResponse {
            id: e.id,
            event_type: e.event_type.as_str().to_string(),
            severity: e.severity.as_str().to_string(),
            source_ip: e.source_ip,
            user_id: e.user_id,
            username: e.username,
            endpoint: e.endpoint,
            details: e.details,
            timestamp: e.timestamp.to_rfc3339(),
        })
        .collect();

    let top_blocked: Vec<BlockedIpResponse> = stats.top_blocked_ips
        .into_iter()
        .map(|b| BlockedIpResponse {
            ip: b.ip,
            reason: b.reason,
            blocked_at: b.blocked_at.to_rfc3339(),
            expires_at: b.expires_at.map(|e| e.to_rfc3339()),
            is_permanent: b.is_permanent,
            blocked_by: b.blocked_by,
        })
        .collect();

    Ok(HttpResponse::Ok().json(SecurityDashboardResponse {
        total_events_24h: stats.total_events_24h,
        failed_logins_24h: stats.failed_logins_24h,
        blocked_ips_count: stats.blocked_ips_count,
        active_sessions_count: stats.active_sessions_count,
        unacknowledged_alerts: stats.unacknowledged_alerts,
        events_by_severity: stats.events_by_severity,
        events_by_type: stats.events_by_type,
        rate_limit_stats: RateLimitStatsResponse {
            total_requests: rate_stats.total_requests,
            blocked_requests: rate_stats.blocked_requests,
            unique_identifiers: rate_stats.unique_identifiers,
            active_violations: rate_stats.active_violations,
            blocked_identifiers: rate_stats.blocked_identifiers,
        },
        recent_events,
        top_blocked_ips: top_blocked,
    }))
}

/// GET /api/security/events
/// Get security events with filters
pub async fn get_events(
    threat_monitor: web::Data<Arc<ThreatMonitor>>,
    query: web::Query<EventsQuery>,
) -> Result<HttpResponse> {
    let event_type = query.event_type.as_ref().and_then(|t| {
        match t.as_str() {
            "failed_login" => Some(ThreatEventType::FailedLogin),
            "account_locked" => Some(ThreatEventType::AccountLocked),
            "rate_limited" => Some(ThreatEventType::RateLimited),
            "blocked_ip" => Some(ThreatEventType::BlockedIp),
            "suspicious_pattern" => Some(ThreatEventType::SuspiciousPattern),
            "unauthorized_access" => Some(ThreatEventType::UnauthorizedAccess),
            "brute_force_detected" => Some(ThreatEventType::BruteForceDetected),
            "session_created" => Some(ThreatEventType::SessionCreated),
            "session_destroyed" => Some(ThreatEventType::SessionDestroyed),
            "manual_block" => Some(ThreatEventType::ManualBlock),
            "manual_unblock" => Some(ThreatEventType::ManualUnblock),
            _ => None,
        }
    });

    let severity = query.severity.as_ref().and_then(|s| {
        match s.to_lowercase().as_str() {
            "low" => Some(Severity::Low),
            "medium" => Some(Severity::Medium),
            "high" => Some(Severity::High),
            "critical" => Some(Severity::Critical),
            _ => None,
        }
    });

    let filters = EventFilters {
        event_type,
        severity,
        source_ip: query.source_ip.clone(),
        user_id: query.user_id.clone(),
        start_time: None,
        end_time: None,
        limit: query.limit,
    };

    let events = threat_monitor.get_events(filters).await;

    let response: Vec<SecurityEventResponse> = events
        .into_iter()
        .map(|e| SecurityEventResponse {
            id: e.id,
            event_type: e.event_type.as_str().to_string(),
            severity: e.severity.as_str().to_string(),
            source_ip: e.source_ip,
            user_id: e.user_id,
            username: e.username,
            endpoint: e.endpoint,
            details: e.details,
            timestamp: e.timestamp.to_rfc3339(),
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}

// ============================================================================
// IP BLOCKING HANDLERS
// ============================================================================

/// GET /api/security/blocked-ips
/// Get list of blocked IPs
pub async fn get_blocked_ips(
    threat_monitor: web::Data<Arc<ThreatMonitor>>,
) -> Result<HttpResponse> {
    let blocked = threat_monitor.get_blocked_ips().await;

    let response: Vec<BlockedIpResponse> = blocked
        .into_iter()
        .map(|b| BlockedIpResponse {
            ip: b.ip,
            reason: b.reason,
            blocked_at: b.blocked_at.to_rfc3339(),
            expires_at: b.expires_at.map(|e| e.to_rfc3339()),
            is_permanent: b.is_permanent,
            blocked_by: b.blocked_by,
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}

/// POST /api/security/block-ip
/// Manually block an IP address
pub async fn block_ip(
    threat_monitor: web::Data<Arc<ThreatMonitor>>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    body: web::Json<BlockIpRequest>,
) -> Result<HttpResponse> {
    let user_id = context.user_id.as_deref().unwrap_or("system");

    // Validate IP format (basic check)
    if body.ip.is_empty() || !body.ip.contains('.') && !body.ip.contains(':') {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Invalid IP address format"
        })));
    }

    let duration = if body.permanent.unwrap_or(false) {
        None
    } else {
        Some(body.duration_secs.unwrap_or(3600)) // Default 1 hour
    };

    threat_monitor.block_ip(
        &body.ip,
        &body.reason,
        duration,
        Some(user_id),
    ).await;

    audit_logger.log(
        "security",
        &body.ip,
        "block_ip",
        Some(user_id),
        Some(serde_json::json!({
            "reason": body.reason,
            "duration_secs": duration,
            "permanent": body.permanent.unwrap_or(false),
        })),
    ).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "IP blocked successfully",
        "ip": body.ip,
        "reason": body.reason,
        "permanent": body.permanent.unwrap_or(false)
    })))
}

/// POST /api/security/unblock-ip
/// Unblock an IP address
pub async fn unblock_ip(
    threat_monitor: web::Data<Arc<ThreatMonitor>>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    body: web::Json<UnblockIpRequest>,
) -> Result<HttpResponse> {
    let user_id = context.user_id.as_deref().unwrap_or("system");

    threat_monitor.unblock_ip(&body.ip, Some(user_id)).await;

    audit_logger.log(
        "security",
        &body.ip,
        "unblock_ip",
        Some(user_id),
        None,
    ).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "IP unblocked successfully",
        "ip": body.ip
    })))
}

// ============================================================================
// SESSION HANDLERS
// ============================================================================

/// GET /api/security/sessions
/// Get active sessions
pub async fn get_sessions(
    threat_monitor: web::Data<Arc<ThreatMonitor>>,
) -> Result<HttpResponse> {
    let sessions = threat_monitor.get_active_sessions().await;

    let response: Vec<ActiveSessionResponse> = sessions
        .into_iter()
        .map(|s| ActiveSessionResponse {
            token_hash: s.token_hash,
            user_id: s.user_id,
            username: s.username,
            ip_address: s.ip_address,
            user_agent: s.user_agent,
            created_at: s.created_at.to_rfc3339(),
            last_activity: s.last_activity.to_rfc3339(),
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}

/// POST /api/security/force-logout/{user_id}
/// Force logout a user (terminate all their sessions)
pub async fn force_logout(
    threat_monitor: web::Data<Arc<ThreatMonitor>>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    user_id: web::Path<String>,
    body: Option<web::Json<ForceLogoutRequest>>,
) -> Result<HttpResponse> {
    let admin_user_id = context.user_id.as_deref().unwrap_or("system");
    let target_user_id = user_id.into_inner();

    // Don't allow self-logout via this endpoint
    if Some(target_user_id.as_str()) == context.user_id.as_deref() {
        return Ok(HttpResponse::BadRequest().json(serde_json::json!({
            "error": "Cannot force logout yourself. Use normal logout instead."
        })));
    }

    let sessions_removed = threat_monitor.force_logout_user(&target_user_id).await;

    let reason = body.as_ref()
        .and_then(|b| b.reason.clone())
        .unwrap_or_else(|| "Administrative action".to_string());

    audit_logger.log(
        "security",
        &target_user_id,
        "force_logout",
        Some(admin_user_id),
        Some(serde_json::json!({
            "sessions_removed": sessions_removed,
            "reason": reason,
        })),
    ).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "User sessions terminated",
        "user_id": target_user_id,
        "sessions_removed": sessions_removed
    })))
}

// ============================================================================
// ALERT HANDLERS
// ============================================================================

/// GET /api/security/alerts
/// Get security alerts
pub async fn get_alerts(
    threat_monitor: web::Data<Arc<ThreatMonitor>>,
    query: web::Query<AlertsQuery>,
) -> Result<HttpResponse> {
    let unacknowledged_only = query.unacknowledged_only.unwrap_or(false);
    let alerts = threat_monitor.get_alerts(unacknowledged_only).await;

    let response: Vec<SecurityAlertResponse> = alerts
        .into_iter()
        .map(|a| SecurityAlertResponse {
            id: a.id,
            alert_type: a.alert_type,
            severity: a.severity.as_str().to_string(),
            message: a.message,
            details: a.details,
            created_at: a.created_at.to_rfc3339(),
            acknowledged: a.acknowledged,
            acknowledged_by: a.acknowledged_by,
            acknowledged_at: a.acknowledged_at.map(|t| t.to_rfc3339()),
        })
        .collect();

    Ok(HttpResponse::Ok().json(response))
}

#[derive(Debug, Deserialize)]
pub struct AlertsQuery {
    pub unacknowledged_only: Option<bool>,
}

/// POST /api/security/alerts/{id}/acknowledge
/// Acknowledge a security alert
pub async fn acknowledge_alert(
    threat_monitor: web::Data<Arc<ThreatMonitor>>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    alert_id: web::Path<String>,
    body: Option<web::Json<AcknowledgeAlertRequest>>,
) -> Result<HttpResponse> {
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let alert_id_str = alert_id.into_inner();

    let acknowledged = threat_monitor.acknowledge_alert(&alert_id_str, user_id).await;

    if acknowledged {
        let notes = body.as_ref().and_then(|b| b.notes.clone());

        audit_logger.log(
            "security",
            &alert_id_str,
            "acknowledge_alert",
            Some(user_id),
            notes.map(|n| serde_json::json!({ "notes": n })),
        ).await;

        Ok(HttpResponse::Ok().json(serde_json::json!({
            "message": "Alert acknowledged",
            "alert_id": alert_id_str
        })))
    } else {
        Ok(HttpResponse::NotFound().json(serde_json::json!({
            "error": "Alert not found"
        })))
    }
}

// ============================================================================
// RATE LIMIT HANDLERS
// ============================================================================

/// GET /api/security/rate-limits
/// Get rate limit statistics and violations
pub async fn get_rate_limit_stats(
    rate_limiter: web::Data<Arc<RateLimitTracker>>,
) -> Result<HttpResponse> {
    let stats = rate_limiter.get_stats().await;
    let violations = rate_limiter.get_violations(50).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "stats": {
            "total_requests": stats.total_requests,
            "blocked_requests": stats.blocked_requests,
            "unique_identifiers": stats.unique_identifiers,
            "active_violations": stats.active_violations,
            "blocked_identifiers": stats.blocked_identifiers,
        },
        "top_violators": stats.top_violators,
        "recent_violations": violations
    })))
}

/// POST /api/security/rate-limits/clear/{identifier}
/// Clear rate limit violations for an identifier
pub async fn clear_rate_limit_violations(
    rate_limiter: web::Data<Arc<RateLimitTracker>>,
    context: web::ReqData<UserContext>,
    audit_logger: web::Data<AuditLogger>,
    identifier: web::Path<String>,
) -> Result<HttpResponse> {
    let user_id = context.user_id.as_deref().unwrap_or("system");
    let identifier_str = identifier.into_inner();

    rate_limiter.clear_violations(&identifier_str).await;
    rate_limiter.unblock(&identifier_str).await;

    audit_logger.log(
        "security",
        &identifier_str,
        "clear_rate_limit",
        Some(user_id),
        None,
    ).await;

    Ok(HttpResponse::Ok().json(serde_json::json!({
        "message": "Rate limit violations cleared",
        "identifier": identifier_str
    })))
}
