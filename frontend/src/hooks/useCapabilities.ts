import { useQuery } from '@tanstack/react-query';

/**
 * Capabilities response from backend
 */
export interface Capabilities {
  accounting_mode: 'disabled' | 'export_only' | 'sync';
  features: {
    export: boolean;
    sync: boolean;
  };
  version: string;
  build_hash: string;
}

/**
 * Hook to fetch backend capabilities
 * 
 * Queries the /api/capabilities endpoint to determine which features
 * are available in the current backend build variant (Lite, Export, Full).
 * 
 * This allows the frontend to adapt its UI based on backend capabilities:
 * - Hide export buttons in Lite build
 * - Hide OCR features when not available
 * - Show appropriate feature unavailable messages
 * 
 * @returns Query result with capabilities data
 */
export const useCapabilities = () => {
  return useQuery<Capabilities>({
    queryKey: ['capabilities'],
    queryFn: async () => {
      const response = await fetch('/api/capabilities');
      if (!response.ok) {
        throw new Error('Failed to fetch capabilities');
      }
      return response.json();
    },
    staleTime: Infinity, // Capabilities don't change at runtime
    gcTime: Infinity, // Keep in cache forever
    retry: 3, // Retry on failure (important for startup)
    retryDelay: 1000, // 1 second between retries
  });
};

/**
 * Hook to check if a specific feature is available
 * 
 * @param feature - Feature name to check ('export' or 'sync')
 * @returns Boolean indicating if feature is available, or undefined if loading
 */
export const useFeatureAvailable = (feature: 'export' | 'sync'): boolean | undefined => {
  const { data, isLoading } = useCapabilities();
  
  if (isLoading || !data) {
    return undefined;
  }
  
  return data.features[feature];
};

/**
 * Hook to check if export features are available
 * 
 * @returns Boolean indicating if export is available, or undefined if loading
 */
export const useExportAvailable = (): boolean | undefined => {
  return useFeatureAvailable('export');
};

/**
 * Hook to check if sync features are available
 * 
 * @returns Boolean indicating if sync is available, or undefined if loading
 */
export const useSyncAvailable = (): boolean | undefined => {
  return useFeatureAvailable('sync');
};

/**
 * Hook to get accounting mode
 * 
 * @returns Accounting mode string, or undefined if loading
 */
export const useAccountingMode = (): Capabilities['accounting_mode'] | undefined => {
  const { data, isLoading } = useCapabilities();
  
  if (isLoading || !data) {
    return undefined;
  }
  
  return data.accounting_mode;
};
