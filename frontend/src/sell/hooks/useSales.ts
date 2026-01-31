/**
 * Sales Hooks
 * 
 * React Query hooks for sales operations.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi, CreateSaleRequest } from '../api/salesApi';

/**
 * Hook to create a new sale
 */
export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateSaleRequest) => salesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

/**
 * Hook to get a sale by ID
 */
export function useSale(id: string | undefined) {
  return useQuery({
    queryKey: ['sales', id],
    queryFn: () => salesApi.get(id!),
    enabled: !!id,
  });
}

/**
 * Hook to list recent sales
 */
export function useSalesList(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['sales', 'list', params],
    queryFn: () => salesApi.list(params),
  });
}

/**
 * Hook to void a sale
 */
export function useVoidSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => salesApi.void(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
