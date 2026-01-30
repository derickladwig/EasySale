// Review Queue Service
// Manages review queue with filtering, sorting, and pagination

use crate::models::{ReviewState, ReviewCase};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum QueueError {
    #[error("Database error: {0}")]
    DatabaseError(String),
    
    #[error("Invalid filter: {0}")]
    InvalidFilter(String),
    
    #[error("Invalid sort field: {0}")]
    InvalidSortField(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueFilter {
    pub state: Option<ReviewState>,
    pub vendor_id: Option<String>,
    pub min_confidence: Option<u8>,
    pub max_confidence: Option<u8>,
    pub date_from: Option<DateTime<Utc>>,
    pub date_to: Option<DateTime<Utc>>,
    pub has_flags: Option<bool>,
    pub reviewed_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SortField {
    CreatedAt,
    UpdatedAt,
    Confidence,
    Priority,
    VendorName,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SortOrder {
    Asc,
    Desc,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueQuery {
    pub filter: QueueFilter,
    pub sort_field: SortField,
    pub sort_order: SortOrder,
    pub page: usize,
    pub per_page: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueResult {
    pub cases: Vec<ReviewCase>,
    pub total: usize,
    pub page: usize,
    pub per_page: usize,
    pub total_pages: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueueStats {
    pub total_cases: usize,
    pub pending: usize,
    pub in_review: usize,
    pub approved: usize,
    pub rejected: usize,
    pub archived: usize,
    pub avg_confidence: f64,
    pub cases_with_flags: usize,
}

pub struct ReviewQueueService {
    // In real implementation, this would use database
    cases: HashMap<String, ReviewCase>,
}

impl ReviewQueueService {
    pub fn new() -> Self {
        Self {
            cases: HashMap::new(),
        }
    }
    
    pub fn add_case(&mut self, case: ReviewCase) {
        self.cases.insert(case.case_id.clone(), case);
    }
    
    pub fn query(&self, query: QueueQuery) -> Result<QueueResult, QueueError> {
        // Filter cases
        let mut filtered: Vec<&ReviewCase> = self.cases.values()
            .filter(|c| self.matches_filter(c, &query.filter))
            .collect();
        
        // Sort cases
        self.sort_cases(&mut filtered, &query.sort_field, &query.sort_order);
        
        // Calculate pagination
        let total = filtered.len();
        let total_pages = (total + query.per_page - 1) / query.per_page;
        let start = query.page * query.per_page;
        let end = std::cmp::min(start + query.per_page, total);
        
        // Get page
        let cases = filtered[start..end].iter()
            .map(|c| (*c).clone())
            .collect();
        
        Ok(QueueResult {
            cases,
            total,
            page: query.page,
            per_page: query.per_page,
            total_pages,
        })
    }
    
    fn matches_filter(&self, case: &ReviewCase, filter: &QueueFilter) -> bool {
        // State filter
        if let Some(ref state) = filter.state {
            if &case.state != state {
                return false;
            }
        }
        
        // Confidence filters
        if let Some(min) = filter.min_confidence {
            if case.confidence < min {
                return false;
            }
        }
        if let Some(max) = filter.max_confidence {
            if case.confidence > max {
                return false;
            }
        }
        
        // Date filters
        if let Some(from) = filter.date_from {
            if case.created_at < from {
                return false;
            }
        }
        if let Some(to) = filter.date_to {
            if case.created_at > to {
                return false;
            }
        }
        
        // Reviewed by filter
        if let Some(ref user) = filter.reviewed_by {
            if case.reviewed_by.as_ref() != Some(user) {
                return false;
            }
        }
        
        true
    }
    
    fn sort_cases(&self, cases: &mut Vec<&ReviewCase>, field: &SortField, order: &SortOrder) {
        cases.sort_by(|a, b| {
            let cmp = match field {
                SortField::CreatedAt => a.created_at.cmp(&b.created_at),
                SortField::UpdatedAt => a.updated_at.cmp(&b.updated_at),
                SortField::Confidence => a.confidence.cmp(&b.confidence),
                SortField::Priority => {
                    // Lower confidence = higher priority
                    b.confidence.cmp(&a.confidence)
                }
                SortField::VendorName => {
                    // Would compare vendor names in real implementation
                    std::cmp::Ordering::Equal
                }
            };
            
            match order {
                SortOrder::Asc => cmp,
                SortOrder::Desc => cmp.reverse(),
            }
        });
    }
    
    pub fn get_stats(&self) -> QueueStats {
        let total_cases = self.cases.len();
        let mut pending = 0;
        let mut in_review = 0;
        let mut approved = 0;
        let mut rejected = 0;
        let mut archived = 0;
        let mut total_confidence = 0u64;
        let mut cases_with_flags = 0;
        
        for case in self.cases.values() {
            match case.state {
                ReviewState::Pending => pending += 1,
                ReviewState::InReview => in_review += 1,
                ReviewState::Approved => approved += 1,
                ReviewState::Rejected => rejected += 1,
                ReviewState::Archived => archived += 1,
            }
            
            total_confidence += case.confidence as u64;
            
            if case.validation_result.is_some() {
                cases_with_flags += 1;
            }
        }
        
        let avg_confidence = if total_cases > 0 {
            total_confidence as f64 / total_cases as f64
        } else {
            0.0
        };
        
        QueueStats {
            total_cases,
            pending,
            in_review,
            approved,
            rejected,
            archived,
            avg_confidence,
            cases_with_flags,
        }
    }
    
    pub fn get_next_case(&self, user_id: &str) -> Option<&ReviewCase> {
        // Get highest priority pending case
        self.cases.values()
            .filter(|c| c.state == ReviewState::Pending)
            .min_by_key(|c| c.confidence) // Lower confidence = higher priority
    }
}

impl Default for ReviewQueueService {
    fn default() -> Self {
        Self::new()
    }
}

impl Default for QueueFilter {
    fn default() -> Self {
        Self {
            state: None,
            vendor_id: None,
            min_confidence: None,
            max_confidence: None,
            date_from: None,
            date_to: None,
            has_flags: None,
            reviewed_by: None,
        }
    }
}

impl Default for QueueQuery {
    fn default() -> Self {
        Self {
            filter: QueueFilter::default(),
            sort_field: SortField::Priority,
            sort_order: SortOrder::Desc,
            page: 0,
            per_page: 20,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_case(case_id: &str, state: ReviewState, confidence: u8) -> ReviewCase {
        ReviewCase {
            case_id: case_id.to_string(),
            state,
            fields: Vec::new(),
            validation_result: None,
            confidence,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            reviewed_by: None,
            reviewed_at: None,
        }
    }
    
    #[test]
    fn test_add_and_query() {
        let mut service = ReviewQueueService::new();
        service.add_case(create_test_case("case1", ReviewState::Pending, 90));
        service.add_case(create_test_case("case2", ReviewState::InReview, 85));
        service.add_case(create_test_case("case3", ReviewState::Pending, 95));
        
        let query = QueueQuery::default();
        let result = service.query(query).unwrap();
        
        assert_eq!(result.total, 3);
        assert_eq!(result.cases.len(), 3);
    }
    
    #[test]
    fn test_filter_by_state() {
        let mut service = ReviewQueueService::new();
        service.add_case(create_test_case("case1", ReviewState::Pending, 90));
        service.add_case(create_test_case("case2", ReviewState::InReview, 85));
        service.add_case(create_test_case("case3", ReviewState::Pending, 95));
        
        let query = QueueQuery {
            filter: QueueFilter {
                state: Some(ReviewState::Pending),
                ..Default::default()
            },
            ..Default::default()
        };
        
        let result = service.query(query).unwrap();
        assert_eq!(result.total, 2);
    }
    
    #[test]
    fn test_filter_by_confidence() {
        let mut service = ReviewQueueService::new();
        service.add_case(create_test_case("case1", ReviewState::Pending, 90));
        service.add_case(create_test_case("case2", ReviewState::Pending, 85));
        service.add_case(create_test_case("case3", ReviewState::Pending, 95));
        
        let query = QueueQuery {
            filter: QueueFilter {
                min_confidence: Some(90),
                ..Default::default()
            },
            ..Default::default()
        };
        
        let result = service.query(query).unwrap();
        assert_eq!(result.total, 2); // case1 and case3
    }
    
    #[test]
    fn test_sort_by_confidence() {
        let mut service = ReviewQueueService::new();
        service.add_case(create_test_case("case1", ReviewState::Pending, 90));
        service.add_case(create_test_case("case2", ReviewState::Pending, 85));
        service.add_case(create_test_case("case3", ReviewState::Pending, 95));
        
        let query = QueueQuery {
            sort_field: SortField::Confidence,
            sort_order: SortOrder::Asc,
            ..Default::default()
        };
        
        let result = service.query(query).unwrap();
        assert_eq!(result.cases[0].confidence, 85);
        assert_eq!(result.cases[1].confidence, 90);
        assert_eq!(result.cases[2].confidence, 95);
    }
    
    #[test]
    fn test_pagination() {
        let mut service = ReviewQueueService::new();
        for i in 0..25 {
            service.add_case(create_test_case(&format!("case{}", i), ReviewState::Pending, 90));
        }
        
        let query = QueueQuery {
            page: 0,
            per_page: 10,
            ..Default::default()
        };
        
        let result = service.query(query).unwrap();
        assert_eq!(result.total, 25);
        assert_eq!(result.cases.len(), 10);
        assert_eq!(result.total_pages, 3);
        
        let query2 = QueueQuery {
            page: 2,
            per_page: 10,
            ..Default::default()
        };
        
        let result2 = service.query(query2).unwrap();
        assert_eq!(result2.cases.len(), 5); // Last page
    }
    
    #[test]
    fn test_stats() {
        let mut service = ReviewQueueService::new();
        service.add_case(create_test_case("case1", ReviewState::Pending, 90));
        service.add_case(create_test_case("case2", ReviewState::InReview, 85));
        service.add_case(create_test_case("case3", ReviewState::Approved, 95));
        service.add_case(create_test_case("case4", ReviewState::Pending, 80));
        
        let stats = service.get_stats();
        assert_eq!(stats.total_cases, 4);
        assert_eq!(stats.pending, 2);
        assert_eq!(stats.in_review, 1);
        assert_eq!(stats.approved, 1);
        assert_eq!(stats.avg_confidence, 87.5);
    }
    
    #[test]
    fn test_get_next_case() {
        let mut service = ReviewQueueService::new();
        service.add_case(create_test_case("case1", ReviewState::Pending, 90));
        service.add_case(create_test_case("case2", ReviewState::Pending, 85));
        service.add_case(create_test_case("case3", ReviewState::InReview, 80));
        
        let next = service.get_next_case("user1").unwrap();
        assert_eq!(next.case_id, "case2"); // Lowest confidence pending
    }
}
