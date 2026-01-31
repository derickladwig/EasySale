/**
 * Hook for fetching tax rules data
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@common/api/client';

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  category: string | null;
  is_default: boolean;
  store_id: string;
}

interface TaxRulesResponse {
  rules: TaxRule[];
}

export const useTaxRulesQuery = () => {
  return useQuery({
    queryKey: ['tax-rules'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<TaxRulesResponse>('/api/settings/tax-rules');
        return response.rules;
      } catch {
        // Return default tax rule if API fails
        return [{
          id: 'default',
          name: 'Default Tax',
          rate: 13, // 13% default
          category: null,
          is_default: true,
          store_id: 'default',
        }] as TaxRule[];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Get the applicable tax rate for a given category
 */
export const getApplicableTaxRate = (rules: TaxRule[], category?: string): number => {
  if (!rules || rules.length === 0) {
    return 13; // Default 13%
  }
  
  // First try to find category-specific rule
  if (category) {
    const categoryRule = rules.find(r => r.category === category);
    if (categoryRule) {
      return categoryRule.rate;
    }
  }
  
  // Fall back to default rule
  const defaultRule = rules.find(r => r.is_default);
  return defaultRule?.rate ?? 13;
};
