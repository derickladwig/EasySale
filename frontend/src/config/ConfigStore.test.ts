/**
 * ConfigStore Tests
 *
 * Tests for the ConfigStore interface layer and its adapters.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConfigStoreApiAdapter,
  ConfigStoreCachedAdapter,
  createConfigStore,
  type IConfigStore,
  type SettingValue,
} from './ConfigStore';
import { defaultConfig } from './defaultConfig';
import type { ThemeConfig } from './types';

// ============================================================================
// Mock Fetch
// ============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

// ============================================================================
// Test Data
// ============================================================================

const mockTheme: ThemeConfig = {
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

const mockSettingValue: SettingValue<number> = {
  value: 0.08,
  scope: 'store',
};

// ============================================================================
// API Adapter Tests
// ============================================================================

describe('ConfigStoreApiAdapter', () => {
  let adapter: IConfigStore;

  beforeEach(() => {
    adapter = new ConfigStoreApiAdapter('/api', 1000);
    mockFetch.mockClear();
    localStorage.clear();
  });

  describe('getSetting', () => {
    it('should fetch setting from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });

      const result = await adapter.getSetting<number>('tax_rate');

      expect(mockFetch).toHaveBeenCalledWith('/api/settings/tax_rate');
      expect(result).toEqual(mockSettingValue);
    });

    it('should fetch setting with scope from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });

      const result = await adapter.getSetting<number>('tax_rate', 'store');

      expect(mockFetch).toHaveBeenCalledWith('/api/settings/tax_rate?scope=store');
      expect(result).toEqual(mockSettingValue);
    });

    it('should use cache for repeated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });

      // First call - should fetch
      await adapter.getSetting<number>('tax_rate');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      await adapter.getSetting<number>('tax_rate');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(adapter.getSetting('unknown_key')).rejects.toThrow(
        'Failed to fetch setting: Not Found'
      );
    });
  });

  describe('setSetting', () => {
    it('should send PUT request to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await adapter.setSetting('tax_rate', 'store', 0.08);

      expect(mockFetch).toHaveBeenCalledWith('/api/settings/tax_rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'store', value: 0.08 }),
      });
    });

    it('should invalidate cache after setting', async () => {
      // First, get a setting to populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });
      await adapter.getSetting<number>('tax_rate');

      // Set the setting
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      await adapter.setSetting('tax_rate', 'store', 0.09);

      // Get again - should fetch from API (cache invalidated)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: 0.09, scope: 'store' }),
      });
      const result = await adapter.getSetting<number>('tax_rate');

      expect(result.value).toBe(0.09);
      expect(mockFetch).toHaveBeenCalledTimes(3); // get, set, get
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      });

      await expect(adapter.setSetting('tax_rate', 'store', 0.08)).rejects.toThrow(
        'Failed to set setting: Bad Request'
      );
    });
  });

  describe('getTheme', () => {
    it('should fetch theme from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTheme,
      });

      const result = await adapter.getTheme('store-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/theme?storeId=store-1');
      expect(result).toEqual(mockTheme);
    });

    it('should fetch theme with user ID from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTheme,
      });

      const result = await adapter.getTheme('store-1', 'user-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/theme?storeId=store-1&userId=user-1');
      expect(result).toEqual(mockTheme);
    });

    it('should use cache for repeated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTheme,
      });

      await adapter.getTheme('store-1');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await adapter.getTheme('store-1');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('setTheme', () => {
    it('should send PUT request to API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await adapter.setTheme('store', { mode: 'dark' }, 'store-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'store',
          theme: { mode: 'dark' },
          storeId: 'store-1',
          userId: undefined,
        }),
      });
    });

    it('should invalidate cache after setting', async () => {
      // Get theme to populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTheme,
      });
      await adapter.getTheme('store-1');

      // Set theme
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      await adapter.setTheme('store', { mode: 'light' }, 'store-1');

      // Get again - should fetch from API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockTheme, mode: 'light' }),
      });
      const result = await adapter.getTheme('store-1');

      expect(result.mode).toBe('light');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('getTenantConfig', () => {
    it('should fetch tenant config from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => defaultConfig,
      });

      const result = await adapter.getTenantConfig();

      expect(mockFetch).toHaveBeenCalledWith('/api/config');
      expect(result).toEqual(defaultConfig);
    });

    it('should use cache for repeated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => defaultConfig,
      });

      await adapter.getTenantConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);

      await adapter.getTenantConfig();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('getResolvedConfig', () => {
    it('should fetch resolved config from API', async () => {
      const resolvedConfig = {
        ...defaultConfig,
        _meta: {
          resolvedAt: Date.now(),
          scopes: { tenant: true, store: true, user: false },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => resolvedConfig,
      });

      const result = await adapter.getResolvedConfig('store-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/config/resolved?storeId=store-1');
      expect(result).toEqual(resolvedConfig);
    });

    it('should fetch resolved config with user ID from API', async () => {
      const resolvedConfig = {
        ...defaultConfig,
        _meta: {
          resolvedAt: Date.now(),
          scopes: { tenant: true, store: true, user: true },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => resolvedConfig,
      });

      const result = await adapter.getResolvedConfig('store-1', 'user-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/config/resolved?storeId=store-1&userId=user-1');
      expect(result).toEqual(resolvedConfig);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      // Populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });
      await adapter.getSetting('tax_rate');

      // Clear cache
      await adapter.clearCache();

      // Get again - should fetch from API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });
      await adapter.getSetting('tax_rate');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      // Populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });
      await adapter.getSetting('tax_rate');

      const stats = await adapter.getCacheStats();

      expect(stats.entries).toBe(1);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeGreaterThan(0);
    });

    it('should return empty stats when cache is empty', async () => {
      const stats = await adapter.getCacheStats();

      expect(stats.entries).toBe(0);
      expect(stats.size).toBe(0);
      expect(stats.lastUpdated).toBeNull();
    });
  });
});

// ============================================================================
// Cached Adapter Tests
// ============================================================================

describe('ConfigStoreCachedAdapter', () => {
  let backendAdapter: IConfigStore;
  let cachedAdapter: IConfigStore;
  let testCounter = 0;

  beforeEach(() => {
    // Clear ALL localStorage keys to prevent pollution
    localStorage.clear();
    
    backendAdapter = new ConfigStoreApiAdapter('/api', 1000);
    cachedAdapter = new ConfigStoreCachedAdapter(backendAdapter, 'test_cache', 1000);
    mockFetch.mockClear();
    testCounter++;
  });

  describe('getSetting', () => {
    it('should fetch from backend and cache result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });

      const result = await cachedAdapter.getSetting<number>('tax_rate');

      expect(result).toEqual(mockSettingValue);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await cachedAdapter.getSetting<number>('tax_rate');
      expect(result2).toEqual(mockSettingValue);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use stale cache when backend fails', async () => {
      // Create fresh adapter with unique key
      const freshBackend = new ConfigStoreApiAdapter('/api', 1000);
      const freshCached = new ConfigStoreCachedAdapter(freshBackend, `test_cache_stale_${testCounter}`, 1000);

      // First call - populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });
      await freshCached.getSetting<number>('tax_rate');

      // Second call - backend fails, should use stale cache
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await freshCached.getSetting<number>('tax_rate');
      expect(result).toEqual(mockSettingValue);
    });

    it('should throw error when backend fails and no cache exists', async () => {
      // Create fresh adapter with unique storage key
      const freshBackend = new ConfigStoreApiAdapter('/api', 1000);
      const freshCached = new ConfigStoreCachedAdapter(freshBackend, `test_cache_nocache_${testCounter}`, 1000);

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(freshCached.getSetting('tax_rate')).rejects.toThrow('Network error');
    });
  });

  describe('setSetting', () => {
    it('should write to backend and invalidate cache', async () => {
      // Create fresh adapter with unique key
      const freshBackend = new ConfigStoreApiAdapter('/api', 1000);
      const freshCached = new ConfigStoreCachedAdapter(freshBackend, `test_set_${testCounter}`, 1000);

      // Populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });
      await freshCached.getSetting<number>('tax_rate');

      // Set setting
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
      await freshCached.setSetting('tax_rate', 'store', 0.09);

      // Get again - should fetch from backend
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: 0.09, scope: 'store' }),
      });
      const result = await freshCached.getSetting<number>('tax_rate');

      expect(result.value).toBe(0.09);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('getTheme', () => {
    it('should fetch from backend and cache result', async () => {
      // Create fresh adapter with unique key
      const freshBackend = new ConfigStoreApiAdapter('/api', 1000);
      const freshCached = new ConfigStoreCachedAdapter(freshBackend, `test_theme_${testCounter}`, 1000);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTheme,
      });

      const result = await freshCached.getTheme('store-1');

      expect(result).toEqual(mockTheme);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await freshCached.getTheme('store-1');
      expect(result2).toEqual(mockTheme);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should use stale cache when backend fails', async () => {
      // Create fresh adapter with unique key
      const freshBackend = new ConfigStoreApiAdapter('/api', 1000);
      const freshCached = new ConfigStoreCachedAdapter(freshBackend, `test_theme_stale_${testCounter}`, 1000);

      // Populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockTheme,
      });
      await freshCached.getTheme('store-1');

      // Backend fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await freshCached.getTheme('store-1');
      expect(result).toEqual(mockTheme);
    });
  });

  describe('clearCache', () => {
    it('should clear memory cache and localStorage', async () => {
      // Create fresh adapter with unique storage key
      const freshBackend = new ConfigStoreApiAdapter('/api', 1000);
      const storageKey = `test_clear_${testCounter}`;
      const freshCached = new ConfigStoreCachedAdapter(freshBackend, storageKey, 1000);

      // Populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });
      await freshCached.getSetting('tax_rate');

      // Verify localStorage has data
      const stored = localStorage.getItem(storageKey);
      expect(stored).toBeTruthy();

      // Clear cache
      await freshCached.clearCache();

      // Verify localStorage is cleared
      const clearedStored = localStorage.getItem(storageKey);
      expect(clearedStored).toBeNull();

      // Get again - should fetch from backend
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });
      await freshCached.getSetting('tax_rate');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      // Create fresh adapter with unique storage key
      const freshBackend = new ConfigStoreApiAdapter('/api', 1000);
      const freshCached = new ConfigStoreCachedAdapter(freshBackend, `test_cache_stats_${testCounter}`, 1000);

      // Populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSettingValue,
      });
      await freshCached.getSetting('tax_rate');

      const stats = await freshCached.getCacheStats();

      expect(stats.entries).toBe(1);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createConfigStore', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorage.clear();
  });

  it('should create API adapter', () => {
    const store = createConfigStore('api', { baseUrl: '/api' });
    expect(store).toBeInstanceOf(ConfigStoreApiAdapter);
  });

  it('should create cached adapter', () => {
    const store = createConfigStore('cached', { baseUrl: '/api' });
    expect(store).toBeInstanceOf(ConfigStoreCachedAdapter);
  });

  it('should create cached adapter by default', () => {
    const store = createConfigStore();
    expect(store).toBeInstanceOf(ConfigStoreCachedAdapter);
  });

  it('should throw error for unknown adapter type', () => {
    expect(() => createConfigStore('unknown' as 'api')).toThrow('Unknown adapter type: unknown');
  });
});
