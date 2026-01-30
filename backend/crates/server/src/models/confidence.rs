use serde::{Deserialize, Serialize};

/// Field-level confidence model
/// Requirements: 2.1
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FieldConfidence {
    pub field_name: String,
    pub best_value: String,
    pub confidence: u8, // 0-100
    pub candidates: Vec<CandidateValue>,
    pub source_evidence: SourceEvidence,
}

/// Candidate value from OCR with confidence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateValue {
    pub value: String,
    pub confidence: u8,
    pub source_pass: u8,
    pub source_region: BoundingBox,
    pub method: ExtractionMethod,
}

/// Method used to extract value
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExtractionMethod {
    OCRPass(u8),
    TemplateMatch,
    ManualEntry,
    ReOcrRegion,
}

/// Evidence for where value came from
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceEvidence {
    pub pass_number: u8,
    pub region: BoundingBox,
    pub raw_text: String,
    pub method: ExtractionMethod,
}

/// Bounding box for region
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/// Document-level confidence model
/// Requirements: 2.2
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentConfidence {
    pub overall: u8, // 0-100
    pub field_confidences: Vec<FieldConfidence>,
    pub critical_field_avg: u8,
    pub validation_penalty: i8,
    pub auto_approve_eligible: bool,
}

impl DocumentConfidence {
    /// Create new document confidence from field confidences
    pub fn new(field_confidences: Vec<FieldConfidence>, critical_fields: &[String]) -> Self {
        let overall = Self::calculate_overall(&field_confidences);
        let critical_field_avg = Self::calculate_critical_avg(&field_confidences, critical_fields);
        
        Self {
            overall,
            field_confidences,
            critical_field_avg,
            validation_penalty: 0,
            auto_approve_eligible: false,
        }
    }
    
    /// Calculate overall confidence (weighted average)
    fn calculate_overall(fields: &[FieldConfidence]) -> u8 {
        if fields.is_empty() {
            return 0;
        }
        
        let sum: u32 = fields.iter().map(|f| f.confidence as u32).sum();
        (sum / fields.len() as u32) as u8
    }
    
    /// Calculate average confidence for critical fields
    fn calculate_critical_avg(fields: &[FieldConfidence], critical_fields: &[String]) -> u8 {
        let critical: Vec<_> = fields
            .iter()
            .filter(|f| critical_fields.contains(&f.field_name))
            .collect();
        
        if critical.is_empty() {
            return 0;
        }
        
        let sum: u32 = critical.iter().map(|f| f.confidence as u32).sum();
        (sum / critical.len() as u32) as u8
    }
    
    /// Apply validation penalty
    pub fn apply_penalty(&mut self, penalty: i8) {
        self.validation_penalty += penalty;
        
        // Reduce overall confidence
        let adjusted = (self.overall as i16) - (penalty as i16);
        self.overall = adjusted.clamp(0, 100) as u8;
    }
    
    /// Update auto-approval eligibility
    pub fn update_eligibility(&mut self, eligible: bool) {
        self.auto_approve_eligible = eligible;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_document_confidence_creation() {
        let fields = vec![
            FieldConfidence {
                field_name: "invoice_number".to_string(),
                best_value: "INV-12345".to_string(),
                confidence: 95,
                candidates: vec![],
                source_evidence: SourceEvidence {
                    pass_number: 1,
                    region: BoundingBox { x: 0, y: 0, width: 100, height: 20 },
                    raw_text: "INV-12345".to_string(),
                    method: ExtractionMethod::OCRPass(1),
                },
            },
            FieldConfidence {
                field_name: "total".to_string(),
                best_value: "100.00".to_string(),
                confidence: 90,
                candidates: vec![],
                source_evidence: SourceEvidence {
                    pass_number: 1,
                    region: BoundingBox { x: 0, y: 0, width: 100, height: 20 },
                    raw_text: "100.00".to_string(),
                    method: ExtractionMethod::OCRPass(1),
                },
            },
        ];
        
        let critical_fields = vec!["invoice_number".to_string(), "total".to_string()];
        let doc_conf = DocumentConfidence::new(fields, &critical_fields);
        
        assert_eq!(doc_conf.overall, 92); // (95 + 90) / 2
        assert_eq!(doc_conf.critical_field_avg, 92);
        assert_eq!(doc_conf.validation_penalty, 0);
        assert!(!doc_conf.auto_approve_eligible);
    }

    #[test]
    fn test_apply_penalty() {
        let fields = vec![
            FieldConfidence {
                field_name: "total".to_string(),
                best_value: "100.00".to_string(),
                confidence: 90,
                candidates: vec![],
                source_evidence: SourceEvidence {
                    pass_number: 1,
                    region: BoundingBox { x: 0, y: 0, width: 100, height: 20 },
                    raw_text: "100.00".to_string(),
                    method: ExtractionMethod::OCRPass(1),
                },
            },
        ];
        
        let mut doc_conf = DocumentConfidence::new(fields, &[]);
        assert_eq!(doc_conf.overall, 90);
        
        doc_conf.apply_penalty(10);
        assert_eq!(doc_conf.overall, 80);
        assert_eq!(doc_conf.validation_penalty, 10);
    }
}
