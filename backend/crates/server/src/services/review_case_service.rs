// Review Case Service
// Manages review case state machine and transitions

use crate::models::{ReviewState, ReviewCase};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ReviewCaseError {
    #[error("Invalid state transition from {from:?} to {to:?}")]
    InvalidTransition { from: ReviewState, to: ReviewState },
    
    #[error("Case not found: {0}")]
    CaseNotFound(String),
    
    #[error("Database error: {0}")]
    DatabaseError(String),
    
    #[error("Validation error: {0}")]
    ValidationError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateTransition {
    pub from_state: ReviewState,
    pub to_state: ReviewState,
    pub timestamp: DateTime<Utc>,
    pub user_id: Option<String>,
    pub reason: Option<String>,
}

pub struct ReviewCaseService {
    // In a real implementation, this would have database connection
    cases: HashMap<String, ReviewCase>,
    audit_log: Vec<StateTransition>,
}

impl ReviewCaseService {
    pub fn new() -> Self {
        Self {
            cases: HashMap::new(),
            audit_log: Vec::new(),
        }
    }
    
    pub fn create_case(&mut self, case: ReviewCase) -> Result<String, ReviewCaseError> {
        let case_id = case.case_id.clone();
        self.cases.insert(case_id.clone(), case);
        Ok(case_id)
    }
    
    pub fn get_case(&self, case_id: &str) -> Result<&ReviewCase, ReviewCaseError> {
        self.cases.get(case_id)
            .ok_or_else(|| ReviewCaseError::CaseNotFound(case_id.to_string()))
    }
    
    pub fn transition(
        &mut self,
        case_id: &str,
        new_state: ReviewState,
        user_id: Option<String>,
        reason: Option<String>,
    ) -> Result<(), ReviewCaseError> {
        let case = self.cases.get_mut(case_id)
            .ok_or_else(|| ReviewCaseError::CaseNotFound(case_id.to_string()))?;
        
        let old_state = case.state.clone();
        
        // Validate transition
        if !self.can_transition(case, &new_state) {
            return Err(ReviewCaseError::InvalidTransition {
                from: old_state,
                to: new_state,
            });
        }
        
        // Perform transition
        case.state = new_state.clone();
        case.updated_at = Utc::now();
        
        if new_state == ReviewState::Approved || new_state == ReviewState::Rejected {
            case.reviewed_at = Some(Utc::now());
            case.reviewed_by = user_id.clone();
        }
        
        // Log transition
        self.audit_log.push(StateTransition {
            from_state: old_state,
            to_state: new_state,
            timestamp: Utc::now(),
            user_id,
            reason,
        });
        
        Ok(())
    }
    
    pub fn can_transition(&self, case: &ReviewCase, new_state: &ReviewState) -> bool {
        use ReviewState::*;
        
        match (&case.state, new_state) {
            // From Pending
            (Pending, InReview) => true,
            (Pending, Archived) => true,
            
            // From InReview
            (InReview, Approved) => true,
            (InReview, Rejected) => true,
            (InReview, Pending) => true, // Can go back
            (InReview, Archived) => true,
            
            // From Approved
            (Approved, Archived) => true,
            (Approved, InReview) => true, // Can reopen
            
            // From Rejected
            (Rejected, Archived) => true,
            (Rejected, InReview) => true, // Can reopen
            
            // From Archived
            (Archived, InReview) => true, // Can restore
            
            // Same state
            (a, b) if a == b => true,
            
            // All other transitions invalid
            _ => false,
        }
    }
    
    pub fn approve(&mut self, case_id: &str, user_id: String) -> Result<(), ReviewCaseError> {
        self.transition(case_id, ReviewState::Approved, Some(user_id), Some("Approved".to_string()))
    }
    
    pub fn reject(&mut self, case_id: &str, user_id: String, reason: String) -> Result<(), ReviewCaseError> {
        self.transition(case_id, ReviewState::Rejected, Some(user_id), Some(reason))
    }
    
    pub fn archive(&mut self, case_id: &str) -> Result<(), ReviewCaseError> {
        self.transition(case_id, ReviewState::Archived, None, Some("Archived".to_string()))
    }
    
    pub fn reopen(&mut self, case_id: &str, user_id: String) -> Result<(), ReviewCaseError> {
        self.transition(case_id, ReviewState::InReview, Some(user_id), Some("Reopened".to_string()))
    }
    
    pub fn get_audit_log(&self, case_id: &str) -> Vec<&StateTransition> {
        // In real implementation, filter by case_id from database
        self.audit_log.iter().collect()
    }
    
    pub fn list_cases(&self, state: Option<ReviewState>) -> Vec<&ReviewCase> {
        match state {
            Some(s) => self.cases.values().filter(|c| c.state == s).collect(),
            None => self.cases.values().collect(),
        }
    }
    
    pub fn undo_last_transition(&mut self, case_id: &str) -> Result<(), ReviewCaseError> {
        // Get last transition for this case
        if let Some(last_transition) = self.audit_log.last() {
            let case = self.cases.get_mut(case_id)
                .ok_or_else(|| ReviewCaseError::CaseNotFound(case_id.to_string()))?;
            
            // Restore previous state
            case.state = last_transition.from_state.clone();
            case.updated_at = Utc::now();
            
            // Remove last transition from log
            self.audit_log.pop();
            
            Ok(())
        } else {
            Err(ReviewCaseError::ValidationError("No transitions to undo".to_string()))
        }
    }
}

impl Default for ReviewCaseService {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::FieldValue;
    
    fn create_test_case(case_id: &str, state: ReviewState) -> ReviewCase {
        ReviewCase {
            case_id: case_id.to_string(),
            state,
            fields: Vec::new(),
            validation_result: None,
            confidence: 95,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            reviewed_by: None,
            reviewed_at: None,
        }
    }
    
    #[test]
    fn test_create_case() {
        let mut service = ReviewCaseService::new();
        let case = create_test_case("case1", ReviewState::Pending);
        
        let case_id = service.create_case(case).unwrap();
        assert_eq!(case_id, "case1");
        
        let retrieved = service.get_case("case1").unwrap();
        assert_eq!(retrieved.state, ReviewState::Pending);
    }
    
    #[test]
    fn test_valid_transitions() {
        let mut service = ReviewCaseService::new();
        let case = create_test_case("case1", ReviewState::Pending);
        service.create_case(case).unwrap();
        
        // Pending -> InReview
        service.transition("case1", ReviewState::InReview, Some("user1".to_string()), None).unwrap();
        assert_eq!(service.get_case("case1").unwrap().state, ReviewState::InReview);
        
        // InReview -> Approved
        service.transition("case1", ReviewState::Approved, Some("user1".to_string()), None).unwrap();
        assert_eq!(service.get_case("case1").unwrap().state, ReviewState::Approved);
    }
    
    #[test]
    fn test_invalid_transition() {
        let mut service = ReviewCaseService::new();
        let case = create_test_case("case1", ReviewState::Pending);
        service.create_case(case).unwrap();
        
        // Pending -> Approved (invalid, must go through InReview)
        let result = service.transition("case1", ReviewState::Approved, Some("user1".to_string()), None);
        assert!(result.is_err());
    }
    
    #[test]
    fn test_approve() {
        let mut service = ReviewCaseService::new();
        let case = create_test_case("case1", ReviewState::InReview);
        service.create_case(case).unwrap();
        
        service.approve("case1", "user1".to_string()).unwrap();
        
        let case = service.get_case("case1").unwrap();
        assert_eq!(case.state, ReviewState::Approved);
        assert!(case.reviewed_by.is_some());
        assert!(case.reviewed_at.is_some());
    }
    
    #[test]
    fn test_reject() {
        let mut service = ReviewCaseService::new();
        let case = create_test_case("case1", ReviewState::InReview);
        service.create_case(case).unwrap();
        
        service.reject("case1", "user1".to_string(), "Invalid data".to_string()).unwrap();
        
        let case = service.get_case("case1").unwrap();
        assert_eq!(case.state, ReviewState::Rejected);
    }
    
    #[test]
    fn test_reopen() {
        let mut service = ReviewCaseService::new();
        let case = create_test_case("case1", ReviewState::Approved);
        service.create_case(case).unwrap();
        
        service.reopen("case1", "user1".to_string()).unwrap();
        
        let case = service.get_case("case1").unwrap();
        assert_eq!(case.state, ReviewState::InReview);
    }
    
    #[test]
    fn test_archive() {
        let mut service = ReviewCaseService::new();
        let case = create_test_case("case1", ReviewState::Approved);
        service.create_case(case).unwrap();
        
        service.archive("case1").unwrap();
        
        let case = service.get_case("case1").unwrap();
        assert_eq!(case.state, ReviewState::Archived);
    }
    
    #[test]
    fn test_audit_log() {
        let mut service = ReviewCaseService::new();
        let case = create_test_case("case1", ReviewState::Pending);
        service.create_case(case).unwrap();
        
        service.transition("case1", ReviewState::InReview, Some("user1".to_string()), None).unwrap();
        service.transition("case1", ReviewState::Approved, Some("user1".to_string()), None).unwrap();
        
        let log = service.get_audit_log("case1");
        assert_eq!(log.len(), 2);
        assert_eq!(log[0].to_state, ReviewState::InReview);
        assert_eq!(log[1].to_state, ReviewState::Approved);
    }
    
    #[test]
    fn test_undo() {
        let mut service = ReviewCaseService::new();
        let case = create_test_case("case1", ReviewState::Pending);
        service.create_case(case).unwrap();
        
        service.transition("case1", ReviewState::InReview, Some("user1".to_string()), None).unwrap();
        assert_eq!(service.get_case("case1").unwrap().state, ReviewState::InReview);
        
        service.undo_last_transition("case1").unwrap();
        assert_eq!(service.get_case("case1").unwrap().state, ReviewState::Pending);
    }
    
    #[test]
    fn test_list_cases_by_state() {
        let mut service = ReviewCaseService::new();
        service.create_case(create_test_case("case1", ReviewState::Pending)).unwrap();
        service.create_case(create_test_case("case2", ReviewState::InReview)).unwrap();
        service.create_case(create_test_case("case3", ReviewState::Pending)).unwrap();
        
        let pending = service.list_cases(Some(ReviewState::Pending));
        assert_eq!(pending.len(), 2);
        
        let in_review = service.list_cases(Some(ReviewState::InReview));
        assert_eq!(in_review.len(), 1);
        
        let all = service.list_cases(None);
        assert_eq!(all.len(), 3);
    }
}
