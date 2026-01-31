import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@common/components/molecules/Toast';
import { settingsApi } from '../services/settingsApi';
import { getErrorMessage } from '../common/utils/errorUtils';

// User Preferences Hook
export const useUserPreferences = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['settings', 'preferences'],
    queryFn: settingsApi.getPreferences,
  });

  const mutation = useMutation({
    mutationFn: settingsApi.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'preferences'] });
      toast.success('Preferences updated successfully');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error) || 'Failed to update preferences';
      toast.error(message);
    },
  });

  return {
    preferences: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updatePreferences: mutation.mutate,
    isUpdating: mutation.isPending,
  };
};

// Localization Settings Hook
export const useLocalizationSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['settings', 'localization'],
    queryFn: settingsApi.getLocalizationSettings,
  });

  const mutation = useMutation({
    mutationFn: settingsApi.updateLocalizationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'localization'] });
      toast.success('Localization settings updated successfully');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error) || 'Failed to update localization settings';
      toast.error(message);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: mutation.mutate,
    isUpdating: mutation.isPending,
  };
};

// Network Settings Hook
export const useNetworkSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['settings', 'network'],
    queryFn: settingsApi.getNetworkSettings,
  });

  const mutation = useMutation({
    mutationFn: settingsApi.updateNetworkSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'network'] });
      toast.success('Network settings updated successfully');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error) || 'Failed to update network settings';
      toast.error(message);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: mutation.mutate,
    isUpdating: mutation.isPending,
  };
};

// Performance Settings Hook
export const usePerformanceSettings = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['settings', 'performance'],
    queryFn: settingsApi.getPerformanceSettings,
  });

  const mutation = useMutation({
    mutationFn: settingsApi.updatePerformanceSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'performance'] });
      toast.success('Performance settings updated successfully');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error) || 'Failed to update performance settings';
      toast.error(message);
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: mutation.mutate,
    isUpdating: mutation.isPending,
  };
};
