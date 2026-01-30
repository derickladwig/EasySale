/**
 * Lazy-loaded route components for code splitting.
 * 
 * These components are loaded on-demand when the user navigates to them,
 * reducing the initial bundle size significantly.
 * 
 * Critical path components (Login, Home, Sell, Lookup, Inventory, Customers)
 * are NOT lazy-loaded to ensure fast first-load experience.
 */

import { lazy, Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
export function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px] bg-background-primary">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        <p className="text-text-tertiary text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Helper to wrap lazy components with Suspense
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyWithFallback(
  importFn: () => Promise<{ default: ComponentType<any> }>
): React.FC {
  const LazyComponent = lazy(importFn);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function LazyWrapper(props: any) {
    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// ============================================================================
// Setup Pages
// ============================================================================

export const LazyFirstRunSetupPage = lazyWithFallback(
  () => import('../setup/pages/FirstRunSetupPage').then(m => ({ default: m.FirstRunSetupPage }))
);

// ============================================================================
// Admin & Settings Pages (Heavy - many sub-imports)
// ============================================================================

export const LazyAdminPage = lazyWithFallback(
  () => import('../admin/pages/AdminPage').then(m => ({ default: m.AdminPage }))
);

export const LazyAdminLayout = lazyWithFallback(
  () => import('../admin/components/AdminLayout').then(m => ({ default: m.AdminLayout }))
);

export const LazySetupWizardPage = lazyWithFallback(
  () => import('../admin/pages/SetupWizardPage').then(m => ({ default: m.SetupWizardPage }))
);

export const LazyReceiptsPage = lazyWithFallback(
  () => import('../admin/pages/ReceiptsPage').then(m => ({ default: m.ReceiptsPage }))
);

export const LazyCapabilitiesDashboardPage = lazyWithFallback(
  () => import('../admin/pages/CapabilitiesDashboardPage').then(m => ({ default: m.CapabilitiesDashboardPage }))
);

export const LazyNetworkSettingsPage = lazyWithFallback(
  () => import('../admin/pages/NetworkSettingsPage').then(m => ({ default: m.NetworkSettingsPage }))
);

export const LazyBrandingSettingsPage = lazyWithFallback(
  () => import('../admin/pages/BrandingSettingsPage').then(m => ({ default: m.BrandingSettingsPage }))
);

// ============================================================================
// Settings Pages
// ============================================================================

export const LazyIntegrationsPage = lazyWithFallback(
  () => import('../settings/pages/IntegrationsPage').then(m => ({ default: m.IntegrationsPage }))
);

export const LazyDataManagementPage = lazyWithFallback(
  () => import('../settings/pages/DataManagementPage').then(m => ({ default: m.DataManagementPage }))
);

export const LazyHardwarePage = lazyWithFallback(
  () => import('../settings/pages/HardwarePage').then(m => ({ default: m.HardwarePage }))
);

export const LazyNetworkPage = lazyWithFallback(
  () => import('../settings/pages/NetworkPage').then(m => ({ default: m.NetworkPage }))
);

export const LazyPerformancePage = lazyWithFallback(
  () => import('../settings/pages/PerformancePage').then(m => ({ default: m.PerformancePage }))
);

export const LazyFeatureFlagsPage = lazyWithFallback(
  () => import('../settings/pages/FeatureFlagsPage').then(m => ({ default: m.FeatureFlagsPage }))
);

export const LazyLocalizationPage = lazyWithFallback(
  () => import('../settings/pages/LocalizationPage').then(m => ({ default: m.LocalizationPage }))
);

export const LazyProductConfigPage = lazyWithFallback(
  () => import('../settings/pages/ProductConfigPage').then(m => ({ default: m.ProductConfigPage }))
);

export const LazyTaxRulesPage = lazyWithFallback(
  () => import('../settings/pages/TaxRulesPage').then(m => ({ default: m.TaxRulesPage }))
);

export const LazyCompanyStoresPage = lazyWithFallback(
  () => import('../settings/pages/CompanyStoresPage').then(m => ({ default: m.CompanyStoresPage }))
);

export const LazySyncDashboardPage = lazyWithFallback(
  () => import('../settings/pages/SyncDashboardPage').then(m => ({ default: m.SyncDashboardPage }))
);

export const LazyNotificationSettingsPage = lazyWithFallback(
  () => import('../settings/pages/NotificationSettingsPage').then(m => ({ default: m.NotificationSettingsPage }))
);

// ============================================================================
// Reporting & Analytics
// ============================================================================

export const LazyReportingPage = lazyWithFallback(
  () => import('../reporting/pages/ReportingPage').then(m => ({ default: m.ReportingPage }))
);

// ============================================================================
// Documents & Vendor Bills
// ============================================================================

export const LazyDocumentsPage = lazyWithFallback(
  () => import('../documents/pages/DocumentsPage').then(m => ({ default: m.DocumentsPage }))
);

export const LazyBillUpload = lazyWithFallback(
  () => import('../components/vendor-bill/BillUpload').then(m => ({ default: m.BillUpload }))
);

export const LazyBillReview = lazyWithFallback(
  () => import('../components/vendor-bill/BillReview').then(m => ({ default: m.BillReview }))
);

export const LazyBillHistory = lazyWithFallback(
  () => import('../components/vendor-bill/BillHistory').then(m => ({ default: m.BillHistory }))
);

// ============================================================================
// Review Workflow
// ============================================================================

export const LazyReviewPage = lazyWithFallback(
  () => import('../review/pages/ReviewPage').then(m => ({ default: m.ReviewPage }))
);

export const LazyReviewCaseDetailPage = lazyWithFallback(
  () => import('../review/pages/ReviewCaseDetailPage').then(m => ({ default: m.ReviewCaseDetailPage }))
);

// ============================================================================
// Templates
// ============================================================================

export const LazyTemplateManagerPage = lazyWithFallback(
  () => import('../templates/pages/TemplateManagerPage').then(m => ({ default: m.TemplateManagerPage }))
);

export const LazyVendorTemplateEditorPage = lazyWithFallback(
  () => import('../templates/pages/VendorTemplateEditorPage').then(m => ({ default: m.VendorTemplateEditorPage }))
);

// ============================================================================
// Exports
// ============================================================================

export const LazyExportsPage = lazyWithFallback(
  () => import('../exports/pages/ExportsPage').then(m => ({ default: m.ExportsPage }))
);

// ============================================================================
// Sales Management
// ============================================================================

export const LazySalesManagementPage = lazyWithFallback(
  () => import('../sales/pages/SalesManagementPage').then(m => ({ default: m.SalesManagementPage }))
);

// ============================================================================
// Forms
// ============================================================================

export const LazyFormTemplatesPage = lazyWithFallback(
  () => import('../forms/pages/FormTemplatesPage').then(m => ({ default: m.FormTemplatesPage }))
);

// ============================================================================
// Products
// ============================================================================

export const LazyProductImportPage = lazyWithFallback(
  () => import('../products/pages/ProductImportPage').then(m => ({ default: m.ProductImportPage }))
);

// ============================================================================
// Inventory (Parts Mapping is specialized)
// ============================================================================

export const LazyPartsMappingPage = lazyWithFallback(
  () => import('../inventory/pages/PartsMappingPage').then(m => ({ default: m.PartsMappingPage }))
);
