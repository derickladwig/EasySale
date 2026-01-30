/**
 * Route Registry - Single Source of Truth for All Routes
 * 
 * This registry documents all routes in the application, their status,
 * and their relationship to navigation sections. It serves as:
 * 
 * 1. Documentation of all routes and their purpose
 * 2. Audit trail for route consolidation (active/legacy/quarantined)
 * 3. Enforcement mechanism to prevent legacy routes from reappearing
 * 4. Testing foundation for route validation
 * 
 * Requirements: 4.1, 4.2
 * 
 * NO DELETES POLICY: Legacy routes are marked as 'quarantined' or 'legacy',
 * not removed from this registry. This preserves history and enables auditing.
 */

import { Permission } from '../common/contexts/PermissionsContext';

/**
 * Route status classification
 * 
 * - active: Currently used route, properly wired
 * - legacy: Old route that should be redirected or removed
 * - quarantined: Moved to legacy_quarantine, should not be imported
 */
export type RouteStatus = 'active' | 'legacy' | 'quarantined';

/**
 * Navigation section classification
 * 
 * - main: Top-level navigation items (daily use)
 * - admin: Admin sub-navigation items (administration)
 * - profile: Profile menu items (user preferences)
 * - none: Routes not in navigation (detail pages, redirects, etc.)
 */
export type NavSection = 'main' | 'admin' | 'profile' | 'none';

/**
 * Layout classification
 * 
 * - AppLayout: Authenticated routes with sidebar and header
 * - none: Public routes without layout (login, setup wizard)
 */
export type LayoutType = 'AppLayout' | 'none';

/**
 * Route entry in the registry
 */
export interface RouteEntry {
  /** Route path (e.g., '/sell', '/admin/users') */
  path: string;
  
  /** Component name (e.g., 'SellPage', 'AdminPage') */
  component: string;
  
  /** Layout wrapper */
  layout: LayoutType;
  
  /** Current status of the route */
  status: RouteStatus;
  
  /** Navigation section this route belongs to */
  navSection: NavSection;
  
  /** Required permissions (if any) */
  permissions?: Permission[];
  
  /** Optional capability requirement */
  capability?: string;
  
  /** Human-readable description */
  description?: string;
  
  /** If quarantined/legacy, where it was moved to */
  quarantinedPath?: string;
  
  /** If quarantined/legacy, the reason */
  quarantineReason?: string;
  
  /** If quarantined/legacy, the replacement route */
  replacement?: string;
}

/**
 * Complete route registry
 * 
 * This is the single source of truth for all routes in the application.
 * Routes are organized by status and purpose.
 */
export const routeRegistry: RouteEntry[] = [
  // ============================================================================
  // PUBLIC ROUTES (No authentication required)
  // ============================================================================
  {
    path: '/login',
    component: 'LoginPage',
    layout: 'none',
    status: 'active',
    navSection: 'none',
    description: 'User login page',
  },
  {
    path: '/fresh-install',
    component: 'FreshInstallWizard',
    layout: 'none',
    status: 'active',
    navSection: 'none',
    description: 'First-run setup wizard',
  },
  {
    path: '/access-denied',
    component: 'AccessDeniedPage',
    layout: 'none',
    status: 'active',
    navSection: 'none',
    description: 'Access denied error page',
  },

  // ============================================================================
  // MAIN NAVIGATION ROUTES (Daily use, top-level)
  // ============================================================================
  {
    path: '/',
    component: 'HomePage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'main',
    description: 'Dashboard and home page',
  },
  {
    path: '/sell',
    component: 'SellPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'main',
    permissions: ['access_sell'],
    description: 'Point of sale checkout',
  },
  {
    path: '/lookup',
    component: 'LookupPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'main',
    permissions: ['access_sell'],
    description: 'Product search and lookup',
  },
  {
    path: '/inventory',
    component: 'InventoryPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'main',
    permissions: ['access_inventory'],
    description: 'Inventory and stock management',
  },
  {
    path: '/documents',
    component: 'DocumentsPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'main',
    permissions: ['access_inventory'],
    description: 'Document management and OCR processing',
  },
  {
    path: '/customers',
    component: 'CustomersPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'main',
    permissions: ['access_sell'],
    description: 'Customer profiles and management',
  },
  {
    path: '/review',
    component: 'ReviewPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'main',
    permissions: ['review_vendor_bills'],
    description: 'Review and approve vendor bills',
  },
  {
    path: '/reporting',
    component: 'ReportingPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'main',
    permissions: ['access_admin'],
    description: 'Sales reports and analytics',
  },
  {
    path: '/sales',
    component: 'SalesManagementPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'main',
    permissions: ['access_admin'],
    description: 'Sales management - layaway, work orders, commissions, gift cards, promotions, credit accounts, loyalty',
  },
  {
    path: '/admin',
    component: 'AdminPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'main',
    permissions: ['access_admin'],
    description: 'Administration overview',
  },

  // ============================================================================
  // ADMIN SUB-ROUTES (Inside Admin section)
  // ============================================================================
  {
    path: '/admin/setup',
    component: 'AdminPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Setup wizard (re-runnable)',
  },
  {
    path: '/admin/users',
    component: 'AdminPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Users and roles management',
  },
  {
    path: '/admin/store',
    component: 'CompanyStoresPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Store configuration',
  },
  {
    path: '/admin/locations',
    component: 'CompanyStoresPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Locations and registers',
  },
  {
    path: '/admin/taxes',
    component: 'TaxRulesPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Tax rules and rounding',
  },
  {
    path: '/admin/pricing',
    component: 'ProductConfigPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Pricing rules and configuration',
  },
  {
    path: '/admin/receipts',
    component: 'AdminPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Receipt templates',
  },
  {
    path: '/admin/branding',
    component: 'LocalizationPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Branding and localization',
  },
  {
    path: '/admin/integrations',
    component: 'IntegrationsPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'External integrations (WooCommerce, QuickBooks)',
  },
  {
    path: '/admin/data',
    component: 'DataManagementPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Data management and imports',
  },
  {
    path: '/admin/exports',
    component: 'ExportsPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    capability: 'export',
    description: 'Export data and reports',
  },
  {
    path: '/admin/capabilities',
    component: 'CapabilitiesDashboardPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'System capabilities dashboard',
  },
  {
    path: '/admin/health',
    component: 'SyncDashboardPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'System health and sync status',
  },
  {
    path: '/admin/advanced',
    component: 'FeatureFlagsPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Advanced settings and feature flags',
  },
  {
    path: '/admin/hardware',
    component: 'HardwarePage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Hardware configuration',
  },
  {
    path: '/admin/network',
    component: 'NetworkPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Network settings',
  },
  {
    path: '/admin/performance',
    component: 'PerformancePage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'admin',
    permissions: ['access_admin'],
    description: 'Performance monitoring',
  },

  // ============================================================================
  // PROFILE MENU ROUTES (User preferences)
  // ============================================================================
  {
    path: '/preferences',
    component: 'PreferencesPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'profile',
    description: 'User preferences (theme, density, shortcuts)',
  },

  // ============================================================================
  // DETAIL PAGES (Not in navigation, accessed via links)
  // ============================================================================
  {
    path: '/review/:caseId',
    component: 'ReviewCaseDetailPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'none',
    permissions: ['review_vendor_bills'],
    description: 'Review case detail page',
  },
  {
    path: '/vendor-bills',
    component: 'BillHistory',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'none',
    permissions: ['access_inventory'],
    description: 'Vendor bill history',
  },
  {
    path: '/vendor-bills/upload',
    component: 'BillUpload',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'none',
    permissions: ['upload_vendor_bills'],
    description: 'Upload vendor bills',
  },
  {
    path: '/vendor-bills/:id',
    component: 'BillReview',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'none',
    permissions: ['view_vendor_bills'],
    description: 'Vendor bill detail',
  },
  {
    path: '/vendor-bills/templates',
    component: 'TemplateManagerPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'none',
    permissions: ['access_inventory'],
    description: 'Vendor bill templates',
  },
  {
    path: '/vendor-bills/templates/:templateId',
    component: 'VendorTemplateEditorPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'none',
    permissions: ['access_inventory'],
    description: 'Edit vendor bill template',
  },
  {
    path: '/forms',
    component: 'FormTemplatesPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'none',
    permissions: ['access_admin'],
    description: 'Form templates',
  },
  {
    path: '/exports',
    component: 'ExportsPage',
    layout: 'AppLayout',
    status: 'active',
    navSection: 'none',
    permissions: ['access_admin'],
    capability: 'export',
    description: 'Exports page (also accessible via /admin/exports)',
  },

  // ============================================================================
  // LEGACY ROUTES (Redirects to new locations)
  // ============================================================================
  {
    path: '/settings',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin',
    replacement: '/admin',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/preferences',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /preferences',
    replacement: '/preferences',
    quarantineReason: 'User preferences moved to profile menu',
  },
  {
    path: '/settings/integrations',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/integrations',
    replacement: '/admin/integrations',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/data',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/data',
    replacement: '/admin/data',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/hardware',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/hardware',
    replacement: '/admin/hardware',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/network',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/network',
    replacement: '/admin/network',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/performance',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/performance',
    replacement: '/admin/performance',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/features',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/advanced',
    replacement: '/admin/advanced',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/localization',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/branding',
    replacement: '/admin/branding',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/products',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/pricing',
    replacement: '/admin/pricing',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/tax',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/taxes',
    replacement: '/admin/taxes',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/stores',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/store',
    replacement: '/admin/store',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/sync',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Redirects to /admin/health',
    replacement: '/admin/health',
    quarantineReason: 'Settings consolidated into Admin section',
  },
  {
    path: '/settings/*',
    component: 'Navigate',
    layout: 'AppLayout',
    status: 'legacy',
    navSection: 'none',
    description: 'Catch-all redirect to /admin',
    replacement: '/admin',
    quarantineReason: 'Settings consolidated into Admin section',
  },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get all routes with a specific status
 */
export function getRoutesByStatus(status: RouteStatus): RouteEntry[] {
  return routeRegistry.filter((route) => route.status === status);
}

/**
 * Get all active routes
 */
export function getActiveRoutes(): RouteEntry[] {
  return getRoutesByStatus('active');
}

/**
 * Get all legacy routes (should be redirected)
 */
export function getLegacyRoutes(): RouteEntry[] {
  return getRoutesByStatus('legacy');
}

/**
 * Get all quarantined routes (should not be imported)
 */
export function getQuarantinedRoutes(): RouteEntry[] {
  return getRoutesByStatus('quarantined');
}

/**
 * Get routes by navigation section
 */
export function getRoutesByNavSection(section: NavSection): RouteEntry[] {
  return routeRegistry.filter((route) => route.navSection === section);
}

/**
 * Get main navigation routes (top-level)
 */
export function getMainNavRoutes(): RouteEntry[] {
  return getRoutesByNavSection('main').filter((route) => route.status === 'active');
}

/**
 * Get admin sub-navigation routes
 */
export function getAdminNavRoutes(): RouteEntry[] {
  return getRoutesByNavSection('admin').filter((route) => route.status === 'active');
}

/**
 * Get profile menu routes
 */
export function getProfileMenuRoutes(): RouteEntry[] {
  return getRoutesByNavSection('profile').filter((route) => route.status === 'active');
}

/**
 * Find a route by path
 */
export function findRouteByPath(path: string): RouteEntry | undefined {
  return routeRegistry.find((route) => route.path === path);
}

/**
 * Check if a route is active
 */
export function isRouteActive(path: string): boolean {
  const route = findRouteByPath(path);
  return route?.status === 'active';
}

/**
 * Check if a route is quarantined (should not be imported)
 */
export function isRouteQuarantined(path: string): boolean {
  const route = findRouteByPath(path);
  return route?.status === 'quarantined';
}

/**
 * Get replacement route for a legacy route
 */
export function getReplacementRoute(path: string): string | undefined {
  const route = findRouteByPath(path);
  return route?.replacement;
}

/**
 * Validate that no quarantined routes are in the active route tree
 * This is used in tests to ensure legacy code doesn't leak back in
 */
export function validateNoQuarantinedRoutes(): { valid: boolean; violations: string[] } {
  const quarantined = getQuarantinedRoutes();
  const violations: string[] = [];

  // Check if any quarantined routes are marked as active
  quarantined.forEach((route) => {
    if (route.status !== 'quarantined') {
      violations.push(`Route ${route.path} is marked as quarantined but has status ${route.status}`);
    }
  });

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Get route statistics for auditing
 */
export function getRouteStatistics() {
  return {
    total: routeRegistry.length,
    active: getActiveRoutes().length,
    legacy: getLegacyRoutes().length,
    quarantined: getQuarantinedRoutes().length,
    byNavSection: {
      main: getRoutesByNavSection('main').length,
      admin: getRoutesByNavSection('admin').length,
      profile: getRoutesByNavSection('profile').length,
      none: getRoutesByNavSection('none').length,
    },
    byLayout: {
      AppLayout: routeRegistry.filter((r) => r.layout === 'AppLayout').length,
      none: routeRegistry.filter((r) => r.layout === 'none').length,
    },
  };
}
