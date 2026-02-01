# Route Registry Audit Report

**Generated:** 2026-01-30T15:37:27.640Z
**Purpose:** Validate route registry consistency and detect violations

## Summary

- **Total Routes:** 53
- **Active Routes:** 39
- **Legacy Routes:** 14
- **Quarantined Routes:** 0
- **Violations Found:** 0

## Statistics

### By Navigation Section

- **Main:** 10
- **Admin:** 17
- **Profile:** 1
- **None:** 25

### By Layout

- **AppLayout:** 50
- **None:** 3

## ✅ No Violations Found

All routes in the registry are valid and consistent.

## Active Routes

### Main Navigation

- **/** → HomePage
  - Dashboard and home page
- **/sell** → SellPage
  - Point of sale checkout
- **/lookup** → LookupPage
  - Product search and lookup
- **/inventory** → InventoryPage
  - Inventory and stock management
- **/documents** → DocumentsPage
  - Document management and OCR processing
- **/customers** → CustomersPage
  - Customer profiles and management
- **/review** → ReviewPage
  - Review and approve vendor bills
- **/reporting** → ReportingPage
  - Sales reports and analytics
- **/sales** → SalesManagementPage
  - Sales management - layaway, work orders, commissions, gift cards, promotions, credit accounts, loyalty
- **/admin** → AdminPage
  - Administration overview

### Admin Sub-Navigation

- **/admin/setup** → AdminPage
  - Setup wizard (re-runnable)
- **/admin/users** → AdminPage
  - Users and roles management
- **/admin/store** → CompanyStoresPage
  - Store configuration
- **/admin/locations** → CompanyStoresPage
  - Locations and registers
- **/admin/taxes** → TaxRulesPage
  - Tax rules and rounding
- **/admin/pricing** → ProductConfigPage
  - Pricing rules and configuration
- **/admin/receipts** → AdminPage
  - Receipt templates
- **/admin/branding** → LocalizationPage
  - Branding and localization
- **/admin/integrations** → IntegrationsPage
  - External integrations (WooCommerce, QuickBooks)
- **/admin/data** → DataManagementPage
  - Data management and imports
- **/admin/exports** → ExportsPage
  - Export data and reports
- **/admin/capabilities** → CapabilitiesDashboardPage
  - System capabilities dashboard
- **/admin/health** → SyncDashboardPage
  - System health and sync status
- **/admin/advanced** → FeatureFlagsPage
  - Advanced settings and feature flags
- **/admin/hardware** → HardwarePage
  - Hardware configuration
- **/admin/network** → NetworkPage
  - Network settings
- **/admin/performance** → PerformancePage
  - Performance monitoring

### Profile Menu

- **/preferences** → PreferencesPage
  - User preferences (theme, density, shortcuts)

### Other Routes (Detail Pages, etc.)

- **/login** → LoginPage
  - User login page
- **/fresh-install** → FreshInstallWizard
  - First-run setup wizard
- **/access-denied** → AccessDeniedPage
  - Access denied error page
- **/review/:caseId** → ReviewCaseDetailPage
  - Review case detail page
- **/vendor-bills** → BillHistory
  - Vendor bill history
- **/vendor-bills/upload** → BillUpload
  - Upload vendor bills
- **/vendor-bills/:id** → BillReview
  - Vendor bill detail
- **/vendor-bills/templates** → TemplateManagerPage
  - Vendor bill templates
- **/vendor-bills/templates/:templateId** → VendorTemplateEditorPage
  - Edit vendor bill template
- **/forms** → FormTemplatesPage
  - Form templates
- **/exports** → ExportsPage
  - Exports page (also accessible via /admin/exports)

## Legacy Routes (Redirects)

- **/settings** → redirects to **/admin**
  - Reason: Settings consolidated into Admin section
- **/settings/preferences** → redirects to **/preferences**
  - Reason: User preferences moved to profile menu
- **/settings/integrations** → redirects to **/admin/integrations**
  - Reason: Settings consolidated into Admin section
- **/settings/data** → redirects to **/admin/data**
  - Reason: Settings consolidated into Admin section
- **/settings/hardware** → redirects to **/admin/hardware**
  - Reason: Settings consolidated into Admin section
- **/settings/network** → redirects to **/admin/network**
  - Reason: Settings consolidated into Admin section
- **/settings/performance** → redirects to **/admin/performance**
  - Reason: Settings consolidated into Admin section
- **/settings/features** → redirects to **/admin/advanced**
  - Reason: Settings consolidated into Admin section
- **/settings/localization** → redirects to **/admin/branding**
  - Reason: Settings consolidated into Admin section
- **/settings/products** → redirects to **/admin/pricing**
  - Reason: Settings consolidated into Admin section
- **/settings/tax** → redirects to **/admin/taxes**
  - Reason: Settings consolidated into Admin section
- **/settings/stores** → redirects to **/admin/store**
  - Reason: Settings consolidated into Admin section
- **/settings/sync** → redirects to **/admin/health**
  - Reason: Settings consolidated into Admin section
- **/settings/*** → redirects to **/admin**
  - Reason: Settings consolidated into Admin section

## Before/After Comparison


### Before Consolidation


- Multiple navigation systems (icon rail, legacy sidebar, modern sidebar)
- Scattered settings pages under /settings/*
- Duplicate navigation rendering (AppLayout + AppShell)
- No clear route registry or status tracking

### After Consolidation


- Single navigation system (AppLayout sidebar)
- Consolidated admin section under /admin/*
- Clear route status (active/legacy/quarantined)
- Enforced route registry with validation
- Legacy routes redirect to new locations
- Quarantined components isolated and documented

## Validation Rules


1. **No Quarantined Routes Active:** Routes marked as quarantined must not be active
2. **Legacy Routes Have Replacements:** All legacy routes must define a replacement path
3. **Valid Status Values:** Route status must be one of: active, legacy, quarantined
4. **Valid Nav Sections:** Nav section must be one of: main, admin, profile, none
5. **Valid Layouts:** Layout must be one of: AppLayout, none
