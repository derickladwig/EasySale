/**
 * Asset Handling and Offline Cache
 *
 * Manages caching of tenant assets (logos, backgrounds) for offline operation
 * Implements fallback order: logoDark → logo → built-in default
 */

import type { BrandingConfig } from './types';

// ============================================================================
// Types
// ============================================================================

export interface AssetCacheEntry {
  url: string;
  dataUrl: string;
  timestamp: number;
  size: number;
}

export interface AssetCache {
  [key: string]: AssetCacheEntry;
}

export interface LogoFallbackOptions {
  preferDark?: boolean;
  defaultLogo?: string;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_KEY = 'easysale_asset_cache';
const CACHE_VERSION = 1;
const MAX_CACHE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_LOGO = '/assets/logos/easysale-logo.svg';
const DEFAULT_LOGO_DARK = '/assets/logos/easysale-logo-dark.svg';

// ============================================================================
// Asset Cache Functions
// ============================================================================

/**
 * Cache an asset for offline use
 *
 * Downloads the asset and stores it as a data URL in localStorage
 */
export async function cacheAsset(url: string): Promise<string> {
  try {
    // Check if already cached
    const cached = getCachedAsset(url);
    if (cached) {
      return cached.dataUrl;
    }

    // Fetch the asset
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch asset: ${response.statusText}`);
    }

    // Convert to blob
    const blob = await response.blob();

    // Check size
    if (blob.size > MAX_CACHE_SIZE) {
      console.warn(`Asset too large to cache: ${url} (${blob.size} bytes)`);
      return url; // Return original URL
    }

    // Convert to data URL
    const dataUrl = await blobToDataURL(blob);

    // Store in cache
    const cache = getAssetCache();
    cache[url] = {
      url,
      dataUrl,
      timestamp: Date.now(),
      size: blob.size,
    };

    saveAssetCache(cache);

    return dataUrl;
  } catch (error) {
    console.error(`Failed to cache asset: ${url}`, error);
    return url; // Return original URL as fallback
  }
}

/**
 * Get cached asset
 */
export function getCachedAsset(url: string): AssetCacheEntry | null {
  const cache = getAssetCache();
  return cache[url] || null;
}

/**
 * Cache multiple assets
 */
export async function cacheAssets(urls: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  await Promise.all(
    urls.map(async (url) => {
      const dataUrl = await cacheAsset(url);
      results.set(url, dataUrl);
    })
  );

  return results;
}

/**
 * Clear asset cache
 */
export function clearAssetCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear asset cache:', error);
  }
}

/**
 * Get asset cache from localStorage
 */
function getAssetCache(): AssetCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return {};

    const data = JSON.parse(cached);
    if (data.version !== CACHE_VERSION) {
      // Clear old cache version
      clearAssetCache();
      return {};
    }

    return data.cache || {};
  } catch (error) {
    console.error('Failed to load asset cache:', error);
    return {};
  }
}

/**
 * Save asset cache to localStorage
 */
function saveAssetCache(cache: AssetCache): void {
  try {
    const data = {
      version: CACHE_VERSION,
      cache,
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save asset cache:', error);

    // If quota exceeded, try to clear old entries
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      pruneAssetCache(cache);
      try {
        const data = {
          version: CACHE_VERSION,
          cache,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch (retryError) {
        console.error('Failed to save asset cache after pruning:', retryError);
      }
    }
  }
}

/**
 * Prune old entries from cache to free up space
 */
function pruneAssetCache(cache: AssetCache): void {
  // Sort by timestamp (oldest first)
  const entries = Object.entries(cache).sort(
    ([, a], [, b]) => a.timestamp - b.timestamp
  );

  // Remove oldest 50% of entries
  const toRemove = Math.ceil(entries.length / 2);
  entries.slice(0, toRemove).forEach(([url]) => {
    delete cache[url];
  });
}

/**
 * Convert Blob to data URL
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ============================================================================
// Logo Fallback Functions
// ============================================================================

/**
 * Resolve logo URL with fallback order
 *
 * Fallback order: logoDark → logo → built-in default
 */
export function resolveLogo(
  branding: BrandingConfig,
  options: LogoFallbackOptions = {}
): string {
  const { preferDark = false, defaultLogo = DEFAULT_LOGO } = options;

  // Check theme preference
  const isDarkMode =
    preferDark || document.documentElement.dataset.theme === 'dark';

  // Try logoDark first if in dark mode
  if (isDarkMode && branding.company.logoDark) {
    return branding.company.logoDark;
  }

  // Try logoLight if in light mode
  if (!isDarkMode && branding.company.logoLight) {
    return branding.company.logoLight;
  }

  // Try generic logo
  if (branding.company.logo) {
    return branding.company.logo;
  }

  // Use built-in default
  return isDarkMode ? DEFAULT_LOGO_DARK : defaultLogo;
}

/**
 * Resolve and cache logo
 *
 * Returns cached data URL if available, otherwise caches and returns
 */
export async function resolveAndCacheLogo(
  branding: BrandingConfig,
  options: LogoFallbackOptions = {}
): Promise<string> {
  const logoUrl = resolveLogo(branding, options);

  // Check if already cached
  const cached = getCachedAsset(logoUrl);
  if (cached) {
    return cached.dataUrl;
  }

  // Cache the logo
  return await cacheAsset(logoUrl);
}

/**
 * Preload and cache all branding assets
 *
 * Caches logos, backgrounds, and other assets for offline use
 */
export async function preloadBrandingAssets(branding: BrandingConfig): Promise<void> {
  const urls: string[] = [];

  // Collect all asset URLs
  if (branding.company.logo) urls.push(branding.company.logo);
  if (branding.company.logoLight) urls.push(branding.company.logoLight);
  if (branding.company.logoDark) urls.push(branding.company.logoDark);
  if (branding.company.favicon) urls.push(branding.company.favicon);
  if (branding.login?.background) urls.push(branding.login.background);

  // Cache all assets
  await cacheAssets(urls);

  console.info(`✅ Preloaded ${urls.length} branding assets`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  entries: number;
  totalSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
} {
  const cache = getAssetCache();
  const entries = Object.values(cache);

  if (entries.length === 0) {
    return {
      entries: 0,
      totalSize: 0,
      oldestEntry: null,
      newestEntry: null,
    };
  }

  const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
  const timestamps = entries.map((entry) => entry.timestamp);

  return {
    entries: entries.length,
    totalSize,
    oldestEntry: Math.min(...timestamps),
    newestEntry: Math.max(...timestamps),
  };
}

// ============================================================================
// Exports
// ============================================================================

export { DEFAULT_LOGO, DEFAULT_LOGO_DARK };
