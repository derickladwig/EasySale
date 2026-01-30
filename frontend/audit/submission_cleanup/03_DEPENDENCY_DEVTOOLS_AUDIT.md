# Frontend Dependency & DevTools Audit

**Audit Date:** 2026-01-25  
**Auditor:** Sub-Agent C (Dependencies/DevTools/Security Surface)  
**Scope:** frontend/package.json, frontend/src/**

---

## Executive Summary

| Category | Status | Notes |
|----------|--------|-------|
| Dev tools in devDependencies | ✅ PASS | All dev tools correctly placed |
| Runtime imports of dev tools | ✅ PASS | No dev tool imports in production code |
| Dependency placement issues | ⚠️ ISSUES FOUND | 2 packages need to be moved |
| npm audit (prod-only) | ✅ PASS | 0 vulnerabilities |
| npm audit (all deps) | ✅ PASS | 0 vulnerabilities |
| Docker build strategy | ✅ GOOD | Multi-stage build, only dist shipped |

---

## 1. Dependency Categorization

### 1.1 Runtime Dependencies (dependencies)

These packages are correctly placed and required at runtime:

| Package | Version | Purpose |
|---------|---------|---------|
| @tanstack/react-query | ^5.90.16 | Data fetching/caching |
| clsx | ^2.1.1 | Conditional classnames |
| date-fns | ^4.1.0 | Date manipulation |
| jsbarcode | ^3.12.3 | Barcode generation |
| lucide-react | ^0.562.0 | Icon library |
| react | ^19.2.3 | UI framework |
| react-dom | ^19.2.3 | React DOM renderer |
| react-router-dom | ^7.12.0 | Routing |
| zod | ^4.3.5 | Schema validation |

### 1.2 Dev-Only Dependencies (devDependencies)

All correctly placed in devDependencies:

#### Testing Tools
| Package | Version | Purpose |
|---------|---------|---------|
| @playwright/test | ^1.57.0 | E2E testing |
| playwright | ^1.57.0 | Browser automation |
| @testing-library/dom | ^10.4.1 | DOM testing utilities |
| @testing-library/jest-dom | ^6.9.1 | Jest DOM matchers |
| @testing-library/react | ^16.3.1 | React testing utilities |
| @testing-library/user-event | ^14.6.1 | User event simulation |
| @vitest/browser-playwright | ^4.0.16 | Vitest browser testing |
| @vitest/coverage-v8 | ^4.0.16 | Code coverage |
| @vitest/ui | ^4.0.16 | Vitest UI |
| vitest | ^4.0.16 | Test runner |
| fast-check | ^4.5.3 | Property-based testing |
| jsdom | ^27.4.0 | DOM simulation |

#### Storybook
| Package | Version | Purpose |
|---------|---------|---------|
| @chromatic-com/storybook | ^4.1.3 | Chromatic integration |
| @storybook/addon-a11y | ^8.6.14 | Accessibility addon |
| @storybook/addon-docs | ^10.1.11 | Documentation addon |
| @storybook/addon-essentials | ^8.6.14 | Essential addons |
| @storybook/addon-interactions | ^8.6.14 | Interaction testing |
| @storybook/addon-links | ^8.6.14 | Story linking |
| @storybook/addon-onboarding | ^10.1.11 | Onboarding addon |
| @storybook/addon-vitest | ^10.1.11 | Vitest integration |
| @storybook/react-vite | ^8.6.14 | React/Vite integration |
| storybook | ^8.6.14 | Component documentation |
| eslint-plugin-storybook | ^10.1.11 | Storybook linting |

#### Linting & Formatting
| Package | Version | Purpose |
|---------|---------|---------|
| eslint | ^9.39.2 | JavaScript linting |
| @eslint/js | ^9.39.2 | ESLint JS config |
| @typescript-eslint/eslint-plugin | ^8.52.0 | TypeScript ESLint |
| @typescript-eslint/parser | ^8.52.0 | TypeScript parser |
| eslint-config-prettier | ^10.1.8 | Prettier integration |
| eslint-plugin-import | ^2.32.0 | Import linting |
| eslint-plugin-react | ^7.37.5 | React linting |
| eslint-plugin-react-hooks | ^7.0.1 | Hooks linting |
| eslint-plugin-react-refresh | ^0.4.26 | Fast refresh linting |
| prettier | ^3.7.4 | Code formatting |
| stylelint | ^17.0.0 | CSS linting |
| stylelint-config-css-modules | ^4.6.0 | CSS modules config |
| stylelint-config-standard | ^40.0.0 | Standard CSS config |

#### Build Tools
| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^6.4.1 | Build tool |
| @vitejs/plugin-react | ^5.1.2 | React plugin |
| typescript | ^5.9.3 | TypeScript compiler |
| @tailwindcss/postcss | ^4.1.18 | Tailwind PostCSS |
| tailwindcss | ^4.1.18 | CSS framework |
| postcss | ^8.5.6 | CSS processing |
| autoprefixer | ^10.4.23 | CSS autoprefixer |
| terser | ^5.44.1 | JS minification |
| rollup-plugin-visualizer | ^6.0.5 | Bundle analysis |
| cross-env | ^7.0.3 | Cross-platform env |

#### Git Hooks & Utilities
| Package | Version | Purpose |
|---------|---------|---------|
| husky | ^9.1.7 | Git hooks |
| lint-staged | ^16.2.7 | Staged file linting |

#### Type Definitions
| Package | Version | Purpose |
|---------|---------|---------|
| @types/lodash | ^4.17.23 | Lodash types |
| @types/node | ^25.0.10 | Node.js types |
| @types/react | ^19.2.3 | React types |
| @types/react-dom | ^19.2.3 | React DOM types |

---

## 2. Issues Found

### 2.1 ⚠️ CRITICAL: axios in Wrong Section

**Status:** MUST FIX  
**Current Location:** devDependencies  
**Required Location:** dependencies

**Evidence - Production code imports:**
```
frontend/src/settings/SettingsPersistence.ts:6 - import axios from 'axios';
frontend/src/services/syncApi.ts:1 - import axios from 'axios';
frontend/src/services/settingsApi.ts:1 - import axios from 'axios';
frontend/src/domains/vendor-bill/api.ts:7 - import axios from 'axios';
frontend/src/documents/hooks/useIngestDocument.ts:9 - import axios from 'axios';
```

**Impact:** The application will fail at runtime in production if axios is not bundled. Currently works because Vite bundles all imports regardless of package.json section, but this is semantically incorrect and could cause issues with:
- Tree-shaking analysis
- Security audits (prod-only)
- Dependency analysis tools

**Recommendation:** Move `axios` from devDependencies to dependencies.

### 2.2 ⚠️ MODERATE: lodash Missing from Dependencies

**Status:** SHOULD FIX  
**Current Location:** Only `@types/lodash` in devDependencies  
**Required:** `lodash` in dependencies

**Evidence - Production code imports:**
```
frontend/src/domains/product/components/ProductSearch.tsx:4 - import { debounce } from 'lodash';
```

**Impact:** Similar to axios - works due to Vite bundling but semantically incorrect.

**Recommendation:** Either:
1. Add `lodash` to dependencies, OR
2. Replace with `lodash-es` for better tree-shaking, OR
3. Use native `setTimeout`-based debounce to eliminate dependency

---

## 3. Runtime Imports of Dev Tools Analysis

### 3.1 Storybook Imports

**Status:** ✅ PASS

All `@storybook/*` imports are confined to `.stories.tsx` files:
- 32 story files found with storybook imports
- 0 production files with storybook imports

**Files with storybook imports (all correct):**
- `frontend/src/**/*.stories.tsx` (32 files)

### 3.2 Vitest Imports

**Status:** ✅ PASS

All `vitest` imports are confined to test files and test infrastructure:
- Test files: `*.test.ts`, `*.test.tsx`, `*.property.test.ts`
- Test infrastructure: `frontend/src/test/setup.ts`

### 3.3 @testing-library Imports

**Status:** ✅ PASS

All `@testing-library/*` imports are confined to:
- Test files: `*.test.tsx`, `*.integration.test.tsx`
- Test utilities: `frontend/src/test/utils.tsx`, `frontend/src/test/test-utils.tsx`
- Test setup: `frontend/src/test/setup.ts`

### 3.4 Playwright Imports

**Status:** ✅ PASS

No playwright imports found in `frontend/src/**/*.{ts,tsx}` files.
Playwright is only used via CLI commands (`npm run test:e2e`).

### 3.5 fast-check Imports

**Status:** ✅ PASS

All `fast-check` imports are confined to property test files (`*.property.test.ts`).

---

## 4. Security Analysis

### 4.1 npm audit Results

#### Production Dependencies Only
```bash
$ npm audit --omit=dev
found 0 vulnerabilities
```

#### All Dependencies
```bash
$ npm audit
found 0 vulnerabilities
```

**Status:** ✅ EXCELLENT - No known vulnerabilities in any dependencies.

### 4.2 Security Recommendations

#### For CI/CD Pipeline
```bash
# Production security check (recommended for deployment gates)
npm audit --omit=dev --audit-level=high

# Full security check (recommended for development)
npm audit --audit-level=moderate
```

#### Existing Scripts (Already Configured)
The package.json already includes good audit scripts:
```json
{
  "scripts": {
    "postinstall": "npm audit fix --audit-level=moderate || true",
    "audit:prod": "npm audit --omit=dev --audit-level=high",
    "audit:all": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix"
  }
}
```

**Recommendation:** Add `npm run audit:prod` to CI/CD deployment pipeline.

---

## 5. Docker/CI Install Strategy

### 5.1 Current Dockerfile Analysis

**File:** `frontend/Dockerfile`

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps && npm cache clean --force
COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

**Status:** ✅ GOOD

**Analysis:**
1. Multi-stage build correctly separates build and runtime
2. Only `/app/dist` (built assets) is copied to production image
3. No node_modules in final image
4. devDependencies are NOT shipped to production

### 5.2 Recommendations

#### Current Strategy (Acceptable)
The current approach installs all dependencies in the build stage, which is necessary because:
- Vite (devDependency) is needed to build
- TypeScript (devDependency) is needed to compile
- Build tools are required during build phase

#### Optimized Strategy (Optional)
For faster CI builds, consider:

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production (unchanged)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
```

This enables better Docker layer caching for dependencies.

---

## 6. Action Items

### 6.1 Must Fix (Before Production)

| Priority | Issue | Action |
|----------|-------|--------|
| P0 | axios in devDependencies | Move to dependencies |
| P1 | lodash missing | Add to dependencies or replace |

### 6.2 Recommended (Best Practices)

| Priority | Issue | Action |
|----------|-------|--------|
| P2 | CI audit gate | Add `npm run audit:prod` to deployment pipeline |
| P3 | Docker optimization | Consider multi-stage dependency caching |

### 6.3 No Action Required

| Item | Status | Notes |
|------|--------|-------|
| Storybook placement | ✅ Correct | All in devDependencies |
| Playwright placement | ✅ Correct | All in devDependencies |
| Vitest placement | ✅ Correct | All in devDependencies |
| Testing-library placement | ✅ Correct | All in devDependencies |
| ESLint/Prettier placement | ✅ Correct | All in devDependencies |
| Husky/lint-staged placement | ✅ Correct | All in devDependencies |

---

## 7. Appendix

### 7.1 Files Analyzed

- `frontend/package.json` - Full dependency analysis
- `frontend/Dockerfile` - Production build strategy
- `frontend/src/**/*.{ts,tsx}` - Import analysis (excluding node_modules)

### 7.2 Search Patterns Used

```bash
# Storybook imports
grep -r "from ['\"]@?storybook" frontend/src/

# Vitest imports
grep -r "from ['\"]vitest" frontend/src/

# Playwright imports
grep -r "from ['\"]@?playwright" frontend/src/

# Testing-library imports
grep -r "from ['\"]@testing-library" frontend/src/

# fast-check imports
grep -r "from ['\"]fast-check" frontend/src/
```

### 7.3 Audit Commands

```bash
# Production-only audit
npm audit --omit=dev

# Full audit
npm audit

# Fix vulnerabilities
npm audit fix
```

---

**End of Audit Report**
