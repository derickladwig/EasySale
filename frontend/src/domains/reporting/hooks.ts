/**
 * Reporting React Query Hooks
 * 
 * Provides hooks for reporting data fetching
 */

import { useQuery, UseQueryResult } from '@tanstack/react-query';
import * as reportingApi from './api';
import type { 
  SalesReportResponse, 
  CategorySales, 
  EmployeeSales, 
  PricingTierSales,
  DashboardMetrics,
  SalesReportParams 
} from './api';

/**
 * Hook to fetch sales report
 */
export function useSalesReportQuery(
  params?: SalesReportParams
): UseQueryResult<SalesReportResponse, Error> {
  return useQuery({
    queryKey: ['sales-report', params],
    queryFn: () => reportingApi.getSalesReport(params),
  });
}

/**
 * Hook to fetch sales by category
 */
export function useSalesByCategoryQuery(
  params?: SalesReportParams
): UseQueryResult<CategorySales[], Error> {
  return useQuery({
    queryKey: ['sales-by-category', params],
    queryFn: () => reportingApi.getSalesByCategory(params),
  });
}

/**
 * Hook to fetch sales by employee
 */
export function useSalesByEmployeeQuery(
  params?: SalesReportParams
): UseQueryResult<EmployeeSales[], Error> {
  return useQuery({
    queryKey: ['sales-by-employee', params],
    queryFn: () => reportingApi.getSalesByEmployee(params),
  });
}

/**
 * Hook to fetch sales by pricing tier
 */
export function useSalesByPricingTierQuery(
  params?: SalesReportParams
): UseQueryResult<PricingTierSales[], Error> {
  return useQuery({
    queryKey: ['sales-by-pricing-tier', params],
    queryFn: () => reportingApi.getSalesByPricingTier(params),
  });
}

/**
 * Hook to fetch dashboard metrics
 */
export function useDashboardMetricsQuery(): UseQueryResult<DashboardMetrics, Error> {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: reportingApi.getDashboardMetrics,
    refetchInterval: 60000, // Refetch every minute
  });
}

/**
 * Helper function to calculate date range based on preset or custom dates
 */
export function getDateRange(
  range: 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom',
  customStart?: string,
  customEnd?: string
): SalesReportParams {
  // Handle custom date range
  if (range === 'custom' && customStart && customEnd) {
    return {
      start_date: customStart,
      end_date: customEnd,
    };
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  let start_date: Date;
  
  switch (range) {
    case 'today':
      start_date = today;
      break;
    case 'week':
      start_date = new Date(today);
      start_date.setDate(today.getDate() - 7);
      break;
    case 'month':
      start_date = new Date(today);
      start_date.setMonth(today.getMonth() - 1);
      break;
    case 'quarter':
      start_date = new Date(today);
      start_date.setMonth(today.getMonth() - 3);
      break;
    case 'year':
      start_date = new Date(today);
      start_date.setFullYear(today.getFullYear() - 1);
      break;
    case 'custom':
    default:
      // Default to month if custom without dates
      start_date = new Date(today);
      start_date.setMonth(today.getMonth() - 1);
      break;
  }
  
  return {
    start_date: start_date.toISOString().split('T')[0],
    end_date: today.toISOString().split('T')[0],
  };
}

/**
 * Helper function to download CSV export
 */
export async function downloadSalesReport(params?: SalesReportParams): Promise<void> {
  try {
    const blob = await reportingApi.exportSalesReport(params);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch {
    throw new Error('Failed to download report');
  }
}
