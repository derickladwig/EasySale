# Requirements Document - Codebase Cleanup and Modernization

## Introduction

This specification defines the requirements for cleaning up the CAPS POS codebase by removing outdated files, eliminating duplicates, updating dependencies to latest secure versions, and ensuring the project structure is clean and maintainable for future development.

## Glossary

- **System**: The CAPS POS codebase and development environment
- **Outdated_Files**: Files marked as deprecated, old, backup, or no longer in use
- **Duplicate_Files**: Files with similar names (e.g., index.ts and index.NEW.ts) where one is obsolete
- **Summary_Files**: Historical documentation files (TASK_*_SUMMARY.md, *_COMPLETE.md, etc.)
- **Dependencies**: npm packages and Rust crates used by the project
- **Vulnerabilities**: Known security issues in dependencies reported by npm audit or cargo audit

## Requirements

### Requirement 1: Remove Deprecated and Old Files

**User Story:** As a developer, I want deprecated and old files removed from the codebase, so that I don't get confused by outdated documentation or code during development.

#### Acceptance Criteria

1. THE System SHALL remove all files explicitly marked as deprecated (README.old.md, QUICK_FIX_SUMMARY.md)
2. THE System SHALL remove all backup and temporary files (.old, .backup, .bak extensions)
3. WHEN a file contains a deprecation notice, THE System SHALL evaluate if it should be archived or deleted
4. THE System SHALL preserve files that provide historical context in an archive directory

### Requirement 2: Consolidate Duplicate Files

**User Story:** As a developer, I want duplicate files consolidated, so that there is only one source of truth for each component or configuration.

#### Acceptance Criteria

1. WHEN two files serve the same purpose (e.g., index.ts and index.NEW.ts), THE System SHALL keep the most complete version
2. THE System SHALL remove the obsolete duplicate file
3. THE System SHALL verify all imports reference the correct remaining file
4. THE System SHALL document which file was kept and why

### Requirement 3: Clean Up Historical Summary Files

**User Story:** As a developer, I want excessive historical summary files organized, so that the root directory is clean and focused on current documentation.

#### Acceptance Criteria

1. THE System SHALL move completed task summaries (TASK_*_SUMMARY.md) to an archive directory
2. THE System SHALL move completed phase documentation (*_COMPLETE.md, *_PROGRESS.md) to an archive directory
3. THE System SHALL keep essential documentation (README.md, DEVLOG.md, CI_CD_GUIDE.md) in the root
4. THE System SHALL create a clear archive structure (archive/tasks/, archive/phases/)

### Requirement 4: Update npm to Latest Secure Version

**User Story:** As a developer, I want npm and npx updated to the latest versions, so that I have access to the latest features and security patches.

#### Acceptance Criteria

1. THE System SHALL update npm to the latest stable version
2. THE System SHALL update npx to the latest stable version
3. THE System SHALL verify the update was successful
4. THE System SHALL document the versions before and after update

### Requirement 5: Update Frontend Dependencies

**User Story:** As a developer, I want all frontend dependencies updated to their latest secure versions, so that known vulnerabilities are eliminated.

#### Acceptance Criteria

1. WHEN running npm audit, THE System SHALL identify all vulnerabilities
2. THE System SHALL update all dependencies to their latest compatible versions
3. THE System SHALL run npm audit fix to automatically resolve fixable vulnerabilities
4. WHEN vulnerabilities remain, THE System SHALL document them with mitigation strategies
5. THE System SHALL verify the application still builds and runs after updates

### Requirement 6: Update Backend Dependencies

**User Story:** As a developer, I want all backend (Rust) dependencies updated to their latest secure versions, so that known vulnerabilities are eliminated.

#### Acceptance Criteria

1. WHEN running cargo audit, THE System SHALL identify all vulnerabilities
2. THE System SHALL update all Cargo.toml dependencies to their latest compatible versions
3. THE System SHALL run cargo update to update Cargo.lock
4. WHEN vulnerabilities remain, THE System SHALL document them with mitigation strategies
5. THE System SHALL verify the application still builds and runs after updates

### Requirement 7: Remove Unused Code and Imports

**User Story:** As a developer, I want unused code and imports removed, so that the codebase is lean and maintainable.

#### Acceptance Criteria

1. THE System SHALL identify and remove unused imports in TypeScript files
2. THE System SHALL identify and remove unused imports in Rust files
3. THE System SHALL identify and remove dead code (unreachable functions, unused variables)
4. THE System SHALL run linters to verify no new warnings are introduced

### Requirement 8: Verify Build Process

**User Story:** As a developer, I want the build process verified after cleanup, so that I know the application still works correctly.

#### Acceptance Criteria

1. THE System SHALL successfully run the frontend build (npm run build)
2. THE System SHALL successfully run the backend build (cargo build)
3. THE System SHALL successfully run the production Docker build (build-prod.bat)
4. WHEN any build fails, THE System SHALL document the issue and provide a fix
5. THE System SHALL verify all tests still pass after cleanup

### Requirement 9: Document Cleanup Results

**User Story:** As a developer, I want a comprehensive report of all cleanup actions, so that I understand what was changed and why.

#### Acceptance Criteria

1. THE System SHALL create a CLEANUP_REPORT.md documenting all changes
2. THE System SHALL list all files removed with justification
3. THE System SHALL list all files moved to archive with original locations
4. THE System SHALL list all dependency updates with version changes
5. THE System SHALL list all vulnerabilities fixed
6. THE System SHALL provide before/after metrics (file count, dependency count, vulnerability count)
