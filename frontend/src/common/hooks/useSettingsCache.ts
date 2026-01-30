import { useState, useEffect, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  key: string;
}

/**
 * Settings cache hook with automatic expiration
 * @param fetchFn - Function to fetch data
 * @param options - Cache options
 * @returns Cached data and utilities
 */
export function useSettingsCache<T>(fetchFn: () => Promise<T>, options: CacheOptions) {
  const { ttl = 5 * 60 * 1000, key } = options; // Default 5 minutes
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const getCacheKey = useCallback(() => `settings_cache_${key}`, [key]);

  const getFromCache = useCallback((): T | null => {
    try {
      const cached = localStorage.getItem(getCacheKey());
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid
      if (now - entry.timestamp < ttl) {
        return entry.data;
      }

      // Cache expired, remove it
      localStorage.removeItem(getCacheKey());
      return null;
    } catch (err) {
      console.error('Error reading from cache:', err);
      return null;
    }
  }, [getCacheKey, ttl]);

  const saveToCache = useCallback(
    (data: T) => {
      try {
        const entry: CacheEntry<T> = {
          data,
          timestamp: Date.now(),
        };
        localStorage.setItem(getCacheKey(), JSON.stringify(entry));
      } catch (err) {
        console.error('Error saving to cache:', err);
      }
    },
    [getCacheKey]
  );

  const invalidateCache = useCallback(() => {
    localStorage.removeItem(getCacheKey());
    setData(null);
  }, [getCacheKey]);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cached = getFromCache();
        if (cached) {
          setData(cached);
          return cached;
        }
      }

      setLoading(true);
      setError(null);

      try {
        const result = await fetchFn();
        setData(result);
        saveToCache(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to fetch data');
        setError(error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [fetchFn, getFromCache, saveToCache]
  );

  // Load data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: () => fetchData(true),
    invalidate: invalidateCache,
  };
}

/**
 * Clear all settings cache
 */
export function clearAllSettingsCache() {
  const keys = Object.keys(localStorage);
  keys.forEach((key) => {
    if (key.startsWith('settings_cache_')) {
      localStorage.removeItem(key);
    }
  });
}
