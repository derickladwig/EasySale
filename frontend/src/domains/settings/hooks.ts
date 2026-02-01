/**
 * Settings Domain React Query Hooks
 * 
 * Provides hooks for settings data fetching and mutations
 */

import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { settingsApi } from './api';
import type {
  UserPreferences,
  LocalizationSettings,
  NetworkSettings,
  PerformanceSettings,
  Setting,
  SettingScope,
  ResolvedSettings,
  CreateSettingRequest,
  UpdateSettingRequest,
} from './types';

// ============ Query Keys ============

export const settingsKeys = {
  all: ['settings'] as const,
  preferences: () => [...settingsKeys.all, 'preferences'] as const,
  localization: () => [...settingsKeys.all, 'localization'] as const,
  network: () => [...settingsKeys.all, 'network'] as const,
  performance: () => [...settingsKeys.all, 'performance'] as const,
  resolved: (scope: SettingScope) => [...settingsKeys.all, 'resolved', scope] as const,
  setting: (key: string) => [...settingsKeys.all, 'setting', key] as const,
};

// ============ User Preferences Hooks ============

/**
 * Hook to fetch user preferences
 */
export function usePreferencesQuery(): UseQueryResult<UserPreferences, Error> {
  return useQuery({
    queryKey: settingsKeys.preferences(),
    queryFn: settingsApi.getPreferences,
  });
}

/**
 * Hook to update user preferences
 */
export function useUpdatePreferencesMutation(): UseMutationResult<
  UserPreferences,
  Error,
  Partial<UserPreferences>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updatePreferences,
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.preferences(), data);
    },
  });
}

// ============ Localization Hooks ============

/**
 * Hook to fetch localization settings
 */
export function useLocalizationQuery(): UseQueryResult<LocalizationSettings, Error> {
  return useQuery({
    queryKey: settingsKeys.localization(),
    queryFn: settingsApi.getLocalization,
  });
}

/**
 * Hook to update localization settings
 */
export function useUpdateLocalizationMutation(): UseMutationResult<
  LocalizationSettings,
  Error,
  Partial<LocalizationSettings>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateLocalization,
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.localization(), data);
    },
  });
}

// ============ Network Hooks ============

/**
 * Hook to fetch network settings
 */
export function useNetworkSettingsQuery(): UseQueryResult<NetworkSettings, Error> {
  return useQuery({
    queryKey: settingsKeys.network(),
    queryFn: settingsApi.getNetwork,
  });
}

/**
 * Hook to update network settings
 */
export function useUpdateNetworkMutation(): UseMutationResult<
  NetworkSettings,
  Error,
  Partial<NetworkSettings>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateNetwork,
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.network(), data);
    },
  });
}

// ============ Performance Hooks ============

/**
 * Hook to fetch performance settings
 */
export function usePerformanceSettingsQuery(): UseQueryResult<PerformanceSettings, Error> {
  return useQuery({
    queryKey: settingsKeys.performance(),
    queryFn: settingsApi.getPerformance,
  });
}

/**
 * Hook to update performance settings
 */
export function useUpdatePerformanceMutation(): UseMutationResult<
  PerformanceSettings,
  Error,
  Partial<PerformanceSettings>
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updatePerformance,
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.performance(), data);
    },
  });
}

// ============ Settings Resolution Hooks ============

/**
 * Hook to fetch resolved settings for a scope
 */
export function useResolvedSettingsQuery(scope: SettingScope): UseQueryResult<ResolvedSettings, Error> {
  return useQuery({
    queryKey: settingsKeys.resolved(scope),
    queryFn: () => settingsApi.getResolved(scope),
  });
}

// ============ Generic Settings Hooks ============

/**
 * Hook to fetch all settings
 */
export function useSettingsListQuery(): UseQueryResult<Setting[], Error> {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: settingsApi.list,
  });
}

/**
 * Hook to fetch a specific setting
 */
export function useSettingQuery(key: string): UseQueryResult<Setting, Error> {
  return useQuery({
    queryKey: settingsKeys.setting(key),
    queryFn: () => settingsApi.get(key),
    enabled: !!key,
  });
}

/**
 * Hook to create a setting
 */
export function useCreateSettingMutation(): UseMutationResult<
  Setting,
  Error,
  CreateSettingRequest
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

/**
 * Hook to update a setting
 */
export function useUpdateSettingMutation(): UseMutationResult<
  Setting,
  Error,
  { key: string; update: UpdateSettingRequest }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, update }) => settingsApi.update(key, update),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      queryClient.setQueryData(settingsKeys.setting(data.key), data);
    },
  });
}

/**
 * Hook to delete a setting
 */
export function useDeleteSettingMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}

/**
 * Hook to bulk update settings
 */
export function useBulkUpdateSettingsMutation(): UseMutationResult<
  Setting[],
  Error,
  CreateSettingRequest[]
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.bulkUpdate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
