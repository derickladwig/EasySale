# Production Hardening Security Cleanup - Design

## Architecture Overview
Systematic security hardening approach addressing critical vulnerabilities while maintaining backward compatibility and operational continuity.

## Design Principles
- **Security First**: All changes prioritize security over convenience
- **Fail Secure**: Default to secure configurations, explicit opt-in for permissive settings
- **Defense in Depth**: Multiple layers of validation and protection
- **Audit Trail**: All security-relevant changes logged and traceable

## Component-Level Design

### (A) SQL Injection Prevention - Backend Handlers

**File**: `backend/crates/server/src/handlers/reporting.rs`

**Current State**:
```rust
// VULNERABLE - Line 155
sql.push_str(&format!(" AND created_at >= '{}'", start_date));
```

**Target State**:
```rust
// SECURE - Parameterized query
let mut query = sqlx::QueryBuilder::new("SELECT ... WHERE 1=1");
if let Some(start_date) = &query_params.start_date {
    query.push(" AND created_at >= ").push_bind(start_date);
}
```

**Implementation Strategy**:
1. Create `DateValidator` struct for input validation
2. Replace all `format!()` calls with `QueryBuilder::push_bind()`
3. Add `validate_date_range()` function with ISO 8601 parsing
4. Implement query builder pattern for dynamic WHERE clauses
5. Add regression tests with malicious input

**Security Controls**:
- Input validation before query construction
- Parameterized queries prevent injection
- Date range validation prevents overflow attacks
- SQL query logging for audit trail

### (B) CORS Configuration System - Server Main

**File**: `backend/crates/server/src/main.rs`

**Current State**:
```rust
// HARDCODED - Line 170
.allowed_origin("http://localhost:7945")
```

**Target State**:
```rust
// CONFIGURABLE
let cors_origins = config.cors.allowed_origins
    .unwrap_or_else(|| vec![]); // Secure default: deny all
let cors = build_cors_config(cors_origins)?;
```

**Implementation Strategy**:
1. Add `CorsConfig` struct to configuration system
2. Create `build_cors_config()` function with validation
3. Add environment variable `CORS_ALLOWED_ORIGINS` support
4. Implement origin validation with regex patterns
5. Add configuration validation tests

**Security Controls**:
- Explicit origin allowlist (no wildcards in production)
- Environment-specific configuration
- Origin validation prevents header injection
- Secure defaults deny all origins

### (C) OAuth URI Configuration - Config Profile

**File**: `backend/crates/server/src/config/profile.rs`

**Current State**:
```rust
// HARDCODED - Lines 556, 632
std::env::set_var("QUICKBOOKS_REDIRECT_URI", "http://localhost:7945/callback");
```

**Target State**:
```rust
// CONFIGURABLE with validation
let redirect_uri = env::var("QUICKBOOKS_REDIRECT_URI")
    .map_err(|_| ConfigError::MissingOAuthRedirectUri)?;
validate_oauth_redirect_uri(&redirect_uri, &profile)?;
```

**Implementation Strategy**:
1. Create `OAuthConfig` struct with URI validation
2. Add `validate_oauth_redirect_uri()` with HTTPS enforcement
3. Remove hardcoded localhost references
4. Add profile-specific validation rules
5. Document OAuth setup in deployment guide

**Security Controls**:
- HTTPS enforcement in production profiles
- URI format validation prevents malformed redirects
- Domain allowlist for redirect URIs
- Configuration validation at startup

### (D) API Integration - Frontend Components

**File**: `frontend/src/features/admin/components/RolesTab.tsx`

**Current State**:
```typescript
// MOCK DATA - Line 35
const mockRoles: Role[] = [
  { id: 'admin', name: 'Administrator', ... }
];
```

**Target State**:
```typescript
// REAL API INTEGRATION
const { data: roles, loading, error } = useRoles();
return (
  <RolesList 
    roles={roles} 
    loading={loading} 
    error={error}
    onRetry={refetch}
  />
);
```

**Implementation Strategy**:
1. Create `useRoles()` hook with React Query
2. Implement loading, error, and empty states
3. Add proper TypeScript interfaces
4. Create `RolesList` component with state handling
5. Add comprehensive component tests

**Security Controls**:
- API authentication required for role data
- Input validation on role operations
- Error messages don't leak sensitive information
- RBAC enforcement on role management

### (E) Password Security - User Handlers

**File**: `backend/crates/server/src/handlers/user_handlers.rs`

**Current State**:
```rust
// INSECURE - Line 112
let password_hash = format!("hashed_{}", req.password);
```

**Target State**:
```rust
// SECURE - bcrypt implementation
use bcrypt::{hash, verify, DEFAULT_COST};
let password_hash = hash(&req.password, DEFAULT_COST)
    .map_err(|_| ApiError::internal("Password hashing failed"))?;
```

**Implementation Strategy**:
1. Add `bcrypt` dependency to Cargo.toml
2. Create `PasswordService` with hash/verify methods
3. Implement migration for existing placeholder hashes
4. Add password strength validation
5. Add timing attack protection tests

**Security Controls**:
- Cryptographically secure hashing (bcrypt cost 12+)
- Salt generation prevents rainbow table attacks
- Constant-time verification prevents timing attacks
- Password strength requirements enforced

### (F) Endpoint Implementation - Handlers

**Files**: 
- `backend/crates/server/src/handlers/reporting.rs`
- `backend/crates/server/src/handlers/data_management.rs`

**Current State**:
```rust
// PLACEHOLDER - Line 597
"message": "Export functionality coming soon"
```

**Target State**:
```rust
// FEATURE GATED
if !features.export_enabled {
    return Ok(HttpResponse::NotImplemented().json(ApiError::feature_disabled("export")));
}
// Minimal implementation or structured 501
```

**Implementation Strategy**:
1. Add feature flag system to configuration
2. Create structured error responses for disabled features
3. Implement minimal export functionality OR proper 501 responses
4. Add contract tests for endpoint behavior
5. Document feature availability in API docs

**Security Controls**:
- Feature flags prevent access to incomplete functionality
- Structured error responses don't leak implementation details
- Rate limiting on export endpoints
- Audit logging for export operations

### (G) Tenant Context Resolution - Sync Operations

**File**: `backend/crates/server/src/handlers/sync_operations.rs`

**Current State**:
```rust
// HARDCODED - Lines 69, 142, 194, 246
let tenant_id = "default-tenant";
```

**Target State**:
```rust
// CONTEXT DERIVED
let tenant_id = extract_tenant_from_context(&req)
    .ok_or_else(|| ApiError::unauthorized("Tenant context required"))?;
```

**Implementation Strategy**:
1. Create `TenantContext` middleware for extraction
2. Add `extract_tenant_from_context()` function
3. Implement tenant validation in authentication
4. Add tenant isolation tests
5. Document tenant resolution process

**Security Controls**:
- Tenant isolation enforced at middleware level
- Authentication required for tenant access
- Tenant boundary validation prevents cross-tenant access
- Audit logging for tenant operations

### (H) Code Quality Gates - Build System

**Files**: Various backend handlers and main.rs

**Current State**:
```rust
// GLOBAL SUPPRESSION - Line 2
#![allow(dead_code)]
```

**Target State**:
```rust
// TARGETED SUPPRESSION
#[allow(dead_code)] // Reason: Infrastructure code for future features
fn internal_helper() { ... }
```

**Implementation Strategy**:
1. Remove global dead code suppression
2. Add targeted allows with justification comments
3. Resolve or document all TODO comments
4. Add CI quality gates (clippy, tests, linting)
5. Create code quality documentation

**Security Controls**:
- Static analysis tools detect security issues
- Code review required for suppression additions
- CI pipeline enforces quality standards
- Security linting integrated into build process

## Data Flow Security

### Authentication Flow
```
Request → Auth Middleware → Tenant Extraction → Handler → Response
         ↓                ↓                    ↓
    JWT Validation   Tenant Validation   RBAC Check
```

### Query Security Flow
```
User Input → Validation → Parameterized Query → Database
           ↓            ↓                     ↓
      Type Check   SQL Injection Prevention  Audit Log
```

### Configuration Security Flow
```
Environment → Validation → Secure Defaults → Runtime Config
            ↓            ↓                  ↓
       Format Check  Security Rules    Error Handling
```

## Migration Strategy

### Phase 1: Critical Security (Week 1)
- SQL injection fixes
- Password hashing implementation
- CORS configuration

### Phase 2: Configuration Hardening (Week 2)
- OAuth URI configuration
- Tenant context resolution
- Feature flag implementation

### Phase 3: Quality & Integration (Week 3)
- Mock data removal
- Code quality cleanup
- CI/CD gate implementation

### Phase 4: Validation & Documentation (Week 4)
- Security testing
- Performance validation
- Documentation completion

## Testing Strategy

### Security Tests
- SQL injection regression tests
- Authentication bypass attempts
- Tenant isolation validation
- Password security verification

### Integration Tests
- API endpoint contract tests
- Configuration validation tests
- Error handling verification
- Migration scenario testing

### Performance Tests
- Query performance with parameterization
- Password hashing benchmarks
- CORS preflight optimization
- Memory usage validation

## Monitoring & Alerting

### Security Metrics
- Failed authentication attempts
- SQL injection attempt detection
- Configuration validation failures
- Unauthorized tenant access attempts

### Performance Metrics
- Query execution times
- Password hashing duration
- API response times
- Error rates by endpoint

### Operational Metrics
- Feature flag usage
- Migration progress
- Code quality trends
- CI/CD pipeline success rates
