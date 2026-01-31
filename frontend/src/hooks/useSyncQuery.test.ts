/**
 * Unit Tests: useSyncQuery Hook
 * 
 * Tests for the useSyncQuery hook functionality:
 * - Initial fetch
 * - Error handling
 * - Manual refresh
 * 
 * Validates: Requirements 2.5, 14.7
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSyncQuery } from './useSyncQuery';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('useSyncQuery Hook', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    vi.clearAllMocks();
    // Reset document visibility
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Basic Functionality
  // ==========================================================================

  describe('Basic Functionality', () => {
    it('should fetch data on mount', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({ status: 'ok' });

      const { result } = renderHook(() =>
        useSyncQuery('test-key', mockFetcher, { 
          scope: 'all',
          pollingInterval: 0, // Disable polling for this test
        })
      );

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetcher).toHaveBeenCalledWith('all');
      expect(result.current.data).toEqual({ status: 'ok' });
      expect(result.current.isError).toBe(false);
    });

    it('should pass scope to fetcher', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() =>
        useSyncQuery('test-key', mockFetcher, { 
          scope: 'store-123',
          pollingInterval: 0,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetcher).toHaveBeenCalledWith('store-123');
    });

    it('should handle fetch errors', async () => {
      const mockError = new Error('Network error');
      const mockFetcher = vi.fn().mockRejectedValue(mockError);

      const { result } = renderHook(() =>
        useSyncQuery('test-key', mockFetcher, { 
          scope: 'all',
          pollingInterval: 0,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(mockError);
    });

    it('should not fetch when disabled', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({ data: 'test' });

      renderHook(() =>
        useSyncQuery('test-key', mockFetcher, { 
          scope: 'all', 
          enabled: false,
          pollingInterval: 0,
        })
      );

      // Give it some time to potentially fetch
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetcher).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Manual Refresh
  // ==========================================================================

  describe('Manual Refresh', () => {
    it('should allow manual refetch', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() =>
        useSyncQuery('test-key', mockFetcher, {
          scope: 'all',
          pollingInterval: 0, // Disable polling
        })
      );

      // Wait for initial fetch
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(mockFetcher).toHaveBeenCalledTimes(1);

      // Manual refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetcher).toHaveBeenCalledTimes(2);
    });

    it('should set isRefetching during manual refetch', async () => {
      let resolvePromise: (value: unknown) => void;
      const mockFetcher = vi.fn().mockImplementation(() => 
        new Promise((resolve) => { resolvePromise = resolve; })
      );

      const { result } = renderHook(() =>
        useSyncQuery('test-key', mockFetcher, { 
          scope: 'all',
          pollingInterval: 0,
        })
      );

      // Complete initial fetch
      await act(async () => {
        resolvePromise!({ data: 'initial' });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isRefetching).toBe(false);

      // Start manual refetch
      let refetchPromise: Promise<void>;
      act(() => {
        refetchPromise = result.current.refetch();
      });

      // Should be refetching
      await waitFor(() => {
        expect(result.current.isRefetching).toBe(true);
      });

      // Complete refetch
      await act(async () => {
        resolvePromise!({ data: 'refetched' });
        await refetchPromise;
      });

      await waitFor(() => {
        expect(result.current.isRefetching).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Caching
  // ==========================================================================

  describe('Caching', () => {
    it('should save data to sessionStorage', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({ data: 'cached' });

      const { result } = renderHook(() =>
        useSyncQuery('cache-test', mockFetcher, { 
          scope: 'all',
          pollingInterval: 0,
        })
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalled();
      const call = mockSessionStorage.setItem.mock.calls.find(
        (c: string[]) => c[0].includes('cache-test')
      );
      expect(call).toBeDefined();
      
      const cached = JSON.parse(call![1]);
      expect(cached.data).toEqual({ data: 'cached' });
      expect(cached.scope).toBe('all');
    });
  });

  // ==========================================================================
  // State Updates
  // ==========================================================================

  describe('State Updates', () => {
    it('should update lastFetchedAt after successful fetch', async () => {
      const mockFetcher = vi.fn().mockResolvedValue({ data: 'test' });

      const { result } = renderHook(() =>
        useSyncQuery('test-key', mockFetcher, { 
          scope: 'all',
          pollingInterval: 0,
        })
      );

      expect(result.current.lastFetchedAt).toBeNull();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.lastFetchedAt).toBeInstanceOf(Date);
    });

    it('should clear error on successful refetch', async () => {
      const mockFetcher = vi.fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce({ data: 'success' });

      const { result } = renderHook(() =>
        useSyncQuery('test-key', mockFetcher, { 
          scope: 'all',
          pollingInterval: 0,
        })
      );

      // Wait for first (failed) fetch
      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Refetch (should succeed)
      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(false);
      });

      expect(result.current.data).toEqual({ data: 'success' });
      expect(result.current.error).toBeNull();
    });
  });
});
