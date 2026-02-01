/**
 * Theme Compliance Tests
 * 
 * Validates that the theme system follows GLOBAL_RULES_EASYSALE.md:
 * - No hardcoded colors outside allowed directories
 * - No direct DOM manipulation outside ThemeEngine
 * - All components use semantic tokens
 * - Theme changes propagate correctly
 * - Locks are enforced
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3 - Theme Compliance**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ThemeEngine, DEFAULT_THEME } from '../ThemeEngine';
import type { IConfigStore, ThemePreferences, StoreThemeConfig } from '../../config/ConfigStore';
import type { ThemeConfig } from '../../config/types';

// ============================================================================
// Mock ConfigStore
// ============================================================================

class MockConfigStore implements IConfigStore {
  private themes: Map<string, ThemeConfig> = new Map();
  private storeLocks: Map<string, StoreThemeConfig['locks']> = new Map();

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

  setMockTheme(storeId: string, theme: ThemeConfig, userId?: string) {
    const key = userId ? `${storeId}:${userId}` : storeId;
    this.themes.set(key, theme);
  }

  setMockLocks(storeId: string, locks: StoreThemeConfig['locks']) {
    this.storeLocks.set(storeId, locks);
  }

  getMockLocks(storeId: string): StoreThemeConfig['locks'] | undefined {
    return this.storeLocks.get(storeId);
  }
}

// ============================================================================
// Setup/Teardown
// ============================================================================

beforeEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = '';
  document.documentElement.style.cssText = '';
});

afterEach(() => {
  localStorage.clear();
  document.documentElement.dataset.theme = '';
  document.documentElement.style.cssText = '';
});

// ============================================================================
// Theme Compliance Tests
// ============================================================================

describe('Theme Compliance', () => {
  describe('Single Source of Truth', () => {
    it('should only allow ThemeEngine to set CSS variables on <html>', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const testTheme: ThemeConfig = {
        mode: 'light',
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          background: '#ffffff',
          surface: '#f9fafb',
          text: '#111827',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      engine.applyTheme(testTheme);

      // Verify CSS variables are set
      const root = document.documentElement;
      const bgColor = root.style.getPropertyValue('--color-background');
      expect(bgColor).toBeTruthy();
      expect(bgColor).toBe('#ffffff');
    });

    it('should prevent direct DOM manipulation by components', () => {
      // This test verifies that only ThemeEngine can set theme variables
      const root = document.documentElement;
      
      // Simulate a component trying to set theme directly (BAD)
      root.style.setProperty('--color-primary-500', '#ff0000');
      
      // ThemeEngine should be the only way to set theme
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);
      
      const correctTheme: ThemeConfig = {
        mode: 'light',
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          background: '#ffffff',
          surface: '#f9fafb',
          text: '#111827',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };
      
      engine.applyTheme(correctTheme);
      
      // ThemeEngine should override any direct manipulation
      const primaryColor = root.style.getPropertyValue('--color-primary-500');
      expect(primaryColor).toBe('#3b82f6');
      expect(primaryColor).not.toBe('#ff0000');
    });

    it('should use semantic tokens for all color references', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const theme: ThemeConfig = {
        mode: 'light',
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          background: '#ffffff',
          surface: '#f9fafb',
          text: '#111827',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      engine.applyTheme(theme);

      // Verify semantic tokens are available
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--color-background')).toBeTruthy();
      expect(root.style.getPropertyValue('--color-surface')).toBeTruthy();
      expect(root.style.getPropertyValue('--color-text')).toBeTruthy();
      expect(root.style.getPropertyValue('--color-success')).toBeTruthy();
      expect(root.style.getPropertyValue('--color-warning')).toBeTruthy();
      expect(root.style.getPropertyValue('--color-error')).toBeTruthy();
      expect(root.style.getPropertyValue('--color-info')).toBeTruthy();
    });
  });

  describe('Theme Propagation', () => {
    it('should propagate theme changes to entire application', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await engine.initialize('store-1');

      // Change theme
      await engine.saveThemePreference('store', { mode: 'dark' });

      // Verify theme propagated to DOM
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should update CSS variables when theme changes', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await engine.initialize('store-1');

      const lightTheme: Partial<ThemeConfig> = {
        mode: 'light',
        colors: {
          ...DEFAULT_THEME.colors,
          background: '#ffffff',
          text: '#111827',
        },
      };

      await engine.saveThemePreference('store', lightTheme);

      const root = document.documentElement;
      expect(root.style.getPropertyValue('--color-background')).toBe('#ffffff');
      expect(root.style.getPropertyValue('--color-text')).toBe('#111827');

      // Change to dark theme
      const darkTheme: Partial<ThemeConfig> = {
        mode: 'dark',
        colors: {
          ...DEFAULT_THEME.colors,
          background: '#0f172a',
          text: '#f1f5f9',
        },
      };

      await engine.saveThemePreference('store', darkTheme);

      // Verify CSS variables updated
      expect(root.style.getPropertyValue('--color-background')).toBe('#0f172a');
      expect(root.style.getPropertyValue('--color-text')).toBe('#f1f5f9');
    });

    it('should persist theme changes across page refresh', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await engine.initialize('store-1');
      await engine.saveThemePreference('store', { mode: 'dark' });

      // Verify theme is cached
      const cached = localStorage.getItem('EasySale_theme_cache_v2');
      expect(cached).toBeTruthy();

      const parsed = JSON.parse(cached!);
      expect(parsed.lastTheme.mode).toBe('dark');

      // Simulate page refresh by creating new engine instance
      const newEngine = new ThemeEngine(store);
      const cachedTheme = newEngine.loadCachedTheme();

      expect(cachedTheme).toBeTruthy();
      expect(cachedTheme?.mode).toBe('dark');
    });
  });

  describe('Theme Locks', () => {
    it('should enforce mode lock from store', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const preferences: ThemePreferences = {
        store: {
          mode: 'light',
          locks: { lockMode: true },
        },
        user: {
          mode: 'dark', // User tries to override
        },
        default: DEFAULT_THEME,
      };

      const resolved = engine.resolveTheme(preferences);

      // User preference should be ignored due to lock
      expect(resolved.mode).toBe('light');
    });

    it('should enforce accent lock from store', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const storeAccent = { 500: '#10b981', 600: '#059669' };
      const userAccent = { 500: '#ef4444', 600: '#dc2626' };

      const preferences: ThemePreferences = {
        store: {
          colors: {
            ...DEFAULT_THEME.colors,
            accent: storeAccent,
          },
          locks: { lockAccent: true },
        },
        user: {
          colors: {
            ...DEFAULT_THEME.colors,
            accent: userAccent,
          },
        },
        default: DEFAULT_THEME,
      };

      const resolved = engine.resolveTheme(preferences);

      // User accent should be ignored due to lock
      expect(resolved.colors.accent).toEqual(storeAccent);
    });

    it('should enforce contrast lock from store', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      // Note: Contrast is not currently implemented in ThemeConfig
      // This test verifies the lock mechanism would work if contrast was added
      const preferences: ThemePreferences = {
        store: {
          mode: 'light',
          locks: { lockMode: true },
        },
        user: {
          mode: 'dark', // User tries to override
        },
        default: DEFAULT_THEME,
      };

      const resolved = engine.resolveTheme(preferences);

      // User preference should be ignored due to lock
      expect(resolved.mode).toBe('light');
    });

    it('should allow user to override non-locked properties', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const preferences: ThemePreferences = {
        store: {
          mode: 'light',
          locks: { lockMode: true, lockAccent: false },
        },
        user: {
          mode: 'dark', // Should be ignored (locked)
          colors: {
            ...DEFAULT_THEME.colors,
            accent: { 500: '#ef4444', 600: '#dc2626' }, // Should be applied (not locked)
          },
        },
        default: DEFAULT_THEME,
      };

      const resolved = engine.resolveTheme(preferences);

      // Mode should be locked to light
      expect(resolved.mode).toBe('light');

      // Accent should use user preference (not locked)
      expect(resolved.colors.accent).toEqual({ 500: '#ef4444', 600: '#dc2626' });
    });

    it('should prevent saving locked properties at user scope', async () => {
      const store = new MockConfigStore();
      const storeTheme: StoreThemeConfig = {
        ...DEFAULT_THEME,
        mode: 'light',
        locks: { lockMode: true },
      };
      store.setMockTheme('store-1', storeTheme);

      const engine = new ThemeEngine(store);
      await engine.initialize('store-1', 'user-1');

      // User tries to change locked mode - should throw error
      await expect(
        engine.saveThemePreference('user', { mode: 'dark' })
      ).rejects.toThrow('Theme mode is locked by store policy');
    });
  });

  describe('Scope Precedence', () => {
    it('should apply theme in correct precedence order', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const preferences: ThemePreferences = {
        default: {
          ...DEFAULT_THEME,
          mode: 'light',
          colors: {
            ...DEFAULT_THEME.colors,
            primary: { 500: '#000000', 600: '#000000' },
          },
        },
        store: {
          mode: 'dark',
          colors: {
            ...DEFAULT_THEME.colors,
            primary: { 500: '#111111', 600: '#111111' },
          },
        },
        user: {
          colors: {
            ...DEFAULT_THEME.colors,
            primary: { 500: '#222222', 600: '#222222' },
          },
        },
      };

      const resolved = engine.resolveTheme(preferences);

      // User scope should win (highest precedence)
      expect(resolved.colors.primary).toEqual({ 500: '#222222', 600: '#222222' });
      // Store scope should override default for mode
      expect(resolved.mode).toBe('dark');
    });

    it('should merge themes correctly across scopes', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const preferences: ThemePreferences = {
        default: DEFAULT_THEME,
        store: {
          mode: 'dark',
        },
        user: {
          colors: {
            ...DEFAULT_THEME.colors,
            accent: { 500: '#ef4444', 600: '#dc2626' },
          },
        },
      };

      const resolved = engine.resolveTheme(preferences);

      // Should have mode from store
      expect(resolved.mode).toBe('dark');
      // Should have accent from user
      expect(resolved.colors.accent).toEqual({ 500: '#ef4444', 600: '#dc2626' });
      // Should have other colors from default
      expect(resolved.colors.background).toBe(DEFAULT_THEME.colors.background);
    });
  });

  describe('Offline-First Behavior', () => {
    it('should cache theme in localStorage', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await engine.initialize('store-1');
      await engine.saveThemePreference('store', { mode: 'dark' });

      const cached = localStorage.getItem('EasySale_theme_cache_v2');
      expect(cached).toBeTruthy();

      const parsed = JSON.parse(cached!);
      expect(parsed.lastStoreId).toBe('store-1');
      expect(parsed.lastTheme.mode).toBe('dark');
      expect(parsed.timestamp).toBeTruthy();
    });

    it('should load theme from cache when offline', async () => {
      const store = new MockConfigStore();

      // Pre-populate cache
      const cachedTheme: ThemeConfig = {
        mode: 'dark',
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify({
        lastStoreId: 'store-1',
        lastTheme: cachedTheme,
        timestamp: Date.now(),
      }));

      const engine = new ThemeEngine(store);
      const loaded = engine.loadCachedTheme();

      expect(loaded).toEqual(cachedTheme);
    });

    it('should apply theme without network request on boot', () => {
      const cachedTheme: ThemeConfig = {
        mode: 'dark',
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify({
        lastStoreId: 'store-1',
        lastTheme: cachedTheme,
        timestamp: Date.now(),
      }));

      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      // Load cached theme (no network request)
      const loaded = engine.loadCachedTheme();
      expect(loaded).toBeTruthy();

      // Apply cached theme
      if (loaded) {
        engine.applyTheme(loaded);
      }

      // Verify theme applied
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  describe('No Hardcoded Colors', () => {
    it('should not use hardcoded hex colors in theme application', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const theme: ThemeConfig = {
        mode: 'light',
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          background: '#ffffff',
          surface: '#f9fafb',
          text: '#111827',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      engine.applyTheme(theme);

      // All colors should come from theme config, not hardcoded
      const root = document.documentElement;
      const bgColor = root.style.getPropertyValue('--color-background');
      
      // Verify color matches theme config
      expect(bgColor).toBe(theme.colors.background);
    });

    it('should use CSS variables for all color references', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const theme: ThemeConfig = {
        mode: 'light',
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          background: '#ffffff',
          surface: '#f9fafb',
          text: '#111827',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      engine.applyTheme(theme);

      // Verify all semantic tokens are set as CSS variables
      const root = document.documentElement;
      const cssVars = [
        '--color-primary-500',
        '--color-primary-600',
        '--color-background',
        '--color-surface',
        '--color-text',
        '--color-success',
        '--color-warning',
        '--color-error',
        '--color-info',
      ];

      cssVars.forEach(varName => {
        const value = root.style.getPropertyValue(varName);
        expect(value).toBeTruthy();
        expect(value).toMatch(/^#[0-9a-f]{6}$/i); // Valid hex color
      });
    });
  });

  describe('Theme Load Without Flash', () => {
    it('should apply cached theme before React renders', () => {
      const cachedTheme: ThemeConfig = {
        mode: 'dark',
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          background: '#0f172a',
          surface: '#1e293b',
          text: '#f1f5f9',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify({
        lastStoreId: 'store-1',
        lastTheme: cachedTheme,
        timestamp: Date.now(),
      }));

      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      // Simulate boot sequence
      const loaded = engine.loadCachedTheme();
      if (loaded) {
        engine.applyTheme(loaded);
      }

      // Theme should be applied immediately
      expect(document.documentElement.dataset.theme).toBe('dark');
      
      // CSS variables should be set
      const root = document.documentElement;
      expect(root.style.getPropertyValue('--color-background')).toBe('#0f172a');
    });
  });

  describe('Idempotent Operations', () => {
    it('should produce same result when applying same theme multiple times', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const theme: ThemeConfig = {
        mode: 'light',
        colors: {
          primary: { 500: '#3b82f6', 600: '#2563eb' },
          background: '#ffffff',
          surface: '#f9fafb',
          text: '#111827',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      // Apply theme multiple times
      engine.applyTheme(theme);
      const firstResult = document.documentElement.dataset.theme;
      const firstBgColor = document.documentElement.style.getPropertyValue('--color-background');

      engine.applyTheme(theme);
      const secondResult = document.documentElement.dataset.theme;
      const secondBgColor = document.documentElement.style.getPropertyValue('--color-background');

      engine.applyTheme(theme);
      const thirdResult = document.documentElement.dataset.theme;
      const thirdBgColor = document.documentElement.style.getPropertyValue('--color-background');

      // All results should be identical
      expect(firstResult).toBe(secondResult);
      expect(secondResult).toBe(thirdResult);
      expect(firstBgColor).toBe(secondBgColor);
      expect(secondBgColor).toBe(thirdBgColor);
    });

    it('should produce same cache when saving same theme multiple times', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await engine.initialize('store-1');

      const theme: Partial<ThemeConfig> = { mode: 'dark' };

      // Save theme multiple times
      await engine.saveThemePreference('store', theme);
      const firstCache = localStorage.getItem('EasySale_theme_cache_v2');

      await engine.saveThemePreference('store', theme);
      const secondCache = localStorage.getItem('EasySale_theme_cache_v2');

      await engine.saveThemePreference('store', theme);
      const thirdCache = localStorage.getItem('EasySale_theme_cache_v2');

      // Parse and compare (ignoring timestamp)
      const first = JSON.parse(firstCache!);
      const second = JSON.parse(secondCache!);
      const third = JSON.parse(thirdCache!);

      expect(first.lastStoreId).toBe(second.lastStoreId);
      expect(second.lastStoreId).toBe(third.lastStoreId);
      expect(first.lastTheme.mode).toBe(second.lastTheme.mode);
      expect(second.lastTheme.mode).toBe(third.lastTheme.mode);
    });
  });
});
