/**
 * Settings Domain API Client
 * 
 * Provides functions for interacting with settings endpoints
 */

import { apiClient } from '@common/api/client';
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

/**
 * Settings API object with all settings-related operations
 */
export const settingsApi = {
  // ============ User Preferences ============
  
  /**
   * Get current user preferences
   */
  getPreferences: (): Promise<UserPreferences> => 
    apiClient.get<UserPreferences>('/api/settings/preferences'),

  /**
   * Update user preferences
   */
  updatePreferences: (preferences: Partial<UserPreferences>): Promise<UserPreferences> =>
    apiClient.put<UserPreferences>('/api/settings/preferences', preferences),

  // ============ Localization Settings ============
  
  /**
   * Get localization settings
   */
  getLocalization: (): Promise<LocalizationSettings> =>
    apiClient.get<LocalizationSettings>('/api/settings/localization'),

  /**
   * Update localization settings
   */
  updateLocalization: (settings: Partial<LocalizationSettings>): Promise<LocalizationSettings> =>
    apiClient.put<LocalizationSettings>('/api/settings/localization', settings),

  // ============ Network Settings ============
  
  /**
   * Get network settings
   */
  getNetwork: (): Promise<NetworkSettings> =>
    apiClient.get<NetworkSettings>('/api/settings/network'),

  /**
   * Update network settings
   */
  updateNetwork: (settings: Partial<NetworkSettings>): Promise<NetworkSettings> =>
    apiClient.put<NetworkSettings>('/api/settings/network', settings),

  // ============ Performance Settings ============
  
  /**
   * Get performance settings
   */
  getPerformance: (): Promise<PerformanceSettings> =>
    apiClient.get<PerformanceSettings>('/api/settings/performance'),

  /**
   * Update performance settings
   */
  updatePerformance: (settings: Partial<PerformanceSettings>): Promise<PerformanceSettings> =>
    apiClient.put<PerformanceSettings>('/api/settings/performance', settings),

  // ============ Settings Resolution ============
  
  /**
   * Get resolved settings for a specific scope
   * Settings are resolved in order: user > station > store > global
   */
  getResolved: (scope: SettingScope): Promise<ResolvedSettings> =>
    apiClient.get<ResolvedSettings>(`/api/settings/resolution/${scope}`),

  // ============ Generic Settings CRUD ============
  
  /**
   * List all settings
   */
  list: (): Promise<Setting[]> =>
    apiClient.get<Setting[]>('/api/settings'),

  /**
   * Get a specific setting by key
   */
  get: (key: string): Promise<Setting> =>
    apiClient.get<Setting>(`/api/settings/${key}`),

  /**
   * Create a new setting
   */
  create: (setting: CreateSettingRequest): Promise<Setting> =>
    apiClient.post<Setting>('/api/settings', setting),

  /**
   * Update an existing setting
   */
  update: (key: string, update: UpdateSettingRequest): Promise<Setting> =>
    apiClient.put<Setting>(`/api/settings/${key}`, update),

  /**
   * Delete a setting
   */
  delete: (key: string): Promise<void> =>
    apiClient.delete(`/api/settings/${key}`),

  // ============ Bulk Operations ============
  
  /**
   * Bulk update multiple settings
   */
  bulkUpdate: (settings: CreateSettingRequest[]): Promise<Setting[]> =>
    apiClient.post<Setting[]>('/api/settings/bulk', { settings }),

  // ============ Export ============
  
  /**
   * Export settings as a downloadable file
   * Note: Uses fetch directly for blob response handling
   */
  export: async (): Promise<Blob> => {
    const response = await fetch('/api/settings/export', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    return response.blob();
  },
};

// Also export individual functions for tree-shaking
export const {
  getPreferences,
  updatePreferences,
  getLocalization,
  updateLocalization,
  getNetwork,
  updateNetwork,
  getPerformance,
  updatePerformance,
  getResolved,
} = settingsApi;
