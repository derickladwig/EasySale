/**
 * Settings System Types
 */

export type SettingType = 'policy' | 'preference';
export type SettingScope = 'store' | 'user' | 'default';

export type SettingGroup =
  | 'personal'
  | 'stores-tax'
  | 'sell-payments'
  | 'inventory-products'
  | 'customers-ar'
  | 'users-security'
  | 'devices-offline'
  | 'integrations'
  | 'advanced';

export type SettingControlType = 'text' | 'number' | 'select' | 'toggle' | 'textarea';

export interface SettingDefinition<T = any> {
  key: string;
  label: string;
  description: string;
  type: SettingType;
  group: SettingGroup;
  defaultValue: T;
  allowedScopes: SettingScope[];
  validator?: (value: T) => boolean;
  schemaVersion?: number;
  // UI-specific fields
  controlType?: SettingControlType;
  category?: string;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  helperText?: string;
}

export interface SettingValue<T = any> {
  value: T;
  scope: SettingScope;
}

export interface SettingPreferences<T = any> {
  store?: T;
  user?: T;
}

export const SETTING_GROUPS: Array<{ id: SettingGroup; label: string; description: string }> = [
  {
    id: 'personal',
    label: 'Personal',
    description: 'Your personal profile and preferences',
  },
  {
    id: 'stores-tax',
    label: 'Stores & Tax',
    description: 'Store configuration and tax rules',
  },
  {
    id: 'sell-payments',
    label: 'Sell & Payments',
    description: 'Sales and payment processing settings',
  },
  {
    id: 'inventory-products',
    label: 'Inventory & Products',
    description: 'Inventory management and product configuration',
  },
  {
    id: 'customers-ar',
    label: 'Customers & AR',
    description: 'Customer management and accounts receivable',
  },
  {
    id: 'users-security',
    label: 'Users & Security',
    description: 'User management and security settings',
  },
  {
    id: 'devices-offline',
    label: 'Devices & Offline',
    description: 'Hardware devices and offline operation',
  },
  {
    id: 'integrations',
    label: 'Integrations',
    description: 'Third-party integrations and API settings',
  },
  {
    id: 'advanced',
    label: 'Advanced',
    description: 'Advanced system configuration',
  },
];
