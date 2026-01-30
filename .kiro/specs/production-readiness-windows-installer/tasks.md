# Implementation Plan: Production Readiness and Windows Installer

## Overview

This implementation plan transforms EasySale into a production-ready, white-label POS system with Windows non-Docker distribution. The plan follows a phased approach starting with evidence gathering and route inventory, then build integrity, runtime profiles, demo isolation, white-label hardening, security controls, CI gates, and finally Windows installer suite.

**Policy**: NO DELETES. Archive only with mapping logs.

**Target Tag**: production-readiness-windows-installer

## Tasks

- [x] 1. Epic 0: Evidence + Route Inventory (Truth Sync)
  - [x] 1.1 Frontend route inventory (React Router)
    - Scan `frontend/src/App.tsx` and all route definitions
    - Output: `audit/ROUTES_FRONTEND.md` (route -> file -> notes)
    - _Requirements: 2.1, 2.6, 2.7, 2.8, 2.9_
  
  - [x] 1.2 Backend route inventory (Actix registration)
    - Scan backend route registration in server startup
    - Output: `audit/ROUTES_BACKEND.md`
    - _Requirements: 4.4, 5.1, 5.2, 5.3_
  
  - [x] 1.3 Baseline forbidden-pattern scan
    - Scan for demo credentials, mock arrays, CAPS tokens, vehicle terms
    - Output: `audit/FORBIDDEN_SCAN_BASELINE.md` (path, line, match, rule-id)
    - _Requirements: 2.1, 2.2, 2.3, 3.2, 11.1, 11.2, 11.3_
  
  - [x] 1.4 Path truth documentation
    - Document backend workspace structure (backend/ not backend/rust)
    - Document binary name (EasySale-server)
    - Output: `audit/PATH_TRUTH.md`
    - _Requirements: 1.4, 1.7, 1.8_

- [x] 2. Epic 1: Build Integrity + CI Path Fixes (P0)
  - [x] 2.1 Remove all stale `backend/rust` references
    - Update GitHub workflows in `.github/workflows/`
    - Update `build-prod.bat` and other build scripts
    - Update documentation references
    - Acceptance: `rg "backend/rust"` finds 0 matches (excluding archive)
    - _Requirements: 1.4, 1.7, 1.8_
  
  - [x] 2.2 Backend SQLx offline mode in CI
    - Add/verify `.sqlx/` generation script: `backend/scripts/sqlx_prepare.ps1`
    - Create `backend/scripts/sqlx_check.ps1` (runs `SQLX_OFFLINE=true cargo check`)
    - Update CI workflows to use `SQLX_OFFLINE=true`
    - _Requirements: 1.1_
  
  - [x] 2.3 Frontend build stability
    - Run `npm run lint` and fix errors or configure exclusions for node scripts/tests
    - Run `npm run build` and fix TypeScript compilation errors
    - Acceptance: Both commands pass without errors
    - _Requirements: 1.2, 1.3_
  
  - [x] 2.4 Archive exclusion from builds
    - Ensure `archive/` paths excluded from Rust workspace compilation
    - Ensure `archive/` excluded from TypeScript build
    - Ensure `archive/` excluded from packaging scripts
    - _Requirements: 1.6, 9.4, 9.5_
  
  - [x] 2.5 Release build scripts
    - Create `ci/build.ps1` (builds backend + frontend)
    - Create `ci/package.ps1` (creates ZIP artifacts)
    - Acceptance: Scripts produce deterministic output
    - _Requirements: 1.1, 1.2, 1.5, 7.1_
  
  - [x] 2.6 Write property test for stale path detection
    - **Property 1: Stale Path Detection**
    - Scan CI scripts and release scripts for stale patterns
    - **Validates: Requirements 1.4, 1.7, 1.8**
  
  - [x] 2.7 Write property test for archive exclusion
    - **Property 2: Archive Exclusion from Build**
    - Verify archive/ not in build outputs or packages
    - **Validates: Requirements 1.6, 9.4, 9.5**

- [x] 3. Checkpoint - Ensure build system passes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Epic 2: Runtime Profile + Config Contract (P0)
  - [x] 4.1 Implement `RUNTIME_PROFILE` (dev/demo/prod) in backend
    - Create `backend/crates/server/src/config/profile.rs`
    - Implement `RuntimeProfile` enum with Dev, Demo, Prod variants
    - Implement profile loading with precedence rules (CLI > env > tenant config > example config > defaults)
    - Add `--config <path>` CLI flag support for ProgramData config location
    - _Requirements: 4.1, 4.7, 10.1, 10.4_
  
  - [x] 4.2 Implement prod startup validator (aggregate errors)
    - Create `ConfigValidator` with profile-specific rules
    - Implement placeholder secret rejection (JWT_SECRET, etc.)
    - Implement demo mode enabled rejection in prod
    - Implement localhost OAuth rejection when integrations enabled
    - Implement dev endpoints rejection in prod
    - Aggregate all validation errors into single startup failure message
    - _Requirements: 4.2, 4.3, 4.4, 4.8, 10.5_
  
  - [x] 4.3 Standardize `DATABASE_PATH` (canonical key)
    - Update backend config loader to use DATABASE_PATH
    - Update database connection logic to use DATABASE_PATH
    - Update installer templates to use DATABASE_PATH
    - Update documentation to use DATABASE_PATH
    - Optional: Add compat mapping from DATABASE_URL with deprecation warning
    - Acceptance: Server boots fully from ProgramData config without repo paths
    - _Requirements: 4.7, 10.1_
  
  - [x] 4.4 Create configuration file templates
    - Create `configs/profiles/dev.toml` (relaxed validation)
    - Create `configs/profiles/demo.toml` (preset pack enabled)
    - Create `configs/profiles/prod.toml` (strict validation, no defaults)
    - Create `installer/windows/templates/server.env.template`
    - Create `installer/windows/templates/config.toml.template`
    - _Requirements: 4.1, 10.2, 10.3_
  
  - [x] 4.5 Write property test for profile-based validation
    - **Property 8: Profile-Based Configuration Validation**
    - **Validates: Requirements 4.2, 4.8**
  
  - [x] 4.6 Write property test for placeholder secret rejection
    - **Property 9: Placeholder Secret Rejection in Prod**
    - **Validates: Requirements 4.3**
  
  - [x] 4.7 Write property test for DATABASE_PATH consistency
    - **Property 11: DATABASE_PATH Consistency**
    - **Validates: Requirements 4.7, 10.1**
  
  - [x] 4.8 Write unit tests for ConfigValidator
    - Test missing required fields
    - Test placeholder secrets
    - Test localhost OAuth in prod
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 5. Epic 3: Demo Content Isolation (P0)
  - [x] 5.1 `/login` hardcoded demo creds removal
    - Scan and remove hardcoded demo credentials from login page
    - Replace `alt="CAPS Logo"` with brand-neutral alt from config
    - Implement demo-only helper that reads from preset pack when profile=demo
    - Acceptance: No hardcoded credentials in production login code
    - _Requirements: 2.1, 2.6_
  
  - [x] 5.2 `/reporting` remove hardcoded metrics
    - Replace hardcoded summary data and category constants with API calls
    - Must fetch from backend `/api/reports/*` endpoints
    - Implement empty states when no data available
    - Remove CAPS category references
    - Acceptance: No mock charts or hardcoded metrics in prod
    - _Requirements: 2.2, 2.3, 2.7_
  
  - [x] 5.3 `/lookup` remove CAPS-branded filters and mock lists
    - Replace CAPS-branded filter options with backend-derived metadata
    - Must query backend or show empty-state
    - Remove any hardcoded product/category lists
    - _Requirements: 2.2, 2.8_
  
  - [x] 5.4 `/admin` remove hardcoded feature flags list
    - Replace hardcoded feature list with backend capabilities endpoint
    - Must consume `/api/feature-flags` or `/api/config/capabilities`
    - Implement proper admin configuration management
    - _Requirements: 2.2, 2.9_
  
  - [x] 5.5 Add preset pack loader (demo only)
    - Create preset pack JSON schema
    - Implement backend preset loader (only when profile=demo)
    - Implement frontend preset loader
    - Create example demo preset pack in `configs/presets/*.json`
    - Acceptance: Demo data originates only from preset pack files
    - _Requirements: 2.4, 4.6_
  
  - [x] 5.6 Implement demo mode UI indicator
    - Create DemoModeIndicator component
    - Add indicator to main layout (demo profile only)
    - _Requirements: 2.5_
  
  - [x] 5.7 Write property test for demo content detection
    - **Property 3: Production Routes Free of Demo Content**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.6, 2.7, 2.8, 2.9**
  
  - [x] 5.8 Write property test for preset pack loading
    - **Property 4: Demo Content from Preset Packs Only**
    - **Validates: Requirements 2.4**

- [x] 6. Checkpoint - Ensure demo isolation complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Epic 4: White-Label Branding (P0)
  - [x] 7.1 Backend `GET /api/config/brand` (resolved tenant/store branding)
    - Implement endpoint that returns branding configuration
    - Include company name, logo URL, colors, terminology map
    - Support tenant and store-level overrides
    - _Requirements: 3.1, 3.3, 3.4_
  
  - [x] 7.2 Backend `GET /api/config/capabilities` (enabled modules)
    - Implement endpoint that returns enabled features/modules
    - Include vertical pack status (automotive, etc.)
    - _Requirements: 3.1, 3.5_
  
  - [x] 7.3 Frontend BrandingProvider (single source of truth)
    - Create `frontend/src/config/brandingProvider.ts`
    - Implement branding context and hooks (useBranding)
    - Load branding from `/api/config/brand` after tenant resolution
    - Cache in localStorage for offline access
    - _Requirements: 3.1, 3.3, 3.4_
  
  - [x] 7.4 Remove hardcoded branding tokens in core runtime
    - Scan for CAPS, caps-pos, caps-pos.local, vehicle-specific terms
    - Replace with branding provider values in all UI components
    - Ensure tokens only allowed in examples/presets/tests/archive
    - Acceptance: Readiness scan finds 0 matches in core runtime paths
    - _Requirements: 3.2_
  
  - [x] 7.5 Write property test for branding token detection
    - **Property 5: Core Runtime Paths Free of Branding Tokens**
    - **Validates: Requirements 3.2**
  
  - [x] 7.6 Write property test for branding configuration round trip
    - **Property 6: Branding Configuration Round Trip**
    - **Validates: Requirements 3.1, 3.3, 3.4**
  
  - [x] 7.7 Write property test for automotive features optional
    - **Property 7: Automotive Features Optional**
    - **Validates: Requirements 3.5**

- [x] 8. Epic 5: Automotive Optional Pack (P1)
  - [x] 8.1 Identify VIN/vehicle terms in core runtime paths
    - Scan for VIN, vehicle_fitment, /api/vin, automotive-specific code
    - Classify each: core removal vs optional pack vs tests/examples
    - Output: `audit/AUTOMOTIVE_CLASSIFICATION.md`
    - _Requirements: 3.5_
  
  - [x] 8.2 Implement optional "vertical pack" gating
    - Create automotive module toggle (default off)
    - Move automotive-specific code to optional module
    - Ensure core POS operations work without automotive features
    - Acceptance: Core runs successfully with automotive pack disabled
    - _Requirements: 3.5_
  
  - [x] 8.3 Write property test for automotive features optional
    - **Property 7: Automotive Features Optional**
    - **Validates: Requirements 3.5**

- [x] 9. Epic 6: Security Hardening + Endpoint Gating (P0)
  - [x] 9.1 QBO query value sanitization helper + tests
    - Create `backend/crates/server/src/security/qbo_sanitizer.rs`
    - Implement `sanitize_qbo_query_value()` (escape single quotes, etc.)
    - Update all QBO query builders to use sanitization
    - Write unit tests with special characters
    - _Requirements: 5.1_
  
  - [x] 9.2 SQL identifier allowlist enforcement + tests
    - Create `backend/crates/server/src/security/sql_allowlist.rs`
    - Define ALLOWED_TABLES and ALLOWED_COLUMNS constants
    - Implement validation functions
    - Update dynamic SQL queries to use allowlists
    - Write unit tests for validation
    - _Requirements: 5.2, 5.5_
  
  - [x] 9.3 OAuth redirect URI config-only (no hardcoded localhost)
    - Remove hardcoded localhost OAuth redirects from source
    - Implement config/env-driven OAuth redirect URIs
    - Add prod profile validation that rejects localhost
    - _Requirements: 5.3, 5.4_
  
  - [x] 9.4 Dev/debug/setup endpoint gating
    - Update route registration to check runtime profile
    - Option A: Don't register dev endpoints in prod profile
    - Option B: Register but require internal-only permission + audit logging
    - Disable setup endpoints in prod (unless fresh install detected)
    - Acceptance: Prod requests to dev endpoints return 404/403
    - _Requirements: 4.4_
  
  - [x] 9.5 Write property test for QBO input sanitization
    - **Property 12: QuickBooks Input Sanitization**
    - **Validates: Requirements 5.1**
  
  - [x] 9.6 Write property test for SQL identifier allowlisting
    - **Property 13: SQL Identifier Allowlisting**
    - **Validates: Requirements 5.2**
  
  - [x] 9.7 Write property test for OAuth configuration source
    - **Property 14: OAuth Configuration Source**
    - **Validates: Requirements 5.3**
  
  - [x] 9.8 Write property test for localhost OAuth rejection
    - **Property 15: Localhost OAuth Rejection in Prod**
    - **Validates: Requirements 5.4**
  
  - [x] 9.9 Write unit tests for security controls
    - Test QBO sanitization with special characters
    - Test SQL allowlist validation
    - Test OAuth validation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Epic 7: Reporting Implementation (P0)
  - [x] 10.1 Wire reporting UI to backend endpoints
    - Update reporting components to fetch from API
    - Implement empty states for no data
    - Remove hardcoded mock arrays
    - _Requirements: 6.1, 6.2_
  
  - [x] 10.2 Implement or gate export functionality
    - Implement CSV export for reports OR
    - Hide export buttons in prod if not implemented
    - _Requirements: 6.3, 6.4_
  
  - [x] 10.3 Write property test for reporting data source
    - **Property 17: Reporting Data from Backend**
    - **Validates: Requirements 6.1**
  
  - [x] 10.4 Write property test for export implementation
    - **Property 18: Export Implementation or Hiding**
    - **Validates: Requirements 6.3, 6.4**

- [x] 11. Checkpoint - Ensure security and reporting complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Epic 8: Readiness Gates (CI + Artifact) (P0)
  - [x] 12.1 Create policy file for forbidden patterns + allowlists
    - Create `ci/readiness-policy.json`
    - Define forbidden patterns (demo creds, mock arrays, CAPS tokens, vehicle terms)
    - Define scan paths (include Core_Runtime_Paths)
    - Define exclusions (archive/, tests/, fixtures/, configs/examples/, presets/)
    - _Requirements: 11.1, 11.2, 11.3, 11.6_
  
  - [x] 12.2 Implement readiness scanner (PowerShell or Node)
    - Create `ci/readiness-gate.ps1` (or `ci/readiness-gate.mjs`)
    - Implement pattern scanning for Core_Runtime_Paths
    - Must print matches with file + line + rule id
    - Implement exclusion logic for archive/tests/fixtures/presets
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.6_
  
  - [x] 12.3 CI integration: block prod builds on violations
    - Update GitHub workflows to run readiness gate
    - Fail builds when forbidden patterns detected
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  
  - [x] 12.4 Artifact validation: scan produced ZIP contents
    - Add artifact scanning to readiness gate
    - Verify excluded directories not in packages (no archive/, tests/, fixtures/)
    - _Requirements: 11.5, 11.7_
  
  - [x] 12.5 Write property test for readiness gate pattern detection
    - **Property 26: Readiness Gate Forbidden Pattern Detection**
    - **Validates: Requirements 11.1, 11.2, 11.3, 11.4**
  
  - [x] 12.6 Write property test for readiness gate scan scope
    - **Property 27: Readiness Gate Scan Scope**
    - **Validates: Requirements 11.6**
  
  - [x] 12.7 Write property test for artifact validation
    - **Property 28: Readiness Gate Artifact Validation**
    - **Validates: Requirements 11.7**

- [x] 13. Checkpoint - Ensure readiness gates complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 14. Epic 9: Windows Portable Distribution + Installer Suite (P0)
  - [x] 14.1 Package builder outputs deterministic ZIPs
    - Create `ci/package-windows.ps1`
    - Produce `EasySale-windows-server-vX.Y.Z.zip` (server exe + WinSW wrapper)
    - Produce `EasySale-windows-client-vX.Y.Z.zip` (frontend dist)
    - Include templates and installer scripts in packages
    - _Requirements: 7.1_
  
  - [x] 14.2 Decide and implement Windows Service strategy
    - **Option A (Recommended)**: WinSW shipped + configured
    - **Option B**: Rust native service using `windows-service` crate
    - Create `installer/windows/templates/EasySale-service.xml.template`
    - Configure service identity, permissions, and logging
    - _Requirements: 7.4, 7.6_
  
  - [x] 14.3 Implement `installer/windows/preflight.ps1`
    - Accept parameters: `-Mode -InstallPath -DataPath -Port -PolicyPath`
    - Implement .env parser function (Parse-EnvFile)
    - Implement blocking checks: config, secrets, ports, directories, migrations, health, dist
    - Implement policy checks: demo in prod, forbidden tokens, localhost OAuth
    - Generate JSON report + human summary
    - Return exit codes: 0=OK, 1=WARN, 2=BLOCK
    - Write report to deterministic location under ProgramData
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14_
  
  - [x] 14.4 Implement `installer/windows/install.ps1`
    - Accept parameters: `-Mode (prod/demo) -InstallPath -DataPath -ServiceName -Port`
    - Check administrator privileges
    - Run preflight checker (block on exit code 2)
    - Extract artifacts to Program Files
    - Create ProgramData structure (config, data, logs)
    - Generate configuration from templates
    - Install WinSW service
    - Start service
    - Add retries/backoff for health validation (not fixed sleeps)
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 13.1, 13.2, 13.3, 13.4_
  
  - [x] 14.5 Implement `installer/windows/uninstall.ps1`
    - Stop and remove WinSW service
    - Remove binaries from Program Files
    - Preserve ProgramData by default (optional flag to remove)
    - _Requirements: 7.9_
  
  - [x] 14.6 Implement `installer/windows/upgrade.ps1`
    - Backup current installation
    - Stop service
    - Replace binaries
    - Run database migrations
    - Restart service
    - Validate health or provide rollback instructions
    - _Requirements: 7.10_
  
  - [x] 14.7 Write property test for install location compliance
    - **Property 19: Windows Install Location Compliance**
    - **Validates: Requirements 7.4**
  
  - [x] 14.8 Write property test for preflight blocking checks
    - **Property 20: Preflight Blocking Checks**
    - **Validates: Requirements 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8**
  
  - [x] 14.9 Write property test for preflight policy checks
    - **Property 21: Preflight Policy Checks**
    - **Validates: Requirements 8.9, 8.10, 8.11**
  
  - [x] 14.10 Write property test for preflight report format
    - **Property 22: Preflight Report Format**
    - **Validates: Requirements 8.13, 8.14**
  
  - [x] 14.11 Write property test for installer mode enforcement
    - **Property 31: Installer Mode Profile Enforcement**
    - **Validates: Requirements 13.2, 13.3**
  
  - [x] 14.12 Write property test for prod install demo detection
    - **Property 32: Prod Install Demo Detection**
    - **Validates: Requirements 13.4**
  
  - [x] 14.13 Write integration tests for installer suite
    - Test full installation flow (prod and demo modes)
    - Test uninstall flow (with and without data preservation)
    - Test upgrade flow with rollback
    - _Requirements: 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.9, 7.10_

- [x] 15. Checkpoint - Ensure installer suite complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. Epic 10: Archive + Mapping Logs (Always-on)
  - [x] 16.1 Standardize mapping log file
    - Use `audit/CHANGELOG_AUDIT.md` as canonical mapping log
    - Optionally maintain `archive/MAPPING.md` as well
    - Format: | Old Path | New Path | Reason | Evidence |
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 16.2 Provide archive helper script (safe moves only)
    - Create `ci/archive-code.ps1`
    - Accept parameters: `-SourcePath -Reason -Evidence`
    - Move file/directory to `archive/code/{timestamp}/{SourcePath}`
    - Write mapping log entry with reason + evidence
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 16.3 Archive identified demo-only code
    - Move demo-only pages/components to archive
    - Update mapping log with evidence
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 16.4 Archive identified CAPS-specific code
    - Move CAPS-specific branding to archive
    - Update mapping log with evidence
    - _Requirements: 9.1, 9.2, 9.3_
  
  - [x] 16.5 Confirm build/package excludes archive
    - Verify build excludes archive
    - Verify packaging excludes archive
    - Verify readiness gates exclude archive
    - Verify mapping logs are complete
    - _Requirements: 9.4, 9.5_
  
  - [x] 16.6 Write property test for quarantined test exclusion
    - **Property 29: Quarantined Test Exclusion**
    - **Validates: Requirements 12.3, 12.4**
  
  - [x] 16.7 Write property test for test code exclusion from packages
    - **Property 30: Test Code Exclusion from Packages**
    - **Validates: Requirements 12.5**

- [x] 17. Final Checkpoint - End-to-end validation and Definition of Done
  - Ensure all tests pass, ask the user if questions arise.
  
  **Definition of Done (Release Candidate)**:
  - [ ] Frontend: lint + build pass
  - [ ] Backend: release build passes with `SQLX_OFFLINE=true`
  - [ ] Readiness gates: 0 forbidden matches in core runtime paths
  - [ ] Demo data only via preset packs in demo profile
  - [ ] Branding fully config-driven (no CAPS remnants in core runtime)
  - [ ] Windows install/uninstall/upgrade works end-to-end
  - [ ] Preflight blocks unsafe prod installs and writes JSON report

## Notes

- All tasks including property-based tests are required for comprehensive production readiness
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- Integration tests validate complete workflows
- The implementation follows a phased approach to minimize risk and enable incremental delivery
