// Approval Gate Service
// Checks all conditions before allowing approval

use crate::models::{ReviewPolicy, ConfidenceThresholds};
use crate::services::{ValidationReport, ValidationResult};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ApprovalGateError {
    #[error("Approval blocked: {0}")]
    ApprovalBlocked(String),
    
    #[error("Configuration error: {0}")]
    ConfigError(String),
    
    #[error("Validation error: {0}")]
    ValidationError(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalRequest {
    pub case_id: String,
    pub document_confidence: u8,
    pub field_confidences: HashMap<String, u8>,
    pub validation_report: ValidationReport,
    pub has_contradictions: bool,
    pub vendor_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApprovalResult {
    pub approved: bool,
    pub blocking_reasons: Vec<String>,
    pub warnings: Vec<String>,
    pub can_auto_approve: bool,
    pub requires_review: bool,
    pub gate_checks: Vec<GateCheck>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GateCheck {
    pub gate_name: String,
    pub passed: bool,
    pub message: String,
    pub severity: CheckSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum CheckSeverity {
    Critical,  // Blocks approval
    Warning,   // Allows approval but warns
    Info,      // Informational only
}

pub struct ApprovalGateService {
    policy: ReviewPolicy,
}

impl ApprovalGateService {
    pub fn new(policy: ReviewPolicy) -> Self {
        Self { policy }
    }
    
    pub fn check_approval(&self, request: &ApprovalRequest) -> Result<ApprovalResult, ApprovalGateError> {
        let mut gate_checks = Vec::new();
        let mut blocking_reasons = Vec::new();
        let mut warnings = Vec::new();
        
        // Gate 1: Validation Results
        let validation_check = self.check_validation_results(&request.validation_report);
        if !validation_check.passed {
            blocking_reasons.push(validation_check.message.clone());
        }
        gate_checks.push(validation_check);
        
        // Gate 2: Document Confidence
        let confidence_check = self.check_document_confidence(request.document_confidence);
        if !confidence_check.passed && confidence_check.severity == CheckSeverity::Critical {
            blocking_reasons.push(confidence_check.message.clone());
        } else if !confidence_check.passed {
            warnings.push(confidence_check.message.clone());
        }
        gate_checks.push(confidence_check);
        
        // Gate 3: Critical Fields
        let critical_fields_check = self.check_critical_fields(&request.field_confidences);
        if !critical_fields_check.passed {
            blocking_reasons.push(critical_fields_check.message.clone());
        }
        gate_checks.push(critical_fields_check);
        
        // Gate 4: Contradictions
        let contradictions_check = self.check_contradictions(request.has_contradictions);
        if !contradictions_check.passed {
            blocking_reasons.push(contradictions_check.message.clone());
        }
        gate_checks.push(contradictions_check);
        
        // Gate 5: Policy-Specific Checks
        let policy_check = self.check_policy_requirements(&request.validation_report);
        if !policy_check.passed && policy_check.severity == CheckSeverity::Critical {
            blocking_reasons.push(policy_check.message.clone());
        } else if !policy_check.passed {
            warnings.push(policy_check.message.clone());
        }
        gate_checks.push(policy_check);
        
        let approved = blocking_reasons.is_empty();
        let can_auto_approve = approved && self.policy.can_auto_approve(
            request.document_confidence,
            !request.validation_report.hard_failures.is_empty(),
            !request.validation_report.soft_failures.is_empty(),
        );
        let requires_review = !can_auto_approve;
        
        Ok(ApprovalResult {
            approved,
            blocking_reasons,
            warnings,
            can_auto_approve,
            requires_review,
            gate_checks,
        })
    }
    
    fn check_validation_results(&self, report: &ValidationReport) -> GateCheck {
        if !report.hard_failures.is_empty() {
            GateCheck {
                gate_name: "validation_results".to_string(),
                passed: false,
                message: format!("Hard validation failures: {}", 
                    report.hard_failures.iter()
                        .map(|f| f.message.as_str())
                        .collect::<Vec<_>>()
                        .join(", ")),
                severity: CheckSeverity::Critical,
            }
        } else if !report.soft_failures.is_empty() {
            GateCheck {
                gate_name: "validation_results".to_string(),
                passed: true,
                message: format!("Soft validation warnings: {}", report.soft_failures.len()),
                severity: CheckSeverity::Warning,
            }
        } else {
            GateCheck {
                gate_name: "validation_results".to_string(),
                passed: true,
                message: "All validations passed".to_string(),
                severity: CheckSeverity::Info,
            }
        }
    }
    
    fn check_document_confidence(&self, confidence: u8) -> GateCheck {
        let threshold = self.policy.thresholds.document_confidence;
        
        if confidence >= threshold {
            GateCheck {
                gate_name: "document_confidence".to_string(),
                passed: true,
                message: format!("Document confidence {} meets threshold {}", confidence, threshold),
                severity: CheckSeverity::Info,
            }
        } else if confidence >= threshold - 10 {
            GateCheck {
                gate_name: "document_confidence".to_string(),
                passed: false,
                message: format!("Document confidence {} below threshold {} (within 10 points)", confidence, threshold),
                severity: CheckSeverity::Warning,
            }
        } else {
            GateCheck {
                gate_name: "document_confidence".to_string(),
                passed: false,
                message: format!("Document confidence {} significantly below threshold {}", confidence, threshold),
                severity: CheckSeverity::Critical,
            }
        }
    }
    
    fn check_critical_fields(&self, field_confidences: &HashMap<String, u8>) -> GateCheck {
        let threshold = self.policy.thresholds.critical_field_confidence;
        let mut missing_fields = Vec::new();
        let mut low_confidence_fields = Vec::new();
        
        for critical_field in &self.policy.critical_fields {
            match field_confidences.get(critical_field) {
                None => missing_fields.push(critical_field.clone()),
                Some(&conf) if conf < threshold => {
                    low_confidence_fields.push(format!("{} ({})", critical_field, conf));
                }
                _ => {}
            }
        }
        
        if !missing_fields.is_empty() {
            GateCheck {
                gate_name: "critical_fields".to_string(),
                passed: false,
                message: format!("Missing critical fields: {}", missing_fields.join(", ")),
                severity: CheckSeverity::Critical,
            }
        } else if !low_confidence_fields.is_empty() {
            GateCheck {
                gate_name: "critical_fields".to_string(),
                passed: false,
                message: format!("Low confidence critical fields: {}", low_confidence_fields.join(", ")),
                severity: CheckSeverity::Critical,
            }
        } else {
            GateCheck {
                gate_name: "critical_fields".to_string(),
                passed: true,
                message: "All critical fields present with sufficient confidence".to_string(),
                severity: CheckSeverity::Info,
            }
        }
    }
    
    fn check_contradictions(&self, has_contradictions: bool) -> GateCheck {
        if has_contradictions {
            GateCheck {
                gate_name: "contradictions".to_string(),
                passed: false,
                message: "Contradictions detected - manual review required".to_string(),
                severity: CheckSeverity::Critical,
            }
        } else {
            GateCheck {
                gate_name: "contradictions".to_string(),
                passed: true,
                message: "No contradictions detected".to_string(),
                severity: CheckSeverity::Info,
            }
        }
    }
    
    fn check_policy_requirements(&self, report: &ValidationReport) -> GateCheck {
        // Check if soft flags are allowed
        if !self.policy.allow_soft_flags && !report.soft_failures.is_empty() {
            return GateCheck {
                gate_name: "policy_requirements".to_string(),
                passed: false,
                message: "Soft flags not allowed in current policy mode".to_string(),
                severity: CheckSeverity::Critical,
            };
        }
        
        // Check if any flags are allowed
        if !self.policy.allow_any_flags && (!report.hard_failures.is_empty() || !report.soft_failures.is_empty()) {
            return GateCheck {
                gate_name: "policy_requirements".to_string(),
                passed: false,
                message: "No flags allowed in current policy mode".to_string(),
                severity: CheckSeverity::Critical,
            };
        }
        
        GateCheck {
            gate_name: "policy_requirements".to_string(),
            passed: true,
            message: "Policy requirements met".to_string(),
            severity: CheckSeverity::Info,
        }
    }
    
    pub fn update_policy(&mut self, policy: ReviewPolicy) {
        self.policy = policy;
    }
    
    pub fn get_policy(&self) -> &ReviewPolicy {
        &self.policy
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::ReviewPolicy;
    use crate::services::{ValidationReport, ValidationResult, RuleType, Severity};
    
    fn create_test_request(
        doc_conf: u8,
        field_confs: HashMap<String, u8>,
        hard_failures: usize,
        has_contradictions: bool,
    ) -> ApprovalRequest {
        let mut hard_fail_vec = Vec::new();
        for i in 0..hard_failures {
            hard_fail_vec.push(ValidationResult {
                passed: false,
                rule_id: format!("rule_{}", i),
                rule_type: RuleType::TotalMath,
                severity: Severity::Hard,
                message: format!("Hard failure {}", i),
                penalty: 50,
                details: None,
            });
        }
        
        ApprovalRequest {
            case_id: "test-case".to_string(),
            document_confidence: doc_conf,
            field_confidences: field_confs,
            validation_report: ValidationReport {
                overall_passed: hard_failures == 0,
                hard_failures: hard_fail_vec,
                soft_failures: Vec::new(),
                total_penalty: 0,
                blocking_reasons: Vec::new(),
                warnings: Vec::new(),
            },
            has_contradictions,
            vendor_id: None,
        }
    }
    
    #[test]
    fn test_approval_gate_pass() {
        let service = ApprovalGateService::new(ReviewPolicy::balanced());
        let mut field_confs = HashMap::new();
        field_confs.insert("invoice_number".to_string(), 95);
        field_confs.insert("invoice_date".to_string(), 95);
        field_confs.insert("vendor_name".to_string(), 95);
        field_confs.insert("total".to_string(), 95);
        
        let request = create_test_request(96, field_confs, 0, false);
        let result = service.check_approval(&request).unwrap();
        
        assert!(result.approved);
        assert!(result.can_auto_approve);
        assert!(!result.requires_review);
        assert_eq!(result.blocking_reasons.len(), 0);
    }
    
    #[test]
    fn test_approval_gate_hard_failure() {
        let service = ApprovalGateService::new(ReviewPolicy::balanced());
        let mut field_confs = HashMap::new();
        field_confs.insert("invoice_number".to_string(), 95);
        field_confs.insert("invoice_date".to_string(), 95);
        field_confs.insert("vendor_name".to_string(), 95);
        field_confs.insert("total".to_string(), 95);
        
        let request = create_test_request(96, field_confs, 1, false);
        let result = service.check_approval(&request).unwrap();
        
        assert!(!result.approved);
        assert!(!result.can_auto_approve);
        assert!(result.requires_review);
        assert!(result.blocking_reasons.len() > 0);
    }
    
    #[test]
    fn test_approval_gate_low_confidence() {
        let service = ApprovalGateService::new(ReviewPolicy::balanced());
        let mut field_confs = HashMap::new();
        field_confs.insert("invoice_number".to_string(), 95);
        field_confs.insert("invoice_date".to_string(), 95);
        field_confs.insert("vendor_name".to_string(), 95);
        field_confs.insert("total".to_string(), 95);
        
        let request = create_test_request(85, field_confs, 0, false); // Low doc confidence
        let result = service.check_approval(&request).unwrap();
        
        assert!(result.approved); // Still approved
        assert!(!result.can_auto_approve); // But can't auto-approve
        assert!(result.requires_review);
    }
    
    #[test]
    fn test_approval_gate_missing_critical_field() {
        let service = ApprovalGateService::new(ReviewPolicy::balanced());
        let mut field_confs = HashMap::new();
        field_confs.insert("invoice_number".to_string(), 95);
        // Missing other critical fields
        
        let request = create_test_request(96, field_confs, 0, false);
        let result = service.check_approval(&request).unwrap();
        
        assert!(!result.approved);
        assert!(result.blocking_reasons.iter().any(|r| r.contains("Missing critical fields")));
    }
    
    #[test]
    fn test_approval_gate_contradictions() {
        let service = ApprovalGateService::new(ReviewPolicy::balanced());
        let mut field_confs = HashMap::new();
        field_confs.insert("invoice_number".to_string(), 95);
        field_confs.insert("invoice_date".to_string(), 95);
        field_confs.insert("vendor_name".to_string(), 95);
        field_confs.insert("total".to_string(), 95);
        
        let request = create_test_request(96, field_confs, 0, true); // Has contradictions
        let result = service.check_approval(&request).unwrap();
        
        assert!(!result.approved);
        assert!(result.blocking_reasons.iter().any(|r| r.contains("Contradictions")));
    }
    
    #[test]
    fn test_approval_gate_strict_mode() {
        let service = ApprovalGateService::new(ReviewPolicy::strict());
        let mut field_confs = HashMap::new();
        field_confs.insert("invoice_number".to_string(), 99);
        field_confs.insert("invoice_date".to_string(), 99);
        field_confs.insert("vendor_name".to_string(), 99);
        field_confs.insert("subtotal".to_string(), 99);
        field_confs.insert("tax".to_string(), 99);
        field_confs.insert("total".to_string(), 99);
        
        let request = create_test_request(99, field_confs, 0, false);
        let result = service.check_approval(&request).unwrap();
        
        assert!(result.approved);
        assert!(!result.can_auto_approve); // Strict mode disables auto-approve
        assert!(result.requires_review);
    }
}
