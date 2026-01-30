# Implementation Plan: Document Cleanup Engine (DCE) — Production-Ready, Fully Wired UX + Navigation

## Overview

Transform the existing Mask Engine into the Document Cleanup Engine (DCE) with:
- Renamed user-facing terminology ("Cleanup Shields")
- Multi-tenant + store scoping
- Rule persistence + audit trail (NO DELETES)
- Review Workspace integration with side-by-side viewer + editable controls
- Fully implemented navigation, routes, tabs, and button wiring so users can complete real workflows without dead ends

## Non-Negotiables

- **NO DELETES** (archive/supersede only; history remains queryable)
- **Fail-open** (cleanup detection never blocks OCR/extraction pipeline)
- **Multi-tenant + store scoped** (tenant_id + store_id enforced server-side for all reads/writes)
- **No fake UI** (no simulated tabs/pages; all tabs/buttons are wired or capability-gated)
- **One truth for navigation** (single source of routes/tabs/feature status)
- **Proof-driven completion**: each task ends with evidence artifacts

## Tasks

- [x] 1. Product Reality: Users, Journeys, Screens, Buttons (Phase 0)
  - [x] 1.1 Define Users + Permissions
    - Create `docs/ux/ROLES_AND_PERMISSIONS.md`
    - List roles: cashier / reviewer / manager / admin
    - For each feature, list required role + capability flag
    - _Requirements: 11.1_
    - Evidence: capabilities endpoint returns stable permission/capability shape
  
  - [x] 1.2 Define Primary User Journeys
    - Create `docs/ux/DCE_USER_JOURNEYS.md` with step-by-step flows:
      - Review a document (queue → case → viewer → cleanup tab → adjust → rerun → complete)
      - Save vendor rule (adjust → Save as Vendor Rule → auto-apply on next doc)
      - Save template rule (select template → Save as Template Rule → precedence override)
      - Session-only correction (disable risky shield → rerun → complete → no persistence)
      - Critical-zone protection (overlaps totals → forced Suggested + warning → explicit override)
    - Each journey lists: exact screens, exact buttons, exact endpoints
    - _Requirements: 10.6_
  
  - [x] 1.3 Create Screen/Route Inventory
    - Create `audit/ROUTES_FRONTEND.md`: every route, page component, nav exposure, required capability, required role
    - Create `audit/ROUTES_BACKEND.md`: every endpoint, auth scope (tenant/store), called-by pages
    - Rule: no route may exist without an entry; no nav item may exist without a route
    - _Requirements: 11.1_
    - Evidence: route scanner script output committed
  
  - [x] 1.4 Create Button/Action Inventory
    - Create `audit/UI_ACTIONS_MAP.md` with every interactive control:
      - button/menu/tab/row click/shortcut
      - event → handler → API call → success UI → failure UI → fallback behavior
      - empty-state behavior if capability disabled
    - Rule: anything clickable must be in the map
    - _Requirements: 10.6_

- [x] 2. Capability Gating + Navigation System (Phase 1)
  - [x] 2.1 Add Capabilities Contract (backend)
    - Add `GET /api/meta/capabilities` endpoint
    - Returns features per tenant/store with status: ready | beta | comingSoon | hidden
    - Include reason text for tooltips/modals
    - Include permission summary (role-based)
    - Hard rule: tenant/store derived from auth context, not passed by client
    - _Requirements: 11.1_
    - Evidence: audit/ROUTES_BACKEND.md entry + contract test
  
  - [x] 2.2 Centralize Nav + Tabs (single source of truth)
    - Create `frontend/src/nav/navConfig.ts`: sidebar groups, items, route, icon, capabilityKey, featureStatus, order, group
    - Create `frontend/src/nav/tabsConfig.ts`: per-page tab definitions + gating rules
    - Add shared components: NavItem, PageTabs, RouteGuard
    - _Requirements: 10.6_
    - Evidence: no page defines tabs locally; everything reads shared config
  
  - [x] 2.3 Implement Standard ComingSoon/Hidden/Disabled Behaviors
    - Hidden: not rendered
    - ComingSoon: badge + tooltip, click opens modal (no navigation)
    - Disabled (no permission): lock + tooltip, click shows explanation
    - _Requirements: 10.6_
    - Evidence: clicking any non-ready item never routes to blank page
  
  - [x] 2.4 Add Placeholder + Fake Metrics Elimination Gate
    - Add CI guard: block merges if "placeholder/mock/TODO/coming soon" in UI outside allowlist
    - Add CI guard: block merges if fake metrics patterns exist (hardcoded 0, "Pending: 0" stubs)
    - _Requirements: 10.6_
    - Evidence: scanner runs in CI, produces report artifact

- [x] 3. Checkpoint - No dead placeholder pages
  - Evidence: audit/ROUTES_FRONTEND.md complete, no tab navigates to blank page
  - If blocked: write BLOCKERS.md entry, continue with other tasks.

- [x] 4. Backend Core: cleanup_engine module structure
  - [x] 4.1 Create module directory structure
    - Create `backend/crates/server/src/services/cleanup_engine/`
    - Create mod.rs, types.rs, config.rs, engine.rs
    - Create detectors/ subdirectory with mod.rs
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 4.2 Implement core types in types.rs
    - Define CleanupShield, ShieldType, ApplyMode, RiskLevel, PageTarget, ZoneTarget, NormalizedBBox
    - Define ShieldProvenance, ShieldSource
    - Add zone constants (ZONE_LINE_ITEMS, ZONE_TOTALS, etc.)
    - Add overlap threshold constants
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [x] 4.3 Implement bbox math helpers
    - Add bbox_intersection_area(), bbox_iou(), calculate_overlap_ratio()
    - Add normalize_bbox(), denormalize_bbox() (saturating + clippy-clean)
    - _Requirements: 6.1, 6.2_
  
  - [x] 4.4 Write property test for bbox math helpers
    - **Property 4: Normalized BBox Validation**
    - **Validates: Requirements 4.1**
    - Evidence: cargo test passes

- [x] 5. Implement CleanupEngine core + fail-open
  - [x] 5.1 Implement CleanupEngineConfig in config.rs
    - Add all config fields with defaults
    - Add #[must_use] attributes on new() and with_config()
    - _Requirements: 2.3_
  
  - [x] 5.2 Implement CleanupEngine struct in engine.rs
    - Port detection logic from mask_engine.rs
    - Fix all clippy warnings (saturating casts, remove unnecessary Result wrapping)
    - Make detection methods return bool directly where they cannot fail
    - Add # Errors documentation on Result-returning methods
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 3.1, 3.2_
  
  - [x] 5.3 Implement auto_detect_shields_safe() wrapper
    - Return empty shields + warnings on error
    - Log failures without blocking pipeline
    - Default auto-detected shields to Suggested unless high-confidence + low-risk
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [x] 5.4 Enforce multi-tenant guard rails
    - Every persistence method takes tenant/store from request context
    - Apply tenant/store in all queries
    - _Requirements: 9.1, 9.2_
    - Evidence: unit/integration tests prove cross-tenant reads return empty
  
  - [x] 5.5 Write property tests for safe casting and fail-open
    - **Property 2: Safe Type Casting**
    - **Property 14: Fail-Open Behavior**
    - **Validates: Requirements 2.1, 2.2, 13.1, 13.2, 13.3**
    - Evidence: unit tests for fail-open + log warnings emitted

- [x] 6. Checkpoint - Core types compile
  - Evidence: cargo test passes, audit/ROUTES_BACKEND.md updated
  - If blocked: write BLOCKERS.md entry, continue with other tasks.

- [x] 7. Backward compatibility wrapper (NO DELETES)
  - [x] 7.1 Update mask_engine.rs as compatibility wrapper
    - Re-export CleanupShield as Mask, ShieldType as MaskType, etc.
    - Add deprecated attributes on old method names
    - Delegate all calls to cleanup_engine module
    - _Requirements: 1.5, 1.6_
  
  - [x] 7.2 Write property test for backward compatibility
    - **Property 1: Backward Compatibility Alias**
    - **Validates: Requirements 1.6**
    - Evidence: property tests for type alias + API proxy equivalence

- [x] 8. Detection algorithms
  - [x] 8.1 Port and fix logo detection
    - Move to cleanup_engine/detectors/logo.rs
    - Fix clippy warnings, use saturating casts, return bool directly
    - _Requirements: 2.1, 2.4_
  
  - [x] 8.2 Port and fix watermark detection
    - Move to cleanup_engine/detectors/watermark.rs
    - Fix clippy warnings, use saturating casts
    - _Requirements: 2.1, 2.4_
  
  - [x] 8.3 Port and fix repetitive region detection
    - Move to cleanup_engine/detectors/repetitive.rs
    - Fix clippy warnings
    - _Requirements: 2.1, 2.4_
  
  - [x] 8.4 Implement multi-page strip detection
    - Create cleanup_engine/detectors/multi_page.rs
    - Compare top/bottom strips across pages
    - Boost confidence for stable patterns
    - _Requirements: 7.1, 7.2_
  
  - [x] 8.5 Write property test for multi-page confidence boost
    - **Property 9: Multi-Page Detection Confidence Boost**
    - **Validates: Requirements 7.1, 7.2**
    - Evidence: property test for monotonic confidence across N pages

- [x] 9. Precedence resolution
  - [x] 9.1 Implement precedence resolver in precedence.rs
    - Implement merge_shields() with IoU-based de-duplication
    - Apply critical zone overlap policy deterministically
    - Generate PrecedenceExplanation for each resolved shield
    - Generate ZoneConflict for critical zone overlaps
    - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2_
  
  - [x] 9.2 Write property tests for precedence
    - **Property 7: Precedence Resolution**
    - **Property 8: Critical Zone Protection**
    - **Validates: Requirements 5.1, 5.2, 5.3, 6.1, 6.2**
    - Evidence: property tests for precedence ordering + critical-zone forced Suggested

- [x] 10. Checkpoint - Detection and precedence work
  - Evidence: all property tests pass
  - If blocked: write BLOCKERS.md entry, continue with other tasks.

- [x] 11. Database persistence (Multi-tenant correct)
  - [x] 11.1 Create database migration for cleanup tables
    - Create vendor_cleanup_rules table with tenant_id, store_id, versioning, archived_at
    - Create template_cleanup_rules table with tenant_id, store_id, versioning, archived_at
    - Create cleanup_audit_log table (no 'delete' action)
    - Create review_case_shields table
    - Add all indexes
    - _Requirements: 9.1, 9.2, 9.3_
    - Evidence: migration applies cleanly on empty DB and existing DB
  
  - [x] 11.2 Implement persistence layer in persistence.rs
    - Implement save_vendor_rules() with versioned insert+archive (supersede pattern)
    - Implement save_template_rules() with versioned insert+archive
    - Implement get_vendor_rules(), get_template_rules()
    - Implement audit logging
    - Add fallback to in-memory on database error (fail-open with warnings)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  
  - [x] 11.3 Write property test for rule persistence round-trip
    - **Property 10: Rule Persistence Round-Trip**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.5**
    - Evidence: save→load roundtrip + audit record exists

- [x] 12. Checkpoint - Persistence works
  - Evidence: property tests pass, audit log entries created
  - If blocked: write BLOCKERS.md entry, continue with other tasks.

- [x] 13. API Layer (Contracts match UI state machine)
  - [x] 13.1 Create cleanup API handlers
    - POST /api/cleanup/detect
    - POST /api/cleanup/resolve (accepts review_case_id or document_id, server resolves file path internally)
    - GET/PUT /api/cleanup/vendors/{vendor_id}/rules
    - GET/PUT /api/cleanup/templates/{template_id}/rules
    - POST /api/cleanup/render-overlay
    - POST /api/review/{case_id}/cleanup-snapshot
    - Hard rule: frontend never sends file paths; backend looks up paths from DB/storage
    - _Requirements: 11.1_
  
  - [x] 13.2 Create backward-compatible mask API proxies
    - POST /api/masks/detect → /api/cleanup/detect
    - GET/PUT /api/masks/vendor/{id} → /api/cleanup/vendors/{id}/rules
    - Translate terminology in request/response (lossless)
    - _Requirements: 11.2, 11.3_
  
  - [x] 13.3 Write API contract tests
    - **Property 12: Backward Compatible API**
    - **Validates: Requirements 11.2, 11.3**
    - Evidence: API contract tests + updated audit/ROUTES_BACKEND.md
    - Contract tests run in CI

- [x] 14. Overlay rendering
  - [x] 14.1 Implement renderer in renderer.rs
    - Draw semi-transparent colored overlays (using theme tokens)
    - Use distinct colors per shield type
    - Draw bounding box borders
    - Show zone boundaries
    - Highlight critical zone intersections
    - Include legend
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [x] 14.2 Write property test for overlay rendering
    - **Property 11: Overlay Rendering Correctness**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

- [x] 15. Checkpoint - API and rendering work
  - Evidence: API contract tests pass
  - If blocked: write BLOCKERS.md entry, continue with other tasks.

- [x] 16. Frontend Review Workspace: Side-by-side editable workflow (Phase 6)
  - [x] 16.1 Add cleanup theme tokens to tokens.css
    - Add :root tokens for all shield type colors
    - Add :root.dark overrides for dark mode
    - _Requirements: 10.2_
  
  - [x] 16.2 Create and implement Review State Machine
    - Create `docs/ux/REVIEW_STATE_MACHINE.md` with states:
      - loading_case, ready, saving_rules_vendor, saving_rules_template, rerunning_extraction, error_nonblocking
    - Implement the states in code (not just documented)
    - _Requirements: 10.6_
    - Evidence: forced API failures don't lose user-drawn shields; session overrides persist locally until success
  
  - [x] 16.3 Scan and update existing review components
    - Locate MaskTool.tsx, rename to CleanupShieldTool.tsx (keep old file archived)
    - Update to use new /api/cleanup/* endpoints
    - Update ZoneEditor.tsx with overlap warnings UI
    - Update RegionSelector.tsx to use normalized coordinates end-to-end
    - _Requirements: 3.3, 10.6_
  
  - [x] 16.4 Implement Cleanup tab in Review Workspace
    - Add toggle: "Show shields (resolved)" vs "Show suggestions (auto)"
    - Add per-shield quick actions (Apply/Suggest/Disable)
    - Add scope controls (page targeting, zone targeting)
    - Add "Save as" buttons (Vendor Rule, Template Rule, Session)
    - Add "Re-run extraction" button (calls pipeline with current resolved shields)
    - Show precedence explanations and warnings clearly
    - _Requirements: 10.6_
  
  - [x] 16.5 Implement viewer + overlay + drawing tool
    - Overlay toggles: resolved vs suggestions
    - Draw new shield (normalized coords)
    - Snap helpers (optional)
    - _Requirements: 10.6_
    - Evidence: drawing works at any zoom/rotate and produces stable normalized bbox
  
  - [x] 16.6 Implement wiring rules (no silent failures)
    - For every API call: show "working" indicator, success toast, failure toast
    - Preserve user edits in session overrides on failure
    - _Requirements: 10.6_
    - Evidence: forced API failure (dev mode) doesn't lose drawn shields

- [x] 17. Global UI/Nav Readability + Simulated Tabs Fixes (Phase 7)
  - [x] 17.1 Implement Tabs readability standard (PageTabs component)
    - Tabs become segmented pills with larger padding, bold active label
    - Subtle active underline or background
    - Optional badge counts
    - Status badges (beta/comingSoon)
    - Consistent hover/focus outline
    - Minimum contrast in dark mode (token-based)
    - _Requirements: 10.6_
    - Evidence: every tab row uses PageTabs, not ad-hoc markup
  
  - [x] 17.2 Implement Sidebar/nav readability standard
    - Increase hit target height (44–48px)
    - Active state: strong background + left accent bar
    - Icons: consistent size + alignment
    - Collapse groups cleanly
    - Keyboard focus ring visible
    - Text contrast increased (tokens)
    - _Requirements: 10.6_
    - Evidence: nav is readable at a glance; keyboard navigation is obvious
  
  - [x] 17.3 Replace simulated feature tabs with real gating
    - For module pages with non-working tabs (Inventory/Receiving/Transfers/Vendor Bills/Alerts):
      - ready: routes to implemented content
      - comingSoon: stays on page, shows ComingSoon panel
      - hidden: removed entirely
    - Fix metric cards: if fake/hardcoded → hide or show "Not available yet"
    - _Requirements: 10.6_
    - Evidence: no tabs route to empty pages, no fake "0" dashboards

- [x] 18. Update documentation
  - [x] 18.1 Update mask_engine_README.md
    - Document new naming (CleanupShield, CleanupEngine)
    - Document backward compatibility
    - Update API examples
    - _Requirements: 3.3_

- [x] 19. Implement outcome tracking
  - [x] 19.1 Add outcome tracking tables and logic
    - Track edits needed in review
    - Track extraction confidence improvements
    - Support vendor-specific threshold adjustments
    - _Requirements: 12.1, 12.2, 12.3_
  
  - [x] 19.2 Write property test for outcome tracking
    - **Property 13: Outcome Tracking**
    - **Validates: Requirements 12.1, 12.2, 12.3**

- [x] 20. Final Proof + CI Gates (Definition of Done)
  - [x] 20.1 Run must-pass commands
    - Backend: `cargo build --release`, `cargo test`, `cargo clippy`
    - Frontend: `npm run build`, `npx tsc --noEmit`
    - _Requirements: All_
  
  - [x] 20.2 Verify must-exist artifacts
    - audit/ROUTES_FRONTEND.md
    - audit/ROUTES_BACKEND.md
    - audit/UI_ACTIONS_MAP.md
    - docs/ux/DCE_USER_JOURNEYS.md
    - docs/ux/REVIEW_STATE_MACHINE.md
    - docs/ux/ROLES_AND_PERMISSIONS.md
    - BLOCKERS.md (only if needed)
    - _Requirements: All_
  
  - [x] 20.3 Add CI gates
    - Placeholder scanner
    - API contract tests (cleanup + mask proxies)
    - Lint: no nav items without capability gate
    - _Requirements: All_
    - Evidence: If these artifacts aren't updated, the work is not "done"

## Notes

- All tasks are required for production-ready implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation - if blocked, document in BLOCKERS.md and continue
- Property tests validate universal correctness properties
- All changes follow NO DELETES policy - existing code preserved with wrappers
- UI must reflect real capabilities - no dead placeholder pages
- Every task ends with a concrete "evidence artifact" (routes list, button map, API contract tests, screenshots, etc.)
