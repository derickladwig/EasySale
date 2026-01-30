# Changelog

All notable changes to EasySale will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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

### Changed
- Heavy dependencies (image, imageproc, lopdf) are now optional
- Default build is now "export" variant
- `/api/capabilities` endpoint now reports new feature flags
- Test files for OCR/document features are now feature-gated

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
