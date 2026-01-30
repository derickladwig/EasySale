# Document Cleanup Engine - User Journeys

## Overview

This document defines the primary user journeys for the Document Cleanup Engine (DCE) within the EasySale Review Workspace.

---

## Journey 1: Review a Document

**Actor:** Reviewer  
**Goal:** Review an incoming vendor bill and approve it for processing

### Steps

1. **Navigate to Review Queue**
   - Screen: `/review/queue`
   - Button: Sidebar → "Review Queue" or "Vendor Bills"
   - Endpoint: `GET /api/cases?state=pending&sort=priority`

2. **Select a Case**
   - Screen: `/review/queue`
   - Action: Click row in queue table
   - Endpoint: `GET /api/cases/{case_id}`

3. **Open Review Workspace**
   - Screen: `/review/{case_id}`
   - Components: Document Viewer (left), Tabs panel (right)
   - Tabs: [Summary] [Cleanup] [Extraction] [History]

4. **View Cleanup Shields**
   - Tab: Cleanup
   - Action: Toggle "Show shields (resolved)" vs "Show suggestions (auto)"
   - Endpoint: `POST /api/cleanup/resolve` with `review_case_id`

5. **Adjust Shield (if needed)**
   - Action: Click shield in list → change Apply Mode (Applied/Suggested/Disabled)
   - Action: Draw new shield region on viewer
   - No endpoint yet (session state)

6. **Re-run Extraction**
   - Button: "Re-run Extraction"
   - Endpoint: `POST /api/cases/{case_id}/reprocess` with current shields
   - UI: Shows progress indicator, updates extraction results

7. **Review Extracted Fields**
   - Tab: Extraction
   - Action: Verify/correct extracted values
   - Endpoint: `PUT /api/cases/{case_id}/fields`

8. **Approve Case**
   - Button: "Approve & Next"
   - Endpoint: `POST /api/cases/{case_id}/approve`
   - UI: Success toast, auto-navigate to next case in queue

---

## Journey 2: Save Vendor Rule

**Actor:** Manager  
**Goal:** Save cleanup shields as a vendor rule for future documents

### Steps

1. **Complete Journey 1 steps 1-5** (review document, adjust shields)

2. **Click "Save as Vendor Rule"**
   - Button: "Save as Vendor Rule" in Cleanup tab
   - Prerequisite: At least one shield adjusted or drawn

3. **Confirm Vendor**
   - Modal: "Save Cleanup Rules for Vendor"
   - Shows: Vendor name (auto-detected or selected)
   - Option: Document type filter (invoice, statement, etc.)

4. **Save Rules**
   - Button: "Save" in modal
   - Endpoint: `PUT /api/cleanup/vendors/{vendor_id}/rules`
   - Payload: Array of CleanupShield objects

5. **Confirmation**
   - UI: Success toast "Vendor rules saved. Will apply to future documents."
   - Audit: Entry created in cleanup_audit_log

---

## Journey 3: Save Template Rule

**Actor:** Manager  
**Goal:** Save cleanup shields as a template rule for specific document layouts

### Steps

1. **Complete Journey 1 steps 1-5** (review document, adjust shields)

2. **Click "Save as Template Rule"**
   - Button: "Save as Template Rule" in Cleanup tab
   - Prerequisite: Template already assigned to case

3. **Confirm Template**
   - Modal: "Save Cleanup Rules for Template"
   - Shows: Template name, vendor association
   - Option: Override vendor rules (checkbox)

4. **Save Rules**
   - Button: "Save" in modal
   - Endpoint: `PUT /api/cleanup/templates/{template_id}/rules`
   - Payload: Array of CleanupShield objects with precedence info

5. **Confirmation**
   - UI: Success toast "Template rules saved."
   - Audit: Entry created in cleanup_audit_log

---

## Journey 4: Session-Only Correction

**Actor:** Reviewer  
**Goal:** Adjust shields for this document only without persisting rules

### Steps

1. **Complete Journey 1 steps 1-4** (open case, view shields)

2. **Disable a Risky Shield**
   - Action: Click shield in list → set Apply Mode to "Disabled"
   - UI: Shield overlay changes to dashed outline (disabled indicator)

3. **Re-run Extraction**
   - Button: "Re-run Extraction"
   - Endpoint: `POST /api/cases/{case_id}/reprocess`
   - Payload includes `session_overrides` array

4. **Complete Review**
   - Button: "Approve & Next"
   - Endpoint: `POST /api/cases/{case_id}/approve`
   - Note: Session overrides are NOT persisted to vendor/template rules

5. **Next Document**
   - UI: Navigate to next case
   - Note: Previous session overrides are discarded

---

## Journey 5: Critical Zone Protection Override

**Actor:** Manager  
**Goal:** Override a shield that overlaps critical zones (Totals, LineItems)

### Steps

1. **View Shield with Warning**
   - Screen: `/review/{case_id}` → Cleanup tab
   - UI: Shield shows warning icon, "Overlaps Totals zone (15%)"
   - Shield status: Forced to "Suggested" with "High" risk

2. **Attempt to Apply Shield**
   - Action: Click shield → try to set Apply Mode to "Applied"
   - UI: Warning modal appears

3. **Review Warning**
   - Modal: "Critical Zone Overlap Warning"
   - Content: "This shield overlaps the Totals zone by 15%. Applying it may hide important data."
   - Options: "Apply Anyway" (requires manager role), "Keep as Suggested", "Cancel"

4. **Explicit Override (Manager only)**
   - Button: "Apply Anyway"
   - Prerequisite: User has `cleanup.save_vendor_rules` capability
   - Action: Shield apply_mode set to "Applied", warning acknowledged

5. **Audit Trail**
   - Endpoint: Audit log records override with user_id, reason, zone overlap details

---

## Screen/Endpoint Summary

| Journey | Key Screens | Key Endpoints |
|---------|-------------|---------------|
| Review Document | `/review/queue`, `/review/{id}` | `GET /api/cases`, `POST /api/cleanup/resolve`, `POST /api/cases/{id}/approve` |
| Save Vendor Rule | `/review/{id}` (modal) | `PUT /api/cleanup/vendors/{id}/rules` |
| Save Template Rule | `/review/{id}` (modal) | `PUT /api/cleanup/templates/{id}/rules` |
| Session Correction | `/review/{id}` | `POST /api/cases/{id}/reprocess` |
| Critical Override | `/review/{id}` (modal) | Audit log only |

---

## Button/Action Reference

| Button | Location | Action | Endpoint |
|--------|----------|--------|----------|
| "Show shields (resolved)" | Cleanup tab toggle | Switch overlay view | Client-side |
| "Show suggestions (auto)" | Cleanup tab toggle | Switch overlay view | Client-side |
| "Draw New Shield" | Cleanup tab toolbar | Enter draw mode | Client-side |
| "Re-run Extraction" | Cleanup tab | Reprocess with shields | `POST /api/cases/{id}/reprocess` |
| "Save as Vendor Rule" | Cleanup tab | Open save modal | `PUT /api/cleanup/vendors/{id}/rules` |
| "Save as Template Rule" | Cleanup tab | Open save modal | `PUT /api/cleanup/templates/{id}/rules` |
| "Approve & Next" | Review workspace footer | Approve and navigate | `POST /api/cases/{id}/approve` |
