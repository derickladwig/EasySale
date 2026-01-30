/**
 * Login Theme Provider
 *
 * THEMESYNC[FE-0005][module=auth][type=precedence-split]: Separate theme system for login
 * This is an intentional architectural decision for:
 * 1. Login page loads before main app (needs own theme)
 * 2. Different branding requirements per tenant
 * 3. Offline-first login theming
 *
 * Uses separate CSS variable namespace (--login-*) to avoid conflicts.
 * Source-of-truth for login: frontend/src/features/auth/theme/presets/
 * See: audit/THEME_CONFLICT_MAP.md#FE-0005
 *
 * Manages theme configuration loading, validation, and application for the login system.
 * Supports runtime preset switching, configuration caching, and fallback to default preset.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { validateLoginThemeConfigSafe } from './schema';
import type { LoginThemeConfig } from './types';
import tealGradientPreset from './presets/tealGradient.json';

// ============================================================================
// Context Types
// ============================================================================

interface LoginThemeContextValue {
  config: LoginThemeConfig;
  isLoading: boolean;
  error: Error | null;
  cssVariables: Record<string, string>;
  hasConfigUpdate: boolean;
  switchPreset: (presetName: string) => Promise<void>;
  reloadConfig: () => Promise<void>;
  checkForUpdates: () => Promise<boolean>;
}

// ============================================================================
// Context
// ============================================================================

const LoginThemeContext = createContext<LoginThemeContextValue | null>(null);

// ============================================================================
// Constants
// ============================================================================

const CACHE_KEY = 'EasySale_login_theme_v3'; // Updated to v3 for teal theme
const CACHE_TIMESTAMP_KEY = 'EasySale_login_theme_timestamp_v3';
const CACHE_VERSION_KEY = 'EasySale_login_theme_version_v3';
const DEFAULT_PRESET = tealGradientPreset as LoginThemeConfig;
const CONFIG_CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

// ============================================================================
// Provider Props
// ============================================================================

interface LoginThemeProviderProps {
  children: ReactNode;
  configPath?: string;
  tenantId?: string;
  storeId?: string;
  deviceId?: string;
  initialConfig?: LoginThemeConfig;
}

// ============================================================================
// Provider Component
// ============================================================================

export function LoginThemeProvider({
  children,
  configPath = '/api/login-theme',
  tenantId,
  storeId,
  deviceId,
  initialConfig,
}: LoginThemeProviderProps) {
  const [config, setConfig] = useState<LoginThemeConfig>(initialConfig || DEFAULT_PRESET);
  const [isLoading, setIsLoading] = useState(!initialConfig);
  const [error, setError] = useState<Error | null>(null);
  const [hasConfigUpdate, setHasConfigUpdate] = useState(false);

  // Generate CSS variables from theme config
  const cssVariables = useMemo(() => {
    const vars: Record<string, string> = {};
    const { tokens } = config;

    // Colors - Surface
    vars['--login-surface-primary'] = tokens.colors.surface.primary;
    vars['--login-surface-secondary'] = tokens.colors.surface.secondary;
    vars['--login-surface-tertiary'] = tokens.colors.surface.tertiary;

    // Colors - Text
    vars['--login-text-primary'] = tokens.colors.text.primary;
    vars['--login-text-secondary'] = tokens.colors.text.secondary;
    vars['--login-text-tertiary'] = tokens.colors.text.tertiary;
    vars['--login-text-inverse'] = tokens.colors.text.inverse;

    // Colors - Border
    vars['--login-border-default'] = tokens.colors.border.default;
    vars['--login-border-focus'] = tokens.colors.border.focus;
    vars['--login-border-error'] = tokens.colors.border.error;

    // Colors - Accent
    vars['--login-accent-primary'] = tokens.colors.accent.primary;
    vars['--login-accent-hover'] = tokens.colors.accent.hover;
    vars['--login-accent-active'] = tokens.colors.accent.active;

    // Colors - Status
    vars['--login-status-success'] = tokens.colors.status.success;
    vars['--login-status-warning'] = tokens.colors.status.warning;
    vars['--login-status-error'] = tokens.colors.status.error;
    vars['--login-status-info'] = tokens.colors.status.info;

    // Typography - Font Family
    vars['--login-font-primary'] = tokens.typography.fontFamily.primary;
    vars['--login-font-monospace'] = tokens.typography.fontFamily.monospace;

    // Typography - Font Size
    vars['--login-text-xs'] = tokens.typography.fontSize.xs;
    vars['--login-text-sm'] = tokens.typography.fontSize.sm;
    vars['--login-text-base'] = tokens.typography.fontSize.base;
    vars['--login-text-lg'] = tokens.typography.fontSize.lg;
    vars['--login-text-xl'] = tokens.typography.fontSize.xl;
    vars['--login-text-xxl'] = tokens.typography.fontSize.xxl;

    // Typography - Font Weight
    vars['--login-font-normal'] = tokens.typography.fontWeight.normal.toString();
    vars['--login-font-medium'] = tokens.typography.fontWeight.medium.toString();
    vars['--login-font-semibold'] = tokens.typography.fontWeight.semibold.toString();
    vars['--login-font-bold'] = tokens.typography.fontWeight.bold.toString();

    // Typography - Line Height
    vars['--login-leading-tight'] = tokens.typography.lineHeight.tight.toString();
    vars['--login-leading-normal'] = tokens.typography.lineHeight.normal.toString();
    vars['--login-leading-relaxed'] = tokens.typography.lineHeight.relaxed.toString();

    // Spacing
    vars['--login-space-xs'] = tokens.spacing.scale.xs;
    vars['--login-space-sm'] = tokens.spacing.scale.sm;
    vars['--login-space-md'] = tokens.spacing.scale.md;
    vars['--login-space-lg'] = tokens.spacing.scale.lg;
    vars['--login-space-xl'] = tokens.spacing.scale.xl;
    vars['--login-space-xxl'] = tokens.spacing.scale.xxl;

    // Shadows
    vars['--login-shadow-none'] = tokens.shadows.elevation.none;
    vars['--login-shadow-sm'] = tokens.shadows.elevation.sm;
    vars['--login-shadow-md'] = tokens.shadows.elevation.md;
    vars['--login-shadow-lg'] = tokens.shadows.elevation.lg;
    vars['--login-shadow-xl'] = tokens.shadows.elevation.xl;

    // Blur
    if (tokens.blur.enabled) {
      vars['--login-blur-none'] = tokens.blur.backdrop.none;
      vars['--login-blur-sm'] = tokens.blur.backdrop.sm;
      vars['--login-blur-md'] = tokens.blur.backdrop.md;
      vars['--login-blur-lg'] = tokens.blur.backdrop.lg;
    }

    // Radius
    vars['--login-radius-card'] = tokens.radius.card;
    vars['--login-radius-input'] = tokens.radius.input;
    vars['--login-radius-button'] = tokens.radius.button;
    vars['--login-radius-pill'] = tokens.radius.pill;

    return vars;
  }, [config]);

  // Apply CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;

    // Apply all CSS variables
    Object.entries(cssVariables).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Cleanup on unmount
    return () => {
      Object.keys(cssVariables).forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [cssVariables]);

  // Load configuration with precedence: device > store > tenant > default
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Try to load from cache first if all network requests will fail
    const tryLoadFromCache = () => {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const data = JSON.parse(cached);
          const result = validateLoginThemeConfigSafe(data);
          if (result.success) {
            setConfig(result.data);
            console.info('Loaded login theme from cache');
            return true;
          }
        }
      } catch (e) {
        console.warn('Failed to load cached theme:', e);
      }
      return false;
    };

    try {
      let loadedConfig: LoginThemeConfig | null = null;

      // Try device override first
      if (deviceId) {
        try {
          const response = await fetch(`${configPath}/device/${deviceId}`);
          if (response.ok) {
            const data = await response.json();
            const result = validateLoginThemeConfigSafe(data);
            if (result.success) {
              loadedConfig = result.data;
              console.info('Loaded device-specific login theme');
            }
          }
        } catch (e) {
          console.warn('Failed to load device-specific theme:', e);
        }
      }

      // Try store override if device config not found
      if (!loadedConfig && storeId) {
        try {
          const response = await fetch(`${configPath}/store/${storeId}`);
          if (response.ok) {
            const data = await response.json();
            const result = validateLoginThemeConfigSafe(data);
            if (result.success) {
              loadedConfig = result.data;
              console.info('Loaded store-specific login theme');
            }
          }
        } catch (e) {
          console.warn('Failed to load store-specific theme:', e);
        }
      }

      // Try tenant default if store config not found
      if (!loadedConfig && tenantId) {
        try {
          const response = await fetch(`${configPath}/tenant/${tenantId}`);
          if (response.ok) {
            const data = await response.json();
            const result = validateLoginThemeConfigSafe(data);
            if (result.success) {
              loadedConfig = result.data;
              console.info('Loaded tenant-specific login theme');
            }
          }
        } catch (e) {
          console.warn('Failed to load tenant-specific theme:', e);
        }
      }

      // If no config loaded from network, try cache before falling back to default
      if (!loadedConfig) {
        const loadedFromCache = tryLoadFromCache();
        if (loadedFromCache) {
          return;
        }
      }

      // Use loaded config or fall back to default
      const finalConfig = loadedConfig || DEFAULT_PRESET;
      setConfig(finalConfig);

      // Cache configuration for offline access
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(finalConfig));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        // Store a version identifier (could be a hash of the config or a version field)
        const version = (finalConfig as any).version || Date.now().toString();
        localStorage.setItem(CACHE_VERSION_KEY, version);
      } catch (e) {
        console.warn('Failed to cache login theme:', e);
      }
    } catch (err) {
      console.error('Error loading login theme:', err);
      setError(err instanceof Error ? err : new Error('Failed to load login theme'));

      // Try to load from cache on error
      const loadedFromCache = tryLoadFromCache();
      if (!loadedFromCache) {
        // Fall back to default preset
        setConfig(DEFAULT_PRESET);
        console.info('Using default login theme preset');
      }
    } finally {
      setIsLoading(false);
    }
  }, [configPath, tenantId, storeId, deviceId]);

  // Switch to a different preset
  const switchPreset = useCallback(
    async (presetName: string) => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`${configPath}/presets/${presetName}`);
        if (!response.ok) {
          throw new Error(`Failed to load preset: ${presetName}`);
        }

        const data = await response.json();
        const result = validateLoginThemeConfigSafe(data);

        if (!result.success) {
          throw new Error('Invalid preset configuration');
        }

        setConfig(result.data);

        // Cache the new preset
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
        } catch (e) {
          console.warn('Failed to cache preset:', e);
        }
      } catch (err) {
        console.error('Error switching preset:', err);
        setError(err instanceof Error ? err : new Error('Failed to switch preset'));
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [configPath]
  );

  // Check for remote configuration updates
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    try {
      // Get current cached version
      const cachedVersion = localStorage.getItem(CACHE_VERSION_KEY);
      const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);

      // Build URL based on precedence
      let checkUrl = `${configPath}/version`;
      if (deviceId) {
        checkUrl = `${configPath}/device/${deviceId}/version`;
      } else if (storeId) {
        checkUrl = `${configPath}/store/${storeId}/version`;
      } else if (tenantId) {
        checkUrl = `${configPath}/tenant/${tenantId}/version`;
      }

      const response = await fetch(checkUrl);
      if (!response.ok) {
        return false;
      }

      const { version, timestamp } = await response.json();

      // Check if version or timestamp has changed
      const hasUpdate = Boolean(
        (cachedVersion && version && version !== cachedVersion) ||
        (cachedTimestamp && timestamp && timestamp > parseInt(cachedTimestamp, 10))
      );

      if (hasUpdate) {
        setHasConfigUpdate(true);
        console.info('Configuration update available');
      }

      return hasUpdate;
    } catch (err) {
      console.warn('Failed to check for configuration updates:', err);
      return false;
    }
  }, [configPath, tenantId, storeId, deviceId]);

  // Load config on mount
  useEffect(() => {
    // Skip loading if initialConfig was provided (for testing)
    if (initialConfig) {
      return;
    }
    loadConfig();
  }, [loadConfig, initialConfig]);

  // Set up periodic update checking
  useEffect(() => {
    // Skip if initialConfig was provided (for testing)
    if (initialConfig) {
      return;
    }

    // Check immediately
    checkForUpdates();

    // Set up interval for periodic checks
    const intervalId = setInterval(() => {
      checkForUpdates();
    }, CONFIG_CHECK_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, [checkForUpdates, initialConfig]);

  const value: LoginThemeContextValue = {
    config,
    isLoading,
    error,
    cssVariables,
    hasConfigUpdate,
    switchPreset,
    reloadConfig: loadConfig,
    checkForUpdates,
  };

  return <LoginThemeContext.Provider value={value}>{children}</LoginThemeContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useLoginTheme(): LoginThemeContextValue {
  const context = useContext(LoginThemeContext);

  if (!context) {
    throw new Error('useLoginTheme must be used within a LoginThemeProvider');
  }

  return context;
}

// ============================================================================
// Exports
// ============================================================================

export { LoginThemeContext };
export type { LoginThemeContextValue, LoginThemeProviderProps };
