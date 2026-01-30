/**
 * Integrations Settings Definitions
 * Group: Third-party integrations and API settings
 */

import { SettingDefinition } from '../types';

export const integrationsSettings: SettingDefinition[] = [
  {
    key: 'integrations.quickbooks_enabled',
    label: 'QuickBooks Integration',
    description: 'Enable QuickBooks accounting integration',
    type: 'policy',
    group: 'integrations',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'integrations.quickbooks_company_id',
    label: 'QuickBooks Company ID',
    description: 'QuickBooks company identifier',
    type: 'policy',
    group: 'integrations',
    defaultValue: '',
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'integrations.woocommerce_enabled',
    label: 'WooCommerce Integration',
    description: 'Enable WooCommerce e-commerce integration',
    type: 'policy',
    group: 'integrations',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'integrations.woocommerce_url',
    label: 'WooCommerce Store URL',
    description: 'URL of your WooCommerce store',
    type: 'policy',
    group: 'integrations',
    defaultValue: '',
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'integrations.woocommerce_consumer_key',
    label: 'WooCommerce Consumer Key',
    description: 'WooCommerce API consumer key',
    type: 'policy',
    group: 'integrations',
    defaultValue: '',
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'integrations.woocommerce_consumer_secret',
    label: 'WooCommerce Consumer Secret',
    description: 'WooCommerce API consumer secret',
    type: 'policy',
    group: 'integrations',
    defaultValue: '',
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'integrations.stripe_enabled',
    label: 'Stripe Payments',
    description: 'Enable Stripe payment processing',
    type: 'policy',
    group: 'integrations',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'integrations.stripe_publishable_key',
    label: 'Stripe Publishable Key',
    description: 'Stripe API publishable key',
    type: 'policy',
    group: 'integrations',
    defaultValue: '',
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
];
