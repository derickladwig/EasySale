# Requirements Document

## Introduction

This spec transforms the existing Mask Engine into the **Document Cleanup Engine (DCE)** - a comprehensive document cleanup system for EasySale. The rename reflects the actual purpose: shielding noisy regions from OCR to improve signal quality, not destructively masking content.

**Terminology Change**: "Mask" → "Cleanup Shield" (user-facing). The term "mask" sounds destructive; "Cleanup Shield" communicates "exclude noisy regions from OCR/extraction" with rules, precedence, and review workflow.

The system provides end-to-end document intake UX including vendor/template assignment, zone-targeted noise shielding, extraction preview, and integration with Inventory/AP workflows.

**Migration Policy**: NO DELETES. All existing code, endpoints, and database tables are preserved with compatibility wrappers. Old names become aliases to new implementations.

## Glossary

- **Cleanup_Engine**: The service responsible for detecting and managing cleanup shields in document images (formerly Mask Engine)
- **Cleanup_Shield**: A region to be shielded from OCR processing (formerly Mask)
- **Shield_Type**: Classification of shield regions: Logo, Watermark, RepetitiveHeader, RepetitiveFooter, UserDefined, VendorSpecific (formerly MaskType)
- **BoundingBox**: A rectangular region defined by x, y coordinates and width, height dimensions
- **Vendor_Rule**: Cleanup rules saved for a specific vendor that apply to all their documents
- **Template_Rule**: Cleanup rules saved for a document template
- **Session_Override**: Temporary shield adjustments for a single document review
- **Zone**: A detected document region: HeaderFields, TotalsBox, LineItemsTable, FooterNotes, Barcode/Logo areas
- **Cleanup_Studio**: The UI component for managing cleanup shields (formerly Mask Studio)
- **Review_Workspace**: The side-by-side UI for document review with viewer + editable form

## Requirements

### Requirement 1: Rename and Restructure Module

**User Story:** As a developer, I want the module renamed from Mask Engine to Document Cleanup Engine, so that the terminology reflects the actual purpose and is less confusing to users.

#### Acceptance Criteria

1. THE system SHALL create a new `cleanup_engine/` module directory with renamed types
2. THE system SHALL rename `Mask` to `CleanupShield` in the new module
3. THE system SHALL rename `MaskType` to `ShieldType` in the new module
4. THE system SHALL rename `MaskEngine` to `CleanupEngine` in the new module
5. THE existing `mask_engine.rs` SHALL become a thin wrapper that delegates to `cleanup_engine/`
6. THE existing `mask_engine.rs` SHALL re-export old type names as aliases for backward compatibility

### Requirement 2: Fix Type Casting and Code Quality

**User Story:** As a developer, I want the cleanup engine to use safe type conversions, so that the code compiles without clippy warnings and avoids potential overflow issues.

#### Acceptance Criteria

1. WHEN calculating bounding box dimensions from image dimensions, THE Cleanup_Engine SHALL use explicit safe casting with saturating conversions instead of `as` casts from f32 to u32
2. WHEN converting processing time from u128 milliseconds to u64, THE Cleanup_Engine SHALL use saturating conversion to prevent overflow
3. THE `new()` and `with_config()` methods SHALL have the `#[must_use]` attribute
4. WHEN a detection method cannot fail, THE Cleanup_Engine SHALL return the value directly instead of wrapping in `Result`
5. THE Cleanup_Engine SHALL have `# Errors` documentation on all methods returning `Result`

### Requirement 3: Fix API Consistency

**User Story:** As a developer, I want the cleanup engine API to be consistent, so that the documentation matches the actual implementation.

#### Acceptance Criteria

1. THE `add_user_shield` method (formerly `add_user_mask`) SHALL be an instance method taking `&self`
2. WHEN adding a user shield, THE Cleanup_Engine SHALL validate the bounding box against the current configuration
3. THE README SHALL accurately reflect the actual method signatures with new naming

### Requirement 4: Enhanced Shield Region Definition

**User Story:** As a system administrator, I want shield regions to support zone targeting and page selection, so that shields can be precisely applied.

#### Acceptance Criteria

1. WHEN defining a Cleanup_Shield, THE system SHALL support normalized bounding box coordinates (0.0 to 1.0) for resolution independence
2. WHEN defining a Cleanup_Shield, THE system SHALL support page targeting: all pages, first page only, last page only, or specific page numbers
3. WHEN defining a Cleanup_Shield, THE system SHALL support zone targeting: include or exclude specific zones (Header, Footer, LineItems, Totals)
4. WHEN defining a Cleanup_Shield, THE system SHALL support apply modes: Applied, Suggested, or Disabled
5. WHEN defining a Cleanup_Shield, THE system SHALL include risk level: Low, Medium, or High
6. WHEN defining a Cleanup_Shield, THE system SHALL include human-readable explanation (why_detected)
7. WHEN defining a Cleanup_Shield, THE system SHALL include provenance (user_id, created_at, vendor_id, template_id)

### Requirement 5: Shield Source Precedence

**User Story:** As a reviewer, I want shield rules to apply in a predictable order, so that I understand which rules take effect.

#### Acceptance Criteria

1. THE Cleanup_Engine SHALL apply shields in precedence order: Session Overrides → Template Rules → Vendor Rules → Auto Suggestions
2. WHEN multiple shields overlap, THE Cleanup_Engine SHALL use the highest precedence source
3. THE Cleanup_Engine SHALL provide an API to explain which source determined each active shield

### Requirement 6: Conflict Safety for Critical Zones

**User Story:** As a reviewer, I want the system to protect critical document zones, so that important data is not accidentally shielded.

#### Acceptance Criteria

1. IF an auto-detected shield overlaps LineItems or Totals zones, THEN THE Cleanup_Engine SHALL downgrade it to Suggested status with High risk
2. IF a template or vendor shield overlaps critical zones, THEN THE Cleanup_Engine SHALL require zone-scoping or explicit confirmation
3. THE Cleanup_Engine SHALL provide visual warnings when shields affect critical zones

### Requirement 7: Multi-Page Repetitive Strip Detection

**User Story:** As a user, I want the system to detect repetitive headers and footers across multi-page documents, so that noise is consistently shielded.

#### Acceptance Criteria

1. WHEN processing a multi-page PDF, THE Cleanup_Engine SHALL compare top and bottom strips across pages
2. WHEN stable pixel or text patterns are detected across pages, THE Cleanup_Engine SHALL create a repetitive header/footer shield with higher confidence
3. THE multi-page detection SHALL complete within 5 seconds for documents up to 20 pages

### Requirement 8: Text-Aware Shielding

**User Story:** As a user, I want the system to use OCR hints to improve shield detection, so that decorative elements are distinguished from content.

#### Acceptance Criteria

1. THE Cleanup_Engine SHALL use quick OCR or text box detection to identify dense text areas vs decorative backgrounds
2. THE Cleanup_Engine SHALL detect stamp patterns like "PAID", "COPY", "DUPLICATE" including color analysis when available
3. THE Cleanup_Engine SHALL identify watermark-like regions with low text density but non-uniform texture

### Requirement 9: Database Persistence for Cleanup Rules

**User Story:** As a system administrator, I want cleanup rules to persist across application restarts, so that learned rules are not lost.

#### Acceptance Criteria

1. WHEN saving vendor cleanup rules, THE Cleanup_Engine SHALL persist them to the `vendor_cleanup_rules` table
2. WHEN saving template cleanup rules, THE Cleanup_Engine SHALL persist them to the `template_cleanup_rules` table
3. THE system SHALL maintain a `cleanup_audit_log` table recording who changed what with diff_json
4. IF the database is unavailable, THEN THE Cleanup_Engine SHALL fall back to in-memory storage and log a warning
5. THE system SHALL support migration of existing in-memory masks to database storage

### Requirement 10: Shield Overlay Rendering

**User Story:** As a reviewer, I want to see shield overlays on document images, so that I can verify which regions are being shielded.

#### Acceptance Criteria

1. WHEN rendering shield overlays, THE Cleanup_Engine SHALL draw semi-transparent colored overlays on shielded regions
2. THE Cleanup_Engine SHALL use distinct colors for different shield types: Logo=blue, Watermark=yellow, Header/Footer=gray, User=green, Vendor=purple
3. THE Cleanup_Engine SHALL draw bounding box borders around each shield region
4. THE Cleanup_Engine SHALL show zone boundaries in the overlay
5. THE Cleanup_Engine SHALL highlight intersections where shields affect critical zones
6. WHEN generating visualization, THE Cleanup_Engine SHALL include a legend showing shield types and colors

### Requirement 11: Backward Compatible API Endpoints

**User Story:** As a developer, I want existing API endpoints to continue working, so that integrations are not broken.

#### Acceptance Criteria

1. THE system SHALL create new `/api/cleanup/*` endpoints for the cleanup shield functionality
2. THE system SHALL keep existing `/api/masks/*` endpoints as proxy routes to the new cleanup endpoints
3. THE proxy routes SHALL translate between old and new terminology automatically
4. THE system SHALL maintain backward compatibility for at least one release cycle

### Requirement 12: Adaptive Threshold Tuning

**User Story:** As a system administrator, I want the system to learn from review outcomes, so that detection accuracy improves over time.

#### Acceptance Criteria

1. THE Cleanup_Engine SHALL track outcomes: edits needed in review, extraction confidence improvements
2. THE Cleanup_Engine SHALL support vendor-specific threshold adjustments based on tracked outcomes
3. THE Cleanup_Engine SHALL support disabling specific detection types for vendors where they harm accuracy
4. THE system SHALL provide a "rule health" dashboard showing detection effectiveness

### Requirement 13: Fail-Open Behavior

**User Story:** As a user, I want OCR to always run even if shield detection fails, so that document processing is not blocked.

#### Acceptance Criteria

1. IF shield detection fails or returns empty results, THEN THE Cleanup_Engine SHALL allow OCR to proceed without shields
2. THE Cleanup_Engine SHALL log detection failures for debugging without blocking the pipeline
3. THE Cleanup_Engine SHALL set auto-detected shields to Suggested status by default unless high-confidence and low-risk
