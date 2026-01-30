# Implementation Plan: Navigation Consolidation

## Overview

This implementation plan consolidates EasySale's multiple navigation systems into a single, consistent layout shell. The approach follows the NO DELETES policy - legacy code is quarantined, not removed. Tasks are organized to build incrementally, with audit/documentation first, then structural changes, then new features.

## Tasks

- [x] 1. Audit and Documentation Phase
  - [x] 1.1 Create route audit document
    - Scan all routes in App.tsx and document: path → component → layout chain → status
    - Output to `audit/ROUTES_FRONTEND.md`
    - _Requirements: 1.1, 4.1_
  
  - [x] 1.2 Create navigation mount audit
    - Identify all components that render navigation (AppLayout, AppShell, Navigation, Sidebar)
    - Document where each mounts and why duplicates occur
    - Output to `audit/NAV_MOUNTS.md`
    - _Requirements: 1.2, 1.4_
  
  - [x] 1.3 Create legacy UI map
    - Identify legacy components, pages, and CSS to quarantine
    - Document quarantine plan with old path → new path mapping
    - Output to `audit/LEGACY_UI_MAP.md`
    - _Requirements: 1.3, 13.4_
  
  - [x] 1.4 Create settings matrix
    - Classify all settings by scope (User/Tenant/System)
    - Document storage location and UI location for each
    - Output to `audit/SETTINGS_MATRIX.md`
    - _Requirements: 7.1, 7.3_
  
  - [x] 1.5 Create branding assets documentation
    - Document logo/favicon pipeline and supported formats
    - Output to `audit/BRANDING_ASSETS.md`
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 1.6 De-CAPS string and fixture sweep
    - Grep for: CAPS, caps-pos, caps, 192.168, admin123, caps-pos.local, @caps
    - Document all hits with file paths and remediation plan
    - Must include: total hits count, grouped by category (seeds, UI strings, fixtures, domains), "expected post-fix: 0 hits" checklist
    - Output to `audit/DECAPS_SWEEP.md`
    - _Requirements: 8.1_

- [x] 2. Gate A - Audit Complete
  - Verify all 6 audit documents exist and contain required content
  - Output proof: list of audit doc paths with line counts
  - Run DOM assertion: count sidebar elements in test render
  - DECAPS_SWEEP.md must contain actionable remediation plan
  - _Gate: Must have all audit docs with complete content_

- [x] 3. De-CAPS Implementation
  - [x] 3.1 Replace CAPS-specific seed data
    - Update seed user emails: admin@caps-pos.local → admin@EasySale.local
    - Update demo store names in UI
    - Update any "CAPS POS" header text to "EasySale"
    - _Requirements: 8.1_
  
  - [x] 3.2 Update local domains and placeholders
    - Replace caps-pos.local with EasySale.local
    - Update sample config files
    - Update default receipt templates
    - _Requirements: 8.1_
  
  - [x] 3.3 Update fixture files and test snapshots
    - Search for CAPS references in test fixtures
    - Update to EasySale-neutral values
    - _Requirements: 8.1_

- [x] 4. Legacy Quarantine Phase
  - [x] 4.1 Create quarantine directory structure
    - Create `frontend/src/legacy_quarantine/` directory
    - Create subdirectories: components/, styles/, pages/
    - _Requirements: 4.2_
  
  - [x] 4.2 Quarantine legacy navigation CSS
    - Move any legacy blue gradient sidebar CSS to quarantine
    - Search for inline hardcoded blues and tokenize
    - Update quarantine mapping documentation
    - _Requirements: 5.3, 3.2_
  
  - [x] 4.3 Quarantine duplicate navigation components
    - Identify and move any duplicate/legacy navigation components
    - Ensure no imports from quarantine in active code
    - _Requirements: 4.2, 14.3_
  
  - [x] 4.4 Write property test for no legacy imports (REQUIRED)
    - **Property 4: No Legacy Components in Active Tree**
    - Static analysis test to verify no imports from legacy_quarantine
    - **Validates: Requirements 4.2, 14.3**

- [x] 5. Navigation Configuration Update
  - [x] 5.1 Update navigation config with sections
    - Add section field to NavigationItem interface
    - Reorganize items into main and admin sections
    - Remove top-level Settings (move to profile menu)
    - _Requirements: 3.4, 3.5, 3.6, 3.7_
  
  - [x] 5.2 Create admin sub-navigation config
    - Define adminSubNavItems array with all admin sub-routes
    - Include: Setup Wizard, Users, Store Config, Taxes, Pricing, Branding, Integrations, etc.
    - _Requirements: 4.1_
  
  - [x] 5.3 Create profile menu config
    - Define profileMenuItems for top-right dropdown
    - Include: My Profile, Preferences, Sign Out
    - _Requirements: 3.4_
  
  - [x] 5.4 Write property test for navigation filtering (REQUIRED)
    - **Property 2: Navigation Configuration Consistency**
    - Test that items appear/hide correctly based on permissions and capabilities
    - Prevents admin links leaking to cashiers
    - **Validates: Requirements 3.4, 3.5, 10.1**

- [x] 6. Admin Information Architecture Consolidation
  - [x] 6.1 Implement Admin shell with subroutes
    - Create AdminLayout component with sub-navigation
    - Define admin route structure: /admin/setup, /admin/users, /admin/store, etc.
    - _Requirements: 4.1_
  
  - [x] 6.2 Move scattered settings pages into Admin structure
    - Identify settings pages outside Admin
    - Re-home them under appropriate Admin subroutes
    - _Requirements: 4.1_
  
  - [x] 6.3 Quarantine old settings routes/pages
    - Move old settings routes to quarantine
    - Update route registry
    - _Requirements: 4.2_
  
  - [x] 6.4 Update Users & Roles to use EasySale-neutral examples
    - Remove CAPS-specific user examples
    - Show empty state unless DEMO_MODE
    - _Requirements: 8.1, 9.1_

- [x] 7. AppLayout Enhancement
  - [x] 7.1 Update AppLayout to be single source of navigation
    - Ensure AppLayout renders sidebar from navigation config
    - Add branding support to header
    - Remove any duplicate navigation rendering
    - _Requirements: 2.1, 2.2, 3.1_
  
  - [x] 7.2 Add profile menu to AppLayout header
    - Create ProfileMenu component with preferences link
    - Replace user menu with ProfileMenu dropdown
    - _Requirements: 3.4_
  
  - [x] 7.3 Add admin sub-navigation support
    - When on /admin/* routes, show admin sub-navigation
    - Use tabs or side list pattern inside admin pages
    - _Requirements: 4.1_
  
  - [x] 7.4 Write property test for single navigation instance (REQUIRED)
    - **Property 1: Single Navigation Instance**
    - Test that exactly one sidebar renders for any route/viewport
    - **Validates: Requirements 2.1, 2.2, 3.1**

- [x] 8. Gate B - Navigation Structure Complete
  - Run test: verify single sidebar in DOM for all routes
  - Run test: verify no legacy imports
  - Output proof: test results log

- [x] 9. Settings Scope Implementation (Early - needed for shell/nav work)
  - [x] 9.1 Create user preferences storage
    - Store user prefs in user profile/localStorage
    - Include: theme, density, shortcuts, default landing page
    - _Requirements: 7.1_
  
  - [x] 9.2 Create preferences page
    - Add /preferences route
    - UI for theme, density, shortcuts
    - _Requirements: 7.1_
  
  - [x] 9.3 Write property test for settings scope

    - **Property 8: Settings Scope Correctness**
    - Test that user prefs are per-user, tenant config is per-tenant
    - **Validates: Requirements 7.1, 7.3**

- [x] 10. Route Registry Enforcement
  - [x] 10.1 Create routeRegistry.ts
    - Single source of truth for all routes
    - Include: path, component, status (active/legacy/quarantined), navSection
    - _Requirements: 4.1, 4.2_
  
  - [x] 10.2 Write route registry enforcement test (REQUIRED)
    - Test that no route points to quarantined/legacy pages
    - Output audit/ROUTE_REGISTRY_DIFF.md (before/after)
    - _Requirements: 4.2, 4.3_

- [x] 11. Page Updates - Remove Nested Navigation
  - [x] 11.1 Update HomePage to remove AppShell sidebar
    - Remove AppShell wrapper with sidebar prop
    - Keep page content, use PageHeader directly
    - _Requirements: 2.4, 3.1_
  
  - [x] 11.2 Update SellPage to remove AppShell sidebar
    - Remove AppShell wrapper with sidebar prop
    - Keep page content, use PageHeader directly
    - _Requirements: 2.4, 3.1_
  
  - [x] 11.3 Update WarehousePage to remove AppShell sidebar
    - Remove AppShell wrapper with sidebar prop
    - Keep page content, use PageHeader directly
    - _Requirements: 2.4, 3.1_
  
  - [x] 11.4 Scan and update all remaining pages
    - Search for AppShell with sidebar prop
    - Search for duplicate nav components
    - Search for layout wrappers in feature pages
    - Remove nested navigation from each
    - _Requirements: 2.4, 3.1_
  
  - [x] 11.5 Write property test for route-navigation sync (REQUIRED)
    - **Property 3: Route-Navigation Synchronization**
    - Test that active state updates correctly on route change
    - Prevents highlight/active state breaks that confuse users
    - **Validates: Requirements 3.7**

- [x] 12. Design Token Enforcement
  - [x] 12.1 Audit navigation CSS for hardcoded values
    - Check Navigation.module.css for any non-token values
    - Replace hardcoded colors/spacing with tokens
    - _Requirements: 5.1, 5.2_
  
  - [x] 12.2 Update sidebar styling to use tokens
    - Ensure all sidebar styles use design token variables
    - Verify consistent icon sizing (24px)
    - _Requirements: 5.4_
  
  - [x] 12.3 Write property test for design token usage

    - **Property 5: Design Token Usage**
    - Test that navigation styles reference tokens not hardcoded values
    - **Validates: Requirements 5.1, 5.2, 5.3**

- [x] 13. Gate C - Page Updates Complete
  - Run full route test: verify single navigation on all pages
  - Output proof: screenshot list or DOM assertion results

- [x] 14. Brand Asset Pipeline
  - [x] 14.1 Implement brand asset conversion script
    - Create script to convert SVG/ICO → PNG/JPG
    - Input: any image format
    - Output: `public/brand/<tenant>/logo.png` + favicon assets
    - _Requirements: 6.2, 6.3_
  
  - [x] 14.2 Add build-time asset validation
    - Validate logo inputs exist and are valid
    - Fail CI if missing/invalid
    - _Requirements: 6.2_
  
  - [x] 14.3 Implement runtime logo fallback
    - If logo fails to load, show text fallback (company shortName or first 2 letters)
    - _Requirements: 6.1_

- [x] 15. Branding Configuration
  - [x] 15.1 Create BrandConfig type and defaults
    - Define BrandConfig interface with all fields
    - Set EasySale-neutral defaults (not CAPS-specific)
    - _Requirements: 6.1_
  
  - [x] 15.2 Update header to use BrandConfig
    - Display appName and logo from config
    - Support light/dark logo variants
    - _Requirements: 6.1, 6.4_
  
  - [x] 15.3 Add theme default support
    - Tenant default theme in BrandConfig
    - User override in preferences
    - _Requirements: 5.5_
  
  - [x] 15.4 Write property test for brand config completeness


    - **Property 6: Brand Configuration Completeness**
    - Test that header renders configured appName and logo
    - **Validates: Requirements 6.1, 6.2**

- [x] 16. Integration Cards and Wiring
  - [x] 16.1 Create IntegrationCard component
    - Display status, actions (connect/configure/test/disconnect)
    - Show empty state for disconnected integrations
    - Disabled state with reason if capability off
    - Error state if capability on but backend missing (this is a bug)
    - _Requirements: 10.1, 10.2_
  
  - [x] 16.2 Update integrations page to use IntegrationCard
    - Replace placeholder text with actionable cards
    - Add WooCommerce, QuickBooks cards
    - _Requirements: 10.1, 10.2_
  
  - [x] 16.3 Implement integration backend wiring
    - Create/verify backend endpoints for integration config
    - Implement Connect flow UI with backend persistence
    - Implement Test Connection action
    - Rule: capability-off = disabled card; capability-on + backend-missing = bug/error state
    - _Requirements: 10.1, 10.2_

- [x] 17. Setup Wizard
  - [x] 17.1 Create SetupWizardPage component
    - Multi-step wizard with required/optional steps
    - Steps: Admin, Store, Taxes, Locations, Branding, Integrations, Import, Test
    - _Requirements: 7.2_
  
  - [x] 17.2 Add first-run detection and redirect
    - Check if tenant is configured
    - Redirect to wizard if not configured
    - Block POS flows until configured
    - _Requirements: 7.2_
  
  - [x] 17.3 Add wizard completion screen
    - "Store is ready" message
    - Link to Sell screen
    - "What's next" suggestions
    - _Requirements: 7.2_

- [x] 18. Demo Mode and Empty States
  - [x] 18.1 Implement DEMO_MODE environment check
    - Add isDemoMode utility function
    - Gate seed data loading behind DEMO_MODE
    - _Requirements: 9.2_
  
  - [x] 18.2 Add demo mode indicator
    - Show visible banner when DEMO_MODE=true
    - Clear labeling that data is not real
    - _Requirements: 9.2_
  
  - [x] 18.3 Update pages to show empty states
    - Replace any mock data with empty state components
    - Ensure lists render empty state component, not "sample rows"
    - Ensure API calls or empty state, never fake data
    - _Requirements: 9.1_
  
  - [x] 18.4 Write property test for empty state vs mock data

    - **Property 7: Empty State vs Mock Data**
    - Test that empty API results show empty state, not mock data
    - **Validates: Requirements 9.1, 9.3**
  
  - [x] 18.5 Write property test for no demo data in prod (REQUIRED)
    - **Property 9: No Demo Data in Production Mode**
    - Test that DEMO_MODE=false means no seed fixtures
    - **Validates: Requirements 8.1, 9.2, 9.3**

- [x] 19. Gate D - Features Complete
  - Run all property tests
  - Verify branding, integrations, wizard, demo mode work
  - Output proof: test results log

- [x] 20. Backend Feature Reachability
  - [x] 20.1 Documents/OCR page functional
    - Real document list with statuses (uploaded → OCR queued → extracted → reviewed → linked)
    - Empty state if no documents
    - Add nav entry under main nav /documents with permission gating
    - _Requirements: 10.2, 12.1_
  
  - [x] 20.2 Parts cross-reference/mapping page
    - Search by internal SKU, external SKU, OCR-extracted part numbers
    - Show resolved price source and match confidence
    - Add nav entry (under Warehouse or Admin→Data) with permission gating
    - _Requirements: 11.1, 11.2_
  
  - [x] 20.3 Exports page functional
    - Real export list/status
    - Empty state if no exports
    - Add nav entry under Admin→Exports with permission gating
    - _Requirements: 10.2_
  
  - [x] 20.4 Capabilities page functional
    - Real capability flags display
    - Add nav entry under Admin→Capabilities with permission gating
    - _Requirements: 10.2_
  
  - [x] 20.5 System Health page functional
    - Sync status, jobs, logs hooks (even minimal)
    - Add nav entry under Admin→System Health with permission gating
    - _Requirements: 10.2_

- [x] 21. Documentation Phase
  - [x] 21.1 Create layout hierarchy documentation
    - Document AppLayout as single shell
    - Explain component hierarchy
    - Output to `docs/ui/layout_hierarchy.md`
    - _Requirements: 2.3_
  
  - [x] 21.2 Create used components documentation
    - List canonical components and where used
    - Output to `docs/ui/USED_COMPONENTS.md`
    - _Requirements: 13.1_
  
  - [x] 21.3 Create legacy quarantine documentation
    - Document what was moved, why, and replacement
    - Output to `docs/ui/LEGACY_QUARANTINE.md`
    - _Requirements: 13.2_
  
  - [x] 21.4 Create navigation config documentation
    - Document menu definition and gating rules
    - Output to `docs/ui/NAV_CONFIG.md`
    - _Requirements: 13.3_
  
  - [x] 21.5 Create information architecture documentation
    - Document final grouping and rationale
    - Output to `docs/ui/INFORMATION_ARCHITECTURE.md`
    - _Requirements: 13.1, 13.2, 13.3_

- [x] 22. Build Clean Verification
  - [x] 22.1 Run frontend build and lint
    - Fix any errors or warnings
    - Ensure no unused imports
    - _Requirements: 14.2, 14.3_
  
  - [x] 22.2 Run backend cargo test
    - Fix any warnings (or document justified exceptions)
    - _Requirements: 14.1_
  
  - [x] 22.3 Create warning fix report
    - Document: warning → file/line → root cause → fix → proof command output
    - Output to `audit/WARNINGS_FIX_REPORT.md`
    - _Requirements: 14.4_

- [x] 23. Final Gate - All Tasks Complete
  - Run all tests and verify pass
  - Verify all documentation exists
  - Output proof: complete test results and doc list

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Tasks marked `(REQUIRED)` are mandatory property tests that protect against regressions
- Required property tests: Property 1 (single nav), Property 2 (permission filtering), Property 3 (route sync), Property 4 (no legacy imports), Property 9 (no demo data in prod), Route Registry enforcement
- Each task references specific requirements for traceability
- Gates replace checkpoints with automated proof artifacts
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- NO DELETES policy: legacy code is quarantined, not removed
- De-CAPS must be done early as it affects routes, seed, labels, and docs
- Settings Scope moved early (after Gate B) because shell/nav work needs preferences
