# Requirements Document

## Introduction

This specification defines the requirements for transforming EasySale from a development prototype into a production-ready, white-label point-of-sale system with a Windows non-Docker distribution. The system must eliminate all hardcoded demo content on production routes, support explicit runtime profiles, implement security controls, provide portable Windows artifacts with automated install/uninstall/upgrade, and enforce installer-time preflight validation.

## Glossary

- **EasySale**: The white-label point-of-sale system
- **Runtime_Profile**: dev | demo | prod profile controlling behavior and gating
- **Preset_Pack**: Configurable demo dataset and settings loaded only in demo mode
- **Preflight_Checker**: Installer-time validation that blocks unsafe prod installs
- **White_Label**: Branding and terminology configurable per tenant without code changes
- **Production_Route**: User-facing endpoint or page reachable in deployed system
- **Core_Runtime_Paths**: Source code and assets included in production build artifacts, excluding archive/, tests, fixtures, and preset packs directories
- **Archive_Directory**: Quarantine location for moved code with mapping logs
- **SQLx_Offline_Mode**: Rust compilation using `.sqlx` metadata
- **Windows_Service**: Background backend process managed by Windows Service Control Manager
- **Health_Endpoint**: HTTP endpoint validating server operational status
- **Readiness_Gate**: CI/CD validation that blocks unsafe production builds
- **Prod_Install_Mode**: Installer mode that enforces strict preflight checks and disables demo behaviors
- **Demo_Install_Mode**: Installer mode that intentionally enables demo profile and loads a Preset_Pack for evaluation or training
- **Install_Locations**: Standard Windows paths for binaries (Program Files) and state (ProgramData)

## Requirements

### Requirement 1: Build System Integrity

**User Story:** As a developer, I want the build system to compile successfully in CI/CD pipelines, so that I can deploy reliable production artifacts.

#### Acceptance Criteria

1. WHEN the backend is compiled with SQLx offline mode enabled, THE Build_System SHALL produce a successful build without database connectivity
2. WHEN the frontend build command is executed, THE Build_System SHALL complete without TypeScript errors
3. WHEN the frontend linter is executed, THE Build_System SHALL pass all linting rules or lint is explicitly configured to ignore Node scripts and test-only folders
4. WHEN CI paths reference backend directories, THE Build_System SHALL use correct workspace paths (backend/ not backend/rust)
5. WHEN CI builds the backend binary, THE Build_System SHALL produce the EasySale-server executable
6. WHEN archive directories exist in the workspace, THE Build_System SHALL exclude them from compilation and packaging
7. WHEN release scripts are executed, THE Build_System SHALL NOT reference stale paths or stale binary names
8. WHEN build-prod.bat or any release script runs, THE Build_System SHALL fail fast if it detects stale backend path references or stale binary names

### Requirement 2: Demo Content Isolation

**User Story:** As a system administrator, I want demo content completely isolated from production routes, so that customers never see placeholder data in production deployments.

#### Acceptance Criteria

1. WHEN a production route is accessed with prod profile, THE System SHALL NOT display hardcoded demo credentials
2. WHEN a production route is accessed with prod profile, THE System SHALL NOT display hardcoded mock data arrays
3. WHEN a production route is accessed with prod profile, THE System SHALL NOT display example metrics or placeholder content
4. WHEN the runtime profile is set to demo, THE System SHALL load demo content from Preset_Packs only with no hardcoded credentials in UI code
5. WHEN demo mode is enabled, THE System SHALL clearly indicate demo status in the UI
6. WHEN the /login page is accessed in prod profile, THE System SHALL require real authentication without demo shortcuts or hardcoded CAPS alt text
7. WHEN the /reporting page is accessed in prod profile, THE System SHALL fetch real data from backend endpoints or show empty states without hardcoded metrics or CAPS category references
8. WHEN the /lookup page is accessed in prod profile, THE System SHALL query real inventory sources or show empty states without hardcoded CAPS-branded filter lists
9. WHEN the /admin page is accessed in prod profile, THE System SHALL manage real system configuration without hardcoded feature flag lists and SHALL consume backend endpoints

### Requirement 3: White-Label Core System

**User Story:** As a business owner, I want the system to be completely rebrandable, so that I can deploy it with my company identity without code changes.

#### Acceptance Criteria

1. WHEN the system starts, THE System SHALL load branding from runtime configuration files for tenant and store
2. WHEN core UI components render, THE System SHALL NOT contain hardcoded customer-specific branding tokens such as CAPS or vehicle-only terminology in core runtime paths
3. WHEN tenant configuration is provided, THE System SHALL apply custom logos, colors, and company names
4. WHEN store-specific configuration is provided, THE System SHALL apply store-level branding overrides
5. WHEN automotive-specific features are needed, THE System SHALL load them only as optional modules or vertical packs disabled by default and SHALL NOT require automotive concepts for core operation

### Requirement 4: Runtime Profile Management

**User Story:** As a system administrator, I want explicit runtime profiles, so that I can control system behavior for development, demo, and production environments.

#### Acceptance Criteria

1. WHEN the system starts, THE System SHALL read the runtime profile from configuration as dev, demo, or prod
2. WHEN the runtime profile is prod and required configuration is missing, THE System SHALL fail startup with clear error messages
3. WHEN the runtime profile is prod and placeholder secrets are detected, THE System SHALL reject startup
4. WHEN the runtime profile is prod, THE System SHALL disable development-only endpoints and tools or require explicit internal permission
5. WHEN the runtime profile is dev, THE System SHALL enable debug logging and development tools
6. WHEN the runtime profile is demo, THE System SHALL load Preset_Packs and display demo indicators
7. WHEN configuration uses DATABASE_PATH, THE System SHALL consistently use this key across backend config loader, DB connection logic, installer templates, and documentation
8. WHEN environment variables are loaded, THE System SHALL validate required variables for the active profile and report all missing keys in one message

### Requirement 5: Security Controls

**User Story:** As a security administrator, I want input validation and injection controls, so that the system is protected against malicious input.

#### Acceptance Criteria

1. WHEN QuickBooks query language input is received, THE System SHALL escape or sanitize all user-provided values before constructing QBO queries
2. WHEN dynamic SQL queries are constructed, THE System SHALL use allowlists for table and column names with no user-controlled identifiers
3. WHEN OAuth redirect URIs are configured, THE System SHALL read them from environment or configuration files with no hardcoded localhost in source
4. WHEN the runtime profile is prod and OAuth redirect URI contains localhost, THE System SHALL reject the configuration unless integrations are explicitly disabled and policy allows warning only
5. WHEN user input is used in database queries, THE System SHALL use parameterized queries or prepared statements with no string concatenation of user inputs

### Requirement 6: Reporting and Export Implementation

**User Story:** As a manager, I want reporting features to be fully functional or clearly unavailable, so that I don't encounter broken features in production.

#### Acceptance Criteria

1. WHEN the reporting UI is accessed, THE System SHALL fetch data from backend endpoints
2. WHEN no reporting data is available, THE System SHALL display appropriate empty states
3. WHEN export functionality is invoked, THE System SHALL generate complete exports OR the feature SHALL be hidden or disabled in prod
4. WHEN export is not implemented for a report type, THE System SHALL hide or disable export controls in prod with no stub behavior
5. WHEN reporting endpoints are called, THE System SHALL return real data or proper error responses

### Requirement 7: Windows Portable Distribution

**User Story:** As an IT administrator, I want a portable Windows installer, so that I can deploy EasySale without Docker or manual configuration.

#### Acceptance Criteria

1. WHEN the distribution package is created, THE System SHALL produce portable ZIP archives for server and client optionally bundled
2. WHEN the installer script is executed, THE System SHALL extract artifacts to the target directory
3. WHEN the installer runs, THE System SHALL create ProgramData directory structure for config, database, and logs
4. WHEN installed on Windows, THE System SHALL use Install_Locations with Program Files for binaries and assets and ProgramData for database, config, and logs and SHALL NOT store mutable state under Program Files
5. WHEN the installer configures the system, THE System SHALL write environment configuration files from templates
6. WHEN the installer completes, THE System SHALL install and start a Windows_Service for the backend
7. WHEN the Windows_Service starts, THE System SHALL validate Health_Endpoint accessibility
8. WHEN installation completes, THE System SHALL NOT require manual binary copying or manual service creation
9. WHEN uninstall is executed, THE System SHALL stop and remove the service and remove installed binaries while preserving or optionally removing ProgramData based on user-selected flag
10. WHEN upgrade is executed, THE System SHALL replace binaries and config safely and restart the service with rollback instructions if startup fails

### Requirement 8: Installer Preflight Validation

**User Story:** As an IT administrator, I want preflight checks before production installation, so that I can identify configuration issues before deployment.

#### Acceptance Criteria

1. WHEN the installer runs in prod mode, THE Preflight_Checker SHALL execute before installation proceeds
2. WHEN required configuration is missing, THE Preflight_Checker SHALL block installation with specific error messages
3. WHEN required secrets are missing or placeholders are detected, THE Preflight_Checker SHALL block installation
4. WHEN target directories are not writable, THE Preflight_Checker SHALL block installation
5. WHEN required ports are already in use, THE Preflight_Checker SHALL block installation
6. WHEN database migrations fail or backend fails to start, THE Preflight_Checker SHALL block installation
7. WHEN Health_Endpoint validation fails, THE Preflight_Checker SHALL block installation
8. WHEN frontend dist assets are missing, THE Preflight_Checker SHALL block installation
9. WHEN demo mode is enabled in prod profile, THE Preflight_Checker SHALL warn or block based on policy configuration
10. WHEN forbidden branding tokens are detected in prod profile, THE Preflight_Checker SHALL warn or block based on policy configuration
11. WHEN OAuth redirect URI contains localhost in prod profile, THE Preflight_Checker SHALL warn or block based on policy configuration
12. WHEN all blocking checks pass, THE Preflight_Checker SHALL allow installation to proceed
13. WHEN Preflight_Checker runs, THE Preflight_Checker SHALL output a JSON report file for machine reading, a human-readable summary, and an exit code indicating OK, WARN, or BLOCK
14. WHEN Preflight_Checker runs, THE JSON report SHALL be written to a deterministic location under ProgramData and SHALL include a timestamp, profile, and installer mode

### Requirement 9: Code Archival Safety

**User Story:** As a developer, I want safe code archival procedures, so that no code is permanently deleted without proper documentation.

#### Acceptance Criteria

1. WHEN code is identified for removal, THE System SHALL move it to Archive_Directory instead of deleting
2. WHEN code is moved to Archive_Directory, THE System SHALL create a mapping log with old and new paths
3. WHEN code is classified as dead or demo-only, THE System SHALL require evidence documentation
4. WHEN archived code exists, THE Build_System SHALL exclude Archive_Directory from compilation
5. WHEN archived code exists, THE Packaging_System SHALL exclude Archive_Directory from distribution packages

### Requirement 10: Configuration Contract Consistency

**User Story:** As a developer, I want consistent configuration contracts, so that environment variables work reliably across all components.

#### Acceptance Criteria

1. WHEN the backend reads database configuration, THE System SHALL use DATABASE_PATH consistently
2. WHEN the frontend reads API configuration, THE System SHALL use consistent environment variable names and provide defaults only in dev or demo profiles
3. WHEN configuration is validated, THE System SHALL check for conflicting or duplicate keys
4. WHEN configuration is loaded, THE System SHALL merge environment variables and config files with clear precedence rules
5. WHEN configuration errors occur, THE System SHALL provide clear error messages indicating the missing or invalid key and the active profile

### Requirement 11: Production Readiness Gates

**User Story:** As a release manager, I want automated production readiness gates, so that unsafe demo remnants cannot ship to production.

#### Acceptance Criteria

1. WHEN CI runs for prod builds and demo credentials exist in production route code paths, THE Readiness_Gate SHALL fail the build
2. WHEN CI runs for prod builds and mock arrays exist in routed production pages, THE Readiness_Gate SHALL fail the build
3. WHEN CI runs for prod builds and forbidden branding tokens exist in core runtime paths, THE Readiness_Gate SHALL fail the build allowing tokens only in tests, presets, or archive directories
4. WHEN CI runs for prod builds and hardcoded localhost OAuth redirect exists in backend source for prod profile, THE Readiness_Gate SHALL fail the build
5. WHEN a release artifact is produced, THE Readiness_Gate SHALL run the same validation checks against the artifact contents
6. WHEN Readiness_Gate scans production source, THE Readiness_Gate SHALL scan only Core_Runtime_Paths and SHALL exclude archive, tests, fixtures, and preset packs directories
7. WHEN Readiness_Gate scans build artifacts, THE Readiness_Gate SHALL verify that excluded directories are not present in production packages and SHALL fail if they are

### Requirement 12: Backend Test Policy

**User Story:** As a developer, I want a clear policy for backend tests, so that I know whether tests must pass or can be quarantined during the production readiness phase.

#### Acceptance Criteria

1. WHEN backend tests fail to compile with SQLx offline mode, THE System SHALL document whether tests will be fixed or quarantined
2. WHEN tests are quarantined, THE System SHALL create an explicit mapping log with timeline for resolution
3. WHEN tests are quarantined, THE Build_System SHALL skip them during CI builds
4. WHEN tests are fixed, THE Build_System SHALL run them as part of CI validation
5. WHEN production builds are created, THE System SHALL NOT include quarantined test code in distribution packages

### Requirement 13: Installer Mode Separation

**User Story:** As an IT administrator, I want the installer to support separate production and demo installation modes, so that demo content can be used intentionally without risking production installs.

#### Acceptance Criteria

1. WHEN the installer is executed, THE installer SHALL require selection of Prod_Install_Mode or Demo_Install_Mode
2. WHEN Prod_Install_Mode is selected, THE installer SHALL enforce Runtime_Profile as prod and SHALL NOT enable demo content or demo presets
3. WHEN Demo_Install_Mode is selected, THE installer SHALL enforce Runtime_Profile as demo and SHALL load a Preset_Pack if provided
4. WHEN Prod_Install_Mode is selected and demo configuration is detected, THE Preflight_Checker SHALL BLOCK installation
5. WHEN Demo_Install_Mode is selected, THE UI SHALL clearly indicate demo status and SHALL never claim production readiness
