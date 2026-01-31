/**
 * ConfigStore Interface Layer
 *
 * Provides a unified API for accessing settings and themes with offline-first support.
 * Implements multiple adapters for different storage backends (SQLite, API, Cached).
 *
 * Architecture:
 * - ConfigStore: Main interface for settings and theme management
 * - Adapters: SQLite (local DB), API (backend), Cached (localStorage)
 * - Offline-first: Writes go to local DB first, then sync queue
 */

import type { TenantConfig, ThemeConfig } from './types';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Setting scope determines where a setting value is stored and its precedence
 */
export type SettingScope = 'store' | 'user' | 'default';

/**
 * Theme locks prevent user overrides for specific theme dimensions
 */
export interface ThemeLocks {
  lockMode?: boolean;
  lockAccent?: boolean;
  lockContrast?: boolean;
}

/**
 * Store theme configuration with locks
 */
export interface StoreThemeConfig extends ThemeConfig {
  locks?: ThemeLocks;
  logo?: string;
  companyName?: string;
}

/**
 * Theme preferences at different scopes
 */
export interface ThemePreferences {
  store?: Partial<StoreThemeConfig>;
  user?: Partial<ThemeConfig>;
  default: ThemeConfig;
}

/**
 * Setting value with scope information
 */
export interface SettingValue<T = unknown> {
  value: T;
  scope: SettingScope;
}

/**
 * Resolved configuration with all layers merged
 */
export interface ResolvedConfig extends TenantConfig {
  _meta?: {
    resolvedAt: number;
    scopes: {
      tenant: boolean;
      store: boolean;
      user: boolean;
    };
  };
}

// ============================================================================
// ConfigStore Interface
// ============================================================================

/**
 * Main interface for configuration and theme management
 *
 * Provides methods for:
 * - Getting/setting individual settings
 * - Getting/setting theme configuration
 * - Loading tenant configuration
 * - Resolving merged configuration
 */
export interface IConfigStore {
  // ========== Settings Management ==========

  /**
   * Get a setting value with scope resolution
   *
   * @param key - Setting key (e.g., 'tax_rate', 'theme.mode')
   * @param scope - Optional scope to read from (defaults to resolved value)
   * @returns Setting value with scope information
   */
  getSetting<T = unknown>(key: string, scope?: SettingScope): Promise<SettingValue<T>>;

  /**
   * Set a setting value at a specific scope
   *
   * @param key - Setting key
   * @param scope - Scope to write to ('store' or 'user')
   * @param value - Setting value
   * @throws Error if scope is invalid for the setting type
   */
  setSetting<T = unknown>(key: string, scope: SettingScope, value: T): Promise<void>;

  // ========== Theme Management ==========

  /**
   * Get theme configuration with scope resolution
   *
   * @param storeId - Store ID for store-level theme
   * @param userId - Optional user ID for user-level theme
   * @returns Resolved theme configuration
   */
  getTheme(storeId: string, userId?: string): Promise<ThemeConfig>;

  /**
   * Set theme configuration at a specific scope
   *
   * @param scope - Scope to write to ('store' or 'user')
   * @param partialTheme - Partial theme configuration to merge
   * @param storeId - Store ID (required for store scope)
   * @param userId - User ID (required for user scope)
   * @throws Error if theme locks prevent the change
   */
  setTheme(
    scope: SettingScope,
    partialTheme: Partial<ThemeConfig>,
    storeId?: string,
    userId?: string
  ): Promise<void>;

  // ========== Configuration Management ==========

  /**
   * Get tenant configuration (loads and validates JSON config)
   *
   * @returns Validated tenant configuration
   * @throws Error in development if validation fails
   */
  getTenantConfig(): Promise<TenantConfig>;

  /**
   * Get resolved configuration (merges default + tenant + store + user)
   *
   * @param storeId - Store ID for store-level config
   * @param userId - Optional user ID for user-level config
   * @returns Fully resolved configuration
   */
  getResolvedConfig(storeId: string, userId?: string): Promise<ResolvedConfig>;

  // ========== Cache Management ==========

  /**
   * Clear all cached configuration data
   */
  clearCache(): Promise<void>;

  /**
   * Get cache statistics
   */
  getCacheStats(): Promise<{
    size: number;
    entries: number;
    lastUpdated: number | null;
  }>;
}

// ============================================================================
// SQLite Adapter
// ============================================================================

/**
 * SQLite adapter for local database storage
 *
 * Features:
 * - Offline-first: All writes go to local DB first
 * - Sync queue: Changes are queued for synchronization
 * - Fast reads: Direct SQLite queries
 */
/**
 * SQLite adapter for local database storage
 *
 * Note: In browser context, this adapter uses localStorage as a fallback
 * since direct SQLite access requires Electron/Tauri IPC.
 * The actual SQLite operations are performed via the backend API.
 *
 * Features:
 * - Offline-first: All writes go to localStorage first
 * - Sync queue: Changes are queued for synchronization via API
 * - Fast reads: Direct localStorage queries with API fallback
 */
export class ConfigStoreSqliteAdapter implements IConfigStore {
  private dbPath: string;
  private storagePrefix = 'EasySale_sqlite_';
  private syncQueueKey = 'EasySale_sync_queue';

  constructor(dbPath: string = './data/pos.db') {
    this.dbPath = dbPath;
  }

  private getStorageKey(type: string, key: string): string {
    return `${this.storagePrefix}${type}_${key}`;
  }

  private addToSyncQueue(operation: {
    type: 'setting' | 'theme' | 'config';
    action: 'set' | 'delete';
    key: string;
    value?: unknown;
    scope?: SettingScope;
    storeId?: string;
    userId?: string;
  }): void {
    try {
      const queue = JSON.parse(localStorage.getItem(this.syncQueueKey) || '[]');
      queue.push({
        ...operation,
        timestamp: Date.now(),
        id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      });
      localStorage.setItem(this.syncQueueKey, JSON.stringify(queue));
    } catch (error) {
      console.warn('Failed to add to sync queue:', error);
    }
  }

  async getSetting<T = unknown>(key: string, scope?: SettingScope): Promise<SettingValue<T>> {
    // Try localStorage first (offline-first)
    const storageKey = this.getStorageKey('setting', `${key}_${scope || 'resolved'}`);
    const stored = localStorage.getItem(storageKey);

    if (stored) {
      try {
        return JSON.parse(stored) as SettingValue<T>;
      } catch {
        // Invalid stored data, continue to default
      }
    }

    // Return default value structure
    // In production, this would query the backend API
    const defaultValue: SettingValue<T> = {
      value: null as unknown as T,
      scope: scope || 'default',
    };

    return defaultValue;
  }

  async setSetting<T = unknown>(key: string, scope: SettingScope, value: T): Promise<void> {
    // Validate scope
    if (scope === 'default') {
      throw new Error('Cannot write to default scope');
    }

    // Store locally
    const storageKey = this.getStorageKey('setting', `${key}_${scope}`);
    const settingValue: SettingValue<T> = { value, scope };
    localStorage.setItem(storageKey, JSON.stringify(settingValue));

    // Also update resolved key
    const resolvedKey = this.getStorageKey('setting', `${key}_resolved`);
    localStorage.setItem(resolvedKey, JSON.stringify(settingValue));

    // Add to sync queue for backend synchronization
    this.addToSyncQueue({
      type: 'setting',
      action: 'set',
      key,
      value,
      scope,
    });
  }

  async getTheme(storeId: string, userId?: string): Promise<ThemeConfig> {
    // Default theme configuration - uses teal as primary to match tokens.css
    // Primary color should be configurable via branding settings
    const defaultTheme: ThemeConfig = {
      mode: 'light',
      colors: {
        primary: '#14b8a6', // Teal - matches tokens.css source of truth
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        success: '#22c55e',
        warning: '#f59e0b',
        error: '#ef4444',
        info: '#3b82f6', // Info stays blue - semantic color
      },
    };

    // Try to load user theme first (highest precedence)
    if (userId) {
      const userThemeKey = this.getStorageKey('theme', `user_${userId}`);
      const userTheme = localStorage.getItem(userThemeKey);
      if (userTheme) {
        try {
          const parsed = JSON.parse(userTheme) as Partial<ThemeConfig>;
          return { ...defaultTheme, ...parsed };
        } catch {
          // Invalid data, continue
        }
      }
    }

    // Try store theme
    const storeThemeKey = this.getStorageKey('theme', `store_${storeId}`);
    const storeTheme = localStorage.getItem(storeThemeKey);
    if (storeTheme) {
      try {
        const parsed = JSON.parse(storeTheme) as StoreThemeConfig;
        // Check locks before applying user overrides
        return { ...defaultTheme, ...parsed };
      } catch {
        // Invalid data, continue
      }
    }

    return defaultTheme;
  }

  async setTheme(
    scope: SettingScope,
    partialTheme: Partial<ThemeConfig>,
    storeId?: string,
    userId?: string
  ): Promise<void> {
    if (scope === 'default') {
      throw new Error('Cannot write to default scope');
    }

    // Check theme locks if user scope
    if (scope === 'user' && storeId) {
      const storeThemeKey = this.getStorageKey('theme', `store_${storeId}`);
      const storeTheme = localStorage.getItem(storeThemeKey);
      if (storeTheme) {
        try {
          const parsed = JSON.parse(storeTheme) as StoreThemeConfig;
          if (parsed.locks) {
            if (parsed.locks.lockMode && partialTheme.mode !== undefined) {
              throw new Error('Theme mode is locked by store administrator');
            }
            // Additional lock checks can be added here
          }
        } catch (e) {
          if (e instanceof Error && e.message.includes('locked')) {
            throw e;
          }
          // Invalid stored data, continue
        }
      }
    }

    // Determine storage key based on scope
    let storageKey: string;
    if (scope === 'user' && userId) {
      storageKey = this.getStorageKey('theme', `user_${userId}`);
    } else if (scope === 'store' && storeId) {
      storageKey = this.getStorageKey('theme', `store_${storeId}`);
    } else {
      throw new Error('Invalid scope or missing ID');
    }

    // Merge with existing theme
    const existing = localStorage.getItem(storageKey);
    let merged = partialTheme;
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        merged = { ...parsed, ...partialTheme };
      } catch {
        // Use partial theme as-is
      }
    }

    localStorage.setItem(storageKey, JSON.stringify(merged));

    // Add to sync queue
    this.addToSyncQueue({
      type: 'theme',
      action: 'set',
      key: scope === 'user' ? `user_${userId}` : `store_${storeId}`,
      value: merged,
      scope,
      storeId,
      userId,
    });
  }

  async getTenantConfig(): Promise<TenantConfig> {
    // Try localStorage cache first
    const cacheKey = this.getStorageKey('config', 'tenant');
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached) as TenantConfig;
      } catch {
        // Invalid cache, continue
      }
    }

    // Return minimal default config
    // In production, this would be loaded from backend API
    const defaultConfig: TenantConfig = {
      version: '1.0.0',
      tenant: {
        id: 'default',
        name: 'EasySale',
        slug: 'easysale',
      },
      branding: {
        company: {
          name: 'EasySale',
          shortName: 'ES',
        },
      },
      theme: {
        mode: 'light',
        colors: {
          primary: '#14b8a6', // Teal - matches tokens.css source of truth
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          success: '#22c55e',
          warning: '#f59e0b',
          error: '#ef4444',
          info: '#3b82f6', // Info stays blue - semantic color
        },
      },
      categories: [],
      navigation: {
        main: [],
      },
      widgets: {
        dashboard: [],
      },
      modules: {},
      localization: {
        language: 'en',
        currency: { code: 'USD', symbol: '$', position: 'before' },
      },
      layouts: {},
      wizards: {},
    };

    return defaultConfig;
  }

  async getResolvedConfig(storeId: string, userId?: string): Promise<ResolvedConfig> {
    // Load tenant config as base
    const tenantConfig = await this.getTenantConfig();

    // Load store-specific overrides
    const storeConfigKey = this.getStorageKey('config', `store_${storeId}`);
    const storeConfigStr = localStorage.getItem(storeConfigKey);
    let storeConfig: Partial<TenantConfig> = {};
    if (storeConfigStr) {
      try {
        storeConfig = JSON.parse(storeConfigStr);
      } catch {
        // Invalid data
      }
    }

    // Load user-specific overrides
    let userConfig: Partial<TenantConfig> = {};
    if (userId) {
      const userConfigKey = this.getStorageKey('config', `user_${userId}`);
      const userConfigStr = localStorage.getItem(userConfigKey);
      if (userConfigStr) {
        try {
          userConfig = JSON.parse(userConfigStr);
        } catch {
          // Invalid data
        }
      }
    }

    // Merge with precedence: tenant < store < user
    const resolved: ResolvedConfig = {
      ...tenantConfig,
      ...storeConfig,
      ...userConfig,
      _meta: {
        resolvedAt: Date.now(),
        scopes: {
          tenant: true,
          store: Object.keys(storeConfig).length > 0,
          user: Object.keys(userConfig).length > 0,
        },
      },
    };

    return resolved;
  }

  async clearCache(): Promise<void> {
    // Clear all localStorage items with our prefix
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.storagePrefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  async getCacheStats(): Promise<{ size: number; entries: number; lastUpdated: number | null }> {
    let totalSize = 0;
    let entries = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.storagePrefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
          entries++;
        }
      }
    }

    return { size: totalSize, entries, lastUpdated: null };
  }
}

// ============================================================================
// API Adapter
// ============================================================================

/**
 * API adapter for backend HTTP requests
 *
 * Features:
 * - Remote access: Fetches from backend API
 * - Caching: Uses localStorage for offline fallback
 * - Sync: Writes trigger backend sync
 */
export class ConfigStoreApiAdapter implements IConfigStore {
  private baseUrl: string;
  private cache: Map<string, { value: unknown; timestamp: number }>;
  private cacheTimeout: number;

  constructor(baseUrl: string = '/api', cacheTimeout: number = 5 * 60 * 1000) {
    this.baseUrl = baseUrl;
    this.cache = new Map();
    this.cacheTimeout = cacheTimeout;
  }

  async getSetting<T = unknown>(key: string, scope?: SettingScope): Promise<SettingValue<T>> {
    // Check cache first
    const cached = this.cache.get(`setting:${key}:${scope || 'resolved'}`);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value as SettingValue<T>;
    }

    // Fetch from API
    const url = scope
      ? `${this.baseUrl}/settings/${key}?scope=${scope}`
      : `${this.baseUrl}/settings/${key}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch setting: ${response.statusText}`);
    }

    const result = await response.json();

    // Cache result
    this.cache.set(`setting:${key}:${scope || 'resolved'}`, {
      value: result,
      timestamp: Date.now(),
    });

    return result;
  }

  async setSetting<T = unknown>(key: string, scope: SettingScope, value: T): Promise<void> {
    const response = await fetch(`${this.baseUrl}/settings/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, value }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set setting: ${response.statusText}`);
    }

    // Invalidate cache
    this.cache.delete(`setting:${key}:${scope}`);
    this.cache.delete(`setting:${key}:resolved`);
  }

  async getTheme(storeId: string, userId?: string): Promise<ThemeConfig> {
    const cacheKey = `theme:${storeId}:${userId || 'none'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value as ThemeConfig;
    }

    const url = userId
      ? `${this.baseUrl}/theme?storeId=${storeId}&userId=${userId}`
      : `${this.baseUrl}/theme?storeId=${storeId}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch theme: ${response.statusText}`);
    }

    const result = await response.json();

    this.cache.set(cacheKey, { value: result, timestamp: Date.now() });

    return result;
  }

  async setTheme(
    scope: SettingScope,
    partialTheme: Partial<ThemeConfig>,
    storeId?: string,
    userId?: string
  ): Promise<void> {
    const response = await fetch(`${this.baseUrl}/theme`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scope, theme: partialTheme, storeId, userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set theme: ${response.statusText}`);
    }

    // Invalidate cache
    if (storeId) {
      this.cache.delete(`theme:${storeId}:none`);
    }
    if (userId) {
      this.cache.delete(`theme:${storeId}:${userId}`);
    }
  }

  async getTenantConfig(): Promise<TenantConfig> {
    const cached = this.cache.get('tenant:config');
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value as TenantConfig;
    }

    const response = await fetch(`${this.baseUrl}/config`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tenant config: ${response.statusText}`);
    }

    const result = await response.json();

    this.cache.set('tenant:config', { value: result, timestamp: Date.now() });

    return result;
  }

  async getResolvedConfig(storeId: string, userId?: string): Promise<ResolvedConfig> {
    const cacheKey = `resolved:${storeId}:${userId || 'none'}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value as ResolvedConfig;
    }

    const url = userId
      ? `${this.baseUrl}/config/resolved?storeId=${storeId}&userId=${userId}`
      : `${this.baseUrl}/config/resolved?storeId=${storeId}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch resolved config: ${response.statusText}`);
    }

    const result = await response.json();

    this.cache.set(cacheKey, { value: result, timestamp: Date.now() });

    return result;
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  async getCacheStats(): Promise<{ size: number; entries: number; lastUpdated: number | null }> {
    let totalSize = 0;
    let lastUpdated: number | null = null;

    for (const [, entry] of this.cache) {
      totalSize += JSON.stringify(entry.value).length;
      if (!lastUpdated || entry.timestamp > lastUpdated) {
        lastUpdated = entry.timestamp;
      }
    }

    return {
      size: totalSize,
      entries: this.cache.size,
      lastUpdated,
    };
  }
}

// ============================================================================
// Cached Adapter
// ============================================================================

/**
 * Cached adapter with localStorage fallback
 *
 * Features:
 * - Memory cache: Fast in-memory access
 * - localStorage: Persistent offline cache
 * - Fallback: Uses cached data when backend unavailable
 */
export class ConfigStoreCachedAdapter implements IConfigStore {
  private memoryCache: Map<string, { value: unknown; timestamp: number }>;
  private storageKey: string;
  private cacheTimeout: number;
  private backendAdapter: IConfigStore;

  constructor(
    backendAdapter: IConfigStore,
    storageKey: string = 'EasySale_config_cache',
    cacheTimeout: number = 5 * 60 * 1000
  ) {
    this.backendAdapter = backendAdapter;
    this.storageKey = storageKey;
    this.cacheTimeout = cacheTimeout;
    this.memoryCache = new Map();

    // Load cache from localStorage
    this.loadCacheFromStorage();
  }

  private loadCacheFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        for (const [key, value] of Object.entries(parsed)) {
          this.memoryCache.set(key, value as { value: unknown; timestamp: number });
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  private saveCacheToStorage(): void {
    try {
      const cacheObj: Record<string, { value: unknown; timestamp: number }> = {};
      for (const [key, value] of this.memoryCache) {
        cacheObj[key] = value;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('Failed to save cache to localStorage:', error);
    }
  }

  private getCached<T>(key: string): T | null {
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value as T;
    }
    return null;
  }

  private setCache(key: string, value: unknown): void {
    this.memoryCache.set(key, { value, timestamp: Date.now() });
    this.saveCacheToStorage();
  }

  async getSetting<T = unknown>(key: string, scope?: SettingScope): Promise<SettingValue<T>> {
    const cacheKey = `setting:${key}:${scope || 'resolved'}`;
    const cached = this.getCached<SettingValue<T>>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.backendAdapter.getSetting<T>(key, scope);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      // If backend fails, try to use stale cache
      const stale = this.memoryCache.get(cacheKey);
      if (stale) {
        console.warn('Using stale cache for setting:', key);
        return stale.value as SettingValue<T>;
      }
      throw error;
    }
  }

  async setSetting<T = unknown>(key: string, scope: SettingScope, value: T): Promise<void> {
    await this.backendAdapter.setSetting(key, scope, value);

    // Invalidate cache
    this.memoryCache.delete(`setting:${key}:${scope}`);
    this.memoryCache.delete(`setting:${key}:resolved`);
    this.saveCacheToStorage();
  }

  async getTheme(storeId: string, userId?: string): Promise<ThemeConfig> {
    const cacheKey = `theme:${storeId}:${userId || 'none'}`;
    const cached = this.getCached<ThemeConfig>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.backendAdapter.getTheme(storeId, userId);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      const stale = this.memoryCache.get(cacheKey);
      if (stale) {
        console.warn('Using stale cache for theme');
        return stale.value as ThemeConfig;
      }
      throw error;
    }
  }

  async setTheme(
    scope: SettingScope,
    partialTheme: Partial<ThemeConfig>,
    storeId?: string,
    userId?: string
  ): Promise<void> {
    await this.backendAdapter.setTheme(scope, partialTheme, storeId, userId);

    // Invalidate cache
    if (storeId) {
      this.memoryCache.delete(`theme:${storeId}:none`);
    }
    if (userId && storeId) {
      this.memoryCache.delete(`theme:${storeId}:${userId}`);
    }
    this.saveCacheToStorage();
  }

  async getTenantConfig(): Promise<TenantConfig> {
    const cacheKey = 'tenant:config';
    const cached = this.getCached<TenantConfig>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.backendAdapter.getTenantConfig();
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      const stale = this.memoryCache.get(cacheKey);
      if (stale) {
        console.warn('Using stale cache for tenant config');
        return stale.value as TenantConfig;
      }
      throw error;
    }
  }

  async getResolvedConfig(storeId: string, userId?: string): Promise<ResolvedConfig> {
    const cacheKey = `resolved:${storeId}:${userId || 'none'}`;
    const cached = this.getCached<ResolvedConfig>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const result = await this.backendAdapter.getResolvedConfig(storeId, userId);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      const stale = this.memoryCache.get(cacheKey);
      if (stale) {
        console.warn('Using stale cache for resolved config');
        return stale.value as ResolvedConfig;
      }
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    this.memoryCache.clear();
    localStorage.removeItem(this.storageKey);
    await this.backendAdapter.clearCache();
  }

  async getCacheStats(): Promise<{ size: number; entries: number; lastUpdated: number | null }> {
    let totalSize = 0;
    let lastUpdated: number | null = null;

    for (const [, entry] of this.memoryCache) {
      totalSize += JSON.stringify(entry.value).length;
      if (!lastUpdated || entry.timestamp > lastUpdated) {
        lastUpdated = entry.timestamp;
      }
    }

    return {
      size: totalSize,
      entries: this.memoryCache.size,
      lastUpdated,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a ConfigStore instance with the appropriate adapter
 *
 * @param type - Adapter type ('sqlite', 'api', or 'cached')
 * @param options - Adapter-specific options
 * @returns ConfigStore instance
 */
export function createConfigStore(
  type: 'sqlite' | 'api' | 'cached' = 'cached',
  options?: {
    dbPath?: string;
    baseUrl?: string;
    cacheTimeout?: number;
    storageKey?: string;
  }
): IConfigStore {
  switch (type) {
    case 'sqlite':
      return new ConfigStoreSqliteAdapter(options?.dbPath);

    case 'api':
      return new ConfigStoreApiAdapter(options?.baseUrl, options?.cacheTimeout);

    case 'cached': {
      const apiAdapter = new ConfigStoreApiAdapter(options?.baseUrl, options?.cacheTimeout);
      return new ConfigStoreCachedAdapter(apiAdapter, options?.storageKey, options?.cacheTimeout);
    }

    default:
      throw new Error(`Unknown adapter type: ${type}`);
  }
}

// Note: Types are exported at their interface definitions above
