/**
 * ThemeEngine Unit Tests
 *
 * Tests for theme application, resolution, and persistence
 * Validates compliance with GLOBAL_RULES_EASYSALE.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeEngine, DEFAULT_THEME, bootTheme } from '../ThemeEngine';
import type { IConfigStore, ThemePreferences, StoreThemeConfig } from '../../config/ConfigStore';
import type { ThemeConfig } from '../../config/types';

// ============================================================================
// Mock ConfigStore
// ============================================================================

class MockConfigStore implements IConfigStore {
  private themes: Map<string, ThemeConfig> = new Map();
  private storeLocks: Map<string, StoreThemeConfig> = new Map();

  async getSetting<T = unknown>(_key: string, _scope?: 'store' | 'user' | 'default'): Promise<{ value: T; scope: 'store' | 'user' | 'default' }> {
    return { value: null as unknown as T, scope: 'default' as const };
  }

  async setSetting() {
    // No-op
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
    if (!storeId) throw new Error('Store ID required');

    const key = scope === 'user' && userId ? `${storeId}:${userId}` : storeId;
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
    this.themes.clear();
  }

  async getCacheStats() {
    return { size: 0, entries: 0, lastUpdated: null };
  }

  // Test helpers
  setStoreLocks(storeId: string, locks: StoreThemeConfig) {
    this.storeLocks.set(storeId, locks);
  }

  getStoreLocks(storeId: string): StoreThemeConfig | undefined {
    return this.storeLocks.get(storeId);
  }
}

// ============================================================================
// Test Setup
// ============================================================================

describe('ThemeEngine', () => {
  let mockConfigStore: MockConfigStore;
  let themeEngine: ThemeEngine;

  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();

    // Clear document theme
    document.documentElement.dataset.theme = '';
    document.documentElement.removeAttribute('style');

    // Create fresh instances
    mockConfigStore = new MockConfigStore();
    themeEngine = new ThemeEngine(mockConfigStore);
  });

  // ==========================================================================
  // Theme Application Tests
  // ==========================================================================

  describe('applyTheme', () => {
    it('should set theme mode as data attribute', () => {
      const theme: ThemeConfig = {
        ...DEFAULT_THEME,
        mode: 'dark',
      };

      themeEngine.applyTheme(theme);

      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should resolve auto mode to light or dark', () => {
      const theme: ThemeConfig = {
        ...DEFAULT_THEME,
        mode: 'auto',
      };

      themeEngine.applyTheme(theme);

      // Should be either 'light' or 'dark', not 'auto'
      expect(['light', 'dark']).toContain(document.documentElement.dataset.theme);
    });

    it('should apply CSS variables for colors', () => {
      const theme: ThemeConfig = {
        mode: 'dark',
        colors: {
          primary: {
            500: '#14b8a6',
            600: '#0d9488',
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

      themeEngine.applyTheme(theme);

      const root = document.documentElement;
      const primaryColor = getComputedStyle(root).getPropertyValue('--color-primary-500');

      // CSS variables should be set (may have whitespace)
      expect(primaryColor.trim()).toBeTruthy();
    });
  });

  // ==========================================================================
  // Theme Resolution Tests
  // ==========================================================================

  describe('resolveTheme', () => {
    it('should use default theme when no overrides', () => {
      const preferences: ThemePreferences = {
        default: DEFAULT_THEME,
      };

      const resolved = themeEngine.resolveTheme(preferences);

      expect(resolved).toEqual(DEFAULT_THEME);
    });

    it('should apply store theme over default', () => {
      const storeTheme: Partial<ThemeConfig> = {
        mode: 'dark',
        colors: {
          ...DEFAULT_THEME.colors,
          primary: { 500: '#ff0000', 600: '#cc0000' },
        },
      };

      const preferences: ThemePreferences = {
        default: DEFAULT_THEME,
        store: storeTheme,
      };

      const resolved = themeEngine.resolveTheme(preferences);

      expect(resolved.mode).toBe('dark');
      expect(resolved.colors?.primary).toEqual({ 500: '#ff0000', 600: '#cc0000' });
    });

    it('should apply user theme over store theme', () => {
      const storeTheme: Partial<ThemeConfig> = {
        mode: 'dark',
      };

      const userTheme: Partial<ThemeConfig> = {
        mode: 'light',
      };

      const preferences: ThemePreferences = {
        default: DEFAULT_THEME,
        store: storeTheme,
        user: userTheme,
      };

      const resolved = themeEngine.resolveTheme(preferences);

      expect(resolved.mode).toBe('light');
    });

    it('should respect mode lock from store', () => {
      const storeTheme: Partial<StoreThemeConfig> = {
        mode: 'dark',
        locks: {
          lockMode: true,
        },
      };

      const userTheme: Partial<ThemeConfig> = {
        mode: 'light', // User tries to override
      };

      const preferences: ThemePreferences = {
        default: DEFAULT_THEME,
        store: storeTheme,
        user: userTheme,
      };

      const resolved = themeEngine.resolveTheme(preferences);

      // Mode should remain dark (locked by store)
      expect(resolved.mode).toBe('dark');
    });

    it('should respect accent lock from store', () => {
      const storeTheme: Partial<StoreThemeConfig> = {
        colors: {
          ...DEFAULT_THEME.colors,
          accent: { 500: '#14b8a6', 600: '#0d9488' },
        },
        locks: {
          lockAccent: true,
        },
      };

      const userTheme: Partial<ThemeConfig> = {
        colors: {
          ...DEFAULT_THEME.colors,
          accent: { 500: '#ff0000', 600: '#cc0000' }, // User tries to override
        },
      };

      const preferences: ThemePreferences = {
        default: DEFAULT_THEME,
        store: storeTheme,
        user: userTheme,
      };

      const resolved = themeEngine.resolveTheme(preferences);

      // Accent should remain teal (locked by store)
      expect(resolved.colors?.accent).toEqual({ 500: '#14b8a6', 600: '#0d9488' });
    });

    it('should allow user to override non-locked properties', () => {
      const storeTheme: Partial<StoreThemeConfig> = {
        mode: 'dark',
        locks: {
          lockMode: true,
        },
      };

      const userTheme: Partial<ThemeConfig> = {
        mode: 'light', // Locked, won't apply
        colors: {
          ...DEFAULT_THEME.colors,
          accent: { 500: '#ff0000', 600: '#cc0000' }, // Not locked, will apply
        },
      };

      const preferences: ThemePreferences = {
        default: DEFAULT_THEME,
        store: storeTheme,
        user: userTheme,
      };

      const resolved = themeEngine.resolveTheme(preferences);

      expect(resolved.mode).toBe('dark'); // Locked
      expect(resolved.colors?.accent).toEqual({ 500: '#ff0000', 600: '#cc0000' }); // Not locked
    });
  });

  // ==========================================================================
  // Theme Persistence Tests
  // ==========================================================================

  describe('Theme Caching', () => {
    it('should cache theme to localStorage on initialize', async () => {
      await themeEngine.initialize('store-1');

      const cached = localStorage.getItem('EasySale_theme_cache_v2');
      expect(cached).toBeTruthy();

      if (cached) {
        const parsed = JSON.parse(cached);
        expect(parsed.lastStoreId).toBe('store-1');
        expect(parsed.lastTheme).toBeTruthy();
        expect(parsed.timestamp).toBeTypeOf('number');
      }
    });

    it('should load cached theme when available', () => {
      const cachedTheme: ThemeConfig = {
        mode: 'dark',
        colors: {
          primary: { 500: '#14b8a6', 600: '#0d9488' },
          background: '#222224',
          surface: '#2a2a2c',
          text: '#f5f5f7',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      localStorage.setItem(
        'EasySale_theme_cache_v2',
        JSON.stringify({
          lastStoreId: 'store-1',
          lastTheme: cachedTheme,
          timestamp: Date.now(),
        })
      );

      const loaded = themeEngine.loadCachedTheme();

      expect(loaded).toEqual(cachedTheme);
    });

    it('should return null for invalid cache', () => {
      localStorage.setItem('EasySale_theme_cache_v2', 'invalid json');

      const loaded = themeEngine.loadCachedTheme();

      expect(loaded).toBeNull();
    });

    it('should return null when no cache exists', () => {
      const loaded = themeEngine.loadCachedTheme();

      expect(loaded).toBeNull();
    });
  });

  // ==========================================================================
  // Theme Save Tests
  // ==========================================================================

  describe('saveThemePreference', () => {
    it('should save store theme preference', async () => {
      await themeEngine.initialize('store-1');

      const partialTheme: Partial<ThemeConfig> = {
        mode: 'dark',
      };

      await themeEngine.saveThemePreference('store', partialTheme);

      const saved = await mockConfigStore.getTheme('store-1');
      expect(saved.mode).toBe('dark');
    });

    it('should save user theme preference', async () => {
      await themeEngine.initialize('store-1', 'user-1');

      const partialTheme: Partial<ThemeConfig> = {
        mode: 'light',
      };

      await themeEngine.saveThemePreference('user', partialTheme);

      const saved = await mockConfigStore.getTheme('store-1', 'user-1');
      expect(saved.mode).toBe('light');
    });

    it('should throw error when saving user theme without user ID', async () => {
      await themeEngine.initialize('store-1'); // No user ID

      const partialTheme: Partial<ThemeConfig> = {
        mode: 'light',
      };

      await expect(
        themeEngine.saveThemePreference('user', partialTheme)
      ).rejects.toThrow('missing user ID');
    });

    it('should apply theme after saving', async () => {
      await themeEngine.initialize('store-1');

      const partialTheme: Partial<ThemeConfig> = {
        mode: 'dark',
      };

      await themeEngine.saveThemePreference('store', partialTheme);

      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should update cache after saving', async () => {
      await themeEngine.initialize('store-1');

      const partialTheme: Partial<ThemeConfig> = {
        mode: 'dark',
      };

      await themeEngine.saveThemePreference('store', partialTheme);

      const cached = localStorage.getItem('EasySale_theme_cache_v2');
      expect(cached).toBeTruthy();

      if (cached) {
        const parsed = JSON.parse(cached);
        expect(parsed.lastTheme.mode).toBe('dark');
      }
    });
  });

  // ==========================================================================
  // Boot Theme Tests
  // ==========================================================================

  describe('bootTheme', () => {
    it('should apply default theme when no cache', () => {
      bootTheme();

      expect(document.documentElement.dataset.theme).toBeTruthy();
    });

    it('should apply cached theme when available', () => {
      const cachedTheme: ThemeConfig = {
        mode: 'dark',
        colors: {
          primary: { 500: '#14b8a6', 600: '#0d9488' },
          background: '#222224',
          surface: '#2a2a2c',
          text: '#f5f5f7',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      localStorage.setItem(
        'EasySale_theme_cache_v2',
        JSON.stringify({
          lastStoreId: 'store-1',
          lastTheme: cachedTheme,
          timestamp: Date.now(),
        })
      );

      bootTheme();

      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should apply cached accent colors when available', () => {
      localStorage.setItem('theme_accent_500', '#ff0000');
      localStorage.setItem('theme_accent_600', '#cc0000');

      bootTheme();

      expect(document.documentElement.dataset.theme).toBe('dark');
      // Accent colors should be applied to CSS variables
      const root = document.documentElement;
      const accentColor = root.style.getPropertyValue('--color-accent-500');
      expect(accentColor).toBe('#ff0000');
    });

    it('should handle invalid cache gracefully', () => {
      localStorage.setItem('EasySale_theme_cache_v2', 'invalid json');

      expect(() => bootTheme()).not.toThrow();
      expect(document.documentElement.dataset.theme).toBeTruthy();
    });
  });

  // ==========================================================================
  // getCurrentTheme Tests
  // ==========================================================================

  describe('getCurrentTheme', () => {
    it('should return null when no theme applied', () => {
      const current = themeEngine.getCurrentTheme();
      expect(current).toBeNull();
    });

    it('should return current theme after applying', () => {
      const theme: ThemeConfig = {
        mode: 'dark',
        colors: {
          primary: { 500: '#14b8a6', 600: '#0d9488' },
          background: '#222224',
          surface: '#2a2a2c',
          text: '#f5f5f7',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6',
        },
      };

      themeEngine.applyTheme(theme);

      const current = themeEngine.getCurrentTheme();
      expect(current).toBeTruthy();
      expect(current?.mode).toBe('dark');
    });
  });
});
