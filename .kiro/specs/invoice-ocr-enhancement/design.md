# Invoice OCR Enhancement - Design v3.0

## Core Philosophy

**"Operationally Bullet-Proof" Design:**
- Auto when safe (high confidence + validations pass)
- Ask only what's uncertain (progressive review)
- Never lose provenance (every value has evidence + source + artifact trace)
- Review faster than manual entry (one screen + click-to-accept + hotkeys + "Approve & Next")
- Hard stop on contradictions (totals don't reconcile, critical fields missing)
- If not confident → force review (never silently wrong)

## Architecture Overview (Pipeline + Artifacts + Review)

**Key Change:** Instead of linear "preprocess → multipass OCR → merge", we do:

```
Document → Pages → Variants → Zones(+Masks) → OCR Artifacts → 
Field Candidates → Resolver → Validation → Review/Approve → Export
```

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                  DocumentIngestService                       │
│  • Input validation                                          │
│  • PDF rasterization                                         │
│  • Page artifacts                                            │
│  • Text-layer capture                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   OrientationService                         │
│  • Rotation scoring (0/90/180/270)                           │
│  • Deskew decision per page                                  │
│  • Store rotation evidence                                   │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                PreprocessVariantService                      │
│  • Generate 6-12 variants per page                           │
│  • Rank variants by OCR-readiness                            │
│  • Cache artifacts                                           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   ZoneDetectorService                        │
│  • Detect zones (Header/Totals/Table/Footer)                │
│  • Auto-mask noise regions                                   │
│  • Allow zone overrides                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    OcrOrchestrator                           │
│  • Run profiles across (variant × zone)                      │
│  • Budgets & early stop                                      │
│  • Store OCR artifacts                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     FieldExtractor                           │
│  • Build candidates using lexicon                            │
│  • Regex + proximity + parsing                               │
│  • Top N candidates with evidence                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     FieldResolver                            │
│  • Consensus + cross-check                                   │
│  • Final field selection                                     │
│  • Confidence calculation                                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   ValidationEngine                           │
│  • Hard/soft rules                                           │
│  • Suggested fixes                                           │
│  • Approval gates                                            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   ConfidenceService                          │
│  • Field/doc confidence                                      │
│  • Optional calibrator                                       │
│  • Auto-approval eligibility                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   ReviewCaseService                          │
│  • State machine                                             │
│  • Queue, sessions, audit, undo                              │
│  • Archive (no delete)                                       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              Export/Integration Services                     │
│  • CSV exports                                               │
│  • Inventory/AP/Accounting                                   │
│  • Gated by Approved state                                   │
└─────────────────────────────────────────────────────────────┘
```

## Artifact Model (The Missing "Bullet-Proof" Piece)

**Every output must trace back to an artifact:**

```rust
pub enum Artifact {
    InputArtifact(InputArtifact),       // Original file
    PageArtifact(PageArtifact),         // Rasterized page at DPI + rotation
    VariantArtifact(VariantArtifact),   // Preprocessing variant result
    ZoneArtifact(ZoneArtifact),         // Cropped + masked zone image
    OcrArtifact(OcrArtifact),           // OCR output text + confidences
    CandidateArtifact(CandidateArtifact), // Field candidate + evidence
    DecisionArtifact(DecisionArtifact), // Review decision + audit
}

pub struct InputArtifact {
    pub artifact_id: String,
    pub file_path: String,
    pub file_hash: String,
    pub file_size: u64,
    pub mime_type: String,
    pub uploaded_at: DateTime<Utc>,
}

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

pub struct VariantArtifact {
    pub artifact_id: String,
    pub page_id: String,
    pub variant_type: VariantType,
    pub readiness_score: f64,
    pub image_path: String,
    pub processing_time_ms: u64,
}

pub enum VariantType {
    Grayscale,
    AdaptiveThreshold,
    DenoiseAndSharpen,
    ContrastBump,
    Upscale,
    Deskewed,
}

pub struct ZoneArtifact {
    pub artifact_id: String,
    pub variant_id: String,
    pub zone_type: ZoneType,
    pub bbox: BoundingBox,
    pub confidence: f64,
    pub image_path: String,
    pub masks: Vec<BoundingBox>,
}

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

pub struct OcrWord {
    pub text: String,
    pub confidence: f64,
    pub bbox: BoundingBox,
}
```

This makes debugging, review, and compliance possible.

## Data Structures

### Zones + Masks

```rust
pub struct ZoneMap {
    pub page_id: String,
    pub zones: Vec<Zone>,
    pub blocks: Vec<BoundingBox>, // masks
}

pub struct Zone {
    pub zone_type: ZoneType,
    pub bbox: BoundingBox,
    pub confidence: f64,
    pub priority: u8,
}

pub enum ZoneType {
    HeaderFields,
    TotalsBox,
    LineItemsTable,
    FooterNotes,
    BarcodeArea,
    LogoArea,
}

pub struct BoundingBox {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}
```

### OCR Profiles

```rust
pub struct OcrProfile {
    pub name: String,
    pub psm: u8,  // Page Segmentation Mode
    pub oem: u8,  // OCR Engine Mode
    pub dpi: Option<u32>,
    pub language: String,
    pub whitelist: Option<String>, // e.g., "0123456789.$," for totals
    pub blacklist: Option<String>,
    pub zone_types: Vec<ZoneType>, // Which zones this profile applies to
}

impl OcrProfile {
    pub fn numbers_only() -> Self {
        Self {
            name: "numbers-only".to_string(),
            psm: 7, // Single line
            oem: 3,
            dpi: Some(300),
            language: "eng".to_string(),
            whitelist: Some("0123456789.$,".to_string()),
            blacklist: None,
            zone_types: vec![ZoneType::TotalsBox],
        }
    }
    
    pub fn table_dense() -> Self {
        Self {
            name: "table-dense".to_string(),
            psm: 6, // Uniform block of text
            oem: 3,
            dpi: None,
            language: "eng".to_string(),
            whitelist: None,
            blacklist: None,
            zone_types: vec![ZoneType::LineItemsTable],
        }
    }
}
```

### Candidates + Resolver Output

```rust
pub struct FieldCandidate {
    pub field: FieldType,
    pub value_raw: String,
    pub value_normalized: Option<String>,
    pub score: u8, // 0-100
    pub evidence: Vec<Evidence>,
    pub sources: Vec<String>, // OcrArtifact IDs
}

pub struct Evidence {
    pub evidence_type: EvidenceType,
    pub description: String,
    pub artifact_id: String,
    pub weight: f64,
}

pub enum EvidenceType {
    OcrMatch,
    LabelProximity,
    ZonePrior,
    FormatParsing,
    Consensus,
    PdfTextLayer,
}

pub struct FieldValue {
    pub field: FieldType,
    pub value: String,
    pub normalized: Option<String>,
    pub confidence: u8,
    pub chosen_sources: Vec<String>,
    pub alternatives: Vec<FieldCandidate>,
    pub flags: Vec<String>,
    pub explanation: String, // Plain-language "why we think this"
}

pub enum FieldType {
    InvoiceNumber,
    InvoiceDate,
    VendorName,
    Subtotal,
    Tax,
    Total,
    LineItem { index: usize, field: LineItemField },
}

pub enum LineItemField {
    Sku,
    Description,
    Quantity,
    UnitPrice,
    LineTotal,
}
```

### Lexicon (Universal Terms)

```rust
pub struct Lexicon {
    pub field_synonyms: HashMap<FieldType, Vec<String>>,
    pub vendor_overrides: HashMap<String, HashMap<FieldType, Vec<String>>>,
}

impl Default for Lexicon {
    fn default() -> Self {
        let mut field_synonyms = HashMap::new();
        
        field_synonyms.insert(
            FieldType::InvoiceNumber,
            vec![
                "invoice no".to_string(),
                "inv #".to_string(),
                "invoice #".to_string(),
                "receipt #".to_string(),
                "statement #".to_string(),
                "bill no".to_string(),
            ],
        );
        
        field_synonyms.insert(
            FieldType::Total,
            vec![
                "total".to_string(),
                "total due".to_string(),
                "amount due".to_string(),
                "balance due".to_string(),
                "grand total".to_string(),
                "total amount".to_string(),
            ],
        );
        
        field_synonyms.insert(
            FieldType::InvoiceDate,
            vec![
                "invoice date".to_string(),
                "date issued".to_string(),
                "bill date".to_string(),
                "statement date".to_string(),
                "date".to_string(),
            ],
        );
        
        Self {
            field_synonyms,
            vendor_overrides: HashMap::new(),
        }
    }
}
```

### Budgets & Early Stop

```rust
pub struct ProcessingBudget {
    pub max_time_per_page_ms: u64,
    pub max_time_per_document_ms: u64,
    pub max_variants_per_page: usize,
    pub max_passes_per_zone: usize,
    pub early_stop_confidence_threshold: u8,
    pub early_stop_critical_fields: Vec<FieldType>,
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
                FieldType::InvoiceNumber,
                FieldType::InvoiceDate,
                FieldType::Total,
            ],
        }
    }
}

pub struct EarlyStopChecker {
    budget: ProcessingBudget,
}

impl EarlyStopChecker {
    pub fn should_stop(&self, fields: &[FieldValue]) -> bool {
        // Check if all critical fields exceed threshold
        let critical_fields: Vec<_> = fields
            .iter()
            .filter(|f| self.budget.early_stop_critical_fields.contains(&f.field))
            .collect();
        
        if critical_fields.len() < self.budget.early_stop_critical_fields.len() {
            return false; // Not all critical fields found yet
        }
        
        critical_fields
            .iter()
            .all(|f| f.confidence >= self.budget.early_stop_confidence_threshold)
    }
}
```

## Review UX (Two Modes)

### Guided Mode (Default)

```rust
pub struct GuidedReviewView {
    pub fields_needing_attention: Vec<FieldReviewItem>,
    pub safe_fields_count: usize,
    pub approval_blocked: bool,
    pub blocking_reasons: Vec<String>,
    pub suggested_actions: Vec<SuggestedAction>,
}

pub struct FieldReviewItem {
    pub field: FieldType,
    pub best_value: String,
    pub confidence: u8,
    pub alternatives: Vec<Alternative>,
    pub evidence_card: EvidenceCard,
    pub locate_on_page: BoundingBox,
}

pub struct EvidenceCard {
    pub title: String,
    pub explanation: String, // Plain-language "why we think this"
    pub sources: Vec<String>, // "Found in 3 OCR passes", "Matches vendor pattern"
    pub confidence_breakdown: Vec<(String, u8)>,
}

pub struct Alternative {
    pub value: String,
    pub confidence: u8,
    pub source: String,
}

pub struct SuggestedAction {
    pub action_type: ActionType,
    pub description: String,
    pub ui_hint: String,
}

pub enum ActionType {
    AcceptAllSafeFields,
    ReviewField { field: FieldType },
    ReOcrRegion { region: BoundingBox },
    RotatePage,
    SelectVendor,
    EnterMissingField { field: FieldType },
}
```

### Power Mode (Collapsed by Default)

```rust
pub struct PowerModeView {
    pub confidence_thresholds: ConfidenceThresholds,
    pub raw_ocr_artifacts: Vec<OcrArtifact>,
    pub evidence_breakdown: Vec<EvidenceDetail>,
    pub zone_editor: ZoneEditor,
    pub vendor_template_override: Option<String>,
}

pub struct ConfidenceThresholds {
    pub field_threshold: u8,
    pub document_threshold: u8,
    pub auto_approve_threshold: u8,
}

pub struct ZoneEditor {
    pub zones: Vec<Zone>,
    pub editable: bool,
    pub changes: Vec<ZoneChange>,
}
```

## API Surface (Practical Set)

```rust
// Ingest
POST /api/ingest
Request: multipart/form-data (file)
Response: { case_id, status, estimated_time_ms }

// Review Queue
GET /api/cases?state=&vendor=&min_conf=&sort=
Response: { cases: [ReviewCase], total, page, per_page }

// Case Detail
GET /api/cases/:id
Response: { case, artifacts, fields, validation, confidence }

// Targeted Re-OCR
POST /api/cases/:id/reocr
Request: { region: BoundingBox, profile: String }
Response: { new_candidates, updated_fields, processing_time_ms }

// Masks
POST /api/cases/:id/masks
Request: { action: "add"|"remove", region: BoundingBox, remember_for_vendor: bool }
Response: { masks, reprocessing_started }

// Field Decision
POST /api/cases/:id/decide
Request: { field: FieldType, chosen_value: String, source: DecisionSource }
Response: { updated_confidence, validation_result }

// Approve
POST /api/cases/:id/approve
Response: { approved: bool, blocking_reasons: [String], state: ReviewState }

// Export
POST /api/cases/:id/export
Request: { format: "csv"|"json", include_line_items: bool }
Response: { export_url, expires_at }

// Undo
POST /api/cases/:id/undo
Response: { restored_decision, current_state }
```

## Configuration Files

### OCR Profiles (YAML)

```yaml
# config/ocr_profiles.yml
profiles:
  - name: full-page-default
    psm: 3
    oem: 3
    dpi: 300
    language: eng
    zone_types: [HeaderFields, FooterNotes]
  
  - name: numbers-only-totals
    psm: 7
    oem: 3
    dpi: 300
    language: eng
    whitelist: "0123456789.$,"
    zone_types: [TotalsBox]
  
  - name: table-dense
    psm: 6
    oem: 3
    language: eng
    zone_types: [LineItemsTable]
```

### Review Policy (YAML)

```yaml
# config/review_policy.yml
mode: balanced  # fast | balanced | strict

thresholds:
  fast:
    document_confidence: 90
    allow_soft_flags: true
  balanced:
    document_confidence: 95
    critical_field_confidence: 92
    allow_soft_flags: true
  strict:
    document_confidence: 98
    allow_any_flags: false

critical_fields:
  - invoice_number
  - invoice_date
  - vendor_name
  - total
```

### Lexicon (YAML)

```yaml
# config/lexicon.yml
field_synonyms:
  invoice_number:
    - invoice no
    - inv #
    - invoice #
    - receipt #
    - statement #
  total:
    - total
    - total due
    - amount due
    - balance due
    - grand total
  invoice_date:
    - invoice date
    - date issued
    - bill date
    - statement date

vendor_overrides:
  acme-corp:
    invoice_number:
      - acme invoice
      - order number
```

## Correctness Properties

### Property 1: Artifact Traceability
**Validates: Requirements 0.2, 1.2**

Every output value must trace back to at least one artifact.

```rust
#[test]
fn test_artifact_traceability() {
    // Property: all field values have artifact sources
}
```

### Property 2: Budget Enforcement
**Validates: Requirements 2.3**

Processing must respect time budgets.

```rust
#[test]
fn test_budget_enforcement() {
    // Property: processing_time <= budget.max_time
}
```

### Property 3: Approval Gate Consistency
**Validates: Requirements 5.1, 5.3**

If hard flags exist, approval must be blocked.

```rust
#[test]
fn test_approval_gate_consistency() {
    // Property: has_hard_flags => !can_approve
}
```

### Property 4: Audit Completeness
**Validates: Requirements 6.4**

All state changes must be logged.

```rust
#[test]
fn test_audit_completeness() {
    // Property: state_changes.len() == audit_logs.len()
}
```

### Property 5: Confidence Calibration
**Validates: Requirements 4.3**

Confidence scores must correlate with accuracy.

```rust
#[test]
fn test_confidence_calibration() {
    // Property: confidence_90 => accuracy >= 85%
}
```

## Migration Strategy

### Phase 0: Golden Set (Week 1)
- Create fixtures with ground truth
- Metrics runner
- Regression gate in CI

### Phase 1: Ingest + Artifacts (Weeks 2-3)
- Document ingest service
- Page artifacts with rotation
- Artifact storage

### Phase 2: Variants + Zones (Weeks 4-5)
- Variant generation
- Zone detection
- Masking engine

### Phase 3: OCR Orchestrator (Weeks 6-7)
- Profile system
- Multi-pass with budgets
- Artifact storage

### Phase 4: Candidates + Resolver (Weeks 8-9)
- Lexicon system
- Candidate extraction
- Field resolver

### Phase 5: Review UI (Weeks 10-11)
- Guided mode
- Targeted re-OCR
- Approval gates

### Phase 6: Integration (Week 12)
- Inventory/AP/Accounting
- Export gating
- Production deployment

---

**Version:** 3.0 (Universal + Operationally Bullet-Proof)  
**Last Updated:** January 25, 2026  
**Status:** Ready for Implementation
