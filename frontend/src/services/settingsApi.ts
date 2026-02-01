import { apiClient } from '@common/api/client';

// Types
export interface UserPreferences {
  user_id: string;
  display_name?: string;
  email?: string;
  theme: string;
  email_notifications: boolean;
  desktop_notifications: boolean;
  tenant_id: string;
}

export interface LocalizationSettings {
  tenant_id: string;
  language: string;
  currency: string;
  currency_symbol: string;
  currency_position: string;
  decimal_places: number;
  tax_enabled: boolean;
  tax_rate: number;
  tax_name: string;
  date_format: string;
  time_format: string;
  timezone: string;
}

export interface NetworkSettings {
  tenant_id: string;
  sync_enabled: boolean;
  sync_interval: number;
  backup_enabled: boolean;
  backup_interval: number;
  remote_backup_url?: string;
}

export interface PerformanceSettings {
  tenant_id: string;
  cache_enabled: boolean;
  cache_ttl: number;
  batch_size: number;
  max_concurrent_requests: number;
}

// Settings Resolution Types
export interface ResolvedSettings {
  [key: string]: unknown;
}

export interface Setting {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  scope: 'user' | 'station' | 'store' | 'global';
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSettingRequest {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  scope: 'user' | 'station' | 'store' | 'global';
}

export interface UpdateSettingRequest {
  value: string | number | boolean | Record<string, unknown>;
}

// API Functions - Using centralized apiClient instead of axios
export const settingsApi = {
  // User Preferences
  async getPreferences(): Promise<UserPreferences> {
    return apiClient.get<UserPreferences>('/api/settings/preferences');
  },

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    return apiClient.put<UserPreferences>('/api/settings/preferences', preferences);
  },

  // Localization Settings
  async getLocalizationSettings(): Promise<LocalizationSettings> {
    return apiClient.get<LocalizationSettings>('/api/settings/localization');
  },

  async updateLocalizationSettings(settings: Partial<LocalizationSettings>): Promise<LocalizationSettings> {
    return apiClient.put<LocalizationSettings>('/api/settings/localization', settings);
  },

  // Network Settings
  async getNetworkSettings(): Promise<NetworkSettings> {
    return apiClient.get<NetworkSettings>('/api/settings/network');
  },

  async updateNetworkSettings(settings: Partial<NetworkSettings>): Promise<NetworkSettings> {
    return apiClient.put<NetworkSettings>('/api/settings/network', settings);
  },

  // Performance Settings
  async getPerformanceSettings(): Promise<PerformanceSettings> {
    return apiClient.get<PerformanceSettings>('/api/settings/performance');
  },

  async updatePerformanceSettings(settings: Partial<PerformanceSettings>): Promise<PerformanceSettings> {
    return apiClient.put<PerformanceSettings>('/api/settings/performance', settings);
  },

  // Settings Resolution
  async getSettingsResolution(scope: 'user' | 'station' | 'store' | 'global'): Promise<ResolvedSettings> {
    return apiClient.get<ResolvedSettings>(`/api/settings/resolution/${scope}`);
  },

  // Generic Settings CRUD
  async getAllSettings(): Promise<Setting[]> {
    return apiClient.get<Setting[]>('/api/settings');
  },

  async createSetting(setting: CreateSettingRequest): Promise<Setting> {
    return apiClient.post<Setting>('/api/settings', setting);
  },

  async getSetting(key: string): Promise<Setting> {
    return apiClient.get<Setting>(`/api/settings/${key}`);
  },

  async updateSetting(key: string, update: UpdateSettingRequest): Promise<Setting> {
    return apiClient.put<Setting>(`/api/settings/${key}`, update);
  },

  async deleteSetting(key: string): Promise<void> {
    return apiClient.delete(`/api/settings/${key}`);
  },

  // Bulk Operations
  async bulkUpdateSettings(settings: CreateSettingRequest[]): Promise<Setting[]> {
    return apiClient.post<Setting[]>('/api/settings/bulk', { settings });
  },

  // Export Settings - Note: For blob responses, we need special handling
  async exportSettings(): Promise<Blob> {
    const response = await fetch('/api/settings/export', {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }
    return response.blob();
  }
};

export interface UpdateUserPreferencesRequest {
  display_name?: string;
  email?: string;
  theme?: string;
  email_notifications?: boolean;
  desktop_notifications?: boolean;
}

export interface UpdateLocalizationRequest {
  language?: string;
  currency?: string;
  currency_symbol?: string;
  currency_position?: string;
  decimal_places?: number;
  tax_enabled?: boolean;
  tax_rate?: number;
  tax_name?: string;
  date_format?: string;
  time_format?: string;
  timezone?: string;
}

export interface UpdateNetworkRequest {
  sync_enabled?: boolean;
  sync_interval?: number;
  auto_resolve_conflicts?: boolean;
  offline_mode_enabled?: boolean;
  max_queue_size?: number;
}

export interface UpdatePerformanceRequest {
  monitoring_enabled?: boolean;
  monitoring_url?: string;
  sentry_dsn?: string;
}
