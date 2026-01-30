/**
 * Navigation Configuration - Single Source of Truth
 * 
 * All sidebar navigation items are defined here.
 * Components should import from this file rather than defining nav items locally.
 */

import { 
  Home, 
  ShoppingCart, 
  Search, 
  Package, 
  Users, 
  BarChart3, 
  Settings, 
  FileText,
  Upload,
  ClipboardCheck,
  LayoutTemplate,
  FolderOpen,
  Download
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type FeatureStatus = 'ready' | 'beta' | 'comingSoon' | 'hidden';

export interface NavItem {
  id: string;
  label: string;
  route: string;
  icon: LucideIcon;
  capabilityKey?: string;
  featureStatus: FeatureStatus;
  permission?: string;
  order: number;
  group: string;
}

export interface NavGroup {
  id: string;
  label: string;
  order: number;
  collapsible: boolean;
}

/**
 * Navigation groups
 */
export const navGroups: NavGroup[] = [
  { id: 'main', label: 'Main', order: 1, collapsible: false },
  { id: 'operations', label: 'Operations', order: 2, collapsible: true },
  { id: 'documents', label: 'Documents', order: 3, collapsible: true },
  { id: 'admin', label: 'Administration', order: 4, collapsible: true },
];

/**
 * Navigation items - single source of truth for sidebar
 */
export const navItems: NavItem[] = [
  // Main group
  {
    id: 'home',
    label: 'Dashboard',
    route: '/',
    icon: Home,
    featureStatus: 'ready',
    order: 1,
    group: 'main',
  },
  {
    id: 'sell',
    label: 'Sell',
    route: '/sell',
    icon: ShoppingCart,
    permission: 'access_sell',
    featureStatus: 'ready',
    order: 2,
    group: 'main',
  },
  {
    id: 'lookup',
    label: 'Lookup',
    route: '/lookup',
    icon: Search,
    permission: 'access_sell',
    featureStatus: 'ready',
    order: 3,
    group: 'main',
  },
  
  // Operations group
  {
    id: 'inventory',
    label: 'Inventory',
    route: '/inventory',
    icon: Package,
    permission: 'access_inventory',
    featureStatus: 'ready',
    order: 1,
    group: 'operations',
  },
  {
    id: 'customers',
    label: 'Customers',
    route: '/customers',
    icon: Users,
    permission: 'access_sell',
    featureStatus: 'ready',
    order: 2,
    group: 'operations',
  },
  {
    id: 'reporting',
    label: 'Reports',
    route: '/reporting',
    icon: BarChart3,
    permission: 'access_admin',
    featureStatus: 'ready',
    order: 3,
    group: 'operations',
  },
  
  // Documents group
  {
    id: 'documents',
    label: 'Documents',
    route: '/documents',
    icon: FolderOpen,
    permission: 'access_inventory',
    featureStatus: 'ready',
    order: 1,
    group: 'documents',
  },
  {
    id: 'vendor-bills',
    label: 'Vendor Bills',
    route: '/vendor-bills',
    icon: FileText,
    permission: 'access_inventory',
    featureStatus: 'ready',
    order: 2,
    group: 'documents',
  },
  {
    id: 'vendor-bills-upload',
    label: 'Upload Bills',
    route: '/vendor-bills/upload',
    icon: Upload,
    permission: 'upload_vendor_bills',
    featureStatus: 'ready',
    order: 3,
    group: 'documents',
  },
  {
    id: 'review',
    label: 'Review Queue',
    route: '/review',
    icon: ClipboardCheck,
    permission: 'review_vendor_bills',
    capabilityKey: 'cleanup.view',
    featureStatus: 'ready',
    order: 4,
    group: 'documents',
  },
  {
    id: 'templates',
    label: 'Templates',
    route: '/vendor-bills/templates',
    icon: LayoutTemplate,
    permission: 'access_inventory',
    featureStatus: 'ready',
    order: 5,
    group: 'documents',
  },
  
  // Admin group
  {
    id: 'admin',
    label: 'Admin',
    route: '/admin',
    icon: Settings,
    permission: 'access_admin',
    featureStatus: 'ready',
    order: 1,
    group: 'admin',
  },
  {
    id: 'exports',
    label: 'Exports',
    route: '/admin/exports',
    icon: Download,
    permission: 'access_admin',
    featureStatus: 'ready',
    order: 2,
    group: 'admin',
  },
];

/**
 * Get nav items by group
 */
export function getNavItemsByGroup(groupId: string): NavItem[] {
  return navItems
    .filter(item => item.group === groupId)
    .sort((a, b) => a.order - b.order);
}

/**
 * Get all visible nav items (excluding hidden)
 */
export function getVisibleNavItems(): NavItem[] {
  return navItems
    .filter(item => item.featureStatus !== 'hidden')
    .sort((a, b) => {
      const groupA = navGroups.find(g => g.id === a.group)?.order ?? 99;
      const groupB = navGroups.find(g => g.id === b.group)?.order ?? 99;
      if (groupA !== groupB) return groupA - groupB;
      return a.order - b.order;
    });
}

/**
 * Get nav item by route
 */
export function getNavItemByRoute(route: string): NavItem | undefined {
  return navItems.find(item => item.route === route);
}
