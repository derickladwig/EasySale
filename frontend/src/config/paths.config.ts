/**
 * Centralized Path Configuration for Frontend
 * 
 * This file defines all paths used throughout the frontend codebase.
 * Update paths HERE when refactoring the codebase structure.
 * 
 * NO HARDCODED PATHS IN OTHER FILES - import from this config instead.
 * 
 * @usage
 * import { FEATURE_PATHS, PAGE_PATHS } from '@config/paths.config';
 */

// ============================================================================
// Feature Directory Paths (relative to src/)
// ============================================================================

/**
 * Feature module paths
 * Update these when moving features from src/features/ to src/
 */
export const FEATURE_PATHS = {
  // Current structure (features/ prefix)
  auth: 'features/auth',
  admin: 'features/admin',
  sell: 'features/sell',
  lookup: 'features/lookup',
  inventory: 'features/inventory',
  customers: 'features/customers',
  products: 'features/products',
  reporting: 'features/reporting',
  review: 'features/review',
  settings: 'features/settings',
  setup: 'features/setup',
  documents: 'features/documents',
  exports: 'features/exports',
  sales: 'features/sales',
  templates: 'features/templates',
  preferences: 'features/preferences',
  home: 'features/home',
  forms: 'features/forms',
} as const;

/**
 * Shared module paths (DO NOT CHANGE during feature refactor)
 */
export const SHARED_PATHS = {
  common: 'common',
  components: 'common/components',
  hooks: 'common/hooks',
  utils: 'common/utils',
  contexts: 'common/contexts',
  layouts: 'common/layouts',
  domains: 'domains',
  config: 'config',
  theme: 'theme',
  assets: 'assets',
  services: 'services',
} as const;

// ============================================================================
// Path Alias Configuration
// ============================================================================

/**
 * Path aliases that MUST continue to work
 * These are defined in tsconfig.json and vite.config.ts
 */
export const PATH_ALIASES = {
  '@common': 'src/common',
  '@features': 'src/features',
  '@domains': 'src/domains',
  '@assets': 'src/assets',
} as const;

// ============================================================================
// Build Configuration Paths
// ============================================================================

/**
 * Paths excluded from TypeScript build (tsconfig.build.json)
 * Update these after refactor
 */
export const BUILD_EXCLUDE_PATHS = [
  // Test files (glob patterns)
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
  'src/test-*.tsx',
  'src/test-*.ts',
  '**/*.example.tsx',
  
  // UI examples
  'src/components/ui/examples/**',
  'src/components/review/**',
  
  // Config directories
  'src/config/**',
  'src/settings/**',
  'src/theme/**',
  
  // Feature directories (update after refactor)
  'src/features/settings/**',
  'src/features/sell/**',
  'src/features/auth/**',
  'src/features/home/**',
  'src/features/admin/**',
  
  // Specific files with known issues
  'src/common/hooks/useApiError.ts',
  'src/common/contexts/ToastContext.tsx',
  'src/common/components/atoms/SkeletonScreens.tsx',
  'src/common/components/index.ts',
  'src/common/components/organisms/index.ts',
  'src/common/components/organisms/LoadingContainer.tsx',
  'src/AppLayout.tsx',
  
  // Build artifacts
  'node_modules',
  'archive',
] as const;

/**
 * ESLint feature boundary paths
 * Update these after refactor
 */
export const ESLINT_FEATURE_PATHS = [
  'src/features/**/*.{ts,tsx}',
] as const;

/**
 * ESLint restricted import patterns for features
 * Features should not import from other features
 */
export const ESLINT_RESTRICTED_FEATURE_IMPORTS = [
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
  '../inventory/**',
] as const;

// ============================================================================
// Type Exports
// ============================================================================

export type FeaturePath = keyof typeof FEATURE_PATHS;
export type SharedPath = keyof typeof SHARED_PATHS;
export type PathAlias = keyof typeof PATH_ALIASES;
