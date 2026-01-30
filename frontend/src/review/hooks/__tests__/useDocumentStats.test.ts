import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDocumentStats } from '../useReviewApi';
import { apiClient } from '../../../common/api/client';
import { createElement, type ReactNode } from 'react';

vi.mock('../../../../common/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useDocumentStats', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  it('should fetch and aggregate stats from multiple API calls', async () => {
    const mockResponses = [
      { cases: [], total: 12, page: 1, per_page: 1 }, // NeedsReview
      { cases: [], total: 2, page: 1, per_page: 1 },  // Processing
      { cases: [], total: 1, page: 1, per_page: 1 },  // Queued
      { cases: [], total: 3, page: 1, per_page: 1 },  // Failed
    ];

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce(mockResponses[0])
      .mockResolvedValueOnce(mockResponses[1])
      .mockResolvedValueOnce(mockResponses[2])
      .mockResolvedValueOnce(mockResponses[3]);

    const { result } = renderHook(() => useDocumentStats(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      needsReview: 12,
      processing: 3, // 2 + 1 (Processing + Queued)
      failed: 3,
    });

    expect(apiClient.get).toHaveBeenCalledWith('/api/cases?state=NeedsReview&per_page=1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/cases?state=Processing&per_page=1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/cases?state=Queued&per_page=1');
    expect(apiClient.get).toHaveBeenCalledWith('/api/cases?state=Failed&per_page=1');
  });

  it('should handle missing total values gracefully', async () => {
    const mockResponses = [
      { cases: [], page: 1, per_page: 1 }, // Missing total
      { cases: [], page: 1, per_page: 1 },
      { cases: [], page: 1, per_page: 1 },
      { cases: [], page: 1, per_page: 1 },
    ];

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce(mockResponses[0])
      .mockResolvedValueOnce(mockResponses[1])
      .mockResolvedValueOnce(mockResponses[2])
      .mockResolvedValueOnce(mockResponses[3]);

    const { result } = renderHook(() => useDocumentStats(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      needsReview: 0,
      processing: 0,
      failed: 0,
    });
  });

  it('should handle API errors', async () => {
    const error = new Error('API Error');
    vi.mocked(apiClient.get).mockRejectedValue(error);

    const { result } = renderHook(() => useDocumentStats(), { wrapper });

    // Wait for retries to complete (hook has retry: 2)
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 5000 });
    expect(result.current.error).toEqual(error);
  });

  it('should combine Processing and Queued states correctly', async () => {
    const mockResponses = [
      { cases: [], total: 5, page: 1, per_page: 1 },  // NeedsReview
      { cases: [], total: 10, page: 1, per_page: 1 }, // Processing
      { cases: [], total: 7, page: 1, per_page: 1 },  // Queued
      { cases: [], total: 2, page: 1, per_page: 1 },  // Failed
    ];

    vi.mocked(apiClient.get)
      .mockResolvedValueOnce(mockResponses[0])
      .mockResolvedValueOnce(mockResponses[1])
      .mockResolvedValueOnce(mockResponses[2])
      .mockResolvedValueOnce(mockResponses[3]);

    const { result } = renderHook(() => useDocumentStats(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.processing).toBe(17); // 10 + 7
  });
});
