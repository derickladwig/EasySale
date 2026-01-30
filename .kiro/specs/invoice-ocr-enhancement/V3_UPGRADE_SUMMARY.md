# Invoice OCR v3.0 Upgrade Summary

**Date:** January 25, 2026  
**Version:** 3.0 - Universal + Operationally Bullet-Proof  
**Status:** Specification Complete

## What Changed from v2.0 to v3.0

### Core Philosophy Additions

**v2.0 Philosophy:**
- Auto when safe
- Ask only what's uncertain
- Never lose provenance
- Make review faster than manual entry
- Hard stop on contradictions

**v3.0 Additions:**
- **Operationally bullet-proof**: If not confident → force review (never silently wrong)
- **Universal input**: Support any document format with proper normalization
- **Artifact traceability**: Every output traces back to source with full provenance
- **Controlled pipeline**: Not just "multi-pass OCR" but a complete pipeline with budgets and early stopping

### Architecture Transformation

**v2.0 Architecture (Linear):**
```
Upload → Preprocess → Multi-Pass OCR → Merge → Validate → Review
```

**v3.0 Architecture (Pipeline with Artifacts):**
```
Document → Pages → Variants → Zones(+Masks) → OCR Artifacts → 
Field Candidates → Resolver → Validation → Review/Approve → Export
```

### Key New Components

#### 1. Ingest & Normalization (Epic 0-1)
- **DocumentIngestService**: Universal input handling
- **PDF Rasterization**: Extract both images and text layers
- **OrientationService**: Automatic rotation detection (0/90/180/270)
- **Artifact Model**: Complete traceability from input to output

#### 2. Multi-Variant Preprocessing (Epic 2)
- **Variant Generator**: Create 6-12 variants per page
- **Variant Scoring**: Rank by OCR-readiness
- **Top-K Selection**: Keep only best variants for performance

#### 3. Zone Detection & Blocking (Epic 3)
- **ZoneDetectorService**: Detect HeaderFields, TotalsBox, LineItemsTable, etc.
- **Mask Engine**: Auto-mask noise regions (logo, watermark, footer)
- **User Masks**: "Remember for vendor" option
- **Zone Override**: Adjust zones during review

#### 4. OCR Orchestrator (Epic 4)
- **Profile System**: YAML-configured OCR profiles per zone type
- **Multi-Pass per Zone**: Not just whole-page, but targeted OCR
- **Early Stop**: Stop when critical fields confident
- **Runtime Budgets**: Max time per page/document enforced

#### 5. Candidate System (Epic 5)
- **Universal Lexicon**: Global synonyms + vendor overrides
- **Candidate Generator**: Multiple extraction methods with evidence
- **Field Resolver**: Consensus + cross-checks + explanations
- **Confidence Calibration**: Scores correlate with real accuracy

#### 6. Golden Set & Regression (Epic 0)
- **Fixtures**: 20+ diverse invoices with ground truth
- **Metrics Runner**: Measure accuracy, auto-approve rate, review time
- **CI Gate**: Block merge if accuracy regresses > 2%

### Requirements Changes

**Added Sections:**
- 0. Ingest & Normalization (Universal Input)
- Updated 1. Preprocessing (Multi-Variant, Not Single Pipeline)
- Updated 2. OCR Pass System (Profiles + Zones + Early Stop)
- New 3. Layout, Zones, Targeting & Blocking
- New 4. Field Extraction (Candidates → Resolver → Final Fields)
- Updated 5. Validation & Approval Gates
- Updated 6. Review Module (Super User Friendly)
- New 7. Integration (Safe & Gated)
- New 8. Testing, Metrics, and Quality Gates

**Total Requirements:** 60+ (up from 40 in v2.0)

### Design Changes

**New Data Structures:**

1. **Artifact Model** (The Missing Piece)
   - InputArtifact
   - PageArtifact
   - VariantArtifact
   - ZoneArtifact
   - OcrArtifact
   - CandidateArtifact
   - DecisionArtifact

2. **Zones + Masks**
   - ZoneMap
   - Zone (with ZoneType enum)
   - BoundingBox
   - Mask regions

3. **OCR Profiles**
   - OcrProfile (YAML-configured)
   - Zone-specific profiles
   - Whitelist/blacklist support

4. **Candidates + Resolver**
   - FieldCandidate (with evidence)
   - Evidence (with types)
   - FieldValue (with explanation)
   - Lexicon (universal terms)

5. **Budgets & Early Stop**
   - ProcessingBudget
   - EarlyStopChecker
   - Configurable thresholds

**New Services:**
- DocumentIngestService
- OrientationService
- PreprocessVariantService
- ZoneDetectorService
- OcrOrchestrator
- FieldExtractor
- FieldResolver
- ConfidenceCalibrator

**New Configuration Files:**
- `config/ocr_profiles.yml`
- `config/lexicon.yml`
- `config/review_policy.yml`

### Task Changes

**New Epics:**
- Epic 0: Golden Set + Eval Harness (3 tasks)
- Epic 1: Ingest + Page Artifacts (4 tasks)
- Epic 2: Preprocessing Variants (3 tasks)
- Epic 3: Zones + Blocking (4 tasks)
- Epic 4: OCR Orchestrator (5 tasks)
- Epic 5: Candidate Extraction + Resolver (4 tasks)

**Existing Epics (Updated):**
- Epic A: Confidence + Guardrails (3 tasks) - now consumes outputs from Epics 1-5
- Epic B: Review Queue + Sessions (3 tasks)
- Epic C: Review UI (5 tasks)
- Epic D: Fix-in-Place Tools (3 tasks)
- Epic E: Setup + Roles (3 tasks)
- Epic F: Vendor Profile Builder (2 tasks)
- Epic G: Approval Gates (2 tasks)
- Epic H: Testing (3 tasks)

**Total Tasks:** 50+ (up from 23 in v2.0)

**Timeline:** 19.5 weeks (~5 months) vs 11.5 weeks in v2.0

### API Changes

**New Endpoints:**
```
POST /api/ingest → create ReviewCase + start processing job
GET /api/cases/:id/artifacts → get all artifacts for case
POST /api/cases/:id/reocr → targeted re-OCR (region/zone/profile)
POST /api/cases/:id/masks → add/remove masks
POST /api/cases/:id/zones → adjust zones
GET /api/cases/:id/candidates → get field candidates with evidence
```

**Updated Endpoints:**
```
GET /api/cases/:id → now includes artifacts, candidates, evidence
POST /api/cases/:id/decide → now includes evidence selection
POST /api/cases/:id/approve → now checks artifact completeness
```

### Review UX Changes

**Guided Mode Enhancements:**
- **Evidence Cards**: Plain-language "why we think this"
- **Locate on Page**: Highlights source region
- **Alternatives**: Click to choose from candidates
- **Suggested Actions**: "Click total area and re-OCR"
- **Approval Blocked**: Clear reasons with remediation steps

**Power Mode Additions:**
- **Raw OCR Artifacts**: View all OCR outputs
- **Evidence Breakdown**: See all evidence per candidate
- **Zone Editor**: Adjust zones visually
- **Vendor Template Override**: Select different template

### Configuration Changes

**New Config Files:**

1. **ocr_profiles.yml**
   - Profile definitions
   - Zone-specific settings
   - Whitelist/blacklist

2. **lexicon.yml**
   - Global field synonyms
   - Vendor overrides
   - Format patterns

3. **review_policy.yml**
   - Mode settings (Fast/Balanced/Strict)
   - Thresholds per mode
   - Critical fields list

### Testing Changes

**New Testing Requirements:**
- Golden set with 20+ fixtures
- Metrics runner for accuracy tracking
- Regression gate in CI (blocks merge if accuracy drops)
- Artifact traceability tests
- Budget enforcement tests
- Confidence calibration tests

### What Makes v3.0 "Universal"

1. **Any Input Format**: PDF (text layer + rasterized), images, multi-page
2. **Any Rotation**: Auto-detect and correct 0/90/180/270
3. **Any Layout**: Zone detection adapts to document structure
4. **Any Vendor**: Universal lexicon + vendor overrides
5. **Any Quality**: Multi-variant preprocessing handles noisy/clean docs

### What Makes v3.0 "Operationally Bullet-Proof"

1. **Never Silently Wrong**: If not confident → force review
2. **Complete Provenance**: Every value traces to artifact
3. **Audit Trail**: All decisions logged, undo supported
4. **Approval Gates**: Hard blocks prevent bad data
5. **Artifact Traceability**: Debug any issue back to source
6. **Budget Enforcement**: Never exceed time limits
7. **Regression Protection**: CI blocks accuracy drops
8. **Safe Integration**: Only Approved cases feed downstream

## Migration Path from v2.0 to v3.0

### Phase 1: Foundation (Weeks 1-3)
- Implement artifact model
- Create golden set
- Set up metrics runner
- Add regression gate to CI

### Phase 2: Ingest Pipeline (Weeks 4-6)
- Document ingest service
- Orientation service
- Variant generator
- Artifact storage

### Phase 3: Zone & OCR (Weeks 7-10)
- Zone detector
- Mask engine
- OCR orchestrator
- Profile system

### Phase 4: Candidates (Weeks 11-13)
- Lexicon system
- Candidate generator
- Field resolver
- Confidence calibrator

### Phase 5: Integration (Weeks 14-16)
- Wire up to existing validation
- Update review UI
- Add evidence cards
- Implement targeted re-OCR

### Phase 6: Polish (Weeks 17-20)
- Performance optimization
- Documentation
- User acceptance testing
- Production deployment

## Backward Compatibility

**Breaking Changes:**
- API responses now include artifacts
- Review case structure expanded
- Configuration files required

**Migration Required:**
- Existing cases need artifact backfill
- Config files must be created
- Golden set must be established

**Gradual Migration Supported:**
- Can run v2.0 and v3.0 in parallel
- Existing cases continue to work
- New cases use v3.0 pipeline

## Success Metrics (Updated)

### v2.0 Targets
- 95% field extraction accuracy
- 80% auto-approval rate
- < 30s processing time
- < 30s review time

### v3.0 Targets (Same + New)
- 95% field extraction accuracy ✓
- 90% auto-approval rate (up from 80%)
- < 30s processing time ✓
- < 30s review time ✓
- **NEW:** Confidence scores correlate with accuracy (±5%)
- **NEW:** Zero regressions in CI
- **NEW:** 100% artifact traceability
- **NEW:** Budget compliance 100%

## What's Already Implemented

From v2.0 implementation:
- ✅ Multi-pass OCR service (needs update for zones)
- ✅ Image preprocessing service (needs variant generation)
- ✅ Confidence models (field + document)
- ✅ Validation models (hard + soft rules)
- ✅ Review models (case, session, audit)
- ✅ Review policy models
- ✅ Validation engine service

**Reuse Strategy:**
- Keep existing models as foundation
- Extend with artifact support
- Add new services for pipeline
- Update existing services for zones

## What Needs to Be Built

**New (High Priority):**
- Artifact model and storage
- Document ingest service
- Orientation service
- Variant generator
- Zone detector
- OCR orchestrator
- Candidate generator
- Field resolver
- Golden set + metrics runner

**Updates (Medium Priority):**
- Multi-pass OCR → zone-aware
- Image preprocessing → variant generation
- Validation engine → use candidates
- Review UI → evidence cards

**New (Low Priority):**
- Confidence calibrator
- Zone editor UI
- Power mode UI
- Vendor profile builder

## Conclusion

v3.0 transforms the invoice OCR system from a "multi-pass OCR with review" into a **universal, operationally bullet-proof pipeline** with:

- Complete artifact traceability
- Universal input handling
- Intelligent zone detection
- Budget-controlled processing
- Evidence-based field resolution
- Regression-protected quality
- User-friendly guided review

The system is now ready to handle any invoice format, any quality level, and any vendor, while maintaining operational safety through hard gates, audit trails, and artifact provenance.

**Estimated ROI:**
- 90% auto-approval rate (vs 80% in v2.0)
- 95% accuracy maintained
- < $0.25 per invoice
- Zero silent failures
- Complete audit trail for compliance

**Payback Period:** 12-16 months (vs 16 months in v2.0)

---

**Version:** 3.0  
**Status:** Specification Complete - Ready for Implementation  
**Next Step:** Begin Epic 0 (Golden Set) to establish quality baseline
