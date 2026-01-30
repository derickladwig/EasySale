// Early Stop Checker Service
// Implements early stopping and runtime budgets for OCR processing
// Requirements: 2.3 (Early Stop / Budgeting)

use crate::models::confidence::FieldConfidence;
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Processing budget configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessingBudget {
    /// Maximum time per page in milliseconds
    pub max_time_per_page_ms: u64,
    
    /// Maximum time per document in milliseconds
    pub max_time_per_document_ms: u64,
    
    /// Maximum variants per page
    pub max_variants_per_page: usize,
    
    /// Maximum passes per zone
    pub max_passes_per_zone: usize,
    
    /// Early stop confidence threshold (0-100)
    pub early_stop_confidence_threshold: u8,
    
    /// Critical fields that must exceed threshold for early stop
    pub early_stop_critical_fields: Vec<String>,
}

impl Default for ProcessingBudget {
    fn default() -> Self {
        Self {
            max_time_per_page_ms: 15000, // 15 seconds
            max_time_per_document_ms: 30000, // 30 seconds
            max_variants_per_page: 8,
            max_passes_per_zone: 5,
            early_stop_confidence_threshold: 95,
            early_stop_critical_fields: vec![
                "invoice_number".to_string(),
                "invoice_date".to_string(),
                "total".to_string(),
            ],
        }
    }
}

/// Early stop decision
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EarlyStopDecision {
    /// Whether to stop processing
    pub should_stop: bool,
    
    /// Reason for stopping (or continuing)
    pub reason: String,
    
    /// Fields that met threshold
    pub fields_met: Vec<String>,
    
    /// Fields still below threshold
    pub fields_pending: Vec<String>,
    
    /// Current confidence scores
    pub confidence_scores: Vec<(String, u8)>,
}

/// Budget status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BudgetStatus {
    /// Time elapsed in milliseconds
    pub time_elapsed_ms: u64,
    
    /// Time remaining in milliseconds
    pub time_remaining_ms: u64,
    
    /// Budget exceeded
    pub budget_exceeded: bool,
    
    /// Percentage of budget used
    pub budget_used_percent: f64,
}

/// Early stop checker service
pub struct EarlyStopChecker {
    budget: ProcessingBudget,
    start_time: Option<Instant>,
}

impl EarlyStopChecker {
    /// Create a new early stop checker with default budget
    pub fn new() -> Self {
        Self {
            budget: ProcessingBudget::default(),
            start_time: None,
        }
    }
    
    /// Create a new early stop checker with custom budget
    pub fn with_budget(budget: ProcessingBudget) -> Self {
        Self {
            budget,
            start_time: None,
        }
    }
    
    /// Start timing
    pub fn start(&mut self) {
        self.start_time = Some(Instant::now());
    }
    
    /// Check if processing should stop based on field confidence
    pub fn should_stop(&self, field_confidences: &[FieldConfidence]) -> EarlyStopDecision {
        let mut fields_met = Vec::new();
        let mut fields_pending = Vec::new();
        let mut confidence_scores = Vec::new();
        
        // Check each critical field
        for critical_field in &self.budget.early_stop_critical_fields {
            if let Some(field_conf) = field_confidences
                .iter()
                .find(|fc| fc.field_name == *critical_field)
            {
                confidence_scores.push((critical_field.clone(), field_conf.confidence));
                
                if field_conf.confidence >= self.budget.early_stop_confidence_threshold {
                    fields_met.push(critical_field.clone());
                } else {
                    fields_pending.push(critical_field.clone());
                }
            } else {
                // Field not found yet
                fields_pending.push(critical_field.clone());
                confidence_scores.push((critical_field.clone(), 0));
            }
        }
        
        let should_stop = fields_pending.is_empty();
        
        let reason = if should_stop {
            format!(
                "All {} critical fields exceed {}% confidence threshold",
                fields_met.len(),
                self.budget.early_stop_confidence_threshold
            )
        } else {
            format!(
                "{} critical fields still below threshold: {}",
                fields_pending.len(),
                fields_pending.join(", ")
            )
        };
        
        EarlyStopDecision {
            should_stop,
            reason,
            fields_met,
            fields_pending,
            confidence_scores,
        }
    }
    
    /// Check if time budget is exceeded
    pub fn check_time_budget(&self, max_time_ms: u64) -> BudgetStatus {
        let time_elapsed_ms = if let Some(start) = self.start_time {
            start.elapsed().as_millis() as u64
        } else {
            0
        };
        
        let budget_exceeded = time_elapsed_ms >= max_time_ms;
        let time_remaining_ms = max_time_ms.saturating_sub(time_elapsed_ms);
        let budget_used_percent = (time_elapsed_ms as f64 / max_time_ms as f64) * 100.0;
        
        BudgetStatus {
            time_elapsed_ms,
            time_remaining_ms,
            budget_exceeded,
            budget_used_percent,
        }
    }
    
    /// Check page budget
    pub fn check_page_budget(&self) -> BudgetStatus {
        self.check_time_budget(self.budget.max_time_per_page_ms)
    }
    
    /// Check document budget
    pub fn check_document_budget(&self) -> BudgetStatus {
        self.check_time_budget(self.budget.max_time_per_document_ms)
    }
    
    /// Get time elapsed since start
    pub fn time_elapsed_ms(&self) -> u64 {
        if let Some(start) = self.start_time {
            start.elapsed().as_millis() as u64
        } else {
            0
        }
    }
    
    /// Reset timer
    pub fn reset(&mut self) {
        self.start_time = None;
    }
    
    /// Get budget configuration
    pub fn get_budget(&self) -> &ProcessingBudget {
        &self.budget
    }
}

impl Default for EarlyStopChecker {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::confidence::{BoundingBox, CandidateValue, ExtractionMethod, SourceEvidence};
    
    fn create_test_field_confidence(field_name: &str, confidence: u8) -> FieldConfidence {
        FieldConfidence {
            field_name: field_name.to_string(),
            confidence,
            best_value: String::new(),
            candidates: vec![],
            source_evidence: SourceEvidence {
                pass_number: 1,
                region: BoundingBox { x: 0, y: 0, width: 100, height: 20 },
                raw_text: String::new(),
                method: ExtractionMethod::OCRPass(1),
            },
        }
    }
    
    #[test]
    fn test_early_stop_checker_creation() {
        let checker = EarlyStopChecker::new();
        assert_eq!(checker.budget.early_stop_confidence_threshold, 95);
        assert_eq!(checker.budget.early_stop_critical_fields.len(), 3);
    }
    
    #[test]
    fn test_should_stop_all_fields_met() {
        let checker = EarlyStopChecker::new();
        
        let field_confidences = vec![
            create_test_field_confidence("invoice_number", 96),
            create_test_field_confidence("invoice_date", 97),
            create_test_field_confidence("total", 98),
        ];
        
        let decision = checker.should_stop(&field_confidences);
        
        assert!(decision.should_stop);
        assert_eq!(decision.fields_met.len(), 3);
        assert_eq!(decision.fields_pending.len(), 0);
    }
    
    #[test]
    fn test_should_stop_some_fields_pending() {
        let checker = EarlyStopChecker::new();
        
        let field_confidences = vec![
            create_test_field_confidence("invoice_number", 96),
            create_test_field_confidence("invoice_date", 90), // Below threshold
            create_test_field_confidence("total", 98),
        ];
        
        let decision = checker.should_stop(&field_confidences);
        
        assert!(!decision.should_stop);
        assert_eq!(decision.fields_met.len(), 2);
        assert_eq!(decision.fields_pending.len(), 1);
        assert!(decision.fields_pending.contains(&"invoice_date".to_string()));
    }
    
    #[test]
    fn test_should_stop_missing_fields() {
        let checker = EarlyStopChecker::new();
        
        let field_confidences = vec![
            create_test_field_confidence("invoice_number", 96),
            // invoice_date missing
            create_test_field_confidence("total", 98),
        ];
        
        let decision = checker.should_stop(&field_confidences);
        
        assert!(!decision.should_stop);
        assert_eq!(decision.fields_met.len(), 2);
        assert_eq!(decision.fields_pending.len(), 1);
        assert!(decision.fields_pending.contains(&"invoice_date".to_string()));
    }
    
    #[test]
    fn test_check_time_budget() {
        let mut checker = EarlyStopChecker::new();
        checker.start();
        
        std::thread::sleep(std::time::Duration::from_millis(10));
        
        let status = checker.check_page_budget();
        
        assert!(!status.budget_exceeded);
        assert!(status.time_elapsed_ms > 0);
        assert!(status.time_remaining_ms < checker.budget.max_time_per_page_ms);
        assert!(status.budget_used_percent > 0.0);
        assert!(status.budget_used_percent < 100.0);
    }
    
    #[test]
    fn test_check_budget_exceeded() {
        let budget = ProcessingBudget {
            max_time_per_page_ms: 10, // Very short budget
            ..Default::default()
        };
        
        let mut checker = EarlyStopChecker::with_budget(budget);
        checker.start();
        
        std::thread::sleep(std::time::Duration::from_millis(20));
        
        let status = checker.check_page_budget();
        
        assert!(status.budget_exceeded);
        assert!(status.budget_used_percent > 100.0);
    }
    
    #[test]
    fn test_time_elapsed() {
        let mut checker = EarlyStopChecker::new();
        
        assert_eq!(checker.time_elapsed_ms(), 0);
        
        checker.start();
        std::thread::sleep(std::time::Duration::from_millis(10));
        
        assert!(checker.time_elapsed_ms() >= 10);
    }
    
    #[test]
    fn test_reset() {
        let mut checker = EarlyStopChecker::new();
        checker.start();
        
        std::thread::sleep(std::time::Duration::from_millis(10));
        assert!(checker.time_elapsed_ms() > 0);
        
        checker.reset();
        assert_eq!(checker.time_elapsed_ms(), 0);
    }
    
    #[test]
    fn test_custom_budget() {
        let budget = ProcessingBudget {
            max_time_per_page_ms: 5000,
            max_time_per_document_ms: 20000,
            max_variants_per_page: 10,
            max_passes_per_zone: 3,
            early_stop_confidence_threshold: 90,
            early_stop_critical_fields: vec!["field1".to_string(), "field2".to_string()],
        };
        
        let checker = EarlyStopChecker::with_budget(budget.clone());
        
        assert_eq!(checker.budget.max_time_per_page_ms, 5000);
        assert_eq!(checker.budget.early_stop_confidence_threshold, 90);
        assert_eq!(checker.budget.early_stop_critical_fields.len(), 2);
    }
    
    #[test]
    fn test_processing_budget_default() {
        let budget = ProcessingBudget::default();
        
        assert_eq!(budget.max_time_per_page_ms, 15000);
        assert_eq!(budget.max_time_per_document_ms, 30000);
        assert_eq!(budget.max_variants_per_page, 8);
        assert_eq!(budget.max_passes_per_zone, 5);
        assert_eq!(budget.early_stop_confidence_threshold, 95);
        assert_eq!(budget.early_stop_critical_fields.len(), 3);
    }
}
