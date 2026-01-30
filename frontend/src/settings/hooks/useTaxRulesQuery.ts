/**
 * Hook for fetching tax rules data
 * This is a stub implementation that will be replaced with actual API calls
 */

export interface TaxRule {
  id: string;
  name: string;
  rate: number;
  category: string | null;
  is_default: boolean;
  store_id: string;
}

export const useTaxRulesQuery = () => {
  return {
    data: [] as TaxRule[],
    isLoading: false,
    error: null,
  };
};
