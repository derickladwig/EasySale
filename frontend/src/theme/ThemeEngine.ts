/**
 * ThemeEngine - Core theme management system
 *
 * Responsibilities:
 * - Apply themes to DOM via data attributes
 * - Resolve theme preferences with scope precedence
 * - Persist theme preferences to ConfigStore
 * - Load cached themes for offline startup
 * - Bridge tenant config colors to CSS variables
 *
 * Architecture:
 * - Pre-React boot: Applies cached theme before React renders (prevents flash)
 * - Scope resolution: tenant → store → user (respecting locks)
 * - Offline-first: Uses localStorage cache when backend unavailable
 */

import type { IConfigStore, ThemePreferences, StoreThemeConfig } from '../config/ConfigStore';
import type { ThemeConfig } from '../config/types';
import { applyThemeToCSS, themeToCSSVariables } from '../config/themeBridge';
import { themeSyncService } from '../sync/ThemeSyncService';

// ============================================================================
// Types
// ============================================================================

/**
 * Theme cache stored in localStorage for offline startup
 */
export interface ThemeCache {
  lastStoreId: string;
  lastTheme: ThemeConfig;
  timestamp: number;
}

/**
 * Theme boot options for pre-React initialization
 */
export interface ThemeBootOptions {
  cacheKey?: string;
  defaultTheme?: ThemeConfig;
}

// ============================================================================
// Default Theme
// ============================================================================

/**
 * Hardcoded default theme used as fallback
 * Uses teal accent color (#14b8a6) to match tokens.css
 *
 * THEMESYNC[FE-0001][module=theme][type=duplicated-token]: This DEFAULT_THEME
 * intentionally duplicates tokens.css values as a fallback for offline/error scenarios.
 * Do not edit colors here - update tokens.css instead.
 * Source-of-truth: frontend/src/styles/tokens.css
 * See: audit/THEME_CONFLICT_MAP.md#FE-0001
 */
export const DEFAULT_THEME: ThemeConfig = {
  mode: 'dark',
  colors: {
    primary: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      950: '#042f2e',
    },
    secondary: { 500: '#64748b', 600: '#475569' },
    accent: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
      950: '#042f2e',
    },
    background: '#222224',
    surface: '#2a2a2c',
    text: '#f5f5f7',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
};

// ============================================================================
// ThemeEngine Class
// ============================================================================

/**
 * ThemeEngine manages theme application, resolution, and persistence
 *
 * Usage:
 * ```typescript
 * const engine = new ThemeEngine(configStore);
 * await engine.initialize('store-1', 'user-1');
 * await engine.setTheme('user', { mode: 'dark' });
 * ```
 */
export class ThemeEngine {
  private configStore: IConfigStore;
  private cacheKey: string;
  private currentStoreId?: string;
  private currentUserId?: string;

  constructor(configStore: IConfigStore, cacheKey: string = 'EasySale_theme_cache_v2') {
    this.configStore = configStore;
    this.cacheKey = cacheKey;
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Initialize theme engine with store and user context
   *
   * Loads and applies the resolved theme based on scope precedence
   *
   * @param storeId - Store ID for store-level theme
   * @param userId - Optional user ID for user-level theme
   */
  async initialize(storeId: string, userId?: string): Promise<void> {
    this.currentStoreId = storeId;
    this.currentUserId = userId;

    try {
      // Load resolved theme from ConfigStore
      const theme = await this.configStore.getTheme(storeId, userId);

      // Apply theme to DOM
      this.applyTheme(theme);

      // Cache theme for offline startup
      this.cacheTheme(storeId, theme);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to initialize theme:', error);
      }

      // Fall back to cached theme
      const cached = this.loadCachedTheme();
      if (cached) {
        if (import.meta.env.DEV) {
          console.warn('Using cached theme due to initialization error');
        }
        this.applyTheme(cached);
      } else {
        // Last resort: use default theme
        if (import.meta.env.DEV) {
          console.warn('Using default theme due to initialization error');
        }
        this.applyTheme(DEFAULT_THEME);
      }
    }
  }

  /**
   * Apply theme configuration to DOM
   *
   * Sets HTML data attributes and injects CSS variables
   *
   * @param config - Theme configuration to apply
   */
  applyTheme(config: ThemeConfig): void {
    const root = document.documentElement;

    // Resolve auto mode to actual light/dark
    const resolvedMode = config.mode === 'auto' ? this.resolveAutoMode() : config.mode;

    // Set data attributes for theme mode
    root.dataset.theme = resolvedMode;

    // Create resolved config with actual mode for CSS variable application
    const resolvedConfig: ThemeConfig = {
      ...config,
      mode: resolvedMode,
    };

    // Apply CSS variables from theme config
    applyThemeToCSS(resolvedConfig);
  }

  /**
   * Resolve theme with scope precedence logic
   *
   * Precedence: tenant → store → user (respecting locks)
   * - If store locks a dimension (mode/accent), user cannot override
   * - Otherwise, user preference takes precedence
   *
   * @param preferences - Theme preferences at different scopes
   * @returns Resolved theme configuration
   */
  resolveTheme(preferences: ThemePreferences): ThemeConfig {
    const { store, user, default: defaultTheme } = preferences;

    // Start with default theme
    const resolved: ThemeConfig = { ...defaultTheme };

    // Apply store theme (if exists)
    if (store) {
      if (store.mode) resolved.mode = store.mode;
      if (store.colors) resolved.colors = { ...resolved.colors, ...store.colors };
      if (store.fonts) resolved.fonts = { ...resolved.fonts, ...store.fonts };
      if (store.spacing) resolved.spacing = { ...resolved.spacing, ...store.spacing };
      if (store.borderRadius) resolved.borderRadius = { ...resolved.borderRadius, ...store.borderRadius };
      if (store.animations) resolved.animations = { ...resolved.animations, ...store.animations };
    }

    // Apply user theme (if exists and not locked)
    if (user) {
      const locks = store?.locks || {};

      // Apply mode if not locked
      if (user.mode && !locks.lockMode) {
        resolved.mode = user.mode;
      }

      // Apply colors if not locked
      // Note: lockAccent only locks accent color, not all colors
      if (user.colors) {
        if (locks.lockAccent) {
          // Keep store accent, but allow other color overrides
          const { accent: _accent, ...otherColors } = user.colors;
          resolved.colors = { ...resolved.colors, ...otherColors };
        } else {
          resolved.colors = { ...resolved.colors, ...user.colors };
        }
      }

      // Apply other properties (not affected by locks)
      if (user.fonts) resolved.fonts = { ...resolved.fonts, ...user.fonts };
      if (user.spacing) resolved.spacing = { ...resolved.spacing, ...user.spacing };
      if (user.borderRadius) resolved.borderRadius = { ...resolved.borderRadius, ...user.borderRadius };
      if (user.animations) resolved.animations = { ...resolved.animations, ...user.animations };
    }

    return resolved;
  }

  /**
   * Save theme preference at a specific scope
   *
   * Validates theme locks before saving user preferences
   *
   * @param scope - Scope to save to ('store' or 'user')
   * @param partialTheme - Partial theme configuration to merge
   * @throws Error if theme locks prevent the change
   */
  async saveThemePreference(
    scope: 'store' | 'user',
    partialTheme: Partial<ThemeConfig>
  ): Promise<void> {
    if (!this.currentStoreId) {
      throw new Error('ThemeEngine not initialized: missing store ID');
    }

    if (scope === 'user' && !this.currentUserId) {
      throw new Error('Cannot save user theme preference: missing user ID');
    }

    // Validate theme locks for user scope
    if (scope === 'user') {
      await this.validateThemeLocks(partialTheme);
    }

    // Save to ConfigStore
    await this.configStore.setTheme(
      scope,
      partialTheme,
      this.currentStoreId,
      scope === 'user' ? this.currentUserId : undefined
    );

    // Queue for synchronization
    await themeSyncService.queueThemeChange(
      scope,
      this.currentStoreId,
      partialTheme,
      scope === 'user' ? this.currentUserId : undefined
    );

    // Reload and apply updated theme
    const updatedTheme = await this.configStore.getTheme(
      this.currentStoreId,
      this.currentUserId
    );
    this.applyTheme(updatedTheme);

    // Update cache
    this.cacheTheme(this.currentStoreId, updatedTheme);
  }

  /**
   * Load cached theme for offline startup
   *
   * Returns null if no cache exists or cache is invalid
   *
   * @returns Cached theme configuration or null
   */
  loadCachedTheme(): ThemeConfig | null {
    try {
      const cached = localStorage.getItem(this.cacheKey);
      if (!cached) return null;

      const parsed: ThemeCache = JSON.parse(cached);

      // Validate cache structure
      if (!parsed.lastTheme || !parsed.lastStoreId) {
        if (import.meta.env.DEV) {
          console.warn('Invalid theme cache structure');
        }
        return null;
      }

      // Cache is valid
      return parsed.lastTheme;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load cached theme:', error);
      }
      return null;
    }
  }

  /**
   * Get current theme configuration
   *
   * Returns the currently applied theme by reading CSS variables
   */
  getCurrentTheme(): ThemeConfig | null {
    const root = document.documentElement;
    const mode = root.dataset.theme as 'light' | 'dark' | undefined;

    if (!mode) return null;

    // Read actual CSS variables from the DOM
    const getVar = (name: string): string => {
      return getComputedStyle(root).getPropertyValue(name).trim();
    };

    // Reconstruct theme from CSS variables
    return {
      mode,
      colors: {
        primary: {
          50: getVar('--color-primary-50') || '#f0fdfa',
          100: getVar('--color-primary-100') || '#ccfbf1',
          200: getVar('--color-primary-200') || '#99f6e4',
          300: getVar('--color-primary-300') || '#5eead4',
          400: getVar('--color-primary-400') || '#2dd4bf',
          500: getVar('--color-primary-500') || '#14b8a6',
          600: getVar('--color-primary-600') || '#0d9488',
          700: getVar('--color-primary-700') || '#0f766e',
          800: getVar('--color-primary-800') || '#115e59',
          900: getVar('--color-primary-900') || '#134e4a',
        },
        background: getVar('--color-background') || (mode === 'dark' ? '#222224' : '#f8fafc'),
        surface: getVar('--color-surface') || (mode === 'dark' ? '#2a2a2c' : '#f1f5f9'),
        text: getVar('--color-text-primary') || (mode === 'dark' ? '#f5f5f7' : '#0f172a'),
        success: getVar('--color-success-500') || '#10b981',
        warning: getVar('--color-warning-500') || '#f59e0b',
        error: getVar('--color-error-500') || '#ef4444',
        info: getVar('--color-info-500') || '#3b82f6',
      },
    };
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Cache theme to localStorage for offline startup
   */
  private cacheTheme(storeId: string, theme: ThemeConfig): void {
    try {
      const cache: ThemeCache = {
        lastStoreId: storeId,
        lastTheme: theme,
        timestamp: Date.now(),
      };

      localStorage.setItem(this.cacheKey, JSON.stringify(cache));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to cache theme:', error);
      }
    }
  }

  /**
   * Validate theme changes against store locks
   *
   * @throws Error if theme locks prevent the change
   */
  private async validateThemeLocks(partialTheme: Partial<ThemeConfig>): Promise<void> {
    if (!this.currentStoreId) return;

    // Load store theme to check locks
    const storeTheme = await this.configStore.getTheme(this.currentStoreId);
    const storeConfig = storeTheme as unknown as StoreThemeConfig;
    const locks = storeConfig.locks || {};

    // Check mode lock
    if (partialTheme.mode && locks.lockMode) {
      throw new Error('Theme mode is locked by store policy');
    }

    // Check accent lock
    if (partialTheme.colors?.accent && locks.lockAccent) {
      throw new Error('Accent color is locked by store policy');
    }

    // Note: lockContrast is not implemented yet (future enhancement)
  }

  /**
   * Resolve 'auto' mode to actual light/dark based on system preference
   */
  private resolveAutoMode(): 'light' | 'dark' {
    if (typeof window === 'undefined') return 'light';

    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }
}

// ============================================================================
// Theme Boot Sequence (Pre-React)
// ============================================================================

/**
 * Boot theme before React renders to prevent theme flash
 *
 * This function should be called in index.html or early boot script
 * before React mounts
 *
 * Usage in index.html:
 * ```html
 * <script>
 *   (function() {
 *     const cached = localStorage.getItem('EasySale_theme_cache');
 *     if (cached) {
 *       const { lastTheme } = JSON.parse(cached);
 *       document.documentElement.dataset.theme = lastTheme.mode;
 *       // Apply CSS variables...
 *     } else {
 *       document.documentElement.dataset.theme = 'light';
 *     }
 *   })();
 * </script>
 * ```
 */
export function bootTheme(options: ThemeBootOptions = {}): void {
  const { cacheKey = 'EasySale_theme_cache_v2', defaultTheme = DEFAULT_THEME } = options;

  try {
    const root = document.documentElement;
    
    // First, check for simple accent color cache (set by setup wizard branding step)
    // This takes priority as it's the most recent user selection
    const cachedAccent500 = localStorage.getItem('theme_accent_500');
    const cachedAccent600 = localStorage.getItem('theme_accent_600');
    
    if (cachedAccent500 && cachedAccent600) {
      // Apply cached accent colors immediately to prevent flickering
      applyAccentColors(root, cachedAccent500, cachedAccent600);
      root.dataset.theme = 'dark'; // Default to dark mode for setup wizard
      
      if (import.meta.env.DEV) {
        console.log('Applied cached accent colors:', cachedAccent500);
      }
      return;
    }
    
    // Try to load full cached theme
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      const parsed: ThemeCache = JSON.parse(cached);
      const theme = parsed.lastTheme;

      // Apply cached theme
      root.dataset.theme = theme.mode === 'auto' ? resolveAutoMode() : theme.mode;

      // Apply CSS variables
      const variables = themeToCSSVariables(theme);
      Object.entries(variables).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });

      if (import.meta.env.DEV) {
        console.log('Applied cached theme:', theme.mode);
      }
    } else {
      // No cache - apply default theme
      root.dataset.theme = defaultTheme.mode === 'auto' ? resolveAutoMode() : defaultTheme.mode;

      const variables = themeToCSSVariables(defaultTheme);
      Object.entries(variables).forEach(([key, value]) => {
        root.style.setProperty(key, value);
      });

      if (import.meta.env.DEV) {
        console.log('Applied default theme:', defaultTheme.mode);
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to boot theme:', error);
    }

    // Last resort: apply hardcoded default (light mode)
    document.documentElement.dataset.theme = 'light';
  }
}

/**
 * Apply accent colors to CSS variables
 * 
 * Generates a full color scale from the accent500 color and applies
 * to both accent and primary CSS variables for consistent theming.
 */
function applyAccentColors(root: HTMLElement, accent500: string, accent600: string): void {
  // Generate full color scale from accent500
  const scale = generateColorScale(accent500, accent600);
  
  // Apply to both accent and primary (primary uses accent in this system)
  ['accent', 'primary'].forEach(prefix => {
    Object.entries(scale).forEach(([shade, color]) => {
      root.style.setProperty(`--color-${prefix}-${shade}`, color);
    });
  });
  
  // Also set action colors for buttons
  root.style.setProperty('--color-action-primary-bg', accent500);
  root.style.setProperty('--color-action-primary-hover', accent600);
  root.style.setProperty('--color-action-primary-fg', '#ffffff');
}

/**
 * Generate a full color scale from accent500 and accent600
 */
function generateColorScale(accent500: string, accent600: string): Record<string, string> {
  return {
    '50': adjustBrightness(accent500, 90),
    '100': adjustBrightness(accent500, 75),
    '200': adjustBrightness(accent500, 55),
    '300': adjustBrightness(accent500, 35),
    '400': adjustBrightness(accent500, 15),
    '500': accent500,
    '600': accent600,
    '700': adjustBrightness(accent600, -15),
    '800': adjustBrightness(accent600, -30),
    '900': adjustBrightness(accent600, -45),
    '950': adjustBrightness(accent600, -60),
  };
}

/**
 * Adjust color brightness by a percentage
 */
function adjustBrightness(color: string, percent: number): string {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  const adjust = (value: number) => {
    const adjusted = value + (value * percent) / 100;
    return Math.max(0, Math.min(255, Math.round(adjusted)));
  };

  const toHex = (value: number) => value.toString(16).padStart(2, '0');

  return `#${toHex(adjust(r))}${toHex(adjust(g))}${toHex(adjust(b))}`;
}

/**
 * Resolve 'auto' mode to actual light/dark based on system preference
 * (Standalone version for boot sequence)
 */
function resolveAutoMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}
// Note: ThemeCache and ThemeBootOptions are exported at their interface definitions above
