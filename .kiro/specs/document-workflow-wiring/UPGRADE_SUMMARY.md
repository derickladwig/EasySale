# Backend-Frontend Wiring Audit Spec — v2.0 Upgrade Summary

**Date**: 2026-01-26  
**Upgrade**: v1.0 → v2.0  
**Purpose**: Document high-value improvements to make the audit impossible to miss UI/layout bugs, actionable for implementation, and protected against regressions

---

## What Changed

### 1. Layout & Nav De-duplication Requirements (NEW)

**Problem Solved**: Duplicate navigation rendering (e.g., sidebar appearing twice)

**New Requirements**:
- **NAV-13**: Single Primary Navigation Surface — only one nav UI renders per route
- **NAV-14**: Layout Variant Mapping — every route declares its layout variant
- **NAV-15**: Navigation Source of Truth — nav items defined once, consumed everywhere
- **NAV-16**: Quick Actions vs Navigation — quick actions are task buttons, not duplicate nav

**New Tasks**:
- **Task 0.3 (upgraded)**: Generate Navigation & Layout Composition Map
  - Now includes: where sidebar renders, where icon rail renders, layout nesting hierarchy
  - Outputs: `audit/NAV_AUDIT.md`, `audit/LAYOUT_MAP.md`, `audit/NAV_SOURCES.md`
- **Task 2.6 (new)**: Fix Duplicate Navigation Rendering
  - Identify and fix duplicate nav
  - Add Playwright screenshot assertion

**Design Section**: Section 0.1 — Layout & Navigation De-duplication Strategy

---

### 2. Feature Matrix Data Contracts & Ownership (ENHANCED)

**Problem Solved**: Matrix shows "Wired" but doesn't document what data flows or who owns it

**New Matrix Columns**:
- **Request/Response Schema**: Links to TypeScript types or inline schema
- **State Owner**: React Query key, Zustand slice, Redux slice, local state
- **UI Affordance**: list, detail, modal, background job, N/A
- **User Persona**: cashier, manager, admin, system
- **Priority**: P0/P1/P2/P3 with rationale
- **Implementation Owner**: frontend, backend, both, external

**Updated Requirements**:
- **MAT-8**: Data Contract Documentation
- **MAT-9**: State Ownership Documentation
- **MAT-10**: UI Affordance Classification
- **MAT-11**: User Persona Assignment
- **MAT-12**: Priority Assignment
- **MAT-13**: Implementation Ownership

**Updated Tasks**:
- **Task 1.1-1.11 (all matrix tasks)**: Now include data contract, state owner, UI affordance, persona, priority, and ownership documentation

**Design Section**: Section 0.2 — Data Contract Documentation Strategy

---

### 3. Runtime Evidence Requirement (NEW)

**Problem Solved**: Grep shows code exists but doesn't prove it works at runtime

**New Requirement**:
- **EV-6**: Runtime Proof for "Wired" Status
  - Network request screenshot/log, OR
  - curl command + response sample, OR
  - Playwright trace showing console-free load

**New Task**:
- **Task 3.7 (new)**: Verify Runtime Wiring
  - Collect runtime proof for each "Wired" matrix row
  - Mark routes that 500 or fail auth as Partial/Missing
  - Output: `audit/RUNTIME_PROOF/` directory

**Design Section**: Section 0.3 — Runtime Evidence Strategy

---

### 4. Dead/Unused Code Handling (ENHANCED)

**Problem Solved**: Need to distinguish backend-only routes, orphan pages, and duplicate features

**New Requirements**:
- **IMP-9**: Orphan UI Resolution Policy
  - Every orphan page: routed + linked, OR feature-flagged, OR quarantined
- **IMP-10**: Duplicate Capability Consolidation
  - Choose one canonical path, document others as legacy/quarantined

**Existing Tasks Enhanced**:
- **Task 3.5**: Verify No Orphan Pages (now enforces IMP-9)
- **Task 2.4**: Document Backend-Only Features (now enforces IMP-10)

---

### 5. Regression Guardrails (NEW)

**Problem Solved**: Audit is point-in-time; code can drift without detection

**New Requirements**:
- **QG-10**: Route Inventory Drift Check
  - Script compares audit docs vs actual code
  - Fails CI if drift exceeds threshold
- **QG-11**: E2E Smoke Tests Policy
  - Playwright runs in CI OR documented manual run command

**New Tasks**:
- **Task 3.6 (new)**: Create Route Drift Check Script
  - Script: `scripts/check-route-drift.js`
  - Output: `audit/ROUTE_DRIFT_REPORT.md`
- **Task 2.6 (new)**: Fix Duplicate Navigation Rendering
  - Includes Playwright test: `frontend/e2e/nav-deduplication.spec.ts`

**Design Section**: Section 0.4 — Regression Guardrails Strategy

---

### 6. Improved Wording (FIXED)

**Problem Solved**: "Each route/handler has exactly one row" breaks on grouped capabilities

**Fixed Requirement**:
- **MAT-1 (improved)**: "Each backend endpoint has a row, and endpoints may be grouped under a Capability ID. Multiple routes serving the same capability may share a row."

---

## File Changes Summary

### requirements.md
- **Version**: 1.0 → 2.0
- **Added**: 13 new requirement IDs (NAV-13 through NAV-16, MAT-8 through MAT-13, IMP-9, IMP-10, QG-10, QG-11, EV-6)
- **Updated**: MAT-1 wording improved
- **New Section**: 3.4 Layout & Navigation De-duplication

### design.md
- **Version**: 1.0 → 2.0
- **Added**: Section 0 — Design Enhancements (v2.0)
  - 0.1 Layout & Navigation De-duplication Strategy
  - 0.2 Data Contract Documentation Strategy
  - 0.3 Runtime Evidence Strategy
  - 0.4 Regression Guardrails Strategy

### tasks.md
- **Version**: 1.0 (unchanged, but content updated)
- **Upgraded**: Task 0.3 (Navigation Map → Navigation & Layout Composition Map)
- **Enhanced**: Task 1.1-1.11 (all matrix tasks now include data contracts)
- **Added**: Task 2.6 (Fix Duplicate Navigation Rendering)
- **Added**: Task 3.6 (Create Route Drift Check Script)
- **Added**: Task 3.7 (Verify Runtime Wiring)
- **Updated**: Summary Checklist to reflect new tasks
- **Updated**: Appendix: File Outputs to include new files

---

## New Deliverables

### Documentation
- `audit/LAYOUT_MAP.md` — Layout nesting hierarchy
- `audit/NAV_SOURCES.md` — Navigation source definitions
- `audit/ROUTE_DRIFT_REPORT.md` — Route drift check output
- `audit/RUNTIME_PROOF/` — Runtime evidence directory

### Scripts
- `scripts/check-route-drift.js` — Route drift check script

### Tests
- `frontend/e2e/nav-deduplication.spec.ts` — Nav deduplication Playwright test

### Enhanced Existing
- `audit/FEATURE_MATRIX.md` — Now includes data contracts, state ownership, UI affordance, persona, priority, implementation owner

---

## Implementation Impact

### Epic 0: Evidence Dump
- **Before**: 5 tasks
- **After**: 5 tasks (Task 0.3 upgraded with more outputs)
- **Impact**: +2 new output files (LAYOUT_MAP.md, NAV_SOURCES.md)

### Epic 1: Feature Matrix Build
- **Before**: 11 tasks
- **After**: 11 tasks (all enhanced with data contract requirements)
- **Impact**: Matrix now has 6 additional columns per row

### Epic 2: Wiring Fixes
- **Before**: 5 tasks
- **After**: 6 tasks (+Task 2.6 for nav deduplication)
- **Impact**: +1 Playwright test file

### Epic 3: Validation
- **Before**: 5 tasks
- **After**: 7 tasks (+Task 3.6 drift check, +Task 3.7 runtime proof)
- **Impact**: +1 script, +1 audit output directory

### Epic 4: Documentation
- **Before**: 3 tasks
- **After**: 3 tasks (unchanged)
- **Impact**: None

---

## Benefits

### 1. Impossible to Miss UI/Layout Bugs
- Explicit layout nesting documentation
- Nav source mapping prevents duplicate definitions
- Playwright test catches duplicate rendering
- Visual regression protection

### 2. Matrix Actionable for Implementation
- Data contracts show what to implement
- State ownership shows where to put it
- UI affordance shows how to present it
- Priority shows what to do first
- Persona shows who it's for

### 3. Guardrails Prevent Regressions
- Route drift check catches missing/extra routes
- Nav deduplication test catches duplicate rendering
- Runtime proof catches broken wiring
- CI integration makes checks automatic

---

## Migration Notes

### For Existing Implementations
If you've already started implementing v1.0 tasks:

1. **Task 0.3**: Re-run with expanded scope to generate LAYOUT_MAP.md and NAV_SOURCES.md
2. **Task 1.x**: Add data contract columns to existing matrix rows
3. **Task 2.6**: New task — add to backlog
4. **Task 3.6**: New task — add to backlog
5. **Task 3.7**: New task — add to backlog

### For New Implementations
Start with v2.0 spec from the beginning. All tasks include enhanced requirements.

---

## Questions & Clarifications

### Q: Do I need to redo completed v1.0 tasks?
**A**: Only Task 0.3 needs re-running to generate additional outputs. Other tasks can be enhanced incrementally.

### Q: Are the new columns required for all matrix rows?
**A**: Yes, but you can mark some as "N/A" if not applicable (e.g., backend-only routes don't need UI affordance).

### Q: Can I skip runtime proof for low-priority features?
**A**: No. Runtime proof is required for "Wired" status. If you can't provide proof, mark as "Partial" or "Missing".

### Q: Do I need to implement the drift check script immediately?
**A**: No. It's part of Epic 3 (Validation). But it's highly recommended for CI integration.

---

## Approval & Sign-off

- [ ] Requirements v2.0 reviewed and approved
- [ ] Design v2.0 reviewed and approved
- [ ] Tasks updated and approved
- [ ] Team briefed on v2.0 enhancements
- [ ] Ready to begin implementation

---

**Spec Location**: `.kiro/specs/document-workflow-wiring/`  
**Files Updated**: `requirements.md`, `design.md`, `tasks.md`  
**New File**: `UPGRADE_SUMMARY.md` (this file)
