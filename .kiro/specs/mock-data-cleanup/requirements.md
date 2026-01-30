# Mock Data Cleanup - Requirements

## Overview
Remove all hardcoded mock data, placeholder content, and simulated values from the EasySale codebase. Replace with real data from APIs, configuration, and build system.

## Problem Statement
The login page and other components contain:
1. Hardcoded blue gradient on logo badge (ignores tenant branding)
2. Wrong asset paths (using `icon` instead of `favicon`/`logo`)
3. Hardcoded dates: "2023-04-15", "2024" copyright
4. Hardcoded version: "v1.0.0", "abc123" build ID
5. Mock system status (database, sync, store, station)
6. Simulated API calls using `setTimeout`
7. Placeholder KPI data
8. TODO comments indicating incomplete features

## Requirements

### REQ-1: Login Page Logo Badge
- Use `branding.company.favicon` or `branding.company.icon` for the badge above "Sign In"
- Remove hardcoded blue gradient - use theme accent colors or transparent background for PNG
- Support PNG/SVG logos without forced background color

### REQ-2: Header Logo
- Use `branding.company.logo` or `branding.company.logoDark` for header
- Remove hardcoded blue fallback - use theme colors from config
- Support theme-aware logo switching (light/dark)

### REQ-3: Footer Version & Build Info
- Version from `package.json` or `/api/capabilities`
- Build hash from `BUILD_HASH` env var or `/api/capabilities`
- Build date generated at build time (not hardcoded)

### REQ-4: Footer Copyright
- Year: Use `new Date().getFullYear()` (dynamic)
- Company name: From `branding.company.name`
- Format: `© {year} {companyName}. All rights reserved.`

### REQ-5: System Status
- Database status from `/api/health/status`
- Sync status from `/api/health/status` or sync service
- Store name from `branding.store.name` or config
- Station ID from config or device registration

### REQ-6: Remove All Mock Patterns
- No `setTimeout` simulated API calls
- No hardcoded "Main Store", "POS-01"
- No placeholder KPI data
- No "TODO", "coming soon", "goes here" in user-facing text

## Success Criteria
- Login page displays real branding assets
- Footer shows actual version/build from package.json
- Copyright year is always current year
- System status reflects real backend state (or graceful loading/error states)
- No hardcoded dates visible to users
