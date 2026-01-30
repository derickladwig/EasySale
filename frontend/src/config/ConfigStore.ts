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
export class ConfigStoreSqliteAdapter implements IConfigStore {
  private dbPath: string;

  constructor(dbPath: string = './data/pos.db') {
    this.dbPath = dbPath;
  }

  async getSetting<T = unknown>(_key: string, _scope?: SettingScope): Promise<SettingValue<T>> {
    // Implement basic localStorage fallback for now
    // Query: SELECT value, scope FROM setting_values WHERE setting_key = ? AND scope = ?
    throw new Error('Not implemented: ConfigStoreSqliteAdapter.getSetting');
  }

  async setSetting<T = unknown>(_key: string, _scope: SettingScope, _value: T): Promise<void> {
    // Implement basic localStorage with sync queue
    // 1. Validate scope is allowed for this setting
    // 2. Write to setting_values table
    // 3. Add to sync_queue table
    throw new Error('Not implemented: ConfigStoreSqliteAdapter.setSetting');
  }

  async getTheme(_storeId: string, _userId?: string): Promise<ThemeConfig> {
    // TODO: Implement theme resolution
    // 1. Load store theme from theme_preferences WHERE store_id = ?
    // 2. Load user theme from theme_preferences WHERE user_id = ?
    // 3. Resolve with scope precedence (respecting locks)
    throw new Error('Not implemented: ConfigStoreSqliteAdapter.getTheme');
  }

  async setTheme(
    _scope: SettingScope,
    _partialTheme: Partial<ThemeConfig>,
    _storeId?: string,
    _userId?: string
  ): Promise<void> {
    // TODO: Implement theme write + sync queue
    // 1. Validate theme locks (if user scope)
    // 2. Write to theme_preferences table
    // 3. Add to sync_queue table
    throw new Error('Not implemented: ConfigStoreSqliteAdapter.setTheme');
  }

  async getTenantConfig(): Promise<TenantConfig> {
    // TODO: Implement tenant config loading
    // 1. Load from configs/private/*.json
    // 2. Validate against schema
    // 3. Cache in memory
    throw new Error('Not implemented: ConfigStoreSqliteAdapter.getTenantConfig');
  }

  async getResolvedConfig(_storeId: string, _userId?: string): Promise<ResolvedConfig> {
    // TODO: Implement config resolution
    // 1. Load default config (code)
    // 2. Load tenant config (JSON)
    // 3. Load store config (DB)
    // 4. Load user config (DB)
    // 5. Merge with precedence
    throw new Error('Not implemented: ConfigStoreSqliteAdapter.getResolvedConfig');
  }

  async clearCache(): Promise<void> {
    // SQLite adapter doesn't use cache (direct DB access)
    return Promise.resolve();
  }

  async getCacheStats(): Promise<{ size: number; entries: number; lastUpdated: number | null }> {
    return Promise.resolve({ size: 0, entries: 0, lastUpdated: null });
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
