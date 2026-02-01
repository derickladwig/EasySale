/**
 * Settings API Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsApi } from '../api';
import { apiClient } from '@common/api/client';

// Mock the API client
vi.mock('@common/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('settingsApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should fetch user preferences', async () => {
      const mockPreferences = {
        user_id: 'user-1',
        theme: 'dark',
        email_notifications: true,
        desktop_notifications: false,
        tenant_id: 'tenant-1',
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockPreferences);

      const result = await settingsApi.getPreferences();

      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/preferences');
      expect(result).toEqual(mockPreferences);
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const update = { theme: 'light' };
      const mockResponse = {
        user_id: 'user-1',
        theme: 'light',
        email_notifications: true,
        desktop_notifications: false,
        tenant_id: 'tenant-1',
      };

      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await settingsApi.updatePreferences(update);

      expect(apiClient.put).toHaveBeenCalledWith('/api/settings/preferences', update);
      expect(result.theme).toBe('light');
    });
  });

  describe('getLocalization', () => {
    it('should fetch localization settings', async () => {
      const mockLocalization = {
        tenant_id: 'tenant-1',
        language: 'en',
        currency: 'USD',
        currency_symbol: '$',
        currency_position: 'before',
        decimal_places: 2,
        tax_enabled: true,
        tax_rate: 13,
        tax_name: 'HST',
        date_format: 'MM/DD/YYYY',
        time_format: '12h',
        timezone: 'America/Toronto',
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockLocalization);

      const result = await settingsApi.getLocalization();

      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/localization');
      expect(result).toEqual(mockLocalization);
    });
  });

  describe('updateLocalization', () => {
    it('should update localization settings', async () => {
      const update = { tax_rate: 15 };
      const mockResponse = {
        tenant_id: 'tenant-1',
        language: 'en',
        currency: 'USD',
        tax_rate: 15,
      };

      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await settingsApi.updateLocalization(update);

      expect(apiClient.put).toHaveBeenCalledWith('/api/settings/localization', update);
      expect(result.tax_rate).toBe(15);
    });
  });

  describe('getNetwork', () => {
    it('should fetch network settings', async () => {
      const mockNetwork = {
        tenant_id: 'tenant-1',
        sync_enabled: true,
        sync_interval: 300,
        backup_enabled: true,
        backup_interval: 3600,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockNetwork);

      const result = await settingsApi.getNetwork();

      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/network');
      expect(result).toEqual(mockNetwork);
    });
  });

  describe('updateNetwork', () => {
    it('should update network settings', async () => {
      const update = { sync_interval: 600 };
      const mockResponse = {
        tenant_id: 'tenant-1',
        sync_enabled: true,
        sync_interval: 600,
      };

      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await settingsApi.updateNetwork(update);

      expect(apiClient.put).toHaveBeenCalledWith('/api/settings/network', update);
      expect(result.sync_interval).toBe(600);
    });
  });

  describe('getPerformance', () => {
    it('should fetch performance settings', async () => {
      const mockPerformance = {
        tenant_id: 'tenant-1',
        cache_enabled: true,
        cache_ttl: 3600,
        batch_size: 100,
        max_concurrent_requests: 5,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockPerformance);

      const result = await settingsApi.getPerformance();

      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/performance');
      expect(result).toEqual(mockPerformance);
    });
  });

  describe('getResolved', () => {
    it('should fetch resolved settings for a scope', async () => {
      const mockResolved = {
        theme: 'dark',
        language: 'en',
        tax_rate: 13,
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResolved);

      const result = await settingsApi.getResolved('user');

      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/resolution/user');
      expect(result).toEqual(mockResolved);
    });
  });

  describe('list', () => {
    it('should list all settings', async () => {
      const mockSettings = [
        { key: 'theme', value: 'dark', scope: 'user', tenant_id: 'tenant-1' },
        { key: 'language', value: 'en', scope: 'global', tenant_id: 'tenant-1' },
      ];

      vi.mocked(apiClient.get).mockResolvedValue(mockSettings);

      const result = await settingsApi.list();

      expect(apiClient.get).toHaveBeenCalledWith('/api/settings');
      expect(result).toHaveLength(2);
    });
  });

  describe('get', () => {
    it('should get a specific setting', async () => {
      const mockSetting = {
        key: 'theme',
        value: 'dark',
        scope: 'user',
        tenant_id: 'tenant-1',
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockSetting);

      const result = await settingsApi.get('theme');

      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/theme');
      expect(result.key).toBe('theme');
    });
  });

  describe('create', () => {
    it('should create a new setting', async () => {
      const newSetting = {
        key: 'custom_setting',
        value: 'custom_value',
        scope: 'store' as const,
      };

      const mockResponse = {
        ...newSetting,
        tenant_id: 'tenant-1',
        created_at: '2026-01-30T00:00:00Z',
        updated_at: '2026-01-30T00:00:00Z',
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await settingsApi.create(newSetting);

      expect(apiClient.post).toHaveBeenCalledWith('/api/settings', newSetting);
      expect(result.key).toBe('custom_setting');
    });
  });

  describe('update', () => {
    it('should update an existing setting', async () => {
      const update = { value: 'new_value' };
      const mockResponse = {
        key: 'custom_setting',
        value: 'new_value',
        scope: 'store',
        tenant_id: 'tenant-1',
      };

      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await settingsApi.update('custom_setting', update);

      expect(apiClient.put).toHaveBeenCalledWith('/api/settings/custom_setting', update);
      expect(result.value).toBe('new_value');
    });
  });

  describe('delete', () => {
    it('should delete a setting', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined);

      await settingsApi.delete('custom_setting');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/settings/custom_setting');
    });
  });

  describe('bulkUpdate', () => {
    it('should bulk update settings', async () => {
      const settings = [
        { key: 'setting1', value: 'value1', scope: 'user' as const },
        { key: 'setting2', value: 'value2', scope: 'store' as const },
      ];

      const mockResponse = settings.map(s => ({
        ...s,
        tenant_id: 'tenant-1',
        created_at: '2026-01-30T00:00:00Z',
        updated_at: '2026-01-30T00:00:00Z',
      }));

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await settingsApi.bulkUpdate(settings);

      expect(apiClient.post).toHaveBeenCalledWith('/api/settings/bulk', { settings });
      expect(result).toHaveLength(2);
    });
  });
});
