/**
 * Settings Persistence Layer
 * Handles reading and writing settings to the backend API
 */

import axios from 'axios';

// Determine API base URL dynamically
// In production (behind nginx proxy), use relative URLs
// In development, use the same hostname as the frontend but with backend port
function getApiBaseUrl(): string {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  if (import.meta.env.PROD) {
    return ''; // Relative URLs - nginx will proxy to backend
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:8923`;
}

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface SettingRecord {
  id: number;
  key: string;
  value: string; // JSON-encoded value
  scope: 'global' | 'tenant' | 'store' | 'user';
  scope_id: string | null;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  created_at: string;
  updated_at: string;
}

export interface GetSettingsParams {
  keys?: string[]; // Filter by specific keys
  scope?: 'store' | 'user'; // Filter by scope
  scope_id?: string; // Filter by scope ID
}

export interface SetSettingParams {
  key: string;
  value: any;
  scope: 'store' | 'user'; // Only store and user scopes can be persisted
  scope_id: string; // store_id or user_id
}

export class SettingsPersistence {
  /**
   * Get settings from the backend
   * Returns settings for the specified scope and scope_id
   */
  async getSettings(params: GetSettingsParams = {}): Promise<SettingRecord[]> {
    const queryParams = new URLSearchParams();

    if (params.keys && params.keys.length > 0) {
      queryParams.append('keys', params.keys.join(','));
    }
    if (params.scope) {
      queryParams.append('scope', params.scope);
    }
    if (params.scope_id) {
      queryParams.append('scope_id', params.scope_id);
    }

    const response = await api.get(`/api/settings?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get a single setting value
   */
  async getSetting(key: string, scope: 'store' | 'user', scope_id: string): Promise<any | null> {
    try {
      const response = await api.get(`/api/settings/${key}`, {
        params: { scope, scope_id },
      });
      return this.parseValue(response.data.value, response.data.data_type);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null; // Setting not found
      }
      throw error;
    }
  }

  /**
   * Set a setting value
   * Only store and user scopes can be persisted (default lives in code)
   */
  async setSetting(params: SetSettingParams): Promise<void> {
    const { key, value, scope, scope_id } = params;

    // Determine data type
    const data_type = this.inferDataType(value);

    // Serialize value
    const serializedValue = this.serializeValue(value, data_type);

    await api.put(`/api/settings/${key}`, {
      value: serializedValue,
      scope,
      scope_id,
      data_type,
    });
  }

  /**
   * Delete a setting
   */
  async deleteSetting(key: string, scope: 'store' | 'user', scope_id: string): Promise<void> {
    await api.delete(`/api/settings/${key}`, {
      params: { scope, scope_id },
    });
  }

  /**
   * Get all settings for a user
   */
  async getUserSettings(user_id: string): Promise<Map<string, any>> {
    const records = await this.getSettings({ scope: 'user', scope_id: user_id });
    return this.recordsToMap(records);
  }

  /**
   * Get all settings for a store
   */
  async getStoreSettings(store_id: string): Promise<Map<string, any>> {
    const records = await this.getSettings({ scope: 'store', scope_id: store_id });
    return this.recordsToMap(records);
  }

  /**
   * Batch set multiple settings
   */
  async batchSetSettings(settings: SetSettingParams[]): Promise<void> {
    await api.post('/api/settings/batch', { settings });
  }

  /**
   * Parse value from string based on data type
   */
  private parseValue(value: string, data_type: string): any {
    switch (data_type) {
      case 'boolean':
        return value === 'true' || value === '1';
      case 'number':
        return parseFloat(value);
      case 'json':
        return JSON.parse(value);
      case 'string':
      default:
        return value;
    }
  }

  /**
   * Serialize value to string based on data type
   */
  private serializeValue(value: any, data_type: string): string {
    switch (data_type) {
      case 'boolean':
        return value ? 'true' : 'false';
      case 'number':
        return value.toString();
      case 'json':
        return JSON.stringify(value);
      case 'string':
      default:
        return String(value);
    }
  }

  /**
   * Infer data type from value
   */
  private inferDataType(value: any): 'string' | 'number' | 'boolean' | 'json' {
    if (typeof value === 'boolean') {
      return 'boolean';
    }
    if (typeof value === 'number') {
      return 'number';
    }
    if (typeof value === 'object' && value !== null) {
      return 'json';
    }
    return 'string';
  }

  /**
   * Convert setting records to a map
   */
  private recordsToMap(records: SettingRecord[]): Map<string, any> {
    const map = new Map<string, any>();
    records.forEach((record) => {
      const value = this.parseValue(record.value, record.data_type);
      map.set(record.key, value);
    });
    return map;
  }
}

// Export singleton instance
export const settingsPersistence = new SettingsPersistence();
