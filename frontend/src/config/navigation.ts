/**
 * Navigation Configuration
 * 
 * Centralized navigation definition with sections and permission gating.
 * This configuration is used by AppLayout to render the sidebar navigation.
 * 
 * Design Reference: .kiro/specs/navigation-consolidation/design.md
 * 
 * Key Changes from Legacy:
 * - Added section field ('main' | 'admin') for grouping
 * - Removed top-level Settings (moved to profile menu)
 * - Admin is a single entry that opens sub-navigation inside Admin pages
 * - Clear separation: daily use (main) vs administration (admin sub-tabs)
 * 
 * Requirements: 3.4, 3.5, 3.6, 3.7
 */

import type { Permission } from '../common/contexts/PermissionsContext';
import type { LucideIcon } from './useIcon';

// ============================================================================
// Types
// ============================================================================

/**
 * Navigation section type for grouping items
 */
export type NavigationSection = 'main' | 'admin';

/**
 * Extended NavigationItem interface with section support
 * 
 * This interface extends the base NavItem with additional fields
 * for section grouping, capability gating, and badge support.
 */
export interface NavigationItem {
  /** Unique identifier for the navigation item */
  id: string;
  /** Route path for navigation */
  path: string;
  /** Display label */
  label: string;
  /** Icon name (Lucide icon) or LucideIcon component */
  icon: string | LucideIcon;
  /** Required permission to view this item */
  permission: Permission;
  /** Optional description for tooltips */
  description?: string;
  /** Static badge count */
  badge?: number;
  /** Key to fetch dynamic badge count (e.g., 'needsReview') */
  badgeKey?: string;
  /** Optional capability requirement - item only shown if capability is enabled */
  capability?: string;
  /** Section grouping: 'main' for daily use, 'admin' for administration */
  section: NavigationSection;
}

/**
 * Profile menu item (top-right dropdown, NOT in sidebar)
 */
export interface ProfileMenuItem {
  /** Route path or action identifier */
  path?: string;
  /** Action type for non-navigation items */
  action?: 'logout' | 'preferences' | 'profile';
  /** Display label */
  label: string;
  /** Icon name (Lucide icon) */
  icon: string;
}

// ============================================================================
// Main Navigation Items (Daily Use)
// ============================================================================

/**
 * Main navigation items for daily use operations.
 * These appear in the primary sidebar navigation.
 * 
 * Order:
 * 1. Sell - Primary POS function
 * 2. Lookup - Product search
 * 3. Customers - Customer management
 * 4. Inventory - Inventory management
 * 5. Documents - OCR and document processing
 * 6. Review - Vendor bill review (with badge)
 * 7. Reporting - Sales reports and analytics
 * 8. Admin - Opens admin sub-navigation
 */
export const mainNavItems: NavigationItem[] = [
  {
    id: 'sell',
    path: '/sell',
    label: 'Sell',
    icon: 'ShoppingCart',
    permission: 'access_sell',
    description: 'Point of sale and checkout',
    section: 'main',
  },
  {
    id: 'lookup',
    path: '/lookup',
    label: 'Lookup',
    icon: 'Search',
    permission: 'access_sell',
    description: 'Product search and information',
    section: 'main',
  },
  {
    id: 'customers',
    path: '/customers',
    label: 'Customers',
    icon: 'Users',
    permission: 'access_sell',
    description: 'Customer profiles and history',
    section: 'main',
  },
  {
    id: 'inventory',
    path: '/inventory',
    label: 'Inventory',
    icon: 'Package',
    permission: 'access_inventory',
    description: 'Inventory and stock management',
    section: 'main',
  },
  {
    id: 'documents',
    path: '/documents',
    label: 'Documents',
    icon: 'FileText',
    permission: 'access_inventory',
    description: 'Document management and OCR processing',
    section: 'main',
  },
  {
    id: 'review',
    path: '/review',
    label: 'Review',
    icon: 'ClipboardCheck',
    permission: 'review_vendor_bills',
    description: 'Review and approve vendor bills',
    badgeKey: 'needsReview',
    section: 'main',
  },
  {
    id: 'reporting',
    path: '/reporting',
    label: 'Reporting',
    icon: 'BarChart3',
    permission: 'access_admin',
    description: 'Sales reports and analytics',
    section: 'main',
  },
  {
    id: 'admin',
    path: '/admin',
    label: 'Admin',
    icon: 'Settings',
    permission: 'access_admin',
    description: 'System administration',
    section: 'main',
  },
];

// ============================================================================
// Admin Sub-Navigation Items (Inside Admin Pages)
// ============================================================================

/**
 * Admin sub-navigation items displayed inside Admin pages.
 * These appear as tabs or side list when user is on /admin/* routes.
 * 
 * Sections:
 * - Setup: Setup Wizard
 * - Users: Users & Roles
 * - Store: Store Configuration, Locations, Taxes, Pricing, Receipts
 * - Branding: Logo, Colors, Favicon
 * - Integrations: WooCommerce, QuickBooks, etc.
 * - Data: Data & Imports, Exports
 * - System: Capabilities, System Health, Advanced
 */
export const adminSubNavItems: NavigationItem[] = [
  {
    id: 'admin-setup',
    path: '/admin/setup',
    label: 'Setup Wizard',
    icon: 'Wand2',
    permission: 'access_admin',
    description: 'Initial setup and configuration wizard',
    section: 'admin',
  },
  {
    id: 'admin-users',
    path: '/admin/users',
    label: 'Users & Roles',
    icon: 'Users',
    permission: 'access_admin',
    description: 'Manage users and role permissions',
    section: 'admin',
  },
  {
    id: 'admin-store',
    path: '/admin/store',
    label: 'Store Configuration',
    icon: 'Store',
    permission: 'access_admin',
    description: 'Store settings and defaults',
    section: 'admin',
  },
  {
    id: 'admin-locations',
    path: '/admin/locations',
    label: 'Locations & Registers',
    icon: 'MapPin',
    permission: 'access_admin',
    description: 'Manage store locations and POS registers',
    section: 'admin',
  },
  {
    id: 'admin-taxes',
    path: '/admin/taxes',
    label: 'Taxes & Rounding',
    icon: 'Calculator',
    permission: 'access_admin',
    description: 'Tax rules and rounding configuration',
    section: 'admin',
  },
  {
    id: 'admin-pricing',
    path: '/admin/pricing',
    label: 'Pricing Rules',
    icon: 'DollarSign',
    permission: 'access_admin',
    description: 'Pricing tiers and discount rules',
    section: 'admin',
  },
  {
    id: 'admin-receipts',
    path: '/admin/receipts',
    label: 'Receipt Templates',
    icon: 'Receipt',
    permission: 'access_admin',
    description: 'Customize receipt layout and content',
    section: 'admin',
  },
  {
    id: 'admin-branding',
    path: '/admin/branding',
    label: 'Branding',
    icon: 'Palette',
    permission: 'access_admin',
    description: 'Logo, colors, and visual identity',
    section: 'admin',
  },
  {
    id: 'admin-integrations',
    path: '/admin/integrations',
    label: 'Integrations',
    icon: 'Plug',
    permission: 'access_admin',
    description: 'Connect external services (WooCommerce, QuickBooks)',
    section: 'admin',
  },
  {
    id: 'admin-data',
    path: '/admin/data',
    label: 'Data & Imports',
    icon: 'Upload',
    permission: 'access_admin',
    description: 'Import products, customers, and data',
    section: 'admin',
  },
  {
    id: 'admin-exports',
    path: '/admin/exports',
    label: 'Exports',
    icon: 'Download',
    permission: 'access_admin',
    description: 'Export data and reports',
    capability: 'export',
    section: 'admin',
  },
  {
    id: 'admin-capabilities',
    path: '/admin/capabilities',
    label: 'Capabilities',
    icon: 'Zap',
    permission: 'access_admin',
    description: 'View and manage system capabilities',
    section: 'admin',
  },
  {
    id: 'admin-health',
    path: '/admin/health',
    label: 'System Health',
    icon: 'Activity',
    permission: 'access_admin',
    description: 'Monitor system status and sync',
    section: 'admin',
  },
  {
    id: 'admin-advanced',
    path: '/admin/advanced',
    label: 'Advanced',
    icon: 'Shield',
    permission: 'access_admin',
    description: 'Advanced system settings and feature flags',
    section: 'admin',
  },
  {
    id: 'admin-hardware',
    path: '/admin/hardware',
    label: 'Hardware',
    icon: 'Printer',
    permission: 'access_admin',
    description: 'Printers, scanners, and device configuration',
    section: 'admin',
  },
  {
    id: 'admin-network',
    path: '/admin/network',
    label: 'Network',
    icon: 'Wifi',
    permission: 'access_admin',
    description: 'Network and connectivity settings',
    section: 'admin',
  },
  {
    id: 'admin-performance',
    path: '/admin/performance',
    label: 'Performance',
    icon: 'Gauge',
    permission: 'access_admin',
    description: 'Performance monitoring and optimization',
    section: 'admin',
  },
];

// ============================================================================
// Profile Menu Items (Top-Right Dropdown)
// ============================================================================

/**
 * Profile menu items for the top-right user dropdown.
 * These are NOT in the sidebar - they're in the header profile menu.
 * 
 * Note: Settings moved here from sidebar per design spec.
 */
export const profileMenuItems: ProfileMenuItem[] = [
  {
    path: '/profile',
    label: 'My Profile',
    icon: 'User',
  },
  {
    path: '/preferences',
    label: 'Preferences',
    icon: 'Sliders',
  },
  {
    action: 'logout',
    label: 'Sign Out',
    icon: 'LogOut',
  },
];

// ============================================================================
// Utility Functions
// ============================================================================

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

/**
 * Filter navigation items by section
 * 
 * @param items - Navigation items to filter
 * @param section - Section to filter by ('main' or 'admin')
 * @returns Filtered navigation items for the specified section
 */
export function filterNavigationBySection(
  items: NavigationItem[],
  section: NavigationSection
): NavigationItem[] {
  return items.filter((item) => item.section === section);
}

/**
 * Get all navigation items (main + admin)
 * 
 * @returns Combined array of all navigation items
 */
export function getAllNavigationItems(): NavigationItem[] {
  return [...mainNavItems, ...adminSubNavItems];
}

/**
 * Convert NavigationItem to NavItem format for ConfigProvider compatibility
 * 
 * This allows the new navigation config to work with existing AppLayout
 * which expects NavItem format from the config system.
 * 
 * @param item - NavigationItem to convert
 * @returns NavItem compatible object
 */
export function toNavItem(item: NavigationItem): {
  id: string;
  label: string;
  icon: string;
  route: string;
  permission: string;
  badge?: string;
} {
  return {
    id: item.id,
    label: item.label,
    icon: typeof item.icon === 'string' ? item.icon : 'Circle',
    route: item.path,
    permission: item.permission,
    badge: item.badgeKey,
  };
}

/**
 * Convert all main navigation items to NavItem format
 * 
 * @returns Array of NavItem compatible objects
 */
export function getMainNavAsNavItems(): ReturnType<typeof toNavItem>[] {
  return mainNavItems.map(toNavItem);
}
