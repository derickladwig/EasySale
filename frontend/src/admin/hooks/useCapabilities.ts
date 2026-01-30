import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@common/api/client';

/**
 * Accounting mode enum matching backend
 */
export type AccountingMode = 'disabled' | 'export_only' | 'sync';

/**
 * Feature flags from backend
 */
export interface FeatureFlags {
  export: boolean;
  sync: boolean;
}

/**
 * Capabilities response from GET /api/capabilities
 */
export interface Capabilities {
  accounting_mode: AccountingMode;
  features: FeatureFlags;
  version: string;
  build_hash: string;
}

/**
 * Hook to fetch backend capabilities
 * 
 * Fetches from GET /api/capabilities endpoint to determine which features
 * are available in the backend. Used for capability-driven navigation visibility.
 * 
 * @returns Query result with capabilities data
 * 
 * @example
 * ```tsx
 * const { data: capabilities, isLoading } = useCapabilities();
 * 
 * if (capabilities?.features.export) {
 *   // Show export navigation item
 * }
 * ```
 */
export function useCapabilities() {
  return useQuery<Capabilities>({
    queryKey: ['capabilities'],
    queryFn: async () => {
      const response = await apiClient.get<Capabilities>('/api/capabilities');
      return response;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2, // Retry failed requests twice
  });
}
