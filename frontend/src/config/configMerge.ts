/**
 * Configuration Merge Strategy
 *
 * Implements the four-layer configuration merge:
 * defaultConfig (code) ← tenantConfig (JSON) ← storeConfig (DB) ← userConfig (DB, respecting locks)
 */

import type { TenantConfig, ThemeConfig, DeepPartial } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ThemeLocks {
  lockMode?: boolean;
  lockAccent?: boolean;
  lockContrast?: boolean;
}

export interface StoreConfig {
  theme?: Partial<ThemeConfig>;
  locks?: ThemeLocks;
  [key: string]: unknown;
}

export interface UserConfig {
  theme?: Partial<ThemeConfig>;
  [key: string]: unknown;
}

export interface ConfigLayers {
  default: TenantConfig;
  tenant?: DeepPartial<TenantConfig>;
  store?: StoreConfig;
  user?: UserConfig;
}

// ============================================================================
// Merge Functions
// ============================================================================

/**
 * Merge configuration layers with proper precedence
 *
 * Precedence: defaultConfig ← tenantConfig ← storeConfig ← userConfig (respecting locks)
 */
export function mergeConfigs(layers: ConfigLayers): TenantConfig {
  const { default: defaultConfig, tenant, store, user } = layers;

  // Start with default config
  let merged = { ...defaultConfig };

  // Apply tenant config (if provided)
  if (tenant) {
    merged = deepMerge(merged, tenant) as TenantConfig;
  }

  // Apply store config (if provided)
  if (store) {
    merged = applyStoreConfig(merged, store);
  }

  // Apply user config (if provided, respecting locks)
  if (user && store?.locks) {
    merged = applyUserConfig(merged, user, store.locks);
  } else if (user) {
    merged = applyUserConfig(merged, user, {});
  }

  return merged;
}

/**
 * Apply store configuration to merged config
 */
function applyStoreConfig(config: TenantConfig, storeConfig: StoreConfig): TenantConfig {
  const merged = { ...config };

  // Apply store theme settings
  if (storeConfig.theme) {
    merged.theme = {
      ...merged.theme,
      ...storeConfig.theme,
      colors: {
        ...merged.theme.colors,
        ...storeConfig.theme.colors,
      },
    };
  }

  // Store other store-level settings (future expansion)
  // ...

  return merged;
}

/**
 * Apply user configuration to merged config, respecting theme locks
 */
function applyUserConfig(
  config: TenantConfig,
  userConfig: UserConfig,
  locks: ThemeLocks
): TenantConfig {
  const merged = { ...config };

  // Apply user theme settings (respecting locks)
  if (userConfig.theme) {
    const userTheme = userConfig.theme;

    merged.theme = {
      ...merged.theme,
      // Apply mode only if not locked
      mode: locks.lockMode ? merged.theme.mode : (userTheme.mode ?? merged.theme.mode),
      // Apply colors (accent) only if not locked
      colors: locks.lockAccent
        ? merged.theme.colors
        : {
            ...merged.theme.colors,
            ...userTheme.colors,
          },
      // Other theme properties can be overridden by user
      fonts: userTheme.fonts ?? merged.theme.fonts,
      spacing: userTheme.spacing ?? merged.theme.spacing,
      borderRadius: userTheme.borderRadius ?? merged.theme.borderRadius,
      animations: userTheme.animations ?? merged.theme.animations,
    };
  }

  // Apply other user-level settings (future expansion)
  // ...

  return merged;
}

/**
 * Deep merge two objects
 *
 * Note: This is a simple deep merge. For production, consider using a library like lodash.merge
 */
function deepMerge<T extends Record<string, any>>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (isObject(sourceValue) && isObject(targetValue)) {
        result[key] = deepMerge(targetValue, sourceValue);
      } else if (sourceValue !== undefined) {
        result[key] = sourceValue as any;
      }
    }
  }

  return result;
}

/**
 * Check if value is a plain object
 */
function isObject(value: unknown): value is Record<string, any> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// ============================================================================
// Theme Resolution Helpers
// ============================================================================

/**
 * Resolve theme configuration with scope precedence
 *
 * This is a convenience function for theme-specific resolution
 */
export function resolveTheme(
  defaultTheme: ThemeConfig,
  tenantTheme?: Partial<ThemeConfig>,
  storeTheme?: Partial<ThemeConfig>,
  userTheme?: Partial<ThemeConfig>,
  locks?: ThemeLocks
): ThemeConfig {
  let resolved = { ...defaultTheme };

  // Apply tenant theme
  if (tenantTheme) {
    resolved = {
      ...resolved,
      ...tenantTheme,
      colors: {
        ...resolved.colors,
        ...tenantTheme.colors,
      },
    };
  }

  // Apply store theme
  if (storeTheme) {
    resolved = {
      ...resolved,
      ...storeTheme,
      colors: {
        ...resolved.colors,
        ...storeTheme.colors,
      },
    };
  }

  // Apply user theme (respecting locks)
  if (userTheme) {
    resolved = {
      ...resolved,
      mode: locks?.lockMode ? resolved.mode : (userTheme.mode ?? resolved.mode),
      colors: locks?.lockAccent
        ? resolved.colors
        : {
            ...resolved.colors,
            ...userTheme.colors,
          },
      fonts: userTheme.fonts ?? resolved.fonts,
      spacing: userTheme.spacing ?? resolved.spacing,
      borderRadius: userTheme.borderRadius ?? resolved.borderRadius,
      animations: userTheme.animations ?? resolved.animations,
    };
  }

  return resolved;
}

// ============================================================================
// Exports
// ============================================================================
