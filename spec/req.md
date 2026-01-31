# EasySale POS System — Requirements Specification

**Version**: 1.1  
**Last Updated**: 2026-01-30  
**Status**: Production-Ready Documentation

---

## Table of Contents

1. [Product Requirements](#1-product-requirements)
2. [Non-Functional Requirements](#2-non-functional-requirements)
3. [Constraints](#3-constraints)
4. [Acceptance Criteria](#4-acceptance-criteria)
5. [Feature Matrix](#5-feature-matrix)
6. [MoSCoW Prioritization](#6-moscow-prioritization)

---

## 1. Product Requirements

### 1.1 Core Purpose

EasySale is a **white-label, multi-tenant point-of-sale system** designed to:
- Adapt to any retail business type via JSON configuration
- Operate offline-first with automatic synchronization
- Support multi-store deployments with data replication
- Provide role-based access control for staff

### 1.2 Target Users

| User Role | Primary Needs |
|-----------|---------------|
| **Store Owners/Managers** | Dashboards, reports, configuration, employee management |
| **Sales Associates/Cashiers** | Fast checkout, barcode scanning, payment processing |
| **Inventory/Receiving Staff** | Stock tracking, receiving, label printing, alerts |
| **Finance/HR** | Accounts receivable, expenses, payroll, P&L reports |

### 1.3 Functional Requirements

#### FR-001: Authentication & Authorization
- Password-based login with optional PIN quick-access
- JWT-based session management (configurable expiration)
- Role-based permissions (7 roles: Admin, Manager, Cashier, etc.)
- Session timeout with auto-logout

#### FR-002: Point of Sale
- Product catalog with search and category filtering
- Shopping cart with quantity management
- Customer selection (walk-in or registered)
- Discount and coupon application
- Multiple payment methods (cash, card, other)
- Receipt generation

#### FR-003: Product Management
- CRUD operations for products
- Category-based organization
- Custom attributes per category
- Barcode/SKU support
- Bulk import/export (CSV)

#### FR-004: Inventory Management
- Real-time stock tracking
- Low stock and out-of-stock alerts
- Receiving workflow for incoming shipments
- Stock transfers between locations
- Barcode scanning (camera + manual)
- Label printing

#### FR-005: Customer Management
- Customer profiles (individual/business)
- Contact information management
- Purchase history tracking
- Loyalty tiers (Standard, Silver, Gold, Platinum)
- Customer-specific pricing

#### FR-006: Documents & OCR (Full Build)
- PDF invoice upload
- OCR text extraction
- Review and approval workflow
- Vendor template management
- Automatic inventory import

#### FR-007: Reporting
- Sales reports (daily, weekly, monthly)
- Inventory reports
- Customer analytics
- Export functionality (stub - coming soon)

#### FR-008: Settings & Configuration
- Company and store setup
- Tax rules configuration
- Hardware settings (printers, scanners)
- Integration management (QuickBooks, WooCommerce)
- Feature flags
- Branding customization

#### FR-009: Synchronization
- Offline operation with local SQLite
- Automatic sync when online (1-5 minute intervals)
- Conflict resolution (last-write-wins)
- Sync status visibility

---

## 2. Non-Functional Requirements

### 2.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Transaction time | < 30 seconds | Scan to receipt |
| Product search | < 1 second | Any query |
| Database queries | < 100ms | 95th percentile |
| Page load time | < 3 seconds | Initial load |
| Sync latency | 1-5 minutes | Between stores |

### 2.2 Reliability

| Metric | Target |
|--------|--------|
| Offline duration | Unlimited (days/weeks) |
| Queue capacity | 100,000+ pending operations |
| Recovery time | < 1 hour after extended outage |
| Data integrity | 100% across locations |

### 2.3 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | JWT tokens (8-hour default expiration) |
| Password hashing | Argon2 (industry standard) |
| Data encryption | SQLite encryption at rest (optional) |
| Transport security | TLS 1.3 for all network communication |
| Input validation | All user inputs validated |
| Audit logging | All sensitive operations logged |

### 2.4 Scalability

| Metric | Target |
|--------|--------|
| Concurrent users | 5+ per store |
| Stores per deployment | Unlimited |
| Products per store | 100,000+ |
| Transactions per day | 10,000+ |

### 2.5 Usability

| Requirement | Implementation |
|-------------|----------------|
| Touch optimization | Large buttons, clear typography |
| Responsive design | Desktop, tablet, mobile support |
| Offline indicators | Visual sync status |
| Accessibility | WCAG 2.1 AA compliance target |

---

## 3. Constraints

### 3.1 Technical Constraints

| Constraint | Details |
|------------|---------|
| **Frontend** | React 19+, TypeScript 5.x, Vite 6.x |
| **Backend** | Rust 1.75+, Actix-web 4.4, SQLite |
| **Node.js** | ≥20.0.0 required |
| **npm** | ≥10.0.0 required |
| **Docker** | ≥20.10 for containerized deployment |
| **Ports** | 7945 (frontend), 8923 (backend), 7946 (Storybook) |

### 3.2 Policy Constraints

| Policy | Details |
|--------|---------|
| **No Deletes** | Preserve history; quarantine by moving + mapping only |
| **Evidence-First** | Treat audits/logs as authoritative when claims conflict |
| **Production Gate** | No mock data, no stub endpoints as real features, no hardcoded OAuth URIs |
| **Secrets** | Never commit secrets; use environment variables |

### 3.3 Known Technical Gaps

| Gap | Location | Status |
|-----|----------|--------|
| Hardcoded QuickBooks OAuth redirect | `backend/crates/server/src/handlers/integrations.rs` | Documented |
| Report export stub | `POST /api/reports/export` | Returns placeholder |
| SQL injection risk | `backend/crates/server/src/handlers/reporting.rs` | Uses `format!()` |
| Backend startup defaults | `main.rs` | Falls back to `default-store` |

---

## 4. Acceptance Criteria

### 4.1 Installation Acceptance

- [ ] Clone repository successfully
- [ ] `.env` file created from template
- [ ] Frontend dependencies install without errors
- [ ] Backend compiles without errors
- [ ] Docker containers start successfully
- [ ] Health check passes: `GET /health` returns 200
- [ ] Login page loads at `http://localhost:7945`
- [ ] Setup wizard allows creating admin account (8+ char password)
- [ ] Login works with created credentials

### 4.2 Core Functionality Acceptance

- [ ] User can log in and log out
- [ ] Dashboard displays statistics
- [ ] Products can be searched and viewed
- [ ] Items can be added to cart
- [ ] Sales can be completed
- [ ] Customers can be created and edited
- [ ] Inventory levels are tracked
- [ ] Settings can be modified

### 4.3 Offline Acceptance

- [ ] Application functions without internet
- [ ] Data persists locally
- [ ] Sync status indicator shows "Offline"
- [ ] Operations queue for later sync
- [ ] Sync resumes when online

### 4.4 Build Acceptance

- [ ] Frontend builds without errors (`npm run build`)
- [ ] Backend builds without errors (`cargo build --release`)
- [ ] All build variants compile (lite, export, full)
- [ ] Docker images build successfully
- [ ] Tests pass (frontend + backend)
- [ ] Linting passes (ESLint + Clippy)

---

## 5. Feature Matrix

### 5.1 Build Variants

| Feature | Lite | Export | Full |
|---------|:----:|:------:|:----:|
| Core POS | ✅ | ✅ | ✅ |
| Product Management | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ✅ |
| Customers | ✅ | ✅ | ✅ |
| Admin Panel | ❌ | ✅ | ✅ |
| Reporting | ❌ | ✅ | ✅ |
| CSV Export | ❌ | ✅ | ✅ |
| Documents/OCR | ❌ | ❌ | ✅ |
| Vendor Bills | ❌ | ❌ | ✅ |
| Review Queue | ❌ | ❌ | ✅ |

### 5.2 Permission Matrix

| Feature | Admin | Manager | Cashier | Inventory |
|---------|:-----:|:-------:|:-------:|:---------:|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Sell | ✅ | ✅ | ✅ | ❌ |
| Lookup | ✅ | ✅ | ✅ | ✅ |
| Inventory | ✅ | ✅ | ❌ | ✅ |
| Customers | ✅ | ✅ | ✅ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ |
| Admin | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |

### 5.3 Integration Status

| Integration | Status | Notes |
|-------------|--------|-------|
| QuickBooks | ⚠️ Partial | OAuth redirect hardcoded to localhost |
| WooCommerce | ✅ Ready | API integration complete |
| Stripe Terminal | ⚠️ UI Only | Buttons present, no terminal integration |
| Square | ⚠️ UI Only | Buttons present, no terminal integration |

---

## 6. MoSCoW Prioritization

### Must Have (Critical for MVP)

- [x] User authentication and authorization
- [x] Product catalog and search
- [x] Shopping cart and checkout
- [x] Basic inventory tracking
- [x] Customer management
- [x] Offline operation
- [x] Local data persistence
- [x] Docker deployment

### Should Have (Important but not critical)

- [x] Multi-store synchronization
- [x] Role-based permissions
- [x] Reporting dashboard
- [x] CSV export
- [ ] Complete frontend-backend wiring (87 of 103 endpoints unwired)
- [ ] Hardware integration (printers, scanners)

### Could Have (Nice to have)

- [x] OCR document processing
- [x] Vendor bill workflow
- [x] Review queue
- [ ] Advanced analytics
- [ ] Mobile companion app
- [ ] AI-powered insights

### Won't Have (Out of scope for current release)

- Cloud-hosted SaaS version
- Native mobile apps (iOS/Android)
- Real-time collaboration
- Video conferencing integration

---

## References

- [Product Overview](.kiro/steering/product.md)
- [Technical Architecture](.kiro/steering/tech.md)
- [Feature Checklist](docs/FEATURE_CHECKLIST.md)
- [Production Readiness Gaps](audit/PRODUCTION_READINESS_GAPS.md)

---

*Document generated from repository audit on 2026-01-29*
