# OCR Review User Guide

## Overview

This guide explains how to use the Invoice OCR review interface to efficiently review and approve invoices.

---

## Getting Started

### Accessing the Review Queue

1. Navigate to **Review** → **Queue** in the main menu
2. You'll see a list of invoices awaiting review
3. Cases are sorted by priority (lowest confidence first)

### Queue Filters

Filter cases to focus on specific types:

- **State**: Pending, In Review, Approved, Rejected
- **Vendor**: Filter by specific vendor
- **Confidence**: Show only low-confidence cases (< 90%)
- **Date Range**: Filter by upload date
- **Flags**: Show only cases with validation warnings

**Example:** To review all pending cases from Acme Corp with confidence < 85%:
```
State: Pending
Vendor: Acme Corp
Max Confidence: 85
```

---

## Review Modes

### Guided Mode (Recommended for Most Users)

**Best for:** Quick review of straightforward invoices

**Features:**
- Shows only fields needing attention
- Highlights low-confidence fields
- Provides suggested corrections
- One-click accept for safe fields

**Workflow:**
1. Review highlighted fields
2. Click **Accept** for correct values
3. Click **Edit** to correct wrong values
4. Click **Approve & Next** when done

**Keyboard Shortcuts:**
- `A`: Accept current field
- `E`: Edit current field
- `N`: Next field
- `Enter`: Approve & Next

---

### Power Mode (For Advanced Users)

**Best for:** Complex invoices, troubleshooting, training

**Features:**
- View all fields (including high-confidence)
- See raw OCR output
- View evidence breakdown
- Edit zones and masks
- Adjust confidence thresholds
- Override vendor templates

**Workflow:**
1. Review all fields in detail
2. Check evidence for each value
3. View alternative candidates
4. Adjust zones if needed
5. Add masks for noise regions
6. Approve when satisfied

**Keyboard Shortcuts:**
- `Ctrl+A`: Toggle show all fields
- `Ctrl+E`: View evidence
- `Ctrl+Z`: View zones
- `Ctrl+M`: Manage masks

---

## Field Review

### Understanding Field Display

Each field shows:
- **Value**: Extracted value
- **Confidence**: 0-100 score
- **Alternatives**: Other possible values
- **Evidence**: Why this value was chosen

**Example:**
```
Invoice Number: INV-12345
Confidence: 95%
Alternatives: INV-12345, INV-I2345
Evidence: Found in header zone, matched lexicon pattern "INV-#####"
```

### Confidence Indicators

- 🟢 **Green (90-100%)**: High confidence, likely correct
- 🟡 **Yellow (70-89%)**: Medium confidence, review recommended
- 🔴 **Red (< 70%)**: Low confidence, verify carefully

### Accepting Values

**One-Click Accept:**
- Click **✓ Accept** button
- Or press `A` key
- Field turns green and moves to next

**Batch Accept:**
- Click **Accept All Safe** to accept all fields with confidence > 95%
- Saves time on clean invoices

### Correcting Values

**Edit Field:**
1. Click **Edit** button or press `E`
2. Type correct value
3. Press `Enter` to save
4. Correction is logged for calibration

**Common Corrections:**
- OCR misread: `O` → `0`, `I` → `1`, `S` → `5`
- Date format: `01/25/2026` → `2026-01-25`
- Currency: `$1,250.00` → `1250.00`

---

## Validation Warnings

### Hard Failures (Block Approval)

**Red banner** at top indicates blocking issues:

- ❌ **Total Math Error**: Subtotal + Tax ≠ Total
- ❌ **Missing Critical Field**: Invoice number, date, vendor, or total missing
- ❌ **Future Date**: Invoice date in the future
- ❌ **Contradictions**: Conflicting values detected

**Action Required:** Fix the issue before approving

### Soft Warnings (Allow Approval)

**Yellow banner** indicates warnings:

- ⚠️ **Format Issue**: Invoice number contains special characters
- ⚠️ **Low Confidence**: Some fields below threshold
- ⚠️ **Cross-Field Warning**: Vendor name missing but invoice number present

**Action:** Review carefully, but can approve if correct

---

## Evidence Cards

Click **View Evidence** to see why a value was chosen:

**Evidence Types:**
- **Lexicon Match**: Matched known pattern (e.g., "Invoice #")
- **Proximity**: Found near label text
- **Zone Prior**: Expected in this zone (e.g., total in totals box)
- **Format Parse**: Parsed as date/currency
- **Consensus**: Multiple OCR passes agreed

**Example:**
```
Invoice Number: INV-12345
Evidence:
  ✓ Lexicon match: "Invoice #" label found 2cm left
  ✓ Format match: Pattern "INV-#####"
  ✓ Zone prior: Found in HeaderFields zone
  ✓ Consensus: 3/3 OCR passes agreed
```

---

## Locate on Page

Click **Locate** to highlight the field on the original document:

- Field region highlighted in yellow
- Zoom to field location
- View surrounding context
- Useful for verifying ambiguous values

---

## Targeted Re-OCR

If a field is incorrect and confidence is low:

1. Click **Re-OCR** button
2. Select region on document (or use auto-detected region)
3. Choose OCR profile:
   - **Fast**: Quick re-scan
   - **Balanced**: Standard quality
   - **High Accuracy**: Slower but more accurate
4. Click **Process**
5. Wait 3-5 seconds for results
6. New value appears with updated confidence

**When to Use:**
- Low-quality scan in specific area
- Rotated or skewed text
- Unusual font or handwriting
- Previous OCR clearly wrong

---

## Mask Management

Add masks to hide noise regions (logos, watermarks, etc.):

1. Click **Manage Masks**
2. Click **Add Mask**
3. Draw rectangle over noise region
4. Select mask type:
   - Logo
   - Watermark
   - Header
   - Footer
   - Custom
5. Check **Remember for this vendor** to apply to future invoices
6. Click **Apply**
7. Document is reprocessed with mask

**When to Use:**
- Logo interfering with OCR
- Watermark causing false readings
- Repetitive header/footer text
- Background patterns

---

## Approval Workflow

### Approve

When all fields are correct:

1. Review all highlighted fields
2. Make any necessary corrections
3. Click **Approve** button (or press `Ctrl+Enter`)
4. Case moves to Approved state
5. Integrations trigger automatically (if configured)

### Reject

If invoice is invalid or unreadable:

1. Click **Reject** button
2. Select reason:
   - Invalid invoice
   - Duplicate
   - Wrong vendor
   - Unreadable
   - Other (specify)
3. Add notes explaining rejection
4. Click **Confirm Reject**
5. Case moves to Rejected state

### Undo

Made a mistake? Undo the last action:

1. Click **Undo** button (or press `Ctrl+Z`)
2. Case returns to previous state
3. Undo is logged in audit trail
4. Can undo multiple times

---

## Batch Review

For efficient processing of multiple invoices:

### Review Session

1. Click **Start Session**
2. System tracks your throughput
3. Review cases one by one
4. Click **Approve & Next** to move to next case
5. Session stats shown in sidebar:
   - Cases reviewed: 15
   - Approved: 12
   - Rejected: 3
   - Avg time: 45 seconds
   - Throughput: 80 cases/hour

### Keyboard-Only Workflow

For maximum speed:

1. `N`: Load next case
2. `Tab`: Move to next field
3. `A`: Accept field
4. `E`: Edit field (if needed)
5. `Enter`: Save edit
6. `Ctrl+Enter`: Approve & Next

**Expert users can review 100+ cases/hour with keyboard-only workflow**

---

## Tips & Best Practices

### Speed Tips

1. **Use Guided Mode** for straightforward invoices
2. **Keyboard shortcuts** are faster than mouse
3. **Batch Accept** safe fields to save time
4. **Filter queue** to group similar cases
5. **Start sessions** to track throughput

### Accuracy Tips

1. **Check evidence** for low-confidence fields
2. **Locate on page** to verify ambiguous values
3. **Compare alternatives** before accepting
4. **Watch for OCR errors**: O/0, I/1, S/5
5. **Verify math**: Subtotal + Tax = Total

### Quality Tips

1. **Add corrections** to improve future accuracy
2. **Use masks** for recurring noise
3. **Report issues** for systematic problems
4. **Review rejected cases** to identify patterns
5. **Calibrate confidence** by tracking accuracy

---

## Troubleshooting

### Low Confidence on Clean Invoice

**Cause:** System not calibrated for this vendor  
**Solution:** Review and approve several invoices to calibrate

### Repeated OCR Errors

**Cause:** Logo or watermark interfering  
**Solution:** Add mask and remember for vendor

### Missing Fields

**Cause:** Unusual invoice layout  
**Solution:** Use Power Mode to adjust zones

### Slow Processing

**Cause:** Large file or complex layout  
**Solution:** Use Fast OCR profile for re-OCR

### Can't Approve

**Cause:** Hard validation failure  
**Solution:** Check red banner for blocking issue, fix before approving

---

## Getting Help

- **In-App Help**: Press `?` for keyboard shortcuts
- **Support**: Contact support@example.com
- **Training**: Request training session for your team
- **Documentation**: See full API docs at docs.example.com

---

**Version:** 3.0  
**Last Updated:** January 25, 2026
