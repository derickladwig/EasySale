/**
 * Theme Resolver Utility
 * 
 * Resolves the effective theme appearance by combining:
 * - User preference (can be 'store-default', 'light', 'dark', or 'system')
 * - Tenant default theme from BrandConfig
 * - System preference (for 'system' mode)
 * 
 * Validates: Requirements 5.5 (Theme default support)
 * Task: 15.3 Add theme default support
 */

import type { ThemeAppearance } from './userPreferences';
import type { BrandConfig } from '../../config/types';

/**
 * Resolved theme mode (never 'store-default' or 'system')
 */
export type ResolvedThemeMode = 'light' | 'dark';

/**
 * Resolve user theme preference to actual theme mode
 * 
 * Resolution order:
 * 1. If user preference is 'store-default', use tenant's defaultAppearance
 * 2. If user preference is 'system', use system preference
 * 3. Otherwise, use user preference directly
 * 
 * @param userPreference - User's theme preference
 * @param brandConfig - Tenant's brand configuration (optional)
 * @returns Resolved theme mode ('light' or 'dark')
 * 
 * @example
 * ```ts
 * // User wants store default, tenant default is 'dark'
 * resolveTheme('store-default', brandConfig) // => 'dark'
 * 
 * // User wants light theme
 * resolveTheme('light', brandConfig) // => 'light'
 * 
 * // User wants system preference, system is dark
 * resolveTheme('system', brandConfig) // => 'dark'
 * ```
 */
export function resolveTheme(
  userPreference: ThemeAppearance,
  brandConfig?: BrandConfig
): ResolvedThemeMode {
  // If user wants store default, use tenant's default
  if (userPreference === 'store-default') {
    const tenantDefault = brandConfig?.theme?.defaultAppearance || 'system';
    
    // If tenant default is also 'system', resolve it
    if (tenantDefault === 'system') {
      return getSystemPreference();
    }
    
    return tenantDefault as ResolvedThemeMode;
  }
  
  // If user wants system preference, resolve it
  if (userPreference === 'system') {
    return getSystemPreference();
  }
  
  // Otherwise, use user preference directly
  return userPreference as ResolvedThemeMode;
}

/**
 * Get system color scheme preference
 * 
 * @returns 'dark' if system prefers dark mode, 'light' otherwise
 */
export function getSystemPreference(): ResolvedThemeMode {
  if (typeof window === 'undefined') {
    return 'light';
  }
  
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

/**
 * Get the effective theme description for display
 * 
 * Shows what theme will actually be used, useful for UI feedback.
 * 
 * @param userPreference - User's theme preference
 * @param brandConfig - Tenant's brand configuration (optional)
 * @returns Human-readable description of effective theme
 * 
 * @example
 * ```ts
 * getEffectiveThemeDescription('store-default', brandConfig)
 * // => "Using store default (Dark)"
 * 
 * getEffectiveThemeDescription('system', brandConfig)
 * // => "Following system (Light)"
 * ```
 */
export function getEffectiveThemeDescription(
  userPreference: ThemeAppearance,
  brandConfig?: BrandConfig
): string {
  const resolved = resolveTheme(userPreference, brandConfig);
  const capitalizedResolved = resolved.charAt(0).toUpperCase() + resolved.slice(1);
  
  if (userPreference === 'store-default') {
    return `Using store default (${capitalizedResolved})`;
  }
  
  if (userPreference === 'system') {
    return `Following system (${capitalizedResolved})`;
  }
  
  return capitalizedResolved;
}

/**
 * Check if theme preference needs system preference monitoring
 * 
 * Returns true if the effective theme depends on system preference,
 * which means we need to listen for system theme changes.
 * 
 * @param userPreference - User's theme preference
 * @param brandConfig - Tenant's brand configuration (optional)
 * @returns True if system preference monitoring is needed
 */
export function needsSystemPreferenceMonitoring(
  userPreference: ThemeAppearance,
  brandConfig?: BrandConfig
): boolean {
  // Direct system preference
  if (userPreference === 'system') {
    return true;
  }
  
  // Store default that resolves to system
  if (userPreference === 'store-default') {
    const tenantDefault = brandConfig?.theme?.defaultAppearance || 'system';
    return tenantDefault === 'system';
  }
  
  return false;
}
