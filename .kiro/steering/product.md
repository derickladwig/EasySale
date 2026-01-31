# Product Overview — EasySale: White-Label Multi-Tenant POS System

## Product Purpose
EasySale is a white-label, configuration-driven point-of-sale solution designed to adapt to any retail business type. Through JSON configuration files, businesses can customize categories, attributes, navigation, branding, and functionality without code changes.

The system supports diverse retail scenarios—from automotive parts and paint to general retail, restaurants, and service businesses—by allowing complete customization of product categories, search attributes, and business workflows.

It supports **offline operation** by storing data locally and synchronizing changes with other locations when connectivity is available. This ensures continuous operation regardless of internet availability.

## Target Users

### Store Owners/Managers
Need consolidated dashboards showing sales by category, profit margins, and inventory turnover. They configure tax rules, pricing tiers, promotions, and monitor employee performance.

### Sales Associates/Cashiers
Require a simple, fast checkout screen where they can scan barcodes, search products by configured attributes, and process various payment types. They also handle returns, layaways, and special orders.

### Inventory/Receiving Staff
Track incoming shipments, receive stock with serial numbers, and print labels. They set reorder points, monitor low-stock alerts, and perform stocktaking.

### Finance & HR
Manage accounts receivable, expenses, payroll, and profit & loss statements. They issue invoices, apply taxes and discounts, track income and expenses, and generate financial reports.

## Key Features

### Configuration-Driven Architecture
Everything is customizable via JSON configuration files:
- Product categories with custom attributes
- Navigation menus and quick actions
- Branding (colors, logos, company name)
- Dashboard widgets and reports
- Module enablement (layaway, commissions, loyalty, etc.)
- Database schema extensions

### Offline-First Operation
All transactions, returns, inventory adjustments, and business activities can be processed offline. The system stores data in a local SQLite database and synchronizes with other locations when connectivity returns.

### Multi-Category Product Management
Support any product type through configurable categories:
- Define custom attributes per category (text, number, dropdown, hierarchy, etc.)
- Configure search fields and filters
- Set up category-specific wizards for complex data entry
- Customize display templates

### Inventory & Warehouse Management
Track quantities, stock movements, and receive alerts for low stock. Support serial numbers for high-value items and batch tracking. Perform stocktaking and generate inventory reports.

### Financial Management & Accounting
Automate accounting: issue invoices with taxes and discounts, collect payments, track income and expenses. Register expenses and calculate net profit. Provide full chart of accounts and daily journals.

### Role-Based Permissions & Task Assignment
Assign authorizations to staff with granular permissions. Set restrictions on discounts, refunds, and price overrides. Track employee performance.

### CRM & Loyalty Programs
Build customer profiles with contact info, purchase history, and loyalty status. Offer price tiers, special discounts, and loyalty points.

### Reporting & Analytics
Generate real-time reports on sales, inventory turnover, employee performance, and customer behavior. Provide dashboards with filters by period, category, or location.

### Hardware Integration
Connect to barcode scanners, receipt printers, label printers, cash drawers, and payment terminals.

### Multi-Tenant Support
Support multiple businesses with isolated data, separate configurations, and independent branding.

## Business Objectives

### Enable White-Label Deployment
Allow businesses to fully customize the POS system with their branding, categories, and workflows without code changes.

### Streamline Operations
Unify sales, inventory, and accounting into one platform, eliminating redundant systems and manual reconciliation.

### Deliver Exceptional Customer Experience
Offer fast, accurate product lookup and checkouts, personalized pricing, loyalty rewards, and efficient service.

### Maintain Inventory Accuracy
Ensure real-time visibility of stock, automate reordering, and prevent stockouts or overstocking.

### Support Offline Reliability
Guarantee continuous operation during network outages with secure local storage and automatic synchronization.

### Enable Data-Driven Decisions
Provide comprehensive analytics for sales trends, profitability, and staff performance.

## User Journey

### 1. Configuration Setup
Business owner creates a configuration file defining:
- Company branding (name, logo, colors)
- Product categories with custom attributes
- Navigation menu items
- Enabled modules (layaway, commissions, loyalty, etc.)
- Dashboard widgets

### 2. Login & Role Selection
Staff sign in and the interface adapts to their role and permissions.

### 3. Product Management
Staff add products with category-specific attributes. The system validates based on configured rules.

### 4. Sales Processing
Staff search products using configured search fields, add items to cart, apply discounts, and process payments. The system updates inventory locally.

### 5. Offline Operation
If connectivity is lost, all operations continue normally. Changes are queued for synchronization.

### 6. Synchronization
When connectivity returns, changes sync automatically to other locations and cloud backup.

### 7. Reporting
Managers view dashboards with configured widgets showing sales, inventory, and performance metrics.

## Success Criteria

### Configuration Flexibility
- Can customize branding in < 30 minutes
- Can add new category in < 15 minutes
- Can enable/disable modules instantly
- Zero code changes required for customization

### Operational Efficiency
- Transaction times < 30 seconds
- Minimal manual data entry
- Error rates below 2%

### Multi-Tenant Isolation
- Complete data isolation between tenants
- No cross-tenant data leakage
- Independent configurations per tenant

### Uptime & Reliability
- 100% offline functionality
- Automatic synchronization within minutes
- Data integrity maintained across locations

---

## [2026-01-25] Product Spec Truth Sync — Missing Features + Later Changes (Insert-Only)

This addendum reconciles later repo changes and evidence-based audits into the product spec. It preserves prior text and records conflicts rather than overwriting.

### What was reconciled (high signal)

#### Production-ready claims are disputed (recorded, not overwritten)
- Some entrypoints claim “100% complete / production ready” (Sources: `START_HERE.md` → “System Status: 100% Complete - Production Ready”; `ALL_TASKS_COMPLETE.md`).
- Evidence artifacts record unresolved blockers (Sources: `audit/PRODUCTION_READINESS_GAPS.md` → “Confirmed gaps”; `audit/DOCS_VS_CODE_MATRIX.md`; `PROD_READINESS_INFO_PACK.md`).
- **Truth-sync rule**: treat “production ready” as gated by evidence (see `audit/CONSOLIDATION_PLAN.md`).

#### Exports are not uniformly implemented (avoid overstating capability)
- **Report export** endpoint exists but is currently a placeholder response (Verified: `backend/crates/server/src/handlers/reporting.rs` → `POST /api/reports/export` “Export functionality coming soon”).
- **Data-management export** endpoint exists but returns mock record counts and a mock path (Verified: `backend/crates/server/src/handlers/data_management.rs` → `POST /api/data-management/export`).
- More detailed inventory: `docs/export/current_export_surface.md` (explicitly calls these stubs).

#### QuickBooks compliance (verified in code)
- Minor version 75 is enforced in the QuickBooks client (Verified: `backend/crates/server/src/connectors/quickbooks/client.rs` → `MINOR_VERSION: u32 = 75`).
- CloudEvents support is documented as implemented (Source: `QUICKBOOKS_COMPLIANCE_VERIFIED.md`), but code verification is out-of-scope for this specific addendum; see truth-sync audit table.

### Conflicts recorded for confirmation

#### Conflict: product domain intent (universal vs caps-focused vs automotive POS)
- **Automotive POS mission**: `memory-bank/project_brief.md` (caps/parts/paint) and `memory-bank/adr/002-pos-system-project-choice.md`.
- **Vehicle/paint removal to be universal**: `VEHICLE_FUNCTIONALITY_REMOVED.md`.
- **Caps/headwear focus claim**: `PAINT_VEHICLE_REMOVAL_COMPLETE.md`.
- Resolution: recorded; requires human confirmation of current product intent. No prior text removed.

### Pointer
- Truth-sync audit package: `audit/truth_sync_2026-01-25/*`

---

## [2026-01-30] Product Status Update — Code Review Fixes Applied

### Issues Resolved from 2026-01-25 Audit

#### Export Functionality [FIXED]
- **Report export** (`POST /api/reports/export`) now fully implemented with:
  - Proper CSV generation with tenant isolation
  - CSV injection prevention (escapes special characters, formula prefixes)
  - Date range validation
- **Work Order Report** (`GET /api/reports/work-orders`) now queries actual `work_orders` table
- **Promotion Report** (`GET /api/reports/promotions`) now queries actual `promotions` table with usage statistics

#### Security Improvements [FIXED]
- **Multi-Tenant Isolation**: All 11 reporting endpoints now include `tenant_id` filtering
- **LoginPage Theming**: Replaced hardcoded Tailwind colors with semantic tokens
- **QuickBooks OAuth**: Redirect URI now read from `QUICKBOOKS_REDIRECT_URI` environment variable with production validation

#### Domain Intent [CONFIRMED]
- EasySale is a **universal white-label POS system** supporting any retail business type
- Vehicle/automotive-specific code has been intentionally removed
- Configuration-driven architecture allows customization for any industry

### Current Production Status
- All critical security issues from code review addressed
- All reporting endpoints have proper tenant isolation
- Export functionality fully implemented with security measures
- Login page uses semantic design tokens for proper theming
- Setup wizard functional with branding and import capabilities
