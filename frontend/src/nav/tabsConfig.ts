/**
 * Tabs Configuration - Single Source of Truth
 * 
 * All page tab definitions are defined here.
 * Components should import from this file rather than defining tabs locally.
 */

// Re-export FeatureStatus for consumers that import from tabsConfig
export type { FeatureStatus } from './navConfig';

// Import for local use in this file
import type { FeatureStatus } from './navConfig';

export interface TabItem {
  id: string;
  label: string;
  capabilityKey?: string;
  featureStatus: FeatureStatus;
  permission?: string;
  order: number;
  badge?: string;
}

export interface PageTabs {
  pageId: string;
  tabs: TabItem[];
}

/**
 * Review Workspace tabs
 */
export const reviewWorkspaceTabs: TabItem[] = [
  {
    id: 'summary',
    label: 'Summary',
    featureStatus: 'ready',
    order: 1,
  },
  {
    id: 'cleanup',
    label: 'Cleanup',
    capabilityKey: 'cleanup.view',
    featureStatus: 'ready',
    order: 2,
  },
  {
    id: 'extraction',
    label: 'Extraction',
    featureStatus: 'ready',
    order: 3,
  },
  {
    id: 'history',
    label: 'History',
    featureStatus: 'ready',
    order: 4,
  },
];

/**
 * Inventory page tabs
 */
export const inventoryTabs: TabItem[] = [
  {
    id: 'inventory',
    label: 'Inventory',
    featureStatus: 'ready',
    order: 1,
  },
  {
    id: 'receiving',
    label: 'Receiving',
    featureStatus: 'ready',
    order: 2,
  },
  {
    id: 'transfers',
    label: 'Transfers',
    featureStatus: 'comingSoon',
    order: 3,
  },
  {
    id: 'alerts',
    label: 'Alerts',
    featureStatus: 'ready',
    order: 4,
  },
];

/**
 * Admin page tabs
 */
export const adminTabs: TabItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    featureStatus: 'ready',
    order: 1,
  },
  {
    id: 'users',
    label: 'Users',
    permission: 'manage_settings',
    featureStatus: 'ready',
    order: 2,
  },
  {
    id: 'store',
    label: 'Store',
    permission: 'manage_settings',
    featureStatus: 'ready',
    order: 3,
  },
  {
    id: 'integrations',
    label: 'Integrations',
    permission: 'manage_settings',
    featureStatus: 'ready',
    order: 4,
  },
];

/**
 * Template Editor tabs
 */
export const templateEditorTabs: TabItem[] = [
  {
    id: 'zones',
    label: 'Zones',
    featureStatus: 'ready',
    order: 1,
  },
  {
    id: 'cleanup',
    label: 'Cleanup Shields',
    capabilityKey: 'cleanup.view',
    featureStatus: 'ready',
    order: 2,
  },
  {
    id: 'fields',
    label: 'Field Mapping',
    featureStatus: 'ready',
    order: 3,
  },
  {
    id: 'preview',
    label: 'Preview',
    featureStatus: 'ready',
    order: 4,
  },
];

/**
 * All page tabs registry
 */
export const allPageTabs: PageTabs[] = [
  { pageId: 'review-workspace', tabs: reviewWorkspaceTabs },
  { pageId: 'inventory', tabs: inventoryTabs },
  { pageId: 'admin', tabs: adminTabs },
  { pageId: 'template-editor', tabs: templateEditorTabs },
];

/**
 * Get tabs for a specific page
 */
export function getTabsForPage(pageId: string): TabItem[] {
  const pageTabs = allPageTabs.find(p => p.pageId === pageId);
  if (!pageTabs) return [];
  return pageTabs.tabs
    .filter(tab => tab.featureStatus !== 'hidden')
    .sort((a, b) => a.order - b.order);
}

/**
 * Get visible tabs (excluding hidden, respecting capability status)
 */
export function getVisibleTabs(
  pageId: string, 
  capabilities: Record<string, { status: string; enabled: boolean }>
): TabItem[] {
  const tabs = getTabsForPage(pageId);
  return tabs.filter(tab => {
    if (tab.featureStatus === 'hidden') return false;
    if (tab.capabilityKey) {
      const cap = capabilities[tab.capabilityKey];
      if (cap && cap.status === 'hidden') return false;
    }
    return true;
  });
}
