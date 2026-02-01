//! Threat Monitoring Service
//!
//! Real-time security event tracking, IP blocking, and session management.
//! Ported from POS project's Python implementation to Rust.
//!
//! Features:
//! - Failed login tracking with auto-blocking
//! - IP blocking (automatic and manual)
//! - Active session management
//! - Security event logging
//! - Dashboard statistics

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};
use std::sync::Arc;
use tokio::sync::RwLock;
use uuid::Uuid;

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Configuration for the threat monitor
#[derive(Debug, Clone)]
pub struct ThreatMonitorConfig {
    /// Number of failed logins before auto-blocking
    pub failed_login_threshold: u32,
    /// Window in seconds for counting failed logins
    pub failed_login_window_secs: u64,
    /// Duration in seconds for auto-blocks
    pub auto_block_duration_secs: u64,
    /// Maximum number of events to keep in memory
    pub max_events: usize,
    /// Maximum number of alerts to keep in memory
    pub max_alerts: usize,
    /// Maximum number of blocked IPs
    pub max_blocked_ips: usize,
}

impl Default for ThreatMonitorConfig {
    fn default() -> Self {
        Self {
            failed_login_threshold: 5,
            failed_login_window_secs: 300, // 5 minutes
            auto_block_duration_secs: 3600, // 1 hour
            max_events: 10_000,
            max_alerts: 100,
            max_blocked_ips: 1_000,
        }
    }
}

// ============================================================================
// TYPES
// ============================================================================

/// Types of security events
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ThreatEventType {
    FailedLogin,
    AccountLocked,
    RateLimited,
    BlockedIp,
    SuspiciousPattern,
    UnauthorizedAccess,
    BruteForceDetected,
    SessionCreated,
    SessionDestroyed,
    ManualBlock,
    ManualUnblock,
}

impl ThreatEventType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::FailedLogin => "failed_login",
            Self::AccountLocked => "account_locked",
            Self::RateLimited => "rate_limited",
            Self::BlockedIp => "blocked_ip",
            Self::SuspiciousPattern => "suspicious_pattern",
            Self::UnauthorizedAccess => "unauthorized_access",
            Self::BruteForceDetected => "brute_force_detected",
            Self::SessionCreated => "session_created",
            Self::SessionDestroyed => "session_destroyed",
            Self::ManualBlock => "manual_block",
            Self::ManualUnblock => "manual_unblock",
        }
    }
}

/// Severity levels for security events
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "lowercase")]
pub enum Severity {
    Low,
    Medium,
    High,
    Critical,
}

impl Severity {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Low => "low",
            Self::Medium => "medium",
            Self::High => "high",
            Self::Critical => "critical",
        }
    }
}

/// A security event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreatEvent {
    pub id: String,
    pub event_type: ThreatEventType,
    pub severity: Severity,
    pub source_ip: String,
    pub user_id: Option<String>,
    pub username: Option<String>,
    pub endpoint: Option<String>,
    pub details: serde_json::Value,
    pub timestamp: DateTime<Utc>,
}

impl ThreatEvent {
    pub fn new(
        event_type: ThreatEventType,
        severity: Severity,
        source_ip: String,
        user_id: Option<String>,
        username: Option<String>,
        endpoint: Option<String>,
        details: serde_json::Value,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            event_type,
            severity,
            source_ip,
            user_id,
            username,
            endpoint,
            details,
            timestamp: Utc::now(),
        }
    }
}

/// Information about a blocked IP
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockInfo {
    pub ip: String,
    pub reason: String,
    pub blocked_at: DateTime<Utc>,
    pub expires_at: Option<DateTime<Utc>>,
    pub is_permanent: bool,
    pub blocked_by: Option<String>,
}

/// Information about an active session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub token_hash: String,
    pub user_id: String,
    pub username: Option<String>,
    pub ip_address: String,
    pub user_agent: Option<String>,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
}

/// A security alert
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityAlert {
    pub id: String,
    pub alert_type: String,
    pub severity: Severity,
    pub message: String,
    pub details: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub acknowledged: bool,
    pub acknowledged_by: Option<String>,
    pub acknowledged_at: Option<DateTime<Utc>>,
}

impl SecurityAlert {
    pub fn new(alert_type: &str, severity: Severity, message: String, details: serde_json::Value) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            alert_type: alert_type.to_string(),
            severity,
            message,
            details,
            created_at: Utc::now(),
            acknowledged: false,
            acknowledged_by: None,
            acknowledged_at: None,
        }
    }
}

/// Dashboard statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_events_24h: usize,
    pub failed_logins_24h: usize,
    pub blocked_ips_count: usize,
    pub active_sessions_count: usize,
    pub unacknowledged_alerts: usize,
    pub events_by_severity: HashMap<String, usize>,
    pub events_by_type: HashMap<String, usize>,
    pub top_blocked_ips: Vec<BlockInfo>,
    pub recent_events: Vec<ThreatEvent>,
}

/// Filters for querying events
#[derive(Debug, Clone, Default, Deserialize)]
pub struct EventFilters {
    pub event_type: Option<ThreatEventType>,
    pub severity: Option<Severity>,
    pub source_ip: Option<String>,
    pub user_id: Option<String>,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub limit: Option<usize>,
}

// ============================================================================
// THREAT MONITOR SERVICE
// ============================================================================

/// Thread-safe threat monitoring service
pub struct ThreatMonitor {
    config: ThreatMonitorConfig,
    events: RwLock<VecDeque<ThreatEvent>>,
    blocked_ips: RwLock<HashMap<String, BlockInfo>>,
    failed_logins: RwLock<HashMap<String, Vec<DateTime<Utc>>>>,
    active_sessions: RwLock<HashMap<String, SessionInfo>>,
    alerts: RwLock<VecDeque<SecurityAlert>>,
}

impl ThreatMonitor {
    /// Create a new ThreatMonitor with default configuration
    pub fn new() -> Self {
        Self::with_config(ThreatMonitorConfig::default())
    }

    /// Create a new ThreatMonitor with custom configuration
    pub fn with_config(config: ThreatMonitorConfig) -> Self {
        Self {
            config,
            events: RwLock::new(VecDeque::new()),
            blocked_ips: RwLock::new(HashMap::new()),
            failed_logins: RwLock::new(HashMap::new()),
            active_sessions: RwLock::new(HashMap::new()),
            alerts: RwLock::new(VecDeque::new()),
        }
    }

    // ========================================================================
    // FAILED LOGIN TRACKING
    // ========================================================================

    /// Record a failed login attempt
    /// Returns true if the IP was auto-blocked
    pub async fn record_failed_login(&self, ip: &str, username: Option<&str>) -> bool {
        let now = Utc::now();
        let window_start = now - Duration::seconds(self.config.failed_login_window_secs as i64);

        // Update failed login tracking
        let should_block = {
            let mut failed = self.failed_logins.write().await;
            let attempts = failed.entry(ip.to_string()).or_insert_with(Vec::new);
            
            // Remove old attempts outside the window
            attempts.retain(|t| *t > window_start);
            
            // Add new attempt
            attempts.push(now);
            
            attempts.len() >= self.config.failed_login_threshold as usize
        };

        // Record the event
        let event = ThreatEvent::new(
            ThreatEventType::FailedLogin,
            Severity::Medium,
            ip.to_string(),
            None,
            username.map(|s| s.to_string()),
            Some("/api/auth/login".to_string()),
            serde_json::json!({
                "reason": "Invalid credentials",
                "attempt_count": self.get_failed_login_count(ip).await,
            }),
        );
        self.add_event(event).await;

        // Auto-block if threshold exceeded
        if should_block {
            self.block_ip(
                ip,
                "Exceeded failed login threshold",
                Some(self.config.auto_block_duration_secs),
                None,
            ).await;

            // Create alert for brute force detection
            let alert = SecurityAlert::new(
                "brute_force_detected",
                Severity::High,
                format!("Brute force attack detected from IP: {}", ip),
                serde_json::json!({
                    "ip": ip,
                    "username": username,
                    "failed_attempts": self.config.failed_login_threshold,
                }),
            );
            self.add_alert(alert).await;

            // Record brute force event
            let brute_force_event = ThreatEvent::new(
                ThreatEventType::BruteForceDetected,
                Severity::High,
                ip.to_string(),
                None,
                username.map(|s| s.to_string()),
                Some("/api/auth/login".to_string()),
                serde_json::json!({
                    "action": "auto_blocked",
                    "duration_secs": self.config.auto_block_duration_secs,
                }),
            );
            self.add_event(brute_force_event).await;
        }

        should_block
    }

    /// Get the number of failed login attempts for an IP
    pub async fn get_failed_login_count(&self, ip: &str) -> usize {
        let now = Utc::now();
        let window_start = now - Duration::seconds(self.config.failed_login_window_secs as i64);
        
        let failed = self.failed_logins.read().await;
        failed
            .get(ip)
            .map(|attempts| attempts.iter().filter(|t| **t > window_start).count())
            .unwrap_or(0)
    }

    /// Clear failed login attempts for an IP (called on successful login)
    pub async fn clear_failed_logins(&self, ip: &str) {
        let mut failed = self.failed_logins.write().await;
        failed.remove(ip);
    }

    // ========================================================================
    // IP BLOCKING
    // ========================================================================

    /// Check if an IP is blocked
    pub async fn is_blocked(&self, ip: &str) -> bool {
        let blocked = self.blocked_ips.read().await;
        if let Some(info) = blocked.get(ip) {
            // Check if block has expired
            if let Some(expires_at) = info.expires_at {
                if Utc::now() > expires_at {
                    return false; // Expired, will be cleaned up later
                }
            }
            true
        } else {
            false
        }
    }

    /// Block an IP address
    pub async fn block_ip(
        &self,
        ip: &str,
        reason: &str,
        duration_secs: Option<u64>,
        blocked_by: Option<&str>,
    ) {
        let now = Utc::now();
        let expires_at = duration_secs.map(|d| now + Duration::seconds(d as i64));
        let is_permanent = duration_secs.is_none();

        let info = BlockInfo {
            ip: ip.to_string(),
            reason: reason.to_string(),
            blocked_at: now,
            expires_at,
            is_permanent,
            blocked_by: blocked_by.map(|s| s.to_string()),
        };

        {
            let mut blocked = self.blocked_ips.write().await;
            
            // Enforce max blocked IPs limit
            if blocked.len() >= self.config.max_blocked_ips && !blocked.contains_key(ip) {
                // Remove oldest expired block
                let expired: Vec<String> = blocked
                    .iter()
                    .filter(|(_, b)| b.expires_at.map(|e| Utc::now() > e).unwrap_or(false))
                    .map(|(k, _)| k.clone())
                    .collect();
                
                for key in expired.into_iter().take(1) {
                    blocked.remove(&key);
                }
            }
            
            blocked.insert(ip.to_string(), info);
        }

        // Record event
        let event_type = if blocked_by.is_some() {
            ThreatEventType::ManualBlock
        } else {
            ThreatEventType::BlockedIp
        };

        let event = ThreatEvent::new(
            event_type,
            Severity::High,
            ip.to_string(),
            None,
            None,
            None,
            serde_json::json!({
                "reason": reason,
                "duration_secs": duration_secs,
                "is_permanent": is_permanent,
                "blocked_by": blocked_by,
            }),
        );
        self.add_event(event).await;
    }

    /// Unblock an IP address
    pub async fn unblock_ip(&self, ip: &str, unblocked_by: Option<&str>) {
        let was_blocked = {
            let mut blocked = self.blocked_ips.write().await;
            blocked.remove(ip).is_some()
        };

        if was_blocked {
            let event = ThreatEvent::new(
                ThreatEventType::ManualUnblock,
                Severity::Low,
                ip.to_string(),
                None,
                None,
                None,
                serde_json::json!({
                    "unblocked_by": unblocked_by,
                }),
            );
            self.add_event(event).await;
        }
    }

    /// Get all blocked IPs
    pub async fn get_blocked_ips(&self) -> Vec<BlockInfo> {
        let blocked = self.blocked_ips.read().await;
        let now = Utc::now();
        
        blocked
            .values()
            .filter(|info| {
                // Filter out expired blocks
                info.expires_at.map(|e| now <= e).unwrap_or(true)
            })
            .cloned()
            .collect()
    }

    /// Clean up expired blocks
    pub async fn cleanup_expired_blocks(&self) {
        let now = Utc::now();
        let mut blocked = self.blocked_ips.write().await;
        
        blocked.retain(|_, info| {
            info.expires_at.map(|e| now <= e).unwrap_or(true)
        });
    }

    // ========================================================================
    // SESSION MANAGEMENT
    // ========================================================================

    /// Register a new session
    pub async fn register_session(
        &self,
        token_hash: &str,
        user_id: &str,
        username: Option<&str>,
        ip_address: &str,
        user_agent: Option<&str>,
    ) {
        let now = Utc::now();
        let info = SessionInfo {
            token_hash: token_hash.to_string(),
            user_id: user_id.to_string(),
            username: username.map(|s| s.to_string()),
            ip_address: ip_address.to_string(),
            user_agent: user_agent.map(|s| s.to_string()),
            created_at: now,
            last_activity: now,
        };

        {
            let mut sessions = self.active_sessions.write().await;
            sessions.insert(token_hash.to_string(), info);
        }

        let event = ThreatEvent::new(
            ThreatEventType::SessionCreated,
            Severity::Low,
            ip_address.to_string(),
            Some(user_id.to_string()),
            username.map(|s| s.to_string()),
            None,
            serde_json::json!({
                "user_agent": user_agent,
            }),
        );
        self.add_event(event).await;
    }

    /// Remove a session (logout)
    pub async fn remove_session(&self, token_hash: &str) {
        let session_info = {
            let mut sessions = self.active_sessions.write().await;
            sessions.remove(token_hash)
        };

        if let Some(info) = session_info {
            let event = ThreatEvent::new(
                ThreatEventType::SessionDestroyed,
                Severity::Low,
                info.ip_address.clone(),
                Some(info.user_id.clone()),
                info.username.clone(),
                None,
                serde_json::json!({
                    "session_duration_secs": (Utc::now() - info.created_at).num_seconds(),
                }),
            );
            self.add_event(event).await;
        }
    }

    /// Update session last activity
    pub async fn update_session_activity(&self, token_hash: &str) {
        let mut sessions = self.active_sessions.write().await;
        if let Some(session) = sessions.get_mut(token_hash) {
            session.last_activity = Utc::now();
        }
    }

    /// Get all active sessions
    pub async fn get_active_sessions(&self) -> Vec<SessionInfo> {
        let sessions = self.active_sessions.read().await;
        sessions.values().cloned().collect()
    }

    /// Get sessions for a specific user
    pub async fn get_user_sessions(&self, user_id: &str) -> Vec<SessionInfo> {
        let sessions = self.active_sessions.read().await;
        sessions
            .values()
            .filter(|s| s.user_id == user_id)
            .cloned()
            .collect()
    }

    /// Force logout a user (remove all their sessions)
    pub async fn force_logout_user(&self, user_id: &str) -> usize {
        let mut sessions = self.active_sessions.write().await;
        let before_count = sessions.len();
        sessions.retain(|_, s| s.user_id != user_id);
        before_count - sessions.len()
    }

    // ========================================================================
    // EVENT MANAGEMENT
    // ========================================================================

    /// Add a security event
    pub async fn add_event(&self, event: ThreatEvent) {
        let mut events = self.events.write().await;
        
        // Enforce max events limit
        while events.len() >= self.config.max_events {
            events.pop_front();
        }
        
        events.push_back(event);
    }

    /// Get events with optional filters
    pub async fn get_events(&self, filters: EventFilters) -> Vec<ThreatEvent> {
        let events = self.events.read().await;
        let limit = filters.limit.unwrap_or(100);
        
        events
            .iter()
            .rev() // Most recent first
            .filter(|e| {
                if let Some(ref event_type) = filters.event_type {
                    if &e.event_type != event_type {
                        return false;
                    }
                }
                if let Some(ref severity) = filters.severity {
                    if &e.severity != severity {
                        return false;
                    }
                }
                if let Some(ref ip) = filters.source_ip {
                    if &e.source_ip != ip {
                        return false;
                    }
                }
                if let Some(ref user_id) = filters.user_id {
                    if e.user_id.as_ref() != Some(user_id) {
                        return false;
                    }
                }
                if let Some(start) = filters.start_time {
                    if e.timestamp < start {
                        return false;
                    }
                }
                if let Some(end) = filters.end_time {
                    if e.timestamp > end {
                        return false;
                    }
                }
                true
            })
            .take(limit)
            .cloned()
            .collect()
    }

    // ========================================================================
    // ALERT MANAGEMENT
    // ========================================================================

    /// Add a security alert
    pub async fn add_alert(&self, alert: SecurityAlert) {
        let mut alerts = self.alerts.write().await;
        
        // Enforce max alerts limit
        while alerts.len() >= self.config.max_alerts {
            alerts.pop_front();
        }
        
        alerts.push_back(alert);
    }

    /// Get all alerts
    pub async fn get_alerts(&self, unacknowledged_only: bool) -> Vec<SecurityAlert> {
        let alerts = self.alerts.read().await;
        
        if unacknowledged_only {
            alerts.iter().filter(|a| !a.acknowledged).cloned().collect()
        } else {
            alerts.iter().cloned().collect()
        }
    }

    /// Acknowledge an alert
    pub async fn acknowledge_alert(&self, alert_id: &str, acknowledged_by: &str) -> bool {
        let mut alerts = self.alerts.write().await;
        
        for alert in alerts.iter_mut() {
            if alert.id == alert_id {
                alert.acknowledged = true;
                alert.acknowledged_by = Some(acknowledged_by.to_string());
                alert.acknowledged_at = Some(Utc::now());
                return true;
            }
        }
        
        false
    }

    // ========================================================================
    // DASHBOARD STATISTICS
    // ========================================================================

    /// Get dashboard statistics
    pub async fn get_dashboard_stats(&self) -> DashboardStats {
        let now = Utc::now();
        let day_ago = now - Duration::hours(24);

        let events = self.events.read().await;
        let blocked = self.blocked_ips.read().await;
        let sessions = self.active_sessions.read().await;
        let alerts = self.alerts.read().await;

        // Filter events from last 24 hours
        let events_24h: Vec<&ThreatEvent> = events
            .iter()
            .filter(|e| e.timestamp > day_ago)
            .collect();

        // Count by severity
        let mut events_by_severity: HashMap<String, usize> = HashMap::new();
        for event in &events_24h {
            *events_by_severity.entry(event.severity.as_str().to_string()).or_insert(0) += 1;
        }

        // Count by type
        let mut events_by_type: HashMap<String, usize> = HashMap::new();
        for event in &events_24h {
            *events_by_type.entry(event.event_type.as_str().to_string()).or_insert(0) += 1;
        }

        // Failed logins count
        let failed_logins_24h = events_24h
            .iter()
            .filter(|e| e.event_type == ThreatEventType::FailedLogin)
            .count();

        // Top blocked IPs (most recent)
        let mut top_blocked: Vec<BlockInfo> = blocked
            .values()
            .filter(|b| b.expires_at.map(|e| now <= e).unwrap_or(true))
            .cloned()
            .collect();
        top_blocked.sort_by(|a, b| b.blocked_at.cmp(&a.blocked_at));
        top_blocked.truncate(10);

        // Recent events
        let recent_events: Vec<ThreatEvent> = events_24h
            .into_iter()
            .rev()
            .take(20)
            .cloned()
            .collect();

        // Unacknowledged alerts
        let unacknowledged_alerts = alerts.iter().filter(|a| !a.acknowledged).count();

        DashboardStats {
            total_events_24h: events.iter().filter(|e| e.timestamp > day_ago).count(),
            failed_logins_24h,
            blocked_ips_count: blocked.len(),
            active_sessions_count: sessions.len(),
            unacknowledged_alerts,
            events_by_severity,
            events_by_type,
            top_blocked_ips: top_blocked,
            recent_events,
        }
    }

    // ========================================================================
    // MAINTENANCE
    // ========================================================================

    /// Perform periodic cleanup
    pub async fn cleanup(&self) {
        // Clean up expired blocks
        self.cleanup_expired_blocks().await;

        // Clean up old failed login tracking
        let now = Utc::now();
        let window_start = now - Duration::seconds(self.config.failed_login_window_secs as i64);
        
        let mut failed = self.failed_logins.write().await;
        failed.retain(|_, attempts| {
            attempts.retain(|t| *t > window_start);
            !attempts.is_empty()
        });
    }
}

impl Default for ThreatMonitor {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// SHARED INSTANCE
// ============================================================================

/// Create a shared ThreatMonitor instance
pub fn create_threat_monitor() -> Arc<ThreatMonitor> {
    Arc::new(ThreatMonitor::new())
}

/// Create a shared ThreatMonitor with custom config
pub fn create_threat_monitor_with_config(config: ThreatMonitorConfig) -> Arc<ThreatMonitor> {
    Arc::new(ThreatMonitor::with_config(config))
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_failed_login_tracking() {
        let monitor = ThreatMonitor::with_config(ThreatMonitorConfig {
            failed_login_threshold: 3,
            failed_login_window_secs: 60,
            ..Default::default()
        });

        let ip = "192.168.1.100";

        // First two attempts should not block
        assert!(!monitor.record_failed_login(ip, Some("testuser")).await);
        assert!(!monitor.record_failed_login(ip, Some("testuser")).await);
        
        // Third attempt should trigger block
        assert!(monitor.record_failed_login(ip, Some("testuser")).await);
        
        // IP should now be blocked
        assert!(monitor.is_blocked(ip).await);
    }

    #[tokio::test]
    async fn test_ip_blocking() {
        let monitor = ThreatMonitor::new();
        let ip = "10.0.0.1";

        assert!(!monitor.is_blocked(ip).await);

        monitor.block_ip(ip, "Test block", Some(3600), Some("admin")).await;
        assert!(monitor.is_blocked(ip).await);

        monitor.unblock_ip(ip, Some("admin")).await;
        assert!(!monitor.is_blocked(ip).await);
    }

    #[tokio::test]
    async fn test_session_management() {
        let monitor = ThreatMonitor::new();

        monitor.register_session(
            "token123",
            "user1",
            Some("testuser"),
            "192.168.1.1",
            Some("Mozilla/5.0"),
        ).await;

        let sessions = monitor.get_active_sessions().await;
        assert_eq!(sessions.len(), 1);
        assert_eq!(sessions[0].user_id, "user1");

        monitor.remove_session("token123").await;
        let sessions = monitor.get_active_sessions().await;
        assert!(sessions.is_empty());
    }

    #[tokio::test]
    async fn test_force_logout() {
        let monitor = ThreatMonitor::new();

        // Register multiple sessions for same user
        monitor.register_session("token1", "user1", None, "1.1.1.1", None).await;
        monitor.register_session("token2", "user1", None, "2.2.2.2", None).await;
        monitor.register_session("token3", "user2", None, "3.3.3.3", None).await;

        assert_eq!(monitor.get_active_sessions().await.len(), 3);

        // Force logout user1
        let removed = monitor.force_logout_user("user1").await;
        assert_eq!(removed, 2);
        assert_eq!(monitor.get_active_sessions().await.len(), 1);
    }

    #[tokio::test]
    async fn test_event_limits() {
        let monitor = ThreatMonitor::with_config(ThreatMonitorConfig {
            max_events: 5,
            ..Default::default()
        });

        // Add more events than the limit
        for i in 0..10 {
            let event = ThreatEvent::new(
                ThreatEventType::FailedLogin,
                Severity::Medium,
                format!("192.168.1.{}", i),
                None,
                None,
                None,
                serde_json::json!({}),
            );
            monitor.add_event(event).await;
        }

        let events = monitor.get_events(EventFilters::default()).await;
        assert_eq!(events.len(), 5);
    }

    #[tokio::test]
    async fn test_alert_acknowledgment() {
        let monitor = ThreatMonitor::new();

        let alert = SecurityAlert::new(
            "test_alert",
            Severity::High,
            "Test alert".to_string(),
            serde_json::json!({}),
        );
        let alert_id = alert.id.clone();
        monitor.add_alert(alert).await;

        // Should have 1 unacknowledged alert
        assert_eq!(monitor.get_alerts(true).await.len(), 1);

        // Acknowledge it
        assert!(monitor.acknowledge_alert(&alert_id, "admin").await);

        // Should have 0 unacknowledged alerts
        assert_eq!(monitor.get_alerts(true).await.len(), 0);
        // But 1 total alert
        assert_eq!(monitor.get_alerts(false).await.len(), 1);
    }
}
