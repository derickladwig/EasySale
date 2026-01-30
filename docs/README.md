# Documentation

This directory contains all project documentation for the CAPS POS system.

## Quick Links

- **[Architecture Overview](architecture/overview.md)** - High-level system architecture
- **[API Documentation](api/README.md)** - REST API reference
- **[Quick Start Guide](user-guides/quick-start.md)** - Getting started for end users

## Documentation Structure

### Architecture Documentation (`architecture/`)

Technical documentation for developers and system administrators:

- **[overview.md](architecture/overview.md)** ✅ - System architecture, technology stack, components
- **[data-flow.md](architecture/data-flow.md)** ✅ - How data flows through the system
- **[database.md](architecture/database.md)** ✅ - Database schema and design
- **[security.md](architecture/security.md)** ✅ - Security model and practices
- **offline-sync.md** ⬜ - Offline operation and synchronization (coming soon)
- **deployment.md** ⬜ - Deployment procedures (coming soon)

### API Documentation (`api/`)

REST API reference for developers:

- **[README.md](api/README.md)** ✅ - Complete API reference with examples
- Authentication endpoints ✅
- Health check endpoint ✅
- Product endpoints ⬜ (coming soon)
- Transaction endpoints ⬜ (coming soon)
- Customer endpoints ⬜ (coming soon)
- Inventory endpoints ⬜ (coming soon)

### User Guides (`user-guides/`)

End-user documentation for store staff:

- **[quick-start.md](user-guides/quick-start.md)** ✅ - Getting started guide
- **cashier-guide.md** ⬜ - Detailed guide for cashiers (coming soon)
- **inventory-guide.md** ⬜ - Warehouse and inventory management (coming soon)
- **admin-guide.md** ⬜ - System administration (coming soon)
- **troubleshooting.md** ⬜ - Common issues and solutions (coming soon)

## For Developers

### Getting Started

1. Read the [Architecture Overview](architecture/overview.md) to understand the system design
2. Review the [Data Flow](architecture/data-flow.md) to understand how operations work
3. Check the [Database Schema](architecture/database.md) to understand data models
4. Read the [API Documentation](api/README.md) to understand available endpoints

### Contributing Documentation

When adding new features:

1. **Update API docs** if adding new endpoints
2. **Update architecture docs** if changing system design
3. **Update user guides** if changing user-facing features
4. **Add diagrams** where helpful (use Mermaid or ASCII art)

### Documentation Standards

- **Use Markdown** for all documentation
- **Include code examples** where applicable
- **Keep it up-to-date** - update docs when code changes
- **Be clear and concise** - avoid jargon where possible
- **Add diagrams** for complex concepts

## For End Users

### Getting Started

1. Read the [Quick Start Guide](user-guides/quick-start.md)
2. Ask your manager for role-specific training
3. Practice with test transactions
4. Refer back to guides as needed

### Getting Help

- **In-app help**: Press F1 or click the "?" icon
- **Manager**: Ask your store manager
- **IT Support**: Contact your IT support team
- **User guides**: Refer to the guides in this directory

## Documentation Roadmap

### Completed ✅
- Architecture overview
- Data flow documentation
- API reference (authentication, health check)
- Quick start guide for users
- Database schema documentation
- Security documentation

### Planned ⬜
- Offline sync documentation
- Deployment guide
- Cashier guide (detailed)
- Inventory guide (detailed)
- Admin guide (detailed)
- Troubleshooting guide
- API documentation (products, transactions, customers, inventory)
- Architecture diagrams (Mermaid)
- Video tutorials

## Feedback

Documentation feedback is welcome! If you find errors, unclear explanations, or missing information:

- **Developers**: Create an issue or submit a pull request
- **End users**: Contact your manager or IT support

---

**Last Updated**: 2026-01-09  
**Version**: 0.1.0
