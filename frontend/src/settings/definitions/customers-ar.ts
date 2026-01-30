/**
 * Customers & AR Settings Definitions
 * Group: Customer management and accounts receivable
 */

import { SettingDefinition } from '../types';

export const customersArSettings: SettingDefinition[] = [
  {
    key: 'customers.require_phone',
    label: 'Require Phone Number',
    description: 'Require phone number when creating customers',
    type: 'policy',
    group: 'customers-ar',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'customers.require_email',
    label: 'Require Email',
    description: 'Require email address when creating customers',
    type: 'policy',
    group: 'customers-ar',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'customers.loyalty_enabled',
    label: 'Loyalty Program Enabled',
    description: 'Enable customer loyalty points program',
    type: 'policy',
    group: 'customers-ar',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'customers.loyalty_points_per_dollar',
    label: 'Loyalty Points Per Dollar',
    description: 'Number of loyalty points earned per dollar spent',
    type: 'policy',
    group: 'customers-ar',
    defaultValue: 1,
    allowedScopes: ['store', 'default'],
    validator: (value: number) => value >= 0,
    schemaVersion: 1,
  },
  {
    key: 'ar.credit_limit_enabled',
    label: 'Credit Limit Enabled',
    description: 'Enable credit limits for customers',
    type: 'policy',
    group: 'customers-ar',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'ar.default_credit_limit',
    label: 'Default Credit Limit',
    description: 'Default credit limit for new customers',
    type: 'policy',
    group: 'customers-ar',
    defaultValue: 1000,
    allowedScopes: ['store', 'default'],
    validator: (value: number) => value >= 0,
    schemaVersion: 1,
  },
  {
    key: 'ar.payment_terms_days',
    label: 'Payment Terms (Days)',
    description: 'Default payment terms in days',
    type: 'policy',
    group: 'customers-ar',
    defaultValue: 30,
    allowedScopes: ['store', 'default'],
    validator: (value: number) => value >= 0,
    schemaVersion: 1,
  },
];
