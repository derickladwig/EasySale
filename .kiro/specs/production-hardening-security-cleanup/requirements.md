# Production Hardening Security Cleanup - Requirements

## Overview
Address critical security vulnerabilities and production readiness issues identified in technical-review-2026-01-25.md to achieve production deployment readiness.

## Non-Negotiables
- **NO DELETES**: Archive deprecated code with OldPath->NewPath mapping log
- **Evidence-based**: All file/line references must be verifiable
- **No history rewriting**: Add amendments, preserve original implementations
- **Fail-fast**: Security issues must cause build/deployment failures

## Requirements

### (A) SQL Injection Remediation - CRITICAL
**Files**: `backend/crates/server/src/handlers/reporting.rs` lines 155, 158, 211, 214, 327
**Issue**: Direct string interpolation of user input into SQL queries
**Requirements**:
- Remove all `format!()` usage with user input in SQL construction
- Replace with parameterized queries using `sqlx::QueryBuilder` or `query!` with `bind()`
- Add strict date validation (ISO 8601 format, range checks)
- Add SQL injection regression tests
- Add input sanitization tests

**Acceptance Criteria**:
- Zero `format!()` calls with user input in SQL context
- All date parameters validated before query construction
- Regression tests prevent future SQL injection
- Static analysis tools detect violations

### (B) CORS Configuration Hardening
**Files**: `backend/crates/server/src/main.rs` line 170
**Issue**: Hardcoded localhost origins in production code
**Requirements**:
- Make CORS origins configurable via environment/config
- Remove hardcoded localhost references
- Implement secure defaults (empty = deny all)
- Add origin validation
- Document configuration options

**Acceptance Criteria**:
- CORS origins read from `CORS_ALLOWED_ORIGINS` env var or config
- No hardcoded localhost in production builds
- Invalid origins rejected with proper error messages
- Configuration documented in deployment guides

### (C) OAuth Redirect URI Configuration
**Files**: `backend/crates/server/src/config/profile.rs` lines 556, 632
**Issue**: Hardcoded localhost:7945 in QuickBooks OAuth
**Requirements**:
- Make redirect URI configurable via environment variables
- Add URI validation (HTTPS in production, format validation)
- Remove hardcoded localhost references
- Add configuration validation tests
- Document OAuth setup process

**Acceptance Criteria**:
- Redirect URI read from `QUICKBOOKS_REDIRECT_URI` environment variable
- HTTPS enforcement in production profiles
- URI format validation prevents malformed URLs
- Clear error messages for misconfiguration

### (D) Mock Data Removal - Frontend
**Files**: `frontend/src/features/admin/components/RolesTab.tsx` line 35
**Issue**: Hardcoded mock data preventing real functionality
**Requirements**:
- Remove mock roles array
- Implement real API integration with `/api/roles`
- Add loading, empty, and error states
- Add proper TypeScript types
- Add component tests for all states

**Acceptance Criteria**:
- No hardcoded mock data arrays in production components
- API integration handles all response scenarios
- Loading states provide user feedback
- Error states allow recovery actions
- Tests cover happy path and error scenarios

### (E) Password Security Implementation
**Files**: `backend/crates/server/src/handlers/user_handlers.rs` line 112
**Issue**: Placeholder password hashing using string concatenation
**Requirements**:
- Replace with bcrypt or argon2 implementation
- Add password verification function
- Implement migration strategy for existing users
- Add password strength validation
- Add timing attack protection

**Acceptance Criteria**:
- Cryptographically secure password hashing (bcrypt/argon2)
- Password verification with constant-time comparison
- Migration path for existing placeholder hashes
- Password strength requirements enforced
- Timing attack resistance verified

### (F) Stub Endpoint Resolution
**Files**: 
- `backend/crates/server/src/handlers/reporting.rs` lines 594-597
- `backend/crates/server/src/handlers/data_management.rs` line 163
**Issue**: "Coming soon" placeholder responses
**Requirements**:
- Implement minimal functional endpoints OR
- Add feature flag gating with structured 501 responses
- Remove "coming soon" text responses
- Add contract tests for endpoint behavior
- Document endpoint capabilities/limitations

**Acceptance Criteria**:
- No "coming soon" text in API responses
- Structured error responses with proper HTTP codes
- Feature flags control endpoint availability
- Contract tests verify response schemas
- API documentation reflects actual capabilities

### (G) Tenant Context Resolution
**Files**: `backend/crates/server/src/handlers/sync_operations.rs` lines 69, 142, 194, 246
**Issue**: Hardcoded "default-tenant" values
**Requirements**:
- Extract tenant ID from authentication context
- Fail with 401/403 when tenant context missing
- Add tenant validation middleware
- Add tenant isolation tests
- Document tenant resolution process

**Acceptance Criteria**:
- Tenant ID derived from authenticated session
- Proper HTTP error codes for missing/invalid tenant
- Middleware enforces tenant isolation
- Tests verify tenant boundary enforcement
- Multi-tenant security documented

### (H) Code Quality Cleanup
**Files**: 
- `backend/crates/server/src/main.rs` line 2 (global dead code suppression)
- `backend/crates/server/src/handlers/integrations.rs` lines 183, 274 (TODOs)
**Requirements**:
- Replace global `#![allow(dead_code)]` with targeted allows
- Resolve or document TODO comments
- Add feature gating for incomplete implementations
- Remove unused code or document retention reasons
- Add code quality gates in CI

**Acceptance Criteria**:
- No global dead code suppression
- All TODO comments resolved or documented as limitations
- Unused code removed or explicitly preserved with justification
- CI enforces code quality standards

### (I) CI/CD Readiness Gates
**Requirements**:
- Frontend ESLint must pass with 0 errors in CI
- Backend cargo test must pass all tests
- Backend clippy must pass with 0 warnings
- Security scan integration
- Automated deployment gates

**Acceptance Criteria**:
- CI pipeline fails on any linting errors
- All tests pass before deployment
- Static analysis tools integrated
- Security vulnerabilities block deployment
- Deployment requires manual approval for production

## Verification Steps

### Security Verification
1. Run SQL injection test suite
2. Verify CORS configuration in different environments
3. Test OAuth flow with production URIs
4. Validate password hashing with security tools
5. Confirm tenant isolation with multi-tenant tests

### Functional Verification
1. Test all modified endpoints with real data
2. Verify frontend components with API integration
3. Confirm error handling and user feedback
4. Test migration scenarios
5. Validate configuration loading

### Quality Gates
1. ESLint passes with 0 errors
2. Cargo test passes all tests
3. Clippy passes with 0 warnings
4. Security scan shows no critical issues
5. Performance tests meet benchmarks

## Success Metrics
- Zero critical security vulnerabilities
- All production readiness blockers resolved
- CI/CD pipeline enforces quality gates
- Documentation covers all configuration options
- Migration path tested and documented

## Risk Mitigation
- Staged rollout with feature flags
- Rollback procedures documented
- Database migration testing
- Security review before production deployment
- Monitoring and alerting for new issues
