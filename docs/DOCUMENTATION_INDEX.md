# EasySale Documentation Index

## Overview

This index provides quick access to all EasySale documentation, organized by audience and topic.

**Last Updated**: 2026-01-30

---

## User Guides

Documentation for end users of the EasySale system.

### Core Features
- [Quick Start Guide](./user-guides/quick-start.md) - Getting started with EasySale
- [Cashier Guide](./user-guides/cashier-guide.md) - Point of sale operations
- [Inventory Guide](./user-guides/inventory-guide.md) - Managing inventory

### Service Business Features
- [Work Orders & Invoicing](./user-guides/work-orders-invoicing.md) - Managing service work orders and automatic invoicing
- [Appointments](./user-guides/appointments.md) - Scheduling and managing customer appointments
- [Time Tracking](./user-guides/time-tracking.md) - Employee time tracking and reporting
- [Estimates](./user-guides/estimates.md) - Creating and managing customer estimates

### Support
- [Troubleshooting Guide](./user-guides/troubleshooting.md) - General troubleshooting
- [Feature Flags Troubleshooting](./user-guides/feature-flags-troubleshooting.md) - Module-specific troubleshooting

---

## Administrator Guides

Documentation for system administrators and managers.

### Configuration
- [Admin Guide](./user-guides/admin-guide.md) - General administration
- [Configuration Guide](./admin-guides/configuration.md) - Module configuration and feature flags
- [Settings Consolidation](./consolidated/settings-consolidation.md) - Settings management

### Security & Access
- [Security Guide](./SECURITY.md) - Security best practices
- [Roles & Permissions](./ux/ROLES_AND_PERMISSIONS.md) - User roles and permissions

### Operations
- [Backup & Restore](./user-guides/admin-guide.md#backup-and-restore) - Data backup procedures
- [Multi-Store Setup](./sync/SETUP_GUIDE.md) - Multi-location configuration

---

## Developer Guides

Documentation for developers working on or integrating with EasySale.

### Architecture
- [Architecture Overview](./architecture/overview.md) - System architecture
- [Database Design](./architecture/database.md) - Database schema
- [Module Boundaries](./architecture/module-boundaries.md) - Module organization

### Development
- [Theming Guide](./developer-guides/theming.md) - Theme system and styling
- [Edit Guide](./development/EDIT_GUIDE.md) - Making code changes
- [Testing Coverage](./architecture/testing-coverage.md) - Testing strategy

### Build & Deploy
- [Build Instructions](./build/BUILD_INSTRUCTIONS.md) - Building the application
- [Deployment Guide](./deployment/SETUP_GUIDE.md) - Deployment procedures
- [Docker Build](./deployment/DOCKER_BUILD_INSTRUCTIONS.md) - Docker deployment

---

## API Documentation

Documentation for API integration and development.

### API Reference
- [API Overview](./api/README.md) - API introduction and authentication
- [OpenAPI Specification](./api/openapi.yaml) - Complete API specification
- [Work Orders API](./api/work-orders-api.md) - Work orders endpoints

### Integration Guides
- [WooCommerce Integration](./sync/SETUP_GUIDE.md) - WooCommerce sync setup
- [QuickBooks Integration](./qbo/current_integration_map.md) - QuickBooks integration
- [Payment Integrations](./integrations/payments.md) - Payment processor setup

---

## Feature Documentation

Detailed documentation for specific features.

### Sales & Transactions
- [Transactions API](./api/transactions.md) - Transaction processing
- [Customers API](./api/customers.md) - Customer management
- [Products API](./api/products.md) - Product catalog

### Inventory
- [Inventory API](./api/inventory.md) - Inventory management
- [Inventory Guide](./user-guides/inventory-guide.md) - User guide

### Integrations
- [Integration API](./api/integration_api.md) - Integration endpoints
- [OCR API](./api/ocr_api.md) - Document OCR processing
- [Review API](./api/review_api.md) - Review workflows

---

## Design & UX

User experience and design documentation.

### User Experience
- [Information Architecture](./ui/INFORMATION_ARCHITECTURE.md) - UI structure
- [User Journeys](./ux/DCE_USER_JOURNEYS.md) - User workflows
- [Review State Machine](./ux/REVIEW_STATE_MACHINE.md) - Review process

### Design System
- [Tailwind Usage Guidelines](./design-system/tailwind-usage-guidelines.md) - Styling guidelines
- [Semantic Token Mapping](./theming/semantic-token-mapping.md) - Theme tokens
- [Brand Assets Guide](./brand-assets-guide.md) - Branding assets

---

## Operations & Maintenance

Documentation for system operations and maintenance.

### Monitoring
- [Runbook](./RUNBOOK.md) - Operational procedures
- [Audit Logging](./audit/) - Audit system

### Backup & Recovery
- [Backup Security](./backup-security.md) - Backup procedures
- [Disaster Recovery](./deployment/SETUP_GUIDE.md#disaster-recovery) - Recovery procedures

### Troubleshooting
- [General Troubleshooting](./user-guides/troubleshooting.md) - Common issues
- [Feature Flags Troubleshooting](./user-guides/feature-flags-troubleshooting.md) - Module issues
- [Backend Test Fixes](./BACKEND_TEST_FIXES_NEEDED.md) - Known issues

---

## Reference Documentation

Quick reference and lookup documentation.

### Configuration
- [Module Boundaries Quick Reference](./MODULE_BOUNDARIES_QUICK_REFERENCE.md) - Module overview
- [Feature Checklist](./FEATURE_CHECKLIST.md) - Feature status
- [Data Sources Reference](./DATA_SOURCES_REFERENCE.md) - Data sources

### Development
- [Kiro CLI Reference](../kiro-guide.md) - Kiro CLI usage
- [Repository Overview](./REPO_OVERVIEW.md) - Repository structure
- [Global Rules](../GLOBAL_RULES_EASYSALE.md) - Development rules

---

## Consolidated Documentation

Comprehensive documentation packages.

### Historical Documentation
- [00 Overview](./consolidated/00_OVERVIEW.md) - Project overview
- [01 Timeline](./consolidated/01_TIMELINE.md) - Development timeline
- [02 Architecture & Decisions](./consolidated/02_ARCHITECTURE_AND_DECISIONS.md) - Architecture decisions
- [03 Build & Operations](./consolidated/03_BUILD_AND_OPERATIONS.md) - Build and operations
- [04 Features & Workflows](./consolidated/04_FEATURES_AND_WORKFLOWS.md) - Feature documentation
- [05 Kiro Process](./consolidated/05_KIRO_PROCESS.md) - Development process
- [06 Gaps & Next](./consolidated/06_GAPS_AND_NEXT.md) - Future work
- [99 Source Map](./consolidated/99_SOURCE_MAP.md) - Documentation sources

---

## Getting Started

### For End Users
1. Read [Quick Start Guide](./user-guides/quick-start.md)
2. Review [Cashier Guide](./user-guides/cashier-guide.md) for basic operations
3. Explore feature-specific guides as needed
4. Refer to [Troubleshooting Guide](./user-guides/troubleshooting.md) for issues

### For Administrators
1. Read [Configuration Guide](./admin-guides/configuration.md)
2. Set up [Roles & Permissions](./ux/ROLES_AND_PERMISSIONS.md)
3. Configure [Backup & Restore](./backup-security.md)
4. Review [Security Guide](./SECURITY.md)

### For Developers
1. Read [Architecture Overview](./architecture/overview.md)
2. Review [Theming Guide](./developer-guides/theming.md)
3. Study [Module Boundaries](./architecture/module-boundaries.md)
4. Follow [Edit Guide](./development/EDIT_GUIDE.md) for changes

### For Integrators
1. Read [API Overview](./api/README.md)
2. Review [OpenAPI Specification](./api/openapi.yaml)
3. Study integration guides for your platform
4. Test with [API examples](./api/README.md#examples)

---

## Documentation Standards

### File Naming
- User guides: `kebab-case.md` in `docs/user-guides/`
- Admin guides: `kebab-case.md` in `docs/admin-guides/`
- Developer guides: `kebab-case.md` in `docs/developer-guides/`
- API docs: `kebab-case-api.md` in `docs/api/`

### Document Structure
- Clear title and overview
- Table of contents for long documents
- Step-by-step instructions with examples
- Troubleshooting section
- Related documentation links
- Last updated date and version

### Maintenance
- Update documentation with code changes
- Review quarterly for accuracy
- Archive outdated documentation
- Keep examples current

---

## Support Resources

### Documentation
- **Main Documentation**: https://docs.easysale.com
- **API Reference**: https://api-docs.easysale.com
- **Video Tutorials**: https://tutorials.easysale.com

### Community
- **Community Forum**: https://community.easysale.com
- **GitHub Issues**: https://github.com/easysale/easysale/issues
- **Discord Server**: https://discord.gg/easysale

### Support
- **Email**: support@easysale.com
- **Phone**: 1-800-EASYSALE
- **Enterprise Support**: enterprise@easysale.com
- **Developer Support**: dev@easysale.com

---

## Contributing to Documentation

### How to Contribute
1. Fork the repository
2. Create documentation branch
3. Make changes following standards
4. Submit pull request
5. Address review feedback

### Documentation Guidelines
- Write for your audience (user, admin, developer)
- Use clear, concise language
- Include examples and screenshots
- Test all instructions
- Update index when adding new docs

### Review Process
1. Technical review for accuracy
2. Editorial review for clarity
3. User testing for usability
4. Final approval and merge

---

*This index is automatically updated when new documentation is added.*
*Last updated: 2026-01-30*
*Version: 1.0*
