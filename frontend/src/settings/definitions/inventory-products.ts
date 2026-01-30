/**
 * Inventory & Products Settings Definitions
 * Group: Inventory management and product configuration
 */

import { SettingDefinition } from '../types';

export const inventoryProductsSettings: SettingDefinition[] = [
  {
    key: 'inventory.track_stock',
    label: 'Track Stock Levels',
    description: 'Enable inventory tracking for products',
    type: 'policy',
    group: 'inventory-products',
    defaultValue: true,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'inventory.low_stock_threshold',
    label: 'Low Stock Threshold',
    description: 'Alert when inventory falls below this quantity',
    type: 'policy',
    group: 'inventory-products',
    defaultValue: 10,
    allowedScopes: ['store', 'default'],
    validator: (value: number) => value >= 0,
    schemaVersion: 1,
  },
  {
    key: 'inventory.auto_reorder_enabled',
    label: 'Auto Reorder Enabled',
    description: 'Automatically create purchase orders when stock is low',
    type: 'policy',
    group: 'inventory-products',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'inventory.serial_number_tracking',
    label: 'Serial Number Tracking',
    description: 'Track individual serial numbers for products',
    type: 'policy',
    group: 'inventory-products',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'inventory.batch_tracking',
    label: 'Batch Tracking',
    description: 'Track products by batch or lot number',
    type: 'policy',
    group: 'inventory-products',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'products.require_barcode',
    label: 'Require Barcode',
    description: 'Require barcode for all products',
    type: 'policy',
    group: 'inventory-products',
    defaultValue: false,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
  {
    key: 'products.auto_generate_sku',
    label: 'Auto Generate SKU',
    description: 'Automatically generate SKU for new products',
    type: 'policy',
    group: 'inventory-products',
    defaultValue: true,
    allowedScopes: ['store', 'default'],
    schemaVersion: 1,
  },
];
