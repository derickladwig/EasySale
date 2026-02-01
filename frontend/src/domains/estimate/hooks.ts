/**
 * Estimate Hooks
 * 
 * React Query hooks for estimate management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Estimate,
  EstimateLineItem,
  CreateEstimateRequest,
  UpdateEstimateRequest,
  ListEstimatesParams,
} from './types';
import * as api from './api';

// Query keys
export const estimateKeys = {
  all: ['estimates'] as const,
  lists: () => [...estimateKeys.all, 'list'] as const,
  list: (params?: ListEstimatesParams) => [...estimateKeys.lists(), params] as const,
  details: () => [...estimateKeys.all, 'detail'] as const,
  detail: (id: string) => [...estimateKeys.details(), id] as const,
  lineItems: (id: string) => [...estimateKeys.detail(id), 'line-items'] as const,
};

/**
 * Hook to list estimates
 */
export function useEstimates(params?: ListEstimatesParams) {
  return useQuery({
    queryKey: estimateKeys.list(params),
    queryFn: () => api.listEstimates(params),
  });
}

/**
 * Hook to get a single estimate
 */
export function useEstimate(id: string | undefined) {
  return useQuery({
    queryKey: estimateKeys.detail(id!),
    queryFn: () => api.getEstimate(id!),
    enabled: !!id,
  });
}

/**
 * Hook to get estimate line items
 */
export function useEstimateLineItems(id: string | undefined) {
  return useQuery({
    queryKey: estimateKeys.lineItems(id!),
    queryFn: () => api.getEstimateLineItems(id!),
    enabled: !!id,
  });
}

/**
 * Hook to create an estimate
 */
export function useCreateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateEstimateRequest) => api.createEstimate(request),
    onSuccess: () => {
      // Invalidate estimates list
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    },
  });
}

/**
 * Hook to update an estimate
 */
export function useUpdateEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateEstimateRequest }) =>
      api.updateEstimate(id, request),
    onSuccess: (data) => {
      // Invalidate estimates list and detail
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
      queryClient.invalidateQueries({ queryKey: estimateKeys.detail(data.id) });
    },
  });
}

/**
 * Hook to delete an estimate
 */
export function useDeleteEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteEstimate(id),
    onSuccess: () => {
      // Invalidate estimates list
      queryClient.invalidateQueries({ queryKey: estimateKeys.lists() });
    },
  });
}

/**
 * Hook to generate PDF for an estimate
 */
export function useGenerateEstimatePdf() {
  return useMutation({
    mutationFn: (id: string) => api.generateEstimatePdf(id),
  });
}
