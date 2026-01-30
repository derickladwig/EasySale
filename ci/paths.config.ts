/**
 * Centralized Path Configuration for CI Property Tests
 * 
 * This file defines all paths used by CI property tests.
 * Update paths HERE when refactoring the codebase structure.
 * 
 * NO HARDCODED PATHS IN TEST FILES - import from this config instead.
 * 
 * RELATED CONFIG FILES (keep in sync):
 * - frontend/src/config/paths.config.ts — Frontend path configuration
 * - frontend/tsconfig.json — Path aliases
 * - frontend/tsconfig.build.json — Build excludes
 * - frontend/vite.config.ts — Vite aliases
 * - frontend/eslint.config.js — ESLint feature boundaries
 * 
 * POST-REFACTOR CHECKLIST:
 * 1. Update FRONTEND_PATHS below
 * 2. Update frontend/src/config/paths.config.ts
 * 3. Update frontend/tsconfig.build.json excludes
 * 4. Update frontend/eslint.config.js feature patterns
 * 5. Run: npx vitest run --dir ci
 */

import path from 'path';

// Repository root - computed dynamically
export const REPO_ROOT = path.resolve(__dirname, '..');

/**
 * Frontend source paths
 * Update these when refactoring frontend structure
 * 
 * THEMESYNC[FE-0010][module=ci][type=config-drift]: Hardcoded feature paths
 * These paths must be updated when refactoring frontend structure.
 * Theme-related paths: config, settings, auth (contains theme providers)
 * See: audit/theme/CONFIG_AND_PATH_DRIFT.md
 * See: audit/THEME_CONFLICT_MAP.md#FE-0010
 * 
 * POST-REFACTOR (2026-01-28): Features moved from src/features/{feature} to src/{feature}
 * Barrel re-exports at src/features/{feature}/index.ts maintain backward compatibility
 */
export const FRONTEND_PATHS = {
  // Root directories
  src: path.join(REPO_ROOT, 'frontend/src'),
  features: path.join(REPO_ROOT, 'frontend/src/features'), // Kept for barrel re-exports
  common: path.join(REPO_ROOT, 'frontend/src/common'),
  domains: path.join(REPO_ROOT, 'frontend/src/domains'),
  config: path.join(REPO_ROOT, 'frontend/src/config'),
  components: path.join(REPO_ROOT, 'frontend/src/common/components'),
  
  // Feature directories (POST-REFACTOR: now at src/{feature})
  auth: path.join(REPO_ROOT, 'frontend/src/auth'),
  admin: path.join(REPO_ROOT, 'frontend/src/admin'),
  sell: path.join(REPO_ROOT, 'frontend/src/sell'),
  lookup: path.join(REPO_ROOT, 'frontend/src/lookup'),
  warehouse: path.join(REPO_ROOT, 'frontend/src/warehouse'),
  customers: path.join(REPO_ROOT, 'frontend/src/customers'),
  products: path.join(REPO_ROOT, 'frontend/src/features/products'), // Not moved - internal only
  reporting: path.join(REPO_ROOT, 'frontend/src/reporting'),
  review: path.join(REPO_ROOT, 'frontend/src/review'),
  settings: path.join(REPO_ROOT, 'frontend/src/settings'),
  setup: path.join(REPO_ROOT, 'frontend/src/setup'),
  documents: path.join(REPO_ROOT, 'frontend/src/documents'),
  exports: path.join(REPO_ROOT, 'frontend/src/exports'),
  sales: path.join(REPO_ROOT, 'frontend/src/sales'),
  templates: path.join(REPO_ROOT, 'frontend/src/templates'),
  preferences: path.join(REPO_ROOT, 'frontend/src/preferences'),
  home: path.join(REPO_ROOT, 'frontend/src/home'),
  forms: path.join(REPO_ROOT, 'frontend/src/forms'),
} as const;

/**
 * Specific page paths used in tests
 */
export const PAGE_PATHS = {
  reportingPage: path.join(FRONTEND_PATHS.reporting, 'pages/ReportingPage.tsx'),
  sellPage: path.join(FRONTEND_PATHS.sell, 'pages/SellPage.tsx'),
  loginPage: path.join(FRONTEND_PATHS.auth, 'pages/LoginPageV2.tsx'),
  adminPage: path.join(FRONTEND_PATHS.admin, 'pages/AdminPage.tsx'),
} as const;

/**
 * Backend source paths
 */
export const BACKEND_PATHS = {
  src: path.join(REPO_ROOT, 'backend/crates/server/src'),
  handlers: path.join(REPO_ROOT, 'backend/crates/server/src/handlers'),
  services: path.join(REPO_ROOT, 'backend/crates/server/src/services'),
  models: path.join(REPO_ROOT, 'backend/crates/server/src/models'),
  config: path.join(REPO_ROOT, 'backend/crates/server/src/config'),
  middleware: path.join(REPO_ROOT, 'backend/crates/server/src/middleware'),
  connectors: path.join(REPO_ROOT, 'backend/crates/server/src/connectors'),
} as const;

/**
 * Paths to scan for readiness gate checks
 * These are the production runtime code paths
 */
export const SCAN_PATHS = [
  BACKEND_PATHS.handlers,
  BACKEND_PATHS.services,
  BACKEND_PATHS.models,
  BACKEND_PATHS.config,
  BACKEND_PATHS.middleware,
  FRONTEND_PATHS.features,
  FRONTEND_PATHS.common,
  FRONTEND_PATHS.config,
] as const;

/**
 * Feature paths for automotive optional checks
 */
export const AUTOMOTIVE_SCAN_PATHS = [
  BACKEND_PATHS.handlers,
  BACKEND_PATHS.services,
  BACKEND_PATHS.models,
  FRONTEND_PATHS.sell,
  FRONTEND_PATHS.customers,
  FRONTEND_PATHS.products,
  FRONTEND_PATHS.warehouse,
  FRONTEND_PATHS.reporting,
] as const;

/**
 * Config file paths
 */
export const CONFIG_PATHS = {
  defaultConfig: path.join(REPO_ROOT, 'configs/default.json'),
  schemaConfig: path.join(REPO_ROOT, 'configs/schema.json'),
  readinessPolicy: path.join(REPO_ROOT, 'ci/readiness-policy.json'),
} as const;

/**
 * CI/Build script paths
 */
export const CI_PATHS = {
  root: path.join(REPO_ROOT, 'ci'),
  readinessPolicy: path.join(REPO_ROOT, 'ci/readiness-policy.json'),
  readinessGate: path.join(REPO_ROOT, 'ci/readiness-gate.ps1'),
  packageWindows: path.join(REPO_ROOT, 'ci/package-windows.ps1'),
  vitestConfig: path.join(REPO_ROOT, 'ci/vitest.config.ts'),
} as const;

/**
 * GitHub workflow paths
 */
export const WORKFLOW_PATHS = {
  root: path.join(REPO_ROOT, '.github/workflows'),
  readinessGate: path.join(REPO_ROOT, '.github/workflows/readiness-gate.yml'),
  ci: path.join(REPO_ROOT, '.github/workflows/ci.yml'),
} as const;

/**
 * Installer paths
 */
export const INSTALLER_PATHS = {
  root: path.join(REPO_ROOT, 'installer'),
  windows: path.join(REPO_ROOT, 'installer/windows'),
  preflight: path.join(REPO_ROOT, 'installer/windows/preflight.ps1'),
} as const;

/**
 * Build config paths
 */
export const BUILD_CONFIG_PATHS = {
  frontendVite: path.join(REPO_ROOT, 'frontend/vite.config.ts'),
  frontendVitest: path.join(REPO_ROOT, 'frontend/vitest.config.ts'),
  frontendTsconfig: path.join(REPO_ROOT, 'frontend/tsconfig.json'),
  frontendTsconfigBuild: path.join(REPO_ROOT, 'frontend/tsconfig.build.json'),
  frontendEslint: path.join(REPO_ROOT, 'frontend/eslint.config.js'),
  frontendPackage: path.join(REPO_ROOT, 'frontend/package.json'),
  backendCargo: path.join(REPO_ROOT, 'backend/Cargo.toml'),
  gitignore: path.join(REPO_ROOT, '.gitignore'),
} as const;

/**
 * Paths that should be excluded from builds (sync with tsconfig.build.json)
 */
export const BUILD_EXCLUDE_PATTERNS = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.property.test.ts',
  '**/*.property.test.tsx',
  '**/*.integration.test.tsx',
  '**/*.stories.ts',
  '**/*.stories.tsx',
  '**/__tests__/**',
  '**/test/**',
  'src/test/**',
  'node_modules',
  'archive',
] as const;

/**
 * Feature paths that are excluded from strict TypeScript build
 * POST-REFACTOR (2026-01-28): Features moved to src/{feature}
 */
export const FEATURE_BUILD_EXCLUDES = [
  'src/settings/**',
  'src/sell/**',
  'src/auth/**',
  'src/home/**',
  'src/admin/**',
] as const;

/**
 * ESLint feature boundary patterns
 * POST-REFACTOR (2026-01-28): Features moved to src/{feature}
 * Note: src/features/ still exists for barrel re-exports
 */
export const ESLINT_FEATURE_PATTERNS = [
  'src/auth/**/*.{ts,tsx}',
  'src/admin/**/*.{ts,tsx}',
  'src/sell/**/*.{ts,tsx}',
  'src/lookup/**/*.{ts,tsx}',
  'src/warehouse/**/*.{ts,tsx}',
  'src/customers/**/*.{ts,tsx}',
  'src/reporting/**/*.{ts,tsx}',
  'src/review/**/*.{ts,tsx}',
  'src/settings/**/*.{ts,tsx}',
  'src/setup/**/*.{ts,tsx}',
  'src/documents/**/*.{ts,tsx}',
  'src/exports/**/*.{ts,tsx}',
  'src/sales/**/*.{ts,tsx}',
  'src/templates/**/*.{ts,tsx}',
  'src/preferences/**/*.{ts,tsx}',
  'src/home/**/*.{ts,tsx}',
  'src/forms/**/*.{ts,tsx}',
  'src/features/**/*.{ts,tsx}', // Barrel re-exports
] as const;

/**
 * ESLint restricted imports for features (features should not import from other features)
 */
export const ESLINT_RESTRICTED_IMPORTS = [
  '../admin/**',
  '../auth/**',
  '../customers/**',
  '../forms/**',
  '../home/**',
  '../lookup/**',
  '../products/**',
  '../reporting/**',
  '../sell/**',
  '../settings/**',
  '../setup/**',
  '../templates/**',
  '../warehouse/**',
] as const;

/**
 * Helper to get all feature paths as an array
 */
export function getAllFeaturePaths(): string[] {
  return [
    FRONTEND_PATHS.auth,
    FRONTEND_PATHS.admin,
    FRONTEND_PATHS.sell,
    FRONTEND_PATHS.lookup,
    FRONTEND_PATHS.warehouse,
    FRONTEND_PATHS.customers,
    FRONTEND_PATHS.products,
    FRONTEND_PATHS.reporting,
    FRONTEND_PATHS.review,
    FRONTEND_PATHS.settings,
    FRONTEND_PATHS.setup,
    FRONTEND_PATHS.documents,
    FRONTEND_PATHS.exports,
    FRONTEND_PATHS.sales,
    FRONTEND_PATHS.templates,
    FRONTEND_PATHS.preferences,
    FRONTEND_PATHS.home,
    FRONTEND_PATHS.forms,
  ];
}

/**
 * Helper to check if a path exists
 */
export function pathExists(filePath: string): boolean {
  try {
    const fs = require('fs');
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}
