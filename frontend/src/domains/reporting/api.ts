/**
 * Reporting API Client
 * 
 * Provides functions for interacting with reporting endpoints
 */

import { apiClient } from '../../common/utils/apiClient';

export interface SalesReportParams {
  start_date?: string;
  end_date?: string;
  category?: string;
  employee_id?: string;
  pricing_tier?: string;
}

export interface SalesSummary {
  total_sales: number;
  total_transactions: number;
  average_transaction: number;
  total_items_sold: number;
}

export interface SalesReportResponse {
  summary: SalesSummary;
  status: string;
}

export interface CategorySales {
  category: string;
  transaction_count: number;
  items_sold: number;
  total_revenue: number;
}

export interface EmployeeSales {
  employee_id: string;
  transaction_count: number;
  total_sales: number;
  average_transaction: number;
}

export interface PricingTierSales {
  pricing_tier: string;
  transaction_count: number;
  total_sales: number;
  average_transaction: number;
}

export interface DashboardMetrics {
  date: string;
  todays_sales: number;
  active_layaways: number;
}

/**
 * Get sales report with summary
 */
export async function getSalesReport(params?: SalesReportParams): Promise<SalesReportResponse> {
  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
  if (params?.pricing_tier) queryParams.append('pricing_tier', params.pricing_tier);
  
  const url = `/api/reports/sales${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<SalesReportResponse>(url);
}

/**
 * Get sales by category
 */
export async function getSalesByCategory(params?: SalesReportParams): Promise<CategorySales[]> {
  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);
  
  const url = `/api/reports/sales/by-category${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<CategorySales[]>(url);
}

/**
 * Get sales by employee
 */
export async function getSalesByEmployee(params?: SalesReportParams): Promise<EmployeeSales[]> {
  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);
  
  const url = `/api/reports/sales/by-employee${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get<{ employees: EmployeeSales[]; status: string }>(url);
  return response.employees;
}

/**
 * Get sales by pricing tier
 */
export async function getSalesByPricingTier(params?: SalesReportParams): Promise<PricingTierSales[]> {
  const queryParams = new URLSearchParams();
  if (params?.start_date) queryParams.append('start_date', params.start_date);
  if (params?.end_date) queryParams.append('end_date', params.end_date);
  
  const url = `/api/reports/sales/by-pricing-tier${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await apiClient.get<{ pricing_tiers: PricingTierSales[]; status: string }>(url);
  return response.pricing_tiers;
}

/**
 * Get dashboard metrics
 */
export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  return apiClient.get<DashboardMetrics>('/api/reports/dashboard');
}

/**
 * Export sales report to CSV
 */
export async function exportSalesReport(params?: SalesReportParams): Promise<Blob> {
  // Use relative URL in production (nginx proxy), or dynamic hostname in development
  const baseUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL 
    : import.meta.env.PROD 
      ? '' 
      : `http://${window.location.hostname}:8923`;
  const response = await fetch(`${baseUrl}/api/reports/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params || {}),
  });

  if (!response.ok) {
    throw new Error('Failed to export report');
  }

  return response.blob();
}
