/**
 * Estimate Hooks Tests
 * 
 * Unit tests for estimate management hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useEstimates, useEstimate, useCreateEstimate } from '../hooks';
import * as api from '../api';

// Mock the API module
vi.mock('../api');

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('Estimate Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useEstimates', () => {
    it('should fetch estimates successfully', async () => {
      const mockEstimates = [
        {
          id: 'est-1',
          tenant_id: 'tenant_default',
          estimate_number: 'EST-20260130-0001',
          customer_id: 'cust-1',
          estimate_date: '2026-01-30',
          expiration_date: '2026-02-28',
          subtotal: 100,
          tax_amount: 10,
          discount_amount: 0,
          total_amount: 110,
          status: 'draft' as const,
          created_at: '2026-01-30T10:00:00Z',
          updated_at: '2026-01-30T10:00:00Z',
          store_id: 'default-store',
          sync_version: 0,
        },
      ];

      vi.mocked(api.listEstimates).mockResolvedValue(mockEstimates);

      const { result } = renderHook(() => useEstimates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockEstimates);
      expect(api.listEstimates).toHaveBeenCalledWith(undefined);
    });

    it('should handle errors when fetching estimates', async () => {
      const error = new Error('Failed to fetch estimates');
      vi.mocked(api.listEstimates).mockRejectedValue(error);

      const { result } = renderHook(() => useEstimates(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });

  describe('useEstimate', () => {
    it('should fetch a single estimate successfully', async () => {
      const mockEstimate = {
        id: 'est-1',
        tenant_id: 'tenant_default',
        estimate_number: 'EST-20260130-0001',
        customer_id: 'cust-1',
        estimate_date: '2026-01-30',
        expiration_date: '2026-02-28',
        subtotal: 100,
        tax_amount: 10,
        discount_amount: 0,
        total_amount: 110,
        status: 'draft' as const,
        created_at: '2026-01-30T10:00:00Z',
        updated_at: '2026-01-30T10:00:00Z',
        store_id: 'default-store',
        sync_version: 0,
      };

      vi.mocked(api.getEstimate).mockResolvedValue(mockEstimate);

      const { result } = renderHook(() => useEstimate('est-1'), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockEstimate);
      expect(api.getEstimate).toHaveBeenCalledWith('est-1');
    });

    it('should not fetch when id is undefined', () => {
      const { result } = renderHook(() => useEstimate(undefined), {
        wrapper: createWrapper(),
      });

      expect(result.current.data).toBeUndefined();
      expect(api.getEstimate).not.toHaveBeenCalled();
    });
  });

  describe('useCreateEstimate', () => {
    it('should create an estimate successfully', async () => {
      const mockRequest = {
        customer_id: 'cust-1',
        estimate_date: '2026-01-30',
        line_items: [
          {
            description: 'Test Item',
            quantity: 1,
            unit_price: 100,
          },
        ],
      };

      const mockEstimate = {
        id: 'est-1',
        tenant_id: 'tenant_default',
        estimate_number: 'EST-20260130-0001',
        customer_id: 'cust-1',
        estimate_date: '2026-01-30',
        subtotal: 100,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: 100,
        status: 'draft' as const,
        created_at: '2026-01-30T10:00:00Z',
        updated_at: '2026-01-30T10:00:00Z',
        store_id: 'default-store',
        sync_version: 0,
      };

      vi.mocked(api.createEstimate).mockResolvedValue(mockEstimate);

      const { result } = renderHook(() => useCreateEstimate(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockRequest);

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockEstimate);
      expect(api.createEstimate).toHaveBeenCalledWith(mockRequest);
    });

    it('should handle errors when creating an estimate', async () => {
      const mockRequest = {
        customer_id: 'cust-1',
        estimate_date: '2026-01-30',
        line_items: [],
      };

      const error = new Error('Failed to create estimate');
      vi.mocked(api.createEstimate).mockRejectedValue(error);

      const { result } = renderHook(() => useCreateEstimate(), {
        wrapper: createWrapper(),
      });

      result.current.mutate(mockRequest);

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toEqual(error);
    });
  });
});
