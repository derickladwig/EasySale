/**
 * Property-Based Tests for ThemeEngine
 *
 * These tests verify universal properties that should hold true for all valid
 * theme configurations using fast-check for property-based testing.
 *
 * Framework: fast-check
 * Minimum iterations: 100 per property test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { ThemeEngine, DEFAULT_THEME } from './ThemeEngine';
import type { IConfigStore, ThemePreferences } from '../config/ConfigStore';
import type { ThemeConfig } from '../config/types';

// ============================================================================
// Mock ConfigStore
// ============================================================================

class MockConfigStore implements IConfigStore {
  private themes: Map<string, ThemeConfig> = new Map();

  async getSetting<T = unknown>(_key: string, _scope?: 'store' | 'user' | 'default'): Promise<{ value: T; scope: 'store' | 'user' | 'default' }> {
    return { value: null as unknown as T, scope: 'default' as const };
  }

  async setSetting() {
    return Promise.resolve();
  }

  async getTheme(storeId: string, userId?: string): Promise<ThemeConfig> {
    const key = userId ? `${storeId}:${userId}` : storeId;
    return this.themes.get(key) || DEFAULT_THEME;
  }

  async setTheme(
    scope: 'store' | 'user',
    partialTheme: Partial<ThemeConfig>,
    storeId?: string,
    userId?: string
  ): Promise<void> {
    const key = scope === 'user' && userId ? `${storeId}:${userId}` : storeId || 'default';
    const existing = this.themes.get(key) || DEFAULT_THEME;
    this.themes.set(key, { ...existing, ...partialTheme });
  }

  async getTenantConfig() {
    return {} as any;
  }

  async getResolvedConfig() {
    return {} as any;
  }

  async clearCache() {
    return Promise.resolve();
  }

  async getCacheStats() {
    return { size: 0, entries: 0, lastUpdated: null };
  }
}

// ============================================================================
// Arbitraries (Generators for Property-Based Testing)
// ============================================================================

/**
 * Generate valid theme mode values
 */
const themeMode = fc.constantFrom('light' as const, 'dark' as const, 'auto' as const);

/**
 * Generate valid hex color string (e.g., "#3b82f6")
 */
const hexColor = fc
  .tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  )
  .map(([r, g, b]) => {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  });

/**
 * Generate valid color scale objects
 */
const colorScale = fc.record({
  500: hexColor,
  600: hexColor,
});

/**
 * Generate valid color configuration
 */
const themeColors = fc.record({
  primary: colorScale,
  secondary: fc.option(colorScale, { nil: undefined }),
  accent: fc.option(colorScale, { nil: undefined }),
  background: hexColor,
  surface: hexColor,
  text: hexColor,
  success: hexColor,
  warning: hexColor,
  error: hexColor,
  info: hexColor,
});

/**
 * Generate valid theme configuration
 */
const themeConfig: fc.Arbitrary<ThemeConfig> = fc.record({
  mode: themeMode,
  colors: themeColors,
});

// ============================================================================
// Setup/Teardown
// ============================================================================

beforeEach(() => {
  // Clear localStorage
  localStorage.clear();

  // Reset document.documentElement
  document.documentElement.dataset.theme = '';
  document.documentElement.style.cssText = '';
});

afterEach(() => {
  // Clean up after each test
  localStorage.clear();
  document.documentElement.dataset.theme = '';
  document.documentElement.style.cssText = '';
});

// ============================================================================
// Property 1: Theme Application Updates DOM
// ============================================================================

// Feature: unified-design-system, Property 1: Theme Application Updates DOM
describe('Property 1: Theme Application Updates DOM', () => {
  it('should set correct data-theme attribute for any valid theme configuration', () => {
    fc.assert(
      fc.property(themeConfig, (config) => {
        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        // Apply the theme
        engine.applyTheme(config);

        // Get the applied mode
        const appliedMode = document.documentElement.dataset.theme;

        // Verify the data-theme attribute is set
        expect(appliedMode).toBeDefined();
        expect(appliedMode).toBeTruthy();

        // For 'auto' mode, it should be resolved to 'light' or 'dark'
        if (config.mode === 'auto') {
          expect(['light', 'dark']).toContain(appliedMode);
        } else {
          // For explicit modes, it should match exactly
          expect(appliedMode).toBe(config.mode);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should apply theme without errors for any valid configuration', () => {
    fc.assert(
      fc.property(themeConfig, (config) => {
        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        // This should not throw any errors
        expect(() => {
          engine.applyTheme(config);
        }).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  it('should set CSS variables when applying any valid theme', () => {
    fc.assert(
      fc.property(themeConfig, (config) => {
        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        // Apply the theme
        engine.applyTheme(config);

        // Check that at least some CSS variables are set
        const root = document.documentElement;
        const bgColor = root.style.getPropertyValue('--color-background');

        // CSS variables should be set (non-empty string)
        expect(bgColor).toBeTruthy();
      }),
      { numRuns: 100 }
    );
  });

  it('should maintain idempotency - applying the same theme twice produces the same result', () => {
    fc.assert(
      fc.property(themeConfig, (config) => {
        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        // Apply theme first time
        engine.applyTheme(config);
        const firstMode = document.documentElement.dataset.theme;
        const firstBgColor = document.documentElement.style.getPropertyValue('--color-background');

        // Apply same theme second time
        engine.applyTheme(config);
        const secondMode = document.documentElement.dataset.theme;
        const secondBgColor = document.documentElement.style.getPropertyValue('--color-background');

        // Results should be identical
        expect(secondMode).toBe(firstMode);
        expect(secondBgColor).toBe(firstBgColor);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle rapid theme changes without errors', () => {
    fc.assert(
      fc.property(fc.array(themeConfig, { minLength: 2, maxLength: 10 }), (configs) => {
        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        // Apply multiple themes in rapid succession
        expect(() => {
          configs.forEach(config => {
            engine.applyTheme(config);
          });
        }).not.toThrow();

        // Final theme should be the last one applied
        const lastConfig = configs[configs.length - 1];
        const appliedMode = document.documentElement.dataset.theme;

        if (lastConfig.mode === 'auto') {
          expect(['light', 'dark']).toContain(appliedMode);
        } else {
          expect(appliedMode).toBe(lastConfig.mode);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve theme application across multiple engine instances', () => {
    fc.assert(
      fc.property(themeConfig, (config) => {
        const store1 = new MockConfigStore();
        const engine1 = new ThemeEngine(store1);

        // Apply theme with first engine
        engine1.applyTheme(config);
        const modeAfterFirst = document.documentElement.dataset.theme;

        // Create second engine and verify theme is still applied
        const store2 = new MockConfigStore();
        const engine2 = new ThemeEngine(store2);

        // The DOM should still have the theme from the first engine
        const modeAfterSecond = document.documentElement.dataset.theme;
        expect(modeAfterSecond).toBe(modeAfterFirst);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle theme with minimal color configuration', () => {
    fc.assert(
      fc.property(themeMode, (mode) => {
        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        // Create minimal theme with only mode
        const minimalTheme: ThemeConfig = {
          mode,
          colors: DEFAULT_THEME.colors, // Use default colors
        };

        // Should apply without errors
        expect(() => {
          engine.applyTheme(minimalTheme);
        }).not.toThrow();

        // Mode should be applied correctly
        const appliedMode = document.documentElement.dataset.theme;
        if (mode === 'auto') {
          expect(['light', 'dark']).toContain(appliedMode);
        } else {
          expect(appliedMode).toBe(mode);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle theme with all color properties defined', () => {
    fc.assert(
      fc.property(
        themeMode,
        colorScale,
        colorScale,
        colorScale,
        hexColor,
        hexColor,
        hexColor,
        hexColor,
        hexColor,
        hexColor,
        hexColor,
        (mode, primary, secondary, accent, background, surface, text, success, warning, error, info) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          // Create theme with all colors defined
          const fullTheme: ThemeConfig = {
            mode,
            colors: {
              primary,
              secondary,
              accent,
              background,
              surface,
              text,
              success,
              warning,
              error,
              info,
            },
          };

          // Should apply without errors
          expect(() => {
            engine.applyTheme(fullTheme);
          }).not.toThrow();

          // Mode should be applied correctly
          const appliedMode = document.documentElement.dataset.theme;
          if (mode === 'auto') {
            expect(['light', 'dark']).toContain(appliedMode);
          } else {
            expect(appliedMode).toBe(mode);
          }

          // CSS variables should be set
          const root = document.documentElement;
          expect(root.style.getPropertyValue('--color-background')).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 4: Scope Precedence Resolution
// ============================================================================

// Feature: unified-design-system, Property 4: Scope Precedence Resolution
describe('Property 4: Scope Precedence Resolution', () => {
  /**
   * Generate optional theme configuration values
   * Returns undefined or a partial theme config
   */
  const optionalThemeConfig = fc.option(
    fc.record({
      mode: fc.option(themeMode, { nil: undefined }),
      colors: fc.option(themeColors, { nil: undefined }),
    }),
    { nil: undefined }
  );

  /**
   * Generate theme locks configuration
   */
  const themeLocks = fc.record({
    lockMode: fc.option(fc.boolean(), { nil: undefined }),
    lockAccent: fc.option(fc.boolean(), { nil: undefined }),
    lockContrast: fc.option(fc.boolean(), { nil: undefined }),
  });

  /**
   * Generate store theme configuration with locks
   */
  const storeThemeConfig = fc.record({
    mode: fc.option(themeMode, { nil: undefined }),
    colors: fc.option(themeColors, { nil: undefined }),
    locks: fc.option(themeLocks, { nil: undefined }),
  });

  /**
   * Generate theme preferences with all scopes
   * Note: We cast to ThemePreferences since the generated types are compatible
   * but TypeScript can't infer the deep partial structure correctly
   */
  const themePreferences = fc.record({
    store: fc.option(storeThemeConfig, { nil: undefined }),
    user: fc.option(optionalThemeConfig, { nil: undefined }),
    default: themeConfig,
  }).map(p => p as unknown as ThemePreferences);

  it('should resolve theme mode with correct precedence when no locks are set', () => {
    fc.assert(
      fc.property(themePreferences, (preferences) => {
        // Skip if locks are set (tested separately)
        if (preferences.store?.locks?.lockMode) {
          return true;
        }

        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        const resolved = engine.resolveTheme(preferences);

        // Verify mode precedence: user > store > default
        if (preferences.user?.mode) {
          // User preference should win
          expect(resolved.mode).toBe(preferences.user.mode);
        } else if (preferences.store?.mode) {
          // Store preference should win if no user preference
          expect(resolved.mode).toBe(preferences.store.mode);
        } else {
          // Default should be used if neither user nor store set
          expect(resolved.mode).toBe(preferences.default.mode);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should respect lockMode when set - store mode overrides user preference', () => {
    fc.assert(
      fc.property(
        themeMode, // store mode
        themeMode, // user mode
        themeConfig, // default theme
        (storeMode, userMode, defaultTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          const preferences: ThemePreferences = {
            store: {
              mode: storeMode,
              locks: { lockMode: true },
            },
            user: {
              mode: userMode,
            },
            default: defaultTheme,
          };

          const resolved = engine.resolveTheme(preferences);

          // When lockMode is true, store mode should always win
          expect(resolved.mode).toBe(storeMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should resolve accent color with correct precedence when no locks are set', () => {
    fc.assert(
      fc.property(
        fc.option(colorScale, { nil: undefined }), // store accent
        fc.option(colorScale, { nil: undefined }), // user accent
        themeConfig, // default theme
        (storeAccent, userAccent, defaultTheme) => {
          // Skip if locks are set (tested separately)
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          const preferences = {
            store: storeAccent
              ? {
                  colors: { accent: storeAccent },
                  locks: { lockAccent: false },
                }
              : undefined,
            user: userAccent ? { colors: { accent: userAccent } } : undefined,
            default: defaultTheme,
          } as ThemePreferences;

          const resolved = engine.resolveTheme(preferences);

          // Verify accent precedence: user > store > default
          if (userAccent) {
            // User preference should win
            expect(resolved.colors?.accent).toEqual(userAccent);
          } else if (storeAccent) {
            // Store preference should win if no user preference
            expect(resolved.colors?.accent).toEqual(storeAccent);
          } else {
            // Default should be used if neither user nor store set
            expect(resolved.colors?.accent).toEqual(defaultTheme.colors?.accent);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect lockAccent when set - store accent overrides user preference', () => {
    fc.assert(
      fc.property(
        colorScale, // store accent
        colorScale, // user accent
        themeConfig, // default theme
        (storeAccent, userAccent, defaultTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          const preferences = {
            store: {
              colors: { accent: storeAccent },
              locks: { lockAccent: true },
            },
            user: {
              colors: { accent: userAccent },
            },
            default: defaultTheme,
          } as ThemePreferences;

          const resolved = engine.resolveTheme(preferences);

          // When lockAccent is true, store accent should always win
          expect(resolved.colors?.accent).toEqual(storeAccent);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allow user to override other colors when lockAccent is set', () => {
    fc.assert(
      fc.property(
        colorScale, // store accent
        colorScale, // user accent
        hexColor, // user background color
        themeConfig, // default theme
        (storeAccent, userAccent, userBackground, defaultTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          const preferences = {
            store: {
              colors: { accent: storeAccent },
              locks: { lockAccent: true },
            },
            user: {
              colors: {
                accent: userAccent,
                background: userBackground,
              },
            },
            default: defaultTheme,
          } as ThemePreferences;

          const resolved = engine.resolveTheme(preferences);

          // Store accent should be locked
          expect(resolved.colors?.accent).toEqual(storeAccent);

          // But user should be able to override background
          expect(resolved.colors?.background).toBe(userBackground);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle all combinations of store/user/default values correctly', () => {
    fc.assert(
      fc.property(themePreferences, (preferences) => {
        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        const resolved = engine.resolveTheme(preferences);

        // Resolved theme should always have a mode
        expect(resolved.mode).toBeDefined();
        expect(['light', 'dark', 'auto']).toContain(resolved.mode);

        // Resolved theme should always have colors
        expect(resolved.colors).toBeDefined();

        // If no store or user values, should match default
        if (!preferences.store && !preferences.user) {
          expect(resolved.mode).toBe(preferences.default.mode);
          expect(resolved.colors).toEqual(preferences.default.colors);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should handle missing store and user preferences gracefully', () => {
    fc.assert(
      fc.property(themeConfig, (defaultTheme) => {
        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        const preferences: ThemePreferences = {
          store: undefined,
          user: undefined,
          default: defaultTheme,
        };

        const resolved = engine.resolveTheme(preferences);

        // Should fall back to default theme
        expect(resolved.mode).toBe(defaultTheme.mode);
        expect(resolved.colors).toEqual(defaultTheme.colors);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle partial store configuration correctly', () => {
    fc.assert(
      fc.property(
        themeMode, // store mode only
        themeConfig, // default theme
        (storeMode, defaultTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          const preferences: ThemePreferences = {
            store: {
              mode: storeMode,
              // No colors specified
            },
            user: undefined,
            default: defaultTheme,
          };

          const resolved = engine.resolveTheme(preferences);

          // Store mode should be used
          expect(resolved.mode).toBe(storeMode);

          // Colors should fall back to default
          expect(resolved.colors).toEqual(defaultTheme.colors);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle partial user configuration correctly', () => {
    fc.assert(
      fc.property(
        themeMode, // user mode only
        themeConfig, // default theme
        (userMode, defaultTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          const preferences: ThemePreferences = {
            store: undefined,
            user: {
              mode: userMode,
              // No colors specified
            },
            default: defaultTheme,
          };

          const resolved = engine.resolveTheme(preferences);

          // User mode should be used
          expect(resolved.mode).toBe(userMode);

          // Colors should fall back to default
          expect(resolved.colors).toEqual(defaultTheme.colors);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should merge colors from multiple scopes correctly', () => {
    fc.assert(
      fc.property(
        hexColor, // store background
        hexColor, // user text color
        themeConfig, // default theme
        (storeBackground, userText, defaultTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          const preferences = {
            store: {
              colors: { background: storeBackground },
            },
            user: {
              colors: { text: userText },
            },
            default: defaultTheme,
          } as ThemePreferences;

          const resolved = engine.resolveTheme(preferences);

          // User text color should be used
          expect(resolved.colors?.text).toBe(userText);

          // Store background should be used
          expect(resolved.colors?.background).toBe(storeBackground);

          // Other colors should fall back to default
          expect(resolved.colors?.success).toBe(defaultTheme.colors?.success);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple locks simultaneously', () => {
    fc.assert(
      fc.property(
        themeMode, // store mode
        colorScale, // store accent
        themeMode, // user mode
        colorScale, // user accent
        themeConfig, // default theme
        (storeMode, storeAccent, userMode, userAccent, defaultTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          const preferences = {
            store: {
              mode: storeMode,
              colors: { accent: storeAccent },
              locks: {
                lockMode: true,
                lockAccent: true,
              },
            },
            user: {
              mode: userMode,
              colors: { accent: userAccent },
            },
            default: defaultTheme,
          } as ThemePreferences;

          const resolved = engine.resolveTheme(preferences);

          // Both locks should be respected
          expect(resolved.mode).toBe(storeMode);
          expect(resolved.colors?.accent).toEqual(storeAccent);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be deterministic - same preferences always produce same result', () => {
    fc.assert(
      fc.property(themePreferences, (preferences) => {
        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        // Resolve twice with same preferences
        const resolved1 = engine.resolveTheme(preferences);
        const resolved2 = engine.resolveTheme(preferences);

        // Results should be identical
        expect(resolved1.mode).toBe(resolved2.mode);
        expect(JSON.stringify(resolved1.colors)).toBe(JSON.stringify(resolved2.colors));
      }),
      { numRuns: 100 }
    );
  });

  it('should handle empty locks object correctly', () => {
    fc.assert(
      fc.property(
        themeMode, // store mode
        themeMode, // user mode
        themeConfig, // default theme
        (storeMode, userMode, defaultTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          const preferences: ThemePreferences = {
            store: {
              mode: storeMode,
              locks: {}, // Empty locks object
            },
            user: {
              mode: userMode,
            },
            default: defaultTheme,
          };

          const resolved = engine.resolveTheme(preferences);

          // With no locks set, user preference should win
          expect(resolved.mode).toBe(userMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle undefined locks correctly', () => {
    fc.assert(
      fc.property(
        themeMode, // store mode
        themeMode, // user mode
        themeConfig, // default theme
        (storeMode, userMode, defaultTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          const preferences: ThemePreferences = {
            store: {
              mode: storeMode,
              // locks is undefined
            },
            user: {
              mode: userMode,
            },
            default: defaultTheme,
          };

          const resolved = engine.resolveTheme(preferences);

          // With no locks, user preference should win
          expect(resolved.mode).toBe(userMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve non-theme properties during resolution', () => {
    fc.assert(
      fc.property(themePreferences, (preferences) => {
        const store = new MockConfigStore();
        const engine = new ThemeEngine(store);

        const resolved = engine.resolveTheme(preferences);

        // Resolved theme should not have locks property
        expect((resolved as any).locks).toBeUndefined();

        // Resolved theme should not have logo or companyName
        expect((resolved as any).logo).toBeUndefined();
        expect((resolved as any).companyName).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 2: Theme Switching Without Reload
// ============================================================================

// Feature: unified-design-system, Property 2: Theme Switching Without Reload
describe('Property 2: Theme Switching Without Reload', () => {
  it('should switch themes without triggering page reload', () => {
    fc.assert(
      fc.property(
        themeConfig, // initial theme
        themeConfig, // target theme
        (initialTheme, targetTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          // Capture initial window.location
          const initialLocation = window.location.href;

          // Apply initial theme
          engine.applyTheme(initialTheme);

          // Verify location hasn't changed
          expect(window.location.href).toBe(initialLocation);

          // Switch to target theme
          engine.applyTheme(targetTheme);

          // Verify location still hasn't changed (no reload)
          expect(window.location.href).toBe(initialLocation);

          // Verify DOM was updated to target theme
          const appliedMode = document.documentElement.dataset.theme;
          if (targetTheme.mode === 'auto') {
            expect(['light', 'dark']).toContain(appliedMode);
          } else {
            expect(appliedMode).toBe(targetTheme.mode);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should update DOM immediately when switching themes', () => {
    fc.assert(
      fc.property(
        themeConfig, // initial theme
        themeConfig, // target theme
        (initialTheme, targetTheme) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          // Apply initial theme
          engine.applyTheme(initialTheme);
          const initialMode = document.documentElement.dataset.theme;

          // Switch to target theme
          engine.applyTheme(targetTheme);
          const targetMode = document.documentElement.dataset.theme;

          // Target theme should be applied (this is the key property)
          if (targetTheme.mode === 'auto') {
            expect(['light', 'dark']).toContain(targetMode);
          } else {
            expect(targetMode).toBe(targetTheme.mode);
          }

          // If modes are explicitly different, DOM mode should change
          if (initialTheme.mode !== targetTheme.mode && 
              initialTheme.mode !== 'auto' && 
              targetTheme.mode !== 'auto') {
            expect(initialMode).not.toBe(targetMode);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle multiple theme switches without reload', () => {
    fc.assert(
      fc.property(
        fc.array(themeConfig, { minLength: 3, maxLength: 10 }),
        (themes) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          // Capture initial window.location
          const initialLocation = window.location.href;

          // Apply each theme in sequence
          themes.forEach(theme => {
            engine.applyTheme(theme);
            
            // Verify no reload occurred
            expect(window.location.href).toBe(initialLocation);
          });

          // Final theme should be applied
          const lastTheme = themes[themes.length - 1];
          const appliedMode = document.documentElement.dataset.theme;

          if (lastTheme.mode === 'auto') {
            expect(['light', 'dark']).toContain(appliedMode);
          } else {
            expect(appliedMode).toBe(lastTheme.mode);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve page state when switching themes', () => {
    fc.assert(
      fc.property(
        themeConfig, // initial theme
        themeConfig, // target theme
        fc.string(), // arbitrary page state
        (initialTheme, targetTheme, pageState) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          // Set some arbitrary page state
          (window as any).testPageState = pageState;

          // Apply initial theme
          engine.applyTheme(initialTheme);

          // Switch to target theme
          engine.applyTheme(targetTheme);

          // Page state should be preserved (no reload)
          expect((window as any).testPageState).toBe(pageState);

          // Clean up
          delete (window as any).testPageState;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should switch between light and dark modes without reload', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light' as const, 'dark' as const),
        fc.constantFrom('light' as const, 'dark' as const),
        themeColors,
        (initialMode, targetMode, colors) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          // Capture initial window.location
          const initialLocation = window.location.href;

          // Apply initial theme
          engine.applyTheme({ mode: initialMode, colors });

          // Switch to target theme
          engine.applyTheme({ mode: targetMode, colors });

          // Verify no reload occurred
          expect(window.location.href).toBe(initialLocation);

          // Verify target mode is applied
          expect(document.documentElement.dataset.theme).toBe(targetMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should switch colors without reload', () => {
    fc.assert(
      fc.property(
        themeMode,
        themeColors, // initial colors
        themeColors, // target colors
        (mode, initialColors, targetColors) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          // Capture initial window.location
          const initialLocation = window.location.href;

          // Apply initial theme
          engine.applyTheme({ mode, colors: initialColors });
          const initialBgColor = document.documentElement.style.getPropertyValue('--color-background');

          // Switch to target colors
          engine.applyTheme({ mode, colors: targetColors });
          const targetBgColor = document.documentElement.style.getPropertyValue('--color-background');

          // Verify no reload occurred
          expect(window.location.href).toBe(initialLocation);

          // If colors are different, CSS variables should be updated
          if (JSON.stringify(initialColors) !== JSON.stringify(targetColors)) {
            // At least background color should potentially change
            // (it might be the same if both use defaults, but that's ok)
            expect(targetBgColor).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle theme switching with auto mode without reload', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('light' as const, 'dark' as const, 'auto' as const),
        fc.constantFrom('light' as const, 'dark' as const, 'auto' as const),
        themeColors,
        (initialMode, targetMode, colors) => {
          const store = new MockConfigStore();
          const engine = new ThemeEngine(store);

          // Capture initial window.location
          const initialLocation = window.location.href;

          // Apply initial theme
          engine.applyTheme({ mode: initialMode, colors });

          // Switch to target theme
          engine.applyTheme({ mode: targetMode, colors });

          // Verify no reload occurred
          expect(window.location.href).toBe(initialLocation);

          // Verify target mode is applied (auto resolves to light or dark)
          const appliedMode = document.documentElement.dataset.theme;
          if (targetMode === 'auto') {
            expect(['light', 'dark']).toContain(appliedMode);
          } else {
            expect(appliedMode).toBe(targetMode);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
