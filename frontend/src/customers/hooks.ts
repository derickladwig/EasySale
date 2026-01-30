// Customer data hooks using React Query

import { useQuery, UseQueryResult } from '@tanstack/react-query';

// Customer type (matches the interface in CustomersPage.tsx)
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
 *
 * @returns Query result with customers array
 *
 * @example
 * const { data: customers = [], isLoading, error } = useCustomersQuery();
 */
export function useCustomersQuery(): UseQueryResult<Customer[], Error> {
  return useQuery({
    queryKey: ['customers'],
    queryFn: async () => {
      // TODO: Replace with actual API call when backend is ready
      // const response = await fetch('/api/customers');
      // if (!response.ok) throw new Error('Failed to fetch customers');
      // return response.json();

      // For now, return empty array to simulate no data
      return [];
    },
  });
}
