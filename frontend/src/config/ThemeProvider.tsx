/**
 * ThemeProvider - React integration layer for ThemeEngine
 *
 * Responsibilities:
 * - Provide theme context to React components
 * - Expose setTheme() function for user preferences
 * - Delegate all DOM manipulation to ThemeEngine
 * - Track theme state for React components
 *
 * Architecture:
 * - ThemeEngine handles all DOM manipulation (data attributes, CSS variables)
 * - ThemeProvider only manages React state and context
 * - setTheme() calls ConfigStore, which triggers ThemeEngine update
 *
 * Critical Rule: React NEVER manipulates DOM directly - only ThemeEngine does
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ThemeEngine } from '../theme/ThemeEngine';
import { createConfigStore, IConfigStore } from './ConfigStore';
import type { ThemeConfig } from './types';

// ============================================================================
// Context Types
// ============================================================================

interface ThemeContextValue {
  /**
   * Current theme configuration
   */
  theme: ThemeConfig | null;

  /**
   * Current theme mode (resolved from 'auto' if needed)
   */
  mode: 'light' | 'dark';

  /**
   * Whether theme is currently loading
   */
  loading: boolean;

  /**
   * Error during theme initialization (if any)
   */
  error: Error | null;

  /**
   * Set theme preference at user scope
   *
   * @param partialTheme - Partial theme configuration to merge
   * @throws Error if theme locks prevent the change
   */
  setTheme: (partialTheme: Partial<ThemeConfig>) => Promise<void>;

  /**
   * Refresh theme from ConfigStore
   *
   * Useful after store changes or when coming back online
   */
  refreshTheme: () => Promise<void>;
}

// ============================================================================
// Context
// ============================================================================

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ============================================================================
// Provider Props
// ============================================================================

interface ThemeProviderProps {
  children: ReactNode;

  /**
   * Store ID for store-level theme
   * Required for theme initialization
   */
  storeId?: string;

  /**
   * User ID for user-level theme
   * Optional - if not provided, only store theme is applied
   */
  userId?: string;

  /**
   * ConfigStore instance
   * Optional - defaults to cached API adapter
   */
  configStore?: IConfigStore;

  /**
   * ThemeEngine instance
   * Optional - defaults to new ThemeEngine with provided configStore
   */
  themeEngine?: ThemeEngine;
}

// ============================================================================
// Provider Component
// ============================================================================

export function ThemeProvider({
  children,
  storeId,
  userId,
  configStore: providedConfigStore,
  themeEngine: providedThemeEngine,
}: ThemeProviderProps) {
  // Initialize ConfigStore and ThemeEngine
  const [configStore] = useState<IConfigStore>(
    () => providedConfigStore || createConfigStore('cached')
  );

  const [themeEngine] = useState<ThemeEngine>(
    () => providedThemeEngine || new ThemeEngine(configStore)
  );

  // Theme state
  const [theme, setThemeState] = useState<ThemeConfig | null>(null);
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Initialize theme
  const initializeTheme = useCallback(async () => {
    // First check for simple accent color cache (set by setup wizard branding step)
    const cachedAccent500 = localStorage.getItem('theme_accent_500');
    const cachedAccent600 = localStorage.getItem('theme_accent_600');
    
    if (cachedAccent500 && cachedAccent600) {
      // Apply cached accent colors - bootTheme already did this, but ensure state is synced
      setMode('dark'); // Setup wizard uses dark mode
      setLoading(false);
      return;
    }
    
    if (!storeId) {
      // No store ID - use cached theme or default
      const cached = themeEngine.loadCachedTheme();
      if (cached) {
        themeEngine.applyTheme(cached);
        setThemeState(cached);
        setMode(cached.mode === 'auto' ? resolveAutoMode() : cached.mode);
      }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Initialize ThemeEngine with store and user context
      await themeEngine.initialize(storeId, userId);

      // Get current theme from ThemeEngine
      const currentTheme = themeEngine.getCurrentTheme();
      if (currentTheme) {
        setThemeState(currentTheme);
        setMode(currentTheme.mode === 'auto' ? resolveAutoMode() : currentTheme.mode);
      }
    } catch (err) {
      console.error('Failed to initialize theme:', err);
      
      // Fall back to cached theme (don't set error state if we have a fallback)
      const cached = themeEngine.loadCachedTheme();
      if (cached) {
        setThemeState(cached);
        setMode(cached.mode === 'auto' ? resolveAutoMode() : cached.mode);
      } else {
        // Only set error if we have no fallback
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  }, [storeId, userId, themeEngine]);

  // Initialize on mount and when storeId/userId changes
  useEffect(() => {
    initializeTheme();
  }, [initializeTheme]);

  // Listen for system color scheme changes (for 'auto' mode)
  useEffect(() => {
    if (!theme || theme.mode !== 'auto') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      const newMode = e.matches ? 'dark' : 'light';
      setMode(newMode);

      // Reapply theme to update DOM
      if (theme) {
        themeEngine.applyTheme(theme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, themeEngine]);

  // Set theme preference (user scope)
  const setTheme = useCallback(
    async (partialTheme: Partial<ThemeConfig>) => {
      if (!storeId) {
        throw new Error('Cannot set theme: missing store ID');
      }

      try {
        // Save theme preference via ThemeEngine
        // ThemeEngine will validate locks and update ConfigStore
        await themeEngine.saveThemePreference('user', partialTheme);

        // Get updated theme
        const updatedTheme = themeEngine.getCurrentTheme();
        if (updatedTheme) {
          setThemeState(updatedTheme);
          setMode(updatedTheme.mode === 'auto' ? resolveAutoMode() : updatedTheme.mode);
        }
      } catch (err) {
        console.error('Failed to set theme:', err);
        throw err;
      }
    },
    [storeId, themeEngine]
  );

  // Refresh theme from ConfigStore
  const refreshTheme = useCallback(async () => {
    await initializeTheme();
  }, [initializeTheme]);

  const value: ThemeContextValue = {
    theme,
    mode,
    loading,
    error,
    setTheme,
    refreshTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access theme context
 *
 * Provides current theme state and setTheme function
 *
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve 'auto' mode to actual light/dark based on system preference
 */
function resolveAutoMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
}

// ============================================================================
// Exports
// ============================================================================

export { ThemeContext };
export type { ThemeContextValue, ThemeProviderProps };
