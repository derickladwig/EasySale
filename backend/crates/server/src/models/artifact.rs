// Artifact models for OCR pipeline traceability
// Every output must trace back to an artifact for debugging, review, and compliance

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Main artifact enum containing all artifact types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum Artifact {
    Input(InputArtifact),
    Page(PageArtifact),
    Variant(VariantArtifact),
    Zone(ZoneArtifact),
    Ocr(OcrArtifact),
    Candidate(CandidateArtifact),
    Decision(DecisionArtifact),
}

/// Original uploaded file artifact
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InputArtifact {
    pub artifact_id: String,
    pub file_path: String,
    pub file_hash: String,
    pub file_size: u64,
    pub mime_type: String,
    pub uploaded_at: DateTime<Utc>,
}

/// Rasterized page from PDF or loaded image
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PageArtifact {
    pub artifact_id: String,
    pub input_id: String,
    pub page_number: u32,
    pub dpi: u32,
    pub rotation: u16, // 0/90/180/270
    pub rotation_score: f64,
    pub image_path: String,
    pub text_layer: Option<String>, // PDF text layer if present
}

/// Preprocessing variant result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VariantArtifact {
    pub artifact_id: String,
    pub page_id: String,
    pub variant_type: VariantType,
    pub readiness_score: f64,
    pub image_path: String,
    pub processing_time_ms: u64,
}

/// Types of preprocessing variants
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum VariantType {
    Grayscale,
    AdaptiveThreshold,
    DenoiseAndSharpen,
    ContrastBump,
    Upscale,
    Deskewed,
}

/// Cropped and masked zone image
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneArtifact {
    pub artifact_id: String,
    pub variant_id: String,
    pub zone_type: ZoneType,
    pub bbox: BoundingBox,
    pub confidence: f64,
    pub image_path: String,
    pub masks: Vec<BoundingBox>,
}

/// Types of document zones
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum ZoneType {
    HeaderFields,
    TotalsBox,
    LineItemsTable,
    FooterNotes,
    BarcodeArea,
    LogoArea,
}

/// Bounding box coordinates
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

/// OCR output artifact
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrArtifact {
    pub artifact_id: String,
    pub zone_id: String,
    pub profile: String,
    pub engine: String,
    pub text: String,
    pub avg_confidence: f64,
    pub words: Vec<OcrWord>,
    pub processing_time_ms: u64,
}

/// Individual OCR word with confidence and position
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OcrWord {
    pub text: String,
    pub confidence: f64,
    pub bbox: BoundingBox,
}

/// Field candidate artifact
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateArtifact {
    pub artifact_id: String,
    pub field_type: String,
    pub value_raw: String,
    pub value_normalized: Option<String>,
    pub score: u8, // 0-100
    pub evidence: Vec<Evidence>,
    pub sources: Vec<String>, // OcrArtifact IDs
}

/// Evidence for a candidate value
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Evidence {
    pub evidence_type: EvidenceType,
    pub description: String,
    pub artifact_id: String,
    pub weight: f64,
}

/// Types of evidence
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum EvidenceType {
    OcrMatch,
    LabelProximity,
    ZonePrior,
    FormatParsing,
    Consensus,
    PdfTextLayer,
}

/// Review decision artifact
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecisionArtifact {
    pub artifact_id: String,
    pub case_id: String,
    pub field_type: String,
    pub chosen_value: String,
    pub decision_source: ArtifactDecisionSource,
    pub decided_at: DateTime<Utc>,
    pub decided_by: String,
}

/// Source of a decision
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum ArtifactDecisionSource {
    AutoApproved,
    UserSelected,
    UserEntered,
    SystemDefault,
}

impl InputArtifact {
    /// Create a new input artifact
    pub fn new(
        artifact_id: String,
        file_path: String,
        file_hash: String,
        file_size: u64,
        mime_type: String,
    ) -> Self {
        Self {
            artifact_id,
            file_path,
            file_hash,
            file_size,
            mime_type,
            uploaded_at: Utc::now(),
        }
    }
}

impl PageArtifact {
    /// Create a new page artifact
    pub fn new(
        artifact_id: String,
        input_id: String,
        page_number: u32,
        dpi: u32,
        rotation: u16,
        rotation_score: f64,
        image_path: String,
        text_layer: Option<String>,
    ) -> Self {
        Self {
            artifact_id,
            input_id,
            page_number,
            dpi,
            rotation,
            rotation_score,
            image_path,
            text_layer,
        }
    }
}

impl BoundingBox {
    /// Create a new bounding box
    pub fn new(x: u32, y: u32, width: u32, height: u32) -> Self {
        Self {
            x,
            y,
            width,
            height,
        }
    }

    /// Check if this bounding box contains a point
    pub fn contains(&self, x: u32, y: u32) -> bool {
        x >= self.x && x < self.x + self.width && y >= self.y && y < self.y + self.height
    }

    /// Check if this bounding box intersects with another
    pub fn intersects(&self, other: &BoundingBox) -> bool {
        self.x < other.x + other.width
            && self.x + self.width > other.x
            && self.y < other.y + other.height
            && self.y + self.height > other.y
    }

    /// Calculate the area of this bounding box
    pub fn area(&self) -> u32 {
        self.width * self.height
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_input_artifact_creation() {
        let artifact = InputArtifact::new(
            "input-001".to_string(),
            "/path/to/file.pdf".to_string(),
            "abc123".to_string(),
            1024,
            "application/pdf".to_string(),
        );

        assert_eq!(artifact.artifact_id, "input-001");
        assert_eq!(artifact.file_path, "/path/to/file.pdf");
        assert_eq!(artifact.file_hash, "abc123");
        assert_eq!(artifact.file_size, 1024);
        assert_eq!(artifact.mime_type, "application/pdf");
    }

    #[test]
    fn test_page_artifact_creation() {
        let artifact = PageArtifact::new(
            "page-001".to_string(),
            "input-001".to_string(),
            1,
            300,
            0,
            0.95,
            "/path/to/page1.png".to_string(),
            Some("PDF text content".to_string()),
        );

        assert_eq!(artifact.artifact_id, "page-001");
        assert_eq!(artifact.input_id, "input-001");
        assert_eq!(artifact.page_number, 1);
        assert_eq!(artifact.dpi, 300);
        assert_eq!(artifact.rotation, 0);
        assert_eq!(artifact.rotation_score, 0.95);
        assert!(artifact.text_layer.is_some());
    }

    #[test]
    fn test_bounding_box_contains() {
        let bbox = BoundingBox::new(10, 10, 100, 100);

        assert!(bbox.contains(50, 50));
        assert!(bbox.contains(10, 10));
        assert!(!bbox.contains(5, 5));
        assert!(!bbox.contains(150, 150));
    }

    #[test]
    fn test_bounding_box_intersects() {
        let bbox1 = BoundingBox::new(10, 10, 100, 100);
        let bbox2 = BoundingBox::new(50, 50, 100, 100);
        let bbox3 = BoundingBox::new(200, 200, 100, 100);

        assert!(bbox1.intersects(&bbox2));
        assert!(bbox2.intersects(&bbox1));
        assert!(!bbox1.intersects(&bbox3));
        assert!(!bbox3.intersects(&bbox1));
    }

    #[test]
    fn test_bounding_box_area() {
        let bbox = BoundingBox::new(0, 0, 100, 50);
        assert_eq!(bbox.area(), 5000);
    }

    #[test]
    fn test_variant_type_serialization() {
        let variant_type = VariantType::Grayscale;
        let json = serde_json::to_string(&variant_type).unwrap();
        let deserialized: VariantType = serde_json::from_str(&json).unwrap();
        assert_eq!(variant_type, deserialized);
    }

    #[test]
    fn test_zone_type_serialization() {
        let zone_type = ZoneType::TotalsBox;
        let json = serde_json::to_string(&zone_type).unwrap();
        let deserialized: ZoneType = serde_json::from_str(&json).unwrap();
        assert_eq!(zone_type, deserialized);
    }

    #[test]
    fn test_evidence_type_serialization() {
        let evidence_type = EvidenceType::OcrMatch;
        let json = serde_json::to_string(&evidence_type).unwrap();
        let deserialized: EvidenceType = serde_json::from_str(&json).unwrap();
        assert_eq!(evidence_type, deserialized);
    }

    #[test]
    fn test_decision_source_serialization() {
        let source = ArtifactDecisionSource::AutoApproved;
        let json = serde_json::to_string(&source).unwrap();
        let deserialized: ArtifactDecisionSource = serde_json::from_str(&json).unwrap();
        assert_eq!(source, deserialized);
    }
}
