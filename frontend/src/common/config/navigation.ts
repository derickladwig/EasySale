/**
 * @deprecated QUARANTINED CONFIG - DO NOT USE IN NEW CODE
 * 
 * This configuration has been superseded by tenant config navigation.
 * 
 * Quarantine Location: frontend/src/legacy_quarantine/config/navigation.ts
 * Quarantined: 2026-01-26
 * Reason: Hardcoded nav items - should use tenant config
 * Replacement: config.navigation.main from ConfigProvider (useConfig hook)
 * 
 * Migration Guide:
 * - Use useConfig() hook to get navigation items
 * - Navigation items are defined in tenant config files
 * - See frontend/src/config/index.tsx for ConfigProvider
 * 
 * This file is preserved per NO DELETES policy but should not be imported.
 */

import { Permission } from '../contexts/PermissionsContext';

export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  permission: Permission;
  description?: string;
  badge?: number; // Badge count for notifications
  badgeKey?: string; // Key to identify which badge count to fetch dynamically
  capability?: string; // Optional capability requirement - item only shown if this capability is enabled
}

/**
 * @deprecated Use tenant config navigation instead.
 * 
 * Main navigation configuration with permission requirements.
 * Each item requires a specific permission to be visible.
 */
export const navigationItems: NavigationItem[] = [
  {
    path: '/sell',
    label: 'Sell',
    icon: '🛒',
    permission: 'access_sell',
    description: 'Point of sale and checkout',
  },
  {
    path: '/lookup',
    label: 'Lookup',
    icon: '🔍',
    permission: 'access_sell', // Lookup is part of sell workflow
    description: 'Product search and information',
  },
  {
    path: '/inventory',
    label: 'Inventory',
    icon: '📦',
    permission: 'access_inventory',
    description: 'Inventory and stock management',
  },
  {
    path: '/documents',
    label: 'Documents',
    icon: '📄',
    permission: 'access_inventory',
    description: 'Document management and OCR processing',
  },
  {
    path: '/customers',
    label: 'Customers',
    icon: '👥',
    permission: 'access_sell', // Customer management is part of sell workflow
    description: 'Customer profiles and history',
  },
  {
    path: '/review',
    label: 'Review',
    icon: '📋',
    permission: 'review_vendor_bills',
    description: 'Review and approve vendor bills',
    badgeKey: 'needsReview', // Dynamic badge from document stats
  },
  {
    path: '/reporting',
    label: 'Reporting',
    icon: '📊',
    permission: 'access_admin', // Reports require admin access
    description: 'Sales reports and analytics',
  },
  {
    path: '/admin',
    label: 'Admin',
    icon: '🔧',
    permission: 'access_admin',
    description: 'System administration',
  },
  {
    path: '/forms',
    label: 'Forms',
    icon: '📝',
    permission: 'access_admin',
    description: 'Form templates and management',
  },
  {
    path: '/exports',
    label: 'Exports',
    icon: '📤',
    permission: 'access_admin',
    description: 'Export approved cases to various formats',
    capability: 'export', // Only show if export capability is enabled
  },
  {
    path: '/admin/capabilities',
    label: 'Capabilities',
    icon: '🔌',
    permission: 'access_admin',
    description: 'View system capabilities and UI wiring status',
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: '⚙️',
    permission: 'access_admin',
    description: 'System configuration and preferences',
  },
];

/**
 * Filter navigation items based on user permissions and backend capabilities.
 * 
 * @param items - Navigation items to filter
 * @param hasPermission - Function to check if user has a permission
 * @param capabilities - Optional capabilities object from backend
 * @returns Filtered navigation items
 */
export function filterNavigationByPermissions(
  items: NavigationItem[],
  hasPermission: (permission: Permission) => boolean,
  capabilities?: { features: { export: boolean; sync: boolean } }
): NavigationItem[] {
  return items.filter((item) => {
    // Check permission first
    if (!hasPermission(item.permission)) {
      return false;
    }
    
    // If item has capability requirement, check if it's enabled
    if (item.capability && capabilities) {
      // Map capability names to backend features
      // For now, we only have 'export' and 'sync' features from backend
      if (item.capability === 'export') {
        return capabilities.features.export;
      }
      if (item.capability === 'sync') {
        return capabilities.features.sync;
      }
      // If capability is specified but not recognized, show the item
      // (fail open to avoid hiding features due to capability name mismatches)
      return true;
    }
    
    return true;
  });
}
