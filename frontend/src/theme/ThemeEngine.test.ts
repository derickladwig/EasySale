/**
 * ThemeEngine Tests
 *
 * Tests for the ThemeEngine class and theme boot sequence
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ThemeEngine, bootTheme, DEFAULT_THEME, type ThemeCache } from './ThemeEngine';
import type { IConfigStore, ThemePreferences, StoreThemeConfig } from '../config/ConfigStore';
import type { ThemeConfig } from '../config/types';

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

  // Test helpers
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
// Test Data
// ============================================================================

const lightTheme: ThemeConfig = {
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

const darkTheme: ThemeConfig = {
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

const storeTheme: StoreThemeConfig = {
  mode: 'light',
  colors: {
    primary: { 500: '#10b981', 600: '#059669' },
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  locks: {
    lockMode: true,
    lockAccent: false,
  },
};

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
  vi.restoreAllMocks();
});

// ============================================================================
// ThemeEngine Tests
// ============================================================================

describe('ThemeEngine', () => {
  describe('constructor', () => {
    it('should create instance with default cache key', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      expect(engine).toBeInstanceOf(ThemeEngine);
    });

    it('should create instance with custom cache key', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store, 'custom_cache_key');

      expect(engine).toBeInstanceOf(ThemeEngine);
    });
  });

  describe('initialize', () => {
    it('should load and apply theme from ConfigStore', async () => {
      const store = new MockConfigStore();
      store.setMockTheme('store-1', darkTheme);

      const engine = new ThemeEngine(store);
      await engine.initialize('store-1');

      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should load and apply theme with user ID', async () => {
      const store = new MockConfigStore();
      store.setMockTheme('store-1', lightTheme);
      store.setMockTheme('store-1', darkTheme, 'user-1');

      const engine = new ThemeEngine(store);
      await engine.initialize('store-1', 'user-1');

      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should cache theme after initialization', async () => {
      const store = new MockConfigStore();
      store.setMockTheme('store-1', darkTheme);

      const engine = new ThemeEngine(store);
      await engine.initialize('store-1');

      const cached = localStorage.getItem('EasySale_theme_cache_v2');
      expect(cached).toBeTruthy();

      const parsed: ThemeCache = JSON.parse(cached!);
      expect(parsed.lastStoreId).toBe('store-1');
      expect(parsed.lastTheme.mode).toBe('dark');
    });

    it('should fall back to cached theme on error', async () => {
      const store = new MockConfigStore();

      // Pre-populate cache
      const cache: ThemeCache = {
        lastStoreId: 'store-1',
        lastTheme: darkTheme,
        timestamp: Date.now(),
      };
      localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify(cache));

      // Mock getTheme to throw error
      vi.spyOn(store, 'getTheme').mockRejectedValue(new Error('Network error'));

      const engine = new ThemeEngine(store);
      await engine.initialize('store-1');

      // Should use cached theme
      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should fall back to default theme when no cache exists', async () => {
      const store = new MockConfigStore();

      // Mock getTheme to throw error
      vi.spyOn(store, 'getTheme').mockRejectedValue(new Error('Network error'));

      const engine = new ThemeEngine(store);
      await engine.initialize('store-1');

      // Should use default theme
      expect(document.documentElement.dataset.theme).toBe('light');
    });
  });

  describe('applyTheme', () => {
    it('should set data-theme attribute for light mode', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      engine.applyTheme(lightTheme);

      expect(document.documentElement.dataset.theme).toBe('light');
    });

    it('should set data-theme attribute for dark mode', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      engine.applyTheme(darkTheme);

      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should resolve auto mode to light or dark', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const autoTheme: ThemeConfig = { ...lightTheme, mode: 'auto' };
      engine.applyTheme(autoTheme);

      const mode = document.documentElement.dataset.theme;
      // Mode should be resolved to either 'light' or 'dark', not 'auto'
      expect(mode).toMatch(/^(light|dark)$/);
    });

    it('should apply CSS variables from theme', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      engine.applyTheme(lightTheme);

      // Check that CSS variables are set
      const root = document.documentElement;
      const bgColor = root.style.getPropertyValue('--color-background');
      expect(bgColor).toBeTruthy();
    });
  });

  describe('resolveTheme', () => {
    it('should use default theme when no overrides exist', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const preferences: ThemePreferences = {
        default: DEFAULT_THEME,
      };

      const resolved = engine.resolveTheme(preferences);

      expect(resolved.mode).toBe(DEFAULT_THEME.mode);
    });

    it('should apply store theme over default', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const preferences: ThemePreferences = {
        store: { mode: 'dark' },
        default: DEFAULT_THEME,
      };

      const resolved = engine.resolveTheme(preferences);

      expect(resolved.mode).toBe('dark');
    });

    it('should apply user theme over store when not locked', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const preferences: ThemePreferences = {
        store: { mode: 'light', locks: { lockMode: false } },
        user: { mode: 'dark' },
        default: DEFAULT_THEME,
      };

      const resolved = engine.resolveTheme(preferences);

      expect(resolved.mode).toBe('dark');
    });

    it('should respect mode lock from store', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const preferences: ThemePreferences = {
        store: { mode: 'light', locks: { lockMode: true } },
        user: { mode: 'dark' },
        default: DEFAULT_THEME,
      };

      const resolved = engine.resolveTheme(preferences);

      // User preference should be ignored due to lock
      expect(resolved.mode).toBe('light');
    });

    it('should respect accent lock from store', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const storeAccent = { 500: '#10b981', 600: '#059669' };
      const userAccent = { 500: '#ef4444', 600: '#dc2626' };

      const preferences: ThemePreferences = {
        store: {
          colors: { ...DEFAULT_THEME.colors, accent: storeAccent },
          locks: { lockAccent: true },
        },
        user: {
          colors: { ...DEFAULT_THEME.colors, accent: userAccent },
        },
        default: DEFAULT_THEME,
      };

      const resolved = engine.resolveTheme(preferences);

      // User accent should be ignored due to lock
      expect(resolved.colors.accent).toEqual(storeAccent);
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
          colors: {
            ...DEFAULT_THEME.colors,
            accent: { 500: '#ef4444', 600: '#dc2626' },
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
  });

  describe('saveThemePreference', () => {
    it('should save store theme preference', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await engine.initialize('store-1');
      await engine.saveThemePreference('store', { mode: 'dark' });

      const saved = await store.getTheme('store-1');
      expect(saved.mode).toBe('dark');
    });

    it('should save user theme preference', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await engine.initialize('store-1', 'user-1');
      await engine.saveThemePreference('user', { mode: 'dark' });

      const saved = await store.getTheme('store-1', 'user-1');
      expect(saved.mode).toBe('dark');
    });

    it('should throw error when saving user preference without user ID', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await engine.initialize('store-1'); // No user ID

      await expect(
        engine.saveThemePreference('user', { mode: 'dark' })
      ).rejects.toThrow('Cannot save user theme preference: missing user ID');
    });

    it('should throw error when not initialized', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await expect(
        engine.saveThemePreference('store', { mode: 'dark' })
      ).rejects.toThrow('ThemeEngine not initialized: missing store ID');
    });

    it('should apply updated theme after saving', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await engine.initialize('store-1');
      await engine.saveThemePreference('store', { mode: 'dark' });

      expect(document.documentElement.dataset.theme).toBe('dark');
    });

    it('should update cache after saving', async () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      await engine.initialize('store-1');
      await engine.saveThemePreference('store', { mode: 'dark' });

      const cached = localStorage.getItem('EasySale_theme_cache_v2');
      expect(cached).toBeTruthy();

      const parsed: ThemeCache = JSON.parse(cached!);
      expect(parsed.lastTheme.mode).toBe('dark');
    });
  });

  describe('loadCachedTheme', () => {
    it('should load cached theme from localStorage', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const cache: ThemeCache = {
        lastStoreId: 'store-1',
        lastTheme: darkTheme,
        timestamp: Date.now(),
      };
      localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify(cache));

      const loaded = engine.loadCachedTheme();

      expect(loaded).toEqual(darkTheme);
    });

    it('should return null when no cache exists', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const loaded = engine.loadCachedTheme();

      expect(loaded).toBeNull();
    });

    it('should return null when cache is invalid', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      localStorage.setItem('EasySale_theme_cache_v2', 'invalid json');

      const loaded = engine.loadCachedTheme();

      expect(loaded).toBeNull();
    });

    it('should return null when cache structure is invalid', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify({ invalid: 'structure' }));

      const loaded = engine.loadCachedTheme();

      expect(loaded).toBeNull();
    });
  });

  describe('getCurrentTheme', () => {
    it('should return current theme from DOM', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      engine.applyTheme(darkTheme);

      const current = engine.getCurrentTheme();

      expect(current).toBeTruthy();
      expect(current?.mode).toBe('dark');
    });

    it('should return null when no theme is applied', () => {
      const store = new MockConfigStore();
      const engine = new ThemeEngine(store);

      const current = engine.getCurrentTheme();

      expect(current).toBeNull();
    });
  });
});

// ============================================================================
// Theme Boot Sequence Tests
// ============================================================================

describe('bootTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = '';
    document.documentElement.style.cssText = '';
  });

  it('should apply cached theme when available', () => {
    const cache: ThemeCache = {
      lastStoreId: 'store-1',
      lastTheme: darkTheme,
      timestamp: Date.now(),
    };
    localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify(cache));

    bootTheme();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('should apply default theme when no cache exists', () => {
    bootTheme();

    // DEFAULT_THEME has mode: 'light'
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('should apply custom default theme', () => {
    const customDefault: ThemeConfig = { ...DEFAULT_THEME, mode: 'dark' };

    bootTheme({ defaultTheme: customDefault });

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('should use custom cache key', () => {
    const cache: ThemeCache = {
      lastStoreId: 'store-1',
      lastTheme: darkTheme,
      timestamp: Date.now(),
    };
    localStorage.setItem('custom_cache_key', JSON.stringify(cache));

    bootTheme({ cacheKey: 'custom_cache_key' });

    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('should handle invalid cache gracefully', () => {
    localStorage.setItem('EasySale_theme_cache_v2', 'invalid json');

    bootTheme();

    // Should fall back to default (light mode)
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('should resolve auto mode to light or dark', () => {
    const autoTheme: ThemeConfig = { ...DEFAULT_THEME, mode: 'auto' };
    const cache: ThemeCache = {
      lastStoreId: 'store-1',
      lastTheme: autoTheme,
      timestamp: Date.now(),
    };
    localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify(cache));

    bootTheme();

    const mode = document.documentElement.dataset.theme;
    expect(['light', 'dark']).toContain(mode);
  });

  it('should apply CSS variables from cached theme', () => {
    const cache: ThemeCache = {
      lastStoreId: 'store-1',
      lastTheme: darkTheme,
      timestamp: Date.now(),
    };
    localStorage.setItem('EasySale_theme_cache_v2', JSON.stringify(cache));

    bootTheme();

    // Check that CSS variables are set
    const root = document.documentElement;
    const bgColor = root.style.getPropertyValue('--color-background');
    expect(bgColor).toBeTruthy();
  });
});
