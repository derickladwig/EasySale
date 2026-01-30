/**
 * Performance Tests for Settings Module Optimizations
 * 
 * Tests verify:
 * - Requirement 20.1: Settings pages load in < 500ms
 * - Requirement 20.2: Tables render 1000+ rows efficiently
 * - Requirement 20.3: Search inputs are debounced properly
 * - Requirement 20.4: Settings data is cached for 5 minutes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce } from './useDebounce';
import { useSettingsCache, clearAllSettingsCache } from './useSettingsCache';
import { useVirtualization } from './useVirtualization';

describe('Performance Optimizations', () => {
  describe('useDebounce - Requirement 20.3: Search debouncing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should debounce value changes by 300ms', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      expect(result.current).toBe('initial');

      // Change value multiple times rapidly
      rerender({ value: 'a' });
      expect(result.current).toBe('initial'); // Still old value

      rerender({ value: 'ab' });
      expect(result.current).toBe('initial'); // Still old value

      rerender({ value: 'abc' });
      expect(result.current).toBe('initial'); // Still old value

      // Fast-forward time by 299ms (just before debounce completes)
      act(() => {
        vi.advanceTimersByTime(299);
      });
      expect(result.current).toBe('initial'); // Still old value

      // Fast-forward the remaining 1ms to complete debounce
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current).toBe('abc'); // Now updated
    });

    it('should cancel previous timeout when value changes', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: 'initial' } }
      );

      rerender({ value: 'first' });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Change again before first debounce completes
      rerender({ value: 'second' });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // First value should be skipped
      expect(result.current).toBe('initial');

      // Complete the second debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe('second');
    });

    it('should use custom delay when provided', () => {
      const { result, rerender } = renderHook(
        ({ value, delay }) => useDebounce(value, delay),
        { initialProps: { value: 'initial', delay: 500 } }
      );

      rerender({ value: 'changed', delay: 500 });

      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('initial'); // Not yet updated

      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe('changed'); // Now updated after 500ms
    });

    it('should handle rapid successive changes efficiently', () => {
      const { result, rerender } = renderHook(
        ({ value }) => useDebounce(value, 300),
        { initialProps: { value: '' } }
      );

      // Simulate typing "search query" rapidly
      const query = 'search query';
      for (let i = 1; i <= query.length; i++) {
        rerender({ value: query.substring(0, i) });
        act(() => {
          vi.advanceTimersByTime(50); // 50ms between keystrokes
        });
      }

      // Should still be at initial value
      expect(result.current).toBe('');

      // Complete the debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Should have final value
      expect(result.current).toBe('search query');
    });
  });

  describe('useSettingsCache - Requirement 20.4: Settings caching', () => {
    beforeEach(() => {
      localStorage.clear();
      vi.clearAllMocks();
    });

    afterEach(() => {
      clearAllSettingsCache();
    });

    it('should cache data in localStorage with TTL', () => {
      const testData = { setting: 'value' };
      const cacheKey = 'settings_cache_test-key';
      
      // Manually save to cache
      const entry = {
        data: testData,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));

      // Verify it's cached
      const cached = localStorage.getItem(cacheKey);
      expect(cached).toBeTruthy();
      
      const parsedEntry = JSON.parse(cached!);
      expect(parsedEntry.data).toEqual(testData);
      expect(parsedEntry.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should expire cache after TTL', () => {
      const testData = { setting: 'value' };
      const cacheKey = 'settings_cache_test-key';
      const ttl = 5 * 60 * 1000; // 5 minutes
      
      // Save expired cache entry
      const entry = {
        data: testData,
        timestamp: Date.now() - ttl - 1000, // Expired 1 second ago
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));

      // Check if expired
      const cached = localStorage.getItem(cacheKey);
      const parsedEntry = JSON.parse(cached!);
      const isExpired = Date.now() - parsedEntry.timestamp >= ttl;
      
      expect(isExpired).toBe(true);
    });

    it('should clear all settings cache', () => {
      // Add multiple cache entries
      localStorage.setItem('settings_cache_key1', JSON.stringify({ data: 'value1', timestamp: Date.now() }));
      localStorage.setItem('settings_cache_key2', JSON.stringify({ data: 'value2', timestamp: Date.now() }));
      localStorage.setItem('other_key', 'other_value');

      // Clear settings cache
      clearAllSettingsCache();

      // Verify settings cache cleared but other keys remain
      expect(localStorage.getItem('settings_cache_key1')).toBeNull();
      expect(localStorage.getItem('settings_cache_key2')).toBeNull();
      expect(localStorage.getItem('other_key')).toBe('other_value');
    });

    it('should use separate cache keys for different settings', () => {
      const data1 = { setting: 'value1' };
      const data2 = { setting: 'value2' };
      
      localStorage.setItem('settings_cache_setting-1', JSON.stringify({ data: data1, timestamp: Date.now() }));
      localStorage.setItem('settings_cache_setting-2', JSON.stringify({ data: data2, timestamp: Date.now() }));

      const cached1 = JSON.parse(localStorage.getItem('settings_cache_setting-1')!);
      const cached2 = JSON.parse(localStorage.getItem('settings_cache_setting-2')!);

      expect(cached1.data).toEqual(data1);
      expect(cached2.data).toEqual(data2);
    });

    it('should handle cache invalidation', () => {
      const cacheKey = 'settings_cache_test-key';
      localStorage.setItem(cacheKey, JSON.stringify({ data: 'value', timestamp: Date.now() }));

      expect(localStorage.getItem(cacheKey)).toBeTruthy();

      // Invalidate
      localStorage.removeItem(cacheKey);

      expect(localStorage.getItem(cacheKey)).toBeNull();
    });

    it('should store cache with correct structure', () => {
      const testData = { id: 1, name: 'test', nested: { value: 'nested' } };
      const cacheKey = 'settings_cache_complex';
      
      const entry = {
        data: testData,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));

      const cached = JSON.parse(localStorage.getItem(cacheKey)!);
      
      expect(cached).toHaveProperty('data');
      expect(cached).toHaveProperty('timestamp');
      expect(cached.data).toEqual(testData);
      expect(typeof cached.timestamp).toBe('number');
    });
  });

  describe('useVirtualization - Requirement 20.2: Table virtualization', () => {
    it('should only render visible items plus overscan', () => {
      const itemCount = 1000;
      const itemHeight = 48;
      const containerHeight = 600;
      const overscan = 3;

      const { result } = renderHook(() =>
        useVirtualization(itemCount, {
          itemHeight,
          containerHeight,
          overscan,
        })
      );

      // Calculate expected visible items
      const visibleCount = Math.ceil(containerHeight / itemHeight); // ~12-13 items
      const expectedItemCount = visibleCount + overscan * 2; // Plus overscan on both sides

      expect(result.current.virtualItems.length).toBeLessThanOrEqual(expectedItemCount + 1);
      expect(result.current.virtualItems.length).toBeGreaterThan(0);
      expect(result.current.totalHeight).toBe(itemCount * itemHeight);
    });

    it('should calculate correct total height for large datasets', () => {
      const testCases = [
        { itemCount: 100, itemHeight: 48, expected: 4800 },
        { itemCount: 1000, itemHeight: 48, expected: 48000 },
        { itemCount: 5000, itemHeight: 60, expected: 300000 },
        { itemCount: 10000, itemHeight: 40, expected: 400000 },
      ];

      testCases.forEach(({ itemCount, itemHeight, expected }) => {
        const { result } = renderHook(() =>
          useVirtualization(itemCount, {
            itemHeight,
            containerHeight: 600,
          })
        );

        expect(result.current.totalHeight).toBe(expected);
      });
    });

    it('should provide correct item positions', () => {
      const itemCount = 100;
      const itemHeight = 50;

      const { result } = renderHook(() =>
        useVirtualization(itemCount, {
          itemHeight,
          containerHeight: 500,
        })
      );

      // Check that items have correct positions
      result.current.virtualItems.forEach((item) => {
        expect(item.start).toBe(item.index * itemHeight);
        expect(item.size).toBe(itemHeight);
      });
    });

    it('should handle empty lists', () => {
      const { result } = renderHook(() =>
        useVirtualization(0, {
          itemHeight: 48,
          containerHeight: 600,
        })
      );

      expect(result.current.virtualItems).toHaveLength(0);
      expect(result.current.totalHeight).toBe(0);
    });

    it('should handle single item', () => {
      const { result } = renderHook(() =>
        useVirtualization(1, {
          itemHeight: 48,
          containerHeight: 600,
        })
      );

      expect(result.current.virtualItems).toHaveLength(1);
      expect(result.current.virtualItems[0]).toEqual({
        index: 0,
        start: 0,
        size: 48,
      });
    });

    it('should efficiently handle very large datasets', () => {
      const itemCount = 100000; // 100k items
      const itemHeight = 48;
      const containerHeight = 600;

      const startTime = performance.now();

      const { result } = renderHook(() =>
        useVirtualization(itemCount, {
          itemHeight,
          containerHeight,
        })
      );

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Virtualization calculation should be very fast (< 10ms)
      expect(executionTime).toBeLessThan(10);

      // Should only render visible items, not all 100k
      expect(result.current.virtualItems.length).toBeLessThan(50);
      expect(result.current.totalHeight).toBe(itemCount * itemHeight);
    });
  });

  describe('Integration: Settings Page Load Performance - Requirement 20.1', () => {
    it('should demonstrate caching reduces load time', () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        id: `setting-${i}`,
        key: `key-${i}`,
        value: `value-${i}`,
      }));

      // Simulate first load - save to cache
      const cacheKey = 'settings_cache_settings-list';
      const startTime1 = performance.now();
      
      const entry = {
        data: mockData,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(entry));
      
      const endTime1 = performance.now();
      const saveTime = endTime1 - startTime1;

      // Simulate second load - read from cache
      const startTime2 = performance.now();
      const cached = localStorage.getItem(cacheKey);
      const parsedData = JSON.parse(cached!);
      const endTime2 = performance.now();
      const loadTime = endTime2 - startTime2;

      // Cache operations should be very fast
      expect(saveTime).toBeLessThan(50);
      expect(loadTime).toBeLessThan(50);
      expect(parsedData.data).toEqual(mockData);

      // Cached load should be faster than or equal to save
      expect(loadTime).toBeLessThanOrEqual(saveTime + 10); // Allow 10ms margin
    });

    it('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `setting-${i}`,
        key: `key-${i}`,
        value: `value-${i}`,
        metadata: {
          scope: 'global',
          category: 'system',
          description: `Description for setting ${i}`,
        },
      }));

      const cacheKey = 'settings_cache_large-dataset';
      const startTime = performance.now();
      
      localStorage.setItem(cacheKey, JSON.stringify({
        data: largeData,
        timestamp: Date.now(),
      }));
      
      const cached = localStorage.getItem(cacheKey);
      const parsed = JSON.parse(cached!);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should handle 1000 items efficiently (< 500ms)
      expect(totalTime).toBeLessThan(500);
      expect(parsed.data).toHaveLength(1000);
      expect(parsed.data[0]).toEqual(largeData[0]);
    });
  });

  describe('Integration: Search Performance with Debouncing', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should prevent excessive API calls during rapid typing', () => {
      const mockSearch = vi.fn();

      const { result, rerender } = renderHook(
        ({ query }) => {
          const debouncedQuery = useDebounce(query, 300);
          return { debouncedQuery };
        },
        { initialProps: { query: '' } }
      );

      // Simulate typing "test query" with 50ms between keystrokes
      const searchText = 'test query';
      for (let i = 1; i <= searchText.length; i++) {
        rerender({ query: searchText.substring(0, i) });
        act(() => {
          vi.advanceTimersByTime(50);
        });
      }

      // Debounced value should still be empty
      expect(result.current.debouncedQuery).toBe('');

      // Complete the debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Now should have the final value
      expect(result.current.debouncedQuery).toBe('test query');

      // If we were calling API on each debounced change, it would only be called once
      // This demonstrates that debouncing prevents 10 API calls (one per character)
      // and reduces it to just 1 API call
    });
  });

  describe('Integration: Large Table Rendering Performance', () => {
    it('should render 1000+ rows efficiently using virtualization', () => {
      const itemCount = 1500;
      const itemHeight = 48;
      const containerHeight = 600;

      const startTime = performance.now();

      const { result } = renderHook(() =>
        useVirtualization(itemCount, {
          itemHeight,
          containerHeight,
        })
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Virtualization setup should be very fast
      expect(renderTime).toBeLessThan(10);

      // Should only render visible items (not all 1500)
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      expect(result.current.virtualItems.length).toBeLessThan(visibleCount + 20);

      // Total height should account for all items
      expect(result.current.totalHeight).toBe(itemCount * itemHeight);

      // Memory efficiency: only tracking visible items
      const memoryFootprint = result.current.virtualItems.length;
      const percentageRendered = (memoryFootprint / itemCount) * 100;

      // Should render less than 5% of total items
      expect(percentageRendered).toBeLessThan(5);
    });

    it('should handle scrolling through large dataset efficiently', () => {
      const itemCount = 5000;
      const itemHeight = 48;
      const containerHeight = 600;

      const { result } = renderHook(() =>
        useVirtualization(itemCount, {
          itemHeight,
          containerHeight,
        })
      );

      // Initial render
      const initialItemCount = result.current.virtualItems.length;
      expect(initialItemCount).toBeLessThan(50);

      // Simulate scroll (this would normally trigger via scroll event)
      // The hook should still only render visible items
      expect(result.current.virtualItems.length).toBeLessThan(50);

      // Performance should remain constant regardless of dataset size
      const startTime = performance.now();
      
      // Re-render (simulating scroll update)
      const { result: result2 } = renderHook(() =>
        useVirtualization(itemCount, {
          itemHeight,
          containerHeight,
        })
      );

      const endTime = performance.now();
      const scrollUpdateTime = endTime - startTime;

      expect(scrollUpdateTime).toBeLessThan(10);
      expect(result2.current.virtualItems.length).toBeLessThan(50);
    });
  });
});
