/**
 * Settings Domain - Public API
 * 
 * Re-exports all public types and hooks for the settings domain
 */

// Types
export type {
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

// API
export { settingsApi } from './api';

// React Query hooks
export {
  settingsKeys,
  usePreferencesQuery,
  useUpdatePreferencesMutation,
  useLocalizationQuery,
  useUpdateLocalizationMutation,
  useNetworkSettingsQuery,
  useUpdateNetworkMutation,
  usePerformanceSettingsQuery,
  useUpdatePerformanceMutation,
  useResolvedSettingsQuery,
  useSettingsListQuery,
  useSettingQuery,
  useCreateSettingMutation,
  useUpdateSettingMutation,
  useDeleteSettingMutation,
  useBulkUpdateSettingsMutation,
} from './hooks';
