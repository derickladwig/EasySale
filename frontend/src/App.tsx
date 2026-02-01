import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, PermissionsProvider, CapabilitiesProvider, TenantSetupProvider } from './common/contexts';
import { ErrorBoundary, RequireAuth, RequirePermission, RequireSetup } from '@common/components';
import { ToastProvider } from '@common/components/organisms';
import { ConfigProvider, ThemeProvider } from './config';
import { FaviconManager } from './components/FaviconManager';
import { AppLayout } from './AppLayout';
import { FeatureGuard, FeatureUnavailablePage } from './common/components/guards/FeatureGuard';

// Critical path pages - loaded eagerly for fast first-load
import { LoginPage } from './auth/pages/LoginPage';
import { AccessDeniedPage } from './auth/pages/AccessDeniedPage';
import { FreshInstallWizard } from './setup/pages/FreshInstallWizard';
import { HomePage } from './home/pages/HomePage';
import { SellPage } from './sell/pages/SellPage';
import { QuotesPage } from './sell/pages/QuotesPage';
import { LookupPage } from './lookup/pages/LookupPage';
import { InventoryPage } from './inventory/pages/InventoryPage';
import { CustomersPage } from './customers/pages/CustomersPage';
import { PreferencesPage } from './preferences/pages/PreferencesPage';

// Build variant feature flags
import {
  ENABLE_ADMIN,
  ENABLE_REPORTING,
  ENABLE_VENDOR_BILLS,
  ENABLE_DOCUMENTS,
  ENABLE_EXPORTS,
  ENABLE_REVIEW,
} from '@common/utils/buildVariant';

// Lazy-loaded pages for code splitting
import {
  LazyFirstRunSetupPage,
  LazyReportingPage,
  LazyAdminPage,
  LazyAdminLayout,
  LazyReceiptsPage,
  LazySetupWizardPage,
  LazyFormTemplatesPage,
  LazyBillUpload,
  LazyBillReview,
  LazyBillHistory,
  LazyIntegrationsPage,
  LazyDataManagementPage,
  LazyProductImportPage,
  LazyHardwarePage,
  LazyNetworkPage,
  LazyNetworkSettingsPage,
  LazyBrandingSettingsPage,
  LazyPerformancePage,
  LazyFeatureFlagsPage,
  LazyLocalizationPage,
  LazyProductConfigPage,
  LazyTaxRulesPage,
  LazyCompanyStoresPage,
  LazySyncDashboardPage,
  LazyNotificationSettingsPage,
  LazyReviewPage,
  LazyReviewCaseDetailPage,
  LazyTemplateManagerPage,
  LazyVendorTemplateEditorPage,
  LazyDocumentsPage,
  LazyExportsPage,
  LazyCapabilitiesDashboardPage,
  LazySalesManagementPage,
  LazyTransactionHistoryPage,
  LazyPartsMappingPage,
  LazyOAuthCallbackPage,
  LazyCategoryLookupPage,
  LazyAppointmentCalendarPage,
  LazyEstimateListPage,
  LazyEstimateDetailPage,
  LazyEstimateCreatePage,
  LazySyncHistoryPage,
  LazyFailedRecordsPage,
  LazyBackupsPage,
  LazyTimeTrackingPage,
} from './routes/lazyRoutes';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// EasySale - Multi-Tenant White-Label POS System
function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <CapabilitiesProvider>
          <ConfigProvider>
            <FaviconManager />
            <ThemeProvider>
              <ToastProvider>
                <BrowserRouter>
                  <AuthProvider>
                    <PermissionsProvider>
                    <Routes>
                      {/* Public routes */}
                      <Route path="/fresh-install" element={<FreshInstallWizard />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/access-denied" element={<AccessDeniedPage />} />
                      <Route path="/feature-unavailable" element={<FeatureUnavailablePage />} />
                      <Route path="/oauth/callback" element={<LazyOAuthCallbackPage />} />
                      
                      {/* First-run setup wizard - shown when tenant is not configured (lazy loaded) */}
                      <Route
                        path="/setup"
                        element={
                          <RequireAuth>
                            <TenantSetupProvider>
                              <LazyFirstRunSetupPage />
                            </TenantSetupProvider>
                          </RequireAuth>
                        }
                      />

                      {/* Protected routes - wrapped in AppLayout */}
                      <Route
                        path="/"
                        element={
                          <RequireAuth>
                            <TenantSetupProvider>
                              <AppLayout />
                            </TenantSetupProvider>
                          </RequireAuth>
                        }
                      >
                        <Route index element={<RequireSetup><HomePage /></RequireSetup>} />

                        <Route
                          path="sell"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_sell">
                                <SellPage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />

                        <Route
                          path="quotes"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_sell">
                                <QuotesPage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />

                        <Route
                          path="lookup"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_sell">
                                <LookupPage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />

                        <Route
                          path="inventory"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_inventory">
                                <InventoryPage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />

                        {/* Documents - only in full build (lazy loaded) */}
                        {ENABLE_DOCUMENTS && (
                          <Route
                            path="documents"
                            element={
                              <RequirePermission permission="access_inventory">
                                <LazyDocumentsPage />
                              </RequirePermission>
                            }
                          />
                        )}

                        {/* Vendor Bills - only in full build (lazy loaded) */}
                        {ENABLE_VENDOR_BILLS && (
                          <Route
                            path="vendor-bills"
                            element={
                              <RequirePermission permission="access_inventory">
                                <LazyBillHistory />
                              </RequirePermission>
                            }
                          />
                        )}

                        {ENABLE_VENDOR_BILLS && (
                          <Route
                            path="vendor-bills/upload"
                            element={
                              <RequirePermission permission="upload_vendor_bills">
                                <LazyBillUpload />
                              </RequirePermission>
                            }
                          />
                        )}

                        {ENABLE_VENDOR_BILLS && (
                          <Route
                            path="vendor-bills/:id"
                            element={
                              <RequirePermission permission="view_vendor_bills">
                                <LazyBillReview />
                              </RequirePermission>
                            }
                          />
                        )}

                        {ENABLE_VENDOR_BILLS && (
                          <Route
                            path="vendor-bills/templates"
                            element={
                              <RequirePermission permission="access_inventory">
                                <LazyTemplateManagerPage />
                              </RequirePermission>
                            }
                          />
                        )}

                        {ENABLE_VENDOR_BILLS && (
                          <Route
                            path="vendor-bills/templates/:templateId"
                            element={
                              <RequirePermission permission="access_inventory">
                                <LazyVendorTemplateEditorPage />
                              </RequirePermission>
                            }
                          />
                        )}

                        <Route
                          path="customers"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_sell">
                                <CustomersPage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />

                        {/* Appointments - lazy loaded, module flag checked in component */}
                        <Route
                          path="appointments"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_sell">
                                <LazyAppointmentCalendarPage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />

                        {/* Estimates - lazy loaded, module flag checked in component */}
                        <Route
                          path="estimates"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_sell">
                                <LazyEstimateListPage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />
                        <Route
                          path="estimates/new"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_sell">
                                <LazyEstimateCreatePage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />
                        <Route
                          path="estimates/:id"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_sell">
                                <LazyEstimateDetailPage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />

                        {/* Reporting - only in export and full builds (lazy loaded) */}
                        {/* Protected by FeatureGuard to check backend capabilities */}
                        {ENABLE_REPORTING && (
                          <Route
                            path="reporting"
                            element={
                              <RequirePermission permission="access_admin">
                                <FeatureGuard feature="export">
                                  <LazyReportingPage />
                                </FeatureGuard>
                              </RequirePermission>
                            }
                          />
                        )}

                        {/* Sales Management - layaway, work orders, commissions, etc. (lazy loaded) */}
                        <Route
                          path="sales"
                          element={
                            <RequirePermission permission="access_admin">
                              <LazySalesManagementPage />
                            </RequirePermission>
                          }
                        />

                        {/* Transaction History - view past sales (lazy loaded) */}
                        <Route
                          path="transactions"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_sell">
                                <LazyTransactionHistoryPage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />

                        {/* User Preferences - accessible from profile menu */}
                        <Route
                          path="preferences"
                          element={<PreferencesPage />}
                        />

                        {/* Profile redirects to Preferences (same page) */}
                        <Route
                          path="profile"
                          element={<Navigate to="/preferences" replace />}
                        />

                        {/* Time Tracking - lazy loaded */}
                        <Route
                          path="time-tracking"
                          element={
                            <RequireSetup>
                              <RequirePermission permission="access_admin">
                                <LazyTimeTrackingPage />
                              </RequirePermission>
                            </RequireSetup>
                          }
                        />

                        {/* Admin routes with AdminLayout sub-navigation - only in export and full builds (lazy loaded) */}
                        {ENABLE_ADMIN && (
                          <Route
                            path="admin"
                            element={
                              <RequirePermission permission="access_admin">
                                <LazyAdminLayout />
                              </RequirePermission>
                            }
                          >
                            {/* Default admin route - shows overview */}
                            <Route index element={<LazyAdminPage />} />
                            
                            {/* Admin sub-routes - wired to actual settings page components (all lazy loaded) */}
                            <Route path="setup" element={<LazySetupWizardPage />} />
                            <Route path="users" element={<LazyAdminPage />} />
                            <Route path="store" element={<LazyCompanyStoresPage />} />
                            <Route path="locations" element={<LazyCompanyStoresPage />} />
                            <Route path="taxes" element={<LazyTaxRulesPage />} />
                            <Route path="pricing" element={<LazyProductConfigPage />} />
                            <Route path="receipts" element={<LazyReceiptsPage />} />
                            <Route path="branding" element={<LazyLocalizationPage />} />
                            <Route path="integrations" element={<LazyIntegrationsPage />} />
                            <Route path="data" element={<LazyDataManagementPage />} />
                            <Route path="data/parts-mapping" element={<LazyPartsMappingPage />} />
                            <Route path="data/import" element={<LazyProductImportPage />} />
                            <Route path="data/categories" element={<LazyCategoryLookupPage />} />
                            {/* Exports - protected by FeatureGuard to check backend capabilities */}
                            {ENABLE_EXPORTS && (
                              <Route 
                                path="exports" 
                                element={
                                  <FeatureGuard feature="export">
                                    <LazyExportsPage />
                                  </FeatureGuard>
                                } 
                              />
                            )}
                            <Route path="capabilities" element={<LazyCapabilitiesDashboardPage />} />
                            <Route path="health" element={<LazySyncDashboardPage />} />
                            <Route path="health/sync-history" element={<LazySyncHistoryPage />} />
                            <Route path="health/failed-records" element={<LazyFailedRecordsPage />} />
                            <Route path="backups" element={<LazyBackupsPage />} />
                            <Route path="notifications" element={<LazyNotificationSettingsPage />} />
                            <Route path="advanced" element={<LazyFeatureFlagsPage />} />
                            {/* Hardware and Network settings under advanced */}
                            <Route path="hardware" element={<LazyHardwarePage />} />
                            <Route path="network" element={<LazyNetworkPage />} />
                            <Route path="network/lan" element={<LazyNetworkSettingsPage />} />
                            <Route path="performance" element={<LazyPerformancePage />} />
                          </Route>
                        )}

                        {/* Redirects from old /settings/* paths to new /admin/* paths */}
                        {ENABLE_ADMIN && (
                          <>
                            <Route path="settings" element={<Navigate to="/admin" replace />} />
                            <Route path="settings/preferences" element={<Navigate to="/preferences" replace />} />
                            <Route path="settings/integrations" element={<Navigate to="/admin/integrations" replace />} />
                            <Route path="settings/data" element={<Navigate to="/admin/data" replace />} />
                            <Route path="settings/hardware" element={<Navigate to="/admin/hardware" replace />} />
                            <Route path="settings/network" element={<Navigate to="/admin/network" replace />} />
                            <Route path="settings/performance" element={<Navigate to="/admin/performance" replace />} />
                            <Route path="settings/features" element={<Navigate to="/admin/advanced" replace />} />
                            <Route path="settings/localization" element={<Navigate to="/admin/branding" replace />} />
                            <Route path="settings/products" element={<Navigate to="/admin/pricing" replace />} />
                            <Route path="settings/tax" element={<Navigate to="/admin/taxes" replace />} />
                            <Route path="settings/stores" element={<Navigate to="/admin/store" replace />} />
                            <Route path="settings/sync" element={<Navigate to="/admin/health" replace />} />
                            <Route path="settings/*" element={<Navigate to="/admin" replace />} />
                          </>
                        )}

                        {/* Review routes - only in full build (lazy loaded) */}
                        {ENABLE_REVIEW && (
                          <Route
                            path="review"
                            element={
                              <RequirePermission permission="review_vendor_bills">
                                <LazyReviewPage />
                              </RequirePermission>
                            }
                          />
                        )}

                        {ENABLE_REVIEW && (
                          <Route
                            path="review/:caseId"
                            element={
                              <RequirePermission permission="review_vendor_bills">
                                <LazyReviewCaseDetailPage />
                              </RequirePermission>
                            }
                          />
                        )}

                        {ENABLE_ADMIN && (
                          <Route
                            path="forms"
                            element={
                              <RequirePermission permission="access_admin">
                                <LazyFormTemplatesPage />
                              </RequirePermission>
                            }
                          />
                        )}

                        {/* /exports redirects to /admin/exports for consistency */}
                        {ENABLE_EXPORTS && (
                          <Route path="exports" element={<Navigate to="/admin/exports" replace />} />
                        )}

                        {/* Catch all - redirect to home */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Route>
                    </Routes>
                  </PermissionsProvider>
                </AuthProvider>
              </BrowserRouter>
            </ToastProvider>
          </ThemeProvider>
        </ConfigProvider>
      </CapabilitiesProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
}

export default App;
