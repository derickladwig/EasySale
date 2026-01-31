# Changelog

All notable changes to EasySale will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.3] - 2026-01-30

### Added
- **Enhanced Import Wizard**:
  - Collapsible field reference documentation for each entity type
  - Clear required vs optional field indicators
  - Custom attribute support (custom_attr_1, custom_attr_1_value, etc.)
  - CSV column order flexibility explained in UI
  - Larger vertical padding for better readability
- **Demo Data Import System**:
  - "Load Demo" button for Products, Customers, and Vendors
  - "Load All Demo Data" for one-click setup
  - "Clear Demo Data" to remove all demo entries
  - 25 realistic retail products with barcodes and image references
  - 15 sample customers with varying pricing tiers
  - 8 sample vendors for different product categories
  - All demo data prefixed with DEMO- for easy identification
- **Category Lookup Page** (`/admin/data/categories`):
  - Hierarchical category browser with tree view
  - Search with auto-expand matching categories
  - Product count per category
  - Category attribute management
  - Expand/collapse all controls
- **New API Endpoints**:
  - `POST /api/setup/import-demo` - Import demo data
  - `DELETE /api/setup/clear-demo` - Remove demo data
- **Quote Actions**:
  - Email Quote button to send quotes to customers
- **Customer Search Actions**:
  - Create New Customer button when no matches found
- **Inventory Actions**:
  - Delete Item functionality in inventory management

### Changed
- **Asset Organization**: Moved `data/easysale_asset_pack/` to root `assets/` folder
  - Cleaner separation of brand assets from runtime data
  - Updated all documentation references
- **CSV Export Enhancement**:
  - Custom attributes flattened into individual columns
  - Vendor information included in product exports
  - Alternate SKUs exported
  - Proper CSV escaping for special characters (prevents injection)

### Fixed
- Implemented planned features instead of removing unused imports
- ZoneEditor preserves zone editing parameters for OCR workflow
- CleanupShieldTool preserves drawing handlers for document annotation

---

## [1.2.2] - 2026-01-30

### Changed
- **Global Branding Theming**: Replaced hardcoded `primary-*` colors with `accent` semantic tokens
  - Navigation (Sidebar, TopBar, BottomNav, AppLayout) now uses accent color
  - PageTabs use accent for active states
  - Settings pages (Hardware, Network, Integrations) use accent color
  - Product pages (Lookup, Import) use accent color
  - Admin pages use accent color
  - Review queue uses accent color
- **Receipt Branding**: Receipts now use branding API instead of localStorage
  - Company name, logo, header, and footer from `/api/config/brand`
  - Logo display when `receipts.show_logo` is enabled
  - Custom receipt header/footer from branding config
- **Tax Display on Receipts**: Fixed tax, subtotal, and discount display
  - `lastSale` state now includes `subtotal`, `tax`, `discount` fields
  - Receipt shows proper tax breakdown

### Fixed
- Receipt printing now properly shows tax amount (was undefined)
- Sidebar active item uses accent color from branding
- Focus rings use accent color throughout the app

---

## [1.2.1] - 2026-01-30

### Added
- **Inventory Transfers**: Enabled transfers tab with real API integration
  - Stock transfers use stock adjustment API with transfer_in/transfer_out types
  - Location-aware transfers with audit trail
- **Company Info Management**: New backend endpoints
  - `GET/PUT /api/company/info` - Company information CRUD
  - `POST /api/company/logo` - Logo upload with file storage
- **Password Change**: Users can now change their own password
  - `PUT /api/users/password` - Secure password change endpoint
- **Enhanced Receipt Printing**:
  - Store branding from settings (name, address, phone)
  - Configurable receipt footer message
  - Subtotals, tax, and discount breakdown
  - Change calculation for cash payments
- **Hardware Settings**: Dynamic printer configuration
  - Load/save printer settings from backend
  - Platform-aware default ports (Windows vs Linux)
  - Test print with fallback to browser dialog

### Changed
- AdminPage General Settings now uses LocalizationPage component
- NetworkPage saves all fields including offline_mode and max_queue_size
- Product API migrated from fetch() to centralized apiClient
- Theme settings now sync to backend preferences API
- Review queue assign/export actions now call actual API endpoints

### Fixed
- TransfersTab no longer uses mock data
- Review queue keyboard shortcuts (A for assign, E for export) now functional

---

## [1.2.0] - 2026-01-30

### Added
- **Complete Feature Flag System**: All build variants now properly gated
  - Added `ENABLE_INTEGRATIONS` and `ENABLE_DATA_MANAGER` flags
  - All navigation items properly filtered by build variant
  - Routes gated at compile time for smaller bundles
- **Product Import Enhancements**:
  - Data preview table showing first 5 rows before import
  - Better column detection and validation feedback
- **Product Attributes Display**:
  - Attributes shown in cart line items (size, color, brand)
  - Attributes included on printed receipts
  - Full attribute display in product detail view
- **Document Management**:
  - File download endpoints for review cases (`GET /api/cases/{id}/file`)
  - File download endpoints for vendor bills (`GET /api/vendor-bills/{id}/file`)
  - Migration 056: bill_files table for file metadata
- **Multi-Store Tracking**:
  - Migration 057: Added store_id and location_id to stock_adjustments
  - Stock adjustments now track which store/location

### Changed
- Setup wizard now uses correct API endpoint (`/api/tenant/setup-complete`)
- Logo upload validates file size (max 2MB) and type
- Build scripts pass VITE_BUILD_VARIANT to frontend Docker builds
- Tax rate now fetched from settings instead of hardcoded 13%

### Fixed
- Category API endpoint path (`/api/products/categories`)
- Coupon validation endpoint (`/api/promotions/evaluate`)
- Login redirect now returns to original page after auth
- 401 responses now redirect to login automatically
- Setup wizard error handling improved

---

## [1.1.0] - 2026-01-30

### Added
- **Per-Item Cart Adjustments**: Price override and line item discounts with reason tracking
- **Stock Validation**: Real-time stock check before adding items to cart
- **Stock Adjustment API**: Dedicated endpoint with full audit trail
  - `POST /api/products/{id}/stock/adjust` - Adjust stock with reason
  - `GET /api/products/{id}/stock/history` - View adjustment history
  - Migration 055: stock_adjustments table
- **Blog Documentation**: 7 new blog entries documenting development milestones
- **Reporting Enhancements**:
  - Custom date range filtering now functional
  - Previous period comparison displayed in summary cards
  - Category breakdown bar chart visualization

### Changed
- Dark theme overlay softened from 80% to 60% opacity
- Shadow opacities reduced for less harsh appearance
- Spec documentation updated to version 1.1

### Fixed
- Custom date range in ReportingPage now properly filters data
- Period comparison data now displayed (was showing 0)
- Removed hardcoded `!important` background color in BackgroundRenderer
- AdminPage store save now calls actual API
- AdminPage user delete now calls actual API

---

## [Unreleased]

### Added
- **Quotes System**: Full quote creation and management
  - Save cart as quote with 7-day expiration
  - QuotesPage for viewing, printing, and converting quotes
  - Convert quote to sale functionality
  - Quote printing with professional formatting
- **Enhanced Navigation**: Added Quotes and Transactions to main navigation
- **Customer Improvements**:
  - New Sale button navigates to POS with customer pre-selected
  - Customer action menu (edit, new sale, view orders, delete)
  - Loyalty points and store credit display
- **Inventory Improvements**:
  - Filter modal with status, location, and stock range filters
  - Bulk actions (Print Labels, Adjust Stock, Transfer) now functional
  - Row action menu for individual items
  - Reorder button in Alerts tab
- **Receipt System**: Post-sale receipt modal with print and email options
- **Integration Documentation**: Setup guides linked from Integrations page
- **Backend Features Implementation**: Complete implementation of previously stubbed backend features
  - Customer sales statistics (totalSpent, orderCount, lastOrder) via sales_transactions join
  - Customer recent orders endpoint (`GET /api/customers/{id}/orders`)
  - Export download endpoint (`GET /api/exports/download/{id}`)
  - Cases entity support in bulk export
  - Remote stores API (`GET /api/network/remote-stores`)
  - User last_login_at tracking and never_logged_in filter
  - Reporting change percentages with period comparison
  - Re-OCR tool integration with OCR service
  - Mask tool with OCR reprocessing and vendor template persistence
  - Zone editor CRUD endpoints (`/api/cases/{id}/zones`)
- Database migrations for new features (053, 054)
- **Split Build Architecture**: Three build variants (lite, export, full) for optimized deployments
  - Lite: Core POS only (~20 MB binary)
  - Export: + CSV export for QuickBooks (~25 MB binary)
  - Full: + OCR, document processing, cleanup engine (~35 MB binary)
- Feature flags for document processing, OCR, and cleanup modules
- Build scripts support variant selection (`--lite`, `--export`, `--full`)
- CI matrix testing for all build variants
- Frontend build variants with conditional routes
- Developer guide for adding new features without bloating lite build
- `docker-compose.build.yml` for building specific variants
- Payment integration documentation (`docs/integrations/payments.md`)

### Changed
- Heavy dependencies (image, imageproc, lopdf) are now optional
- Default build is now "export" variant
- `/api/capabilities` endpoint now reports new feature flags
- Test files for OCR/document features are now feature-gated
- API documentation updated with correct port numbers (8923)

### Fixed
- **Batch Files**: Replaced `curl` with PowerShell for Windows compatibility in health checks
- **Navigation**: Added feature flag filtering to hide unavailable features in lite builds
- **CSS Variables**: Added missing spacing variables (`--space-2/4/6`) and `--color-border-dark`
- **Admin Page**: Wired Save/Edit/Delete buttons to actual handlers
- **Inventory Page**: Connected stock adjustment to API via `useUpdateProductMutation`
- **Reporting Page**: Implemented custom date range picker functionality
- **Credit API**: Fixed path mismatches between frontend and backend endpoints
- **Review Components**: Added toast notifications for document features
- Removed console.log statements from review components
- Fixed broken link to payments.md in README
- Replaced `any` types with proper TypeScript types in multiple files
- Fixed webhook handlers to require environment variables instead of using insecure defaults

### Security
- **BREAKING**: Webhook handlers now require `WOOCOMMERCE_WEBHOOK_SECRET` and `QUICKBOOKS_WEBHOOK_VERIFIER` environment variables
- Removed insecure default fallback values for webhook secrets

### Technical
- Initial EasySale implementation
- White-label multi-tenant POS system
- Offline-first architecture with SQLite
- React frontend with TypeScript
- Rust backend with Actix Web
- Role-based access control (7 roles)
- Multi-category inventory management
- Real-time sync between locations
- Hardware integration support
- Configuration-driven customization
- Docker containerization
- Comprehensive CI/CD workflows

### Security
- JWT authentication with 8-hour expiration
- Argon2 password hashing
- Input validation and sanitization
- SQL injection prevention
- Content Security Policy headers

## [0.1.0] - 2026-01-26

### Added
- Initial release of EasySale
- Core POS functionality
- Multi-tenant support
- Offline operation capabilities
- Basic reporting and analytics
- Hardware integration framework

### Technical
- Frontend: React 19 + TypeScript + Vite + Tailwind CSS
- Backend: Rust + Actix Web + SQLite + sqlx
- Testing: Vitest + Playwright + Cargo test
- CI/CD: GitHub Actions with comprehensive workflows
- Documentation: Comprehensive guides and API docs

---

## Release Notes Format

### Types of Changes
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes
