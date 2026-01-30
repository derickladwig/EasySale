/**
 * Settings Definitions Index
 * Exports all setting definitions organized by group
 */

import { personalSettings } from './personal';
import { storesTaxSettings } from './stores-tax';
import { sellPaymentsSettings } from './sell-payments';
import { inventoryProductsSettings } from './inventory-products';
import { customersArSettings } from './customers-ar';
import { usersSecuritySettings } from './users-security';
import { devicesOfflineSettings } from './devices-offline';
import { integrationsSettings } from './integrations';
import { advancedSettings } from './advanced';
import { SettingDefinition } from '../types';

/**
 * All setting definitions organized by group
 */
export const allSettingDefinitions: SettingDefinition[] = [
  ...personalSettings,
  ...storesTaxSettings,
  ...sellPaymentsSettings,
  ...inventoryProductsSettings,
  ...customersArSettings,
  ...usersSecuritySettings,
  ...devicesOfflineSettings,
  ...integrationsSettings,
  ...advancedSettings,
];

/**
 * Setting definitions grouped by category
 */
export const settingsByGroup = {
  personal: personalSettings,
  'stores-tax': storesTaxSettings,
  'sell-payments': sellPaymentsSettings,
  'inventory-products': inventoryProductsSettings,
  'customers-ar': customersArSettings,
  'users-security': usersSecuritySettings,
  'devices-offline': devicesOfflineSettings,
  integrations: integrationsSettings,
  advanced: advancedSettings,
};

/**
 * Quick lookup map for setting definitions by key
 */
export const settingDefinitionsMap = new Map<string, SettingDefinition>(
  allSettingDefinitions.map((def) => [def.key, def])
);

export {
  personalSettings,
  storesTaxSettings,
  sellPaymentsSettings,
  inventoryProductsSettings,
  customersArSettings,
  usersSecuritySettings,
  devicesOfflineSettings,
  integrationsSettings,
  advancedSettings,
};
