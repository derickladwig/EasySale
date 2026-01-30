use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

use super::confidence::DocumentConfidence;
use super::validation::ValidationResult;

/// Review state for invoice cases
/// Requirements: 3.1
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ReviewState {
    AutoApproved,
    NeedsReview,
    InReview,
    Approved,
    Rejected,
    Exported,
}

/// Review case for an invoice
/// Requirements: 3.2
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewCase {
    pub id: String,
    pub source_file: String,
    pub vendor_guess: Option<String>,
    pub created_at: DateTime<Utc>,
    pub state: ReviewState,
    pub doc_confidence: DocumentConfidence,
    pub validation_result: ValidationResult,
    pub extracted: InvoiceExtraction,
    pub reviewer: Option<String>,
    pub reviewed_at: Option<DateTime<Utc>>,
}

/// Extracted invoice data
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InvoiceExtraction {
    pub invoice_number: Option<String>,
    pub invoice_date: Option<String>,
    pub vendor_name: Option<String>,
    pub subtotal: Option<f64>,
    pub tax: Option<f64>,
    pub total: Option<f64>,
    pub line_items: Vec<LineItem>,
}

/// Invoice line item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LineItem {
    pub sku: Option<String>,
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub line_total: f64,
}

/// Review session
/// Requirements: 3.3
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewSession {
    pub case_id: String,
    pub reviewer: String,
    pub started_at: DateTime<Utc>,
    pub decisions: Vec<FieldDecision>,
    pub notes: Option<String>,
    pub completed_at: Option<DateTime<Utc>>,
}

/// Field decision during review
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldDecision {
    pub field: String,
    pub chosen_value: String,
    pub chosen_source: DecisionSource,
    pub confidence_after: u8,
    pub reason: Option<String>,
    pub timestamp: DateTime<Utc>,
}

/// Source of decision
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum DecisionSource {
    CandidateId(usize),
    ManualEntry,
    ReOcrRegion { region: BoundingBox },
}

/// Bounding box
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/// Audit log entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditLog {
    pub id: String,
    pub case_id: String,
    pub action: AuditAction,
    pub user: String,
    pub timestamp: DateTime<Utc>,
    pub details: serde_json::Value,
}

/// Audit action type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuditAction {
    CaseCreated,
    StateChanged { from: ReviewState, to: ReviewState },
    FieldChanged { field: String, from: String, to: String },
    Undone { decision_id: String },
    AdminOverride { reason: String },
    Exported,
    Archived,
}

impl ReviewCase {
    /// Create new review case
    pub fn new(
        id: String,
        source_file: String,
        vendor_guess: Option<String>,
        doc_confidence: DocumentConfidence,
        validation_result: ValidationResult,
        extracted: InvoiceExtraction,
    ) -> Self {
        Self {
            id,
            source_file,
            vendor_guess,
            created_at: Utc::now(),
            state: ReviewState::NeedsReview,
            doc_confidence,
            validation_result,
            extracted,
            reviewer: None,
            reviewed_at: None,
        }
    }
    
    /// Update state
    pub fn update_state(&mut self, new_state: ReviewState) {
        self.state = new_state;
    }
    
    /// Assign reviewer
    pub fn assign_reviewer(&mut self, reviewer: String) {
        self.reviewer = Some(reviewer);
        self.state = ReviewState::InReview;
    }
    
    /// Mark as reviewed
    pub fn mark_reviewed(&mut self) {
        self.reviewed_at = Some(Utc::now());
    }
}

impl ReviewSession {
    /// Create new review session
    pub fn new(case_id: String, reviewer: String) -> Self {
        Self {
            case_id,
            reviewer,
            started_at: Utc::now(),
            decisions: vec![],
            notes: None,
            completed_at: None,
        }
    }
    
    /// Add decision
    pub fn add_decision(&mut self, decision: FieldDecision) {
        self.decisions.push(decision);
    }
    
    /// Complete session
    pub fn complete(&mut self) {
        self.completed_at = Some(Utc::now());
    }
    
    /// Get last decision
    pub fn last_decision(&self) -> Option<&FieldDecision> {
        self.decisions.last()
    }
    
    /// Undo last decision
    /// Requirements: 3.4
    pub fn undo_last(&mut self) -> Option<FieldDecision> {
        self.decisions.pop()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::confidence::FieldConfidence;

    #[test]
    fn test_review_case_creation() {
        let doc_conf = DocumentConfidence::new(vec![], &[]);
        let validation_result = ValidationResult::new();
        let extracted = InvoiceExtraction {
            invoice_number: Some("INV-12345".to_string()),
            invoice_date: Some("2024-01-15".to_string()),
            vendor_name: Some("Acme Corp".to_string()),
            subtotal: Some(100.0),
            tax: Some(5.0),
            total: Some(105.0),
            line_items: vec![],
        };
        
        let case = ReviewCase::new(
            "case-1".to_string(),
            "invoice.pdf".to_string(),
            Some("Acme Corp".to_string()),
            doc_conf,
            validation_result,
            extracted,
        );
        
        assert_eq!(case.id, "case-1");
        assert_eq!(case.state, ReviewState::NeedsReview);
        assert!(case.reviewer.is_none());
    }

    #[test]
    fn test_review_session() {
        let mut session = ReviewSession::new("case-1".to_string(), "user-1".to_string());
        assert_eq!(session.case_id, "case-1");
        assert_eq!(session.reviewer, "user-1");
        assert!(session.decisions.is_empty());
        
        let decision = FieldDecision {
            field: "total".to_string(),
            chosen_value: "105.00".to_string(),
            chosen_source: DecisionSource::CandidateId(0),
            confidence_after: 95,
            reason: None,
            timestamp: Utc::now(),
        };
        
        session.add_decision(decision);
        assert_eq!(session.decisions.len(), 1);
        
        let undone = session.undo_last();
        assert!(undone.is_some());
        assert!(session.decisions.is_empty());
    }

    #[test]
    fn test_assign_reviewer() {
        let doc_conf = DocumentConfidence::new(vec![], &[]);
        let validation_result = ValidationResult::new();
        let extracted = InvoiceExtraction {
            invoice_number: None,
            invoice_date: None,
            vendor_name: None,
            subtotal: None,
            tax: None,
            total: None,
            line_items: vec![],
        };
        
        let mut case = ReviewCase::new(
            "case-1".to_string(),
            "invoice.pdf".to_string(),
            None,
            doc_conf,
            validation_result,
            extracted,
        );
        
        case.assign_reviewer("user-1".to_string());
        assert_eq!(case.reviewer, Some("user-1".to_string()));
        assert_eq!(case.state, ReviewState::InReview);
    }
}
