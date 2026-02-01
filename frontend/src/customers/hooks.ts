/**
 * Customer data hooks - Re-exports from domain layer
 * 
 * This file provides backward compatibility for components
 * that import from customers/hooks.ts
 * 
 * New code should import directly from @domains/customer
 */

import { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import {
  useCustomersQuery as useDomainCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  transformCustomer,
} from '@domains/customer';
import type { CustomerResponse, CreateCustomerRequest, UpdateCustomerRequest } from '@domains/customer';

// Legacy Customer type for backward compatibility
export interface Customer {
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
}

/**
 * Hook to fetch all customers
 * Transforms backend response to legacy Customer format
 */
export function useCustomersQuery(): UseQueryResult<Customer[], Error> {
  const query = useDomainCustomersQuery();
  
  return {
    ...query,
    data: query.data?.map(transformCustomer) ?? undefined,
  } as unknown as UseQueryResult<Customer[], Error>;
}

/**
 * Customer creation data
 */
export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  pricing_tier?: string;
}

/**
 * Customer update data
 */
export interface UpdateCustomerData {
  name?: string;
  email?: string;
  phone?: string;
  pricing_tier?: string;
}

/**
 * Hook to create a new customer
 */
export function useCreateCustomer(): UseMutationResult<Customer, Error, CreateCustomerData> {
  const mutation = useCreateCustomerMutation();
  
  return {
    ...mutation,
    mutate: ((data: CreateCustomerData, options?: any) => {
      const request: CreateCustomerRequest = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        pricing_tier: data.pricing_tier as 'retail' | 'wholesale' | 'vip' | undefined,
      };
      mutation.mutate(request, {
        ...options,
        onSuccess: (response: CustomerResponse, variables: CreateCustomerRequest, context: unknown) => {
          options?.onSuccess?.(transformCustomer(response), data, context);
        },
      });
    }) as any,
    mutateAsync: async (data: CreateCustomerData) => {
      const request: CreateCustomerRequest = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        pricing_tier: data.pricing_tier as 'retail' | 'wholesale' | 'vip' | undefined,
      };
      const response = await mutation.mutateAsync(request);
      return transformCustomer(response);
    },
  } as UseMutationResult<Customer, Error, CreateCustomerData>;
}

/**
 * Hook to update an existing customer
 */
export function useUpdateCustomer(): UseMutationResult<
  Customer,
  Error,
  { id: string; data: UpdateCustomerData }
> {
  const mutation = useUpdateCustomerMutation();
  
  return {
    ...mutation,
    mutate: ((variables: { id: string; data: UpdateCustomerData }, options?: any) => {
      const request: UpdateCustomerRequest = {
        name: variables.data.name,
        email: variables.data.email,
        phone: variables.data.phone,
        pricing_tier: variables.data.pricing_tier as 'retail' | 'wholesale' | 'vip' | undefined,
      };
      mutation.mutate({ id: variables.id, data: request }, {
        ...options,
        onSuccess: (response: CustomerResponse, mutationVariables: { id: string; data: UpdateCustomerRequest }, context: unknown) => {
          options?.onSuccess?.(transformCustomer(response), variables, context);
        },
      });
    }) as any,
    mutateAsync: async ({ id, data }: { id: string; data: UpdateCustomerData }) => {
      const request: UpdateCustomerRequest = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        pricing_tier: data.pricing_tier as 'retail' | 'wholesale' | 'vip' | undefined,
      };
      const response = await mutation.mutateAsync({ id, data: request });
      return transformCustomer(response);
    },
  } as UseMutationResult<Customer, Error, { id: string; data: UpdateCustomerData }>;
}

/**
 * Hook to delete a customer
 */
export function useDeleteCustomer(): UseMutationResult<void, Error, string> {
  return useDeleteCustomerMutation();
}

/**
 * Hook to search customers
 * Client-side filtering on top of the customers query
 */
export function useCustomerSearch(searchTerm: string): UseQueryResult<Customer[], Error> {
  const query = useDomainCustomersQuery();
  
  const filteredData = query.data
    ?.map(transformCustomer)
    .filter((customer) => {
      if (!searchTerm) return true;
      const lowerSearch = searchTerm.toLowerCase();
      return (
        customer.name.toLowerCase().includes(lowerSearch) ||
        customer.email.toLowerCase().includes(lowerSearch) ||
        customer.phone.includes(searchTerm)
      );
    });

  return {
    ...query,
    data: filteredData,
  } as unknown as UseQueryResult<Customer[], Error>;
}
