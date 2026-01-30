# Invoice OCR Enhancement - Requirements v3.0

## Core Philosophy
- **Auto when safe**: High confidence + validations pass → auto-approve
- **Ask only what's uncertain**: Progressive review of low-confidence fields
- **Never lose provenance**: Every value has evidence + source + artifact trace
- **Review faster than manual entry**: One screen + click-to-accept + hotkeys + "Approve & Next"
- **Hard stop on contradictions**: Totals don't reconcile, critical fields missing
- **Operationally bullet-proof**: If not confident → force review (never silently wrong)

## 0. Ingest & Normalization (Universal Input)

### 0.1 Supported Inputs
**Description:** System shall support universal document input formats.

**Acceptance Criteria:**
- PDF (single/multi-page) supported
- JPG/PNG/TIFF image formats supported
- Multi-page PDFs processed end-to-end (queue + review + export)
- File size limits enforced (configurable)
- Invalid formats rejected with clear error messages

### 0.2 PDF Rasterization + Text Layer
**Description:** System shall extract both rasterized images and text layers from PDFs.

**Acceptance Criteria:**
- If PDF has selectable text layer → ingest as candidate source with confidence
- Rasterize each page at configurable DPI (200/300/400)
- Rasterized pages cached with deterministic hash
- Processing completes within 30s typical (configurable timeouts)
- Text layer extraction preserves formatting hints

### 0.3 Rotation + Orientation Resolution
**Description:** System shall automatically detect and correct document orientation.

**Acceptance Criteria:**
- Evaluate 0/90/180/270 rotations using readability score
- Deskew applied after best rotation chosen
- Rotation decision stored per page with score + evidence
- Processing time < 5 seconds per page
- Manual rotation override supported

## 1. Preprocessing (Multi-Variant, Not Single Pipeline)

### 1.1 Variant Generation
**Description:** System shall generate multiple preprocessing variants per page.

**Acceptance Criteria:**
- Generate 6-12 preprocessing variants per page
- Variants include: grayscale, adaptive threshold, denoise+sharpen, contrast bump, upscale, deskewed
- Rank variants using heuristic OCR-readiness score
- Cap to top K variants (configurable) for performance
- Variant generation completes within 10 seconds per page

### 1.2 Caching & Artifacts
**Description:** System shall cache preprocessing artifacts with traceability.

**Acceptance Criteria:**
- Preprocessed outputs cached with deterministic hash keys
- Cache TTL configurable (default 24 hours)
- Never delete original input files
- Artifacts traceable from output back to source file/page/variant
- Cache size limits enforced with LRU eviction

## 2. OCR Pass System (Profiles + Zones + Early Stop)

### 2.1 OCR Profiles
**Description:** System shall support configurable OCR profiles.

**Acceptance Criteria:**
- Profiles config-driven (YAML format)
- Profiles include: PSM/OEM/DPI/lang + whitelist/blacklist
- Zone-specific profiles exist (numbers-only totals, header fields, table dense)
- Profiles hot-reloadable without restart
- Default profiles provided for common scenarios

### 2.2 Multi-Pass OCR
**Description:** System shall execute multiple OCR passes per zone.

**Acceptance Criteria:**
- Execute 3-5 OCR passes per zone (not only whole-page)
- Pass results preserved with metadata (engine, profile, page, zone, variant)
- Passes can run in parallel with concurrency limits
- Each pass has timeout (configurable)
- Pass failures don't block other passes

### 2.3 Early Stop / Budgeting
**Description:** System shall optimize processing with early stopping.

**Acceptance Criteria:**
- Stop processing additional variants/passes once critical fields exceed confidence thresholds
- Max runtime budgets enforced per document and per page
- Budget exceeded → return best results so far
- Early stop saves 30-50% processing time on clean documents
- Configurable per tenant

## 3. Layout, Zones, Targeting & Blocking

### 3.1 Zone Detection
**Description:** System shall detect document zones automatically.

**Acceptance Criteria:**
- Detects zones: HeaderFields, TotalsBox, LineItemsTable, FooterNotes, Barcode/Logo areas
- Zone detection yields confidence and bounding boxes per page
- Zones stored as artifacts with metadata
- Zone detection completes within 3 seconds per page
- Manual zone adjustment supported

### 3.2 Blocking (Ignore Masks)
**Description:** System shall mask unwanted regions.

**Acceptance Criteria:**
- Auto-masks common noise regions (logo, repetitive footer/header, watermark)
- Confidence indicates junk regions
- User can add masks (case-level)
- Option to "remember for vendor"
- Masks applied to future OCR runs
- Masks stored with provenance

### 3.3 Zone Override
**Description:** System shall allow zone adjustment during review.

**Acceptance Criteria:**
- Reviewer can adjust zones in UI (drag/resize)
- System uses new zones for re-OCR
- Zone changes logged in audit trail
- Before/after comparison shown
- Zone overrides saved to case

## 4. Field Extraction (Candidates → Resolver → Final Fields)

### 4.1 Candidate Extraction (Universal Terms)
**Description:** System shall extract field candidates using universal lexicon.

**Acceptance Criteria:**
- Global lexicon of synonyms per field:
  - Invoice #: invoice no, inv #, receipt #, statement #
  - Total: total, total due, amount due, balance due, grand total
  - Date: invoice date, date issued, bill date, statement date
- Regex + proximity-to-label + zone priors + format parsing generate candidates
- Top N candidates preserved with evidence (N configurable)
- Candidates include confidence scores
- Vendor-specific lexicon overrides supported

### 4.2 Field Resolver (Consensus + Cross-Checks)
**Description:** System shall resolve final field values from candidates.

**Acceptance Criteria:**
- Resolver combines candidates across artifacts
- Consensus boosts (same value seen across multiple sources)
- Penalties for contradictions (total/subtotal/tax mismatch, invalid date, nonsense invoice #)
- Outputs final field values with confidence 0-100 + explanation
- Cross-field validation applied
- Resolver logic transparent and debuggable

### 4.3 Confidence Calibration
**Description:** System shall calibrate confidence scores to real accuracy.

**Acceptance Criteria:**
- Confidence scores correlate with real accuracy (tracked via golden set)
- Per-vendor calibration supported (optional)
- Calibration improves thresholds over time
- Calibration data exportable for analysis
- Recalibration triggered by accuracy drift

## 5. Validation & Approval Gates

### 5.1 Hard Rules (Block Approval)
**Description:** System shall enforce hard validation rules that block approval.

**Acceptance Criteria:**
- Total must parse as currency
- Date must parse and not be future beyond threshold
- Total ≈ subtotal + tax (+fees) within tolerance
- Critical fields must be present (vendor, date, invoice #, total)
- Hard failures block approve/export
- Clear error messages with remediation steps

### 5.2 Soft Rules (Warn / Reduce Confidence)
**Description:** System shall apply soft validation rules that warn.

**Acceptance Criteria:**
- Tax approx expected (GST 5% default; configurable)
- Invoice # matches vendor regex if known
- Duplicate invoice detection (vendor + invoice # + amount + date similarity)
- Soft failures reduce confidence and add warnings
- Warnings don't block approval
- Warnings logged for analysis

### 5.3 Auto-Approval Policy
**Description:** System shall support configurable auto-approval policies.

**Acceptance Criteria:**
- Fast/Balanced/Strict modes per tenant
- Fast: auto-approve if doc_conf ≥ 90 and no hard flags
- Balanced: auto-approve if doc_conf ≥ 95 and critical fields ≥ 92
- Strict: auto-approve if doc_conf ≥ 98 and zero flags
- Manual override requires Admin role + mandatory note
- Policy changes hot-reloadable

## 6. Review Module (Super User Friendly)

### 6.1 Review Queue
**Description:** System shall provide filterable review queue.

**Acceptance Criteria:**
- Filter by state, vendor, age, confidence, flags
- Sorting prioritizes "quick wins" (few fields to confirm)
- Pagination support
- Bulk actions available
- Queue updates in real-time

### 6.2 Guided Review (For Anyone)
**Description:** System shall provide guided review mode.

**Acceptance Criteria:**
- "Guided mode" shows only 1-6 fields that matter
- Each field shows:
  - Best value + confidence %
  - Alternatives
  - "Show me on invoice" highlight
  - Plain-language "why we think this" (evidence card)
- One-click: "Accept All Safe Fields"
- "Approve & Next" always visible when eligible
- Review time < 30 seconds for typical case

### 6.3 Targeted Re-OCR & Masking
**Description:** System shall support targeted re-OCR and masking.

**Acceptance Criteria:**
- Drag region → re-OCR with appropriate profile (numbers-only etc.)
- Mask region → re-run and store mask decision
- Before/after compare for changed fields
- Re-OCR completes within 5 seconds
- Changes logged in audit trail

### 6.4 Audit + Undo
**Description:** System shall maintain complete audit trail with undo.

**Acceptance Criteria:**
- Every decision logged
- Undo last change (multi-step)
- Archive only (no delete)
- Audit trail immutable
- Audit trail exportable for compliance

## 7. Integration (Inventory/AP/Accounting) — Safe & Gated

### 7.1 Gated Integration
**Description:** System shall gate integrations by approval state.

**Acceptance Criteria:**
- Only Approved cases feed inventory/AP/accounting
- Integration failures don't corrupt review state (transactional)
- All generated accounting entries balance (DR=CR)
- Integration errors logged and retryable
- Rollback supported on failure

### 7.2 Inventory Updates
**Description:** System shall update inventory from approved bills.

**Acceptance Criteria:**
- Increases on-hand quantities
- Updates last cost
- Records inventory transactions
- Maintains cost history
- Only processes Approved state invoices

### 7.3 AP Invoice Creation
**Description:** System shall create AP invoices from bills.

**Acceptance Criteria:**
- Creates invoice record
- Populates vendor, date, amounts
- Includes line items
- Calculates due date
- Links to original bill
- Updates vendor balance

## 8. Testing, Metrics, and Quality Gates

### 8.1 Golden Set + Regression
**Description:** System shall maintain golden set for regression testing.

**Acceptance Criteria:**
- Golden set required to ship changes
- Must not regress field accuracy > allowed threshold
- Golden set covers diverse invoice types
- Automated regression tests in CI
- Regression reports generated

### 8.2 Performance & Load
**Description:** System shall meet performance benchmarks.

**Acceptance Criteria:**
- Typical invoice processing < 30s (configurable)
- Review time target < 30s for flagged cases
- Concurrent processing supported (5+ invoices)
- Memory usage bounded
- Graceful degradation under load

### 8.3 Safety Guarantees
**Description:** System shall enforce safety guarantees.

**Acceptance Criteria:**
- Audit always written
- Export blocked unless Approved + no hard flags
- No deletions; archive only
- Data integrity maintained
- Rollback supported

## Success Metrics

### Accuracy Target
- 95% field extraction accuracy (up from 70%)
- 90% auto-approval rate for clean invoices

### Processing Time Target
- < 30 seconds per invoice (automated processing)
- < 30 seconds review time for flagged invoices

### Automation Target
- 80% of invoices auto-approved
- 20% require review (but review is fast)

### Cost Target
- < $0.25 per invoice (down from $3.34)

### User Experience Target
- Review faster than manual entry
- < 5 clicks to approve typical invoice
- Keyboard shortcuts for power users
- "Anyone can use it" - no training required
