use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Session {
    pub id: String,
    pub tenant_id: String,
    pub user_id: String,
    pub token: String,
    pub expires_at: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSessionRequest {
    pub user_id: String,
    pub token: String,
    pub expires_at: DateTime<Utc>,
}

impl Session {
    pub fn is_expired(&self) -> bool {
        if let Ok(expires_at) = chrono::DateTime::parse_from_rfc3339(&self.expires_at) {
            Utc::now() > expires_at.with_timezone(&Utc)
        } else {
            true
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::Duration;

    #[test]
    fn test_session_is_expired() {
        let expired_session = Session {
            id: "session-001".to_string(),
            user_id: "user-001".to_string(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            token: "token".to_string(),
            expires_at: (Utc::now() - Duration::hours(1)).to_rfc3339(),
            created_at: (Utc::now() - Duration::hours(2)).to_rfc3339(),
        };
        assert!(expired_session.is_expired());

        let valid_session = Session {
            id: "session-002".to_string(),
            user_id: "user-001".to_string(),
            tenant_id: crate::test_constants::TEST_TENANT_ID.to_string(),
            token: "token".to_string(),
            expires_at: (Utc::now() + Duration::hours(1)).to_rfc3339(),
            created_at: Utc::now().to_rfc3339(),
        };
        assert!(!valid_session.is_expired());
    }
}


