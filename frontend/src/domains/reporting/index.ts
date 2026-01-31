/**
 * Reporting Domain - Public API
 * 
 * Re-exports all public types and hooks for the reporting domain
 */

// Types
export type {
  SalesReportResponse,
  CategorySales,
  EmployeeSales,
  PricingTierSales,
  DashboardMetrics,
  SalesReportParams,
} from './api';

// API functions (for direct use if needed)
export {
  getSalesReport,
  getSalesByCategory,
  getSalesByEmployee,
  getSalesByPricingTier,
  getDashboardMetrics,
  exportSalesReport,
} from './api';

// React Query hooks
export {
  useSalesReportQuery,
  useSalesByCategoryQuery,
  useSalesByEmployeeQuery,
  useSalesByPricingTierQuery,
  useDashboardMetricsQuery,
  getDateRange,
  downloadSalesReport,
} from './hooks';
