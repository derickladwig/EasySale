/**
 * Customer React Query Hooks
 * 
 * Provides hooks for customer data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import * as customerApi from './api';
import type { CustomerResponse, CreateCustomerRequest, UpdateCustomerRequest } from './api';

/**
 * Hook to fetch all customers
 */
export function useCustomersQuery(params?: {
  pricing_tier?: string;
  store_id?: string;
}): UseQueryResult<CustomerResponse[], Error> {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => customerApi.listCustomers(params),
  });
}

/**
 * Hook to fetch single customer by ID
 */
export function useCustomerQuery(id: string): UseQueryResult<CustomerResponse, Error> {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: () => customerApi.getCustomer(id),
    enabled: !!id,
  });
}

/**
 * Hook to create customer
 */
export function useCreateCustomerMutation(): UseMutationResult<
  CustomerResponse,
  Error,
  CreateCustomerRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerApi.createCustomer,
    onSuccess: () => {
      // Invalidate customers list to refetch
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

/**
 * Hook to update customer
 */
export function useUpdateCustomerMutation(): UseMutationResult<
  CustomerResponse,
  Error,
  { id: string; data: UpdateCustomerRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => customerApi.updateCustomer(id, data),
    onSuccess: (data) => {
      // Invalidate customers list and specific customer
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', data.id] });
    },
  });
}

/**
 * Hook to delete customer
 */
export function useDeleteCustomerMutation(): UseMutationResult<
  void,
  Error,
  string
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: customerApi.deleteCustomer,
    onSuccess: () => {
      // Invalidate customers list
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

/**
 * Transform backend CustomerResponse to frontend Customer format
 */
export function transformCustomer(response: CustomerResponse): {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'individual' | 'business';
  tier: 'standard' | 'silver' | 'gold' | 'platinum';
  totalSpent: number;
  orderCount: number;
  lastOrder: string;
  address?: string;
  company?: string;
} {
  // Map pricing_tier to tier
  const tierMap: Record<string, 'standard' | 'silver' | 'gold' | 'platinum'> = {
    retail: 'standard',
    wholesale: 'silver',
    vip: 'gold',
  };

  return {
    id: response.id,
    name: response.name,
    email: response.email || '',
    phone: response.phone || '',
    type: 'individual', // Backend doesn't have type field yet
    tier: tierMap[response.pricing_tier] || 'standard',
    totalSpent: response.store_credit, // Placeholder - need actual sales data
    orderCount: 0, // Placeholder - need actual order count
    lastOrder: response.updated_at,
    address: undefined,
    company: undefined,
  };
}
