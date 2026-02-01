/**
 * Settings Domain Types
 */

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
  auto_resolve_conflicts?: boolean;
  offline_mode_enabled?: boolean;
  max_queue_size?: number;
}

export interface PerformanceSettings {
  tenant_id: string;
  cache_enabled: boolean;
  cache_ttl: number;
  batch_size: number;
  max_concurrent_requests: number;
  monitoring_enabled?: boolean;
  monitoring_url?: string;
  sentry_dsn?: string;
}

export interface Setting {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  scope: SettingScope;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export type SettingScope = 'user' | 'station' | 'store' | 'global';

export interface ResolvedSettings {
  [key: string]: unknown;
}

export interface CreateSettingRequest {
  key: string;
  value: string | number | boolean | Record<string, unknown>;
  scope: SettingScope;
}

export interface UpdateSettingRequest {
  value: string | number | boolean | Record<string, unknown>;
}
