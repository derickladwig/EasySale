// Settings data hooks using React Query

import { useQuery, UseQueryResult } from '@tanstack/react-query';

// Integration type (matches the interface in IntegrationsPage.tsx)
export interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync?: string;
  enabled: boolean;
}

/**
 * Hook to fetch all integrations
 *
 * @returns Query result with integrations array
 *
 * @example
 * const { data: integrations = [], isLoading, error } = useIntegrationsQuery();
 */
export function useIntegrationsQuery(): UseQueryResult<Integration[], Error> {
  return useQuery({
    queryKey: ['integrations'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/integrations');
        if (!response.ok) {
          // If endpoint doesn't exist yet, return empty array
          if (response.status === 404) {
            return [];
          }
          throw new Error('Failed to fetch integrations');
        }
        return response.json();
      } catch (error) {
        // Fallback to empty array if API not available
        console.warn('Integrations API not available, using fallback:', error);
        return [];
      }
    },
  });
}

// RemoteStore type (matches the interface in NetworkPage.tsx)
export interface RemoteStore {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  status: 'connected' | 'disconnected' | 'error';
  last_sync: string;
  is_active: boolean;
}

/**
 * Hook to fetch all remote stores
 *
 * @returns Query result with remote stores array
 *
 * @example
 * const { data: remoteStores = [], isLoading, error } = useRemoteStoresQuery();
 */
export function useRemoteStoresQuery(): UseQueryResult<RemoteStore[], Error> {
  return useQuery({
    queryKey: ['remoteStores'],
    queryFn: async () => {
      // TODO: Replace with actual API call when backend is ready
      // const response = await fetch('/api/network/remote-stores');
      // if (!response.ok) throw new Error('Failed to fetch remote stores');
      // return response.json();

      // For now, return empty array to simulate no data
      return [];
    },
  });
}
