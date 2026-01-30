# Requirements Document

## Introduction

EasySale currently renders multiple navigation systems (icon rail + legacy blue sidebar + modern sidebar) and mixes old/new pages/styles. This feature consolidates the app into one layout shell, one navigation system, one routing map, and a white-label branding pipeline (logo + app name + colors), while ensuring no mock data, no hardcoded credentials, and all backend features are reachable via real UI pages.

## Non-Negotiables

- **NO DELETES**: Legacy code/pages MUST be quarantined/archived with OldPath → NewPath mapping + rationale
- **No "fix by suppressing"**: Warnings must be removed by making the code used + correct (or intentionally archived and not imported)
- **No mock data in production routes**: Demo/dev seed data must be explicitly gated

## Glossary

- **AppLayout**: The single top-level authenticated shell providing header + sidebar + content
- **Navigation_Config**: Data-driven definition of menu items (route, label, icon, capability, permission, badges)
- **Legacy_Blue_Sidebar**: Old gradient/nav CSS + menu
- **Icon_Rail**: Narrow icon strip nav (approximately 30px wide)
- **Modern_Sidebar**: Current flat dark/charcoal sidebar using design tokens
- **BrandConfig**: Runtime branding configuration (name, logo, theme accents)
- **TenantConfig**: Store/branch-specific defaults (tax, currency, rounding, pricing rules)
- **Documents_OCR**: Ingestion, indexing, OCR extraction, cross-linking to parts
- **AppShell**: A layout component that provides CSS Grid-based layout with sidebar, header, and content slots
- **Navigation_Component**: The `Navigation.tsx` component that renders sidebar or mobile navigation

## Goals

1. One navigation experience everywhere (no duplicate nav, no legacy sidebar)
2. One route map (no old pages still mounted)
3. White-label "EasySale style" branding configurable per tenant (logo/name/colors)
4. No hardcoded credentials (no admin/admin123)
5. No mock data on real pages; all pages use backend APIs or show "empty state"
6. All backend features are reachable through real UI pages and routes
7. Build clean: cargo test and frontend build/lint should complete without warnings

## Non-Goals

- Rewriting backend architecture (this is UI wiring + consolidation + defaults + branding + correctness)
- Feature redesign of all POS workflows (unless needed to unblock missing wiring)

## Requirements

### Requirement 1: Navigation and Layout Audit

**User Story:** As a developer, I want to identify all navigation/layout mounts so I can remove duplication safely.

#### Acceptance Criteria

1. THE Audit SHALL output `audit/ROUTES_FRONTEND.md` documenting route → page component → layout chain → status (used/legacy)
2. THE Audit SHALL output `audit/NAV_MOUNTS.md` documenting every nav renderer and where it mounts
3. THE Audit SHALL output `audit/LEGACY_UI_MAP.md` documenting old pages/components/CSS with quarantine plan
4. THE Audit SHALL identify why duplicates happen (e.g., AppLayout + AppShell sidebar nesting)
5. THE Audit SHALL identify styling approach per nav component (tokens/tailwind/css modules/inline)

### Requirement 2: Single Layout Shell

**User Story:** As a user, I want consistent nav/header across pages.

#### Acceptance Criteria

1. THE System SHALL render all authenticated routes inside exactly one AppLayout
2. THE System SHALL NOT nest sidebars (AppShell must not inject sidebar if AppLayout already provides one)
3. THE System SHALL document the layout hierarchy in `docs/ui/layout_hierarchy.md`
4. WHEN a page uses AppShell, THE Page SHALL NOT pass a sidebar prop if AppLayout already provides navigation

### Requirement 3: Consolidated Navigation Pattern

**User Story:** As a product owner, I want one coherent navigation system.

#### Acceptance Criteria

1. THE System SHALL render exactly one sidebar/nav on desktop
2. THE System SHALL NOT render the Legacy_Blue_Sidebar on any route
3. THE Icon_Rail SHALL be either removed/quarantined OR merged as an intentional "collapsed sidebar mode" using the same config and active state
4. THE Navigation SHALL support responsive behavior (desktop sidebar, mobile overlay/bottom)
5. THE Navigation SHALL support permission and capability filters
6. THE Navigation SHALL support badge counts for notification indicators
7. THE Navigation SHALL support active route highlighting
8. THE Navigation SHALL support keyboard navigation and focus states

### Requirement 4: Route and Page Consolidation

**User Story:** As a user, I don't want different page versions depending on route.

#### Acceptance Criteria

1. THE System SHALL have single canonical routes for: Home/Dashboard, Sell, Lookup, Warehouse, Documents/OCR, Customers, Review, Reporting, Admin, Forms, Exports, Capabilities, Settings
2. THE System SHALL move legacy/old pages to `frontend/src/legacy_quarantine/` and NOT import them
3. THE System SHALL prevent unknown routes from showing old shells by redirecting to a modern 404 page
4. THE System SHALL set the default landing route correctly based on role or last-used page

### Requirement 5: Visual Consistency and Tokenized Theme

**User Story:** As a user, the UI should feel like one product.

#### Acceptance Criteria

1. THE Navigation SHALL use design tokens for background, text, hover, focus, and active states
2. THE Navigation SHALL use design tokens for spacing and typography
3. THE System SHALL NOT use hardcoded legacy gradient CSS in active components
4. THE Sidebar SHALL use consistent width, icon sizing (24px), and typography
5. THE Theme SHALL support dark/light modes via tokens

### Requirement 6: Branding and White-Label Configuration

**User Story:** As an admin, I want the app branded per tenant without dev work.

#### Acceptance Criteria

1. THE BrandConfig SHALL support: appName, logoLight, logoDark (PNG/JPG preferred), optional favicon, accent color/theme preset
2. IF the logo is SVG/ICO, THEN THE Build_System SHALL convert to PNG/JPG or embed as SVG safely
3. THE System SHALL output brand assets to a deterministic location like `frontend/public/brand/<tenant>/logo.png`
4. THE System SHALL generate favicon and PWA/manifest icons from the same source
5. THE Branding SHALL be changeable in Settings → Branding with immediate UI refresh or next reload

### Requirement 7: Default Settings and Tenant Configuration

**User Story:** As a store, I want correct defaults on first run.

#### Acceptance Criteria

1. THE TenantConfig SHALL include: currency, locale, tax region/rates, rounding rules, receipt header/footer, default warehouse/location, default pricebook rules
2. IF no tenant is configured, THEN THE System SHALL show a Setup Wizard and block POS flows until configured
3. THE Settings SHALL be pulled from backend (no frontend-only magic constants)

### Requirement 8: Authentication Defaults

**User Story:** As an operator, I need safe credentials handling.

#### Acceptance Criteria

1. THE System SHALL NOT have hardcoded credentials in the repository
2. THE First_Run_Admin_Creation SHALL use one of: Setup wizard, CLI bootstrap command with secure random password, or environment bootstrap for dev only
3. THE System SHALL enforce password policy and forced change on first login for bootstrap accounts
4. THE Auth_Flows SHALL be branded ("EasySale") and consistent with the shell

### Requirement 9: No Mock Data on Real Pages

**User Story:** As a user, I don't want fake data in production.

#### Acceptance Criteria

1. THE Pages SHALL use real backend API calls OR an explicit empty state ("No data yet")
2. THE Demo_Seed_Data SHALL only be allowed behind DEMO_MODE=true and visibly labeled
3. THE Production_Build SHALL NOT ship demo fixtures enabled by default

### Requirement 10: Backend Feature Reachability

**User Story:** As a user, if the backend supports it, I can access it.

#### Acceptance Criteria

1. THE System SHALL have a UI entry point and route for each backend capability
2. THE System SHALL ensure UI exists for: Documents/OCR ingestion, OCR results review and corrections, internal↔external part number cross-reference, pricing resolution, exports screen, capabilities screen
3. THE System SHALL NOT have placeholder "coming soon" pages for core flows—must be functional v1

### Requirement 11: Parts Cross-Linking and Price Resolution

**User Story:** When ingesting an external part number, EasySale resolves it to internal canonical part and correct price rules.

#### Acceptance Criteria

1. THE Search SHALL support: internal SKU, external SKU/vendor SKU, scanned/OCR-extracted part numbers
2. THE Resolution SHALL show: matched canonical part, match confidence (exact/alias/vendor mapping/OCR), resolved price and pricebook source
3. THE Admin SHALL be able to manage mappings: create/edit alias links, vendor-specific part mapping, conflict resolution rules
4. THE Receipts_And_Cart_Line_Items SHALL display canonical part with optional reference

### Requirement 12: Documents and OCR Workflow

**User Story:** I can ingest documents and turn them into linked inventory/transactions.

#### Acceptance Criteria

1. THE Document_List SHALL show statuses: uploaded → OCR queued → extracted → reviewed → linked
2. THE OCR_Extraction_Results_View SHALL show: detected vendor, invoice number, dates, line items, totals
3. THE OCR_Extraction_Results_View SHALL allow corrections and re-run targeted extraction
4. THE System SHALL allow linking extracted items to: existing parts (internal), create new parts if authorized, update price/cost rules with approval flow

### Requirement 13: Code Consolidation Documentation

**User Story:** As a developer, I can see what's live vs legacy.

#### Acceptance Criteria

1. THE System SHALL deliver `docs/ui/USED_COMPONENTS.md` documenting canonical components and where used
2. THE System SHALL deliver `docs/ui/LEGACY_QUARANTINE.md` documenting what moved, why, and replacement
3. THE System SHALL deliver `docs/ui/NAV_CONFIG.md` documenting menu definition and gating rules
4. WHEN quarantining code, THE Documentation SHALL include: old path, new path, reason, replacement link, last known route

### Requirement 14: Build Clean and Warning Elimination

**User Story:** CI is quiet and trustworthy.

#### Acceptance Criteria

1. THE Backend SHALL complete cargo test without warnings (or with explicitly justified allow-lints)
2. THE Frontend SHALL complete build and lint without errors
3. THE Frontend SHALL NOT have unused components/pages still imported
4. THE System SHALL produce a summary report: warning → file/line → root cause → fix → proof command output
