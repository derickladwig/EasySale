/**
 * Settings Search Index
 *
 * Provides searchable index of all settings across the application
 * with keywords, categories, and scope information.
 */

export interface SettingIndexEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  scope: 'global' | 'store' | 'station' | 'user';
  page: string;
  section?: string;
  keywords: string[];
  path: string; // Navigation path
}

export const SETTINGS_INDEX: SettingIndexEntry[] = [
  // Users & Roles
  {
    id: 'users',
    name: 'Users',
    description: 'Manage user accounts, roles, and permissions',
    category: 'Access Control',
    scope: 'global',
    page: 'Users & Roles',
    section: 'Users',
    keywords: ['user', 'account', 'employee', 'staff', 'login', 'access'],
    path: '/admin/users-roles?tab=users',
  },
  {
    id: 'roles',
    name: 'Roles',
    description: 'View and manage user roles and permissions',
    category: 'Access Control',
    scope: 'global',
    page: 'Users & Roles',
    section: 'Roles',
    keywords: ['role', 'permission', 'access', 'authorization', 'security'],
    path: '/admin/users-roles?tab=roles',
  },
  {
    id: 'audit-log',
    name: 'Audit Log',
    description: 'View system activity and changes',
    category: 'Security',
    scope: 'global',
    page: 'Users & Roles',
    section: 'Audit Log',
    keywords: ['audit', 'log', 'history', 'changes', 'activity', 'tracking'],
    path: '/admin/users-roles?tab=audit',
  },

  // Company & Stores
  {
    id: 'company-info',
    name: 'Company Information',
    description: 'Edit company name, address, and contact details',
    category: 'Organization',
    scope: 'global',
    page: 'Company & Stores',
    section: 'Company Info',
    keywords: ['company', 'business', 'organization', 'name', 'address', 'contact', 'logo'],
    path: '/admin/company-stores',
  },
  {
    id: 'stores',
    name: 'Stores',
    description: 'Manage store locations and settings',
    category: 'Organization',
    scope: 'store',
    page: 'Company & Stores',
    section: 'Stores',
    keywords: ['store', 'location', 'branch', 'outlet', 'shop'],
    path: '/admin/company-stores',
  },

  // Network
  {
    id: 'sync-settings',
    name: 'Sync Settings',
    description: 'Configure data synchronization between stores',
    category: 'Network',
    scope: 'global',
    page: 'Network',
    section: 'Sync',
    keywords: ['sync', 'synchronization', 'replication', 'network', 'connection'],
    path: '/admin/network',
  },
  {
    id: 'offline-mode',
    name: 'Offline Mode',
    description: 'Configure offline operation settings',
    category: 'Network',
    scope: 'station',
    page: 'Network',
    section: 'Offline',
    keywords: ['offline', 'disconnected', 'local', 'queue'],
    path: '/admin/network',
  },

  // Product Configuration
  {
    id: 'categories',
    name: 'Product Categories',
    description: 'Manage product categories and hierarchies',
    category: 'Products',
    scope: 'global',
    page: 'Product Config',
    section: 'Categories',
    keywords: ['category', 'product', 'classification', 'hierarchy', 'tree'],
    path: '/admin/product-config',
  },
  {
    id: 'units',
    name: 'Units of Measure',
    description: 'Define units for product quantities',
    category: 'Products',
    scope: 'global',
    page: 'Product Config',
    section: 'Units',
    keywords: ['unit', 'measure', 'quantity', 'uom', 'measurement'],
    path: '/admin/product-config',
  },
  {
    id: 'pricing-tiers',
    name: 'Pricing Tiers',
    description: 'Configure customer pricing levels',
    category: 'Products',
    scope: 'global',
    page: 'Product Config',
    section: 'Pricing',
    keywords: ['pricing', 'tier', 'level', 'discount', 'wholesale', 'retail'],
    path: '/admin/product-config',
  },

  // Data Management
  {
    id: 'backup',
    name: 'Backup',
    description: 'Configure automated backups and restore data',
    category: 'Data',
    scope: 'global',
    page: 'Data Management',
    section: 'Backup',
    keywords: ['backup', 'restore', 'recovery', 'archive', 'snapshot'],
    path: '/admin/data-management',
  },
  {
    id: 'export',
    name: 'Data Export',
    description: 'Export data to CSV or other formats',
    category: 'Data',
    scope: 'global',
    page: 'Data Management',
    section: 'Export',
    keywords: ['export', 'download', 'csv', 'data', 'extract'],
    path: '/admin/data-management',
  },
  {
    id: 'import',
    name: 'Data Import',
    description: 'Import data from CSV files',
    category: 'Data',
    scope: 'global',
    page: 'Data Management',
    section: 'Import',
    keywords: ['import', 'upload', 'csv', 'data', 'load'],
    path: '/admin/data-management',
  },

  // Tax Rules
  {
    id: 'tax-rates',
    name: 'Tax Rates',
    description: 'Configure tax rates by store and category',
    category: 'Financial',
    scope: 'store',
    page: 'Tax Rules',
    keywords: ['tax', 'rate', 'gst', 'hst', 'pst', 'vat', 'sales tax'],
    path: '/admin/tax-rules',
  },

  // Integrations
  {
    id: 'quickbooks',
    name: 'QuickBooks Integration',
    description: 'Connect to QuickBooks for accounting sync',
    category: 'Integrations',
    scope: 'global',
    page: 'Integrations',
    section: 'QuickBooks',
    keywords: ['quickbooks', 'accounting', 'sync', 'integration', 'financial'],
    path: '/admin/integrations',
  },
  {
    id: 'woocommerce',
    name: 'WooCommerce Integration',
    description: 'Sync products with WooCommerce store',
    category: 'Integrations',
    scope: 'global',
    page: 'Integrations',
    section: 'WooCommerce',
    keywords: ['woocommerce', 'ecommerce', 'online', 'store', 'sync'],
    path: '/admin/integrations',
  },
  {
    id: 'stripe',
    name: 'Stripe Payment Processing',
    description: 'Configure Stripe Terminal for payments',
    category: 'Integrations',
    scope: 'station',
    page: 'Integrations',
    section: 'Stripe',
    keywords: ['stripe', 'payment', 'terminal', 'credit card', 'processing'],
    path: '/admin/integrations',
  },

  // Hardware
  {
    id: 'receipt-printer',
    name: 'Receipt Printer',
    description: 'Configure receipt printer settings',
    category: 'Hardware',
    scope: 'station',
    page: 'Hardware',
    section: 'Receipt Printer',
    keywords: ['printer', 'receipt', 'escpos', 'thermal', 'hardware'],
    path: '/admin/hardware',
  },
  {
    id: 'label-printer',
    name: 'Label Printer',
    description: 'Configure label printer for product labels',
    category: 'Hardware',
    scope: 'station',
    page: 'Hardware',
    section: 'Label Printer',
    keywords: ['label', 'printer', 'zebra', 'zpl', 'barcode'],
    path: '/admin/hardware',
  },
  {
    id: 'barcode-scanner',
    name: 'Barcode Scanner',
    description: 'Configure barcode scanner settings',
    category: 'Hardware',
    scope: 'station',
    page: 'Hardware',
    section: 'Scanner',
    keywords: ['scanner', 'barcode', 'usb', 'hid', 'hardware'],
    path: '/admin/hardware',
  },
  {
    id: 'cash-drawer',
    name: 'Cash Drawer',
    description: 'Configure cash drawer connection',
    category: 'Hardware',
    scope: 'station',
    page: 'Hardware',
    section: 'Cash Drawer',
    keywords: ['cash', 'drawer', 'till', 'money', 'hardware'],
    path: '/admin/hardware',
  },
  {
    id: 'payment-terminal',
    name: 'Payment Terminal',
    description: 'Configure payment terminal device',
    category: 'Hardware',
    scope: 'station',
    page: 'Hardware',
    section: 'Payment Terminal',
    keywords: ['terminal', 'payment', 'card', 'reader', 'pos', 'hardware'],
    path: '/admin/hardware',
  },

  // Feature Flags
  {
    id: 'loyalty-program',
    name: 'Loyalty Program',
    description: 'Enable or disable loyalty program features',
    category: 'Features',
    scope: 'global',
    page: 'Feature Flags',
    keywords: ['loyalty', 'rewards', 'points', 'feature', 'module'],
    path: '/admin/feature-flags',
  },
  {
    id: 'service-orders',
    name: 'Service Orders',
    description: 'Enable or disable service order management',
    category: 'Features',
    scope: 'global',
    page: 'Feature Flags',
    keywords: ['service', 'order', 'repair', 'work order', 'feature'],
    path: '/admin/feature-flags',
  },

  // Localization
  {
    id: 'language',
    name: 'Language',
    description: 'Set default language for the system',
    category: 'Localization',
    scope: 'global',
    page: 'Localization',
    keywords: ['language', 'locale', 'translation', 'english', 'french', 'spanish'],
    path: '/admin/localization',
  },
  {
    id: 'currency',
    name: 'Currency',
    description: 'Configure currency and formatting',
    category: 'Localization',
    scope: 'store',
    page: 'Localization',
    keywords: ['currency', 'money', 'dollar', 'cad', 'usd', 'format'],
    path: '/admin/localization',
  },
  {
    id: 'timezone',
    name: 'Timezone',
    description: 'Set timezone for date and time display',
    category: 'Localization',
    scope: 'store',
    page: 'Localization',
    keywords: ['timezone', 'time', 'date', 'clock', 'utc'],
    path: '/admin/localization',
  },

  // Performance
  {
    id: 'performance-monitoring',
    name: 'Performance Monitoring',
    description: 'Configure performance tracking and error reporting',
    category: 'System',
    scope: 'global',
    page: 'Performance',
    keywords: ['performance', 'monitoring', 'metrics', 'sentry', 'errors', 'tracking'],
    path: '/admin/performance',
  },

  // My Preferences
  {
    id: 'my-profile',
    name: 'My Profile',
    description: 'Update your display name and email',
    category: 'Personal',
    scope: 'user',
    page: 'My Preferences',
    section: 'Profile',
    keywords: ['profile', 'name', 'email', 'personal', 'account'],
    path: '/admin/preferences',
  },
  {
    id: 'my-password',
    name: 'Change Password',
    description: 'Update your password',
    category: 'Personal',
    scope: 'user',
    page: 'My Preferences',
    section: 'Security',
    keywords: ['password', 'security', 'change', 'update'],
    path: '/admin/preferences',
  },
  {
    id: 'my-theme',
    name: 'Theme',
    description: 'Choose your preferred color theme',
    category: 'Personal',
    scope: 'user',
    page: 'My Preferences',
    section: 'Appearance',
    keywords: ['theme', 'appearance', 'color', 'dark', 'light'],
    path: '/admin/preferences',
  },
];

/**
 * Search settings index with fuzzy matching
 */
export function searchSettings(query: string): SettingIndexEntry[] {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const lowerQuery = query.toLowerCase().trim();
  const words = lowerQuery.split(/\s+/);

  // Score each setting
  const scored = SETTINGS_INDEX.map((setting) => {
    let score = 0;

    // Exact name match (highest priority)
    if (setting.name.toLowerCase() === lowerQuery) {
      score += 100;
    }

    // Name contains query
    if (setting.name.toLowerCase().includes(lowerQuery)) {
      score += 50;
    }

    // Description contains query
    if (setting.description.toLowerCase().includes(lowerQuery)) {
      score += 30;
    }

    // Category match
    if (setting.category.toLowerCase().includes(lowerQuery)) {
      score += 20;
    }

    // Keyword matches
    setting.keywords.forEach((keyword) => {
      if (keyword.toLowerCase() === lowerQuery) {
        score += 40;
      } else if (keyword.toLowerCase().includes(lowerQuery)) {
        score += 15;
      }
    });

    // Multi-word matching (all words must match somewhere)
    if (words.length > 1) {
      const allWordsMatch = words.every((word) => {
        const searchText =
          `${setting.name} ${setting.description} ${setting.keywords.join(' ')}`.toLowerCase();
        return searchText.includes(word);
      });
      if (allWordsMatch) {
        score += 25;
      }
    }

    return { setting, score };
  });

  // Filter and sort by score
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.setting)
    .slice(0, 10); // Return top 10 results
}

/**
 * Get settings by category
 */
export function getSettingsByCategory(category: string): SettingIndexEntry[] {
  return SETTINGS_INDEX.filter((setting) => setting.category === category);
}

/**
 * Get all unique categories
 */
export function getCategories(): string[] {
  const categories = new Set(SETTINGS_INDEX.map((s) => s.category));
  return Array.from(categories).sort();
}

/**
 * Get settings by scope
 */
export function getSettingsByScope(scope: SettingIndexEntry['scope']): SettingIndexEntry[] {
  return SETTINGS_INDEX.filter((setting) => setting.scope === scope);
}
