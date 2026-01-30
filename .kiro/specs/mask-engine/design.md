# Design Document: Document Cleanup Engine

## Overview

The Document Cleanup Engine (DCE) transforms the existing Mask Engine into a comprehensive document cleanup system. It detects and manages "Cleanup Shields" (regions to exclude from OCR processing) to improve extraction accuracy.

**Terminology Change**: "Mask" → "Cleanup Shield" (user-facing). The term "mask" sounds destructive; "Cleanup Shield" communicates "exclude noisy regions from OCR/extraction" with rules, precedence, and review workflow.

Key design principles:
- **Fail-open**: Detection failures never block OCR processing
- **Zone-targeted**: Shields can target specific document zones
- **Resolution-independent**: Normalized coordinates (0.0-1.0) for portability
- **Backward-compatible**: Old API preserved via thin wrappers (NO DELETES policy)
- **Precedence-based**: Clear hierarchy of Session → Template → Vendor → Auto rules

## Architecture

The Document Cleanup Engine follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  /api/cleanup/* (new)    /api/masks/* (compat wrapper)          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐   │
│  │ CleanupEngine       │  │ mask_engine.rs (compat wrapper) │   │
│  │ (cleanup_engine.rs) │←─│ re-exports + delegates          │   │
│  └─────────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   Detection Layer                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │ Logo         │ │ Watermark    │ │ Repetitive Strip         │ │
│  │ Detector     │ │ Detector     │ │ Detector (multi-page)    │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │ Text-Aware   │ │ Stamp        │                              │
│  │ Detector     │ │ Detector     │                              │
│  └──────────────┘ └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                   Persistence Layer                              │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────────┐  │
│  │ vendor_cleanup   │ │ template_cleanup │ │ cleanup_audit   │  │
│  │ _rules           │ │ _rules           │ │ _log            │  │
│  └──────────────────┘ └──────────────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
backend/crates/server/src/services/
├── cleanup_engine/
│   ├── mod.rs                    # Module exports
│   ├── engine.rs                 # CleanupEngine main service
│   ├── types.rs                  # CleanupShield, ShieldType, etc.
│   ├── config.rs                 # CleanupEngineConfig
│   ├── detectors/
│   │   ├── mod.rs
│   │   ├── logo.rs               # Logo detection
│   │   ├── watermark.rs          # Watermark detection
│   │   ├── repetitive.rs         # Header/footer detection
│   │   ├── multi_page.rs         # Multi-page strip detection
│   │   └── text_aware.rs         # OCR-assisted detection
│   ├── persistence.rs            # Database operations
│   ├── renderer.rs               # Overlay visualization
│   └── precedence.rs             # Rule precedence resolver
├── mask_engine.rs                # Backward-compat wrapper (preserved)
└── mask_engine_README.md         # Updated documentation
```

## Components and Interfaces

### Core Types

```rust
/// Shield type classification
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ShieldType {
    Logo,
    Watermark,
    RepetitiveHeader,
    RepetitiveFooter,
    Stamp,
    UserDefined,
    VendorSpecific,
    TemplateSpecific,
}

/// Apply mode for shields
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum ApplyMode {
    Applied,
    #[default]
    Suggested,
    Disabled,
}

/// Risk level for shields
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
pub enum RiskLevel {
    #[default]
    Low,
    Medium,
    High,
}

/// Page targeting for shields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PageTarget {
    All,
    First,
    Last,
    Specific(Vec<u32>),
}

/// Zone targeting for shields
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ZoneTarget {
    pub include_zones: Option<Vec<String>>,  // None = all zones
    pub exclude_zones: Vec<String>,
}

/// Normalized bounding box (0.0 to 1.0)
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct NormalizedBBox {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Cleanup Shield with full metadata (user-facing name for ShieldRegion)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupShield {
    pub id: String,
    pub shield_type: ShieldType,
    pub normalized_bbox: NormalizedBBox,
    pub page_target: PageTarget,
    pub zone_target: ZoneTarget,
    pub apply_mode: ApplyMode,
    pub risk_level: RiskLevel,
    pub confidence: f64,
    pub min_confidence: f64,
    pub why_detected: String,
    pub provenance: ShieldProvenance,
}

/// Provenance tracking for shields
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShieldProvenance {
    pub source: ShieldSource,
    pub user_id: Option<String>,
    pub vendor_id: Option<String>,
    pub template_id: Option<String>,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
}

/// Shield source for precedence
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, PartialOrd, Ord)]
pub enum ShieldSource {
    AutoDetected = 0,
    VendorRule = 1,
    TemplateRule = 2,
    SessionOverride = 3,
}
```

### CleanupEngine Interface

```rust
/// Configuration for cleanup engine
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupEngineConfig {
    pub auto_detect_logos: bool,
    pub auto_detect_watermarks: bool,
    pub auto_detect_repetitive: bool,
    pub auto_detect_stamps: bool,
    pub use_text_aware_detection: bool,
    pub min_auto_confidence: f64,
    pub max_processing_time_ms: u64,
    pub critical_zones: Vec<String>,  // Zones that trigger risk elevation
}

/// Detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanupDetectionResult {
    pub shields: Vec<CleanupShield>,
    pub processing_time_ms: u64,
    pub auto_detected_count: usize,
    pub rule_applied_count: usize,
    pub warnings: Vec<String>,
}

/// Main engine trait
pub trait CleanupEngineService {
    /// Auto-detect shields in an image
    fn auto_detect_shields(
        &self,
        image_path: &Path,
    ) -> Result<CleanupDetectionResult, CleanupEngineError>;
    
    /// Auto-detect shields across multiple pages
    fn auto_detect_multi_page(
        &self,
        page_paths: &[&Path],
    ) -> Result<CleanupDetectionResult, CleanupEngineError>;
    
    /// Add a user-defined shield
    fn add_user_shield(
        &self,
        bbox: NormalizedBBox,
        user_id: &str,
        reason: Option<String>,
        page_target: PageTarget,
        zone_target: ZoneTarget,
    ) -> Result<CleanupShield, CleanupEngineError>;
    
    /// Get all shields with precedence resolution
    fn get_resolved_shields(
        &self,
        image_path: &Path,
        vendor_id: Option<&str>,
        template_id: Option<&str>,
        session_overrides: &[CleanupShield],
    ) -> Result<CleanupDetectionResult, CleanupEngineError>;
    
    /// Save vendor cleanup rules
    fn save_vendor_rules(
        &self,
        vendor_id: &str,
        rules: &[CleanupShield],
    ) -> Result<(), CleanupEngineError>;
    
    /// Save template cleanup rules
    fn save_template_rules(
        &self,
        template_id: &str,
        vendor_id: &str,
        rules: &[CleanupShield],
    ) -> Result<(), CleanupEngineError>;
    
    /// Get vendor cleanup rules
    fn get_vendor_rules(&self, vendor_id: &str) -> Result<Vec<CleanupShield>, CleanupEngineError>;
    
    /// Get template cleanup rules
    fn get_template_rules(&self, template_id: &str) -> Result<Vec<CleanupShield>, CleanupEngineError>;
    
    /// Render shield overlay on image
    fn render_overlay(
        &self,
        image_path: &Path,
        shields: &[CleanupShield],
        output_path: &Path,
        include_legend: bool,
    ) -> Result<(), CleanupEngineError>;
}
```

### Backward Compatibility Wrapper

```rust
// In mask_engine.rs - preserved for backward compatibility

pub use crate::services::cleanup_engine::{
    CleanupShield as Mask,
    ShieldType as MaskType,
    CleanupEngine as MaskEngine,
    CleanupEngineConfig as MaskEngineConfig,
    CleanupDetectionResult as MaskDetectionResult,
    CleanupEngineError as MaskEngineError,
};

// Re-export with old names for existing code
impl MaskEngine {
    #[deprecated(since = "4.0.0", note = "Use add_user_shield instead")]
    pub fn add_user_mask(
        &self,
        bbox: BoundingBox,
        user_id: &str,
        reason: Option<String>,
    ) -> Result<Mask, MaskEngineError> {
        let normalized = self.normalize_bbox(&bbox);
        self.add_user_shield(
            normalized,
            user_id,
            reason,
            PageTarget::All,
            ZoneTarget::default(),
        )
    }
    
    #[deprecated(since = "4.0.0", note = "Use auto_detect_shields instead")]
    pub fn auto_detect_masks(
        &self,
        image_path: &Path,
    ) -> Result<MaskDetectionResult, MaskEngineError> {
        self.auto_detect_shields(image_path)
    }
}
```

### API Endpoints

```rust
// New cleanup endpoints
POST /api/cleanup/detect                              // Auto-detect shields
POST /api/cleanup/resolve                             // Resolve shields with precedence (for Review UI)
GET  /api/cleanup/vendors/{vendor_id}/rules           // Get vendor rules
PUT  /api/cleanup/vendors/{vendor_id}/rules           // Save vendor rules
GET  /api/cleanup/templates/{template_id}/rules       // Get template rules
PUT  /api/cleanup/templates/{template_id}/rules       // Save template rules
POST /api/cleanup/render-overlay                      // Render overlay image
POST /api/review/{case_id}/cleanup-snapshot           // Save resolved shields snapshot

// Backward-compatible mask endpoints (proxy to cleanup)
POST /api/masks/detect          → /api/cleanup/detect
GET  /api/masks/vendor/{id}     → /api/cleanup/vendors/{id}/rules
PUT  /api/masks/vendor/{id}     → /api/cleanup/vendors/{id}/rules
```

### Resolve Endpoint Contract

The `/api/cleanup/resolve` endpoint is critical for the Review UI - it handles precedence resolution so the frontend doesn't need to re-implement it:

```rust
/// Request for shield resolution
#[derive(Debug, Deserialize)]
pub struct ResolveRequest {
    /// Required: review case or document ID (server resolves file path internally)
    pub review_case_id: Option<String>,
    pub document_id: Option<String>,
    /// Optional: specific pages to resolve (default: all pages)
    pub pages: Option<Vec<u32>>,
    /// Optional: vendor/template context
    pub vendor_id: Option<String>,
    pub template_id: Option<String>,
    /// Session-only overrides
    pub session_overrides: Vec<CleanupShield>,
}

/// Response with resolved shields
#[derive(Debug, Serialize)]
pub struct ResolveResponse {
    pub resolved_shields: Vec<CleanupShield>,
    pub warnings: Vec<String>,
    pub precedence_explanations: Vec<PrecedenceExplanation>,
    pub critical_zone_conflicts: Vec<ZoneConflict>,
}

#[derive(Debug, Serialize)]
pub struct PrecedenceExplanation {
    pub shield_id: String,
    pub winning_source: ShieldSource,
    pub overridden_sources: Vec<ShieldSource>,
    pub reason: String,
}

#[derive(Debug, Serialize)]
pub struct ZoneConflict {
    pub shield_id: String,
    pub zone_id: String,
    pub overlap_ratio: f64,
    pub action_taken: String,  // "downgraded_to_suggested", "warning_added"
}
```

**Security Note**: The server resolves file paths internally from document_id/review_case_id. Raw `image_path` is only available in dev mode behind a feature flag.

## Data Models

### Database Schema

All tables include `tenant_id` and `store_id` for multi-tenant isolation per EasySale requirements.

```sql
-- Vendor cleanup rules
CREATE TABLE vendor_cleanup_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    doc_type TEXT,  -- invoice, statement, bill, packing_slip
    rules_json TEXT NOT NULL,  -- JSON array of CleanupShield
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    archived_at TEXT,  -- NULL = active, timestamp = archived (NO DELETES)
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    created_by TEXT,
    UNIQUE(tenant_id, store_id, vendor_id, doc_type)
);

CREATE INDEX idx_vendor_cleanup_tenant ON vendor_cleanup_rules(tenant_id);
CREATE INDEX idx_vendor_cleanup_store ON vendor_cleanup_rules(tenant_id, store_id);
CREATE INDEX idx_vendor_cleanup_vendor ON vendor_cleanup_rules(vendor_id);

-- Template cleanup rules
CREATE TABLE template_cleanup_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    vendor_id TEXT NOT NULL,
    doc_type TEXT,
    rules_json TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    archived_at TEXT,  -- NULL = active, timestamp = archived (NO DELETES)
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    created_by TEXT,
    UNIQUE(tenant_id, store_id, template_id, doc_type)  -- doc_type included for specificity
);

CREATE INDEX idx_template_cleanup_tenant ON template_cleanup_rules(tenant_id);
CREATE INDEX idx_template_cleanup_store ON template_cleanup_rules(tenant_id, store_id);
CREATE INDEX idx_template_cleanup_template ON template_cleanup_rules(template_id);
CREATE INDEX idx_template_cleanup_vendor ON template_cleanup_rules(vendor_id);

-- Cleanup audit log (NO DELETES - action is never 'delete')
CREATE TABLE cleanup_audit_log (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,  -- 'vendor' or 'template'
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'create', 'update', 'disable', 'archive', 'supersede'
    diff_json TEXT,  -- JSON diff of changes
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_cleanup_audit_tenant ON cleanup_audit_log(tenant_id);
CREATE INDEX idx_cleanup_audit_entity ON cleanup_audit_log(entity_type, entity_id);
CREATE INDEX idx_cleanup_audit_user ON cleanup_audit_log(user_id);
CREATE INDEX idx_cleanup_audit_time ON cleanup_audit_log(created_at);

-- Review case shield snapshots (links to existing review_cases)
CREATE TABLE review_case_shields (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    store_id TEXT NOT NULL,
    review_case_id TEXT NOT NULL,
    resolved_shields_json TEXT NOT NULL,  -- Snapshot of shields used
    overlay_artifact_path TEXT,  -- Optional path to rendered overlay
    created_at TEXT NOT NULL,
    FOREIGN KEY (review_case_id) REFERENCES review_cases(id)
);

CREATE INDEX idx_review_shields_tenant ON review_case_shields(tenant_id);
CREATE INDEX idx_review_shields_case ON review_case_shields(review_case_id);
```

### Zone Overlap Policy

Critical zone protection requires deterministic overlap calculation:

```rust
/// Zone IDs (stable strings)
pub const ZONE_LINE_ITEMS: &str = "LineItems";
pub const ZONE_TOTALS: &str = "Totals";
pub const ZONE_HEADER: &str = "Header";
pub const ZONE_FOOTER: &str = "Footer";
pub const ZONE_BARCODE: &str = "Barcode";
pub const ZONE_LOGO: &str = "Logo";

/// Overlap thresholds
pub const CRITICAL_OVERLAP_WARN: f64 = 0.05;      // 5% overlap triggers warning
pub const CRITICAL_OVERLAP_BLOCK_APPLY: f64 = 0.10;  // 10% overlap forces Suggested

/// De-duplication threshold
pub const SHIELD_DEDUP_IOU_THRESHOLD: f64 = 0.85;  // IoU >= 0.85 = same shield

/// Calculate intersection area of two bboxes
pub fn bbox_intersection_area(a: &NormalizedBBox, b: &NormalizedBBox) -> f64 {
    let x_overlap = (a.x + a.width).min(b.x + b.width) - a.x.max(b.x);
    let y_overlap = (a.y + a.height).min(b.y + b.height) - a.y.max(b.y);
    if x_overlap <= 0.0 || y_overlap <= 0.0 {
        return 0.0;
    }
    x_overlap * y_overlap
}

/// Calculate Intersection over Union (IoU) for de-duplication
pub fn bbox_iou(a: &NormalizedBBox, b: &NormalizedBBox) -> f64 {
    let intersection = bbox_intersection_area(a, b);
    let area_a = a.width * a.height;
    let area_b = b.width * b.height;
    let union = area_a + area_b - intersection;
    if union == 0.0 {
        return 0.0;
    }
    intersection / union
}

/// Calculate overlap ratio: intersection_area / shield_area
pub fn calculate_overlap_ratio(shield: &NormalizedBBox, zone: &NormalizedBBox) -> f64 {
    let intersection = bbox_intersection_area(shield, zone);
    let shield_area = shield.width * shield.height;
    if shield_area == 0.0 {
        return 0.0;
    }
    intersection / shield_area
}
```

### Versioning and Update Behavior (NO DELETES)

Updates to cleanup rules follow a versioned insert+archive pattern:

```rust
/// Update behavior for cleanup rules
/// 1. Insert new row with version = prev_version + 1
/// 2. Set old row: archived_at = now(), enabled = false
/// 3. Audit log records 'supersede' with before/after snapshot IDs
pub async fn update_vendor_rules(
    &self,
    tenant_id: &str,
    store_id: &str,
    vendor_id: &str,
    doc_type: Option<&str>,
    new_rules: &[CleanupShield],
    user_id: &str,
) -> Result<(), CleanupEngineError> {
    // 1. Find current active rule
    let current = self.get_active_vendor_rule(tenant_id, store_id, vendor_id, doc_type).await?;
    
    // 2. Archive current (if exists)
    if let Some(current_rule) = &current {
        self.archive_rule(&current_rule.id).await?;
    }
    
    // 3. Insert new version
    let new_version = current.map(|r| r.version + 1).unwrap_or(1);
    let new_id = uuid::Uuid::new_v4().to_string();
    self.insert_vendor_rule(
        &new_id, tenant_id, store_id, vendor_id, doc_type, new_rules, new_version, user_id
    ).await?;
    
    // 4. Audit log
    self.log_audit(
        tenant_id, store_id, "vendor", vendor_id,
        "supersede",
        current.as_ref().map(|r| &r.id),
        Some(&new_id),
        user_id,
    ).await?;
    
    Ok(())
}
```

### Precedence Merge Rules

When resolving shields from multiple sources:

1. **De-duplication**: If two shields have same `shield_type` AND `IoU >= 0.85`, treat as "same shield"
   - Winner is determined by source precedence (Session > Template > Vendor > Auto)
   - Winner's fields override loser's fields

2. **Non-duplicate shields**: Keep both, sorted by:
   - Source (descending: Session=3, Template=2, Vendor=1, Auto=0)
   - Confidence (descending)

3. **Critical zone policy**: After merge, apply overlap checks:
   - If shield overlaps critical zone >= 10%: force `apply_mode = Suggested`, `risk_level = High`
   - If shield overlaps critical zone >= 5%: add warning

```rust
pub fn merge_shields(
    auto_shields: Vec<CleanupShield>,
    vendor_shields: Vec<CleanupShield>,
    template_shields: Vec<CleanupShield>,
    session_shields: Vec<CleanupShield>,
    critical_zones: &[NormalizedBBox],
) -> (Vec<CleanupShield>, Vec<PrecedenceExplanation>) {
    // Implementation follows the rules above
}
```

### Shield Region JSON Schema

The JSON schema for `CleanupShield` (used in `rules_json` columns):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "CleanupShield",
  "type": "object",
  "required": ["id", "shield_type", "normalized_bbox", "page_target", "apply_mode", "confidence", "why_detected", "provenance"],
  "properties": {
    "id": { "type": "string", "format": "uuid" },
    "shield_type": {
      "type": "string",
      "enum": ["Logo", "Watermark", "RepetitiveHeader", "RepetitiveFooter", "Stamp", "UserDefined", "VendorSpecific", "TemplateSpecific"]
    },
    "normalized_bbox": {
      "type": "object",
      "required": ["x", "y", "width", "height"],
      "properties": {
        "x": { "type": "number", "minimum": 0, "maximum": 1 },
        "y": { "type": "number", "minimum": 0, "maximum": 1 },
        "width": { "type": "number", "minimum": 0, "maximum": 1 },
        "height": { "type": "number", "minimum": 0, "maximum": 1 }
      }
    },
    "page_target": {
      "oneOf": [
        { "type": "string", "enum": ["All", "First", "Last"] },
        { "type": "object", "properties": { "Specific": { "type": "array", "items": { "type": "integer" } } } }
      ]
    },
    "zone_target": {
      "type": "object",
      "properties": {
        "include_zones": { "type": ["array", "null"], "items": { "type": "string" } },
        "exclude_zones": { "type": "array", "items": { "type": "string" } }
      }
    },
    "apply_mode": { "type": "string", "enum": ["Applied", "Suggested", "Disabled"] },
    "risk_level": { "type": "string", "enum": ["Low", "Medium", "High"] },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "min_confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "why_detected": { "type": "string" },
    "provenance": {
      "type": "object",
      "required": ["source", "created_at"],
      "properties": {
        "source": { "type": "string", "enum": ["AutoDetected", "VendorRule", "TemplateRule", "SessionOverride"] },
        "user_id": { "type": ["string", "null"] },
        "vendor_id": { "type": ["string", "null"] },
        "template_id": { "type": ["string", "null"] },
        "created_at": { "type": "string", "format": "date-time" },
        "updated_at": { "type": ["string", "null"], "format": "date-time" }
      }
    }
  }
}
```

### Overlay Color Scheme

Colors are defined as theme tokens (not hardcoded hex) for consistency with EasySale theming:

| Shield Type | Token | Default Color |
|-------------|-------|---------------|
| Logo | `cleanup.logo` | Blue |
| Watermark | `cleanup.watermark` | Yellow |
| RepetitiveHeader | `cleanup.header` | Gray |
| RepetitiveFooter | `cleanup.footer` | Gray |
| Stamp | `cleanup.stamp` | Orange |
| UserDefined | `cleanup.user` | Green |
| VendorSpecific | `cleanup.vendor` | Purple |
| TemplateSpecific | `cleanup.template` | Cyan |

Token definitions in `frontend/src/styles/tokens.css`:
```css
:root {
  --cleanup-logo: rgba(59, 130, 246, 0.5);
  --cleanup-watermark: rgba(234, 179, 8, 0.5);
  --cleanup-header: rgba(107, 114, 128, 0.5);
  --cleanup-footer: rgba(107, 114, 128, 0.5);
  --cleanup-stamp: rgba(249, 115, 22, 0.5);
  --cleanup-user: rgba(34, 197, 94, 0.5);
  --cleanup-vendor: rgba(168, 85, 247, 0.5);
  --cleanup-template: rgba(6, 182, 212, 0.5);
}

/* Dark mode overrides - higher contrast for visibility */
:root.dark, [data-theme="dark"] {
  --cleanup-logo: rgba(96, 165, 250, 0.6);
  --cleanup-watermark: rgba(250, 204, 21, 0.6);
  --cleanup-header: rgba(156, 163, 175, 0.6);
  --cleanup-footer: rgba(156, 163, 175, 0.6);
  --cleanup-stamp: rgba(251, 146, 60, 0.6);
  --cleanup-user: rgba(74, 222, 128, 0.6);
  --cleanup-vendor: rgba(192, 132, 252, 0.6);
  --cleanup-template: rgba(34, 211, 238, 0.6);
}
```

## Review Workspace Integration

The Document Cleanup Engine integrates with the Review Workspace UI:

### Review Workspace Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Review Workspace                                 │
├─────────────────────────────┬───────────────────────────────────────────┤
│                             │  Tabs: [Summary] [Cleanup] [Extraction]   │
│   Document Viewer           │                                           │
│   ┌───────────────────────┐ │  Cleanup Shield Editor:                   │
│   │                       │ │  ┌─────────────────────────────────────┐  │
│   │   PDF/Image           │ │  │ Shield List                         │  │
│   │   with overlays:      │ │  │ ├─ Logo (Applied) 85% conf          │  │
│   │   - Zones             │ │  │ ├─ Watermark (Suggested) 65% conf   │  │
│   │   - Cleanup Shields   │ │  │ └─ Header (Disabled)                │  │
│   │                       │ │  └─────────────────────────────────────┘  │
│   │   [Zoom] [Rotate]     │ │                                           │
│   │   [Toggle Overlays]   │ │  [Draw New Shield] [Snap to Margins]      │
│   └───────────────────────┘ │                                           │
│                             │  Scope: [This Page ▼] [All Zones ▼]       │
│   Page: [1] of 3            │                                           │
│                             │  Save As:                                 │
│                             │  [Vendor Rule] [Template Rule] [Session]  │
└─────────────────────────────┴───────────────────────────────────────────┘
```

### Shield Editor Features

1. **Shield List**: Shows all detected/applied shields with type, apply mode, confidence
2. **Draw Tool**: User can draw new shield regions on the document
3. **Snap Helpers**: Snap to margins, detected repetitive strips, page bounds
4. **Scope Controls**: Page targeting (This Page/All/First/Last) and zone targeting
5. **Save Options**: Save as Vendor Rule, Template Rule, or Session-only

### Cleanup Tab Must-Have Behaviors

1. **Toggle Views**:
   - "Show shields (resolved)" - shows final applied shields after precedence
   - "Show suggestions (auto)" - shows all auto-detected suggestions

2. **Per-Shield Quick Actions**:
   - Apply / Suggest / Disable toggle
   - Scope: This page / All pages / First / Last / Pages: [..]
   - Zone target dropdown: All zones / Exclude critical / Custom

3. **Save As Buttons**:
   - "Save as Vendor Rule" (default) - applies to all future docs from this vendor
   - "Save as Template Rule" - for doc-type specific rules
   - "Session Only" - does not persist

### Template Builder Integration

The Template Builder must support:
- Save template cleanup rules + zone definitions together
- Preview extraction with template applied (one-click re-run)
- Promote shields from review case to template



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Backward Compatibility Alias

*For any* valid `CleanupShield` instance, using it through the `Mask` type alias should produce identical behavior, and all fields should be accessible with the same values.

**Validates: Requirements 1.6**

### Property 2: Safe Type Casting

*For any* f32 value representing image dimensions, converting to u32 using saturating conversion should never panic and should produce a valid u32 (saturating at u32::MAX for values > u32::MAX). *For any* u128 millisecond value, converting to u64 should saturate at u64::MAX without panic.

**Validates: Requirements 2.1, 2.2**

### Property 3: Bounding Box Validation

*For any* bounding box submitted to `add_user_shield`, if the normalized coordinates are within [0.0, 1.0] and width/height are positive, the operation should succeed. If coordinates are outside [0.0, 1.0] or dimensions are zero/negative, the operation should return an error.

**Validates: Requirements 3.2**

### Property 4: Normalized BBox Validation

*For any* `NormalizedBBox` with x, y, width, height all in range [0.0, 1.0], the bbox should be considered valid. *For any* bbox with values outside this range, validation should fail.

**Validates: Requirements 4.1**

### Property 5: CleanupShield Serialization Round-Trip

*For any* valid `CleanupShield` instance with all fields populated (including PageTarget, ApplyMode, RiskLevel, why_detected, and provenance), serializing to JSON and deserializing back should produce an equivalent CleanupShield with all fields preserved.

**Validates: Requirements 4.2, 4.4, 4.5, 4.6, 4.7**

### Property 6: Zone Target Filtering

*For any* `ZoneTarget` configuration and *for any* list of zone names, applying the filter should:
- Include all zones if `include_zones` is None
- Include only zones in `include_zones` if specified
- Exclude all zones in `exclude_zones`
- The result should be deterministic and consistent.

**Validates: Requirements 4.3**

### Property 7: Precedence Resolution

*For any* set of shields from different sources (AutoDetected, VendorRule, TemplateRule, SessionOverride), when resolved:
- SessionOverride shields should take precedence over all others
- TemplateRule shields should take precedence over VendorRule and AutoDetected
- VendorRule shields should take precedence over AutoDetected
- Each resolved shield's `provenance.source` should correctly indicate the winning source

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 8: Critical Zone Protection

*For any* auto-detected shield that overlaps with LineItems or Totals zones, the shield should have `apply_mode = Suggested` and `risk_level = High`. *For any* template or vendor shield overlapping critical zones without explicit zone-scoping, a warning should be generated.

**Validates: Requirements 6.1, 6.2**

### Property 9: Multi-Page Detection Confidence Boost

*For any* multi-page document where the same region appears identically across N pages (N > 1), the confidence score for that region's shield should be higher than the confidence for a single-page detection of the same region.

**Validates: Requirements 7.1, 7.2**

### Property 10: Rule Persistence Round-Trip

*For any* set of vendor cleanup rules saved via `save_vendor_rules`, retrieving them via `get_vendor_rules` should return equivalent rules. *For any* set of template cleanup rules saved via `save_template_rules`, retrieving them via `get_template_rules` should return equivalent rules. *For any* rule change, an audit log entry should be created with the correct entity_type, entity_id, and action.

**Validates: Requirements 9.1, 9.2, 9.3, 9.5**

### Property 11: Overlay Rendering Correctness

*For any* image and set of shields, the rendered overlay should:
- Contain semi-transparent colored pixels within each shield's bounding box
- Use distinct colors for different shield types (no two types share the same color)
- Include border pixels at the edges of each shield's bounding box
- Show zone boundaries when zones are provided
- Highlight intersections where shields overlap critical zones

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

### Property 12: Backward Compatible API

*For any* request to `/api/masks/*` endpoints, the response should be equivalent to the corresponding `/api/cleanup/*` endpoint with terminology translated (Mask ↔ CleanupShield, MaskType ↔ ShieldType). The translation should be bidirectional and lossless.

**Validates: Requirements 11.2, 11.3**

### Property 13: Outcome Tracking

*For any* review outcome (edits made, confidence changes), the metrics should be recorded and associated with the correct vendor/template. *For any* vendor with recorded outcomes, threshold adjustments should be retrievable and applicable.

**Validates: Requirements 12.1, 12.2, 12.3**

### Property 14: Fail-Open Behavior

*For any* detection operation that fails or returns empty results, the engine should:
- Return a valid `ShieldDetectionResult` with empty shields (not an error)
- Log the failure for debugging
- Allow downstream OCR processing to proceed
- *For any* auto-detected shield, `apply_mode` should default to `Suggested` unless confidence >= min_auto_confidence AND risk_level == Low

**Validates: Requirements 13.1, 13.2, 13.3**

## Error Handling

### Error Types

```rust
#[derive(Debug, Error)]
pub enum CleanupEngineError {
    #[error("Failed to load image: {0}")]
    ImageLoadError(String),
    
    #[error("Failed to process image: {0}")]
    ProcessingError(String),
    
    #[error("Invalid shield region: {0}")]
    InvalidShieldError(String),
    
    #[error("Invalid normalized coordinates: {field} = {value} (must be 0.0-1.0)")]
    InvalidNormalizedCoord { field: String, value: f64 },
    
    #[error("Database error: {0}")]
    DatabaseError(String),
    
    #[error("Serialization error: {0}")]
    SerializationError(String),
    
    #[error("Vendor not found: {0}")]
    VendorNotFound(String),
    
    #[error("Template not found: {0}")]
    TemplateNotFound(String),
}
```

### Error Recovery Strategy

| Error Type | Recovery Action |
|------------|-----------------|
| ImageLoadError | Return empty shields, log warning, allow OCR to proceed |
| ProcessingError | Return partial results if available, log error |
| InvalidShieldError | Reject the specific shield, continue with others |
| InvalidNormalizedCoord | Return validation error to caller |
| DatabaseError | Fall back to in-memory storage, log warning |
| SerializationError | Log error, skip the malformed record |
| VendorNotFound | Return empty rules, log info |
| TemplateNotFound | Return empty rules, log info |

### Fail-Open Implementation

```rust
impl CleanupEngine {
    pub fn auto_detect_shields_safe(
        &self,
        image_path: &Path,
    ) -> CleanupDetectionResult {
        match self.auto_detect_shields(image_path) {
            Ok(result) => result,
            Err(e) => {
                tracing::warn!("Shield detection failed, proceeding without shields: {}", e);
                CleanupDetectionResult {
                    shields: vec![],
                    processing_time_ms: 0,
                    auto_detected_count: 0,
                    rule_applied_count: 0,
                    warnings: vec![format!("Detection failed: {}", e)],
                }
            }
        }
    }
}
```

## Testing Strategy

### Dual Testing Approach

The Document Cleanup Engine requires both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across randomly generated inputs

### Property-Based Testing Configuration

- **Library**: `proptest` (Rust PBT library)
- **Minimum iterations**: 100 per property test
- **Tag format**: `Feature: cleanup-engine, Property {N}: {property_text}`

### Test Categories

#### Unit Tests (Examples & Edge Cases)
- Empty image handling
- Zero-dimension bounding boxes
- Database connection failures
- Malformed JSON in rules
- Boundary conditions for normalized coordinates (exactly 0.0, exactly 1.0)

#### Property Tests
- CleanupShield serialization round-trip (Property 5)
- Precedence resolution ordering (Property 7)
- Rule persistence round-trip (Property 10)
- Backward compatibility translation (Property 12)
- Fail-open behavior (Property 14)

### Test File Structure

```
backend/crates/server/src/services/cleanup_engine/
├── tests/
│   ├── mod.rs
│   ├── unit_tests.rs           # Example-based tests
│   ├── property_tests.rs       # Property-based tests
│   └── integration_tests.rs    # Database integration tests
```

### Property Test Example

```rust
use proptest::prelude::*;

proptest! {
    #![proptest_config(ProptestConfig::with_cases(100))]
    
    // Feature: cleanup-engine, Property 5: CleanupShield serialization round-trip
    #[test]
    fn cleanup_shield_roundtrip(shield in arb_cleanup_shield()) {
        let json = serde_json::to_string(&shield).unwrap();
        let deserialized: CleanupShield = serde_json::from_str(&json).unwrap();
        prop_assert_eq!(shield.id, deserialized.id);
        prop_assert_eq!(shield.shield_type, deserialized.shield_type);
        prop_assert!((shield.confidence - deserialized.confidence).abs() < f64::EPSILON);
    }
}

fn arb_cleanup_shield() -> impl Strategy<Value = CleanupShield> {
    (
        "[a-z0-9-]{36}",  // UUID-like id
        prop_oneof![
            Just(ShieldType::Logo),
            Just(ShieldType::Watermark),
            Just(ShieldType::RepetitiveHeader),
            Just(ShieldType::RepetitiveFooter),
            Just(ShieldType::UserDefined),
        ],
        arb_normalized_bbox(),
        arb_page_target(),
        0.0..=1.0f64,  // confidence
        ".*",  // why_detected
    ).prop_map(|(id, shield_type, bbox, page_target, confidence, why_detected)| {
        CleanupShield {
            id,
            shield_type,
            normalized_bbox: bbox,
            page_target,
            zone_target: ZoneTarget::default(),
            apply_mode: ApplyMode::Suggested,
            risk_level: RiskLevel::Low,
            confidence,
            min_confidence: 0.6,
            why_detected,
            provenance: ShieldProvenance {
                source: ShieldSource::AutoDetected,
                user_id: None,
                vendor_id: None,
                template_id: None,
                created_at: chrono::Utc::now(),
                updated_at: None,
            },
        }
    })
}
```

### Existing Frontend Components

**Implementation Note**: The implementation must scan the repo and map existing review/editor components. Only rename if the file exists. If not, create new under the repo's established feature folder structure.

Expected components to integrate (verify existence before modifying):

| Component | Expected Path | Integration Point |
|-----------|---------------|-------------------|
| MaskTool | `frontend/src/components/review/MaskTool.tsx` | Rename to CleanupShieldTool, use new API |
| ZoneEditor | `frontend/src/components/review/ZoneEditor.tsx` | Add zone overlap warnings |
| RegionSelector | `frontend/src/components/review/RegionSelector.tsx` | Use normalized coordinates |
| ReviewQueue | `frontend/src/components/review/ReviewQueue.tsx` | Add cleanup status column |

**Discovery command** (run before implementation):
```bash
# Find all mask/cleanup related components
find frontend/src -name "*.tsx" -exec grep -l -i "mask\|cleanup\|shield\|zone" {} \;
```

### Shared Helpers

```rust
// In types.rs - shared normalization helper
impl CleanupEngine {
    /// Normalize pixel-based BoundingBox to NormalizedBBox (0.0-1.0)
    pub fn normalize_bbox(&self, bbox: &BoundingBox, image_width: u32, image_height: u32) -> NormalizedBBox {
        NormalizedBBox {
            x: f64::from(bbox.x) / f64::from(image_width),
            y: f64::from(bbox.y) / f64::from(image_height),
            width: f64::from(bbox.width) / f64::from(image_width),
            height: f64::from(bbox.height) / f64::from(image_height),
        }
    }
    
    /// Convert NormalizedBBox back to pixel-based BoundingBox
    pub fn denormalize_bbox(&self, bbox: &NormalizedBBox, image_width: u32, image_height: u32) -> BoundingBox {
        BoundingBox {
            x: (bbox.x * f64::from(image_width)).round() as u32,
            y: (bbox.y * f64::from(image_height)).round() as u32,
            width: (bbox.width * f64::from(image_width)).round() as u32,
            height: (bbox.height * f64::from(image_height)).round() as u32,
        }
    }
}
```
