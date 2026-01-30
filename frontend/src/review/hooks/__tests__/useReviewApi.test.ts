import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useReviewQueue, useReviewCase } from '../useReviewApi';
import { apiClient } from '../../../common/api/client';
import { createElement, type ReactNode } from 'react';

// Mock the API client
vi.mock('../../../../common/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('useReviewApi', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);

  describe('useReviewQueue', () => {
    it('should fetch and return cases list', async () => {
      const mockResponse = {
        cases: [
          {
            case_id: 'case-1',
            state: 'NeedsReview',
            vendor_name: 'Test Vendor',
            confidence: 85,
            created_at: '2024-01-15T10:00:00Z',
            fields_needing_attention: 2,
          },
        ],
        total: 1,
        page: 1,
        per_page: 20,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useReviewQueue({ state: 'NeedsReview' }), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/api/cases?state=NeedsReview');
    });

    it('should handle empty results gracefully', async () => {
      const mockResponse = {
        cases: [],
        total: 0,
        page: 1,
        per_page: 20,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useReviewQueue(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data?.cases).toEqual([]);
      expect(result.current.data?.total).toBe(0);
    });

    it('should handle invalid response structure', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(null);

      const { result } = renderHook(() => useReviewQueue(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
      expect(result.current.error?.message).toContain('Invalid response');
    });

    it('should filter out empty filter values', async () => {
      const mockResponse = {
        cases: [],
        total: 0,
        page: 1,
        per_page: 20,
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(
        () =>
          useReviewQueue({
            state: 'NeedsReview',
            vendor: '',
            min_conf: undefined,
          }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Should only include state in query params, not empty vendor or undefined min_conf
      expect(apiClient.get).toHaveBeenCalledWith('/api/cases?state=NeedsReview');
    });

    it('should handle API errors', async () => {
      const error = new Error('Network error');
      vi.mocked(apiClient.get).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useReviewQueue(), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeDefined();
    });
  });

  describe('useReviewCase', () => {
    it('should fetch case details', async () => {
      const mockCase = {
        case_id: 'case-1',
        state: 'NeedsReview',
        confidence: 85,
        created_at: '2024-01-15T10:00:00Z',
        extracted: {
          invoice_number: 'INV-001',
          invoice_date: '2024-01-15',
          vendor_name: 'Test Vendor',
          subtotal: 100,
          tax: 10,
          total: 110,
          line_items: [],
        },
        validation_result: {
          hard_flags: [],
          soft_flags: [],
          can_approve: true,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValueOnce(mockCase);

      const { result } = renderHook(() => useReviewCase('case-1'), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockCase);
      expect(apiClient.get).toHaveBeenCalledWith('/api/cases/case-1');
    });

    it('should not fetch when caseId is empty', () => {
      const { result } = renderHook(() => useReviewCase(''), { wrapper });

      expect(result.current.isFetching).toBe(false);
      expect(apiClient.get).not.toHaveBeenCalled();
    });

    it('should handle invalid response', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce(null);

      const { result } = renderHook(() => useReviewCase('case-1'), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error?.message).toContain('Invalid response');
    });
  });
});
