import { useState, useEffect, useCallback, useRef } from 'react';

const CACHE_PREFIX = 'easysale_sync_cache_';

export interface UseSyncQueryOptions<T> {
  /** Scope for the query - 'all' or a store ID */
  scope: 'all' | string;
  /** Polling interval in milliseconds (default: 30000) */
  pollingInterval?: number;
  /** Whether to pause polling when tab is hidden (default: true) */
  pauseWhenHidden?: boolean;
  /** Whether the query is enabled (default: true) */
  enabled?: boolean;
  /** Cache key suffix for sessionStorage */
  cacheKey?: string;
}

export interface UseSyncQueryResult<T> {
  /** The fetched data */
  data: T | undefined;
  /** Whether the initial fetch is in progress */
  isLoading: boolean;
  /** Whether an error occurred */
  isError: boolean;
  /** The error object if an error occurred */
  error: Error | null;
  /** Function to manually trigger a refetch */
  refetch: () => Promise<void>;
  /** Whether a refetch is in progress */
  isRefetching: boolean;
  /** Timestamp of the last successful fetch */
  lastFetchedAt: Date | null;
  /** Whether the data is from cache (stale) */
  isStale: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  scope: string;
}

/**
 * Save data to sessionStorage cache
 */
function saveToCache<T>(key: string, data: T, scope: string): void {
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      scope,
    };
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
}

/**
 * Load data from sessionStorage cache
 */
function loadFromCache<T>(key: string, scope: string): CacheEntry<T> | null {
  try {
    const stored = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!stored) return null;
    
    const entry = JSON.parse(stored) as CacheEntry<T>;
    // Only return if scope matches
    if (entry.scope !== scope) return null;
    
    return entry;
  } catch {
    return null;
  }
}

/**
 * useSyncQuery Hook
 * 
 * A custom hook for fetching sync-related data with:
 * - Automatic polling (configurable interval, default 30s)
 * - Pause when tab is hidden
 * - SessionStorage caching for offline support
 * - Debounced manual refresh
 * - Request cancellation on unmount
 * 
 * Validates: Requirements 2.5, 2.6, 14.7
 * 
 * @example
 * const { data, isLoading, refetch } = useSyncQuery(
 *   'sync-status',
 *   (scope) => syncApi.getSyncStatus(),
 *   { scope: 'all', pollingInterval: 30000 }
 * );
 */
export function useSyncQuery<T>(
  key: string,
  fetcher: (scope: string) => Promise<T>,
  options: UseSyncQueryOptions<T>
): UseSyncQueryResult<T> {
  const {
    scope,
    pollingInterval = 30000,
    pauseWhenHidden = true,
    enabled = true,
    cacheKey,
  } = options;

  const effectiveKey = cacheKey || key;

  // State
  const [data, setData] = useState<T | undefined>(() => {
    // Initialize from cache if available
    const cached = loadFromCache<T>(effectiveKey, scope);
    return cached?.data;
  });
  const [isLoading, setIsLoading] = useState(!data);
  const [isRefetching, setIsRefetching] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetchedAt, setLastFetchedAt] = useState<Date | null>(() => {
    const cached = loadFromCache<T>(effectiveKey, scope);
    return cached ? new Date(cached.timestamp) : null;
  });
  const [isStale, setIsStale] = useState(!!data);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefetchTimeRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  // Debounce threshold for manual refetch (500ms)
  const REFETCH_DEBOUNCE_MS = 500;

  /**
   * Fetch data from the API
   */
  const fetchData = useCallback(async (isManualRefetch = false) => {
    if (!enabled) return;

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    // Set loading state
    if (!data) {
      setIsLoading(true);
    } else if (isManualRefetch) {
      setIsRefetching(true);
    }

    try {
      const result = await fetcher(scope);
      
      if (!isMountedRef.current) return;

      setData(result);
      setIsError(false);
      setError(null);
      setLastFetchedAt(new Date());
      setIsStale(false);

      // Save to cache
      saveToCache(effectiveKey, result, scope);
    } catch (err) {
      if (!isMountedRef.current) return;
      
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return;

      setIsError(true);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      
      // If we have cached data, mark it as stale but keep showing it
      if (data) {
        setIsStale(true);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [enabled, scope, fetcher, data, effectiveKey]);

  /**
   * Manual refetch with debouncing
   */
  const refetch = useCallback(async () => {
    const now = Date.now();
    
    // Debounce: skip if last refetch was too recent
    if (now - lastRefetchTimeRef.current < REFETCH_DEBOUNCE_MS) {
      return;
    }
    
    lastRefetchTimeRef.current = now;
    await fetchData(true);
  }, [fetchData]);

  /**
   * Start polling
   */
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (pollingInterval > 0 && enabled) {
      pollingIntervalRef.current = setInterval(() => {
        fetchData(false);
      }, pollingInterval);
    }
  }, [pollingInterval, enabled, fetchData]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  /**
   * Handle visibility change
   */
  useEffect(() => {
    if (!pauseWhenHidden) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible - refetch and restart polling
        fetchData(false);
        startPolling();
      } else {
        // Tab became hidden - stop polling
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pauseWhenHidden, fetchData, startPolling, stopPolling]);

  /**
   * Initial fetch and polling setup
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Initial fetch
    fetchData(false);

    // Start polling (only if tab is visible)
    if (!pauseWhenHidden || document.visibilityState === 'visible') {
      startPolling();
    }

    return () => {
      isMountedRef.current = false;
      stopPolling();
      
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [scope, enabled]); // Re-run when scope or enabled changes

  /**
   * Restart polling when interval changes
   */
  useEffect(() => {
    if (document.visibilityState === 'visible' || !pauseWhenHidden) {
      startPolling();
    }
    return () => stopPolling();
  }, [pollingInterval, startPolling, stopPolling, pauseWhenHidden]);

  /**
   * Clear cache and refetch when scope changes
   */
  useEffect(() => {
    // Load from cache for new scope
    const cached = loadFromCache<T>(effectiveKey, scope);
    if (cached) {
      setData(cached.data);
      setLastFetchedAt(new Date(cached.timestamp));
      setIsStale(true);
    } else {
      setData(undefined);
      setLastFetchedAt(null);
      setIsStale(false);
    }
  }, [scope, effectiveKey]);

  return {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
    lastFetchedAt,
    isStale,
  };
}

export default useSyncQuery;
