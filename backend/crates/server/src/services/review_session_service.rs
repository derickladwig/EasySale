// Review Session Service
// Manages review sessions for batch processing

use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SessionError {
    #[error("Session not found: {0}")]
    SessionNotFound(String),
    
    #[error("Session expired: {0}")]
    SessionExpired(String),
    
    #[error("Database error: {0}")]
    DatabaseError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewSession {
    pub session_id: String,
    pub user_id: String,
    pub started_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub expires_at: DateTime<Utc>,
    pub cases_reviewed: Vec<String>,
    pub cases_approved: usize,
    pub cases_rejected: usize,
    pub total_review_time_ms: u64,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionStats {
    pub session_id: String,
    pub duration_ms: u64,
    pub cases_reviewed: usize,
    pub cases_approved: usize,
    pub cases_rejected: usize,
    pub avg_review_time_ms: u64,
    pub throughput_per_hour: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchOperation {
    pub operation_type: BatchOperationType,
    pub case_ids: Vec<String>,
    pub user_id: String,
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum BatchOperationType {
    Approve,
    Reject,
    Archive,
    Reopen,
}

pub struct ReviewSessionService {
    sessions: HashMap<String, ReviewSession>,
    timeout_minutes: i64,
}

impl ReviewSessionService {
    pub fn new(timeout_minutes: i64) -> Self {
        Self {
            sessions: HashMap::new(),
            timeout_minutes,
        }
    }
    
    pub fn start_session(&mut self, user_id: String) -> String {
        let session_id = format!("session-{}-{}", user_id, Utc::now().timestamp());
        let now = Utc::now();
        
        let session = ReviewSession {
            session_id: session_id.clone(),
            user_id,
            started_at: now,
            last_activity: now,
            expires_at: now + Duration::minutes(self.timeout_minutes),
            cases_reviewed: Vec::new(),
            cases_approved: 0,
            cases_rejected: 0,
            total_review_time_ms: 0,
            is_active: true,
        };
        
        self.sessions.insert(session_id.clone(), session);
        session_id
    }
    
    pub fn get_session(&self, session_id: &str) -> Result<&ReviewSession, SessionError> {
        let session = self.sessions.get(session_id)
            .ok_or_else(|| SessionError::SessionNotFound(session_id.to_string()))?;
        
        if !session.is_active {
            return Err(SessionError::SessionExpired(session_id.to_string()));
        }
        
        if Utc::now() > session.expires_at {
            return Err(SessionError::SessionExpired(session_id.to_string()));
        }
        
        Ok(session)
    }
    
    pub fn record_review(
        &mut self,
        session_id: &str,
        case_id: String,
        approved: bool,
        review_time_ms: u64,
    ) -> Result<(), SessionError> {
        let session = self.sessions.get_mut(session_id)
            .ok_or_else(|| SessionError::SessionNotFound(session_id.to_string()))?;
        
        if !session.is_active {
            return Err(SessionError::SessionExpired(session_id.to_string()));
        }
        
        session.cases_reviewed.push(case_id);
        session.total_review_time_ms += review_time_ms;
        session.last_activity = Utc::now();
        session.expires_at = Utc::now() + Duration::minutes(self.timeout_minutes);
        
        if approved {
            session.cases_approved += 1;
        } else {
            session.cases_rejected += 1;
        }
        
        Ok(())
    }
    
    pub fn end_session(&mut self, session_id: &str) -> Result<SessionStats, SessionError> {
        let session = self.sessions.get_mut(session_id)
            .ok_or_else(|| SessionError::SessionNotFound(session_id.to_string()))?;
        
        session.is_active = false;
        
        // Calculate stats while we still have the mutable reference
        let duration_ms = session.start_time.elapsed().as_millis() as u64;
        let cases_reviewed = session.cases_reviewed.len();
        let avg_review_time_ms = if cases_reviewed > 0 {
            duration_ms / cases_reviewed as u64
        } else {
            0
        };
        let throughput_per_hour = if duration_ms > 0 {
            (cases_reviewed as f64 / duration_ms as f64) * 3600000.0
        } else {
            0.0
        };
        
        let stats = SessionStats {
            session_id: session_id.to_string(),
            duration_ms,
            cases_reviewed,
            cases_approved: 0, // TODO: Track approved count
            cases_rejected: 0, // TODO: Track rejected count
            avg_review_time_ms,
            throughput_per_hour,
        };
        
        Ok(stats)
    }
    
    pub fn resume_session(&mut self, session_id: &str) -> Result<(), SessionError> {
        let session = self.sessions.get_mut(session_id)
            .ok_or_else(|| SessionError::SessionNotFound(session_id.to_string()))?;
        
        if Utc::now() > session.expires_at {
            return Err(SessionError::SessionExpired(session_id.to_string()));
        }
        
        session.is_active = true;
        session.last_activity = Utc::now();
        session.expires_at = Utc::now() + Duration::minutes(self.timeout_minutes);
        
        Ok(())
    }
    
    pub fn get_stats(&self, session_id: &str) -> Result<SessionStats, SessionError> {
        let session = self.get_session(session_id)?;
        Ok(self.calculate_stats(session))
    }
    
    fn calculate_stats(&self, session: &ReviewSession) -> SessionStats {
        let duration_ms = (session.last_activity - session.started_at)
            .num_milliseconds() as u64;
        
        let cases_reviewed = session.cases_reviewed.len();
        let avg_review_time_ms = if cases_reviewed > 0 {
            session.total_review_time_ms / cases_reviewed as u64
        } else {
            0
        };
        
        let throughput_per_hour = if duration_ms > 0 {
            (cases_reviewed as f64 / duration_ms as f64) * 3600000.0
        } else {
            0.0
        };
        
        SessionStats {
            session_id: session.session_id.clone(),
            duration_ms,
            cases_reviewed,
            cases_approved: session.cases_approved,
            cases_rejected: session.cases_rejected,
            avg_review_time_ms,
            throughput_per_hour,
        }
    }
    
    pub fn cleanup_expired(&mut self) -> usize {
        let now = Utc::now();
        let before_count = self.sessions.len();
        
        self.sessions.retain(|_, session| {
            session.is_active && now <= session.expires_at
        });
        
        before_count - self.sessions.len()
    }
    
    pub fn list_active_sessions(&self, user_id: Option<&str>) -> Vec<&ReviewSession> {
        let now = Utc::now();
        
        self.sessions.values()
            .filter(|s| s.is_active && now <= s.expires_at)
            .filter(|s| user_id.map_or(true, |uid| s.user_id == uid))
            .collect()
    }
}

impl Default for ReviewSessionService {
    fn default() -> Self {
        Self::new(30) // 30 minute default timeout
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_start_session() {
        let mut service = ReviewSessionService::new(30);
        let session_id = service.start_session("user1".to_string());
        
        let session = service.get_session(&session_id).unwrap();
        assert_eq!(session.user_id, "user1");
        assert!(session.is_active);
        assert_eq!(session.cases_reviewed.len(), 0);
    }
    
    #[test]
    fn test_record_review() {
        let mut service = ReviewSessionService::new(30);
        let session_id = service.start_session("user1".to_string());
        
        service.record_review(&session_id, "case1".to_string(), true, 5000).unwrap();
        service.record_review(&session_id, "case2".to_string(), false, 3000).unwrap();
        
        let session = service.get_session(&session_id).unwrap();
        assert_eq!(session.cases_reviewed.len(), 2);
        assert_eq!(session.cases_approved, 1);
        assert_eq!(session.cases_rejected, 1);
        assert_eq!(session.total_review_time_ms, 8000);
    }
    
    #[test]
    fn test_end_session() {
        let mut service = ReviewSessionService::new(30);
        let session_id = service.start_session("user1".to_string());
        
        service.record_review(&session_id, "case1".to_string(), true, 5000).unwrap();
        
        let stats = service.end_session(&session_id).unwrap();
        assert_eq!(stats.cases_reviewed, 1);
        assert_eq!(stats.cases_approved, 1);
        
        // Session should be inactive
        let result = service.get_session(&session_id);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_session_stats() {
        let mut service = ReviewSessionService::new(30);
        let session_id = service.start_session("user1".to_string());
        
        service.record_review(&session_id, "case1".to_string(), true, 5000).unwrap();
        service.record_review(&session_id, "case2".to_string(), true, 3000).unwrap();
        
        let stats = service.get_stats(&session_id).unwrap();
        assert_eq!(stats.cases_reviewed, 2);
        assert_eq!(stats.cases_approved, 2);
        assert_eq!(stats.avg_review_time_ms, 4000);
    }
    
    #[test]
    fn test_resume_session() {
        let mut service = ReviewSessionService::new(30);
        let session_id = service.start_session("user1".to_string());
        
        service.end_session(&session_id).unwrap();
        
        // Should be able to resume
        service.resume_session(&session_id).unwrap();
        
        let session = service.get_session(&session_id).unwrap();
        assert!(session.is_active);
    }
    
    #[test]
    fn test_list_active_sessions() {
        let mut service = ReviewSessionService::new(30);
        service.start_session("user1".to_string());
        service.start_session("user1".to_string());
        service.start_session("user2".to_string());
        
        let all_active = service.list_active_sessions(None);
        assert_eq!(all_active.len(), 3);
        
        let user1_active = service.list_active_sessions(Some("user1"));
        assert_eq!(user1_active.len(), 2);
    }
    
    #[test]
    fn test_cleanup_expired() {
        let mut service = ReviewSessionService::new(0); // Immediate expiry
        service.start_session("user1".to_string());
        service.start_session("user2".to_string());
        
        // Wait a bit for expiry
        std::thread::sleep(std::time::Duration::from_millis(100));
        
        let cleaned = service.cleanup_expired();
        assert_eq!(cleaned, 2);
    }
}
