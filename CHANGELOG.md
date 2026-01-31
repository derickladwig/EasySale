# Changelog

All notable changes to EasySale will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
