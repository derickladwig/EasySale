# Implementation Plan: Codebase Cleanup and Modernization

## Overview

Streamlined cleanup to remove outdated files, consolidate duplicates, update dependencies, and create a clean, maintainable codebase. Focus on action, not documentation of every step.

## Tasks

- [x] 1. Clean up root directory - Remove old documentation clutter
  - Create `archive/` with subdirectories: `tasks/`, `phases/`, `deprecated/`, `audits/`
  - Move all TASK_*_SUMMARY.md and TASK_*_COMPLETE.md to `archive/tasks/`
  - Move all *_PHASE_*.md, *_COMPLETE.md, *_PROGRESS.md to `archive/phases/`
  - Move README.old.md, QUICK_FIX_SUMMARY.md, PORT_INCONSISTENCIES_FOUND.md to `archive/deprecated/`
  - Move AUDIT_SUMMARY.md, CODEBASE_AUDIT_REPORT.md, PORT_MIGRATION_PLAN.md to `archive/audits/`
  - Delete backend_logs.txt, cleanup-duplicates.sh (temporary/one-time files)
  - Keep: README.md, DEVLOG.md, CI_CD_GUIDE.md, DOCKER_SETUP.md, kiro-guide.md, recent fix docs
  - _Requirements: 1.1, 1.3, 1.4, 3.1, 3.2, 3.4_

- [x] 2. Consolidate duplicate files - Merge and clean up code duplicates
  - Find all files with .old, .NEW, .backup, .bak, numbered versions
  - For index.NEW.ts: merge type exports into index.ts, delete index.NEW.ts
  - Search codebase for any other similar duplicates (ComponentOld.tsx, file2.ts, etc.)
  - For each duplicate: compare contents, check imports, keep the complete/active version
  - Verify all imports resolve correctly after consolidation
  - Run frontend build to ensure no breakage
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Update npm and dependencies - Get everything to latest secure versions
  - Update npm globally: `npm install -g npm@latest`
  - In frontend: run `npm update`, then `npm audit fix`, then `npm audit fix --force` if needed
  - Run frontend build and tests to verify compatibility
  - Document any remaining vulnerabilities with mitigation strategies
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Update Rust dependencies - Get backend to latest secure versions
  - In backend/rust: run `cargo update`
  - Check for outdated crates: `cargo outdated`
  - Update Cargo.toml manually for any major version bumps needed
  - Run backend build and tests to verify compatibility
  - Run `cargo audit` and document any remaining vulnerabilities
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5. Final verification - Ensure everything works
  - Run frontend build: `npm run build`
  - Run backend build: `cargo build --release`
  - Run Docker production build: `build-prod.bat`
  - Run all tests (frontend and backend)
  - Start application and verify basic functionality works
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 6. Create cleanup report and commit
  - Create CLEANUP_REPORT.md with summary of all changes
  - List files removed/archived, dependencies updated, vulnerabilities fixed
  - Provide before/after metrics (file count, vulnerability count)
  - Update DEVLOG.md with cleanup entry
  - Git commit all changes with comprehensive message
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

## Notes

- Focus on action, not excessive documentation
- Preserve all the good work we've done - only remove truly obsolete files
- When in doubt, archive rather than delete
- Verify builds after each major change
- Git commit enables rollback if needed
