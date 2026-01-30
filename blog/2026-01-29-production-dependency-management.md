# Production-Grade Dependency Management

**Date:** 2026-01-29

## Problem
Manual `npm audit fix --force` was required to fix vulnerabilities. This is not sustainable for production - dependency management needs to be automated and enforced in CI.

## Solution Implemented

### 1. Lockfile Enforcement
- `package-lock.json` is committed and tracked
- CI uses `npm ci` (not `npm install`) to enforce exact versions
- Lockfile version 3 (npm v7+) for modern features

### 2. CI Vulnerability Gates
Updated `.github/workflows/ci.yml`:
- **Production deps (BLOCKING)**: `npm audit --omit=dev --audit-level=high`
- **All deps (informational)**: `npm audit --audit-level=moderate`
- Rust deps: `cargo audit` (blocking)

### 3. Dependabot Configuration
Created `.github/dependabot.yml`:
- Weekly updates for npm, cargo, pip, and GitHub Actions
- Grouped updates to reduce PR noise
- Major version bumps ignored (require manual review)
- Separate configs for frontend, ci, scripts, backend, backup

### 4. Automated Security Fixes
Updated `.github/workflows/dependency-update.yml`:
- Weekly automated `npm audit fix` for safe fixes
- Auto-creates PR with security fixes
- Non-breaking changes only

### 5. Package.json Improvements
- Added `audit:prod`, `audit:all`, `audit:fix` scripts
- Added `overrides` for transitive dependency version control
- Removed problematic `preinstall` script that blocked Docker builds

### 6. Security Exceptions Registry
Created `docs/SECURITY_EXCEPTIONS.md`:
- Policy for handling vulnerabilities
- Tracking table for accepted exceptions
- Audit command reference

## Current Status
- **Production deps**: 0 high/critical vulnerabilities ✅
- **All deps**: 1 moderate vulnerability (dev-only, non-blocking)
- **Docker build**: Working ✅
- **Lockfile**: Valid, version 3 ✅

## Commands Reference
```bash
# Check production dependencies (blocking in CI)
npm audit --omit=dev --audit-level=high

# Check all dependencies (informational)
npm audit --audit-level=moderate

# Apply safe fixes
npm audit fix

# Regenerate lockfile
npm install --package-lock-only
```
