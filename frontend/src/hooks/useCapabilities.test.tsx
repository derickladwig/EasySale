import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  useCapabilities,
  useFeatureAvailable,
  useExportAvailable,
  useSyncAvailable,
  useAccountingMode,
  type Capabilities,
} from './useCapabilities';

// Mock fetch
global.fetch = vi.fn();

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Disable retries in tests
      },
    },
  });
  // eslint-disable-next-line react/display-name
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch capabilities successfully', async () => {
    const mockCapabilities: Capabilities = {
      accounting_mode: 'export_only',
      features: {
        export: true,
        sync: false,
      },
      version: '0.1.0',
      build_hash: 'abc123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCapabilities,
    });

    const { result } = renderHook(() => useCapabilities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockCapabilities);
    expect(global.fetch).toHaveBeenCalledWith('/api/capabilities');
  });

  it('should cache capabilities indefinitely', async () => {
    const mockCapabilities: Capabilities = {
      accounting_mode: 'export_only',
      features: {
        export: true,
        sync: false,
      },
      version: '0.1.0',
      build_hash: 'abc123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCapabilities,
    });

    const { result, rerender } = renderHook(() => useCapabilities(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Rerender should not trigger new fetch
    rerender();

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe('useFeatureAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when feature is available', async () => {
    const mockCapabilities: Capabilities = {
      accounting_mode: 'export_only',
      features: {
        export: true,
        sync: false,
      },
      version: '0.1.0',
      build_hash: 'abc123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCapabilities,
    });

    const { result } = renderHook(() => useFeatureAvailable('export'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('should return false when feature is not available', async () => {
    const mockCapabilities: Capabilities = {
      accounting_mode: 'disabled',
      features: {
        export: false,
        sync: false,
      },
      version: '0.1.0',
      build_hash: 'abc123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCapabilities,
    });

    const { result } = renderHook(() => useFeatureAvailable('export'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('should return undefined while loading', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useFeatureAvailable('export'), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeUndefined();
  });
});

describe('useExportAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true when export is available', async () => {
    const mockCapabilities: Capabilities = {
      accounting_mode: 'export_only',
      features: {
        export: true,
        sync: false,
      },
      version: '0.1.0',
      build_hash: 'abc123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCapabilities,
    });

    const { result } = renderHook(() => useExportAvailable(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('should return false when export is not available', async () => {
    const mockCapabilities: Capabilities = {
      accounting_mode: 'disabled',
      features: {
        export: false,
        sync: false,
      },
      version: '0.1.0',
      build_hash: 'abc123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCapabilities,
    });

    const { result } = renderHook(() => useExportAvailable(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe('useSyncAvailable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return false when sync is not available', async () => {
    const mockCapabilities: Capabilities = {
      accounting_mode: 'export_only',
      features: {
        export: true,
        sync: false,
      },
      version: '0.1.0',
      build_hash: 'abc123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCapabilities,
    });

    const { result } = renderHook(() => useSyncAvailable(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe('useAccountingMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return export_only mode', async () => {
    const mockCapabilities: Capabilities = {
      accounting_mode: 'export_only',
      features: {
        export: true,
        sync: false,
      },
      version: '0.1.0',
      build_hash: 'abc123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCapabilities,
    });

    const { result } = renderHook(() => useAccountingMode(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBe('export_only'));
  });

  it('should return disabled mode', async () => {
    const mockCapabilities: Capabilities = {
      accounting_mode: 'disabled',
      features: {
        export: false,
        sync: false,
      },
      version: '0.1.0',
      build_hash: 'abc123',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCapabilities,
    });

    const { result } = renderHook(() => useAccountingMode(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBe('disabled'));
  });

  it('should return undefined while loading', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useAccountingMode(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeUndefined();
  });
});
