# Design Document - Codebase Cleanup and Modernization

## Overview

This design outlines the systematic approach to cleaning up the CAPS POS codebase by removing outdated files, consolidating duplicates, updating dependencies, and ensuring a maintainable project structure. The cleanup will be performed in phases to minimize risk and ensure the application continues to function correctly throughout the process.

## Architecture

### Cleanup Phases

The cleanup will be executed in the following order to minimize risk:

1. **Analysis Phase**: Identify all files and dependencies to be cleaned
2. **Archive Phase**: Move historical files to archive structure
3. **Removal Phase**: Delete deprecated and duplicate files
4. **Update Phase**: Update npm, dependencies, and fix vulnerabilities
5. **Verification Phase**: Ensure builds and tests pass
6. **Documentation Phase**: Create comprehensive cleanup report

### Directory Structure Changes

**Before:**
```
project-root/
├── README.md
├── README.old.md (deprecated)
├── TASK_8_SUMMARY.md
├── TASK_9_SUMMARY.md
├── TASK_10_SUMMARY.md
├── SETTINGS_PHASE_1_COMPLETE.md
├── SETTINGS_PHASE_2_COMPLETE.md
├── QUICK_FIX_SUMMARY.md (deprecated)
├── frontend/
│   └── src/
│       └── common/
│           └── components/
│               ├── index.ts
│               └── index.NEW.ts (duplicate)
└── ...
```

**After:**
```
project-root/
├── README.md
├── DEVLOG.md
├── CI_CD_GUIDE.md
├── DOCKER_SETUP.md
├── archive/
│   ├── tasks/
│   │   ├── TASK_8_SUMMARY.md
│   │   ├── TASK_9_SUMMARY.md
│   │   └── TASK_10_SUMMARY.md
│   ├── phases/
│   │   ├── SETTINGS_PHASE_1_COMPLETE.md
│   │   └── SETTINGS_PHASE_2_COMPLETE.md
│   └── deprecated/
│       ├── README.old.md
│       └── QUICK_FIX_SUMMARY.md
├── frontend/
│   └── src/
│       └── common/
│           └── components/
│               └── index.ts (consolidated)
└── ...
```

## Components and Interfaces

### File Categorization System

Files will be categorized into the following groups:

1. **Keep in Root**: Essential current documentation
   - README.md
   - DEVLOG.md
   - CI_CD_GUIDE.md
   - DOCKER_SETUP.md
   - docker-compose files
   - build scripts (.bat, .sh)
   - .env files

2. **Archive - Tasks**: Historical task summaries
   - TASK_*_SUMMARY.md
   - TASK_*_COMPLETE.md

3. **Archive - Phases**: Historical phase documentation
   - *_PHASE_*_COMPLETE.md
   - *_PHASE_*_PROGRESS.md
   - FOUNDATION_COMPLETE.md
   - SETTINGS_FOUNDATION_SUMMARY.md

4. **Archive - Deprecated**: Explicitly deprecated files
   - README.old.md
   - QUICK_FIX_SUMMARY.md
   - PORT_INCONSISTENCIES_FOUND.md

5. **Archive - Audits**: Historical audit reports
   - AUDIT_SUMMARY.md
   - CODEBASE_AUDIT_REPORT.md
   - PORT_MIGRATION_PLAN.md

6. **Remove**: Duplicate or obsolete files
   - index.NEW.ts (consolidate into index.ts)
   - backend_logs.txt (temporary log file)
   - cleanup-duplicates.sh (one-time script, already executed)

### Dependency Update Strategy

#### npm/npx Update Process

```bash
# 1. Check current versions
npm --version
npx --version

# 2. Update npm globally
npm install -g npm@latest

# 3. Verify update
npm --version
npx --version
```

#### Frontend Dependencies Update Process

```bash
# 1. Audit current state
cd frontend
npm audit

# 2. Update package.json to latest compatible versions
npm update

# 3. Fix vulnerabilities automatically
npm audit fix

# 4. Fix vulnerabilities with breaking changes (if needed)
npm audit fix --force

# 5. Verify build
npm run build

# 6. Run tests
npm test
```

#### Backend Dependencies Update Process

```bash
# 1. Audit current state
cd backend/rust
cargo audit

# 2. Update dependencies
cargo update

# 3. Check for outdated crates
cargo outdated

# 4. Update Cargo.toml manually for major version bumps

# 5. Verify build
cargo build --release

# 6. Run tests
cargo test
```

## Data Models

### Cleanup Report Structure

```typescript
interface CleanupReport {
  timestamp: string;
  summary: {
    filesRemoved: number;
    filesArchived: number;
    filesConsolidated: number;
    dependenciesUpdated: number;
    vulnerabilitiesFixed: number;
  };
  actions: {
    removed: FileAction[];
    archived: FileAction[];
    consolidated: FileAction[];
    dependencyUpdates: DependencyUpdate[];
    vulnerabilities: VulnerabilityFix[];
  };
  verification: {
    frontendBuild: BuildResult;
    backendBuild: BuildResult;
    dockerBuild: BuildResult;
    tests: TestResult;
  };
}

interface FileAction {
  path: string;
  reason: string;
  destination?: string; // for archived files
}

interface DependencyUpdate {
  name: string;
  oldVersion: string;
  newVersion: string;
  type: 'npm' | 'cargo';
}

interface VulnerabilityFix {
  package: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  description: string;
  fixed: boolean;
  mitigation?: string;
}

interface BuildResult {
  success: boolean;
  duration: number;
  errors?: string[];
}

interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  errors?: string[];
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Archive Preservation
*For any* file moved to the archive directory, the file content should remain identical to the original file before archiving.
**Validates: Requirements 1.4, 3.4**

### Property 2: Build Integrity
*For any* dependency update or file removal, the frontend build, backend build, and Docker build should all complete successfully without errors.
**Validates: Requirements 5.5, 6.5, 8.1, 8.2, 8.3**

### Property 3: Import Resolution
*For any* file consolidation (e.g., index.NEW.ts → index.ts), all import statements in the codebase should resolve correctly to the remaining file.
**Validates: Requirements 2.3**

### Property 4: Vulnerability Reduction
*For any* dependency update, the number of known vulnerabilities should decrease or remain the same, never increase.
**Validates: Requirements 5.3, 6.3**

### Property 5: Test Stability
*For any* cleanup action, the number of passing tests should remain the same or increase, never decrease.
**Validates: Requirements 8.5**

## Error Handling

### File Operation Errors

- **File Not Found**: Log warning and continue (file may have been manually removed)
- **Permission Denied**: Report error and skip file, document in report
- **Archive Directory Creation Failed**: Abort archive phase, report error
- **File Move Failed**: Log error, keep original file, document in report

### Dependency Update Errors

- **npm update fails**: Document error, attempt npm audit fix separately
- **cargo update fails**: Document error, attempt manual Cargo.toml updates
- **Build fails after update**: Rollback to previous package.json/Cargo.toml, document issue
- **Tests fail after update**: Rollback to previous versions, document issue

### Build Verification Errors

- **Frontend build fails**: Document error with full output, halt cleanup
- **Backend build fails**: Document error with full output, halt cleanup
- **Docker build fails**: Document error with full output, halt cleanup
- **Tests fail**: Document failing tests, determine if related to cleanup

## Testing Strategy

### Unit Tests

Unit tests will verify specific cleanup operations:

1. **File categorization logic**: Test that files are correctly categorized
2. **Archive path generation**: Test that archive paths are generated correctly
3. **Import path updates**: Test that import statements are updated correctly

### Integration Tests

Integration tests will verify the cleanup process end-to-end:

1. **Archive creation**: Verify archive directory structure is created correctly
2. **File operations**: Verify files are moved/removed as expected
3. **Dependency updates**: Verify package.json and Cargo.toml are updated correctly

### Property-Based Tests

Property-based tests will verify correctness properties:

1. **Archive preservation property**: Generate random file content, archive it, verify content matches
2. **Build integrity property**: For various dependency combinations, verify builds succeed
3. **Import resolution property**: Generate random import statements, verify they resolve after consolidation

### Manual Verification

Manual verification steps:

1. **Visual inspection**: Review archive directory structure
2. **Build verification**: Run all build commands manually
3. **Application testing**: Start the application and verify basic functionality
4. **Documentation review**: Review cleanup report for completeness

### Testing Configuration

- **Property tests**: Minimum 100 iterations per test
- **Test tags**: All tests tagged with **Feature: codebase-cleanup, Property {number}: {property_text}**
- **Test framework**: Vitest for frontend, built-in Rust testing for backend
- **Coverage target**: 80% for cleanup logic

## Implementation Notes

### Safe Cleanup Practices

1. **Create backups**: Before any destructive operation, create a backup
2. **Incremental changes**: Make changes in small, verifiable steps
3. **Git commits**: Commit after each major phase
4. **Rollback plan**: Document how to rollback each change
5. **Verification**: Verify builds and tests after each phase

### Dependency Update Best Practices

1. **Read changelogs**: Review breaking changes before updating
2. **Update incrementally**: Update one major version at a time
3. **Test thoroughly**: Run full test suite after each update
4. **Document issues**: Record any compatibility issues encountered
5. **Pin versions**: Consider pinning critical dependencies

### Archive Organization

The archive directory will be organized by category:

- `archive/tasks/`: Task summaries (TASK_*_SUMMARY.md)
- `archive/phases/`: Phase documentation (*_PHASE_*.md, *_COMPLETE.md)
- `archive/deprecated/`: Explicitly deprecated files (*.old.*, QUICK_FIX_*.md)
- `archive/audits/`: Historical audit reports (AUDIT_*.md, *_PLAN.md)
- `archive/README.md`: Index of archived files with original locations

### Files to Keep in Root

Essential documentation that should remain in the root directory:

- **README.md**: Primary project documentation
- **DEVLOG.md**: Development timeline and decisions
- **CI_CD_GUIDE.md**: CI/CD setup and usage
- **DOCKER_SETUP.md**: Docker configuration guide
- **kiro-guide.md**: Kiro CLI reference
- **BAT_FILES_FIXED.md**: Recent fix documentation (still relevant)
- **TYPESCRIPT_ERRORS_FIXED.md**: Recent fix documentation (still relevant)
- **BUILD_ISSUES_RESOLVED.md**: Recent fix documentation (still relevant)

### Duplicate File Detection Strategy

**Similarity Patterns to Check:**

1. **Exact name duplicates**: `file.ts` vs `file.NEW.ts`, `file.old.ts`, `file.backup.ts`
2. **Similar names**: `Component.tsx` vs `ComponentOld.tsx`, `ComponentV2.tsx`
3. **Numbered versions**: `file.ts` vs `file2.ts`, `file_v1.ts` vs `file_v2.ts`
4. **Case variations**: `README.md` vs `readme.md` (Windows case-insensitive)
5. **Extension variations**: `config.js` vs `config.ts` (migration artifacts)

**Verification Process for Each Potential Duplicate:**

1. **Compare file contents**: Use diff to identify actual differences
2. **Check git history**: Determine which file is newer and actively maintained
3. **Check imports/references**: Find which file is actually being used in the codebase
4. **Check last modified date**: Identify which file was recently updated
5. **Check file completeness**: Determine which version is more complete/functional
6. **Manual review**: For ambiguous cases, document and ask for user confirmation

**Decision Criteria:**

- **Keep**: File is actively imported, recently modified, and more complete
- **Archive**: File has historical value but is superseded by newer version
- **Remove**: File is clearly obsolete, not imported, and has no historical value

**Example: `index.ts` vs `index.NEW.ts`**

1. **Compare files**: index.NEW.ts has additional type exports
2. **Check imports**: Verify which file is actually imported in the codebase
3. **Check git history**: Determine which was created/modified more recently
4. **Determine canonical version**: Based on completeness and usage
5. **Consolidation strategy**: 
   - Merge improvements from both files into the canonical version
   - Delete the obsolete version
   - Update any imports if necessary
   - Verify all imports still work
6. **Verification**: Run build and tests to ensure no breakage

### Unfinished vs Obsolete Detection

**Indicators of Unfinished Work (DO NOT REMOVE):**

- File has TODO comments with recent dates
- File is imported by other active code
- File has recent git commits (within last 30 days)
- File is referenced in active spec documents
- File has incomplete implementations with clear intent to finish

**Indicators of Obsolete Work (SAFE TO REMOVE/ARCHIVE):**

- File has explicit deprecation notice
- File is not imported anywhere in the codebase
- File has no git commits in 90+ days
- File is superseded by a newer version
- File is referenced only in archived documentation

**Verification Steps:**

1. **Search for imports**: `grep -r "from.*filename" src/`
2. **Check git history**: `git log --since="90 days ago" -- filename`
3. **Search for references**: `grep -r "filename" .kiro/specs/*/tasks.md`
4. **Check for TODOs**: `grep -n "TODO\|FIXME" filename`
5. **Manual review**: If any doubt exists, document and ask for confirmation
