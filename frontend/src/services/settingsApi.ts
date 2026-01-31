import axios from 'axios';

// Determine API base URL dynamically
// Use relative URLs to go through Vite proxy (dev) or nginx proxy (prod)
// This ensures cookies are sent correctly (same-origin requests)
function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Use relative URLs - works in both dev (Vite proxy) and prod (nginx proxy)
  return '';
}

/**
 * Get CSRF token from cookie for state-changing requests
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf_token') {
      return decodeURIComponent(value);
    }
  }
  return null;
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include httpOnly cookies for authentication
});

// Add CSRF token to state-changing requests
api.interceptors.request.use((config) => {
  const method = (config.method || 'get').toUpperCase();
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

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

// API Functions
export const settingsApi = {
  // User Preferences
  async getPreferences(): Promise<UserPreferences> {
    const response = await api.get('/api/settings/preferences');
    return response.data;
  },

  async updatePreferences(preferences: Partial<UserPreferences>): Promise<UserPreferences> {
    const response = await api.put('/api/settings/preferences', preferences);
    return response.data;
  },

  // Localization Settings
  async getLocalizationSettings(): Promise<LocalizationSettings> {
    const response = await api.get('/api/settings/localization');
    return response.data;
  },

  async updateLocalizationSettings(settings: Partial<LocalizationSettings>): Promise<LocalizationSettings> {
    const response = await api.put('/api/settings/localization', settings);
    return response.data;
  },

  // Network Settings
  async getNetworkSettings(): Promise<NetworkSettings> {
    const response = await api.get('/api/settings/network');
    return response.data;
  },

  async updateNetworkSettings(settings: Partial<NetworkSettings>): Promise<NetworkSettings> {
    const response = await api.put('/api/settings/network', settings);
    return response.data;
  },

  // Performance Settings
  async getPerformanceSettings(): Promise<PerformanceSettings> {
    const response = await api.get('/api/settings/performance');
    return response.data;
  },

  async updatePerformanceSettings(settings: Partial<PerformanceSettings>): Promise<PerformanceSettings> {
    const response = await api.put('/api/settings/performance', settings);
    return response.data;
  },

  // Settings Resolution (NEW - Missing API Clients)
  async getSettingsResolution(scope: 'user' | 'station' | 'store' | 'global'): Promise<ResolvedSettings> {
    const response = await api.get(`/api/settings/resolution/${scope}`);
    return response.data;
  },

  // Generic Settings CRUD (NEW - Missing API Clients)
  async getAllSettings(): Promise<Setting[]> {
    const response = await api.get('/api/settings');
    return response.data;
  },

  async createSetting(setting: CreateSettingRequest): Promise<Setting> {
    const response = await api.post('/api/settings', setting);
    return response.data;
  },

  async getSetting(key: string): Promise<Setting> {
    const response = await api.get(`/api/settings/${key}`);
    return response.data;
  },

  async updateSetting(key: string, update: UpdateSettingRequest): Promise<Setting> {
    const response = await api.put(`/api/settings/${key}`, update);
    return response.data;
  },

  async deleteSetting(key: string): Promise<void> {
    await api.delete(`/api/settings/${key}`);
  },

  // Bulk Operations (NEW - Missing API Clients)
  async bulkUpdateSettings(settings: CreateSettingRequest[]): Promise<Setting[]> {
    const response = await api.post('/api/settings/bulk', { settings });
    return response.data;
  },

  // Export Settings (NEW - Missing API Clients)
  async exportSettings(): Promise<Blob> {
    const response = await api.get('/api/settings/export', {
      responseType: 'blob'
    });
    return response.data;
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
