# Document Cleanup Engine (formerly Mask Engine)

## Overview

The Document Cleanup Engine (DCE) provides automatic noise region detection and user-defined cleanup shields for document OCR processing. It supports vendor-specific and template-specific rule persistence with multi-tenant isolation.

**Terminology Change (v4.0)**: "Mask" → "Cleanup Shield" (user-facing). The term "mask" sounds destructive; "Cleanup Shield" communicates "exclude noisy regions from OCR/extraction" with rules, precedence, and review workflow.

## Key Design Principles

- **Fail-open**: Detection failures never block OCR processing
- **Zone-targeted**: Shields can target specific document zones
- **Resolution-independent**: Normalized coordinates (0.0-1.0) for portability
- **Backward-compatible**: Old API preserved via thin wrappers (NO DELETES policy)
- **Precedence-based**: Clear hierarchy of Session → Template → Vendor → Auto rules
- **Multi-tenant**: All operations scoped by tenant_id and store_id

## Migration from Mask Engine (v3.x)

### Backward Compatibility

The old `MaskEngine` API is preserved as a compatibility wrapper. All existing code continues to work:

```rust
// Old API (deprecated but still works)
use crate::services::mask_engine::{MaskEngine, Mask, MaskType};

// New API (recommended)
use crate::services::cleanup_engine::{CleanupEngine, CleanupShield, ShieldType};
```

### Type Aliases

| Old Name (v3.x) | New Name (v4.0) |
|-----------------|-----------------|
| `Mask` | `CleanupShield` |
| `MaskType` | `ShieldType` |
| `MaskEngine` | `CleanupEngine` |
| `MaskEngineConfig` | `CleanupEngineConfig` |
| `MaskDetectionResult` | `CleanupDetectionResult` |
| `MaskEngineError` | `CleanupEngineError` |

### API Endpoints

| Old Endpoint | New Endpoint |
|--------------|--------------|
| `POST /api/masks/detect` | `POST /api/cleanup/detect` |
| `GET /api/masks/vendor/{id}` | `GET /api/cleanup/vendors/{id}/rules` |
| `PUT /api/masks/vendor/{id}` | `PUT /api/cleanup/vendors/{id}/rules` |

The old endpoints are preserved as proxies to the new endpoints.


## Features

### Auto-Detection
- **Logo Detection**: Identifies logos in top corners (20% width, 15% height regions)
- **Watermark Detection**: Detects semi-transparent watermarks in center regions
- **Repetitive Headers/Footers**: Identifies page numbers, taglines, and other repetitive content
- **Multi-Page Detection**: Boosts confidence for patterns that appear consistently across pages

### User-Defined Shields
- Manual shield creation with normalized bounding boxes
- Full confidence (1.0) for user-defined shields
- Audit trail with user ID and reason
- Page targeting (All, First, Last, Specific pages)
- Zone targeting (include/exclude specific zones)

### Rule Persistence (Multi-Tenant)
- **Vendor Rules**: Save shields for specific vendors
- **Template Rules**: Save shields for document templates
- **Session Overrides**: Temporary shields for current session only
- **Versioned Updates**: NO DELETES policy - old rules archived, not deleted
- **Audit Logging**: All changes tracked with user ID and timestamp

### Precedence Resolution
Shields are resolved in order of precedence:
1. **Session Override** (highest) - User's current session adjustments
2. **Template Rule** - Document template-specific rules
3. **Vendor Rule** - Vendor-specific rules
4. **Auto-Detected** (lowest) - Automatically detected shields

## Usage

### Basic Auto-Detection

```rust
use crate::services::cleanup_engine::{CleanupEngine, CleanupShield};
use std::path::Path;

// Create cleanup engine
let engine = CleanupEngine::new();

// Auto-detect shields (fail-open - never panics)
let result = engine.auto_detect_shields_safe(Path::new("invoice.jpg"));

println!("Found {} auto-detected shields", result.auto_detected_count);
for shield in &result.shields {
    println!("  - {:?} at ({:.2}, {:.2}) with confidence {:.2}", 
        shield.shield_type, 
        shield.normalized_bbox.x, 
        shield.normalized_bbox.y, 
        shield.confidence);
}
```

### User-Defined Shields

```rust
use crate::services::cleanup_engine::{
    CleanupShield, NormalizedBBox, ShieldType, PageTarget, ZoneTarget
};

// Create a user-defined shield with normalized coordinates
let shield = CleanupShield::user_defined(
    NormalizedBBox::new(0.1, 0.1, 0.2, 0.15),
    "user123",
    Some("Blocking vendor logo".to_string()),
    PageTarget::All,
    ZoneTarget::default(),
);
```

### Persistence with Multi-Tenant Isolation

```rust
use crate::services::cleanup_engine::CleanupPersistence;
use sqlx::SqlitePool;

// Create persistence service
let persistence = CleanupPersistence::new(pool);

// Save vendor rules (tenant/store scoped)
persistence.save_vendor_rules(
    "tenant-123",
    "store-456",
    "vendor-abc",
    None,  // doc_type
    &shields,
    "user123",
).await?;

// Get vendor rules
let rules = persistence.get_vendor_rules(
    "tenant-123",
    "store-456",
    "vendor-abc",
    None,
).await?;
```

### Precedence Resolution

```rust
use crate::services::cleanup_engine::merge_shields;

// Merge shields from all sources with precedence
let result = merge_shields(
    auto_shields,      // Auto-detected
    vendor_shields,    // From vendor rules
    template_shields,  // From template rules
    session_shields,   // Session overrides
    &critical_zones,   // Zones that trigger risk elevation
);

// Result contains:
// - resolved_shields: Final shields after precedence resolution
// - explanations: Why each shield won/lost
// - zone_conflicts: Critical zone overlap warnings
// - warnings: Any issues encountered
```


## Shield Types

### ShieldType Enum

- **Logo**: Auto-detected logo regions (top corners)
- **Watermark**: Auto-detected watermarks (center region)
- **RepetitiveHeader**: Page numbers, headers
- **RepetitiveFooter**: Company taglines, footers
- **Stamp**: Date stamps, approval stamps
- **UserDefined**: Manually created shields
- **VendorSpecific**: Saved for specific vendors
- **TemplateSpecific**: Saved for document templates

### ApplyMode Enum

- **Applied**: Shield is active and will be used
- **Suggested**: Shield is recommended but not active (default for auto-detected)
- **Disabled**: Shield is explicitly disabled

### RiskLevel Enum

- **Low**: Safe to apply automatically
- **Medium**: Review recommended
- **High**: Overlaps critical zone, requires explicit approval

## Critical Zone Protection

Shields that overlap critical zones (LineItems, Totals) are automatically:
- Downgraded to `Suggested` mode (not auto-applied)
- Elevated to `High` risk level
- Flagged with zone conflict warnings

```rust
// Zone overlap thresholds
const CRITICAL_OVERLAP_WARN: f64 = 0.05;      // 5% overlap triggers warning
const CRITICAL_OVERLAP_BLOCK_APPLY: f64 = 0.10;  // 10% overlap forces Suggested
```

## API Reference

### REST Endpoints

#### Detection
- `POST /api/cleanup/detect` - Auto-detect shields in a document
- `POST /api/cleanup/resolve` - Resolve shields with precedence

#### Vendor Rules
- `GET /api/cleanup/vendors/{vendor_id}/rules` - Get vendor rules
- `PUT /api/cleanup/vendors/{vendor_id}/rules` - Save vendor rules

#### Template Rules
- `GET /api/cleanup/templates/{template_id}/rules` - Get template rules
- `PUT /api/cleanup/templates/{template_id}/rules` - Save template rules

#### Review Integration
- `POST /api/cleanup/render-overlay` - Render shield overlay
- `POST /api/review/{case_id}/cleanup-snapshot` - Save shields snapshot

### Backward-Compatible Endpoints (Deprecated)
- `POST /api/masks/detect` → `/api/cleanup/detect`
- `GET /api/masks/vendor/{id}` → `/api/cleanup/vendors/{id}/rules`
- `PUT /api/masks/vendor/{id}` → `/api/cleanup/vendors/{id}/rules`

## Database Schema

### Tables

- `vendor_cleanup_rules` - Vendor-specific rules with versioning
- `template_cleanup_rules` - Template-specific rules with versioning
- `cleanup_audit_log` - Audit trail (NO DELETES)
- `review_case_shields` - Snapshots for review cases

All tables include `tenant_id` and `store_id` for multi-tenant isolation.

## Testing

Run tests with:

```bash
cargo test cleanup_engine
```

### Property-Based Tests

- **Property 1**: Backward Compatibility Alias
- **Property 2**: Safe Type Casting
- **Property 4**: Normalized BBox Validation
- **Property 7**: Precedence Resolution
- **Property 8**: Critical Zone Protection
- **Property 9**: Multi-Page Detection Confidence Boost
- **Property 10**: Rule Persistence Round-Trip
- **Property 12**: Backward Compatible API
- **Property 14**: Fail-Open Behavior

## Version History

- **v4.0** (January 2026): Document Cleanup Engine
  - Renamed to CleanupShield/CleanupEngine
  - Added multi-tenant isolation
  - Added precedence resolution
  - Added template rules
  - Added critical zone protection
  - Backward compatibility preserved

- **v3.0** (January 2026): Mask Engine
  - Initial implementation
  - Auto-detection
  - Vendor-specific masks

## Dependencies

- `image`: Image processing
- `serde`: Serialization
- `sqlx`: Database operations
- `thiserror`: Error handling
- `uuid`: Unique identifiers
- `chrono`: Timestamps
- `proptest`: Property-based testing
