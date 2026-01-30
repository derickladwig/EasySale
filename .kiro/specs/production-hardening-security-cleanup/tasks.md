# Production Hardening Security Cleanup - Tasks

## Task Execution Order
Tasks ordered by criticality and dependency requirements. Each task includes commands, verification steps, and evidence artifacts.

---

## Phase 1: Critical Security Fixes (Priority: CRITICAL)

### Task A1: Fix SQL Injection in Reporting Handler
**Priority**: CRITICAL  
**Files**: `backend/crates/server/src/handlers/reporting.rs`  
**Lines**: 155, 158, 211, 214, 327  

**Commands**:
```bash
# 1. Create date validation module
touch backend/crates/server/src/validators/date_validator.rs

# 2. Add bcrypt dependency
cd backend && cargo add sqlx --features "chrono"

# 3. Run existing tests to establish baseline
cd backend && cargo test handlers::reporting --no-fail-fast

# 4. Create SQL injection test
touch backend/crates/server/src/handlers/reporting_security_tests.rs
```

**Implementation Steps**:
1. Archive current implementation:
   ```bash
   cp backend/crates/server/src/handlers/reporting.rs \
      archive/code/reporting_handler_pre_sql_fix.rs
   echo "reporting.rs -> archive/code/reporting_handler_pre_sql_fix.rs" >> archive/ARCHIVE_POLICY.md
   ```

2. Replace vulnerable code:
   - Lines 155, 158: Replace `format!(" AND created_at >= '{}'", start_date)` with QueryBuilder
   - Lines 211, 214: Replace `format!(" AND st.created_at >= '{}'", start_date)` with QueryBuilder
   - Line 327: Replace `format!(" AND c.created_at >= '{}'", start_date)` with QueryBuilder

3. Add input validation:
   ```rust
   fn validate_date_input(date_str: &str) -> Result<chrono::NaiveDate, ValidationError> {
       chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d")
           .map_err(|_| ValidationError::InvalidDateFormat)
   }
   ```

**Verification Commands**:
```bash
# Test SQL injection prevention
cd backend && cargo test sql_injection_prevention

# Verify no format! with user input
grep -r "format!" backend/crates/server/src/handlers/reporting.rs || echo "PASS: No format! found"

# Run security scan
cd backend && cargo audit
```

**Evidence Artifacts**:
- `archive/code/reporting_handler_pre_sql_fix.rs` - Original implementation
- `backend/crates/server/src/handlers/reporting_security_tests.rs` - Security tests
- Test output showing SQL injection prevention
- Cargo audit clean report

---

### Task A2: Implement Secure Password Hashing
**Priority**: CRITICAL  
**Files**: `backend/crates/server/src/handlers/user_handlers.rs`  
**Lines**: 112  

**Commands**:
```bash
# 1. Add bcrypt dependency
cd backend && cargo add bcrypt

# 2. Create password service
touch backend/crates/server/src/services/password_service.rs

# 3. Create migration script
touch backend/scripts/migrate_password_hashes.rs
```

**Implementation Steps**:
1. Archive current implementation:
   ```bash
   cp backend/crates/server/src/handlers/user_handlers.rs \
      archive/code/user_handlers_pre_password_fix.rs
   echo "user_handlers.rs -> archive/code/user_handlers_pre_password_fix.rs" >> archive/ARCHIVE_POLICY.md
   ```

2. Replace placeholder hashing:
   ```rust
   // OLD (Line 112): let password_hash = format!("hashed_{}", req.password);
   // NEW:
   use crate::services::password_service::PasswordService;
   let password_hash = PasswordService::hash_password(&req.password)
       .map_err(|_| ApiError::internal("Password hashing failed"))?;
   ```

3. Add password verification:
   ```rust
   fn verify_password(password: &str, hash: &str) -> Result<bool, PasswordError> {
       bcrypt::verify(password, hash).map_err(PasswordError::VerificationFailed)
   }
   ```

**Verification Commands**:
```bash
# Test password hashing
cd backend && cargo test password_service

# Verify no placeholder hashing
grep -r "hashed_" backend/crates/server/src/handlers/user_handlers.rs && echo "FAIL: Placeholder found" || echo "PASS: No placeholders"

# Test timing attack resistance
cd backend && cargo test timing_attack_resistance
```

**Evidence Artifacts**:
- `archive/code/user_handlers_pre_password_fix.rs` - Original implementation
- `backend/crates/server/src/services/password_service.rs` - New password service
- `backend/scripts/migrate_password_hashes.rs` - Migration script
- Password security test results

---

## Phase 2: Configuration Hardening (Priority: HIGH)

### Task B1: Make CORS Origins Configurable
**Priority**: HIGH  
**Files**: `backend/crates/server/src/main.rs`  
**Lines**: 170  

**Commands**:
```bash
# 1. Create CORS configuration module
touch backend/crates/server/src/config/cors_config.rs

# 2. Add environment variable support
echo 'CORS_ALLOWED_ORIGINS=""' >> backend/.env.example
```

**Implementation Steps**:
1. Archive current implementation:
   ```bash
   cp backend/crates/server/src/main.rs archive/code/main_pre_cors_fix.rs
   echo "main.rs -> archive/code/main_pre_cors_fix.rs" >> archive/ARCHIVE_POLICY.md
   ```

2. Replace hardcoded CORS:
   ```rust
   // OLD (Line 170): .allowed_origin("http://localhost:7945")
   // NEW:
   let cors_origins = std::env::var("CORS_ALLOWED_ORIGINS")
       .unwrap_or_else(|_| String::new()); // Secure default: empty = deny all
   let cors = build_cors_from_config(&cors_origins)?;
   ```

**Verification Commands**:
```bash
# Test CORS configuration
cd backend && CORS_ALLOWED_ORIGINS="https://example.com" cargo test cors_config

# Verify no hardcoded localhost
grep -r "localhost:7945" backend/crates/server/src/main.rs && echo "FAIL: Hardcoded found" || echo "PASS: No hardcoded origins"
```

**Evidence Artifacts**:
- `archive/code/main_pre_cors_fix.rs` - Original implementation
- `backend/crates/server/src/config/cors_config.rs` - CORS configuration module
- CORS configuration test results

---

### Task B2: Make OAuth Redirect URI Configurable
**Priority**: HIGH  
**Files**: `backend/crates/server/src/config/profile.rs`  
**Lines**: 556, 632  

**Commands**:
```bash
# 1. Create OAuth configuration module
touch backend/crates/server/src/config/oauth_config.rs

# 2. Add environment variables
echo 'QUICKBOOKS_REDIRECT_URI=""' >> backend/.env.example
echo 'GOOGLE_DRIVE_REDIRECT_URI=""' >> backend/.env.example
```

**Implementation Steps**:
1. Archive current implementation:
   ```bash
   cp backend/crates/server/src/config/profile.rs archive/code/profile_pre_oauth_fix.rs
   echo "profile.rs -> archive/code/profile_pre_oauth_fix.rs" >> archive/ARCHIVE_POLICY.md
   ```

2. Replace hardcoded URIs:
   ```rust
   // OLD (Lines 556, 632): std::env::set_var("QUICKBOOKS_REDIRECT_URI", "http://localhost:7945/callback");
   // NEW:
   let redirect_uri = std::env::var("QUICKBOOKS_REDIRECT_URI")
       .map_err(|_| ConfigError::MissingOAuthRedirectUri)?;
   validate_oauth_redirect_uri(&redirect_uri, &profile)?;
   ```

**Verification Commands**:
```bash
# Test OAuth configuration
cd backend && QUICKBOOKS_REDIRECT_URI="https://example.com/callback" cargo test oauth_config

# Verify no hardcoded localhost
grep -r "localhost:7945" backend/crates/server/src/config/profile.rs && echo "FAIL: Hardcoded found" || echo "PASS: No hardcoded URIs"
```

**Evidence Artifacts**:
- `archive/code/profile_pre_oauth_fix.rs` - Original implementation
- `backend/crates/server/src/config/oauth_config.rs` - OAuth configuration module
- OAuth configuration test results

---

## Phase 3: Frontend Integration (Priority: HIGH)

### Task C1: Remove Mock Data from RolesTab
**Priority**: HIGH  
**Files**: `frontend/src/features/admin/components/RolesTab.tsx`  
**Lines**: 35  

**Commands**:
```bash
# 1. Create roles API hook
touch frontend/src/features/admin/hooks/useRoles.ts

# 2. Create roles API client
touch frontend/src/features/admin/api/rolesApi.ts

# 3. Create component tests
touch frontend/src/features/admin/components/__tests__/RolesTab.integration.test.tsx
```

**Implementation Steps**:
1. Archive current implementation:
   ```bash
   cp frontend/src/features/admin/components/RolesTab.tsx \
      archive/code/RolesTab_pre_api_integration.tsx
   echo "RolesTab.tsx -> archive/code/RolesTab_pre_api_integration.tsx" >> archive/ARCHIVE_POLICY.md
   ```

2. Replace mock data with API integration:
   ```typescript
   // OLD (Line 35): const mockRoles: Role[] = [...]
   // NEW:
   const { data: roles, loading, error, refetch } = useRoles();
   ```

3. Add loading/error states:
   ```typescript
   if (loading) return <RolesLoadingState />;
   if (error) return <RolesErrorState onRetry={refetch} />;
   if (!roles?.length) return <RolesEmptyState />;
   ```

**Verification Commands**:
```bash
# Test component with API integration
cd frontend && npm test RolesTab.integration.test.tsx

# Verify no mock data arrays
grep -r "mockRoles.*=.*\[" frontend/src/features/admin/components/RolesTab.tsx && echo "FAIL: Mock data found" || echo "PASS: No mock data"

# Run ESLint
cd frontend && npm run lint
```

**Evidence Artifacts**:
- `archive/code/RolesTab_pre_api_integration.tsx` - Original implementation
- `frontend/src/features/admin/hooks/useRoles.ts` - API hook
- `frontend/src/features/admin/api/rolesApi.ts` - API client
- Component integration test results

---

## Phase 4: Endpoint Hardening (Priority: MEDIUM)

### Task D1: Replace Stub Export Endpoints
**Priority**: MEDIUM  
**Files**: 
- `backend/crates/server/src/handlers/reporting.rs` (lines 594-597)
- `backend/crates/server/src/handlers/data_management.rs` (line 163)

**Commands**:
```bash
# 1. Create feature flag system
touch backend/crates/server/src/config/feature_flags.rs

# 2. Create structured error responses
touch backend/crates/server/src/models/api_errors.rs

# 3. Add contract tests
touch backend/crates/server/src/handlers/contract_tests.rs
```

**Implementation Steps**:
1. Archive current implementations:
   ```bash
   cp backend/crates/server/src/handlers/reporting.rs archive/code/reporting_pre_stub_fix.rs
   cp backend/crates/server/src/handlers/data_management.rs archive/code/data_management_pre_stub_fix.rs
   echo "reporting.rs -> archive/code/reporting_pre_stub_fix.rs" >> archive/ARCHIVE_POLICY.md
   echo "data_management.rs -> archive/code/data_management_pre_stub_fix.rs" >> archive/ARCHIVE_POLICY.md
   ```

2. Replace "coming soon" responses:
   ```rust
   // OLD: "message": "Export functionality coming soon"
   // NEW:
   if !features.export_enabled {
       return Ok(HttpResponse::NotImplemented().json(ApiError::feature_disabled("export")));
   }
   ```

**Verification Commands**:
```bash
# Test feature flag responses
cd backend && cargo test feature_flag_endpoints

# Verify no "coming soon" text
grep -r "coming soon" backend/crates/server/src/handlers/ && echo "FAIL: Coming soon found" || echo "PASS: No coming soon text"

# Test contract compliance
cd backend && cargo test contract_tests
```

**Evidence Artifacts**:
- `archive/code/reporting_pre_stub_fix.rs` - Original reporting handler
- `archive/code/data_management_pre_stub_fix.rs` - Original data management handler
- `backend/crates/server/src/config/feature_flags.rs` - Feature flag system
- Contract test results

---

## Phase 5: Tenant Security (Priority: MEDIUM)

### Task E1: Remove Hardcoded Tenant IDs
**Priority**: MEDIUM  
**Files**: `backend/crates/server/src/handlers/sync_operations.rs`  
**Lines**: 69, 142, 194, 246  

**Commands**:
```bash
# 1. Create tenant context middleware
touch backend/crates/server/src/middleware/tenant_context.rs

# 2. Create tenant extraction utilities
touch backend/crates/server/src/auth/tenant_extraction.rs

# 3. Add tenant isolation tests
touch backend/crates/server/src/tests/tenant_isolation_tests.rs
```

**Implementation Steps**:
1. Archive current implementation:
   ```bash
   cp backend/crates/server/src/handlers/sync_operations.rs \
      archive/code/sync_operations_pre_tenant_fix.rs
   echo "sync_operations.rs -> archive/code/sync_operations_pre_tenant_fix.rs" >> archive/ARCHIVE_POLICY.md
   ```

2. Replace hardcoded tenant IDs:
   ```rust
   // OLD (Lines 69, 142, 194, 246): let tenant_id = "default-tenant";
   // NEW:
   let tenant_id = extract_tenant_from_context(&req)
       .ok_or_else(|| ApiError::unauthorized("Tenant context required"))?;
   ```

**Verification Commands**:
```bash
# Test tenant extraction
cd backend && cargo test tenant_context

# Verify no hardcoded tenant IDs
grep -r "default-tenant" backend/crates/server/src/handlers/sync_operations.rs && echo "FAIL: Hardcoded tenant found" || echo "PASS: No hardcoded tenants"

# Test tenant isolation
cd backend && cargo test tenant_isolation
```

**Evidence Artifacts**:
- `archive/code/sync_operations_pre_tenant_fix.rs` - Original implementation
- `backend/crates/server/src/middleware/tenant_context.rs` - Tenant middleware
- Tenant isolation test results

---

## Phase 6: Code Quality & CI/CD (Priority: LOW)

### Task F1: Remove Global Dead Code Suppression
**Priority**: LOW  
**Files**: `backend/crates/server/src/main.rs`  
**Lines**: 2  

**Commands**:
```bash
# 1. Analyze dead code
cd backend && cargo clippy -- -W dead_code

# 2. Create targeted suppression plan
touch backend/docs/dead_code_analysis.md

# 3. Add CI quality gates
touch .github/workflows/quality-gates.yml
```

**Implementation Steps**:
1. Archive current implementation:
   ```bash
   cp backend/crates/server/src/main.rs archive/code/main_pre_dead_code_fix.rs
   echo "main.rs -> archive/code/main_pre_dead_code_fix.rs" >> archive/ARCHIVE_POLICY.md
   ```

2. Remove global suppression:
   ```rust
   // OLD (Line 2): #![allow(dead_code)]
   // NEW: Remove global allow, add targeted allows with justification
   ```

3. Add targeted suppressions:
   ```rust
   #[allow(dead_code)] // Infrastructure code for future OAuth integration
   fn prepare_oauth_state() { ... }
   ```

**Verification Commands**:
```bash
# Test clippy passes
cd backend && cargo clippy -- -D warnings

# Verify no global dead code suppression
grep -r "#!\[allow(dead_code)\]" backend/crates/server/src/main.rs && echo "FAIL: Global suppression found" || echo "PASS: No global suppression"

# Test CI quality gates
.github/workflows/quality-gates.yml
```

**Evidence Artifacts**:
- `archive/code/main_pre_dead_code_fix.rs` - Original implementation
- `backend/docs/dead_code_analysis.md` - Dead code analysis
- `.github/workflows/quality-gates.yml` - CI quality gates
- Clippy clean report

---

### Task F2: Resolve Integration Handler TODOs
**Priority**: LOW  
**Files**: `backend/crates/server/src/handlers/integrations.rs`  
**Lines**: 183, 274  

**Commands**:
```bash
# 1. Analyze TODO comments
grep -n "TODO" backend/crates/server/src/handlers/integrations.rs

# 2. Create implementation plan
touch backend/docs/integration_todos_resolution.md
```

**Implementation Steps**:
1. Archive current implementation:
   ```bash
   cp backend/crates/server/src/handlers/integrations.rs \
      archive/code/integrations_pre_todo_fix.rs
   echo "integrations.rs -> archive/code/integrations_pre_todo_fix.rs" >> archive/ARCHIVE_POLICY.md
   ```

2. Resolve or document TODOs:
   ```rust
   // OLD (Line 183): // TODO: Get redirect_uri from config or environment
   // NEW: Implemented in oauth_config.rs or documented as limitation
   ```

**Verification Commands**:
```bash
# Verify TODO resolution
grep -r "TODO" backend/crates/server/src/handlers/integrations.rs | wc -l

# Test integration handler
cd backend && cargo test handlers::integrations
```

**Evidence Artifacts**:
- `archive/code/integrations_pre_todo_fix.rs` - Original implementation
- `backend/docs/integration_todos_resolution.md` - TODO resolution plan
- Integration handler test results

---

## Phase 7: CI/CD Quality Gates (Priority: LOW)

### Task G1: Implement Frontend Quality Gates
**Priority**: LOW  
**Files**: `.github/workflows/`  

**Commands**:
```bash
# 1. Create frontend quality workflow
touch .github/workflows/frontend-quality.yml

# 2. Update ESLint configuration
cd frontend && npm run lint -- --max-warnings 0
```

**Implementation Steps**:
1. Create frontend quality workflow:
   ```yaml
   name: Frontend Quality Gates
   on: [push, pull_request]
   jobs:
     lint:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Setup Node.js
           uses: actions/setup-node@v3
         - name: Install dependencies
           run: cd frontend && npm ci
         - name: Run ESLint (0 errors required)
           run: cd frontend && npm run lint -- --max-warnings 0
   ```

**Verification Commands**:
```bash
# Test ESLint passes with 0 errors
cd frontend && npm run lint -- --max-warnings 0

# Test workflow syntax
act -n -j lint
```

**Evidence Artifacts**:
- `.github/workflows/frontend-quality.yml` - Frontend quality workflow
- ESLint clean report (0 errors, 0 warnings)

---

### Task G2: Implement Backend Quality Gates
**Priority**: LOW  
**Files**: `.github/workflows/`  

**Commands**:
```bash
# 1. Create backend quality workflow
touch .github/workflows/backend-quality.yml

# 2. Test all quality checks
cd backend && cargo test && cargo clippy -- -D warnings
```

**Implementation Steps**:
1. Create backend quality workflow:
   ```yaml
   name: Backend Quality Gates
   on: [push, pull_request]
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Setup Rust
           uses: actions-rs/toolchain@v1
         - name: Run tests
           run: cd backend && cargo test
         - name: Run clippy (0 warnings required)
           run: cd backend && cargo clippy -- -D warnings
   ```

**Verification Commands**:
```bash
# Test all backend quality checks
cd backend && cargo test && cargo clippy -- -D warnings && cargo audit

# Test workflow syntax
act -n -j test
```

**Evidence Artifacts**:
- `.github/workflows/backend-quality.yml` - Backend quality workflow
- Cargo test clean report (all tests pass)
- Clippy clean report (0 warnings)
- Cargo audit clean report

---

## Final Verification Checklist

### Security Verification
- [ ] SQL injection tests pass
- [ ] Password hashing uses bcrypt/argon2
- [ ] CORS origins configurable
- [ ] OAuth URIs configurable
- [ ] Tenant isolation enforced
- [ ] No hardcoded secrets in code

### Functional Verification
- [ ] All API endpoints return proper responses
- [ ] Frontend components integrate with real APIs
- [ ] Error handling provides user feedback
- [ ] Loading states implemented
- [ ] Migration scripts tested

### Quality Verification
- [ ] ESLint passes with 0 errors
- [ ] Cargo test passes all tests
- [ ] Clippy passes with 0 warnings
- [ ] No global code suppressions
- [ ] All TODOs resolved or documented

### Documentation Verification
- [ ] Configuration options documented
- [ ] Security measures documented
- [ ] Migration procedures documented
- [ ] API changes documented
- [ ] Deployment guides updated

## Evidence Collection Commands

```bash
# Generate final security report
./scripts/generate_security_report.sh > evidence/security_report.md

# Generate test coverage report
cd backend && cargo tarpaulin --out Html
cd frontend && npm run test:coverage

# Generate quality metrics
cd backend && cargo clippy --message-format json > evidence/clippy_report.json
cd frontend && npm run lint -- --format json > evidence/eslint_report.json

# Generate deployment readiness report
./scripts/deployment_readiness_check.sh > evidence/deployment_readiness.md
```

## Success Criteria
- All critical and high priority tasks completed
- Security vulnerabilities resolved
- Quality gates passing in CI/CD
- Documentation updated
- Evidence artifacts collected
- Production deployment approved
