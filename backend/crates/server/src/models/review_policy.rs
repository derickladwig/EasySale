// Review Policy Configuration
// Defines review policies with fast/balanced/strict modes

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ReviewMode {
    Fast,
    Balanced,
    Strict,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReviewPolicy {
    pub mode: ReviewMode,
    pub thresholds: ConfidenceThresholds,
    pub critical_fields: Vec<String>,
    pub allow_soft_flags: bool,
    pub allow_any_flags: bool,
    pub auto_approve_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConfidenceThresholds {
    pub document_confidence: u8,
    pub critical_field_confidence: u8,
    pub auto_approve_threshold: u8,
    pub field_threshold: u8,
}

impl ReviewPolicy {
    pub fn fast() -> Self {
        Self {
            mode: ReviewMode::Fast,
            thresholds: ConfidenceThresholds {
                document_confidence: 90,
                critical_field_confidence: 85,
                auto_approve_threshold: 90,
                field_threshold: 80,
            },
            critical_fields: vec![
                "invoice_number".to_string(),
                "total".to_string(),
            ],
            allow_soft_flags: true,
            allow_any_flags: false,
            auto_approve_enabled: true,
        }
    }
    
    pub fn balanced() -> Self {
        Self {
            mode: ReviewMode::Balanced,
            thresholds: ConfidenceThresholds {
                document_confidence: 95,
                critical_field_confidence: 92,
                auto_approve_threshold: 95,
                field_threshold: 85,
            },
            critical_fields: vec![
                "invoice_number".to_string(),
                "invoice_date".to_string(),
                "vendor_name".to_string(),
                "total".to_string(),
            ],
            allow_soft_flags: true,
            allow_any_flags: false,
            auto_approve_enabled: true,
        }
    }
    
    pub fn strict() -> Self {
        Self {
            mode: ReviewMode::Strict,
            thresholds: ConfidenceThresholds {
                document_confidence: 98,
                critical_field_confidence: 95,
                auto_approve_threshold: 98,
                field_threshold: 90,
            },
            critical_fields: vec![
                "invoice_number".to_string(),
                "invoice_date".to_string(),
                "vendor_name".to_string(),
                "subtotal".to_string(),
                "tax".to_string(),
                "total".to_string(),
            ],
            allow_soft_flags: false,
            allow_any_flags: false,
            auto_approve_enabled: false,
        }
    }
    
    pub fn from_mode(mode: ReviewMode) -> Self {
        match mode {
            ReviewMode::Fast => Self::fast(),
            ReviewMode::Balanced => Self::balanced(),
            ReviewMode::Strict => Self::strict(),
        }
    }
    
    pub fn can_auto_approve(&self, document_confidence: u8, has_hard_flags: bool, has_soft_flags: bool) -> bool {
        if !self.auto_approve_enabled {
            return false;
        }
        
        if has_hard_flags {
            return false;
        }
        
        if has_soft_flags && !self.allow_soft_flags {
            return false;
        }
        
        document_confidence >= self.thresholds.auto_approve_threshold
    }
    
    pub fn is_critical_field(&self, field_name: &str) -> bool {
        self.critical_fields.iter().any(|f| f == field_name)
    }
}

impl Default for ReviewPolicy {
    fn default() -> Self {
        Self::balanced()
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TenantReviewPolicy {
    pub tenant_id: String,
    pub policy: ReviewPolicy,
    pub vendor_overrides: HashMap<String, ReviewPolicy>,
}

impl TenantReviewPolicy {
    pub fn new(tenant_id: String, policy: ReviewPolicy) -> Self {
        Self {
            tenant_id,
            policy,
            vendor_overrides: HashMap::new(),
        }
    }
    
    pub fn get_policy_for_vendor(&self, vendor_id: Option<&str>) -> &ReviewPolicy {
        if let Some(vid) = vendor_id {
            if let Some(override_policy) = self.vendor_overrides.get(vid) {
                return override_policy;
            }
        }
        &self.policy
    }
    
    pub fn add_vendor_override(&mut self, vendor_id: String, policy: ReviewPolicy) {
        self.vendor_overrides.insert(vendor_id, policy);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_fast_mode() {
        let policy = ReviewPolicy::fast();
        assert_eq!(policy.mode, ReviewMode::Fast);
        assert_eq!(policy.thresholds.document_confidence, 90);
        assert!(policy.allow_soft_flags);
        assert!(policy.auto_approve_enabled);
    }
    
    #[test]
    fn test_balanced_mode() {
        let policy = ReviewPolicy::balanced();
        assert_eq!(policy.mode, ReviewMode::Balanced);
        assert_eq!(policy.thresholds.document_confidence, 95);
        assert_eq!(policy.critical_fields.len(), 4);
    }
    
    #[test]
    fn test_strict_mode() {
        let policy = ReviewPolicy::strict();
        assert_eq!(policy.mode, ReviewMode::Strict);
        assert_eq!(policy.thresholds.document_confidence, 98);
        assert!(!policy.allow_soft_flags);
        assert!(!policy.auto_approve_enabled);
    }
    
    #[test]
    fn test_auto_approve_fast() {
        let policy = ReviewPolicy::fast();
        assert!(policy.can_auto_approve(95, false, false));
        assert!(policy.can_auto_approve(95, false, true)); // Allows soft flags
        assert!(!policy.can_auto_approve(95, true, false)); // Hard flags block
        assert!(!policy.can_auto_approve(85, false, false)); // Below threshold
    }
    
    #[test]
    fn test_auto_approve_strict() {
        let policy = ReviewPolicy::strict();
        assert!(!policy.can_auto_approve(99, false, false)); // Auto-approve disabled
    }
    
    #[test]
    fn test_critical_fields() {
        let policy = ReviewPolicy::balanced();
        assert!(policy.is_critical_field("invoice_number"));
        assert!(policy.is_critical_field("total"));
        assert!(!policy.is_critical_field("notes"));
    }
    
    #[test]
    fn test_tenant_policy() {
        let mut tenant_policy = TenantReviewPolicy::new(
            "tenant1".to_string(),
            ReviewPolicy::balanced(),
        );
        
        // Default policy
        assert_eq!(tenant_policy.get_policy_for_vendor(None).mode, ReviewMode::Balanced);
        
        // Add vendor override
        tenant_policy.add_vendor_override("vendor1".to_string(), ReviewPolicy::strict());
        assert_eq!(tenant_policy.get_policy_for_vendor(Some("vendor1")).mode, ReviewMode::Strict);
        assert_eq!(tenant_policy.get_policy_for_vendor(Some("vendor2")).mode, ReviewMode::Balanced);
    }
}
