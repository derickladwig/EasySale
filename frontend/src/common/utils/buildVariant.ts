/**
 * Build Variant Utilities
 *
 * Provides compile-time and runtime feature detection for split builds.
 * The build variant is determined at build time via VITE_BUILD_VARIANT env var.
 *
 * Variants:
 * - lite: Core POS only (smallest bundle)
 * - export: + CSV export for QuickBooks (default)
 * - full: + OCR, document processing, admin features
 */

// Build variant from environment (set at build time)
export const BUILD_VARIANT = import.meta.env.VITE_BUILD_VARIANT || 'full';

// Variant detection helpers
export const IS_LITE_MODE = BUILD_VARIANT === 'lite';
export const IS_EXPORT_MODE = BUILD_VARIANT === 'export';
export const IS_FULL_MODE = BUILD_VARIANT === 'full';

// Feature flags based on build variant
// These can be overridden by environment variables for testing
export const ENABLE_ADMIN =
  import.meta.env.VITE_ENABLE_ADMIN !== 'false' && !IS_LITE_MODE;
export const ENABLE_REPORTING =
  import.meta.env.VITE_ENABLE_REPORTING !== 'false' && !IS_LITE_MODE;
export const ENABLE_VENDOR_BILLS =
  import.meta.env.VITE_ENABLE_VENDOR_BILLS !== 'false' && IS_FULL_MODE;
export const ENABLE_DOCUMENTS =
  import.meta.env.VITE_ENABLE_DOCUMENTS !== 'false' && IS_FULL_MODE;
export const ENABLE_EXPORTS =
  import.meta.env.VITE_ENABLE_EXPORTS !== 'false' && (IS_EXPORT_MODE || IS_FULL_MODE);
export const ENABLE_REVIEW =
  import.meta.env.VITE_ENABLE_REVIEW !== 'false' && IS_FULL_MODE;

/**
 * Check if a specific feature is enabled in the current build
 */
export function isFeatureEnabled(feature: string): boolean {
  switch (feature) {
    case 'admin':
      return ENABLE_ADMIN;
    case 'reporting':
      return ENABLE_REPORTING;
    case 'vendor-bills':
      return ENABLE_VENDOR_BILLS;
    case 'documents':
      return ENABLE_DOCUMENTS;
    case 'exports':
      return ENABLE_EXPORTS;
    case 'review':
      return ENABLE_REVIEW;
    default:
      // Core features are always enabled
      return true;
  }
}

/**
 * Get human-readable build variant name
 */
export function getBuildVariantName(): string {
  switch (BUILD_VARIANT) {
    case 'lite':
      return 'Lite';
    case 'export':
      return 'Export';
    case 'full':
      return 'Full';
    default:
      return BUILD_VARIANT;
  }
}

/**
 * Get list of enabled features for the current build
 */
export function getEnabledFeatures(): string[] {
  const features: string[] = ['core', 'sell', 'lookup', 'warehouse', 'customers'];

  if (ENABLE_ADMIN) features.push('admin');
  if (ENABLE_REPORTING) features.push('reporting');
  if (ENABLE_VENDOR_BILLS) features.push('vendor-bills');
  if (ENABLE_DOCUMENTS) features.push('documents');
  if (ENABLE_EXPORTS) features.push('exports');
  if (ENABLE_REVIEW) features.push('review');

  return features;
}
