# EasySale — Checklists

**Version**: 1.0  
**Last Updated**: 2026-01-29  
**Purpose**: Operational checklists for development, QA, release, and onboarding

---

## Table of Contents

1. [Preflight Checklist](#1-preflight-checklist)
2. [QA Checklist](#2-qa-checklist)
3. [Release Checklist](#3-release-checklist)
4. [Smoke Test Checklist](#4-smoke-test-checklist)
5. [New Developer Onboarding](#5-new-developer-onboarding)
6. [Definition of Done](#6-definition-of-done)

---

## 1. Preflight Checklist

**When to use**: Before first run or after major changes

### Environment Setup

- [ ] **Node.js** ≥20.0.0 installed (`node --version`)
- [ ] **npm** ≥10.0.0 installed (`npm --version`)
- [ ] **Rust** ≥1.75 installed (`rustc --version`)
- [ ] **Docker** ≥20.10 installed (optional) (`docker --version`)
- [ ] **Git** configured with user name and email

### Repository Setup

- [ ] Repository cloned successfully
- [ ] `.env` file created from `.env.example`
- [ ] Environment variables configured:
  - [ ] `JWT_SECRET` set (min 32 characters)
  - [ ] `STORE_ID` configured
  - [ ] `TENANT_ID` configured
  - [ ] `DATABASE_PATH` set (or using default)

### Dependencies

- [ ] Frontend dependencies installed (`cd frontend && npm ci`)
- [ ] Backend compiles (`cd backend && cargo build`)
- [ ] No critical security vulnerabilities (`npm audit --audit-level=high`)

### Database

- [ ] SQLite database path is writable
- [ ] Migrations can run (backend auto-runs on startup)
- [ ] Test database separate from production

### Configuration

- [ ] Configuration file exists (if customized)
- [ ] Configuration validates against schema
- [ ] Branding assets in place (logo, favicon)

### Network

- [ ] Port 7945 available (frontend)
- [ ] Port 8923 available (backend)
- [ ] Port 7946 available (Storybook, if used)

### Final Verification

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Health check passes: `curl http://localhost:8923/health`
- [ ] Login page loads at `http://localhost:7945`
- [ ] Default admin login works

---

## 2. QA Checklist

**When to use**: Before any release or deployment

### Code Quality

- [ ] All linting passes
  - [ ] Frontend: `npm run lint` (0 errors)
  - [ ] Backend: `cargo clippy -- -D warnings` (0 warnings)
- [ ] Code formatting verified
  - [ ] Frontend: `npm run format:check`
  - [ ] Backend: `cargo fmt -- --check`
- [ ] TypeScript compilation passes: `npm run type-check`
- [ ] No mock data in production code: `npm run verify:no-mocks`

### Testing

- [ ] Unit tests pass
  - [ ] Frontend: `npm run test:run` (all passing)
  - [ ] Backend: `cargo test` (all passing)
- [ ] Integration tests pass
- [ ] E2E tests pass (if applicable): `npm run test:e2e`
- [ ] Test coverage meets targets (80% business logic)

### Security

- [ ] No hardcoded secrets in codebase
- [ ] No API keys committed
- [ ] `.env` file not committed
- [ ] `configs/private/` not committed
- [ ] Dependency audit clean:
  - [ ] `npm audit --omit=dev --audit-level=high`
  - [ ] `cargo audit` (if installed)
- [ ] Input validation on all endpoints
- [ ] Authentication required on protected routes

### Build Verification

- [ ] Production build succeeds
  - [ ] Frontend: `npm run build`
  - [ ] Backend: `cargo build --release`
- [ ] Docker images build successfully
- [ ] All build variants compile (lite, export, full)
- [ ] Binary sizes within expected ranges

### Functionality

- [ ] Login/logout works
- [ ] Role-based access enforced
- [ ] CRUD operations work for core entities
- [ ] Offline mode functions correctly
- [ ] Sync operations complete without errors
- [ ] Reports generate correctly

### Performance

- [ ] Page load time < 3 seconds
- [ ] API response time < 100ms (p95)
- [ ] No memory leaks detected
- [ ] Database queries optimized

### Documentation

- [ ] README is current
- [ ] CHANGELOG updated
- [ ] API documentation matches implementation
- [ ] Breaking changes documented

---

## 3. Release Checklist

**When to use**: For version releases

### Pre-Release

- [ ] All QA checklist items pass
- [ ] Feature branch merged to `develop`
- [ ] Code review completed and approved
- [ ] All CI checks pass on `develop`

### Version Bump

- [ ] Version updated in `frontend/package.json`
- [ ] Version updated in `backend/Cargo.toml`
- [ ] Version consistent across all crates
- [ ] CHANGELOG.md updated with:
  - [ ] Version number and date
  - [ ] Added features
  - [ ] Changed functionality
  - [ ] Fixed bugs
  - [ ] Security updates
  - [ ] Breaking changes (if any)

### Git Operations

- [ ] Create release branch: `release/vX.Y.Z`
- [ ] Final testing on release branch
- [ ] Merge to `main`
- [ ] Create annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`
- [ ] Push tag: `git push origin vX.Y.Z`
- [ ] Merge `main` back to `develop`

### Release Artifacts

- [ ] GitHub Release created
- [ ] Release notes written (from CHANGELOG)
- [ ] Build artifacts attached:
  - [ ] Frontend dist bundle
  - [ ] Backend binaries (lite, export, full)
  - [ ] Docker images tagged
- [ ] Checksums generated for binaries

### Post-Release

- [ ] Verify release artifacts downloadable
- [ ] Smoke test release artifacts
- [ ] Update documentation site (if applicable)
- [ ] Announce release (if applicable)
- [ ] Monitor for issues

### Rollback Plan

- [ ] Previous version artifacts available
- [ ] Rollback procedure documented
- [ ] Database migration rollback tested (if applicable)

---

## 4. Smoke Test Checklist

**When to use**: Quick verification after deployment

### Infrastructure (2 minutes)

- [ ] Frontend accessible at expected URL
- [ ] Backend API responding
- [ ] Health endpoint returns healthy: `GET /health`
- [ ] Capabilities endpoint works: `GET /api/capabilities`

### Authentication (2 minutes)

- [ ] Login page loads
- [ ] Valid credentials authenticate successfully
- [ ] Invalid credentials rejected
- [ ] JWT token issued on login
- [ ] Protected routes require authentication
- [ ] Logout clears session

### Core Functionality (5 minutes)

- [ ] Dashboard loads with data
- [ ] Product search returns results
- [ ] Can create a new product
- [ ] Can view product details
- [ ] Can update a product
- [ ] Can add items to cart
- [ ] Can process payment

### Data Operations (2 minutes)

- [ ] Database queries execute
- [ ] Data persists after restart
- [ ] Sync status visible (if multi-store)

### Error Handling (1 minute)

- [ ] 404 page displays for invalid routes
- [ ] API errors return proper status codes
- [ ] No stack traces exposed to users

---

## 5. New Developer Onboarding

**When to use**: Getting a new team member productive

### Day 1: Environment Setup

- [ ] Access granted to repository
- [ ] Development machine meets prerequisites
- [ ] Repository cloned
- [ ] Environment configured (`.env`)
- [ ] Dependencies installed
- [ ] Application runs locally
- [ ] Can log in with test credentials

### Day 1: Orientation

- [ ] Read [README.md](../README.md)
- [ ] Read [spec/README_MASTER.md](README_MASTER.md)
- [ ] Review [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] Review [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)
- [ ] Understand project structure

### Day 2: Architecture Deep Dive

- [ ] Read [spec/req.md](req.md)
- [ ] Read [spec/design.md](design.md)
- [ ] Read [.kiro/steering/tech.md](../.kiro/steering/tech.md)
- [ ] Understand offline-first design
- [ ] Understand multi-tenant architecture

### Day 2: Codebase Exploration

- [ ] Explore frontend structure (`frontend/src/`)
- [ ] Explore backend structure (`backend/crates/`)
- [ ] Review database schema
- [ ] Understand configuration system
- [ ] Run and review existing tests

### Day 3: Development Workflow

- [ ] Understand Git branching strategy
- [ ] Practice creating a feature branch
- [ ] Make a small change
- [ ] Run linters and tests
- [ ] Create a pull request
- [ ] Understand code review process

### Day 3: Tools & Processes

- [ ] IDE configured (VS Code recommended)
- [ ] Extensions installed:
  - [ ] ESLint
  - [ ] Prettier
  - [ ] rust-analyzer
  - [ ] SQLite Viewer
- [ ] Understand CI/CD pipeline
- [ ] Know how to read CI logs

### Week 1: First Contribution

- [ ] Pick a "good first issue"
- [ ] Implement the change
- [ ] Write tests
- [ ] Submit PR
- [ ] Address review feedback
- [ ] See PR merged

### Ongoing

- [ ] Join team communication channels
- [ ] Attend relevant meetings
- [ ] Ask questions freely
- [ ] Document learnings
- [ ] Help improve onboarding for next person

---

## 6. Definition of Done

**When to use**: Criteria for considering work complete

### Code Complete

- [ ] Feature implemented as specified
- [ ] Code follows project style guidelines
- [ ] No TODO comments left unaddressed
- [ ] No commented-out code
- [ ] Self-documenting code with clear naming

### Quality Assured

- [ ] Unit tests written and passing
- [ ] Integration tests written (if applicable)
- [ ] Test coverage meets targets
- [ ] Manual testing completed
- [ ] Edge cases handled

### Security Verified

- [ ] No secrets in code
- [ ] Environment variables used for config
- [ ] Input validation implemented
- [ ] SQL injection prevented
- [ ] XSS prevention in place
- [ ] Authentication/authorization correct

### Code Reviewed

- [ ] Pull request created
- [ ] At least one approval received
- [ ] All review comments addressed
- [ ] No unresolved conversations

### CI/CD Passed

- [ ] All lint checks pass
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Security audit clean
- [ ] Coverage thresholds met

### Documentation Updated

- [ ] Code comments added where needed
- [ ] API documentation updated
- [ ] README updated (if applicable)
- [ ] CHANGELOG entry added
- [ ] User documentation updated (if user-facing)

### Deployment Ready

- [ ] Feature flag configured (if applicable)
- [ ] Database migrations included
- [ ] Rollback plan documented
- [ ] Monitoring/alerts configured

---

## Quick Reference: Common Commands

```bash
# Development
npm run dev              # Start frontend dev server
cargo run                # Start backend
npm run test:run         # Run frontend tests (one-shot)
cargo test               # Run backend tests

# Quality
npm run lint             # Lint frontend
cargo clippy             # Lint backend
npm run format           # Format frontend
cargo fmt                # Format backend

# Build
npm run build            # Build frontend
cargo build --release    # Build backend
build-prod.bat           # Build Docker images

# Verification
npm run verify:no-mocks  # Check for mock data
npm audit                # Security audit (npm)
```

---

## Version Format

```
MAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes (backward compatible)
```

---

## Commit Format

```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore
Scope: frontend, backend, ci, docs, etc.
```

---

*For detailed installation, see [INSTALL.md](INSTALL.md). For automation scripts, see [AUTOMATION_SCRIPTS.md](AUTOMATION_SCRIPTS.md).*
