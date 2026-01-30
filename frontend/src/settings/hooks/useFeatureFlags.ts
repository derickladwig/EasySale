import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@common/api/client';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
}

export interface UpdateFeatureFlagRequest {
  enabled: boolean;
}

/**
 * Fetch all feature flags from the backend
 */
export function useFeatureFlags() {
  return useQuery<FeatureFlag[]>({
    queryKey: ['feature-flags'],
    queryFn: async () => {
      const response = await apiClient.get<FeatureFlag[]>('/api/feature-flags');
      return response;
    },
  });
}

/**
 * Update a feature flag
 */
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, enabled }: { name: string; enabled: boolean }) => {
      const response = await apiClient.put<FeatureFlag>(`/api/feature-flags/${name}`, { enabled });
      return response;
    },
    onSuccess: () => {
      // Invalidate and refetch feature flags
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
    },
  });
}
