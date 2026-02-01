/**
 * Customer API Client
 * 
 * Provides functions for interacting with customer endpoints
 */

import { apiClient } from '@common/api/client';

export interface CustomerResponse {
  id: string;
  tenant_id?: string;
  name: string;
  email: string | null;
  phone: string | null;
  pricing_tier: string;
  loyalty_points: number;
  store_credit: number;
  credit_limit: number | null;
  credit_balance: number;
  created_at: string;
  updated_at: string;
  sync_version?: number;
  store_id?: string;
  // Sales statistics from backend aggregation
  total_spent?: number;
  order_count?: number;
  last_order?: string | null;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  pricing_tier?: 'retail' | 'wholesale' | 'vip';
  store_id?: string; // Optional - backend derives from session if not provided
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  pricing_tier?: 'retail' | 'wholesale' | 'vip';
  loyalty_points?: number;
  store_credit?: number;
  credit_limit?: number;
}

/**
 * List all customers
 */
export async function listCustomers(params?: {
  pricing_tier?: string;
  store_id?: string;
}): Promise<CustomerResponse[]> {
  const queryParams = new URLSearchParams();
  if (params?.pricing_tier) queryParams.append('pricing_tier', params.pricing_tier);
  if (params?.store_id) queryParams.append('store_id', params.store_id);
  
  const url = `/api/customers${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.get<CustomerResponse[]>(url);
}

/**
 * Get customer by ID
 */
export async function getCustomer(id: string): Promise<CustomerResponse> {
  return apiClient.get<CustomerResponse>(`/api/customers/${id}`);
}

/**
 * Create new customer
 */
export async function createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse> {
  return apiClient.post<CustomerResponse>('/api/customers', data);
}

/**
 * Update customer
 */
export async function updateCustomer(id: string, data: UpdateCustomerRequest): Promise<CustomerResponse> {
  return apiClient.put<CustomerResponse>(`/api/customers/${id}`, data);
}

/**
 * Delete customer
 */
export async function deleteCustomer(id: string): Promise<void> {
  return apiClient.delete(`/api/customers/${id}`);
}

/**
 * Customer order response from backend
 */
export interface CustomerOrderResponse {
  id: string;
  transaction_number: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  items_count: number;
  payment_method: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
}

/**
 * Get customer orders
 */
export async function getCustomerOrders(
  customerId: string, 
  limit?: number
): Promise<CustomerOrderResponse[]> {
  const params = limit ? `?limit=${limit}` : '';
  return apiClient.get<CustomerOrderResponse[]>(`/api/customers/${customerId}/orders${params}`);
}
