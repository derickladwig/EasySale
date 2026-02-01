//! Rate Limiting Service
//!
//! Provides request rate limiting with violation tracking.
//! Ported from POS project's Python slowapi implementation to Rust.
//!
//! Features:
//! - Sliding window rate limiting
//! - Per-IP and per-user tracking
//! - Configurable limits per endpoint type
//! - Violation tracking for security monitoring
//! - Integration with ThreatMonitor

use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;
use tokio::sync::RwLock;

use super::threat_monitor::{ThreatMonitor, ThreatEventType, Severity, ThreatEvent};

// ============================================================================
// CONFIGURATION
// ============================================================================

/// Rate limit configuration
#[derive(Debug, Clone)]
pub struct RateLimitConfig {
    /// Default requests per minute
    pub default_limit: u32,
    /// Auth endpoint requests per minute (stricter)
    pub auth_limit: u32,
    /// Strict endpoint requests per minute (strictest)
    pub strict_limit: u32,
    /// Window size in seconds
    pub window_seconds: u64,
    /// Number of violations before blocking
    pub block_threshold: u32,
    /// Block duration in seconds after threshold
    pub block_duration_secs: u64,
}

impl Default for RateLimitConfig {
    fn default() -> Self {
        Self {
            default_limit: 100,
            auth_limit: 10,
            strict_limit: 5,
            window_seconds: 60,
            block_threshold: 10,
            block_duration_secs: 3600,
        }
    }
}

/// Types of rate limits
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum LimitType {
    Default,
    Auth,
    Strict,
}

impl LimitType {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Default => "default",
            Self::Auth => "auth",
            Self::Strict => "strict",
        }
    }
}

// ============================================================================
// TYPES
// ============================================================================

/// Information about rate limit violations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ViolationInfo {
    pub identifier: String,
    pub endpoint: String,
    pub violation_count: u32,
    pub first_violation: DateTime<Utc>,
    pub last_violation: DateTime<Utc>,
    pub is_blocked: bool,
    pub blocked_until: Option<DateTime<Utc>>,
}

/// Rate limit check result
#[derive(Debug, Clone)]
pub struct RateLimitResult {
    pub allowed: bool,
    pub limit: u32,
    pub remaining: u32,
    pub reset_at: DateTime<Utc>,
    pub retry_after_secs: Option<u64>,
}

/// Statistics for rate limiting
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimitStats {
    pub total_requests: u64,
    pub blocked_requests: u64,
    pub unique_identifiers: usize,
    pub active_violations: usize,
    pub blocked_identifiers: usize,
    pub top_violators: Vec<ViolationInfo>,
}

// ============================================================================
// RATE LIMIT TRACKER
// ============================================================================

/// Internal request tracking
struct RequestTracker {
    timestamps: Vec<Instant>,
    last_cleanup: Instant,
}

impl RequestTracker {
    fn new() -> Self {
        Self {
            timestamps: Vec::new(),
            last_cleanup: Instant::now(),
        }
    }

    fn add_request(&mut self, window_secs: u64) -> usize {
        let now = Instant::now();
        let cutoff = now - std::time::Duration::from_secs(window_secs);

        // Cleanup old entries periodically
        if now.duration_since(self.last_cleanup).as_secs() > 10 {
            self.timestamps.retain(|t| *t > cutoff);
            self.last_cleanup = now;
        }

        self.timestamps.push(now);

        // Count requests in window
        self.timestamps.iter().filter(|t| **t > cutoff).count()
    }

    fn count_in_window(&self, window_secs: u64) -> usize {
        let cutoff = Instant::now() - std::time::Duration::from_secs(window_secs);
        self.timestamps.iter().filter(|t| **t > cutoff).count()
    }
}

/// Thread-safe rate limit tracker
pub struct RateLimitTracker {
    config: RateLimitConfig,
    requests: RwLock<HashMap<String, RequestTracker>>,
    violations: RwLock<HashMap<String, ViolationInfo>>,
    stats: RwLock<RateLimitTrackerStats>,
    threat_monitor: Option<Arc<ThreatMonitor>>,
}

struct RateLimitTrackerStats {
    total_requests: u64,
    blocked_requests: u64,
}

impl RateLimitTracker {
    /// Create a new rate limit tracker with default configuration
    pub fn new() -> Self {
        Self::with_config(RateLimitConfig::default())
    }

    /// Create with custom configuration
    pub fn with_config(config: RateLimitConfig) -> Self {
        Self {
            config,
            requests: RwLock::new(HashMap::new()),
            violations: RwLock::new(HashMap::new()),
            stats: RwLock::new(RateLimitTrackerStats {
                total_requests: 0,
                blocked_requests: 0,
            }),
            threat_monitor: None,
        }
    }

    /// Set the threat monitor for integration
    pub fn with_threat_monitor(mut self, monitor: Arc<ThreatMonitor>) -> Self {
        self.threat_monitor = Some(monitor);
        self
    }

    /// Get the limit for a given type
    fn get_limit(&self, limit_type: LimitType) -> u32 {
        match limit_type {
            LimitType::Default => self.config.default_limit,
            LimitType::Auth => self.config.auth_limit,
            LimitType::Strict => self.config.strict_limit,
        }
    }

    /// Check rate limit for an identifier
    ///
    /// Returns Ok(result) with remaining count, or Err if blocked
    pub async fn check_limit(
        &self,
        identifier: &str,
        limit_type: LimitType,
    ) -> RateLimitResult {
        // Update stats
        {
            let mut stats = self.stats.write().await;
            stats.total_requests += 1;
        }

        // Check if blocked
        {
            let violations = self.violations.read().await;
            if let Some(info) = violations.get(identifier) {
                if info.is_blocked {
                    if let Some(blocked_until) = info.blocked_until {
                        if Utc::now() < blocked_until {
                            let mut stats = self.stats.write().await;
                            stats.blocked_requests += 1;

                            let retry_after = (blocked_until - Utc::now()).num_seconds().max(0) as u64;
                            return RateLimitResult {
                                allowed: false,
                                limit: self.get_limit(limit_type),
                                remaining: 0,
                                reset_at: blocked_until,
                                retry_after_secs: Some(retry_after),
                            };
                        }
                    }
                }
            }
        }

        // Track request
        let count = {
            let mut requests = self.requests.write().await;
            let tracker = requests
                .entry(identifier.to_string())
                .or_insert_with(RequestTracker::new);
            tracker.add_request(self.config.window_seconds)
        };

        let limit = self.get_limit(limit_type);
        let reset_at = Utc::now() + Duration::seconds(self.config.window_seconds as i64);

        if count as u32 > limit {
            // Rate limit exceeded
            let mut stats = self.stats.write().await;
            stats.blocked_requests += 1;

            RateLimitResult {
                allowed: false,
                limit,
                remaining: 0,
                reset_at,
                retry_after_secs: Some(self.config.window_seconds),
            }
        } else {
            RateLimitResult {
                allowed: true,
                limit,
                remaining: limit.saturating_sub(count as u32),
                reset_at,
                retry_after_secs: None,
            }
        }
    }

    /// Record a rate limit violation
    pub async fn record_violation(&self, identifier: &str, endpoint: &str) {
        let now = Utc::now();
        let should_block;

        {
            let mut violations = self.violations.write().await;
            let info = violations
                .entry(identifier.to_string())
                .or_insert_with(|| ViolationInfo {
                    identifier: identifier.to_string(),
                    endpoint: endpoint.to_string(),
                    violation_count: 0,
                    first_violation: now,
                    last_violation: now,
                    is_blocked: false,
                    blocked_until: None,
                });

            info.violation_count += 1;
            info.last_violation = now;
            info.endpoint = endpoint.to_string();

            should_block = info.violation_count >= self.config.block_threshold;

            if should_block && !info.is_blocked {
                info.is_blocked = true;
                info.blocked_until = Some(now + Duration::seconds(self.config.block_duration_secs as i64));
            }
        }

        // Notify threat monitor if configured
        if let Some(ref monitor) = self.threat_monitor {
            let event = ThreatEvent::new(
                ThreatEventType::RateLimited,
                if should_block { Severity::High } else { Severity::Medium },
                identifier.to_string(),
                None,
                None,
                Some(endpoint.to_string()),
                serde_json::json!({
                    "action": if should_block { "blocked" } else { "warned" },
                }),
            );
            monitor.add_event(event).await;

            if should_block {
                monitor.block_ip(
                    identifier,
                    "Rate limit violations exceeded threshold",
                    Some(self.config.block_duration_secs),
                    None,
                ).await;
            }
        }
    }

    /// Check if an identifier is blocked
    pub async fn is_blocked(&self, identifier: &str) -> bool {
        let violations = self.violations.read().await;
        if let Some(info) = violations.get(identifier) {
            if info.is_blocked {
                if let Some(blocked_until) = info.blocked_until {
                    return Utc::now() < blocked_until;
                }
            }
        }
        false
    }

    /// Unblock an identifier
    pub async fn unblock(&self, identifier: &str) {
        let mut violations = self.violations.write().await;
        if let Some(info) = violations.get_mut(identifier) {
            info.is_blocked = false;
            info.blocked_until = None;
        }
    }

    /// Get current statistics
    pub async fn get_stats(&self) -> RateLimitStats {
        let requests = self.requests.read().await;
        let violations = self.violations.read().await;
        let stats = self.stats.read().await;

        let blocked_count = violations.values().filter(|v| {
            v.is_blocked && v.blocked_until.map(|b| Utc::now() < b).unwrap_or(false)
        }).count();

        let mut top_violators: Vec<ViolationInfo> = violations.values().cloned().collect();
        top_violators.sort_by(|a, b| b.violation_count.cmp(&a.violation_count));
        top_violators.truncate(10);

        RateLimitStats {
            total_requests: stats.total_requests,
            blocked_requests: stats.blocked_requests,
            unique_identifiers: requests.len(),
            active_violations: violations.len(),
            blocked_identifiers: blocked_count,
            top_violators,
        }
    }

    /// Get violations list
    pub async fn get_violations(&self, limit: usize) -> Vec<ViolationInfo> {
        let violations = self.violations.read().await;
        let mut list: Vec<ViolationInfo> = violations.values().cloned().collect();
        list.sort_by(|a, b| b.last_violation.cmp(&a.last_violation));
        list.truncate(limit);
        list
    }

    /// Clear violations for an identifier
    pub async fn clear_violations(&self, identifier: &str) {
        let mut violations = self.violations.write().await;
        violations.remove(identifier);
    }

    /// Cleanup old data
    pub async fn cleanup(&self) {
        let now = Utc::now();
        let cutoff = now - Duration::hours(24);

        // Clean up old violations
        let mut violations = self.violations.write().await;
        violations.retain(|_, v| {
            // Keep if blocked and not expired, or if recent
            if v.is_blocked {
                v.blocked_until.map(|b| now < b).unwrap_or(false)
            } else {
                v.last_violation > cutoff
            }
        });

        // Clean up old request trackers
        let mut requests = self.requests.write().await;
        requests.retain(|_, tracker| {
            tracker.count_in_window(self.config.window_seconds) > 0
        });
    }
}

impl Default for RateLimitTracker {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// SHARED INSTANCE
// ============================================================================

/// Create a shared RateLimitTracker
pub fn create_rate_limit_tracker() -> Arc<RateLimitTracker> {
    Arc::new(RateLimitTracker::new())
}

/// Create a shared RateLimitTracker with custom config
pub fn create_rate_limit_tracker_with_config(config: RateLimitConfig) -> Arc<RateLimitTracker> {
    Arc::new(RateLimitTracker::with_config(config))
}

// ============================================================================
// ENDPOINT CLASSIFICATION
// ============================================================================

/// Determine the rate limit type for an endpoint
pub fn classify_endpoint(path: &str) -> LimitType {
    // Auth endpoints - stricter limits
    if path.starts_with("/api/auth/") || path.contains("/login") || path.contains("/password") {
        return LimitType::Auth;
    }

    // Strict endpoints - strictest limits
    if path.contains("/admin/") 
        || path.contains("/security/")
        || path.contains("/users/") && (path.contains("/create") || path.contains("/delete"))
    {
        return LimitType::Strict;
    }

    // Default for everything else
    LimitType::Default
}

/// Endpoints that should be exempt from rate limiting
pub fn is_exempt_endpoint(path: &str) -> bool {
    path == "/health" 
        || path.starts_with("/api/health-check")
        || path == "/ws"
        || path.starts_with("/static/")
        || path.starts_with("/assets/")
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_rate_limit_basic() {
        let tracker = RateLimitTracker::with_config(RateLimitConfig {
            default_limit: 5,
            window_seconds: 60,
            ..Default::default()
        });

        let id = "test-ip";

        // First 5 requests should be allowed
        for _ in 0..5 {
            let result = tracker.check_limit(id, LimitType::Default).await;
            assert!(result.allowed);
        }

        // 6th request should be blocked
        let result = tracker.check_limit(id, LimitType::Default).await;
        assert!(!result.allowed);
        assert_eq!(result.remaining, 0);
    }

    #[tokio::test]
    async fn test_violation_tracking() {
        let tracker = RateLimitTracker::with_config(RateLimitConfig {
            block_threshold: 3,
            ..Default::default()
        });

        let id = "bad-actor";

        // Record violations
        tracker.record_violation(id, "/api/login").await;
        tracker.record_violation(id, "/api/login").await;
        assert!(!tracker.is_blocked(id).await);

        // Third violation should trigger block
        tracker.record_violation(id, "/api/login").await;
        assert!(tracker.is_blocked(id).await);
    }

    #[tokio::test]
    async fn test_unblock() {
        let tracker = RateLimitTracker::with_config(RateLimitConfig {
            block_threshold: 1,
            ..Default::default()
        });

        let id = "blocked-ip";

        tracker.record_violation(id, "/api/test").await;
        assert!(tracker.is_blocked(id).await);

        tracker.unblock(id).await;
        assert!(!tracker.is_blocked(id).await);
    }

    #[test]
    fn test_endpoint_classification() {
        assert_eq!(classify_endpoint("/api/auth/login"), LimitType::Auth);
        assert_eq!(classify_endpoint("/api/auth/logout"), LimitType::Auth);
        assert_eq!(classify_endpoint("/api/users/password"), LimitType::Auth);
        assert_eq!(classify_endpoint("/api/admin/settings"), LimitType::Strict);
        assert_eq!(classify_endpoint("/api/security/dashboard"), LimitType::Strict);
        assert_eq!(classify_endpoint("/api/products"), LimitType::Default);
        assert_eq!(classify_endpoint("/api/sales"), LimitType::Default);
    }

    #[test]
    fn test_exempt_endpoints() {
        assert!(is_exempt_endpoint("/health"));
        assert!(is_exempt_endpoint("/api/health-check/db"));
        assert!(is_exempt_endpoint("/ws"));
        assert!(is_exempt_endpoint("/static/app.js"));
        assert!(!is_exempt_endpoint("/api/products"));
        assert!(!is_exempt_endpoint("/api/auth/login"));
    }

    #[tokio::test]
    async fn test_stats() {
        let tracker = RateLimitTracker::new();

        // Make some requests
        for i in 0..10 {
            tracker.check_limit(&format!("ip-{}", i), LimitType::Default).await;
        }

        let stats = tracker.get_stats().await;
        assert_eq!(stats.total_requests, 10);
        assert_eq!(stats.unique_identifiers, 10);
    }
}
